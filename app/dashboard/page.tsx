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
  const drafts = await getMyDraftEvents();
  const events = await getMyEvents();

  const role = profile?.app_role || 'user';
  const displayName = profile?.display_name || user.email || 'HypeKnight User';

  const activeEvents = events.filter((event) =>
    ['scheduled', 'active', 'paid_awaiting_approval'].includes(event.status)
  );

  const needsAttention = events.filter((event) =>
    ['building', 'draft', 'rejected', 'NPNA', 'approved_awaiting_payment'].includes(
      event.status
    )
  );

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.07),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">
              HypeKnight Dashboard
            </p>

            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              Welcome, {displayName}
            </h1>

            <p className="mt-4 max-w-3xl text-white/70">
              Start by discovering events, setting your preferences, and building
              your HypeKnight profile. When you are ready, you can promote an
              event or grow into a larger role.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/events/recommended"
                className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
              >
                View Recommended Events
              </Link>

              <Link
                href="/dashboard/preferences"
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-white hover:border-accent/40"
              >
                Update Preferences
              </Link>

              <Link
                href="/events"
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-white hover:border-accent/40"
              >
                Explore All Events
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Metric label="Profile Role" value={role} />
            <Metric label="My Events" value={String(events.length)} />
            <Metric label="Drafts" value={String(drafts.length)} />
            <Metric label="Active Pipeline" value={String(activeEvents.length)} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel
          eyebrow="Your Night"
          title="Personalized discovery"
          text="These tools help HypeKnight learn what kind of events fit you."
        >
          <div className="grid gap-3">
            <ActionLink
              href="/events/recommended"
              title="Recommended by HypeKnight"
              text="See events ranked by your preferences, city, music, vibes, and timing."
              primary
            />
            <ActionLink
              href="/dashboard/preferences"
              title="Edit event preferences"
              text="Choose your city, favorite music, event types, and preferred sources."
            />
            <ActionLink
              href="/events"
              title="Browse event discovery"
              text="Search HypeKnight and external events in one event-first feed."
            />
          </div>
        </Panel>

        <Panel
          eyebrow="Promoter Tools"
          title="Promote an event"
          text="Create event listings when you are ready to put something in front of HypeKnight users."
        >
          <div className="grid gap-3">
            <ActionLink
              href="/dashboard/events/new/step-1"
              title="Create a new event"
              text="Start the event promotion flow with flyer, details, location, and promotion options."
              primary
            />
            <ActionLink
              href="/dashboard/events"
              title="Manage all my events"
              text="Review drafts, payment status, approval status, and live listings."
            />

            {role === 'admin' ? (
              <ActionLink
                href="/admin"
                title="Open admin control room"
                text="Manage events, discovery, payments, external sources, and platform operations."
              />
            ) : null}

            {role === 'user' ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/70">
                Venue owner and DJ profiles are coming later. For now, every new
                profile begins as a basic HypeKnight user.
              </div>
            ) : null}
          </div>
        </Panel>
      </section>

      {needsAttention.length ? (
        <section className="rounded-[2.5rem] border border-yellow-500/20 bg-yellow-500/10 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-yellow-200">
            Needs Attention
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Events that need your next step
          </h2>
          <p className="mt-3 text-yellow-100/80">
            These events may need payment, editing, resubmission, or review before
            they can move forward.
          </p>

          <div className="mt-6 space-y-4">
            {needsAttention.slice(0, 5).map((event) => (
              <EventRow key={event.id} event={event} compact />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-accent">
                Drafts
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                Unfinished event drafts
              </h2>
            </div>

            <Link
              href="/dashboard/events/new/step-1"
              className="rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
            >
              New Event
            </Link>
          </div>

          {drafts.length === 0 ? (
            <EmptyState text="No unfinished drafts right now." />
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

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={resumeHref}
                          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:border-accent/40"
                        >
                          Continue
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

        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-accent">
                Event Pipeline
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                My events
              </h2>
            </div>

            <Link
              href="/dashboard/events"
              className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
            >
              View All
            </Link>
          </div>

          {events.length === 0 ? (
            <EmptyState text="You have not created any events yet." />
          ) : (
            <div className="mt-6 space-y-4">
              {events.slice(0, 8).map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">
              Account
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              Profile and session
            </h2>
            <p className="mt-3 text-white/70">
              Your account starts as a basic profile. HypeKnight can expand role
              access later as promoter, venue, DJ, and admin systems mature.
            </p>
          </div>

          <form action={signOut}>
            <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-left text-red-300 hover:border-red-500/40">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-3 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <p className="text-sm uppercase tracking-[0.35em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-white/70">{text}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ActionLink({
  href,
  title,
  text,
  primary = false,
}: {
  href: string;
  title: string;
  text: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-5 transition hover:-translate-y-0.5 ${
        primary
          ? 'border-accent/20 bg-accent/10 hover:border-accent/50'
          : 'border-white/10 bg-black/20 hover:border-accent/40'
      }`}
    >
      <p className={primary ? 'font-bold text-accent' : 'font-bold text-white'}>
        {title}
      </p>
      <p className="mt-2 text-sm text-white/65">{text}</p>
    </Link>
  );
}

function EventRow({ event, compact = false }: { event: any; compact?: boolean }) {
  const editHref =
    event.current_step === 1
      ? `/dashboard/events/${event.id}/edit/step-2`
      : event.current_step === 2
      ? `/dashboard/events/${event.id}/edit/step-3`
      : `/dashboard/events/${event.id}/review`;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-white">{event.name}</p>
            <StatusChip status={event.status} />
          </div>

          <p className="mt-2 text-sm text-white/60">
            {event.venue_name || 'No venue'} · {event.city}, {event.state}
          </p>

          <p className="mt-1 text-sm text-white/50">
            Start:{' '}
            {event.event_start_at
              ? new Date(event.event_start_at).toLocaleString()
              : '—'}
          </p>

          {event.rejection_reason ? (
            <p className="mt-2 text-sm text-red-300">
              Rejection reason: {event.rejection_reason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {event.slug ? (
            <Link
              href={`/events/${event.slug}`}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:border-accent/40"
            >
              View
            </Link>
          ) : null}

          {['draft', 'building', 'rejected', 'NPNA', 'approved_awaiting_payment'].includes(
            event.status
          ) ? (
            <Link
              href={editHref}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:border-accent/40"
            >
              Continue
            </Link>
          ) : null}

          {['draft', 'building', 'rejected'].includes(event.status) && !compact ? (
            <form action={discardDraftEvent}>
              <input type="hidden" name="event_id" value={event.id} />
              <button
                type="submit"
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-300 hover:border-red-500/40"
              >
                Remove
              </button>
            </form>
          ) : null}

          {['scheduled', 'active'].includes(event.status) && !compact ? (
            <details className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white">
              <summary className="cursor-pointer">Removal</summary>
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
                  Submit request
                </button>
              </form>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status?: string | null }) {
  const tone =
    status === 'active'
      ? 'border-green-500/20 bg-green-500/10 text-green-200'
      : status === 'scheduled'
      ? 'border-blue-500/20 bg-blue-500/10 text-blue-200'
      : status === 'paid_awaiting_approval'
      ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
      : status === 'rejected'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : status === 'NPNA' || status === 'approved_awaiting_payment'
      ? 'border-orange-500/20 bg-orange-500/10 text-orange-200'
      : 'border-white/10 bg-white/5 text-white/60';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${tone}`}>
      {status || 'unknown'}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-6 text-white/65">
      {text}
    </div>
  );
}