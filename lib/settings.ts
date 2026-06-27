import { createClient } from '@/lib/supabase/server';

const defaultSettings = {
  id: 'global',

  event_base_price: 19.99,
  included_promo_days: 14,
  extra_promo_day_price: 2.5,

  enable_link_lite: true,
  enable_full_link: true,
  link_lite_price: 9.99,
  full_link_price: 49.99,

  homepage_show_active_events: true,
  homepage_show_hype_cities: true,
  homepage_show_external_events: true,
  homepage_show_tonight: true,
  homepage_show_right_now: true,
  homepage_show_featured_events: true,
  homepage_show_priority_events: true,

  homepage_show_live_now: true,
  homepage_show_starting_soon: true,
  homepage_show_recently_added: true,
  homepage_show_weekend: true,
  homepage_show_most_shared: false,
  homepage_show_most_commented: false,

  homepage_live_now_limit: 6,
  homepage_starting_soon_limit: 6,
  homepage_recently_added_limit: 6,
  homepage_weekend_limit: 6,

  homepage_default_city: 'Kansas City',
  homepage_default_state: 'MO',
  homepage_use_location_prompt: true,

  ambassador_min_discount: 20,
  ambassador_max_discount: 70,
  ambassador_commission_percent: 30,
  ambassador_min_payout: 25,
  ambassador_program_enabled: true,
  ambassador_founder_limit: 50,
};

export async function getPlatformSettings() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 'global')
    .maybeSingle();

  if (error) {
    console.error('Platform settings error:', error.message);
    return defaultSettings;
  }

  return data || defaultSettings;
}