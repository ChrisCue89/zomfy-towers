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

/** Barrikaden und ihre Trümmer sind im feinen Maß gebaut (M9.1). */
export const BARRICADE_UNIT = 1 / 16;

/**
 * Barrikaden (Meilenstein 9, DESIGN.md 6.10; M9.1 neu gebaut – der Auftraggeber
 * erkannte die Kästen nicht als Barrikaden): im feinen Maß (1/16 m), Grundform
 * ist der Spanische Reiter. Ein Balken liegt quer über dem Weg, durch ihn sind
 * angespitzte Pfähle über Kreuz gesteckt. Die Kreuze stehen längs zum Weg: Auf
 * den meist west-östlichen Wegen zeigen sie genau zur Kamera und die Spitzen zur
 * Horde; in einer Reihe laufen die Balken ineinander. Helles, frisch
 * geschnittenes Holz hebt sich vom braunen Weg ab, ein rot-weißer Lappen warnt.
 * Stufe 1 Holz; 2 dichter, mit Eisenbändern und eisernen Spitzen; 3 Stahligel
 * aus rostigen Trägern. `damage` 0–1 nimmt Teile weg (sichtbarer Schaden).
 * Ursprung: Mitte der Zelle am Boden, x und z je von −8 bis 7 (16 × 16 Voxel).
 * Bei turns = 0 liegt der Balken längs x (quer über einen Nord-Süd-Weg).
 */
export function buildBarricade(seed, level = 1, damage = 0) {
  const m = new VoxelModel();
  const loose = (x, y, z) => damage > 0 && y > 1 && hash3(x, y, z, seed + 9) < damage * (0.12 + y * 0.03);
  const put = (x, y, z, c) => {
    if (!loose(x, y, z)) m.set(x, y, z, c);
  };
  // Schräger Pfahl in der y-z-Ebene: vom Fuß (z0, 0) mit dz je Stufe nach oben,
  // `thick` Voxel breit (x) und `band` Voxel hoch – so liest er sich als kräftiger Strich
  const stake = (x, z0, dz, len, c, thick = 2, band = 2) => {
    for (let t = 0; t <= len; t++) {
      const z = z0 + dz * t;
      const tip = t >= len - 1;
      for (let k = 0; k < thick; k++) {
        const col = tip ? c.tip : t <= 1 ? c.foot : k === thick - 1 ? c.shade : c.wood;
        for (let b = 0; b < band && t + b <= len; b++) put(x + k, t + b, z, tip && b > 0 ? c.tip : col);
      }
    }
  };
  // Gleicher Pfahl in der x-y-Ebene (für das Metallkreuz)
  const stakeX = (z, x0, dx, len, c) => {
    for (let t = 0; t <= len; t++) {
      const x = x0 + dx * t;
      const tip = t >= len - 1;
      put(x, t, z, tip ? c.tip : c.wood);
      put(x, t, z + 1, tip ? c.tip : c.shade);
      if (t < len - 1) {
        put(x, t + 1, z, c.wood);
        put(x, t + 1, z + 1, c.shade);
      }
    }
  };
  if (level >= 3) {
    // Metallkreuz (Stahligel): vier Träger über Kreuz, in der Mitte ein Knotenblech; Rostflecken
    const rusty = (x, y, z, base) => (hash3(x, y, z, seed + 3) > 0.74 ? (y % 2 ? P.r2 : P.r3) : base);
    const steel = { wood: P.s6, shade: P.s5, tip: P.s3, foot: P.s4 };
    stake(-1, -7, 1, 13, steel);
    stake(-1, 6, -1, 13, steel);
    stakeX(-1, -7, 1, 13, steel);
    stakeX(-1, 6, -1, 13, steel);
    for (const [key, c] of m.cells) m.cells.set(key, [c[0], c[1], c[2], rusty(c[0], c[1], c[2], c[3])]);
    for (let x = -2; x <= 1; x++) for (let y = 5; y <= 8; y++) for (let z = -2; z <= 1; z++) put(x, y, z, (x + y + z) % 3 ? P.s3 : P.s4);
    for (const [x, z] of [[-2, 2], [1, 2]]) put(x, 7, z, P.s8); // Nieten
    return m;
  }
  const strong = level === 2;
  // Ein kräftiges Kreuz je Feld: der vordere Pfahl hell, der hintere etwas dunkler
  const front = strong ? { wood: P.e8, shade: P.e7, tip: P.s7, foot: P.e5 } : { wood: P.e8, shade: P.e7, tip: P.e9, foot: P.e5 };
  const back = strong ? { wood: P.e7, shade: P.e6, tip: P.s6, foot: P.e4 } : { wood: P.e7, shade: P.e6, tip: P.e8, foot: P.e4 };
  const band = strong ? 3 : 3;
  stake(-3, -7, 1, 14, back, 2, band); // hinten (bei turns = 1 weiter nördlich)
  stake(-1, 7, -1, 14, front, 2, band); // davor, über Kreuz
  // Der Balken quer hindurch (3 × 3 Voxel), dunkle Rinde; an den Enden Jahresringe
  for (let x = -8; x <= 7; x++) {
    for (let y = 6; y <= 8; y++) {
      for (let z = -1; z <= 1; z++) {
        const end = x === -8 || x === 7;
        const bandIron = strong && (x === -4 || x === 1);
        put(x, y, z, bandIron ? (y === 8 ? P.s4 : P.s3) : end ? (y === 7 && z === 0 ? P.e6 : P.e7) : (x + y + z) % 5 === 0 ? P.e4 : P.e3);
      }
    }
  }
  if (strong) {
    // Ein zweites, kleineres Kreuz dahinter und ein unterer Riegel für den Halt
    stake(4, -5, 1, 10, back, 2, 2);
    stake(5, 5, -1, 10, back, 2, 2);
    for (let x = -8; x <= 7; x++) for (let z = -1; z <= 0; z++) put(x, 1, z, x % 4 === 0 ? P.e3 : P.e4);
    for (const x of [-3, -1]) put(x, 12, x === -3 ? -1 : 0, P.s3); // Eisenband an der Kreuzung oben
    return m;
  }
  // Warnlappen vorn unter dem Balken, rot-weiß gestreift (bei turns = 1 südlich des Kreuzes)
  for (let x = -7; x <= -6; x++) for (let y = 2; y <= 5; y++) for (let z = -1; z <= 1; z++) put(x, y, z, y === 4 || y === 2 ? P.a4 : P.r3);
  return m;
}

/** Trümmer einer zerstörten Barrikade (fein): Pfähle und Splitter am Boden, ein Balkenstück. */
export function buildRubble(seed, level = 1) {
  const m = new VoxelModel();
  const metal = level >= 3;
  const light = metal ? P.s6 : P.e8;
  const dark = metal ? P.s4 : P.e6;
  // Umgestürzte Pfähle bzw. Träger, flach und schräg über das Feld
  const pieces = [[-7, -6, 1, 1, 9], [5, -7, -1, 1, 8], [-6, 4, 1, 0, 11], [-2, -3, 0, 1, 7]];
  pieces.forEach(([x0, z0, dx, dz, len], k) => {
    for (let t = 0; t < len; t++) {
      const x = x0 + dx * t;
      const z = z0 + dz * t;
      if (x < -8 || x > 7 || z < -8 || z > 7) continue;
      const rust = metal && hash3(x, k, z, seed) > 0.7;
      m.set(x, 0, z, rust ? P.r2 : t === len - 1 ? (metal ? P.s3 : P.e9) : (t + k) % 2 ? light : dark);
      if (t % 3 === 1) m.set(x, 1, z, rust ? P.r3 : light);
    }
  });
  // Ein Stück Balken bzw. das Knotenblech
  for (let x = -2; x <= 2; x++) for (let z = 1; z <= 2; z++) m.set(x, 0, z, metal ? P.s3 : P.e3).set(x, 1, z, metal ? P.s4 : x === 2 ? P.e7 : P.e4);
  // Splitter
  for (let k = 0; k < 9; k++) {
    const x = -7 + Math.floor(hash3(k, 1, 2, seed) * 15);
    const z = -7 + Math.floor(hash3(k, 3, 4, seed) * 15);
    m.set(x, 0, z, metal ? P.s7 : P.e9);
  }
  if (!metal) m.set(-4, 0, 5, P.r3).set(-3, 0, 5, P.a4).set(-2, 0, 5, P.r3); // der Warnlappen
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

/**
 * Holzlager (M11, DESIGN.md 6.8): Scheite unter einem Pultdach, die hellen
 * Stirnseiten zeigen zur Kamera. Ab 2 × 1 Feldern, wie das Beet zum Ernten.
 */
export function buildWoodpile(seed) {
  const m = new VoxelModel();
  for (const [x, z, h] of [[-8, -4, 11], [7, -4, 11], [-8, 3, 9], [7, 3, 9]]) m.box(x, 0, z, x, h, z, P.e3); // Pfosten
  m.box(-7, 0, -3, 6, 0, 2, P.e3);
  for (let row = 0; row < 4; row++) {
    for (let k = 0; k < 6; k++) {
      const cx = -7 + k * 2 + (row % 2);
      if (cx > 5) continue;
      const y = 1 + row * 2;
      const bark = hash3(cx, row, 0, seed) < 0.5 ? P.e4 : P.e3;
      m.box(cx, y, -3, cx + 1, y + 1, 2, (x, yy, z) => (z === 2 ? ((x + yy + row) % 2 ? P.e7 : P.e8) : bark));
    }
  }
  // Pultdach, nach Süden geneigt
  for (let z = -5; z <= 4; z++) {
    const y = 12 - Math.floor((z + 5) / 3);
    m.box(-9, y, z, 8, y, z, (x) => (x % 2 ? P.e5 : P.e6));
  }
  m.box(-6, 1, 3, -5, 2, 4, P.e6); // Hackklotz daneben
  return m;
}

export const BUILDING_MODELS = {
  holzlager: { model: buildWoodpile },
  zelt: { model: buildTent, glow: buildTentGlow },
  werkbank: { model: buildWorkbench, glow: buildWorkbenchGlow },
  barrikade: { model: (seed) => buildBarricade(seed, 1) }, // Stufen und Trümmer: buildings.js
  laternenpfahl: { model: buildLampPost, glow: buildLampPostGlow, pool: { y: 1.3, radius: 3.0 } },
  beet: { model: buildGardenPlot },
  bank: { model: buildBench },
};
