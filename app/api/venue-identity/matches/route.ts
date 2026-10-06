import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhysicalAddress } from '@/lib/events/address';
import { resolveVenueAuthority } from '@/lib/venues/authority';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const address = String(url.searchParams.get('address') || '').trim();
  const city = String(url.searchParams.get('city') || '').trim();
  const state = String(url.searchParams.get('state') || '').trim().toUpperCase();

  if (!address || !city || !state) {
    return NextResponse.json({
      location: null,
      venues: [],
    });
  }

  const normalizedAddress = normalizePhysicalAddress({
    address,
    city,
    state,
  });

  /*
   * BM1 identity doctrine:
   *
   * An address identifies a physical LOCATION, not a venue identity.
   * Multiple venue identities may occupy the same location, either
   * simultaneously or over time.
   *
   * venue_locations is therefore resolved first. venues.location_id
   * supplies the relationship from the physical place to the canonical
   * venue entities associated with it.
   */
  const { data: locations, error: locationError } = await supabase
    .from('venue_locations')
    .select('id,address,city,state,normalized_address')
    .eq('city', city)
    .eq('state', state)
    .limit(50);

  if (locationError) {
    return NextResponse.json(
      { error: locationError.message },
      { status: 500 },
    );
  }

  const location = (locations ?? []).find((candidate: any) => {
    const candidateNormalized =
      candidate.normalized_address ||
      normalizePhysicalAddress({
        address: String(candidate.address || ''),
        city: String(candidate.city || ''),
        state: String(candidate.state || ''),
      });

    return candidateNormalized === normalizedAddress;
  });

  if (!location) {
    return NextResponse.json({
      location: null,
      venues: [],
    });
  }

  const { data: venueRows, error: venueError } = await supabase
    .from('venues')
    .select(
      'id,name,address,city,state,slug,status,location_id,claim_state,verification_state',
    )
    .eq('location_id', location.id)
    .order('created_at', { ascending: false });

  if (venueError) {
    return NextResponse.json(
      { error: venueError.message },
      { status: 500 },
    );
  }

  const venues = await Promise.all(
    (venueRows ?? []).map(async (venue: any) => {
      const authority = await resolveVenueAuthority(
        supabase,
        String(venue.id),
        user.id,
      );

      return {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        slug: venue.slug,
        status: venue.status,
        claimState: venue.claim_state ?? null,
        verificationState: venue.verification_state ?? null,
        canManage: authority.canManage === true,
      };
    }),
  );

  return NextResponse.json({
    location: {
      id: location.id,
      address: location.address,
      city: location.city,
      state: location.state,
    },
    venues,
  });
}
