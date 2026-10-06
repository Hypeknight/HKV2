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
    if (name === 'next/navigation') return { redirect };
    if (name === 'next/cache') return { revalidatePath() {} };
    if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } };
    if (name === '@/lib/stripe/server') return { getStripeForCurrentMode: async () => { state.stripeCalls++; throw new Error('Stripe must not be reached in denied tests'); } };
    if (name === '@/lib/utils') return { slugify: value => value.toLowerCase() };
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    return require(name);
  }
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: relative })(mockedRequire, module, module.exports);
  return module.exports;
}
const authority = load('lib/venues/authority.ts');
const data = load('lib/data.ts');
const venueActions = load('app/dashboard/venues/actions.ts');
const adminActions = load('app/admin/actions.ts');
const connections = load('app/dashboard/venues/connections/actions.ts');
const checkout = load('app/api/stripe/venues/create-checkout-session/route.ts');
const form = values => { const result = new FormData(); Object.entries(values).forEach(([key, value]) => result.set(key, value)); return result; };
const manager = (status = 'active', venue_id = 'venue-a', user_id = 'authenticated-user') => ({ venue_id, user_id, status, role: 'manager' });

test('active manager is authorized by private server lookup bound to authenticated user and venue', async () => {
  reset(); state.rows.venue_managers = [manager()];
  assert.deepEqual(await authority.resolveVenueAuthority('venue-a'), { canManage: true, source: 'venue_manager', role: 'manager' });
  const q = state.queries.find(q => q.table === 'venue_managers');
  assert.equal(q.client, 'admin');
  assert.deepEqual(q.filters, [['venue_id', 'venue-a'], ['user_id', 'authenticated-user'], ['status', 'active']]);
  assert.equal(state.queries.some(q => q.table === 'venues'), false);
});
for (const status of ['invited', 'suspended', 'removed']) {
  test(status + ' manager is denied despite matching legacy owner_id and forged metadata', async () => {
    reset(); state.rows.venue_managers = [manager(status)];
    assert.equal((await authority.resolveVenueAuthority('venue-a')).canManage, false);
  });
}
test('legacy owner and global venue_owner role without manager are denied', async () => {
  reset(); state.rows.profiles[0].app_role = 'venue_owner';
  assert.equal((await authority.resolveVenueAuthority('venue-a')).canManage, false);
});
test('manager of another venue or another user cannot authorize target venue', async () => {
  reset(); state.rows.venue_managers = [manager('active', 'venue-b'), manager('active', 'venue-a', 'other-user')];
  assert.equal((await authority.resolveVenueAuthority('venue-a')).canManage, false);
});
test('database app_role admin override remains available', async () => {
  reset(); state.rows.profiles[0].app_role = 'admin';
  assert.deepEqual(await authority.resolveVenueAuthority('venue-a'), { canManage: true, source: 'admin', role: 'admin' });
});
test('unauthenticated and empty inputs grant no authority or privileged lookups', async () => {
  reset({ user: null });
  assert.equal((await authority.resolveVenueAuthority('venue-a')).canManage, false);
  assert.deepEqual(await authority.getManagedVenueIds(), []);
  assert.equal(state.queries.length, 0);
  reset(); assert.equal((await authority.resolveVenueAuthority('')).canManage, false);
  assert.equal(state.queries.length, 0);
});
test('auth, profile, missing-table, and unexpected manager errors fail closed', async () => {
  for (const stage of ['auth', 'user:profiles', 'admin:venue_managers']) {
    reset(); const error = { message: 'blocked', code: stage === 'admin:venue_managers' ? '42P01' : '42501' };
    if (stage === 'auth') state.authError = error; else state.errors[stage] = error;
    await assert.rejects(authority.resolveVenueAuthority('venue-a'), caught => caught === error);
  }
});
test('managed list excludes stale owner venues, other users, and inactive records', async () => {
  reset(); state.rows.venue_managers = [manager(), manager('removed', 'venue-b'), manager('active', 'venue-c', 'other-user')];
  state.rows.venues.push({ id: 'venue-b', owner_id: 'authenticated-user' });
  assert.deepEqual((await data.getOwnedVenues('authenticated-user')).map(v => v.id), ['venue-a']);
  const q = state.queries.find(q => q.client === 'admin' && q.table === 'venues');
  assert.deepEqual(q.filters, [['id', ['venue-a']]]);
});
test('compatibility list argument cannot impersonate another user', async () => {
  reset(); assert.deepEqual(await data.getOwnedVenues('other-user'), []);
  assert.equal(state.queries.length, 0);
});
test('removed legacy owner cannot reach existing venue write path', async () => {
  reset(); state.rows.venue_managers = [manager('removed')];
  await assert.rejects(venueActions.updateVenueHours(form({ venue_id: 'venue-a', user_id: 'other-user' })), /not authorized/);
  assert.deepEqual(state.writes, []);
});
test('active manager edit retains user client and venue scope instead of bypassing RLS', async () => {
  reset(); state.rows.venue_managers = [manager()];
  await assert.rejects(venueActions.updateVenueHours(form({ venue_id: 'venue-a' })), error => error.location === '/dashboard/venues/venue-a/review');
  assert.ok(state.writes.length > 0);
  assert.ok(state.writes.every(q => q.client === 'user'));
  const deletion = state.writes.find(q => q.operation === 'delete');
  assert.deepEqual(deletion.filters, [['venue_id', 'venue-a']]);
});
for (const [name, action] of [['dashboard', venueActions.createVenueStep1], ['admin', adminActions.createVenue]]) {
  test(name + ' legacy creation stores owner_id and explicit authenticated active manager', async () => {
    reset(); state.rows.profiles[0].app_role = 'venue_owner';
    await assert.rejects(action(form({ name: 'Example', city: 'Kansas City', state: 'MO', user_id: 'forged-user' })), error => Boolean(error.location));
    const venue = state.writes.find(q => q.table === 'venues');
    const assignment = state.writes.find(q => q.table === 'venue_managers');
    assert.equal(venue.client, 'user'); assert.equal(venue.payload.owner_id, 'authenticated-user');
    assert.equal(assignment.client, 'admin');
    assert.deepEqual(assignment.payload, { venue_id: 'new-venue', user_id: 'authenticated-user', role: 'owner', status: 'active' });
  });
}
test('manager insertion failure stops legacy creation success', async () => {
  reset(); state.rows.profiles[0].app_role = 'venue_owner'; state.errors['admin:venue_managers'] = { message: 'manager insert failed' };
  await assert.rejects(venueActions.createVenueStep1(form({ name: 'Example' })), /manager insert failed/);
});
test('connection decline preserves public event validity and status', async () => {
  reset(); state.rows.venue_managers = [manager()];
  await connections.declineVenueConnection(form({ request_id: 'request-a', user_id: 'forged-user' }));
  assert.equal(state.rows.events[0].status, 'scheduled'); assert.equal(state.rows.events[0].is_public, true);
  assert.equal(state.rows.events[0].venue_id, null); assert.equal(state.rows.events[0].venue_connection_status, 'declined');
});
test('connection action denies revoked managers before service-role writes', async () => {
  reset(); state.rows.venue_managers = [manager('suspended')];
  await assert.rejects(connections.approveVenueConnection(form({ request_id: 'request-a' })), /not authorized/);
  assert.deepEqual(state.writes, []);
});
test('checkout denies legacy-only owner before creating Stripe session or writing subscription', async () => {
  reset(); const result = await checkout.POST({ json: async () => ({ venue_id: 'venue-a', user_id: 'forged-user' }) });
  assert.equal(result.status, 403); assert.equal(state.stripeCalls, 0); assert.deepEqual(state.writes, []);
});

test('anonymous auth-session error leaves public browsing and lists denied without privileged lookup', async () => {
  reset({ user: null, authError: { message: 'Auth session missing' } });
  assert.equal((await authority.resolveVenueAuthority('venue-a')).canManage, false);
  assert.deepEqual(await authority.getManagedVenueIds(), []);
  assert.deepEqual(state.queries, []);
});
test('unexpected manager query error is never converted to legacy ownership', async () => {
  reset(); const error = { message: 'permission denied', code: '42501' };
  state.errors['admin:venue_managers'] = error;
  await assert.rejects(authority.resolveVenueAuthority('venue-a'), caught => caught === error);
  assert.deepEqual(state.writes, []);
});
