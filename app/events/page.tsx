import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { expandCitySearch } from '@/lib/city-aliases';
import { US_STATES, normalizeState } from '@/lib/states';
import TrackView from '@/components/analytics/TrackView';

type Props = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    state?: string;
  }>;
};

const ALL_PREVIEW_LIMIT = 18;

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

  const allPreviewEvents = cards.slice(0, ALL_PREVIEW_LIMIT);
  const hasActiveFilters = Boolean(search || city || state);

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
          Search live, starting-soon, tonight, weekend, and upcoming events
          across active HypeKnight cities.
        </p>

        <div className="sticky top-2 z-20 mt-6 rounded-[1.5rem] border border-white/10 bg-black/70 p-3 backdrop-blur sm:static sm:mt-8 sm:bg-black/30 sm:p-0 sm:backdrop-blur-0 sm:border-0">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_180px_140px]">
            <input
              name="q"
              defaultValue={query.q || ''}
              placeholder="Music, venue, vibe..."
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />

            <input
              name="city"
              defaultValue={query.city || ''}
              placeholder="City or nickname..."
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
              className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 sm:col-span-2 lg:col-span-1"
            >
              Search
            </button>
          </form>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4">
            <Link href="/events" className="text-sm text-white/55 hover:text-accent">
              Clear filters
            </Link>
          </div>
        ) : null}

        {cityCounts.length ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/20 p-4 sm:mt-8 sm:p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45 sm:text-sm">
              Cities with active events
            </p>

            <div className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
              {cityCounts.map((item) => (
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

        <div className="mt-6 grid grid-cols-3 gap-3 sm:mt-8 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label="Live" value={String(liveEvents.length)} href="#live" />
          <Metric label="Soon" value={String(startingSoonEvents.length)} href="#soon" />
          <Metric label="Tonight" value={String(tonightEvents.length)} href="#tonight" />
          <Metric label="Tomorrow" value={String(tomorrowEvents.length)} href="#tomorrow" />
          <Metric label="Weekend" value={String(weekendEvents.length)} href="#weekend" />
          <Metric label="All" value={String(cards.length)} href="#all" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <JumpChip href="#live" label="Live Now" count={liveEvents.length} />
        <JumpChip href="#soon" label="Starting Soon" count={startingSoonEvents.length} />
        <JumpChip href="#tonight" label="Tonight" count={tonightEvents.length} />
        <JumpChip href="#weekend" label="Weekend" count={weekendEvents.length} />
      </section>

      <EventRail
        id="live"
        eyebrow="Here & Now"
        title="Live right now"
        text="Currently happening based on each event city's local time."
        events={liveEvents}
        emptyText="Nothing is live right now."
      />

      <EventRail
        id="soon"
        eyebrow="Next Up"
        title="Starting soon"
        text="Events starting in the next 3 hours."
        events={startingSoonEvents}
        emptyText="No events are starting soon right now."
      />

      <EventRail
        id="tonight"
        eyebrow="Tonight"
        title="Tonight’s events"
        text="Events scheduled for today and tonight."
        events={tonightEvents}
        emptyText="No events are showing for tonight."
      />

      <EventRail
        id="fresh"
        eyebrow="Fresh"
        title="Recently added"
        text="New listings added into discovery."
        events={recentlyAddedEvents}
        emptyText="No recently added events yet."
      />

      <EventRail
        id="weekend"
        eyebrow="Weekend"
        title="This weekend"
        text="Friday through Sunday events."
        events={weekendEvents}
        emptyText="No weekend events are showing yet."
      />

      <EventRail
        id="tomorrow"
        eyebrow="Tomorrow"
        title="Tomorrow’s move"
        text="Events happening tomorrow."
        events={tomorrowEvents}
        emptyText="No events are showing for tomorrow."
      />

      <EventRail
        id="week"
        eyebrow="This Week"
        title="Coming up this week"
        text="Events after tomorrow through the next 7 days."
        events={thisWeekEvents}
        emptyText="No events are showing for this week."
      />

      <EventRail
        id="next-week"
        eyebrow="Next Week"
        title="Next week’s lineup"
        text="Events scheduled 7 to 14 days out."
        events={nextWeekEvents}
        emptyText="No events are showing for next week."
      />

      <section id="all" className="scroll-mt-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              All
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
              All discoverable events
            </h2>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              Showing {allPreviewEvents.length} of {cards.length} events to keep browsing quick.
            </p>
          </div>

          {cards.length > ALL_PREVIEW_LIMIT ? (
            <a
              href="#top"
              className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
            >
              Refine Search
            </a>
          ) : null}
        </div>

        {allPreviewEvents.length ? (
          <div className="mt-5 grid gap-4 sm:mt-8 md:grid-cols-2 xl:grid-cols-3">
            {allPreviewEvents.map((event) => (
              <EventCard key={`${event.source_label}-${event.id}`} event={event} />
            ))}
          </div>
        ) : (
          <Empty text="No events match your search." />
        )}

        {cards.length > ALL_PREVIEW_LIMIT ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 text-center text-sm text-white/65 sm:rounded-[2rem] sm:p-8">
            Too many results? Search by city, music, venue, or state to narrow
            the list.
          </div>
        ) : null}
      </section>
    </section>
    </>
  );
}

function JumpChip({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count: number;
}) {
  return (
    <a
      href={href}
      className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4 text-center hover:border-accent/40"
    >
      <p className="text-2xl font-black text-white">{count}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/50">
        {label}
      </p>
    </a>
  );
}

function EventRail({
  id,
  eyebrow,
  title,
  text,
  events,
  emptyText,
}: {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  events: any[];
  emptyText: string;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-sm text-white/70 sm:text-base">{text}</p>
        </div>

          {events.length ? (
            <p className="text-sm text-white/45">
              {events.length} showing • Swipe to browse →
            </p>
          ) : null}
      </div>

      {events.length ? (
  <div className="relative">
    <div className="-mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={`${event.source_label}-${event.id}`}
          event={event}
          compact
        />
      ))}
    </div>

    {/* Mobile scroll hint */}
    <div className="pointer-events-none absolute right-0 top-5 h-[calc(100%-1.25rem)] w-12 bg-gradient-to-l from-black to-transparent sm:hidden" />
  </div>
) : (
  <Empty text={emptyText} />
)}
      
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 text-sm text-white/60 sm:mt-8 sm:rounded-[2rem] sm:p-8">
      {text}
    </div>
  );
}

function Metric({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a href={href} className="rounded-2xl border border-white/10 bg-black/20 p-3 hover:border-accent/40 sm:p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 sm:text-xs">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white sm:text-3xl">{value}</p>
    </a>
  );
}

function EventCard({ event, compact = false }: { event: any; compact?: boolean }) {
  const live = isLiveNow(event);

  return (
    <Link
      href={event.href}
      className={`group block shrink-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 transition hover:border-accent/40 hover:bg-white/[0.07] sm:shrink ${
        compact ? 'w-[78vw] sm:w-auto' : ''
      }`}
    >
      <div className="relative">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.name}
            className="h-40 w-full object-cover sm:h-52"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-black/30 text-white/40 sm:h-52">
            No image
          </div>
        )}

        {live ? (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
            Live
          </span>
        ) : null}
      </div>

      <div className="p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent sm:text-xs">
          {event.source_label}
        </p>

        <h3 className="mt-3 text-xl font-black leading-tight text-white group-hover:text-accent sm:text-2xl">
          {event.name}
        </h3>

        <p className="mt-3 text-sm text-white/60">
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
        </div>

        {event.description ? (
          <p className="mt-4 line-clamp-2 text-sm text-white/65">
            {event.description}
          </p>
        ) : null}

        <p className="mt-5 text-sm font-semibold text-accent">Open event →</p>
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

/* keep all your existing helper functions below this line */

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

function getTimeZoneForEvent(event: any) {
  const city = String(event.city || '').toLowerCase();
  const state = normalizeState(Stri