'use strict';
// One rule for every Claude prompt that writes companions. Playtests showed each
// companion's listed habits (taking the door, offering to carry things, knots)
// turning up in nearly every passage until they read as catchphrases.
const VOICE_RULE='A companion\'s voice describes who they are, not lines to repeat. Show at most one of their habits in a passage, vary which one, leave it out entirely in many passages, and let them mostly speak plainly about what is in front of them.';
module.exports={VOICE_RULE};
