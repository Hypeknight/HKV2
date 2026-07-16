import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import {
  duplicateEvent,
  requestEventRemovalOrRefund,
  startEventRevision,
  submitEventForModeration,
} from '@/app/dashboard/events/actions';
import {
  Chip,
  EventTime,
  InfoCard,
  Panel,
  SectionHeader,
} from '@/components/ui';
import EventLifecycleTimeline, {
  type EventStatusHistoryItem,
} from '@/components/admin/EventLifecycleTimeline';

type ReviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const settings = await getPlatformSettings();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const [
    { data: viewerProfile, error: profileError },
    { data: event, error: eventError },
    { data: lifecycleRows, error: lifecycleError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .maybeSingle(),

    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single(),

    supabase
      .from('event_status_history')
      .select(`
        id,
        event_id,
        from_status,
        to_status,
        changed_by,
        changed_by_role,
        reason,
        note,
        source,
        metadata,
        created_at
      `)
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (eventError || !event) {
    notFound();
  }

  if (lifecycleError) {
    throw new Error(lifecycleError.message);
  }

  const lifecycleHistory =
    (lifecycleRows || []) as EventStatusHistoryItem[];

  const isOwner = event.owner_id === user.id;
  const isAdmin = viewerProfile?.app_role === 'admin';

  if (!isOwner && !isAdmin) redirect('/dashboard');

  const now = new Date();
  const promotionStart = parseWallTime(event.promotion_start_at);
  const promotionEnd = parseWallTime(event.promotion_end_at);
  const isBeforePromotionWindow = promotionStart ? now < promotionStart : false;

  const canViewPublicEvent =
    Boolean(event.slug) &&
    event.is_public === true &&
    ['scheduled', 'active', 'live'].includes(event.status);

  const canStepEdit =
    isOwner &&
    ['building', 'draft', 'rejected', 'NPNA', 'revision_draft'].includes(
      event.status
    );

  const canSubmitForModeration =
    isOwner && ['building', 'draft', 'rejected', 'NPNA'].includes(event.status);

  const canOwnerRequestRevision =
    isOwner &&
    isBeforePromotionWindow &&
    ['scheduled', 'paid_awaiting_approval', 'active'].includes(event.status);

  const canContinueRevision = isOwner && event.status === 'revision_draft';

  const canRequestRemoval =
    isOwner &&
    !['completed', 'removed', 'removal_requested'].includes(event.status);

  const imageUrl = event.flyer_url || event.image_url || null;

  const basePromoDays = Number(
    settings.base_promo_days ||
      settings.included_promo_days ||
      event.included_promo_days ||
      14
  );

  const basePrice = Number(
    event.base_price || settings.base_event_price || settings.event_base_price || 19.99
  );

  const extraDayPrice = Number(settings.extra_promo_day_price || 2.5);

  const linkLiteEnabled = Boolean(settings.enable_link_lite);
  const fullLinkEnabled = Boolean(settings.enable_full_link);

  const reviewRequired =
    settings.event_review_required === undefined
      ? true
      : Boolean(settings.event_review_required);

  const paymentRequired =
    settings.event_payment_required === undefined
      ? true
      : Boolean(settings.event_payment_required);

  const publicDisplayText =
    String(settings.event_public_display_rule || '').trim() ||
    'Events become discoverable after approval, payment or override, public visibility, and scheduled or active status.';

  const processText = {
    build:
      String(settings.owner_process_build_text || '').trim() ||
      'You add the event basics, flyer, category, vibe, age, attire, price, and guest details.',
    payment:
      String(settings.owner_process_payment_text || '').trim() ||
      'HypeKnight checks payment, coupon discounts, free posting codes, or admin overrides.',
    review:
      String(settings.owner_process_review_text || '').trim() ||
      'HypeKnight reviews the listing for accuracy, safety, completeness, and public readiness.',
    discovery:
      String(settings.owner_process_discovery_text || '').trim() ||
      'Approved events become discoverable during their promotion window.',
  };

  const promotionRemainingText = getPromotionRemainingText(promotionEnd);
  const imageScore = imageUrl ? 100 : 0;
  const descriptionScore = event.description ? 100 : 0;
  const locationScore = event.address && event.city && event.state ? 100 : 50;
  const detailsScore = event.event_type && event.dress_code && event.age_requirement ? 100 : 50;
  const overallScore = Math.round(
    (imageScore + descriptionScore + locationScore + detailsScore) / 4
  );

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/dashboard/events" className="text-sm text-white/60 hover:text-accent">
        ← Back to My Events
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 sm:rounded-[3rem]">
        {imageUrl ? (
          <div className="relative overflow-hidden bg-black">
            <img
              src={imageUrl}
              alt={event.name || 'Event flyer'}
              className="max-h-[520px] w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-5 sm:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-accent">
                Event Mission Control
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
                {event.name || 'Untitled Event'}
              </h1>
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-[280px] flex-col justify-end bg-black/30 p-5 sm:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">
              Event Mission Control
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
              {event.name || 'Untitled Event'}
            </h1>
            <p className="mt-4 text-white/50">No event image uploaded.</p>
          </div>
        )}

        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <Chip>Status: {event.status || 'unknown'}</Chip>
            {event.payment_status ? <Chip>Payment: {event.payment_status}</Chip> : null}
            {event.is_public ? <Chip>Public</Chip> : <Chip>Hidden</Chip>}
            {isOwner ? <Chip>Owner View</Chip> : null}
            {isAdmin ? <Chip>Admin View</Chip> : null}
            {canViewPublicEvent ? <Chip>Viewable</Chip> : <Chip>Not Public Yet</Chip>}
          </div>

          {event.description ? (
            <p className="mt-5 max-w-4xl text-base leading-7 text-white/75 sm:text-lg">
              {event.description}
            </p>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Venue" icon="📍" value={event.venue_name || 'Venue not listed'} />
            <InfoCard
              label="Location"
              icon="🏙️"
              value={
                [event.address, event.city, event.state].filter(Boolean).join(', ') ||
                'Location pending'
              }
            />
            <InfoCard
              label="Starts"
              icon="🕒"
              value={<EventTime value={event.event_start_at} mode="wall" />}
              accent
            />
            <InfoCard
              label="Promotion"
              icon="📣"
              value={promotionRemainingText}
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {canStepEdit ? (
              <>
                <ActionLink
                  href={`/dashboard/events/${event.id}/edit/step-1`}
                  title="Edit Basics"
                  text="Flyer, date, time, venue, and location."
                />
                <ActionLink
                  href={`/dashboard/events/${event.id}/edit/step-2`}
                  title="Edit Details"
                  text="Music, vibe, attire, age, amenities, and notes."
                />
                <ActionLink
                  href={`/dashboard/events/${event.id}/edit/step-3`}
                  title="Edit Promotion"
                  text="Promotion window, package, and payment."
                />
              </>
            ) : null}

            {canViewPublicEvent ? (
              <ActionLink
                href={`/events/${event.slug}`}
                title="View Public Page"
                text="See what guests can currently view."
              />
            ) : (
              <DeadAction
                title="Public Page Locked"
                text="This event is not visible to users until it is approved, paid or overridden, public, and scheduled or active."
              />
            )}
          </div>
        </div>
      </section>

      <Panel title="What HypeKnight is doing" eyebrow="Process">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ProcessCard
            step="01"
            title="Build Listing"
            active={['draft', 'building', 'rejected', 'revision_draft', 'NPNA'].includes(event.status)}
            text={processText.build}
          />
          <ProcessCard
            step="02"
            title="Payment / Coupon"
            active={['approved_awaiting_payment', 'paid_awaiting_approval'].includes(event.status)}
            text={processText.payment}
          />
          <ProcessCard
            step="03"
            title="Review"
            active={['submitted', 'paid_awaiting_approval', 'revision_submitted'].includes(event.status)}
            text={processText.review}
          />
          <ProcessCard
            step="04"
            title="Discovery"
            active={['scheduled', 'active', 'live'].includes(event.status)}
            text={processText.discovery}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-white/65">
          {publicDisplayText}
        </div>
      </Panel>

      <EventLifecycleTimeline
        history={lifecycleHistory}
        currentStatus={event.status}
        perspective="owner"
        title="Your Event Timeline"
        eyebrow="Event Progress"
        emptyText="Lifecycle updates will appear here after the event moves through review, payment, promotion, and completion."
      />

      <Panel title="Package and pricing" eyebrow="Owner Information">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            label="Base Promotion"
            icon="📣"
            value={`$${basePrice.toFixed(2)}`}
          />
          <InfoCard
            label="Included Days"
            icon="📅"
            value={`${event.included_promo_days || basePromoDays} days`}
          />
          <InfoCard
            label="Extra Day Price"
            icon="➕"
            value={`$${extraDayPrice.toFixed(2)} / day`}
          />
          <InfoCard
            label="Extra Promo Days"
            icon="⏱️"
            value={`${event.extra_promo_days || 0} days`}
          />
          <InfoCard
            label="Extra Promo Cost"
            icon="💵"
            value={`$${Number(event.extra_promo_price || 0).toFixed(2)}`}
          />
          <InfoCard
            label="Total"
            icon="💳"
            value={`$${Number(event.total_price || 0).toFixed(2)}`}
            accent
          />
          <InfoCard
            label="Linkd’N Lite"
            icon="⚔️"
            value={linkLiteEnabled ? 'Available' : 'Not available'}
          />
          <InfoCard
            label="Full Linkd’N"
            icon="🛡️"
            value={fullLinkEnabled ? 'Available' : 'Not available'}
          />
          <InfoCard
            label="Current Add-on"
            icon="🔗"
            value={event.linkdn_mode || 'None'}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <NoticeCard
            title="Payment requirement"
            text={
              paymentRequired
                ? 'Payment, a valid coupon, or an admin override is required before the event can move through the full public pipeline.'
                : 'Admin settings currently allow events to proceed without required payment.'
            }
          />
          <NoticeCard
            title="Review requirement"
            text={
              reviewRequired
                ? 'HypeKnight reviews events before public discovery to protect quality, accuracy, and user trust.'
                : 'Admin settings currently allow review to be bypassed or handled manually.'
            }
          />
        </div>
      </Panel>

      <Panel title="Event health" eyebrow="Completeness">
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-6 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Overall Score
            </p>
            <p className="mt-4 text-6xl font-black text-white">{overallScore}%</p>
            <p className="mt-3 text-sm text-white/60">
              Complete listings are easier for users to understand.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HealthRow label="Flyer" score={imageScore} />
            <HealthRow label="Description" score={descriptionScore} />
            <HealthRow label="Location" score={locationScore} />
            <HealthRow label="Event Details" score={detailsScore} />
          </div>
        </div>
      </Panel>

      <OwnerCommandPanel
        event={event}
        canStepEdit={canStepEdit}
        canSubmitForModeration={canSubmitForModeration}
        canOwnerRequestRevision={Boolean(canOwnerRequestRevision)}
        canContinueRevision={Boolean(canContinueRevision)}
        canRequestRemoval={Boolean(canRequestRemoval)}
        isBeforePromotionWindow={Boolean(isBeforePromotionWindow)}
        canViewPublicEvent={canViewPublicEvent}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <DetailPanel
          title="Public Event Details"
          items={[
            ['Event Type', event.event_type],
            ['Dress Code', event.dress_code],
            ['Entry Price', event.entry_price],
            ['Age Requirement', event.age_requirement],
            ['Smoking Policy', event.smoking_policy],
            ['Parking Notes', event.parking_notes],
            ['Special Notes', event.special_notes],
          ]}
        />

        <DetailPanel
          title="Promotion + Pricing"
          items={[
            ['Base Price', `$${Number(event.base_price || 0).toFixed(2)}`],
            ['Included Promo Days', String(event.included_promo_days || basePromoDays)],
            ['Extra Promo Days', String(event.extra_promo_days || 0)],
            ['Extra Promo Price', `$${Number(event.extra_promo_price || 0).toFixed(2)}`],
            ['Linkd’N Mode', event.linkdn_mode],
            ['Linkd’N Price', `$${Number(event.linkdn_price || 0).toFixed(2)}`],
            ['Total Price', `$${Number(event.total_price || 0).toFixed(2)}`],
          ]}
        />

        <DetailPanel
          title="Pipeline"
          items={[
            ['Status', event.status],
            ['Approved', event.is_approved ? 'Yes' : 'No'],
            ['Paid', event.is_paid ? 'Yes' : 'No'],
            ['Public', event.is_public ? 'Yes' : 'No'],
            ['Promotion Start', formatDate(event.promotion_start_at)],
            ['Promotion End', formatDate(event.promotion_end_at)],
            ['Revision Requested', formatDate(event.revision_requested_at)],
            ['Revision Submitted', formatDate(event.revision_submitted_at)],
            ['Revision Note', event.revision_reason],
            ['Admin Note', event.revision_admin_note],
          ]}
        />
      </section>
    </section>
  );
}

function OwnerCommandPanel({
  event,
  canStepEdit,
  canSubmitForModeration,
  canOwnerRequestRevision,
  canContinueRevision,
  canRequestRemoval,
  isBeforePromotionWindow,
  canViewPublicEvent,
}: {
  event: any;
  canStepEdit: boolean;
  canSubmitForModeration: boolean;
  canOwnerRequestRevision: boolean;
  canContinueRevision: boolean;
  canRequestRemoval: boolean;
  isBeforePromotionWindow: boolean;
  canViewPublicEvent: boolean;
}) {
  return (
    <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5 sm:rounded-[2.75rem] sm:p-8">
      <SectionHeader
        eyebrow="Owner Command Panel"
        title="Manage this event"
        text="Available actions depend on the event status, payment state, approval state, and promotion window."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canStepEdit ? (
          <>
            <ActionLink
              href={`/dashboard/events/${event.id}/edit/step-1`}
              title="Edit Basic Info"
              text="Update event name, date, location, or flyer."
            />
            <ActionLink
              href={`/dashboard/events/${event.id}/edit/step-2`}
              title="Edit Event Details"
              text="Update vibe, description, dress code, pricing, and notes."
            />
            <ActionLink
              href={`/dashboard/events/${event.id}/edit/step-3`}
              title="Edit Package"
              text="Update promotion package and add-ons."
            />
          </>
        ) : null}

        {canViewPublicEvent ? (
          <ActionLink
            href={`/events/${event.slug}`}
            title="View Public Page"
            text="This event is visible on HypeKnight."
          />
        ) : (
          <DeadAction
            title="Public Page Locked"
            text="This event is not visible on HypeKnight yet."
          />
        )}

        {canOwnerRequestRevision ? (
          <form action={startEventRevision} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <input type="hidden" name="event_id" value={event.id} />
            <h3 className="text-xl font-black text-white">Request Edit</h3>
            <p className="mt-2 text-sm text-white/60">
              Open this approved event as a revision draft.
            </p>
            <button className="mt-5 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black">
              Start Revision
            </button>
          </form>
        ) : null}

        {canContinueRevision ? (
          <ActionLink
            href={`/dashboard/events/${event.id}/edit/step-1`}
            title="Continue Revision"
            text="Finish edits and submit back to HypeKnight."
          />
        ) : null}

        {canSubmitForModeration ? (
          <form action={submitEventForModeration} className="rounded-2xl border border-accent/20 bg-black/20 p-5">
            <input type="hidden" name="event_id" value={event.id} />
            <h3 className="text-xl font-black text-white">Submit for Review</h3>
            <p className="mt-2 text-sm text-white/60">
              Send this event to HypeKnight for approval.
            </p>
            <button className="mt-5 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black">
              Submit Event
            </button>
          </form>
        ) : null}

        <form
          action={duplicateEvent}
          className="rounded-2xl border border-white/10 bg-black/20 p-5"
        >
          <input
            type="hidden"
            name="event_id"
            value={event.id}
          />

          <input
            type="hidden"
            name="copy_flyer"
            value="yes"
          />

          <h3 className="text-xl font-black text-white">
            Duplicate Event
          </h3>

          <p className="mt-2 text-sm leading-6 text-white/60">
            Create a new draft using this event&apos;s venue,
            description, settings, and flyer. Dates, payment,
            approval, and workflow history will reset.
          </p>

          <button className="mt-5 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90">
            Duplicate Event
          </button>
        </form>

        <DeadAction title="Upgrade Package" text="Upgrade tools can be connected later." />

        {canRequestRemoval ? (
          <form action={requestEventRemovalOrRefund} className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
            <input type="hidden" name="event_id" value={event.id} />

            <h3 className="text-xl font-black text-red-200">Remove / Refund</h3>
            <p className="mt-2 text-sm text-red-100/70">
              Request event removal or refund review.
            </p>

            <textarea
              name="removal_reason"
              rows={3}
              placeholder="Removal reason"
              className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
            />

            <label className="mt-3 flex gap-2 text-sm text-red-100/75">
              <input type="checkbox" name="wants_refund" />
              Request refund review
            </label>

            <textarea
              name="refund_reason"
              rows={3}
              placeholder="Refund reason, if different"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
            />

            <button className="mt-5 w-full rounded-2xl border border-red-500/30 bg-red-500/20 px-5 py-3 font-semibold text-red-100">
              Submit Removal / Refund Request
            </button>
          </form>
        ) : null}

        {!canStepEdit &&
        !canOwnerRequestRevision &&
        !canContinueRevision &&
        !canSubmitForModeration ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
            {isBeforePromotionWindow
              ? 'No direct edit action is available for this event status.'
              : 'Full edits are unavailable because the event is inside or past its promotion window.'}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ActionLink({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-accent/40"
    >
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
      <p className="mt-5 text-sm font-semibold text-accent">Open →</p>
    </Link>
  );
}

function DeadAction({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 opacity-70">
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
      <p className="mt-5 text-sm text-white/40">Unavailable</p>
    </div>
  );
}

function ProcessCard({
  step,
  title,
  text,
  active,
}: {
  step: string;
  title: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        active
          ? 'border-accent/30 bg-accent/10'
          : 'border-white/10 bg-black/20'
      }`}
    >
      <p className="text-sm font-black text-accent">{step}</p>
      <h3 className="mt-3 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function NoticeCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function HealthRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-white">{label}</p>
        <p className="text-sm font-black text-accent">{score}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent" style={{ width: `${score}%` }} />
      </div>
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
  const visible = items.filter(([, value]) => value && String(value).trim());

  if (!visible.length) return null;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <div className="mt-5 space-y-4">
        {visible.map(([label, value]) => (
          <div key={label} className="border-b border-white/10 pb-4 last:border-0">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              {label}
            </p>
            <p className="mt-2 break-words text-white/75">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function parseWallTime(value?: string | null) {
  if (!value) return null;

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (!match) return new Date(value);

  const [, year, month, day, hour, minute, second = '0'] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function getPromotionRemainingText(value?: Date | null) {
  if (!value) return 'Not set';

  const now = new Date();
  const diff = value.getTime() - now.getTime();

  if (diff <= 0) return 'Promotion ended';

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} day${days === 1 ? '' : 's'} remaining`;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = parseWallTime(value);
  return date ? date.toLocaleString() : null;
}