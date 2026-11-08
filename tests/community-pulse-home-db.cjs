const fs = require('node:fs');
const assert = require('node:assert/strict');
const { run } = require('./community-pulse-db.cjs');
const id = n => '00000000-0000-4000-8000-' + n.toString(16).padStart(12, '0');

async function check(db, race) {
  await run(db);
  await db.exec("alter table public.markets add column name text default 'Kansas City metro';");
  const migration = fs.readdirSync('supabase/migrations').find(n => n.endsWith('_community_pulse_home_and_editor.sql'));
  await db.exec(fs.readFileSync('supabase/migrations/' + migration, 'utf8'));
  async function as(role, user, sql, args = []) {
    await db.exec('set role ' + role);
    try {
      await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({sub:user,is_anonymous:false})]);
      return (await db.query(sql,args)).rows[0]?.result;
    } finally { await db.exec('reset role'); }
  }
  const admin = (sql,args) => as('authenticated',id(1),sql,args);
  const svc = (sql,args) => as('service_role',null,sql,args);
  const editor = () => admin('select public.community_pulse_editor() as result');
  const create = async ({market=null,city=null,state=null,guests=false,future=false} = {}) =>
    admin("select public.community_pulse_create('Community Friday?',null,array['Music','Dancing'],$1,$2,$3,now()+$4::interval,now()+interval '1 day',$5,null) as result",
      [market,city,state,future ? '1 hour' : '-1 hour',guests]);
  const transition = (q,status) => admin('select public.community_pulse_transition($1,$2)',[q,status]);
  const select = (q,selected=true) => admin('select public.community_pulse_set_home($1,$2)',[q,selected]);
  const home = (city='',state='') => svc('select public.community_pulse_home($1,$2) as result',[city,state]);
  const writeSql='select public.community_pulse_account_submit($1,$2,$3,$4,$5,$6) as result';
  const params = (q,o,op,user=id(2),revision=0) => [q,o,id(op),revision,'community-pulse-v1',user];
  await assert.rejects(as('anon',null,'select public.community_pulse_editor()'),/permission denied/);
  await assert.rejects(as('authenticated',id(2),'select public.community_pulse_editor()'),/admin_required/);
  await assert.rejects(as('authenticated',id(2),writeSql,params(id(700),id(701),702)),/permission denied/);
  await assert.rejects(as('authenticated',id(2),'select public.community_pulse_home(null,null)'),/permission denied/);
  await assert.rejects(as('authenticated',id(2),'select * from bm1_community_pulse.home_slots'),/permission denied/);
  for(const name of ['home_slots','account_attempts']) {
    assert.equal((await db.query("select relrowsecurity as result from pg_class where oid=$1::regclass",['bm1_community_pulse.'+name])).rows[0].result,true);
    for(const role of ['anon','authenticated','service_role']) assert.equal(
      (await db.query("select has_table_privilege($1,$2,'SELECT, INSERT, UPDATE, DELETE') as result",[role,'bm1_community_pulse.'+name])).rows[0].result,false);
  }
  assert.equal(await home(),null);
  const platform=await create();
  await assert.rejects(select(platform),/home_ineligible/);
  await transition(platform,'open');
  assert.equal(await home(),null);
  await select(platform);
  assert.equal((await home()).id,platform);
  assert.equal((await home()).scopeLabel,'Across HypeKnight');
  const market=await create({market:id(21)});
  await transition(market,'open'); await select(market);
  assert.equal((await home('Kansas City','MO')).id,market);
  assert.equal((await home('Kansas City','MO')).scopeLabel,'Kansas City metro');
  assert.equal((await home('Unknown','MO')).id,platform);
  const area=await create({market:id(21),city:'Kansas City',state:'MO'});
  await transition(area,'open'); await select(area);
  assert.equal((await home(' kansas city ','mo')).id,area);
  await transition(area,'paused');
  assert.equal((await home('Kansas City','MO')).acceptingResponses,false);
  await select(area,false);
  assert.equal((await home('Kansas City','MO')).id,market);
  const future=await create({future:true});
  await transition(future,'scheduled'); await select(future);
  assert.equal(await home(),null);
  await select(platform);
  const guest=await create({guests:true}); await transition(guest,'open');
  await assert.rejects(select(guest),/home_ineligible/);
  const option=(await svc('select public.community_pulse_read($1) as result',[platform])).options[0].id;
  assert.deepEqual(await svc(writeSql,params(platform,option,900,id(22))),{state:'ineligible'});
  assert.deepEqual(await svc(writeSql,params(guest,option,901)),{state:'ineligible'});
  await db.query('delete from bm1_community_pulse.account_attempts');
  assert.deepEqual(await svc(writeSql,params(platform,option,902)),{state:'accepted',revision:1});
  assert.deepEqual(await svc(writeSql,params(platform,option,902)),{state:'accepted',revision:1});
  for(let i=0;i<18;i++) await svc(writeSql,params(platform,id(555),910+i));
  assert.deepEqual(await svc(writeSql,params(platform,option,902)),{state:'rate_limited'});
  // A new minute budget can accept the exact same request and return the original receipt.
  await db.query('delete from bm1_community_pulse.account_attempts');
  assert.deepEqual(await svc(writeSql,params(platform,option,902)),{state:'accepted',revision:1});
  const administrative=await editor();
  assert.equal(administrative.total,administrative.questions.length);
  assert.equal(administrative.questions.find(q=>q.id===platform).selectedForHome,true);
  assert.ok(administrative.questions.find(q=>q.id===platform).audit.some(a=>a.action==='select_home'));
  assert.doesNotMatch(JSON.stringify(administrative),/participant_key|token_digest|actor_id|account_id|accepted_revision/);
  await transition(platform,'closed');
  assert.equal((await home()).report.state,'insufficient');
  await transition(platform,'archived');
  assert.equal(await home(),null);
  const expired=await create();
  await transition(expired,'open');
  await db.query("update bm1_community_pulse.questions set closes_at=now()-interval '1 second' where id=$1",[expired]);
  await assert.rejects(as('authenticated',id(2),'select public.community_pulse_maintenance()'),/admin_required/);
  assert.ok(await admin('select public.community_pulse_maintenance() as result')>=1);
  assert.equal((await editor()).questions.find(q=>q.id===expired).status,'closed');

  const budgetUser=id(9);
  await db.query('delete from bm1_community_pulse.account_attempts');
  await db.query("insert into bm1_community_pulse.account_attempts values($1,date_trunc('minute',clock_timestamp()),19)",[budgetUser]);
  const jobs=[params(market,id(999),980,budgetUser),params(market,id(998),981,budgetUser)];
  const outcomes=race ? await race(writeSql,jobs) : [await svc(writeSql,jobs[0]),await svc(writeSql,jobs[1])];
  assert.deepEqual(outcomes.map(o=>o.state).sort(),['invalid','rate_limited']);
  process.stdout.write('P3-B scope selection, editorial authorization, rate budgets, closure, and privacy checks passed.\n');
}

(async()=>{
  const url=process.env.COMMUNITY_PULSE_TEST_DATABASE_URL;
  if(url) {
    assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname));
    const {Client}=require('pg');
    const connect=async()=>{const c=new Client({connectionString:url});await c.connect();return c;};
    const c=await connect();
    try {
      await check({exec:c.query.bind(c),query:c.query.bind(c)},(sql,jobs)=>Promise.all(jobs.map(async args=>{
        const session=await connect();
        try {await session.query('set role service_role');return (await session.query(sql,args)).rows[0].result;}
        finally {await session.end();}
      })));
      process.stdout.write('P3-B parallel account-rate requests passed on independent PostgreSQL sessions.\n');
    } finally {await c.end();}
  } else {
    const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
    try {await check(db);} finally {await db.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
