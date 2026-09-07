import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeForCurrentMode } from '@/lib/stripe/server';
import {
  getExtendedDiscoveryPackage,
  getExtendedDiscoveryUpgradeOptions,
} from '@/lib/commerce/event-order';

type ExtendedDiscoveryMetadata = {
  current_total_days?: number;
  target_total_days?: number;
  target_extra_days?: number;
  upgrade_price?: number;
};

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

  const orderId = String(
    body.order_id || ''
  ).trim();

  if (!orderId) {
    return NextResponse.json(
      { error: 'Missing order_id.' },
      { status: 400 }
    );
  }

  const { data: order, error: orderError } =
    await admin
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
      .eq(
        'order_kind',
        'extended_discovery'
      )
      .single();

  if (orderError || !order) {
    return NextResponse.json(
      {
        error:
          orderError?.message ||
          'Extended Discovery order not found.',
      },
      { status: 404 }
    );
  }

  if (order.status === 'paid') {
    return NextResponse.json(
      {
        error:
          'This Extended Discovery order has already been paid.',
      },
      { status: 400 }
    );
  }

  if (order.status === 'pending') {
    return NextResponse.json(
      {
        error:
          'Checkout is already in progress for this Extended Discovery order.',
      },
      { status: 409 }
    );
  }

  if (order.status !== 'draft') {
    return NextResponse.json(
      {
        error:
          'This Extended Discovery order cannot be checked out in its current state.',
      },
      { status: 400 }
    );
  }

  const { data: event, error: eventError } =
    await supabase
      .from('events')
      .select(`
        id,
        owner_id,
        name,
        status,
        is_public,
        is_approved,
        event_start_at,
        included_promo_days,
        extra_promo_days
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
    event.is_approved !== true
  ) {
    return NextResponse.json(
      {
        error:
          'Extended Discovery requires an approved public event.',
      },
      { status: 400 }
    );
  }

  if (event.status !== 'scheduled') {
    return NextResponse.json(
      {
        error:
          'Extended Discovery is no longer available at this stage of the event lifecycle.',
      },
      { status: 400 }
    );
  }

  if (!event.event_start_at) {
    return NextResponse.json(
      {
        error:
          'Event start date is required for Extended Discovery.',
      },
      { status: 400 }
    );
  }

  const { data: item, error: itemError } =
    await admin
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
        'HYPEKNIGHT_EXTENDED_DISCOVERY'
      )
      .single();

  if (itemError || !item) {
    return NextResponse.json(
      {
        error:
          itemError?.message ||
          'Extended Discovery order item not found.',
      },
      { status: 400 }
    );
  }

  const metadata =
    (item.metadata || {}) as ExtendedDiscoveryMetadata;

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
    return NextResponse.json(
      {
        error:
          'Extended Discovery order contains an invalid package.',
      },
      { status: 400 }
    );
  }

  const includedDays = Number(
    event.included_promo_days || 14
  );

  const currentExtraDays = Math.max(
    0,
    Number(event.extra_promo_days || 0)
  );

  const options =
    getExtendedDiscoveryUpgradeOptions({
      eventStartAt: event.event_start_at,
      includedDays,
      extraDays: currentExtraDays,
    });

  const currentOption =
    options.find(
      (option) =>
        option.package.totalDays ===
        targetTotalDays
    ) || null;

  if (
    !currentOption ||
    !currentOption.available ||
    currentOption.upgradePrice === null
  ) {
    return NextResponse.json(
      {
        error:
          'This Extended Discovery quote is no longer available. Return to Mission Control and choose an available package.',
      },
      { status: 409 }
    );
  }

  const orderTotal = Number(
    order.total || 0
  );

  const itemTotal = Number(
    item.line_total || 0
  );

  const quotedUpgradePrice = Number(
    metadata.upgrade_price || 0
  );

  if (
    orderTotal <= 0 ||
    Math.abs(
      orderTotal -
        currentOption.upgradePrice
    ) > 0.001 ||
    Math.abs(
      itemTotal -
        currentOption.upgradePrice
    ) > 0.001 ||
    Math.abs(
      quotedUpgradePrice -
        currentOption.upgradePrice
    ) > 0.001
  ) {
    return NextResponse.json(
      {
        error:
          'Extended Discovery pricing has changed. Return to Mission Control and rebuild the order.',
      },
      { status: 409 }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return NextResponse.json(
      {
        error:
          'Missing NEXT_PUBLIC_SITE_URL.',
      },
      { status: 500 }
    );
  }

  const { stripe, mode } =
    await getStripeForCurrentMode();

  const session =
    await stripe.checkout.sessions.create({
      mode: 'payment',

      success_url:
        `${siteUrl}/dashboard/events/${event.id}` +
        `/extended-discovery/success` +
        `?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${siteUrl}/dashboard/events/${event.id}` +
        `?extended_discovery=canceled`,

      client_reference_id:
        order.id,

      customer_email:
        user.email || undefined,

      invoice_creation: {
        enabled: true,
      },

      payment_intent_data: {
        description:
          `HypeKnight Extended Discovery ${targetTotalDays} days — ${event.name}`,

        receipt_email:
          user.email || undefined,

        metadata: {
          kind:
            'extended_discovery_payment',
          event_id:
            event.id,
          order_id:
            order.id,
          order_number:
            order.order_number,
          target_total_days:
            String(targetTotalDays),
          target_extra_days:
            String(targetExtraDays),
        },
      },

      metadata: {
        kind:
          'extended_discovery_payment',
        event_id:
          event.id,
        owner_id:
          user.id,
        order_id:
          order.id,
        order_number:
          order.order_number,
        target_total_days:
          String(targetTotalDays),
        target_extra_days:
          String(targetExtraDays),
        stripe_mode:
          mode,
        coupon_code:
          order.coupon_code || '',
        discount_amount:
          String(
            order.discount_amount || 0
          ),
      },

      line_items: [
        {
          price_data: {
            currency:
              order.currency || 'usd',

            product_data: {
              name:
                `HypeKnight Extended Discovery — ${targetTotalDays} Days`,

              description:
                `${event.name} · Extend Discovery to ${targetTotalDays} total days before the event.`,

              metadata: {
                event_id:
                  event.id,
                order_id:
                  order.id,
              },
            },

            unit_amount:
              Math.round(
                orderTotal * 100
              ),
          },

          quantity: 1,
        },
      ],

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
     * A Stripe session was created, but the order could not be
     * transitioned to pending. Do not return that session URL to
     * the browser because HypeKnight no longer has a safe local
     * transaction state for this checkout.
     */
    return NextResponse.json(
      {
        error:
          pendingOrderError?.message ||
          'Could not reserve the Extended Discovery checkout.',
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    order_id:
      order.id,
    checkout_url:
      session.url,
  });
}
