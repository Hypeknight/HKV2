import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  updateEventStep3,
  submitEventForModeration,
} from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import EventStep3Form from '@/components/events/EventStep3Form';

type Step3PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventStep3Page({ params }: Step3PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const settings = await getPlatformSettings();

  const extraDayPrice = Number(settings.extra_promo_day_price || 2.5);
  const litePrice = Number(settings.link_lite_price || 9.99);
  const fullPrice = Number(settings.full_link_price || 49.99);
  const linkLiteEnabled = Boolean(settings.enable_link_lite);
  const fullLinkEnabled = Boolean(settings.enable_full_link);

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      owner_id,
      name,
      status,
      event_start_at,
      event_end_at,
      promotion_start_at,
      promotion_end_at,
      included_promo_days,
      extra_promo_days,
      base_price,
      extra_promo_price,
      linkdn_mode,
      linkdn_price,
      total_price,
      payment_status,
      payment_amount,
      is_paid,
      payment_override,
      coupon_code,
      discount_amount
    `)
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !event) notFound();

  const totalPrice = Number(event.total_price || event.payment_amount || 0);
  const discountAmount = Number(event.discount_amount || 0);
  const amountDue = Math.max(totalPrice - discountAmount, 0);

  const isPaid =
    event.is_paid === true ||
    event.payment_status === 'paid' ||
    event.payment_override === true ||
    amountDue <= 0;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Create Event
        </p>

        <h1 className="mt-3 text-4xl font-bold text-white">
          Step 3: Promotion + Upgrades
        </h1>

        <p className="mt-3 max-w-2xl text-white/70">
          Choose your promotion window, review pricing, and add optional features.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Info label="Event Starts" value={formatDate(event.event_start_at)} />
        <Info label="Event Ends" value={formatDate(event.event_end_at)} />
        <Info label="Promotion Starts" value={formatDate(event.promotion_start_at)} />
        <Info label="Promotion Ends" value={formatDate(event.promotion_end_at)} />
      </div>

      <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-bold text-white">Current Payment Summary</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Info label="Total Price" value={`$${totalPrice.toFixed(2)}`} />
          <Info label="Discount" value={`$${discountAmount.toFixed(2)}`} />
          <Info label="Amount Due" value={`$${amountDue.toFixed(2)}`} />
          <Info
            label="Payment Status"
            value={
              event.payment_override
                ? 'Overridden by admin'
                : isPaid
                ? 'Paid / No balance due'
                : event.payment_status || 'pending'
            }
          />
          <Info label="Coupon Code" value={event.coupon_code || '—'} />
        </div>

        {!isPaid ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-100">
            This event will not be submitted for review until payment is completed
            or a valid discount/override reduces the balance to zero.
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">
            This event is eligible to be submitted for review.
          </div>
        )}
      </div>

      <EventStep3Form
        event={event}
        extraDayPrice={extraDayPrice}
        litePrice={litePrice}
        fullPrice={fullPrice}
        linkLiteEnabled={linkLiteEnabled}
        fullLinkEnabled={fullLinkEnabled}
        updateAction={updateEventStep3}
        submitAction={submitEventForModeration}
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {!isPaid ? (
          <Link
            href={`/dashboard/events/${event.id}/payment`}
            className="rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
          >
            Continue to Payment
          </Link>
        ) : (
          <form action={submitEventForModeration}>
            <input type="hidden" name="event_id" value={event.id} />
            <button
              type="submit"
              className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Submit for Review
            </button>
          </form>
        )}

        <Link
          href={`/dashboard/events/${event.id}/review`}
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
        >
          Preview Review Page
        </Link>
      </div>
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}