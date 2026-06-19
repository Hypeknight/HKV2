import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import { updatePlatformSettings } from './actions';

export default async function AdminSettingsPage() {
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
    <section className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-white/60 hover:text-accent">
        ← Back to Admin
      </Link>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Platform Settings
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          HypeKnight Control Center
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Control event pricing, package availability, homepage modules, and ambassador program rules.
        </p>
      </section>

      <form action={updatePlatformSettings} className="space-y-8">
        <Panel title="Event Pricing">
          <div className="grid gap-4 md:grid-cols-3">
            <Input name="event_base_price" label="Base Event Price" type="number" step="0.01" defaultValue={settings.event_base_price} />
            <Input name="included_promo_days" label="Included Promo Days" type="number" defaultValue={settings.included_promo_days} />
            <Input name="extra_promo_day_price" label="Extra Promo Day Price" type="number" step="0.01" defaultValue={settings.extra_promo_day_price} />
          </div>
        </Panel>

        <Panel title="Package Controls">
          <div className="grid gap-4 md:grid-cols-2">
            <Toggle name="enable_link_lite" label="Enable Link Lite" defaultChecked={settings.enable_link_lite} />
            <Toggle name="enable_full_link" label="Enable Full Link" defaultChecked={settings.enable_full_link} />
            <Input name="link_lite_price" label="Link Lite Price" type="number" step="0.01" defaultValue={settings.link_lite_price} />
            <Input name="full_link_price" label="Full Link Price" type="number" step="0.01" defaultValue={settings.full_link_price} />
          </div>
        </Panel>

        <Panel title="Homepage Modules">
          <div className="grid gap-4 md:grid-cols-2">
            <Toggle name="homepage_show_active_events" label="Show Active Events" defaultChecked={settings.homepage_show_active_events} />
            <Toggle name="homepage_show_hype_cities" label="Show Hype Cities" defaultChecked={settings.homepage_show_hype_cities} />
            <Toggle name="homepage_show_external_events" label="Show External Events" defaultChecked={settings.homepage_show_external_events} />
            <Toggle name="homepage_show_tonight" label="Show Tonight" defaultChecked={settings.homepage_show_tonight} />
            <Toggle name="homepage_show_right_now" label="Show Right Now" defaultChecked={settings.homepage_show_right_now} />
            <Toggle name="homepage_show_featured_events" label="Show Featured Events" defaultChecked={settings.homepage_show_featured_events} />
            <Toggle name="homepage_show_priority_events" label="Show Priority Events" defaultChecked={settings.homepage_show_priority_events} />
          </div>
        </Panel>

        <Panel title="Ambassador Program">
          <div className="grid gap-4 md:grid-cols-3">
            <Toggle name="ambassador_program_enabled" label="Enable Ambassador Program" defaultChecked={settings.ambassador_program_enabled} />
            <Input name="ambassador_min_discount" label="Minimum Discount %" type="number" defaultValue={settings.ambassador_min_discount} />
            <Input name="ambassador_max_discount" label="Maximum Discount %" type="number" defaultValue={settings.ambassador_max_discount} />
            <Input name="ambassador_commission_percent" label="Commission %" type="number" defaultValue={settings.ambassador_commission_percent} />
            <Input name="ambassador_min_payout" label="Minimum Payout" type="number" step="0.01" defaultValue={settings.ambassador_min_payout} />
            <Input name="ambassador_founder_limit" label="Founder Ambassador Limit" type="number" defaultValue={settings.ambassador_founder_limit} />
          </div>
        </Panel>

        <button className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90">
          Save Platform Settings
        </button>
      </form>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
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
      <span className="text-sm text-white/60">{label}</span>
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