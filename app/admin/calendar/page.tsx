import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createSpecialDay } from './actions';

export default async function AdminCalendarPage() {
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

  const { data: specialDays, error } = await supabase
    .from('special_days')
    .select('*')
    .order('starts_on', { ascending: true });

  if (error) throw new Error(error.message);

  const activeCount = specialDays?.filter((day) => day.is_active).length ?? 0;
  const featuredCount = specialDays?.filter((day) => day.is_featured).length ?? 0;

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin" className="text-sm text-white/60 hover:text-accent">
          ← Back to Admin
        </Link>

        <Link
          href="/calendar"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-white hover:border-accent/40"
        >
          View Public Calendar
        </Link>
      </div>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Admin Calendar Control
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Special Days + Event Themes
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Create holidays, seasonal moments, themed weekends, city moments, and
          event collections. After creating a theme, open it to assign
          HypeKnight or external events.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="Total Themes" value={String(specialDays?.length ?? 0)} />
          <Metric label="Active Themes" value={String(activeCount)} />
          <Metric label="Featured Themes" value={String(featuredCount)} />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          action={createSpecialDay}
          className="space-y-5 rounded-[2.5rem] border border-white/10 bg-white/5 p-8"
        >
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-accent">
              Create
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              New Calendar Theme
            </h2>
          </div>

          <Input
            name="name"
            label="Theme Name"
            placeholder="July 4th Weekend"
            required
          />

          <label className="block">
            <span className="text-sm text-white/60">Description</span>
            <textarea
              name="description"
              rows={4}
              placeholder="Events connected to fireworks, parties, cookouts, celebrations, and local experiences."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
          </label>

          <label className="block">
            <span className="text-sm text-white/60">Category</span>
            <select
              name="category"
              defaultValue="holiday"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            >
              <option value="holiday">Holiday</option>
              <option value="seasonal">Seasonal</option>
              <option value="city">City Theme</option>
              <option value="sports">Sports</option>
              <option value="music">Music</option>
              <option value="food">Food</option>
              <option value="nightlife">Nightlife</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <Input name="starts_on" label="Start Date" type="date" required />
            <Input name="ends_on" label="End Date" type="date" />
          </div>

          <div className="grid gap-3">
            <Toggle name="is_active" label="Active / visible on public calendar" defaultChecked />
            <Toggle name="is_featured" label="Featured on homepage/calendar widgets" />
          </div>

          <button className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90">
            Create Theme
          </button>
        </form>

        <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-accent">
                Manage
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Existing Themes
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {specialDays?.length ? (
              specialDays.map((day) => (
                <Link
                  key={day.id}
                  href={`/admin/calendar/${day.id}`}
                  className="block rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-accent/40 hover:bg-white/[0.07]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{day.name}</h3>
                    <Chip label={day.category || 'custom'} />
                    <Chip label={day.is_active ? 'active' : 'hidden'} />
                    {day.is_featured ? <Chip label="featured" /> : null}
                  </div>

                  <p className="mt-2 text-white/55">
                    {formatDate(day.starts_on)}
                    {day.ends_on ? ` – ${formatDate(day.ends_on)}` : ''}
                  </p>

                  {day.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-white/60">
                      {day.description}
                    </p>
                  ) : null}

                  <p className="mt-4 text-sm font-semibold text-accent">
                    Edit theme / assign events →
                  </p>
                </Link>
              ))
            ) : (
              <Empty text="No special days have been created yet." />
            )}
          </div>
        </section>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Input({
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm text-white/60">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}

function Toggle({
  name,
  label,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
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
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}