import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validatePresenceCredential } from '@/lib/presence/credentials';
import {
  resolvePresenceParticipant,
  verifyPresence,
} from '@/lib/presence/service';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ credential?: string | string[] }>;
};

function isEventLive(
  startAt: string | null,
  endAt: string | null,
  now = new Date(),
) {
  if (!startAt) return false;

  const start = new Date(startAt);

  if (Number.isNaN(start.getTime())) {
    return false;
  }

  const suppliedEnd = endAt ? new Date(endAt) : null;

  const effectiveEnd =
    suppliedEnd && !Number.isNaN(suppliedEnd.getTime())
      ? suppliedEnd
      : new Date(start.getTime() + 30 * 60 * 1000);

  return now >= start && now <= effectiveEnd;
}

export default async function EventPatronPulseCheckInPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawCredential = resolvedSearchParams.credential;
  const credential =
    typeof rawCredential === 'string' ? rawCredential.trim() : '';
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event, error } = await supabase
    .from('events')
    .select('id,slug,status,event_start_at,event_end_at,venue_id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!event) {
    redirect('/events');
  }

  const eventHref = `/events/${encodeURIComponent(event.slug)}`;

  if (
    event.status === 'cancelled' ||
    event.status === 'completed' ||
    !isEventLive(event.event_start_at, event.event_end_at)
  ) {
    redirect(`${eventHref}?presence=unavailable`);
  }

  if (!credential) {
    redirect(`${eventHref}?presence=credential_required`);
  }

  const presenceCredential = await validatePresenceCredential({
    credential,
    contextType: 'event',
    eventId: event.id,
  });

  if (!presenceCredential) {
    redirect(`${eventHref}?presence=invalid_credential`);
  }

  const participant = await resolvePresenceParticipant({
    userId: user?.id ?? null,
  });

  await verifyPresence({
    participantId: participant.id,
    contextType: 'event',
    eventId: event.id,
    venueId: null,
    method: 'static_qr',
    verificationLevel: 'presence_supported',
    confidence: 0.8,
    metadata: {
      source: 'official_event_check_in',
      eventSlug: event.slug,
      credentialId: presenceCredential.id,
      credentialType: presenceCredential.credential_type,
    },
    expiresAt: event.event_end_at ?? null,
  });

  const cookieStore = await cookies();

  cookieStore.set(
    'hk_presence_participant',
    participant.participant_token,
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    },
  );

  redirect(`${eventHref}?presence=verified`);
}
