const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
const token = '00000000-0000-4000-8000-000000000001';
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

async function run({ credential = 'valid-test-credential', error = null, event = { id: 'event-id', slug: 'event-night' },
  site = 'https://hypeknight.fun', mode = 'production', headers = {}, query = '', cookie = token } = {}) {
  const calls = [];
  const metadata = {}, identity = {}, route = {};
  const env = { NODE_ENV: mode, NEXT_PUBLIC_SITE_URL: site };
  new Function('exports', 'process', compile('lib/metadata/share.ts'))(metadata, { env });
  new Function('exports', compile('lib/presence/participant-cookie.ts'))(identity);
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: event, error: null }) }) }) }),
    rpc: async (name, args) => { calls.push({ name, args }); return { data: token, error }; },
  };
  const deps = { 'next/server': { NextResponse }, '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/metadata/share': metadata, '@/lib/presence/participant-cookie': identity };
  new Function('exports', 'require', 'process', compile('app/events/[slug]/check-in/route.ts'))(
    route, name => { assert.ok(deps[name], name); return deps[name]; }, { env });
  const url = new URL('https://localhost:10000/events/route-input/check-in');
  if (credential !== null) url.searchParams.set('credential', credential);
  const request = new NextRequest(url.toString() + query, { headers: { cookie: `${identity.PRESENCE_PARTICIPANT_COOKIE}=${cookie}`, ...headers } });
  const response = await route.GET(request, { params: Promise.resolve({ slug: 'route-input' }) });
  return { response, calls, location: new URL(response.headers.get('location')), identity };
}

test('Render internal origin resolves to trusted configured public origin and event slug', async () => {
  const { response, location, calls } = await run();
  assert.equal(response.status, 307);
  assert.equal(location.origin, 'https://hypeknight.fun');
  assert.equal(location.pathname, '/events/event-night');
  assert.equal(location.search, '?presence=verified');
  assert.equal(calls[0].name, 'join_event_presence');
  assert.equal(calls[0].args.p_event_id, 'event-id');
  assert.equal(calls[1].name, 'check_in_patron_pulse');
});
test('successful redirect retains protected participant cookie and privacy headers', async () => {
  const { response, identity } = await run();
  const cookie = response.cookies.get(identity.PRESENCE_PARTICIPANT_COOKIE);
  assert.equal(cookie.value, token);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, 'lax');
  assert.equal(cookie.path, '/');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});
test('invalid credential and participant context never gain verified cookie', async () => {
  const { response, location, calls, identity } = await run({ error: { message: 'Invalid Presence credential' }, cookie: 'forged-participant' });
  assert.equal(location.search, '?presence=unavailable');
  assert.equal(location.origin, 'https://hypeknight.fun');
  assert.equal(calls[0].args.p_participant_token, null);
  assert.equal(calls.length, 1);
  assert.equal(response.cookies.get(identity.PRESENCE_PARTICIPANT_COOKIE), undefined);
});
test('missing credential and unknown event use public destinations without joining', async () => {
  const missing = await run({ credential: null });
  assert.equal(missing.location.href, 'https://hypeknight.fun/events/event-night?presence=credential_required');
  assert.equal(missing.calls.length, 0);
  const unknown = await run({ event: null });
  assert.equal(unknown.location.href, 'https://hypeknight.fun/events');
  assert.equal(unknown.calls.length, 0);
});
test('configured local development origin and cookie behavior remain supported', async () => {
  const { response, location, identity } = await run({ site: 'http://localhost:3000', mode: 'development' });
  assert.equal(location.origin, 'http://localhost:3000');
  assert.equal(response.cookies.get(identity.PRESENCE_PARTICIPANT_COOKIE).secure, false);
});
test('untrusted headers, redirect query and slug cannot select an external origin', async () => {
  const { location } = await run({ site: 'https://trusted.example/base?ignored=yes',
    headers: { host: 'evil.example', 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'http' },
    query: '&next=https://evil.example&redirect=//evil.example', event: { id: 'event-id', slug: '//evil.example/a?next=x#fragment' } });
  assert.equal(location.origin, 'https://trusted.example');
  assert.equal(location.pathname, '/events/%2F%2Fevil.example%2Fa%3Fnext%3Dx%23fragment');
  assert.equal(location.search, '?presence=verified');
  assert.equal(location.hash, '');
});
