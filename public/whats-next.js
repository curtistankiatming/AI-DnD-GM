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
      // An AI-written adventure's difficulty is picked before setting out, here as on Prepare.
      if (q.trial) text.append(el('p', 'muted', `Difficulty: ${q.trialTier} (fixed for a trial)`));
      else if (q.tiers?.length) {
        const tiers = el('div', 'whats-next-tier adventure-tier'); tiers.setAttribute('role', 'group'); tiers.setAttribute('aria-label', `Difficulty for ${q.name}`);
        tiers.append(el('span', 'muted', q.canChangeTier ? 'Difficulty:' : `Difficulty: ${q.tierName} (fixed once you set out)`));
        if (q.canChangeTier) for (const t of q.tiers) {
          const chosen = t.id === q.tier, b = action(t.name, `btn btn-secondary btn-small${chosen ? ' is-selected' : ''}`, { type: 'adventure-tier', questId: q.id, tier: t.id }, chosen);
          b.title = t.description; b.setAttribute('aria-pressed', String(chosen)); tiers.append(b);
        }
        text.append(tiers);
      }
      // Falling behind (src/xp.js): a little under is a note, more than 5 under is harder.
      if (q.underSteps) text.append(el('p', 'whats-next-under', `You are ${q.underBy} levels under this chapter. In its deciding fight the enemies get +${q.underSteps} to hit and ${q.underSteps * 10}% more damage, and its checks are ${q.underSteps} harder. Bounties help you catch up.`));
      else if (q.underBy > 0) text.append(el('p', 'muted', `You are ${q.underBy} level${q.underBy === 1 ? '' : 's'} under this chapter, so its fights are harder. More than 5 under adds a penalty. Bounties and side jobs help you catch up.`));
      row.append(text, q.canDepart ? action(q.returning ? 'Continue' : 'Set out', 'btn btn-secondary btn-small', { type: 'depart', questId: q.id })
        : el('span', 'muted whats-next-blocked', q.minLevel && q.minLevel < q.level ? `Leaves from ${q.townName}; can start from level ${q.minLevel} (written for ${q.level})` : `Leaves from ${q.townName} at level ${q.level}${w.bounty?.available && q.level > (view.player?.level || 0) ? '. Bounties help you get there.' : ''}`));
      if (q.generated && (w.director?.open || []).some(o => o.id === q.id && !o.started)) row.append(action('Dismiss', 'text-button', { type: 'director-dismiss', questId: q.id }));
      list.append(row);
    }
    // The bounty board: a repeatable fight at your level (src/bounty.js).
    const b = w.bounty;
    if (b?.available && w.bellComplete) {
      const row = el('div', 'whats-next-quest'), text = el('div');
      text.append(el('strong', '', 'Bounty board'), el('span', 'muted', ` · Level ${b.level}`), el('p', 'muted', `${b.name}, out in ${b.place}. Pays ${b.reward.xp} XP${b.catchUp ? ' (more while you are behind the story)' : ''} and ${b.reward.gold} gold${b.capped ? ' (XP capped)' : ''}. Losing or giving up costs ${b.loss} gold. Repeat as often as you like.`));
      row.append(text, action('Take a bounty', 'btn btn-secondary btn-small', { type: 'bounty' }));
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
