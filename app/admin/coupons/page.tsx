import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createEventCoupon, toggleEventCoupon } from './actions';

type Props = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
  }>;
};

export default async function AdminCouponsPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};

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

  const { data: coupons, error } = await supabase
    .from('event_coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = coupons ?? [];
  const activeCoupons = rows.filter((coupon) => coupon.is_active);
  const inactiveCoupons = rows.filter((coupon) => !coupon.is_active);
  const expiredCoupons = rows.filter(
    (coupon) => coupon.expires_at && new Date(coupon.expires_at) < new Date()
  );

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Admin
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            Event Coupons
          </h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Create and manage event-only discount codes for HypeKnight event promotions.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Admin
        </Link>
      </div>

      {query.created ? (
        <Notice text="Coupon created." />
      ) : null}

      {query.updated ? (
        <Notice text="Coupon updated." />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Coupons" value={String(rows.length)} />
        <Metric label="Active" value={String(activeCoupons.length)} />
        <Metric label="Inactive" value={String(inactiveCoupons.length)} />
        <Metric label="Expired" value={String(expiredCoupons.length)} />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Create Coupon</h2>
        <p className="mt-2 text-white/65">
          Event coupons apply to event promotion checkout only.
        </p>

        <form action={createEventCoupon} className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Code">
              <input
                name="code"
                required
                placeholder="HYPE25"
                className="input"
              />
            </Field>

            <Field label="Name">
              <input
                name="name"
                placeholder="Launch Promo"
                className="input"
              />
            </Field>

            <Field label="Max Redemptions">
              <input
                name="max_redemptions"
                type="number"
                min="1"
                placeholder="100"
                className="input"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              name="description"
              rows={3}
              placeholder="Optional internal description"
              className="input"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Discount Type">
              <select name="discount_type" defaultValue="fixed" className="input">
                <option value="fixed">Fixed Amount</option>
                <option value="percent">Percent</option>
              </select>
            </Field>

            <Field label="Fixed Amount">
              <input
                name="discount_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="10.00"
                className="input"
              />
            </Field>

            <Field label="Percent">
              <input
                name="discount_percent"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="25"
                className="input"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Starts At">
              <input
                name="starts_at"
                type="datetime-local"
                className="input"
              />
            </Field>

            <Field label="Expires At">
              <input
                name="expires_at"
                type="datetime-local"
                className="input"
              />
            </Field>
          </div>

          <button
            type="submit"
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Create Coupon
          </button>
        </form>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Coupon List</h2>

        {rows.length ? (
          <div className="mt-6 space-y-4">
            {rows.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60">
            No coupons created yet.
          </div>
        )}
      </section>
    </section>
  );
}

function CouponCard({ coupon }: { coupon: any }) {
  const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-white">{coupon.code}</h3>
            <Chip label={coupon.is_active ? 'Active' : 'Inactive'} />
            {expired ? <Chip label="Expired" danger /> : null}
          </div>

          <p className="mt-2 text-white/70">{coupon.name || 'Unnamed coupon'}</p>

          {coupon.description ? (
            <p className="mt-2 text-sm text-white/50">{coupon.description}</p>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Type" value={coupon.discount_type} />
            <Info
              label="Discount"
              value={
                coupon.discount_type === 'fixed'
                  ? `$${Number(coupon.discount_amount || 0).toFixed(2)}`
                  : `${Number(coupon.discount_percent || 0)}%`
              }
            />
            <Info
              label="Redemptions"
              value={`${coupon.redemption_count || 0}${
                coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ''
              }`}
            />
            <Info
              label="Expires"
              value={
                coupon.expires_at
                  ? new Date(coupon.expires_at).toLocaleString()
                  : 'No expiration'
              }
            />
          </div>
        </div>

        <form action={toggleEventCoupon}>
          <input type="hidden" name="coupon_id" value={coupon.id} />
          <input
            type="hidden"
            name="is_active"
            value={coupon.is_active ? 'true' : 'false'}
          />
          <button
            type="submit"
            className={
              coupon.is_active
                ? 'rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-red-300 hover:border-red-500/40'
                : 'rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-3 text-green-300 hover:border-green-500/40'
            }
          >
            {coupon.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-sm font-medium text-white">{label}</p>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-2 text-white">{value || '—'}</p>
    </div>
  );
}

function Chip({
  label,
  danger = false,
}: {
  label: string;
  danger?: boolean;
}) {
  return (
    <span
      className={
        danger
          ? 'rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-300'
          : 'rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70'
      }
    >
      {label}
    </span>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">
      {text}
    </div>
  );
}