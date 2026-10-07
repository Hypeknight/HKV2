import Link from 'next/link';
import { getVenueCommandContext } from '@/lib/venues/command-center';

export default async function VenueEvents({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getVenueCommandContext(id);
  const { data: events, error } = await supabase.from('events')
    .select('id,name,status,is_public,venue_connection_status,event_start_at')
    .eq('venue_id', id).order('event_start_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return <section className="mx-auto max-w-5xl space-y-6 px-4 py-10 text-white">
    <h1 className="text-3xl font-bold">Venue Events</h1>
    <p>Canonical events visible to your account under existing event policies (latest 100). Organizers can also create events at this location without a canonical connection. Venue acceptance is independent of event validity.</p>
    <div className="flex gap-4">
      <Link className="text-accent" href={'/dashboard/events/new?venue_id=' + id}>Create event in Event Builder</Link>
      <Link className="text-accent" href={'/dashboard/venues/connections?venue_id=' + id}>Review canonical connection requests</Link>
    </div>
    {(events || []).map(event => <article key={event.id} className="rounded-xl border border-white/10 p-4">
      <h2 className="text-xl">{event.name}</h2>
      <p>{event.status} · {event.is_public ? 'Public' : 'Not public'} · Connection: {event.venue_connection_status || 'Not recorded'}</p>
    </article>)}
    {!events?.length && <p>No associated events visible to your account.</p>}
  </section>;
}
