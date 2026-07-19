export type PatronPulseActivityItem = {
  id: string;
  action: string;
  actor_role: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
};

export default function PatronPulseActivityTimeline({
  items,
}: {
  items: PatronPulseActivityItem[];
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        Operational History
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Patron Pulse timeline
      </h2>

      <div className="mt-6 space-y-4">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    {formatLabel(item.action)}
                  </p>

                  <p className="mt-1 text-sm text-white/45">
                    {formatLabel(item.actor_role)}
                    {item.from_status ||
                    item.to_status ? (
                      <>
                        {' · '}
                        {item.from_status
                          ? formatLabel(
                              item.from_status
                            )
                          : 'Created'}
                        {' → '}
                        {item.to_status
                          ? formatLabel(
                              item.to_status
                            )
                          : 'Updated'}
                      </>
                    ) : null}
                  </p>
                </div>

                <time className="text-xs text-white/35">
                  {formatDate(item.created_at)}
                </time>
              </div>

              {item.note ? (
                <p className="mt-3 text-sm leading-6 text-white/60">
                  {item.note}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/50">
            New Patron Pulse actions will appear here.
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}