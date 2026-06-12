import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  const [
    { data: profile, error: profileError },
    { data: preferences },
    { data: events },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('user_event_preferences').select('*').eq('user_id', id).maybeSingle(),
    supabase
      .from('events')
      .select(`
        id,
        name,
        slug,
        status,
        is_public,
        is_approved,
        is_paid,
        payment_status,
        total_price,
        payment_amount,
        discounted_total,
        coupon_code,
        discount_amount,
        event_start_at,
        event_end_at,
        promotion_start_at,
        promotion_end_at,
        city,
        state,
        venue_name,
        created_at
      `)
      .eq('owner_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (profileError || !profile) notFound();

  const eventRows = events ?? [];
  const paidEvents = eventRows.filter(
    (event) => event.is_paid || event.payment_status === 'paid'
  );
  const activeEvents = eventRows.filter((event) =>
    ['scheduled', 'active'].includes(event.status)
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
              {profile.display_name || 'Unnamed User'}
            </h1>

            <p className="mt-3 break-all text-white/50">User ID: {profile.id}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Role" value={profile.app_role || 'user'} />
              <Metric label="Events" value={String(eventRows.length)} />
              <Metric label="Paid Events" value={String(paidEvents.length)} />
              <Metric label="Active Pipeline" value={String(activeEvents.length)} />
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="User Information">
          <InfoList
            items={[
              ['Display Name', profile.display_name],
              ['Role', profile.app_role],
              ['City', profile.city],
              ['State', profile.state],
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
                ['Max Distance', preferences.max_distance_miles ? `${preferences.max_distance_miles} miles` : null],
                ['Music Genres', joinArray(preferences.music_genres)],
                ['Event Types', joinArray(preferences.event_types)],
                ['Vibe Tags', joinArray(preferences.vibe_tags)],
                ['Sources', joinArray(preferences.preferred_sources)],
                ['Onboarding', preferences.onboarding_completed ? 'Complete' : 'Incomplete'],
              ]}
            />
          ) : (
            <Empty text="This user has not created preferences yet." />
          )}
        </Panel>
      </section>

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
    </section>
  );
}

function EventRow({ event }: { event: any }) {
  const amount = Number(event.payment_amount ?? event.discounted_total ?? event.total_price ?? 0);

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
            {event.venue_name || 'No venue'} • {[event.city, event.state].filter(Boolean).join(', ') || 'No location'}
          </p>

          <p className="mt-1 text-white/50">
            Starts: {formatDate(event.event_start_at)} • Amount: ${amount.toFixed(2)}
            {event.coupon_code ? ` • Coupon: ${event.coupon_code}` : ''}
          </p>

          <p className="mt-1 text-xs text-white/40">
            Promo: {formatDate(event.promotion_start_at)} → {formatDate(event.promotion_end_at)}
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

          <Link
            href={`/admin/events`}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:border-accent/40"
          >
            Admin Events
          </Link>
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

function InfoList({ items }: { items: Array<[string, string | null | undefined]> }) {
  const visible = items.filter(([, value]) => value && String(value).trim());

  if (!visible.length) return <Empty text="No details available." />;

  return (
    <div className="space-y-4">
      {visible.map(([label, value]) => (
        <div key={label} className="border-b border-white/10 pb-4 last:border-0">
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
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