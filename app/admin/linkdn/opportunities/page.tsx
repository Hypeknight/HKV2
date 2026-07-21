import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  cancelLinkdNInvitation,
  createLinkdNInvitation,
  createLinkdNOpportunity,
  reserveLinkdNConnection,
} from './actions';

export default async function AdminLinkdNOpportunitiesPage() {
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

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const [
    { data: rooms, error: roomsError },
    { data: participants, error: participantsError },
    { data: opportunities, error: opportunitiesError },
    { data: invitations, error: invitationsError },
    { data: connections, error: connectionsError },
  ] = await Promise.all([
    supabase
      .from('linkdn_rooms')
      .select(`
        id,
        name,
        status,
        minimum_pulse_score,
        scheduled_start_at
      `)
      .in('status', [
        'scheduled',
        'setup_required',
        'preparing',
        'waiting_for_readiness',
        'connection_eligible',
        'inviting',
        'ready',
        'live'
      ])
      .order('scheduled_start_at', {
        ascending: true,
        nullsFirst: false,
      }),

    supabase
      .from('linkdn_room_events')
      .select(`
        id,
        room_id,
        event_id,
        status,
        role,
        connection_minutes,
        whole_night_allowed,
        event:events(
          id,
          name,
          venue_id,
          venue_name,
          city,
          state,
          event_start_at
        ),
        readiness:linkdn_event_readiness(
          id,
          commercial_ready,
          technical_ready,
          audience_ready,
          readiness_status
        ),
        room:linkdn_rooms(
          id,
          name,
          status,
          minimum_pulse_score
        )
      `)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('linkdn_opportunities')
      .select(`
        *,
        event:events(
          id,
          name,
          venue_name,
          city,
          state
        ),
        room:linkdn_rooms(
          id,
          name,
          status
        )
      `)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('linkdn_invitations')
      .select(`
        *,
        event:events(
          id,
          name,
          venue_name,
          city,
          state
        ),
        room:linkdn_rooms(
          id,
          name,
          status
        )
      `)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('linkdn_connections')
      .select(`
        id,
        room_id,
        event_id,
        venue_id,
        status,
        scheduled_start_at,
        scheduled_end_at,
        maximum_minutes,
        event:events(
          id,
          name,
          venue_name
        ),
        room:linkdn_rooms(
          id,
          name
        )
      `)
      .order('created_at', {
        ascending: false,
      }),
  ]);

  if (roomsError) throw new Error(roomsError.message);
  if (participantsError) throw new Error(participantsError.message);
  if (opportunitiesError) throw new Error(opportunitiesError.message);
  if (invitationsError) throw new Error(invitationsError.message);
  if (connectionsError) throw new Error(connectionsError.message);

  const participantRows = (participants || []).map((row: any) => ({
    ...row,
    event: Array.isArray(row.event) ? row.event[0] : row.event,
    room: Array.isArray(row.room) ? row.room[0] : row.room,
    readiness: Array.isArray(row.readiness)
      ? row.readiness[0] || null
      : row.readiness,
  }));

  const invitationByRoomEvent = new Map(
    (invitations || []).map((invitation) => [
      `${invitation.room_id}:${invitation.event_id}`,
      invitation,
    ])
  );

  const readyParticipants = participantRows.filter(
    (row) =>
      row.readiness?.commercial_ready &&
      row.readiness?.technical_ready &&
      row.readiness?.audience_ready
  );

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/linkdn"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Linkd&apos;N Admin
        </Link>
      </div>

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Linkd&apos;N Matching
        </p>

        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          Opportunities and invitations
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          Turn qualified Patron Pulse activity into room invitations,
          owner acceptance, and reserved connection windows.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Ready Participants"
            value={String(readyParticipants.length)}
          />
          <Metric
            label="Opportunities"
            value={String(opportunities?.length || 0)}
          />
          <Metric
            label="Pending Invitations"
            value={String(
              (invitations || []).filter(
                (item) => item.status === 'pending'
              ).length
            )}
          />
          <Metric
            label="Reserved Connections"
            value={String(
              (connections || []).filter(
                (item) => item.status === 'reserved'
              ).length
            )}
          />
        </div>
      </section>

      <Panel
        eyebrow="Create Match"
        title="Manual opportunity"
      >
        <form
          action={createLinkdNOpportunity}
          className="grid gap-4 lg:grid-cols-2"
        >
          <label>
            <span className={labelClass}>
              Ready event
            </span>

            <select
              name="source_event_id"
              required
              className={fieldClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select event
              </option>

              {readyParticipants.map((row) => (
                <option
                  key={row.event_id}
                  value={row.event_id}
                >
                  {row.event?.name || 'Untitled Event'}
                  {' — '}
                  {row.room?.name || 'Room'}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>
              Venue
            </span>

            <select
              name="source_venue_id"
              required
              className={fieldClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select venue
              </option>

              {readyParticipants.map((row) => (
                <option
                  key={`${row.event_id}:${row.event?.venue_id}`}
                  value={row.event?.venue_id || ''}
                >
                  {row.event?.venue_name ||
                    row.event?.name ||
                    'Venue'}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>
              Target room
            </span>

            <select
              name="target_room_id"
              required
              className={fieldClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select room
              </option>

              {(rooms || []).map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>
              Expires
            </span>

            <input
              type="datetime-local"
              name="expires_at"
              className={fieldClass}
            />
          </label>

          <label className="lg:col-span-2">
            <span className={labelClass}>
              Match reason
            </span>

            <textarea
              name="reason"
              rows={3}
              className={fieldClass}
              placeholder="Why this event is a good fit for the room."
            />
          </label>

          <button className={primaryButtonClass}>
            Create Opportunity
          </button>
        </form>
      </Panel>

      <Panel
        eyebrow="Qualified Events"
        title="Invitation queue"
      >
        <div className="space-y-4">
          {participantRows.length ? (
            participantRows.map((row) => {
              const invitation =
                invitationByRoomEvent.get(
                  `${row.room_id}:${row.event_id}`
                );

              const isReady =
                row.readiness?.commercial_ready &&
                row.readiness?.technical_ready &&
                row.readiness?.audience_ready;

              return (
                <article
                  key={row.id}
                  className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Chip
                          label={row.room?.name || 'Room'}
                        />
                        <Chip label={formatLabel(row.status)} />
                        <Chip
                          label={
                            isReady
                              ? 'Connection Ready'
                              : 'Not Ready'
                          }
                        />
                      </div>

                      <h3 className="mt-3 text-2xl font-black text-white">
                        {row.event?.name || 'Untitled Event'}
                      </h3>

                      <p className="mt-2 text-sm text-white/50">
                        {[
                          row.event?.venue_name,
                          row.event?.city,
                          row.event?.state,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>

                    <div className="min-w-[280px]">
                      {!invitation ||
                      ['declined', 'cancelled', 'expired'].includes(
                        invitation.status
                      ) ? (
                        <form
                          action={createLinkdNInvitation}
                          className="grid gap-3"
                        >
                          <input
                            type="hidden"
                            name="room_id"
                            value={row.room_id}
                          />
                          <input
                            type="hidden"
                            name="event_id"
                            value={row.event_id}
                          />
                          <input
                            type="hidden"
                            name="venue_id"
                            value={row.event?.venue_id || ''}
                          />

                          <textarea
                            name="message"
                            rows={3}
                            className={fieldClass}
                            placeholder="Invitation message"
                          />

                          <button
                            disabled={!isReady}
                            className={primaryButtonClass}
                          >
                            Send Invitation
                          </button>
                        </form>
                      ) : invitation.status === 'pending' ? (
                        <div>
                          <Chip label="Invitation Pending" />

                          <form
                            action={cancelLinkdNInvitation}
                            className="mt-3"
                          >
                            <input
                              type="hidden"
                              name="invitation_id"
                              value={invitation.id}
                            />
                            <input
                              type="hidden"
                              name="room_id"
                              value={row.room_id}
                            />
                            <input
                              type="hidden"
                              name="event_id"
                              value={row.event_id}
                            />

                            <button className={secondaryButtonClass}>
                              Cancel Invitation
                            </button>
                          </form>
                        </div>
                      ) : invitation.status === 'accepted' ? (
                        <form
                          action={reserveLinkdNConnection}
                          className="grid gap-3"
                        >
                          <input
                            type="hidden"
                            name="room_id"
                            value={row.room_id}
                          />
                          <input
                            type="hidden"
                            name="event_id"
                            value={row.event_id}
                          />
                          <input
                            type="hidden"
                            name="venue_id"
                            value={row.event?.venue_id || ''}
                          />

                          <label>
                            <span className={labelClass}>
                              Connection start
                            </span>
                            <input
                              type="datetime-local"
                              name="scheduled_start_at"
                              className={fieldClass}
                            />
                          </label>

                          <label>
                            <span className={labelClass}>
                              Connection end
                            </span>
                            <input
                              type="datetime-local"
                              name="scheduled_end_at"
                              className={fieldClass}
                            />
                          </label>

                          <button className={primaryButtonClass}>
                            Reserve Connection
                          </button>
                        </form>
                      ) : (
                        <Chip
                          label={`Invitation ${formatLabel(
                            invitation.status
                          )}`}
                        />
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <Empty text="No Linkd'N room participants are available." />
          )}
        </div>
      </Panel>

      <Panel
        eyebrow="History"
        title="Opportunities"
      >
        <div className="space-y-3">
          {(opportunities || []).length ? (
            opportunities!.map((item: any) => {
              const event = Array.isArray(item.event)
                ? item.event[0]
                : item.event;
              const room = Array.isArray(item.room)
                ? item.room[0]
                : item.room;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Chip label={formatLabel(item.status)} />
                        <Chip
                          label={`${item.compatibility_score}% Match`}
                        />
                        <Chip
                          label={`${item.pulse_score_at_creation} Pulse`}
                        />
                      </div>

                      <h3 className="mt-3 text-xl font-black text-white">
                        {event?.name || 'Event'} →{' '}
                        {room?.name || 'Room'}
                      </h3>

                      {item.reason ? (
                        <p className="mt-2 text-sm text-white/55">
                          {item.reason}
                        </p>
                      ) : null}
                    </div>

                    <time className="text-xs text-white/35">
                      {formatDate(item.created_at)}
                    </time>
                  </div>
                </div>
              );
            })
          ) : (
            <Empty text="No opportunities have been created." />
          )}
        </div>
      </Panel>

      <Panel
        eyebrow="Reserved Capacity"
        title="Connections"
      >
        <div className="space-y-3">
          {(connections || []).length ? (
            connections!.map((connection: any) => {
              const event = Array.isArray(connection.event)
                ? connection.event[0]
                : connection.event;
              const room = Array.isArray(connection.room)
                ? connection.room[0]
                : connection.room;

              return (
                <Link
                  key={connection.id}
                  href={`/admin/linkdn/connections/${connection.id}`}
                  className="block rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-accent/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Chip
                        label={formatLabel(connection.status)}
                      />

                      <h3 className="mt-3 text-xl font-black text-white">
                        {event?.name || 'Event'} ·{' '}
                        {room?.name || 'Room'}
                      </h3>

                      <p className="mt-2 text-sm text-white/50">
                        {connection.maximum_minutes
                          ? `${connection.maximum_minutes} minutes`
                          : 'Whole-night or custom duration'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-white/40">
                        {connection.scheduled_start_at
                          ? formatDate(
                              connection.scheduled_start_at
                            )
                          : 'Start not scheduled'}
                      </p>

                      <p className="mt-3 text-sm font-semibold text-accent">
                        Open Connection Control →
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <Empty text="No connections have been reserved." />
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

const labelClass =
  'mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45';

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/50';

const primaryButtonClass =
  'w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40';

const secondaryButtonClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-semibold text-white';