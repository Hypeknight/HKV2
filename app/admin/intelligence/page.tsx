import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateExperimentalEventScore } from '@/lib/intelligence/event-score';

/**
 * Intelligence Lab V1
 *
 * This is intentionally ADMIN ONLY. It gives us a place to validate signal
 * collection and scoring before any experimental score is exposed publicly.
 */
export default async function AdminIntelligencePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: signals, error: signalError } = await supabase
    .from('signals')
    .select(
      'id, signal_type, event_id, venue_id, actor_id, anonymous_session_id, confidence, verification_level, source, surface, occurred_at'
    )
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(5000);

  if (signalError) throw new Error(signalError.message);

  const allSignals = signals ?? [];
  const eventIds = Array.from(
    new Set(allSignals.map((row) => row.event_id).filter(Boolean))
  ) as string[];

  const { data: events } = eventIds.length
    ? await supabase
        .from('events')
        .select('id, name, slug, city, state, event_start_at')
        .in('id', eventIds)
    : { data: [] as any[] };

  const eventById = new Map((events ?? []).map((event) => [event.id, event]));
  const grouped = new Map<string, typeof allSignals>();

  for (const signal of allSignals) {
    if (!signal.event_id) continue;
    const rows = grouped.get(signal.event_id) ?? [];
    rows.push(signal);
    grouped.set(signal.event_id, rows);
  }

  const eventScores = Array.from(grouped.entries())
    .map(([eventId, rows]) => ({
      event: eventById.get(eventId),
      eventId,
      ...calculateExperimentalEventScore(rows),
    }))
    .sort((a, b) => b.score - a.score);

  const typeCounts = new Map<string, number>();
  for (const signal of allSignals) {
    typeCounts.set(signal.signal_type, (typeCounts.get(signal.signal_type) ?? 0) + 1);
  }

  const topTypes = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);
  const uniqueParticipants = new Set(
    allSignals
      .map((row) => row.actor_id || row.anonymous_session_id)
      .filter(Boolean)
  ).size;

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-white/60 hover:text-accent">
        ← Back to Admin
      </Link>

      <section className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Intelligence Lab V1
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Signal health and experimental event intelligence
        </h1>
        <p className="mt-4 max-w-4xl text-white/70">
          Development-only view of the last seven days. Scores here are deliberately
          labeled experimental until real attendance/outcome evidence lets us calibrate
          weights, baselines, confidence, and manipulation controls.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Signals / 7 days" value={allSignals.length} />
        <Metric label="Unique participants" value={uniqueParticipants} />
        <Metric label="Events with signals" value={grouped.size} />
        <Metric label="Signal types active" value={typeCounts.size} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-bold text-white">Event signal ranking</h2>
        <p className="mt-2 text-sm text-white/55">
          This is a test bench, not yet the public Hype Score.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="pb-3">Event</th>
                <th className="pb-3">Index</th>
                <th className="pb-3">State</th>
                <th className="pb-3">Confidence</th>
                <th className="pb-3">Signals</th>
                <th className="pb-3">Unique</th>
                <th className="pb-3">Weighted pts</th>
              </tr>
            </thead>
            <tbody>
              {eventScores.slice(0, 50).map((row) => (
                <tr key={row.eventId} className="border-t border-white/10 text-white/80">
                  <td className="py-4">
                    {row.event?.slug ? (
                      <Link href={`/events/${row.event.slug}`} className="font-semibold text-white hover:text-accent">
                        {row.event.name}
                      </Link>
                    ) : (
                      row.eventId
                    )}
                    {row.event ? (
                      <div className="mt-1 text-xs text-white/40">
                        {row.event.city}, {row.event.state}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-4 text-xl font-black text-accent">{row.score}</td>
                  <td className="py-4">{row.label}</td>
                  <td className="py-4">{Math.round(row.confidence * 100)}%</td>
                  <td className="py-4">{row.signalCount}</td>
                  <td className="py-4">{row.uniqueActors}</td>
                  <td className="py-4">{row.weightedPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-bold text-white">Signal mix</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {topTypes.map(([type, count]) => (
            <div key={type} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">{type}</p>
              <p className="mt-1 text-sm text-white/55">{count} signals</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
