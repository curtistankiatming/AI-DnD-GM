'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { prepare, runEvaluation } = require('./run');
const { compare, safe } = require('./report');
const HELP = `Briarwatch shared model evaluation (Node 22+)
No arguments: plan only. No model request or game save changes.
  --mock                 simulated replies only; never model-performance evidence
  --live --yes           explicit permission to call one selected local model
  --model ID             exact installed model ID (no automatic selection)
  --profile NAME         compact (default), balanced, expanded; independent of size
  --quick | --full       3 initial prompts (default) or all 13 cases
  --repeat N             1 to 3 passes; no hidden retries
  --warmup               one separate unscored warm-up request
  --minutes N            total budget, default 30, maximum 180 minutes
  --config FILE          optional evaluation JSON, NOT a game save/settings file
  --interactive          guided quick test; asks permission before generation
  --compare A.json B.json compare report.json files without model calls
  --help
Each live request has the configured wait (default 10 minutes). Connection failure
stops the batch. Results stay in evaluation-results, never uploaded automatically.
Use the same workload for comparisons; actual quality still requires reading replies.`;
function parse(args) {
  const raw = {}, seen = new Set(); let configFile, yes = false, interactive = false;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (seen.has(key)) throw new Error('Duplicate command option.');
    seen.add(key);
    if (key === '--help') return { help: true };
    if (key === '--compare') {
      if (i !== 0 || args.length < 3 || args.length > 11) throw new Error('Use --compare followed by two to ten report.json paths.');
      return { compareFiles: args.slice(1) };
    }
    if (key === '--mock' || key === '--live') {
      if (raw.mode) throw new Error('Select only one mode.');
      raw.mode = key.slice(2);
    } else if (key === '--yes') yes = true;
    else if (key === '--interactive') interactive = true;
    else if (key === '--warmup') raw.warmup = true;
    else if (key === '--full' || key === '--quick') {
      if (raw.selection) throw new Error('Select quick or full, not both.'); raw.selection = key.slice(2);
    } else if (['--model','--profile','--repeat','--minutes','--config'].includes(key)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error('Missing command option value.');
      if (key === '--config') configFile = value;
      else if (key === '--repeat' || key === '--minutes') {
        if (!/^\d+$/.test(value)) throw new Error('Repeat/minutes must be whole numbers.');
        raw[key === '--repeat' ? 'repeats' : 'maxMinutes'] = Number(value);
      } else raw[key.slice(2)] = value;
    } else throw new Error('Unknown command option; use --help.');
  }
  if (interactive && args.length !== 1) throw new Error('Use --interactive by itself.');
  return { raw, configFile, yes, interactive };
}
async function readJson(file, limit) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > limit) throw new Error('Input file is too large or is not a regular file.');
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
function describe(plan) {
  console.log(`Model: ${safe(plan.opt.settings.model)} | profile: ${plan.opt.settings.profile}`);
  console.log(`${plan.planned} measured requests${plan.opt.warmup ? ' + 1 warm-up' : ''}; at most ${plan.worstCaseMinutes} minutes in this run.`);
  console.log('Only synthetic game situations. No cloud fallback, model downloads, game saves or game-settings changes.');
}
async function main(args = process.argv.slice(2)) {
  const parsed = parse(args);
  if (parsed.help) { console.log(HELP); return 0; }
  if (parsed.compareFiles) {
    console.log(JSON.stringify(compare(await Promise.all(parsed.compareFiles.map(f => readJson(f, 2000000)))), null, 2)); return 0;
  }
  let raw = parsed.configFile ? await readJson(parsed.configFile, 16000) : {};
  // A file cannot authorize paid/local inference or silently turn a dry run live.
  if (Object.hasOwn(raw, 'mode')) throw new Error('Set mode on the command line, not in the configuration file.');
  raw = { ...raw, ...parsed.raw };
  if (parsed.interactive) {
    if (!stdin.isTTY || process.env.CI || process.env.GITHUB_ACTIONS) throw new Error('Interactive testing requires a local terminal.');
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      console.log('Leave Bionic running. Finish any other generation/game session first.');
      const model = (await rl.question('Paste the exact installed model ID: ')).trim();
      const profile = (await rl.question('Profile [compact / balanced / expanded] (Enter = compact): ')).trim() || 'compact';
      raw = { model, profile, mode: 'live', selection: 'quick' };
      describe(await prepare(raw));
      const confirmed = (await rl.question('Type START to run these three local prompts, or Enter to cancel: ')).trim();
      if (confirmed !== 'START') { console.log('Cancelled. No requests sent.'); return 0; }
    } finally { rl.close(); }
  } else if (raw.mode === 'live' && !parsed.yes) throw new Error('Live testing needs --live --yes and an exact --model ID. No request was sent.');
  const plan = await prepare(raw); describe(plan);
  const controller = new AbortController();
  const cancel = () => { console.log('\nStopping and preserving the partial report...'); controller.abort(); };
  process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
  const heartbeat = raw.mode === 'live' ? setInterval(() => console.log('Still waiting/running; each request remains bounded. Ctrl+C stops.'), 15000) : null;
  try {
    const out = await runEvaluation(raw, { signal: controller.signal, progress: line => console.log(line) });
    console.log(`Status: ${out.report.status}. Report folder: ${out.directory}`);
    console.log(JSON.stringify(out.report.summary, null, 2));
    console.log('Read SUMMARY.md and responses.json. Story quality remains unreviewed; no model winner is claimed.');
    return out.report.status === 'stopped' ? 2 : out.report.summary.taskFail ? 1 : 0;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
  }
}
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(() => {
  // Command/config errors can contain private input. Do not echo them into logs.
  console.error('Evaluation could not start or save its results. Use --help; check the local model ID, configuration, permissions and live consent. No automatic retry.');
  process.exitCode = 2;
});
module.exports = { parse, main, readJson };
