import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
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

export default async function VenueDetailPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .maybeSingle();

    viewerRole = profile?.app_role || 'user';
  }

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (venueError || !venue) notFound();

  const isOwner = !!user && venue.owner_id === user.id;
  const isAdmin = viewerRole === 'admin';
  const canView = (venue.status === 'active' && venue.is_visible) || isOwner || isAdmin;

  if (!canView) notFound();

  const { data: featureProfile } = await supabase
    .from('venue_feature_profiles')
    .select('*')
    .eq('venue_id', venue.id)
    .maybeSingle();

  const { data: hours } = await supabase
    .from('venue_hours')
    .select('*')
    .eq('venue_id', venue.id)
    .order('day_of_week', { ascending: true });

  const { data: subscription } = await supabase
    .from('venue_subscriptions')
    .select('*')
    .eq('venue_id', venue.id)
    .maybeSingle();

  const { data: subscriptionFeatures } = subscription
    ? await supabase
        .from('venue_subscription_features')
        .select('*')
        .eq('venue_subscription_id', subscription.id)
        .maybeSingle()
    : { data: null };

  const { data: usage } = subscription
    ? await supabase
        .from('venue_subscription_usage')
        .select('*')
        .eq('venue_subscription_id', subscription.id)
        .maybeSingle()
    : { data: null };

  const { data: plan } = subscription?.plan_definition_id
    ? await supabase
        .from('venue_plan_definitions')
        .select('*')
        .eq('id', subscription.plan_definition_id)
        .maybeSingle()
    : { data: null };

  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, name, slug, event_start_at, status, is_public')
    .eq('venue_id', venue.id)
    .eq('is_public', true)
    .gte('event_start_at', new Date().toISOString())
    .order('event_start_at', { ascending: true })
    .limit(8);

  const { data: pastEvents } = await supabase
    .from('events')
    .select('id, name, slug, event_start_at, status')
    .eq('venue_id', venue.id)
    .lt('event_start_at', new Date().toISOString())
    .order('event_start_at', { ascending: false })
    .limit(8);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-accent">
                  Venue
                </p>
                <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
                <p className="mt-3 text-white/70">
                  {venue.city}, {venue.state}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">
                Status: <span className="font-semibold">{venue.status}</span>
              </div>
            </div>

            {venue.cover_image_url ? (
              <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={venue.cover_image_url}
                  alt={venue.name}
                  className="h-auto w-full object-cover"
                />
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Info label="Address" value={venue.address} />
              <Info label="City / State" value={`${venue.city}, ${venue.state}`} />
              <Info label="Website" value={venue.website_url} />
              <Info label="Instagram" value={venue.instagram_url} />
              <Info label="Visibility" value={venue.is_visible ? 'Visible' : 'Hidden'} />
              <Info label="Plan" value={plan?.name || '—'} />
            </div>

            <Block label="Description" value={venue.description} />

            {featureProfile?.special_message_enabled && venue.special_message ? (
              <Block label="Special Message" value={venue.special_message} />
            ) : null}

            {featureProfile?.general_info ? (
              <Block label="General Information" value={featureProfile.general_info} />
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Operating Hours</h2>

            {hours?.length ? (
              <div className="mt-6 space-y-3">
                {hours.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-white">
                      <span className="font-semibold">
                        {DAY_NAMES[row.day_of_week]}
                      </span>{' '}
                      — {row.is_open ? `${row.open_time || '—'} to ${row.close_time || '—'}` : 'Closed'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-white/70">No operating hours available yet.</p>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Venue Profile</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {featureProfile?.dress_code_enabled && (
                <Info label="Dress Code" value={featureProfile?.dress_code} />
              )}
              {featureProfile?.music_profile_enabled && (
                <Info
                  label="Music Profile"
                  value={
                    Array.isArray(featureProfile?.music_profile)
                      ? featureProfile.music_profile.join(', ')
                      : '—'
                  }
                />
              )}
              {featureProfile?.drink_menu_enabled && (
                <Info label="Drink Menu" value="Enabled" />
              )}
              {featureProfile?.rsvp_enabled && <Info label="RSVP" value="Enabled" />}
              {featureProfile?.table_service_enabled && (
                <Info label="Table Service" value="Enabled" />
              )}
              {subscriptionFeatures?.comments_enabled && (
                <Info label="Live Comments" value="Enabled" />
              )}
              {subscriptionFeatures?.dj_requests_enabled && (
                <Info label="DJ Requests" value="Enabled" />
              )}
              {subscriptionFeatures?.linkdn_mode &&
                subscriptionFeatures.linkdn_mode !== 'none' && (
                  <Info
                    label="Linkd'N"
                    value={subscriptionFeatures.linkdn_mode}
                  />
                )}
            </div>

            {featureProfile?.drink_menu_enabled && featureProfile?.drink_menu_notes ? (
              <Block label="Drink Menu Notes" value={featureProfile.drink_menu_notes} />
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>

            {upcomingEvents?.length ? (
              <div className="mt-6 space-y-3">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 text-white hover:border-accent/40"
                  >
                    <p className="font-semibold">{event.name}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {event.event_start_at
                        ? new Date(event.event_start_at).toLocaleString()
                        : '—'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-white/70">No upcoming events listed yet.</p>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Past HypeKnight Events</h2>

            {pastEvents?.length ? (
              <div className="mt-6 space-y-3">
                {pastEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 text-white hover:border-accent/40"
                  >
                    <p className="font-semibold">{event.name}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {event.event_start_at
                        ? new Date(event.event_start_at).toLocaleString()
                        : '—'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-white/70">No venue event history yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Venue Summary</h2>

            <div className="mt-6 space-y-4">
              <SummaryRow label="Status" value={venue.status} />
              <SummaryRow label="Visibility" value={venue.is_visible ? 'On' : 'Off'} />
              <SummaryRow label="Plan" value={plan?.name || '—'} />
              <SummaryRow label="Billing" value={subscription?.billing_mode || '—'} />
              <SummaryRow label="Lock-In" value={subscription?.lock_in ? 'Yes' : 'No'} />
              <SummaryRow
                label="Included Events"
                value={String(usage?.included_event_posts ?? 0)}
              />
              <SummaryRow
                label="Used Events"
                value={String(usage?.used_event_posts ?? 0)}
              />
            </div>
          </div>

          {isOwner && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Owner Controls</h2>
              <div className="mt-6 space-y-3">
                <Link
                  href={`/dashboard/venues/${venue.id}/edit`}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Manage Venue
                </Link>

                <Link
                  href="/dashboard/venues"
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Back to My Venues
                </Link>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Admin Access</h2>
              <div className="mt-6 space-y-3">
                <Link
                  href={`/admin/venues/${venue.id}`}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Open Admin Venue Review
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
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

function SummaryRow({
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