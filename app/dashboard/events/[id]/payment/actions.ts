'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function applyEventCoupon(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');
  const code = String(formData.get('coupon_code') || '').trim().toUpperCase();

  if (!eventId) throw new Error('Missing event id.');
  if (!code) throw new Error('Enter a coupon code.');

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, owner_id, total_price, payment_amount')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message || 'Event not found.');
  }

  const { data: coupon, error: couponError } = await supabase
    .from('event_coupons')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (couponError || !coupon) throw new Error('Invalid coupon code.');
  if (!coupon.is_active) throw new Error('This coupon is not active.');

  const now = new Date();

  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    throw new Error('This coupon is not active yet.');
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    throw new Error('This coupon has expired.');
  }

  if (
    coupon.max_redemptions &&
    Number(coupon.redemption_count || 0) >= Number(coupon.max_redemptions)
  ) {
    throw new Error('This coupon has reached its redemption limit.');
  }

  const originalTotal = Number(event.payment_amount || event.total_price || 0);

  let discountAmount = 0;

  if (coupon.discount_type === 'fixed') {
    discountAmount = Number(coupon.discount_amount || 0);
  }

  if (coupon.discount_type === 'percent') {
    discountAmount =
      originalTotal * (Number(coupon.discount_percent || 0) / 100);
  }

  discountAmount = Math.min(discountAmount, originalTotal);
  discountAmount = Number(discountAmount.toFixed(2));

  const discountedTotal = Number(
    Math.max(originalTotal - discountAmount, 0).toFixed(2)
  );

  const nowIso = now.toISOString();

  const { error: updateError } = await supabase
    .from('events')
    .update({
      coupon_code: coupon.code,
      discount_type: coupon.discount_type,
      discount_amount: discountAmount,
      discount_percent: coupon.discount_percent,
      discounted_total: discountedTotal,
      discount_applied_at: nowIso,
      payment_amount: discountedTotal,
      payment_status: discountedTotal <= 0 ? 'paid' : 'pending',
      is_paid: discountedTotal <= 0,
      paid_at: discountedTotal <= 0 ? nowIso : null,
      status: discountedTotal <= 0 ? 'paid_awaiting_approval' : 'NPNA',
      updated_at: nowIso,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (updateError) throw new Error(updateError.message);

  await supabase.from('event_coupon_redemptions').upsert(
    {
      coupon_id: coupon.id,
      event_id: eventId,
      user_id: user.id,
      code: coupon.code,
      discount_amount: discountAmount,
      redeemed_at: nowIso,
    },
    {
      onConflict: 'coupon_id,event_id',
    }
  );

  await supabase
    .from('event_coupons')
    .update({
      redemption_count: Number(coupon.redemption_count || 0) + 1,
      updated_at: nowIso,
    })
    .eq('id', coupon.id);

  redirect(`/dashboard/events/${eventId}/payment?coupon=applied`);
}