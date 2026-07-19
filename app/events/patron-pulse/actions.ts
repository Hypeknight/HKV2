'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  loadPublicPatronPulse,
  requirePatronPulseCapability,
} from '@/lib/patron-pulse/service';

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    redirect('/auth/login');
  }

  return { supabase, user };
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
  const { supabase, user } = await requireUser();

  const eventId = text(formData, 'event_id');
  const slug = text(formData, 'slug');

  if (!eventId || !slug) {
    throw new Error('Missing event information.');
  }

  await requirePatronPulseCapability({
    supabase,
    eventId,
    capability: 'guest-check-in',
  });

  const pulse = await loadPublicPatronPulse({
    supabase,
    eventId,
    userId: user.id,
  });

  if (!pulse.session) {
    throw new Error(
      'Patron Pulse is not currently open for this event.'
    );
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('patron_pulse_checkins')
    .upsert(
      {
        session_id: pulse.session.id,
        event_id: eventId,
        user_id: user.id,
        status: 'checked_in',
        source: 'event_page',
        last_active_at: nowIso,
        left_at: null,
      },
      {
        onConflict: 'session_id,user_id',
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/events/${slug}`);
}

export async function submitPatronPulseResponse(
  formData: FormData
) {
  const { supabase, user } = await requireUser();

  const eventId = text(formData, 'event_id');
  const slug = text(formData, 'slug');
  const pulseId = text(formData, 'pulse_id');
  const optionId = text(formData, 'option_id');
  const textResponse = text(
    formData,
    'text_response'
  );

  if (!eventId || !slug || !pulseId) {
    throw new Error('Missing pulse information.');
  }

  await requirePatronPulseCapability({
    supabase,
    eventId,
    capability: 'live-polls',
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
    user_id: user.id,
    option_id: optionId || null,
    text_response: textResponse || null,
    source: 'event_page',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('patron_pulse_responses')
    .upsert(responsePayload, {
      onConflict: 'pulse_id,user_id',
    });

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from('patron_pulse_checkins')
    .update({
      last_active_at: new Date().toISOString(),
    })
    .eq('session_id', pulse.session_id)
    .eq('user_id', user.id);

  revalidatePath(`/events/${slug}`);
}