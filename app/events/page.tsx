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
  const serverNow = new Date();
  const fourHoursAgo = new Date(serverNow.getTime() - 4 * 60 * 60 * 1000);

  const { data: hypeEvents, error: hypeError } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .in('status', ['scheduled', 'active'])
    .eq('is_public', true)
    .is('removed_at', null)
    .lte('promotion_start_at', serverNow.toISOString())
    .gte('promotion_end_at', serverNow.toISOString())
    .order('event_start_at', { ascending: true });

  if (hypeError) throw new Error(hypeError.message);

  const { data: externalEvents, error: externalError } = await supabase
    .from('external_events')
    .select('*')
    .eq('status', 'active')
    .not('event_start_at', 'is', null)
    .or(
      `event_end_at.gte.${serverNow.toISOString()},and(event_end_at.is.null,event_start_at.gte.${fourHoursAgo.toISOString()})`
    )
    .order('event_start_at', { ascending: true });

  if (externalError) throw new Error(externalError.message);

  const allCards = [
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
  ].sort(sortByStartTime);

  const cityCounts = buildCityCounts(allCards);

  let cards = allCards.filter((event) => {
    const eventCity = String(event.city || '').toLowerCase();
    const eventState = normalizeState(String(event.state || ''));
    const expandedEventCityTerms = expandCitySearch(eventCity);

    const haystack = [
      event.name,
      event.city,
      event.state,
      ...expandedEventCityTerms,
      event.description,
      event.venue_name,
      event.genre,
      event.classification,
      event.source_label,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = search
      ? haystack.includes(search) ||
        searchTerms.some((term) => haystack.includes(term.toLowerCase()))
      : true;

    const matchesCity = cityTerms.length
      ? cityTerms.some((term) => {
          const cleanTerm = term.toLowerCase();
          return eventCity.includes(cleanTerm) || cleanTerm.includes(eventCity);
        })
      : true;

    const matchesState = state ? eventState === state : true;

    return matchesSearch && matchesCity && matchesState;
  });

  cards = cards.sort(sortByStartTime);

  const liveEvents = cards.filter((event) => isLiveNow(event));
  const startingSoonEvents = cards.filter((event) => isStartingSoon(event));
  const tonightEvents = cards.filter((event) => isTodayInEventTime(event));
  const tomorrowEvents = cards.filter((event) => isTomorrowInEventTime(event));
  const weekendEvents = cards.filter((event) => isWeekendInEventTime(event));
  const thisWeekEvents = cards.filter((event) => isThisWeekInEventTime(event));
  const nextWeekEvents = cards.filter((event) => isNextWeekInEventTime(event));

  const recentlyAddedEvents = [...cards]
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 8);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10 lg:px-8">
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

        {cityCounts.length ? (
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-black/20 p-5">
            <p className="text-sm uppercase tracking-[0.25em] text-white/45">
              Cities with active events
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {cityCounts.map((item) => (
                <Link
                  key={`${item.city}-${item.state}`}
                  href={`/events?city=${encodeURIComponent(item.city)}&state=${encodeURIComponent(item.state)}`}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:border-accent/40 hover:text-accent"
                >
                  {item.city}, {item.state}
                  <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-black">
                    {item.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 xl:grid-cols-6">
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
        text="Events currently happening based on the event city's local time."
        events={liveEvents}
        featured
        emptyText="Nothing is live right now."
      />

      <EventSection
        eyebrow="Next Up"
        title="Starting soon"
        text="Events starting in the next 3 hours based on the event city's local time."
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

function buildCityCounts(events: any[]) {
  const map = new Map<string, { city: string; state: string; count: number }>();

  for (const event of events) {
    const city = String(event.city || '').trim();
    const state = normalizeState(String(event.state || ''));

    if (!city || !state) continue;

    const key = `${city.toLowerCase()}-${state}`;

    const existing = map.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { city, state, count: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function getTimeZoneForEvent(event: any) {
  const city = String(event.city || '').toLowerCase();
  const state = normalizeState(String(event.state || ''));

  if (state === 'MO' || state === 'KS' || state === 'IL' || state === 'TX') {
    return 'America/Chicago';
  }

  if (state === 'NY' || state === 'GA' || state === 'FL') {
    return 'America/New_York';
  }

  if (state === 'NV') {
    return 'America/Los_Angeles';
  }

  if (state === 'CA') {
    return 'America/Los_Angeles';
  }

  if (city.includes('denver')) {
    return 'America/Denver';
  }

  return 'America/Chicago';
}

function getZonedNow(timeZone: string) {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone,
    })
  );
}

function getZonedDate(value: string | null | undefined, timeZone: string) {
  if (!value) return null;

  return new Date(
    new Date(value).toLocaleString('en-US', {
      timeZone,
    })
  );
}

function getEventWindow(event: any) {
  const timeZone = getTimeZoneForEvent(event);
  const now = getZonedNow(timeZone);
  const start = getZonedDate(event.event_start_at, timeZone);

  if (!start) return null;

  const end =
    getZonedDate(event.event_end_at, timeZone) ||
    new Date(start.getTime() + 4 * 60 * 60 * 1000);

  return { timeZone, now, start, end };
}

function isLiveNow(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;

  return window.now >= window.start && window.now <= window.end;
}

function isStartingSoon(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;

  const nextThreeHours = new Date(window.now.getTime() + 3 * 60 * 60 * 1000);

  return window.start > window.now && window.start <= nextThreeHours;
}

function startOfZonedToday(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameWindow(value: string | null | undefined, event: any, start: Date, end: Date) {
  const timeZone = getTimeZoneForEvent(event);
  const date = getZonedDate(value, timeZone);

  if (!date) return false;

  return date >= start && date < end;
}

function isTodayInEventTime(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;

  const start = startOfZonedToday(window.now);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return isSameWindow(event.event_start_at, event, start, end);
}

function isTomorrowInEventTime(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;

  const start = startOfZonedToday(window.now);
  start.setDate(start.getDate() + 1);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return isSameWindow(event.event_start_at, event, start, end);
}

function isWeekendInEventTime(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;

  const start = startOfZonedToday(window.now);
  start.setDate(start.getDate() + ((5 - start.getDay() + 7) % 7));

  const end = new Date(start);
  end.setDate(end.getDate() + 3);

  return isSameWindow(event.event_start_at, event, start, end);
}

function isThisWeekInEventTime(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;

  const start = startOfZonedToday(window.now);
  start.setDate(start.getDate() + 2);

  const end = startOfZonedToday(window.now);
  end.setDate(end.getDate() + 7);

  return isSameWindow(event.event_start_at, event, start, end);
}

function isNextWeekInEventTime(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;

  const start = startOfZonedToday(window.now);
  start.setDate(start.getDate() + 7);

  const end = startOfZonedToday(window.now);
  end.setDate(end.getDate() + 14);

  return isSameWindow(event.event_start_at, event, start, end);
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

function formatEventTime(event: any) {
  if (!event.event_start_at) return null;

  const timeZone = getTimeZoneForEvent(event);

  return new Date(event.event_start_at).toLocaleString('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">{value}</p>
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
        <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">{title}</h2>
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
  const live = isLiveNow(event);

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
            className="h-44 w-full object-cover sm:h-52"
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

      <div className="p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {event.source_label}
        </p>

        <h3 className="mt-3 text-xl font-bold leading-tight text-white group-hover:text-accent sm:text-2xl">
          {event.name}
        </h3>

        <p className="mt-3 text-white/60">
          {[event.city, event.state].filter(Boolean).join(', ') ||
            event.venue_name ||
            'Location TBA'}
        </p>

        {event.event_start_at ? (
          <p className="mt-2 text-sm text-white/50">
            {formatEventTime(event)}
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