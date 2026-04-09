'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  calculatePromotionStart,
  calculatePromotionEnd,
  calculateTotalPrice,
  derivePublicState,
} from '@/lib/events/workflow';

function getOwnerType(appRole: string | null | undefined): 'user' | 'venue_owner' | 'admin' {
  if (appRole === 'admin') return 'admin';
  if (appRole === 'venue_owner') return 'venue_owner';
  return 'user';
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function createEventStep1(formData: FormData) {
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

  const eventName = String(formData.get('name') || '');
  const venueName = String(formData.get('venue_name') || '');
  const address = String(formData.get('address') || '');
  const city = String(formData.get('city') || '');
  const state = String(formData.get('state') || '');
  const startDate = String(formData.get('start_date') || '');
  const startTime = String(formData.get('start_time') || '');
  const endDate = String(formData.get('end_date') || '');
  const endTime = String(formData.get('end_time') || '');
  const flyerUrl = String(formData.get('flyer_url') || '');
  const baseSlug = slugify(`${eventName} ${city} ${state}`);
  const slug = `${baseSlug}-${Date.now()}`;

  const eventStartAt = new Date(`${startDate}T${startTime}`);
  const eventEndAt = endDate && endTime
    ? new Date(`${endDate}T${endTime}`)
    : new Date(`${startDate}T${startTime}`);

  const { data, error } = await supabase
  .from('events')
  .insert({
    owner_id: user.id,
    owner_type: getOwnerType(profile?.app_role),
    name: eventName,
    slug,
    flyer_url: flyerUrl,
    venue_name: venueName,
    address,
    city,
    state,
    event_start_at: eventStartAt.toISOString(),
    event_end_at: eventEndAt.toISOString(),
    status: 'building',
    is_public: false,
    is_approved: false,
    is_paid: false,
    included_promo_days: 14,
    extra_promo_days: 0,
    base_price: 19.99,
    extra_promo_price: 0,
    linkdn_mode: 'none',
    linkdn_price: 0,
    total_price: 19.99,
    current_step: 1,
  })
  .select('id')
  .single();

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/events/${data.id}/edit/step-2`);
}

export async function updateEventStep2(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');

  const payload = {
  description: String(formData.get('description') || ''),
  dress_code: String(formData.get('dress_code') || ''),
  entry_price: String(formData.get('entry_price') || ''),
  age_requirement: String(formData.get('age_requirement') || ''),
  event_type: String(formData.get('event_type') || ''),
  smoking_policy: String(formData.get('smoking_policy') || ''),
  parking_notes: String(formData.get('parking_notes') || ''),
  special_notes: String(formData.get('special_notes') || ''),
  music_selection: formData.getAll('music_selection').map(String),
  vibe_tags: formData.getAll('vibe_tags').map(String),
  current_step: 2,
  status: 'building',
};

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) throw new Error(error.message);

  redirect(`/dashboard/events/${eventId}/edit/step-3`);
}

export async function updateEventStep3(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');
  const extraPromoDays = Number(formData.get('extra_promo_days') || 0);
  const extraDayPrice = Number(formData.get('extra_day_price') || 0);
  const linkdnMode = String(formData.get('linkdn_mode') || 'none') as 'none' | 'lite' | 'full';

  const linkdnPrice =
    linkdnMode === 'full' ? 49.99 :
    linkdnMode === 'lite' ? 9.99 :
    0;

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('event_start_at, event_end_at, base_price, included_promo_days')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (fetchError || !event) throw new Error(fetchError?.message || 'Event not found');

  const totalPromoDays = Number(event.included_promo_days) + extraPromoDays;
  const extraPromoPrice = Number((extraPromoDays * extraDayPrice).toFixed(2));
  const promotionStartAt = calculatePromotionStart(event.event_start_at, totalPromoDays);
  const promotionEndAt = calculatePromotionEnd(event.event_end_at, event.event_start_at);

  const totalPrice = calculateTotalPrice({
    basePrice: Number(event.base_price),
    extraPromoPrice,
    linkdnPrice,
  });

  const { error } = await supabase
    .from('events')
    .update({
  extra_promo_days: extraPromoDays,
  extra_promo_price: extraPromoPrice,
  promotion_start_at: promotionStartAt.toISOString(),
  promotion_end_at: promotionEndAt.toISOString(),
  linkdn_mode: linkdnMode,
  linkdn_price: linkdnPrice,
  total_price: totalPrice,
  current_step: 3,
  status: 'building',
  is_public: false,
})
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) throw new Error(error.message);

  redirect(`/dashboard/events/${eventId}/review`);
}

export async function submitEventForModeration(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');

  const { error } = await supabase
    .from('events')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      is_public: false,
      current_step: 3,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) throw new Error(error.message);

  redirect('/dashboard?submitted=1');
}

export async function discardDraftEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .in('status', ['draft', 'building', 'rejected']);

  if (error) {
    throw new Error(error.message);
  }

  redirect('/dashboard?draft_deleted=1');
}

export async function requestEventRemoval(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');
  const removalReason = String(formData.get('removal_reason') || '');
  const refundRequested = String(formData.get('refund_requested') || '') === 'yes';

  const { error } = await supabase
    .from('events')
    .update({
      status: 'removal_requested',
      removal_requested_at: new Date().toISOString(),
      removal_reason: removalReason,
      refund_requested: refundRequested,
      is_public: false,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .in('status', ['scheduled', 'live']);

  if (error) {
    throw new Error(error.message);
  }

  redirect('/dashboard?removal_requested=1');
}


export async function updateEventStep1(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');
  const flyerUrl = String(formData.get('flyer_url') || '');
  const eventName = String(formData.get('name') || '');
  const venueName = String(formData.get('venue_name') || '');
  const address = String(formData.get('address') || '');
  const city = String(formData.get('city') || '');
  const state = String(formData.get('state') || '');
  const startDate = String(formData.get('start_date') || '');
  const startTime = String(formData.get('start_time') || '');
  const endDate = String(formData.get('end_date') || '');
  const endTime = String(formData.get('end_time') || '');

  const eventStartAt = new Date(`${startDate}T${startTime}`);
  const eventEndAt =
    endDate && endTime
      ? new Date(`${endDate}T${endTime}`)
      : new Date(`${startDate}T${startTime}`);

  const baseSlug = slugify(`${eventName} ${city} ${state}`);

  const { data: currentEvent, error: currentEventError } = await supabase
    .from('events')
    .select('id, slug, status')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (currentEventError || !currentEvent) {
    throw new Error(currentEventError?.message || 'Event not found');
  }

  if (!['draft', 'building', 'rejected'].includes(currentEvent.status)) {
    redirect('/dashboard');
  }

  const slug = currentEvent.slug || `${baseSlug}-${Date.now()}`;

  const { error } = await supabase
    .from('events')
    .update({
      name: eventName,
      slug,
      flyer_url: flyerUrl,
      venue_name: venueName,
      address,
      city,
      state,
      event_start_at: eventStartAt.toISOString(),
      event_end_at: eventEndAt.toISOString(),
      current_step: 1,
      status: 'building',
      is_public: false,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/events/${eventId}/edit/step-2`);
}