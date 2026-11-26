'use strict';
// One rule for every Claude prompt that writes companions. Playtests showed each
// companion's listed habits (taking the door, offering to carry things, knots)
// turning up in nearly every passage until they read as catchphrases. The
// tavern playtest (26 November 2026) found the same with silence: a quiet hire
// and Maren "said nothing at all" in passage after passage.
const VOICE_RULE='A companion\'s voice describes who they are, not lines to repeat. Show at most one of their habits in a passage, vary which one, leave it out entirely in many passages, and let them mostly speak plainly about what is in front of them. A companion with nothing to do in a passage is simply left out: do not fill the gap with them saying nothing, watching or staying still.';
module.exports={VOICE_RULE};
