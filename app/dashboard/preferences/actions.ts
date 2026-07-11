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
  const value = Number(formData.get(key));

  return Number.isFinite(value) ? value : fallback;
}

export async function saveEventPreferences(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    Math.max(getNumber(formData, 'max_distance_miles', 25), 1),
    250
  );

  const maxCoverPrice = Math.max(
    getNumber(formData, 'max_cover_price', 50),
    0
  );

  const musicGenres = getArray(formData, 'music_genres');
  const eventTypes = getArray(formData, 'event_types');
  const vibeTags = getArray(formData, 'vibe_tags');
  const amenityPreferences = getArray(
    formData,
    'amenity_preferences'
  );

  const hiddenPreferences = getArray(
    formData,
    'hidden_preferences'
  );

  const preferredDays = getArray(formData, 'preferred_days');
  const preferredTimes = getArray(formData, 'preferred_times');

  const notificationPreferences = getArray(
    formData,
    'notification_preferences'
  );

  const preferredSources = getArray(
    formData,
    'preferred_sources'
  );

  const { error } = await supabase
    .from('user_event_preferences')
    .upsert(
      {
        user_id: user.id,

        preferred_city: preferredCity || null,
        preferred_state: preferredState || null,
        max_distance_miles: maxDistanceMiles,
        max_cover_price: maxCoverPrice,

        music_genres: musicGenres,
        event_types: eventTypes,
        vibe_tags: vibeTags,
        amenity_preferences: amenityPreferences,

        hidden_preferences: hiddenPreferences,
        preferred_days: preferredDays,
        preferred_times: preferredTimes,
        notification_preferences: notificationPreferences,

        preferred_sources: preferredSources.length
          ? preferredSources
          : ['hypeknight', 'external'],

        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

  if (error) throw new Error(error.message);

  redirect('/dashboard/preferences?saved=1');
}