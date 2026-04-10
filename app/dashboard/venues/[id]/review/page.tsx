import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenueReviewPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) notFound();

  const { data: featureProfile } = await supabase
    .from('venue_feature_profiles')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from('venue_subscriptions')
    .select('*')
    .eq('venue_id', id)
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

  const { data: hours } = await supabase
    .from('venue_hours')
    .select('*')
    .eq('venue_id', id)
    .order('day_of_week', { ascending: true });

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Create Venue</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Review Venue</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Review everything before payment activation is added.
        </p>
      </div>

      <div className="space-y-8">
        <Panel title="Basic Information">
          <Grid>
            <Info label="Venue Name" value={venue.name} />
            <Info label="Slug" value={venue.slug} />
            <Info label="Address" value={venue.address} />
            <Info label="City" value={venue.city} />
            <Info label="State" value={venue.state} />
            <Info label="Website" value={venue.website_url} />
            <Info label="Instagram" value={venue.instagram_url} />
            <Info label="Visibility" value={venue.is_visible ? 'On' : 'Off'} />
            <Info label="Status" value={venue.status} />
          </Grid>

          <div className="mt-6">
            <Link
              href={`/dashboard/venues/${venue.id}/edit/step-1`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Edit Step 1
            </Link>
          </div>
        </Panel>

        <Panel title="Venue Details">
          <Grid>
            <Info label="Dress Code" value={featureProfile?.dress_code} />
            <Info label="Drink Menu Enabled" value={featureProfile?.drink_menu_enabled ? 'Yes' : 'No'} />
            <Info label="RSVP Enabled" value={featureProfile?.rsvp_enabled ? 'Yes' : 'No'} />
            <Info label="Table Service Enabled" value={featureProfile?.table_service_enabled ? 'Yes' : 'No'} />
          </Grid>

          <Block label="Description" value={venue.description} />
          <Block label="Special Message" value={venue.special_message} />
          <Block label="General Info" value={featureProfile?.general_info} />
          <Block
            label="Music Profile"
            value={Array.isArray(featureProfile?.music_profile) ? featureProfile.music_profile.join(', ') : ''}
          />
          <Block label="Drink Menu Notes" value={featureProfile?.drink_menu_notes} />

          <div className="mt-6">
            <Link
              href={`/dashboard/venues/${venue.id}/edit/step-2`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Edit Step 2
            </Link>
          </div>
        </Panel>

        <Panel title="Operating Hours">
          {hours?.length ? (
            <div className="space-y-3">
              {hours.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-white">
                    <span className="font-semibold">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][row.day_of_week]}
                    </span>{' '}
                    — {row.is_open ? `${row.open_time || '—'} to ${row.close_time || '—'}` : 'Closed'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70">No operating hours set yet.</p>
          )}

          <div className="mt-6">
            <Link
              href={`/dashboard/venues/${venue.id}/edit/hours`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Edit Hours
            </Link>
          </div>
        </Panel>


        <Panel title="Plan + Features">
          <Grid>
            <Info label="Plan" value={plan?.name} />
            <Info label="Tier" value={plan?.tier} />
            <Info label="Duration" value={plan ? `${plan.duration_months} months` : '—'} />
            <Info label="Billing Mode" value={subscription?.billing_mode} />
            <Info label="Lock-In" value={subscription?.lock_in ? 'Yes' : 'No'} />
            <Info label="Monthly Price" value={money(subscription?.monthly_price)} />
            <Info label="Prepaid Total" value={money(subscription?.prepaid_total)} />
            <Info label="Current Period Price" value={money(subscription?.current_period_price)} />
            <Info label="Next Billing Amount" value={money(subscription?.next_billing_amount)} />
            <Info label="Comments" value={subscriptionFeatures?.comments_enabled ? 'Yes' : 'No'} />
            <Info label="DJ Requests" value={subscriptionFeatures?.dj_requests_enabled ? 'Yes' : 'No'} />
            <Info label="Linkd'N" value={subscriptionFeatures?.linkdn_mode} />
            <Info label="Included Event Posts" value={String(usage?.included_event_posts ?? 0)} />
          </Grid>

          <div className="mt-6">
            <Link
              href={`/dashboard/venues/${venue.id}/edit/step-3`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Edit Step 3
            </Link>
          </div>
        </Panel>

        <Panel title="Next Step">
          <p className="text-white/75">
            Payment activation comes next. Right now the venue is still a draft / pending-payment record.
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              href="/dashboard/venues"
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Back to My Venues
            </Link>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function Block({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-white">{value || '—'}</p>
    </div>
  );
}

function money(value: number | string | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}