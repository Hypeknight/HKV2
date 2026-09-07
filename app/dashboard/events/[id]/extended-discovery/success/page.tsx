import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStripeForCurrentMode } from '@/lib/stripe/server';
import {
  reconcileExtendedDiscoveryCheckoutSession,
} from '@/lib/stripe/reconcile-extended-discovery-checkout';

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    session_id?: string;
  }>;
};

export default async function ExtendedDiscoverySuccessPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = searchParams
    ? await searchParams
    : {};

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    redirect('/auth/login');
  }

  const sessionId = String(
    query.session_id || ''
  ).trim();

  if (!sessionId) {
    redirect(`/dashboard/events/${id}`);
  }

  const { data: event, error: eventError } =
    await supabase
      .from('events')
      .select(`
        id,
        name,
        owner_id
      `)
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

  if (eventError || !event) {
    redirect('/dashboard/events');
  }

  /*
   * Verify the Stripe session belongs to this authenticated
   * organizer and this exact event before allowing reconciliation.
   */
  const { stripe } =
    await getStripeForCurrentMode();

  const session =
    await stripe.checkout.sessions.retrieve(
      sessionId
    );

  if (
    session.metadata?.kind !==
    'extended_discovery_payment' ||
    session.metadata?.event_id !==
      event.id ||
    session.metadata?.owner_id !==
      user.id
  ) {
    throw new Error(
      'This Extended Discovery checkout does not belong to this event.'
    );
  }

  let result:
    | Awaited<
        ReturnType<
          typeof reconcileExtendedDiscoveryCheckoutSession
        >
      >
    | null = null;

  let reconciliationError:
    | string
    | null = null;

  try {
    result =
      await reconcileExtendedDiscoveryCheckoutSession(
        sessionId
      );
  } catch (error) {
    reconciliationError =
      error instanceof Error
        ? error.message
        : 'Extended Discovery payment could not be verified.';
  }

  if (
    result &&
    result.eventId !== event.id
  ) {
    throw new Error(
      'Extended Discovery payment returned for a different event.'
    );
  }

  if (reconciliationError) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-200/70">
            Payment verification
          </p>

          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            We could not confirm the Discovery upgrade yet.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-yellow-100/70">
            {reconciliationError}
          </p>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            Your existing event and Discovery entitlement have not been reduced.
            Stripe webhook processing may still complete the purchase separately.
          </p>

          <Link
            href={`/dashboard/events/${event.id}`}
            className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-black"
          >
            Return to Mission Control
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-green-500/20 bg-gradient-to-br from-green-500/10 via-black to-black p-6 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-green-300">
          Extended Discovery active
        </p>

        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">
          Your Discovery Window has been extended.
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
          {event.name} now has{' '}
          <strong className="text-white">
            {result?.targetTotalDays || 'additional'}
          </strong>{' '}
          total Discovery days attached to the event.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <ResultCard
            label="Total Discovery"
            value={
              result
                ? `${result.targetTotalDays} days`
                : 'Updated'
            }
          />

          <ResultCard
            label="Extended Discovery"
            value={
              result
                ? `${result.targetExtraDays} extra days`
                : 'Active'
            }
          />
        </div>

        {result?.entitlementApplied === false ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="font-semibold text-white">
              Payment verified
            </p>

            <p className="mt-1 text-sm leading-6 text-white/50">
              This entitlement was already applied, or a newer Discovery
              upgrade has already moved the event beyond this package.
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/events/${event.id}`}
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-black text-black"
          >
            Return to Mission Control
          </Link>

          {result?.orderId ? (
            <Link
              href={`/dashboard/receipts/${result.orderId}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
            >
              View Receipt
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}
