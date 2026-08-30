import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rankEventIdentityMatches, type EventIdentityCandidate } from '@/lib/event-identity/match';

function eventWindow(startAt: string) {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return null;
  const from = new Date(start.getTime() - 36 * 60 * 60 * 1000);
  const to = new Date(start.getTime() + 36 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const name = String(params.get('name') || '').trim();
  const venueName = String(params.get('venue_name') || '').trim();
  const city = String(params.get('city') || '').trim();
  const state = String(params.get('state') || '').trim();
  const startAt = String(params.get('start_at') || '').trim();

  if (!name || !city || !state || !startAt) {
    return NextResponse.json({ matches: [], message: 'Name, city, state, and start time are required.' }, { status: 400 });
  }

  const window = eventWindow(startAt);
  if (!window) return NextResponse.json({ matches: [], message: 'Invalid event start time.' }, { status: 400 });

  const supabase = await createClient();
  const [{ data: nativeEvents }, { data: externalEvents }] = await Promise.all([
    supabase
      .from('events')
      .select('id,slug,name,venue_name,city,state,event_start_at')
      .ilike('state', state)
      .gte('event_start_at', window.from)
      .lte('event_start_at', window.to)
      .limit(60),
    supabase
      .from('external_events')
      .select('id,name,venue_name,city,state,event_start_at,source_code,source_url,url,ticket_url,provider_url')
      .ilike('state', state)
      .gte('event_start_at', window.from)
      .lte('event_start_at', window.to)
      .limit(80),
  ]);

  const candidates: EventIdentityCandidate[] = [
    ...(nativeEvents || []).map((event: any) => ({
      id: event.id,
      source: 'hypeknight' as const,
      name: event.name,
      venueName: event.venue_name,
      city: event.city,
      state: event.state,
      startAt: event.event_start_at,
      slug: event.slug,
      url: event.slug ? `/events/${event.slug}` : null,
      provider: 'hypeknight',
    })),
    ...(externalEvents || []).map((event: any) => ({
      id: event.id,
      source: 'external' as const,
      name: event.name,
      venueName: event.venue_name,
      city: event.city,
      state: event.state,
      startAt: event.event_start_at,
      provider: event.source_code || 'external',
      url: `/events/external/${event.id}`,
    })),
  ];

  const matches = rankEventIdentityMatches({ name, venueName, city, state, startAt }, candidates, 50);
  return NextResponse.json({ matches });
}
