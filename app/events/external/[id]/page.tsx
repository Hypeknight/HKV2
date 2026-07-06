import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TrackView from '@/components/analytics/TrackView';
import {
  ButtonLink,
  Chip,
  EventStatusBadge,
  EventTime,
  InfoCard,
  Panel,
} from '@/components/ui';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExternalEventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from('external_events')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .single();

  if (error || !event) notFound();

  const imageUrl = event.image_url;
  const eventTimeZone = getTimeZoneForEvent(event);

  const sourceLabel =
    event.source_code === 'ticketmaster'
      ? 'Ticketmaster'
      : event.source_code || 'External Event';

  const officialUrl =
    event.url ||
    event.ticket_url ||
    event.provider_url ||
    event.source_url ||
    null;

  const fullAddress = [
    event.address,
    event.city,
    event.state,
    event.postal_code || event.zip_code,
  ]
    .filter(Boolean)
    .join(', ');

  const locationText =
    fullAddress ||
    [event.city, event.state].filter(Boolean).join(', ') ||
    event.venue_name ||
    'Location TBA';

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

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-5 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
        <Link href="/events" className="text-sm text-white/60 hover:text-accent">
          ← Back to Events
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 sm:rounded-[2.75rem]">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative bg-black/30">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={event.name || 'Event image'}
                  className="h-[320px] w-full object-cover sm:h-[460px] lg:h-full"
                />
              ) : (
                <div className="flex h-[320px] items-center justify-center text-white/40 sm:h-[460px]">
                  No image
                </div>
              )}

              <div className="absolute left-4 top-4">
                <EventStatusBadge
                  startAt={event.event_start_at}
                  endAt={event.event_end_at}
                />
              </div>
            </div>

            <div className="p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap gap-2">
                <Chip>{sourceLabel}</Chip>
                {event.classification ? <Chip>{event.classification}</Chip> : null}
                {event.genre ? <Chip>{event.genre}</Chip> : null}
                {event.segment ? <Chip>{event.segment}</Chip> : null}
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight text-white sm:text-5xl">
                {event.name}
              </h1>

              <p className="mt-4 max-w-3xl text-base text-white/75 sm:text-lg">
                {locationText}
              </p>

              <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/10 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-accent">
                  Starts
                </p>
                <div className="mt-2">
                  <EventTime
                    value={event.event_start_at}
                    
                    mode="utc"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {officialUrl ? (
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black transition hover:opacity-90 sm:w-auto"
                  >
                    View / Buy from Official Provider
                  </a>
                ) : null}

                <ButtonLink href="/events" variant="secondary">
                  Browse More Events
                </ButtonLink>
              </div>

              <p className="mt-5 text-xs leading-6 text-white/45">
                This is a supplemental external listing. HypeKnight is helping
                surface the event, but details may change. Confirm times,
                ticketing, age requirements, pricing, and venue rules with the
                official event provider before attending.
              </p>
            </div>
          </div>
        </section>

        {imageUrl ? (
          <Panel title="Event Image" eyebrow="External Visual">
            <img
              src={imageUrl}
              alt={`${event.name} event image`}
              className="w-full rounded-[1.5rem] border border-white/10 object-contain"
            />
          </Panel>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Starts"
            icon="🕒"
            accent
            value={
              <EventTime
                value={event.event_start_at}
                
                mode="utc"
              />
            }
          />

          <InfoCard
            label="Venue"
            icon="📍"
            value={event.venue_name || 'Venue TBA'}
          />

          <InfoCard
            label="Address"
            icon="🏙️"
            value={fullAddress || locationText}
          />

          <InfoCard
            label="Official Provider"
            icon="🔗"
            value={
              officialUrl ? (
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-accent hover:underline"
                >
                  Open event provider
                </a>
              ) : (
                'Official link not available'
              )
            }
          />

          <InfoCard
            label="Category"
            icon="🏷️"
            value={event.classification || event.segment || 'Not listed'}
          />

          <InfoCard
            label="Genre"
            icon="🎵"
            value={event.genre || 'Not listed'}
          />

          <InfoCard
            label="Source"
            icon="⚡"
            value={sourceLabel}
          />
        </section>

        {event.description ? (
          <Panel title="About this event" eyebrow="Details">
            <p className="whitespace-pre-wrap text-base leading-8 text-white/75">
              {event.description}
            </p>
          </Panel>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Panel title="Official source" eyebrow="External Listing">
            <div className="space-y-5">
              <p className="text-white/70">
                This event came from an external source. HypeKnight displays it
                to help users discover more experiences, but the official source
                should be used for final event information and purchasing.
              </p>

              {officialUrl ? (
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black transition hover:opacity-90 sm:w-auto"
                >
                  View / Buy from Official Provider
                </a>
              ) : (
                <p className="text-sm text-white/50">
                  No official provider link is currently available.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Keep exploring" eyebrow="HypeKnight">
            <div className="space-y-5">
              <p className="text-white/70">
                Want something different? Browse HypeKnight to compare live
                events, starting-soon plans, weekend moves, and city vibes.
              </p>

              <div className="flex flex-col gap-3">
                <ButtonLink href="/events" variant="primary">
                  Explore Events
                </ButtonLink>

                <ButtonLink href="/calendar" variant="secondary">
                  Browse Calendar Themes
                </ButtonLink>
              </div>
            </div>
          </Panel>
        </section>
      </section>
    </>
  );
}

function getTimeZoneForEvent(event: { city?: string | null; state?: string | null }) {
  const city = String(event.city || '').toLowerCase();
  const state = String(event.state || '').toUpperCase();

  if (state === 'MO' || state === 'KS' || state === 'IL' || state === 'TX') {
    return 'America/Chicago';
  }

  if (state === 'NY' || state === 'GA' || state === 'FL') {
    return 'America/New_York';
  }

  if (state === 'NV' || state === 'CA') {
    return 'America/Los_Angeles';
  }

  if (city.includes('denver')) return 'America/Denver';

  return 'America/Chicago';
}