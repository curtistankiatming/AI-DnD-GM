'use strict';
// A complete director draft, as Claude's structured output would return it.
module.exports = () => ({
  name: 'The Salt Choir', region: 'The flooded saltworks east of Ashford', faction: 'trade',
  brief: 'Saltworkers report singing from the drowned evaporation pans. Shipments have stopped.',
  threat: 'The singing comes from a drowned shrine. A lantern helps in the flooded tunnels.',
  opening: 'Grey water laps at the boardwalks. Somewhere under it, many voices hold one note.',
  approach: 'The boardwalks sag lower with every step toward the pumphouse, and the note under the water grows louder.',
  clue: 'The choir sings the names of workers lost in the great flood.',
  investigate: { label: 'Question the saltworkers', skill: 'insight', alt: ['history', 'persuasion'], success: 'They admit the flood was no accident: the Brinewright Guild opened the old sluice to drown a rival pan, and the night shift with it.', failure: 'They are frightened, but one name keeps returning: Brinewright.' },
  route: { label: 'Wade through the flooded tunnels', skill: 'athletics', alt: ['survival', 'not-a-skill'], tools: ['lantern', 'gold-crown'], poison: false, success: 'You reach the shrine unseen.', failure: 'The current batters the party.' },
  crisis: 'The choir rises from the water, demanding the names of those responsible.',
  peaceful: { label: 'Speak the true names of the lost', skill: 'religion', alt: ['persuasion'], success: 'The choir quiets and sinks.', failure: 'The choir does not believe you.' },
  objective: { name: 'Close the sluice', label: 'Close the sluice gates', description: 'Close the gates while the choir is distracted.', skill: 'athletics', alt: ['sleightOfHand'], failText: 'The water rises.', successText: 'The gates grind shut.' },
  foeName: 'The Drowned Cantor', enemyTheme: 'undead',
  after: 'The pans drain. At the bottom of the sluice, the old gate-wheel still carries the Brinewright Guild\'s brass seal. The saltworkers stand at the edge, waiting for your word.',
  decisions: [
    { label: 'Name the guild that caused the flood', text: 'You name the Brinewright Guild in front of every saltworker on the boardwalk. The guild is shamed; work resumes under new terms.', favors: 'wardens', also: 'trade' },
    { label: 'Keep the secret for a price', text: 'The guild owes you, and the workers never know.', favors: 'trade', also: 'none' }
  ],
  destination: 'ashford',
  arc: 'A guild hid a deliberate flood. The salt road is reopening, but someone paid for silence.'
});
