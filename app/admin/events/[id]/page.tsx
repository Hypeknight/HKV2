import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLookupMap, type LookupValue } from '@/lib/lookups';
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

const PUBLIC_STATUSES = ['scheduled', 'active', 'live'];

const EVENT_STATUSES = [
  'draft',
  'building',
  'revision_draft',
  'submitted',
  'approved_unpaid',
  'approved_awaiting_payment',
  'paid_awaiting_approval',
  'revision_submitted',
  'scheduled',
  'active',
  'live',
  'rejected',
  'removal_requested',
  'cancelled',
  'removed',
  'ended',
  'archived',
];

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

  const [{ data: event, error }, lookups] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single(),

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

  if (error || !event) notFound();

  const [
    { data: owner },
    { count: ownerEventCount },
    { count: ownerApprovedCount },
    { count: ownerRejectedCount },
  ] = await Promise.all([
    event.owner_id
      ? supabase
          .from('profiles')
          .select(`
            id,
            display_name,
            username,
            app_role,
            city,
            state,
            created_at
          `)
          .eq('id', event.owner_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    event.owner_id
      ? supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', event.owner_id)
      : Promise.resolve({ count: 0 }),

    event.owner_id
      ? supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', event.owner_id)
          .in('status', ['scheduled', 'active', 'live', 'ended'])
      : Promise.resolve({ count: 0 }),

    event.owner_id
      ? supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', event.owner_id)
          .eq('status', 'rejected')
      : Promise.resolve({ count: 0 }),
  ]);

  const imageUrl = event.flyer_url || null;

  const canApprove = [
    'submitted',
    'paid_awaiting_approval',
    'approved_unpaid',
    'approved_awaiting_payment',
  ].includes(event.status);

  const canReviewRevision = event.status === 'revision_submitted';

  const canViewPublic =
    Boolean(event.slug) &&
    event.is_public === true &&
    PUBLIC_STATUSES.includes(event.status);

  const eventTypes = resolveLookupItems(
    lookups.event_types,
    splitValue(event.event_type)
  );

  const musicItems = resolveLookupItems(
    lookups.music_genres,
    arrayValue(event.music_selection)
  );

  const vibeItems = resolveLookupItems(
    lookups.vibe_tags,
    arrayValue(event.vibe_tags)
  );

  const amenityItems = resolveLookupItems(
    lookups.event_amenities,
    arrayValue(event.amenities)
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

  const qualityChecks = buildQualityChecks(event);
  const qualityScore = calculateQualityScore(qualityChecks);
  const timeline = buildTimeline(event);

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/events"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Event Moderation
        </Link>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/events/${event.id}/review`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            Owner Review View
          </Link>

          {canViewPublic ? (
            <Link
              href={`/events/${event.slug}`}
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-black hover:opacity-90"
            >
              View Public Event
            </Link>
          ) : (
            <span className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-white/40">
              Public page unavailable
            </span>
          )}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 sm:rounded-[3rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-0 lg:grid-cols-[400px_1fr]">
          <div className="min-h-[360px] bg-black/30">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={event.name || 'Event flyer'}
                className="h-full min-h-[360px] w-full object-cover"
              />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center text-white/40">
                No flyer uploaded
              </div>
            )}
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Admin Event Command Center
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              {event.name || 'Untitled Event'}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Moderate the listing, review owner history, correct public
              details, control visibility, adjust promotion terms, and record
              internal decisions.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatusBadge status={event.status || 'unknown'} />
              <Chip label={event.is_public ? 'Public' : 'Hidden'} />
              <PaymentBadge event={event} />

              {event.admin_featured ? (
                <Chip label="Featured" />
              ) : null}

              {event.hidden_by_admin ? (
                <Chip label="Admin Hidden" />
              ) : null}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Info
                label="Owner"
                value={
                  owner?.display_name ||
                  owner?.username ||
                  event.owner_id
                }
              />

              <Info
                label="Location"
                value={
                  [event.city, event.state]
                    .filter(Boolean)
                    .join(', ') || 'Location TBA'
                }
              />

              <Info
                label="Event Start"
                value={formatDate(event.event_start_at)}
              />

              <Info
                label="Promotion End"
                value={formatDate(event.promotion_end_at)}
              />

              <Info
                label="Total Price"
                value={money(event.total_price)}
              />

              <Info
                label="Payment Status"
                value={event.payment_status || 'Pending'}
              />

              <Info
                label="Coupon"
                value={event.coupon_code || 'None'}
              />

              <Info
                label="Linkd’N"
                value={event.linkdn_mode || 'None'}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Quality Score"
          value={`${qualityScore}%`}
          text="Listing completeness"
          tone={
            qualityScore >= 80
              ? 'green'
              : qualityScore >= 55
                ? 'yellow'
                : 'red'
          }
        />

        <MetricCard
          label="Owner Events"
          value={String(ownerEventCount || 0)}
          text="Total submitted listings"
          tone="neutral"
        />

        <MetricCard
          label="Owner Approved"
          value={String(ownerApprovedCount || 0)}
          text="Scheduled, active, or completed"
          tone="green"
        />

        <MetricCard
          label="Owner Rejected"
          value={String(ownerRejectedCount || 0)}
          text="Listings sent back"
          tone={ownerRejectedCount ? 'red' : 'neutral'}
        />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1fr_420px]">
        <main className="space-y-8">
          <Panel
            title="Public Event Overview"
            eyebrow="Moderator Preview"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Info
                label="Venue"
                value={event.venue_name || 'Venue TBA'}
              />

              <Info
                label="Address"
                value={event.address || 'Not listed'}
              />

              <Info
                label="Entry"
                value={
                  event.entry_price ||
                  event.cover_charge ||
                  'Not listed'
                }
              />

              <Info
                label="Dress Code"
                value={dressCode.label || 'Not listed'}
              />

              <Info
                label="Age"
                value={ageRequirement.label || 'Not listed'}
              />

              <Info
                label="Parking"
                value={
                  parkingOption.label ||
                  event.parking_notes ||
                  'Not listed'
                }
              />

              <Info
                label="Smoking"
                value={
                  smokingPolicy.label ||
                  event.smoking_policy ||
                  'Not listed'
                }
              />

              <Info
                label="Event Types"
                value={
                  eventTypes.length
                    ? eventTypes
                        .map((item) => item.display_name)
                        .join(', ')
                    : 'Not listed'
                }
              />
            </div>

            {event.description ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                  Description
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">
                  {event.description}
                </p>
              </div>
            ) : null}

            <div className="mt-8 space-y-7">
              <LookupTagSection
                title="Music"
                items={musicItems}
              />

              <LookupTagSection
                title="Vibes"
                items={vibeItems}
              />

              <LookupTagSection
                title="Amenities"
                items={amenityItems}
              />
            </div>
          </Panel>

          <Panel
            title="Listing Quality Checks"
            eyebrow="Moderation Assistance"
          >
            <div className="grid gap-3 md:grid-cols-2">
              {qualityChecks.map((check) => (
                <QualityCheck
                  key={check.label}
                  label={check.label}
                  passed={check.passed}
                  text={check.text}
                />
              ))}
            </div>
          </Panel>

          <Panel
            title="Customer Service Edit"
            eyebrow="Public Information"
          >
            <form
              action={updateAdminEventDetails}
              className="space-y-6"
            >
              <input
                type="hidden"
                name="event_id"
                value={event.id}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="name"
                  label="Event Name"
                  defaultValue={event.name}
                />

                <Input
                  name="slug"
                  label="Slug"
                  defaultValue={event.slug}
                />

                <Input
                  name="venue_name"
                  label="Venue Name"
                  defaultValue={event.venue_name}
                />

                <Input
                  name="address"
                  label="Address"
                  defaultValue={event.address}
                />

                <Input
                  name="city"
                  label="City"
                  defaultValue={event.city}
                />

                <Input
                  name="state"
                  label="State"
                  defaultValue={event.state}
                />

                <Input
                  name="event_start_at"
                  label="Event Start"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(
                    event.event_start_at
                  )}
                />

                <Input
                  name="event_end_at"
                  label="Event End"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(
                    event.event_end_at
                  )}
                />

                <Input
                  name="flyer_url"
                  label="Flyer URL"
                  defaultValue={event.flyer_url}
                />

                <Input
                  name="event_type"
                  label="Event Type"
                  defaultValue={event.event_type}
                />

                <Input
                  name="dress_code"
                  label="Dress Code"
                  defaultValue={event.dress_code}
                />

                <Input
                  name="entry_price"
                  label="Entry Price"
                  defaultValue={event.entry_price}
                />

                <Input
                  name="age_requirement"
                  label="Age Requirement"
                  defaultValue={event.age_requirement}
                />

                <Input
                  name="smoking_policy"
                  label="Smoking Policy"
                  defaultValue={event.smoking_policy}
                />
              </div>

              <TextArea
                name="description"
                label="Description"
                defaultValue={event.description}
                rows={7}
              />

              <TextArea
                name="special_notes"
                label="Special Notes"
                defaultValue={event.special_notes}
              />

              <TextArea
                name="parking_notes"
                label="Parking Notes"
                defaultValue={event.parking_notes}
              />

              <button className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90">
                Save Customer Service Edits
              </button>
            </form>
          </Panel>

          <Panel
            title="Promotion, Package and Financials"
            eyebrow="Commercial Controls"
          >
            <form
              action={updateAdminEventFinancials}
              className="space-y-6"
            >
              <input
                type="hidden"
                name="event_id"
                value={event.id}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="base_price"
                  label="Base Price"
                  type="number"
                  step="0.01"
                  defaultValue={event.base_price}
                />

                <Input
                  name="included_promo_days"
                  label="Included Promo Days"
                  type="number"
                  defaultValue={
                    event.included_promo_days ?? 14
                  }
                />

                <Input
                  name="extra_promo_days"
                  label="Extra Promo Days"
                  type="number"
                  defaultValue={event.extra_promo_days ?? 0}
                />

                <Input
                  name="extra_promo_price"
                  label="Extra Promo Price"
                  type="number"
                  step="0.01"
                  defaultValue={event.extra_promo_price}
                />

                <Input
                  name="linkdn_mode"
                  label="Linkd’N Mode"
                  defaultValue={event.linkdn_mode}
                />

                <Input
                  name="linkdn_price"
                  label="Linkd’N Price"
                  type="number"
                  step="0.01"
                  defaultValue={event.linkdn_price}
                />

                <Input
                  name="coupon_code"
                  label="Coupon Code"
                  defaultValue={event.coupon_code}
                />

                <Input
                  name="discount_amount"
                  label="Discount Amount"
                  type="number"
                  step="0.01"
                  defaultValue={event.discount_amount}
                />

                <Input
                  name="total_price"
                  label="Total Price"
                  type="number"
                  step="0.01"
                  defaultValue={event.total_price}
                />

                <Input
                  name="payment_amount"
                  label="Payment Amount"
                  type="number"
                  step="0.01"
                  defaultValue={event.payment_amount}
                />

                <Input
                  name="promotion_start_at"
                  label="Promotion Start"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(
                    event.promotion_start_at
                  )}
                />

                <Input
                  name="promotion_end_at"
                  label="Promotion End"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(
                    event.promotion_end_at
                  )}
                />
              </div>

              <TextArea
                name="package_upgrade_note"
                label="Package / Upgrade Note"
                defaultValue={event.package_upgrade_note}
              />

              <button className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90">
                Save Financial and Package Changes
              </button>
            </form>
          </Panel>

          <Panel
            title="Internal Admin Notes"
            eyebrow="Not Visible to Event Owner"
          >
            <form
              action={updateAdminEventNotes}
              className="space-y-5"
            >
              <input
                type="hidden"
                name="event_id"
                value={event.id}
              />

              <TextArea
                name="admin_notes"
                label="Internal Moderation Notes"
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
                Save Internal Notes
              </button>
            </form>
          </Panel>
        </main>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Panel
            title="Moderation Decision"
            eyebrow="Priority Actions"
          >
            <div className="space-y-4">
              {canApprove ? (
                <form action={approveEvent}>
                  <input
                    type="hidden"
                    name="event_id"
                    value={event.id}
                  />

                  <ActionButton tone="green">
                    Approve Event
                  </ActionButton>
                </form>
              ) : null}

              {canReviewRevision ? (
                <>
                  <form
                    action={approveEventRevision}
                    className="space-y-3"
                  >
                    <input
                      type="hidden"
                      name="event_id"
                      value={event.id}
                    />

                    <TextArea
                      name="admin_note"
                      label="Revision Approval Note"
                    />

                    <ActionButton tone="green">
                      Approve Revision
                    </ActionButton>
                  </form>

                  <form
                    action={rejectEventRevision}
                    className="space-y-3"
                  >
                    <input
                      type="hidden"
                      name="event_id"
                      value={event.id}
                    />

                    <TextArea
                      name="admin_note"
                      label="Required Revision Changes"
                      required
                    />

                    <ActionButton tone="red">
                      Reject Revision
                    </ActionButton>
                  </form>
                </>
              ) : null}

              <form
                action={rejectEvent}
                className="space-y-3"
              >
                <input
                  type="hidden"
                  name="event_id"
                  value={event.id}
                />

                <TextArea
                  name="rejection_reason"
                  label="Reject / Send Back Reason"
                  required
                />

                <ActionButton tone="red">
                  Reject / Send Back
                </ActionButton>
              </form>

              {!isEventPaid(event) ? (
                <form
                  action={applyPaymentOverride}
                  className="space-y-3"
                >
                  <input
                    type="hidden"
                    name="event_id"
                    value={event.id}
                  />

                  <TextArea
                    name="reason"
                    label="Payment Override Reason"
                    required
                  />

                  <ActionButton tone="yellow">
                    Apply Payment Override
                  </ActionButton>
                </form>
              ) : null}
            </div>
          </Panel>

          <Panel
            title="Visibility Controls"
            eyebrow="Public Discovery"
          >
            <div className="grid gap-3">
              {!event.hidden_by_admin ? (
                <StatusForm
                  eventId={event.id}
                  actionName="hide"
                  label="Hide Event"
                  tone="yellow"
                />
              ) : (
                <StatusForm
                  eventId={event.id}
                  actionName="unhide"
                  label="Unhide Event"
                  tone="green"
                />
              )}

              {!event.admin_featured ? (
                <StatusForm
                  eventId={event.id}
                  actionName="feature"
                  label="Feature Event"
                  tone="green"
                />
              ) : (
                <StatusForm
                  eventId={event.id}
                  actionName="unfeature"
                  label="Remove Feature"
                  tone="yellow"
                />
              )}

              <StatusForm
                eventId={event.id}
                actionName="reactivate"
                label="Reactivate / Schedule"
                tone="green"
              />

              <StatusForm
                eventId={event.id}
                actionName="cancel"
                label="Cancel Event"
                tone="red"
              />

              <StatusForm
                eventId={event.id}
                actionName="remove"
                label="Remove Event"
                tone="red"
              />
            </div>
          </Panel>

          <Panel
            title="Manual Status Control"
            eyebrow="Advanced"
          >
            <form
              action={updateAdminEventStatus}
              className="space-y-4"
            >
              <input
                type="hidden"
                name="event_id"
                value={event.id}
              />

              <label className="block">
                <span className="text-sm font-semibold text-white/70">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue={event.status || 'draft'}
                  className={fieldClass}
                >
                  {EVENT_STATUSES.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </label>

              <TextArea
                name="reason"
                label="Reason / Internal Note"
                required
              />

              <ActionButton tone="yellow">
                Update Status
              </ActionButton>
            </form>
          </Panel>

          <Panel
            title="Owner History"
            eyebrow="Account Context"
          >
            <div className="space-y-3">
              <Info
                label="Owner"
                value={
                  owner?.display_name ||
                  owner?.username ||
                  event.owner_id
                }
              />

              <Info
                label="Account Role"
                value={owner?.app_role || 'user'}
              />

              <Info
                label="Location"
                value={
                  [owner?.city, owner?.state]
                    .filter(Boolean)
                    .join(', ') || 'Not listed'
                }
              />

              <Info
                label="Joined"
                value={formatDate(owner?.created_at)}
              />

              <Info
                label="Total Events"
                value={String(ownerEventCount || 0)}
              />

              <Info
                label="Approved History"
                value={String(ownerApprovedCount || 0)}
              />

              <Info
                label="Rejected History"
                value={String(ownerRejectedCount || 0)}
              />
            </div>
          </Panel>

          <Panel
            title="Moderation Timeline"
            eyebrow="Event History"
          >
            <div className="space-y-4">
              {timeline.map((item) => (
                <TimelineItem
                  key={`${item.label}-${item.value}`}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Quick Facts" eyebrow="Identifiers">
            <div className="space-y-3">
              <Info label="Event ID" value={event.id} />
              <Info label="Owner ID" value={event.owner_id} />
              <Info
                label="Created"
                value={formatDate(event.created_at)}
              />
              <Info
                label="Updated"
                value={formatDate(event.updated_at)}
              />
              <Info
                label="Approved"
                value={formatDate(event.approved_at)}
              />
              <Info
                label="Rejected"
                value={formatDate(event.rejected_at)}
              />
              <Info
                label="Removed"
                value={formatDate(event.removed_at)}
              />
              <Info
                label="Locked"
                value={formatDate(event.locked_at)}
              />
            </div>
          </Panel>
        </aside>
      </section>
    </section>
  );
}

function StatusForm({
  eventId,
  actionName,
  label,
  tone,
}: {
  eventId: string;
  actionName: string;
  label: string;
  tone: 'green' | 'yellow' | 'red';
}) {
  return (
    <form action={updateAdminEventVisibility}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="action" value={actionName} />

      <ActionButton tone={tone}>{label}</ActionButton>
    </form>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-8">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="mt-2 text-2xl font-black text-white">
        {title}
      </h2>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function Input({
  name,
  label,
  type = 'text',
  step,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  defaultValue?: string | number | null;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">
        {label}
      </span>

      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ''}
        className={fieldClass}
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  rows = 4,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">
        {label}
      </span>

      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue ?? ''}
        className={fieldClass}
      />
    </label>
  );
}

function ActionButton({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'green' | 'yellow' | 'red';
}) {
  const classes = {
    green:
      'border-green-500/20 bg-green-500/10 text-green-200 hover:border-green-500/40',
    yellow:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-200 hover:border-yellow-500/40',
    red:
      'border-red-500/20 bg-red-500/10 text-red-200 hover:border-red-500/40',
  };

  return (
    <button
      className={`w-full rounded-2xl border px-5 py-3 font-semibold ${classes[tone]}`}
    >
      {children}
    </button>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
        {label}
      </p>

      <div className="mt-2 break-words text-white">
        {value || '—'}
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    submitted:
      'border-blue-500/20 bg-blue-500/10 text-blue-200',
    paid_awaiting_approval:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    approved_unpaid:
      'border-orange-500/20 bg-orange-500/10 text-orange-200',
    revision_submitted:
      'border-purple-500/20 bg-purple-500/10 text-purple-200',
    scheduled:
      'border-indigo-500/20 bg-indigo-500/10 text-indigo-200',
    active:
      'border-green-500/20 bg-green-500/10 text-green-200',
    live:
      'border-green-500/20 bg-green-500/10 text-green-200',
    rejected:
      'border-red-500/20 bg-red-500/10 text-red-200',
    removed:
      'border-white/10 bg-white/5 text-white/50',
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        classes[status] ||
        'border-white/10 bg-white/5 text-white/65'
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function PaymentBadge({ event }: { event: any }) {
  if (event.payment_override) {
    return (
      <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-200">
        Payment Override
      </span>
    );
  }

  if (isEventPaid(event)) {
    return (
      <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-200">
        Paid
      </span>
    );
  }

  return (
    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
      Unpaid
    </span>
  );
}

function MetricCard({
  label,
  value,
  text,
  tone,
}: {
  label: string;
  value: string;
  text: string;
  tone: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const classes = {
    green:
      'border-green-500/20 bg-green-500/10',
    yellow:
      'border-yellow-500/20 bg-yellow-500/10',
    red:
      'border-red-500/20 bg-red-500/10',
    neutral:
      'border-white/10 bg-white/5',
  };

  return (
    <div className={`rounded-[1.75rem] border p-5 ${classes[tone]}`}>
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>

      <p className="mt-2 text-sm text-white/55">
        {text}
      </p>
    </div>
  );
}

function LookupTagSection({
  title,
  items,
}: {
  title: string;
  items: LookupValue[];
}) {
  if (!items.length) {
    return (
      <div>
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="mt-2 text-sm text-white/40">
          No values selected.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-black text-white">{title}</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white/70"
          >
            {item.icon ? `${item.icon} ` : ''}
            {item.display_name}
          </span>
        ))}
      </div>
    </div>
  );
}

function QualityCheck({
  label,
  passed,
  text,
}: {
  label: string;
  passed: boolean;
  text: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        passed
          ? 'border-green-500/20 bg-green-500/10'
          : 'border-red-500/20 bg-red-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{passed ? '✓' : '!'}</span>

        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="mt-1 text-sm leading-5 text-white/55">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const dotClasses = {
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
    neutral: 'bg-white/40',
  };

  return (
    <div className="flex gap-3">
      <span
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClasses[tone]}`}
      />

      <div>
        <p className="text-sm font-semibold text-white">
          {label}
        </p>

        <p className="mt-1 text-xs text-white/45">
          {value}
        </p>
      </div>
    </div>
  );
}

function buildQualityChecks(event: any) {
  return [
    {
      label: 'Event name',
      passed: Boolean(event.name?.trim()),
      text: event.name
        ? 'A public event name is present.'
        : 'Event name is missing.',
    },
    {
      label: 'Flyer',
      passed: Boolean(event.flyer_url),
      text: event.flyer_url
        ? 'An event flyer has been supplied.'
        : 'No event flyer is available.',
    },
    {
      label: 'Description',
      passed: String(event.description || '').trim().length >= 60,
      text:
        String(event.description || '').trim().length >= 60
          ? 'Description contains enough detail.'
          : 'Description may be too short.',
    },
    {
      label: 'Location',
      passed: Boolean(
        event.venue_name &&
        event.address &&
        event.city &&
        event.state
      ),
      text:
        event.venue_name &&
        event.address &&
        event.city &&
        event.state
          ? 'Venue and location details are present.'
          : 'Venue or location details are incomplete.',
    },
    {
      label: 'Event timing',
      passed: Boolean(event.event_start_at),
      text: event.event_start_at
        ? 'A start date and time are present.'
        : 'Event start time is missing.',
    },
    {
      label: 'Discovery tags',
      passed:
        arrayValue(event.music_selection).length > 0 ||
        splitValue(event.event_type).length > 0 ||
        arrayValue(event.vibe_tags).length > 0,
      text:
        arrayValue(event.music_selection).length > 0 ||
        splitValue(event.event_type).length > 0 ||
        arrayValue(event.vibe_tags).length > 0
          ? 'The listing contains searchable categories.'
          : 'The listing needs music, type, or vibe tags.',
    },
    {
      label: 'Promotion window',
      passed: Boolean(
        event.promotion_start_at &&
        event.promotion_end_at
      ),
      text:
        event.promotion_start_at &&
        event.promotion_end_at
          ? 'Promotion dates are configured.'
          : 'Promotion dates are incomplete.',
    },
    {
      label: 'Payment readiness',
      passed: isEventPaid(event),
      text: isEventPaid(event)
        ? 'Payment, zero balance, or override is complete.'
        : 'The event still has an unpaid balance.',
    },
  ];
}

function calculateQualityScore(
  checks: Array<{ passed: boolean }>
) {
  if (!checks.length) return 0;

  const passed = checks.filter((check) => check.passed).length;

  return Math.round((passed / checks.length) * 100);
}

function buildTimeline(event: any) {
  const items = [
    {
      label: 'Event created',
      value: formatDate(event.created_at),
      raw: event.created_at,
      tone: 'neutral' as const,
    },
    {
      label: 'Event submitted',
      value: formatDate(event.submitted_at),
      raw: event.submitted_at,
      tone: 'yellow' as const,
    },
    {
      label: 'Payment completed',
      value: formatDate(event.paid_at),
      raw: event.paid_at,
      tone: 'green' as const,
    },
    {
      label: 'Event approved',
      value: formatDate(event.approved_at),
      raw: event.approved_at,
      tone: 'green' as const,
    },
    {
      label: 'Event rejected',
      value: formatDate(event.rejected_at),
      raw: event.rejected_at,
      tone: 'red' as const,
    },
    {
      label: 'Event removed',
      value: formatDate(event.removed_at),
      raw: event.removed_at,
      tone: 'red' as const,
    },
    {
      label: 'Last updated',
      value: formatDate(event.updated_at),
      raw: event.updated_at,
      tone: 'neutral' as const,
    },
  ];

  return items
    .filter((item) => Boolean(item.raw))
    .sort(
      (a, b) =>
        new Date(a.raw).getTime() -
        new Date(b.raw).getTime()
    );
}

function resolveLookupItems(
  options: LookupValue[] = [],
  selectedValues: string[] = []
): LookupValue[] {
  const selected = new Set(
    selectedValues.map(normalizeLookupValue)
  );

  const resolved = options.filter((option) =>
    selected.has(normalizeLookupValue(option.value))
  );

  const resolvedValues = new Set(
    resolved.map((item) =>
      normalizeLookupValue(item.value)
    )
  );

  const missing = selectedValues.filter(
    (value) =>
      !resolvedValues.has(normalizeLookupValue(value))
  );

  return [
    ...resolved,
    ...missing.map((value, index) => ({
      id: `legacy-${normalizeLookupValue(value)}-${index}`,
      category_key: 'legacy',
      value,
      display_name: value,
      description: null,
      icon: null,
      color: null,
      sort_order: 999,
      is_active: true,
    })),
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

  if (Array.isArray(value)) return arrayValue(value);

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

function isEventPaid(event: any) {
  return (
    event.is_paid === true ||
    event.payment_override === true ||
    event.payment_status === 'paid' ||
    Number(event.total_price || 0) <= 0
  );
}

function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString();
}

function money(
  value: number | string | null | undefined
) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();

  const local = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return local.toISOString().slice(0, 16);
}

const fieldClass =
  'mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';