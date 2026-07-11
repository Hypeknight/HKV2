import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role, display_name')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const [
    { count: userCount },
    { count: eventCount },
    { count: venueCount },
    { count: externalCount },
    { count: couponCount },
    { count: submittedCount },
    { count: paidAwaitingApprovalCount },
    { count: scheduledCount },
    { count: activeCount },
    { count: revisionCount },
    { count: removalCount },
    { count: rejectedCount },
    { count: lookupValueCount },
  ] = await Promise.all([
    countRows(supabase, 'profiles'),
    countRows(supabase, 'events'),
    countRows(supabase, 'venues'),
    countRows(supabase, 'external_events'),
    countRows(supabase, 'event_coupons'),

    countEventsByStatuses(supabase, ['submitted']),
    countEventsByStatuses(supabase, [
      'paid_awaiting_approval',
      'approved_awaiting_payment',
    ]),
    countEventsByStatuses(supabase, ['scheduled']),
    countEventsByStatuses(supabase, ['active', 'live']),
    countEventsByStatuses(supabase, [
      'revision_draft',
      'revision_submitted',
    ]),
    countEventsByStatuses(supabase, [
      'removal_requested',
      'refund_requested',
    ]),
    countEventsByStatuses(supabase, ['rejected']),
    countRows(supabase, 'lookup_values'),
  ]);

  const reviewQueue =
    Number(submittedCount || 0) +
    Number(paidAwaitingApprovalCount || 0) +
    Number(revisionCount || 0);

  const attentionQueue =
    reviewQueue +
    Number(removalCount || 0) +
    Number(rejectedCount || 0);

  const displayName =
    profile?.display_name ||
    user.email?.split('@')[0] ||
    'Administrator';

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-accent sm:text-sm">
              HypeKnight Administration
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Command the platform.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Welcome back, {displayName}. Review event activity, handle
              priority queues, manage platform configuration, and keep
              HypeKnight discovery moving.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatusChip
                label={`${reviewQueue} awaiting review`}
                tone={reviewQueue ? 'yellow' : 'green'}
              />

              <StatusChip
                label={`${removalCount || 0} removal requests`}
                tone={removalCount ? 'red' : 'neutral'}
              />

              <StatusChip
                label={`${activeCount || 0} active events`}
                tone="green"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Needs Attention
            </p>

            <p className="mt-3 text-6xl font-black text-white">
              {attentionQueue}
            </p>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Events currently waiting for review, revision, rejection
              follow-up, removal, or refund handling.
            </p>

            <Link
              href="/admin/events"
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Open Event Queue
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Metric
          label="Users"
          value={userCount ?? 0}
          href="/admin/users"
        />

        <Metric
          label="Events"
          value={eventCount ?? 0}
          href="/admin/events"
        />

        <Metric
          label="Venues"
          value={venueCount ?? 0}
          href="/admin/venues"
        />

        <Metric
          label="External"
          value={externalCount ?? 0}
          href="/admin/external-events"
        />

        <Metric
          label="Coupons"
          value={couponCount ?? 0}
          href="/admin/coupons"
        />

        <Metric
          label="Lookups"
          value={lookupValueCount ?? 0}
          href="/admin/lookups"
          accent
        />
      </section>

      <section>
        <SectionTitle
          eyebrow="Event Operations"
          title="Event lifecycle queues"
          text="Monitor the event pipeline and move listings through review, payment, revision, scheduling, and public discovery."
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QueueCard
            title="Submitted"
            value={submittedCount ?? 0}
            description="New events waiting for moderation."
            href="/admin/events?status=submitted"
            tone="blue"
          />

          <QueueCard
            title="Payment / Approval"
            value={paidAwaitingApprovalCount ?? 0}
            description="Events waiting on payment or final approval."
            href="/admin/events?status=paid_awaiting_approval"
            tone="yellow"
          />

          <QueueCard
            title="Revisions"
            value={revisionCount ?? 0}
            description="Owner changes waiting for another review."
            href="/admin/events?status=revision_submitted"
            tone="purple"
          />

          <QueueCard
            title="Removal Requests"
            value={removalCount ?? 0}
            description="Events requesting removal or refund review."
            href="/admin/events?status=removal_requested"
            tone="red"
          />

          <QueueCard
            title="Scheduled"
            value={scheduledCount ?? 0}
            description="Approved events waiting for their live window."
            href="/admin/events?status=scheduled"
            tone="purple"
          />

          <QueueCard
            title="Active / Live"
            value={activeCount ?? 0}
            description="Events currently eligible for discovery."
            href="/admin/events?status=active"
            tone="green"
          />

          <QueueCard
            title="Rejected"
            value={rejectedCount ?? 0}
            description="Listings requiring owner correction."
            href="/admin/events?status=rejected"
            tone="red"
          />

          <QueueCard
            title="All Events"
            value={eventCount ?? 0}
            description="Open the complete event inventory."
            href="/admin/events"
            tone="neutral"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Daily Operations"
          title="Manage HypeKnight"
          text="Core tools for events, users, venues, ambassadors, and moderation."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            icon="🎟️"
            title="Event Management"
            description="Approve, reject, revise, schedule, remove, and monitor HypeKnight events."
            href="/admin/events"
            badge={reviewQueue ? `${reviewQueue} waiting` : undefined}
            accent
          />

          <AdminCard
            icon="⚔️"
            title="Ambassador Management"
            description="Review applications, referral activity, coupons, and ambassador performance."
            href="/admin/ambassadors"
          />

          <AdminCard
            icon="🏢"
            title="Venue Management"
            description="Manage venue profiles, verification, ownership, and visibility."
            href="/admin/venues"
          />

          <AdminCard
            icon="👥"
            title="User Management"
            description="Review accounts, roles, permissions, and user activity."
            href="/admin/users"
          />

          <AdminCard
            icon="🛡️"
            title="Moderation Queue"
            description="Review flagged content, reports, restrictions, and moderation actions."
            href="/admin/moderation"
          />

          <AdminCard
            icon="📊"
            title="Analytics & Reporting"
            description="Monitor platform activity, event performance, traffic, and engagement."
            href="/admin/analytics"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Revenue"
          title="Payments and promotions"
          text="Control event purchases, coupon campaigns, refunds, and financial operations."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            icon="💳"
            title="Payments"
            description="Review Stripe payments, balances, overrides, refunds, and removal requests."
            href="/admin/payments"
          />

          <AdminCard
            icon="🏷️"
            title="Coupons"
            description="Create discounts, beta campaigns, ambassador codes, and usage rules."
            href="/admin/coupons"
          />

          <AdminCard
            icon="📈"
            title="Revenue Reporting"
            description="Review promotion sales, discounts, commissions, and refund activity."
            href="/admin/analytics"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Discovery"
          title="Demand, cities, and event supply"
          text="Understand what users are searching for and where HypeKnight needs more listings."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            icon="🌆"
            title="Discovery Center"
            description="Review searches, city demand, event gaps, and emerging platform trends."
            href="/admin/discovery"
          />

          <AdminCard
            icon="✨"
            title="AI Recommendations"
            description="Review system-generated opportunities and suggested platform actions."
            href="/admin/discovery/ai"
          />

          <AdminCard
            icon="🌐"
            title="External Events"
            description="Manage imported Ticketmaster and partner event listings."
            href="/admin/external-events"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Configuration"
          title="Platform control"
          text="Manage settings, selectable values, feature availability, and system health."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            icon="⚙️"
            title="Platform Settings"
            description="Control pricing, workflow rules, homepage modules, packages, and ambassador rules."
            href="/admin/settings"
            accent
          />

          <AdminCard
            icon="🧩"
            title="Platform Configuration"
            description="Manage event types, music, vibes, amenities, age rules, parking, and other selectable values."
            href="/admin/configuration"
          />

          <AdminCard
            icon="🩺"
            title="System Health"
            description="Monitor automation, cron activity, database status, and diagnostics."
            href="/admin/system"
          />
        </div>
      </section>
    </section>
  );
}

async function countRows(supabase: any, table: string) {
  return supabase
    .from(table)
    .select('*', {
      count: 'exact',
      head: true,
    });
}

async function countEventsByStatuses(
  supabase: any,
  statuses: string[]
) {
  return supabase
    .from('events')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .in('status', statuses);
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.28em] text-accent">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:text-base">
        {text}
      </p>
    </div>
  );
}

function AdminCard({
  icon,
  title,
  description,
  href,
  badge,
  accent = false,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-[2rem] border p-6 transition sm:p-8 ${
        accent
          ? 'border-accent/20 bg-accent/10 hover:border-accent/50'
          : 'border-white/10 bg-white/5 hover:border-accent/40 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-3xl">{icon}</span>

        {badge ? (
          <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            {badge}
          </span>
        ) : null}
      </div>

      <h3 className="mt-5 text-2xl font-black text-white group-hover:text-accent">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-white/65">
        {description}
      </p>

      <div className="mt-6 text-sm font-semibold text-accent">
        Open →
      </div>
    </Link>
  );
}

function QueueCard({
  title,
  value,
  description,
  href,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  tone:
    | 'blue'
    | 'yellow'
    | 'purple'
    | 'green'
    | 'red'
    | 'neutral';
}) {
  const classes: Record<string, string> = {
    blue: 'border-blue-500/20 bg-blue-500/10',
    yellow: 'border-yellow-500/20 bg-yellow-500/10',
    purple: 'border-purple-500/20 bg-purple-500/10',
    green: 'border-green-500/20 bg-green-500/10',
    red: 'border-red-500/20 bg-red-500/10',
    neutral: 'border-white/10 bg-white/5',
  };

  return (
    <Link
      href={href}
      className={`rounded-[1.75rem] border p-5 transition hover:border-accent/40 ${classes[tone]}`}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-white/50">
        {title}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>

      <p className="mt-3 text-sm leading-6 text-white/60">
        {description}
      </p>

      <p className="mt-5 text-sm font-semibold text-accent">
        Review →
      </p>
    </Link>
  );
}

function Metric({
  label,
  value,
  href,
  accent = false,
}: {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[1.5rem] border p-4 transition hover:border-accent/40 sm:p-5 ${
        accent
          ? 'border-accent/20 bg-accent/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-white">
        {value}
      </p>
    </Link>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const classes: Record<string, string> = {
    green:
      'border-green-500/20 bg-green-500/10 text-green-200',
    yellow:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-100',
    red:
      'border-red-500/20 bg-red-500/10 text-red-200',
    neutral:
      'border-white/10 bg-white/5 text-white/65',
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes[tone]}`}
    >
      {label}
    </span>
  );
}