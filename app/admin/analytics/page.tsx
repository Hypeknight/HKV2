import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminAnalyticsPage() {
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

  const now = new Date();

  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - 7);

  const startOfLastWeek = new Date(now);
  startOfLastWeek.setDate(now.getDate() - 14);

  const { data: views, error: viewsError } = await supabase
    .from('event_view_logs')
    .select('*')
    .gte('created_at', startOfLastWeek.toISOString())
    .order('created_at', { ascending: false });

  if (viewsError) throw new Error(viewsError.message);

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, city, state, status, created_at, activated_at')
    .gte('created_at', startOfLastWeek.toISOString());

  if (eventsError) throw new Error(eventsError.message);

  const allViews = views ?? [];

  const thisWeekViews = allViews.filter(
    (view) => new Date(view.created_at) >= startOfThisWeek
  );

  const lastWeekViews = allViews.filter((view) => {
    const created = new Date(view.created_at);
    return created >= startOfLastWeek && created < startOfThisWeek;
  });

  const thisWeekCityViews = groupViewsByCity(thisWeekViews);
  const lastWeekCityViews = groupViewsByCity(lastWeekViews);

  const topThisWeekCity = thisWeekCityViews[0];
  const topLastWeekCity = lastWeekCityViews[0];

  const homepageViews = thisWeekViews.filter(
    (view) => view.page_type === 'homepage'
  ).length;

  const eventsIndexViews = thisWeekViews.filter(
    (view) => view.page_type === 'events_index'
  ).length;

  const internalEventViews = thisWeekViews.filter(
    (view) => view.source_type === 'hypeknight'
  ).length;

  const externalEventViews = thisWeekViews.filter(
    (view) => view.source_type === 'external'
  ).length;

  const thisWeekEventsByCity = groupEventsByCity(
    (events ?? []).filter((event) => {
      const created = new Date(event.created_at);
      return created >= startOfThisWeek;
    })
  );

  const lastWeekEventsByCity = groupEventsByCity(
    (events ?? []).filter((event) => {
      const created = new Date(event.created_at);
      return created >= startOfLastWeek && created < startOfThisWeek;
    })
  );

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-white/60 hover:text-accent">
        ← Back to Admin
      </Link>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          HypeKnight Analytics
        </p>

        <h1 className="mt-3 text-4xl font-black text-white">
          City Pulse + View Tracking
        </h1>

        <p className="mt-3 max-w-3xl text-white/70">
          Track event discovery activity by city, page type, and event source.
          This helps HypeKnight understand where attention is building.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Views This Week" value={String(thisWeekViews.length)} />
          <Metric label="Views Last Week" value={String(lastWeekViews.length)} />
          <Metric
            label="Top City This Week"
            value={
              topThisWeekCity
                ? `${topThisWeekCity.city}, ${topThisWeekCity.state}`
                : '—'
            }
          />
          <Metric
            label="Top City Last Week"
            value={
              topLastWeekCity
                ? `${topLastWeekCity.city}, ${topLastWeekCity.state}`
                : '—'
            }
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Homepage Views" value={String(homepageViews)} />
        <Metric label="Events Page Views" value={String(eventsIndexViews)} />
        <Metric label="HypeKnight Event Views" value={String(internalEventViews)} />
        <Metric label="External Event Views" value={String(externalEventViews)} />
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Panel title="Views This Week by City">
          <CityViewTable rows={thisWeekCityViews} />
        </Panel>

        <Panel title="Views Last Week by City">
          <CityViewTable rows={lastWeekCityViews} />
        </Panel>

        <Panel title="Events Created This Week by City">
          <CityEventTable rows={thisWeekEventsByCity} />
        </Panel>

        <Panel title="Events Created Last Week by City">
          <CityEventTable rows={lastWeekEventsByCity} />
        </Panel>
      </section>

      <Panel title="Recent View Logs">
        {allViews.length ? (
          <div className="space-y-3">
            {allViews.slice(0, 25).map((view) => (
              <div
                key={view.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Chip label={view.page_type || 'unknown'} />
                  <Chip label={view.source_type || 'page'} />
                  <Chip label={[view.city, view.state].filter(Boolean).join(', ') || 'Unknown city'} />
                </div>

                <p className="mt-2 break-all text-sm text-white/50">
                  {view.path || 'No path'}
                </p>

                <p className="mt-2 text-xs text-white/35">
                  {formatDate(view.created_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No view logs have been recorded yet." />
        )}
      </Panel>
    </section>
  );
}

function groupViewsByCity(views: any[]) {
  const map = new Map<
    string,
    {
      city: string;
      state: string;
      views: number;
    }
  >();

  for (const view of views) {
    const city = String(view.city || 'Unknown').trim() || 'Unknown';
    const state = String(view.state || '').trim();
    const key = `${city.toLowerCase()}-${state}`;

    const existing = map.get(key);

    if (existing) {
      existing.views += 1;
    } else {
      map.set(key, { city, state, views: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.views - a.views);
}

function groupEventsByCity(events: any[]) {
  const map = new Map<
    string,
    {
      city: string;
      state: string;
      events: number;
      active: number;
    }
  >();

  for (const event of events) {
    const city = String(event.city || 'Unknown').trim() || 'Unknown';
    const state = String(event.state || '').trim();
    const key = `${city.toLowerCase()}-${state}`;

    const existing = map.get(key);

    if (existing) {
      existing.events += 1;
      if (event.status === 'active') existing.active += 1;
    } else {
      map.set(key, {
        city,
        state,
        events: 1,
        active: event.status === 'active' ? 1 : 0,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.events - a.events);
}

function CityViewTable({
  rows,
}: {
  rows: Array<{ city: string; state: string; views: number }>;
}) {
  if (!rows.length) return <Empty text="No city view data yet." />;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={`${row.city}-${row.state}`}
          className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div>
            <p className="font-semibold text-white">
              {row.city}
              {row.state ? `, ${row.state}` : ''}
            </p>
            <p className="text-sm text-white/45">{pulseLabel(row.views)}</p>
          </div>

          <p className="text-2xl font-black text-white">{row.views}</p>
        </div>
      ))}
    </div>
  );
}

function CityEventTable({
  rows,
}: {
  rows: Array<{ city: string; state: string; events: number; active: number }>;
}) {
  if (!rows.length) return <Empty text="No city event data yet." />;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={`${row.city}-${row.state}`}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">
                {row.city}
                {row.state ? `, ${row.state}` : ''}
              </p>
              <p className="text-sm text-white/45">
                {row.active} active / {row.events} total
              </p>
            </div>

            <p className="text-2xl font-black text-white">{row.events}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function pulseLabel(value: number) {
  if (value >= 100) return 'On fire';
  if (value >= 50) return 'Busy';
  if (value >= 15) return 'Picking up';
  if (value >= 1) return 'Warming up';
  return 'Quiet';
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/65">
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
      {text}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}