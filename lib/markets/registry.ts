import { normalizeState } from '@/lib/states';
import { marketFromExactQuery, normalizeMarket, type CanonicalMarket } from './normalize-market';

/**
 * INTELLIGENCE V2 — MARKET REGISTRY
 *
 * A market is a metro/intelligence region. A market area is a real city or
 * municipality linked to that region. Events keep their real city/state while
 * searches can expand across all areas assigned to the same market.
 */
export type MarketRegistryMarketRow = {
  id: string;
  market_key: string;
  name: string;
  primary_city: string;
  primary_state: string;
  timezone?: string | null;
  status?: string | null;
};

export type MarketRegistryAreaRow = {
  id?: string;
  market_id: string;
  city: string;
  state: string;
  normalized_city?: string | null;
  normalized_state?: string | null;
  area_type?: string | null;
  is_primary?: boolean | null;
  priority?: number | null;
  is_active?: boolean | null;
};

export type RegisteredMarket = CanonicalMarket & {
  id: string;
  name: string;
  timezone?: string | null;
  status?: string | null;
};

export type MarketRegistry = {
  marketsById: Map<string, RegisteredMarket>;
  marketsByKey: Map<string, RegisteredMarket>;
  areasByLocation: Map<string, MarketRegistryAreaRow>;
  areasByCity: Map<string, MarketRegistryAreaRow[]>;
  areasByMarketId: Map<string, MarketRegistryAreaRow[]>;
};

export function buildMarketRegistry(
  markets: MarketRegistryMarketRow[],
  areas: MarketRegistryAreaRow[]
): MarketRegistry {
  const marketsById = new Map<string, RegisteredMarket>();
  const marketsByKey = new Map<string, RegisteredMarket>();
  const areasByLocation = new Map<string, MarketRegistryAreaRow>();
  const areasByCity = new Map<string, MarketRegistryAreaRow[]>();
  const areasByMarketId = new Map<string, MarketRegistryAreaRow[]>();

  for (const row of markets) {
    const market: RegisteredMarket = {
      id: row.id,
      key: row.market_key,
      name: row.name,
      city: row.primary_city,
      state: normalizeState(row.primary_state),
      timezone: row.timezone ?? null,
      status: row.status ?? null,
    };
    marketsById.set(row.id, market);
    marketsByKey.set(row.market_key, market);
  }

  for (const area of areas) {
    if (area.is_active === false) continue;
    areasByLocation.set(locationKey(area.city, area.state), area);
    const cityList = areasByCity.get(cityKey(area.city)) ?? [];
    cityList.push(area);
    areasByCity.set(cityKey(area.city), cityList);
    const list = areasByMarketId.get(area.market_id) ?? [];
    list.push(area);
    areasByMarketId.set(area.market_id, list);
  }

  for (const list of areasByMarketId.values()) {
    list.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  return { marketsById, marketsByKey, areasByLocation, areasByCity, areasByMarketId };
}

/** Resolve a physical city/state into its registered metro market. */
export function resolveRegisteredMarket(
  registry: MarketRegistry,
  city?: string | null,
  state?: string | null
): RegisteredMarket | null {
  const suppliedState = normalizeState(String(state || ''));
  const area = registry.areasByLocation.get(locationKey(city, suppliedState));
  if (area) return registry.marketsById.get(area.market_id) ?? null;

  // State-less city input is allowed only when that city name maps to exactly
  // one active registry area. Ambiguous names are intentionally not guessed.
  if (!suppliedState && city) {
    const candidates = registry.areasByCity.get(cityKey(city)) ?? [];
    if (candidates.length === 1) {
      return registry.marketsById.get(candidates[0].market_id) ?? null;
    }
  }

  return null;
}

/**
 * Resolve discovery input. Exact registry area wins. Legacy aliases are only a
 * fallback for known primary markets such as KC/ATL/NYC.
 */
export function resolveSearchMarket(
  registry: MarketRegistry,
  city?: string | null,
  state?: string | null,
  query?: string | null
): RegisteredMarket | null {
  const exactArea = resolveRegisteredMarket(registry, city, state);
  if (exactArea) return exactArea;

  // A free-text query that is exactly a unique registered municipality can
  // also resolve its metro (for example "Overland Park").
  const exactQueryArea = !city ? resolveRegisteredMarket(registry, query, null) : null;
  if (exactQueryArea) return exactQueryArea;

  const normalized = normalizeMarket(city, state) || marketFromExactQuery(query);
  if (!normalized) return null;

  return (
    resolveRegisteredMarket(registry, normalized.city, normalized.state) ||
    registry.marketsByKey.get(normalized.key) ||
    null
  );
}

/** Return every linked city/state belonging to a metro market. */
export function getMarketAreas(
  registry: MarketRegistry,
  marketId?: string | null
): MarketRegistryAreaRow[] {
  return marketId ? registry.areasByMarketId.get(marketId) ?? [] : [];
}

export function isLocationInMarket(
  registry: MarketRegistry,
  marketId: string,
  city?: string | null,
  state?: string | null
) {
  const area = registry.areasByLocation.get(locationKey(city, state));
  return area?.market_id === marketId;
}

function cityKey(city?: string | null) {
  return String(city || '')
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function locationKey(city?: string | null, state?: string | null) {
  const cleanCity = cityKey(city)
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const cleanState = normalizeState(String(state || '')).toUpperCase();
  return `${cleanCity}|${cleanState}`;
}
