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

  const imageUrl = event.image_url || null;

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
        <Link
          href="/events"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Events
        </Link>

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 sm:rounded-[3rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.09),transparent_30%)]" />

          <div className="relative grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[320px] bg-black/30 sm:min-h-[460px]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={event.name || 'Event image'}
                  className="h-full min-h-[320px] w-full object-cover sm:min-h-[460px]"
                />
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center text-white/40 sm:min-h-[460px]">
                  No image available
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 lg:hidden" />

              <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                <EventStatusBadge
                  startAt={event.event_start_at}
                  endAt={null}
                />
              </div>
            </div>

            <div className="relative p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap gap-2">
                <Chip>External Listing</Chip>
                <Chip>{sourceLabel}</Chip>
                {event.classification ? (
                  <Chip>{event.classification}</Chip>
                ) : null}
                {event.genre ? <Chip>{event.genre}</Chip> : null}
                {event.segment ? <Chip>{event.segment}</Chip> : null}
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[0.95] text-white sm:text-6xl">
                {event.name}
              </h1>

              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-white/80 sm:text-xl">
                {locationText}
              </p>

              <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/10 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-accent">
                  Starts
                </p>

                <div className="mt-2 font-semibold text-white">
                  <EventTime
                    value={event.event_start_at}
                    mode="wall"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {officialUrl ? (
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-4 text-center font-semibold text-black transition hover:opacity-90 sm:w-auto"
                  >
                    View Official Event
                  </a>
                ) : null}

                <ButtonLink href="/events" variant="secondary">
                  Browse More Events
                </ButtonLink>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white/55">
                This is supplemental event information from an external
                provider. Confirm final times, ticket availability, prices,
                age requirements, and venue policies with the official source.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Starts"
            icon="🕒"
            accent
            value={
              <EventTime
                value={event.event_start_at}
                mode="wall"
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
                  Open official source
                </a>
              ) : (
                'Official link not available'
              )
            }
          />

          <InfoCard
            label="Category"
            icon="🏷️"
            value={
              event.classification ||
              event.segment ||
              'Not listed'
            }
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
          <Panel title="About this event" eyebrow="External Details">
            <p className="whitespace-pre-wrap text-base leading-8 text-white/75 sm:text-lg">
              {event.description}
            </p>
          </Panel>
        ) : null}

        {imageUrl ? (
          <Panel title="Event image" eyebrow="External Visual">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30">
              <img
                src={imageUrl}
                alt={`${event.name} event image`}
                className="max-h-[1000px] w-full object-contain"
              />
            </div>
          </Panel>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Panel title="Official source" eyebrow="External Listing">
            <div className="space-y-5">
              <p className="leading-7 text-white/70">
                HypeKnight surfaces this event to expand discovery, but the
                external provider remains the official source for purchasing
                and final event information.
              </p>

              {officialUrl ? (
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-4 text-center font-semibold text-black transition hover:opacity-90 sm:w-auto"
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
              <p className="leading-7 text-white/70">
                Compare local events, live experiences, weekend plans, and
                HypeKnight-posted listings before making your move.
              </p>

              <div className="flex flex-col gap-3">
                <ButtonLink href="/events" variant="primary">
                  Explore Events
                </ButtonLink>

                <ButtonLink href="/calendar" variant="secondary">
                  Browse Calendar Themes
                </ButtonLink>

                <ButtonLink href="/promote" variant="secondary">
                  Promote an Event
                </ButtonLink>
              </div>
            </div>
          </Panel>
        </section>
      </section>
    </>
  );
}