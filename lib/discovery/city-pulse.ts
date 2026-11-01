import { inPreviewCity, previewCategories, type PreviewInventory } from '@/lib/discovery/preview-home';
export type CitySnapshot = {
  state: 'select_city' | 'observed' | 'empty' | 'partial' | 'unavailable';
  native: number | null; external: number | null;
  categories: { key: string; label: string; count: number }[];
};
/** Public listing facts only. These are neither participant counts nor a full city census. */
export function citySnapshot(inventory: PreviewInventory, city: string, state: string): CitySnapshot {
  const withheld = { native: null, external: null, categories: [] };
  if (!city.trim() || !state.trim()) return { state: 'select_city', ...withheld };
  if (inventory.status !== 'success') return { state: inventory.status, ...withheld };
  const events = inventory.events.filter(event => inPreviewCity(event, city, state));
  return {
    state: events.length ? 'observed' : 'empty',
    native: events.filter(event => event.source === 'hypeknight').length,
    external: events.filter(event => event.source === 'external').length,
    categories: previewCategories.map(([key, label]) => ({ key, label, count: events.filter(event => event.categories.includes(key)).length })).filter(category => category.count > 0),
  };
}
export function communityExample(demo: string | null) {
  if (demo === 'insufficient') return 'insufficient_sample';
  if (demo === 'empty' || demo === 'loading' || demo === 'unavailable' || demo === 'partial') return demo;
  return 'preview';
}
