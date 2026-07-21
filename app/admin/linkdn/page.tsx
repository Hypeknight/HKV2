import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  createLinkdNRoom,
  updateGlobalLinkdNSettings,
  updateLinkdNTierLimits,
} from './actions';

export default async function AdminLinkdNPage() {
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
    { data: settings, error: settingsError },
    { data: tiers, error: tiersError },
    { data: rooms, error: roomsError },
  ] = await Promise.all([
    supabase
      .from('platform_settings')
      .select(`
        linkdn_enabled,
        linkdn_beta_enabled,
        linkdn_sales_enabled,
        linkdn_default_tier,
        linkdn_require_pulse_readiness,
        linkdn_default_minimum_pulse_score,
        linkdn_default_retention_pulse_score,
        linkdn_require_technical_readiness,
        linkdn_require_admin_approval,
        linkdn_default_connection_minutes,
        linkdn_default_connections_per_night,
        linkdn_default_maximum_venues,
        linkdn_failed_connection_grace_seconds,
        linkdn_public_label,
        linkdn_public_description,
        linkdn_beta_notice
      `)
      .eq('id', 'global')
      .single(),

    supabase
      .from('system_tiers')
      .select(`
        id,
        slug,
        name,
        rank,
        system:platform_systems!inner(slug),
        limits:linkdn_tier_limits(*)
      `)
      .eq('system.slug', 'linkdn')
      .order('rank', { ascending: true }),

    supabase
      .from('linkdn_rooms')
      .select(`
        id,
        name,
        slug,
        experience_type,
        status,
        scheduled_start_at,
        scheduled_end_at,
        minimum_venues,
        maximum_venues,
        minimum_pulse_score,
        tier:system_tiers(name,slug),
        participants:linkdn_room_events(id)
      `)
      .order('created_at', {
        ascending: false,
      }),
  ]);

  if (settingsError || !settings) {
    throw new Error(
      settingsError?.message ||
        'Linkd’N settings were not found.'
    );
  }

  if (tiersError) {
    throw new Error(tiersError.message);
  }

  if (roomsError) {
    throw new Error(roomsError.message);
  }

  const normalizedTiers = (tiers || []).map(
    (tier: any) => ({
      ...tier,
      limits: Array.isArray(tier.limits)
        ? tier.limits[0] || null
        : tier.limits,
    })
  );

  const liveRooms = (rooms || []).filter(
    (room) => room.status === 'live'
  ).length;

  const waitingRooms = (rooms || []).filter(
    (room) =>
      room.status ===
      'waiting_for_readiness'
  ).length;

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/admin"
        className="text-sm font-semibold text-white/60 hover:text-accent"
      >
        ← Back to Admin
      </Link>

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Linkd&apos;N Administration
        </p>

        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          Build and operate connected rooms.
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          Configure global behavior, tier limits, rooms,
          participation, technical readiness, and Patron Pulse
          thresholds before physical venues are allowed to connect.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Rooms"
            value={String(rooms?.length || 0)}
          />
          <Metric
            label="Live"
            value={String(liveRooms)}
          />
          <Metric
            label="Waiting"
            value={String(waitingRooms)}
          />
          <Metric
            label="System"
            value={
              settings.linkdn_enabled
                ? 'Enabled'
                : 'Disabled'
            }
          />
        </div>
      </section>

      <Panel
        eyebrow="Global Controls"
        title="Linkd'N platform settings"
      >
        <form
          action={updateGlobalLinkdNSettings}
          className="space-y-7"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Toggle
              name="linkdn_enabled"
              label="Linkd'N enabled"
              defaultChecked={settings.linkdn_enabled}
            />
            <Toggle
              name="linkdn_beta_enabled"
              label="Beta enabled"
              defaultChecked={
                settings.linkdn_beta_enabled
              }
            />
            <Toggle
              name="linkdn_sales_enabled"
              label="Sales enabled"
              defaultChecked={
                settings.linkdn_sales_enabled
              }
            />
            <Toggle
              name="linkdn_require_admin_approval"
              label="Admin approval required"
              defaultChecked={
                settings.linkdn_require_admin_approval
              }
            />
            <Toggle
              name="linkdn_require_pulse_readiness"
              label="Pulse readiness required"
              defaultChecked={
                settings.linkdn_require_pulse_readiness
              }
            />
            <Toggle
              name="linkdn_require_technical_readiness"
              label="Technical readiness required"
              defaultChecked={
                settings.linkdn_require_technical_readiness
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <NumberField
              name="linkdn_default_minimum_pulse_score"
              label="Minimum Pulse score"
              defaultValue={
                settings.linkdn_default_minimum_pulse_score
              }
            />
            <NumberField
              name="linkdn_default_retention_pulse_score"
              label="Retention Pulse score"
              defaultValue={
                settings.linkdn_default_retention_pulse_score
              }
            />
            <NumberField
              name="linkdn_default_connection_minutes"
              label="Default connection minutes"
              defaultValue={
                settings.linkdn_default_connection_minutes
              }
            />
            <NumberField
              name="linkdn_default_connections_per_night"
              label="Connections per night"
              defaultValue={
                settings.linkdn_default_connections_per_night
              }
            />
            <NumberField
              name="linkdn_default_maximum_venues"
              label="Maximum venues"
              defaultValue={
                settings.linkdn_default_maximum_venues
              }
            />
            <NumberField
              name="linkdn_failed_connection_grace_seconds"
              label="Failure grace seconds"
              defaultValue={
                settings.linkdn_failed_connection_grace_seconds
              }
            />

            <label>
              <span className={labelClass}>
                Default tier
              </span>
              <select
                name="linkdn_default_tier"
                defaultValue={
                  settings.linkdn_default_tier
                }
                className={fieldClass}
              >
                {normalizedTiers.map((tier) => (
                  <option
                    key={tier.id}
                    value={tier.slug}
                  >
                    {tier.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>
                Public label
              </span>
              <input
                name="linkdn_public_label"
                defaultValue={
                  settings.linkdn_public_label
                }
                className={fieldClass}
              />
            </label>
          </div>

          <label>
            <span className={labelClass}>
              Public description
            </span>
            <textarea
              name="linkdn_public_description"
              rows={4}
              defaultValue={
                settings.linkdn_public_description ||
                ''
              }
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Beta notice
            </span>
            <textarea
              name="linkdn_beta_notice"
              rows={3}
              defaultValue={
                settings.linkdn_beta_notice || ''
              }
              className={fieldClass}
            />
          </label>

          <button className={primaryButtonClass}>
            Save Global Linkd&apos;N Settings
          </button>
        </form>
      </Panel>

      <Panel
        eyebrow="Packages"
        title="Tier limits"
      >
        <div className="grid gap-5 xl:grid-cols-2">
          {normalizedTiers.map((tier) => (
            <form
              key={tier.id}
              action={updateLinkdNTierLimits}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <input
                type="hidden"
                name="tier_id"
                value={tier.id}
              />

              <h3 className="text-2xl font-black text-white">
                {tier.name}
              </h3>

              <p className="mt-1 text-sm text-white/45">
                Rank {tier.rank}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <NumberField
                  name="minimum_setup_days"
                  label="Setup days"
                  defaultValue={
                    tier.limits?.minimum_setup_days ??
                    3
                  }
                />
                <NumberField
                  name="minimum_pulse_score"
                  label="Minimum Pulse score"
                  defaultValue={
                    tier.limits?.minimum_pulse_score ??
                    60
                  }
                />
                <NumberField
                  name="retention_pulse_score"
                  label="Retention score"
                  defaultValue={
                    tier.limits?.retention_pulse_score ??
                    40
                  }
                />
                <OptionalNumberField
                  name="maximum_connections_per_night"
                  label="Connects per night"
                  defaultValue={
                    tier.limits
                      ?.maximum_connections_per_night
                  }
                />
                <OptionalNumberField
                  name="maximum_connection_minutes"
                  label="Connection minutes"
                  defaultValue={
                    tier.limits
                      ?.maximum_connection_minutes
                  }
                />
                <OptionalNumberField
                  name="maximum_room_minutes"
                  label="Room minutes"
                  defaultValue={
                    tier.limits
                      ?.maximum_room_minutes
                  }
                />
                <NumberField
                  name="maximum_connected_venues"
                  label="Maximum venues"
                  defaultValue={
                    tier.limits
                      ?.maximum_connected_venues ??
                    2
                  }
                />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Toggle
                  name="whole_night_allowed"
                  label="Whole night"
                  defaultChecked={
                    tier.limits
                      ?.whole_night_allowed || false
                  }
                />
                <Toggle
                  name="audience_voting_allowed"
                  label="Audience voting"
                  defaultChecked={
                    tier.limits
                      ?.audience_voting_allowed ||
                    false
                  }
                />
                <Toggle
                  name="multi_round_allowed"
                  label="Multi-round"
                  defaultChecked={
                    tier.limits
                      ?.multi_round_allowed || false
                  }
                />
                <Toggle
                  name="judges_allowed"
                  label="Judges"
                  defaultChecked={
                    tier.limits?.judges_allowed ||
                    false
                  }
                />
                <Toggle
                  name="recording_allowed"
                  label="Recording"
                  defaultChecked={
                    tier.limits
                      ?.recording_allowed || false
                  }
                />
                <Toggle
                  name="requires_connection_test"
                  label="Connection test"
                  defaultChecked={
                    tier.limits
                      ?.requires_connection_test ??
                    true
                  }
                />
                <Toggle
                  name="requires_staff_operator"
                  label="Staff operator"
                  defaultChecked={
                    tier.limits
                      ?.requires_staff_operator ??
                    true
                  }
                />
                <Toggle
                  name="requires_admin_approval"
                  label="Admin approval"
                  defaultChecked={
                    tier.limits
                      ?.requires_admin_approval ??
                    true
                  }
                />
              </div>

              <button className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:border-accent/40">
                Save {tier.name} Limits
              </button>
            </form>
          ))}
        </div>
      </Panel>

      <Panel
        eyebrow="Create"
        title="New Linkd'N room"
      >
        <form
          action={createLinkdNRoom}
          className="grid gap-4 lg:grid-cols-2"
        >
          <label>
            <span className={labelClass}>
              Room name
            </span>
            <input
              name="name"
              required
              className={fieldClass}
              placeholder="Kansas City Friday Night"
            />
          </label>

          <label>
            <span className={labelClass}>
              Tier
            </span>
            <select
              name="tier_id"
              required
              className={fieldClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select tier
              </option>
              {normalizedTiers.map((tier) => (
                <option
                  key={tier.id}
                  value={tier.id}
                >
                  {tier.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>
              Experience type
            </span>
            <select
              name="experience_type"
              className={fieldClass}
              defaultValue="open_connection"
            >
              <option value="open_connection">
                Open Connection
              </option>
              <option value="dj_battle">
                DJ Battle
              </option>
              <option value="dance_battle">
                Dance Battle
              </option>
              <option value="trivia">
                Trivia
              </option>
              <option value="karaoke">
                Karaoke
              </option>
              <option value="sports_prediction">
                Sports Prediction
              </option>
              <option value="shared_countdown">
                Shared Countdown
              </option>
              <option value="city_challenge">
                City Challenge
              </option>
              <option value="custom">
                Custom
              </option>
            </select>
          </label>

          <label>
            <span className={labelClass}>
              Minimum venues
            </span>
            <input
              type="number"
              name="minimum_venues"
              min={2}
              defaultValue={2}
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Maximum venues
            </span>
            <input
              type="number"
              name="maximum_venues"
              min={2}
              defaultValue={2}
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Scheduled start
            </span>
            <input
              type="datetime-local"
              name="scheduled_start_at"
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Scheduled end
            </span>
            <input
              type="datetime-local"
              name="scheduled_end_at"
              className={fieldClass}
            />
          </label>

          <label className="lg:col-span-2">
            <span className={labelClass}>
              Description
            </span>
            <textarea
              name="description"
              rows={4}
              className={fieldClass}
            />
          </label>

          <Toggle
            name="whole_night_enabled"
            label="Whole-night room"
            defaultChecked={false}
          />

          <button className={primaryButtonClass}>
            Create Linkd&apos;N Room
          </button>
        </form>
      </Panel>

      <Panel
        eyebrow="Operations"
        title="Rooms"
      >
        <div className="space-y-4">
          {(rooms || []).length ? (
            rooms!.map((room: any) => {
              const tier = Array.isArray(room.tier)
                ? room.tier[0]
                : room.tier;

              return (
                <Link
                  key={room.id}
                  href={`/admin/linkdn/${room.id}`}
                  className="block rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-accent/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Chip label={tier?.name || 'Tier'} />
                        <Chip
                          label={formatLabel(room.status)}
                        />
                        <Chip
                          label={formatLabel(
                            room.experience_type
                          )}
                        />
                      </div>

                      <h3 className="mt-3 text-2xl font-black text-white">
                        {room.name}
                      </h3>

                      <p className="mt-2 text-sm text-white/50">
                        {room.participants?.length || 0}{' '}
                        participating events · Pulse threshold{' '}
                        {room.minimum_pulse_score}
                      </p>
                    </div>

                    <span className="font-semibold text-accent">
                      Open Operations →
                    </span>
                  </div>
                </Link>
              );
            })
          ) : (
            <Empty text="No Linkd'N rooms have been created." />
          )}
        </div>
      </Panel>
    </section>
  );
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
      <p className="mt-3 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
      />
      <span className="text-sm font-semibold text-white/70">
        {label}
      </span>
    </label>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        min={0}
        name={name}
        defaultValue={defaultValue}
        className={fieldClass}
      />
    </label>
  );
}

function OptionalNumberField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        min={1}
        name={name}
        defaultValue={defaultValue ?? ''}
        placeholder="Unlimited"
        className={fieldClass}
      />
    </label>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/55">
      {text}
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
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/50';

const primaryButtonClass =
  'rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90';