// Herbstschmuck-Modelle (M12, seit M13g im Maß 1/32): Regentonne, Kürbis,
// Kürbislaterne und Laubhaufen. Die Requisiten der Bucht (props.js) stellen sie
// an feste Plätze, das Herbstbuch (M25) schenkt sie als Bauten zum Aufstellen
// (buildingModels.js). Ursprung am Boden, um die Mitte gebaut.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3, Rng } from '../core/rng.js';
import { shade } from './voxelKit.js';

/** Regentonne (M13g, 1/32 m): blaue Dauben mit Fugen, zwei Reifen mit Nieten, Wasser mit Glanz und einem Blatt, Hahn. */
export function buildRainBarrel(seed) {
  const m = new VoxelModel();
  const R = 11.2;
  m.cylinder(0, 0, 0, 25, R, (x, y, z) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    if (y === 25 && d < R - 1.6) return Math.abs(x - z + 3) < 1 ? P.b5 : (x + z) % 7 === 0 ? P.b4 : P.b3; // Wasser
    const a = Math.atan2(z + 0.5, x + 0.5);
    if ((y >= 4 && y <= 6) || (y >= 19 && y <= 21)) {
      if ((y === 5 || y === 20) && Math.floor((a / Math.PI) * 12 + 24) % 3 === 0 && Math.abs(((a / Math.PI) * 12 + 24) % 1) < 0.3) return P.s7; // Niete
      return y === 6 || y === 21 ? P.s5 : y === 4 || y === 19 ? P.s3 : P.s4;
    }
    const u = (a / Math.PI) * 10 + 20;
    const f = u - Math.floor(u);
    if (f < 0.12) return P.b1; // Fuge zwischen den Dauben
    if (hash3(Math.floor(u), y >> 2, 0, seed) < 0.12) return P.b2;
    return x + 0.5 < -4 ? P.b4 : f > 0.7 ? P.b2 : P.b3;
  });
  m.cylinder(0, 0, 26, 27, R, (x, y, z) => (Math.hypot(x + 0.5, z + 0.5) > R - 1.6 ? (y === 27 ? P.b4 : P.b2) : null)); // Rand
  m.set(-3, 25, 3, P.f4).set(-2, 25, 3, P.f5).set(-3, 25, 4, P.f3); // Blatt auf dem Wasser
  m.box(-1, 7, 11, 0, 8, 13, P.s6).box(-1, 5, 13, 0, 6, 13, P.s5); // Hahn
  return m;
}

/**
 * Gerippter Kürbis (M13g, 1/32 m): zehn Rippen mit feinen dunklen Furchen,
 * jede Rippe zur Mitte heller, oben eine Mulde um den Stiel, Stiel mit
 * Rillen, ein geädertes Blatt und eine Ranke. size ~ 0.7 (klein) … 1.2 (groß).
 */
export function buildPumpkin(seed, size = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const rx = 6.8 * size + 1.2;
  const ry = 5.2 * size + 1.0;
  const rz = rx * 0.92;
  m.ellipsoid(0, ry, 0, rx, ry, rz, (x, y, z, dx, dy) => {
    const a = Math.atan2(z + 0.5, x + 0.5);
    const ph = ((a / (Math.PI * 2)) * 10 + 10.25) % 1;
    const edge = Math.min(ph, 1 - ph); // 0 an der Furche, 0,5 in der Rippenmitte
    const radial = Math.hypot(x + 0.5, z + 0.5) / rx;
    if (dy > 0.8 && radial < 0.3) return P.f3; // Mulde um den Stiel
    if (edge < 0.07 * (1 + (1 - Math.abs(dy)))) return dy > 0.6 ? P.f3 : P.f2; // Furche
    let k = dy < -0.7 ? 2 : dy < -0.35 ? 3 : 4;
    if (edge > 0.3 && dy > -0.2) k += 1; // Rippenmitte glänzt
    if (x + 0.5 < -rx * 0.35 && dy > 0.1 && edge > 0.2) k += 1; // Lichtseite (Westen)
    if (hash3(x >> 1, y >> 1, z >> 1, seed) < 0.05) k -= 1;
    return [P.f2, P.f2, P.f3, P.f3, P.f4, P.f5, P.f6][Math.max(0, Math.min(6, k))];
  });
  // Stiel mit Rillen, leicht gebogen
  const top = Math.ceil(ry * 2);
  m.box(-1, top - 2, -1, 1, top + 1, 1, (x, y, z) => ((x + z) % 2 ? P.g3 : P.e3));
  m.box(0, top + 2, -1, 1, top + 3, 0, P.e3).set(2, top + 3, -1, P.e2).set(2, top + 4, -1, P.e2);
  // Blatt mit Ader und Ranke
  if (rng.chance(0.75)) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 5; j++) {
        if ((i === 0 || i === 5) && (j === 0 || j === 4)) continue;
        m.set(-3 - i, top - 2 - Math.floor(i * 0.8), 1 + j, j === 2 ? P.g6 : i + j < 4 ? P.g5 : P.g4);
      }
    }
  }
  for (const [x, y, z] of [[2, 0, -2], [3, 0, -2], [4, -1, -3], [5, -1, -3], [5, -2, -2], [4, -2, -1]]) m.set(x, top - 2 + y, z, P.g3);
  return m;
}

/**
 * Kürbislaterne (M13g, 1/32 m): großer Kürbis mit geschnitztem Gesicht nach
 * Süden. Das Gesicht ist ein eigenes Modell (Glüh-Material): tagsüber dunkle
 * Löcher, nachts warm. Die Schnittkanten sind hell (frisches Fruchtfleisch).
 */
export function buildJackOLantern(seed) {
  const m = buildPumpkin(seed, 1.25);
  const glow = new VoxelModel();
  const ry = 5.2 * 1.25 + 1.0;
  const cy = Math.floor(ry);
  const face = [
    '...#.......#...', // Augen: Dreiecke
    '..###.....###..',
    '.#####...#####.',
    '.......#.......', // Nase
    '......###......',
    '#.............#', // Grinsen mit Zähnen
    '##...........##',
    '.###.##.##.###.',
    '..###########..',
    '....#######....',
  ];
  face.forEach((row, r) => {
    const y = cy + 5 - r;
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== '#') continue;
      const x = i - 7;
      let z = 24;
      while (z > -24 && !m.has(x, y, z)) z--;
      if (z <= -24) continue;
      m.set(x, y, z, null);
      glow.set(x, y, z, 0xffffff);
      m.set(x, y, z - 1, P.f1); // dahinter das dunkle Innere
      // helle Schnittkante: Nachbarn in der Außenhaut
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
        const ch = face[r - dy] && face[r - dy][i + dx];
        if (ch !== '#' && m.has(x + dx, y + dy, z)) m.set(x + dx, y + dy, z, P.f6);
      }
    }
  });
  return { model: m, glow };
}

/** Laubhaufen (M13g, 1/32 m): Blätter als kleine Flecken in Herbstfarben, einige mit Ader. */
export function buildLeafPile(seed) {
  const m = new VoxelModel();
  const colors = [P.f3, P.f4, P.f5, P.r3, P.e5, P.f6, P.r2, P.e6];
  m.ellipsoid(0, 0, 0, 20, 12, 16, (x, y, z, dx, dy) => {
    if (dy < 0) return null;
    const leaf = hash3(x >> 1, y >> 1, z >> 1, seed);
    if (dy > 0.55 && leaf < 0.25) return null; // lockere Kuppe
    const c = colors[Math.floor(leaf * colors.length)];
    if (hash3(x, y, z, seed + 1) < 0.12) return shade(c, -1); // Ader, Schatten zwischen den Blättern
    return c;
  });
  // ein paar Blätter liegen daneben im Gras
  for (let k = 0; k < 7; k++) {
    const a = hash3(k, 0, 0, seed + 2) * Math.PI * 2;
    const x = Math.round(Math.cos(a) * 23);
    const z = Math.round(Math.sin(a) * 19);
    const c = colors[k % colors.length];
    m.set(x, 0, z, c).set(x + 1, 0, z, c).set(x, 0, z + 1, shade(c, -1));
  }
  return m;
}
