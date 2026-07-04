import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TrackView from '@/components/analytics/TrackView';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExternalEventPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from('external_events')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !event) {
    notFound();
  }

  const startDate = event.event_start_at
    ? new Date(event.event_start_at).toLocaleString()
    : 'Date pending';

  return (
  <>
    <TrackView
      externalEventId={event.id}
      sourceType="external"
      pageType="external_event_detail"
      city={event.city}
      state={event.state}
      path={`/events/external/${event.id}`}
    />

    <section className="mx-auto max-w-7xl ...">
      {/* Hero */}

      <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5">
        {event.image_url ? (
          <div className="aspect-[16/6] overflow-hidden">
            <img
              src={event.image_url}
              alt={event.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[16/6] items-center justify-center bg-black/20 text-white/40">
            No event image available
          </div>
        )}

        <div className="p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-yellow-200">
              External Event
            </span>

            <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70">
              {event.source_code}
            </span>
          </div>

          <h1 className="mt-5 text-5xl font-black text-white">
            {event.name}
          </h1>

          <p className="mt-5 max-w-4xl text-lg text-white/70">
            This event was discovered through a trusted external source and is
            being shown to help users find more events in their area.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {event.source_url ? (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
              >
                View Original Event
              </a>
            ) : null}

            <Link
              href="/events"
              className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-white hover:border-accent/40"
            >
              Back to Events
            </Link>
          </div>
        </div>
      </section>

      {/* Information */}

      <section className="grid gap-5 lg:grid-cols-4">
        <InfoCard
          label="Date"
          value={startDate}
        />

        <InfoCard
          label="Venue"
          value={event.venue_name || 'Venue pending'}
        />

        <InfoCard
          label="Location"
          value={`${event.city || 'Unknown'}, ${event.state || ''}`}
        />

        <InfoCard
          label="Source"
          value={event.source_code}
        />
      </section>

      {/* Description */}

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">
          Event Details
        </h2>

        {event.description ? (
          <div className="mt-5 whitespace-pre-wrap text-white/75">
            {event.description}
          </div>
        ) : (
          <p className="mt-5 text-white/60">
            No additional details were provided by the source.
          </p>
        )}
      </section>

      {/* Categories */}

      {(event.genre ||
        event.segment ||
        event.classification) && (
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">
            Classification
          </h2>

          <div className="mt-5 flex flex-wrap gap-3">
            {event.segment ? (
              <Badge>{event.segment}</Badge>
            ) : null}

            {event.genre ? (
              <Badge>{event.genre}</Badge>
            ) : null}

            {event.classification ? (
              <Badge>{event.classification}</Badge>
            ) : null}
          </div>
        </section>
      )}

      {/* Source Disclaimer */}

      <section className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-8">
        <h2 className="text-xl font-bold text-yellow-100">
          External Event Notice
        </h2>

        <p className="mt-4 text-yellow-100/80">
          This event is not managed by HypeKnight. Information is provided by
          an external source and may change without notice. Please verify
          details with the original event organizer before attending.
        </p>
      </section>
    </section>
    </>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>

      <p className="mt-3 text-white">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white">
      {children}
    </span>
  );
}