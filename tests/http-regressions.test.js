'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

async function fixture(t) {
  const saveDir = await fs.mkdtemp(path.join(os.tmpdir(), 'briarwatch-regression-'));
  const port = await new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const port = socket.address().port;
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', SAVE_DIR: saveDir, AI_NARRATOR: 'off' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  t.after(async () => {
    if (child.exitCode === null) {
      await new Promise(resolve => {
        child.once('exit', resolve);
        child.kill('SIGTERM');
        setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 1000).unref();
      });
    }
    await fs.rm(saveDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  for (let n = 0; n < 100; n++) {
    if (child.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`${base}/api/health`)).ok) return { base, saveDir }; } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Test server did not start: ${output}`);
}

test('local HTTP validation preserves healthy requests and rejects invalid writes', { timeout: 15000 }, async t => {
  const { base, saveDir } = await fixture(t);
  const post = (route, body, headers = {}) => fetch(`${base}${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
  });
  const created = await post('/api/session/new', { classId: 'fighter' }, { Origin: base });
  assert.equal(created.status, 200);
  const { state } = await created.json();

  for (const slot of ['CON', 'aux', 'LPT9']) {
    const saved = await post('/api/session/save', { slot, state });
    assert.equal(saved.status, 400, slot);
    assert.equal((await fetch(`${base}/api/session/load?slot=${slot}`)).status, 400);
    assert.equal((await fetch(`${base}/api/session/delete?slot=${slot}`, { method: 'DELETE' })).status, 400);
  }
  assert.deepEqual(await fs.readdir(saveDir), []);
  for (const body of [null, [], 'not a JSON object', 7]) {
    assert.equal((await post('/api/session/new', body)).status, 400);
  }
  assert.equal((await post('/api/session/new', {}, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('/api/session/save', { slot: 'not-written', state }, { Origin: 'http://other.invalid' })).status, 403);
  assert.equal((await post('/api/session/save', { slot: 'not-written', state }, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.deepEqual(await fs.readdir(saveDir), []);

  assert.equal((await post('/api/session/save', { slot: 'portable-save', state })).status, 200);
  assert.equal((await fetch(`${base}/api/session/load?slot=portable-save`)).status, 200);
  assert.equal((await fetch(`${base}/api/session/delete?slot=portable-save`, { method: 'DELETE', headers: { Origin: base } })).status, 200);
  assert.deepEqual(await fs.readdir(saveDir), []);
  assert.equal((await fetch(`${base}/%ZZ`)).status, 400);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
});

test('invalid ports stop with an actionable error rather than an unusable launch', () => {
  for (const port of ['not-a-port', '-1', '0', '65536', '4173.5']) {
    const result = spawnSync(process.execPath, ['server.js'], {
      cwd: root, env: { ...process.env, PORT: port, AI_NARRATOR: 'off' },
      encoding: 'utf8', timeout: 5000
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /PORT must be a whole number from 1 to 65535/);
  }
});
