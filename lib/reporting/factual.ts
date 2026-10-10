/** Factual reporting only: no audience, attendance or acquisition inference. */
export type FactMetric = {
  value: number | null;
  state: 'observed' | 'no_observations' | 'unavailable' | 'not_instrumented';
};
export type SignalSummaryRow = {
  signal_type: string;
  signal_count: number | string;
  unique_actor_count: number | string;
};
const unavailable = (): FactMetric => ({ value: null, state: 'unavailable' });
const noObservations = (): FactMetric => ({ value: null, state: 'no_observations' });
export function exactCount(count: number | null, error: unknown): number | null {
  return !error && count !== null && Number.isSafeInteger(count) && count >= 0 ? count : null;
}
export function formatFact(metric: FactMetric): string {
  if (metric.state === 'observed' && metric.value !== null) return new Intl.NumberFormat('en-US').format(metric.value);
  return { observed: 'Unavailable', no_observations: 'No observations', unavailable: 'Unavailable', not_instrumented: 'Not instrumented' }[metric.state];
}
export function eventFacts(rows: SignalSummaryRow[] | null, error: unknown) {
  const healthy = !error && Array.isArray(rows) && rows.every(row =>
    typeof row.signal_type === 'string' &&
    [row.signal_count, row.unique_actor_count].every(value => value !== null && value !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0)
  ) && new Set(rows.map(row => row.signal_type)).size === rows.length;
  const read = (type: string, unique = false): FactMetric => {
    if (!healthy) return unavailable();
    const row = rows!.find(item => item.signal_type === type);
    return row ? { value: Number(unique ? row.unique_actor_count : row.signal_count), state: 'observed' } : noObservations();
  };
  const facts = {
    views: read('event_view'), viewIdentifiers: read('event_view', true),
    saves: read('event_saved'), shares: read('event_shared'),
    ticketClicks: read('ticket_outbound'), directions: read('directions_requested'),
    going: read('event_rsvp_going'), discoveryImpressions: read('discovery_impression'),
    // Type-only legacy-compatible summary cannot classify historical exposure.
    organicImpressions: unavailable(),
    featuredImpressions: { value: null, state: 'not_instrumented' } as FactMetric,
  };
  const activity = [facts.views, facts.saves, facts.shares, facts.ticketClicks, facts.directions, facts.going];
  const total: FactMetric = !healthy ? unavailable() : activity.every(item => item.state === 'no_observations')
    ? noObservations() : { value: activity.reduce((sum, item) => sum + (item.value ?? 0), 0), state: 'observed' };
  return { ...facts, total, available: healthy };
}
export type CurrentPulseResponse = {
  id: string; pulse_id: string; option_id: string | null;
  text_response?: string | null; numeric_response?: number | null; boolean_response?: boolean | null;
  submitted_at: string; updated_at?: string | null;
};
export type PulseDefinition = {
  id: string; title: string; status: string; options?: { id: string; label: string }[];
};
/** Current rows only; DB uniqueness is per participant/Pulse or legacy user/Pulse.
 * Revisions update the same row ID. Identities never enter UI props.
 */
export function pulseFacts(pulses: PulseDefinition[], rows: CurrentPulseResponse[] | null, count: number | null, error: unknown) {
  const complete = !error && Array.isArray(rows) && exactCount(count, null) !== null && rows.length === count;
  const latest = new Map<string, CurrentPulseResponse>();
  if (complete) for (const row of rows!) {
    const previous = latest.get(row.id);
    if (!previous || Date.parse(row.updated_at || row.submitted_at) > Date.parse(previous.updated_at || previous.submitted_at)) latest.set(row.id, row);
  }
  return pulses.map(pulse => {
    const current = Array.from(latest.values()).filter(row => row.pulse_id === pulse.id);
    const options = pulse.options || [];
    const valid = current.filter(row => options.some(option => option.id === row.option_id));
    return {
      pulseId: pulse.id, title: pulse.title, status: pulse.status, available: complete,
      totalResponses: complete ? current.length : null,
      optionSample: complete ? valid.length : null,
      options: options.map(option => {
        const selected = valid.filter(row => row.option_id === option.id).length;
        return { optionId: option.id, label: option.label, count: complete ? selected : null,
          percentage: complete && valid.length > 0 ? selected / valid.length * 100 : null };
      }),
    };
  });
}
