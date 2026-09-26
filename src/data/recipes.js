// Rezepte der Werkbank. `gives` ist ein Werkzeug (tool), eine Waffe (weapon)
// oder Vorrat (inventory). `once` = nur einmal herstellbar.

import { WEAPONS, WEAPON_ORDER } from './weapons.js';

export const RECIPES = [
  { id: 'spitzhacke', icon: 'spitzhacke', cost: { holz: 3, stein: 2, schrott: 2 }, gives: { tool: 'spitzhacke' }, once: true },
  // Waffen (Meilenstein 4): einmal bauen, aufwerten in der Bauleiste
  ...WEAPON_ORDER.map((id) => ({ id, icon: WEAPONS[id].icon, cost: WEAPONS[id].cost, gives: { weapon: id }, once: true })),
  { id: 'schrottAusHolz', icon: 'schrott', cost: { holz: 3 }, gives: { inventory: { schrott: 1 } } },
  { id: 'schrottAusStein', icon: 'schrott', cost: { stein: 3 }, gives: { inventory: { schrott: 1 } } },
  { id: 'stoffAusFasern', icon: 'stoff', cost: { fasern: 4 }, gives: { inventory: { stoff: 1 } } },
];
