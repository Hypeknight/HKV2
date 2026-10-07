import Link from 'next/link';
import { getVenueCommandContext } from '@/lib/venues/command-center';

export default async function VenueOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { venue } = await getVenueCommandContext(id);
  return <section className="mx-auto max-w-5xl space-y-6 px-4 py-10 text-white">
    <h1 className="text-3xl font-bold">{venue.name} · Overview</h1>
    <p>{venue.address}, {venue.city}, {venue.state}</p>
    <dl className="grid gap-4 sm:grid-cols-2">
      {[
        ['Lifecycle', venue.status], ['Public visibility', venue.is_visible ? 'Visible (subject to moderation)' : 'Administratively hidden'],
        ['Claim state', venue.claim_state], ['Verification state', venue.verification_state],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 p-4"><dt>{label}</dt><dd className="mt-2 font-semibold">{value || 'Not recorded'}</dd></div>)}
    </dl>
    <p>Identity, location, management, verification and paid capabilities remain separate. An unclaimed venue remains a valid entity under HypeKnight stewardship.</p>
    <div className="flex flex-wrap gap-4">
      <Link className="text-accent" href={'/venues/' + venue.slug}>View venue page</Link>
      <Link className="text-accent" href={'/dashboard/events/new?venue_id=' + id}>Create event</Link>
      <Link className="text-accent" href={'/dashboard/venues/' + id + '/management'}>Claims, corrections and managers</Link>
    </div>
  </section>;
}
