'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function getArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
}

function getNumber(
  formData: FormData,
  key: string,
  fallback: number
) {
  const raw = formData.get(key);

  if (raw === null || raw === '') return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export async function saveEventPreferences(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) redirect('/auth/login');

  const preferredCity = String(
    formData.get('preferred_city') || ''
  ).trim();

  const preferredState = String(
    formData.get('preferred_state') || ''
  )
    .trim()
    .toUpperCase();

  const maxDistanceMiles = Math.min(
    Math.max(
      Math.round(getNumber(formData, 'max_distance_miles', 25)),
      1
    ),
    250
  );

  const maxCoverPrice = Math.max(
    getNumber(formData, 'max_cover_price', 50),
    0
  );

  const payload = {
    user_id: user.id,

    preferred_city: preferredCity || null,
    preferred_state: preferredState || null,
    max_distance_miles: maxDistanceMiles,
    max_cover_price: maxCoverPrice,

    music_genres: getArray(formData, 'music_genres'),
    event_types: getArray(formData, 'event_types'),
    vibe_tags: getArray(formData, 'vibe_tags'),
    amenity_preferences: getArray(
      formData,
      'amenity_preferences'
    ),

    hidden_preferences: getArray(
      formData,
      'hidden_preferences'
    ),
    preferred_days: getArray(formData, 'preferred_days'),
    preferred_times: getArray(formData, 'preferred_times'),
    notification_preferences: getArray(
      formData,
      'notification_preferences'
    ),

    preferred_sources: getArray(formData, 'preferred_sources').length
      ? getArray(formData, 'preferred_sources')
      : ['hypeknight', 'external'],

    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_event_preferences')
    .upsert(payload, {
      onConflict: 'user_id',
    })
    .select('user_id')
    .single();

  if (error) {
    throw new Error(`Unable to save preferences: ${error.message}`);
  }

  if (!data) {
    throw new Error('Preferences were not saved.');
  }

  redirect('/dashboard/preferences?saved=1');
}