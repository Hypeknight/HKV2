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