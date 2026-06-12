/*
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOwnedVenues, getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const profile = await getProfile();
  if (!profile || !['admin', 'venue_owner'].includes(profile.app_role)) redirect('/dashboard');

  const venues = await getOwnedVenues(user.id);
  const { count: eventCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user.id);

  const created = typeof params.created === 'string' ? params.created : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
          <h1 className="mt-2 text-4xl font-bold text-white">Control room</h1>
        </div>
        <div className="flex gap-3">
          {/*<Link href="/dashboard/venues/new/step-1/" className="rounded-full border border-white/10 px-5 py-3 hover:border-accent/40">
            New venue
          </Link>*/}

        /*  
          <Link href="/dashboard/events/new/step-1/" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">
            New event
          </Link>
          <Link href="/admin/events" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">
          Moderate Events</Link>

          <Link href="/admin/discovery/" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">
          Discovery </Link>

          <Link href="/admin/external-events/" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">
          External Event Portal</Link>

          <Link href="/admin/venue-owner-requests/" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">
          Venue Owner Requests</Link>

          {/*<Link href="/admin/venues" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">
          Manage Venues</Link>*/}
/*
         <Link href="/admin/djs" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">
          Manage DJs
         </Link>

        </div>
        
      </div>
      {created ? (
        <p className="mb-6 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {created === 'venue' ? 'Venue created.' : 'Event created.'}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold text-white">Your access</h2>
            <p className="mt-3 text-sm text-white/70">Role: {profile.app_role}</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Venues</p>
                <p className="mt-2 text-2xl font-semibold text-white">{venues.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Events</p>
                <p className="mt-2 text-2xl font-semibold text-white">{eventCount ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold text-white">What changed from the old build</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li>Fresh Supabase schema instead of dragging old HostGator tables forward.</li>
              <li>Cleaner public pages for events and venues.</li>
              <li>Role-aware dashboard for admin and venue owners.</li>
              <li>Project structure ready for GitHub and Render deployment.</li>
            </ul>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white">Your venues</h2>
          <div className="mt-5 space-y-3">
            {venues.length ? (
              venues.map((venue) => (
                <div key={venue.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-semibold text-white">{venue.name}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {venue.city}, {venue.state} • {venue.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/60">
                No venues yet. Create one to begin publishing events.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
*/

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
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}