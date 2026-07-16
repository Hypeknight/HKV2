/*
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateUserRole } from '../actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
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

  const adminSupabase = createAdminClient();

  const [
    { data: profile, error: profileError },
    { data: authUser },
    { data: preferences },
    { data: events },
    { data: venues },
    { data: ambassadorApplication },
    { data: ambassadorProfile },
  ] = await Promise.all([
    adminSupabase.from('profiles').select('*').eq('id', id).maybeSingle(),

    adminSupabase.auth.admin.getUserById(id),

    adminSupabase
      .from('user_event_preferences')
      .select('*')
      .eq('user_id', id)
      .maybeSingle(),

    adminSupabase
      .from('events')
      .select('*')
      .eq('owner_id', id)
      .order('created_at', { ascending: false }),

    adminSupabase
      .from('venues')
      .select('*')
      .eq('owner_id', id)
      .order('created_at', { ascending: false }),

    adminSupabase
      .from('ambassador_applications')
      .select('*')
      .eq('user_id', id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    adminSupabase
      .from('ambassador_profiles')
      .select('*')
      .eq('user_id', id)
      .maybeSingle(),
  ]);

  if (profileError || !profile) notFound();

  const ambassadorId = ambassadorProfile?.id;

  const [{ data: couponRequests }, { data: commissions }] = ambassadorId
    ? await Promise.all([
        adminSupabase
          .from('ambassador_coupon_requests')
          .select('*')
          .eq('ambassador_id', ambassadorId)
          .order('created_at', { ascending: false }),

        adminSupabase
          .from('ambassador_commissions')
          .select('*')
          .eq('ambassador_id', ambassadorId)
          .order('created_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const eventRows = events ?? [];
  const venueRows = venues ?? [];
  const couponRows = couponRequests ?? [];
  const commissionRows = commissions ?? [];

  const paidEvents = eventRows.filter(
    (event) => event.is_paid || event.payment_status === 'paid'
  );

  const activeEvents = eventRows.filter((event) =>
    ['scheduled', 'active'].includes(event.status)
  );

  const generatedSales = commissionRows.reduce(
    (sum, row) => sum + Number(row.net_paid_amount || 0),
    0
  );

  const commissionTotal = commissionRows.reduce(
    (sum, row) => sum + Number(row.commission_amount || 0),
    0
  );

  const isSelf = user.id === id;

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/admin/users" className="text-sm text-white/60 hover:text-accent">
        ← Back to Users
      </Link>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">
              User Profile
            </p>

            <h1 className="mt-3 text-4xl font-bold text-white">
              {profile.display_name || authUser?.user?.email || 'Unnamed User'}
            </h1>

            <p className="mt-3 break-all text-white/50">User ID: {profile.id}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip label={`Role: ${profile.app_role || 'user'}`} />
              {ambassadorProfile ? (
                <Chip label={`Ambassador: ${ambassadorProfile.status}`} />
              ) : null}
              {ambassadorApplication ? (
                <Chip label={`Application: ${ambassadorApplication.status}`} />
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Events" value={String(eventRows.length)} />
              <Metric label="Paid Events" value={String(paidEvents.length)} />
              <Metric label="Active Events" value={String(activeEvents.length)} />
              <Metric label="Venues" value={String(venueRows.length)} />
            </div>
          </div>

          <form action={updateUserRole} className="space-y-3">
            <input type="hidden" name="user_id" value={profile.id} />

            <select
              name="app_role"
              defaultValue={profile.app_role || 'user'}
              disabled={isSelf}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none disabled:opacity-50"
            >
              <option value="user">User</option>
              <option value="venue_owner">Venue Owner</option>
              <option value="ambassador">Ambassador</option>
              <option value="dj">DJ</option>
              <option value="admin">Admin</option>
            </select>

            <button
              type="submit"
              disabled={isSelf}
              className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSelf ? 'Cannot Edit Self' : 'Update Role'}
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Contact & Profile Information">
          <InfoList
            items={[
              ['Email', authUser?.user?.email || profile.email],
              ['Phone', profile.phone],
              ['Display Name', profile.display_name],
              ['Username', profile.username],
              ['City', profile.city],
              ['State', profile.state],
              ['Role', profile.app_role],
              ['Created', formatDate(profile.created_at)],
              ['Updated', formatDate(profile.updated_at)],
            ]}
          />
        </Panel>

        <Panel title="Event Preferences">
          {preferences ? (
            <InfoList
              items={[
                ['Preferred City', preferences.preferred_city],
                ['Preferred State', preferences.preferred_state],
                [
                  'Max Distance',
                  preferences.max_distance_miles
                    ? `${preferences.max_distance_miles} miles`
                    : null,
                ],
                ['Music Genres', joinArray(preferences.music_genres)],
                ['Event Types', joinArray(preferences.event_types)],
                ['Vibe Tags', joinArray(preferences.vibe_tags)],
                ['Preferred Sources', joinArray(preferences.preferred_sources)],
                [
                  'Onboarding',
                  preferences.onboarding_completed ? 'Complete' : 'Incomplete',
                ],
              ]}
            />
          ) : (
            <Empty text="This user has not created event preferences yet." />
          )}
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Ambassador Application">
          {ambassadorApplication ? (
            <InfoList
              items={[
                [
                  'Legal Name',
                  `${ambassadorApplication.first_name || ''} ${
                    ambassadorApplication.last_name || ''
                  }`,
                ],
                ['Application Status', ambassadorApplication.status],
                ['Email', ambassadorApplication.email],
                ['Phone', ambassadorApplication.phone],
                ['Platform Username', ambassadorApplication.platform_username],
                ['City', ambassadorApplication.city],
                ['State', ambassadorApplication.state],
                ['Instagram', ambassadorApplication.instagram_url],
                ['Facebook', ambassadorApplication.facebook_url],
                ['TikTok', ambassadorApplication.tiktok_url],
                ['YouTube', ambassadorApplication.youtube_url],
                ['Website', ambassadorApplication.website_url],
                [
                  'Estimated Followers',
                  ambassadorApplication.estimated_followers
                    ? String(ambassadorApplication.estimated_followers)
                    : null,
                ],
                ['Promotion Plan', ambassadorApplication.promotion_plan],
                ['Admin Notes', ambassadorApplication.admin_notes],
                ['Submitted', formatDate(ambassadorApplication.submitted_at)],
                ['Reviewed', formatDate(ambassadorApplication.reviewed_at)],
              ]}
            />
          ) : (
            <Empty text="This user has not submitted an ambassador application." />
          )}
        </Panel>

        <Panel title="Ambassador Profile">
          {ambassadorProfile ? (
            <InfoList
              items={[
                ['Status', ambassadorProfile.status],
                [
                  'Commission Rate',
                  ambassadorProfile.commission_rate
                    ? `${ambassadorProfile.commission_rate}%`
                    : null,
                ],
                [
                  'Total Sales',
                  `$${Number(ambassadorProfile.total_sales || 0).toFixed(2)}`,
                ],
                [
                  'Total Commission',
                  `$${Number(ambassadorProfile.total_commission || 0).toFixed(2)}`,
                ],
                [
                  'Total Paid',
                  `$${Number(ambassadorProfile.total_paid || 0).toFixed(2)}`,
                ],
                ['Approved', formatDate(ambassadorProfile.approved_at)],
                ['Suspended', formatDate(ambassadorProfile.suspended_at)],
                ['Removed', formatDate(ambassadorProfile.removed_at)],
              ]}
            />
          ) : (
            <Empty text="This user does not have an active ambassador profile record." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Coupon Requests" value={String(couponRows.length)} />
        <Metric label="Generated Sales" value={`$${generatedSales.toFixed(2)}`} />
        <Metric label="Commission Total" value={`$${commissionTotal.toFixed(2)}`} />
        <Metric label="Commission Rows" value={String(commissionRows.length)} />
      </section>

      <Panel title="Ambassador Coupons">
        {couponRows.length ? (
          <div className="space-y-4">
            {couponRows.map((coupon) => (
              <div key={coupon.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-white">
                    {coupon.requested_code}
                  </h3>
                  <Chip label={coupon.status} />
                </div>

                <p className="mt-2 text-white/60">
                  {coupon.discount_percent}% off • Limit {coupon.usage_limit}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  Created coupon ID: {coupon.created_coupon_id || '—'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No ambassador coupon requests yet." />
        )}
      </Panel>

      <Panel title="Posted Events">
        {eventRows.length ? (
          <div className="space-y-4">
            {eventRows.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Empty text="This user has not posted events yet." />
        )}
      </Panel>

      <Panel title="Venues">
        {venueRows.length ? (
          <div className="space-y-4">
            {venueRows.map((venue) => (
              <div key={venue.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <h3 className="text-xl font-bold text-white">
                  {venue.name || 'Unnamed Venue'}
                </h3>
                <p className="mt-2 text-white/60">
                  {[venue.city, venue.state].filter(Boolean).join(', ') || 'No location'}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Status: {venue.status || 'unknown'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="This user has no venue records." />
        )}
      </Panel>

      <Panel title="Commission Activity">
        {commissionRows.length ? (
          <div className="space-y-4">
            {commissionRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{row.coupon_code}</h3>
                  <Chip label={row.status} />
                </div>
                <p className="mt-2 text-white/60">
                  Net paid: ${Number(row.net_paid_amount || 0).toFixed(2)} •
                  Commission: ${Number(row.commission_amount || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No commission activity yet." />
        )}
      </Panel>
    </section>
  );
}

function EventRow({ event }: { event: any }) {
  const amount = Number(
    event.payment_amount ?? event.discounted_total ?? event.total_price ?? 0
  );

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white">{event.name}</h3>
            <Chip label={event.status || 'unknown'} />
            <Chip label={event.payment_status || 'pending'} />
          </div>

          <p className="mt-2 text-white/60">
            {event.venue_name || 'No venue'} •{' '}
            {[event.city, event.state].filter(Boolean).join(', ') || 'No location'}
          </p>

          <p className="mt-1 text-white/50">
            Starts: {formatDate(event.event_start_at)} • Amount: ${amount.toFixed(2)}
            {event.coupon_code ? ` • Coupon: ${event.coupon_code}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {event.slug ? (
            <Link
              href={`/events/${event.slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:border-accent/40"
            >
              Public Page
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoList({
  items,
}: {
  items: Array<[string, string | null | undefined]>;
}) {
  const visible = items.filter(([, value]) => value && String(value).trim());

  if (!visible.length) return <Empty text="No details available." />;

  return (
    <div className="space-y-4">
      {visible.map(([label, value]) => (
        <div key={label} className="border-b border-white/10 pb-4 last:border-0">
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">
            {label}
          </p>
          <p className="mt-2 break-words text-white/75">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/65">
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
      {text}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function joinArray(value?: string[] | null) {
  if (!value?.length) return null;
  return value.join(', ');
}
  */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  updateUserModeration,
  updateUserAdminNotes,
} from '../actions';
import { getAdminActivity } from '@/lib/admin/activity';
import AdminActivityFeed from '@/components/admin/AdminActivityFeed';

type Props = {
  params: Promise<{ id: string }>;
};

type OwnedEvent = {
  id: string;
  name: string | null;
  status: string | null;
  is_public: boolean | null;
  event_start_at: string | null;
  created_at: string | null;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user) redirect('/auth/login');

  const { data: adminProfile, error: adminError } = await supabase
    .from('profiles')
    .select('app_role, display_name')
    .eq('id', user.id)
    .single();

  if (adminError) throw new Error(adminError.message);
  if (adminProfile?.app_role !== 'admin') redirect('/dashboard');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (profileError || !profile) notFound();

  const [
    { data: events, error: eventsError },
    { data: ambassadorProfile, error: ambassadorError },
    { data: applications, error: applicationsError },
    { data: coupons, error: couponsError },
    userActivity,
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, name, status, is_public, event_start_at, created_at')
      .eq('owner_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('ambassador_profiles')
      .select('*')
      .eq('user_id', id)
      .maybeSingle(),
    supabase
      .from('ambassador_applications')
      .select('*')
      .eq('user_id', id)
      .order('submitted_at', { ascending: false })
      .limit(10),
    supabase
      .from('ambassador_coupon_requests')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    getAdminActivity(supabase, {
      entityType: 'user',
      search: id,
      page: 1,
      pageSize: 12,
    }),
  ]);

  const relatedErrors = [
    eventsError,
    ambassadorError,
    applicationsError,
    couponsError,
  ].filter(Boolean);

  if (relatedErrors.length) {
    throw new Error(
      relatedErrors
        .map((error) => error?.message)
        .filter(Boolean)
        .join(' | ')
    );
  }

  const ownedEvents = (events || []) as OwnedEvent[];
  const eventSummary = summarizeEvents(ownedEvents);
  const riskScore = calculateRiskScore(profile);
  const accountHealth = getAccountHealth(riskScore);
  const isCurrentAdmin = profile.id === user.id;

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/users" className="text-sm font-semibold text-white/60 hover:text-accent">
          ← Back to Users
        </Link>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/activity?entity_type=user&q=${encodeURIComponent(profile.id)}`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            Full User Activity
          </Link>

          {eventSummary.total ? (
            <Link
              href={`/admin/events?q=${encodeURIComponent(profile.id)}`}
              className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
            >
              Owned Events
            </Link>
          ) : null}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 sm:rounded-[3rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="p-5 sm:p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">User Command Center</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">{getUserName(profile)}</h1>
            <p className="mt-3 break-all text-sm text-white/40">{profile.id}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <AccountStatusBadge status={profile.account_status || 'active'} disabled={Boolean(profile.is_disabled)} />
              <ModerationBadge status={profile.moderation_status || 'clear'} />
              <RoleBadge role={profile.app_role || 'user'} />
              <HealthBadge label={accountHealth.label} tone={accountHealth.tone} />
              {isCurrentAdmin ? <Chip label="Current Admin Account" /> : null}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Info label="Username" value={profile.username} />
              <Info label="Email" value={profile.email} />
              <Info label="Location" value={[profile.city, profile.state].filter(Boolean).join(', ') || 'Not listed'} />
              <Info label="Phone" value={profile.phone} />
              <Info label="Created" value={formatDate(profile.created_at)} />
              <Info label="Updated" value={formatDate(profile.updated_at)} />
              <Info label="Flagged" value={formatDate(profile.flagged_at)} />
              <Info label="Disabled" value={formatDate(profile.disabled_at)} />
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/25 p-5 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Account Health</p>
            <p className="mt-3 text-6xl font-black text-white">{riskScore}</p>
            <p className="mt-2 text-sm font-semibold text-white/70">Risk score</p>
            <p className="mt-4 text-sm leading-6 text-white/55">
              Calculated from account status, moderation state, disabled access, and recorded moderation reasons.
            </p>

            <div className="mt-6 space-y-3">
              <CompactStat label="Owned Events" value={eventSummary.total} />
              <CompactStat label="Public Events" value={eventSummary.public} />
              <CompactStat label="Pending Review" value={eventSummary.pending} />
              <CompactStat label="Rejected Events" value={eventSummary.rejected} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Total Events" value={eventSummary.total} text="All events owned by this account." />
        <Metric label="Public" value={eventSummary.public} text="Events currently public." tone="green" />
        <Metric label="Pending" value={eventSummary.pending} text="Events waiting for review." tone={eventSummary.pending ? 'yellow' : 'neutral'} />
        <Metric label="Rejected" value={eventSummary.rejected} text="Events returned or rejected." tone={eventSummary.rejected ? 'red' : 'neutral'} />
        <Metric label="Applications" value={applications?.length || 0} text="Ambassador applications." />
        <Metric label="Coupon Requests" value={coupons?.length || 0} text="Ambassador coupon requests." />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1fr_420px]">
        <main className="space-y-8">
          <Panel title="Administrative Activity" eyebrow="User History">
            <AdminActivityFeed items={userActivity.items} />
            <Link
              href={`/admin/activity?entity_type=user&q=${encodeURIComponent(profile.id)}`}
              className="mt-5 inline-flex text-sm font-semibold text-accent hover:underline"
            >
              View complete activity history →
            </Link>
          </Panel>

          <Panel title="Owned Events" eyebrow="Event Relationships">
            {ownedEvents.length ? (
              <div className="space-y-4">
                {ownedEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-accent/40 hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-white">{event.name || 'Untitled Event'}</h3>
                      <Chip label={event.status || 'unknown'} />
                      <Chip label={event.is_public ? 'public' : 'hidden'} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Info label="Event Date" value={formatDate(event.event_start_at)} />
                      <Info label="Created" value={formatDate(event.created_at)} />
                      <Info label="Event ID" value={event.id} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty text="No events found for this user." />
            )}
          </Panel>

          <Panel title="Ambassador Relationships" eyebrow="Programs">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-black text-white">Ambassador Profile</h3>
                <div className="mt-4">
                  {ambassadorProfile ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xl font-black text-white">Ambassador</h4>
                        <Chip label={ambassadorProfile.status || 'unknown'} />
                      </div>
                      <p className="mt-3 text-white/60">Commission: {ambassadorProfile.commission_rate || 0}%</p>
                    </div>
                  ) : (
                    <Empty text="No ambassador profile found." />
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Applications</h3>
                <div className="mt-4 space-y-4">
                  {applications?.length ? (
                    applications.map((application) => (
                      <div key={application.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-white">
                            {[application.first_name, application.last_name].filter(Boolean).join(' ') || 'Application'}
                          </h4>
                          <Chip label={application.status || 'unknown'} />
                        </div>
                        <p className="mt-2 text-sm text-white/45">{formatDate(application.submitted_at)}</p>
                      </div>
                    ))
                  ) : (
                    <Empty text="No ambassador applications found." />
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Coupon Requests" eyebrow="Ambassador Commerce">
            {coupons?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-white">{coupon.requested_code || 'Requested Code'}</h3>
                      <Chip label={coupon.status || 'unknown'} />
                    </div>
                    <p className="mt-3 text-sm text-white/55">{coupon.discount_percent || 0}% off · Limit {coupon.usage_limit || 0}</p>
                    <p className="mt-2 text-xs text-white/35">Requested {formatDate(coupon.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No coupon requests found." />
            )}
          </Panel>
        </main>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Panel title="Account Actions" eyebrow="Moderation Controls">
            {isCurrentAdmin ? (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                <p className="font-semibold text-yellow-100">Self-moderation is disabled.</p>
                <p className="mt-2 text-sm leading-6 text-yellow-100/65">
                  You cannot suspend, ban, disable, or delete the administrator account currently performing these actions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <ModerationForm userId={profile.id} action="flag" label="Flag Account" tone="yellow" />
                <ModerationForm userId={profile.id} action="suspected_spam" label="Mark Suspected Spam + Disable" tone="yellow" />
                <ModerationForm userId={profile.id} action="pause" label="Pause Account" tone="yellow" />
                <ModerationForm userId={profile.id} action="suspend" label="Suspend Account" tone="red" requireReason />
                <ModerationForm userId={profile.id} action="ban" label="Ban Account" tone="red" requireReason />
                <ModerationForm userId={profile.id} action="soft_delete" label="Soft Delete Profile" tone="red" requireReason />
                <ModerationForm userId={profile.id} action="reactivate" label="Reactivate Account" tone="green" />
              </div>
            )}
          </Panel>

          <Panel title="Internal Notes" eyebrow="Administrator Only">
            <form action={updateUserAdminNotes} className="space-y-4">
              <input type="hidden" name="user_id" value={profile.id} />
              <textarea
                name="admin_notes"
                rows={10}
                defaultValue={profile.admin_notes || ''}
                placeholder="Internal notes about this user..."
                className={fieldClass}
              />
              <button className="w-full rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90">
                Save Notes
              </button>
            </form>

            {profile.flagged_reason ? <Notice title="Flagged Reason" text={profile.flagged_reason} /> : null}
            {profile.disabled_reason ? <Notice title="Disabled Reason" text={profile.disabled_reason} /> : null}
          </Panel>

          <Panel title="Account Facts" eyebrow="Identifiers">
            <div className="space-y-3">
              <Info label="User ID" value={profile.id} />
              <Info label="Role" value={profile.app_role || 'user'} />
              <Info label="Account Status" value={profile.account_status || 'active'} />
              <Info label="Moderation" value={profile.moderation_status || 'clear'} />
              <Info label="Disabled At" value={formatDate(profile.disabled_at)} />
              <Info label="Deleted At" value={formatDate(profile.deleted_by_admin_at)} />
            </div>
          </Panel>
        </aside>
      </section>
    </section>
  );
}

function ModerationForm({
  userId,
  action,
  label,
  tone,
  requireReason = false,
}: {
  userId: string;
  action: string;
  label: string;
  tone: 'yellow' | 'red' | 'green';
  requireReason?: boolean;
}) {
  const toneClass =
    tone === 'green'
      ? 'border-green-500/20 bg-green-500/10 text-green-200 hover:border-green-500/40'
      : tone === 'red'
        ? 'border-red-500/20 bg-red-500/10 text-red-200 hover:border-red-500/40'
        : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200 hover:border-yellow-500/40';

  return (
    <form action={updateUserModeration} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="action" value={action} />
      <textarea
        name="reason"
        rows={3}
        required={requireReason}
        placeholder={requireReason ? 'Reason is required.' : 'Reason / notes'}
        className={fieldClass}
      />
      <button className={`w-full rounded-2xl border px-4 py-3 font-semibold ${toneClass}`}>{label}</button>
    </form>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-8">
      {eyebrow ? <p className="text-xs uppercase tracking-[0.25em] text-accent">{eyebrow}</p> : null}
      <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Metric({ label, value, text, tone = 'neutral' }: { label: string; value: number; text: string; tone?: 'neutral' | 'green' | 'yellow' | 'red' }) {
  const styles = {
    neutral: 'border-white/10 bg-white/5',
    green: 'border-green-500/20 bg-green-500/10',
    yellow: 'border-yellow-500/20 bg-yellow-500/10',
    red: 'border-red-500/20 bg-red-500/10',
  };

  return (
    <div className={`rounded-[1.75rem] border p-5 ${styles[tone]}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/50">{text}</p>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-white/55">{label}</span>
      <span className="font-black text-white">{value}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      <div className="mt-2 break-words text-white">{value || '—'}</div>
    </div>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-yellow-100/85">
      <p className="text-xs uppercase tracking-[0.25em] text-yellow-200/70">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{text}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">{text}</div>;
}

function Chip({ label }: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">{formatLabel(label)}</span>;
}

function HealthBadge({ label, tone }: { label: string; tone: 'green' | 'yellow' | 'red' }) {
  const styles = {
    green: 'border-green-500/20 bg-green-500/10 text-green-200',
    yellow: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    red: 'border-red-500/20 bg-red-500/10 text-red-200',
  };

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}>{label}</span>;
}

function AccountStatusBadge({ status, disabled }: { status: string; disabled: boolean }) {
  if (disabled) {
    return <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">Disabled</span>;
  }

  const styles: Record<string, string> = {
    active: 'border-green-500/20 bg-green-500/10 text-green-200',
    paused: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    suspended: 'border-red-500/20 bg-red-500/10 text-red-200',
    banned: 'border-red-500/20 bg-red-500/10 text-red-200',
    deleted: 'border-white/10 bg-white/5 text-white/45',
  };

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || 'border-white/10 bg-white/5 text-white/60'}`}>{formatLabel(status)}</span>;
}

function ModerationBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    clear: 'border-green-500/20 bg-green-500/10 text-green-200',
    flagged: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    suspected_spam: 'border-red-500/20 bg-red-500/10 text-red-200',
    under_review: 'border-purple-500/20 bg-purple-500/10 text-purple-200',
    restricted: 'border-red-500/20 bg-red-500/10 text-red-200',
  };

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || 'border-white/10 bg-white/5 text-white/60'}`}>{formatLabel(status)}</span>;
}

function RoleBadge({ role }: { role: string }) {
  return <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">{formatLabel(role)}</span>;
}

function summarizeEvents(events: OwnedEvent[]) {
  return {
    total: events.length,
    public: events.filter((event) => event.is_public === true).length,
    pending: events.filter((event) => ['submitted', 'paid_awaiting_approval', 'approved_unpaid', 'approved_awaiting_payment', 'revision_submitted'].includes(event.status || '')).length,
    rejected: events.filter((event) => event.status === 'rejected').length,
  };
}

function calculateRiskScore(profile: any) {
  let score = 0;

  switch (profile.account_status) {
    case 'paused': score += 1; break;
    case 'suspended': score += 4; break;
    case 'banned': score += 6; break;
    case 'deleted': score += 3; break;
  }

  switch (profile.moderation_status) {
    case 'flagged': score += 3; break;
    case 'suspected_spam': score += 5; break;
    case 'under_review': score += 2; break;
    case 'restricted': score += 4; break;
  }

  if (profile.is_disabled) score += 5;
  if (profile.flagged_reason) score += 1;
  if (profile.disabled_reason) score += 1;

  return score;
}

function getAccountHealth(riskScore: number) {
  if (riskScore >= 6) return { label: 'High Risk', tone: 'red' as const };
  if (riskScore >= 3) return { label: 'Needs Review', tone: 'yellow' as const };
  return { label: 'Healthy', tone: 'green' as const };
}

function getUserName(profile: { display_name?: string | null; username?: string | null }) {
  return profile.display_name || profile.username || 'Unnamed User';
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';