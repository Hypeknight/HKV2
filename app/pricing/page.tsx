import { getPlatformSettings } from '@/lib/settings';
import { ButtonLink, InfoCard, Panel, SectionHeader } from '@/components/ui';

export default async function PricingPage() {
  const settings = await getPlatformSettings();

  const basePrice = Number(settings.base_event_price || settings.event_base_price || 19.99);
  const includedDays = Number(settings.base_promo_days || settings.included_promo_days || 14);
  const extraDayPrice = Number(settings.extra_promo_day_price || 2.5);
  const litePrice = Number(settings.link_lite_price || 9.99);
  const fullPrice = Number(settings.full_link_price || 49.99);
  const linkLiteEnabled = Boolean(settings.enable_link_lite);
  const fullLinkEnabled = Boolean(settings.enable_full_link);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            HypeKnight Pricing
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Simple event promotion pricing.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Pricing is controlled by HypeKnight admin settings and may change as
            features, beta campaigns, and city launches expand.
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-6 sm:rounded-[2.75rem] sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">
            Base Event Promotion
          </p>
          <h2 className="mt-4 text-5xl font-black text-white">
            ${basePrice.toFixed(2)}
          </h2>
          <p className="mt-4 text-white/70">
            Includes {includedDays} days of event promotion eligibility.
          </p>

          <div className="mt-6">
            <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
              Post an Event
            </ButtonLink>
          </div>
        </div>

        <Panel title="Promotion math" eyebrow="Included">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Base Price" icon="📣" value={`$${basePrice.toFixed(2)}`} accent />
            <InfoCard label="Included Days" icon="📅" value={`${includedDays} days`} />
            <InfoCard label="Extra Day Rate" icon="➕" value={`$${extraDayPrice.toFixed(2)}`} />
            <InfoCard label="Coupons" icon="🎟️" value="When available" />
          </div>
        </Panel>
      </section>

      <Panel title="Available packages and add-ons" eyebrow="Options">
        <div className="grid gap-4 md:grid-cols-3">
          <Package
            title="Base Event Listing"
            price={`$${basePrice.toFixed(2)}`}
            text={`${includedDays} included promotion days. Good for standard event discovery.`}
            active
          />

          <Package
            title="Extra Promo Days"
            price={`$${extraDayPrice.toFixed(2)} / day`}
            text="Extend the promotion window when available."
          />

          <Package
            title="Linkd’N Lite"
            price={linkLiteEnabled ? `$${litePrice.toFixed(2)}` : 'Unavailable'}
            text="Optional add-on controlled by admin settings."
          />

          <Package
            title="Full Linkd’N"
            price={fullLinkEnabled ? `$${fullPrice.toFixed(2)}` : 'Unavailable'}
            text="Expanded add-on controlled by admin settings."
          />
        </div>
      </Panel>

      <Panel title="Important notes" eyebrow="How Visibility Works">
        <div className="grid gap-4 md:grid-cols-2">
          <Note title="Payment" text="Events may require payment, a valid coupon, or admin override before continuing through the public pipeline." />
          <Note title="Review" text="HypeKnight may review listings before they are discoverable." />
          <Note title="Public visibility" text="Events generally do not show publicly until they are approved, public, and scheduled or active." />
          <Note title="Beta codes" text="During beta periods, HypeKnight may allow free or discounted event posting with approved coupon codes." />
        </div>
      </Panel>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center sm:rounded-[2.75rem] sm:p-10">
        <SectionHeader
          eyebrow="Start"
          title="Ready to promote an event?"
          text="Create a draft, review the details, apply coupons if available, and submit when ready."
        />

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
            Create Event
          </ButtonLink>
          <ButtonLink href="/promote" variant="secondary">
            How Promotion Works
          </ButtonLink>
        </div>
      </section>
    </section>
  );
}

function Package({
  title,
  price,
  text,
  active,
}: {
  title: string;
  price: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] border p-6 ${
        active ? 'border-accent/20 bg-accent/10' : 'border-white/10 bg-black/20'
      }`}
    >
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-4xl font-black text-accent">{price}</p>
      <p className="mt-4 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function Note({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}