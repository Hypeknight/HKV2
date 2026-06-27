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
import { createClient } from '@/lib/supabase/server';
import { expandCitySearch } from '@/lib/city-aliases';
import { US_STATES, normalizeState } from '@/lib/states';

type Props = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    state?: string;
  }>;
};

export default async function EventsPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};

  const search = String(query.q || '').trim().toLowerCase();
  const city = String(query.city || '').trim().toLowerCase();
  const state = normalizeState(String(query.state || ''));

  const cityTerms = expandCitySearch(city);
  const searchTerms = search ? expandCitySearch(search) : [];

  const supabase = await createClient();
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const nextThreeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const startOfDayAfterTomorrow = new Date(startOfToday);
  startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 2);

  const endOfThisWeek = new Date(startOfToday);
  endOfThisWeek.setDate(endOfThisWeek.getDate() + 7);

  const endOfNextWeek = new Date(startOfToday);
  endOfNextWeek.setDate(endOfNextWeek.getDate() + 14);

  const startOfWeekend = new Date(startOfToday);
  startOfWeekend.setDate(
    startOfWeekend.getDate() + ((5 - startOfWeekend.getDay() + 7) % 7)
  );

  const endOfWeekend = new Date(startOfWeekend);
  endOfWeekend.setDate(endOfWeekend.getDate() + 3);

  const { data: hypeEvents, error: hypeError } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .in('status', ['scheduled', 'active'])
    .eq('is_public', true)
    .is('removed_at', null)
    .lte('promotion_start_at', now.toISOString())
    .gte('promotion_end_at', now.toISOString())
    .order('event_start_at', { ascending: true });

  if (hypeError) throw new Error(hypeError.message);

  const { data: externalEvents, error: externalError } = await supabase
    .from('external_events')
    .select('*')
    .eq('status', 'active')
    .not('event_start_at', 'is', null)
    .or(
      `event_end_at.gte.${now.toISOString()},and(event_end_at.is.null,event_start_at.gte.${fourHoursAgo.toISOString()})`
    )
    .order('event_start_at', { ascending: true });

  if (externalError) throw new Error(externalError.message);

  let cards = [
    ...(hypeEvents ?? []).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city || event.venue?.city,
      state: normalizeState(String(event.state || event.venue?.state || '')),
      description: event.description,
      event_start_at: event.event_start_at,
      event_end_at: event.event_end_at,
      image_url: event.flyer_url || event.image_url,
      href: `/events/${event.slug}`,
      status: event.status,
      source_label: 'HypeKnight Event',
      is_external: false,
      venue_name: event.venue_name || event.venue?.name,
      genre: Array.isArray(event.music_selection)
        ? event.music_selection?.[0]
        : event.event_type,
      classification: event.event_type,
      created_at: event.created_at,
    })),

    ...(externalEvents ?? []).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: normalizeState(String(event.state || '')),
      description: event.description,
      event_start_at: event.event_start_at,
      event_end_at: event.event_end_at,
      image_url: event.image_url,
      href: `/events/external/${event.id}`,
      status: event.status,
      source_label:
        event.source_code === 'ticketmaster'
          ? 'Ticketmaster'
          : event.source_code || 'External Event',
      is_external: true,
      venue_name: event.venue_name,
      genre: event.genre,
      classification: event.classification || event.segment,
      created_at: event.created_at,
    })),
  ];

  cards = cards.filter((event) => {
    const haystack = [
      event.name,
      event.city,
      event.state,
      event.description,
      event.venue_name,
      event.genre,
      event.classification,
      event.source_label,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const eventCity = String(event.city || '').toLowerCase();
    const eventState = normalizeState(String(event.state || ''));

    const matchesSearch = search
      ? haystack.includes(search) ||
        searchTerms.some((term) => haystack.includes(term.toLowerCase()))
      : true;

    const matchesCity = cityTerms.length
      ? cityTerms.some((term) => {
          const safeTerm = term.toLowerCase();
          return eventCity.includes(safeTerm) || safeTerm.includes(eventCity);
        })
      : true;

    const matchesState = state ? eventState === state : true;

    return matchesSearch && matchesCity && matchesState;
  });

  cards.sort(sortByStartTime);

  const liveEvents = cards.filter((event) => isLiveNow(event, now));

  const startingSoonEvents = cards.filter((event) => {
    if (!event.event_start_at) return false;
    const start = new Date(event.event_start_at);
    return start > now && start <= nextThreeHours;
  });

  const tonightEvents = cards.filter((event) =>
    isSameWindow(event.event_start_at, startOfToday, startOfTomorrow)
  );

  const tomorrowEvents = cards.filter((event) =>
    isSameWindow(event.event_start_at, startOfTomorrow, startOfDayAfterTomorrow)
  );

  const weekendEvents = cards.filter((event) =>
    isSameWindow(event.event_start_at, startOfWeekend, endOfWeekend)
  );

  const thisWeekEvents = cards.filter((event) =>
    isSameWindow(event.event_start_at, startOfDayAfterTomorrow, endOfThisWeek)
  );

  const nextWeekEvents = cards.filter((event) =>
    isSameWindow(event.event_start_at, endOfThisWeek, endOfNextWeek)
  );

  const recentlyAddedEvents = [...cards]
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 8);

  return (
    <section className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8 sm:p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Event Discovery
        </p>

        <h1 className="mt-3 text-5xl font-black text-white">
          Find your next move.
        </h1>

        <p className="mt-4 max-w-3xl text-white/70">
          Search HypeKnight events and supplemental external events by city,
          nickname, state, vibe, venue, music, or event name.
        </p>

        <form className="mt-8 grid gap-3 lg:grid-cols-[1fr_220px_180px_140px]">
          <input
            name="q"
            defaultValue={query.q || ''}
            placeholder="Search music, venues, vibes, KC, STL..."
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />

          <input
            name="city"
            defaultValue={query.city || ''}
            placeholder="City or nickname: KC, STL, Chi..."
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />

          <select
            name="state"
            defaultValue={state || ''}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent/50"
          >
            <option value="">All States</option>
            {US_STATES.map(([abbr, name]) => (
              <option key={abbr} value={abbr}>
                {name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Search
          </button>
        </form>

        {search || city || state ? (
          <div className="mt-4">
            <Link href="/events" className="text-sm text-white/55 hover:text-accent">
              Clear filters
            </Link>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Live Now" value={String(liveEvents.length)} />
          <Metric label="Starting Soon" value={String(startingSoonEvents.length)} />
          <Metric label="Tonight" value={String(tonightEvents.length)} />
          <Metric label="Tomorrow" value={String(tomorrowEvents.length)} />
          <Metric label="Weekend" value={String(weekendEvents.length)} />
          <Metric label="All Events" value={String(cards.length)} />
        </div>
      </section>

      <EventSection
        eyebrow="Here & Now"
        title="Live right now"
        text="Events currently happening."
        events={liveEvents}
        featured
        emptyText="Nothing is live right now."
      />

      <EventSection
        eyebrow="Next Up"
        title="Starting soon"
        text="Events starting in the next 3 hours."
        events={startingSoonEvents}
        emptyText="No events are starting soon right now."
      />

      <EventSection
        eyebrow="Tonight"
        title="Tonight’s events"
        text="Events scheduled for today and tonight."
        events={tonightEvents}
        emptyText="No events are showing for tonight."
      />

      <EventSection
        eyebrow="Fresh"
        title="Recently added"
        text="New listings added into discovery."
        events={recentlyAddedEvents}
        emptyText="No recently added events yet."
      />

      <EventSection
        eyebrow="Weekend"
        title="This weekend"
        text="Friday through Sunday events."
        events={weekendEvents}
        emptyText="No weekend events are showing yet."
      />

      <EventSection
        eyebrow="Tomorrow"
        title="Tomorrow’s move"
        text="Events happening tomorrow."
        events={tomorrowEvents}
        emptyText="No events are showing for tomorrow."
      />

      <EventSection
        eyebrow="This Week"
        title="Coming up this week"
        text="Events after tomorrow through the next 7 days."
        events={thisWeekEvents}
        emptyText="No events are showing for this week."
      />

      <EventSection
        eyebrow="Next Week"
        title="Next week’s lineup"
        text="Events scheduled 7 to 14 days out."
        events={nextWeekEvents}
        emptyText="No events are showing for next week."
      />

      <EventSection
        eyebrow="All"
        title="All discoverable events"
        text="All events currently inside their HypeKnight or external discovery window."
        events={cards}
        emptyText="No events match your search."
      />
    </section>
  );
}

function isSameWindow(
  value: string | null | undefined,
  start: Date,
  end: Date
) {
  if (!value) return false;
  const date = new Date(value);
  return date >= start && date < end;
}

function isLiveNow(event: any, now: Date) {
  if (!event.event_start_at) return false;

  const start = new Date(event.event_start_at);
  const end = event.event_end_at
    ? new Date(event.event_end_at)
    : new Date(start.getTime() + 4 * 60 * 60 * 1000);

  return start <= now && end >= now;
}

function sortByStartTime(a: any, b: any) {
  const aTime = a.event_start_at
    ? new Date(a.event_start_at).getTime()
    : Infinity;

  const bTime = b.event_start_at
    ? new Date(b.event_start_at).getTime()
    : Infinity;

  return aTime - bTime;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function EventSection({
  eyebrow,
  title,
  text,
  events,
  featured = false,
  emptyText,
}: {
  eyebrow: string;
  title: string;
  text: string;
  events: any[];
  featured?: boolean;
  emptyText: string;
}) {
  return (
    <section>
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-bold text-white">{title}</h2>
        <p className="mt-3 text-white/70">{text}</p>
      </div>

      {events.length ? (
        <div
          className={
            featured
              ? 'mt-8 grid gap-5 md:grid-cols-2'
              : 'mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3'
          }
        >
          {events.map((event) => (
            <EventCard key={`${event.source_label}-${event.id}`} event={event} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/60">
          {emptyText}
        </div>
      )}
    </section>
  );
}

function EventCard({ event }: { event: any }) {
  const live = isLiveNow(event, new Date());

  return (
    <Link
      href={event.href}
      className="group block overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 transition hover:border-accent/40 hover:bg-white/[0.07]"
    >
      <div className="relative">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.name}
            className="h-52 w-full object-cover"
          />
        ) : (
          <div className="flex h-52 w-full items-center justify-center bg-black/30 text-white/40">
            No image
          </div>
        )}

        {live ? (
          <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-black">
            Live Now
          </span>
        ) : null}
      </div>

      <div className="p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {event.source_label}
        </p>

        <h3 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
          {event.name}
        </h3>

        <p className="mt-3 text-white/60">
          {[event.city, event.state].filter(Boolean).join(', ') ||
            event.venue_name ||
            'Location TBA'}
        </p>

        {event.event_start_at ? (
          <p className="mt-2 text-sm text-white/50">
            {new Date(event.event_start_at).toLocaleString()}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {event.genre ? <Pill label={event.genre} /> : null}
          {event.classification ? <Pill label={event.classification} /> : null}
          {event.venue_name ? <Pill label={event.venue_name} /> : null}
        </div>

        {event.description ? (
          <p className="mt-4 line-clamp-3 text-sm text-white/65">
            {event.description}
          </p>
        ) : null}

        <p className="mt-6 text-sm font-medium text-accent">Open event →</p>
      </div>
    </Link>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">
      {label}
    </span>
  );
}