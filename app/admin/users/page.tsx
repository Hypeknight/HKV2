import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateUserRole } from './actions';

export default async function AdminUsersPage() {
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
        .select('id, display_name, app_role, created_at, updated_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('events')
        .select('id, owner_id, status, payment_status, is_paid'),

      supabase
        .from('user_event_preferences')
        .select('user_id, onboarding_completed'),
    ]);

  if (error) throw new Error(error.message);

  const rows = profiles ?? [];
  const eventRows = events ?? [];
  const preferenceRows = preferences ?? [];

  const users = rows.filter((profile) => profile.app_role === 'user');
  const venueOwners = rows.filter((profile) => profile.app_role === 'venue_owner');
  const admins = rows.filter((profile) => profile.app_role === 'admin');

  const usersWithStats = rows.map((profile) => {
    const ownedEvents = eventRows.filter((event) => event.owner_id === profile.id);
    const paidEvents = ownedEvents.filter(
      (event) => event.is_paid || event.payment_status === 'paid'
    );
    const pref = preferenceRows.find((item) => item.user_id === profile.id);

    return {
      ...profile,
      eventCount: ownedEvents.length,
      paidEventCount: paidEvents.length,
      onboardingCompleted: pref?.onboarding_completed === true,
    };
  });

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Admin
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            User Management
          </h1>
          <p className="mt-3 max-w-3xl text-white/70">
            View HypeKnight users, roles, event activity, and preference setup.
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
        <h2 className="text-2xl font-bold text-white">Profiles</h2>
        <p className="mt-2 text-white/65">
          Role updates should be used carefully. Admin users can access platform controls.
        </p>

        {usersWithStats.length ? (
          <div className="mt-6 space-y-4">
            {usersWithStats.map((profile) => (
              <UserCard
                key={profile.id}
                profile={profile}
                currentAdminId={user.id}
              />
            ))}
          </div>
        ) : (
          <Empty text="No user profiles found." />
        )}
      </section>
    </section>
  );
}

function UserCard({
  profile,
  currentAdminId,
}: {
  profile: any;
  currentAdminId: string;
}) {
  const isSelf = profile.id === currentAdminId;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-white">
              {profile.display_name || 'Unnamed User'}
            </h3>
            <Chip label={profile.app_role || 'user'} />
            {isSelf ? <Chip label="You" /> : null}
          </div>

          <p className="mt-2 break-all text-sm text-white/45">
            User ID: {profile.id}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Events" value={String(profile.eventCount)} />
            <Info label="Paid Events" value={String(profile.paidEventCount)} />
            <Info
              label="Preferences"
              value={profile.onboardingCompleted ? 'Complete' : 'Incomplete'}
            />
            <Info
              label="Joined"
              value={
                profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : '—'
              }
            />
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
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-white">{value}</p>
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