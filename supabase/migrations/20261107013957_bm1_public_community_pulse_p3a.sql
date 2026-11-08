begin;

create schema bm1_community_pulse;
revoke all on schema bm1_community_pulse from public, anon, authenticated, service_role;

create table bm1_community_pulse.questions (
  id uuid primary key default gen_random_uuid(),
  supersedes_id uuid unique references bm1_community_pulse.questions(id),
  version integer not null check (version > 0),
  prompt text not null check (length(prompt) between 5 and 180),
  description text check (length(description) <= 500),
  market_id uuid references public.markets(id),
  city text,
  state text,
  status text not null default 'draft' check (status in ('draft','scheduled','open','paused','closed','archived')),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  published_at timestamptz,
  closed_at timestamptz,
  guests_allowed boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  purged_at timestamptz,
  check (isfinite(opens_at) and isfinite(closes_at) and closes_at > opens_at and closes_at <= opens_at + interval '30 days'),
  check ((city is null and state is null) or (market_id is not null and city is not null and state is not null))
);
create index community_pulse_market_idx on bm1_community_pulse.questions(market_id);
create table bm1_community_pulse.options (
  question_id uuid not null references bm1_community_pulse.questions(id),
  id uuid not null default gen_random_uuid(),
  label text not null check (length(label) between 1 and 80),
  position integer not null check (position between 1 and 6),
  primary key (question_id, id),
  unique (question_id, position)
);
create table bm1_community_pulse.guest_grants (
  question_id uuid not null references bm1_community_pulse.questions(id),
  id uuid not null default gen_random_uuid(),
  token_digest text not null unique check (token_digest ~ '^[0-9a-f]{64}$'),
  abuse_bucket text not null check (abuse_bucket ~ '^[0-9a-f]{64}$'),
  bound_account uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (question_id, id)
);
create index community_pulse_guest_rate_idx on bm1_community_pulse.guest_grants(question_id, abuse_bucket, created_at);
create table bm1_community_pulse.responses (
  question_id uuid not null,
  participant_key text not null,
  id uuid not null unique default gen_random_uuid(),
  option_id uuid not null,
  revision integer not null check (revision between 1 and 6),
  updated_at timestamptz not null,
  voided_at timestamptz,
  primary key (question_id, participant_key),
  foreign key (question_id, option_id) references bm1_community_pulse.options(question_id,id)
);
create index community_pulse_response_option_idx on bm1_community_pulse.responses(question_id, option_id);
create table bm1_community_pulse.operations (
  question_id uuid not null,
  participant_key text not null,
  operation_id uuid not null,
  option_id uuid not null,
  expected_revision integer not null,
  accepted_revision integer not null,
  notice_version text not null check (notice_version = 'community-pulse-v1'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (question_id, participant_key, operation_id),
  foreign key (question_id, participant_key) references bm1_community_pulse.responses(question_id,participant_key) on delete cascade,
  foreign key (question_id, option_id) references bm1_community_pulse.options(question_id,id)
);
create index community_pulse_operation_option_idx on bm1_community_pulse.operations(question_id, option_id);
create table bm1_community_pulse.audit (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references bm1_community_pulse.questions(id),
  actor_id uuid not null,
  action text not null,
  response_id uuid,
  created_at timestamptz not null default clock_timestamp()
);
create index community_pulse_audit_question_idx on bm1_community_pulse.audit(question_id);
create table bm1_community_pulse.results (
  question_id uuid primary key references bm1_community_pulse.questions(id),
  sealed_at timestamptz not null,
  period_end timestamptz not null,
  payload jsonb not null
);

alter table bm1_community_pulse.questions enable row level security;
alter table bm1_community_pulse.options enable row level security;
alter table bm1_community_pulse.guest_grants enable row level security;
alter table bm1_community_pulse.responses enable row level security;
alter table bm1_community_pulse.operations enable row level security;
alter table bm1_community_pulse.audit enable row level security;
alter table bm1_community_pulse.results enable row level security;
revoke all on all tables in schema bm1_community_pulse from public, anon, authenticated, service_role;

create function bm1_community_pulse.is_open(q bm1_community_pulse.questions, at_time timestamptz)
returns boolean language sql immutable set search_path = '' as $$
  select q.status in ('scheduled','open') and at_time >= q.opens_at and at_time < q.closes_at;
$$;
create function bm1_community_pulse.eligible_account(p_user uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id = p_user and not coalesce(u.is_anonymous,false)
    and u.deleted_at is null and (u.banned_until is null or u.banned_until <= statement_timestamp()));
$$;
create function bm1_community_pulse.require_admin() returns void
language plpgsql stable set search_path = '' as $$
begin
  if not coalesce(bm1_private.is_admin(), false)
    or not bm1_community_pulse.eligible_account(auth.uid())
    or auth.jwt()->>'is_anonymous' = 'true'
  then raise exception 'community_pulse_admin_required' using errcode = '42501'; end if;
end;
$$;

create function bm1_community_pulse.community_pulse_create(
  p_prompt text, p_description text, p_options text[], p_market uuid, p_city text, p_state text,
  p_opens timestamptz, p_closes timestamptz, p_guests boolean, p_supersedes uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  prior bm1_community_pulse.questions;
  question_id uuid;
  canonical_city text;
  canonical_state text;
begin
  perform bm1_community_pulse.require_admin();
  if coalesce(cardinality(p_options),0) not between 2 and 6
    or (select count(distinct lower(btrim(label))) from unnest(p_options) as labels(label)) <> cardinality(p_options)
  then raise exception 'community_pulse_invalid_options' using errcode = '22023'; end if;
  if p_market is not null then
    perform 1 from public.markets where id = p_market and status in ('active','supported');
    if not found then raise exception 'community_pulse_invalid_market' using errcode = '22023'; end if;
  end if;
  if p_city is not null or p_state is not null then
    select area.city, area.state into canonical_city, canonical_state
    from public.market_areas area
    where area.market_id = p_market and area.is_active
      and lower(btrim(area.city)) = lower(btrim(p_city))
      and lower(btrim(area.state)) = lower(btrim(p_state));
    if not found then raise exception 'community_pulse_invalid_area' using errcode = '22023'; end if;
  end if;
  if p_supersedes is not null then
    select * into prior from bm1_community_pulse.questions where id = p_supersedes for update;
    if not found or prior.published_at is null or prior.status not in ('closed','archived')
      or p_opens < prior.closes_at or prior.market_id is distinct from p_market
      or prior.city is distinct from canonical_city or prior.state is distinct from canonical_state
    then raise exception 'community_pulse_invalid_predecessor' using errcode = '22023'; end if;
  end if;
  insert into bm1_community_pulse.questions
    (supersedes_id,version,prompt,description,market_id,city,state,opens_at,closes_at,guests_allowed,created_by)
  values (p_supersedes,coalesce(prior.version + 1,1),btrim(p_prompt),nullif(btrim(p_description),''),
    p_market,canonical_city,canonical_state,p_opens,p_closes,coalesce(p_guests,false),auth.uid())
  returning id into question_id;
  insert into bm1_community_pulse.options(question_id,label,position)
    select question_id,btrim(label),position from unnest(p_options) with ordinality as labels(label,position);
  insert into bm1_community_pulse.audit(question_id,actor_id,action) values(question_id,auth.uid(),'create');
  return question_id;
end;
$$;

-- One immutable release per question. A missing, zero or small cohort uses the same
-- public suppression envelope for 0–4; zero remains distinguishable in private state.
create function bm1_community_pulse.seal(q bm1_community_pulse.questions, at_time timestamptz)
returns void language sql set search_path = '' as $$
  with counts as (
    select o.id, o.position, count(r.id) as n
    from bm1_community_pulse.options o
    left join bm1_community_pulse.responses r
      on r.question_id = o.question_id and r.option_id = o.id and r.voided_at is null
    where o.question_id = q.id group by o.id,o.position
  ), sample as (
    select coalesce(sum(n),0) as total, count(*) as options from counts
  ), check_sample as (
    select total, options, (select count(*) from bm1_community_pulse.responses
      where question_id = q.id and voided_at is null) as expected from sample
  )
  insert into bm1_community_pulse.results(question_id,sealed_at,period_end,payload)
  select q.id,at_time,least(q.closes_at,at_time),
    case when options not between 2 and 6 or total <> expected then jsonb_build_object('state','incomplete')
      when total < 5 then jsonb_build_object('state',case when total = 0 then 'zero' else 'insufficient' end)
      else jsonb_build_object('state','available','total',total,'options',(
        select jsonb_agg(jsonb_build_object('optionId',id,'count',n,'percentage',round(n*100.0/total,2)) order by position)
        from counts))
    end from check_sample;
$$;

create function bm1_community_pulse.community_pulse_transition(p_question uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare q bm1_community_pulse.questions; at_time timestamptz;
begin
  perform bm1_community_pulse.require_admin();
  select * into q from bm1_community_pulse.questions where id = p_question for update;
  at_time := clock_timestamp();
  if not found or not coalesce((
    (q.status = 'draft' and p_status = 'scheduled' and at_time < q.opens_at)
    or (q.status in ('draft','scheduled','paused') and p_status = 'open' and at_time >= q.opens_at and at_time < q.closes_at)
    or (q.status in ('scheduled','open') and p_status = 'paused' and at_time < q.closes_at)
    or (q.status in ('scheduled','open','paused') and p_status = 'closed' and at_time >= q.opens_at)
    or (p_status = 'archived' and
      (q.status in ('draft','closed') or (q.status in ('scheduled','paused') and at_time < q.opens_at)))
  ),false) then raise exception 'community_pulse_invalid_transition' using errcode = '22023'; end if;
  if p_status in ('scheduled','open') and q.market_id is not null then
    if not exists(select 1 from public.markets m where m.id = q.market_id and m.status in ('active','supported'))
      or (q.city is not null and not exists(select 1 from public.market_areas a where a.market_id = q.market_id
        and a.city = q.city and a.state = q.state and a.is_active))
    then raise exception 'community_pulse_invalid_market' using errcode = '22023'; end if;
  end if;
  if p_status = 'closed' then perform bm1_community_pulse.seal(q,at_time); end if;
  update bm1_community_pulse.questions set status = p_status,
    published_at = case when p_status in ('scheduled','open') then coalesce(published_at,at_time) else published_at end,
    closed_at = case when p_status = 'closed' then at_time else closed_at end
    where id = q.id;
  insert into bm1_community_pulse.audit(question_id,actor_id,action) values(q.id,auth.uid(),p_status);
end;
$$;

create function bm1_community_pulse.community_pulse_moderate(p_question uuid, p_response uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare q bm1_community_pulse.questions;
begin
  perform bm1_community_pulse.require_admin();
  select * into q from bm1_community_pulse.questions where id = p_question for update;
  if not found or q.status not in ('scheduled','open','paused') then
    raise exception 'community_pulse_moderation_closed' using errcode = '22023';
  end if;
  update bm1_community_pulse.responses set voided_at = clock_timestamp()
    where question_id = q.id and id = p_response and voided_at is null;
  if not found then raise exception 'community_pulse_response_not_found' using errcode = '22023'; end if;
  insert into bm1_community_pulse.audit(question_id,actor_id,action,response_id)
    values(q.id,auth.uid(),'void_response',p_response);
end;
$$;

create function bm1_community_pulse.community_pulse_purge(p_question uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare q bm1_community_pulse.questions;
begin
  perform bm1_community_pulse.require_admin();
  select * into q from bm1_community_pulse.questions where id = p_question for update;
  if not found or q.closed_at is null or q.purged_at is not null
    or clock_timestamp() < q.closed_at + interval '90 days'
  then raise exception 'community_pulse_retention_window' using errcode = '22023'; end if;
  delete from bm1_community_pulse.responses where question_id = q.id;
  delete from bm1_community_pulse.guest_grants where question_id = q.id;
  update bm1_community_pulse.questions set purged_at = clock_timestamp() where id = q.id;
  insert into bm1_community_pulse.audit(question_id,actor_id,action) values(q.id,auth.uid(),'purge');
end;
$$;

create function public.community_pulse_guest_grant(p_question uuid, p_digest text, p_bucket text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare q bm1_community_pulse.questions;
begin
  select * into q from bm1_community_pulse.questions where id = p_question for update;
  if not found or not q.guests_allowed or not bm1_community_pulse.is_open(q,clock_timestamp())
    or coalesce(p_digest,'') !~ '^[0-9a-f]{64}$' or coalesce(p_bucket,'') !~ '^[0-9a-f]{64}$'
    or (select count(*) from bm1_community_pulse.guest_grants where question_id = q.id
      and abuse_bucket = p_bucket and created_at > clock_timestamp() - interval '1 hour') >= 3
  then return false; end if;
  insert into bm1_community_pulse.guest_grants(question_id,token_digest,abuse_bucket,expires_at)
    values(q.id,p_digest,p_bucket,q.closes_at)
    on conflict(token_digest) do nothing;
  return found;
end;
$$;

create function bm1_community_pulse.guest_key(p_question uuid,p_digest text)
returns text language sql stable set search_path = '' as $$
  select 'guest:' || id::text from bm1_community_pulse.guest_grants
    where question_id = p_question and token_digest = p_digest and expires_at > statement_timestamp();
$$;

-- All writers (including editorial transitions) take the question lock first.
-- CAS revisions and operation replay are checked before creating an effective row.
create function public.community_pulse_submit(
  p_question uuid,p_option uuid,p_operation uuid,p_revision integer,p_notice text,p_user uuid,p_digest text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  q bm1_community_pulse.questions;
  previous bm1_community_pulse.responses;
  operation bm1_community_pulse.operations;
  guest text;
  participant text;
  accepted integer;
  at_time timestamptz;
begin
  if p_question is null or p_option is null or p_operation is null or p_revision is null
    or p_revision not between 0 and 6 or p_notice is distinct from 'community-pulse-v1'
  then return jsonb_build_object('state','invalid'); end if;
  select * into q from bm1_community_pulse.questions where id = p_question for update;
  if not found or q.published_at is null then return jsonb_build_object('state','ineligible'); end if;
  guest := bm1_community_pulse.guest_key(q.id,p_digest);
  if p_user is not null then
    if not bm1_community_pulse.eligible_account(p_user)
    then return jsonb_build_object('state','ineligible'); end if;
    if guest is not null and exists(select 1 from bm1_community_pulse.responses
      where question_id = q.id and participant_key = guest)
    then return jsonb_build_object('state','guest_response_exists'); end if;
    participant := 'account:' || p_user::text;
  elsif q.guests_allowed and exists(select 1 from bm1_community_pulse.guest_grants g
    where g.question_id = q.id and g.token_digest = p_digest and g.bound_account is null) then
    participant := guest;
  end if;
  if participant is null then return jsonb_build_object('state','ineligible'); end if;
  select * into previous from bm1_community_pulse.responses where question_id = q.id and participant_key = participant;
  if previous.voided_at is not null then return jsonb_build_object('state','ineligible'); end if;
  select * into operation from bm1_community_pulse.operations
    where question_id = q.id and participant_key = participant and operation_id = p_operation;
  if found then
    if operation.option_id <> p_option or operation.expected_revision <> p_revision then
      return jsonb_build_object('state','operation_conflict');
    end if;
    return jsonb_build_object('state','accepted','revision',operation.accepted_revision);
  end if;
  at_time := clock_timestamp();
  if not bm1_community_pulse.is_open(q,at_time) then return jsonb_build_object('state','closed'); end if;
  if not exists(select 1 from bm1_community_pulse.options where question_id = q.id and id = p_option)
  then return jsonb_build_object('state','invalid'); end if;
  if coalesce(previous.revision,0) <> p_revision then
    return jsonb_build_object('state','revision_conflict','revision',coalesce(previous.revision,0));
  end if;
  if (select count(*) from bm1_community_pulse.operations where question_id = q.id and participant_key = participant) >= 12
    or (previous.option_id is distinct from p_option and
      (previous.revision >= 6 or previous.updated_at > at_time - interval '10 seconds'))
  then return jsonb_build_object('state','rate_limited'); end if;
  accepted := case when previous.option_id = p_option then previous.revision else p_revision + 1 end;
  if previous.option_id is distinct from p_option then
    insert into bm1_community_pulse.responses(question_id,participant_key,option_id,revision,updated_at)
      values(q.id,participant,p_option,accepted,at_time)
      on conflict(question_id,participant_key) do update set
        option_id = excluded.option_id,revision = excluded.revision,updated_at = excluded.updated_at;
  end if;
  insert into bm1_community_pulse.operations
    (question_id,participant_key,operation_id,option_id,expected_revision,accepted_revision,notice_version)
    values(q.id,participant,p_operation,p_option,p_revision,accepted,p_notice);
  if p_user is not null and guest is not null then
    update bm1_community_pulse.guest_grants set bound_account = p_user
      where question_id = q.id and token_digest = p_digest and bound_account is null;
  end if;
  return jsonb_build_object('state','accepted','revision',accepted);
end;
$$;

create function public.community_pulse_participant(p_question uuid,p_user uuid,p_digest text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('optionId',r.option_id,'revision',r.revision,
    'identity',case when r.participant_key = 'account:' || p_user::text then 'account' else 'guest' end)
  from bm1_community_pulse.responses r
  where r.question_id = p_question and r.voided_at is null
    and ((r.participant_key = 'account:' || p_user::text and bm1_community_pulse.eligible_account(p_user))
      or r.participant_key = bm1_community_pulse.guest_key(p_question,p_digest))
  order by (r.participant_key = 'account:' || p_user::text) desc nulls last
  limit 1;
$$;

create function public.community_pulse_read(p_question uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id',q.id,'version',q.version,'prompt',q.prompt,'description',q.description,
    'scope',jsonb_build_object('kind',case when q.market_id is null then 'platform' else 'market' end,
      'marketId',q.market_id,'city',q.city,'state',q.state),
    'opensAt',q.opens_at,'closesAt',q.closes_at,'acceptingResponses',bm1_community_pulse.is_open(q,statement_timestamp()),
    'guestsAllowed',q.guests_allowed,
    'options',(select jsonb_agg(jsonb_build_object('id',id,'label',label) order by position)
      from bm1_community_pulse.options where question_id = q.id),
    'report',case when r.question_id is null then jsonb_build_object('state',
      case when q.status = 'closed' then 'incomplete' else 'pending' end)
      else (case when r.payload->>'state' = 'zero' then jsonb_build_object('state','insufficient')
        else r.payload end) || jsonb_build_object('sealedAt',r.sealed_at,
          'periodStart',q.opens_at,'periodEnd',r.period_end) end
  )
  from bm1_community_pulse.questions q
  left join bm1_community_pulse.results r on r.question_id = q.id
  where q.id = p_question and q.published_at is not null and q.status not in ('draft','archived')
    and statement_timestamp() >= q.opens_at;
$$;

-- Public admin entry points are invoker wrappers. The privileged implementations
-- live in the non-exposed schema and always authorize the authenticated caller.
create function public.community_pulse_create(
  p_prompt text, p_description text, p_options text[], p_market uuid, p_city text, p_state text,
  p_opens timestamptz, p_closes timestamptz, p_guests boolean, p_supersedes uuid
) returns uuid language sql security invoker set search_path = '' as $$
  select bm1_community_pulse.community_pulse_create(p_prompt,p_description,p_options,p_market,
    p_city,p_state,p_opens,p_closes,p_guests,p_supersedes);
$$;
create function public.community_pulse_transition(p_question uuid,p_status text)
returns void language sql security invoker set search_path = '' as $$
  select bm1_community_pulse.community_pulse_transition(p_question,p_status);
$$;
create function public.community_pulse_moderate(p_question uuid,p_response uuid)
returns void language sql security invoker set search_path = '' as $$
  select bm1_community_pulse.community_pulse_moderate(p_question,p_response);
$$;
create function public.community_pulse_purge(p_question uuid)
returns void language sql security invoker set search_path = '' as $$
  select bm1_community_pulse.community_pulse_purge(p_question);
$$;

revoke all on all functions in schema bm1_community_pulse from public, anon, authenticated, service_role;
grant usage on schema bm1_community_pulse to authenticated;
grant execute on function bm1_community_pulse.community_pulse_create(text,text,text[],uuid,text,text,timestamptz,timestamptz,boolean,uuid),
  bm1_community_pulse.community_pulse_transition(uuid,text), bm1_community_pulse.community_pulse_moderate(uuid,uuid),
  bm1_community_pulse.community_pulse_purge(uuid) to authenticated;

revoke all on function public.community_pulse_create(text,text,text[],uuid,text,text,timestamptz,timestamptz,boolean,uuid),
  public.community_pulse_transition(uuid,text), public.community_pulse_moderate(uuid,uuid),
  public.community_pulse_purge(uuid), public.community_pulse_guest_grant(uuid,text,text),
  public.community_pulse_submit(uuid,uuid,uuid,integer,text,uuid,text),
  public.community_pulse_participant(uuid,uuid,text), public.community_pulse_read(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.community_pulse_create(text,text,text[],uuid,text,text,timestamptz,timestamptz,boolean,uuid),
  public.community_pulse_transition(uuid,text), public.community_pulse_moderate(uuid,uuid),
  public.community_pulse_purge(uuid) to authenticated;
grant execute on function public.community_pulse_guest_grant(uuid,text,text),
  public.community_pulse_submit(uuid,uuid,uuid,integer,text,uuid,text),
  public.community_pulse_participant(uuid,uuid,text), public.community_pulse_read(uuid) to service_role;

commit;
