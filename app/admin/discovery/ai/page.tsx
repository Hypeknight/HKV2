import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  acceptRecommendation,
  dismissRecommendation,
  importFromRecommendation,
  runDiscoveryRecommendationScan,
} from './actions';

export default async function AdminAIDiscoveryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    targetsResult,
    recommendationsResult,
    searchLogsResult,
    hypeEventsResult,
    externalEventsResult,
  ] = await Promise.all([
    supabase
      .from('discovery_ai_city_targets')
      .select('*')
      .order('created_at', { ascending: false }),

    supabase
      .from('discovery_ai_recommendations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),

    supabase
      .from('discovery_search_logs')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString()),

    supabase
      .from('events')
      .select('id, name, city, state, status, event_start_at')
      .in('status', ['scheduled', 'active', 'paid_awaiting_approval']),

    supabase
      .from('external_events')
      .select('id, name, city, state, status, source_code, event_start_at')
      .eq('status', 'active'),
  ]);

  if (targetsResult.error) throw new Error(targetsResult.error.message);
  if (recommendationsResult.error) throw new Error(recommendationsResult.error.message);
  if (searchLogsResult.error) throw new Error(searchLogsResult.error.message);
  if (hypeEventsResult.error) throw new Error(hypeEventsResult.error.message);
  if (externalEventsResult.error) throw new Error(externalEventsResult.error.message);

  const targets = targetsResult.data ?? [];
  const recommendations = recommendationsResult.data ?? [];
  const searchLogs = searchLogsResult.data ?? [];
  const hypeEvents = hypeEventsResult.data ?? [];
  const externalEvents = externalEventsResult.data ?? [];

  const openRecommendations = recommendations.filter((rec) => rec.status === 'open');
  const acceptedRecommendations = recommendations.filter((rec) => rec.status === 'accepted');
  const completedRecommendations = recommendations.filter((rec) => rec.status === 'completed');
  const enabledTargets = targets.filter((target) => target.is_enabled);
  const autoImportTargets = targets.filter((target) => target.auto_import_enabled);

  const citySignals = targets.map((target) => {
    const targetCity = normalize(target.city);
    const targetState = normalize(target.state);

    const searches = searchLogs.filter((log) => {
      const logCity = normalize(log.city);
      const logState = normalize(log.state);

      if (!targetCity || !logCity) return false;
      if (logCity !== targetCity) return false;

      if (targetState) return logState === targetState;
      return true;
    });

    const hypeCount = hypeEvents.filter((event) => {
      const eventCity = normalize(event.city);
      const eventState = normalize(event.state);

      if (!targetCity || !eventCity) return false;
      if (eventCity !== targetCity) return false;

      if (targetState) return eventState === targetState;
      return true;
    }).length;

    const externalCount = externalEvents.filter((event) => {
      const eventCity = normalize(event.city);
      const eventState = normalize(event.state);

      if (!targetCity || !eventCity) return false;
      if (eventCity !== targetCity) return false;

      if (targetState) return eventState === targetState;
      return true;
    }).length;

    const uniqueUsers = new Set(
      searches.map((log) => log.user_id).filter(Boolean)
    ).size;

    const searchCount = searches.length;
    const minHype = Number(target.min_hypeknight_events || 3);

    const needsInventory = hypeCount < minHype;
    const hasDemand = searchCount >= 3 || uniqueUsers >= 2;

    const signal =
      needsInventory && hasDemand
        ? 'High opportunity'
        : needsInventory
        ? 'Needs inventory'
        : hasDemand
        ? 'Demand active'
        : 'Monitoring';

    const recommendation =
      needsInventory && hasDemand
        ? 'Import external events and recruit HypeKnight event creators.'
        : needsInventory
        ? 'Inventory is below target. Consider importing or recruiting.'
        : hasDemand
        ? 'User demand is active. Keep this city warm.'
        : 'No urgent action needed.';

    return {
      ...target,
      searchCount,
      uniqueUsers,
      hypeCount,
      externalCount,
      minHype,
      needsInventory,
      hasDemand,
      signal,
      recommendation,
    };
  });

  const citySignalsSorted = citySignals.sort((a, b) => {
    const scoreA = getCitySignalScore(a);
    const scoreB = getCitySignalScore(b);
    return scoreB - scoreA;
  });

  const recentSearches = searchLogs
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 12);

  return (
    <section className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Admin Discovery
          </p>

          <h1 className="mt-3 text-4xl font-bold text-white">
            AI Discovery Control Center
          </h1>

          <p className="mt-3 max-w-3xl text-white/70">
            Monitor target cities, search demand, HypeKnight inventory, external
            coverage, and AI-assisted event discovery recommendations.
          </p>
        </div>

        <form action={runDiscoveryRecommendationScan}>
          <button
            type="submit"
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Run Discovery Scan
          </button>
        </form>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Target Cities" value={String(targets.length)} tone="blue" />
        <Metric label="Enabled Targets" value={String(enabledTargets.length)} tone="green" />
        <Metric label="Auto Import Cities" value={String(autoImportTargets.length)} tone="yellow" />
        <Metric label="Open Recommendations" value={String(openRecommendations.length)} tone="accent" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Accepted" value={String(acceptedRecommendations.length)} tone="blue" />
        <Metric label="Completed" value={String(completedRecommendations.length)} tone="green" />
        <Metric label="Search Logs 30 Days" value={String(searchLogs.length)} tone="yellow" />
        <Metric label="Tracked Hype Events" value={String(hypeEvents.length)} tone="accent" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Target City Signals"
          subtitle="Cities ranked by demand, weak inventory, and admin priority."
        >
          {citySignalsSorted.length ? (
            <div className="space-y-4">
              {citySignalsSorted.map((city) => (
                <CitySignalCard key={city.id} city={city} />
              ))}
            </div>
          ) : (
            <Empty text="No target cities configured. Add records to discovery_ai_city_targets." />
          )}
        </Panel>

        <Panel
          title="Recent Search Activity"
          subtitle="Public searches and city page lookups from the last 30 days."
        >
          {recentSearches.length ? (
            <div className="space-y-3">
              {recentSearches.map((log) => (
                <RecentSearchRow key={log.id} log={log} />
              ))}
            </div>
          ) : (
            <Empty text="No discovery searches have been logged yet." />
          )}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Open Recommendations"
          subtitle="AI-assisted recommendations awaiting admin action."
        >
          {openRecommendations.length ? (
            <div className="space-y-4">
              {openRecommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          ) : (
            <Empty text="No open recommendations. Run a discovery scan to generate suggestions." />
          )}
        </Panel>

        <Panel
          title="Closed Recommendations"
          subtitle="Accepted, dismissed, or completed recommendations."
        >
          {recommendations.filter((rec) => rec.status !== 'open').length ? (
            <div className="space-y-4">
              {recommendations
                .filter((rec) => rec.status !== 'open')
                .slice(0, 12)
                .map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} compact />
                ))}
            </div>
          ) : (
            <Empty text="No closed recommendations yet." />
          )}
        </Panel>
      </section>

      <section>
        <Panel
          title="Automation Rules"
          subtitle="Current guardrails for AI-assisted discovery."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Rule text="Auto-import should only run for cities where auto_import_enabled is true." />
            <Rule text="External events supplement HypeKnight inventory but do not replace native events." />
            <Rule text="Imported events must remain labeled by source on public event cards." />
            <Rule text="Admin recommendations should be reviewed before large-scale imports." />
          </div>
        </Panel>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/admin/discovery"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Discovery Nerve Center
        </Link>

        <Link
          href="/admin/external-events"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          External Event Manager
        </Link>

        <Link
          href="/events"
          className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
        >
          Public Events
        </Link>
      </section>
    </section>
  );
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() || '';
}

function getCitySignalScore(city: any) {
  let score = 0;

  score += city.searchCount * 3;
  score += city.uniqueUsers * 5;

  if (city.needsInventory) score += 20;
  if (city.hasDemand) score += 15;
  if (city.auto_import_enabled) score += 10;

  if (city.priority_level === 'critical') score += 40;
  if (city.priority_level === 'high') score += 25;
  if (city.priority_level === 'normal') score += 10;

  return score;
}

function CitySignalCard({ city }: { city: any }) {
  const citySlug = city.city.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <PriorityChip priority={city.priority_level} />
            <StateChip label={city.signal} active={city.hasDemand || city.needsInventory} />
            {city.auto_import_enabled ? (
              <StateChip label="Auto Import" active />
            ) : (
              <StateChip label="Manual" />
            )}
          </div>

          <h3 className="mt-4 text-2xl font-bold text-white">
            {city.city}, {city.state || '—'}
          </h3>

          <p className="mt-2 text-white/65">{city.recommendation}</p>
        </div>

        <Link
          href={`/events/city/${citySlug}`}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-white hover:border-accent/40"
        >
          View City
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Info label="Searches" value={String(city.searchCount)} />
        <Info label="Unique Users" value={String(city.uniqueUsers)} />
        <Info label="Hype Events" value={String(city.hypeCount)} />
        <Info label="External Events" value={String(city.externalCount)} />
        <Info label="Target Hype" value={String(city.minHype)} />
      </div>

      {city.preferred_keywords?.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {city.preferred_keywords.map((keyword: string) => (
            <Tag key={keyword} label={keyword} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RecommendationCard({
  rec,
  compact = false,
}: {
  rec: any;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Tag label={rec.recommendation_type} />
        <PriorityChip priority={rec.priority_level} />
        <Tag label={rec.status} />
      </div>

      <h3 className="mt-4 text-xl font-bold text-white">
        {rec.city}, {rec.state || '—'}
      </h3>

      <p className="mt-3 text-white/70">{rec.reason}</p>

      {!compact ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Info label="Searches" value={String(rec.search_count || 0)} />
            <Info label="Hype Events" value={String(rec.hypeknight_event_count || 0)} />
            <Info label="External Events" value={String(rec.external_event_count || 0)} />
          </div>

          {rec.status === 'open' ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <form action={acceptRecommendation}>
                <input type="hidden" name="recommendation_id" value={rec.id} />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-accent px-4 py-3 font-semibold text-black hover:opacity-90"
                >
                  Accept
                </button>
              </form>

              <form action={importFromRecommendation}>
                <input type="hidden" name="recommendation_id" value={rec.id} />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 font-semibold text-green-200 hover:border-green-500/40"
                >
                  Import Events
                </button>
              </form>

              <form action={dismissRecommendation}>
                <input type="hidden" name="recommendation_id" value={rec.id} />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-semibold text-red-200 hover:border-red-500/40"
                >
                  Dismiss
                </button>
              </form>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function RecentSearchRow({ log }: { log: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-semibold text-white">
        {log.city || 'No city'}, {log.state || '—'}
      </p>
      <p className="mt-1 text-sm text-white/55">
        Query: {log.search_query || '—'} • Source: {log.source_filter || 'all'} •
        Results: {log.result_count || 0}
      </p>
      <p className="mt-1 text-xs text-white/40">
        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'yellow' | 'accent' | 'blue';
}) {
  const styles =
    tone === 'green'
      ? 'border-green-500/20 bg-green-500/10'
      : tone === 'yellow'
      ? 'border-yellow-500/20 bg-yellow-500/10'
      : tone === 'accent'
      ? 'border-accent/20 bg-accent/10'
      : 'border-blue-500/20 bg-blue-500/10';

  return (
    <div className={`rounded-3xl border p-5 ${styles}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-white/65">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function Tag({ label }: { label?: string | null }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
      {label || '—'}
    </span>
  );
}

function PriorityChip({ priority }: { priority?: string | null }) {
  const tone =
    priority === 'critical'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : priority === 'high'
      ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
      : priority === 'low'
      ? 'border-white/10 bg-white/5 text-white/60'
      : 'border-blue-500/20 bg-blue-500/10 text-blue-200';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${tone}`}>
      {priority || 'normal'}
    </span>
  );
}

function StateChip({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  const tone = active
    ? 'border-accent/20 bg-accent/10 text-accent'
    : 'border-white/10 bg-white/5 text-white/60';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${tone}`}>
      {label}
    </span>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
      {text}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/60">
      {text}
    </div>
  );
}