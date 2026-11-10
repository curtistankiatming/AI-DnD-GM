'use strict';
// Server-side only. Claude API provider for the shared AI service in local-ai.js.
// The rules engine stays authoritative: Claude only ever returns text or a JSON
// proposal that the game validates before anything changes.
const STRUCTURED_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

function loadSdk() {
  try { return require('@anthropic-ai/sdk'); }
  catch { throw new Error('The Claude provider needs its SDK. Run "npm install" beside package.json, then restart the game.'); }
}

function apiKey(env = process.env) {
  const key = typeof env.ANTHROPIC_API_KEY === 'string' ? env.ANTHROPIC_API_KEY.trim() : '';
  return key || null;
}

function createClaudeProvider({ clientFactory = null, env = process.env } = {}) {
  let cached = null;
  function client() {
    if (clientFactory) return clientFactory();
    const key = apiKey(env);
    if (!key) throw new Error('Set ANTHROPIC_API_KEY (environment variable or .env file beside package.json) to use the Claude provider.');
    if (!cached || cached.key !== key) {
      const SDK = loadSdk();
      const Anthropic = SDK.default || SDK.Anthropic || SDK;
      cached = { key, instance: new Anthropic({ apiKey: key, maxRetries: 1 }) };
    }
    return cached.instance;
  }

  async function complete(config, { system, prompt, schema = null, purpose = 'reply' }, signal) {
    const api = client(); // Checks the key before needing the SDK.
    const SDK = clientFactory ? null : loadSdk();
    const body = {
      model: config.claudeModel,
      max_tokens: config.replyTokens,
      // The system prompt is stable per purpose, so it is cached across turns.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt }],
      // Writing a whole adventure is rare and creative, so it gets at least medium effort.
      output_config: { effort: purpose === 'director' && config.effort === 'low' ? 'medium' : config.effort, ...(schema ? { format: { type: 'json_schema', schema } } : {}) },
      betas: [STRUCTURED_FALLBACK_BETA],
      fallbacks: 'default'
    };
    const started = Date.now();
    let response;
    try {
      response = await api.beta.messages.create(body, { signal, timeout: config.timeoutMs });
    } catch (error) {
      throw new Error(describeError(error, SDK, signal));
    }
    if (response.stop_reason === 'refusal') throw new Error('Claude declined this turn. Nothing was applied; try rephrasing.');
    if (response.stop_reason === 'max_tokens') throw new Error('Claude reached its output limit before finishing. Nothing was applied.');
    const text = (response.content || []).filter(block => block.type === 'text').map(block => block.text).join('').trim();
    if (!text) throw new Error('Claude did not return a text answer. Nothing was applied.');
    return { text, model: response.model || config.claudeModel, elapsedMs: Date.now() - started, usage: response.usage || null, purpose };
  }

  return { complete, configured: () => Boolean(clientFactory || apiKey(env)) };
}

function describeError(error, SDK, signal) {
  if (signal?.aborted) return 'aborted';
  const is = name => SDK && SDK[name] && error instanceof SDK[name];
  if (is('APIConnectionTimeoutError')) return 'Claude did not answer within the configured wait limit. Nothing was applied.';
  if (is('AuthenticationError')) return 'Claude rejected the API key. Check ANTHROPIC_API_KEY. Nothing was applied.';
  if (is('PermissionDeniedError')) return 'This API key cannot use the selected Claude model. Nothing was applied.';
  if (is('NotFoundError')) return 'The selected Claude model was not found. Check the model ID. Nothing was applied.';
  if (is('RateLimitError')) return 'Claude is rate limiting this key. Wait a moment and try again. Nothing was applied.';
  if (is('BadRequestError')) return `Claude rejected the request: ${String(error.message || '').slice(0, 300)}`;
  if (is('APIConnectionError')) return 'Could not reach the Claude API. Check your internet connection. Nothing was applied.';
  if (is('APIError')) return `Claude API error ${error.status || ''}. Nothing was applied.`.replace('  ', ' ');
  return String(error?.message || 'Claude request failed. Nothing was applied.');
}

module.exports = { createClaudeProvider, apiKey, STRUCTURED_FALLBACK_BETA };
