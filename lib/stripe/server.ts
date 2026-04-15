import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

export async function getStripeMode() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('payment_settings')
    .select('stripe_mode')
    .limit(1)
    .maybeSingle();

  return data?.stripe_mode === 'live' ? 'live' : 'test';
}

export async function getStripeForCurrentMode() {
  const mode = await getStripeMode();

  const secretKey =
    mode === 'live'
      ? process.env.STRIPE_LIVE_SECRET_KEY
      : process.env.STRIPE_TEST_SECRET_KEY;

  if (!secretKey) {
    throw new Error(`Missing Stripe ${mode} secret key`);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-03-31.basil',
  });

  return { stripe, mode };
}