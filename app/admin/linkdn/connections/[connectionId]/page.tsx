import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  transitionLinkdNConnection,
  updateLinkdNConnectionSchedule,
} from '../actions';

type Props = {
  params: Promise<{
    connectionId: string;
  }>;
};

export default async function AdminLinkdNConnectionPage({
  params,
}: Props) {
  const { connectionId } = await params;
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
    { data: connection, error: connectionError },
    { data: usage, error: usageError },
    { data: activity, error: activityError },
  ] = await Promise.all([
    supabase
      .from('linkdn_connections')
      .select(`
        *,
        room:linkdn_rooms(
          id,
          name,
          status,
          experience_type,
          minimum_pulse_score,
          retention_pulse_score
        ),
        event:events(
          id,
          name,
          slug,
          venue_id,
          venue_name,
          city,
          state
        )
      `)
      .eq('id', connectionId)
      .single(),

    supabase
      .from('linkdn_connection_usage')
      .select('*')
      .eq('connection_id', connectionId)
      .maybeSingle(),

    supabase
      .from('linkdn_activity_log')
      .select(`
        id,
        action,
        actor_role,
        from_status,
        to_status,
        note,
        created_at
      `)
      .eq('connection_id', connectionId)
      .order('created_at', {
        ascending: false,
      })
      .limit(100),
  ]);

  if (connectionError || !connection) {
    notFound();
  }

  if (usageError) {
    throw new Error(usageError.message);
  }

  if (activityError) {
    throw new Error(activityError.message);
  }

  const room = Array.isArray(connection.room)
    ? connection.room[0]
    : connection.room;

  const event = Array.isArray(connection.event)
    ? connection.event[0]
    : connection.event;

  const nextActions =
    getNextActions(connection.status);

  return (
    <section className="mx-auto max-w-[1300px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/linkdn/opportunities"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Opportunities
        </Link>

        <Link
          href={`/admin/linkdn/${connection.room_id}`}
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          Open Room Operations
        </Link>
      </div>

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Linkd&apos;N Connection Control
        </p>

        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          {event?.name || 'Connection'}
        </h1>

        <p className="mt-4 text-white/60">
          {room?.name || 'Linkd’N Room'}
          {' · '}
          {event?.venue_name || 'Venue'}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Status"
            value={formatLabel(connection.status)}
          />
          <Metric
            label="Room"
            value={room?.name || '—'}
          />
          <Metric
            label="Experience"
            value={formatLabel(
              room?.experience_type ||
                'connection'
            )}
          />
          <Metric
            label="Reserved Minutes"
            value={String(
              usage?.minutes_reserved ??
                connection.maximum_minutes ??
                0
            )}
          />
          <Metric
            label="Consumed"
            value={
              usage?.connect_consumed
                ? 'Yes'
                : 'No'
            }
          />
        </div>
      </section>

      <Panel
        eyebrow="Lifecycle"
        title="Connection controls"
      >
        {nextActions.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {nextActions.map((action) => (
              <form
                key={action.status}
                action={transitionLinkdNConnection}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <input
                  type="hidden"
                  name="connection_id"
                  value={connection.id}
                />
                <input
                  type="hidden"
                  name="status"
                  value={action.status}
                />

                <h3 className="text-xl font-black text-white">
                  {action.label}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  {action.description}
                </p>

                {action.requiresNote ? (
                  <textarea
                    name="note"
                    rows={3}
                    className={`${fieldClass} mt-4`}
                    placeholder="Reason or operational note"
                    required
                  />
                ) : (
                  <input
                    type="hidden"
                    name="note"
                    value={action.defaultNote}
                  />
                )}

                <button
                  className={`mt-4 w-full rounded-2xl px-5 py-3 font-semibold ${
                    action.danger
                      ? 'border border-red-500/20 bg-red-500/10 text-red-100'
                      : 'bg-accent text-black'
                  }`}
                >
                  {action.label}
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/55">
            This connection is in a terminal state.
          </div>
        )}
      </Panel>

      <Panel
        eyebrow="Configuration"
        title="Schedule and transport"
      >
        <form
          action={updateLinkdNConnectionSchedule}
          className="grid gap-4 md:grid-cols-2"
        >
          <input
            type="hidden"
            name="connection_id"
            value={connection.id}
          />
          <input
            type="hidden"
            name="room_id"
            value={connection.room_id}
          />
          <input
            type="hidden"
            name="event_id"
            value={connection.event_id}
          />

          <label>
            <span className={labelClass}>
              Scheduled start
            </span>
            <input
              type="datetime-local"
              name="scheduled_start_at"
              defaultValue={toDateTimeLocal(
                connection.scheduled_start_at
              )}
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
              defaultValue={toDateTimeLocal(
                connection.scheduled_end_at
              )}
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Maximum minutes
            </span>
            <input
              type="number"
              min={1}
              name="maximum_minutes"
              defaultValue={
                connection.maximum_minutes ?? ''
              }
              placeholder="Whole night"
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Transport provider
            </span>
            <input
              name="transport_provider"
              defaultValue={
                connection.transport_provider ||
                ''
              }
              placeholder="LiveKit, test room, etc."
              className={fieldClass}
            />
          </label>

          <label className="md:col-span-2">
            <span className={labelClass}>
              Transport room reference
            </span>
            <input
              name="transport_room_reference"
              defaultValue={
                connection.transport_room_reference ||
                ''
              }
              placeholder="Provider room ID or internal reference"
              className={fieldClass}
            />
          </label>

          <button className={primaryButtonClass}>
            Save Connection Configuration
          </button>
        </form>
      </Panel>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          eyebrow="Usage"
          title="Connection consumption"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric
              label="Minutes Reserved"
              value={String(
                usage?.minutes_reserved || 0
              )}
            />
            <Metric
              label="Minutes Consumed"
              value={String(
                usage?.minutes_consumed || 0
              )}
            />
            <Metric
              label="Connect Reserved"
              value={
                usage?.connect_reserved
                  ? 'Yes'
                  : 'No'
              }
            />
            <Metric
              label="Connect Consumed"
              value={
                usage?.connect_consumed
                  ? 'Yes'
                  : 'No'
              }
            />
          </div>

          {usage?.consumption_reason ? (
            <p className="mt-5 text-sm leading-6 text-white/60">
              {usage.consumption_reason}
            </p>
          ) : null}
        </Panel>

        <Panel
          eyebrow="Runtime"
          title="Timing"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Info
              label="Started"
              value={formatDate(
                connection.started_at
              )}
            />
            <Info
              label="Paused"
              value={formatDate(
                connection.paused_at
              )}
            />
            <Info
              label="Resumed"
              value={formatDate(
                connection.resumed_at
              )}
            />
            <Info
              label="Ended"
              value={formatDate(
                connection.ended_at
              )}
            />
          </div>

          {connection.failure_reason ? (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100/75">
              {connection.failure_reason}
            </div>
          ) : null}
        </Panel>
      </section>

      <Panel
        eyebrow="History"
        title="Connection timeline"
      >
        <div className="space-y-4">
          {(activity || []).length ? (
            activity!.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">
                      {formatLabel(item.action)}
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      {formatLabel(item.actor_role)}
                      {item.from_status ||
                      item.to_status ? (
                        <>
                          {' · '}
                          {item.from_status
                            ? formatLabel(
                                item.from_status
                              )
                            : 'Created'}
                          {' → '}
                          {item.to_status
                            ? formatLabel(
                                item.to_status
                              )
                            : 'Updated'}
                        </>
                      ) : null}
                    </p>

                    {item.note ? (
                      <p className="mt-3 text-sm text-white/60">
                        {item.note}
                      </p>
                    ) : null}
                  </div>

                  <time className="text-xs text-white/35">
                    {formatDate(item.created_at)}
                  </time>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/55">
              No connection activity has been recorded.
            </div>
          )}
        </div>
      </Panel>
    </section>
  );
}

function getNextActions(status: string) {
  const actions: Record<
    string,
    Array<{
      status: string;
      label: string;
      description: string;
      requiresNote?: boolean;
      defaultNote?: string;
      danger?: boolean;
    }>
  > = {
    reserved: [
      {
        status: 'waiting',
        label: 'Move to Waiting',
        description:
          'Place the participant in the pre-connection waiting state.',
      },
      {
        status: 'testing',
        label: 'Begin Connection Test',
        description:
          'Begin audio, video, network, and operator verification.',
      },
      {
        status: 'cancelled',
        label: 'Cancel Connection',
        description:
          'Cancel this reservation before it begins.',
        requiresNote: true,
        danger: true,
      },
    ],
    waiting: [
      {
        status: 'testing',
        label: 'Begin Testing',
        description:
          'Start the technical connection test.',
      },
      {
        status: 'ready',
        label: 'Mark Ready',
        description:
          'Confirm the participant is ready to connect.',
      },
      {
        status: 'cancelled',
        label: 'Cancel Connection',
        description:
          'Cancel this waiting connection.',
        requiresNote: true,
        danger: true,
      },
    ],
    testing: [
      {
        status: 'ready',
        label: 'Pass Test',
        description:
          'Confirm testing passed and the connection is ready.',
      },
      {
        status: 'failed',
        label: 'Fail Test',
        description:
          'Record a technical failure.',
        requiresNote: true,
        danger: true,
      },
      {
        status: 'cancelled',
        label: 'Cancel Connection',
        description:
          'Cancel this connection during testing.',
        requiresNote: true,
        danger: true,
      },
    ],
    ready: [
      {
        status: 'live',
        label: 'Go Live',
        description:
          'Open the active Linkd’N connection.',
      },
      {
        status: 'testing',
        label: 'Return to Testing',
        description:
          'Perform another technical verification.',
      },
      {
        status: 'cancelled',
        label: 'Cancel Connection',
        description:
          'Cancel before the connection goes live.',
        requiresNote: true,
        danger: true,
      },
    ],
    live: [
      {
        status: 'paused',
        label: 'Pause Connection',
        description:
          'Temporarily pause the live experience.',
      },
      {
        status: 'reconnecting',
        label: 'Reconnect',
        description:
          'Move into recovery after a connection interruption.',
        requiresNote: true,
      },
      {
        status: 'ended',
        label: 'End Connection',
        description:
          'Complete the live connection and consume usage.',
      },
      {
        status: 'failed',
        label: 'Mark Failed',
        description:
          'End the connection because of a technical failure.',
        requiresNote: true,
        danger: true,
      },
    ],
    paused: [
      {
        status: 'live',
        label: 'Resume Live',
        description:
          'Resume the paused connection.',
      },
      {
        status: 'reconnecting',
        label: 'Begin Reconnection',
        description:
          'Troubleshoot and recover the connection.',
        requiresNote: true,
      },
      {
        status: 'ended',
        label: 'End Connection',
        description:
          'End the paused connection.',
      },
      {
        status: 'failed',
        label: 'Mark Failed',
        description:
          'End the connection because it cannot resume.',
        requiresNote: true,
        danger: true,
      },
    ],
    reconnecting: [
      {
        status: 'live',
        label: 'Restore Live Connection',
        description:
          'Confirm recovery and return to live.',
      },
      {
        status: 'failed',
        label: 'Reconnection Failed',
        description:
          'End after unsuccessful recovery.',
        requiresNote: true,
        danger: true,
      },
      {
        status: 'ended',
        label: 'End Connection',
        description:
          'Close the experience instead of reconnecting.',
      },
    ],
    failed: [
      {
        status: 'testing',
        label: 'Retry Testing',
        description:
          'Attempt to recover a failed connection.',
      },
      {
        status: 'cancelled',
        label: 'Cancel Permanently',
        description:
          'Close the failed reservation.',
        requiresNote: true,
        danger: true,
      },
    ],
  };

  return actions[status] || [];
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

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function toDateTimeLocal(
  value?: string | null
) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset =
    date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

const labelClass =
  'mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45';

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/50';

const primaryButtonClass =
  'rounded-2xl bg-accent px-6 py-3 font-semibold text-black';