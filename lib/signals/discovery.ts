import { normalizeState } from '../states';
// Low-trust telemetry, never proof of attendance or management authority.
export const DISCOVERY_SURFACES = ['homepage', 'events_index', 'city_discovery', 'recommended_events', 'dashboard_recommendations'] as const;
export type DiscoverySurface = typeof DISCOVERY_SURFACES[number];
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type DiscoveryObservation = {
  observationId: string;
  signalType: 'search_performed' | 'discovery_impression';
  surface: DiscoverySurface;
  subjectId?: string | null;
  inventorySource?: 'hypeknight' | 'external' | null;
  placement?: string | null;
  anonymousSessionId?: string | null;
  metadata: Record<string, string | number | null>;
};
const text = (value: unknown, limit = 120) => typeof value === 'string' ? value.trim().slice(0, limit) || null : null;
export function parseDiscoveryObservation(value: unknown): DiscoveryObservation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const b = value as Record<string, unknown>;
  if (typeof b.observationId !== 'string' || !UUID_PATTERN.test(b.observationId)) return null;
  if (!DISCOVERY_SURFACES.includes(b.surface as DiscoverySurface)) return null;
  if (b.signalType !== 'search_performed' && b.signalType !== 'discovery_impression') return null;
  const raw = b.metadata && typeof b.metadata === 'object' && !Array.isArray(b.metadata) ? b.metadata as Record<string, unknown> : {};
  const metadata: DiscoveryObservation['metadata'] = {};
  if (b.signalType === 'search_performed') {
    if (b.surface !== 'homepage' && b.surface !== 'events_index') return null;
    for (const key of ['q','city','state','music','event_type','vibe','amenity','age','when','source']) metadata[key] = text(raw[key], key === 'q' ? 256 : 120);
    metadata.state = metadata.state ? normalizeState(String(metadata.state)) : null;
    metadata.result_count = null;
    metadata.result_coverage = 'not_observed';
  } else {
    if (typeof b.subjectId !== 'string' || !UUID_PATTERN.test(b.subjectId)) return null;
    if (b.inventorySource !== 'hypeknight' && b.inventorySource !== 'external') return null;
    if (!text(b.placement)) return null;
    if (raw.visible_fraction !== 0.5 || raw.visible_ms !== 1000) return null;
    metadata.visible_fraction = 0.5; metadata.visible_ms = 1000;
    metadata.exposure_class = 'organic';
    if (Number.isInteger(raw.position) && Number(raw.position) >= 0 && Number(raw.position) <= 1000) metadata.position = Number(raw.position);
  }
  return { observationId: b.observationId, signalType: b.signalType, surface: b.surface as DiscoverySurface,
    subjectId: b.signalType === 'discovery_impression' ? text(b.subjectId, 36) : null,
    inventorySource: b.signalType === 'discovery_impression' ? b.inventorySource as 'hypeknight' | 'external' : null,
    placement: b.signalType === 'discovery_impression' ? text(b.placement) : 'search_form',
    anonymousSessionId: text(b.anonymousSessionId, 128), metadata };
}
