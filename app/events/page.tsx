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

import DiscoveryEventCard, {
  DiscoveryEventCardItem,
} from '@/components/events/DiscoveryEventCard';
import { createClient } from '@/lib/supabase/server';

type SearchParams = {
  q?: string;
  city?: string;
  state?: string;
  source?: string;
  date?: string;
};

type EventsPageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = searchParams ? await searchParams : {};

  const q = params.q?.trim() || '';
  const city = params.city?.trim() || '';
  const state = params.state?.trim() || '';
  const source = params.source || 'all';
  const date = params.date || 'all';

  const supabase = await createClient();

  const now = new Date();
  const nowIso = now.toISOString();
  const endDate = getEndDate(date);

  let hypeQuery = supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('status', 'active')
    .eq('is_public', true)
    .is('removed_at', null)
    .gte('event_start_at', nowIso)
    .order('event_start_at', { ascending: true });

  if (q) {
    hypeQuery = hypeQuery.or(
      `name.ilike.%${q}%,description.ilike.%${q}%,venue_name.ilike.%${q}%,city.ilike.%${q}%`
    );
  }

  if (city) hypeQuery = hypeQuery.ilike('city', `%${city}%`);
  if (state) hypeQuery = hypeQuery.ilike('state', `%${state}%`);
  if (endDate) hypeQuery = hypeQuery.lte('event_start_at', endDate.toISOString());

  let externalQuery = supabase
    .from('external_events')
    .select('*')
    .eq('status', 'active')
    .or(`event_start_at.gte.${nowIso},event_start_at.is.null`)
    .order('event_start_at', { ascending: true, nullsFirst: false });

  if (q) {
    externalQuery = externalQuery.or(
      `name.ilike.%${q}%,description.ilike.%${q}%,venue_name.ilike.%${q}%,city.ilike.%${q}%,genre.ilike.%${q}%,classification.ilike.%${q}%`
    );
  }

  if (city) externalQuery = externalQuery.ilike('city', `%${city}%`);
  if (state) externalQuery = externalQuery.ilike('state', `%${state}%`);
  if (endDate) externalQuery = externalQuery.lte('event_start_at', endDate.toISOString());

  const shouldFetchHype = source === 'all' || source === 'hypeknight';
  const shouldFetchExternal =
    source === 'all' || source === 'external' || source === 'ticketmaster';

  const [hypeResult, externalResult] = await Promise.all([
    shouldFetchHype ? hypeQuery : Promise.resolve({ data: [], error: null }),
    shouldFetchExternal ? externalQuery : Promise.resolve({ data: [], error: null }),
  ]);

  if (hypeResult.error) throw new Error(hypeResult.error.message);
  if (externalResult.error) throw new Error(externalResult.error.message);

  let hypeEvents = hypeResult.data ?? [];
  let externalEvents = externalResult.data ?? [];

  if (source === 'ticketmaster') {
    externalEvents = externalEvents.filter(
      (event: any) => event.source_code === 'ticketmaster'
    );
  }

  const cards: DiscoveryEventCardItem[] = [
    ...hypeEvents.map((event: any) => ({
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
      genre: event.music?.[0] || event.event_type || null,
      classification: event.event_type || null,
    })),
    ...externalEvents.map((event: any) => ({
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
      genre: event.genre,
      classification: event.classification || event.segment,
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
          Search HypeKnight events and supplemental events discovered from trusted external sources.
        </p>

        <form action="/events" className="mt-8 grid gap-4 lg:grid-cols-6">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search event, vibe, venue..."
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50 lg:col-span-2"
          />

          <input
            name="city"
            defaultValue={city}
            placeholder="City"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />

          <input
            name="state"
            defaultValue={state}
            placeholder="State"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />

          <select
            name="source"
            defaultValue={source}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
          >
            <option value="all">All Sources</option>
            <option value="hypeknight">HypeKnight</option>
            <option value="external">External</option>
            <option value="ticketmaster">Ticketmaster</option>
          </select>

          <select
            name="date"
            defaultValue={date}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
          >
            <option value="all">Any Date</option>
            <option value="today">Today</option>
            <option value="week">Next 7 Days</option>
            <option value="month">Next 30 Days</option>
          </select>

          <button
            type="submit"
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 lg:col-span-6"
          >
            Search Events
          </button>
        </form>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="HypeKnight Events" value={String(hypeCount)} />
          <Stat label="External Events" value={String(externalCount)} />
          <Stat label="Total Results" value={String(cards.length)} />
        </div>
      </div>

      {cards.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((event, index) => (
            <DiscoveryEventCard
              key={`${event.source_label}-${event.id}`}
              event={event}
              featured={index < 3}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          No events match your filters right now.
        </div>
      )}
    </section>
  );
}

function getEndDate(date: string) {
  const now = new Date();

  if (date === 'today') {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  if (date === 'week') {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return end;
  }

  if (date === 'month') {
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    return end;
  }

  return null;
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