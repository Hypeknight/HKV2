import Link from 'next/link';
import type { OwnerActivityItem } from '@/lib/dashboard/activity';

type Props = {
  items: OwnerActivityItem[];
};

export default function OwnerActivityFeed({
  items,
}: Props) {
  if (!items.length) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="font-semibold text-white">
          No event activity yet.
        </p>

        <p className="mt-2 text-sm leading-6 text-white/50">
          Submissions, approvals, revisions, payment updates,
          and promotion changes will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
      <div className="divide-y divide-white/10">
        {items.map((item) => (
          <article
            key={item.id}
            className="grid gap-4 p-5 transition hover:bg-white/[0.025] md:grid-cols-[150px_1fr_auto] md:items-start sm:p-6"
          >
            <div>
              <p className="text-sm font-semibold text-white">
                {formatDate(item.created_at)}
              </p>

              <p className="mt-1 text-xs text-white/40">
                {formatRelativeTime(item.created_at)}
              </p>

              <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/55">
                {item.kind === 'lifecycle'
                  ? 'Event Progress'
                  : 'HypeKnight Update'}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-sm text-accent">
                {item.event_name}
              </p>

              <h3 className="mt-1 text-xl font-black text-white">
                {item.title}
              </h3>

              {item.message ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/60">
                  {item.message}
                </p>
              ) : null}
            </div>

            <Link
              href={`/dashboard/events/${item.event_id}/review`}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center text-sm font-semibold text-white hover:border-accent/40"
            >
              Open Event
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 'Unknown';
  }

  const difference = Date.now() - timestamp;
  const minutes = Math.floor(difference / 60_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}