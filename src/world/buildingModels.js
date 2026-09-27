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

export function buildBarricade(seed) {
  const m = new VoxelModel();
  const stakes = [-4, -1, 2];
  stakes.forEach((sx, i) => {
    const h = 7 + (i % 2);
    m.box(sx, 0, -1, sx + 1, h, 0, (x, y, z) => (hash3(x, y, z, seed) < 0.3 ? P.e4 : P.e5));
    m.set(sx, h + 1, -1, P.e6); // Spitze
  });
  m.box(-4, 2, 1, 3, 2, 1, P.e3);
  m.box(-4, 5, 1, 3, 5, 1, P.e3);
  for (const sx of stakes) {
    m.set(sx, 2, 1, P.e8).set(sx, 5, 1, P.e8);
  }
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
  barrikade: { model: buildBarricade },
  laternenpfahl: { model: buildLampPost, glow: buildLampPostGlow, pool: { y: 1.3, radius: 3.0 } },
  beet: { model: buildGardenPlot },
  bank: { model: buildBench },
};
