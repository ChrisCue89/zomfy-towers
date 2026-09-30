// Ziele für den Einstieg: Die Ziel-Anzeige unter der Uhr zeigt immer das
// erste noch offene Ziel. Ein erreichtes Ziel bleibt erreicht (Flag), auch
// wenn man z. B. Barrikaden später wieder abreißt. Texte in texts.js (T.ziele).

import { towerStatsOf } from './towers.js';


export const GOALS = [
  // N10: Das erste Feuer – nur in einem neuen Spiel mit Ankunft ist etwas kalt (core/firstFire.js);
  // in alten Ständen sind diese drei Ziele beim Laden still erreicht
  { id: 'streichhoelzer', done: (g) => Boolean(g.state.flags.streichhoelzer) || !g.state.flags.kaminKalt },
  { id: 'kamin', done: (g) => !g.state.flags.kaminKalt },
  { id: 'feuer', done: (g) => !g.state.flags.feuerKalt },
  { id: 'axt', done: (g) => g.state.tools.axt },
  // Der Turm zählt erst, wenn sein Kreis den Weg der Horde erreicht (m12-r1: einer mitten in der Bucht zählte)
  { id: 'turm', done: (g) => g.world.buildings.towers.some((t) => g.world.pathing.covers(t.i + 0.5, t.j + 0.5, towerStatsOf(t).range)) },
  { id: 'nacht', done: (g) => (g.state.stats.nightsWon || 0) > 0 },
  { id: 'haendler', done: (g) => Boolean(g.state.flags.gehandelt) }, // Meilenstein 8: Zombieteile bei Balduin
  { id: 'werkbank', done: (g) => g.world.buildings.count('werkbank') > 0 },
  { id: 'spitzhacke', done: (g) => g.state.tools.spitzhacke },
  { id: 'waffe', done: (g) => Object.keys(g.state.weapons || {}).length > 0 },
  { id: 'barrikaden', done: (g) => g.world.buildings.count('barrikade') >= 3, progress: (g) => [g.world.buildings.count('barrikade'), 3] },
  { id: 'ausbau', done: (g) => g.world.buildings.towers.some((t) => t.level >= 3) },
  { id: 'huette', done: (g) => g.state.world.houseLevel >= 2 },
];
