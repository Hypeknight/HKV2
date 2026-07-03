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
  }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};
  const search = String(query.q || '').trim().toLowerCase();
  const status = String(query.status || '').trim();

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

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);

  let users = profiles ?? [];

  if (search) {
    users = users.filter((profile) => {
      const haystack = [
        profile.id,
        profile.display_name,
        profile.username,
        profile.email,
        profile.city,
        profile.state,
        profile.account_status,
        profile.moderation_status,
        profile.flagged_reason,
        profile.disabled_reason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  if (status) {
    users = users.filter((profile) => profile.account_status === status);
  }

  const activeCount = users.filter((p) => p.account_status === 'active' || !p.account_status).length;
  const pausedCount = users.filter((p) => p.account_status === 'paused').length;
  const suspendedCount = users.filter((p) => p.account_status === 'suspended').length;
  const bannedCount = users.filter((p) => p.account_status === 'banned').length;
  const disabledCount = users.filter((p) => p.is_disabled).length;
  const flaggedCount = users.filter((p) =>
    ['flagged', 'suspected_spam'].includes(p.moderation_status)
  ).length;

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin" className="text-sm text-white/60 hover:text-accent">
          ← Back to Admin
        </Link>
      </div>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          User Moderation
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Manage HypeKnight Users
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Review accounts, flag spam, pause users, suspend accounts, disable
          access, and track admin moderation notes.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Showing" value={String(users.length)} />
          <Metric label="Active" value={String(activeCount)} />
          <Metric label="Paused" value={String(pausedCount)} />
          <Metric label="Suspended" value={String(suspendedCount)} />
          <Metric label="Flagged" value={String(flaggedCount)} />
          <Metric label="Disabled" value={String(disabledCount + bannedCount)} />
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-6">
        <form className="grid gap-3 lg:grid-cols-[1fr_220px_140px]">
          <input
            name="q"
            defaultValue={query.q || ''}
            placeholder="Search name, username, email, city, reason..."
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
            <option value="deleted">Deleted</option>
          </select>

          <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90">
            Filter
          </button>
        </form>

        {(search || status) ? (
          <Link href="/admin/users" className="mt-4 inline-flex text-sm text-white/55 hover:text-accent">
            Clear filters
          </Link>
        ) : null}
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Users</h2>

        <div className="mt-6 space-y-4">
          {users.length ? (
            users.map((profile) => (
              <Link
                key={profile.id}
                href={`/admin/users/${profile.id}`}
                className="block rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-accent/40 hover:bg-white/[0.07]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-white">
                    {profile.display_name || profile.username || 'Unnamed User'}
                  </h3>
                  <Chip label={profile.account_status || 'active'} />
                  <Chip label={profile.moderation_status || 'clear'} />
                  {profile.is_disabled ? <Chip label="disabled" /> : null}
                  {profile.app_role ? <Chip label={profile.app_role} /> : null}
                </div>

                <p className="mt-2 break-all text-sm text-white/45">
                  {profile.id}
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Info label="Username" value={profile.username} />
                  <Info label="City" value={[profile.city, profile.state].filter(Boolean).join(', ')} />
                  <Info label="Created" value={formatDate(profile.created_at)} />
                </div>

                {profile.flagged_reason || profile.disabled_reason ? (
                  <p className="mt-3 text-sm text-yellow-100/80">
                    {profile.flagged_reason || profile.disabled_reason}
                  </p>
                ) : null}
              </Link>
            ))
          ) : (
            <Empty text="No users match this filter." />
          )}
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className="mt-1 break-words text-sm text-white/70">{value || '—'}</p>
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