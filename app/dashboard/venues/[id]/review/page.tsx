import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ id: string }>;
};

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default async function VenueReviewPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) notFound();

  const { data: featureProfile } = await supabase
    .from('venue_feature_profiles')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  const { data: interactionSettings } = await supabase
    .from('venue_interaction_settings')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  const { data: hours } = await supabase
    .from('venue_hours')
    .select('*')
    .eq('venue_id', id)
    .order('day_of_week', { ascending: true });

  const { data: subscription } = await supabase
    .from('venue_subscriptions')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  const { data: plan } = subscription?.plan_definition_id
    ? await supabase
        .from('venue_plan_definitions')
        .select('*')
        .eq('id', subscription.plan_definition_id)
        .maybeSingle()
    : { data: null };

  const { data: subscriptionFeatures } = subscription
    ? await supabase
        .from('venue_subscription_features')
        .select('*')
        .eq('venue_subscription_id', subscription.id)
        .maybeSingle()
    : { data: null };

  const { data: usage } = subscription
    ? await supabase
        .from('venue_subscription_usage')
        .select('*')
        .eq('venue_subscription_id', subscription.id)
        .maybeSingle()
    : { data: null };

  const paymentReady = !!subscription && !!plan;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Venue Review</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Review your venue details, package, and payment setup before activation.
          </p>
        </div>

        <Link
          href={`/dashboard/venues/${venue.id}/edit`}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Venue Manager
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <Panel
            title="Step 1 — Venue Basics"
            actionHref={`/dashboard/venues/${venue.id}/edit/step-1`}
            actionLabel="Edit Step 1"
          >
            <Grid>
              <Info label="Venue Name" value={venue.name} />
              <Info label="Slug" value={venue.slug} />
              <Info label="Address" value={venue.address} />
              <Info label="City / State" value={`${venue.city}, ${venue.state}`} />
              <Info label="Website" value={venue.website_url} />
              <Info label="Instagram" value={venue.instagram_url} />
              <Info label="Visible" value={venue.is_visible ? 'Yes' : 'No'} />
              <Info label="Current Status" value={venue.status} />
            </Grid>

            <Block label="Description" value={venue.description} />
          </Panel>

          <Panel
            title="Step 2 — Venue Profile"
            actionHref={`/dashboard/venues/${venue.id}/edit/step-2`}
            actionLabel="Edit Step 2"
          >
            <Grid>
              <Info label="Dress Code" value={featureProfile?.dress_code} />
              <Info
                label="Music Profile"
                value={
                  Array.isArray(featureProfile?.music_profile)
                    ? featureProfile.music_profile.join(', ')
                    : '—'
                }
              />
              <Info
                label="Drink Menu Enabled"
                value={featureProfile?.drink_menu_enabled ? 'Yes' : 'No'}
              />
              <Info label="RSVP Enabled" value={featureProfile?.rsvp_enabled ? 'Yes' : 'No'} />
              <Info
                label="Table Service Enabled"
                value={featureProfile?.table_service_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="Special Message Enabled"
                value={featureProfile?.special_message_enabled ? 'Yes' : 'No'}
              />
            </Grid>

            <Block label="Drink Menu Notes" value={featureProfile?.drink_menu_notes} />
            <Block label="General Information" value={featureProfile?.general_info} />
            <Block label="Special Message" value={venue.special_message} />
          </Panel>

          <Panel
            title="Operating Hours"
            actionHref={`/dashboard/venues/${venue.id}/edit/hours`}
            actionLabel="Edit Hours"
          >
            {hours?.length ? (
              <div className="space-y-3">
                {hours.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-white">
                      <span className="font-semibold">{DAY_NAMES[row.day_of_week]}</span>{' '}
                      — {row.is_open ? `${row.open_time || '—'} to ${row.close_time || '—'}` : 'Closed'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/70">No operating hours added yet.</p>
            )}
          </Panel>

          <Panel
            title="Step 3 — Package + Services"
            actionHref={`/dashboard/venues/${venue.id}/edit/step-3`}
            actionLabel="Edit Step 3"
          >
            <Grid>
              <Info label="Plan Name" value={plan?.name} />
              <Info label="Tier" value={plan?.tier} />
              <Info
                label="Duration"
                value={plan?.duration_months ? `${plan.duration_months} months` : '—'}
              />
              <Info label="Billing Mode" value={subscription?.billing_mode} />
              <Info label="Lock-In" value={subscription?.lock_in ? 'Yes' : 'No'} />
              <Info label="Subscription Status" value={subscription?.subscription_status} />
              <Info label="Current Period Price" value={money(subscription?.current_period_price)} />
              <Info label="Monthly Price" value={money(subscription?.monthly_price)} />
              <Info label="Prepaid Total" value={money(subscription?.prepaid_total)} />
              <Info
                label="Included Event Posts"
                value={String(usage?.included_event_posts ?? 0)}
              />
            </Grid>
          </Panel>

          <Panel
            title="Live Interaction Setup"
            actionHref={`/dashboard/venues/${venue.id}/interactions`}
            actionLabel="Manage Interactions"
          >
            <Grid>
              <Info
                label="Comments Enabled"
                value={interactionSettings?.comments_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="Comment Retention"
                value={
                  interactionSettings?.comment_retention_hours
                    ? `${interactionSettings.comment_retention_hours} hours`
                    : '—'
                }
              />
              <Info
                label="Comments Require Presence"
                value={interactionSettings?.comments_require_presence ? 'Yes' : 'No'}
              />
              <Info
                label="Music Requests Enabled"
                value={interactionSettings?.music_requests_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="Music Requests Require Presence"
                value={interactionSettings?.music_requests_require_presence ? 'Yes' : 'No'}
              />
              <Info
                label="Auto Filter Enabled"
                value={interactionSettings?.comments_auto_filter_enabled ? 'Yes' : 'No'}
              />
            </Grid>

            <Grid className="mt-6">
              <Info
                label="Subscription Comments Feature"
                value={subscriptionFeatures?.comments_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="Subscription DJ Requests"
                value={subscriptionFeatures?.dj_requests_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="Linkd’N Mode"
                value={subscriptionFeatures?.linkdn_mode}
              />
              <Info
                label="Drink Menu Feature"
                value={subscriptionFeatures?.drink_menu_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="RSVP Feature"
                value={subscriptionFeatures?.rsvp_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="Table Service Feature"
                value={subscriptionFeatures?.table_service_enabled ? 'Yes' : 'No'}
              />
            </Grid>
          </Panel>
        </div>

        <aside className="space-y-8">
          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-accent">Activation Status</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Payment required before go-live</h2>
            <p className="mt-4 text-white/75">
              Your venue remains in draft/review state until checkout is completed or an admin activates it.
            </p>

            <div className="mt-6 grid gap-3">
              <QuickRow label="Venue Status" value={venue.status || 'draft'} />
              <QuickRow
                label="Subscription"
                value={subscription?.subscription_status || 'draft'}
              />
              <QuickRow
                label="Public Visibility"
                value={venue.is_visible ? 'Visible' : 'Hidden'}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Price Summary</h2>

            <div className="mt-6 space-y-4">
              <QuickRow label="Plan" value={plan?.name || '—'} />
              <QuickRow label="Billing Mode" value={subscription?.billing_mode || '—'} />
              <QuickRow
                label="Current Period Price"
                value={money(subscription?.current_period_price)}
              />
              <QuickRow label="Monthly Price" value={money(subscription?.monthly_price)} />
              <QuickRow label="Prepaid Total" value={money(subscription?.prepaid_total)} />
              <QuickRow
                label="Next Billing Amount"
                value={money(subscription?.next_billing_amount)}
              />
            </div>

            <div className="mt-8 space-y-3">
              {paymentReady ? (
                <Link
                  href={`/dashboard/venues/${venue.id}/payment`}
                  className="block rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
                >
                  Proceed to Payment
                </Link>
              ) : (
                <button
                  disabled
                  className="block w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white/50"
                >
                  Payment Not Ready Yet
                </button>
              )}

              <p className="text-sm text-white/60">
                Payment portal is the next stage after this review step.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Before activation</h2>
            <div className="mt-5 space-y-3 text-white/75">
              <p>• Review all venue details</p>
              <p>• Confirm package and included services</p>
              <p>• Complete payment</p>
              <p>• Venue becomes eligible for public activation</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Grid({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>{children}</div>;
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-sm text-white">{value || '—'}</p>
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

function money(value: number | string | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}