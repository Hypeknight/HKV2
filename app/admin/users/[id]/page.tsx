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

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !profile) notFound();

  const [{ data: events }, { data: ambassadorProfile }, { data: applications }, { data: coupons }] =
    await Promise.all([
      supabase
        .from('events')
        .select('id, name, status, is_public, event_start_at, created_at')
        .eq('owner_id', id)
        .order('created_at', { ascending: false })
        .limit(20),

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
        .limit(5),

      supabase
        .from('ambassador_coupon_requests')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/admin/users" className="text-sm text-white/60 hover:text-accent">
        ← Back to Users
      </Link>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          User Detail
        </p>

        <h1 className="mt-3 text-4xl font-black text-white">
          {profile.display_name || profile.username || 'Unnamed User'}
        </h1>

        <p className="mt-3 break-all text-white/45">{profile.id}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip label={profile.account_status || 'active'} />
          <Chip label={profile.moderation_status || 'clear'} />
          {profile.is_disabled ? <Chip label="disabled" /> : null}
          {profile.app_role ? <Chip label={profile.app_role} /> : null}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="Username" value={profile.username} />
          <Info label="Display Name" value={profile.display_name} />
          <Info label="City" value={[profile.city, profile.state].filter(Boolean).join(', ')} />
          <Info label="Created" value={formatDate(profile.created_at)} />
          <Info label="Phone" value={profile.phone} />
          <Info label="Disabled At" value={formatDate(profile.disabled_at)} />
          <Info label="Flagged At" value={formatDate(profile.flagged_at)} />
          <Info label="Deleted At" value={formatDate(profile.deleted_by_admin_at)} />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Moderation Actions</h2>

          <div className="mt-6 grid gap-4">
            <ModerationForm userId={profile.id} action="flag" label="Flag Account" tone="yellow" />
            <ModerationForm userId={profile.id} action="suspected_spam" label="Mark Suspected Spam + Disable" tone="yellow" />
            <ModerationForm userId={profile.id} action="pause" label="Pause Account" tone="yellow" />
            <ModerationForm userId={profile.id} action="suspend" label="Suspend Account" tone="red" />
            <ModerationForm userId={profile.id} action="ban" label="Ban Account" tone="red" />
            <ModerationForm userId={profile.id} action="soft_delete" label="Soft Delete Profile" tone="red" />
            <ModerationForm userId={profile.id} action="reactivate" label="Reactivate Account" tone="green" />
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Admin Notes</h2>

          <form action={updateUserAdminNotes} className="mt-6 space-y-4">
            <input type="hidden" name="user_id" value={profile.id} />
            <textarea
              name="admin_notes"
              rows={10}
              defaultValue={profile.admin_notes || ''}
              placeholder="Internal notes about this user..."
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
            <button className="w-full rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90">
              Save Notes
            </button>
          </form>

          {profile.flagged_reason ? (
            <Notice title="Flagged Reason" text={profile.flagged_reason} />
          ) : null}

          {profile.disabled_reason ? (
            <Notice title="Disabled Reason" text={profile.disabled_reason} />
          ) : null}
        </section>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Panel title="User Events">
          {events?.length ? (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{event.name}</h3>
                    <Chip label={event.status || 'unknown'} />
                    <Chip label={event.is_public ? 'public' : 'hidden'} />
                  </div>
                  <p className="mt-2 text-white/50">{formatDate(event.event_start_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No events found for this user." />
          )}
        </Panel>

        <Panel title="Ambassador Profile">
          {ambassadorProfile ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-white">Ambassador</h3>
                <Chip label={ambassadorProfile.status || 'unknown'} />
              </div>
              <p className="mt-3 text-white/60">
                Commission: {ambassadorProfile.commission_rate || 0}%
              </p>
            </div>
          ) : (
            <Empty text="No ambassador profile found." />
          )}
        </Panel>

        <Panel title="Ambassador Applications">
          {applications?.length ? (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {app.first_name} {app.last_name}
                    </h3>
                    <Chip label={app.status || 'unknown'} />
                  </div>
                  <p className="mt-2 text-white/50">{formatDate(app.submitted_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No ambassador applications found." />
          )}
        </Panel>

        <Panel title="Coupon Requests">
          {coupons?.length ? (
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {coupon.requested_code}
                    </h3>
                    <Chip label={coupon.status || 'unknown'} />
                  </div>
                  <p className="mt-2 text-white/50">
                    {coupon.discount_percent}% off • Limit {coupon.usage_limit}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No coupon requests found." />
          )}
        </Panel>
      </section>
    </section>
  );
}

function ModerationForm({
  userId,
  action,
  label,
  tone,
}: {
  userId: string;
  action: string;
  label: string;
  tone: 'yellow' | 'red' | 'green';
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
        rows={2}
        placeholder="Reason / notes"
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
      <button className={`w-full rounded-2xl border px-4 py-3 ${toneClass}`}>
        {label}
      </button>
    </form>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-yellow-100/85">
      <p className="text-xs uppercase tracking-[0.25em] text-yellow-200/70">{title}</p>
      <p className="mt-2">{text}</p>
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