import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  buildShareMetadata,
  cleanMetadataText,
} from '@/lib/metadata/share';

type EventMetadataRecord = {
  slug: string;
  name: string | null;
  description: string | null;
  flyer_url: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  event_start_at: string | null;
  venue:
    | {
        name: string | null;
        city: string | null;
        state: string | null;
      }
    | Array<{
        name: string | null;
        city: string | null;
        state: string | null;
      }>
    | null;
};

export async function getEventShareMetadata(
  slug: string
): Promise<Metadata> {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select(`
      slug,
      name,
      description,
      flyer_url,
      venue_name,
      city,
      state,
      event_start_at,
      venue:venues(
        name,
        city,
        state
      )
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .in('status', ['scheduled', 'active', 'live'])
    .is('removed_at', null)
    .maybeSingle();

  if (!event) {
    return buildShareMetadata({
      title: 'Event Not Available | HypeKnight',
      description:
        'This event is no longer available. Browse current nightlife and event listings on HypeKnight.',
      path: `/events/${slug}`,
    });
  }

  const typedEvent =
    event as EventMetadataRecord;

  const venue = Array.isArray(
    typedEvent.venue
  )
    ? typedEvent.venue[0] || null
    : typedEvent.venue;

  const venueName =
    typedEvent.venue_name ||
    venue?.name ||
    null;

  const city =
    typedEvent.city ||
    venue?.city ||
    null;

  const state =
    typedEvent.state ||
    venue?.state ||
    null;

  const location = [
    venueName,
    city,
    state,
  ]
    .filter(Boolean)
    .join(' · ');

  const dateText = formatShareDate(
    typedEvent.event_start_at
  );

  const fallbackDescription = [
    dateText,
    location,
  ]
    .filter(Boolean)
    .join(' — ');

  const title = `${cleanMetadataText(
    typedEvent.name,
    'HypeKnight Event'
  )} | HypeKnight`;

  const description =
    cleanMetadataText(
      typedEvent.description,
      fallbackDescription ||
        'Discover this event on HypeKnight.'
    );

  return buildShareMetadata({
    title,
    description,
    path: `/events/${typedEvent.slug}`,
    image: typedEvent.flyer_url,
    imageAlt: `${
      typedEvent.name || 'HypeKnight event'
    } flyer`,
    type: 'article',
  });
}

function formatShareDate(
  value?: string | null
) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(date);
}