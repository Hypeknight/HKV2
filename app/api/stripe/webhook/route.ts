import Stripe from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStripeContext } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { stripe, webhookSecret } = await getStripeContext();
  const supabase = await createClient();

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const venueId = session.metadata?.venue_id;
    const subscriptionId = session.metadata?.venue_subscription_id;

    if (venueId && subscriptionId) {
      await supabase
        .from('venue_subscriptions')
        .update({
          subscription_status: 'active',
          is_active: true,
          activated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .eq('venue_id', venueId);

      await supabase
        .from('venues')
        .update({
          status: 'active',
          is_visible: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venueId);

      await supabase
        .from('venue_billing_events')
        .insert({
          venue_id: venueId,
          venue_subscription_id: subscriptionId,
          event_type: 'activated',
          amount: Number((session.amount_total || 0) / 100),
          notes: 'Stripe checkout completed',
        });
    }
  }

  return NextResponse.json({ received: true });
}