import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, MetricCard, SectionHeader } from '@/components/ui';

export default async function PublicCalendarPage() {
  const supabase = await createClient();

  const { data: specialDays, error } = await supabase
    .from('special_days')
    .select('*')
    .eq('is_active', true)
    .order('starts_on', { ascending: true });

  if (error) throw new Error(error.message);

  const allDays = specialDays ?? [];
  const featured = allDays.filter((day) => day.is_featured);
  const upcoming = allDays.filter((day) => isUpcoming(day.starts_on));
  const seasonal = allDays.filter((day) =>
    String(day.category || '').toLowerCase().includes('season')
  );

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            HypeKnight Calendar
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Find events by holidays, seasons, and city moments.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Browse themed collections like July 4th, Easter Weekend, Halloween,
            Super Bowl Weekend, First Day of Spring, festivals, and local
            celebrations.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Themes" value={allDays.length} />
            <MetricCard label="Featured" value={featured.length} accent />
            <MetricCard label="Upcoming" value={upcoming.length} />
            <MetricCard label="Seasonal" value={seasonal.length} />
          </div>
        </div>
      </section>

      {featured.length ? (
        <section>
          <SectionHeader
            eyebrow="Featured"
            title="Featured calendar themes"
            text="Start with the moments HypeKnight is highlighting right now."
          />

          <div className="mt-5 flex gap-4 overflow-x-auto pb-2 sm:mt-8 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3">
            {featured.map((day) => (
              <SpecialDayCard key={day.id} day={day} featured />
            ))}
          </div>
        </section>
      ) : null}

      {upcoming.length ? (
        <section>
          <SectionHeader
            eyebrow="Upcoming"
            title="Coming up next"
            text="Quick access to the next special days and themed event collections."
          />

          <div className="mt-5 flex gap-4 overflow-x-auto pb-2 sm:mt-8 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3">
            {upcoming.slice(0, 6).map((day) => (
              <SpecialDayCard key={day.id} day={day} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          eyebrow="Browse"
          title="All special days"
          text="Explore every active public calendar theme."
        />

        {allDays.length ? (
          <div className="mt-5 grid gap-4 sm:mt-8 md:grid-cols-2 xl:grid-cols-3">
            {allDays.map((day) => (
              <SpecialDayCard key={day.id} day={day} />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState text="No public calendar themes are available yet." />
          </div>
        )}
      </section>
    </section>
  );
}

function SpecialDayCard({
  day,
  featured = false,
}: {
  day: any;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/calendar/${day.slug}`}
      className={`block min-w-[78vw] rounded-[1.75rem] border p-5 transition hover:border-accent/40 sm:min-w-0 sm:rounded-[2rem] sm:p-6 ${
        featured
          ? 'border-accent/20 bg-accent/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.25em] text-accent sm:text-xs">
        {day.category || 'Theme'}
      </p>

      <h3 className="mt-3 text-xl font-black leading-tight text-white sm:text-2xl">
        {day.name}
      </h3>

      <p className="mt-3 text-sm text-white/55">
        {formatDate(day.starts_on)}
        {day.ends_on ? ` – ${formatDate(day.ends_on)}` : ''}
      </p>

      {day.description ? (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/65">
          {day.description}
        </p>
      ) : null}

      <p className="mt-6 text-sm font-semibold text-accent">
        View themed events →
      </p>
    </Link>
  );
}

function isUpcoming(value?: string | null) {
  if (!value) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(`${value}T00:00:00`);
  return date >= today;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}