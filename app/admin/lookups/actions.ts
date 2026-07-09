'use server';

import { revalidatePath } from 'next/cache';
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

  return { supabase };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function intValue(formData: FormData, key: string, fallback = 100) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

export async function createLookupValue(formData: FormData) {
  const { supabase } = await requireAdmin();

  const categoryKey = text(formData, 'category_key');
  const displayName = text(formData, 'display_name');
  const value = text(formData, 'value') || displayName;

  if (!categoryKey || !displayName) {
    throw new Error('Category and display name are required.');
  }

  const { error } = await supabase.from('lookup_values').insert({
    category_key: categoryKey,
    value,
    display_name: displayName,
    description: text(formData, 'description') || null,
    icon: text(formData, 'icon') || null,
    color: text(formData, 'color') || null,
    sort_order: intValue(formData, 'sort_order', 100),
    is_active: bool(formData, 'is_active'),
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);

  revalidatePath('/admin/lookups');
  redirect(`/admin/lookups?category=${categoryKey}&saved=1`);
}

export async function updateLookupValue(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = text(formData, 'id');
  const categoryKey = text(formData, 'category_key');

  if (!id || !categoryKey) throw new Error('Missing lookup value.');

  const { error } = await supabase
    .from('lookup_values')
    .update({
      value: text(formData, 'value'),
      display_name: text(formData, 'display_name'),
      description: text(formData, 'description') || null,
      icon: text(formData, 'icon') || null,
      color: text(formData, 'color') || null,
      sort_order: intValue(formData, 'sort_order', 100),
      is_active: bool(formData, 'is_active'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/lookups');
  redirect(`/admin/lookups?category=${categoryKey}&saved=1`);
}

export async function toggleLookupValue(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = text(formData, 'id');
  const categoryKey = text(formData, 'category_key');
  const isActive = text(formData, 'is_active') === 'true';

  if (!id || !categoryKey) throw new Error('Missing lookup value.');

  const { error } = await supabase
    .from('lookup_values')
    .update({
      is_active: !isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/lookups');
  redirect(`/admin/lookups?category=${categoryKey}&saved=1`);
}