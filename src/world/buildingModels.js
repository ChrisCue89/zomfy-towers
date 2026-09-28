// Voxel-Modelle der Bauten. Alle Modelle sind um die Mitte ihres Grundrisses
// gebaut (x ∈ [−W/2, W/2), z ∈ [−D/2, D/2) in Voxeln), damit sie sich in
// 90°-Schritten drehen lassen, ohne vom Raster zu rutschen. Seit M13g sind
// alle doppelt fein (1/32 m, BUILDING_UNIT): ein Feld sind 32 × 32 Voxel.
// Farbrauschen bleibt grob (je zwei Voxel), die Feinheit steckt in Fugen,
// Kanten, Nägeln, Maserung und Werkzeug.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';
import { shade, stoneBlob } from './voxelKit.js';
import { buildPumpkin, buildJackOLantern, buildLeafPile, buildRainBarrel } from './decoModels.js';

/** Alle Bauten sind doppelt fein gebaut (M13g; vorher 1/16 m). */
export const BUILDING_UNIT = 1 / 32;

/** Scheit im Querschnitt (8 × 8 Voxel): rund, halb oder geviertelt; die Stirnseite zeigt Jahresringe. */
function splitLog(m, x0, y0, z0, z1, kind, flip, seed, endZ = z1) {
  const heart = kind === 0 ? [3.5, 3.5] : kind === 1 ? [3.5, 0] : [flip ? 7.5 : 0, 0];
  const radius = kind === 0 ? 4.1 : kind === 1 ? 4.6 : 8.2;
  for (let dx = 0; dx < 8; dx++) {
    for (let dy = 0; dy < 8; dy++) {
      const d = Math.hypot(dx + 0.5 - heart[0], dy + 0.5 - heart[1]);
      if (d > radius) continue;
      const bark = d > radius - 1.1 && !(kind === 1 && dy === 0) && !(kind === 2 && (dy === 0 || (flip ? dx === 7 : dx === 0)));
      for (let z = z0; z <= z1; z++) {
        let c;
        if (z === endZ) {
          const crack = kind === 0 && Math.abs(dx - dy) < 1 && d > 1 && hash3(x0, y0, 2, seed) < 0.6;
          c = bark ? P.e4 : crack ? P.e5 : d < 1 ? P.e6 : Math.floor(d * 0.8) % 2 ? P.e7 : P.e8;
        } else c = bark ? (hash3(x0 + dx, y0 + dy, z >> 2, seed) < 0.4 ? P.e2 : P.e3) : P.e6;
        m.set(x0 + dx, y0 + dy, z, c);
      }
    }
  }
}

/**
 * Werkbank (2 × 1 Felder: x −32..31, z −16..15): kräftige Beine mit Fußklötzen,
 * Platte aus Bohlen mit heller Vorderkante und Nägeln, Ablage mit
 * Bretterstapel, Schraubstock mit Spindel und Knebel, Hobel mit Spänen, hinten
 * eine Lochwand mit Säge, Hammer, Schlüssel und Zange, vorn links ein Laternchen.
 */
export function buildWorkbench(seed) {
  const m = new VoxelModel();
  for (const [x, z] of [[-28, -12], [24, -12], [-28, 8], [24, 8]]) {
    m.box(x, 0, z, x + 3, 23, z + 3, (xx, y) => (y <= 1 ? P.e2 : xx === x ? P.e5 : xx === x + 3 ? P.e3 : P.e4));
  }
  m.box(-30, 24, -14, 29, 27, 13, (x, y, z) => {
    if (z === 13) return y === 27 ? P.e8 : y === 24 ? P.e3 : P.e5; // Vorderkante
    if (y < 27) return P.e4;
    if (z % 8 === 2) return P.e4; // Fuge zwischen den Bohlen
    if ((x === -26 || x === 25) && z % 8 === 5) return P.s5; // Nägel
    if (hash3(x >> 2, 0, z >> 1, seed) > 0.9) return P.e5; // Maserung
    return z % 8 === 3 ? P.e7 : P.e6;
  });
  m.box(-26, 8, -10, 23, 9, 9, (x, y) => (y === 9 ? P.e5 : P.e3)); // Ablage
  m.box(-22, 10, -8, 3, 13, 3, (x, y, z) => (z === 3 ? (x % 6 === 0 ? P.e6 : y === 13 ? P.e9 : P.e8) : y === 13 ? P.e8 : P.e7)); // Bretterstapel
  // Schraubstock: Körper, Backen, Spindel, Knebel mit runden Enden
  m.box(16, 28, 2, 27, 33, 11, (x, y) => (y === 33 ? P.s5 : x === 16 ? P.s3 : P.s4));
  m.box(17, 28, 12, 26, 33, 13, (x, y) => (y === 33 ? P.s6 : P.s4)); // vordere Backe
  m.box(20, 29, 14, 23, 31, 19, (x, y) => (y === 31 ? P.s6 : P.s5)); // Spindel
  m.box(15, 30, 20, 28, 30, 20, P.s6).box(14, 29, 20, 14, 31, 20, P.s4).box(29, 29, 20, 29, 31, 20, P.s4); // Knebel
  // Hobel und Späne auf der Platte
  m.box(-8, 28, 0, 3, 30, 5, (x, y) => (y === 30 ? P.e5 : P.e4)).box(-3, 31, 1, -2, 31, 4, P.s6).box(-7, 31, 2, -6, 33, 3, P.e3);
  for (const [x, z] of [[6, 6], [7, 5], [8, 2], [-12, 6], [-11, 7], [10, 8], [11, 9]]) m.set(x, 28, z, P.e8);
  m.set(7, 29, 6, P.e9).set(-12, 29, 7, P.e9);
  // Lochwand hinten mit Werkzeug
  m.box(-30, 28, -16, 11, 55, -15, (x, y, z) => (z === -16 ? P.e3 : x <= -29 || x >= 10 || y >= 54 ? P.e3 : x % 4 === 2 && y % 4 === 2 ? P.e2 : P.e5));
  for (let y = 34; y <= 50; y++) {
    const x = -24 + Math.floor((50 - y) / 6);
    m.set(x, y, -14, P.s7).set(x + 1, y, -14, P.s7).set(x + 2, y, -14, y % 2 ? P.s5 : P.s8); // Säge mit Zähnen
  }
  m.box(-26, 50, -14, -21, 53, -14, (x, y) => (x >= -24 && x <= -23 && y >= 51 && y <= 52 ? P.e5 : P.e3)); // Griff
  m.box(-14, 34, -14, -13, 46, -14, (x) => (x === -14 ? P.e5 : P.e4)).box(-17, 46, -14, -10, 49, -14, (x, y) => (y === 49 ? P.s5 : x === -17 ? P.s6 : P.s4)); // Hammer
  m.box(-6, 36, -14, -5, 48, -14, P.s6).box(-8, 48, -14, -3, 51, -14, P.s6).box(-6, 50, -14, -5, 51, -14, null); // Schlüssel
  m.box(2, 36, -14, 3, 45, -14, P.r3).box(5, 36, -14, 6, 45, -14, P.r2).box(2, 46, -14, 6, 49, -14, (x) => (x === 4 ? P.s4 : P.s6)); // Zange
  // Laternchen vorn links (das Glas leuchtet separat)
  m.box(-28, 28, 4, -21, 29, 11, P.s2).box(-28, 38, 4, -21, 39, 11, P.s3).box(-26, 40, 6, -23, 40, 9, P.s4);
  for (const [x, z] of [[-28, 4], [-21, 4], [-28, 11], [-21, 11]]) m.box(x, 30, z, x, 37, z, P.s2);
  return m;
}

/** Leuchtende Teile der Werkbank (das Laternchen). */
export function buildWorkbenchGlow() {
  return new VoxelModel().box(-27, 30, 5, -22, 37, 10, 0xffffff);
}

/** Barrikaden und ihre Trümmer sind im selben Maß gebaut. */
export const BARRICADE_UNIT = BUILDING_UNIT;

/**
 * Barrikaden (Meilenstein 9, DESIGN.md 6.10; M9.1 neu gebaut – der Auftraggeber
 * erkannte die Kästen nicht als Barrikaden), seit M13g im Maß 1/32: Grundform
 * ist der Spanische Reiter. Ein Balken liegt quer über dem Weg, durch ihn sind
 * angespitzte Pfähle über Kreuz gesteckt. Die Kreuze stehen längs zum Weg: Auf
 * den meist west-östlichen Wegen zeigen sie genau zur Kamera und die Spitzen zur
 * Horde; in einer Reihe laufen die Balken ineinander. Helles, frisch
 * geschnittenes Holz mit Maserung hebt sich vom braunen Weg ab, ein rot-weißer
 * Lappen warnt. Stufe 1 Holz; 2 dichter, mit Eisenbändern und eisernen
 * Spitzen; 3 Stahligel aus rostigen Trägern. `damage` 0–1 nimmt Stücke weg.
 * Ursprung: Mitte der Zelle am Boden, x und z je von −16 bis 15 (32 × 32 Voxel).
 * Bei turns = 0 liegt der Balken längs x (quer über einen Nord-Süd-Weg).
 */
export function buildBarricade(seed, level = 1, damage = 0) {
  const m = new VoxelModel();
  const loose = (x, y, z) => damage > 0 && y > 3 && hash3(x >> 1, y >> 1, z >> 1, seed + 9) < damage * (0.12 + (y >> 1) * 0.03);
  const put = (x, y, z, c) => {
    if (!loose(x, y, z)) m.set(x, y, z, c);
  };
  // Schräger Pfahl in der y-z-Ebene: vom Fuß (z0, 0) mit dz je Stufe nach oben,
  // `thick` Voxel breit (x) und `band` Voxel hoch – so liest er sich als kräftiger Strich
  const stake = (x, z0, dz, len, c, thick = 4, band = 6) => {
    for (let t = 0; t <= len; t++) {
      const z = z0 + dz * t;
      const tip = t >= len - 3;
      for (let k = 0; k < thick; k++) {
        const grain = !tip && t > 2 && (t + k * 3) % 11 === 0; // Maserung
        const col = tip ? (k === thick - 1 ? c.tipShade || c.tip : c.tip) : t <= 2 ? c.foot : k === thick - 1 ? c.shade : k === 0 ? c.light || c.wood : grain ? c.shade : c.wood;
        for (let b = 0; b < band && t + b <= len; b++) put(x + k, t + b, z, tip && b > 0 ? c.tip : b === band - 1 && !tip ? c.light || c.wood : col);
      }
    }
  };
  // Gleicher Träger in der x-y-Ebene (für das Metallkreuz)
  const stakeX = (z, x0, dx, len, c) => {
    for (let t = 0; t <= len; t++) {
      const x = x0 + dx * t;
      const tip = t >= len - 2;
      for (let b = 0; b < 4 && t + b <= len; b++) {
        for (let k = 0; k < 4; k++) put(x, t + b, z + k, tip ? c.tip : k === 0 ? c.light : k === 3 ? c.shade : c.wood);
      }
    }
  };
  if (level >= 3) {
    // Metallkreuz (Stahligel): vier Träger über Kreuz, in der Mitte ein Knotenblech; Rostflecken
    const rusty = (x, y, z, base) => (hash3(x >> 1, y >> 1, z >> 1, seed + 3) > 0.74 ? ((y >> 1) % 2 ? P.r2 : P.r3) : base);
    const steel = { wood: P.s6, shade: P.s5, light: P.s7, tip: P.s3, foot: P.s4 };
    stake(-2, -14, 1, 26, steel, 4, 4);
    stake(-2, 13, -1, 26, steel, 4, 4);
    stakeX(-2, -14, 1, 26, steel);
    stakeX(-2, 13, -1, 26, steel);
    for (const [key, c] of m.cells) m.cells.set(key, [c[0], c[1], c[2], rusty(c[0], c[1], c[2], c[3])]);
    for (let x = -4; x <= 3; x++) for (let y = 10; y <= 17; y++) for (let z = -4; z <= 3; z++) put(x, y, z, x === -4 || y === 17 ? P.s5 : (x + y + z) % 5 ? P.s3 : P.s4);
    for (const [x, y] of [[-3, 16], [2, 16], [-3, 11], [2, 11]]) put(x, y, 4, P.s8); // Nieten
    return m;
  }
  const strong = level === 2;
  // Ein kräftiges Kreuz je Feld: der vordere Pfahl hell, der hintere etwas dunkler
  const front = strong ? { wood: P.e8, shade: P.e7, light: P.e9, tip: P.s7, tipShade: P.s5, foot: P.e5 } : { wood: P.e8, shade: P.e7, light: P.e9, tip: P.e9, foot: P.e5 };
  const back = strong ? { wood: P.e7, shade: P.e6, light: P.e8, tip: P.s6, tipShade: P.s4, foot: P.e4 } : { wood: P.e7, shade: P.e6, light: P.e8, tip: P.e8, foot: P.e4 };
  stake(-6, -14, 1, 28, back); // hinten (bei turns = 1 weiter nördlich)
  stake(-2, 14, -1, 28, front); // davor, über Kreuz
  // Der Balken quer hindurch (6 × 6 Voxel), Rinde in Längsrillen; an den Enden Jahresringe
  for (let x = -16; x <= 15; x++) {
    for (let y = 12; y <= 17; y++) {
      for (let z = -3; z <= 2; z++) {
        if ((y === 12 || y === 17) && (z === -3 || z === 2)) continue; // runde Kanten
        const end = x === -16 || x === 15;
        const bandIron = strong && (x === -8 || x === -7 || x === 2 || x === 3);
        const d = Math.hypot(y - 14.5, z + 0.5);
        let c;
        if (bandIron) c = y === 17 ? P.s5 : x % 2 ? P.s3 : P.s4;
        else if (end) c = d < 1 ? P.e6 : Math.floor(d * 0.9) % 2 ? P.e7 : P.e8;
        else c = y === 17 ? ((x + z) % 7 === 0 ? P.e3 : P.e5) : (x + z * 3) % 7 === 0 ? P.e2 : P.e3;
        put(x, y, z, c);
      }
    }
  }
  if (strong) {
    // Ein zweites, kleineres Kreuz dahinter und ein unterer Riegel für den Halt
    stake(8, -10, 1, 20, back, 4, 4);
    stake(10, 10, -1, 20, back, 4, 4);
    for (let x = -16; x <= 15; x++) for (let y = 2; y <= 3; y++) for (let z = -3; z <= 0; z++) put(x, y, z, y === 3 ? (x % 8 === 0 ? P.e4 : P.e6) : P.e4);
    for (const x of [-6, -5, -2, -1]) for (const y of [23, 24]) put(x, y, x < -3 ? -2 : 1, P.s3); // Eisenband an der Kreuzung oben
    for (const [x, y, z] of [[-4, 14, 3], [0, 15, 3], [-15, 16, 3], [14, 16, 3]]) put(x, y, z, P.s6); // Nägel
    return m;
  }
  // Warnlappen vorn unter dem Balken, rot-weiß gestreift, unten ausgefranst
  for (let x = -14; x <= -11; x++) {
    for (let y = 3; y <= 11; y++) {
      for (let z = -3; z <= 2; z++) {
        if (y === 3 && (x + z) % 2) continue;
        put(x, y, z, (y >> 1) % 2 ? P.r3 : x === -14 ? P.s8 : P.a4);
      }
    }
  }
  return m;
}

/** Trümmer einer zerstörten Barrikade: Pfähle und Splitter am Boden, ein Balkenstück. */
export function buildRubble(seed, level = 1) {
  const m = new VoxelModel();
  const metal = level >= 3;
  const light = metal ? P.s6 : P.e8;
  const dark = metal ? P.s4 : P.e6;
  // Umgestürzte Pfähle bzw. Träger, flach und schräg über das Feld (zwei Voxel stark)
  const pieces = [[-14, -12, 1, 1, 18], [10, -14, -1, 1, 16], [-12, 8, 1, 0, 22], [-4, -6, 0, 1, 14]];
  pieces.forEach(([x0, z0, dx, dz, len], k) => {
    for (let t = 0; t < len; t++) {
      const x = x0 + dx * t;
      const z = z0 + dz * t;
      if (x < -16 || x > 15 || z < -16 || z > 15) continue;
      const rust = metal && hash3(x >> 1, k, z >> 1, seed) > 0.7;
      const c = rust ? P.r2 : t >= len - 2 ? (metal ? P.s3 : P.e9) : ((t >> 1) + k) % 2 ? light : dark;
      m.set(x, 0, z, c).set(x + (dz ? 1 : 0), 0, z + (dx && !dz ? 1 : 0), shade(c, -1));
      m.set(x, 1, z, rust ? P.r3 : t >= len - 2 ? c : light);
      if ((t >> 1) % 3 === 1) m.set(x, 2, z, rust ? P.r3 : shade(light, 1));
    }
  });
  // Ein Stück Balken bzw. das Knotenblech
  for (let x = -4; x <= 5; x++) for (let z = 2; z <= 5; z++) m.set(x, 0, z, metal ? P.s3 : P.e3).set(x, 1, z, metal ? P.s4 : x === 5 ? P.e7 : P.e4).set(x, 2, z, metal ? P.s5 : x === 5 ? (Math.hypot(z - 3.5, 0) < 1 ? P.e6 : P.e8) : P.e3);
  // Splitter
  for (let k = 0; k < 18; k++) {
    const x = -14 + Math.floor(hash3(k, 1, 2, seed) * 29);
    const z = -14 + Math.floor(hash3(k, 3, 4, seed) * 29);
    m.set(x, 0, z, metal ? P.s7 : P.e9).set(x + 1, 0, z, metal ? P.s6 : P.e8);
  }
  if (!metal) m.box(-8, 0, 10, -3, 0, 12, (x) => (((x + 8) >> 1) % 2 ? P.a4 : P.r3)); // der Warnlappen
  return m;
}

/**
 * Umgeworfen (M17d): Aus dem Modell eines Baus wird ein flacher Haufen seiner
 * eigenen Teile. Es zerfällt in Brocken zu 4 × 4 × 4 Voxeln (1/8 m), damit
 * Bretter, Stoff und Steine als Stücke liegen bleiben und kein Gries entsteht.
 * Die unterste Lage bleibt stehen, ein Teil ist fort (zerbrochen, verstreut),
 * der Rest liegt flach (nur die unteren zwei Voxel eines Brockens) und etwas
 * nach außen gerutscht – je höher er war, desto weiter. Der Haufen bleibt
 * niedrig (höchstens HEAP Voxel). Versatz in ganzen 1/16 m: Die Kanten bleiben
 * auf dem Pixelraster.
 */
const HEAP = 9;

export function collapseModel(src, seed) {
  const chunks = new Map();
  let top = 4;
  src.forEach((x, y, z, c) => {
    const k = `${x >> 2},${y >> 2},${z >> 2}`;
    let list = chunks.get(k);
    if (!list) chunks.set(k, (list = []));
    list.push([x, y, z, c]);
    top = Math.max(top, y);
  });
  const out = new VoxelModel();
  const height = new Map(); // Höhe des Haufens je Säule
  const heightAt = (x, z) => height.get(`${x},${z}`) || 0;
  const drop = (x, y, z, c) => {
    out.set(x, y, z, c);
    const k = `${x},${z}`;
    height.set(k, Math.max(height.get(k) || 0, y + 1));
  };
  const keys = [...chunks.keys()].map((k) => k.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2]);
  for (const [bx, by, bz] of keys) {
    const list = chunks.get(`${bx},${by},${bz}`);
    if (by === 0) {
      for (const [x, y, z, c] of list) drop(x, y, z, c);
      continue;
    }
    if (hash3(bx, by, bz, seed) < 0.45) continue; // fort
    const f = (by * 4) / top; // 0 unten … 1 oben
    const ox = bx * 4 + 2;
    const oz = bz * 4 + 2;
    const len = Math.hypot(ox, oz) || 1;
    const push = 2 + f * 7;
    const dx = 2 * Math.round(((ox / len) * push + (hash3(bx, by, bz, seed + 7) - 0.5) * 6) / 2);
    const dz = 2 * Math.round(((oz / len) * push * 0.7 + (hash3(bx, by, bz, seed + 13) - 0.5) * 6) / 2);
    // Flach hingelegt: nur die unteren zwei Voxel des Brockens, auf die höchste Stelle darunter
    const lowest = list.reduce((m, v) => Math.min(m, v[1]), Infinity);
    const flat = list.filter((v) => v[1] - lowest < 2);
    let base = 0;
    for (const [x, , z] of flat) base = Math.max(base, heightAt(x + dx, z + dz));
    if (base > HEAP) continue;
    for (const [x, y, z, c] of flat) drop(x + dx, y - lowest + base, z + dz, c);
  }
  return out;
}

/** Laternenpfahl: Steinfuß, Pfahl mit Maserung und Kappe, Ausleger mit Strebe, daran eine Laterne mit Dach. */
export function buildLampPost(seed) {
  const m = new VoxelModel();
  for (const [x, z, r] of [[-6, -6, 4.4], [4, -4, 3.6], [-4, 4, 3.8], [4, 4, 3.2]]) stoneBlob(m, x, z, r, 3.6, r, seed + x * 3 + z, undefined, { grain: 2 });
  m.box(-4, 0, -4, 1, 63, 1, (x, y) => (y % 20 === 0 ? P.e2 : x <= -3 ? P.e5 : (x + (y >> 3)) % 4 === 0 ? P.e3 : P.e4));
  m.box(-6, 64, -6, 3, 65, 3, (x, y) => (y === 65 ? P.e4 : P.e3)).box(-4, 66, -4, 1, 67, 1, P.e5);
  m.box(-4, 58, 2, -1, 61, 13, (x, y) => (y === 61 ? P.e5 : P.e3)); // Ausleger
  m.line(-3, 48, 2, -3, 57, 10, P.e3, 1); // Strebe
  m.box(-3, 52, 10, -2, 57, 11, P.s3); // Haken
  // Laterne: Dach in Stufen mit Knauf, Boden, vier Streben
  m.box(-8, 48, 4, 3, 49, 17, (x, y) => (y === 49 ? P.s3 : P.s2)).box(-6, 50, 6, 1, 51, 15, P.s3).box(-4, 52, 8, -1, 52, 13, P.s4).box(-3, 53, 10, -2, 54, 11, P.s5);
  m.box(-8, 32, 4, 3, 33, 17, (x, y) => (y === 33 ? P.s2 : P.s1)).box(-6, 30, 8, 1, 31, 13, P.s2);
  for (const [x, z] of [[-8, 4], [3, 4], [-8, 17], [3, 17]]) m.box(x, 34, z, x, 47, z, P.s2);
  return m;
}

export function buildLampPostGlow() {
  const m = new VoxelModel();
  m.box(-7, 34, 5, 2, 47, 16, 0xffffff);
  return m;
}

/** Flachsbeet: Bretterrahmen mit Fugen, dunkle Erde in Furchen, drei Reihen Flachs mit blauen Blüten. */
export function buildGardenPlot(seed) {
  const m = new VoxelModel();
  m.box(-28, 0, -12, 27, 7, 11, (x, y, z) => {
    const frame = x <= -25 || x >= 24 || z <= -9 || z >= 8;
    if (frame) {
      if (y === 7) return x % 14 === 0 ? P.e4 : P.e6;
      if (y === 3) return P.e3; // Fuge zwischen den Brettern
      return z >= 8 && (x === -26 || x === 25) && (y === 1 || y === 5) ? P.s5 : P.e4;
    }
    if (y < 7) return P.e2;
    if (z % 6 === 0) return P.e1; // Furchen
    return hash3(x >> 1, y, z >> 1, seed) < 0.5 ? P.e2 : P.e3;
  });
  for (const z of [-6, 0, 4]) {
    for (let x = -22; x <= 20; x += 4) {
      const ox = hash3(x, 1, z, seed) < 0.3 ? 1 : 0;
      const h = 10 + Math.floor(hash3(x, 0, z, seed) * 7);
      for (let y = 8; y < 8 + h; y++) m.set(x + ox, y, z, y < 12 ? P.g5 : P.g6);
      m.set(x + ox + 1, 11 + (x % 3), z, P.g6).set(x + ox - 1, 14 + (x % 2), z, P.g7); // Blättchen
      const bloom = hash3(x, 2, z, seed);
      const top = 8 + h;
      const c = bloom < 0.6 ? P.b4 : bloom < 0.85 ? P.b5 : P.a4;
      m.set(x + ox - 1, top, z, c).set(x + ox + 1, top, z, c).set(x + ox, top + 1, z, c).set(x + ox - 1, top - 1, z, shade(c, -1)).set(x + ox + 1, top - 1, z, shade(c, -1));
      m.set(x + ox, top, z, P.f6);
    }
  }
  return m;
}

/** Gartenbank mit Lehne: Seitenteile, drei Sitzlatten mit Fugen, zwei Lehnenlatten, Armlehnen, Schrauben. */
export function buildBench(seed) {
  const m = new VoxelModel();
  for (const x of [-26, 22]) {
    const side = (xx) => (xx === x ? P.e4 : P.e3);
    m.box(x, 0, 4, x + 3, 11, 7, side); // Vorderbein
    m.box(x, 0, -8, x + 3, 31, -5, side); // Hinterbein bis zur Lehne
    m.box(x, 12, -8, x + 3, 13, 7, side); // Zarge
    m.box(x, 18, -6, x + 3, 19, 7, (xx, y) => (y === 19 ? P.e5 : P.e4)).box(x, 14, 6, x + 3, 17, 7, side); // Armlehne
  }
  for (const [z0, z1] of [[-6, -4], [-2, 0], [2, 4]]) {
    m.box(-28, 14, z0, 27, 15, z1, (x, y, z) => (y === 14 ? P.e4 : z === z1 ? P.e5 : hash3(x >> 2, y, z, seed) > 0.9 ? P.e5 : P.e6));
    for (const x of [-25, 23]) m.set(x, 15, z0 + 1, P.s5); // Schrauben
  }
  for (const y0 of [20, 26]) m.box(-28, y0, -8, 27, y0 + 3, -7, (x, y) => (y === y0 + 3 ? P.e7 : y === y0 ? P.e5 : P.e6));
  return m;
}

/**
 * Schlafzelt für Überlebende (Meilenstein 6): Giebelzelt aus geflickter Plane
 * mit Nähten, First von Nord nach Süd, vorn ein Eingang mit aufgerollten,
 * festgebundenen Klappen; drinnen ein gesteppter Schlafsack mit Kissen und
 * nachts ein Laternchen. Spannleinen zu den Heringen.
 */
export function buildTent(seed) {
  const m = new VoxelModel();
  const canvas = (x, y, z) => {
    if (hash3(Math.floor(x / 10), Math.floor(y / 8), Math.floor(z / 12), seed) > 0.88) return (x + y) % 6 === 0 ? P.b2 : P.b3; // Flicken
    if (y >= 14 && y <= 17) return y === 17 ? P.r4 : y === 14 ? P.r2 : P.r3; // Streifen
    if (z % 14 === 0) return P.e6; // Nähte
    return (x + z) % 4 === 0 ? P.e7 : P.e8;
  };
  for (let y = 0; y <= 43; y++) {
    const half = 28 - Math.floor(y * 0.68);
    m.box(-half - 1, y, -28, half, y, 23, canvas);
  }
  // Eingang vorn: eine echte Öffnung, dahinter Dunkel, ein Schlafsack
  m.box(-32, 0, 24, 31, 0, 27, P.e3);
  for (let y = 0; y <= 23; y++) {
    const half = 12 - Math.floor(y / 2);
    m.remove(-half - 1, y, 12, half, y, 23);
    for (let x = -half - 1; x <= half; x++) m.set(x, y, 11, y === 0 ? P.e2 : P.e1).set(x, y, 10, P.e1);
  }
  m.box(-8, 0, 12, 7, 3, 21, (x, y, z) => (y === 3 ? (z % 3 === 0 ? P.b2 : x === 0 ? P.s6 : P.b4) : P.b2)); // Schlafsack, gesteppt, Reißverschluss
  m.box(-8, 4, 12, -2, 5, 15, (x, y) => (y === 5 ? P.a4 : P.s8)); // Kissen
  m.box(2, 4, 14, 5, 5, 17, P.s2).box(2, 10, 14, 5, 10, 17, P.s3); // Laternchen: Boden und Deckel
  // Aufgerollte Klappen mit Bändern
  for (const x0 of [-24, 14]) {
    m.box(x0, 4, 24, x0 + 9, 21, 25, (x, y) => (y === 16 || y === 17 ? P.r3 : x === x0 || x === x0 + 9 ? P.e6 : (x + y) % 5 === 0 ? P.e7 : P.e8));
  }
  // Firststange, Heringe, Spannleinen
  m.box(-2, 44, -32, 1, 45, 25, (x, y) => (y === 45 ? P.e4 : P.e3));
  for (const [x, z] of [[-32, -32], [30, -32], [-32, 30], [30, 30]]) m.box(x, 0, z, x + 1, 2, z + 1, (xx, y) => (y === 2 ? P.e6 : P.e3));
  m.line(-1, 42, 25, -1, 2, 31, P.e8);
  m.line(0, 42, -30, 0, 2, -32, P.e8);
  return m;
}

export function buildTentGlow() {
  const m = new VoxelModel();
  m.box(2, 6, 14, 5, 9, 17, 0xffffff);
  return m;
}

/**
 * Holzlager (M11, DESIGN.md 6.8): Scheite unter einem Pultdach aus
 * Schindeln, die hellen Stirnseiten mit Jahresringen zeigen zur Kamera –
 * runde, halbe und geviertelte Scheite. Ab 2 × 1 Feldern, wie das Beet zum Ernten.
 */
export function buildWoodpile(seed) {
  const m = new VoxelModel();
  for (const [x, z, h] of [[-32, -16, 47], [28, -16, 47], [-32, 12, 39], [28, 12, 39]]) m.box(x, 0, z, x + 3, h, z + 3, (xx, y) => (y % 16 === 0 ? P.e2 : xx === x ? P.e5 : P.e3)); // Pfosten
  m.box(-28, 0, -12, 27, 3, 11, (x, y) => (y === 3 ? (x % 12 === 0 ? P.e3 : P.e5) : P.e4)); // Unterlage
  for (let row = 0; row < 4; row++) {
    const shift = row % 2 ? 4 : 0;
    for (let k = 0; k < 7; k++) {
      const x0 = -28 + shift + k * 8;
      if (x0 + 7 > 27) continue;
      const h = hash3(k, row, 7, seed);
      const kind = h < 0.55 ? 0 : h < 0.8 ? 1 : 2;
      const flip = kind === 2 && hash3(k, row, 8, seed) < 0.5;
      const zEnd = 11 - (hash3(k, row, 1, seed) < 0.35 ? 2 : 0);
      splitLog(m, x0, 4 + row * 8, -12, zEnd, kind, flip, seed + k + row * 7);
    }
  }
  // Pultdach aus Schindeln, nach Süden geneigt; jede Reihe mit dunkler Unterkante
  for (let z = -20; z <= 19; z++) {
    const y = 48 - Math.floor((z + 20) / 4);
    const row = Math.floor((z + 20) / 8);
    m.box(-36, y, z, 35, y, z, (x) => {
      const u = x + (row % 2) * 6;
      const shingle = Math.floor(u / 12);
      if (u % 12 === 0) return P.e3;
      if ((z + 20) % 8 === 7) return P.e3; // Unterkante der Reihe
      if (hash3(shingle, row, 3, seed) > 0.9 && (z + 20) % 8 < 3) return P.g4; // Moos
      return (z + 20) % 8 >= 5 ? P.e4 : hash3(shingle, row, 0, seed) < 0.4 ? P.e5 : P.e6;
    });
    m.set(-36, y - 1, z, P.e3).set(35, y - 1, z, P.e3);
  }
  return m;
}

/**
 * Hochsitz (M23): vier Stelzen mit Kreuzstreben, eine Plattform in 1,4 m Höhe
 * mit Geländer, vorn eine Leiter, darüber ein kleines Pultdach mit Schindeln.
 * Oben steht nachts ein Überlebender auf Posten.
 */
export function buildHochsitz(seed) {
  const m = new VoxelModel();
  const leg = (x, z) => m.box(x, 0, z, x + 1, 44, z + 1, (xx, y) => (y < 2 ? P.e2 : (y + xx) % 9 === 0 ? P.e3 : P.e4));
  for (const x of [-14, 12]) for (const z of [-14, 12]) leg(x, z);
  // Kreuzstreben links, rechts und hinten
  for (const x of [-14, 13]) {
    m.line(x, 4, -13, x, 40, 12, P.e3);
    m.line(x, 4, 12, x, 40, -13, P.e3);
  }
  m.line(-13, 4, -14, 12, 40, -14, P.e3);
  // Plattform aus Brettern
  m.box(-15, 44, -15, 14, 45, 14, (x, y, z) => (y === 44 ? P.e3 : (z + 15) % 6 === 0 ? P.e5 : hash3(x >> 2, y, z >> 1, seed) > 0.85 ? P.e7 : P.e6));
  // Geländer: Pfosten, Handlauf, ein Brett in der Mitte (vorn eine Lücke für die Leiter)
  for (const x of [-15, 14]) for (const z of [-15, 14]) m.box(x, 46, z, x, 58, z, P.e4);
  m.box(-15, 58, -15, 14, 58, -15, P.e5).box(-15, 58, -15, -15, 58, 14, P.e5).box(14, 58, -15, 14, 58, 14, P.e5);
  m.box(-15, 51, -15, 14, 52, -15, P.e4).box(-15, 51, -15, -15, 52, 14, P.e4).box(14, 51, -15, 14, 52, 14, P.e4);
  m.box(-15, 58, 14, -6, 58, 14, P.e5).box(5, 58, 14, 14, 58, 14, P.e5);
  // Leiter vorn
  for (const x of [-5, 4]) m.line(x, 0, 19, x, 45, 15, P.e5);
  for (let y = 4; y <= 42; y += 6) m.box(-4, y, 19 - Math.round((y * 4) / 45), 3, y, 19 - Math.round((y * 4) / 45), P.e6);
  // Dachpfosten hinten und vorn, Pultdach mit Schindeln (vorn höher)
  for (const x of [-15, 14]) {
    m.box(x, 59, -15, x, 72, -15, P.e4);
    m.box(x, 59, 14, x, 76, 14, P.e4);
  }
  for (let z = -17; z <= 16; z++) {
    const y = 72 + Math.round(((z + 17) * 5) / 33);
    m.box(-17, y, z, 16, y, z, (x) => ((x + z) % 4 === 0 ? P.r1 : (z & 1) ? P.r2 : P.r3));
  }
  return m;
}

/**
 * Moderlocke (M24): ein Haufen Überreste um einen fauligen Kürbis, darüber an
 * einem Pfahl ein Jutesack – und obendrauf sprießt schon der Moder
 * (pflaumenviolett, glimmende Knoten im Glüh-Modell).
 */
export function buildModerlocke(seed) {
  const m = new VoxelModel();
  // Haufen: Erde, graugrüne Überreste, Moos
  m.ellipsoid(0, 0, 3, 11, 4.5, 9, (x, y, z) => {
    if (y < 0) return null;
    const h = hash3(x >> 1, y, z >> 1, seed);
    return y === 0 ? P.e2 : h > 0.62 ? P.t4 : h > 0.45 ? P.t3 : hash3(x, y, z, seed + 3) > 0.72 ? P.g4 : P.e3;
  });
  // fauliger Kürbis vorn links, mit Stiel
  m.ellipsoid(-6, 4, 8, 4.5, 3.5, 4, (x, y) => ((x + 9) % 3 === 0 ? P.f3 : y >= 5 ? P.f4 : P.f3));
  m.box(-6, 7, 8, -6, 8, 8, P.g3);
  // Pfahl mit Querholz, daran an einer Schnur der Sack
  m.box(5, 0, -5, 6, 31, -4, (x, y) => (y % 7 === 0 ? P.e3 : P.e4));
  m.box(-3, 29, -5, 6, 30, -4, P.e5);
  m.box(-2, 23, -4, -2, 28, -4, P.e7);
  m.ellipsoid(-2, 18, -4, 4, 5.2, 3.5, (x, y) => (y >= 22 ? P.e6 : (x + y) % 4 === 0 ? P.e4 : P.e5));
  m.box(-3, 22, -5, -1, 22, -3, P.e3); // zugebunden
  // Moder: Pilzhüte auf dem Haufen und am Sack
  const cap = (x, y, z, r) => {
    m.box(x, y - 2, z, x, y - 1, z, P.d1);
    m.ellipsoid(x, y, z, r, 1.3, r, (xx, yy) => (yy >= y ? P.d2 : P.d1));
  };
  cap(3, 6, 7, 2.2);
  cap(-1, 6, 4, 1.7);
  cap(8, 4, 4, 1.5);
  cap(1, 16, -1, 1.4);
  return m;
}

/** Glimmende Knoten des Moders auf der Locke (nachts sichtbar). */
export function buildModerlockeGlow() {
  const m = new VoxelModel();
  for (const [x, y, z] of [[3, 8, 7], [-1, 8, 4], [8, 6, 4], [1, 18, -1], [4, 7, 9], [-2, 7, 2]]) m.set(x, y, z, P.a2);
  return m;
}

/** Herbstschmuck (M25): ein dicker Kürbis, daneben ein kleiner. */
function buildPumpkinPair(seed) {
  const m = new VoxelModel();
  m.merge(buildPumpkin(seed, 1.1), -4, 0, -3);
  m.merge(buildPumpkin(seed + 7, 0.7), 8, 0, 7);
  return m;
}

/** Nur der Teil eines Modells, der im Grundriss liegt (x ∈ [x0, x1), z ∈ [z0, z1) in Voxeln). */
function clipped(src, x0, x1, z0, z1) {
  const m = new VoxelModel();
  src.forEach((x, y, z, c) => {
    if (x >= x0 && x < x1 && z >= z0 && z < z1) m.set(x, y, z, c);
  });
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
  hochsitz: { model: buildHochsitz },
  moderlocke: { model: buildModerlocke, glow: buildModerlockeGlow }, // M24
  // Herbstschmuck aus dem Herbstbuch (M25): die Modelle der Herbst-Requisiten (decoModels.js)
  kuerbis: { model: buildPumpkinPair },
  laubhaufen: { model: (seed) => clipped(buildLeafPile(seed), -32, 32, -16, 16) },
  regentonne: { model: buildRainBarrel },
  kuerbislaterne: { model: (seed) => buildJackOLantern(seed).model, glow: () => buildJackOLantern(0).glow, pool: { y: 0.4, radius: 1.8 } },
};
