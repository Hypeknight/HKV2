import 'server-only';
import { requireVenueManagement } from '@/lib/venues/require-management';

export const VENUE_MANAGER_ROLES = ['owner', 'manager', 'staff'] as const;
export const VENUE_MANAGER_STATUSES = ['active', 'suspended', 'removed'] as const;

export async function requireVenueManagerAdministration(venueId: string) {
  const context = await requireVenueManagement(venueId);
  if (context.authority.source !== 'admin') throw new Error('Administrator access required for manager changes');
  return context;
}

export async function saveVenueManager(input: {
  venueId: string; managerId?: string; targetUserId?: string; role: string;
  status: string; confirmed: boolean; expectedUpdatedAt?: string;
}) {
  const { supabase } = await requireVenueManagerAdministration(input.venueId);
  if (!input.confirmed) throw new Error('Explicit authority change confirmation required');
  if (!VENUE_MANAGER_ROLES.includes(input.role as typeof VENUE_MANAGER_ROLES[number])
      || !VENUE_MANAGER_STATUSES.includes(input.status as typeof VENUE_MANAGER_STATUSES[number])) {
    throw new Error('Invalid manager role or status');
  }
  const { data: venue, error: venueError } = await supabase.from('venues').select('id').eq('id', input.venueId).single();
  if (venueError || !venue) throw new Error(venueError?.message || 'Venue not found');
  const updated_at = new Date().toISOString();
  if (input.managerId) {
    const { data: current, error } = await supabase.from('venue_managers')
      .select('id,role,status,updated_at').eq('id', input.managerId).eq('venue_id', input.venueId).single();
    if (error || !current) throw new Error(error?.message || 'Manager relationship not found');
    if (!input.expectedUpdatedAt || input.expectedUpdatedAt !== current.updated_at) throw new Error('Manager relationship changed; reload before retrying');
    // Optimistic concurrency prevents a stale form overwriting a later authority decision.
    const { data, error: updateError } = await supabase.from('venue_managers')
      .update({ role: input.role, status: input.status, updated_at })
      .eq('id', input.managerId).eq('venue_id', input.venueId).eq('updated_at', input.expectedUpdatedAt)
      .select('id').single();
    if (updateError || !data) throw new Error(updateError?.message || 'Manager relationship changed; reload before retrying');
  } else {
    if (!input.targetUserId || !/^[0-9a-f-]{36}$/i.test(input.targetUserId) || input.status !== 'active') {
      throw new Error('Select an existing account to add as an active manager');
    }
    const { data: target, error: targetError } = await supabase.from('profiles').select('id')
      .eq('id', input.targetUserId).single();
    if (targetError || !target) throw new Error(targetError?.message || 'Account not found');
    const { error } = await supabase.from('venue_managers').insert({
      venue_id: input.venueId, user_id: target.id, role: input.role, status: 'active',
    });
    if (error) throw new Error(error.code === '23505' ? 'Relationship already exists; update its status instead' : error.message);
  }
  // No hard deletion, owner compatibility rewrite, claim creation or identity mutation.
  // All revocations are explicitly confirmed by an admin. Zero active managers is
  // permitted by BM1: the entity remains valid under HypeKnight/admin stewardship.
}
