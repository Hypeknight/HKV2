-- ============================================================================
-- HypeKnight V3.5 - Entertainment Profile V1
-- ============================================================================
--
-- PURPOSE
-- Builds an organizer-owned historical profile from existing HypeKnight
-- evidence without creating a second source of truth.
--
-- V1 answers:
--   - What event history have I built?
--   - In how many HypeKnight markets?
--   - What aggregate activity have my events generated?
--
-- V1 intentionally does NOT:
--   - score or rank organizers
--   - compare organizers
--   - infer quality or reputation
--   - interpret performance
--   - expose individual signal actors
--   - claim paid exposure is organic performance
--
-- Patron Pulse can build interpretation on top of this evidence later.
-- ============================================================================

begin;

create or replace function public.get_my_entertainment_profile_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  with owned_events as (
    select
      e.id,
      e.name,
      e.slug,
      e.status,
      e.is_public,
      e.is_approved,
      e.event_start_at,
      e.event_end_at,
      e.created_at,
      e.market_id,
      m.market_key,
      m.name as market_name,
      m.primary_city,
      m.primary_state
    from public.events e
    left join public.markets m
      on m.id = e.market_id
    where e.owner_id = v_user_id
  ),

  history as (
    select
      count(*)::bigint as total_events,

      count(*) filter (
        where status = 'live'
      )::bigint as live_events,

      count(*) filter (
        where status in ('completed', 'ended')
      )::bigint as completed_events,

      count(*) filter (
        where status = 'cancelled'
      )::bigint as cancelled_events,

      count(*) filter (
        where is_public = true
          and status not in ('removed', 'archived')
      )::bigint as public_events,

      count(*) filter (
        where event_start_at is not null
          and event_start_at > now()
          and status not in (
            'removed',
            'archived',
            'cancelled',
            'completed',
            'ended'
          )
      )::bigint as upcoming_events,

      min(event_start_at) filter (
        where event_start_at is not null
      ) as first_event_at,

      max(event_start_at) filter (
        where event_start_at is not null
      ) as latest_event_at

    from owned_events
  ),

  market_counts as (
    select
      market_id,
      market_key,
      market_name,
      primary_city,
      primary_state,
      count(*)::bigint as event_count
    from owned_events
    where market_id is not null
    group by
      market_id,
      market_key,
      market_name,
      primary_city,
      primary_state
  ),

  market_summary as (
    select
      count(*)::bigint as distinct_market_count,

      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'market_id', market_id,
            'market_key', market_key,
            'name', market_name,
            'primary_city', primary_city,
            'primary_state', primary_state,
            'event_count', event_count
          )
          order by event_count desc, market_name
        ),
        '[]'::jsonb
      ) as markets
    from market_counts
  ),

  signal_rows as (
    select
      s.signal_type,
      s.actor_id,
      s.anonymous_session_id,
      s.occurred_at
    from public.signals s
    inner join owned_events oe
      on oe.id = s.event_id
  ),

  signal_totals as (
    select
      count(*)::bigint as total_signals,

      count(
        distinct case
          when actor_id is not null
            then 'user:' || actor_id::text
          when anonymous_session_id is not null
            then 'anon:' || anonymous_session_id
          else null
        end
      )::bigint as identifiable_contributors,

      max(occurred_at) as latest_signal_at
    from signal_rows
  ),

  signal_type_counts as (
    select
      signal_type,
      count(*)::bigint as signal_count
    from signal_rows
    group by signal_type
  ),

  signal_types as (
    select
      coalesce(
        jsonb_object_agg(
          signal_type,
          signal_count
          order by signal_type
        ),
        '{}'::jsonb
      ) as signals_by_type
    from signal_type_counts
  )

  select jsonb_build_object(
    'version', 1,

    'event_history', jsonb_build_object(
      'total_events', h.total_events,
      'live_events', h.live_events,
      'completed_events', h.completed_events,
      'cancelled_events', h.cancelled_events,
      'public_events', h.public_events,
      'upcoming_events', h.upcoming_events,
      'first_event_at', h.first_event_at,
      'latest_event_at', h.latest_event_at
    ),

    'market_footprint', jsonb_build_object(
      'distinct_market_count', ms.distinct_market_count,
      'markets', ms.markets
    ),

    'measured_activity', jsonb_build_object(
      'total_signals', st.total_signals,
      'identifiable_contributors', st.identifiable_contributors,
      'latest_signal_at', st.latest_signal_at,
      'signals_by_type', sty.signals_by_type
    )
  )
  into v_result
  from history h
  cross join market_summary ms
  cross join signal_totals st
  cross join signal_types sty;

  return v_result;
end;
$$;

revoke all on function public.get_my_entertainment_profile_v1()
from public;

grant execute on function public.get_my_entertainment_profile_v1()
to authenticated;

comment on function public.get_my_entertainment_profile_v1() is
'Returns the authenticated organizer Entertainment Profile V1 derived from owned events, markets, and aggregate signal evidence without exposing individual signal records.';

commit;
