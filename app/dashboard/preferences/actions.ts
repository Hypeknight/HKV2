'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function getArray(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

export async function saveEventPreferences(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const preferredCity = String(formData.get('preferred_city') || '').trim();
  const preferredState = String(formData.get('preferred_state') || '')
    .trim()
    .toUpperCase();

  const maxDistanceMiles = Number(formData.get('max_distance_miles') || 25);

  const musicGenres = getArray(formData, 'music_genres');
  const eventTypes = getArray(formData, 'event_types');
  const vibeTags = getArray(formData, 'vibe_tags');
  const budgetPreferences = getArray(formData, 'budget_preferences');
  const preferredSources = getArray(formData, 'preferred_sources');

  const { error } = await supabase.from('user_event_preferences').upsert(
    {
      user_id: user.id,
      preferred_city: preferredCity || null,
      preferred_state: preferredState || null,
      max_distance_miles: Number.isFinite(maxDistanceMiles)
        ? maxDistanceMiles
        : 25,
      music_genres: musicGenres,
      event_types: eventTypes,
      vibe_tags: vibeTags,
      budget_preferences: budgetPreferences,
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