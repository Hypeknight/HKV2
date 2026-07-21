import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LinkdNReadiness,
  LinkdNTierLimits,
} from '@/lib/linkdn/types';
import { resolveEffectiveSystemTier } from '@/lib/systems/resolve-effective-tier';

export async function resolveLinkdNTierLimits({
  supabase,
  eventId,
}: {
  supabase: SupabaseClient;
  eventId: string;
}) {
  const entitlement =
    await resolveEffectiveSystemTier({
      supabase,
      eventId,
      systemSlug: 'linkdn',
    });

  if (!entitlement.effectiveTierId) {
    return {
      entitlement,
      limits: null,
    };
  }

  const { data: row, error } = await supabase
    .from('linkdn_tier_limits')
    .select('*')
    .eq('tier_id', entitlement.effectiveTierId)
    .single();

  if (error || !row) {
    throw new Error(
      error?.message ||
        'Linkd’N tier limits were not found.'
    );
  }

  const limits: LinkdNTierLimits = {
    minimumSetupDays: row.minimum_setup_days,
    minimumPulseScore: row.minimum_pulse_score,
    retentionPulseScore:
      row.retention_pulse_score,
    maximumConnectionsPerNight:
      row.maximum_connections_per_night,
    maximumConnectionMinutes:
      row.maximum_connection_minutes,
    maximumRoomMinutes:
      row.maximum_room_minutes,
    maximumConnectedVenues:
      row.maximum_connected_venues,
    wholeNightAllowed:
      row.whole_night_allowed,
    audienceVotingAllowed:
      row.audience_voting_allowed,
    multiRoundAllowed:
      row.multi_round_allowed,
    judgesAllowed: row.judges_allowed,
    recordingAllowed: row.recording_allowed,
    requiresConnectionTest:
      row.requires_connection_test,
    requiresStaffOperator:
      row.requires_staff_operator,
    requiresAdminApproval:
      row.requires_admin_approval,
  };

  return {
    entitlement,
    limits,
  };
}

export async function calculateLinkdNReadiness({
  supabase,
  eventId,
  roomId,
}: {
  supabase: SupabaseClient;
  eventId: string;
  roomId?: string | null;
}): Promise<LinkdNReadiness> {
  const { data, error } = await supabase.rpc(
    'calculate_linkdn_pulse_readiness',
    {
      target_event_id: eventId,
      target_room_id: roomId || null,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = data?.[0];

  const [
    { data: activation },
    { data: eventReadiness },
  ] = await Promise.all([
    supabase
      .from('event_system_activations')
      .select(`
        id,
        enabled,
        status,
        system:platform_systems!inner(slug)
      `)
      .eq('event_id', eventId)
      .eq('system.slug', 'linkdn')
      .maybeSingle(),

    roomId
      ? supabase
          .from('linkdn_event_readiness')
          .select(`
            commercial_ready,
            technical_ready,
            audience_ready
          `)
          .eq('event_id', eventId)
          .eq('room_id', roomId)
          .maybeSingle()
      : supabase
          .from('linkdn_event_readiness')
          .select(`
            commercial_ready,
            technical_ready,
            audience_ready
          `)
          .eq('event_id', eventId)
          .is('room_id', null)
          .maybeSingle(),
  ]);

  return {
    commercialReady:
      eventReadiness?.commercial_ready ??
      Boolean(
        activation?.enabled &&
          [
            'configured',
            'pending_readiness',
            'ready',
            'active',
          ].includes(activation.status)
      ),

    technicalReady:
      eventReadiness?.technical_ready ?? false,

    audienceReady:
      row?.audience_ready ?? false,

    checkedInCount:
      row?.checked_in_count ?? 0,
    activeUserCount:
      row?.active_user_count ?? 0,
    uniqueResponderCount:
      row?.unique_responder_count ?? 0,
    responseRate:
      Number(row?.response_rate ?? 0),
    responseVelocity:
      Number(row?.response_velocity ?? 0),
    recentActivityScore:
      Number(row?.recent_activity_score ?? 0),
    pulseScore:
      Number(row?.pulse_score ?? 0),
  };
}

export function isLinkdNConnectionReady(
  readiness: LinkdNReadiness
) {
  return (
    readiness.commercialReady &&
    readiness.technicalReady &&
    readiness.audienceReady
  );
}