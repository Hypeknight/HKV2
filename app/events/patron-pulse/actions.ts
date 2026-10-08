'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PRESENCE_PARTICIPANT_COOKIE, parseParticipantToken } from '@/lib/presence/participant-cookie';

async function participationContext(formData: FormData) {
  const eventId = String(formData.get('event_id') || '').trim();
  const token = parseParticipantToken((await cookies()).get(PRESENCE_PARTICIPANT_COOKIE)?.value);
  if (!eventId || !token) throw new Error('Scan the official Event Presence QR to participate.');
  const supabase = await createClient();
  // The SSR user client carries auth.uid() when signed in. Missing account is
  // valid; the database verifies the cookie bearer and physical-presence evidence.
  const { data: event, error } = await supabase.from('events').select('id,slug').eq('id', eventId).maybeSingle();
  if (error || !event) throw new Error('Event unavailable.');
  return { supabase, event, token };
}

export async function checkIntoPatronPulse(formData: FormData) {
  const { supabase, event, token } = await participationContext(formData);
  const { error } = await supabase.rpc('check_in_patron_pulse', { p_event_id: event.id, p_token: token });
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${event.slug}`);
}

export async function submitPatronPulseResponse(formData: FormData) {
  const { supabase, event, token } = await participationContext(formData);
  const pulseId = String(formData.get('pulse_id') || '').trim();
  if (!pulseId) throw new Error('Pulse required.');
  const { error } = await supabase.rpc('submit_patron_pulse_response', {
    p_event_id: event.id, p_token: token, p_pulse_id: pulseId,
    p_option_id: String(formData.get('option_id') || '').trim() || null,
    p_text: String(formData.get('text_response') || '').trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${event.slug}`);
}
