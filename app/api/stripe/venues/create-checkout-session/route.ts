import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeForCurrentMode } from '@/lib/stripe/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { stripe, mode } = await getStripeForCurrentMode();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const venueId = String(body.venue_id || '');

  if (!venueId) {
    return NextResponse.json({ error: 'Missing venue_id' }, { status: 400 });
  }

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, name, owner_id')
    .eq('id', venueId)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  const { data: subscription, error: subError } = await supabase
    .from('venue_subscriptions')
    .select('*')
    .eq('venue_id', venueId)
    .maybeSingle();

  if (subError || !subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SITE_URL' }, { status: 500 });
  }

  const amount =
    subscription.billing_mode === 'prepaid'
      ? Number(subscription.prepaid_total || 0)
      : Number(subscription.current_period_price || 0);

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: subscription.billing_mode === 'monthly' ? 'subscription' : 'payment',
    success_url: `${siteUrl}/dashboard/venues/${venueId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard/venues/${venueId}/payment?canceled=1`,
    client_reference_id: venueId,
    metadata: {
      venue_id: venueId,
      venue_subscription_id: subscription.id,
      stripe_mode: mode,
      kind: 'venue_subscription',
      billing_mode: subscription.billing_mode,
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${venue.name} venue subscription`,
            description:
              subscription.billing_mode === 'monthly'
                ? 'Monthly venue package'
                : 'Prepaid venue package',
          },
          unit_amount: Math.round(amount * 100),
          recurring:
            subscription.billing_mode === 'monthly'
              ? { interval: 'month' }
              : undefined,
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
  });

  const { error: updateError } = await supabase
    .from('venue_subscriptions')
    .update({
      stripe_checkout_session_id: session.id,
    })
    .eq('id', subscription.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}