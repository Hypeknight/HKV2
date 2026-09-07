import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeForCurrentMode } from '@/lib/stripe/server';
import {
  getExtendedDiscoveryPackage,
} from '@/lib/commerce/event-order';
import {
  calculatePromotionStart,
} from '@/lib/events/workflow';

type ExtendedDiscoveryOrderItemMetadata = {
  current_total_days?: number;
  target_total_days?: number;
  target_extra_days?: number;
  current_package_price?: number;
  target_package_price?: number;
  upgrade_price?: number;
  target_discovery_start_at?: string;
  quote_generated_at?: string;
};

export async function reconcileExtendedDiscoveryCheckoutSession(
  sessionId: string
) {
  const { stripe } = await getStripeForCurrentMode();
  const admin = createAdminClient();

  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    {
      expand: [
        'payment_intent.latest_charge',
        'invoice',
      ],
    }
  );

  if (
    session.metadata?.kind !==
    'extended_discovery_payment'
  ) {
    throw new Error(
      'Stripe session is not an Extended Discovery payment.'
    );
  }

  if (
    session.payment_status !== 'paid' &&
    session.payment_status !== 'no_payment_required'
  ) {
    throw new Error(
      `Extended Discovery payment is not complete: ${session.payment_status}`
    );
  }

  const eventId = session.metadata?.event_id;
  const orderId = session.metadata?.order_id;

  if (!eventId || !orderId) {
    throw new Error(
      'Stripe session is missing Extended Discovery metadata.'
    );
  }

  const { data: order, error: orderError } =
    await admin
      .from('event_orders')
      .select(`
        id,
        event_id,
        user_id,
        order_kind,
        status,
        total,
        paid_at,
        stripe_checkout_session_id
      `)
      .eq('id', orderId)
      .eq('event_id', eventId)
      .eq(
        'order_kind',
        'extended_discovery'
      )
      .single();

  if (orderError || !order) {
    throw new Error(
      orderError?.message ||
        'Extended Discovery order not found.'
    );
  }

  /*
   * Stripe is the payment authority, but the HypeKnight order is the
   * commercial authority. The amount actually collected must match
   * the immutable order total before an entitlement can be activated.
   */
  const expectedAmountCents = Math.round(
    Number(order.total || 0) * 100
  );

  const paidAmountCents = Number(
    session.amount_total || 0
  );

  if (paidAmountCents !== expectedAmountCents) {
    throw new Error(
      'Extended Discovery payment amount does not match the order total.'
    );
  }

  /*
   * Never reconcile a different Stripe session onto an order that
   * already has another checkout session attached to it.
   */
  if (
    order.stripe_checkout_session_id &&
    order.stripe_checkout_session_id !== session.id
  ) {
    throw new Error(
      'Extended Discovery order is associated with a different checkout session.'
    );
  }

  const { data: item, error: itemError } =
    await admin
      .from('event_order_items')
      .select(`
        id,
        product_code,
        metadata
      `)
      .eq('order_id', order.id)
      .eq(
        'product_code',
        'HYPEKNIGHT_EXTENDED_DISCOVERY'
      )
      .single();

  if (itemError || !item) {
    throw new Error(
      itemError?.message ||
        'Extended Discovery order item not found.'
    );
  }

  const metadata =
    (item.metadata || {}) as ExtendedDiscoveryOrderItemMetadata;

  const targetTotalDays = Number(
    metadata.target_total_days || 0
  );

  const targetExtraDays = Number(
    metadata.target_extra_days || 0
  );

  const targetPackage =
    getExtendedDiscoveryPackage(
      targetTotalDays
    );

  if (
    !targetPackage ||
    targetPackage.included ||
    targetPackage.extraDays !==
      targetExtraDays
  ) {
    throw new Error(
      'Extended Discovery order contains an invalid target entitlement.'
    );
  }

  const { data: event, error: eventError } =
    await admin
      .from('events')
      .select(`
        id,
        owner_id,
        status,
        is_public,
        is_approved,
        event_start_at,
        included_promo_days,
        extra_promo_days
      `)
      .eq('id', eventId)
      .single();

  if (eventError || !event) {
    throw new Error(
      eventError?.message ||
        'Event not found for Extended Discovery payment.'
    );
  }

  if (event.owner_id !== order.user_id) {
    throw new Error(
      'Extended Discovery order owner does not match the event owner.'
    );
  }

  /*
   * Payment processing must never republish, reapprove, or move the
   * event through moderation. We only require that the event remains
   * the same approved public event that was eligible for purchase.
   */
  if (
    event.is_approved !== true ||
    event.is_public !== true
  ) {
    throw new Error(
      'The event is no longer eligible for Extended Discovery activation.'
    );
  }

  if (!event.event_start_at) {
    throw new Error(
      'Event start date is required to activate Extended Discovery.'
    );
  }

  const includedDays = Number(
    event.included_promo_days || 14
  );

  if (includedDays !== 14) {
    throw new Error(
      'Legacy Discovery entitlement requires manual review.'
    );
  }

  const currentExtraDays = Math.max(
    0,
    Number(event.extra_promo_days || 0)
  );

  const currentTotalDays =
    includedDays + currentExtraDays;

  /*
   * Idempotence and monotonic entitlement:
   *
   * - If this exact payment was already applied, do nothing to the event.
   * - If another legitimate purchase has already moved the event beyond
   *   this target, never reduce the newer entitlement.
   */
  const shouldApplyEntitlement =
    currentTotalDays < targetTotalDays;

  const targetDiscoveryStart =
    calculatePromotionStart(
      event.event_start_at,
      targetTotalDays
    ).toISOString();

  const nowIso = new Date().toISOString();

  if (shouldApplyEntitlement) {
    const { error: entitlementError } =
      await admin
        .from('events')
        .update({
          extra_promo_days:
            targetPackage.extraDays,
          extra_promo_price:
            targetPackage.price,
          discovery_start_at:
            targetDiscoveryStart,

          /*
           * promotion_start_at remains a compatibility mirror while
           * older discovery queries are migrated to discovery_start_at.
           */
          promotion_start_at:
            targetDiscoveryStart,

          updated_at: nowIso,
        })
        .eq('id', event.id);

    if (entitlementError) {
      throw new Error(
        entitlementError.message
      );
    }
  }

  const paymentIntent =
    session.payment_intent &&
    typeof session.payment_intent !== 'string'
      ? (session.payment_intent as Stripe.PaymentIntent)
      : null;

  const latestCharge =
    paymentIntent?.latest_charge &&
    typeof paymentIntent.latest_charge !== 'string'
      ? (paymentIntent.latest_charge as Stripe.Charge)
      : null;

  const invoice =
    session.invoice &&
    typeof session.invoice !== 'string'
      ? (session.invoice as Stripe.Invoice)
      : null;

  const { error: paidOrderError } =
    await admin
      .from('event_orders')
      .update({
        status: 'paid',
        stripe_checkout_session_id:
          session.id,
        stripe_payment_intent_id:
          paymentIntent?.id ||
          (typeof session.payment_intent ===
          'string'
            ? session.payment_intent
            : null),
        stripe_charge_id:
          latestCharge?.id || null,
        stripe_receipt_url:
          latestCharge?.receipt_url || null,
        stripe_invoice_id:
          invoice?.id || null,
        stripe_invoice_url:
          invoice?.hosted_invoice_url ||
          null,
        stripe_invoice_pdf:
          invoice?.invoice_pdf || null,
        paid_at:
          order.paid_at || nowIso,
        updated_at: nowIso,
      })
      .eq('id', order.id);

  if (paidOrderError) {
    throw new Error(
      paidOrderError.message
    );
  }

  return {
    eventId: event.id,
    orderId: order.id,
    paymentStatus: session.payment_status,
    targetTotalDays,
    targetExtraDays:
      targetPackage.extraDays,
    discoveryStartAt:
      shouldApplyEntitlement
        ? targetDiscoveryStart
        : null,
    entitlementApplied:
      shouldApplyEntitlement,
    currentTotalDaysBefore:
      currentTotalDays,
  };
}
