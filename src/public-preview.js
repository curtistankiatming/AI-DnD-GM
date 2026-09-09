"use strict";

// Browser-only transport. Never calls a server, provider, or external model.
const E = require('./engine');
const N = require('./narrator');
const P = require('./progression');
const { CLASSES, STORY_NODES, CAMPAIGN } = require('./content');
const { QUESTS } = require('./expansion');
const { sanitizeSaveName, validSaveName } = require('./save-slots');
const PREFIX = 'briarwatch-public-v4:';
const MAX_IMPORT = 1024 * 1024;
const clone = value => JSON.parse(JSON.stringify(value));

function checkedState(raw) {
  if (!raw || raw.schemaVersion !== 4 || raw.campaignId !== CAMPAIGN.id ||
      !CLASSES[raw.player?.classId] || !STORY_NODES[raw.story?.nodeId] ||
      !Array.isArray(raw.party) || !Array.isArray(raw.player?.inventory)) {
    throw new Error('Import a V4 Briarwatch save, not an older or different game. The current campaign was not replaced.');
  }
  const state = E.normalizeIncomingState(raw);
  E.buildView(state); // Validate before changing a slot or current game.
  return state;
}

function makeSandbox({ classId = 'fighter', level = 5, questId = 'town' } = {}) {
  if (!CLASSES[classId] || !Number.isInteger(Number(level)) || level < 1 || level > 10)
    throw new Error('Select a class and a level from 1 to 10.');
  const quest = QUESTS[questId];
  if (questId !== 'town' && !quest) throw new Error('Choose an available test scenario.');
  level = Math.max(Number(level), quest?.level || 1);
  let state = E.createNewGame({ name: 'Test Adventurer', classId, difficulty: 'standard' });
  if (level > 1) E.awardXp(state, P.XP_NEXT[level - 1], [], 'Sandbox fixture — not earned progression');
  state.publicTest = { mode: 'sandbox', scenario: questId, grantedLevel: level };
  state.player.gold = 400;
  E.addItem(state, 'healing-potion', 5, []);
  state.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass'];
  const markPrerequisites = (id, seen = new Set()) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    if (QUESTS[id]) markPrerequisites(QUESTS[id].unlock, seen);
    state.world.completed[id] = { day: 1, quality: 'test-fixture', method: 'test-fixture', xp: 0, gold: 0 };
  };
  markPrerequisites(quest?.unlock || 'bell');
  state.world.townId = quest?.town || 'briarwatch';
  state.story.nodeId = `town-${state.world.townId}`;
  state.story.lastOutcome = { text: `SANDBOX: level ${level}, 400 gold, supplies and prerequisite flags were granted for testing. Choose development rewards, prepare, then depart from the expedition board. This is not earned campaign progress.` };
  state.story.history = [{ summary: state.story.lastOutcome.text }];
  state.logs = [];
  return E.normalizeIncomingState(state);
}

function createClient(storage, build = {}, rng = Math.random) {
  function slotName(raw, state) {
    let slot = sanitizeSaveName(raw);
    if (!validSaveName(slot)) throw new Error('Use a portable save name of 1–48 letters, numbers, spaces, hyphens or underscores.');
    if (state && state.publicTest?.mode !== 'sandbox' && slot.startsWith('sandbox-')) throw new Error('The sandbox- prefix is reserved for test characters. Choose a normal campaign name.');
    if (state?.publicTest?.mode === 'sandbox' && !slot.startsWith('sandbox-')) slot = `sandbox-${slot}`;
    if (!validSaveName(slot)) throw new Error('Use a shorter sandbox save name (at most 40 characters).');
    return slot;
  }
  function envelope(state) {
    return { format: 'briarwatch-public-save', formatVersion: 1, build, savedAt: new Date().toISOString(), state };
  }
  function write(slot, state) {
    slot = slotName(slot, state);
    try { storage.setItem(`${PREFIX}save:${slot}`, JSON.stringify(envelope(state))); }
    catch { throw new Error('Browser storage is unavailable or full. Export your current save to keep progress.'); }
    return slot;
  }
  function payload(state, action, events = [], result = null, autosave = false) {
    const view = E.buildView(state);
    const text = N.deterministicFallback(state, view, action, events);
    state.lastNarration = text;
    const out = { state, view, narration: { text, source: 'deterministic', model: null }, events, result, build };
    if (autosave) {
      try { write('autosave', state); }
      catch (error) { out.storageWarning = error.message; }
    }
    return out;
  }
  function importText(text) {
    if (typeof text !== 'string' || text.length > MAX_IMPORT) throw new Error('Save imports must be JSON files smaller than 1 MiB.');
    let raw;
    try { raw = JSON.parse(text); } catch { throw new Error('The selected file is not valid JSON.'); }
    if (raw?.format && (raw.format !== 'briarwatch-public-save' || raw.formatVersion !== 1)) throw new Error('Unsupported save export format.');
    const state = checkedState(raw?.state || raw);
    return payload(state, { type: 'loaded' }, [], null, false);
  }
  async function request(route, options = {}) {
    let status = 200, result;
    try {
      const url = new URL(route, 'https://offline.invalid');
      const method = options.method || 'GET';
      const body = options.body ? JSON.parse(options.body) : {};
      if (url.pathname === '/api/setup' && method === 'GET') {
        result = { catalog: E.setupCatalog(), narrator: { enabled: false, model: null }, build };
      } else if (url.pathname === '/api/session/new' && method === 'POST') {
        const state = E.createNewGame(body.setup || body);
        state.publicTest = { mode: 'campaign' };
        result = payload(state, { type: 'opening' }, [], null, true);
      } else if (url.pathname === '/api/test/start' && method === 'POST') {
        result = payload(makeSandbox(body), { type: 'opening' }, [], null, true);
      } else if (url.pathname === '/api/action' && method === 'POST') {
        const resolved = E.resolveAction(body.state, body.action, rng);
        result = payload(resolved.state, body.action, resolved.events, resolved.result, resolved.result.ok !== false);
        status = resolved.result.ok === false ? 422 : 200;
      } else if (url.pathname === '/api/session/save' && method === 'POST') {
        const state = checkedState(body.state);
        result = { status: 'saved', slot: write(body.slot, state) };
      } else if (url.pathname === '/api/session/list' && method === 'GET') {
        const saves = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key?.startsWith(`${PREFIX}save:`)) continue;
          const slot = key.slice(`${PREFIX}save:`.length);
          try {
            const raw = JSON.parse(storage.getItem(key));
            const state = checkedState(raw.state);
            saves.push({ slot, savedAt: raw.savedAt, playerName: state.player.name, level: state.player.level, scene: E.currentNode(state).title });
          } catch { saves.push({ slot, corrupted: true }); }
        }
        result = { saves: saves.sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || ''))) };
      } else if (url.pathname === '/api/session/load' && method === 'GET') {
        const slot = slotName(url.searchParams.get('slot'));
        const raw = storage.getItem(`${PREFIX}save:${slot}`);
        if (!raw) { status = 404; result = { error: 'Save not found in this browser profile.' }; }
        else result = importText(raw);
      } else if (url.pathname === '/api/session/delete' && method === 'DELETE') {
        const slot = slotName(url.searchParams.get('slot'));
        storage.removeItem(`${PREFIX}save:${slot}`);
        result = { status: 'deleted', slot };
      } else { status = 404; result = { error: 'This action is not part of the offline preview.' }; }
    } catch (error) { status = 400; result = { error: error.message }; }
    return { ok: status >= 200 && status < 300, status, json: async () => clone(result) };
  }
  return { request, importText, exportText: state => JSON.stringify(envelope(checkedState(state)), null, 2), build,
    // Preferences are not saves. Unavailable preference storage must not stop play.
    storage: {
      getItem(key) { try { return storage.getItem(`${PREFIX}preference:${key}`); } catch { return null; } },
      setItem(key, value) { try { storage.setItem(`${PREFIX}preference:${key}`, value); } catch {} }
    },
    scenarios: Object.values(QUESTS).map(q => ({ id: q.id, name: q.name, level: q.level }))
  };
}
module.exports = { createClient, makeSandbox, checkedState, PREFIX, MAX_IMPORT };
