/* Public-playtest controls are bundled only into the offline edition. */
(function () {
  'use strict';
  const client = window.BriarwatchOffline;
  if (!client) return;
  function el(tag, text) { const n = document.createElement(tag); if (text) n.textContent = text; return n; }
  function button(text, fn) { const b = el('button', text); b.type = 'button'; b.className = 'btn btn-secondary btn-small'; b.addEventListener('click', fn); return b; }
  function download(name, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCurrent() {
    if (!state) { toast('Start or load a campaign first.', 'warning'); return; }
    download(`${state.publicTest?.mode === 'sandbox' ? 'sandbox-' : ''}briarwatch-save.json`, client.exportText(state));
  }
  function diagnostic() {
    const report = { build: client.build, mode: state?.publicTest?.mode || 'no-campaign', class: state?.player.classId,
      level: state?.player.level, scene: view?.scene.id, browser: navigator.userAgent,
      limitations: 'Build data only: no name, dialogue history, save or credentials included.' };
    download('briarwatch-test-report.json', JSON.stringify(report, null, 2));
  }
  const notes = [];
  const inputs = [];
  function makePanel(parent, setupPanel) {
    const panel = el('section'); panel.className = 'preview-notice';
    panel.append(el('strong', `PUBLIC PLAYTEST · ${client.build.version} · ${client.build.sourceSha256.slice(0, 12)}`));
    panel.append(el('p', 'Unfinished game · Levels 1–10 · Deterministic narration · Runs in your browser, with no AI account or shared server.'));
    const status = el('p', 'Normal campaign. Browser saves belong to this browser profile, not an online account. Export a backup before updating.');
    status.className = 'preview-status'; notes.push(status); panel.append(status);
    const tools = el('div'); tools.className = 'preview-tools';
    tools.append(button('Export current save', exportCurrent));
    const input = el('input'); input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true; inputs.push(input);
    input.addEventListener('change', async () => {
      try {
        if (busy || !input.files[0]) return;
        if (input.files[0].size > 1024 * 1024) throw new Error('Save imports must be smaller than 1 MiB.');
        const payload = client.importText(await input.files[0].text());
        if (state && !confirm('Replace the current on-screen campaign? Export it first if needed. Existing named saves are not deleted.')) return;
        eventHistory = []; ingestPayload(payload, { appendEvents: false });
        dom.setupOverlay.classList.add('is-hidden'); dom.gameLayout.classList.remove('is-hidden');
        dom.saveSlotInput.value = payload.state.publicTest?.mode === 'sandbox' ? 'sandbox-import' : 'imported-campaign';
        toast('Save imported. Use Quick Save to keep a browser copy.', 'good');
      } catch (error) { toast(error.message, 'bad'); }
      finally { input.value = ''; }
    });
    tools.append(button('Import save', () => input.click()), input);
    tools.append(button('Resume autosave', () => loadGame('autosave')));
    tools.append(button('Export bug report', diagnostic));
    const link = el('a', 'Report a bug on GitHub'); link.href = 'https://github.com/curtistankiatming/AI-DnD-GM/issues/new?template=playtest.yml'; link.target = '_blank'; link.rel = 'noopener noreferrer'; tools.append(link);
    panel.append(tools);
    const details = el('details'); details.append(el('summary', 'Sandbox checkpoints — test later stages without grinding'));
    details.append(el('p', 'Creates a separate, labelled test character with granted XP, 400 gold, supplies and prerequisite story flags. Not natural progression. Original saves stay untouched. Higher-level scenarios raise the selected level to their minimum.'));
    const controls = el('div'); controls.className = 'preview-tools';
    const level = el('select'); level.setAttribute('aria-label', 'Sandbox level');
    for (let n = 1; n <= 10; n++) { const o = el('option', `Level ${n}`); o.value = n; level.append(o); } level.value = '5';
    const scenario = el('select'); scenario.setAttribute('aria-label', 'Sandbox scenario');
    const town = el('option', 'Town / supplies / practice'); town.value = 'town'; scenario.append(town);
    for (const s of client.scenarios) { const o = el('option', `${s.name} (level ${s.level}+)`); o.value = s.id; scenario.append(o); }
    controls.append(level, scenario, button('Start sandbox', async () => {
      if (busy) return;
      if (state && !confirm('Switch to a sandbox character? Export unsaved progress first. Named campaign saves and normal autosave will not be overwritten.')) return;
      try {
        setBusy(true);
        const { payload } = await api('/api/test/start', { method: 'POST', body: JSON.stringify({ classId: setupPanel ? setup.classId : state?.player.classId || setup.classId, level: Number(level.value), questId: scenario.value }) });
        eventHistory = []; ingestPayload(payload);
        dom.setupOverlay.classList.add('is-hidden'); dom.gameLayout.classList.remove('is-hidden');
        dom.saveSlotInput.value = 'sandbox-session';
        toast('Sandbox fixture created. Choose pending rewards and use the expedition board.', 'good');
      } catch (error) { toast(error.message, 'bad'); }
      finally { setBusy(false); }
    }));
    details.append(controls); panel.append(details);
    panel.append(el('p', 'Known limitations: Orin’s short-rest resource bug (#2), recurring expedition structure, no live AI narrator in this edition. Clearing browser data can erase local saves; file:// storage varies by browser.'));
    parent.prepend(panel);
  }
  makePanel(document.querySelector('.setup-card'), true);
  makePanel(document.querySelector('.app-shell'), false);
  const originalIngest = ingestPayload;
  let warnedStorage = false;
  ingestPayload = function (payload, options) {
    originalIngest(payload, options);
    if (payload.state) dom.gameLayout.classList.remove('is-hidden');
    const sandbox = state?.publicTest?.mode === 'sandbox';
    for (const note of notes) note.textContent = sandbox
      ? `SANDBOX · Granted level ${state.publicTest.grantedLevel} / ${state.publicTest.scenario}. Saves are separated from normal campaigns. These outcomes are not evidence of earned progression.`
      : 'Normal campaign · Autosaved in this browser profile when storage is available. Export a backup before updating.';
    if (payload.storageWarning) {
      for (const note of notes) note.textContent += ' STORAGE UNAVAILABLE: export your save to keep progress.';
      if (!warnedStorage) { warnedStorage = true; toast(payload.storageWarning, 'warning'); }
    }
  };
  // A fresh campaign must not Quick Save over the last sandbox/imported slot.
  const originalStart = startCampaign;
  dom.startCampaignBtn.removeEventListener('click', originalStart);
  dom.startCampaignBtn.addEventListener('click', async () => {
    client.storage.setItem('dnd-ai-gm-v4-last-slot', 'campaign-save');
    await originalStart();
  });
  const originalSave = saveGame;
  saveGame = function (slot) {
    if (state?.publicTest?.mode !== 'sandbox' && String(slot || '').startsWith('sandbox-')) slot = 'campaign-save';
    return originalSave(slot);
  };
})();
