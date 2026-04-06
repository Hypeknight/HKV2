'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';

async function requireEditor() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase.from('profiles').select('app_role').eq('id', user.id).maybeSingle();

  if (!profile || !['admin', 'venue_owner'].includes(profile.app_role)) {
    redirect('/dashboard');
  }

  return { supabase, user, role: profile.app_role };
}

export async function createVenue(formData: FormData) {
  const { supabase, user } = await requireEditor();
  const name = String(formData.get('name') || '');
  const city = String(formData.get('city') || '');
  const state = String(formData.get('state') || '');

  const payload = {
    owner_id: user.id,
    name,
    slug: slugify(name),
    city,
    state,
    description: String(formData.get('description') || ''),
    address: String(formData.get('address') || ''),
    website_url: String(formData.get('website_url') || ''),
    instagram_url: String(formData.get('instagram_url') || ''),
    cover_image_url: String(formData.get('cover_image_url') || ''),
    is_featured: formData.get('is_featured') === 'on',
    status: String(formData.get('status') || 'draft')
  };

  const { error } = await supabase.from('venues').insert(payload);
  if (error) redirect(`/admin/venues/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/venues');
  redirect('/admin?created=venue');
}

export async function createEvent(formData: FormData) {
  const { supabase, user } = await requireEditor();
  const name = String(formData.get('name') || '');

  const payload = {
    venue_id: String(formData.get('venue_id') || ''),
    created_by: user.id,
    name,
    slug: slugify(name),
    excerpt: String(formData.get('excerpt') || ''),
    description: String(formData.get('description') || ''),
    city: String(formData.get('city') || ''),
    state: String(formData.get('state') || ''),
    address: String(formData.get('address') || ''),
    start_at: String(formData.get('start_at') || ''),
    end_at: String(formData.get('end_at') || '') || null,
    age_requirement: String(formData.get('age_requirement') || ''),
    ticket_url: String(formData.get('ticket_url') || ''),
    cover_image_url: String(formData.get('cover_image_url') || ''),
    price_min: formData.get('price_min') ? Number(formData.get('price_min')) : null,
    price_max: formData.get('price_max') ? Number(formData.get('price_max')) : null,
    vibe_level: formData.get('vibe_level') ? Number(formData.get('vibe_level')) : null,
    status: String(formData.get('status') || 'draft'),
    visibility: String(formData.get('visibility') || 'public')
  };

  const { error } = await supabase.from('events').insert(payload);
  if (error) redirect(`/admin/events/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/events');
  redirect('/admin?created=event');
}
