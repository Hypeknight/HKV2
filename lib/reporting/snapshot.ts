import { exactCount, type FactMetric } from './factual';
import type { PatronPulseResultSummary } from '@/components/patron-pulse/PulseResultsPanel';
const unavailable = (): FactMetric => ({ value: null, state: 'unavailable' });
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === 'number' && exactCount(value, null) !== null;
const observed = (value: number): FactMetric => ({ value, state: 'observed' });
/** Reject missing RPCs, partial contracts and unsafe bigint conversions. */
export function ownerSnapshot(data: unknown, error: unknown) {
  const healthy = !error && object(data) && data.version === 'p2b3b' &&
    ['saved','going','interested','discovery_observations','organic_observations','unclassified_observations'].every(key => count(data[key])) &&
    Number(data.organic_observations) + Number(data.unclassified_observations) === data.discovery_observations;
  const read = (key: string) => healthy ? observed(Number((data as Record<string, unknown>)[key])) : unavailable();
  return { available: healthy, saved: read('saved'), going: read('going'), interested: read('interested'),
    organic: read('organic_observations'), unclassified: read('unclassified_observations') };
}
/** Anonymous callers have no public total policy. Visible RLS zero is not a total. */
export function publicCurrentCount(countValue: number | null, error: unknown, authorized: boolean): string {
  const value = authorized ? exactCount(countValue, error) : null;
  return value === null ? 'Unavailable' : new Intl.NumberFormat('en-US').format(value);
}
/** One authorized DB snapshot, not paginated raw answers. Identities never enter UI props. */
export function pulseSnapshot(data: unknown, error: unknown, sessionId: string) {
  const missing = { unavailable: true, responseCount: null, results: [] as PatronPulseResultSummary[] };
  if (error || !object(data) || data.version !== 'p2b3b' || data.complete !== true ||
      data.sessionId !== sessionId || !count(data.responseCount) || !Array.isArray(data.results)) return missing;
  const results: PatronPulseResultSummary[] = [];
  const pulseIds = new Set<string>();
  for (const pulse of data.results) {
    if (!object(pulse) || typeof pulse.pulseId !== 'string' || !pulse.pulseId || pulseIds.has(pulse.pulseId) ||
        typeof pulse.title !== 'string' || typeof pulse.status !== 'string' ||
        !count(pulse.totalResponses) || !count(pulse.optionSample) || pulse.optionSample > pulse.totalResponses ||
        !Array.isArray(pulse.options)) return missing;
    pulseIds.add(pulse.pulseId);
    const optionIds = new Set<string>();
    const options: PatronPulseResultSummary['options'] = [];
    let optionSum = 0;
    for (const option of pulse.options) {
      if (!object(option) || typeof option.optionId !== 'string' || !option.optionId || optionIds.has(option.optionId) ||
          typeof option.label !== 'string' || !count(option.count)) return missing;
      optionIds.add(option.optionId); optionSum += option.count;
      options.push({ optionId: option.optionId, label: option.label, count: option.count,
        percentage: pulse.optionSample > 0 ? option.count / pulse.optionSample * 100 : null });
    }
    if (optionSum !== pulse.optionSample) return missing;
    results.push({ pulseId: pulse.pulseId, title: pulse.title, status: pulse.status,
      totalResponses: pulse.totalResponses, optionSample: pulse.optionSample, available: true, options });
  }
  if (results.reduce((sum, pulse) => sum + pulse.totalResponses!, 0) !== data.responseCount) return missing;
  return { unavailable: false, responseCount: data.responseCount, results };
}
