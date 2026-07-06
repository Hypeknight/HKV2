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
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('events')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('venues')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('external_events')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('event_coupons')
      .select('*', { count: 'exact', head: true }),
  ]);

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          HypeKnight Admin
        </p>

        <h1 className="mt-3 text-5xl font-black text-white">
          Command Center
        </h1>

        <p className="mt-4 max-w-3xl text-white/70">
          Manage events, users, payments, discovery, AI recommendations,
          system health, moderation, venues, and platform operations.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Users"
          value={String(userCount ?? 0)}
        />

        <Metric
          label="Events"
          value={String(eventCount ?? 0)}
        />

        <Metric
          label="Venues"
          value={String(venueCount ?? 0)}
        />

        <Metric
          label="External Events"
          value={String(externalCount ?? 0)}
        />

        <Metric
          label="Coupons"
          value={String(couponCount ?? 0)}
        />
      </section>

      <section>
        <SectionTitle
          title="Operations"
          text="Manage the day-to-day platform workflow."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            title="Event Management"
            description="Approve, reject, review, and monitor HypeKnight events."
            href="/admin/events"
          />
          <AdminCard
            title="Ambassador Management"
            description="Approve, reject, review, and monitor ambassador applications and coupons."
            href="/admin/ambassadors"
          />

          <AdminCard
            title="Venue Management"
            description="Manage venue profiles and venue visibility."
            href="/admin/venues"
          />

          <AdminCard
            title="User Management"
            description="View users, permissions, and account activity."
            href="/admin/users"
          />

          <AdminCard
            title="Moderation Queue"
            description="Review flagged content and moderation actions."
            href="/admin/moderation"
          />

          <AdminCard
            title="Analytics & Reporting"
            description="View platform metrics, event performance, and user engagement."
            href="/admin/analytics"
          />

        </div>
      </section>

      <section>
        <SectionTitle
          title="Revenue"
          text="Payments, coupons, refunds, and financial controls."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            title="Payments"
            description="Stripe settings, refunds, removals, and revenue."
            href="/admin/payments"
          />

          <AdminCard
            title="Coupons"
            description="Manage event discounts and promotional campaigns."
            href="/admin/coupons"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Discovery & AI"
          text="Monitor demand, city growth, and recommendation systems."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            title="Discovery Center"
            description="View city demand, searches, and platform trends."
            href="/admin/discovery"
          />

          <AdminCard
            title="AI Recommendations"
            description="Review and approve AI generated opportunities."
            href="/admin/discovery/ai"
          />

          <AdminCard
            title="External Events"
            description="Manage imported Ticketmaster and partner events."
            href="/admin/external-events"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          title="System"
          text="Platform health and automation monitoring."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            title="System Health"
            description="Cron status, automation health, and diagnostics."
            href="/admin/system"
          />
          <AdminCard
            title="Platform Settings"
            description="Control pricing, packages, homepage modules, and ambassador rules."
            href="/admin/settings"
          />

        </div>
      </section>
    </section>
  );
}

function SectionTitle({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-white">
        {title}
      </h2>

      <p className="mt-2 text-white/60">
        {text}
      </p>
    </div>
  );
}

function AdminCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[2rem] border border-white/10 bg-white/5 p-8 transition hover:border-accent/40 hover:bg-white/[0.07]"
    >
      <h3 className="text-2xl font-bold text-white group-hover:text-accent">
        {title}
      </h3>

      <p className="mt-4 text-white/65">
        {description}
      </p>

      <div className="mt-6 text-sm font-medium text-accent">
        Open →
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5"