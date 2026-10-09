#!/usr/bin/env python3
"""Real PostgreSQL 17 focused fixture. BEGIN/ROLLBACK; never production."""
import subprocess,time,re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
container='hkv2-p2b2-guest-pulse-test'
def run(sql):
 r=subprocess.run(['docker','exec','-i',container,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-qAt'],input=sql,text=True,capture_output=True)
 if r.returncode:raise RuntimeError(r.stderr+r.stdout)
 return r.stdout.strip()
def uid(n):return '00000000-0000-4000-8000-'+str(n).zfill(12)
def deny(sql):
 try:run(sql)
 except RuntimeError:return
 raise AssertionError('Unauthorized operation accepted: '+sql)
def join(event=4,credential='valid-credential-'+'a'*32,token=None,actor=None):
 return run("set role "+('authenticated' if actor else 'anon')+"; set request.jwt.claim.sub='"+(uid(actor) if actor else '')+"'; select public.join_event_presence('"+uid(event)+"','"+credential+"',"+("'"+token+"'" if token else 'null')+");")
def call(name,token,extra='',actor=None):
 return "set role "+('authenticated' if actor else 'anon')+"; set request.jwt.claim.sub='"+(uid(actor) if actor else '')+"'; select public."+name+"('"+uid(4)+"','"+token+"'"+extra+");"
base='''create role anon; create role authenticated; create role service_role bypassrls; create role authenticated_session inherit; grant authenticated to authenticated_session;
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
create table markets(id uuid primary key,status text); create table market_areas(market_id uuid,city text,state text,is_active boolean);
create table venues(id uuid primary key,city text,state text,market_id uuid,status text);
create table events(id uuid primary key,owner_id uuid,venue_id uuid,city text,state text,market_id uuid,status text,is_public boolean,removed_at timestamptz,event_start_at timestamptz,event_end_at timestamptz,promotion_start_at timestamptz,promotion_end_at timestamptz);
create table external_events(id uuid primary key,venue_id uuid,city text,state text,market_id uuid,status text,event_start_at timestamptz,event_end_at timestamptz,source_code text);
create table platform_settings(id text primary key,patron_pulse_enabled boolean,patron_pulse_max_response_length integer);
insert into platform_settings values('global',true,500);
'''
foundation=Path('supabase/migrations/0002_signal_intelligence_foundation.sql').read_text()
base+=foundation[foundation.index('create table if not exists public.signals'):foundation.index('create index if not exists')]
base+='alter table signals add column market_id uuid references markets(id); alter table signals enable row level security;'
legacy=Path('supabase/migrations/0005_event_source_claim_foundation.sql').read_text();i=legacy.index('create or replace function public.record_hypeknight_signal(');base+=legacy[i:legacy.index('$$;',i)+3]
pp=Path('supabase/migrations/0023_production_pp_presence_schema_reconciliation.sql').read_text()
base+=pp[pp.index('CREATE TABLE IF NOT EXISTS'):pp.index('-- FUNCTIONS')].rsplit('-- ==========================================================',1)[0]
for table in ['event_patron_pulse_settings','patron_pulse_activity_log','patron_pulse_announcements','patron_pulse_checkins','patron_pulse_options','patron_pulse_responses','patron_pulse_sessions','patron_pulses','venue_presence_checkins','venue_presence_sessions']:
 base+='alter table '+table+' add primary key(id);'
base+='alter table patron_pulse_checkins add unique(session_id,user_id);alter table patron_pulse_responses add unique(pulse_id,user_id);alter table patron_pulse_sessions add unique(event_id);'
for filename in ['0024_bm1_presence_participant_foundation.sql','0025_bm1_presence_credentials.sql']:base+=Path('supabase/migrations/'+filename).read_text()
# Production identity tables have explicit restricted ACLs despite broad defaults.
base+='revoke all on presence_participants,presence_verifications,presence_credentials from public,anon,authenticated;'
# Real tables/RLS names and user policies being replaced; unrelated organizer config omitted.
for table in ['patron_pulse_checkins','patron_pulse_responses','patron_pulse_sessions','patron_pulses','patron_pulse_options','patron_pulse_announcements']:
 base+='alter table '+table+' enable row level security; grant select,insert,update,delete on '+table+' to anon,authenticated;'
base+='''
create policy "Users manage their pulse checkins" on patron_pulse_checkins to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Users create their pulse responses" on patron_pulse_responses for insert to authenticated with check(user_id=auth.uid());
create policy "Users update their pulse responses" on patron_pulse_responses for update to authenticated using(user_id=auth.uid());
create policy "Users read their pulse responses" on patron_pulse_responses for select to authenticated using(user_id=auth.uid());
create policy "Guests read open pulse sessions" on patron_pulse_sessions for select to anon,authenticated using(status in ('open','paused'));
create policy "Guests read visible pulses" on patron_pulses for select to anon,authenticated using(status in ('scheduled','open','closed'));
create policy "Guests read published announcements" on patron_pulse_announcements for select to anon,authenticated using(status='published');
create policy "Guests read pulse options" on patron_pulse_options for select to anon,authenticated using(is_active and exists(select 1 from patron_pulses p where p.id=pulse_id));
create table profiles(id uuid primary key,app_role text);
grant select on profiles to authenticated;
create policy "Admins manage pulse checkins" on patron_pulse_checkins to authenticated using(exists(select 1 from profiles where id=auth.uid() and app_role='admin')) with check(exists(select 1 from profiles where id=auth.uid() and app_role='admin'));
create policy "Admins manage pulse responses" on patron_pulse_responses to authenticated using(exists(select 1 from profiles where id=auth.uid() and app_role='admin')) with check(exists(select 1 from profiles where id=auth.uid() and app_role='admin'));
grant select on events to anon,authenticated;
'''
i=pp.index('CREATE OR REPLACE FUNCTION "public"."log_patron_pulse_participation"()');base+=pp[i:pp.index('$$;',i)+3]
base+='''create trigger patron_pulse_checkin_activity_trigger after insert on patron_pulse_checkins for each row execute function log_patron_pulse_participation();
create trigger patron_pulse_response_activity_trigger after insert on patron_pulse_responses for each row execute function log_patron_pulse_participation();'''
base+="insert into auth.users values('"+uid(1)+"'),('"+uid(2)+"');insert into markets values('"+uid(20)+"','active');insert into market_areas values('"+uid(20)+"','Kansas City','MO',true);insert into venues values('"+uid(3)+"','Kansas City','MO','"+uid(20)+"','draft');"
for n,status,public,start,end in [(4,'active','true',"now()-interval '1 hour'","now()+interval '1 hour'"),(5,'active','false',"now()-interval '1 hour'","now()+interval '1 hour'"),(6,'scheduled','true',"now()+interval '1 hour'","now()+interval '2 hours'"),(7,'completed','true',"now()-interval '2 hours'","now()-interval '1 hour'")]:
 base+="insert into events values('"+uid(n)+"','"+uid(1)+"','"+uid(3)+"','Kansas City','MO',null,'"+status+"',"+public+",null,"+start+","+end+",now()-interval '1 day',now()+interval '1 day');"
for token,status,expiry,valid in [('valid-credential-'+'a'*32,'active',"now()+interval '1 hour'",'null'),('expired-credential-'+'b'*32,'active',"now()-interval '1 minute'",'null'),('revoked-credential-'+'c'*32,'revoked','null','null'),('future-credential-'+'d'*32,'active',"now()+interval '2 hours'","now()+interval '1 hour'")]:
 base+="insert into presence_credentials(context_type,event_id,credential_type,token_hash,status,expires_at,valid_from) values('event','"+uid(4)+"','static_qr',encode(sha256(convert_to('"+token+"','UTF8')),'hex'),'"+status+"',"+expiry+","+valid+");"
base+="insert into patron_pulse_sessions(id,event_id,created_by,status) values('"+uid(8)+"','"+uid(4)+"','"+uid(1)+"','open');insert into patron_pulses(id,session_id,event_id,created_by,title,status) values('"+uid(9)+"','"+uid(8)+"','"+uid(4)+"','"+uid(1)+"','Question','open');insert into patron_pulse_options(id,pulse_id,label) values('"+uid(10)+"','"+uid(9)+"','A'),('"+uid(11)+"','"+uid(9)+"','B');"
base+="insert into signals(signal_type,subject_type,subject_id,metadata) values('page_view','page','legacy','{\"before\":true}');"
base+=Path('supabase/migrations/20261008145246_bm1_discovery_signal_collection.sql').read_text()
migration=Path('supabase/migrations/20261008231932_bm1_guest_presence_pulse_participation.sql').read_text()
try:
 subprocess.run(['docker','run','--rm','-d','--name',container,'-e','POSTGRES_PASSWORD=local-disposable-fixture','postgres:17'],check=True,capture_output=True)
 for _ in range(200):
  logs=subprocess.run(['docker','logs',container],capture_output=True,text=True)
  if 'PostgreSQL init process complete' in logs.stdout and subprocess.run(['docker','exec',container,'pg_isready','-U','postgres'],capture_output=True).returncode==0:break
  time.sleep(.2)
 else:raise RuntimeError('Disposable PostgreSQL did not become ready')
 run(base)
 # Production-shaped historical account rows with null participant/evidence.
 historical_sql="insert into patron_pulse_checkins(id,session_id,event_id,user_id) values('"+uid(71)+"','"+uid(8)+"','"+uid(4)+"','"+uid(2)+"');insert into patron_pulse_responses(id,pulse_id,session_id,event_id,user_id,option_id) values('"+uid(72)+"','"+uid(9)+"','"+uid(8)+"','"+uid(4)+"','"+uid(2)+"','"+uid(10)+"');"
 # Existing activity trigger is broken before P2-B2; seed as historical import.
 run('set session_replication_role=replica;'+historical_sql+'set session_replication_role=origin;')
 history_query="select jsonb_build_array((select to_jsonb(c) from patron_pulse_checkins c where id='"+uid(71)+"'),(select to_jsonb(r) from patron_pulse_responses r where id='"+uid(72)+"'))"
 historical=run(history_query)
 for role in ['anon','authenticated','authenticated_session']:
  for table in ['patron_pulse_checkins','patron_pulse_responses','signals']:
   assert run("select has_table_privilege('"+role+"','"+table+"','TRUNCATE')")=='t'
   assert run('begin;set role '+role+';truncate '+table+';reset role;select count(*) from '+table+';rollback;')=='0'
 assert run(history_query)==historical
 print('PASS original direct/inherited TRUNCATE bypass reproduced and rolled back')
 run('create role unexpected_evidence_writer;grant unexpected_evidence_writer to authenticated;grant truncate on signals to unexpected_evidence_writer;')
 try:run('begin;'+migration+'rollback;')
 except RuntimeError as error:assert 'Unexpected effective TRUNCATE privilege for authenticated on public.signals' in str(error)
 else:raise AssertionError('Inherited destructive grant silently accepted')
 run('revoke unexpected_evidence_writer from authenticated;revoke truncate on signals from unexpected_evidence_writer;drop role unexpected_evidence_writer;')
 print('PASS unexpected inherited destructive grant fails migration closed')
 run('begin;'+migration+"""
do $$ declare token uuid; begin
  token:=public.join_event_presence('"""+uid(4)+"""','valid-credential-"""+'a'*32+"""');
  perform public.submit_patron_pulse_response('"""+uid(4)+"""',token,'"""+uid(9)+"""','"""+uid(10)+"""',null);
  if (select count(*) from signals where metadata->>'contract_version'='p2b2')<>2 then raise exception 'Missing atomic signal evidence'; end if;
  if not exists(select 1 from pg_indexes where indexname='patron_pulse_responses_pulse_participant_key') then raise exception 'Missing dedup index'; end if;
  if exists(select 1 from information_schema.columns where table_name in ('patron_pulse_checkins','patron_pulse_responses') and column_name='user_id' and is_nullable='NO') then raise exception 'Guest identity blocked'; end if;
  if exists(select 1 from pg_class where relname in ('presence_participants','presence_verifications','presence_credentials','patron_pulse_checkins','patron_pulse_responses') and not relrowsecurity) then raise exception 'RLS lost'; end if;
  if has_schema_privilege('anon','bm1_presence_internal','usage') then raise exception 'Private helper exposed'; end if;
end $$;
select 'P2B2_TRANSACTION_END';rollback;""")
 assert run("select to_regprocedure('public.join_event_presence(uuid,text,uuid)') is null")=='t'
 assert run("select count(*) from presence_participants")=='0'
 assert run("select count(*) from signals where subject_id='legacy'")=='1'
 assert run(history_query)==historical
 print('PASS transaction reaches final statement; rollback preserves foundation and history')
 run(migration)
 assert run(history_query)==historical
 for role in ['anon','authenticated','authenticated_session']:
  for table in ['patron_pulse_checkins','patron_pulse_responses','signals','presence_participants','presence_verifications','presence_credentials']:
   for privilege in ['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']:
    assert run("select has_table_privilege('"+role+"','"+table+"','"+privilege+"')")=='f'
   deny('set role '+role+';truncate '+table+';')
 for table in ['patron_pulse_checkins','patron_pulse_responses','signals']:
  assert run("select has_table_privilege('service_role','"+table+"','TRUNCATE')")=='t'
  run('begin;set role service_role;truncate '+table+';rollback;')
 run("insert into profiles values('"+uid(70)+"','admin');")
 for table in ['patron_pulse_checkins','patron_pulse_responses']:
  assert run("begin;set role authenticated;set request.jwt.claim.sub='"+uid(70)+"';with changed as(update "+table+" set user_id=user_id returning id) select count(*) from changed;rollback;")=='1'
  assert run("begin;set role authenticated;set request.jwt.claim.sub='"+uid(70)+"';with removed as(delete from "+table+" returning id) select count(*) from removed;rollback;")=='1'
 assert run(history_query)==historical
 print('PASS destructive grants removed; service/admin operations and historical rows preserved')
 token=join();assert len(token)==36
 assert run("select count(*) from presence_participants where participant_token='"+token+"' and user_id is null and email is null")=='1'
 assert join(token=token)==token
 run(call('check_in_patron_pulse',token));run(call('check_in_patron_pulse',token))
 assert run('select count(*) from patron_pulse_checkins where participant_id is not null')=='1'
 print('PASS account/email optional guest; UUID cookie reuse; participant-linked check-in retry')
 response=lambda tok=token,option=10,actor=None:call('submit_patron_pulse_response',tok,",'"+uid(9)+"','"+uid(option)+"',null",actor)
 with ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(lambda _:run(response()),range(6)))
 assert run('select count(*) from patron_pulse_responses where participant_id is not null')=='1'
 assert run("select count(*) from signals where signal_type='patron_pulse_response'")=='1'
 deny(response(option=11));deny(call('submit_patron_pulse_response',token,",'"+uid(9)+"','"+uid(99)+"',null"))
 run("update patron_pulses set allow_multiple_responses=true where id='"+uid(9)+"';")
 run(response(option=11));run(response(option=11))
 assert run('select count(*) from patron_pulse_responses where participant_id is not null')=='1'
 assert run("select count(*) from signals where signal_type='patron_pulse_response'")=='2'
 print('PASS concurrent retry dedup; option ownership; single-answer denial; allowed revisions append once')
 assert run("select count(*) from patron_pulse_responses r join patron_pulse_checkins c using(participant_id,event_id,session_id) join presence_verifications v on v.id=r.presence_verification_id where v.participant_id=r.participant_id and v.credential_id is not null")=='1'
 assert run("select count(*) from signals where event_id='"+uid(4)+"' and venue_id='"+uid(3)+"' and market_id='"+uid(20)+"' and verification_level='presence_supported' and metadata->>'contract_version'='p2b2'")=='3'
 assert run("select count(*) from signals where metadata ? 'participant_token' or metadata ? 'email' or metadata ? 'text_response'")=='0'
 print('PASS verification/check-in linkage; P2-B1 canonical event/hidden venue/market normalization; no credential/answer leakage')
 for event in [5,6,7]:
  deny("set role anon;select join_event_presence('"+uid(event)+"','valid-credential-"+'a'*32+"');")
 for credential in ['invalid-credential-'+'x'*32,'expired-credential-'+'b'*32,'revoked-credential-'+'c'*32,'future-credential-'+'d'*32]:
  deny("set role anon;select join_event_presence('"+uid(4)+"','"+credential+"');")
 print('PASS private/non-Live event, invalid/expired/revoked/not-yet-valid QR denied')
 authenticated=join(actor=1);run(response(authenticated,10,1))
 assert run("select count(*) from signals where actor_id='"+uid(1)+"' and signal_type='patron_pulse_response'")=='1'
 deny(response(authenticated,10,2));deny(response(authenticated,10,None))
 state=run(call('get_patron_pulse_participant_state',token))
 assert 'text_response' in state and 'participant_token' not in state and 'user_id' not in state and 'email' not in state
 assert run(call('get_patron_pulse_participant_state',uid(99)))=='{"checkin": null, "verified": false, "responses": []}'
 print('PASS optional authenticated actor binding; another account/guest cannot use account token; scoped private viewer state')
 for role in ['anon','authenticated','authenticated_session']:
  for table in ['patron_pulse_checkins','patron_pulse_responses','signals']:
   assert run("set role "+role+";set request.jwt.claim.sub='"+uid(1)+"';with changed as(update "+table+" set id=id returning id) select count(*) from changed")=='0'
   assert run("set role "+role+";set request.jwt.claim.sub='"+uid(1)+"';with removed as(delete from "+table+" returning id) select count(*) from removed")=='0'
  deny('set role '+role+";insert into patron_pulse_checkins(session_id,event_id,user_id) values('"+uid(8)+"','"+uid(4)+"','"+uid(1)+"');")
  deny('set role '+role+";insert into patron_pulse_responses(pulse_id,session_id,event_id,user_id) values('"+uid(9)+"','"+uid(8)+"','"+uid(4)+"','"+uid(1)+"');")
  deny('set role '+role+';select * from presence_participants;')
  deny('set role '+role+';select * from presence_verifications;')
  deny('set role '+role+";select record_hypeknight_signal('patron_pulse_response','pulse','fake');")
 assert run("select has_schema_privilege('anon','bm1_presence_internal','usage')")=='f'
 print('PASS direct guest/auth table writes/private reads and fabricated Pulse telemetry denied')
 run("update patron_pulse_sessions set status='paused';")
 deny(response());run("update patron_pulse_sessions set status='open';update presence_credentials set status='revoked';")
 deny(response());assert '"verified": false' in run(call('get_patron_pulse_participant_state',token))
 assert run("select count(*) from signals where subject_id='legacy' and metadata='{"+'"before":true'+"}'::jsonb")=='1'
 run("update presence_credentials set status='active' where token_hash=encode(sha256(convert_to('valid-credential-"+'a'*32+"','UTF8')),'hex');")
 for change,restore in [
  ("update events set status='completed' where id='"+uid(4)+"'", "update events set status='active' where id='"+uid(4)+"'"),
  ("update events set event_end_at=now()-interval '1 minute' where id='"+uid(4)+"'", "update events set event_end_at=now()+interval '1 hour' where id='"+uid(4)+"'"),
  ("update presence_verifications set revoked_at=now()", "update presence_verifications set revoked_at=null"),
  ("update patron_pulses set closes_at=now()-interval '1 minute'", "update patron_pulses set closes_at=null"),
  ("update platform_settings set patron_pulse_enabled=false", "update platform_settings set patron_pulse_enabled=true"),
  ("update patron_pulse_checkins set status='removed'", "update patron_pulse_checkins set status='checked_in'")]:
  run(change);deny(response());run(restore)
 run("insert into patron_pulse_sessions(id,event_id,created_by,status) values('"+uid(80)+"','"+uid(5)+"','"+uid(1)+"','open');insert into patron_pulses(id,session_id,event_id,created_by,title,status) values('"+uid(90)+"','"+uid(80)+"','"+uid(5)+"','"+uid(1)+"','Private','open');insert into patron_pulse_options(id,pulse_id,label) values('"+uid(100)+"','"+uid(90)+"','Private');insert into patron_pulse_announcements(session_id,event_id,title,message,created_by,status) values('"+uid(80)+"','"+uid(5)+"','Private','Private','"+uid(1)+"','published');")
 for table,predicate in [('patron_pulse_sessions',"event_id='"+uid(5)+"'"),('patron_pulses',"event_id='"+uid(5)+"'"),('patron_pulse_options',"pulse_id='"+uid(90)+"'"),('patron_pulse_announcements',"event_id='"+uid(5)+"'")]:
  assert run('set role anon;select count(*) from '+table+' where '+predicate)=='0'
 print('PASS completed/ended event, revoked evidence, closed pulse, disabled Core, removed participant denied; private Pulse config hidden')
 print('PASS paused session/revoked credential close existing participation; historical raw evidence unchanged')
 assert run(history_query)==historical
 print('12 database security/behavior groups passed; no production connection')
finally:subprocess.run(['docker','stop',container],capture_output=True)
