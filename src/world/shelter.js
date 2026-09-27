// Das alte Fischerhaus von außen: eine zusammengezimmerte Bretterhütte mit
// Blechdach, Vordach und Lichterkette, ab Stufe 2 mit Anbau und Veranda.
// Seit Meilenstein 11 ist das Innere ein eigenes Bild (world/interior.js): Wer
// in die Tür geht, ist drinnen; das Haus selbst bleibt von außen geschlossen,
// nachts leuchten die Fenster.
//
// Voxel-Koordinaten: Ursprung Südwest-Ecke am Boden, x nach Osten (0..39),
// z nach Süden (0..27, Vorderseite bei z = 27), y nach oben.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { createWorldMaterial, createGlowMaterial } from '../render/materials.js';
import { SHADOW_LAYER, SHADOW_PROXY_MATERIAL, shadowGeometry } from '../render/staticMesh.js';
import { hash3 } from '../core/rng.js';
import { LAYOUT, V } from './layout.js';

const W = 40; // Breite in Voxeln (x)
const D = 28; // Tiefe in Voxeln (z)
const WALL_TOP = 22;
const FLOOR = 3; // Oberkante Fußboden (erste freie Voxelschicht)
const DOOR = { x0: 9, x1: 15, y1: 18 }; // Türöffnung inkl. Grenzen
const WINDOW = { x0: 25, x1: 31, y0: 9, y1: 15 };

/** Höhe der Dachoberfläche über Spalte x (Satteldach, First in Nord-Süd-Richtung). */
function roofHeight(x) {
  return 23 + Math.floor(Math.min(x + 2, 41 - x) / 2);
}

function plank(t, seed) {
  const index = Math.floor(t / 3);
  const r = hash3(index, 0, 0, seed);
  return r < 0.3 ? P.e4 : r < 0.75 ? P.e5 : P.e6;
}

function wallColor(t, y, x, z, seed) {
  if (y === 5 || y === 19) return P.e3; // Querlatten
  let c = plank(t, seed);
  const h = hash3(x, y, z, seed + 5);
  if (t % 3 === 0 && h < 0.5) c = P.e3; // Fugen
  if (h > 0.97) c = P.e3; // Astlöcher
  return c;
}

function buildBase(seed, level = 1) {
  const m = new VoxelModel();
  // Unterbau aus Paletten
  m.box(0, 0, 0, W - 1, 1, D - 1, (x, y, z) => {
    const edge = z === D - 1 || x === 0 || x === W - 1;
    if (edge && (z === D - 1 ? x : z) % 8 === 7) return P.e2;
    return y === 1 ? P.e4 : P.e3;
  });
  // Dielen (in der Türöffnung sichtbar)
  m.box(0, 2, 0, W - 1, 2, D - 1, (x, y, z) => {
    const row = Math.floor(z / 3);
    let c = row % 2 === 0 ? P.e5 : P.e6;
    if (z % 3 === 2) c = P.e4;
    if (hash3(x, 2, z, seed) > 0.95) c = P.e4;
    return c;
  });

  // Seitenwände und Rückwand
  for (let y = FLOOR; y <= WALL_TOP; y++) {
    for (let z = 0; z < D; z++) {
      m.set(0, y, z, wallColor(z, y, 0, z, seed));
      m.set(W - 1, y, z, wallColor(z, y, W - 1, z, seed + 1));
    }
    for (let x = 0; x < W; x++) m.set(x, y, 0, wallColor(x, y, x, 0, seed + 2));
  }
  // Wellblech-Flicken an der Westwand, Plane an der Ostwand
  m.paint(0, 6, 5, 0, 17, 15, (x, y, z) => (hash3(x, y, z, seed) > 0.93 ? P.r2 : z % 2 === 0 ? P.s4 : P.s5));
  m.paint(W - 1, 8, 11, W - 1, 17, 22, (x, y, z) => ((y + z) % 7 === 0 ? P.b1 : z % 3 === 0 ? P.b3 : P.b2));
  m.set(W - 1, 17, 11, P.e7).set(W - 1, 17, 22, P.e7).set(W - 1, 8, 11, P.e7).set(W - 1, 8, 22, P.e7);

  if (level < 2) {
    // Stufe vor der Tür (ab Stufe 2 ersetzt die Veranda sie)
    m.box(8, 0, 28, 16, 1, 30, (x, y, z) => (y === 1 ? (z === 30 ? P.e5 : P.e6) : P.e3));
  }
  return m;
}

function buildFront(seed) {
  const m = new VoxelModel();
  const z = D - 1;
  for (let y = FLOOR; y <= WALL_TOP; y++) {
    for (let x = 0; x < W; x++) {
      const inDoor = x >= DOOR.x0 && x <= DOOR.x1 && y <= DOOR.y1;
      const inWindow = x >= WINDOW.x0 && x <= WINDOW.x1 && y >= WINDOW.y0 && y <= WINDOW.y1;
      if (inDoor || inWindow) continue;
      m.set(x, y, z, wallColor(x, y, x, z, seed + 3));
    }
  }
  // Türrahmen
  m.box(DOOR.x0 - 1, FLOOR, z, DOOR.x0 - 1, DOOR.y1 + 1, z, P.e2);
  m.box(DOOR.x1 + 1, FLOOR, z, DOOR.x1 + 1, DOOR.y1 + 1, z, P.e2);
  m.box(DOOR.x0 - 1, DOOR.y1 + 1, z, DOOR.x1 + 1, DOOR.y1 + 1, z, P.e2);
  // Fensterrahmen, Kreuz, Vorhänge, Fensterbank
  m.box(WINDOW.x0 - 1, WINDOW.y0 - 1, z, WINDOW.x1 + 1, WINDOW.y1 + 1, z, (x, y) => {
    const border = x === WINDOW.x0 - 1 || x === WINDOW.x1 + 1 || y === WINDOW.y0 - 1 || y === WINDOW.y1 + 1;
    return border ? P.e2 : null;
  });
  m.box(28, WINDOW.y0, z, 28, WINDOW.y1, z, P.e2);
  m.box(WINDOW.x0, 12, z, WINDOW.x1, 12, z, P.e2);
  m.box(WINDOW.x0, WINDOW.y0, z, WINDOW.x0, WINDOW.y1, z, (x, y) => (y % 2 ? P.a1 : P.a0));
  m.box(WINDOW.x1, WINDOW.y0, z, WINDOW.x1, WINDOW.y1, z, (x, y) => (y % 2 ? P.a1 : P.a0));
  m.box(WINDOW.x0 - 2, WINDOW.y0 - 1, z + 1, WINDOW.x1 + 2, WINDOW.y0 - 1, z + 1, P.e6);
  // Blumenkasten
  m.box(WINDOW.x0 - 1, WINDOW.y0 - 3, z + 1, WINDOW.x1 + 1, WINDOW.y0 - 2, z + 2, (x, y) => (y === WINDOW.y0 - 2 ? P.e5 : P.e4));
  for (let x = WINDOW.x0 - 1; x <= WINDOW.x1 + 1; x++) {
    const h = hash3(x, 0, 0, seed + 9);
    m.set(x, WINDOW.y0 - 1, z + 2, h < 0.3 ? P.a0 : h < 0.55 ? P.f6 : h < 0.7 ? P.a4 : P.g5);
  }
  // Hufeisen über der Tür
  m.set(12, DOOR.y1 + 3, z + 1, P.s6).set(11, DOOR.y1 + 2, z + 1, P.s6).set(13, DOOR.y1 + 2, z + 1, P.s6);
  return m;
}

function buildWindowGlass() {
  const m = new VoxelModel();
  for (let x = WINDOW.x0 + 1; x <= WINDOW.x1 - 1; x++) {
    for (let y = WINDOW.y0; y <= WINDOW.y1; y++) {
      if (x === 28 || y === 12) continue;
      m.set(x, y, D - 1, 0xffffff);
    }
  }
  return m;
}

function buildDoor(seed) {
  const m = new VoxelModel();
  const width = DOOR.x1 - DOOR.x0 + 1;
  const height = DOOR.y1 - FLOOR + 1;
  m.box(0, 0, 0, width - 1, height - 1, 0, (x, y) => {
    const c = Math.floor(x / 2) % 2 ? P.e5 : P.e6;
    return hash3(x, y, 0, seed) > 0.95 ? P.e4 : c;
  });
  // Z-Verstrebung
  m.box(0, 2, 0, width - 1, 2, 0, P.e3);
  m.box(0, height - 3, 0, width - 1, height - 3, 0, P.e3);
  m.line(0, 3, 0, width - 1, height - 4, 0, P.e3);
  m.set(width - 2, 7, 1, P.s6);
  return m;
}

function buildRoof(seed) {
  const m = new VoxelModel();
  for (let x = -2; x <= W + 1; x++) {
    const h = roofHeight(x);
    for (let z = -2; z <= D + 2; z++) {
      const sheet = Math.floor((z + 2) / 8);
      const grey = (sheet === 2 && x < 20) || (sheet === 1 && x > 28);
      const hsh = hash3(x, h, z, seed);
      let top = grey ? (x % 2 ? P.s4 : P.s5) : x % 2 ? P.r2 : P.r3;
      if (hsh > 0.94) top = grey ? P.r2 : P.e4;
      m.set(x, h, z, top);
      m.set(x, h - 1, z, grey ? P.s3 : P.r1);
    }
  }
  // Firstkappe
  for (let z = -2; z <= D + 2; z++) {
    m.set(19, roofHeight(19) + 1, z, P.s5);
    m.set(20, roofHeight(20) + 1, z, P.s5);
  }
  // Giebeldreiecke vorn und hinten (Stülpschalung)
  for (const gz of [0, D - 1]) {
    for (let x = 0; x < W; x++) {
      for (let y = WALL_TOP + 1; y <= roofHeight(x) - 2; y++) {
        m.set(x, y, gz, y % 2 ? P.e5 : P.e4);
      }
    }
  }
  // Lüftungsloch im Giebel
  m.box(19, 27, D - 1, 20, 28, D - 1, P.e1);
  // Plane mit Reifen auf der Westseite
  for (let x = 4; x <= 13; x++) {
    for (let z = 14; z <= 24; z++) {
      if (hash3(x, 1, z, seed) < 0.12 && (x === 4 || x === 13 || z === 14 || z === 24)) continue;
      m.set(x, roofHeight(x) + 1, z, (x + z) % 5 === 0 ? P.b1 : P.b2);
    }
  }
  for (let x = 7; x <= 11; x++) {
    for (let z = 17; z <= 21; z++) {
      const ring = x === 7 || x === 11 || z === 17 || z === 21;
      if (ring && !((x === 7 || x === 11) && (z === 17 || z === 21))) m.set(x, roofHeight(x) + 2, z, P.s1);
    }
  }
  // Solarpaneel auf der Ostseite
  for (let x = 25; x <= 33; x++) {
    for (let z = 5; z <= 14; z++) {
      const frame = x === 25 || x === 33 || z === 5 || z === 14;
      m.set(x, roofHeight(x) + 1, z, frame ? P.s6 : (x + z) % 2 ? P.b1 : P.b0);
    }
  }
  // Schornstein (Ofenrohr) mit Hut
  const chimneyTop = roofHeight(31) + 6;
  m.box(31, roofHeight(32) + 1, 3, 32, chimneyTop, 4, (x, y) => (y % 4 === 0 ? P.s3 : P.s2));
  m.box(30, chimneyTop + 2, 2, 33, chimneyTop + 2, 5, P.s3);
  m.box(31, chimneyTop + 1, 3, 32, chimneyTop + 1, 4, P.s1);
  return { model: m, chimneyTop: { x: 32, y: chimneyTop + 3, z: 4 } };
}

/** Lichterkette unter der vorderen Dachkante: leuchtende Punkte. */
function buildFairyLights() {
  const m = new VoxelModel();
  const colors = [P.f7, P.f6, P.a1, P.f7, P.a6];
  let i = 0;
  for (let x = -1; x <= W; x += 3) {
    const y = roofHeight(x) - 2 - (i % 2);
    m.set(x, y, D + 2, colors[i % colors.length]);
    i++;
  }
  return m;
}

function buildFairyWire() {
  const m = new VoxelModel();
  for (let x = -1; x <= W; x++) {
    const isLight = (x + 1) % 3 === 0;
    const i = (x + 1) / 3;
    // Über tiefer hängenden Lämpchen ein Stück Draht, sonst Draht zwischen den Lämpchen.
    if (!isLight || i % 2 === 1) m.set(x, roofHeight(x) - 2, D + 2, P.s1);
  }
  return m;
}

function buildAwning() {
  const m = new VoxelModel();
  const x0 = 4;
  const x1 = 21;
  const zFront = 41;
  // Stangen
  for (const px of [5, 20]) m.box(px, 0, zFront - 1, px, 17, zFront - 1, P.e3);
  // Stoffbahn mit Streifen, vorne gewellter Saum
  for (let z = D + 1; z <= zFront; z++) {
    const y = 19 - Math.floor((z - D - 1) / 5);
    for (let x = x0; x <= x1; x++) {
      const stripe = Math.floor(x / 2) % 2 === 0 ? P.g5 : P.e9;
      m.set(x, y, z, stripe);
      if (z === zFront && x % 2 === 0) m.set(x, y - 1, z, stripe);
    }
  }
  // Kette und Laterne
  m.box(12, 14, 40, 12, 16, 40, P.s3);
  m.box(11, 10, 39, 13, 10, 41, P.s2);
  m.box(11, 13, 39, 13, 13, 41, P.s2);
  m.set(11, 11, 39, P.s2).set(13, 11, 39, P.s2).set(11, 11, 41, P.s2).set(13, 11, 41, P.s2);
  m.set(11, 12, 39, P.s2).set(13, 12, 39, P.s2).set(11, 12, 41, P.s2).set(13, 12, 41, P.s2);
  return m;
}

function buildLanternGlass() {
  const m = new VoxelModel();
  m.box(12, 11, 40, 12, 12, 40, 0xffffff);
  m.set(12, 11, 41, 0xffffff).set(12, 12, 41, 0xffffff).set(11, 11, 40, 0xffffff).set(13, 12, 40, 0xffffff);
  return m;
}

// --- Ausbaustufe 2: Hütte ------------------------------------------------------
// Anbau im Osten (x 40..57, z 6..27) mit Leseecke, Veranda über die ganze Front.

const AX0 = W;
const AX1 = W + 17;
const AZ0 = 6;

function annexRoofHeight(x) {
  return 21 - Math.floor((x - AX0) / 4);
}

function buildAnnexBase(seed) {
  const m = new VoxelModel();
  m.box(AX0, 0, AZ0, AX1, 1, D - 1, (x, y, z) => ((z === D - 1 || x === AX1) && x % 8 === 7 ? P.e2 : y === 1 ? P.e4 : P.e3));
  m.box(AX0, 2, AZ0, AX1, 2, D - 1, (x, y, z) => (Math.floor(z / 3) % 2 ? P.e5 : P.e6));
  // Nord- und Ostwand
  for (let y = FLOOR; y <= 19; y++) {
    for (let x = AX0; x <= AX1; x++) m.set(x, y, AZ0, wallColor(x, y, x, AZ0, seed + 7));
    for (let z = AZ0; z < D; z++) m.set(AX1, y, z, wallColor(z, y, AX1, z, seed + 8));
  }
  return m;
}

function buildAnnexFront(seed) {
  const m = new VoxelModel();
  for (let y = FLOOR; y <= 19; y++) {
    for (let x = AX0; x <= AX1; x++) {
      if (x >= 46 && x <= 52 && y >= 8 && y <= 13) continue;
      m.set(x, y, D - 1, wallColor(x, y, x, D - 1, seed + 9));
    }
  }
  m.box(45, 7, D - 1, 53, 14, D - 1, (x, y) => (x === 45 || x === 53 || y === 7 || y === 14 ? P.e2 : null));
  m.box(49, 8, D - 1, 49, 13, D - 1, P.e2);
  m.box(44, 7, D, 54, 7, D, P.e6);
  // Kräuter im Kasten
  m.box(45, 5, D, 53, 6, D + 1, (x, y) => (y === 6 ? P.e5 : P.e4));
  for (let x = 45; x <= 53; x++) m.set(x, 7, D + 1, x % 2 ? P.g6 : P.a3);
  return m;
}

function buildAnnexGlass() {
  const m = new VoxelModel();
  for (let x = 46; x <= 52; x++) for (let y = 8; y <= 13; y++) if (x !== 49) m.set(x, y, D - 1, 0xffffff);
  return m;
}

function buildAnnexRoof(seed) {
  const m = new VoxelModel();
  for (let x = AX0; x <= AX1 + 2; x++) {
    const h = annexRoofHeight(x);
    for (let z = AZ0 - 2; z <= D + 1; z++) {
      const grey = Math.floor((z + 2) / 6) % 3 === 1;
      m.set(x, h, z, grey ? (x % 2 ? P.s4 : P.s5) : x % 2 ? P.r2 : P.r3);
      m.set(x, h - 1, z, grey ? P.s3 : P.r1);
    }
  }
  // Giebelwand zwischen Anbauwand und Dach
  for (let x = AX0; x <= AX1; x++) {
    for (let y = 20; y < annexRoofHeight(x) - 1; y++) {
      m.set(x, y, D - 1, y % 2 ? P.e5 : P.e4);
      m.set(x, y, AZ0, P.e4);
    }
  }
  // Regenrinne mit Tonne
  for (let z = AZ0 - 2; z <= D + 1; z++) m.set(AX1 + 3, annexRoofHeight(AX1 + 2) - 1, z, P.s5);
  return m;
}

function buildDeck() {
  const m = new VoxelModel();
  const x0 = -2;
  const x1 = AX1 + 1;
  m.box(x0, 0, D, x1, 1, D + 5, (x, y, z) => (y === 1 ? (Math.floor(x / 3) % 2 ? P.e5 : P.e6) : P.e3));
  // Geländer vorn mit Lücke für die Treppe vor der Tür
  for (let x = x0; x <= x1; x++) {
    if (x >= DOOR.x0 - 1 && x <= DOOR.x1 + 1) continue;
    const post = (x - x0) % 6 === 0 || x === x1 || x === DOOR.x0 - 2 || x === DOOR.x1 + 2;
    if (post) m.box(x, 2, D + 5, x, 6, D + 5, P.e3);
    m.set(x, 6, D + 5, P.e4);
  }
  // Seitengeländer
  for (let z = D; z <= D + 5; z++) {
    m.set(x0, 6, z, P.e4).set(x1, 6, z, P.e4);
  }
  m.box(x0, 2, D, x0, 5, D, P.e3).box(x1, 2, D, x1, 5, D, P.e3);
  // Treppe
  m.box(DOOR.x0 - 1, 0, D + 6, DOOR.x1 + 1, 0, D + 7, P.e5);
  // Blumentöpfe am Geländer
  for (const [x, c] of [[24, P.a0], [34, P.f6], [44, P.a3]]) {
    m.box(x, 2, D + 4, x + 1, 3, D + 4, P.r3);
    m.set(x, 4, D + 4, P.g5).set(x + 1, 4, D + 4, c);
  }
  return m;
}

// --- Ausbaustufen 3–5 von außen (M11): innen ein neuer Raum, außen ein Zeichen dafür ------

/** Stufe 3 (Schlafzimmer unterm Dach): ein Dachfenster in der Westseite des Dachs. */
function buildRoofWindow() {
  const m = new VoxelModel();
  const glass = new VoxelModel();
  // Neben der Plane (z 14..24): weiter nördlich, damit sich nichts überlagert
  for (let x = 5; x <= 11; x++) {
    for (let z = 3; z <= 10; z++) {
      const frame = x === 5 || x === 11 || z === 3 || z === 10;
      if (frame) m.set(x, roofHeight(x) + 1, z, P.e2);
      else glass.set(x, roofHeight(x) + 1, z, 0xffffff);
    }
  }
  return { model: m, glass };
}

/** Stufe 4 (Werkstatt): Werkzeugbrett links neben der Tür, darunter ein Sägebock. */
function buildToolBoard() {
  const m = new VoxelModel();
  const z = D;
  m.box(1, 7, z, 7, 16, z, (x, y) => ((x + y) % 3 === 0 ? P.e5 : P.e6));
  m.line(2, 15, z + 1, 4, 9, z + 1, P.s6); // Säge
  m.box(2, 14, z + 1, 3, 15, z + 1, P.e3);
  m.box(6, 9, z + 1, 6, 14, z + 1, P.e3).box(5, 14, z + 1, 7, 15, z + 1, P.s4); // Axt
  m.box(1, 0, z + 2, 1, 3, z + 3, P.e3).box(6, 0, z + 2, 6, 3, z + 3, P.e3).box(0, 4, z + 2, 7, 4, z + 3, P.e5);
  return m;
}

/** Stufe 5 (Lager): Kisten und ein Fass am Ostende der Veranda. */
function buildVerandaCrates() {
  const m = new VoxelModel();
  const crate = (x0, y0, z0) => m.box(x0, y0, z0, x0 + 3, y0 + 3, z0 + 3, (x, y, z) => (x === x0 || x === x0 + 3 || y === y0 + 3 ? P.e3 : P.e5));
  crate(50, 2, D);
  crate(54, 2, D);
  crate(52, 6, D);
  m.cylinder(47.5, D + 2.5, 2, 6, 2, (x, y) => (y === 3 || y === 6 ? P.s3 : P.e4));
  return m;
}

/**
 * Baut das Fischerhaus von außen.
 * @returns {object} group, Tür, Lichtpositionen, Kollision, Grundfläche
 */
/** Materialien der Unterkunft – einmal anlegen, bei jedem Ausbau wiederverwenden. */
/**
 * Grundfläche des Zuhauses auf dem Bauraster (Weltkoordinaten), inklusive
 * Veranda, Stufe und einem freien Streifen vor der Tür.
 */
export function shelterFootprint(level) {
  const { x: ox, z: oz } = LAYOUT.shelter;
  const wx = (vx) => ox + vx * V;
  const wz = (vz) => oz + vz * V;
  return level >= 2
    ? [
        { minX: wx(-3), maxX: wx(AX1 + 4), minZ: wz(-2), maxZ: wz(D + 8) },
        { minX: wx(DOOR.x0 - 4), maxX: wx(DOOR.x1 + 5), minZ: wz(D + 8), maxZ: wz(D + 16) },
      ]
    : [
        { minX: wx(-2), maxX: wx(W + 2), minZ: wz(-2), maxZ: wz(D + 3) },
        { minX: wx(DOOR.x0 - 4), maxX: wx(DOOR.x1 + 5), minZ: wz(D + 3), maxZ: wz(D + 16) },
      ];
}

export function createShelterMaterials() {
  const baseMat = createWorldMaterial({ occluder: true });
  const glow = {
    window: createGlowMaterial(0xffffff),
    fairy: createGlowMaterial(0xffffff, { vertexColors: true }),
    lantern: createGlowMaterial(0xffffff, { occluder: true }),
  };
  return { baseMat, glow };
}

export function createShelter({ seed, colliders, level = 1, stage = level, materials }) {
  const { x: ox, z: oz } = LAYOUT.shelter;
  const group = new THREE.Group();
  group.name = level >= 2 ? 'Hütte' : 'Notunterkunft';
  group.position.set(ox, 0, oz);
  const { baseMat, glow } = materials;
  const ownColliders = [];

  // Sichtbare Flächen für die Kamera, Schatten über einen Stellvertreter.
  const mesh = (model, material, { shadow = 'full', jitter = 0.05 } = {}) => {
    const visual = new THREE.Mesh(model.toGeometry({ jitter, seed, visibleOnly: true }), material);
    visual.castShadow = false;
    visual.receiveShadow = true;
    if (shadow !== 'none') {
      const proxy = new THREE.Mesh(shadowGeometry(model, shadow), SHADOW_PROXY_MATERIAL);
      proxy.castShadow = true;
      proxy.layers.set(SHADOW_LAYER);
      visual.add(proxy);
    }
    return visual;
  };

  const base = mesh(buildBase(seed, level), baseMat);
  const front = mesh(buildFront(seed), baseMat);
  const roofParts = buildRoof(seed);
  const roof = mesh(roofParts.model, baseMat);
  const awning = mesh(buildAwning(), baseMat);
  const windowGlass = mesh(buildWindowGlass(), glow.window, { shadow: 'none', jitter: 0 });
  const fairyWire = mesh(buildFairyWire(), baseMat, { shadow: 'none' });
  const fairy = mesh(buildFairyLights(), glow.fairy, { shadow: 'none', jitter: 0 });
  const lanternGlass = mesh(buildLanternGlass(), glow.lantern, { shadow: 'none', jitter: 0 });

  // Tür mit Drehpunkt an der Angel
  const doorPivot = new THREE.Group();
  doorPivot.position.set(DOOR.x0 * V, FLOOR * V, (D - 1) * V);
  // Die Tür dreht sich: alle Flächen, wirft selbst Schatten.
  const door = new THREE.Mesh(buildDoor(seed).toGeometry({ jitter: 0.05, seed }), baseMat);
  door.castShadow = true;
  door.receiveShadow = true;
  doorPivot.add(door);

  group.add(base, front, roof, awning, windowGlass, fairyWire, fairy, lanternGlass, doorPivot);
  if (level >= 2) {
    group.add(
      mesh(buildAnnexBase(seed), baseMat),
      mesh(buildAnnexFront(seed), baseMat),
      mesh(buildAnnexRoof(seed), baseMat),
      mesh(buildAnnexGlass(), glow.window, { shadow: 'none', jitter: 0 }),
      mesh(buildDeck(), baseMat)
    );
  }

  // Ab Stufe 3 sieht man den Ausbau auch von außen (M11)
  if (stage >= 3) {
    const rw = buildRoofWindow();
    group.add(mesh(rw.model, baseMat, { shadow: 'none' }), mesh(rw.glass, glow.window, { shadow: 'none', jitter: 0 }));
  }
  if (stage >= 4) group.add(mesh(buildToolBoard(), baseMat));
  if (stage >= 5 && level >= 2) group.add(mesh(buildVerandaCrates(), baseMat));

  // --- Kollision (Weltkoordinaten) ---
  const wx = (vx) => ox + vx * V;
  const wz = (vz) => oz + vz * V;
  const box = (x0, z0, x1, z1, tag) => ownColliders.push(colliders.addBox(wx(x0), wz(z0), wx(x1), wz(z1), tag));
  box(0, 0, 1, D, 'wand');
  // Das Innere ist ein eigenes Bild (interior.js): Hinter der Türöffnung ist Schluss
  box(1, 1, W - 1, D - 1, 'haus');
  if (level >= 2) {
    box(W - 1, 0, AX1 + 1, D, 'haus');
    // Geländer der Veranda (Lücke vor der Treppe)
    box(-2, D + 5, DOOR.x0 - 1, D + 6, 'gelaender');
    box(DOOR.x1 + 2, D + 5, AX1 + 2, D + 6, 'gelaender');
    box(-3, D, -2, D + 6, 'gelaender');
    box(AX1 + 1, D, AX1 + 2, D + 6, 'gelaender');
    if (stage >= 5) box(45, D, 58, D + 4, 'kisten');
  } else {
    box(W - 1, 0, W, D, 'wand');
  }
  box(0, 0, W, 1, 'wand');
  box(0, D - 1, DOOR.x0, D, 'wand');
  box(DOOR.x1 + 1, D - 1, W, D, 'wand');
  ownColliders.push(colliders.addCircle(wx(5.5), wz(40.5), 0.12));
  ownColliders.push(colliders.addCircle(wx(20.5), wz(40.5), 0.12));

  const toWorld = (vx, vy, vz) => new THREE.Vector3(wx(vx), vy * V, wz(vz));

  return {
    group,
    stage,
    door: { pivot: doorPivot, hinge: toWorld(DOOR.x0, 0, D), center: toWorld((DOOR.x0 + DOOR.x1 + 1) / 2, 0, D), angle: 0 },
    glow,
    lights: {
      porch: toWorld(12.5, 11.5, 40.5),
    },
    chimney: toWorld(roofParts.chimneyTop.x, roofParts.chimneyTop.y, roofParts.chimneyTop.z),
    level,
    colliders: ownColliders,
    footprint: shelterFootprint(level),
    heightZones:
      level >= 2
        ? [
            { minX: wx(0), maxX: wx(AX1 + 1), minZ: wz(D - 1), maxZ: wz(D), y: FLOOR * V }, // Türschwelle
            { minX: wx(-2), maxX: wx(AX1 + 2), minZ: wz(D), maxZ: wz(D + 6), y: 2 * V },
            { minX: wx(DOOR.x0 - 1), maxX: wx(DOOR.x1 + 2), minZ: wz(D + 6), maxZ: wz(D + 8), y: 1 * V },
          ]
        : [
            { minX: wx(0), maxX: wx(W), minZ: wz(D - 1), maxZ: wz(D), y: FLOOR * V },
            { minX: wx(8), maxX: wx(17), minZ: wz(D), maxZ: wz(31), y: 2 * V },
          ],
    interactions: [],
  };
}

export { W as SHELTER_WIDTH, D as SHELTER_DEPTH };
