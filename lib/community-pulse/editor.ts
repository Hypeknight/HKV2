import 'server-only';

import { isPulseId } from './contracts';
import { requireAdministrator } from '@/lib/admin/control-center';

export const COMMUNITY_STATUSES = ['draft', 'scheduled', 'open', 'paused', 'closed', 'archived'] as const;
export type CommunityStatus = typeof COMMUNITY_STATUSES[number];
export type CommunityQuestionDraft = {
  prompt: string; description: string | null; options: string[]; marketId: string | null;
  city: string | null; state: string | null; opensAt: string; closesAt: string;
};
export type EditorialQuestion = {
  id: string; version: number; prompt: string; description: string | null; status: CommunityStatus;
  marketId: string | null; city: string | null; state: string | null; opensAt: string; closesAt: string;
  createdAt: string; guestsAllowed: boolean; selectedForHome: boolean;
  options: { id: string; label: string }[]; audit: { action: string; at: string }[];
};
export type CommunityEditor = {
  total: number; questions: EditorialQuestion[];
  markets: { id: string; name: string }[];
  areas: { marketId: string; city: string; state: string }[];
};
const record = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v);
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

export function utcFormDate(value: string): string | null {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return null;
  const parsed = new Date(value + ':00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 16) === value ? parsed.toISOString() : null;
}

export function parseCommunityDraft(form: FormData): CommunityQuestionDraft | null {
  const prompt = String(form.get('prompt') || '').trim();
  const description = String(form.get('description') || '').trim();
  const options = String(form.get('options') || '').split(/\r?\n/).map(o => o.trim()).filter(Boolean);
  const marketId = String(form.get('marketId') || '');
  const city = String(form.get('city') || '').trim();
  const state = String(form.get('state') || '').trim();
  const opensAt = utcFormDate(String(form.get('opensAt') || ''));
  const closesAt = utcFormDate(String(form.get('closesAt') || ''));
  if (prompt.length < 5 || prompt.length > 180 || description.length > 500 || options.length < 2 ||
      options.length > 6 || options.some(o => o.length > 80) || new Set(options.map(o => o.toLowerCase())).size !== options.length ||
      (marketId && !isPulseId(marketId)) || city.length > 100 || state.length > 50 ||
      ((city || state) && (!city || !state || !marketId)) || !opensAt || !closesAt ||
      Date.parse(closesAt) <= Date.parse(opensAt) || Date.parse(closesAt) - Date.parse(opensAt) > 30 * 86400000) return null;
  return { prompt, description: description || null, options, marketId: marketId || null,
    city: city || null, state: state || null, opensAt, closesAt };
}

export function parseCommunityEditor(value: unknown): CommunityEditor | null {
  if (!record(value) || !Number.isSafeInteger(value.total) || value.total < 0 ||
      !Array.isArray(value.questions) || value.questions.length > 100 || value.questions.length > value.total ||
      !Array.isArray(value.markets) || !Array.isArray(value.areas)) return null;
  const questions: EditorialQuestion[] = [];
  for (const q of value.questions) {
    if (!record(q) || !isPulseId(q.id) || !Number.isSafeInteger(q.version) || q.version < 1 ||
        typeof q.prompt !== 'string' || !(q.description === null || typeof q.description === 'string') ||
        !COMMUNITY_STATUSES.includes(q.status) || !(q.marketId === null || isPulseId(q.marketId)) ||
        !((q.city === null && q.state === null) || (q.marketId && typeof q.city === 'string' && typeof q.state === 'string')) ||
        !date(q.opensAt) || !date(q.closesAt) || !date(q.createdAt) ||
        typeof q.guestsAllowed !== 'boolean' || typeof q.selectedForHome !== 'boolean' ||
        !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 ||
        q.options.some((o: unknown) => !record(o) || !isPulseId(o.id) || typeof o.label !== 'string') ||
        new Set(q.options.map((o: { id: string }) => o.id)).size !== q.options.length ||
        !Array.isArray(q.audit) || q.audit.some((a: unknown) => !record(a) || typeof a.action !== 'string' || !date(a.at)))
      return null;
    questions.push({
      id: q.id, version: q.version, prompt: q.prompt, description: q.description, status: q.status,
      marketId: q.marketId, city: q.city, state: q.state, opensAt: q.opensAt, closesAt: q.closesAt,
      createdAt: q.createdAt, guestsAllowed: q.guestsAllowed, selectedForHome: q.selectedForHome,
      options: q.options.map((o: { id: string; label: string }) => ({ id: o.id, label: o.label })),
      audit: q.audit.map((a: { action: string; at: string }) => ({ action: a.action, at: a.at })),
    });
  }
  if (new Set(questions.map(q => q.id)).size !== questions.length ||
      value.markets.some((m: unknown) => !record(m) || !isPulseId(m.id) || typeof m.name !== 'string') ||
      value.areas.some((a: unknown) => !record(a) || !isPulseId(a.marketId) || typeof a.city !== 'string' || typeof a.state !== 'string'))
    return null;
  return { total: value.total, questions,
    markets: value.markets.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })),
    areas: value.areas.map((a: { marketId: string; city: string; state: string }) => ({ marketId: a.marketId, city: a.city, state: a.state })),
  };
}

export async function loadCommunityEditor() {
  const client = await requireAdministrator();
  try {
    const { data, error } = await client.rpc('community_pulse_editor');
    const editor = error ? null : parseCommunityEditor(data);
    return editor ? { state: 'available' as const, editor } : { state: 'unavailable' as const };
  } catch { return { state: 'unavailable' as const }; }
}
