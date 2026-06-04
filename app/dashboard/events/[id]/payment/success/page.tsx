import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { reconcileEventCheckoutSession } from '@/lib/stripe/reconcile-event-checkout';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ session_id?: string }>;
};

export default async function EventPaymentSuccessPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !event) notFound();

  let message = 'Payment returned from Stripe.';

  if (query.session_id) {
    try {
      await reconcileEventCheckoutSession(query.session_id);
      message = 'Payment was verified and this event has been submitted for review.';
    } catch (error) {
      message =
        error instanceof Error
          ? `Payment returned, but verification failed: ${error.message}`
          : 'Payment returned, but verification failed.';
    }
  } else {
    message = 'Payment returned, but no Stripe session ID was found.';
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-green-500/20 bg-green-500/10 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-green-300">
          Payment Result
        </p>

        <h1 className="mt-3 text-4xl font-bold text-white">{event.name}</h1>

        <p className="mt-3 text-white/80">{message}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/events/${event.id}/review`}
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Return to Review
          </Link>

          <Link
            href="/dashboard/events"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            My Events
          </Link>
        </div>
      </div>
    </section>
  );
}