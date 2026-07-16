/*
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  approveEvent,
  rejectEvent,
  applyPaymentOverride,
} from './new/actions';

export default async function AdminEventsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: allEvents, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      slug,
      city,
      state,
      venue_name,
      owner_id,
      owner_type,
      status,
      is_public,
      is_approved,
      is_paid,
      payment_override,
      payment_required,
      event_start_at,
      event_end_at,
      submitted_at,
      approved_at,
      rejected_at,
      promotion_start_at,
      promotion_end_at,
      total_price,
      linkdn_mode,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const events = allEvents ?? [];
const unpaidUnapprovedEvents = events.filter(
  (event) => event.status === 'NPNA'
);

const readyForApprovalEvents = events.filter(
  (event) => event.status === 'paid_awaiting_approval'
);

const approvedAwaitingPaymentEvents = events.filter(
  (event) => event.status === 'approved_awaiting_payment'
);

const activePipelineEvents = events.filter((event) =>
  ['scheduled', 'active'].includes(event.status)
);

const completedEvents = events.filter(
  (event) => event.status === 'completed'
);

const rejectedEvents = events.filter(
  (event) => event.status === 'rejected'
);

const removedEvents = events.filter(
  (event) => event.status === 'removed'
);
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Event Moderation</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Review submitted events, scan payment state, and quickly identify what needs attention.
        </p>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Paid Awaiting Approval"
          value={String(readyForApprovalEvents.length)}
          tone="yellow"
        />
        <MetricCard
          label="Not Paid / Not Approved"
          value={String(unpaidUnapprovedEvents.length)}
          tone="orange"
        />
        <MetricCard
          label="Scheduled / Active"
          value={String(activePipelineEvents.length)}
          tone="green"
        />
        <MetricCard
          label="Rejected"
          value={String(rejectedEvents.length)}
          tone="red"
        />
      </div>

      <div className="space-y-12">
      
        <AdminSection
  title="Not Paid / Not Approved"
  subtitle="Events completed by the user but blocked until payment is complete."
>
  {unpaidUnapprovedEvents.length ? (
    <div className="space-y-6">
      {unpaidUnapprovedEvents.map((event) => (
        <EventPipelineCard key={event.id} event={event} />
      ))}
    </div>
  ) : (
    <EmptyState text="No unpaid unapproved events." />
  )}
</AdminSection>


<AdminSection
          title="Events Waiting for Approval"
          subtitle="Waiting for admin review."
        >
          {readyForApprovalEvents.length ? (
            <div className="space-y-6">
              {readyForApprovalEvents.map((event) => (
                <EventModerationCard
                  key={event.id}
                  event={event}
                  mode="submitted"
                  approveEvent={approveEvent}
                  rejectEvent={rejectEvent}
                />
              ))}
            </div>
          ) : (
            <EmptyState text="No submitted events waiting for review." />
          )}
        </AdminSection>


        <AdminSection
          title="Unapproved and Waiting on Payment"
          subtitle="Events that are not approved and still need payment or an admin override."
        >
          {unpaidUnapprovedEvents.length ? (
            <div className="space-y-6">
              {unpaidUnapprovedEvents.map((event) => (
                <EventModerationCard
                  key={event.id}
                  event={event}
                  mode="awaiting_payment"
                  applyPaymentOverride={applyPaymentOverride}
                />
              ))}
            </div>
          ) : (
            <EmptyState text="No approved unpaid events right now." />
          )}
        </AdminSection>

        <AdminSection
          title="Scheduled / Active"
          subtitle="Events currently in the publish pipeline or live."
        >
          {activePipelineEvents.length ? (
            <div className="space-y-4">
              {activePipelineEvents.map((event) => (
                <EventPipelineCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState text="No scheduled or active events yet." />
          )}
        </AdminSection>

        <AdminSection
          title="Rejected"
          subtitle="Recently rejected events."
        >
          {rejectedEvents.length ? (
            <div className="space-y-4">
              {rejectedEvents.slice(0, 20).map((event) => (
                <EventPipelineCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState text="No rejected events." />
          )}
        </AdminSection>
      </div>
    </section>
  );
}

function EventModerationCard({
  event,
  mode,
  approveEvent,
  rejectEvent,
  applyPaymentOverride,
}: {
  event: any;
  mode: 'submitted' | 'awaiting_payment';
  approveEvent?: (formData: FormData) => Promise<void>;
  rejectEvent?: (formData: FormData) => Promise<void>;
  applyPaymentOverride?: (formData: FormData) => Promise<void>;
}) {
  const urgency = getEventUrgency(event);
  const cardTone = getEventCardTone(mode, urgency);

  return (
    <div className={`rounded-[2rem] border p-6 ${cardTone}`}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip status={event.status} />
            <OwnerTypeChip ownerType={event.owner_type} />
            <UrgencyChip urgency={urgency} />
          </div>

          <h2 className="mt-3 text-2xl font-bold text-white">{event.name}</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Venue" value={event.venue_name} />
            <Info label="City / State" value={`${event.city}, ${event.state}`} />
            <Info
              label="Event Start"
              value={
                event.event_start_at
                  ? new Date(event.event_start_at).toLocaleString()
                  : '—'
              }
            />
            <Info label="Slug" value={event.slug} />
            <Info label="Linkd'N" value={event.linkdn_mode} />
            <Info label="Total Due" value={`$${Number(event.total_price || 0).toFixed(2)}`} />
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href={`/admin/events/${event.id}`}
            className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
          >
            View Full Event
          </Link>

          {mode === 'submitted' && approveEvent && (
            <form action={approveEvent}>
              <input type="hidden" name="event_id" value={event.id} />
              <button
                type="submit"
                className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
              >
                Approve Event
              </button>
            </form>
          )}

          {mode === 'submitted' && rejectEvent && (
            <form action={rejectEvent} className="space-y-3">
              <input type="hidden" name="event_id" value={event.id} />
              <textarea
                name="rejection_reason"
                rows={4}
                placeholder="Reason for rejection"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 font-semibold text-red-300 hover:border-red-500/40"
              >
                Reject Event
              </button>
            </form>
          )}

          {mode === 'awaiting_payment' && applyPaymentOverride && (
            <form action={applyPaymentOverride} className="space-y-3">
              <input type="hidden" name="event_id" value={event.id} />
              <textarea
                name="reason"
                rows={4}
                placeholder="Override reason"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-5 py-3 font-semibold text-accent hover:border-accent/40"
              >
                Apply Payment Override
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function EventPipelineCard({ event }: { event: any }) {
  const urgency = getEventUrgency(event);

  return (
    <div className={`rounded-3xl border p-5 ${getPipelineTone(event.status, urgency)}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={event.status} />
          <UrgencyChip urgency={urgency} />
          <StateChip
            label={event.is_public ? 'Public' : 'Hidden'}
            tone={event.is_public ? 'green' : 'gray'}
          />
        </div>

        <Link
          href={`/admin/events/${event.id}`}
          className="inline-flex rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
        >
          View Full Event
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Event" value={event.name} />
        <Info label="Venue" value={event.venue_name} />
        <Info label="Location" value={`${event.city}, ${event.state}`} />
        <Info label="Status" value={event.status} />
        <Info
          label="Start"
          value={
            event.event_start_at
              ? new Date(event.event_start_at).toLocaleString()
              : '—'
          }
        />
        <Info
          label="Promo Start"
          value={
            event.promotion_start_at
              ? new Date(event.promotion_start_at).toLocaleString()
              : '—'
          }
        />
        <Info
          label="Promo End"
          value={
            event.promotion_end_at
              ? new Date(event.promotion_end_at).toLocaleString()
              : '—'
          }
        />
        <Info label="Total" value={`$${Number(event.total_price || 0).toFixed(2)}`} />
      </div>
    </div>
  );
}

function getEventUrgency(event: any): 'high' | 'medium' | 'normal' {
  if (!event.event_start_at) return 'normal';

  const now = new Date().getTime();
  const start = new Date(event.event_start_at).getTime();
  const hoursUntil = (start - now) / (1000 * 60 * 60);

  if (event.status === 'submitted' && hoursUntil <= 48) return 'high';
  if (event.status === 'submitted' && hoursUntil <= 120) return 'medium';
  if (event.status === 'scheduled' && hoursUntil <= 24) return 'high';
  if (event.status === 'active') return 'normal';

  return 'normal';
}

function getEventCardTone(mode: string, urgency: 'high' | 'medium' | 'normal') {
  if (mode === 'submitted' && urgency === 'high') {
    return 'border-red-500/20 bg-red-500/10';
  }
  if (mode === 'submitted' && urgency === 'medium') {
    return 'border-yellow-500/20 bg-yellow-500/10';
  }
  if (mode === 'awaiting_payment') {
    return 'border-orange-500/20 bg-orange-500/10';
  }
  return 'border-white/10 bg-white/5';
}

function getPipelineTone(status: string, urgency: 'high' | 'medium' | 'normal') {
  if (status === 'active') return 'border-green-500/20 bg-green-500/10';
  if (status === 'scheduled' && urgency === 'high') return 'border-yellow-500/20 bg-yellow-500/10';
  if (status === 'rejected') return 'border-red-500/20 bg-red-500/10';
  return 'border-white/10 bg-white/5';
}

function AdminSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-white/65">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 text-white">{value || '—'}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
      {text}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'yellow' | 'orange' | 'green' | 'red';
}) {
  const styles =
    tone === 'yellow'
      ? 'border-yellow-500/20 bg-yellow-500/10'
      : tone === 'orange'
      ? 'border-orange-500/20 bg-orange-500/10'
      : tone === 'green'
      ? 'border-green-500/20 bg-green-500/10'
      : 'border-red-500/20 bg-red-500/10';

  return (
    <div className={`rounded-3xl border p-5 ${styles}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status?: string | null }) {
  const tone =
    status === 'NPNA'
  ? 'border-orange-500/20 bg-orange-500/10 text-orange-200'
  : status === 'paid_awaiting_approval'
  ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
  : status === 'approved_awaiting_payment'
  ? 'border-orange-500/20 bg-orange-500/10 text-orange-200'
  : status === 'building'
  ? 'border-white/10 bg-black/20 text-white/70'
  : 'border-white/10 bg-black/20 text-white/70';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${tone}`}>
      {status || '—'}
    </span>
  );
}

function OwnerTypeChip({ ownerType }: { ownerType?: string | null }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/70">
      {ownerType || 'user'}
    </span>
  );
}

function UrgencyChip({ urgency }: { urgency: 'high' | 'medium' | 'normal' }) {
  const tone =
    urgency === 'high'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : urgency === 'medium'
      ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
      : 'border-white/10 bg-black/20 text-white/70';

  const label =
    urgency === 'high' ? 'Urgent' : urgency === 'medium' ? 'Soon' : 'Normal';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${tone}`}>
      {label}
    </span>
  );
}

function StateChip({
  label,
  tone,
}: {
  label: string;
  tone: 'green' | 'gray';
}) {
  const styles =
    tone === 'green'
      ? 'border-green-500/20 bg-green-500/10 text-green-200'
      : 'border-white/10 bg-black/20 text-white/70';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}>
      {label}
    </span>
  );
}
  */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getAdminEventQueue,
  type EventQueueApprovalFilter,
  type EventQueueItem,
  type EventQueuePaymentFilter,
  type EventQueueSort,
  type EventQueueUrgency,
} from '@/lib/admin/event-queue';
import {
  approveEvent,
  rejectEvent,
  applyPaymentOverride,
  approveEventRevision,
  rejectEventRevision,
} from './new/actions';

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    payment?: string;
    approval?: string;
    urgency?: string;
    city?: string;
    state?: string;
    sort?: string;
    page?: string;
  }>;
};

const PIPELINE_STATUSES = [
  'draft',
  'building',
  'revision_draft',
  'submitted',
  'approved_unpaid',
  'approved_awaiting_payment',
  'paid_awaiting_approval',
  'revision_submitted',
  'scheduled',
  'active',
  'live',
  'rejected',
  'removal_requested',
  'refund_requested',
  'cancelled',
  'removed',
  'ended',
  'archived',
];

const REVIEW_STATUSES = [
  'submitted',
  'paid_awaiting_approval',
  'approved_unpaid',
  'approved_awaiting_payment',
];

const PUBLIC_STATUSES = ['scheduled', 'active', 'live'];

export default async function AdminEventsPage({
  searchParams,
}: Props) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const filters = {
    search: clean(query.q),
    status: clean(query.status),
    payment: asPaymentFilter(query.payment),
    approval: asApprovalFilter(query.approval),
    urgency: asUrgencyFilter(query.urgency),
    city: clean(query.city),
    state: clean(query.state),
    sort: asSort(query.sort),
    page: positiveInteger(query.page, 1),
    pageSize: 25,
  };

  const queue = await getAdminEventQueue(
    supabase,
    filters
  );

  const activeFilterCount = [
    filters.search,
    filters.status,
    filters.payment !== 'all'
      ? filters.payment
      : '',
    filters.approval !== 'all'
      ? filters.approval
      : '',
    filters.urgency !== 'all'
      ? filters.urgency
      : '',
    filters.city,
    filters.state,
    filters.sort !== 'newest'
      ? filters.sort
      : '',
  ].filter(Boolean).length;

  const oldestQueueItem = getOldestQueueItem(
    queue.items
  );

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Admin
        </Link>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/lookups"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            Manage Lookups
          </Link>

          <Link
            href="/events"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            View Public Events
          </Link>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Event Moderation
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Control the event pipeline.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Search, filter, prioritize, approve, reject, revise,
              and monitor HypeKnight events from one operational
              workspace.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatusChip
                label={`${queue.summary.awaitingReview} awaiting review`}
                tone={
                  queue.summary.awaitingReview
                    ? 'yellow'
                    : 'green'
                }
              />

              <StatusChip
                label={`${queue.summary.revisions} revisions`}
                tone={
                  queue.summary.revisions
                    ? 'purple'
                    : 'neutral'
                }
              />

              <StatusChip
                label={`${queue.summary.removalRequests} removals`}
                tone={
                  queue.summary.removalRequests
                    ? 'red'
                    : 'neutral'
                }
              />

              <StatusChip
                label={`${queue.summary.paymentExceptions} payment exceptions`}
                tone={
                  queue.summary.paymentExceptions
                    ? 'red'
                    : 'neutral'
                }
              />

              <StatusChip
                label={`${queue.summary.publicPipeline} public pipeline`}
                tone="green"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Oldest Visible Queue Item
            </p>

            <p className="mt-3 text-3xl font-black text-white">
              {oldestQueueItem
                ? formatRelativeTime(
                    oldestQueueItem.submitted_at ||
                      oldestQueueItem.status_changed_at ||
                      oldestQueueItem.created_at
                  )
                : 'Queue clear'}
            </p>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Age of the oldest moderation or revision item on
              this page.
            </p>

            <Link
              href="/admin/events?status=submitted&sort=oldest"
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Open Oldest Reviews
            </Link>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Priority Queue"
          title="Work that needs attention"
          text="Start with moderation, revisions, removals, refunds, and payment exceptions before browsing the full inventory."
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <PriorityCard
            title="Reviews"
            value={queue.summary.awaitingReview}
            text="Events waiting for a moderation decision."
            href="/admin/events?status=submitted"
            tone="yellow"
          />

          <PriorityCard
            title="Revisions"
            value={queue.summary.revisions}
            text="Owner changes waiting for another decision."
            href="/admin/events?status=revision_submitted"
            tone="purple"
          />

          <PriorityCard
            title="Removals"
            value={queue.summary.removalRequests}
            text="Owner removal requests needing action."
            href="/admin/events?status=removal_requested"
            tone="red"
          />

          <PriorityCard
            title="Refunds"
            value={queue.summary.refundRequests}
            text="Refund-related requests requiring review."
            href="/admin/events?status=refund_requested"
            tone="red"
          />

          <PriorityCard
            title="Payment Issues"
            value={queue.summary.paymentExceptions}
            text="Payment and approval states needing attention."
            href="/admin/events?payment=unpaid"
            tone="orange"
          />

          <PriorityCard
            title="Public Pipeline"
            value={queue.summary.publicPipeline}
            text="Scheduled, active, and live listings."
            href="/admin/events?status=scheduled,active,live"
            tone="green"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Pipeline"
          title="Event lifecycle"
          text="Open any status to isolate that part of the event workflow."
        />

        <div className="-mx-1 mt-6 flex gap-3 overflow-x-auto px-1 pb-3">
          {PIPELINE_STATUSES.map((status) => (
            <PipelineCard
              key={status}
              status={status}
              active={filters.status === status}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4 sm:rounded-[2.5rem] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Queue Filters
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Find the exact events you need.
            </h2>
          </div>

          {activeFilterCount ? (
            <Link
              href="/admin/events"
              className="text-sm font-semibold text-white/55 hover:text-accent"
            >
              Clear {activeFilterCount} active filter
              {activeFilterCount === 1 ? '' : 's'}
            </Link>
          ) : null}
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="q"
            defaultValue={query.q || ''}
            placeholder="Event, venue, city, slug, or event ID..."
            className={fieldClass}
          />

          <select
            name="status"
            defaultValue={filters.status}
            className={fieldClass}
          >
            <option value="">All Statuses</option>

            {PIPELINE_STATUSES.map((status) => (
              <option
                key={status}
                value={status}
              >
                {formatStatus(status)}
              </option>
            ))}
          </select>

          <select
            name="payment"
            defaultValue={filters.payment}
            className={fieldClass}
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="override">Admin Override</option>
            <option value="zero_balance">Zero Balance</option>
          </select>

          <select
            name="approval"
            defaultValue={filters.approval}
            className={fieldClass}
          >
            <option value="all">All Approval States</option>
            <option value="approved">Approved</option>
            <option value="unapproved">Unapproved</option>
          </select>

          <select
            name="urgency"
            defaultValue={filters.urgency}
            className={fieldClass}
          >
            <option value="all">All Urgency Levels</option>
            <option value="critical">Critical</option>
            <option value="attention">Needs Attention</option>
            <option value="normal">Normal</option>
          </select>

          <input
            name="city"
            defaultValue={query.city || ''}
            placeholder="City"
            className={fieldClass}
          />

          <input
            name="state"
            defaultValue={query.state || ''}
            maxLength={2}
            placeholder="State"
            className={fieldClass}
          />

          <select
            name="sort"
            defaultValue={filters.sort}
            className={fieldClass}
          >
            <option value="newest">Newest Created</option>
            <option value="oldest">Oldest Created</option>
            <option value="event_soonest">Event Soonest</option>
            <option value="event_latest">Event Latest</option>
            <option value="recent_transition">
              Latest Transition
            </option>
          </select>

          <div className="md:col-span-2 xl:col-span-4">
            <button className="w-full rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90 sm:w-auto">
              Apply Filters
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-accent">
              Event Inventory
            </p>

            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              {queue.total} event
              {queue.total === 1 ? '' : 's'}
            </h2>

            <p className="mt-2 text-sm text-white/60">
              Page {queue.page} of {queue.pageCount}. Urgent
              indicators are calculated from workflow age,
              payment readiness, refund requests, and event timing.
            </p>
          </div>
        </div>

        {queue.items.length ? (
          <>
            <div className="mt-6 hidden overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 lg:block">
              <div className="grid grid-cols-[72px_1.35fr_1fr_150px_130px_160px_110px] gap-4 border-b border-white/10 bg-black/30 px-5 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/45">
                <span>Flyer</span>
                <span>Event</span>
                <span>Owner / Location</span>
                <span>Status</span>
                <span>Payment</span>
                <span>Timing / Urgency</span>
                <span>Action</span>
              </div>

              <div className="divide-y divide-white/10">
                {queue.items.map((event) => (
                  <EventTableRow
                    key={event.id}
                    event={event}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-4 lg:hidden">
              {queue.items.map((event) => (
                <MobileEventCard
                  key={event.id}
                  event={event}
                />
              ))}
            </div>

            <Pagination
              page={queue.page}
              pageCount={queue.pageCount}
              query={query}
            />
          </>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <p className="font-semibold text-white">
              No events match the selected filters.
            </p>

            <p className="mt-2 text-sm text-white/50">
              Clear the filters or search a broader event, city,
              venue, or workflow state.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

function EventTableRow({
  event,
}: {
  event: EventQueueItem;
}) {
  const canViewPublic =
    Boolean(event.slug) &&
    event.is_public &&
    PUBLIC_STATUSES.includes(event.status);

  return (
    <article className="grid grid-cols-[72px_1.35fr_1fr_150px_130px_160px_110px] gap-4 px-5 py-5 transition hover:bg-white/[0.03]">
      <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-black/30">
        {event.flyer_url ? (
          <img
            src={event.flyer_url}
            alt={event.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/35">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-lg font-black text-white">
          {event.name}
        </h3>

        <p className="mt-1 truncate text-sm text-white/55">
          {event.venue_name || 'Venue not listed'}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <UrgencyBadge urgency={event.urgency} />

          {event.payment_override ? (
            <MiniChip label="Payment Override" />
          ) : null}

          {event.refund_requested ||
          event.refund_status === 'requested' ? (
            <MiniChip label="Refund Requested" />
          ) : null}
        </div>
      </div>

      <div className="min-w-0 text-sm">
        <p className="truncate font-semibold text-white/75">
          {getOwnerLabel(event)}
        </p>

        <p className="mt-1 truncate text-white/50">
          {[event.city, event.state]
            .filter(Boolean)
            .join(', ') || 'Location TBA'}
        </p>

        <p className="mt-1 text-xs text-white/35">
          {event.owner_role
            ? formatStatus(event.owner_role)
            : 'Unknown role'}
        </p>
      </div>

      <div>
        <StatusBadge status={event.status} />
      </div>

      <div>
        <PaymentBadge event={event} />

        <p className="mt-2 text-xs text-white/45">
          ${event.total_price.toFixed(2)}
        </p>
      </div>

      <div className="text-sm text-white/60">
        <p>{formatCompactDate(event.event_start_at)}</p>

        <p className="mt-1 text-xs text-white/40">
          {event.status_changed_at
            ? `Changed ${formatRelativeTime(
                event.status_changed_at
              )}`
            : `Created ${formatRelativeTime(
                event.created_at
              )}`}
        </p>

        {event.urgencyReasons.length ? (
          <p className="mt-2 line-clamp-2 text-xs text-red-200/70">
            {event.urgencyReasons.join(' · ')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href={`/admin/events/${event.id}`}
          className="rounded-xl bg-accent px-3 py-2 text-center text-sm font-semibold text-black hover:opacity-90"
        >
          Review
        </Link>

        {canViewPublic ? (
          <Link
            href={`/events/${event.slug}`}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center text-xs font-semibold text-white hover:border-accent/40"
          >
            Public
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function MobileEventCard({
  event,
}: {
  event: EventQueueItem;
}) {
  const needsApproval =
    REVIEW_STATUSES.includes(event.status);

  const needsRevision =
    event.status === 'revision_submitted';

  const canViewPublic =
    Boolean(event.slug) &&
    event.is_public &&
    PUBLIC_STATUSES.includes(event.status);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
      {event.flyer_url ? (
        <img
          src={event.flyer_url}
          alt={event.name}
          className="h-52 w-full object-cover"
        />
      ) : null}

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={event.status} />
          <PaymentBadge event={event} />
          <UrgencyBadge urgency={event.urgency} />
        </div>

        <h3 className="mt-4 text-2xl font-black text-white">
          {event.name}
        </h3>

        <p className="mt-2 text-sm text-white/60">
          {event.venue_name || 'Venue not listed'} ·{' '}
          {[event.city, event.state]
            .filter(Boolean)
            .join(', ') || 'Location TBA'}
        </p>

        <p className="mt-2 text-sm text-white/45">
          Owner: {getOwnerLabel(event)}
        </p>

        {event.urgencyReasons.length ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-red-200">
              Attention
            </p>

            <p className="mt-2 text-sm leading-6 text-red-100/70">
              {event.urgencyReasons.join(' · ')}
            </p>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <CompactInfo
            label="Starts"
            value={formatCompactDate(
              event.event_start_at
            )}
          />

          <CompactInfo
            label="Total"
            value={`$${event.total_price.toFixed(2)}`}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/admin/events/${event.id}`}
            className="rounded-2xl bg-accent px-4 py-3 text-center font-semibold text-black"
          >
            Open Review
          </Link>

          {canViewPublic ? (
            <Link
              href={`/events/${event.slug}`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center font-semibold text-white"
            >
              Public Page
            </Link>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-sm text-white/40">
              Not Public
            </div>
          )}
        </div>

        {needsApproval ? (
          <details className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
            <summary className="cursor-pointer font-semibold text-yellow-100">
              Quick Approval Actions
            </summary>

            <div className="mt-4">
              <ApprovalControls event={event} />
            </div>
          </details>
        ) : null}

        {needsRevision ? (
          <details className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
            <summary className="cursor-pointer font-semibold text-purple-100">
              Quick Revision Actions
            </summary>

            <div className="mt-4">
              <RevisionControls event={event} />
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

function ApprovalControls({
  event,
}: {
  event: EventQueueItem;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <form action={approveEvent}>
        <input
          type="hidden"
          name="event_id"
          value={event.id}
        />

        <button className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 font-semibold text-green-200 hover:border-green-500/40">
          Approve Event
        </button>
      </form>

      <form
        action={rejectEvent}
        className="space-y-3 lg:col-span-2"
      >
        <input
          type="hidden"
          name="event_id"
          value={event.id}
        />

        <textarea
          name="rejection_reason"
          rows={2}
          required
          placeholder="Reason for rejection or required changes"
          className={fieldClass}
        />

        <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-semibold text-red-200 hover:border-red-500/40">
          Reject / Send Back
        </button>
      </form>

      {!event.isFinanciallyEligible ? (
        <form
          action={applyPaymentOverride}
          className="space-y-3 lg:col-span-3"
        >
          <input
            type="hidden"
            name="event_id"
            value={event.id}
          />

          <input
            name="reason"
            required
            placeholder="Payment override reason"
            className={fieldClass}
          />

          <button className="w-full rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 font-semibold text-yellow-200 hover:border-yellow-500/40">
            Apply Payment Override
          </button>
        </form>
      ) : null}
    </div>
  );
}

function RevisionControls({
  event,
}: {
  event: EventQueueItem;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        action={approveEventRevision}
        className="space-y-3"
      >
        <input
          type="hidden"
          name="event_id"
          value={event.id}
        />

        <textarea
          name="admin_note"
          rows={2}
          placeholder="Optional approval note"
          className={fieldClass}
        />

        <button className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 font-semibold text-green-200">
          Approve Revision
        </button>
      </form>

      <form
        action={rejectEventRevision}
        className="space-y-3"
      >
        <input
          type="hidden"
          name="event_id"
          value={event.id}
        />

        <textarea
          name="admin_note"
          rows={2}
          required
          placeholder="Explain what still needs to change"
          className={fieldClass}
        />

        <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-semibold text-red-200">
          Reject Revision
        </button>
      </form>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  query,
}: {
  page: number;
  pageCount: number;
  query: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-between gap-4">
      {page > 1 ? (
        <Link
          href={buildPageHref(query, page - 1)}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:border-accent/40"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}

      <p className="text-sm text-white/50">
        Page {page} of {pageCount}
      </p>

      {page < pageCount ? (
        <Link
          href={buildPageHref(query, page + 1)}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:border-accent/40"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function PipelineCard({
  status,
  active,
}: {
  status: string;
  active: boolean;
}) {
  return (
    <Link
      href={`/admin/events?status=${encodeURIComponent(
        status
      )}`}
      className={`w-44 shrink-0 rounded-[1.5rem] border p-4 transition ${
        active
          ? 'border-accent/40 bg-accent/10'
          : 'border-white/10 bg-white/5 hover:border-accent/40'
      }`}
    >
      <p className="text-sm font-black text-white">
        {formatStatus(status)}
      </p>

      <p className="mt-2 text-xs text-white/45">
        Open status queue →
      </p>
    </Link>
  );
}

function PriorityCard({
  title,
  value,
  text,
  href,
  tone,
}: {
  title: string;
  value: number;
  text: string;
  href: string;
  tone:
    | 'yellow'
    | 'purple'
    | 'red'
    | 'orange'
    | 'green';
}) {
  const classes = {
    yellow:
      'border-yellow-500/20 bg-yellow-500/10',
    purple:
      'border-purple-500/20 bg-purple-500/10',
    red:
      'border-red-500/20 bg-red-500/10',
    orange:
      'border-orange-500/20 bg-orange-500/10',
    green:
      'border-green-500/20 bg-green-500/10',
  };

  return (
    <Link
      href={href}
      className={`rounded-[1.75rem] border p-5 transition hover:border-accent/40 ${classes[tone]}`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">
        {title}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>

      <p className="mt-3 text-sm leading-6 text-white/60">
        {text}
      </p>

      <p className="mt-5 text-sm font-semibold text-accent">
        Open →
      </p>
    </Link>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.28em] text-accent">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:text-base">
        {text}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    draft:
      'border-white/10 bg-white/5 text-white/65',
    building:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    submitted:
      'border-blue-500/20 bg-blue-500/10 text-blue-200',
    approved_unpaid:
      'border-orange-500/20 bg-orange-500/10 text-orange-200',
    approved_awaiting_payment:
      'border-orange-500/20 bg-orange-500/10 text-orange-200',
    paid_awaiting_approval:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    revision_draft:
      'border-purple-500/20 bg-purple-500/10 text-purple-200',
    revision_submitted:
      'border-purple-500/20 bg-purple-500/10 text-purple-200',
    scheduled:
      'border-indigo-500/20 bg-indigo-500/10 text-indigo-200',
    active:
      'border-green-500/20 bg-green-500/10 text-green-200',
    live:
      'border-green-500/20 bg-green-500/10 text-green-200',
    rejected:
      'border-red-500/20 bg-red-500/10 text-red-200',
    removal_requested:
      'border-red-500/20 bg-red-500/10 text-red-200',
    refund_requested:
      'border-red-500/20 bg-red-500/10 text-red-200',
    cancelled:
      'border-red-500/20 bg-red-500/10 text-red-200',
    removed:
      'border-white/10 bg-white/5 text-white/50',
    ended:
      'border-white/10 bg-white/5 text-white/50',
    archived:
      'border-white/10 bg-white/5 text-white/50',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[status] || styles.draft
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function PaymentBadge({
  event,
}: {
  event: EventQueueItem;
}) {
  if (event.payment_override) {
    return (
      <span className="inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-200">
        Override
      </span>
    );
  }

  if (event.isFinanciallyEligible) {
    return (
      <span className="inline-flex rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-200">
        Paid / Eligible
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
      Unpaid
    </span>
  );
}

function UrgencyBadge({
  urgency,
}: {
  urgency: EventQueueUrgency;
}) {
  const styles = {
    critical:
      'border-red-500/20 bg-red-500/10 text-red-200',
    attention:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    normal:
      'border-white/10 bg-white/5 text-white/55',
    all:
      'border-white/10 bg-white/5 text-white/55',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[urgency]}`}
    >
      {urgency === 'attention'
        ? 'Needs Attention'
        : formatStatus(urgency)}
    </span>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone:
    | 'green'
    | 'yellow'
    | 'purple'
    | 'red'
    | 'neutral';
}) {
  const styles = {
    green:
      'border-green-500/20 bg-green-500/10 text-green-200',
    yellow:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-100',
    purple:
      'border-purple-500/20 bg-purple-500/10 text-purple-200',
    red:
      'border-red-500/20 bg-red-500/10 text-red-200',
    neutral:
      'border-white/10 bg-white/5 text-white/60',
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {label}
    </span>
  );
}

function CompactInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>

      <p className="mt-2 break-words font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function MiniChip({
  label,
}: {
  label: string;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-semibold text-white/55">
      {label}
    </span>
  );
}

function getOldestQueueItem(
  events: EventQueueItem[]
) {
  const candidates = events.filter((event) =>
    [
      ...REVIEW_STATUSES,
      'revision_submitted',
    ].includes(event.status)
  );

  if (!candidates.length) {
    return null;
  }

  return candidates.reduce((oldest, event) => {
    const oldestTime = dateTime(
      oldest.submitted_at ||
        oldest.status_changed_at ||
        oldest.created_at
    );

    const eventTime = dateTime(
      event.submitted_at ||
        event.status_changed_at ||
        event.created_at
    );

    return eventTime < oldestTime
      ? event
      : oldest;
  });
}

function getOwnerLabel(
  event: EventQueueItem
) {
  return (
    event.owner_name ||
    event.owner_username ||
    event.owner_id?.slice(0, 8) ||
    'Unknown owner'
  );
}

function buildPageHref(
  query: Record<
    string,
    string | undefined
  >,
  page: number
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(
    query
  )) {
    if (
      value &&
      key !== 'page'
    ) {
      params.set(key, value);
    }
  }

  params.set('page', String(page));

  return `/admin/events?${params.toString()}`;
}

function asPaymentFilter(
  value?: string
): EventQueuePaymentFilter {
  if (
    [
      'paid',
      'unpaid',
      'override',
      'zero_balance',
    ].includes(value || '')
  ) {
    return value as EventQueuePaymentFilter;
  }

  return 'all';
}

function asApprovalFilter(
  value?: string
): EventQueueApprovalFilter {
  if (
    ['approved', 'unapproved'].includes(
      value || ''
    )
  ) {
    return value as EventQueueApprovalFilter;
  }

  return 'all';
}

function asUrgencyFilter(
  value?: string
): EventQueueUrgency {
  if (
    [
      'critical',
      'attention',
      'normal',
    ].includes(value || '')
  ) {
    return value as EventQueueUrgency;
  }

  return 'all';
}

function asSort(
  value?: string
): EventQueueSort {
  if (
    [
      'oldest',
      'event_soonest',
      'event_latest',
      'recent_transition',
    ].includes(value || '')
  ) {
    return value as EventQueueSort;
  }

  return 'newest';
}

function positiveInteger(
  value: unknown,
  fallback: number
) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 1
  ) {
    return fallback;
  }

  return Math.floor(number);
}

function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatCompactDate(
  value?: string | null
) {
  if (!value) {
    return 'Not scheduled';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  ).format(date);
}

function formatRelativeTime(
  value?: string | null
) {
  if (!value) {
    return 'Unknown';
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 'Unknown';
  }

  const difference =
    Date.now() - timestamp;

  const minutes = Math.floor(
    difference / 60_000
  );

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  return `${days}d ago`;
}

function dateTime(
  value?: string | null
) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(
    value
  ).getTime();

  return Number.isNaN(timestamp)
    ? Number.POSITIVE_INFINITY
    : timestamp;
}

function clean(value: unknown) {
  return String(value || '').trim();
}

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';