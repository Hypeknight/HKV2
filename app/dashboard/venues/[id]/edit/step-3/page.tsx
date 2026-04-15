import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateVenueStep3 } from '@/app/dashboard/venues/actions';

type Props = {
  params: Promise<{ id: string }>;
};

const PLAN_OPTIONS = [
  {
    code: 'entertainer_3m',
    name: 'Entertainer',
    tier: 'entertainer',
    duration: 3,
    monthly: 75,
    prepaid: 210,
    includedEvents: 6,
    includesComments: false,
    includesDjRequests: false,
    includesLinkdnLite: false,
    includesLinkdnFull: false,
    description: 'Basic venue profile with long-term visibility.',
  },
  {
    code: 'promoter_3m',
    name: 'Promoter',
    tier: 'promoter',
    duration: 3,
    monthly: 175,
    prepaid: 495,
    includedEvents: 10,
    includesComments: true,
    includesDjRequests: true,
    includesLinkdnLite: false,
    includesLinkdnFull: false,
    description: 'Adds engagement tools like comments and music requests.',
  },
  {
    code: 'hype_lite_3m',
    name: 'Hype Lite',
    tier: 'hype_lite',
    duration: 3,
    monthly: 350,
    prepaid: 990,
    includedEvents: 12,
    includesComments: true,
    includesDjRequests: true,
    includesLinkdnLite: true,
    includesLinkdnFull: false,
    description: 'Venue gets the lighter Linkd’N layer and stronger discovery.',
  },
  {
    code: 'hype_full_3m',
    name: 'Hype Full',
    tier: 'hype_full',
    duration: 3,
    monthly: 700,
    prepaid: 1995,
    includedEvents: 16,
    includesComments: true,
    includesDjRequests: true,
    includesLinkdnLite: false,
    includesLinkdnFull: true,
    description: 'Full HypeKnight and Linkd’N venue experience with premium features.',
  },
];

export default async function VenueStep3Page({ params }: Props) {
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

  const { data: subscriptionFeatures } = subscription
    ? await supabase
        .from('venue_subscription_features')
        .select('*')
        .eq('venue_subscription_id', subscription.id)
        .maybeSingle()
    : { data: null };

  const selectedPlanCode = subscription?.plan_definition_id
    ? undefined
    : 'entertainer_3m';

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Create Venue</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Step 3: Package + Payment Setup</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Choose the venue package, services, and billing structure. This stage prepares the venue
          for review and payment activation.
        </p>
      </div>

      <form action={updateVenueStep3} className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <input type="hidden" name="venue_id" value={venue.id} />

        <div className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Choose Package</h2>
            <div className="mt-6 grid gap-4">
              {PLAN_OPTIONS.map((plan) => (
                <label
                  key={plan.code}
                  className="block rounded-2xl border border-white/10 bg-black/20 p-5 text-white"
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="radio"
                      name="plan_code"
                      value={plan.code}
                      defaultChecked={
                        (subscription?.plan_definition_id ? false : plan.code === selectedPlanCode) ||
                        false
                      }
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold">{plan.name}</h3>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/70">
                          {plan.tier}
                        </span>
                      </div>
                      <p className="mt-2 text-white/70">{plan.description}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <MiniStat label="Duration" value={`${plan.duration} months`} />
                        <MiniStat label="Monthly" value={`$${plan.monthly}`} />
                        <MiniStat label="Prepaid" value={`$${plan.prepaid}`} />
                        <MiniStat label="Included Events" value={String(plan.includedEvents)} />
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Billing</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block rounded-2xl border border-white/10 bg-black/20 p-5 text-white">
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="billing_mode"
                    value="monthly"
                    defaultChecked={subscription?.billing_mode !== 'prepaid'}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="text-lg font-semibold">Monthly</p>
                    <p className="mt-2 text-white/70">
                      Pay by month. Good for flexibility and ongoing adjustments.
                    </p>
                  </div>
                </div>
              </label>

              <label className="block rounded-2xl border border-white/10 bg-black/20 p-5 text-white">
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="billing_mode"
                    value="prepaid"
                    defaultChecked={subscription?.billing_mode === 'prepaid'}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="text-lg font-semibold">Prepaid</p>
                    <p className="mt-2 text-white/70">
                      Pay upfront for the duration. Best for locked-in placement.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white">
              <input
                type="checkbox"
                name="lock_in"
                value="yes"
                defaultChecked={subscription?.lock_in || false}
                className="h-4 w-4"
              />
              <span>Lock in the selected package for the chosen duration</span>
            </label>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Optional Service Add-ons</h2>
            <p className="mt-3 text-white/70">
              Use these if the selected package does not already include them.
            </p>

            <div className="mt-6 grid gap-4">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white">
                <input
                  type="checkbox"
                  name="comments_enabled"
                  value="yes"
                  defaultChecked={subscriptionFeatures?.comments_enabled || false}
                  className="h-4 w-4"
                />
                <span>Live Comments</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white">
                <input
                  type="checkbox"
                  name="dj_requests_enabled"
                  value="yes"
                  defaultChecked={subscriptionFeatures?.dj_requests_enabled || false}
                  className="h-4 w-4"
                />
                <span>DJ / Music Request System</span>
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <label className="mb-2 block text-sm font-medium text-white">Linkd’N Mode</label>
                <select
                  name="linkdn_mode"
                  defaultValue={subscriptionFeatures?.linkdn_mode || 'none'}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                >
                  <option value="none">No Linkd’N</option>
                  <option value="lite">Linkd’N Lite</option>
                  <option value="full">Linkd’N Full</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link
              href={`/dashboard/venues/${venue.id}/edit/hours`}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
            >
              Back to Hours
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Continue to Review
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-accent">Paywall Status</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Payment required before go-live</h2>
            <p className="mt-4 text-white/75">
              This venue stays in draft/review mode until payment is activated or an admin override is applied.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">What happens next</h2>
            <div className="mt-5 space-y-4 text-white/75">
              <p>1. Save package and features</p>
              <p>2. Review venue details</p>
              <p>3. Activate payment or admin override</p>
              <p>4. Venue becomes publicly eligible after subscription activation</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Pricing Notes</h2>
            <p className="mt-4 text-white/75">
              Package and service totals are saved into the subscription records at this step.
              Final public activation still depends on payment and admin workflow.
            </p>
          </div>
        </aside>
      </form>
    </section>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}