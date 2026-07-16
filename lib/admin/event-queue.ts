import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventStatus } from '@/lib/events/workflow';

export type EventQueueSort =
  | 'newest'
  | 'oldest'
  | 'event_soonest'
  | 'event_latest'
  | 'recent_transition';

export type EventQueueUrgency =
  | 'all'
  | 'critical'
  | 'attention'
  | 'normal';

export type EventQueuePaymentFilter =
  | 'all'
  | 'paid'
  | 'unpaid'
  | 'override'
  | 'zero_balance';

export type EventQueueApprovalFilter =
  | 'all'
  | 'approved'
  | 'unapproved';

export type EventQueueFilters = {
  search?: string;
  status?: string;
  city?: string;
  state?: string;
  payment?: EventQueuePaymentFilter;
  approval?: EventQueueApprovalFilter;
  urgency?: EventQueueUrgency;
  sort?: EventQueueSort;
  page?: number;
  pageSize?: number;
};

export type EventQueueItem = {
  id: string;
  owner_id: string | null;

  name: string;
  slug: string | null;

  venue_name: string | null;
  city: string | null;
  state: string | null;

  flyer_url: string | null;

  status: string;

  is_public: boolean;
  is_approved: boolean;
  is_paid: boolean;
  payment_override: boolean;
  payment_status: string | null;

  total_price: number;
  payment_amount: number;

  event_start_at: string | null;
  event_end_at: string | null;

  promotion_start_at: string | null;
  promotion_end_at: string | null;

  submitted_at: string | null;
  created_at: string;
  updated_at: string;

  status_changed_at: string | null;
  status_change_reason: string | null;

  rejection_reason: string | null;
  removal_reason: string | null;

  refund_requested: boolean;
  refund_status: string | null;

  current_step: number | null;

  owner_name: string | null;
  owner_username: string | null;
  owner_role: string | null;

  urgency: EventQueueUrgency;
  urgencyReasons: string[];
  isFinanciallyEligible: boolean;
};

export type EventQueueResult = {
  items: EventQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;

  summary: {
    all: number;
    awaitingReview: number;
    revisions: number;
    paymentExceptions: number;
    removalRequests: number;
    refundRequests: number;
    publicPipeline: number;
  };
};

type EventQueueDatabaseRow = {
  id: string;
  owner_id: string | null;

  name: string | null;
  slug: string | null;

  venue_name: string | null;
  city: string | null;
  state: string | null;

  flyer_url: string | null;

  status: string | null;

  is_public: boolean | null;
  is_approved: boolean | null;
  is_paid: boolean | null;
  payment_override: boolean | null;
  payment_status: string | null;

  total_price: number | string | null;
  payment_amount: number | string | null;

  event_start_at: string | null;
  event_end_at: string | null;

  promotion_start_at: string | null;
  promotion_end_at: string | null;

  submitted_at: string | null;
  created_at: string;
  updated_at: string;

  status_changed_at: string | null;
  status_change_reason: string | null;

  rejection_reason: string | null;
  removal_reason: string | null;

  refund_requested: boolean | null;
  refund_status: string | null;

  current_step: number | null;

  profiles:
    | {
        display_name: string | null;
        username: string | null;
        app_role: string | null;
      }
    | Array<{
        display_name: string | null;
        username: string | null;
        app_role: string | null;
      }>
    | null;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function getAdminEventQueue(
  supabase: SupabaseClient,
  filters: EventQueueFilters = {}
): Promise<EventQueueResult> {
  const page = positiveInteger(filters.page, 1);

  const pageSize = Math.min(
    positiveInteger(filters.pageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );

  const search = clean(filters.search);
  const status = clean(filters.status);
  const city = clean(filters.city);
  const state = clean(filters.state).toUpperCase();

  const payment =
    filters.payment || 'all';

  const approval =
    filters.approval || 'all';

  const urgency =
    filters.urgency || 'all';

  const sort =
    filters.sort || 'newest';

  let query = supabase
    .from('events')
    .select(
      `
        id,
        owner_id,
        name,
        slug,
        venue_name,
        city,
        state,
        flyer_url,
        status,
        is_public,
        is_approved,
        is_paid,
        payment_override,
        payment_status,
        total_price,
        payment_amount,
        event_start_at,
        event_end_at,
        promotion_start_at,
        promotion_end_at,
        submitted_at,
        created_at,
        updated_at,
        status_changed_at,
        status_change_reason,
        rejection_reason,
        removal_reason,
        refund_requested,
        refund_status,
        current_step,
        profiles:owner_id (
          display_name,
          username,
          app_role
        )
      `,
      {
        count: 'exact',
      }
    );

  if (status && status !== 'all') {
    const statuses = status
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (statuses.length === 1) {
      query = query.eq('status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('status', statuses);
    }
  }

  if (city) {
    query = query.ilike('city', city);
  }

  if (state) {
    query = query.eq('state', state);
  }

  if (approval === 'approved') {
    query = query.eq('is_approved', true);
  }

  if (approval === 'unapproved') {
    query = query.eq('is_approved', false);
  }

  switch (payment) {
    case 'paid':
      query = query.or(
        'is_paid.eq.true,payment_status.eq.paid'
      );
      break;

    case 'unpaid':
      query = query
        .eq('is_paid', false)
        .neq('payment_status', 'paid')
        .eq('payment_override', false)
        .gt('total_price', 0);
      break;

    case 'override':
      query = query.eq('payment_override', true);
      break;

    case 'zero_balance':
      query = query.lte('total_price', 0);
      break;
  }

  if (search) {
    const safeSearch = escapePostgrestSearch(search);

    query = query.or(
      [
        `name.ilike.%${safeSearch}%`,
        `venue_name.ilike.%${safeSearch}%`,
        `city.ilike.%${safeSearch}%`,
        `state.ilike.%${safeSearch}%`,
        `slug.ilike.%${safeSearch}%`,
        `id.eq.${isUuid(search) ? search : ZERO_UUID}`,
      ].join(',')
    );
  }

  query = applySort(query, sort);

  /*
   * Urgency is derived from several fields and dates, so we
   * apply it after the database query. Fetching a larger
   * candidate window keeps pagination useful without moving
   * business logic into fragile PostgREST filters.
   */
  const requiresDerivedFilter = urgency !== 'all';

  const databasePageSize = requiresDerivedFilter
    ? Math.min(pageSize * 5, MAX_PAGE_SIZE)
    : pageSize;

  const databasePage = requiresDerivedFilter
    ? 1
    : page;

  const from =
    (databasePage - 1) * databasePageSize;

  const to = from + databasePageSize - 1;

  const {
    data,
    error,
    count,
  } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const normalized = (
    (data ?? []) as EventQueueDatabaseRow[]
  ).map(normalizeQueueItem);

  const urgencyFiltered =
    urgency === 'all'
      ? normalized
      : normalized.filter(
          (item) => item.urgency === urgency
        );

  const derivedStart =
    urgency === 'all'
      ? 0
      : (page - 1) * pageSize;

  const items =
    urgency === 'all'
      ? urgencyFiltered
      : urgencyFiltered.slice(
          derivedStart,
          derivedStart + pageSize
        );

  const derivedTotal =
    urgency === 'all'
      ? count ?? 0
      : urgencyFiltered.length;

  const summary = await getQueueSummary(
    supabase
  );

  return {
    items,
    total: derivedTotal,
    page,
    pageSize,
    pageCount: Math.max(
      Math.ceil(derivedTotal / pageSize),
      1
    ),
    summary,
  };
}

async function getQueueSummary(
  supabase: SupabaseClient
): Promise<EventQueueResult['summary']> {
  const [
    { count: all, error: allError },
    {
      count: awaitingReview,
      error: reviewError,
    },
    { count: revisions, error: revisionError },
    {
      data: paymentRows,
      error: paymentError,
    },
    {
      count: removalRequests,
      error: removalError,
    },
    {
      count: refundRequests,
      error: refundError,
    },
    {
      count: publicPipeline,
      error: publicError,
    },
  ] = await Promise.all([
    countEvents(supabase),

    countEvents(supabase, [
      'submitted',
      'paid_awaiting_approval',
      'approved_unpaid',
      'approved_awaiting_payment',
    ]),

    countEvents(supabase, [
      'revision_submitted',
    ]),

    supabase
      .from('events')
      .select(`
        status,
        is_paid,
        payment_status,
        payment_override,
        total_price
      `)
      .in('status', [
        'submitted',
        'approved_unpaid',
        'approved_awaiting_payment',
        'paid_awaiting_approval',
        'scheduled',
        'active',
        'live',
      ]),

    countEvents(supabase, [
      'removal_requested',
    ]),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .or(
        'status.eq.refund_requested,refund_status.eq.requested,refund_requested.eq.true'
      ),

    countEvents(supabase, [
      'scheduled',
      'active',
      'live',
    ]),
  ]);

  const errors = [
    allError,
    reviewError,
    revisionError,
    paymentError,
    removalError,
    refundError,
    publicError,
  ].filter(Boolean);

  if (errors.length) {
    throw new Error(
      errors
        .map((error) => error?.message)
        .filter(Boolean)
        .join(' | ')
    );
  }

  const paymentExceptions = (
    paymentRows ?? []
  ).filter((event) => {
    const financiallyEligible =
      event.is_paid === true ||
      event.payment_status === 'paid' ||
      event.payment_override === true ||
      Number(event.total_price ?? 0) <= 0;

    return (
      [
        'approved_unpaid',
        'approved_awaiting_payment',
        'paid_awaiting_approval',
      ].includes(event.status) ||
      (
        ['scheduled', 'active', 'live'].includes(
          event.status
        ) &&
        !financiallyEligible
      )
    );
  }).length;

  return {
    all: all ?? 0,
    awaitingReview:
      awaitingReview ?? 0,
    revisions: revisions ?? 0,
    paymentExceptions,
    removalRequests:
      removalRequests ?? 0,
    refundRequests:
      refundRequests ?? 0,
    publicPipeline:
      publicPipeline ?? 0,
  };
}

async function countEvents(
  supabase: SupabaseClient,
  statuses?: string[]
) {
  let query = supabase
    .from('events')
    .select('*', {
      count: 'exact',
      head: true,
    });

  if (statuses?.length) {
    query = query.in('status', statuses);
  }

  return query;
}

function normalizeQueueItem(
  row: EventQueueDatabaseRow
): EventQueueItem {
  const owner = Array.isArray(row.profiles)
    ? row.profiles[0]
    : row.profiles;

  const totalPrice = Number(
    row.total_price ?? 0
  );

  const paymentAmount = Number(
    row.payment_amount ?? totalPrice
  );

  const isFinanciallyEligible =
    row.is_paid === true ||
    row.payment_status === 'paid' ||
    row.payment_override === true ||
    totalPrice <= 0;

  const urgencyResult = deriveUrgency({
    status: row.status || 'draft',
    eventStartAt: row.event_start_at,
    submittedAt: row.submitted_at,
    statusChangedAt: row.status_changed_at,
    isFinanciallyEligible,
    refundRequested:
      row.refund_requested === true ||
      row.refund_status === 'requested',
  });

  return {
    id: String(row.id),
    owner_id: row.owner_id,

    name: row.name || 'Untitled Event',
    slug: row.slug,

    venue_name: row.venue_name,
    city: row.city,
    state: row.state,

    flyer_url: row.flyer_url,

    status: row.status || 'draft',

    is_public: row.is_public === true,
    is_approved: row.is_approved === true,
    is_paid: row.is_paid === true,
    payment_override:
      row.payment_override === true,
    payment_status: row.payment_status,

    total_price: totalPrice,
    payment_amount: paymentAmount,

    event_start_at: row.event_start_at,
    event_end_at: row.event_end_at,

    promotion_start_at:
      row.promotion_start_at,
    promotion_end_at:
      row.promotion_end_at,

    submitted_at: row.submitted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,

    status_changed_at:
      row.status_changed_at,
    status_change_reason:
      row.status_change_reason,

    rejection_reason:
      row.rejection_reason,
    removal_reason: row.removal_reason,

    refund_requested:
      row.refund_requested === true,
    refund_status: row.refund_status,

    current_step: row.current_step,

    owner_name:
      owner?.display_name || null,
    owner_username:
      owner?.username || null,
    owner_role:
      owner?.app_role || null,

    urgency: urgencyResult.urgency,
    urgencyReasons:
      urgencyResult.reasons,
    isFinanciallyEligible,
  };
}

function deriveUrgency(input: {
  status: string;
  eventStartAt: string | null;
  submittedAt: string | null;
  statusChangedAt: string | null;
  isFinanciallyEligible: boolean;
  refundRequested: boolean;
}): {
  urgency: EventQueueUrgency;
  reasons: string[];
} {
  const reasons: string[] = [];

  const now = Date.now();

  const eventStart = dateTime(
    input.eventStartAt
  );

  const submittedAt = dateTime(
    input.submittedAt
  );

  const statusChangedAt = dateTime(
    input.statusChangedAt
  );

  const hoursUntilEvent = eventStart
    ? (eventStart - now) / 3_600_000
    : null;

  const hoursInQueue = (
    submittedAt ||
    statusChangedAt
  )
    ? (
        now -
        Number(
          submittedAt ||
          statusChangedAt
        )
      ) / 3_600_000
    : 0;

  if (input.refundRequested) {
    reasons.push('Refund requested');
  }

  if (
    input.status === 'removal_requested'
  ) {
    reasons.push('Removal requested');
  }

  if (
    [
      'submitted',
      'paid_awaiting_approval',
      'revision_submitted',
    ].includes(input.status) &&
    hoursInQueue >= 24
  ) {
    reasons.push(
      `Waiting ${Math.floor(
        hoursInQueue
      )} hours for review`
    );
  }

  if (
    hoursUntilEvent !== null &&
    hoursUntilEvent >= 0 &&
    hoursUntilEvent <= 24 &&
    !['scheduled', 'active', 'live'].includes(
      input.status
    )
  ) {
    reasons.push(
      'Event begins within 24 hours'
    );
  }

  if (
    ['scheduled', 'active', 'live'].includes(
      input.status
    ) &&
    !input.isFinanciallyEligible
  ) {
    reasons.push(
      'Public status without financial eligibility'
    );
  }

  if (
    input.status ===
      'paid_awaiting_approval' &&
    hoursInQueue >= 12
  ) {
    reasons.push(
      'Paid event awaiting approval'
    );
  }

  if (
    input.status === 'rejected' &&
    hoursInQueue >= 72
  ) {
    reasons.push(
      'Rejected event awaiting owner response'
    );
  }

  if (
    reasons.some((reason) =>
      [
        'Refund requested',
        'Event begins within 24 hours',
        'Public status without financial eligibility',
      ].includes(reason)
    )
  ) {
    return {
      urgency: 'critical',
      reasons,
    };
  }

  if (reasons.length) {
    return {
      urgency: 'attention',
      reasons,
    };
  }

  return {
    urgency: 'normal',
    reasons: [],
  };
}

function applySort(
  query: any,
  sort: EventQueueSort
) {
  switch (sort) {
    case 'oldest':
      return query.order('created_at', {
        ascending: true,
      });

    case 'event_soonest':
      return query.order('event_start_at', {
        ascending: true,
        nullsFirst: false,
      });

    case 'event_latest':
      return query.order('event_start_at', {
        ascending: false,
        nullsFirst: false,
      });

    case 'recent_transition':
      return query.order(
        'status_changed_at',
        {
          ascending: false,
          nullsFirst: false,
        }
      );

    case 'newest':
    default:
      return query.order('created_at', {
        ascending: false,
      });
  }
}

function escapePostgrestSearch(
  value: string
) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(',', '\\,')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function positiveInteger(
  value: unknown,
  fallback: number
) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return Math.floor(parsed);
}

function clean(value: unknown) {
  return String(value || '').trim();
}

function dateTime(
  value?: string | null
) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

const ZERO_UUID =
  '00000000-0000-0000-0000-000000000000';