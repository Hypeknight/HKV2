import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  approveEvent,
  rejectEvent,
  applyPaymentOverride,
} from '@/app/admin/events/new/actions';

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

  const { data: submittedEvents, error: submittedError } = await supabase
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
      event_start_at,
      event_end_at,
      submitted_at,
      total_price,
      payment_required,
      is_paid,
      payment_override,
      promotion_start_at,
      promotion_end_at,
      linkdn_mode,
      created_at
    `)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true });

  if (submittedError) throw new Error(submittedError.message);

  const { data: unpaidApprovedEvents, error: unpaidError } = await supabase
    .from('events')
    .select(`
      id,
      name,
      city,
      state,
      venue_name,
      status,
      event_start_at,
      total_price,
      is_paid,
      payment_override,
      approved_at,
      linkdn_mode
    `)
    .eq('status', 'approved_unpaid')
    .order('approved_at', { ascending: true });

  if (unpaidError) throw new Error(unpaidError.message);

  const { data: activeEvents, error: activeError } = await supabase
    .from('events')
    .select(`
      id,
      name,
      city,
      state,
      venue_name,
      status,
      event_start_at,
      event_end_at,
      is_public,
      is_paid,
      payment_override,
      promotion_start_at,
      promotion_end_at,
      total_price,
      linkdn_mode
    `)
    .in('status', ['scheduled', 'live'])
    .order('event_start_at', { ascending: true });

  if (activeError) throw new Error(activeError.message);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Admin
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">Event Moderation</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Review submitted events, approve or reject listings, and manage
          approval/payment state before events become searchable.
        </p>
      </div>

      <div className="space-y-10">
        <AdminSection
          title="Submitted Events"
          subtitle="These events are waiting for review."
        >
          {submittedEvents?.length ? (
            <div className="space-y-6">
              {submittedEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                        {event.owner_type}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-white">
                        {event.name}
                      </h2>
                        <Link
                            href={`/admin/events/${event.id}`}
                            className="inline-flex rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                            >
                            View Full Event
                        </Link>
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
                        <Info
                          label="Total Due"
                          value={`$${Number(event.total_price || 0).toFixed(2)}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <form action={approveEvent}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <button
                          type="submit"
                          className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
                        >
                          Approve Event
                        </button>
                      </form>

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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No events are currently waiting for review." />
          )}
        </AdminSection>

        <AdminSection
          title="Approved but Unpaid"
          subtitle="These events are approved but still need payment or an override."
        >
          {unpaidApprovedEvents?.length ? (
            <div className="space-y-6">
              {unpaidApprovedEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{event.name}</h2>
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
                        <Info
                          label="Total Due"
                          value={`$${Number(event.total_price || 0).toFixed(2)}`}
                        />
                        <Info label="Paid" value={event.is_paid ? 'Yes' : 'No'} />
                        <Info
                          label="Override"
                          value={event.payment_override ? 'Yes' : 'No'}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
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
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="inline-flex rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                        >
                        View Full Event
                        </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No approved unpaid events right now." />
          )}
        </AdminSection>

        <AdminSection
          title="Scheduled / Active Events"
          subtitle="These events are approved and in the publish pipeline."
        >
          {activeEvents?.length ? (
            <div className="space-y-4">
              {activeEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                    href={`/admin/events/${event.id}`}
                    className="inline-flex rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
                    >
                    View Full Event
                    </Link>
                    <Info label="Event" value={event.name} />
                    <Info label="Status" value={event.status} />
                    <Info label="Venue" value={event.venue_name} />
                    <Info label="Location" value={`${event.city}, ${event.state}`} />
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
                    <Info label="Public" value={event.is_public ? 'Yes' : 'No'} />
                    <Info
                      label="Total"
                      value={`$${Number(event.total_price || 0).toFixed(2)}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No scheduled or live events yet." />
          )}
        </AdminSection>
      </div>
    </section>
  );
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