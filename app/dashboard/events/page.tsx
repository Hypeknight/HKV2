import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  discardDraftEvent,
  requestEventRemoval,
} from '@/app/dashboard/events/actions';

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

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Dashboard</p>
          <h1 className="mt-3 text-4xl font-bold text-white">My Events</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Manage your HypeKnight events based on their current lifecycle status.
          </p>
        </div>

        <Link
          href="/dashboard/events/new/step-1"
          className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
        >
          Create New Event
        </Link>
      </div>

      {!events?.length ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          You have not created any events yet.
        </div>
      ) : (
        <div className="space-y-5">
          {events.map((event) => {
            const canEdit = ['draft', 'building', 'rejected'].includes(event.status);
            const canDiscard = ['draft', 'building', 'rejected'].includes(event.status);
            const canRequestRemoval = ['scheduled', 'live'].includes(event.status);

            const editHref =
              event.current_step === 1
                ? `/dashboard/events/${event.id}/edit/step-2`
                : event.current_step === 2
                ? `/dashboard/events/${event.id}/edit/step-3`
                : `/dashboard/events/${event.id}/review`;

            return (
              <div
                key={event.id}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">{event.name}</h2>
                      <StatusBadge status={event.status} />
                    </div>

                    <p className="mt-2 text-white/65">
                      {event.venue_name || 'No venue'} · {event.city}, {event.state}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Info
                        label="Start"
                        value={
                          event.event_start_at
                            ? new Date(event.event_start_at).toLocaleString()
                            : '—'
                        }
                      />
                      <Info label="Public" value={event.is_public ? 'Yes' : 'No'} />
                      <Info label="Paid" value={event.is_paid ? 'Yes' : 'No'} />
                      <Info
                        label="Total"
                        value={`$${Number(event.total_price || 0).toFixed(2)}`}
                      />
                    </div>

                    {event.rejection_reason ? (
                      <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                        <span className="font-semibold">Rejection reason:</span>{' '}
                        {event.rejection_reason}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3 lg:max-w-[320px] lg:justify-end">
                    <Link
                      href={`/events/${event.slug}`}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                    >
                      View
                    </Link>

                    {canEdit && (
                      <Link
                        href={editHref}
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                      >
                        Edit
                      </Link>
                    )}

                    {canDiscard && (
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

                    {canRequestRemoval && (
                      <details className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white">
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
                            defaultValue="no"
                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
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
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-white/10 text-white',
    building: 'bg-yellow-500/10 text-yellow-300',
    submitted: 'bg-blue-500/10 text-blue-300',
    rejected: 'bg-red-500/10 text-red-300',
    approved_unpaid: 'bg-orange-500/10 text-orange-300',
    scheduled: 'bg-purple-500/10 text-purple-300',
    live: 'bg-green-500/10 text-green-300',
    ended: 'bg-white/10 text-white/70',
    removal_requested: 'bg-red-500/10 text-red-300',
    removed: 'bg-white/10 text-white/70',
    archived: 'bg-white/10 text-white/70',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${map[status] || 'bg-white/10 text-white'}`}>
      {status}
    </span>
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