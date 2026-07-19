import type { SupabaseClient } from '@supabase/supabase-js';
import type { EffectivePatronPulseSettings } from '@/lib/patron-pulse/admin-settings-types';

function override<T>(
  eventValue: T | null | undefined,
  globalValue: T
) {
  return eventValue === null || eventValue === undefined
    ? globalValue
    : eventValue;
}

export async function resolvePatronPulseSettings({
  supabase,
  eventId,
}: {
  supabase: SupabaseClient;
  eventId: string;
}): Promise<EffectivePatronPulseSettings> {
  const [
    { data: global, error: globalError },
    { data: event, error: eventError },
  ] = await Promise.all([
    supabase
      .from('platform_settings')
      .select(`
        patron_pulse_enabled,
        patron_pulse_require_checkin,
        patron_pulse_allow_anonymous_view,
        patron_pulse_allow_guest_results,
        patron_pulse_announcements_enabled,
        patron_pulse_dj_requests_enabled,
        patron_pulse_challenges_enabled,
        patron_pulse_rewards_enabled,
        patron_pulse_max_open_pulses,
        patron_pulse_default_duration_minutes,
        patron_pulse_max_response_length,
        patron_pulse_default_results_visibility,
        patron_pulse_owner_can_open_session,
        patron_pulse_owner_can_create_pulses,
        patron_pulse_owner_can_publish_announcements,
        patron_pulse_admin_approval_required,
        patron_pulse_public_label,
        patron_pulse_public_description
      `)
      .eq('id', 'global')
      .single(),

    supabase
      .from('event_patron_pulse_settings')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle(),
  ]);

  if (globalError || !global) {
    throw new Error(
      globalError?.message ||
        'Global Patron Pulse settings are missing.'
    );
  }

  if (eventError) {
    throw new Error(eventError.message);
  }

  return {
    enabled:
      global.patron_pulse_enabled &&
      (event?.enabled ?? true),

    requireCheckin: override(
      event?.require_checkin,
      global.patron_pulse_require_checkin
    ),

    allowAnonymousView: override(
      event?.allow_anonymous_view,
      global.patron_pulse_allow_anonymous_view
    ),

    allowGuestResults: override(
      event?.allow_guest_results,
      global.patron_pulse_allow_guest_results
    ),

    announcementsEnabled: override(
      event?.announcements_enabled,
      global.patron_pulse_announcements_enabled
    ),

    djRequestsEnabled: override(
      event?.dj_requests_enabled,
      global.patron_pulse_dj_requests_enabled
    ),

    challengesEnabled: override(
      event?.challenges_enabled,
      global.patron_pulse_challenges_enabled
    ),

    rewardsEnabled: override(
      event?.rewards_enabled,
      global.patron_pulse_rewards_enabled
    ),

    maxOpenPulses: override(
      event?.max_open_pulses,
      global.patron_pulse_max_open_pulses
    ),

    defaultDurationMinutes: override(
      event?.default_duration_minutes,
      global.patron_pulse_default_duration_minutes
    ),

    maxResponseLength: override(
      event?.max_response_length,
      global.patron_pulse_max_response_length
    ),

    defaultResultsVisibility: override(
      event?.default_results_visibility,
      global.patron_pulse_default_results_visibility
    ),

    ownerCanOpenSession: override(
      event?.owner_can_open_session,
      global.patron_pulse_owner_can_open_session
    ),

    ownerCanCreatePulses: override(
      event?.owner_can_create_pulses,
      global.patron_pulse_owner_can_create_pulses
    ),

    ownerCanPublishAnnouncements: override(
      event?.owner_can_publish_announcements,
      global.patron_pulse_owner_can_publish_announcements
    ),

    adminApprovalRequired: override(
      event?.admin_approval_required,
      global.patron_pulse_admin_approval_required
    ),

    publicLabel:
      event?.public_label ||
      global.patron_pulse_public_label ||
      'Patron Pulse',

    publicDescription:
      event?.public_description ||
      global.patron_pulse_public_description ||
      null,
  };
}