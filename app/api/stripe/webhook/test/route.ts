// app/api/stripe/webhook/test/route.ts
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { handleStripeWebhookEvent } from '@/lib/stripe/webhook-handler';

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_TEST_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing Stripe test config' },
      { status: 500 }
    );
  }
const stripe = new Stripe(secretKey);
  

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Invalid test webhook signature:', error);
    return NextResponse.json(
      { error: 'Invalid test webhook signature' },
      { status: 400 }
    );
  }

  await handleStripeWebhookEvent(event);

  return NextResponse.json({ received: true, mode: 'test' });
}