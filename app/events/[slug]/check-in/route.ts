import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/metadata/share';
import { PRESENCE_PARTICIPANT_COOKIE, parseParticipantToken } from '@/lib/presence/participant-cookie';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  // Render's request origin is internal; use configured public origin, not host headers.
  const publicOrigin = getSiteUrl().origin;
  const { slug } = await params;
  const supabase = await createClient();
  // User-client RLS establishes the public event context; the RPC independently
  // validates lifecycle and credential. No client verification/user ID is trusted.
  const { data: event, error } = await supabase.from('events').select('id,slug').eq('slug', slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) return NextResponse.redirect(new URL('/events', publicOrigin));
  const destination = new URL(`/events/${encodeURIComponent(event.slug)}`, publicOrigin);
  const credential = request.nextUrl.searchParams.get('credential');
  if (!credential) {
    destination.searchParams.set('presence', 'credential_required');
    return NextResponse.redirect(destination);
  }
  const { data: token, error: joinError } = await supabase.rpc('join_event_presence', {
    p_event_id: event.id,
    p_credential: credential,
    p_participant_token: parseParticipantToken(request.cookies.get(PRESENCE_PARTICIPANT_COOKIE)?.value),
  });
  // Presence itself remains valid when a Pulse session has not opened yet.
  // If it is open, the actual QR join also records the participant check-in.
  if (!joinError && parseParticipantToken(token)) {
    await supabase.rpc('check_in_patron_pulse', { p_event_id: event.id, p_token: token });
  }
  destination.searchParams.set('presence', joinError ? 'unavailable' : 'verified');
  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  if (!joinError && parseParticipantToken(token)) {
    response.cookies.set(PRESENCE_PARTICIPANT_COOKIE, token, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
