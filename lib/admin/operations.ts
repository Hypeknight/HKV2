import { createClient } from '@/lib/supabase/server';

export type OperationsSummary = {
  users: number;
  events: number;
  venues: number;
  externalEvents: number;

  pendingModeration: number;
  pendingRevisions: number;
  removalRequests: number;
  refundRequests: number;
  paymentExceptions: number;

  scheduledEvents: number;
  activeEvents: number;
  liveEvents: number;

  recentTransitions: OperationsActivity[];
};

export type OperationsActivity = {
  id: string;
  event_id: string;
  event_name: string;
  from_status: string | null;
  to_status: string;
  changed_by_role: string | null;
  reason: string | null;
  source: string;
  created_at: string;
};

export async function getOperationsSummary(): Promise<OperationsSummary> {
  const supabase = await createClient();

  const [
    { count: userCount, error: userError },
    { count: eventCount, error: eventError },
    { count: venueCount, error: venueError },
    { count: externalEventCount, error: externalError },

    { count: pendingModeration, error: moderationError },
    { count: pendingRevisions, error: revisionError },
    { count: removalRequests, error: removalError },
    { count: refundRequests, error: refundError },

    { count: scheduledEvents, error: scheduledError },
    { count: activeEvents, error: activeError },
    { count: liveEvents, error: liveError },

    { data: paymentExceptionRows, error: paymentExceptionError },
    { data: transitionRows, error: transitionError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('venues')
      .select('*', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('external_events')
      .select('*', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .in('status', [
        'submitted',
        'paid_awaiting_approval',
        'approved_unpaid',
        'approved_awaiting_payment',
      ]),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'revision_submitted'),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'removal_requested'),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .or(
        'status.eq.refund_requested,refund_status.eq.requested,refund_requested.eq.true'
      ),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'scheduled'),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'active'),

    supabase
      .from('events')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'live'),

    supabase
      .from('events')
      .select(`
        id,
        status,
        is_approved,
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

    supabase
      .from('event_status_history')
      .select(`
        id,
        event_id,
        from_status,
        to_status,
        changed_by_role,
        reason,
        source,
        created_at,
        events (
          name
        )
      `)
      .order('created_at', {
        ascending: false,
      })
      .limit(20),
  ]);

  const errors = [
    userError,
    eventError,
    venueError,
    externalError,
    moderationError,
    revisionError,
    removalError,
    refundError,
    scheduledError,
    activeError,
    liveError,
    paymentExceptionError,
    transitionError,
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
    paymentExceptionRows ?? []
  ).filter((event) => {
    const amountDue = Number(
      event.total_price ?? 0
    );

    const financiallyEligible =
      event.is_paid === true ||
      event.payment_status === 'paid' ||
      event.payment_override === true ||
      amountDue <= 0;

    const publiclyEligibleStatus = [
      'scheduled',
      'active',
      'live',
    ].includes(event.status);

    const waitingForPayment =
      event.status === 'approved_unpaid' ||
      event.status ===
        'approved_awaiting_payment';

    const paidButAwaitingReview =
      event.status ===
        'paid_awaiting_approval';

    return (
      waitingForPayment ||
      paidButAwaitingReview ||
      (
        publiclyEligibleStatus &&
        !financiallyEligible
      )
    );
  }).length;

  const recentTransitions: OperationsActivity[] =
    (transitionRows ?? []).map((row) => {
      const joinedEvent = Array.isArray(
        row.events
      )
        ? row.events[0]
        : row.events;

      return {
        id: String(row.id),
        event_id: String(row.event_id),
        event_name:
          joinedEvent?.name ||
          'Untitled Event',
        from_status:
          row.from_status === null
            ? null
            : String(row.from_status),
        to_status: String(row.to_status),
        changed_by_role:
          row.changed_by_role === null
            ? null
            : String(row.changed_by_role),
        reason:
          row.reason === null
            ? null
            : String(row.reason),
        source: String(
          row.source || 'system'
        ),
        created_at: String(
          row.created_at
        ),
      };
    });

  return {
    users: userCount ?? 0,
    events: eventCount ?? 0,
    venues: venueCount ?? 0,
    externalEvents:
      externalEventCount ?? 0,

    pendingModeration:
      pendingModeration ?? 0,
    pendingRevisions:
      pendingRevisions ?? 0,
    removalRequests:
      removalRequests ?? 0,
    refundRequests:
      refundRequests ?? 0,
    paymentExceptions,

    scheduledEvents:
      scheduledEvents ?? 0,
    activeEvents:
      activeEvents ?? 0,
    liveEvents:
      liveEvents ?? 0,

    recentTransitions,
  };
}