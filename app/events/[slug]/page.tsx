/*
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .maybeSingle();

    viewerRole = profile?.app_role || 'user';
  }

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !event) notFound();

  const isOwner = !!user && event.owner_id === user.id;
  const isAdmin = viewerRole === 'admin';

  const canView =
    (event.is_public === true && event.status !== 'removed') ||
    isOwner ||
    isAdmin;

  if (!canView) notFound();

  const venue = event.venue_id
    ? (
        await supabase
          .from('venues')
          .select('id, name, slug, city, state, address')
          .eq('id', event.venue_id)
          .maybeSingle()
      ).data
    : null;

  const formattedStart = event.event_start_at
    ? new Date(event.event_start_at).toLocaleString()
    : 'Date pending';

  const formattedEnd = event.event_end_at
    ? new Date(event.event_end_at).toLocaleString()
    : null;

  const musicSelection = Array.isArray(event.music_selection)
    ? event.music_selection
    : [];

  const vibeTags = Array.isArray(event.vibe_tags)
    ? event.vibe_tags
    : [];

  const hasVenue = !!(venue?.name || event.venue_name);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_28%)]" />

            <div className="relative">
              <p className="text-sm uppercase tracking-[0.35em] text-accent">Event</p>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {event.name}
              </h1>

              <p className="mt-4 max-w-3xl text-white/75">
                {event.city}, {event.state}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <HeroStat label="Starts" value={formattedStart} />

                {hasVenue ? (
                  <>
                    <HeroStat
                      label="Venue"
                      value={venue?.name || event.venue_name || '—'}
                    />
                    <HeroStat
                      label="Address"
                      value={venue?.address || event.address || '—'}
                    />
                  </>
                ) : (
                  <HeroStat
                    label="Address"
                    value={event.address || '—'}
                  />
                )}
              </div>
            </div>
          </div>

          {event.flyer_url ? (
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
              <img
                src={event.flyer_url}
                alt={event.name}
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">About This Event</h2>
            <p className="mt-4 whitespace-pre-wrap text-white/75">
              {event.description || 'Event details coming soon.'}
            </p>
          </div>

          {(musicSelection.length > 0 || vibeTags.length > 0) && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">The Vibe</h2>

              <div className="mt-6 space-y-6">
                {musicSelection.length > 0 && (
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                      Music
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {musicSelection.map((item: string) => (
                        <Tag key={item}>{item}</Tag>
                      ))}
                    </div>
                  </div>
                )}

                {vibeTags.length > 0 && (
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                      Vibe Tags
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {vibeTags.map((item: string) => (
                        <Tag key={item}>{item}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Event Details</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Info label="Date / Time" value={formattedStart} />
              <Info label="Ends" value={formattedEnd || '—'} />
              <Info label="Age Requirement" value={event.age_requirement} />
              <Info label="Dress Code" value={event.dress_code} />
              <Info label="Entry" value={event.entry_price} />
              <Info label="Venue" value={venue?.name || event.venue_name} />
              <Info label="Address" value={venue?.address || event.address} />
              <Info label="City / State" value={`${event.city}, ${event.state}`} />
              <Info label="Smoking Policy" value={event.smoking_policy} />
              <Info label="Parking Notes" value={event.parking_notes} />
            </div>

            {event.special_notes ? (
              <Block label="Special Notes" value={event.special_notes} />
            ) : null}
          </div>

          {venue?.slug ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Venue Connection</h2>
              <p className="mt-4 text-white/75">
                This event is connected to {venue.name}. Explore the venue profile for more details,
                live interaction features, and future event history.
              </p>

              <div className="mt-6">
                <Link
                  href={`/venues/${venue.slug}`}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
                >
                  View Venue
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Quick Look</h2>

            <div className="mt-6 space-y-4">
              <QuickRow label="When" value={formattedStart} />
              <QuickRow label="Where" value={venue?.name || event.venue_name || 'TBA'} />
              <QuickRow label="Location" value={`${event.city}, ${event.state}`} />
              <QuickRow label="Type" value={event.event_type || '—'} />
              <QuickRow label="Age" value={event.age_requirement || '—'} />
              <QuickRow label="Dress" value={event.dress_code || '—'} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-accent">Night Outlook</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Built for the right crowd</h2>
            <p className="mt-4 text-white/75">
              HypeKnight is designed to help users find events that match their energy,
              mood, and movement for the night.
            </p>
          </div>

          {(isOwner || isAdmin) && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Management Access</h2>

              <div className="mt-6 space-y-3">
                {isOwner && (
                  <Link
                    href={`/events/${event.slug}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                  >
                    Owner View
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                  >
                    Open Admin Review
                  </Link>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-sm font-semibold text-white">{value || '—'}</p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function Block({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-white">{value || '—'}</p>
    </div>
  );
}

function QuickRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/60">{label}</span>
      <span className="text-right text-white">{value || '—'}</span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
      {children}
    </span>
  );
}
  */
/*
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  startEventRevision,
  requestEventRemovalOrRefund,
} from '@/app/dashboard/events/actions';
import ShareButton from '@/components/ShareButton';
import EventComments from '@/components/events/EventComments';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: viewerProfile } = user
    ? await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues(
        id,
        name,
        slug,
        city,
        state,
        address,
        owner_id
      )
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !event) notFound();

  const { data: comments } = await supabase
  .from('event_comments')
  .select(`
    *,
    profiles:user_id(display_name, username)
  `)
  .eq('event_id', event.id)
  .eq('status', 'visible')
  .order('created_at', { ascending: false });

  const isOwner = user?.id === event.owner_id;
  const isVenueOwner = user?.id === event.venue?.owner_id;
  const isAdmin = viewerProfile?.app_role === 'admin';
  const canSeeControls = isOwner || isVenueOwner || isAdmin;

  const now = new Date();
  const promotionStart = event.promotion_start_at
    ? new Date(event.promotion_start_at)
    : null;

  const isBeforePromotionWindow =
    promotionStart && now < promotionStart;

  const canOwnerRequestRevision =
    isOwner &&
    isBeforePromotionWindow &&
    ['scheduled', 'paid_awaiting_approval', 'active'].includes(event.status);

  const canRequestRemoval =
    isOwner &&
    !['completed', 'removed', 'removal_requested'].includes(event.status);

  const imageUrl = event.flyer_url || event.image_url || null;

  const locationLine = cleanJoin(
    [
      event.venue_name || event.venue?.name,
      event.address || event.venue?.address,
      cleanJoin(
        [event.city || event.venue?.city, event.state || event.venue?.state],
        ', '
      ),
    ],
    ' • '
  );

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/events" className="text-sm text-white/60 hover:text-accent">
        ← Back to Events
      </Link>

      {canSeeControls ? (
        <EventControlPanel
          event={event}
          isAdmin={isAdmin}
          isOwner={isOwner}
          canOwnerRequestRevision={Boolean(canOwnerRequestRevision)}
          canRequestRemoval={Boolean(canRequestRemoval)}
        />
      ) : null}

      <section className="overflow-hidden rounded-[2.75rem] border border-white/10 bg-white/5">
        {imageUrl ? (
          <div className="relative w-full overflow-hidden bg-black">
            <img
              src={imageUrl}
              alt={event.name}
              className="max-h-[560px] w-full object-cover"
            />
          </div>
        ) : null}

        <div className="p-8 sm:p-10">
          <div className="flex flex-wrap gap-2">
            <Chip label="HypeKnight Event" tone="accent" />
            <Chip label={event.status || 'unknown'} tone="gray" />
            {event.payment_status ? (
              <Chip label={`Payment: ${event.payment_status}`} tone="gray" />
            ) : null}
          </div>

          <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">
            {event.name}
          </h1>

          {event.description ? (
            <p className="mt-5 max-w-4xl text-lg text-white/75">
              {event.description}
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {event.event_start_at ? (
              <InfoCard
                label="Starts"
                value={new Date(event.event_start_at).toLocaleString()}
              />
            ) : null}

            {event.event_end_at ? (
              <InfoCard
                label="Ends"
                value={new Date(event.event_end_at).toLocaleString()}
              />
            ) : null}

            {locationLine ? <InfoCard label="Location" value={locationLine} /> : null}

            {event.entry_price ? (
              <InfoCard label="Entry" value={event.entry_price} />
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <DetailPanel
          title="Event Details"
          items={[
            ['Dress Code', event.dress_code],
            ['Age Requirement', event.age_requirement],
            ['Smoking Policy', event.smoking_policy],
            ['Parking', event.parking_notes],
            ['Special Notes', event.special_notes],
          ]}
        />

        <DetailPanel
          title="Venue"
          items={[
            ['Venue', event.venue_name || event.venue?.name],
            ['Address', event.address || event.venue?.address],
            [
              'City',
              cleanJoin(
                [event.city || event.venue?.city, event.state || event.venue?.state],
                ', '
              ),
            ],
          ]}
        />

        <DetailPanel
          title="Promotion Window"
          items={[
            ['Promotion Starts', formatDate(event.promotion_start_at)],
            ['Promotion Ends', formatDate(event.promotion_end_at)],
            ['Revision Status', event.revision_reason],
            ['Removal Status', event.removal_reason],
          ]}
        />
      </section>

      {(event.ticket_url || event.venue?.slug) ? (
        <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Next Step</h2>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {event.ticket_url ? (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
              >
                Get Tickets
              </a>
            ) : null}

            {event.venue?.slug ? (
              <Link
                href={`/venues/${event.venue.slug}`}
                className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-center text-white hover:border-accent/40"
              >
                View Venue
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function EventControlPanel({
  event,
  isAdmin,
  isOwner,
  canOwnerRequestRevision,
  canRequestRemoval,
}: {
  event: any;
  isAdmin: boolean;
  isOwner: boolean;
  canOwnerRequestRevision: boolean;
  canRequestRemoval: boolean;
}) {
  return (
    <section className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Event Control Panel
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Current Status: {event.status}
          </h2>
          <p className="mt-3 max-w-3xl text-white/70">
            Available actions are based on your permissions and where this event is
            in the HypeKnight pipeline.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isOwner ? <Chip label="Owner View" tone="accent" /> : null}
          {isAdmin ? <Chip label="Admin View" tone="accent" /> : null}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {isOwner ? (
          <OwnerActions
            event={event}
            canOwnerRequestRevision={canOwnerRequestRevision}
            canRequestRemoval={canRequestRemoval}
          />
        ) : null}

        {isAdmin ? <AdminActions event={event} /> : null}
      </div>
    </section>
  );
}

function OwnerActions({
  event,
  canOwnerRequestRevision,
  canRequestRemoval,
}: {
  event: any;
  canOwnerRequestRevision: boolean;
  canRequestRemoval: boolean;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <h3 className="text-2xl font-bold text-white">Owner Options</h3>

      <div className="mt-5 space-y-4">
        {canOwnerRequestRevision ? (
          <form action={startEventRevision}>
            <input type="hidden" name="event_id" value={event.id} />
            <button className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90">
              Request Edit / Revision
            </button>
          </form>
        ) : (
          <Notice text="Full event editing is only available before the promotion window begins." />
        )}

        {event.status === 'revision_draft' ? (
          <Link
            href={`/dashboard/events/${event.id}/edit`}
            className="block w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-white hover:border-accent/40"
          >
            Continue Revision Draft
          </Link>
        ) : null}

        {canRequestRemoval ? (
          <form action={requestEventRemovalOrRefund} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />

            <textarea
              name="removal_reason"
              rows={3}
              placeholder="Why are you requesting removal?"
              className="input"
            />

            <label className="flex gap-2 text-sm text-white/70">
              <input type="checkbox" name="wants_refund" />
              Request refund review
            </label>

            <textarea
              name="refund_reason"
              rows={3}
              placeholder="Refund reason, if different"
              className="input"
            />

            <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-red-200 hover:border-red-500/40">
              Request Removal / Refund
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function AdminActions({ event }: { event: any }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <h3 className="text-2xl font-bold text-white">Admin Options</h3>

      <div className="mt-5 grid gap-3">
        <Link
          href={`/admin/events?focus=${event.id}`}
          className="rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
        >
          Open in Admin Events
        </Link>

        <Link
          href="/admin/payments"
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-white hover:border-accent/40"
        >
          Payments / Refund Center
        </Link>

        {event.status === 'revision_submitted' ? (
          <Notice text="This event has a submitted revision and needs admin review." />
        ) : null}

        {event.status === 'removal_requested' ? (
          <Notice text="This event has a removal/refund request waiting for admin review." />
        ) : null}
      </div>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
      {text}
    </div>
  );
}

function cleanJoin(values: Array<string | null | undefined>, separator = ' ') {
  return values
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(separator);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 break-words text-white">{value}</p>
    </div>
  );
}

function DetailPanel({
  title,
  items,
}: {
  title: string;
  items: Array<[string, string | null | undefined]>;
}) {
  const visibleItems = items.filter(([, value]) => value && String(value).trim());

  if (!visibleItems.length) return null;

  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>

      <div className="mt-5 space-y-4">
        {visibleItems.map(([label, value]) => (
          <div key={label} className="border-b border-white/10 pb-4 last:border-0">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              {label}
            </p>
            <p className="mt-2 text-white/75">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: 'accent' | 'gray';
}) {
  const styles =
    tone === 'accent'
      ? 'border-accent/20 bg-accent/10 text-accent'
      : 'border-white/10 bg-white/5 text-white/65';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}>
      {label}
    </span>
  );
}*/

/*
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLookupMap, type LookupValue } from '@/lib/config/lookups';
import TrackView from '@/components/analytics/TrackView';
import ShareEventButton from '@/components/events/ShareEventButton';
import { getEventShareMetadata } from '@/lib/metadata/event-metadata';
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

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 sm:rounded-[3rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.09),transparent_30%)]" />

          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt={event.name || 'Event flyer'}
                className="h-[380px] w-full object-cover sm:h-[540px] lg:h-[620px]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

              <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                <EventStatusBadge
                  startAt={event.event_start_at}
                  endAt={event.event_end_at}
                />
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
                <HeroContent
                  event={event}
                  locationText={locationText}
                  eventTypes={eventTypeItems}
                  canManage={canManage}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          ) : (
            <div className="relative min-h-[380px] p-6 sm:p-10">
              <div className="absolute left-5 top-5">
                <EventStatusBadge
                  startAt={event.event_start_at}
                  endAt={event.event_end_at}
                />
              </div>

              <div className="flex min-h-[320px] items-end">
                <HeroContent
                  event={event}
                  locationText={locationText}
                  eventTypes={eventTypeItems}
                  canManage={canManage}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Panel
            title="Join the night"
            eyebrow="Event Engagement"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <EngagementMetric
                label="Saved"
                value={saveCount || 0}
                text="People keeping this event on their radar."
              />

              <EngagementMetric
                label="Going"
                value={goingCount || 0}
                text="Guests planning to attend."
              />

              <EngagementMetric
                label="Interested"
                value={interestedCount || 0}
                text="Guests considering this event."
              />
            </div>

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
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className={actionClass}
                >
                  Open Directions
                </a>
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

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Patron Pulse"
            eyebrow="Live Venue Energy"
          >
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm leading-7 text-white/65">
                Patron Pulse will let verified guests check in,
                respond to live prompts, and help HypeKnight understand
                the current energy at this event.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Chip>Guest Check-In</Chip>
                <Chip>Live Polls</Chip>
                <Chip>Energy Score</Chip>
                <Chip>Connection Readiness</Chip>
              </div>
            </div>
          </Panel>

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
    */
   import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLookupMap, type LookupValue } from '@/lib/config/lookups';
import TrackView from '@/components/analytics/TrackView';
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

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 sm:rounded-[3rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.09),transparent_30%)]" />

          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt={event.name || 'Event flyer'}
                className="h-[380px] w-full object-cover sm:h-[540px] lg:h-[620px]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

              <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                <EventStatusBadge
                  startAt={event.event_start_at}
                  endAt={event.event_end_at}
                />
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
                <HeroContent
                  event={event}
                  locationText={locationText}
                  eventTypes={eventTypeItems}
                  canManage={canManage}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          ) : (
            <div className="relative min-h-[380px] p-6 sm:p-10">
              <div className="absolute left-5 top-5">
                <EventStatusBadge
                  startAt={event.event_start_at}
                  endAt={event.event_end_at}
                />
              </div>

              <div className="flex min-h-[320px] items-end">
                <HeroContent
                  event={event}
                  locationText={locationText}
                  eventTypes={eventTypeItems}
                  canManage={canManage}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Panel
            title="Join the night"
            eyebrow="Event Engagement"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <EngagementMetric
                label="Saved"
                value={saveCount || 0}
                text="People keeping this event on their radar."
              />

              <EngagementMetric
                label="Going"
                value={goingCount || 0}
                text="Guests planning to attend."
              />

              <EngagementMetric
                label="Interested"
                value={interestedCount || 0}
                text="Guests considering this event."
              />
            </div>

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
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className={actionClass}
                >
                  Open Directions
                </a>
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