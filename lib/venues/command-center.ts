import 'server-only';
import { notFound } from 'next/navigation';
import { requireVenueManagement } from '@/lib/venues/require-management';

export async function getVenueCommandContext(venueId: string) {
  const context = await requireVenueManagement(venueId);
  const { data: venue, error } = await context.supabase.from('venues')
    .select('id,name,slug,status,is_visible,claim_state,verification_state,location_id,address,city,state')
    .eq('id', venueId).single();
  if (error) throw new Error(error.message);
  if (!venue) notFound();
  return { ...context, venue };
}
