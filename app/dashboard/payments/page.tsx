import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function UserPaymentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      slug,
      status,
      payment_status,
      is_paid,
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
      created_at
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = events ?? [];

  const paidEvents = rows.filter(
    (event) => event.is_paid || event.payment_status === 'paid'
  );

  const pendingEvents = rows.filter(
    (event) => !event.is_paid && event.payment_status !== 'paid'
  );

  const refundEvents = rows.filter(
    (event) => event.refund_status && event.refund_status !== 'none'
  );

  const totalPaid = paidEvents.reduce((total, event) => {
    return total + Number(event.payment_amount || event.discounted_total || event.total_price || 0);
  }, 0);

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Dashboard
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          My Payments
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Track your event payments, coupon discounts, and refund request status.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Paid" value={`$${totalPaid.toFixed(2)}`} />
        <Metric label="Paid Events" value={String(paidEvents.length)} />
        <Metric label="Pending Payments" value={String(pendingEvents.length)} />
        <Metric label="Refund Activity" value={String(refundEvents.length)} />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Payment History</h2>

        {rows.length ? (
          <div className="mt-6 space-y-4">
            {rows.map((event) => (
              <UserPaymentRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
            You do not have any payment records yet.
          </div>
        )}
      </section>
    </section>
  );
}

function UserPaymentRow({ event }: { event: any }) {
  const paid = event.is_paid || event.payment_status === 'paid';
  const amount = Number(event.payment_amount || event.discounted_total || event.total_price || 0);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white">{event.name}</h3>
            <Chip label={paid ? 'Paid' : 'Pending'} tone={paid ? 'green' : 'yellow'} />
            {event.refund_status && event.refund_status !== 'none' ? (
              <Chip label={`Refund: ${event.refund_status}`} tone="gray" />
            ) : null}
          </div>

          <p className="mt-2 text-white/60">
            Event status: {event.status} • Payment status:{' '}
            {event.payment_status || 'pending'}
          </p>

          <p className="mt-1 text-white/50">
            Amount: ${amount.toFixed(2)}
            {event.coupon_code
              ? ` • Coupon: ${event.coupon_code} • Discount: $${Number(
                  event.discount_amount || 0
                ).toFixed(2)}`
              : ''}
          </p>

          {event.refund_reason ? (
            <p className="mt-2 text-sm text-white/50">
              Refund reason: {event.refund_reason}
            </p>
          ) : null}

          {event.refund_admin_note ? (
            <p className="mt-2 text-sm text-white/50">
              Admin note: {event.refund_admin_note}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {paid ? (
            <Link
              href={`/events/${event.slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:border-accent/40"
            >
              View Event
            </Link>
          ) : (
            <Link
              href={`/dashboard/events/${event.id}/payment`}
              className="rounded-2xl bg-accent px-4 py-2 font-semibold text-black hover:opacity-90"
            >
              Continue Payment
            </Link>
          )}
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