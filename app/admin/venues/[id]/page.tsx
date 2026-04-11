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