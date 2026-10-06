-- Run through tests/venue-rls.test.py on a disposable PostgreSQL container.
-- All test data/state is rolled back. No production credentials are used.
begin;
create schema e2b_test;
create function e2b_test.assert(ok boolean, message text) returns void
language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; raise notice 'PASS: %',message; end $$;
create function e2b_test.denied(statement text, message text) returns void
language plpgsql as $$ begin
  begin execute statement; exception when insufficient_privilege then raise notice 'PASS: %',message; return; end;
  raise exception 'FAIL: % was allowed',message;
end $$;
grant usage on schema e2b_test to anon,authenticated;
grant execute on all functions in schema e2b_test to anon,authenticated;
insert into auth.users(id) select ('00000000-0000-0000-0000-00000000000' || n)::uuid from generate_series(1,6) n;
insert into public.profiles(id,email,display_name,app_role) values
 ('00000000-0000-0000-0000-000000000001','admin@example.test','Admin','admin'),
 ('00000000-0000-0000-0000-000000000002','manager@example.test','Manager','user'),
 ('00000000-0000-0000-0000-000000000003','legacy@example.test','Legacy','venue_owner'),
 ('00000000-0000-0000-0000-000000000004','claimant@example.test','Claimant','user'),
 ('00000000-0000-0000-0000-000000000005','other@example.test','Other','user'),
 ('00000000-0000-0000-0000-000000000006','dj@example.test','DJ','user');
insert into public.venues(id,owner_id,name,slug,city,state,address,status,is_visible) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','Business A','business-a','KC','MO','1 Main','active',true),
 ('10000000-0000-0000-0000-000000000002',null,'Business B','business-b','KC','MO','1 Main','active',true),
 ('10000000-0000-0000-0000-000000000003',null,'Private Business','private-business','KC','MO','2 Main','draft',false);
insert into public.venue_managers(venue_id,user_id,role,status) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','manager','active');
insert into public.venue_hours(venue_id,day_of_week,is_open) values('10000000-0000-0000-0000-000000000001',1,true);
insert into public.venue_subscriptions(id,venue_id,billing_mode) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','monthly');
insert into public.venue_presence_sessions(id,venue_id,session_code,qr_token,ends_at) values
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','CODEA','SECRET',now()+interval '1 hour');

set local role anon;
select e2b_test.assert((select count(*) from public.venues)=2,'anonymous discovery includes unclaimed venue and excludes private venue');
select e2b_test.denied('insert into public.venue_claims(venue_id,claimant_user_id) values(null,null)','anon cannot claim');
select e2b_test.denied('truncate public.venues','anon cannot truncate');
select e2b_test.denied('select public.join_venue_presence_session(null,null)','anon cannot use session RPC');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select e2b_test.assert(not bm1_private.can_manage_venue('10000000-0000-0000-0000-000000000001'),'legacy owner/global role has no authority');
do $$ declare n integer; begin update public.venues set description='unauthorized' where id='10000000-0000-0000-0000-000000000001'; get diagnostics n=row_count; perform e2b_test.assert(n=0,'owner_id update is zero rows'); end $$;
select e2b_test.denied($test$update public.profiles set app_role='admin' where id=auth.uid()$test$,'cannot self-promote to admin');
select e2b_test.denied('truncate public.venues','authenticated cannot truncate');
select e2b_test.denied('truncate public.presence_credentials','credentials cannot be truncated despite absent policies');
insert into public.venues(id,owner_id,name,slug,city,state) values('10000000-0000-0000-0000-000000000004',auth.uid(),'Created','created','KC','MO');
select e2b_test.assert(bm1_private.can_manage_venue('10000000-0000-0000-0000-000000000004'),'legacy creation atomically creates manager');
select e2b_test.assert((select count(*) from public.venues where id='10000000-0000-0000-0000-000000000004')=1,'created venue read is authorized by its manager relationship');
reset role;
create function e2b_test.fail_creation_manager() returns trigger language plpgsql as $$ begin raise exception 'Injected creation manager failure' using errcode='42501'; end $$;
create trigger test_creation_failure before insert on public.venue_managers for each row execute function e2b_test.fail_creation_manager();
set local role authenticated;
select e2b_test.denied($test$insert into public.venues(id,owner_id,name,slug,city,state) values('10000000-0000-0000-0000-000000000005',auth.uid(),'Failed creation','failed-creation','KC','MO')$test$,'manager failure rolls back venue creation');
reset role;
select e2b_test.assert(not exists(select 1 from public.venues where id='10000000-0000-0000-0000-000000000005'),'no orphan venue after failed manager creation');
drop trigger test_creation_failure on public.venue_managers;
drop function e2b_test.fail_creation_manager();

reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select e2b_test.assert(bm1_private.can_manage_venue('10000000-0000-0000-0000-000000000001'),'active non-owner manager has authority');
select e2b_test.assert(not bm1_private.can_manage_venue('10000000-0000-0000-0000-000000000002'),'same address is not management authority');
update public.venues set description='Ordinary info' where id='10000000-0000-0000-0000-000000000001';
select e2b_test.assert((select description='Ordinary info' from public.venues where id='10000000-0000-0000-0000-000000000001'),'manager ordinary write succeeds');
select e2b_test.denied($test$update public.venues set address='Moved' where id='10000000-0000-0000-0000-000000000001'$test$,'material location change denied');
select e2b_test.denied($test$update public.venues set entity_state='closed' where id='10000000-0000-0000-0000-000000000001'$test$,'manager cannot silently close business');
select e2b_test.denied($test$update public.venues set verification_state='verified' where id='10000000-0000-0000-0000-000000000001'$test$,'claim and verification separate');
select e2b_test.denied($test$update public.venues set owner_id=auth.uid() where id='10000000-0000-0000-0000-000000000001'$test$,'compatibility ownership is not assignable');
insert into public.venue_corrections(venue_id,submitted_by,field_name,proposed_value) values('10000000-0000-0000-0000-000000000001',auth.uid(),'address','"Moved"');
update public.venue_hours set is_open=false where venue_id='10000000-0000-0000-0000-000000000001';
select e2b_test.assert((select not is_open from public.venue_hours where venue_id='10000000-0000-0000-0000-000000000001'),'manager settings RLS matches application');
select e2b_test.denied($test$insert into public.venue_managers(venue_id,user_id) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005')$test$,'manager cannot delegate');
select e2b_test.denied($test$update public.venue_subscriptions set is_active=true where id='20000000-0000-0000-0000-000000000001'$test$,'manager cannot activate paid entitlement');
select e2b_test.denied($test$insert into public.venue_presence_checkins(venue_presence_session_id,venue_id,user_id,expires_at) values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',auth.uid(),now())$test$,'self-insert cannot fabricate presence');
select e2b_test.denied($test$select public.join_venue_presence_session('10000000-0000-0000-0000-000000000001','WRONG')$test$,'invalid session code denied');
select public.join_venue_presence_session('10000000-0000-0000-0000-000000000001','codea');
select e2b_test.assert((select count(*) from public.venue_presence_checkins where user_id=auth.uid())=1,'valid scoped session code creates own presence');
select e2b_test.denied($test$select public.join_venue_presence_session('10000000-0000-0000-0000-000000000002','CODEA')$test$,'code cannot cross venue');
update public.venue_presence_sessions set ends_at=now()-interval '1 minute' where id='30000000-0000-0000-0000-000000000001';
select e2b_test.denied($test$select public.join_venue_presence_session('10000000-0000-0000-0000-000000000001','CODEA')$test$,'expired session code cannot renew presence');

reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
set local role authenticated;
insert into public.venue_claims(id,venue_id,claimant_user_id,evidence) values
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',auth.uid(),'{"summary":"Business relationship"}');
select e2b_test.assert(not bm1_private.can_manage_venue('10000000-0000-0000-0000-000000000002'),'pending claim grants no authority');
do $$ begin
  begin insert into public.venue_claims(venue_id,claimant_user_id) values('10000000-0000-0000-0000-000000000002',auth.uid());
  exception when unique_violation then raise notice 'PASS: duplicate pending claim rejected'; return; end;
  raise exception 'FAIL: duplicate pending claim allowed';
end $$;

select e2b_test.denied($test$insert into public.venue_claims(venue_id,claimant_user_id,status) values('10000000-0000-0000-0000-000000000002',auth.uid(),'approved')$test$,'cannot submit approved claim');
select e2b_test.denied($test$insert into public.venue_claims(venue_id,claimant_user_id) values('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005')$test$,'forged claimant denied');
do $$ declare n integer; begin update public.venue_claims set status='approved' where id='40000000-0000-0000-0000-000000000001'; get diagnostics n=row_count; perform e2b_test.assert(n=0,'claimant cannot approve own claim'); end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
set local role authenticated;
select e2b_test.assert((select count(*) from public.venue_claims)=0,'other claimant evidence remains private');
insert into public.venue_claims(id,venue_id,claimant_user_id) values('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',auth.uid());
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
-- Inject a manager insert failure to prove approval is all-or-nothing.
reset role;
create function e2b_test.fail_manager_insert() returns trigger language plpgsql as $$ begin raise exception 'Injected manager failure' using errcode='42501'; end $$;
create trigger test_manager_failure before insert on public.venue_managers for each row execute function e2b_test.fail_manager_insert();
set local role authenticated;
select e2b_test.denied($test$update public.venue_claims set status='approved' where id='40000000-0000-0000-0000-000000000001'$test$,'manager failure rolls back claim approval');
select e2b_test.assert((select status='pending' and reviewed_by is null from public.venue_claims where id='40000000-0000-0000-0000-000000000001'),'failed review leaves pending claim intact');
reset role;
drop trigger test_manager_failure on public.venue_managers;
set local role authenticated;
update public.venue_claims set status='approved',reviewed_by='00000000-0000-0000-0000-000000000005' where id='40000000-0000-0000-0000-000000000001';
update public.venue_claims set status='rejected' where id='40000000-0000-0000-0000-000000000002';
select e2b_test.assert((select reviewed_by=auth.uid() from public.venue_claims where id='40000000-0000-0000-0000-000000000001'),'reviewer binds database auth, ignoring supplied reviewer');
select e2b_test.assert((select count(*) from public.venue_managers where venue_id='10000000-0000-0000-0000-000000000002' and user_id='00000000-0000-0000-0000-000000000004' and status='active')=1,'approval atomically establishes manager');
select e2b_test.assert((select count(*) from public.venue_managers where venue_id='10000000-0000-0000-0000-000000000002' and user_id='00000000-0000-0000-0000-000000000005')=0,'rejection grants no management');
select e2b_test.assert((select name='Business B' and address='1 Main' and verification_state='unverified' and owner_id is null and status='active' and is_visible from public.venues where id='10000000-0000-0000-0000-000000000002'),'approval/rejection preserve identity, verification, public venue');
do $$ begin
  begin update public.venue_claims set status='rejected' where id='40000000-0000-0000-0000-000000000001';
  exception when raise_exception then raise notice 'PASS: reviewed claim cannot be re-decided'; return; end;
  raise exception 'FAIL: reviewed claim re-decided';
end $$;
update public.venue_managers set status='removed' where venue_id='10000000-0000-0000-0000-000000000002';
select e2b_test.assert((select claim_state='unclaimed' and status='active' and is_visible from public.venues where id='10000000-0000-0000-0000-000000000002'),'last manager removal keeps public unclaimed venue');
update public.venue_managers set status='suspended' where user_id='00000000-0000-0000-0000-000000000002' and venue_id='10000000-0000-0000-0000-000000000001';
select e2b_test.assert(bm1_private.can_manage_venue('10000000-0000-0000-0000-000000000003'),'administrator override retained');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select e2b_test.assert(not bm1_private.can_manage_venue('10000000-0000-0000-0000-000000000001'),'suspension revokes database authority immediately');
reset role;
insert into public.venue_managers(venue_id,user_id) values('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005');
delete from public.venue_managers where venue_id='10000000-0000-0000-0000-000000000002';
select e2b_test.assert((select claim_state='unclaimed' from public.venues where id='10000000-0000-0000-0000-000000000002'),'trusted deletion/cascade refreshes manager state');
select e2b_test.assert(not exists(select 1 from pg_policies where schemaname='public' and (tablename='venues' or tablename like 'venue_%') and (coalesce(qual,'')||coalesce(with_check,'')) ~ '(owner_id|venue_owner_id)' and cmd <> 'INSERT'),'no legacy existing-venue RLS authority remains');
select e2b_test.assert(not has_function_privilege('authenticated','bm1_private.refresh_claim_state(uuid)','execute'),'state refresh is not client callable');
select e2b_test.assert(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='bm1_private' and p.prosecdef and p.proconfig is null),'definer helpers pin search path');
rollback;
