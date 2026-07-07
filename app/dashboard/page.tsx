/*
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from './actions';

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
    { data: venues },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    supabase
      .from('events')
      .select(
        'id, name, slug, status, event_start_at, city, state, created_at, revision_requested_at, revision_submitted_at, revision_reason'
      )
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
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('venues')
      .select('id, name, slug, city, state, status, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const eventRows = events ?? [];
  const venueRows = venues ?? [];

  const revisionDraftEvents = eventRows.filter(
    (event) => event.status === 'revision_draft'
  );

  const revisionSubmittedEvents = eventRows.filter(
    (event) => event.status === 'revision_submitted'
  );

  const activeEvents = eventRows.filter((event) =>
    ['scheduled', 'active', 'paid_awaiting_approval'].includes(event.status)
  );

  const draftEvents = eventRows.filter((event) =>
    ['draft', 'building', 'rejected', 'NPNA', 'revision_draft'].includes(
      event.status
    )
  );

  const completedEvents = eventRows.filter(
    (event) => event.status === 'completed'
  );

  const pendingEvents = eventRows.filter((event) =>
    ['paid_awaiting_approval', 'approved_awaiting_payment', 'revision_submitted'].includes(
      event.status
    )
  );

  const roles = buildRoles({
    appRole: profile?.app_role,
    ambassadorStatus: ambassadorProfile?.status,
    hasEvents: eventRows.length > 0,
    hasVenues: venueRows.length > 0,
  });

  const modules = buildModules({
    profile,
    ambassadorProfile,
    ambassadorApplication,
    eventCount: eventRows.length,
    venueCount: venueRows.length,
  });

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">
              My HypeKnight
            </p>

            <h1 className="mt-3 text-4xl font-black text-white">
              {profile?.display_name || user.email || 'Welcome'}
            </h1>

            <p className="mt-3 max-w-3xl text-white/70">
              Your dashboard opens modules based on what you are involved with
              in HypeKnight. You can discover events, promote events, manage
              venues, work as an ambassador, or access admin tools when approved.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {roles.map((role) => (
                <RolePill key={role} label={role} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/profile"
              className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
            >
              Edit Profile
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-red-200 hover:border-red-500/40"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active Modules" value={String(modules.length)} />
        <Metric label="Active Events" value={String(activeEvents.length)} />
        <Metric label="Drafts / Revisions" value={String(draftEvents.length)} />
        <Metric label="Pending Review" value={String(pendingEvents.length)} />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Active Modules</h2>
          <p className="mt-2 text-white/65">
            These areas become available based on your approved access and your
            activity inside HypeKnight.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {modules.map((module) => (
            <ProfileCard
              key={module.title}
              title={module.title}
              text={module.text}
              href={module.href}
              action={module.action}
            />
          ))}
        </div>
      </section>

      {revisionDraftEvents.length ? (
        <EventModule
          title="Revision Drafts"
          text="These events were opened for editing and need to be submitted back to HypeKnight for approval."
          events={revisionDraftEvents}
          emptyText="No revision drafts."
          actionLabel="Continue Revision"
        />
      ) : null}

      {revisionSubmittedEvents.length ? (
        <EventModule
          title="Revisions Waiting for HypeKnight"
          text="These revisions have been submitted and are waiting for admin review."
          events={revisionSubmittedEvents}
          emptyText="No submitted revisions."
          actionLabel="View Review"
        />
      ) : null}

      {draftEvents.length || activeEvents.length ? (
        <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">My Event Activity</h2>
              <p className="mt-2 text-white/65">
                Drafts, revision drafts, pending, scheduled, and active listings
                appear here.
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
            You do not have any event drafts, revision drafts, or active event
            listings right now.
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

      {venueRows.length ? (
        <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Venue Activity</h2>
          <p className="mt-2 text-white/65">
            Venues connected to your account appear here.
          </p>

          <div className="mt-6 space-y-4">
            {venueRows.slice(0, 5).map((venue) => (
              <VenueRow key={venue.id} venue={venue} />
            ))}
          </div>
        </section>
      ) : null}

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

function buildModules({
  profile,
  ambassadorProfile,
  ambassadorApplication,
  eventCount,
  venueCount,
}: {
  profile: any;
  ambassadorProfile: any;
  ambassadorApplication: any;
  eventCount: number;
  venueCount: number;
}) {
  const modules = [
    {
      title: 'Discover Events',
      text: 'Find what is happening tonight, tomorrow, this week, and around your city.',
      href: '/events',
      action: 'Explore Events',
    },
    {
      title: 'Personal Preferences',
      text: 'Set your city, music, vibe, and event preferences for better recommendations.',
      href: '/dashboard/preferences',
      action: 'Update Preferences',
    },
  ];

  modules.push({
    title: eventCount > 0 ? 'Promoter / Event Owner' : 'Post an Event',
    text:
      eventCount > 0
        ? 'Manage your event drafts, revisions, pending reviews, scheduled listings, and live events.'
        : 'Create your first event listing and submit it into the HypeKnight promotion pipeline.',
    href: eventCount > 0 ? '/dashboard' : '/dashboard/events/new/step-1',
    action: eventCount > 0 ? 'View Event Activity' : 'Create Event',
  });

  modules.push({
    title: 'Ambassador Program',
    text: getAmbassadorText(ambassadorApplication, ambassadorProfile),
    href:
      ambassadorProfile?.status === 'active'
        ? '/ambassadors/dashboard'
        : ambassadorApplication
        ? '/ambassadors/dashboard'
        : '/dashboard/ambassador/apply',
    action:
      ambassadorProfile?.status === 'active'
        ? 'Open Ambassador Dashboard'
        : ambassadorApplication
        ? 'View Application Status'
        : 'Apply Now',
  });

  if (venueCount > 0 || profile?.app_role === 'venue_owner') {
    modules.push({
      title: 'Venue Owner',
      text: 'Manage venues, venue details, and connected event activity.',
      href: '/dashboard/venues',
      action: 'Open Venue Tools',
    });
  }

  if (profile?.app_role === 'dj') {
    modules.push({
      title: 'DJ Profile',
      text: 'Manage your DJ access, performance profile, and future HypeKnight music tools.',
      href: '/dashboard/dj',
      action: 'Open DJ Tools',
    });
  }

  if (profile?.app_role === 'admin') {
    modules.push({
      title: 'Admin Command Center',
      text: 'Access moderation, users, payments, ambassadors, system tools, and event queues.',
      href: '/admin',
      action: 'Open Admin',
    });
  }

  return modules;
}

function buildRoles({
  appRole,
  ambassadorStatus,
  hasEvents,
  hasVenues,
}: {
  appRole?: string | null;
  ambassadorStatus?: string | null;
  hasEvents?: boolean;
  hasVenues?: boolean;
}) {
  const roles = new Set<string>();

  roles.add('user');

  if (hasEvents) roles.add('promoter');
  if (hasVenues) roles.add('venue owner');
  if (appRole === 'admin') roles.add('admin');
  if (appRole === 'venue_owner') roles.add('venue owner');
  if (appRole === 'dj') roles.add('dj');
  if (appRole === 'ambassador' || ambassadorStatus === 'active') {
    roles.add('ambassador');
  }

  return Array.from(roles);
}

function EventModule({
  title,
  text,
  events,
  emptyText,
  actionLabel,
}: {
  title: string;
  text: string;
  events: any[];
  emptyText: string;
  actionLabel: string;
}) {
  return (
    <section className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-white/70">{text}</p>

      {events.length ? (
        <div className="mt-6 space-y-4">
          {events.map((event) => (
            <EventRow key={event.id} event={event} actionLabel={actionLabel} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
          {emptyText}
        </div>
      )}
    </section>
  );
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

function EventRow({
  event,
  actionLabel = 'Open',
}: {
  event: any;
  actionLabel?: string;
}) {
  const href =
    event.status === 'revision_draft'
      ? `/dashboard/events/${event.id}/edit`
      : `/dashboard/events/${event.id}/review`;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white">{event.name}</h3>
            <RolePill label={event.status} />
          </div>

          <p className="mt-2 text-white/55">
            {[event.city, event.state].filter(Boolean).join(', ') ||
              'Location pending'}
            {event.event_start_at
              ? ` • ${new Date(event.event_start_at).toLocaleString()}`
              : ''}
          </p>

          {event.status === 'revision_draft' && event.revision_reason ? (
            <p className="mt-2 text-sm text-accent">
              Revision: {event.revision_reason}
            </p>
          ) : null}
        </div>

        <Link
          href={href}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-white hover:border-accent/40"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

function VenueRow({ venue }: { venue: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white">{venue.name}</h3>
            <RolePill label={venue.status || 'venue'} />
          </div>

          <p className="mt-2 text-white/55">
            {[venue.city, venue.state].filter(Boolean).join(', ') ||
              'Location pending'}
          </p>
        </div>

        <Link
          href={`/dashboard/venues/${venue.id}`}
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
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
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
  */
 import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from './actions';
import {
  ButtonLink,
  Chip,
  EmptyState,
  EventTime,
  InfoCard,
  MetricCard,
  Panel,
  SectionHeader,
} from '@/components/ui';

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
    { data: venues },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    supabase
      .from('events')
      .select(
        'id, name, slug, status, event_start_at, city, state, created_at, revision_requested_at, revision_submitted_at, revision_reason'
      )
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
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('venues')
      .select('id, name, slug, city, state, status, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const eventRows = events ?? [];
  const venueRows = venues ?? [];

  const revisionDraftEvents = eventRows.filter(
    (event) => event.status === 'revision_draft'
  );

  const revisionSubmittedEvents = eventRows.filter(
    (event) => event.status === 'revision_submitted'
  );

  const activeEvents = eventRows.filter((event) =>
    ['scheduled', 'active', 'paid_awaiting_approval'].includes(event.status)
  );

  const draftEvents = eventRows.filter((event) =>
    ['draft', 'building', 'rejected', 'NPNA', 'revision_draft'].includes(
      event.status
    )
  );

  const pendingEvents = eventRows.filter((event) =>
    [
      'paid_awaiting_approval',
      'approved_awaiting_payment',
      'revision_submitted',
    ].includes(event.status)
  );

  const roles = buildRoles({
    appRole: profile?.app_role,
    ambassadorStatus: ambassadorProfile?.status,
    hasEvents: eventRows.length > 0,
    hasVenues: venueRows.length > 0,
  });

  const profileItems = buildProfileChecklist(profile);
  const completedProfileItems = profileItems.filter((item) => item.complete).length;
  const profilePercent = Math.round(
    (completedProfileItems / profileItems.length) * 100
  );

  const modules = buildModules({
    profile,
    ambassadorProfile,
    ambassadorApplication,
    eventCount: eventRows.length,
    venueCount: venueRows.length,
  });

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              My HypeKnight
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Welcome, {profile?.display_name || user.email || 'Knight'}.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Complete your profile, set your preferences, and unlock a better
              HypeKnight experience built around your city, music, vibe, and
              event interests.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {roles.map((role) => (
                <Chip key={role}>{role}</Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <ButtonLink href="/dashboard/profile" variant="primary">
              Complete Profile
            </ButtonLink>

            <ButtonLink href="/dashboard/preferences" variant="secondary">
              Set Preferences
            </ButtonLink>

            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 font-semibold text-red-200 hover:border-red-500/40"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Profile progress" eyebrow="Start Here">
          <div className="space-y-5">
            <div>
              <div className="flex items-end justify-between gap-3">
                <p className="text-4xl font-black text-white">{profilePercent}%</p>
                <p className="text-sm text-white/50">
                  {completedProfileItems} of {profileItems.length} complete
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${profilePercent}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3">
              {profileItems.map((item) => (
                <ChecklistRow key={item.label} item={item} />
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dashboard/profile" variant="primary">
                Update Profile
              </ButtonLink>
              <ButtonLink href="/dashboard/preferences" variant="secondary">
                Update Preferences
              </ButtonLink>
            </div>
          </div>
        </Panel>

        <Panel title="Your HypeKnight setup" eyebrow="Personalize">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard
              label="Display Name"
              icon="👤"
              value={profile?.display_name || 'Add your display name'}
              accent={!profile?.display_name}
            />

            <InfoCard
              label="Home City"
              icon="🏙️"
              value={
                [profile?.city, profile?.state].filter(Boolean).join(', ') ||
                'Add your city'
              }
              accent={!profile?.city || !profile?.state}
            />

            <InfoCard
              label="Role"
              icon="⚔️"
              value={roles.join(', ')}
            />

            <InfoCard
              label="Email"
              icon="✉️"
              value={user.email || 'No email found'}
            />
          </div>

          <p className="mt-5 text-sm leading-6 text-white/55">
            The more complete your profile is, the easier it becomes for
            HypeKnight to recommend events, personalize city discovery, and
            unlock the right dashboard tools.
          </p>
        </Panel>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard label="Active Modules" value={modules.length} />
        <MetricCard label="Active Events" value={activeEvents.length} href="#events" />
        <MetricCard label="Drafts" value={draftEvents.length} href="#events" />
        <MetricCard label="Pending Review" value={pendingEvents.length} accent />
      </section>

      <Panel title="Quick actions" eyebrow="What do you want to do?">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            title="Find Something To Do"
            text="Browse live, starting-soon, weekend, and city-based events."
            href="/events"
            action="Explore Events"
            icon="🔍"
          />

          <ActionCard
            title="Post an Event"
            text="Create an event listing and submit it into the HypeKnight pipeline."
            href="/dashboard/events/new/step-1"
            action="Create Event"
            icon="🎟️"
          />

          <ActionCard
            title="Preferences"
            text="Set your city, music, vibe, and event interests."
            href="/dashboard/preferences"
            action="Update Preferences"
            icon="🎛️"
          />

          <ActionCard
            title="Ambassador"
            text={getAmbassadorText(ambassadorApplication, ambassadorProfile)}
            href={
              ambassadorProfile?.status === 'active' || ambassadorApplication
                ? '/ambassadors/dashboard'
                : '/dashboard/ambassador/apply'
            }
            action={
              ambassadorProfile?.status === 'active'
                ? 'Open Dashboard'
                : ambassadorApplication
                ? 'View Status'
                : 'Apply Now'
            }
            icon="🚀"
          />
        </div>
      </Panel>

      <Panel title="Your active modules" eyebrow="Dashboard Tools">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <ActionCard
              key={module.title}
              title={module.title}
              text={module.text}
              href={module.href}
              action={module.action}
              icon={module.icon}
            />
          ))}
        </div>
      </Panel>

      {revisionDraftEvents.length ? (
        <EventModule
          title="Revision drafts"
          text="These events were opened for editing and need to be submitted back to HypeKnight for approval."
          events={revisionDraftEvents}
          emptyText="No revision drafts."
          actionLabel="Continue Revision"
        />
      ) : null}

      {revisionSubmittedEvents.length ? (
        <EventModule
          title="Revisions waiting for HypeKnight"
          text="These revisions have been submitted and are waiting for admin review."
          events={revisionSubmittedEvents}
          emptyText="No submitted revisions."
          actionLabel="View Review"
        />
      ) : null}

      <section id="events">
        {draftEvents.length || activeEvents.length ? (
          <Panel title="My event activity" eyebrow="Events">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-3xl text-sm leading-6 text-white/65">
                Drafts, revision drafts, pending, scheduled, and active listings
                appear here.
              </p>

              <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
                Create Event
              </ButtonLink>
            </div>

            <div className="mt-6 space-y-4">
              {[...draftEvents, ...activeEvents].slice(0, 8).map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </Panel>
        ) : (
          <Panel title="Ready when you are" eyebrow="Events">
            <p className="text-white/65">
              You do not have any event drafts, revision drafts, or active event
              listings right now.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/events" variant="primary">
                Find Something To Do
              </ButtonLink>

              <ButtonLink href="/dashboard/events/new/step-1" variant="secondary">
                Post an Event
              </ButtonLink>
            </div>
          </Panel>
        )}
      </section>

      {venueRows.length ? (
        <Panel title="Venue activity" eyebrow="Venues">
          <p className="text-sm text-white/65">
            Venues connected to your account appear here.
          </p>

          <div className="mt-6 space-y-4">
            {venueRows.slice(0, 5).map((venue) => (
              <VenueRow key={venue.id} venue={venue} />
            ))}
          </div>
        </Panel>
      ) : null}

      {profile?.app_role === 'admin' ? (
        <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-6 sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            eyebrow="Admin Access"
            title="Admin Command Center"
            text="You have admin permissions for HypeKnight platform operations."
          />

          <div className="mt-6">
            <ButtonLink href="/admin" variant="primary">
              Open Admin Command Center
            </ButtonLink>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function buildProfileChecklist(profile: any) {
  return [
    {
      label: 'Display name',
      complete: Boolean(profile?.display_name),
      text: 'How people recognize you in HypeKnight.',
    },
    {
      label: 'City',
      complete: Boolean(profile?.city),
      text: 'Helps us personalize local discovery.',
    },
    {
      label: 'State',
      complete: Boolean(profile?.state),
      text: 'Keeps your location clean and searchable.',
    },
    {
      label: 'Preferences',
      complete: Boolean(
        profile?.preferred_city ||
          profile?.music_preferences ||
          profile?.event_preferences ||
          profile?.vibe_preferences
      ),
      text: 'Music, vibe, nightlife, sports, festivals, and more.',
    },
  ];
}

function ChecklistRow({
  item,
}: {
  item: { label: string; complete: boolean; text: string };
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
            item.complete
              ? 'bg-accent text-black'
              : 'border border-white/10 text-white/45'
          }`}
        >
          {item.complete ? '✓' : '•'}
        </div>

        <div>
          <p className="font-semibold text-white">{item.label}</p>
          <p className="mt-1 text-sm text-white/55">{item.text}</p>
        </div>
      </div>
    </div>
  );
}

function buildModules({
  profile,
  ambassadorProfile,
  ambassadorApplication,
  eventCount,
  venueCount,
}: {
  profile: any;
  ambassadorProfile: any;
  ambassadorApplication: any;
  eventCount: number;
  venueCount: number;
}) {
  const modules = [
    {
      title: 'Discover Events',
      text: 'Find what is happening tonight, tomorrow, this week, and around your city.',
      href: '/events',
      action: 'Explore Events',
      icon: '🔍',
    },
    {
      title: 'Personal Preferences',
      text: 'Set your city, music, vibe, and event preferences for better recommendations.',
      href: '/dashboard/preferences',
      action: 'Update Preferences',
      icon: '🎛️',
    },
  ];

  modules.push({
    title: eventCount > 0 ? 'Promoter / Event Owner' : 'Post an Event',
    text:
      eventCount > 0
        ? 'Manage your event drafts, revisions, pending reviews, scheduled listings, and live events.'
        : 'Create your first event listing and submit it into the HypeKnight promotion pipeline.',
    href: eventCount > 0 ? '/dashboard' : '/dashboard/events/new/step-1',
    action: eventCount > 0 ? 'View Event Activity' : 'Create Event',
    icon: '🎟️',
  });

  modules.push({
    title: 'Ambassador Program',
    text: getAmbassadorText(ambassadorApplication, ambassadorProfile),
    href:
      ambassadorProfile?.status === 'active'
        ? '/ambassadors/dashboard'
        : ambassadorApplication
        ? '/ambassadors/dashboard'
        : '/dashboard/ambassador/apply',
    action:
      ambassadorProfile?.status === 'active'
        ? 'Open Ambassador Dashboard'
        : ambassadorApplication
        ? 'View Application Status'
        : 'Apply Now',
    icon: '🚀',
  });

  if (venueCount > 0 || profile?.app_role === 'venue_owner') {
    modules.push({
      title: 'Venue Owner',
      text: 'Manage venues, venue details, and connected event activity.',
      href: '/dashboard/venues',
      action: 'Open Venue Tools',
      icon: '🏢',
    });
  }

  if (profile?.app_role === 'dj') {
    modules.push({
      title: 'DJ Profile',
      text: 'Manage your DJ access, performance profile, and future HypeKnight music tools.',
      href: '/dashboard/dj',
      action: 'Open DJ Tools',
      icon: '🎧',
    });
  }

  if (profile?.app_role === 'admin') {
    modules.push({
      title: 'Admin Command Center',
      text: 'Access moderation, users, payments, ambassadors, system tools, and event queues.',
      href: '/admin',
      action: 'Open Admin',
      icon: '⚙️',
    });
  }

  return modules;
}

function buildRoles({
  appRole,
  ambassadorStatus,
  hasEvents,
  hasVenues,
}: {
  appRole?: string | null;
  ambassadorStatus?: string | null;
  hasEvents?: boolean;
  hasVenues?: boolean;
}) {
  const roles = new Set<string>();

  roles.add('user');

  if (hasEvents) roles.add('promoter');
  if (hasVenues) roles.add('venue owner');
  if (appRole === 'admin') roles.add('admin');
  if (appRole === 'venue_owner') roles.add('venue owner');
  if (appRole === 'dj') roles.add('dj');
  if (appRole === 'ambassador' || ambassadorStatus === 'active') {
    roles.add('ambassador');
  }

  return Array.from(roles);
}

function EventModule({
  title,
  text,
  events,
  emptyText,
  actionLabel,
}: {
  title: string;
  text: string;
  events: any[];
  emptyText: string;
  actionLabel: string;
}) {
  return (
    <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-6 sm:rounded-[2.5rem] sm:p-8">
      <SectionHeader eyebrow="Action Needed" title={title} text={text} />

      {events.length ? (
        <div className="mt-6 space-y-4">
          {events.map((event) => (
            <EventRow key={event.id} event={event} actionLabel={actionLabel} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState text={emptyText} />
        </div>
      )}
    </section>
  );
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

function ActionCard({
  title,
  text,
  href,
  action,
  icon = '⚔️',
}: {
  title: string;
  text: string;
  href: string;
  action: string;
  icon?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.75rem] border border-white/10 bg-white/5 p-5 transition hover:border-accent/40 hover:bg-white/[0.07] sm:rounded-[2rem] sm:p-6"
    >
      <p className="text-3xl">{icon}</p>
      <h2 className="mt-4 text-xl font-black text-white group-hover:text-accent">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/65">{text}</p>
      <p className="mt-5 text-sm font-semibold text-accent">{action} →</p>
    </Link>
  );
}

function EventRow({
  event,
  actionLabel = 'Open',
}: {
  event: any;
  actionLabel?: string;
}) {
  const href =
    event.status === 'revision_draft'
      ? `/dashboard/events/${event.id}/edit`
      : `/dashboard/events/${event.id}/review`;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-white">{event.name}</h3>
            <Chip>{event.status}</Chip>
          </div>

          <div className="mt-2 text-sm text-white/55">
            {[event.city, event.state].filter(Boolean).join(', ') ||
              'Location pending'}

            {event.event_start_at ? (
              <span className="block sm:inline">
                <span className="hidden sm:inline"> • </span>
                <EventTime value={event.event_start_at} mode="wall" />
              </span>
            ) : null}
          </div>

          {event.status === 'revision_draft' && event.revision_reason ? (
            <p className="mt-2 text-sm text-accent">
              Revision: {event.revision_reason}
            </p>
          ) : null}
        </div>

        <Link
          href={href}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-white hover:border-accent/40"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

function VenueRow({ venue }: { venue: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-white">{venue.name}</h3>
            <Chip>{venue.status || 'venue'}</Chip>
          </div>

          <p className="mt-2 text-sm text-white/55">
            {[venue.city, venue.state].filter(Boolean).join(', ') ||
              'Location pending'}
          </p>
        </div>

        <Link
          href={`/dashboard/venues/${venue.id}`}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-white hover:border-accent/40"
        >
          Open
        </Link>
      </div>
    </div>
  );
}