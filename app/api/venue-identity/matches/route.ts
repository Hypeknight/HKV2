import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhysicalAddress } from '@/lib/events/address';
import { resolveVenueAuthority } from '@/lib/venues/authority';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const address = String(url.searchParams.get('address') || '').trim();
  const city = String(url.searchParams.get('city') || '').trim();
  const state = String(url.searchParams.get('state') || '').trim().toUpperCase();
  if (!address || !city || !state) return NextResponse.json({ match: null });

  const target = normalizePhysicalAddress({ address, city, state });
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, address, city, state, slug, owner_id, status')
    .eq('city', city)
    .eq('state', state)
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const match = (data || []).find((venue: any) =>
    normalizePhysicalAddress({
      address: String(venue.address || ''),
      city: String(venue.city || ''),
      state: String(venue.state || ''),
    }) === target
  );

  const authority = match
    ? await resolveVenueAuthority(supabase, String(match.id), user.id)
    : null;

  return NextResponse.json({
    match: match ? {
      id: match.id,
      name: match.name,
      address: match.address,
      city: match.city,
      state: match.state,
      slug: match.slug,
      // Compatibility response name retained for the current event builder.
      // Semantics are BM1 management authority, not legacy venues.owner_id.
      ownedByCurrentUser: authority?.canManage === true,
    } : null,
  });
}
