import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { reconcileVenueCheckoutSession } from '@/lib/stripe/reconcile-venue-checkout';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ session_id?: string }>;
};

export default async function VenuePaymentSuccessPage({
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

  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !venue) notFound();

  let paymentMessage = 'Payment was received.';

  if (query.session_id) {
    try {
      await reconcileVenueCheckoutSession(query.session_id);
      paymentMessage =
        'Payment was verified with Stripe and this venue has been activated.';
    } catch (error) {
      paymentMessage =
        error instanceof Error
          ? `Payment returned from Stripe, but activation failed: ${error.message}`
          : 'Payment returned from Stripe, but activation failed.';
    }
  } else {
    paymentMessage =
      'Payment returned from Stripe, but no session ID was found in the URL.';
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-green-500/20 bg-green-500/10 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-green-300">
          Payment Result
        </p>

        <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>

        <p className="mt-3 text-white/80">{paymentMessage}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/venues/${venue.id}/review`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            Return to Review
          </Link>

          <Link
            href={`/dashboard/venues/${venue.id}/payment`}
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            View Payment Status
          </Link>

          <Link
            href={`/venues/${venue.slug}`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            View Public Page
          </Link>
        </div>
      </div>
    </section>
  );
}