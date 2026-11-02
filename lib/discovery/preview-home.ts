import { readRows, combinedState, isEventRecord, type DataResult } from '@/lib/interface-state/data';
import { classifyDiscoveryEvent, isPublicNativeDiscoveryRecord } from '@/lib/discovery/classification';
import { nativeEventDestination, externalEventDestination } from '@/lib/discovery/destinations';
import { normalizeState } from '@/lib/states';

export type PreviewEvent = {
  id: string; name: string; city: string; state: string; venue: string;
  start: string | null; image: string | null; href: string;
  source: 'hypeknight' | 'external'; provider: string; categories: string[];
};
export type PreviewInventory = { status: 'success' | 'partial' | 'unavailable'; events: PreviewEvent[] };
export const previewCategories = [
  ['music', 'Music'], ['hip-hop', 'Hip-Hop'], ['sports', 'Sports'], ['comedy', 'Comedy'],
  ['turn-up', 'Nightlife'], ['festivals', 'Festivals'], ['family', 'Family'], ['date-night', 'Date night'],
] as const;
const text = (value: unknown) => typeof value === 'string' ? value : '';
function imageUrl(value: unknown): string | null {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
/** Explicit allowlist: no participant, organizer identity or operational fields enter preview props. */
export function previewInventory(native: DataResult<any[]>, external: DataResult<any[]>): PreviewInventory {
  const events: PreviewEvent[] = [];
  for (const source of ['hypeknight', 'external'] as const) {
    const rows = (source === 'hypeknight' ? native : external).data ?? [];
    for (const event of rows) {
      if (source === 'hypeknight' && !isPublicNativeDiscoveryRecord(event)) continue;
      if (source === 'external' && event.status !== 'active') continue;
      const href = source === 'hypeknight' ? nativeEventDestination(event.slug) : externalEventDestination(event.id);
      if (!href) continue;
      events.push({ id: text(event.id), name: text(event.name), city: text(event.city), state: normalizeState(text(event.state)),
        venue: text(event.venue_name), start: text(event.event_start_at) || null,
        image: imageUrl(event.flyer_url || event.image_url), href, source,
        provider: source === 'hypeknight' ? 'HypeKnight' : event.source_code === 'ticketmaster' ? 'Ticketmaster' : text(event.source_code) || 'External source',
        categories: classifyDiscoveryEvent(event, source),
      });
    }
  }
  // Native inventory leads; no paid, popularity or inferred relevance score is introduced.
  return { status: combinedState([native, external]), events };
}
/** Same bounded, authorized inventory queries as the existing homepage. No new eligibility rules. */
export async function loadPreviewInventory(client: any, now = new Date()): Promise<PreviewInventory> {
  const iso = now.toISOString();
  const recent = new Date(now.getTime() - 4 * 3600000).toISOString();
  const [native, external] = await Promise.all([
    readRows('preview.native', () => client.from('events').select('*')
      .in('status', ['scheduled', 'active']).eq('is_public', true).is('removed_at', null)
      .lte('promotion_start_at', iso).gte('promotion_end_at', iso)
      .order('event_start_at', { ascending: true }).limit(80), isEventRecord),
    readRows('preview.external', () => client.from('external_events').select('*').eq('status', 'active')
      .not('event_start_at', 'is', null)
      .or('event_end_at.gte.' + iso + ',and(event_end_at.is.null,event_start_at.gte.' + recent + ')')
      .order('event_start_at', { ascending: true }).limit(80), isEventRecord),
  ]);
  return previewInventory(native, external);
}
export function inPreviewCity(event: PreviewEvent, city: string, state: string) {
  return (!city || event.city.trim().toLowerCase() === city.trim().toLowerCase()) && (!state || event.state === normalizeState(state));
}
