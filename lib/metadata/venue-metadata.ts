import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  buildShareMetadata,
  cleanMetadataText,
} from '@/lib/metadata/share';

type VenueMetadataRecord = {
  slug: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
};

export async function getVenueShareMetadata(
  slug: string
): Promise<Metadata> {
  const supabase = await createClient();

  /*
   * Adjust image_url or logo_url here only if your venues
   * table uses different image column names.
   */
  const { data: venue } = await supabase
    .from('venues')
    .select(`
      slug,
      name,
      description,
      image_url,
      logo_url,
      city,
      state
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (!venue) {
    return buildShareMetadata({
      title: 'Venue Not Available | HypeKnight',
      description:
        'Browse nightlife venues and upcoming events on HypeKnight.',
      path: `/venues/${slug}`,
    });
  }

  const typedVenue =
    venue as VenueMetadataRecord;

  const location = [
    typedVenue.city,
    typedVenue.state,
  ]
    .filter(Boolean)
    .join(', ');

  const title = `${cleanMetadataText(
    typedVenue.name,
    'HypeKnight Venue'
  )} | HypeKnight`;

  const description =
    cleanMetadataText(
      typedVenue.description,
      location
        ? `Explore ${typedVenue.name || 'this venue'} in ${location}, including upcoming events and nightlife details on HypeKnight.`
        : 'Explore this venue, upcoming events, and nightlife details on HypeKnight.'
    );

  return buildShareMetadata({
    title,
    description,
    path: `/venues/${typedVenue.slug}`,
    image:
      typedVenue.image_url ||
      typedVenue.logo_url,
    imageAlt: `${
      typedVenue.name || 'HypeKnight venue'
    } image`,
  });
}