// Ziele für den Einstieg: Die Ziel-Anzeige unter der Uhr zeigt immer das
// erste noch offene Ziel. Ein erreichtes Ziel bleibt erreicht (Flag), auch
// wenn man z. B. Barrikaden später wieder abreißt. Texte in texts.js (T.ziele).

export const GOALS = [
  { id: 'axt', done: (g) => g.state.tools.axt },
  { id: 'turm', done: (g) => g.world.buildings.towers.length > 0 },
  { id: 'nacht', done: (g) => (g.state.stats.nightsWon || 0) > 0 },
  { id: 'werkbank', done: (g) => g.world.buildings.count('werkbank') > 0 },
  { id: 'spitzhacke', done: (g) => g.state.tools.spitzhacke },
  { id: 'waffe', done: (g) => Object.keys(g.state.weapons || {}).length > 0 },
  { id: 'barrikaden', done: (g) => g.world.buildings.count('barrikade') >= 3, progress: (g) => [g.world.buildings.count('barrikade'), 3] },
  { id: 'ausbau', done: (g) => g.world.buildings.towers.some((t) => t.level >= 3) },
  { id: 'huette', done: (g) => g.state.world.houseLevel >= 2 },
];
