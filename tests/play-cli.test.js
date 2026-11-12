'use strict';
// scripts/play.js lets an agent (Codex, Claude) play the written story from a
// terminal with no AI. These checks keep its commands working.
const test = require('node:test'), assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const SCRIPT = path.join(__dirname, '..', 'scripts', 'play.js');
const run = (...a) => execFileSync(process.execPath, [SCRIPT, ...a], { encoding: 'utf8', env: { ...process.env, ANTHROPIC_API_KEY: '' } });
const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'play-cli-'));

test('a new game saves, shows choices, and a choice moves the story on', () => {
  const save = path.join(dir(), 'g.json');
  const first = run('new', '--class', 'ranger', '--name', 'Wren', '--save', save);
  assert.match(first, /Briarwatch Village Square/);
  assert.match(first, /id=inspect-rope/);
  assert.match(run('choose', 'inspect-rope', '--save', save), /You choose: Inspect the severed bell rope/);
  assert.equal(JSON.parse(fs.readFileSync(save, 'utf8')).turn > 0, true);
  assert.match(run('look', '--save', save), /black wax/);
  assert.match(run('auto', '5', '--save', save), /./);
});

test('the same commands give the same rolls', () => {
  const a = path.join(dir(), 'a.json'), b = path.join(dir(), 'b.json');
  run('new', '--class', 'fighter', '--save', a); run('new', '--class', 'fighter', '--save', b);
  assert.equal(run('choose', '1', '--save', a), run('choose', '1', '--save', b));
});

test('read and scenes show written content without dice', () => {
  const lines = run('read', 'scene-bridge-camp-night');
  assert.match(lines, /NESSA: What is this\./);
  assert.match(run('scenes'), /scene-bridge-camp-night/);
});

test('jump makes a labelled review fixture and the scene plays from it', () => {
  const save = path.join(dir(), 'j.json');
  assert.match(run('jump', 'q-bridge-after', '--level', '4', '--with', 'nessa', '--save', save), /Review fixture/);
  assert.equal(JSON.parse(fs.readFileSync(save, 'utf8')).fixture, true);
  assert.match(run('choose', '1', '--save', save), /The Night after the Bridge/);
});

test('a bad choice fails with a readable message', () => {
  const save = path.join(dir(), 'e.json');
  run('new', '--save', save);
  const r = spawnSync(process.execPath, [SCRIPT, 'choose', 'bogus', '--save', save], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /No choice "bogus"/);
});
