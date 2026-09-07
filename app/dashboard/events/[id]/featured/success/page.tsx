import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStripeForCurrentMode } from '@/lib/stripe/server';
import {
  reconcileFeaturedCheckoutSession,
} from '@/lib/stripe/reconcile-featured-checkout';

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    session_id?: string;
  }>;
};

export default async function FeaturedSuccessPage({
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
   * Verify that this Stripe session belongs to the
   * authenticated organizer and this exact event before
   * allowing reconciliation.
   */
  const { stripe } =
    await getStripeForCurrentMode();

  const session =
    await stripe.checkout.sessions.retrieve(
      sessionId
    );

  if (
    session.metadata?.kind !==
      'featured_payment' ||
    session.metadata?.event_id !==
      event.id ||
    session.metadata?.owner_id !==
      user.id
  ) {
    throw new Error(
      'This Featured checkout does not belong to this event.'
    );
  }

  let result:
    | Awaited<
        ReturnType<
          typeof reconcileFeaturedCheckoutSession
        >
      >
    | null = null;

  let reconciliationError:
    | string
    | null = null;

  try {
    result =
      await reconcileFeaturedCheckoutSession(
        sessionId
      );
  } catch (error) {
    reconciliationError =
      error instanceof Error
        ? error.message
        : 'Featured payment could not be verified.';
  }

  if (
    result &&
    result.eventId !== event.id
  ) {
    throw new Error(
      'Featured payment returned for a different event.'
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
            We could not confirm Featured placement yet.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-yellow-100/70">
            {reconciliationError}
          </p>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            Your event has not lost any existing Discovery
            benefits. Stripe webhook processing may still
            complete the Featured purchase separately.
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
          Featured confirmed
        </p>

        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">
          Your Featured dates are confirmed.
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
          <strong className="text-white">
            {event.name}
          </strong>{' '}
          now has premium Featured placement attached
          to the purchased dates.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <ResultCard
            label="Featured Dates"
            value={
              result
                ? String(result.reservationCount)
                : 'Confirmed'
            }
          />

          <ResultCard
            label="Order Total"
            value={
              result
                ? `$${Number(result.total).toFixed(2)}`
                : 'Paid'
            }
          />
        </div>

        {result?.featuredDates?.length ? (
          <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Purchased Featured Calendar Dates
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {result.featuredDates.map(
                (featureDate) => (
                  <span
                    key={featureDate}
                    className="rounded-full border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent"
                  >
                    {formatFeatureDate(
                      featureDate
                    )}
                  </span>
                )
              )}
            </div>
          </section>
        ) : null}

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
          <p className="font-semibold text-white">
            What Featured means
          </p>

          <p className="mt-2 text-sm leading-6 text-white/50">
            Featured gives your event premium attention
            during the purchased calendar dates while the
            event is inside its active Discovery Window.
            It does not guarantee views, ranking position,
            ticket sales, or attendance.
          </p>
        </div>

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

function formatFeatureDate(
  value: string
) {
  const [year, month, day] = value
    .split('-')
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12
      )
    )
  );
}
