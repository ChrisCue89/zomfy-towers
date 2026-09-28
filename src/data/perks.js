// Erfahrung und Perks (DESIGN.md 6.13). Besiegte Schlurfer geben Erfahrung
// (zombies.js: xp), im Nahkampf doppelt. Jede neue Stufe bietet drei Perks
// zur Wahl; jeder Perk hat höchstens `max` Stufen. Die Wirkung liefert
// perkValue(state, id) – ohne den Perk der neutrale Wert (`none`).

/** Erfahrung, die von Stufe `level` zur nächsten fehlt. */
export function xpForLevel(level) {
  return Math.round(10 + (level - 1) * 8 + (level - 1) ** 2 * 1.5);
}

export const PERKS = {
  // Sammelradius × (mit der Aufwertung multipliziert)
  sammler: { icon: 'magnet', max: 3, none: 1, value: (n) => 1 + 0.3 * n },
  // Nach dem Ausweichen trifft der nächste Schlag × Wert
  konter: { icon: 'stiefel', max: 2, none: 1, value: (n) => 1 + n },
  // Repariert Bauten im Umkreis von 2,5 m um Wert pro Sekunde
  flicker: { icon: 'reparieren', max: 2, none: 0, value: (n) => 2 * n },
  // Nahkampfschaden nahe eines Turms (3,5 m) × Wert
  turmfreund: { icon: 'bolzen', max: 3, none: 1, value: (n) => 1 + 0.25 * n },
  // Leben pro Treffer
  // m16-r1: 1,5 je Stufe und Ziel machte Mika mit dem Rechen (5 Ziele) unverwundbar –
  // jetzt 1 je Stufe, und jedes weitere Ziel desselben Schlags zählt nur ein Fünftel
  lebensraub: { icon: 'herz', max: 3, none: 0, value: (n) => n, extra: 0.2 },
  // Schlagtempo ×
  flink: { icon: 'faust', max: 3, none: 1, value: (n) => 1 + 0.12 * n },
  // Erlittener Schaden ×
  dickesFell: { icon: 'schild', max: 3, none: 1, value: (n) => 1 - 0.12 * n },
  // Chance auf ein zusätzliches Stück Schrott je Abschuss
  glueckspilz: { icon: 'schrott', max: 2, none: 0, value: (n) => 0.25 * n },
  // Sekunden ohne Treffer, bis Mika wieder Leben gewinnt
  zweiterAtem: { icon: 'mond', max: 2, none: 5, value: (n) => 5 - 1.5 * n },
};

export const PERK_IDS = Object.keys(PERKS);

export function perkLevel(state, id) {
  return state.perks?.[id] || 0;
}

export function perkValue(state, id) {
  const n = perkLevel(state, id);
  return n ? PERKS[id].value(n) : PERKS[id].none;
}

/** Drei zufällige, noch nicht ausgereizte Perks (Rng mit next()). */
export function rollPerkChoice(state, rng, count = 3) {
  const open = PERK_IDS.filter((id) => perkLevel(state, id) < PERKS[id].max);
  const out = [];
  while (out.length < count && open.length) out.push(open.splice(Math.floor(rng.next() * open.length), 1)[0]);
  return out;
}
