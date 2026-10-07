import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireVenueManagement } from '@/lib/venues/require-management';

type Props = {
  params: Promise<{ id: string }>;
};

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default async function VenueProfilePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  await requireVenueManagement(id);
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)

    .single();

  if (venueError || !venue) notFound();

  const { data: featureProfile } = await supabase
    .from('venue_feature_profiles')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  const { data: interactionSettings } = await supabase
    .from('venue_interaction_settings')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  const { data: hours } = await supabase
    .from('venue_hours')
    .select('*')
    .eq('venue_id', id)
    .order('day_of_week', { ascending: true });

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Venue Profile</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Review your Venue Core details, operating information, and public presentation.
          </p>
        </div>

        <Link
          href={`/dashboard/venues/${venue.id}`}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Overview
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <Panel
            title="Step 1 — Venue Basics"
            actionHref={`/dashboard/venues/${venue.id}/edit/step-1`}
            actionLabel="Edit Step 1"
          >
            <Grid>
              <Info label="Venue Name" value={venue.name} />
              <Info label="Slug" value={venue.slug} />
              <Info label="Address" value={venue.address} />
              <Info label="City / State" value={`${venue.city}, ${venue.state}`} />
              <Info label="Website" value={venue.website_url} />
              <Info label="Instagram" value={venue.instagram_url} />
              <Info label="Visible" value={venue.is_visible ? 'Yes' : 'No'} />
              <Info label="Current Status" value={venue.status} />
            </Grid>

            <Block label="Description" value={venue.description} />
          </Panel>

          <Panel
            title="Step 2 — Venue Profile"
            actionHref={`/dashboard/venues/${venue.id}/edit/step-2`}
            actionLabel="Edit Step 2"
          >
            <Grid>
              <Info label="Dress Code" value={featureProfile?.dress_code} />
              <Info
                label="Music Profile"
                value={
                  Array.isArray(featureProfile?.music_profile)
                    ? featureProfile.music_profile.join(', ')
                    : '—'
                }
              />
              <Info
                label="Drink Menu Enabled"
                value={featureProfile?.drink_menu_enabled ? 'Yes' : 'No'}
              />
              <Info label="RSVP Enabled" value={featureProfile?.rsvp_enabled ? 'Yes' : 'No'} />
              <Info
                label="Table Service Enabled"
                value={featureProfile?.table_service_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="Special Message Enabled"
                value={featureProfile?.special_message_enabled ? 'Yes' : 'No'}
              />
            </Grid>

            <Block label="Drink Menu Notes" value={featureProfile?.drink_menu_notes} />
            <Block label="General Information" value={featureProfile?.general_info} />
            <Block label="Special Message" value={venue.special_message} />
          </Panel>

          <Panel
            title="Operating Hours"
            actionHref={`/dashboard/venues/${venue.id}/edit/hours`}
            actionLabel="Edit Hours"
          >
            {hours?.length ? (
              <div className="space-y-3">
                {hours.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-white">
                      <span className="font-semibold">{DAY_NAMES[row.day_of_week]}</span>{' '}
                      — {row.is_open ? `${row.open_time || '—'} to ${row.close_time || '—'}` : 'Closed'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/70">No operating hours added yet.</p>
            )}
          </Panel>

          <Panel
            title="Live Interaction Setup"
            actionHref={`/dashboard/venues/${venue.id}/interactions`}
            actionLabel="Manage Interactions"
          >
            <Grid>
              <Info
                label="Comments Enabled"
                value={interactionSettings?.comments_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="Comment Retention"
                value={
                  interactionSettings?.comment_retention_hours
                    ? `${interactionSettings.comment_retention_hours} hours`
                    : '—'
                }
              />
              <Info
                label="Comments Require Presence"
                value={interactionSettings?.comments_require_presence ? 'Yes' : 'No'}
              />
              <Info
                label="Music Requests Enabled"
                value={interactionSettings?.music_requests_enabled ? 'Yes' : 'No'}
              />
              <Info
                label="Music Requests Require Presence"
                value={interactionSettings?.music_requests_require_presence ? 'Yes' : 'No'}
              />
              <Info
                label="Auto Filter Enabled"
                value={interactionSettings?.comments_auto_filter_enabled ? 'Yes' : 'No'}
              />
            </Grid>


          </Panel>
        </div>


      </div>
    </section>
  );
}

function Panel({
  title,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Grid({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>{children}</div>;
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

function Block({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-white">{value || '—'}</p>
    </div>
  );
}

function QuickRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/60">{label}</span>
      <span className="text-right text-white">{value || '—'}</span>
    </div>
  );
}

function money(value: number | string | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}
