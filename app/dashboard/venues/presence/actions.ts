'use server';

import { randomBytes } from 'crypto';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { recordSignal } from '@/lib/signals/server';
import { requireVenueAuthority } from '@/lib/venues/authority';

function randomCode(length = 6) {
  return randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}

function randomToken(length = 24) {
  return randomBytes(length).toString('hex');
}


export async function createVenuePresenceSession(formData: FormData) {
  const venueId = String(formData.get('venue_id') || '');
  const durationHours = Number(formData.get('duration_hours') || 4);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  await requireVenueAuthority(venueId);

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single();

  if (venueError || !venue) {
    throw new Error(venueError?.message || 'Venue not found');
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('venue_presence_sessions').insert({
    venue_id: venueId,
    session_code: randomCode(6),
    qr_token: randomToken(24),
    status: 'active',
    starts_at: now.toISOString(),
    ends_at: endsAt,
    created_by: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/venues/${venue.id}/presence?created=1`);
}

export async function closeVenuePresenceSession(formData: FormData) {
  const venueId = String(formData.get('venue_id') || '');
  const sessionId = String(formData.get('session_id') || '');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  await requireVenueAuthority(venueId);

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, slug')
    .eq('id', venueId)
    .single();

  if (venueError || !venue) {
    throw new Error(venueError?.message || 'Venue not found');
  }

  const { error } = await supabase
    .from('venue_presence_sessions')
    .update({
      status: 'closed',
      ends_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('venue_id', venueId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/venues/${venue.id}/presence?closed=1`);
}

export async function joinVenuePresenceSession(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const venueSlug = String(formData.get('venue_slug') || '');
  const venueId = String(formData.get('venue_id') || '');
  const sessionCode = String(formData.get('session_code') || '').trim().toUpperCase();

  const { data: checkinId, error } = await supabase.rpc('join_venue_presence_session', {
    p_venue_id: venueId, p_session_code: sessionCode,
  });
  if (error || !checkinId) {
    redirect('/venues/' + venueSlug + '?presence_error=invalid_code');
  }
  const { data: checkin, error: checkinError } = await supabase
    .from('venue_presence_checkins').select('venue_presence_session_id')
    .eq('id', checkinId).eq('user_id', user.id).single();
  if (checkinError || !checkin) throw new Error(checkinError?.message || 'Presence checkin not found');
  // SIGNAL BRIDGE: a rotating venue presence session/code gives stronger
  // contextual evidence than an ordinary button click, but it is intentionally
  // not labeled physically verified.
  await recordSignal(supabase, {
    signalType: 'venue_presence_joined',
    subjectType: 'venue',
    subjectId: venueId,
    venueId,
    source: 'venue_presence',
    surface: 'venue_detail',
    sessionId: checkin.venue_presence_session_id,
    verificationLevel: 'presence_supported',
    metadata: { join_method: 'session_code' },
  });

  redirect(`/venues/${venueSlug}?presence_joined=1`);
}