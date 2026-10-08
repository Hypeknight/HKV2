const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const read = p => fs.readFileSync(p,'utf8');
const cookie = {};
new Function('exports',ts.transpileModule(read('lib/presence/participant-cookie.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(cookie);
test('UUID cookie identity rejects arbitrary, empty and legacy hex values',()=>{
  assert.equal(cookie.parseParticipantToken('00000000-0000-4000-8000-000000000001'),'00000000-0000-4000-8000-000000000001');
  for(const s of [null,'','a'.repeat(64),'actor-user','x\n00000000-0000-4000-8000-000000000001']) assert.equal(cookie.parseParticipantToken(s),null);
});
test('actions use cookie-bound constrained RPC; never trust request identity/verification',()=>{
  const s=read('app/events/patron-pulse/actions.ts');
  assert.match(s,/cookies\(\)/);assert.match(s,/submit_patron_pulse_response/);
  assert.doesNotMatch(s,/get\('participant_token'\)|get\('user_id'\)|createAdminClient|recordSignal|\.insert\(|\.update\(/);
});
test('QR route establishes HttpOnly identity without exposing it in forms',()=>{
  const route=read('app/events/[slug]/check-in/route.ts');
  assert.match(route,/join_event_presence/);assert.match(route,/httpOnly: true/);assert.match(route,/no-referrer/);
  const panel=read('components/patron-pulse/PatronPulseGuestPanel.tsx');
  assert.doesNotMatch(panel,/Sign in to answer|participantToken/);
  assert.match(panel,/!checkedIn/);
});
test('public detail performs participant-scoped read without creating identity',()=>{
  const page=read('app/events/[slug]/page.tsx');assert.doesNotMatch(page,/resolvePresenceParticipant|getActivePresenceVerification/);
  assert.match(page,/participantToken/);
  assert.match(read('lib/patron-pulse/service.ts'),/get_patron_pulse_participant_state/);
});
