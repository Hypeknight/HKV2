export type EventStatus =
  | 'draft'
  | 'building'
  | 'revision_draft'
  | 'submitted'
  | 'approved_unpaid'
  | 'approved_awaiting_payment'
  | 'paid_awaiting_approval'
  | 'revision_submitted'
  | 'scheduled'
  | 'active'
  | 'live'
  | 'rejected'
  | 'removal_requested'
  | 'refund_requested'
  | 'cancelled'
  | 'removed'
  | 'ended'
  | 'archived';

export type LinkdNMode = 'none' | 'lite' | 'full';

export type EventTransitionActor =
  | 'owner'
  | 'admin'
  | 'system'
  | 'payment'
  | 'automation';

export const EVENT_STATUSES: readonly EventStatus[] = [
  'draft',
  'building',
  'revision_draft',
  'submitted',
  'approved_unpaid',
  'approved_awaiting_payment',
  'paid_awaiting_approval',
  'revision_submitted',
  'scheduled',
  'active',
  'live',
  'rejected',
  'removal_requested',
  'refund_requested',
  'cancelled',
  'removed',
  'ended',
  'archived',
];

export const PUBLIC_EVENT_STATUSES = [
  'scheduled',
  'active',
  'live',
] as const satisfies readonly EventStatus[];

export type PublicEventStatus =
  (typeof PUBLIC_EVENT_STATUSES)[number];

type TransitionRule = {
  from: readonly EventStatus[];
  to: EventStatus;
  actors: readonly EventTransitionActor[];
  requiresReason?: boolean;
  description: string;
};

export const EVENT_TRANSITION_RULES: readonly TransitionRule[] = [
  {
    from: ['draft'],
    to: 'building',
    actors: ['owner', 'system'],
    description: 'The owner started completing the event.',
  },
  {
    from: ['building', 'rejected'],
    to: 'submitted',
    actors: ['owner'],
    description: 'The owner submitted the event for review.',
  },
  {
    from: ['submitted', 'approved_unpaid'],
    to: 'paid_awaiting_approval',
    actors: ['payment', 'admin', 'system'],
    description: 'Payment was completed or an administrative payment override was applied before final approval.',
  },
  {
    from: ['submitted', 'paid_awaiting_approval'],
    to: 'approved_unpaid',
    actors: ['admin'],
    description: 'The event was approved but still requires payment.',
  },
  {
    from: [
      'submitted',
      'paid_awaiting_approval',
    ],
    to: 'scheduled',
    actors: ['admin', 'payment', 'system'],
    description: 'The event is approved, financially eligible, and scheduled.',
  },
  {
    from: ['approved_unpaid', 'approved_awaiting_payment'],
    to: 'scheduled',
    actors: ['admin', 'payment', 'system'],
    description: 'Payment or an administrrative override cleared the event for scheduling.',
  },
  {
    from: ['submitted', 'paid_awaiting_approval'],
    to: 'rejected',
    actors: ['admin'],
    requiresReason: true,
    description: 'The event requires changes before approval.',
  },
  {
    from: ['rejected'],
    to: 'building',
    actors: ['owner'],
    description: 'The owner reopened the rejected event for editing.',
  },
  {
    from: ['scheduled'],
    to: 'active',
    actors: ['admin', 'system', 'automation'],
    description: 'The event entered its active promotion period.',
  },
  {
    from: ['scheduled', 'active'],
    to: 'live',
    actors: ['admin', 'system', 'automation'],
    description: 'The event is currently happening.',
  },
  {
    from: ['scheduled', 'active', 'live'],
    to: 'ended',
    actors: ['admin', 'system', 'automation'],
    description: 'The event has ended.',
  },
  {
    from: ['ended'],
    to: 'archived',
    actors: ['admin', 'system', 'automation'],
    description: 'The completed event was archived.',
  },
  {
    from: ['scheduled', 'active', 'live'],
    to: 'revision_draft',
    actors: ['owner'],
    description: 'The owner began revising an approved event.',
  },
  {
    from: ['revision_draft'],
    to: 'revision_submitted',
    actors: ['owner'],
    description: 'The owner submitted a revision for review.',
  },
  {
    from: ['revision_submitted'],
    to: 'scheduled',
    actors: ['admin'],
    description:
      'The submitted event revision was approved and returned to scheduled.',
  },
  {
    from: ['revision_submitted'],
    to: 'active',
    actors: ['admin'],
    description:
      'The submitted event revision was approved and returned to active.',
  },
  {
    from: ['revision_submitted'],
    to: 'live',
    actors: ['admin'],
    description:
      'The submitted event revision was approved and returned to live.',
  },
  {
    from: ['revision_submitted'],
    to: 'approved_unpaid',
    actors: ['admin'],
    description:
      'The submitted revision was approved but payment is still required.',
  },
  {
    from: ['revision_submitted'],
    to: 'approved_awaiting_payment',
    actors: ['admin'],
    description:
      'The submitted revision was approved and remains awaiting payment.',
  },
  {
    from: ['revision_submitted'],
    to: 'paid_awaiting_approval',
    actors: ['admin'],
    description:
      'The submitted revision was approved into the paid review state.',
  },
  {
    from: ['revision_submitted'],
    to: 'revision_draft',
    actors: ['admin'],
    requiresReason: true,
    description: 'The revision requires additional changes.',
  },
  {
    from: ['scheduled', 'active', 'live'],
    to: 'removal_requested',
    actors: ['owner'],
    requiresReason: true,
    description: 'The owner requested event removal.',
  },
  {
    from: [
      'draft',
      'building',
      'submitted',
      'approved_unpaid',
      'paid_awaiting_approval',
      'scheduled',
      'active',
      'live',
      'removal_requested',
    ],
    to: 'cancelled',
    actors: ['owner', 'admin'],
    requiresReason: true,
    description: 'The event was cancelled.',
  },
  {
    from: [
      'draft',
      'building',
      'submitted',
      'approved_unpaid',
      'approved_awaiting_payment',
      'paid_awaiting_approval',
      'revision_draft',
      'revision_submitted',
      'scheduled',
      'active',
      'live',
      'rejected',
      'removal_requested',
      'refund_requested',
      'cancelled',
      'ended',
      'archived'
    ],
    to: 'removed',
    actors: ['admin'],
    requiresReason: true,
    description: 'The event was removed from HypeKnight.',
  },

  {
  from: ['draft', 'building'],
  to: 'submitted',
  actors: ['admin'],
  requiresReason: true,
  description:
    'An administrator submitted an event into moderation.',
},
{
  from: ['approved_unpaid', 'approved_awaiting_payment'],
  to: 'paid_awaiting_approval',
  actors: ['admin', 'payment', 'system'],
  description:
    'Payment eligibility was recorded while approval remained pending.',
},
{
  from: ['rejected'],
  to: 'submitted',
  actors: ['admin'],
  requiresReason: true,
  description:
    'An administrator returned a rejected event to moderation.',
},
{
  from: ['cancelled', 'removed'],
  to: 'scheduled',
  actors: ['admin'],
  requiresReason: true,
  description:
    'An administrator restored an eligible event to scheduled status.',
},
{
  from: ['ended', 'archived'],
  to: 'scheduled',
  actors: ['admin'],
  requiresReason: true,
  description:
    'An administrator reopened an eligible event.',
},
{
  from: ['active', 'live'],
  to: 'scheduled',
  actors: ['admin'],
  requiresReason: true,
  description:
    'An administrator returned the event to scheduled status.',
},
{
  from: ['live'],
  to: 'active',
  actors: ['admin'],
  requiresReason: true,
  description:
    'An administrator returned a live event to active promotion.',
},
{
  from: [
    'draft',
    'building',
    'revision_draft',
    'submitted',
    'approved_unpaid',
    'approved_awaiting_payment',
    'paid_awaiting_approval',
    'revision_submitted',
    'scheduled',
    'active',
    'live',
    'rejected',
    'removal_requested',
    'refund_requested',
    'cancelled',
    'ended',
  ],
  to: 'archived',
  actors: ['admin'],
  requiresReason: true,
  description:
    'An administrator archived the event.',
},


] as const;

export function isEventStatus(
  value: unknown
): value is EventStatus {
  return EVENT_STATUSES.includes(
    value as EventStatus
  );
}

export function getTransitionRule(
  fromStatus: EventStatus,
  toStatus: EventStatus,
  actor: EventTransitionActor
) {
  return (
    EVENT_TRANSITION_RULES.find(
      (rule) =>
        rule.to === toStatus &&
        rule.from.includes(fromStatus) &&
        rule.actors.includes(actor)
    ) ?? null
  );
}

export function canTransitionEvent(input: {
  fromStatus: EventStatus;
  toStatus: EventStatus;
  actor: EventTransitionActor;
  reason?: string | null;
}) {
  const rule = getTransitionRule(
    input.fromStatus,
    input.toStatus,
    input.actor
  );

  if (!rule) {
    return {
      allowed: false,
      reason: `A ${input.actor} cannot move an event from ${formatStatus(
        input.fromStatus
      )} to ${formatStatus(input.toStatus)}.`,
      rule: null,
    };
  }

  if (
    rule.requiresReason &&
    !String(input.reason || '').trim()
  ) {
    return {
      allowed: false,
      reason: `A reason is required to move this event to ${formatStatus(
        input.toStatus
      )}.`,
      rule,
    };
  }

  return {
    allowed: true,
    reason: null,
    rule,
  };
}

export function requireEventTransition(input: {
  fromStatus: EventStatus;
  toStatus: EventStatus;
  actor: EventTransitionActor;
  reason?: string | null;
}) {
  const result = canTransitionEvent(input);

  if (!result.allowed) {
    throw new Error(
      result.reason || 'Invalid event status transition.'
    );
  }

  return result.rule;
}

export function calculatePromotionStart(
  eventStartAt: string | Date,
  totalPromoDays: number
) {
  const start = new Date(eventStartAt);

  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid event start date.');
  }

  const safePromoDays = Number.isFinite(totalPromoDays)
    ? Math.max(Math.round(totalPromoDays), 0)
    : 0;

  start.setDate(start.getDate() - safePromoDays);

  return start;
}

export function calculatePromotionEnd(
  eventEndAt?: string | Date | null,
  eventStartAt?: string | Date | null
) {
  const source = eventEndAt || eventStartAt;

  if (!source) {
    throw new Error(
      'An event start or end date is required to calculate promotion end.'
    );
  }

  const end = new Date(source);

  if (Number.isNaN(end.getTime())) {
    throw new Error('Invalid promotion end date.');
  }

  return end;
}

export function calculateTotalPrice(input: {
  basePrice?: number;
  extraPromoPrice?: number;
  linkdnPrice?: number;
}) {
  const base = validMoney(input.basePrice, 19.99);
  const extra = validMoney(input.extraPromoPrice, 0);
  const linkdn = validMoney(input.linkdnPrice, 0);

  return Number((base + extra + linkdn).toFixed(2));
}

export function derivePublicState(input: {
  isApproved: boolean;
  isPaid: boolean;
  paymentOverride: boolean;
  promotionStartAt?: string | Date | null;
  promotionEndAt?: string | Date | null;
  status: EventStatus;
}) {
  if (!isPublicEventStatus(input.status)) {
    return false;
  }

  if (!input.isApproved) {
    return false;
  }

  if (!input.isPaid && !input.paymentOverride) {
    return false;
  }

  if (
    !input.promotionStartAt ||
    !input.promotionEndAt
  ) {
    return false;
  }

  const promotionStart = new Date(
    input.promotionStartAt
  );

  const promotionEnd = new Date(
    input.promotionEndAt
  );

  if (
    Number.isNaN(promotionStart.getTime()) ||
    Number.isNaN(promotionEnd.getTime())
  ) {
    return false;
  }

  if (
    promotionEnd.getTime() <
    promotionStart.getTime()
  ) {
    return false;
  }

  const now = Date.now();

  return (
    now >= promotionStart.getTime() &&
    now <= promotionEnd.getTime()
  );
}

export function isPublicEventStatus(
  status: EventStatus
): status is PublicEventStatus {
  return PUBLIC_EVENT_STATUSES.includes(
    status as PublicEventStatus
  );
}

export function formatStatus(status: EventStatus) {
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function validMoney(
  value: number | undefined,
  fallback: number
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(Number(value), 0);
}