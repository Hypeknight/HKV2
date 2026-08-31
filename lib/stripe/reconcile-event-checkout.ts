import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeForCurrentMode } from '@/lib/stripe/server';

export async function reconcileEventCheckoutSession(sessionId: string) {
  const { stripe } = await getStripeForCurrentMode();
  const supabase = createAdminClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent.latest_charge', 'invoice'],
  });
  const eventId = session.metadata?.event_id;
  const orderId = session.metadata?.order_id;
  if (!eventId) throw new Error('Stripe session is missing event metadata');
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    throw new Error(`Stripe payment is not complete: ${session.payment_status}`);
  }

  const nowIso = new Date().toISOString();
  const paymentIntent = session.payment_intent && typeof session.payment_intent !== 'string'
    ? session.payment_intent as Stripe.PaymentIntent
    : null;
  const latestCharge = paymentIntent?.latest_charge && typeof paymentIntent.latest_charge !== 'string'
    ? paymentIntent.latest_charge as Stripe.Charge
    : null;
  const invoice = session.invoice && typeof session.invoice !== 'string'
    ? session.invoice as Stripe.Invoice
    : null;

  const { error } = await supabase.from('events').update({
    payment_status: 'paid',
    is_paid: true,
    paid_at: nowIso,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntent?.id || (typeof session.payment_intent === 'string' ? session.payment_intent : null),
    status: 'paid_awaiting_approval',
    updated_at: nowIso,
  }).eq('id', eventId);
  if (error) throw new Error(error.message);

  if (orderId) {
    const { error: orderError } = await supabase.from('event_orders').update({
      status: 'paid',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntent?.id || (typeof session.payment_intent === 'string' ? session.payment_intent : null),
      stripe_charge_id: latestCharge?.id || null,
      stripe_receipt_url: latestCharge?.receipt_url || null,
      stripe_invoice_id: invoice?.id || null,
      stripe_invoice_url: invoice?.hosted_invoice_url || null,
      stripe_invoice_pdf: invoice?.invoice_pdf || null,
      paid_at: nowIso,
      updated_at: nowIso,
    }).eq('id', orderId);
    if (orderError) throw new Error(orderError.message);
  }

  return { eventId, orderId: orderId || null, paymentStatus: session.payment_status };
}
