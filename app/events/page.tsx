import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { expandCitySearch } from '@/lib/city-aliases';
import { getLookupMap, type LookupValue } from '@/lib/config/lookups';
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
    music?: string;
    event_type?: string;
    vibe?: string;
    amenity?: string;
    age?: string;
    when?: string;
    source?: string;
  }>;
};

type DiscoveryCard = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  event_start_at?: string | null;
  event_end_at?: string | null;
  image_url?: string | null;
  href: string;
  status?: string | null;
  source: 'hypeknight' | 'external';
  source_label: string;
  is_external: boolean;
  venue_name?: string | null;
  genre?: string | null;
  classification?: string | null;
  created_at?: string | null;
  music_selection: string[];
  vibe_tags: string[];
  amenities: string[];
  event_types: string[];
  age_requirement?: string | null;
};

const ALL_PREVIEW_LIMIT = 24;

export default async function EventsPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};

  const search = cleanLower(query.q);
  const city = cleanLower(query.city);
  const state = normalizeState(String(query.state || ''));
  const music = cleanLower(query.music);
  const eventType = cleanLower(query.event_type);
  const vibe = cleanLower(query.vibe);
  const amenity = cleanLower(query.amenity);
  const age = cleanLower(query.age);
  const when = cleanLower(query.when);
  const source = cleanLower(query.source);

  const cityTerms = city ? expandCitySearch(city) : [];
  const searchTerms = search ? expandCitySearch(search) : [];

  const supabase = await createClient();

  const [
    { data: hypeEvents, error: hypeError },
    { data: externalEvents, error: externalError },
    lookups,
  ] = await Promise.all([
    loadHypeKnightEvents(supabase),
    loadExternalEvents(supabase),
    getLookupMap([
      'music_genres',
      'event_types',
      'vibe_tags',
      'event_amenities',
      'age_requirements',
    ]),
  ]);

  if (hypeError) throw new Error(hypeError.message);
  if (externalError) throw new Error(externalError.message);

  const allCards: DiscoveryCard[] = [
    ...(hypeEvents ?? []).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city || event.venue?.city,
      state: normalizeState(
        String(event.state || event.venue?.state || '')
      ),
      description: event.description,
      event_start_at: event.event_start_at,
      event_end_at: event.event_end_at,
      image_url: event.flyer_url,
      href: `/events/${event.slug}`,
      status: event.status,
      source: 'hypeknight' as const,
      source_label: 'HypeKnight Event',
      is_external: false,
      venue_name: event.venue_name || event.venue?.name,
      genre: arrayValue(event.music_selection)[0] || null,
      classification: event.event_type,
      created_at: event.created_at,
      music_selection: arrayValue(event.music_selection),
      vibe_tags: arrayValue(event.vibe_tags),
      amenities: arrayValue(event.amenities),
      event_types: splitValue(event.event_type),
      age_requirement: event.age_requirement,
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
      source: 'external' as const,
      source_label:
        event.source_code === 'ticketmaster'
          ? 'Ticketmaster'
          : event.source_code || 'External Event',
      is_external: true,
      venue_name: event.venue_name,
      genre: event.genre,
      classification: event.classification || event.segment,
      created_at: event.created_at,
      music_selection: event.genre ? [String(event.genre)] : [],
      vibe_tags: [],
      amenities: [],
      event_types: [
        event.classification || event.segment,
      ].filter(Boolean),
      age_requirement: null,
    })),
  ].sort(sortByStartTime);

  const cityCounts = buildCityCounts(allCards);

  let cards = allCards.filter((event) => {
    const eventCity = cleanLower(event.city);
    const eventState = normalizeState(String(event.state || ''));

    const haystack = buildSearchHaystack(event);

    const matchesSearch = search
      ? haystack.includes(search) ||
        searchTerms.some((term) =>
          haystack.includes(String(term).toLowerCase())
        )
      : true;

    const matchesCity = cityTerms.length
      ? cityTerms.some((term) => {
          const cleanTerm = String(term).toLowerCase();

          return (
            eventCity.includes(cleanTerm) ||
            cleanTerm.includes(eventCity)
          );
        })
      : true;

    const matchesState = state ? eventState === state : true;

    const matchesMusic = music
      ? includesNormalized(event.music_selection, music) ||
        includesText(event.genre, music)
      : true;

    const matchesEventType = eventType
      ? includesNormalized(event.event_types, eventType) ||
        includesText(event.classification, eventType)
      : true;

    const matchesVibe = vibe
      ? includesNormalized(event.vibe_tags, vibe) ||
        haystack.includes(vibe)
      : true;

    const matchesAmenity = amenity
      ? includesNormalized(event.amenities, amenity) ||
        haystack.includes(amenity)
      : true;

    const matchesAge = age
      ? cleanLower(event.age_requirement) === age ||
        includesText(event.age_requirement, age)
      : true;

    const matchesSource =
      source === 'hypeknight'
        ? !event.is_external
        : source === 'external'
          ? event.is_external
          : true;

    return (
      matchesSearch &&
      matchesCity &&
      matchesState &&
      matchesMusic &&
      matchesEventType &&
      matchesVibe &&
      matchesAmenity &&
      matchesAge &&
      matchesSource
    );
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
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, 8);

  if (when === 'live') cards = liveEvents;
  if (when === 'soon') cards = startingSoonEvents;
  if (when === 'tonight') cards = tonightEvents;
  if (when === 'tomorrow') cards = tomorrowEvents;
  if (when === 'weekend') cards = weekendEvents;
  if (when === 'week') cards = thisWeekEvents;

  const allPreviewEvents = cards.slice(0, ALL_PREVIEW_LIMIT);

  const activeFilterCount = [
    search,
    city,
    state,
    music,
    eventType,
    vibe,
    amenity,
    age,
    when,
    source,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <>
      <TrackView
        pageType="events_index"
        path="/events"
        city={query.city || null}
        state={query.state || null}
      />

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10 lg:px-8">
        <DiscoveryHero
          query={query}
          state={state}
          music={music}
          eventType={eventType}
          vibe={vibe}
          amenity={amenity}
          age={age}
          when={when}
          source={source}
          lookups={lookups}
          activeFilterCount={activeFilterCount}
          hasActiveFilters={hasActiveFilters}
          counts={{
            live: liveEvents.length,
            soon: startingSoonEvents.length,
            tonight: tonightEvents.length,
            tomorrow: tomorrowEvents.length,
            weekend: weekendEvents.length,
            all: cards.length,
          }}
        />

        <QuickDiscovery
          eventTypes={lookups.event_types}
          musicGenres={lookups.music_genres}
        />

        {cityCounts.length ? (
          <CityRail cities={cityCounts} />
        ) : null}

        {hasActiveFilters ? (
          <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-accent">
                  Filtered Discovery
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  {cards.length} matching event
                  {cards.length === 1 ? '' : 's'}
                </h2>

                <p className="mt-2 text-sm text-white/60">
                  {activeFilterCount} filter
                  {activeFilterCount === 1 ? '' : 's'} applied.
                </p>
              </div>

              <Link
                href="/events"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-semibold text-white hover:border-accent/40"
              >
                Clear All Filters
              </Link>
            </div>
          </section>
        ) : null}

        {!when || when === 'live' ? (
          <EventRail
            id="live"
            eyebrow="Here & Now"
            title="Live right now"
            text="Events currently happening."
            events={liveEvents}
          />
        ) : null}

        {!when || when === 'soon' ? (
          <EventRail
            id="soon"
            eyebrow="Next Up"
            title="Starting soon"
            text="Events starting in the next three hours."
            events={startingSoonEvents}
          />
        ) : null}

        {!when || when === 'tonight' ? (
          <EventRail
            id="tonight"
            eyebrow="Tonight"
            title="Tonight’s events"
            text="Events scheduled for today and tonight."
            events={tonightEvents}
          />
        ) : null}

        {!hasActiveFilters ? (
          <EventRail
            id="fresh"
            eyebrow="Fresh"
            title="Recently added"
            text="New listings added into HypeKnight discovery."
            events={recentlyAddedEvents}
          />
        ) : null}

        {!when || when === 'weekend' ? (
          <EventRail
            id="weekend"
            eyebrow="Weekend"
            title="This weekend"
            text="Friday through Sunday events."
            events={weekendEvents}
          />
        ) : null}

        {!when || when === 'tomorrow' ? (
          <EventRail
            id="tomorrow"
            eyebrow="Tomorrow"
            title="Tomorrow’s move"
            text="Events happening tomorrow."
            events={tomorrowEvents}
          />
        ) : null}

        {!when || when === 'week' ? (
          <EventRail
            id="week"
            eyebrow="This Week"
            title="Coming up this week"
            text="Events after tomorrow through the next seven days."
            events={thisWeekEvents}
          />
        ) : null}

        {!hasActiveFilters ? (
          <EventRail
            id="next-week"
            eyebrow="Next Week"
            title="Next week’s lineup"
            text="Events scheduled seven to fourteen days out."
            events={nextWeekEvents}
          />
        ) : null}

        <section id="all" className="scroll-mt-24">
          <SectionHeader
            eyebrow={hasActiveFilters ? 'Results' : 'All Events'}
            title={
              hasActiveFilters
                ? 'Events matching your move'
                : 'All discoverable events'
            }
            text={`Showing ${allPreviewEvents.length} of ${cards.length} events. Use filters to narrow the list.`}
          />

          {allPreviewEvents.length ? (
            <div className="mt-5 grid gap-4 sm:mt-8 md:grid-cols-2 xl:grid-cols-3">
              {allPreviewEvents.map((event) => (
                <EventCard
                  key={`${event.source_label}-${event.id}`}
                  event={event}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState text="No events match your current filters. Try expanding your city, time, or category choices." />
            </div>
          )}
        </section>
      </section>
    </>
  );
}

function DiscoveryHero({
  query,
  state,
  music,
  eventType,
  vibe,
  amenity,
  age,
  when,
  source,
  lookups,
  activeFilterCount,
  hasActiveFilters,
  counts,
}: {
  query: Awaited<NonNullable<Props['searchParams']>>;
  state: string;
  music: string;
  eventType: string;
  vibe: string;
  amenity: string;
  age: string;
  when: string;
  source: string;
  lookups: Record<string, LookupValue[]>;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  counts: {
    live: number;
    soon: number;
    tonight: number;
    tomorrow: number;
    weekend: number;
    all: number;
  };
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

      <div className="relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-accent sm:text-sm">
              HypeKnight Discovery
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Find the night that fits you.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Search by city, sound, experience, energy, age, amenities,
              time, venue, or event name.
            </p>
          </div>

          <Link
            href="/promote"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3 font-semibold text-accent hover:bg-accent/15"
          >
            Promote an Event
          </Link>
        </div>

        <form className="mt-8 rounded-[1.75rem] border border-white/10 bg-black/40 p-4 backdrop-blur sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_170px_auto]">
            <FilterInput
              name="q"
              defaultValue={query.q || ''}
              placeholder="Event, venue, music, or keyword"
            />

            <FilterInput
              name="city"
              defaultValue={query.city || ''}
              placeholder="City or local nickname"
            />

            <select
              name="state"
              defaultValue={state}
              className={fieldClass}
            >
              <option value="">All States</option>
              {US_STATES.map(([abbr, name]) => (
                <option key={abbr} value={abbr}>
                  {name}
                </option>
              ))}
            </select>

            <button className="rounded-2xl bg-accent px-6 py-3 font-black text-black hover:opacity-90">
              Find Events
            </button>
          </div>

          <details
            className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03]"
            open={hasActiveFilters}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
              <span className="font-semibold text-white">
                More filters
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                {activeFilterCount} active
              </span>
            </summary>

            <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <LookupSelect
                name="music"
                label="Music"
                value={music}
                options={lookups.music_genres}
              />

              <LookupSelect
                name="event_type"
                label="Event Type"
                value={eventType}
                options={lookups.event_types}
              />

              <LookupSelect
                name="vibe"
                label="Vibe"
                value={vibe}
                options={lookups.vibe_tags}
              />

              <LookupSelect
                name="amenity"
                label="Amenity"
                value={amenity}
                options={lookups.event_amenities}
              />

              <LookupSelect
                name="age"
                label="Age"
                value={age}
                options={lookups.age_requirements}
              />

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  When
                </span>

                <select
                  name="when"
                  defaultValue={when}
                  className={fieldClass}
                >
                  <option value="">Any Time</option>
                  <option value="live">Live Now</option>
                  <option value="soon">Starting Soon</option>
                  <option value="tonight">Tonight</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="weekend">Weekend</option>
                  <option value="week">This Week</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Source
                </span>

                <select
                  name="source"
                  defaultValue={source}
                  className={fieldClass}
                >
                  <option value="">All Sources</option>
                  <option value="hypeknight">HypeKnight</option>
                  <option value="external">External</option>
                </select>
              </label>

              <div className="flex items-end">
                <button className="w-full rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3 font-semibold text-accent hover:bg-accent/15">
                  Apply Filters
                </button>
              </div>
            </div>
          </details>

          {hasActiveFilters ? (
            <Link
              href="/events"
              className="mt-4 inline-flex text-sm font-semibold text-white/55 hover:text-accent"
            >
              Clear all filters
            </Link>
          ) : null}
        </form>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:mt-8 xl:grid-cols-6">
          <MetricCard
            label="Live"
            value={counts.live}
            href="/events?when=live"
          />
          <MetricCard
            label="Soon"
            value={counts.soon}
            href="/events?when=soon"
          />
          <MetricCard
            label="Tonight"
            value={counts.tonight}
            href="/events?when=tonight"
          />
          <MetricCard
            label="Tomorrow"
            value={counts.tomorrow}
            href="/events?when=tomorrow"
          />
          <MetricCard
            label="Weekend"
            value={counts.weekend}
            href="/events?when=weekend"
          />
          <MetricCard
            label="All"
            value={counts.all}
            href="#all"
            accent
          />
        </div>
      </div>
    </section>
  );
}

function QuickDiscovery({
  eventTypes,
  musicGenres,
}: {
  eventTypes: LookupValue[];
  musicGenres: LookupValue[];
}) {
  const typeOptions = eventTypes.slice(0, 8);
  const musicOptions = musicGenres.slice(0, 8);

  if (!typeOptions.length && !musicOptions.length) return null;

  return (
    <section className="space-y-5">
      {typeOptions.length ? (
        <DiscoveryChipRail
          eyebrow="Choose an Experience"
          options={typeOptions}
          param="event_type"
        />
      ) : null}

      {musicOptions.length ? (
        <DiscoveryChipRail
          eyebrow="Choose Your Sound"
          options={musicOptions}
          param="music"
        />
      ) : null}
    </section>
  );
}

function DiscoveryChipRail({
  eyebrow,
  options,
  param,
}: {
  eyebrow: string;
  options: LookupValue[];
  param: string;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        {eyebrow}
      </p>

      <div className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2">
        {options.map((option) => (
          <Link
            key={option.id}
            href={`/events?${param}=${encodeURIComponent(option.value)}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-accent/40 hover:text-accent"
          >
            {option.icon ? <span>{option.icon}</span> : null}
            <span>{option.display_name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CityRail({
  cities,
}: {
  cities: Array<{ city: string; state: string; count: number }>;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        Active Cities
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        See where the night is moving.
      </h2>

      <div className="-mx-1 mt-5 flex gap-3 overflow-x-auto px-1 pb-2">
        {cities.slice(0, 20).map((item) => (
          <Link
            key={`${item.city}-${item.state}`}
            href={`/events?city=${encodeURIComponent(
              item.city
            )}&state=${encodeURIComponent(item.state)}`}
            className="shrink-0 rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/70 hover:border-accent/40 hover:text-accent"
          >
            {item.city}, {item.state}

            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-black text-black">
              {item.count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FilterInput({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <input
      name={name}
      defaultValue={defaultValue || ''}
      placeholder={placeholder}
      className={fieldClass}
    />
  );
}

function LookupSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: LookupValue[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>

      <select
        name={name}
        defaultValue={value}
        className={fieldClass}
      >
        <option value="">All {label}</option>

        {options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.icon ? `${option.icon} ` : ''}
            {option.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';

async function loadHypeKnightEvents(supabase: any) {
  const now = new Date().toISOString();

  return supabase
    .from('events')
    .select(`
      *,
      venue:venues(
        name,
        slug,
        city,
        state
      )
    `)
    .in('status', ['scheduled', 'active'])
    .eq('is_public', true)
    .is('removed_at', null)
    .lte('promotion_start_at', now)
    .gte('promotion_end_at', now)
    .order('event_start_at', { ascending: true });
}

async function loadExternalEvents(supabase: any) {
  const serverNow = new Date();

  const fourHoursAgo = new Date(
    serverNow.getTime() - 4 * 60 * 60 * 1000
  );

  return supabase
    .from('external_events')
    .select('*')
    .eq('status', 'active')
    .not('event_start_at', 'is', null)
    .or(
      `event_end_at.gte.${serverNow.toISOString()},and(event_end_at.is.null,event_start_at.gte.${fourHoursAgo.toISOString()})`
    )
    .order('event_start_at', { ascending: true });
}

function buildSearchHaystack(event: DiscoveryCard) {
  return [
    event.name,
    event.city,
    event.state,
    ...expandCitySearch(cleanLower(event.city)),
    event.description,
    event.venue_name,
    event.genre,
    event.classification,
    event.source_label,
    event.age_requirement,
    ...event.music_selection,
    ...event.event_types,
    ...event.vibe_tags,
    ...event.amenities,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function buildCityCounts(events: DiscoveryCard[]) {
  const map = new Map<
    string,
    { city: string; state: string; count: number }
  >();

  for (const event of events) {
    const city = String(event.city || '').trim();
    const state = normalizeState(String(event.state || ''));

    if (!city || !state) continue;

    const key = `${city.toLowerCase()}-${state}`;
    const existing = map.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        city,
        state,
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count
  );
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

function getEventWindow(event: DiscoveryCard) {
  const now = new Date();
  const start = parseWallTime(event.event_start_at);

  if (!start) return null;

  const end =
    parseWallTime(event.event_end_at) ||
    new Date(start.getTime() + 4 * 60 * 60 * 1000);

  return {
    now,
    start,
    end,
  };
}

function isLiveNow(event: DiscoveryCard) {
  const window = getEventWindow(event);

  if (!window) return false;

  return (
    window.now >= window.start &&
    window.now <= window.end
  );
}

function isStartingSoon(event: DiscoveryCard) {
  const window = getEventWindow(event);

  if (!window) return false;

  const nextThreeHours = new Date(
    window.now.getTime() + 3 * 60 * 60 * 1000
  );

  return (
    window.start > window.now &&
    window.start <= nextThreeHours
  );
}

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return start;
}

function isSameWindow(
  value: string | null | undefined,
  start: Date,
  end: Date
) {
  const date = parseWallTime(value);

  if (!date) return false;

  return date >= start && date < end;
}

function isTodayInEventTime(event: DiscoveryCard) {
  const start = startOfToday();

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return isSameWindow(event.event_start_at, start, end);
}

function isTomorrowInEventTime(event: DiscoveryCard) {
  const start = startOfToday();
  start.setDate(start.getDate() + 1);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return isSameWindow(event.event_start_at, start, end);
}

function isWeekendInEventTime(event: DiscoveryCard) {
  const start = startOfToday();

  start.setDate(
    start.getDate() + ((5 - start.getDay() + 7) % 7)
  );

  const end = new Date(start);
  end.setDate(end.getDate() + 3);

  return isSameWindow(event.event_start_at, start, end);
}

function isThisWeekInEventTime(event: DiscoveryCard) {
  const start = startOfToday();
  start.setDate(start.getDate() + 2);

  const end = startOfToday();
  end.setDate(end.getDate() + 7);

  return isSameWindow(event.event_start_at, start, end);
}

function isNextWeekInEventTime(event: DiscoveryCard) {
  const start = startOfToday();
  start.setDate(start.getDate() + 7);

  const end = startOfToday();
  end.setDate(end.getDate() + 14);

  return isSameWindow(event.event_start_at, start, end);
}

function sortByStartTime(
  a: DiscoveryCard,
  b: DiscoveryCard
) {
  const aTime =
    parseWallTime(a.event_start_at)?.getTime() ?? Infinity;

  const bTime =
    parseWallTime(b.event_start_at)?.getTime() ?? Infinity;

  return aTime - bTime;
}

function cleanLower(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function arrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitValue(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return arrayValue(value);
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesNormalized(values: string[], selected: string) {
  return values.some((value) => {
    const cleanValue = cleanLower(value);

    return (
      cleanValue === selected ||
      cleanValue.includes(selected) ||
      selected.includes(cleanValue)
    );
  });
}

function includesText(value: unknown, selected: string) {
  const cleanValue = cleanLower(value);

  return (
    cleanValue === selected ||
    cleanValue.includes(selected) ||
    selected.includes(cleanValue)
  );
}