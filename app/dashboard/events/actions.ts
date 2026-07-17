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

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateTotalPrice } from '@/lib/events/workflow';
import { getPlatformSettings } from '@/lib/settings';
import { transitionEventStatus } from '@/lib/events/transition';

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) redirect('/auth/login');

  return { supabase, user };
}

function cleanText(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function canEditBeforePromotion(event: {
  promotion_start_at?: string | null;
}) {
  if (!event.promotion_start_at) return false;

  const promoStart = new Date(event.promotion_start_at);

  if (Number.isNaN(promoStart.getTime())) {
    return false;
  }

  return new Date() < promoStart;
}

function refreshOwnerEventPaths(eventId: string) {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/events');
  revalidatePath(`/dashboard/events/${eventId}/review`);
  revalidatePath(`/dashboard/events/${eventId}/edit`);
  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath('/events');
}

export async function startEventRevision(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = cleanText(formData, 'event_id');

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

  if (!['scheduled', 'active', 'live'].includes(event.status)) {
    throw new Error('This event is not eligible for revision.');
  }

  if (!canEditBeforePromotion(event)) {
    throw new Error(
      'This event can no longer be edited because it is inside its promotion window.'
    );
  }

  const originalStatus = event.status;
  const nowIso = new Date().toISOString();

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'owner',
    toStatus: 'revision_draft',
    source: 'owner_action',
    note: 'Owner opened the event for revision.',
    metadata: {
      action: 'start_event_revision',
      original_status: originalStatus,
    },
    updates: {
      isPublic: false,
    },
  });

  const { error: revisionError } = await supabase
    .from('events')
    .update({
      original_status_before_revision: originalStatus,
      revision_requested_at: nowIso,
      revision_admin_note: null,
      updated_at: nowIso,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (revisionError) throw new Error(revisionError.message);

  refreshOwnerEventPaths(eventId);
  redirect(`/dashboard/events/${eventId}/edit`);
}

export async function submitEventRevision(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = cleanText(formData, 'event_id');
  const revisionReason = cleanText(formData, 'revision_reason');

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
    throw new Error('This event is not in revision draft.');
  }

  const nowIso = new Date().toISOString();

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'owner',
    toStatus: 'revision_submitted',
    source: 'owner_action',
    reason: revisionReason || null,
    note: 'Owner submitted an event revision for review.',
    metadata: {
      action: 'submit_event_revision',
    },
    updates: {
      isPublic: false,
    },
  });

  const { error: revisionError } = await supabase
    .from('events')
    .update({
      revision_reason: revisionReason || null,
      revision_submitted_at: nowIso,
      revision_admin_note: null,
      updated_at: nowIso,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (revisionError) throw new Error(revisionError.message);

  refreshOwnerEventPaths(eventId);
  redirect(`/dashboard/events/${eventId}/review?revision=submitted`);
}

export async function requestEventRemovalOrRefund(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = cleanText(formData, 'event_id');
  const removalReason = cleanText(formData, 'removal_reason');
  const refundReason = cleanText(formData, 'refund_reason');
  const wantsRefund = formData.get('wants_refund') === 'on';

  if (!eventId) throw new Error('Missing event id.');

  if (!removalReason) {
    throw new Error('A removal-request reason is required.');
  }

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

  const nowIso = new Date().toISOString();

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'owner',
    toStatus: 'removal_requested',
    source: 'owner_action',
    reason: removalReason,
    note: wantsRefund
      ? 'Owner requested event removal and refund review.'
      : 'Owner requested event removal.',
    metadata: {
      action: 'request_event_removal_or_refund',
      wants_refund: wantsRefund,
      refund_reason: wantsRefund
        ? refundReason || removalReason
        : null,
    },
    updates: {
      isPublic: false,
    },
  });

  const { error: requestError } = await supabase
    .from('events')
    .update({
      removal_requested_at: nowIso,
      removal_reason: removalReason,
      refund_requested: wantsRefund,
      refund_status: wantsRefund ? 'requested' : null,
      refund_requested_at: wantsRefund ? nowIso : null,
      refund_reason: wantsRefund
        ? refundReason || removalReason
        : null,
      updated_at: nowIso,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (requestError) throw new Error(requestError.message);

  refreshOwnerEventPaths(eventId);
  redirect('/dashboard?removal_requested=1');
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

  const eventName = cleanText(formData, 'name');
  const venueName = cleanText(formData, 'venue_name');
  const address = cleanText(formData, 'address');
  const city = cleanText(formData, 'city');
  const state = cleanText(formData, 'state');
  const startDate = cleanText(formData, 'start_date');
  const startTime = cleanText(formData, 'start_time');
  const endDate = cleanText(formData, 'end_date');
  const endTime = cleanText(formData, 'end_time');
  const flyerUrl = cleanText(formData, 'flyer_url');

  if (!eventName) throw new Error('Event name is required.');
  if (!city) throw new Error('City is required.');
  if (!state) throw new Error('State is required.');
  if (!startDate || !startTime) {
    throw new Error('Event start date and time are required.');
  }

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

  const settings = await getPlatformSettings();

  const includedPromoDays = Number(settings.included_promo_days || 14);
  const extraPromoDays = 0;
  const basePrice = Number(settings.event_base_price || 19.99);

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
      base_price: basePrice,
      extra_promo_price: 0,
      linkdn_mode: 'none',
      linkdn_price: 0,
      total_price: basePrice,
      payment_amount: basePrice,
      current_step: 1,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  redirect(`/dashboard/events/${data.id}/edit/step-2`);
}

export async function updateEventStep2(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = cleanText(formData, 'event_id');

  if (!eventId) throw new Error('Missing event id.');

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, owner_id, status')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found.');
  }

  if (!['draft', 'building', 'rejected', 'revision_draft'].includes(event.status)) {
    throw new Error('This event cannot be edited at its current status.');
  }

  if (event.status === 'draft' || event.status === 'rejected') {
    await transitionEventStatus({
      supabase,
      eventId,
      actorId: user.id,
      actor: 'owner',
      toStatus: 'building',
      source: 'owner_action',
      note: 'Owner resumed building the event.',
      metadata: {
        action: 'resume_event_builder_step_2',
      },
      updates: {
        isApproved: false,
        isPublic: false,
        hiddenByAdmin: false,
      },
    });
  }

  const eventTypes = formData
    .getAll('event_type')
    .map(String)
    .filter(Boolean);
  const musicSelection = formData
    .getAll('music_selection')
    .map(String)
    .filter(Boolean);
  const vibeTags = formData
    .getAll('vibe_tags')
    .map(String)
    .filter(Boolean);
  const amenities = formData
    .getAll('amenities')
    .map(String)
    .filter(Boolean);

  const payload = {
    description: cleanText(formData, 'description') || null,
    dress_code: cleanText(formData, 'dress_code') || null,
    entry_price: cleanText(formData, 'entry_price') || null,
    age_requirement: cleanText(formData, 'age_requirement') || null,
    event_type: eventTypes.length ? eventTypes.join(', ') : null,
    smoking_policy: cleanText(formData, 'smoking_policy') || null,
    parking_notes: cleanText(formData, 'parking_notes') || null,
    special_notes: cleanText(formData, 'special_notes') || null,
    music_selection: musicSelection,
    vibe_tags: vibeTags,
    amenities,
    current_step: 2,
    is_public: false,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) throw new Error(error.message);

  refreshOwnerEventPaths(eventId);
  redirect(`/dashboard/events/${eventId}/edit/step-3`);
}

export async function updateEventStep3(formData: FormData) {
  const { supabase, user } = await requireUser();
  const settings = await getPlatformSettings();

  const eventId = cleanText(formData, 'event_id');
  const extraPromoDays = Number(formData.get('extra_promo_days') || 0);
  const linkdnMode = String(formData.get('linkdn_mode') || 'none') as
    | 'none'
    | 'lite'
    | 'full';

  if (!eventId) throw new Error('Missing event id.');

  const basePrice = Number(settings.event_base_price || 19.99);
  const includedPromoDays = Number(settings.included_promo_days || 14);
  const extraDayPrice = Number(settings.extra_promo_day_price || 2.5);

  const linkLiteEnabled = Boolean(settings.enable_link_lite);
  const fullLinkEnabled = Boolean(settings.enable_full_link);
  const litePrice = Number(settings.link_lite_price || 9.99);
  const fullPrice = Number(settings.full_link_price || 49.99);

  if (linkdnMode === 'lite' && !linkLiteEnabled) {
    throw new Error('Link Lite is currently disabled.');
  }

  if (linkdnMode === 'full' && !fullLinkEnabled) {
    throw new Error('Full Link is currently disabled.');
  }

  const linkdnPrice =
    linkdnMode === 'full'
      ? fullPrice
      : linkdnMode === 'lite'
        ? litePrice
        : 0;

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('event_start_at, event_end_at, status')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (fetchError || !event) {
    throw new Error(fetchError?.message || 'Event not found.');
  }

  if (!['draft', 'building', 'rejected'].includes(event.status)) {
    redirect('/dashboard');
  }

  if (event.status === 'draft' || event.status === 'rejected') {
    await transitionEventStatus({
      supabase,
      eventId,
      actorId: user.id,
      actor: 'owner',
      toStatus: 'building',
      source: 'owner_action',
      note: 'Owner resumed building the event.',
      metadata: {
        action: 'resume_event_builder_step_3',
      },
      updates: {
        isApproved: false,
        isPublic: false,
        hiddenByAdmin: false,
      },
    });
  }

  const extraPromoPrice = Number(
    (extraPromoDays * extraDayPrice).toFixed(2)
  );

  const { promotionStartAt, promotionEndAt } = calculatePromotionWindow({
    eventStartAt: event.event_start_at,
    includedPromoDays,
    extraPromoDays,
  });

  const totalPrice = calculateTotalPrice({
    basePrice,
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
      base_price: basePrice,
      linkdn_mode: linkdnMode,
      linkdn_price: linkdnPrice,
      total_price: totalPrice,
      payment_amount: totalPrice,
      current_step: 3,
      is_public: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) throw new Error(error.message);

  refreshOwnerEventPaths(eventId);
  redirect(`/dashboard/events/${eventId}/review`);
}

export async function submitEventForModeration(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = cleanText(formData, 'event_id');

  if (!eventId) throw new Error('Missing event id.');

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      owner_id,
      status,
      name,
      event_start_at,
      is_paid,
      payment_status,
      payment_override,
      total_price,
      payment_amount
    `)
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message || 'Event not found.');
  }

  if (!event.name?.trim()) {
    throw new Error('An event name is required before submission.');
  }

  if (!event.event_start_at) {
    throw new Error('An event start date is required before submission.');
  }

  const amountDue = Number(event.payment_amount ?? event.total_price ?? 0);

  const financiallyEligible =
    event.is_paid === true ||
    event.payment_status === 'paid' ||
    event.payment_override === true ||
    amountDue <= 0;

  const nowIso = new Date().toISOString();

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'owner',
    toStatus: 'submitted',
    source: 'owner_action',
    note: 'Owner submitted the event for HypeKnight moderation.',
    metadata: {
      action: 'submit_event_for_moderation',
      amount_due: amountDue,
      financially_eligible: financiallyEligible,
    },
    updates: {
      isApproved: false,
      isPublic: false,
      hiddenByAdmin: false,
    },
  });

  const { error: submittedError } = await supabase
    .from('events')
    .update({
      submitted_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (submittedError) throw new Error(submittedError.message);

  refreshOwnerEventPaths(eventId);

  if (!financiallyEligible) {
    redirect(`/dashboard/events/${eventId}/payment`);
  }

  redirect(`/dashboard/events/${eventId}/review?submitted=1`);
}

export async function discardDraftEvent(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = cleanText(formData, 'event_id');

  if (!eventId) throw new Error('Missing event id.');

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .in('status', ['draft', 'building', 'rejected']);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/events');
  redirect('/dashboard?draft_deleted=1');
}

export async function requestEventRemoval(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = cleanText(formData, 'event_id');
  const removalReason = cleanText(formData, 'removal_reason');
  const refundRequested =
    cleanText(formData, 'refund_requested') === 'yes';

  if (!eventId) throw new Error('Missing event id.');

  if (!removalReason) {
    throw new Error('A removal-request reason is required.');
  }

  const nowIso = new Date().toISOString();

  await transitionEventStatus({
    supabase,
    eventId,
    actorId: user.id,
    actor: 'owner',
    toStatus: 'removal_requested',
    source: 'owner_action',
    reason: removalReason,
    note: refundRequested
      ? 'Owner requested event removal and refund review.'
      : 'Owner requested event removal.',
    metadata: {
      action: 'request_event_removal',
      refund_requested: refundRequested,
    },
    updates: {
      isPublic: false,
    },
  });

  const { error: requestError } = await supabase
    .from('events')
    .update({
      removal_requested_at: nowIso,
      removal_reason: removalReason,
      refund_requested: refundRequested,
      refund_status: refundRequested ? 'requested' : 'none',
      refund_requested_at: refundRequested ? nowIso : null,
      refund_reason: refundRequested ? removalReason : null,
      updated_at: nowIso,
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (requestError) throw new Error(requestError.message);

  refreshOwnerEventPaths(eventId);
  redirect('/dashboard/payments?removal_requested=1');
}

export async function updateEventStep1(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = cleanText(formData, 'event_id');
  const flyerUrl = cleanText(formData, 'flyer_url');
  const eventName = cleanText(formData, 'name');
  const venueName = cleanText(formData, 'venue_name');
  const address = cleanText(formData, 'address');
  const city = cleanText(formData, 'city');
  const state = cleanText(formData, 'state');
  const startDate = cleanText(formData, 'start_date');
  const startTime = cleanText(formData, 'start_time');
  const endDate = cleanText(formData, 'end_date');
  const endTime = cleanText(formData, 'end_time');

  if (!eventId) throw new Error('Missing event id.');
  if (!eventName) throw new Error('Event name is required.');
  if (!city) throw new Error('City is required.');
  if (!state) throw new Error('State is required.');
  if (!startDate || !startTime) {
    throw new Error('Event start date and time are required.');
  }

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
    throw new Error(currentEventError?.message || 'Event not found.');
  }

  if (!['draft', 'building', 'rejected'].includes(currentEvent.status)) {
    redirect('/dashboard');
  }

  if (currentEvent.status === 'draft' || currentEvent.status === 'rejected') {
    await transitionEventStatus({
      supabase,
      eventId,
      actorId: user.id,
      actor: 'owner',
      toStatus: 'building',
      source: 'owner_action',
      note: 'Owner resumed building the event.',
      metadata: {
        action: 'resume_event_builder_step_1',
      },
      updates: {
        isApproved: false,
        isPublic: false,
        hiddenByAdmin: false,
      },
    });
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
      is_public: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) throw new Error(error.message);

  refreshOwnerEventPaths(eventId);
  redirect(`/dashboard/events/${eventId}/edit/step-2`);
}


export async function duplicateEvent(
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  const settings = await getPlatformSettings();

  const sourceEventId = cleanText(
    formData,
    'event_id'
  );

  const copyFlyer =
    cleanText(formData, 'copy_flyer') !== 'no';

  if (!sourceEventId) {
    throw new Error('Missing event id.');
  }

  /*
   * Only select fields already used by the current
   * HypeKnight event builder and events schema.
   *
   * image_url, venue_id, cover_charge, ticket_url,
   * website_url, instagram_url, and facebook_url
   * are intentionally excluded because they may not
   * exist in the current events table.
   */
  const { data: sourceEvent, error: sourceError } =
    await supabase
      .from('events')
      .select(`
        id,
        owner_id,
        owner_type,
        name,
        flyer_url,
        venue_name,
        address,
        city,
        state,
        event_start_at,
        event_end_at,
        description,
        event_type,
        music_selection,
        vibe_tags,
        amenities,
        dress_code,
        entry_price,
        age_requirement,
        smoking_policy,
        parking_notes,
        special_notes
      `)
      .eq('id', sourceEventId)
      .eq('owner_id', user.id)
      .single();

  if (sourceError || !sourceEvent) {
    throw new Error(
      sourceError?.message ||
        'Source event not found.'
    );
  }

  if (!sourceEvent.event_start_at) {
    throw new Error(
      'The source event does not have a valid start date.'
    );
  }

  const duplicateName = `${String(
    sourceEvent.name || 'Untitled Event'
  ).trim()} Copy`;

  const baseSlug = slugify(
    `${duplicateName} ${
      sourceEvent.city || ''
    } ${sourceEvent.state || ''}`
  );

  const duplicateSlug = `${
    baseSlug || 'event-copy'
  }-${Date.now()}`;

  /*
   * event_start_at is currently required by the database,
   * so the source dates are copied temporarily.
   * The owner is redirected to step 1 and should choose
   * the new event dates before submission.
   */
  const eventStartAt = sourceEvent.event_start_at;
  const eventEndAt =
    sourceEvent.event_end_at ||
    sourceEvent.event_start_at;

  const includedPromoDays = Number(
    settings.included_promo_days || 14
  );

  const basePrice = Number(
    settings.event_base_price || 19.99
  );

  const extraPromoDays = 0;
  const extraPromoPrice = 0;
  const linkdnPrice = 0;

  const {
    promotionStartAt,
    promotionEndAt,
  } = calculatePromotionWindow({
    eventStartAt,
    includedPromoDays,
    extraPromoDays,
  });

  const nowIso = new Date().toISOString();

  const { data: duplicatedEvent, error } =
    await supabase
      .from('events')
      .insert({
        owner_id: user.id,
        owner_type:
          sourceEvent.owner_type || 'user',

        name: duplicateName,
        slug: duplicateSlug,

        flyer_url: copyFlyer
          ? sourceEvent.flyer_url || null
          : null,

        venue_name:
          sourceEvent.venue_name || null,
        address: sourceEvent.address || null,
        city: sourceEvent.city || null,
        state: sourceEvent.state || null,

        /*
         * Temporarily copy the source dates to satisfy
         * current NOT NULL constraints.
         */
        event_start_at: eventStartAt,
        event_end_at: eventEndAt,

        description:
          sourceEvent.description || null,
        event_type:
          sourceEvent.event_type || null,

        music_selection: Array.isArray(
          sourceEvent.music_selection
        )
          ? sourceEvent.music_selection
          : [],

        vibe_tags: Array.isArray(
          sourceEvent.vibe_tags
        )
          ? sourceEvent.vibe_tags
          : [],

        amenities: Array.isArray(
          sourceEvent.amenities
        )
          ? sourceEvent.amenities
          : [],

        dress_code:
          sourceEvent.dress_code || null,
        entry_price:
          sourceEvent.entry_price || null,
        age_requirement:
          sourceEvent.age_requirement || null,
        smoking_policy:
          sourceEvent.smoking_policy || null,
        parking_notes:
          sourceEvent.parking_notes || null,
        special_notes:
          sourceEvent.special_notes || null,

        promotion_start_at: promotionStartAt,
        promotion_end_at: promotionEndAt,

        status: 'draft',
        current_step: 0,

        is_public: false,
        is_approved: false,
        is_paid: false,
        payment_override: false,
        payment_status: 'unpaid',

        included_promo_days: includedPromoDays,
        extra_promo_days: extraPromoDays,
        base_price: basePrice,
        extra_promo_price: extraPromoPrice,

        linkdn_mode: 'none',
        linkdn_price: linkdnPrice,

        total_price: basePrice,
        payment_amount: basePrice,

        submitted_at: null,

        approved_at: null,
        approved_by: null,

        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,

        original_status_before_revision: null,
        revision_requested_at: null,
        revision_submitted_at: null,
        revision_reason: null,
        revision_admin_note: null,

        removal_requested_at: null,
        removal_reason: null,

        refund_requested: false,
        refund_status: null,
        refund_requested_at: null,
        refund_reason: null,

        hidden_by_admin: false,
        admin_featured: false,
        admin_notes: null,
        admin_refund_note: null,

        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id')
      .single();

  if (error || !duplicatedEvent) {
    throw new Error(
      error?.message ||
        'Unable to duplicate the event.'
    );
  }

  /*
   * Record the creation directly because the new event
   * is already in draft status. Calling a draft → draft
   * transition may be rejected by the transition engine.
   *
   * Logging failure should not delete an otherwise valid
   * duplicated event.
   */
  const { error: historyError } = await supabase
    .from('event_status_history')
    .insert({
      event_id: duplicatedEvent.id,
      from_status: null,
      to_status: 'draft',
      changed_by: user.id,
      changed_by_role: 'owner',
      reason:
        'Event duplicated from an existing listing.',
      note:
        'Choose new dates before submitting this copied event.',
      source: 'owner_action',
      metadata: {
        action: 'duplicate_event',
        source_event_id: sourceEventId,
        copied_flyer: copyFlyer,
      },
      created_at: nowIso,
    });

  if (historyError) {
    console.error(
      'Duplicated event created, but lifecycle history insert failed:',
      historyError.message
    );
  }

  refreshOwnerEventPaths(
    duplicatedEvent.id
  );

  revalidatePath(
    `/dashboard/events/${sourceEventId}/review`
  );

  redirect(
    `/dashboard/events/${duplicatedEvent.id}/edit/step-1?duplicated=1`
  );
}
export async function updateEventRevision(formData: FormData) {
  const { supabase, user } = await requireUser();

  const eventId = cleanText(formData, 'event_id');

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
    throw new Error('You do not have permission to edit this event.');
  }

  if (event.status !== 'revision_draft') {
    throw new Error('This event is not open for revision editing.');
  }

  const flyerFile = formData.get('flyer_file') as File | null;
  let flyerUrl = cleanText(formData, 'flyer_url') || null;

  if (flyerFile && flyerFile.size > 0) {
    const fileExt = flyerFile.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/${eventId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('event-flyers')
      .upload(filePath, flyerFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage
      .from('event-flyers')
      .getPublicUrl(filePath);

    flyerUrl = publicUrlData.publicUrl;
  }

  const musicSelection = formData
    .getAll('music_selection')
    .map(String)
    .filter(Boolean);
  const vibeTags = formData
    .getAll('vibe_tags')
    .map(String)
    .filter(Boolean);

  const payload = {
    name: cleanText(formData, 'name'),
    venue_name: cleanText(formData, 'venue_name') || null,
    address: cleanText(formData, 'address') || null,
    city: cleanText(formData, 'city') || null,
    state: cleanText(formData, 'state').toUpperCase() || null,
    event_start_at: cleanText(formData, 'event_start_at') || null,
    event_end_at: cleanText(formData, 'event_end_at') || null,
    flyer_url: flyerUrl,

    description: cleanText(formData, 'description') || null,
    dress_code: cleanText(formData, 'dress_code') || null,
    entry_price: cleanText(formData, 'entry_price') || null,
    age_requirement: cleanText(formData, 'age_requirement') || null,
    event_type: cleanText(formData, 'event_type') || null,
    music_selection: musicSelection,
    vibe_tags: vibeTags,
    smoking_policy: cleanText(formData, 'smoking_policy') || null,
    parking_notes: cleanText(formData, 'parking_notes') || null,
    special_notes: cleanText(formData, 'special_notes') || null,
    revision_reason: cleanText(formData, 'revision_reason') || null,
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) throw new Error('Event name is required.');

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .eq('status', 'revision_draft');

  if (error) throw new Error(error.message);

  refreshOwnerEventPaths(eventId);
  redirect(`/dashboard/events/${eventId}/edit`);
}