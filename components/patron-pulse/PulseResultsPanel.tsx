export type PatronPulseOptionResult = {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
};

export type PatronPulseResultSummary = {
  pulseId: string;
  title: string;
  status: string;
  totalResponses: number;
  options: PatronPulseOptionResult[];
};

export default function PulseResultsPanel({
  results,
}: {
  results: PatronPulseResultSummary[];
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        Response Analytics
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Pulse results
      </h2>

      <div className="mt-6 space-y-5">
        {results.length ? (
          results.map((pulse) => (
            <article
              key={pulse.pulseId}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-white">
                    {pulse.title}
                  </h3>

                  <p className="mt-1 text-sm text-white/45">
                    {pulse.totalResponses} response
                    {pulse.totalResponses === 1
                      ? ''
                      : 's'}
                  </p>
                </div>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
                  {formatLabel(pulse.status)}
                </span>
              </div>

              {pulse.options.length ? (
                <div className="mt-5 space-y-4">
                  {pulse.options.map((option) => (
                    <div key={option.optionId}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold text-white/75">
                          {option.label}
                        </span>

                        <span className="text-white/45">
                          {option.count} ·{' '}
                          {option.percentage.toFixed(1)}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                option.percentage
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/45">
                  Text responses are included in the total.
                  Detailed moderation can be added next.
                </p>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/50">
            No response data is available yet.
          </div>
        )}
      </div>
    </section>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}