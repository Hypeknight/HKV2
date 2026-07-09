import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import { updatePlatformSettings } from './actions';

type Props = {
  searchParams?: Promise<{ saved?: string }>;
};

export default async function AdminSettingsPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const settings = await getPlatformSettings();

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/admin" className="text-sm text-white/60 hover:text-accent">
        ← Back to Admin
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            Platform Settings
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            HypeKnight Control Center
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Manage pricing, workflow rules, homepage modules, promotion pages,
            ambassador rules, and owner-facing platform information.
          </p>
        </div>
      </section>

      {query.saved ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">
          Platform settings saved.
        </div>
      ) : null}

      <form action={updatePlatformSettings} className="space-y-8">
        <Panel title="Platform Status" eyebrow="Global Controls">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="site_status"
              label="Site Status"
              defaultValue={settings.site_status || 'beta'}
            />

            <Toggle
              name="beta_mode"
              label="Beta Mode"
              defaultChecked={settings.beta_mode ?? true}
            />

            <Toggle
              name="maintenance_mode"
              label="Maintenance Mode"
              defaultChecked={settings.maintenance_mode}
            />

            <Textarea
              name="homepage_announcement"
              label="Homepage Announcement"
              defaultValue={settings.homepage_announcement}
              placeholder="Example: HypeKnight is currently in beta. Use code HypeKC for free event posting."
            />
          </div>
        </Panel>

        <Panel title="Event Pricing" eyebrow="Promotion Cost">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              name="event_base_price"
              label="Base Event Price"
              type="number"
              step="0.01"
              defaultValue={settings.event_base_price}
            />

            <Input
              name="included_promo_days"
              label="Included Promo Days"
              type="number"
              defaultValue={settings.included_promo_days}
            />

            <Input
              name="extra_promo_day_price"
              label="Extra Promo Day Price"
              type="number"
              step="0.01"
              defaultValue={settings.extra_promo_day_price}
            />
          </div>
        </Panel>

        <Panel title="Event Workflow" eyebrow="Approval Rules">
          <div className="grid gap-4 md:grid-cols-2">
            <Toggle
              name="event_review_required"
              label="Require Admin Review"
              defaultChecked={settings.event_review_required ?? true}
            />

            <Toggle
              name="event_payment_required"
              label="Require Payment / Coupon / Override"
              defaultChecked={settings.event_payment_required ?? true}
            />

            <Toggle
              name="event_auto_publish"
              label="Auto Publish Approved Events"
              defaultChecked={settings.event_auto_publish}
            />

            <Toggle
              name="event_auto_expire"
              label="Auto Expire Ended Events"
              defaultChecked={settings.event_auto_expire ?? true}
            />

            <Toggle
              name="owner_edits_before_promo"
              label="Allow Owner Edits Before Promotion Window"
              defaultChecked={settings.owner_edits_before_promo ?? true}
            />
          </div>

          <div className="mt-6">
            <Textarea
              name="event_public_display_rule"
              label="Public Display Rule Text"
              defaultValue={settings.event_public_display_rule}
              placeholder="Events become discoverable after approval, payment or override, public visibility, and scheduled or active status."
            />
          </div>
        </Panel>

        <Panel title="Owner Process Text" eyebrow="Event Owner Education">
          <div className="grid gap-4 md:grid-cols-2">
            <Textarea
              name="owner_process_build_text"
              label="Build Listing Text"
              defaultValue={settings.owner_process_build_text}
              placeholder="You add the event basics, flyer, category, vibe, age, attire, price, and guest details."
            />

            <Textarea
              name="owner_process_payment_text"
              label="Payment / Coupon Text"
              defaultValue={settings.owner_process_payment_text}
              placeholder="HypeKnight checks payment, coupon discounts, free posting codes, or admin overrides."
            />

            <Textarea
              name="owner_process_review_text"
              label="Review Text"
              defaultValue={settings.owner_process_review_text}
              placeholder="HypeKnight reviews the listing for accuracy, safety, completeness, and public readiness."
            />

            <Textarea
              name="owner_process_discovery_text"
              label="Discovery Text"
              defaultValue={settings.owner_process_discovery_text}
              placeholder="Approved events become discoverable during their promotion window."
            />
          </div>
        </Panel>

        <Panel title="Package Controls" eyebrow="Linkd’N Add-ons">
          <div className="grid gap-4 md:grid-cols-2">
            <Toggle
              name="enable_link_lite"
              label="Enable Link Lite"
              defaultChecked={settings.enable_link_lite}
            />

            <Toggle
              name="enable_full_link"
              label="Enable Full Link"
              defaultChecked={settings.enable_full_link}
            />

            <Input
              name="link_lite_price"
              label="Link Lite Price"
              type="number"
              step="0.01"
              defaultValue={settings.link_lite_price}
            />

            <Input
              name="full_link_price"
              label="Full Link Price"
              type="number"
              step="0.01"
              defaultValue={settings.full_link_price}
            />
          </div>
        </Panel>

        <Panel title="Homepage Modules" eyebrow="Public Homepage">
          <div className="grid gap-4 md:grid-cols-2">
            <Toggle
              name="homepage_show_active_events"
              label="Show Active Events"
              defaultChecked={settings.homepage_show_active_events}
            />

            <Toggle
              name="homepage_show_hype_cities"
              label="Show Hype Cities"
              defaultChecked={settings.homepage_show_hype_cities}
            />

            <Toggle
              name="homepage_show_external_events"
              label="Show External Events"
              defaultChecked={settings.homepage_show_external_events}
            />

            <Toggle
              name="homepage_show_tonight"
              label="Show Tonight"
              defaultChecked={settings.homepage_show_tonight}
            />

            <Toggle
              name="homepage_show_right_now"
              label="Show Right Now"
              defaultChecked={settings.homepage_show_right_now}
            />

            <Toggle
              name="homepage_show_featured_events"
              label="Show Featured Events"
              defaultChecked={settings.homepage_show_featured_events}
            />

            <Toggle
              name="homepage_show_priority_events"
              label="Show Priority Events"
              defaultChecked={settings.homepage_show_priority_events}
            />
          </div>
        </Panel>

        <Panel title="Homepage Experience Widgets" eyebrow="Discovery Modules">
          <div className="grid gap-4 md:grid-cols-2">
            <Toggle
              name="homepage_show_live_now"
              label="Show Live Now Widget"
              defaultChecked={settings.homepage_show_live_now}
            />

            <Toggle
              name="homepage_show_starting_soon"
              label="Show Starting Soon Widget"
              defaultChecked={settings.homepage_show_starting_soon}
            />

            <Toggle
              name="homepage_show_recently_added"
              label="Show Recently Added Widget"
              defaultChecked={settings.homepage_show_recently_added}
            />

            <Toggle
              name="homepage_show_weekend"
              label="Show Weekend Widget"
              defaultChecked={settings.homepage_show_weekend}
            />

            <Toggle
              name="homepage_show_most_shared"
              label="Show Most Shared Widget"
              defaultChecked={settings.homepage_show_most_shared}
            />

            <Toggle
              name="homepage_show_most_commented"
              label="Show Most Commented Widget"
              defaultChecked={settings.homepage_show_most_commented}
            />

            <Input
              name="homepage_live_now_limit"
              label="Live Now Limit"
              type="number"
              defaultValue={settings.homepage_live_now_limit}
            />

            <Input
              name="homepage_starting_soon_limit"
              label="Starting Soon Limit"
              type="number"
              defaultValue={settings.homepage_starting_soon_limit}
            />

            <Input
              name="homepage_recently_added_limit"
              label="Recently Added Limit"
              type="number"
              defaultValue={settings.homepage_recently_added_limit}
            />

            <Input
              name="homepage_weekend_limit"
              label="Weekend Limit"
              type="number"
              defaultValue={settings.homepage_weekend_limit}
            />

            <Input
              name="homepage_default_city"
              label="Default Homepage City"
              defaultValue={settings.homepage_default_city}
            />

            <Input
              name="homepage_default_state"
              label="Default Homepage State"
              defaultValue={settings.homepage_default_state}
            />

            <Toggle
              name="homepage_use_location_prompt"
              label="Show Location Prompt"
              defaultChecked={settings.homepage_use_location_prompt}
            />
          </div>
        </Panel>

        <Panel title="Promotion + Pricing Page Text" eyebrow="Public Education">
          <div className="grid gap-4 md:grid-cols-2">
            <Textarea
              name="promote_page_headline"
              label="Promote Page Headline"
              defaultValue={settings.promote_page_headline}
              placeholder="Put your event where people are looking for something to do."
            />

            <Textarea
              name="promote_page_description"
              label="Promote Page Description"
              defaultValue={settings.promote_page_description}
              placeholder="HypeKnight helps events become easier to discover by city, vibe, music, category, date, price, and experience."
            />

            <Textarea
              name="pricing_page_note"
              label="Pricing Page Note"
              defaultValue={settings.pricing_page_note}
              placeholder="Pricing is controlled by HypeKnight admin settings and may change as features, beta campaigns, and city launches expand."
            />
          </div>
        </Panel>

        <Panel title="Ambassador Program" eyebrow="Referral + Coupon System">
          <div className="grid gap-4 md:grid-cols-3">
            <Toggle
              name="ambassador_program_enabled"
              label="Enable Ambassador Program"
              defaultChecked={settings.ambassador_program_enabled}
            />

            <Input
              name="ambassador_min_discount"
              label="Minimum Discount %"
              type="number"
              defaultValue={settings.ambassador_min_discount}
            />

            <Input
              name="ambassador_max_discount"
              label="Maximum Discount %"
              type="number"
              defaultValue={settings.ambassador_max_discount}
            />

            <Input
              name="ambassador_commission_percent"
              label="Commission %"
              type="number"
              defaultValue={settings.ambassador_commission_percent}
            />

            <Input
              name="ambassador_min_payout"
              label="Minimum Payout"
              type="number"
              step="0.01"
              defaultValue={settings.ambassador_min_payout}
            />

            <Input
              name="ambassador_founder_limit"
              label="Founder Ambassador Limit"
              type="number"
              defaultValue={settings.ambassador_founder_limit}
            />
          </div>
        </Panel>

        <button className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90">
          Save Platform Settings
        </button>
      </form>
    </section>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function Input({
  name,
  label,
  type = 'text',
  step,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  defaultValue?: string | number | null;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ''}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
      />
    </label>
  );
}

function Textarea({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <textarea
        name={name}
        rows={4}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean | null;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/75">
      <input name={name} type="checkbox" defaultChecked={Boolean(defaultChecked)} />
      <span>{label}</span>
    </label>
  );
}