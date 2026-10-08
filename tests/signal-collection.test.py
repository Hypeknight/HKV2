#!/usr/bin/env python3
"""Disposable PostgreSQL 17 fixture; never connects to any Supabase project.
Exercises real raw signal DDL/legacy RPC and P2-B1 migration, rollback, roles,
canonical attribution, hidden records, receipt replay and concurrent retry.
This is a focused schema fixture, not a full production database reset.
"""
import subprocess, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
container='hkv2-p2b1-signal-test'
def run(sql):
 r=subprocess.run(['docker','exec','-i',container,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-qAt'],input=sql,text=True,capture_output=True)
 if r.returncode: raise RuntimeError(r.stderr + r.stdout)
 return r.stdout.strip()
base='''
create role anon; create role authenticated;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.markets(id uuid primary key,status text);
create table public.market_areas(market_id uuid,city text,state text,is_active boolean);
create table public.venues(id uuid primary key,city text,state text,market_id uuid,status text);
create table public.events(id uuid primary key,venue_id uuid references public.venues(id),city text,state text,market_id uuid,status text,is_public boolean,removed_at timestamptz,promotion_start_at timestamptz,promotion_end_at timestamptz);
create table public.external_events(id uuid primary key,venue_id uuid,city text,state text,market_id uuid,status text,event_start_at timestamptz,event_end_at timestamptz,source_code text);
'''
foundation=Path('supabase/migrations/0002_signal_intelligence_foundation.sql').read_text()
base+=foundation[foundation.index('create table if not exists public.signals'):foundation.index('create index if not exists')]
base+='alter table public.signals add column market_id uuid references public.markets(id); alter table public.signals enable row level security;\n'
legacy=Path('supabase/migrations/0005_event_source_claim_foundation.sql').read_text()
start=legacy.index('create or replace function public.record_hypeknight_signal(')
end=legacy.index('$$;',start)+3
base+=legacy[start:end]
base+='''
revoke all on function public.record_hypeknight_signal(text,text,text,uuid,uuid,text,text,text,text,text,text,numeric,numeric,text,jsonb) from public;
grant execute on function public.record_hypeknight_signal(text,text,text,uuid,uuid,text,text,text,text,text,text,numeric,numeric,text,jsonb) to anon,authenticated;
insert into auth.users values('00000000-0000-4000-8000-000000000010');
insert into markets values('00000000-0000-4000-8000-000000000020','active');
insert into market_areas values('00000000-0000-4000-8000-000000000020','Kansas City','MO',true);
insert into venues values('00000000-0000-4000-8000-000000000030','Kansas City','MO','00000000-0000-4000-8000-000000000020','draft');
insert into events values('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000030','Kansas City','MO',null,'scheduled',true,null,now()-interval '1 day',now()+interval '1 day'),
('00000000-0000-4000-8000-000000000041',null,'Kansas City','MO',null,'draft',false,null,now()-interval '1 day',now()+interval '1 day');
insert into external_events values('00000000-0000-4000-8000-000000000050',null,'Kansas City','MO',null,'active',now()+interval '1 day',null,'ticketmaster');
insert into signals(signal_type,subject_type,subject_id,metadata) values('page_view','page','legacy','{"before":true}');
'''
migration=Path('supabase/migrations/20261008145246_bm1_discovery_signal_collection.sql').read_text()
def call(obs='60', kind='discovery_impression', subject='40', source='hypeknight', metadata='{"visible_fraction":0.5,"visible_ms":1000}'):
 subject="null" if subject is None else "'00000000-0000-4000-8000-0000000000"+subject+"'"
 source="null" if source is None else "'"+source+"'"
 return "public.record_discovery_observation('00000000-0000-4000-8000-0000000000"+obs+"','"+kind+"',"+subject+","+source+",'homepage','tonight','browser-session','"+metadata+"'::jsonb)"
try:
 subprocess.run(['docker','run','--rm','-d','--name',container,'-e','POSTGRES_PASSWORD=local-disposable-fixture','postgres:17'],check=True,capture_output=True)
 for _ in range(60):
  logs=subprocess.run(['docker','logs',container],capture_output=True,text=True)
  if 'PostgreSQL init process complete' in logs.stdout and subprocess.run(['docker','exec',container,'pg_isready','-U','postgres'],capture_output=True).returncode==0:break
  time.sleep(0.2)
 run(base)
 run('begin;\n'+migration+"\nselect "+call()+"; rollback;")
 assert run("select count(*) from information_schema.columns where table_name='signals' and column_name='observation_id'")=='0'
 assert run("select count(*) from signals where metadata='{"+'"before":true'+"}'::jsonb")=='1'
 print('PASS: transaction reaches end, rollback removes all P2-B1 objects and preserves legacy row')
 run(migration)
 run("set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000010'; select "+call()+";")
 run('set role anon; select '+call()+';')
 assert run("select count(*) from signals where observation_id is not null and metadata->>'placement'='tonight'")=='1'
 result=run("select actor_id::text || '|' || event_id::text || '|' || venue_id::text || '|' || market_id::text || '|' || verification_level from signals where observation_id is not null")
 assert result=='00000000-0000-4000-8000-000000000010|00000000-0000-4000-8000-000000000040|00000000-0000-4000-8000-000000000030|00000000-0000-4000-8000-000000000020|observed',result
 print('PASS: authenticated actor binding; canonical venue/market; hidden venue does not invalidate public event; replay dedup')
 run('set role anon; select '+call('61',subject='50',source='external')+';')
 assert run("select count(*) from signals where observation_id='00000000-0000-4000-8000-000000000061' and event_id is null and venue_id is null and market_id is not null and subject_type='event' and metadata->>'external_event_id' is not null and metadata->>'inventory_source'='external' and metadata->>'external_source_code'='ticketmaster'")=='1'
 print('PASS: external provenance retained; no fabricated canonical event/venue identity')
 run('set role anon; select '+call('62','search_performed',None,None,'{"q":"dance","city":"Kansas City","state":"MO","actor_id":"admin","verification_level":"verified","result_count":0}')+';')
 assert run("select count(*) from signals where observation_id='00000000-0000-4000-8000-000000000062' and actor_id is null and verification_level='declared' and market_id is not null and metadata->>'result_count' is null and not(metadata ? 'actor_id')")=='1'
 run('set role anon; select '+call('63','search_performed',None,None,'{"city":"Unknown Town","state":"ZZ"}')+';')
 assert run("select count(*) from signals where observation_id='00000000-0000-4000-8000-000000000063' and market_id is null and metadata->>'market_context'='unresolved'")=='1'
 assert run('select count(*) from markets')=='1'
 print('PASS: search intent fixed low-trust; unknown results/location remain unknown; no market creation')
 for expression in [call('64',subject='41'),call('65',kind='featured_impression'),call('66',kind='event_saved'),call('67',metadata='{"visible_fraction":0.1,"visible_ms":1000}'),call('70',metadata='{"visible_fraction":0.5,"visible_ms":1000,"exposure_class":"featured"}')]:
  try:run('set role anon; select '+expression+';')
  except RuntimeError:pass
  else:raise AssertionError('Rejected observation accepted: '+expression)
 print('PASS: hidden/nonpublic event, invented Featured, operational type and invalid viewability denied')
 run("set role authenticated; select public.record_hypeknight_signal('event_saved','event','legacy','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000031','Wrong','ZZ');")
 assert run("select count(*) from signals where signal_type='event_saved' and venue_id='00000000-0000-4000-8000-000000000030' and market_id is not null and city='Kansas City'")=='1'
 run("set role anon; select public.record_hypeknight_signal('venue_view','venue','legacy',null,'00000000-0000-4000-8000-000000000030','Wrong','ZZ');")
 assert run("select count(*) from signals where signal_type='venue_view' and market_id is not null and city='Kansas City' and state='MO'")=='1'
 run("set role anon; select public.record_hypeknight_signal('event_view','event','00000000-0000-4000-8000-000000000050',null,null,null,null,'external','external_event',null,null,null,1,'observed','{\"external_event_id\":\"00000000-0000-4000-8000-000000000050\"}');")
 assert run("select count(*) from signals where signal_type='event_view' and event_id is null and market_id is not null and metadata->>'external_source_code'='ticketmaster'")=='1'
 print('PASS: legacy RPC compatibility and future event/venue normalization')
 with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(lambda _:run('set role anon; select '+call('68')+';'),range(8)))
 assert run("select count(*) from signals where observation_id='00000000-0000-4000-8000-000000000068'")=='1'
 assert run("select count(*) from signals where subject_id='legacy' and metadata='{"+'"before":true'+"}'::jsonb")=='1'
 assert run("select has_function_privilege('anon','public.record_discovery_observation(uuid,text,text,text,text,text,text,jsonb)','execute')")=='t'
 assert run("select has_schema_privilege('anon','bm1_signal_internal','usage')")=='f'
 print('PASS: concurrent receipt dedup; legacy row untouched; private normalizer inaccessible')
 for role in ['anon','authenticated']:
  try:run('set role '+role+"; insert into public.signals(signal_type,subject_type) values('event_saved','event');")
  except RuntimeError:pass
  else:raise AssertionError('Direct raw signal write was allowed')
 run("insert into markets values('00000000-0000-4000-8000-000000000021','active'); insert into market_areas values('00000000-0000-4000-8000-000000000021','Kansas City','MO',true);")
 run('set role anon; select '+call('69','search_performed',None,None,'{"city":"Kansas City","state":"MO"}')+';')
 assert run("select count(*) from signals where observation_id='00000000-0000-4000-8000-000000000069' and market_id is null")=='1'
 print('PASS: no direct raw writes; ambiguous geography remains unresolved')
 print('8 database test groups passed; no production connection')
finally:
 subprocess.run(['docker','stop',container],capture_output=True)
