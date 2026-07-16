import type { ReactNode } from 'react';

export type EventTimelinePerspective = 'owner' | 'admin';

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

type Tone =
  | 'neutral'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'purple';

type TimelinePresentation = {
  title: string;
  description: string;
  icon: string;
  tone: Tone;
};

export default function EventLifecycleTimeline({
  history,
  perspective = 'admin',
  currentStatus,
  title = 'Event Lifecycle',
  eyebrow = 'Status History',
  emptyText = 'No lifecycle activity has been recorded yet.',
  className = '',
}: Props) {
  const orderedHistory = [...history].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  return (
    <section
      className={`rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-8 ${className}`}
    >
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        {eyebrow}
      </p>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
            {perspective === 'owner'
              ? 'Follow the event from creation through review, promotion, and completion.'
              : 'Review every recorded lifecycle transition, actor, reason, and source.'}
          </p>
        </div>

        {currentStatus ? <StatusPill status={currentStatus} /> : null}
      </div>

      {orderedHistory.length ? (
        <ol className="mt-8">
          {orderedHistory.map((item, index) => {
            const presentation = getTimelinePresentation(item, perspective);
            const isLast = index === orderedHistory.length - 1;

            return (
              <li
                key={item.id}
                className="relative grid grid-cols-[44px_1fr] gap-4"
              >
                {!isLast ? (
                  <div className="absolute bottom-0 left-[21px] top-11 w-px bg-white/10" />
                ) : null}

                <div
                  className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border text-lg ${toneClasses[presentation.tone]}`}
                  aria-hidden="true"
                >
                  {presentation.icon}
                </div>

                <div className={isLast ? 'pb-0' : 'pb-7'}>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white">
                          {presentation.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-white/55">
                          {presentation.description}
                        </p>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <p className="text-sm font-semibold text-white/70">
                          {formatDate(item.created_at)}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          {formatRelativeTime(item.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusPill status={item.to_status} />
                      <SmallChip>
                        {formatActor(item.changed_by_role, perspective)}
                      </SmallChip>
                      <SmallChip>{formatLabel(item.source)}</SmallChip>
                    </div>

                    {item.reason ? (
                      <TimelineNotice
                        label={perspective === 'owner' ? 'Message' : 'Reason'}
                      >
                        {sanitizeOwnerText(item.reason, perspective)}
                      </TimelineNotice>
                    ) : null}

                    {item.note && shouldShowNote(item, perspective) ? (
                      <TimelineNotice label="Note">
                        {sanitizeOwnerText(item.note, perspective)}
                      </TimelineNotice>
                    ) : null}

                    {perspective === 'admin' && item.from_status ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <StateBox
                          label="Previous Status"
                          value={formatLabel(item.from_status)}
                        />
                        <StateBox
                          label="New Status"
                          value={formatLabel(item.to_status)}
                        />
                      </div>
                    ) : null}

                    {perspective === 'admin' &&
                    item.metadata &&
                    Object.keys(item.metadata).length ? (
                      <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-white/60">
                          View transition metadata
                        </summary>
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/45">
                          {JSON.stringify(item.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6">
          <p className="font-semibold text-white">No lifecycle history</p>
          <p className="mt-2 text-sm leading-6 text-white/50">{emptyText}</p>
        </div>
      )}
    </section>
  );
}

function getTimelinePresentation(
  item: EventStatusHistoryItem,
  perspective: EventTimelinePerspective
): TimelinePresentation {
  const ownerPresentations: Record<string, TimelinePresentation> = {
    draft: {
      title: 'Event draft created',
      description: 'Your event was saved as a draft.',
      icon: '✎',
      tone: 'neutral',
    },
    building: {
      title: 'Event listing in progress',
      description: 'The event is still being completed.',
      icon: '🛠',
      tone: 'yellow',
    },
    submitted: {
      title: 'Submitted for review',
      description: 'HypeKnight received the event for moderation.',
      icon: '↑',
      tone: 'blue',
    },
    approved_unpaid: {
      title: 'Approved — payment required',
      description: 'The event passed review and is waiting for payment.',
      icon: '✓',
      tone: 'orange',
    },
    approved_awaiting_payment: {
      title: 'Approved — awaiting payment',
      description: 'Complete payment to continue toward public discovery.',
      icon: '💳',
      tone: 'orange',
    },
    paid_awaiting_approval: {
      title: 'Payment received',
      description: 'Payment is complete and review is still pending.',
      icon: '💳',
      tone: 'blue',
    },
    rejected: {
      title: 'Changes requested',
      description: 'The event was returned so required changes can be made.',
      icon: '!',
      tone: 'red',
    },
    revision_draft: {
      title: 'Revision opened',
      description: 'The event is available for corrections.',
      icon: '✎',
      tone: 'yellow',
    },
    revision_submitted: {
      title: 'Revision submitted',
      description: 'HypeKnight is reviewing the updated event.',
      icon: '↑',
      tone: 'purple',
    },
    scheduled: {
      title: 'Event scheduled',
      description: 'The event is approved and waiting for its active window.',
      icon: '📅',
      tone: 'purple',
    },
    active: {
      title: 'Promotion active',
      description: 'The event is currently available in HypeKnight discovery.',
      icon: '●',
      tone: 'green',
    },
    live: {
      title: 'Event live',
      description: 'The event is taking place now or has been marked live.',
      icon: '⚡',
      tone: 'green',
    },
    removal_requested: {
      title: 'Removal requested',
      description: 'HypeKnight received the event-removal request.',
      icon: '−',
      tone: 'red',
    },
    refund_requested: {
      title: 'Refund review requested',
      description: 'HypeKnight received the refund-review request.',
      icon: '$',
      tone: 'red',
    },
    cancelled: {
      title: 'Event cancelled',
      description: 'The event is no longer active or publicly available.',
      icon: '×',
      tone: 'red',
    },
    removed: {
      title: 'Event removed',
      description: 'The event was removed from HypeKnight.',
      icon: '−',
      tone: 'neutral',
    },
    ended: {
      title: 'Event ended',
      description: 'The event has reached the end of its lifecycle.',
      icon: '✓',
      tone: 'neutral',
    },
    completed: {
      title: 'Event completed',
      description: 'The event has been completed.',
      icon: '✓',
      tone: 'neutral',
    },
    archived: {
      title: 'Event archived',
      description: 'The event is retained in account history.',
      icon: '□',
      tone: 'neutral',
    },
  };

  if (perspective === 'owner') {
    return (
      ownerPresentations[item.to_status] || {
        title: formatLabel(item.to_status),
        description: 'The event lifecycle was updated.',
        icon: '•',
        tone: 'neutral',
      }
    );
  }

  return {
    title: `${formatLabel(item.from_status || 'created')} → ${formatLabel(
      item.to_status
    )}`,
    description:
      item.reason || `Event status changed to ${formatLabel(item.to_status)}.`,
    icon: getStatusIcon(item.to_status),
    tone: getStatusTone(item.to_status),
  };
}

function StatusPill({ status }: { status: string }) {
  const tone = getStatusTone(status);

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {formatLabel(status)}
    </span>
  );
}

function SmallChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/55">
      {children}
    </span>
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
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/65">
        {children}
      </p>
    </div>
  );
}

function StateBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white/65">{value}</p>
    </div>
  );
}

function shouldShowNote(
  item: EventStatusHistoryItem,
  perspective: EventTimelinePerspective
) {
  if (perspective === 'admin') return true;

  return !['internal', 'admin_internal', 'system_internal'].includes(
    item.source.toLowerCase()
  );
}

function sanitizeOwnerText(
  value: string,
  perspective: EventTimelinePerspective
) {
  if (perspective === 'admin') return value;

  return value
    .replace(/\badmin(?:istrative)?\b/gi, 'HypeKnight')
    .replace(/\bmoderator\b/gi, 'HypeKnight team');
}

function formatActor(
  role: string | null,
  perspective: EventTimelinePerspective
) {
  if (perspective === 'owner') {
    switch (role) {
      case 'owner':
        return 'You';
      case 'admin':
        return 'HypeKnight';
      case 'payment':
        return 'Payment';
      case 'automation':
      case 'system':
        return 'System';
      default:
        return 'HypeKnight';
    }
  }

  switch (role) {
    case 'owner':
      return 'Event Owner';
    case 'admin':
      return 'Administrator';
    case 'payment':
      return 'Payment';
    case 'automation':
      return 'Automation';
    case 'system':
      return 'System';
    default:
      return 'Unknown Actor';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'submitted':
    case 'revision_submitted':
      return '↑';
    case 'approved_unpaid':
    case 'approved_awaiting_payment':
      return '💳';
    case 'paid_awaiting_approval':
      return '$';
    case 'scheduled':
      return '📅';
    case 'active':
      return '●';
    case 'live':
      return '⚡';
    case 'rejected':
    case 'cancelled':
      return '!';
    case 'removal_requested':
    case 'refund_requested':
      return '?';
    case 'removed':
      return '−';
    case 'ended':
    case 'completed':
      return '✓';
    case 'archived':
      return '□';
    default:
      return '•';
  }
}

function getStatusTone(status: string): Tone {
  switch (status) {
    case 'submitted':
    case 'paid_awaiting_approval':
      return 'blue';
    case 'scheduled':
    case 'revision_submitted':
      return 'purple';
    case 'active':
    case 'live':
      return 'green';
    case 'building':
    case 'revision_draft':
      return 'yellow';
    case 'approved_unpaid':
    case 'approved_awaiting_payment':
      return 'orange';
    case 'rejected':
    case 'removal_requested':
    case 'refund_requested':
    case 'cancelled':
      return 'red';
    default:
      return 'neutral';
  }
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Unknown';

  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const toneClasses: Record<Tone, string> = {
  neutral: 'border-white/10 bg-white/5 text-white/60',
  blue: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
  green: 'border-green-500/20 bg-green-500/10 text-green-200',
  yellow: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
  orange: 'border-orange-500/20 bg-orange-500/10 text-orange-200',
  red: 'border-red-500/20 bg-red-500/10 text-red-200',
  purple: 'border-purple-500/20 bg-purple-500/10 text-purple-200',
};