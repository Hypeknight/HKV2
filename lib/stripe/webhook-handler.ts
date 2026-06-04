import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  const supabase = createAdminClient();

  let venueId: string | null = null;
  let venueSubscriptionId: string | null = null;

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const now = new Date();
      const nowIso = now.toISOString();

      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const graceEnd = new Date(periodEnd);
      graceEnd.setDate(graceEnd.getDate() + 7);

const kind = session.metadata?.kind;

if (kind === 'event_payment') {
  const eventId = session.metadata?.event_id;

  if (!eventId) {
    throw new Error('Missing event_id in Stripe metadata');
  }

  if (
    session.payment_status !== 'paid' &&
    session.payment_status !== 'no_payment_required'
  ) {
    throw new Error(`Event checkout completed but payment_status is ${session.payment_status}`);
  }

  const nowIso = new Date().toISOString();

  const { error: eventError } = await supabase
    .from('events')
    .update({
      payment_status: 'paid',
      is_paid: true,
      paid_at: nowIso,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      status: 'submitted',
      updated_at: nowIso,
    })
    .eq('id', eventId);

  if (eventError) throw new Error(eventError.message);

  await supabase.from('stripe_webhook_events').upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    processed: true,
    error_message: null,
  });

  return;
}

      venueId = session.metadata?.venue_id || null;
      venueSubscriptionId = session.metadata?.venue_subscription_id || null;

      await supabase.from('stripe_webhook_events').upsert({
        stripe_event_id: event.id,
        event_type: event.type,
        livemode: event.livemode,
        processed: false,
        venue_id: venueId,
        venue_subscription_id: venueSubscriptionId,
      });

      if (!venueId || !venueSubscriptionId) {
        throw new Error('Missing venue_id or venue_subscription_id in Stripe metadata');
      }

      if (
        session.payment_status !== 'paid' &&
        session.payment_status !== 'no_payment_required'
      ) {
        throw new Error(`Checkout completed but payment_status is ${session.payment_status}`);
      }

      //const now = new Date().toISOString();

      const { error: subscriptionError } = await supabase
        .from('venue_subscriptions')
        .update({
          subscription_status: 'active',
          payment_due_status: 'paid',
          is_active: true,
          activated_at: nowIso,
          starts_at: nowIso,
          current_period_start: nowIso,
          current_period_end: periodEnd.toISOString(),
          next_payment_due_at: periodEnd.toISOString(),
          renewal_at: periodEnd.toISOString(),
          grace_period_ends_at: graceEnd.toISOString(),
          expires_at: graceEnd.toISOString(),
          last_payment_at: nowIso,
          last_payment_amount: Number((session.amount_total || 0) / 100),
          stripe_customer_id:
            typeof session.customer === 'string' ? session.customer : null,
          stripe_subscription_id:
            typeof session.subscription === 'string' ? session.subscription : null,
          stripe_checkout_session_id: session.id,
        })
        .eq('id', venueSubscriptionId)
        .eq('venue_id', venueId);

      if (subscriptionError) throw new Error(subscriptionError.message);

      const { error: venueError } = await supabase
        .from('venues')
        .update({
          status: 'active',
          is_visible: true,
          updated_at: now,
        })
        .eq('id', venueId);

      if (venueError) throw new Error(venueError.message);

      const { error: billingError } = await supabase
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

      if (billingError) {
        console.error('Billing event insert failed:', billingError.message);
      }

      await supabase
        .from('stripe_webhook_events')
        .update({
          processed: true,
          error_message: null,
        })
        .eq('stripe_event_id', event.id);
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
          .update({ subscription_status: 'past_due' })
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown webhook error';

    await supabase.from('stripe_webhook_events').upsert({
      stripe_event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      processed: false,
      error_message: message,
      venue_id: venueId,
      venue_subscription_id: venueSubscriptionId,
    });

    console.error('Stripe webhook failed:', message);
    throw error;
  }
}