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

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

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
      .order('priority_level', { ascending: true }),

    supabase
      .from('discovery_ai_recommendations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('discovery_search_logs')
      .select('*')
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),

    supabase
      .from('events')
      .select('id, city, state, status')
      .in('status', ['scheduled', 'active', 'paid_awaiting_approval']),

    supabase
      .from('external_events')
      .select('id, city, state, status, source_code')
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

  const citySignals = targets.map((target) => {
    const keyCity = target.city?.toLowerCase();
    const keyState = target.state?.toLowerCase();

    const searches = searchLogs.filter(
      (log) =>
        log.city?.toLowerCase() === keyCity &&
        (target.state ? log.state?.toLowerCase() === keyState : true)
    );

    const hypeCount = hypeEvents.filter(
      (event) =>
        event.city?.toLowerCase() === keyCity &&
        (target.state ? event.state?.toLowerCase() === keyState : true)
    ).length;

    const externalCount = externalEvents.filter(
      (event) =>
        event.city?.toLowerCase() === keyCity &&
        (target.state ? event.state?.toLowerCase() === keyState : true)
    ).length;

    const uniqueUsers = new Set(
      searches.map((log) => log.user_id).filter(Boolean)
    ).size;

    const needsInventory = hypeCount < Number(target.min_hypeknight_events || 3);
    const hasDemand = searches.length >= 3 || uniqueUsers >= 2;

    return {
      ...target,
      searchCount: searches.length,
      uniqueUsers,
      hypeCount,
      externalCount,
      needsInventory,
      hasDemand,
      recommendation:
        needsInventory && hasDemand
          ? 'Import external events and recruit HypeKnight events.'
          : needsInventory
          ? 'Watch inventory gap.'
          : hasDemand
          ? 'Demand is active. Keep monitoring.'
          : 'Stable / low activity.',
    };
  });

  const openRecommendations = recommendations.filter((rec) => rec.status === 'open');
  const enabledTargets = targets.filter((target) => target.is_enabled);
  const autoImportTargets = targets.filter((target) => target.auto_import_enabled);

  return (
    <section className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Admin Discovery
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          AI Discovery Control Center
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Manage target cities, watch demand signals, and guide how HypeKnight supplements event discovery.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Target Cities" value={String(targets.length)} tone="blue" />
        <Metric label="Enabled Targets" value={String(enabledTargets.length)} tone="green" />
        <Metric label="Auto Import Enabled" value={String(autoImportTargets.length)} tone="yellow" />
        <Metric label="Open Recommendations" value={String(openRecommendations.length)} tone="accent" />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">City Signals</h2>
            <p className="mt-3 max-w-2xl text-white/70">
              These signals compare user demand, HypeKnight event supply, and external event coverage.
            </p>
          </div>

          <Link
            href="/admin/discovery"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            Back to Nerve Center
          </Link>
        </div>

<form action={runDiscoveryRecommendationScan}>
  <button
    type="submit"
    className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
  >
    Run AI Discovery Scan
  </button>
</form>

        <div className="mt-8 space-y-4">
          {citySignals.length ? (
            citySignals.map((city) => <CitySignalCard key={city.id} city={city} />)
          ) : (
            <Empty text="No target cities configured yet." />
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Open AI Recommendations"
          subtitle="System-generated or admin-guided discovery actions."
        >
          {openRecommendations.length ? (
            <div className="space-y-4">
              {openRecommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          ) : (
            <Empty text="No open recommendations yet." />
          )}
        </Panel>

        <Panel
          title="Admin-Guided Automation Rules"
          subtitle="How the future import/recommendation engine should behave."
        >
          <div className="space-y-3">
            <Rule text="Auto-import only runs for cities where auto_import_enabled is true." />
            <Rule text="External events should supplement weak city inventory, not replace HypeKnight events." />
            <Rule text="Recommendations should be created before large automatic imports." />
            <Rule text="Public cards must clearly identify Ticketmaster/external source." />
          </div>
        </Panel>
      </section>
    </section>
  );
}

function CitySignalCard({ city }: { city: any }) {
  const priorityTone =
    city.priority_level === 'critical'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : city.priority_level === 'high'
      ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
      : 'border-white/10 bg-black/20 text-white/70';

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${priorityTone}`}>
              {city.priority_level}
            </span>

            {city.auto_import_enabled ? (
              <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-accent">
                Auto Import
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/60">
                Manual
              </span>
            )}
          </div>

          <h3 className="mt-4 text-2xl font-bold text-white">
            {city.city}, {city.state || '—'}
          </h3>

          <p className="mt-2 text-white/65">{city.recommendation}</p>
        </div>

        <Link
          href={`/events/city/${city.city.toLowerCase().replace(/\s+/g, '-')}`}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:border-accent/40"
        >
          View City
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Searches" value={String(city.searchCount)} />
        <Info label="Unique Users" value={String(city.uniqueUsers)} />
        <Info label="HypeKnight Events" value={String(city.hypeCount)} />
        <Info label="External Events" value={String(city.externalCount)} />
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

function RecommendationCard({ rec }: { rec: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Tag label={rec.recommendation_type} />
        <Tag label={rec.priority_level} />
        <Tag label={rec.status} />
      </div>

      <h3 className="mt-4 text-xl font-bold text-white">
        {rec.city}, {rec.state || '—'}
      </h3>

      <p className="mt-3 text-white/70">{rec.reason}</p>

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
      <p className="mt-2 text-white">{value || '—'}</p>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
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