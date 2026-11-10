/* Step 4: party sheet, journal and town. Presentation only.
 * Every control keeps its original handler; nodes are moved or decorated, never copied.
 * No engine rule, API payload, model prompt or save field is read or written here. */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const party = byId('workspace-party'), journalPane = byId('workspace-journal'), prepare = byId('workspace-prepare');
  if (!party || !journalPane || !prepare || typeof renderGame !== 'function') return;
  const el = (tag, cls, text) => createElement(tag, cls, text);
  const quiet = (text, fn, cls = 'btn btn-secondary btn-small') => { const b = el('button', cls, text); b.type = 'button'; b.dataset.readOnly = 'true'; b.addEventListener('click', fn); return b; };
  const go = id => window.BriarwatchAdventure?.navigate(id);
  document.body.classList.add('sheets-ui');

  // ---- Party sheet: jump links, a reminder for waiting choices, a compact pack ----
  const sections = [['Hero', () => party.querySelector('.character-panel')], ['Companions', () => byId('partyCards')?.closest('section')],
    ['Gear', () => byId('equipmentSlots')?.closest('section')], ['Pack', () => byId('inventoryCards')?.closest('section')]];
  const jump = el('nav', 'sheet-jump'); jump.id = 'partyJump'; jump.setAttribute('aria-label', 'Jump to a part of the party sheet');
  for (const [name, find] of sections) jump.append(quiet(name, () => find()?.scrollIntoView({ block: 'start', behavior: 'instant' })));
  const waiting = el('div', 'sheet-waiting'); waiting.id = 'partyPending'; waiting.hidden = true; waiting.setAttribute('role', 'status');
  const waitingText = el('p');
  waiting.append(waitingText, quiet('Choose now', () => { go('prepare'); byId('progressionPanel')?.scrollIntoView({ block: 'start', behavior: 'instant' }); }, 'btn btn-primary btn-small'));
  (party.querySelector('.workspace-title + p') || party.firstElementChild).after(jump, waiting);

  function pendingChoices() {
    const p = view?.progression; if (!p) return 0;
    return (p.pending?.length || 0) + (p.specializationOptions?.length ? 1 : 0) + (p.renown?.pending || 0);
  }
  const basePack = renderInventory;
  renderInventory = function () {
    basePack();
    for (const card of byId('inventoryCards').querySelectorAll('.inventory-card[data-inventory-id]')) {
      const item = view.inventory.find(i => i.id === card.dataset.inventoryId); if (!item) continue;
      card.dataset.kind = item.category;
      // The flavour text and the reminder that gear can be compared are one tap away under Inspect and Compare.
      const usage = card.querySelector('.item-usage'), owners = card.querySelector('.item-owners');
      if (usage && item.canEquip) usage.classList.add('sheet-fold');
      if (owners && owners.textContent.startsWith('No equipped')) owners.classList.add('sheet-fold');
    }
  };

  // ---- Journal: status as a small label, empty sections folded into one line ----
  const records = byId('journalRecords'), story = byId('storyJournal');
  const empties = el('p', 'muted journal-empties'); empties.id = 'journalEmpties';
  if (records) records.after(empties);
  function decorateJournal() {
    if (!records) return;
    const none = [];
    for (const block of records.querySelectorAll('.journal-section')) {
      const rows = block.querySelectorAll('.journal-record');
      block.classList.toggle('is-empty', !rows.length);
      if (!rows.length) none.push(block.querySelector('h4')?.textContent || '');
      for (const row of rows) {
        const title = row.querySelector(':scope > strong'); if (!title || title.querySelector('.journal-status')) continue;
        const m = title.textContent.match(/^(.*) \[([^\]]*)\]$/); if (!m) continue;
        // The text still reads "Title [status]"; only the brackets are hidden from sight.
        const tag = el('span', 'journal-status'); tag.dataset.status = m[2].split(',')[0].trim();
        tag.append(el('span', 'workspace-sr-only', '['), m[2], el('span', 'workspace-sr-only', ']'));
        title.replaceChildren(m[1], ' ', tag);
      }
    }
    records.querySelector(':scope > p')?.classList.add('journal-current');
    empties.textContent = none.length ? 'Nothing yet under: ' + none.join(', ') + '.' : '';
  }
  function syncJournal() {
    const filter = journalPane.querySelector('.journal-filters [aria-pressed=true]')?.dataset.filter || 'all';
    journalPane.dataset.filter = filter;
    // The older Clues list repeats the Verified facts above it. Keep it for a single-topic filter
    // and whenever it holds something the facts do not (an epilogue, or a clue from an older save).
    const clues = byId('clueList'), box = clues?.closest('section');
    if (box && view) {
      const facts = new Set((view.journal?.facts || []).map(f => f.title));
      const extra = clues.querySelector('.ending-summary') || (view.clues || []).some(c => !facts.has(c.name));
      box.classList.toggle('is-repeat', !extra);
    }
  }
  if (records) new MutationObserver(decorateJournal).observe(records, { childList: true });
  journalPane.querySelector('.journal-filters')?.addEventListener('click', () => setTimeout(syncJournal, 0));

  // ---- Town: the page title first, waiting choices next, the notice board before the services ----
  const title = prepare.querySelector('.workspace-title'), lede = title?.nextElementSibling;
  function orderTown() {
    const want = [title, lede, byId('progressionPanel'), byId('readinessPanel'), byId('developmentOverview'), byId('preparationCategories'), byId('worldPanel')].filter(Boolean);
    if (want.some((node, i) => prepare.children[i] !== node)) prepare.prepend(...want);
    const root = byId('worldPanel'); if (!root) return;
    const board = root.querySelector(':scope > details[data-section=expedition]'), services = root.querySelector(':scope > details[data-section=services]');
    if (board && services && services.nextElementSibling === board) services.before(board);
    const name = root.querySelector(':scope > h2');
    if (name && !root.querySelector('.town-purse')) {
      const purse = el('p', 'town-purse'); purse.append(el('strong', '', `${view.player.gold} gold`), ' in your purse');
      name.after(purse);
    }
  }

  function sync() {
    if (!state || !view) return;
    const n = pendingChoices();
    waiting.hidden = !n;
    waitingText.textContent = n === 1 ? 'A new ability or talent is waiting for you to choose.' : `${n} choices for your hero are waiting.`;
    const tab = byId('nav-prepare'); if (tab) { if (n) tab.dataset.waiting = String(n); else delete tab.dataset.waiting; }
    decorateJournal(); syncJournal(); orderTown();
  }
  const baseRender = renderGame;
  renderGame = function () { baseRender(); sync(); };
  window.BriarwatchSheets = { sync };
  if (state && view) { renderInventory(); sync(); }
})();
