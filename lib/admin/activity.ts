import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminActivityItem = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_name: string | null;

  category: string;
  action: string;

  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;

  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;

  reason: string | null;
  note: string | null;
  source: string;
  metadata: Record<string, unknown>;

  created_at: string;
};

export type AdminActivityFilters = {
  search?: string;
  category?: string;
  action?: string;
  entityType?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type AdminActivityResult = {
  items: AdminActivityItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function getAdminActivity(
  supabase: SupabaseClient,
  filters: AdminActivityFilters = {}
): Promise<AdminActivityResult> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, filters.pageSize || 30)
  );

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('admin_activity_log')
    .select(
      `
        id,
        actor_id,
        actor_role,
        actor_name,
        category,
        action,
        entity_type,
        entity_id,
        entity_name,
        previous_state,
        new_state,
        reason,
        note,
        source,
        metadata,
        created_at
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  if (filters.actorId) {
    query = query.eq('actor_id', filters.actorId);
  }

  if (filters.dateFrom) {
    query = query.gte(
      'created_at',
      new Date(`${filters.dateFrom}T00:00:00`).toISOString()
    );
  }

  if (filters.dateTo) {
    query = query.lte(
      'created_at',
      new Date(`${filters.dateTo}T23:59:59.999`).toISOString()
    );
  }

  if (filters.search) {
    const safe = escapePostgrestSearch(filters.search);

    query = query.or(
      [
        `actor_name.ilike.%${safe}%`,
        `entity_name.ilike.%${safe}%`,
        `entity_id.ilike.%${safe}%`,
        `action.ilike.%${safe}%`,
        `reason.ilike.%${safe}%`,
        `note.ilike.%${safe}%`,
      ].join(',')
    );
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const items = (data || []).map(normalizeActivityItem);
  const total = count || 0;

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminActivityOptions(
  supabase: SupabaseClient
) {
  const { data, error } = await supabase
    .from('admin_activity_log')
    .select('category, action, entity_type, actor_id, actor_name')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data || [];

  return {
    categories: uniqueSorted(
      rows.map((row) => String(row.category || ''))
    ),
    actions: uniqueSorted(
      rows.map((row) => String(row.action || ''))
    ),
    entityTypes: uniqueSorted(
      rows.map((row) => String(row.entity_type || ''))
    ),
    actors: uniqueActors(
      rows.map((row) => ({
        id: row.actor_id ? String(row.actor_id) : '',
        name: row.actor_name ? String(row.actor_name) : '',
      }))
    ),
  };
}

function normalizeActivityItem(
  row: Record<string, unknown>
): AdminActivityItem {
  return {
    id: String(row.id),
    actor_id: nullableString(row.actor_id),
    actor_role: nullableString(row.actor_role),
    actor_name: nullableString(row.actor_name),

    category: String(row.category || 'system'),
    action: String(row.action || 'unknown_action'),

    entity_type: String(row.entity_type || 'unknown'),
    entity_id: nullableString(row.entity_id),
    entity_name: nullableString(row.entity_name),

    previous_state: objectValue(row.previous_state),
    new_state: objectValue(row.new_state),

    reason: nullableString(row.reason),
    note: nullableString(row.note),
    source: String(row.source || 'admin_action'),
    metadata: objectValue(row.metadata) || {},

    created_at: String(row.created_at),
  };
}

function objectValue(
  value: unknown
): Record<string, unknown> | null {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}

function nullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function uniqueActors(
  actors: Array<{ id: string; name: string }>
) {
  const map = new Map<string, string>();

  for (const actor of actors) {
    if (!actor.id) continue;

    if (!map.has(actor.id)) {
      map.set(actor.id, actor.name || actor.id.slice(0, 8));
    }
  }

  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function escapePostgrestSearch(value: string) {
  return value
    .trim()
    .replaceAll(',', ' ')
    .replaceAll('(', ' ')
    .replaceAll(')', ' ')
    .replaceAll('%', '');
}