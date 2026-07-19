import Link from 'next/link';
import { grantPatronPulseAccess } from './actions';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

export default async function AdminPatronPulsePage({
  searchParams,
}: Props) {
  const query = searchParams ? await searchParams : {};
  const search = String(query.q || '')
    .trim()
    .toLowerCase();
  const status = String(query.status || '').trim();

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

  const { data: system, error: systemError } =
    await supabase
      .from('platform_systems')
      .select('id, name, status')
      .eq('slug', 'patron-pulse')
      .single();

  if (systemError || !system) {
    throw new Error(
      systemError?.message ||
        'Patron Pulse system not found.'
    );
  }

  const [
    { data: activations, error: activationError },
    { data: sessions, error: sessionError },
    { data: tiers, error: tierError },
    { data: candidateEvents, error: eventError },
  ] = await Promise.all([
    supabase
      .from('event_system_activations')
      .select(`
        id,
        event_id,
        status,
        enabled,
        entitlement_source,
        effective_tier_id,
        starts_at,
        ends_at,
        event:events(
          id,
          name,
          slug,
          owner_id,
          venue_name,
          city,
          state,
          event_start_at
        ),
        tier:system_tiers(
          id,
          name,
          slug,
          rank
        )
      `)
      .eq('system_id', system.id)
      .order('updated_at', {
        ascending: false,
      }),

    supabase
      .from('patron_pulse_sessions')
      .select(`
        id,
        event_id,
        title,
        status,
        opened_at,
        closed_at,
        event:events(
          id,
          name,
          slug,
          venue_name,
          city,
          state,
          event_start_at
        )
      `)
      .order('updated_at', {
        ascending: false,
      }),

    supabase
      .from('system_tiers')
      .select('id, name, slug, rank')
      .eq('system_id', system.id)
      .order('rank', { ascending: true }),

    supabase
      .from('events')
      .select(`
        id,
        name,
        venue_name,
        city,
        state,
        event_start_at,
        status
      `)
      .in('status', [
        'draft',
        'building',
        'submitted',
        'approved_unpaid',
        'approved_awaiting_payment',
        'paid_awaiting_approval',
        'scheduled',
        'active',
        'live'
      ])
      .order('event_start_at', {
        ascending: true,
        nullsFirst: false,
      })
      .limit(300),
  ]);

  if (activationError) {
    throw new Error(activationError.message);
  }

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (tierError) {
    throw new Error(tierError.message);
  }

  if (eventError) {
    throw new Error(eventError.message);
  }

  const activatedEventIds = new Set(
    (activations || []).map(
      (activation) => activation.event_id
    )
  );

  const availableEvents = (
    candidateEvents || []
  ).filter(
    (event) => !activatedEventIds.has(event.id)
  );

  const sessionByEvent = new Map(
    (sessions || []).map((session) => [
      session.event_id,
      session,
    ])
  );

  let records = (activations || []).map(
    (activation: any) => ({
      activation,
      event: Array.isArray(activation.event)
        ? activation.event[0] || null
        : activation.event,
      tier: Array.isArray(activation.tier)
        ? activation.tier[0] || null
        : activation.tier,
      session: sessionByEvent.get(
        activation.event_id
      ),
    })
  );

  if (search) {
    records = records.filter((record) =>
      [
        record.event?.name,
        record.event?.venue_name,
        record.event?.city,
        record.event?.state,
        record.tier?.name,
        record.activation.entitlement_source,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }

  if (status) {
    records = records.filter(
      (record) =>
        record.activation.status === status ||
        record.session?.status === status
    );
  }

  const activeCount = records.filter(
    (record) =>
      record.activation.enabled &&
      ['ready', 'active', 'configured'].includes(
        record.activation.status
      )
  ).length;

  const openSessionCount = records.filter(
    (record) => record.session?.status === 'open'
  ).length;

  const pausedCount = records.filter(
    (record) =>
      record.session?.status === 'paused'
  ).length;

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/admin"
        className="text-sm font-semibold text-white/60 hover:text-accent"
      >
        ← Back to Admin
      </Link>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Patron Pulse Administration
        </p>

        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          Control live guest engagement.
        </h1>

        <p className="mt-4 max-w-3xl text-white/65">
          Review access, effective tiers, sessions,
          announcements, pulses, and participation without
          making direct database changes.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Configured Events"
            value={records.length}
          />
          <Metric
            label="Enabled"
            value={activeCount}
          />
          <Metric
            label="Open Sessions"
            value={openSessionCount}
          />
          <Metric
            label="Paused Sessions"
            value={pausedCount}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          Administrative Grant
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          Enable Patron Pulse for an event
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
          Grant a test, promotional, or administratively approved
          Patron Pulse tier without creating database records manually.
        </p>

        <form
          action={grantPatronPulseAccess}
          className="mt-6 grid gap-4 lg:grid-cols-[1fr_260px_220px_auto]"
        >
          <select
            name="event_id"
            required
            className={fieldClass}
            defaultValue=""
          >
            <option value="" disabled>
              Select an event
            </option>

            {availableEvents.map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {event.name || 'Untitled Event'}
                {' — '}
                {[
                  event.venue_name,
                  event.city,
                  event.state,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Location TBA'}
              </option>
            ))}
          </select>

          <select
            name="tier_id"
            required
            className={fieldClass}
            defaultValue=""
          >
            <option value="" disabled>
              Select a tier
            </option>

            {(tiers || []).map((tier) => (
              <option
                key={tier.id}
                value={tier.id}
              >
                {tier.name}
              </option>
            ))}
          </select>

          <select
            name="qualification_status"
            className={fieldClass}
            defaultValue="not_required"
          >
            <option value="not_required">
              Admin Grant
            </option>
            <option value="qualified">
              Verified Outside Event
            </option>
            <option value="admin_review">
              Administrative Review
            </option>
          </select>

          <button className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90">
            Grant Access
          </button>
        </form>

        {!availableEvents.length ? (
          <p className="mt-4 text-sm text-white/45">
            Every eligible event in the current result set already
            has a Patron Pulse activation.
          </p>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <form className="grid gap-3 lg:grid-cols-[1fr_220px_140px]">
          <input
            name="q"
            defaultValue={query.q || ''}
            placeholder="Search event, venue, city, tier..."
            className={fieldClass}
          />

          <select
            name="status"
            defaultValue={status}
            className={fieldClass}
          >
            <option value="">All Statuses</option>
            <option value="configured">
              Configured
            </option>
            <option value="ready">Ready</option>
            <option value="active">Active</option>
            <option value="open">
              Session Open
            </option>
            <option value="paused">
              Session Paused
            </option>
            <option value="closed">
              Session Closed
            </option>
            <option value="cancelled">
              Cancelled
            </option>
          </select>

          <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black">
            Filter
          </button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Event Access
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              Patron Pulse events
            </h2>
          </div>

          <p className="text-sm text-white/45">
            {tiers?.length || 0} available tiers
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {records.length ? (
            records.map((record) => (
              <Link
                key={record.activation.id}
                href={`/admin/patron-pulse/${record.event?.id}`}
                className="block rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-accent/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Chip
                        label={
                          record.tier?.name ||
                          'Unknown Tier'
                        }
                      />

                      <Chip
                        label={formatLabel(
                          record.activation.status
                        )}
                      />

                      {record.session ? (
                        <Chip
                          label={`Session: ${formatLabel(
                            record.session.status
                          )}`}
                        />
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-2xl font-black text-white">
                      {record.event?.name ||
                        'Untitled Event'}
                    </h3>

                    <p className="mt-2 text-sm text-white/55">
                      {[
                        record.event?.venue_name,
                        record.event?.city,
                        record.event?.state,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Location TBA'}
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-accent">
                    Manage →
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white/55">
              No Patron Pulse events match this filter.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
      {label}
    </span>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/50';