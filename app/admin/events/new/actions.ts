/*
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { derivePublicState } from '@/lib/events/workflow';

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  return { supabase, user };
}

export async function reviewEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = String(formData.get('event_id') || '');
  const action = String(formData.get('action') || '');
  const reason = String(formData.get('reason') || '');

  if (!eventId) throw new Error('Missing event id');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select(`
      id,
      status,
      is_paid,
      payment_override,
      promotion_start_at,
      promotion_end_at
    `)
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found');
  }

  if (action === 'approve') {
    const nextStatus =
      event.is_paid || event.payment_override ? 'scheduled' : 'submitted';

    const isPublic = derivePublicState({
      isApproved: true,
      isPaid: event.is_paid,
      paymentOverride: event.payment_override,
      promotionStartAt: event.promotion_start_at,
      promotionEndAt: event.promotion_end_at,
      status: nextStatus,
    });

    const { error } = await supabase
      .from('events')
      .update({
        status: nextStatus,
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        is_public: isPublic,
        rejection_reason: null,
        rejected_at: null,
        rejected_by: null,
      })
      .eq('id', eventId);

    if (error) throw new Error(error.message);

    redirect('/admin/events?approved=1');
  }

  if (action === 'reject') {
    const { error } = await supabase
      .from('events')
      .update({
        status: 'rejected',
        is_approved: false,
        is_public: false,
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: reason || null,
        approved_at: null,
        approved_by: null,
        locked_at: null,
      })
      .eq('id', eventId);

    if (error) throw new Error(error.message);

    redirect('/admin/events?rejected=1');
  }

  redirect('/admin/events?reviewed=1');
}

export async function approveEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const eventId = String(formData.get('event_id') || '');

  if (!eventId) throw new Error('Missing event id');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select(`
      id,
      status,
      is_paid,
      payment_override,
      promotion_start_at,
      promotion_end_at
    `)
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found');
  }

  const nextStatus =
    event.is_paid || event.payment_override ? 'scheduled' : 'submitted';

  const isPublic = derivePublicState({
    isApproved: true,
    isPaid: event.is_paid,
    paymentOverride: event.payment_override,
    promotionStartAt: event.promotion_start_at,
    promotionEndAt: event.promotion_end_at,
    status: nextStatus,
  });

  const { error } = await supabase
    .from('events')
    .update({
      status: nextStatus,
      is_approved: true,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      is_public: isPublic,
      rejection_reason: null,
      rejected_at: null,
      rejected_by: null,
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/events?approved=1');
}

export async function rejectEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = String(formData.get('event_id') || '');
  const rejectionReason = String(formData.get('rejection_reason') || '');

  if (!eventId) throw new Error('Missing event id');

  const { error } = await supabase
    .from('events')
    .update({
      status: 'rejected',
      is_approved: false,
      is_public: false,
      rejected_at: new Date().toISOString(),
      rejected_by: user.id,
      rejection_reason: rejectionReason || null,
      approved_at: null,
      approved_by: null,
      locked_at: null,
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/events?rejected=1');
}

export async function applyPaymentOverride(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = String(formData.get('event_id') || '');
  const reason = String(formData.get('reason') || '');

  if (!eventId) throw new Error('Missing event id');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('is_approved, promotion_start_at, promotion_end_at')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found');
  }

  const nextStatus = event.is_approved ? 'scheduled' : 'approved_unpaid';

  const isPublic = derivePublicState({
    isApproved: !!event.is_approved,
    isPaid: false,
    paymentOverride: true,
    promotionStartAt: event.promotion_start_at,
    promotionEndAt: event.promotion_end_at,
    status: nextStatus,
  });

  const { error } = await supabase
    .from('events')
    .update({
      payment_override: true,
      payment_override_by: user.id,
      payment_override_reason: reason,
      status: nextStatus,
      is_public: isPublic,
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/events?override=1');
}

export async function approveEventRevision(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createAdminClient();

  const eventId = String(formData.get('event_id') || '');
  const adminNote = String(formData.get('admin_note') || '').trim();

  if (!eventId) throw new Error('Missing event id.');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select(`
      id,
      status,
      original_status_before_revision,
      promotion_start_at,
      promotion_end_at,
      is_paid,
      payment_override
    `)
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found.');
  }

  if (event.status !== 'revision_submitted') {
    throw new Error('This event is not waiting for revision approval.');
  }

  const restoredStatus =
    event.original_status_before_revision &&
    ['scheduled', 'active', 'paid_awaiting_approval'].includes(
      event.original_status_before_revision
    )
      ? event.original_status_before_revision
      : 'scheduled';

  const isPublic = derivePublicState({
    isApproved: true,
    isPaid: event.is_paid,
    paymentOverride: event.payment_override,
    promotionStartAt: event.promotion_start_at,
    promotionEndAt: event.promotion_end_at,
    status: restoredStatus,
  });

  const { error } = await supabase
    .from('events')
    .update({
      status: restoredStatus,
      is_public: isPublic,
      is_approved: true,
      revision_admin_note: adminNote || null,
      revision_reviewed_at: new Date().toISOString(),
      revision_reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/events?revision=approved');
}

export async function rejectEventRevision(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createAdminClient();

  const eventId = String(formData.get('event_id') || '');
  const adminNote = String(formData.get('admin_note') || '').trim();

  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .update({
      status: 'revision_draft',
      is_public: false,
      is_approved: false,
      revision_admin_note: adminNote || 'Revision rejected for changes.',
      revision_reviewed_at: new Date().toISOString(),
      revision_reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('status', 'revision_submitted');

  if (error) throw new Error(error.message);

  redirect('/admin/events?revision=rejected');
}

export async function updateAdminEventDetails(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = String(formData.get('event_id') || '');
  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .update({
      name: String(formData.get('name') || '').trim() || null,
      slug: String(formData.get('slug') || '').trim() || null,
      venue_name: String(formData.get('venue_name') || '').trim() || null,
      address: String(formData.get('address') || '').trim() || null,
      city: String(formData.get('city') || '').trim() || null,
      state: String(formData.get('state') || '').trim() || null,
      event_start_at: String(formData.get('event_start_at') || '') || null,
      event_end_at: String(formData.get('event_end_at') || '') || null,
      flyer_url: String(formData.get('flyer_url') || '').trim() || null,
      event_type: String(formData.get('event_type') || '').trim() || null,
      dress_code: String(formData.get('dress_code') || '').trim() || null,
      entry_price: String(formData.get('entry_price') || '').trim() || null,
      age_requirement: String(formData.get('age_requirement') || '').trim() || null,
      smoking_policy: String(formData.get('smoking_policy') || '').trim() || null,
      description: String(formData.get('description') || '').trim() || null,
      special_notes: String(formData.get('special_notes') || '').trim() || null,
      parking_notes: String(formData.get('parking_notes') || '').trim() || null,
      admin_last_updated_at: new Date().toISOString(),
      admin_last_updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect(`/admin/events/${eventId}?details=updated`);
}

export async function updateAdminEventFinancials(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = String(formData.get('event_id') || '');
  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .update({
      base_price: numberOrNull(formData.get('base_price')),
      included_promo_days: numberOrNull(formData.get('included_promo_days')),
      extra_promo_days: numberOrNull(formData.get('extra_promo_days')),
      extra_promo_price: numberOrNull(formData.get('extra_promo_price')),
      linkdn_mode: String(formData.get('linkdn_mode') || '').trim() || null,
      linkdn_price: numberOrNull(formData.get('linkdn_price')),
      coupon_code: String(formData.get('coupon_code') || '').trim() || null,
      discount_amount: numberOrNull(formData.get('discount_amount')),
      total_price: numberOrNull(formData.get('total_price')),
      payment_amount: numberOrNull(formData.get('payment_amount')),
      promotion_start_at: String(formData.get('promotion_start_at') || '') || null,
      promotion_end_at: String(formData.get('promotion_end_at') || '') || null,
      package_upgrade_note:
        String(formData.get('package_upgrade_note') || '').trim() || null,
      admin_last_updated_at: new Date().toISOString(),
      admin_last_updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect(`/admin/events/${eventId}?financials=updated`);
}

export async function updateAdminEventNotes(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = String(formData.get('event_id') || '');
  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .update({
      admin_notes: String(formData.get('admin_notes') || '').trim() || null,
      admin_refund_note:
        String(formData.get('admin_refund_note') || '').trim() || null,
      admin_last_updated_at: new Date().toISOString(),
      admin_last_updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect(`/admin/events/${eventId}?notes=updated`);
}

export async function updateAdminEventStatus(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = String(formData.get('event_id') || '');
  const status = String(formData.get('status') || '').trim();
  const reason = String(formData.get('reason') || '').trim();

  if (!eventId) throw new Error('Missing event id.');
  if (!status) throw new Error('Missing status.');

  const isPublic = ['scheduled', 'active'].includes(status);

  const { error } = await supabase
    .from('events')
    .update({
      status,
      is_public: isPublic,
      rejection_reason: status === 'rejected' ? reason || null : undefined,
      removed_at: status === 'removed' ? new Date().toISOString() : undefined,
      removed_by: status === 'removed' ? user.id : undefined,
      admin_notes: reason || null,
      admin_last_updated_at: new Date().toISOString(),
      admin_last_updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect(`/admin/events/${eventId}?status=updated`);
}

export async function updateAdminEventVisibility(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = String(formData.get('event_id') || '');
  const action = String(formData.get('action') || '');

  if (!eventId) throw new Error('Missing event id.');

  const nowIso = new Date().toISOString();

  let payload: Record<string, any> = {
    admin_last_updated_at: nowIso,
    admin_last_updated_by: user.id,
    updated_at: nowIso,
  };

  if (action === 'hide') {
    payload = {
      ...payload,
      is_public: false,
      hidden_by_admin: true,
    };
  } else if (action === 'unhide') {
    payload = {
      ...payload,
      is_public: true,
      hidden_by_admin: false,
      removed_at: null,
      removed_by: null,
    };
  } else if (action === 'feature') {
    payload = {
      ...payload,
      admin_featured: true,
    };
  } else if (action === 'unfeature') {
    payload = {
      ...payload,
      admin_featured: false,
    };
  } else if (action === 'reactivate') {
    payload = {
      ...payload,
      status: 'scheduled',
      is_public: true,
      hidden_by_admin: false,
      removed_at: null,
      removed_by: null,
      is_approved: true,
    };
  } else if (action === 'cancel') {
    payload = {
      ...payload,
      status: 'cancelled',
      is_public: false,
      hidden_by_admin: true,
    };
  } else if (action === 'remove') {
    payload = {
      ...payload,
      status: 'removed',
      is_public: false,
      hidden_by_admin: true,
      removed_at: nowIso,
      removed_by: user.id,
    };
  } else {
    throw new Error('Invalid visibility action.');
  }

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect(`/admin/events/${eventId}?visibility=updated`);
}

function numberOrNull(value: FormDataEntryValue | null) {
  if (value === null || value === '') return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}
  */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  derivePublicState,
  isPublicEventStatus,
  type EventStatus,
} from '@/lib/events/workflow';
import { transitionEventStatus } from '@/lib/events/transition';

const VALID_EVENT_STATUSES: readonly EventStatus[] = [
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

type EventWorkflowRecord = {
  id: string;
  status: EventStatus;
  is_approved: boolean | null;
  is_paid: boolean | null;
  payment_status: string | null;
  payment_override: boolean;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
  original_status_before_revision?: string | null;
  hidden_by_admin?: boolean | null;
  removed_at?: string | null;
};

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } = await supabase
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

  return { supabase, user };
}

async function getEventWorkflowRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string
) {
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      status,
      is_approved,
      is_paid,
      payment_status,
      payment_override,
      promotion_start_at,
      promotion_end_at,
      original_status_before_revision,
      hidden_by_admin,
      removed_at
    `)
    .eq('id', eventId)
    .single();

  if (error || !event) {
    throw new Error(error?.message || 'Event not found.');
  }

  if (
    !VALID_EVENT_STATUSES.includes(
      event.status as EventStatus
    )
  ) {
    throw new Error(
      `Unsupported event status: ${event.status}`
    );
  }

  return {
    ...event,
    status: event.status as EventStatus,
  } as EventWorkflowRecord;
}

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function nullableText(formData: FormData, key: string) {
  return textValue(formData, key) || null;
}

function nullableDateTime(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

function numberOrNull(value: FormDataEntryValue | null) {
  if (value === null || value === '') return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function eventIsPaid(event: EventWorkflowRecord) {
  return (
    event.is_paid === true ||
    event.payment_status === 'paid' ||
    event.payment_override === true
  );
}

function calculatePublicState(
  event: EventWorkflowRecord,
  overrides?: {
    status?: EventStatus;
    isApproved?: boolean;
    isPaid?: boolean;
    paymentOverride?: boolean;
    promotionStartAt?: string | null;
    promotionEndAt?: string | null;
    hiddenByAdmin?: boolean;
  }
) {
  const status = overrides?.status ?? event.status;

  const hiddenByAdmin =
    overrides?.hiddenByAdmin ??
    Boolean(event.hidden_by_admin);

  if (
    hiddenByAdmin ||
    !isPublicEventStatus(status)
  ) {
    return false;
  }

  return derivePublicState({
    isApproved:
      overrides?.isApproved ??
      Boolean(event.is_approved),

    isPaid:
      overrides?.isPaid ??
      (event.is_paid === true ||
        event.payment_status === 'paid'),

    paymentOverride:
      overrides?.paymentOverride ??
      Boolean(event.payment_override),

    promotionStartAt:
      overrides?.promotionStartAt ??
      event.promotion_start_at,

    promotionEndAt:
      overrides?.promotionEndAt ??
      event.promotion_end_at,

    status,
  });
}

function refreshEventPaths(eventId: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath('/events');
  revalidatePath('/dashboard/events');
  revalidatePath(`/dashboard/events/${eventId}/review`);
}

export async function reviewEvent(
  formData: FormData
) {
  const action = textValue(formData, 'action');

  if (action === 'approve') {
    return approveEvent(formData);
  }

  if (action === 'reject') {
    const replacement = new FormData();

    replacement.set(
      'event_id',
      textValue(formData, 'event_id')
    );

    replacement.set(
      'rejection_reason',
      textValue(formData, 'rejection_reason') ||
        textValue(formData, 'reason')
    );

    const adminNote = textValue(
      formData,
      'admin_note'
    );

    if (adminNote) {
      replacement.set('admin_note', adminNote);
    }

    return rejectEvent(replacement);
  }

  throw new Error('Invalid event review action.');
}

export async function approveEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  const event = await getEventWorkflowRecord(
    supabase,
    eventId
  );

  const paid = eventIsPaid(event);

  const nextStatus: EventStatus = paid
    ? 'scheduled'
    : 'approved_unpaid';

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'admin',
    toStatus: nextStatus,
    source: 'admin_action',
    reason: paid
      ? 'Event approved and cleared for scheduling.'
      : 'Event approved and awaiting payment.',
    note: textValue(formData, 'admin_note') || null,
    metadata: {
      action: 'approve_event',
      payment_status: event.payment_status,
      payment_override: event.payment_override === true,
    },
    updates: {
      isApproved: true,
      approvedAt: new Date().toISOString(),
      approvedBy: user.id,

      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
    },
  });

  refreshEventPaths(eventId);

  redirect(
    `/admin/events/${eventId}?approved=1`
  );
}

export async function rejectEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');

  const rejectionReason = textValue(
    formData,
    'rejection_reason'
  );

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  if (!rejectionReason) {
    throw new Error(
      'A rejection or required-change reason is required.'
    );
  }

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'admin',
    toStatus: 'rejected',
    source: 'admin_action',
    reason: rejectionReason,
    note: textValue(formData, 'admin_note') || null,
    metadata: {
      action: 'reject_event',
    },
    updates: {
      isApproved: false,
      isPublic: false,
      rejectedAt: new Date().toISOString(),
      rejectedBy: user.id,
      rejectionReason,
      approvedAt: null,
      approvedBy: null,
    },
  });

  refreshEventPaths(eventId);

  redirect(
    `/admin/events/${eventId}?rejected=1`
  );
}

export async function applyPaymentOverride(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');
  const reason = textValue(formData, 'reason');
  const adminNote = textValue(formData, 'admin_note');

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  if (!reason) {
    throw new Error(
      'A payment override reason is required.'
    );
  }

  const event = await getEventWorkflowRecord(
    supabase,
    eventId
  );

  const previouslyOverridden =
    event.payment_override === true;

  if (previouslyOverridden) {
    throw new Error(
      'This event already has a payment override.'
    );
  }

  const nextStatus: EventStatus =
    event.is_approved === true
      ? 'scheduled'
      : 'paid_awaiting_approval';

  const nowIso = new Date().toISOString();

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'admin',
    toStatus: nextStatus,
    source: 'admin_action',
    reason,
    note:
      adminNote ||
      'Administrative payment override applied.',
    metadata: {
      action: 'apply_payment_override',
      previous_payment_status:
        event.payment_status || null,
      previous_payment_override:
        previouslyOverridden,
      approved_before_override:
        event.is_approved === true,
    },
    updates: {
      paymentOverride: true,
      isPaid: false,

      /*
       * Use "overridden" only when your payment_status
       * database constraint accepts it.
       */
      paymentStatus: 'overridden',

      isApproved:
        event.is_approved === true,

      approvedAt:
        event.is_approved === true
          ? nowIso
          : undefined,

      approvedBy:
        event.is_approved === true
          ? user.id
          : undefined,

      hiddenByAdmin: false,
    },
  });

  /*
   * The transition service already sets payment_override.
   * This update records the additional override audit fields.
   */
  const { error: overrideUpdateError } =
    await supabase
      .from('events')
      .update({
        payment_override_by: user.id,
        payment_override_reason: reason,
        payment_override_at: nowIso,

        admin_last_updated_at: nowIso,
        admin_last_updated_by: user.id,
        updated_at: nowIso,
      })
      .eq('id', eventId);

  if (overrideUpdateError) {
    throw new Error(overrideUpdateError.message);
  }

  refreshEventPaths(eventId);

  redirect(
    `/admin/events/${eventId}?override=1`
  );
}

export async function approveEventRevision(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');
  const adminNote = textValue(formData, 'admin_note');

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  const event = await getEventWorkflowRecord(
    supabase,
    eventId
  );

  if (event.status !== 'revision_submitted') {
    throw new Error(
      'This event is not waiting for revision approval.'
    );
  }

  const originalStatus =
    event.original_status_before_revision;

  let restoredStatus: EventStatus;

  if (
    originalStatus &&
    [
      'scheduled',
      'active',
      'live',
      'approved_unpaid',
      'approved_awaiting_payment',
      'paid_awaiting_approval',
    ].includes(originalStatus)
  ) {
    restoredStatus = originalStatus as EventStatus;
  } else {
    restoredStatus = eventIsPaid(event)
      ? 'scheduled'
      : 'approved_unpaid';
  }

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'admin',
    toStatus: restoredStatus,
    source: 'admin_action',
    reason: 'Event revision approved.',
    note: adminNote || null,
    metadata: {
      action: 'approve_event_revision',
      original_status_before_revision:
        originalStatus || null,
      restored_status: restoredStatus,
    },
    updates: {
      isApproved: true,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
    },
  });

  const nowIso = new Date().toISOString();

  const { error: revisionUpdateError } = await supabase
    .from('events')
    .update({
      revision_admin_note: adminNote || null,
      revision_reviewed_at: nowIso,
      revision_reviewed_by: user.id,
      original_status_before_revision: null,

      admin_last_updated_at: nowIso,
      admin_last_updated_by: user.id,
      updated_at: nowIso,
    })
    .eq('id', eventId);

  if (revisionUpdateError) {
    throw new Error(revisionUpdateError.message);
  }

  refreshEventPaths(eventId);

  redirect(
    `/admin/events/${eventId}?revision=approved`
  );
}

export async function rejectEventRevision(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');
  const adminNote = textValue(formData, 'admin_note');

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  if (!adminNote) {
    throw new Error(
      'Explain what still needs to change before rejecting the revision.'
    );
  }

  const event = await getEventWorkflowRecord(
    supabase,
    eventId
  );

  if (event.status !== 'revision_submitted') {
    throw new Error(
      'This event is not waiting for revision review.'
    );
  }

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'admin',
    toStatus: 'revision_draft',
    source: 'admin_action',
    reason: adminNote,
    note: adminNote,
    metadata: {
      action: 'reject_event_revision',
      original_status_before_revision:
        event.original_status_before_revision || null,
    },
    updates: {
      isApproved: false,
      isPublic: false,
    },
  });

  const nowIso = new Date().toISOString();

  const { error: revisionUpdateError } = await supabase
    .from('events')
    .update({
      revision_admin_note: adminNote,
      revision_reviewed_at: nowIso,
      revision_reviewed_by: user.id,

      admin_last_updated_at: nowIso,
      admin_last_updated_by: user.id,
      updated_at: nowIso,
    })
    .eq('id', eventId);

  if (revisionUpdateError) {
    throw new Error(revisionUpdateError.message);
  }

  refreshEventPaths(eventId);

  redirect(
    `/admin/events/${eventId}?revision=rejected`
  );
}

export async function updateAdminEventDetails(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');

  if (!eventId) throw new Error('Missing event id.');

  const name = textValue(formData, 'name');

  if (!name) {
    throw new Error('Event name is required.');
  }

  const state = textValue(
    formData,
    'state'
  ).toUpperCase();

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('events')
    .update({
      name,
      slug: nullableText(formData, 'slug'),
      venue_name: nullableText(
        formData,
        'venue_name'
      ),
      address: nullableText(formData, 'address'),
      city: nullableText(formData, 'city'),
      state: state || null,

      event_start_at: nullableDateTime(
        formData,
        'event_start_at'
      ),

      event_end_at: nullableDateTime(
        formData,
        'event_end_at'
      ),

      flyer_url: nullableText(
        formData,
        'flyer_url'
      ),

      event_type: nullableText(
        formData,
        'event_type'
      ),

      dress_code: nullableText(
        formData,
        'dress_code'
      ),

      entry_price: nullableText(
        formData,
        'entry_price'
      ),

      age_requirement: nullableText(
        formData,
        'age_requirement'
      ),

      smoking_policy: nullableText(
        formData,
        'smoking_policy'
      ),

      description: nullableText(
        formData,
        'description'
      ),

      special_notes: nullableText(
        formData,
        'special_notes'
      ),

      parking_notes: nullableText(
        formData,
        'parking_notes'
      ),

      admin_last_updated_at: nowIso,
      admin_last_updated_by: user.id,
      updated_at: nowIso,
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  refreshEventPaths(eventId);
  redirect(`/admin/events/${eventId}?details=updated`);
}

export async function updateAdminEventFinancials(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');

  if (!eventId) throw new Error('Missing event id.');

  const event = await getEventWorkflowRecord(
    supabase,
    eventId
  );

  const promotionStartAt = nullableDateTime(
    formData,
    'promotion_start_at'
  );

  const promotionEndAt = nullableDateTime(
    formData,
    'promotion_end_at'
  );

  if (
    promotionStartAt &&
    promotionEndAt &&
    new Date(promotionEndAt).getTime() <=
      new Date(promotionStartAt).getTime()
  ) {
    throw new Error(
      'Promotion end must be after promotion start.'
    );
  }

  const nowIso = new Date().toISOString();

  const isPublic = calculatePublicState(event, {
    promotionStartAt,
    promotionEndAt,
  });

  const { error } = await supabase
    .from('events')
    .update({
      base_price: numberOrNull(
        formData.get('base_price')
      ),

      included_promo_days: numberOrNull(
        formData.get('included_promo_days')
      ),

      extra_promo_days: numberOrNull(
        formData.get('extra_promo_days')
      ),

      extra_promo_price: numberOrNull(
        formData.get('extra_promo_price')
      ),

      linkdn_mode: nullableText(
        formData,
        'linkdn_mode'
      ),

      linkdn_price: numberOrNull(
        formData.get('linkdn_price')
      ),

      coupon_code: nullableText(
        formData,
        'coupon_code'
      ),

      discount_amount: numberOrNull(
        formData.get('discount_amount')
      ),

      total_price: numberOrNull(
        formData.get('total_price')
      ),

      payment_amount: numberOrNull(
        formData.get('payment_amount')
      ),

      promotion_start_at: promotionStartAt,
      promotion_end_at: promotionEndAt,
      is_public: isPublic,

      package_upgrade_note: nullableText(
        formData,
        'package_upgrade_note'
      ),

      admin_last_updated_at: nowIso,
      admin_last_updated_by: user.id,
      updated_at: nowIso,
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  refreshEventPaths(eventId);
  redirect(`/admin/events/${eventId}?financials=updated`);
}

export async function updateAdminEventNotes(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');

  if (!eventId) throw new Error('Missing event id.');

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('events')
    .update({
      admin_notes: nullableText(
        formData,
        'admin_notes'
      ),

      admin_refund_note: nullableText(
        formData,
        'admin_refund_note'
      ),

      admin_last_updated_at: nowIso,
      admin_last_updated_by: user.id,
      updated_at: nowIso,
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  refreshEventPaths(eventId);
  redirect(`/admin/events/${eventId}?notes=updated`);
}

export async function updateAdminEventStatus(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');
  const requestedStatus = textValue(formData, 'status');
  const reason = textValue(formData, 'reason');
  const adminNote = textValue(formData, 'admin_note');

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  if (
    !VALID_EVENT_STATUSES.includes(
      requestedStatus as EventStatus
    )
  ) {
    throw new Error(
      `Unsupported event status: ${requestedStatus}`
    );
  }

  if (!reason) {
    throw new Error(
      'An internal reason is required for a manual status change.'
    );
  }

  const event = await getEventWorkflowRecord(
    supabase,
    eventId
  );

  const nextStatus = requestedStatus as EventStatus;

  if (event.status === nextStatus) {
    throw new Error(
      `The event is already ${formatAdminStatus(nextStatus)}.`
    );
  }

  const nowIso = new Date().toISOString();

  const transitionUpdates =
    buildManualStatusUpdates({
      event,
      nextStatus,
      userId: user.id,
      reason,
      nowIso,
    });

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'admin',
    toStatus: nextStatus,
    source: 'admin_action',
    reason,
    note: adminNote || null,
    metadata: {
      action: 'manual_admin_status_change',
      previous_status: event.status,
      requested_status: nextStatus,
    },
    updates: transitionUpdates,
  });

  const { error: adminUpdateError } = await supabase
    .from('events')
    .update({
      admin_notes: adminNote || reason,
      admin_last_updated_at: nowIso,
      admin_last_updated_by: user.id,
      updated_at: nowIso,
    })
    .eq('id', eventId);

  if (adminUpdateError) {
    throw new Error(adminUpdateError.message);
  }

  refreshEventPaths(eventId);

  redirect(
    `/admin/events/${eventId}?status=updated`
  );
} 

export async function updateAdminEventVisibility(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = textValue(formData, 'event_id');
  const action = textValue(formData, 'action');
  const reason = textValue(formData, 'reason');
  const adminNote = textValue(
    formData,
    'admin_note'
  );

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  const event = await getEventWorkflowRecord(
    supabase,
    eventId
  );

  const nowIso = new Date().toISOString();

  /*
   * These actions affect presentation but do not change
   * the event's lifecycle status.
   */
  if (
    ['hide', 'unhide', 'feature', 'unfeature'].includes(
      action
    )
  ) {
    const payload: Record<string, unknown> = {
      admin_last_updated_at: nowIso,
      admin_last_updated_by: user.id,
      updated_at: nowIso,
    };

    switch (action) {
      case 'hide':
        payload.is_public = false;
        payload.hidden_by_admin = true;
        break;

      case 'unhide': {
        const canPublish = calculatePublicState(
          event,
          {
            hiddenByAdmin: false,
          }
        );

        if (!canPublish) {
          throw new Error(
            'This event cannot be made public until it is approved, financially eligible, in a public status, and within its promotion window.'
          );
        }

        payload.hidden_by_admin = false;
        payload.is_public = true;
        break;
      }

      case 'feature':
        payload.admin_featured = true;
        break;

      case 'unfeature':
        payload.admin_featured = false;
        break;
    }

    const { error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', eventId);

    if (error) {
      throw new Error(error.message);
    }

    refreshEventPaths(eventId);

    redirect(
      `/admin/events/${eventId}?visibility=updated`
    );
  }

  /*
   * These actions change the lifecycle and therefore
   * must use the transition engine.
   */
  if (
    ['reactivate', 'cancel', 'remove'].includes(
      action
    ) &&
    !reason
  ) {
    throw new Error(
      'A reason is required for this lifecycle action.'
    );
  }

  switch (action) {
    case 'reactivate': {
      if (event.is_approved !== true) {
        throw new Error(
          'Approve the event before reactivating it.'
        );
      }

      if (!eventIsPaid(event)) {
        throw new Error(
          'Payment or a payment override is required before reactivation.'
        );
      }

      await transitionEventStatus({
        supabase,
        eventId,
        actorId: user.id,
        actor: 'admin',
        toStatus: 'scheduled',
        source: 'admin_action',
        reason,
        note:
          adminNote ||
          'Event reactivated by administrator.',
        metadata: {
          action: 'reactivate_event',
          previous_status: event.status,
        },
        updates: {
          isApproved: true,
          hiddenByAdmin: false,
          removedAt: null,
          removedBy: null,
        },
      });

      break;
    }

    case 'cancel': {
      await transitionEventStatus({
        supabase,
        eventId,
        actorId: user.id,
        actor: 'admin',
        toStatus: 'cancelled',
        source: 'admin_action',
        reason,
        note:
          adminNote ||
          'Event cancelled by administrator.',
        metadata: {
          action: 'cancel_event',
          previous_status: event.status,
        },
        updates: {
          isPublic: false,
          hiddenByAdmin: true,
        },
      });

      break;
    }

    case 'remove': {
      await transitionEventStatus({
        supabase,
        eventId,
        actorId: user.id,
        actor: 'admin',
        toStatus: 'removed',
        source: 'admin_action',
        reason,
        note:
          adminNote ||
          'Event removed by administrator.',
        metadata: {
          action: 'remove_event',
          previous_status: event.status,
        },
        updates: {
          isPublic: false,
          hiddenByAdmin: true,
          removedAt: nowIso,
          removedBy: user.id,
        },
      });

      break;
    }

    default:
      throw new Error(
        'Invalid visibility or lifecycle action.'
      );
  }

  const { error: auditError } = await supabase
    .from('events')
    .update({
      admin_notes: adminNote || reason,
      admin_last_updated_at: nowIso,
      admin_last_updated_by: user.id,
      updated_at: nowIso,
    })
    .eq('id', eventId);

  if (auditError) {
    throw new Error(auditError.message);
  }

  refreshEventPaths(eventId);

  redirect(
    `/admin/events/${eventId}?visibility=updated`
  );
}

function buildManualStatusUpdates({
  event,
  nextStatus,
  userId,
  reason,
  nowIso,
}: {
  event: EventWorkflowRecord;
  nextStatus: EventStatus;
  userId: string;
  reason: string;
  nowIso: string;
}) {
  const updates: {
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
  } = {};

  switch (nextStatus) {
    case 'draft':
    case 'building':
    case 'revision_draft':
    case 'submitted':
    case 'revision_submitted':
      updates.isPublic = false;
      updates.hiddenByAdmin = false;
      break;

    case 'approved_unpaid':
    case 'approved_awaiting_payment':
      updates.isApproved = true;
      updates.isPublic = false;
      updates.approvedAt = nowIso;
      updates.approvedBy = userId;

      updates.rejectedAt = null;
      updates.rejectedBy = null;
      updates.rejectionReason = null;
      break;

    case 'paid_awaiting_approval':
      updates.isPaid = true;
      updates.paymentStatus = 'paid';
      updates.isPublic = false;
      break;

    case 'scheduled':
    case 'active':
    case 'live':
      if (!event.is_approved) {
        throw new Error(
          'The event must be approved before it can become scheduled, active, or live.'
        );
      }

      if (!eventIsPaid(event)) {
        throw new Error(
          'Payment or a payment override is required before the event can become scheduled, active, or live.'
        );
      }

      updates.isApproved = true;
      updates.hiddenByAdmin = false;
      updates.removedAt = null;
      updates.removedBy = null;
      break;

    case 'rejected':
      updates.isApproved = false;
      updates.isPublic = false;

      updates.rejectedAt = nowIso;
      updates.rejectedBy = userId;
      updates.rejectionReason = reason;

      updates.approvedAt = null;
      updates.approvedBy = null;
      break;

    case 'removal_requested':
    case 'refund_requested':
      updates.isPublic = false;
      break;

    case 'cancelled':
      updates.isPublic = false;
      updates.hiddenByAdmin = true;
      break;

    case 'removed':
      updates.isPublic = false;
      updates.hiddenByAdmin = true;
      updates.removedAt = nowIso;
      updates.removedBy = userId;
      break;

    case 'ended':
    case 'archived':
      updates.isPublic = false;
      break;
  }

  return updates;
}

function formatAdminStatus(status: EventStatus) {
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}