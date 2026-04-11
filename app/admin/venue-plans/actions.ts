'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  return { supabase };
}

export async function saveVenuePlan(formData: FormData) {
  const { supabase } = await requireAdmin();

  const planId = String(formData.get('plan_id') || '').trim();
  const code = String(formData.get('code') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const tier = String(formData.get('tier') || '').trim();
  const durationMonths = Number(formData.get('duration_months') || 0);
  const baseMonthlyPrice = Number(formData.get('base_monthly_price') || 0);
  const basePrepaidPrice = Number(formData.get('base_prepaid_price') || 0);
  const includedEventPosts = Number(formData.get('included_event_posts') || 0);

  const includesComments = String(formData.get('includes_comments') || '') === 'yes';
  const includesDjRequests = String(formData.get('includes_dj_requests') || '') === 'yes';
  const includesLinkdnLite = String(formData.get('includes_linkdn_lite') || '') === 'yes';
  const includesLinkdnFull = String(formData.get('includes_linkdn_full') || '') === 'yes';
  const isActive = String(formData.get('is_active') || '') === 'yes';

  const payload = {
    code,
    name,
    tier,
    duration_months: durationMonths,
    base_monthly_price: baseMonthlyPrice,
    base_prepaid_price: basePrepaidPrice,
    included_event_posts: includedEventPosts,
    includes_comments: includesComments,
    includes_dj_requests: includesDjRequests,
    includes_linkdn_lite: includesLinkdnLite,
    includes_linkdn_full: includesLinkdnFull,
    is_active: isActive,
  };

  const result = planId
    ? await supabase.from('venue_plan_definitions').update(payload).eq('id', planId)
    : await supabase.from('venue_plan_definitions').insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }

  redirect('/admin/venue-plans?saved=1');
}