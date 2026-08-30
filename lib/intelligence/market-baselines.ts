import type { MarketRegistry } from '@/lib/markets/registry';

/**
 * INTELLIGENCE V2 — BASELINE READINESS
 *
 * This does NOT publish a predictive or public score. It measures whether a
 * market has enough day-level evidence to begin comparing current behavior to
 * its own history later.
 */
export type MarketDailyMetricRow = {
  market_id: string;
  metric_day: string;
  observations?: number | string | null;
  searches?: number | string | null;
  event_views?: number | string | null;
  venue_views?: number | string | null;
  saves?: number | string | null;
  going?: number | string | null;
  directions?: number | string | null;
  unique_participants?: number | string | null;
};

export type MarketBaselineReadiness = {
  marketId: string;
  marketKey: string;
  marketName: string;
  evidenceDays28d: number;
  searchDays28d: number;
  observations28d: number;
  searches28d: number;
  uniqueParticipantDays28d: number;
  readiness: 'Insufficient' | 'Building' | 'Moderate' | 'Ready';
};

export function buildMarketBaselineReadiness(
  registry: MarketRegistry,
  dailyRows: MarketDailyMetricRow[]
): Map<string, MarketBaselineReadiness> {
  const mutable = new Map<
    string,
    MarketBaselineReadiness & { evidenceDays: Set<string>; searchDays: Set<string> }
  >();

  for (const row of dailyRows) {
    const market = registry.marketsById.get(row.market_id);
    if (!market) continue;

    const existing = mutable.get(row.market_id) ?? {
      marketId: row.market_id,
      marketKey: market.key,
      marketName: market.name,
      evidenceDays28d: 0,
      searchDays28d: 0,
      observations28d: 0,
      searches28d: 0,
      uniqueParticipantDays28d: 0,
      readiness: 'Insufficient' as const,
      evidenceDays: new Set<string>(),
      searchDays: new Set<string>(),
    };

    const day = String(row.metric_day).slice(0, 10);
    const observations = numberValue(row.observations);
    const searches = numberValue(row.searches);

    if (observations > 0) existing.evidenceDays.add(day);
    if (searches > 0) existing.searchDays.add(day);

    existing.observations28d += observations;
    existing.searches28d += searches;
    existing.uniqueParticipantDays28d += numberValue(row.unique_participants);
    mutable.set(row.market_id, existing);
  }

  const output = new Map<string, MarketBaselineReadiness>();
  for (const [marketId, row] of mutable) {
    row.evidenceDays28d = row.evidenceDays.size;
    row.searchDays28d = row.searchDays.size;
    row.readiness = readiness(row.evidenceDays28d, row.observations28d);
    const { evidenceDays: _evidence, searchDays: _search, ...clean } = row;
    output.set(marketId, clean);
  }

  return output;
}

function readiness(days: number, observations: number): MarketBaselineReadiness['readiness'] {
  if (days < 7 || observations < 25) return 'Insufficient';
  if (days < 14 || observations < 100) return 'Building';
  if (days < 21 || observations < 300) return 'Moderate';
  return 'Ready';
}

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
