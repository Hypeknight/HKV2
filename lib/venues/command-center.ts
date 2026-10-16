import { readValue, isRecord } from '@/lib/interface-state/data';
import 'server-only';
import { notFound } from 'next/navigation';
import { requireVenueManagement } from '@/lib/venues/require-management';

export async function getVenueCommandContext(venueId: string) {
  const context = await requireVenueManagement(venueId);
  const result = await readValue<any>('venue.overview', () => context.supabase.from('venues')
    .select('id,name,slug,status,is_visible,claim_state,verification_state,location_id,address,city,state')
    .eq('id', venueId).single(), value => isRecord(value) && !value.error && (value.data === null || (isRecord(value.data) && value.data.id === venueId && typeof value.data.name === 'string')));
  if (result.status === 'unavailable') throw new Error('Venue information is temporarily unavailable.');
  const venue = result.data.data;
  if (!venue) notFound();
  return { ...context, venue };
}
