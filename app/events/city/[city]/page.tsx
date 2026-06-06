import Link from 'next/link';
import { notFound } from 'next/navigation';
import DiscoveryEventCard, {
  DiscoveryEventCardItem,
} from '@/components/events/DiscoveryEventCard';
import { createClient } from '@/lib/supabase/server';
import { logDiscoverySearch } from '@/lib/discovery/log-search';


type PageProps = {
  params: Promise<{
    city: string;
  }>;
};

export default async function CityEventsPage({ params }: PageProps) {
  const { city } = await params;
  const supabase = await createClient();

  const cityName = decodeURIComponent(city)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const nowIso = new Date().toISOString();

  const { data: hypeEvents, error: hypeError } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('status', 'active')
    .eq('is_public', true)
    .is('removed_at', null)
    .ilike('city', `%${cityName}%`)
    .gte('event_start_at', nowIso)
    .order('event_start_at', { ascending: true });

  if (hypeError) throw new Error(hypeError.message);

  const { data: externalEvents, error: externalError } = await supabase
    .from('external_events')
    .select('*')
    .eq('status', 'active')
    .ilike('city', `%${cityName}%`)
    .or(`event_start_at.gte.${nowIso},event_start_at.is.null`)
    .order('event_start_at', { ascending: true, nullsFirst: false });

  if (externalError) throw new Error(externalError.message);

  const cards: DiscoveryEventCardItem[] = [
    ...(hypeEvents ?? []).map((event: any) => ({
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
    ...(externalEvents ?? []).map((event: any) => ({
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

  if (!cards.length && cityName.length < 2) notFound();

  const hypeCount = cards.filter((event) => !event.is_external).length;
  const externalCount = cards.filter((event) => event.is_external).length;
  const nextEvent = cards[0];

await logDiscoverySearch({
  city: cityName,
  state: cards[0]?.state || undefined,
  resultCount: cards.length,
  hypeknightResultCount: hypeCount,
  externalResultCount: externalCount,
  pagePath: `/events/city/${city}`,
});

  return (
    <section className="space-y-10">
      <div className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.07),transparent_28%)]" />

        <div className="relative">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            City Discovery
          </p>

          <h1 className="mt-3 text-5xl font-black text-white">
            Events in {cityName}
          </h1>

          <p className="mt-4 max-w-3xl text-white/70">
            Discover HypeKnight events and supplemental external events happening around {cityName}.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="HypeKnight Events" value={String(hypeCount)} />
            <Stat label="External Events" value={String(externalCount)} />
            <Stat label="Total Events" value={String(cards.length)} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/events"
              className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              All Events
            </Link>

            <Link
              href={`/events?city=${encodeURIComponent(cityName)}`}
              className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
            >
              Search This City
            </Link>
          </div>
        </div>
      </div>

      {nextEvent ? (
        <section className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Next Up
          </p>

          <h2 className="mt-3 text-3xl font-bold text-white">
            {nextEvent.name}
          </h2>

          <p className="mt-3 text-white/70">
            {nextEvent.venue_name || 'Venue TBA'} •{' '}
            {nextEvent.event_start_at
              ? new Date(nextEvent.event_start_at).toLocaleString()
              : 'Date pending'}
          </p>

          <div className="mt-6">
            <Link
              href={nextEvent.href}
              className="inline-flex rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
            >
              Open Next Event
            </Link>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Event Feed
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Browse {cityName}
          </h2>
          <p className="mt-3 text-white/70">
            HypeKnight events appear beside trusted external events so the city page never feels empty.
          </p>
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
            No events are available for {cityName} right now.
          </div>
        )}
      </section>
    </section>
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