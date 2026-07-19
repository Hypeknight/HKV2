import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveEffectiveSystemTier } from '@/lib/systems/resolve-effective-tier';

export async function requirePatronPulseCapability({
  supabase,
  eventId,
  capability,
}: {
  supabase: SupabaseClient;
  eventId: string;
  capability: string;
}) {
  const resolution =
    await resolveEffectiveSystemTier({
      supabase,
      eventId,
      systemSlug: 'patron-pulse',
    });

  const allowed = resolution.capabilities.some(
    (item) => item.slug === capability
  );

  if (!allowed) {
    throw new Error(
      `This event does not have access to Patron Pulse capability: ${capability}`
    );
  }

  return resolution;
}

export async function loadPublicPatronPulse({
  supabase,
  eventId,
  userId,
}: {
  supabase: SupabaseClient;
  eventId: string;
  userId?: string | null;
}) {
  const { data: session, error: sessionError } =
    await supabase
      .from('patron_pulse_sessions')
      .select(`
        id,
        event_id,
        activation_id,
        title,
        status,
        opens_at,
        closes_at,
        check_in_enabled,
        announcements_enabled,
        responses_visible
      `)
      .eq('event_id', eventId)
      .in('status', ['open', 'paused'])
      .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    return {
      session: null,
      pulses: [],
      announcements: [],
      viewerCheckin: null,
      viewerResponses: [],
    };
  }

  const [
    { data: pulses, error: pulsesError },
    { data: announcements, error: announcementsError },
    checkinResult,
    responsesResult,
  ] = await Promise.all([
    supabase
      .from('patron_pulses')
      .select(`
        id,
        session_id,
        event_id,
        pulse_type,
        title,
        prompt,
        description,
        status,
        results_visibility,
        allow_multiple_responses,
        opens_at,
        closes_at,
        sort_order,
        options:patron_pulse_options(
          id,
          label,
          description,
          icon,
          sort_order,
          is_active
        )
      `)
      .eq('session_id', session.id)
      .in('status', ['scheduled', 'open', 'closed'])
      .order('sort_order', { ascending: true }),

    supabase
      .from('patron_pulse_announcements')
      .select(`
        id,
        title,
        message,
        priority,
        published_at,
        expires_at
      `)
      .eq('session_id', session.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false }),

    userId
      ? supabase
          .from('patron_pulse_checkins')
          .select('id, status, checked_in_at, last_active_at')
          .eq('session_id', session.id)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    userId
      ? supabase
          .from('patron_pulse_responses')
          .select(`
            id,
            pulse_id,
            option_id,
            text_response,
            numeric_response,
            boolean_response,
            submitted_at
          `)
          .eq('session_id', session.id)
          .eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (pulsesError) {
    throw new Error(pulsesError.message);
  }

  if (announcementsError) {
    throw new Error(announcementsError.message);
  }

  if (checkinResult.error) {
    throw new Error(checkinResult.error.message);
  }

  if (responsesResult.error) {
    throw new Error(responsesResult.error.message);
  }

  return {
    session,
    pulses: pulses || [],
    announcements: announcements || [],
    viewerCheckin: checkinResult.data,
    viewerResponses: responsesResult.data || [],
  };
}