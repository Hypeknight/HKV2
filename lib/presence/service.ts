import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type PresenceContextType = 'event' | 'venue' | 'field';

export type PresenceVerificationLevel =
  | 'declared'
  | 'contextual'
  | 'presence_supported'
  | 'verified';

export type PresenceVerificationMethod =
  | 'event_qr'
  | 'venue_qr'
  | 'dynamic_qr'
  | 'session_code'
  | 'geofence'
  | 'staff'
  | 'hardware'
  | 'admin'
  | 'legacy';

type ResolveParticipantInput = {
  participantToken?: string | null;
  userId?: string | null;
  email?: string | null;
};

type VerifyPresenceInput = {
  participantId: string;
  contextType: PresenceContextType;
  eventId?: string | null;
  venueId?: string | null;
  method: PresenceVerificationMethod | string;
  verificationLevel: PresenceVerificationLevel;
  confidence?: number;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

function createParticipantToken() {
  return randomBytes(32).toString('hex');
}

function normalizeEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value || null;
}

function assertContext(
  contextType: PresenceContextType,
  eventId?: string | null,
  venueId?: string | null,
) {
  if (contextType === 'event') {
    if (!eventId || venueId) {
      throw new Error('Event presence requires eventId and no venueId.');
    }
    return;
  }

  if (contextType === 'venue') {
    if (!venueId || eventId) {
      throw new Error('Venue presence requires venueId and no eventId.');
    }
    return;
  }

  if (eventId || venueId) {
    throw new Error('Field presence cannot be attached to an event or venue.');
  }
}

/**
 * Resolve a BM1 participant identity.
 *
 * Identity is intentionally separate from presence:
 * - a participant may have a HypeKnight account,
 * - may be an anonymous guest,
 * - may optionally provide an email,
 * - none of those facts prove physical presence.
 *
 * Presence authority is established separately through verifyPresence().
 */
export async function resolvePresenceParticipant(
  input: ResolveParticipantInput = {},
) {
  const admin = createAdminClient();

  const participantToken =
    input.participantToken?.trim() || createParticipantToken();

  const email = normalizeEmail(input.email);

  if (input.participantToken?.trim()) {
    const { data: existing, error } = await admin
      .from('presence_participants')
      .select('*')
      .eq('participant_token', participantToken)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (existing) {
      const updates: Record<string, unknown> = {
        last_active_at: new Date().toISOString(),
      };

      if (!existing.user_id && input.userId) {
        updates.user_id = input.userId;
      }

      if (!existing.email && email) {
        updates.email = email;
      }

      const { data: updated, error: updateError } = await admin
        .from('presence_participants')
        .update(updates)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      return updated;
    }
  }

  const { data: participant, error } = await admin
    .from('presence_participants')
    .insert({
      participant_token: participantToken,
      user_id: input.userId ?? null,
      email,
      last_active_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return participant;
}

/**
 * Record evidence that a participant was present in a specific context.
 *
 * This does not infer account identity and does not grant participation merely
 * because a participant record exists. The verification record is the evidence.
 */
export async function verifyPresence(input: VerifyPresenceInput) {
  assertContext(input.contextType, input.eventId, input.venueId);

  const confidence = input.confidence ?? 1;

  if (confidence < 0 || confidence > 1) {
    throw new Error('Presence confidence must be between 0 and 1.');
  }

  const admin = createAdminClient();

  const { data: verification, error } = await admin
    .from('presence_verifications')
    .insert({
      participant_id: input.participantId,
      context_type: input.contextType,
      event_id: input.eventId ?? null,
      venue_id: input.venueId ?? null,
      verification_method: input.method,
      verification_level: input.verificationLevel,
      confidence,
      verified_at: new Date().toISOString(),
      expires_at: input.expiresAt ?? null,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return verification;
}

/**
 * Return the strongest currently valid presence evidence for a participant in
 * one context. This is the future participation-authority check for Patron Pulse.
 */
export async function getActivePresenceVerification({
  participantId,
  contextType,
  eventId,
  venueId,
}: {
  participantId: string;
  contextType: PresenceContextType;
  eventId?: string | null;
  venueId?: string | null;
}) {
  assertContext(contextType, eventId, venueId);

  const admin = createAdminClient();
  const now = new Date().toISOString();

  let query = admin
    .from('presence_verifications')
    .select('*')
    .eq('participant_id', participantId)
    .eq('context_type', contextType);

  if (contextType === 'event') {
    query = query.eq('event_id', eventId!);
  } else if (contextType === 'venue') {
    query = query.eq('venue_id', venueId!);
  }

  const { data, error } = await query.order('verified_at', {
    ascending: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rank: Record<PresenceVerificationLevel, number> = {
    declared: 0,
    contextual: 1,
    presence_supported: 2,
    verified: 3,
  };

  const active = (data ?? []).filter(
    (item) => !item.expires_at || item.expires_at > now,
  );

  active.sort((a, b) => {
    const levelDifference =
      rank[b.verification_level as PresenceVerificationLevel] -
      rank[a.verification_level as PresenceVerificationLevel];

    if (levelDifference !== 0) return levelDifference;

    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });

  return active[0] ?? null;
}

export async function hasParticipationPresence({
  participantId,
  eventId,
}: {
  participantId: string;
  eventId: string;
}) {
  const verification = await getActivePresenceVerification({
    participantId,
    contextType: 'event',
    eventId,
  });

  if (!verification) return false;

  return (
    verification.verification_level === 'presence_supported' ||
    verification.verification_level === 'verified'
  );
}
