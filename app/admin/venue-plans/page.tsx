import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveVenuePlan } from '@/app/admin/venue-plans/actions';

export default async function AdminVenuePlansPage() {
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

  const { data: plans, error } = await supabase
    .from('venue_plan_definitions')
    .select('*')
    .order('tier', { ascending: true })
    .order('duration_months', { ascending: true });

  if (error) throw new Error(error.message);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Venue Plans</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Review current venue package definitions and pricing structure.
          </p>
        </div>

        <Link
          href="/admin/venues"
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Admin Venues
        </Link>
      </div>

      <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Create New Plan</h2>

        <form action={saveVenuePlan} className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <label htmlFor="code" className="mb-2 block text-sm font-medium text-white">
              Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-white">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="tier" className="mb-2 block text-sm font-medium text-white">
              Tier
            </label>
            <select
              id="tier"
              name="tier"
              defaultValue="entertainer"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            >
              <option value="entertainer">entertainer</option>
              <option value="promoter">promoter</option>
              <option value="hype_lite">hype_lite</option>
              <option value="hype_full">hype_full</option>
            </select>
          </div>

          <div>
            <label htmlFor="duration_months" className="mb-2 block text-sm font-medium text-white">
              Duration Months
            </label>
            <input
              id="duration_months"
              name="duration_months"
              type="number"
              min="1"
              required
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="base_monthly_price" className="mb-2 block text-sm font-medium text-white">
              Base Monthly Price
            </label>
            <input
              id="base_monthly_price"
              name="base_monthly_price"
              type="number"
              min="0"
              step="0.01"
              required
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="base_prepaid_price" className="mb-2 block text-sm font-medium text-white">
              Base Prepaid Price
            </label>
            <input
              id="base_prepaid_price"
              name="base_prepaid_price"
              type="number"
              min="0"
              step="0.01"
              required
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="included_event_posts" className="mb-2 block text-sm font-medium text-white">
              Included Event Posts
            </label>
            <input
              id="included_event_posts"
              name="included_event_posts"
              type="number"
              min="0"
              required
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            />
          </div>

          <div className="grid gap-4">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input type="checkbox" name="includes_comments" value="yes" className="h-4 w-4" />
              <span>Includes comments</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input type="checkbox" name="includes_dj_requests" value="yes" className="h-4 w-4" />
              <span>Includes DJ requests</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input type="checkbox" name="includes_linkdn_lite" value="yes" className="h-4 w-4" />
              <span>Includes Linkd'N Lite</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input type="checkbox" name="includes_linkdn_full" value="yes" className="h-4 w-4" />
              <span>Includes Linkd'N Full</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input type="checkbox" name="is_active" value="yes" defaultChecked className="h-4 w-4" />
              <span>Plan active</span>
            </label>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Save Plan
            </button>
          </div>
        </form>
      </div>

      {!plans?.length ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          No venue plans found.
        </div>
      ) : (
        <div className="space-y-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
                    <span className="rounded-full bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white">
                      {plan.tier}
                    </span>
                    <span className="rounded-full bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white">
                      {plan.is_active ? 'active' : 'inactive'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Info label="Code" value={plan.code} />
                    <Info label="Duration" value={`${plan.duration_months} months`} />
                    <Info label="Monthly" value={money(plan.base_monthly_price)} />
                    <Info label="Prepaid" value={money(plan.base_prepaid_price)} />
                    <Info label="Included Events" value={String(plan.included_event_posts || 0)} />
                    <Info label="Comments" value={plan.includes_comments ? 'Yes' : 'No'} />
                    <Info label="DJ Requests" value={plan.includes_dj_requests ? 'Yes' : 'No'} />
                    <Info label="Linkd’N Lite" value={plan.includes_linkdn_lite ? 'Yes' : 'No'} />
                    <Info label="Linkd’N Full" value={plan.includes_linkdn_full ? 'Yes' : 'No'} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="mt-2 text-sm text-white">{value || '—'}</p>
    </div>
  );
}

function money(value: number | string | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}