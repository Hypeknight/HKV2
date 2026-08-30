import { normalizeMarket, type CanonicalMarket } from '@/lib/markets/normalize-market';

/**
 * Market Intelligence V1.5 intentionally favors explainable measurements over
 * a single "magic" score. These rows can later feed baselines, percentiles and
 * recommendations after enough real history exists.
 */
export type MarketSignalRow = {
  signal_type: string;
  actor_id?: string | null;
  anonymous_session_id?: string | null;
  event_id?: string | null;
  venue_id?: string | null;
  market_id?: string | null;
  city?: string | null;
  state?: string | null;
  metadata?: Record<string, unknown> | null;
  occurred_at: string;
};

export type LegacySearchRow = {
  id: string;
  city?: string | null;
  state?: string | null;
  user_id?: string | null;
  result_count?: number | null;
  hypeknight_result_count?: number | null;
  external_result_count?: number | null;
  created_at: string;
};

export type MarketInventoryRow = {
  id: string;
  market_id?: string | null;
  city?: string | null;
  state?: string | null;
};

export type MarketIntelligenceRow = CanonicalMarket & {
  searches7d: number;
  previousSearches7d: number;
  searchChangePercent: number | null;
  searches24h: number;
  uniqueSearchers7d: number;
  eventViews7d: number;
  venueViews7d: number;
  saves7d: number;
  going7d: number;
  shares7d: number;
  directions7d: number;
  observations7d: number;
  legacySearches: number;
  legacyFirstSeen: string | null;
  legacyLastSeen: string | null;
  zeroResultSearches7d: number;
  lowResultSearches7d: number;
  averageResultsPerSearch7d: number | null;
  hypeknightEvents: number;
  externalEvents: number;
  totalInventory: number;
  hypeknightCoveragePercent: number | null;
  peakDiscoveryHour: number | null;
  confidenceLabel: 'Insufficient' | 'Building' | 'Moderate' | 'Strong';
};

type BuildOptions = {
  now?: Date;
  signals: MarketSignalRow[];
  legacySearches?: LegacySearchRow[];
  hypeknightEvents?: MarketInventoryRow[];
  externalEvents?: MarketInventoryRow[];
  eventMarkets?: Map<string, CanonicalMarket>;
  venueMarkets?: Map<string, CanonicalMarket>;
  // V2 can inject the database-backed metro registry resolver. V1.5 callers
  // still fall back to normalizeMarket so the helper remains backwards-compatible.
  resolveMarket?: (city?: string | null, state?: string | null) => CanonicalMarket | null;
  marketsById?: Map<string, CanonicalMarket>;
};

type MutableMarket = MarketIntelligenceRow & {
  searcherIds: Set<string>;
  searchResultTotal: number;
  discoveryHours: number[];
};

export function buildMarketIntelligence(options: BuildOptions): MarketIntelligenceRow[] {
  const now = options.now ?? new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now.getTime() - 7 * dayMs;
  const fourteenDaysAgo = now.getTime() - 14 * dayMs;
  const oneDayAgo = now.getTime() - dayMs;
  const markets = new Map<string, MutableMarket>();
  const resolveMarket = options.resolveMarket ?? normalizeMarket;

  const get = (market: CanonicalMarket) => {
    const existing = markets.get(market.key);
    if (existing) return existing;

    const created: MutableMarket = {
      ...market,
      searches7d: 0,
      previousSearches7d: 0,
      searchChangePercent: null,
      searches24h: 0,
      uniqueSearchers7d: 0,
      eventViews7d: 0,
      venueViews7d: 0,
      saves7d: 0,
      going7d: 0,
      shares7d: 0,
      directions7d: 0,
      observations7d: 0,
      legacySearches: 0,
      legacyFirstSeen: null,
      legacyLastSeen: null,
      zeroResultSearches7d: 0,
      lowResultSearches7d: 0,
      averageResultsPerSearch7d: null,
      hypeknightEvents: 0,
      externalEvents: 0,
      totalInventory: 0,
      hypeknightCoveragePercent: null,
      peakDiscoveryHour: null,
      confidenceLabel: 'Insufficient',
      searcherIds: new Set<string>(),
      searchResultTotal: 0,
      discoveryHours: [],
    };

    markets.set(market.key, created);
    return created;
  };

  // Current signal stream: use explicit city/state first, then inherit the
  // market from an attached event/venue when the action itself omitted it.
  for (const signal of options.signals) {
    const market =
      (signal.market_id ? options.marketsById?.get(signal.market_id) ?? null : null) ||
      resolveMarket(signal.city, signal.state) ||
      (signal.event_id ? options.eventMarkets?.get(signal.event_id) ?? null : null) ||
      (signal.venue_id ? options.venueMarkets?.get(signal.venue_id) ?? null : null);

    if (!market) continue;

    const occurredAt = new Date(signal.occurred_at).getTime();
    if (!Number.isFinite(occurredAt) || occurredAt < fourteenDaysAgo) continue;

    const row = get(market);
    const isCurrent7d = occurredAt >= sevenDaysAgo;
    const isPrevious7d = occurredAt >= fourteenDaysAgo && occurredAt < sevenDaysAgo;

    if (signal.signal_type === 'search_performed') {
      if (isCurrent7d) {
        row.searches7d += 1;
        if (occurredAt >= oneDayAgo) row.searches24h += 1;

        const actor = signal.actor_id || signal.anonymous_session_id;
        if (actor) row.searcherIds.add(actor);

        const resultCount = numericMetadata(signal.metadata, 'result_count');
        if (resultCount !== null) {
          row.searchResultTotal += resultCount;
          if (resultCount === 0) row.zeroResultSearches7d += 1;
          if (resultCount < 3) row.lowResultSearches7d += 1;
        }

        row.discoveryHours.push(new Date(signal.occurred_at).getHours());
      } else if (isPrevious7d) {
        row.previousSearches7d += 1;
      }
    }

    if (!isCurrent7d) continue;

    row.observations7d += 1;
    if (signal.signal_type === 'event_view') row.eventViews7d += 1;
    if (signal.signal_type === 'venue_view') row.venueViews7d += 1;
    if (signal.signal_type === 'event_saved') row.saves7d += 1;
    if (signal.signal_type === 'event_rsvp_going') row.going7d += 1;
    if (signal.signal_type === 'event_shared') row.shares7d += 1;
    if (signal.signal_type === 'directions_requested') row.directions7d += 1;
  }

  // June/legacy search history remains source evidence. We do not insert it
  // into signals or pretend it belongs to the current 7-day trend window.
  for (const legacy of options.legacySearches ?? []) {
    const market = resolveMarket(legacy.city, legacy.state);
    if (!market) continue;
    const row = get(market);
    row.legacySearches += 1;
    row.legacyFirstSeen = earliest(row.legacyFirstSeen, legacy.created_at);
    row.legacyLastSeen = latest(row.legacyLastSeen, legacy.created_at);
  }

  // Current event inventory is measured independently from search-result
  // metadata. That keeps "supply" truthful even when a user applies source or
  // date filters to one particular search.
  for (const event of options.hypeknightEvents ?? []) {
    const market =
      (event.market_id ? options.marketsById?.get(event.market_id) ?? null : null) ||
      resolveMarket(event.city, event.state);
    if (market) get(market).hypeknightEvents += 1;
  }

  for (const event of options.externalEvents ?? []) {
    const market =
      (event.market_id ? options.marketsById?.get(event.market_id) ?? null : null) ||
      resolveMarket(event.city, event.state);
    if (market) get(market).externalEvents += 1;
  }

  return Array.from(markets.values())
    .map((row) => {
      row.uniqueSearchers7d = row.searcherIds.size;
      row.totalInventory = row.hypeknightEvents + row.externalEvents;
      row.hypeknightCoveragePercent = row.totalInventory
        ? round1((row.hypeknightEvents / row.totalInventory) * 100)
        : null;
      row.averageResultsPerSearch7d = row.searches7d
        ? round1(row.searchResultTotal / row.searches7d)
        : null;
      row.searchChangePercent = trendPercent(row.searches7d, row.previousSearches7d);
      row.peakDiscoveryHour = mode(row.discoveryHours);
      row.confidenceLabel = confidence(row.observations7d, row.uniqueSearchers7d);

      const { searcherIds: _searchers, searchResultTotal: _results, discoveryHours: _hours, ...publicRow } = row;
      return publicRow;
    })
    .sort((a, b) => {
      if (b.searches7d !== a.searches7d) return b.searches7d - a.searches7d;
      if (b.observations7d !== a.observations7d) return b.observations7d - a.observations7d;
      return b.legacySearches - a.legacySearches;
    });
}

function numericMetadata(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function trendPercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return round1(((current - previous) / previous) * 100);
}

function confidence(observations: number, unique: number): MarketIntelligenceRow['confidenceLabel'] {
  if (observations < 10 || unique < 3) return 'Insufficient';
  if (observations < 50 || unique < 10) return 'Building';
  if (observations < 200 || unique < 30) return 'Moderate';
  return 'Strong';
}

function mode(values: number[]) {
  if (!values.length) return null;
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

function earliest(current: string | null, next: string) {
  if (!current) return next;
  return new Date(next).getTime() < new Date(current).getTime() ? next : current;
}

function latest(current: string | null, next: string) {
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
