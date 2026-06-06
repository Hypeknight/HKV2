import Link from 'next/link';

export type DiscoveryEventCardItem = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  event_start_at?: string | null;
  image_url?: string | null;
  href: string;
  status?: string | null;
  source_label: string;
  is_external: boolean;
  venue_name?: string | null;
  genre?: string | null;
  classification?: string | null;
};

export default function DiscoveryEventCard({
  event,
  featured = false,
}: {
  event: DiscoveryEventCardItem;
  featured?: boolean;
}) {
  const eventDate = event.event_start_at
    ? new Date(event.event_start_at)
    : null;

  const dateLabel = eventDate
    ? eventDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'Date TBA';

  const timeLabel = eventDate
    ? eventDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Time TBA';

  return (
    <Link
      href={event.href}
      className={`group block overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-accent/40 hover:bg-white/[0.08] ${
        featured ? 'shadow-[0_0_40px_rgba(255,255,255,0.06)]' : ''
      }`}
    >
      <div className="relative aspect-[16/10] bg-black/30">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/40">
            Event image coming soon
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] backdrop-blur ${
              event.is_external
                ? 'border-yellow-500/30 bg-yellow-500/20 text-yellow-100'
                : 'border-accent/30 bg-accent/20 text-accent'
            }`}
          >
            {event.source_label}
          </span>

          {event.status ? (
            <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/80 backdrop-blur">
              {event.status}
            </span>
          ) : null}
        </div>

        <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur">
          <p className="text-sm font-bold text-white">{dateLabel}</p>
          <p className="text-xs text-white/65">{timeLabel}</p>
        </div>
      </div>

      <div className="p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {event.venue_name || 'Event'}
        </p>

        <h2 className="mt-3 line-clamp-2 text-2xl font-bold text-white group-hover:text-accent">
          {event.name}
        </h2>

        <p className="mt-3 text-white/65">
          {event.city || 'City TBA'}, {event.state || 'State TBA'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {event.genre ? <Tag label={event.genre} /> : null}
          {event.classification ? <Tag label={event.classification} /> : null}
          {event.is_external ? <Tag label="Supplemental" /> : <Tag label="HypeKnight" />}
        </div>

        {event.description ? (
          <p className="mt-4 line-clamp-3 text-sm text-white/70">
            {event.description}
          </p>
        ) : (
          <p className="mt-4 text-sm text-white/45">
            Event details coming soon.
          </p>
        )}

        {event.is_external ? (
          <p className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-100">
            External event. Basic info only.
          </p>
        ) : null}

        <div className="mt-6 text-sm font-semibold text-accent">
          Open event →
        </div>
      </div>
    </Link>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
      {label}
    </span>
  );
}