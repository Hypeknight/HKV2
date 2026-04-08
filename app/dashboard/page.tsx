import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/auth/actions';
import { getOwnedVenues, getProfile, getMyDraftEvents, } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { discardDraftEvent } from '@/app/dashboard/events/actions';


export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const profile = await getProfile();
  const venues = await getOwnedVenues(user.id);
  const role = profile?.app_role || 'user';
  const drafts = await getMyDraftEvents();

  return (
  <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      
      {/* LEFT PANEL */}
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Dashboard</p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          {profile?.display_name || user.email}
        </h1>

        <p className="mt-3 max-w-2xl text-white/70">
          {role === 'admin' && 'Full system access. Manage everything across HypeKnight.'}
          {role === 'venue_owner' && 'Manage your venues and publish events.'}
          {role === 'user' && 'Discover events and manage your activity.'}
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
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Account email</p>
            <p className="mt-3 truncate text-sm font-semibold text-white">{user.email}</p>
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
                      : `/dashboard/events/${draft.id}/edit/step-3`;

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
      {/* RIGHT PANEL */}
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Quick actions</h2>

        <div className="mt-6 space-y-3">

          {/* ADMIN */}
          {role === 'admin' && (
            <>
              <Link href="/admin" className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40">
                Open admin control room
              </Link>

              <Link href="/admin/venues/new" className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40">
                Create venue
              </Link>

              <Link
                  href="/dashboard/events/new/step-1"
                  className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40"
                >
                  Create new event
                </Link>
            </>
          )}

          {/* VENUE OWNER */}
          {role === 'venue_owner' && (
            <>
              <Link href="/admin/venues/new" className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40">
                Create venue
              </Link>

              <Link
                href="/dashboard/events/new/step-1"
                className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40"
              >
                Create new event
              </Link>
            </>
          )}

          {/* USER */}
          {role === 'user' && (
            <>
              <Link href="/events" className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40">
                Browse events
              </Link>

              <Link href="/venues" className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-accent/40">
                Explore venues
              </Link>
            </>
          )}

          {/* LOGOUT (for all) */}
          <form action={signOut}>
            <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-left text-red-300 hover:border-red-500/40">
              Sign out
            </button>
          </form>

        </div>
      </div>
    </div>
  </section>
);
}
