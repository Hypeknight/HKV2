import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const [
    { data: profile },
    { data: events },
    { data: ambassadorProfile },
    { data: ambassadorApplication },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),

    supabase
      .from('events')
      .select('id, name, slug, status, event_start_at, city, state, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('ambassador_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),

    supabase
      .from('ambassador_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const eventRows = events ?? [];

  const activeEvents = eventRows.filter((event) =>
    ['scheduled', 'active', 'paid_awaiting_approval'].includes(event.status)
  );

  const draftEvents = eventRows.filter((event) =>
    ['draft', 'building', 'rejected', 'NPNA'].includes(event.status)
  );

  const completedEvents = eventRows.filter((event) => event.status === 'completed');

  const roles = buildRoles({
    appRole: profile?.app_role,
    ambassadorStatus: ambassadorProfile?.status,
  });

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          My HypeKnight
        </p>

        <h1 className="mt-3 text-4xl font-black text-white">
          {profile?.display_name || user.email || 'Welcome'}
        </h1>

        <p className="mt-3 max-w-3xl text-white/70">
          Your HypeKnight profile changes based on the access HypeKnight has approved
          for your account.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {roles.map((role) => (
            <RolePill key={role} label={role} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Current Role" value={profile?.app_role || 'user'} />
        <Metric label="Active Events" value={String(activeEvents.length)} />
        <Metric label="Drafts" value={String(draftEvents.length)} />
        <Metric label="Completed" value={String(completedEvents.length)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <ProfileCard
          title="Discover Events"
          text="Find what is happening tonight, tomorrow, this week, and around your city."
          href="/events"
          action="Explore Events"
        />

        <ProfileCard
          title="Personal Preferences"
          text="Set your city, music, vibe, and event preferences for better recommendations."
          href="/events/recommended/onboarding"
          action="Update Preferences"
        />

        <ProfileCard
          title="Ambassador Program"
          text={getAmbassadorText(ambassadorApplication, ambassadorProfile)}
          href={
            ambassadorProfile?.status === 'active'
              ? '/ambassadors/dashboard'
              : ambassadorApplication
              ? '/ambassadors/dashboard'
              : '/dashboard/ambassador/apply'
          }
          action={
            ambassadorProfile?.status === 'active'
              ? 'Open Ambassador Dashboard'
              : ambassadorApplication
              ? 'View Application Status'
              : 'Apply Now'
          }
        />
      </section>

      {draftEvents.length || activeEvents.length ? (
        <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">My Event Activity</h2>
              <p className="mt-2 text-white/65">
                Events only appear here when you have drafts, pending, scheduled, or active listings.
              </p>
            </div>

            <Link
              href="/dashboard/events/new/step-1"
              className="rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
            >
              Create Event
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {[...draftEvents, ...activeEvents].slice(0, 8).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Ready when you are</h2>
          <p className="mt-3 text-white/65">
            You do not have any event drafts or active event listings right now.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/events"
              className="rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
            >
              Find Something To Do
            </Link>

            <Link
              href="/dashboard/events/new/step-1"
              className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
            >
              Post an Event
            </Link>
          </div>
        </section>
      )}

      {profile?.app_role === 'admin' ? (
        <section className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
          <h2 className="text-2xl font-bold text-white">Admin Access</h2>
          <p className="mt-3 text-white/70">
            You have admin permissions for HypeKnight platform operations.
          </p>

          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Open Admin Command Center
          </Link>
        </section>
      ) : null}
    </section>
  );
}

function buildRoles({
  appRole,
  ambassadorStatus,
}: {
  appRole?: string | null;
  ambassadorStatus?: string | null;
}) {
  const roles = new Set<string>();

  roles.add('user');

  if (appRole === 'admin') roles.add('admin');
  if (appRole === 'venue_owner') roles.add('venue owner');
  if (appRole === 'ambassador' || ambassadorStatus === 'active') roles.add('ambassador');

  return Array.from(roles);
}

function getAmbassadorText(application: any, ambassador: any) {
  if (ambassador?.status === 'active') {
    return 'Your ambassador profile is active. Manage coupon requests and track performance.';
  }

  if (ambassador?.status === 'suspended') {
    return 'Your ambassador profile is currently suspended.';
  }

  if (application?.status === 'pending') {
    return 'Your ambassador application is pending HypeKnight review.';
  }

  if (application?.status === 'rejected') {
    return 'Your ambassador application was reviewed. Contact HypeKnight for next steps.';
  }

  return 'Request approval to become a HypeKnight ambassador and unlock coupon tracking tools.';
}

function ProfileCard({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[2rem] border border-white/10 bg-white/5 p-8 transition hover:border-accent/40 hover:bg-white/[0.07]"
    >
      <h2 className="text-2xl font-bold text-white group-hover:text-accent">
        {title}
      </h2>
      <p className="mt-4 text-white/65">{text}</p>
      <p className="mt-6 text-sm font-medium text-accent">{action} →</p>
    </Link>
  );
}

function EventRow({ event }: { event: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white">{event.name}</h3>
            <RolePill label={event.status} />
          </div>
          <p className="mt-2 text-white/55">
            {[event.city, event.state].filter(Boolean).join(', ') || 'Location pending'}
            {event.event_start_at
              ? ` • ${new Date(event.event_start_at).toLocaleString()}`
              : ''}
          </p>
        </div>

        <Link
          href={`/dashboard/events/${event.id}/review`}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-white hover:border-accent/40"
        >
          Open
        </Link>
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

function RolePill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/65">
      {label}
    </span>
  );
}