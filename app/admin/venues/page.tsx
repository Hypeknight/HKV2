import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminVenuesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: venues, error } = await supabase
    .from('venues')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Venue Management</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Review and manage venue records, statuses, visibility, and control surfaces.
        </p>
      </div>

      {!venues?.length ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          No venues found.
        </div>
      ) : (
        <div className="space-y-5">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">{venue.name}</h2>
                    <span className="rounded-full bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white">
                      {venue.status}
                    </span>
                  </div>

                  <p className="mt-2 text-white/65">
                    {venue.city}, {venue.state}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Info label="Visible" value={venue.is_visible ? 'Yes' : 'No'} />
                    <Info label="Featured" value={venue.is_featured ? 'Yes' : 'No'} />
                    <Info label="Owner" value={venue.owner_id} />
                    <Info
                      label="Updated"
                      value={new Date(venue.updated_at).toLocaleString()}
                    />
                  </div>
                </div>

        <div className="mt-4">
          <Link
            href="/admin/venue-plans"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            View Venue Plans
          </Link>
        </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/venues/${venue.slug}`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                  >
                    View Public Page
                  </Link>
                  <Link
                    href={`/dashboard/venues/${venue.id}/edit`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                  >
                    Open Venue Manager
                  </Link>
                  <Link
                    href={`/dashboard/venues/${venue.id}/moderation`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                  >
                    Moderation Queue
                  </Link>
                  <Link
                    href={`/dashboard/venues/${venue.id}/presence`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                  >
                    Presence
                  </Link>
                                    <Link
                    href={`/admin/venues/${venue.id}`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                  >
                    Admin Detail
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

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="mt-2 text-sm text-white">{value || '—'}</p>
    </div>
  );
}