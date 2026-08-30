import Link from 'next/link';
import { redirect } from 'next/navigation';
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
  // Pull 14 days so we can compare current 7-day search demand with the prior
  // 7 days. Raw actor identifiers never leave this admin-only calculation.
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
  const uniqueParticipants = new Set(
    currentSignals
      .map((row) => row.actor_id || row.anonymous_session_id)
      .filter(Boolean)
  ).size;
  const currentMarketSearches = marketRows.reduce((sum, row) => sum + row.searches7d, 0);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-white/60 hover:text-accent">
        ← Back to Admin
      </Link>

      <section className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Intelligence Lab V2
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Signals, metro markets, baselines, and experimental event intelligence
        </h1>
        <p className="mt-4 max-w-4xl text-white/70">
          Development-only intelligence. V2 separates physical city from metro market,
          automatically observes unknown cities, and tracks baseline readiness. Public
          Hype scores and predictive recommendations remain withheld.
        </p>
        <div className="mt-5">
          <Link
            href="/admin/intelligence/markets"
            className="inline-flex rounded-2xl border border-accent/30 bg-black/20 px-4 py-2 text-sm font-semibold text-white hover:border-accent/60"
          >
            Open Market Registry →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Signals / 7 days" value={currentSignals.length} />
        <Metric label="Unique participants" value={uniqueParticipants} />
        <Metric label="Market searches / 7d" value={currentMarketSearches} />
        <Metric label="Markets registered" value={marketRegistry.marketsById.size} />
        <Metric label="Events with signals" value={grouped.size} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Market Intelligence V2
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">Metro demand, coverage, and baseline readiness</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/55">
              Cities and suburbs roll into their registered metro market while events
              retain their true location. June logs remain legacy evidence only.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="pb-3">Market</th>
                <th className="pb-3">Areas</th>
                <th className="pb-3">Baseline</th>
                <th className="pb-3">Searches 7d</th>
                <th className="pb-3">vs prior 7d</th>
                <th className="pb-3">Searchers</th>
                <th className="pb-3">Event views</th>
                <th className="pb-3">Saves</th>
                <th className="pb-3">Going</th>
                <th className="pb-3">Directions</th>
                <th className="pb-3">HK / External</th>
                <th className="pb-3">HK coverage</th>
                <th className="pb-3">Peak search</th>
                <th className="pb-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {marketRows.length ? (
                marketRows.slice(0, 50).map((row) => (
                  <tr key={row.key} className="border-t border-white/10 text-white/80">
                    <td className="py-4">
                      <p className="font-semibold text-white">
                        {row.name || `${row.city}, ${row.state}`}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {row.legacySearches
                          ? `${row.legacySearches} legacy search${row.legacySearches === 1 ? '' : 'es'}`
                          : 'No legacy city searches'}
                      </p>
                    </td>
                    <td className="py-4">
                      {row.id ? getMarketAreas(marketRegistry, row.id).length : '—'}
                    </td>
                    <td className="py-4">
                      {row.id ? baselineByMarketId.get(row.id)?.readiness ?? 'Insufficient' : 'Insufficient'}
                    </td>
                    <td className="py-4 font-bold text-white">{row.searches7d}</td>
                    <td className="py-4">{formatTrend(row.searchChangePercent, row.searches7d, row.previousSearches7d)}</td>
                    <td className="py-4">{row.uniqueSearchers7d}</td>
                    <td className="py-4">{row.eventViews7d}</td>
                    <td className="py-4">{row.saves7d}</td>
                    <td className="py-4">{row.going7d}</td>
                    <td className="py-4">{row.directions7d}</td>
                    <td className="py-4">
                      {row.hypeknightEvents} / {row.externalEvents}
                    </td>
                    <td className="py-4">
                      {row.hypeknightCoveragePercent === null
                        ? '—'
                        : `${row.hypeknightCoveragePercent}%`}
                    </td>
                    <td className="py-4">{formatHour(row.peakDiscoveryHour)}</td>
                    <td className="py-4">{row.confidenceLabel}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="border-t border-white/10 py-8 text-white/50">
                    No market-attributable observations yet. City searches and market-linked
                    event activity will begin populating this table as signals arrive.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {marketRows.slice(0, 6).map((row) => (
          <article key={row.key} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-accent">{row.key}</p>
            <h3 className="mt-2 text-2xl font-black text-white">
              {row.name || `${row.city}, ${row.state}`}
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <MiniMetric label="Searches 24h" value={row.searches24h} />
              <MiniMetric label="Searches 7d" value={row.searches7d} />
              <MiniMetric label="Zero results" value={row.zeroResultSearches7d} />
              <MiniMetric label="Low results" value={row.lowResultSearches7d} />
              <MiniMetric
                label="Avg results/search"
                value={row.averageResultsPerSearch7d ?? '—'}
              />
              <MiniMetric label="Observations" value={row.observations7d} />
              <MiniMetric
                label="Linked areas"
                value={row.id ? getMarketAreas(marketRegistry, row.id).length : '—'}
              />
              <MiniMetric
                label="Baseline readiness"
                value={row.id ? baselineByMarketId.get(row.id)?.readiness ?? 'Insufficient' : 'Insufficient'}
              />
              <MiniMetric
                label="Evidence days / 28d"
                value={row.id ? baselineByMarketId.get(row.id)?.evidenceDays28d ?? 0 : 0}
              />
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-bold text-white">Event signal ranking</h2>
        <p className="mt-2 text-sm text-white/55">
          Original V1 test bench. This is still not the public Hype Score.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="pb-3">Event</th>
                <th className="pb-3">Index</th>
                <th className="pb-3">State</th>
                <th className="pb-3">Confidence</th>
                <th className="pb-3">Signals</th>
                <th className="pb-3">Unique</th>
                <th className="pb-3">Weighted pts</th>
              </tr>
            </thead>
            <tbody>
              {eventScores.slice(0, 50).map((row) => (
                <tr key={row.eventId} className="border-t border-white/10 text-white/80">
                  <td className="py-4">
                    {row.event?.slug ? (
                      <Link
                        href={`/events/${row.event.slug}`}
                        className="font-semibold text-white hover:text-accent"
                      >
                        {row.event.name}
                      </Link>
                    ) : (
                      row.eventId
                    )}
                    {row.event ? (
                      <div className="mt-1 text-xs text-white/40">
                        {row.event.city}, {row.event.state}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-4 text-xl font-black text-accent">{row.score}</td>
                  <td className="py-4">{row.label}</td>
                  <td className="py-4">{Math.round(row.confidence * 100)}%</td>
                  <td className="py-4">{row.signalCount}</td>
                  <td className="py-4">{row.uniqueActors}</td>
                  <td className="py-4">{row.weightedPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-bold text-white">Signal mix</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {topTypes.map(([type, count]) => (
            <div key={type} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">{type}</p>
              <p className="mt-1 text-sm text-white/55">{count} signals</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
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
  if (hour === null) return '—';
  const date = new Date(2000, 0, 1, hour, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric' });
}
