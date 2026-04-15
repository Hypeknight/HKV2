import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenuePaymentPage({ params }: Props) {
  const { id } = await params;

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

  const { data: subscription } = await supabase
    .from('venue_subscriptions')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Venue Payment</p>
        <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
        <p className="mt-3 text-white/70">
          This is the handoff point for Stripe checkout.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
          <p className="text-white">
            Current amount due:{' '}
            <span className="font-semibold">
              ${Number(subscription?.current_period_price || 0).toFixed(2)}
            </span>
          </p>
          <p className="mt-3 text-sm text-white/65">
            Stripe portal will be connected here next.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/venues/${venue.id}/review`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            Back to Review
          </Link>
        </div>
      </div>
    </section>
  );
}