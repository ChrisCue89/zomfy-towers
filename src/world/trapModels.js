// Fallen auf den Wegen (M19): flach, damit man über den Weg hinweg die Horde
// sieht, aber mit eigener Silhouette und Farbe – Stachelbrett (Holz mit
// silbernen Nägeln), Leimtopf (Topf in goldener Pfütze), Klettenteppich
// (Matte voller Kletten), Knallerbsen (Kistchen und rot-weiße Papierkugeln),
// Ölspur (schwarz glänzende Lache mit Kanne). Jede Falle gibt es ganz und
// verbraucht (abgenutzt, umgekippt, abgebrannt). Maß 1/32, ein Feld =
// 32 × 32 Voxel um die Mitte (x, z ∈ [−16, 15]).

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';

/** Brett quer über das Feld (x), mit Fuge und Maserung. */
function plank(m, z0, z1, seed, cracked = false) {
  m.box(-14, 0, z0, 13, 2, z1, (x, y, z) => {
    if (cracked && Math.abs(x - 3 - ((z * 3) % 5)) < 1 && z > z0) return y === 2 ? P.e2 : null;
    if (y < 2) return P.e3;
    if (z === z1) return P.e6; // Vorderkante im Licht
    if (x === -14 || x === 13) return P.e4;
    return hash3(x >> 2, z, 0, seed) < 0.25 ? P.e4 : (x + (z >> 1)) % 9 === 0 ? P.e4 : P.e5;
  });
}

/** Stachelbrett: zwei Bretter, Nagelreihen mit hellen Spitzen – verbraucht verbogen und lückig. */
export function buildSpikeBoard(seed, spent = false) {
  const m = new VoxelModel();
  plank(m, -11, -2, seed, spent);
  plank(m, 1, 10, seed + 3);
  m.box(-12, 3, -12, -10, 3, 11, P.s3).box(9, 3, -12, 11, 3, 11, P.s3); // Querleisten mit Schrauben
  m.set(-11, 3, -8, P.s6).set(-11, 3, 7, P.s6).set(10, 3, -8, P.s6).set(10, 3, 7, P.s6);
  for (let x = -8; x <= 7; x += 3) {
    for (const z of [-9, -5, 3, 7]) {
      const h = hash3(x, z, 1, seed);
      if (spent && h < 0.45) continue; // herausgerissen
      if (spent && h < 0.75) {
        m.box(x, 3, z, x + 2, 3, z, P.s5).set(x + 2, 3, z, P.s7); // umgebogen
        continue;
      }
      m.box(x, 3, z, x, 6, z, (xx, y) => (y === 6 ? P.s9 : y === 5 ? P.s7 : P.s5));
      m.set(x, 3, z + 1, P.s4); // Kopf des Nagels
    }
  }
  return m;
}

/** Leimtopf: bauchiger Tontopf mit Rand in einer goldenen Lache – verbraucht umgekippt, Lache eingetrocknet. */
export function buildGluePot(seed, spent = false) {
  const m = new VoxelModel();
  // Lache: unregelmäßig, eine Lage, mit heller Glanzkante
  for (let x = -15; x <= 14; x++) {
    for (let z = -15; z <= 14; z++) {
      const a = Math.atan2(z, x);
      const r = (spent ? 9 : 13) + Math.sin(a * 3 + seed) * 1.6 + Math.sin(a * 5 + 1) * 1.2;
      const d = Math.hypot(x, z);
      if (d > r) continue;
      const rim = d > r - 1.3;
      const c = spent ? (hash3(x >> 1, 0, z >> 1, seed) < 0.3 ? P.e4 : P.e5) : rim ? P.f7 : hash3(x >> 1, 0, z >> 1, seed) < 0.2 ? P.f6 : P.f5;
      m.set(x, 0, z, c);
      if (!spent && rim && z > 0 && hash3(x, 1, z, seed) < 0.35) m.set(x, 1, z, P.f8); // Glanz vorn
    }
  }
  if (!spent) {
    // stehender Topf: Bauch, Hals, Rand; der Leim quillt über
    for (let y = 1; y <= 12; y++) {
      const r = y <= 2 ? 5 : y <= 8 ? 6.5 - Math.abs(y - 6) * 0.25 : y <= 10 ? 5 : 6;
      m.box(-7, y, -7, 6, y, 6, (x, yy, z) => {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d > r) return null;
        if (y >= 11 && d < r - 1.4) return y === 12 ? P.f6 : null; // Leim im Topf
        if (y === 12) return P.r4; // Rand im Licht
        if (y === 7 && z > 0) return P.r1; // Kordel
        return z + x > 3 ? P.r4 : z + x > -4 ? P.r3 : P.r2;
      });
    }
    m.box(-6, 10, 5, -5, 11, 6, P.f6).box(3, 9, 5, 4, 11, 6, P.f5); // Tropfen über den Rand
    return m;
  }
  // umgekippt: liegt nach links, Öffnung nach vorn-links
  m.box(-12, 1, -5, 2, 11, 5, (x, y, z) => {
    const d = Math.hypot(y - 6, z);
    if (d > 5.2) return null;
    if (x <= -11 && d < 4) return P.e2; // Öffnung
    if (x <= -11) return P.r4;
    return y > 7 ? P.r4 : y > 4 ? P.r3 : P.r2;
  });
  return m;
}

/** Klettenteppich: geflochtene Matte (Karomuster), darauf Kletten mit Häkchen – verbraucht zerrissen, fast kahl. */
export function buildBurrMat(seed, spent = false) {
  const m = new VoxelModel();
  m.box(-13, 0, -13, 12, 1, 12, (x, y, z) => {
    if (spent && x > 2 && z < -3 && x - z > 12) return null; // eingerissene Ecke
    if (y === 0) return P.e3;
    const weave = ((x >> 2) + (z >> 2)) % 2 === 0;
    if (x === -13 || x === 12 || z === -13 || z === 12) return P.e4; // Saum
    return weave ? (x % 4 === 0 ? P.e5 : P.e6) : z % 4 === 0 ? P.e5 : P.e7;
  });
  for (let x = -11; x <= 10; x += 4) {
    for (let z = -11; z <= 10; z += 4) {
      const h = hash3(x, z, 2, seed);
      if (spent ? h < 0.8 : h < 0.12) continue;
      const ox = x + Math.floor(h * 3) - 1;
      const oz = z + Math.floor(hash3(z, x, 3, seed) * 3) - 1;
      // Klette: dunkler Kern, Häkchen nach allen Seiten, oben ein helles
      m.box(ox, 2, oz, ox + 1, 3, oz + 1, (xx, y) => (y === 3 ? P.g3 : P.e2));
      m.set(ox - 1, 2, oz, P.g2).set(ox + 2, 3, oz + 1, P.g2).set(ox, 3, oz - 1, P.g2).set(ox + 1, 2, oz + 2, P.g3);
      m.set(ox, 4, oz + 1, P.g4);
    }
  }
  return m;
}

/** Knallerbsen: Kistchen mit Deckel und ein Ring aus rot-weißen Papierkugeln – verbraucht leer, Rußflecken und Fetzen. */
export function buildSnapPeas(seed, spent = false) {
  const m = new VoxelModel();
  if (spent) {
    for (let x = -14; x <= 13; x++) {
      for (let z = -14; z <= 13; z++) {
        const d = Math.hypot(x, z) + hash3(x >> 1, 4, z >> 1, seed) * 5;
        if (d < 12 && hash3(x >> 1, 5, z >> 1, seed) < 0.55) m.set(x, 0, z, d < 7 ? P.s1 : P.s2); // Ruß
      }
    }
    for (let k = 0; k < 7; k++) {
      const x = Math.floor(hash3(k, 6, 0, seed) * 24) - 12;
      const z = Math.floor(hash3(k, 7, 0, seed) * 24) - 12;
      m.set(x, 1, z, k % 2 ? P.a4 : P.r3).set(x + 1, 1, z, P.s8); // Papierfetzen
    }
  }
  // Kistchen aus dünnen Brettern, vorn ein Etikett mit Blitz
  m.box(-5, 0, -4, 4, 6, 3, (x, y, z) => {
    if (spent && y >= 2 && x > -5 && x < 4 && z > -4 && z < 3) return null; // leer
    if (y === 6) return x === -5 || x === 4 ? P.e5 : P.e7;
    if (z === 3 && y >= 2 && y <= 4 && x >= -2 && x <= 1) return (x + y) % 3 === 0 ? P.f6 : P.r3; // Etikett
    return z === 3 ? P.e6 : P.e5;
  });
  if (!spent) {
    m.box(-5, 7, -6, 4, 7, -4, P.e6).box(-5, 8, -7, 4, 8, -6, P.e7); // Deckel, aufgeklappt
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + hash3(k, 8, 0, seed);
      const r = 8.5 + hash3(k, 9, 0, seed) * 4;
      const x = Math.round(Math.cos(a) * r);
      const z = Math.round(Math.sin(a) * r);
      const red = k % 3 !== 0;
      // Kugel aus Papier (2 × 2 × 2), gedrehtes Zipfelchen oben
      m.box(x, 0, z, x + 1, 1, z + 1, (xx, y, zz) => (red ? (y === 1 && zz === z + 1 ? P.r4 : P.r3) : y === 1 && zz === z + 1 ? P.a4 : P.s8));
      m.set(x, 2, z, red ? P.a4 : P.r4);
    }
    // ein paar in der Kiste
    m.box(-3, 7, -2, -2, 7, -1, P.r3).box(1, 7, 0, 2, 7, 1, P.a4).set(0, 7, -2, P.r4);
  }
  return m;
}

/** Ölspur: schwarz glänzende Lache mit Regenbogenrand, daneben die Kanne – verbraucht ein Brandfleck. */
export function buildOilSlick(seed, spent = false) {
  const m = new VoxelModel();
  for (let x = -15; x <= 14; x++) {
    for (let z = -15; z <= 14; z++) {
      const a = Math.atan2(z, x * 0.8);
      const r = 12.5 + Math.sin(a * 2 + seed * 0.7) * 2.2 + Math.sin(a * 5 + 2) * 1.1;
      const d = Math.hypot(x * 0.8, z);
      if (d > r) continue;
      const rim = d > r - 1.5;
      let c;
      if (spent) c = hash3(x >> 1, 10, z >> 1, seed) < 0.12 ? P.f2 : d < r - 4 ? P.s1 : P.s2; // verkohlt, letzte Glut
      else if (rim) c = [P.a5, P.a3, P.b4, P.a6][((x + z) & 7) >> 1]; // Regenbogenrand
      else c = hash3(x >> 1, 11, z >> 1, seed) < 0.15 ? P.n2 : P.n1;
      m.set(x, 0, z, c);
      if (!spent && !rim && (x - z) % 11 === 0 && z > -6) m.set(x, 1, z, P.n5); // Glanzstreifen
    }
  }
  // Kanne rechts hinten: Blech mit rotem Etikett, Tülle
  const can = spent ? [P.s1, P.s2, P.s2] : [P.s4, P.s5, P.s6];
  m.box(7, 1, -13, 12, 10, -8, (x, y, z) => {
    if (!spent && y >= 4 && y <= 6 && z === -8) return P.r3;
    if (y === 10) return can[2];
    return x === 12 || z === -8 ? can[1] : can[0];
  });
  m.box(9, 11, -11, 10, 12, -10, can[1]).box(6, 9, -11, 6, 10, -11, can[2]).set(5, 10, -11, can[1]); // Deckel, Tülle
  return m;
}

export const TRAP_MODELS = {
  stachelbrett: buildSpikeBoard,
  leimtopf: buildGluePot,
  klettenteppich: buildBurrMat,
  knallerbsen: buildSnapPeas,
  oelspur: buildOilSlick,
};
