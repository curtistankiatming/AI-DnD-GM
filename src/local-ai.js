'use strict';
// Server-side only. Never included in the browser download.
// One AI service for every caller (chat proposals, chat replies and narration).
// It owns the saved settings, a single in-flight request and cancellation, and
// dispatches to either a loopback OpenAI-compatible server or the Claude API.
const fs = require('node:fs/promises');
const path = require('node:path');
const Profiles = require('./model-profiles');
const { localResponse } = require('./local-http');
const { createClaudeProvider } = require('./claude-ai');
const MAX_REPLY_CHARS = 131072;

function createLocalAI({ configPath = path.join(__dirname, '../.local-ai.json'), fetchImpl = localResponse, claude = null } = {}) {
  const claudeProvider = claude || createClaudeProvider();
  let active = null;

  async function config() {
    try { return Profiles.normalize(JSON.parse(await fs.readFile(configPath, 'utf8'))); }
    catch (e) {
      // A fresh install suggests Claude; nothing runs until the player enables it.
      if (e.code === 'ENOENT') return Profiles.normalize({ provider: 'claude' });
      throw new Error('AI settings could not be read. Save new settings or restore the settings file.');
    }
  }

  async function save(raw) {
    if (active) throw new Error('Wait for or cancel the active AI request before changing models.');
    const c = Profiles.normalize(raw);
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    const temp = configPath + '.tmp';
    try { await fs.writeFile(temp, JSON.stringify(c, null, 2) + '\n'); await fs.rename(temp, configPath); }
    finally { await fs.unlink(temp).catch(() => {}); }
    return c;
  }

  function cancel() { if (!active) return false; active.cancelled = true; active.controller.abort(); return true; }

  // Runs one request at a time; a slow model never stacks work.
  async function exclusive(timeout, run) {
    if (active) throw new Error('The AI is busy. Wait for its current reply instead of starting another request.');
    const ticket = { controller: new AbortController(), cancelled: false };
    active = ticket;
    const timer = setTimeout(() => ticket.controller.abort(), timeout);
    try { return await run(ticket.controller.signal); }
    catch (e) {
      if (ticket.controller.signal.aborted) throw new Error(ticket.cancelled ? 'AI request cancelled. Nothing was applied.' : 'The AI reached its configured wait limit. Nothing was applied.');
      throw e;
    } finally { clearTimeout(timer); if (active === ticket) active = null; }
  }

  async function localJson(c, suffix, body, signal) {
    let res;
    try {
      res = await fetchImpl(c.baseUrl + suffix, {
        method: body ? 'POST' : 'GET', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/json', ...(process.env.LOCAL_AI_TOKEN ? { Authorization: `Bearer ${process.env.LOCAL_AI_TOKEN}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch (e) {
      if (signal.aborted) throw e;
      if (String(e.message).startsWith('Local ')) throw e;
      throw new Error('Could not complete the local model connection. Check that your compatible local server is running.');
    }
    if (!res.ok) throw new Error(`Local model returned HTTP ${res.status}. Check the selected model and output format; no retry was made.`);
    const raw = await res.text();
    if (signal.aborted) throw new Error('aborted');
    if (raw.length > MAX_REPLY_CHARS) throw new Error('Local model reply exceeded the size limit.');
    try { return JSON.parse(raw); } catch { throw new Error('Local server returned invalid JSON. No game action was applied.'); }
  }

  async function models(raw) {
    const c = Profiles.normalize(raw || await config());
    if (c.provider === 'claude') return [...Profiles.CLAUDE_MODELS];
    const out = await exclusive(10000, signal => localJson(c, '/models', null, signal));
    if (!Array.isArray(out.data)) throw new Error('Local model list was not in the expected format.');
    return out.data.filter(x => typeof x?.id === 'string').slice(0, 100).map(x => x.id.slice(0, 240));
  }

  async function completeLocal(c, { system, prompt, schema, purpose }, signal) {
    const body = {
      model: c.model, stream: false, temperature: purpose === 'plan' ? 0.1 : 0.5, max_tokens: c.replyTokens,
      messages: c.roles === 'single-user' ? [{ role: 'user', content: system + '\n\n' + prompt }] : [{ role: 'system', content: system }, { role: 'user', content: prompt }]
    };
    if (schema && c.format === 'json-schema') body.response_format = { type: 'json_schema', json_schema: { name: 'game_proposal', strict: true, schema } };
    const started = Date.now();
    const out = await localJson(c, '/chat/completions', body, signal);
    const choice = out.choices?.[0], text = choice?.message?.content;
    if (choice?.finish_reason === 'length') throw new Error('The model reached its output limit before finishing. Increase the reply limit or choose a different profile; no automatic retry was made.');
    if (typeof text !== 'string' || !text.trim()) throw new Error('The model did not return a finished text answer. Reasoning-only output is not treated as a reply.');
    return { text: text.trim(), model: c.model, elapsedMs: Date.now() - started };
  }

  async function complete(request) {
    const c = await config();
    if (!c.enabled) throw new Error('AI is off. Enable a provider in AI settings to use it.');
    const { system, prompt } = request;
    if (typeof system !== 'string' || typeof prompt !== 'string' || system.length + prompt.length > c.contextChars) throw new Error('The turn exceeds the selected context budget. No facts were silently truncated; choose a larger budget or shorten the instructions.');
    return exclusive(c.timeoutMs, signal => c.provider === 'claude'
      ? claudeProvider.complete(c, request, signal)
      : completeLocal(c, request, signal));
  }

  // Narration is optional presentation; it runs only when the player enabled it.
  async function narrationEnabled() {
    try { const c = await config(); return c.enabled && c.narration && (c.provider !== 'claude' || claudeProvider.configured()); }
    catch { return false; }
  }

  function status() { return { busy: Boolean(active), claudeKeyConfigured: claudeProvider.configured() }; }

  return { config, save, models, complete, cancel, narrationEnabled, status, manifest: Profiles.manifest };
}
module.exports = { createLocalAI };
