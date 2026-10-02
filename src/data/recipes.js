// Rezepte der Werkbank. `gives` ist ein Werkzeug (tool), eine Waffe (weapon)
// oder Vorrat (inventory). `once` = nur einmal herstellbar.

import { WEAPONS, WEAPON_ORDER } from './weapons.js';

export const RECIPES = [
  // m16-r1: ohne Stein – die Werkbank braucht die 2 Stein vom Anfang, und Stein gibt es nur mit der Spitzhacke
  { id: 'spitzhacke', icon: 'spitzhacke', cost: { holz: 4, schrott: 3 }, gives: { tool: 'spitzhacke' }, once: true },
  // Waffen (Meilenstein 4): einmal bauen, aufwerten auf der Seite »Figur« (H5)
  ...WEAPON_ORDER.map((id) => ({ id, icon: WEAPONS[id].icon, cost: WEAPONS[id].cost, gives: { weapon: id }, once: true })),
  { id: 'schrottAusHolz', icon: 'schrott', cost: { holz: 3 }, gives: { inventory: { schrott: 1 } } },
  { id: 'schrottAusStein', icon: 'schrott', cost: { stein: 2 }, gives: { inventory: { schrott: 1 } } }, // m5-r1: 3 : 1 lohnte sich nie
  { id: 'stoffAusFasern', icon: 'stoff', cost: { fasern: 4 }, gives: { inventory: { stoff: 1 } } },
  // M30: Munition für den Waffenschrank (erst, wenn er offen ist)
  { id: 'schrot', icon: 'schrot', cost: { schrott: 2 }, gives: { inventory: { schrot: 4 } }, arms: true },
  { id: 'leuchtkugeln', icon: 'leuchtkugeln', cost: { schrott: 1, fasern: 1 }, gives: { inventory: { leuchtkugeln: 2 } }, arms: true },
  // N7: Nägel für Marthes Kahn (nur, solange sie darauf wartet)
  { id: 'naegel', icon: 'naegel', cost: { schrott: 3 }, gives: { inventory: { naegel: 1 } }, fog: true },
];
