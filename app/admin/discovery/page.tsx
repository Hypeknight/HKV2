import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { importTicketmasterEvents } from '@/app/admin/external-events/actions';

export default async function AdminDiscoveryPage() {
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

  const nowIso = new Date().toISOString();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);

  const [
    hypeEventsResult,
    externalEventsResult,
    venueResult,
    subscriptionsResult,
  ] = await Promise.all([
    supabase
      .from('events')
      .select(`
        id,
        name,
        city,
        state,
        status,
        is_public,
        is_paid,
        payment_status,
        total_price,
        payment_amount,
        paid_at,
        event_start_at,
        created_at
      `),

    supabase
      .from('external_events')
      .select(`
        id,
        name,
        city,
        state,
        source_code,
        status,
        event_start_at,
        created_at
      `),

    supabase
      .from('venues')
      .select('id, name, city, state, status, is_visible, created_at'),

    supabase
      .from('venue_subscriptions')
      .select('id, subscription_status, payment_due_status, last_payment_amount, created_at'),
  ]);

  if (hypeEventsResult.error) throw new Error(hypeEventsResult.error.message);
  if (externalEventsResult.error) throw new Error(externalEventsResult.error.message);
  if (venueResult.error) throw new Error(venueResult.error.message);
  if (subscriptionsResult.error) throw new Error(subscriptionsResult.error.message);

  const hypeEvents = hypeEventsResult.data ?? [];
  const externalEvents = externalEventsResult.data ?? [];
  const venues = venueResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];

  const activeHypeEvents = hypeEvents.filter((event) => event.status === 'active');
  const scheduledEvents = hypeEvents.filter((event) => event.status === 'scheduled');
  const paidAwaitingApproval = hypeEvents.filter(
    (event) => event.status === 'paid_awaiting_approval'
  );
  const npnaEvents = hypeEvents.filter((event) => event.status === 'NPNA');
  const completedEvents = hypeEvents.filter((event) => event.status === 'completed');

  const upcomingSevenDays = hypeEvents.filter((event) => {
    if (!event.event_start_at) return false;
    const start = new Date(event.event_start_at);
    return start >= new Date(nowIso) && start <= sevenDays;
  });

  const activeExternalEvents = externalEvents.filter(
    (event) => event.status === 'active'
  );

  const ticketmasterEvents = externalEvents.filter(
    (event) => event.source_code === 'ticketmaster'
  );

  const eventRevenue = hypeEvents.reduce((total, event) => {
    const paid =
      event.is_paid === true || event.payment_status === 'paid';

    if (!paid) return total;

    return total + Number(event.payment_amount || event.total_price || 0);
  }, 0);

  const venueRevenue = subscriptions.reduce((total, sub) => {
    return total + Number(sub.last_payment_amount || 0);
  }, 0);

  const cityMap = new Map<
    string,
    {
      city: string;
      state: string;
      hype: number;
      external: number;
      total: number;
    }
  >();

  for (const event of hypeEvents) {
    if (!event.city) continue;
    const key = `${event.city},${event.state || ''}`.toLowerCase();

    const row =
      cityMap.get(key) ||
      {
        city: event.city,
        state: event.state || '',
        hype: 0,
        external: 0,
        total: 0,
      };

    row.hype += 1;
    row.total += 1;
    cityMap.set(key, row);
  }

  for (const event of externalEvents) {
    if (!event.city) continue;
    const key = `${event.city},${event.state || ''}`.toLowerCase();

    const row =
      cityMap.get(key) ||
      {
        city: event.city,
        state: event.state || '',
        hype: 0,
        external: 0,
        total: 0,
      };

    row.external += 1;
    row.total += 1;
    cityMap.set(key, row);
  }

  const cityRows = Array.from(cityMap.values()).sort(
    (a, b) => b.total - a.total
  );

  const weakCities = cityRows.filter((city) => city.hype < 3).slice(0, 10);

  return (
    <section className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Admin
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          Discovery Nerve Center
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Track event inventory, source coverage, payment movement, city gaps,
          and external discovery imports from one control center.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active HypeKnight Events" value={String(activeHypeEvents.length)} tone="green" />
        <Metric label="Paid Awaiting Approval" value={String(paidAwaitingApproval.length)} tone="yellow" />
        <Metric label="External Events" value={String(activeExternalEvents.length)} tone="accent" />
        <Metric label="Cities Covered" value={String(cityRows.length)} tone="blue" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Scheduled Events" value={String(scheduledEvents.length)} tone="blue" />
        <Metric label="NPNA Events" value={String(npnaEvents.length)} tone="orange" />
        <Metric label="Next 7 Days" value={String(upcomingSevenDays.length)} tone="green" />
        <Metric label="Completed Events" value={String(completedEvents.length)} tone="gray" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Event Revenue" value={`$${eventRevenue.toFixed(2)}`} tone="accent" />
        <Metric label="Venue Revenue" value={`$${venueRevenue.toFixed(2)}`} tone="accent" />
        <Metric label="Venues" value={String(venues.length)} tone="blue" />
        <Metric label="Ticketmaster Events" value={String(ticketmasterEvents.length)} tone="yellow" />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">
              External Discovery
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              Manual Ticketmaster Import
            </h2>
            <p className="mt-3 max-w-2xl text-white/70">
              Fill city gaps by importing supplemental events. These appear as
              external events and are not treated as HypeKnight-managed events.
            </p>
          </div>

          <Link
            href="/admin/external-events"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
          >
            External Event Manager
          </Link>
        </div>

        <form action={importTicketmasterEvents} className="mt-8 grid gap-4 md:grid-cols-4">
          <input
            name="city"
            placeholder="City"
            required
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
          />

          <input
            name="state"
            placeholder="State, e.g. MO"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
          />

          <input
            name="keyword"
            placeholder="Keyword, optional"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
          />

          <button
            type="submit"
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Import
          </button>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="City Coverage" subtitle="Where HypeKnight and external events are currently visible.">
          {cityRows.length ? (
            <div className="space-y-3">
              {cityRows.slice(0, 12).map((city) => (
                <CityRow key={`${city.city}-${city.state}`} city={city} />
              ))}
            </div>
          ) : (
            <Empty text="No city coverage yet." />
          )}
        </Panel>

        <Panel title="Weak Coverage Cities" subtitle="Cities with fewer than 3 HypeKnight events.">
          {weakCities.length ? (
            <div className="space-y-3">
              {weakCities.map((city) => (
                <CityRow key={`${city.city}-${city.state}`} city={city} weak />
              ))}
            </div>
          ) : (
            <Empty text="No weak cities detected." />
          )}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Event Pipeline" subtitle="Quick links into operational queues.">
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminLink href="/admin/events" label="Event Moderation" />
            <AdminLink href="/admin/payments" label="Payments" />
            <AdminLink href="/events" label="Public Events" />
            <AdminLink href="/admin/external-events" label="External Events" />
          </div>
        </Panel>

        <Panel title="Recommended Next Actions" subtitle="Suggested operational priorities.">
          <div className="space-y-3">
            {paidAwaitingApproval.length ? (
              <Action text={`${paidAwaitingApproval.length} paid events need admin approval.`} />
            ) : null}

            {npnaEvents.length ? (
              <Action text={`${npnaEvents.length} events are blocked by payment.`} />
            ) : null}

            {weakCities.length ? (
              <Action text={`${weakCities.length} cities need more HypeKnight inventory.`} />
            ) : null}

            {!paidAwaitingApproval.length && !npnaEvents.length && !weakCities.length ? (
              <Action text="No immediate discovery issues detected." />
            ) : null}
          </div>
        </Panel>
      </section>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'yellow' | 'orange' | 'accent' | 'blue' | 'gray';
}) {
  const styles =
    tone === 'green'
      ? 'border-green-500/20 bg-green-500/10'
      : tone === 'yellow'
      ? 'border-yellow-500/20 bg-yellow-500/10'
      : tone === 'orange'
      ? 'border-orange-500/20 bg-orange-500/10'
      : tone === 'blue'
      ? 'border-blue-500/20 bg-blue-500/10'
      : tone === 'accent'
      ? 'border-accent/20 bg-accent/10'
      : 'border-white/10 bg-white/5';

  return (
    <div className={`rounded-3xl border p-5 ${styles}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-white/65">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function CityRow({
  city,
  weak = false,
}: {
  city: {
    city: string;
    state: string;
    hype: number;
    external: number;
    total: number;
  };
  weak?: boolean;
}) {
  const citySlug = city.city.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">
            {city.city}, {city.state}
          </p>
          <p className="mt-1 text-sm text-white/55">
            HypeKnight: {city.hype} • External: {city.external} • Total: {city.total}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {weak ? (
            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs text-orange-200">
              Needs inventory
            </span>
          ) : null}

          <Link
            href={`/events/city/${citySlug}`}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white hover:border-accent/40"
          >
            View City
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center text-white hover:border-accent/40"
    >
      {label}
    </Link>
  );
}

function Action({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/75">
      {text}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/60">
      {text}
    </div>
  );
}