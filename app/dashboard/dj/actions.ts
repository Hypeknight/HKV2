'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function submitDjRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const stageName = String(formData.get('stage_name') || '').trim();
  const legalName = String(formData.get('legal_name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const instagramUrl = String(formData.get('instagram_url') || '').trim();
  const websiteUrl = String(formData.get('website_url') || '').trim();
  const bio = String(formData.get('bio') || '').trim();
  const experienceNotes = String(formData.get('experience_notes') || '').trim();

  const payload = {
    user_id: user.id,
    stage_name: stageName || null,
    legal_name: legalName || null,
    phone: phone || null,
    city: city || null,
    state: state || null,
    instagram_url: instagramUrl || null,
    website_url: websiteUrl || null,
    bio: bio || null,
    experience_notes: experienceNotes || null,
    status: 'pending',
  };

  const { data: existing } = await supabase
    .from('dj_role_requests')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  const result = existing
    ? await supabase
        .from('dj_role_requests')
        .update(payload)
        .eq('user_id', user.id)
    : await supabase.from('dj_role_requests').insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }

  redirect('/dashboard?dj_request_submitted=1');
}