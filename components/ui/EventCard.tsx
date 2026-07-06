import Link from 'next/link';
import EventStatusBadge from './EventStatusBadge';
import EventTime from './EventTime';
import Chip from './Chip';

export default function EventCard({
  event,
  compact = false,
}: {
  event: any;
  compact?: boolean;
}) {
  return (
    <Link
      href={event.href}
      className={`group block shrink-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 transition hover:border-accent/40 hover:bg-white/[0.07] sm:shrink sm:rounded-[2rem] ${
        compact ? 'w-[78vw] sm:w-auto' : ''
      }`}
    >
      <div className="relative">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.name || 'Event image'}
            className="h-40 w-full object-cover sm:h-52"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-black/30 text-white/40 sm:h-52">
            No image
          </div>
        )}

        <div className="absolute left-3 top-3">
          <EventStatusBadge
            startAt={event.event_start_at}
            endAt={event.event_end_at}
          />
        </div>
      </div>

      <div className="p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent sm:text-xs">
          {event.source_label || 'HypeKnight'}
        </p>

        <h3 className="mt-3 text-xl font-black leading-tight text-white group-hover:text-accent sm:text-2xl">
          {event.name || 'Untitled Event'}
        </h3>

        <p className="mt-3 text-sm text-white/60">
          {[event.city, event.state].filter(Boolean).join(', ') ||
            event.venue_name ||
            'Location TBA'}
        </p>

        {event.event_start_at ? (
          <div className="mt-3">
            <EventTime value={event.event_start_at} />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {event.genre ? <Chip>{event.genre}</Chip> : null}
          {event.classification ? <Chip>{event.classification}</Chip> : null}
          {event.venue_name ? <Chip>{event.venue_name}</Chip> : null}
        </div>

        {event.description ? (
          <p className="mt-4 line-clamp-2 text-sm text-white/65">
            {event.description}
          </p>
        ) : null}

        <p className="mt-5 text-sm font-semibold text-accent">Open event →</p>
      </div>
    </Link>
  );
}