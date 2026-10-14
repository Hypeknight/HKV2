export type PatronPulseOptionResult = {
  optionId: string; label: string; count: number | null; percentage: number | null;
};
export type PatronPulseResultSummary = {
  pulseId: string; title: string; status: string; totalResponses: number | null;
  available: boolean; optionSample: number | null;
  sampleState?: 'empty' | 'insufficient_sample' | 'observed' | 'diagnostic';
  options: PatronPulseOptionResult[];
};
export default function PulseResultsPanel({ results, unavailable = false }: {
  results: PatronPulseResultSummary[]; unavailable?: boolean;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">Response Analytics</p>
      <h2 className="mt-2 text-2xl font-black text-white">Pulse results</h2>
      <p className="mt-3 text-xs leading-5 text-white/45">The five-answer minimum is a display safeguard. It does not establish anonymity or protection from inference.</p>
      {results.some(pulse => pulse.sampleState === 'diagnostic') ? <p className="mt-2 text-xs text-white/45">Administrator diagnostics retain authorized factual values without this display minimum.</p> : null}
      <div className="mt-6 space-y-5">
        {unavailable ? (
          <p role="status" className="text-sm text-yellow-100">Pulse results are unavailable: the response query failed or did not return a complete sample. No percentages are shown.</p>
        ) : results.length ? results.map(pulse => {
          // Defensive presentation for older callers; production props are filtered at the DB boundary.
          const state = pulse.sampleState || (pulse.totalResponses === 0 ? 'empty' : pulse.totalResponses !== null && pulse.totalResponses < 5 ? 'insufficient_sample' : 'observed');
          const visible = pulse.available && (state === 'observed' || state === 'diagnostic');
          const insufficient = state === 'insufficient_sample';
          return (
            <article key={pulse.pulseId} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-white">{pulse.title}</h3>
                  <p className="mt-1 text-sm text-white/45">
                    {insufficient ? 'Insufficient sample' : pulse.totalResponses === null ? 'Unavailable' : pulse.totalResponses + ' current answer' + (pulse.totalResponses === 1 ? '' : 's')}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">{formatLabel(pulse.status)}</span>
              </div>
              <p className="mt-3 text-xs text-white/45">
                Current answers count once per participant/Pulse. Response revisions are separate history, not additional participants or attendance.
                {insufficient ? ' At least five effective current answers are required to display option results.' : state === 'empty' || pulse.optionSample === 0 ? ' No valid option response sample; percentages are withheld.' : pulse.optionSample !== null ? ' Percentages use ' + pulse.optionSample + ' valid current option answers.' : ' Results unavailable.'}
              </p>
              {pulse.options.length ? (
                <div className="mt-5 space-y-4">
                  {pulse.options.map(option => (
                    <div key={option.optionId}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold text-white/75">{option.label}</span>
                        <span className="text-white/45">
                          {!visible ? 'Withheld · No percentage' : (option.count === null ? 'Unavailable' : option.count) + (option.percentage === null ? ' · No percentage' : ' · ' + option.percentage.toFixed(1) + '%')}
                        </span>
                      </div>
                      {visible && option.percentage !== null ? (
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-accent" style={{ width: String(Math.min(100, Math.max(0, option.percentage))) + '%' }} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : <p className="mt-4 text-sm text-white/45">No option percentage applies to this Pulse.</p>}
            </article>
          );
        }) : <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/50">No response data is available yet.</div>}
      </div>
    </section>
  );
}
function formatLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}
