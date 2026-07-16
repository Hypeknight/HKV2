import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getAdminActivity,
  getAdminActivityOptions,
} from '@/lib/admin/activity';
import AdminActivityFeed from '@/components/admin/AdminActivityFeed';

type Props = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    action?: string;
    entity_type?: string;
    actor_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
  }>;
};

export default async function AdminActivityPage({
  searchParams,
}: Props) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const filters = {
    search: clean(query.q),
    category: clean(query.category),
    action: clean(query.action),
    entityType: clean(query.entity_type),
    actorId: clean(query.actor_id),
    dateFrom: clean(query.date_from),
    dateTo: clean(query.date_to),
    page: positiveInteger(query.page, 1),
    pageSize: 30,
  };

  const [activity, options] = await Promise.all([
    getAdminActivity(supabase, filters),
    getAdminActivityOptions(supabase),
  ]);

  const activeFilterCount = [
    filters.search,
    filters.category,
    filters.action,
    filters.entityType,
    filters.actorId,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const todayCount = activity.items.filter((item) =>
    isToday(item.created_at)
  ).length;

  const eventCount = activity.items.filter(
    (item) => item.category === 'event'
  ).length;

  const uniqueActors = new Set(
    activity.items
      .map((item) => item.actor_id)
      .filter(Boolean)
  ).size;

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Admin
        </Link>

        <Link
          href="/admin/events"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
        >
          Event Moderation
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            Global Administration
          </p>

          <h1 className="mt-3 max-w-5xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
            Activity and audit center.
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Review administrative actions across events, payments,
            visibility, revisions, and future HypeKnight operational
            systems from one searchable history.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Matching Records"
              value={activity.total}
              text="All activity matching the current filters."
            />

            <Metric
              label="Visible Today"
              value={todayCount}
              text="Activity from today on the current page."
            />

            <Metric
              label="Event Operations"
              value={eventCount}
              text="Event-related records on the current page."
            />

            <Metric
              label="Active Administrators"
              value={uniqueActors}
              text="Unique actors represented on this page."
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4 sm:rounded-[2.5rem] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Activity Filters
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Find a specific administrative action.
            </h2>
          </div>

          {activeFilterCount ? (
            <Link
              href="/admin/activity"
              className="text-sm font-semibold text-white/55 hover:text-accent"
            >
              Clear {activeFilterCount} active filter
              {activeFilterCount === 1 ? '' : 's'}
            </Link>
          ) : null}
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="q"
            defaultValue={query.q || ''}
            placeholder="Actor, event, action, ID, reason, or note..."
            className={fieldClass}
          />

          <select
            name="category"
            defaultValue={filters.category}
            className={fieldClass}
          >
            <option value="">All Categories</option>

            {options.categories.map((category) => (
              <option key={category} value={category}>
                {formatLabel(category)}
              </option>
            ))}
          </select>

          <select
            name="action"
            defaultValue={filters.action}
            className={fieldClass}
          >
            <option value="">All Actions</option>

            {options.actions.map((action) => (
              <option key={action} value={action}>
                {formatLabel(action)}
              </option>
            ))}
          </select>

          <select
            name="entity_type"
            defaultValue={filters.entityType}
            className={fieldClass}
          >
            <option value="">All Record Types</option>

            {options.entityTypes.map((entityType) => (
              <option key={entityType} value={entityType}>
                {formatLabel(entityType)}
              </option>
            ))}
          </select>

          <select
            name="actor_id"
            defaultValue={filters.actorId}
            className={fieldClass}
          >
            <option value="">All Administrators</option>

            {options.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              From Date
            </span>

            <input
              name="date_from"
              type="date"
              defaultValue={query.date_from || ''}
              className={fieldClass}
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Through Date
            </span>

            <input
              name="date_to"
              type="date"
              defaultValue={query.date_to || ''}
              className={fieldClass}
            />
          </label>

          <div className="flex items-end">
            <button className="w-full rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90">
              Apply Filters
            </button>
          </div>
        </form>
      </section>

      <section>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Recorded Operations
          </p>

          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            {activity.total} activity record
            {activity.total === 1 ? '' : 's'}
          </h2>

          <p className="mt-2 text-sm text-white/55">
            Page {activity.page} of {activity.pageCount}. Newest
            administrative actions appear first.
          </p>
        </div>

        <div className="mt-6">
          <AdminActivityFeed items={activity.items} />
        </div>

        <Pagination
          page={activity.page}
          pageCount={activity.pageCount}
          query={query}
        />
      </section>
    </section>
  );
}

function Metric({
  label,
  value,
  text,
}: {
  label: string;
  value: number;
  text: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-white/55">
        {text}
      </p>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  query,
}: {
  page: number;
  pageCount: number;
  query: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-between gap-4">
      {page > 1 ? (
        <Link
          href={buildPageHref(query, page - 1)}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:border-accent/40"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}

      <p className="text-sm text-white/50">
        Page {page} of {pageCount}
      </p>

      {page < pageCount ? (
        <Link
          href={buildPageHref(query, page + 1)}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:border-accent/40"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function buildPageHref(
  query: Record<string, string | undefined>,
  page: number
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value && key !== 'page') {
      params.set(key, value);
    }
  }

  params.set('page', String(page));

  return `/admin/activity?${params.toString()}`;
}

function positiveInteger(
  value: unknown,
  fallback: number
) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 1) {
    return fallback;
  }

  return Math.floor(number);
}

function clean(value: unknown) {
  return String(value || '').trim();
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';