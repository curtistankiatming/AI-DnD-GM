/* First steps: a one-time "How to play" card and example prompts under the message box.
   Presentation only. Nothing here changes game state; a prompt only fills the message box. */
(function () {
  'use strict';
  const scroll = document.getElementById('adventureScroll'), composer = document.getElementById('adventureComposer');
  const A = window.BriarwatchAdventure;
  if (!scroll || !composer || !A) return;
  const offline = Boolean(window.BriarwatchOffline);
  let store = null;
  try { store = offline ? window.BriarwatchOffline.storage : window.localStorage; } catch { store = null; }
  const KEY = 'briarwatch.howToPlay.v1';
  const seen = () => { try { return store?.getItem(KEY) === 'seen'; } catch { return false; } };
  const remember = () => { try { store?.setItem(KEY, 'seen'); } catch { /* the card simply shows again next time */ } };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const btn = (text, cls, fn) => { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; };

  // How to play: three lines, shown until dismissed, reopened from the message box.
  const card = el('section', 'how-to-play'); card.id = 'howToPlay'; card.setAttribute('aria-labelledby', 'howToPlayTitle');
  const title = el('h3', '', 'How to play'); title.id = 'howToPlayTitle';
  const steps = el('ol');
  const typed = el('li');
  steps.append(
    el('li', '', 'Read the story, then pick one of the choices under "What do you do?". The percentage is your chance of success.'),
    typed,
    el('li', '', 'Party, Journal and Prepare at the top show your hero, what you have learned and the shop. Looking never costs a turn.'));
  const done = btn('Got it', 'btn btn-primary btn-small', () => { remember(); card.hidden = true; reopen.hidden = false; });
  card.append(title, steps, done);
  const anchor = document.getElementById('adventureApproaches');
  if (anchor) anchor.before(card); else scroll.prepend(card);
  const reopen = btn('How to play', 'text-button how-to-link', () => { card.hidden = false; reopen.hidden = true; A.navigate('adventure'); card.scrollIntoView({ block: 'nearest' }); done.focus(); });
  reopen.id = 'howToPlayBtn';
  (composer.querySelector('.composer-meta') || composer).append(reopen);
  card.hidden = seen(); reopen.hidden = !card.hidden;

  // Example prompts. With the AI game master off, typed ideas cannot be resolved, so say how to turn it on instead.
  const ideas = el('div', 'prompt-ideas'); ideas.id = 'promptIdeas';
  const row = composer.querySelector('.composer-row');
  if (row) row.after(ideas); else composer.append(ideas);
  const input = document.getElementById('actionInput');
  const PROMPTS = [
    ['action', 'Look around for anything out of place'],
    ['dialogue', 'Who here saw what happened?'],
    ['question', 'What do we know so far?']
  ];
  let aiOn = false;
  function use(mode, text) { A.selectMode(mode); input.value = text; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }
  function openAISettings() {
    A.navigate('settings');
    const panel = document.getElementById('localAISettings');
    if (panel) { panel.open = true; panel.scrollIntoView({ block: 'start' }); panel.querySelector('input,select,button')?.focus(); }
  }
  function draw() {
    ideas.replaceChildren();
    typed.textContent = aiOn
      ? 'Or type your own idea in the box at the bottom. The game master shows you the odds before anything is rolled.'
      : offline
        ? 'The box at the bottom takes questions and simple commands such as "buy 2 healing potions".'
        : 'To try your own ideas, turn on the AI game master in Settings. Until then the box at the bottom takes questions and simple commands.';
    if (aiOn) {
      ideas.append(el('span', 'prompt-ideas-label', 'Try:'));
      for (const [mode, text] of PROMPTS) ideas.append(btn(text, 'prompt-idea', () => use(mode, text)));
    } else if (!offline) {
      ideas.append(el('span', 'prompt-ideas-label', 'Want to try your own ideas?'), btn('Turn on the AI game master', 'prompt-idea', openAISettings));
    }
    ideas.hidden = !ideas.children.length;
  }
  async function refresh() {
    if (offline || typeof api !== 'function') { draw(); return; }
    try { const { payload } = await api('/api/ai/settings'); aiOn = Boolean(payload?.config?.enabled); } catch { aiOn = false; }
    draw();
  }
  // Saving AI settings is the only way the answer changes during a session.
  document.addEventListener('click', event => { if (event.target.closest('#localAISettings button')) setTimeout(refresh, 600); });
  // Hide the examples while the player is typing; the box is also cleared by code after sending.
  const typing = () => ideas.classList.toggle('is-typing', Boolean(input.value.trim()));
  input.addEventListener('input', typing); input.addEventListener('focus', typing); input.addEventListener('blur', typing);
  input.form?.addEventListener('submit', () => setTimeout(typing, 0));
  draw(); void refresh();
})();
