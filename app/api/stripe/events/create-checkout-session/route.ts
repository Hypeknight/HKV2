import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeForCurrentMode } from '@/lib/stripe/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { stripe, mode } = await getStripeForCurrentMode();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const eventId = String(body.event_id || '');

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });
  }

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      owner_id,
      total_price,
      payment_amount,
      discounted_total,
      discount_amount,
      coupon_code,
      payment_status,
      is_paid
    `)
    .eq('id', eventId)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (event.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (event.is_paid || event.payment_status === 'paid') {
    return NextResponse.json(
      { error: 'Event is already paid.' },
      { status: 400 }
    );
  }

  const amount = Number(
    event.discounted_total ?? event.payment_amount ?? event.total_price ?? 0
  );

  if (!amount || amount <= 0) {
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('events')
      .update({
        payment_status: 'paid',
        is_paid: true,
        paid_at: nowIso,
        status: 'paid_awaiting_approval',
        updated_at: nowIso,
      })
      .eq('id', eventId)
      .eq('owner_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      paid: true,
      url: `/dashboard/events/${eventId}/review?paid=1`,
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return NextResponse.json(
      { error: 'Missing NEXT_PUBLIC_SITE_URL' },
      { status: 500 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${siteUrl}/dashboard/events/${eventId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard/events/${eventId}/payment?canceled=1`,
    client_reference_id: eventId,
    metadata: {
      kind: 'event_payment',
      event_id: eventId,
      owner_id: user.id,
      stripe_mode: mode,
      coupon_code: event.coupon_code || '',
      discount_amount: String(event.discount_amount || 0),
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.name} event promotion`,
            metadata: {
              event_id: eventId,
              coupon_code: event.coupon_code || '',
            },
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: false,
  });

  const { error: updateError } = await supabase
    .from('events')
    .update({
      payment_status: 'pending',
      stripe_checkout_session_id: session.id,
      payment_amount: amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}