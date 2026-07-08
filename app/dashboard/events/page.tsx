import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  discardDraftEvent,
  requestEventRemoval,
} from '@/app/dashboard/events/actions';
import {
  ButtonLink,
  Chip,
  EmptyState,
  EventTime,
  InfoCard,
  MetricCard,
  Panel,
  SectionHeader,
} from '@/components/ui';

export default async function DashboardEventsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      slug,
      name,
      venue_name,
      city,
      state,
      status,
      current_step,
      is_public,
      is_paid,
      payment_override,
      total_price,
      event_start_at,
      updated_at,
      rejection_reason
    `)
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  const eventRows = events ?? [];

  const drafts = eventRows.filter((event) =>
    ['draft', 'building', 'rejected', 'revision_draft'].includes(event.status)
  );

  const pending = eventRows.filter((event) =>
    [
      'submitted',
      'paid_awaiting_approval',
      'approved_awaiting_payment',
      'revision_submitted',
    ].includes(event.status)
  );

  const active = eventRows.filter((event) =>
    ['scheduled', 'active', 'live'].includes(event.status)
  );

  const completed = eventRows.filter((event) =>
    ['ended', 'completed', 'archived', 'removed'].includes(event.status)
  );

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/dashboard" className="text-sm text-white/60 hover:text-accent">
        ← Back to Dashboard
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Event Dashboard
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Manage your HypeKnight events.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Track drafts, revisions, pending approvals, payments, public
              listings, and active events from one mobile-friendly hub.
            </p>
          </div>

          <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
            Create New Event
          </ButtonLink>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard label="Drafts" value={drafts.length} href="#drafts" />
        <MetricCard label="Pending" value={pending.length} href="#pending" />
        <MetricCard label="Active" value={active.length} href="#active" accent />
        <MetricCard label="Total" value={eventRows.length} />
      </section>

      {!eventRows.length ? (
        <Panel title="No events yet" eyebrow="Start Here">
          <p className="text-white/65">
            You have not created any events yet. Start with a draft and submit it
            into the HypeKnight review pipeline when you are ready.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
              Create Your First Event
            </ButtonLink>

            <ButtonLink href="/events" variant="secondary">
              Explore Events
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <>
          {drafts.length ? (
            <EventSection
              id="drafts"
              eyebrow="Needs Your Attention"
              title="Drafts and revisions"
              text="These events can usually still be edited, continued, or removed."
              events={drafts}
            />
          ) : null}

          {pending.length ? (
            <EventSection
              id="pending"
              eyebrow="Waiting"
              title="Pending review or payment"
              text="These events are moving through approval, payment, or revision review."
              events={pending}
            />
          ) : null}

          {active.length ? (
            <EventSection
              id="active"
              eyebrow="Public"
              title="Scheduled and active events"
              text="These listings are live, scheduled, or publicly visible depending on status and approval."
              events={active}
            />
          ) : null}

          {completed.length ? (
            <EventSection
              id="completed"
              eyebrow="History"
              title="Completed or archived events"
              text="Past, removed, archived, or completed listings."
              events={completed}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function EventSection({
  id,
  eyebrow,
  title,
  text,
  events,
}: {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  events: any[];
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <SectionHeader eyebrow={eyebrow} title={title} text={text} />

      <div className="mt-5 grid gap-4 sm:mt-8">
        {events.length ? (
          events.map((event) => <DashboardEventCard key={event.id} event={event} />)
        ) : (
          <EmptyState text="No events in this section." />
        )}
      </div>
    </section>
  );
}

function DashboardEventCard({ event }: { event: any }) {
  const canEdit = ['draft', 'building', 'rejected', 'revision_draft'].includes(
    event.status
  );

  const canDiscard = ['draft', 'building', 'rejected', 'revision_draft'].includes(
    event.status
  );

  const canRequestRemoval = ['scheduled', 'active', 'live'].includes(event.status);

  const editHref =
    event.current_step === 1
      ? `/dashboard/events/${event.id}/edit/step-2`
      : event.current_step === 2
      ? `/dashboard/events/${event.id}/edit/step-3`
      : `/dashboard/events/${event.id}/review`;

  const publicHref = event.slug ? `/events/${event.slug}` : '/events';

  return (
    <article className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black leading-tight text-white">
              {event.name || 'Untitled Event'}
            </h2>

            <StatusBadge status={event.status} />
          </div>

          <p className="mt-3 text-sm text-white/60">
            {event.venue_name || 'No venue listed'} ·{' '}
            {[event.city, event.state].filter(Boolean).join(', ') ||
              'Location pending'}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Starts"
              icon="🕒"
              value={<EventTime value={event.event_start_at} mode="wall" />}
              accent
            />

            <InfoCard
              label="Public"
              icon="👁️"
              value={event.is_public ? 'Yes' : 'Not yet'}
            />

            <InfoCard
              label="Payment"
              icon="💳"
              value={
                event.is_paid
                  ? 'Paid'
                  : event.payment_override
                  ? 'Override'
                  : 'Unpaid'
              }
            />

            <InfoCard
              label="Total"
              icon="💵"
              value={`$${Number(event.total_price || 0).toFixed(2)}`}
            />
          </div>

          {event.rejection_reason ? (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
              <span className="font-semibold">Needs revision:</span>{' '}
              {event.rejection_reason}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:w-[260px]">
          <Link
            href={publicHref}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center font-semibold text-white hover:border-accent/40"
          >
            View Public Page
          </Link>

          <Link
            href={`/dashboard/events/${event.id}/review`}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center font-semibold text-white hover:border-accent/40"
          >
            Review Details
          </Link>

          {canEdit ? (
            <Link
              href={editHref}
              className="rounded-2xl bg-accent px-4 py-3 text-center font-semibold text-black hover:opacity-90"
            >
              Continue / Edit
            </Link>
          ) : null}

          {canDiscard ? (
            <form action={discardDraftEvent}>
              <input type="hidden" name="event_id" value={event.id} />
              <button
                type="submit"
                className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-semibold text-red-200 hover:border-red-500/40"
              >
                Remove Draft
              </button>
            </form>
          ) : null}

          {canRequestRemoval ? (
            <details className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
              <summary className="cursor-pointer text-sm font-semibold">
                Request removal
              </summary>

              <form action={requestEventRemoval} className="mt-4 space-y-3">
                <input type="hidden" name="event_id" value={event.id} />

                <textarea
                  name="removal_reason"
                  rows={3}
                  placeholder="Reason for removal"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
                />

                <select
                  name="refund_requested"
                  defaultValue="no"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="no">No refund requested</option>
                  <option value="yes">Request refund</option>
                </select>

                <button
                  type="submit"
                  className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 font-semibold text-accent hover:border-accent/40"
                >
                  Submit Request
                </button>
              </form>
            </details>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'border-white/10 bg-white/10 text-white',
    building: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    submitted: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
    paid_awaiting_approval: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
    approved_awaiting_payment:
      'border-orange-500/20 bg-orange-500/10 text-orange-200',
    revision_draft: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    revision_submitted: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
    rejected: 'border-red-500/20 bg-red-500/10 text-red-200',
    scheduled: 'border-purple-500/20 bg-purple-500/10 text-purple-200',
    active: 'border-green-500/20 bg-green-500/10 text-green-200',
    live: 'border-green-500/20 bg-green-500/10 text-green-200',
    ended: 'border-white/10 bg-white/10 text-white/60',
    completed: 'border-white/10 bg-white/10 text-white/60',
    removal_requested: 'border-red-500/20 bg-red-500/10 text-red-200',
    removed: 'border-white/10 bg-white/10 text-white/60',
    archived: 'border-white/10 bg-white/10 text-white/60',
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
        map[status] || 'border-white/10 bg-white/10 text-white'
      }`}
    >
      {status || 'unknown'}
    </span>
  );
}