-- ============================================================================
-- HypeKnight V3.5 - Event Owner Analytics Foundation
-- ============================================================================
-- Gives an event owner access to aggregate performance for their own event
-- without exposing raw signal rows, actor ids, session ids, or user histories.
-- ============================================================================

create or replace function public.get_owned_event_signal_summary(
  p_event_id uuid
)
returns table (
  signal_type text,
  signal_count bigint,
  unique_actor_count bigint,
  last_signal_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.owner_id = auth.uid()
  ) then
    raise exception 'Event not found or access denied';
  end if;

  return query
  select
    s.signal_type,
    count(*)::bigint,
    count(
      distinct coalesce(
        s.actor_id::text,
        s.anonymous_session_id
      )
    )::bigint,
    max(s.occurred_at)
  from public.signals s
  where s.event_id = p_event_id
  group by s.signal_type
  order by s.signal_type;
end;
$$;

revoke all on function public.get_owned_event_signal_summary(uuid)
from public;

grant execute on function public.get_owned_event_signal_summary(uuid)
to authenticated;

comment on function public.get_owned_event_signal_summary(uuid) is
'Returns aggregate signal performance for an event owned by the authenticated user without exposing raw signal records or actor identities.';
