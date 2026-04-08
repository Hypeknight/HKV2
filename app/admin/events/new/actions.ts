'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

export async function approveEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const eventId = String(formData.get('event_id') || '');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('is_paid, payment_override, promotion_start_at, promotion_end_at')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) throw new Error(fetchError?.message || 'Event not found');

  const isPublic = derivePublicState({
    isApproved: true,
    isPaid: event.is_paid,
    paymentOverride: event.payment_override,
    promotionStartAt: event.promotion_start_at,
    promotionEndAt: event.promotion_end_at,
    status: event.is_paid || event.payment_override ? 'scheduled' : 'approved_unpaid',
  });

  const nextStatus = event.is_paid || event.payment_override ? 'scheduled' : 'approved_unpaid';

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

  const { error } = await supabase
    .from('events')
    .update({
      status: 'rejected',
      is_approved: false,
      is_public: false,
      rejected_at: new Date().toISOString(),
      rejected_by: user.id,
      rejection_reason: rejectionReason,
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

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('is_approved, promotion_start_at, promotion_end_at')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) throw new Error(fetchError?.message || 'Event not found');

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