import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateLinkdNReadiness } from '@/lib/linkdn/service';
import { respondToLinkdNInvitation } from './actions';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventLinkdNPage({
  params,
}: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: event, error: eventError } =
    await supabase
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
        event_start_at
      `)
      .eq('id', id)
      .single();

  if (eventError || !event) notFound();
  if (event.owner_id !== user.id) {
    redirect('/dashboard/events');
  }

  const [
    { data: participation, error: participationError },
    { data: readinessRows, error: readinessError },
    { data: invitations, error: invitationsError },
    { data: connections, error: connectionsError },
  ] = await Promise.all([
    supabase
      .from('linkdn_room_events')
      .select(`
        *,
        room:linkdn_rooms(
          id,
          name,
          description,
          experience_type,
          status,
          scheduled_start_at,
          scheduled_end_at,
          minimum_pulse_score,
          retention_pulse_score,
          connection_duration_minutes,
          whole_night_enabled
        ),
        tier:system_tiers(
          id,
          name,
          slug,
          rank
        )
      `)
      .eq('event_id', event.id)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('linkdn_event_readiness')
      .select(`
        id,
        event_id,
        room_id,
        venue_id,
        commercial_ready,
        technical_ready,
        audience_ready,
        readiness_status,
        setup_deadline_at,
        connection_test_scheduled_at,
        connection_test_passed_at,
        blocker_reason,
        admin_note
      `)
      .eq('event_id', event.id),

    supabase
      .from('linkdn_invitations')
      .select(`
        *,
        room:linkdn_rooms(
          id,
          name,
          experience_type,
          status,
          scheduled_start_at
        )
      `)
      .eq('event_id', event.id)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('linkdn_connections')
      .select(`
        *,
        room:linkdn_rooms(
          id,
          name,
          experience_type
        )
      `)
      .eq('event_id', event.id)
      .order('created_at', {
        ascending: false,
      }),
  ]);

  if (participationError) {
    throw new Error(participationError.message);
  }

  if (readinessError) {
    throw new Error(readinessError.message);
  }

  if (invitationsError) {
    throw new Error(invitationsError.message);
  }

  if (connectionsError) {
    throw new Error(connectionsError.message);
  }

  const readinessByRoom = new Map(
    (readinessRows || []).map((row) => [
      row.room_id,
      row,
    ])
  );

  const participationRows = await Promise.all(
    (participation || []).map(async (row: any) => {
      const room = Array.isArray(row.room)
        ? row.room[0]
        : row.room;

      const tier = Array.isArray(row.tier)
        ? row.tier[0]
        : row.tier;

      const readinessRecord =
        readinessByRoom.get(row.room_id) || null;

      const liveReadiness =
        await calculateLinkdNReadiness({
          supabase,
          eventId: event.id,
          roomId: row.room_id,
        });

      return {
        ...row,
        room,
        tier,
        readinessRecord,
        liveReadiness,
      };
    })
  );

  return (
    <section className="mx-auto max-w-[1300px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/dashboard/events/${event.id}/review`}
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Event Mission Control
        </Link>
      </div>

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Linkd&apos;N Event Center
        </p>

        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          {event.name || 'Untitled Event'}
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          Review room assignments, readiness, invitations, and
          reserved connection windows for this event.
        </p>
      </section>

      <Panel
        eyebrow="Invitations"
        title="Connection opportunities"
      >
        <div className="space-y-4">
          {(invitations || []).length ? (
            invitations!.map((invitation: any) => {
              const room = Array.isArray(invitation.room)
                ? invitation.room[0]
                : invitation.room;

              return (
                <article
                  key={invitation.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Chip
                          label={formatLabel(
                            invitation.status
                          )}
                        />
                        <Chip
                          label={formatLabel(
                            room?.experience_type ||
                              'connection'
                          )}
                        />
                      </div>

                      <h3 className="mt-3 text-2xl font-black text-white">
                        {room?.name || 'Linkd’N Room'}
                      </h3>

                      {invitation.message ? (
                        <p className="mt-3 text-sm leading-6 text-white/60">
                          {invitation.message}
                        </p>
                      ) : null}
                    </div>

                    {invitation.status === 'pending' ? (
                      <div className="grid min-w-[280px] gap-3">
                        <form
                          action={respondToLinkdNInvitation}
                        >
                          <input
                            type="hidden"
                            name="event_id"
                            value={event.id}
                          />
                          <input
                            type="hidden"
                            name="room_id"
                            value={invitation.room_id}
                          />
                          <input
                            type="hidden"
                            name="invitation_id"
                            value={invitation.id}
                          />
                          <input
                            type="hidden"
                            name="response"
                            value="accepted"
                          />

                          <button className={primaryButtonClass}>
                            Accept Invitation
                          </button>
                        </form>

                        <form
                          action={respondToLinkdNInvitation}
                          className="grid gap-2"
                        >
                          <input
                            type="hidden"
                            name="event_id"
                            value={event.id}
                          />
                          <input
                            type="hidden"
                            name="room_id"
                            value={invitation.room_id}
                          />
                          <input
                            type="hidden"
                            name="invitation_id"
                            value={invitation.id}
                          />
                          <input
                            type="hidden"
                            name="response"
                            value="declined"
                          />

                          <input
                            name="decline_reason"
                            placeholder="Optional decline reason"
                            className={fieldClass}
                          />

                          <button className={secondaryButtonClass}>
                            Decline
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <Empty text="No Linkd'N invitations have been sent." />
          )}
        </div>
      </Panel>

      <Panel
        eyebrow="Readiness"
        title="Assigned rooms"
      >
        <div className="space-y-5">
          {participationRows.length ? (
            participationRows.map((row) => (
              <article
                key={row.id}
                className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-wrap gap-2">
                  <Chip
                    label={row.tier?.name || 'Tier'}
                  />
                  <Chip
                    label={formatLabel(row.status)}
                  />
                  <Chip
                    label={formatLabel(
                      row.room?.experience_type ||
                        'connection'
                    )}
                  />
                </div>

                <h3 className="mt-3 text-2xl font-black text-white">
                  {row.room?.name || 'Linkd’N Room'}
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <ReadinessMetric
                    label="Commercial"
                    ready={
                      row.liveReadiness
                        .commercialReady
                    }
                  />
                  <ReadinessMetric
                    label="Technical"
                    ready={
                      row.liveReadiness
                        .technicalReady
                    }
                  />
                  <ReadinessMetric
                    label="Audience"
                    ready={
                      row.liveReadiness
                        .audienceReady
                    }
                  />
                  <Metric
                    label="Pulse Score"
                    value={String(
                      row.liveReadiness.pulseScore
                    )}
                  />
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <Info
                    label="Checked In"
                    value={String(
                      row.liveReadiness
                        .checkedInCount
                    )}
                  />
                  <Info
                    label="Active Guests"
                    value={String(
                      row.liveReadiness
                        .activeUserCount
                    )}
                  />
                  <Info
                    label="Response Rate"
                    value={`${row.liveReadiness.responseRate}%`}
                  />
                </div>

                {row.readinessRecord?.blocker_reason ? (
                  <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-yellow-100/50">
                      Current Blocker
                    </p>
                    <p className="mt-2 text-sm text-yellow-100/75">
                      {
                        row.readinessRecord
                          .blocker_reason
                      }
                    </p>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <Empty text="This event has not been assigned to a Linkd'N room." />
          )}
        </div>
      </Panel>

      <Panel
        eyebrow="Schedule"
        title="Reserved connections"
      >
        <div className="space-y-4">
          {(connections || []).length ? (
            connections!.map((connection: any) => {
              const room = Array.isArray(connection.room)
                ? connection.room[0]
                : connection.room;

              return (
                <article
                  key={connection.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Chip
                        label={formatLabel(
                          connection.status
                        )}
                      />
                      <h3 className="mt-3 text-xl font-black text-white">
                        {room?.name || 'Linkd’N Room'}
                      </h3>
                      <p className="mt-2 text-sm text-white/50">
                        {connection.maximum_minutes
                          ? `${connection.maximum_minutes} minutes`
                          : 'Whole-night or custom duration'}
                      </p>
                    </div>

                    <p className="text-sm text-white/45">
                      {connection.scheduled_start_at
                        ? formatDate(
                            connection.scheduled_start_at
                          )
                        : 'Time pending'}
                    </p>
                  </div>
                </article>
              );
            })
          ) : (
            <Empty text="No Linkd'N connection has been reserved." />
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function ReadinessMetric({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        ready
          ? 'border-green-500/20 bg-green-500/10'
          : 'border-yellow-500/20 bg-yellow-500/10'
      }`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <p className="mt-2 font-black text-white">
        {ready ? 'Ready' : 'Pending'}
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
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
      <p className="mt-1 text-sm text-white/70">
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/50';

const primaryButtonClass =
  'w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black';

const secondaryButtonClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-semibold text-white';