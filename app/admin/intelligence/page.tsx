import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminMeasurement, { adminCount } from '@/components/admin/AdminMeasurement';
import { createClient } from '@/lib/supabase/server';
import { calculateExperimentalEventScore } from '@/lib/intelligence/event-score';
import {
  buildMarketIntelligence,
  type MarketSignalRow,
} from '@/lib/intelligence/market-intelligence';
import {
  buildMarketRegistry,
  getMarketAreas,
  resolveRegisteredMarket,
} from '@/lib/markets/registry';
import {
  buildMarketBaselineReadiness,
  type MarketDailyMetricRow,
} from '@/lib/intelligence/market-baselines';

/**
 * Intelligence Lab V2
 *
 * ADMIN ONLY.
 *
 * V2 adds the registry-backed metro model and baseline-readiness layer while
 * preserving the V1/V1.5 signal and event intelligence test benches. Existing
 * /admin/analytics and /admin/discovery behavior remains untouched.
 */
export default async function AdminIntelligencePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const now = new Date();
  const twentyEightDaysAgo = new Date(
    now.getTime() - 28 * 24 * 60 * 60 * 1000
  ).toISOString();
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const nowIso = now.toISOString();

  // MARKET INTELLIGENCE V1.5:
  // The market calculation compares the latest seven days with the prior seven.
  // Actor and session identifiers stay in this admin-only calculation.
  const [
    signalResult,
    legacySearchResult,
    hypeInventoryResult,
    externalInventoryResult,
    marketResult,
    marketAreaResult,
    dailyMetricResult,
  ] = await Promise.all([
    supabase
      .from('signals')
      .select(
        'id, signal_type, event_id, venue_id, market_id, actor_id, anonymous_session_id, city, state, metadata, confidence, verification_level, source, surface, occurred_at'
      )
      .gte('occurred_at', twentyEightDaysAgo)
      .order('occurred_at', { ascending: false })
      .limit(20000),
    supabase
      .from('discovery_search_logs')
      .select(
        'id, city, state, user_id, result_count, hypeknight_result_count, external_result_count, created_at'
      )
      .not('city', 'is', null)
      .order('created_at', { ascending: true })
      .limit(5000),
    supabase
      .from('events')
      .select('id, city, state, market_id')
      .in('status', ['scheduled', 'active'])
      .eq('is_public', true)
      .is('removed_at', null)
      .lte('promotion_start_at', nowIso)
      .gte('promotion_end_at', nowIso),
    supabase
      .from('external_events')
      .select('id, city, state, market_id')
      .eq('status', 'active'),
    supabase
      .from('markets')
      .select('id, market_key, name, primary_city, primary_state, status')
      .neq('status', 'retired')
      .order('name'),
    supabase
      .from('market_areas')
      .select('id, market_id, city, state, normalized_city, normalized_state, area_type, is_primary, priority, is_active')
      .eq('is_active', true),
    supabase
      .from('market_daily_metrics_v1')
      .select('market_id, metric_day, observations, searches, event_views, venue_views, saves, going, directions, unique_participants')
      .gte('metric_day', twentyEightDaysAgo)
      .order('metric_day', { ascending: true }),
  ]);

  if (signalResult.error) throw new Error(signalResult.error.message);
  if (legacySearchResult.error) throw new Error(legacySearchResult.error.message);
  if (hypeInventoryResult.error) throw new Error(hypeInventoryResult.error.message);
  if (externalInventoryResult.error) throw new Error(externalInventoryResult.error.message);
  if (marketResult.error) throw new Error(marketResult.error.message);
  if (marketAreaResult.error) throw new Error(marketAreaResult.error.message);
  if (dailyMetricResult.error) throw new Error(dailyMetricResult.error.message);

  const marketRegistry = buildMarketRegistry(marketResult.data ?? [], marketAreaResult.data ?? []);
  const resolveMarket = (city?: string | null, state?: string | null) =>
    resolveRegisteredMarket(marketRegistry, city, state);
  const baselineByMarketId = buildMarketBaselineReadiness(
    marketRegistry,
    (dailyMetricResult.data ?? []) as MarketDailyMetricRow[]
  );

  const allSignals = signalResult.data ?? [];

  // Some actions (Save, RSVP, Share, etc.) historically carry only event_id or
  // venue_id. Resolve those objects here so their market can be inherited
  // without changing or backfilling the original signal row.
  const eventIds = Array.from(
    new Set(allSignals.map((row) => row.event_id).filter(Boolean))
  ) as string[];
  const venueIds = Array.from(
    new Set(allSignals.map((row) => row.venue_id).filter(Boolean))
  ) as string[];

  const [signalEventsResult, signalVenuesResult] = await Promise.all([
    eventIds.length
      ? supabase
          .from('events')
          .select('id, name, slug, city, state, market_id, event_start_at')
          .in('id', eventIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    venueIds.length
      ? supabase.from('venues').select('id, city, state, market_id').in('id', venueIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (signalEventsResult.error) throw new Error(signalEventsResult.error.message);
  if (signalVenuesResult.error) throw new Error(signalVenuesResult.error.message);

  const events = signalEventsResult.data ?? [];
  const venues = signalVenuesResult.data ?? [];
  const eventById = new Map(events.map((event) => [event.id, event]));

  const eventMarkets = new Map<string, NonNullable<ReturnType<typeof resolveRegisteredMarket>>>();
  for (const event of events) {
    const market =
      (event.market_id ? marketRegistry.marketsById.get(event.market_id) ?? null : null) ||
      resolveMarket(event.city, event.state);
    if (market) eventMarkets.set(event.id, market);
  }

  const venueMarkets = new Map<string, NonNullable<ReturnType<typeof resolveRegisteredMarket>>>();
  for (const venue of venues) {
    const market =
      (venue.market_id ? marketRegistry.marketsById.get(venue.market_id) ?? null : null) ||
      resolveMarket(venue.city, venue.state);
    if (market) venueMarkets.set(venue.id, market);
  }

  const marketRows = buildMarketIntelligence({
    now,
    signals: allSignals as MarketSignalRow[],
    legacySearches: legacySearchResult.data ?? [],
    hypeknightEvents: hypeInventoryResult.data ?? [],
    externalEvents: externalInventoryResult.data ?? [],
    eventMarkets,
    venueMarkets,
    resolveMarket,
    marketsById: marketRegistry.marketsById,
  });

  // Keep the original V1 event score lab intact, but limit it to the current
  // seven-day window so its semantics remain the same as before V1.5.
  const currentSignals = allSignals.filter(
    (row) => new Date(row.occurred_at).getTime() >= new Date(sevenDaysAgo).getTime()
  );
  const grouped = new Map<string, typeof currentSignals>();

  for (const signal of currentSignals) {
    if (!signal.event_id) continue;
    const rows = grouped.get(signal.event_id) ?? [];
    rows.push(signal);
    grouped.set(signal.event_id, rows);
  }

  const eventScores = Array.from(grouped.entries())
    .map(([eventId, rows]) => ({
      event: eventById.get(eventId),
      eventId,
      ...calculateExperimentalEventScore(rows),
    }))
    .sort((a, b) => b.score - a.score);

  const typeCounts = new Map<string, number>();
  for (const signal of currentSignals) {
    typeCounts.set(signal.signal_type, (typeCounts.get(signal.signal_type) ?? 0) + 1);
  }

  const topTypes = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);
  const observedIdentifiers = new Set(
    currentSignals
      .map((row) => row.actor_id || row.anonymous_session_id)
      .filter(Boolean)
  ).size;
  const currentMarketSearches = marketRows.reduce((sum, row) => sum + row.searches7d, 0);

  const displayedMarkets = marketRows.slice(0, 50);
  const displayedEvents = eventScores.slice(0, 50);

  return (
    <div className="hk-admin-page">
      <header className="hk-admin-heading">
        <p className="hk-admin-eyebrow">Admin · Experimental analysis</p>
        <h1>Intelligence Lab</h1>
        <p>See where recorded activity is concentrated, what searches returned, and which markets have enough history for a baseline.</p>
        <div className="hk-admin-actions">
          <Link href="/admin/signals">Open Signal Evidence</Link>
          <Link href="/admin/intelligence/markets">Open Market Registry</Link>
        </div>
      </header>

      <section aria-labelledby="intelligence-snapshot">
        <h2 id="intelligence-snapshot">Activity snapshot</h2>
        <p className="hk-admin-detail">
          Activity figures use the latest seven days of the returned sample. Query limits may omit records.
          Use Signal Evidence for exact canonical action counts.
        </p>
        <div className="hk-admin-grid">
          <AdminMeasurement label="Recorded signals" value={currentSignals.length} detail="Action records in the sample. Repeat actions can be counted." />
          <AdminMeasurement label="Market-linked searches" value={currentMarketSearches} detail="Search actions that could be assigned to a market." />
          <AdminMeasurement label="Events with signals" value={grouped.size} detail="Distinct event records linked to at least one sampled signal." />
          <AdminMeasurement label="Observed identifiers" value={observedIdentifiers} detail="Distinct account or anonymous-session identifiers. One person can have multiple identifiers." />
          <AdminMeasurement label="Registered markets" value={marketRegistry.marketsById.size} detail="Registry records returned by the query, excluding retired markets." />
        </div>
      </section>

      <section aria-labelledby="intelligence-markets">
        <h2 id="intelligence-markets">Market activity</h2>
        <p className="hk-admin-detail">
          Linked cities and suburbs roll up into a metro market. Search comparisons use the previous seven days.
          Baseline readiness uses the last 28 days of daily evidence. Inventory counts come from a separate listing query.
        </p>
        {displayedMarkets.length ? (
          <>
            <p className="hk-admin-detail mt-2">
              Showing {adminCount(displayedMarkets.length)} of {adminCount(marketRows.length)} market rows, ordered by sampled searches first.
            </p>
            <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
              {displayedMarkets.map((row) => {
                const baseline = row.id ? baselineByMarketId.get(row.id) : undefined;
                const hasResults = row.searchesWithObservedResults7d > 0;

                return (
                  <article key={row.key} className="hk-admin-panel">
                    <p className="hk-admin-eyebrow">{row.id ? 'Registered market' : 'Observed area'}</p>
                    <h3 className="mb-3 mt-2 text-lg font-bold">{row.name || `${row.city}, ${row.state}`}</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <IntelligenceMetric label="Searches · 7 days" value={row.searches7d} />
                      <IntelligenceMetric label="Compared with prior 7 days" value={formatTrend(row.searchChangePercent, row.searches7d, row.previousSearches7d)} />
                      <IntelligenceMetric label="Searches with zero results" value={hasResults ? row.zeroResultSearches7d : 'No result counts observed'} />
                      <IntelligenceMetric label="Baseline readiness" value={baseline?.readiness ?? (row.id ? 'No baseline data' : 'No registered market')} />
                    </dl>
                    <details className="mt-4 border-t border-white/10 pt-2">
                      <summary className="min-h-11 cursor-pointer py-2 font-semibold text-accent">Show market evidence</summary>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pb-2">
                        <IntelligenceMetric label="Searches · 24 hours" value={row.searches24h} />
                        <IntelligenceMetric label="Prior 7-day searches" value={row.previousSearches7d} />
                        <IntelligenceMetric label="Searcher identifiers · 7 days" value={row.uniqueSearchers7d} />
                        <IntelligenceMetric label="Recorded observations · 7 days" value={row.observations7d} />
                        <IntelligenceMetric label="Searches with a recorded result count" value={row.searchesWithObservedResults7d} />
                        <IntelligenceMetric label="Searches with fewer than 3 results, including zero" value={hasResults ? row.lowResultSearches7d : 'No result counts observed'} />
                        <IntelligenceMetric label="Average results per measured search" value={row.averageResultsPerSearch7d ?? 'No result counts observed'} />
                        <IntelligenceMetric label="Most common search hour (server time)" value={formatHour(row.peakDiscoveryHour)} />
                        <IntelligenceMetric label="Event view actions · 7 days" value={row.eventViews7d} />
                        <IntelligenceMetric label="Save actions · 7 days" value={row.saves7d} />
                        <IntelligenceMetric label="Going actions · 7 days" value={row.going7d} />
                        <IntelligenceMetric label="Directions requests · 7 days" value={row.directions7d} />
                        <IntelligenceMetric label="Native / external listing records" value={`${adminCount(row.hypeknightEvents)} / ${adminCount(row.externalEvents)}`} />
                        <IntelligenceMetric label="Native share of queried inventory" value={row.hypeknightCoveragePercent === null ? 'No listings in sample' : `${row.hypeknightCoveragePercent}%`} />
                        <IntelligenceMetric label="Linked registry areas" value={row.id ? getMarketAreas(marketRegistry, row.id).length : 'No registered market'} />
                        <IntelligenceMetric label="Days with evidence · 28 days" value={baseline?.evidenceDays28d ?? 'No baseline data'} />
                        <IntelligenceMetric label="Sample strength" value={row.confidenceLabel} />
                        <IntelligenceMetric label="Legacy searches · separate history" value={row.legacySearches} />
                      </dl>
                    </details>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <p className="hk-admin-notice mt-4">The returned data contains no market rows.</p>
        )}
      </section>

      <section className="hk-admin-panel" aria-labelledby="intelligence-signal-mix">
        <h2 id="intelligence-signal-mix">Recorded action types</h2>
        <p>Counts by action type in the seven-day sample. Save and Going actions may include activity that was later reversed.</p>
        {topTypes.length ? (
          <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {topTypes.map(([type, count]) => (
              <IntelligenceMetric key={type} label={type.replaceAll('_', ' ')} value={count} />
            ))}
          </dl>
        ) : (
          <p className="mt-3">The returned sample contains no recorded actions in this window.</p>
        )}
      </section>

      <section className="hk-admin-panel" aria-labelledby="intelligence-event-index">
        <h2 id="intelligence-event-index">Experimental event index</h2>
        <p>
          An internal test of how action weights and recency affect event comparisons.
          Evidence strength reflects the number of signals and observed identifiers in the sample.
          Use factual reporting for attendance and exposure questions.
        </p>
        {displayedEvents.length ? (
          <details className="mt-3">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-accent">
              Show {adminCount(displayedEvents.length)} of {adminCount(eventScores.length)} experimental event results
            </summary>
            <ul className="divide-y divide-white/10">
              {displayedEvents.map((row) => (
                <li key={row.eventId} className="py-4">
                  <h3 className="break-words font-semibold">
                    {row.event?.slug ? <Link className="hover:text-accent" href={`/events/${row.event.slug}`}>{row.event.name}</Link> : row.eventId}
                  </h3>
                  {row.event ? <p className="hk-admin-detail">{row.event.city}, {row.event.state}</p> : null}
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                    <IntelligenceMetric label="Experimental index" value={`${row.score} / 100`} />
                    <IntelligenceMetric label="Index label" value={row.label} />
                    <IntelligenceMetric label="Evidence strength" value={`${Math.round(row.confidence * 100)}%`} />
                    <IntelligenceMetric label="Sampled signals" value={row.signalCount} />
                    <IntelligenceMetric label="Observed identifiers" value={row.uniqueActors} />
                    <IntelligenceMetric label="Weighted points" value={row.weightedPoints} />
                  </dl>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="mt-3">No events have linked signals in the returned seven-day sample.</p>
        )}
      </section>
    </div>
  );
}

function IntelligenceMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <dt className="hk-admin-detail">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{typeof value === 'number' ? adminCount(value) : value}</dd>
    </div>
  );
}

function formatTrend(change: number | null, current: number, previous: number) {
  if (current === 0 && previous === 0) return 'No searches';
  if (change === null) return previous === 0 && current > 0 ? 'New activity' : '—';
  if (change > 0) return `+${change}%`;
  return `${change}%`;
}

function formatHour(hour: number | null) {
  if (hour === null) return 'No search hour observed';
  const date = new Date(2000, 0, 1, hour, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric' });
}
