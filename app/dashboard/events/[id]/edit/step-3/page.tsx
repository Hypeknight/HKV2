import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  updateEventStep3,
  submitEventForModeration,
} from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import EventStep3Form from '@/components/events/EventStep3Form';
import {
  ButtonLink,
  Chip,
  EventTime,
  InfoCard,
  Panel,
  SectionHeader,
} from '@/components/ui';

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
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/dashboard/events"
        className="text-sm text-white/60 hover:text-accent"
      >
        ← Back to My Events
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Create Event
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Finalize promotion and payment.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Step 3 sets your promotion window, optional upgrades, payment
              status, and review readiness before HypeKnight moderation.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>{event.name}</Chip>
              <Chip>Status: {event.status}</Chip>
              <Chip>{isPaid ? 'Ready for review' : 'Payment needed'}</Chip>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Progress
            </p>

            <div className="mt-5 grid gap-3">
              <InfoCard label="Step 1" icon="✅" value="Basics" />
              <InfoCard label="Step 2" icon="✅" value="Details" />
              <InfoCard label="Step 3" icon="✅" value="Promotion" accent />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Event Starts"
          icon="🕒"
          value={<EventTime value={event.event_start_at} mode="wall" />}
          accent
        />

        <InfoCard
          label="Event Ends"
          icon="⏳"
          value={<EventTime value={event.event_end_at} mode="wall" />}
        />

        <InfoCard
          label="Promotion Starts"
          icon="📣"
          value={<EventTime value={event.promotion_start_at} mode="wall" />}
        />

        <InfoCard
          label="Promotion Ends"
          icon="🏁"
          value={<EventTime value={event.promotion_end_at} mode="wall" />}
        />
      </section>

      <Panel title="Payment summary" eyebrow="Review Readiness">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Total Price"
            icon="💵"
            value={`$${totalPrice.toFixed(2)}`}
          />

          <InfoCard
            label="Discount"
            icon="🏷️"
            value={`$${discountAmount.toFixed(2)}`}
          />

          <InfoCard
            label="Amount Due"
            icon="💳"
            value={`$${amountDue.toFixed(2)}`}
            accent={!isPaid}
          />

          <InfoCard
            label="Payment Status"
            icon={isPaid ? '✅' : '⚠️'}
            value={
              event.payment_override
                ? 'Overridden by admin'
                : isPaid
                ? 'Paid / no balance due'
                : event.payment_status || 'Pending'
            }
            accent={!isPaid}
          />

          <InfoCard
            label="Coupon Code"
            icon="🎟️"
            value={event.coupon_code || 'No coupon applied'}
          />
        </div>

        {!isPaid ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm leading-6 text-yellow-100">
            This event will not be submitted for review until payment is
            completed, a valid discount reduces the balance to zero, or admin
            applies an override.
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-sm leading-6 text-green-100">
            This event is eligible to be submitted for HypeKnight review.
          </div>
        )}
      </Panel>

      <Panel title="Promotion options" eyebrow="Window + Upgrades">
        <p className="mb-6 text-sm leading-6 text-white/65">
          Adjust promotion days, optional Linkd’N upgrades, and pricing before
          moving forward.
        </p>

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
      </Panel>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
        <SectionHeader
          eyebrow="Final Step"
          title={isPaid ? 'Submit your event for review.' : 'Complete payment to continue.'}
          text={
            isPaid
              ? 'HypeKnight will review the listing before it becomes fully discoverable.'
              : 'Payment or discount completion is required before review submission.'
          }
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {!isPaid ? (
            <ButtonLink
              href={`/dashboard/events/${event.id}/payment`}
              variant="primary"
            >
              Continue to Payment
            </ButtonLink>
          ) : (
            <form action={submitEventForModeration}>
              <input type="hidden" name="event_id" value={event.id} />
              <button
                type="submit"
                className="w-full rounded-2xl bg-accent px-5 py-4 font-semibold text-black hover:opacity-90"
              >
                Submit for Review
              </button>
            </form>
          )}

          <ButtonLink
            href={`/dashboard/events/${event.id}/review`}
            variant="secondary"
          >
            Preview Review Page
          </ButtonLink>
        </div>
      </section>
    </section>
  );
}