import { exactCount } from '@/lib/reporting/factual';

export const COMMUNITY_PULSE_NOTICE_VERSION = 'community-pulse-v1';
export const COMMUNITY_PULSE_NOTICE = 'Your choice is stored with a HypeKnight account or a temporary browser grant. Published results summarize voluntary responses. Guest access has limits and does not guarantee anonymity.';
export const COMMUNITY_PULSE_MIN_SAMPLE = 5;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isPulseId(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value);
}

export type CommunityPulseResponseInput = {
  questionId: string;
  optionId: string;
  operationId: string;
  expectedRevision: number;
  noticeVersion: typeof COMMUNITY_PULSE_NOTICE_VERSION;
};

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;

export function parseCommunityPulseResponse(value: unknown): CommunityPulseResponseInput | null {
  const input = object(value);
  if (!input || !isPulseId(input.questionId) || !isPulseId(input.optionId) || !isPulseId(input.operationId) ||
      typeof input.expectedRevision !== 'number' || !Number.isInteger(input.expectedRevision) ||
      input.expectedRevision < 0 || input.expectedRevision > 6 ||
      input.noticeVersion !== COMMUNITY_PULSE_NOTICE_VERSION) return null;
  return {
    questionId: input.questionId, optionId: input.optionId, operationId: input.operationId,
    expectedRevision: input.expectedRevision, noticeVersion: COMMUNITY_PULSE_NOTICE_VERSION,
  };
}

type ReportPeriod = { sealedAt: string; periodStart: string; periodEnd: string };
type ReportOption = { optionId: string; count: number; percentage: number };
export type CommunityPulseReport =
  | { state: 'pending' | 'incomplete' | 'unavailable' }
  | ({ state: 'insufficient' } & ReportPeriod)
  | ({ state: 'available'; total: number; options: ReportOption[] } & ReportPeriod);

type Scope =
  | { kind: 'platform'; marketId: null; city: null; state: null }
  | { kind: 'market'; marketId: string; city: string | null; state: string | null };

export type CommunityPulseQuestion = {
  id: string;
  version: number;
  prompt: string;
  description: string | null;
  scope: Scope;
  opensAt: string;
  closesAt: string;
  acceptingResponses: boolean;
  guestsAllowed: boolean;
  options: { id: string; label: string }[];
  report: CommunityPulseReport;
};

const timestamp = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
const count = (v: unknown): v is number => typeof v === 'number' && exactCount(v, null) !== null;

function parseScope(value: unknown): Scope | null {
  const scope = object(value);
  if (scope?.kind === 'platform' && scope.marketId === null && scope.city === null && scope.state === null)
    return { kind: 'platform', marketId: null, city: null, state: null };
  if (scope?.kind === 'market' && isPulseId(scope.marketId) &&
      ((scope.city === null && scope.state === null) || (typeof scope.city === 'string' && typeof scope.state === 'string')))
    return { kind: 'market', marketId: scope.marketId, city: scope.city as string | null, state: scope.state as string | null };
  return null;
}

export function parseCommunityPulseReport(
  value: unknown, optionIds: readonly string[], opensAt: string, closesAt: string,
): CommunityPulseReport {
  const data = object(value);
  if (data?.state === 'pending') return { state: 'pending' };
  if (data?.state === 'unavailable') return { state: 'unavailable' };
  if (!data || !timestamp(data.sealedAt) || !timestamp(data.periodStart) || !timestamp(data.periodEnd) ||
      Date.parse(data.periodStart) !== Date.parse(opensAt) || Date.parse(data.periodEnd) < Date.parse(opensAt) ||
      Date.parse(data.periodEnd) > Date.parse(closesAt) || Date.parse(data.sealedAt) < Date.parse(data.periodEnd))
    return { state: 'incomplete' };

  const period = { sealedAt: data.sealedAt, periodStart: data.periodStart, periodEnd: data.periodEnd };
  if (data.state === 'insufficient') return { state: 'insufficient', ...period };
  if (data.state !== 'available' || !count(data.total) || data.total < COMMUNITY_PULSE_MIN_SAMPLE ||
      !Array.isArray(data.options) || data.options.length !== optionIds.length ||
      optionIds.length < 2 || new Set(optionIds).size !== optionIds.length)
    return { state: 'incomplete' };

  const total = data.total;
  const rows = new Map<string, ReportOption>();
  for (const raw of data.options) {
    const row = object(raw);
    if (!row || typeof row.optionId !== 'string' || !optionIds.includes(row.optionId) || rows.has(row.optionId) ||
        !count(row.count) || row.count > total || typeof row.percentage !== 'number' ||
        !Number.isFinite(row.percentage) || row.percentage < 0 || row.percentage > 100 || Math.abs(row.percentage - row.count / total * 100) > 0.005000001)
      return { state: 'incomplete' };
    rows.set(row.optionId, { optionId: row.optionId, count: row.count, percentage: row.percentage });
  }
  const options = optionIds.map(id => rows.get(id)!);
  if (options.reduce((sum, row) => sum + row.count, 0) !== total) return { state: 'incomplete' };
  return { state: 'available', ...period, total, options };
}

export function parseCommunityPulseQuestion(value: unknown, expectedId: string): CommunityPulseQuestion | null {
  const row = object(value);
  if (!row || !isPulseId(row.id) || row.id !== expectedId.toLowerCase() || !count(row.version) || row.version < 1 ||
      typeof row.prompt !== 'string' || (row.description !== null && typeof row.description !== 'string') ||
      !timestamp(row.opensAt) || !timestamp(row.closesAt) || Date.parse(row.closesAt) <= Date.parse(row.opensAt) ||
      typeof row.acceptingResponses !== 'boolean' || typeof row.guestsAllowed !== 'boolean' ||
      !Array.isArray(row.options) || row.options.length < 2 || row.options.length > 6) return null;
  const scope = parseScope(row.scope);
  if (!scope) return null;
  const options: CommunityPulseQuestion['options'] = [];
  for (const raw of row.options) {
    const option = object(raw);
    if (!option || !isPulseId(option.id) || typeof option.label !== 'string' || options.some(o => o.id === option.id))
      return null;
    options.push({ id: option.id, label: option.label });
  }
  const report = parseCommunityPulseReport(row.report, options.map(o => o.id), row.opensAt, row.closesAt);
  return {
    id: row.id, version: row.version, prompt: row.prompt, description: row.description,
    scope, opensAt: row.opensAt, closesAt: row.closesAt, acceptingResponses: row.acceptingResponses,
    guestsAllowed: row.guestsAllowed, options, report,
  };
}

export type CommunityPulseSubmission =
  | { state: 'accepted' | 'revision_conflict'; revision: number }
  | { state: 'invalid' | 'closed' | 'ineligible' | 'guest_response_exists' | 'operation_conflict' | 'rate_limited' | 'unavailable' };

export function parseCommunityPulseSubmission(value: unknown): CommunityPulseSubmission {
  const row = object(value);
  switch (row?.state) {
    case 'accepted':
    case 'revision_conflict':
      return count(row.revision) && row.revision <= 6 && (row.state !== 'accepted' || row.revision > 0)
        ? { state: row.state, revision: row.revision } : { state: 'unavailable' };
    case 'invalid':
    case 'closed':
    case 'ineligible':
    case 'guest_response_exists':
    case 'operation_conflict':
    case 'rate_limited':
      return { state: row.state };
    default:
      return { state: 'unavailable' };
  }
}
