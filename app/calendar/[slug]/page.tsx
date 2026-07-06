import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeState } from '@/lib/states';
import LocalDateTime from '@/components/LocalDateTime';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicCalendarThemePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: specialDay, error } = await supabase
    .from('special_days')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !specialDay) notFound();

  const { data: assignments, error: assignmentError } = await supabase
    .from('special_day_events')
    .select('*')
    .eq('special_day_id', specialDay.id);

  if (assignmentError) throw new Error(assignmentError.message);

  const internalIds =
    assignments
      ?.filter((row) => row.source_type === 'hypeknight' && row.event_id)
      .map((row) => row.event_id) ?? [];

  const externalIds =
    assignments
      ?.filter((row) => row.source_type === 'external' && row.external_event_id)
      .map((row) => row.external_event_id) ?? [];

  const [{ data: internalEvents }, { data: externalEvents }] =
    await Promise.all([
      internalIds.length
        ? supabase
            .from('events')
            .select('*')
            .in('id', internalIds)
            .in('status', ['scheduled', 'active'])
            .eq('is_public', true)
            .is('removed_at', null)
        : Promise.resolve({ data: [] as any[] }),

      externalIds.length
        ? supabase
            .from('external_events')
            .select('*')
            .in('id', externalIds)
            .eq('status', 'active')
        : Promise.resolve({ data: [] as any[] }),
    ]);

  const cards = [
    ...(internalEvents ?? []).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: normalizeState(String(event.state || '')),
      description: event.description,
      event_start_at: event.event_start_at,
      event_end_at: event.event_end_at,
      image_url: event.flyer_url || event.image_url,
      href: `/events/${event.slug}`,
      source_label: 'HypeKnight Event',
      venue_name: event.venue_name,
      genre: Array.isArray(event.music_selection)
        ? event.music_selection?.[0]
        : event.event_type,
      classification: event.event_type,
    })),

    ...(externalEvents ?? []).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: normalizeState(String(event.state || '')),
      description: event.description,
      event_start_at: event.event_start_at,
      event_end_at: event.event_end_at,
      image_url: event.image_url,
      href: `/events/external/${event.id}`,
      source_label:
        event.source_code === 'ticketmaster'
          ? 'Ticketmaster'
          : event.source_code || 'External Event',
      venue_name: event.venue_name,
      genre: event.genre,
      classification: event.classification || event.segment,
    })),
  ].sort(sortByStartTime);

  return (
    <section className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/calendar" className="text-sm text-white/60 hover:text-accent">
        ← Back to Calendar
      </Link>

      <section className="rounded-[3rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          {specialDay.category || 'Calendar Theme'}
        </p>

        <h1 className="mt-3 max-w-4xl text-5xl font-black text-white">
          {specialDay.name}
        </h1>

        <p className="mt-4 text-white/55">
          {formatDate(specialDay.starts_on)}
          {specialDay.ends_on ? ` – ${formatDate(specialDay.ends_on)}` : ''}
        </p>

        {specialDay.description ? (
          <p className="mt-5 max-w-3xl text-white/70">
            {specialDay.description}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="Assigned Events" value={String(cards.length)} />
          <Metric
            label="HypeKnight"
            value={String(cards.filter((event) => event.source_label === 'HypeKnight Event').length)}
          />
          <Metric
            label="External"
            value={String(cards.filter((event) => event.source_label !== 'HypeKnight Event').length)}
          />
        </div>
      </section>

      <section>
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Themed Events
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Events connected to {specialDay.name}
          </h2>
          <p className="mt-3 text-white/70">
            These events were selected by HypeKnight admin for this calendar
            theme.
          </p>
        </div>

        {cards.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((event) => (
              <EventCard key={`${event.source_label}-${event.id}`} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/60">
            No events have been added to this theme yet.
          </div>
        )}
      </section>
    </section>
  );
}

function sortByStartTime(a: any, b: any) {
  const aTime = a.event_start_at
    ? new Date(a.event_start_at).getTime()
    : Infinity;

  const bTime = b.event_start_at
    ? new Date(b.event_start_at).getTime()
    : Infinity;

  return aTime - bTime;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  return (
    <Link
      href={event.href}
      className="group block overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 transition hover:border-accent/40 hover:bg-white/[0.07]"
    >
      {event.image_url ? (
        <img
          src={event.image_url}
          alt={event.name}
          className="h-52 w-full object-cover"
        />
      ) : (
        <div className="flex h-52 w-full items-center justify-center bg-black/30 text-white/40">
          No image
        </div>
      )}

      <div className="p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {event.source_label}
        </p>

        <h3 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
          {event.name}
        </h3>

        <p className="mt-3 text-white/60">
          {[event.city, event.state].filter(Boolean).join(', ') ||
            event.venue_name ||
            'Location TBA'}
        </p>

        {event.event_start_at ? (
          <p className="mt-2 text-sm text-white/50">
            <LocalDateTime value={event.event_start_at} />
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {event.genre ? <Pill label={event.genre} /> : null}
          {event.classification ? <Pill label={event.classification} /> : null}
          {event.venue_name ? <Pill label={event.venue_name} /> : null}
        </div>

        {event.description ? (
          <p className="mt-4 line-clamp-3 text-sm text-white/65">
            {event.description}
          </p>
        ) : null}

        <p className="mt-6 text-sm font-medium text-accent">Open event →</p>
      </div>
    </Link>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">
      {label}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return 