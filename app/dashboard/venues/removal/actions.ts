'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requestVenueRemoval(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const venueId = String(formData.get('venue_id') || '');
  const reason = String(formData.get('removal_reason') || '').trim();
  const refundRequested = String(formData.get('refund_requested') || '') === 'yes';

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, slug')
    .eq('id', venueId)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) {
    throw new Error(venueError?.message || 'Venue not found');
  }

  const { error } = await supabase
    .from('venues')
    .update({
      removal_requested_at: new Date().toISOString(),
      removal_reason: reason || null,
      refund_requested: refundRequested,
      refund_decision: refundRequested ? 'pending' : 'not_applicable',
    })
    .eq('id', venueId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/venues/${venue.slug}?removal_requested=1`);
}