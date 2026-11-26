'use strict';
// Server-side only. OpenAI API provider for the shared AI service in local-ai.js.
// It plays the same part as the Claude provider: it returns text or a JSON
// proposal that the game validates before anything changes. It needs no extra
// package: it calls the OpenAI Chat Completions API with Node's built-in fetch.
const { GAME_ONLY, writeKey } = require('./claude-ai');
const API = 'https://api.openai.com/v1';
const MAX_REPLY_CHARS = 1048576;

// GAME_OPENAI_API_KEY is a second name for the same key, like GAME_ANTHROPIC_API_KEY.
function apiKey(env = process.env) {
  for (const name of ['OPENAI_API_KEY', 'GAME_OPENAI_API_KEY']) {
    const key = typeof env[name] === 'string' ? env[name].trim() : '';
    if (key) return key;
  }
  return null;
}

// OpenAI keys start with sk- (project keys with sk-proj-). A Claude key is refused
// here so a key pasted into the wrong box is caught.
function validKey(key) {
  return typeof key === 'string' && /^sk-[A-Za-z0-9_-]{16,400}$/.test(key) && !key.startsWith('sk-ant-');
}

// OpenAI's strict structured output needs every object to list all its
// properties as required and to forbid extra ones. The game's schemas are
// written that way; any schema that is not is sent as a best-effort format.
function strictReady(schema) {
  if (!schema || typeof schema !== 'object') return true;
  if (Array.isArray(schema)) return schema.every(strictReady);
  if (schema.type === 'object' || schema.properties) {
    const keys = Object.keys(schema.properties || {});
    if (schema.additionalProperties !== false) return false;
    if (!Array.isArray(schema.required) || keys.some(k => !schema.required.includes(k))) return false;
  }
  return Object.values(schema).every(v => typeof v !== 'object' || strictReady(v));
}

// OPENAI_BASE_URL (set by whoever runs the server, never by a player) points the
// provider at another address with the same API, such as a test stand-in.
function baseUrl(env = process.env) {
  const raw = typeof env.OPENAI_BASE_URL === 'string' ? env.OPENAI_BASE_URL.trim() : '';
  if (!raw) return API;
  let u; try { u = new URL(raw); } catch { throw new Error('OPENAI_BASE_URL must be a full address such as https://api.openai.com/v1.'); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new Error('OPENAI_BASE_URL must be a plain http or https address.');
  return u.origin + u.pathname.replace(/\/+$/, '');
}

function createOpenAIProvider({ fetchImpl = null, env = process.env } = {}) {
  const send = fetchImpl || ((url, init) => fetch(url, init));

  async function call(route, body, signal) {
    const key = apiKey(env);
    if (!key) throw new Error('Set OPENAI_API_KEY (environment variable or .env file beside package.json) to use the OpenAI provider.');
    const url = baseUrl(env) + route;
    let res;
    try {
      res = await send(url, {
        method: body ? 'POST' : 'GET', redirect: 'error', signal,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error('Could not reach the OpenAI API. Check your internet connection. Nothing was applied.');
    }
    const raw = await res.text();
    if (signal?.aborted) throw new Error('aborted');
    if (raw.length > MAX_REPLY_CHARS) throw new Error('The OpenAI reply exceeded the size limit. Nothing was applied.');
    if (!res.ok) throw new Error(describeStatus(res.status, raw));
    try { return JSON.parse(raw); } catch { throw new Error('OpenAI returned a reply that was not valid JSON. Nothing was applied.'); }
  }

  async function complete(config, { system, prompt, schema = null, purpose = 'reply' }, signal) {
    const body = {
      model: config.openaiModel,
      // Reasoning models count their thinking in this limit too.
      max_completion_tokens: config.replyTokens,
      // Writing a whole adventure is rare and creative, so it gets at least medium effort.
      reasoning_effort: purpose === 'director' && config.effort === 'low' ? 'medium' : config.effort,
      messages: [{ role: 'system', content: system + '\n\n' + GAME_ONLY }, { role: 'user', content: prompt }]
    };
    if (schema) body.response_format = { type: 'json_schema', json_schema: { name: 'game_reply', strict: strictReady(schema), schema } };
    const started = Date.now();
    const out = await call('/chat/completions', body, signal);
    const choice = out?.choices?.[0], message = choice?.message || {};
    if (message.refusal) throw new Error('OpenAI declined this turn. Nothing was applied; try rephrasing.');
    if (choice?.finish_reason === 'length') throw new Error('OpenAI reached its output limit before finishing. Nothing was applied.');
    if (choice?.finish_reason === 'content_filter') throw new Error('OpenAI filtered this turn. Nothing was applied; try rephrasing.');
    const text = typeof message.content === 'string' ? message.content.trim() : '';
    if (!text) throw new Error('OpenAI did not return a text answer. Nothing was applied.');
    return { text, model: out.model || config.openaiModel, elapsedMs: Date.now() - started, usage: out.usage || null, purpose };
  }

  // The text models this key can use, for the model box in AI settings.
  async function models(signal) {
    const out = await call('/models', null, signal);
    if (!Array.isArray(out?.data)) throw new Error('The OpenAI model list was not in the expected format.');
    return out.data.map(x => x?.id).filter(id => typeof id === 'string' && /^(gpt-|o\d|chatgpt-)/.test(id) && !/(audio|realtime|transcribe|tts|image|search|embedding)/.test(id)).sort().slice(0, 100);
  }

  return { complete, models, configured: () => Boolean(apiKey(env)) };
}

function describeStatus(status, raw) {
  let detail = '';
  try { detail = String(JSON.parse(raw)?.error?.message || ''); } catch {}
  if (status === 401) return 'OpenAI did not accept this API key. Check that you copied the whole key. Nothing was applied.';
  if (status === 403) return 'This OpenAI key cannot use the selected model. Nothing was applied.';
  if (status === 404) return 'The selected OpenAI model was not found. Check the model ID. Nothing was applied.';
  if (status === 429) return 'OpenAI is rate limiting this key, or its credit has run out. Wait a moment, check your OpenAI billing, and try again. Nothing was applied.';
  if (status === 400) return `OpenAI rejected the request: ${detail.slice(0, 300)}`;
  return `OpenAI API error ${status}. Nothing was applied.`;
}

async function saveKey(file, raw) {
  const key = typeof raw === 'string' ? raw.trim() : '';
  if (!validKey(key)) throw new Error('That does not look like an OpenAI API key. A key starts with sk- (often sk-proj-) and has no spaces. Copy the whole key and try again.');
  return writeKey(file, 'OPENAI_API_KEY', key);
}

module.exports = { createOpenAIProvider, apiKey, validKey, saveKey, strictReady, baseUrl, API };
