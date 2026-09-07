import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
};

const STRIPE_CHECKOUT_SECONDS = 30 * 60;
const MINIMUM_HOLD_BUFFER_SECONDS = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: {
    order_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const orderId = String(body.order_id || '').trim();

  if (!orderId) {
    return NextResponse.json(
      { error: 'Missing order_id.' },
      { status: 400 }
    );
  }

  const { data: order, error: orderError } = await admin
    .from('event_orders')
    .select(`
      id,
      order_number,
      event_id,
      user_id,
      order_kind,
      status,
      currency,
      subtotal,
      discount_amount,
      total,
      coupon_code,
      stripe_checkout_session_id
    `)
    .eq('id', orderId)
    .eq('user_id', user.id)
    .eq('order_kind', 'featured')
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      {
        error:
          orderError?.message ||
          'Featured order not found.',
      },
      { status: 404 }
    );
  }

  if (order.status === 'paid') {
    return NextResponse.json(
      {
        error:
          'This Featured order has already been paid.',
      },
      { status: 400 }
    );
  }

  /*
   * Resume an existing checkout rather than creating a second
   * Stripe session for the same Featured transaction.
   */
  if (order.status === 'pending') {
    if (!order.stripe_checkout_session_id) {
      return NextResponse.json(
        {
          error:
            'This Featured checkout is pending but has no Stripe session.',
        },
        { status: 409 }
      );
    }

    const { stripe } = await getStripeForCurrentMode();

    const existingSession =
      await stripe.checkout.sessions.retrieve(
        order.stripe_checkout_session_id
      );

    if (
      existingSession.status === 'open' &&
      existingSession.url
    ) {
      return NextResponse.json({
        order_id: order.id,
        checkout_url: existingSession.url,
        resumed: true,
      });
    }

    if (existingSession.status === 'complete') {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        new URL(req.url).origin;

      return NextResponse.json({
        order_id: order.id,
        checkout_url:
          `${siteUrl}/dashboard/events/${order.event_id}` +
          `/featured/success` +
          `?session_id=${existingSession.id}`,
        resumed: true,
      });
    }

    if (existingSession.status === 'expired') {
      const nowIso = new Date().toISOString();

      await admin
        .from('event_orders')
        .update({
          status: 'void',
          updated_at: nowIso,
        })
        .eq('id', order.id)
        .eq('status', 'pending');

      await admin
        .from('featured_reservations')
        .update({
          status: 'expired',
          updated_at: nowIso,
        })
        .eq('order_id', order.id)
        .eq('status', 'reserved');

      return NextResponse.json(
        {
          error:
            'Your previous Featured checkout expired. Return to Mission Control and choose the dates again.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          'The existing Featured checkout could not be resumed.',
      },
      { status: 409 }
    );
  }

  if (order.status !== 'draft') {
    return NextResponse.json(
      {
        error:
          'This Featured order cannot be checked out in its current state.',
      },
      { status: 400 }
    );
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      owner_id,
      name,
      status,
      is_public,
      is_approved,
      removed_at,
      hidden_by_admin,
      market_id
    `)
    .eq('id', order.event_id)
    .eq('owner_id', user.id)
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      {
        error:
          eventError?.message ||
          'Event not found.',
      },
      { status: 404 }
    );
  }

  if (
    event.is_public !== true ||
    event.is_approved !== true ||
    event.removed_at ||
    event.hidden_by_admin === true ||
    !['scheduled', 'active', 'live'].includes(
      event.status
    )
  ) {
    return NextResponse.json(
      {
        error:
          'This event is no longer eligible for Featured placement.',
      },
      { status: 409 }
    );
  }

  if (!event.market_id) {
    return NextResponse.json(
      {
        error:
          'This event does not have a HypeKnight market.',
      },
      { status: 409 }
    );
  }

  const { data: itemRows, error: itemError } = await admin
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
    return NextResponse.json(
      { error: itemError.message },
      { status: 500 }
    );
  }

  const items =
    (itemRows || []) as FeaturedOrderItem[];

  if (!items.length) {
    return NextResponse.json(
      {
        error:
          'Featured order contains no Featured dates.',
      },
      { status: 400 }
    );
  }

  const reservationIds = items.map((item) =>
    String(item.metadata?.reservation_id || '')
  );

  if (
    reservationIds.some((id) => !id) ||
    new Set(reservationIds).size !==
      reservationIds.length
  ) {
    return NextResponse.json(
      {
        error:
          'Featured order contains invalid reservation references.',
      },
      { status: 400 }
    );
  }

  const { data: reservationRows, error: reservationError } =
    await admin
      .from('featured_reservations')
      .select(`
        id,
        inventory_id,
        event_id,
        user_id,
        order_id,
        status,
        price_snapshot,
        expires_at
      `)
      .in('id', reservationIds);

  if (reservationError) {
    return NextResponse.json(
      { error: reservationError.message },
      { status: 500 }
    );
  }

  const reservations =
    (reservationRows || []) as FeaturedReservation[];

  if (
    reservations.length !== items.length
  ) {
    return NextResponse.json(
      {
        error:
          'One or more Featured reservations could not be found.',
      },
      { status: 409 }
    );
  }

  const reservationById = new Map(
    reservations.map((reservation) => [
      reservation.id,
      reservation,
    ])
  );

  const nowMs = Date.now();
  let earliestExpirationMs =
    Number.POSITIVE_INFINITY;

  let itemTotal = 0;

  for (const item of items) {
    const metadata =
      (item.metadata || {}) as FeaturedItemMetadata;

    const reservationId = String(
      metadata.reservation_id || ''
    );

    const reservation =
      reservationById.get(reservationId);

    if (!reservation) {
      return NextResponse.json(
        {
          error:
            'A Featured reservation is missing.',
        },
        { status: 409 }
      );
    }

    if (
      reservation.event_id !== event.id ||
      reservation.user_id !== user.id ||
      reservation.order_id !== order.id
    ) {
      return NextResponse.json(
        {
          error:
            'A Featured reservation does not belong to this order.',
        },
        { status: 409 }
      );
    }

    if (reservation.status !== 'reserved') {
      return NextResponse.json(
        {
          error:
            'One or more Featured dates are no longer reserved.',
        },
        { status: 409 }
      );
    }

    if (!reservation.expires_at) {
      return NextResponse.json(
        {
          error:
            'A Featured reservation is missing its expiration time.',
        },
        { status: 409 }
      );
    }

    const expiresAtMs =
      new Date(reservation.expires_at).getTime();

    if (
      !Number.isFinite(expiresAtMs) ||
      expiresAtMs <= nowMs
    ) {
      return NextResponse.json(
        {
          error:
            'Your Featured reservation has expired. Return to Mission Control and choose the dates again.',
        },
        { status: 409 }
      );
    }

    earliestExpirationMs = Math.min(
      earliestExpirationMs,
      expiresAtMs
    );

    if (
      String(metadata.inventory_id || '') !==
      reservation.inventory_id
    ) {
      return NextResponse.json(
        {
          error:
            'Featured inventory does not match its reservation.',
        },
        { status: 409 }
      );
    }

    const reservationPrice = Number(
      reservation.price_snapshot || 0
    );

    const metadataPrice = Number(
      metadata.price_snapshot || 0
    );

    const unitPrice = Number(
      item.unit_price || 0
    );

    const lineTotal = Number(
      item.line_total || 0
    );

    if (
      reservationPrice <= 0 ||
      Math.abs(
        reservationPrice - metadataPrice
      ) > 0.001 ||
      Math.abs(
        reservationPrice - unitPrice
      ) > 0.001 ||
      Math.abs(
        reservationPrice - lineTotal
      ) > 0.001
    ) {
      return NextResponse.json(
        {
          error:
            'Featured pricing no longer matches the reserved inventory.',
        },
        { status: 409 }
      );
    }

    itemTotal += lineTotal;
  }

  const orderSubtotal = Number(
    order.subtotal || 0
  );

  const orderTotal = Number(
    order.total || 0
  );

  if (
    orderTotal <= 0 ||
    Math.abs(itemTotal - orderSubtotal) >
      0.001 ||
    Math.abs(
      orderSubtotal -
        Number(order.discount_amount || 0) -
        orderTotal
    ) > 0.001
  ) {
    return NextResponse.json(
      {
        error:
          'Featured order totals do not match the reserved dates.',
      },
      { status: 409 }
    );
  }

  /*
   * Stripe Checkout requires its own expiration to be at least
   * 30 minutes after session creation. Our database reservation
   * intentionally lasts longer so Stripe expires first.
   */
  const stripeExpiresAt =
    Math.floor(nowMs / 1000) +
    STRIPE_CHECKOUT_SECONDS;

  const holdExpiresAt =
    Math.floor(earliestExpirationMs / 1000);

  if (
    holdExpiresAt <
    stripeExpiresAt +
      MINIMUM_HOLD_BUFFER_SECONDS
  ) {
    return NextResponse.json(
      {
        error:
          'The Featured reservation is too close to expiration to safely start checkout. Return to Mission Control and choose the dates again.',
      },
      { status: 409 }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    new URL(req.url).origin;

  const { stripe, mode } =
    await getStripeForCurrentMode();

  const session =
    await stripe.checkout.sessions.create({
      mode: 'payment',

      expires_at: stripeExpiresAt,

      success_url:
        `${siteUrl}/dashboard/events/${event.id}` +
        `/featured/success` +
        `?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${siteUrl}/dashboard/events/${event.id}` +
        `?featured=canceled`,

      client_reference_id:
        order.id,

      customer_email:
        user.email || undefined,

      invoice_creation: {
        enabled: true,
      },

      payment_intent_data: {
        description:
          `HypeKnight Featured placement - ${event.name}`,

        receipt_email:
          user.email || undefined,

        metadata: {
          kind: 'featured_payment',
          event_id: event.id,
          order_id: order.id,
          order_number: order.order_number,
          reservation_count: String(
            reservations.length
          ),
        },
      },

      metadata: {
        kind: 'featured_payment',
        event_id: event.id,
        owner_id: user.id,
        order_id: order.id,
        order_number: order.order_number,
        reservation_count: String(
          reservations.length
        ),
        stripe_mode: mode,
        coupon_code:
          order.coupon_code || '',
        discount_amount: String(
          order.discount_amount || 0
        ),
      },

      line_items: items.map((item) => {
        const metadata =
          (item.metadata || {}) as FeaturedItemMetadata;

        return {
          price_data: {
            currency:
              order.currency || 'usd',

            product_data: {
              name:
                `HypeKnight Featured - ${metadata.feature_date}`,

              description:
                `${event.name} - Featured placement for ${metadata.feature_date}`,

              metadata: {
                event_id: event.id,
                order_id: order.id,
                reservation_id:
                  String(
                    metadata.reservation_id ||
                      ''
                  ),
                inventory_id:
                  String(
                    metadata.inventory_id ||
                      ''
                  ),
                feature_date:
                  String(
                    metadata.feature_date ||
                      ''
                  ),
              },
            },

            unit_amount:
              Math.round(
                Number(
                  item.unit_price || 0
                ) * 100
              ),
          },

          quantity: Number(
            item.quantity || 1
          ),
        };
      }),

      allow_promotion_codes: false,
    });

  if (!session.url) {
    return NextResponse.json(
      {
        error:
          'Stripe did not return a checkout URL.',
      },
      { status: 500 }
    );
  }

  const nowIso =
    new Date().toISOString();

  const {
    data: pendingOrder,
    error: pendingOrderError,
  } = await admin
    .from('event_orders')
    .update({
      status: 'pending',
      stripe_checkout_session_id:
        session.id,
      updated_at: nowIso,
    })
    .eq('id', order.id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();

  if (
    pendingOrderError ||
    !pendingOrder
  ) {
    /*
     * Stripe created a payable session, but HypeKnight failed to
     * transition the local order into its matching pending state.
     * Never leave that orphaned Checkout Session payable.
     */
    try {
      await stripe.checkout.sessions.expire(
        session.id
      );
    } catch (expireError) {
      console.error(
        '[featured-checkout] Unable to expire orphaned Stripe session:',
        {
          orderId: order.id,
          sessionId: session.id,
          error:
            expireError instanceof Error
              ? expireError.message
              : String(expireError),
        }
      );
    }

    return NextResponse.json(
      {
        error:
          pendingOrderError?.message ||
          'Could not reserve the Featured checkout.',
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    order_id: order.id,
    checkout_url: session.url,
    expires_at:
      new Date(
        stripeExpiresAt * 1000
      ).toISOString(),
  });
}
