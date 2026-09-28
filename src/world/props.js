// Requisiten der Bucht (Meilenstein 9): Feuerstelle, Steg, Leuchtmast,
// Bootswrack, Wäscheleine, Holzstapel … Jedes Modell ist ein kleines
// Voxel-Bauwerk mit Ursprung am Boden; Positionen liegen auf dem 1/8-m-Raster.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3, Rng } from '../core/rng.js';
import { LAYOUT, V } from './layout.js';
import { buildDeciduous } from './nature.js';
import { BAY } from './map.js';
import { createStaticVoxelObject, shadowGeometry, SHADOW_LAYER, SHADOW_PROXY_MATERIAL } from '../render/staticMesh.js';

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

// --- Funkturm-Ausbau (Meilenstein 6, Juna) -------------------------------------------
// Gleiches Raster wie buildTower (Beine von den Ecken ±12 unten zu ±6 oben).

const towerLeg = (i, y) => {
  const corners = [[-12, -12], [11, -12], [-12, 11], [11, 11]];
  const top = [[-6, -6], [5, -6], [-6, 5], [5, 5]];
  const t = y / 46;
  return [Math.round(corners[i][0] + (top[i][0] - corners[i][0]) * t), Math.round(corners[i][1] + (top[i][1] - corners[i][1]) * t)];
};

/** Stufe 1: Beine gerichtet, Leiter an der Südseite, Plattform oben. */
function buildTowerRepair(seed) {
  const m = new VoxelModel();
  const band = (y) => (Math.floor(y / 6) % 2 === 0 ? P.r4 : P.s9);
  for (let i = 0; i < 4; i++) {
    for (let y = 36; y <= 46; y++) {
      const [x, z] = towerLeg(i, y);
      m.box(x, y, z, x + 1, y, z + 1, band(y));
    }
  }
  // Leiter vor der Südseite
  for (let y = 1; y <= 46; y++) {
    const z = Math.round(11 + (5 - 11) * (y / 46)) + 2;
    m.set(-2, y, z, P.e4).set(1, y, z, P.e4);
    if (y % 3 === 0) m.set(-1, y, z, P.e6).set(0, y, z, P.e6);
  }
  // Plattform mit Geländer
  m.box(-6, 47, -6, 6, 47, 6, (x, y, z) => ((x + z) % 2 ? P.s5 : P.s4));
  for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) m.box(x, 48, z, x, 50, z, P.s3);
  m.box(-6, 50, 6, 6, 50, 6, P.s3).box(-6, 50, -6, -6, 50, 6, P.s3).box(6, 50, -6, 6, 50, 6, P.s3);
  // frische Flicken am Fuß
  m.box(-2, 0, 12, 1, 0, 13, P.e5);
  return m;
}

/** Stufe 2: Antennenmast mit Querstreben, Schüssel und Kabel zum Schaltkasten. */
function buildTowerAntenna() {
  const m = new VoxelModel();
  m.box(-1, 48, -1, 0, 66, 0, (x, y) => (y % 4 === 0 ? P.r3 : P.s7));
  for (const y of [54, 60]) m.box(-5, y, -1, 4, y, -1, P.s6);
  m.box(2, 56, 1, 4, 59, 1, P.s8); // Schüssel
  m.set(3, 57, 2, P.s5);
  m.line(5, 47, 5, 14, 8, 4, P.s1); // Kabel hinunter zum Schaltkasten
  m.line(-6, 47, 5, 13, 7, 5, P.s2);
  m.set(-1, 67, -1, P.r4);
  return m;
}

/** Stufe 3: Leuchtfeuer oben auf dem Mast (Gehäuse; das Glas leuchtet separat). */
function buildTowerBeacon() {
  const m = new VoxelModel();
  m.box(-3, 67, -3, 2, 67, 2, P.s3); // Sockel
  for (const [x, z] of [[-3, -3], [2, -3], [-3, 2], [2, 2]]) m.box(x, 68, z, x, 71, z, P.s2);
  m.box(-3, 72, -3, 2, 72, 2, P.r3); // Dach
  m.box(-2, 73, -2, 1, 73, 1, P.r2);
  m.set(-1, 74, -1, P.f6);
  return m;
}

function buildTowerBeaconGlass() {
  const m = new VoxelModel();
  m.box(-2, 68, -2, 1, 71, 1, 0xffffff);
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
  const cloths = [];
  const cloth = (x0, w, h, c, c2) => {
    const piece = new VoxelModel();
    const anchor = sag(x0);
    for (let x = x0; x < x0 + w; x++) {
      const top = sag(x) - 1;
      for (let y = top; y > top - h; y--) piece.set(x - x0, y - anchor, 0, (x + y) % 3 === 0 && c2 ? c2 : c);
    }
    cloths.push({ model: piece, x: x0, y: anchor });
  };
  cloth(3, 5, 5, P.b3, P.b4); // Hemd
  cloth(10, 2, 3, P.r3); // Socke
  cloth(13, 2, 3, P.f6); // Socke
  cloth(17, 5, 6, P.a1, P.a4); // Handtuch
  cloth(24, 4, 5, P.e7, P.e6); // Hose
  return { line: m, cloths };
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
  return m;
}

/** Die Axt im Hackklotz – eigenes Modell, damit man sie herausnehmen kann. */
function buildStuckAxe() {
  const m = new VoxelModel();
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

// --- Herbst (Meilenstein 12): im feinen Maß (1/16 m) --------------------------

const FINE = 1 / 16;

/** Gerippter Kürbis mit Stiel und Ranke. size ~ 0.7 (klein) … 1.2 (groß). */
function buildPumpkin(seed, size = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const rx = 3.4 * size + 0.6;
  const ry = 2.6 * size + 0.5;
  const rz = rx * 0.92;
  m.ellipsoid(0, ry, 0, rx, ry, rz, (x, y, z, dx, dy) => {
    // Rippen: zehn Keile um die Mitte – oben Strahlen, vorn senkrechte Furchen
    const a = Math.atan2(z + 0.5, x + 0.5);
    const rib = Math.floor(((a / (Math.PI * 2)) * 10 + 10.5) % 10);
    const groove = rib % 2 === 0;
    if (dy > 0.75) return groove ? P.f4 : P.f5;
    if (dy < -0.6) return P.f2;
    return groove ? P.f3 : hash3(x, y, z, seed) < 0.12 ? P.f5 : P.f4;
  });
  // Stiel, leicht gebogen, dazu ein Blatt und eine Ranke
  const top = Math.ceil(ry * 2);
  m.box(0, top - 1, 0, 0, top + 1, 0, P.e3).set(1, top + 1, 0, P.e2);
  if (rng.chance(0.7)) m.box(-2, top - 1, 1, -1, top - 1, 2, P.g4).set(-2, top - 1, 2, P.g5);
  m.set(1, top - 1, -1, P.g3).set(2, top - 1, -1, P.g3).set(2, top - 2, -2, P.g3);
  return m;
}

/**
 * Kürbislaterne: großer Kürbis mit geschnitztem Gesicht nach Süden. Das Gesicht
 * ist ein eigenes Modell (Glüh-Material): tagsüber dunkle Löcher, nachts warm.
 */
function buildJackOLantern(seed) {
  const m = buildPumpkin(seed, 1.25);
  const glow = new VoxelModel();
  const ry = 2.6 * 1.25 + 0.5;
  const cy = Math.floor(ry);
  const face = [
    '..#...#..', // Augen: Dreiecke
    '.###.###.',
    '....#....', // Nase
    '#.......#', // Grinsen mit Zähnen
    '.##.#.##.',
    '..#####..',
  ];
  face.forEach((row, r) => {
    const y = cy + 2 - r;
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== '#') continue;
      const x = i - 4;
      // vorderste Voxel dieser Spalte aushöhlen und leuchten lassen
      let z = 12;
      while (z > -12 && !m.has(x, y, z)) z--;
      if (z <= -12) continue;
      m.set(x, y, z, null);
      glow.set(x, y, z, 0xffffff);
      m.set(x, y, z - 1, P.f1); // dahinter das dunkle Innere
    }
  });
  return { model: m, glow };
}

/** Laubhaufen: ein flacher Hügel aus buntem Herbstlaub (man kann hindurchlaufen). */
function buildLeafPile(seed) {
  const m = new VoxelModel();
  const colors = [P.f3, P.f4, P.f5, P.r3, P.e5, P.f6, P.r2, P.e6];
  m.ellipsoid(0, 0, 0, 10, 6, 8, (x, y, z, dx, dy) => {
    if (dy < 0) return null;
    const h = hash3(x, y, z, seed);
    if (dy > 0.55 && h < 0.25) return null; // lockere Kuppe
    return colors[Math.floor(h * colors.length)];
  });
  return m;
}

/** Treibholz: ein ausgebleichter Ast mit Seitenzweig, halb im Sand. */
function buildDriftwood(seed, length = 22) {
  const m = new VoxelModel();
  const bleach = (x, y, z) => {
    const h = hash3(x, y, z, seed);
    return h < 0.3 ? P.s6 : h < 0.75 ? P.s7 : P.e7;
  };
  m.box(0, 0, 0, length, 1, 1, bleach);
  m.box(length + 1, 0, 0, length + 3, 0, 1, bleach);
  m.line(Math.round(length * 0.6), 1, 1, Math.round(length * 0.6) + 5, 1, 5, P.s7);
  m.box(-2, 0, -1, 0, 2, 2, bleach); // Wurzelende
  return m;
}

/** Fackel am Wegrand (m12-r1, DESIGN 3.6): Pfahl mit umwickeltem Kopf; die Flamme ist ein eigenes Modell. */
function buildTorch(seed) {
  const m = new VoxelModel();
  m.box(-1, 0, -1, 0, 16, 0, (x, y, z) => (hash3(x, y, z, seed) < 0.3 ? P.e2 : P.e3));
  m.box(-2, 17, -2, 1, 19, 1, (x, y) => (y === 18 ? P.e5 : P.e2)); // umwickelter Kopf mit Band
  m.box(-1, 20, -1, 0, 20, 0, P.e1); // verkohlte Mitte
  return m;
}

function buildTorchFlame() {
  const m = new VoxelModel();
  m.box(-2, 21, -2, 1, 22, 1, (x, y, z) => ((x === -2 || x === 1) && (z === -2 || z === 1) ? null : 0xffffff));
  m.box(-1, 23, -1, 0, 24, 0, 0xffffff);
  m.set(-1, 25, 0, 0xffffff);
  return m;
}

function buildOakWithSwing(seed) {
  const m = buildDeciduous(seed, 1.3);
  // Starker Ast nach Osten – die Schaukel hängt als eigenes Teil daran (buildSwingTire)
  m.line(1, 16, 0, 12, 21, 0, P.e2, 1);
  return m;
}

/** Seile und Reifen der Schaukel, in denselben Koordinaten wie die Eiche (Aufhängung bei 10, 20, 0). */
function buildSwingTire() {
  const m = new VoxelModel();
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

function buildCrate(seed) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 4, 4, 4, (x, y, z) => {
    const edge = (x === 0 || x === 4) + (y === 0 || y === 4) + (z === 0 || z === 4) >= 2;
    return edge ? P.e3 : hash3(x, y, z, seed) < 0.3 ? P.e6 : P.e5;
  });
  return m;
}

/**
 * Schiefer Warnpfahl am Spawn: helles Brett mit rotem Kreuz, ein Fetzen Stoff,
 * oben eine alte Laterne (ihr Glas leuchtet nachts fahlgrün, siehe buildWarnLight).
 */
function buildWarnPost(seed, side) {
  const m = new VoxelModel();
  const lean = side > 0 ? 1 : -1;
  for (let y = 0; y <= 17; y++) m.box(y > 11 ? lean : 0, y, 0, (y > 11 ? lean : 0) + 1, y, 0, hash3(0, y, 0, seed) < 0.3 ? P.e2 : P.e3);
  // Brett mit rotem Kreuz
  for (let x = -3; x <= 4; x++) {
    for (let y = 11; y <= 16; y++) {
      const u = x - 0.5;
      const v = y - 13.5;
      const cross = Math.abs(u - v * 1.3) < 0.9 || Math.abs(u + v * 1.3) < 0.9;
      const edge = x === -3 || x === 4 || y === 11 || y === 16;
      m.set(x + lean, y, 1, cross ? (hash3(x, y, 2, seed) < 0.2 ? P.r2 : P.r3) : edge ? P.e5 : hash3(x, y, 1, seed) < 0.3 ? P.e7 : P.e8);
    }
  }
  // Laterne an einem Haken
  m.box(lean * 2, 18, 0, lean * 2 + 1, 18, 0, P.s3);
  m.box(lean * 2, 15, -1, lean * 2 + 1, 15, 0, P.s2);
  m.box(lean * 2, 19, -1, lean * 2 + 1, 19, 0, P.s2);
  // Fetzen und ein paar Steine am Fuß
  m.set(-lean, 10, 1, P.r2).set(-lean, 9, 1, P.r1).set(-lean * 2, 8, 1, P.r2).set(-lean * 2, 7, 1, P.r1);
  m.set(1, 0, 1, P.s5).set(-1, 0, -1, P.s4).set(0, 0, 2, P.s6).set(2, 0, 0, P.s5);
  return m;
}

/** Glas der Laterne am Warnpfahl. */
function buildWarnLight(side) {
  const lean = side > 0 ? 1 : -1;
  return new VoxelModel().box(lean * 2, 16, -1, lean * 2 + 1, 18, 0, 0xffffff);
}

/**
 * Steg in den See: Bretter quer, Pfähle an beiden Seiten, am Ende ein Poller
 * (dort macht Balduin fest). Länge in Voxeln entlang x, Breite entlang z.
 */
function buildDock(seed, length, width, bollards = []) {
  const m = new VoxelModel();
  const deck = 2; // Oberkante der Bretter (y)
  for (let x = 0; x < length; x++) {
    const gap = x % 5 === 4;
    for (let z = 0; z < width; z++) {
      const h = hash3(x, 0, z, seed);
      if (gap && h < 0.7) continue; // Fugen zwischen den Brettern
      const plank = hash3(x - (x % 5), 0, 0, seed + 3);
      if (plank > 0.93 && x > 8 && z > 2 && z < width - 3) continue; // ein fehlendes Brett
      m.set(x, deck, z, h < 0.12 ? P.e4 : plank < 0.5 ? P.e6 : P.e5);
      m.set(x, deck - 1, z, P.e3);
    }
  }
  // Pfähle alle 2 m, auf beiden Seiten
  for (let x = 2; x < length; x += 16) {
    for (const z of [-1, width]) {
      m.box(x, -2, z, x + 1, deck + 2, z, (xx, y) => (y > deck ? P.e4 : hash3(xx, y, z, seed) < 0.4 ? P.e2 : P.e3));
      m.set(x, deck + 3, z, P.e5);
    }
  }
  // Poller am Ende und ein Seil
  const px = length - 3;
  m.box(px, deck + 1, 1, px + 1, deck + 3, 2, P.s3);
  m.box(px - 1, deck + 3, 1, px + 2, deck + 3, 2, P.s4);
  m.box(px - 4, deck + 1, width - 3, px - 2, deck + 1, width - 2, P.e7);
  m.set(px - 3, deck + 2, width - 3, P.e8);
  // Weitere Poller an der Kante (M10: dort fliegt Balduins Leine hin)
  for (const [bx, bz] of bollards) {
    m.box(bx, deck + 1, bz, bx + 1, deck + 3, bz + 1, (x, y) => (y === deck + 1 ? P.s2 : P.s3));
    m.box(bx - 1, deck + 3, bz, bx + 2, deck + 3, bz + 1, P.s4);
  }
  return m;
}

/** Altes Ruderboot, kieloben am Strand angespült – mit Löchern im Rumpf (einmal Schrott). */
function buildWreck(seed) {
  const m = new VoxelModel();
  const L = 30;
  const W = 12;
  const rng = new Rng(seed);
  for (let x = 0; x < L; x++) {
    const t = x / (L - 1);
    // Bootsform von oben: schmales Heck (x = 0), breiteste Stelle vorn im ersten
    // Drittel, zum Bug lang und spitz – wie ein Ruderboot, nicht wie eine Kiste (m12-r1)
    const half = (W / 2) * (t < 0.35 ? 0.7 + 0.3 * Math.sin((t / 0.35) * (Math.PI / 2)) : Math.sqrt(Math.max(0, 1 - ((t - 0.35) / 0.65) ** 2)));
    if (half < 0.5) continue;
    for (let z = -Math.ceil(half); z < Math.ceil(half); z++) {
      const dz = Math.abs(z + 0.5) / half;
      if (dz > 1) continue;
      // Kieloben: die Rundung des Rumpfs zeigt nach oben
      const top = Math.round(5 - dz * dz * 3.2);
      // Planken längs des Rumpfs, abwechselnd hell und dunkel gestrichen, damit man
      // von oben das Boot erkennt (m12-r1: ein gesprenkeltes Rechteck hielt man für
      // eine Plane); die Farbe ist stellenweise abgeblättert (blankes Holz)
      const plank = Math.floor(Math.abs(z + 0.5));
      const keel = z === -1 && x > 1 && x < L - 4; // eine schmale Leiste auf dem Rücken
      for (let y = 0; y <= top + (keel ? 1 : 0); y++) {
        const outer = y >= top || dz > 0.82;
        if (!outer) continue;
        const h = hash3(x, y, z, seed);
        const bare = hash3(Math.floor(x / 5), 0, plank, seed + 5) > 0.86;
        let c = bare ? P.e6 : plank % 2 ? P.b3 : P.b4;
        if (keel) c = y > top ? P.e3 : P.e4; // Kiel: dunkle Leiste vom Heck zum Bug
        if (x === 0) c = P.e4; // flaches Heck
        if (y === 0 && dz > 0.82) c = P.s9; // weiß gestrichene Kante am Boden
        if (h > 0.985 && !keel) c = P.r2; // Rost an den Nägeln
        m.set(x + 1, y, z + W / 2, c);
      }
    }
  }
  // Löcher im Rumpf (dort sieht man hinein)
  for (let k = 0; k < 4; k++) {
    const hx = rng.int(4, L - 8);
    const hz = rng.int(2, W - 4);
    m.remove(hx, 1, hz, hx + rng.int(1, 3), 6, hz + 1);
  }
  // Ein Ruder und Tang
  m.line(-3, 0, W + 1, 8, 1, W + 2, P.e6);
  m.box(-4, 0, W + 1, -2, 0, W + 3, P.e7);
  for (let k = 0; k < 10; k++) m.set(rng.int(0, L), 0, rng.chance(0.5) ? -1 : W, rng.chance(0.5) ? P.g3 : P.t2);
  return m;
}

// --- Aufstellen -------------------------------------------------------------

/**
 * Stellt alle Requisiten auf.
 * @returns {{ group, fire, interactions, lights, emitters, blockers }}
 */
export function createProps({ seed, materials, colliders, map }) {
  // Die Requisiten der Bucht stehen fest; nur die Warnpfähle folgen den Spawns der Karte.
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
  colliders.addCircle(fire.x, fire.z, 0.92);
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

  // Bootswrack am Strand (einmal Schrott, Meilenstein 8/9) und eine Kiste daneben
  const wreck = LAYOUT.wreck;
  add(buildWreck(seed + 5), wreck.x - 2.0, wreck.z - 0.75, { occluder: true, name: 'Bootswrack' });
  colliders.addBox(wreck.x - 1.9, wreck.z - 0.7, wreck.x + 1.9, wreck.z + 0.7);
  block(wreck.x - 2.5, wreck.z - 1.0, wreck.x + 2.2, wreck.z + 1.2);
  interactions.push({ id: 'wrack', x: wreck.x, z: wreck.z, radius: 2.3, prompt: 'durchsuchen', search: 'wrack' });
  add(buildCrate(seed + 6), wreck.x - 3.25, wreck.z - 0.5, { name: 'Kiste' });
  colliders.addBox(wreck.x - 3.25, wreck.z - 0.5, wreck.x - 2.6, wreck.z + 0.15);

  // Steg in den See (Balduin legt hier an). Begehbar, eine Stufe hoch.
  const dock = LAYOUT.dock;
  const dockLen = Math.round((dock.x1 - dock.x0) / V);
  const dockWidth = Math.round((dock.z1 - dock.z0) / V);
  const bollard = LAYOUT.bollard;
  const bollardCell = [Math.round((bollard.x - dock.x0) / V) - 1, Math.round((bollard.z - dock.z0) / V) - 1];
  add(buildDock(seed + 19, dockLen, dockWidth, [bollardCell]), dock.x0, dock.z0, { name: 'Steg' });
  colliders.addCircle(bollard.x, bollard.z, 0.16, 'poller');
  const heightZones = [{ minX: dock.x0 + 0.5, maxX: dock.x1, minZ: dock.z0, maxZ: dock.z1, y: 3 * V }];

  // Leuchtmast am Steg: der alte Funkturm-Stumpf mit Trümmerteil (Juna baut ihn aus)
  const tower = LAYOUT.lighthouse;
  add(buildTower(seed + 7), tower.x, tower.z, { occluder: true, name: 'Funkturm' });
  for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) colliders.addCircle(tower.x + dx, tower.z + dz, 0.35);
  block(tower.x - 2, tower.z - 2, tower.x + 2.2, tower.z + 2);
  interactions.push({ id: 'turm', x: tower.x - 1.5, z: tower.z, radius: 1.8, prompt: 'ansehen', dialog: 'funkturm' });
  // Ausbaustufen (Juna, Meilenstein 6): anfangs versteckt, siehe setTowerStage
  const towerStages = [add(buildTowerRepair(seed + 7), tower.x, tower.z, { occluder: true, name: 'Funkturm-Leiter' }), add(buildTowerAntenna(), tower.x, tower.z, { occluder: true, name: 'Funkturm-Antenne' })];
  const beacon = add(buildTowerBeacon(), tower.x, tower.z, { occluder: true, name: 'Leuchtfeuer' });
  if (materials.beacon) beacon.add(createStaticVoxelObject(buildTowerBeaconGlass(), materials.beacon, { shadow: 'none', jitter: 0 }));
  towerStages.push(beacon);
  for (const o of towerStages) o.visible = false;
  const debris = LAYOUT.towerDebris;
  add(buildTowerDebris(seed + 8), debris.x, debris.z, { name: 'Turmteil' });
  block(debris.x - 0.1, debris.z - 0.1, debris.x + 2.7, debris.z + 0.9);

  // Warnpfähle an den Spawns: Hier kommt die Horde aus dem Wald (Lesbarkeit, DESIGN.md 0 Nr. 11)
  for (const spawn of map.spawns) {
    const path = map.paths.find((p) => p.feeder === spawn.name);
    if (!path) continue;
    const at = path.points.reduce((best, p) => (Math.abs(p.x + 50.5) < Math.abs(best.x + 50.5) ? p : best), path.points[0]);
    const x = Math.round(at.x * 8) / 8;
    for (const side of [-1, 1]) {
      const z = Math.round((at.z + side * (path.width / 2 + 0.75)) * 8) / 8;
      const post = add(buildWarnPost(seed + 30 + side, side), x, z, { name: 'Warnpfahl' });
      if (materials.spawnGlow) post.add(createStaticVoxelObject(buildWarnLight(side), materials.spawnGlow, { shadow: 'none', jitter: 0 }));
      colliders.addCircle(x + 0.0625, z, 0.2, 'warnpfahl');
    }
  }

  // Fackeln an den Wegen (m12-r1, DESIGN 3.6): nachts zeigen warme Lichtinseln den Weg.
  // Etwa alle 13 m, abwechselnd links und rechts, knapp neben dem Weg – nicht in der Bucht
  const torches = [];
  let torchFlames = null; // brennen nur nachts (world.js)
  for (const path of map.paths) {
    let run = path.feeder ? 9 : 4;
    for (let k = 1; k < path.points.length; k++) {
      const a = path.points[k - 1];
      const b = path.points[k];
      const seg = Math.hypot(b.x - a.x, b.z - a.z);
      run += seg;
      if (run < 13 || seg < 1e-3) continue;
      if (b.x > BAY.x0 - 1.5 || b.x < -54) continue;
      const side = torches.length % 2 ? 1 : -1;
      const off = path.width / 2 + 0.95;
      const x = Math.round((b.x - ((b.z - a.z) / seg) * off * side) * 8) / 8;
      const z = Math.round((b.z + ((b.x - a.x) / seg) * off * side) * 8) / 8;
      if (map.pathDistance(x, z) < 0.7 || torches.some((t) => Math.hypot(t.x - x, t.z - z) < 7)) continue;
      torches.push({ x, z });
      colliders.addCircle(x, z, 0.14, 'fackel');
      run = 0;
    }
  }
  if (torches.length) {
    const place = (geometry, material) => {
      const mesh = new THREE.InstancedMesh(geometry, material, torches.length);
      const m = new THREE.Matrix4();
      torches.forEach((t, i) => mesh.setMatrixAt(i, m.makeTranslation(t.x, 0, t.z)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.receiveShadow = true;
      mesh.name = 'Fackeln';
      group.add(mesh);
      return mesh;
    };
    place(buildTorch(seed + 80).toGeometry({ jitter: 0.03, seed, size: FINE, visibleOnly: true }), materials.world);
    if (materials.torchGlow) torchFlames = place(buildTorchFlame().toGeometry({ jitter: 0, ao: false, size: FINE, visibleOnly: true }), materials.torchGlow);
  }

  // Wegweiser am Hofeingang, Briefkasten
  const sign = LAYOUT.sign;
  add(buildSign(seed + 9), sign.x, sign.z, { name: 'Wegweiser' });
  colliders.addCircle(sign.x + 0.125, sign.z + 0.125, 0.2);
  interactions.push({ id: 'schild', x: sign.x, z: sign.z, radius: 1.4, prompt: 'lesen', dialog: 'schild' });
  const mail = LAYOUT.mailbox;
  add(buildMailbox(), mail.x, mail.z, { name: 'Briefkasten' });
  colliders.addCircle(mail.x, mail.z, 0.2);
  interactions.push({ id: 'briefkasten', x: mail.x, z: mail.z, radius: 1.2, prompt: 'nachsehen', dialog: 'briefkasten' });

  // Wäscheleine
  const cl = LAYOUT.clothesline;
  const span = Math.round((cl.x1 - cl.x0) / V);
  const laundry = buildClothesline(seed + 11, span);
  add(laundry.line, cl.x0, cl.z, { occluder: true, name: 'Wäscheleine' });
  for (const c of laundry.cloths) {
    const piece = createStaticVoxelObject(c.model, materials.laundry || materials.world, { seed });
    piece.position.set(cl.x0 + c.x * V, c.y * V, cl.z);
    piece.name = 'Wäsche';
    group.add(piece);
  }
  colliders.addCircle(cl.x0, cl.z, 0.15);
  colliders.addCircle(cl.x1, cl.z, 0.15);
  interactions.push({ id: 'waesche', x: (cl.x0 + cl.x1) / 2, z: cl.z, radius: 1.3, prompt: 'ansehen', dialog: 'waesche' });

  // Holzstapel an der Westwand des Hauses, Hackklotz, Regentonne, Beet
  const wp = LAYOUT.woodpile;
  add(buildWoodpile(seed + 12), wp.x, wp.z, { occluder: true, name: 'Holzstapel' });
  colliders.addBox(wp.x - 0.15, wp.z - 0.15, wp.x + 1.15, wp.z + 2.5);
  const cb = LAYOUT.choppingBlock;
  add(buildChoppingBlock(seed + 13), cb.x, cb.z, { name: 'Hackklotz' });
  const stuckAxe = add(buildStuckAxe(), cb.x, cb.z, { name: 'Axt' });
  colliders.addCircle(cb.x, cb.z, 0.32);
  const axeInteraction = { id: 'hackklotz', x: cb.x, z: cb.z, radius: 1.5, prompt: 'axtNehmen', action: 'takeAxe' };
  interactions.push(axeInteraction);
  const s = LAYOUT.shelter;
  const barrel = { x: s.x + s.width * V + 0.375, z: s.z + s.depth * V - 0.375 };
  const barrelObject = add(buildRainBarrel(seed + 14), barrel.x, barrel.z, { name: 'Regentonne' });
  const barrelInteraction = { id: 'regentonne', x: barrel.x, z: barrel.z, radius: 1.2, prompt: 'ansehen', dialog: 'regentonne', inside: false };
  let barrelCollider = colliders.addCircle(barrel.x, barrel.z, 0.33);
  interactions.push(barrelInteraction);
  const garden = LAYOUT.garden;
  add(buildGardenBed(seed + 15), garden.x, garden.z, { name: 'Beet' });
  colliders.addBox(garden.x, garden.z, garden.x + 2.0, garden.z + 1.5);
  interactions.push({ id: 'beet', x: garden.x + 1.0, z: garden.z + 1.5, radius: 1.3, prompt: 'ansehen', dialog: 'beet' });

  // Alte Eiche mit Reifenschaukel
  const oak = LAYOUT.oak;
  add(buildOakWithSwing(seed + 16), oak.x, oak.z, { occluder: true, name: 'Eiche' });
  colliders.addCircle(oak.x, oak.z, 0.45);
  colliders.addCircle(oak.x + 1.3, oak.z, 0.3);
  interactions.push({ id: 'schaukel', x: oak.x + 1.3, z: oak.z + 0.4, radius: 1.2, prompt: 'schaukeln', action: 'swing', flavor: true }); // tritt wie Nur-Anschauen zurück (m7-r1)
  // Die Schaukel schwingt um ihre Aufhängung am Ast (m12-r1: Kira – »Wiiiiieee!«, aber
  // Mika stand nur daneben). Alle Flächen, weil sie sich dreht; Schatten mit.
  const tireModel = buildSwingTire();
  const swingPivot = new THREE.Group();
  swingPivot.name = 'Schaukel';
  swingPivot.position.set(oak.x + 10 * V, 20 * V, oak.z);
  const tire = new THREE.Mesh(tireModel.toGeometry({ seed }), materials.world);
  tire.receiveShadow = true;
  const tireShadow = new THREE.Mesh(shadowGeometry(tireModel), SHADOW_PROXY_MATERIAL);
  tireShadow.castShadow = true;
  tireShadow.layers.set(SHADOW_LAYER);
  for (const o of [tire, tireShadow]) {
    o.position.set(-10 * V, -20 * V, 0);
    swingPivot.add(o);
  }
  group.add(swingPivot);
  // Mika steht auf dem unteren Rand des Reifens (von der Aufhängung aus gesehen)
  const swing = { pivot: swingPivot, seat: { x: 0, y: -16.6 * V, z: 0.12 }, stand: { x: oak.x + 1.3, z: oak.z + 0.85 } };

  // --- Herbst (M12): Kürbisse, Kürbislaternen, Laubhaufen, Treibholz ---
  const fine = (model, x, z, name, material = materials.world, shadow = 'full') => {
    const object = createStaticVoxelObject(model, material, { seed, size: FINE, shadow });
    object.position.set(x, 0, z);
    object.name = name;
    group.add(object);
    return object;
  };
  // Kürbislaternen links und rechts vor der Tür (nachts mit Lichtinsel, siehe world.js)
  const lanterns = [];
  for (const [x, z, k] of [[4.75, -3.75, 0], [7.5, -3.75, 1]]) {
    const jack = buildJackOLantern(seed + 40 + k);
    const object = fine(jack.model, x, z, 'Kürbislaterne');
    if (materials.pumpkinGlow) object.add(createStaticVoxelObject(jack.glow, materials.pumpkinGlow, { size: FINE, shadow: 'none', jitter: 0 }));
    colliders.addCircle(x, z, 0.26, 'kuerbis');
    lanterns.push({ x, z });
  }
  // Kürbisse am Beet und am Strand
  for (const [x, z, size, k] of [[0.5, -8.875, 1.0, 0], [1.0, -8.125, 0.7, 1], [0.375, -7.625, 0.8, 2], [6.375, 9.875, 0.9, 3]]) {
    fine(buildPumpkin(seed + 50 + k, size), x, z, 'Kürbis');
    colliders.addCircle(x, z, 0.12 + 0.13 * size, 'kuerbis');
  }
  // Laubhaufen unter der Eiche und hinter dem Holzstapel: zum Durchlaufen (Laub stiebt auf)
  const leafPiles = [];
  for (const [x, z, k] of [[-3.875, -12.0, 0], [2.25, -10.25, 1]]) {
    fine(buildLeafPile(seed + 60 + k), x, z, 'Laubhaufen', materials.world, 'none');
    leafPiles.push({ x, z, radius: 0.65, cooldown: 0 });
  }
  // Treibholz am Ufer
  fine(buildDriftwood(seed + 70), 12.5, 5.5, 'Treibholz', materials.world, 'none');
  fine(buildDriftwood(seed + 71, 16), 11.75, -11.0, 'Treibholz', materials.world, 'none');
  // Begehbar, aber nicht bebaubar (wie kleine Quellen): Laubhaufen und Treibholz
  const reserved = [...leafPiles.map((p) => ({ x: p.x, z: p.z })), { x: 13.0, z: 5.5 }, { x: 12.25, z: -11.0 }];

  // Sitzplätze der Krähen (M12): Pfosten, Briefkasten, Hackklotz, Beetrand, Steg und ein paar Stellen im Gras
  const perches = [
    { x: sign.x + 0.125, y: 2.5, z: sign.z + 0.125 },
    { x: mail.x + 0.0625, y: 1.5, z: mail.z },
    { x: cl.x0 + 0.0625, y: 1.875, z: cl.z + 0.0625 },
    { x: cl.x1 + 0.0625, y: 1.875, z: cl.z + 0.0625 },
    { x: cb.x - 0.19, y: 0.5, z: cb.z + 0.12 },
    { x: garden.x + 0.0625, y: 0.375, z: garden.z + 0.75 },
    { x: dock.x0 + 3.0, y: 0.375, z: dock.z0 + 0.2 },
    { x: dock.x0 + 6.25, y: 0.375, z: dock.z0 + 0.2 },
    ...[[-2.5, 3.5], [2.5, 5.75], [-4.25, -3.25], [9.25, 4.75], [-0.75, 6.5], [4.5, 1.5], [11.0, -3.0]].map(([x, z]) => ({ x, y: 0, z, ground: true })),
  ];

  return {
    swing,
    lanterns,
    leafPiles,
    reserved,
    perches,
    torches,
    torchFlames,
    group,
    interactions,
    blockers,
    heightZones,
    towerPos: { x: tower.x, z: tower.z },
    beaconPos: { x: LAYOUT.beacon.x, z: LAYOUT.beacon.z }, // wohin das Leuchtfeuer fällt
    /** Funkturm-Ausbau zeigen (0 = Stumpf, 3 = Leuchtfeuer). */
    setTowerStage(stage) {
      towerStages.forEach((o, k) => {
        o.visible = stage >= k + 1;
      });
    },
    /**
     * Die Regentonne steht an der Ecke der Notunterkunft – genau dort, wo die
     * Hütte ihren Anbau bekommt. Ab der Hütte verschwindet sie samt Kollision
     * und Einblendung (m3-r2: sie stand sonst unsichtbar im neuen Zimmer).
     */
    setHouseLevel(level) {
      const shown = level < 2;
      barrelObject.visible = shown;
      barrelInteraction.enabled = shown;
      if (!shown && barrelCollider) {
        colliders.remove(barrelCollider);
        barrelCollider = null;
      } else if (shown && !barrelCollider) {
        barrelCollider = colliders.addCircle(barrel.x, barrel.z, 0.33);
      }
    },
    axe: { object: stuckAxe, interaction: axeInteraction },
    fire: {
      frames: flameFrames,
      light: new THREE.Vector3(fire.x, 0.55, fire.z),
      smoke: new THREE.Vector3(fire.x - 0.06, 1.2, fire.z - 0.06),
      embers: new THREE.Vector3(fire.x - 0.06, 0.6, fire.z - 0.06),
    },
  };
}
