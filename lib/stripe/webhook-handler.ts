import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  const supabase = await createClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const venueId = session.metadata?.venue_id;
    const venueSubscriptionId = session.metadata?.venue_subscription_id;

    if (venueId && venueSubscriptionId) {
      await supabase
        .from('venue_subscriptions')
        .update({
          subscription_status: 'active',
          is_active: true,
          activated_at: new Date().toISOString(),
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
          stripe_subscription_id:
            typeof session.subscription === 'string' ? session.subscription : null,
          stripe_checkout_session_id: session.id,
        })
        .eq('id', venueSubscriptionId)
        .eq('venue_id', venueId);

      await supabase
        .from('venues')
        .update({
          status: 'active',
          is_visible: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venueId);

      await supabase.from('venue_billing_events').insert({
        venue_id: venueId,
        venue_subscription_id: venueSubscriptionId,
        event_type: 'activated',
        amount: Number((session.amount_total || 0) / 100),
        notes: `Stripe checkout completed (${event.livemode ? 'live' : 'test'})`,
        stripe_event_id: event.id,
      });
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubscriptionId =
      typeof invoice.parent?.subscription_details?.subscription === 'string'
        ? invoice.parent.subscription_details.subscription
        : null;

    if (stripeSubscriptionId) {
      await supabase
        .from('venue_subscriptions')
        .update({
          subscription_status: 'active',
          is_active: true,
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubscriptionId =
      typeof invoice.parent?.subscription_details?.subscription === 'string'
        ? invoice.parent.subscription_details.subscription
        : null;

    if (stripeSubscriptionId) {
      await supabase
        .from('venue_subscriptions')
        .update({
          subscription_status: 'past_due',
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;

    await supabase
      .from('venue_subscriptions')
      .update({
        subscription_status: 'canceled',
        is_active: false,
      })
      .eq('stripe_subscription_id', subscription.id);
  }
}