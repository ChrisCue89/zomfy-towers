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
import { FINE, shade, logX, logZ, stoneBlob } from './voxelKit.js';

// --- Modelle --------------------------------------------------------------------

// Seit M13 sind die Hof-Requisiten im feinen Maß (1/16 m): gleiche Maße wie
// vorher, Koordinaten verdoppelt, dazu Einzelheiten.

function buildCampfire(seed) {
  const m = new VoxelModel();
  // Steinkreis aus runden Feldsteinen, innen verrußt
  const rng = new Rng(seed);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rng.range(-0.12, 0.12);
    const cx = Math.cos(a) * 12;
    const cz = Math.sin(a) * 10.5;
    stoneBlob(m, cx, cz, rng.range(3.0, 4.0), rng.range(2.6, 3.6), rng.range(2.6, 3.4), seed + i);
  }
  m.forEach((x, y, z, c) => {
    if (x * x + z * z < 95 && y > 0 && hash3(x, y, z, seed + 1) < 0.7) m.set(x, y, z, shade(c, -2));
  });
  // Asche mit Glutnestern
  m.ellipsoid(0, 0, 0, 8.5, 1.5, 7.5, (x, y, z) => {
    if (y !== 0) return null;
    const h = hash3(x, y, z, seed + 2);
    return h < 0.08 ? P.f3 : h < 0.45 ? P.s3 : P.s2;
  });
  // Gekreuzte Scheite, zur Mitte hin verkohlt
  const logs = new VoxelModel();
  logX(logs, -8, 7, 3, 0, 2.6, seed + 3);
  logZ(logs, -8, 7, -2, 5.2, 2.4, seed + 4);
  logs.forEach((x, y, z, c) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    m.set(x, y, z, d < 3.5 ? (hash3(x, y, z, seed) < 0.3 ? P.f2 : P.s1) : d < 5 ? P.e1 : c);
  });
  return m;
}

function buildFlameFrame(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const FLAME = [P.f8, P.f7, P.f6, P.f5, P.f4];
  const best = new Map();
  // Drei bis fünf Zungen, unten hell, oben orange-rot, jede leicht geneigt
  const tongues = rng.int(3, 5);
  for (let t = 0; t < tongues; t++) {
    const bx = rng.range(-3, 2);
    const bz = rng.range(-3, 2);
    const h = rng.int(8, 17);
    const lean = rng.range(-0.25, 0.25);
    const w = rng.range(1.6, 2.6);
    for (let y = 0; y < h; y++) {
      const t01 = y / h;
      const r = w * (1 - t01 * 0.85);
      const cx = bx + lean * y;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        for (let z = Math.floor(bz - r); z <= Math.ceil(bz + r); z++) {
          if ((x + 0.5 - cx) ** 2 + (z + 0.5 - bz) ** 2 > r * r) continue;
          const rank = t01 < 0.25 ? 0 : t01 < 0.5 ? 1 : t01 < 0.75 ? 2 : t01 < 0.9 ? 3 : 4;
          const k = `${x},${y},${z}`;
          if (best.has(k) && best.get(k) <= rank) continue;
          best.set(k, rank);
          m.set(x, y + 6, z, FLAME[rank]);
        }
      }
    }
  }
  // Funken darüber
  for (let k = 0; k < 3; k++) if (rng.chance(0.6)) m.set(rng.int(-3, 2), rng.int(20, 26), rng.int(-3, 2), rng.chance(0.5) ? P.f6 : P.f4);
  return m;
}

/** Sitzstamm: halbierter Stamm, die helle Sitzfläche oben, Moos an der Rinde. */
function buildLogBench(seed, length = 14) {
  const m = new VoxelModel();
  logX(m, 0, length * 2 - 1, 4, 0, 4.4, seed, { moss: true });
  m.forEach((x, y, z) => {
    if (y > 7) m.set(x, y, z, null);
  });
  m.forEach((x, y, z, c) => {
    if (y !== 7 || x === 0 || x === length * 2 - 1) return;
    const h = hash3(x, 0, z, seed + 5);
    m.set(x, y, z, Math.abs(z + 0.5) > 2.6 ? P.e5 : h > 0.92 ? P.e6 : (x + Math.abs(z) * 3) % 11 === 0 ? P.e7 : P.e8);
  });
  return m;
}

/**
 * Ohrensessel mit Karomuster, Blick nach Westen zum Feuer: Die Kamera sieht
 * ihn von der Seite – hohe Lehne mit Ohr, runde Armlehne, Kissen, Füße.
 */
function buildArmchair(seed) {
  const m = new VoxelModel();
  const plaid = (x, y, z) => {
    const u = x + z;
    const lineU = u % 5 === 0;
    const lineY = y % 5 === 0;
    if (lineU && lineY) return P.r1;
    if (lineU || lineY) return P.r2;
    return hash3(x, y, z, seed) < 0.06 ? P.f3 : P.r3;
  };
  // Füße
  for (const [x, z] of [[1, 1], [12, 1], [1, 12], [12, 12]]) m.box(x, 0, z, x + 1, 1, z + 1, P.e2);
  m.box(0, 2, 0, 13, 7, 13, plaid); // Sitzkasten
  m.box(1, 8, 2, 11, 9, 11, (x, y) => (y === 9 ? P.e9 : P.e8)); // Sitzkissen
  m.box(2, 10, 3, 9, 10, 10, P.e9);
  m.box(12, 8, 0, 15, 24, 13, plaid); // Rückenlehne (Osten)
  m.box(12, 25, 1, 15, 25, 12, plaid);
  for (const z of [0, 1, 12, 13]) {
    m.box(0, 8, z, 11, 12, z, plaid); // Armlehnen
    m.box(0, 13, z, 9, 13, z, plaid);
    m.box(9, 16, z, 11, 23, z, plaid); // Ohren
    m.box(10, 24, z, 11, 24, z, plaid);
  }
  // Armlehnen vorn gerollt
  for (const z of [0, 1, 12, 13]) {
    m.set(0, 13, z, null).set(10, 13, z, P.r2).set(11, 13, z, P.r2);
    m.box(0, 10, z, 1, 12, z, P.r4);
  }
  // Kissen an der Lehne und eine Decke über der Armlehne
  m.box(10, 10, 4, 11, 15, 9, (x, y) => (y === 15 ? P.a4 : P.e9));
  m.box(3, 11, 12, 7, 13, 14, (x, y, z) => (z === 14 ? (y % 2 ? P.b3 : P.b4) : P.b3));
  m.box(4, 7, 14, 6, 10, 14, (x, y) => (y % 2 ? P.b3 : P.b4));
  return m;
}

/**
 * Leuchtmast am Stegende (früher Funkturm), M13 im feinen Maß: vier Beine aus
 * rot-weißen Bändern laufen nach oben zusammen, dazwischen Kreuzstreben, auf
 * halber Höhe eine Gitterplattform; unten Betonsockel mit Schrauben, eine Ranke
 * und der Schaltkasten mit Warnschild.
 */
function buildTower(seed) {
  const m = new VoxelModel();
  const legTops = [88, 80, 84, 74];
  const band = (y) => (Math.floor(y / 12) % 2 === 0 ? P.r3 : P.s8);
  for (let i = 0; i < 4; i++) {
    for (let y = 0; y <= legTops[i]; y++) {
      const [x, z] = towerLeg(i, y);
      const h = hash3(x, y, z, seed);
      const c = h < 0.12 ? P.r2 : band(y);
      m.box(x, y, z, x + 2, y, z + 2, (xx) => (xx === x ? shade(c, 1) : c));
    }
    // verbogene Spitze
    const [tx, tz] = towerLeg(i, legTops[i]);
    m.box(tx + (i % 2 ? 3 : -2), legTops[i] + 1, tz, tx + (i % 2 ? 4 : -1), legTops[i] + 2, tz + 1, P.r2);
  }
  // Kreuzstreben (X-Muster) je Seite
  const faces = [[0, 1], [2, 3], [0, 2], [1, 3]];
  for (const [a, b] of faces) {
    for (let y0 = 6; y0 < 68; y0 += 20) {
      const y1 = y0 + 20;
      const [ax0, az0] = towerLeg(a, y0);
      const [bx1, bz1] = towerLeg(b, y1);
      const [bx0, bz0] = towerLeg(b, y0);
      const [ax1, az1] = towerLeg(a, y1);
      m.line(ax0 + 1, y0, az0 + 1, bx1 + 1, y1, bz1 + 1, P.s3);
      m.line(bx0 + 1, y0, bz0 + 1, ax1 + 1, y1, az1 + 1, P.s4);
    }
  }
  // Plattform: Gitterrost
  const [px0, pz0] = towerLeg(0, 48);
  const [px1, pz1] = towerLeg(3, 48);
  m.box(px0, 48, pz0, px1 + 2, 48, pz1 + 2, (x, y, z) => ((x % 3 === 0 || z % 3 === 0) ? P.s3 : P.s5));
  // Betonsockel mit Schrauben
  for (const [x, z] of [[-24, -24], [22, -24], [-24, 22], [22, 22]]) {
    m.box(x - 2, 0, z - 2, x + 4, 3, z + 4, (xx, y, zz) => (y === 3 ? ((xx === x - 1 || xx === x + 3) && (zz === z - 1 || zz === z + 3) ? P.s4 : P.s7) : P.s6));
  }
  // Ranke an einem Bein
  for (let y = 0; y < 60; y++) {
    const [x, z] = towerLeg(2, y);
    if (hash3(0, y, 0, seed + 5) < 0.55) m.set(x - 1, y, z + (y % 5 < 2 ? 2 : 1), y % 7 === 0 ? P.g6 : P.g5);
    if (y % 9 === 4) m.set(x - 2, y, z + 2, P.g6).set(x - 2, y + 1, z + 2, P.g7);
  }
  // Schaltkasten mit Tür, Griff und gelbem Warnschild
  m.box(26, 0, 4, 33, 15, 12, (x, y, z) => (y === 15 ? P.s5 : z === 12 ? (x === 26 || x === 33 || y === 0 ? P.s3 : P.s4) : P.s3));
  m.box(28, 5, 13, 31, 7, 13, (x, y) => (y === 7 || x === 28 ? P.f6 : x === 30 && y === 6 ? P.s1 : P.f6));
  m.box(32, 9, 13, 32, 11, 13, P.s6);
  m.box(29, 16, 6, 30, 17, 10, P.s2);
  return m;
}

// --- Funkturm-Ausbau (Meilenstein 6, Juna) -------------------------------------------
// Gleiches Raster wie buildTower, fein (M13): Beine drei Voxel stark, von den
// Ecken ±1,5 m unten zu ±0,75 m oben (Höhe 92 feine Voxel).

const towerLeg = (i, y) => {
  const corners = [[-24, -24], [21, -24], [-24, 21], [21, 21]];
  const top = [[-12, -12], [9, -12], [-12, 9], [9, 9]];
  const t = y / 92;
  return [Math.round(corners[i][0] + (top[i][0] - corners[i][0]) * t), Math.round(corners[i][1] + (top[i][1] - corners[i][1]) * t)];
};

/** Stufe 1: Beine gerichtet, Leiter an der Südseite, Plattform oben mit Geländer. */
function buildTowerRepair(seed) {
  const m = new VoxelModel();
  const band = (y) => (Math.floor(y / 12) % 2 === 0 ? P.r4 : P.s9);
  for (let i = 0; i < 4; i++) {
    for (let y = 72; y <= 93; y++) {
      const [x, z] = towerLeg(i, y);
      m.box(x, y, z, x + 2, y, z + 2, band(y));
    }
  }
  // Leiter vor der Südseite: Holme und Sprossen
  for (let y = 2; y <= 93; y++) {
    const z = Math.round(22 + (10 - 22) * (y / 92)) + 5;
    m.set(-4, y, z, P.e4).set(3, y, z, P.e4);
    if (y % 5 === 0) m.box(-3, y, z, 2, y, z, P.e6);
  }
  // Plattform mit Geländer
  m.box(-12, 94, -12, 12, 94, 12, (x, y, z) => ((x + z) % 3 === 0 ? P.s4 : P.s5));
  for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) m.box(x, 95, z, x, 100, z, P.s3);
  m.box(-12, 100, 12, 12, 100, 12, P.s4).box(-12, 100, -12, -12, 100, 12, P.s3).box(12, 100, -12, 12, 100, 12, P.s3);
  m.box(-12, 97, 12, 12, 97, 12, P.s3);
  // frische Flicken am Fuß
  m.box(-4, 0, 24, 3, 1, 27, (x) => (x % 3 === 0 ? P.e4 : P.e5));
  return m;
}

/** Stufe 2: Antennenmast mit Querstreben, Schüssel und Kabel zum Schaltkasten. */
function buildTowerAntenna() {
  const m = new VoxelModel();
  m.box(-2, 96, -2, 1, 132, 1, (x, y) => (y % 8 < 4 ? P.r3 : P.s7));
  for (const y of [108, 120]) m.box(-10, y, -1, 9, y, 0, (x) => (x === -10 || x === 9 ? P.s4 : P.s6));
  // Schüssel mit Empfänger
  m.ellipsoid(6, 115, 3, 3.5, 3.5, 1.2, (x, y, z) => (z >= 3 ? P.s8 : P.s6));
  m.box(6, 115, 4, 6, 115, 6, P.s4).set(6, 115, 7, P.s3);
  m.line(10, 94, 10, 28, 16, 8, P.s1); // Kabel hinunter zum Schaltkasten
  m.line(-12, 94, 10, 26, 14, 10, P.s2);
  m.box(-2, 133, -2, 1, 134, 1, P.r4);
  return m;
}

/** Stufe 3: Leuchtfeuer oben auf dem Mast (Gehäuse; das Glas leuchtet separat). */
function buildTowerBeacon() {
  const m = new VoxelModel();
  m.box(-6, 135, -6, 5, 135, 5, P.s3); // Sockel
  for (const [x, z] of [[-6, -6], [5, -6], [-6, 5], [5, 5]]) m.box(x, 136, z, x, 143, z, P.s2);
  m.box(-6, 144, -6, 5, 144, 5, P.r3); // Dach
  m.box(-5, 145, -5, 4, 145, 4, P.r2);
  m.box(-3, 146, -3, 2, 146, 2, P.r3);
  m.box(-1, 147, -1, 0, 148, 0, P.f6);
  return m;
}

function buildTowerBeaconGlass() {
  const m = new VoxelModel();
  m.box(-5, 136, -5, 4, 143, 4, 0xffffff);
  return m;
}

/** Liegendes Turmstück: zwei rot-weiße Holme mit Streben, halb eingewachsen. */
function buildTowerDebris(seed) {
  const m = new VoxelModel();
  for (let x = 0; x <= 41; x++) {
    const c = x % 12 < 6 ? P.r3 : P.s8;
    m.box(x, 0, 0, x, 1, 1, c).box(x, 0, 12, x, 1, 13, c);
  }
  for (let x = 0; x <= 36; x += 12) {
    m.line(x, 1, 1, x + 12, 1, 12, P.s3);
    m.line(x + 12, 1, 1, x, 1, 12, P.s4);
  }
  m.forEach((x, y, z) => {
    if (y === 1 && hash3(x, 2, z, seed) < 0.3) m.set(x, 2, z, hash3(x, 3, z, seed) < 0.5 ? P.g5 : P.g6);
  });
  return m;
}

/** Wegweiser: Pfosten mit Spitze, drei Pfeilbretter mit geschnitzter Schrift und Nägeln. */
function buildSign(seed) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 3, 37, 3, (x, y, z) => (y % 9 === 0 ? P.e3 : x === 0 ? P.e5 : P.e4));
  m.box(1, 38, 1, 2, 39, 2, P.e4);
  const board = (y, dir, length) => {
    for (let i = 0; i < length; i++) {
      const x = dir > 0 ? 4 + i : -1 - i;
      const tip = length - 1 - i; // 0 = Spitze
      for (let yy = y; yy <= y + 5; yy++) {
        const v = yy - y;
        if (tip < 3 && (v < 3 - tip || v > 2 + tip)) continue; // Pfeilspitze
        const text = tip > 3 && i > 2 && (v === 2 || v === 3) && hash3(i, yy, dir, seed) < 0.6;
        const c = text ? P.e3 : v === 5 ? P.e8 : v === 0 ? P.e6 : P.e7;
        m.set(x, yy, 2, c).set(x, yy, 3, c);
      }
    }
    const nx = dir > 0 ? 5 : -2;
    m.set(nx, y + 2, 4, P.s5).set(nx, y + 3, 4, P.s5);
  };
  board(30, 1, 18);
  board(22, -1, 16);
  board(14, 1, 12);
  return m;
}

/** Briefkasten: blau, runder Deckel, Klappe vorn, rotes Fähnchen. */
function buildMailbox() {
  const m = new VoxelModel();
  m.box(0, 0, -1, 1, 16, 0, (x) => (x === 0 ? P.e5 : P.e4));
  m.box(-2, 17, -4, 3, 22, 3, (x, y, z) => (z === 3 ? (y === 17 ? P.b1 : P.b2) : x === -2 ? P.b4 : P.b3));
  m.box(-1, 23, -4, 2, 23, 3, (x) => (x < 1 ? P.b4 : P.b3));
  m.box(-1, 19, 4, 2, 20, 4, P.s6); // Griff der Klappe
  m.box(4, 18, -1, 4, 26, -1, P.s5); // Fähnchen
  m.box(4, 23, 0, 4, 26, 2, (x, y) => (y === 26 ? P.r4 : P.r3));
  return m;
}

function buildClothesline(seed, spanVoxels) {
  const m = new VoxelModel();
  const span = spanVoxels * 2;
  const pole = (x) => {
    m.box(x, 0, 0, x + 1, 29, 1, (xx) => (xx === x ? P.e5 : P.e4));
    m.box(x, 28, -2, x + 1, 29, 3, (xx, y) => (y === 29 ? P.e5 : P.e4));
  };
  pole(0);
  pole(span);
  const sag = (x) => 27 - Math.round(Math.sin((x / span) * Math.PI) * 3);
  for (let x = 2; x < span; x++) m.set(x, sag(x), 0, P.s7);
  const cloths = [];
  // Ein Stück Wäsche als Bild (Zeilen von oben): Buchstaben -> Farben
  const cloth = (x0, rows, colors) => {
    const piece = new VoxelModel();
    const anchor = sag(x0);
    rows.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) {
        const c = colors[row[i]];
        if (!c) continue;
        const x = x0 + i;
        piece.set(i, sag(x) - 1 - r - anchor, 0, c);
      }
    });
    // Klammern
    piece.set(1, sag(x0 + 1) - anchor, 1, P.e7).set(rows[0].length - 2, sag(x0 + rows[0].length - 2) - anchor, 1, P.e7);
    cloths.push({ model: piece, x: x0, y: anchor });
  };
  cloth(6, ['SSBBBWWBBBSS', 'SSBBBBBBBBSS', 'SSBBBBwBBBSS', 'SS.BBBBBB.SS', 'SS.BBBwBB.SS', 'ss.BBBBBB.ss', '...BBBwBB...', '...BBBBBB...', '...bbbbbb...'], { B: P.b3, b: P.b2, S: P.b4, s: P.b3, W: P.s9, w: P.s9 }); // Hemd mit Kragen und Knöpfen
  cloth(20, ['rr', 'rr', 'ww', 'rr', 'rr', 'rrr', 'rrr'], { r: P.r3, w: P.s9 }); // Ringelsocke
  cloth(24, ['oo', 'oo', 'yy', 'oo', 'oo', 'ooo', 'ooo'], { o: P.f5, y: P.f6 }); // Socke
  cloth(30, ['aaaaaaaaaa', 'aaaaaaaaaa', 'wwwwwwwwww', 'pppppppppp', 'aaaaaaaaaa', 'aaaaaaaaaa', 'aaaaaaaaaa', 'pppppppppp', 'wwwwwwwwww', 'aaaaaaaaaa', 'f.f.f.f.f.'], { a: P.a1, p: P.a0, w: P.a4, f: P.a4 }); // Handtuch mit Fransen
  cloth(44, ['dddddddd', 'eeeeeeee', 'eeeeeeee', 'eeeeeeee', 'eee..eee', 'eee..eee', 'eee..eee', 'eee..eee', 'eee..eee', 'ddd..ddd'], { e: P.e6, d: P.e4 }); // Hose
  return { line: m, cloths };
}

/** Holzstapel an der Hauswand: Scheite mit Hirnholz nach Süden, darüber ein Blechdach. */
function buildWoodpile(seed) {
  const m = new VoxelModel();
  const L = 37; // Scheite laufen entlang z, die Stirnseiten zeigen nach Süden
  for (let row = 0; row < 5; row++) {
    const y0 = row * 4;
    const shift = row % 2 ? 2 : 0;
    for (let k = 0; k < 4; k++) {
      const x0 = shift + k * 4;
      if (x0 + 3 > 16) continue;
      const len = L - (hash3(k, row, 0, seed) < 0.4 ? 1 : 0);
      for (let z = 0; z <= len; z++) {
        for (let dx = 0; dx < 4; dx++) {
          for (let dy = 0; dy < 4; dy++) {
            const corner = (dx === 0 || dx === 3) && (dy === 0 || dy === 3);
            if (corner) continue;
            const end = z === len;
            const bark = dx === 0 || dx === 3 || dy === 0 || dy === 3;
            let c;
            if (end) c = bark ? P.e4 : (dx + dy) % 3 === 0 ? P.e7 : P.e8;
            else c = bark ? (hash3(x0 + dx, y0 + dy, z, seed) < 0.4 ? P.e2 : P.e3) : P.e6;
            m.set(x0 + dx, y0 + dy, z, c);
          }
        }
      }
    }
  }
  // Blechdach auf zwei Pfosten
  m.box(-2, 22, -2, 17, 23, 39, (x, y, z) => (y === 22 ? P.s3 : z === 39 ? P.s6 : x % 3 === 2 ? P.s4 : P.s5));
  for (const z of [-2, 38]) m.box(16, 0, z, 17, 21, z + 1, (x) => (x === 16 ? P.e4 : P.e3));
  return m;
}

/** Hackklotz: Stammstück mit Rinde, oben Jahresringe und Kerben von der Axt. */
function buildChoppingBlock(seed) {
  const m = new VoxelModel();
  m.cylinder(0, 0, 0, 7, 6.2, (x, y, z) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    if (y === 7) {
      if (d > 5.3) return P.e3;
      if ((x === z || x === z + 1) && d > 1.5) return P.e5; // Kerbe
      const ring = Math.floor(d * 1.2) % 2;
      return d < 1 ? P.e6 : ring ? P.e7 : P.e8;
    }
    const a = Math.atan2(z + 0.5, x + 0.5);
    const groove = Math.floor((a / Math.PI) * 9 + 20) % 2 === 0;
    return groove ? P.e2 : hash3(x, y, z, seed) < 0.3 ? P.e4 : P.e3;
  });
  // Späne am Fuß
  for (const [x, z] of [[-7, 2], [6, -3], [4, 6], [-5, -6]]) m.set(x, 0, z, P.e8);
  return m;
}

/** Die Axt im Hackklotz – eigenes Modell, damit man sie herausnehmen kann. */
function buildStuckAxe() {
  const m = new VoxelModel();
  for (let t = 0; t <= 10; t++) {
    const x = 1 + Math.round(t * 0.62);
    m.box(x, 8 + t, 0, x, 8 + t, 1, t > 8 ? P.e4 : P.e6);
  }
  m.box(-3, 7, -1, 1, 9, 2, (x, y) => (x === -3 ? P.s8 : y === 9 ? P.s6 : P.s5)); // Kopf, Schneide im Holz
  m.box(-2, 10, 0, 0, 10, 1, P.s4);
  return m;
}

/** Regentonne: blaue Dauben, zwei Reifen, oben Wasser, unten ein Hahn. */
function buildRainBarrel(seed) {
  const m = new VoxelModel();
  m.cylinder(0, 0, 0, 13, 5.6, (x, y, z) => {
    if (y === 2 || y === 3 || y === 10 || y === 11) return y % 2 ? P.s5 : P.s4;
    const a = Math.atan2(z + 0.5, x + 0.5);
    const stave = Math.floor((a / Math.PI) * 8 + 16);
    if (Math.floor((a / Math.PI) * 8 * 3 + 48) % 3 === 0) return P.b1;
    return stave % 2 ? P.b3 : hash3(x, y, z, seed) < 0.15 ? P.b2 : P.b3;
  });
  m.cylinder(0, 0, 13, 13, 4.6, (x, y, z) => ((x + z) % 5 === 0 ? P.b5 : P.b4));
  m.box(-1, 3, 5, 0, 4, 6, P.s6); // Hahn
  return m;
}

/** Hochbeet: Bretterrahmen, Erde in Reihen, Kürbisse mit Ranken, Kohl und Möhrenkraut. */
function buildGardenBed(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  m.box(0, 0, 0, 31, 5, 23, (x, y, z) => {
    const frame = x <= 1 || x >= 30 || z <= 1 || z >= 22;
    if (frame) {
      if (y === 5) return (x + z) % 9 === 0 ? P.e4 : P.e6;
      return y === 2 ? P.e3 : z >= 22 ? (y < 2 ? P.e4 : P.e5) : P.e4;
    }
    if (y < 4) return P.e2;
    return z % 4 === 1 ? P.e1 : hash3(x, y, z, seed) < 0.5 ? P.e2 : P.e3; // Furchen
  });
  // Kürbisse mit Ranken und Blättern
  for (const [x, z, s] of [[8, 9, 0.8], [20, 15, 0.95], [25, 6, 0.7]]) {
    m.merge(buildPumpkin(seed + x, s), x, 5, z);
  }
  for (let x = 4; x <= 27; x++) {
    const z = 12 + Math.round(Math.sin(x * 0.5) * 2);
    if (!m.has(x, 5, z)) m.set(x, 5, z, P.g4);
    if (x % 4 === 0) m.box(x, 5, z + 1, x + 1, 5, z + 2, P.g5).set(x, 6, z + 1, P.g6);
  }
  // Kohlköpfe und Möhrenkraut
  for (const [x, z] of [[5, 18], [12, 19]]) {
    m.ellipsoid(x, 7, z, 2.6, 2, 2.4, (xx, y, zz, dx, dy) => (dy > 0.5 ? P.g7 : (xx + zz) % 3 === 0 ? P.g4 : P.g5));
  }
  for (let i = 0; i < 7; i++) {
    const x = 16 + i * 2;
    const z = 19 + (i % 2);
    const h = rng.int(2, 3);
    m.box(x, 5, z, x, 5 + h, z, P.g6).set(x, 6 + h, z, P.g8).set(x + 1, 5 + h, z, P.g7);
  }
  return m;
}

// --- Herbst (Meilenstein 12): im feinen Maß (1/16 m) --------------------------

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

/** Seile und Reifen der Schaukel, in denselben Koordinaten wie die Eiche (Aufhängung bei 20, 40, 0). */
function buildSwingTire() {
  const m = new VoxelModel();
  for (const z of [-2, 2]) {
    for (let y = 15; y <= 41; y++) m.set(20, y, z, y % 3 === 0 ? P.e7 : P.e8).set(21, y, z, y % 3 === 1 ? P.e7 : P.e8);
  }
  // Reifen: stehender Ring, Lauffläche mit Profil, oben ein heller Rand
  for (let x = 14; x <= 28; x++) {
    for (let y = 4; y <= 16; y++) {
      const d = Math.hypot(x + 0.5 - 21, y + 0.5 - 10);
      if (d > 5.6 || d < 3.2) continue;
      for (let z = -2; z <= 3; z++) {
        const tread = d > 4.8 && (x + y + z) % 3 === 0;
        m.set(x, y, z, y > 12 && d > 4.6 ? P.s3 : tread ? P.s2 : P.s1);
      }
    }
  }
  return m;
}

function buildCrate(seed) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 9, 9, 9, (x, y, z) => {
    const edge = (x <= 0 || x >= 9) + (y <= 0 || y >= 9) + (z <= 0 || z >= 9) >= 2;
    if (edge) return P.e3;
    if (z === 9 && y % 3 === 0) return P.e3; // Fugen vorn
    if (y === 9 && x % 3 === 0) return P.e4; // Fugen oben
    return hash3(x, y, z, seed) < 0.3 ? P.e6 : P.e5;
  });
  m.line(1, 1, 10, 8, 8, 10, P.e4); // Querstrebe vorn
  return m;
}

/**
 * Schiefer Warnpfahl am Spawn (M13 im feinen Maß): Pfahl mit Maserung, helles
 * Brett mit rot gemaltem Kreuz und Nägeln, ein flatternder Fetzen, oben eine
 * alte Laterne am Haken (ihr Glas leuchtet nachts fahlgrün, buildWarnLight),
 * ein paar Steine am Fuß.
 */
function buildWarnPost(seed, side) {
  const m = new VoxelModel();
  const lean = side > 0 ? 1 : -1;
  const off = (y) => (y > 22 ? lean * 2 : y > 16 ? lean : 0);
  for (let y = 0; y <= 35; y++) {
    const o = off(y);
    m.box(o, y, 0, o + 2, y, 1, (x) => (hash3(x, y, 0, seed) < 0.25 ? P.e2 : x === o ? P.e4 : P.e3));
  }
  // Brett mit rotem Kreuz
  for (let x = -6; x <= 9; x++) {
    for (let y = 22; y <= 33; y++) {
      const u = x - 1.5;
      const v = y - 27.5;
      const cross = Math.abs(u - v * 1.3) < 1.7 || Math.abs(u + v * 1.3) < 1.7;
      const edge = x === -6 || x === 9 || y === 22 || y === 33;
      let c = cross ? (hash3(x, y, 2, seed) < 0.2 ? P.r2 : P.r3) : edge ? P.e5 : hash3(x, y, 1, seed) < 0.3 ? P.e7 : P.e8;
      if (!cross && !edge && (y === 25 || y === 30) && hash3(x, 0, 3, seed) > 0.8) c = P.e6; // Maserung
      m.set(x + lean * 2, y, 2, c);
    }
  }
  m.set(-5 + lean * 2, 32, 3, P.s5).set(8 + lean * 2, 32, 3, P.s5).set(-5 + lean * 2, 23, 3, P.s5).set(8 + lean * 2, 23, 3, P.s5);
  // Laterne an einem Haken
  const lx = lean * 5;
  m.box(lx, 38, 0, lx + 3, 38, 0, P.s3); // Haken
  m.box(lx, 30, -2, lx + 3, 31, 1, P.s2); // Boden
  m.box(lx, 38, -2, lx + 3, 39, 1, (x, y) => (y === 39 ? P.s3 : P.s2)); // Dach
  for (const [x, z] of [[lx, -2], [lx + 3, -2], [lx, 1], [lx + 3, 1]]) m.box(x, 32, z, x, 37, z, P.s2);
  // Fetzen und ein paar Steine am Fuß
  for (let y = 14; y <= 21; y++) m.set(-lean * (2 + Math.floor((21 - y) / 3)), y, 2, y % 2 ? P.r2 : P.r1);
  for (const [x, z, r] of [[3, 3, 1.4], [-2, -2, 1.2], [0, 4, 1.1], [4, -1, 1.3]]) stoneBlob(m, x, z, r, 1.2, r, seed + x + z * 3);
  return m;
}

/** Glas der Laterne am Warnpfahl. */
function buildWarnLight(side) {
  const lean = side > 0 ? 1 : -1;
  const lx = lean * 5;
  return new VoxelModel().box(lx, 32, -2, lx + 3, 37, 1, 0xffffff);
}

/**
 * Steg in den See (M13 im feinen Maß): Bretter quer mit Fugen und Nägeln,
 * eines fehlt; Pfähle alle 2 m mit Algen, am Ende ein Poller mit einer
 * aufgeschossenen Leine. Länge und Breite kommen in groben Voxeln (1/8 m).
 */
function buildDock(seed, length, width, bollards = []) {
  const m = new VoxelModel();
  const L = length * 2;
  const Wd = width * 2;
  const deck = 5; // Oberkante der Bretter (y): Oberfläche bei 6/16 = 0,375 m
  for (let x = 0; x < L; x++) {
    const plank = Math.floor(x / 5);
    const u = x % 5;
    const missing = plank > 4 && hash3(plank, 0, 0, seed + 3) > 0.95;
    for (let z = 0; z < Wd; z++) {
      if (u === 4) continue; // Fuge (darunter das Wasser)
      if (missing && z > 4 && z < Wd - 5) continue;
      const r = hash3(plank, 1, 0, seed);
      let c = r < 0.3 ? P.e5 : r < 0.8 ? P.e6 : P.e7;
      if (hash3(x, 0, z, seed) > 0.94) c = shade(c, -1);
      if ((z === 2 || z === Wd - 3) && u === 1) c = P.s5; // Nägel über den Tragbalken
      m.set(x, deck, z, c);
      m.set(x, deck - 1, z, z === Wd - 1 ? P.e4 : P.e3);
    }
    // Tragbalken längs, vorn sichtbar
    m.set(x, deck - 2, Wd - 1, P.e2).set(x, deck - 2, 0, P.e2);
  }
  // Pfähle alle 2 m auf beiden Seiten, mit Algen am Wasser
  for (let x = 4; x < L; x += 32) {
    for (const z of [-2, Wd]) {
      m.box(x, -4, z, x + 2, deck + 4, z + 1, (xx, y) => {
        if (y > deck + 3) return P.e5;
        if (y <= 1) return hash3(xx, y, z, seed) < 0.5 ? P.g3 : P.t2;
        return xx === x ? P.e4 : hash3(xx, y, z, seed) < 0.4 ? P.e2 : P.e3;
      });
    }
  }
  // Poller am Ende und eine aufgeschossene Leine
  const px = L - 6;
  m.box(px, deck + 1, 2, px + 3, deck + 5, 5, (x) => (x === px ? P.s4 : P.s3));
  m.box(px - 1, deck + 6, 1, px + 4, deck + 6, 6, P.s4);
  m.box(px, deck + 7, 2, px + 3, deck + 7, 5, P.s5);
  for (let x = px - 11; x <= px - 3; x++) {
    for (let z = Wd - 9; z <= Wd - 2; z++) {
      const d = Math.hypot(x + 0.5 - (px - 7), z + 0.5 - (Wd - 5.5));
      if (d > 3.8 || d < 1.4) continue;
      m.set(x, deck + 1, z, Math.floor(d * 2) % 2 ? P.e7 : P.e8);
    }
  }
  // Weitere Poller an der Kante (M10: dort fliegt Balduins Leine hin)
  for (const [cbx, cbz] of bollards) {
    const bx = cbx * 2;
    const bz = cbz * 2;
    m.box(bx, deck + 1, bz, bx + 3, deck + 5, bz + 3, (x, y) => (y === deck + 1 ? P.s2 : x === bx ? P.s4 : P.s3));
    m.box(bx - 1, deck + 6, bz - 1, bx + 4, deck + 6, bz + 4, P.s4);
    m.box(bx, deck + 7, bz, bx + 3, deck + 7, bz + 3, P.s5);
  }
  return m;
}

/** Altes Ruderboot, kieloben am Strand angespült – mit Löchern im Rumpf (einmal Schrott). */
function buildWreck(seed) {
  const m = new VoxelModel();
  const L = 60;
  const W = 24;
  const rng = new Rng(seed);
  for (let x = 0; x < L; x++) {
    const t = x / (L - 1);
    // Bootsform von oben: schmales Heck (x = 0), breiteste Stelle vorn im ersten
    // Drittel, zum Bug lang und spitz – wie ein Ruderboot, nicht wie eine Kiste (m12-r1)
    const half = (W / 2) * (t < 0.35 ? 0.7 + 0.3 * Math.sin((t / 0.35) * (Math.PI / 2)) : Math.sqrt(Math.max(0, 1 - ((t - 0.35) / 0.65) ** 2)));
    if (half < 1) continue;
    for (let z = -Math.ceil(half); z < Math.ceil(half); z++) {
      const dz = Math.abs(z + 0.5) / half;
      if (dz > 1) continue;
      // Kieloben: die Rundung des Rumpfs zeigt nach oben
      const top = Math.round(10 - dz * dz * 6.4);
      // Planken längs des Rumpfs, abwechselnd hell und dunkel gestrichen, damit man
      // von oben das Boot erkennt; die Farbe ist stellenweise abgeblättert (blankes Holz)
      const plank = Math.floor(Math.abs(z + 0.5) / 2);
      const keel = (z === -1 || z === 0) && x > 3 && x < L - 8; // schmale Leiste auf dem Rücken
      for (let y = 0; y <= top + (keel ? 2 : 0); y++) {
        const outer = y >= top || dz > 0.86;
        if (!outer) continue;
        const h = hash3(x, y, z, seed);
        const bare = hash3(Math.floor(x / 10), 0, plank, seed + 5) > 0.86;
        let c = bare ? P.e6 : plank % 2 ? P.b3 : P.b4;
        if (keel) c = y > top ? P.e3 : P.e4; // Kiel: dunkle Leiste vom Heck zum Bug
        if (x <= 1) c = P.e4; // flaches Heck
        if (y <= 1 && dz > 0.86) c = P.s9; // weiß gestrichene Kante am Boden
        if (h > 0.99 && !keel) c = P.r2; // Rost an den Nägeln
        m.set(x + 2, y, z + W / 2, c);
      }
    }
  }
  // Löcher im Rumpf (dort sieht man hinein)
  for (let k = 0; k < 4; k++) {
    const hx = rng.int(8, L - 16);
    const hz = rng.int(4, W - 8);
    m.remove(hx, 2, hz, hx + rng.int(2, 5), 12, hz + 2);
  }
  // Ein Ruder und Tang
  m.line(-6, 0, W + 2, 16, 1, W + 4, P.e6);
  m.line(-6, 0, W + 3, 16, 1, W + 5, P.e5);
  m.box(-9, 0, W + 2, -5, 0, W + 6, P.e7);
  for (let k = 0; k < 20; k++) m.set(rng.int(0, L), 0, rng.chance(0.5) ? -1 : W, rng.chance(0.5) ? P.g3 : P.t2);
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

  // Seit M13 sind die Modelle im feinen Maß (Schatten grob); was noch grob ist, sagt size: V
  const add = (model, x, z, { turns = 0, occluder = false, name = '', size = FINE } = {}) => {
    const shadow = size === FINE ? 'coarse' : 'full';
    const object = createStaticVoxelObject(model, occluder ? materials.occluder : materials.world, { turns, seed, size, shadow });
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
    const frame = new THREE.Mesh(buildFlameFrame(seed + 100 + i).toGeometry({ jitter: 0, ao: false, visibleOnly: true, size: FINE }), materials.flame);
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
  if (materials.beacon) beacon.add(createStaticVoxelObject(buildTowerBeaconGlass(), materials.beacon, { shadow: 'none', jitter: 0, size: FINE }));
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
      if (materials.spawnGlow) post.add(createStaticVoxelObject(buildWarnLight(side), materials.spawnGlow, { shadow: 'none', jitter: 0, size: FINE }));
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
    const piece = createStaticVoxelObject(c.model, materials.laundry || materials.world, { seed, size: FINE });
    piece.position.set(cl.x0 + c.x * FINE, c.y * FINE, cl.z);
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
  add(buildOakWithSwing(seed + 16), oak.x, oak.z, { occluder: true, name: 'Eiche', size: V });
  colliders.addCircle(oak.x, oak.z, 0.45);
  colliders.addCircle(oak.x + 1.3, oak.z, 0.3);
  interactions.push({ id: 'schaukel', x: oak.x + 1.3, z: oak.z + 0.4, radius: 1.2, prompt: 'schaukeln', action: 'swing', flavor: true }); // tritt wie Nur-Anschauen zurück (m7-r1)
  // Die Schaukel schwingt um ihre Aufhängung am Ast (m12-r1: Kira – »Wiiiiieee!«, aber
  // Mika stand nur daneben). Alle Flächen, weil sie sich dreht; Schatten mit.
  const tireModel = buildSwingTire();
  const swingPivot = new THREE.Group();
  swingPivot.name = 'Schaukel';
  swingPivot.position.set(oak.x + 10 * V, 20 * V, oak.z);
  const tire = new THREE.Mesh(tireModel.toGeometry({ seed, size: FINE }), materials.world);
  tire.receiveShadow = true;
  const tireShadow = new THREE.Mesh(shadowGeometry(tireModel, 'full', FINE), SHADOW_PROXY_MATERIAL);
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
