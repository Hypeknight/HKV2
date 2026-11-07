/* Explicit disposable database test. See docs/BM1_P3A_COMMUNITY_PULSE.md. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const schema = `
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
  $$;
  create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
  grant usage on schema auth to authenticated;
  create table auth.users (id uuid primary key, is_anonymous boolean, deleted_at timestamptz, banned_until timestamptz);
  create table public.profiles (id uuid primary key, app_role text);
  create table public.markets (id uuid primary key, status text);
  create table public.market_areas (market_id uuid, city text, state text, is_active boolean);
  create schema bm1_private;
  create function bm1_private.is_admin() returns boolean
    language sql stable security definer set search_path = '' as $$
      select auth.uid() is not null and exists (
        select 1 from public.profiles where id = auth.uid() and app_role = 'admin'
      );
    $$;
`;
const migration = fs.readdirSync('supabase/migrations').find(n => n.endsWith('_bm1_public_community_pulse_p3a.sql'));
const uuid = n => '00000000-0000-4000-8000-' + n.toString(16).padStart(12, '0');
const admin = uuid(1);
const members = Array.from({ length: 8 }, (_, i) => uuid(i + 2));
const market = uuid(21);
const anonymous = uuid(22);
const now = Date.now();
const timestamp = delta => new Date(now + delta).toISOString();
const open = timestamp(-60000);
const close = timestamp(3600000);
const roles = ['anon', 'authenticated', 'service_role'];

async function run(db, parallelSubmit) {
  assert.equal((await db.query("select to_regclass('public.profiles') as existing")).rows[0].existing, null,
    'Use an empty, disposable database');
  await db.exec(schema);
  await db.exec(fs.readFileSync('supabase/migrations/' + migration, 'utf8'));
  await db.query("insert into public.profiles values ($1,'admin'),($2,'member')", [admin,members[0]]);
  await db.query('insert into auth.users(id,is_anonymous) select unnest($1::uuid[]),false', [[admin,...members]]);
  await db.query('insert into auth.users values ($1,true,null,null)', [anonymous]);
  await db.query("insert into public.markets values ($1,'active');", [market]);
  await db.query("insert into public.market_areas values ($1,'Kansas City','MO',true)", [market]);

  async function as(role, user, sql, args = [], anon = false) {
    if (role) await db.exec('set role ' + role);
    try {
      await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({sub:user,is_anonymous:anon})]);
      return (await db.query(sql, args)).rows[0]?.result;
    } finally {
      await db.exec('reset role');
    }
  }
  const adminRpc = (sql, args) => as('authenticated',admin,sql,args);
  const service = (sql, args) => as('service_role',null,sql,args);
  const draftSql = "select public.community_pulse_create('Which Friday night?',null,array['Live music','Dancing'],$1,$2,$3,$4,$5,$6,$7) as result";
  const draft = (overrides = {}) => adminRpc(draftSql,[overrides.market ?? null,overrides.city ?? null,
    overrides.state ?? null,overrides.open ?? open,overrides.close ?? close,overrides.guests ?? false,overrides.prior ?? null]);
  const transition = (id,status) => adminRpc('select public.community_pulse_transition($1,$2)',[id,status]);
  const read = id => service('select public.community_pulse_read($1) as result',[id]);
  const writeSql = 'select public.community_pulse_submit($1,$2,$3,$4,$5,$6,$7) as result';
  const params = (q,o,op,revision,user,guest=null,notice='community-pulse-v1') => [q,o,uuid(op),revision,notice,user,guest];
  const write = (...args) => service(writeSql,params(...args));
  const grants = (q,d,b) => service('select public.community_pulse_guest_grant($1,$2,$3) as result',[q,d,b]);
  const own = (q,u,d=null) => service('select public.community_pulse_participant($1,$2,$3) as result',[q,u,d]);

  const acl = await db.query(`
    select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='bm1_community_pulse' and c.relkind='r'
  `);
  assert.equal(acl.rows.length,7);
  for (const table of acl.rows) {
    assert.equal(table.relrowsecurity,true);
    for (const role of roles) {
      const privileges = await db.query('select has_table_privilege($1,$2,$3) as result',
        [role,'bm1_community_pulse.'+table.relname,'SELECT, INSERT, UPDATE, DELETE']);
      assert.equal(privileges.rows[0].result,false);
    }
  }
  const functions = await db.query(`
    select p.oid, p.proname, p.prosecdef, p.proconfig, n.nspname
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='bm1_community_pulse' or (n.nspname='public' and p.proname like 'community_pulse_%')
  `);
  for (const f of functions.rows) {
    assert.ok(f.proconfig.includes('search_path=""'), f.proname);
    for (const role of roles) {
      const exec = (await db.query('select has_function_privilege($1,$2::oid,\'EXECUTE\') as result',[role,f.oid])).rows[0].result;
      const editorial = /_(create|transition|moderate|purge)$/.test(f.proname);
      assert.equal(exec, editorial ? role === 'authenticated' :
        f.nspname === 'public' && role === 'service_role', [role,f.proname].join(' '));
      if (f.prosecdef && f.nspname === 'public') assert.equal(editorial,false);
    }
  }
  await assert.rejects(as('authenticated',members[0],draftSql,[null,null,null,open,close,false,null]), /admin_required/);
  await assert.rejects(as('authenticated',admin,draftSql,[null,null,null,open,close,false,null],true), /admin_required/);
  await assert.rejects(as('anon',null,draftSql,[null,null,null,open,close,false,null]), /permission denied/);
  await assert.rejects(as('authenticated',members[0],writeSql,params(uuid(100),uuid(101),500,0,members[0])), /permission denied/);
  await assert.rejects(as('authenticated',members[0],'select * from bm1_community_pulse.responses'), /permission denied/);
  await assert.rejects(as('anon',null,'select public.community_pulse_read($1)',[uuid(100)]), /permission denied/);
  await assert.rejects(draft({market,city:'Other city',state:'MO'}), /invalid_area/);
  await assert.rejects(draft({market:uuid(99)}), /invalid_market/);
  await assert.rejects(draft({city:'Kansas City',state:'MO'}), /invalid_area/);

  const future = await draft({open:timestamp(3600000),close:timestamp(7200000)});
  assert.equal(await read(future),null);
  await transition(future,'scheduled');
  assert.equal(await read(future),null);
  assert.deepEqual(await write(future,uuid(101),501,0,members[0]),{state:'closed'});
  await assert.rejects(transition(future,'open'),/invalid_transition/);
  const expired = await draft({open:timestamp(-3600000),close:timestamp(-3000000)});
  await assert.rejects(transition(expired,'open'),/invalid_transition/);
  const elapsed = await draft();
  await transition(elapsed,'open');
  const elapsedOption = (await read(elapsed)).options[0].id;
  await db.query("update bm1_community_pulse.questions set closes_at=now()-interval '1 second' where id=$1",[elapsed]);
  assert.equal((await read(elapsed)).acceptingResponses,false);
  assert.deepEqual(await write(elapsed,elapsedOption,510,0,members[0]),{state:'closed'});
  await transition(elapsed,'closed');
  await db.query('delete from bm1_community_pulse.results where question_id=$1',[elapsed]);
  assert.deepEqual((await read(elapsed)).report,{state:'incomplete'});

  const published = await draft({market,city:' kansas city ',state:'mo',guests:true});
  const other = await draft();
  assert.equal(await read(published),null);
  await transition(published,'open');
  await transition(other,'open');
  const q = await read(published);
  const [a,b] = q.options.map(o => o.id);
  const cross = (await read(other)).options[0].id;
  assert.deepEqual(q.scope,{kind:'market',marketId:market,city:'Kansas City',state:'MO'});
  assert.equal(q.acceptingResponses,true);
  assert.deepEqual(q.report,{state:'pending'});
  assert.deepEqual(await write(published,cross,502,0,members[0]),{state:'invalid'});
  assert.deepEqual(await write(published,a,503,0,anonymous),{state:'ineligible'});
  assert.deepEqual(await write(published,a,504,0,members[0],null,'bogus'),{state:'invalid'});
  assert.deepEqual(await write(published,a,505,0,null,'1'.repeat(64)),{state:'ineligible'});
  assert.equal(await grants(other,'1'.repeat(64),'b'.repeat(64)),false);
  assert.equal(await grants(published,'1'.repeat(64),'b'.repeat(64)),true);
  assert.equal(await grants(published,'2'.repeat(64),'b'.repeat(64)),true);
  assert.equal(await grants(published,'3'.repeat(64),'b'.repeat(64)),true);
  assert.equal(await grants(published,'4'.repeat(64),'b'.repeat(64)),false);
  assert.deepEqual(await write(published,a,506,0,null,'1'.repeat(64)),{state:'accepted',revision:1});
  assert.deepEqual(await own(published,null,'1'.repeat(64)),{optionId:a,revision:1,identity:'guest'});
  assert.deepEqual(await write(published,a,507,0,members[0],'1'.repeat(64)),{state:'guest_response_exists'});
  assert.deepEqual(await write(published,a,508,0,members[0],'2'.repeat(64)),{state:'accepted',revision:1});
  assert.deepEqual(await write(published,a,509,0,null,'2'.repeat(64)),{state:'ineligible'});
  assert.deepEqual(await write(published,a,508,0,members[0],'2'.repeat(64)),{state:'accepted',revision:1});
  assert.deepEqual(await write(published,b,508,0,members[0]),{state:'operation_conflict'});
  assert.deepEqual(await write(published,b,510,0,members[0]),{state:'revision_conflict',revision:1});
  assert.deepEqual(await write(published,b,511,1,members[0]),{state:'rate_limited'});
  await db.query("update bm1_community_pulse.responses set updated_at=now()-interval '11 seconds' where question_id=$1 and participant_key=$2",[published,'account:'+members[0]]);
  assert.deepEqual(await write(published,b,511,1,members[0]),{state:'accepted',revision:2});
  assert.deepEqual(await own(published,members[0]),{optionId:b,revision:2,identity:'account'});
  for (let revision=2;revision<6;revision++) {
    await db.query("update bm1_community_pulse.responses set updated_at=now()-interval '11 seconds' where question_id=$1 and participant_key=$2",[published,'account:'+members[0]]);
    assert.deepEqual(await write(published,revision%2===0 ? a : b,520+revision,revision,members[0]),{state:'accepted',revision:revision+1});
  }
  await db.query("update bm1_community_pulse.responses set updated_at=now()-interval '11 seconds' where question_id=$1 and participant_key=$2",[published,'account:'+members[0]]);
  assert.deepEqual(await write(published,a,530,6,members[0]),{state:'rate_limited'});
  for (let operation=0;operation<6;operation++) {
    assert.deepEqual(await write(published,b,540+operation,6,members[0]),{state:'accepted',revision:6});
  }
  assert.deepEqual(await write(published,b,546,6,members[0]),{state:'rate_limited'});
  await transition(published,'paused');
  assert.equal((await read(published)).acceptingResponses,false);
  assert.deepEqual(await write(published,a,512,0,members[1]),{state:'closed'});
  await transition(published,'open');
  const moderated = (await db.query("select id from bm1_community_pulse.responses where question_id=$1 and participant_key like 'guest:%'",[published])).rows[0].id;
  await adminRpc('select public.community_pulse_moderate($1,$2)',[published,moderated]);
  assert.equal(await own(published,null,'1'.repeat(64)),null);
  await transition(published,'closed');
  assert.deepEqual(await write(published,b,511,1,members[0]),{state:'accepted',revision:2});
  await assert.rejects(transition(published,'open'),/invalid_transition/);
  await assert.rejects(adminRpc('select public.community_pulse_moderate($1,$2)',[published,moderated]),/moderation_closed/);
  await assert.rejects(adminRpc('select public.community_pulse_purge($1)',[published]),/retention_window/);
  const successor = await draft({market,city:'Kansas City',state:'MO',open:timestamp(3600000),close:timestamp(7200000),prior:published});
  await transition(successor,'scheduled');
  assert.equal((await db.query('select version from bm1_community_pulse.questions where id=$1',[successor])).rows[0].version,2);

  for (const n of [0,1,4,5,6]) {
    const question = await draft();
    await transition(question,'open');
    const options = (await read(question)).options.map(o => o.id);
    for (let i=0;i<n;i++) await write(question,options[i===0 ? 1 : 0],600+i,0,members[i]);
    assert.deepEqual((await read(question)).report,{state:'pending'});
    await transition(question,'closed');
    const sealed = await read(question);
    assert.equal(sealed.report.state,n<5 ? 'insufficient' : 'available');
    assert.equal(sealed.acceptingResponses,false);
    if(n<5) {
      assert.deepEqual(Object.keys(sealed.report).sort(),['periodEnd','periodStart','sealedAt','state']);
      const stored = (await db.query('select payload from bm1_community_pulse.results where question_id=$1',[question])).rows[0].payload;
      assert.equal(stored.state,n===0 ? 'zero' : 'insufficient');
    } else {
      assert.equal(sealed.report.total,n);
      assert.deepEqual(sealed.report.options.map(row => row.count),[n-1,1]);
      assert.deepEqual(sealed.report.options.map(row => row.percentage),n===5 ? [80,20] : [83.33,16.67]);
      assert.doesNotMatch(JSON.stringify(sealed), /participant|token_digest|abuse_bucket|operation_id|account:/i);
    }
    assert.deepEqual(await write(question,options[0],999,0,members[7]),{state:'closed'});
    await db.query("update bm1_community_pulse.questions set closed_at=now()-interval '91 days' where id=$1",[question]);
    await adminRpc('select public.community_pulse_purge($1)',[question]);
    assert.deepEqual((await read(question)).report,sealed.report);
    const retained = (await db.query('select count(*)::int as n from bm1_community_pulse.responses where question_id=$1',[question])).rows[0].n;
    assert.equal(retained,0);
  }

  const candidate = await draft();
  await transition(candidate,'open');
  const options = (await read(candidate)).options.map(o => o.id);
  const requests = [params(candidate,options[0],800,0,members[0]),params(candidate,options[1],801,0,members[0])];
  const outcomes = parallelSubmit
    ? await parallelSubmit(writeSql,requests)
    : [await service(writeSql,requests[0]),await service(writeSql,requests[1])];
  assert.deepEqual(outcomes.map(o => o.state).sort(),['accepted','revision_conflict']);
  assert.equal((await db.query('select count(*)::int as n from bm1_community_pulse.responses where question_id=$1',[candidate])).rows[0].n,1);
  process.stdout.write('Community Pulse database policy, lifecycle, submission, and suppression checks passed.\n');
  process.stdout.write(parallelSubmit ? 'Independent PostgreSQL sessions raced the same participant.\n' : 'Single-session execution; independent-session race requires PostgreSQL mode.\n');
}

(async () => {
  const url = process.env.COMMUNITY_PULSE_TEST_DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    assert.ok(['127.0.0.1','localhost','[::1]'].includes(parsed.hostname), 'Test database must be local');
    const { Client } = require('pg');
    const connect = async () => { const client = new Client({ connectionString:url }); await client.connect(); return client; };
    const db = await connect();
    try {
      await run({query:db.query.bind(db),exec:db.query.bind(db)},async (sql,requests) => {
        const first = await connect();
        const second = await connect();
        try {
          await first.query('begin');
          await first.query('set local role service_role');
          await second.query('set role service_role');
          const winner = (await first.query(sql,requests[0])).rows[0].result;
          const contender = second.query(sql,requests[1]);
          let blocked = false;
          for (let attempt=0;attempt<50 && !blocked;attempt++) {
            blocked = (await db.query('select $1 = any(pg_blocking_pids($2)) as blocked',
              [first.processID,second.processID])).rows[0].blocked;
            if (!blocked) await new Promise(resolve => setTimeout(resolve,20));
          }
          await first.query('commit');
          const loser = (await contender).rows[0].result;
          assert.equal(blocked,true,'The second connection must wait on the first transaction');
          return [winner,loser];
        } finally { await Promise.all([first.end(),second.end()]); }
      });
    } finally { await db.end(); }
  } else {
    const { PGlite } = require('@electric-sql/pglite');
    const db = new PGlite();
    try { await run(db); } finally { await db.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
