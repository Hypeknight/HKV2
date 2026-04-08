export type EventStatus =
  | 'draft'
  | 'building'
  | 'submitted'
  | 'rejected'
  | 'approved_unpaid'
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'removal_requested'
  | 'removed'
  | 'archived';

export type LinkdNMode = 'none' | 'lite' | 'full';

export function calculatePromotionStart(
  eventStartAt: string | Date,
  totalPromoDays: number
) {
  const start = new Date(eventStartAt);
  start.setDate(start.getDate() - totalPromoDays);
  return start;
}

export function calculatePromotionEnd(eventEndAt?: string | Date, eventStartAt?: string | Date) {
  return new Date(eventEndAt || eventStartAt!);
}

export function calculateTotalPrice(input: {
  basePrice?: number;
  extraPromoPrice?: number;
  linkdnPrice?: number;
}) {
  const base = input.basePrice ?? 19.99;
  const extra = input.extraPromoPrice ?? 0;
  const linkdn = input.linkdnPrice ?? 0;
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
  const now = new Date();

  const inPromotionWindow =
    !!input.promotionStartAt &&
    !!input.promotionEndAt &&
    now >= new Date(input.promotionStartAt) &&
    now <= new Date(input.promotionEndAt);

  const blockedStatuses: EventStatus[] = [
    'draft',
    'building',
    'submitted',
    'rejected',
    'removal_requested',
    'removed',
    'ended',
    'archived',
  ];

  return (
    input.isApproved &&
    (input.isPaid || input.paymentOverride) &&
    inPromotionWindow &&
    !blockedStatuses.includes(input.status)
  );
}