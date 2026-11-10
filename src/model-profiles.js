'use strict';
// AI settings shared by every provider. Local workload presets are NOT claims
// about a model's measured quality or VRAM needs; the Claude profile is sized for
// Claude's large context window.
const PROFILES = Object.freeze({
  compact: Object.freeze({ id: 'compact', name: 'Compact · start here for 7B-class models', contextChars: 8000, replyTokens: 160, historyTurns: 4, journalChars: 1100 }),
  balanced: Object.freeze({ id: 'balanced', name: 'Balanced · starting point for 12B-class models', contextChars: 14000, replyTokens: 240, historyTurns: 8, journalChars: 2000 }),
  expanded: Object.freeze({ id: 'expanded', name: 'Expanded · starting point for 27B-class models', contextChars: 22000, replyTokens: 320, historyTurns: 12, journalChars: 3600 })
});
const CLAUDE_PROFILE = Object.freeze({ id: 'claude', name: 'Claude API', contextChars: 200000, replyTokens: 16000, historyTurns: 30, journalChars: 16000 });
const PROVIDERS = Object.freeze(['local', 'claude']);
const CLAUDE_MODELS = Object.freeze(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);
const EFFORTS = Object.freeze(['low', 'medium', 'high']);
const DEFAULTS = Object.freeze({
  enabled: false, provider: 'local', narration: false,
  baseUrl: 'http://127.0.0.1:1234/v1', model: '', profile: 'compact', format: 'plain-json', roles: 'system-user',
  claudeModel: 'claude-opus-5-5', effort: 'low',
  timeoutMs: 600000
});
// Credentials are deliberately not a setting: the API key comes from the
// ANTHROPIC_API_KEY environment variable (or a git-ignored .env file) only.
const SETTINGS = new Set([...Object.keys(DEFAULTS), 'contextChars', 'replyTokens']);
function integer(value, min, max, name) { if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be a whole number from ${min} to ${max}.`); return value; }
// -1 is an explicit server-specific no-token-cap request, not an unlimited wait.
function replyTokenLimit(value) { return value === -1 ? -1 : integer(value, 64, 768, 'Reply token limit'); }
function profileFor(config = {}) { return config.provider === 'claude' ? CLAUDE_PROFILE : (PROFILES[config.profile] || PROFILES.compact); }
function normalize(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('AI settings must be an object.');
  for (const k of Object.keys(raw)) if (!SETTINGS.has(k)) throw new Error(`Unsupported AI setting: ${k}.`);
  const c = { ...DEFAULTS, ...raw };
  if (typeof c.enabled !== 'boolean') throw new Error('AI enabled must be true or false.');
  if (typeof c.narration !== 'boolean') throw new Error('AI narration must be true or false.');
  if (!PROVIDERS.includes(c.provider)) throw new Error('Select the local or Claude AI provider.');
  if (!Object.hasOwn(PROFILES, c.profile)) throw new Error('Select a supported workload profile.');
  if (typeof c.claudeModel !== 'string' || !/^claude-[a-z0-9-]{1,60}$/.test(c.claudeModel)) throw new Error('Use a Claude model ID such as claude-opus-5-5.');
  if (!EFFORTS.includes(c.effort)) throw new Error('Effort must be low, medium or high.');
  if (typeof c.model !== 'string' || c.model.length > 240 || /[\r\n\x00]/.test(c.model)) throw new Error('Use the exact local model identifier.');
  c.model = c.model.trim();
  if (c.enabled && c.provider === 'local' && !c.model) throw new Error('Choose a model before enabling local AI.');
  if (typeof c.baseUrl !== 'string') throw new Error('Use a local API address.');
  let u; try { u = new URL(c.baseUrl); } catch { throw new Error('Use a valid local API address.'); }
  if (!['http:', 'https:'].includes(u.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) || u.username || u.password || u.search || u.hash) throw new Error('The local provider only connects to a loopback server. Use the Claude provider for cloud AI.');
  if (!['', '/', '/v1', '/v1/'].includes(u.pathname)) throw new Error('Use the API base address ending in /v1, not a chat or model route.');
  c.baseUrl = u.origin + '/v1';
  if (!['plain-json', 'json-schema'].includes(c.format)) throw new Error('Select plain JSON or explicitly supported JSON Schema output.');
  if (!['system-user', 'single-user'].includes(c.roles)) throw new Error('Select system/user or single-user prompt roles.');
  c.timeoutMs = integer(c.timeoutMs, 3000, 600000, 'Timeout');
  const p = profileFor(c);
  if (c.provider === 'claude') {
    c.contextChars = integer(c.contextChars ?? p.contextChars, 4000, 600000, 'Context character budget');
    c.replyTokens = integer(c.replyTokens ?? p.replyTokens, 1024, 64000, 'Reply token limit');
  } else {
    c.contextChars = integer(c.contextChars ?? p.contextChars, 4000, 32000, 'Context character budget');
    c.replyTokens = replyTokenLimit(c.replyTokens === undefined ? p.replyTokens : c.replyTokens);
  }
  return c;
}
function manifest() {
  return {
    profiles: Object.values(PROFILES), providers: PROVIDERS, claudeModels: CLAUDE_MODELS, efforts: EFFORTS, defaults: { ...DEFAULTS },
    note: '7B/12B/27B are workload starting points, not compatibility certifications. Use the exact model ID reported by your local server. Context limits here are characters, not tokenizer-measured tokens. The Claude provider reads ANTHROPIC_API_KEY from the environment or a .env file beside package.json.'
  };
}
module.exports = { PROFILES, CLAUDE_PROFILE, CLAUDE_MODELS, PROVIDERS, DEFAULTS, normalize, manifest, replyTokenLimit, profileFor };
