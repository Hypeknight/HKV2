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

export async function createEventCoupon(formData: FormData) {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const code = String(formData.get('code') || '').trim().toUpperCase();
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const discountType = String(formData.get('discount_type') || 'fixed');
  const discountAmount = Number(formData.get('discount_amount') || 0);
  const discountPercent = Number(formData.get('discount_percent') || 0);
  const maxRedemptionsRaw = String(formData.get('max_redemptions') || '').trim();
  const startsAt = String(formData.get('starts_at') || '').trim();
  const expiresAt = String(formData.get('expires_at') || '').trim();

  if (!code) throw new Error('Coupon code is required.');

  if (!['fixed', 'percent'].includes(discountType)) {
    throw new Error('Invalid discount type.');
  }

  if (discountType === 'fixed' && discountAmount <= 0) {
    throw new Error('Fixed discount requires a discount amount.');
  }

  if (discountType === 'percent' && (discountPercent <= 0 || discountPercent > 100)) {
    throw new Error('Percent discount must be between 1 and 100.');
  }

  const { error } = await supabase.from('event_coupons').insert({
    code,
    name: name || code,
    description: description || null,
    discount_type: discountType,
    discount_amount: discountType === 'fixed' ? discountAmount : null,
    discount_percent: discountType === 'percent' ? discountPercent : null,
    max_redemptions: maxRedemptionsRaw ? Number(maxRedemptionsRaw) : null,
    starts_at: startsAt ? new Date(startsAt).toISOString() : null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    is_active: true,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  redirect('/admin/coupons?created=1');
}

export async function toggleEventCoupon(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const couponId = String(formData.get('coupon_id') || '');
  const isActive = String(formData.get('is_active') || '') === 'true';

  if (!couponId) throw new Error('Missing coupon id.');

  const { error } = await supabase
    .from('event_coupons')
    .update({
      is_active: !isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', couponId);

  if (error) throw new Error(error.message);

  redirect('/admin/coupons?updated=1');
}