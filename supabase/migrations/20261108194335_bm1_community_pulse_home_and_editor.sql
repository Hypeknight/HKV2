begin;

create table bm1_community_pulse.home_slots (
  scope_key text primary key,
  question_id uuid not null unique references bm1_community_pulse.questions(id),
  selected_by uuid not null,
  selected_at timestamptz not null default clock_timestamp()
);
create table bm1_community_pulse.account_attempts (
  account_id uuid not null,
  bucket timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (account_id,bucket)
);
create index community_pulse_attempt_expiry_idx on bm1_community_pulse.account_attempts(bucket);
alter table bm1_community_pulse.home_slots enable row level security;
alter table bm1_community_pulse.account_attempts enable row level security;
revoke all on bm1_community_pulse.home_slots,bm1_community_pulse.account_attempts
  from public,anon,authenticated,service_role;

create function bm1_community_pulse.scope_key(q bm1_community_pulse.questions)
returns text language sql immutable set search_path = '' as $$
  select case when q.market_id is null then 'platform' else 'market:' || q.market_id::text ||
    case when q.city is null then '' else ':' || lower(q.city) || ':' || lower(q.state) end end;
$$;

create function bm1_community_pulse.set_home(p_question uuid,p_selected boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare q bm1_community_pulse.questions;
begin
  perform bm1_community_pulse.require_admin();
  select * into q from bm1_community_pulse.questions where id=p_question for update;
  if not found then raise exception 'community_pulse_question_not_found' using errcode='22023'; end if;
  if p_selected then
    if q.published_at is null or q.status in ('draft','archived') or q.guests_allowed then
      raise exception 'community_pulse_home_ineligible' using errcode='22023';
    end if;
    insert into bm1_community_pulse.home_slots(scope_key,question_id,selected_by)
      values(bm1_community_pulse.scope_key(q),q.id,auth.uid())
      on conflict(scope_key) do update set question_id=excluded.question_id,
        selected_by=excluded.selected_by,selected_at=clock_timestamp();
  else
    delete from bm1_community_pulse.home_slots where question_id=q.id;
  end if;
  insert into bm1_community_pulse.audit(question_id,actor_id,action)
    values(q.id,auth.uid(),case when p_selected then 'select_home' else 'remove_home' end);
end;
$$;
create function public.community_pulse_set_home(p_question uuid,p_selected boolean)
returns void language sql security invoker set search_path = '' as $$
  select bm1_community_pulse.set_home(p_question,p_selected);
$$;

create function public.community_pulse_home(p_city text,p_state text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with matching_areas as (
    select a.market_id,a.city,a.state from public.market_areas a
    join public.markets m on m.id=a.market_id
    where a.is_active and m.status in ('active','supported')
      and lower(btrim(a.city))=lower(btrim(p_city))
      and lower(btrim(a.state))=lower(btrim(p_state))
  ), selected_area as (
    select * from matching_areas
    where (select count(distinct market_id) from matching_areas)=1
  ), candidates as (
    select q.*,case when q.city is not null then 2 when q.market_id is not null then 1 else 0 end as priority
    from bm1_community_pulse.home_slots h
    join bm1_community_pulse.questions q on q.id=h.question_id
    where q.published_at is not null and q.status not in ('draft','archived')
      and not q.guests_allowed and statement_timestamp() >= q.opens_at
      and (q.market_id is null or exists(
        select 1 from selected_area a where a.market_id=q.market_id
          and (q.city is null or (a.city=q.city and a.state=q.state))))
    order by priority desc limit 1
  )
  select public.community_pulse_read(id) || jsonb_build_object('scopeLabel',
    case when market_id is null then 'Across HypeKnight'
      when city is not null then city || ', ' || state
      else (select m.name from public.markets m where m.id=candidates.market_id) end)
    from candidates;
$$;

create function public.community_pulse_account_submit(
  p_question uuid,p_option uuid,p_operation uuid,p_revision integer,p_notice text,p_user uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if not bm1_community_pulse.eligible_account(p_user) then return jsonb_build_object('state','ineligible'); end if;
  -- A durable account-level budget covers retries, invalid options and stale revisions.
  insert into bm1_community_pulse.account_attempts(account_id,bucket,attempts)
    values(p_user,date_trunc('minute',clock_timestamp()),1)
    on conflict(account_id,bucket) do update set attempts=least(account_attempts.attempts+1,21)
    returning attempts into used;
  if used > 20 then return jsonb_build_object('state','rate_limited'); end if;
  delete from bm1_community_pulse.account_attempts
    where account_id=p_user and bucket < clock_timestamp()-interval '2 hours';
  if not exists(select 1 from bm1_community_pulse.questions where id=p_question and not guests_allowed)
  then return jsonb_build_object('state','ineligible'); end if;
  return public.community_pulse_submit(p_question,p_option,p_operation,p_revision,p_notice,p_user,null);
end;
$$;

create function bm1_community_pulse.editor()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform bm1_community_pulse.require_admin();
  select jsonb_build_object(
    'total',(select count(*) from bm1_community_pulse.questions),
    'questions',coalesce((select jsonb_agg(item order by item->>'createdAt' desc) from (
      select jsonb_build_object('id',q.id,'version',q.version,'prompt',q.prompt,'description',q.description,
        'status',q.status,'marketId',q.market_id,'city',q.city,'state',q.state,
        'opensAt',q.opens_at,'closesAt',q.closes_at,'createdAt',q.created_at,
        'guestsAllowed',q.guests_allowed,'selectedForHome',exists(
          select 1 from bm1_community_pulse.home_slots h where h.question_id=q.id),
        'options',(select jsonb_agg(jsonb_build_object('id',id,'label',label) order by position)
          from bm1_community_pulse.options where question_id=q.id),
        'audit',coalesce((select jsonb_agg(jsonb_build_object('action',a.action,'at',a.created_at) order by a.created_at desc)
          from (select action,created_at from bm1_community_pulse.audit where question_id=q.id order by created_at desc limit 10) a),'[]'::jsonb)
      ) item from bm1_community_pulse.questions q order by q.created_at desc,q.id limit 100
    ) limited),'[]'::jsonb),
    'markets',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name)
      from public.markets where status in ('active','supported')),'[]'::jsonb),
    'areas',coalesce((select jsonb_agg(jsonb_build_object('marketId',a.market_id,'city',a.city,'state',a.state) order by a.city,a.state)
      from public.market_areas a join public.markets m on m.id=a.market_id
      where a.is_active and m.status in ('active','supported')),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
create function public.community_pulse_editor()
returns jsonb language sql security invoker set search_path = '' as $$
  select bm1_community_pulse.editor();
$$;

create function bm1_community_pulse.maintenance()
returns integer language plpgsql security definer set search_path = '' as $$
declare q bm1_community_pulse.questions; changed integer := 0;
begin
  perform bm1_community_pulse.require_admin();
  for q in select * from bm1_community_pulse.questions
    where published_at is not null and status in ('scheduled','open','paused') and closes_at<=clock_timestamp()
    order by closes_at limit 50 for update skip locked
  loop
    perform bm1_community_pulse.community_pulse_transition(q.id,'closed');
    changed := changed+1;
  end loop;
  for q in select * from bm1_community_pulse.questions
    where closed_at<=clock_timestamp()-interval '90 days' and purged_at is null
    order by closed_at limit 50 for update skip locked
  loop
    perform bm1_community_pulse.community_pulse_purge(q.id);
    changed := changed+1;
  end loop;
  delete from bm1_community_pulse.account_attempts where bucket<clock_timestamp()-interval '2 hours';
  return changed;
end;
$$;
create function public.community_pulse_maintenance()
returns integer language sql security invoker set search_path = '' as $$
  select bm1_community_pulse.maintenance();
$$;

revoke all on function bm1_community_pulse.scope_key(bm1_community_pulse.questions),
  bm1_community_pulse.set_home(uuid,boolean),bm1_community_pulse.editor(),bm1_community_pulse.maintenance()
  from public,anon,authenticated,service_role;
revoke all on function public.community_pulse_set_home(uuid,boolean),public.community_pulse_editor(),
  public.community_pulse_maintenance(),public.community_pulse_home(text,text),
  public.community_pulse_account_submit(uuid,uuid,uuid,integer,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.community_pulse_set_home(uuid,boolean),public.community_pulse_editor(),
  public.community_pulse_maintenance(),bm1_community_pulse.set_home(uuid,boolean),
  bm1_community_pulse.editor(),bm1_community_pulse.maintenance() to authenticated;
grant execute on function public.community_pulse_home(text,text),
  public.community_pulse_account_submit(uuid,uuid,uuid,integer,text,uuid) to service_role;
commit;
