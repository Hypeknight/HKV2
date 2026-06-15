/*'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateTotalPrice } from '@/lib/events/workflow';

function getOwnerType(
  appRole: string | null | undefined
): 'user' | 'venue_owner' | 'admin' {
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

function calculatePromotionWindow({
  eventStartAt,
  includedPromoDays,
  extraPromoDays,
}: {
  eventStartAt: string;
  includedPromoDays: number;
  extraPromoDays: number;
}) {
  const eventDate = new Date(eventStartAt);

  if (Number.isNaN(eventDate.getTime())) {
    throw new Error('Invalid event start date.');
  }

  const eventMidnight = new Date(eventDate);
  eventMidnight.setHours(0, 0, 0, 0);

  const totalPromoDays = Math.max(
    Number(includedPromoDays || 0) + Number(extraPromoDays || 0),
    1
  );

  const promotionStart = new Date(eventMidnight);
  promotionStart.setDate(promotionStart.getDate() - totalPromoDays);

  return {
    promotionStartAt: promotionStart.toISOString(),
    promotionEndAt: eventMidnight.toISOString(),
  };
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
  const eventEndAt =
    endDate && endTime
      ? new Date(`${endDate}T${endTime}`)
      : new Date(`${startDate}T${startTime}`);

  if (Number.isNaN(eventStartAt.getTime())) {
    throw new Error('Invalid event start date.');
  }

  if (Number.isNaN(eventEndAt.getTime())) {
    throw new Error('Invalid event end date.');
  }

  const includedPromoDays = 14;
  const extraPromoDays = 0;

  const { promotionStartAt, promotionEndAt } = calculatePromotionWindow({
    eventStartAt: eventStartAt.toISOString(),
    includedPromoDays,
    extraPromoDays,
  });

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
      promotion_start_at: promotionStartAt,
      promotion_end_at: promotionEndAt,
      status: 'building',
      is_public: false,
      is_approved: false,
      is_paid: false,
      included_promo_days: includedPromoDays,
      extra_promo_days: extraPromoDays,
      base_price: 19.99,
      extra_promo_price: 0,
      linkdn_mode: 'none',
      linkdn_price: 0,
      total_price: 19.99,
      payment_amount: 19.99,
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
  const linkdnMode = String(formData.get('linkdn_mode') || 'none') as
    | 'none'
    | 'lite'
    | 'full';

  const linkdnPrice =
    linkdnMode === 'full' ? 49.99 : linkdnMode === 'lite' ? 9.99 : 0;

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('event_start_at, event_end_at, base_price, included_promo_days')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found');
  }

  const includedPromoDays = Number(event.included_promo_days || 14);
  const totalPromoDays = includedPromoDays + extraPromoDays;

  const extraPromoPrice = Number((extraPromoDays * extraDayPrice).toFixed(2));

  const { promotionStartAt, promotionEndAt } = calculatePromotionWindow({
    eventStartAt: event.event_start_at,
    includedPromoDays,
    extraPromoDays,
  });

  const totalPrice = calculateTotalPrice({
    basePrice: Number(event.base_price || 19.99),
    extraPromoPrice,
    linkdnPrice,
  });

  const { error } = await supabase
    .from('events')
    .update({
      included_promo_days: includedPromoDays,
      extra_promo_days: extraPromoDays,
      extra_promo_price: extraPromoPrice,
      promotion_start_at: promotionStartAt,
      promotion_end_at: promotionEndAt,
      linkdn_mode: linkdnMode,
      linkdn_price: linkdnPrice,
      total_price: totalPrice,
      payment_amount: totalPrice,
      current_step: 3,
      status: 'building',
      is_public: false,
      updated_at: new Date().toISOString(),
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

  if (!eventId) {
    throw new Error('Missing event id');
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      owner_id,
      status,
      is_paid,
      payment_status,
      payment_override,
      total_price,
      payment_amount,
      promotion_start_at,
      promotion_end_at,
      event_start_at,
      event_end_at
    `)
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message || 'Event not found');
  }

  const amountDue = Number(event.payment_amount || event.total_price || 0);

  const isPaid =
    event.is_paid === true ||
    event.payment_status === 'paid' ||
    event.payment_override === true ||
    amountDue <= 0;

  const nextStatus = isPaid ? 'paid_awaiting_approval' : 'NPNA';

  const { error } = await supabase
    .from('events')
    .update({
      status: nextStatus,
      is_public: false,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  if (nextStatus === 'NPNA') {
    redirect(`/dashboard/events/${eventId}/payment`);
  }

  redirect(`/dashboard/events/${eventId}/review?submitted=1`);
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

  const refundStatus = refundRequested ? 'requested' : 'none';

  const { error } = await supabase
  .from('events')
  .update({
    status: 'removal_requested',
    removal_requested_at: new Date().toISOString(),
    removal_reason: removalReason,
    refund_requested: refundRequested,
    refund_status: refundStatus,
    refund_requested_at: refundRequested ? new Date().toISOString() : null,
    refund_reason: refundRequested ? removalReason : null,
    is_public: false,
    updated_at: new Date().toISOString(),
  })
  .eq('id', eventId)
  .eq('owner_id', user.id)
  .in('status', ['scheduled', 'active']);

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

  if (Number.isNaN(eventStartAt.getTime())) {
    throw new Error('Invalid event start date.');
  }

  if (Number.isNaN(eventEndAt.getTime())) {
    throw new Error('Invalid event end date.');
  }

  const baseSlug = slugify(`${eventName} ${city} ${state}`);

  const { data: currentEvent, error: currentEventError } = await supabase
    .from('events')
    .select('id, slug, status, included_promo_days, extra_promo_days')
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

  const includedPromoDays = Number(currentEvent.included_promo_days || 14);
  const extraPromoDays = Number(currentEvent.extra_promo_days || 0);

  const { promotionStartAt, promotionEndAt } = calculatePromotionWindow({
    eventStartAt: eventStartAt.toISOString(),
    includedPromoDays,
    extraPromoDays,
  });

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
      promotion_start_at: promotionStartAt,
      promotion_end_at: promotionEndAt,
      current_step: 1,
      status: 'building',
      is_public: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/events/${eventId}/edit/step-2`);
}*/

'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateTotalPrice } from '@/lib/events/workflow';

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  return { supabase, user };
}

function canEditBeforePromotion(event: any) {
  if (!event.promotion_start_at) return false;

  const now = new Date();
  const promoStart = new Date(event.promotion_start_at);

  return now < promoStart;
}

export async function startEventRevision(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = String(formData.get('event_id') || '');

  if (!eventId) throw new Error('Missing event id.');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, owner_id, status, promotion_start_at')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found.');
  }

  if (event.owner_id !== user.id) {
    throw new Error('You do not have permission to edit this event.');
  }

  if (!['scheduled', 'paid_awaiting_approval', 'active'].includes(event.status)) {
    throw new Error('This event is not eligible for revision.');
  }

  if (!canEditBeforePromotion(event)) {
    throw new Error('This event can no longer be edited because it is inside its promotion window.');
  }

  const { error } = await supabase
    .from('events')
    .update({
      status: 'revision_draft',
      is_public: false,
      original_status_before_revision: event.status,
      revision_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect(`/dashboard/events/${eventId}/edit`);
}

export async function submitEventRevision(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = String(formData.get('event_id') || '');
  const revisionReason = String(formData.get('revision_reason') || '').trim();

  if (!eventId) throw new Error('Missing event id.');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, owner_id, status')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found.');
  }

  if (event.owner_id !== user.id) {
    throw new Error('You do not have permission to submit this revision.');
  }

  if (event.status !== 'revision_draft') {
    throw new Error('This event is not in revision draft status.');
  }

  const { error } = await supabase
    .from('events')
    .update({
      status: 'revision_submitted',
      is_public: false,
      revision_reason: revisionReason || null,
      revision_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/dashboard');
}

export async function requestEventRemovalOrRefund(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = String(formData.get('event_id') || '');
  const removalReason = String(formData.get('removal_reason') || '').trim();
  const refundReason = String(formData.get('refund_reason') || '').trim();
  const wantsRefund = formData.get('wants_refund') === 'on';

  if (!eventId) throw new Error('Missing event id.');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, owner_id, status')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found.');
  }

  if (event.owner_id !== user.id) {
    throw new Error('You do not have permission to request removal.');
  }

  const { error } = await supabase
    .from('events')
    .update({
      status: 'removal_requested',
      is_public: false,
      removal_requested_at: new Date().toISOString(),
      removal_reason: removalReason || null,
      refund_requested: wantsRefund,
      refund_status: wantsRefund ? 'requested' : null,
      refund_requested_at: wantsRefund ? new Date().toISOString() : null,
      refund_reason: wantsRefund ? refundReason || removalReason || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) throw new Error(error.message);

  redirect('/dashboard');
}

function getOwnerType(
  appRole: string | null | undefined
): 'user' | 'venue_owner' | 'admin' {
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

function calculatePromotionWindow({
  eventStartAt,
  includedPromoDays,
  extraPromoDays,
}: {
  eventStartAt: string;
  includedPromoDays: number;
  extraPromoDays: number;
}) {
  const eventDate = new Date(eventStartAt);

  if (Number.isNaN(eventDate.getTime())) {
    throw new Error('Invalid event start date.');
  }

  const eventMidnight = new Date(eventDate);
  eventMidnight.setHours(0, 0, 0, 0);

  const totalPromoDays = Math.max(
    Number(includedPromoDays || 0) + Number(extraPromoDays || 0),
    1
  );

  const promotionStart = new Date(eventMidnight);
  promotionStart.setDate(promotionStart.getDate() - totalPromoDays);

  return {
    promotionStartAt: promotionStart.toISOString(),
    promotionEndAt: eventMidnight.toISOString(),
  };
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

  const eventName = String(formData.get('name') || '').trim();
  const venueName = String(formData.get('venue_name') || '').trim();
  const address = String(formData.get('address') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const startDate = String(formData.get('start_date') || '').trim();
  const startTime = String(formData.get('start_time') || '').trim();
  const endDate = String(formData.get('end_date') || '').trim();
  const endTime = String(formData.get('end_time') || '').trim();
  const flyerUrl = String(formData.get('flyer_url') || '').trim();

  if (!eventName) throw new Error('Event name is required.');
  if (!city) throw new Error('City is required.');
  if (!state) throw new Error('State is required.');
  if (!startDate || !startTime) throw new Error('Event start date and time are required.');

  const baseSlug = slugify(`${eventName} ${city} ${state}`);
  const slug = `${baseSlug}-${Date.now()}`;

  const eventStartAt = new Date(`${startDate}T${startTime}`);
  const eventEndAt =
    endDate && endTime
      ? new Date(`${endDate}T${endTime}`)
      : new Date(`${startDate}T${startTime}`);

  if (Number.isNaN(eventStartAt.getTime())) {
    throw new Error('Invalid event start date.');
  }

  if (Number.isNaN(eventEndAt.getTime())) {
    throw new Error('Invalid event end date.');
  }

  const includedPromoDays = 14;
  const extraPromoDays = 0;

  const { promotionStartAt, promotionEndAt } = calculatePromotionWindow({
    eventStartAt: eventStartAt.toISOString(),
    includedPromoDays,
    extraPromoDays,
  });

  const { data, error } = await supabase
    .from('events')
    .insert({
      owner_id: user.id,
      owner_type: getOwnerType(profile?.app_role),
      name: eventName,
      slug,
      flyer_url: flyerUrl || null,
      venue_name: venueName || null,
      address: address || null,
      city,
      state,
      event_start_at: eventStartAt.toISOString(),
      event_end_at: eventEndAt.toISOString(),
      promotion_start_at: promotionStartAt,
      promotion_end_at: promotionEndAt,
      status: 'building',
      is_public: false,
      is_approved: false,
      is_paid: false,
      included_promo_days: includedPromoDays,
      extra_promo_days: extraPromoDays,
      base_price: 19.99,
      extra_promo_price: 0,
      linkdn_mode: 'none',
      linkdn_price: 0,
      total_price: 19.99,
      payment_amount: 19.99,
      current_step: 1,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  redirect(`/dashboard/events/${data.id}/edit/step-2`);
}

export async function updateEventStep2(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');

  if (!eventId) throw new Error('Missing event id.');

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
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .in('status', ['draft', 'building', 'rejected']);

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
  const linkdnMode = String(formData.get('linkdn_mode') || 'none') as
    | 'none'
    | 'lite'
    | 'full';

  if (!eventId) throw new Error('Missing event id.');

  const linkdnPrice =
    linkdnMode === 'full' ? 49.99 : linkdnMode === 'lite' ? 9.99 : 0;

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('event_start_at, event_end_at, base_price, included_promo_days, status')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found');
  }

  if (!['draft', 'building', 'rejected'].includes(event.status)) {
    redirect('/dashboard');
  }

  const includedPromoDays = Number(event.included_promo_days || 14);
  const extraPromoPrice = Number((extraPromoDays * extraDayPrice).toFixed(2));

  const { promotionStartAt, promotionEndAt } = calculatePromotionWindow({
    eventStartAt: event.event_start_at,
    includedPromoDays,
    extraPromoDays,
  });

  const totalPrice = calculateTotalPrice({
    basePrice: Number(event.base_price || 19.99),
    extraPromoPrice,
    linkdnPrice,
  });

  const { error } = await supabase
    .from('events')
    .update({
      included_promo_days: includedPromoDays,
      extra_promo_days: extraPromoDays,
      extra_promo_price: extraPromoPrice,
      promotion_start_at: promotionStartAt,
      promotion_end_at: promotionEndAt,
      linkdn_mode: linkdnMode,
      linkdn_price: linkdnPrice,
      total_price: totalPrice,
      payment_amount: totalPrice,
      current_step: 3,
      status: 'building',
      is_public: false,
      updated_at: new Date().toISOString(),
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

  if (!eventId) throw new Error('Missing event id.');

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      owner_id,
      status,
      is_paid,
      payment_status,
      payment_override,
      total_price,
      payment_amount,
      promotion_start_at,
      promotion_end_at,
      event_start_at,
      event_end_at
    `)
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message || 'Event not found');
  }

  const amountDue = Number(event.payment_amount || event.total_price || 0);

  const isPaid =
    event.is_paid === true ||
    event.payment_status === 'paid' ||
    event.payment_override === true ||
    amountDue <= 0;

  const nextStatus = isPaid ? 'paid_awaiting_approval' : 'NPNA';

  const { error } = await supabase
    .from('events')
    .update({
      status: nextStatus,
      is_public: false,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) throw new Error(error.message);

  if (nextStatus === 'NPNA') {
    redirect(`/dashboard/events/${eventId}/payment`);
  }

  redirect(`/dashboard/events/${eventId}/review?submitted=1`);
}

export async function discardDraftEvent(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');

  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .in('status', ['draft', 'building', 'rejected']);

  if (error) throw new Error(error.message);

  redirect('/dashboard?draft_deleted=1');
}

export async function requestEventRemoval(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');
  const removalReason = String(formData.get('removal_reason') || '').trim();
  const refundRequested = String(formData.get('refund_requested') || '') === 'yes';

  if (!eventId) throw new Error('Missing event id.');

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('events')
    .update({
      status: 'removal_requested',
      removal_requested_at: nowIso,
      removal_reason: removalReason || null,
      refund_requested: refundRequested,
      refund_status: refundRequested ? 'requested' : 'none',
      refund_requested_at: refundRequested ? nowIso : null,
      refund_reason: refundRequested ? removalReason || null : null,
      is_public: false,
      updated_at: nowIso,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .in('status', ['scheduled', 'active', 'live']);

  if (error) throw new Error(error.message);

  redirect('/dashboard/payments?removal_requested=1');
}

export async function updateEventStep1(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');
  const flyerUrl = String(formData.get('flyer_url') || '').trim();
  const eventName = String(formData.get('name') || '').trim();
  const venueName = String(formData.get('venue_name') || '').trim();
  const address = String(formData.get('address') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const startDate = String(formData.get('start_date') || '').trim();
  const startTime = String(formData.get('start_time') || '').trim();
  const endDate = String(formData.get('end_date') || '').trim();
  const endTime = String(formData.get('end_time') || '').trim();

  if (!eventId) throw new Error('Missing event id.');
  if (!eventName) throw new Error('Event name is required.');
  if (!city) throw new Error('City is required.');
  if (!state) throw new Error('State is required.');
  if (!startDate || !startTime) throw new Error('Event start date and time are required.');

  const eventStartAt = new Date(`${startDate}T${startTime}`);
  const eventEndAt =
    endDate && endTime
      ? new Date(`${endDate}T${endTime}`)
      : new Date(`${startDate}T${startTime}`);

  if (Number.isNaN(eventStartAt.getTime())) {
    throw new Error('Invalid event start date.');
  }

  if (Number.isNaN(eventEndAt.getTime())) {
    throw new Error('Invalid event end date.');
  }

  const baseSlug = slugify(`${eventName} ${city} ${state}`);

  const { data: currentEvent, error: currentEventError } = await supabase
    .from('events')
    .select('id, slug, status, included_promo_days, extra_promo_days')
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

  const includedPromoDays = Number(currentEvent.included_promo_days || 14);
  const extraPromoDays = Number(currentEvent.extra_promo_days || 0);

  const { promotionStartAt, promotionEndAt } = calculatePromotionWindow({
    eventStartAt: eventStartAt.toISOString(),
    includedPromoDays,
    extraPromoDays,
  });

  const { error } = await supabase
    .from('events')
    .update({
      name: eventName,
      slug,
      flyer_url: flyerUrl || null,
      venue_name: venueName || null,
      address: address || null,
      city,
      state,
      event_start_at: eventStartAt.toISOString(),
      event_end_at: eventEndAt.toISOString(),
      promotion_start_at: promotionStartAt,
      promotion_end_at: promotionEndAt,
      current_step: 1,
      status: 'building',
      is_public: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) throw new Error(error.message);

  redirect(`/dashboard/events/${eventId}/edit/step-2`);
}