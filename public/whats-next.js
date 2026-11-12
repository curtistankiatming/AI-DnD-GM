/* "What's next?" on the story screen: the expeditions you can leave on and a wish box
   that asks the AI game master to write a new one. Presentation only: every button sends
   the same validated action or chat command as the Prepare screen. */
(function () {
  'use strict';
  const scroll = document.getElementById('adventureScroll');
  if (!scroll || typeof renderGame !== 'function') return;
  const offline = Boolean(window.BriarwatchOffline);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const board = el('section', 'whats-next'); board.id = 'whatsNext'; board.hidden = true; board.setAttribute('aria-labelledby', 'whatsNextTitle');
  (document.getElementById('adventureApproaches') || scroll.lastElementChild).after(board);
  let writing = false, wish = '';

  function action(label, cls, payload, disabled = false) {
    const b = el('button', cls, label); b.type = 'button'; b.dataset.disabled = String(Boolean(disabled)); b.disabled = busy || disabled;
    b.addEventListener('click', () => { if (!busy && !disabled) void sendAction(payload); });
    return b;
  }
  async function ask(input) {
    if (busy || writing || !window.BriarwatchChat) return;
    wish = input.value.trim(); writing = true; draw();
    const before = (view?.world?.director?.open || []).length;
    try { await window.BriarwatchChat.send(('/adventure ' + wish).trim()); }
    finally {
      writing = false;
      if ((view?.world?.director?.open || []).length > before) { wish = ''; toast(view?.world?.director?.sideQuests ? 'A new side quest is on your board.' : 'A new adventure is on your board.', 'good'); }
      draw();
    }
  }
  function wishCard(w) {
    const d = w.director, gm = window.BriarwatchGM?.status() || { on: false, known: false };
    const card = el('div', 'whats-next-wish'); card.id = 'wishCard';
    const side = Boolean(d?.sideQuests);
    card.append(el('h4', '', side ? 'Ask for a side quest' : 'Ask for a new adventure'));
    if (offline) { card.append(el('p', 'muted', 'New adventures written by the AI game master need the installed game with Claude turned on. This browser edition makes no AI requests.')); return card; }
    if (!w.bellComplete) {
      card.dataset.locked = 'true';
      card.append(el('p', '', 'Locked for now. Once the bell investigation is finished, the AI game master can write new adventures just for you, built on the choices you have made.'));
      if (gm.known && !gm.on) card.append(setupButton());
      return card;
    }
    if (writing) {
      card.dataset.writing = 'true';
      const note = el('p', 'whats-next-writing', 'The game master is writing your next adventure. This can take up to a minute.'); note.setAttribute('role', 'status');
      card.append(note); if (wish) card.append(el('p', 'muted', `Your wish: ${wish}`));
      return card;
    }
    if (gm.known && !gm.on) {
      card.append(el('p', '', 'The AI game master can write a new adventure for you whenever you want one. It is turned off at the moment.'), setupButton());
      return card;
    }
    if (!d?.canCommission) { card.append(el('p', 'muted', d?.reason || 'A new adventure is not available right now.')); return card; }
    card.append(el('p', '', side ? 'The written story comes first. Claude writes a small side quest tied to your current chapter; it can help you catch up to the chapter\'s level, never past it.' : 'Claude writes your next adventure from what has happened so far. The game sets its level and rewards.'));
    const label = el('label', 'whats-next-field', 'Your wish (optional)'), input = el('input');
    input.id = 'wishInput'; input.type = 'text'; input.maxLength = 200; input.placeholder = 'something in the marshes, or a rival from my past'; input.value = wish; input.disabled = busy;
    input.addEventListener('input', () => { wish = input.value; });
    const go = el('button', 'btn btn-primary btn-small', side ? 'Write me a side quest' : 'Write me a new adventure'); go.type = 'button'; go.id = 'wishBtn'; go.disabled = busy;
    go.addEventListener('click', () => void ask(input));
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); go.click(); } });
    label.append(input);
    const row = el('div', 'whats-next-row'); row.append(label, go); card.append(row);
    return card;
  }
  function setupButton() {
    const b = el('button', 'btn btn-secondary btn-small', 'Turn on Claude'); b.type = 'button'; b.dataset.readOnly = 'true';
    b.addEventListener('click', () => window.BriarwatchGM?.openSetup());
    return b;
  }
  function draw() {
    const w = view?.world;
    const show = Boolean(state && w && w.town && !view.combat?.active);
    board.hidden = !show;
    if (!show) { board.replaceChildren(); return; }
    const typing = document.activeElement?.id === 'wishInput', caret = typing ? document.activeElement.selectionStart : null;
    const title = el('h3', '', "What's next?"); title.id = 'whatsNextTitle';
    const list = el('div', 'whats-next-list');
    if (w.activeQuest) list.append(action(w.pendingBattle ? 'Resume the interrupted fight' : 'Resume your expedition', 'btn btn-primary btn-small', { type: 'resume' }));
    if (!w.bellComplete) list.append(el('p', '', 'Follow the story choices above to finish the bell investigation. More roads open after that.'));
    for (const q of (w.bellComplete ? w.quests : []).slice(0, 4)) {
      const row = el('div', 'whats-next-quest'), text = el('div');
      text.append(el('strong', '', q.name), el('span', 'muted', ` · Level ${q.level}${q.generated ? ' · written for you' : ''}`), el('p', 'muted', q.brief));
      row.append(text, q.canDepart ? action(q.returning ? 'Continue' : 'Set out', 'btn btn-secondary btn-small', { type: 'depart', questId: q.id })
        : el('span', 'muted whats-next-blocked', `Leaves from ${q.townName} at level ${q.level}`));
      if (q.generated && (w.director?.open || []).some(o => o.id === q.id && !o.started)) row.append(action('Dismiss', 'text-button', { type: 'director-dismiss', questId: q.id }));
      list.append(row);
    }
    const more = el('button', 'text-button', 'Rest, shop and see everything in Prepare'); more.type = 'button'; more.dataset.readOnly = 'true';
    more.addEventListener('click', () => window.BriarwatchAdventure?.navigate('prepare'));
    board.replaceChildren(title, list, wishCard(w), more);
    if (typing) { const input = document.getElementById('wishInput'); if (input) { input.focus(); try { input.setSelectionRange(caret, caret); } catch { /* not a text field */ } } }
  }
  const baseRender = renderGame;
  renderGame = function () { baseRender(); draw(); };
  document.addEventListener('briarwatch:ai', draw);
  draw();
})();
