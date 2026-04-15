import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminVenuesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: venues, error } = await supabase
    .from('venues')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  const venueIds = (venues ?? []).map((venue) => venue.id);

  const { data: subscriptions, error: subscriptionsError } = venueIds.length
    ? await supabase
        .from('venue_subscriptions')
        .select('*')
        .in('venue_id', venueIds)
    : { data: [], error: null };

  if (subscriptionsError) throw new Error(subscriptionsError.message);

  const { data: planDefinitions, error: plansError } = await supabase
    .from('venue_plan_definitions')
    .select('id, name, tier, code');

  if (plansError) throw new Error(plansError.message);

  const subscriptionByVenueId = new Map(
    (subscriptions ?? []).map((subscription) => [subscription.venue_id, subscription])
  );

  const planById = new Map(
    (planDefinitions ?? []).map((plan) => [plan.id, plan])
  );

  const enrichedVenues = (venues ?? []).map((venue) => {
    const subscription = subscriptionByVenueId.get(venue.id) || null;
    const plan = subscription?.plan_definition_id
      ? planById.get(subscription.plan_definition_id) || null
      : null;

    return {
      ...venue,
      subscription,
      plan,
    };
  });

  const needsAttention = enrichedVenues.filter((venue) => {
    const subscription = venue.subscription;

    return (
      !!venue.removal_requested_at ||
      venue.refund_requested === true ||
      venue.status === 'pending_payment' ||
      venue.status === 'suspended' ||
      (subscription && subscription.subscription_status === 'past_due') ||
      (venue.status === 'active' && venue.is_visible !== true)
    );
  });

  const attentionIds = new Set(needsAttention.map((venue) => venue.id));

  const activeVisible = enrichedVenues.filter((venue) => {
    const subscription = venue.subscription;

    return (
      !attentionIds.has(venue.id) &&
      venue.status === 'active' &&
      venue.is_visible === true &&
      (!subscription || subscription.is_active === true)
    );
  });

  const activeIds = new Set(activeVisible.map((venue) => venue.id));

  const draftPending = enrichedVenues.filter((venue) =>
    !attentionIds.has(venue.id) &&
    !activeIds.has(venue.id) &&
    ['draft', 'pending_payment'].includes(venue.status)
  );

  const hiddenRemoved = enrichedVenues.filter((venue) =>
    !attentionIds.has(venue.id) &&
    !activeIds.has(venue.id) &&
    !draftPending.some((v) => v.id === venue.id) &&
    (['hidden', 'removed', 'archived', 'suspended'].includes(venue.status) ||
      venue.is_visible === false)
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Venue Management</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Review venue records, monitor subscription state, and quickly identify venues that need attention.
          </p>
        </div>

        <Link
          href="/admin/venue-plans"
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          View Venue Plans
        </Link>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Needs Attention"
          value={String(needsAttention.length)}
          tone="orange"
        />
        <MetricCard
          label="Active / Visible"
          value={String(activeVisible.length)}
          tone="green"
        />
        <MetricCard
          label="Draft / Pending"
          value={String(draftPending.length)}
          tone="yellow"
        />
        <MetricCard
          label="Hidden / Removed"
          value={String(hiddenRemoved.length)}
          tone="gray"
        />
      </div>

      <div className="space-y-12">
        <AdminSection
          title="Needs Attention"
          subtitle="Venues with removal requests, refund requests, payment issues, or visibility mismatches."
        >
          {needsAttention.length ? (
            <div className="space-y-6">
              {needsAttention.map((venue) => (
                <VenueAdminCard key={venue.id} venue={venue} mode="attention" />
              ))}
            </div>
          ) : (
            <EmptyState text="No venues currently need urgent attention." />
          )}
        </AdminSection>

        <AdminSection
          title="Active / Visible"
          subtitle="Healthy venues that are active and publicly visible."
        >
          {activeVisible.length ? (
            <div className="space-y-6">
              {activeVisible.map((venue) => (
                <VenueAdminCard key={venue.id} venue={venue} mode="active" />
              ))}
            </div>
          ) : (
            <EmptyState text="No active visible venues right now." />
          )}
        </AdminSection>

        <AdminSection
          title="Draft / Pending"
          subtitle="Venues still in setup, review, or waiting on payment."
        >
          {draftPending.length ? (
            <div className="space-y-6">
              {draftPending.map((venue) => (
                <VenueAdminCard key={venue.id} venue={venue} mode="pending" />
              ))}
            </div>
          ) : (
            <EmptyState text="No draft or pending venues right now." />
          )}
        </AdminSection>

        <AdminSection
          title="Hidden / Removed / Suspended"
          subtitle="Venues that are not currently live to the public."
        >
          {hiddenRemoved.length ? (
            <div className="space-y-6">
              {hiddenRemoved.map((venue) => (
                <VenueAdminCard key={venue.id} venue={venue} mode="inactive" />
              ))}
            </div>
          ) : (
            <EmptyState text="No hidden, removed, or suspended venues." />
          )}
        </AdminSection>
      </div>
    </section>
  );
}

function VenueAdminCard({
  venue,
  mode,
}: {
  venue: any;
  mode: 'attention' | 'active' | 'pending' | 'inactive';
}) {
  const cardTone =
    mode === 'attention'
      ? 'border-orange-500/20 bg-orange-500/10'
      : mode === 'active'
      ? 'border-green-500/20 bg-green-500/10'
      : mode === 'pending'
      ? 'border-yellow-500/20 bg-yellow-500/10'
      : 'border-white/10 bg-white/5';

  return (
    <div className={`rounded-[2rem] border p-6 ${cardTone}`}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="break-words text-2xl font-bold text-white">{venue.name}</h2>
            <StatusChip status={venue.status} />
            <VisibilityChip isVisible={venue.is_visible} />
            {venue.subscription?.subscription_status ? (
              <SubscriptionChip status={venue.subscription.subscription_status} />
            ) : null}
            {venue.removal_requested_at ? (
              <StateChip label="Removal Requested" tone="orange" />
            ) : null}
            {venue.refund_requested ? (
              <StateChip label="Refund Requested" tone="orange" />
            ) : null}
          </div>

          <p className="mt-2 text-white/65">
            {venue.city}, {venue.state}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Visible" value={venue.is_visible ? 'Yes' : 'No'} />
            <Info label="Featured" value={venue.is_featured ? 'Yes' : 'No'} />
            <Info label="Owner" value={venue.owner_id} />
            <Info
              label="Updated"
              value={venue.updated_at ? new Date(venue.updated_at).toLocaleString() : '—'}
            />
            <Info label="Plan" value={venue.plan?.name || '—'} />
            <Info label="Tier" value={venue.plan?.tier || '—'} />
            <Info label="Billing Mode" value={venue.subscription?.billing_mode || '—'} />
            <Info
              label="Subscription Active"
              value={venue.subscription?.is_active ? 'Yes' : 'No'}
            />
            <Info
              label="Subscription Status"
              value={venue.subscription?.subscription_status || '—'}
            />
            <Info
              label="Removal Requested"
              value={venue.removal_requested_at ? 'Yes' : 'No'}
            />
            <Info label="Refund Requested" value={venue.refund_requested ? 'Yes' : 'No'} />
            <Info label="Refund Decision" value={venue.refund_decision || '—'} />
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:items-stretch">
          <Link
            href={`/venues/${venue.slug}`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
          >
            View Public Page
          </Link>
          <Link
            href={`/dashboard/venues/${venue.id}/edit`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
          >
            Open Venue Manager
          </Link>
          <Link
            href={`/dashboard/venues/${venue.id}/moderation`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
          >
            Moderation Queue
          </Link>
          <Link
            href={`/dashboard/venues/${venue.id}/presence`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
          >
            Presence
          </Link>
          <Link
            href={`/admin/venues/${venue.id}`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
          >
            Admin Detail
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-white/65">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-sm text-white">{value || '—'}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
      {text}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'yellow' | 'orange' | 'green' | 'gray';
}) {
  const styles =
    tone === 'yellow'
      ? 'border-yellow-500/20 bg-yellow-500/10'
      : tone === 'orange'
      ? 'border-orange-500/20 bg-orange-500/10'
      : tone === 'green'
      ? 'border-green-500/20 bg-green-500/10'
      : 'border-white/10 bg-white/5';

  return (
    <div className={`rounded-3xl border p-5 ${styles}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status?: string | null }) {
  const tone =
    status === 'active'
      ? 'border-green-500/20 bg-green-500/10 text-green-200'
      : status === 'draft'
      ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
      : status === 'pending_payment'
      ? 'border-orange-500/20 bg-orange-500/10 text-orange-200'
      : status === 'suspended'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : status === 'removed'
      ? 'border-white/10 bg-black/20 text-white/70'
      : status === 'hidden'
      ? 'border-white/10 bg-black/20 text-white/70'
      : 'border-white/10 bg-black/20 text-white/70';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${tone}`}>
      {status || '—'}
    </span>
  );
}

function VisibilityChip({ isVisible }: { isVisible?: boolean | null }) {
  const styles = isVisible
    ? 'border-green-500/20 bg-green-500/10 text-green-200'
    : 'border-white/10 bg-black/20 text-white/70';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}>
      {isVisible ? 'Visible' : 'Hidden'}
    </span>
  );
}

function SubscriptionChip({ status }: { status?: string | null }) {
  const tone =
    status === 'active'
      ? 'border-green-500/20 bg-green-500/10 text-green-200'
      : status === 'pending_payment'
      ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
      : status === 'past_due'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : status === 'canceled'
      ? 'border-white/10 bg-black/20 text-white/70'
      : status === 'expired'
      ? 'border-white/10 bg-black/20 text-white/70'
      : 'border-white/10 bg-black/20 text-white/70';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${tone}`}>
      {status || 'no subscription'}
    </span>
  );
}

function StateChip({
  label,
  tone,
}: {
  label: string;
  tone: 'orange';
}) {
  const styles =
    tone === 'orange'
      ? 'border-orange-500/20 bg-orange-500/10 text-orange-200'
      : 'border-white/10 bg-black/20 text-white/70';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}>
      {label}
    </span>
  );
}