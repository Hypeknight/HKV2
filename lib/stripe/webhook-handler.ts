import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  const supabase = createAdminClient();

  console.log('Stripe webhook received:', event.type, event.id);

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    const venueId = session.metadata?.venue_id;
    const venueSubscriptionId = session.metadata?.venue_subscription_id;

    console.log('Stripe checkout session metadata:', {
      venueId,
      venueSubscriptionId,
      paymentStatus: session.payment_status,
      mode: session.mode,
      customer: session.customer,
      subscription: session.subscription,
      paymentIntent: session.payment_intent,
    });

    if (!venueId || !venueSubscriptionId) {
      console.error('Missing venue metadata on Stripe Checkout Session', {
        sessionId: session.id,
        metadata: session.metadata,
      });
      return;
    }

    if (
      session.payment_status !== 'paid' &&
      session.payment_status !== 'no_payment_required'
    ) {
      console.warn('Checkout session completed but payment is not paid yet', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
      return;
    }

    const now = new Date().toISOString();

    const { error: subscriptionError } = await supabase
      .from('venue_subscriptions')
      .update({
        subscription_status: 'active',
        is_active: true,
        activated_at: now,
        stripe_customer_id:
          typeof session.customer === 'string' ? session.customer : null,
        stripe_subscription_id:
          typeof session.subscription === 'string' ? session.subscription : null,
        stripe_checkout_session_id: session.id,
      })
      .eq('id', venueSubscriptionId)
      .eq('venue_id', venueId);

    if (subscriptionError) {
      console.error('Failed to activate venue subscription:', subscriptionError);
      throw new Error(subscriptionError.message);
    }

    const { error: venueError } = await supabase
      .from('venues')
      .update({
        status: 'active',
        is_visible: true,
        updated_at: now,
      })
      .eq('id', venueId);

    if (venueError) {
      console.error('Failed to activate venue:', venueError);
      throw new Error(venueError.message);
    }

    const { error: billingEventError } = await supabase
      .from('venue_billing_events')
      .insert({
        venue_id: venueId,
        venue_subscription_id: venueSubscriptionId,
        event_type: 'stripe_checkout_completed',
        amount: Number((session.amount_total || 0) / 100),
        notes: `Stripe checkout completed (${event.livemode ? 'live' : 'test'})`,
        stripe_event_id: event.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
      });

    if (billingEventError) {
      console.error('Failed to insert venue billing event:', billingEventError);
    }

    console.log('Venue payment activation complete:', {
      venueId,
      venueSubscriptionId,
    });
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;

    const stripeSubscriptionId =
      typeof invoice.parent?.subscription_details?.subscription === 'string'
        ? invoice.parent.subscription_details.subscription
        : null;

    if (stripeSubscriptionId) {
      const { error } = await supabase
        .from('venue_subscriptions')
        .update({
          subscription_status: 'active',
          is_active: true,
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);

      if (error) {
        console.error('Failed to mark invoice subscription paid:', error);
        throw new Error(error.message);
      }
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;

    const stripeSubscriptionId =
      typeof invoice.parent?.subscription_details?.subscription === 'string'
        ? invoice.parent.subscription_details.subscription
        : null;

    if (stripeSubscriptionId) {
      const { error } = await supabase
        .from('venue_subscriptions')
        .update({
          subscription_status: 'past_due',
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);

      if (error) {
        console.error('Failed to mark subscription past_due:', error);
        throw new Error(error.message);
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;

    const { error } = await supabase
      .from('venue_subscriptions')
      .update({
        subscription_status: 'canceled',
        is_active: false,
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error(error.message);
    }
  }
}