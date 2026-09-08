'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeSaveName, validSaveName } = require('../src/save-slots');

test('save slots reject Windows device names before creating a file', () => {
  for (const name of ['CON', 'nul', 'Aux', 'PRN', 'com1', 'COM9', 'lpt1', 'LPT9']) {
    assert.equal(validSaveName(sanitizeSaveName(`${name}.json`)), false, name);
  }
});
test('ordinary named saves and JSON suffixes remain compatible', () => {
  for (const name of ['Rowan', 'Campaign 1', 'before-trial', 'con-safe', 'com10', 'quick_save']) {
    assert.equal(validSaveName(sanitizeSaveName(` ${name}.json `)), true, name);
  }
  assert.equal(sanitizeSaveName(' Rowan.JSON '), 'Rowan');
});
test('save slots reject empty, oversized, non-string and nonportable names', () => {
  for (const name of ['', 'x'.repeat(49), ' name', 'name ', 'name.', 'a/b', 'a\\b', 123, null]) {
    assert.equal(validSaveName(name), false, String(name));
  }
});
