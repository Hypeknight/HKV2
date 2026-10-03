import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  approveVenueConnection,
  declineVenueConnection,
} from './actions';

export default async function VenueConnectionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  /*
   * BM1 venue authority:
   * - venue_managers is the canonical venue-specific relationship.
   * - venues.owner_id remains a temporary compatibility fallback.
   *
   * Build the set of venue IDs this user may manage, then retrieve
   * connection requests for those venues. Action handlers independently
   * re-check authority before changing anything.
   */

  const { data: managerRows, error: managerError } = await supabase
    .from('venue_managers')
    .select('venue_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  // During migration, a database without venue_managers must not break
  // legitimate legacy owners. Unexpected DB errors still fail closed.
  if (managerError && managerError.code !== '42P01') {
    throw managerError;
  }

  const { data: legacyVenues, error: legacyError } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id);

  if (legacyError) throw legacyError;

  const venueIds = Array.from(
    new Set([
      ...(managerRows ?? []).map((row: any) => String(row.venue_id)),
      ...(legacyVenues ?? []).map((row: any) => String(row.id)),
    ])
  );

  let requests: any[] = [];

  if (venueIds.length > 0) {
    const { data, error } = await supabase
      .from('venue_event_connection_requests')
      .select(
        'id,status,created_at,event:events(id,name,venue_name,address,city,state,event_start_at),venue:venues(id,name,address,city,state)'
      )
      .in('venue_id', venueIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    requests = data ?? [];
  }

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/venues"
        className="text-sm text-white/60 hover:text-accent"
      >
        ← My Venues
      </Link>

      <header className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[.3em] text-accent">
          Venue Permissions
        </p>

        <h1 className="mt-3 text-4xl font-black text-white">
          Event connection requests
        </h1>

        <p className="mt-3 text-white/55">
          An address match never gives a promoter control of your venue.
          You decide whether the HypeKnight event may connect to your
          canonical venue entity.
        </p>
      </header>

      <div className="space-y-4">
        {requests.length ? (
          requests.map((request: any) => (
            <article
              key={request.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.2em] text-white/35">
                    {request.status}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-white">
                    {request.event?.name}
                  </h2>

                  <p className="mt-2 text-sm text-white/55">
                    Requested venue: {request.venue?.name}
                    <br />
                    {request.event?.address}, {request.event?.city},{' '}
                    {request.event?.state}
                  </p>
                </div>

                {request.status === 'pending' ? (
                  <div className="flex gap-3">
                    <form action={declineVenueConnection}>
                      <input
                        type="hidden"
                        name="request_id"
                        value={request.id}
                      />
                      <button className="rounded-xl border border-white/10 px-4 py-3 font-bold text-white">
                        Decline
                      </button>
                    </form>

                    <form action={approveVenueConnection}>
                      <input
                        type="hidden"
                        name="request_id"
                        value={request.id}
                      />
                      <button className="rounded-xl bg-accent px-4 py-3 font-black text-black">
                        Approve connection
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/50">
            No venue connection requests.
          </div>
        )}
      </div>
    </section>
  );
}
