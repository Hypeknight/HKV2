import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';
import type { Event, Venue } from '@/lib/types';

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow transition hover:-translate-y-1 hover:border-accent/40"
    >
      <div className="mb-4 aspect-[16/9] rounded-2xl bg-gradient-to-br from-accent/20 via-white/5 to-white/0" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-accent">{venue.name}</h3>
          <p className="mt-1 text-sm text-white/60">
            {venue.city}, {venue.state}
          </p>
        </div>
        {venue.is_featured ? (
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
            Featured
          </span>
        ) : null}
      </div>
      <p className="mt-4 line-clamp-3 text-sm text-white/70">{venue.description || 'No description yet.'}</p>
    </Link>
  );
}

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-accent/40"
    >
      <div className="mb-4 aspect-[16/9] rounded-2xl bg-gradient-to-br from-fuchsia-500/15 via-white/5 to-accent/10" />
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">{formatDateTime(event.start_at)}</p>
        <h3 className="text-lg font-semibold text-white group-hover:text-accent">{event.name}</h3>
        <p className="text-sm text-white/60">
          {event.venue?.name || 'Independent listing'} • {event.city}, {event.state}
        </p>
        <p className="line-clamp-3 text-sm text-white/70">{event.excerpt || event.description || 'No description yet.'}</p>
      </div>
    </Link>
  );
}
