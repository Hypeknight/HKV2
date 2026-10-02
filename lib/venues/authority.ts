import type { SupabaseClient } from '@supabase/supabase-js';

export type VenueAuthoritySource =
  | 'venue_manager'
  | 'legacy_owner'
  | 'admin'
  | 'none';

export type VenueAuthority = {
  canManage: boolean;
  source: VenueAuthoritySource;
  role: string | null;
};

/**
 * BM1 venue authority.
 *
 * Authority order:
 *   1. Active venue-specific manager relationship
 *   2. Legacy venues.owner_id compatibility fallback
 *   3. HypeKnight administrator
 *
 * Subscription/payment state never determines management authority.
 */
export async function resolveVenueAuthority(
  supabase: SupabaseClient,
  venueId: string,
  userId: string,
): Promise<VenueAuthority> {
  if (!venueId || !userId) {
    return { canManage: false, source: 'none', role: null };
  }

  const { data: manager, error: managerError } = await supabase
    .from('venue_managers')
    .select('role,status')
    .eq('venue_id', venueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  // During the migration window, absence of the new relationship must not
  // break legitimate legacy owners. Unexpected DB errors still fail closed.
  if (managerError && managerError.code !== '42P01') {
    throw managerError;
  }

  if (manager) {
    return {
      canManage: true,
      source: 'venue_manager',
      role: typeof manager.role === 'string' ? manager.role : 'manager',
    };
  }

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('owner_id')
    .eq('id', venueId)
    .maybeSingle();

  if (venueError) throw venueError;

  if (venue?.owner_id === userId) {
    return {
      canManage: true,
      source: 'legacy_owner',
      role: 'owner',
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (profile?.role === 'admin') {
    return {
      canManage: true,
      source: 'admin',
      role: 'admin',
    };
  }

  return {
    canManage: false,
    source: 'none',
    role: null,
  };
}

export async function requireVenueAuthority(
  supabase: SupabaseClient,
  venueId: string,
  userId: string,
): Promise<VenueAuthority> {
  const authority = await resolveVenueAuthority(supabase, venueId, userId);

  if (!authority.canManage) {
    throw new Error('You are not authorized to manage this venue.');
  }

  return authority;
}
