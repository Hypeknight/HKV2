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

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  startEventRevision,
  requestEventRemovalOrRefund,
} from '@/app/dashboard/events/actions';
import ShareButton from '@/components/ShareButton';
import EventComments from '@/components/events/EventComments';
import TrackView from '@/components/analytics/TrackView';

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

  const { data: comments, error: commentsError } = await supabase
  .from('event_comments')
  .select('*')
  .eq('event_id', event.id)
  .eq('status', 'visible')
  .order('created_at', { ascending: false });

if (commentsError) {
  console.error('Comments fetch error:', commentsError.message);
}

  const commentCount = comments?.length ?? 0;

  const isOwner = user?.id === event.owner_id;
  const isVenueOwner = user?.id === event.venue?.owner_id;
  const isAdmin = viewerProfile?.app_role === 'admin';
  const canSeeControls = isOwner || isVenueOwner || isAdmin;

  const now = new Date();

  const promotionStart = event.promotion_start_at
    ? new Date(event.promotion_start_at)
    : null;

  const isBeforePromotionWindow = promotionStart
    ? now < promotionStart
    : false;

  const canOwnerRequestRevision =
    isOwner &&
    isBeforePromotionWindow &&
    ['scheduled', 'paid_awaiting_approval', 'active'].includes(event.status);

  const canContinueRevision = isOwner && event.status === 'revision_draft';

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
  <>
    <TrackView
      eventId={event.id}
      sourceType="hypeknight"
      pageType="event_detail"
      city={event.city || event.venue?.city}
      state={event.state || event.venue?.state}
      path={`/events/${event.slug}`}
    />

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
          canContinueRevision={Boolean(canContinueRevision)}
          canRequestRemoval={Boolean(canRequestRemoval)}
          isBeforePromotionWindow={Boolean(isBeforePromotionWindow)}
        />
      ) : null}

      <section className="overflow-hidden rounded-[2.75rem] border border-white/10 bg-white/5">
        {imageUrl ? (
          <div className="relative w-full overflow-hidden bg-black">
            <img
              src={imageUrl}
              alt={event.name || 'HypeKnight event'}
              className="max-h-[420px] w-full object-cover sm:max-h-[560px]"
            />
          </div>
        ) : null}

        <div className="p-5 sm:p-8 lg:p-10">
          <div className="flex flex-wrap gap-2">
            <Chip label="HypeKnight Event" tone="accent" />
            <Chip label={event.status || 'unknown'} tone="gray" />
            <Chip
              label={`${commentCount} Comment${commentCount === 1 ? '' : 's'}`}
              tone="gray"
            />

          </div>

          <h1 className="mt-5 text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            {event.name}
          </h1>

          {event.description ? (
            <p className="mt-5 max-w-4xl text-lg text-white/75">
              {event.description}
            </p>
          ) : null}

          <div className="-mx-1 mt-5 flex gap-3 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
            <ShareButton
              title={event.name}
              text={`Check out ${event.name} on HypeKnight`}
              path={`/events/${event.slug}`}
            />

            {isOwner ? (
              <Link
                href={`/dashboard/events/${event.id}/review`}
                className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
              >
                Manage Event
              </Link>
            ) : null}

            {isAdmin ? (
              <Link
                href={`/admin/events?focus=${event.id}`}
                className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
              >
                Admin View
              </Link>
            ) : null}
          </div>

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

            {locationLine ? (
              <InfoCard label="Location" value={locationLine} />
            ) : null}

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

        
      </section>

      {(event.ticket_url || event.venue?.slug) ? (
        <section className="rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
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

      <section className="rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Share This Event</h2>
        <p className="mt-3 max-w-2xl text-white/65">
          Send this event to friends, promoters, venues, or anyone looking for
          something happening around the city.
        </p>

        <div className="mt-5">
          <ShareButton
            title={event.name}
            text={`Check out ${event.name} on HypeKnight`}
            path={`/events/${event.slug}`}
          />
        </div>
      </section>

      <EventComments
        event={event}
        comments={comments ?? []}
        isSignedIn={Boolean(user)}
        eventPath={`/events/${event.slug}`}
      />
    </section>
    </>
  );
}

function EventControlPanel({
  event,
  isAdmin,
  isOwner,
  canOwnerRequestRevision,
  canContinueRevision,
  canRequestRemoval,
  isBeforePromotionWindow,
}: {
  event: any;
  isAdmin: boolean;
  isOwner: boolean;
  canOwnerRequestRevision: boolean;
  canContinueRevision: boolean;
  canRequestRemoval: boolean;
  isBeforePromotionWindow: boolean;
}) {
  return (
    <section className="rounded-[1.75rem] sm:rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Event Control Panel
          </p>

          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">
            Current Status: {event.status}
          </h2>

          <p className="mt-3 max-w-3xl text-white/70">
            Available actions are based on your permissions and where this event
            is in the HypeKnight pipeline.
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
            canContinueRevision={canContinueRevision}
            canRequestRemoval={canRequestRemoval}
            isBeforePromotionWindow={isBeforePromotionWindow}
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
  canContinueRevision,
  canRequestRemoval,
  isBeforePromotionWindow,
}: {
  event: any;
  canOwnerRequestRevision: boolean;
  canContinueRevision: boolean;
  canRequestRemoval: boolean;
  isBeforePromotionWindow: boolean;
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
        ) : null}

        {canContinueRevision ? (
          <Link
            href={`/dashboard/events/${event.id}/edit/step-1`}
            className="block w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-white hover:border-accent/40"
          >
            Continue Revision Draft
          </Link>
        ) : null}

        {!canOwnerRequestRevision && !canContinueRevision ? (
          <Notice
            text={
              isBeforePromotionWindow
                ? 'This event is not currently eligible for revision based on its status.'
                : 'Full event editing is only available before the promotion window begins.'
            }
          />
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
        ) : (
          <Notice text="Removal or refund request is unavailable for this event status." />
        )}
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
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
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
    <section className="rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
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
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}
    >
      {label}
    </span>
  );
}