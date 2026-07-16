/*
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateUserRole } from './actions';

type Props = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};
  const search = String(query.q || '').trim().toLowerCase();

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

  const [{ data: profiles, error }, { data: events }, { data: preferences }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, app_role, city, state, created_at, updated_at')
        .order('created_at', { ascending: false }),
      supabase.from('events').select('id, owner_id, status, payment_status, is_paid'),
      supabase
        .from('user_event_preferences')
        .select('user_id, preferred_city, preferred_state, onboarding_completed'),
    ]);

  if (error) throw new Error(error.message);

  const rows = profiles ?? [];
  const eventRows = events ?? [];
  const preferenceRows = preferences ?? [];

  const usersWithStats = rows
    .map((profile) => {
      const ownedEvents = eventRows.filter((event) => event.owner_id === profile.id);
      const paidEvents = ownedEvents.filter(
        (event) => event.is_paid || event.payment_status === 'paid'
      );
      const pref = preferenceRows.find((item) => item.user_id === profile.id);

      return {
        ...profile,
        eventCount: ownedEvents.length,
        paidEventCount: paidEvents.length,
        preferredCity: pref?.preferred_city,
        preferredState: pref?.preferred_state,
        onboardingCompleted: pref?.onboarding_completed === true,
      };
    })
    .filter((profile) => {
      if (!search) return true;

      const searchable = [
        profile.display_name,
        profile.app_role,
        profile.city,
        profile.state,
        profile.preferredCity,
        profile.preferredState,
        profile.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(search);
    });

  const users = rows.filter((profile) => profile.app_role === 'user');
  const venueOwners = rows.filter((profile) => profile.app_role === 'venue_owner');
  const admins = rows.filter((profile) => profile.app_role === 'admin');

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
          <h1 className="mt-3 text-4xl font-bold text-white">User Management</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Search users, review activity, open profiles, and manage role access.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Admin
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Profiles" value={String(rows.length)} />
        <Metric label="Users" value={String(users.length)} />
        <Metric label="Venue Owners" value={String(venueOwners.length)} />
        <Metric label="Admins" value={String(admins.length)} />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <form className="grid gap-3 md:grid-cols-[1fr_160px]" action="/admin/users">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search by name, role, city, state, preference, or user ID..."
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />
          <button
            type="submit"
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Search
          </button>
        </form>

        {search ? (
          <div className="mt-4">
            <Link href="/admin/users" className="text-sm text-white/55 hover:text-accent">
              Clear search
            </Link>
          </div>
        ) : null}
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Profiles</h2>

        {usersWithStats.length ? (
          <div className="mt-6 space-y-4">
            {usersWithStats.map((profile) => (
              <UserCard key={profile.id} profile={profile} currentAdminId={user.id} />
            ))}
          </div>
        ) : (
          <Empty text="No users matched your search." />
        )}
      </section>
    </section>
  );
}

function UserCard({ profile, currentAdminId }: { profile: any; currentAdminId: string }) {
  const isSelf = profile.id === currentAdminId;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <Link href={`/admin/users/${profile.id}`} className="group block">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-white group-hover:text-accent">
              {profile.display_name || 'Unnamed User'}
            </h3>
            <Chip label={profile.app_role || 'user'} />
            {isSelf ? <Chip label="You" /> : null}
          </div>

          <p className="mt-2 break-all text-sm text-white/45">User ID: {profile.id}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Events" value={String(profile.eventCount)} />
            <Info label="Paid Events" value={String(profile.paidEventCount)} />
            <Info
              label="Preferences"
              value={profile.onboardingCompleted ? 'Complete' : 'Incomplete'}
            />
            <Info
              label="Location"
              value={
                [profile.city, profile.state].filter(Boolean).join(', ') ||
                [profile.preferredCity, profile.preferredState].filter(Boolean).join(', ') ||
                '—'
              }
            />
          </div>

          <p className="mt-5 text-sm font-medium text-accent">Open profile →</p>
        </Link>

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
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
      <p className="mt-2 break-words text-white">{value}</p>
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
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
      {text}
    </div>
  );
}
  */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    moderation?: string;
    role?: string;
    sort?: string;
    page?: string;
  }>;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  app_role: string | null;
  account_status: string | null;
  moderation_status: string | null;
  flagged_reason: string | null;
  disabled_reason: string | null;
  is_disabled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type UserEventSummary = {
  total: number;
  public: number;
  rejected: number;
  pending: number;
};

const ACCOUNT_STATUSES = ['active', 'paused', 'suspended', 'banned', 'deleted'];
const MODERATION_STATUSES = ['clear', 'flagged', 'suspected_spam', 'under_review', 'restricted'];
const APP_ROLES = ['user', 'venue_owner', 'ambassador', 'employee', 'admin'];
const SORT_OPTIONS = ['newest', 'oldest', 'name', 'risk', 'events'] as const;
const PAGE_SIZE = 30;

export default async function AdminUsersPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};
  const search = clean(query.q).toLowerCase();
  const status = allowedValue(query.status, ACCOUNT_STATUSES);
  const moderation = allowedValue(query.moderation, MODERATION_STATUSES);
  const role = allowedValue(query.role, APP_ROLES);
  const sort = allowedValue(query.sort, [...SORT_OPTIONS]) || 'newest';
  const requestedPage = positiveInteger(query.page, 1);

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user) redirect('/auth/login');

  const { data: adminProfile, error: adminError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (adminError) throw new Error(adminError.message);
  if (adminProfile?.app_role !== 'admin') redirect('/dashboard');

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      username,
      email,
      city,
      state,
      app_role,
      account_status,
      moderation_status,
      flagged_reason,
      disabled_reason,
      is_disabled,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (profilesError) throw new Error(profilesError.message);

  const typedProfiles = (profiles || []) as ProfileRow[];
  const profileIds = typedProfiles.map((profile) => profile.id);
  const eventSummaryByOwner = new Map<string, UserEventSummary>();

  if (profileIds.length) {
    const { data: ownedEvents, error: eventsError } = await supabase
      .from('events')
      .select('owner_id, status, is_public')
      .in('owner_id', profileIds);

    if (eventsError) throw new Error(eventsError.message);

    for (const event of ownedEvents || []) {
      const ownerId = String(event.owner_id || '');
      if (!ownerId) continue;

      const summary = eventSummaryByOwner.get(ownerId) || {
        total: 0,
        public: 0,
        rejected: 0,
        pending: 0,
      };

      summary.total += 1;
      if (event.is_public === true) summary.public += 1;
      if (event.status === 'rejected') summary.rejected += 1;
      if ([
        'submitted',
        'paid_awaiting_approval',
        'approved_unpaid',
        'approved_awaiting_payment',
        'revision_submitted',
      ].includes(String(event.status || ''))) {
        summary.pending += 1;
      }

      eventSummaryByOwner.set(ownerId, summary);
    }
  }

  const allUsers = typedProfiles.map((profile) => ({
    ...profile,
    eventSummary: eventSummaryByOwner.get(profile.id) || {
      total: 0,
      public: 0,
      rejected: 0,
      pending: 0,
    },
    risk: calculateUserRisk(profile),
  }));

  let filteredUsers = allUsers.filter((profile) => {
    if (status && (profile.account_status || 'active') !== status) return false;
    if (moderation && (profile.moderation_status || 'clear') !== moderation) return false;
    if (role && (profile.app_role || 'user') !== role) return false;

    if (search) {
      const haystack = [
        profile.id,
        profile.display_name,
        profile.username,
        profile.email,
        profile.city,
        profile.state,
        profile.app_role,
        profile.account_status,
        profile.moderation_status,
        profile.flagged_reason,
        profile.disabled_reason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  filteredUsers = sortUsers(filteredUsers, sort);

  const total = filteredUsers.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const from = (page - 1) * PAGE_SIZE;
  const users = filteredUsers.slice(from, from + PAGE_SIZE);
  const summaries = summarizeUsers(allUsers);

  const activeFilterCount = [
    search,
    status,
    moderation,
    role,
    sort !== 'newest' ? sort : '',
  ].filter(Boolean).length;

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin" className="text-sm font-semibold text-white/60 hover:text-accent">
          ← Back to Admin
        </Link>

        <Link
          href="/admin/activity?entity_type=user"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
        >
          User Activity
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_330px] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">User Operations</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Manage platform accounts.
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Search users, inspect account health, review moderation signals, monitor event ownership, and open individual account command centers.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatusChip label={`${summaries.flagged} flagged`} tone={summaries.flagged ? 'yellow' : 'neutral'} />
              <StatusChip label={`${summaries.suspended} suspended`} tone={summaries.suspended ? 'red' : 'neutral'} />
              <StatusChip label={`${summaries.disabled} disabled`} tone={summaries.disabled ? 'red' : 'neutral'} />
              <StatusChip label={`${summaries.owners} event owners`} tone="green" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Accounts Needing Attention</p>
            <p className="mt-3 text-6xl font-black text-white">{summaries.attention}</p>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Flagged, suspected-spam, suspended, banned, or disabled accounts requiring administrative review.
            </p>
            <Link
              href="/admin/users?sort=risk"
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Review Highest Risk
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Total Accounts" value={summaries.total} text="All HypeKnight profiles." />
        <Metric label="Active" value={summaries.active} text="Accounts with normal access." />
        <Metric label="Paused" value={summaries.paused} text="Temporarily paused accounts." />
        <Metric label="Suspended" value={summaries.suspended} text="Accounts under suspension." tone={summaries.suspended ? 'red' : 'neutral'} />
        <Metric label="Flagged" value={summaries.flagged} text="Moderation attention required." tone={summaries.flagged ? 'yellow' : 'neutral'} />
        <Metric label="Disabled / Banned" value={summaries.disabled} text="Accounts unable to access the platform." tone={summaries.disabled ? 'red' : 'neutral'} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4 sm:rounded-[2.5rem] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Account Filters</p>
            <h2 className="mt-2 text-2xl font-black text-white">Find the exact account you need.</h2>
          </div>

          {activeFilterCount ? (
            <Link href="/admin/users" className="text-sm font-semibold text-white/55 hover:text-accent">
              Clear {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
            </Link>
          ) : null}
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            name="q"
            defaultValue={query.q || ''}
            placeholder="Name, username, email, city, ID, or reason..."
            className={`${fieldClass} xl:col-span-2`}
          />

          <select name="status" defaultValue={status} className={fieldClass}>
            <option value="">All Account Statuses</option>
            {ACCOUNT_STATUSES.map((value) => (
              <option key={value} value={value}>{formatLabel(value)}</option>
            ))}
          </select>

          <select name="moderation" defaultValue={moderation} className={fieldClass}>
            <option value="">All Moderation States</option>
            {MODERATION_STATUSES.map((value) => (
              <option key={value} value={value}>{formatLabel(value)}</option>
            ))}
          </select>

          <select name="role" defaultValue={role} className={fieldClass}>
            <option value="">All Roles</option>
            {APP_ROLES.map((value) => (
              <option key={value} value={value}>{formatLabel(value)}</option>
            ))}
          </select>

          <select name="sort" defaultValue={sort} className={fieldClass}>
            <option value="newest">Newest Accounts</option>
            <option value="oldest">Oldest Accounts</option>
            <option value="name">Name A–Z</option>
            <option value="risk">Highest Risk</option>
            <option value="events">Most Events</option>
          </select>

          <div className="md:col-span-2 xl:col-span-6">
            <button className="w-full rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90 sm:w-auto">
              Apply Filters
            </button>
          </div>
        </form>
      </section>

      <section>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Account Inventory</p>
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            {total} account{total === 1 ? '' : 's'}
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Page {page} of {pageCount}. Risk is calculated from account, moderation, and disabled states.
          </p>
        </div>

        {users.length ? (
          <>
            <div className="mt-6 hidden overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 lg:block">
              <div className="grid grid-cols-[1.25fr_1fr_150px_150px_150px_110px] gap-4 border-b border-white/10 bg-black/30 px-5 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/45">
                <span>Account</span>
                <span>Location / Role</span>
                <span>Status</span>
                <span>Moderation</span>
                <span>Events</span>
                <span>Action</span>
              </div>

              <div className="divide-y divide-white/10">
                {users.map((profile) => (
                  <UserTableRow key={profile.id} profile={profile} />
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-4 lg:hidden">
              {users.map((profile) => (
                <MobileUserCard key={profile.id} profile={profile} />
              ))}
            </div>

            <Pagination page={page} pageCount={pageCount} query={query} />
          </>
        ) : (
          <Empty text="No accounts match the selected filters." />
        )}
      </section>
    </section>
  );
}

function UserTableRow({ profile }: { profile: ProfileRow & { eventSummary: UserEventSummary; risk: number } }) {
  return (
    <article className="grid grid-cols-[1.25fr_1fr_150px_150px_150px_110px] gap-4 px-5 py-5 transition hover:bg-white/[0.03]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-lg font-black text-white">{getUserName(profile)}</h3>
          {profile.risk >= 3 ? <RiskBadge risk={profile.risk} /> : null}
        </div>
        <p className="mt-1 truncate text-sm text-white/50">{profile.email || profile.username || 'No contact identifier'}</p>
        <p className="mt-2 truncate text-xs text-white/30">{profile.id}</p>
      </div>

      <div className="min-w-0 text-sm">
        <p className="truncate font-semibold text-white/75">
          {[profile.city, profile.state].filter(Boolean).join(', ') || 'Location not listed'}
        </p>
        <p className="mt-1 text-white/45">{formatLabel(profile.app_role || 'user')}</p>
        <p className="mt-1 text-xs text-white/30">Joined {formatCompactDate(profile.created_at)}</p>
      </div>

      <div><AccountStatusBadge status={profile.account_status || 'active'} disabled={Boolean(profile.is_disabled)} /></div>

      <div>
        <ModerationBadge status={profile.moderation_status || 'clear'} />
        {profile.flagged_reason || profile.disabled_reason ? (
          <p className="mt-2 line-clamp-2 text-xs text-yellow-100/60">{profile.flagged_reason || profile.disabled_reason}</p>
        ) : null}
      </div>

      <div className="text-sm text-white/60">
        <p className="font-semibold text-white">{profile.eventSummary.total} total</p>
        <p className="mt-1 text-xs text-white/40">{profile.eventSummary.public} public · {profile.eventSummary.pending} pending</p>
        {profile.eventSummary.rejected ? (
          <p className="mt-1 text-xs text-red-200/70">{profile.eventSummary.rejected} rejected</p>
        ) : null}
      </div>

      <div>
        <Link href={`/admin/users/${profile.id}`} className="block rounded-xl bg-accent px-3 py-2 text-center text-sm font-semibold text-black hover:opacity-90">
          Review
        </Link>
      </div>
    </article>
  );
}

function MobileUserCard({ profile }: { profile: ProfileRow & { eventSummary: UserEventSummary; risk: number } }) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap gap-2">
        <AccountStatusBadge status={profile.account_status || 'active'} disabled={Boolean(profile.is_disabled)} />
        <ModerationBadge status={profile.moderation_status || 'clear'} />
        <RoleBadge role={profile.app_role || 'user'} />
        {profile.risk >= 3 ? <RiskBadge risk={profile.risk} /> : null}
      </div>

      <h3 className="mt-4 text-2xl font-black text-white">{getUserName(profile)}</h3>
      <p className="mt-2 break-all text-sm text-white/50">{profile.email || profile.username || profile.id}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <CompactInfo label="Location" value={[profile.city, profile.state].filter(Boolean).join(', ') || 'Not listed'} />
        <CompactInfo label="Joined" value={formatCompactDate(profile.created_at)} />
        <CompactInfo label="Events" value={String(profile.eventSummary.total)} />
        <CompactInfo label="Public Events" value={String(profile.eventSummary.public)} />
      </div>

      {profile.flagged_reason || profile.disabled_reason ? (
        <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-yellow-100">Administrative Attention</p>
          <p className="mt-2 text-sm leading-6 text-yellow-100/70">{profile.flagged_reason || profile.disabled_reason}</p>
        </div>
      ) : null}

      <Link href={`/admin/users/${profile.id}`} className="mt-5 block rounded-2xl bg-accent px-4 py-3 text-center font-semibold text-black">
        Open Account
      </Link>
    </article>
  );
}

function Metric({ label, value, text, tone = 'neutral' }: { label: string; value: number; text: string; tone?: 'neutral' | 'yellow' | 'red' }) {
  const styles = {
    neutral: 'border-white/10 bg-white/5',
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

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-2 break-words font-semibold text-white">{value}</p>
    </div>
  );
}

function AccountStatusBadge({ status, disabled }: { status: string; disabled: boolean }) {
  if (disabled) return <Badge label="Disabled" classes="border-red-500/20 bg-red-500/10 text-red-200" />;

  const styles: Record<string, string> = {
    active: 'border-green-500/20 bg-green-500/10 text-green-200',
    paused: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    suspended: 'border-red-500/20 bg-red-500/10 text-red-200',
    banned: 'border-red-500/20 bg-red-500/10 text-red-200',
    deleted: 'border-white/10 bg-white/5 text-white/45',
  };

  return <Badge label={formatLabel(status)} classes={styles[status] || 'border-white/10 bg-white/5 text-white/60'} />;
}

function ModerationBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    clear: 'border-green-500/20 bg-green-500/10 text-green-200',
    flagged: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    suspected_spam: 'border-red-500/20 bg-red-500/10 text-red-200',
    under_review: 'border-purple-500/20 bg-purple-500/10 text-purple-200',
    restricted: 'border-red-500/20 bg-red-500/10 text-red-200',
  };

  return <Badge label={formatLabel(status)} classes={styles[status] || 'border-white/10 bg-white/5 text-white/60'} />;
}

function RoleBadge({ role }: { role: string }) {
  return <Badge label={formatLabel(role)} classes="border-blue-500/20 bg-blue-500/10 text-blue-200" />;
}

function RiskBadge({ risk }: { risk: number }) {
  return (
    <Badge
      label={risk >= 6 ? 'Critical Risk' : risk >= 3 ? 'Needs Review' : 'Normal'}
      classes={risk >= 6 ? 'border-red-500/20 bg-red-500/10 text-red-200' : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'}
    />
  );
}

function Badge({ label, classes }: { label: string; classes: string }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function StatusChip({ label, tone }: { label: string; tone: 'green' | 'yellow' | 'red' | 'neutral' }) {
  const styles = {
    green: 'border-green-500/20 bg-green-500/10 text-green-200',
    yellow: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    red: 'border-red-500/20 bg-red-500/10 text-red-200',
    neutral: 'border-white/10 bg-white/5 text-white/60',
  };

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}>{label}</span>;
}

function Pagination({ page, pageCount, query }: { page: number; pageCount: number; query: Record<string, string | undefined> }) {
  if (pageCount <= 1) return null;

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={buildPageHref(query, page - 1)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:border-accent/40">
          ← Previous
        </Link>
      ) : <span />}

      <p className="text-sm text-white/50">Page {page} of {pageCount}</p>

      {page < pageCount ? (
        <Link href={buildPageHref(query, page + 1)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:border-accent/40">
          Next →
        </Link>
      ) : <span />}
    </nav>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <p className="font-semibold text-white">{text}</p>
      <p className="mt-2 text-sm text-white/50">Clear the filters or search a broader name, email, location, role, or account status.</p>
    </div>
  );
}

function summarizeUsers(users: Array<ProfileRow & { eventSummary: UserEventSummary; risk: number }>) {
  const active = users.filter((profile) => !profile.is_disabled && (!profile.account_status || profile.account_status === 'active')).length;
  const paused = users.filter((profile) => profile.account_status === 'paused').length;
  const suspended = users.filter((profile) => profile.account_status === 'suspended').length;
  const flagged = users.filter((profile) => ['flagged', 'suspected_spam', 'under_review', 'restricted'].includes(profile.moderation_status || '')).length;
  const disabled = users.filter((profile) => profile.is_disabled || ['banned', 'deleted'].includes(profile.account_status || '')).length;
  const owners = users.filter((profile) => profile.eventSummary.total > 0).length;
  const attention = users.filter((profile) => profile.risk >= 3).length;

  return { total: users.length, active, paused, suspended, flagged, disabled, owners, attention };
}

function calculateUserRisk(profile: ProfileRow) {
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

  return score;
}

function sortUsers<T extends { display_name: string | null; username: string | null; created_at: string | null; eventSummary: UserEventSummary; risk: number }>(users: T[], sort: string) {
  return [...users].sort((a, b) => {
    if (sort === 'oldest') return dateValue(a.created_at) - dateValue(b.created_at);
    if (sort === 'name') return getUserName(a).localeCompare(getUserName(b));
    if (sort === 'risk') return b.risk - a.risk || dateValue(b.created_at) - dateValue(a.created_at);
    if (sort === 'events') return b.eventSummary.total - a.eventSummary.total || dateValue(b.created_at) - dateValue(a.created_at);
    return dateValue(b.created_at) - dateValue(a.created_at);
  });
}

function getUserName(profile: { display_name: string | null; username: string | null }) {
  return profile.display_name || profile.username || 'Unnamed User';
}

function buildPageHref(query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && key !== 'page') params.set(key, value);
  }
  params.set('page', String(page));
  return `/admin/users?${params.toString()}`;
}

function allowedValue(value: unknown, allowed: readonly string[]) {
  const cleaned = clean(value);
  return allowed.includes(cleaned) ? cleaned : '';
}

function positiveInteger(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return Math.floor(number);
}

function dateValue(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatCompactDate(value?: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clean(value: unknown) {
  return String(value || '').trim();
}

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';