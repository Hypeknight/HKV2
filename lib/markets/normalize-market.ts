import { normalizeState } from '@/lib/states';

/**
 * MARKET INTELLIGENCE V1.5
 *
 * A Market is the canonical city/state identity used by intelligence. Search
 * aliases are intentionally kept separate from this file: city-aliases.ts is
 * responsible for matching discovery text, while this helper is responsible
 * for making analytics records comparable over time.
 */
export type CanonicalMarket = {
  key: string;
  city: string;
  state: string;
  // V2 registry-backed markets may also expose a stable database id/name.
  // V1.5 callers can continue using only key/city/state.
  id?: string;
  name?: string;
};

/**
 * Known launch/expansion markets let us safely fill a missing state when the
 * city itself is unambiguous in HypeKnight's current operating context.
 *
 * IMPORTANT: Do not silently add ambiguous cities here. If we cannot resolve a
 * market confidently, return null/keep the supplied state rather than inventing
 * geography.
 */
const KNOWN_MARKETS: Record<string, { city: string; state: string; aliases: string[] }> = {
  'kansas city': {
    city: 'Kansas City',
    state: 'MO',
    aliases: ['kansas city', 'kc', 'kcmo'],
  },
  'st louis': {
    city: 'St. Louis',
    state: 'MO',
    aliases: ['st louis', 'st. louis', 'saint louis', 'stl'],
  },
  chicago: {
    city: 'Chicago',
    state: 'IL',
    aliases: ['chicago', 'chi', 'chi town', 'chitown'],
  },
  'new york': {
    city: 'New York',
    state: 'NY',
    aliases: ['new york', 'new york city', 'nyc'],
  },
  atlanta: {
    city: 'Atlanta',
    state: 'GA',
    aliases: ['atlanta', 'atl'],
  },
  houston: {
    city: 'Houston',
    state: 'TX',
    aliases: ['houston', 'htx'],
  },
  austin: {
    city: 'Austin',
    state: 'TX',
    aliases: ['austin'],
  },
  'las vegas': {
    city: 'Las Vegas',
    state: 'NV',
    aliases: ['las vegas', 'vegas', 'lv'],
  },
};

const ALIAS_TO_MARKET = new Map<string, { city: string; state: string }>();
for (const market of Object.values(KNOWN_MARKETS)) {
  for (const alias of market.aliases) {
    ALIAS_TO_MARKET.set(clean(alias), { city: market.city, state: market.state });
  }
}

/**
 * Convert a city/state pair into one stable market identity.
 *
 * Examples:
 *   Kansas City + null -> kansas-city-mo
 *   kansas city + MO   -> kansas-city-mo
 *   Houston + tx       -> houston-tx
 */
export function normalizeMarket(
  cityValue?: string | null,
  stateValue?: string | null
): CanonicalMarket | null {
  const rawCity = String(cityValue || '').trim();
  if (!rawCity) return null;

  const aliasMatch = ALIAS_TO_MARKET.get(clean(rawCity));
  const suppliedState = normalizeState(String(stateValue || ''));

  if (aliasMatch) {
    // Respect an explicitly supplied state. The default is only used when the
    // current search/log omitted one.
    const state = suppliedState || aliasMatch.state;
    const city = aliasMatch.city;
    return { key: `${slug(city)}-${state.toLowerCase()}`, city, state };
  }

  const city = toTitleCase(rawCity);
  if (!suppliedState) return null;

  return {
    key: `${slug(city)}-${suppliedState.toLowerCase()}`,
    city,
    state: suppliedState,
  };
}

/**
 * Resolve an exact free-text query only when it cleanly matches a known market
 * alias. This lets a search for "Kansas City" become market intent without
 * pretending that arbitrary text contains a city.
 */
export function marketFromExactQuery(query?: string | null): CanonicalMarket | null {
  const match = ALIAS_TO_MARKET.get(clean(String(query || '')));
  return match ? normalizeMarket(match.city, match.state) : null;
}

function clean(value: string) {
  return value.trim().toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTitleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
