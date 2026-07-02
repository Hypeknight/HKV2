import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PublicCalendarPage() {
  const supabase = await createClient();

  const { data: specialDays, error } = await supabase
    .from('special_days')
    .select('*')
    .eq('is_active', true)
    .order('starts_on', { ascending: true });

  if (error) throw new Error(error.message);

  const featured = specialDays?.filter((day) => day.is_featured) ?? [];
  const allDays = specialDays ?? [];

  return (
    <section className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-[3rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          HypeKnight Calendar
        </p>

        <h1 className="mt-3 max-w-4xl text-5xl font-black text-white">
          Find events around holidays, seasons, and special themes.
        </h1>

        <p className="mt-4 max-w-3xl text-white/70">
          Browse themed collections like July 4th, Easter Weekend, Halloween,
          First Day of Spring, Super Bowl Weekend, and more.
        </p>
      </section>

      {featured.length ? (
        <section>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Featured
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Featured Calendar Themes
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((day) => (
              <SpecialDayCard key={day.id} day={day} featured />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Browse
        </p>
        <h2 className="mt-3 text-3xl font-bold text-white">
          All Special Days
        </h2>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {allDays.length ? (
            allDays.map((day) => <SpecialDayCard key={day.id} day={day} />)
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/60">
              No public calendar themes are available yet.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function SpecialDayCard({ day, featured = false }: { day: any; featured?: boolean }) {
  return (
    <Link
      href={`/calendar/${day.slug}`}
      className={`block rounded-[2rem] border p-6 transition hover:border-accent/40 ${
        featured
          ? 'border-accent/20 bg-accent/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        {day.category || 'Theme'}
      </p>

      <h3 className="mt-3 text-2xl font-bold text-white">{day.name}</h3>

      <p className="mt-3 text-white/55">
        {formatDate(day.starts_on)}
        {day.ends_on ? ` – ${formatDate(day.ends_on)}` : ''}
      </p>

      {day.description ? (
        <p className="mt-4 line-clamp-3 text-sm text-white/65">
          {day.description}
        </p>
      ) : null}

      <p className="mt-6 text-sm font-semibold text-accent">
        View themed events →
      </p>
    </Link>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}