import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import { requestAmbassadorCoupon } from '../actions';

export default async function AmbassadorCouponsPage() {
  const supabase = await createClient();
  const settings = await getPlatformSettings();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  if (!settings.ambassador_program_enabled) {
    redirect('/ambassadors/dashboard?error=program_paused');
  }

  const minDiscount = Number(settings.ambassador_min_discount || 20);
  const maxDiscount = Number(settings.ambassador_max_discount || 70);
  const commissionPercent = Number(settings.ambassador_commission_percent || 30);

  const discountOptions = buildDiscountOptions(minDiscount, maxDiscount);

  const { data: ambassador } = await supabase
    .from('ambassador_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!ambassador) redirect('/ambassadors/dashboard?error=not_active');

  return (
    <section className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/ambassadors/dashboard" className="text-sm text-white/60 hover:text-accent">
        ← Back to Ambassador Dashboard
      </Link>

      <div className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Coupon Request
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          Request your personal coupon code
        </h1>
        <p className="mt-3 text-white/70">
          Coupon codes are reviewed by HypeKnight before going active.
        </p>

        <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-yellow-100/80">
          You may request {minDiscount}% to {maxDiscount}% off. Higher discounts
          reduce the amount paid by the customer and may reduce your commission.
          Ambassador commission is currently {commissionPercent}% of eligible profit
          and only qualifies after the event completes without refund, removal, or
          chargeback.
        </div>
      </div>

      <form
        action={requestAmbassadorCoupon}
        className="space-y-6 rounded-[2.75rem] border border-white/10 bg-white/5 p-8"
      >
        <label className="block">
          <span className="text-sm text-white/60">Requested Coupon Code</span>
          <input
            name="requested_code"
            required
            placeholder="Example: KCQUEEN30"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 uppercase text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/60">Discount Percent</span>
          <select
            name="discount_percent"
            defaultValue={String(minDiscount)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
          >
            {discountOptions.map((percent) => (
              <option key={percent} value={percent}>
                {percent}% off
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-white/60">Usage Limit</span>
          <input
            name="usage_limit"
            type="number"
            min="1"
            max="1000"
            defaultValue="100"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90"
        >
          Submit Coupon Request
        </button>
      </form>
    </section>
  );
}

function buildDiscountOptions(min: number, max: number) {
  const safeMin = Math.max(0, Math.min(100, Math.round(min)));
  const safeMax = Math.max(safeMin, Math.min(100, Math.round(max)));

  const options = [];

  for (let percent = safeMin; percent <= safeMax; percent += 5) {
    options.push(percent);
  }

  if (!options.includes(safeMax)) {
    options.push(safeMax);
  }

  return options;
}