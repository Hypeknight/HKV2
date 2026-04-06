import { EmptyState } from 'components/empty-state';
import { VenueCard } from 'components/cards';
import { getFeaturedVenues } from '@/lib/data';

export default async function VenuesPage() {
  const venues = await getFeaturedVenues();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Venues</p>
        <h1 className="mt-2 text-4xl font-bold text-white">Explore nightlife spaces</h1>
      </div>
      {venues.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No venues yet"
          description="Create a venue in the admin area and publish it when you are ready to make it visible."
        />
      )}
    </section>
  );
}
