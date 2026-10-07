'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireVenueAuthority } from '@/lib/venues/authority';

async function resolveRequest(
  formData: FormData,
  status: 'approved' | 'declined'
) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const requestId = String(formData.get('request_id') || '');

  const { data: request, error: requestError } = await admin
    .from('venue_event_connection_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (requestError) throw requestError;
  if (!request) throw new Error('Connection request not found.');

  // BM1: authority belongs to the venue-specific management relationship.
  // Legacy owner_id is compatibility storage only; it grants no authority.
  // Payment/subscription state never grants management authority.
  await requireVenueAuthority(String(request.venue_id));

  const now = new Date().toISOString();

  const { error: resolutionError } = await admin
    .from('venue_event_connection_requests')
    .update({
      status,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', requestId);

  if (resolutionError) throw resolutionError;

  if (status === 'approved') {
    const { error: eventError } = await admin
      .from('events')
      .update({
        venue_id: request.venue_id,
        venue_connection_status: 'approved',
        updated_at: now,
      })
      .eq('id', request.event_id);

    if (eventError) throw eventError;
  } else {
    // Rejecting the canonical relationship does not reject the event.
    // The organizer-provided venue/location information remains intact.
    const { error: eventError } = await admin
      .from('events')
      .update({
        venue_id: null,
        venue_connection_status: 'declined',
        updated_at: now,
      })
      .eq('id', request.event_id);

    if (eventError) throw eventError;
  }

  revalidatePath('/dashboard/venues/connections');
  revalidatePath('/dashboard/venues/' + request.venue_id + '/events');
  revalidatePath(`/dashboard/events/${request.event_id}/review`);
}

export async function approveVenueConnection(formData: FormData) {
  return resolveRequest(formData, 'approved');
}

export async function declineVenueConnection(formData: FormData) {
  return resolveRequest(formData, 'declined');
}
