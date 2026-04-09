import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardVenuesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: venues, error } = await supabase
    .from('venues')
    .select(`
      id,
      name,
      slug,
      city,
      state,
      status,
      created_at,
      updated_at
    `)
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">My Venues</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            View and manage the venues connected to your account.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Dashboard
        </Link>
      </div>

      {!venues?.length ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          You do not have any venues yet.
        </div>
      ) : (
        <div className="space-y-5">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{venue.name}</h2>
                  <p className="mt-2 text-white/65">
                    {venue.city}, {venue.state}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    Status: {venue.status || '—'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/venues/${venue.slug}`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                  >
                    View
                  </Link>

                  <Link
                    href={`/admin/venues/${venue.id}/edit`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}