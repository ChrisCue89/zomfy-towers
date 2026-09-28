// Voxel-Modelle der Türme im feinen Maß (1/16 m; seit M13 von Grund auf fein
// gebaut, vorher verdoppelte grobe Modelle). Jeder Turm = Sockel (steht fest)
// + Kopf (dreht sich zum Ziel, Drehpunkt im Ursprung) + leuchtende Teile.
// Grundfläche 1 × 1 m (x/z ∈ [−8, 7]). Jede Art hat eine eigene Leitfarbe und
// Silhouette, damit man sie auf einen Blick erkennt: Bolzenwerfer Holzgerüst
// mit Armbrust, Katapult Kürbis-Orange mit Wurfarm, Rasensprenger blauer Tank
// mit Drehkopf, Laternenturm hoher Pfahl mit warmem Licht. Goldene Nieten vorn
// am Sockel und eine Fahne hinten links zeigen die Stufe 1–5; die
// Spezialisierung sieht man an eigenen Teilen und an der Farbe der Fahne.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';

const WHITE = 0xffffff;

export const TOWER_UNIT = 1 / 16;

const SPEC_COLORS = {
  bolzen: { A: [P.a0, P.a4], B: [P.b4, P.b6] },
  katapult: { A: [P.f3, P.f5], B: [P.g5, P.g7] },
  sprenger: { A: [0x8ecff0, 0xe8f8ff], B: [P.e4, P.e6] },
  laternenturm: { A: [P.f5, P.f7], B: [P.g6, P.g8] },
};

/** Stufen-Fahne an der hinteren linken Ecke – groß genug, um sie im Getümmel zu lesen. */
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

/** Goldene Nieten (Stufenmarken) vorn am Sockel. */
function pips(m, level, y = 2) {
  for (let k = 0; k < level; k++) m.set(-5 + k * 2, y, 8, k < 2 ? P.f5 : k < 4 ? P.s8 : P.f7);
}

/** Sockel aus behauenen Steinen mit Fugen, oben eine helle Kante. */
function plinth(m, seed, top = 3) {
  m.box(-8, 0, -8, 7, top, 7, (x, y, z) => {
    const corner = (x === -8 || x === 7) && z === 7; // vordere Ecken abgeschrägt
    if (corner && y === top) return null;
    const row = y >> 1;
    const u = (z === 7 ? x : x + z) + (row % 2) * 3;
    if (y === top) return hash3(x, y, z, seed) < 0.3 ? P.s5 : P.s6;
    if (y % 2 === 1 && y < top - 1) return P.s3; // Lagerfuge
    if (u % 6 === 0) return P.s3; // Stoßfuge
    const h = hash3(x >> 2, row, z >> 2, seed);
    return h < 0.3 ? P.s4 : h < 0.75 ? P.s5 : P.s6;
  });
}

// --- Bolzenwerfer ------------------------------------------------------------------

function boltBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed);
  const wood = level >= 2 ? [P.e4, P.e3] : [P.e5, P.e4];
  // Gerüst: vier Pfosten, Kreuzstreben vorn und hinten, oben eine Bohlenplattform
  for (const [x, z] of [[-7, -7], [5, -7], [-7, 5], [5, 5]]) m.box(x, 4, z, x + 1, 16, z + 1, (xx) => (xx === x ? wood[0] : wood[1]));
  for (const z of [-7, 6]) {
    m.line(-6, 5, z, 4, 15, z, wood[1]);
    m.line(4, 5, z, -6, 15, z, wood[1]);
  }
  m.box(-8, 17, -8, 7, 17, 7, (x, y, z) => (z === 7 ? P.e5 : x % 4 === 0 ? P.e5 : (x + z) % 7 === 0 ? P.e6 : P.e7));
  if (level >= 2) {
    // Eisenbänder und Eckwinkel
    for (const [x, z] of [[-7, -7], [5, -7], [-7, 5], [5, 5]]) m.box(x, 9, z, x + 1, 9, z + 1, P.s5).box(x, 14, z, x + 1, 14, z + 1, P.s5);
    for (const [x, z] of [[-8, 7], [7, 7]]) m.set(x, 17, z, P.s6);
  }
  // Bolzenvorrat im Köcher an der Seite; Repetierer mit einer Kiste Bolzen
  if (spec === 'B') {
    m.box(-7, 4, 1, -3, 7, 4, (x, y, z) => (y === 7 ? (x % 2 ? P.s6 : P.e3) : z === 4 && y === 5 ? P.e3 : P.e5));
  } else {
    m.box(3, 4, 1, 4, 11, 2, P.e3);
    for (const x of [3, 4]) m.set(x, 12, 1, P.s7).set(x, 12, 2, P.a0);
  }
  pips(m, level);
  levelFlag(m, 'bolzen', level, spec, 17);
  return m;
}

function boltHead(level, spec) {
  const m = new VoxelModel();
  // Drehteller
  m.cylinder(0, 0, 0, 1, 4.6, (x, y) => (y === 1 ? P.s5 : P.s4));
  // Schaft nach vorn (+z) mit Rinne
  m.box(-1, 2, -7, 1, 3, 8, (x, y, z) => (y === 3 && x === 0 ? P.e3 : x === -1 ? P.e6 : P.e5));
  // Bogen: gebogene Arme vorn, Spitzen aus Eisen
  for (let x = -8; x <= 8; x++) {
    const bend = Math.round((x * x) / 20);
    m.set(x, 3, 7 - bend, Math.abs(x) >= 7 ? P.s6 : P.e4).set(x, 4, 7 - bend, Math.abs(x) >= 7 ? P.s7 : P.e3);
  }
  // Sehne zu den Spitzen, eingelegter Bolzen mit blanker Spitze und rotem Federkiel
  for (let x = -7; x <= 7; x++) m.set(x, 4, 4 - Math.round(Math.abs(x) * 0.15), P.e9);
  m.box(0, 4, 0, 0, 4, 9, P.s6).set(0, 4, 10, P.s9).set(0, 4, 11, P.s9);
  m.set(-1, 4, 1, P.a0).set(1, 4, 1, P.a0).set(0, 5, 1, P.a0);
  // Kurbel hinten
  m.box(-2, 2, -8, 2, 3, -8, P.s4).box(3, 1, -8, 3, 4, -8, P.s5).set(3, 5, -8, P.e2);
  if (level >= 2) m.box(-1, 1, -6, 1, 1, 6, P.s5); // Eisenbeschlag unter dem Schaft
  if (spec === 'A') {
    // Scharfschütze: langer Lauf, Fernrohr mit blauer Linse
    m.box(-1, 2, 9, 1, 3, 14, (x) => (x === 0 ? P.s4 : P.s3));
    m.box(-3, 6, -3, -2, 7, 5, (x, y, z) => (z === 5 ? P.b5 : y === 7 ? P.s4 : P.s3));
    m.box(-3, 5, 0, -2, 5, 1, P.s5);
    if (level >= 4) m.box(-1, 1, 7, 1, 1, 12, P.s6);
    if (level >= 5) m.set(-3, 8, 2, P.f7).set(-2, 8, 2, P.f7);
  } else if (spec === 'B') {
    // Repetierer: Trommelmagazin obendrauf und ein zweiter Bogen darunter
    m.cylinder(0, -1, 5, 9, 3.2, (x, y, z) => (y === 9 ? ((x + z) % 2 ? P.f5 : P.s6) : y % 2 ? P.s5 : P.s6));
    for (let x = -6; x <= 6; x++) m.set(x, 1, 6 - Math.round((x * x) / 20), Math.abs(x) >= 5 ? P.s6 : P.e4);
    if (level >= 4) m.set(0, 10, -1, P.f5);
    if (level >= 5) m.set(-1, 10, 0, P.f7).set(1, 10, -2, P.f7);
  }
  return m;
}

// --- Kürbiskatapult ----------------------------------------------------------------

/** Gerippter Kürbis (fein) mit Mitte (cx, y0 = Unterseite, cz). */
function pumpkin(m, cx, y0, cz, r, colors = [P.f3, P.f4, P.f5]) {
  m.ellipsoid(cx, y0 + r * 0.8, cz, r, r * 0.8, r, (x, y, z, dx, dy) => {
    const a = Math.atan2(z + 0.5 - cz, x + 0.5 - cx);
    const groove = Math.floor((a / Math.PI) * 5 + 10) % 2 === 0;
    if (dy > 0.6) return colors[2];
    return groove ? colors[0] : colors[1];
  });
  m.set(Math.floor(cx), Math.round(y0 + r * 1.6), Math.floor(cz), P.g4);
}

function catapultBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed);
  // Lafette aus Bohlen, zwei Böcke für die Achse
  m.box(-7, 4, -7, 6, 6, 6, (x, y, z) => (y === 6 ? (x % 4 === 0 ? P.e4 : P.e6) : z === 6 ? P.e4 : P.e5));
  for (const x of [-7, 5]) {
    m.line(x, 7, -3, x, 12, 0, P.e3).line(x, 7, 3, x, 12, 0, P.e3);
    m.line(x + 1, 7, -3, x + 1, 12, 0, P.e4).line(x + 1, 7, 3, x + 1, 12, 0, P.e4);
  }
  // Kürbisvorrat hinten
  const stock = spec === 'A' ? [P.r2, P.f3, P.f4] : [P.f3, P.f4, P.f5];
  pumpkin(m, -4, 7, -5, 2.6, stock);
  pumpkin(m, 2, 7, -5, 2.2, stock);
  if (spec === 'B') for (const [x, z] of [[-1, -6], [4, -3], [-5, -2]]) pumpkin(m, x, 7, z, 1.4, stock);
  if (level >= 2) m.box(-7, 5, 7, 6, 5, 7, P.s5).set(-7, 6, 7, P.s6).set(6, 6, 7, P.s6); // Eisenkante vorn
  pips(m, level);
  levelFlag(m, 'katapult', level, spec, 13);
  return m;
}

function catapultHead(level, spec) {
  const m = new VoxelModel();
  // Achse quer, Wurfarm schräg nach hinten oben, vorn ein Gegengewicht aus Steinen
  m.box(-6, 0, -1, 6, 1, 0, P.e3);
  for (let t = 0; t <= 14; t++) m.box(-1, 1 + t, -Math.round(t * 0.85), 0, 1 + t, -Math.round(t * 0.85), t % 5 === 0 ? P.e3 : P.e5);
  m.box(-3, -3, 1, 2, 0, 3, (x, y) => (y === 0 ? P.s5 : P.s4));
  // Korb mit Kürbis
  m.box(-3, 14, -15, 2, 15, -10, (x, y, z) => (y === 14 || x === -3 || x === 2 || z === -15 || z === -10 ? P.e3 : null));
  const colors = spec === 'A' ? [P.r2, P.f3, P.f4] : [P.f3, P.f4, P.f5];
  if (spec === 'B') {
    pumpkin(m, -1.5, 15, -12, 1.5, colors);
    pumpkin(m, 1, 15, -13, 1.4, colors);
    pumpkin(m, -0.5, 16, -11, 1.3, colors);
  } else {
    pumpkin(m, -0.5, 15, -12.5, 2.6, colors);
  }
  // Seile vom Korb
  m.set(-3, 16, -15, P.e8).set(2, 16, -15, P.e8);
  if (level >= 2) m.box(-1, 5, -4, 0, 5, -4, P.s5).box(-1, 10, -8, 0, 10, -8, P.s5); // Eisenringe am Arm
  return m;
}

/**
 * Feuerkürbis: ein Gesicht vorn in den Kürbis im Korb schnitzen (Voxel aus dem
 * Kopf nehmen, dahinter dunkel) – die Löcher glimmen als eigenes Modell.
 */
function carveFireFace(head) {
  const glow = new VoxelModel();
  for (const [x, y] of [[-2, 19], [1, 19], [-1, 18], [0, 18], [-2, 17], [-1, 16], [0, 16], [1, 17]]) {
    let z = -9;
    while (z > -16 && !head.has(x, y, z)) z--;
    if (z <= -16) continue;
    head.set(x, y, z, null).set(x, y, z - 1, P.f1);
    glow.set(x, y, z, WHITE);
  }
  return glow;
}

// --- Rasensprenger -----------------------------------------------------------------

function sprinklerBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed);
  const tank = spec === 'A' ? [P.b5, P.a4, P.b4] : spec === 'B' ? [P.e3, P.e4, P.e2] : [P.b3, P.b4, P.b2];
  // Tank aus Dauben mit zwei Spannbändern, oben ein Deckel
  m.cylinder(0, 0, 4, 13, 6.4, (x, y, z) => {
    if (y === 6 || y === 11) return P.s6;
    if (y === 13) return tank[1];
    const a = Math.atan2(z + 0.5, x + 0.5);
    if (Math.floor((a / Math.PI) * 24 + 48) % 3 === 0) return tank[2]; // Fugen der Dauben
    return hash3(x, y, z, seed) < 0.15 ? tank[1] : tank[0];
  });
  m.cylinder(0, 0, 14, 14, 3.4, P.s5);
  m.box(-1, 14, -1, 0, 19, 0, (x, y) => (y % 3 === 0 ? P.s6 : P.s5)); // Steigrohr
  // Grüner Schlauch aufgerollt vorn rechts auf dem Sockel, Messinghahn
  for (let x = 2; x <= 7; x++) {
    for (let z = 2; z <= 7; z++) {
      const d = Math.hypot(x + 0.5 - 5, z + 0.5 - 5);
      if (d > 2.6 || d < 1.1 || m.has(x, 4, z)) continue;
      m.set(x, 4, z, d > 2 ? P.g4 : P.g5);
    }
  }
  m.box(-8, 8, -1, -7, 9, 0, P.f5).set(-8, 10, 0, P.f6);
  if (spec === 'A') for (const [x, z] of [[-5, 3], [4, -5], [2, 5], [-3, -5]]) m.set(x, 13, z, 0xe8f8ff).set(x, 12, z + (z > 0 ? 1 : -1), P.b5); // Eis
  if (spec === 'B') for (const [x, z, y] of [[-5, 4, 9], [3, 5, 7], [5, -3, 10]]) m.set(x, y, z, P.e2).set(x, y - 1, z, P.e3); // Schlammspritzer
  if (level >= 2) m.cylinder(0, 0, 9, 9, 6.6, P.s5); // drittes Band
  pips(m, level);
  levelFlag(m, 'sprenger', level, spec, 13);
  return m;
}

function sprinklerHead(level, spec) {
  const m = new VoxelModel();
  const brass = spec === 'B' ? [P.e4, P.e5] : [P.f4, P.f5];
  m.cylinder(0, 0, 0, 2, 1.8, (x, y) => (y === 2 ? brass[1] : brass[0])); // Nabe
  // Zwei gebogene Arme mit Düsen
  for (let x = 1; x <= 7; x++) {
    const z = Math.round((x * x) / 16);
    m.set(x, 2, -z, brass[1]).set(-x - 1, 2, z - 1, brass[1]);
  }
  m.box(7, 2, -4, 7, 3, -3, P.s9).box(-8, 2, 2, -8, 3, 3, P.s9);
  // Wasserfäden an den Düsen (A: Frost, B: Schlamm)
  const drop = spec === 'A' ? 0xe8f8ff : spec === 'B' ? P.e3 : P.b5;
  m.set(8, 3, -4, drop).set(9, 4, -5, drop).set(-9, 3, 3, drop).set(-10, 4, 4, drop);
  if (level >= 4) m.set(0, 3, 0, P.s8).set(-1, 3, -1, P.s8);
  return m;
}

// --- Laternenturm ------------------------------------------------------------------

function lanternBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed, 5);
  // Hoher Pfahl mit Maserung, Trittsprossen und Streben
  m.box(-2, 6, -2, 1, 27, 1, (x, y) => (y % 7 === 0 ? P.e3 : x === -2 ? P.e5 : P.e4));
  for (let y = 9; y <= 24; y += 5) m.box(2, y, -1, 3, y, 0, P.e6);
  m.line(-6, 6, -1, -3, 14, -1, P.e3).line(5, 6, 0, 2, 14, 0, P.e3);
  if (level >= 2) m.box(-3, 6, -3, 2, 6, 2, P.s5).box(-2, 18, -2, 1, 18, 1, P.s5);
  if (spec === 'B') {
    // Kleeblätter am Pfahl
    for (const [x, y, z] of [[2, 20, 2], [-3, 14, -3], [2, 12, -3]]) m.set(x, y, z, P.g6).set(x + (x > 0 ? 1 : -1), y, z, P.g7).set(x, y + 1, z, P.g7);
  }
  pips(m, level, 3);
  levelFlag(m, 'laternenturm', level, spec, 12);
  return m;
}

function lanternHead(level, spec) {
  const m = new VoxelModel();
  const frame = spec === 'B' ? [P.f5, P.f4] : [P.s3, P.s2];
  m.box(-4, 0, -4, 3, 1, 3, (x, y) => (y === 1 ? frame[0] : frame[1])); // Boden
  for (const [x, z] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) m.box(x, 2, z, x, 9, z, frame[1]); // Streben
  // Spitzes Dach in drei Stufen mit Knauf
  m.box(-5, 10, -5, 4, 10, 4, frame[1]);
  m.box(-4, 11, -4, 3, 11, 3, spec === 'B' ? P.f5 : P.s4);
  m.box(-2, 12, -2, 1, 12, 1, frame[0]);
  m.box(-1, 13, -1, 0, 14, 0, P.f6);
  if (spec === 'A') {
    // Leuchtfeuer: breiter Blendring und ein zweites Licht obendrauf
    m.box(-6, 9, -6, 5, 9, 5, (x, y, z) => (Math.abs(x + 0.5) > 4 || Math.abs(z + 0.5) > 4 ? P.s4 : null));
    m.box(-2, 15, -2, 1, 15, 1, P.s3);
  }
  if (level >= 4) m.set(-4, 10, 3, P.f7).set(3, 10, 3, P.f7);
  return m;
}

function lanternGlow(spec) {
  const m = new VoxelModel();
  m.box(-3, 2, -3, 2, 9, 2, WHITE);
  if (spec === 'A') m.box(-1, 16, -1, 0, 17, 0, WHITE);
  return m;
}

// --- Zusammenbau -------------------------------------------------------------------

function fineBolt(level, spec, seed) {
  return { base: boltBase(level, spec, seed), head: boltHead(level, spec), headY: 18, glow: null, glowOnHead: false };
}

function fineCatapult(level, spec, seed) {
  const head = catapultHead(level, spec);
  const glow = spec === 'A' ? carveFireFace(head) : null;
  return { base: catapultBase(level, spec, seed), head, headY: 12, glow, glowOnHead: true };
}

function fineSprinkler(level, spec, seed) {
  return { base: sprinklerBase(level, spec, seed), head: sprinklerHead(level, spec), headY: 20, glow: null, glowOnHead: false };
}

function fineLantern(level, spec, seed) {
  return { base: lanternBase(level, spec, seed), head: lanternHead(level, spec), headY: 28, glow: lanternGlow(spec), glowOnHead: true };
}

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

/**
 * Feine Modelle (1/16 m) eines Turms für Stufe und Spezialisierung.
 * @returns {{base: VoxelModel, head: VoxelModel, headY: number, glow: VoxelModel|null, glowOnHead: boolean, unit: number}}
 */
export function fineTowerModels(type, level, spec, seed = 5) {
  const m = {
    bolzen: fineBolt,
    katapult: fineCatapult,
    sprenger: fineSprinkler,
    laternenturm: fineLantern,
  }[type](level, spec, seed);
  return { ...m, unit: TOWER_UNIT };
}
