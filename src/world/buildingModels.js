// Voxel-Modelle der Bauten. Alle Modelle sind um die Mitte ihres Grundrisses
// gebaut (x ∈ [−W/2, W/2), z ∈ [−D/2, D/2) in Voxeln), damit sie sich in
// 90°-Schritten drehen lassen, ohne vom Raster zu rutschen.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';

export function buildWorkbench(seed) {
  const m = new VoxelModel();
  for (const [x, z] of [[-7, -3], [6, -3], [-7, 2], [6, 2]]) m.box(x, 0, z, x, 5, z, P.e3);
  m.box(-7, 6, -3, 6, 6, 2, (x, y, z) => (z === 2 ? P.e5 : hash3(x, y, z, seed) > 0.9 ? P.e5 : P.e6));
  m.box(-6, 2, -2, 5, 2, 1, P.e4);
  m.box(-5, 3, -2, 1, 3, 0, (x) => (x % 2 ? P.e7 : P.e8)); // Bretterstapel
  // Schraubstock
  m.box(4, 7, 0, 6, 8, 2, P.s4);
  m.box(5, 9, 1, 5, 9, 1, P.s6);
  // Werkzeugwand mit Säge, Hammer, Schlüssel
  m.box(-7, 7, -3, 2, 12, -3, (x, y) => ((x + y) % 4 === 0 ? P.e3 : P.e4));
  m.box(-6, 9, -2, -3, 9, -2, P.s6).box(-2, 9, -2, -2, 9, -2, P.e5);
  m.box(-1, 8, -2, -1, 11, -2, P.e5).box(-2, 11, -2, 0, 11, -2, P.s3);
  m.box(1, 8, -2, 1, 10, -2, P.s5);
  // kleine Laterne
  m.set(-6, 7, 1, P.s2).set(-6, 8, 1, P.f6);
  return m;
}

/** Leuchtende Teile der Werkbank (das Laternchen). */
export function buildWorkbenchGlow() {
  return new VoxelModel().set(-6, 8, 1, 0xffffff);
}

/**
 * Barrikaden (Meilenstein 9, DESIGN.md 6.10): quer über den Weg, improvisiert
 * und als Block lesbar. Jede füllt ihr Feld fast ganz aus (fast quadratisch),
 * damit eine Reihe von oben wie aus der Kamera eine geschlossene Sperre ist –
 * egal, wie der Weg läuft. Stufe 1: Verschlag aus Brettern und Stämmen mit
 * angespitzten Pfählen und einer alten Tür davor; 2: höher, mit Eisenbändern
 * und mehr Spitzen; 3: Stahlkasten mit Wellblech und einem Stahlkreuz
 * obendrauf. `damage` 0–1 nimmt Bretter und Blech weg (sichtbarer Schaden).
 */
export function buildBarricade(seed, level = 1, damage = 0) {
  const m = new VoxelModel();
  const loose = (x, y, z) => damage > 0 && y > 0 && hash3(x, y, z, seed + 9) < damage * (0.16 + y * 0.07);
  const put = (x, y, z, c) => {
    if (!loose(x, y, z)) m.set(x, y, z, c);
  };
  const box = (x0, y0, z0, x1, y1, z1, color) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const c = typeof color === 'function' ? color(x, y, z) : color;
      if (c !== null) put(x, y, z, c);
    }
  };
  const shell = (x, z) => x === -4 || x === 3 || z === -3 || z === 2;
  if (level >= 3) {
    // Stahlkasten: Rahmen, Wellblech mit Rostflecken, oben ein Stahlkreuz
    box(-4, 0, -3, 3, 5, 2, (x, y, z) => {
      if (!shell(x, z) && y < 5) return null;
      const corner = (x === -4 || x === 3) && (z === -3 || z === 2);
      if (corner || y === 5 || y === 0) return (x + y + z) % 3 === 0 ? P.s3 : P.s4;
      const rust = hash3(Math.floor(x / 2), Math.floor(y / 2), z, seed + 3) > 0.66;
      return rust ? (y % 2 ? P.r2 : P.r3) : (x + z) % 2 ? P.s5 : P.s6;
    });
    for (let k = -3; k <= 2; k++) {
      put(k, 6, k, P.s4);
      put(k, 7, k, P.s3);
      put(k, 6, -1 - k, P.s4);
      put(k, 7, -1 - k, P.s3);
    }
    for (const x of [-3, 0, 2]) put(x, 3, 3, P.s8); // Nieten vorn
    return m;
  }
  const high = level === 2 ? 6 : 4;
  // Verschlag: Bretter außen, Stämme innen, oben ein Deckel aus Brettern
  box(-4, 0, -3, 3, high, 2, (x, y, z) => {
    if (shell(x, z)) {
      const plank = Math.floor((y + (x + z < 0 ? 1 : 0)) / 2);
      if (level === 2 && (y === 2 || y === high - 1)) return P.s3; // Eisenbänder
      return hash3(x + z, plank, 0, seed) < 0.25 ? P.e4 : plank % 2 ? P.e6 : P.e5;
    }
    return y === high ? ((x + z) % 2 ? P.e5 : P.e4) : null;
  });
  // Angespitzte Pfähle ragen oben heraus – die Spitzen machen die Sperre schon von Weitem kenntlich
  const stakes = level === 2 ? [[-4, -3], [-1, -3], [2, -3], [-3, 0], [1, 0], [-4, 2], [-1, 2], [2, 2]] : [[-3, -3], [1, -3], [-1, 0], [-3, 2], [1, 2]];
  for (const [x, z] of stakes) {
    box(x, high + 1, z, x + 1, high + 2, z, (xx, y) => (y === high + 2 ? P.e7 : P.e3));
    put(x, high + 3, z, P.e8);
  }
  if (level === 2) {
    for (const x of [-3, 0, 2]) put(x, 4, 3, P.s6); // Nägel vorn
    return m;
  }
  // Stufe 1: eine alte Tür lehnt vorn (verblasstes Blau mit Knauf)
  box(-2, 0, 3, 0, 5, 3, (x, y) => (x === 0 && y === 3 ? P.s6 : hash3(x, y, 3, seed) < 0.3 ? P.b2 : P.b3));
  return m;
}

/** Trümmer einer zerstörten Barrikade: Latten oder Blech am Boden, ein Stumpf. */
export function buildRubble(seed, level = 1) {
  const m = new VoxelModel();
  const metal = level >= 3;
  for (let k = 0; k < 7; k++) {
    const x0 = -4 + ((k * 3) % 7);
    const z0 = -3 + ((k * 5) % 6);
    const len = 2 + (k % 3);
    const along = hash3(k, 0, 0, seed) < 0.5;
    for (let t = 0; t < len; t++) {
      const x = along ? x0 + t : x0;
      const z = along ? z0 : z0 + t;
      if (x > 3 || z > 3) continue;
      m.set(x, 0, z, metal ? (t % 2 ? P.s5 : P.r2) : t % 2 ? P.e5 : P.e4);
    }
  }
  m.set(-4, 1, 0, metal ? P.s3 : P.e3).set(-4, 2, 0, metal ? P.s4 : P.e5); // Stumpf eines Pfostens
  m.set(3, 1, 0, metal ? P.s3 : P.e3);
  return m;
}

export function buildLampPost(seed) {
  const m = new VoxelModel();
  m.box(-2, 0, -2, 1, 0, 1, (x, y, z) => (hash3(x, y, z, seed) < 0.5 ? P.s4 : P.s5));
  m.box(-1, 1, -1, 0, 15, 0, (x, y) => (y % 6 === 0 ? P.e2 : P.e3));
  m.box(-1, 15, 1, 0, 15, 3, P.e3);
  m.box(-1, 13, 2, 0, 14, 2, P.s3); // Haken
  m.box(-2, 12, 1, 1, 12, 4, P.s2); // Dach der Laterne
  m.box(-2, 8, 1, 1, 8, 4, P.s2); // Boden der Laterne
  for (const [x, z] of [[-2, 1], [1, 1], [-2, 4], [1, 4]]) m.box(x, 9, z, x, 11, z, P.s3);
  return m;
}

export function buildLampPostGlow() {
  const m = new VoxelModel();
  m.box(-1, 9, 2, 0, 11, 3, 0xffffff);
  return m;
}

/** Flachsbeet: Holzrahmen, dunkle Erde, Reihen aus Flachs mit blauen Blüten. */
export function buildGardenPlot(seed) {
  const m = new VoxelModel();
  m.box(-7, 0, -3, 6, 1, 2, (x, y, z) => (x === -7 || x === 6 || z === -3 || z === 2 ? P.e4 : y === 1 ? P.e2 : P.e3));
  for (let x = -6; x <= 5; x += 2) {
    for (const z of [-2, 0, 1]) {
      const h = hash3(x, 0, z, seed) < 0.5 ? 3 : 4;
      const ox = hash3(x, 1, z, seed) < 0.3 ? 1 : 0;
      for (let y = 2; y < 2 + h; y++) m.set(x + ox, y, z, y < 3 ? P.g5 : P.g6);
      const bloom = hash3(x, 2, z, seed);
      m.set(x + ox, 2 + h, z, bloom < 0.6 ? P.b4 : bloom < 0.85 ? P.b5 : P.a4);
    }
  }
  return m;
}

export function buildBench(seed) {
  const m = new VoxelModel();
  for (const x of [-6, 5]) {
    m.box(x, 0, -1, x, 2, -1, P.e3);
    m.box(x, 0, 1, x, 2, 1, P.e3);
    m.box(x, 4, -2, x, 6, -2, P.e3);
  }
  m.box(-7, 3, -1, 6, 3, 1, (x, y, z) => (z === 1 ? P.e5 : hash3(x, y, z, seed) > 0.85 ? P.e5 : P.e6));
  m.box(-7, 5, -2, 6, 6, -2, (x, y) => (y === 6 ? P.e5 : P.e4));
  return m;
}

/**
 * Schlafzelt für Überlebende (Meilenstein 6): Giebelzelt aus geflickter Plane,
 * First von Nord nach Süd, der Eingang zeigt zur Kamera. Nachts leuchtet drin
 * ein Laternchen durch die offene Klappe.
 */
export function buildTent(seed) {
  const m = new VoxelModel();
  const canvas = (x, y, z) => {
    if (hash3(Math.floor(x / 3), y, Math.floor(z / 4), seed) > 0.86) return P.b3; // Flicken
    if (y === 4 || y === 5) return P.r3; // Streifen
    return (x + z) % 5 === 0 ? P.e7 : P.e8;
  };
  for (let y = 0; y <= 10; y++) {
    const half = 7 - Math.floor(y * 0.68);
    m.box(-half - 1, y, -7, half, y, 5, canvas);
  }
  // Eingang vorn: eine echte Öffnung, dahinter Dunkel (und nachts das Laternchen)
  m.box(-8, 0, 6, 7, 0, 6, P.e3);
  for (let y = 0; y <= 5; y++) {
    const half = 3 - Math.floor(y / 2);
    m.remove(-half - 1, y, 4, half, y, 5);
    for (let x = -half - 1; x <= half; x++) m.set(x, y, 3, y === 0 ? P.e2 : P.e1);
  }
  m.box(-6, 1, 6, -4, 5, 6, (x, y) => (y === 4 || y === 5 ? P.r3 : P.e7));
  m.box(3, 1, 6, 5, 5, 6, (x, y) => (y === 4 || y === 5 ? P.r3 : P.e7));
  // Firststange, Heringe mit Spannleinen
  m.box(-1, 11, -8, 0, 11, 6, P.e3);
  for (const [x, z] of [[-8, -8], [7, -8], [-8, 7], [7, 7]]) m.set(x, 0, z, P.e3);
  return m;
}

export function buildTentGlow() {
  const m = new VoxelModel();
  m.box(-1, 1, 4, 0, 2, 4, 0xffffff);
  return m;
}

export const BUILDING_MODELS = {
  zelt: { model: buildTent, glow: buildTentGlow },
  werkbank: { model: buildWorkbench, glow: buildWorkbenchGlow },
  barrikade: { model: (seed) => buildBarricade(seed, 1) }, // Stufen und Trümmer: buildings.js
  laternenpfahl: { model: buildLampPost, glow: buildLampPostGlow, pool: { y: 1.3, radius: 3.0 } },
  beet: { model: buildGardenPlot },
  bank: { model: buildBench },
};
