import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildMarketRegistry, getMarketAreas } from '@/lib/markets/registry';
import {
  createMarket,
  linkMarketArea,
  overrideRecordMarket,
  saveFeaturedInventory,
  setFeaturedInventoryEnabled,
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

  const [marketsResult, areasResult, eventsResult, venuesResult, featuredResult] = await Promise.all([
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
    supabase
      .from('featured_inventory')
      .select('id, market_id, feature_date, capacity, unit_price, enabled')
      .order('feature_date', { ascending: true }),
  ]);

  if (marketsResult.error) throw new Error(marketsResult.error.message);
  if (areasResult.error) throw new Error(areasResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (venuesResult.error) throw new Error(venuesResult.error.message);
  if (featuredResult.error) throw new Error(featuredResult.error.message);

  const registry = buildMarketRegistry(marketsResult.data ?? [], areasResult.data ?? []);
  const markets = Array.from(registry.marketsById.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const marketNameById = new Map(markets.map((market) => [market.id, market.name]));

  const featuredByMarketId = new Map<
    string,
    {
      id: string;
      market_id: string;
      feature_date: string;
      capacity: number;
      unit_price: number | string;
      enabled: boolean;
    }[]
  >();

  for (const row of featuredResult.data ?? []) {
    const rows = featuredByMarketId.get(row.market_id) ?? [];
    rows.push(row);
    featuredByMarketId.set(row.market_id, rows);
  }

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
          const featuredRows = featuredByMarketId.get(market.id) ?? [];

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

              <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-accent">
                      Featured Calendar
                    </p>
                    <h3 className="mt-2 text-lg font-black text-white">
                      Market/date inventory
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-white/55">
                      Featured is limited inventory controlled by HypeKnight. Set the
                      capacity and price available for an individual market date.
                    </p>
                  </div>

                  <span className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">
                    {featuredRows.length} configured date{featuredRows.length === 1 ? '' : 's'}
                  </span>
                </div>

                <form
                  action={saveFeaturedInventory}
                  className="mt-5 grid gap-3 md:grid-cols-[1fr_120px_140px_auto] md:items-end"
                >
                  <input type="hidden" name="market_id" value={market.id} />

                  <Field label="Featured date">
                    <input
                      type="date"
                      name="feature_date"
                      required
                      disabled={!market.timezone}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Capacity">
                    <input
                      type="number"
                      name="capacity"
                      min="1"
                      step="1"
                      defaultValue="3"
                      required
                      disabled={!market.timezone}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Price">
                    <input
                      type="number"
                      name="unit_price"
                      min="0"
                      step="0.01"
                      placeholder="5.00"
                      required
                      disabled={!market.timezone}
                      className={inputClass}
                    />
                  </Field>

                  <button
                    disabled={!market.timezone}
                    className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    Save date
                  </button>
                </form>

                {!market.timezone ? (
                  <p className="mt-3 text-sm text-amber-300">
                    Configure the market timezone before creating Featured inventory.
                  </p>
                ) : null}

                <div className="mt-5 space-y-2">
                  {featuredRows.length ? (
                    featuredRows.map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                          <div>
                            <p className="font-bold text-white">{row.feature_date}</p>
                            <p className="text-xs text-white/45">Featured date</p>
                          </div>

                          <div>
                            <p className="font-semibold text-white">{row.capacity}</p>
                            <p className="text-xs text-white/45">Capacity</p>
                          </div>

                          <div>
                            <p className="font-semibold text-white">
                              ${Number(row.unit_price).toFixed(2)}
                            </p>
                            <p className="text-xs text-white/45">Per placement</p>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              row.enabled
                                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                                : 'border-white/10 bg-white/5 text-white/45'
                            }`}
                          >
                            {row.enabled ? 'Available' : 'Disabled'}
                          </span>
                        </div>

                        <form action={setFeaturedInventoryEnabled}>
                          <input type="hidden" name="inventory_id" value={row.id} />
                          <input
                            type="hidden"
                            name="enabled"
                            value={row.enabled ? 'false' : 'true'}
                          />
                          <button
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10"
                          >
                            {row.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </form>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/45">
                      No Featured inventory has been configured for this market.
                    </div>
                  )}
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
