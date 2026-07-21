import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  addEventToLinkdNRoom,
  refreshLinkdNReadiness,
  removeEventFromLinkdNRoom,
  updateLinkdNReadiness,
  updateLinkdNRoom,
} from '../actions';

type Props = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function AdminLinkdNRoomPage({
  params,
}: Props) {
  const { roomId } = await params;
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
    { data: room, error: roomError },
    { data: participants, error: participantError },
    { data: readinessRows, error: readinessError },
    { data: candidateEvents, error: eventError },
    { data: snapshots, error: snapshotError },
  ] = await Promise.all([
    supabase
      .from('linkdn_rooms')
      .select(`
        *,
        tier:system_tiers(
          id,
          name,
          slug,
          rank
        )
      `)
      .eq('id', roomId)
      .single(),

    supabase
      .from('linkdn_room_events')
      .select(`
        *,
        event:events(
          id,
          name,
          slug,
          venue_id,
          venue_name,
          city,
          state,
          event_start_at,
          event_end_at,
          owner_id
        ),
        tier:system_tiers(
          id,
          name,
          slug,
          rank
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', {
        ascending: true,
      }),

    supabase
      .from('linkdn_event_readiness')
      .select(`
        *,
        event:events(
          id,
          name,
          slug,
          venue_name,
          city,
          state
        ),
        hardware:linkdn_hardware_profiles(
          id,
          name,
          certification_status,
          camera_ready,
          audio_ready,
          display_ready,
          network_ready,
          operator_ready
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', {
        ascending: true,
      }),

    supabase
      .from('events')
      .select(`
        id,
        name,
        slug,
        venue_id,
        venue_name,
        city,
        state,
        event_start_at,
        status
      `)
      .not('venue_id', 'is', null)
      .in('status', [
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

    supabase
      .from('linkdn_readiness_snapshots')
      .select(`
        id,
        event_id,
        checked_in_count,
        active_user_count,
        unique_responder_count,
        response_rate,
        response_velocity,
        recent_activity_score,
        pulse_score,
        commercial_ready,
        technical_ready,
        audience_ready,
        captured_at
      `)
      .eq('room_id', roomId)
      .order('captured_at', {
        ascending: false,
      })
      .limit(100),
  ]);

  if (roomError || !room) {
    notFound();
  }

  if (participantError) {
    throw new Error(participantError.message);
  }

  if (readinessError) {
    throw new Error(readinessError.message);
  }

  if (eventError) {
    throw new Error(eventError.message);
  }

  if (snapshotError) {
    throw new Error(snapshotError.message);
  }

  const tier = Array.isArray(room.tier)
    ? room.tier[0]
    : room.tier;

  const participantEventIds = new Set(
    (participants || []).map(
      (participant) => participant.event_id
    )
  );

  const availableEvents = (
    candidateEvents || []
  ).filter(
    (event) => !participantEventIds.has(event.id)
  );

  const readinessByEvent = new Map(
    (readinessRows || []).map((row) => [
      row.event_id,
      row,
    ])
  );

  const latestSnapshotByEvent = new Map<
    string,
    any
  >();

  for (const snapshot of snapshots || []) {
    if (
      !latestSnapshotByEvent.has(
        snapshot.event_id
      )
    ) {
      latestSnapshotByEvent.set(
        snapshot.event_id,
        snapshot
      );
    }
  }

  const readyCount = (
    readinessRows || []
  ).filter(
    (row) =>
      row.commercial_ready &&
      row.technical_ready &&
      row.audience_ready
  ).length;

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/linkdn"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Linkd&apos;N Admin
        </Link>

        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/65">
          {formatLabel(room.status)}
        </span>
      </div>

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Linkd&apos;N Room Operations
        </p>

        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          {room.name}
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          {room.description ||
            'Configure the room, assign events, verify technical readiness, and monitor Patron Pulse activity before opening connections.'}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Tier"
            value={tier?.name || 'Unknown'}
          />
          <Metric
            label="Experience"
            value={formatLabel(
              room.experience_type
            )}
          />
          <Metric
            label="Participants"
            value={String(
              participants?.length || 0
            )}
          />
          <Metric
            label="Connection Ready"
            value={String(readyCount)}
          />
          <Metric
            label="Pulse Threshold"
            value={String(
              room.minimum_pulse_score
            )}
          />
        </div>
      </section>

      <Panel
        eyebrow="Room Configuration"
        title="Operating rules"
      >
        <form
          action={updateLinkdNRoom}
          className="grid gap-4 lg:grid-cols-2"
        >
          <input
            type="hidden"
            name="room_id"
            value={room.id}
          />

          <label>
            <span className={labelClass}>
              Room name
            </span>
            <input
              name="name"
              required
              defaultValue={room.name}
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Status
            </span>
            <select
              name="status"
              defaultValue={room.status}
              className={fieldClass}
            >
              {[
                'draft',
                'scheduled',
                'setup_required',
                'preparing',
                'waiting_for_readiness',
                'connection_eligible',
                'inviting',
                'ready',
                'live',
                'paused',
                'ended',
                'cancelled',
                'archived',
              ].map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {formatLabel(status)}
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
              defaultValue={
                room.experience_type
              }
              className={fieldClass}
            >
              {[
                'open_connection',
                'dj_battle',
                'dance_battle',
                'trivia',
                'karaoke',
                'sports_prediction',
                'shared_countdown',
                'city_challenge',
                'custom',
              ].map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {formatLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>
              Connection minutes
            </span>
            <input
              type="number"
              min={1}
              name="connection_duration_minutes"
              defaultValue={
                room.connection_duration_minutes ??
                ''
              }
              placeholder="Whole night"
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Minimum venues
            </span>
            <input
              type="number"
              min={2}
              name="minimum_venues"
              defaultValue={room.minimum_venues}
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Maximum venues
            </span>
            <input
              type="number"
              min={2}
              name="maximum_venues"
              defaultValue={room.maximum_venues}
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Minimum Pulse score
            </span>
            <input
              type="number"
              min={0}
              max={100}
              name="minimum_pulse_score"
              defaultValue={
                room.minimum_pulse_score
              }
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Retention Pulse score
            </span>
            <input
              type="number"
              min={0}
              max={100}
              name="retention_pulse_score"
              defaultValue={
                room.retention_pulse_score
              }
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
              defaultValue={toDateTimeLocal(
                room.scheduled_start_at
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
                room.scheduled_end_at
              )}
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
              defaultValue={
                room.description || ''
              }
              className={fieldClass}
            />
          </label>

          <label className="lg:col-span-2">
            <span className={labelClass}>
              Admin note
            </span>
            <textarea
              name="admin_note"
              rows={3}
              defaultValue={
                room.admin_note || ''
              }
              className={fieldClass}
            />
          </label>

          <Toggle
            name="whole_night_enabled"
            label="Whole-night room"
            defaultChecked={
              room.whole_night_enabled
            }
          />

          <button className={primaryButtonClass}>
            Save Room Configuration
          </button>
        </form>
      </Panel>

      <Panel
        eyebrow="Participation"
        title="Add an event"
      >
        <form
          action={addEventToLinkdNRoom}
          className="grid gap-4 lg:grid-cols-[1fr_220px_auto]"
        >
          <input
            type="hidden"
            name="room_id"
            value={room.id}
          />

          <select
            name="event_id"
            required
            className={fieldClass}
            defaultValue=""
          >
            <option value="" disabled>
              Select eligible event
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
                  .join(', ')}
              </option>
            ))}
          </select>

          <select
            name="role"
            className={fieldClass}
            defaultValue="participant"
          >
            <option value="host">Host</option>
            <option value="participant">
              Participant
            </option>
            <option value="judge">Judge</option>
            <option value="observer">
              Observer
            </option>
          </select>

          <button className={primaryButtonClass}>
            Add to Room
          </button>
        </form>

        {!availableEvents.length ? (
          <p className="mt-4 text-sm text-white/45">
            No additional eligible events are available.
          </p>
        ) : null}
      </Panel>

      <Panel
        eyebrow="Readiness"
        title="Participating events"
      >
        <div className="space-y-5">
          {(participants || []).length ? (
            participants!.map(
              (participant: any) => {
                const event = Array.isArray(
                  participant.event
                )
                  ? participant.event[0]
                  : participant.event;

                const participantTier =
                  Array.isArray(participant.tier)
                    ? participant.tier[0]
                    : participant.tier;

                const readiness =
                  readinessByEvent.get(
                    participant.event_id
                  );

                const snapshot =
                  latestSnapshotByEvent.get(
                    participant.event_id
                  );

                return (
                  <article
                    key={participant.id}
                    className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Chip
                            label={
                              participantTier?.name ||
                              'Tier'
                            }
                          />
                          <Chip
                            label={formatLabel(
                              participant.role
                            )}
                          />
                          <Chip
                            label={formatLabel(
                              participant.status
                            )}
                          />
                        </div>

                        <h3 className="mt-3 text-2xl font-black text-white">
                          {event?.name ||
                            'Untitled Event'}
                        </h3>

                        <p className="mt-2 text-sm text-white/50">
                          {[
                            event?.venue_name,
                            event?.city,
                            event?.state,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[560px]">
                        <ReadinessMetric
                          label="Commercial"
                          ready={
                            readiness
                              ?.commercial_ready ||
                            false
                          }
                        />
                        <ReadinessMetric
                          label="Technical"
                          ready={
                            readiness
                              ?.technical_ready ||
                            false
                          }
                        />
                        <ReadinessMetric
                          label="Audience"
                          ready={
                            readiness
                              ?.audience_ready ||
                            false
                          }
                        />
                        <Metric
                          label="Pulse"
                          value={String(
                            snapshot?.pulse_score ??
                              0
                          )}
                        />
                      </div>
                    </div>

                    {readiness ? (
                      <form
                        action={updateLinkdNReadiness}
                        className="mt-6 grid gap-4 lg:grid-cols-2"
                      >
                        <input
                          type="hidden"
                          name="readiness_id"
                          value={readiness.id}
                        />
                        <input
                          type="hidden"
                          name="room_id"
                          value={room.id}
                        />

                        <Toggle
                          name="commercial_ready"
                          label="Commercially ready"
                          defaultChecked={
                            readiness.commercial_ready
                          }
                        />
                        <Toggle
                          name="technical_ready"
                          label="Technical test passed"
                          defaultChecked={
                            readiness.technical_ready
                          }
                        />
                        <Toggle
                          name="audience_ready"
                          label="Audience ready override"
                          defaultChecked={
                            readiness.audience_ready
                          }
                        />

                        <label>
                          <span className={labelClass}>
                            Connection test
                          </span>
                          <input
                            type="datetime-local"
                            name="connection_test_scheduled_at"
                            defaultValue={toDateTimeLocal(
                              readiness.connection_test_scheduled_at
                            )}
                            className={fieldClass}
                          />
                        </label>

                        <label>
                          <span className={labelClass}>
                            Blocker
                          </span>
                          <input
                            name="blocker_reason"
                            defaultValue={
                              readiness.blocker_reason ||
                              ''
                            }
                            className={fieldClass}
                          />
                        </label>

                        <label>
                          <span className={labelClass}>
                            Admin note
                          </span>
                          <input
                            name="admin_note"
                            defaultValue={
                              readiness.admin_note ||
                              ''
                            }
                            className={fieldClass}
                          />
                        </label>

                        <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white">
                          Save Readiness
                        </button>
                      </form>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <form
                        action={refreshLinkdNReadiness}
                      >
                        <input
                          type="hidden"
                          name="room_id"
                          value={room.id}
                        />
                        <input
                          type="hidden"
                          name="event_id"
                          value={
                            participant.event_id
                          }
                        />
                        <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black">
                          Recalculate Pulse Readiness
                        </button>
                      </form>

                      <form
                        action={removeEventFromLinkdNRoom}
                      >
                        <input
                          type="hidden"
                          name="room_id"
                          value={room.id}
                        />
                        <input
                          type="hidden"
                          name="event_id"
                          value={
                            participant.event_id
                          }
                        />
                        <button className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 font-semibold text-red-100">
                          Remove from Room
                        </button>
                      </form>
                    </div>
                  </article>
                );
              }
            )
          ) : (
            <Empty text="No events have been assigned to this room." />
          )}
        </div>
      </Panel>

      <Panel
        eyebrow="Pulse Intelligence"
        title="Latest readiness snapshots"
      >
        <div className="space-y-3">
          {(snapshots || []).length ? (
            snapshots!.slice(0, 20).map(
              (snapshot) => (
                <div
                  key={snapshot.id}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-4 lg:grid-cols-8"
                >
                  <Info
                    label="Event"
                    value={snapshot.event_id.slice(
                      0,
                      8
                    )}
                  />
                  <Info
                    label="Checked In"
                    value={String(
                      snapshot.checked_in_count
                    )}
                  />
                  <Info
                    label="Active"
                    value={String(
                      snapshot.active_user_count
                    )}
                  />
                  <Info
                    label="Responders"
                    value={String(
                      snapshot.unique_responder_count
                    )}
                  />
                  <Info
                    label="Rate"
                    value={`${snapshot.response_rate}%`}
                  />
                  <Info
                    label="Velocity"
                    value={String(
                      snapshot.response_velocity
                    )}
                  />
                  <Info
                    label="Pulse"
                    value={String(
                      snapshot.pulse_score
                    )}
                  />
                  <Info
                    label="Captured"
                    value={formatDate(
                      snapshot.captured_at
                    )}
                  />
                </div>
              )
            )
          ) : (
            <Empty text="No readiness snapshots have been captured." />
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

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
      {label}
    </span>
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
      <p className="text-xs uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-1 text-sm text-white/70">
        {value}
      </p>
    </div>
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

const labelClass =
  'mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45';

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/50';

const primaryButtonClass =
  'rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90';