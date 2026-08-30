/**
 * HypeKnight Signal Intelligence - shared signal definitions.
 *
 * IMPORTANT:
 * - These values describe historical actions ("what happened").
 * - Existing feature tables such as event_saves and event_rsvps remain the
 *   operational source of truth ("what is true right now").
 * - Add new signal names here before emitting them from application code.
 */
export const SIGNAL_TYPES = [
  // Passive discovery / exposure signals.
  'page_view',
  'event_view',
  'venue_view',
  'search_performed',
  'vibe_selected',
  'market_selected',
  'time_intent_selected',
  'surprise_requested',
  'surprise_event_presented',
  'recommendation_selected',

  // Event consideration / intent signals.
  'event_saved',
  'event_unsaved',
  'event_rsvp_interested',
  'event_rsvp_going',
  'event_rsvp_not_going',
  'event_shared',
  'directions_requested',
  'event_comment_created',

  // Venue affinity / live engagement signals.
  'venue_comment_created',
  'venue_presence_joined',
  'music_request_created',
  'music_request_voted',

  // Patron Pulse / declared live-experience signals.
  'patron_pulse_checkin',
  'patron_pulse_response',

  // Economic / attributable outcome signals.
  'coupon_redeemed',
  'ticket_outbound',
  'event_source_connected',
  'event_claim_submitted',
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SUBJECT_TYPES = [
  'page',
  'event',
  'venue',
  'market',
  'search',
  'pulse',
  'coupon',
] as const;

export type SignalSubjectType = (typeof SUBJECT_TYPES)[number];

export type SignalVerificationLevel =
  | 'observed'
  | 'declared'
  | 'contextual'
  | 'presence_supported'
  | 'verified';

/**
 * Common input accepted by both server-side and browser-side signal bridges.
 * Metadata should contain context only; avoid raw sensitive personal data.
 */
export type SignalInput = {
  signalType: SignalType;
  subjectType: SignalSubjectType;
  subjectId?: string | null;
  eventId?: string | null;
  venueId?: string | null;
  city?: string | null;
  state?: string | null;
  source?: string | null;
  surface?: string | null;
  sessionId?: string | null;
  anonymousSessionId?: string | null;
  value?: number | null;
  confidence?: number | null;
  verificationLevel?: SignalVerificationLevel;
  metadata?: Record<string, unknown>;
};
