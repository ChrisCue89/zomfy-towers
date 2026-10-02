// Mischtürme (M20): zwei Felder breit (x ∈ [−32, 31], z ∈ [−16, 15] im Maß 1/32),
// in der Mitte ein Sockel für den Kopf, links und rechts erkennt man die beiden
// Türme, aus denen er entstand. Steht er übereinander (turns = 1), dreht
// buildings.js den Sockel. Leitfarbe und Silhouette je Rezept:
//   Kürbisballiste     große Armbrust mit Kürbisspitze, Bolzengestell und Kürbisse
//   Eiszapfenschleuder blauer Tank mit Eiszapfen, Armbrust mit Eiszapfen
//   Leuchtpfeil        Laternenpfahl und Köcher, Armbrust mit glühender Spitze
//   Matschkessel       eiserner Kessel voll Matsch, Wurfarm mit Matschkelle
//   Feuerwerk          Kisten voller bunter Raketen, Raketengestell
//   Nebelleuchte       kleiner Leuchtturm, Wassertank, drehende Laterne
//   Glühschwarm        zwei Strohkörbe, dazwischen eine leuchtende Laterne
//   Wetterhahn         Mast mit Hahn, Wasserfass, Flügel mit blauen Segeln

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';
import { shade, sculpt, blob, roundTone } from './voxelKit.js';
import { pips, levelFlag, pumpkin } from './towerModels.js';

const WHITE = 0xffffff;
const ICE = [0xe8f8ff, 0xa8dcff, P.b5];

/** Sockel über zwei Felder aus behauenen Steinen (wie plinth, doppelt so breit). */
function plinth2(m, seed, top = 7) {
  m.box(-32, 0, -16, 31, top, 15, (x, y, z) => {
    const corner = (x === -32 || x === 31) && z === 15;
    if (corner && y >= top - 1) return null;
    const row = y >> 2;
    const u = (z === 15 ? x : x + z) + (row % 2) * 6;
    if (y === top) return hash3(x >> 1, y, z >> 1, seed) < 0.3 ? P.s5 : x === -32 || z === 15 ? P.s7 : P.s6;
    if (y % 4 === 3 && y < top - 1) return P.s3;
    if (((u % 12) + 12) % 12 === 0) return P.s3;
    const h = hash3(Math.floor(u / 12), row, z >> 3, seed);
    const c = h < 0.3 ? P.s4 : h < 0.75 ? P.s5 : P.s6;
    return y % 4 === 2 ? shade(c, 1) : c;
  });
}

/** Stufen-Fahne hinten links (am linken Feld) und Nieten vorn in der Mitte. */
function marks(m, type, level, top) {
  pips(m, level);
  const f = new VoxelModel();
  levelFlag(f, type, level, 'A', top);
  f.forEach((x, y, z, c) => m.set(x - 16, y, z, c));
}

function timber(x, y, lightX) {
  if (x === lightX) return P.e5;
  return (x + (y >> 3)) % 5 === 0 ? P.e3 : P.e4;
}

/** Runder Holzbock in der Mitte, auf dem der Kopf sitzt. */
function pedestal(m, top, r = 7.5) {
  m.cylinder(0, 0, 8, top, r, (x, y, z) => {
    if (y === top) return (x + z) % 5 === 0 ? P.e5 : P.e6;
    if (y % 8 === 0) return P.s5; // Eisenband
    return x + 0.5 < -3 ? P.e5 : (x + (y >> 2)) % 6 === 0 ? P.e3 : P.e4;
  });
}

/** Fass bzw. Tank mit Bändern (Dauben), Farbe je Inhalt. */
function tank(m, cx, cz, y0, y1, r, colors, seed) {
  m.cylinder(cx, cz, y0, y1, r, (x, y, z) => {
    if ((y - y0) % 8 === 4 || (y - y0) % 8 === 5) return (y - y0) % 8 === 5 ? P.s6 : P.s5;
    if (y === y1) return colors[1];
    const a = Math.atan2(z + 0.5 - cz, x + 0.5 - cx);
    const u = (a / Math.PI) * 12 + 24;
    if (u - Math.floor(u) < 0.14) return colors[2];
    return hash3(Math.floor(u), y >> 2, 0, seed) < 0.15 ? colors[1] : colors[0];
  });
}

/**
 * Armbrust auf einem Drehteller (Kopf der Ballista, der Eiszapfenschleuder und
 * des Leuchtpfeils): Schaft nach vorn (+z), Bogen, Sehne. `span` = halbe Breite.
 */
function crossbow(m, { span, arm, tip, reach = 18 }) {
  m.cylinder(0, 0, 0, 2, 8.5, (x, y) => (y === 2 ? P.s6 : P.s4));
  m.box(-2, 3, -14, 1, 6, reach, (x, y, z) => (y === 6 && (x === -1 || x === 0) ? P.e3 : x === -2 ? P.e6 : y === 3 ? P.e4 : P.e5));
  for (let x = -span; x < span; x++) {
    const xc = x + 0.5;
    const bend = Math.round((xc * xc) / (span * 2.4));
    const end = Math.abs(xc) >= span - 3;
    for (let y = 5; y <= 9; y++) m.set(x, y, reach - 2 - bend, end ? (y === 9 ? shade(tip, 1) : tip) : y === 9 ? shade(arm, 1) : y === 5 ? shade(arm, -1) : arm);
  }
  for (let x = -span + 2; x < span - 2; x++) m.set(x, 8, 8 - Math.round(Math.abs(x + 0.5) * 0.12), P.e9); // Sehne
  m.box(-4, 3, -16, 3, 6, -15, P.s4).box(4, 2, -17, 5, 9, -16, P.s5); // Winde hinten
}

// --- Kürbisballiste ---------------------------------------------------------------

function ballistaBase(level, seed) {
  const m = new VoxelModel();
  plinth2(m, seed);
  pedestal(m, 27, 8);
  // Links: Gestell des Bolzenwerfers mit schweren Bolzen
  for (const z0 of [-12, 8]) m.box(-29, 8, z0, -26, 32, z0 + 3, (x, y) => timber(x, y, -29));
  m.box(-30, 32, -13, -25, 33, 12, (x, y) => (y === 33 ? P.e6 : P.e4));
  m.line(-27, 10, -9, -27, 30, 7, P.e3, 1);
  for (const [y, z] of [[18, -6], [22, -1], [26, 4]]) {
    m.box(-24, y, z, -12, y + 1, z + 1, (x, yy) => (yy === y + 1 ? P.e7 : P.e6));
    pumpkin(m, -10, y - 1, z + 0.5, 2.2);
  }
  // Rechts: Kürbisvorrat
  pumpkin(m, 21, 8, -7, 5.6);
  pumpkin(m, 13, 8, 7, 4.4);
  pumpkin(m, 25, 8, 8, 3.8, [P.r2, P.f3, P.f4]);
  if (level >= 4) m.box(-9, 8, 13, 8, 9, 15, (x, y) => (y === 9 ? P.s6 : P.s5)); // Eisenkante vorn am Bock
  marks(m, 'kuerbisballiste', level, 34);
  return m;
}

function ballistaHead(level) {
  const m = new VoxelModel();
  crossbow(m, { span: 24, arm: P.e4, tip: P.s6, reach: 20 });
  // Schwerer Bolzen mit Kürbisspitze und roten Federn
  m.box(-1, 7, -4, 0, 9, 22, (x, y) => (y === 9 ? P.e7 : P.e6));
  pumpkin(m, -0.5, 6, 25, 3.2);
  m.box(-3, 8, -3, -2, 9, 0, P.r3).box(1, 8, -3, 2, 9, 0, P.r3).box(-1, 10, -3, 0, 11, 0, P.r2);
  if (level >= 4) m.box(-2, 1, -12, 1, 2, 16, P.s5);
  if (level >= 5) m.box(-26, 9, 12, -25, 10, 13, P.f7).box(24, 9, 12, 25, 10, 13, P.f7);
  return m;
}

// --- Eiszapfenschleuder ------------------------------------------------------------

function icicleBase(level, seed) {
  const m = new VoxelModel();
  plinth2(m, seed);
  pedestal(m, 29, 7);
  // Links: der blaue Tank des Sprengers, am Rand hängen Eiszapfen
  tank(m, -18, -1, 8, 30, 10.8, [P.b4, P.b5, P.b3], seed);
  for (let k = 0; k < 11; k++) {
    const a = Math.PI * (0.08 + (k / 10) * 0.84); // nur die Vorderseite
    const x = Math.round(-18 + Math.cos(a) * 10.8);
    const z = Math.round(-1 + Math.sin(a) * 10.8);
    const len = 3 + ((k * 7) % 5);
    for (let y = 30 - len; y <= 30; y++) m.set(x, y, z, y === 30 - len ? ICE[0] : y > 27 ? ICE[2] : ICE[1]);
  }
  m.cylinder(-18, -1, 31, 32, 7, (x, y) => (y === 32 ? ICE[0] : ICE[1])); // Eisdecke auf dem Tank
  // Rechts: Gestell mit Eiszapfen als Munition
  for (const x0 of [10, 25]) m.box(x0, 8, -8, x0 + 2, 26, -6, (x, y) => timber(x, y, x0));
  m.box(9, 26, -9, 28, 27, -5, (x, y) => (y === 27 ? P.e6 : P.e4));
  for (let x = 12; x <= 24; x += 3) for (let y = 17; y <= 25; y++) m.set(x, y, -7, y === 17 ? ICE[0] : y > 22 ? ICE[2] : ICE[1]);
  for (const [x, z] of [[14, 6], [20, 9], [24, 4], [9, 10]]) m.box(x, 8, z, x + 2, 9, z + 1, ICE[1]).set(x + 1, 10, z, ICE[0]); // Eisbrocken
  if (level >= 4) m.box(-6, 20, 7, 5, 21, 7, ICE[0]);
  marks(m, 'eiszapfen', level, 32);
  return m;
}

function icicleHead(level) {
  const m = new VoxelModel();
  crossbow(m, { span: 18, arm: P.b3, tip: ICE[1], reach: 17 });
  // Eiszapfen eingelegt: dick hinten, spitz vorn
  m.box(-1, 7, -2, 0, 9, 14, (x, y, z) => (y === 9 ? ICE[0] : z < 4 ? ICE[2] : ICE[1]));
  m.box(-1, 7, 15, 0, 8, 17, ICE[0]).set(-1, 7, 18, WHITE);
  // Reif auf den Armen
  for (const x of [-14, -9, 8, 13]) m.set(x, 10, 15 - Math.round(((x + 0.5) ** 2) / 43), ICE[0]);
  if (level >= 4) m.box(-2, 1, -10, 1, 2, 12, P.s5);
  if (level >= 5) m.set(-1, 10, 16, WHITE).set(0, 10, 12, WHITE);
  return m;
}

// --- Leuchtpfeil --------------------------------------------------------------------

function glowBase(level, seed) {
  const m = new VoxelModel();
  plinth2(m, seed);
  pedestal(m, 33, 7);
  // Links: Laternenpfahl mit Kappe; die Scheiben leuchten (baseGlow)
  m.box(-21, 8, -2, -16, 44, 3, (x, y) => (y % 12 === 0 ? P.e3 : x === -21 ? P.e5 : (x + (y >> 3)) % 4 === 0 ? P.e3 : P.e4));
  m.box(-24, 45, -5, -13, 46, 6, P.s4);
  m.box(-24, 56, -5, -13, 57, 6, P.s5).box(-22, 58, -3, -15, 59, 4, P.s6).box(-19, 60, 0, -18, 62, 1, P.s7);
  for (const [x, z] of [[-24, -5], [-14, -5], [-24, 5], [-14, 5]]) m.box(x, 47, z, x + 1, 55, z + 1, P.s3);
  // Rechts: Köcher mit leuchtenden Pfeilen
  m.box(12, 8, -4, 21, 26, 3, (x, y, z) => (y === 26 ? P.e2 : y % 6 === 2 ? P.e3 : x === 12 ? P.e6 : P.e5));
  for (const [x, z] of [[14, -2], [17, 0], [19, -3], [15, 1]]) m.box(x, 27, z, x, 33, z, P.e7);
  if (level >= 4) m.box(-24, 44, -5, -13, 44, 6, P.f6);
  marks(m, 'leuchtpfeil', level, 36);
  return m;
}

/** Leuchtendes am Sockel: Laternenscheiben und die Spitzen der Pfeile im Köcher. */
function glowBaseLight() {
  const g = new VoxelModel();
  g.box(-22, 47, -3, -16, 55, 4, WHITE); // zwischen den Pfosten, nie auf ihnen
  for (const [x, z] of [[14, -2], [17, 0], [19, -3], [15, 1]]) g.box(x, 34, z, x, 35, z, WHITE);
  return g;
}

function glowHead(level) {
  const m = new VoxelModel();
  crossbow(m, { span: 18, arm: P.e3, tip: P.f5, reach: 18 });
  m.box(-1, 7, -2, 0, 8, 18, P.e7); // Pfeil
  // Laternengehäuse als Zielhilfe oben auf dem Schaft
  m.box(-4, 10, -4, 3, 11, 3, P.s4).box(-4, 18, -4, 3, 19, 3, P.s5).box(-1, 20, -1, 0, 21, 0, P.s7);
  for (const [x, z] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) m.box(x, 12, z, x, 17, z, P.s3);
  if (level >= 4) m.box(-2, 1, -10, 1, 2, 12, P.s5);
  return m;
}

function glowHeadLight(level) {
  const g = new VoxelModel();
  g.box(-3, 12, -3, 2, 17, 2, WHITE); // Laternenglas
  g.box(-1, 7, 19, 0, 8, 21, WHITE).set(-1, 8, 22, WHITE); // glühende Spitze
  if (level >= 5) g.box(-1, 9, 10, 0, 9, 12, WHITE);
  return g;
}

// --- Matschkessel -------------------------------------------------------------------

function mudBase(level, seed) {
  const m = new VoxelModel();
  plinth2(m, seed);
  // Mitte: Lafette mit zwei Böcken für die Achse (wie das Katapult)
  m.box(-8, 8, -8, 7, 12, 8, (x, y, z) => (y === 12 ? ((x + z) % 7 === 0 ? P.e5 : P.e6) : z === 8 ? P.e4 : P.e5));
  for (const x of [-8, 5]) m.line(x, 13, -5, x, 22, 0, P.e3, 1).line(x, 13, 5, x, 22, 0, P.e3, 1);
  // Rechts: eiserner Kessel voll Matsch, mit Blasen
  m.cylinder(20, 0, 8, 24, 10.5, (x, y, z) => {
    if (y === 24) return (x + z) % 4 === 0 ? P.e4 : hash3(x, y, z, seed) < 0.25 ? P.e2 : P.e3; // Matsch
    if (y === 23 && Math.hypot(x + 0.5 - 20, z + 0.5) > 9.4) return P.n2; // Rand
    return y < 11 ? P.n1 : x + 0.5 < 14 ? P.n3 : (y >> 2) % 3 === 0 ? P.n1 : P.n2;
  });
  for (const [x, z] of [[18, 3], [23, -4], [16, -5]]) m.set(x, 25, z, P.e5).set(x + 1, 25, z, P.e4); // Blasen
  for (const [x, z] of [[11, 9], [28, 8]]) m.box(x, 8, z, x + 1, 10, z + 1, P.n1); // Füße
  // Links: Wasserfass mit Rohr zum Kessel
  tank(m, -21, 0, 8, 26, 8, [P.b3, P.b4, P.b2], seed);
  m.box(-13, 20, -1, 9, 21, 0, (x, y) => (y === 21 ? P.s6 : P.s5));
  for (const [x, z, y] of [[-28, 10, 9], [-14, 12, 8], [28, -12, 8]]) m.box(x, y, z, x + 2, y, z + 1, P.e3); // Spritzer
  if (level >= 4) m.box(9, 16, 10, 31, 17, 10, P.s6);
  marks(m, 'matschkessel', level, 30);
  return m;
}

function mudHead(level) {
  const m = new VoxelModel();
  // Achse quer, Wurfarm nach hinten oben, vorn ein Gegengewicht
  m.box(-9, 0, -2, 8, 3, 1, (x, y) => (x === -9 || x === 8 ? P.e6 : y === 3 ? P.e4 : P.e3));
  for (let t = 0; t <= 24; t++) {
    const z = -Math.round(t * 0.85);
    m.box(-2, 2 + t, z, 1, 2 + t, z, (x) => (t % 8 === 0 ? P.s5 : x === -2 ? P.e6 : P.e5));
  }
  m.box(-5, -5, 2, 4, 1, 6, (x, y) => (y === 1 ? P.s6 : (y + 5) % 3 === 0 ? P.s3 : P.s4));
  // Kelle voller Matsch
  m.box(-6, 23, -27, 5, 26, -17, (x, y, z) => {
    if (y > 23 && x > -6 && x < 5 && z > -27 && z < -17) return null;
    return y === 26 ? P.s6 : P.s4;
  });
  sculpt(m, blob(-0.5, 26, -22, 5, 3.4, 4.6), -6, 24, -27, 5, 30, -17, (x, y, z, n) => roundTone(P.e3, n, { light: 1, dark: -1 }));
  m.set(-2, 30, -22, P.e5).set(2, 29, -20, P.e4);
  if (level >= 5) m.box(-2, 12, -9, 1, 12, -8, P.f6);
  return m;
}

// --- Feuerwerk ----------------------------------------------------------------------

/** Rakete, stehend: bunter Leib, spitze Kappe, Stab darunter. */
function rocket(m, x, y0, z, color) {
  m.box(x, y0, z, x, y0 + 5, z, P.e7); // Stab
  m.box(x, y0 + 6, z, x + 1, y0 + 12, z + 1, (xx, y) => (y === y0 + 9 ? P.f7 : xx === x ? shade(color, 1) : color));
  m.set(x, y0 + 13, z, P.f7).set(x + 1, y0 + 13, z + 1, P.f6);
}

function fireworkBase(level, seed) {
  const m = new VoxelModel();
  plinth2(m, seed);
  pedestal(m, 25, 6.5);
  const colors = [P.r3, P.b4, P.g6, P.a4, P.f5];
  // Links und rechts: Kisten voller Raketen
  for (const [x0, x1] of [[-30, -12], [12, 30]]) {
    m.box(x0, 8, -10, x1, 16, 8, (x, y, z) => (y === 16 ? P.e6 : z === 8 && (y === 10 || y === 14) ? P.e3 : x === x0 ? P.e6 : P.e5));
    for (let k = 0; k < 5; k++) rocket(m, x0 + 2 + k * 3 + (k % 2), 17, -8 + ((k * 5) % 13), colors[(k + (x0 > 0 ? 2 : 0)) % colors.length]);
  }
  // Kleine Laterne am Pfosten hinten links (leuchtet: baseGlow)
  m.box(-28, 17, -14, -27, 34, -13, P.e4);
  m.box(-30, 35, -16, -25, 36, -11, P.s4).box(-30, 42, -16, -25, 43, -11, P.s5);
  if (level >= 4) for (const x of [-20, 20]) m.box(x, 16, 9, x + 3, 17, 9, P.r3);
  marks(m, 'feuerwerk', level, 28);
  return m;
}

function fireworkBaseLight() {
  const g = new VoxelModel();
  g.box(-29, 37, -15, -26, 41, -12, WHITE);
  return g;
}

function fireworkHead(level) {
  const m = new VoxelModel();
  m.cylinder(0, 0, 0, 2, 7.5, (x, y) => (y === 2 ? P.s6 : P.s4));
  // Gestell mit drei Rohren, schräg nach vorn oben
  const tubes = level >= 5 ? [-6, -2, 2, 6] : [-5, 0, 5];
  for (const x0 of tubes) {
    for (let t = 0; t <= 16; t++) {
      const y = 4 + Math.round(t * 0.55);
      const z = -8 + t;
      m.box(x0 - 1, y, z, x0 + 1, y + 2, z, (x, yy) => (t === 16 ? P.n1 : yy === y + 2 ? P.s6 : x === x0 - 1 ? P.s5 : P.s4));
    }
  }
  m.box(-8, 3, -9, 7, 4, -6, P.e4); // Querbrett hinten
  if (level >= 4) m.box(-8, 3, 4, 7, 4, 5, P.s6);
  return m;
}

/** Leuchtende Raketenspitzen vorn in den Rohren. */
function fireworkHeadLight(level) {
  const g = new VoxelModel();
  const tubes = level >= 5 ? [-6, -2, 2, 6] : [-5, 0, 5];
  for (const x0 of tubes) g.set(x0, 14, 9, WHITE).set(x0, 13, 9, WHITE);
  return g;
}

// --- Nebelleuchte -------------------------------------------------------------------

function fogBase(level, seed) {
  const m = new VoxelModel();
  plinth2(m, seed);
  // Mitte: kleiner Leuchtturm, weiß mit roten Ringen, nach oben schlanker
  for (let y = 8; y <= 46; y++) {
    const r = 9.5 - (y - 8) * 0.07;
    m.cylinder(0, 0, y, y, r, (x) => ((y >> 3) % 2 ? (x + 0.5 < -3 ? P.r2 : P.r3) : x + 0.5 < -3 ? P.s7 : P.s8));
  }
  m.box(-2, 12, 7, 1, 18, 9, P.e3); // Tür
  m.box(-1, 28, 7, 0, 31, 8, P.n2); // Fensterchen
  m.cylinder(0, 0, 47, 48, 8, (x, y) => (y === 48 ? P.s6 : P.s4)); // Galerie
  // Links: Wassertank, Rohr hinauf zur Laterne
  tank(m, -22, 2, 8, 24, 7.5, [P.b3, P.b4, P.b2], seed);
  m.box(-15, 22, 1, -9, 23, 2, P.s5);
  // Rechts: Düsen, aus denen der Nebel kommt
  for (const [x, z] of [[14, -6], [22, 2], [15, 9]]) {
    m.box(x, 8, z, x + 1, 14, z + 1, P.s5).box(x - 1, 15, z - 1, x + 2, 16, z + 2, P.f5);
    m.set(x, 18, z, 0xe8eef4).set(x + 1, 19, z, 0xd8e2ea);
  }
  if (level >= 4) m.box(-9, 36, 8, 8, 37, 8, P.f6);
  marks(m, 'nebelleuchte', level, 44);
  return m;
}

function fogHead(level) {
  const m = new VoxelModel();
  // Laternenhaus: Pfosten, rotes Dach mit Kugel
  for (const [x, z] of [[-6, -6], [5, -6], [-6, 5], [5, 5]]) m.box(x, 0, z, x, 9, z, P.s3);
  m.box(-6, 0, -6, 5, 0, 5, P.s4);
  for (let k = 0; k < 6; k++) m.box(-7 + k, 10 + k, -7 + k, 6 - k, 10 + k, 6 - k, k === 0 ? P.r2 : P.r3);
  m.box(-1, 16, -1, 0, 17, 0, P.f6);
  if (level >= 5) m.set(-1, 18, -1, P.f7);
  return m;
}

/** Linse und Licht im Laternenhaus; die Seite nach vorn heller. */
function fogHeadLight() {
  const g = new VoxelModel();
  g.box(-5, 1, -5, 4, 8, 4, WHITE);
  return g;
}

// --- Glühschwarm --------------------------------------------------------------------

/** Strohkorb auf dem Bänkchen (wie beim Bienenkorb, etwas kleiner). */
function skep(m, cx, seed) {
  const dome = blob(cx, 13, 0, 10, 17, 10);
  sculpt(m, (x, y, z) => Math.max(dome(x, y, z), 13 - y), cx - 11, 13, -11, cx + 10, 30, 10, (x, y, z, n) => {
    if ((y - 13) % 4 === 3) return roundTone(P.e4, n);
    return roundTone(hash3(x >> 1, y, z >> 1, seed) < 0.3 ? P.e8 : P.e7, n);
  });
  m.box(cx - 2, 14, 9, cx + 1, 16, 10, P.n0); // Flugloch
}

function swarmBase(level, seed) {
  const m = new VoxelModel();
  plinth2(m, seed, 5);
  for (const x0 of [-29, -3, 25]) m.box(x0, 6, -8, x0 + 2, 11, 7, (x) => (x === x0 ? P.e5 : P.e4));
  m.box(-31, 12, -10, 30, 13, 9, (x, y, z) => (y === 13 ? (z === 9 ? P.e7 : P.e6) : P.e4));
  skep(m, -18, seed);
  skep(m, 18, seed + 1);
  // Mitte: Pfosten der Laterne
  m.box(-2, 14, -2, 1, 29, 1, (x, y) => (y % 8 === 0 ? P.e3 : x === -2 ? P.e5 : P.e4));
  if (level >= 4) for (const [x, y] of [[-26, 24], [10, 26], [26, 20]]) m.set(x, y, 8, P.f6).set(x + 1, y, 8, P.n1);
  marks(m, 'gluehschwarm', level, 28);
  return m;
}

function swarmHead(level) {
  const m = new VoxelModel();
  m.box(-5, 0, -5, 4, 1, 4, P.s4);
  for (const [x, z] of [[-5, -5], [4, -5], [-5, 4], [4, 4]]) m.box(x, 2, z, x, 9, z, P.s3);
  m.box(-6, 10, -6, 5, 11, 5, P.f4).box(-4, 12, -4, 3, 13, 3, P.f5).box(-1, 14, -1, 0, 15, 0, P.f6); // Honiggelbe Haube
  if (level >= 5) for (const [x, z] of [[-6, -6], [5, -6], [-6, 5], [5, 5]]) m.set(x, 12, z, P.f7);
  return m;
}

function swarmHeadLight() {
  const g = new VoxelModel();
  g.box(-4, 2, -4, 3, 9, 3, WHITE);
  return g;
}

// --- Wetterhahn ---------------------------------------------------------------------

function vaneBase(level, seed) {
  const m = new VoxelModel();
  plinth2(m, seed);
  // Mast mit Sprossen und Streben
  for (let y = 8; y <= 60; y++) {
    const r = y < 28 ? 4 : y < 46 ? 3 : 2;
    m.box(-r, y, -r, r - 1, y, r - 1, (x) => timber(x, y, -r));
  }
  for (let y = 16; y <= 52; y += 9) m.box(3, y, -1, 5, y, 0, P.e6);
  m.line(-12, 8, -1, -3, 32, -1, P.e3, 1).line(11, 8, -1, 2, 32, -1, P.e3, 1);
  // Gondel, oben drauf der Hahn aus Eisen
  m.box(-5, 60, -9, 4, 67, 3, (x, y, z) => (y === 67 ? P.e6 : z === 3 ? P.e5 : P.e4));
  m.box(-6, 68, -10, 5, 69, 4, P.b3);
  m.box(-1, 70, -4, 0, 74, -3, P.n1);
  sculpt(m, blob(0, 77, -3.5, 3.2, 2.4, 1.2), -4, 75, -5, 4, 80, -2, (x, y, z, n) => roundTone(P.n1, n, { light: 1, dark: 0 }));
  m.box(2, 78, -4, 3, 80, -3, P.n1).set(3, 81, -4, P.r3).set(4, 79, -4, P.f5); // Kopf, Kamm, Schnabel
  m.box(-5, 77, -4, -4, 81, -3, P.n2); // Schwanz
  // Rechts: Wasserfass mit Pumpe; links: Trog
  tank(m, 21, 3, 8, 26, 8.5, [P.b3, P.b4, P.b2], seed);
  m.box(20, 27, 2, 21, 34, 3, P.s5).box(21, 34, 2, 27, 35, 3, P.s6);
  m.box(-29, 8, -4, -13, 13, 8, (x, y, z) => (y === 13 && x > -29 && x < -13 && z > -4 && z < 8 ? P.b4 : x === -29 ? P.e6 : P.e5));
  if (level >= 4) m.box(-6, 66, 4, 5, 66, 4, P.f6);
  marks(m, 'wetterhahn', level, 40);
  return m;
}

/** Flügel mit blau-weißen Segeln und einer Düse in der Nabe; Ursprung = Nabe. */
function vaneHead(level) {
  const m = new VoxelModel();
  const cloth = [P.b3, P.b4, P.s8];
  const len = level >= 5 ? 24 : level >= 4 ? 22 : 20;
  const z = 6;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    for (let r = 2; r <= len; r++) {
      m.set(Math.round(ux * r), Math.round(uy * r), z, P.e3);
      if (r < 6) continue;
      for (let w = 1; w <= 5; w++) {
        const lath = r % 5 === 0 || w === 5;
        m.set(Math.round(ux * r - uy * w), Math.round(uy * r + ux * w), z, lath ? P.e5 : r % 4 < 2 ? cloth[2] : w <= 2 ? cloth[1] : cloth[0]);
      }
    }
  }
  sculpt(m, blob(0, 0, z, 3, 3, 2.5), -4, -4, z - 3, 3, 3, z + 3, (x, y, zz, n) => roundTone(P.f4, n)); // Messingnabe
  m.box(-1, -1, z + 3, 0, 0, z + 6, P.f5).set(0, 0, z + 7, 0xd8f0ff); // Düse mit Tropfen
  return m;
}

// --- Zusammenbau --------------------------------------------------------------------

const BUILDERS = {
  kuerbisballiste: (level, seed) => ({ base: ballistaBase(level, seed), head: ballistaHead(level), headY: 30, glow: null, glowOnHead: false }),
  eiszapfen: (level, seed) => ({ base: icicleBase(level, seed), head: icicleHead(level), headY: 32, glow: null, glowOnHead: false }),
  leuchtpfeil: (level, seed) => ({ base: glowBase(level, seed), head: glowHead(level), headY: 36, glow: glowHeadLight(level), glowOnHead: true, baseGlow: glowBaseLight() }),
  matschkessel: (level, seed) => ({ base: mudBase(level, seed), head: mudHead(level), headY: 22, glow: null, glowOnHead: false }),
  feuerwerk: (level, seed) => ({ base: fireworkBase(level, seed), head: fireworkHead(level), headY: 26, glow: fireworkHeadLight(level), glowOnHead: true, baseGlow: fireworkBaseLight() }),
  nebelleuchte: (level, seed) => ({ base: fogBase(level, seed), head: fogHead(level), headY: 49, glow: fogHeadLight(), glowOnHead: true }),
  gluehschwarm: (level, seed) => ({ base: swarmBase(level, seed), head: swarmHead(level), headY: 30, glow: swarmHeadLight(), glowOnHead: true }),
  wetterhahn: (level, seed) => ({ base: vaneBase(level, seed), head: vaneHead(level), headY: 64, glow: null, glowOnHead: false }),
};

/** Modelle der Mischtürme je Rezept und Stufe (3–5); spec ist immer »A«. */
export const MIX_MODELS = Object.fromEntries(Object.entries(BUILDERS).map(([id, fn]) => [id, (level, spec, seed) => fn(level, seed)]));
