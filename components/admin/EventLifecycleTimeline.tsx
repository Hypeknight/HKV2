import type { ReactNode } from 'react';

export type EventTimelinePerspective =
  | 'owner'
  | 'admin';

export type EventStatusHistoryItem = {
  id: string;
  event_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_by_role: string | null;
  reason: string | null;
  note: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Props = {
  history: EventStatusHistoryItem[];
  perspective?: EventTimelinePerspective;
  currentStatus?: string | null;
  title?: string;
  eyebrow?: string;
  emptyText?: string;
  className?: string;
};

export default function EventLifecycleTimeline({
  history,
  perspective = 'admin',
  currentStatus,
  title = 'Status timeline',
  eyebrow = 'Event Lifecycle',
  emptyText = 'Future event transitions will appear here with the actor, source, reason, and timestamp.',
  className = '',
}: Props) {
  const orderedHistory = [...history].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  if (!orderedHistory.length) {
    return (
      <section
        className={`rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8 ${className}`}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {eyebrow}
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">
              {title}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
              {emptyText}
            </p>
          </div>

          {currentStatus ? (
            <StatusBadge status={currentStatus} />
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            {eyebrow}
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            {title}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
            {perspective === 'owner'
              ? 'Follow your event from creation through review, promotion, and completion.'
              : 'A permanent operational record of event submissions, approvals, revisions, cancellations, removals, and automated changes.'}
          </p>
        </div>

        {currentStatus ? (
          <StatusBadge status={currentStatus} />
        ) : null}
      </div>

      <div className="mt-8 space-y-0">
        {orderedHistory.map((item, index) => (
          <TimelineItem
            key={item.id}
            item={item}
            perspective={perspective}
            isLast={index === orderedHistory.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function TimelineItem({
  item,
  perspective,
  isLast,
}: {
  item: EventStatusHistoryItem;
  perspective: EventTimelinePerspective;
  isLast: boolean;
}) {
  const presentation = getPresentation(
    item,
    perspective
  );

  const toStatus = formatStatus(item.to_status);
  const fromStatus = item.from_status
    ? formatStatus(item.from_status)
    : 'Created';

  return (
    <article className="grid grid-cols-[32px_1fr] gap-4">
      <div className="flex flex-col items-center">
        <span
          className={`mt-1 h-4 w-4 rounded-full border-2 ${statusDotClass(
            item.to_status
          )}`}
        />

        {!isLast ? (
          <span className="mt-2 min-h-16 w-px flex-1 bg-white/10" />
        ) : null}
      </div>

      <div className={`pb-7 ${isLast ? 'pb-0' : ''}`}>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.to_status} />

                {perspective === 'admin' ? (
                  <span className="text-sm text-white/35">
                    {fromStatus} → {toStatus}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-3 text-lg font-black text-white">
                {presentation.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/60">
                {presentation.description}
              </p>

              <p className="mt-3 text-sm text-white/45">
                {perspective === 'owner'
                  ? formatOwnerActor(item.changed_by_role)
                  : `Changed by ${formatActor(
                      item.changed_by_role
                    )}`}
                {' · '}
                {formatSource(item.source)}
              </p>
            </div>

            <time
              dateTime={item.created_at}
              className="text-xs text-white/40"
            >
              {formatDateTime(item.created_at)}
            </time>
          </div>

          {item.reason ? (
            <TimelineNotice
              label={
                perspective === 'owner'
                  ? 'Message'
                  : 'Reason'
              }
            >
              {sanitizeText(
                item.reason,
                perspective
              )}
            </TimelineNotice>
          ) : null}

          {item.note &&
          item.note !== item.reason &&
          shouldShowNote(
            item,
            perspective
          ) ? (
            <TimelineNotice label="Note">
              {sanitizeText(
                item.note,
                perspective
              )}
            </TimelineNotice>
          ) : null}

          {perspective === 'admin' &&
          hasUsefulMetadata(item.metadata) ? (
            <details className="mt-4 rounded-2xl border border-white/10 bg-black/20">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white/60 hover:text-white">
                View transition metadata
              </summary>

              <pre className="overflow-x-auto border-t border-white/10 p-4 text-xs leading-6 text-white/45">
                {JSON.stringify(
                  item.metadata,
                  null,
                  2
                )}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TimelineNotice({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-accent/15 bg-accent/10 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
        {children}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
        status
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function getPresentation(
  item: EventStatusHistoryItem,
  perspective: EventTimelinePerspective
) {
  if (perspective === 'admin') {
    return {
      title: `${formatStatus(
        item.from_status || 'created'
      )} → ${formatStatus(item.to_status)}`,
      description:
        item.reason ||
        `Event status changed to ${formatStatus(
          item.to_status
        )}.`,
    };
  }

  const ownerMap: Record<
    string,
    {
      title: string;
      description: string;
    }
  > = {
    draft: {
      title: 'Event draft created',
      description:
        'Your event was saved as a draft.',
    },

    building: {
      title: 'Event listing in progress',
      description:
        'The event is still being completed.',
    },

    submitted: {
      title: 'Submitted for review',
      description:
        'HypeKnight received your event for review.',
    },

    approved_unpaid: {
      title: 'Approved — payment required',
      description:
        'Your event passed review and is waiting for payment.',
    },

    approved_awaiting_payment: {
      title: 'Approved — awaiting payment',
      description:
        'Complete payment to continue toward public discovery.',
    },

    paid_awaiting_approval: {
      title: 'Payment received',
      description:
        'Payment is complete and review is still pending.',
    },

    rejected: {
      title: 'Changes requested',
      description:
        'Your event was returned so required changes can be made.',
    },

    revision_draft: {
      title: 'Revision opened',
      description:
        'The event is available for corrections.',
    },

    revision_submitted: {
      title: 'Revision submitted',
      description:
        'HypeKnight is reviewing the updated event.',
    },

    scheduled: {
      title: 'Event scheduled',
      description:
        'The event is approved and waiting for its promotion or event window.',
    },

    active: {
      title: 'Promotion active',
      description:
        'The event is currently available in HypeKnight discovery.',
    },

    live: {
      title: 'Event live',
      description:
        'The event is taking place now or has been marked live.',
    },

    removal_requested: {
      title: 'Removal requested',
      description:
        'HypeKnight received your event-removal request.',
    },

    refund_requested: {
      title: 'Refund review requested',
      description:
        'HypeKnight received your refund-review request.',
    },

    cancelled: {
      title: 'Event cancelled',
      description:
        'The event is no longer active or publicly available.',
    },

    removed: {
      title: 'Event removed',
      description:
        'The event was removed from HypeKnight.',
    },

    ended: {
      title: 'Event ended',
      description:
        'The event has reached the end of its lifecycle.',
    },

    completed: {
      title: 'Event completed',
      description:
        'The event has been completed.',
    },

    archived: {
      title: 'Event archived',
      description:
        'The event is retained in your account history.',
    },
  };

  return (
    ownerMap[item.to_status] || {
      title: formatStatus(item.to_status),
      description:
        'The event lifecycle was updated.',
    }
  );
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'scheduled':
    case 'active':
    case 'live':
      return 'border-green-500/20 bg-green-500/10 text-green-200';

    case 'submitted':
    case 'revision_submitted':
    case 'paid_awaiting_approval':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-200';

    case 'approved_unpaid':
    case 'approved_awaiting_payment':
    case 'revision_draft':
    case 'building':
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200';

    case 'rejected':
    case 'cancelled':
    case 'removed':
      return 'border-red-500/20 bg-red-500/10 text-red-200';

    case 'removal_requested':
    case 'refund_requested':
      return 'border-orange-500/20 bg-orange-500/10 text-orange-200';

    case 'ended':
    case 'completed':
    case 'archived':
      return 'border-purple-500/20 bg-purple-500/10 text-purple-200';

    default:
      return 'border-white/10 bg-white/5 text-white/70';
  }
}

function statusDotClass(status: string) {
  switch (status) {
    case 'scheduled':
    case 'active':
    case 'live':
      return 'border-green-300 bg-green-500';

    case 'submitted':
    case 'revision_submitted':
    case 'paid_awaiting_approval':
      return 'border-blue-300 bg-blue-500';

    case 'approved_unpaid':
    case 'approved_awaiting_payment':
    case 'revision_draft':
    case 'building':
      return 'border-yellow-300 bg-yellow-500';

    case 'rejected':
    case 'cancelled':
    case 'removed':
      return 'border-red-300 bg-red-500';

    case 'removal_requested':
    case 'refund_requested':
      return 'border-orange-300 bg-orange-500';

    case 'ended':
    case 'completed':
    case 'archived':
      return 'border-purple-300 bg-purple-500';

    default:
      return 'border-white/40 bg-white/20';
  }
}

function shouldShowNote(
  item: EventStatusHistoryItem,
  perspective: EventTimelinePerspective
) {
  if (perspective === 'admin') {
    return true;
  }

  const source = item.source.toLowerCase();

  return ![
    'internal',
    'admin_internal',
    'system_internal',
  ].includes(source);
}

function sanitizeText(
  value: string,
  perspective: EventTimelinePerspective
) {
  if (perspective === 'admin') {
    return value;
  }

  return value
    .replace(
      /\badmin(?:istrative)?\b/gi,
      'HypeKnight'
    )
    .replace(
      /\bmoderator\b/gi,
      'HypeKnight team'
    );
}

function formatStatus(status: string) {
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatActor(role: string | null) {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'owner':
      return 'Event Owner';
    case 'payment':
      return 'Payment System';
    case 'automation':
      return 'Automation';
    case 'system':
      return 'HypeKnight System';
    default:
      return 'Unknown Actor';
  }
}

function formatOwnerActor(role: string | null) {
  switch (role) {
    case 'owner':
      return 'Updated by you';
    case 'admin':
      return 'Updated by HypeKnight';
    case 'payment':
      return 'Updated by payment processing';
    case 'automation':
    case 'system':
      return 'Updated automatically';
    default:
      return 'Updated by HypeKnight';
  }
}

function formatSource(source: string) {
  return source
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function hasUsefulMetadata(
  metadata: Record<string, unknown> | null
) {
  return Boolean(
    metadata &&
      Object.keys(metadata).length > 0
  );
}