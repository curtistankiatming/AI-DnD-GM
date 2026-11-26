/* Game master setup: choose Claude or the listed choices, paste a key and test the connection.
   The key goes straight to the local game server, which writes the git-ignored key file.
   It is never stored in the browser, in AI settings or in a save. */
(function () {
  'use strict';
  const offline = Boolean(window.BriarwatchOffline);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const btn = (text, cls, fn) => { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const CHOICE = 'briarwatch.gmChoice.v1';
  const recall = () => { try { return window.localStorage.getItem(CHOICE); } catch { return null; } };
  const remember = value => { try { window.localStorage.setItem(CHOICE, value); } catch { /* asked again next time */ } };

  let info = null, working = false, message = '', tone = '';
  const status = () => ({
    known: Boolean(info), offline,
    on: Boolean(info?.config?.enabled),
    provider: info?.config?.provider || 'claude',
    claude: Boolean(info?.config?.enabled && info.config.provider === 'claude'),
    keySaved: Boolean(info?.claudeKeyConfigured),
    // On a hosted game the site runs the AI game master: players never paste a key or change it.
    hosted: info?.hosted || null
  });
  const post = (route, body) => api(route, { method: 'POST', body: JSON.stringify(body) });
  function announce(saved = false) {
    document.dispatchEvent(new CustomEvent('briarwatch:ai', { detail: status() }));
    if (saved) document.dispatchEvent(new CustomEvent('briarwatch:ai-saved'));
    drawAll();
  }
  async function refresh() {
    if (offline || typeof api !== 'function') return status();
    try { info = (await api('/api/ai/settings')).payload; } catch { /* keep the last known answer */ }
    announce();
    return status();
  }
  // Size limits belong to a provider, so they are left out and the server picks Claude's.
  function claudeConfig(extra = {}) {
    const c = { ...(info?.config || {}) }; delete c.contextChars; delete c.replyTokens;
    return { ...c, provider: 'claude', ...extra };
  }
  async function saveConfig(config) { await post('/api/ai/settings', { config }); await refresh(); announce(true); }
  const say = (text, kind = '') => { message = text; tone = kind; drawAll(); };

  async function run(task) {
    if (working) return;
    working = true; drawAll();
    try { await task(); }
    catch (error) { say(error.message || 'That did not work. Nothing was changed.', 'bad'); }
    finally { working = false; drawAll(); }
  }
  async function testConnection() {
    say('Asking Claude to answer. This takes a few seconds.');
    const { payload } = await post('/api/ai/test', { config: claudeConfig({ enabled: true }) });
    // A first switch to Claude also lets it narrate, which is what choosing an AI game master means.
    if (!status().claude) await saveConfig(claudeConfig({ enabled: true, narration: true }));
    remember('claude');
    say(`Connected. Claude is your game master (${payload.model}).`, 'good');
  }
  const saveKeyAndTest = key => run(async () => {
    if (!key.trim()) { say('Paste your key into the box first.', 'bad'); return; }
    say('Saving your key on this computer.');
    await post('/api/ai/key', { key: key.trim() });
    await refresh();
    try { await testConnection(); }
    catch (error) { say('Your key was saved, but the test did not pass. ' + error.message, 'bad'); }
  });

  // The key box. Used on the first screen and again in Settings.
  const panels = [];
  function keyPanel(mount, id) {
    const state = { mount, id, replacing: false };
    panels.push(state);
    return state;
  }
  function drawKeyPanel(p) {
    const s = status(), focused = document.activeElement?.id, typed = p.mount.querySelector('input')?.value || '';
    p.mount.replaceChildren();
    if (!s.known) { p.mount.append(el('p', 'muted', 'Checking the AI game master setup.')); return; }
    if (s.hosted) { p.mount.append(el('p', '', hostedNote(s))); return; }
    if (s.keySaved && !p.replacing) {
      const row = el('div', 'gm-key-row');
      row.append(btn('Test connection', 'btn btn-secondary btn-small', () => run(testConnection)), btn('Use a different key', 'text-button', () => { p.replacing = true; drawAll(); }));
      p.mount.append(el('p', '', s.claude ? 'Claude is set up and turned on.' : 'A Claude key is saved on this computer.'), row);
    } else {
      const label = el('label', 'gm-key-field', 'Paste your Claude API key'), input = el('input');
      input.type = 'password'; input.id = p.id; input.autocomplete = 'off'; input.spellcheck = false; input.placeholder = 'sk-ant-…'; input.maxLength = 420; input.value = typed;
      label.append(input);
      const go = btn('Save key and test', 'btn btn-primary btn-small', () => saveKeyAndTest(input.value));
      input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); go.click(); } });
      const row = el('div', 'gm-key-row'); row.append(label, go);
      if (p.replacing) row.append(btn('Keep the saved key', 'text-button', () => { p.replacing = false; drawAll(); }));
      p.mount.append(row, el('p', 'muted', 'Get a key at console.anthropic.com, under API keys. The key stays on this computer in a private file and is never put in a save. Claude charges your account a small amount for each reply.'));
    }
    for (const control of p.mount.querySelectorAll('button,input')) control.disabled = working;
    const note = el('p', 'gm-status', message); note.setAttribute('role', 'status'); if (tone) note.dataset.tone = tone;
    p.mount.append(note);
    if (focused === p.id) document.getElementById(p.id)?.focus();
  }

  function hostedNote(s) {
    const a = s.hosted.allowance || {};
    if (!s.on) return 'This site runs the game master for you, and the AI game master is off at the moment. The written story and every listed choice work as usual.';
    if (!a.limit) return 'This site runs the game master for you; no key is needed. The AI game master comes with an account. Without one, the written story and every listed choice are free to play.';
    return `This site runs the game master for you; no key is needed. AI turns left today: ${a.left} of ${a.limit}.`;
  }

  // First screen: step 3, "Choose your game master".
  const section = document.getElementById('gmChoice'), body = document.getElementById('gmChoiceBody');
  let want = null, choiceKey = null;
  function drawChoice() {
    if (!section || !body || offline) return;
    const s = status();
    // A hosted game has nothing to choose here: the site decides, and the Settings note says so.
    section.hidden = !s.known || Boolean(s.hosted);
    if (!s.known || s.hosted) return;
    if (want === null) want = s.claude ? 'claude' : recall() === 'classic' ? 'classic' : 'claude';
    if (s.claude) want = want === 'classic' && working ? want : 'claude';
    if (!choiceKey) {
      const group = el('div', 'gm-cards'); group.setAttribute('role', 'radiogroup'); group.setAttribute('aria-label', 'Game master');
      const card = (id, title, tag, text) => {
        const b = btn('', 'gm-card', () => choose(id)); b.dataset.gm = id; b.id = 'gm-' + id; b.setAttribute('role', 'radio');
        const head = el('span', 'gm-card-title', title); if (tag) head.append(el('span', 'tag tag-good', tag));
        b.append(head, el('span', 'gm-card-text', text)); group.append(b);
      };
      card('claude', 'Claude AI game master', 'Recommended', 'Type anything you want to try. Claude tells the story and the game rolls the dice. Needs a Claude API key.');
      card('classic', 'Listed choices only', '', 'Pick from the choices offered in each scene. Free, and works without the internet.');
      const local = el('p', 'muted'); local.id = 'gmLocalNote';
      const mount = el('div', 'gm-key'); mount.id = 'gmChoiceKey';
      const after = el('p', 'muted'); after.id = 'gmChoiceNote';
      body.append(group, local, mount, after);
      choiceKey = keyPanel(mount, 'gmChoiceKeyInput');
    }
    // Another provider chosen in Settings (a local model or OpenAI) keeps this step out of the way.
    const usingLocal = s.on && s.provider !== 'claude';
    for (const b of body.querySelectorAll('.gm-card')) {
      const selected = !usingLocal && b.dataset.gm === want;
      b.setAttribute('aria-checked', String(selected)); b.classList.toggle('is-selected', selected); b.disabled = working;
    }
    document.getElementById('gmLocalNote').textContent = usingLocal ? (s.provider === 'openai' ? 'You are using OpenAI as the game master. You can change that in Settings.' : 'You are using a local model server as the game master. You can change that in Settings.') : '';
    choiceKey.mount.hidden = usingLocal || want !== 'claude';
    document.getElementById('gmChoiceNote').textContent = usingLocal ? ''
      : want === 'claude' && !s.claude ? 'Until a key is saved and tested, the game uses the listed choices. You can also do this later in Settings.'
      : 'You can change this at any time in Settings.';
  }
  function choose(id) {
    want = id; message = ''; tone = ''; remember(id);
    const s = status();
    if (id === 'classic' && s.on) void run(() => saveConfig({ ...info.config, enabled: false }));
    else if (id === 'claude' && s.keySaved && !s.claude) void run(() => saveConfig(claudeConfig({ enabled: true, narration: true })));
    else drawAll();
  }

  // Settings: the same key box inside the Claude settings.
  let settingsKey = null;
  function drawAll() {
    drawChoice();
    const mount = document.getElementById('claudeKeyPanel');
    if (mount && !settingsKey) settingsKey = keyPanel(mount, 'claudeKeyInput');
    for (const p of panels) if (!p.mount.hidden) drawKeyPanel(p);
  }
  // Settings saved from the AI settings form change the answer too.
  document.addEventListener('click', event => { if (event.target.closest('#localAISettings > button')) setTimeout(refresh, 500); });
  function openSetup() {
    window.BriarwatchAdventure?.navigate('settings');
    const panel = document.getElementById('localAISettings');
    if (panel) { panel.open = true; panel.scrollIntoView({ block: 'start' }); (document.getElementById('claudeKeyInput') || panel.querySelector('input,select,button'))?.focus(); }
  }
  window.BriarwatchGM = { status, refresh, openSetup };
  drawAll(); void refresh();
})();
