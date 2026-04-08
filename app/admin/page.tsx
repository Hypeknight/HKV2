import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOwnedVenues, getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const profile = await getProfile();
  if (!profile || !['admin', 'venue_owner'].includes(profile.app_role)) redirect('/dashboard');

  const venues = await getOwnedVenues(user.id);
  const { count: eventCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user.id);

  const created = typeof params.created === 'string' ? params.created : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
          <h1 className="mt-2 text-4xl font-bold text-white">Control room</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/venues/new" className="rounded-full border border-white/10 px-5 py-3 hover:border-accent/40">
            New venue
          </Link>
          <Link href="/dashboard/events/new/step-1/" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">
            New event
          </Link>
          <Link href="/admin/events" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">
          Moderate Events</Link>
        </div>
        
      </div>
      {created ? (
        <p className="mb-6 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {created === 'venue' ? 'Venue created.' : 'Event created.'}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold text-white">Your access</h2>
            <p className="mt-3 text-sm text-white/70">Role: {profile.app_role}</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Venues</p>
                <p className="mt-2 text-2xl font-semibold text-white">{venues.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Events</p>
                <p className="mt-2 text-2xl font-semibold text-white">{eventCount ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold text-white">What changed from the old build</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li>Fresh Supabase schema instead of dragging old HostGator tables forward.</li>
              <li>Cleaner public pages for events and venues.</li>
              <li>Role-aware dashboard for admin and venue owners.</li>
              <li>Project structure ready for GitHub and Render deployment.</li>
            </ul>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white">Your venues</h2>
          <div className="mt-5 space-y-3">
            {venues.length ? (
              venues.map((venue) => (
                <div key={venue.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-semibold text-white">{venue.name}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {venue.city}, {venue.state} • {venue.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/60">
                No venues yet. Create one to begin publishing events.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
