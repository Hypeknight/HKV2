import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { updateEventStep3, submitEventForModeration } from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';

type Step3PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const BASE_PRICE = 19.99;
const EXTRA_DAY_PRICE = 2.5;
const LITE_PRICE = 9.99;
const FULL_PRICE = 49.99;

export default async function EditEventStep3Page({ params }: Step3PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      owner_id,
      name,
      status,
      event_start_at,
      event_end_at,
      included_promo_days,
      extra_promo_days,
      base_price,
      extra_promo_price,
      linkdn_mode,
      linkdn_price,
      total_price
    `)
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !event) {
    notFound();
  }

  const currentExtraDays = Number(event.extra_promo_days || 0);
  const currentLinkdnMode = event.linkdn_mode || 'none';

  const computedLinkdnPrice =
    currentLinkdnMode === 'full'
      ? FULL_PRICE
      : currentLinkdnMode === 'lite'
      ? LITE_PRICE
      : 0;

  const estimatedTotal =
    Number(event.base_price ?? BASE_PRICE) +
    currentExtraDays * EXTRA_DAY_PRICE +
    computedLinkdnPrice;

  const startDate = event.event_start_at
    ? new Date(event.event_start_at).toLocaleString()
    : 'Not set';

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
          Choose your promotion window, review pricing, and decide whether to
          add interactive HypeKnight or full Linkd&apos;N support.
        </p>
      </div>

      <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">
          Event
        </p>
        <p className="mt-2 text-xl font-semibold text-white">{event.name}</p>
        <p className="mt-2 text-sm text-white/60">Start: {startDate}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glow">
          <form action={updateEventStep3} className="grid gap-8">
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="extra_day_price" value={EXTRA_DAY_PRICE} />

            <div>
              <h2 className="text-2xl font-bold text-white">Promotion Window</h2>
              <p className="mt-2 text-white/70">
                Every HypeKnight event includes a 14-day promotion window for the
                base package.
              </p>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Base package</span>
                  <span className="font-semibold text-white">$19.99</span>
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
                  defaultValue={String(currentExtraDays)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
                >
                  {[0, 1, 2, 3, 5, 7, 10, 14, 21, 30].map((days) => (
                    <option key={days} value={days}>
                      {days} extra day{days === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-white/50">
                  Extra day pricing is currently set here as a working placeholder:
                  ${EXTRA_DAY_PRICE.toFixed(2)} per day.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">Experience Upgrades</h2>
              <p className="mt-2 text-white/70">
                Choose whether you want standard HypeKnight promotion, a lighter
                interactive layer, or the full Linkd&apos;N experience.
              </p>

              <div className="mt-5 space-y-4">
                <label className="block rounded-3xl border border-white/10 bg-black/20 p-5 text-white">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="linkdn_mode"
                      value="none"
                      defaultChecked={currentLinkdnMode === 'none'}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold">Standard HypeKnight</p>
                      <p className="mt-1 text-sm text-white/65">
                        Standard event promotion only.
                      </p>
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
                      defaultChecked={currentLinkdnMode === 'lite'}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold">Interactive Lite</p>
                      <p className="mt-1 text-sm text-white/65">
                        Adds a lighter engagement layer for features like comments,
                        DJ requests, and audience interaction.
                      </p>
                      <p className="mt-2 text-sm text-accent">
                        ${LITE_PRICE.toFixed(2)} add-on
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
                      defaultChecked={currentLinkdnMode === 'full'}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold">Full Linkd&apos;N Experience</p>
                      <p className="mt-1 text-sm text-white/65">
                        Adds premium live-interaction capabilities and venue-side
                        connection potential.
                      </p>
                      <p className="mt-2 text-sm text-accent">
                        ${FULL_PRICE.toFixed(2)} add-on
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-5 rounded-3xl border border-accent/20 bg-accent/10 p-5">
                <p className="text-sm font-semibold text-white">
                  Linkd&apos;N setup note
                </p>
                <p className="mt-2 text-sm text-white/70">
                  If you choose a Linkd&apos;N add-on, HypeKnight can use the event start
                  time to estimate the window available for setup and testing.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
              <Link
                href={`/dashboard/events/${event.id}/edit/step-2`}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
              >
                Back to Step 2
              </Link>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
              >
                Save Step 3
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Order Summary</h2>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-white/75">
              <span>Base package</span>
              <span>${BASE_PRICE.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-white/75">
              <span>Included promo days</span>
              <span>14 days</span>
            </div>

            <div className="flex items-center justify-between text-white/75">
              <span>Extra promo days</span>
              <span>{currentExtraDays}</span>
            </div>

            <div className="flex items-center justify-between text-white/75">
              <span>Current Linkd&apos;N mode</span>
              <span className="capitalize">{currentLinkdnMode}</span>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between text-lg font-semibold text-white">
                <span>Estimated total</span>
                <span>${estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm font-semibold text-white">Submission rule</p>
            <p className="mt-2 text-sm text-white/70">
              Once submitted, this event will be locked and cannot be edited unless
              it is rejected and returned for resubmission.
            </p>
          </div>

          <form action={submitEventForModeration} className="mt-6">
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
    </section>
  );
}