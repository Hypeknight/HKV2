import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  approveEvent,
  rejectEvent,
  applyPaymentOverride,
  approveEventRevision,
  rejectEventRevision,
  updateAdminEventDetails,
  updateAdminEventStatus,
  updateAdminEventVisibility,
  updateAdminEventFinancials,
  updateAdminEventNotes,
} from '../new/actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (adminProfile?.app_role !== 'admin') redirect('/dashboard');

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) notFound();

  const { data: owner } = event.owner_id
    ? await supabase
        .from('profiles')
        .select('*')
        .eq('id', event.owner_id)
        .maybeSingle()
    : { data: null };

  const imageUrl = event.flyer_url || event.image_url;
  const canApprove = ['submitted', 'paid_awaiting_approval', 'approved_unpaid'].includes(event.status);
  const canReviewRevision = event.status === 'revision_submitted';

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/events" className="text-sm text-white/60 hover:text-accent">
          ← Back to Event Control Center
        </Link>

        {event.slug ? (
          <Link
            href={`/events/${event.slug}`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-white hover:border-accent/40"
          >
            View Public Event
          </Link>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-[2.75rem] border border-white/10 bg-white/5">
        <div className="grid gap-0 lg:grid-cols-[380px_1fr]">
          <div className="bg-black/30">
            {imageUrl ? (
              <img src={imageUrl} alt={event.name || 'Event flyer'} className="h-full min-h-[360px] w-full object-cover" />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center text-white/40">
                No flyer uploaded
              </div>
            )}
          </div>

          <div className="p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-accent">
              Admin Event Command Center
            </p>

            <h1 className="mt-3 text-4xl font-black text-white">
              {event.name || 'Untitled Event'}
            </h1>

            <p className="mt-3 max-w-3xl text-white/70">
              Full admin control for moderation, customer service, visibility,
              payment adjustments, package changes, and event corrections.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Chip label={event.status || 'unknown'} />
              <Chip label={event.is_public ? 'public' : 'hidden'} />
              <Chip label={event.is_paid ? 'paid' : 'unpaid'} />
              {event.payment_override ? <Chip label="payment override" /> : null}
              {event.admin_featured ? <Chip label="featured" /> : null}
              {event.hidden_by_admin ? <Chip label="admin hidden" /> : null}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Info label="Owner" value={owner?.display_name || owner?.username || event.owner_id} />
              <Info label="City" value={[event.city, event.state].filter(Boolean).join(', ')} />
              <Info label="Event Start" value={formatDate(event.event_start_at)} />
              <Info label="Promo End" value={formatDate(event.promotion_end_at)} />
              <Info label="Total Price" value={money(event.total_price)} />
              <Info label="Payment Status" value={event.payment_status} />
              <Info label="Coupon" value={event.coupon_code} />
              <Info label="Linkd'N" value={event.linkdn_mode} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          <Panel title="Customer Service Edit">
            <form action={updateAdminEventDetails} className="space-y-6">
              <input type="hidden" name="event_id" value={event.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <Input name="name" label="Event Name" defaultValue={event.name} />
                <Input name="slug" label="Slug" defaultValue={event.slug} />
                <Input name="venue_name" label="Venue Name" defaultValue={event.venue_name} />
                <Input name="address" label="Address" defaultValue={event.address} />
                <Input name="city" label="City" defaultValue={event.city} />
                <Input name="state" label="State" defaultValue={event.state} />
                <Input name="event_start_at" label="Event Start" type="datetime-local" defaultValue={toDateTimeLocal(event.event_start_at)} />
                <Input name="event_end_at" label="Event End" type="datetime-local" defaultValue={toDateTimeLocal(event.event_end_at)} />
                <Input name="flyer_url" label="Flyer URL" defaultValue={event.flyer_url} />
                <Input name="event_type" label="Event Type" defaultValue={event.event_type} />
                <Input name="dress_code" label="Dress Code" defaultValue={event.dress_code} />
                <Input name="entry_price" label="Entry Price" defaultValue={event.entry_price} />
                <Input name="age_requirement" label="Age Requirement" defaultValue={event.age_requirement} />
                <Input name="smoking_policy" label="Smoking Policy" defaultValue={event.smoking_policy} />
              </div>

              <TextArea name="description" label="Description" defaultValue={event.description} />
              <TextArea name="special_notes" label="Special Notes" defaultValue={event.special_notes} />
              <TextArea name="parking_notes" label="Parking Notes" defaultValue={event.parking_notes} />

              <button className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90">
                Save Customer Service Edits
              </button>
            </form>
          </Panel>

          <Panel title="Promotion, Package + Financials">
            <form action={updateAdminEventFinancials} className="space-y-6">
              <input type="hidden" name="event_id" value={event.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <Input name="base_price" label="Base Price" type="number" step="0.01" defaultValue={event.base_price} />
                <Input name="included_promo_days" label="Included Promo Days" type="number" defaultValue={event.included_promo_days ?? 14} />
                <Input name="extra_promo_days" label="Extra Promo Days" type="number" defaultValue={event.extra_promo_days ?? 0} />
                <Input name="extra_promo_price" label="Extra Promo Price" type="number" step="0.01" defaultValue={event.extra_promo_price} />
                <Input name="linkdn_mode" label="Linkd'N Mode" defaultValue={event.linkdn_mode} />
                <Input name="linkdn_price" label="Linkd'N Price" type="number" step="0.01" defaultValue={event.linkdn_price} />
                <Input name="coupon_code" label="Coupon Code" defaultValue={event.coupon_code} />
                <Input name="discount_amount" label="Discount Amount" type="number" step="0.01" defaultValue={event.discount_amount} />
                <Input name="total_price" label="Total Price" type="number" step="0.01" defaultValue={event.total_price} />
                <Input name="payment_amount" label="Payment Amount" type="number" step="0.01" defaultValue={event.payment_amount} />
                <Input name="promotion_start_at" label="Promotion Start" type="datetime-local" defaultValue={toDateTimeLocal(event.promotion_start_at)} />
                <Input name="promotion_end_at" label="Promotion End" type="datetime-local" defaultValue={toDateTimeLocal(event.promotion_end_at)} />
              </div>

              <TextArea
                name="package_upgrade_note"
                label="Package / Upgrade Note"
                defaultValue={event.package_upgrade_note}
              />

              <button className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90">
                Save Financial / Package Changes
              </button>
            </form>
          </Panel>

          <Panel title="Admin Notes + Customer Service Log">
            <form action={updateAdminEventNotes} className="space-y-5">
              <input type="hidden" name="event_id" value={event.id} />

              <TextArea
                name="admin_notes"
                label="Internal Admin Notes"
                defaultValue={event.admin_notes}
                rows={8}
              />

              <TextArea
                name="admin_refund_note"
                label="Refund / Customer Service Note"
                defaultValue={event.admin_refund_note}
                rows={5}
              />

              <button className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90">
                Save Admin Notes
              </button>
            </form>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Reactive Admin Actions">
            <div className="space-y-4">
              {canApprove ? (
                <form action={approveEvent}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <Button tone="green">Approve Event</Button>
                </form>
              ) : null}

              {canReviewRevision ? (
                <>
                  <form action={approveEventRevision} className="space-y-3">
                    <input type="hidden" name="event_id" value={event.id} />
                    <TextArea name="admin_note" label="Revision Approval Note" />
                    <Button tone="green">Approve Revision</Button>
                  </form>

                  <form action={rejectEventRevision} className="space-y-3">
                    <input type="hidden" name="event_id" value={event.id} />
                    <TextArea name="admin_note" label="Revision Rejection Note" />
                    <Button tone="red">Reject Revision</Button>
                  </form>
                </>
              ) : null}

              <form action={rejectEvent} className="space-y-3">
                <input type="hidden" name="event_id" value={event.id} />
                <TextArea name="rejection_reason" label="Reject / Send Back Reason" />
                <Button tone="red">Reject / Send Back</Button>
              </form>

              {!event.is_paid && !event.payment_override ? (
                <form action={applyPaymentOverride} className="space-y-3">
                  <input type="hidden" name="event_id" value={event.id} />
                  <TextArea name="reason" label="Payment Override Reason" />
                  <Button tone="yellow">Apply Payment Override</Button>
                </form>
              ) : null}
            </div>
          </Panel>

          <Panel title="Visibility + Feature Controls">
            <div className="grid gap-3">
              <StatusForm eventId={event.id} action="hide" label="Hide Event" tone="yellow" />
              <StatusForm eventId={event.id} action="unhide" label="Unhide Event" tone="green" />
              <StatusForm eventId={event.id} action="feature" label="Feature Event" tone="green" />
              <StatusForm eventId={event.id} action="unfeature" label="Remove Feature" tone="yellow" />
              <StatusForm eventId={event.id} action="reactivate" label="Reactivate / Schedule" tone="green" />
              <StatusForm eventId={event.id} action="cancel" label="Cancel Event" tone="red" />
              <StatusForm eventId={event.id} action="remove" label="Remove Event" tone="red" />
            </div>
          </Panel>

          <Panel title="Manual Status Control">
       