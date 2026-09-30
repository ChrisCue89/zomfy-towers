// Modelle für die Inseln (N6) im Maß 1/32 m: ein altes Zelt, eine Stange mit Netz und
// Schwimmern, eine Steinbank mit Moos, eine halb vergrabene Kiste, wilde Kürbisse und die
// Katze (sitzend, rot getigert mit weißer Brust). Blick nach Süden (zur Kamera).

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { hash3 } from '../core/rng.js';
import { buildPumpkin } from './decoModels.js';
import { sculpt, blob, capsule, stoneBlob } from './voxelKit.js';

/** Ein verlassenes Zelt: verblichene Plane mit Flicken, schief, eine Leine zum Hering. */
export function buildIsleTent(seed) {
  const m = new VoxelModel();
  const W = 22; // halbe Breite
  const H = 28;
  const roof = (x, z) => Math.round(H * (1 - Math.abs(x) / W)) - (z > 12 ? 2 : 0); // vorn leicht eingesackt
  const canvas = (x, y, z) => {
    if (hash3(x >> 3, y >> 3, z >> 3, seed) < 0.16) return P.r2; // Flicken
    if (Math.abs(x) < 2) return P.e5; // Naht am First
    if ((x + y + z) % 9 === 0) return P.e6;
    return x < 0 ? P.e8 : P.e7;
  };
  for (let z = -16; z <= 16; z++) {
    for (let x = -W; x <= W; x++) {
      const top = roof(x, z);
      if (top < 0) continue;
      m.set(x, top, z, canvas(x, top, z));
      if (z === 16) for (let y = 0; y < top; y++) m.set(x, y, z, canvas(x, y, z)); // Giebelwand vorn
    }
  }
  // Eingang: dunkle Öffnung in der Giebelwand, die Plane links zurückgeschlagen
  for (let y = 0; y < 16; y++) {
    const half = 6 - Math.floor(y / 3);
    for (let x = -half; x <= half; x++) m.set(x, y, 16, y < 2 ? P.n2 : P.n1);
  }
  for (let y = 0; y < 15; y++) m.set(-7 - Math.floor(y / 4), y, 17, y % 5 === 0 ? P.e5 : P.e6);
  // Stange, Leine, Hering
  m.box(-1, 0, 18, 0, 30, 18, P.e3);
  for (let k = 0; k < 10; k++) m.set(1 + k * 2, 28 - k * 3, 18, P.s6);
  m.box(21, 0, 18, 22, 3, 18, P.s4);
  return m;
}

/** Eine Stange mit Querholz – dort hing das Netz (bleibt stehen, wenn es mitgenommen ist). */
export function buildNetPole() {
  const m = new VoxelModel();
  m.box(0, 0, 0, 2, 44, 2, (x, y) => (y % 9 === 0 ? P.e3 : P.e4)); // Stange
  m.box(3, 40, 1, 24, 41, 1, P.e3); // Querholz
  m.box(23, 34, 1, 24, 39, 1, P.e4); // Stütze am Ende
  return m;
}

/** Das alte Fischernetz an der Stange, mit roten Schwimmern. */
export function buildNet(seed) {
  const m = new VoxelModel();
  for (let x = 3; x <= 24; x++) {
    const sag = Math.round(Math.sin(((x - 3) / 21) * Math.PI) * 4);
    for (let y = 8 + sag; y <= 39; y++) {
      if ((x + y) % 4 === 0 || (x - y) % 4 === 0) m.set(x, y, 1 + ((x + y) % 2), hash3(x, y, 1, seed) < 0.1 ? P.g4 : P.s6);
    }
  }
  for (const [x, y] of [[6, 20], [13, 14], [19, 22], [22, 12]]) m.box(x, y, 2, x + 1, y + 2, 3, (xx, yy) => (yy === y + 2 ? P.r4 : P.r3)); // Schwimmer
  return m;
}

/** Eine Bank aus zwei Steinen und einer Platte, Moos auf der Kante. */
export function buildStoneBench(seed) {
  const m = new VoxelModel();
  const stone = (x0, x1) => m.box(x0, 0, -6, x1, 10, 6, (x, y, z) => (hash3(x >> 1, y >> 1, z >> 1, seed) < 0.3 ? P.s3 : z === 6 ? P.s5 : P.s4));
  stone(-16, -10);
  stone(10, 16);
  m.box(-20, 11, -8, 20, 14, 8, (x, y, z) => {
    if (y === 14 && hash3(x >> 1, 0, z >> 1, seed + 3) < 0.35) return P.g4; // Moos
    return y === 14 ? P.s6 : z === 8 ? P.s5 : P.s4;
  });
  return m;
}

/** Eine halb vergrabene Kiste mit Eisenbändern und Schloss (Fundkiste der Mittelinsel). */
export function buildIsleChest(seed) {
  const m = new VoxelModel();
  m.box(-10, 0, -7, 10, 11, 7, (x, y, z) => {
    if (Math.abs(x) === 7 || Math.abs(x) === 8) return y === 11 ? P.s5 : P.s3; // Eisenbänder
    if (y === 11) return hash3(x >> 2, 0, z >> 2, seed) < 0.25 ? P.g4 : P.e5;
    return z === 7 ? ((x + y) % 5 === 0 ? P.e3 : P.e4) : P.e3;
  });
  m.box(-1, 5, 8, 1, 8, 8, P.f6); // Schloss
  // Erde ringsum, die Kiste steckt halb im Boden
  for (let x = -12; x <= 12; x++) for (let z = -9; z <= 9; z++) if (Math.abs(x) > 10 || Math.abs(z) > 7) m.set(x, 0, z, hash3(x, 0, z, seed) < 0.5 ? P.e3 : P.e2);
  return m;
}

/** Die beiden Kürbisse von der kleinen Insel vor der Haustür. */
export function buildHomePumpkins(seed) {
  const m = new VoxelModel();
  m.merge(buildPumpkin(seed, 0.9), -5, 0, 0);
  m.merge(buildPumpkin(seed + 1, 0.6), 7, 0, 3);
  return m;
}

/** Wilde Kürbisse: zwei große, ein kleiner, Ranken dazwischen. */
export function buildWildPumpkins(seed) {
  const m = new VoxelModel();
  m.merge(buildPumpkin(seed, 1), -10, 0, 0);
  m.merge(buildPumpkin(seed + 1, 0.8), 9, 0, -3);
  m.merge(buildPumpkin(seed + 2, 0.5), 1, 0, 9);
  for (let k = 0; k < 22; k++) m.set(-12 + k, 1, 6 + Math.round(Math.sin(k * 0.6) * 2), P.g3);
  return m;
}

/**
 * Die Katze (»Mieze«): sitzt, rot getigert, weiße Brust und Pfoten, grüne Augen, der
 * Schwanz um die Pfoten gelegt. Aus Formen geformt (N1), etwa 30 cm hoch.
 */
export function buildCat32() {
  const m = new VoxelModel();
  const fur = (x, y, z, n) => {
    if (n.z > 0.55 && x > -3 && x < 3 && y < 9) return P.s9; // weiße Brust
    const stripe = Math.floor((y + Math.abs(x) * 0.4) / 2.2) % 2 === 0;
    if (n.y > 0.6) return stripe ? P.f4 : P.f5;
    return stripe ? P.f3 : P.f4;
  };
  sculpt(m, blob(0, 5, -1, 5.5, 6, 5.5), -7, 0, -8, 7, 12, 6, fur); // Körper
  sculpt(m, blob(0, 13, 1, 4.2, 3.8, 3.8), -6, 9, -4, 6, 17, 6, fur); // Kopf
  // Ohren
  for (const s of [-1, 1]) {
    m.set(s * 3, 17, 1, P.f4).set(s * 3, 18, 1, P.f4).set(s * 2, 17, 1, P.f5).set(s * 3, 17, 2, P.a1);
  }
  // Augen, Nase
  m.set(-2, 14, 5, P.g8).set(2, 14, 5, P.g8).set(-2, 13, 5, P.n0).set(2, 13, 5, P.n0);
  m.set(0, 12, 5, P.a0).set(0, 11, 5, P.s8);
  // Pfoten vorn
  m.box(-3, 0, 3, -2, 1, 5, P.s9);
  m.box(2, 0, 3, 3, 1, 5, P.s9);
  // Schwanz: um die Pfoten gelegt
  for (let k = 0; k <= 10; k++) {
    const a = (k / 10) * Math.PI * 0.9;
    const x = Math.round(Math.cos(a) * 7);
    const z = Math.round(Math.sin(a) * 6) - 1;
    m.set(x, 0, z, k % 3 === 0 ? P.f3 : P.f4).set(x, 1, z, k === 10 ? P.s9 : P.f4);
  }
  return m;
}

/** N8: Ein flacher Stein mit Moos – darunter lag eine Seite aus Eddas Funkbuch (der Stein bleibt). */
export function buildFlatStone(seed) {
  const m = new VoxelModel();
  stoneBlob(m, 0, 0, 10, 4, 8, seed, [P.s3, P.s4, P.s5, P.s6, P.s7], { grain: 2 });
  m.forEach((x, y, z) => {
    if (!m.has(x, y + 1, z) && y >= 3 && hash3(x >> 1, y, z >> 1, seed + 1) < 0.5) m.set(x, y, z, hash3(x, 1, z, seed) < 0.5 ? P.g4 : P.g5);
  });
  return m;
}

/** N8: Die Ecke eines gefalteten Blatts, die unter dem Stein hervorschaut (verschwindet, wenn es gefunden ist). */
export function buildPageUnderStone() {
  const m = new VoxelModel();
  for (let x = -4; x <= 5; x++) {
    for (let z = 6; z <= 11; z++) {
      if (z - 6 > 5 - Math.abs(x - 1) * 0.6) continue; // Ecke, schräg abgeknickt
      m.set(x, 0, z, (x + z) % 4 === 0 ? P.s6 : z === 8 && x > -3 && x < 4 ? P.s5 : P.s9); // Papier mit Zeilen
    }
  }
  m.set(0, 1, 8, P.s8).set(1, 1, 9, P.s8); // gewellt
  return m;
}

/** N8: Eine alte Blechdose, blau mit verblichenem Etikett, der Deckel fest aufgedrückt. */
export function buildTinCan(seed) {
  const m = new VoxelModel();
  sculpt(m, capsule(0, 1, 0, 0, 7, 0, 3.4), -4, 0, -4, 4, 8, 4, (x, y, z, n) => {
    if (y >= 8) return n.x < 0 ? P.s7 : P.s6; // Deckel
    if (y === 7) return P.s5;
    if (y >= 3 && y <= 5) return y === 4 && (x + z) % 3 === 0 ? P.s9 : P.r3; // Etikett
    if (hash3(x, y, z, seed) < 0.2) return P.r2; // Rost
    return n.x < -0.3 ? P.b4 : P.b3;
  });
  return m;
}
