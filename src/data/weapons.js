// Nahkampf-Waffen (DESIGN.md 6.13). Mika schlägt mit dem, was sie in der
// Hand hat (Schnellleiste): Waffe, Axt, Spitzhacke – ohne Werkzeug mit den
// Fäusten. Waffen baut man an der Werkbank und wertet sie in der Bauleiste
// (Reiter »Figur«) zweimal auf; jede Stufe erhöht den Schaden.
//
//   damage    Schaden pro Treffer          rate    Schläge pro Sekunde
//   reach     Reichweite in Metern         arc     halber Öffnungswinkel (Grad)
//   targets   höchstens so viele Schlurfer pro Schlag
//   push      Rückstoß (Meter)             stun    Betäubung (Sekunden)
//   combo     jeder n-te Schlag einer schnellen Folge trifft doppelt
//   pierce    durchschlägt Panzer (M24: die Pfanne)
//   cost      Rezept an der Werkbank       upgrades Preise für Stufe 2 und 3

export const WEAPONS = {
  faeuste: { damage: 6, rate: 2.6, reach: 1.25, arc: 55, targets: 1, push: 0.3, stun: 0 },
  axt: { damage: 12, rate: 2.2, reach: 1.55, arc: 65, targets: 3, push: 0.55, stun: 0 },
  spitzhacke: { damage: 10, rate: 1.8, reach: 1.5, arc: 50, targets: 2, push: 0.45, stun: 0 },
  schaufel: {
    icon: 'schaufel',
    damage: 16,
    rate: 1.9,
    reach: 1.7,
    arc: 70,
    targets: 3,
    push: 0.75,
    stun: 0,
    cost: { holz: 4, stein: 2, schrott: 4 },
    upgrades: [{ schrott: 10 }, { schrott: 18, zahnraeder: 1 }],
  },
  pfanne: {
    icon: 'pfanne',
    damage: 30,
    rate: 1.1, // M24: etwas flotter
    reach: 1.45,
    arc: 60,
    targets: 2,
    push: 1.2,
    stun: 1.1,
    pierce: true, // M24: durchschlägt Panzer (Brummer, Schildträger) – die Waffe gegen die Zähen
    cost: { schrott: 8, stein: 3 },
    upgrades: [{ schrott: 12 }, { schrott: 20, zahnraeder: 1 }],
  },
  rechen: {
    icon: 'rechen',
    damage: 10,
    rate: 1.4,
    reach: 2.3,
    arc: 95,
    targets: 5,
    push: 0.4,
    stun: 0,
    cost: { holz: 6, schrott: 3, fasern: 2 },
    upgrades: [{ schrott: 10 }, { schrott: 18, zahnraeder: 1 }],
  },
  faeustlinge: {
    icon: 'faeustlinge',
    damage: 7,
    rate: 3.6,
    reach: 1.25,
    arc: 55,
    targets: 1,
    push: 0.2,
    stun: 0,
    combo: 3,
    cost: { stoff: 3, fasern: 4, schrott: 2 },
    upgrades: [{ schrott: 10 }, { schrott: 18, zahnraeder: 1 }],
  },
  // M30: aus dem Waffenschrank (OFFENE-FRAGEN 168) – nicht baubar, ohne Aufwertung
  spaltaxt: { icon: 'spaltaxt', damage: 22, rate: 1.4, reach: 1.6, arc: 60, targets: 3, push: 0.8, stun: 0, cabinet: true }, // Berts: schwer, spaltet
  mistgabel: { icon: 'mistgabel', damage: 13, rate: 1.5, reach: 2.5, arc: 35, targets: 2, push: 1.2, stun: 0, cabinet: true }, // weit, stößt zurück, die sicherste
  schlaeger: { icon: 'schlaeger', damage: 15, rate: 2.5, reach: 1.5, arc: 60, targets: 2, push: 0.6, stun: 0.45, cabinet: true }, // schnell, betäubt kurz
};

/** Waffen, die man bauen kann (Reihenfolge in Werkbank und Bauleiste). */
export const WEAPON_ORDER = ['schaufel', 'pfanne', 'rechen', 'faeustlinge'];

/** Schaden je Aufwertungsstufe (Stufe 1, 2, 3). */
const LEVEL_DAMAGE = [1, 1.35, 1.75];

/**
 * Werte einer Waffe auf ihrer aktuellen Stufe – oder null, wenn Mika sie nicht hat.
 * Werkzeuge und Fäuste gibt es immer (Werkzeuge nur, wenn vorhanden).
 */
export function weaponStats(id, state) {
  const w = WEAPONS[id];
  if (!w) return null;
  if (id === 'axt' || id === 'spitzhacke') return state.tools[id] ? w : null;
  if (w.cabinet) return state.arms?.taken?.includes(id) ? w : null; // M30: aus dem Schrank genommen
  if (!w.cost) return w;
  const level = state.weapons?.[id] || 0;
  if (!level) return null;
  return { ...w, level, damage: w.damage * LEVEL_DAMAGE[Math.min(level, 3) - 1] };
}
