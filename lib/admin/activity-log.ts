import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminActivityCategory =
  | 'event'
  | 'venue'
  | 'payment'
  | 'support'
  | 'ambassador'
  | 'coupon'
  | 'notification'
  | 'employee'
  | 'finance'
  | 'marketing'
  | 'security'
  | 'system';

export type AdminActivityInput = {
  supabase: SupabaseClient;
  actorId: string;
  actorRole?: string | null;
  actorName?: string | null;

  category: AdminActivityCategory;
  action: string;

  entityType: string;
  entityId?: string | null;
  entityName?: string | null;

  previousState?: unknown;
  newState?: unknown;

  reason?: string | null;
  note?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
};

function jsonValue(value: unknown) {
  if (value === undefined) return null;
  return value;
}

/**
 * Records an administrative operation without allowing an activity-log
 * failure to reverse or corrupt the operation that already succeeded.
 */
export async function logAdminActivity({
  supabase,
  actorId,
  actorRole = 'admin',
  actorName = null,
  category,
  action,
  entityType,
  entityId = null,
  entityName = null,
  previousState,
  newState,
  reason = null,
  note = null,
  source = 'admin_action',
  metadata = {},
}: AdminActivityInput): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_activity_log')
      .insert({
        actor_id: actorId,
        actor_role: actorRole,
        actor_name: actorName,

        category,
        action,

        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,

        previous_state: jsonValue(previousState),
        new_state: jsonValue(newState),

        reason,
        note,
        source,
        metadata,
      });

    if (error) {
      console.error('Admin activity log insert failed:', {
        message: error.message,
        code: error.code,
        actorId,
        action,
        entityType,
        entityId,
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected admin activity logging failure:', {
      error,
      actorId,
      action,
      entityType,
      entityId,
    });

    return false;
  }
}