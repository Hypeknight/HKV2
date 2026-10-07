const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute real TypeScript modules with isolated auth/database/Next boundaries.
// No environment files, external services, or production writes are used.
let state;
function reset(overrides = {}) {
  state = {
    user: { id: 'authenticated-user', user_metadata: { app_role: 'admin' } },
    authError: null,
    rows: {
      profiles: [{ id: 'authenticated-user', app_role: 'user' }],
      venue_managers: [],
      venues: [{ id: 'venue-a', owner_id: 'authenticated-user', slug: 'a', status: 'draft' }],
      venue_hours: [],
      venue_event_connection_requests: [{ id: 'request-a', venue_id: 'venue-a', event_id: 'event-a', status: 'pending' }],
      events: [{ id: 'event-a', venue_id: 'venue-a', status: 'scheduled', is_public: true }],
    },
    queries: [], writes: [], errors: {}, stripeCalls: 0,
    ...overrides,
  };
}
function query(client, table) {
  const q = { client, table, filters: [], operation: 'select', payload: null };
  state.queries.push(q);
  const builder = {
    select() { return builder; },
    eq(key, value) { q.filters.push([key, value]); return builder; },
    in(key, values) { q.filters.push([key, values]); return builder; },
    order() { return builder; },
    insert(payload) { q.operation = 'insert'; q.payload = payload; return builder; },
    update(payload) { q.operation = 'update'; q.payload = payload; return builder; },
    delete() { q.operation = 'delete'; return builder; },
    single() { q.single = true; return builder; },
    maybeSingle() { q.single = true; return builder; },
    then(resolve, reject) {
      try {
        const error = state.errors[client + ':' + table];
        if (error) return Promise.resolve({ data: null, error }).then(resolve, reject);
        const rows = state.rows[table] || [];
        const matches = rows.filter(row => q.filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
        let data = matches;
        if (q.operation !== 'select') {
          state.writes.push(q);
          if (q.operation === 'insert') {
            data = (Array.isArray(q.payload) ? q.payload : [q.payload]).map(row => ({ id: 'new-venue', ...row }));
            state.rows[table] = [...rows, ...data];
          } else if (q.operation === 'update') {
            matches.forEach(row => Object.assign(row, q.payload));
          }
        }
        return Promise.resolve({ data: q.single ? data[0] || null : data, error: null }).then(resolve, reject);
      } catch (error) { return Promise.reject(error).then(resolve, reject); }
    },
  };
  return builder;
}
const userClient = {
  auth: { getUser: async () => ({ data: { user: state.user }, error: state.authError }) },
  from: table => query('user', table),
};
const adminClient = { from: table => query('admin', table) };
function redirect(location) { throw Object.assign(new Error('redirect'), { location }); }
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative).exports;
  const source = fs.readFileSync(path.resolve(relative), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }; cache.set(relative, module);
  function mockedRequire(name) {
    if (name === 'server-only') return {};
    if (name === '@/lib/supabase/server') return { createClient: async () => userClient };
    if (name === '@/lib/supabase/admin') return { createAdminClient: () => adminClient };
    if (name === 'next/navigation') return { redirect, notFound: () => { throw new Error('notFound'); } };
    if (name === 'next/cache') return { revalidatePath() {} };
    if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } };
    if (name === '@/lib/stripe/server') return { getStripeForCurrentMode: async () => { state.stripeCalls++; if (state.stripeSession) return { stripe: { checkout: { sessions: { retrieve: async () => state.stripeSession } } } }; throw new Error('Stripe must not be reached in denied tests'); } };
    if (name === '@/lib/utils') return { slugify: value => value.toLowerCase() };
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    return require(name);
  }
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: relative })(mockedRequire, module, module.exports);
  return module.exports;
}

const authority = load('lib/venues/authority.ts');
const context = load('lib/venues/command-center.ts');
const lifecycle = load('lib/venues/managers.ts');
const actions = load('app/dashboard/venues/[id]/management/actions.ts');
const venueActions = load('app/dashboard/venues/actions.ts');
const form = values => { const f = new FormData(); Object.entries(values).forEach(([k,v]) => f.set(k,v)); return f; };
const manager = { id:'manager-a',venue_id:'venue-a',user_id:'authenticated-user',status:'active',role:'manager',updated_at:'2026-01-01T00:00:00Z' };
const base = { venueId:'venue-a',managerId:'manager-a',role:'manager',status:'removed',confirmed:true,expectedUpdatedAt:manager.updated_at };
function admin() { reset(); state.rows.profiles[0].app_role='admin'; state.rows.venue_managers=[{...manager}]; }

test('Command Center admits active venue manager and keeps hidden venue hidden', async () => {
  reset(); state.rows.venue_managers=[{...manager}]; state.rows.venues[0].is_visible=false;
  const result=await context.getVenueCommandContext('venue-a');
  assert.equal(result.authority.source,'venue_manager'); assert.equal(result.venue.is_visible,false);
  assert.deepEqual(state.writes,[]);
});
test('Command Center denies legacy owner, global venue_owner and manager of another venue', async () => {
  for (const mode of ['legacy','other','suspended']) {
    reset(); state.rows.profiles[0].app_role='venue_owner';
    if(mode==='other') state.rows.venue_managers=[{...manager,venue_id:'venue-b'}];
    if(mode==='suspended') state.rows.venue_managers=[{...manager,status:'suspended'}];
    await assert.rejects(context.getVenueCommandContext('venue-a'),/not authorized/);
    assert.deepEqual(state.writes,[]);
  }
});
test('admin override opens an unclaimed venue without manager membership',async()=>{
  admin(); state.rows.venue_managers=[]; state.rows.venues[0].claim_state='unclaimed';
  assert.equal((await context.getVenueCommandContext('venue-a')).authority.source,'admin');
});
test('roster is private, centralized, venue-scoped and only active for managers',async()=>{
  reset(); state.rows.venue_managers=[{...manager},{...manager,id:'other',user_id:'other',venue_id:'venue-b'},{...manager,id:'inactive',user_id:'inactive',status:'removed'}];
  assert.equal((await authority.getVenueManagerRoster('venue-a')).length,1);
  assert.equal(state.queries.some(q=>q.table==='venue_managers'&&q.filters.some(([k,v])=>k==='venue_id'&&v==='venue-a')),true);
});
test('non-manager cannot read roster through private lookup',async()=>{
  reset(); await assert.rejects(authority.getVenueManagerRoster('venue-a'),/not authorized/);
  assert.equal(state.queries.filter(q=>q.table==='venue_managers').length,1); // authority lookup only
});
test('active manager cannot add, update or remove manager authority',async()=>{
  for(const input of [base,{...base,status:'active',role:'owner'},{...base,managerId:undefined,targetUserId:'00000000-0000-0000-0000-000000000001',status:'active'}]){
    reset(); state.rows.venue_managers=[{...manager}];
    await assert.rejects(lifecycle.saveVenueManager(input),/Administrator access required/);
    assert.deepEqual(state.writes,[]);
  }
});
test('admin adds verified existing account using user client without identity or owner rewrite',async()=>{
  admin(); const target='00000000-0000-0000-0000-000000000001';
  state.rows.profiles.push({id:target,app_role:'user'});
  await lifecycle.saveVenueManager({...base,managerId:undefined,targetUserId:target,status:'active'});
  assert.equal(state.writes.length,1); assert.equal(state.writes[0].client,'user');
  assert.deepEqual(state.writes[0].payload,{venue_id:'venue-a',user_id:target,role:'manager',status:'active'});
});
test('admin role update preserves custom permissions; scoped optimistic user-client update',async()=>{
  admin(); state.rows.venue_managers[0].permissions={existing:true};
  await lifecycle.saveVenueManager({...base,status:'active',role:'staff'});
  const write=state.writes[0]; assert.equal(write.client,'user');
  assert.deepEqual(write.filters,[['id','manager-a'],['venue_id','venue-a'],['updated_at',manager.updated_at]]);
  assert.equal(state.rows.venue_managers[0].role,'staff');
  assert.deepEqual(state.rows.venue_managers[0].permissions,{existing:true});
  assert.equal('permissions' in write.payload,false);
});
test('unconfirmed last manager revocation is blocked; admin may explicitly return stewardship',async()=>{
  admin(); await assert.rejects(lifecycle.saveVenueManager({...base,confirmed:false}),/confirmation required/);
  assert.deepEqual(state.writes,[]);
  await lifecycle.saveVenueManager(base);
  assert.equal(state.rows.venue_managers[0].status,'removed');
  assert.equal(state.writes.every(q=>q.table==='venue_managers'&&q.operation==='update'),true);
  assert.equal(state.rows.venues[0].status,'draft');
});
test('foreign venue target, stale update, invalid roles, forged actor metadata and lookup errors fail closed',async()=>{
  admin(); state.rows.venue_managers[0].venue_id='venue-b';
  await assert.rejects(lifecycle.saveVenueManager(base),/not found/); assert.deepEqual(state.writes,[]);
  admin(); await assert.rejects(lifecycle.saveVenueManager({...base,expectedUpdatedAt:'stale'}),/changed/); assert.deepEqual(state.writes,[]);
  admin(); await assert.rejects(lifecycle.saveVenueManager({...base,role:'admin'}),/Invalid/); assert.deepEqual(state.writes,[]);
  reset(); await assert.rejects(actions.changeVenueManager(form({venue_id:'venue-a',manager_id:'manager-a',role:'owner',status:'active',user_id:'admin',confirm_authority_change:'yes'})),/not authorized/); assert.deepEqual(state.writes,[]);
  admin(); state.errors['user:venue_managers']={message:'denied'};
  await assert.rejects(lifecycle.saveVenueManager(base),/denied/); assert.deepEqual(state.writes,[]);
});
test('closure and rebrand proposals never write venue identity/location, even for admin',async()=>{
  for(const field of ['lifecycle_review','identity_review','address']){
    admin();
    await assert.rejects(actions.proposeVenueCorrection(form({venue_id:'venue-a',field_name:field,proposed_value:'Proposed',reason:'Evidence',submitted_by:'forged'})),e=>Boolean(e.location));
    assert.equal(state.writes.length,1);assert.equal(state.writes[0].table,'venue_corrections');
    assert.equal(state.writes[0].payload.submitted_by,'authenticated-user');
  }
});
test('ordinary profile editor submits admin material edits for review and preserves visibility',async()=>{
  admin(); Object.assign(state.rows.venues[0],{name:'Old',address:'1 Main',city:'KC',state:'MO',is_visible:false});
  await assert.rejects(venueActions.updateVenueStep1(form({venue_id:'venue-a',name:'New',address:'2 Main',city:'KC',state:'MO',is_visible:'yes'})),e=>Boolean(e.location));
  assert.equal(state.writes.find(q=>q.table==='venue_corrections').payload.length,2);
  const write=state.writes.find(q=>q.table==='venues');
  for(const field of ['name','address','location_id','status','is_visible','owner_id'])assert.equal(field in write.payload,false);
  assert.equal(state.rows.venues[0].is_visible,false);
});
test('unauthorized material proposal cannot write',async()=>{
  reset();await assert.rejects(actions.proposeVenueCorrection(form({venue_id:'venue-a',field_name:'address',proposed_value:'Moved',reason:'test'})),/not authorized/);assert.deepEqual(state.writes,[]);
});
test('Command Center links use canonical Event Builder, existing Presence and explicit authority',()=>{
  const shell=fs.readFileSync('app/dashboard/venues/[id]/layout.tsx','utf8');
  for(const section of ['Overview','Profile','Events','Presence','Analytics','Management','Intelligence'])assert.ok(shell.includes(section));
  assert.ok(shell.includes('getVenueCommandContext(id)'));
  assert.ok(fs.readFileSync('app/dashboard/venues/[id]/events/page.tsx','utf8').includes('/dashboard/events/new?venue_id='));
  assert.ok(fs.readFileSync('app/dashboard/venues/[id]/presence/page.tsx','utf8').includes('requireVenueManagement(id)'));
  assert.ok(fs.readFileSync('app/dashboard/venues/presence/actions.ts','utf8').includes('requireVenueAuthority(venueId)'));
  assert.ok(fs.readFileSync('app/dashboard/venues/[id]/edit/page.tsx','utf8').includes("redirect('/dashboard/venues/' + id)"));
  assert.equal(fs.readFileSync('lib/venues/managers.ts','utf8').includes('createAdminClient'),false);
});
