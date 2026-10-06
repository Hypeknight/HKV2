import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type VenueAuthoritySource = 'venue_manager' | 'admin' | 'none';
export type VenueAuthority = {
  canManage: boolean;
  source: VenueAuthoritySource;
  role: string | null;
};

/**
 * Server-only BM1 authority. The user ID always comes from auth.getUser(),
 * never from action input. 0026 backfilled owners into venue_managers;
 * owner_id is compatibility/history only. Payment and global venue_owner
 * roles do not grant authority. Database errors fail closed.
 */
export async function resolveVenueAuthority(venueId: string): Promise<VenueAuthority> {
  const denied: VenueAuthority = { canManage: false, source: 'none', role: null };
  if (!venueId) return denied;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return denied;
  if (authError) throw authError;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile?.app_role === 'admin') {
    return { canManage: true, source: 'admin', role: 'admin' };
  }

  // 0026 restricts this table to service_role. This lookup grants no write client.
  const { data: manager, error: managerError } = await createAdminClient()
    .from('venue_managers')
    .select('role,status')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (managerError) throw managerError;
  if (manager) {
    return { canManage: true, source: 'venue_manager', role: manager.role };
  }
  return denied;
}

export async function requireVenueAuthority(venueId: string): Promise<VenueAuthority> {
  const authority = await resolveVenueAuthority(venueId);
  if (!authority.canManage) {
    throw new Error('You are not authorized to manage this venue.');
  }
  return authority;
}

/** Current user's active venue IDs. No owner fallback or caller-supplied user ID. */
export async function getManagedVenueIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return [];
  if (authError) throw authError;
  const { data, error } = await createAdminClient()
    .from('venue_managers')
    .select('venue_id')
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => String(row.venue_id))));
}
