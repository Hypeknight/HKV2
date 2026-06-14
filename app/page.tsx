/*
import Link from 'next/link';
import { getFeaturedVenues, getLiveOrTonightEvents, getUpcomingEvents } from '@/lib/data';

export default async function HomePage() {
  const [liveEvents, upcomingEvents, featuredVenues] = await Promise.all([
    getLiveOrTonightEvents(),
    getUpcomingEvents(),
    getFeaturedVenues(),
  ]);

  return (
    <section className="space-y-16 pb-16">
      <Hero />

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Happening now
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Tonight’s energy, without the guesswork
          </h2>
          <p className="mt-4 max-w-2xl text-white/70">
            HypeKnight helps people find the venues and events that are actually active,
            visible, and ready right now.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Live Tonight" value={String(liveEvents.length)} />
            <StatCard label="Upcoming Events" value={String(upcomingEvents.length)} />
            <StatCard label="Active Venues" value={String(featuredVenues.length)} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            HypeKnight
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Hype Nights with HypeKnight
          </h2>
          <p className="mt-4 text-white/75">
            Built for the traveler, the free spirit, and the person who wants the right vibe
            without wasting time.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Explore Events
            </Link>
            <Link
              href="/venues"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
            >
              Browse Venues
            </Link>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Live now"
          title="Events coming up soon"
          text="Only events that are public, approved, and currently inside their active HypeKnight window."
        />

        {liveEvents.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {liveEvents.map((event) => (
              <EventCard key={event.id} event={event} featured />
            ))}
          </div>
        ) : (
          <EmptyCard text="No live or near-term events are showing right now." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Venues"
          title="Active venues on HypeKnight"
          text="Only venues that are active and visible are shown here."
        />

        {featuredVenues.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        ) : (
          <EmptyCard text="No active venues are available yet." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Next up"
          title="Upcoming events in motion"
          text="Approved, active, and currently searchable events scheduled ahead."
        />

        {upcomingEvents.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {upcomingEvents.slice(0, 6).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyCard text="No upcoming events are visible right now." />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <InfoPanel
          title="Find the right vibe"
          text="Filter toward what actually matters: energy, music, venue style, and what is happening now."
        />
        <InfoPanel
          title="Built for nightlife movement"
          text="HypeKnight focuses on active windows, live interaction, and venues that are ready to be discovered."
        />
        <InfoPanel
          title="Designed to grow into Linkd'N"
          text="Comments, music requests, presence, and live venue interaction are already shaping the next layer."
        />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Start moving</p>
        <h2 className="mt-3 text-4xl font-bold text-white">
          Discover the next spot before everyone else does
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/70">
          HypeKnight is built to connect people to the venues and events that actually fit
          their night.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            View Events
          </Link>
          <Link
            href="/venues"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-white hover:border-accent/40"
          >
            View Venues
          </Link>
        </div>
      </section>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-8 py-16 sm:px-12 lg:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_28%)]" />

      <div className="relative max-w-4xl">
        <p className="text-sm uppercase tracking-[0.4em] text-accent">HypeKnight</p>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
          Find the night that fits you.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/75">
          HypeKnight helps people discover active events and venues with real energy,
          real timing, and a better shot at the perfect night out.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Explore Live Events
          </Link>
          <Link
            href="/venues"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white hover:border-accent/40"
          >
            Explore Active Venues
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm uppercase tracking-[0.35em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-white/70">{text}</p>
    </div>
  );
}

function EventCard({
  event,
  featured,
}: {
  event: any;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className={`group block rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-accent/40 hover:bg-white/[0.07] ${
        featured ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.04)]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Event</p>
          <h3 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
            {event.name}
          </h3>
        </div>

        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60">
          Active
        </div>
      </div>

      <p className="mt-4 text-white/65">
        {event.city}, {event.state}
      </p>

      <p className="mt-2 text-sm text-white/55">
        {event.event_start_at ? new Date(event.event_start_at).toLocaleString() : 'Date pending'}
      </p>

      {event.description ? (
        <p className="mt-4 line-clamp-3 text-sm text-white/70">{event.description}</p>
      ) : (
        <p className="mt-4 text-sm text-white/45">No description added yet.</p>
      )}

      <div className="mt-6 text-sm font-medium text-accent">Open event →</div>
    </Link>
  );
}

function VenueCard({ venue }: { venue: any }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group block rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-accent/40 hover:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Venue</p>
          <h3 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
            {venue.name}
          </h3>
        </div>

        {venue.is_featured ? (
          <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent">
            Featured
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-white/65">
        {venue.city}, {venue.state}
      </p>

      {venue.description ? (
        <p className="mt-4 line-clamp-3 text-sm text-white/70">{venue.description}</p>
      ) : (
        <p className="mt-4 text-sm text-white/45">Venue details coming soon.</p>
      )}

      <div className="mt-6 text-sm font-medium text-accent">Open venue →</div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <h3 className="text-2xl font-bold text-white">{title}</h3>
      <p className="mt-4 text-white/70">{text}</p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
      {text}
    </div>
  );
}
  */

import Link from 'next/link';
import { getFeaturedVenues, getLiveOrTonightEvents, getUpcomingEvents } from '@/lib/data';

const LOGO_URL = '/hypeknight-logo.jpeg';

export default async function HomePage() {
  const [liveEvents, upcomingEvents, featuredVenues] = await Promise.all([
    getLiveOrTonightEvents(),
    getUpcomingEvents(),
    getFeaturedVenues(),
  ]);

  const totalEvents = liveEvents.length + upcomingEvents.length;
  const cities = new Set(
    [...liveEvents, ...upcomingEvents]
      .map((event: any) => `${event.city || ''}-${event.state || ''}`)
      .filter(Boolean)
  );

  return (
    <section className="space-y-16 pb-16">
      <Hero />

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <FunMetric label="Events in Motion" value={String(totalEvents)} text="Live, tonight, and upcoming." />
        <FunMetric label="Cities Spotted" value={String(cities.size)} text="Places with event energy." />
        <FunMetric label="Active Venues" value={String(featuredVenues.length)} text="Venues ready to be found." />
        <FunMetric label="Vibe Check" value="24/7" text="Discovery never clocks out." />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Discover
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Find what fits your night
          </h2>
          <p className="mt-4 text-white/70">
            Search events by city, music, venue, timing, vibe, and source. HypeKnight
            is built for people asking, “What’s going on tonight?”
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/events"
              className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
            >
              Explore Events
            </Link>
            <Link
              href="/events/recommended"
              className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-center text-white hover:border-accent/40"
            >
              Recommended For You
            </Link>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Promote
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Put your event in the mix
          </h2>
          <p className="mt-4 text-white/75">
            Promoters can add events, upload images, apply coupons, submit for review,
            and get listed inside HypeKnight’s discovery flow.
          </p>

          <Link
            href="/dashboard/events/new/step-1"
            className="mt-8 inline-flex rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Add an Event
          </Link>
        </div>
      </section>

      <EventSection
        eyebrow="Now / Tonight"
        title="Events happening soon"
        text="Live and near-term events currently visible on HypeKnight."
        events={liveEvents}
      />

      <EventSection
        eyebrow="Next Up"
        title="Upcoming events"
        text="More events coming through the discovery pipeline."
        events={upcomingEvents.slice(0, 6)}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <InfoPanel
          title="Search by vibe"
          text="Users can scan for the kind of night they actually want, not just a random event list."
        />
        <InfoPanel
          title="Built for promoters"
          text="HypeKnight gives event owners a focused path to list, pay, promote, and get reviewed."
        />
        <InfoPanel
          title="Powered by discovery"
          text="The platform can grow city by city using HypeKnight events and supplemental external listings."
        />
      </section>

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Hype Nights with HypeKnight
        </p>
        <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black text-white">
          The night starts with knowing where to go.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/70">
          Explore what’s live, what’s tonight, what’s coming next, and what matches your vibe.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/events"
            className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Start Discovering
          </Link>
          <Link
            href="/auth/register"
            className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-white hover:border-accent/40"
          >
            Create Profile
          </Link>
        </div>
      </section>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-8 py-16 sm:px-12 lg:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.07),transparent_28%)]" />

      <div className="relative grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-accent">
            HypeKnight
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-7xl">
            Find the night that fits you.
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-white/75">
            Discover live events, tonight’s moves, upcoming experiences, and local energy
            without guessing where the night is going.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/events"
              className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
            >
              What’s Going On Tonight?
            </Link>

            <Link
              href="/dashboard"
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-white hover:border-accent/40"
            >
              My Dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-black/30">
            <img
              src={LOGO_URL}
              alt="HypeKnight logo"
              className="h-full w-full object-contain p-4"
            />
          </div>

          <p className="mt-5 text-sm uppercase tracking-[0.3em] text-accent">
            Logo Ready
          </p>
          <p className="mt-3 text-white/65">
            Place your logo image at:
          </p>
          <code className="mt-3 block rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
            public/hypeknight-logo.png
          </code>
        </div>
      </div>
    </section>
  );
}

function EventSection({
  eyebrow,
  title,
  text,
  events,
}: {
  eyebrow: string;
  title: string;
  text: string;
  events: any[];
}) {
  return (
    <section>
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold text-white">{title}</h2>
        <p className="mt-3 text-white/70">{text}</p>
      </div>

      {events.length ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="group block overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 transition hover:border-accent/40 hover:bg-white/[0.07]"
            >
              {event.flyer_url ? (
                <img
                  src={event.flyer_url}
                  alt={event.name}
                  className="h-52 w-full object-cover"
                />
              ) : null}

              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-accent">
                  HypeKnight Event
                </p>

                <h3 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
                  {event.name}
                </h3>

                <p className="mt-3 text-white/60">
                  {[event.city, event.state].filter(Boolean).join(', ')}
                </p>

                {event.event_start_at ? (
                  <p className="mt-2 text-sm text-white/50">
                    {new Date(event.event_start_at).toLocaleString()}
                  </p>
                ) : null}

                {event.description ? (
                  <p className="mt-4 line-clamp-3 text-sm text-white/65">
                    {event.description}
                  </p>
                ) : null}

                <p className="mt-6 text-sm font-medium text-accent">
                  Open event →
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/60">
          No events are showing in this section yet.
        </div>
      )}
    </section>
  );
}

function FunMetric({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-white/60">{text}</p>
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <h3 className="text-2xl font-bold text-white">{title}</h3>
      <p className="mt-4 text-white/70">{text}</p>
    </div>
  );
}