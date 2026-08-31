export type AddressParts = {
  address: string;
  city: string;
  state: string;
};

export function normalizeAddressPart(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\b(street)\b/g, 'st')
    .replace(/\b(avenue)\b/g, 'ave')
    .replace(/\b(boulevard)\b/g, 'blvd')
    .replace(/\b(road)\b/g, 'rd')
    .replace(/\b(drive)\b/g, 'dr')
    .replace(/\b(lane)\b/g, 'ln')
    .replace(/\b(court)\b/g, 'ct')
    .replace(/\b(highway)\b/g, 'hwy')
    .replace(/[^a-z0-9#\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhysicalAddress({ address, city, state }: AddressParts) {
  return [
    normalizeAddressPart(address),
    normalizeAddressPart(city),
    normalizeAddressPart(state).toUpperCase(),
  ].join('|');
}

export function validatePhysicalAddress({ address, city, state }: AddressParts) {
  const cleanAddress = String(address || '').trim();
  const cleanCity = String(city || '').trim();
  const cleanState = String(state || '').trim().toUpperCase();

  if (!cleanAddress) return 'Street address is required.';
  if (!/^\d+[A-Za-z-]?\s+\S+/.test(cleanAddress)) {
    return 'Enter a physical street number and street name.';
  }
  if (!cleanCity) return 'City is required.';
  if (!/^[A-Za-z]{2}$/.test(cleanState)) return 'Select a valid two-letter state.';

  return null;
}

export function addressesMatch(a: AddressParts, b: AddressParts) {
  return normalizePhysicalAddress(a) === normalizePhysicalAddress(b);
}
