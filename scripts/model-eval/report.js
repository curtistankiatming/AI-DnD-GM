'use strict';
const crypto = require('node:crypto');
const { RUBRIC } = require('./suite');
const stable = x => Array.isArray(x) ? x.map(stable) : x && typeof x === 'object'
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])])) : x;
const hash = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(stable(x))).digest('hex');
const safe = x => String(x).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').replace(/[|<>`\r\n]/g, ' ');
function summary(report) {
  const rows = report.samples;
  const attempted = rows.filter(x => x.status !== 'not-run');
  const times = attempted.filter(x => x.completed).map(x => x.elapsedMs).sort((a, b) => a - b);
  const at = q => times.length ? times[Math.max(0, Math.ceil(q * times.length) - 1)] : null;
  return { planned: rows.length, attempted: attempted.length, completed: times.length,
    notRun: rows.length - attempted.length, transportFailures: attempted.filter(x => !x.completed).length,
    taskPass: rows.filter(x => x.assessment?.status === 'pass').length,
    taskFail: rows.filter(x => x.assessment?.status === 'fail').length,
    proseReviewNeeded: rows.filter(x => x.assessment?.status === 'review-needed').length,
    medianReplyMs: at(0.5), p95ReplyMs: at(0.95),
    firstMeasuredReplyMs: attempted[0]?.completed ? attempted[0].elapsedMs : null,
    storytelling: 'UNREVIEWED', stability: 'Initial bounded sample; not long-session certification.' };
}
function markdown(r) {
  const s = summary(r);
  const lines = ['# Briarwatch shared model evaluation', '',
    `Mode: **${r.mode === 'mock' ? 'SIMULATED REPLIES — NOT A MODEL RESULT' : r.mode === 'dry-run' ? 'PLAN ONLY — NO MODEL REQUESTS' : 'LOCAL MODEL RUN'}**`,
    `Run: ${r.runId}`, `Suite: ${r.suite.version}`, `Model: ${safe(r.model)}`,
    `Profile: ${r.settings.profile}; ${r.settings.contextChars} characters / ${r.settings.replyTokens} reply tokens.`,
    `Status: ${r.status}; stop reason: ${r.stopReason || 'none'}.`, '',
    `Completed ${s.completed} / ${s.planned} planned samples; ${s.attempted} attempted; ${s.notRun} not run.`,
    `Automated task checks: ${s.taskPass} passed, ${s.taskFail} failed; ${s.proseReviewNeeded} prose samples require review.`,
    'These are narrow intent/exact-answer checks, not a score for intelligence or enjoyment.',
    '**Story quality: unreviewed. No AI judge, star rating or automatic winner is generated.**', '',
    `Completed-reply latency: median ${s.medianReplyMs ?? 'n/a'} ms; p95 ${s.p95ReplyMs ?? 'n/a'} ms.`,
    'Latency is whole-request wall time, not tokens/second or time to first token. Loading may be included.',
    'First request is not called a cold start: the evaluator never unloads a model. Warm-up is separate and excluded.',
    r.mode === 'live' ? 'Timings need comparable hardware, quantization, runtime and loading conditions.' : 'Simulated timings say nothing about model speed.', '',
    '| Case / repeat | Reply completed | Task check | Milliseconds |', '|---|---|---|---:|'];
  for (const x of r.samples) lines.push(`| ${x.caseId} / ${x.repeat} | ${x.status === 'not-run' ? 'not run' : x.completed ? 'yes' : 'no'} | ${x.assessment?.status || x.errorCode || 'not assessed'} | ${x.elapsedMs ?? '—'} |`);
  lines.push('', '## Story review', 'Use review.json with responses.json and the reference facts in that file.',
    'Rate each dimension 1 (poor), 3 (mixed), 5 (strong), or leave null when not assessed.',
    ...Object.entries(RUBRIC).map(([k, v]) => `- ${k}: ${v}`), '',
    'Reports are local only. Review generated prose before sharing; no report is submitted automatically.',
    'Cases use synthetic controlled states, not personal saves or natural playthroughs.',
    'Direct model probes deliberately bypass some zero-cost in-game shortcuts; they measure that model task, not the full UI.',
    'Failed network requests stop the batch. Remaining cases are not counted as passed.', '',
    `Game fingerprint: ${r.sourceFingerprint}`, `Suite fingerprint: ${r.suite.fingerprint}`,
    `Request-set fingerprint: ${r.requestSetHash}`, '');
  return lines.join('\n');
}
function reviewTemplate(r, cases) {
  return { schema: 1, runId: r.runId, mode: r.mode, suiteFingerprint: r.suite.fingerprint,
    reviewer: '', rubric: RUBRIC, ratings: r.samples.filter(x => x.completed).map(x => ({
      caseId: x.caseId, repeat: x.repeat, responseHash: x.responseHash,
      reference: cases.find(c => c.id === x.caseId).reference,
      scores: Object.fromEntries(Object.keys(RUBRIC).map(k => [k, null])), notes: ''
    })) };
}
function compare(reports) {
  if (!Array.isArray(reports) || reports.length < 2 || reports.length > 10) throw new Error('Compare two to ten reports.');
  for (const r of reports) if (r.schema !== 1 || !['mock','live','dry-run'].includes(r.mode) || !Array.isArray(r.samples) || !r.suite?.fingerprint || !r.comparisonKey) throw new Error('Unsupported evaluation report.');
  const reasons = [];
  if (reports.some(r => r.mode !== 'live')) reasons.push('Not all reports are live model runs. Simulated/planned runs cannot rank models.');
  if (reports.some(r => r.comparisonKey !== reports[0].comparisonKey)) reasons.push('Workload, suite, source or repeat/warm-up settings differ.');
  if (reports.some(r => r.status !== 'completed' || r.samples.some(s => s.status === 'not-run'))) reasons.push('At least one run is incomplete.');
  const environment = reports[0].environment;
  const speedEligible = reasons.length === 0 && environment.hardware && environment.runtime && environment.quantization &&
    reports.every(r => JSON.stringify(stable(r.environment)) === JSON.stringify(stable(environment)));
  return { comparableTasks: reasons.length === 0, reasons, timingConditionsMatch: Boolean(speedEligible),
    timingNote: 'Environment labels are user-reported, not verified. Loading and server settings can still differ.',
    winner: null, storytelling: 'Manual review required; no automatic overall ranking.',
    rows: reports.map(r => ({ model: r.model, runId: r.runId, mode: r.mode, profile: r.settings.profile, ...summary(r) })) };
}
module.exports = { hash, stable, safe, summary, markdown, reviewTemplate, compare };
