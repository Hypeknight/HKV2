import type { SupabaseClient } from '@supabase/supabase-js';
import {
  derivePublicState,
  isEventStatus,
  requireEventTransition,
  type EventStatus,
  type EventTransitionActor,
} from '@/lib/events/workflow';

export type EventTransitionSource =
  | 'owner_action'
  | 'admin_action'
  | 'payment_webhook'
  | 'automation'
  | 'system'
  | 'migration';

export type TransitionEventRecord = {
  id: string;
  owner_id: string;
  status: EventStatus;
  is_approved: boolean | null;
  is_paid: boolean | null;
  is_public: boolean | null;
  payment_status: string | null;
  payment_override: boolean | null;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
};

export type TransitionEventInput = {
  supabase: SupabaseClient;
  eventId: string;
  actorId: string;
  actor: EventTransitionActor;
  toStatus: EventStatus;
  source: EventTransitionSource;
  reason?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  updates?: EventTransitionUpdates;
};

export type EventTransitionUpdates = {
  isApproved?: boolean;
  isPaid?: boolean;
  isPublic?: boolean;
  paymentOverride?: boolean;
  paymentStatus?: string | null;

  approvedAt?: string | null;
  approvedBy?: string | null;

  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;

  hiddenByAdmin?: boolean;

  removedAt?: string | null;
  removedBy?: string | null;
};

export async function transitionEventStatus({
  supabase,
  eventId,
  actorId,
  actor,
  toStatus,
  source,
  reason,
  note,
  metadata = {},
  updates = {},
}: TransitionEventInput): Promise<TransitionEventRecord> {
  if (!eventId) {
    throw new Error('Event id is required.');
  }

  if (!actorId) {
    throw new Error('Transition actor id is required.');
  }

  if (!isEventStatus(toStatus)) {
    throw new Error(`Unsupported event status: ${toStatus}`);
  }

  const event = await getTransitionEvent(
    supabase,
    eventId
  );

  requireEventTransition({
    fromStatus: event.status,
    toStatus,
    actor,
    reason,
  });

  validateTransitionRequirements({
    event,
    toStatus,
    updates,
  });

  const normalizedUpdates = createTransitionUpdates({
    event,
    toStatus,
    actorId,
    updates,
  });

  const { data, error } = await supabase.rpc(
    'transition_event_status',
    {
      p_event_id: eventId,
      p_to_status: toStatus,
      p_changed_by: actorId,
      p_changed_by_role: actor,
      p_reason: cleanNullable(reason),
      p_note: cleanNullable(note),
      p_source: source,
      p_metadata: metadata,
      p_event_updates: normalizedUpdates,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const transitionedEvent = normalizeRpcEvent(data);

  if (!transitionedEvent) {
    throw new Error(
      'The event transition completed without returning the updated event.'
    );
  }

  return transitionedEvent;
}

export async function getTransitionEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<TransitionEventRecord> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      owner_id,
      status,
      is_approved,
      is_paid,
      is_public,
      payment_status,
      payment_override,
      promotion_start_at,
      promotion_end_at
    `)
    .eq('id', eventId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Event not found.');
  }

  if (!isEventStatus(data.status)) {
    throw new Error(
      `The event has an unsupported status: ${data.status}`
    );
  }

  return {
    id: data.id,
    owner_id: data.owner_id,
    status: data.status,
    is_approved: data.is_approved,
    is_paid: data.is_paid,
    is_public: data.is_public,
    payment_status: data.payment_status,
    payment_override: data.payment_override,
    promotion_start_at: data.promotion_start_at,
    promotion_end_at: data.promotion_end_at,
  };
}

function validateTransitionRequirements({
  event,
  toStatus,
  updates,
}: {
  event: TransitionEventRecord;
  toStatus: EventStatus;
  updates: EventTransitionUpdates;
}) {
  const isApproved =
    updates.isApproved ?? event.is_approved === true;

  const isPaid =
  updates.isPaid ??
  (
    event.is_paid === true ||
    event.payment_status === 'paid'
  );

  const paymentOverride =
    updates.paymentOverride ??
    event.payment_override === true;

  if (
    ['scheduled', 'active', 'live'].includes(toStatus)
  ) {
    if (!isApproved) {
      throw new Error(
        'The event must be approved before it can become public.'
      );
    }

    if (!isPaid && !paymentOverride) {
      throw new Error(
        'Payment or a payment override is required before the event can become public.'
      );
    }
  }

  if (
    toStatus === 'active' ||
    toStatus === 'live'
  ) {
    if (
      !event.promotion_start_at ||
      !event.promotion_end_at
    ) {
      throw new Error(
        'The event needs a valid promotion window before activation.'
      );
    }
  }
}

function createTransitionUpdates({
  event,
  toStatus,
  actorId,
  updates,
}: {
  event: TransitionEventRecord;
  toStatus: EventStatus;
  actorId: string;
  updates: EventTransitionUpdates;
}) {
  const nowIso = new Date().toISOString();

  const isApproved =
    updates.isApproved ?? event.is_approved === true;

  const isPaid =
    updates.isPaid ??
    event.is_paid === true;

  const paymentOverride =
    updates.paymentOverride ??
    event.payment_override === true;

  const calculatedPublicState = derivePublicState({
    isApproved,
    isPaid:
      isPaid ||
      event.payment_status === 'paid',
    paymentOverride,
    promotionStartAt: event.promotion_start_at,
    promotionEndAt: event.promotion_end_at,
    status: toStatus,
  });

  const payload: Record<string, unknown> = {
    is_public:
      updates.isPublic ?? calculatedPublicState,
  };

  assignIfDefined(
    payload,
    'is_approved',
    updates.isApproved
  );

  assignIfDefined(
    payload,
    'is_paid',
    updates.isPaid
  );

  assignIfDefined(
    payload,
    'payment_override',
    updates.paymentOverride
  );

  assignIfDefined(
    payload,
    'payment_status',
    updates.paymentStatus
  );

  assignIfDefined(
    payload,
    'hidden_by_admin',
    updates.hiddenByAdmin
  );

  if (toStatus === 'rejected') {
    payload.is_approved = false;
    payload.is_public = false;
    payload.rejected_at =
      updates.rejectedAt ?? nowIso;
    payload.rejected_by =
      updates.rejectedBy ?? actorId;
    payload.rejection_reason =
      updates.rejectionReason ?? null;
    payload.approved_at = null;
    payload.approved_by = null;
  }

  if (
    toStatus === 'scheduled' &&
    isApproved
  ) {
    payload.approved_at =
      updates.approvedAt ?? nowIso;
    payload.approved_by =
      updates.approvedBy ?? actorId;

    payload.rejected_at = null;
    payload.rejected_by = null;
    payload.rejection_reason = null;
  }

  if (
    toStatus === 'cancelled' ||
    toStatus === 'removed' ||
    toStatus === 'ended' ||
    toStatus === 'archived'
  ) {
    payload.is_public = false;
  }

  if (toStatus === 'removed') {
    payload.hidden_by_admin = true;
    payload.removed_at =
      updates.removedAt ?? nowIso;
    payload.removed_by =
      updates.removedBy ?? actorId;
  }

  return payload;
}

function assignIfDefined(
  target: Record<string, unknown>,
  key: string,
  value: unknown
) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function normalizeRpcEvent(
  data: unknown
): TransitionEventRecord | null {
  const row = Array.isArray(data)
    ? data[0]
    : data;

  if (!row || typeof row !== 'object') {
    return null;
  }

  const record = row as Record<string, unknown>;

  if (
    !record.id ||
    !record.owner_id ||
    !isEventStatus(record.status)
  ) {
    return null;
  }

  return {
    id: String(record.id),
    owner_id: String(record.owner_id),
    status: record.status,
    is_approved:
      typeof record.is_approved === 'boolean'
        ? record.is_approved
        : null,
    is_paid:
      typeof record.is_paid === 'boolean'
        ? record.is_paid
        : null,
    is_public:
      typeof record.is_public === 'boolean'
        ? record.is_public
        : null,
    payment_status:
      record.payment_status === null ||
      record.payment_status === undefined
        ? null
        : String(record.payment_status),
    payment_override:
      typeof record.payment_override === 'boolean'
        ? record.payment_override
        : null,
    promotion_start_at:
      record.promotion_start_at === null ||
      record.promotion_start_at === undefined
        ? null
        : String(record.promotion_start_at),
    promotion_end_at:
      record.promotion_end_at === null ||
      record.promotion_end_at === undefined
        ? null
        : String(record.promotion_end_at),
  };
}

function cleanNullable(value?: string | null) {
  const cleaned = String(value || '').trim();

  return cleaned || null;
}