/* UI-only session safety. No model calls or changes to game/save schemas. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BriarwatchSession = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  function snapshot(value) {
    function stable(x) {
      if (Array.isArray(x)) return x.map(stable);
      if (!x || typeof x !== 'object') return x;
      return Object.fromEntries(Object.keys(x).sort().filter(k => k !== 'updatedAt').map(k => [k, stable(x[k])]));
    }
    return JSON.stringify(stable(value));
  }
  function sameCampaign(a, b) {
    // Older saves lacking creation identity are deliberately not assumed equal.
    return Boolean(a?.createdAt && b?.createdAt && a.createdAt === b.createdAt &&
      a.campaignId === b.campaignId && a.player?.name === b.player?.name &&
      a.player?.classId === b.player?.classId &&
      (a.publicTest?.mode || 'campaign') === (b.publicTest?.mode || 'campaign'));
  }
  function slotName(raw, state) {
    let s = String(raw || '').trim().replace(/\.json$/i, '');
    const sandbox = state?.publicTest?.mode === 'sandbox';
    if (sandbox && !s.toLowerCase().startsWith('sandbox-')) s = 'sandbox-' + s;
    if (!sandbox && s.toLowerCase().startsWith('sandbox-')) throw new Error('Use a normal campaign save name, not the reserved sandbox- prefix.');
    if (!/^[a-z0-9][a-z0-9 _-]{0,47}$/i.test(s) || s !== s.trim() || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(s))
      throw new Error('Use 1–48 letters, numbers, spaces, hyphens or underscores; reserved Windows names are not allowed.');
    if (/^(sandbox-)?autosave$/i.test(s)) throw new Error('Autosave is a rolling checkpoint. Use a named save to keep a separate copy.');
    return s;
  }
  function suggestedSlot(state, suffix) {
    const name = String(state?.player?.name || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campaign';
    return slotName(name.slice(0, 20) + '-' + String(suffix).replace(/[^a-z0-9]/gi, '').slice(0, 12), state);
  }
  function continueSave(saves, previous) {
    const available = saves.filter(s => !s.corrupted);
    return available.find(s => s.slot === previous) || available.find(s => !s.slot.startsWith('sandbox-')) || available[0] || null;
  }
  function emptyChoices(view) {
    if (view.combat?.active) return 'Use the combat controls for your action and target.';
    if (view.chat?.road?.present) return 'Choose a Lantern Road approach in the conversation panel above, or describe one action.';
    if (view.chat?.courier?.active && view.chat?.courierAvailable) return 'Choose a courier approach in the conversation panel above, or describe one action.';
    if (view.scene.defeat) return 'Recover using the available controls, or load a saved campaign.';
    if (view.scene.ending) return 'The chapter has reached its epilogue.';
    return 'No general story approach is offered here. Check the current objective and available conversation or town controls.';
  }
  function describeSave(s) {
    return s.corrupted ? `“${s.slot}” (unreadable save)` : `“${s.slot}” — ${s.playerName}, level ${s.level}, ${s.scene}`;
  }
  function create(env) {
    let sourceSlot = null, activeSlot = null, savedSnapshot = null, activeDiskSnapshot = null, working = false, saves = [];
    const preferences = {
      get() { try { return env.storage()?.getItem('dnd-ai-gm-v4-last-slot'); } catch { return null; } },
      set(slot) { try { env.storage()?.setItem('dnd-ai-gm-v4-last-slot', slot); } catch { /* Saved file remains successful even if preference storage fails. */ } }
    };
    const current = () => env.state();
    const dirty = () => Boolean(current() && snapshot(current()) !== savedSnapshot);
    const hasDraft = () => Boolean(env.draft().trim());
    const changed = () => env.changed?.({activeSlot, dirty: dirty(), saves, continueSave: continueSave(saves, preferences.get())});
    async function request(route, options) {
      const {response, payload} = await env.api(route, options);
      if (!response.ok) throw new Error(payload.error || 'The operation did not complete.');
      return payload;
    }
    async function list() {
      const out = await request('/api/session/list');
      if (!Array.isArray(out.saves)) throw new Error('The save list could not be read. No save was changed.');
      saves = out.saves; changed(); return saves;
    }
    async function run(fn) {
      if (working || env.busy()) return false;
      working = true; env.setBusy(true);
      try { return await fn(); }
      catch (e) { env.notify(e.message, 'bad'); return false; }
      finally { working = false; env.setBusy(false); changed(); }
    }
    function adopt(payload, {slot = null, loaded = false} = {}) {
      env.activate(payload);
      const rolling = /^(sandbox-)?autosave$/i.test(slot || '');
      sourceSlot = slot;
      activeSlot = rolling ? null : slot;
      savedSnapshot = loaded ? snapshot(current()) : null;
      activeDiskSnapshot = loaded && !rolling ? snapshot(payload.state) : null;
      env.slot(activeSlot || suggestedSlot(current(), env.unique()));
      env.clearDraft();
      if (slot) preferences.set(slot);
      changed();
    }
    async function write(rawSlot) {
      if (!current()) return false;
      let slot = slotName(rawSlot, current());
      const fresh = await list();
      const found = fresh.find(s => s.slot.toLowerCase() === slot.toLowerCase());
      if (found) {
        slot = found.slot; // Honour actual stored spelling on all operating systems.
        let existing = null;
        if (!found.corrupted) existing = await request('/api/session/load?slot=' + encodeURIComponent(slot));
        const same = sameCampaign(existing?.state, current());
        const externalChange = activeDiskSnapshot && existing && snapshot(existing.state) !== activeDiskSnapshot;
        if (slot !== activeSlot || !same || externalChange) {
          const choice = await env.ask({title: 'Replace this saved file?',
            message: `${describeSave(found)} will be replaced by ${current().player.name}. ${externalChange ? 'The saved file has changed since this session loaded or saved it. ' : ''}Choose Cancel to keep it, or save under a different name.`,
            choices: [['cancel', 'Cancel'], ['replace', 'Replace saved file']]});
          if (choice !== 'replace') return false;
        }
      }
      const receipt = await request('/api/session/save', {method: 'POST', body: JSON.stringify({slot, state: current()})});
      if (receipt.status !== 'saved' || typeof receipt.slot !== 'string') throw new Error('The save was not confirmed. Keep the current campaign open.');
      activeSlot = receipt.slot; sourceSlot = activeSlot; savedSnapshot = snapshot(current()); activeDiskSnapshot = savedSnapshot;
      env.slot(activeSlot); preferences.set(activeSlot); env.notify(`Saved as “${activeSlot}”.`, 'good'); changed();
      // A list/preference failure after a successful write is not a failed save.
      try { await list(); } catch (e) { env.notify('Save succeeded, but the list could not refresh: ' + e.message, 'warning'); }
      return true;
    }
    async function leave(label) {
      if (!current() || (!dirty() && !hasDraft())) return true;
      const choice = await env.ask({title: `Before ${label}`,
        message: `${current().player.name} has ${dirty() ? 'progress or conversation not saved to a named slot' : 'an unsent message'}. Save the campaign, discard these on-screen changes, or stay here. Unsent drafts are not included in saves.`,
        choices: [['cancel', 'Cancel'], ['save', 'Save and continue'], ['discard', 'Discard and continue']]});
      if (choice === 'save') return await write(activeSlot || env.slot());
      return choice === 'discard';
    }
    return {
      dirty, hasDraft, changed, list,
      status: () => ({activeSlot, dirty: dirty(), working, saves: [...saves], continueSave: continueSave(saves, preferences.get())}),
      save: raw => run(() => write(raw === undefined ? env.slot() : raw)),
      quickSave: () => run(() => write(activeSlot || env.slot())),
      replace: (loader, options = {}) => run(async () => {
        if (!await leave(options.label || 'replacing this campaign')) return false;
        // New browser campaigns replace their rolling autosave even from the home screen.
        if (!current() && options.rollingSlot && (await list()).some(s => s.slot === options.rollingSlot)) {
          const answer = await env.ask({title: 'Keep your existing autosave?', message: 'Starting another campaign replaces the rolling normal autosave. Continue or load it first to make a named save. Existing named saves are not deleted.', choices: [['cancel', 'Cancel'], ['replace', 'Start new campaign']]});
          if (answer !== 'replace') return false;
        }
        const payload = await loader();
        if (!payload?.state || !payload?.view || payload.result?.ok === false) throw new Error('The new campaign could not be opened. Current progress is still on screen.');
        adopt(payload, options); return true;
      }),
      load: slot => run(async () => {
        // Read/validate the target first; a corrupt or missing file never discards current progress.
        let payload = await request('/api/session/load?slot=' + encodeURIComponent(slot));
        if (!payload?.state || !payload?.view) throw new Error('This save could not be loaded.');
        if (!await leave('loading another save')) return false;
        // Save-and-continue may have updated this same target; never adopt the stale preflight copy.
        payload = await request('/api/session/load?slot=' + encodeURIComponent(slot));
        if (!payload?.state || !payload?.view) throw new Error('This save could not be loaded.');
        adopt(payload, {slot, loaded: true}); env.notify(`Loaded “${slot}”.`, 'good'); return true;
      }),
      delete: slot => run(async () => {
        const found = (await list()).find(s => s.slot === slot);
        if (!found) throw new Error('That save no longer exists. Refresh the list.');
        const answer = await env.ask({title: 'Delete saved campaign?', message: `${describeSave(found)} will be permanently deleted. The open campaign, if any, is not deleted. This cannot be undone.`, choices: [['cancel', 'Cancel'], ['delete', 'Delete saved file']]});
        if (answer !== 'delete') return false;
        const out = await request('/api/session/delete?slot=' + encodeURIComponent(slot), {method: 'DELETE'});
        if (out.status !== 'deleted') throw new Error('Deletion was not confirmed.');
        if (activeSlot === slot || sourceSlot === slot) { sourceSlot = null; activeSlot = null; savedSnapshot = null; activeDiskSnapshot = null; env.slot(suggestedSlot(current(), env.unique())); }
        env.notify(`Deleted “${slot}”.`, 'neutral'); await list(); return true;
      })
    };
  }
  return {snapshot, sameCampaign, slotName, suggestedSlot, continueSave, emptyChoices, create};
});
