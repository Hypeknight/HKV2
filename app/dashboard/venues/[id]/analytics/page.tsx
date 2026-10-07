import { getVenueCommandContext } from '@/lib/venues/command-center';

export default async function VenueAnalytics({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getVenueCommandContext(id);
  const definitions = [
    ['Canonical event records visible to your account', 'events'],
    ['Presence session records', 'venue_presence_sessions'],
    ['Presence check-in records', 'venue_presence_checkins'],
  ] as const;
  const results = await Promise.all(definitions.map(async ([label, table]) => {
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('venue_id', id);
    if (error) throw new Error(error.message);
    return { label, count: count ?? 0 };
  }));
  return <section className="mx-auto max-w-5xl space-y-6 px-4 py-10 text-white">
    <h1 className="text-3xl font-bold">Factual Analytics</h1>
    <p>Current stored record counts for this venue under your database access policies. Check-ins are records, not unique guests or verified attendance. These are not audience scores or Intelligence estimates.</p>
    <dl className="grid gap-4 sm:grid-cols-3">{results.map(result => <div key={result.label} className="rounded-xl border border-white/10 p-4"><dt>{result.label}</dt><dd className="mt-3 text-3xl">{result.count}</dd></div>)}</dl>
  </section>;
}
