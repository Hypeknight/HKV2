import Link from 'next/link';
import type { AdminActivityItem } from '@/lib/admin/activity';

type Props = {
  items: AdminActivityItem[];
  compact?: boolean;
};

export default function AdminActivityFeed({
  items,
  compact = false,
}: Props) {
  if (!items.length) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="font-semibold text-white">
          No administrative activity found.
        </p>

        <p className="mt-2 text-sm text-white/50">
          New administrative actions will appear here after they are recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
      <div className="divide-y divide-white/10">
        {items.map((item) => (
          <ActivityRow
            key={item.id}
            item={item}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({
  item,
  compact,
}: {
  item: AdminActivityItem;
  compact: boolean;
}) {
  const entityHref = getEntityHref(item);
  const stateChanges = getStateChanges(item);

  return (
    <article className="grid gap-4 p-5 transition hover:bg-white/[0.025] md:grid-cols-[170px_1fr] md:p-6">
      <div>
        <p className="text-sm font-semibold text-white">
          {formatDateTime(item.created_at)}
        </p>

        <p className="mt-1 text-xs text-white/40">
          {formatRelativeTime(item.created_at)}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge
            label={formatLabel(item.category)}
            tone={categoryTone(item.category)}
          />

          <Badge
            label={formatLabel(item.source)}
            tone="neutral"
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm text-white/50">
              {item.actor_name ||
                item.actor_id?.slice(0, 8) ||
                'Unknown administrator'}
            </p>

            <h3 className="mt-1 text-xl font-black text-white">
              {formatLabel(item.action)}
            </h3>

            <p className="mt-2 text-sm text-white/60">
              {formatLabel(item.entity_type)}
              {item.entity_name ? ` · ${item.entity_name}` : ''}
            </p>
          </div>

          {entityHref ? (
            <Link
              href={entityHref}
              className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center text-sm font-semibold text-white hover:border-accent/40"
            >
              Open Record
            </Link>
          ) : null}
        </div>

        {item.reason ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Reason
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">
              {item.reason}
            </p>
          </div>
        ) : null}

        {item.note && !compact ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Administrative Note
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/65">
              {item.note}
            </p>
          </div>
        ) : null}

        {stateChanges.length && !compact ? (
          <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white/75">
              View {stateChanges.length} recorded change
              {stateChanges.length === 1 ? '' : 's'}
            </summary>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {stateChanges.map((change) => (
                <div
                  key={change.key}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                    {formatLabel(change.key)}
                  </p>

                  <div className="mt-2 grid gap-2 text-sm">
                    <StateLine
                      label="Before"
                      value={change.before}
                    />

                    <StateLine
                      label="After"
                      value={change.after}
                    />
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

function StateLine({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div>
      <span className="text-white/40">{label}: </span>
      <span className="break-words text-white/75">
        {displayValue(value)}
      </span>
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone:
    | 'green'
    | 'yellow'
    | 'red'
    | 'purple'
    | 'blue'
    | 'neutral';
}) {
  const styles = {
    green:
      'border-green-500/20 bg-green-500/10 text-green-200',
    yellow:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    red:
      'border-red-500/20 bg-red-500/10 text-red-200',
    purple:
      'border-purple-500/20 bg-purple-500/10 text-purple-200',
    blue:
      'border-blue-500/20 bg-blue-500/10 text-blue-200',
    neutral:
      'border-white/10 bg-white/5 text-white/55',
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {label}
    </span>
  );
}

function getEntityHref(item: AdminActivityItem) {
  if (item.entity_type === 'event' && item.entity_id) {
    return `/admin/events/${item.entity_id}`;
  }

  if (item.entity_type === 'venue' && item.entity_id) {
    return `/admin/venues/${item.entity_id}`;
  }

  if (item.entity_type === 'user' && item.entity_id) {
    return `/admin/users/${item.entity_id}`;
  }

  return null;
}

function getStateChanges(item: AdminActivityItem) {
  const previous = item.previous_state || {};
  const next = item.new_state || {};

  const keys = new Set([
    ...Object.keys(previous),
    ...Object.keys(next),
  ]);

  return [...keys]
    .map((key) => ({
      key,
      before: previous[key],
      after: next[key],
    }))
    .filter(
      (change) =>
        JSON.stringify(change.before) !==
        JSON.stringify(change.after)
    );
}

function categoryTone(category: string) {
  switch (category) {
    case 'event':
      return 'blue' as const;
    case 'payment':
    case 'finance':
      return 'green' as const;
    case 'security':
      return 'red' as const;
    case 'support':
      return 'yellow' as const;
    case 'ambassador':
    case 'marketing':
      return 'purple' as const;
    default:
      return 'neutral' as const;
  }
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatDateTime(value: string) {
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