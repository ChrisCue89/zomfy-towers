// A5: Gemeinsam kochen – die Modelle. Draußen hängt der Kessel an einer Kette unter einem Dreibein
// über der Feuerstelle (1/32 m), drinnen steht ein kleiner Topf auf einem Dreifuß auf der
// Herdplatte vor dem Kamin (1/16 m wie der Innenraum). Obenauf liegt das Gericht in seiner Farbe
// (je Gericht ein eigenes Teil, das Spiel blendet um). Dazu die Pilze als Fundstelle in der Bucht
// (eine Quelle wie Gras und Äste) und die Schüssel für die Karte am Ende.

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { hash3 } from '../core/rng.js';

/** Maße draußen (1/32 m): Spitze des Dreibeins, Unterkante und Rand des Kessels, Halbmesser. */
export const TRIPOD = { apex: 52, bottom: 22, rim: 32, r: 6.5, legR: 20 };

/** Eisen: dunkel, an den Kanten etwas Licht. */
const iron = (x, y, z, edge = false) => (edge ? P.s3 : (x + y + z) % 5 === 0 ? P.s2 : P.s1);

/**
 * Das Dreibein mit Kette und Kessel (Mitte über der Feuerstelle, Blick nach Süden). Die Beine
 * stehen hinten und schräg vorn – vorn bleibt der Blick auf den Kessel frei.
 */
export function buildTripodKettle() {
  const m = new VoxelModel();
  const { apex, bottom, rim, r, legR } = TRIPOD;
  // Drei Beine aus Rundeisen: von der Spitze schräg zum Boden
  for (const a of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) {
    const gx = Math.cos(a) * legR;
    const gz = Math.sin(a) * legR;
    const n = apex + 2;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = Math.round(gx * (1 - t));
      const z = Math.round(gz * (1 - t));
      const y = Math.round(apex * t);
      m.set(x, y, z, k % 7 === 0 ? P.s3 : P.s2);
    }
  }
  // Die Bindung oben: ein Ring aus Draht
  m.box(-1, apex - 1, -1, 1, apex, 1, (x, y) => (y === apex ? P.s4 : P.s2));
  // Die Kette: Glieder abwechselnd quer und längs
  for (let y = rim + 3; y < apex - 1; y++) m.set(0, y, 0, y % 2 ? P.s4 : P.s3).set(y % 2 ? 1 : 0, y, y % 2 ? 0 : 1, P.s2);
  // Der Bügel über dem Kessel
  for (let x = -r; x <= r; x++) {
    const y = rim + Math.round(Math.sqrt(Math.max(0, r * r - x * x)) * 0.45);
    m.set(Math.round(x), y, 0, Math.abs(x) > r - 1.5 ? P.s2 : P.s3);
  }
  // Der Kessel: bauchig, dunkles Gusseisen, ein Rand obenauf, links etwas Licht
  for (let y = bottom; y <= rim; y++) {
    const t = (y - bottom) / (rim - bottom);
    const rr = r * (0.72 + 0.28 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.9)) + (y === rim ? 0.6 : 0);
    for (let x = -8; x <= 8; x++) {
      for (let z = -8; z <= 8; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d > rr) continue;
        if (y > bottom + 1 && d < rr - 1.4) continue; // hohl (oben liegt das Gericht)
        let c = iron(x, y, z, false);
        if (y === rim) c = P.s3; // der Rand
        else if (x < -r * 0.45 && z > -2 && y > bottom + 2) c = P.s2; // Licht von links
        if (y === bottom + 1 && (x + z) % 3 === 0) c = P.d1; // Ruß mit einem Schimmer Pflaume
        m.set(x, y, z, c);
      }
    }
  }
  return m;
}

/** Das Gericht im Kessel (draußen): eine Fläche knapp unter dem Rand, mit Stückchen darin. */
export function buildKettleFill(dish) {
  const m = new VoxelModel();
  const { rim, r } = TRIPOD;
  const base = P[DISH_COLORS[dish]?.[0] || 'f4'];
  const bits = DISH_COLORS[dish]?.slice(1) || [];
  const y = rim - 1;
  for (let x = -8; x <= 8; x++) {
    for (let z = -8; z <= 8; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      if (d > r - 0.6) continue;
      const h = hash3(x, 7, z, dish.length);
      let c = base;
      if (bits.length && h > 0.78) c = P[bits[Math.floor(h * 97) % bits.length]];
      m.set(x, y, z, c);
    }
  }
  return m;
}

/** Farben je Gericht: Grundton, dann Stückchen (Kräuter, Fisch, Pilze). */
export const DISH_COLORS = {
  kuerbissuppe: ['f4', 'f5', 'g5', 'f3'],
  fischsuppe: ['e8', 'e9', 'g6', 'f5'],
  pilzeintopf: ['e5', 'e3', 'e7', 'g5'],
};

/**
 * Drinnen (1/16 m): Dreifuß mit Kupfertopf auf der Herdplatte, Mitte bei 0. Kupfer statt Eisen:
 * Vor den Flammen steht der Topf im Gegenlicht – schwarzes Eisen las sich dort als Loch.
 */
export function buildHearthPot() {
  const m = new VoxelModel();
  // drei kurze Beine aus Eisen
  for (const [x, z] of [[0, -2], [-2, 1], [1, 1]]) m.set(x, 0, z, P.s2).set(x, 1, z, P.s2);
  // der Topf: Kupfer, oben ein heller Rand, links etwas Licht
  for (let y = 2; y <= 5; y++) {
    const rr = y === 2 ? 2.2 : y === 5 ? 2.9 : 2.7;
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d > rr) continue;
        if (y > 2 && d < rr - 1.1) continue;
        m.set(x, y, z, y === 5 ? P.f3 : x < -1 ? P.r4 : y === 2 ? P.r1 : P.r3);
      }
    }
  }
  // zwei Ohren aus Eisen
  m.set(-3, 4, 0, P.s3).set(3, 4, 0, P.s3);
  return m;
}

/** Das Gericht im Topf (drinnen). */
export function buildPotFill(dish) {
  const m = new VoxelModel();
  const cols = DISH_COLORS[dish] || ['f4'];
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      if (Math.hypot(x + 0.5, z + 0.5) > 1.9) continue;
      m.set(x, 4, z, P[(x + z) % 3 === 0 && cols[1] ? cols[1] : cols[0]]);
    }
  }
  return m;
}

/**
 * Pilze als Fundstelle (1/32 m): ein Moospolster mit Maronen – braune Hüte, helle Stiele, ein
 * paar Blätter dazwischen. Die guten Pilze sind braun; der Moder ist violett und wächst nur im
 * Unterholz (CLAUDE.md).
 */
export function buildMushroomPatch(seed) {
  const m = new VoxelModel();
  // Moos und Laub
  for (let x = -9; x <= 9; x++) {
    for (let z = -7; z <= 7; z++) {
      const d = (x / 9.5) ** 2 + (z / 7.5) ** 2;
      if (d > 1) continue;
      const h = hash3(x >> 1, 0, z >> 1, seed);
      if (d > 0.75 && h < 0.5) continue;
      let c = h < 0.5 ? P.g4 : h < 0.85 ? P.g5 : P.g6;
      if (hash3(x, 1, z, seed + 3) > 0.9) c = hash3(x, 2, z, seed) > 0.5 ? P.f4 : P.r3; // ein Blatt
      m.set(x, 0, z, c);
    }
  }
  // Die Pilze: [x, z, Stielhöhe, Hutradius]
  const caps = [
    [-4, -2, 6, 4],
    [2, -3, 8, 5],
    [5, 2, 4, 3],
    [-1, 3, 3, 2.5],
    [-6, 3, 2, 2],
  ];
  for (const [cx, cz, stem, cap] of caps) {
    const sw = cap > 3 ? 1 : 0;
    for (let y = 1; y <= stem; y++) {
      for (let x = cx - sw; x <= cx + sw; x++) {
        for (let z = cz - sw; z <= cz + sw; z++) m.set(x, y, z, (x + y) % 3 === 0 ? P.e8 : P.e9);
      }
    }
    // Hut: flach gewölbt, oben hell, am Rand dunkler, unten hell (Röhren)
    const top = stem + Math.max(2, Math.round(cap * 0.6));
    for (let y = stem + 1; y <= top; y++) {
      const t = (y - stem) / (top - stem + 1);
      const rr = cap * Math.sqrt(1 - t * t * 0.85);
      for (let x = Math.floor(cx - rr - 1); x <= Math.ceil(cx + rr + 1); x++) {
        for (let z = Math.floor(cz - rr - 1); z <= Math.ceil(cz + rr + 1); z++) {
          const d = Math.hypot(x - cx, z - cz);
          if (d > rr) continue;
          let c = d > rr - 1 ? P.e3 : y === top ? P.e5 : P.e4;
          if (y === stem + 1) c = P.e7; // Unterseite
          if (y === top && d < rr * 0.4 && x < cx) c = P.e6; // Glanz
          m.set(x, y, z, c);
        }
      }
    }
  }
  return m;
}

/** Die Schüssel für die Karte am Ende (für renderVoxelPortrait): Holz, das Gericht, ein Löffel. */
export function buildDishBowl(dish) {
  const m = new VoxelModel();
  const cols = DISH_COLORS[dish] || ['f4'];
  const R = 12;
  for (let y = 0; y <= 6; y++) {
    const rr = 7 + (R - 7) * Math.sin((y / 6) * Math.PI * 0.5);
    for (let x = -R - 1; x <= R + 1; x++) {
      for (let z = -R - 1; z <= R + 1; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d > rr) continue;
        const inner = y > 1 && d < rr - 1.6;
        if (inner && y < 5) continue;
        let c;
        if (inner) {
          // die Oberfläche des Gerichts mit Stückchen
          const h = hash3(x, 5, z, dish.length + 9);
          c = P[cols[0]];
          if (cols.length > 1 && h > 0.72) c = P[cols[1 + (Math.floor(h * 31) % (cols.length - 1))]];
        } else c = y === 6 ? P.e7 : (x + z * 2) % 7 === 0 ? P.e4 : P.e5; // Holz mit Maserung, heller Rand
        m.set(x, y, z, c);
      }
    }
  }
  // Der Löffel liegt schräg im Gericht
  for (let k = 0; k < 14; k++) m.set(4 + k, 6 + Math.floor(k / 4), -3 - Math.floor(k / 3), P.e6);
  m.box(2, 6, -3, 4, 6, -1, P.e6);
  return m;
}
