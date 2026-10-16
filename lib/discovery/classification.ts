export const DISCOVERY_CATEGORIES = ['turn-up', 'hip-hop', 'music', 'date-night', 'sports', 'comedy', 'festivals', 'family'] as const;
export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number];
type Evidence = { name?: unknown; event_type?: unknown; music_selection?: unknown; vibe_tags?: unknown; classification?: unknown; segment?: unknown; genre?: unknown; };
function normalize(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';
}
/** Whole phrases, never substrings of unrelated words (rock / Shamrock). */
export function hasWholeTerm(value: unknown, term: string): boolean {
  const needle = normalize(term);
  return Boolean(needle && (' ' + normalize(value) + ' ').includes(' ' + needle + ' '));
}
const aliases: Record<DiscoveryCategory, readonly string[]> = {
  'turn-up': ['nightlife', 'club night', 'day party', 'dance party', 'party', 'live dj', 'dj'],
  'hip-hop': ['hip hop', 'hiphop', 'rap', 'hip hop rap'],
  music: ['music', 'concert', 'concerts', 'live music', 'rock', 'pop', 'jazz', 'blues', 'country', 'r b', 'rhythm and blues', 'hip hop', 'hiphop', 'rap', 'hip hop rap', 'classical', 'metal', 'alternative', 'edm', 'house', 'electronic', 'dance electronic', 'latin', 'afrobeats'],
  'date-night': ['date night'],
  sports: ['sports', 'sport', 'soccer', 'football', 'baseball', 'basketball', 'hockey', 'martial arts', 'mixed martial arts', 'mma', 'boxing', 'wrestling'],
  comedy: ['comedy', 'stand up', 'stand up comedy'],
  festivals: ['festival', 'festivals', 'fair', 'fairs'],
  family: ['family', 'family friendly', 'children', 'children s', 'kids'],
};
const unknownValues = new Set(['', 'unknown', 'undefined', 'not defined', 'n a', 'other']);
function values(value: unknown): string[] {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return items.map(normalize).filter(value => !unknownValues.has(value));
}
/** Structured evidence outranks titles. Unmapped or conflicting evidence is not guessed. */
export function classifyDiscoveryEvent(event: Evidence, source: 'hypeknight' | 'external'): DiscoveryCategory[] {
  const structured = source === 'hypeknight'
    ? [...values(event.event_type), ...values(event.music_selection), ...values(event.vibe_tags)]
    : [...values(event.segment), ...values(event.classification), ...values(event.genre)];
  const categories = DISCOVERY_CATEGORIES.filter(category => structured.some(value => aliases[category].includes(value)));
  if (categories.includes('music') && categories.includes('sports')) return [];
  if (structured.length) return categories;
  // Conservative fallback only without structured classification. A lone genre
  // in a title, venue, description or provider label is not category evidence.
  const title = event.name;
  const fallback: DiscoveryCategory[] = [];
  if (['live music', 'rock concert', 'jazz concert', 'hip hop concert'].some(term => hasWholeTerm(title, term))) fallback.push('music');
  if (hasWholeTerm(title, 'hip hop concert')) fallback.push('hip-hop');
  if (['mixed martial arts', 'football game', 'soccer match', 'basketball game'].some(term => hasWholeTerm(title, term))) fallback.push('sports');
  if (hasWholeTerm(title, 'stand up comedy')) fallback.push('comedy');
  if (hasWholeTerm(title, 'music festival')) fallback.push('music', 'festivals');
  if (hasWholeTerm(title, 'date night')) fallback.push('date-night');
  if (hasWholeTerm(title, 'family friendly')) fallback.push('family');
  if (fallback.includes('music') && fallback.includes('sports')) return [];
  return [...new Set(fallback)];
}
/** Existing upcoming statuses; historical public-page eligibility is separate. */
export function isPublicNativeDiscoveryRecord(event: Record<string, unknown>): boolean {
  return ['scheduled', 'active'].includes(String(event.status)) && event.is_public === true &&
    event.is_approved === true && event.hidden_by_admin !== true && event.removed_at == null;
}
