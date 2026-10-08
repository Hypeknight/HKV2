"""Focused PostgreSQL 17 guard tests. Synthetic fixture only; never connects to production.
The fixture reproduces audited events/history ownership RLS and the legacy RPC's
actor lookup/update/history behavior. It omits unrelated FK/market/timestamp triggers.
"""
from pathlib import Path
import subprocess
import json
import re

CONTAINER='hkv2-event-security-postgres'
DB='hkv2_event_actor_test'
OWNER='00000000-0000-0000-0000-000000000001'
OTHER='00000000-0000-0000-0000-000000000002'
ADMIN='00000000-0000-0000-0000-000000000003'
EVENT='00000000-0000-0000-0000-000000000011'
PUBLIC_EVENT='00000000-0000-0000-0000-000000000012'
NEW_EVENT='00000000-0000-0000-0000-000000000013'
count=0

def sql(source, good=True):
    r=subprocess.run(['docker','exec','-i',CONTAINER,'psql','-X','-U','postgres','-d',DB,'-v','ON_ERROR_STOP=1','-q'],input=source,text=True,capture_output=True)
    if (r.returncode==0)!=good:
        raise AssertionError(r.stdout+r.stderr)
    return r

def request(role,uid,body,good=True):
    claims=json.dumps({'role':role,'sub':uid} if uid else {'role':role})
    return sql('begin; set local role '+role+"; select set_config('request.jwt.claims','"+claims+"',true); "+body+'; commit;',good)

def denied(label,body,uid=OWNER,role='authenticated',state='42501'):
    global count
    r=request(role,uid,body,False)
    # psql verbose includes the SQLSTATE, proving an authority failure rather than syntax.
    if state not in r.stderr: raise AssertionError(label+': '+r.stderr)
    count+=1
    print('PASS denied: '+label)

def allowed(label,body,uid=OWNER,role='authenticated'):
    global count
    request(role,uid,body)
    count+=1
    print('PASS allowed: '+label)

def rpc(event=EVENT,status='submitted',actor=OWNER,kind='owner',updates='{}',reason='reason',source='owner_action'):
    return "select public.transition_event_status('"+event+"','"+status+"','"+actor+"','"+kind+"','"+reason+"',null,'"+source+"','{}','"+updates+"')"

subprocess.run(['docker','exec',CONTAINER,'psql','-X','-U','postgres','-c','drop database if exists '+DB],check=True,capture_output=True)
subprocess.run(['docker','exec',CONTAINER,'psql','-X','-U','postgres','-c','create database '+DB],check=True,capture_output=True)
fields={'venue_id':'uuid','venue_connection_status':"text default 'unmatched'",'event_start_at':'timestamptz','event_end_at':'timestamptz','promotion_start_at':'timestamptz','promotion_end_at':'timestamptz','discovery_start_at':'timestamptz','discovery_end_at':'timestamptz','included_promo_days':'integer default 14','extra_promo_days':'integer default 0','venue_relationship_verified':'boolean default false','staff_pick':'boolean default false','is_approved':'boolean default false','is_paid':'boolean default false','is_public':'boolean default false','payment_override':'boolean default false','payment_status':"text default 'not_required'",'approved_at':'timestamptz','approved_by':'uuid','rejected_at':'timestamptz','rejected_by':'uuid','rejection_reason':'text','hidden_by_admin':'boolean default false','removed_at':'timestamptz','removed_by':'uuid','admin_featured':'boolean default false','admin_notes':'text','admin_refund_note':'text','revision_admin_note':'text'}
base="""
do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; create role authenticated; create role service_role bypassrls; end if; end $$;
create schema auth; create schema bm1_private;
grant usage on schema public,auth,bm1_private to anon,authenticated,service_role;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
create table profiles(id uuid primary key,app_role text);
create table venue_managers(venue_id uuid,user_id uuid,status text);
create function bm1_private.can_manage_venue(target uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.venue_managers where venue_id=target and user_id=auth.uid() and status='active') $$;
create table events(id uuid primary key,owner_id uuid not null,name text,status text not null,
status_changed_at timestamptz,status_changed_by uuid,status_change_reason text,status_change_source text,updated_at timestamptz,
"""+','.join(k+' '+v for k,v in fields.items())+"""
);
create table event_status_history(event_id uuid,from_status text,to_status text,changed_by uuid,changed_by_role text,reason text,note text,source text,metadata jsonb);
alter table profiles enable row level security;
create policy profiles_read on profiles for select using(id=auth.uid());
alter table events enable row level security;
create policy event_public on events for select using(is_public=true);
create policy event_owner on events for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy event_admin on events for all to authenticated using(exists(select 1 from profiles where id=auth.uid() and app_role='admin')) with check(exists(select 1 from profiles where id=auth.uid() and app_role='admin'));
alter table event_status_history enable row level security;
create policy history_insert on event_status_history for insert to authenticated with check(changed_by=auth.uid() and (exists(select 1 from profiles where id=auth.uid() and app_role='admin') or exists(select 1 from events where id=event_id and owner_id=auth.uid())));
grant select on profiles to anon,authenticated;
grant all on events,event_status_history to anon,authenticated,service_role;
"""
# Reproduce the audited legacy SECURITY DEFINER RPC, including the exact patch anchor.
updates=[]
for k in ['is_approved','is_paid','is_public','payment_override','payment_status','approved_at','approved_by','rejected_at','rejected_by','rejection_reason','hidden_by_admin','removed_at','removed_by']:
    kind=fields[k].split()[0]
    value="(p_event_updates->>'"+k+"')::"+kind if kind=='boolean' else "nullif(p_event_updates->>'"+k+"','')::"+kind
    updates.append(k+"=case when p_event_updates ? '"+k+"' then "+value+' else '+k+' end')
base+="""
create function public.transition_event_status(p_event_id uuid,p_to_status text,p_changed_by uuid,p_changed_by_role text,p_reason text default null,p_note text default null,p_source text default 'system',p_metadata jsonb default '{}',p_event_updates jsonb default '{}')
returns events language plpgsql security definer set search_path=public as $function$
declare v_event events; v_updated_event events; v_from_status text; v_is_admin boolean:=false; v_is_owner boolean:=false;
begin
  if p_event_id is null then raise exception 'Event id is required.'; end if;
  if p_to_status is null or btrim(p_to_status)='' then raise exception 'Destination status is required.'; end if;
  if p_changed_by is null then raise exception 'The transition actor is required.'; end if;
  select * into v_event from public.events where id=p_event_id for update;
  if not found then raise exception 'Event not found.'; end if;
  v_from_status:=v_event.status;
  select exists(select 1 from public.profiles where id=p_changed_by and app_role='admin') into v_is_admin;
  v_is_owner:=v_event.owner_id=p_changed_by;
  if not v_is_admin and not v_is_owner then raise exception 'You do not have permission to transition this event.'; end if;
  if p_changed_by_role='admin' and not v_is_admin then raise exception 'The supplied actor is not an administrator.'; end if;
  if p_changed_by_role='owner' and not v_is_owner then raise exception 'The supplied actor is not the event owner.'; end if;
  update public.events set status=p_to_status,status_changed_at=now(),status_changed_by=p_changed_by,status_change_reason=nullif(btrim(p_reason),''),status_change_source=nullif(btrim(p_source),''),updated_at=now(),
"""+','.join(updates)+""" where id=p_event_id returning * into v_updated_event;
  insert into public.event_status_history values(p_event_id,v_from_status,p_to_status,p_changed_by,p_changed_by_role,p_reason,p_note,p_source,p_metadata);
  return v_updated_event;
end;
$function$;
grant execute on function public.transition_event_status(uuid,text,uuid,text,text,text,text,jsonb,jsonb) to anon,authenticated,service_role;
"""
base+="insert into profiles values('"+OWNER+"','user'),('"+OTHER+"','user'),('"+ADMIN+"','admin');"
base+="insert into events(id,owner_id,name,status) values('"+EVENT+"','"+OWNER+"','Owner draft','draft');"
base+="insert into events(id,owner_id,name,status,is_approved,is_public) values('"+PUBLIC_EVENT+"','"+OWNER+"','Public history','scheduled',true,true);"
sql('\\set VERBOSITY verbose\n'+base)
# Demonstrate the defect against synthetic fixtures, rolling back the exploit.
request('anon',None,rpc(actor=ADMIN,kind='admin',status='scheduled',updates='{"is_approved":true,"is_public":true}')+'; rollback')
print('PASS baseline: anonymous actor spoof reproduced, rolled back')
migration=Path('supabase/migrations/20261008015556_bm1_event_transition_actor_authority.sql').read_text()
# Synthetic fixture is explicitly different from live DDL; retain a strict hash gate locally.
fixture_hash=re.search(r'[a-f0-9]{32}',sql("select md5(pg_get_functiondef('public.transition_event_status(uuid,text,uuid,text,text,text,text,jsonb,jsonb)'::regprocedure))").stdout).group()
migration=migration.replace('eb0e3f3269cc9c9276cbcedd7cbbe862',fixture_hash)
# Migration apply/rollback must restore the original ACL and leave no trigger behind.
sql(migration.rsplit('commit;',1)[0]+'rollback;')
sql("do $$ begin if exists(select 1 from pg_trigger where tgname='bm1_event_actor_authority') then raise exception 'rollback retained trigger'; end if; if not has_function_privilege('anon','public.transition_event_status(uuid,text,uuid,text,text,text,text,jsonb,jsonb)','execute') then raise exception 'rollback lost ACL'; end if; end $$;")
print('PASS migration: transactional rollback')
sql(migration)
# Every psql session uses verbose errors for SQLSTATE assertions.
_original_sql=sql
def sql(source,good=True): return _original_sql('\\set VERBOSITY verbose\n'+source,good)
sql("insert into venue_managers values('00000000-0000-0000-0000-000000000098','"+OWNER+"','active')")

denied('owner cannot buy extra days by direct update',"update events set extra_promo_days=46 where id='"+EVENT+"'")
denied('owner cannot inflate free Discovery',"update events set included_promo_days=60 where id='"+EVENT+"'")
denied('owner cannot forge Featured editorial state',"update events set staff_pick=true where id='"+EVENT+"'")
denied('owner cannot forge venue verification',"update events set venue_relationship_verified=true where id='"+EVENT+"'")
denied('owner cannot approve another venue connection',"update events set venue_id='00000000-0000-0000-0000-000000000099',venue_connection_status='approved' where id='"+EVENT+"'")
denied('draft insert cannot smuggle Discovery entitlement',"insert into events(id,owner_id,status,extra_promo_days) values('"+NEW_EVENT+"','"+OWNER+"','draft',46)")
denied('draft insert cannot smuggle early Discovery',"insert into events(id,owner_id,status,event_start_at,discovery_start_at) values('"+NEW_EVENT+"','"+OWNER+"','draft','2027-01-01','2026-01-01')")
allowed('organizer creates event at unmanaged venue without acceptance',"insert into events(id,owner_id,status,venue_id,venue_connection_status) values('"+NEW_EVENT+"','"+OWNER+"','draft','00000000-0000-0000-0000-000000000099','pending'); delete from events where id='"+NEW_EVENT+"'")
allowed('active venue manager creates approved connection',"insert into events(id,owner_id,status,venue_id,venue_connection_status) values('"+NEW_EVENT+"','"+OWNER+"','draft','00000000-0000-0000-0000-000000000098','approved'); delete from events where id='"+NEW_EVENT+"'")
allowed('owner draft date and authorized window recalculation',"update events set event_start_at='2027-01-01',promotion_start_at='2026-12-18',discovery_start_at='2026-12-18' where id='"+EVENT+"'")
denied('draft window cannot start before entitlement',"update events set discovery_start_at='2026-11-01' where id='"+EVENT+"'")
denied('anonymous RPC',rpc(actor=ADMIN,kind='admin'),uid=None,role='anon')
denied('authenticated without subject',rpc(),uid=None)
denied('outsider impersonates owner',rpc(),uid=OTHER)
denied('outsider impersonates admin',rpc(actor=ADMIN,kind='admin'),uid=OTHER)
denied('owner impersonates admin',rpc(actor=ADMIN,kind='admin'))
denied('owner chooses system role',rpc(kind='system'))
denied('owner chooses null role',rpc().replace("'owner','reason'","null,'reason'"))
denied('owner forges provenance',rpc(source='admin_action'))
denied('owner self-approval RPC',rpc(status='scheduled',updates='{"is_approved":true,"is_public":true}'))
denied('owner payment override RPC',rpc(updates='{"payment_override":true}'))
denied('owner forges direct lifecycle actor',"update events set status_changed_by='"+ADMIN+"' where id='"+EVENT+"'")
denied('owner forges direct lifecycle source',"update events set status_change_source='admin_action' where id='"+EVENT+"'")
denied('owner forges same-status history',rpc(status='draft'))
denied('direct owner self-approval',"update events set is_approved=true where id='"+EVENT+"'")
denied('direct owner payment flag',"update events set is_paid=true where id='"+EVENT+"'")
denied('direct owner lifecycle escalation',"update events set status='scheduled',status_changed_by='"+OWNER+"' where id='"+EVENT+"'")
denied('privileged initial event insert',"insert into events(id,owner_id,status,is_approved,is_public) values('"+NEW_EVENT+"','"+OWNER+"','scheduled',true,true)")
denied('direct owner admin note',"update events set admin_notes='forged' where id='"+EVENT+"'")
# Failure must have left both the row and history unchanged.
sql("do $$ begin if (select status from events where id='"+EVENT+"') <> 'draft' or exists(select 1 from event_status_history) then raise exception 'denied write persisted'; end if; end $$;")
allowed('ordinary owner content edit',"update events set name='Updated draft' where id='"+EVENT+"'")
allowed('legitimate owner resumes draft',rpc(status='building',updates='{"is_approved":false,"is_public":false}'))
allowed('legitimate owner submits',rpc(updates='{"is_approved":false,"is_public":false}'))
allowed('administrator approval without payment',rpc(actor=ADMIN,kind='admin',status='scheduled',source='admin_action',updates='{"is_approved":true,"is_public":true}'),uid=ADMIN)
denied('approved owner cannot reschedule without review',"update events set event_start_at='2027-02-01' where id='"+EVENT+"'")
denied('approved owner cannot alter Discovery eligibility',"update events set discovery_start_at='2026-01-01' where id='"+EVENT+"'")
allowed('ordinary approved event edit preserves public state',"update events set name='Safe public edit' where id='"+EVENT+"'")
allowed('owner cancellation retains public history',rpc(status='cancelled',updates='{"is_public":true}'))
allowed('owner material revision',rpc(event=PUBLIC_EVENT,status='revision_draft',updates='{"is_public":false}'))
allowed('owner revision submission',rpc(event=PUBLIC_EVENT,status='revision_submitted',updates='{"is_public":false}'))
allowed('administrator rejects revision',rpc(event=PUBLIC_EVENT,status='revision_draft',actor=ADMIN,kind='admin',source='admin_action'),uid=ADMIN)
allowed('service payment/system context preserved',rpc(event=PUBLIC_EVENT,status='scheduled',kind='system',source='system',updates='{"is_approved":true,"is_public":true}'),uid=None,role='service_role')
allowed('owner removal request',rpc(event=PUBLIC_EVENT,status='removal_requested',updates='{"is_public":false}'))
allowed('administrator preserves hidden event',"update events set hidden_by_admin=true where id='"+PUBLIC_EVENT+"'",uid=ADMIN)
allowed('owner can cancel hidden event without publishing it',rpc(event=PUBLIC_EVENT,status='cancelled',updates='{"is_public":true}'))
sql("do $$ begin if (select is_public from events where id='"+PUBLIC_EVENT+"') then raise exception 'hidden cancellation became public'; end if; end $$;")
# Hide using the administrator, then ensure owner cannot undo moderation.
allowed('administrator hides venue-independent event',"update events set hidden_by_admin=true,is_public=false where id='"+EVENT+"'",uid=ADMIN)
denied('owner cannot clear moderation',"update events set hidden_by_admin=false where id='"+EVENT+"'")
denied('owner cannot restore visibility',"update events set is_public=true where id='"+EVENT+"'")
denied('owner cannot delete published history',"delete from events where id='"+EVENT+"'")
allowed('owner inserts a clean draft',"insert into events(id,owner_id,status) values('"+NEW_EVENT+"','"+OWNER+"','draft')")
allowed('owner can discard draft',"delete from events where id='"+NEW_EVENT+"'")
# RLS protects other-owned rows even when the trigger sees zero matching rows.
allowed('other account updates zero owner rows',"do $$ declare n integer; begin update events set name='forged' where id='"+EVENT+"'; get diagnostics n=row_count; if n<>0 then raise exception 'RLS allowed foreign write'; end if; end $$",uid=OTHER)
sql("do $$ begin if (select count(*) from event_status_history)<8 then raise exception 'history lost'; end if; if (select is_paid from events where id='"+EVENT+"') is true then raise exception 'payment became publication gate'; end if; end $$;")
allowed('administrator can delete an owned draft',"insert into events(id,owner_id,status) values('"+NEW_EVENT+"','"+OWNER+"','draft'); delete from events where id='"+NEW_EVENT+"'; do $$ begin if exists(select 1 from events where id='"+NEW_EVENT+"') then raise exception 'admin delete skipped'; end if; end $$",uid=ADMIN)
allowed('trusted service can delete a draft',"insert into events(id,owner_id,status) values('"+NEW_EVENT+"','"+OWNER+"','draft'); delete from events where id='"+NEW_EVENT+"'; do $$ begin if exists(select 1 from events where id='"+NEW_EVENT+"') then raise exception 'service delete skipped'; end if; end $$",uid=None,role='service_role')
print(str(count)+' event actor security assertions: PASS')
