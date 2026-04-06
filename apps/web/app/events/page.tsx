import { EmptyState } from '@/components/empty-state';
import { EventCard } from '@/components/cards';
import { getUpcomingEvents } from '@/lib/data';

export default async function EventsPage() {
  const events = await getUpcomingEvents();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Events</p>
        <h1 className="mt-2 text-4xl font-bold text-white">What is coming up</h1>
      </div>
      {events.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No events yet"
          description="Seed data is empty or all events are drafts. Add a new event from the admin area once you create your first venue."
        />
      )}
    </section>
  );
}
