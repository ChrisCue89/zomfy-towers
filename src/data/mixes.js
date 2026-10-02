// Mischtürme (M20, DESIGN.md 8): Zwei Türme verschiedener Familien, die sich eine
// Kante teilen und beide mindestens Stufe 3 haben, werden mit einem Moderkern zu
// einem Turm auf beiden Feldern. Er kämpft auf eigene Art und steigt wie ein
// Turm bis Stufe 5; die Stufe beim Verbinden ist die kleinere der beiden.
//
// Werte je Stufe (3, 4, 5), dazu die Kosten des Ausbaus auf diese Stufe:
//   damage, rate, range   wie bei den Türmen (towers.js)
//   pierce  so viele durchschlägt der schwere Bolzen; burst: Schaden am Ende,
//           splash: Radius (Kürbisballiste)
//   frost   frostig (s); slow/slowTime; shatter: zusätzlicher Faktor gegen einen
//           Eisblock (Eiszapfenschleuder)
//   mark    markiert (s): alle Türme treffen härter (markBonus); blind:
//           geblendet (s) (Leuchtpfeil, Feuerwerk, Nebelleuchte, Glühschwarm)
//   mud     matschig (s); sticky: klebrige Fläche (s), stickySlow (Matschkessel)
//   chain   weitere Explosionen nach dem Einschlag; burn: Brand je s (Feuerwerk)
//   push    Rückstoß gegen den Weg (m); wet: nass (s) (Nebelleuchte, Wetterhahn)
//   cone    halber Öffnungswinkel des Sprühstoßes (Bogenmaß, Wetterhahn)
//   swarms  Schwärme; damage ist dann Schaden je Sekunde (Glühschwarm)

/** Kosten des Verbindens (dazu stecken beide Türme im Mischturm). */
export const MIX_COST = { moderkerne: 1, schrott: 10 };
/** Ab dieser Stufe lassen sich zwei Türme verbinden. */
export const MIX_MIN_LEVEL = 3;

export const MIXES = {
  kuerbisballiste: {
    parts: ['bolzen', 'katapult'],
    projectile: 'spear',
    levels: [
      { cost: {}, damage: 70, rate: 0.55, range: 7.5, pierce: 3, burst: 45, splash: 1.4 },
      { cost: { schrott: 30, zahnraeder: 2 }, damage: 95, rate: 0.6, range: 8, pierce: 4, burst: 60, splash: 1.5 },
      { cost: { schrott: 40, moderkerne: 1 }, damage: 130, rate: 0.65, range: 8.5, pierce: 5, burst: 80, splash: 1.7 },
    ],
  },
  eiszapfen: {
    parts: ['bolzen', 'sprenger'],
    projectile: 'icicle',
    levels: [
      { cost: {}, damage: 38, rate: 1.3, range: 6.5, frost: 2.5, slow: 0.35, slowTime: 1.2, shatter: 1.5 },
      { cost: { schrott: 28, zahnraeder: 2 }, damage: 50, rate: 1.4, range: 7, frost: 3, slow: 0.4, slowTime: 1.3, shatter: 1.5 },
      { cost: { schrott: 38, moderkerne: 1 }, damage: 68, rate: 1.5, range: 7.5, frost: 3.5, slow: 0.45, slowTime: 1.4, shatter: 1.75 },
    ],
  },
  leuchtpfeil: {
    parts: ['bolzen', 'laternenturm'],
    projectile: 'glow',
    strongest: true,
    levels: [
      { cost: {}, damage: 45, rate: 0.9, range: 8, mark: 4, markBonus: 0.3, blind: 2.5, strongest: true },
      { cost: { schrott: 30, zahnraeder: 2 }, damage: 60, rate: 1, range: 8.5, mark: 5, markBonus: 0.35, blind: 3, strongest: true },
      { cost: { schrott: 40, moderkerne: 1 }, damage: 80, rate: 1.1, range: 9, mark: 6, markBonus: 0.45, blind: 3.5, strongest: true },
    ],
  },
  matschkessel: {
    parts: ['katapult', 'sprenger'],
    projectile: 'mud',
    levels: [
      { cost: {}, damage: 26, rate: 0.55, range: 6.5, splash: 1.8, mud: 4, slow: 0.35, slowTime: 2, sticky: 3.5, stickySlow: 0.45 },
      { cost: { schrott: 28, zahnraeder: 2 }, damage: 34, rate: 0.6, range: 6.8, splash: 2, mud: 4.5, slow: 0.4, slowTime: 2, sticky: 4, stickySlow: 0.5 },
      { cost: { schrott: 38, moderkerne: 1 }, damage: 45, rate: 0.65, range: 7.2, splash: 2.2, mud: 5, slow: 0.45, slowTime: 2.2, sticky: 5, stickySlow: 0.55 },
    ],
  },
  feuerwerk: {
    parts: ['katapult', 'laternenturm'],
    projectile: 'rocket',
    levels: [
      { cost: {}, damage: 32, rate: 0.45, range: 7, splash: 1.3, chain: 2, blind: 2, burn: 6 },
      { cost: { schrott: 30, zahnraeder: 2 }, damage: 42, rate: 0.5, range: 7.5, splash: 1.4, chain: 3, blind: 2.5, burn: 8 },
      { cost: { schrott: 40, moderkerne: 1 }, damage: 55, rate: 0.55, range: 8, splash: 1.5, chain: 4, blind: 3, burn: 12 },
    ],
  },
  nebelleuchte: {
    parts: ['sprenger', 'laternenturm'],
    projectile: null,
    levels: [
      { cost: {}, damage: 8, rate: 0.4, range: 4.2, push: 1, wet: 4, blind: 3, slow: 0.4, slowTime: 1.5 },
      { cost: { schrott: 26, zahnraeder: 2 }, damage: 11, rate: 0.45, range: 4.5, push: 1.2, wet: 4.5, blind: 3.5, slow: 0.45, slowTime: 1.6 },
      { cost: { schrott: 36, moderkerne: 1 }, damage: 15, rate: 0.5, range: 4.9, push: 1.5, wet: 5, blind: 4, slow: 0.5, slowTime: 1.8 },
    ],
  },
  gluehschwarm: {
    parts: ['bienenkorb', 'laternenturm'],
    projectile: 'bienen',
    levels: [
      { cost: {}, damage: 16, range: 5.5, swarms: 2, blind: 1.5 },
      { cost: { schrott: 28, zahnraeder: 2 }, damage: 21, range: 5.8, swarms: 2, blind: 2 },
      { cost: { schrott: 38, moderkerne: 1 }, damage: 27, range: 6.2, swarms: 3, blind: 2.5 },
    ],
  },
  wetterhahn: {
    parts: ['windrad', 'sprenger'],
    projectile: null,
    levels: [
      { cost: {}, damage: 6, rate: 0.4, range: 4.8, cone: 0.7, push: 1.4, wet: 5, slow: 0.3, slowTime: 1.5 },
      { cost: { schrott: 26, zahnraeder: 2 }, damage: 8, rate: 0.45, range: 5.2, cone: 0.72, push: 1.7, wet: 5.5, slow: 0.35, slowTime: 1.6 },
      { cost: { schrott: 36, moderkerne: 1 }, damage: 11, rate: 0.5, range: 5.6, cone: 0.75, push: 2.1, wet: 6, slow: 0.4, slowTime: 1.8 },
    ],
  },
};

/** Reihenfolge im Werkstattbuch: erst die vier ersten Familien, dann die aus den Bauplänen. */
export const MIX_ORDER = ['kuerbisballiste', 'eiszapfen', 'leuchtpfeil', 'matschkessel', 'feuerwerk', 'nebelleuchte', 'gluehschwarm', 'wetterhahn'];

/** Farbe des Rezepts im Werkstattbuch (Leitfarbe des Turms). */
export const MIX_COLORS = {
  kuerbisballiste: 0xf0a040,
  eiszapfen: 0xa8dcff,
  leuchtpfeil: 0xffe08a,
  matschkessel: 0xb08858,
  feuerwerk: 0xf07a6a,
  nebelleuchte: 0xe8eef4,
  gluehschwarm: 0xf8d060,
  wetterhahn: 0x8ab8e8,
};

/** Wer im Werkstattbuch einen Hinweis gibt (muss eingezogen sein). */
export const MIX_HINTS = {
  kuerbisballiste: 'bert',
  eiszapfen: 'juna',
  leuchtpfeil: 'bert',
  matschkessel: 'juna',
  feuerwerk: 'bert',
  nebelleuchte: 'juna',
  gluehschwarm: 'bert',
  wetterhahn: 'juna',
};

/** Rezept zu zwei Turmarten (Reihenfolge egal), sonst null. */
export function mixFor(a, b) {
  if (!a || !b || a === b) return null;
  for (const id of MIX_ORDER) {
    const [p, q] = MIXES[id].parts;
    if ((p === a && q === b) || (p === b && q === a)) return id;
  }
  return null;
}

export function isMix(type) {
  return Boolean(MIXES[type]);
}
