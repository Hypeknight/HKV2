import { createClient } from '@/lib/supabase/server';
import { DiscoveryEventCardItem } from '@/components/events/DiscoveryEventCard';

type PreferenceRow = {
  preferred_city?: string | null;
  preferred_state?: string | null;
  music_genres?: string[] | null;
  event_types?: string[] | null;
  vibe_tags?: string[] | null;
  preferred_sources?: string[] | null;
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() || '';
}

function includesAny(text: string, values?: string[] | null) {
  if (!values?.length) return false;

  const normalizedText = text.toLowerCase();

  return values.some((value) => normalizedText.includes(value.toLowerCase()));
}

function scoreEvent(event: DiscoveryEventCardItem, preferences: PreferenceRow) {
  let score = 0;

  const city = normalize(event.city);
  const state = normalize(event.state);
  const preferredCity = normalize(preferences.preferred_city);
  const preferredState = normalize(preferences.preferred_state);

  const searchableText = [
    event.name,
    event.description,
    event.venue_name,
    event.genre,
    event.classification,
    event.city,
    event.state,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (preferredCity && city === preferredCity) score += 40;
  if (preferredState && state === preferredState) score += 10;

  if (includesAny(searchableText, preferences.music_genres)) score += 25;
  if (includesAny(searchableText, preferences.event_types)) score += 25;
  if (includesAny(searchableText, preferences.vibe_tags)) score += 20;

  if (!event.is_external) score += 15;

  if (event.event_start_at) {
    const now = Date.now();
    const start = new Date(event.event_start_at).getTime();
    const daysAway = (start - now) / (1000 * 60 * 60 * 24);

    if (daysAway >= 0 && daysAway <= 2) score += 20;
    else if (daysAway <= 7) score += 12;
    else if (daysAway <= 30) score += 5;
  }

  return score;
}

export async function getRecommendedEventsForUser(userId: string) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: preferences } = await supabase
    .from('user_event_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const preferredSources = preferences?.preferred_sources ?? [
    'hypeknight',
    'external',
  ];

  const shouldFetchHype = preferredSources.includes('hypeknight');
  const shouldFetchExternal = preferredSources.includes('external');

  const [hypeResult, externalResult] = await Promise.all([
    shouldFetchHype
      ? supabase
          .from('events')
          .select('*, venue:venues(name, slug, city, state)')
          .eq('status', 'active')
          .eq('is_public', true)
          .is('removed_at', null)
          .gte('event_start_at', nowIso)
          .order('event_start_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),

    shouldFetchExternal
      ? supabase
          .from('external_events')
          .select('*')
          .eq('status', 'active')
          .or(`event_start_at.gte.${nowIso},event_start_at.is.null`)
          .order('event_start_at', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (hypeResult.error) throw new Error(hypeResult.error.message);
  if (externalResult.error) throw new Error(externalResult.error.message);

  const cards: DiscoveryEventCardItem[] = [
    ...(hypeResult.data ?? []).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: event.state,
      description: event.description,
      event_start_at: event.event_start_at,
      image_url: event.flyer_url,
      href: `/events/${event.slug}`,
      status: event.status || 'active',
      source_label: 'HypeKnight',
      is_external: false,
      venue_name: event.venue?.name || event.venue_name,
      genre: event.music?.[0] || event.event_type || null,
      classification: event.event_type || null,
    })),

    ...(externalResult.data ?? []).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: event.state,
      description: event.description,
      event_start_at: event.event_start_at,
      image_url: event.image_url,
      href: `/events/external/${event.id}`,
      status: event.status || 'active',
      source_label:
        event.source_code === 'ticketmaster'
          ? 'Ticketmaster'
          : event.source_code || 'External',
      is_external: true,
      venue_name: event.venue_name,
      genre: event.genre,
      classification: event.classification || event.segment,
    })),
  ];

  const ranked = cards
    .map((event) => ({
      event,
      score: scoreEvent(event, preferences || {}),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aTime = a.event.event_start_at
        ? new Date(a.event.event_start_at).getTime()
        : Infinity;

      const bTime = b.event.event_start_at
        ? new Date(b.event.event_start_at).getTime()
        : Infinity;

      return aTime - bTime;
    });

  return {
    preferences,
    recommendations: ranked,
  };
}