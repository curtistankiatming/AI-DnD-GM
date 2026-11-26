'use strict';
// Hosted mode: the game run on its owner's server and AI key for other people.
// Off by default; the open-source game runs exactly as before. Turned on with
// HOSTED=1 and a HOSTED_SECRET of at least 32 characters (see docs/HOSTED.md).
//
// What it protects:
// - Saves. The browser holds the game state between turns, so the server seals
//   every state it sends with an HMAC and refuses any state whose seal no longer
//   matches. Editing XP, gold, items, level or story text breaks the seal. A
//   player can still go back to an older state of their own (retry a roll); that
//   is accepted, not prevented.
// - Paid books. Book access comes from the account pass, never from the save.
// - The owner's AI key. Visitors cannot change AI settings or the key; each
//   account has a daily AI allowance by plan, a per-minute limit, and the whole
//   server has a daily cap. Obvious attempts to use the game master as a general
//   chatbot or to override its instructions are turned away before any AI call.
const crypto = require('node:crypto');
const Book = require('./book');

const PASS_COOKIE = 'briarwatch_pass';
const PLANS = Object.freeze(['free', 'paid']);
const DAY_MS = 86400000;
// Presentation fields the browser may change between turns. Everything else is
// sealed.
const UNSEALED = new Set(['seal', 'lastNarration']);

function whole(value, fallback, min, max) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Hosted setting must be a whole number from ${min} to ${max} (got ${value}).`);
  return n;
}

function settings(env = process.env) {
  const enabled = ['1', 'true', 'yes', 'on'].includes(String(env.HOSTED || '').trim().toLowerCase());
  if (!enabled) return { enabled: false };
  const secret = String(env.HOSTED_SECRET || '');
  if (secret.length < 32) throw new Error('HOSTED=1 needs HOSTED_SECRET set to a random value of at least 32 characters.');
  let origin = null;
  if (env.HOSTED_ORIGIN) {
    let u; try { u = new URL(env.HOSTED_ORIGIN); } catch { throw new Error('HOSTED_ORIGIN must be the address players use, such as https://play.example.com.'); }
    origin = u.origin;
  }
  return {
    enabled: true, secret, origin,
    trustProxy: ['1', 'true', 'yes', 'on'].includes(String(env.HOSTED_TRUST_PROXY || '').trim().toLowerCase()),
    secureCookie: String(env.HOSTED_SECURE_COOKIE || '1') !== '0',
    // AI calls per account per day, by plan. Visitors without a pass get none.
    daily: { guest: whole(env.HOSTED_AI_DAILY_GUEST, 0, 0, 100000), free: whole(env.HOSTED_AI_DAILY_FREE, 40, 0, 100000), paid: whole(env.HOSTED_AI_DAILY_PAID, 400, 0, 100000) },
    perMinute: whole(env.HOSTED_AI_PER_MINUTE, 8, 1, 1000),
    globalDaily: whole(env.HOSTED_AI_DAILY_TOTAL, 5000, 1, 10000000),
    concurrency: whole(env.HOSTED_AI_CONCURRENCY, 4, 1, 64),
    // Output ceilings per kind of call; the owner's settings can only lower them.
    replyTokens: { plan: 4000, reply: 3000, narrate: 3000, director: whole(env.HOSTED_DIRECTOR_TOKENS, 16000, 1024, 64000), test: 1024 },
    contextChars: whole(env.HOSTED_CONTEXT_CHARS, 120000, 4000, 600000)
  };
}

// Separate keys for separate jobs, so a seal can never pass as a pass.
const subkey = (secret, label) => crypto.createHmac('sha256', secret).update(label).digest();
const mac = (key, text) => crypto.createHmac('sha256', key).update(text).digest('base64url');
function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Key order does not depend on how the state was built or parsed.
function canonical(value, top = true) {
  if (Array.isArray(value)) return '[' + value.map(v => canonical(v === undefined ? null : v, false)).join(',') + ']';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter(k => value[k] !== undefined && !(top && UNSEALED.has(k))).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(value[k], false)).join(',') + '}';
  }
  return JSON.stringify(value);
}

// Sealed as JSON sees it, so whatever survives the trip to the browser and back matches.
function sealOf(state, secret) { return 'v1.' + mac(subkey(secret, 'save-seal'), canonical(JSON.parse(JSON.stringify(state)))); }
function seal(state, secret) {
  if (state && typeof state === 'object' && !Array.isArray(state)) state.seal = sealOf(state, secret);
  return state;
}
function verify(state, secret) {
  return Boolean(state && typeof state === 'object' && !Array.isArray(state) && typeof state.seal === 'string' && same(state.seal, sealOf(state, secret)));
}
const TAMPERED = 'This save was changed outside the game, so this server cannot continue it. Load one of your saves here or start a new hero. Your other saves are not affected.';

// Account passes: signed tokens the owner issues (scripts/hosted-pass.js) until
// a real sign-in and payment system exists. A pass names an account and plan.
const VALID_ID = /^[A-Za-z0-9_.@-]{1,80}$/;
function issuePass({ id, plan = 'free', days = 30, now = Date.now() }, secret) {
  if (!VALID_ID.test(String(id || ''))) throw new Error('An account id uses 1-80 letters, numbers, dots, dashes, underscores or @.');
  if (!PLANS.includes(plan)) throw new Error('A plan is free or paid.');
  if (!Number.isFinite(days) || days <= 0 || days > 3660) throw new Error('A pass lasts 1 to 3660 days.');
  const body = Buffer.from(JSON.stringify({ id, plan, exp: Math.floor(now + days * DAY_MS) })).toString('base64url');
  return `p1.${body}.${mac(subkey(secret, 'account-pass'), body)}`;
}
function readPass(token, secret, now = Date.now()) {
  const m = /^p1\.([A-Za-z0-9_-]{1,600})\.([A-Za-z0-9_-]{43})$/.exec(String(token || ''));
  if (!m || !same(m[2], mac(subkey(secret, 'account-pass'), m[1]))) return null;
  let p; try { p = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')); } catch { return null; }
  if (!p || !VALID_ID.test(String(p.id)) || !PLANS.includes(p.plan) || !Number.isFinite(p.exp) || p.exp <= now) return null;
  return { id: p.id, plan: p.plan, exp: p.exp };
}

function cookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
function clientIp(req, h) {
  if (h.trustProxy) {
    const first = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (first) return first;
  }
  return String(req.socket?.remoteAddress || 'unknown');
}
// Who is asking: a pass holder, or a visitor known only by address.
function account(req, h, now = Date.now()) {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : cookie(req, PASS_COOKIE);
  const pass = token ? readPass(token, h.secret, now) : null;
  if (pass) return { id: 'acct:' + pass.id, plan: pass.plan, guest: false, exp: pass.exp };
  const ip = crypto.createHash('sha256').update(h.secret + '|' + clientIp(req, h)).digest('hex').slice(0, 24);
  return { id: 'guest:' + ip, plan: 'guest', guest: true };
}
function passCookie(token, exp, h, now = Date.now()) {
  const age = Math.max(0, Math.floor((exp - now) / 1000));
  return `${PASS_COOKIE}=${token}; Path=/; Max-Age=${age}; HttpOnly; SameSite=Lax${h.secureCookie ? '; Secure' : ''}`;
}
// Paid books: a paid pass reads every book, everyone else the free ones.
const bookAccess = acct => acct.plan === 'paid' ? Infinity : Book.FREE_BOOKS;
// Server saves are kept per account in their own folder; visitors save in the browser.
const saveFolder = acct => acct.guest ? null : crypto.createHash('sha256').update(acct.id).digest('hex').slice(0, 32);

// Text that tries to turn the game master into something else. Kept narrow on
// purpose: in-world talk of spells, orders and secrets must still pass.
const ABUSE = [
  /\b(ignore|disregard|forget|override)\b[^.!?\n]{0,40}\b(previous|prior|above|earlier|all|your|system|these)\b[^.!?\n]{0,20}\b(instructions?|prompts?)\b/i,
  /\b(system|developer|hidden|initial)\s+(prompt|message|instructions?)\b/i,
  /\b(jailbreak|DAN mode|developer mode|god mode prompt|prompt injection)\b/i,
  /\byou are (now )?(no longer|not) (a |the )?(game ?master|gm|narrator|guide)\b/i,
  /\b(pretend (to be|you are)|act (as|like)|behave (as|like))\s+(an? |the )?(ai|assistant|chatbot|language model|llm|chatgpt|claude)\b/i,
  /```|<\/?(system|instructions?|assistant|user)>/i,
  /\b(write|generate|give me|show me|debug|fix)\b[^.!?\n]{0,30}\b(code|script|function|program|sql|regex|essay|homework|assignment|resume|cover letter|email)\b/i,
  /\b(python|javascript|typescript|java|c\+\+|html|css|bash|powershell)\b[^.!?\n]{0,30}\b(code|script|function|program)\b/i
];
const OFF_TOPIC = 'The game master only plays this game. Describe what your hero does, says or asks in the story.';
const screen = text => typeof text === 'string' && ABUSE.some(re => re.test(text)) ? OFF_TOPIC : null;

// Counts AI calls per account, per minute and per day, plus a server total.
// Kept in memory: a restart clears the counts, which only ever favours players.
function createUsage(h, now = Date.now) {
  const accounts = new Map();
  let total = { day: 0, calls: 0 };
  const today = () => Math.floor(now() / DAY_MS);
  function entry(id) {
    let e = accounts.get(id);
    if (!e || e.day !== today()) { e = { day: today(), calls: 0, recent: [] }; accounts.set(id, e); }
    if (accounts.size > 50000) for (const [k, v] of accounts) if (v.day !== today()) accounts.delete(k);
    return e;
  }
  const allowance = acct => h.daily[acct.plan] ?? 0;
  function check(acct) {
    const limit = allowance(acct);
    if (limit <= 0) return acct.guest
      ? 'The AI game master needs an account on this server. The written books play in full without it.'
      : 'The AI game master is not included in this account. The written books play in full without it.';
    const e = entry(acct.id);
    if (total.day !== today()) total = { day: today(), calls: 0 };
    if (e.calls >= limit) return `You have used today's ${limit} AI game master turns. They refresh tomorrow; the written choices still work.`;
    if (total.calls >= h.globalDaily) return 'The AI game master has reached its limit for today on this server. The written choices still work.';
    e.recent = e.recent.filter(t => now() - t < 60000);
    if (e.recent.length >= h.perMinute) return 'The AI game master needs a short breather. Wait a minute and try again.';
    return null;
  }
  function take(acct) { const e = entry(acct.id); e.calls += 1; e.recent.push(now()); total.calls += 1; }
  function report(acct) { const limit = allowance(acct), used = limit > 0 ? entry(acct.id).calls : 0; return { limit, used, left: Math.max(0, limit - used) }; }
  return { check, take, report, allowance };
}

// The AI service as one account sees it: the same calls, bounded by its
// allowance, its own in-flight slot and the hosted output ceilings.
// A hosted game plays on its owner's Claude key; the OpenAI provider is for
// players who run the game themselves with their own key.
const HOSTED_OPENAI = 'This hosted game runs its AI game master on Claude. The OpenAI provider is for the open-source game on your own computer.';
async function hostedReady(ai) { return (await ai.config()).provider !== 'openai'; }

function provider(ai, acct, usage, h) {
  return {
    // Tells the chat to keep free journal answers off the daily AI allowance.
    hosted: true,
    config: () => ai.config(),
    status: () => ai.status(acct.id),
    screen,
    // Narration is optional: it quietly stops when the allowance is spent.
    async narrationEnabled() { return usage.check(acct) === null && await hostedReady(ai) && ai.narrationEnabled(); },
    async complete(request) {
      if (!await hostedReady(ai)) throw new Error(HOSTED_OPENAI);
      const blocked = usage.check(acct);
      if (blocked) throw new Error(blocked);
      usage.take(acct);
      const purpose = request?.purpose || 'reply';
      return ai.complete({ ...request, owner: acct.id, maxReplyTokens: h.replyTokens[purpose] || h.replyTokens.reply, maxContextChars: h.contextChars });
    }
  };
}

module.exports = { HOSTED_OPENAI, PASS_COOKIE, PLANS, settings, canonical, seal, verify, sealOf, TAMPERED, issuePass, readPass, account, passCookie, bookAccess, saveFolder, screen, OFF_TOPIC, createUsage, provider, clientIp };
