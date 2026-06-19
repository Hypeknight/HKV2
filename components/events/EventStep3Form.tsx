'use client';

import { useMemo, useState } from 'react';

type EventStep3FormProps = {
  event: any;
  extraDayPrice: number;
  litePrice: number;
  fullPrice: number;
  linkLiteEnabled: boolean;
  fullLinkEnabled: boolean;
  updateAction: (formData: FormData) => Promise<void>;
  submitAction: (formData: FormData) => Promise<void>;
};

export default function EventStep3Form({
  event,
  extraDayPrice,
  litePrice,
  fullPrice,
  linkLiteEnabled,
  fullLinkEnabled,
  updateAction,
}: EventStep3FormProps) {
  const [extraPromoDays, setExtraPromoDays] = useState(
    Number(event.extra_promo_days || 0)
  );

  const [linkdnMode, setLinkdnMode] = useState<string>(
    event.linkdn_mode || 'none'
  );

  const basePrice = Number(event.base_price || 0);
  const includedPromoDays = Number(event.included_promo_days || 14);

  const linkdnPrice = useMemo(() => {
    if (linkdnMode === 'lite' && linkLiteEnabled) return litePrice;
    if (linkdnMode === 'full' && fullLinkEnabled) return fullPrice;
    return 0;
  }, [linkdnMode, linkLiteEnabled, fullLinkEnabled, litePrice, fullPrice]);

  const extraPromoPrice = Number((extraPromoDays * extraDayPrice).toFixed(2));
  const totalPrice = Number((basePrice + extraPromoPrice + linkdnPrice).toFixed(2));

  return (
    <form
      action={updateAction}
      className="rounded-[2rem] border border-white/10 bg-white/5 p-8"
    >
      <input type="hidden" name="event_id" value={event.id} />

      <input type="hidden" name="extra_day_price" value={extraDayPrice} />

      <h2 className="text-2xl font-bold text-white">Promotion Package</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Info label="Base Price" value={`$${basePrice.toFixed(2)}`} />
        <Info label="Included Promo Days" value={String(includedPromoDays)} />
        <Info label="Extra Day Price" value={`$${extraDayPrice.toFixed(2)}`} />
        <Info label="Extra Promo Price" value={`$${extraPromoPrice.toFixed(2)}`} />
      </div>

      <label className="mt-6 block">
        <span className="text-sm text-white/60">Extra Promo Days</span>
        <input
          name="extra_promo_days"
          type="number"
          min={0}
          value={extraPromoDays}
          onChange={(event) => setExtraPromoDays(Number(event.target.value || 0))}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
        />
      </label>

      <section className="mt-8">
        <h3 className="text-xl font-bold text-white">Optional Linkd’N Upgrade</h3>
        <p className="mt-2 text-white/60">
          Add optional connection features if they are currently enabled by HypeKnight.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <PackageOption
            name="linkdn_mode"
            value="none"
            checked={linkdnMode === 'none'}
            onChange={() => setLinkdnMode('none')}
            title="Basic"
            price="$0.00"
            text="No Linkd’N upgrade."
          />

          {linkLiteEnabled ? (
            <PackageOption
              name="linkdn_mode"
              value="lite"
              checked={linkdnMode === 'lite'}
              onChange={() => setLinkdnMode('lite')}
              title="Link Lite"
              price={`$${litePrice.toFixed(2)}`}
              text="Entry-level connection feature."
            />
          ) : null}

          {fullLinkEnabled ? (
            <PackageOption
              name="linkdn_mode"
              value="full"
              checked={linkdnMode === 'full'}
              onChange={() => setLinkdnMode('full')}
              title="Full Link"
              price={`$${fullPrice.toFixed(2)}`}
              text="Full Linkd’N feature package."
            />
          ) : null}
        </div>

        {!linkLiteEnabled && !fullLinkEnabled ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/60">
            Linkd’N upgrades are currently disabled by HypeKnight.
          </div>
        ) : null}
      </section>

      <section className="mt-8 rounded-2xl border border-accent/20 bg-accent/10 p-6">
        <h3 className="text-xl font-bold text-white">Updated Total</h3>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Info label="Base Price" value={`$${basePrice.toFixed(2)}`} />
          <Info label="Extra Promo Days" value={String(extraPromoDays)} />
          <Info label="Linkd’N Upgrade" value={`$${linkdnPrice.toFixed(2)}`} />
          <Info label="Total Price" value={`$${totalPrice.toFixed(2)}`} />
        </div>
      </section>

      <button
        type="submit"
        className="mt-8 w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90"
      >
        Save Promotion + Pricing
      </button>
    </form>
  );
}

function PackageOption({
  name,
  value,
  checked,
  onChange,
  title,
  price,
  text,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  price: string;
  text: string;
}) {
  return (
    <label className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 p-5 hover:border-accent/40">
      <input
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />

      <div className="flex items-center justify-between gap-3">
        <h4 className="text-lg font-bold text-white">{title}</h4>
        <span className="text-sm font-semibold text-accent">{price}</span>
      </div>

      <p className="mt-3 text-sm text-white/60">{text}</p>

      {checked ? (
        <p className="mt-4 text-sm font-semibold text-accent">Selected</p>
      ) : null}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-2 text-white">{value}</p>
    </div>
  );
}