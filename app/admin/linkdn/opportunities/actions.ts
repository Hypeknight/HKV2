'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateLinkdNReadiness } from '@/lib/linkdn/service';

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

  if (profileError) throw new Error(profileError.message);
  if (profile?.app_role !== 'admin') redirect('/dashboard');

  return { supabase, user };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function refresh(roomId?: string) {
  revalidatePath('/admin/linkdn');
  revalidatePath('/admin/linkdn/opportunities');

  if (roomId) {
    revalidatePath(`/admin/linkdn/${roomId}`);
  }
}

export async function createLinkdNOpportunity(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const sourceEventId = text(formData, 'source_event_id');
  const sourceVenueId = text(formData, 'source_venue_id');
  const targetRoomId = text(formData, 'target_room_id');

  if (!sourceEventId || !sourceVenueId || !targetRoomId) {
    throw new Error(
      'Source event, venue, and target room are required.'
    );
  }

  const readiness = await calculateLinkdNReadiness({
    supabase,
    eventId: sourceEventId,
    roomId: targetRoomId,
  });

  const compatibilityScore = Math.min(
    100,
    Math.round(
      readiness.pulseScore * 0.7 +
        (readiness.technicalReady ? 15 : 0) +
        (readiness.commercialReady ? 15 : 0)
    )
  );

  const { error } = await supabase
    .from('linkdn_opportunities')
    .insert({
      source_event_id: sourceEventId,
      source_venue_id: sourceVenueId,
      target_room_id: targetRoomId,
      opportunity_type: 'manual',
      status: 'available',
      reason:
        text(formData, 'reason') ||
        'Created by Linkd’N administrator.',
      compatibility_score: compatibilityScore,
      pulse_score_at_creation:
        readiness.pulseScore,
      expires_at:
        text(formData, 'expires_at') || null,
      generated_by: 'admin',
      created_by: user.id,
    });

  if (error) throw new Error(error.message);

  refresh(targetRoomId);
}

export async function createLinkdNInvitation(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const roomId = text(formData, 'room_id');
  const eventId = text(formData, 'event_id');
  const venueId = text(formData, 'venue_id');
  const opportunityId =
    text(formData, 'opportunity_id') || null;

  if (!roomId || !eventId || !venueId) {
    throw new Error(
      'Room, event, and venue are required.'
    );
  }

  const { data: participant, error: participantError } =
    await supabase
      .from('linkdn_room_events')
      .select('id, status')
      .eq('room_id', roomId)
      .eq('event_id', eventId)
      .maybeSingle();

  if (participantError) {
    throw new Error(participantError.message);
  }

  if (!participant) {
    throw new Error(
      'The event must be assigned to the room before it can be invited.'
    );
  }

  const nowIso = new Date().toISOString();

  const { error: invitationError } = await supabase
    .from('linkdn_invitations')
    .upsert(
      {
        room_id: roomId,
        event_id: eventId,
        venue_id: venueId,
        opportunity_id: opportunityId,
        invited_by: user.id,
        status: 'pending',
        message: text(formData, 'message') || null,
        sent_at: nowIso,
        responded_at: null,
        expires_at:
          text(formData, 'expires_at') || null,
        updated_at: nowIso,
      },
      {
        onConflict: 'room_id,event_id,venue_id',
      }
    );

  if (invitationError) {
    throw new Error(invitationError.message);
  }

  const results = await Promise.all([
    supabase
      .from('linkdn_room_events')
      .update({
        status: 'invited',
        updated_at: nowIso,
      })
      .eq('room_id', roomId)
      .eq('event_id', eventId),

    supabase
      .from('linkdn_room_venues')
      .update({
        participation_status: 'invited',
        updated_at: nowIso,
      })
      .eq('room_id', roomId)
      .eq('event_id', eventId),

    opportunityId
      ? supabase
          .from('linkdn_opportunities')
          .update({
            status: 'reserved',
            updated_at: nowIso,
          })
          .eq('id', opportunityId)
      : Promise.resolve({ error: null }),
  ]);

  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(error.message);

  refresh(roomId);
}

export async function cancelLinkdNInvitation(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const invitationId = text(formData, 'invitation_id');
  const roomId = text(formData, 'room_id');
  const eventId = text(formData, 'event_id');

  if (!invitationId || !roomId || !eventId) {
    throw new Error('Missing invitation information.');
  }

  const nowIso = new Date().toISOString();

  const results = await Promise.all([
    supabase
      .from('linkdn_invitations')
      .update({
        status: 'cancelled',
        responded_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', invitationId),

    supabase
      .from('linkdn_room_events')
      .update({
        status: 'candidate',
        updated_at: nowIso,
      })
      .eq('room_id', roomId)
      .eq('event_id', eventId),

    supabase
      .from('linkdn_room_venues')
      .update({
        participation_status: 'candidate',
        updated_at: nowIso,
      })
      .eq('room_id', roomId)
      .eq('event_id', eventId),
  ]);

  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(error.message);

  refresh(roomId);
}

export async function reserveLinkdNConnection(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const roomId = text(formData, 'room_id');
  const eventId = text(formData, 'event_id');
  const venueId = text(formData, 'venue_id');

  if (!roomId || !eventId || !venueId) {
    throw new Error(
      'Room, event, and venue are required.'
    );
  }

  const [
    { data: readiness, error: readinessError },
    { data: participant, error: participantError },
  ] = await Promise.all([
    supabase
      .from('linkdn_event_readiness')
      .select(`
        commercial_ready,
        technical_ready,
        audience_ready,
        readiness_status
      `)
      .eq('room_id', roomId)
      .eq('event_id', eventId)
      .single(),

    supabase
      .from('linkdn_room_events')
      .select(`
        connection_minutes,
        connection_limit,
        whole_night_allowed,
        status
      `)
      .eq('room_id', roomId)
      .eq('event_id', eventId)
      .single(),
  ]);

  if (readinessError || !readiness) {
    throw new Error(
      readinessError?.message ||
        'Readiness record not found.'
    );
  }

  if (participantError || !participant) {
    throw new Error(
      participantError?.message ||
        'Room participant not found.'
    );
  }

  if (
    !readiness.commercial_ready ||
    !readiness.technical_ready ||
    !readiness.audience_ready
  ) {
    throw new Error(
      'Commercial, technical, and audience readiness must all be complete.'
    );
  }

  const todayIso = new Date()
    .toISOString()
    .slice(0, 10);

  const [
    { count: consumedCount, error: usageCountError },
    { count: activeConnectionCount, error: activeCountError },
  ] = await Promise.all([
    supabase
      .from('linkdn_connection_usage')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('event_id', eventId)
      .eq('usage_date', todayIso)
      .eq('connect_consumed', true),

    supabase
      .from('linkdn_connections')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('room_id', roomId)
      .eq('event_id', eventId)
      .in('status', [
        'reserved',
        'waiting',
        'testing',
        'ready',
        'live',
        'paused',
        'reconnecting',
      ]),
  ]);

  if (usageCountError) {
    throw new Error(usageCountError.message);
  }

  if (activeCountError) {
    throw new Error(activeCountError.message);
  }

  if (Number(activeConnectionCount || 0) > 0) {
    throw new Error(
      'This event already has an active or reserved connection in this room.'
    );
  }

  if (
    participant.connection_limit !== null &&
    Number(consumedCount || 0) >=
      participant.connection_limit
  ) {
    throw new Error(
      'This event has reached its Linkd’N connection allowance for tonight.'
    );
  }

  const nowIso = new Date().toISOString();

  const { data: connection, error: connectionError } =
    await supabase
      .from('linkdn_connections')
      .insert({
        room_id: roomId,
        event_id: eventId,
        venue_id: venueId,
        status: 'reserved',
        scheduled_start_at:
          text(formData, 'scheduled_start_at') || null,
        scheduled_end_at:
          text(formData, 'scheduled_end_at') || null,
        maximum_minutes:
          participant.whole_night_allowed
            ? null
            : participant.connection_minutes,
        created_by: user.id,
      })
      .select('id')
      .single();

  if (connectionError || !connection) {
    throw new Error(
      connectionError?.message ||
        'Unable to reserve connection.'
    );
  }

  const { data: activation } = await supabase
    .from('event_system_activations')
    .select(`
      id,
      system:platform_systems!inner(slug)
    `)
    .eq('event_id', eventId)
    .eq('system.slug', 'linkdn')
    .maybeSingle();

  const { error: usageError } = await supabase
    .from('linkdn_connection_usage')
    .insert({
      event_id: eventId,
      venue_id: venueId,
      room_id: roomId,
      connection_id: connection.id,
      activation_id: activation?.id || null,
      minutes_reserved:
        participant.connection_minutes || 0,
      connect_reserved: true,
      connect_consumed: false,
      consumption_reason:
        'Connection reserved by administrator.',
    });

  if (usageError) {
    await supabase
      .from('linkdn_connections')
      .delete()
      .eq('id', connection.id);

    throw new Error(usageError.message);
  }

  await Promise.all([
    supabase
      .from('linkdn_room_events')
      .update({
        status: 'waiting',
        updated_at: nowIso,
      })
      .eq('room_id', roomId)
      .eq('event_id', eventId),

    supabase
      .from('linkdn_room_venues')
      .update({
        participation_status: 'waiting',
        updated_at: nowIso,
      })
      .eq('room_id', roomId)
      .eq('event_id', eventId),
  ]);

  refresh(roomId);
}