"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const { spawn } = require("node:child_process");
const path = require("node:path");

const fs = require("node:fs/promises");
const os = require("node:os");
const ROOT = path.resolve(__dirname, "..");

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return response.json();
    } catch (error) {
      // Server may still be binding its socket.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Server did not become healthy.");
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json();
  return { response, payload };
}

test("HTTP application serves UI, sessions, actions, and save lifecycle", { timeout: 15000 }, async (t) => {
  const saveDir = await fs.mkdtemp(path.join(os.tmpdir(), "briarwatch-http-"));
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), AI_NARRATOR: "off", SAVE_DIR: saveDir },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  t.after(async () => {
    if (child.exitCode === null) child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
      setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); }, 1000).unref();
    });
    await fs.rm(saveDir, { recursive: true, force: true });
  });

  const health = await waitForHealth(baseUrl, child);
  assert.equal(health.status, "ok");
  assert.equal(health.version, require("../package.json").version);
  assert.equal(health.narrator, "deterministic");

  const page = await fetch(`${baseUrl}/`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /AI Dungeon Master/i);
  assert.match(html, /setupOverlay/);

  const setup = await jsonRequest(`${baseUrl}/api/setup`);
  assert.equal(setup.response.status, 200);
  assert.equal(setup.payload.catalog.classes.length, 6);
  assert.equal(setup.payload.narrator.enabled, false);

  const created = await jsonRequest(`${baseUrl}/api/session/new`, {
    method: "POST",
    body: JSON.stringify({ setup: { name: "HTTP Hero", classId: "cleric", backgroundId: "acolyte", difficulty: "standard" } })
  });
  assert.equal(created.response.status, 200);
  assert.equal(created.payload.state.player.name, "HTTP Hero");
  assert.equal(created.payload.view.scene.id, "briarwatch-square");
  assert.equal(created.payload.narration.source, "deterministic");

  const acted = await jsonRequest(`${baseUrl}/api/action`, {
    method: "POST",
    body: JSON.stringify({ state: created.payload.state, action: { type: "story-choice", choiceId: "leave-village" } })
  });
  assert.equal(acted.response.status, 200);
  assert.equal(acted.payload.view.scene.id, "forest-edge");

  const invalid = await jsonRequest(`${baseUrl}/api/action`, {
    method: "POST",
    body: JSON.stringify({ state: acted.payload.state, action: { type: "story-choice", choiceId: "not-a-choice" } })
  });
  assert.equal(invalid.response.status, 422);
  assert.equal(invalid.payload.result.ok, false);

  const slot = `integration-${process.pid}-${port}`;
  const saved = await jsonRequest(`${baseUrl}/api/session/save`, {
    method: "POST",
    body: JSON.stringify({ slot, state: acted.payload.state })
  });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.payload.status, "saved");

  const listed = await jsonRequest(`${baseUrl}/api/session/list`);
  assert.ok(listed.payload.saves.some((entry) => entry.slot === slot && entry.playerName === "HTTP Hero"));

  const loaded = await jsonRequest(`${baseUrl}/api/session/load?slot=${encodeURIComponent(slot)}`);
  assert.equal(loaded.response.status, 200);
  assert.equal(loaded.payload.state.player.name, "HTTP Hero");
  assert.equal(loaded.payload.view.scene.id, "forest-edge");

  const deleted = await jsonRequest(`${baseUrl}/api/session/delete?slot=${encodeURIComponent(slot)}`, { method: "DELETE" });
  assert.equal(deleted.response.status, 200);
  assert.equal(deleted.payload.status, "deleted");

  const gone = await jsonRequest(`${baseUrl}/api/session/load?slot=${encodeURIComponent(slot)}`);
  assert.equal(gone.response.status, 404);
  assert.match(output, /AI Dungeon Master V4 running/);
});
