#!/usr/bin/env python3
"""Disposable PostgreSQL 17 fixture only. No production connection or credentials.
Exercises the actual additive migration and legacy owner signal RPC with RLS.
The fixture uses the production-verified operational uniqueness/RLS contracts.
"""
import json, subprocess, time
from pathlib import Path
container='hkv2-p2b3b-reporting-test'
def run(sql):
 r=subprocess.run(['docker','exec','-i',container,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-qAt'],input=sql,text=True,capture_output=True)
 if r.returncode: raise RuntimeError(r.stderr+r.stdout)
 return r.stdout.strip()
def uid(n): return '00000000-0000-4000-8000-'+str(n).zfill(12)
def as_user(sql,actor=1,role='authenticated'):
 return run("set role "+role+"; set request.jwt.claim.sub='"+(uid(actor) if actor else '')+"'; "+sql)
def deny(sql,actor=2,role='authenticated'):
 try: as_user(sql,actor,role)
 except RuntimeError: return
 raise AssertionError('Unauthorized aggregate accepted')
def own(actor=1): return json.loads(as_user("select public.get_owned_event_reporting_facts('"+uid(10)+"');",actor))
def pulse(actor=1): return json.loads(as_user("select public.get_event_pulse_reporting_facts('"+uid(10)+"');",actor) or 'null')
base='''create role anon; create role authenticated;
alter default privileges in schema public grant all on tables to anon,authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;
create table profiles(id uuid primary key,app_role text);
create table events(id uuid primary key,owner_id uuid,is_public boolean,status text);
create table event_saves(id uuid primary key default gen_random_uuid(),event_id uuid references events,user_id uuid references profiles,unique(event_id,user_id));
create table event_rsvps(id uuid primary key default gen_random_uuid(),event_id uuid references events,user_id uuid references profiles,status text check(status in ('going','interested','not_going')),unique(event_id,user_id));
alter table event_saves enable row level security; alter table event_rsvps enable row level security;
create policy saves_own on event_saves to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy rsvps_own on event_rsvps to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy saves_public on event_saves for select to authenticated using(exists(select 1 from events e where e.id=event_id and e.is_public and e.status in ('scheduled','active','live')));
create policy rsvps_public on event_rsvps for select to authenticated using(exists(select 1 from events e where e.id=event_id and e.is_public and e.status in ('scheduled','active','live')));
create table signals(id uuid primary key default gen_random_uuid(),event_id uuid,signal_type text,source text,metadata jsonb default '{}',observation_id uuid unique,actor_id uuid,anonymous_session_id text,occurred_at timestamptz default now());
alter table signals enable row level security;
create policy signals_admin on signals for select to authenticated using(exists(select 1 from profiles p where p.id=auth.uid() and p.app_role='admin'));
create table analytics_logs(event_id uuid,action text);
create table patron_pulse_sessions(id uuid primary key,event_id uuid unique);
create table patron_pulses(id uuid primary key,session_id uuid,event_id uuid,title text,status text,created_at timestamptz default now());
create table patron_pulse_options(id uuid primary key,pulse_id uuid,label text,sort_order integer default 0);
create table patron_pulse_responses(id uuid primary key default gen_random_uuid(),pulse_id uuid,session_id uuid,event_id uuid,user_id uuid,participant_id uuid,option_id uuid,text_response text,updated_at timestamptz default now(),unique(pulse_id,user_id),check(participant_id is not null or user_id is not null));
create unique index response_participant_unique on patron_pulse_responses(pulse_id,participant_id) where participant_id is not null;
alter table patron_pulse_responses enable row level security;
create policy response_owner on patron_pulse_responses for select to authenticated using(exists(select 1 from events e where e.id=event_id and e.owner_id=auth.uid()));
create policy response_user on patron_pulse_responses for select to authenticated using(user_id=auth.uid());
create policy response_admin on patron_pulse_responses for select to authenticated using(exists(select 1 from profiles p where p.id=auth.uid() and p.app_role='admin'));
'''
migration=Path('supabase/migrations/20261010013121_bm1_reporting_completion.sql').read_text()
try:
 subprocess.run(['docker','run','--rm','-d','--name',container,'-e','POSTGRES_PASSWORD=local-disposable-fixture','postgres:17'],check=True,capture_output=True)
 for _ in range(60):
  if subprocess.run(['docker','exec',container,'pg_isready','-U','postgres'],capture_output=True).returncode==0: break
  time.sleep(1)
 else: raise RuntimeError('Local Postgres did not start')
 run(base)
 run("insert into profiles values('"+uid(1)+"','user'),('"+uid(2)+"','user'),('"+uid(3)+"','admin'); insert into events values('"+uid(10)+"','"+uid(1)+"',true,'active'),('"+uid(11)+"','"+uid(2)+"',false,'draft');")
 policies=run('select json_agg(p) from (select * from pg_policies order by tablename,policyname) p;')
 body=migration.replace('begin;','',1).replace('commit;','')
 run('begin;'+body+'rollback;')
 assert run("select to_regprocedure('public.get_owned_event_reporting_facts(uuid)') is null;")=='t'
 run(migration)
 assert run('select json_agg(p) from (select * from pg_policies order by tablename,policyname) p;')==policies
 print('PASS migration rollback/reapply; existing RLS unchanged')
 for name in ['get_owned_event_reporting_facts','get_event_pulse_reporting_facts']:
  deny("select public."+name+"('"+uid(10)+"');",None,'anon')
  deny("select public."+name+"('"+uid(10)+"');",2)
  deny("select public."+name+"('"+uid(99)+"');",1)
 deny("select bm1_reporting_internal.owned_event_facts('"+uid(10)+"');",2)
 deny("select public.get_owned_event_reporting_facts('"+uid(10)+"');",3)
 assert own()['saved']==own()['going']==0
 assert as_user('select count(*) from event_saves;',None,'anon')=='0'
 print('PASS anonymous/non-owner/private-call guards; authorized observed zero')
 run("insert into event_saves(event_id,user_id) values('"+uid(10)+"','"+uid(2)+"'); insert into event_rsvps(event_id,user_id,status) values('"+uid(10)+"','"+uid(2)+"','going'); insert into signals(event_id,signal_type,actor_id) select '"+uid(10)+"','event_saved','"+uid(2)+"' from generate_series(1,7); insert into analytics_logs select '"+uid(10)+"','event_saved' from generate_series(1,7);")
 assert own()['saved']==own()['going']==1
 run("delete from event_saves; update event_rsvps set status='not_going';")
 assert own()['saved']==own()['going']==0
 run(Path('supabase/migrations/0010_event_owner_analytics_foundation.sql').read_text())
 history=as_user("select signal_count from get_owned_event_signal_summary('"+uid(10)+"') where signal_type='event_saved';")
 assert history=='7'
 assert as_user('select count(*) from signals;',1)=='0'
 print('PASS current unsave/RSVP changes do not rewrite or double-count history; raw signals stay hidden')
 run("insert into signals(event_id,signal_type,source,metadata,observation_id) values ('"+uid(10)+"','discovery_impression','browser','{\"contract_version\":\"p2b1\",\"evidence_origin\":\"browser_reported\",\"exposure_class\":\"organic\"}','"+uid(20)+"'),('"+uid(10)+"','discovery_impression','browser','{}',null),('"+uid(10)+"','discovery_impression','browser','{\"exposure_class\":\"organic\"}',null),('"+uid(10)+"','featured_purchase','event_action','{}',null);")
 assert own()['organic_observations']==1 and own()['unclassified_observations']==2
 assert 'acquisition_source' not in own()
 print('PASS canonical organic contract only; legacy/unknown preserved; purchase is not exposure')
 assert pulse() is None
 run("insert into patron_pulse_sessions values('"+uid(30)+"','"+uid(10)+"'); insert into patron_pulses values('"+uid(40)+"','"+uid(30)+"','"+uid(10)+"','Poll','closed',now()); insert into patron_pulse_options values('"+uid(50)+"','"+uid(40)+"','A',0),('"+uid(51)+"','"+uid(40)+"','B',1);")
 assert pulse()['responseCount']==0 and pulse()['results'][0]['optionSample']==0
 assert pulse(3)==pulse()
 for n in [999,1000,1001,2001]:
  run("truncate patron_pulse_responses; insert into patron_pulse_responses(pulse_id,session_id,event_id,participant_id,option_id) select '"+uid(40)+"','"+uid(30)+"','"+uid(10)+"',md5('guest-'||i::text)::uuid,'"+uid(50)+"' from generate_series(1,"+str(n)+") i;")
  data=pulse();assert data['responseCount']==n and data['results'][0]['optionSample']==n and data['results'][0]['options'][0]['count']==n
 print('PASS empty poll, missing session, admin override and 999/1000/1001/2001 complete guest samples')
 run("update patron_pulse_responses set option_id='"+uid(51)+"',updated_at=now() where participant_id=md5('guest-1')::uuid; insert into patron_pulse_responses(pulse_id,session_id,event_id,user_id,option_id) values('"+uid(40)+"','"+uid(30)+"','"+uid(10)+"','"+uid(2)+"','"+uid(51)+"');")
 data=pulse();assert data['responseCount']==2002 and data['results'][0]['options'][1]['count']==2
 assert as_user('select count(*) from patron_pulse_responses;',2)=='1'
 deny("select public.get_event_pulse_reporting_facts('"+uid(10)+"');",2)
 for key in ['participant_id','user_id','text_response','updated_at','actor_id']: assert key not in json.dumps(data)
 print('PASS revisions update one effective answer; legacy account plus guests; participants cannot read owner aggregate or identities')
 run("insert into patron_pulses select md5('poll-'||i::text)::uuid,'"+uid(30)+"','"+uid(10)+"','Empty','closed',now() from generate_series(1,1001) i;")
 assert len(pulse()['results'])==1002
 run("update patron_pulse_responses set event_id='"+uid(11)+"' where user_id='"+uid(2)+"';")
 try: pulse()
 except RuntimeError: pass
 else: raise AssertionError('Inconsistent context accepted')
 print('PASS complete Pulse inventory beyond 1000; inconsistent response context rejected')
 assert run("select bool_and(proconfig @> array['search_path=\"\"']) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='bm1_reporting_internal';")=='t'
 print('8 reporting database groups passed; no production connection')
finally:
 subprocess.run(['docker','stop',container],capture_output=True)
