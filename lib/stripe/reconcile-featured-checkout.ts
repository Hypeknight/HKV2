import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeForCurrentMode } from '@/lib/stripe/server';

type FeaturedItemMetadata = {
  reservation_id?: string;
  inventory_id?: string;
  feature_date?: string;
  price_snapshot?: number;
  reservation_expires_at?: string;
};

type FeaturedOrderItem = {
  id: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  metadata: FeaturedItemMetadata | null;
};

type FeaturedReservation = {
  id: string;
  inventory_id: string;
  event_id: string;
  user_id: string;
  order_id: string | null;
  status: string;
  price_snapshot: number;
  expires_at: string | null;
  sold_at: string | null;
};

export async function reconcileFeaturedCheckoutSession(
  sessionId: string,
  stripeClient?: Stripe
) {
  const stripe =
    stripeClient ||
    (await getStripeForCurrentMode()).stripe;

  const admin = createAdminClient();

  const session =
    await stripe.checkout.sessions.retrieve(
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
    'featured_payment'
  ) {
    throw new Error(
      'Stripe session is not a Featured payment.'
    );
  }

  if (
    session.payment_status !== 'paid' &&
    session.payment_status !==
      'no_payment_required'
  ) {
    throw new Error(
      `Featured payment is not complete: ${session.payment_status}`
    );
  }

  const eventId =
    session.metadata?.event_id;

  const orderId =
    session.metadata?.order_id;

  const ownerId =
    session.metadata?.owner_id;

  if (
    !eventId ||
    !orderId ||
    !ownerId
  ) {
    throw new Error(
      'Stripe session is missing Featured payment metadata.'
    );
  }

  const {
    data: order,
    error: orderError,
  } = await admin
    .from('event_orders')
    .select(`
      id,
      event_id,
      user_id,
      order_kind,
      status,
      subtotal,
      discount_amount,
      total,
      paid_at,
      stripe_checkout_session_id
    `)
    .eq('id', orderId)
    .eq('event_id', eventId)
    .eq('user_id', ownerId)
    .eq('order_kind', 'featured')
    .single();

  if (orderError || !order) {
    throw new Error(
      orderError?.message ||
        'Featured order not found.'
    );
  }

  /*
   * Stripe confirms payment, but the HypeKnight order remains
   * the commercial authority for the amount that should have
   * been collected.
   */
  const expectedAmountCents =
    Math.round(
      Number(order.total || 0) * 100
    );

  const paidAmountCents =
    Number(session.amount_total || 0);

  if (
    expectedAmountCents <= 0 ||
    paidAmountCents !== expectedAmountCents
  ) {
    throw new Error(
      'Featured payment amount does not match the order total.'
    );
  }

  /*
   * Never attach a different Stripe Checkout Session to an
   * order that already has a session recorded.
   */
  if (
    order.stripe_checkout_session_id &&
    order.stripe_checkout_session_id !==
      session.id
  ) {
    throw new Error(
      'Featured order is associated with a different checkout session.'
    );
  }

  const {
    data: itemRows,
    error: itemError,
  } = await admin
    .from('event_order_items')
    .select(`
      id,
      product_code,
      quantity,
      unit_price,
      line_total,
      metadata
    `)
    .eq('order_id', order.id)
    .eq(
      'product_code',
      'HYPEKNIGHT_FEATURED_DATE'
    )
    .order('created_at', {
      ascending: true,
    });

  if (itemError) {
    throw new Error(itemError.message);
  }

  const items =
    (itemRows || []) as FeaturedOrderItem[];

  if (!items.length) {
    throw new Error(
      'Featured order contains no Featured dates.'
    );
  }

  const reservationIds =
    items.map((item) =>
      String(
        item.metadata?.reservation_id || ''
      )
    );

  if (
    reservationIds.some((id) => !id) ||
    new Set(reservationIds).size !==
      reservationIds.length
  ) {
    throw new Error(
      'Featured order contains invalid reservation references.'
    );
  }

  const {
    data: reservationRows,
    error: reservationError,
  } = await admin
    .from('featured_reservations')
    .select(`
      id,
      inventory_id,
      event_id,
      user_id,
      order_id,
      status,
      price_snapshot,
      expires_at,
      sold_at
    `)
    .in('id', reservationIds);

  if (reservationError) {
    throw new Error(
      reservationError.message
    );
  }

  const reservations =
    (reservationRows ||
      []) as FeaturedReservation[];

  if (
    reservations.length !== items.length
  ) {
    throw new Error(
      'One or more Featured reservations could not be found.'
    );
  }

  const reservationById =
    new Map(
      reservations.map(
        (reservation) => [
          reservation.id,
          reservation,
        ]
      )
    );

  let itemTotal = 0;

  for (const item of items) {
    const metadata =
      (item.metadata ||
        {}) as FeaturedItemMetadata;

    const reservationId =
      String(
        metadata.reservation_id || ''
      );

    const reservation =
      reservationById.get(
        reservationId
      );

    if (!reservation) {
      throw new Error(
        'A Featured reservation is missing.'
      );
    }

    if (
      reservation.event_id !== eventId ||
      reservation.user_id !== ownerId ||
      reservation.order_id !== order.id
    ) {
      throw new Error(
        'A Featured reservation does not belong to this order.'
      );
    }

    /*
     * reserved = first fulfillment
     * sold     = webhook/success-page retry
     *
     * Other states are not safe to convert to sold because the
     * inventory may have been released or refunded.
     */
    if (
      reservation.status !== 'reserved' &&
      reservation.status !== 'sold'
    ) {
      throw new Error(
        'One or more Featured reservations are no longer eligible for fulfillment.'
      );
    }

    if (
      String(
        metadata.inventory_id || ''
      ) !==
      reservation.inventory_id
    ) {
      throw new Error(
        'Featured inventory does not match its reservation.'
      );
    }

    const reservationPrice =
      Number(
        reservation.price_snapshot || 0
      );

    const metadataPrice =
      Number(
        metadata.price_snapshot || 0
      );

    const unitPrice =
      Number(item.unit_price || 0);

    const lineTotal =
      Number(item.line_total || 0);

    const quantity =
      Number(item.quantity || 0);

    if (
      quantity !== 1 ||
      reservationPrice <= 0 ||
      Math.abs(
        reservationPrice -
          metadataPrice
      ) > 0.001 ||
      Math.abs(
        reservationPrice -
          unitPrice
      ) > 0.001 ||
      Math.abs(
        reservationPrice -
          lineTotal
      ) > 0.001
    ) {
      throw new Error(
        'Featured reservation pricing does not match the order.'
      );
    }

    itemTotal += lineTotal;
  }

  const subtotal =
    Number(order.subtotal || 0);

  const discountAmount =
    Number(
      order.discount_amount || 0
    );

  const total =
    Number(order.total || 0);

  if (
    Math.abs(
      itemTotal - subtotal
    ) > 0.001 ||
    Math.abs(
      subtotal -
        discountAmount -
        total
    ) > 0.001
  ) {
    throw new Error(
      'Featured order totals do not match its reserved dates.'
    );
  }

  const nowIso =
    new Date().toISOString();

  /*
   * Fulfill all still-reserved dates in one database update.
   *
   * If this succeeds but the order update below temporarily
   * fails, a webhook retry remains safe because sold rows are
   * accepted above.
   */
  const {
    error: soldError,
  } = await admin
    .from('featured_reservations')
    .update({
      status: 'sold',
      sold_at: nowIso,
      expires_at: null,
      updated_at: nowIso,
    })
    .eq('order_id', order.id)
    .eq('event_id', eventId)
    .eq('user_id', ownerId)
    .eq('status', 'reserved');

  if (soldError) {
    throw new Error(
      soldError.message
    );
  }

  const paymentIntent =
    session.payment_intent &&
    typeof session.payment_intent !==
      'string'
      ? (
          session.payment_intent as
            Stripe.PaymentIntent
        )
      : null;

  const latestCharge =
    paymentIntent?.latest_charge &&
    typeof paymentIntent.latest_charge !==
      'string'
      ? (
          paymentIntent.latest_charge as
            Stripe.Charge
        )
      : null;

  const invoice =
    session.invoice &&
    typeof session.invoice !==
      'string'
      ? (
          session.invoice as
            Stripe.Invoice
        )
      : null;

  const {
    error: paidOrderError,
  } = await admin
    .from('event_orders')
    .update({
      status: 'paid',

      stripe_checkout_session_id:
        session.id,

      stripe_payment_intent_id:
        paymentIntent?.id ||
        (
          typeof session.payment_intent ===
          'string'
            ? session.payment_intent
            : null
        ),

      stripe_charge_id:
        latestCharge?.id || null,

      stripe_receipt_url:
        latestCharge?.receipt_url ||
        null,

      stripe_invoice_id:
        invoice?.id || null,

      stripe_invoice_url:
        invoice?.hosted_invoice_url ||
        null,

      stripe_invoice_pdf:
        invoice?.invoice_pdf ||
        null,

      paid_at:
        order.paid_at || nowIso,

      updated_at:
        nowIso,
    })
    .eq('id', order.id);

  if (paidOrderError) {
    throw new Error(
      paidOrderError.message
    );
  }

  return {
    eventId,
    orderId:
      order.id,
    paymentStatus:
      session.payment_status,
    reservationCount:
      reservations.length,
    featuredDates:
      items.map(
        (item) =>
          String(
            item.metadata
              ?.feature_date || ''
          )
      ),
    total:
      Number(order.total || 0),
  };
}
