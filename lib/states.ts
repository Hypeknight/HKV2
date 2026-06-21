export const US_STATES = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['IL', 'Illinois'],
  ['KS', 'Kansas'],
  ['LA', 'Louisiana'],
  ['MO', 'Missouri'],
  ['NV', 'Nevada'],
  ['NY', 'New York'],
  ['TX', 'Texas'],
] as const;

export function normalizeState(value: string) {
  const query = value.trim().toLowerCase();
  if (!query) return '';

  const match = US_STATES.find(
    ([abbr, name]) =>
      abbr.toLowerCase() === query || name.toLowerCase() === query
  );

  return match ? match[0] : value.trim().toUpperCase();
}