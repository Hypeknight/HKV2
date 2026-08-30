import type { SupabaseClient } from '@supabase/supabase-js';
import type { SignalInput } from './types';

/**
 * Records a historical intelligence signal through the database RPC.
 *
 * WHY AN RPC?
 * The database function resolves auth.uid() itself and validates the signal
 * type. That prevents browser callers from pretending to be another user.
 *
 * FAILURE POLICY:
 * Signal logging is intentionally "best effort". A telemetry failure should
 * never break Save, RSVP, Pulse, comments, presence, etc. The operational
 * feature action succeeds or fails on its own merits.
 */
export async function recordSignal(
  supabase: SupabaseClient,
  input: SignalInput
) {
  try {
    const { error } = await supabase.rpc('record_hypeknight_signal', {
      p_signal_type: input.signalType,
      p_subject_type: input.subjectType,
      p_subject_id: input.subjectId ?? null,
      p_event_id: input.eventId ?? null,
      p_venue_id: input.venueId ?? null,
      p_city: input.city ?? null,
      p_state: input.state ?? null,
      p_source: input.source ?? null,
      p_surface: input.surface ?? null,
      p_session_id: input.sessionId ?? null,
      p_anonymous_session_id: input.anonymousSessionId ?? null,
      p_value: input.value ?? null,
      p_confidence: input.confidence ?? 1,
      p_verification_level: input.verificationLevel ?? 'observed',
      p_metadata: input.metadata ?? {},
    });

    if (error) {
      console.error('[signals] Unable to record signal:', {
        signalType: input.signalType,
        subjectType: input.subjectType,
        subjectId: input.subjectId ?? null,
        message: error.message,
      });
    }
  } catch (error) {
    console.error('[signals] Unexpected signal logging failure:', error);
  }
}
