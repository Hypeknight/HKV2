const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(path, resolve = require) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', js)(exports, resolve);
  return exports;
}

const facts = load('lib/reporting/factual.ts');
const contracts = load('lib/community-pulse/contracts.ts', key =>
  key === '@/lib/reporting/factual' ? facts : require(key));
const questionId = '00000000-0000-4000-8000-000000000001';
const optionId = '00000000-0000-4000-8000-000000000002';
const alternateId = '00000000-0000-4000-8000-000000000003';
const input = {
  questionId, optionId, operationId: alternateId, expectedRevision: 0,
  noticeVersion: contracts.COMMUNITY_PULSE_NOTICE_VERSION,
};
const period = { periodStart: '2026-11-06T00:00:00Z', periodEnd: '2026-11-07T00:00:00Z', sealedAt: '2026-11-07T01:00:00Z' };
const result = value => contracts.parseCommunityPulseReport(value, [optionId, alternateId], period.periodStart, period.periodEnd);

test('community response input accepts only question, option, operation, revision and notice', () => {
  assert.deepEqual(contracts.parseCommunityPulseResponse({ ...input, userId: 'spoof', verification: 'verified' }), input);
  for (const patch of [{ expectedRevision: -1 }, { expectedRevision: '0' }, { expectedRevision: 7 },
    { questionId: 'invalid' }, { operationId: null }, { noticeVersion: 'unaccepted' }]) {
    assert.equal(contracts.parseCommunityPulseResponse({ ...input, ...patch }), null);
  }
});

test('community report suppresses small cohorts and rejects incomplete or inconsistent aggregates', () => {
  for (const total of [0, 1, 4]) {
    assert.deepEqual(result({ state: 'insufficient', ...period, total, options: ['raw'] }), { state: 'insufficient', ...period });
    assert.deepEqual(result({ state: 'available', ...period, total, options: [] }), { state: 'incomplete' });
  }
  for (const total of [5, 6]) {
    const options = [
      { optionId, count: 1, percentage: total === 5 ? 20 : 16.67 },
      { optionId: alternateId, count: total - 1, percentage: total === 5 ? 80 : 83.33 },
    ];
    const valid = { state: 'available', ...period, total, options };
    assert.deepEqual(result(valid), valid);
    for (const patch of [{ total: 100 }, { options: options.slice(0, 1) }, { options: [options[0], options[0]] },
      { options: [{ ...options[0], percentage: 0 }, options[1]] }, { sealedAt: period.periodStart }]) {
      assert.deepEqual(result({ ...valid, ...patch }), { state: 'incomplete' });
    }
    assert.deepEqual(result({ ...valid, participant: 'never return', options: [
      { ...options[0], account: 'never return' }, options[1],
    ] }), valid);
  }
  assert.deepEqual(result(null), { state: 'incomplete' });
  assert.deepEqual(result({ state: 'unavailable', total: 1 }), { state: 'unavailable' });
  assert.deepEqual(result({ state: 'pending', total: 4 }), { state: 'pending' });
});

function serviceFor({ user = null, authError = null, rpc = async () => ({ data: null, error: null }) } = {}) {
  return load('lib/community-pulse/service.ts', key => {
    if (key === 'server-only') return {};
    if (key === './contracts') return contracts;
    if (key === '@/lib/supabase/server') return {
      createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) } }),
    };
    if (key === '@/lib/supabase/admin') return { createAdminClient: () => ({ rpc }) };
    return require(key);
  });
}

test('server verifies auth, rejects anonymous auth accounts, and never forwards client identity', async () => {
  const calls = [];
  const rpc = async (name, args) => { calls.push({ name, args }); return { data: { state: 'accepted', revision: 1 } }; };
  assert.deepEqual(await serviceFor({ rpc }).submitCommunityPulse({ ...input, userId: alternateId }, 'browser-id'), { state: 'ineligible' });
  assert.deepEqual(await serviceFor({ user: { id: alternateId, is_anonymous: true }, rpc }).submitCommunityPulse(input, 'a'.repeat(43)), { state: 'ineligible' });
  assert.deepEqual(await serviceFor({ authError: Error('Auth unavailable'), rpc }).submitCommunityPulse(input, 'a'.repeat(43)), { state: 'unavailable' });
  assert.deepEqual(calls, []);
  await serviceFor({ user: { id: optionId }, rpc }).submitCommunityPulse({ ...input, userId: alternateId }, null);
  await serviceFor({ authError: { name: 'AuthSessionMissingError' }, rpc }).submitCommunityPulse(input, 'a'.repeat(43));
  assert.equal(calls[0].args.p_user, optionId);
  assert.equal(calls[1].args.p_user, null);
  assert.match(calls[1].args.p_digest, /^[a-f0-9]{64}$/);
  assert.notEqual(calls[1].args.p_digest, 'a'.repeat(43));
});

test('community reads fail closed and guest grant creation returns only server-minted tokens', async () => {
  assert.deepEqual(await serviceFor().loadCommunityPulse(questionId), { state: 'not_found' });
  assert.deepEqual(await serviceFor({ rpc: async () => ({ error: Error('database unavailable') }) }).loadCommunityPulse(questionId), { state: 'unavailable' });
  assert.deepEqual(await serviceFor({ rpc: async () => ({ data: { id: questionId } }) }).loadCommunityPulse(questionId), { state: 'unavailable' });
  const rpc = async (name, args) => {
    assert.equal(name, 'community_pulse_guest_grant');
    assert.match(args.p_digest, /^[a-f0-9]{64}$/);
    assert.equal(args.p_bucket, 'c'.repeat(64));
    return { data: true };
  };
  const issued = await serviceFor({ rpc }).issueCommunityPulseGuestGrant(questionId, 'c'.repeat(64));
  assert.equal(issued.state, 'issued');
  assert.match(issued.cookieToken, /^[\w-]{43}$/);
  assert.deepEqual(await serviceFor({ user: { id: optionId }, rpc }).issueCommunityPulseGuestGrant(questionId, 'c'.repeat(64)), { state: 'denied' });
});
