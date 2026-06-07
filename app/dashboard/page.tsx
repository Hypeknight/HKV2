import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/auth/actions';
import {
  discardDraftEvent,
  requestEventRemoval,
} from '@/app/dashboard/events/actions';
import {
  getMyDraftEvents,
  getMyEvents,
  getMyVenues,
  getOwnedVenues,
  getProfile,
} from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const profile = await getProfile();
  const venues = await getOwnedVenues(user.id);
  const role = profile?.app_role || 'user';
  const drafts = await getMyDraftEvents();
  const events = await getMyEvents();
  const myVenues = await getMyVenues();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Dashboard</p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            {profile?.display_name || user.email}
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            {role === 'admin' && 'Full system access. Manage everything across HypeKnight.'}
            {role === 'venue_owner' && 'Manage your venues and publish events.'}
            {role === 'user' && 'Discover events and manage your submissions.'}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Role</p>
              <p className="mt-3 text-xl font-semibold text-white">{role}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Owned venues</p>
              <p className="mt-3 text-xl font-semibold text-white">{venues.length}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">My events</p>
              <p className="mt-3 text-xl font-semibold text-white">{events.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Quick actions</h2>
          <Link href="/events/recommended" className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40">
            Recommended By Hypeknight
          </Link>
          <div className="mt-6 space-y-3">
            <Link
              href="/dashboard/events/new/step-1"
              className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40"
            >
              Create new event
            </Link>

            {role === 'user' && (
           // <Link
            //  href="/dashboard/venue-owner-request"
            //  className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40"
            //>
            //</div>  Request Venue Owner Access
            //</Link>
            

           // <Link href="/dashboard/dj/request"
           // className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40"
           // >Request DJ Role</Link>
           <p className="block rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">Currently, Hypeknight is not offering Venue and DJ profiles. They will be coming soon.</p>

            )}
            <Link href="/dashboard/events" 
            className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40"
            >View all events</Link>

            {(role === 'admin') && (
              <Link
                href="/admin"
                className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40"
              >
                Open admin control room
              </Link>
            )}

            <form action={signOut}>
              <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-left text-red-300 hover:border-red-500/40">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">My Draft Events</h2>

        {drafts.length === 0 ? (
          <p className="mt-4 text-white/70">No unfinished drafts right now.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {drafts.map((draft) => {
              const resumeHref =
                draft.current_step === 1
                  ? `/dashboard/events/${draft.id}/edit/step-2`
                  : draft.current_step === 2
                  ? `/dashboard/events/${draft.id}/edit/step-3`
                  : `/dashboard/events/${draft.id}/review`;

              return (
                <div
                  key={draft.id}
                  className="rounded-3xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {draft.name || 'Untitled draft'}
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Step {draft.current_step} · Last updated{' '}
                        {new Date(draft.updated_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Link
                        href={resumeHref}
                        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:border-accent/40"
                      >
                        Continue draft
                      </Link>

                      <form action={discardDraftEvent}>
                        <input type="hidden" name="event_id" value={draft.id} />
                        <button
                          type="submit"
                          className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-300 hover:border-red-500/40"
                        >
                          Discard
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">My Events</h2>
          <Link
            href="/dashboard/events/new/step-1"
            className="rounded-2xl bg-accent px-4 py-2 font-semibold text-black hover:opacity-90"
          >
            New event
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="mt-4 text-white/70">You have not created any events yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-3xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-white">{event.name}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {event.venue_name || 'No venue'} · {event.city}, {event.state}
                    </p>
                    <p className="mt-1 text-sm text-white/50">
                      Status: {event.status}
                    </p>
                    <p className="mt-1 text-sm text-white/50">
                      Start:{' '}
                      {event.event_start_at
                        ? new Date(event.event_start_at).toLocaleString()
                        : '—'}
                    </p>

                    {event.rejection_reason && (
                      <p className="mt-2 text-sm text-red-300">
                        Rejection reason: {event.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/events/${event.slug}`}
                      className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:border-accent/40"
                    >
                      View
                    </Link>

                    {['draft', 'building', 'rejected'].includes(event.status) && (
                      <Link
                        href={
                          event.current_step === 1
                            ? `/dashboard/events/${event.id}/edit/step-2`
                            : event.current_step === 2
                            ? `/dashboard/events/${event.id}/edit/step-3`
                            : `/dashboard/events/${event.id}/review`
                        }
                        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:border-accent/40"
                      >
                        Edit
                      </Link>
                    )}

                    {['draft', 'building', 'rejected'].includes(event.status) && (
                      <form action={discardDraftEvent}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <button
                          type="submit"
                          className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-300 hover:border-red-500/40"
                        >
                          Remove
                        </button>
                      </form>
                    )}

                    {['scheduled', 'live'].includes(event.status) && (
                      <details className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white">
                        <summary className="cursor-pointer">Request removal</summary>
                        <form action={requestEventRemoval} className="mt-3 space-y-3">
                          <input type="hidden" name="event_id" value={event.id} />
                          <textarea
                            name="removal_reason"
                            rows={3}
                            placeholder="Reason for removal"
                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
                          />
                          <select
                            name="refund_requested"
                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                            defaultValue="no"
                          >
                            <option value="no">No refund requested</option>
                            <option value="yes">Request refund</option>
                          </select>
                          <button
                            type="submit"
                            className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-4 py-2 text-accent hover:border-accent/40"
                          >
                            Submit removal request
                          </button>
                        </form>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">My Venues</h2>
          <Link
            href="/dashboard/venues/new/step-1/"
            className="rounded-2xl bg-accent px-4 py-2 font-semibold text-black hover:opacity-90"
          >
            New venue
          </Link>
        </div>

        {myVenues.length === 0 ? (
          <p className="mt-4 text-white/70">You do not have any venues yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {myVenues.map((venue) => (
              <div
                key={venue.id}
                className="rounded-3xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{venue.name}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {venue.city}, {venue.state}
                    </p>
                    <p className="mt-1 text-sm text-white/50">
                      Status: {venue.status || '—'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/venues/${venue.slug}`}
                      className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:border-accent/40"
                    >
                      View
                    </Link>

                    <Link
                      href={`/dashboard/venues/${venue.id}/edit`}
                      className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:border-accent/40"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>*/}
    </section>
  );
}