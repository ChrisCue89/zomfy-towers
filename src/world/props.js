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
import { FINE, FINE32, shade, logX, logZ, stoneBlob, box2 } from './voxelKit.js';
import { buildRainBarrel, buildPumpkin, buildJackOLantern, buildLeafPile } from './decoModels.js';

// --- Modelle --------------------------------------------------------------------

// Seit M13g sind die Requisiten doppelt fein (1/32 m, gut 2 px je Voxel):
// gleiche Maße wie vorher, Koordinaten ×2 gegenüber 1/16. Farbrauschen bleibt
// grob (Paare von Voxeln); die neue Feinheit geht in Kanten, Fugen, Nägel,
// Maserung, Zeichen und Rundungen. Nur die Eiche bleibt im Maß 1/16 (Natur).

/**
 * Feuerstelle (M13g, 1/32 m): zwölf runde Feldsteine im Kreis, innen verrußt,
 * Asche mit Glutnestern, zwei gekreuzte Scheite – zur Mitte verkohlt, mit
 * glühenden Rissen.
 */
function buildCampfire(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + rng.range(-0.1, 0.1);
    stoneBlob(m, Math.cos(a) * 24, Math.sin(a) * 21, rng.range(5.6, 7.4), rng.range(5.0, 7.2), rng.range(5.0, 6.6), seed + i, undefined, { grain: 2 });
  }
  m.forEach((x, y, z, c) => {
    if (x * x + z * z < 390 && y > 0 && hash3(x >> 1, y >> 1, z >> 1, seed + 1) < 0.75) m.set(x, y, z, shade(c, -2));
  });
  // Asche mit Glutnestern, in der Mitte leicht gewölbt
  m.ellipsoid(0, 0, 0, 17, 3, 15, (x, y, z, dx, dy, dz) => {
    if (y < 0 || y > 1 || (y === 1 && dx * dx + dz * dz > 0.45)) return null;
    const h = hash3(x >> 1, 0, z >> 1, seed + 2);
    if (hash3(x, y, z, seed + 12) < 0.05) return P.f4;
    return h < 0.1 ? P.f3 : h < 0.45 ? P.s3 : P.s2;
  });
  const logs = new VoxelModel();
  logX(logs, -16, 15, 6, 0, 5.2, seed + 3, { seg: 10, ring: 1.4 });
  logZ(logs, -16, 15, -4, 10.4, 4.8, seed + 4, { seg: 10, ring: 1.4 });
  logs.forEach((x, y, z, c) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    let out = c;
    if (d < 7.5) {
      const crack = (x + y * 2 + z * 3) % 9 === 0 || hash3(x, y, z, seed + 5) < 0.06;
      out = crack ? (d < 4.5 ? P.f5 : P.f3) : hash3(x >> 1, y >> 1, z >> 1, seed) < 0.3 ? P.s2 : P.s1;
    } else if (d < 10.5) out = hash3(x >> 1, y, z >> 1, seed + 6) < 0.5 ? P.e1 : P.s1;
    m.set(x, y, z, out);
  });
  return m;
}

function buildFlameFrame(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const FLAME = [P.f8, P.f7, P.f6, P.f5, P.f4];
  const best = new Map();
  // Vier bis sechs Zungen, unten hell, oben orange-rot, jede leicht geneigt und gewellt
  const tongues = rng.int(4, 6);
  for (let t = 0; t < tongues; t++) {
    const bx = rng.range(-6, 4);
    const bz = rng.range(-6, 4);
    const h = rng.int(16, 34);
    const lean = rng.range(-0.25, 0.25);
    const w = rng.range(3.2, 5.4);
    const phase = rng.range(0, Math.PI * 2);
    for (let y = 0; y < h; y++) {
      const t01 = y / h;
      const r = w * (1 - t01 * 0.85);
      const cx = bx + lean * y + Math.sin(t01 * 4 + phase) * 1.2;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        for (let z = Math.floor(bz - r); z <= Math.ceil(bz + r); z++) {
          if ((x + 0.5 - cx) ** 2 + (z + 0.5 - bz) ** 2 > r * r) continue;
          const rank = t01 < 0.25 ? 0 : t01 < 0.5 ? 1 : t01 < 0.75 ? 2 : t01 < 0.9 ? 3 : 4;
          const k = `${x},${y},${z}`;
          if (best.has(k) && best.get(k) <= rank) continue;
          best.set(k, rank);
          m.set(x, y + 12, z, FLAME[rank]);
        }
      }
    }
  }
  // Funken darüber
  for (let k = 0; k < 5; k++) if (rng.chance(0.6)) m.set(rng.int(-6, 4), rng.int(40, 54), rng.int(-6, 4), rng.chance(0.5) ? P.f6 : P.f4);
  return m;
}

/** Sitzstamm (M13g, 1/32 m): halbierter Stamm, Sitzfläche mit Maserung längs, Rindenkante, Moos. */
function buildLogBench(seed, length = 14) {
  const m = new VoxelModel();
  const L = length * 4;
  logX(m, 0, L - 1, 8, 0, 8.8, seed, { moss: true, seg: 10, ring: 1.6 });
  m.forEach((x, y, z) => {
    if (y > 15) m.set(x, y, z, null);
  });
  m.forEach((x, y, z) => {
    if (y !== 15 || x === 0 || x === L - 1) return;
    const e = Math.abs(z + 0.5);
    let c;
    if (e > 6.4) c = P.e4; // Rindenkante
    else if (e > 5.4) c = P.e6; // Splintholz
    else {
      const grain = Math.floor(e * 1.2 + Math.sin(x * 0.16 + seed) * 0.9 + 4);
      c = grain % 3 === 0 ? P.e7 : P.e8;
      if (hash3(x >> 2, 0, z >> 1, seed + 5) > 0.95) c = P.e5; // Astloch
    }
    m.set(x, y, z, c);
  });
  return m;
}

/**
 * Ohrensessel mit Karomuster (M13g, 1/32 m), Blick nach Westen zum Feuer: hohe
 * Lehne mit Ohr, gerollte Armlehnen mit Paspel, Kissen mit Knopf, gedrechselte
 * Füße, eine gestrickte Decke über der Armlehne.
 */
function buildArmchair(seed) {
  const m = new VoxelModel();
  // Tartan: dunkle Doppelstreifen, dazwischen eine feine helle Linie
  const plaid = (x, y, z) => {
    const u = (x + z) % 10;
    const v = y % 10;
    const du = u < 2;
    const dv = v < 2;
    if (du && dv) return P.r1;
    if (du || dv) return P.r2;
    if (u === 6 || v === 6) return P.f3;
    return hash3(x >> 1, y >> 1, z >> 1, seed) < 0.05 ? P.r2 : P.r3;
  };
  for (const [x, z] of [[1, 1], [12, 1], [1, 12], [12, 12]]) box2(m, x, 0, z, x + 1, 1, z + 1, (xx, y) => (y === 2 ? P.e4 : xx % 2 ? P.e2 : P.e3));
  box2(m, 0, 2, 0, 13, 7, 13, plaid); // Sitzkasten
  m.paint(0, 5, 27, 27, 5, 27, P.r1); // Naht unter dem Sitz
  box2(m, 1, 8, 2, 11, 9, 11, (x, y, z) => (y === 19 ? (z === 5 || z === 22 ? P.e7 : P.e9) : P.e8)); // Sitzkissen mit Paspel
  box2(m, 2, 10, 3, 9, 10, 10, (x, y) => (y === 21 ? P.e9 : P.e8));
  m.set(11, 22, 13, P.e6).set(12, 22, 13, P.e6); // Knopf
  box2(m, 12, 8, 0, 15, 24, 13, plaid); // Rückenlehne (Osten)
  box2(m, 12, 25, 1, 15, 25, 12, plaid);
  for (const z of [0, 1, 12, 13]) {
    box2(m, 0, 8, z, 11, 12, z, plaid); // Armlehnen
    box2(m, 0, 13, z, 9, 13, z, plaid);
    box2(m, 9, 16, z, 11, 23, z, plaid); // Ohren
    box2(m, 10, 24, z, 11, 24, z, plaid);
  }
  // Armlehnen vorn gerollt, mit heller Paspel am Rand
  for (const z of [0, 1, 12, 13]) {
    box2(m, 0, 13, z, 0, 13, z, null);
    box2(m, 10, 13, z, 11, 13, z, P.r2);
    box2(m, 0, 10, z, 1, 12, z, (x, y, zz) => (y === 25 || x === 0 ? P.r4 : P.r3));
  }
  m.paint(2, 27, 0, 19, 27, 0, P.r4).paint(2, 27, 27, 19, 27, 27, P.r4); // Paspel oben auf den Armlehnen
  // Kissen an der Lehne, Blumenmuster
  box2(m, 10, 10, 4, 11, 15, 9, (x, y, z) => (y === 31 ? P.a4 : (x + y + z) % 7 === 0 ? P.a1 : P.e9));
  // Gestrickte Decke über der Armlehne: Rippen, Fransen
  box2(m, 3, 11, 12, 7, 13, 14, (x, y, z) => (z >= 28 ? ((x + (y >> 1)) % 3 === 0 ? P.b2 : y % 2 ? P.b3 : P.b4) : P.b3));
  box2(m, 4, 7, 14, 6, 10, 14, (x, y) => ((x + (y >> 1)) % 3 === 0 ? P.b2 : y % 2 ? P.b3 : P.b4));
  for (let x = 8; x <= 13; x += 2) m.set(x, 13, 29, P.b4).set(x, 12, 29, P.b3);
  return m;
}

/**
 * Leuchtmast am Stegende (früher Funkturm), M13g im Maß 1/32: vier Beine aus
 * rot-weißen Bändern mit Laschen laufen nach oben zusammen, dazwischen dünne
 * Kreuzstreben, auf halber Höhe ein Gitterrost; unten Betonsockel mit
 * Schrauben, eine Ranke und der Schaltkasten mit Lüftungsschlitzen und gelbem
 * Warnschild (schwarzer Blitz).
 */
function buildTower(seed) {
  const m = new VoxelModel();
  const legTops = [176, 160, 168, 148];
  const band = (y) => (Math.floor(y / 24) % 2 === 0 ? P.r3 : P.s8);
  for (let i = 0; i < 4; i++) {
    for (let y = 0; y <= legTops[i]; y++) {
      const [x, z] = towerLeg(i, y);
      const h = hash3(x >> 1, y >> 1, z >> 1, seed);
      const seamY = y % 24 === 0; // Stoß zwischen den Bändern
      const plate = y % 48 === 23 || y % 48 === 24; // Lasche mit Schrauben
      const c = seamY ? P.s3 : h < 0.1 ? P.r2 : band(y);
      m.box(x, y, z, x + 5, y, z + 5, (xx, yy, zz) => {
        if (plate) return (xx === x + 1 || xx === x + 4) && zz === z + 5 ? P.s7 : P.s4;
        return xx <= x + 1 ? shade(c, 1) : xx === x + 5 ? shade(c, -1) : c;
      });
    }
    // verbogene Spitze
    const [tx, tz] = towerLeg(i, legTops[i]);
    m.box(tx + (i % 2 ? 6 : -4), legTops[i] + 1, tz, tx + (i % 2 ? 9 : -1), legTops[i] + 4, tz + 3, P.r2);
  }
  // Kreuzstreben (X-Muster) je Seite, dünn wie Winkeleisen
  const faces = [[0, 1], [2, 3], [0, 2], [1, 3]];
  for (const [a, b] of faces) {
    for (let y0 = 12; y0 < 136; y0 += 40) {
      const y1 = y0 + 40;
      const [ax0, az0] = towerLeg(a, y0);
      const [bx1, bz1] = towerLeg(b, y1);
      const [bx0, bz0] = towerLeg(b, y0);
      const [ax1, az1] = towerLeg(a, y1);
      m.line(ax0 + 2, y0, az0 + 2, bx1 + 2, y1, bz1 + 2, P.s3, 1);
      m.line(bx0 + 2, y0, bz0 + 2, ax1 + 2, y1, az1 + 2, P.s4, 1);
    }
  }
  // Plattform: Gitterrost mit Rahmen
  const [px0, pz0] = towerLeg(0, 96);
  const [px1, pz1] = towerLeg(3, 96);
  m.box(px0, 96, pz0, px1 + 5, 97, pz1 + 5, (x, y, z) => (x === px0 || x === px1 + 5 || z === pz0 || z === pz1 + 5 ? P.s3 : y === 96 ? P.s2 : x % 3 === 0 || z % 3 === 0 ? P.s3 : P.s5));
  // Betonsockel mit Schrauben
  for (const [x, z] of [[-48, -48], [42, -48], [-48, 42], [42, 42]]) {
    m.box(x - 4, 0, z - 4, x + 9, 7, z + 9, (xx, y, zz) => {
      if (y === 7) return (xx === x - 2 || xx === x + 7) && (zz === z - 2 || zz === z + 7) ? P.s4 : P.s7;
      return hash3(xx >> 1, y >> 1, zz >> 1, seed + 3) < 0.15 ? P.s5 : P.s6;
    });
  }
  // Ranke an einem Bein, mit kleinen Blättern
  for (let y = 0; y < 120; y++) {
    const [x, z] = towerLeg(2, y);
    const wob = Math.round(Math.sin(y * 0.3) * 1.5);
    if (hash3(0, y, 0, seed + 5) < 0.7) m.set(x - 1 + wob, y, z + 6, P.g4);
    if (y % 7 === 3) m.set(x - 2 + wob, y, z + 6, P.g6).set(x - 3 + wob, y + 1, z + 6, P.g7).set(x - 2 + wob, y + 1, z + 6, P.g5);
  }
  // Schaltkasten mit Tür, Scharnieren, Griff, Lüftungsschlitzen und Warnschild
  m.box(52, 0, 8, 67, 31, 25, (x, y, z) => {
    if (y === 31) return P.s5;
    if (z === 25) {
      if (x === 52 || x === 67 || y === 0) return P.s2;
      if (x === 53 && (y === 6 || y === 24)) return P.s6; // Scharniere
      if (y >= 26 && y <= 28 && x >= 56 && x <= 63 && x % 2 === 0) return P.s1; // Lüftung
      return x === 53 ? P.s4 : P.s3;
    }
    return P.s3;
  });
  m.box(64, 17, 26, 65, 20, 26, P.s6); // Griff
  // Warnschild: gelbes Dreieck mit schwarzem Rand und Blitz
  const SIGN = ['.....#.....', '....#y#....', '...#ybb#...', '..#yybyy#..', '.#yybbyyy#.', '###########'];
  SIGN.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') m.set(55 + i, 22 - r, 26, row[i] === 'y' ? P.f6 : P.s1);
  });
  m.box(58, 32, 12, 61, 33, 20, P.s2);
  return m;
}

// --- Funkturm-Ausbau (Meilenstein 6, Juna) -------------------------------------------
// Gleiches Raster wie buildTower, doppelt fein (M13g): Beine sechs Voxel stark,
// von den Ecken ±1,5 m unten zu ±0,75 m oben (Höhe 184 Voxel à 1/32 m).

const towerLeg = (i, y) => {
  const corners = [[-48, -48], [42, -48], [-48, 42], [42, 42]];
  const top = [[-24, -24], [18, -24], [-24, 18], [18, 18]];
  const t = y / 184;
  return [Math.round(corners[i][0] + (top[i][0] - corners[i][0]) * t), Math.round(corners[i][1] + (top[i][1] - corners[i][1]) * t)];
};

/** Stufe 1: Beine gerichtet und frisch gestrichen, Leiter an der Südseite, Plattform oben mit Geländer. */
function buildTowerRepair(seed) {
  const m = new VoxelModel();
  const band = (y) => (Math.floor(y / 24) % 2 === 0 ? P.r4 : P.s9);
  for (let i = 0; i < 4; i++) {
    for (let y = 144; y <= 187; y++) {
      const [x, z] = towerLeg(i, y);
      m.box(x, y, z, x + 5, y, z + 5, (xx) => (xx <= x + 1 ? shade(band(y), 1) : band(y)));
    }
  }
  // Leiter vor der Südseite: Holme und Sprossen
  for (let y = 4; y <= 187; y++) {
    const z = Math.round(44 + (20 - 44) * (y / 184)) + 10;
    m.box(-8, y, z, -7, y, z, P.e4).box(6, y, z, 7, y, z, P.e4);
    if (y % 10 === 0) m.box(-6, y, z, 5, y, z, P.e6);
  }
  // Plattform mit Geländer
  m.box(-24, 188, -24, 24, 189, 24, (x, y, z) => (y === 188 ? P.s3 : (x + z) % 3 === 0 ? P.s4 : P.s5));
  for (const [x, z] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) m.box(x, 190, z, x + 1, 201, z + 1, P.s3);
  m.box(-24, 200, 24, 24, 201, 25, P.s4).box(-24, 200, -24, -23, 201, 24, P.s3).box(24, 200, -24, 25, 201, 24, P.s3);
  m.box(-24, 194, 24, 24, 194, 25, P.s3);
  // frische Flicken am Fuß
  m.box(-8, 0, 48, 7, 3, 55, (x) => (x % 6 === 0 ? P.e4 : P.e5));
  return m;
}

/** Stufe 2: Antennenmast mit Querstreben, Schüssel und Kabel zum Schaltkasten. */
function buildTowerAntenna() {
  const m = new VoxelModel();
  m.box(-4, 192, -4, 3, 264, 3, (x, y) => (y % 16 < 8 ? (x <= -3 ? P.r4 : P.r3) : x <= -3 ? P.s8 : P.s7));
  for (const y of [216, 240]) m.box(-20, y, -2, 19, y + 1, 1, (x) => (x <= -19 || x >= 18 ? P.s4 : P.s6));
  // Schüssel mit Empfänger
  m.ellipsoid(12, 230, 6, 7, 7, 2.4, (x, y, z) => (z >= 6 ? ((x + y) % 5 === 0 ? P.s7 : P.s8) : P.s6));
  m.box(12, 230, 8, 12, 230, 12, P.s4).box(11, 229, 13, 13, 231, 14, P.s3);
  m.line(20, 188, 20, 56, 32, 16, P.s1); // Kabel hinunter zum Schaltkasten
  m.line(-24, 188, 20, 52, 28, 20, P.s2);
  m.box(-4, 265, -4, 3, 268, 3, P.r4);
  return m;
}

/** Stufe 3: Leuchtfeuer oben auf dem Mast (Gehäuse; das Glas leuchtet separat). */
function buildTowerBeacon() {
  const m = new VoxelModel();
  m.box(-12, 270, -12, 11, 271, 11, P.s3); // Sockel
  for (const [x, z] of [[-12, -12], [10, -12], [-12, 10], [10, 10]]) m.box(x, 272, z, x + 1, 287, z + 1, P.s2);
  m.box(-12, 288, -12, 11, 289, 11, P.r3); // Dach
  m.box(-10, 290, -10, 9, 291, 9, P.r2);
  m.box(-6, 292, -6, 5, 293, 5, P.r3);
  m.box(-2, 294, -2, 1, 297, 1, P.f6);
  return m;
}

function buildTowerBeaconGlass() {
  const m = new VoxelModel();
  m.box(-10, 272, -10, 9, 287, 9, 0xffffff);
  return m;
}

/** Liegendes Turmstück (M13g, 1/32 m): zwei rot-weiße Holme mit dünnen Streben und Laschen, halb eingewachsen. */
function buildTowerDebris(seed) {
  const m = new VoxelModel();
  for (let x = 0; x <= 83; x++) {
    const c = x % 24 === 0 ? P.s3 : x % 24 < 12 ? P.r3 : P.s8;
    m.box(x, 0, 0, x, 3, 3, (xx, y) => (y === 3 ? shade(c, 1) : c)).box(x, 0, 24, x, 3, 27, (xx, y) => (y === 3 ? shade(c, 1) : c));
  }
  for (let x = 0; x <= 72; x += 24) {
    m.line(x, 2, 3, x + 24, 2, 24, P.s3, 1);
    m.line(x + 24, 2, 3, x, 2, 24, P.s4, 1);
  }
  const tufts = [];
  m.forEach((x, y, z) => {
    if (!m.has(x, y + 1, z) && hash3(x >> 1, 4, z >> 1, seed) < 0.3) tufts.push([x, y + 1, z]);
  });
  for (const [x, y, z] of tufts) m.set(x, y, z, hash3(x, 5, z, seed) < 0.5 ? P.g5 : P.g6);
  return m;
}

/**
 * Wegweiser (M13g, 1/32 m): gefaster Pfosten mit Kappe, drei Pfeilbretter mit
 * Nägeln. Oben ein gemalter Fisch und ein Häuschen (zum Fischerhaus am See),
 * links ein rot durchgestrichenes Brett (der Weg nach Moosbach ist gesperrt),
 * unten eingeritzte Zeichen.
 */
function buildSign(seed) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 7, 75, 7, (x, y, z) => {
    if ((x === 0 || x === 7) && (z === 0 || z === 7)) return null; // gefaste Kanten
    if (y % 18 === 0 && hash3(x, y, z, seed) < 0.7) return P.e3; // Risse
    if (x <= 1) return P.e5;
    return (x + (hash3(0, y >> 3, x, seed) > 0.7 ? 1 : 0)) % 3 === 0 ? P.e3 : P.e4;
  });
  m.box(1, 76, 1, 6, 77, 6, P.e4).box(2, 78, 2, 5, 79, 5, P.e5).box(3, 80, 3, 4, 80, 4, P.e5);
  const board = (y, dir, length, paint) => {
    for (let i = 0; i < length; i++) {
      const x = dir > 0 ? 8 + i : -1 - i;
      const tip = length - 1 - i; // 0 = Spitze
      for (let v = 0; v < 12; v++) {
        if (tip < 6 && (v < 5 - tip || v > 6 + tip)) continue; // Pfeilspitze
        let c = v === 11 ? P.e8 : v === 0 ? P.e5 : (v === 4 || v === 9) && hash3(i >> 2, v, y, seed) > 0.6 ? P.e6 : P.e7;
        const p = paint(i, v, tip);
        if (p) c = p;
        for (let z = 4; z <= 7; z++) m.set(x, y + v, z, z === 7 ? c : v === 11 ? P.e8 : P.e6);
      }
    }
    const nx = dir > 0 ? 10 : -3;
    m.set(nx, y + 3, 7, P.s6).set(nx, y + 8, 7, P.s6);
  };
  const FISH = ['#...####..', '##.######.', '#######.##', '##.######.', '#...####..'];
  const HOUSE = ['...#...', '..###..', '.#####.', '#######', '.#####.', '.##.##.', '.##.##.'];
  const at = (pattern, i, v, i0, v0) => {
    const row = pattern[pattern.length - 1 - (v - v0)];
    return row && i >= i0 && i - i0 < row.length && row[i - i0] === '#';
  };
  const carved = (i, v) => i >= 4 && (i - 4) % 4 < 3 && v >= 4 && v <= 7 && hash3(i, v, seed, 9) < 0.55;
  board(60, 1, 36, (i, v) => (at(FISH, i, v, 4, 3) ? P.b2 : at(HOUSE, i, v, 17, 2) ? P.r2 : null));
  board(44, -1, 32, (i, v, tip) => {
    if (tip > 6 && (Math.abs(i - 4 - v * 1.6) < 1.3 || Math.abs(i - 23 + v * 1.6) < 1.3)) return P.r3; // rotes Kreuz: gesperrt
    return tip > 6 && carved(i, v) ? P.e4 : null;
  });
  board(28, 1, 24, (i, v, tip) => (tip > 6 && carved(i, v) ? P.e4 : null));
  return m;
}

/** Briefkasten (M13g, 1/32 m): blau, runder Deckel, Klappe mit Rahmen, Namensschild und Griff, ein Brief schaut heraus, rotes Fähnchen. */
function buildMailbox() {
  const m = new VoxelModel();
  m.box(0, 0, -2, 3, 33, 1, (x, y) => (x === 0 ? P.e5 : y % 11 === 0 ? P.e3 : P.e4));
  m.box(-1, 30, -3, 4, 33, 2, (x, y) => (y === 33 ? P.e4 : P.e3)); // Halter
  m.box(-4, 34, -8, 7, 45, 7, (x, y, z) => {
    if (z === 7) {
      if (x === -4 || x === 7 || y === 34) return P.b1; // Rahmen der Klappe
      if (x >= -1 && x <= 4 && y >= 37 && y <= 39) return y === 38 && x > -1 && x < 4 ? P.s4 : P.s9; // Namensschild
      return y === 45 ? P.b3 : P.b2;
    }
    return x <= -3 ? P.b4 : P.b3;
  });
  // Deckel: halbe Tonne längs z
  for (let x = -4; x <= 7; x++) {
    const dx = (x + 0.5 - 2) / 6.2;
    const h = Math.round(Math.sqrt(Math.max(0, 1 - dx * dx)) * 4);
    for (let y = 46; y <= 45 + h; y++) {
      for (let z = -8; z <= 7; z++) m.set(x, y, z, z === 7 ? P.b1 : x < 0 ? P.b5 : y === 45 + h ? P.b4 : P.b3);
    }
  }
  m.box(0, 44, 8, 4, 46, 8, (x, y) => (y === 44 ? P.s7 : P.a4)); // Brief
  m.box(1, 41, 8, 2, 42, 8, P.s6); // Griff
  m.box(8, 36, -2, 9, 53, -1, (x) => (x === 8 ? P.s6 : P.s5)); // Fähnchen
  m.box(8, 46, 0, 9, 53, 5, (x, y) => (y === 53 ? P.r4 : y === 46 ? P.r2 : P.r3));
  return m;
}

function buildClothesline(seed, spanVoxels) {
  const m = new VoxelModel();
  const span = spanVoxels * 4;
  const pole = (x) => {
    m.box(x, 0, 0, x + 3, 59, 3, (xx, y) => (xx === x ? P.e5 : y % 13 === 0 ? P.e3 : P.e4));
    m.box(x - 1, 56, -4, x + 4, 59, 7, (xx, y, z) => (y === 59 ? P.e5 : z === 7 ? P.e3 : P.e4)); // Querholz
  };
  pole(0);
  pole(span);
  const sag = (x) => 54 - Math.round(Math.sin((x / span) * Math.PI) * 6);
  for (let x = 4; x < span; x++) m.set(x, sag(x), 1, (x >> 1) % 2 ? P.s7 : P.s8);
  const cloths = [];
  // Ein Stück Wäsche als Bild (Zeilen von oben): Buchstaben -> Farben
  const cloth = (x0, rows, colors) => {
    const piece = new VoxelModel();
    const anchor = sag(x0);
    rows.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) {
        const c = colors[row[i]];
        if (!c) continue;
        piece.set(i, sag(x0 + i) - 1 - r - anchor, 1, c);
      }
    });
    // Klammern (schmale Stücke hängen an einer)
    const pins = rows[0].length < 8 ? [rows[0].length >> 1] : [2, rows[0].length - 3];
    for (const i of pins) piece.set(i, sag(x0 + i) - anchor, 2, P.e7).set(i, sag(x0 + i) - anchor - 1, 2, P.e6);
    cloths.push({ model: piece, x: x0, y: anchor });
  };
  // Hemd mit Kragen, Knopfleiste, Brusttasche und Manschetten
  cloth(12, [
    'SSSSBBBBBWWWWWWBBBBBSSSS',
    'SSSSBBBBBBWWWWBBBBBBSSSS',
    'SSSS.BBBBBBppBBBBBB.SSSS',
    'SSSS.BBBBBBppBBBBBB.SSSS',
    'SSSS.BBBBBBooBddddB.SSSS',
    'SSSS.BBBBBBppBdBBdB.SSSS',
    'SSSS.BBBBBBppBddddB.SSSS',
    'cccc.BBBBBBooBBBBBB.cccc',
    'cccc.BBBBBBppBBBBBB.cccc',
    '.....BBBBBBppBBBBBB.....',
    '.....BBBBBBooBBBBBB.....',
    '.....BBBBBBppBBBBBB.....',
    '.....BBBBBBppBBBBBB.....',
    '.....BBBBBBooBBBBBB.....',
    '.....BBBBBBppBBBBBB.....',
    '.....BBBBBBppBBBBBB.....',
    '.....bBBBBBppBBBBBb.....',
    '......bbbbbbbbbbbb......',
  ], { B: P.b3, b: P.b2, S: P.b4, c: P.b2, p: P.b2, o: P.s9, d: P.b2, W: P.s9 });
  // Ringelsocke und Socke mit Ferse und Spitze
  cloth(40, ['wwww', 'wwww', 'rrrr', 'rrrr', 'wwww', 'rrrr', 'rrrr', 'wwww', 'rrrr', 'rrrr', 'hrrrrr', 'hrrrrr', 'rrrrtt', 'rrrrtt'], { r: P.r3, w: P.s9, h: P.r2, t: P.r2 });
  cloth(48, ['yyyy', 'oooo', 'oooo', 'yyyy', 'oooo', 'oooo', 'oooo', 'oooo', 'oooo', 'oooo', 'hooooo', 'hooooo', 'oooott', 'oooott'], { o: P.f5, y: P.f6, h: P.f4, t: P.f4 });
  // Handtuch mit Streifen und Fransen
  const towel = [];
  for (let r = 0; r < 22; r++) {
    const band = r < 4 ? 'a' : r < 6 ? 'w' : r < 8 ? 'p' : r < 14 ? 'a' : r < 16 ? 'p' : r < 18 ? 'w' : r < 20 ? 'a' : 'f';
    let row = '';
    for (let i = 0; i < 20; i++) row += band === 'f' ? (i % 2 ? '.' : 'f') : band === 'a' && (i + r) % 6 === 0 ? 'p' : band;
    towel.push(row);
  }
  cloth(60, towel, { a: P.a1, p: P.a0, w: P.a4, f: P.a4 });
  // Arbeitshose mit Bund, Gürtelschlaufen, Taschen, Knieflicken und Aufschlägen
  cloth(88, [
    'dddddddddddddddd',
    'ddlddddddddddldd',
    'ekkeeeeffeeeekke',
    'eekeeeeffeeeekee',
    'eeekeeeffeeekeee',
    'eeeeeeeffeeeeeee',
    'eeeeeeeffeeeeeee',
    'eeeeeeeeeeeeeeee',
    'eeeeeee..eeeeeee',
    'eeeeeee..eeeeeee',
    'eeeeeee..eeeeeee',
    'eeqqqee..eeeeeee',
    'eeqxqee..eeeeeee',
    'eeqqqee..eeeeeee',
    'eeeeeee..eeeeeee',
    'eeeeeee..eeeeeee',
    'eeeeeee..eeeeeee',
    'eeeeeee..eeeeeee',
    'ddddddd..ddddddd',
    'ddddddd..ddddddd',
  ], { d: P.e4, l: P.e3, e: P.e6, k: P.e5, f: P.e5, q: P.e7, x: P.e8 });
  return { line: m, cloths };
}

/**
 * Holzstapel an der Hauswand (M13g, 1/32 m): runde, halbe und geviertelte
 * Scheite, die Hirnholz-Seite mit Jahresringen, Rinde und Rissen nach Süden;
 * darüber ein Wellblechdach mit Schrauben und Rost an der Kante.
 */
function buildWoodpile(seed) {
  const m = new VoxelModel();
  const L = 75; // Scheite laufen entlang z, die Stirnseiten zeigen nach Süden
  for (let row = 0; row < 5; row++) {
    const y0 = row * 8;
    const shift = row % 2 ? 4 : 0;
    for (let k = 0; k < 4; k++) {
      const x0 = shift + k * 8;
      if (x0 + 7 > 32) continue;
      const h = hash3(k, row, 0, seed + 9);
      const kind = h < 0.55 ? 0 : h < 0.8 ? 1 : 2; // rund, halb, Viertel
      const flip = kind === 2 && hash3(k, row, 1, seed + 9) < 0.5;
      const len = L - (hash3(k, row, 0, seed) < 0.4 ? 2 : 0);
      // Querschnitt: Kern (Mark) und Abstand zur Rinde je Zelle
      const heart = kind === 0 ? [3.5, 3.5] : kind === 1 ? [3.5, 0] : [flip ? 7.5 : 0, 0];
      const radius = kind === 0 ? 4.1 : kind === 1 ? 4.6 : 8.2;
      for (let dx = 0; dx < 8; dx++) {
        for (let dy = 0; dy < 8; dy++) {
          const d = Math.hypot(dx + 0.5 - heart[0], dy + 0.5 - heart[1]);
          if (d > radius) continue;
          const barkRing = d > radius - 1.1 && !(kind === 1 && dy === 0) && !(kind === 2 && (dy === 0 || (flip ? dx === 7 : dx === 0)));
          for (let z = 0; z <= len; z++) {
            let c;
            if (z === len) {
              // Hirnholz: Ringe, ein Riss vom Kern nach außen
              const crack = kind === 0 && Math.abs(dx - dy) < 1 && d > 1 && hash3(k, row, 2, seed) < 0.6;
              c = barkRing ? P.e4 : crack ? P.e5 : d < 1 ? P.e6 : Math.floor(d * 0.8) % 2 ? P.e7 : P.e8;
            } else c = barkRing ? (hash3(x0 + dx, y0 + dy, z >> 2, seed) < 0.4 ? P.e2 : P.e3) : P.e6;
            m.set(x0 + dx, y0 + dy, z, c);
          }
        }
      }
    }
  }
  // Wellblechdach auf zwei Pfosten
  m.box(-4, 44, -4, 35, 45, 79, (x, y, z) => {
    if (y === 44) return P.s3;
    if (z === 79) return x % 4 === 2 ? P.s6 : hash3(x, 0, 0, seed + 3) < 0.25 ? P.r2 : P.s5; // Kante mit Rost
    if (x % 8 === 2 && z % 16 === 6) return P.s7; // Schrauben
    return [P.s4, P.s5, P.s6, P.s5][x & 3];
  });
  for (const z of [-4, 76]) m.box(32, 0, z, 35, 43, z + 3, (x, y) => (x === 32 ? P.e4 : y % 13 === 0 ? P.e2 : P.e3));
  return m;
}

/**
 * Hackklotz (M13g, 1/32 m): Stammstück mit Rindenplatten, oben Jahresringe als
 * feine Linien, ein Trockenriss und Kerben von der Axt; Späne am Fuß.
 */
function buildChoppingBlock(seed) {
  const m = new VoxelModel();
  const R = 12.4;
  m.cylinder(0, 0, 0, 15, R, (x, y, z) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    const a = Math.atan2(z + 0.5, x + 0.5);
    if (y === 15) {
      if (d > R - 1.3) return P.e3; // Rinde
      if (d > R - 2.3) return P.e6; // Splint
      if (Math.abs(a - 2.2) < 0.08 && d > 2) return P.e3; // Trockenriss
      if ((x === z || x === z + 1 || x === z - 1) && d > 3 && d < 9) return x === z ? P.e4 : P.e5; // Kerbe der Axt
      if ((x + z === -6 || x + z === -5) && d > 4 && d < 8) return P.e5;
      if (d < 1.3) return P.e5; // Mark
      return d % 2.6 < 0.8 ? P.e7 : P.e8; // Jahresringe
    }
    // Rinde: Platten mit tiefen Furchen, die Lichtseite (Westen) heller
    const u = (a / Math.PI) * 11 + 22 + (hash3(0, y >> 2, 0, seed) > 0.5 ? 0.5 : 0);
    const plate = Math.floor(u);
    const fx = u - plate;
    if (fx < 0.18) return P.e1;
    if (hash3(plate, y >> 2, 0, seed + 1) > 0.86 && y % 4 === 0) return P.e2; // Querriss
    const lit = x + 0.5 < -3;
    return lit ? (fx > 0.6 ? P.e5 : P.e4) : fx > 0.6 ? P.e4 : P.e3;
  });
  // Moos auf der Nordseite am Fuß
  m.forEach((x, y, z) => {
    if (y < 4 && z < -8 && hash3(x, y, z, seed + 2) < 0.45) m.set(x, y, z, y < 2 ? P.g4 : P.g5);
  });
  // Späne am Fuß: helle, schmale Splitter
  for (const [x, z, dx, dz] of [[-15, 4, 1, 0], [13, -6, 0, 1], [8, 12, 1, 1], [-10, -12, 1, 0], [15, 8, 0, 1], [-4, 14, 1, 0]]) {
    m.set(x, 0, z, P.e8).set(x + dx, 0, z + dz, P.e7);
  }
  return m;
}

/** Die Axt im Hackklotz (M13g, 1/32 m) – eigenes Modell, damit man sie herausnehmen kann. */
function buildStuckAxe() {
  const m = new VoxelModel();
  // Stiel schräg nach Osten, oben ein dunkler Knauf, dazwischen eine Lederwicklung
  for (let t = 0; t <= 21; t++) {
    const x = 2 + Math.round(t * 0.62);
    const y = 17 + t;
    const wrap = t >= 14 && t <= 18;
    const c = t > 19 ? P.e3 : wrap ? (t % 2 ? P.r1 : P.r2) : P.e7;
    m.box(x, y, 1, x + 1, y, 2, (xx, yy, zz) => (xx === x && !wrap && t <= 19 ? P.e8 : zz === 1 && !wrap && t <= 19 ? P.e6 : c));
  }
  m.box(15, 38, 0, 17, 39, 3, P.e3); // Knauf
  // Kopf: Keil mit breiter, heller Schneide; die Schneide steckt im Holz
  for (let x = -6; x <= 3; x++) {
    const y0 = x <= -4 ? 13 : x <= 0 ? 14 : 15;
    const y1 = x <= -4 ? 21 : x <= 0 ? 20 : 19;
    for (let y = y0; y <= y1; y++) {
      for (let z = 0; z <= 3; z++) {
        let c = y === y1 ? P.s6 : z === 3 ? P.s5 : P.s4;
        if (x <= -5) c = z === 3 || y === y1 ? P.s9 : P.s8; // geschliffene Schneide
        else if (x === -4) c = P.s7;
        if (x >= 2) c = y === y1 ? P.s4 : P.s3; // Nacken
        m.set(x, y, z, c);
      }
    }
  }
  return m;
}

/**
 * Hochbeet (M13g, 1/32 m): Bretterrahmen mit Fugen, Eckpfosten und Nägeln,
 * Erde in Furchen mit Krümeln, Kürbisse an einer Ranke mit Blättern,
 * Kohlköpfe aus Blattlagen, Möhrenkraut mit orangen Schultern.
 */
function buildGardenBed(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  m.box(0, 0, 0, 63, 11, 47, (x, y, z) => {
    const frame = x <= 3 || x >= 60 || z <= 3 || z >= 44;
    if (frame) {
      const corner = (x <= 3 || x >= 60) && (z <= 3 || z >= 44);
      if (corner) return y === 11 ? P.e3 : x === 0 || x === 60 ? P.e5 : P.e4;
      if (y === 11) return (x + z) % 18 === 0 ? P.e4 : P.e6;
      if (y === 5) return P.e3; // Fuge zwischen den Brettern
      if (z >= 44 && (x === 8 || x === 55) && (y === 2 || y === 8)) return P.s5; // Nägel
      return z >= 44 ? (hash3(x >> 3, y > 5 ? 1 : 0, 0, seed) < 0.4 ? P.e4 : P.e5) : P.e4;
    }
    if (y < 10) return P.e2;
    if (z % 8 === 2 || z % 8 === 3) return P.e1; // Furchen
    return hash3(x >> 1, y, z >> 1, seed) < 0.45 ? P.e2 : hash3(x, y, z, seed + 1) < 0.1 ? P.e4 : P.e3;
  });
  // Ranke mit Blättern, daran die Kürbisse
  for (let x = 8; x <= 55; x++) {
    const z = 24 + Math.round(Math.sin(x * 0.25) * 4);
    if (!m.has(x, 11, z)) m.set(x, 11, z, P.g4);
    if (x % 8 === 0) {
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) if (!((i === 0 || i === 4) && (j === 0 || j === 3))) m.set(x + i - 1, 11 + (i === 2 ? 1 : 0), z + 1 + j, i === 2 ? P.g6 : j < 2 ? P.g5 : P.g4);
    }
  }
  for (const [x, z, s] of [[16, 18, 0.8], [40, 30, 0.95], [50, 12, 0.7]]) m.merge(buildPumpkin(seed + x, s), x, 11, z);
  // Kohlköpfe aus Blattlagen
  for (const [x, z] of [[10, 36], [24, 38]]) {
    m.ellipsoid(x, 14, z, 5.2, 4, 4.8, (xx, y, zz, dx, dy) => {
      if (dy > 0.45 && dx * dx < 0.25) return y % 2 ? P.g7 : P.g8; // fester Kopf
      const leaf = Math.floor((Math.atan2(zz - z + 0.5, xx - x + 0.5) / Math.PI) * 3 + 3);
      if ((xx + zz + y) % 5 === 0) return P.g6; // Blattadern
      return leaf % 2 ? P.g4 : P.g5;
    });
  }
  // Möhrenkraut: gefiederte Stiele, am Boden die orange Schulter
  for (let i = 0; i < 7; i++) {
    const x = 32 + i * 4;
    const z = 38 + (i % 2) * 2;
    const h = rng.int(4, 6);
    m.box(x, 10, z, x + 1, 10, z + 1, P.f4);
    m.box(x, 11, z, x, 10 + h, z, P.g6);
    m.set(x - 1, 9 + h, z, P.g7).set(x + 1, 10 + h, z, P.g7).set(x, 11 + h, z, P.g8).set(x + 1, 8 + h, z, P.g6).set(x - 1, 7 + h, z, P.g6);
  }
  return m;
}

// --- Herbst (Meilenstein 12): im feinen Maß (1/16 m) --------------------------

/** Treibholz (M13g, 1/32 m): ausgebleichter Ast mit Maserung, Astloch und Seitenzweig, halb im Sand. */
function buildDriftwood(seed, length = 22) {
  const m = new VoxelModel();
  const L = length * 2;
  const bleach = (x, y, z) => {
    if ((z + (x >> 3)) % 3 === 0 && y > 0) return P.s6; // Maserung längs
    const h = hash3(x >> 1, y, z >> 1, seed);
    return h < 0.25 ? P.s6 : h < 0.75 ? P.s7 : P.e7;
  };
  for (let x = 0; x <= L; x++) {
    const r = 2.2 - (x / L) * 0.8 + Math.sin(x * 0.3) * 0.2;
    for (let y = 0; y <= Math.round(r * 1.2); y++) for (let z = Math.round(1.5 - r); z <= Math.round(1.5 + r); z++) m.set(x, y, z, bleach(x, y, z));
  }
  m.box(L + 1, 0, 1, L + 6, 0, 2, bleach); // Spitze
  m.box(Math.round(L * 0.35), 3, 1, Math.round(L * 0.35) + 1, 3, 2, P.e4); // Astloch
  m.line(Math.round(L * 0.6), 1, 3, Math.round(L * 0.6) + 10, 1, 11, P.s7, 1); // Seitenzweig
  m.box(-4, 0, -2, 0, 4, 4, bleach); // Wurzelende
  m.set(-5, 2, -1, P.s6).set(-6, 3, -2, P.s6).set(-5, 0, 5, P.s6).set(-6, 0, 6, P.s6);
  return m;
}

/** Fackel am Wegrand (M13g, 1/32 m): Pfahl mit Maserung, Kopf mit Schnur umwickelt; die Flamme ist ein eigenes Modell. */
function buildTorch(seed) {
  const m = new VoxelModel();
  m.box(-2, 0, -2, 1, 33, 1, (x, y, z) => (hash3(x, y >> 2, z, seed) < 0.3 ? P.e2 : x === -2 ? P.e4 : P.e3));
  m.box(-4, 34, -4, 3, 39, 3, (x, y, z) => ((x === -4 || x === 3) && (z === -4 || z === 3) ? null : y === 36 || y === 37 ? P.e6 : (x + y) % 3 === 0 ? P.e3 : P.e2)); // umwickelter Kopf mit Band
  m.box(-2, 40, -2, 1, 40, 1, P.e1); // verkohlte Mitte
  m.set(-3, 40, 0, P.s1).set(2, 40, -1, P.s1);
  return m;
}

function buildTorchFlame() {
  const m = new VoxelModel();
  m.box(-4, 41, -4, 3, 44, 3, (x, y, z) => ((x === -4 || x === 3) && (z === -4 || z === 3) ? null : 0xffffff));
  m.box(-3, 45, -3, 2, 47, 2, (x, y, z) => ((x === -3 || x === 2) && (z === -3 || z === 2) ? null : 0xffffff));
  m.box(-2, 48, -1, 1, 49, 0, 0xffffff);
  m.set(-2, 50, 0, 0xffffff).set(-2, 51, 0, 0xffffff);
  return m;
}

function buildOakWithSwing(seed) {
  const m = buildDeciduous(seed, 1.3);
  // Starker Ast nach Osten – die Schaukel hängt als eigenes Teil daran (buildSwingTire)
  m.line(2, 32, -2, 26, 44, -2, P.e2, 4);
  m.line(2, 33, -1, 26, 45, -1, P.e3, 2);
  return m;
}

/** Seile und Reifen der Schaukel (M13g, 1/32 m), in denselben Koordinaten wie die Eiche ×2 (Aufhängung bei 40, 80, 0). */
function buildSwingTire() {
  const m = new VoxelModel();
  // Zwei gedrehte Seile
  for (const z of [-4, 5]) {
    for (let y = 31; y <= 83; y++) m.set(41, y, z, y % 4 < 2 ? P.e7 : P.e8).set(42, y, z, y % 4 < 2 ? P.e8 : P.e6);
  }
  // Knoten am Reifen
  for (const z of [-4, 5]) m.box(40, 30, z - 1, 43, 32, z + 1, P.e6);
  // Reifen: stehender Ring, Lauffläche mit Profil, Flanke mit Schrift-Wulst
  for (let x = 28; x <= 56; x++) {
    for (let y = 8; y <= 32; y++) {
      const d = Math.hypot(x + 0.5 - 42, y + 0.5 - 20);
      if (d > 11.2 || d < 6.4) continue;
      for (let z = -4; z <= 7; z++) {
        const flank = z === 7 || z === -4;
        const tread = !flank && d > 9.8 && ((x >> 1) + (y >> 1) + z) % 3 === 0;
        let c = tread ? P.s2 : P.s1;
        if (flank && d > 8.2 && d < 9.4 && Math.floor(Math.atan2(y + 0.5 - 20, x + 0.5 - 42) * 5) % 2 === 0) c = P.s2; // Wulst
        if (y > 25 && d > 9.6) c = P.s3; // oben ein heller Rand
        m.set(x, y, z, c);
      }
    }
  }
  return m;
}

/** Kiste (M13g, 1/32 m): Rahmen, Bretter mit Fugen und Nägeln, Querstrebe, ein gemalter Fisch. */
function buildCrate(seed) {
  const m = new VoxelModel();
  const N = 19;
  m.box(0, 0, 0, N, N, N, (x, y, z) => {
    const edge = (x <= 1 || x >= N - 1) + (y <= 1 || y >= N - 1) + (z <= 1 || z >= N - 1) >= 2;
    if (edge) return (x + y + z) % 5 === 0 ? P.e2 : P.e3;
    if (z === N && y % 6 === 0) return P.e3; // Fugen vorn
    if (y === N && x % 6 === 0) return P.e4; // Fugen oben
    const board = z === N ? Math.floor(y / 6) : Math.floor(x / 6);
    return hash3(board, 0, 0, seed) < 0.35 ? P.e6 : hash3(x, y >> 2, z, seed + 1) < 0.1 ? P.e4 : P.e5;
  });
  m.line(2, 2, N + 1, N - 2, N - 2, N + 1, P.e4, 0); // Querstrebe vorn
  m.line(3, 2, N + 1, N - 1, N - 2, N + 1, P.e4, 0);
  for (const [x, y] of [[2, 3], [N - 2, 3], [2, N - 3], [N - 2, N - 3]]) m.set(x, y, N + 1, P.s5);
  // gemalter Fisch oben auf dem Deckel
  for (const [x, z] of [[6, 8], [7, 7], [7, 9], [8, 7], [8, 8], [8, 9], [9, 7], [9, 8], [9, 9], [10, 8], [11, 7], [11, 9]]) m.set(x, N, z, P.b2);
  return m;
}

/**
 * Schiefer Warnpfahl am Spawn (M13g, 1/32 m): Pfahl mit Maserung, Brett aus
 * Latten mit rot gemaltem Kreuz, das verlaufen ist, Nägeln, ein flatternder
 * Fetzen, oben eine alte Laterne am Haken (ihr Glas leuchtet nachts fahlgrün,
 * buildWarnLight), ein paar Steine am Fuß.
 */
function buildWarnPost(seed, side) {
  const m = new VoxelModel();
  const lean = side > 0 ? 1 : -1;
  const off = (y) => (y > 44 ? lean * 4 : y > 32 ? lean * 2 : 0);
  for (let y = 0; y <= 71; y++) {
    const o = off(y);
    m.box(o, y, 0, o + 5, y, 3, (x) => (hash3(x, y >> 2, 0, seed) < 0.25 ? P.e2 : x <= o + 1 ? P.e4 : P.e3));
  }
  // Brett aus Latten mit rotem Kreuz, die Farbe ist nach unten verlaufen
  for (let x = -12; x <= 19; x++) {
    for (let y = 44; y <= 67; y++) {
      const u = x - 3.5;
      const v = y - 55.5;
      const cross = Math.abs(u - v * 1.3) < 3.2 || Math.abs(u + v * 1.3) < 3.2;
      const drip = !cross && hash3(x, 0, 5, seed) < 0.3 && y < 50 && (Math.abs(u - (y + 6 - 55.5) * 1.3) < 3.2 || Math.abs(u + (y + 6 - 55.5) * 1.3) < 3.2);
      const edge = x === -12 || x === 19 || y === 44 || y === 67;
      let c = cross ? (hash3(x >> 1, y >> 1, 2, seed) < 0.2 ? P.r2 : P.r3) : drip ? P.r2 : edge ? P.e5 : (x + 12) % 8 === 0 ? P.e5 : hash3(x >> 1, y >> 1, 1, seed) < 0.3 ? P.e7 : P.e8;
      m.set(x + lean * 4, y, 4, c).set(x + lean * 4, y, 5, c);
    }
  }
  for (const [x, y] of [[-10, 65], [17, 65], [-10, 46], [17, 46]]) m.set(x + lean * 4, y, 6, P.s5);
  // Laterne an einem Haken: Stange mit Arm, Boden, Dach mit Spitze, vier Eckstäbe
  const lx = lean * 10;
  const rod = lean * 4 + 2;
  m.box(rod, 72, 1, rod + 1, 86, 2, P.s2);
  m.box(Math.min(rod, lx + 3), 86, 1, Math.max(rod + 1, lx + 4), 87, 2, P.s2);
  m.box(lx + 3, 83, 1, lx + 4, 85, 2, P.s3); // Haken
  m.box(lx, 60, -4, lx + 7, 63, 3, P.s2); // Boden
  m.box(lx, 76, -4, lx + 7, 78, 3, (x, y) => (y === 78 ? P.s3 : P.s2)); // Dach
  m.box(lx + 2, 79, -2, lx + 5, 80, 1, P.s3).box(lx + 3, 81, -1, lx + 4, 82, 0, P.s4);
  for (const [x, z] of [[lx, -4], [lx + 7, -4], [lx, 3], [lx + 7, 3]]) m.box(x, 64, z, x, 75, z, P.s2);
  // Fetzen und ein paar Steine am Fuß
  for (let y = 28; y <= 43; y++) {
    const x = -lean * (4 + Math.floor((43 - y) / 6) * 2);
    m.set(x, y, 4, y % 4 < 2 ? P.r2 : P.r1).set(x - lean, y, 4, y % 4 < 2 ? P.r1 : P.r2);
  }
  for (const [x, z, r] of [[6, 6, 2.8], [-4, -4, 2.4], [0, 8, 2.2], [8, -2, 2.6]]) stoneBlob(m, x, z, r, 2.4, r, seed + x + z * 3, undefined, { grain: 2 });
  return m;
}

/** Glas der Laterne am Warnpfahl. */
function buildWarnLight(side) {
  const lean = side > 0 ? 1 : -1;
  const lx = lean * 10;
  return new VoxelModel().box(lx + 1, 64, -3, lx + 6, 75, 2, 0xffffff);
}

/**
 * Steg in den See (M13g, 1/32 m): Bretter quer mit Fugen, Maserung, Nägeln
 * über den Tragbalken und ausgetretener Mitte, eines fehlt; Pfähle alle 2 m
 * mit Algen, am Ende ein Poller mit einer aufgeschossenen Leine. Länge und
 * Breite kommen in groben Voxeln (1/8 m).
 */
function buildDock(seed, length, width, bollards = []) {
  const m = new VoxelModel();
  const L = length * 4;
  const Wd = width * 4;
  const deck = 11; // Oberkante der Bretter (y): Oberfläche bei 12/32 = 0,375 m
  for (let x = 0; x < L; x++) {
    const plank = Math.floor(x / 10);
    const u = x % 10;
    const missing = plank > 4 && hash3(plank, 0, 0, seed + 3) > 0.95;
    for (let z = 0; z < Wd; z++) {
      if (u === 9) continue; // Fuge (darunter das Wasser)
      if (missing && z > 9 && z < Wd - 10) continue;
      const r = hash3(plank, 1, 0, seed);
      let c = r < 0.3 ? P.e5 : r < 0.8 ? P.e6 : P.e7;
      if ((z + plank * 3) % 7 === 0 && hash3(x >> 2, z, plank, seed + 4) > 0.3) c = shade(c, -1); // Maserung
      if (Math.abs(z - Wd / 2) < Wd * 0.18 && hash3(x >> 1, 0, z >> 1, seed + 5) > 0.55) c = shade(c, 1); // ausgetreten
      if ((z === 4 || z === 5 || z === Wd - 6 || z === Wd - 5) && (u === 1 || u === 7) && (z % 2 === 0)) c = P.s5; // Nägel
      m.set(x, deck, z, c);
      m.set(x, deck - 1, z, z === Wd - 1 ? P.e4 : P.e3);
    }
    // Tragbalken längs, vorn sichtbar
    m.set(x, deck - 2, Wd - 1, P.e2).set(x, deck - 3, Wd - 1, P.e2).set(x, deck - 2, 0, P.e2);
  }
  // Pfähle alle 2 m auf beiden Seiten, mit Algen am Wasser
  for (let x = 8; x < L; x += 64) {
    for (const z of [-4, Wd]) {
      m.box(x, -8, z, x + 4, deck + 8, z + 3, (xx, y) => {
        if (y > deck + 7) return P.e5;
        if (y <= 2) return hash3(xx, y >> 1, z, seed) < 0.5 ? P.g3 : P.t2;
        return xx === x ? P.e4 : hash3(xx, y >> 2, z, seed) < 0.4 ? P.e2 : P.e3;
      });
    }
  }
  // Poller am Ende und eine aufgeschossene Leine
  const px = L - 12;
  const bollard = (bx, bz) => {
    m.box(bx, deck + 1, bz, bx + 7, deck + 10, bz + 7, (x, y) => (y === deck + 1 ? P.s2 : x <= bx + 1 ? P.s4 : P.s3));
    m.box(bx - 2, deck + 11, bz - 2, bx + 9, deck + 12, bz + 9, (x, y) => (y === deck + 12 ? P.s5 : P.s4));
    m.box(bx, deck + 13, bz, bx + 7, deck + 13, bz + 7, (x, y, z) => (x === bx + 2 && z === bz + 2 ? P.s7 : P.s5));
  };
  bollard(px, 4);
  for (let x = px - 22; x <= px - 6; x++) {
    for (let z = Wd - 18; z <= Wd - 4; z++) {
      const d = Math.hypot(x + 0.5 - (px - 14), z + 0.5 - (Wd - 11));
      if (d > 7.6 || d < 2.8) continue;
      m.set(x, deck + 1, z, Math.floor(d * 1.6) % 2 ? P.e7 : P.e8);
      if (d > 5.2 && Math.floor(d * 1.6) % 2) m.set(x, deck + 2, z, P.e8);
    }
  }
  // Weitere Poller an der Kante (M10: dort fliegt Balduins Leine hin)
  for (const [cbx, cbz] of bollards) bollard(cbx * 4, cbz * 4);
  return m;
}

/** Altes Ruderboot (M13g, 1/32 m), kieloben am Strand angespült – Planken mit Fugen, abblätternde Farbe, Löcher im Rumpf (einmal Schrott). */
function buildWreck(seed) {
  const m = new VoxelModel();
  const L = 120;
  const W = 48;
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
      const top = Math.round(20 - dz * dz * 12.8);
      const pz = Math.abs(z + 0.5) / 4;
      const plank = Math.floor(pz);
      const seam = pz - plank < 0.25;
      const keel = (z === -1 || z === 0) && x > 6 && x < L - 16; // schmale Leiste auf dem Rücken
      for (let y = 0; y <= top + (keel ? 3 : 0); y++) {
        const outer = y >= top || dz > 0.9;
        if (!outer) continue;
        const bare = hash3(Math.floor(x / 14), 0, plank, seed + 5) > 0.84 && hash3(x >> 2, y >> 1, z >> 2, seed + 6) > 0.3;
        let c = bare ? P.e6 : plank % 2 ? P.b3 : P.b4;
        if (seam && !keel) c = bare ? P.e4 : P.b2; // Fuge zwischen den Planken
        if (keel) c = y > top ? P.e3 : P.e4; // Kiel: dunkle Leiste vom Heck zum Bug
        if (x <= 3) c = (y >> 2) % 2 ? P.e4 : P.e5; // flaches Heck aus Brettern
        if (y <= 3 && dz > 0.9) c = P.s9; // weiß gestrichene Kante am Boden
        if (seam && x % 8 === 3 && !keel) c = P.r2; // Rost an den Nägeln
        m.set(x + 4, y, z + W / 2, c);
      }
    }
  }
  // Löcher im Rumpf (dort sieht man hinein)
  for (let k = 0; k < 4; k++) {
    const hx = rng.int(16, L - 32);
    const hz = rng.int(8, W - 16);
    m.remove(hx, 4, hz, hx + rng.int(4, 10), 24, hz + 4);
  }
  // Ein Ruder und Tang
  m.line(-12, 0, W + 4, 32, 2, W + 8, P.e6, 1);
  m.box(-20, 0, W + 3, -10, 1, W + 11, (x, y) => (y === 1 ? P.e7 : P.e6));
  for (let k = 0; k < 40; k++) {
    const x = rng.int(0, L);
    const z = rng.chance(0.5) ? -2 : W + 1;
    m.set(x, 0, z, rng.chance(0.5) ? P.g3 : P.t2).set(x + 1, 0, z, P.g3);
  }
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

  // Seit M13g sind die Modelle doppelt fein (Schatten wie im Maß 1/8)
  const add = (model, x, z, { turns = 0, occluder = false, name = '', size = FINE32 } = {}) => {
    const shadow = size === FINE32 ? 'coarse4' : size === FINE ? 'coarse' : 'full';
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
    const frame = new THREE.Mesh(buildFlameFrame(seed + 100 + i).toGeometry({ jitter: 0, ao: false, visibleOnly: true, size: FINE32 }), materials.flame);
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
  if (materials.beacon) beacon.add(createStaticVoxelObject(buildTowerBeaconGlass(), materials.beacon, { shadow: 'none', jitter: 0, size: FINE32 }));
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
      if (materials.spawnGlow) post.add(createStaticVoxelObject(buildWarnLight(side), materials.spawnGlow, { shadow: 'none', jitter: 0, size: FINE32 }));
      colliders.addCircle(x + 0.0625, z, 0.2, 'warnpfahl');
      // M15: Ansehen gibt einen Gedanken (nie einen Dialog – hier kommt nachts die Horde)
      interactions.push({ id: `warnpfahl-${spawn.name}-${side}`, x, z, radius: 1.1, prompt: 'ansehen', thought: 'warnpfahl' });
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
    place(buildTorch(seed + 80).toGeometry({ jitter: 0.03, seed, size: FINE32, visibleOnly: true }), materials.world);
    if (materials.torchGlow) torchFlames = place(buildTorchFlame().toGeometry({ jitter: 0, ao: false, size: FINE32, visibleOnly: true }), materials.torchGlow);
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
    const piece = createStaticVoxelObject(c.model, materials.laundry || materials.world, { seed, size: FINE32, shadow: 'coarse' });
    piece.position.set(cl.x0 + c.x * FINE32, c.y * FINE32, cl.z);
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
  add(buildOakWithSwing(seed + 16), oak.x, oak.z, { occluder: true, name: 'Eiche', size: FINE });
  colliders.addCircle(oak.x, oak.z, 0.45);
  colliders.addCircle(oak.x + 1.3, oak.z, 0.3);
  interactions.push({ id: 'schaukel', x: oak.x + 1.3, z: oak.z + 0.4, radius: 1.2, prompt: 'schaukeln', action: 'swing', flavor: true }); // tritt wie Nur-Anschauen zurück (m7-r1)
  // Die Schaukel schwingt um ihre Aufhängung am Ast (m12-r1: Kira – »Wiiiiieee!«, aber
  // Mika stand nur daneben). Alle Flächen, weil sie sich dreht; Schatten mit.
  const tireModel = buildSwingTire();
  const swingPivot = new THREE.Group();
  swingPivot.name = 'Schaukel';
  swingPivot.position.set(oak.x + 10 * V, 20 * V, oak.z);
  const tire = new THREE.Mesh(tireModel.toGeometry({ seed, size: FINE32 }), materials.world);
  tire.receiveShadow = true;
  const tireShadow = new THREE.Mesh(shadowGeometry(tireModel, 'coarse', FINE32), SHADOW_PROXY_MATERIAL);
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
  const fine = (model, x, z, name, material = materials.world, shadow = 'coarse') => {
    const object = createStaticVoxelObject(model, material, { seed, size: FINE32, shadow });
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
    if (materials.pumpkinGlow) object.add(createStaticVoxelObject(jack.glow, materials.pumpkinGlow, { size: FINE32, shadow: 'none', jitter: 0 }));
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
    { x: mail.x + 0.0625, y: 1.5625, z: mail.z },
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
