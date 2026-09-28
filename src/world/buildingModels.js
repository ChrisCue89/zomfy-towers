// Voxel-Modelle der Bauten. Alle Modelle sind um die Mitte ihres Grundrisses
// gebaut (x ∈ [−W/2, W/2), z ∈ [−D/2, D/2) in Voxeln), damit sie sich in
// 90°-Schritten drehen lassen, ohne vom Raster zu rutschen. Seit M13 sind alle
// im feinen Maß (1/16 m, BUILDING_UNIT): ein Feld sind 16 × 16 Voxel.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';
import { stoneBlob } from './voxelKit.js';

/** Alle Bauten sind im feinen Maß gebaut (M13; Barrikaden schon seit M9.1). */
export const BUILDING_UNIT = 1 / 16;

/**
 * Werkbank (M13 im feinen Maß, 2 × 1 Felder: x −16..15, z −8..7): kräftige
 * Beine, Platte aus Bohlen mit heller Vorderkante, Ablage mit Brettern,
 * Schraubstock vorn rechts, hinten eine Lochwand mit Säge, Hammer, Schlüssel
 * und Zange, vorn links ein Laternchen.
 */
export function buildWorkbench(seed) {
  const m = new VoxelModel();
  for (const [x, z] of [[-14, -6], [12, -6], [-14, 4], [12, 4]]) m.box(x, 0, z, x + 1, 11, z + 1, (xx) => (xx === x ? P.e4 : P.e3));
  m.box(-15, 12, -7, 14, 13, 6, (x, y, z) => {
    if (z === 6) return y === 13 ? P.e7 : P.e5; // Vorderkante
    if (y === 12) return P.e4;
    return z % 4 === 1 ? P.e5 : hash3(x, y, z, seed) > 0.93 ? P.e5 : P.e6; // Bohlen
  });
  m.box(-13, 4, -5, 11, 4, 4, P.e4); // Ablage
  m.box(-11, 5, -4, 1, 6, 1, (x, y) => (x % 3 === 0 ? P.e6 : y === 6 ? P.e8 : P.e7)); // Bretterstapel
  // Schraubstock mit Spindel und Knebel
  m.box(8, 14, 1, 13, 16, 5, (x, y) => (y === 16 ? P.s5 : x === 8 ? P.s3 : P.s4));
  m.box(10, 14, 6, 11, 15, 8, P.s5);
  m.box(9, 15, 9, 12, 15, 9, P.s6);
  // Hobel und Späne auf der Platte
  m.box(-4, 14, 0, 1, 15, 2, (x, y) => (y === 15 ? P.e5 : P.e4)).set(-2, 16, 1, P.e3);
  for (const [x, z] of [[3, 3], [4, 1], [-6, 3], [5, 4]]) m.set(x, 14, z, P.e8);
  // Lochwand hinten mit Werkzeug
  m.box(-15, 14, -8, 5, 27, -8, (x, y) => (x === -15 || x === 5 || y === 27 ? P.e3 : x % 3 === 0 && y % 3 === 0 ? P.e3 : P.e5));
  for (let y = 17; y <= 25; y++) m.set(-12 + Math.floor((25 - y) / 4), y, -7, y % 2 ? P.s7 : P.s6); // Säge
  m.box(-13, 25, -7, -11, 26, -7, P.e3);
  m.box(-7, 17, -7, -7, 23, -7, P.e4).box(-8, 23, -7, -6, 24, -7, P.s4); // Hammer
  m.box(-3, 18, -7, -3, 24, -7, P.s6).box(-4, 24, -7, -2, 25, -7, P.s6).set(-3, 25, -7, null); // Schlüssel
  m.box(1, 18, -7, 1, 22, -7, P.r3).box(2, 18, -7, 2, 22, -7, P.r3).box(1, 23, -7, 2, 24, -7, P.s5); // Zange
  // Laternchen vorn links (das Glas leuchtet separat)
  m.box(-14, 14, 2, -11, 14, 5, P.s2).box(-14, 19, 2, -11, 19, 5, P.s3);
  for (const [x, z] of [[-14, 2], [-11, 2], [-14, 5], [-11, 5]]) m.box(x, 15, z, x, 18, z, P.s2);
  return m;
}

/** Leuchtende Teile der Werkbank (das Laternchen). */
export function buildWorkbenchGlow() {
  return new VoxelModel().box(-13, 15, 3, -12, 18, 4, 0xffffff);
}

/** Barrikaden und ihre Trümmer sind im feinen Maß gebaut (M9.1). */
export const BARRICADE_UNIT = BUILDING_UNIT;

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

/** Laternenpfahl: Steinfuß, Pfahl mit Kappe, Ausleger, daran eine Laterne mit Dach. */
export function buildLampPost(seed) {
  const m = new VoxelModel();
  for (const [x, z, r] of [[-3, -3, 2.2], [2, -2, 1.8], [-2, 2, 1.9], [2, 2, 1.6]]) stoneBlob(m, x, z, r, 1.8, r, seed + x * 3 + z);
  m.box(-2, 0, -2, 0, 31, 0, (x, y) => (y % 10 === 0 ? P.e2 : x === -2 ? P.e4 : P.e3));
  m.box(-3, 32, -3, 1, 32, 1, P.e3).box(-2, 33, -2, 0, 33, 0, P.e4);
  m.box(-2, 29, 1, -1, 30, 6, (x, y) => (y === 30 ? P.e4 : P.e3)); // Ausleger
  m.box(-2, 26, 5, -1, 28, 5, P.s3); // Haken
  // Laterne: Dach mit Spitze, Boden, vier Streben
  m.box(-4, 24, 2, 1, 24, 8, P.s2).box(-3, 25, 3, 0, 25, 7, P.s3).box(-2, 26, 4, -1, 26, 6, P.s4);
  m.box(-4, 16, 2, 1, 16, 8, P.s1).box(-3, 15, 4, 0, 15, 6, P.s2);
  for (const [x, z] of [[-4, 2], [1, 2], [-4, 8], [1, 8]]) m.box(x, 17, z, x, 23, z, P.s2);
  return m;
}

export function buildLampPostGlow() {
  const m = new VoxelModel();
  m.box(-3, 17, 3, 0, 23, 7, 0xffffff);
  return m;
}

/** Flachsbeet: Bretterrahmen, dunkle Erde, drei Reihen Flachs mit blauen Blüten. */
export function buildGardenPlot(seed) {
  const m = new VoxelModel();
  m.box(-14, 0, -6, 13, 3, 5, (x, y, z) => {
    const frame = x <= -13 || x >= 12 || z <= -5 || z >= 4;
    if (frame) return y === 3 ? (x % 7 === 0 ? P.e4 : P.e6) : z >= 4 && y === 1 ? P.e3 : P.e4;
    return y === 3 ? (hash3(x, y, z, seed) < 0.5 ? P.e2 : P.e3) : P.e2;
  });
  for (const z of [-3, 0, 2]) {
    for (let x = -11; x <= 10; x += 2) {
      const ox = hash3(x, 1, z, seed) < 0.3 ? 1 : 0;
      const h = 5 + Math.floor(hash3(x, 0, z, seed) * 4);
      for (let y = 4; y < 4 + h; y++) m.set(x + ox, y, z, y < 6 ? P.g5 : P.g6);
      m.set(x + ox + 1, 6 + (x % 3), z, P.g6); // Blättchen
      const bloom = hash3(x, 2, z, seed);
      const top = 4 + h;
      const c = bloom < 0.6 ? P.b4 : bloom < 0.85 ? P.b5 : P.a4;
      m.set(x + ox, top, z, c).set(x + ox - 1, top, z, c).set(x + ox, top + 1, z, P.f6);
    }
  }
  return m;
}

/** Gartenbank mit Lehne: Seitenteile, drei Sitzlatten, zwei Lehnenlatten, Armlehnen. */
export function buildBench(seed) {
  const m = new VoxelModel();
  for (const x of [-13, 11]) {
    m.box(x, 0, 2, x + 1, 5, 3, P.e3); // Vorderbein
    m.box(x, 0, -4, x + 1, 15, -3, P.e3); // Hinterbein bis zur Lehne
    m.box(x, 6, -4, x + 1, 6, 3, P.e3); // Zarge
    m.box(x, 9, -3, x + 1, 9, 3, P.e4).box(x, 7, 3, x + 1, 8, 3, P.e3); // Armlehne
  }
  for (const [z0, z1] of [[-3, -2], [-1, 0], [1, 2]]) {
    m.box(-14, 7, z0, 13, 7, z1, (x, y, z) => (z === z1 ? P.e5 : hash3(x, y, z, seed) > 0.9 ? P.e5 : P.e6));
  }
  for (const y0 of [10, 13]) m.box(-14, y0, -4, 13, y0 + 1, -4, (x, y) => (y === y0 + 1 ? P.e6 : P.e5));
  return m;
}

/**
 * Schlafzelt für Überlebende (Meilenstein 6, M13 im feinen Maß): Giebelzelt
 * aus geflickter Plane mit Nähten, First von Nord nach Süd, vorn ein Eingang
 * mit aufgerollten, festgebundenen Klappen; drinnen ein Schlafsack und nachts
 * ein Laternchen. Spannleinen zu den Heringen.
 */
export function buildTent(seed) {
  const m = new VoxelModel();
  const canvas = (x, y, z) => {
    if (hash3(Math.floor(x / 5), Math.floor(y / 4), Math.floor(z / 6), seed) > 0.88) return (x + y) % 4 === 0 ? P.b2 : P.b3; // Flicken
    if (y === 7 || y === 8) return y === 7 ? P.r2 : P.r3; // Streifen
    if (z % 7 === 0) return P.e6; // Nähte
    return (x + z) % 6 === 0 ? P.e7 : P.e8;
  };
  for (let y = 0; y <= 21; y++) {
    const half = 14 - Math.floor(y * 0.68);
    m.box(-half - 1, y, -14, half, y, 11, canvas);
  }
  // Eingang vorn: eine echte Öffnung, dahinter Dunkel, ein Schlafsack
  m.box(-16, 0, 12, 15, 0, 13, P.e3);
  for (let y = 0; y <= 11; y++) {
    const half = 6 - Math.floor(y / 2);
    m.remove(-half - 1, y, 6, half, y, 11);
    for (let x = -half - 1; x <= half; x++) m.set(x, y, 5, y === 0 ? P.e2 : P.e1);
  }
  m.box(-4, 0, 6, 3, 1, 10, (x, y) => (y === 1 ? (x % 3 === 0 ? P.b3 : P.b4) : P.b2)); // Schlafsack
  m.box(-4, 2, 6, -1, 2, 7, P.a4); // Kissen
  // Aufgerollte Klappen mit Bändern
  for (const x0 of [-12, 7]) {
    m.box(x0, 2, 12, x0 + 4, 10, 12, (x, y) => (y === 8 ? P.r3 : x === x0 || x === x0 + 4 ? P.e6 : P.e7));
  }
  // Firststange, Heringe, Spannleinen
  m.box(-1, 22, -16, 0, 22, 12, P.e3);
  for (const [x, z] of [[-16, -16], [15, -16], [-16, 15], [15, 15]]) m.box(x, 0, z, x, 1, z, P.e3);
  m.line(-1, 21, 12, -1, 1, 15, P.e8);
  m.line(0, 21, -15, 0, 1, -16, P.e8);
  return m;
}

export function buildTentGlow() {
  const m = new VoxelModel();
  m.box(1, 2, 7, 2, 4, 8, 0xffffff);
  return m;
}

/**
 * Holzlager (M11, DESIGN.md 6.8; M13 im feinen Maß): Scheite unter einem
 * Pultdach aus Schindeln, die hellen Stirnseiten mit Jahresringen zeigen zur
 * Kamera. Ab 2 × 1 Feldern, wie das Beet zum Ernten.
 */
export function buildWoodpile(seed) {
  const m = new VoxelModel();
  for (const [x, z, h] of [[-16, -8, 23], [14, -8, 23], [-16, 6, 19], [14, 6, 19]]) m.box(x, 0, z, x + 1, h, z + 1, (xx) => (xx === x ? P.e4 : P.e3)); // Pfosten
  m.box(-14, 0, -6, 13, 1, 5, (x, y) => (y === 1 && x % 6 === 0 ? P.e3 : P.e4)); // Unterlage
  for (let row = 0; row < 4; row++) {
    const shift = row % 2 ? 2 : 0;
    for (let k = 0; k < 7; k++) {
      const x0 = -14 + shift + k * 4;
      if (x0 + 3 > 13) continue;
      const y0 = 2 + row * 4;
      const zEnd = 5 - (hash3(k, row, 1, seed) < 0.35 ? 1 : 0);
      for (let z = -6; z <= zEnd; z++) {
        for (let dx = 0; dx < 4; dx++) {
          for (let dy = 0; dy < 4; dy++) {
            if ((dx === 0 || dx === 3) && (dy === 0 || dy === 3)) continue;
            const bark = dx === 0 || dx === 3 || dy === 0 || dy === 3;
            let c;
            if (z === zEnd) c = bark ? P.e4 : (dx + dy + row) % 3 === 0 ? P.e7 : P.e8;
            else c = bark ? (hash3(x0 + dx, y0 + dy, z, seed) < 0.4 ? P.e2 : P.e3) : P.e6;
            m.set(x0 + dx, y0 + dy, z, c);
          }
        }
      }
    }
  }
  // Pultdach aus Schindeln, nach Süden geneigt
  for (let z = -10; z <= 9; z++) {
    const y = 24 - Math.floor((z + 10) / 4);
    m.box(-18, y, z, 17, y, z, (x) => {
      const row = Math.floor((z + 10) / 4);
      const shingle = Math.floor((x + (row % 2) * 3) / 6);
      if ((x + (row % 2) * 3) % 6 === 0) return P.e3;
      return (z + 10) % 4 === 3 ? P.e4 : hash3(shingle, row, 0, seed) < 0.4 ? P.e5 : P.e6;
    });
  }
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
