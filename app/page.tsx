import Link from 'next/link';
import { EventCard, VenueCard } from 'components/cards';
import { getFeaturedVenues, getUpcomingEvents } from '@/lib/data';

export default async function HomePage() {
  const [venues, events] = await Promise.all([getFeaturedVenues(), getUpcomingEvents()]);

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.4em] text-accent">
              Rebuilt for scale
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-tight text-white sm:text-6xl">
              HypeKnight, rebuilt for cleaner growth.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/70">
              This new build keeps the nightlife-discovery mission, but moves the app into a cleaner,
              GitHub-ready structure with Supabase-backed data, better admin flow, and a clear path to mobile.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/events"
                className="rounded-full bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
              >
                Explore events
              </Link>
              <Link
                href="/venues"
                className="rounded-full border border-white/10 px-6 py-3 font-semibold text-white hover:border-accent/50 hover:text-accent"
              >
                Browse venues
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Fresh schema', 'No forced migration of old users, venues, or events.'],
                ['Supabase-ready', 'Postgres schema, RLS policies, and seed data included.'],
                ['Render-ready', 'Comes with a Render blueprint and GitHub-friendly project layout.'],
                ['Mobile path', 'Web-first structure with a Capacitor starter config.']
              ].map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <h2 className="font-semibold text-white">{title}</h2>
                  <p className="mt-2 text-sm text-white/60">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">Upcoming</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Featured events</h2>
          </div>
          <Link href="/events" className="text-sm font-semibold text-white/70 hover:text-accent">
            View all events →
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">Venues</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Featured rooms and operators</h2>
          </div>
          <Link href="/venues" className="text-sm font-semibold text-white/70 hover:text-accent">
            View all venues →
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </section>
    </div>
  );
}
