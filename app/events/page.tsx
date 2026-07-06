import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { expandCitySearch } from '@/lib/city-aliases';
import { US_STATES, normalizeState } from '@/lib/states';
import TrackView from '@/components/analytics/TrackView';
import {
  EmptyState,
  EventCard,
  EventRail,
  MetricCard,
  SectionHeader,
} from '@/components/ui';

type Props = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    state?: string;
    vibe?: string;
    when?: string;
    source?: string;
  }>;
};

const ALL_PREVIEW_LIMIT = 24;

const VIBES = [
  { label: 'Music', value: 'music', terms: ['music', 'concert', 'live music', 'rock', 'jazz', 'blues'] },
  { label: 'Country', value: 'country', terms: ['country'] },
  { label: 'Hip-Hop', value: 'hip-hop', terms: ['hip-hop', 'hip hop', 'rap'] },
  { label: 'Sports', value: 'sports', terms: ['sports', 'soccer', 'football', 'baseball', 'basketball'] },
  { label: 'Theater', value: 'theater', terms: ['theater', 'arts', 'broadway'] },
  { label: 'Festivals', value: 'festivals', terms: ['festival', 'fair', 'fairs'] },
  { label: 'Comedy', value: 'comedy', terms: ['comedy'] },
  { label: 'Family', value: 'family', terms: ['family', 'kids'] },
];

export default async function EventsPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};

  const search = String(query.q || '').trim().toLowerCase();
  const city = String(query.city || '').trim().toLowerCase();
  const state = normalizeState(String(query.state || ''));
  const vibe = String(query.vibe || '').trim().toLowerCase();
  const when = String(query.when || '').trim().toLowerCase();
  const source = String(query.source || '').trim().toLowerCase();

  const cityTerms = city ? expandCitySearch(city) : [];
  const searchTerms = search ? expandCitySearch(search) : [];
  const selectedVibe = VIBES.find((item) => item.value === vibe);

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
      source: 'hypeknight',
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
      source: 'external',
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

    const haystack = [
      event.name,
      event.city,
      event.state,
      ...expandCitySearch(eventCity),
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

    const matchesVibe = selectedVibe
      ? selectedVibe.terms.some((term) => haystack.includes(term.toLowerCase()))
      : true;

    const matchesSource =
      source === 'hypeknight'
        ? !event.is_external
        : source === 'external'
        ? event.is_external
        : true;

    return matchesSearch && matchesCity && matchesState && matchesVibe && matchesSource;
  });

  cards = cards.sort(sortByStartTime);

  const liveEvents = cards.filter(isLiveNow);
  const startingSoonEvents = cards.filter(isStartingSoon);
  const tonightEvents = cards.filter(isTodayInEventTime);
  const tomorrowEvents = cards.filter(isTomorrowInEventTime);
  const weekendEvents = cards.filter(isWeekendInEventTime);
  const thisWeekEvents = cards.filter(isThisWeekInEventTime);
  const nextWeekEvents = cards.filter(isNextWeekInEventTime);

  const recentlyAddedEvents = [...cards]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 8);

  if (when === 'live') cards = liveEvents;
  if (when === 'soon') cards = startingSoonEvents;
  if (when === 'tonight') cards = tonightEvents;
  if (when === 'tomorrow') cards = tomorrowEvents;
  if (when === 'weekend') cards = weekendEvents;
  if (when === 'week') cards = thisWeekEvents;

  const allPreviewEvents = cards.slice(0, ALL_PREVIEW_LIMIT);
  const hasActiveFilters = Boolean(search || city || state || vibe || when || source);

  return (
    <>
      <TrackView
        pageType="events_index"
        path="/events"
        city={query.city || null}
        state={query.state || null}
      />

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[2.75rem] sm:p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            Event Discovery
          </p>

          <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Find your next move.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Search by city, state, vibe, time window, source, music, venue, or event name.
          </p>

          <div className="sticky top-2 z-20 mt-6 rounded-[1.5rem] border border-white/10 bg-black/80 p-3 backdrop-blur sm:static sm:mt-8 sm:bg-black/30 sm:p-5">
            <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_160px_160px_160px_140px]">
              <input
                name="q"
                defaultValue={query.q || ''}
                placeholder="Music, venue, vibe..."
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />

              <input
                name="city"
                defaultValue={query.city || ''}
                placeholder="City / nickname"
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

              <select
                name="vibe"
                defaultValue={vibe}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent/50"
              >
                <option value="">All Vibes</option>
                {VIBES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                name="when"
                defaultValue={when}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent/50"
              >
                <option value="">Any Time</option>
                <option value="live">Live Now</option>
                <option value="soon">Starting Soon</option>
                <option value="tonight">Tonight</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="weekend">Weekend</option>
                <option value="week">This Week</option>
              </select>

              <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 sm:col-span-2 xl:col-span-1">
                Search
              </button>

              <select
                name="source"
                defaultValue={source}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent/50 sm:col-span-2 xl:col-span-1"
              >
                <option value="">All Sources</option>
                <option value="hypeknight">HypeKnight</option>
                <option value="external">External</option>
              </select>
            </form>

            {hasActiveFilters ? (
              <Link href="/events" className="mt-4 inline-flex text-sm text-white/55 hover:text-accent">
                Clear filters
              </Link>
            ) : null}
          </div>

          {cityCounts.length ? (
            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/20 p-4 sm:mt-8 sm:p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-white/45 sm:text-sm">
                Cities with active events
              </p>

              <div className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
                {cityCounts.slice(0, 20).map((item) => (
                  <Link
                    key={`${item.city}-${item.state}`}
                    href={`/events?city=${encodeURIComponent(item.city)}&state=${encodeURIComponent(item.state)}`}
                    className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:border-accent/40 hover:text-accent"
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

          <div className="mt-6 grid grid-cols-3 gap-3 sm:mt-8 xl:grid-cols-6">
            <MetricCard label="Live" value={liveEvents.length} href="/events?when=live" />
            <MetricCard label="Soon" value={startingSoonEvents.length} href="/events?when=soon" />
            <MetricCard label="Tonight" value={tonightEvents.length} href="/events?when=tonight" />
            <MetricCard label="Tomorrow" value={tomorrowEvents.length} href="/events?when=tomorrow" />
            <MetricCard label="Weekend" value={weekendEvents.length} href="/events?when=weekend" />
            <MetricCard label="All" value={cards.length} href="#all" accent />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickChip href="/events?when=live" label="Live Now" count={liveEvents.length} />
          <QuickChip href="/events?when=soon" label="Starting Soon" count={startingSoonEvents.length} />
          <QuickChip href="/events?when=tonight" label="Tonight" count={tonightEvents.length} />
          <QuickChip href="/events?when=weekend" label="Weekend" count={weekendEvents.length} />
        </section>

        <EventRail id="live" eyebrow="Here & Now" title="Live right now" text="Events currently happening." events={liveEvents} />
        <EventRail id="soon" eyebrow="Next Up" title="Starting soon" text="Events starting in the next 3 hours." events={startingSoonEvents} />
        <EventRail id="tonight" eyebrow="Tonight" title="Tonight’s events" text="Events scheduled for today and tonight." events={tonightEvents} />
        <EventRail id="fresh" eyebrow="Fresh" title="Recently added" text="New listings added into discovery." events={recentlyAddedEvents} />
        <EventRail id="weekend" eyebrow="Weekend" title="This weekend" text="Friday through Sunday events." events={weekendEvents} />
        <EventRail id="tomorrow" eyebrow="Tomorrow" title="Tomorrow’s move" text="Events happening tomorrow." events={tomorrowEvents} />
        <EventRail id="week" eyebrow="This Week" title="Coming up this week" text="Events after tomorrow through the next 7 days." events={thisWeekEvents} />
        <EventRail id="next-week" eyebrow="Next Week" title="Next week’s lineup" text="Events scheduled 7 to 14 days out." events={nextWeekEvents} />

        <section id="all" className="scroll-mt-24">
          <SectionHeader
            eyebrow="All"
            title="All discoverable events"
            text={`Showing ${allPreviewEvents.length} of ${cards.length} events. Use filters to narrow the list.`}
          />

          {allPreviewEvents.length ? (
            <div className="mt-5 grid gap-4 sm:mt-8 md:grid-cols-2 xl:grid-cols-3">
              {allPreviewEvents.map((event) => (
                <EventCard key={`${event.source_label}-${event.id}`} event={event} />
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState text="No events match your search." />
            </div>
          )}
        </section>
      </section>
    </>
  );
}

function QuickChip({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4 text-center hover:border-accent/40"
    >
      <p className="text-2xl font-black text-white">{count}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/50">
        {label}
      </p>
    </Link>
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

    if (existing) existing.count += 1;
    else map.set(key, { city, state, count: 1 });
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function parseWallTime(value?: string | null) {
  if (!value) return null;

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (!match) return new Date(value);

  const [, year, month, day, hour, minute, second = '0'] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function getEventWindow(event: any) {
  const now = new Date();
  const start = parseWallTime(event.event_start_at);

  if (!start) return null;

  const end =
    parseWallTime(event.event_end_at) ||
    new Date(start.getTime() + 4 * 60 * 60 * 1000);

  return { now, start, end };
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

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameWindow(value: string | null | undefined, start: Date, end: Date) {
  const date = parseWallTime(value);
  if (!date) return false;
  return date >= start && date < end;
}

function isTodayInEventTime(event: any) {
  const start = startOfToday();
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return isSameWindow(event.event_start_at, start, end);
}

function isTomorrowInEventTime(event: any) {
  const start = startOfToday();
  start.setDate(start.getDate() + 1);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return isSameWindow(event.event_start_at, start, end);
}

function isWeekendInEventTime(event: any) {
  const start = startOfToday();
  start.setDate(start.getDate() + ((5 - start.getDay() + 7) % 7));

  const end = new Date(start);
  end.setDate(end.getDate() + 3);

  return isSameWindow(event.event_start_at, start, end);
}

function isThisWeekInEventTime(event: any) {
  const start = startOfToday();
  start.setDate(start.getDate() + 2);

  const end = startOfToday();
  end.setDate(end.getDate() + 7);

  return isSameWindow(event.event_start_at, start, end);
}

function isNextWeekInEventTime(event: any) {
  const start = startOfToday();
  start.setDate(start.getDate() + 7);

  const end = startOfToday();
  end.setDate(end.getDate() + 14);

  return isSameWindow(event.event_start_at, start, end);
}

function sortByStartTime(a: any, b: any) {
  const aTime = parseWallTime(a.event_start_at)?.getTime() ?? Infinity;
  const bTime = parseWallTime(b.event_start_at)?.getTime() ?? Infinity;

  return aTime - bTime;
}