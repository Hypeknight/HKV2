import { SIGNAL_TYPES, type SignalType, type SignalVerificationLevel } from './types';

export const CANONICAL_SIGNAL_TYPES = [...SIGNAL_TYPES, 'discovery_impression', 'featured_impression'] as const;
export type CanonicalSignalType = SignalType | 'discovery_impression' | 'featured_impression';
export type SignalDefinition = { family: string; trigger: string; actor: string; context: string; attribution: string; verification: SignalVerificationLevel; deduplication: string; instrumentation: 'instrumented' | 'not_instrumented' };
// Verification describes intended evidence semantics, not a security guarantee of
// the legacy generic RPC. Browser reported evidence cannot assert verification.
export const SIGNAL_DEFINITIONS = {
  "page_view": {
    "family": "exposure",
    "trigger": "Page mount",
    "actor": "browser",
    "context": "page",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "observed",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_view": {
    "family": "exposure",
    "trigger": "Event detail mount (canonical or external)",
    "actor": "browser",
    "context": "event, venue if stored, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "observed",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "venue_view": {
    "family": "exposure",
    "trigger": "Venue detail mount",
    "actor": "browser",
    "context": "venue, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "observed",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "search_performed": {
    "family": "intent",
    "trigger": "Homepage or Events search form submitted",
    "actor": "browser",
    "context": "query, requested location, registered market if exact",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "observation_id per submission",
    "instrumentation": "instrumented"
  },
  "vibe_selected": {
    "family": "intent",
    "trigger": "Discovery vibe link clicked",
    "actor": "browser",
    "context": "vibe/query and optional location",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "market_selected": {
    "family": "intent",
    "trigger": "Discovery city/market link clicked",
    "actor": "browser",
    "context": "requested city/state and market if exact",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "time_intent_selected": {
    "family": "intent",
    "trigger": "Discovery time link clicked",
    "actor": "browser",
    "context": "time filter and optional market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "surprise_requested": {
    "family": "intent",
    "trigger": "Surprise requested",
    "actor": "server/session",
    "context": "request context and optional market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "surprise_event_presented": {
    "family": "exposure",
    "trigger": "Surprise response selected event (not viewability)",
    "actor": "server/session",
    "context": "event or external inventory, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "observed",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "recommendation_selected": {
    "family": "intent",
    "trigger": "Recommendation link clicked",
    "actor": "browser",
    "context": "event or external inventory, optional market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_saved": {
    "family": "engagement",
    "trigger": "Save write succeeds",
    "actor": "authenticated user",
    "context": "event, stored venue, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_unsaved": {
    "family": "engagement",
    "trigger": "Unsave write succeeds",
    "actor": "authenticated user",
    "context": "event, stored venue, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_rsvp_interested": {
    "family": "intent",
    "trigger": "Interested RSVP write succeeds",
    "actor": "authenticated user",
    "context": "event, stored venue, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_rsvp_going": {
    "family": "intent",
    "trigger": "Going RSVP write succeeds (not attendance)",
    "actor": "authenticated user",
    "context": "event, stored venue, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_rsvp_not_going": {
    "family": "intent",
    "trigger": "Not-going RSVP write succeeds",
    "actor": "authenticated user",
    "context": "event, stored venue, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_shared": {
    "family": "engagement",
    "trigger": "Share UI action attempted; destination delivery unknown",
    "actor": "browser",
    "context": "event, stored venue, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "directions_requested": {
    "family": "intent",
    "trigger": "Directions outbound clicked",
    "actor": "browser",
    "context": "venue or event, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_comment_created": {
    "family": "engagement",
    "trigger": "Event comment successfully stored",
    "actor": "authenticated user",
    "context": "event, stored venue, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "not_instrumented"
  },
  "venue_comment_created": {
    "family": "engagement",
    "trigger": "Venue comment successfully stored",
    "actor": "authenticated user",
    "context": "venue, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "venue_presence_joined": {
    "family": "presence",
    "trigger": "Presence participant join stored",
    "actor": "authenticated or guest participant",
    "context": "venue, presence session, optional event, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "contextual",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "music_request_created": {
    "family": "engagement",
    "trigger": "Music request stored",
    "actor": "presence participant",
    "context": "venue, presence session, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "contextual",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "music_request_voted": {
    "family": "engagement",
    "trigger": "Music request vote stored",
    "actor": "presence participant",
    "context": "venue, presence session, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "contextual",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "patron_pulse_checkin": {
    "family": "feedback",
    "trigger": "Check-in row stored; verification is route-dependent",
    "actor": "authenticated or guest participant",
    "context": "event, venue/session when provided, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "patron_pulse_response": {
    "family": "feedback",
    "trigger": "Pulse response stored; not independently verified attendance",
    "actor": "authenticated or guest participant",
    "context": "event, venue/session when provided, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "coupon_redeemed": {
    "family": "commerce",
    "trigger": "Coupon redemption successfully stored",
    "actor": "redemption actor",
    "context": "coupon, venue/event where known, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "verified",
    "deduplication": "none_legacy",
    "instrumentation": "not_instrumented"
  },
  "ticket_outbound": {
    "family": "commerce",
    "trigger": "Ticket URL clicked; no purchase inferred",
    "actor": "browser",
    "context": "event or external inventory, market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_source_connected": {
    "family": "operations",
    "trigger": "Authorized source connection stored",
    "actor": "authenticated operator",
    "context": "event, stored venue, market, source listing",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "verified",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "event_claim_submitted": {
    "family": "operations",
    "trigger": "Authorized event claim stored",
    "actor": "authenticated claimant",
    "context": "event, stored venue, market, claim",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "declared",
    "deduplication": "none_legacy",
    "instrumentation": "instrumented"
  },
  "discovery_impression": {
    "family": "exposure",
    "trigger": "Card >=50% visible for 1000ms in visible tab",
    "actor": "browser",
    "context": "canonical or external event, stored venue, registered market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "observed",
    "deduplication": "document + placement + inventory identity; observation_id on retry",
    "instrumentation": "instrumented"
  },
  "featured_impression": {
    "family": "exposure",
    "trigger": "Actual Featured placement >=50% visible for 1000ms; requires placement reference",
    "actor": "browser",
    "context": "event + verified placement reference + venue/market",
    "attribution": "Emitter/source is not acquisition; acquisition unknown unless separately supported",
    "verification": "observed",
    "deduplication": "placement + document + inventory identity; observation_id",
    "instrumentation": "not_instrumented"
  }
} satisfies Record<CanonicalSignalType, SignalDefinition>;
