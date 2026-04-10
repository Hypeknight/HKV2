import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateVenueStep3 } from '@/app/dashboard/venues/actions';
import VenueStep3Form from '@/components/venues/VenueStep3Form';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenueStep3Page({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, owner_id, name')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) notFound();

  const { data: plans, error: plansError } = await supabase
    .from('venue_plan_definitions')
    .select('*')
    .eq('is_active', true)
    .order('tier', { ascending: true });

  if (plansError) throw new Error(plansError.message);

  const { data: subscription } = await supabase
    .from('venue_subscriptions')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  const { data: features } = subscription
    ? await supabase
        .from('venue_subscription_features')
        .select('*')
        .eq('venue_subscription_id', subscription.id)
        .maybeSingle()
    : { data: null };

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Create Venue</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Step 3: Plan + Features</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Choose the package, billing model, and service access for this venue.
        </p>
      </div>

      <VenueStep3Form
        venueId={venue.id}
        plans={plans || []}
        currentPlanId={subscription?.plan_definition_id}
        currentBillingMode={subscription?.billing_mode}
        currentLockIn={subscription?.lock_in}
        currentFeatures={features}
        action={updateVenueStep3}
      />
    </section>
  );
}