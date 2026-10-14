-- P2-B3B: facts only; no row policies, writes or historical rewrites.
-- Unapplied: validate locally and hold for release review.
-- Clear Supabase default grants before allowing authenticated application calls.
-- Admin override uses authenticated + profiles.app_role; no service-role caller is required.
begin;
create schema if not exists bm1_reporting_internal;
revoke all on schema bm1_reporting_internal from public, anon, authenticated, service_role;
grant usage on schema bm1_reporting_internal to authenticated;
-- Private privileged aggregate; owner guard precedes every read. Raw RLS stays intact.
create function bm1_reporting_internal.owned_event_facts(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.events e where e.id=p_event_id and e.owner_id=auth.uid()
  ) then raise exception 'Event not found or access denied' using errcode='42501'; end if;
  select jsonb_build_object(
    'version','p2b3b','saved',(select count(*) from public.event_saves s where s.event_id=p_event_id),
    'going',(select count(*) from public.event_rsvps r where r.event_id=p_event_id and r.status='going'),
    'interested',(select count(*) from public.event_rsvps r where r.event_id=p_event_id and r.status='interested'),
    'discovery_observations',count(*),
    'organic_observations',count(*) filter (where s.observation_id is not null
      and s.source='browser' and s.metadata->>'contract_version'='p2b1'
      and s.metadata->>'evidence_origin'='browser_reported' and s.metadata->>'exposure_class'='organic'),
    'unclassified_observations',count(*) filter (where not coalesce(s.observation_id is not null
      and s.source='browser' and s.metadata->>'contract_version'='p2b1'
      and s.metadata->>'evidence_origin'='browser_reported' and s.metadata->>'exposure_class'='organic',false))
  ) into result from public.signals s where s.event_id=p_event_id and s.signal_type='discovery_impression';
  return result;
end; $$;
revoke all on function bm1_reporting_internal.owned_event_facts(uuid) from public, anon, authenticated, service_role;
grant execute on function bm1_reporting_internal.owned_event_facts(uuid) to authenticated;
create function public.get_owned_event_reporting_facts(p_event_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select bm1_reporting_internal.owned_event_facts(p_event_id);
$$;
revoke all on function public.get_owned_event_reporting_facts(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_owned_event_reporting_facts(uuid) to authenticated;
-- STABLE snapshot returns a scalar JSON aggregate, unaffected by API row limits.
-- Current unique participant/Pulse or legacy user/Pulse rows only; no history joins.
create function bm1_reporting_internal.event_pulse_facts(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_session_id uuid; result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.events e where e.id=p_event_id and (
      e.owner_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.app_role='admin')
    )
  ) then raise exception 'Event not found or access denied' using errcode='42501'; end if;
  select s.id into v_session_id from public.patron_pulse_sessions s where s.event_id=p_event_id;
  if v_session_id is null then return null; end if;
  if exists(select 1 from public.patron_pulse_responses r
    left join public.patron_pulses p on p.id=r.pulse_id
    where r.session_id=v_session_id and (r.event_id is distinct from p_event_id
      or p.event_id is distinct from p_event_id or p.session_id is distinct from v_session_id))
  then raise exception 'Inconsistent Pulse response context'; end if;
  with responses as (
    select r.pulse_id,r.option_id from public.patron_pulse_responses r
    where r.session_id=v_session_id and r.event_id=p_event_id
  ), option_counts as (
    select o.pulse_id,o.id,o.label,o.sort_order,count(r.option_id)::bigint as answer_count
    from public.patron_pulse_options o
    join public.patron_pulses p on p.id=o.pulse_id and p.session_id=v_session_id and p.event_id=p_event_id
    left join responses r on r.pulse_id=o.pulse_id and r.option_id=o.id
    group by o.pulse_id,o.id,o.label,o.sort_order
  ), pulse_counts as (
    select p.id,p.title,p.status,p.created_at,
      (select count(*) from responses r where r.pulse_id=p.id) as total,
      coalesce((select sum(o.answer_count) from option_counts o where o.pulse_id=p.id),0) as option_sample,
      coalesce((select jsonb_agg(jsonb_build_object('optionId',o.id,'label',o.label,'count',o.answer_count)
        order by o.sort_order,o.id) from option_counts o where o.pulse_id=p.id),'[]'::jsonb) as options
    from public.patron_pulses p where p.session_id=v_session_id and p.event_id=p_event_id
  ) select jsonb_build_object('version','p2b3b','complete',true,'sessionId',v_session_id,
    'responseCount',(select count(*) from responses),
    'results',coalesce(jsonb_agg(jsonb_build_object('pulseId',p.id,'title',p.title,'status',p.status,
      'totalResponses',p.total,'optionSample',p.option_sample,'options',p.options) order by p.created_at desc,p.id),'[]'::jsonb))
    into result from pulse_counts p;
  return result;
end; $$;
revoke all on function bm1_reporting_internal.event_pulse_facts(uuid) from public, anon, authenticated, service_role;
grant execute on function bm1_reporting_internal.event_pulse_facts(uuid) to authenticated;
create function public.get_event_pulse_reporting_facts(p_event_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select bm1_reporting_internal.event_pulse_facts(p_event_id);
$$;
revoke all on function public.get_event_pulse_reporting_facts(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_event_pulse_reporting_facts(uuid) to authenticated;
commit;
