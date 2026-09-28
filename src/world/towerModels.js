// Voxel-Modelle der Türme, seit M13g doppelt fein (1/32 m; M13 hatte sie im
// Maß 1/16 von Grund auf neu gebaut). Jeder Turm = Sockel (steht fest) + Kopf
// (dreht sich zum Ziel, Drehpunkt im Ursprung) + leuchtende Teile.
// Grundfläche 1 × 1 m (x/z ∈ [−16, 15]). Jede Art hat eine eigene Leitfarbe und
// Silhouette, damit man sie auf einen Blick erkennt: Bolzenwerfer Holzgerüst
// mit Armbrust, Katapult Kürbis-Orange mit Wurfarm, Rasensprenger blauer Tank
// mit Drehkopf, Laternenturm hoher Pfahl mit warmem Licht. Goldene Nieten vorn
// am Sockel und eine Fahne hinten links zeigen die Stufe 1–5; die
// Spezialisierung sieht man an eigenen Teilen und an der Farbe der Fahne.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';
import { shade } from './voxelKit.js';
import { FAMILY_MODELS } from './familyModels.js';
import { MIX_MODELS } from './mixModels.js';

const WHITE = 0xffffff;

export const TOWER_UNIT = 1 / 32;

const SPEC_COLORS = {
  bolzen: { A: [P.a0, P.a4], B: [P.b4, P.b6] },
  katapult: { A: [P.f3, P.f5], B: [P.g5, P.g7] },
  sprenger: { A: [0x8ecff0, 0xe8f8ff], B: [P.e4, P.e6] },
  laternenturm: { A: [P.f5, P.f7], B: [P.g6, P.g8] },
  // M19: Familien aus den Bauplänen
  glockenturm: { A: [P.f4, P.f6], B: [P.g6, P.g8] },
  windrad: { A: [P.b3, P.b5], B: [P.e7, P.e9] },
  bienenkorb: { A: [P.f5, P.f7], B: [P.f3, P.f5] },
  vogelscheuche: { A: [P.e6, P.e8], B: [P.n2, P.n4] },
  // M20: Mischtürme (nur »A«) – die Fahne in der Leitfarbe des Rezepts
  kuerbisballiste: { A: [P.f3, P.f6] },
  eiszapfen: { A: [P.b4, 0xe8f8ff] },
  leuchtpfeil: { A: [P.f5, P.f8] },
  matschkessel: { A: [P.e3, P.e6] },
  feuerwerk: { A: [P.r3, P.f7] },
  nebelleuchte: { A: [P.s6, P.s9] },
  gluehschwarm: { A: [P.f6, P.f8] },
  wetterhahn: { A: [P.b3, P.s8] },
};

/** Stufen-Fahne an der hinteren linken Ecke – groß genug, um sie im Getümmel zu lesen. */
export function levelFlag(m, type, level, spec, top) {
  if (level < 2) return;
  const x = -16;
  const z = -16;
  m.box(x, 8, z, x + 1, top + 23, z + 1, (xx) => (xx === x ? P.e4 : P.e3)); // Stange
  if (level >= 5) m.box(x, top + 24, z, x + 1, top + 25, z + 1, P.f7).set(x, top + 26, z, P.f6); // goldene Spitze
  if (level === 2) {
    // Weißer Wimpel (Dreieck)
    for (let i = 0; i < 14; i++) {
      const h = Math.round(6 * (1 - i / 14));
      for (let y = top + 16 - h; y <= top + 16 + h; y++) m.set(x + 2 + i, y, z, y === top + 16 + h ? P.s9 : P.s8);
    }
    return;
  }
  const [cloth, light] = SPEC_COLORS[type][spec || 'A'];
  m.box(x + 2, top + 8, z, x + 19, top + 21, z, (xx, yy) => {
    if (level >= 4 && (yy === top + 14 || yy === top + 15 || (level >= 5 && (yy === top + 10 || yy === top + 11)))) return light; // Streifen
    const tail = xx - (x + 16);
    if (tail >= 0 && Math.abs(yy - (top + 14.5)) < 3.5 - tail) return null; // Schwalbenschwanz
    if (yy === top + 21) return shade(cloth, 1) === cloth ? light : shade(cloth, 1);
    return cloth;
  });
}

/** Goldene Nieten (Stufenmarken) vorn am Sockel. */
export function pips(m, level, y = 4) {
  for (let k = 0; k < level; k++) {
    const c = k < 2 ? P.f5 : k < 4 ? P.s8 : P.f7;
    m.box(-10 + k * 4, y, 16, -9 + k * 4, y + 1, 16, c).set(-10 + k * 4, y + 1, 16, shade(c, 1));
  }
}

/** Sockel aus behauenen Steinen mit feinen Fugen, jede Steinreihe oben mit heller Kante. */
export function plinth(m, seed, top = 7) {
  m.box(-16, 0, -16, 15, top, 15, (x, y, z) => {
    const corner = (x === -16 || x === 15) && z === 15; // vordere Ecken abgeschrägt
    if (corner && y >= top - 1) return null;
    const row = y >> 2;
    const u = (z === 15 ? x : x + z) + (row % 2) * 6;
    if (y === top) return hash3(x >> 1, y, z >> 1, seed) < 0.3 ? P.s5 : x === -16 || z === 15 ? P.s7 : P.s6;
    if (y % 4 === 3 && y < top - 1) return P.s3; // Lagerfuge
    if (((u % 12) + 12) % 12 === 0) return P.s3; // Stoßfuge
    const h = hash3(Math.floor(u / 12), row, z >> 3, seed);
    const c = h < 0.3 ? P.s4 : h < 0.75 ? P.s5 : P.s6;
    return y % 4 === 2 ? shade(c, 1) : c; // helle Oberkante des Steins
  });
}

// --- Bolzenwerfer ------------------------------------------------------------------

function boltBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed);
  const wood = level >= 2 ? [P.e4, P.e3, P.e5] : [P.e5, P.e4, P.e6];
  // Gerüst: vier Pfosten, Kreuzstreben vorn und hinten, oben eine Bohlenplattform
  for (const [x, z] of [[-14, -14], [10, -14], [-14, 10], [10, 10]]) {
    m.box(x, 8, z, x + 3, 33, z + 3, (xx, y) => (xx === x ? wood[2] : xx === x + 3 ? wood[1] : (y >> 2) % 3 === 0 && xx === x + 1 ? wood[1] : wood[0]));
  }
  for (const z of [-14, 12]) {
    m.line(-12, 10, z, 8, 30, z, wood[1], 1);
    m.line(8, 10, z, -12, 30, z, wood[0], 1);
  }
  m.box(-16, 34, -16, 15, 35, 15, (x, y, z) => {
    if (y === 34) return P.e3;
    if (z === 15) return P.e6;
    if (x % 8 === 0) return P.e4; // Fuge
    if ((x % 8 === 2 || x % 8 === 5) && (z === -13 || z === 12)) return P.s5; // Nägel
    return hash3(x >> 3, 0, z >> 2, seed) < 0.3 ? P.e6 : (x + z) % 9 === 0 ? P.e6 : P.e7;
  });
  if (level >= 2) {
    // Eisenbänder und Eckwinkel
    for (const [x, z] of [[-14, -14], [10, -14], [-14, 10], [10, 10]]) {
      m.box(x, 18, z, x + 3, 19, z + 3, (xx, y) => (y === 19 ? P.s6 : P.s5)).box(x, 28, z, x + 3, 29, z + 3, (xx, y) => (y === 29 ? P.s6 : P.s5));
    }
    for (const x of [-16, -15, 14, 15]) m.set(x, 35, 15, P.s6).set(x, 34, 15, P.s5);
  }
  // Bolzenvorrat im Köcher an der Seite; Repetierer mit einer Kiste Bolzen
  if (spec === 'B') {
    m.box(-14, 8, 2, -7, 15, 9, (x, y, z) => (y === 15 ? (x % 2 ? P.s6 : P.e3) : z === 9 && (y === 10 || y === 13) ? P.e3 : x === -14 ? P.e6 : P.e5));
  } else {
    m.box(6, 8, 2, 9, 23, 5, (x, y) => (y % 5 === 0 ? P.e2 : x === 6 ? P.e4 : P.e3));
    for (const [x, z] of [[6, 3], [7, 2], [8, 4], [9, 3]]) m.set(x, 24, z, P.s7).set(x, 25, z, P.a0).set(x, 26, z, P.a1);
  }
  pips(m, level);
  levelFlag(m, 'bolzen', level, spec, 35);
  return m;
}

function boltHead(level, spec) {
  const m = new VoxelModel();
  // Drehteller mit Rand
  m.cylinder(0, 0, 0, 3, 9.2, (x, y, z) => (y === 3 ? (Math.hypot(x + 0.5, z + 0.5) > 7.6 ? P.s6 : P.s5) : y === 0 ? P.s3 : P.s4));
  // Schaft nach vorn (+z) mit Rinne
  m.box(-2, 4, -14, 1, 7, 17, (x, y, z) => (y === 7 && (x === -1 || x === 0) ? P.e3 : x === -2 ? P.e6 : y === 4 ? P.e4 : P.e5));
  // Bogen: gebogene Arme vorn, Spitzen aus Eisen
  for (let x = -17; x <= 16; x++) {
    const xc = x + 0.5;
    const bend = Math.round((xc * xc) / 40);
    const tip = Math.abs(xc) >= 14;
    for (let y = 6; y <= 9; y++) m.set(x, y, 15 - bend, tip ? (y === 9 ? P.s7 : P.s6) : y === 9 ? P.e5 : y === 6 ? P.e3 : P.e4);
  }
  // Sehne zu den Spitzen, eingelegter Bolzen mit blanker Spitze und rotem Federkiel
  for (let x = -15; x <= 14; x++) m.set(x, 8, 8 - Math.round(Math.abs(x + 0.5) * 0.15), P.e9);
  m.box(-1, 8, 0, 0, 9, 19, (x, y) => (y === 9 ? P.s7 : P.s6));
  m.box(-1, 8, 20, 0, 9, 21, P.s9).box(-1, 8, 22, -1, 8, 23, P.s9);
  m.box(-3, 8, 1, -2, 9, 3, P.a0).box(1, 8, 1, 2, 9, 3, P.a0).box(-1, 10, 1, 0, 11, 3, P.a1);
  // Kurbel hinten
  m.box(-4, 4, -16, 3, 7, -16, P.s4).box(6, 2, -17, 7, 9, -16, P.s5).box(6, 10, -17, 7, 11, -16, P.e2);
  if (level >= 2) {
    m.box(-2, 2, -12, 1, 3, 13, P.s5); // Eisenbeschlag unter dem Schaft
    for (const z of [-10, 0, 10]) m.set(-2, 3, z, P.s7);
  }
  if (spec === 'A') {
    // Scharfschütze: langer Lauf mit Mündungsring, Fernrohr mit blauer Linse
    m.box(-2, 4, 18, 1, 7, 29, (x, y, z) => (z >= 28 ? P.s2 : x === -2 ? P.s4 : P.s3));
    m.box(-6, 12, -6, -3, 15, 11, (x, y, z) => (z === 11 ? (x === -5 && y === 14 ? P.a4 : P.b5) : z === -6 ? P.b3 : z % 6 === 0 ? P.s5 : y === 15 ? P.s4 : P.s3));
    m.box(-6, 10, 0, -3, 11, 3, P.s5);
    if (level >= 4) m.box(-2, 2, 14, 1, 3, 25, P.s6);
    if (level >= 5) m.box(-6, 16, 3, -3, 17, 4, P.f7);
  } else if (spec === 'B') {
    // Repetierer: Trommelmagazin obendrauf und ein zweiter Bogen darunter
    m.cylinder(0, -2, 10, 19, 6.4, (x, y, z) => (y === 19 ? ((x + z) % 3 === 0 ? P.f5 : P.s6) : y % 3 === 0 ? P.s4 : x < -2 ? P.s6 : P.s5));
    for (let x = -13; x <= 12; x++) {
      const xc = x + 0.5;
      m.box(x, 2, 13 - Math.round((xc * xc) / 40), x, 3, 13 - Math.round((xc * xc) / 40), Math.abs(xc) >= 10 ? P.s6 : P.e4);
    }
    if (level >= 4) m.box(-1, 20, -3, 0, 20, -2, P.f5);
    if (level >= 5) m.set(-2, 20, 0, P.f7).set(1, 20, -4, P.f7);
  }
  return m;
}

// --- Kürbiskatapult ----------------------------------------------------------------

/** Gerippter Kürbis mit Mitte (cx, y0 = Unterseite, cz): feine Furchen, glänzende Rippen, Stiel. */
export function pumpkin(m, cx, y0, cz, r, colors = [P.f3, P.f4, P.f5]) {
  m.ellipsoid(cx, y0 + r * 0.8, cz, r, r * 0.8, r, (x, y, z, dx, dy) => {
    const a = Math.atan2(z + 0.5 - cz, x + 0.5 - cx);
    const ph = ((a / (Math.PI * 2)) * 10 + 10.25) % 1;
    const edge = Math.min(ph, 1 - ph);
    if (edge < 0.1) return colors[0]; // Furche
    if (dy > 0.6 || (edge > 0.3 && dy > 0)) return colors[2];
    return dy < -0.5 ? colors[0] : colors[1];
  });
  const top = Math.round(y0 + r * 1.6);
  m.box(Math.floor(cx) - 1, top, Math.floor(cz) - 1, Math.floor(cx), top + 1, Math.floor(cz), (x) => (x === Math.floor(cx) ? P.g3 : P.g4));
}

function catapultBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed);
  // Lafette aus Bohlen, zwei Böcke für die Achse
  m.box(-14, 8, -14, 13, 13, 13, (x, y, z) => {
    if (y === 13) return x % 8 === 0 ? P.e4 : (x + z) % 11 === 0 ? P.e5 : P.e6;
    if (z === 13) return x % 8 === 0 ? P.e3 : y === 8 ? P.e3 : P.e4;
    return P.e5;
  });
  for (const x of [-14, 10]) {
    m.line(x, 14, -6, x, 25, 0, P.e3, 1).line(x, 14, 6, x, 25, 0, P.e3, 1);
    m.line(x + 2, 14, -6, x + 2, 25, 0, P.e4, 1).line(x + 2, 14, 6, x + 2, 25, 0, P.e4, 1);
  }
  // Kürbisvorrat hinten
  const stock = spec === 'A' ? [P.r2, P.f3, P.f4] : [P.f3, P.f4, P.f5];
  pumpkin(m, -8, 14, -10, 5.2, stock);
  pumpkin(m, 4, 14, -10, 4.4, stock);
  if (spec === 'B') for (const [x, z] of [[-2, -12], [8, -6], [-10, -4]]) pumpkin(m, x, 14, z, 2.8, stock);
  if (level >= 2) m.box(-14, 10, 14, 13, 11, 14, (x, y) => (y === 11 ? P.s6 : P.s5)).box(-15, 10, 14, -15, 13, 15, P.s6).box(14, 10, 14, 14, 13, 15, P.s6); // Eisenkante vorn
  pips(m, level);
  levelFlag(m, 'katapult', level, spec, 27);
  return m;
}

function catapultHead(level, spec) {
  const m = new VoxelModel();
  // Achse quer, Wurfarm schräg nach hinten oben, vorn ein Gegengewicht aus Steinen
  m.box(-13, 0, -2, 12, 3, 1, (x, y, z) => ((y === 0 || y === 3) && (z === -2 || z === 1) ? null : x === -13 || x === 12 ? P.e6 : y === 3 ? P.e4 : P.e3));
  for (let t = 0; t <= 29; t++) {
    const z = -Math.round(t * 0.85);
    m.box(-2, 2 + t, z, 1, 2 + t, z, (x) => (t % 10 === 0 || t % 10 === 1 ? P.e3 : x === -2 ? P.e6 : x === 1 ? P.e4 : P.e5));
  }
  m.box(-6, -6, 2, 5, 1, 7, (x, y, z) => (y === 1 ? P.s6 : (y + 6) % 4 === 3 ? P.s3 : (x + 6) % 6 === 0 ? P.s3 : hash3(x >> 1, y >> 1, z, 4) < 0.4 ? P.s4 : P.s5));
  // Korb mit Kürbis: geflochten
  m.box(-6, 28, -30, 5, 31, -19, (x, y, z) => {
    if (y > 28 && x > -6 && x < 5 && z > -30 && z < -19) return null;
    return (x + y + z) % 2 ? P.e3 : P.e4;
  });
  const colors = spec === 'A' ? [P.r2, P.f3, P.f4] : [P.f3, P.f4, P.f5];
  if (spec === 'B') {
    pumpkin(m, -3, 29, -24, 3.0, colors);
    pumpkin(m, 2, 29, -26, 2.8, colors);
    pumpkin(m, -1, 31, -22, 2.6, colors);
  } else {
    pumpkin(m, 0, 29, -25, 5.2, colors);
  }
  // Seile vom Korb
  m.box(-6, 32, -30, -6, 33, -30, P.e8).box(5, 32, -30, 5, 33, -30, P.e8);
  if (level >= 2) m.box(-2, 10, -8, 1, 10, -7, P.s5).box(-2, 20, -17, 1, 20, -16, P.s5); // Eisenringe am Arm
  return m;
}

/**
 * Feuerkürbis: ein Gesicht vorn in den Kürbis im Korb schnitzen (Voxel aus dem
 * Kopf nehmen, dahinter dunkel) – die Löcher glimmen als eigenes Modell.
 */
function carveFireFace(head) {
  const glow = new VoxelModel();
  const face = ['#.....#', '##...##', '...#...', '#.....#', '.#####.', '..#.#..'];
  face.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== '#') continue;
      const x = i - 3;
      const y = 39 - r;
      let z = -17;
      while (z > -32 && !head.has(x, y, z)) z--;
      if (z <= -32) continue;
      head.set(x, y, z, null).set(x, y, z - 1, P.f1);
      glow.set(x, y, z, WHITE);
    }
  });
  return glow;
}

// --- Rasensprenger -----------------------------------------------------------------

function sprinklerBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed);
  const tank = spec === 'A' ? [P.b5, P.a4, P.b4] : spec === 'B' ? [P.e3, P.e4, P.e2] : [P.b3, P.b4, P.b2];
  // Tank aus Dauben mit Spannbändern und Nieten, oben ein Deckel
  m.cylinder(0, 0, 8, 27, 12.8, (x, y, z) => {
    const a = Math.atan2(z + 0.5, x + 0.5);
    if (y === 12 || y === 13 || y === 22 || y === 23 || (level >= 2 && (y === 17 || y === 18))) {
      if ((y === 12 || y === 22 || y === 17) && Math.floor((a / Math.PI) * 12 + 24) % 4 === 0) return P.s8; // Nieten
      return y === 13 || y === 23 || y === 18 ? P.s6 : P.s5;
    }
    if (y === 27) return tank[1];
    const u = (a / Math.PI) * 16 + 32;
    const f = u - Math.floor(u);
    if (f < 0.14) return tank[2]; // Fugen der Dauben
    if (x + 0.5 < -5 && f > 0.5) return shade(tank[0], 1);
    return hash3(Math.floor(u), y >> 2, 0, seed) < 0.15 ? tank[1] : tank[0];
  });
  m.cylinder(0, 0, 28, 29, 6.8, (x, y) => (y === 29 ? P.s6 : P.s5));
  m.box(-2, 28, -2, 1, 39, 1, (x, y) => (y % 6 === 0 ? P.s7 : x === -2 ? P.s6 : P.s5)); // Steigrohr
  // Grüner Schlauch aufgerollt vorn rechts auf dem Sockel, Messinghahn
  for (let x = 4; x <= 15; x++) {
    for (let z = 4; z <= 15; z++) {
      const d = Math.hypot(x + 0.5 - 10, z + 0.5 - 10);
      if (d > 5.2 || d < 2.2 || m.has(x, 8, z)) continue;
      const ring = Math.floor(d * 1.4) % 2;
      m.set(x, 8, z, ring ? P.g4 : P.g5).set(x, 9, z, ring ? P.g5 : P.g6);
    }
  }
  m.box(-16, 16, -2, -13, 19, 1, (x, y) => (y === 19 ? P.f6 : P.f5)).box(-16, 20, -1, -15, 21, 0, P.f6);
  if (spec === 'A') for (const [x, z] of [[-10, 6], [8, -10], [4, 10], [-6, -10]]) m.set(x, 27, z, 0xe8f8ff).set(x, 26, z + (z > 0 ? 1 : -1), P.b5).set(x + 1, 27, z, P.a4); // Eis
  if (spec === 'B') for (const [x, z, y] of [[-10, 8, 18], [6, 10, 14], [10, -6, 20]]) m.box(x, y - 2, z, x + 1, y, z, P.e2).set(x, y - 3, z, P.e3); // Schlammspritzer
  pips(m, level);
  levelFlag(m, 'sprenger', level, spec, 27);
  return m;
}

function sprinklerHead(level, spec) {
  const m = new VoxelModel();
  const brass = spec === 'B' ? [P.e4, P.e5, P.e6] : [P.f4, P.f5, P.f6];
  m.cylinder(0, 0, 0, 5, 3.6, (x, y) => (y === 5 ? brass[2] : x < -1 ? brass[1] : brass[0])); // Nabe
  // Zwei gebogene Arme mit Düsen
  for (let x = 2; x <= 15; x++) {
    const z = Math.round((x * x) / 32);
    m.box(x, 4, -z - 1, x, 5, -z, (xx, y) => (y === 5 ? brass[2] : brass[1]));
    m.box(-x - 1, 4, z - 1, -x - 1, 5, z, (xx, y) => (y === 5 ? brass[2] : brass[1]));
  }
  m.box(15, 4, -9, 16, 7, -7, P.s9).box(-17, 4, 6, -16, 7, 8, P.s9);
  // Wasserfäden an den Düsen (A: Frost, B: Schlamm)
  const drop = spec === 'A' ? 0xe8f8ff : spec === 'B' ? P.e3 : P.b5;
  for (const [x, y, z] of [[17, 7, -9], [18, 8, -10], [19, 9, -11], [-18, 7, 8], [-19, 8, 9], [-20, 9, 10]]) m.set(x, y, z, drop);
  if (level >= 4) m.box(-1, 6, -1, 0, 6, 0, P.s8).set(-2, 6, -2, P.s8);
  return m;
}

// --- Laternenturm ------------------------------------------------------------------

function lanternBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed, 11);
  // Hoher Pfahl mit Maserung, Trittsprossen und Streben
  m.box(-4, 12, -4, 3, 55, 3, (x, y) => (y % 14 === 0 ? P.e3 : x <= -3 ? P.e5 : (x + (y >> 3)) % 4 === 0 ? P.e3 : P.e4));
  for (let y = 18; y <= 48; y += 10) m.box(4, y, -2, 7, y + 1, 1, (x, yy) => (yy === y + 1 ? P.e7 : P.e6));
  m.line(-12, 12, -2, -6, 28, -2, P.e3, 1).line(10, 12, 0, 4, 28, 0, P.e3, 1);
  if (level >= 2) m.box(-6, 12, -6, 5, 13, 5, (x, y) => (y === 13 ? P.s6 : P.s5)).box(-5, 36, -5, 4, 37, 4, (x, y) => (y === 37 ? P.s6 : P.s5));
  if (spec === 'B') {
    // Kleeblätter am Pfahl: drei Blättchen an einem Stiel
    for (const [x, y, z] of [[4, 40, 4], [-6, 28, -6], [4, 24, -6]]) {
      const s = x > 0 ? 1 : -1;
      m.set(x, y - 1, z, P.g4).box(x, y, z, x + s, y + 1, z, P.g6).box(x + 2 * s, y, z, x + 3 * s, y + 1, z, P.g7).box(x + s, y + 2, z, x + 2 * s, y + 3, z, P.g7);
    }
  }
  pips(m, level, 6);
  levelFlag(m, 'laternenturm', level, spec, 25);
  return m;
}

function lanternHead(level, spec) {
  const m = new VoxelModel();
  const frame = spec === 'B' ? [P.f5, P.f4] : [P.s3, P.s2];
  m.box(-8, 0, -8, 7, 3, 7, (x, y) => (y === 3 ? frame[0] : frame[1])); // Boden
  for (const [x, z] of [[-8, -8], [7, -8], [-8, 7], [7, 7]]) m.box(x, 4, z, x, 19, z, frame[1]); // Streben
  // Spitzes Dach in Stufen mit Knauf
  m.box(-10, 20, -10, 9, 21, 9, (x, y) => (y === 21 ? frame[0] : frame[1]));
  m.box(-8, 22, -8, 7, 23, 7, spec === 'B' ? P.f5 : P.s4);
  m.box(-5, 24, -5, 4, 25, 4, frame[0]);
  m.box(-3, 26, -3, 2, 27, 2, frame[1]);
  m.box(-1, 28, -1, 0, 30, 0, P.f6);
  if (spec === 'A') {
    // Leuchtfeuer: breiter Blendring und ein zweites Licht obendrauf
    m.box(-12, 18, -12, 11, 19, 11, (x, y, z) => (Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5)) > 9 ? (y === 19 ? P.s5 : P.s4) : null));
    m.box(-4, 31, -4, 3, 31, 3, P.s3);
  }
  if (level >= 4) for (const [x, z] of [[-10, 9], [9, 9], [-10, -10], [9, -10]]) m.set(x, 21, z, P.f7);
  return m;
}

function lanternGlow(spec) {
  const m = new VoxelModel();
  m.box(-7, 4, -7, 6, 19, 6, WHITE);
  if (spec === 'A') m.box(-2, 32, -2, 1, 35, 1, WHITE);
  return m;
}

// --- Zusammenbau -------------------------------------------------------------------

function fineBolt(level, spec, seed) {
  return { base: boltBase(level, spec, seed), head: boltHead(level, spec), headY: 36, glow: null, glowOnHead: false };
}

function fineCatapult(level, spec, seed) {
  const head = catapultHead(level, spec);
  const glow = spec === 'A' ? carveFireFace(head) : null;
  return { base: catapultBase(level, spec, seed), head, headY: 24, glow, glowOnHead: true };
}

function fineSprinkler(level, spec, seed) {
  return { base: sprinklerBase(level, spec, seed), head: sprinklerHead(level, spec), headY: 40, glow: null, glowOnHead: false };
}

function fineLantern(level, spec, seed) {
  return { base: lanternBase(level, spec, seed), head: lanternHead(level, spec), headY: 56, glow: lanternGlow(spec), glowOnHead: true };
}

/**
 * Besondere Turmteile (Meilenstein 10) im Maß 1/16 (buildings.js setzt sie mit
 * 1/16 m je Voxel), Ursprung jeweils an der
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

/**
 * Modelle eines Turms (1/32 m, M13g) für Stufe und Spezialisierung.
 * @returns {{base: VoxelModel, head: VoxelModel, headY: number, glow: VoxelModel|null, glowOnHead: boolean, unit: number}}
 */
export function fineTowerModels(type, level, spec, seed = 5) {
  const m = {
    bolzen: fineBolt,
    katapult: fineCatapult,
    sprenger: fineSprinkler,
    laternenturm: fineLantern,
    ...FAMILY_MODELS, // M19: Glockenturm, Windrad, Bienenkorb, Vogelscheuche
    ...MIX_MODELS, // M20: Mischtürme auf zwei Feldern
  }[type](level, spec, seed);
  return { ...m, unit: TOWER_UNIT };
}
