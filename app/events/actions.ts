'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type RsvpStatus = 'interested' | 'going' | 'not_going';
type ShareChannel = 'native_share' | 'copy_link' | 'facebook' | 'instagram' | 'x' | 'sms' | 'email' | 'other';
type ReportCategory = 'incorrect_information' | 'cancelled_event' | 'unsafe_content' | 'spam' | 'duplicate' | 'other';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!user) redirect('/auth/login');
  return { supabase, user };
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function refreshEvent(slug: string) {
  revalidatePath(`/events/${slug}`);
  revalidatePath('/events');
  revalidatePath('/dashboard');
}

export async function toggleEventSave(formData: FormData) {
  const { supabase, user } = await requireUser();
  const eventId = value(formData, 'event_id');
  const slug = value(formData, 'slug');
  if (!eventId || !slug) throw new Error('Missing event information.');

  const { data: existing, error: existingError } = await supabase
    .from('event_saves')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const { error } = await supabase.from('event_saves').delete().eq('id', existing.id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('event_saves').insert({ event_id: eventId, user_id: user.id });
    if (error) throw new Error(error.message);
  }

  refreshEvent(slug);
}

export async function updateEventRsvp(formData: FormData) {
  const { supabase, user } = await requireUser();
  const eventId = value(formData, 'event_id');
  const slug = value(formData, 'slug');
  const status = value(formData, 'status') as RsvpStatus;
  if (!eventId || !slug) throw new Error('Missing event information.');
  if (!['interested', 'going', 'not_going'].includes(status)) throw new Error('Invalid RSVP status.');

  const { error } = await supabase.from('event_rsvps').upsert({
    event_id: eventId,
    user_id: user.id,
    status,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'event_id,user_id' });
  if (error) throw new Error(error.message);
  refreshEvent(slug);
}

export async function recordRecentEventView(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !eventId) return;

  const { data: existing } = await supabase
    .from('event_recent_views')
    .select('id, view_count')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  if (existing) {
    await supabase.from('event_recent_views').update({
      last_viewed_at: nowIso,
      view_count: Number(existing.view_count || 0) + 1,
    }).eq('id', existing.id).eq('user_id', user.id);
    return;
  }

  await supabase.from('event_recent_views').insert({
    event_id: eventId,
    user_id: user.id,
    first_viewed_at: nowIso,
    last_viewed_at: nowIso,
    view_count: 1,
  });
}

export async function recordEventShare(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const eventId = value(formData, 'event_id');
  const channel = value(formData, 'channel') as ShareChannel;
  if (!eventId) throw new Error('Missing event id.');
  if (!['native_share','copy_link','facebook','instagram','x','sms','email','other'].includes(channel)) throw new Error('Invalid share channel.');

  const { error } = await supabase.from('event_shares').insert({
    event_id: eventId,
    user_id: user?.id || null,
    channel,
  });
  if (error) throw new Error(error.message);
}

export async function reportEvent(formData: FormData) {
  const { supabase, user } = await requireUser();
  const eventId = value(formData, 'event_id');
  const slug = value(formData, 'slug');
  const category = value(formData, 'category') as ReportCategory;
  const details = value(formData, 'details');
  if (!eventId || !slug) throw new Error('Missing event information.');
  if (!['incorrect_information','cancelled_event','unsafe_content','spam','duplicate','other'].includes(category)) throw new Error('Invalid report category.');

  const { error } = await supabase.from('event_reports').insert({
    event_id: eventId,
    reporter_id: user.id,
    category,
    details: details || null,
  });
  if (error) throw new Error(error.message);
  refreshEvent(slug);
  redirect(`/events/${slug}?reported=1`);
}


export async function addEventComment(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');
  const eventPath = String(formData.get('event_path') || '/events');
  const body = String(formData.get('body') || '').trim();

  if (!eventId) throw new Error('Missing event id.');
  if (!body) throw new Error('Comment cannot be empty.');
  if (body.length > 500) throw new Error('Comment must be 500 characters or less.');

  const { error } = await supabase.from('event_comments').insert({
    event_id: eventId,
    user_id: user.id,
    body,
    status: 'visible',
  });

  if (error) throw new Error(error.message);

  revalidatePath(eventPath);
}