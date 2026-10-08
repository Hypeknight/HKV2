import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type PresenceCredentialContext = 'event' | 'venue' | 'field';
export type PresenceCredentialType = 'static_qr' | 'dynamic_qr';

function hashPresenceCredential(rawCredential: string) {
  return createHash('sha256').update(rawCredential, 'utf8').digest('hex');
}

export function createRawPresenceCredential() {
  return randomBytes(32).toString('base64url');
}

export async function createPresenceCredential(input: {
  contextType: PresenceCredentialContext;
  credentialType: PresenceCredentialType;
  eventId?: string | null;
  venueId?: string | null;
  createdBy?: string | null;
  validFrom?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const rawCredential = createRawPresenceCredential();
  const tokenHash = hashPresenceCredential(rawCredential);

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('presence_credentials')
    .insert({
      context_type: input.contextType,
      credential_type: input.credentialType,
      event_id: input.eventId ?? null,
      venue_id: input.venueId ?? null,
      token_hash: tokenHash,
      status: 'active',
      valid_from: input.validFrom ?? null,
      expires_at: input.expiresAt ?? null,
      created_by: input.createdBy ?? null,
      metadata: input.metadata ?? {},
    })
    .select(
      'id,context_type,event_id,venue_id,credential_type,status,valid_from,expires_at,created_at',
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    credential: rawCredential,
    record: data,
  };
}

export async function validatePresenceCredential(input: {
  credential: string;
  contextType: PresenceCredentialContext;
  eventId?: string | null;
  venueId?: string | null;
}) {
  const rawCredential = input.credential.trim();

  if (!rawCredential) {
    return null;
  }

  const tokenHash = hashPresenceCredential(rawCredential);
  const admin = createAdminClient();

  let query = admin
    .from('presence_credentials')
    .select(
      'id,context_type,event_id,venue_id,credential_type,status,valid_from,expires_at,metadata',
    )
    .eq('token_hash', tokenHash)
    .eq('context_type', input.contextType)
    .eq('status', 'active');

  if (input.contextType === 'event') {
    if (!input.eventId) return null;
    query = query.eq('event_id', input.eventId);
  }

  if (input.contextType === 'venue') {
    if (!input.venueId) return null;
    query = query.eq('venue_id', input.venueId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const now = Date.now();

  if (data.valid_from) {
    const validFrom = new Date(data.valid_from).getTime();
    if (!Number.isNaN(validFrom) && now < validFrom) {
      return null;
    }
  }

  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at).getTime();
    if (!Number.isNaN(expiresAt) && now > expiresAt) {
      return null;
    }
  }

  return data;
}

/**
 * Rotate the official static QR credential for an Event Presence context.
 *
 * Existing active static Event QR credentials are revoked before a new
 * credential is issued. Raw credentials are never recovered from storage;
 * the newly generated raw credential is returned only by this operation.
 */
export async function rotateEventPresenceCredential(input: {
  eventId: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const revokedAt = new Date().toISOString();

  const { error: revokeError } = await admin
    .from('presence_credentials')
    .update({
      status: 'revoked',
      revoked_at: revokedAt,
    })
    .eq('context_type', 'event')
    .eq('event_id', input.eventId)
    .eq('credential_type', 'static_qr')
    .eq('status', 'active');

  if (revokeError) {
    throw new Error(revokeError.message);
  }

  return createPresenceCredential({
    contextType: 'event',
    eventId: input.eventId,
    venueId: null,
    credentialType: 'static_qr',
    metadata: input.metadata ?? {},
  });
}
