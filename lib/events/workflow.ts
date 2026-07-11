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

export const PUBLIC_EVENT_STATUSES = [
  'scheduled',
  'active',
  'live',
] as const satisfies readonly EventStatus[];

export type PublicEventStatus =
  (typeof PUBLIC_EVENT_STATUSES)[number];

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

  if (!input.promotionStartAt || !input.promotionEndAt) {
    return false;
  }

  const promotionStart = new Date(input.promotionStartAt);
  const promotionEnd = new Date(input.promotionEndAt);

  if (
    Number.isNaN(promotionStart.getTime()) ||
    Number.isNaN(promotionEnd.getTime())
  ) {
    return false;
  }

  if (promotionEnd.getTime() < promotionStart.getTime()) {
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

function validMoney(
  value: number | undefined,
  fallback: number
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(Number(value), 0);
}