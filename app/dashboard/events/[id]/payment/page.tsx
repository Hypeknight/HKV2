import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import ProceedToEventPaymentButton from '@/components/events/ProceedToEventPaymentButton';
import { applyEventCoupon } from './actions';
import { Chip, InfoCard, Panel, SectionHeader } from '@/components/ui';

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
  const settings = await getPlatformSettings();

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

  const basePrice = Number(
    event.base_price || settings.base_event_price || settings.event_base_price || 19.99
  );

  const includedDays = Number(
    event.included_promo_days ||
      settings.base_promo_days ||
      settings.included_promo_days ||
      14
  );

  const extraDays = Number(event.extra_promo_days || 0);
  const extraPromoPrice = Number(event.extra_promo_price || 0);
  const extraDayPrice = Number(settings.extra_promo_day_price || 2.5);

  const isPaid =
    event.payment_status === 'paid' ||
    event.is_paid === true ||
    event.payment_override === true ||
    amountDue <= 0;

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href={`/dashboard/events/${event.id}/review`}
        className="text-sm text-white/60 hover:text-accent"
      >
        ← Back to Event Review
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            Event Payment
          </p>

          <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
            Complete payment for {event.name}.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Payment, a valid coupon, or admin override is required before your
            event can move through review and become eligible for public discovery.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Chip>Status: {event.status || 'unknown'}</Chip>
            <Chip>Payment: {event.payment_status || 'pending'}</Chip>
            {event.coupon_code ? <Chip>Coupon: {event.coupon_code}</Chip> : null}
            {isPaid ? <Chip>Paid / Ready</Chip> : <Chip>Balance Due</Chip>}
          </div>
        </div>
      </section>

      {query.canceled ? (
        <Notice
          tone="yellow"
          text="Checkout was canceled. You can restart payment anytime."
        />
      ) : null}

      {query.coupon === 'applied' ? (
        <Notice tone="green" text="Coupon applied successfully." />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Panel title="Payment summary" eyebrow="Amount Due">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard
              label="Original Total"
              icon="💵"
              value={`$${originalTotal.toFixed(2)}`}
            />
            <InfoCard
              label="Discount"
              icon="🏷️"
              value={`$${discountAmount.toFixed(2)}`}
            />
            <InfoCard
              label="Amount Due"
              icon="💳"
              value={`$${Math.max(amountDue, 0).toFixed(2)}`}
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
            />
          </div>

          {isPaid ? (
            <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-sm leading-6 text-green-100">
              This event payment is complete. The event can move into HypeKnight
              review based on its current status.
            </div>
          ) : (
            <div className="mt-6">
              <ProceedToEventPaymentButton eventId={event.id} />
            </div>
          )}

          <div className="mt-4">
            <Link
              href={`/dashboard/events/${event.id}/review`}
              className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center font-semibold text-white hover:border-accent/40"
            >
              Back to Event Review
            </Link>
          </div>
        </Panel>

        <Panel title="Apply coupon" eyebrow="Promo Code">
          <p className="text-sm leading-6 text-white/65">
            Enter a valid HypeKnight event coupon or promo code. If the balance
            reaches $0.00, the event may be treated as paid.
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
              className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-5 py-4 font-semibold text-accent hover:border-accent/40"
            >
              Apply Coupon
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/60">
            Coupon rules are controlled by HypeKnight admin. Some coupons may
            expire, only work for certain users, or only apply to certain event
            packages.
          </div>
        </Panel>
      </section>

      <Panel title="What you are paying for" eyebrow="Promotion Package">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Base Promotion"
            icon="📣"
            value={`$${basePrice.toFixed(2)}`}
          />
          <InfoCard
            label="Included Promo Days"
            icon="📅"
            value={`${includedDays} days`}
          />
          <InfoCard
            label="Extra Days"
            icon="➕"
            value={`${extraDays} days`}
          />
          <InfoCard
            label="Extra Day Rate"
            icon="⏱️"
            value={`$${extraDayPrice.toFixed(2)} / day`}
          />
          <InfoCard
            label="Extra Promo Cost"
            icon="💵"
            value={`$${extraPromoPrice.toFixed(2)}`}
          />
          <InfoCard
            label="Linkd’N Add-on"
            icon="⚔️"
            value={event.linkdn_mode || 'None'}
          />
          <InfoCard
            label="Linkd’N Cost"
            icon="🛡️"
            value={`$${Number(event.linkdn_price || 0).toFixed(2)}`}
          />
          <InfoCard
            label="Coupon"
            icon="🎟️"
            value={event.coupon_code || 'No coupon applied'}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-white/65">
          HypeKnight promotion gives your event a discoverable listing during
          the selected promotion window. Public visibility still depends on
          approval, payment/coupon/override status, event status, and admin rules.
        </div>
      </Panel>

      <Panel title="What happens after payment?" eyebrow="Next Steps">
        <div className="grid gap-4 md:grid-cols-3">
          <StepCard
            step="01"
            title="Payment completes"
            text="Stripe or admin rules update the event payment status."
            active={!isPaid}
          />
          <StepCard
            step="02"
            title="Event review"
            text="HypeKnight checks the listing for accuracy, completeness, and public readiness."
          />
          <StepCard
            step="03"
            title="Public discovery"
            text="Approved events become visible when status and promotion settings allow."
          />
        </div>
      </Panel>
    </section>
  );
}

function StepCard({
  step,
  title,
  text,
  active,
}: {
  step: string;
  title: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        active
          ? 'border-accent/30 bg-accent/10'
          : 'border-white/10 bg-black/20'
      }`}
    >
      <p className="text-sm font-black text-accent">{step}</p>
      <h3 className="mt-3 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/60">{text}</p>
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