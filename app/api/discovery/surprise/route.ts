import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeState } from '@/lib/states';
import { buildMarketRegistry, isLocationInMarket, resolveSearchMarket } from '@/lib/markets/registry';
import { recordSignal } from '@/lib/signals/server';

type Candidate = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  description: string | null;
  event_start_at: string | null;
  image_url: string | null;
  venue_name: string | null;
  href: string;
  source: 'hypeknight' | 'external';
  market_id: string | null;
  searchable: string;
};

function textScore(candidate: Candidate, preferences: any) {
  let score = 0;
  const text = candidate.searchable.toLowerCase();
  const preferredCity = String(preferences?.preferred_city || '').trim().toLowerCase();
  const preferredState = normalizeState(String(preferences?.preferred_state || ''));
  if (preferredCity && candidate.city?.toLowerCase() === preferredCity) score += 25;
  if (preferredState && normalizeState(candidate.state || '') === preferredState) score += 8;

  for (const [values, weight] of [
    [preferences?.music_genres, 18],
    [preferences?.event_types, 18],
    [preferences?.vibe_tags, 15],
    [preferences?.amenity_preferences, 6],
  ] as const) {
    for (const value of Array.isArray(values) ? values : []) {
      if (text.includes(String(value).toLowerCase())) score += weight;
    }
  }

  const start = candidate.event_start_at ? new Date(candidate.event_start_at).getTime() : Infinity;
  const hoursAway = (start - Date.now()) / 3_600_000;
  if (hoursAway >= 0 && hoursAway <= 8) score += 20;
  else if (hoursAway <= 24) score += 12;
  else if (hoursAway <= 72) score += 5;
  if (candidate.source === 'hypeknight') score += 4;
  return score;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = String(url.searchParams.get('city') || '').trim();
  const state = normalizeState(String(url.searchParams.get('state') || ''));
  const exclude = String(url.searchParams.get('exclude') || '').trim();

  if (!city || !state) {
    return NextResponse.json({ error: 'City and state are required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const now = new Date().toISOString();

  const [hypeResult, externalResult, marketResult, areaResult, preferenceResult] = await Promise.all([
    supabase.from('events').select('id,name,slug,city,state,description,event_start_at,flyer_url,venue_name,event_type,music_selection,vibe_tags,amenities,market_id').in('status', ['scheduled', 'active']).eq('is_public', true).is('removed_at', null).gte('event_start_at', now).order('event_start_at', { ascending: true }).limit(250),
    supabase.from('external_events').select('id,name,city,state,description,event_start_at,image_url,venue_name,genre,classification,segment,market_id,source_code').eq('status', 'active').gte('event_start_at', now).order('event_start_at', { ascending: true }).limit(250),
    supabase.from('markets').select('id,market_key,name,primary_city,primary_state,status').neq('status', 'retired'),
    supabase.from('market_areas').select('id,market_id,city,state,normalized_city,normalized_state,area_type,is_primary,priority,is_active').eq('is_active', true),
    user ? supabase.from('user_event_preferences').select('*').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  const firstError = hypeResult.error || externalResult.error || marketResult.error || areaResult.error || preferenceResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const registry = buildMarketRegistry(marketResult.data || [], areaResult.data || []);
  const market = resolveSearchMarket(registry, city, state, null);

  const candidates: Candidate[] = [
    ...(hypeResult.data || []).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: normalizeState(String(event.state || '')),
      description: event.description,
      event_start_at: event.event_start_at,
      image_url: event.flyer_url,
      venue_name: event.venue_name,
      href: `/events/${event.slug}`,
      source: 'hypeknight' as const,
      market_id: event.market_id || null,
      searchable: [event.name,event.description,event.venue_name,event.event_type,...(event.music_selection || []),...(event.vibe_tags || []),...(event.amenities || [])].filter(Boolean).join(' '),
    })),
    ...(externalResult.data || []).map((event: any) => ({
      id: event.id,
      name: event.name,
      city: event.city,
      state: normalizeState(String(event.state || '')),
      description: event.description,
      event_start_at: event.event_start_at,
      image_url: event.image_url,
      venue_name: event.venue_name,
      href: `/events/external/${event.id}`,
      source: 'external' as const,
      market_id: event.market_id || null,
      searchable: [event.name,event.description,event.venue_name,event.genre,event.classification,event.segment].filter(Boolean).join(' '),
    })),
  ].filter((candidate) => {
    if (exclude && `${candidate.source}:${candidate.id}` === exclude) return false;
    if (market) {
      return candidate.market_id === market.id || isLocationInMarket(registry, market.id, candidate.city, candidate.state);
    }
    return candidate.city?.trim().toLowerCase() === city.toLowerCase() && normalizeState(candidate.state || '') === state;
  });

  await recordSignal(supabase, {
    signalType: 'surprise_requested',
    subjectType: market ? 'market' : 'search',
    subjectId: market?.id || `${city},${state}`,
    city,
    state,
    source: 'surprise',
    surface: 'surprise_experience',
    verificationLevel: 'declared',
    metadata: { candidate_count: candidates.length, market_key: market?.key || null },
  });

  if (!candidates.length) {
    return NextResponse.json({ event: null, city, state, market: market?.name || null });
  }

  const ranked = candidates
    .map((event) => ({ event, score: textScore(event, preferenceResult.data) }))
    .sort((a, b) => b.score - a.score || new Date(a.event.event_start_at || 0).getTime() - new Date(b.event.event_start_at || 0).getTime());

  const pool = ranked.slice(0, Math.min(8, ranked.length));
  const choice = pool[Math.floor(Math.random() * pool.length)];

  await recordSignal(supabase, {
    signalType: 'surprise_event_presented',
    subjectType: 'event',
    subjectId: choice.event.id,
    eventId: choice.event.source === 'hypeknight' ? choice.event.id : null,
    city,
    state,
    source: 'surprise',
    surface: 'surprise_result',
    verificationLevel: 'observed',
    metadata: { source_type: choice.event.source, preference_score: choice.score, market_key: market?.key || null },
  });

  return NextResponse.json({ event: choice.event, city, state, market: market?.name || null });
}
