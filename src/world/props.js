// Requisiten der Lichtung. Jedes Modell ist ein kleines Voxel-Bauwerk mit
// Ursprung am Boden; Positionen liegen auf dem 1/8-m-Raster.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3, Rng } from '../core/rng.js';
import { LAYOUT, V } from './layout.js';
import { buildDeciduous } from './nature.js';
import { createStaticVoxelObject } from '../render/staticMesh.js';

// --- Bausteine ----------------------------------------------------------------

/** Liegender Baumstamm entlang der x-Achse (Mittelachse auf Höhe r). */
function log(m, x0, x1, cy, cz, r, seed, { ends = true, moss = false } = {}) {
  for (let x = x0; x <= x1; x++) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        const dy = y + 0.5 - cy;
        const dz = z + 0.5 - cz;
        const d = Math.sqrt(dy * dy + dz * dz);
        if (d > r) continue;
        let c;
        if (ends && (x === x0 || x === x1)) c = d < r * 0.35 ? P.e6 : d < r * 0.7 ? P.e8 : P.e7;
        else {
          const h = hash3(x, y, z, seed);
          c = dy > r * 0.4 ? (h < 0.4 ? P.e4 : P.e3) : h < 0.3 ? P.e3 : P.e2;
          if (moss && dy > r * 0.5 && h > 0.55) c = h > 0.8 ? P.g5 : P.g4;
        }
        m.set(x, y, z, c);
      }
    }
  }
}

/** Liegender Stamm entlang der z-Achse. */
function logZ(m, z0, z1, cx, cy, r, seed, options) {
  const tmp = new VoxelModel();
  log(tmp, z0, z1, cy, 0, r, seed, options);
  tmp.forEach((x, y, z, c) => m.set(cx + z, y, x, c));
}

function stone(m, cx, cz, seed, size = 1) {
  const rng = new Rng(seed);
  const w = Math.round(rng.range(1, 2) * size);
  const d = Math.round(rng.range(1, 2) * size);
  const h = Math.round(rng.range(1, 2) * size);
  m.box(cx, 0, cz, cx + w, h, cz + d, (x, y, z) => {
    const r = hash3(x, y, z, seed);
    if (y === h && (x === cx || x === cx + w) && (z === cz || z === cz + d) && r < 0.6) return null;
    return y === h ? (r < 0.5 ? P.s6 : P.s7) : r < 0.5 ? P.s4 : P.s5;
  });
}

// --- Modelle --------------------------------------------------------------------

function buildCampfire(seed) {
  const m = new VoxelModel();
  // Steinkreis
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    stone(m, Math.round(Math.cos(a) * 6) - 1, Math.round(Math.sin(a) * 5) - 1, seed + i);
  }
  // Asche und Glut
  m.box(-3, 0, -3, 2, 0, 2, (x, y, z) => (hash3(x, y, z, seed) < 0.4 ? P.s3 : P.s2));
  // Gekreuzte Scheite
  log(m, -4, 3, 1.5, 0, 1.3, seed + 3);
  logZ(m, -4, 3, -1, 2.6, 1.2, seed + 4);
  return m;
}

function buildFlameFrame(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const columns = [
    [0, 0, rng.int(5, 8)],
    [-1, 0, rng.int(3, 6)],
    [0, -1, rng.int(3, 6)],
    [-1, -1, rng.int(4, 7)],
    [1, 0, rng.int(1, 4)],
    [-2, -1, rng.int(1, 3)],
    [0, 1, rng.int(1, 3)],
    [-1, -2, rng.int(1, 3)],
  ];
  for (const [x, z, h] of columns) {
    for (let y = 0; y < h; y++) {
      const t = y / Math.max(1, h - 1);
      const c = t < 0.3 ? P.f7 : t < 0.6 ? P.f6 : t < 0.85 ? P.f5 : P.f3;
      m.set(x, y + 3, z, c);
    }
  }
  if (rng.chance(0.6)) m.set(rng.int(-1, 0), rng.int(9, 11), rng.int(-1, 0), P.f4);
  return m;
}

function buildLogBench(seed, length = 14) {
  const m = new VoxelModel();
  log(m, 0, length - 1, 2, 0, 2.2, seed, { moss: true });
  return m;
}

function buildArmchair(seed) {
  const m = new VoxelModel();
  const fabric = (x, y, z) => (hash3(x, y, z, seed) < 0.15 ? P.e7 : P.f5);
  // Füße
  for (const [x, z] of [[0, 0], [6, 0], [0, 6], [6, 6]]) m.set(x, 0, z, P.e3);
  m.box(0, 1, 0, 6, 3, 6, fabric); // Sitzkasten
  m.box(1, 4, 1, 5, 4, 5, (x, y, z) => (x === 3 && z === 3 ? P.a1 : P.e7)); // Polster
  m.box(6, 4, 0, 7, 11, 6, fabric); // Rückenlehne (Osten)
  m.box(0, 4, 0, 5, 6, 0, fabric); // Armlehnen
  m.box(0, 4, 6, 5, 6, 6, fabric);
  m.box(6, 12, 1, 7, 12, 5, fabric);
  return m;
}

function buildCar(seed) {
  const m = new VoxelModel();
  const L = 26;
  const Wd = 13;
  const paint = (x, y, z) => {
    const h = hash3(x, y, z, seed);
    const rust = hash3(Math.floor(x / 3), Math.floor(y / 2), Math.floor(z / 3), seed + 1);
    if (rust > 0.78) return h < 0.5 ? P.r2 : P.e4;
    return h < 0.12 ? P.a6 : P.a5;
  };
  // Räder (platt, halb eingesunken)
  for (const [x, z] of [[4, 0], [4, Wd - 2], [20, 0], [20, Wd - 2]]) {
    m.box(x, 0, z, x + 3, 2, z + 1, (xx, y, zz) => (y === 1 && (zz === z || zz === z + 1) && (xx === x + 1 || xx === x + 2) ? P.s4 : P.s1));
  }
  // Karosserie
  m.box(0, 2, 1, L - 1, 5, Wd - 2, paint);
  m.box(1, 2, 0, L - 2, 4, 0, paint);
  m.box(1, 2, Wd - 1, L - 2, 4, Wd - 1, paint);
  // Stoßstangen, Lichter
  m.box(-1, 2, 1, -1, 3, Wd - 2, P.s5);
  m.box(L, 2, 1, L, 3, Wd - 2, P.s5);
  m.box(L - 1, 4, 1, L - 1, 4, 2, P.s8).box(L - 1, 4, Wd - 3, L - 1, 4, Wd - 2, P.s8);
  m.box(0, 4, 1, 0, 4, 2, P.r3).box(0, 4, Wd - 3, 0, 4, Wd - 2, P.r3);
  // Kabine mit Fenstern
  m.box(6, 6, 2, 19, 9, Wd - 3, (x, y, z) => {
    const edge = x === 6 || x === 19 || z === 2 || z === Wd - 3;
    if (y === 9) return paint(x, y, z);
    if (edge && y >= 6 && y <= 8) {
      const pillar = x === 6 || x === 19 || x === 12 || x === 13;
      if (pillar) return paint(x, y, z);
      if (hash3(x, y, z, seed + 7) < 0.18) return null; // zerbrochene Scheibe
      return y === 8 ? P.n4 : P.n3;
    }
    return edge ? paint(x, y, z) : P.n1;
  });
  // Moos auf dem Dach und ein Busch, der aus der Motorhaube wächst
  m.box(7, 10, 3, 18, 10, Wd - 4, (x, y, z) => {
    const h = hash3(x, y, z, seed + 2);
    return h < 0.45 ? null : h < 0.8 ? P.g4 : P.g5;
  });
  m.ellipsoid(23, 7.5, 6.5, 3, 2.5, 3, (x, y, z) => (hash3(x, y, z, seed + 4) < 0.3 ? null : y > 7 ? P.g6 : P.g5));
  return m;
}

function buildTower(seed) {
  const m = new VoxelModel();
  const legTops = [44, 40, 42, 37];
  const corners = [[-12, -12], [11, -12], [-12, 11], [11, 11]];
  const topCorners = [[-6, -6], [5, -6], [-6, 5], [5, 5]];
  const band = (y) => (Math.floor(y / 6) % 2 === 0 ? P.r3 : P.s8);
  const leg = (i, y) => {
    const t = y / 46;
    const [x0, z0] = corners[i];
    const [x1, z1] = topCorners[i];
    return [Math.round(x0 + (x1 - x0) * t), Math.round(z0 + (z1 - z0) * t)];
  };
  for (let i = 0; i < 4; i++) {
    for (let y = 0; y <= legTops[i]; y++) {
      const [x, z] = leg(i, y);
      const h = hash3(x, y, z, seed);
      const c = h < 0.15 ? P.r2 : band(y);
      m.box(x, y, z, x + 1, y, z + 1, c);
    }
    // verbogene Spitze
    const [tx, tz] = leg(i, legTops[i]);
    m.set(tx + (i % 2 ? 2 : -1), legTops[i] + 1, tz, P.r2);
  }
  // Querstreben (X-Muster) je Seite
  const faces = [[0, 1], [2, 3], [0, 2], [1, 3]];
  for (const [a, b] of faces) {
    for (let y0 = 3; y0 < 34; y0 += 10) {
      const y1 = y0 + 10;
      const [ax0, az0] = leg(a, y0);
      const [bx1, bz1] = leg(b, y1);
      const [bx0, bz0] = leg(b, y0);
      const [ax1, az1] = leg(a, y1);
      m.line(ax0, y0, az0, bx1, y1, bz1, P.s3);
      m.line(bx0, y0, bz0, ax1, y1, az1, P.s3);
    }
  }
  // Plattform
  const [px0, pz0] = leg(0, 24);
  const [px1, pz1] = leg(3, 24);
  m.box(px0, 24, pz0, px1 + 1, 24, pz1 + 1, (x, y, z) => ((x + z) % 2 ? P.s4 : P.s3));
  // Fundamente
  for (const [x, z] of corners) m.box(x - 1, 0, z - 1, x + 2, 1, z + 2, (xx, y) => (y === 1 ? P.s7 : P.s6));
  // Ranke an einem Bein
  for (let y = 0; y < 30; y++) {
    const [x, z] = leg(2, y);
    if (hash3(0, y, 0, seed + 5) < 0.55) m.set(x - 1, y, z + (y % 3 === 0 ? 1 : 0), y % 4 === 0 ? P.g6 : P.g5);
  }
  // Schaltkasten
  m.box(13, 0, 2, 16, 7, 6, (x, y, z) => (y === 7 ? P.s5 : z === 6 && x > 13 && x < 16 && y > 2 && y < 6 ? P.b2 : P.s4));
  m.set(14, 5, 7, P.f6);
  return m;
}

function buildTowerDebris(seed) {
  const m = new VoxelModel();
  // liegendes Turmstück: zwei Holme mit Streben
  for (let x = 0; x <= 20; x++) {
    m.set(x, 0, 0, x % 6 < 3 ? P.r3 : P.s8);
    m.set(x, 0, 6, x % 6 < 3 ? P.r3 : P.s8);
  }
  for (let x = 0; x <= 18; x += 6) {
    m.line(x, 0, 0, x + 6, 0, 6, P.s3);
    m.line(x + 6, 0, 0, x, 0, 6, P.s3);
  }
  m.forEach((x, y, z) => {
    if (hash3(x, 1, z, seed) < 0.25) m.set(x, 1, z, P.g5);
  });
  return m;
}

function buildSign(seed) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 1, 18, 1, (x, y) => (y % 5 === 0 ? P.e3 : P.e4));
  const board = (y, dir, length) => {
    for (let i = 0; i < length; i++) {
      const x = dir > 0 ? 2 + i : -1 - i;
      const tip = i === length - 1;
      for (let yy = y; yy <= y + 2; yy++) {
        if (tip && yy !== y + 1) continue;
        const text = !tip && yy === y + 1 && i > 0 && i < length - 2 && hash3(i, yy, dir, seed) < 0.55;
        m.set(x, yy, 1, text ? P.e2 : yy === y + 2 ? P.e8 : P.e7);
      }
    }
  };
  board(15, 1, 9);
  board(11, -1, 8);
  board(7, 1, 6);
  m.set(0, 19, 0, P.e3).set(1, 19, 1, P.e3);
  return m;
}

function buildMailbox() {
  const m = new VoxelModel();
  m.box(0, 0, 0, 0, 7, 0, P.e4);
  m.box(-1, 8, -2, 1, 10, 1, (x, y, z) => (y === 10 && (x === -1 || x === 1) ? null : z === 1 && y === 9 ? P.b1 : P.b3));
  m.set(0, 11, -1, P.b3).set(0, 11, 0, P.b3);
  m.box(2, 9, -1, 2, 12, -1, P.s5);
  m.box(2, 12, -1, 2, 12, 0, P.f6);
  return m;
}

function buildStreetLamp(seed) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 1, 1, 1, P.s4);
  m.box(0, 2, 0, 1, 33, 1, (x, y) => (y % 8 === 0 ? P.s4 : P.s3));
  m.box(0, 33, 2, 1, 34, 6, P.s3);
  m.box(-1, 31, 5, 2, 32, 8, P.s2);
  m.box(0, 30, 6, 1, 30, 7, P.n4); // Glas (dunkel, kaputt)
  // Nest mit Vogel
  m.box(-1, 35, 1, 2, 35, 3, (x, y, z) => ((x + z) % 2 ? P.e4 : P.e6));
  m.set(0, 36, 2, P.e5).set(1, 36, 2, P.e5).set(1, 37, 2, P.e5).set(1, 36, 3, P.f5);
  // Ranke
  for (let y = 2; y < 22; y++) {
    if (hash3(1, y, 1, seed) < 0.6) m.set(y % 4 < 2 ? -1 : 2, y, y % 3 === 0 ? 0 : 1, y % 5 === 0 ? P.a1 : P.g5);
  }
  return m;
}

function buildClothesline(seed, spanVoxels) {
  const m = new VoxelModel();
  const pole = (x) => {
    m.box(x, 0, 0, x, 14, 0, P.e4);
    m.box(x, 14, -1, x, 14, 1, P.e4);
  };
  pole(0);
  pole(spanVoxels);
  const sag = (x) => 13 - Math.round(Math.sin((x / spanVoxels) * Math.PI) * 1.5);
  for (let x = 1; x < spanVoxels; x++) m.set(x, sag(x), 0, P.s7);
  const cloth = (x0, w, h, c, c2) => {
    for (let x = x0; x < x0 + w; x++) {
      const top = sag(x) - 1;
      for (let y = top; y > top - h; y--) m.set(x, y, 0, (x + y) % 3 === 0 && c2 ? c2 : c);
    }
  };
  cloth(3, 5, 5, P.b3, P.b4); // Hemd
  cloth(10, 2, 3, P.r3); // Socke
  cloth(13, 2, 3, P.f6); // Socke
  cloth(17, 5, 6, P.a1, P.a4); // Handtuch
  cloth(24, 4, 5, P.e7, P.e6); // Hose
  return m;
}

function buildWoodpile(seed) {
  const m = new VoxelModel();
  for (let y = 0; y <= 8; y += 2) {
    const shift = (y / 2) % 2;
    for (let x = shift; x <= 7; x += 2) {
      for (let z = 0; z <= 18; z++) {
        const end = z === 18;
        const h = hash3(x, y, z, seed);
        const c = end ? (h < 0.5 ? P.e7 : P.e8) : h < 0.5 ? P.e3 : P.e4;
        m.box(x, y, z, x + 1, y + 1, z, end && (x + y) % 4 === 0 ? P.e6 : c);
      }
    }
  }
  // kleines Blechdach darüber
  m.box(-1, 11, -1, 8, 11, 19, (x, y, z) => (x % 2 ? P.s4 : P.s5));
  m.box(8, 0, 19, 8, 10, 19, P.e3);
  m.box(8, 0, -1, 8, 10, -1, P.e3);
  return m;
}

function buildChoppingBlock(seed) {
  const m = new VoxelModel();
  m.cylinder(0, 0, 0, 3, 3, (x, y, z) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    if (y === 3) return d < 1.2 ? P.e6 : d < 2.2 ? P.e8 : P.e7;
    return hash3(x, y, z, seed) < 0.4 ? P.e3 : P.e2;
  });
  // Axt: Stiel schräg, Blatt im Holz
  m.line(1, 4, 0, 4, 9, 0, P.e5);
  m.box(-1, 4, 0, 1, 4, 0, P.s7);
  m.set(0, 5, 0, P.s6).set(-1, 5, 0, P.s6);
  return m;
}

function buildRainBarrel(seed) {
  const m = new VoxelModel();
  m.cylinder(0, 0, 0, 6, 2.8, (x, y, z) => {
    if (y === 1 || y === 5) return P.s5;
    return hash3(x, y, z, seed) < 0.2 ? P.b3 : P.b2;
  });
  m.cylinder(0, 0, 6, 6, 2.2, P.b4);
  return m;
}

function buildGardenBed(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  m.box(0, 0, 0, 15, 2, 11, (x, y, z) => {
    const frame = x === 0 || x === 15 || z === 0 || z === 11;
    if (frame) return y === 2 ? P.e5 : P.e4;
    return y === 2 ? (hash3(x, y, z, seed) < 0.5 ? P.e2 : P.e3) : P.e2;
  });
  // Kürbisse
  for (const [x, z] of [[4, 4], [10, 7], [12, 3]]) {
    m.ellipsoid(x, 4, z, 2.2, 1.6, 2, (xx, y, zz) => ((xx + zz) % 2 ? P.f4 : P.f3));
    m.set(Math.floor(x), 6, Math.floor(z), P.g4);
  }
  // Blattgemüse und Unkraut
  for (let i = 0; i < 18; i++) {
    const x = rng.int(1, 14);
    const z = rng.int(1, 10);
    if (m.has(x, 3, z)) continue;
    const h = rng.int(1, 3);
    for (let y = 3; y < 3 + h; y++) m.set(x, y, z, y === 2 + h ? P.g7 : P.g5);
  }
  return m;
}

function buildOakWithSwing(seed) {
  const m = buildDeciduous(seed, 1.3);
  // Starker Ast nach Osten
  m.line(1, 16, 0, 12, 21, 0, P.e2, 1);
  // Seile und Reifen
  m.box(10, 7, -1, 10, 20, -1, P.e8);
  m.box(10, 7, 1, 10, 20, 1, P.e8);
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    const y = Math.round(5 + Math.sin(t) * 2.6);
    const x = Math.round(10 + Math.cos(t) * 2.6);
    m.box(x, y, -1, x, y, 1, P.s1);
  }
  return m;
}

function buildRoadBarrier(seed) {
  const m = new VoxelModel();
  // zwei Böcke
  for (const z of [0, 17]) {
    m.line(-2, 0, z, 0, 7, z, P.s4);
    m.line(2, 0, z, 0, 7, z, P.s4);
  }
  m.box(0, 6, -2, 0, 8, 19, (x, y, z) => (Math.floor((z + y) / 3) % 2 ? P.r4 : P.s9));
  // alte Reifen daneben
  for (const [x, z, y] of [[4, 4, 0], [4, 4, 2], [5, 12, 0]]) {
    m.box(x - 2, y, z - 2, x + 2, y + 1, z + 2, (xx, yy, zz) => (Math.abs(xx - x) < 1 && Math.abs(zz - z) < 1 ? null : P.s1));
  }
  return m;
}

function buildFallenTree(seed) {
  const m = new VoxelModel();
  logZ(m, -16, 16, 0, 3, 3, seed, { moss: true });
  // Aststümpfe und etwas Grün
  m.line(0, 5, -8, -3, 9, -9, P.e3);
  m.line(0, 5, 6, 3, 8, 8, P.e3);
  m.ellipsoid(-4, 9, -10, 3, 2, 3, (x, y, z) => (hash3(x, y, z, seed) < 0.3 ? null : P.t2));
  // Wurzelteller am Nordende
  m.box(-4, 0, -19, 4, 8, -17, (x, y, z) => (hash3(x, y, z, seed) < 0.25 ? null : y > 5 ? P.e3 : P.e2));
  return m;
}

function buildCrate(seed) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 4, 4, 4, (x, y, z) => {
    const edge = (x === 0 || x === 4) + (y === 0 || y === 4) + (z === 0 || z === 4) >= 2;
    return edge ? P.e3 : hash3(x, y, z, seed) < 0.3 ? P.e6 : P.e5;
  });
  return m;
}

// --- Aufstellen -------------------------------------------------------------

/**
 * Stellt alle Requisiten auf.
 * @returns {{ group, fire, interactions, lights, emitters, blockers }}
 */
export function createProps({ seed, materials, colliders }) {
  const group = new THREE.Group();
  group.name = 'Requisiten';
  const interactions = [];
  const blockers = []; // Flächen, auf denen kein Gras wachsen soll

  const add = (model, x, z, { turns = 0, occluder = false, name = '' } = {}) => {
    const object = createStaticVoxelObject(model, occluder ? materials.occluder : materials.world, { turns, seed });
    object.position.set(x, 0, z);
    object.name = name;
    group.add(object);
    return object;
  };
  const block = (x0, z0, x1, z1) => blockers.push({ minX: x0, minZ: z0, maxX: x1, maxZ: z1 });

  // Lagerfeuer
  const fire = LAYOUT.campfire;
  add(buildCampfire(seed + 1), fire.x, fire.z, { name: 'Lagerfeuer' });
  colliders.addCircle(fire.x, fire.z, 0.75);
  interactions.push({ id: 'feuer', x: fire.x, z: fire.z, radius: 1.7, prompt: 'feuer', dialog: 'lagerfeuer' });
  const flameFrames = [];
  const flameGroup = new THREE.Group();
  flameGroup.position.set(fire.x, 0, fire.z);
  for (let i = 0; i < 6; i++) {
    const frame = new THREE.Mesh(buildFlameFrame(seed + 100 + i).toGeometry({ jitter: 0, ao: false, visibleOnly: true }), materials.flame);
    frame.visible = i === 0;
    flameFrames.push(frame);
    flameGroup.add(frame);
  }
  group.add(flameGroup);

  // Sitzstämme und Ohrensessel ums Feuer
  add(buildLogBench(seed + 2, 14), fire.x - 0.875, fire.z - 2.125, { name: 'Bank' });
  colliders.addBox(fire.x - 0.9, fire.z - 2.4, fire.x + 0.9, fire.z - 1.85);
  add(buildLogBench(seed + 3, 12), fire.x - 2.0, fire.z + 0.75, { turns: 1, name: 'Bank' });
  colliders.addBox(fire.x - 2.3, fire.z - 0.8, fire.x - 1.6, fire.z + 0.8);
  add(buildArmchair(seed + 4), fire.x + 1.625, fire.z - 0.375, { name: 'Sessel' });
  colliders.addBox(fire.x + 1.6, fire.z - 0.4, fire.x + 2.6, fire.z + 0.5);
  interactions.push({ id: 'sessel', x: fire.x + 2.1, z: fire.z + 0.05, radius: 1.1, prompt: 'hinsetzen', dialog: 'sessel' });

  // Autowrack auf der Straße
  const car = LAYOUT.car;
  add(buildCar(seed + 5), car.x - 1.625, car.z - 0.75, { occluder: true, name: 'Autowrack' });
  colliders.addBox(car.x - 1.75, car.z - 0.85, car.x + 1.75, car.z + 0.85);
  block(car.x - 1.9, car.z - 1.0, car.x + 1.9, car.z + 1.0);
  interactions.push({ id: 'auto', x: car.x, z: car.z, radius: 2.3, prompt: 'ansehen', dialog: 'auto' });
  add(buildCrate(seed + 6), car.x + 2.25, car.z - 1.5, { name: 'Kiste' });
  colliders.addBox(car.x + 2.25, car.z - 1.5, car.x + 2.9, car.z - 0.85);

  // Funkturm-Stumpf mit Trümmerteil
  const tower = LAYOUT.tower;
  add(buildTower(seed + 7), tower.x, tower.z, { occluder: true, name: 'Funkturm' });
  for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) colliders.addCircle(tower.x + dx, tower.z + dz, 0.35);
  colliders.addBox(tower.x + 1.625, tower.z + 0.25, tower.x + 2.125, tower.z + 0.875);
  block(tower.x - 2, tower.z - 2, tower.x + 2.2, tower.z + 2);
  interactions.push({ id: 'turm', x: tower.x, z: tower.z + 1.5, radius: 2.0, prompt: 'ansehen', dialog: 'funkturm' });
  add(buildTowerDebris(seed + 8), tower.x - 2.0, tower.z + 2.75, { name: 'Turmteil' });
  block(tower.x - 2.1, tower.z + 2.65, tower.x + 0.7, tower.z + 3.65);

  // Wegweiser, Briefkasten, Straßenlaterne
  const sign = LAYOUT.sign;
  add(buildSign(seed + 9), sign.x, sign.z, { name: 'Wegweiser' });
  colliders.addCircle(sign.x + 0.125, sign.z + 0.125, 0.2);
  interactions.push({ id: 'schild', x: sign.x, z: sign.z, radius: 1.4, prompt: 'lesen', dialog: 'schild' });
  const mail = LAYOUT.mailbox;
  add(buildMailbox(), mail.x, mail.z, { name: 'Briefkasten' });
  colliders.addCircle(mail.x, mail.z, 0.2);
  interactions.push({ id: 'briefkasten', x: mail.x, z: mail.z, radius: 1.2, prompt: 'nachsehen', dialog: 'briefkasten' });
  const lamp = LAYOUT.streetLamp;
  add(buildStreetLamp(seed + 10), lamp.x, lamp.z, { occluder: true, name: 'Straßenlaterne' });
  colliders.addCircle(lamp.x + 0.125, lamp.z + 0.125, 0.2);
  interactions.push({ id: 'strassenlaterne', x: lamp.x, z: lamp.z, radius: 1.3, prompt: 'ansehen', dialog: 'strassenlaterne' });

  // Wäscheleine
  const cl = LAYOUT.clothesline;
  const span = Math.round((cl.x1 - cl.x0) / V);
  add(buildClothesline(seed + 11, span), cl.x0, cl.z, { occluder: true, name: 'Wäscheleine' });
  colliders.addCircle(cl.x0, cl.z, 0.15);
  colliders.addCircle(cl.x1, cl.z, 0.15);
  interactions.push({ id: 'waesche', x: (cl.x0 + cl.x1) / 2, z: cl.z, radius: 1.3, prompt: 'ansehen', dialog: 'waesche' });

  // Holzstapel an der Westwand, Hackklotz, Regentonne, Beet
  const wp = LAYOUT.woodpile;
  add(buildWoodpile(seed + 12), wp.x, wp.z, { occluder: true, name: 'Holzstapel' });
  colliders.addBox(wp.x - 0.15, wp.z - 0.15, wp.x + 1.15, wp.z + 2.5);
  const cb = LAYOUT.choppingBlock;
  add(buildChoppingBlock(seed + 13), cb.x, cb.z, { name: 'Hackklotz' });
  colliders.addCircle(cb.x, cb.z, 0.4);
  interactions.push({ id: 'hackklotz', x: cb.x, z: cb.z, radius: 1.2, prompt: 'ansehen', dialog: 'hackklotz' });
  const s = LAYOUT.shelter;
  const barrel = { x: s.x + s.width * V + 0.375, z: s.z + s.depth * V - 0.375 };
  add(buildRainBarrel(seed + 14), barrel.x, barrel.z, { name: 'Regentonne' });
  colliders.addCircle(barrel.x, barrel.z, 0.4);
  const garden = LAYOUT.garden;
  add(buildGardenBed(seed + 15), garden.x, garden.z, { name: 'Beet' });
  colliders.addBox(garden.x, garden.z, garden.x + 2.0, garden.z + 1.5);
  interactions.push({ id: 'beet', x: garden.x + 1.0, z: garden.z + 1.5, radius: 1.3, prompt: 'ansehen', dialog: 'beet' });

  // Alte Eiche mit Reifenschaukel
  const oak = LAYOUT.oak;
  add(buildOakWithSwing(seed + 16), oak.x, oak.z, { occluder: true, name: 'Eiche' });
  colliders.addCircle(oak.x, oak.z, 0.45);
  colliders.addCircle(oak.x + 1.3, oak.z, 0.3);
  interactions.push({ id: 'schaukel', x: oak.x + 1.3, z: oak.z + 0.4, radius: 1.2, prompt: 'schaukeln', dialog: 'schaukel' });

  // Straßensperren an beiden Enden
  const west = LAYOUT.roadBlockWest;
  add(buildFallenTree(seed + 17), west.x, west.z, { occluder: true, name: 'Baumstamm' });
  colliders.addBox(west.x - 0.5, west.z - 2.5, west.x + 0.5, west.z + 2.2);
  interactions.push({ id: 'baumstamm', x: west.x + 0.6, z: west.z, radius: 1.6, prompt: 'ansehen', dialog: 'baumstamm' });
  const east = LAYOUT.roadBlockEast;
  add(buildRoadBarrier(seed + 18), east.x, east.z - 1.125, { name: 'Absperrung' });
  colliders.addBox(east.x - 0.4, east.z - 1.5, east.x + 0.8, east.z + 1.5);
  interactions.push({ id: 'absperrung', x: east.x - 0.4, z: east.z, radius: 1.6, prompt: 'ansehen', dialog: 'absperrung' });

  return {
    group,
    interactions,
    blockers,
    fire: {
      frames: flameFrames,
      light: new THREE.Vector3(fire.x, 0.55, fire.z),
      smoke: new THREE.Vector3(fire.x - 0.06, 1.2, fire.z - 0.06),
      embers: new THREE.Vector3(fire.x - 0.06, 0.6, fire.z - 0.06),
    },
  };
}
