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

export async function approveRefundRequest(formData: FormData) {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const eventId = String(formData.get('event_id') || '');
  const adminNote = String(formData.get('refund_admin_note') || '');

  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .update({
      refund_status: 'approved',
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
  const adminNote = String(formData.get('refund_admin_note') || '');

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
  const stripeRefundId = String(formData.get('stripe_refund_id') || '');
  const adminNote = String(formData.get('refund_admin_note') || '');

  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .update({
      refund_status: 'refunded',
      refunded_at: new Date().toISOString(),
      refund_reviewed_at: new Date().toISOString(),
      refund_reviewed_by: user.id,
      stripe_refund_id: stripeRefundId || null,
      refund_admin_note: adminNote || null,
      is_public: false,
      status: 'removed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/admin/payments?refund=completed');
}
export async function updateStripeMode(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const stripeMode = String(formData.get('stripe_mode') || 'test');

  await supabase
    .from('payment_settings')
    .update({
      stripe_mode: stripeMode,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  redirect('/admin/payments?saved=1');
}