import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildMarketRegistry, getMarketAreas } from '@/lib/markets/registry';
import {
  createMarket,
  linkMarketArea,
  overrideRecordMarket,
  setMarketTimezone,
} from './actions';

/**
 * INTELLIGENCE V2.1 — MARKET REGISTRY MANAGEMENT
 *
 * This page keeps the V2 registry audit view and adds the operational controls
 * needed to maintain geography without code changes:
 * - create a new market,
 * - add/move a city or suburb into a market,
 * - override one venue/event when it is an exceptional case.
 */
export default async function AdminMarketRegistryPage() {
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

  const [marketsResult, areasResult, eventsResult, venuesResult] = await Promise.all([
    supabase
      .from('markets')
      .select('id, market_key, name, primary_city, primary_state, timezone, status, source, first_seen_at, last_seen_at')
      .order('name'),
    supabase
      .from('market_areas')
      .select('id, market_id, city, state, normalized_city, normalized_state, area_type, is_primary, priority, assignment_method, confidence, is_active')
      .eq('is_active', true)
      .order('priority'),
    supabase
      .from('events')
      .select('id, name, city, state, market_id')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('venues')
      .select('id, name, city, state, market_id')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (marketsResult.error) throw new Error(marketsResult.error.message);
  if (areasResult.error) throw new Error(areasResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (venuesResult.error) throw new Error(venuesResult.error.message);

  const registry = buildMarketRegistry(marketsResult.data ?? [], areasResult.data ?? []);
  const markets = Array.from(registry.marketsById.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const marketNameById = new Map(markets.map((market) => [market.id, market.name]));

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/admin" className="text-white/60 hover:text-accent">
          ← Admin
        </Link>
        <Link href="/admin/intelligence" className="text-white/60 hover:text-accent">
          Intelligence Lab
        </Link>
      </div>

      <section className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Market Registry V2.1</p>
        <h1 className="mt-3 text-4xl font-black text-white">Manage metro markets and linked areas</h1>
        <p className="mt-4 max-w-4xl text-white/70">
          Events and venues keep their real city/state. This registry controls the metro market used
          for discovery and intelligence. Known areas assign automatically; new geography can be
          reviewed and attached here without changing application code.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Registered markets" value={markets.length} />
        <Metric label="Linked areas" value={areasResult.data?.length ?? 0} />
        <Metric
          label="Observed candidates"
          value={markets.filter((market) => market.status === 'observed').length}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Create Market" description="Create a new metro/market and its primary city.">
          <form action={createMarket} className="grid gap-4 sm:grid-cols-2">
            <Field label="Market name">
              <input name="name" required placeholder="Tulsa Metro" className={inputClass} />
            </Field>
            <Field label="Status">
              <select name="status" defaultValue="observed" className={inputClass}>
                <option value="observed">Observed</option>
                <option value="tracked">Tracked</option>
                <option value="active">Active</option>
                <option value="supported">Supported</option>
              </select>
            </Field>
            <Field label="Primary city">
              <input name="primary_city" required placeholder="Tulsa" className={inputClass} />
            </Field>
            <Field label="State">
              <input name="primary_state" required placeholder="OK" maxLength={30} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <button className={buttonClass}>Create market</button>
            </div>
          </form>
        </AdminPanel>

        <AdminPanel
          title="Add / Move Market Area"
          description="Attach a city or suburb to a metro. Matching historical records are reassigned automatically."
        >
          <form action={linkMarketArea} className="grid gap-4 sm:grid-cols-2">
            <Field label="Destination market">
              <select name="market_key" required className={inputClass}>
                {markets.map((market) => (
                  <option key={market.id} value={market.key}>{market.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Area type">
              <select name="area_type" defaultValue="suburb" className={inputClass}>
                <option value="city">City</option>
                <option value="suburb">Suburb</option>
                <option value="district">District</option>
                <option value="unincorporated">Unincorporated</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="City / area">
              <input name="city" required placeholder="Blue Springs" className={inputClass} />
            </Field>
            <Field label="State">
              <input name="state" required placeholder="MO" maxLength={30} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <button className={buttonClass}>Save market area</button>
            </div>
          </form>
        </AdminPanel>
      </section>

      <AdminPanel
        title="Exceptional Record Override"
        description="Use only when one event or venue belongs to a different market than its city-wide mapping."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <RecordOverrideForm
            title="Event override"
            recordType="event"
            records={(eventsResult.data ?? []).map((row) => ({
              id: row.id,
              label: `${row.name} — ${row.city || 'Unknown'}, ${row.state || ''}`,
              market: row.market_id ? marketNameById.get(row.market_id) ?? 'Unknown market' : 'Unassigned',
            }))}
            markets={markets}
          />
          <RecordOverrideForm
            title="Venue override"
            recordType="venue"
            records={(venuesResult.data ?? []).map((row) => ({
              id: row.id,
              label: `${row.name} — ${row.city || 'Unknown'}, ${row.state || ''}`,
              market: row.market_id ? marketNameById.get(row.market_id) ?? 'Unknown market' : 'Unassigned',
            }))}
            markets={markets}
          />
        </div>
      </AdminPanel>

      <section className="space-y-5">
        {markets.map((market) => {
          const areas = getMarketAreas(registry, market.id);
          return (
            <article key={market.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-accent">{market.key}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{market.name}</h2>
                  <p className="mt-2 text-sm text-white/55">Primary: {market.city}, {market.state}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-white/70">
                    {market.status || 'observed'}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-white/70">
                    {areas.length} area{areas.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      Market timezone
                    </p>
                    <p className="mt-2 font-semibold text-white">
                      {market.timezone || 'Not configured'}
                    </p>
                    {!market.timezone ? (
                      <p className="mt-1 text-sm text-amber-300">
                        Date-specific commerce unavailable until a timezone is configured.
                      </p>
                    ) : null}
                  </div>

                  <form action={setMarketTimezone} className="flex w-full max-w-md gap-2">
                    <input type="hidden" name="market_key" value={market.key} />
                    <input
                      name="timezone"
                      required
                      defaultValue={market.timezone || ''}
                      placeholder="America/Chicago"
                      className={inputClass}
                    />
                    <button className={buttonClass}>Save</button>
                  </form>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {areas.length ? areas.map((area) => (
                  <span key={`${area.city}-${area.state}`} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/75">
                    {area.city}, {area.state}{area.is_primary ? ' · primary' : ''}
                  </span>
                )) : <p className="text-sm text-white/45">No active linked areas.</p>}
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

function RecordOverrideForm({
  title,
  recordType,
  records,
  markets,
}: {
  title: string;
  recordType: 'event' | 'venue';
  records: { id: string; label: string; market: string }[];
  markets: { id: string; key: string; name: string }[];
}) {
  return (
    <form action={overrideRecordMarket} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="font-bold text-white">{title}</h3>
      <input type="hidden" name="record_type" value={recordType} />
      <Field label={recordType === 'event' ? 'Recent event' : 'Recent venue'}>
        <select name="record_id" required className={inputClass}>
          <option value="">Select…</option>
          {records.map((record) => (
            <option key={record.id} value={record.id}>{record.label} · Current: {record.market}</option>
          ))}
        </select>
      </Field>
      <Field label="Override market">
        <select name="market_key" required className={inputClass}>
          <option value="">Select…</option>
          {markets.map((market) => <option key={market.id} value={market.key}>{market.name}</option>)}
        </select>
      </Field>
      <button className={buttonClass}>Apply override</button>
    </form>
  );
}

function AdminPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-2 text-sm text-white/55">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm text-white/70"><span>{label}</span>{children}</label>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent';
const buttonClass = 'rounded-xl bg-accent px-5 py-3 font-bold text-black transition hover:opacity-90';
