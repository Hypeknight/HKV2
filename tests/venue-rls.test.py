#!/usr/bin/env python3
"""Isolated PostgreSQL test harness. Never connects to a Supabase project.
Requires a disposable docker container named hkv2-e2b-postgres (postgres:17).
Snapshot contains schema metadata only, captured read-only before E2B.
"""
import json
import subprocess
from pathlib import Path

snapshot = json.loads(Path('tests/venue-rls-pre-e2b.json').read_text())
quote = lambda name: '"' + name.replace('"', '""') + '"'
base = """
do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; create role authenticated; create role service_role bypassrls; end if; end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
"""
tables = {}
for c in snapshot['columns']:
    kind = c['type']
    if kind.startswith('_'): kind = kind[1:] + '[]'
    definition = quote(c['name']) + ' ' + kind
    if c['default']: definition += ' default ' + c['default']
    if c['nullable'] == 'NO': definition += ' not null'
    tables.setdefault(c['table'], []).append(definition)
for table, columns in tables.items():
    base += 'create table public.' + quote(table) + '(' + ','.join(columns) + ');\n'
for c in snapshot['constraints']:
    if not c['definition'].startswith('FOREIGN KEY'):
        base += 'alter table public.' + quote(c['table']) + ' add constraint ' + quote(c['name']) + ' ' + c['definition'] + ';\n'
base += 'alter table public.profiles add primary key(id);\n'
base += 'create table public.presence_credentials(id uuid); create table public.presence_participants(id uuid); create table public.presence_verifications(id uuid);\n'
base += next(f for f in snapshot['role_functions'] if 'public."current_role"()' in f) + ";\n"
for table in tables:
    base += 'alter table public.' + quote(table) + ' enable row level security;\n'
base += 'grant all on all tables in schema public to anon,authenticated,service_role;\n'
base += 'revoke all on public.venue_locations,public.venue_claims,public.venue_managers,public.venue_corrections from anon,authenticated;\n'
for p in snapshot['policies'] + snapshot['profile_policies']:
    table = p.get('table',p.get('tablename'))
    name = p.get('name',p.get('policyname'))
    using = p.get('using',p.get('qual'))
    check = p.get('check',p.get('with_check'))
    base += 'create policy ' + quote(name) + ' on public.' + quote(table) + ' for ' + p['cmd'] + ' to ' + ','.join(p['roles'])
    if using: base += ' using (' + using + ')'
    if check: base += ' with check (' + check + ')'
    base += ';\n'

def run(sql):
    result = subprocess.run(['docker','exec','-i','hkv2-e2b-postgres','psql','-X','-U','postgres','-d','hkv2_e2b_test','-v','ON_ERROR_STOP=1','-q'],input=sql,text=True,capture_output=True)
    if result.returncode:
        print(result.stdout); print(result.stderr); raise SystemExit(result.returncode)
    print(result.stdout.strip())
    print(result.stderr.strip())

# Only localhost container is used. Run once on a fresh disposable database.
subprocess.run(['docker','exec','hkv2-e2b-postgres','psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-c','drop database if exists hkv2_e2b_test;'],check=True)
subprocess.run(['docker','exec','hkv2-e2b-postgres','psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-c','create database hkv2_e2b_test;'],check=True)
run(base)
migration = Path('supabase/migrations/0028_bm1_venue_claims_rls_authority.sql').read_text()
run('begin;\n' + migration + '\nrollback;\n' + """
do $$ begin
  if exists(select 1 from pg_namespace where nspname='bm1_private') then raise exception 'Migration rollback retained private schema'; end if;
  if not exists(select 1 from pg_policies where tablename='venues' and policyname='owners can update own venues') then raise exception 'Migration rollback lost legacy policy'; end if;
end $$;
select 'Migration apply/rollback: PASS';
""")
run('begin;\n' + migration + '\ncommit;')
run(Path('tests/venue-rls.test.sql').read_text())
print('Isolated venue RLS/claim tests: PASS')
