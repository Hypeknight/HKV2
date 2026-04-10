'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function requireVenueOwnerOrAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (error || !['venue_owner', 'admin'].includes(profile?.app_role || '')) {
    redirect('/dashboard');
  }

  return { supabase, user, role: profile?.app_role as string };
}

export async function createVenueStep1(formData: FormData) {
  const { supabase, user } = await requireVenueOwnerOrAdmin();

  const name = String(formData.get('name') || '').trim();
  const address = String(formData.get('address') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const websiteUrl = String(formData.get('website_url') || '').trim();
  const instagramUrl = String(formData.get('instagram_url') || '').trim();
  const coverImageUrl = String(formData.get('cover_image_url') || '').trim();
  const isVisible = String(formData.get('is_visible') || '') === 'yes';

  const baseSlug = slugify(`${name} ${city} ${state}`);
  const slug = `${baseSlug}-${Date.now()}`;

  const { data, error } = await supabase
    .from('venues')
    .insert({
      owner_id: user.id,
      name,
      slug,
      address,
      city,
      state,
      website_url: websiteUrl || null,
      instagram_url: instagramUrl || null,
      cover_image_url: coverImageUrl || null,
      is_visible: isVisible,
      status: 'draft',
      is_featured: false,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  redirect(`/dashboard/venues/${data.id}/edit/step-2`);
}

export async function updateVenueStep1(formData: FormData) {
  const { supabase, user } = await requireVenueOwnerOrAdmin();

  const venueId = String(formData.get('venue_id') || '');
  const name = String(formData.get('name') || '').trim();
  const address = String(formData.get('address') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const websiteUrl = String(formData.get('website_url') || '').trim();
  const instagramUrl = String(formData.get('instagram_url') || '').trim();
  const coverImageUrl = String(formData.get('cover_image_url') || '').trim();
  const isVisible = String(formData.get('is_visible') || '') === 'yes';

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, slug, status')
    .eq('id', venueId)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) throw new Error(venueError?.message || 'Venue not found');

  if (!['draft', 'pending_payment', 'hidden'].includes(venue.status)) {
    redirect('/dashboard/venues');
  }

  const slug = venue.slug || `${slugify(`${name} ${city} ${state}`)}-${Date.now()}`;

  const { error } = await supabase
    .from('venues')
    .update({
      name,
      slug,
      address,
      city,
      state,
      website_url: websiteUrl || null,
      instagram_url: instagramUrl || null,
      cover_image_url: coverImageUrl || null,
      is_visible: isVisible,
    })
    .eq('id', venueId)
    .eq('owner_id', user.id);

  if (error) throw new Error(error.message);

  redirect(`/dashboard/venues/${venueId}/edit/step-2`);
}

export async function updateVenueStep2(formData: FormData) {
  const { supabase, user } = await requireVenueOwnerOrAdmin();

  const venueId = String(formData.get('venue_id') || '');
  const description = String(formData.get('description') || '').trim();
  const specialMessage = String(formData.get('special_message') || '').trim();
  const dressCode = String(formData.get('dress_code') || '').trim();
  const generalInfo = String(formData.get('general_info') || '').trim();
  const drinkMenuEnabled = String(formData.get('drink_menu_enabled') || '') === 'yes';
  const drinkMenuNotes = String(formData.get('drink_menu_notes') || '').trim();
  const rsvpEnabled = String(formData.get('rsvp_enabled') || '') === 'yes';
  const tableServiceEnabled = String(formData.get('table_service_enabled') || '') === 'yes';
  const musicProfile = formData.getAll('music_profile').map(String);

  const { error: venueError } = await supabase
    .from('venues')
    .update({
      description: description || null,
      special_message: specialMessage || null,
    })
    .eq('id', venueId)
    .eq('owner_id', user.id);

  if (venueError) throw new Error(venueError.message);

  const { data: existingProfile } = await supabase
    .from('venue_feature_profiles')
    .select('id')
    .eq('venue_id', venueId)
    .maybeSingle();

  const payload = {
    venue_id: venueId,
    music_profile: musicProfile.length ? musicProfile : null,
    dress_code: dressCode || null,
    drink_menu_enabled: drinkMenuEnabled,
    drink_menu_notes: drinkMenuNotes || null,
    rsvp_enabled: rsvpEnabled,
    table_service_enabled: tableServiceEnabled,
    general_info: generalInfo || null,
  };

  const { error: featureError } = existingProfile
    ? await supabase
        .from('venue_feature_profiles')
        .update(payload)
        .eq('venue_id', venueId)
    : await supabase.from('venue_feature_profiles').insert(payload);

  if (featureError) throw new Error(featureError.message);

  redirect(`/dashboard/venues/${venueId}/edit/step-3`);
}

export async function updateVenueStep3(formData: FormData) {
  const { supabase, user } = await requireVenueOwnerOrAdmin();

  const venueId = String(formData.get('venue_id') || '');
  const planDefinitionId = String(formData.get('plan_definition_id') || '');
  const billingMode = String(formData.get('billing_mode') || 'monthly');
  const lockIn = String(formData.get('lock_in') || '') === 'yes';

  const commentsEnabled = String(formData.get('comments_enabled') || '') === 'yes';
  const djRequestsEnabled = String(formData.get('dj_requests_enabled') || '') === 'yes';
  const linkdnMode = String(formData.get('linkdn_mode') || 'none');
  const drinkMenuEnabled = String(formData.get('drink_menu_enabled') || '') === 'yes';
  const rsvpEnabled = String(formData.get('rsvp_enabled') || '') === 'yes';
  const tableServiceEnabled = String(formData.get('table_service_enabled') || '') === 'yes';
  const musicProfileEnabled = String(formData.get('music_profile_enabled') || '') === 'yes';
  const dressCodeEnabled = String(formData.get('dress_code_enabled') || '') === 'yes';
  const specialMessageEnabled = String(formData.get('special_message_enabled') || '') === 'yes';

  const { data: plan, error: planError } = await supabase
    .from('venue_plan_definitions')
    .select('*')
    .eq('id', planDefinitionId)
    .eq('is_active', true)
    .single();

  if (planError || !plan) throw new Error(planError?.message || 'Plan not found');

  const monthlyPrice = Number(plan.base_monthly_price || 0);
  const prepaidTotal = Number(plan.base_prepaid_price || 0);

  const addOnMonthlyPrice =
    (commentsEnabled ? 10 : 0) +
    (djRequestsEnabled ? 15 : 0) +
    (linkdnMode === 'lite' ? 75 : 0) +
    (linkdnMode === 'full' ? 250 : 0);

  const addOnPrepaidPrice =
    (commentsEnabled ? 25 : 0) +
    (djRequestsEnabled ? 40 : 0) +
    (linkdnMode === 'lite' ? 150 : 0) +
    (linkdnMode === 'full' ? 500 : 0);

  const currentPeriodPrice =
    billingMode === 'monthly'
      ? monthlyPrice + addOnMonthlyPrice
      : prepaidTotal + addOnPrepaidPrice;

  const { data: existingSubscription } = await supabase
    .from('venue_subscriptions')
    .select('id')
    .eq('venue_id', venueId)
    .maybeSingle();

  const subscriptionPayload = {
    venue_id: venueId,
    plan_definition_id: planDefinitionId,
    billing_mode: billingMode,
    lock_in: lockIn,
    subscription_status: 'draft',
    monthly_price: monthlyPrice,
    prepaid_total: prepaidTotal,
    current_period_price: currentPeriodPrice,
    next_billing_amount: billingMode === 'monthly' ? monthlyPrice + addOnMonthlyPrice : 0,
    is_active: false,
  };

  const subscriptionResult = existingSubscription
    ? await supabase
        .from('venue_subscriptions')
        .update(subscriptionPayload)
        .eq('venue_id', venueId)
        .select('id')
        .single()
    : await supabase
        .from('venue_subscriptions')
        .insert(subscriptionPayload)
        .select('id')
        .single();

  if (subscriptionResult.error || !subscriptionResult.data) {
    throw new Error(subscriptionResult.error?.message || 'Subscription save failed');
  }

  const subscriptionId = subscriptionResult.data.id;

  const { data: existingFeatures } = await supabase
    .from('venue_subscription_features')
    .select('id')
    .eq('venue_subscription_id', subscriptionId)
    .maybeSingle();

  const featurePayload = {
    venue_subscription_id: subscriptionId,
    comments_enabled: commentsEnabled,
    dj_requests_enabled: djRequestsEnabled,
    linkdn_mode: linkdnMode,
    drink_menu_enabled: drinkMenuEnabled,
    rsvp_enabled: rsvpEnabled,
    table_service_enabled: tableServiceEnabled,
    music_profile_enabled: musicProfileEnabled,
    dress_code_enabled: dressCodeEnabled,
    special_message_enabled: specialMessageEnabled,
    add_on_monthly_price: addOnMonthlyPrice,
    add_on_prepaid_price: addOnPrepaidPrice,
  };

  const featureResult = existingFeatures
    ? await supabase
        .from('venue_subscription_features')
        .update(featurePayload)
        .eq('venue_subscription_id', subscriptionId)
    : await supabase.from('venue_subscription_features').insert(featurePayload);

  if (featureResult.error) throw new Error(featureResult.error.message);

  const { data: existingUsage } = await supabase
    .from('venue_subscription_usage')
    .select('id, used_event_posts')
    .eq('venue_subscription_id', subscriptionId)
    .maybeSingle();

  const usagePayload = {
    venue_subscription_id: subscriptionId,
    included_event_posts: Number(plan.included_event_posts || 0),
    used_event_posts: Number(existingUsage?.used_event_posts || 0),
  };

  const usageResult = existingUsage
    ? await supabase
        .from('venue_subscription_usage')
        .update(usagePayload)
        .eq('venue_subscription_id', subscriptionId)
    : await supabase.from('venue_subscription_usage').insert(usagePayload);

  if (usageResult.error) throw new Error(usageResult.error.message);

  const { error: venueError } = await supabase
    .from('venues')
    .update({
      status: 'pending_payment',
    })
    .eq('id', venueId)
    .eq('owner_id', user.id);

  if (venueError) throw new Error(venueError.message);

  redirect(`/dashboard/venues/${venueId}/review`);
}