'use client';
import { getAnonymousSessionId } from './browser';
import type { DiscoveryObservation, DiscoverySurface } from './discovery';
// One exposure per document + placement + inventory identity, including StrictMode
// remounts/back navigation. Reload is a new viewable exposure, not a search.
const observations = new Map<string, string>();
export function exposureObservationId(key: string): string {
  let id = observations.get(key);
  if (!id) { id = crypto.randomUUID(); observations.set(key, id); }
  return id;
}
export async function sendDiscoveryObservation(input: DiscoveryObservation): Promise<boolean> {
  const body = JSON.stringify({ ...input, anonymousSessionId: getAnonymousSessionId() });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('/api/signals/discovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
      if (response.ok) return true;
      if (response.status < 500) return false;
    } catch { /* Retry once with the SAME observation id. */ }
  }
  console.warn('Discovery observation unavailable');
  return false;
}
export function recordSearchSubmission(form: HTMLFormElement, surface: 'homepage' | 'events_index') {
  const metadata: DiscoveryObservation['metadata'] = {};
  const data = new FormData(form);
  for (const key of ['q','city','state','music','event_type','vibe','amenity','age','when','source']) metadata[key] = String(data.get(key) || '').trim() || null;
  const input: DiscoveryObservation = { observationId: crypto.randomUUID(), signalType: 'search_performed', surface, metadata };
  // Beacon acceptance is queued transport, not confirmed storage. Missing receipt
  // never means zero searches/results; the fallback retains observation identity.
  const body = JSON.stringify({ ...input, anonymousSessionId: getAnonymousSessionId() });
  try {
    if (navigator.sendBeacon?.('/api/signals/discovery', new Blob([body], { type: 'application/json' }))) return;
  } catch { /* Collection must not interrupt native form navigation. */ }
  void sendDiscoveryObservation(input);
}
export function exposureKey(surface: DiscoverySurface, placement: string, inventorySource: string, subjectId: string) {
  return JSON.stringify([surface, placement, inventorySource, subjectId]);
}
