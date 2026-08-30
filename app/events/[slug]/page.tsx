import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLookupMap, type LookupValue } from '@/lib/config/lookups';
import TrackView from '@/components/analytics/TrackView';
import SignalAnchor from '@/components/analytics/SignalAnchor';
import ShareEventButton from '@/components/events/ShareEventButton';
import PatronPulseGuestPanel from '@/components/patron-pulse/PatronPulseGuestPanel';
import { getEventShareMetadata } from '@/lib/metadata/event-metadata';
import { loadPublicPatronPulse } from '@/lib/patron-pulse/service';
import {
  recordRecentEventView,
  reportEvent,
  toggleEventSave,
  updateEventRsvp,
} from '@/app/events/actions';
import {
  ButtonLink,
  Chip,
  EventStatusBadge,
  EventTime,
  InfoCard,
  Panel,
} from '@/components/ui';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  return getEventShareMetadata(slug);
}

type LookupMap = Record<string, LookupValue[]>;

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    lookups,
  ] = await Promise.all([
    supabase.auth.getUser(),

    getLookupMap([
      'event_types',
      'music_genres',
      'vibe_tags',
      'event_amenities',
      'dress_codes',
      'age_requirements',
      'smoking_policies',
      'parking_options',
    ]),
  ]);

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues(
        name,
        slug,
        city,
        state
      )
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .in('status', ['scheduled', 'active', 'live'])
    .is('removed_at', null)
    .single();

  if (error || !event) notFound();

  await recordRecentEventView(event.id);

  const [
    { count: saveCount, error: saveCountError },
    { count: goingCount, error: goingCountError },
    { count: interestedCount, error: interestedCountError },
    { data: viewerSave, error: viewerSaveError },
    { data: viewerRsvp, error: viewerRsvpError },
  ] = await Promise.all([
    supabase
      .from('event_saves')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id),

    supabase
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'going'),

    supabase
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'interested'),

    user
      ? supabase
          .from('event_saves')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    user
      ? supabase
          .from('event_rsvps')
          .select('status')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),
  ]);

  const engagementErrors = [
    saveCountError,
    goingCountError,
    interestedCountError,
    viewerSaveError,
    viewerRsvpError,
  ].filter(Boolean);

  if (engagementErrors.length) {
    throw new Error(
      engagementErrors
        .map((item) => item?.message)
        .filter(Boolean)
        .join(' | ')
    );
  }

  const isSaved = Boolean(viewerSave);
  const viewerRsvpStatus =
    viewerRsvp?.status || null;

  const patronPulse = await loadPublicPatronPulse({
    supabase,
    eventId: event.id,
    userId: user?.id || null,
  });

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const isOwner = user?.id === event.owner_id;
  const isAdmin = profile?.app_role === 'admin';
  const canManage = isOwner || isAdmin;

  const imageUrl = event.flyer_url || null;

  const city = event.city || event.venue?.city;
  const state = event.state || event.venue?.state;

  const fullAddress = [
    event.address,
    city,
    state,
    event.zip_code,
  ]
    .filter(Boolean)
    .join(', ');

  const locationText =
    fullAddress ||
    [city, state].filter(Boolean).join(', ') ||
    event.venue_name ||
    event.venue?.name ||
    'Location TBA';

  const musicValues = arrayValue(event.music_selection);
  const vibeValues = arrayValue(event.vibe_tags);
  const amenityValues = arrayValue(event.amenities);
  const eventTypeValues = splitValue(event.event_type);

  const musicItems = resolveLookupItems(
    lookups.music_genres,
    musicValues
  );

  const vibeItems = resolveLookupItems(
    lookups.vibe_tags,
    vibeValues
  );

  const amenityItems = resolveLookupItems(
    lookups.event_amenities,
    amenityValues
  );

  const eventTypeItems = resolveLookupItems(
    lookups.event_types,
    eventTypeValues
  );

  const dressCode = resolveSingleLookup(
    lookups.dress_codes,
    event.dress_code
  );

  const ageRequirement = resolveSingleLookup(
    lookups.age_requirements,
    event.age_requirement
  );

  const smokingPolicy = resolveSingleLookup(
    lookups.smoking_policies,
    event.smoking_policy
  );

  const parkingOption = resolveSingleLookup(
    lookups.parking_options,
    event.parking_notes
  );

  const directionsHref = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        fullAddress
      )}`
    : null;

  const calendarHref = buildGoogleCalendarHref({
    name: event.name || 'HypeKnight Event',
    description: event.description || '',
    location: fullAddress || locationText,
    startAt: event.event_start_at,
    endAt: event.event_end_at,
  });

  return (
    <>
      <TrackView
        eventId={event.id}
        sourceType="hypeknight"
        pageType="event_detail"
        city={city}
        state={state}
        path={`/events/${event.slug}`}
      />

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-5 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href="/events"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Events
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0f16] sm:rounded-[2.75rem]">
          <div className="grid lg:grid-cols-[minmax(0,0.92fr)_1.08fr]">
            <div className="relative min-h-[320px] bg-black sm:min-h-[430px] lg:min-h-[560px]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={event.name || 'Event flyer'}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 via-white/[0.04] to-black text-8xl text-white/15">✦</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10 lg:bg-gradient-to-r lg:from-transparent lg:to-[#0c0f16]/25" />
              <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                <EventStatusBadge startAt={event.event_start_at} endAt={event.event_end_at} />
              </div>
            </div>

            <div className="flex p-5 sm:p-8 lg:p-10">
              <div className="my-auto w-full">
                <p className="hk-kicker">Event detail</p>
                <div className="mt-4">
                  <HeroContent
                    event={event}
                    locationText={locationText}
                    eventTypes={eventTypeItems}
                    canManage={canManage}
                    isAdmin={isAdmin}
                  />
                </div>
                <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Saved</p><p className="mt-1 text-xl font-black text-white">{saveCount || 0}</p></div>
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Interested</p><p className="mt-1 text-xl font-black text-white">{interestedCount || 0}</p></div>
                  <div className="rounded-2xl border border-accent/15 bg-accent/[0.06] p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-accent/70">Going</p><p className="mt-1 text-xl font-black text-accent">{goingCount || 0}</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Panel
            title="Join the night"
            eyebrow="Event Engagement"
          >
            <p className="text-sm leading-6 text-white/55">Save it, tell HypeKnight you are interested, or commit to Going. These actions improve both your personal recommendations and the event's demand signal.</p>

            {user ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <form
                  action={toggleEventSave}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <input
                    type="hidden"
                    name="event_id"
                    value={event.id}
                  />

                  <input
                    type="hidden"
                    name="slug"
                    value={event.slug}
                  />

                  <h3 className="text-xl font-black text-white">
                    {isSaved ? 'Event Saved' : 'Save Event'}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/60">
                    {isSaved
                      ? 'Remove this event from your saved list.'
                      : 'Keep this event easy to find later.'}
                  </p>

                  <button className="mt-5 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90">
                    {isSaved ? 'Remove Save' : 'Save Event'}
                  </button>
                </form>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <h3 className="text-xl font-black text-white">
                    RSVP
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Tell HypeKnight whether you are interested or going.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <RsvpForm
                      eventId={event.id}
                      slug={event.slug}
                      status="interested"
                      label={
                        viewerRsvpStatus === 'interested'
                          ? 'Interested ✓'
                          : 'Interested'
                      }
                    />

                    <RsvpForm
                      eventId={event.id}
                      slug={event.slug}
                      status="going"
                      label={
                        viewerRsvpStatus === 'going'
                          ? 'Going ✓'
                          : "I'm Going"
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/10 p-5">
                <h3 className="text-xl font-black text-white">
                  Sign in to connect with this event.
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/65">
                  Save the event, RSVP, follow updates, and later
                  participate in Patron Pulse and Linkd&apos;N experiences.
                </p>

                <ButtonLink
                  href={`/auth/login?redirect=${encodeURIComponent(
                    `/events/${event.slug}`
                  )}`}
                  variant="primary"
                >
                  Sign In
                </ButtonLink>
              </div>
            )}
          </Panel>

          <Panel
            title="Plan your move"
            eyebrow="Quick Actions"
          >
            <div className="space-y-3">
              {directionsHref ? (
                <SignalAnchor
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  signal={{
                    signalType: 'directions_requested',
                    subjectType: 'event',
                    subjectId: event.id,
                    eventId: event.id,
                    venueId: event.venue_id || null,
                    city,
                    state,
                    source: 'event_page',
                    surface: 'event_detail',
                    verificationLevel: 'observed',
                  }}
                  className={actionClass}
                >
                  Open Directions
                </SignalAnchor>
              ) : null}

              {calendarHref ? (
                <a
                  href={calendarHref}
                  target="_blank"
                  rel="noreferrer"
                  className={actionClass}
                >
                  Add to Google Calendar
                </a>
              ) : null}

              <ShareEventButton
                eventId={event.id}
                eventName={
                  event.name || 'HypeKnight Event'
                }
                eventPath={`/events/${event.slug}`}
                locationText={locationText}
                startsAt={event.event_start_at}
              />

              <Link
                href={`/events/${event.slug}#report-event`}
                className={actionClass}
              >
                Report Event Information
              </Link>

              <Link
                href="/events"
                className={actionClass}
              >
                Browse More Events
              </Link>
            </div>
          </Panel>
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
            label="Ends"
            icon="⏳"
            value={
              event.event_end_at ? (
                <EventTime
                  value={event.event_end_at}
                  mode="wall"
                />
              ) : (
                'End time not listed'
              )
            }
          />

          <InfoCard
            label="Venue"
            icon="🏢"
            value={
              event.venue_name ||
              event.venue?.name ||
              'Venue TBA'
            }
          />

          <InfoCard
            label="Full Address"
            icon="📍"
            value={fullAddress || 'Address not listed'}
          />

          <InfoCard
            label="Entry"
            icon="💵"
            value={
              event.entry_price ||
              event.cover_charge ||
              'Check event details'
            }
          />

          <InfoCard
            label="Dress Code"
            icon={dressCode.icon || '👕'}
            value={dressCode.label || 'Not listed'}
          />

          <InfoCard
            label="Age"
            icon={ageRequirement.icon || '🔞'}
            value={ageRequirement.label || 'Not listed'}
          />

          <InfoCard
            label="Event Type"
            icon="🎉"
            value={
              eventTypeItems.length
                ? eventTypeItems
                    .map((item) => item.display_name)
                    .join(', ')
                : 'Not listed'
            }
          />
        </section>

        {musicItems.length ||
        vibeItems.length ||
        amenityItems.length ? (
          <Panel
            title="What kind of night is this?"
            eyebrow="Experience"
          >
            <div className="space-y-8">
              {musicItems.length ? (
                <TagSection
                  title="Music"
                  description="The sounds connected to this event."
                  items={musicItems}
                />
              ) : null}

              {vibeItems.length ? (
                <TagSection
                  title="Vibe"
                  description="The atmosphere and energy guests can expect."
                  items={vibeItems}
                />
              ) : null}

              {amenityItems.length ? (
                <TagSection
                  title="Amenities"
                  description="Features and accommodations available at the event."
                  items={amenityItems}
                />
              ) : null}
            </div>
          </Panel>
        ) : null}

        {event.description ? (
          <Panel title="The vibe" eyebrow="About This Event">
            <p className="whitespace-pre-wrap text-base leading-8 text-white/75 sm:text-lg">
              {event.description}
            </p>
          </Panel>
        ) : null}

        {imageUrl ? (
          <Panel title="Event flyer" eyebrow="Official Visual">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30">
              <img
                src={imageUrl}
                alt={`${event.name} flyer`}
                className="max-h-[1000px] w-full object-contain"
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-white/50">
              Review the official flyer for additional details,
              restrictions, times, or promotional information supplied by
              the event owner.
            </p>
          </Panel>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Panel title="Before you go" eyebrow="Know Before You Go">
            <div className="grid gap-4">
              <InfoCard
                label="Parking / Access"
                icon={parkingOption.icon || '🅿️'}
                value={
                  parkingOption.label ||
                  event.parking_notes ||
                  'Parking details not listed.'
                }
              />

              <InfoCard
                label="Smoking Policy"
                icon={smokingPolicy.icon || '💨'}
                value={
                  smokingPolicy.label ||
                  event.smoking_policy ||
                  'Not listed'
                }
              />

              <InfoCard
                label="Special Notes"
                icon="⭐"
                value={
                  event.special_notes ||
                  'No special notes listed.'
                }
              />
            </div>
          </Panel>

          <Panel title="Make your move" eyebrow="HypeKnight">
            <div className="space-y-5">
              <p className="leading-7 text-white/70">
                Save the details, tell your people, and double-check
                important information with the venue or organizer before
                heading out.
              </p>

              <div className="flex flex-col gap-3">
                <ButtonLink href="/events" variant="primary">
                  Find More Events
                </ButtonLink>

                <ButtonLink
                  href="/dashboard/events/new/step-1"
                  variant="secondary"
                >
                  Post Your Event
                </ButtonLink>

                <ButtonLink href="/promote" variant="secondary">
                  Learn About Promotion
                </ButtonLink>
              </div>
            </div>
          </Panel>
        </section>

        <PatronPulseGuestPanel
          eventId={event.id}
          eventSlug={event.slug}
          eventName={
            event.name || 'HypeKnight Event'
          }
          userId={user?.id || null}
          session={patronPulse.session}
          pulses={patronPulse.pulses}
          announcements={patronPulse.announcements}
          viewerCheckin={
            patronPulse.viewerCheckin
          }
          viewerResponses={
            patronPulse.viewerResponses
          }
        />

        <section>
          <Panel
            title="Linkd’N"
            eyebrow="Connected Nightlife"
          >
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm leading-7 text-white/65">
                Linkd&apos;N will connect participating venues and events
                through live rooms, cross-city experiences, challenges,
                voting, and venue-to-venue interaction.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Chip>Venue Connections</Chip>
                <Chip>Live Rooms</Chip>
                <Chip>Challenges</Chip>
                <Chip>Audience Voting</Chip>
              </div>
            </div>
          </Panel>
        </section>

        <Panel
          title="Report this event"
          eyebrow="Community Safety"
        >
          <form
            id="report-event"
            action={reportEvent}
            className="grid gap-4"
          >
            <input
              type="hidden"
              name="event_id"
              value={event.id}
            />

            <input
              type="hidden"
              name="slug"
              value={event.slug}
            />

            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Report Category
              </span>

              <select
                name="category"
                required
                className={fieldClass}
              >
                <option value="">
                  Choose a reason
                </option>
                <option value="incorrect_information">
                  Incorrect information
                </option>
                <option value="cancelled_event">
                  Event appears cancelled
                </option>
                <option value="unsafe_content">
                  Unsafe or inappropriate content
                </option>
                <option value="spam">
                  Spam or misleading listing
                </option>
                <option value="duplicate">
                  Duplicate event
                </option>
                <option value="other">
                  Other
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Details
              </span>

              <textarea
                name="details"
                rows={5}
                placeholder="Tell HypeKnight what appears incorrect or unsafe."
                className={fieldClass}
              />
            </label>

            {user ? (
              <button className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-semibold text-red-100 hover:border-red-500/50">
                Submit Report
              </button>
            ) : (
              <ButtonLink
                href={`/auth/login?redirect=${encodeURIComponent(
                  `/events/${event.slug}#report-event`
                )}`}
                variant="secondary"
              >
                Sign In to Report
              </ButtonLink>
            )}
          </form>
        </Panel>

        {canManage ? (
          <Panel
            title={
              isAdmin
                ? 'Admin Event Controls'
                : 'Owner Event Controls'
            }
            eyebrow="Management"
          >
            <p className="mb-6 max-w-3xl text-sm leading-6 text-white/60">
              These controls are only visible because you own this event
              or have HypeKnight administrator access.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {isOwner ? (
                <>
                  <ButtonLink
                    href={`/dashboard/events/${event.id}/review`}
                    variant="secondary"
                  >
                    Owner Mission Control
                  </ButtonLink>

                  <ButtonLink
                    href={`/dashboard/events/${event.id}/review`}
                    variant="secondary"
                  >
                    Review Event Status
                  </ButtonLink>
                </>
              ) : null}

              {isAdmin ? (
                <ButtonLink
                  href={`/admin/events/${event.id}`}
                  variant="primary"
                >
                  Admin Control Center
                </ButtonLink>
              ) : null}

              <ButtonLink href="/events" variant="secondary">
                Public Event List
              </ButtonLink>
            </div>
          </Panel>
        ) : null}
      </section>
    </>
  );
}

function HeroContent({
  event,
  locationText,
  eventTypes,
  canManage,
  isAdmin,
}: {
  event: any;
  locationText: string;
  eventTypes: LookupValue[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Chip>HypeKnight Event</Chip>

        {eventTypes.slice(0, 3).map((item) => (
          <Chip key={item.id}>
            {item.icon ? `${item.icon} ` : ''}
            {item.display_name}
          </Chip>
        ))}

        {canManage ? (
          <Chip>{isAdmin ? 'Admin View' : 'Owner View'}</Chip>
        ) : null}
      </div>

      <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
        {event.name}
      </h1>

      <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-white/80 sm:text-xl">
        {locationText}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
        <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4 backdrop-blur">
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

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">
            Venue
          </p>

          <p className="mt-2 font-semibold text-white">
            {event.venue_name ||
              event.venue?.name ||
              'Venue TBA'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/events" variant="primary">
          Browse More Events
        </ButtonLink>

        <ButtonLink href="/calendar" variant="secondary">
          Explore Calendar
        </ButtonLink>
      </div>
    </div>
  );
}

function TagSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: LookupValue[];
}) {
  return (
    <section>
      <h3 className="text-xl font-black text-white">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-white/55">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {items.map((item) => (
          <span
            key={item.id}
            className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white/75"
          >
            {item.icon ? `${item.icon} ` : ''}
            {item.display_name}
          </span>
        ))}
      </div>
    </section>
  );
}


function EngagementMetric({
  label,
  value,
  text,
}: {
  label: string;
  value: number;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-white/50">
        {text}
      </p>
    </div>
  );
}

function RsvpForm({
  eventId,
  slug,
  status,
  label,
}: {
  eventId: string;
  slug: string;
  status: 'interested' | 'going';
  label: string;
}) {
  return (
    <form action={updateEventRsvp}>
      <input
        type="hidden"
        name="event_id"
        value={eventId}
      />

      <input
        type="hidden"
        name="slug"
        value={slug}
      />

      <input
        type="hidden"
        name="status"
        value={status}
      />

      <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white hover:border-accent/40">
        {label}
      </button>
    </form>
  );
}

function buildGoogleCalendarHref({
  name,
  description,
  location,
  startAt,
  endAt,
}: {
  name: string;
  description: string;
  location: string;
  startAt?: string | null;
  endAt?: string | null;
}) {
  const start = parseCalendarDate(startAt);

  if (!start) {
    return null;
  }

  const end =
    parseCalendarDate(endAt) ||
    new Date(start.getTime() + 4 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: name,
    details: description,
    location,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(
      end
    )}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function parseCalendarDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatCalendarDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

const actionClass =
  'block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center font-semibold text-white hover:border-accent/40';

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';

function resolveLookupItems(
  options: LookupValue[] = [],
  selectedValues: string[] = []
): LookupValue[] {
  const selected = new Set(
    selectedValues.map((value) => normalizeLookupValue(value))
  );

  const resolved = options.filter((option) =>
    selected.has(normalizeLookupValue(option.value))
  );

  const resolvedValues = new Set(
    resolved.map((item) => normalizeLookupValue(item.value))
  );

  const missingValues = selectedValues.filter(
    (value) => !resolvedValues.has(normalizeLookupValue(value))
  );

  return [
  ...resolved,

  ...missingValues.map(
    (value, index): LookupValue => ({
      id: `legacy-${normalizeLookupValue(value)}-${index}`,
      category_key: 'legacy',
      value,
      display_name: value,
      description: null,
      icon: null,
      color: null,
      sort_order: 999,
      is_active: true,
      archived_at: null,
    })
  ),
];
}

function resolveSingleLookup(
  options: LookupValue[] = [],
  selectedValue?: string | null
) {
  if (!selectedValue) {
    return {
      label: null,
      icon: null,
    };
  }

  const match = options.find(
    (option) =>
      normalizeLookupValue(option.value) ===
      normalizeLookupValue(selectedValue)
  );

  return {
    label: match?.display_name || selectedValue,
    icon: match?.icon || null,
  };
}

function arrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitValue(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return arrayValue(value);
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLookupValue(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}