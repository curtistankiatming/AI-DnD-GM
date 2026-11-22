'use strict';
// The recap card on Book Four's first screen (docs/book-four/DESIGN.md, "Before
// Book Four"): where Book Three left this save, from its flags. The ending, the
// gift, Aster, Hesk, and the last line of each companion still in the party.
// Plain text, written here, so it needs no AI game master.
const Book = require('./book');
const { QUESTS } = require('./expansion');

// Book Four's first chapter, in story order, whether or not it is on the shelf.
const FIRST = Object.values(QUESTS).find((q) => !q.sideJob && Number(q.book) === 4) || null;

function ending(f) {
  if (f.b3_promise_old) return f.wards_seat
    ? 'Under the stair, the free wards give one memory each, one person at a time, and their giving holds the lid. The nine have rested.'
    : 'Under the stair, the free wards give one memory each, one person at a time. The nine stay, very tired.';
  if (f.b3_promise_hesk && f.b3_three_told) return "Hesk's ring of new bells holds some of the free wards, for a while: only those who stayed in the circle were cast.";
  if (f.b3_promise_hesk) return "Hesk's ring of new bells under the stair holds the free wards for a generation.";
  if (f.b3_stair_sealed) return "The stair is sealed from above, at Vell and at the founders' hatch. The nine carry it alone.";
  return null;
}
function gift(f) {
  if (!f.b3_promise_old) return null;
  if (f.b3_gave_firstnight) return 'Your gift on the floor of given things was the first night you spent in Briarwatch.';
  if (f.b3_gave_forge) return "Your gift was Dera's forge. You do not remember it, and she showed you round it again.";
  if (f.b3_gave_bell) return "Your gift was the first note of Briarwatch's bell, the night it rang again.";
  if (f.b3_gave_name) return 'Your gift was a name, and you did not say whose.';
  return null;
}
function aster(f) {
  if (f.b3_bell_aster && f.b3_promise_old) return "Aster Vey rested. Vell's great bell went quiet, and its people went over the pass.";
  if (f.b3_bell_aster) return "Aster Vey is in Vell's great bell.";
  if (f.b3_promise_old) return "Aster Vey stayed in Briarwatch's bell for one more generation, to see Pim grow old.";
  return "Aster Vey is still in Briarwatch's bell. Nobody has asked her to go anywhere.";
}
function hesk(f) {
  if (f.b3_promise_old) return 'Hesk was judged at Highpass in the open, and is in a cell under its gatehouse.';
  if (f.b3_promise_hesk) return 'Hesk came up the stair, and the free wards call him their hero.';
  if (f.b3_stair_sealed) return "Hesk went back down the stair alone, with a lamp and a week's food, before the way was sealed.";
  return null;
}
const COMPANION = {
  orin: (f) => (f.b3_mags_forgives ? 'Orin went to Saltwick in the spring for the lamps, as Mags asked him.'
    : f.b3_orin_tried ? 'Orin asked to be tried at Saltwick, and was. He owes its roof council a season of lamps.'
      : "Orin stayed at Dera's forge and taught Pim knots."),
  maren: (f) => (f.b3_seal_taken ? 'Maren is the seal: every week in Highpass she hears the people who come to give.'
    : f.b3_maren_gives ? 'Maren gave a day she would have written first, and knows she has forgotten it.'
      : 'Maren keeps no list. She goes to the shrine on the Briarwood side in the mornings.'),
  nessa: (f) => (f.nessa_keeper === 'later' && f.b3_wren_cast ? 'Nessa has the forge-signal key on a cord round her neck, and said she would go back to Cinder Fold to keep it.'
    : f.nessa_keeper === 'later' && f.b3_wren_waits ? 'In the spring Nessa went back over the pass to Cinder Fold, to take the forge-signal key from Wren.'
      : f.nessa_keeper === 'later' ? "Nessa said yes to the forge-signal. Wren keeps it from a chair, and Nessa's yes is held for her."
        : f.nessa_keeper === 'declined' ? 'Nessa said no to the forge-signal, and writes to Cinder Fold.'
          : f.b3_nessa_gives ? 'Nessa has forgotten one thing about Wren, and asked you to tell her everything you could.'
            : f.b3_wren_cast ? 'Nessa writes about Wren, and sends it to Cinder Fold to be read out at the lid. She does not keep a copy.'
              : 'Nessa writes to Wren, and does not keep a copy.')
};

// The card while Book Four's first chapter is next and not yet begun; null otherwise.
function recap(state) {
  const f = state?.story?.flags || {}, w = state?.world || {};
  if (!FIRST || !f.b3_done || Book.chapter(state)?.id !== FIRST.id || w.completed?.[FIRST.id] || w.activeQuest === FIRST.id) return null;
  const party = new Set((state.party || []).map((m) => m.id));
  const lines = [ending(f), gift(f), aster(f), hesk(f), ...Object.keys(COMPANION).filter((id) => party.has(id)).map((id) => COMPANION[id](f))].filter(Boolean);
  return { title: 'Where Book Three left you', lines };
}

module.exports = { recap };
