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
  approveEvent,
  rejectEvent,
  applyPaymentOverride,
  approveEventRevision,
  rejectEventRevision,
} from './new/actions';

export default async function AdminEventsPage() {
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

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const allEvents = events ?? [];

  const readyForApprovalEvents = allEvents.filter((event) =>
    ['paid_awaiting_approval', 'submitted', 'approved_unpaid'].includes(
      event.status
    )
  );

  const revisionEvents = allEvents.filter(
    (event) => event.status === 'revision_submitted'
  );

  const activeEvents = allEvents.filter((event) =>
    ['scheduled', 'active'].includes(event.status)
  );

  const draftEvents = allEvents.filter((event) =>
    ['draft', 'building', 'revision_draft'].includes(event.status)
  );

  const rejectedEvents = allEvents.filter((event) =>
    ['rejected', 'cancelled', 'removed'].includes(event.status)
  );

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin" className="text-sm text-white/60 hover:text-accent">
          ← Back to Admin
        </Link>

        <Link
          href="/events"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-white hover:border-accent/40"
        >
          View Public Events
        </Link>
      </div>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Event Control Center
        </p>

        <h1 className="mt-3 text-4xl font-black text-white">
          Manage Event Pipeline
        </h1>

        <p className="mt-3 max-w-3xl text-white/70">
          Review paid events, approve or reject submissions, manage revisions,
          audit flyers, and monitor active HypeKnight listings.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Awaiting Approval"
            value={String(readyForApprovalEvents.length)}
          />
          <MetricCard
            label="Revision Submitted"
            value={String(revisionEvents.length)}
          />
          <MetricCard label="Active/Scheduled" value={String(activeEvents.length)} />
          <MetricCard label="Drafts" value={String(draftEvents.length)} />
          <MetricCard label="Rejected/Removed" value={String(rejectedEvents.length)} />
        </div>
      </section>

      <EventGroup
        title="Ready for Admin Approval"
        text="Paid, submitted, or override-ready events that need admin review."
        events={readyForApprovalEvents}
        mode="approval"
      />

      <EventGroup
        title="Revision Submissions"
        text="Events that were edited by the owner and resubmitted for admin approval."
        events={revisionEvents}
        mode="revision"
      />

      <EventGroup
        title="Scheduled / Active Events"
        text="Approved events currently scheduled or active in discovery."
        events={activeEvents}
        mode="view"
      />

      <EventGroup
        title="Drafts / Building / Revision Drafts"
        text="Events still being worked on by owners."
        events={draftEvents}
        mode="view"
      />

      <EventGroup
        title="Rejected / Cancelled / Removed"
        text="Events that are no longer in the active approval pipeline."
        events={rejectedEvents}
        mode="view"
      />
    </section>
  );
}

function EventGroup({
  title,
  text,
  events,
  mode,
}: {
  title: string;
  text: string;
  events: any[];
  mode: 'approval' | 'revision' | 'view';
}) {
  return (
    <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            {events.length} Events
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">{title}</h2>
          <p className="mt-3 max-w-3xl text-white/70">{text}</p>
        </div>
      </div>

      {events.length ? (
        <div className="mt-8 grid gap-6">
          {events.map((event) => (
            <AdminEventCard key={event.id} event={event} mode={mode} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60">
          No events in this section.
        </div>
      )}
    </section>
  );
}

function AdminEventCard({
  event,
  mode,
}: {
  event: any;
  mode: 'approval' | 'revision' | 'view';
}) {
  const imageUrl = event.flyer_url || event.image_url;
  const ownerName = event.owner_id || 'Unknown owner';

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20">
      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <div className="bg-black/30">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={event.name || 'Event flyer'}
              className="h-full min-h-[260px] w-full object-cover"
            />
          ) : (
            <div className="flex min-h-[260px] items-center justify-center text-white/40">
              No flyer uploaded
            </div>
          )}
        </div>

        <div className="space-y-6 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-bold text-white">
                {event.name || 'Untitled Event'}
              </h3>
              <Chip label={event.status || 'unknown'} />
              {event.is_public ? <Chip label="public" /> : <Chip label="hidden" />}
              {event.is_paid ? <Chip label="paid" /> : <Chip label="unpaid" />}
            </div>

            <p className="mt-3 text-white/60">
              {[event.city, event.state].filter(Boolean).join(', ') ||
                event.venue_name ||
                'Location TBA'}
            </p>

            <p className="mt-2 text-sm text-white/45">Owner: {ownerName}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Event Start" value={formatDate(event.event_start_at)} />
            <Info label="Event End" value={formatDate(event.event_end_at)} />
            <Info label="Promo Start" value={formatDate(event.promotion_start_at)} />
            <Info label="Promo End" value={formatDate(event.promotion_end_at)} />
            <Info
              label="Total Price"
              value={`$${Number(event.total_price || 0).toFixed(2)}`}
            />
            <Info
              label="Payment Amount"
              value={`$${Number(event.payment_amount || 0).toFixed(2)}`}
            />
            <Info label="Payment Status" value={event.payment_status || '—'} />
            <Info label="Coupon" value={event.coupon_code || '—'} />
          </div>

          {event.description ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                Description
              </p>
              <p className="mt-2 line-clamp-4 text-sm text-white/65">
                {event.description}
              </p>
            </div>
          ) : null}

          {event.rejection_reason ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
              <p className="text-xs uppercase tracking-[0.25em] text-red-200/70">
                Rejection Reason
              </p>
              <p className="mt-2 text-sm">{event.rejection_reason}</p>
            </div>
          ) : null}

          {event.revision_admin_note ? (
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-100">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-200/70">
                Revision Note
              </p>
              <p className="mt-2 text-sm">{event.revision_admin_note}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {event.slug ? (
              <Link
                href={`/events/${event.slug}`}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:border-accent/40"
              >
                Public Page
              </Link>
            ) : null}

            <Link
              href={`/dashboard/events/${event.id}/review`}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:border-accent/40"
            >
              Owner Review Page
            </Link>

            <Link
              href={`/admin/events/${event.id}/`}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:border-accent/40"
            >
              Admin Review Page
            </Link>
          </div>

          {mode === 'approval' ? <ApprovalControls event={event} /> : null}
          {mode === 'revision' ? <RevisionControls event={event} /> : null}
        </div>
      </div>
    </article>
  );
}

function ApprovalControls({ event }: { event: any }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 lg:grid-cols-3">
      <form action={approveEvent}>
        <input type="hidden" name="event_id" value={event.id} />
        <button className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-200 hover:border-green-500/40">
          Approve Event
        </button>
      </form>

      <form action={rejectEvent} className="space-y-3 lg:col-span-2">
        <input type="hidden" name="event_id" value={event.id} />
        <textarea
          name="rejection_reason"
          rows={2}
          placeholder="Reason for rejection / revision request"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
        />
        <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 hover:border-red-500/40">
          Reject / Send Back
        </button>
      </form>

      {!event.is_paid && !event.payment_override ? (
        <form action={applyPaymentOverride} className="space-y-3 lg:col-span-3">
          <input type="hidden" name="event_id" value={event.id} />
          <input
            name="reason"
            placeholder="Payment override reason"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />
          <button className="w-full rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-yellow-200 hover:border-yellow-500/40">
            Apply Payment Override
          </button>
        </form>
      ) : null}
    </div>
  );
}

function RevisionControls({ event }: { event: any }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 lg:grid-cols-2">
      <form action={approveEventRevision} className="space-y-3">
        <input type="hidden" name="event_id" value={event.id} />
        <textarea
          name="admin_note"
          rows={2}
          placeholder="Approval note"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
        />
        <button className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-200 hover:border-green-500/40">
          Approve Revision
        </button>
      </form>

      <form action={rejectEventRevision} className="space-y-3">
        <input type="hidden" name="event_id" value={event.id} />
        <textarea
          name="admin_note"
          rows={2}
          placeholder="Reason revision needs more changes"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
        />
        <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 hover:border-red-500/40">
          Reject Revision
        </button>
      </form>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="r