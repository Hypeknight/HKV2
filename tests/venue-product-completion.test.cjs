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
      venues: [{ id: 'venue-a', owner_id: 'authenticated-user', slug: 'a', status: 'draft', name: 'Managed Venue', address: '456 Venue Street', city: 'Lawrence', state: 'KS' }],
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
    if (name === '@/lib/settings') return { getPlatformSettings: async () => ({ included_promo_days: 14 }) };
    if (name === '@/lib/supabase/server') return { createClient: async () => userClient };
    if (name === '@/lib/supabase/admin') return { createAdminClient: () => adminClient };
    if (name === 'next/navigation') return { redirect };
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
const form = values => { const result = new FormData(); Object.entries(values).forEach(([key, value]) => result.set(key, value)); return result; };
const manager = (status = 'active') => ({ venue_id: 'venue-a', user_id: 'authenticated-user', status, role: 'manager' });

const eventActions = load('app/dashboard/events/actions.ts');
const fields = { name: 'Test Event', venue_name: 'Organizer location', address: '123 Test Street', city: 'Kansas City', state: 'MO', start_date: '2026-11-10', start_time: '19:00', end_date: '2026-11-10', end_time: '23:00' };
async function create(values = {}) {
  await assert.rejects(eventActions.createEventStep1(form({ ...fields, ...values })), error => {
    assert.equal(error.location, '/dashboard/events/new-venue/edit/step-2'); return true;
  });
  return state.writes.find(query => query.table === 'events').payload;
}
test('active manager selects existing venue and stored location; request location cannot replace venue facts', async () => {
  reset(); state.rows.venue_managers = [manager()];
  Object.assign(state.rows.venues[0], { name: 'Managed Venue', address: '456 Venue Street', city: 'Lawrence', state: 'KS' });
  const event = await create({ venue_id: 'venue-a', address: 'forged' });
  assert.equal(event.venue_id, 'venue-a'); assert.equal(event.address, '456 Venue Street'); assert.equal(event.venue_name, 'Managed Venue');
  assert.equal(event.owner_id, 'authenticated-user');
  assert.ok(state.writes.every((query) => query.table === 'events'));
});
test('organizer can create at an unmanaged address without silently attaching an identity', async () => {
  reset(); Object.assign(state.rows.venues[0], { address: fields.address });
  const event = await create(); assert.equal(event.venue_id, null); assert.equal(event.address, fields.address);
  assert.equal(state.queries.some((query) => query.table === 'venue_managers'), false);
});
test('legacy owner/global venue_owner and forged user ID do not authorize selected venue', async () => {
  reset(); state.rows.profiles[0].app_role = 'venue_owner';
  await assert.rejects(eventActions.createEventStep1(form({ ...fields, venue_id: 'venue-a', user_id: 'another-user' })), /not authorized/);
  assert.equal(state.writes.length, 0);
});
test('inactive manager cannot attach venue', async () => {
  reset(); state.rows.venue_managers = [manager('removed')];
  await assert.rejects(eventActions.createEventStep1(form({ ...fields, venue_id: 'venue-a' })), /not authorized/); assert.equal(state.writes.length, 0);
});
test('admin override remains available and creation does not depend on connection acceptance', async () => {
  reset(); state.rows.profiles[0].app_role = 'admin';
  const event = await create({ venue_id: 'venue-a' }); assert.equal(event.venue_id, 'venue-a');
  assert.equal(event.venue_connection_status, 'approved'); assert.equal(event.status, 'building'); assert.equal(event.is_public, false);
  assert.equal(state.queries.some((query) => query.table === 'venue_event_connection_requests'), false);
});
test('managed hidden venue selection never changes administrative visibility', async () => {
  reset(); state.rows.venue_managers = [manager()];
  const venue = state.rows.venues[0]; venue.is_visible = false; venue.status = 'archived'; venue.is_verified = false;
  await create({ venue_id: 'venue-a' }); assert.equal(venue.is_visible, false); assert.equal(venue.status, 'archived'); assert.equal(venue.is_verified, false);
  assert.ok(state.writes.every((query) => query.table === 'events'));
});
test('canonical navigation retains explicit venue context for both entry paths', () => {
  const landing = fs.readFileSync('app/dashboard/events/new/page.tsx', 'utf8');
  assert.ok(landing.includes('encodeURIComponent(query.venue_id)'));
  assert.ok(fs.readFileSync('app/dashboard/venues/page.tsx', 'utf8').includes('/dashboard/events/new?venue_id='));
  assert.ok(fs.readFileSync('app/dashboard/events/new/step-1/page.tsx', 'utf8').includes('getOwnedVenues(user.id)'));
});

test('public venue detail respects explicit moderation visibility without verification or legacy ownership gates', () => {
  const page = fs.readFileSync('app/venues/[slug]/page.tsx', 'utf8').slice(fs.readFileSync('app/venues/[slug]/page.tsx', 'utf8').lastIndexOf('export default async function'));
  assert.ok(page.includes("venue.is_visible === true && venue.status !== 'archived'"));
  assert.ok(page.includes('resolveVenueAuthority'));
  assert.equal(page.includes('venue.owner_id'), false);
  assert.equal(page.includes('venue.is_verified'), false);
});
