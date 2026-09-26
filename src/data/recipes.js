// Rezepte der Werkbank. `gives` ist entweder ein Werkzeug (tool) oder
// Vorrat (inventory). `once` = nur einmal herstellbar.

export const RECIPES = [
  { id: 'spitzhacke', icon: 'spitzhacke', cost: { holz: 3, stein: 3, schrott: 2 }, gives: { tool: 'spitzhacke' }, once: true },
  { id: 'schrottAusHolz', icon: 'schrott', cost: { holz: 3 }, gives: { inventory: { schrott: 1 } } },
  { id: 'schrottAusStein', icon: 'schrott', cost: { stein: 3 }, gives: { inventory: { schrott: 1 } } },
  { id: 'stoffAusFasern', icon: 'stoff', cost: { fasern: 4 }, gives: { inventory: { stoff: 1 } } },
];
