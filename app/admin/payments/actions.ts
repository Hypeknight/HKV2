'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  return user;
}

export async function updateStripeMode(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const stripeMode = String(formData.get('stripe_mode') || 'test');

  if (!['test', 'live'].includes(stripeMode)) {
    throw new Error('Invalid Stripe mode.');
  }

  const { data: existing } = await supabase
    .from('payment_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('payment_settings')
      .update({
        stripe_mode: stripeMode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('payment_settings').insert({
      stripe_mode: stripeMode,
    });

    if (error) throw new Error(error.message);
  }

  redirect('/admin/payments?mode=updated');
}

export async function approveRefundRequest(formData: FormData) {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const eventId = String(formData.get('event_id') || '');
  const adminNote = String(formData.get('refund_admin_note') || '').trim();
  const requestedAmount = Number(formData.get('refund_amount_approved') || 0);

  if (!eventId) throw new Error('Missing event id.');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('payment_amount, discounted_total, total_price')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found.');
  }

  const actualPaidAmount = Number(
    event.payment_amount ?? event.discounted_total ?? 0
  );

  if (requestedAmount < 0) {
    throw new Error('Refund amount cannot be negative.');
  }

  if (requestedAmount > actualPaidAmount) {
    throw new Error('Refund amount cannot exceed the actual amount paid.');
  }

  const { error } = await supabase
    .from('events')
    .update({
      refund_status: 'approved',
      refund_amount_approved: requestedAmount,
      refund_reviewed_at: new Date().toISOString(),
      refund_reviewed_by: user.id,
      refund_admin_note: adminNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/payments?refund=approved');
}

export async function denyRefundRequest(formData: FormData) {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const eventId = String(formData.get('event_id') || '');
  const adminNote = String(formData.get('refund_admin_note') || '').trim();

  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .update({
      refund_status: 'denied',
      refund_reviewed_at: new Date().toISOString(),
      refund_reviewed_by: user.id,
      refund_admin_note: adminNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/payments?refund=denied');
}

export async function markManualRefundComplete(formData: FormData) {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const eventId = String(formData.get('event_id') || '');
  const stripeRefundId = String(formData.get('stripe_refund_id') || '').trim();
  const adminNote = String(formData.get('refund_admin_note') || '').trim();
  const refundedAmount = Number(formData.get('refund_amount_refunded') || 0);

  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .update({
      refund_status: 'refunded',
      refund_amount_refunded: refundedAmount,
      refunded_at: new Date().toISOString(),
      refund_reviewed_at: new Date().toISOString(),
      refund_reviewed_by: user.id,
      stripe_refund_id: stripeRefundId || null,
      refund_admin_note: adminNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/payments?refund=completed');
}

export async function approveRemovalRequest(formData: FormData) {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const eventId = String(formData.get('event_id') || '');
  const adminNote = String(formData.get('admin_note') || '').trim();

  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .update({
      status: 'removed',
      is_public: false,
      removed_at: new Date().toISOString(),
      removed_by: user.id,
      removal_reviewed_at: new Date().toISOString(),
      removal_reviewed_by: user.id,
      removal_admin_note: adminNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/payments?removal=approved');
}

export async function denyRemovalRequest(formData: FormData) {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const eventId = String(formData.get('event_id') || '');
  const adminNote = String(formData.get('admin_note') || '').trim();

  if (!eventId) throw new Error('Missing event id.');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('promotion_start_at, promotion_end_at')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found.');
  }

  const now = new Date();
  const promoStart = event.promotion_start_at
    ? new Date(event.promotion_start_at)
    : null;
  const promoEnd = event.promotion_end_at
    ? new Date(event.promotion_end_at)
    : null;

  const shouldBeActive =
    promoStart &&
    promoEnd &&
    now >= promoStart &&
    now <= promoEnd;

  const { error } = await supabase
    .from('events')
    .update({
      status: shouldBeActive ? 'active' : 'scheduled',
      is_public: shouldBeActive,
      removal_reviewed_at: new Date().toISOString(),
      removal_reviewed_by: user.id,
      removal_admin_note: adminNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/payments?removal=denied');
}