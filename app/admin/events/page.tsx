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
      revision_requested_at,
      revision_submitted_at,
      revision_reason,
      revision_admin_note,
      original_status_before_revision,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const events = allEvents ?? [];

  const unpaidUnapprovedEvents = events.filter((event) => event.status === 'NPNA');

  const readyForApprovalEvents = events.filter(
    (event) => event.status === 'paid_awaiting_approval'
  );

  const revisionSubmittedEvents = events.filter(
    (event) => event.status === 'revision_submitted'
  );

  const activePipelineEvents = events.filter((event) =>
    ['scheduled', 'active'].includes(event.status)
  );

  const rejectedEvents = events.filter((event) => event.status === 'rejected');

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Event Moderation</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Review submitted events, revision requests, payment state, and active pipeline events.
        </p>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Paid Awaiting Approval"
          value={String(readyForApprovalEvents.length)}
          tone="yellow"
        />
        <MetricCard
          label="Revision Requests"
          value={String(revisionSubmittedEvents.length)}
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
      </div>

      <div className="space-y-12">
        <AdminSection
          title="Revision Requests"
          subtitle="Events edited by owners and resubmitted for HypeKnight approval."
        >
          {revisionSubmittedEvents.length ? (
            <div className="space-y-6">
              {revisionSubmittedEvents.map((event) => (
                <RevisionModerationCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState text="No submitted revisions waiting for review." />
          )}
        </AdminSection>

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

        <AdminSection title="Events Waiting for Approval" subtitle="Waiting for admin review.">
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

        <AdminSection title="Scheduled / Active" subtitle="Events currently in the publish pipeline or live.">
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

        <AdminSection title="Rejected" subtitle="Recently rejected events.">
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

function RevisionModerationCard({ event }: { event: any }) {
  const urgency = getEventUrgency(event);

  return (
    <div className={`rounded-[2rem] border p-6 ${getRevisionTone(urgency)}`}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip status={event.status} />
            <OwnerTypeChip ownerType={event.owner_type} />
            <UrgencyChip urgency={urgency} />
            <StateChip
              label={event.is_public ? 'Public' : 'Hidden'}
              tone={event.is_public ? 'green' : 'gray'}
            />
          </div>

          <h2 className="mt-3 text-2xl font-bold text-white">{event.name}</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Venue" value={event.venue_name} />
            <Info label="City / State" value={`${event.city || ''}, ${event.state || ''}`} />
            <Info
              label="Event Start"
              value={event.event_start_at ? new Date(event.event_start_at).toLocaleString() : '—'}
            />
            <Info
              label="Revision Submitted"
              value={
                event.revision_submitted_at
                  ? new Date(event.revision_submitted_at).toLocaleString()
                  : '—'
              }
            />
            <Info label="Original Status" value={event.original_status_before_revision || '—'} />
            <Info label="Total Due" value={`$${Number(event.total_price || 0).toFixed(2)}`} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              Revision Reason
            </p>
            <p className="mt-2 whitespace-pre-wrap text-white/75">
              {event.revision_reason || 'No revision reason provided.'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href={`/admin/events/${event.id}`}
            className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
          >
            View Full Event
          </Link>

          {event.slug ? (
            <Link
              href={`/events/${event.slug}`}
              className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
            >
              View Public Page
            </Link>
          ) : null}

          <form action={approveEventRevision} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <textarea
              name="admin_note"
              rows={3}
              placeholder="Approval note"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Approve Revision
            </button>
          </form>

          <form action={rejectEventRevision} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <textarea
              name="admin_note"
              rows={3}
              placeholder="Reason revision needs more changes"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
            />
            <button
              type="submit"
              className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 font-semibold text-red-300 hover:border-red-500/40"
            >
              Reject Revision
            </button>
          </form>
        </div>
      </div>
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
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}