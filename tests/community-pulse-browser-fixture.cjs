/* Opt-in public browser review on the already validated disposable local stack.
 * Creates one local editorial fixture; never accepts a hosted database or emits credentials.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID, randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const endpoint = process.env.COMMUNITY_PULSE_LOCAL_URL;
const database = process.env.COMMUNITY_PULSE_LOCAL_DATABASE_URL;
for (const value of [endpoint, database]) {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value || 'https://invalid').hostname), 'Loopback fixture resources required');
}
const site = new URL(process.env.COMMUNITY_PULSE_REVIEW_SITE || 'https://invalid');
assert.ok(site.protocol === 'https:' && site.hostname.endsWith('.app.github.dev'), 'Use the private Codespace review origin');
const key = process.env.COMMUNITY_PULSE_LOCAL_SERVICE_KEY;
const anon = process.env.COMMUNITY_PULSE_LOCAL_ANON_KEY;
assert.ok(key && anon);
const db = new Client({ connectionString: database });
const service = createClient(endpoint, key, { auth: { persistSession: false, autoRefreshToken: false } });
async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  assert.ifError(error);
  return data;
}
(async () => {
  await db.connect();
  assert.equal((await db.query("select to_regprocedure('public.community_pulse_home(text,text)') is not null as ready")).rows[0].ready, true, 'Apply and validate the disposable transport fixture first');
  assert.equal((await db.query("select coalesce(bool_and(display_name like 'Disposable P3B%'),false) as safe from public.profiles")).rows[0].safe, true, 'Only the disposable P3B fixture is allowed');
  const email = `p3b-browser-${randomUUID()}@example.test`;
  const password = randomBytes(32).toString('base64url');
  const made = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(made.error);
  await db.query("insert into public.profiles values($1,'admin','Disposable P3B browser fixture')", [made.data.user.id]);
  const editor = createClient(endpoint, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.ifError((await editor.auth.signInWithPassword({ email, password })).error);
  const question = await rpc(editor, 'community_pulse_create', {
    p_prompt: process.env.COMMUNITY_PULSE_REVIEW_STRESS_TEXT === '1' ? 'Development wrapping check ' + 'Q'.repeat(150) : 'What is your ideal Friday night?',
    p_description: process.env.COMMUNITY_PULSE_REVIEW_STRESS_TEXT === '1' ? 'Development fixture. ' + 'D'.repeat(479) : 'Development fixture · disposable local database. No production responses are collected here.',
    p_options: [process.env.COMMUNITY_PULSE_REVIEW_STRESS_TEXT === '1' ? 'O'.repeat(80) : 'Live music', 'Dancing', 'A relaxed atmosphere', 'Something different'],
    p_market: null, p_city: null, p_state: null,
    p_opens: new Date(Date.now() - 60000).toISOString(),
    p_closes: new Date(Date.now() + 86400000).toISOString(), p_guests: false, p_supersedes: null,
  });
  await rpc(editor, 'community_pulse_transition', { p_question: question, p_status: 'open' });
  await rpc(editor, 'community_pulse_set_home', { p_question: question, p_selected: true });
  await editor.auth.signOut();
  if (process.env.COMMUNITY_PULSE_REVIEW_REUSE_SERVER === '1') {
    console.log('Public question fixture refreshed. Existing local review server retained.');
    return;
  }
  const log = fs.openSync('/tmp/hkv2-p3b-browser-next.log', 'w', 0o600);
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', '--port', '3234'], {
    cwd: process.cwd(), detached: true, stdio: ['ignore', log, log],
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: endpoint, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
      SUPABASE_SERVICE_ROLE_KEY: key, NEXT_PUBLIC_SITE_URL: site.origin,
      HYPEKNIGHT_COMMUNITY_PULSE_ENABLED: '1', HYPEKNIGHT_HOMEPAGE_PREVIEW: '1', NEXT_TELEMETRY_DISABLED: '1' },
  });
  fs.closeSync(log);
  fs.writeFileSync('/tmp/hkv2-p3b-browser.pid', String(server.pid), { mode: 0o600 });
  server.unref();
  console.log('Public browser fixture started. Backend is disposable and local. Administrator browser authorization is not established by this fixture.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.end());
