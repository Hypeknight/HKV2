import Link from 'next/link';
import EventStatusBadge from './EventStatusBadge';
import EventTime from './EventTime';

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
      className={`group relative block shrink-0 overflow-hidden rounded-[1.7rem] border border-white/[0.08] bg-[#0d1016] transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_20px_70px_rgba(0,0,0,.35)] sm:shrink ${
        compact ? 'w-[80vw] sm:w-auto' : ''
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/30 sm:aspect-[16/11]">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.name || 'Event image'}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#242933,transparent_52%),#0b0e13] text-sm text-white/30">
            Event artwork coming soon
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-transparent to-black/10" />

        <div className="absolute left-3 top-3">
          <EventStatusBadge startAt={event.event_start_at} endAt={event.event_end_at} />
        </div>

        <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/65 backdrop-blur-md">
          {event.source_label || 'HypeKnight'}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            {[event.city, event.state].filter(Boolean).join(', ') || 'Location TBA'}
          </p>
          <h3 className="mt-2 line-clamp-2 text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
            {event.name || 'Untitled Event'}
          </h3>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {event.event_start_at ? <EventTime value={event.event_start_at} /> : <p className="text-sm text-white/45">Time pending</p>}
            {event.venue_name ? <p className="mt-2 truncate text-xs text-white/40">◎ {event.venue_name}</p> : null}
          </div>
          <span className="shrink-0 text-sm font-black text-accent transition group-hover:translate-x-0.5">Open →</span>
        </div>

        {(event.genre || event.classification) ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
            {event.genre ? <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-white/45">{event.genre}</span> : null}
            {event.classification ? <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-white/45">{event.classification}</span> : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
