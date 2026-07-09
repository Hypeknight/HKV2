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

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  return { supabase, user };
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

function money(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function intValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function textValue(formData: FormData, key: string, fallback = '') {
  return String(formData.get(key) || fallback).trim();
}

export async function updatePlatformSettings(formData: FormData) {
  const { supabase } = await requireAdmin();

  const minDiscount = intValue(formData, 'ambassador_min_discount', 20);
  const maxDiscount = intValue(formData, 'ambassador_max_discount', 70);

  if (minDiscount < 0 || maxDiscount > 100 || minDiscount > maxDiscount) {
    throw new Error('Ambassador discount range is invalid.');
  }

  const { error } = await supabase
    .from('platform_settings')
    .update({
      site_status: textValue(formData, 'site_status', 'beta'),
      beta_mode: bool(formData, 'beta_mode'),
      maintenance_mode: bool(formData, 'maintenance_mode'),
      homepage_announcement:
        textValue(formData, 'homepage_announcement') || null,

      event_base_price: money(formData, 'event_base_price', 19.99),
      included_promo_days: intValue(formData, 'included_promo_days', 14),
      extra_promo_day_price: money(formData, 'extra_promo_day_price', 2.5),

      event_review_required: bool(formData, 'event_review_required'),
      event_payment_required: bool(formData, 'event_payment_required'),
      event_auto_publish: bool(formData, 'event_auto_publish'),
      event_auto_expire: bool(formData, 'event_auto_expire'),
      owner_edits_before_promo: bool(formData, 'owner_edits_before_promo'),
      event_public_display_rule:
        textValue(formData, 'event_public_display_rule') || null,

      owner_process_build_text:
        textValue(formData, 'owner_process_build_text') || null,
      owner_process_payment_text:
        textValue(formData, 'owner_process_payment_text') || null,
      owner_process_review_text:
        textValue(formData, 'owner_process_review_text') || null,
      owner_process_discovery_text:
        textValue(formData, 'owner_process_discovery_text') || null,

      enable_link_lite: bool(formData, 'enable_link_lite'),
      enable_full_link: bool(formData, 'enable_full_link'),
      link_lite_price: money(formData, 'link_lite_price', 0),
      full_link_price: money(formData, 'full_link_price', 0),

      homepage_show_active_events: bool(formData, 'homepage_show_active_events'),
      homepage_show_hype_cities: bool(formData, 'homepage_show_hype_cities'),
      homepage_show_external_events: bool(
        formData,
        'homepage_show_external_events'
      ),
      homepage_show_tonight: bool(formData, 'homepage_show_tonight'),
      homepage_show_right_now: bool(formData, 'homepage_show_right_now'),
      homepage_show_featured_events: bool(
        formData,
        'homepage_show_featured_events'
      ),
      homepage_show_priority_events: bool(
        formData,
        'homepage_show_priority_events'
      ),

      homepage_show_live_now: bool(formData, 'homepage_show_live_now'),
      homepage_show_starting_soon: bool(
        formData,
        'homepage_show_starting_soon'
      ),
      homepage_show_recently_added: bool(
        formData,
        'homepage_show_recently_added'
      ),
      homepage_show_weekend: bool(formData, 'homepage_show_weekend'),
      homepage_show_most_shared: bool(formData, 'homepage_show_most_shared'),
      homepage_show_most_commented: bool(
        formData,
        'homepage_show_most_commented'
      ),

      homepage_live_now_limit: intValue(
        formData,
        'homepage_live_now_limit',
        6
      ),
      homepage_starting_soon_limit: intValue(
        formData,
        'homepage_starting_soon_limit',
        6
      ),
      homepage_recently_added_limit: intValue(
        formData,
        'homepage_recently_added_limit',
        6
      ),
      homepage_weekend_limit: intValue(formData, 'homepage_weekend_limit', 6),

      homepage_default_city: textValue(
        formData,
        'homepage_default_city',
        'Kansas City'
      ),
      homepage_default_state: textValue(
        formData,
        'homepage_default_state',
        'MO'
      ).toUpperCase(),
      homepage_use_location_prompt: bool(
        formData,
        'homepage_use_location_prompt'
      ),

      promote_page_headline:
        textValue(formData, 'promote_page_headline') || null,
      promote_page_description:
        textValue(formData, 'promote_page_description') || null,
      pricing_page_note: textValue(formData, 'pricing_page_note') || null,

      ambassador_min_discount: minDiscount,
      ambassador_max_discount: maxDiscount,
      ambassador_commission_percent: intValue(
        formData,
        'ambassador_commission_percent',
        30
      ),
      ambassador_min_payout: money(formData, 'ambassador_min_payout', 25),
      ambassador_program_enabled: bool(
        formData,
        'ambassador_program_enabled'
      ),
      ambassador_founder_limit: intValue(
        formData,
        'ambassador_founder_limit',
        50
      ),

      updated_at: new Date().toISOString(),
    })
    .eq('id', 'global');

  if (error) throw new Error(error.message);

  redirect('/admin/settings?saved=1');
}