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
/** Complete DB disclosure snapshot. Unknown contracts and leaked suppressed fields fail closed. */
export function pulseSnapshot(data: unknown, error: unknown, sessionId: string, allowDiagnostics = false) {
  const missing = { unavailable: true, responseCount: null, responseCountState: 'unavailable' as const, results: [] as PatronPulseResultSummary[] };
  if (error || !object(data) || data.version !== 'p2b3b-display-v1' || data.complete !== true ||
      data.sessionId !== sessionId || !Array.isArray(data.results) ||
      !['aggregate', 'diagnostic'].includes(String(data.disclosure)) ||
      (data.disclosure === 'diagnostic' && !allowDiagnostics)) return missing;
  const diagnostic = data.disclosure === 'diagnostic';
  const results: PatronPulseResultSummary[] = [];
  const pulseIds = new Set<string>();
  let suppressed = false;
  for (const pulse of data.results) {
    if (!object(pulse) || typeof pulse.pulseId !== 'string' || !pulse.pulseId || pulseIds.has(pulse.pulseId) ||
        typeof pulse.title !== 'string' || typeof pulse.status !== 'string' || !Array.isArray(pulse.options)) return missing;
    pulseIds.add(pulse.pulseId);
    const state = pulse.sampleState;
    const insufficient = state === 'insufficient_sample';
    const empty = state === 'empty';
    const visible = state === 'observed' || state === 'diagnostic';
    if (diagnostic ? state !== 'diagnostic' : !['empty', 'insufficient_sample', 'observed'].includes(String(state))) return missing;
    if (insufficient && (pulse.totalResponses !== null || pulse.optionSample !== null)) return missing;
    if (empty && (pulse.totalResponses !== 0 || pulse.optionSample !== null)) return missing;
    if (visible && (!count(pulse.totalResponses) || !count(pulse.optionSample) || pulse.optionSample > pulse.totalResponses ||
        (state === 'observed' && pulse.totalResponses < 5))) return missing;
    suppressed ||= insufficient;
    const optionIds = new Set<string>();
    const options: PatronPulseResultSummary['options'] = [];
    let optionSum = 0;
    for (const option of pulse.options) {
      if (!object(option) || typeof option.optionId !== 'string' || !option.optionId || optionIds.has(option.optionId) ||
          typeof option.label !== 'string' || (visible ? !count(option.count) : option.count !== null)) return missing;
      optionIds.add(option.optionId);
      if (visible) optionSum += option.count as number;
      options.push({ optionId: option.optionId, label: option.label, count: visible ? option.count as number : null,
        percentage: visible && (pulse.optionSample as number) > 0 ? (option.count as number) / (pulse.optionSample as number) * 100 : null });
    }
    if (visible && optionSum !== pulse.optionSample) return missing;
    results.push({ pulseId: pulse.pulseId, title: pulse.title, status: pulse.status,
      sampleState: state as PatronPulseResultSummary['sampleState'], totalResponses: insufficient ? null : pulse.totalResponses as number,
      optionSample: visible ? pulse.optionSample as number : null, available: true, options });
  }
  if (suppressed) {
    if (data.responseCount !== null || data.responseCountState !== 'insufficient_sample') return missing;
  } else if (!count(data.responseCount) || data.responseCountState !== 'observed' ||
      results.reduce((sum, pulse) => sum + pulse.totalResponses!, 0) !== data.responseCount) return missing;
  return { unavailable: false, responseCount: suppressed ? null : data.responseCount as number,
    responseCountState: suppressed ? 'insufficient_sample' as const : 'observed' as const, results };
}
