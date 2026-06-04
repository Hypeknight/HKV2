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
    .select('id, name, owner_id, total_price, payment_amount, payment_required')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (event.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const amount = Number(event.payment_amount || event.total_price || 0);

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid event payment amount' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SITE_URL' }, { status: 500 });
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
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.name} event promotion`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
  });

  const { error: updateError } = await supabase
    .from('events')
    .update({
      payment_status: 'pending',
      stripe_checkout_session_id: session.id,
      payment_amount: amount,
      payment_due_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}