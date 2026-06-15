import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  requestEventRemovalOrRefund,
  startEventRevision,
  submitEventForModeration,
} from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';

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
    isOwner &&
    ['building', 'draft', 'rejected', 'NPNA'].includes(event.status);

  const canOwnerRequestRevision =
    isOwner &&
    isBeforePromotionWindow &&
    ['scheduled', 'paid_awaiting_approval', 'active'].includes(event.status);

  const canContinueRevision = isOwner && event.status === 'revision_draft';

  const canRequestRemoval =
    isOwner &&
    !['completed', 'removed', 'removal_requested'].includes(event.status);

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Event Review
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          Review Your Event
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Review your event details and available actions based on the event’s
          current pipeline status.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Chip label={`Status: ${event.status || 'unknown'}`} />
          {event.payment_status ? (
            <Chip label={`Payment: ${event.payment_status}`} />
          ) : null}
          {isOwner ? <Chip label="Owner" /> : null}
          {isAdmin ? <Chip label="Admin" /> : null}
        </div>
      </div>

      <EventControlPanel
        event={event}
        isAdmin={isAdmin}
        canOwnerRequestRevision={Boolean(canOwnerRequestRevision)}
        canContinueRevision={Boolean(canContinueRevision)}
        canRequestRemoval={Boolean(canRequestRemoval)}
        isBeforePromotionWindow={Boolean(isBeforePromotionWindow)}
      />

      <div className="mt-8 space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Basic Information</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Event Name" value={event.name} />
            <Info label="Venue Name" value={event.venue_name} />
            <Info label="Address" value={event.address} />
            <Info label="City" value={event.city} />
            <Info label="State" value={event.state} />
            <Info
              label="Start"
              value={
                event.event_start_at
                  ? new Date(event.event_start_at).toLocaleString()
                  : ''
              }
            />
            <Info
              label="End"
              value={
                event.event_end_at
                  ? new Date(event.event_end_at).toLocaleString()
                  : ''
              }
            />
            <Info label="Flyer URL" value={event.flyer_url} />
          </div>

          {canStepEdit ? (
            <div className="mt-6">
              <Link
                href={`/dashboard/events/${event.id}/edit/step-1`}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
              >
                Edit Step 1
              </Link>
            </div>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Event Details</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Dress Code" value={event.dress_code} />
            <Info label="Entry Price" value={event.entry_price} />
            <Info label="Age Requirement" value={event.age_requirement} />
            <Info label="Event Type" value={event.event_type} />
            <Info label="Smoking Policy" value={event.smoking_policy} />
            <Info label="Parking Notes" value={event.parking_notes} />
          </div>

          <Block label="Description" value={event.description} />
          <Block label="Special Notes" value={event.special_notes} />
          <Block
            label="Music Selection"
            value={
              Array.isArray(event.music_selection)
                ? event.music_selection.join(', ')
                : ''
            }
          />
          <Block
            label="Vibe Tags"
            value={Array.isArray(event.vibe_tags) ? event.vibe_tags.join(', ') : ''}
          />

          {canStepEdit ? (
            <div className="mt-6">
              <Link
                href={`/dashboard/events/${event.id}/edit/step-2`}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
              >
                Edit Step 2
              </Link>
            </div>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Promotion + Pricing</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info
              label="Base Price"
              value={`$${Number(event.base_price || 0).toFixed(2)}`}
            />
            <Info
              label="Included Promo Days"
              value={String(event.included_promo_days || 14)}
            />
            <Info
              label="Extra Promo Days"
              value={String(event.extra_promo_days || 0)}
            />
            <Info
              label="Extra Promo Price"
              value={`$${Number(event.extra_promo_price || 0).toFixed(2)}`}
            />
            <Info label="Linkd'N Mode" value={event.linkdn_mode} />
            <Info
              label="Linkd'N Price"
              value={`$${Number(event.linkdn_price || 0).toFixed(2)}`}
            />
            <Info
              label="Promotion Start"
              value={
                event.promotion_start_at
                  ? new Date(event.promotion_start_at).toLocaleString()
                  : ''
              }
            />
            <Info
              label="Promotion End"
              value={
                event.promotion_end_at
                  ? new Date(event.promotion_end_at).toLocaleString()
                  : ''
              }
            />
            <Info
              label="Total Price"
              value={`$${Number(event.total_price || 0).toFixed(2)}`}
            />
          </div>

          {canStepEdit ? (
            <div className="mt-6">
              <Link
                href={`/dashboard/events/${event.id}/edit/step-3`}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
              >
                Edit Step 3
              </Link>
            </div>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Pipeline Details</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Status" value={event.status} />
            <Info label="Payment Status" value={event.payment_status} />
            <Info label="Approved" value={event.is_approved ? 'Yes' : 'No'} />
            <Info label="Public" value={event.is_public ? 'Yes' : 'No'} />
            <Info
              label="Revision Requested"
              value={
                event.revision_requested_at
                  ? new Date(event.revision_requested_at).toLocaleString()
                  : ''
              }
            />
            <Info
              label="Revision Submitted"
              value={
                event.revision_submitted_at
                  ? new Date(event.revision_submitted_at).toLocaleString()
                  : ''
              }
            />
          </div>

          <Block label="Revision Reason" value={event.revision_reason} />
          <Block label="Revision Admin Note" value={event.revision_admin_note} />
          <Block label="Removal Reason" value={event.removal_reason} />
          <Block label="Refund Reason" value={event.refund_reason} />
        </div>

        {canSubmitForModeration ? (
          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
            <h2 className="text-2xl font-bold text-white">Ready to submit?</h2>
            <p className="mt-3 text-white/70">
              Once submitted, this event moves into review and becomes locked
              unless rejected back for changes.
            </p>

            <form action={submitEventForModeration} className="mt-6">
              <input type="hidden" name="event_id" value={event.id} />
              <button
                type="submit"
                className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
              >
                Submit for Review
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EventControlPanel({
  event,
  isAdmin,
  canOwnerRequestRevision,
  canContinueRevision,
  canRequestRemoval,
  isBeforePromotionWindow,
}: {
  event: any;
  isAdmin: boolean;
  canOwnerRequestRevision: boolean;
  canContinueRevision: boolean;
  canRequestRemoval: boolean;
  isBeforePromotionWindow: boolean;
}) {
  return (
    <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
      <h2 className="text-2xl font-bold text-white">Available Actions</h2>
      <p className="mt-3 text-white/70">
        Actions are shown based on this event’s current status and promotion
        timeline.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-xl font-bold text-white">Owner Options</h3>

          <div className="mt-4 space-y-4">
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
                className="block w-full rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
              >
                Continue Revision Draft
              </Link>
            ) : null}

            {!canOwnerRequestRevision && !canContinueRevision ? (
              <Notice
                text={
                  isBeforePromotionWindow
                    ? 'This event is not currently eligible for revision based on its status.'
                    : 'Full editing is unavailable because this event is inside or past its promotion window.'
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
            ) : null}
          </div>
        </div>

        {isAdmin ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-xl font-bold text-white">Admin Options</h3>

            <div className="mt-4 grid gap-3">
              <Link
                href={`/admin/events?focus=${event.id}`}
                className="rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
              >
                Open Event Queue
              </Link>

              <Link
                href="/admin/payments"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-white hover:border-accent/40"
              >
                Payments / Refund Center
              </Link>

              {event.status === 'revision_submitted' ? (
                <Notice text="This event has a submitted revision waiting for admin review." />
              ) : null}

              {event.status === 'removal_requested' ? (
                <Notice text="This event has a removal/refund request waiting for admin review." />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 text-white">{value || '—'}</p>
    </div>
  );
}

function Block({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-white">{value || '—'}</p>
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

function Notice({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
      {text}
    </div>
  );
}