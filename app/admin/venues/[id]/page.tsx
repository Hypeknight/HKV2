import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  updateVenueAdminState,
  updateVenueInteractionOverrides,
  updateVenueSubscriptionAdmin,
} from '@/app/admin/venues/actions';
import { resolveVenueRemovalRequest } from '@/app/admin/venues/actions';

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

export default async function AdminVenueDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
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

  const { data: plan } = subscription?.plan_definition_id
    ? await supabase
        .from('venue_plan_definitions')
        .select('*')
        .eq('id', subscription.plan_definition_id)
        .maybeSingle()
    : { data: null };

  const { data: presenceSessions } = await supabase
    .from('venue_presence_sessions')
    .select('*')
    .eq('venue_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: comments } = await supabase
    .from('venue_comments')
    .select('*')
    .eq('venue_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: musicRequests } = await supabase
    .from('venue_music_requests')
    .select('*')
    .eq('venue_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin Venue</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Full admin review of venue profile, package state, interactions, and operations.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/venues"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            Back to Admin Venues
          </Link>
          <Link
            href={`/venues/${venue.slug}`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            View Public Page
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        <Panel title="Core Venue Record">
          <Grid>
            <Info label="Venue Name" value={venue.name} />
            <Info label="Slug" value={venue.slug} />
            <Info label="Owner ID" value={venue.owner_id} />
            <Info label="Status" value={venue.status} />
            <Info label="Visible" value={venue.is_visible ? 'Yes' : 'No'} />
            <Info label="Featured" value={venue.is_featured ? 'Yes' : 'No'} />
            <Info label="Address" value={venue.address} />
            <Info label="City / State" value={`${venue.city}, ${venue.state}`} />
            <Info label="Website" value={venue.website_url} />
            <Info label="Instagram" value={venue.instagram_url} />
            <Info
              label="Created"
              value={venue.created_at ? new Date(venue.created_at).toLocaleString() : '—'}
            />
            <Info
              label="Updated"
              value={venue.updated_at ? new Date(venue.updated_at).toLocaleString() : '—'}
            />
          </Grid>

          <Block label="Description" value={venue.description} />
          <Block label="Special Message" value={venue.special_message} />
        </Panel>

        <Panel title="Admin Venue Controls">
          <form action={updateVenueAdminState} className="grid gap-6 lg:grid-cols-2">
            <input type="hidden" name="venue_id" value={venue.id} />

            <div>
              <label htmlFor="status" className="mb-2 block text-sm font-medium text-white">
                Venue Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={venue.status || 'draft'}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              >
                <option value="draft">draft</option>
                <option value="pending_payment">pending_payment</option>
                <option value="active">active</option>
                <option value="hidden">hidden</option>
                <option value="suspended">suspended</option>
                <option value="removed">removed</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <div className="grid gap-4">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
                <input
                  type="checkbox"
                  name="is_visible"
                  value="yes"
                  defaultChecked={venue.is_visible || false}
                  className="h-4 w-4"
                />
                <span>Publicly visible</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
                <input
                  type="checkbox"
                  name="is_featured"
                  value="yes"
                  defaultChecked={venue.is_featured || false}
                  className="h-4 w-4"
                />
                <span>Featured venue</span>
              </label>
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
              >
                Save Venue State
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Removal / Refund Request">
          <Grid>
            <Info
              label="Removal Requested At"
              value={
                venue.removal_requested_at
                  ? new Date(venue.removal_requested_at).toLocaleString()
                  : '—'
              }
            />
            <Info label="Refund Requested" value={venue.refund_requested ? 'Yes' : 'No'} />
            <Info label="Refund Decision" value={venue.refund_decision} />
            <Info
              label="Removed At"
              value={venue.removed_at ? new Date(venue.removed_at).toLocaleString() : '—'}
            />
          </Grid>

          <Block label="Removal Reason" value={venue.removal_reason} />

          <div className="mt-6 flex flex-wrap gap-3">
            <form action={resolveVenueRemovalRequest}>
              <input type="hidden" name="venue_id" value={venue.id} />
              <input type="hidden" name="action_type" value="approve_remove" />
              <input
                type="hidden"
                name="refund_decision"
                value={venue.refund_requested ? 'approved' : 'not_applicable'}
              />
              <button
                type="submit"
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-300 hover:border-red-500/40"
              >
                Approve Removal
              </button>
            </form>

            <form action={resolveVenueRemovalRequest}>
              <input type="hidden" name="venue_id" value={venue.id} />
              <input type="hidden" name="action_type" value="deny_remove" />
              <input type="hidden" name="refund_decision" value="denied" />
              <button
                type="submit"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
              >
                Deny Removal
              </button>
            </form>
          </div>
        </Panel>

        <Panel title="Operating Hours">
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
            <p className="text-white/70">No operating hours set.</p>
          )}
        </Panel>

        <Panel title="Feature Profile">
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
            <Info label="Drink Menu Enabled" value={featureProfile?.drink_menu_enabled ? 'Yes' : 'No'} />
            <Info label="RSVP Enabled" value={featureProfile?.rsvp_enabled ? 'Yes' : 'No'} />
            <Info label="Table Service Enabled" value={featureProfile?.table_service_enabled ? 'Yes' : 'No'} />
            <Info label="Linkd'N Mode" value={featureProfile?.linkdn_mode} />
          </Grid>

          <Block label="Drink Menu Notes" value={featureProfile?.drink_menu_notes} />
          <Block label="General Info" value={featureProfile?.general_info} />
        </Panel>

        <Panel title="Interaction Settings">
          <Grid>
            <Info label="Comments Enabled" value={interactionSettings?.comments_enabled ? 'Yes' : 'No'} />
            <Info label="Comment Retention" value={interactionSettings?.comment_retention_hours ? `${interactionSettings.comment_retention_hours} hours` : '—'} />
            <Info label="Comments Require Presence" value={interactionSettings?.comments_require_presence ? 'Yes' : 'No'} />
            <Info label="Auto Filter Enabled" value={interactionSettings?.comments_auto_filter_enabled ? 'Yes' : 'No'} />
            <Info label="Music Requests Enabled" value={interactionSettings?.music_requests_enabled ? 'Yes' : 'No'} />
            <Info label="Music Requests Require Presence" value={interactionSettings?.music_requests_require_presence ? 'Yes' : 'No'} />
          </Grid>
        </Panel>

        <Panel title="Admin Interaction Overrides">
          <form action={updateVenueInteractionOverrides} className="grid gap-6 lg:grid-cols-2">
            <input type="hidden" name="venue_id" value={venue.id} />

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input
                type="checkbox"
                name="comments_enabled"
                value="yes"
                defaultChecked={interactionSettings?.comments_enabled || false}
                className="h-4 w-4"
              />
              <span>Comments enabled</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input
                type="checkbox"
                name="music_requests_enabled"
                value="yes"
                defaultChecked={interactionSettings?.music_requests_enabled || false}
                className="h-4 w-4"
              />
              <span>Music requests enabled</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input
                type="checkbox"
                name="comments_require_presence"
                value="yes"
                defaultChecked={interactionSettings?.comments_require_presence || false}
                className="h-4 w-4"
              />
              <span>Comments require presence</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input
                type="checkbox"
                name="music_requests_require_presence"
                value="yes"
                defaultChecked={interactionSettings?.music_requests_require_presence || false}
                className="h-4 w-4"
              />
              <span>Music requests require presence</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white lg:col-span-2">
              <input
                type="checkbox"
                name="comments_auto_filter_enabled"
                value="yes"
                defaultChecked={
                  interactionSettings?.comments_auto_filter_enabled === false ? false : true
                }
                className="h-4 w-4"
              />
              <span>Auto-filter comments</span>
            </label>

            <div className="lg:col-span-2">
              <label
                htmlFor="comment_retention_hours"
                className="mb-2 block text-sm font-medium text-white"
              >
                Comment retention
              </label>
              <select
                id="comment_retention_hours"
                name="comment_retention_hours"
                defaultValue={String(interactionSettings?.comment_retention_hours || 24)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              >
                <option value="1">1 hour</option>
                <option value="4">4 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="72">72 hours</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
              >
                Save Interaction Overrides
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Subscription + Plan">
          <Grid>
            <Info label="Plan" value={plan?.name} />
            <Info label="Tier" value={plan?.tier} />
            <Info label="Duration" value={plan ? `${plan.duration_months} months` : '—'} />
            <Info label="Billing Mode" value={subscription?.billing_mode} />
            <Info label="Subscription Status" value={subscription?.subscription_status} />
            <Info label="Lock-In" value={subscription?.lock_in ? 'Yes' : 'No'} />
            <Info label="Monthly Price" value={money(subscription?.monthly_price)} />
            <Info label="Prepaid Total" value={money(subscription?.prepaid_total)} />
            <Info label="Current Period Price" value={money(subscription?.current_period_price)} />
            <Info label="Next Billing Amount" value={money(subscription?.next_billing_amount)} />
            <Info label="Subscription Active" value={subscription?.is_active ? 'Yes' : 'No'} />
            <Info label="Activated At" value={subscription?.activated_at ? new Date(subscription.activated_at).toLocaleString() : '—'} />
          </Grid>

          <Block label="Admin Notes" value={subscription?.admin_notes} />
        </Panel>

        {subscription && (
          <Panel title="Admin Subscription Controls">
            <form action={updateVenueSubscriptionAdmin} className="grid gap-6 lg:grid-cols-2">
              <input type="hidden" name="venue_id" value={venue.id} />
              <input type="hidden" name="subscription_id" value={subscription.id} />

              <div>
                <label
                  htmlFor="subscription_status"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Subscription Status
                </label>
                <select
                  id="subscription_status"
                  name="subscription_status"
                  defaultValue={subscription.subscription_status || 'draft'}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                >
                  <option value="draft">draft</option>
                  <option value="pending_payment">pending_payment</option>
                  <option value="active">active</option>
                  <option value="past_due">past_due</option>
                  <option value="canceled">canceled</option>
                  <option value="expired">expired</option>
                  <option value="refunded">refunded</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="billing_mode"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Billing Mode
                </label>
                <select
                  id="billing_mode"
                  name="billing_mode"
                  defaultValue={subscription.billing_mode || 'monthly'}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                >
                  <option value="monthly">monthly</option>
                  <option value="prepaid">prepaid</option>
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
                <input
                  type="checkbox"
                  name="lock_in"
                  value="yes"
                  defaultChecked={subscription.lock_in || false}
                  className="h-4 w-4"
                />
                <span>Lock-in</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
                <input
                  type="checkbox"
                  name="is_active"
                  value="yes"
                  defaultChecked={subscription.is_active || false}
                  className="h-4 w-4"
                />
                <span>Subscription active</span>
              </label>

              <div className="lg:col-span-2">
                <label
                  htmlFor="admin_notes"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Admin Notes
                </label>
                <textarea
                  id="admin_notes"
                  name="admin_notes"
                  rows={4}
                  defaultValue={subscription.admin_notes || ''}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
                >
                  Save Subscription Controls
                </button>
              </div>
            </form>
          </Panel>
        )}

        <Panel title="Subscription Features + Usage">
          <Grid>
            <Info label="Comments Feature" value={subscriptionFeatures?.comments_enabled ? 'Yes' : 'No'} />
            <Info label="DJ Requests Feature" value={subscriptionFeatures?.dj_requests_enabled ? 'Yes' : 'No'} />
            <Info label="Linkd'N" value={subscriptionFeatures?.linkdn_mode} />
            <Info label="Drink Menu Feature" value={subscriptionFeatures?.drink_menu_enabled ? 'Yes' : 'No'} />
            <Info label="RSVP Feature" value={subscriptionFeatures?.rsvp_enabled ? 'Yes' : 'No'} />
            <Info label="Table Service Feature" value={subscriptionFeatures?.table_service_enabled ? 'Yes' : 'No'} />
            <Info label="Music Profile Visible" value={subscriptionFeatures?.music_profile_enabled ? 'Yes' : 'No'} />
            <Info label="Dress Code Visible" value={subscriptionFeatures?.dress_code_enabled ? 'Yes' : 'No'} />
            <Info label="Special Message Visible" value={subscriptionFeatures?.special_message_enabled ? 'Yes' : 'No'} />
            <Info label="Included Event Posts" value={String(usage?.included_event_posts ?? 0)} />
            <Info label="Used Event Posts" value={String(usage?.used_event_posts ?? 0)} />
          </Grid>
        </Panel>

        <Panel title="Presence Sessions">
          {presenceSessions?.length ? (
            <div className="space-y-3">
              {presenceSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-white">
                    <span className="font-semibold">Code:</span> {session.session_code}
                  </p>
                  <p className="mt-1 text-sm text-white/60">Status: {session.status}</p>
                  <p className="mt-1 text-sm text-white/60">
                    Starts: {session.starts_at ? new Date(session.starts_at).toLocaleString() : '—'}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    Ends: {session.ends_at ? new Date(session.ends_at).toLocaleString() : '—'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70">No presence sessions yet.</p>
          )}
        </Panel>

        <Panel title="Recent Comments">
          {comments?.length ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-white">{comment.comment_text}</p>
                  <p className="mt-2 text-sm text-white/60">
                    Status: {comment.status} · Flags: {comment.flag_count || 0}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70">No comments yet.</p>
          )}
        </Panel>

        <Panel title="Recent Music Requests">
          {musicRequests?.length ? (
            <div className="space-y-3">
              {musicRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-semibold text-white">{request.song_title}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {request.artist_name || 'Unknown artist'}
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    Status: {request.status} · Score: {request.vote_score || 0} · Flags: {request.flag_count || 0}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70">No music requests yet.</p>
          )}
        </Panel>

        <Panel title="Admin Shortcuts">
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/venues/${venue.id}/edit`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Open Venue Manager
            </Link>
            <Link
              href={`/dashboard/venues/${venue.id}/interactions`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Manage Interactions
            </Link>
            <Link
              href={`/dashboard/venues/${venue.id}/music-requests`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Open Music Queue
            </Link>
            <Link
              href={`/dashboard/venues/${venue.id}/moderation`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Open Moderation Queue
            </Link>
            <Link
              href={`/dashboard/venues/${venue.id}/presence`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Manage Presence
            </Link>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
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
      <p className="mt-2 text-sm text-white break-words">{value || '—'}</p>
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

function money(value: number | string | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}