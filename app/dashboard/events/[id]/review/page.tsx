import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  requestEventRemovalOrRefund,
  startEventRevision,
  submitEventForModeration,
} from '@/app/dashboard/events/actions';

type ReviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) notFound();

  const isOwner = event.owner_id === user.id;
  const isAdmin = viewerProfile?.app_role === 'admin';

  if (!isOwner && !isAdmin) redirect('/dashboard');

  const now = new Date();

  const promotionStart = event.promotion_start_at
    ? new Date(event.promotion_start_at)
    : null;

  const isBeforePromotionWindow = promotionStart ? now < promotionStart : false;

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

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/dashboard" className="text-sm text-white/60 hover:text-accent">
        ← Back to Dashboard
      </Link>

      <section className="overflow-hidden rounded-[2.75rem] border border-white/10 bg-white/5">
        {imageUrl ? (
          <div className="overflow-hidden bg-black">
            <img
              src={imageUrl}
              alt={event.name || 'Event flyer'}
              className="max-h-[560px] w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex min-h-[240px] items-center justify-center bg-black/30 text-white/45">
            No event image uploaded.
          </div>
        )}

        <div className="p-8 sm:p-10">
          <div className="flex flex-wrap gap-2">
            <Chip label={`Status: ${event.status || 'unknown'}`} />
            {event.payment_status ? <Chip label={`Payment: ${event.payment_status}`} /> : null}
            {event.is_public ? <Chip label="Public" /> : <Chip label="Hidden" />}
            {isOwner ? <Chip label="Owner View" /> : null}
            {isAdmin ? <Chip label="Admin View" /> : null}
          </div>

          <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">
            {event.name || 'Untitled Event'}
          </h1>

          {event.description ? (
            <p className="mt-5 max-w-4xl text-lg text-white/75">
              {event.description}
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Venue" value={event.venue_name} />
            <Info label="Location" value={[event.city, event.state].filter(Boolean).join(', ')} />
            <Info
              label="Starts"
              value={event.event_start_at ? new Date(event.event_start_at).toLocaleString() : null}
            />
            <Info
              label="Ends"
              value={event.event_end_at ? new Date(event.event_end_at).toLocaleString() : null}
            />
          </div>
        </div>
      </section>

      <OwnerCommandPanel
        event={event}
        canStepEdit={canStepEdit}
        canSubmitForModeration={canSubmitForModeration}
        canOwnerRequestRevision={Boolean(canOwnerRequestRevision)}
        canContinueRevision={Boolean(canContinueRevision)}
        canRequestRemoval={Boolean(canRequestRemoval)}
        isBeforePromotionWindow={Boolean(isBeforePromotionWindow)}
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
            ['Included Promo Days', String(event.included_promo_days || 14)],
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
}: {
  event: any;
  canStepEdit: boolean;
  canSubmitForModeration: boolean;
  canOwnerRequestRevision: boolean;
  canContinueRevision: boolean;
  canRequestRemoval: boolean;
  isBeforePromotionWindow: boolean;
}) {
  return (
    <section className="rounded-[2.75rem] border border-accent/20 bg-accent/10 p-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Owner Command Panel
        </p>
        <h2 className="mt-3 text-3xl font-bold text-white">
          Manage This Event
        </h2>
        <p className="mt-3 max-w-3xl text-white/70">
          Available actions depend on the event status, payment state, approval state,
          and promotion window.
        </p>
      </div>

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

        {canOwnerRequestRevision ? (
          <form action={startEventRevision} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <input type="hidden" name="event_id" value={event.id} />
            <h3 className="text-xl font-bold text-white">Request Edit</h3>
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
            <h3 className="text-xl font-bold text-white">Submit for Review</h3>
            <p className="mt-2 text-sm text-white/60">
              Send this event to HypeKnight for approval.
            </p>
            <button className="mt-5 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black">
              Submit Event
            </button>
          </form>
        ) : null}

        <DeadAction title="Upgrade Package" text="Upgrade tools can be connected later." />
        <DeadAction title="Hide Event on HypeKnight" text="This action can be connected later." />

        {canRequestRemoval ? (
          <form action={requestEventRemovalOrRefund} className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
            <input type="hidden" name="event_id" value={event.id} />

            <h3 className="text-xl font-bold text-red-200">Remove / Refund</h3>
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
      className="rounded-2xl border border-white/10 bg-black/20 p-5 hover:border-accent/40"
    >
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/60">{text}</p>
      <p className="mt-5 text-sm font-semibold text-accent">Open →</p>
    </Link>
  );
}

function DeadAction({ title, text }: { title: string; text: string }) {
  return (
    <button
      type="button"
      disabled
      className="cursor-not-allowed rounded-2xl border border-white/10 bg-black/20 p-5 text-left opacity-60"
    >
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/60">{text}</p>
      <p className="mt-5 text-sm text-white/40">Coming soon</p>
    </button>
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
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
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

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value}</p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/65">
      {label}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}