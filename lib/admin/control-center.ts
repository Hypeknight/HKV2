import type { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exactCount } from '@/lib/reporting/factual';

/** Use the caller's session and RLS. Never replace this with a service client. */
export async function requireAdministrator() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect('/auth/login');
  const profile = await client.from('profiles').select('app_role').eq('id', data.user.id).single();
  if (profile.error || profile.data?.app_role !== 'admin') redirect('/dashboard');
  return client;
}

type CountResult = { count: number | null; error: unknown };
export async function readAdminCount(key: string, query: () => PromiseLike<CountResult>): Promise<number | null> {
  try {
    const result = await query();
    const value = exactCount(result.count, result.error);
    if (value === null) console.warn('[admin:measurement-unavailable]', { metric: key });
    return value;
  } catch {
    console.warn('[admin:measurement-unavailable]', { metric: key });
    return null;
  }
}

export const SIGNAL_MEASURES = [
  { key: 'signals', label: 'Canonical observations', types: null, detail: 'All recorded signal rows; not people or attendance.' },
  { key: 'views', label: 'Event view observations', types: ['event_view'], detail: 'Recorded event-view actions; repeat views can occur.' },
  { key: 'saves', label: 'Historical save actions', types: ['event_saved'], detail: 'Save actions, including events later unsaved. Not current saves.' },
  { key: 'going', label: 'Historical Going actions', types: ['event_rsvp_going'], detail: 'Going actions, including later revisions. Not current Going state or attendance.' },
  { key: 'pulse', label: 'Pulse response actions', types: ['patron_pulse_response'], detail: 'Historical response signals, including revisions; not effective responses or participants.' },
] as const;

export async function getAdminSignalCounts(client: SupabaseClient, now = new Date()) {
  const until = now.toISOString();
  const since = new Date(now.getTime() - 7 * 86400000).toISOString();
  const entries = await Promise.all(SIGNAL_MEASURES.map(async definition => {
    const value = await readAdminCount(definition.key, () => {
      let query = client.from('signals').select('id', { count: 'exact', head: true }).gte('occurred_at', since).lt('occurred_at', until);
      if (definition.types) query = query.in('signal_type', [...definition.types]);
      return query;
    });
    return [definition.key, value] as const;
  }));
  return { since, until, counts: Object.fromEntries(entries) as Record<typeof SIGNAL_MEASURES[number]['key'], number | null> };
}

export const OPERATION_MEASURES = [
  { key: 'review', label: 'Submission review', table: 'events', statuses: ['submitted', 'paid_awaiting_approval', 'revision_paid_awaiting_approval'], href: '/admin/events', detail: 'Submitted records, including legacy paid-awaiting-review states. Payment is not a publication requirement.' },
  { key: 'revision', label: 'Revision review', table: 'events', statuses: ['revision_submitted'], href: '/admin/events?status=revision_submitted', detail: 'Owner revisions awaiting a decision.' },
  { key: 'service', label: 'Removal / refund requests', table: 'events', statuses: ['removal_requested', 'refund_requested'], href: '/admin/events', detail: 'Records currently in a service-request lifecycle state; not all payment refund flags.' },
  { key: 'events', label: 'Native event records', table: 'events', statuses: null, href: '/admin/events', detail: 'All native records, including drafts and history. Not eligible Discovery inventory.' },
  { key: 'venues', label: 'Venue records', table: 'venues', statuses: null, href: '/admin/venues', detail: 'Business identities; a shared address does not merge venue history.' },
  { key: 'external', label: 'External listing records', table: 'external_events', statuses: null, href: '/admin/external-events', detail: 'Provider inventory, separate from native events.' },
  { key: 'scheduled', label: 'Scheduled records', table: 'events', statuses: ['scheduled'], href: '/admin/events?status=scheduled', detail: 'Stored lifecycle status; visibility and Discovery eligibility have separate checks.' },
  { key: 'active', label: 'Active records', table: 'events', statuses: ['active'], href: '/admin/events?status=active', detail: 'Stored lifecycle status, not an exposure or attendance measurement.' },
  { key: 'live', label: 'Live records', table: 'events', statuses: ['live'], href: '/admin/events?status=live', detail: 'Stored lifecycle status, not verified attendance.' },
] as const;
export async function getAdminOperationCounts(client: SupabaseClient) {
  return Promise.all(OPERATION_MEASURES.map(async definition => ({ ...definition,
    value: await readAdminCount(definition.key, () => {
      let query = client.from(definition.table).select('id', { count: 'exact', head: true });
      if (definition.statuses) query = query.in('status', [...definition.statuses]);
      return query;
    }),
  })));
}
