import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeForCurrentMode } from '@/lib/stripe/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { stripe, mode } = await getStripeForCurrentMode();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const eventId = String(body.event_id || '');
  if (!eventId) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });

  const { data: event } = await supabase
    .from('events')
    .select('id,name,owner_id,payment_status,is_paid')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (event.is_paid || event.payment_status === 'paid') {
    return NextResponse.json({ error: 'Event is already paid.' }, { status: 400 });
  }

  const { data: order, error: orderError } = await admin
    .from('event_orders')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();
  if (orderError || !order) {
    return NextResponse.json({ error: 'Event order not found. Revisit the Enhance step.' }, { status: 400 });
  }

  const amount = Number(order.total || 0);
  const nowIso = new Date().toISOString();
  if (amount <= 0) {
    await admin.from('event_orders').update({ status: 'paid', paid_at: nowIso, updated_at: nowIso }).eq('id', order.id);
    await admin.from('events').update({ payment_status: 'paid', is_paid: true, paid_at: nowIso, status: 'paid_awaiting_approval', updated_at: nowIso }).eq('id', eventId);
    return NextResponse.json({ paid: true, url: `/dashboard/events/${eventId}/review?paid=1` });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SITE_URL' }, { status: 500 });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${siteUrl}/dashboard/events/${eventId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard/events/${eventId}/payment?canceled=1`,
    client_reference_id: eventId,
    customer_email: user.email || undefined,
    invoice_creation: { enabled: true },
    payment_intent_data: {
      description: `HypeKnight order ${order.order_number} — ${event.name}`,
      receipt_email: user.email || undefined,
      metadata: {
        kind: 'event_payment',
        event_id: eventId,
        order_id: order.id,
        order_number: order.order_number,
      },
    },
    metadata: {
      kind: 'event_payment',
      event_id: eventId,
      owner_id: user.id,
      order_id: order.id,
      order_number: order.order_number,
      stripe_mode: mode,
      coupon_code: order.coupon_code || '',
      discount_amount: String(order.discount_amount || 0),
    },
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `HypeKnight Event Order ${order.order_number}`,
          description: event.name,
          metadata: { event_id: eventId, order_id: order.id },
        },
        unit_amount: Math.round(amount * 100),
      },
      quantity: 1,
    }],
    allow_promotion_codes: false,
  });

  await admin.from('event_orders').update({
    status: 'pending',
    stripe_checkout_session_id: session.id,
    updated_at: nowIso,
  }).eq('id', order.id);

  await admin.from('events').update({
    payment_status: 'pending',
    stripe_checkout_session_id: session.id,
    payment_amount: amount,
    updated_at: nowIso,
  }).eq('id', eventId);

  return NextResponse.json({ url: session.url });
}
