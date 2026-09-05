import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from './actions';
import { getRecommendedEventsForUser } from '@/lib/discovery/recommend-events';
import DiscoveryEventCard from '@/components/events/DiscoveryEventCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const [
    { data: profile },
    { data: events },
    { data: venues },
    { data: ambassadorProfile },
    { data: savedRows },
    { data: rsvpRows },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('events')
      .select('id,name,slug,status,event_start_at,city,state,created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('venues')
      .select('id,name,slug,city,state,status')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('ambassador_profiles').select('status').eq('user_id', user.id).maybeSingle(),
    supabase.from('event_saves').select('id,event_id').eq('user_id', user.id),
    supabase.from('event_rsvps').select('event_id,status').eq('user_id', user.id),
  ]);

  const recommendationResult = await getRecommendedEventsForUser(user.id);
  const preferences = recommendationResult.preferences;
  const recommendations = recommendationResult.recommendations.slice(0, 6);

  const goingCount = (rsvpRows || []).filter((row: any) => row.status === 'going').length;
  const interestedCount = (rsvpRows || []).filter((row: any) => row.status === 'interested').length;

  const ownedEvents = events || [];
  const venueRows = venues || [];
  const now = Date.now();

  const activeOwnerWork = ownedEvents.filter(
    (event: any) => !['completed', 'removed', 'archived', 'cancelled'].includes(event.status),
  );

  const upcomingEvents = ownedEvents.filter((event: any) => {
    if (!event.event_start_at) return false;
    const startsAt = new Date(event.event_start_at).getTime();
    return Number.isFinite(startsAt) && startsAt >= now && !['removed', 'archived', 'cancelled'].includes(event.status);
  });

  const pendingEvents = ownedEvents.filter((event: any) =>
    ['submitted', 'revision_submitted', 'paid_awaiting_approval'].includes(event.status),
  );

  const needsAttentionEvents = ownedEvents.filter((event: any) =>
    ['draft', 'building', 'rejected', 'revision_draft'].includes(event.status),
  );

  const publicEvents = ownedEvents.filter(
    (event: any) =>
      ['scheduled', 'active', 'live'].includes(event.status) &&
      !['removed', 'archived', 'cancelled'].includes(event.status),
  );

  const recentBusinessEvents = ownedEvents.slice(0, 3);
  const hasBusinessWorkspace =
    ownedEvents.length > 0 ||
    venueRows.length > 0 ||
    profile?.app_role === 'venue_owner' ||
    profile?.app_role === 'admin';

  const checklist = [
    { label: 'Identity', complete: Boolean(profile?.display_name), href: '/dashboard/profile' },
    { label: 'Home area', complete: Boolean(profile?.city && profile?.state), href: '/dashboard/profile' },
    { label: 'About you', complete: Boolean(profile?.bio || profile?.username), href: '/dashboard/profile' },
    {
      label: 'Nightlife preferences',
      complete: Boolean(preferences?.onboarding_completed),
      href: '/dashboard/preferences',
    },
  ];

  const completed = checklist.filter((item) => item.complete).length;
  const profilePercent = Math.round((completed / checklist.length) * 100);

  return (
    <section className="mx-auto max-w-[1500px] space-y-7 px-4 py-5 pb-24 sm:px-6 sm:py-8 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#141927] via-[#0a0d14] to-black p-5 sm:rounded-[2.75rem] sm:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="hk-kicker">My Night</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl">
              {greeting()}, {firstName(profile?.display_name || user.email || 'Knight')}.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
              This is your personal HypeKnight. Start with what fits you, what you saved, and where you said you are going.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/events/recommended"
                className="rounded-2xl bg-accent px-5 py-3 text-sm font-black text-black"
              >
                Find my night
              </Link>
              <Link
                href="/surprise"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white"
              >
                Surprise me
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[1.75rem] border border-white/10 bg-black/30 p-3">
            <MiniMetric label="Saved" value={(savedRows || []).length} />
            <MiniMetric label="Interested" value={interestedCount} />
            <MiniMetric label="Going" value={goingCount} accent />
          </div>
        </div>
      </section>

      {profilePercent < 100 ? (
        <section className="rounded-[1.75rem] border border-accent/20 bg-accent/[0.07] p-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-accent">{profilePercent}%</span>
                <span className="text-sm font-bold text-white">Your HypeKnight setup</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/35">
                <div className="h-full rounded-full bg-accent" style={{ width: `${profilePercent}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {checklist.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      item.complete
                        ? 'border-white/10 text-white/35'
                        : 'border-accent/20 bg-accent/10 text-accent'
                    }`}
                  >
                    {item.complete ? '✓' : '•'} {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href={preferences?.onboarding_completed ? '/dashboard/profile' : '/dashboard/preferences'}
              className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-black"
            >
              Finish setup
            </Link>
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="hk-kicker">For you</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Picked around your preferences.</h2>
          </div>
          <Link href="/events/recommended" className="hidden text-sm font-bold text-accent sm:block">
            See all →
          </Link>
        </div>

        {recommendations.length ? (
          <div className="-mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 xl:grid-cols-3">
            {recommendations.map(({ event }: any, index: number) => (
              <div key={`${event.source_label}-${event.id}`} className="min-w-[82vw] sm:min-w-0">
                <DiscoveryEventCard event={event} featured={index === 0} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-6">
            <p className="font-bold text-white">Your recommendation feed is warming up.</p>
            <p className="mt-2 text-sm text-white/50">
              Set your city, music, vibe, and event preferences and HypeKnight will rank upcoming options around you.
            </p>
            <Link href="/dashboard/preferences" className="mt-4 inline-flex text-sm font-black text-accent">
              Set preferences →
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Action
          href="/dashboard/saved"
          kicker="Keep track"
          title="Saved & recent"
          text="Return to nights you saved or recently explored."
          icon="♡"
        />
        <Action
          href="/dashboard/preferences"
          kicker="Tune the feed"
          title="Your preferences"
          text="Music, vibe, event type, budget, distance, and timing."
          icon="⌁"
        />
        <Action
          href="/dashboard/profile"
          kicker="Identity"
          title="Your profile"
          text="Your public identity and the foundation for the social layer."
          icon="♙"
        />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.055] via-white/[0.025] to-transparent p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="hk-kicker">My HypeKnight Business</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              Run the event. HypeKnight measures the night.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
              Your events, venues, analytics, Discovery tools, and growing Entertainment Profile live here without
              taking over your personal HypeKnight experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/events/new"
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-black text-black"
            >
              Create event
            </Link>
            <Link
              href="/dashboard/events"
              className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold text-white"
            >
              Manage events
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <BusinessMetric label="Events" value={ownedEvents.length} />
          <BusinessMetric label="Upcoming" value={upcomingEvents.length} accent />
          <BusinessMetric label="Needs attention" value={needsAttentionEvents.length + pendingEvents.length} />
          <BusinessMetric label="Venues" value={venueRows.length} />
        </div>

        {hasBusinessWorkspace ? (
          <>
            <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="hk-kicker">Event portfolio</p>
                    <h3 className="mt-2 text-xl font-black text-white">What needs your attention.</h3>
                  </div>
                  <Link href="/dashboard/events" className="text-xs font-black text-accent">
                    Open events →
                  </Link>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <PortfolioStat label="Public" value={publicEvents.length} />
                  <PortfolioStat label="Pending review" value={pendingEvents.length} />
                  <PortfolioStat label="Action needed" value={needsAttentionEvents.length} />
                </div>

                <div className="mt-5 space-y-2">
                  {recentBusinessEvents.length ? (
                    recentBusinessEvents.map((event: any) => <EventRow key={event.id} event={event} />)
                  ) : (
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <p className="font-bold text-white">No events yet.</p>
                      <p className="mt-1 text-sm text-white/45">
                        Create your first event and begin building your HypeKnight event history.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-accent/20 bg-accent/[0.06] p-5 sm:p-6">
                <p className="hk-kicker">Business Model 1.0</p>
                <h3 className="mt-2 text-xl font-black text-white">Your data stays useful.</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  HypeKnight will show you what happened to your events. Patron Pulse will add interpretation,
                  comparisons, and market intelligence as those tools come online.
                </p>
                <div className="mt-5 space-y-3">
                  <ModelLine label="Free" text="What happened to me?" />
                  <ModelLine label="Tier 1" text="What does HypeKnight think about me?" />
                  <ModelLine label="Tier 2" text="What is happening in my market?" />
                  <ModelLine label="Tier 3" text="What is happening across markets?" />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <BusinessTool
                href="/dashboard/events"
                title="Events"
                text="Create, review, publish, and manage your event portfolio."
                status="Available"
              />
              <BusinessTool
                title="Analytics"
                text="Your own event activity, signals, and Pre-Discovery vs Discovery performance."
                status="V3.5"
              />
              <BusinessTool
                title="Entertainment Profile"
                text="Your event history and the signal patterns HypeKnight learns over time."
                status="V3.5"
              />
              <BusinessTool
                href="/dashboard/billing"
                title="Billing"
                text="Orders, receipts, paid enhancements, and future subscriptions."
                status="Available"
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <BusinessTool
                title="Discovery"
                text="Included Discovery, Extended Discovery, and Featured inventory."
                status="Coming next"
              />
              <BusinessTool
                title="Patron Pulse"
                text="Interpret your signals and unlock progressively broader intelligence."
                status="Coming next"
              />
              <BusinessTool
                href="/dashboard/venues"
                title="Venues"
                text="Manage connected venue records and venue-level business tools."
                status={venueRows.length || profile?.app_role === 'venue_owner' ? 'Available' : 'When needed'}
              />
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6">
            <p className="font-black text-white">You do not need a business account to use HypeKnight.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              If you promote an event later, create it from this same account. HypeKnight will begin building your
              event history and business workspace automatically.
            </p>
            <Link href="/dashboard/events/new" className="mt-4 inline-flex text-sm font-black text-accent">
              Create an event →
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="hk-kicker">Creator & partner access</p>
            <h2 className="mt-2 text-2xl font-black text-white">Other workspaces.</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/45">
              Venue, ambassador, and administration tools remain available when your account has access to them.
            </p>
          </div>

          {activeOwnerWork.length ? (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/45">
              {activeOwnerWork.length} active event item{activeOwnerWork.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Workspace
            href="/dashboard/events"
            title="Events"
            available
            text={ownedEvents.length ? `${ownedEvents.length} connected to your account` : 'Post and manage events'}
          />
          <Workspace
            href="/dashboard/venues"
            title="Venues"
            available={venueRows.length > 0 || profile?.app_role === 'venue_owner'}
            text={
              venueRows.length
                ? `${venueRows.length} connected venue${venueRows.length === 1 ? '' : 's'}`
                : 'Venue tools'
            }
          />
          <Workspace
            href={ambassadorProfile?.status === 'active' ? '/ambassadors/dashboard' : '/dashboard/ambassador/apply'}
            title="Ambassador"
            available
            text={ambassadorProfile?.status === 'active' ? 'Active ambassador workspace' : 'Program & application'}
          />
          <Workspace
            href="/admin"
            title="Admin"
            available={profile?.app_role === 'admin'}
            text="Platform operations"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-violet-500/10 to-transparent p-6">
          <p className="hk-kicker">Coming into focus</p>
          <h3 className="mt-3 text-2xl font-black text-white">People, messages, and your nightlife circle.</h3>
          <p className="mt-3 text-sm leading-6 text-white/50">
            The social layer will live around your night—not replace discovery with another noisy feed.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
          <p className="hk-kicker">Account</p>
          <h3 className="mt-3 text-xl font-black text-white">Need to step away?</h3>
          <form action={signOutAction} className="mt-4">
            <button className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 text-center">
      <p className={`text-2xl font-black ${accent ? 'text-accent' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{label}</p>
    </div>
  );
}

function BusinessMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/[0.08] bg-black/20 p-4">
      <p className={`text-3xl font-black ${accent ? 'text-accent' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
    </div>
  );
}

function PortfolioStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{label}</p>
    </div>
  );
}

function EventRow({ event }: { event: any }) {
  const date = event.event_start_at
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(event.event_start_at),
      )
    : 'Date not set';

  return (
    <Link
      href="/dashboard/events"
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-accent/25 hover:bg-white/[0.04]"
    >
      <div className="min-w-0">
        <p className="truncate font-black text-white">{event.name || 'Untitled event'}</p>
        <p className="mt-1 truncate text-xs text-white/40">
          {[date, event.city, event.state].filter(Boolean).join(' • ')}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
        {formatStatus(event.status)}
      </span>
    </Link>
  );
}

function ModelLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-14 shrink-0 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-accent">
        {label}
      </span>
      <p className="text-xs leading-5 text-white/55">{text}</p>
    </div>
  );
}

function BusinessTool({
  href,
  title,
  text,
  status,
}: {
  href?: string;
  title: string;
  text: string;
  status: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-black text-white">{title}</h3>
        <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">
          {status}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-white/45">{text}</p>
    </>
  );

  if (!href) {
    return <div className="rounded-2xl border border-white/[0.06] bg-black/15 p-4">{content}</div>;
  }

  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-accent/25 hover:bg-white/[0.035]"
    >
      {content}
    </Link>
  );
}

function Action({
  href,
  kicker,
  title,
  text,
  icon,
}: {
  href: string;
  kicker: string;
  title: string;
  text: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-accent/30 hover:bg-white/[0.055]"
    >
      <div className="flex items-start justify-between">
        <p className="hk-kicker">{kicker}</p>
        <span className="text-2xl text-white/35 group-hover:text-accent">{icon}</span>
      </div>
      <h3 className="mt-4 text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/45">{text}</p>
      <p className="mt-5 text-xs font-black text-accent">Open →</p>
    </Link>
  );
}

function Workspace({
  href,
  title,
  text,
  available,
}: {
  href: string;
  title: string;
  text: string;
  available: boolean;
}) {
  if (!available) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-black/15 p-4 opacity-45">
        <p className="font-black text-white">{title}</p>
        <p className="mt-1 text-xs text-white/45">{text}</p>
      </div>
    );
  }

  return (
    <Link href={href} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 hover:border-accent/25">
      <p className="font-black text-white">{title}</p>
      <p className="mt-1 text-xs text-white/45">{text}</p>
    </Link>
  );
}

function formatStatus(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstName(value: string) {
  return value.includes('@') ? value.split('@')[0] : value.trim().split(/\s+/)[0];
}
