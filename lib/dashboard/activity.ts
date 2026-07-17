import type { SupabaseClient } from '@supabase/supabase-js';

export type OwnerActivityItem = {
  id: string;
  event_id: string;
  event_name: string;
  kind: 'lifecycle' | 'administrative';
  action: string;
  title: string;
  message: string | null;
  source: string;
  created_at: string;
};

export type OwnerActivityFilters = {
  search?: string;
  eventId?: string;
  page?: number;
  pageSize?: number;
};

export type OwnerActivityResult = {
  items: OwnerActivityItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function getOwnerActivity(
  supabase: SupabaseClient,
  ownerId: string,
  filters: OwnerActivityFilters = {}
): Promise<OwnerActivityResult> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, filters.pageSize || 30)
  );

  const { data: ownedEvents, error: ownedEventsError } =
    await supabase
      .from('events')
      .select('id, name')
      .eq('owner_id', ownerId);

  if (ownedEventsError) {
    throw new Error(ownedEventsError.message);
  }

  const eventMap = new Map<string, string>();

  for (const event of ownedEvents || []) {
    eventMap.set(
      String(event.id),
      String(event.name || 'Untitled Event')
    );
  }

  const eventIds = [...eventMap.keys()];

  if (!eventIds.length) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      pageCount: 1,
    };
  }

  let lifecycleQuery = supabase
    .from('event_status_history')
    .select(`
      id,
      event_id,
      from_status,
      to_status,
      changed_by_role,
      reason,
      note,
      source,
      created_at
    `)
    .in('event_id', eventIds)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (filters.eventId) {
    lifecycleQuery = lifecycleQuery.eq(
      'event_id',
      filters.eventId
    );
  }

  const { data: lifecycleRows, error: lifecycleError } =
    await lifecycleQuery;

  if (lifecycleError) {
    throw new Error(lifecycleError.message);
  }

  let activityQuery = supabase
    .from('admin_activity_log')
    .select(`
      id,
      action,
      entity_id,
      entity_name,
      reason,
      note,
      source,
      created_at,
      metadata
    `)
    .eq('entity_type', 'event')
    .in('entity_id', eventIds)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (filters.eventId) {
    activityQuery = activityQuery.eq(
      'entity_id',
      filters.eventId
    );
  }

  const { data: adminRows, error: adminError } =
    await activityQuery;

  if (adminError) {
    throw new Error(adminError.message);
  }

  const lifecycleItems: OwnerActivityItem[] =
    (lifecycleRows || []).map((row) => ({
      id: `lifecycle:${String(row.id)}`,
      event_id: String(row.event_id),
      event_name:
        eventMap.get(String(row.event_id)) ||
        'Untitled Event',
      kind: 'lifecycle',
      action: String(row.to_status || 'updated'),
      title: ownerLifecycleTitle(
        String(row.to_status || 'updated')
      ),
      message: ownerSafeMessage(
        row.reason || row.note
      ),
      source: String(row.source || 'system'),
      created_at: String(row.created_at),
    }));

  const administrativeItems: OwnerActivityItem[] =
    (adminRows || [])
      .filter((row) =>
        isOwnerVisibleAdminAction(
          String(row.action || '')
        )
      )
      .map((row) => ({
        id: `admin:${String(row.id)}`,
        event_id: String(row.entity_id),
        event_name:
          eventMap.get(String(row.entity_id)) ||
          String(row.entity_name || 'Untitled Event'),
        kind: 'administrative',
        action: String(row.action || 'updated'),
        title: ownerAdminTitle(
          String(row.action || 'updated')
        ),
        message: ownerSafeMessage(row.reason),
        source: String(row.source || 'admin_action'),
        created_at: String(row.created_at),
      }));

  let items = [
    ...lifecycleItems,
    ...administrativeItems,
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  if (filters.search) {
    const search = filters.search
      .trim()
      .toLowerCase();

    items = items.filter((item) =>
      [
        item.event_name,
        item.title,
        item.message,
        item.action,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }

  const deduped = dedupeOwnerActivity(items);
  const total = deduped.length;
  const pageCount = Math.max(
    1,
    Math.ceil(total / pageSize)
  );
  const safePage = Math.min(page, pageCount);
  const from = (safePage - 1) * pageSize;

  return {
    items: deduped.slice(from, from + pageSize),
    total,
    page: safePage,
    pageSize,
    pageCount,
  };
}

function dedupeOwnerActivity(
  items: OwnerActivityItem[]
) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const timestampBucket = Math.floor(
      new Date(item.created_at).getTime() / 5000
    );

    const key = [
      item.event_id,
      normalizeAction(item.action),
      timestampBucket,
    ].join(':');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isOwnerVisibleAdminAction(action: string) {
  return [
    'approve_event',
    'reject_event',
    'apply_payment_override',
    'approve_event_revision',
    'reject_event_revision',
    'event_hide',
    'event_unhide',
    'event_reactivate',
    'event_cancel',
    'event_remove',
    'manual_event_status_change',
  ].includes(action);
}

function ownerLifecycleTitle(status: string) {
  const labels: Record<string, string> = {
    draft: 'Event draft created',
    building: 'Event listing updated',
    submitted: 'Event submitted for review',
    approved_unpaid: 'Event approved — payment required',
    approved_awaiting_payment:
      'Event approved — awaiting payment',
    paid_awaiting_approval:
      'Payment received — review pending',
    rejected: 'Changes requested',
    revision_draft: 'Revision opened',
    revision_submitted: 'Revision submitted',
    scheduled: 'Event scheduled',
    active: 'Promotion active',
    live: 'Event live',
    removal_requested: 'Removal request received',
    refund_requested: 'Refund request received',
    cancelled: 'Event cancelled',
    removed: 'Event removed',
    ended: 'Event ended',
    completed: 'Event completed',
    archived: 'Event archived',
  };

  return labels[status] || formatLabel(status);
}

function ownerAdminTitle(action: string) {
  const labels: Record<string, string> = {
    approve_event: 'HypeKnight approved your event',
    reject_event: 'HypeKnight requested changes',
    apply_payment_override:
      'Payment requirement was overridden',
    approve_event_revision:
      'Your revision was approved',
    reject_event_revision:
      'More revision changes are required',
    event_hide:
      'Your event was hidden',
    event_unhide:
      'Your event was restored',
    event_reactivate:
      'Your event was reactivated',
    event_cancel:
      'Your event was cancelled',
    event_remove:
      'Your event was removed',
    manual_event_status_change:
      'Your event status was updated',
  };

  return labels[action] || formatLabel(action);
}

function ownerSafeMessage(value: unknown) {
  if (!value) {
    return null;
  }

  return String(value)
    .replace(/\badmin(?:istrative)?\b/gi, 'HypeKnight')
    .replace(/\bmoderator\b/gi, 'HypeKnight team');
}

function normalizeAction(value: string) {
  return value
    .replace(/^event_/, '')
    .replaceAll('_', '-');
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}