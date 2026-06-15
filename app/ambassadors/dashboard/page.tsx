import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AmbassadorDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const [{ data: application }, { data: ambassador }] = await Promise.all([
    supabase
      .from('ambassador_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ambassador_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (!application && !ambassador) {
    redirect('/ambassadors/apply');
  }

  const isActive = ambassador?.status === 'active';

  const [{ data: couponRequests }, { data: commissions }] = await Promise.all([
    supabase
      .from('ambassador_coupon_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ambassador_commissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const commissionRows = commissions ?? [];
  const pending = commissionRows
    .filter((row) => row.status === 'pending_event_completion')
    .reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);

  const eligible = commissionRows
    .filter((row) => ['eligible', 'approved'].includes(row.status))
    .reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);

  const paid = commissionRows
    .filter((row) => row.status === 'paid')
    .reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);

  const generated = commissionRows.reduce(
    (sum, row) => sum + Number(row.net_paid_amount || 0),
    0
  );

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Ambassador Dashboard
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          HypeKnight Partner Network
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Track your approval status, coupon requests, referrals, and commission
          eligibility.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Chip label={`Application: ${application?.status || 'none'}`} />
          <Chip label={`Ambassador: ${ambassador?.status || 'not active'}`} />
        </div>

        {!isActive ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-yellow-100/80">
            Your ambassador account must be approved and active before you can
            create coupon requests.
          </div>
        ) : (
          <Link
            href="/ambassadors/coupons"
            className="mt-6 inline-flex rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Request Coupon Code
          </Link>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Generated Sales" value={`$${generated.toFixed(2)}`} />
        <Metric label="Pending Commission" value={`$${pending.toFixed(2)}`} />
        <Metric label="Eligible / Approved" value={`$${eligible.toFixed(2)}`} />
        <Metric label="Paid Commission" value={`$${paid.toFixed(2)}`} />
      </section>

      <Panel title="Coupon Requests">
        {couponRequests?.length ? (
          <div className="space-y-4">
            {couponRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{request.requested_code}</h3>
                  <Chip label={request.status} />
                </div>
                <p className="mt-2 text-white/60">
                  {request.discount_percent}% off • Limit {request.usage_limit}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No coupon requests yet." />
        )}
      </Panel>

      <Panel title="Commission Activity">
        {commissionRows.length ? (
          <div className="space-y-4">
            {commissionRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{row.coupon_code}</h3>
                  <Chip label={row.status} />
                </div>
                <p className="mt-2 text-white/60">
                  Net paid: ${Number(row.net_paid_amount || 0).toFixed(2)} •
                  Commission: ${Number(row.commission_amount || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No commission activity yet." />
        )}
      </Panel>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/65">
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
      {text}
    </div>
  );
}