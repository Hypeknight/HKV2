import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeForCurrentMode } from '@/lib/stripe/server';

export async function reconcileEventCheckoutSession(sessionId: string) {
  const { stripe } = await getStripeForCurrentMode();
  const supabase = createAdminClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const eventId = session.metadata?.event_id;

  if (!eventId) {
    throw new Error('Stripe session is missing event metadata');
  }

  if (
    session.payment_status !== 'paid' &&
    session.payment_status !== 'no_payment_required'
  ) {
    throw new Error(`Stripe payment is not complete: ${session.payment_status}`);
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('events')
    .update({
      payment_status: 'paid',
      is_paid: true,
      paid_at: nowIso,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      status: 'paid_awaiting_approval',
      updated_at: nowIso,
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  return {
    eventId,
    paymentStatus: session.payment_status,
  };
}