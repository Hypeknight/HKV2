'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  return { supabase, user };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function refresh({
  connectionId,
  roomId,
  eventId,
}: {
  connectionId: string;
  roomId: string;
  eventId: string;
}) {
  revalidatePath('/admin/linkdn/opportunities');
  revalidatePath(`/admin/linkdn/${roomId}`);
  revalidatePath(
    `/admin/linkdn/connections/${connectionId}`
  );
  revalidatePath(
    `/dashboard/events/${eventId}/linkdn`
  );
}

const allowedTransitions: Record<
  string,
  string[]
> = {
  reserved: ['waiting', 'testing', 'cancelled'],
  waiting: ['testing', 'ready', 'cancelled'],
  testing: ['ready', 'failed', 'cancelled'],
  ready: ['live', 'testing', 'cancelled'],
  live: ['paused', 'reconnecting', 'ended', 'failed'],
  paused: ['live', 'reconnecting', 'ended', 'failed'],
  reconnecting: ['live', 'failed', 'ended'],
  failed: ['testing', 'cancelled'],
  ended: [],
  cancelled: [],
};

export async function transitionLinkdNConnection(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const connectionId = text(
    formData,
    'connection_id'
  );
  const requestedStatus = text(
    formData,
    'status'
  );
  const note = text(formData, 'note') || null;

  if (!connectionId || !requestedStatus) {
    throw new Error(
      'Connection and target status are required.'
    );
  }

  const { data: connection, error: connectionError } =
    await supabase
      .from('linkdn_connections')
      .select(`
        id,
        room_id,
        event_id,
        venue_id,
        status,
        started_at,
        paused_at,
        resumed_at,
        ended_at,
        maximum_minutes,
        minimum_billable_seconds
      `)
      .eq('id', connectionId)
      .single();

  if (connectionError || !connection) {
    throw new Error(
      connectionError?.message ||
        'Linkd’N connection not found.'
    );
  }

  const validTargets =
    allowedTransitions[connection.status] || [];

  if (!validTargets.includes(requestedStatus)) {
    throw new Error(
      `Cannot move a connection from ${connection.status} to ${requestedStatus}.`
    );
  }

  const nowIso = new Date().toISOString();

  const payload: Record<string, unknown> = {
    status: requestedStatus,
    updated_at: nowIso,
  };

  if (requestedStatus === 'live') {
    if (!connection.started_at) {
      payload.started_at = nowIso;
    } else {
      payload.resumed_at = nowIso;
    }

    payload.paused_at = null;
    payload.ended_at = null;
    payload.failure_reason = null;
    payload.disconnect_reason = null;
  }

  if (requestedStatus === 'testing') {
    payload.ended_at = null;
    payload.failure_reason = null;
    payload.disconnect_reason = null;
  }

  if (requestedStatus === 'paused') {
    payload.paused_at = nowIso;
  }

  if (requestedStatus === 'reconnecting') {
    payload.disconnect_reason =
      note || 'Connection temporarily interrupted.';
  }

  if (requestedStatus === 'failed') {
    payload.failure_reason =
      note || 'Connection failed.';
    payload.ended_at = nowIso;
  }

  if (
    requestedStatus === 'ended' ||
    requestedStatus === 'cancelled'
  ) {
    payload.ended_at = nowIso;

    if (requestedStatus === 'cancelled') {
      payload.disconnect_reason =
        note || 'Connection cancelled.';
    }
  }

  const { error: updateError } = await supabase
    .from('linkdn_connections')
    .update(payload)
    .eq('id', connectionId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await syncConnectionRelatedStates({
    supabase,
    connection,
    requestedStatus,
    note,
    actorId: user.id,
    nowIso,
  });

  refresh({
    connectionId,
    roomId: connection.room_id,
    eventId: connection.event_id,
  });
}

async function syncConnectionRelatedStates({
  supabase,
  connection,
  requestedStatus,
  note,
  actorId,
  nowIso,
}: {
  supabase: any;
  connection: {
    id: string;
    room_id: string;
    event_id: string;
    venue_id: string;
    status: string;
    started_at: string | null;
    minimum_billable_seconds: number;
  };
  requestedStatus: string;
  note: string | null;
  actorId: string;
  nowIso: string;
}) {
  let participantStatus = 'waiting';
  let roomStatus: string | null = null;

  switch (requestedStatus) {
    case 'testing':
      participantStatus = 'testing';
      roomStatus = 'preparing';
      break;
    case 'ready':
      participantStatus = 'connection_ready';
      roomStatus = 'ready';
      break;
    case 'live':
      participantStatus = 'participating';
      roomStatus = 'live';
      break;
    case 'paused':
    case 'reconnecting':
      participantStatus = 'disconnected';
      roomStatus = 'paused';
      break;
    case 'ended':
      participantStatus = 'completed';
      break;
    case 'failed':
      participantStatus = 'disconnected';
      break;
    case 'cancelled':
      participantStatus = 'removed';
      break;
  }

  const updates = [
    supabase
      .from('linkdn_room_events')
      .update({
        status: participantStatus,
        updated_at: nowIso,
      })
      .eq('room_id', connection.room_id)
      .eq('event_id', connection.event_id),

    supabase
      .from('linkdn_room_venues')
      .update({
        participation_status:
          participantStatus,
        connected_at:
          requestedStatus === 'live'
            ? nowIso
            : undefined,
        disconnected_at:
          [
            'paused',
            'reconnecting',
            'failed',
            'ended',
            'cancelled',
          ].includes(requestedStatus)
            ? nowIso
            : undefined,
        updated_at: nowIso,
      })
      .eq('room_id', connection.room_id)
      .eq('event_id', connection.event_id),
  ];

  if (roomStatus) {
    updates.push(
      supabase
        .from('linkdn_rooms')
        .update({
          status: roomStatus,
          updated_at: nowIso,
        })
        .eq('id', connection.room_id)
    );
  }

  const results = await Promise.all(updates);
  const stateError = results.find(
    (result) => result.error
  )?.error;

  if (stateError) {
    throw new Error(stateError.message);
  }

  if (
    ['ended', 'failed', 'cancelled'].includes(
      requestedStatus
    )
  ) {
    await reconcileLinkdNRoomStatus({
      supabase,
      roomId: connection.room_id,
      nowIso,
    });
  }

  if (
    requestedStatus === 'ended' ||
    requestedStatus === 'failed' ||
    requestedStatus === 'cancelled'
  ) {
    await finalizeConnectionUsage({
      supabase,
      connection,
      requestedStatus,
      nowIso,
    });
  }

  const { error: logError } = await supabase
    .from('linkdn_activity_log')
    .insert({
      room_id: connection.room_id,
      event_id: connection.event_id,
      venue_id: connection.venue_id,
      connection_id: connection.id,
      actor_id: actorId,
      actor_role: 'admin',
      action: 'connection_status_changed',
      from_status: connection.status,
      to_status: requestedStatus,
      note,
    });

  if (logError) {
    console.error(
      'Unable to log Linkd’N connection transition:',
      logError.message
    );
  }
}

async function reconcileLinkdNRoomStatus({
  supabase,
  roomId,
  nowIso,
}: {
  supabase: any;
  roomId: string;
  nowIso: string;
}) {
  const { data: roomConnections, error } =
    await supabase
      .from('linkdn_connections')
      .select('status')
      .eq('room_id', roomId);

  if (error) {
    throw new Error(error.message);
  }

  const statuses = (roomConnections || []).map(
    (row: { status: string }) => row.status
  );

  const hasLive = statuses.some((status: string) =>
    ['live'].includes(status)
  );

  const hasPaused = statuses.some((status: string) =>
    ['paused', 'reconnecting'].includes(status)
  );

  const hasReady = statuses.some((status: string) =>
    ['ready'].includes(status)
  );

  const hasPreparing = statuses.some((status: string) =>
    ['reserved', 'waiting', 'testing'].includes(status)
  );

  const allTerminal =
    statuses.length > 0 &&
    statuses.every((status: string) =>
      ['ended', 'failed', 'cancelled'].includes(status)
    );

  const nextRoomStatus = hasLive
    ? 'live'
    : hasPaused
      ? 'paused'
      : hasReady
        ? 'ready'
        : hasPreparing
          ? 'preparing'
          : allTerminal
            ? 'ended'
            : null;

  if (!nextRoomStatus) {
    return;
  }

  const { error: roomError } = await supabase
    .from('linkdn_rooms')
    .update({
      status: nextRoomStatus,
      updated_at: nowIso,
    })
    .eq('id', roomId);

  if (roomError) {
    throw new Error(roomError.message);
  }
}

async function finalizeConnectionUsage({
  supabase,
  connection,
  requestedStatus,
  nowIso,
}: {
  supabase: any;
  connection: {
    id: string;
    started_at: string | null;
    minimum_billable_seconds: number;
  };
  requestedStatus: string;
  nowIso: string;
}) {
  const startedAt = connection.started_at
    ? new Date(connection.started_at)
    : null;

  const endedAt = new Date(nowIso);

  const elapsedSeconds = startedAt
    ? Math.max(
        0,
        Math.floor(
          (endedAt.getTime() -
            startedAt.getTime()) /
            1000
        )
      )
    : 0;

  const minutesConsumed =
    elapsedSeconds > 0
      ? Math.ceil(elapsedSeconds / 60)
      : 0;

  const shouldConsumeConnect =
    requestedStatus === 'ended' ||
    (requestedStatus === 'failed' &&
      elapsedSeconds >=
        connection.minimum_billable_seconds);

  const consumptionReason =
    requestedStatus === 'cancelled'
      ? 'Connection cancelled before completion.'
      : requestedStatus === 'failed' &&
          !shouldConsumeConnect
        ? 'Failed inside grace period; connect not consumed.'
        : requestedStatus === 'failed'
          ? 'Failed after minimum billable duration.'
          : 'Connection completed.';

  const { error } = await supabase
    .from('linkdn_connection_usage')
    .update({
      minutes_consumed: minutesConsumed,
      connect_consumed: shouldConsumeConnect,
      consumption_reason: consumptionReason,
      updated_at: nowIso,
    })
    .eq('connection_id', connection.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateLinkdNConnectionSchedule(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const connectionId = text(
    formData,
    'connection_id'
  );
  const roomId = text(formData, 'room_id');
  const eventId = text(formData, 'event_id');

  if (!connectionId || !roomId || !eventId) {
    throw new Error(
      'Missing connection information.'
    );
  }

  const { error } = await supabase
    .from('linkdn_connections')
    .update({
      scheduled_start_at:
        text(
          formData,
          'scheduled_start_at'
        ) || null,
      scheduled_end_at:
        text(formData, 'scheduled_end_at') ||
        null,
      maximum_minutes:
        text(formData, 'maximum_minutes')
          ? Number(
              text(
                formData,
                'maximum_minutes'
              )
            )
          : null,
      transport_provider:
        text(
          formData,
          'transport_provider'
        ) || null,
      transport_room_reference:
        text(
          formData,
          'transport_room_reference'
        ) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId);

  if (error) {
    throw new Error(error.message);
  }

  refresh({
    connectionId,
    roomId,
    eventId,
  });
}