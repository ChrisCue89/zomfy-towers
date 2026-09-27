// Voxel-Modelle der Türme. Jeder Turm = Sockel (steht fest) + Kopf (dreht
// sich zum Ziel) + leuchtende Teile. Grundfläche 1 × 1 m (8 × 8 Voxel,
// x/z ∈ [−4, 3]). Jede Art hat eine eigene Leitfarbe, damit man sie auf einen
// Blick erkennt: Bolzenwerfer Holz/Stahl, Katapult Kürbis-Orange,
// Rasensprenger Blau, Laternenturm warmes Licht. Stufenmarken (goldene
// Nieten) vorn am Sockel zeigen die Stufe 1–5.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';

const WHITE = 0xffffff;

/** Goldene Stufenmarken vorn am Sockel. */
function pips(m, level, y = 1) {
  for (let k = 0; k < level; k++) m.set(-2 + k, y, 4, k < 2 ? P.f5 : k < 4 ? P.s8 : P.f7);
}

/** Steinsockel für alle Türme. */
function plinth(m, seed, top = 1) {
  m.box(-4, 0, -4, 3, top, 3, (x, y, z) => {
    const h = hash3(x, y, z, seed);
    if (y === top && (x === -4 || x === 3 || z === -4 || z === 3)) return h < 0.5 ? P.s6 : P.s5;
    return h < 0.3 ? P.s4 : h < 0.7 ? P.s5 : P.s6;
  });
}

// --- Bolzenwerfer ------------------------------------------------------------------

function boltBase(level, seed) {
  const m = new VoxelModel();
  plinth(m, seed);
  // Pfostengerüst mit Streben
  for (const [x, z] of [[-3, -3], [2, -3], [-3, 2], [2, 2]]) m.box(x, 2, z, x, 7, z, level >= 2 ? P.e4 : P.e5);
  m.box(-3, 4, 2, 2, 4, 2, P.e4).box(-3, 4, -3, 2, 4, -3, P.e4);
  m.box(-3, 8, -3, 2, 8, 2, (x, y, z) => ((x + z) % 2 ? P.e6 : P.e7));
  if (level >= 2) m.box(-3, 6, 2, 2, 6, 2, P.s5).box(-3, 6, -3, 2, 6, -3, P.s5); // Eisenbänder
  pips(m, level, 1);
  return m;
}

function boltHead(level, spec) {
  const m = new VoxelModel();
  // Schaft nach vorn (+z), Bogen quer, Sehne, eingelegter Bolzen
  m.box(0, 0, -3, 0, 1, 3, P.e5);
  m.box(-3, 1, 3, 3, 1, 3, P.e4);
  m.set(-4, 1, 2, P.e4).set(4, 1, 2, P.e4);
  m.box(-3, 2, 1, 3, 2, 1, P.e9);
  m.box(0, 2, -1, 0, 2, 4, P.s6);
  m.set(0, 2, 5, P.s8);
  if (spec === 'A') {
    // Scharfschütze: langer Lauf mit Fernrohr
    m.box(0, 1, 4, 0, 1, 7, P.s4);
    m.box(-1, 3, -2, -1, 3, 2, P.s3).set(-1, 3, 3, P.b5);
    if (level >= 4) m.box(1, 0, -3, 1, 0, 1, P.s5);
  } else if (spec === 'B') {
    // Repetierer: Trommelmagazin und zweiter Schaft
    m.box(-1, 3, -2, 1, 5, 0, (x, y) => ((x + y) % 2 ? P.s5 : P.s6));
    m.box(2, 0, -3, 2, 1, 3, P.e5);
    if (level >= 4) m.set(0, 6, -1, P.f5);
  }
  return m;
}

// --- Kürbiskatapult ----------------------------------------------------------------

function catapultBase(level, seed) {
  const m = new VoxelModel();
  plinth(m, seed);
  m.box(-3, 2, -3, 2, 3, 2, (x, y, z) => (y === 3 ? P.e6 : hash3(x, y, z, seed) < 0.4 ? P.e4 : P.e5));
  // Kürbisvorrat hinten
  m.box(-3, 4, -3, -2, 5, -2, (x, y) => (y === 5 ? P.f5 : P.f4)).set(-3, 6, -3, P.g5);
  m.box(1, 4, -3, 2, 5, -2, (x, y) => (y === 5 ? P.f5 : P.f4)).set(2, 6, -2, P.g5);
  if (level >= 2) m.box(-3, 2, 3, 2, 2, 3, P.s5);
  pips(m, level, 1);
  return m;
}

function catapultHead(level, spec) {
  const m = new VoxelModel();
  // Achse und Wurfarm (schräg nach hinten), Korb mit Kürbis
  m.box(-2, 0, 0, 2, 1, 0, P.e3);
  m.box(-2, 2, -1, -2, 3, 1, P.e4).box(2, 2, -1, 2, 3, 1, P.e4);
  for (let t = 0; t < 7; t++) m.set(0, 2 + Math.round(t * 0.7), 1 - t, P.e5);
  m.box(-1, 7, -7, 1, 7, -5, P.e3);
  const pumpkin = spec === 'A' ? P.f3 : P.f4;
  if (spec === 'B') {
    m.set(-1, 8, -6, pumpkin).set(1, 8, -6, pumpkin).set(0, 8, -5, pumpkin);
    m.set(-1, 9, -6, P.g5).set(1, 9, -6, P.g5);
  } else {
    m.box(-1, 8, -7, 1, 9, -5, (x, y) => (y === 9 && x === 0 ? P.f5 : pumpkin));
    m.set(0, 10, -6, P.g5);
  }
  if (level >= 2) m.box(-2, 0, 1, 2, 0, 1, P.s5);
  return m;
}

function catapultGlow(spec) {
  if (spec !== 'A') return null;
  // Feuerkürbis: glimmt
  return new VoxelModel().set(-1, 8, -7, WHITE).set(1, 8, -7, WHITE).set(0, 9, -7, WHITE);
}

// --- Rasensprenger -----------------------------------------------------------------

function sprinklerBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed);
  const tank = spec === 'A' ? [P.b5, P.a4] : spec === 'B' ? [P.e3, P.e4] : [P.b3, P.b4];
  m.cylinder(0, 0, 2, 6, 3.2, (x, y, z) => (y === 6 ? tank[1] : hash3(x, y, z, seed) < 0.2 ? tank[1] : tank[0]));
  m.box(-1, 8, -1, 0, 9, 0, P.s5); // Steigrohr
  if (spec === 'A') for (const [x, z] of [[-3, 1], [2, -2], [1, 2]]) m.set(x, 7, z, P.a4);
  if (level >= 2) m.box(-4, 4, -1, -4, 4, 0, P.f5); // Hahn
  pips(m, level, 1);
  return m;
}

function sprinklerHead(level, spec) {
  const m = new VoxelModel();
  const brass = spec === 'B' ? P.e5 : P.f5;
  m.box(0, 0, 0, 0, 1, 0, brass);
  m.box(-3, 2, 0, 3, 2, 0, brass);
  m.set(-3, 3, 0, P.s7).set(3, 3, 0, P.s7);
  m.box(0, 2, -2, 0, 2, 2, brass);
  if (level >= 4) m.set(0, 3, 0, P.s8);
  return m;
}

// --- Laternenturm ------------------------------------------------------------------

function lanternBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed, 2);
  m.box(-1, 3, -1, 0, 13, 0, (x, y) => (y % 5 === 0 ? P.e3 : P.e4));
  if (level >= 2) m.box(-2, 3, -2, 1, 3, 1, P.s5);
  if (spec === 'B') m.set(1, 10, 1, P.g6).set(-2, 10, -2, P.g6); // Klee
  pips(m, level, 1);
  return m;
}

function lanternHead(level, spec) {
  const m = new VoxelModel();
  const frame = spec === 'B' ? P.f5 : P.s2;
  m.box(-2, 0, -2, 1, 0, 1, frame);
  m.box(-2, 5, -2, 1, 5, 1, frame);
  m.box(-1, 6, -1, 0, 6, 0, frame);
  for (const [x, z] of [[-2, -2], [1, -2], [-2, 1], [1, 1]]) m.box(x, 1, z, x, 4, z, frame);
  if (spec === 'A') m.box(-3, 5, -3, 2, 5, 2, P.s3).box(-2, 6, -2, 1, 6, 1, P.f3);
  return m;
}

function lanternGlow(spec) {
  const m = new VoxelModel();
  m.box(-1, 1, -1, 0, 4, 0, WHITE);
  if (spec === 'A') m.box(-2, 7, -2, 1, 7, 1, WHITE);
  return m;
}

// --- Feiner Detailgrad (1/16 m, Meilenstein 5) -------------------------------------
// Die groben Modelle werden verdoppelt und bekommen feine Einzelheiten. Vor
// allem zeigt eine Fahne an der hinteren Ecke die Stufe: Stufe 2 ein weißer
// Wimpel, ab Stufe 3 ein Banner in der Farbe der Spezialisierung, Stufe 4 mit
// Streifen, Stufe 5 mit goldener Spitze.

export const TOWER_UNIT = 1 / 16;

const SPEC_COLORS = {
  bolzen: { A: [P.a0, P.a4], B: [P.b4, P.b6] },
  katapult: { A: [P.f3, P.f5], B: [P.g5, P.g7] },
  sprenger: { A: [0x8ecff0, 0xe8f8ff], B: [P.e4, P.e6] },
  laternenturm: { A: [P.f5, P.f7], B: [P.g6, P.g8] },
};

/** Stufen-Fahne an der hinteren linken Ecke (fein) – groß genug, um sie im Getümmel zu lesen. */
function levelFlag(m, type, level, spec, top) {
  if (level < 2) return;
  const x = -8;
  const z = -8;
  m.box(x, 4, z, x, top + 11, z, P.e3); // Stange
  if (level >= 5) m.set(x, top + 12, z, P.f7).set(x, top + 13, z, P.f6); // goldene Spitze
  if (level === 2) {
    // Weißer Wimpel (Dreieck)
    for (let k = 0; k < 6; k++) m.box(x + 1, top + 5 + Math.floor(k / 2), z, x + 7 - k, top + 10 - Math.floor(k / 2), z, P.s9);
    return;
  }
  const [cloth, light] = SPEC_COLORS[type][spec || 'A'];
  m.box(x + 1, top + 4, z, x + 9, top + 10, z, (xx, yy) => {
    if (level >= 4 && (yy === top + 7 || (level >= 5 && yy === top + 5))) return light; // Streifen
    if (xx === x + 9 && (yy === top + 4 || yy === top + 10)) return null; // Schwalbenschwanz
    return cloth;
  });
}

/** Feine Nieten (Stufenmarken) vorn am Sockel: kleine goldene Punkte. */
function finePips(m, level) {
  for (let k = 0; k < level; k++) m.set(-5 + k * 2, 2, 8, k < 2 ? P.f5 : k < 4 ? P.s8 : P.f7);
}

function fineBolt(level, spec, seed) {
  const base = boltBase(level, seed).upsampled(2);
  base.remove(-8, 2, 8, 7, 3, 9); // grobe Stufenmarken ersetzen
  finePips(base, level);
  // Beschläge an den Pfosten
  for (const [x, z] of [[-6, 5], [5, 5]]) base.set(x, 10, z, P.s7).set(x, 14, z, P.s7);
  levelFlag(base, 'bolzen', level, spec, 17);
  const head = boltHead(level, spec).upsampled(2);
  // Sehne hell, Bolzen mit blanker Spitze und rotem Federkiel
  head.box(-6, 5, 2, 5, 5, 2, P.e9);
  head.set(0, 5, 11, P.s9).set(1, 5, 11, P.s9).set(0, 5, -2, P.a4).set(1, 5, -2, P.a4);
  if (spec === 'A') head.set(-2, 7, 7, P.b6).set(-1, 7, 7, P.b5); // Linse des Fernrohrs
  if (spec === 'B') head.box(-2, 11, -4, 3, 11, -1, (x, z) => ((x + z) % 2 ? P.f5 : P.s6)); // Trommeldeckel
  return { base, head, headY: 18, glow: null, glowOnHead: false };
}

function fineCatapult(level, spec, seed) {
  const base = catapultBase(level, seed).upsampled(2);
  base.remove(-8, 2, 8, 7, 3, 9);
  finePips(base, level);
  // Kürbisse mit Rippen und Stielen
  for (const [x, z] of [[-6, -6], [2, -6]]) {
    base.paint(x, 8, z, x + 3, 11, z + 3, (xx, yy, zz) => ((xx + zz) % 2 ? P.f4 : P.f5));
    base.set(x + 1, 12, z + 1, P.g5).set(x + 2, 13, z + 1, P.g6);
  }
  levelFlag(base, 'katapult', level, spec, 13);
  const head = catapultHead(level, spec).upsampled(2);
  // Seile am Korb
  head.set(-3, 15, -12, P.e8).set(3, 15, -12, P.e8);
  const glow = catapultGlow(spec)?.upsampled(2) || null;
  if (spec === 'A' && glow) {
    // Geschnitztes Gesicht im Feuerkürbis
    glow.set(-2, 17, -15, 0xffffff).set(2, 17, -15, 0xffffff).set(-1, 16, -15, 0xffffff).set(1, 16, -15, 0xffffff);
  }
  return { base, head, headY: 8, glow, glowOnHead: true };
}

function fineSprinkler(level, spec, seed) {
  const base = sprinklerBase(level, spec, seed).upsampled(2);
  base.remove(-8, 2, 8, 7, 3, 9);
  finePips(base, level);
  // Spannbänder um den Tank
  base.paint(-7, 6, -7, 6, 6, 6, P.s6);
  base.paint(-7, 10, -7, 6, 10, 6, P.s6);
  if (spec === 'A') for (const [x, z] of [[-6, 2], [4, -4], [2, 5]]) base.set(x, 14, z, 0xe8f8ff); // Frostkristalle
  if (spec === 'B') for (const [x, z] of [[-5, 3], [3, 4], [5, -2]]) base.set(x, 9, z, P.e2); // Schlammspritzer
  levelFlag(base, 'sprenger', level, spec, 13);
  const head = sprinklerHead(level, spec).upsampled(2);
  // Düsen an den Enden
  head.set(-7, 6, 0, P.s9).set(6, 6, 0, P.s9).set(-7, 6, 1, P.s9).set(6, 6, 1, P.s9);
  return { base, head, headY: 20, glow: null, glowOnHead: false };
}

function fineLantern(level, spec, seed) {
  const base = lanternBase(level, spec, seed).upsampled(2);
  base.remove(-8, 2, 8, 7, 3, 9);
  finePips(base, level);
  // Holzmaserung am Pfosten
  for (let y = 6; y < 27; y += 4) base.set(-2, y, 1, P.e3);
  if (spec === 'B') base.set(2, 21, 2, P.g8).set(-4, 21, -4, P.g8); // Kleeblätter hell
  levelFlag(base, 'laternenturm', level, spec, 12);
  const head = lanternHead(level, spec).upsampled(2);
  // Spitzes Dach mit Knauf
  head.box(-3, 12, -3, 2, 12, 2, spec === 'B' ? P.f5 : P.s3);
  head.set(0, 13, 0, P.f6).set(-1, 13, -1, P.f6);
  const glow = lanternGlow(spec).upsampled(2);
  return { base, head, headY: 28, glow, glowOnHead: true };
}

/**
 * Feine Modelle (1/16 m) eines Turms – gleiche Maße in Metern wie die groben.
 * @returns {{base: VoxelModel, head: VoxelModel, headY: number, glow: VoxelModel|null, glowOnHead: boolean, unit: number}}
 */
/**
 * Besondere Turmteile (Meilenstein 10) im feinen Maß, Ursprung jeweils an der
 * Stelle, an der das Teil am Turm sitzt:
 * - Fernrohr: Messingrohr auf dem Kopf, zeigt nach vorn (+z) – dreht beim Zielen mit
 * - Schmierfett: grüne Ölkanne mit langem Ausguss am Fuß
 * - Glücksmünze: goldene Münze an einer roten Schnur, vorn am Turm
 */
export function towerPartModel(id) {
  const m = new VoxelModel();
  if (id === 'fernrohr') {
    m.box(-1, 0, -3, 0, 1, 3, (x, y, z) => (z === -3 || z === 0 ? P.f4 : y === 1 ? P.f6 : P.f5)); // Rohr mit Ringen
    m.box(-1, 0, 4, 0, 1, 4, P.n2).set(-1, 1, 4, P.b5); // Linse vorn, ein Glanzpunkt
    m.box(-1, 0, -4, 0, 0, -4, P.s3); // Okular hinten
    m.box(-1, -1, -1, 0, -1, 1, P.s4); // Halterung
    return m;
  }
  if (id === 'schmierfett') {
    m.box(0, 0, 0, 3, 4, 2, (x, y) => (y === 4 ? P.g3 : y === 0 ? P.g2 : x === 0 ? P.g4 : P.g5)); // Kanne
    m.box(1, 5, 1, 2, 5, 1, P.s4); // Deckel
    for (let k = 0; k < 4; k++) m.set(4 + k, 3 + (k >> 1), 1, P.s5); // langer Ausguss
    m.set(8, 4, 1, P.e1); // ein Tropfen Öl
    m.set(1, 2, 3, P.f6).set(2, 2, 3, P.f6); // gelbes Etikett
    return m;
  }
  // Glücksmünze an der Schnur
  m.box(0, 5, 0, 0, 8, 0, P.r3);
  m.box(-2, 0, 0, 2, 4, 0, (x, y) => {
    if ((x === -2 || x === 2) && (y === 0 || y === 4)) return null; // runde Ecken
    if (x === 0 && y === 2) return P.f4; // Prägung
    return (x + y) % 3 === 0 ? P.f7 : P.f6;
  });
  return m;
}

export function fineTowerModels(type, level, spec, seed = 5) {
  const m = {
    bolzen: fineBolt,
    katapult: fineCatapult,
    sprenger: fineSprinkler,
    laternenturm: fineLantern,
  }[type](level, spec, seed);
  return { ...m, unit: TOWER_UNIT };
}

/**
 * Modelle eines Turms für Stufe und Spezialisierung.
 * @returns {{base: VoxelModel, head: VoxelModel, headY: number, glow: VoxelModel|null, glowOnHead: boolean}}
 */
export function towerModels(type, level, spec, seed = 5) {
  switch (type) {
    case 'bolzen':
      return { base: boltBase(level, seed), head: boltHead(level, spec), headY: 9, glow: null, glowOnHead: false };
    case 'katapult':
      return { base: catapultBase(level, seed), head: catapultHead(level, spec), headY: 4, glow: catapultGlow(spec), glowOnHead: true };
    case 'sprenger':
      return { base: sprinklerBase(level, spec, seed), head: sprinklerHead(level, spec), headY: 10, glow: null, glowOnHead: false };
    case 'laternenturm':
      return { base: lanternBase(level, spec, seed), head: lanternHead(level, spec), headY: 14, glow: lanternGlow(spec), glowOnHead: true };
    default:
      throw new Error(`Unbekannter Turm ${type}`);
  }
}
