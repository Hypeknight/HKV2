'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const displayName = cleanUsername(String(formData.get('display_name') || ''));
  const phone = String(formData.get('phone') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const bio = String(formData.get('bio') || '').trim();

  const instagramUrl = String(formData.get('instagram_url') || '').trim();
  const facebookUrl = String(formData.get('facebook_url') || '').trim();
  const tiktokUrl = String(formData.get('tiktok_url') || '').trim();
  const websiteUrl = String(formData.get('website_url') || '').trim();

  if (!displayName) {
    throw new Error('Display name is required.');
  }

  if (displayName.length < 3) {
    throw new Error('Display name must be at least 3 characters.');
  }

  const { data: existingDisplayName, error: displayNameError } = await supabase
    .from('profiles')
    .select('id')
    .ilike('display_name', displayName)
    .neq('id', user.id)
    .maybeSingle();

  if (displayNameError) {
    throw new Error(displayNameError.message);
  }

  if (existingDisplayName) {
    throw new Error('That display name is already taken.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      username: displayName,
      phone: phone || null,
      city: city || null,
      state: state || null,
      bio: bio || null,
      instagram_url: instagramUrl || null,
      facebook_url: facebookUrl || null,
      tiktok_url: tiktokUrl || null,
      website_url: websiteUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) throw new Error(error.message);

  redirect('/dashboard/profile?updated=1');
}

function cleanUsername(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 24);
}