import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  createVenuePresenceSession,
  closeVenuePresenceSession,
} from '@/app/dashboard/venues/presence/actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenuePresencePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.app_role === 'admin';

  const venueQuery = supabase.from('venues').select('*').eq('id', id);
  const { data: venue, error: venueError } = isAdmin
    ? await venueQuery.single()
    : await venueQuery.eq('owner_id', user.id).single();

  if (venueError || !venue) notFound();

  const { data: sessions } = await supabase
    .from('venue_presence_sessions')
    .select('*')
    .eq('venue_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: activeCheckins } = await supabase
    .from('venue_presence_checkins')
    .select('*')
    .eq('venue_id', id)
    .eq('status', 'active')
    .order('checked_in_at', { ascending: false })
    .limit(50);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Presence</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Create and manage live venue sessions for future QR / in-venue verification.
          </p>
        </div>

        <Link
          href={`/dashboard/venues/${venue.id}/edit`}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Venue Manager
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Create Session</h2>

          <form action={createVenuePresenceSession} className="mt-6 space-y-4">
            <input type="hidden" name="venue_id" value={venue.id} />

            <div>
              <label htmlFor="duration_hours" className="mb-2 block text-sm font-medium text-white">
                Session duration
              </label>
              <select
                id="duration_hours"
                name="duration_hours"
                defaultValue="4"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              >
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="4">4 hours</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Start Presence Session
            </button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Active Check-ins</h2>

          {activeCheckins?.length ? (
            <div className="mt-6 space-y-3">
              {activeCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-white">User: {checkin.user_id}</p>
                  <p className="mt-1 text-sm text-white/60">
                    Checked in: {new Date(checkin.checked_in_at).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    Expires: {new Date(checkin.expires_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-white/70">No active check-ins right now.</p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Recent Sessions</h2>

        {sessions?.length ? (
          <div className="mt-6 space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      Code: {session.session_code}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      Status: {session.status}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      Starts: {new Date(session.starts_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      Ends: {session.ends_at ? new Date(session.ends_at).toLocaleString() : '—'}
                    </p>
                  </div>

                  {session.status === 'active' && (
                    <form action={closeVenuePresenceSession}>
                      <input type="hidden" name="venue_id" value={venue.id} />
                      <input type="hidden" name="session_id" value={session.id} />
                      <button
                        type="submit"
                        className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-red-300 hover:border-red-500/40"
                      >
                        Close Session
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-white/70">No sessions created yet.</p>
        )}
      </div>
    </section>
  );
}