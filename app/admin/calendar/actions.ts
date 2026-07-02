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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export async function createSpecialDay(formData: FormData) {
  const { supabase } = await requireAdmin();

  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const category = String(formData.get('category') || 'holiday').trim();
  const startsOn = String(formData.get('starts_on') || '').trim();
  const endsOn = String(formData.get('ends_on') || '').trim();
  const isFeatured = formData.get('is_featured') === 'on';
  const isActive = formData.get('is_active') === 'on';

  if (!name) throw new Error('Special day name is required.');
  if (!startsOn) throw new Error('Start date is required.');

  const slug = slugify(name);

  const { error } = await supabase.from('special_days').insert({
    name,
    slug,
    description: description || null,
    category,
    starts_on: startsOn,
    ends_on: endsOn || null,
    is_featured: isFeatured,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);

  redirect('/admin/calendar?created=1');
}

export async function updateSpecialDay(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get('id') || '');
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const category = String(formData.get('category') || 'holiday').trim();
  const startsOn = String(formData.get('starts_on') || '').trim();
  const endsOn = String(formData.get('ends_on') || '').trim();
  const isFeatured = formData.get('is_featured') === 'on';
  const isActive = formData.get('is_active') === 'on';

  if (!id) throw new Error('Missing special day id.');
  if (!name) throw new Error('Special day name is required.');
  if (!startsOn) throw new Error('Start date is required.');

  const { error } = await supabase
    .from('special_days')
    .update({
      name,
      slug: slugify(name),
      description: description || null,
      category,
      starts_on: startsOn,
      ends_on: endsOn || null,
      is_featured: isFeatured,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);

  redirect(`/admin/calendar/${id}?updated=1`);
}

export async function deleteSpecialDay(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get('id') || '');
  if (!id) throw new Error('Missing special day id.');

  const { error } = await supabase.from('special_days').delete().eq('id', id);

  if (error) throw new Error(error.message);

  redirect('/admin/calendar?deleted=1');
}

export async function assignEventToSpecialDay(formData: FormData) {
  const { supabase } = await requireAdmin();

  const specialDayId = String(formData.get('special_day_id') || '');
  const sourceType = String(formData.get('source_type') || '');
  const eventId = String(formData.get('event_id') || '');

  if (!specialDayId || !sourceType || !eventId) {
    throw new Error('Missing assignment data.');
  }

  if (!['hypeknight', 'external'].includes(sourceType)) {
    throw new Error('Invalid event source type.');
  }

  const payload =
    sourceType === 'hypeknight'
      ? {
          special_day_id: specialDayId,
          source_type: sourceType,
          event_id: eventId,
          external_event_id: null,
        }
      : {
          special_day_id: specialDayId,
          source_type: sourceType,
          event_id: null,
          external_event_id: eventId,
        };

  const { error } = await supabase
    .from('special_day_events')
    .upsert(payload, {
      onConflict:
        sourceType === 'hypeknight'
          ? 'special_day_id,event_id'
          : 'special_day_id,external_event_id',
    });

  if (error) throw new Error(error.message);

  redirect(`/admin/calendar/${specialDayId}?assigned=1`);
}

export async function removeEventFromSpecialDay(formData: FormData) {
  const { supabase } = await requireAdmin();

  const specialDayId = String(formData.get('special_day_id') || '');
  const sourceType = String(formData.get('source_type') || '');
  const eventId = String(formData.get('event_id') || '');

  if (!specialDayId || !sourceType || !eventId) {
    throw new Error('Missing assignment data.');
  }

  let query = supabase
    .from('special_day_events')
    .delete()
    .eq('special_day_id', specialDayId)
    .eq('source_type', sourceType);

  if (sourceType === 'hypeknight') {
    query = query.eq('event_id', eventId);
  } else {
    query = query.eq('external_event_id', eventId);
  }

  const { error } = await query;

  if (error) throw new Error(error.message);

  redirect(`/admin/calendar/${specialDayId}?removed=1`);
}