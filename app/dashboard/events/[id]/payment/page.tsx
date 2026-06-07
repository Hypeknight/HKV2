import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProceedToEventPaymentButton from '@/components/events/ProceedToEventPaymentButton';
import { applyEventCoupon } from './actions';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    canceled?: string;
    coupon?: string;
  }>;
};

export default async function EventPaymentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !event) notFound();

  const originalTotal = Number(event.total_price || 0);
  const discountAmount = Number(event.discount_amount || 0);
  const amountDue = Number(
    event.discounted_total ?? event.payment_amount ?? event.total_price ?? 0
  );

  const isPaid = event.payment_status === 'paid' || event.is_paid === true;

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Event Payment
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">{event.name}</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Complete payment or apply a valid event coupon before the event moves
          into admin approval.
        </p>
      </div>

      {query.canceled ? (
        <Notice tone="yellow" text="Checkout was canceled. You can restart payment anytime." />
      ) : null}

      {query.coupon === 'applied' ? (
        <Notice tone="green" text="Coupon applied successfully." />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Payment Summary</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Event Status" value={event.status} />
            <Info label="Payment Status" value={event.payment_status || 'pending'} />
            <Info label="Original Total" value={`$${originalTotal.toFixed(2)}`} />
            <Info label="Discount" value={`$${discountAmount.toFixed(2)}`} />
            <Info label="Amount Due" value={`$${amountDue.toFixed(2)}`} />
            <Info label="Coupon" value={event.coupon_code || '—'} />
          </div>

          {isPaid ? (
            <div className="mt-8 rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-green-100">
              This event payment is complete. The event is ready for admin review.
            </div>
          ) : (
            <div className="mt-8">
              <ProceedToEventPaymentButton eventId={event.id} />
            </div>
          )}

          <div className="mt-4">
            <Link
              href={`/dashboard/events/${event.id}/review`}
              className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
            >
              Back to Event Review
            </Link>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Apply Coupon</h2>
          <p className="mt-3 text-white/65">
            Enter a valid HypeKnight event coupon or promo code.
          </p>

          <form action={applyEventCoupon} className="mt-6 space-y-4">
            <input type="hidden" name="event_id" value={event.id} />

            <input
              name="coupon_code"
              placeholder="Coupon code"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />

            <button
              type="submit"
              className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-5 py-3 font-semibold text-accent hover:border-accent/40"
            >
              Apply Coupon
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
            If a coupon reduces the balance to $0.00, the event will be marked
            paid and moved into the admin approval queue.
          </div>
        </div>
      </section>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function Notice({
  text,
  tone,
}: {
  text: string;
  tone: 'green' | 'yellow';
}) {
  const classes =
    tone === 'green'
      ? 'border-green-500/20 bg-green-500/10 text-green-100'
      : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-100';

  return <div className={`rounded-2xl border p-4 ${classes}`}>{text}</div>;
}