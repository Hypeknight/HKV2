/*import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateStripeMode } from './actions';

export default async function AdminPaymentsPage() {
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

  const { data: settings } = await supabase
    .from('payment_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin Payments</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Stripe Control</h1>
        <p className="mt-3 text-white/70">
          Choose whether the site uses Stripe test mode or live mode.
        </p>

        <form action={updateStripeMode} className="mt-8 space-y-4">
          <select
            name="stripe_mode"
            defaultValue={settings?.stripe_mode || 'test'}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          >
            <option value="test">Sandbox / Test</option>
            <option value="live">Live</option>
          </select>

          <button
            type="submit"
            className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Save Stripe Mode
          </button>
        </form>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  approveRefundRequest,
  denyRefundRequest,
  markManualRefundComplete,
  updateStripeMode,
} from './actions';

export default async function AdminPaymentsPage() {
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

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      slug,
      owner_id,
      status,
      is_paid,
      payment_status,
      payment_amount,
      total_price,
      discounted_total,
      discount_amount,
      coupon_code,
      paid_at,
      refund_status,
      refund_requested_at,
      refund_reason,
      refund_admin_note,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      stripe_refund_id,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = events ?? [];

  const paidEvents = rows.filter(
    (event) => event.is_paid || event.payment_status === 'paid'
  );

  const pendingPayments = rows.filter(
    (event) => !event.is_paid && event.payment_status !== 'paid'
  );

  const refundRequests = rows.filter(
    (event) => event.refund_status === 'requested'
  );

  const refundedEvents = rows.filter(
    (event) => event.refund_status === 'refunded'
  );

  const couponEvents = rows.filter((event) => event.coupon_code);

  const revenue = paidEvents.reduce((total, event) => {
    return total + Number(event.payment_amount || event.discounted_total || event.total_price || 0);
  }, 0);

  const discounts = couponEvents.reduce((total, event) => {
    return total + Number(event.discount_amount || 0);
  }, 0);

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Admin
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            Payment Control Center
          </h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Track event payments, coupons, refunds, and revenue movement.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Admin
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Event Revenue" value={`$${revenue.toFixed(2)}`} />
        <Metric label="Paid Events" value={String(paidEvents.length)} />
        <Metric label="Pending Payments" value={String(pendingPayments.length)} />
        <Metric label="Refund Requests" value={String(refundRequests.length)} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Refunded" value={String(refundedEvents.length)} />
        <Metric label="Coupons Used" value={String(couponEvents.length)} />
        <Metric label="Discounts Given" value={`$${discounts.toFixed(2)}`} />
        <Metric label="Total Records" value={String(rows.length)} />
      </section>

      <Panel title="Refund Requests" subtitle="Events where users requested refund review.">
        {refundRequests.length ? (
          <div className="space-y-4">
            {refundRequests.map((event) => (
              <RefundRequestCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Empty text="No refund requests right now." />
        )}
      </Panel>

      <Panel title="Recent Payment Records" subtitle="Latest event payment and coupon activity.">
        {rows.length ? (
          <div className="space-y-4">
            {rows.slice(0, 25).map((event) => (
              <PaymentRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Empty text="No payment records yet." />
        )}
      </Panel>
    </section>
  );
}

function RefundRequestCard({ event }: { event: any }) {
  return (
    <div className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">{event.name}</h3>
          <p className="mt-2 text-yellow-100/80">
            Requested:{' '}
            {event.refund_requested_at
              ? new Date(event.refund_requested_at).toLocaleString()
              : '—'}
          </p>
          <p className="mt-2 text-white/70">
            Reason: {event.refund_reason || 'No reason provided.'}
          </p>
          <p className="mt-2 text-white/50">
            Amount: ${Number(event.payment_amount || event.total_price || 0).toFixed(2)}
          </p>
        </div>

        <div className="grid min-w-[260px] gap-3">
          <form action={approveRefundRequest} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <textarea
              name="refund_admin_note"
              rows={2}
              placeholder="Admin note"
              className="input"
            />
            <button className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-200 hover:border-green-500/40">
              Approve Refund
            </button>
          </form>

          <form action={denyRefundRequest} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <textarea
              name="refund_admin_note"
              rows={2}
              placeholder="Denial note"
              className="input"
            />
            <button className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 hover:border-red-500/40">
              Deny Refund
            </button>
          </form>

          <form action={markManualRefundComplete} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <input
              name="stripe_refund_id"
              placeholder="Stripe refund ID optional"
              className="input"
            />
            <textarea
              name="refund_admin_note"
              rows={2}
              placeholder="Completion note"
              className="input"
            />
            <button className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-accent hover:border-accent/40">
              Mark Refunded
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ event }: { event: any }) {
  const paid = event.is_paid || event.payment_status === 'paid';

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white">{event.name}</h3>
            <Chip label={paid ? 'Paid' : 'Pending'} tone={paid ? 'green' : 'yellow'} />
            <Chip label={event.refund_status || 'none'} tone="gray" />
          </div>

          <p className="mt-2 text-white/60">
            Status: {event.status} • Payment: {event.payment_status || 'pending'}
          </p>

          <p className="mt-1 text-white/50">
            Amount: ${Number(event.payment_amount || event.total_price || 0).toFixed(2)}
            {event.coupon_code ? ` • Coupon: ${event.coupon_code}` : ''}
          </p>

          <p className="mt-1 text-xs text-white/40">
            Session: {event.stripe_checkout_session_id || '—'} • Payment Intent:{' '}
            {event.stripe_payment_intent_id || '—'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {event.slug ? (
            <Link
              href={`/events/${event.slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:border-accent/40"
            >
              View
            </Link>
          ) : null}
        </div>
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

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-white/65">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}



function Chip({
  label,
  tone,
}: {
  label: string;
  tone: 'green' | 'yellow' | 'gray';
}) {
  const styles =
    tone === 'green'
      ? 'border-green-500/20 bg-green-500/10 text-green-200'
      : tone === 'yellow'
      ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
      : 'border-white/10 bg-white/5 text-white/60';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}>
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
}*/
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  approveRefundRequest,
  denyRefundRequest,
  markManualRefundComplete,
  updateStripeMode,
  approveRemovalRequest,
  denyRemovalRequest,
} from './actions';

export default async function AdminPaymentsPage() {
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

  const [{ data: settings }, { data: events, error }] = await Promise.all([
    supabase.from('payment_settings').select('*').limit(1).maybeSingle(),
    supabase
      .from('events')
      .select(`
        id,
        name,
        slug,
        status,
        is_paid,
        payment_status,
        payment_amount,
        total_price,
        discounted_total,
        discount_amount,
        coupon_code,
        paid_at,
        removal_requested_at,
        removal_reason,
        removal_admin_note,
        refund_requested,
        refund_status,
        refund_requested_at,
        refund_reason,
        refund_admin_note,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        stripe_refund_id,
        created_at
      `)
      .order('created_at', { ascending: false }),
  ]);

  if (error) throw new Error(error.message);

  const rows = events ?? [];

  const paidEvents = rows.filter(
    (event) => event.is_paid || event.payment_status === 'paid'
  );

  const pendingPayments = rows.filter(
    (event) => !event.is_paid && event.payment_status !== 'paid'
  );

  const removalRequests = rows.filter(
    (event) => event.status === 'removal_requested'
  );

  const refundRequests = rows.filter(
    (event) => event.refund_status === 'requested'
  );

  const refundedEvents = rows.filter(
    (event) => event.refund_status === 'refunded'
  );

  const couponEvents = rows.filter((event) => event.coupon_code);

  const revenue = paidEvents.reduce((total, event) => {
    return (
      total +
      Number(
        event.payment_amount ||
          event.discounted_total ||
          event.total_price ||
          0
      )
    );
  }, 0);

  const discounts = couponEvents.reduce((total, event) => {
    return total + Number(event.discount_amount || 0);
  }, 0);

  const currentStripeMode = settings?.stripe_mode || 'test';

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Admin
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            Payment Control Center
          </h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Control Stripe mode, track payments, monitor coupons, process
            removals, and manage refund requests.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Admin
        </Link>
      </div>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">
              Stripe Control
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              Payment Mode
            </h2>
            <p className="mt-3 text-white/70">
              Choose whether HypeKnight uses Stripe sandbox/test mode or live
              payment mode.
            </p>

            <div className="mt-5">
              <Chip
                label={`Current Mode: ${currentStripeMode}`}
                tone={currentStripeMode === 'live' ? 'green' : 'yellow'}
              />
            </div>
          </div>

          <form action={updateStripeMode} className="space-y-4">
            <select
              name="stripe_mode"
              defaultValue={currentStripeMode}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            >
              <option value="test">Sandbox / Test</option>
              <option value="live">Live</option>
            </select>

            <button
              type="submit"
              className="w-full rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Save Stripe Mode
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Event Revenue" value={`$${revenue.toFixed(2)}`} />
        <Metric label="Paid Events" value={String(paidEvents.length)} />
        <Metric label="Pending Payments" value={String(pendingPayments.length)} />
        <Metric label="Removal Requests" value={String(removalRequests.length)} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Refund Requests" value={String(refundRequests.length)} />
        <Metric label="Refunded" value={String(refundedEvents.length)} />
        <Metric label="Coupons Used" value={String(couponEvents.length)} />
        <Metric label="Discounts Given" value={`$${discounts.toFixed(2)}`} />
      </section>

      <Panel
        title="Removal Requests"
        subtitle="Events users requested to remove from HypeKnight."
      >
        {removalRequests.length ? (
          <div className="space-y-4">
            {removalRequests.map((event) => (
              <RemovalRequestCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Empty text="No removal requests right now." />
        )}
      </Panel>

      <Panel
        title="Refund Requests"
        subtitle="Events where users requested refund review."
      >
        {refundRequests.length ? (
          <div className="space-y-4">
            {refundRequests.map((event) => (
              <RefundRequestCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Empty text="No refund requests right now." />
        )}
      </Panel>

      <Panel
        title="Recent Payment Records"
        subtitle="Latest payment, coupon, removal, and refund activity."
      >
        {rows.length ? (
          <div className="space-y-4">
            {rows.slice(0, 25).map((event) => (
              <PaymentRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Empty text="No payment records yet." />
        )}
      </Panel>
    </section>
  );
}

function RemovalRequestCard({ event }: { event: any }) {
  return (
    <div className="rounded-[2rem] border border-orange-500/20 bg-orange-500/10 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">{event.name}</h3>
          <p className="mt-2 text-orange-100/80">
            Requested:{' '}
            {event.removal_requested_at
              ? new Date(event.removal_requested_at).toLocaleString()
              : '—'}
          </p>
          <p className="mt-2 text-white/70">
            Reason: {event.removal_reason || 'No reason provided.'}
          </p>
          <p className="mt-2 text-white/50">
            Refund requested: {event.refund_requested ? 'Yes' : 'No'}
          </p>
          <p className="mt-2 text-white/50">
            Refund status: {event.refund_status || 'none'}
          </p>
        </div>

        <div className="grid min-w-[260px] gap-3">
          <form action={approveRemovalRequest} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <textarea
              name="admin_note"
              rows={2}
              placeholder="Approval note"
              className="input"
            />
            <button
              type="submit"
              className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-200 hover:border-green-500/40"
            >
              Approve Removal
            </button>
          </form>

          <form action={denyRemovalRequest} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <textarea
              name="admin_note"
              rows={2}
              placeholder="Denial note"
              className="input"
            />
            <button
              type="submit"
              className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 hover:border-red-500/40"
            >
              Deny Removal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function RefundRequestCard({ event }: { event: any }) {
  return (
    <div className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">{event.name}</h3>
          <p className="mt-2 text-yellow-100/80">
            Requested:{' '}
            {event.refund_requested_at
              ? new Date(event.refund_requested_at).toLocaleString()
              : '—'}
          </p>
          <p className="mt-2 text-white/70">
            Reason: {event.refund_reason || event.removal_reason || 'No reason provided.'}
          </p>
          <p className="mt-2 text-white/50">
            Actual Paid: $
{Number(event.payment_amount ?? event.discounted_total ?? 0).toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-white/40">
            Payment Intent: {event.stripe_payment_intent_id || '—'}
          </p>
        </div>

        <div className="grid min-w-[260px] gap-3">
          <form action={approveRefundRequest} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <input
              name="refund_amount_approved"
              type="number"
              min="0"
              step="0.01"
              max={Number(event.payment_amount ?? event.discounted_total ?? 0)}
              defaultValue={Number(event.payment_amount ?? event.discounted_total ?? 0)}
              placeholder="Refund amount"
              className="input"
            />
            <textarea
              name="refund_admin_note"
              rows={2}
              placeholder="Admin note"
              className="input"
            />
            <button
              type="submit"
              className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-200 hover:border-green-500/40"
            >
              Approve Refund
            </button>
          </form>

          <form action={denyRefundRequest} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <textarea
              name="refund_admin_note"
              rows={2}
              placeholder="Denial note"
              className="input"
            />
            <button
              type="submit"
              className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 hover:border-red-500/40"
            >
              Deny Refund
            </button>
          </form>

          <form action={markManualRefundComplete} className="space-y-3">
            <input type="hidden" name="event_id" value={event.id} />

            <input
              name="refund_amount_refunded"
              type="number"
              min="0"
              step="0.01"
              max={Number(event.payment_amount ?? event.discounted_total ?? 0)}
              defaultValue={
                Number(
                  event.refund_amount_approved ??
                  event.payment_amount ??
                  event.discounted_total ??
                  0
                )
              }
              placeholder="Amount refunded"
              className="input"
            />

            <input
              name="stripe_refund_id"
              placeholder="Stripe refund ID optional"
              className="input"
            />
            <textarea
              name="refund_admin_note"
              rows={2}
              placeholder="Completion note"
              className="input"
            />
            <button
              type="submit"
              className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-accent hover:border-accent/40"
            >
              Mark Refunded
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ event }: { event: any }) {
  const paid = event.is_paid || event.payment_status === 'paid';

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white">{event.name}</h3>
            <Chip label={paid ? 'Paid' : 'Pending'} tone={paid ? 'green' : 'yellow'} />
            <Chip label={event.status || 'unknown'} tone="gray" />
            <Chip label={`Refund: ${event.refund_status || 'none'}`} tone="gray" />
          </div>

          <p className="mt-2 text-white/60">
            Payment: {event.payment_status || 'pending'}
          </p>

          <p className="mt-1 text-white/50">
            Amount: ${Number(event.payment_amount || event.total_price || 0).toFixed(2)}
            {event.coupon_code ? ` • Coupon: ${event.coupon_code}` : ''}
          </p>

          <p className="mt-1 text-xs text-white/40">
            Session: {event.stripe_checkout_session_id || '—'} • Payment
            Intent: {event.stripe_payment_intent_id || '—'} • Refund:{' '}
            {event.stripe_refund_id || '—'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {event.slug ? (
            <Link
              href={`/events/${event.slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:border-accent/40"
            >
              View
            </Link>
          ) : null}
        </div>
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

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-white/65">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: 'green' | 'yellow' | 'gray';
}) {
  const styles =
    tone === 'green'
      ? 'border-green-500/20 bg-green-500/10 text-green-200'
      : tone === 'yellow'
      ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
      : 'border-white/10 bg-white/5 text-white/60';

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}
    >
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