'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function cleanCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 20);
}

export async function submitAmbassadorApplication(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const payload = {
    user_id: user.id,
    first_name: String(formData.get('first_name') || '').trim(),
    last_name: String(formData.get('last_name') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    phone: String(formData.get('phone') || '').trim() || null,
    platform_username: String(formData.get('platform_username') || '').trim(),
    city: String(formData.get('city') || '').trim(),
    state: String(formData.get('state') || '').trim(),
    instagram_url: String(formData.get('instagram_url') || '').trim() || null,
    facebook_url: String(formData.get('facebook_url') || '').trim() || null,
    tiktok_url: String(formData.get('tiktok_url') || '').trim() || null,
    youtube_url: String(formData.get('youtube_url') || '').trim() || null,
    website_url: String(formData.get('website_url') || '').trim() || null,
    estimated_followers: Number(formData.get('estimated_followers') || 0) || null,
    promotion_plan: String(formData.get('promotion_plan') || '').trim() || null,
    status: 'pending',
  };

  if (!payload.first_name || !payload.last_name || !payload.email) {
    throw new Error('Legal name and email are required.');
  }

  if (!payload.platform_username || !payload.city || !payload.state) {
    throw new Error('Username, city, and state are required.');
  }

  const { data: existing } = await supabase
    .from('ambassador_applications')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved', 'suspended'])
    .maybeSingle();

  if (existing) {
    redirect('/ambassadors/dashboard');
  }

  const { error } = await supabase.from('ambassador_applications').insert(payload);

  if (error) throw new Error(error.message);

  redirect('/ambassadors/dashboard?application=submitted');
}

export async function requestAmbassadorCoupon(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const requestedCode = cleanCode(String(formData.get('requested_code') || ''));
  const discountPercent = Number(formData.get('discount_percent') || 20);
  const usageLimit = Number(formData.get('usage_limit') || 100);

  if (!requestedCode) throw new Error('Coupon code is required.');

  if (discountPercent < 20 || discountPercent > 70) {
    throw new Error('Discount must be between 20% and 70%.');
  }

  if (usageLimit < 1 || usageLimit > 1000) {
    throw new Error('Usage limit must be between 1 and 1000.');
  }

  const { data: ambassador, error: ambassadorError } = await supabase
    .from('ambassador_profiles')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (ambassadorError) throw new Error(ambassadorError.message);

  if (!ambassador) {
    redirect('/ambassadors/dashboard?error=not_active');
  }

  const { data: existingRequest } = await supabase
    .from('ambassador_coupon_requests')
    .select('id')
    .eq('requested_code', requestedCode)
    .in('status', ['pending', 'approved', 'active'])
    .maybeSingle();

  if (existingRequest) {
    throw new Error('That coupon code is already requested or active.');
  }

  const { data: existingCoupon } = await supabase
    .from('event_coupons')
    .select('id')
    .eq('code', requestedCode)
    .maybeSingle();

  if (existingCoupon) {
    throw new Error('That coupon code already exists.');
  }

  const { error } = await supabase.from('ambassador_coupon_requests').insert({
    ambassador_id: ambassador.id,
    user_id: user.id,
    requested_code: requestedCode,
    discount_percent: discountPercent,
    usage_limit: usageLimit,
    status: 'pending',
  });

  if (error) throw new Error(error.message);

  redirect('/ambassadors/coupons?request=submitted');
}