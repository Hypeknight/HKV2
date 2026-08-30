import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOperationsSummary, type OperationsActivity } from '@/lib/admin/operations';
import { getAdminActivity } from '@/lib/admin/activity';
import AdminActivityFeed from '@/components/admin/AdminActivityFeed';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role, display_name')
    .eq('id', user.id)
    .single();

  if (profileError) throw new Error(profileError.message);
  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const [
    operations,
    globalActivity,
    { count: couponCount, error: couponError },
    { count: lookupValueCount, error: lookupError },
    { count: rejectedCount, error: rejectedError },
  ] = await Promise.all([
    getOperationsSummary(),
    getAdminActivity(supabase, { page: 1, pageSize: 6 }),
    supabase.from('event_coupons').select('*', { count: 'exact', head: true }),
    supabase.from('lookup_values').select('*', { count: 'exact', head: true }).is('archived_at', null),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  const supplementalErrors = [couponError, lookupError, rejectedError].filter(Boolean);
  if (supplementalErrors.length) {
    throw new Error(supplementalErrors.map((error) => error?.message).filter(Boolean).join(' | '));
  }

  const reviewQueue = operations.pendingModeration + operations.pendingRevisions;
  const requestQueue = operations.removalRequests + operations.refundRequests;
  const attentionQueue = reviewQueue + requestQueue + operations.paymentExceptions + Number(rejectedCount ?? 0);
  const publicPipelineCount = operations.scheduledEvents + operations.activeEvents + operations.liveEvents;
  const displayName = profile.display_name || user.email?.split('@')[0] || 'Administrator';

  const dutyItems = [
    {
      title: 'Moderation',
      count: operations.pendingModeration,
      detail: 'New submissions waiting for an admin decision.',
      href: '/admin/events?status=submitted',
      priority: operations.pendingModeration > 0,
    },
    {
      title: 'Revisions',
      count: operations.pendingRevisions,
      detail: 'Owner revisions ready for re-review.',
      href: '/admin/events?status=revision_submitted',
      priority: operations.pendingRevisions > 0,
    },
    {
      title: 'Removal / Refund',
      count: requestQueue,
      detail: 'Customer-service decisions requiring admin action.',
      href: '/admin/payments',
      priority: requestQueue > 0,
    },
    {
      title: 'Payment Exceptions',
      count: operations.paymentExceptions,
      detail: 'Payment or approval states that need intervention.',
      href: '/admin/payments',
      priority: operations.paymentExceptions > 0,
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-[#0d1015] to-black p-5 sm:p-7 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                Control Center
              </span>
              <span className="text-xs text-white/40">Operations overview</span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Good to see you, {displayName}.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55 sm:text-base">
              Start with priority work, then move into live operations, intelligence, people, revenue, or platform control using the persistent admin navigation.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatusChip label={`${reviewQueue} awaiting review`} active={reviewQueue > 0} />
              <StatusChip label={`${requestQueue} service requests`} active={requestQueue > 0} />
              <StatusChip label={`${operations.paymentExceptions} payment exceptions`} active={operations.paymentExceptions > 0} />
              <StatusChip label={`${publicPipelineCount} public-pipeline events`} />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">Needs attention</p>
                <p className="mt-2 text-5xl font-black text-white">{attentionQueue}</p>
              </div>
              <span className={`mt-1 h-3 w-3 rounded-full ${attentionQueue ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            </div>
            <p className="mt-3 text-sm leading-6 text-white/50">
              Combined moderation, revision, service, payment, and rejected-event workload.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/admin/events?status=submitted" className="rounded-xl bg-accent px-4 py-3 text-center text-sm font-black text-black">
                Review events
              </Link>
              <Link href="/admin/activity" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white">
                Activity
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Admin duties" title="What needs action" text="Priority work is placed first so routine administration does not get buried under reporting and configuration." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dutyItems.map((item) => (
            <Link key={item.title} href={item.href} className={`rounded-2xl border p-5 transition hover:border-accent/40 ${item.priority ? 'border-amber-400/20 bg-amber-400/[0.08]' : 'border-white/10 bg-white/[0.035]'}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white">{item.title}</p>
                <span className={`rounded-lg px-2.5 py-1 text-sm font-black ${item.priority ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>{item.count}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/45">{item.detail}</p>
              <p className="mt-4 text-xs font-bold text-accent">Open work queue →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Live operations" title="Platform now" text="A compact operational picture of HypeKnight's current inventory and public pipeline." />
            <Link href="/admin/events" className="text-sm font-bold text-accent hover:underline">All events →</Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Users" value={operations.users} href="/admin/users" />
            <Metric label="Events" value={operations.events} href="/admin/events" />
            <Metric label="Venues" value={operations.venues} href="/admin/venues" />
            <Metric label="External" value={operations.externalEvents} href="/admin/external-events" />
            <Metric label="Coupons" value={couponCount ?? 0} href="/admin/coupons" />
            <Metric label="Lookups" value={lookupValueCount ?? 0} href="/admin/lookups" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <PipelineMetric label="Scheduled" value={operations.scheduledEvents} href="/admin/events?status=scheduled" />
            <PipelineMetric label="Active" value={operations.activeEvents} href="/admin/events?status=active" />
            <PipelineMetric label="Live" value={operations.liveEvents} href="/admin/events?status=live" />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <SectionHeading eyebrow="Fast access" title="Common actions" text="Shortcuts for tasks an administrator is likely to perform repeatedly." />
          <div className="mt-5 grid gap-2">
            <QuickAction href="/admin/events/new" label="Create an event" detail="Add an event directly as admin." />
            <QuickAction href="/admin/venues/new" label="Create a venue" detail="Add a new venue record." />
            <QuickAction href="/admin/intelligence/markets" label="Manage markets" detail="Create markets and link metro areas." />
            <QuickAction href="/admin/venue-owner-requests" label="Venue owner requests" detail="Review ownership/claim requests." />
            <QuickAction href="/admin/patron-pulse" label="Patron Pulse" detail="Operate live Pulse experiences." />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading eyebrow="Audit" title="Recent admin activity" text="The latest actions across moderation, payments, visibility, and management." />
            <Link href="/admin/activity" className="shrink-0 text-xs font-bold text-accent hover:underline">View all →</Link>
          </div>
          <div className="mt-5">
            <AdminActivityFeed items={globalActivity.items} compact />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <SectionHeading eyebrow="Lifecycle" title="Recent event changes" text="Newest transitions through the centralized event workflow." />
          <div className="mt-5 space-y-2">
            {operations.recentTransitions.length ? operations.recentTransitions.slice(0, 6).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            )) : (
              <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-white/45">No lifecycle activity recorded yet.</div>
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Workspaces" title="Administrative avenues" text="Major areas are grouped by purpose. The complete route set remains available in the persistent navigation and admin-tool finder." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Workspace href="/admin/intelligence" title="Intelligence" icon="◇" text="Signals, market behavior, baselines, and the Market Registry." />
          <Workspace href="/admin/discovery" title="Discovery" icon="⌕" text="Demand, searches, supply gaps, external events, and AI opportunities." />
          <Workspace href="/admin/patron-pulse" title="Experience" icon="♥" text="Patron Pulse, venue interaction, and live experience operations." />
          <Workspace href="/admin/linkdn" title="Connected Venues" icon="⇄" text="Linkd’N rooms, connections, and venue-to-venue opportunities." />
          <Workspace href="/admin/payments" title="Revenue" icon="$" text="Payments, coupons, plans, exceptions, refunds, and overrides." />
          <Workspace href="/admin/users" title="People" icon="♙" text="Users, ambassadors, DJs, and venue-owner requests." />
          <Workspace href="/admin/settings" title="Platform Control" icon="⚙" text="Settings, configuration, lookups, and system health." />
          <Workspace href="/admin/analytics" title="Reporting" icon="▥" text="Platform analytics and performance reporting." />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-accent">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-white/45 sm:text-sm sm:leading-6">{text}</p>
    </div>
  );
}

function StatusChip({ label, active = false }: { label: string; active?: boolean }) {
  return <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border-white/10 bg-white/5 text-white/55'}`}>{label}</span>;
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-accent/35">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </Link>
  );
}

function PipelineMetric({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-accent/35">
      <span className="text-sm font-bold text-white/70">{label}</span>
      <span className="text-xl font-black text-white">{value}</span>
    </Link>
  );
}

function QuickAction({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-accent/35 hover:bg-white/[0.04]">
      <div>
        <p className="text-sm font-bold text-white group-hover:text-accent">{label}</p>
        <p className="mt-1 text-xs text-white/35">{detail}</p>
      </div>
      <span className="text-accent">→</span>
    </Link>
  );
}

function Workspace({ href, title, icon, text }: { href: string; title: string; icon: string; text: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-accent/35 hover:bg-white/[0.055]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-lg text-accent">{icon}</div>
      <h3 className="mt-4 font-black text-white group-hover:text-accent">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-white/40">{text}</p>
    </Link>
  );
}

function ActivityItem({ activity }: { activity: OperationsActivity }) {
  return (
    <Link href={`/admin/events/${activity.event_id}`} className="block rounded-xl border border-white/10 bg-black/20 p-3 transition hover:border-accent/30">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{activity.event_name}</p>
          <p className="mt-1 text-xs text-white/35">{formatStatus(activity.from_status || 'created')} → {formatStatus(activity.to_status)}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">{formatActor(activity.changed_by_role)}</span>
      </div>
    </Link>
  );
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatActor(value: string | null) {
  if (!value) return 'System';
  return formatStatus(value);
}
