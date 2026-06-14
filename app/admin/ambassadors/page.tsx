import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  approveAmbassadorApplication,
  rejectAmbassadorApplication,
  suspendAmbassador,
  reactivateAmbassador,
  removeAmbassador,
  approveCouponRequest,
  rejectCouponRequest,
  disableCouponRequest,
} from './actions';
import { createAdminClient } from '@/lib/supabase/admin';
const adminSupabase = createAdminClient();

export default async function AdminAmbassadorsPage() {
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

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const [
    { data: applications },
    { data: ambassadors },
    { data: couponRequests },
    { data: commissions },
  ] = await Promise.all([
    adminSupabase
      .from('ambassador_applications')
      .select('*')
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('ambassador_profiles')
      .select('*')
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('ambassador_coupon_requests')
      .select('*')
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('ambassador_commissions')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  const applicationRows = applications ?? [];
  const ambassadorRows = ambassadors ?? [];
  const couponRows = couponRequests ?? [];
  const commissionRows = commissions ?? [];

  const pendingApplications = applicationRows.filter((app) => app.status === 'pending');
  const activeAmbassadors = ambassadorRows.filter((amb) => amb.status === 'active');
  const suspendedAmbassadors = ambassadorRows.filter((amb) => amb.status === 'suspended');
  const pendingCoupons = couponRows.filter((coupon) => coupon.status === 'pending');
  const activeCoupons = couponRows.filter((coupon) => coupon.status === 'active');

  const totalCommission = commissionRows.reduce(
    (sum, row) => sum + Number(row.commission_amount || 0),
    0
  );

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Admin
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            Ambassador Control Center
          </h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Review applications, approve ambassadors, activate coupon codes,
            suspend accounts, and monitor partner commissions.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Admin
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Pending Apps" value={String(pendingApplications.length)} />
        <Metric label="Active Ambassadors" value={String(activeAmbassadors.length)} />
        <Metric label="Suspended" value={String(suspendedAmbassadors.length)} />
        <Metric label="Pending Coupons" value={String(pendingCoupons.length)} />
        <Metric label="Commission" value={`$${totalCommission.toFixed(2)}`} />
      </section>

      <Panel title="Pending Applications">
        {pendingApplications.length ? (
          <div className="space-y-4">
            {pendingApplications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </div>
        ) : (
          <Empty text="No pending ambassador applications." />
        )}
      </Panel>

      <Panel title="Pending Coupon Requests">
        {pendingCoupons.length ? (
          <div className="space-y-4">
            {pendingCoupons.map((request) => (
              <CouponRequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <Empty text="No pending coupon requests." />
        )}
      </Panel>

      <Panel title="Active Ambassadors">
        {ambassadorRows.length ? (
          <div className="space-y-4">
            {ambassadorRows.map((ambassador) => (
              <AmbassadorCard key={ambassador.id} ambassador={ambassador} />
            ))}
          </div>
        ) : (
          <Empty text="No ambassador profiles yet." />
        )}
      </Panel>

      <Panel title="Active Coupon Requests">
        {activeCoupons.length ? (
          <div className="space-y-4">
            {activeCoupons.map((request) => (
              <ActiveCouponCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <Empty text="No active ambassador coupons yet." />
        )}
      </Panel>
    </section>
  );
}

function ApplicationCard({ application }: { application: any }) {
  return (
    <div className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-white">
              {application.first_name} {application.last_name}
            </h3>
            <Chip label={application.status} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Info label="Email" value={application.email} />
            <Info label="Phone" value={application.phone || '—'} />
            <Info label="Username" value={application.platform_username} />
            <Info label="Location" value={`${application.city}, ${application.state}`} />
            <Info label="Followers" value={String(application.estimated_followers || 0)} />
            <Info label="Submitted" value={formatDate(application.submitted_at)} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/65">
            {application.promotion_plan || 'No promotion plan provided.'}
          </div>

          <div className="mt-4 text-sm text-white/50">
            {[application.instagram_url, application.facebook_url, application.tiktok_url, application.youtube_url, application.website_url]
              .filter(Boolean)
              .join(' • ') || 'No social links provided.'}
          </div>
        </div>

        <div className="grid gap-3">
          <form action={approveAmbassadorApplication} className="space-y-3">
            <input type="hidden" name="application_id" value={application.id} />
            <textarea
              name="admin_notes"
              rows={2}
              placeholder="Admin notes"
              className="input"
            />
            <button className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-200 hover:border-green-500/40">
              Approve
            </button>
          </form>

          <form action={rejectAmbassadorApplication} className="space-y-3">
            <input type="hidden" name="application_id" value={application.id} />
            <textarea
              name="admin_notes"
              rows={2}
              placeholder="Rejection note"
              className="input"
            />
            <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 hover:border-red-500/40">
              Reject
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CouponRequestCard({ request }: { request: any }) {
  return (
    <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-white">{request.requested_code}</h3>
            <Chip label={request.status} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Info label="Discount" value={`${request.discount_percent}%`} />
            <Info label="Limit" value={String(request.usage_limit)} />
            <Info label="Created" value={formatDate(request.created_at)} />
          </div>
        </div>

        <div className="grid gap-3">
          <form action={approveCouponRequest} className="space-y-3">
            <input type="hidden" name="request_id" value={request.id} />
            <textarea
              name="admin_notes"
              rows={2}
              placeholder="Approval note"
              className="input"
            />
            <button className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-200 hover:border-green-500/40">
              Approve + Activate
            </button>
          </form>

          <form action={rejectCouponRequest} className="space-y-3">
            <input type="hidden" name="request_id" value={request.id} />
            <textarea
              name="admin_notes"
              rows={2}
              placeholder="Rejection note"
              className="input"
            />
            <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 hover:border-red-500/40">
              Reject
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AmbassadorCard({ ambassador }: { ambassador: any }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-white">
              Ambassador {ambassador.id.slice(0, 8)}
            </h3>
            <Chip label={ambassador.status} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Info label="Commission" value={`${ambassador.commission_rate}%`} />
            <Info label="Sales" value={`$${Number(ambassador.total_sales || 0).toFixed(2)}`} />
            <Info label="Commission" value={`$${Number(ambassador.total_commission || 0).toFixed(2)}`} />
            <Info label="Paid" value={`$${Number(ambassador.total_paid || 0).toFixed(2)}`} />
          </div>

          <p className="mt-4 break-all text-sm text-white/40">
            User ID: {ambassador.user_id}
          </p>
        </div>

        <div className="grid gap-3">
          {ambassador.status === 'suspended' ? (
            <form action={reactivateAmbassador}>
              <input type="hidden" name="ambassador_id" value={ambassador.id} />
              <button className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-200 hover:border-green-500/40">
                Reactivate
              </button>
            </form>
          ) : (
            <form action={suspendAmbassador} className="space-y-3">
              <input type="hidden" name="ambassador_id" value={ambassador.id} />
              <textarea
                name="admin_notes"
                rows={2}
                placeholder="Suspension note"
                className="input"
              />
              <button className="w-full rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-yellow-200 hover:border-yellow-500/40">
                Suspend
              </button>
            </form>
          )}

          <form action={removeAmbassador} className="space-y-3">
            <input type="hidden" name="ambassador_id" value={ambassador.id} />
            <textarea
              name="admin_notes"
              rows={2}
              placeholder="Removal note"
              className="input"
            />
            <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 hover:border-red-500/40">
              Remove
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ActiveCouponCard({ request }: { request: any }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-white">{request.requested_code}</h3>
            <Chip label={request.status} />
          </div>
          <p className="mt-3 text-white/60">
            {request.discount_percent}% off • Limit {request.usage_limit}
          </p>
        </div>

        <form action={disableCouponRequest}>
          <input type="hidden" name="request_id" value={request.id} />
          <button className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 hover:border-red-500/40">
            Disable Coupon
          </button>
        </form>
      </div>
    </div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
      <p className="mt-2 break-words text-white">{value}</p>
    </div>
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

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}