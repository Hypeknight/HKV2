import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from 'components/empty-state';
import { EventCard } from 'components/cards';
import { getVenueBySlug, getVenueEvents } from '@/lib/data';

export default async function VenueDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();

  const events = await getVenueEvents(venue.id);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">Venue</p>
            <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
            <p className="mt-4 max-w-3xl text-white/70">{venue.description || 'No venue description yet.'}</p>
          </div>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div>
              <h2 className="font-semibold text-white">Location</h2>
              <p className="mt-2 text-white/70">{venue.address || `${venue.city}, ${venue.state}`}</p>
            </div>
            {venue.website_url ? (
              <div>
                <h2 className="font-semibold text-white">Website</h2>
                <a href={venue.website_url} target="_blank" rel="noreferrer" className="mt-2 block text-accent hover:underline">
                  Visit site
                </a>
              </div>
            ) : null}
            {venue.instagram_url ? (
              <div>
                <h2 className="font-semibold text-white">Instagram</h2>
                <a href={venue.instagram_url} target="_blank" rel="noreferrer" className="mt-2 block text-accent hover:underline">
                  Follow venue
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-white">Venue events</h2>
          <Link href="/events" className="text-sm text-white/70 hover:text-accent">
            Browse all events →
          </Link>
        </div>
        {events.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No scheduled events"
            description="This venue has no upcoming events yet. Add one from the dashboard when you are ready."
          />
        )}
      </div>
    </section>
  );
}
