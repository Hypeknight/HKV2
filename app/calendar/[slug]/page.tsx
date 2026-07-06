import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeState } from '@/lib/states';
import {
  EmptyState,
  EventCard,
  MetricCard,
  SectionHeader,
} from '@/components/ui';

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
      source: 'hypeknight',
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
      source: 'external',
      source_label:
        event.source_code === 'ticketmaster'
          ? 'Ticketmaster'
          : event.source_code || 'External Event',
      venue_name: event.venue_name,
      genre: event.genre,
      classification: event.classification || event.segment,
    })),
  ].sort(sortByStartTime);

  const hypeCount = cards.filter(
    (event) => event.source_label === 'HypeKnight Event'
  ).length;

  const externalCount = cards.length - hypeCount;

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/calendar" className="text-sm text-white/60 hover:text-accent">
        ← Back to Calendar
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            {specialDay.category || 'Calendar Theme'}
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            {specialDay.name}
          </h1>

          <p className="mt-4 text-sm text-white/55 sm:text-base">
            {formatDate(specialDay.starts_on)}
            {specialDay.ends_on ? ` – ${formatDate(specialDay.ends_on)}` : ''}
          </p>

          {specialDay.description ? (
            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              {specialDay.description}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-3 gap-3">
            <MetricCard label="Events" value={cards.length} accent />
            <MetricCard label="HypeKnight" value={hypeCount} />
            <MetricCard label="External" value={externalCount} />
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Themed Events"
          title={`Events connected to ${specialDay.name}`}
          text="These events were selected by HypeKnight admin for this calendar theme."
        />

        {cards.length ? (
          <div className="mt-5 grid gap-4 sm:mt-8 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((event) => (
              <EventCard key={`${event.source_label}-${event.id}`} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState text="No events have been added to this theme yet." />
          </div>
        )}
      </section>
    </section>
  );
}

function parseWallTime(value?: string | null) {
  if (!value) return null;

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (!match) return new Date(value);

  const [, year, month, day, hour, minute, second = '0'] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function sortByStartTime(a: any, b: any) {
  const aTime = parseWallTime(a.event_start_at)?.getTime() ?? Infinity;
  const bTime = parseWallTime(b.event_start_at)?.getTime() ?? Infinity;

  return aTime - bTime;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}