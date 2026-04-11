'use server';

import { randomBytes } from 'crypto';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function randomCode(length = 6) {
  return randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}

function randomToken(length = 24) {
  return randomBytes(length).toString('hex');
}

async function requireVenueOwnerOrAdminForVenue(venueId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.app_role === 'admin';

  const venueQuery = supabase.from('venues').select('*').eq('id', venueId);
  const { data: venue, error } = isAdmin
    ? await venueQuery.single()
    : await venueQuery.eq('owner_id', user.id).single();

  if (error || !venue) {
    throw new Error(error?.message || 'Venue not found');
  }

  return { supabase, user, venue, isAdmin };
}

export async function createVenuePresenceSession(formData: FormData) {
  const venueId = String(formData.get('venue_id') || '');
  const durationHours = Number(formData.get('duration_hours') || 4);

  const { supabase, user, venue } = await requireVenueOwnerOrAdminForVenue(venueId);

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

  const { supabase, venue } = await requireVenueOwnerOrAdminForVenue(venueId);

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

  const { data: session, error: sessionError } = await supabase
    .from('venue_presence_sessions')
    .select('*')
    .eq('venue_id', venueId)
    .eq('session_code', sessionCode)
    .eq('status', 'active')
    .maybeSingle();

  if (sessionError || !session) {
    redirect(`/venues/${venueSlug}?presence_error=invalid_code`);
  }

  const expiresAt = session.ends_at
    ? session.ends_at
    : new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from('venue_presence_checkins')
    .select('id')
    .eq('venue_presence_session_id', session.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const result = existing
    ? await supabase
        .from('venue_presence_checkins')
        .update({
          status: 'active',
          expires_at: expiresAt,
        })
        .eq('id', existing.id)
    : await supabase.from('venue_presence_checkins').insert({
        venue_presence_session_id: session.id,
        venue_id: venueId,
        user_id: user.id,
        status: 'active',
        expires_at: expiresAt,
      });

  if (result.error) {
    throw new Error(result.error.message);
  }

  redirect(`/venues/${venueSlug}?presence_joined=1`);
}