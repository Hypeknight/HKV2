import Link from 'next/link';
import { getVenueCommandContext } from '@/lib/venues/command-center';

export default async function VenueIntelligence({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getVenueCommandContext(id);
  return <section className="mx-auto max-w-5xl space-y-6 px-4 py-10 text-white">
    <h1 className="text-3xl font-bold">Intelligence</h1>
    <p>Venue Patron Pulse interpretation is not available in this checkpoint. Signal definitions and attribution must be aligned before derived metrics or scores are introduced.</p>
    <Link className="text-accent" href={'/dashboard/venues/' + id + '/analytics'}>View factual analytics</Link>
  </section>;
}
