'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdministrator } from '@/lib/admin/control-center';
import { communityPulseEnabled } from '@/lib/community-pulse/home';
import { isPulseId } from '@/lib/community-pulse/contracts';
import { COMMUNITY_STATUSES, parseCommunityDraft } from '@/lib/community-pulse/editor';

function finish(status: string): never {
  revalidatePath('/admin/community-pulse');
  revalidatePath('/');
  redirect('/admin/community-pulse?' + new URLSearchParams({ status }));
}

export async function createCommunityQuestion(form: FormData) {
  const client = await requireAdministrator();
  if (!communityPulseEnabled()) finish('disabled');
  const draft = parseCommunityDraft(form);
  if (!draft) finish('invalid');
  let saved = false;
  try {
    const { data, error } = await client.rpc('community_pulse_create', {
      p_prompt: draft.prompt, p_description: draft.description, p_options: draft.options,
      p_market: draft.marketId, p_city: draft.city, p_state: draft.state,
      p_opens: draft.opensAt, p_closes: draft.closesAt, p_guests: false, p_supersedes: null,
    });
    saved = !error && isPulseId(data);
  } catch { saved = false; }
  finish(saved ? 'created' : 'unavailable');
}

export async function transitionCommunityQuestion(form: FormData) {
  const client = await requireAdministrator();
  if (!communityPulseEnabled()) finish('disabled');
  const question = String(form.get('questionId') || '');
  const status = String(form.get('nextStatus') || '');
  if (!isPulseId(question) || !COMMUNITY_STATUSES.some(s => s === status) ||
      (status === 'closed' && form.get('confirmClose') !== 'yes')) finish('invalid');
  let saved = false;
  try {
    const { error } = await client.rpc('community_pulse_transition', { p_question: question, p_status: status });
    saved = !error;
  } catch { saved = false; }
  finish(saved ? 'updated' : 'transition_failed');
}

export async function selectCommunityHomeQuestion(form: FormData) {
  const client = await requireAdministrator();
  if (!communityPulseEnabled()) finish('disabled');
  const question = String(form.get('questionId') || '');
  const selected = String(form.get('selected') || '');
  if (!isPulseId(question) || !['yes', 'no'].includes(selected)) finish('invalid');
  let saved = false;
  try {
    const { error } = await client.rpc('community_pulse_set_home', { p_question: question, p_selected: selected === 'yes' });
    saved = !error;
  } catch { saved = false; }
  finish(saved ? 'home_updated' : 'selection_failed');
}

export async function maintainCommunityQuestions(form: FormData) {
  const client = await requireAdministrator();
  if (!communityPulseEnabled()) finish('disabled');
  if (form.get('confirmMaintenance') !== 'yes') finish('invalid');
  let saved = false;
  try {
    const { data, error } = await client.rpc('community_pulse_maintenance');
    saved = !error && Number.isSafeInteger(data) && data >= 0;
  } catch { saved = false; }
  finish(saved ? 'maintained' : 'unavailable');
}
