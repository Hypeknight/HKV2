-- P2-B2: account-optional participation; table writes remain protected.
-- No historical evidence/backfill, venue identity, entitlement or Intelligence changes.
create schema bm1_presence_internal;
revoke all on schema bm1_presence_internal from public, anon, authenticated;

alter table public.presence_verifications add column credential_id uuid
  references public.presence_credentials(id) on delete restrict;
create index presence_verifications_credential_idx on public.presence_verifications(credential_id) where credential_id is not null;
alter table public.patron_pulse_checkins alter column user_id drop not null;
alter table public.patron_pulse_responses alter column user_id drop not null;
alter table public.patron_pulse_checkins add constraint patron_pulse_checkins_identity_check check (participant_id is not null or user_id is not null);
alter table public.patron_pulse_responses add constraint patron_pulse_responses_identity_check check (participant_id is not null or user_id is not null);
-- Fail rather than silently discard conflicting unfinished/historical participant rows.
create unique index patron_pulse_checkins_session_participant_key on public.patron_pulse_checkins(session_id,participant_id) where participant_id is not null;
create unique index patron_pulse_responses_pulse_participant_key on public.patron_pulse_responses(pulse_id,participant_id) where participant_id is not null;

create function bm1_presence_internal.public_live_event(p_event_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.events e where e.id=p_event_id and e.is_public
    and e.removed_at is null and e.status in ('scheduled','active')
    and e.event_start_at<=now() and now()<coalesce(e.event_end_at,e.event_start_at+interval '30 minutes'));
$$;
revoke all on function bm1_presence_internal.public_live_event(uuid) from public,anon,authenticated;

create function public.join_event_presence(p_event_id uuid,p_credential text,p_participant_token uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.presence_credentials; p public.presence_participants; v_end timestamptz;
begin
  if not bm1_presence_internal.public_live_event(p_event_id) then raise exception 'Event Presence unavailable'; end if;
  if p_credential is null or length(p_credential) not between 32 and 256 then raise exception 'Invalid Presence credential'; end if;
  select * into c from public.presence_credentials where token_hash=encode(sha256(convert_to(trim(p_credential),'UTF8')),'hex')
    and context_type='event' and event_id=p_event_id and venue_id is null and status='active' and revoked_at is null
    and (valid_from is null or valid_from<=now()) and (expires_at is null or expires_at>now()) for share;
  if c.id is null then raise exception 'Invalid Presence credential'; end if;
  -- Serialize same-account joining; keep compatibility uniqueness without account requirement.
  if auth.uid() is not null then perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0)); end if;
  select * into p from public.presence_participants where participant_token=p_participant_token
    and (user_id is null or user_id=auth.uid()) for update;
  if p.id is null and auth.uid() is not null then
    select * into p from public.presence_participants where user_id=auth.uid() order by created_at limit 1 for update;
  end if;
  if p.id is null then
    insert into public.presence_participants(user_id) values(auth.uid()) returning * into p;
  else
    update public.presence_participants set user_id=coalesce(user_id,auth.uid()),last_active_at=now() where id=p.id returning * into p;
  end if;
  select coalesce(event_end_at,event_start_at+interval '30 minutes') into v_end from public.events where id=p_event_id;
  insert into public.presence_verifications(participant_id,context_type,event_id,method,verification_level,confidence,expires_at,credential_id,metadata)
    values(p.id,'event',p_event_id,c.credential_type,'presence_supported',0.8,least(v_end,c.expires_at),c.id,
      jsonb_build_object('source','official_event_check_in','contract_version','p2b2'));
  return p.participant_token;
end; $$;
revoke all on function public.join_event_presence(uuid,text,uuid) from public;
grant execute on function public.join_event_presence(uuid,text,uuid) to anon,authenticated;

create function bm1_presence_internal.eligible_presence(p_event_id uuid,p_token uuid)
returns setof public.presence_verifications language sql stable security definer set search_path = '' as $$
  select v.* from public.presence_verifications v
    join public.presence_participants p on p.id=v.participant_id
    join public.presence_credentials c on c.id=v.credential_id
  where p.participant_token=p_token and (p.user_id is null or p.user_id=auth.uid())
    and v.context_type='event' and v.event_id=p_event_id and v.venue_id is null
    and v.verification_level in ('presence_supported','verified') and v.revoked_at is null
    and v.verified_at<=now() and v.expires_at>now()
    and c.context_type='event' and c.event_id=p_event_id and c.venue_id is null
    and c.status='active' and c.revoked_at is null and (c.valid_from is null or c.valid_from<=now())
    and (c.expires_at is null or c.expires_at>now()) and bm1_presence_internal.public_live_event(p_event_id)
  order by v.verified_at desc limit 1;
$$;
revoke all on function bm1_presence_internal.eligible_presence(uuid,uuid) from public,anon,authenticated;

-- Private evidence is returned only to the bearer of the corresponding participant cookie.
create function public.get_patron_pulse_participant_state(p_event_id uuid,p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v public.presence_verifications;
begin
  select * into v from bm1_presence_internal.eligible_presence(p_event_id,p_token);
  if v.id is null then return jsonb_build_object('verified',false,'checkin',null,'responses','[]'::jsonb); end if;
  return jsonb_build_object('verified',true,'checkin',(
    select jsonb_build_object('id',id,'status',status,'checked_in_at',checked_in_at,'last_active_at',last_active_at)
      from public.patron_pulse_checkins where event_id=p_event_id and participant_id=v.participant_id),
    'responses',coalesce((select jsonb_agg(jsonb_build_object('id',id,'pulse_id',pulse_id,'option_id',option_id,
      'text_response',text_response,'numeric_response',numeric_response,'boolean_response',boolean_response,'submitted_at',submitted_at))
      from public.patron_pulse_responses where event_id=p_event_id and participant_id=v.participant_id),'[]'::jsonb));
end; $$;
revoke all on function public.get_patron_pulse_participant_state(uuid,uuid) from public;
grant execute on function public.get_patron_pulse_participant_state(uuid,uuid) to anon,authenticated;

create function public.check_in_patron_pulse(p_event_id uuid,p_token uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v public.presence_verifications; s public.patron_pulse_sessions; p public.presence_participants; c public.patron_pulse_checkins;
begin
  select * into v from bm1_presence_internal.eligible_presence(p_event_id,p_token);
  if v.id is null then raise exception 'Verified Event Presence required'; end if;
  -- Hold evidence/context against concurrent revocation/moderation during the write.
  perform 1 from public.presence_credentials where id=v.credential_id and status='active' and revoked_at is null
    and (expires_at is null or expires_at>now()) for share;
  if not found then raise exception 'Verified Event Presence required'; end if;
  perform 1 from public.presence_verifications where id=v.id and revoked_at is null and expires_at>now() for share;
  if not found then raise exception 'Verified Event Presence required'; end if;
  perform 1 from public.events where id=p_event_id and is_public and removed_at is null and status in ('scheduled','active') for share;
  if not found then raise exception 'Event Presence unavailable'; end if;
  -- Participant lock prevents concurrent duplicate check-ins/responses.
  select * into p from public.presence_participants where id=v.participant_id for update;
  select * into s from public.patron_pulse_sessions where event_id=p_event_id and status='open' and check_in_enabled
    and (opens_at is null or opens_at<=now()) and (closes_at is null or closes_at>now()) for share;
  if s.id is null or not exists(select 1 from public.platform_settings g where g.id='global' and g.patron_pulse_enabled)
    or exists(select 1 from public.event_patron_pulse_settings e where e.event_id=p_event_id and not e.enabled)
    then raise exception 'Patron Pulse unavailable'; end if;
  select * into c from public.patron_pulse_checkins where session_id=s.id
    and (participant_id=p.id or (participant_id is null and user_id=p.user_id)) for update;
  if c.status in ('removed','left') then raise exception 'Participant check-in unavailable'; end if;
  if c.id is null then
    insert into public.patron_pulse_checkins(session_id,event_id,user_id,participant_id,presence_verification_id,source)
      values(s.id,p_event_id,p.user_id,p.id,v.id,'qr') returning id into c.id;
  else
    update public.patron_pulse_checkins set participant_id=p.id,presence_verification_id=v.id,last_active_at=now() where id=c.id;
  end if;
  return c.id;
end; $$;
revoke all on function public.check_in_patron_pulse(uuid,uuid) from public;
grant execute on function public.check_in_patron_pulse(uuid,uuid) to anon,authenticated;

create function public.submit_patron_pulse_response(p_event_id uuid,p_token uuid,p_pulse_id uuid,p_option_id uuid default null,p_text text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.presence_verifications; q public.patron_pulses; r public.patron_pulse_responses; c_id uuid; v_user uuid; max_length integer;
begin
  c_id:=public.check_in_patron_pulse(p_event_id,p_token);
  select * into v from bm1_presence_internal.eligible_presence(p_event_id,p_token);
  select user_id into v_user from public.presence_participants where id=v.participant_id;
  select * into q from public.patron_pulses where id=p_pulse_id and event_id=p_event_id and status='open'
    and (opens_at is null or opens_at<=now()) and (closes_at is null or closes_at>now()) for share;
  if q.id is null or q.session_id is distinct from (select session_id from public.patron_pulse_checkins where id=c_id)
    then raise exception 'Pulse unavailable'; end if;
  select coalesce(e.max_response_length,g.patron_pulse_max_response_length,500) into max_length
    from public.platform_settings g left join public.event_patron_pulse_settings e on e.event_id=p_event_id where g.id='global';
  p_text:=nullif(trim(p_text),'');
  if q.pulse_type in ('feedback','dj_request') then
    if p_text is null or length(p_text)>least(max_length,5000) or p_option_id is not null then raise exception 'Invalid text response'; end if;
  else
    if p_text is not null or p_option_id is null or not exists(select 1 from public.patron_pulse_options where id=p_option_id and pulse_id=q.id and is_active)
      then raise exception 'Invalid response option'; end if;
  end if;
  select * into r from public.patron_pulse_responses where pulse_id=q.id
    and (participant_id=v.participant_id or (participant_id is null and user_id=v_user)) for update;
  if r.id is not null then
    if r.option_id is not distinct from p_option_id and r.text_response is not distinct from p_text then return r.id; end if;
    if not q.allow_multiple_responses then raise exception 'Pulse already answered'; end if;
    -- Existing schema represents multiple submissions as revisions of one answer.
    -- Each accepted changed answer appends signal evidence; identical retries do not.
    update public.patron_pulse_responses set option_id=p_option_id,text_response=p_text,participant_id=v.participant_id,
      presence_verification_id=v.id,updated_at=clock_timestamp() where id=r.id;
  else
    insert into public.patron_pulse_responses(pulse_id,session_id,event_id,user_id,participant_id,presence_verification_id,option_id,text_response,source)
      values(q.id,q.session_id,p_event_id,v_user,v.participant_id,v.id,p_option_id,p_text,'qr') returning id into r.id;
  end if;
  return r.id;
end; $$;
revoke all on function public.submit_patron_pulse_response(uuid,uuid,uuid,uuid,text) from public;
grant execute on function public.submit_patron_pulse_response(uuid,uuid,uuid,uuid,text) to anon,authenticated;

-- Retire authenticated self-asserted participation writes. Admin and owner read policies stay.
drop policy "Users manage their pulse checkins" on public.patron_pulse_checkins;
create policy "Users read their pulse checkins" on public.patron_pulse_checkins for select to authenticated using(user_id=auth.uid());
drop policy "Users create their pulse responses" on public.patron_pulse_responses;
drop policy "Users update their pulse responses" on public.patron_pulse_responses;

-- Public Pulse configuration is only visible for public events; no participant data.
drop policy "Guests read open pulse sessions" on public.patron_pulse_sessions;
create policy "Guests read open pulse sessions" on public.patron_pulse_sessions for select to anon,authenticated using(
  status in ('open','paused') and exists(select 1 from public.events e where e.id=event_id and e.is_public and e.removed_at is null and e.status in ('scheduled','active')));
drop policy "Guests read visible pulses" on public.patron_pulses;
create policy "Guests read visible pulses" on public.patron_pulses for select to anon,authenticated using(
  status in ('scheduled','open','closed') and exists(select 1 from public.patron_pulse_sessions s where s.id=session_id and s.event_id=patron_pulses.event_id and s.status in ('open','paused')));
drop policy "Guests read published announcements" on public.patron_pulse_announcements;
create policy "Guests read published announcements" on public.patron_pulse_announcements for select to anon,authenticated using(
  status='published' and (publish_at is null or publish_at<=now()) and (expires_at is null or expires_at>now())
  and exists(select 1 from public.patron_pulse_sessions s where s.id=session_id and s.event_id=patron_pulse_announcements.event_id and s.status in ('open','paused')));
-- Option policy already follows its visible parent pulse.

-- Existing shared activity trigger referenced NEW.pulse_id on check-in rows.
-- JSON row projection safely preserves both trigger shapes and participant evidence.
create or replace function public.log_patron_pulse_participation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb:=to_jsonb(new);
begin
  insert into public.patron_pulse_activity_log(event_id,session_id,pulse_id,actor_id,actor_role,action,metadata)
    values(new.event_id,new.session_id,nullif(r->>'pulse_id','')::uuid,new.user_id,'guest',
      case when tg_table_name='patron_pulse_checkins' then 'guest_checked_in' else 'pulse_response_submitted' end,
      jsonb_strip_nulls(jsonb_build_object('option_id',r->'option_id','participant_id',r->'participant_id','presence_verification_id',r->'presence_verification_id')));
  return new;
end; $$;
revoke all on function public.log_patron_pulse_participation() from public,anon,authenticated;

create function bm1_presence_internal.emit_pulse_evidence() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v public.presence_verifications; v_type text; v_pulse uuid; v_pulse_type text; r jsonb:=to_jsonb(new);
begin
  if new.participant_id is null or new.presence_verification_id is null then return new; end if;
  if tg_op='UPDATE' then
    if tg_table_name='patron_pulse_checkins' then return new; end if;
    if new.option_id is not distinct from old.option_id and new.text_response is not distinct from old.text_response then return new; end if;
  end if;
  select * into v from public.presence_verifications where id=new.presence_verification_id and participant_id=new.participant_id and event_id=new.event_id;
  if v.id is null or v.credential_id is null then return new; end if;
  v_type:=case when tg_table_name='patron_pulse_checkins' then 'patron_pulse_checkin' else 'patron_pulse_response' end;
  if tg_table_name='patron_pulse_responses' then
    v_pulse:=new.pulse_id;
    select pulse_type into v_pulse_type from public.patron_pulses where id=v_pulse;
  end if;
  insert into public.signals(signal_type,actor_id,subject_type,subject_id,event_id,session_id,source,surface,verification_level,metadata,observation_id)
    values(v_type,new.user_id,case when v_pulse is null then 'event' else 'pulse' end,coalesce(v_pulse,new.event_id)::text,new.event_id,new.session_id::text,
      'patron_pulse','event_detail',v.verification_level,jsonb_build_object('contract_version','p2b2','evidence_origin','server_validated_participation',
      'participation_record_id',new.id,'participant_id',new.participant_id,'presence_verification_id',v.id,'presence_method',v.method,
      'credential_id',v.credential_id,'pulse_type',v_pulse_type,'option_id',r->'option_id',
      'has_text_response',nullif(r->>'text_response','') is not null,'acquisition_source','unknown'),gen_random_uuid());
  return new;
end; $$;
revoke all on function bm1_presence_internal.emit_pulse_evidence() from public,anon,authenticated;
create trigger pulse_checkin_signal after insert on public.patron_pulse_checkins for each row execute function bm1_presence_internal.emit_pulse_evidence();
create trigger pulse_response_signal after insert or update on public.patron_pulse_responses for each row execute function bm1_presence_internal.emit_pulse_evidence();
-- The legacy general telemetry RPC cannot fabricate verified Pulse participation.
create function bm1_presence_internal.guard_pulse_signal() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.signal_type in ('patron_pulse_checkin','patron_pulse_response') and pg_trigger_depth()<2 then
    raise exception 'Pulse signals require stored participation evidence';
  end if;
  return new;
end; $$;
revoke all on function bm1_presence_internal.guard_pulse_signal() from public,anon,authenticated;
create trigger signals_guard_pulse_evidence before insert on public.signals for each row execute function bm1_presence_internal.guard_pulse_signal();
