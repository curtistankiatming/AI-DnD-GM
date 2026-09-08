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
const { narrate, narratorEnabled, AI_MODEL } = require("./src/narrator");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "public");
const SAVE_DIR = path.resolve(process.env.SAVE_DIR || path.join(__dirname, "saves"));
const SAVE_NAME_PATTERN = /^[a-z0-9][a-z0-9 _-]{0,47}$/i;
const BODY_LIMIT = 3 * 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

function sendJson(res, statusCode, payload) {
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
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(Object.assign(new Error("Invalid JSON request body."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function safePublicPath(pathname) {
  const decoded = decodeURIComponent(pathname || "/");
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

function sanitizeSaveName(raw) {
  return String(raw || "").trim().replace(/\.json$/i, "");
}

function savePath(slot) {
  return path.join(SAVE_DIR, `${slot}.json`);
}

async function listSaves() {
  const filenames = await fsPromises.readdir(SAVE_DIR);
  const saves = [];
  for (const filename of filenames) {
    if (!filename.toLowerCase().endsWith(".json")) continue;
    const fullPath = path.join(SAVE_DIR, filename);
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

function appendNarrationLog(state, narration) {
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  const last = state.logs[state.logs.length - 1];
  if (!last || last.message !== narration.text || last.source !== "Narrator") {
    state.logs.push({ source: "Narrator", type: "narration", message: narration.text, ts: new Date().toISOString(), narratorSource: narration.source });
  }
  if (state.logs.length > 180) state.logs = state.logs.slice(-180);
}

async function sessionPayload(state, action, events = []) {
  let view = buildView(state);
  const narration = await narrate(state, view, action, events);
  appendNarrationLog(state, narration);
  view = buildView(state);
  return { state, view, narration, events };
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;

  if (req.method === "GET" && (pathname === "/api/setup" || pathname === "/api/session/new")) {
    sendJson(res, 200, {
      catalog: setupCatalog(),
      narrator: { enabled: narratorEnabled(), model: narratorEnabled() ? AI_MODEL : null }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/session/new") {
    const body = await readJsonBody(req);
    const state = createNewGame(body.setup || body);
    sendJson(res, 200, await sessionPayload(state, { type: "opening" }, []));
    return;
  }

  if (req.method === "POST" && (pathname === "/api/action" || pathname === "/api/turn")) {
    const body = await readJsonBody(req);
    const action = pathname === "/api/turn" && typeof body.action === "string"
      ? { type: "freeform", text: body.action }
      : body.action || body;
    const resolved = resolveAction(body.state, action);
    const payload = await sessionPayload(resolved.state, action, resolved.events);
    payload.result = resolved.result;
    sendJson(res, resolved.result?.ok === false ? 422 : 200, payload);
    return;
  }

  if (req.method === "GET" && pathname === "/api/session/list") {
    sendJson(res, 200, { saves: await listSaves() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/session/save") {
    const body = await readJsonBody(req);
    const slot = sanitizeSaveName(body.slot || body.name || `campaign-${Date.now()}`);
    if (!SAVE_NAME_PATTERN.test(slot)) {
      sendJson(res, 400, { error: "Save names may contain 1–48 letters, numbers, spaces, underscores, or hyphens." });
      return;
    }
    const state = normalizeIncomingState(body.state);
    const payload = { slot, savedAt: new Date().toISOString(), state };
    const temporary = savePath(slot)+`.${require("crypto").randomUUID()}.tmp`;
    try {
      await fsPromises.writeFile(temporary, JSON.stringify(payload, null, 2), "utf8");
      await fsPromises.rename(temporary, savePath(slot));
    } finally { await fsPromises.unlink(temporary).catch(() => {}); }
    sendJson(res, 200, { status: "saved", slot, savedAt: payload.savedAt });
    return;
  }

  if (req.method === "GET" && pathname === "/api/session/load") {
    const slot = sanitizeSaveName(url.searchParams.get("slot"));
    if (!SAVE_NAME_PATTERN.test(slot)) {
      sendJson(res, 400, { error: "Invalid save slot." });
      return;
    }
    try {
      const raw = JSON.parse(await fsPromises.readFile(savePath(slot), "utf8"));
      const state = normalizeIncomingState(raw.state || raw);
      const view = buildView(state);
      sendJson(res, 200, {
        state,
        view,
        narration: {
          text: state.lastNarration || state.story.lastOutcome?.text || currentNode(state).opening,
          source: "save"
        },
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
    if (!SAVE_NAME_PATTERN.test(slot)) {
      sendJson(res, 400, { error: "Invalid save slot." });
      return;
    }
    try {
      await fsPromises.unlink(savePath(slot));
      sendJson(res, 200, { status: "deleted", slot });
    } catch (error) {
      if (error.code === "ENOENT") sendJson(res, 404, { error: "Save slot not found." });
      else sendJson(res, 500, { error: "Save slot could not be deleted." });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, {
      status: "ok",
      version: "4.0.0",
      narrator: narratorEnabled() ? `AI (${AI_MODEL})` : "deterministic",
      timestamp: new Date().toISOString()
    });
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
  try {
    if (url.pathname.startsWith("/api/")) await handleApi(req, res, url);
    else await serveStatic(req, res, url.pathname);
  } catch (error) {
    const statusCode = Number(error.statusCode || 500);
    console.error(error);
    sendJson(res, statusCode, { error: statusCode >= 500 ? "Internal server error." : error.message });
  }
}

const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`AI Dungeon Master V4 running at http://localhost:${PORT}`);
  console.log(`Narrator: ${narratorEnabled() ? `AI (${AI_MODEL})` : "deterministic story engine"}`);
});
