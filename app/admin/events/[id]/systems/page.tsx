import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  changeEventSystemTier,
  grantEventSystemAccess,
  setEventSystemEnabled,
} from './actions';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEventSystemsPage({
  params,
}: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const [
    { data: event, error: eventError },
    { data: systems, error: systemsError },
    { data: tiers, error: tiersError },
    { data: purchases, error: purchasesError },
    { data: activations, error: activationsError },
  ] = await Promise.all([
    supabase
      .from('events')
      .select(`
        id,
        slug,
        name,
        owner_id,
        venue_id,
        venue_name,
        city,
        state,
        event_start_at,
        status
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('platform_systems')
      .select(`
        id,
        slug,
        name,
        status,
        public_enabled
      `)
      .in('slug', [
        'patron-pulse',
        'linkdn'
      ])
      .order('name'),

    supabase
      .from('system_tiers')
      .select(`
        id,
        system_id,
        name,
        slug,
        rank,
        status
      `)
      .order('rank', {
        ascending: true,
      }),

    supabase
      .from('event_system_purchases')
      .select(`
        id,
        event_id,
        system_id,
        tier_id,
        purchase_status,
        qualification_status,
        qualification_reason,
        starts_at,
        ends_at
      `)
      .eq('event_id', id),

    supabase
      .from('event_system_activations')
      .select(`
        id,
        event_id,
        system_id,
        effective_tier_id,
        entitlement_source,
        status,
        enabled,
        starts_at,
        ends_at
      `)
      .eq('event_id', id),
  ]);

  if (eventError || !event) {
    notFound();
  }

  if (systemsError) {
    throw new Error(systemsError.message);
  }

  if (tiersError) {
    throw new Error(tiersError.message);
  }

  if (purchasesError) {
    throw new Error(purchasesError.message);
  }

  if (activationsError) {
    throw new Error(activationsError.message);
  }

  const tiersBySystem = new Map<string, any[]>();

  for (const tier of tiers || []) {
    const current =
      tiersBySystem.get(tier.system_id) || [];

    current.push(tier);
    tiersBySystem.set(tier.system_id, current);
  }

  const tierById = new Map(
    (tiers || []).map((tier) => [
      tier.id,
      tier,
    ])
  );

  const purchaseBySystem = new Map(
    (purchases || []).map((item) => [
      item.system_id,
      item,
    ])
  );

  const activationBySystem = new Map(
    (activations || []).map((item) => [
      item.system_id,
      item,
    ])
  );

  return (
    <section className="mx-auto max-w-[1300px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/admin/events/${event.id}`}
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Event Admin
        </Link>

        {event.slug ? (
          <Link
            href={`/events/${event.slug}`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white"
          >
            View Public Event
          </Link>
        ) : null}
      </div>

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Event Systems Access
        </p>

        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          {event.name || 'Untitled Event'}
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          Grant, change, disable, or restore Patron Pulse and
          Linkd&apos;N access for this event.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Event Status"
            value={formatLabel(event.status)}
          />
          <Metric
            label="Venue"
            value={event.venue_name || 'Not Assigned'}
          />
          <Metric
            label="Patron Pulse"
            value={getSystemSummary(
              systems || [],
              activationBySystem,
              tierById,
              'patron-pulse'
            )}
          />
          <Metric
            label="Linkd'N"
            value={getSystemSummary(
              systems || [],
              activationBySystem,
              tierById,
              'linkdn'
            )}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {(systems || []).map((system: any) => {
          const activation =
            activationBySystem.get(system.id);

          const purchase =
            purchaseBySystem.get(system.id);

          const systemTiers =
            tiersBySystem.get(system.id) || [];

          const activeTier = activation
            ? tierById.get(
                activation.effective_tier_id
              )
            : null;

          const isEnabled =
            Boolean(activation?.enabled) &&
            activation?.status !== 'cancelled';

          return (
            <Panel
              key={system.id}
              eyebrow={system.name}
              title={
                activation
                  ? 'Manage access'
                  : 'Grant access'
              }
            >
              {!systemTiers.length ? (
                <div className="mb-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100/80">
                  No tiers were found for this system. Confirm that
                  <code className="mx-1 rounded bg-black/20 px-1.5 py-0.5">
                    system_tiers.system_id
                  </code>
                  points to this system.
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Info
                  label="Activation"
                  value={
                    activation
                      ? formatLabel(
                          activation.status
                        )
                      : 'Not Granted'
                  }
                />
                <Info
                  label="Enabled"
                  value={
                    activation
                      ? isEnabled
                        ? 'Yes'
                        : 'No'
                      : '—'
                  }
                />
                <Info
                  label="Current Tier"
                  value={
                    activeTier?.name || '—'
                  }
                />
                <Info
                  label="Source"
                  value={
                    activation
                      ? formatLabel(
                          activation.entitlement_source
                        )
                      : '—'
                  }
                />
                <Info
                  label="Purchase Status"
                  value={
                    purchase
                      ? formatLabel(
                          purchase.purchase_status
                        )
                      : '—'
                  }
                />
                <Info
                  label="Qualification"
                  value={
                    purchase
                      ? formatLabel(
                          purchase.qualification_status
                        )
                      : '—'
                  }
                />
              </div>

              {!activation ? (
                <form
                  action={grantEventSystemAccess}
                  className="mt-6 grid gap-4"
                >
                  <input
                    type="hidden"
                    name="event_id"
                    value={event.id}
                  />

                  <input
                    type="hidden"
                    name="system_id"
                    value={system.id}
                  />

                  <label>
                    <span className={labelClass}>
                      Tier
                    </span>

                    <select
                      name="tier_id"
                      required
                      defaultValue=""
                      className={fieldClass}
                    >
                      <option value="" disabled>
                        Select tier
                      </option>

                      {systemTiers.map((tier: any) => (
                        <option
                          key={tier.id}
                          value={tier.id}
                        >
                          {tier.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    disabled={!systemTiers.length}
                    className={primaryButtonClass}
                  >
                    Grant {system.name}
                  </button>
                </form>
              ) : (
                <div className="mt-6 space-y-4">
                  <form
                    action={changeEventSystemTier}
                    className="grid gap-4 sm:grid-cols-[1fr_auto]"
                  >
                    <input
                      type="hidden"
                      name="event_id"
                      value={event.id}
                    />

                    <input
                      type="hidden"
                      name="system_id"
                      value={system.id}
                    />

                    <select
                      name="tier_id"
                      required
                      defaultValue={
                        activation.effective_tier_id ||
                        ''
                      }
                      className={fieldClass}
                    >
                      {systemTiers.map((tier: any) => (
                        <option
                          key={tier.id}
                          value={tier.id}
                        >
                          {tier.name}
                        </option>
                      ))}
                    </select>

                    <button className={secondaryButtonClass}>
                      Change Tier
                    </button>
                  </form>

                  <form
                    action={setEventSystemEnabled}
                  >
                    <input
                      type="hidden"
                      name="event_id"
                      value={event.id}
                    />

                    <input
                      type="hidden"
                      name="system_id"
                      value={system.id}
                    />

                    <input
                      type="hidden"
                      name="enabled"
                      value={
                        isEnabled ? 'false' : 'true'
                      }
                    />

                    <button
                      className={
                        isEnabled
                          ? dangerButtonClass
                          : primaryButtonClass
                      }
                    >
                      {isEnabled
                        ? `Disable ${system.name}`
                        : `Restore ${system.name}`}
                    </button>
                  </form>

                  {system.slug === 'patron-pulse' &&
                  isEnabled ? (
                    <Link
                      href={`/admin/patron-pulse/${event.id}`}
                      className={linkButtonClass}
                    >
                      Open Patron Pulse Controls
                    </Link>
                  ) : null}

                  {system.slug === 'linkdn' &&
                  isEnabled ? (
                    <Link
                      href="/admin/linkdn"
                      className={linkButtonClass}
                    >
                      Open Linkd&apos;N Operations
                    </Link>
                  ) : null}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </section>
  );
}

function getSystemSummary(
  systems: any[],
  activationBySystem: Map<string, any>,
  tierById: Map<string, any>,
  slug: string
) {
  const system = systems.find(
    (item) => item.slug === slug
  );

  if (!system) return 'Unavailable';

  const activation =
    activationBySystem.get(system.id);

  if (!activation) return 'Not Granted';

  const tier = tierById.get(
    activation.effective_tier_id
  );

  if (
    !activation.enabled ||
    activation.status === 'cancelled'
  ) {
    return 'Disabled';
  }

  return tier?.name || formatLabel(activation.status);
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black text-white">
        {title}
      </h2>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">
        {label}
      </p>

      <p className="mt-3 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-white/70">
        {value}
      </p>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

const labelClass =
  'mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45';

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50';

const primaryButtonClass =
  'w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40';

const secondaryButtonClass =
  'rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-semibold text-white';

const dangerButtonClass =
  'w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 font-semibold text-red-100';

const linkButtonClass =
  'block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center font-semibold text-white hover:border-accent/40';