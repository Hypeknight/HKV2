'use client';

import { useMemo, useState } from 'react';

type EventStep3FormProps = {
  event: {
    id: string;
    name: string;
    extra_promo_days: number | null;
    linkdn_mode: string | null;
    base_price: number | null;
  };
  extraDayPrice: number;
  litePrice: number;
  fullPrice: number;
  updateAction: (formData: FormData) => void;
  submitAction: (formData: FormData) => void;
};

export default function EventStep3Form({
  event,
  extraDayPrice,
  litePrice,
  fullPrice,
  updateAction,
  submitAction,
}: EventStep3FormProps) {
  const [extraPromoDays, setExtraPromoDays] = useState<number>(
    Number(event.extra_promo_days || 0)
  );
  const [linkdnMode, setLinkdnMode] = useState<string>(event.linkdn_mode || 'none');

  const basePrice = Number(event.base_price ?? 19.99);

  const linkdnPrice = useMemo(() => {
    if (linkdnMode === 'full') return fullPrice;
    if (linkdnMode === 'lite') return litePrice;
    return 0;
  }, [linkdnMode, litePrice, fullPrice]);

  const extraPromoPrice = useMemo(() => {
    return Number((extraPromoDays * extraDayPrice).toFixed(2));
  }, [extraPromoDays, extraDayPrice]);

  const totalPrice = useMemo(() => {
    return Number((basePrice + extraPromoPrice + linkdnPrice).toFixed(2));
  }, [basePrice, extraPromoPrice, linkdnPrice]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glow">
        <form action={updateAction} className="grid gap-8">
          <input type="hidden" name="event_id" value={event.id} />
          <input type="hidden" name="extra_day_price" value={extraDayPrice} />

          <div>
            <h2 className="text-2xl font-bold text-white">Promotion Window</h2>
            <p className="mt-2 text-white/70">
              Every HypeKnight event includes a 14-day promotion window.
            </p>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Base package</span>
                <span className="font-semibold text-white">${basePrice.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-white/70">Included promotion</span>
                <span className="font-semibold text-white">14 days</span>
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="extra_promo_days"
                className="mb-2 block text-sm font-medium text-white"
              >
                Add extra promotion days
              </label>
              <select
                id="extra_promo_days"
                name="extra_promo_days"
                value={String(extraPromoDays)}
                onChange={(e) => setExtraPromoDays(Number(e.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              >
                {[0, 1, 2, 3, 5, 7, 10, 14, 21, 30].map((days) => (
                  <option key={days} value={days}>
                    {days} extra day{days === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-white/50">
                ${extraDayPrice.toFixed(2)} per extra day
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Experience Upgrades</h2>
            <p className="mt-2 text-white/70">
              Add HypeKnight Interactive Lite or full Linkd&apos;N.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block rounded-3xl border border-white/10 bg-black/20 p-5 text-white">
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="linkdn_mode"
                    value="none"
                    checked={linkdnMode === 'none'}
                    onChange={(e) => setLinkdnMode(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold">Standard HypeKnight</p>
                    <p className="mt-1 text-sm text-white/65">Standard promotion only.</p>
                    <p className="mt-2 text-sm text-accent">$0.00 add-on</p>
                  </div>
                </div>
              </label>

              <label className="block rounded-3xl border border-white/10 bg-black/20 p-5 text-white">
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="linkdn_mode"
                    value="lite"
                    checked={linkdnMode === 'lite'}
                    onChange={(e) => setLinkdnMode(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold">Interactive Lite</p>
                    <p className="mt-1 text-sm text-white/65">
                      Comments, DJ requests, lighter audience interaction.
                    </p>
                    <p className="mt-2 text-sm text-accent">
                      ${litePrice.toFixed(2)} add-on
                    </p>
                  </div>
                </div>
              </label>

              <label className="block rounded-3xl border border-white/10 bg-black/20 p-5 text-white">
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="linkdn_mode"
                    value="full"
                    checked={linkdnMode === 'full'}
                    onChange={(e) => setLinkdnMode(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold">Full Linkd&apos;N Experience</p>
                    <p className="mt-1 text-sm text-white/65">
                      Premium immersive experience with expanded live interaction.
                    </p>
                    <p className="mt-2 text-sm text-accent">
                      ${fullPrice.toFixed(2)} add-on
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
            <a
              href={`/dashboard/events/${event.id}/edit/step-2`}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
            >
              Back to Step 2
            </a>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Save and Continue
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Live Order Summary</h2>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-white/75">
            <span>Base package</span>
            <span>${basePrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-white/75">
            <span>Included promo days</span>
            <span>14 days</span>
          </div>

          <div className="flex items-center justify-between text-white/75">
            <span>Extra promo days</span>
            <span>{extraPromoDays}</span>
          </div>

          <div className="flex items-center justify-between text-white/75">
            <span>Extra promo cost</span>
            <span>${extraPromoPrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-white/75">
            <span>Linkd&apos;N mode</span>
            <span className="capitalize">{linkdnMode}</span>
          </div>

          <div className="flex items-center justify-between text-white/75">
            <span>Linkd&apos;N cost</span>
            <span>${linkdnPrice.toFixed(2)}</span>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-lg font-semibold text-white">
              <span>Estimated total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-sm font-semibold text-white">Submission rule</p>
          <p className="mt-2 text-sm text-white/70">
            Once submitted, the event is locked unless rejected and returned for changes.
          </p>
        </div>

        <form action={submitAction} className="mt-6">
          <input type="hidden" name="event_id" value={event.id} />
          <button
            type="submit"
            className="w-full rounded-2xl border border-accent/30 bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Submit for Review
          </button>
        </form>
      </div>
    </div>
  );
}