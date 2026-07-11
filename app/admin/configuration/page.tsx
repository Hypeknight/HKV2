import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminConfigurationPage() {
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

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const [
    { count: categoryCount },
    { count: valueCount },
    { count: activeValueCount },
    { count: inactiveValueCount },
  ] = await Promise.all([
    supabase
      .from('lookup_categories')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('lookup_values')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('lookup_values')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),

    supabase
      .from('lookup_values')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false),
  ]);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/admin"
        className="text-sm font-semibold text-white/60 hover:text-accent"
      >
        ← Back to Admin
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_330px] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Platform Configuration
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Configure how HypeKnight works.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Manage platform behavior, selectable options, packages,
              discovery rules, homepage modules, recommendations, and future
              HypeKnight systems from one configuration center.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatusChip label={`${categoryCount || 0} lookup categories`} />
              <StatusChip label={`${activeValueCount || 0} active values`} />
              <StatusChip label={`${inactiveValueCount || 0} disabled values`} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Configuration Registry
            </p>

            <p className="mt-3 text-5xl font-black text-white">
              {valueCount || 0}
            </p>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Selectable values currently registered across HypeKnight.
            </p>

            <Link
              href="/admin/lookups"
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Open Lookup Manager
            </Link>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Core Controls"
          title="Platform behavior"
          text="These controls determine how HypeKnight operates, prices services, and presents public content."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ConfigurationCard
            icon="⚙️"
            title="Platform Settings"
            description="Control event pricing, promotion windows, ambassador rules, and platform-wide behavior."
            href="/admin/settings"
            badge="Operational Rules"
            accent
          />

          <ConfigurationCard
            icon="🏠"
            title="Homepage Experience"
            description="Control homepage rails, active cities, featured content, and discovery modules."
            href="/admin/settings#homepage"
            badge="Public Experience"
          />

          <ConfigurationCard
            icon="💳"
            title="Packages and Pricing"
            description="Manage promotion prices, Linkd’N upgrades, included days, and optional add-ons."
            href="/admin/settings#packages"
            badge="Revenue"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Configuration Registry"
          title="Selectable platform values"
          text="These values power event creation, user preferences, discovery filters, revisions, and public event information."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ConfigurationCard
            icon="🧩"
            title="Lookup Manager"
            description="Manage event types, music genres, vibes, amenities, dress codes, age rules, parking, and other selectable values."
            href="/admin/lookups"
            badge={`${valueCount || 0} values`}
            accent
          />

          <ConfigurationCard
            icon="🗂️"
            title="Lookup Categories"
            description="Create and organize lookup groups that define where selectable values belong."
            href="/admin/lookups?view=categories"
            badge={`${categoryCount || 0} categories`}
          />

          <ConfigurationCard
            icon="📥"
            title="Import and Export"
            description="Prepare bulk lookup imports and exports for large category updates."
            href="/admin/lookups?view=import"
            badge="Coming Next"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Discovery Configuration"
          title="Control what users can discover"
          text="Manage the systems that affect search, recommendations, homepage discovery, and personalization."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ConfigurationCard
            icon="🔎"
            title="Search Configuration"
            description="Manage searchable fields, city behavior, default distance, and filtering rules."
            href="/admin/configuration/search"
            badge="Future Module"
          />

          <ConfigurationCard
            icon="🌆"
            title="Discovery Rules"
            description="Configure how event supply, city demand, and recommendation signals are interpreted."
            href="/admin/discovery"
            badge="Discovery"
          />

          <ConfigurationCard
            icon="🎯"
            title="User Preferences"
            description="Manage which preference categories contribute to personalized event recommendations."
            href="/admin/configuration/preferences"
            badge="Personalization"
          />

          <ConfigurationCard
            icon="✨"
            title="AI Configuration"
            description="Control future AI-generated suggestions, moderation checks, and discovery recommendations."
            href="/admin/discovery/ai"
            badge="AI"
          />

          <ConfigurationCard
            icon="🔔"
            title="Notifications"
            description="Configure notification categories, triggers, and future delivery rules."
            href="/admin/configuration/notifications"
            badge="Future Module"
          />

          <ConfigurationCard
            icon="🛡️"
            title="Moderation Rules"
            description="Define future moderation thresholds, required fields, and quality expectations."
            href="/admin/configuration/moderation"
            badge="Future Module"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Connected Systems"
          title="Configure the HypeKnight ecosystem"
          text="These modules will eventually share the same configuration registry and operational rules."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ConfigurationCard
            icon="⚔️"
            title="Ambassador Program"
            description="Manage ambassador limits, commissions, coupon ranges, and eligibility."
            href="/admin/settings#ambassadors"
            badge="Program Rules"
          />

          <ConfigurationCard
            icon="🔗"
            title="Linkd’N"
            description="Control Linkd’N package availability, pricing, and future integration rules."
            href="/admin/settings#packages"
            badge="Connected Product"
          />

          <ConfigurationCard
            icon="📡"
            title="Patron Pulse"
            description="Prepare future configuration for live engagement, venue signals, and pulse-driven experiences."
            href="/admin/configuration/patron-pulse"
            badge="Future Module"
          />

          <ConfigurationCard
            icon="🏅"
            title="Badges and Achievements"
            description="Prepare rewards, user achievements, and contribution recognition."
            href="/admin/configuration/badges"
            badge="Future Module"
          />

          <ConfigurationCard
            icon="🎁"
            title="Rewards"
            description="Configure future user, venue, ambassador, and promoter rewards."
            href="/admin/configuration/rewards"
            badge="Future Module"
          />

          <ConfigurationCard
            icon="🤖"
            title="Automation"
            description="Manage future lifecycle jobs, scheduled updates, alerts, and operational automation."
            href="/admin/system"
            badge="System"
          />
        </div>
      </section>
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.28em] text-accent">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:text-base">
        {text}
      </p>
    </div>
  );
}

function ConfigurationCard({
  icon,
  title,
  description,
  href,
  badge,
  accent = false,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-[2rem] border p-6 transition sm:p-8 ${
        accent
          ? 'border-accent/20 bg-accent/10 hover:border-accent/50'
          : 'border-white/10 bg-white/5 hover:border-accent/40 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-3xl">{icon}</span>

        {badge ? (
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/55">
            {badge}
          </span>
        ) : null}
      </div>

      <h3 className="mt-5 text-2xl font-black text-white group-hover:text-accent">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-white/65">
        {description}
      </p>

      <p className="mt-6 text-sm font-semibold text-accent">
        Configure →
      </p>
    </Link>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
      {label}
    </span>
  );
}