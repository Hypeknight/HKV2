import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  isPulseId, parseCommunityPulseQuestion, parseCommunityPulseResponse, parseCommunityPulseSubmission,
  type CommunityPulseQuestion, type CommunityPulseSubmission,
} from './contracts';

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const guestDigest = (token: string | null) => token && tokenPattern.test(token)
  ? createHash('sha256').update(token).digest('hex') : null;

async function participant(questionId: string, token: string | null) {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw error;
  if (data.user?.is_anonymous) return null;
  const digest = guestDigest(token);
  return data.user || digest
    ? { p_question: questionId, p_user: data.user?.id ?? null, p_digest: digest }
    : null;
}

export async function loadCommunityPulse(questionId: string): Promise<
  { state: 'available'; question: CommunityPulseQuestion } | { state: 'not_found' | 'unavailable' }
> {
  if (!isPulseId(questionId)) return { state: 'not_found' };
  try {
    const { data, error } = await createAdminClient().rpc('community_pulse_read', { p_question: questionId });
    if (error) return { state: 'unavailable' };
    if (data === null) return { state: 'not_found' };
    const question = parseCommunityPulseQuestion(data, questionId);
    return question ? { state: 'available', question } : { state: 'unavailable' };
  } catch {
    return { state: 'unavailable' };
  }
}

/** The token argument is read from the question's HttpOnly cookie by a future server adapter. */
export async function submitCommunityPulse(value: unknown, guestCookie: string | null): Promise<CommunityPulseSubmission> {
  const input = parseCommunityPulseResponse(value);
  if (!input) return { state: 'invalid' };
  try {
    const identity = await participant(input.questionId, guestCookie);
    if (!identity) return { state: 'ineligible' };
    const { data, error } = await createAdminClient().rpc('community_pulse_submit', {
      ...identity, p_option: input.optionId, p_operation: input.operationId,
      p_revision: input.expectedRevision, p_notice: input.noticeVersion,
    });
    return error ? { state: 'unavailable' } : parseCommunityPulseSubmission(data);
  } catch {
    return { state: 'unavailable' };
  }
}

export async function loadCommunityPulseParticipant(questionId: string, guestCookie: string | null): Promise<
  { state: 'selected'; optionId: string; revision: number; identity: 'account' | 'guest' } |
  { state: 'none' | 'unavailable' }
> {
  if (!isPulseId(questionId)) return { state: 'none' };
  try {
    const identity = await participant(questionId, guestCookie);
    if (!identity) return { state: 'none' };
    const { data, error } = await createAdminClient().rpc('community_pulse_participant', identity);
    if (error) return { state: 'unavailable' };
    if (data === null) return { state: 'none' };
    if (!isPulseId(data.optionId) || !Number.isInteger(data.revision) || data.revision < 1 || data.revision > 6 ||
        (data.identity !== 'account' && data.identity !== 'guest')) return { state: 'unavailable' };
    return { state: 'selected', optionId: data.optionId, revision: data.revision, identity: data.identity };
  } catch {
    return { state: 'unavailable' };
  }
}

/**
 * Trusted server adapter only. The adapter must verify a one-use challenge and
 * derive a keyed, question-scoped abuse bucket from trusted ingress evidence.
 * No request handler currently calls this function. Never accept a bucket from a browser.
 */
export async function issueCommunityPulseGuestGrant(questionId: string, verifiedAbuseBucket: string): Promise<
  { state: 'issued'; cookieToken: string } | { state: 'denied' | 'unavailable' }
> {
  if (!isPulseId(questionId) || !/^[0-9a-f]{64}$/.test(verifiedAbuseBucket)) return { state: 'denied' };
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    if (data.user) return { state: 'denied' };
    if (error && error.name !== 'AuthSessionMissingError') return { state: 'unavailable' };
    const cookieToken = randomBytes(32).toString('base64url');
    const { data: issued, error: rpcError } = await createAdminClient().rpc('community_pulse_guest_grant', {
      p_question: questionId, p_digest: guestDigest(cookieToken), p_bucket: verifiedAbuseBucket,
    });
    if (rpcError) return { state: 'unavailable' };
    return issued === true ? { state: 'issued', cookieToken } : { state: 'denied' };
  } catch {
    return { state: 'unavailable' };
  }
}
