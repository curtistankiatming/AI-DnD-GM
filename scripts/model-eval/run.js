'use strict';
const fs = require('node:fs/promises');
const syncfs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { createLocalAI } = require('../../src/local-ai');
const P = require('../../src/model-profiles');
const S = require('./suite');
const Report = require('./report');
const ROOT = path.resolve(__dirname, '../..');
function normalize(raw = {}) {
  const allowed = ['mode','model','profile','baseUrl','format','roles','timeoutMs','contextChars','replyTokens','selection','repeats','warmup','maxMinutes','environment'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(k => !allowed.includes(k))) throw new Error('Unsupported evaluation setting.');
  const mode = raw.mode || 'dry-run';
  if (!['dry-run','mock','live'].includes(mode)) throw new Error('Mode must be dry-run, mock or live.');
  const cfg = {};
  for (const key of ['model','profile','baseUrl','format','roles','timeoutMs','contextChars','replyTokens']) if (raw[key] !== undefined) cfg[key] = raw[key];
  cfg.model ??= mode === 'live' ? '' : 'synthetic-fixture';
  cfg.enabled = true;
  const settings = P.normalize(cfg);
  if (/[\x00-\x1f\x7f]/.test(settings.model)) throw new Error('Model ID must not contain control characters.');
  const selection = raw.selection || 'quick';
  if (!['quick','full'].includes(selection)) throw new Error('Select quick or full.');
  const repeats = raw.repeats ?? 1, maxMinutes = raw.maxMinutes ?? 30, warmup = raw.warmup ?? false;
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 3) throw new Error('Repeats must be 1 to 3.');
  if (!Number.isInteger(maxMinutes) || maxMinutes < 1 || maxMinutes > 180) throw new Error('Run budget must be 1 to 180 minutes.');
  if (typeof warmup !== 'boolean') throw new Error('Warmup must be true or false.');
  const environment = { hardware: '', runtime: '', quantization: '' };
  if (raw.environment !== undefined) {
    if (!raw.environment || typeof raw.environment !== 'object' || Array.isArray(raw.environment) || Object.keys(raw.environment).some(k => !Object.hasOwn(environment, k))) throw new Error('Use hardware, runtime and quantization labels only.');
    for (const [key, value] of Object.entries(raw.environment)) {
      if (typeof value !== 'string' || value.length > 160 || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Environment labels must be short plain text.');
      environment[key] = value;
    }
  }
  return { mode, settings, selection, repeats, warmup, maxMinutes, environment };
}
function fingerprint() {
  const files = [];
  function walk(dir) {
    for (const f of syncfs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const name = dir + '/' + f.name;
      if (f.isDirectory()) walk(name);
      else if (f.name.endsWith('.js')) files.push(name);
    }
  }
  walk('src'); walk('scripts/model-eval');
  return Report.hash(files.sort().map(f => [f, Report.hash(syncfs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n'))]));
}
async function prepare(raw) {
  const opt = normalize(raw);
  const all = await S.buildSuite(opt.settings);
  const cases = opt.selection === 'full' ? all : all.filter(c => S.QUICK.includes(c.id));
  const suite = { version: S.VERSION, fingerprint: Report.hash(all.map(({ state, syntheticReply, ...c }) => c)) };
  const requests = cases.map(c => [c.id, c.request]);
  const { enabled, baseUrl, model, ...publicSettings } = opt.settings;
  return { opt, cases, suite, sourceFingerprint: fingerprint(), requestSetHash: Report.hash(requests),
    comparisonKey: Report.hash({ suite, source: fingerprint(), requests, publicSettings,
      repeats: opt.repeats, warmup: opt.warmup, maxMinutes: opt.maxMinutes }),
    settings: publicSettings, planned: cases.length * opt.repeats,
    worstCaseMinutes: Math.min(opt.maxMinutes, Math.ceil((cases.length * opt.repeats + (opt.warmup ? 1 : 0)) * opt.settings.timeoutMs / 60000)) };
}
function errorCode(error) {
  const text = String(error?.message || '');
  if (/cancelled/.test(text)) return 'cancelled';
  if (/wait limit/.test(text)) return 'timeout';
  if (/output limit|finished text|Reasoning-only/.test(text)) return 'incomplete-reply';
  if (/size limit/.test(text)) return 'reply-too-large';
  if (/invalid JSON/.test(text)) return 'invalid-api-json';
  if (/HTTP/.test(text)) return 'http-error';
  return 'connection-or-adapter-error'; // Do not write private backend errors.
}
async function atomic(file, contents) {
  await fs.writeFile(file + '.tmp', contents, { mode: 0o600 });
  await fs.rename(file + '.tmp', file);
}
function redact(text) {
  let out = String(text).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  if (process.env.LOCAL_AI_TOKEN) out = out.split(process.env.LOCAL_AI_TOKEN).join('[REDACTED]');
  return out;
}
async function runEvaluation(raw, { outputRoot = path.join(ROOT, 'evaluation-results'), signal, progress = () => {}, providerFactory } = {}) {
  const p = await prepare(raw), { opt, cases } = p;
  if (opt.mode === 'live' && (process.env.CI || process.env.GITHUB_ACTIONS)) throw new Error('Live model evaluation is disabled in CI.');
  const runId = crypto.randomUUID(), dir = path.join(outputRoot, runId);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const report = { schema: 1, runId, mode: opt.mode, model: redact(opt.settings.model),
    startedAt: new Date().toISOString(), suite: p.suite, sourceFingerprint: p.sourceFingerprint,
    requestSetHash: p.requestSetHash, comparisonKey: p.comparisonKey, settings: p.settings,
    environment: Object.fromEntries(Object.entries(opt.environment).map(([k,v]) => [k,redact(v)])), repeats: opt.repeats, warmupRequested: opt.warmup,
    budgetMinutes: opt.maxMinutes, node: process.version, status: 'planned', stopReason: null,
    warmup: null, samples: [] };
  // Repeat-major order reduces immediate duplicate prompt/cache effects.
  for (let repeat = 1; repeat <= opt.repeats; repeat++) for (const c of cases)
    report.samples.push({ caseId: c.id, category: c.category, repeat, status: 'not-run', completed: false });
  const responses = [];
  async function checkpoint() {
    report.summary = Report.summary(report);
    await atomic(path.join(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await atomic(path.join(dir, 'SUMMARY.md'), Report.markdown(report));
    await atomic(path.join(dir, 'responses.json'), JSON.stringify({ runId, mode: opt.mode, responses }, null, 2) + '\n');
    await atomic(path.join(dir, 'review.json'), JSON.stringify(Report.reviewTemplate(report, cases), null, 2) + '\n');
  }
  await atomic(path.join(dir, 'requests.json'), JSON.stringify(cases.map(c => ({ caseId: c.id, path: c.path, request: c.request })), null, 2) + '\n');
  await checkpoint(); // A writable report destination is required before inference.
  if (opt.mode === 'dry-run') return { report, directory: dir };
  let temp, provider, timer, lock, lockHandle, cancelled = false, budgetExpired = false;
  const abort = () => { cancelled = true; provider?.cancel(); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    if (signal?.aborted) { cancelled = true; report.stopReason = 'cancelled'; return { report, directory: dir }; }
    if (opt.mode === 'live') {
      lock = path.join(os.tmpdir(), 'briarwatch-model-eval-' + Report.hash(new URL(opt.settings.baseUrl).protocol + ':' + (new URL(opt.settings.baseUrl).port || (opt.settings.baseUrl.startsWith('https:') ? '443' : '80'))).slice(0, 20) + '.lock');
      try { lockHandle = await fs.open(lock, 'wx', 0o600); await lockHandle.writeFile(JSON.stringify({ pid: process.pid })); }
      catch { report.stopReason = 'another-evaluator-or-stale-lock'; return { report, directory: dir }; }
    }
    temp = await fs.mkdtemp(path.join(os.tmpdir(), 'briarwatch-eval-config-'));
    const configPath = path.join(temp, 'settings.json');
    if (providerFactory) provider = await providerFactory({ configPath, cases, opt });
    else if (opt.mode === 'mock') provider = {
      save: async () => {}, cancel: () => {}, models: async () => [opt.settings.model],
      complete: async req => ({ text: cases.find(c => c.request.prompt === req.prompt)?.syntheticReply || 'Warm-up complete.', model: opt.settings.model })
    };
    else provider = createLocalAI({ configPath });
    await provider.save(opt.settings);
    timer = setTimeout(() => { budgetExpired = true; provider.cancel(); }, opt.maxMinutes * 60000);
    if (cancelled) { report.stopReason = 'cancelled'; return { report, directory: dir }; }
    report.status = 'running'; await checkpoint();
    progress('Checking the exact selected model. No automatic selection or download.');
    const ids = await provider.models(opt.settings);
    if (!ids.includes(opt.settings.model)) { report.stopReason = 'selected-model-not-listed'; return { report, directory: dir }; }
    if (opt.warmup && !cancelled && !budgetExpired) {
      const start = performance.now();
      try {
        await provider.complete({ system: 'Reply briefly without a thinking section.', prompt: 'Say ready.', purpose: 'reply' });
        report.warmup = { completed: true, elapsedMs: Math.round(performance.now() - start) };
      } catch (e) {
        report.warmup = { completed: false, elapsedMs: Math.round(performance.now() - start), errorCode: errorCode(e) };
        report.stopReason = budgetExpired ? 'run-budget' : cancelled ? 'cancelled' : 'warmup-failed';
        return { report, directory: dir };
      }
      await checkpoint();
    }
    for (const sample of report.samples) {
      if (cancelled || budgetExpired) { report.stopReason = budgetExpired ? 'run-budget' : 'cancelled'; break; }
      const c = cases.find(c => c.id === sample.caseId);
      progress(`Testing ${c.id}, repeat ${sample.repeat}. Maximum ${opt.settings.timeoutMs / 60000} minutes for this request.`);
      const start = performance.now();
      try {
        const out = await provider.complete(c.request);
        if (cancelled || budgetExpired) throw new Error('Local AI request cancelled.');
        sample.elapsedMs = Math.round(performance.now() - start);
        sample.status = 'completed'; sample.completed = true;
        sample.assessment = S.assess(c, out.text);
        const text = redact(out.text);
        sample.responseHash = Report.hash(text);
        responses.push({ caseId: c.id, repeat: sample.repeat, text, responseHash: sample.responseHash });
      } catch (e) {
        sample.elapsedMs = Math.round(performance.now() - start);
        sample.status = 'error'; sample.errorCode = errorCode(e);
        report.stopReason = budgetExpired ? 'run-budget' : cancelled ? 'cancelled' : sample.errorCode;
      }
      await checkpoint();
      if (report.stopReason) break; // Never queue behind an uncertain/uncompleted request.
    }
    if (!report.stopReason) report.status = 'completed';
  } catch (e) { report.stopReason = errorCode(e); }
  finally {
    if (timer) clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    provider?.cancel();
    if (temp) await fs.rm(temp, { recursive: true, force: true });
    if (lockHandle) { await lockHandle.close(); await fs.unlink(lock).catch(() => {}); }
    if (report.status !== 'completed') report.status = 'stopped';
    report.finishedAt = new Date().toISOString();
    await checkpoint();
  }
  return { report, directory: dir };
}
module.exports = { normalize, prepare, runEvaluation, fingerprint, errorCode, redact };
