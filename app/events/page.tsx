/*
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function EventsPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: events, error } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('status', 'active')
    .eq('is_public', true)
    .is('removed_at', null)
    .gte('event_start_at', now)
    .order('event_start_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <section className="space-y-10">
      <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Events</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Active Events on HypeKnight</h1>
        <p className="mt-4 max-w-3xl text-white/70">
          Browse events that are approved, public, and currently active inside their HypeKnight visibility window.
        </p>
      </div>

      {events?.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="group block rounded-[2rem] border border-white/10 bg-white/5 p-6 hover:border-accent/40 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-accent">Event</p>
                  <h2 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
                    {event.name}
                  </h2>
                </div>

                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/60">
                  {event.status}
                </div>
              </div>

              <p className="mt-4 text-white/65">
                {event.city}, {event.state}
              </p>

              <p className="mt-2 text-sm text-white/55">
                {event.event_start_at
                  ? new Date(event.event_start_at).toLocaleString()
                  : 'Date pending'}
              </p>

              {event.description ? (
                <p className="mt-4 line-clamp-3 text-sm text-white/70">{event.description}</p>
              ) : (
                <p className="mt-4 text-sm text-white/45">No description added yet.</p>
              )}

              <div className="mt-6 text-sm font-medium text-accent">Open event →</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          No active events are available right now.
        </div>
      )}
    </section>
  );
}
  */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type EventCardItem = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  event_start_at?: string | null;
  image_url?: string | null;
  href: string;
  status: string;
  source_label: string;
  is_external: boolean;
  venue_name?: string | null;
};

export default async function EventsPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: hypeEvents, error: hypeError } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('status', 'active')
    .eq('is_public', true)
    .is('removed_at', null)
    .gte('event_start_at', now)
    .order('event_start_at', { ascending: true });

  if (hypeError) {
    throw new Error(hypeError.message);
  }

  const { data: externalEvents, error: externalError } = await supabase
    .from('external_events')
    .select('*')
    .eq('status', 'active')
    .gte('event_start_at', now)
    .order('event_start_at', { ascending: true });

  if (externalError) {
    throw new Error(externalError.message);
  }

  const cards: EventCardItem[] = [
    ...(hypeEvents ?? []).map((event) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: event.state,
      description: event.description,
      event_start_at: event.event_start_at,
      image_url: event.flyer_url,
      href: `/events/${event.slug}`,
      status: event.status || 'active',
      source_label: 'HypeKnight',
      is_external: false,
      venue_name: event.venue?.name || event.venue_name,
    })),
    ...(externalEvents ?? []).map((event) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: event.state,
      description: event.description,
      event_start_at: event.event_start_at,
      image_url: event.image_url,
      href: `/events/external/${event.id}`,
      status: event.status || 'active',
      source_label:
        event.source_code === 'ticketmaster'
          ? 'Ticketmaster'
          : event.source_code || 'External',
      is_external: true,
      venue_name: event.venue_name,
    })),
  ].sort((a, b) => {
    const aTime = a.event_start_at ? new Date(a.event_start_at).getTime() : Infinity;
    const bTime = b.event_start_at ? new Date(b.event_start_at).getTime() : Infinity;
    return aTime - bTime;
  });

  const hypeCount = cards.filter((event) => !event.is_external).length;
  const externalCount = cards.filter((event) => event.is_external).length;

  return (
    <section className="space-y-10">
      <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Events</p>

        <h1 className="mt-3 text-4xl font-bold text-white">
          Discover Events on HypeKnight
        </h1>

        <p className="mt-4 max-w-3xl text-white/70">
          Browse active HypeKnight events and supplemental events discovered from trusted external sources.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="HypeKnight Events" value={String(hypeCount)} />
          <Stat label="External Events" value={String(externalCount)} />
          <Stat label="Total Results" value={String(cards.length)} />
        </div>
      </div>

      {cards.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((event) => (
            <EventCard key={`${event.source_label}-${event.id}`} event={event} />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          No active events are available right now.
        </div>
      )}
    </section>
  );
}

function EventCard({ event }: { event: EventCardItem }) {
  return (
    <Link
      href={event.href}
      className="group block overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 hover:border-accent/40 hover:bg-white/[0.07]"
    >
      <div className="aspect-[16/10] bg-black/30">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/40">
            Event image coming soon
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Event
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
              {event.name}
            </h2>
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${
              event.is_external
                ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
                : 'border-accent/20 bg-accent/10 text-accent'
            }`}
          >
            {event.source_label}
          </div>
        </div>

        {event.venue_name ? (
          <p className="mt-4 text-white/65">{event.venue_name}</p>
        ) : null}

        <p className="mt-2 text-white/60">
          {event.city || 'City TBA'}, {event.state || 'State TBA'}
        </p>

        <p className="mt-2 text-sm text-white/55">
          {event.event_start_at
            ? new Date(event.event_start_at).toLocaleString()
            : 'Date pending'}
        </p>

        {event.description ? (
          <p className="mt-4 line-clamp-3 text-sm text-white/70">
            {event.description}
          </p>
        ) : (
          <p className="mt-4 text-sm text-white/45">
            No description added yet.
          </p>
        )}

        {event.is_external ? (
          <p className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-100">
            Supplemental event. Not originally hosted or managed by HypeKnight.
          </p>
        ) : null}

        <div className="mt-6 text-sm font-medium text-accent">
          Open event →
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}