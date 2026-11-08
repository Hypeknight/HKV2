import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPulseId, parseCommunityPulseQuestion, parseCommunityPulseResponse, parseCommunityPulseSubmission } from './contracts';
import { loadCommunityPulseParticipant, loadCommunityPulse } from './service';

export function communityPulseEnabled() {
  return process.env.HYPEKNIGHT_COMMUNITY_PULSE_ENABLED === '1';
}

export async function loadHomeCommunityPulse(city: string, state: string) {
  if (!communityPulseEnabled()) return { state: 'disabled' as const };
  try {
    const { data, error } = await createAdminClient().rpc('community_pulse_home', {
      p_city: city.slice(0, 100), p_state: state.slice(0, 50),
    });
    if (error) return { state: 'unavailable' as const };
    if (data === null) return { state: 'empty' as const };
    const question = isPulseId(data.id) ? parseCommunityPulseQuestion(data, data.id) : null;
    if (!question || question.guestsAllowed || typeof data.scopeLabel !== 'string' || data.scopeLabel.length > 200)
      return { state: 'unavailable' as const };
    return { state: 'available' as const, question, scopeLabel: data.scopeLabel };
  } catch {
    return { state: 'unavailable' as const };
  }
}

async function signedInAccount() {
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') return { state: 'unavailable' as const };
    if (!data.user || data.user.is_anonymous) return { state: 'sign_in_required' as const };
    return { state: 'authenticated' as const, userId: data.user.id };
  } catch { return { state: 'unavailable' as const }; }
}

export async function loadSignedInCommunityPulseState(questionId: string) {
  if (!communityPulseEnabled()) return { state: 'disabled' as const };
  if (!isPulseId(questionId)) return { state: 'invalid' as const };
  const identity = await signedInAccount();
  if (identity.state !== 'authenticated') return { state: identity.state };
  const question = await loadCommunityPulse(questionId);
  if (question.state !== 'available' || question.question.guestsAllowed)
    return { state: 'unavailable' as const };
  return loadCommunityPulseParticipant(questionId, null);
}

export async function submitSignedInCommunityPulse(value: unknown) {
  if (!communityPulseEnabled()) return { state: 'disabled' as const };
  const input = parseCommunityPulseResponse(value);
  if (!input) return { state: 'invalid' as const };
  try {
    const identity = await signedInAccount();
    if (identity.state !== 'authenticated') return { state: identity.state };
    const { data, error } = await createAdminClient().rpc('community_pulse_account_submit', {
      p_question: input.questionId, p_option: input.optionId, p_operation: input.operationId,
      p_revision: input.expectedRevision, p_notice: input.noticeVersion, p_user: identity.userId,
    });
    return error ? { state: 'unavailable' as const } : parseCommunityPulseSubmission(data);
  } catch {
    return { state: 'unavailable' as const };
  }
}
