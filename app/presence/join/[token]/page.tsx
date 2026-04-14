import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PresenceJoinPage({ params }: Props) {
  const { token } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session, error: sessionError } = await supabase
    .from('venue_presence_sessions')
    .select('id, venue_id, qr_token, status, ends_at, venue:venues(slug, name)')
    .eq('qr_token', token)
    .eq('status', 'active')
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    notFound();
  }

  const venueSlug =
    Array.isArray(session.venue) ? session.venue[0]?.slug : (session.venue as any)?.slug;

  if (!venueSlug) {
    notFound();
  }

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/presence/join/${token}`)}`);
  }

  const expiresAt =
    session.ends_at ||
    new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

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
        venue_id: session.venue_id,
        user_id: user.id,
        status: 'active',
        expires_at: expiresAt,
      });

  if (result.error) {
    throw new Error(result.error.message);
  }

  redirect(`/venues/${venueSlug}?presence_joined=1`);
}