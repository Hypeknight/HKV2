-- Bind event transitions to the authenticated actor and close direct owner escalation.
-- No event data or previously applied migration is rewritten.
begin;

create or replace function bm1_private.enforce_event_actor_authority()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $guard$
declare
  v_uid uuid := auth.uid();
  v_new jsonb := to_jsonb(new);
  v_old jsonb;
  v_key text;
  v_admin boolean;
  v_privileged text[] := array[
    'is_paid','payment_override','approved_at','approved_by','rejected_at',
    'rejected_by','rejection_reason','removed_at','removed_by','hidden_by_admin',
    'admin_featured','admin_notes','admin_refund_note','revision_admin_note'
  ];
begin
  -- PostgREST role is selected from a validated JWT; user metadata is never authority.
  if current_setting('role',true) = 'service_role'
     or coalesce(auth.jwt()->>'role','') = 'service_role'
     or (current_setting('role',true) = 'none' and session_user in ('postgres','supabase_admin')) then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  if v_uid is null then raise exception 'Authenticated event actor required' using errcode='42501'; end if;
  select exists(select 1 from public.profiles where id=v_uid and app_role='admin') into v_admin;
  if v_admin then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  if tg_op='DELETE' then
    if old.owner_id is distinct from v_uid or old.status not in ('draft','building','rejected') then
      raise exception 'Only owned drafts may be deleted' using errcode='42501';
    end if;
    return old;
  end if;
  if new.owner_id is distinct from v_uid then
    raise exception 'Event ownership required' using errcode='42501';
  end if;
  if tg_op='INSERT' then
    if new.status not in ('draft','building') or new.status is null
       or new.is_approved is true or new.is_public is true
       or coalesce(v_new->>'payment_status','not_required') not in ('not_required','unpaid') then
      raise exception 'Owners may only create unapproved event drafts' using errcode='42501';
    end if;
    foreach v_key in array v_privileged loop
      if coalesce(v_new->v_key,'null'::jsonb) not in ('null'::jsonb,'false'::jsonb) then
        raise exception 'Administrator or trusted service required for event field %',v_key using errcode='42501';
      end if;
    end loop;
    return new;
  end if;
  if old.owner_id is distinct from v_uid or new.owner_id is distinct from old.owner_id then
    raise exception 'Event ownership cannot be delegated' using errcode='42501';
  end if;
  v_old := to_jsonb(old);
  foreach v_key in array v_privileged || array['payment_status'] loop
    if (v_new->v_key) is distinct from (v_old->v_key) then
      raise exception 'Administrator or trusted service required for event field %',v_key using errcode='42501';
    end if;
  end loop;
  if new.is_approved is true and old.is_approved is not true then
    raise exception 'Owners cannot approve events' using errcode='42501';
  end if;
  if new.status_changed_by is distinct from old.status_changed_by and new.status_changed_by is distinct from v_uid then
    raise exception 'Lifecycle actor must match authenticated owner' using errcode='42501';
  end if;
  if new.status_change_source is distinct from old.status_change_source and new.status_change_source is distinct from 'owner_action' then
    raise exception 'Owner lifecycle source must be owner_action' using errcode='42501';
  end if;
  if new.status_changed_at is distinct from old.status_changed_at and new.status is not distinct from old.status then
    raise exception 'Owner lifecycle history requires a status transition' using errcode='42501';
  end if;
  -- Owner transitions mirror lib/events/workflow.ts. Ordinary edits retain their status.
  if new.status is distinct from old.status then
    if not (
      (old.status in ('draft','rejected') and new.status='building') or
      (old.status in ('draft','building','rejected') and new.status='submitted') or
      (old.status in ('scheduled','active','live') and new.status='revision_draft') or
      (old.status='revision_draft' and new.status='revision_submitted') or
      (old.status in ('scheduled','active','live') and new.status='removal_requested') or
      (old.status in ('draft','building','submitted','approved_unpaid','paid_awaiting_approval',
                     'scheduled','active','live','removal_requested') and new.status='cancelled')
    ) then
      raise exception 'Unauthorized owner lifecycle transition' using errcode='42501';
    end if;
    if new.status in ('removal_requested','cancelled')
       and nullif(btrim(new.status_change_reason),'') is null then
      raise exception 'Owner lifecycle reason required' using errcode='42501';
    end if;
    if new.status_changed_by is distinct from v_uid then
      raise exception 'Lifecycle actor must match authenticated owner' using errcode='42501';
    end if;
  end if;
  -- A valid owner cancellation cannot undo an administrative visibility decision.
  if new.status='cancelled' and new.status is distinct from old.status and new.hidden_by_admin is true then
    new.is_public := false;
  end if;
  if new.is_public is true and (
    new.is_approved is not true or new.hidden_by_admin is true or
    new.status not in ('scheduled','active','live','completed','ended','cancelled','archived') or
    (old.is_public is not true and new.status <> 'cancelled')
  ) then
    raise exception 'Owners cannot publish or restore moderated events' using errcode='42501';
  end if;
  return new;
end;
$guard$;
revoke all on function bm1_private.enforce_event_actor_authority() from public, anon, authenticated;

create trigger bm1_event_actor_authority
before insert or update or delete on public.events
for each row execute function bm1_private.enforce_event_actor_authority();

-- Preserve the audited live RPC body and its return type/atomic history behavior.
-- It predates the checked-in migrations. Fail closed if its expected anchor has drifted.
do $patch$
declare
  v_signature regprocedure := 'public.transition_event_status(uuid,text,uuid,text,text,text,text,jsonb,jsonb)'::regprocedure;
  v_definition text;
  v_anchor text := E'begin\n  if p_event_id is null then';
  v_guard text := $actor$begin
  if not (current_setting('role',true) = 'service_role'
          or coalesce(auth.jwt()->>'role','') = 'service_role'
          or (current_setting('role',true) = 'none' and session_user in ('postgres','supabase_admin'))) then
    if auth.uid() is null or p_changed_by is distinct from auth.uid() then
      raise exception 'Transition actor must match authenticated caller' using errcode='42501';
    end if;
    if p_changed_by_role is null or p_changed_by_role not in ('owner','admin') then
      raise exception 'Trusted service required for system event transitions' using errcode='42501';
    end if;
    if p_changed_by_role='owner' and p_source is distinct from 'owner_action' then
      raise exception 'Owner transition source must be owner_action' using errcode='42501';
    end if;
  end if;
  if p_event_id is null then$actor$;
begin
  v_definition := pg_get_functiondef(v_signature);
  if position(v_anchor in v_definition)=0
     or position('Transition actor must match authenticated caller' in v_definition)>0 then
    raise exception 'Event transition RPC preflight failed: inspect current definition before applying';
  end if;
  execute replace(v_definition,v_anchor,v_guard);
end;
$patch$;
revoke execute on function public.transition_event_status(uuid,text,uuid,text,text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.transition_event_status(uuid,text,uuid,text,text,text,text,jsonb,jsonb) to authenticated,service_role;
commit;
