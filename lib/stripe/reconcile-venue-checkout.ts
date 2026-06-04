// lib/stripe/reconcile-venue-checkout.ts
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeForCurrentMode } from '@/lib/stripe/server';

export async function reconcileVenueCheckoutSession(sessionId: string) {
  const { stripe } = await getStripeForCurrentMode();
  const supabase = createAdminClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const venueId = session.metadata?.venue_id;
  const venueSubscriptionId = session.metadata?.venue_subscription_id;

  if (!venueId || !venueSubscriptionId) {
    throw new Error('Stripe session is missing venue metadata');
  }

  if (
    session.payment_status !== 'paid' &&
    session.payment_status !== 'no_payment_required'
  ) {
    throw new Error(`Stripe session payment is not complete: ${session.payment_status}`);
  }

  const now = new Date();
const nowIso = now.toISOString();

const periodEnd = new Date(now);
periodEnd.setMonth(periodEnd.getMonth() + 1);

const graceEnd = new Date(periodEnd);
graceEnd.setDate(graceEnd.getDate() + 7);

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

  await supabase.from('venue_billing_events').insert({
    venue_id: venueId,
    venue_subscription_id: venueSubscriptionId,
    event_type: 'stripe_checkout_reconciled',
    amount: Number((session.amount_total || 0) / 100),
    notes: 'Venue checkout reconciled from success page',
    stripe_payment_intent_id:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
  });

  return {
    venueId,
    venueSubscriptionId,
    paymentStatus: session.payment_status,
  };
}