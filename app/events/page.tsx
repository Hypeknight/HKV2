import { marketFromExactQuery } from '@/lib/markets/normalize-market';
import { readRows, readValue, combinedState, countLabel, isRecord, isEventRecord } from '@/lib/interface-state/data';
import DataNotice from '@/components/interface-state/DataNotice';
import { classifyDiscoveryEvent, isPublicNativeDiscoveryRecord, hasWholeTerm, type DiscoveryCategory } from '@/lib/discovery/classification';
import { nativeEventDestination, externalEventDestination } from '@/lib/discovery/destinations';
import Link from 'next/link';
import '../preview/simply-complex/preview.css';
import './discovery.css';
import { createClient } from '@/lib/supabase/server';
import { expandCitySearch } from '@/lib/city-aliases';
import { getLookupMap, type LookupValue } from '@/lib/config/lookups';
import { US_STATES, normalizeState } from '@/lib/states';
import TrackView from '@/components/analytics/TrackView';
import DiscoverySearchForm from '@/components/discovery/DiscoverySearchForm';
import {
  buildMarketRegistry,
  isLocationInMarket,
  resolveSearchMarket,
} from '@/lib/markets/registry';
import {
  EmptyState,
  EventCard,
  EventRail,
  SectionHeader,
} from '@/components/ui';

type Props = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
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
  categories: DiscoveryCategory[];
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
  // V2 keeps physical city/state and metro market identity separate.
  market_id?: string | null;
};

const ALL_PREVIEW_LIMIT = 24;

export default async function EventsPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};
  const telemetry = process.env.HYPEKNIGHT_HOMEPAGE_PREVIEW !== '1';

  const category = cleanLower(query.category);
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

  const [hypeResult, externalResult, lookupResult, marketResult, areaResult] = await Promise.all([
    readRows('discovery.native', () => loadHypeKnightEvents(supabase), isEventRecord),
    readRows('discovery.external', () => loadExternalEvents(supabase), isEventRecord),
    readValue<Record<string, LookupValue[]>>('discovery.filters', () => getLookupMap([
      'music_genres',
      'event_types',
      'vibe_tags',
      'event_amenities',
      'age_requirements',
    ], { requireData: true }), value => isRecord(value) && ['music_genres', 'event_types', 'vibe_tags', 'event_amenities', 'age_requirements'].every(key => Array.isArray(value[key]))),
    readRows<Parameters<typeof buildMarketRegistry>[0][number]>('discovery.markets', () => supabase
      .from('markets')
      .select('id, market_key, name, primary_city, primary_state, status')
      .neq('status', 'retired'), row => isRecord(row) && ['id', 'market_key', 'name', 'primary_city', 'primary_state'].every(key => typeof row[key] === 'string')),
    readRows<Parameters<typeof buildMarketRegistry>[1][number]>('discovery.market-areas', () => supabase
      .from('market_areas')
      .select('id, market_id, city, state, normalized_city, normalized_state, area_type, is_primary, priority, is_active')
      .eq('is_active', true), row => isRecord(row) && ['id', 'market_id', 'city', 'state'].every(key => typeof row[key] === 'string')),
  ]);
  const hypeEvents = hypeResult.data;
  const externalEvents = externalResult.data;
  const marketRows = marketResult.data;
  const marketAreaRows = areaResult.data;
  const lookups = lookupResult.data || { music_genres: [], event_types: [], vibe_tags: [], event_amenities: [], age_requirements: [] };
  const geographyAvailable = marketResult.status === 'success' && areaResult.status === 'success';
  const inventoryState = combinedState(source === 'hypeknight' ? [hypeResult] : source === 'external' ? [externalResult] : [hypeResult, externalResult]);

  // MARKET REGISTRY V2:
  // Discovery can now treat a metro as the searchable geography while each
  // card continues to display its actual city/state.
  const marketRegistry = buildMarketRegistry(marketRows ?? [], marketAreaRows ?? []);
  const searchMarket = resolveSearchMarket(
    marketRegistry,
    query.city || null,
    query.state || null,
    query.q || null
  );
  // Explicit location and recognized market intent require complete geography.
  // Ordinary text can still be matched against retrieved event fields, but must
  // not acquire metro/alias expansion from an incomplete registry.
  const marketIntent = Boolean(city || searchMarket || (!geographyAvailable && marketFromExactQuery(search)));
  const locationUnavailable = !geographyAvailable && marketIntent;
  const keywordOnly = !geographyAvailable && Boolean(search) && !marketIntent;
  const complete = inventoryState === 'success' && !locationUnavailable;
  const exactMarketQuery = geographyAvailable && !query.city && Boolean(query.q && searchMarket);

  const allCards: DiscoveryCard[] = [
    ...(hypeEvents ?? []).filter(isPublicNativeDiscoveryRecord).filter((event: any) => nativeEventDestination(event.slug)).map((event: any) => ({
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
      href: nativeEventDestination(event.slug)!,
      categories: classifyDiscoveryEvent(event, 'hypeknight'),
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
      market_id: event.market_id || null,
    })),

    ...(externalEvents ?? []).filter((event: any) => externalEventDestination(event.id)).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: normalizeState(String(event.state || '')),
      description: event.description,
      event_start_at: event.event_start_at,
      event_end_at: event.event_end_at,
      image_url: event.image_url,
      href: externalEventDestination(event.id)!,
      categories: classifyDiscoveryEvent(event, 'external'),
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
      market_id: event.market_id || null,
    })),
  ].sort(sortByStartTime);

  const cityCounts = buildCityCounts(allCards);

  let cards = allCards.filter((event) => {
    const eventCity = cleanLower(event.city);
    const eventState = normalizeState(String(event.state || ''));

    const haystack = buildSearchHaystack(event);

    const eventIsInSearchMarket = searchMarket
      ? event.market_id === searchMarket.id ||
        isLocationInMarket(marketRegistry, searchMarket.id, event.city, event.state)
      : false;

    // If free text is exactly a known market alias (for example "Kansas City"),
    // the market itself satisfies the location portion of the query. A normal
    // keyword search such as "jazz Kansas City" still uses the content haystack.
    const matchesSearch = search
      ? (exactMarketQuery && eventIsInSearchMarket) ||
        haystack.includes(search) ||
        (geographyAvailable && searchTerms.some((term) =>
          haystack.includes(String(term).toLowerCase())
        ))
      : true;

    // An explicit city that belongs to a registered metro expands to all linked
    // market areas. This is what lets Kansas City discovery include Overland
    // Park, KCK, North Kansas City, Raytown, etc.
    const matchesCity = searchMarket && city
      ? eventIsInSearchMarket
      : cityTerms.length
        ? cityTerms.some((term) => {
            const cleanTerm = String(term).toLowerCase();

            return (
              eventCity.includes(cleanTerm) ||
              cleanTerm.includes(eventCity)
            );
          })
        : true;

    // Do not re-apply a single-state filter after a metro match; Kansas City is
    // intentionally allowed to cross the Missouri/Kansas state line.
    const matchesState = searchMarket && city ? true : state ? eventState === state : true;

    const matchesMusic = music
      ? event.categories.includes('music') && (event.music_selection.some(value => hasWholeTerm(value, music)) || hasWholeTerm(event.genre, music))
      : true;

    const matchesEventType = eventType
      ? event.event_types.some(value => hasWholeTerm(value, eventType)) ||
        hasWholeTerm(event.classification, eventType)
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
      !locationUnavailable &&
      (!category || event.categories.includes(category as DiscoveryCategory)) &&
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
    category,
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
      {telemetry ? <TrackView
        pageType="events_index"
        path="/events"
        city={query.city || null}
        state={query.state || null}
      /> : null}

      <section className="sc-home sc-discovery">
        {!complete ? <DataNotice message={locationUnavailable ? 'Location-based results are temporarily unavailable. Try again before changing your search.' : inventoryState === 'partial' ? 'Some event sources are temporarily unavailable. Showing available results; totals are unavailable.' : 'Event results are temporarily unavailable. Please try again.'} /> : null}
        {lookupResult.status === 'unavailable' ? <DataNotice message="Filter choices are temporarily unavailable. Your existing filters are retained." /> : null}
        {!geographyAvailable && !locationUnavailable ? <DataNotice message={keywordOnly ? "Market expansion is temporarily unavailable. Showing keyword matches only." : "Market information is temporarily unavailable. Available events are still shown."} /> : null}
        <DiscoveryHero
          query={query}
          tracking={telemetry}
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
            live: countLabel(complete, liveEvents.length),
            soon: countLabel(complete, startingSoonEvents.length),
            tonight: countLabel(complete, tonightEvents.length),
            tomorrow: countLabel(complete, tomorrowEvents.length),
            weekend: countLabel(complete, weekendEvents.length),
            all: countLabel(complete, cards.length),
          }}
        />

        <section id="all" className="sc-results scroll-mt-24">
          {hasActiveFilters ? <p className="sc-filter-context">{complete ? `${cards.length} ${keywordOnly ? `keyword match${cards.length === 1 ? '' : 'es'}` : `matching event${cards.length === 1 ? '' : 's'}`}` : 'Results unavailable or incomplete'} · {activeFilterCount} filters applied.</p> : null}
          <SectionHeader
            eyebrow={hasActiveFilters ? 'Results' : 'All Events'}
            title={
              hasActiveFilters
                ? 'Events matching your move'
                : 'All discoverable events'
            }
            text={complete ? `Showing ${allPreviewEvents.length} of ${cards.length} ${keywordOnly ? 'keyword matches' : 'events'}. Use filters to narrow the list.` : 'Showing available results only. Total matching inventory is unavailable.'}
          />

          {allPreviewEvents.length ? (
            <div className="sc-cards">
              {allPreviewEvents.map((event) => (
                <EventCard
                  editorial
                  key={`${event.source_label}-${event.id}`}
                  event={event}
                  impression={telemetry ? { surface: 'events_index', placement: 'all_results' } : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState text={complete ? keywordOnly ? "No keyword matches were found in the available inventory. Market expansion is unavailable." : "No events match your current filters. Try expanding your city, time, or category choices." : "Results are temporarily unavailable. Try again before changing your filters."} />
            </div>
          )}
        </section>
        <details className="sc-browse-paths">
          <summary>More ways to explore <span aria-hidden="true">＋</span></summary>
          <QuickDiscovery query={query} eventTypes={lookups.event_types} musicGenres={lookups.music_genres} />
          {cityCounts.length ? <CityRail query={query} cities={cityCounts} complete={hypeResult.status === 'success' && externalResult.status === 'success'} /> : null}
        </details>
        <details className="sc-time-sections">
          <summary>Browse by time <span aria-hidden="true">＋</span></summary>
        {!when || when === 'live' ? (
          <EventRail
            signalSurface={telemetry ? "events_index" : undefined}
            id="live"
            eyebrow="Here & Now"
            title="Live right now"
            text="Events currently happening."
            emptyText={complete ? undefined : "Event data is temporarily unavailable for this section."}
            events={liveEvents}
          />
        ) : null}

        {!when || when === 'soon' ? (
          <EventRail
            signalSurface={telemetry ? "events_index" : undefined}
            id="soon"
            eyebrow="Next Up"
            title="Starting soon"
            text="Events starting in the next three hours."
            emptyText={complete ? undefined : "Event data is temporarily unavailable for this section."}
            events={startingSoonEvents}
          />
        ) : null}

        {!when || when === 'tonight' ? (
          <EventRail
            signalSurface={telemetry ? "events_index" : undefined}
            id="tonight"
            eyebrow="Tonight"
            title="Tonight’s events"
            text="Events scheduled for today and tonight."
            emptyText={complete ? undefined : "Event data is temporarily unavailable for this section."}
            events={tonightEvents}
          />
        ) : null}

        {!hasActiveFilters ? (
          <EventRail
            signalSurface={telemetry ? "events_index" : undefined}
            id="fresh"
            eyebrow="Fresh"
            title="Recently added"
            text="New listings added into HypeKnight discovery."
            emptyText={complete ? undefined : "Event data is temporarily unavailable for this section."}
            events={recentlyAddedEvents}
          />
        ) : null}

        {!when || when === 'weekend' ? (
          <EventRail
            signalSurface={telemetry ? "events_index" : undefined}
            id="weekend"
            eyebrow="Weekend"
            title="This weekend"
            text="Friday through Sunday events."
            emptyText={complete ? undefined : "Event data is temporarily unavailable for this section."}
            events={weekendEvents}
          />
        ) : null}

        {!when || when === 'tomorrow' ? (
          <EventRail
            signalSurface={telemetry ? "events_index" : undefined}
            id="tomorrow"
            eyebrow="Tomorrow"
            title="Tomorrow’s move"
            text="Events happening tomorrow."
            emptyText={complete ? undefined : "Event data is temporarily unavailable for this section."}
            events={tomorrowEvents}
          />
        ) : null}

        {!when || when === 'week' ? (
          <EventRail
            signalSurface={telemetry ? "events_index" : undefined}
            id="week"
            eyebrow="This Week"
            title="Coming up this week"
            text="Events after tomorrow through the next seven days."
            emptyText={complete ? undefined : "Event data is temporarily unavailable for this section."}
            events={thisWeekEvents}
          />
        ) : null}

        {!hasActiveFilters ? (
          <EventRail
            signalSurface={telemetry ? "events_index" : undefined}
            id="next-week"
            eyebrow="Next Week"
            title="Next week’s lineup"
            text="Events scheduled seven to fourteen days out."
            emptyText={complete ? undefined : "Event data is temporarily unavailable for this section."}
            events={nextWeekEvents}
          />
        ) : null}


        </details>
      </section>
    </>
  );
}

function DiscoveryHero({
  query, tracking,
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
  tracking: boolean;
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
    live: number | 'Unavailable';
    soon: number | 'Unavailable';
    tonight: number | 'Unavailable';
    tomorrow: number | 'Unavailable';
    weekend: number | 'Unavailable';
    all: number | 'Unavailable';
  };
}) {
  const extraFilters = Boolean(music || eventType || vibe || amenity || age || when || source);
  return <header className="sc-discovery-hero">
    <div className="sc-discovery-title"><div><p className="sc-eyebrow">HypeKnight · Event Discovery</p>
      <h1>Find your <em>kind of night.</em></h1>
      <p className="sc-muted">A familiar favorite. Something unexpected. Start with a place, a sound, or a feeling.</p></div>
      <Link href="/surprise" className="sc-discovery-surprise">Leave room for surprise <span aria-hidden="true">↗</span></Link>
    </div>
    <DiscoverySearchForm tracking={tracking} className="sc-discovery-form">
      {query.category ? <><input type="hidden" name="category" value={query.category} /><p className="sc-filter-context">Category: {query.category}</p></> : null}
      <div className="sc-primary-filters">
        <FilterInput name="q" label="What are you in the mood for?" defaultValue={query.q || ''} placeholder="Events, artists or venues" />
        <FilterInput name="city" label="Your city" defaultValue={query.city || ''} placeholder="City or local nickname" />
        <label className="sc-filter-field" htmlFor="discovery-state"><span>State</span><select id="discovery-state" name="state" defaultValue={state} className={fieldClass}><option value="">All states</option>{US_STATES.map(([abbr,name]) => <option key={abbr} value={abbr}>{name}</option>)}</select></label>
        <button className="sc-button" type="submit">Find events <span aria-hidden="true">↗</span></button>
      </div>
      <details className="sc-advanced-filters" open={extraFilters}>
        <summary>Fine-tune your night <span>{activeFilterCount} active <span aria-hidden="true">＋</span></span></summary>
        <div className="sc-advanced-grid">
          <LookupSelect name="music" label="Music" value={music} options={lookups.music_genres} />
          <LookupSelect name="event_type" label="Event Type" value={eventType} options={lookups.event_types} />
          <LookupSelect name="vibe" label="Vibe" value={vibe} options={lookups.vibe_tags} />
          <LookupSelect name="amenity" label="Amenity" value={amenity} options={lookups.event_amenities} />
          <LookupSelect name="age" label="Age" value={age} options={lookups.age_requirements} />
          <label className="sc-filter-field" htmlFor="discovery-when"><span>When</span><select id="discovery-when" name="when" defaultValue={when} className={fieldClass}><option value="">Any Time</option><option value="live">Live Now</option><option value="soon">Starting Soon</option><option value="tonight">Tonight</option><option value="tomorrow">Tomorrow</option><option value="weekend">Weekend</option><option value="week">This Week</option></select></label>
          <label className="sc-filter-field" htmlFor="discovery-source"><span>Source</span><select id="discovery-source" name="source" defaultValue={source} className={fieldClass}><option value="">All Sources</option><option value="hypeknight">HypeKnight</option><option value="external">External</option></select></label>
          <button type="submit" className="sc-button sc-button-secondary">Apply filters ↗</button>
        </div>
      </details>
      {hasActiveFilters ? <Link href="/events" className="sc-clear-filters">Clear all filters ↗</Link> : null}
    </DiscoverySearchForm>
    <nav className="sc-time-links" aria-label="Explore by time">
      {([['live','Live',counts.live],['soon','Soon',counts.soon],['tonight','Tonight',counts.tonight],['tomorrow','Tomorrow',counts.tomorrow],['weekend','Weekend',counts.weekend]] as const).map(([value,label,count]) => <Link key={value} href={discoveryFilterDestination(query,{when:value})} aria-current={when === value ? 'page' : undefined}>{label} <span>{count}</span></Link>)}
      <Link href="#all">Results <span>{counts.all}</span></Link>
    </nav>
  </header>;
}

function QuickDiscovery({
  query,
  eventTypes,
  musicGenres,
}: {
  query: Awaited<NonNullable<Props['searchParams']>>;
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
          query={query}
          eyebrow="Choose an Experience"
          options={typeOptions}
          param="event_type"
        />
      ) : null}

      {musicOptions.length ? (
        <DiscoveryChipRail
          query={query}
          eyebrow="Choose Your Sound"
          options={musicOptions}
          param="music"
        />
      ) : null}
    </section>
  );
}

function DiscoveryChipRail({
  query,
  eyebrow,
  options,
  param,
}: {
  query: Awaited<NonNullable<Props['searchParams']>>;
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
            href={discoveryFilterDestination(query, { [param]: option.value })}
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
  cities, complete, query,
}: {
  query: Awaited<NonNullable<Props['searchParams']>>;
  cities: Array<{ city: string; state: string; count: number }>;
  complete: boolean;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        Available locations
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Explore a different city.
      </h2>

      <div className="-mx-1 mt-5 flex gap-3 overflow-x-auto px-1 pb-2">
        {cities.slice(0, 20).map((item) => (
          <Link
            key={`${item.city}-${item.state}`}
            href={discoveryFilterDestination(query, { city: item.city, state: item.state })}
            className="shrink-0 rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/70 hover:border-accent/40 hover:text-accent"
          >
            {item.city}, {item.state}

            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-black text-black">
              {countLabel(complete, item.count)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FilterInput({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder: string;
}) {
  return <label className="sc-filter-field" htmlFor={'discovery-' + name}><span>{label}</span><input id={'discovery-' + name} name={name} defaultValue={defaultValue || ''} placeholder={placeholder} className={fieldClass} /></label>;
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
    <label className="sc-filter-field" htmlFor={'discovery-' + name}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>

      <select
        id={'discovery-' + name}
        name={name}
        defaultValue={value}
        className={fieldClass}
      >
        <option value="">All {label}</option>
        {value && !options.some(option => option.value.toLowerCase() === value.toLowerCase()) ? <option value={value}>{value}</option> : null}

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
  'sc-discovery-field';

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
function discoveryFilterDestination(query: Record<string, string | undefined>, changes: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) if (value) params.set(key, value);
  return '/events?' + params.toString();
}
