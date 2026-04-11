import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditVenueLandingPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !venue) notFound();

  const { data: subscription } = await supabase
    .from('venue_subscriptions')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Manage Venue
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Manage your venue profile, hours, package setup, and review details.
          </p>
        </div>

        <Link
          href={`/venues/${venue.slug}`}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          View Venue Page
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Status" value={venue.status || '—'} />
        <StatCard label="Visibility" value={venue.is_visible ? 'On' : 'Off'} />
        <StatCard
          label="Billing"
          value={subscription?.billing_mode || 'Not set'}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard
          title="Step 1"
          text="Basic venue info such as name, address, city/state, links, and visibility."
          href={`/dashboard/venues/${venue.id}/edit/step-1`}
          buttonLabel="Edit Step 1"
        />

        <SectionCard
          title="Step 2"
          text="Venue details such as description, dress code, music profile, drink menu, RSVP, and table service."
          href={`/dashboard/venues/${venue.id}/edit/step-2`}
          buttonLabel="Edit Step 2"
        />

        <SectionCard
          title="Operating Hours"
          text="Set the venue’s open days and normal open/close times."
          href={`/dashboard/venues/${venue.id}/edit/hours`}
          buttonLabel="Edit Hours"
        />

        <SectionCard
          title="Step 3"
          text="Choose package, billing, lock-in, and enabled services."
          href={`/dashboard/venues/${venue.id}/edit/step-3`}
          buttonLabel="Edit Step 3"
        />
        <SectionCard
          title="Music Queue"
          text="Review, sort, and manage submitted music requests."
          href={`/dashboard/venues/${venue.id}/music-requests`}
          buttonLabel="Open Music Queue"
        />
        
        <SectionCard
          title="Review"
          text="Review everything before payment activation and final venue go-live setup."
          href={`/dashboard/venues/${venue.id}/review`}
          buttonLabel="Open Review"
        />

        <SectionCard
          title="Back to Venues"
          text="Return to your venue management dashboard."
          href="/dashboard/venues"
          buttonLabel="My Venues"
        />

                <SectionCard
          title="Presence / QR"
          text="Start and manage live venue sessions for in-venue verification."
          href={`/dashboard/venues/${venue.id}/presence`}
          buttonLabel="Manage Presence"
        />

        <SectionCard
          title="Moderation Queue"
          text="Review flagged, hidden, and pending-review comments."
          href={`/dashboard/venues/${venue.id}/moderation`}
          buttonLabel="Open Moderation"
        />
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  text,
  href,
  buttonLabel,
}: {
  title: string;
  text: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-white/70">{text}</p>
      <div className="mt-6">
        <Link
          href={href}
          className="inline-flex rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          {buttonLabel}
        </Link>
      </div>
    </div>
  );
}