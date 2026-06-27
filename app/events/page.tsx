/*
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function EventsPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: events, error } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('status', 'active')
    .eq('is_public', true)
    .is('removed_at', null)
    .gte('event_start_at', now)
    .order('event_start_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <section className="space-y-10">
      <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Events</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Active Events on HypeKnight</h1>
        <p className="mt-4 max-w-3xl text-white/70">
          Browse events that are approved, public, and currently active inside their HypeKnight visibility window.
        </p>
      </div>

      {events?.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="group block rounded-[2rem] border border-white/10 bg-white/5 p-6 hover:border-accent/40 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-accent">Event</p>
                  <h2 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
                    {event.name}
                  </h2>
                </div>

                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/60">
                  {event.status}
                </div>
              </div>

              <p className="mt-4 text-white/65">
                {event.city}, {event.state}
              </p>

              <p className="mt-2 text-sm text-white/55">
                {event.event_start_at
                  ? new Date(event.event_start_at).toLocaleString()
                  : 'Date pending'}
              </p>

              {event.description ? (
                <p className="mt-4 line-clamp-3 text-sm text-white/70">{event.description}</p>
              ) : (
                <p className="mt-4 text-sm text-white/45">No description added yet.</p>
              )}

              <div className="mt-6 text-sm font-medium text-accent">Open event →</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          No active events are available right now.
        </div>
      )}
    </section>
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
  startOfWeekend.setDate(startOfWeekend.getDate() + ((5 - startOfWeekend.getDay() + 7) % 7));

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
      state: event.state || event.venue?.state,
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
      state: event.state,
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

    const searchTerms = search ? expandCitySearch(search) : [];

    const matchesSearch = search
      ? haystack.includes(search) ||
        searchTerms.some((term) =>
          haystack.includes(term.toLowerCase())
        )
      : true;

    const matchesCity = cityTerms.length
      ? cityTerms.some((term) =>
          eventCity.includes(term.toLowerCase()) ||
          term.toLowerCase().includes(eventCity)
        )
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
            placeholder="Search music, venues, vibes..."
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
      <div className="max-w