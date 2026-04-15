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

  redirect(`/dashboard/venues/${venueId}/edit/hours`);
}

export async function updateVenueStep3(formData: FormData) {
  const { supabase, user } = await requireVenueOwnerOrAdmin();

  const venueId = String(formData.get('venue_id') || '');
  const planCode = String(formData.get('plan_code') || 'entertainer_3m');
  const billingMode = String(formData.get('billing_mode') || 'monthly');
  const lockIn = String(formData.get('lock_in') || '') === 'yes';

  const commentsEnabled = String(formData.get('comments_enabled') || '') === 'yes';
  const djRequestsEnabled = String(formData.get('dj_requests_enabled') || '') === 'yes';
  const linkdnMode = String(formData.get('linkdn_mode') || 'none');

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, owner_id')
    .eq('id', venueId)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) {
    throw new Error(venueError?.message || 'Venue not found');
  }

  const { data: plan, error: planError } = await supabase
    .from('venue_plan_definitions')
    .select('*')
    .eq('code', planCode)
    .eq('is_active', true)
    .maybeSingle();

  if (planError || !plan) {
    throw new Error(planError?.message || 'Plan not found');
  }

  const basePrice =
    billingMode === 'prepaid'
      ? Number(plan.base_prepaid_price || 0)
      : Number(plan.base_monthly_price || 0);

  let featureAddOn = 0;

  if (commentsEnabled && !plan.includes_comments) {
    featureAddOn += 25;
  }

  if (djRequestsEnabled && !plan.includes_dj_requests) {
    featureAddOn += 40;
  }

  if (linkdnMode === 'lite' && !plan.includes_linkdn_lite) {
    featureAddOn += 125;
  }

  if (linkdnMode === 'full' && !plan.includes_linkdn_full) {
    featureAddOn += 300;
  }

  const currentPeriodPrice = Number((basePrice + featureAddOn).toFixed(2));
  const monthlyPrice =
    billingMode === 'monthly'
      ? currentPeriodPrice
      : Number((currentPeriodPrice / Math.max(Number(plan.duration_months || 1), 1)).toFixed(2));

  const prepaidTotal =
    billingMode === 'prepaid'
      ? currentPeriodPrice
      : Number((currentPeriodPrice * Math.max(Number(plan.duration_months || 1), 1)).toFixed(2));

  const subscriptionStatus = 'draft';
  const isActive = false;

  const { data: existingSubscription } = await supabase
    .from('venue_subscriptions')
    .select('id')
    .eq('venue_id', venueId)
    .maybeSingle();

  const subscriptionPayload = {
    venue_id: venueId,
    plan_definition_id: plan.id,
    billing_mode: billingMode,
    lock_in: lockIn,
    subscription_status: subscriptionStatus,
    is_active: isActive,
    monthly_price: monthlyPrice,
    prepaid_total: prepaidTotal,
    current_period_price: currentPeriodPrice,
    next_billing_amount: billingMode === 'monthly' ? currentPeriodPrice : 0,
    activated_at: null,
  };

  const subscriptionResult = existingSubscription
    ? await supabase
        .from('venue_subscriptions')
        .update(subscriptionPayload)
        .eq('id', existingSubscription.id)
        .select()
        .single()
    : await supabase
        .from('venue_subscriptions')
        .insert(subscriptionPayload)
        .select()
        .single();

  if (subscriptionResult.error || !subscriptionResult.data) {
    throw new Error(subscriptionResult.error?.message || 'Could not save subscription');
  }

  const subscriptionId = subscriptionResult.data.id;

  const subscriptionFeaturesPayload = {
    venue_subscription_id: subscriptionId,
    comments_enabled: plan.includes_comments || commentsEnabled,
    dj_requests_enabled: plan.includes_dj_requests || djRequestsEnabled,
    linkdn_mode: plan.includes_linkdn_full
      ? 'full'
      : plan.includes_linkdn_lite
      ? 'lite'
      : linkdnMode,
    drink_menu_enabled: true,
    rsvp_enabled: true,
    table_service_enabled: true,
    music_profile_enabled: true,
    dress_code_enabled: true,
    special_message_enabled: true,
  };

  const { data: existingFeatures } = await supabase
    .from('venue_subscription_features')
    .select('id')
    .eq('venue_subscription_id', subscriptionId)
    .maybeSingle();

  const featuresResult = existingFeatures
    ? await supabase
        .from('venue_subscription_features')
        .update(subscriptionFeaturesPayload)
        .eq('id', existingFeatures.id)
    : await supabase
        .from('venue_subscription_features')
        .insert(subscriptionFeaturesPayload);

  if (featuresResult.error) {
    throw new Error(featuresResult.error.message);
  }

  const usagePayload = {
    venue_subscription_id: subscriptionId,
    included_event_posts: Number(plan.included_event_posts || 0),
    used_event_posts: 0,
  };

  const { data: existingUsage } = await supabase
    .from('venue_subscription_usage')
    .select('id')
    .eq('venue_subscription_id', subscriptionId)
    .maybeSingle();

  const usageResult = existingUsage
    ? await supabase
        .from('venue_subscription_usage')
        .update(usagePayload)
        .eq('id', existingUsage.id)
    : await supabase
        .from('venue_subscription_usage')
        .insert(usagePayload);

  if (usageResult.error) {
    throw new Error(usageResult.error.message);
  }

  const interactionPayload = {
    venue_id: venueId,
    comments_enabled: plan.includes_comments || commentsEnabled,
    comment_retention_hours: 24,
    comments_require_presence: false,
    comments_auto_filter_enabled: true,
    music_requests_enabled: plan.includes_dj_requests || djRequestsEnabled,
    music_requests_require_presence: false,
  };

  const { data: existingInteraction } = await supabase
    .from('venue_interaction_settings')
    .select('id')
    .eq('venue_id', venueId)
    .maybeSingle();

  const interactionResult = existingInteraction
    ? await supabase
        .from('venue_interaction_settings')
        .update(interactionPayload)
        .eq('id', existingInteraction.id)
    : await supabase
        .from('venue_interaction_settings')
        .insert(interactionPayload);

  if (interactionResult.error) {
    throw new Error(interactionResult.error.message);
  }

  const { error: venueUpdateError } = await supabase
    .from('venues')
    .update({
      updated_at: new Date().toISOString(),
      status: 'draft',
    })
    .eq('id', venueId)
    .eq('owner_id', user.id);

  if (venueUpdateError) {
    throw new Error(venueUpdateError.message);
  }

  redirect(`/dashboard/venues/${venueId}/review`);
}

export async function updateVenueHours(formData: FormData) {
  const { supabase, user } = await requireVenueOwnerOrAdmin();

  const venueId = String(formData.get('venue_id') || '');

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, owner_id')
    .eq('id', venueId)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) {
    throw new Error(venueError?.message || 'Venue not found');
  }

  const rows = [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const isOpen = String(formData.get(`is_open_${day}`) || '') === 'yes';
    const openTime = String(formData.get(`open_time_${day}`) || '').trim();
    const closeTime = String(formData.get(`close_time_${day}`) || '').trim();

    return {
      venue_id: venueId,
      day_of_week: day,
      is_open: isOpen,
      open_time: isOpen && openTime ? openTime : null,
      close_time: isOpen && closeTime ? closeTime : null,
    };
  });

  const { error: deleteError } = await supabase
    .from('venue_hours')
    .delete()
    .eq('venue_id', venueId);

  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase
    .from('venue_hours')
    .insert(rows);

  if (insertError) throw new Error(insertError.message);

  redirect(`/dashboard/venues/${venueId}/edit/step-3`);
}