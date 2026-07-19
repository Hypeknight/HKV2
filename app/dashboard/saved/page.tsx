import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

type EventSummary = {
  id: string;
  slug: string | null;
  name: string | null;
  flyer_url: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  status: string | null;
  is_public: boolean | null;
};

type SavedRow = {
  id: string;
  created_at: string;
  event: EventSummary | EventSummary[] | null;
};

type RecentRow = {
  id: string;
  first_viewed_at: string;
  last_viewed_at: string;
  view_count: number;
  event: EventSummary | EventSummary[] | null;
};

type RsvpRow = {
  event_id: string;
  status: string;
};

export default async function SavedEventsPage({
  searchParams,
}: Props) {
  const query = searchParams ? await searchParams : {};
  const tab =
    query.tab === 'recent'
      ? 'recent'
      : 'saved';

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

  const [
    { data: savedRows, error: savedError },
    { data: recentRows, error: recentError },
    { data: rsvpRows, error: rsvpError },
  ] = await Promise.all([
    supabase
      .from('event_saves')
      .select(`
        id,
        created_at,
        event:events(
          id,
          slug,
          name,
          flyer_url,
          venue_name,
          city,
          state,
          event_start_at,
          event_end_at,
          status,
          is_public
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('event_recent_views')
      .select(`
        id,
        first_viewed_at,
        last_viewed_at,
        view_count,
        event:events(
          id,
          slug,
          name,
          flyer_url,
          venue_name,
          city,
          state,
          event_start_at,
          event_end_at,
          status,
          is_public
        )
      `)
      .eq('user_id', user.id)
      .order('last_viewed_at', { ascending: false })
      .limit(100),

    supabase
      .from('event_rsvps')
      .select('event_id, status')
      .eq('user_id', user.id),
  ]);

  if (savedError) {
    throw new Error(savedError.message);
  }

  if (recentError) {
    throw new Error(recentError.message);
  }

  if (rsvpError) {
    throw new Error(rsvpError.message);
  }

  const rsvpByEvent = new Map(
    ((rsvpRows || []) as RsvpRow[]).map(
      (row) => [row.event_id, row.status]
    )
  );

  const savedEvents = (
    (savedRows || []) as SavedRow[]
  )
    .map((row) => ({
      savedAt: row.created_at,
      event: normalizeEvent(row.event),
    }))
    .filter(
      (item): item is {
        savedAt: string;
        event: EventSummary;
      } => Boolean(item.event)
    );

  const recentEvents = (
    (recentRows || []) as RecentRow[]
  )
    .map((row) => ({
      firstViewedAt: row.first_viewed_at,
      lastViewedAt: row.last_viewed_at,
      viewCount: row.view_count,
      event: normalizeEvent(row.event),
    }))
    .filter(
      (item): item is {
        firstViewedAt: string;
        lastViewedAt: string;
        viewCount: number;
        event: EventSummary;
      } => Boolean(item.event)
    );

  const visibleSaved = savedEvents.filter(
    (item) => canOpenEvent(item.event)
  );

  const visibleRecent = recentEvents.filter(
    (item) => canOpenEvent(item.event)
  );

  return (
    <section className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Dashboard
        </Link>

        <Link
          href="/events"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
        >
          Browse Events
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            My HypeKnight
          </p>

          <h1 className="mt-3 max-w-5xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
            Your saved nights and recent moves.
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Keep track of events you saved, revisit recently viewed listings,
            and see whether you marked yourself interested or going.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Metric
              label="Saved Events"
              value={visibleSaved.length}
              text="Events currently saved to your account."
            />

            <Metric
              label="Recently Viewed"
              value={visibleRecent.length}
              text="Recent public event pages you opened."
            />

            <Metric
              label="RSVPs"
              value={rsvpByEvent.size}
              text="Events marked interested or going."
            />
          </div>
        </div>
      </section>

      <nav className="flex gap-3 overflow-x-auto rounded-[2rem] border border-white/10 bg-white/5 p-3">
        <TabLink
          href="/dashboard/saved"
          label="Saved Events"
          active={tab === 'saved'}
          count={visibleSaved.length}
        />

        <TabLink
          href="/dashboard/saved?tab=recent"
          label="Recently Viewed"
          active={tab === 'recent'}
          count={visibleRecent.length}
        />
      </nav>

      {tab === 'saved' ? (
        <section>
          <SectionTitle
            eyebrow="Saved"
            title="Events on your radar"
            text="Open an event, review your RSVP, or return to discovery."
          />

          {visibleSaved.length ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleSaved.map((item) => (
                <EventCard
                  key={item.event.id}
                  event={item.event}
                  rsvpStatus={
                    rsvpByEvent.get(item.event.id) || null
                  }
                  footer={`Saved ${formatRelativeDate(
                    item.savedAt
                  )}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No saved events yet"
              text="Save an event from its public page and it will appear here."
            />
          )}
        </section>
      ) : (
        <section>
          <SectionTitle
            eyebrow="Recently Viewed"
            title="Continue exploring"
            text="Return to public events you recently opened."
          />

          {visibleRecent.length ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleRecent.map((item) => (
                <EventCard
                  key={item.event.id}
                  event={item.event}
                  rsvpStatus={
                    rsvpByEvent.get(item.event.id) || null
                  }
                  footer={`Viewed ${
                    item.viewCount
                  } time${
                    item.viewCount === 1 ? '' : 's'
                  } · ${formatRelativeDate(
                    item.lastViewedAt
                  )}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recent events yet"
              text="Public events you open while signed in will appear here."
            />
          )}
        </section>
      )}
    </section>
  );
}

function EventCard({
  event,
  rsvpStatus,
  footer,
}: {
  event: EventSummary;
  rsvpStatus: string | null;
  footer: string;
}) {
  const href = event.slug
    ? `/events/${event.slug}`
    : '/events';

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
      <Link href={href} className="block">
        {event.flyer_url ? (
          <img
            src={event.flyer_url}
            alt={event.name || 'Event flyer'}
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-64 items-center justify-center bg-black/30 text-white/35">
            No event image
          </div>
        )}
      </Link>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <StatusChip
            label={formatLabel(
              event.status || 'scheduled'
            )}
          />

          {rsvpStatus ? (
            <StatusChip
              label={
                rsvpStatus === 'going'
                  ? 'Going'
                  : rsvpStatus === 'interested'
                    ? 'Interested'
                    : formatLabel(rsvpStatus)
              }
              accent
            />
          ) : null}
        </div>

        <Link href={href}>
          <h2 className="mt-4 text-2xl font-black text-white hover:text-accent">
            {event.name || 'Untitled Event'}
          </h2>
        </Link>

        <p className="mt-2 text-sm text-white/55">
          {event.venue_name || 'Venue TBA'}
        </p>

        <p className="mt-1 text-sm text-white/45">
          {[event.city, event.state]
            .filter(Boolean)
            .join(', ') || 'Location TBA'}
        </p>

        <p className="mt-4 font-semibold text-white/75">
          {formatEventDate(event.event_start_at)}
        </p>

        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/35">
          {footer}
        </p>

        <Link
          href={href}
          className="mt-5 block rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
        >
          Open Event
        </Link>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  text,
}: {
  label: string;
  value: number;
  text: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-white/55">
        {text}
      </p>
    </div>
  );
}

function TabLink({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-2xl px-5 py-3 font-semibold ${
        active
          ? 'bg-accent text-black'
          : 'border border-white/10 bg-black/20 text-white/65 hover:border-accent/40'
      }`}
    >
      {label} ({count})
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

      <p className="mt-2 text-sm leading-6 text-white/55">
        {text}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <h3 className="text-xl font-black text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-white/55">
        {text}
      </p>

      <Link
        href="/events"
        className="mt-5 inline-flex rounded-2xl bg-accent px-5 py-3 font-semibold text-black"
      >
        Browse Events
      </Link>
    </div>
  );
}

function StatusChip({
  label,
  accent = false,
}: {
  label: string;
  accent?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        accent
          ? 'border-accent/30 bg-accent/10 text-accent'
          : 'border-white/10 bg-white/5 text-white/60'
      }`}
    >
      {label}
    </span>
  );
}

function normalizeEvent(
  value: EventSummary | EventSummary[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function canOpenEvent(event: EventSummary) {
  return (
    Boolean(event.slug) &&
    event.is_public === true &&
    ['scheduled', 'active', 'live'].includes(
      event.status || ''
    )
  );
}

function formatEventDate(value?: string | null) {
  if (!value) {
    return 'Date TBA';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date TBA';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'recently';
  }

  const difference =
    Date.now() - date.getTime();

  const days = Math.floor(
    difference / 86_400_000
  );

  if (days < 1) {
    return 'today';
  }

  if (days === 1) {
    return 'yesterday';
  }

  return `${days} days ago`;
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}