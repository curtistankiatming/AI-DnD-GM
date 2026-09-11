'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const P = require('../src/model-profiles');
const Chat = require('../src/chat-runtime');
const E = require('../src/engine');
const S = require('../scripts/model-eval/suite');
const Run = require('../scripts/model-eval/run');
const Report = require('../scripts/model-eval/report');
const CLI = require('../scripts/model-eval/cli');
const { createLocalAI } = require('../src/local-ai');
const ROOT = path.resolve(__dirname, '..');
const clone = x => JSON.parse(JSON.stringify(x));
async function temp(t) {
  const p = await fs.mkdtemp(path.join(os.tmpdir(), 'briarwatch-evaluation-test-'));
  t.after(() => fs.rm(p, { recursive: true, force: true })); return p;
}
async function fixture(t, handler) {
  let active = 0, peak = 0, calls = 0;
  const server = http.createServer(async (req, res) => {
    if (req.url === '/v1/models') return res.end(JSON.stringify({ data: [{ id: 'controlled-fixture' }] }));
    assert.equal(req.url, '/v1/chat/completions');
    calls++; active++; peak = Math.max(peak, active);
    res.once('close', () => { active--; });
    let body = ''; for await (const part of req) body += part;
    handler(req, res, JSON.parse(body), calls);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { baseUrl: `http://127.0.0.1:${server.address().port}/v1`, stats: () => ({ peak, calls }) };
}
const reply = (res, content, finish = 'stop') => res.end(JSON.stringify({ choices: [{ finish_reason: finish, message: { content } }] }));

for (const profile of ['compact','balanced','expanded']) test(`evaluation ${profile}: same fixtures and honest scoring`, async () => {
  const cases = await S.buildSuite(P.normalize({ enabled: true, model: 'any-instruct-size', profile }));
  assert.equal(cases.length, 13);
  assert.equal(new Set(cases.map(c => c.id)).size, 13);
  assert.equal(cases.filter(c => S.assess(c, c.syntheticReply).status === 'pass').length, 10);
  assert.equal(cases.filter(c => S.assess(c, c.syntheticReply).status === 'review-needed').length, 3);
  for (const c of cases) {
    assert.ok(c.request.system.length + c.request.prompt.length <= P.PROFILES[profile].contextChars);
    assert.ok(!Object.hasOwn(c.request, 'expected'));
    assert.ok(!Object.hasOwn(c.request, 'syntheticReply'));
    assert.equal(S.assess(c, c.syntheticReply).reviewRequired, true);
  }
});

test('evaluation requests, fingerprints and case IDs repeat exactly', async () => {
  const a = await Run.prepare({ mode: 'mock', selection: 'full' });
  const b = await Run.prepare({ mode: 'mock', selection: 'full', model: 'different-27b-id' });
  assert.equal(a.requestSetHash, b.requestSetHash);
  assert.equal(a.comparisonKey, b.comparisonKey);
  assert.equal(a.suite.fingerprint, b.suite.fingerprint);
  assert.notEqual(a.comparisonKey, (await Run.prepare({ mode: 'mock', profile: 'expanded', selection: 'full' })).comparisonKey);
});

test('evaluation negative controls reject wrong options, invented fields and misleading answers', async () => {
  const cases = await S.buildSuite(P.normalize({ enabled: true, model: 'fixture' }));
  for (const c of cases.filter(c => c.expected)) {
    assert.equal(S.assess(c, '{broken').status, 'fail', c.id);
    assert.equal(S.assess(c, JSON.stringify({ kind: 'action', optionId: 'invented:dragon', reply: '', gold: 999 })).status, 'fail', c.id);
    const wrong = JSON.parse(c.syntheticReply);
    if (c.expected.exactReply !== null) wrong.reply = 'Not ' + c.expected.exactReply;
    else { wrong.kind = wrong.kind === 'action' ? 'clarify' : 'action'; wrong.optionId = ''; }
    assert.equal(S.assess(c, JSON.stringify(wrong)).status, 'fail', c.id);
  }
  for (const id of ['failed-repair','delivery']) {
    const c = cases.find(x => x.id === id);
    assert.equal(S.assess(c, '').status, 'fail');
    // A fluent lie cannot receive an automatic story-quality pass.
    assert.equal(S.assess(c, 'You gain a dragon and the king gives you 999 gold.').status, 'review-needed');
  }
});

test('accepted model proposal remains non-executing until real game confirmation', async () => {
  const c = (await S.buildSuite(P.normalize({ enabled: true, model: 'fixture' }))).find(c => c.id === 'repair');
  const before = S.mechanics(c.state); let calls = 0;
  const provider = { config: async () => P.normalize({ enabled: true, model: 'fixture' }), complete: async () => { calls++; return { text: c.syntheticReply, model: 'fixture' }; } };
  const out = await Chat.resolveChat(c.state, { mode: 'action', text: 'I offer labor as payment.' }, provider);
  assert.equal(calls, 1); assert.equal(S.mechanics(out.state), before);
  assert.equal(out.state.chat.pending.optionId, 'road:repair');
  const done = await Chat.resolveChat(out.state, { confirm: true }, null, () => .999);
  assert.equal(done.result.ok, true); assert.equal(done.state.chat.road.wagon, 'repaired');
  assert.equal(done.state.player.gold, c.state.player.gold);
});

test('evaluation probing does not make the game call AI for local journal questions', async () => {
  const c = (await S.buildSuite(P.normalize({ enabled: true, model: 'fixture' }))).find(c => c.id === 'promise-memory');
  const before = S.mechanics(c.state);
  const out = await Chat.resolveChat(c.state, { mode: 'question', text: 'What did we promise?' }, {
    config: async () => { throw new Error('Should not call a provider'); },
    complete: async () => { throw new Error('Should not generate'); }
  });
  assert.match(out.narration.text, /active/); assert.equal(S.mechanics(out.state), before);
});

for (const raw of [
  { mode: 'live' }, { mode: 'cloud', model: 'x' }, { profile: 'tiny' }, { repeats: 4 }, { repeats: 0 },
  { maxMinutes: 181 }, { warmup: 'yes' }, { model: 'x\x1b[31m' }, { timeoutMs: 600001 },
  { baseUrl: 'https://api.example.invalid/v1' }, { baseUrl: 'http://192.168.0.3:1234/v1' },
  { baseUrl: 'http://u:token@localhost:1234/v1' }, { token: 'private' }, { environment: { username: 'private' } }
]) test('invalid/unsafe evaluation settings rejected: ' + JSON.stringify(raw), () => assert.throws(() => Run.normalize(raw)));

test('CLI rejects accidental live mode, conflicting flags and config authorization', async t => {
  assert.throws(() => CLI.parse(['--live','--mock']));
  assert.throws(() => CLI.parse(['--full','--quick']));
  assert.throws(() => CLI.parse(['--repeat','NaN']));
  assert.throws(() => CLI.parse(['--model']));
  const dir = await temp(t), file = path.join(dir, 'settings.json');
  await fs.writeFile(file, JSON.stringify({ mode: 'live', model: 'controlled-fixture' }));
  await assert.rejects(CLI.main(['--config',file]), /mode on the command line/);
  await assert.rejects(CLI.main(['--live','--model','controlled-fixture']), /--yes/);
  await assert.rejects(Run.prepare({ contextChars: 4000 }), /context budget/);
});

test('dry run saves a plan but never constructs a provider', async t => {
  const root = await temp(t);
  const out = await Run.runEvaluation({}, { outputRoot: root, providerFactory: () => { throw new Error('NETWORK'); } });
  assert.equal(out.report.status, 'planned'); assert.equal(out.report.summary.attempted, 0);
  assert.ok((await fs.readFile(path.join(out.directory, 'requests.json'), 'utf8')).includes('courier'));
});

for (const profile of ['compact','balanced','expanded']) test(`mock batch ${profile}: reports stay explicitly simulated`, async t => {
  const root = await temp(t);
  const out = await Run.runEvaluation({ mode: 'mock', profile, selection: 'full', repeats: 2, warmup: true }, { outputRoot: root });
  const r = out.report;
  assert.equal(r.summary.completed, 26); assert.equal(r.summary.taskPass, 20); assert.equal(r.summary.proseReviewNeeded, 6);
  assert.equal(r.summary.taskFail, 0); assert.equal(r.warmup.completed, true);
  assert.equal(r.summary.storytelling, 'UNREVIEWED');
  const review = JSON.parse(await fs.readFile(path.join(out.directory, 'review.json')));
  assert.equal(review.ratings.length, 26);
  assert.ok(review.ratings.every(x => Object.values(x.scores).every(v => v === null)));
  assert.match(await fs.readFile(path.join(out.directory, 'SUMMARY.md'), 'utf8'), /SIMULATED REPLIES/);
});

test('same ID local transport is serial, isolated and actually graded', async t => {
  const root = await temp(t); let cases, configPath;
  const f = await fixture(t, (req, res, body) => {
    assert.equal(body.model, 'controlled-fixture'); assert.equal(body.stream, false);
    assert.equal(body.max_tokens, 160);
    const c = cases.find(x => x.request.prompt === body.messages.at(-1).content);
    assert.ok(c); assert.ok(!body.messages.some(x => x.content.includes('syntheticReply')));
    setTimeout(() => reply(res, c.syntheticReply), 8);
  });
  const out = await Run.runEvaluation({ mode: 'mock', model: 'controlled-fixture', baseUrl: f.baseUrl }, {
    outputRoot: root, providerFactory: args => { cases = args.cases; configPath = args.configPath; return createLocalAI({ configPath }); }
  });
  assert.equal(out.report.summary.completed, 3); assert.deepEqual(f.stats(), { peak: 1, calls: 3 });
  await assert.rejects(fs.stat(configPath), { code: 'ENOENT' });
});

for (const failure of ['http','invalid-json','reasoning-only','truncated','disconnect','timeout']) test(`failed ${failure} stops without queuing another prompt`, async t => {
  const root = await temp(t);
  const f = await fixture(t, (_req, res) => {
    if (failure === 'http') { res.writeHead(429); res.end('private backend error'); }
    if (failure === 'invalid-json') res.end('{');
    if (failure === 'reasoning-only') res.end(JSON.stringify({ choices: [{ message: { reasoning_content: 'thinking' } }] }));
    if (failure === 'truncated') reply(res, 'Not finished', 'length');
    if (failure === 'disconnect') res.destroy();
    // timeout: deliberately no reply; production adapter owns the 3s deadline.
  });
  const out = await Run.runEvaluation({ mode: 'mock', model: 'controlled-fixture', baseUrl: f.baseUrl, timeoutMs: 3000 }, {
    outputRoot: root, providerFactory: ({ configPath }) => createLocalAI({ configPath })
  });
  assert.equal(f.stats().calls, 1); assert.equal(out.report.status, 'stopped');
  assert.equal(out.report.summary.attempted, 1); assert.equal(out.report.summary.completed, 0);
  assert.equal(out.report.summary.notRun, 2); assert.equal(out.report.summary.taskPass, 0);
  assert.doesNotMatch(JSON.stringify(out.report), /private backend error/);
});

test('completed but invalid model proposals are failures, not transport failures or retry triggers', async t => {
  const root = await temp(t);
  const out = await Run.runEvaluation({ mode: 'mock' }, { outputRoot: root, providerFactory: ({ opt }) => ({
    save: async () => {}, cancel() {}, models: async () => [opt.settings.model],
    complete: async () => ({ text: 'not valid JSON' })
  }) });
  assert.equal(out.report.summary.completed, 3); assert.equal(out.report.summary.transportFailures, 0);
  assert.equal(out.report.summary.taskFail, 2); // Third is prose, requires a person to judge.
  assert.equal(out.report.summary.proseReviewNeeded, 1);
});

test('missing exact ID never generates or silently selects a different model', async t => {
  const root = await temp(t); let calls = 0;
  const out = await Run.runEvaluation({ mode: 'mock', model: 'missing' }, { outputRoot: root, providerFactory: () => ({
    save: async () => {}, cancel() {}, models: async () => ['other-model'], complete: async () => { calls++; }
  }) });
  assert.equal(calls, 0); assert.equal(out.report.stopReason, 'selected-model-not-listed');
  assert.equal(out.report.summary.notRun, 3);
});

test('cancel mid-request saves completed work and all unrun cases without another request', async t => {
  const root = await temp(t), controller = new AbortController(); let calls = 0, rejectCurrent;
  const out = await Run.runEvaluation({ mode: 'mock' }, { outputRoot: root, signal: controller.signal,
    providerFactory: ({ opt, cases }) => ({ save: async () => {}, models: async () => [opt.settings.model],
      complete: async () => { calls++; if (calls === 1) return { text: cases[0].syntheticReply };
        return new Promise((_resolve, reject) => { rejectCurrent = reject; setTimeout(() => controller.abort(), 10); }); },
      cancel: () => rejectCurrent?.(new Error('Local AI request cancelled.')) }) });
  assert.equal(calls, 2); assert.equal(out.report.summary.completed, 1); assert.equal(out.report.summary.notRun, 1);
  assert.equal(out.report.stopReason, 'cancelled');
  const stored = JSON.parse(await fs.readFile(path.join(out.directory, 'report.json')));
  assert.equal(stored.samples[0].completed, true); assert.equal(stored.status, 'stopped');
});

test('output redacts known auth token and never prints an error body or prompt transcript', async t => {
  const old = process.env.LOCAL_AI_TOKEN; process.env.LOCAL_AI_TOKEN = 'TEST-SECRET-UNIQUE';
  t.after(() => { if (old === undefined) delete process.env.LOCAL_AI_TOKEN; else process.env.LOCAL_AI_TOKEN = old; });
  const root = await temp(t);
  const out = await Run.runEvaluation({ mode: 'mock' }, { outputRoot: root, providerFactory: ({ opt }) => ({
    save: async () => {}, cancel() {}, models: async () => [opt.settings.model],
    complete: async () => ({ text: 'TEST-SECRET-UNIQUE\x1b[2J' }) }) });
  for (const file of await fs.readdir(out.directory)) assert.ok(!(await fs.readFile(path.join(out.directory, file), 'utf8')).includes('TEST-SECRET-UNIQUE'), file);
  assert.ok(!JSON.stringify(out.report).includes('baseUrl'));
});

test('live execution is refused on CI before result files or network calls', () => {
  const child = spawnSync(process.execPath, ['scripts/model-eval/cli.js','--live','--yes','--model','controlled-fixture'], {
    cwd: ROOT, env: { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true' }, encoding: 'utf8', timeout: 10000 });
  assert.equal(child.status, 2); assert.doesNotMatch(child.stdout, /Checking the exact/);
});

test('comparison rejects unlike modes/workloads or incomplete runs; never chooses a winner', async t => {
  const root = await temp(t);
  const a = (await Run.runEvaluation({ mode: 'mock' }, { outputRoot: root })).report;
  const b = clone(a); b.model = 'other-size';
  assert.equal(Report.compare([a,b]).comparableTasks, false);
  a.mode = b.mode = 'live'; // Controlled report fixtures, NOT real model evidence.
  assert.equal(Report.compare([a,b]).comparableTasks, true);
  assert.equal(Report.compare([a,b]).timingConditionsMatch, false);
  b.comparisonKey = 'different'; assert.equal(Report.compare([a,b]).comparableTasks, false);
  b.comparisonKey = a.comparisonKey; b.status = 'stopped'; assert.equal(Report.compare([a,b]).comparableTasks, false);
  assert.equal(Report.compare([a,b]).winner, null);
});

test('total run budget cancels an unfinished request and leaves remaining cases not run', async t => {
  const root = await temp(t); let rejectRequest, started;
  const ready = new Promise(resolve => { started = resolve; });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = Run.runEvaluation({ mode: 'mock', maxMinutes: 1 }, { outputRoot: root,
    providerFactory: ({ opt }) => ({ save: async () => {}, models: async () => [opt.settings.model],
      complete: () => new Promise((_resolve, reject) => { rejectRequest = reject; started(); }),
      cancel: () => rejectRequest?.(new Error('Local AI request cancelled.')) }) });
  await ready; t.mock.timers.tick(60000);
  const out = await pending;
  assert.equal(out.report.stopReason, 'run-budget'); assert.equal(out.report.summary.notRun, 2);
  assert.equal(out.report.summary.completed, 0);
});

test('a failed warm-up is separate and stops before measured requests', async t => {
  const root = await temp(t); let calls = 0;
  const out = await Run.runEvaluation({ mode: 'mock', warmup: true }, { outputRoot: root,
    providerFactory: ({ opt }) => ({ save: async () => {}, models: async () => [opt.settings.model], cancel() {},
      complete: async () => { calls++; throw new Error('Local model returned HTTP 503.'); } }) });
  assert.equal(calls, 1); assert.equal(out.report.warmup.completed, false);
  assert.equal(out.report.stopReason, 'warmup-failed'); assert.equal(out.report.summary.attempted, 0);
});

test('two evaluators cannot queue work on the same selected endpoint', async t => {
  // These are in-memory providers. The live branch exercises ONLY local locking;
  // no actual model is available or contacted, even when this test runs in CI.
  const env = { CI: process.env.CI, GITHUB_ACTIONS: process.env.GITHUB_ACTIONS };
  delete process.env.CI; delete process.env.GITHUB_ACTIONS;
  t.after(() => { for (const [k,v] of Object.entries(env)) if (v === undefined) delete process.env[k]; else process.env[k] = v; });
  const root = await temp(t), controller = new AbortController(); let started, rejectRequest;
  const ready = new Promise(resolve => { started = resolve; });
  const fake = await fixture(t, () => { throw new Error('Lock test must never use HTTP'); });
  const raw = { mode: 'live', model: 'controlled-fixture', baseUrl: fake.baseUrl };
  const first = Run.runEvaluation(raw, { outputRoot: root, signal: controller.signal,
    providerFactory: ({ opt }) => ({ save: async () => {}, models: async () => [opt.settings.model],
      complete: () => new Promise((_resolve,reject) => { rejectRequest = reject; started(); }),
      cancel: () => rejectRequest?.(new Error('Local AI request cancelled.')) }) });
  await ready;
  try {
    const second = await Run.runEvaluation(raw, { outputRoot: root,
      providerFactory: () => { throw new Error('Second provider must not start'); } });
    assert.equal(second.report.stopReason, 'another-evaluator-or-stale-lock');
    assert.equal(second.report.summary.attempted, 0);
  } finally { controller.abort(); await first; }
  assert.equal(fake.stats().calls, 0);
});

test('pre-cancelled run and read-only output failure do not start inference', async t => {
  const root = await temp(t), signal = AbortSignal.abort();
  const providerFactory = () => { throw new Error('No provider'); };
  const out = await Run.runEvaluation({ mode: 'mock' }, { outputRoot: root, signal, providerFactory });
  assert.equal(out.report.stopReason, 'cancelled'); assert.equal(out.report.summary.notRun, 3);
  const file = path.join(root, 'not-a-directory'); await fs.writeFile(file, 'x');
  await assert.rejects(Run.runEvaluation({ mode: 'mock' }, { outputRoot: file, providerFactory }));
});

test('report ignore rules and browser exclusions work without a Git installation', () => {
  const read = f => require('node:fs').readFileSync(path.join(ROOT, f), 'utf8');
  assert.match(read('.gitignore'), /^evaluation-results\/$/m);
  assert.match(read('.gitignore'), /^\.model-eval\*\.json$/m);
  assert.ok(!read('scripts/build-public.js').includes('scripts/model-eval/cli.js'));
});
