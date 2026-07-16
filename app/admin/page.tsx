import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getOperationsSummary,
  type OperationsActivity,
} from '@/lib/admin/operations';
import { getAdminActivity } from '@/lib/admin/activity';
import AdminActivityFeed from '@/components/admin/AdminActivityFeed';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('app_role, display_name')
      .eq('id', user.id)
      .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const [
    operations,
    globalActivity,
    { count: couponCount, error: couponError },
    { count: lookupValueCount, error: lookupError },
    { count: rejectedCount, error: rejectedError },
  ] = await Promise.all([
    getOperationsSummary(),

    getAdminActivity(supabase, {
      page: 1,
      pageSize: 8,
    }),

    supabase
      .from('event_coupons')
      .select('*', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('lookup_values')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .is('archived_at', null),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'rejected'),
  ]);

  const supplementalErrors = [
    couponError,
    lookupError,
    rejectedError,
  ].filter(Boolean);

  if (supplementalErrors.length) {
    throw new Error(
      supplementalErrors
        .map((error) => error?.message)
        .filter(Boolean)
        .join(' | ')
    );
  }

  const reviewQueue =
    operations.pendingModeration +
    operations.pendingRevisions;

  const requestQueue =
    operations.removalRequests +
    operations.refundRequests;

  const attentionQueue =
    reviewQueue +
    requestQueue +
    operations.paymentExceptions +
    Number(rejectedCount ?? 0);

  const publicPipelineCount =
    operations.scheduledEvents +
    operations.activeEvents +
    operations.liveEvents;

  const displayName =
    profile.display_name ||
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
              Welcome back, {displayName}. Review event activity,
              handle priority queues, manage platform configuration,
              and keep HypeKnight discovery moving.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatusChip
                label={`${reviewQueue} awaiting review`}
                tone={reviewQueue ? 'yellow' : 'green'}
              />

              <StatusChip
                label={`${requestQueue} removal or refund requests`}
                tone={requestQueue ? 'red' : 'neutral'}
              />

              <StatusChip
                label={`${publicPipelineCount} public-pipeline events`}
                tone="green"
              />

              <StatusChip
                label={`${operations.paymentExceptions} payment exceptions`}
                tone={
                  operations.paymentExceptions
                    ? 'red'
                    : 'neutral'
                }
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
              Events waiting for moderation, revision review,
              payment handling, owner follow-up, removal, or refund
              decisions.
            </p>

            <div className="mt-5 grid gap-3">
              <Link
                href="/admin/events"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
              >
                Open Event Queue
              </Link>

              <Link
                href="/admin/activity"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-semibold text-white hover:border-accent/40"
              >
                Open Activity Center
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PriorityMetric
          label="Pending Moderation"
          value={operations.pendingModeration}
          text="New events awaiting an administrator decision."
          href="/admin/events?status=submitted"
          tone={
            operations.pendingModeration
              ? 'yellow'
              : 'neutral'
          }
        />

        <PriorityMetric
          label="Pending Revisions"
          value={operations.pendingRevisions}
          text="Owner revisions waiting for review."
          href="/admin/events?status=revision_submitted"
          tone={
            operations.pendingRevisions
              ? 'yellow'
              : 'neutral'
          }
        />

        <PriorityMetric
          label="Removal / Refund"
          value={requestQueue}
          text="Requests needing customer-service action."
          href="/admin/events?status=removal_requested"
          tone={requestQueue ? 'red' : 'neutral'}
        />

        <PriorityMetric
          label="Payment Exceptions"
          value={operations.paymentExceptions}
          text="Payment and approval states needing attention."
          href="/admin/payments"
          tone={
            operations.paymentExceptions
              ? 'red'
              : 'neutral'
          }
        />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Metric
          label="Users"
          value={operations.users}
          href="/admin/users"
        />

        <Metric
          label="Events"
          value={operations.events}
          href="/admin/events"
        />

        <Metric
          label="Venues"
          value={operations.venues}
          href="/admin/venues"
        />

        <Metric
          label="External"
          value={operations.externalEvents}
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
          eyebrow="Live Operations"
          title="Public event pipeline"
          text="Monitor approved events as they move from scheduling into active promotion and live event operation."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <OperationalCard
            title="Scheduled"
            value={operations.scheduledEvents}
            description="Approved events waiting for their promotion or event window."
            href="/admin/events?status=scheduled"
            tone="blue"
          />

          <OperationalCard
            title="Active"
            value={operations.activeEvents}
            description="Events currently visible in active HypeKnight discovery."
            href="/admin/events?status=active"
            tone="green"
          />

          <OperationalCard
            title="Live"
            value={operations.liveEvents}
            description="Events currently taking place or marked live."
            href="/admin/events?status=live"
            tone="purple"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Event Operations"
          title="Event lifecycle queues"
          text="Move listings through review, payment, revision, scheduling, public discovery, and customer-service workflows."
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QueueCard
            title="Moderation Queue"
            value={operations.pendingModeration}
            description="Submitted, paid, or approved-unpaid events awaiting the next decision."
            href="/admin/events?status=submitted"
            tone="blue"
          />

          <QueueCard
            title="Revisions"
            value={operations.pendingRevisions}
            description="Owner changes waiting for administrator review."
            href="/admin/events?status=revision_submitted"
            tone="purple"
          />

          <QueueCard
            title="Removal Requests"
            value={operations.removalRequests}
            description="Owners requesting that an event be removed."
            href="/admin/events?status=removal_requested"
            tone="red"
          />

          <QueueCard
            title="Refund Requests"
            value={operations.refundRequests}
            description="Refund requests requiring a financial decision."
            href="/admin/payments?status=refund_requested"
            tone="red"
          />

          <QueueCard
            title="Payment Exceptions"
            value={operations.paymentExceptions}
            description="Paid events awaiting review or approved events awaiting payment."
            href="/admin/payments"
            tone="yellow"
          />

          <QueueCard
            title="Rejected"
            value={rejectedCount ?? 0}
            description="Listings requiring owner correction or follow-up."
            href="/admin/events?status=rejected"
            tone="red"
          />

          <QueueCard
            title="Public Pipeline"
            value={publicPipelineCount}
            description="Scheduled, active, and live first-party events."
            href="/admin/events?status=scheduled"
            tone="green"
          />

          <QueueCard
            title="All Events"
            value={operations.events}
            description="Open the complete HypeKnight event inventory."
            href="/admin/events"
            tone="neutral"
          />
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            eyebrow="Administrative Activity"
            title="Recent platform operations"
            text="The latest administrative actions across moderation, revisions, payments, financial updates, visibility, and event management."
          />

          <Link
            href="/admin/activity"
            className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-semibold text-white hover:border-accent/40"
          >
            View Full Activity Center
          </Link>
        </div>

        <div className="mt-6">
          <AdminActivityFeed
            items={globalActivity.items}
            compact
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Platform Activity"
          title="Recent lifecycle changes"
          text="The newest event submissions, approvals, revisions, cancellations, removals, and automated transitions."
        />

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-8">
          {operations.recentTransitions.length ? (
            <div className="space-y-3">
              {operations.recentTransitions.map(
                (activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                  />
                )
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <p className="font-semibold text-white">
                No lifecycle activity recorded yet.
              </p>

              <p className="mt-2 text-sm leading-6 text-white/50">
                New transitions will appear here after events move
                through the centralized lifecycle engine.
              </p>
            </div>
          )}

          <Link
            href="/admin/events"
            className="mt-5 inline-flex text-sm font-semibold text-accent hover:underline"
          >
            Open full event inventory →
          </Link>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Daily Operations"
          title="Manage HypeKnight"
          text="Core tools for events, users, venues, ambassadors, moderation, and platform reporting."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            icon="🎟️"
            title="Event Management"
            description="Approve, reject, revise, schedule, remove, and monitor HypeKnight events."
            href="/admin/events"
            badge={
              reviewQueue
                ? `${reviewQueue} waiting`
                : undefined
            }
            accent
          />

          <AdminCard
            icon="🧭"
            title="Activity Center"
            description="Review administrative operations, audit changes, trace decisions, and open affected records."
            href="/admin/activity"
            badge={
              globalActivity.total
                ? `${globalActivity.total} records`
                : undefined
            }
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
          text="Control event purchases, coupon campaigns, payment overrides, refunds, and financial operations."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            icon="💳"
            title="Payments"
            description="Review Stripe payments, balances, overrides, refunds, and removal requests."
            href="/admin/payments"
            badge={
              operations.paymentExceptions
                ? `${operations.paymentExceptions} exceptions`
                : undefined
            }
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

function ActivityItem({
  activity,
}: {
  activity: OperationsActivity;
}) {
  return (
    <Link
      href={`/admin/events/${activity.event_id}`}
      className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-accent/30 hover:bg-white/[0.04]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white group-hover:text-accent">
              {activity.event_name}
            </p>

            <StatusBadge
              status={activity.to_status}
            />
          </div>

          <p className="mt-2 text-sm text-white/55">
            {activity.from_status
              ? formatStatus(
                  activity.from_status
                )
              : 'Created'}
            {' → '}
            {formatStatus(activity.to_status)}
          </p>

          {activity.reason ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/40">
              {activity.reason}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-accent">
            {formatActor(
              activity.changed_by_role
            )}
          </p>

          <p className="mt-1 text-xs text-white/35">
            {formatDate(activity.created_at)}
          </p>

          <p className="mt-1 text-xs text-white/30">
            {formatStatus(activity.source)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function PriorityMetric({
  label,
  value,
  text,
  href,
  tone,
}: {
  label: string;
  value: number;
  text: string;
  href: string;
  tone: 'neutral' | 'yellow' | 'red';
}) {
  const classes = {
    neutral: 'border-white/10 bg-white/5',
    yellow:
      'border-yellow-500/20 bg-yellow-500/10',
    red:
      'border-red-500/20 bg-red-500/10',
  };

  return (
    <Link
      href={href}
      className={`rounded-[1.75rem] border p-5 transition hover:border-accent/40 ${classes[tone]}`}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-white/55">
        {text}
      </p>

      <p className="mt-4 text-sm font-semibold text-accent">
        Review →
      </p>
    </Link>
  );
}

function OperationalCard({
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
  tone: 'blue' | 'green' | 'purple';
}) {
  const classes = {
    blue:
      'border-blue-500/20 bg-blue-500/10',
    green:
      'border-green-500/20 bg-green-500/10',
    purple:
      'border-purple-500/20 bg-purple-500/10',
  };

  return (
    <Link
      href={href}
      className={`rounded-[2rem] border p-6 transition hover:scale-[1.01] hover:border-accent/40 ${classes[tone]}`}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
        {title}
      </p>

      <p className="mt-3 text-5xl font-black text-white">
        {value}
      </p>

      <p className="mt-3 text-sm leading-6 text-white/55">
        {description}
      </p>

      <p className="mt-5 text-sm font-semibold text-accent">
        Open queue →
      </p>
    </Link>
  );
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
  const classes = {
    blue:
      'border-blue-500/20 bg-blue-500/10',
    yellow:
      'border-yellow-500/20 bg-yellow-500/10',
    purple:
      'border-purple-500/20 bg-purple-500/10',
    green:
      'border-green-500/20 bg-green-500/10',
    red:
      'border-red-500/20 bg-red-500/10',
    neutral:
      'border-white/10 bg-white/5',
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
  tone:
    | 'green'
    | 'yellow'
    | 'red'
    | 'neutral';
}) {
  const classes = {
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

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const classes: Record<string, string> = {
    submitted:
      'border-blue-500/20 bg-blue-500/10 text-blue-200',
    paid_awaiting_approval:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    approved_unpaid:
      'border-orange-500/20 bg-orange-500/10 text-orange-200',
    approved_awaiting_payment:
      'border-orange-500/20 bg-orange-500/10 text-orange-200',
    revision_submitted:
      'border-purple-500/20 bg-purple-500/10 text-purple-200',
    scheduled:
      'border-indigo-500/20 bg-indigo-500/10 text-indigo-200',
    active:
      'border-green-500/20 bg-green-500/10 text-green-200',
    live:
      'border-green-500/20 bg-green-500/10 text-green-200',
    rejected:
      'border-red-500/20 bg-red-500/10 text-red-200',
    removal_requested:
      'border-orange-500/20 bg-orange-500/10 text-orange-200',
    refund_requested:
      'border-orange-500/20 bg-orange-500/10 text-orange-200',
    cancelled:
      'border-red-500/20 bg-red-500/10 text-red-200',
    removed:
      'border-white/10 bg-white/5 text-white/50',
    archived:
      'border-purple-500/20 bg-purple-500/10 text-purple-200',
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        classes[status] ||
        'border-white/10 bg-white/5 text-white/65'
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatActor(
  role: string | null
) {
  switch (role) {
    case 'admin':
      return 'Administrator';

    case 'owner':
      return 'Event Owner';

    case 'payment':
      return 'Payment';

    case 'automation':
      return 'Automation';

    case 'system':
      return 'System';

    default:
      return 'Unknown';
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(date);
}