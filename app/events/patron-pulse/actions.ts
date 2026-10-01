'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadPublicPatronPulse } from '@/lib/patron-pulse/service';
import {
  getActivePresenceVerification,
  hasParticipationPresence,
  resolvePresenceParticipant,
} from '@/lib/presence/service';
import { recordSignal } from '@/lib/signals/server';

async function getParticipantContext(
  participantToken: string
) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  const participant = await resolvePresenceParticipant({
    participantToken,
    userId: user?.id || null,
  });

  return { supabase, user, participant };
}

function text(
  formData: FormData,
  key: string
) {
  return String(formData.get(key) || '').trim();
}

export async function checkIntoPatronPulse(
  formData: FormData
) {
  const eventId = text(formData, 'event_id');
  const slug = text(formData, 'slug');
  const participantToken = text(
    formData,
    'participant_token'
  );

  if (!eventId || !slug || !participantToken) {
    throw new Error(
      'Check in at the event before participating in Patron Pulse.'
    );
  }

  const { supabase, participant } =
    await getParticipantContext(participantToken);

  const allowed = await hasParticipationPresence({
    participantId: participant.id,
    eventId,
  });

  if (!allowed) {
    throw new Error(
      'Verified event presence is required to participate in Patron Pulse.'
    );
  }

  const pulse = await loadPublicPatronPulse({
    supabase,
    eventId,
    userId: participant.user_id || null,
  });

  if (!pulse.session) {
    throw new Error(
      'Patron Pulse is not currently open for this event.'
    );
  }

  const verification =
    await getActivePresenceVerification({
      participantId: participant.id,
      contextType: 'event',
      eventId,
    });

  const nowIso = new Date().toISOString();

  const payload = {
    session_id: pulse.session.id,
    event_id: eventId,
    participant_id: participant.id,
    presence_verification_id: verification?.id || null,
    user_id: participant.user_id || null,
    status: 'checked_in',
    source: 'event_presence',
    last_active_at: nowIso,
    left_at: null,
  };

  const { data: existing, error: existingError } =
    await supabase
      .from('patron_pulse_checkins')
      .select('id')
      .eq('session_id', pulse.session.id)
      .eq('participant_id', participant.id)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const result = existing
    ? await supabase
        .from('patron_pulse_checkins')
        .update(payload)
        .eq('id', existing.id)
    : await supabase
        .from('patron_pulse_checkins')
        .insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }

  await recordSignal(supabase, {
    signalType: 'patron_pulse_checkin',
    subjectType: 'event',
    subjectId: eventId,
    eventId,
    source: 'patron_pulse',
    surface: 'event_detail',
    sessionId: pulse.session.id,
    verificationLevel:
      verification?.verification_level === 'verified'
        ? 'verified'
        : 'presence_supported',
    metadata: {
      participant_id: participant.id,
      presence_method: verification?.method || null,
      presence_verification_id: verification?.id || null,
    },
  });

  revalidatePath(`/events/${slug}`);
}

export async function submitPatronPulseResponse(
  formData: FormData
) {
  const eventId = text(formData, 'event_id');
  const slug = text(formData, 'slug');
  const pulseId = text(formData, 'pulse_id');
  const participantToken = text(
    formData,
    'participant_token'
  );
  const optionId = text(formData, 'option_id');
  const textResponse = text(
    formData,
    'text_response'
  );

  if (
    !eventId ||
    !slug ||
    !pulseId ||
    !participantToken
  ) {
    throw new Error(
      'Check in at the event before responding to Patron Pulse.'
    );
  }

  const { supabase, participant } =
    await getParticipantContext(participantToken);

  const allowed = await hasParticipationPresence({
    participantId: participant.id,
    eventId,
  });

  if (!allowed) {
    throw new Error(
      'Verified event presence is required to respond to Patron Pulse.'
    );
  }

  const verification =
    await getActivePresenceVerification({
      participantId: participant.id,
      contextType: 'event',
      eventId,
    });


  const { data: pulse, error: pulseError } =
    await supabase
      .from('patron_pulses')
      .select(`
        id,
        session_id,
        event_id,
        pulse_type,
        status,
        allow_multiple_responses,
        opens_at,
        closes_at
      `)
      .eq('id', pulseId)
      .eq('event_id', eventId)
      .single();

  if (pulseError || !pulse) {
    throw new Error(
      pulseError?.message || 'Pulse not found.'
    );
  }

  if (pulse.status !== 'open') {
    throw new Error('This pulse is not open.');
  }

  const now = new Date();

  if (
    pulse.opens_at &&
    now < new Date(pulse.opens_at)
  ) {
    throw new Error('This pulse has not opened yet.');
  }

  if (
    pulse.closes_at &&
    now > new Date(pulse.closes_at)
  ) {
    throw new Error('This pulse has closed.');
  }

  const responsePayload = {
    pulse_id: pulse.id,
    session_id: pulse.session_id,
    event_id: eventId,
    participant_id: participant.id,
    presence_verification_id: verification?.id || null,
    user_id: participant.user_id || null,
    option_id: optionId || null,
    text_response: textResponse || null,
    source: 'event_page',
    updated_at: new Date().toISOString(),
  };

  const { data: existingResponse, error: existingResponseError } =
    await supabase
      .from('patron_pulse_responses')
      .select('id')
      .eq('pulse_id', pulse.id)
      .eq('participant_id', participant.id)
      .maybeSingle();

  if (existingResponseError) {
    throw new Error(existingResponseError.message);
  }

  const responseResult = existingResponse
    ? await supabase
        .from('patron_pulse_responses')
        .update(responsePayload)
        .eq('id', existingResponse.id)
    : await supabase
        .from('patron_pulse_responses')
        .insert(responsePayload);

  if (responseResult.error) {
    throw new Error(responseResult.error.message);
  }

  await supabase
    .from('patron_pulse_checkins')
    .update({
      last_active_at: new Date().toISOString(),
    })
    .eq('session_id', pulse.session_id)
    .eq('participant_id', participant.id);

  // SIGNAL BRIDGE: store only response identifiers/context here. The full text
  // response remains in patron_pulse_responses so signals avoid duplicating PII.
  await recordSignal(supabase, {
    signalType: 'patron_pulse_response',
    subjectType: 'pulse',
    subjectId: pulse.id,
    eventId,
    source: 'patron_pulse',
    surface: 'event_detail',
    sessionId: pulse.session_id,
    verificationLevel:
      verification?.verification_level === 'verified'
        ? 'verified'
        : 'presence_supported',
    metadata: {
      pulse_type: pulse.pulse_type,
      option_id: optionId || null,
      has_text_response: Boolean(textResponse),
      participant_id: participant.id,
      presence_method: verification?.method || null,
      presence_verification_id: verification?.id || null,
    },
  });

  revalidatePath(`/events/${slug}`);
}