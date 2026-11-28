'use strict';
// One rule for every Claude prompt that writes companions. Playtests showed each
// companion's listed habits (taking the door, offering to carry things, knots)
// turning up in nearly every passage until they read as catchphrases. The
// tavern playtest (26 November 2026) found the same with silence: a quiet hire
// and Maren "said nothing at all" in passage after passage. The full Claude run
// (27 November 2026) found Maren opening nearly every answer by turning the
// question back ("Do I trust you?", "You ask that as though you already know"),
// and Orin finishing a knot "before he answers" in 8 of 9 replies.
const VOICE_RULE='A companion\'s voice describes who they are, not lines to repeat. Show at most one of their habits in a passage, vary which one, and show none at all unless the moment itself calls for it (most passages and replies show none; their voice still shows in how they speak), and let them mostly speak plainly about what is in front of them. A companion with nothing to do in a passage is simply left out: do not fill the gap with them saying nothing, watching or staying still. When the player speaks to a companion, the companion answers in their first line (or says plainly that they do not know or will not say): do not open by repeating the question, asking it back, or remarking on how or why it was asked, and do not hold the answer back behind a pause or a bit of business such as finishing a knot or a long look.';
module.exports={VOICE_RULE};
