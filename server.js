"use strict";

const http = require("http");
const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const { URL } = require("url");
const {
  createNewGame,
  normalizeIncomingState,
  resolveAction,
  buildView,
  setupCatalog,
  currentNode
} = require("./src/engine");
const { narrate, savedNarration } = require("./src/narrator");
const Book = require("./src/book");
// Optional git-ignored .env beside package.json (for ANTHROPIC_API_KEY).
const ENV_FILE = path.resolve(process.env.ENV_FILE_PATH || path.join(__dirname, ".env"));
try { process.loadEnvFile(ENV_FILE); } catch {}

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "public");
const SAVE_DIR = path.resolve(process.env.SAVE_DIR || path.join(__dirname, "saves"));
const { sanitizeSaveName, validSaveName } = require("./src/save-slots");
const VERSION = require("./package.json").version;
const {createLocalAI}=require('./src/local-ai');
const {saveKey}=require('./src/claude-ai');
const {createCoordinator}=require('./src/chat-coordinator');
const Hosted=require('./src/hosted');
// Hosted mode (docs/HOSTED.md) is off unless HOSTED=1; it refuses to start half-configured.
let hosted;
try { hosted = Hosted.settings(); } catch (error) { console.error(error.message); process.exit(1); }
const localAI=createLocalAI({configPath:process.env.AI_CONFIG_PATH || path.join(__dirname,'.local-ai.json'),concurrency:hosted.enabled?hosted.concurrency:1});
const chatCoordinator=createCoordinator(localAI);
const usage=hosted.enabled?Hosted.createUsage(hosted):null;
// The AI service this request may use: the shared one, or a hosted account's bounded view of it.
const aiFor=req=>hosted.enabled?Hosted.provider(localAI,req.account,usage,hosted):localAI;
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error("PORT must be a whole number from 1 to 65535.");
  process.exit(1);
}
const BODY_LIMIT = 3 * 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=UTF-8"
};

if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

function sendJson(res, statusCode, payload) {
  // A hosted game seals every state it hands out, so it can tell an edited one.
  if (hosted.enabled && payload && payload.state && typeof payload.state === "object") Hosted.seal(payload.state, hosted.secret);
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=UTF-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function sendBuffer(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": body.length,
    "Cache-Control": contentType.startsWith("text/html") ? "no-store" : "public, max-age=60",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > BODY_LIMIT) {
        reject(Object.assign(new Error("Request body too large."), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw new Error("Expected a JSON object.");
        }
        resolve(body);
      } catch (error) {
        reject(Object.assign(new Error("Invalid JSON request body."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function safePublicPath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname || "/"); }
  catch { throw Object.assign(new Error("Invalid URL encoding."), { statusCode: 400 }); }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const fullPath = path.resolve(PUBLIC_DIR, relative);
  if (!fullPath.startsWith(`${path.resolve(PUBLIC_DIR)}${path.sep}`) && fullPath !== path.resolve(PUBLIC_DIR, "index.html")) return null;
  return fullPath;
}

async function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }
  const filePath = safePublicPath(pathname);
  if (!filePath) {
    sendJson(res, 403, { error: "Forbidden path." });
    return;
  }
  try {
    const stat = await fsPromises.stat(filePath);
    if (!stat.isFile()) throw new Error("Not a file");
    const body = await fsPromises.readFile(filePath);
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    if (req.method === "HEAD") {
      res.writeHead(200, { "Content-Type": contentType, "Content-Length": body.length });
      res.end();
      return;
    }
    sendBuffer(res, 200, body, contentType);
  } catch (error) {
    if (pathname !== "/" && !path.extname(pathname)) {
      const indexBody = await fsPromises.readFile(path.join(PUBLIC_DIR, "index.html"));
      sendBuffer(res, 200, indexBody, MIME_TYPES[".html"]);
      return;
    }
    sendJson(res, 404, { error: "File not found." });
  }
}

// A hosted game keeps each account's saves in its own folder.
function saveDir(req) {
  if (!hosted.enabled) return SAVE_DIR;
  const folder = Hosted.saveFolder(req.account);
  return folder ? path.join(SAVE_DIR, "accounts", folder) : null;
}

function savePath(slot, dir = SAVE_DIR) {
  return path.join(dir, `${slot}.json`);
}

async function listSaves(dir = SAVE_DIR) {
  let filenames;
  try { filenames = await fsPromises.readdir(dir); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const saves = [];
  for (const filename of filenames) {
    if (!filename.toLowerCase().endsWith(".json")) continue;
    const fullPath = path.join(dir, filename);
    try {
      const stat = await fsPromises.stat(fullPath);
      const raw = JSON.parse(await fsPromises.readFile(fullPath, "utf8"));
      const state = raw.state || raw;
      saves.push({
        slot: path.basename(filename, ".json"),
        savedAt: raw.savedAt || stat.mtime.toISOString(),
        playerName: state.player?.name || "Unknown",
        level: state.player?.level || 1,
        scene: currentNode(normalizeIncomingState(state)).title
      });
    } catch (error) {
      saves.push({ slot: path.basename(filename, ".json"), savedAt: new Date(0).toISOString(), corrupted: true });
    }
  }
  return saves.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

async function narratorInfo() {
  if (!(await localAI.narrationEnabled())) return { enabled: false, model: null };
  const c = await localAI.config();
  return { enabled: true, model: c.provider === "claude" ? c.claudeModel : c.model };
}

async function narratorLabel() {
  const info = await narratorInfo();
  return info.enabled ? `AI (${info.model})` : "deterministic";
}

function appendNarrationLog(state, narration) {
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  const last = state.logs[state.logs.length - 1];
  if (!last || last.message !== narration.text || last.source !== "Narrator") {
    state.logs.push({ source: "Narrator", type: "narration", message: narration.text, ts: new Date().toISOString(), narratorSource: narration.source });
  }
  if (state.logs.length > 180) state.logs = state.logs.slice(-180);
}

async function sessionPayload(state, action, events = [], result = null, ai = localAI) {
  let view = buildView(state);
  const narration = await narrate(state, view, action, events, result, ai);
  appendNarrationLog(state, narration);
  view = buildView(state);
  return { state, view, narration, events };
}

// Paid books (docs/AI-STORYTELLER.md): how far this session may read in the
// written books. The open-source game opens every book. A hosted game that
// plays on its owner's AI key replaces this with its account check, giving a
// free account Book.FREE_BOOKS and a paid account every book. Access is set
// on the incoming state each request and is never read from a save.
function bookAccess(req) { return hosted.enabled ? Hosted.bookAccess(req.account) : Infinity; }
// A hosted game only continues states it sealed itself.
function trusted(req, res, state) {
  if (!hosted.enabled || Hosted.verify(state, hosted.secret)) return true;
  sendJson(res, 409, { error: Hosted.TAMPERED });
  return false;
}
const OWNER_ONLY = "On this hosted game the owner chooses the AI game master and its settings.";
function withAccess(req, state) { return Book.grant(state, bookAccess(req)); }

async function handleApi(req, res, url) {
  const pathname = url.pathname;

  if(pathname.startsWith('/api/ai/')) {
    try {
      if(hosted.enabled) {
        // Players see what the AI is and how much of today's allowance is left; they cannot change it.
        if(pathname==='/api/ai/settings'&&req.method==='GET') {
          const c=await localAI.config();
          sendJson(res,200,{config:{enabled:c.enabled,provider:c.provider,narration:c.narration,claudeModel:c.claudeModel,effort:c.effort},...localAI.manifest(),...localAI.status(req.account.id),hosted:{plan:req.account.plan,allowance:usage.report(req.account)}}); return;
        }
        if(pathname==='/api/ai/cancel'&&req.method==='POST') {sendJson(res,200,{cancelled:localAI.cancel(req.account.id)}); return;}
        sendJson(res,403,{error:OWNER_ONLY}); return;
      }
      if(pathname==='/api/ai/settings'&&req.method==='GET') {
        sendJson(res,200,{config:await localAI.config(),...localAI.manifest(),...localAI.status()}); return;
      }
      if(pathname==='/api/ai/settings'&&req.method==='POST') {
        const body=await readJsonBody(req); sendJson(res,200,{config:await localAI.save(body.config)}); return;
      }
      if(pathname==='/api/ai/models'&&req.method==='POST') {
        const body=await readJsonBody(req); sendJson(res,200,{models:await localAI.models(body.config)}); return;
      }
      if(pathname==='/api/ai/key'&&req.method==='POST') {
        // The key is written to the git-ignored key file and is never sent back.
        if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {sendJson(res,403,{error:'A key can only be saved from the computer that runs the game.'});return;}
        const body=await readJsonBody(req);
        process.env.ANTHROPIC_API_KEY=await saveKey(ENV_FILE,body.key);
        sendJson(res,200,{claudeKeyConfigured:true}); return;
      }
      if(pathname==='/api/ai/test'&&req.method==='POST') {
        const body=await readJsonBody(req); sendJson(res,200,await localAI.test(body.config)); return;
      }
      if(pathname==='/api/ai/cancel'&&req.method==='POST') {
        sendJson(res,200,{cancelled:localAI.cancel()}); return;
      }
    } catch(error) {sendJson(res,400,{error:error.message});return;}
  }
  if(pathname==='/api/chat'&&req.method==='POST') {
    const body=await readJsonBody(req);
    if(!trusted(req,res,body.state)) return;
    try {const payload=await chatCoordinator.run(withAccess(req,body.state),body.request,aiFor(req));
      sendJson(res,payload.result?.ok===false?422:200,payload);}
    catch(error){sendJson(res,400,{error:error.message});}
    return;
  }

  if (req.method === "GET" && (pathname === "/api/setup" || pathname === "/api/session/new")) {
    sendJson(res, 200, {
      catalog: setupCatalog(),
      narrator: await narratorInfo(),
      // A hosted visitor without an account cannot keep saves here; the browser keeps the current game.
      ...(hosted.enabled ? { hosted: { serverSaves: Boolean(saveDir(req)) } } : {})
    });
    return;
  }
  // Picks up the game a hosted visitor's browser kept. Only a state this server sealed is accepted.
  if (req.method === "POST" && pathname === "/api/session/resume") {
    if (!hosted.enabled) { sendJson(res, 404, { error: "API route not found." }); return; }
    const body = await readJsonBody(req);
    if (!body.state || typeof body.state !== "object") { sendJson(res, 400, { error: "No game was sent." }); return; }
    if (!trusted(req, res, body.state)) return;
    const state = normalizeIncomingState(withAccess(req, body.state));
    const view = buildView(state);
    sendJson(res, 200, { state, view, narration: savedNarration(state, view), events: [] });
    return;
  }

  if (req.method === "POST" && pathname === "/api/session/new") {
    const body = await readJsonBody(req);
    const state = withAccess(req, createNewGame(body.setup || body));
    sendJson(res, 200, await sessionPayload(state, { type: "opening" }, [], null, aiFor(req)));
    return;
  }

  if (req.method === "POST" && (pathname === "/api/action" || pathname === "/api/turn")) {
    const body = await readJsonBody(req);
    const action = pathname === "/api/turn" && typeof body.action === "string"
      ? { type: "freeform", text: body.action }
      : body.action || body;
    if (!trusted(req, res, body.state)) return;
    const resolved = resolveAction(withAccess(req, body.state), action);
    const payload = await sessionPayload(resolved.state, action, resolved.events, resolved.result, aiFor(req));
    payload.result = resolved.result;
    sendJson(res, resolved.result?.ok === false ? 422 : 200, payload);
    return;
  }

  if (req.method === "GET" && pathname === "/api/session/list") {
    const dir = saveDir(req);
    sendJson(res, 200, { saves: dir ? await listSaves(dir) : [], ...(hosted.enabled && !dir ? { note: "Sign in to keep saves on this server. Your browser keeps your current game." } : {}) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/session/save") {
    const body = await readJsonBody(req);
    const dir = saveDir(req);
    if (!dir) { sendJson(res, 403, { error: "Saves on this server need an account. Your browser keeps your current game." }); return; }
    if (!trusted(req, res, body.state)) return;
    const slot = sanitizeSaveName(body.slot || body.name || `campaign-${Date.now()}`);
    if (!validSaveName(slot)) {
      sendJson(res, 400, { error: "Save names must use 1–48 letters, numbers, spaces, underscores, or hyphens, and cannot be reserved Windows device names." });
      return;
    }
    const state = normalizeIncomingState(body.state);
    const payload = { slot, savedAt: new Date().toISOString(), state };
    await fsPromises.mkdir(dir, { recursive: true });
    const temporary = savePath(slot, dir)+`.${require("crypto").randomUUID()}.tmp`;
    try {
      await fsPromises.writeFile(temporary, JSON.stringify(payload, null, 2), "utf8");
      await fsPromises.rename(temporary, savePath(slot, dir));
    } finally { await fsPromises.unlink(temporary).catch(() => {}); }
    sendJson(res, 200, { status: "saved", slot, savedAt: payload.savedAt });
    return;
  }

  if (req.method === "GET" && pathname === "/api/session/load") {
    const slot = sanitizeSaveName(url.searchParams.get("slot"));
    if (!validSaveName(slot)) {
      sendJson(res, 400, { error: "Invalid save slot." });
      return;
    }
    const dir = saveDir(req);
    if (!dir) { sendJson(res, 404, { error: "Save slot not found." }); return; }
    try {
      const raw = JSON.parse(await fsPromises.readFile(savePath(slot, dir), "utf8"));
      const state = normalizeIncomingState(withAccess(req, raw.state || raw));
      const view = buildView(state);
      sendJson(res, 200, {
        state,
        view,
        narration: savedNarration(state, view),
        events: []
      });
    } catch (error) {
      if (error.code === "ENOENT") sendJson(res, 404, { error: "Save slot not found." });
      else sendJson(res, 500, { error: "Save file could not be read." });
    }
    return;
  }

  if (req.method === "DELETE" && pathname === "/api/session/delete") {
    const slot = sanitizeSaveName(url.searchParams.get("slot"));
    if (!validSaveName(slot)) {
      sendJson(res, 400, { error: "Invalid save slot." });
      return;
    }
    const dir = saveDir(req);
    if (!dir) { sendJson(res, 404, { error: "Save slot not found." }); return; }
    try {
      await fsPromises.unlink(savePath(slot, dir));
      sendJson(res, 200, { status: "deleted", slot });
    } catch (error) {
      if (error.code === "ENOENT") sendJson(res, 404, { error: "Save slot not found." });
      else sendJson(res, 500, { error: "Save slot could not be deleted." });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/hosted/account") {
    if (!hosted.enabled) { sendJson(res, 404, { error: "This game is not hosted." }); return; }
    const a = req.account, books = Hosted.bookAccess(a);
    sendJson(res, 200, { plan: a.plan, signedIn: !a.guest, books: Number.isFinite(books) ? books : "all", ai: usage.report(a), serverSaves: !a.guest, ...(a.exp ? { passExpires: new Date(a.exp).toISOString() } : {}) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, {
      status: "ok",
      version: VERSION,
      narrator: await narratorLabel(),
      timestamp: new Date().toISOString()
    });
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
    if (hosted.enabled) {
      req.account = Hosted.account(req, hosted);
      // An account pass link: /pass?token=... stores the pass in a cookie and opens the game.
      if (req.method === "GET" && url.pathname === "/pass") {
        const token = url.searchParams.get("token") || "";
        const pass = Hosted.readPass(token, hosted.secret);
        if (!pass) { sendJson(res, 400, { error: "That pass is not valid or has expired." }); return; }
        res.writeHead(302, { Location: "/", "Set-Cookie": Hosted.passCookie(token, pass.exp, hosted), "Cache-Control": "no-store" });
        res.end();
        return;
      }
    }
    // Behind HTTPS and a proxy the request URL says http://, so a hosted game names its public address.
    const origin = hosted.enabled && hosted.origin ? hosted.origin : url.origin;
    if (url.pathname.startsWith("/api/") && ["POST", "DELETE"].includes(req.method)) {
      // Browser clients must use this application's own origin. This is
      // defense in depth against other sites, not anti-cheat.
      if ((req.headers.origin && req.headers.origin !== origin) || req.headers["sec-fetch-site"] === "cross-site") {
        sendJson(res, 403, { error: "Use the game from its own local address." });
        return;
      }
      if (req.method === "POST" && String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase() !== "application/json") {
        sendJson(res, 415, { error: "API requests must use application/json." });
        return;
      }
    }
    if (url.pathname.startsWith("/api/")) await handleApi(req, res, url);
    else await serveStatic(req, res, url.pathname);
  } catch (error) {
    const statusCode = Number(error.statusCode || 500);
    console.error(error);
    if (!res.destroyed && !res.headersSent) {
      sendJson(res, statusCode, { error: statusCode >= 500 ? "Internal server error." : error.message });
    }
  }
}

const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`AI Dungeon Master V4 running at http://localhost:${PORT}`);
  narratorLabel().then(label => console.log(`Narrator: ${label}`));
});
