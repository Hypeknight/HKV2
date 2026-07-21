'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireEventOwner(eventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user) redirect('/auth/login');

  const { data: event, error: eventError } =
    await supabase
      .from('events')
      .select('id, owner_id')
      .eq('id', eventId)
      .single();

  if (eventError || !event) {
    throw new Error(
      eventError?.message || 'Event not found.'
    );
  }

  if (event.owner_id !== user.id) {
    redirect('/dashboard/events');
  }

  return { supabase, user };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function refresh(eventId: string, roomId: string) {
  revalidatePath(
    `/dashboard/events/${eventId}/linkdn`
  );
  revalidatePath(`/admin/linkdn/${roomId}`);
}

export async function respondToLinkdNInvitation(
  formData: FormData
) {
  const eventId = text(formData, 'event_id');
  const roomId = text(formData, 'room_id');
  const invitationId = text(formData, 'invitation_id');
  const response = text(formData, 'response');
  const declineReason =
    text(formData, 'decline_reason') || null;

  if (!eventId || !roomId || !invitationId) {
    throw new Error('Missing invitation information.');
  }

  if (!['accepted', 'declined'].includes(response)) {
    throw new Error('Invalid invitation response.');
  }

  const { supabase } =
    await requireEventOwner(eventId);

  const nowIso = new Date().toISOString();

  const { data: invitation, error: invitationError } =
    await supabase
      .from('linkdn_invitations')
      .update({
        status: response,
        responded_at: nowIso,
        decline_reason:
          response === 'declined'
            ? declineReason
            : null,
        updated_at: nowIso,
      })
      .eq('id', invitationId)
      .eq('event_id', eventId)
      .eq('room_id', roomId)
      .eq('status', 'pending')
      .select('opportunity_id')
      .single();

  if (invitationError || !invitation) {
    throw new Error(
      invitationError?.message ||
        'Invitation could not be updated.'
    );
  }

  const participantStatus =
    response === 'accepted'
      ? 'accepted'
      : 'declined';

  const results = await Promise.all([
    supabase
      .from('linkdn_room_events')
      .update({
        status: participantStatus,
        updated_at: nowIso,
      })
      .eq('room_id', roomId)
      .eq('event_id', eventId),

    supabase
      .from('linkdn_room_venues')
      .update({
        participation_status:
          participantStatus,
        updated_at: nowIso,
      })
      .eq('room_id', roomId)
      .eq('event_id', eventId),

    invitation.opportunity_id
      ? supabase
          .from('linkdn_opportunities')
          .update({
            status:
              response === 'accepted'
                ? 'accepted'
                : 'declined',
            updated_at: nowIso,
          })
          .eq('id', invitation.opportunity_id)
      : Promise.resolve({ error: null }),
  ]);

  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(error.message);

  refresh(eventId, roomId);
}