import Link from 'next/link';
import { getPlatformSettings } from '@/lib/settings';
import { ButtonLink, InfoCard, Panel, SectionHeader } from '@/components/ui';

export default async function PromotePage() {
  const settings = await getPlatformSettings();

  const basePrice = Number(settings.base_event_price || settings.event_base_price || 19.99);
  const includedDays = Number(settings.base_promo_days || settings.included_promo_days || 14);
  const extraDayPrice = Number(settings.extra_promo_day_price || 2.5);
  const reviewRequired = settings.event_review_required === undefined ? true : Boolean(settings.event_review_required);
  const paymentRequired = settings.event_payment_required === undefined ? true : Boolean(settings.event_payment_required);
  const linkLiteEnabled = Boolean(settings.enable_link_lite);
  const fullLinkEnabled = Boolean(settings.enable_full_link);
  const litePrice = Number(settings.link_lite_price || 9.99);
  const fullPrice = Number(settings.full_link_price || 49.99);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            Promote on HypeKnight
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Put your event where people are looking for something to do.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            HypeKnight helps events become easier to discover by city, vibe,
            music, category, date, price, and experience.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
              Post an Event
            </ButtonLink>
            <ButtonLink href="/pricing" variant="secondary">
              View Pricing
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Base Promotion" icon="📣" value={`$${basePrice.toFixed(2)}`} accent />
        <InfoCard label="Included Days" icon="📅" value={`${includedDays} days`} />
        <InfoCard label="Extra Days" icon="➕" value={`$${extraDayPrice.toFixed(2)} / day`} />
        <InfoCard label="Review" icon="✅" value={reviewRequired ? 'Required' : 'Flexible'} />
      </section>

      <Panel title="How HypeKnight promotion works" eyebrow="Process">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Step step="01" title="Create Listing" text="Add your flyer, name, venue, address, date, time, description, music, vibe, age, attire, and event details." />
          <Step step="02" title="Choose Promotion" text={`Your base promotion includes ${includedDays} days. Extra days can be added when enabled.`} />
          <Step step="03" title="Payment / Coupon" text={paymentRequired ? 'Payment, coupon, or admin override is required before public discovery.' : 'Admin settings may allow flexible payment handling.'} />
          <Step step="04" title="Review + Discovery" text="Once approved and eligible, your event can appear in HypeKnight discovery areas." />
        </div>
      </Panel>

      <Panel title="What your listing can include" eyebrow="Features">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Feature title="Event flyer" text="Show the image people recognize from social media." />
          <Feature title="Searchable categories" text="Music, vibe, age, attire, city, price, and event type help users filter." />
          <Feature title="Full address" text="Help guests find the venue without already knowing it." />
          <Feature title="Promotion window" text="Events can be promoted before they happen, not just on event day." />
          <Feature title="Coupon support" text="Use approved HypeKnight codes during beta, campaigns, or ambassador promotions." />
          <Feature title="Review pipeline" text="HypeKnight can review listings before public discovery to protect quality." />
        </div>
      </Panel>

      <Panel title="Optional Linkd’N upgrades" eyebrow="Add-ons">
        <div className="grid gap-4 md:grid-cols-2">
          <Package
            title="Linkd’N Lite"
            price={linkLiteEnabled ? `$${litePrice.toFixed(2)}` : 'Unavailable'}
            text="Lightweight event connection add-on for future interactive tools."
          />
          <Package
            title="Full Linkd’N"
            price={fullLinkEnabled ? `$${fullPrice.toFixed(2)}` : 'Unavailable'}
            text="Expanded interactive/event connection upgrade when enabled."
          />
        </div>
      </Panel>

      <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-6 text-center sm:rounded-[2.75rem] sm:p-10">
        <SectionHeader
          eyebrow="Ready?"
          title="Start building your event listing."
          text="You can save drafts, return later, and submit when ready."
        />

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
            Post an Event
          </ButtonLink>
          <ButtonLink href="/events" variant="secondary">
            Explore Events
          </ButtonLink>
        </div>
      </section>
    </section>
  );
}

function Step({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-sm font-black text-accent">{step}</p>
      <h3 className="mt-3 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function Package({ title, price, text }: { title: string; price: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <p className="text-sm uppercase tracking-[0.25em] text-accent">{title}</p>
      <p className="mt-3 text-4xl font-black text-white">{price}</p>
      <p className="mt-4 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}