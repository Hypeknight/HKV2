import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getOwnerActivity,
} from '@/lib/dashboard/activity';
import OwnerActivityFeed from '@/components/dashboard/OwnerActivityFeed';

type Props = {
  searchParams?: Promise<{
    q?: string;
    event_id?: string;
    page?: string;
  }>;
};

export default async function DashboardActivityPage({
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

  const { data: ownedEvents, error: eventsError } =
    await supabase
      .from('events')
      .select('id, name')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false });

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const search = clean(query.q);
  const eventId = clean(query.event_id);
  const requestedPage = positiveInteger(query.page, 1);

  const activity = await getOwnerActivity(
    supabase,
    user.id,
    {
      search,
      eventId,
      page: requestedPage,
      pageSize: 30,
    }
  );

  return (
    <section className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Dashboard
        </Link>

        <Link
          href="/dashboard/events"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
        >
          My Events
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            Owner Activity
          </p>

          <h1 className="mt-3 max-w-5xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
            Follow every event update.
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Track submissions, approvals, payment changes,
            revision requests, public visibility, removals,
            refunds, and completed event milestones.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Metric
              label="Activity Records"
              value={activity.total}
              text="All matching owner-visible updates."
            />

            <Metric
              label="Owned Events"
              value={ownedEvents?.length || 0}
              text="Events connected to your account."
            />

            <Metric
              label="Current Page"
              value={activity.page}
              text={`Page ${activity.page} of ${activity.pageCount}.`}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
        <form className="grid gap-3 md:grid-cols-[1fr_280px_auto]">
          <input
            name="q"
            defaultValue={query.q || ''}
            placeholder="Search event or update..."
            className={fieldClass}
          />

          <select
            name="event_id"
            defaultValue={eventId}
            className={fieldClass}
          >
            <option value="">All Events</option>

            {(ownedEvents || []).map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {event.name || 'Untitled Event'}
              </option>
            ))}
          </select>

          <button className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90">
            Apply Filters
          </button>
        </form>

        {search || eventId ? (
          <Link
            href="/dashboard/activity"
            className="mt-4 inline-flex text-sm font-semibold text-white/55 hover:text-accent"
          >
            Clear filters
          </Link>
        ) : null}
      </section>

      <section>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Event Updates
          </p>

          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            {activity.total} update
            {activity.total === 1 ? '' : 's'}
          </h2>
        </div>

        <div className="mt-6">
          <OwnerActivityFeed
            items={activity.items}
          />
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
    <nav className="mt-8 flex items-center justify-between gap-4">
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

  return `/dashboard/activity?${params.toString()}`;
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

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';