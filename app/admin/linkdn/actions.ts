'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  calculateLinkdNReadiness,
  resolveLinkdNTierLimits,
} from '@/lib/linkdn/service';

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

function numberValue(
  formData: FormData,
  key: string,
  fallback: number
) {
  const parsed = Number(formData.get(key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(
  formData: FormData,
  key: string
) {
  const raw = text(formData, key);
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${key}.`);
  }

  return parsed;
}

function refresh(roomId?: string) {
  revalidatePath('/admin/linkdn');

  if (roomId) {
    revalidatePath(`/admin/linkdn/${roomId}`);
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function updateGlobalLinkdNSettings(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const minimumPulseScore = numberValue(
    formData,
    'linkdn_default_minimum_pulse_score',
    60
  );

  const retentionPulseScore = numberValue(
    formData,
    'linkdn_default_retention_pulse_score',
    40
  );

  const defaultConnectionMinutes = numberValue(
    formData,
    'linkdn_default_connection_minutes',
    15
  );

  const connectionsPerNight = numberValue(
    formData,
    'linkdn_default_connections_per_night',
    1
  );

  const maximumVenues = numberValue(
    formData,
    'linkdn_default_maximum_venues',
    2
  );

  const graceSeconds = numberValue(
    formData,
    'linkdn_failed_connection_grace_seconds',
    60
  );

  if (
    minimumPulseScore < 0 ||
    minimumPulseScore > 100 ||
    retentionPulseScore < 0 ||
    retentionPulseScore > 100
  ) {
    throw new Error(
      'Pulse thresholds must be between 0 and 100.'
    );
  }

  if (maximumVenues < 2) {
    throw new Error(
      'Linkd’N rooms must support at least two venues.'
    );
  }

  const { error } = await supabase
    .from('platform_settings')
    .update({
      linkdn_enabled:
        formData.get('linkdn_enabled') === 'on',
      linkdn_beta_enabled:
        formData.get('linkdn_beta_enabled') === 'on',
      linkdn_sales_enabled:
        formData.get('linkdn_sales_enabled') === 'on',
      linkdn_default_tier:
        text(formData, 'linkdn_default_tier') ||
        'connect',
      linkdn_require_pulse_readiness:
        formData.get(
          'linkdn_require_pulse_readiness'
        ) === 'on',
      linkdn_default_minimum_pulse_score:
        minimumPulseScore,
      linkdn_default_retention_pulse_score:
        retentionPulseScore,
      linkdn_require_technical_readiness:
        formData.get(
          'linkdn_require_technical_readiness'
        ) === 'on',
      linkdn_require_admin_approval:
        formData.get(
          'linkdn_require_admin_approval'
        ) === 'on',
      linkdn_default_connection_minutes:
        defaultConnectionMinutes,
      linkdn_default_connections_per_night:
        connectionsPerNight,
      linkdn_default_maximum_venues:
        maximumVenues,
      linkdn_failed_connection_grace_seconds:
        graceSeconds,
      linkdn_public_label:
        text(formData, 'linkdn_public_label') ||
        "Linkd'N",
      linkdn_public_description:
        text(
          formData,
          'linkdn_public_description'
        ) || null,
      linkdn_beta_notice:
        text(formData, 'linkdn_beta_notice') ||
        null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'global');

  if (error) {
    throw new Error(error.message);
  }

  refresh();
}

export async function updateLinkdNTierLimits(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const tierId = text(formData, 'tier_id');

  if (!tierId) {
    throw new Error('Missing Linkd’N tier.');
  }

  const { error } = await supabase
    .from('linkdn_tier_limits')
    .update({
      minimum_setup_days: numberValue(
        formData,
        'minimum_setup_days',
        3
      ),
      minimum_pulse_score: numberValue(
        formData,
        'minimum_pulse_score',
        60
      ),
      retention_pulse_score: numberValue(
        formData,
        'retention_pulse_score',
        40
      ),
      maximum_connections_per_night:
        optionalNumber(
          formData,
          'maximum_connections_per_night'
        ),
      maximum_connection_minutes:
        optionalNumber(
          formData,
          'maximum_connection_minutes'
        ),
      maximum_room_minutes: optionalNumber(
        formData,
        'maximum_room_minutes'
      ),
      maximum_connected_venues: numberValue(
        formData,
        'maximum_connected_venues',
        2
      ),
      whole_night_allowed:
        formData.get('whole_night_allowed') ===
        'on',
      audience_voting_allowed:
        formData.get(
          'audience_voting_allowed'
        ) === 'on',
      multi_round_allowed:
        formData.get('multi_round_allowed') ===
        'on',
      judges_allowed:
        formData.get('judges_allowed') === 'on',
      recording_allowed:
        formData.get('recording_allowed') ===
        'on',
      requires_connection_test:
        formData.get(
          'requires_connection_test'
        ) === 'on',
      requires_staff_operator:
        formData.get(
          'requires_staff_operator'
        ) === 'on',
      requires_admin_approval:
        formData.get(
          'requires_admin_approval'
        ) === 'on',
      updated_at: new Date().toISOString(),
    })
    .eq('tier_id', tierId);

  if (error) {
    throw new Error(error.message);
  }

  refresh();
}

export async function createLinkdNRoom(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const name = text(formData, 'name');
  const tierId = text(formData, 'tier_id');
  const experienceType =
    text(formData, 'experience_type') ||
    'open_connection';

  if (!name || !tierId) {
    throw new Error(
      'Room name and Linkd’N tier are required.'
    );
  }

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Date.now()
    .toString()
    .slice(-6)}`;

  const minimumVenues = numberValue(
    formData,
    'minimum_venues',
    2
  );

  const maximumVenues = numberValue(
    formData,
    'maximum_venues',
    2
  );

  if (
    minimumVenues < 2 ||
    maximumVenues < minimumVenues
  ) {
    throw new Error(
      'Room venue limits are invalid.'
    );
  }

  const { data: limits, error: limitsError } =
    await supabase
      .from('linkdn_tier_limits')
      .select('*')
      .eq('tier_id', tierId)
      .single();

  if (limitsError || !limits) {
    throw new Error(
      limitsError?.message ||
        'Linkd’N tier limits were not found.'
    );
  }

  const { data: room, error } = await supabase
    .from('linkdn_rooms')
    .insert({
      name,
      slug,
      description:
        text(formData, 'description') || null,
      experience_type: experienceType,
      tier_id: tierId,
      status: 'draft',
      scheduled_start_at:
        text(
          formData,
          'scheduled_start_at'
        ) || null,
      scheduled_end_at:
        text(formData, 'scheduled_end_at') ||
        null,
      minimum_venues: minimumVenues,
      maximum_venues: maximumVenues,
      minimum_pulse_score:
        limits.minimum_pulse_score,
      retention_pulse_score:
        limits.retention_pulse_score,
      connection_duration_minutes:
        limits.maximum_connection_minutes,
      whole_night_enabled:
        limits.whole_night_allowed &&
        formData.get('whole_night_enabled') ===
          'on',
      admin_approval_status:
        limits.requires_admin_approval
          ? 'approved'
          : 'not_required',
      admin_approved_by:
        limits.requires_admin_approval
          ? user.id
          : null,
      admin_approved_at:
        limits.requires_admin_approval
          ? new Date().toISOString()
          : null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !room) {
    throw new Error(
      error?.message ||
        'Unable to create Linkd’N room.'
    );
  }

  refresh(room.id);

  redirect(`/admin/linkdn/${room.id}`);
}

export async function updateLinkdNRoom(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const roomId = text(formData, 'room_id');

  if (!roomId) {
    throw new Error('Missing room id.');
  }

  const status =
    text(formData, 'status') || 'draft';

  const { error } = await supabase
    .from('linkdn_rooms')
    .update({
      name: text(formData, 'name'),
      description:
        text(formData, 'description') || null,
      experience_type:
        text(formData, 'experience_type') ||
        'open_connection',
      status,
      scheduled_start_at:
        text(
          formData,
          'scheduled_start_at'
        ) || null,
      scheduled_end_at:
        text(formData, 'scheduled_end_at') ||
        null,
      minimum_venues: numberValue(
        formData,
        'minimum_venues',
        2
      ),
      maximum_venues: numberValue(
        formData,
        'maximum_venues',
        2
      ),
      minimum_pulse_score: numberValue(
        formData,
        'minimum_pulse_score',
        60
      ),
      retention_pulse_score: numberValue(
        formData,
        'retention_pulse_score',
        40
      ),
      connection_duration_minutes:
        optionalNumber(
          formData,
          'connection_duration_minutes'
        ),
      whole_night_enabled:
        formData.get('whole_night_enabled') ===
        'on',
      admin_note:
        text(formData, 'admin_note') || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId);

  if (error) {
    throw new Error(error.message);
  }

  refresh(roomId);
}

export async function addEventToLinkdNRoom(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const roomId = text(formData, 'room_id');
  const eventId = text(formData, 'event_id');
  const role =
    text(formData, 'role') || 'participant';

  if (!roomId || !eventId) {
    throw new Error(
      'Room and event are required.'
    );
  }

  const { data: event, error: eventError } =
    await supabase
      .from('events')
      .select('id, venue_id, event_start_at')
      .eq('id', eventId)
      .single();

  if (eventError || !event) {
    throw new Error(
      eventError?.message || 'Event not found.'
    );
  }

  if (!event.venue_id) {
    throw new Error(
      'The event must have a venue before it can join Linkd’N.'
    );
  }

  const { entitlement, limits } =
    await resolveLinkdNTierLimits({
      supabase,
      eventId,
    });

  if (!entitlement.effectiveTierId || !limits) {
    throw new Error(
      'The event does not have Linkd’N access.'
    );
  }

  const setupDeadline = event.event_start_at
    ? new Date(
        new Date(event.event_start_at).getTime() -
          limits.minimumSetupDays *
            24 *
            60 *
            60 *
            1000
      ).toISOString()
    : null;

  const [{ error: eventRoomError }, { error: venueRoomError }] =
    await Promise.all([
      supabase
        .from('linkdn_room_events')
        .upsert(
          {
            room_id: roomId,
            event_id: eventId,
            effective_tier_id:
              entitlement.effectiveTierId,
            role,
            status: 'setup_pending',
            pulse_threshold:
              limits.minimumPulseScore,
            retention_pulse_threshold:
              limits.retentionPulseScore,
            connection_limit:
              limits.maximumConnectionsPerNight,
            connection_minutes:
              limits.maximumConnectionMinutes,
            whole_night_allowed:
              limits.wholeNightAllowed,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: 'room_id,event_id',
          }
        ),

      supabase
        .from('linkdn_room_venues')
        .upsert(
          {
            room_id: roomId,
            venue_id: event.venue_id,
            event_id: eventId,
            participation_status:
              'setup_pending',
            commercial_ready: true,
            technical_ready: false,
            audience_ready: false,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              'room_id,venue_id,event_id',
          }
        ),
    ]);

  if (eventRoomError) {
    throw new Error(eventRoomError.message);
  }

  if (venueRoomError) {
    throw new Error(venueRoomError.message);
  }

  const { error: readinessError } =
    await supabase
      .from('linkdn_event_readiness')
      .upsert(
        {
          event_id: eventId,
          room_id: roomId,
          venue_id: event.venue_id,
          commercial_ready: true,
          technical_ready: false,
          audience_ready: false,
          setup_deadline_at: setupDeadline,
          readiness_status: 'setup_pending',
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: 'event_id,room_id',
        }
      );

  if (readinessError) {
    throw new Error(readinessError.message);
  }

  refresh(roomId);
}

export async function updateLinkdNReadiness(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const readinessId = text(
    formData,
    'readiness_id'
  );
  const roomId = text(formData, 'room_id');

  if (!readinessId || !roomId) {
    throw new Error(
      'Missing readiness information.'
    );
  }

  const commercialReady =
    formData.get('commercial_ready') === 'on';

  const technicalReady =
    formData.get('technical_ready') === 'on';

  const audienceReady =
    formData.get('audience_ready') === 'on';

  const readinessStatus =
    commercialReady &&
    technicalReady &&
    audienceReady
      ? 'ready'
      : technicalReady
        ? 'pulse_building'
        : 'setup_pending';

  const { error } = await supabase
    .from('linkdn_event_readiness')
    .update({
      commercial_ready: commercialReady,
      technical_ready: technicalReady,
      audience_ready: audienceReady,
      readiness_status: readinessStatus,
      connection_test_scheduled_at:
        text(
          formData,
          'connection_test_scheduled_at'
        ) || null,
      connection_test_passed_at:
        technicalReady
          ? new Date().toISOString()
          : null,
      blocker_reason:
        text(formData, 'blocker_reason') ||
        null,
      admin_note:
        text(formData, 'admin_note') || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', readinessId);

  if (error) {
    throw new Error(error.message);
  }

  refresh(roomId);
}

export async function refreshLinkdNReadiness(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const roomId = text(formData, 'room_id');
  const eventId = text(formData, 'event_id');

  if (!roomId || !eventId) {
    throw new Error(
      'Missing room or event information.'
    );
  }

  const readiness =
    await calculateLinkdNReadiness({
      supabase,
      eventId,
      roomId,
    });

  const { data: event, error: eventError } =
    await supabase
      .from('events')
      .select('venue_id')
      .eq('id', eventId)
      .single();

  if (eventError || !event?.venue_id) {
    throw new Error(
      eventError?.message ||
        'Event venue was not found.'
    );
  }

  const { error: snapshotError } =
    await supabase
      .from('linkdn_readiness_snapshots')
      .insert({
        event_id: eventId,
        venue_id: event.venue_id,
        room_id: roomId,
        checked_in_count:
          readiness.checkedInCount,
        active_user_count:
          readiness.activeUserCount,
        unique_responder_count:
          readiness.uniqueResponderCount,
        response_rate:
          readiness.responseRate,
        response_velocity:
          readiness.responseVelocity,
        recent_activity_score:
          readiness.recentActivityScore,
        pulse_score: readiness.pulseScore,
        commercial_ready:
          readiness.commercialReady,
        technical_ready:
          readiness.technicalReady,
        audience_ready:
          readiness.audienceReady,
      });

  if (snapshotError) {
    throw new Error(snapshotError.message);
  }

  const readinessStatus =
    readiness.commercialReady &&
    readiness.technicalReady &&
    readiness.audienceReady
      ? 'ready'
      : readiness.technicalReady
        ? 'pulse_building'
        : 'setup_pending';

  const [{ error: readinessError }, { error: venueError }] =
    await Promise.all([
      supabase
        .from('linkdn_event_readiness')
        .update({
          commercial_ready:
            readiness.commercialReady,
          technical_ready:
            readiness.technicalReady,
          audience_ready:
            readiness.audienceReady,
          readiness_status: readinessStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('room_id', roomId),

      supabase
        .from('linkdn_room_venues')
        .update({
          commercial_ready:
            readiness.commercialReady,
          technical_ready:
            readiness.technicalReady,
          audience_ready:
            readiness.audienceReady,
          current_pulse_score:
            readiness.pulseScore,
          participation_status:
            readinessStatus === 'ready'
              ? 'connection_ready'
              : readiness.technicalReady
                ? 'pulse_building'
                : 'setup_pending',
          updated_at:
            new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('room_id', roomId),
    ]);

  if (readinessError) {
    throw new Error(readinessError.message);
  }

  if (venueError) {
    throw new Error(venueError.message);
  }

  refresh(roomId);
}

export async function removeEventFromLinkdNRoom(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const roomId = text(formData, 'room_id');
  const eventId = text(formData, 'event_id');

  if (!roomId || !eventId) {
    throw new Error(
      'Missing room or event information.'
    );
  }

  const results = await Promise.all([
    supabase
      .from('linkdn_event_readiness')
      .delete()
      .eq('room_id', roomId)
      .eq('event_id', eventId),

    supabase
      .from('linkdn_room_venues')
      .delete()
      .eq('room_id', roomId)
      .eq('event_id', eventId),

    supabase
      .from('linkdn_room_events')
      .delete()
      .eq('room_id', roomId)
      .eq('event_id', eventId),
  ]);

  const error = results.find(
    (result) => result.error
  )?.error;

  if (error) {
    throw new Error(error.message);
  }

  refresh(roomId);
}