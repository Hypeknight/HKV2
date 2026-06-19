import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import { submitAmbassadorApplication } from '@/app/ambassadors/actions';

export default async function DashboardAmbassadorApplyPage() {
  const supabase = await createClient();
  const settings = await getPlatformSettings();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const programEnabled = Boolean(settings.ambassador_program_enabled);
  const minDiscount = Number(settings.ambassador_min_discount || 20);
  const maxDiscount = Number(settings.ambassador_max_discount || 70);
  const commissionPercent = Number(settings.ambassador_commission_percent || 30);
  const minPayout = Number(settings.ambassador_min_payout || 25);

  const { data: existingApplication, error: existingApplicationError } =
    await supabase
      .from('ambassador_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved', 'suspended'])
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingApplicationError) {
    throw new Error(existingApplicationError.message);
  }

  if (existingApplication) {
    redirect('/ambassadors/dashboard');
  }

  if (!programEnabled) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2.75rem] border border-yellow-500/20 bg-yellow-500/10 p-8 sm:p-10">
          <p className="text-sm uppercase tracking-[0.35em] text-yellow-200">
            HypeKnight Ambassador Program
          </p>

          <h1 className="mt-3 text-5xl font-black text-white">
            Applications are currently paused.
          </h1>

          <p className="mt-4 max-w-3xl text-white/70">
            HypeKnight is not accepting new ambassador applications right now.
            Please check back as new city campaigns and opportunities open.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ambassadors"
              className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
            >
              View Program Info
            </Link>

            <Link
              href="/dashboard"
              className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-center text-white hover:border-accent/40"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8 sm:p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          HypeKnight Ambassador Program
        </p>

        <h1 className="mt-3 text-5xl font-black text-white">
          Apply to become a brand ambassador
        </h1>

        <p className="mt-4 max-w-3xl text-white/70">
          Ambassadors help introduce promoters, event hosts, and nightlife
          communities to HypeKnight. Applications are reviewed by HypeKnight
          before approval.
        </p>

        <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/10 p-5 text-white/75">
          Approved ambassadors may request a personal coupon code between{' '}
          {minDiscount}% and {maxDiscount}% off. Commission is calculated after
          HypeKnight profit. Current ambassador commission is {commissionPercent}
          %. Minimum payout threshold is ${minPayout.toFixed(2)}.
        </div>
      </div>

      <form
        action={submitAmbassadorApplication}
        className="space-y-8 rounded-[2.75rem] border border-white/10 bg-white/5 p-8"
      >
        <FormSection title="Legal Information">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="first_name" label="Legal First Name" required />
            <Input name="last_name" label="Legal Last Name" required />
            <Input
              name="email"
              label="Email"
              type="email"
              required
              defaultValue={user.email || ''}
            />
            <Input name="phone" label="Phone Number" />
          </div>
        </FormSection>

        <FormSection title="Ambassador Profile">
          <div className="grid gap-4 md:grid-cols-3">
            <Input name="platform_username" label="HypeKnight Username" required />
            <Input name="city" label="City of Residence" required />
            <Input name="state" label="State" required />
          </div>
        </FormSection>

        <FormSection title="Social Platforms">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="instagram_url" label="Instagram URL / Handle" />
            <Input name="facebook_url" label="Facebook URL / Handle" />
            <Input name="tiktok_url" label="TikTok URL / Handle" />
            <Input name="youtube_url" label="YouTube URL / Handle" />
            <Input name="website_url" label="Website / Other Link" />
            <Input
              name="estimated_followers"
              label="Estimated Total Followers"
              type="number"
            />
          </div>
        </FormSection>

        <FormSection title="Promotion Plan">
          <textarea
            name="promotion_plan"
            rows={5}
            placeholder="How do you plan to promote HypeKnight?"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />
        </FormSection>

        <FormSection title="Ambassador Agreements">
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/70">
            <AgreementBox
              name="ambassador_agreement"
              label="I agree to the HypeKnight Ambassador Program Agreement."
            />

            <AgreementBox
              name="terms_of_service"
              label="I agree to HypeKnight's Terms of Service."
            />

            <AgreementBox
              name="privacy_policy"
              label="I agree to HypeKnight's Privacy Policy."
            />

            <AgreementBox
              name="commission_policy"
              label="I understand commissions are calculated from HypeKnight profit and are not earned on refunds, removals, chargebacks, cancelled events, or transactions with no profit."
            />

            <AgreementBox
              name="contractor_acknowledgement"
              label="I understand that ambassadors are independent contractors, not employees, and are responsible for their own taxes."
            />
          </div>
        </FormSection>

        <button
          type="submit"
          className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90"
        >
          Submit Application
        </button>
      </form>
    </section>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Input({
  name,
  label,
  type = 'text',
  required = false,
  defaultValue = '',
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-white/60">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}

function AgreementBox({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  return (
    <label className="flex gap-3">
      <input name={name} type="checkbox" required className="mt-1" />
      <span>{label}</span>
    </label>
  );
}