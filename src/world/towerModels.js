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
