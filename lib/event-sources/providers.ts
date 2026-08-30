export const EVENT_SOURCE_PROVIDERS = [
  'hypeknight',
  'ticketmaster',
  'eventbrite',
  'axs',
  'dice',
  'universe',
  'venue',
  'promoter',
  'other',
] as const;

export type EventSourceProvider = (typeof EVENT_SOURCE_PROVIDERS)[number];

export function eventSourceLabel(provider: string | null | undefined) {
  const value = String(provider || '').toLowerCase();
  if (value === 'ticketmaster') return 'Ticketmaster';
  if (value === 'eventbrite') return 'Eventbrite';
  if (value === 'axs') return 'AXS';
  if (value === 'dice') return 'DICE';
  if (value === 'universe') return 'Universe';
  if (value === 'hypeknight') return 'HypeKnight';
  if (value === 'venue') return 'Venue';
  if (value === 'promoter') return 'Promoter';
  return 'Other provider';
}

export function detectEventSourceProvider(rawUrl: string): EventSourceProvider {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'eventbrite.com' || host.endsWith('.eventbrite.com')) return 'eventbrite';
    if (host === 'ticketmaster.com' || host.endsWith('.ticketmaster.com')) return 'ticketmaster';
    if (host === 'axs.com' || host.endsWith('.axs.com')) return 'axs';
    if (host === 'dice.fm' || host.endsWith('.dice.fm')) return 'dice';
    if (host === 'universe.com' || host.endsWith('.universe.com')) return 'universe';
    return 'other';
  } catch {
    return 'other';
  }
}

export function normalizeProviderUrl(rawUrl: string) {
  const value = String(rawUrl || '').trim();
  if (!value) throw new Error('Event source URL is required.');

  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error('Event source URL must use http or https.');
  }

  url.hash = '';
  return url.toString();
}

export function extractProviderEventId(
  provider: EventSourceProvider,
  rawUrl: string,
): string | null {
  try {
    const url = new URL(rawUrl);

    if (provider === 'eventbrite') {
      const numericTail = url.pathname.match(/-(\d+)(?:\/?$)/)?.[1];
      return numericTail || url.searchParams.get('eid') || null;
    }

    if (provider === 'ticketmaster') {
      const pathId = url.pathname.match(/\/event\/([A-Za-z0-9_-]+)/)?.[1];
      return pathId || url.searchParams.get('eventId') || null;
    }

    return null;
  } catch {
    return null;
  }
}
