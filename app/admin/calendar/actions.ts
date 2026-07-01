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