import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { loadPreviewInventory, type PreviewInventory } from '@/lib/discovery/preview-home';
import SimplyComplexHome from '@/components/preview/SimplyComplexHome';
import './preview.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Simply Complex · Design preview', robots: { index: false, follow: false } };
export default async function SimplyComplexPreview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const modes = ['empty', 'loading', 'unavailable', 'partial', 'insufficient'];
  const demo = typeof params.demo === 'string' && modes.includes(params.demo) ? params.demo : null;
  const city = typeof params.city === 'string' ? params.city.slice(0, 100) : '';
  const state = typeof params.state === 'string' ? params.state.slice(0, 50) : '';
  let inventory: PreviewInventory;
  if (demo === 'empty' || demo === 'loading') inventory = { status: 'success', events: [] };
  else if (demo === 'unavailable') inventory = { status: 'unavailable', events: [] };
  else {
    inventory = await loadPreviewInventory(await createClient());
    if (demo === 'partial') inventory = { status: 'partial', events: inventory.events.filter(event => event.source === 'external') };
  }
  return <SimplyComplexHome inventory={inventory} city={city} state={state} demo={demo} />;
}
