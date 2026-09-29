// Das Zuhause von innen (Meilenstein 11, DESIGN.md 6.8): »Drinnen ist ein
// eigenes Bild« – wer durch die Haustür geht, sieht den Innenraum groß, warm
// und im feinen Maß (1/16 m). Er liegt in derselben Szene weit östlich der
// Karte, damit draußen alles weiterläuft (Horde, Türme, Nächte).
//
// Die Räume liegen nebeneinander von West nach Ost, jede Ausbaustufe fügt einen
// hinzu: Wohnraum mit Kamin (1) → Küche (2) → Schlafzimmer (3) → Werkstatt (4)
// → Lager (5). Die Kamera blickt nach Norden: Die Rückwand steht in voller Höhe
// mit Fenstern, Seiten-, Trenn- und Vorderwände sind wie in einer Puppenstube
// niedrig abgeschnitten, damit sie nichts verdecken. Ein unsichtbarer
// Stellvertreter (Decke und Südwand mit Fenstern) hält die Sonne draußen und
// lässt sie nur durch die Fenster herein – so wandern Sonnenflecken über den Boden.
//
// Voxel-Koordinaten: Ursprung Nordwest-Ecke am Boden, x nach Osten, z nach
// Süden, y nach oben. Bodenplatte y 0..1, Fußboden bei y = 2 (Welt y = 0).

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { SHADOW_LAYER, SHADOW_PROXY_MATERIAL, shadowGeometry } from '../render/staticMesh.js';
import { hash3 } from '../core/rng.js';
import { LAYOUT } from './layout.js';

export const U = 1 / 16; // feines Maß
const FLOOR = 2; // erste freie Voxelschicht über dem Boden
const DEPTH = 84; // z 0..3 Rückwand, 4..79 Raum, 80..83 Vorderwand
const WALL_H = 44; // Rückwand bis y 45 (2,75 m)
const TOP = FLOOR + WALL_H - 1;
const CUT = 12; // Seiten- und Trennwände, abgeschnitten (0,75 m)
const FRONT = 6; // Vorderwand (0,375 m)
const INNER_Z1 = 79; // letzte Zeile des Raums vor der Vorderwand
const PASS = { z0: 36, z1: 55 }; // Durchgänge in den Trennwänden
const ENTRY = { x0: 192, x1: 207 }; // Haustür in der Vorderwand des Wohnraums

/** Räume von West nach Ost; `level` = ab welcher Ausbaustufe es ihn gibt. */
export const ROOMS = [
  { id: 'werkstatt', level: 4, x0: 4, x1: 71 },
  { id: 'kueche', level: 2, x0: 76, x1: 143 },
  { id: 'wohnraum', level: 1, x0: 148, x1: 251 },
  { id: 'schlafzimmer', level: 3, x0: 256, x1: 323 },
  { id: 'lager', level: 5, x0: 328, x1: 387 },
];

/** Wo man drinnen hinter der Haustür steht (Weltkoordinaten, auch für die Migration v9 → v10). */
export const INTERIOR_ENTRY = { x: LAYOUT.interior.x + ((ENTRY.x0 + ENTRY.x1 + 1) / 2) * U, z: LAYOUT.interior.z + (INNER_Z1 - 6) * U };

/** So weit reicht der Innenraum höchstens (alle Räume), für die Prüfung gespeicherter Stände. */
export const INTERIOR_EXTENT = { minX: LAYOUT.interior.x, maxX: LAYOUT.interior.x + 392 * U, minZ: LAYOUT.interior.z, maxZ: LAYOUT.interior.z + DEPTH * U };

/** Die Räume einer Ausbaustufe (immer zusammenhängend um den Wohnraum). */
export function roomsOf(level) {
  return ROOMS.filter((r) => r.level <= level);
}

// --- Farben ------------------------------------------------------------------------

function floorColor(room, x, z, seed) {
  const h = hash3(x, 0, z, seed);
  switch (room) {
    case 'kueche': {
      // Terrakotta-Fliesen mit hellen Fugen
      if (x % 8 === 0 || z % 8 === 0) return P.e8;
      const tile = hash3(Math.floor(x / 8), 1, Math.floor(z / 8), seed);
      return tile < 0.33 ? P.r3 : tile < 0.7 ? P.r4 : P.d5;
    }
    case 'werkstatt': {
      // grobe Bohlen mit Sägespänen
      if (h > 0.97) return P.e8;
      if (z % 6 === 5) return P.e2;
      return Math.floor(z / 6) % 2 ? P.e4 : P.e3;
    }
    case 'lager': {
      // Steinplatten
      if (x % 12 === 0 || z % 10 === 0) return P.s2;
      return hash3(Math.floor(x / 12), 2, Math.floor(z / 10), seed) < 0.5 ? P.s4 : P.s5;
    }
    case 'schlafzimmer': {
      if (z % 5 === 4) return P.e3;
      const board = hash3(Math.floor((x + (Math.floor(z / 5) % 3) * 11) / 22), 3, Math.floor(z / 5), seed);
      return board < 0.5 ? P.e4 : P.e5;
    }
    default: {
      // Wohnraum: warme Dielen, versetzte Stöße
      if (z % 5 === 4) return P.e4;
      const joint = (x + (Math.floor(z / 5) % 4) * 9) % 36 === 0;
      if (joint) return P.e4;
      const board = hash3(Math.floor((x + (Math.floor(z / 5) % 4) * 9) / 36), 4, Math.floor(z / 5), seed);
      if (h > 0.985) return P.e4;
      return board < 0.35 ? P.e5 : board < 0.8 ? P.e6 : P.e7;
    }
  }
}

function wallColor(room, x, y, seed) {
  const h = hash3(x, y, 0, seed);
  const low = y <= FLOOR + 13; // Täfelung unten
  if (y === FLOOR + 14) return P.e3; // Leiste über der Täfelung
  if (y >= TOP - 1) return P.e2; // Deckenbalken
  switch (room) {
    case 'kueche':
      if (low) return x % 4 === 0 ? P.s7 : P.s8; // Fliesenspiegel
      return h > 0.96 ? P.s8 : P.s9; // gekalkt
    case 'werkstatt':
      if (x % 6 === 0) return P.e3;
      return Math.floor(x / 6) % 2 ? P.e5 : P.e6;
    case 'lager':
      if (y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 6) % 12 === 0) return P.s2;
      return h < 0.5 ? P.s4 : P.s5;
    case 'schlafzimmer':
      if (low) return x % 5 === 0 ? P.e4 : P.e5;
      return (x + y) % 8 === 0 ? P.b5 : x % 8 < 4 ? P.b4 : P.n7;
    default:
      if (low) return x % 5 === 0 ? P.e4 : x % 5 === 2 && h > 0.7 ? P.e6 : P.e5;
      // Tapete: warme Streifen mit kleinen Blüten
      if (x % 10 === 5 && y % 6 === 0) return P.d6;
      return x % 10 < 5 ? P.d5 : P.d4;
  }
}

// --- Bausteine --------------------------------------------------------------------

/** Fenster in der Rückwand: Rahmen, Sprossen, Bank, unten dunkle Baumwipfel (Blick nach Norden). */
function windowFrame(m, glass, x0, x1, y0, y1, seed, curtains = null) {
  m.remove(x0, y0, 0, x1, y1, 3);
  m.box(x0 - 1, y0 - 1, 3, x1 + 1, y1 + 1, 3, (x, y) => (x === x0 - 1 || x === x1 + 1 || y === y0 - 1 || y === y1 + 1 ? P.e2 : null));
  const mx = Math.round((x0 + x1) / 2);
  const my = Math.round((y0 + y1) / 2) + 1;
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (x === mx || y === my) {
        m.set(x, y, 3, P.e3); // Sprossen
        continue;
      }
      // Wipfel draußen vor dem Fenster (als Teil der Wand, nicht leuchtend)
      const crown = y0 + 2 + Math.floor(3 * hash3(Math.floor(x / 3), 5, 0, seed) + Math.sin(x * 0.7) * 1.5);
      if (y <= crown) m.set(x, y, 1, y === crown ? P.t3 : P.t2);
      else glass.set(x, y, 1, 0xffffff);
    }
  }
  // Fensterbank
  m.box(x0 - 2, y0 - 2, 3, x1 + 2, y0 - 2, 5, P.e6);
  if (curtains) {
    for (const cx of [x0 - 1, x1 + 1]) {
      for (let y = y0 - 1; y <= y1 + 2; y++) m.box(cx - (cx < mx ? 2 : 0), y, 4, cx + (cx > mx ? 2 : 0), y, 4, (x) => ((x + y) % 3 === 0 ? curtains[1] : curtains[0]));
    }
    m.box(x0 - 4, y1 + 3, 4, x1 + 4, y1 + 3, 4, P.e2); // Gardinenstange
  }
}

/** Kamin (Mitte der Rückwand des Wohnraums): Feldsteine, Sims, Feuerraum, Herdplatte. */
function fireplace(m, x0, seed) {
  const x1 = x0 + 31;
  // Kaminschürze bis unter die Decke
  m.box(x0 + 2, FLOOR, 4, x1 - 2, TOP - 2, 11, (x, y, z) => {
    const h = hash3(Math.floor(x / 3), Math.floor(y / 2), z, seed);
    if ((x + (Math.floor(y / 3) % 2) * 2) % 5 === 0 || y % 3 === 0) return P.s3; // Fugen
    return h < 0.3 ? P.s4 : h < 0.7 ? P.s5 : P.s6;
  });
  // Feuerraum (dunkel, Glut und Flammen leuchten separat)
  m.remove(x0 + 8, FLOOR, 6, x1 - 8, FLOOR + 13, 11);
  m.box(x0 + 8, FLOOR, 5, x1 - 8, FLOOR + 13, 5, P.s1);
  m.box(x0 + 7, FLOOR + 14, 11, x1 - 7, FLOOR + 15, 12, P.s3); // Sturz
  // Holzscheite im Feuer
  m.box(x0 + 11, FLOOR, 7, x1 - 11, FLOOR + 1, 9, (x) => (x % 3 === 0 ? P.e2 : P.e3));
  m.box(x0 + 12, FLOOR + 2, 8, x1 - 12, FLOOR + 2, 8, P.e2);
  // Kaminsims mit Kerzen, Uhr und Glas
  m.box(x0, FLOOR + 21, 4, x1, FLOOR + 22, 13, (x, y) => (y === FLOOR + 22 ? P.e5 : P.e3));
  m.box(x0 + 4, FLOOR + 23, 8, x0 + 5, FLOOR + 26, 9, P.a4); // Kerze links
  m.box(x1 - 5, FLOOR + 23, 8, x1 - 4, FLOOR + 25, 9, P.a4); // Kerze rechts
  m.box(x0 + 13, FLOOR + 23, 7, x0 + 18, FLOOR + 29, 9, (x, y) => (y === FLOOR + 29 || x === x0 + 13 || x === x0 + 18 ? P.e2 : P.f6)); // Uhr
  m.set(x0 + 15, FLOOR + 26, 10, P.e1).set(x0 + 16, FLOOR + 27, 10, P.e1);
  m.box(x0 + 22, FLOOR + 23, 8, x0 + 24, FLOOR + 26, 10, (x, y) => (y === FLOOR + 26 ? P.e5 : P.g6)); // Glas mit Kräutern
  // Herdplatte aus Stein vor dem Feuer
  m.box(x0, 0, 12, x1, FLOOR, 17, (x, y, z) => (y < FLOOR ? P.s3 : (x + z) % 6 === 0 ? P.s4 : P.s6));
  // Schürhaken
  m.box(x1 + 1, FLOOR, 13, x1 + 1, FLOOR + 12, 13, P.s2);
  m.set(x1 + 1, FLOOR + 13, 13, P.s4);
  return { x0, x1 };
}

function fireplaceFlames(x0, frame) {
  // Drei Einzelbilder einer Flamme, die schnell wechseln (wie am Lagerfeuer)
  const m = new VoxelModel();
  const x1 = x0 + 31;
  for (let x = x0 + 10; x <= x1 - 10; x++) {
    const n = hash3(x, frame, 9, 3);
    const h = 3 + Math.floor(n * 7) - Math.abs(x - (x0 + 15.5)) / 3;
    for (let y = FLOOR + 2; y < FLOOR + 2 + h; y++) m.set(x, y, 8, y > FLOOR + 1 + h * 0.6 ? P.f6 : y > FLOOR + 1 + h * 0.3 ? P.f4 : P.f3);
  }
  return m;
}

function fireplaceEmbers(x0) {
  const m = new VoxelModel();
  const x1 = x0 + 31;
  for (let x = x0 + 10; x <= x1 - 10; x++) if (x % 2) m.set(x, FLOOR + 2, 7, P.f3);
  return m;
}

/** Bett mit Kopfteil, Patchworkdecke und Kissen (Kopfteil an der Rückwand). */
function bed(m, x0, z0, seed) {
  const x1 = x0 + 23;
  const z1 = z0 + 31;
  m.box(x0, FLOOR, z0, x1, FLOOR + 13, z0 + 1, (x, y) => (y >= FLOOR + 12 || x === x0 || x === x1 ? P.e3 : P.e4)); // Kopfteil
  m.box(x0, FLOOR, z0 + 2, x1, FLOOR + 3, z1, (x, y, z) => (y === FLOOR + 3 ? P.e4 : (x === x0 || x === x1) && (z === z0 + 2 || z === z1) ? P.e3 : P.e2));
  m.box(x0 + 1, FLOOR + 4, z0 + 2, x1 - 1, FLOOR + 5, z1 - 1, P.s8); // Matratze
  const patch = [P.r3, P.b3, P.f5, P.g6, P.a1, P.e7, P.d4];
  m.box(x0, FLOOR + 6, z0 + 10, x1, FLOOR + 6, z1, (x, y, z) => (x === x0 || x === x1 || z === z1 ? P.r2 : patch[(Math.floor(x / 4) * 3 + Math.floor(z / 4) * 5 + Math.floor(hash3(Math.floor(x / 4), 0, Math.floor(z / 4), seed) * 3)) % patch.length]));
  m.box(x0, FLOOR + 3, z0 + 10, x0, FLOOR + 5, z1, P.r2).box(x1, FLOOR + 3, z0 + 10, x1, FLOOR + 5, z1, P.r2); // Decke hängt über
  m.box(x0 + 3, FLOOR + 6, z0 + 3, x0 + 10, FLOOR + 8, z0 + 7, P.s9); // Kissen
  m.box(x1 - 10, FLOOR + 6, z0 + 3, x1 - 3, FLOOR + 8, z0 + 7, P.a4);
  return { x0, x1, z0, z1 };
}

/** Kommode mit Radio (Rückwand, Westecke des Wohnraums). */
function dresser(m, x0, seed) {
  const x1 = x0 + 13;
  m.box(x0, FLOOR, 4, x1, FLOOR + 16, 11, (x, y, z) => {
    if (y === FLOOR + 16) return P.e6;
    if (z === 11 && (y === FLOOR + 5 || y === FLOOR + 11)) return P.e3; // Schubladenfugen
    if (z === 11 && x === Math.round((x0 + x1) / 2) && (y === FLOOR + 8 || y === FLOOR + 13 || y === FLOOR + 2)) return P.s6; // Knäufe
    return hash3(x, y, z, seed) > 0.97 ? P.e4 : P.e5;
  });
  // Radio mit Antenne
  m.box(x0 + 2, FLOOR + 17, 5, x0 + 9, FLOOR + 22, 9, P.s2);
  m.box(x0 + 3, FLOOR + 18, 9, x0 + 5, FLOOR + 21, 9, P.e8); // Lautsprecher
  m.set(x0 + 7, FLOOR + 20, 9, P.s6).set(x0 + 8, FLOOR + 19, 9, P.f6);
  m.line(x0 + 9, FLOOR + 23, 6, x0 + 13, FLOOR + 31, 6, P.s5);
  // Bücherstapel
  m.box(x0 + 10, FLOOR + 17, 6, x0 + 13, FLOOR + 17, 9, P.r3).box(x0 + 10, FLOOR + 18, 6, x0 + 13, FLOOR + 18, 9, P.b3);
  return { x0, x1 };
}

/** Tisch mit zwei Stühlen. */
function table(m, x0, z0) {
  const x1 = x0 + 23;
  const z1 = z0 + 15;
  for (const [lx, lz] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1]]) m.box(lx, FLOOR, lz, lx, FLOOR + 11, lz, P.e3);
  m.box(x0, FLOOR + 12, z0, x1, FLOOR + 13, z1, (x, y, z) => (y === FLOOR + 13 ? (z % 4 === 3 ? P.e5 : P.e6) : P.e4));
  // Tischdecke mit Karomuster in der Mitte
  m.box(x0 + 4, FLOOR + 14, z0 + 2, x1 - 4, FLOOR + 14, z1 - 2, (x, y, z) => ((Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? P.r3 : P.a4));
  // Stühle nördlich und südlich
  for (const [cz, back] of [[z0 - 6, z0 - 6], [z1 + 2, z1 + 5]]) {
    m.box(x0 + 8, FLOOR, cz, x0 + 15, FLOOR + 7, cz + 4, (x, y, z) => (y === FLOOR + 7 ? P.e6 : (x === x0 + 8 || x === x0 + 15) && (z === cz || z === cz + 4) ? P.e3 : null));
    m.box(x0 + 8, FLOOR + 8, back, x0 + 15, FLOOR + 15, back, (x, y) => (y === FLOOR + 15 || x === x0 + 8 || x === x0 + 15 || y === FLOOR + 11 ? P.e4 : null));
  }
  return { x0, x1, z0, z1 };
}

function plant(m, x0, z0, seed) {
  m.box(x0, FLOOR, z0, x0 + 5, FLOOR + 5, z0 + 5, (x, y) => (y === FLOOR + 5 ? P.r2 : P.r3));
  m.ellipsoid(x0 + 3, FLOOR + 12, z0 + 3, 5.5, 7.5, 5, (x, y, z) => (hash3(x, y, z, seed) < 0.28 ? null : y > FLOOR + 13 ? P.g7 : hash3(x, y, z, seed + 1) < 0.5 ? P.g5 : P.g6));
}

/** Holzkorb mit Scheiten. */
function woodBasket(m, x0, z0) {
  m.box(x0, FLOOR, z0, x0 + 7, FLOOR + 4, z0 + 5, (x, y, z) => ((x + y + z) % 2 ? P.e3 : P.e4));
  m.box(x0 + 1, FLOOR + 5, z0 + 1, x0 + 6, FLOOR + 6, z0 + 4, (x, y, z) => ((x + z) % 3 === 0 ? P.e7 : P.e5));
}

/** Teppich (auf dem Boden, ein Voxel hoch). */
function rug(m, x0, z0, x1, z1, colors) {
  m.box(x0, FLOOR, z0, x1, FLOOR, z1, (x, y, z) => {
    if (x === x0 || x === x1 || z === z0 || z === z1) return colors[0];
    if (x === x0 + 2 || x === x1 - 2 || z === z0 + 2 || z === z1 - 2) return colors[1];
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const d = Math.abs(x - cx) / (x1 - x0) + Math.abs(z - cz) / (z1 - z0);
    return d < 0.18 ? colors[3] : Math.floor(d * 12) % 2 ? colors[2] : colors[1];
  });
}

// --- Aufbau -----------------------------------------------------------------------

/**
 * Baut den Innenraum einer Ausbaustufe.
 * @returns {object} group, colliders, interactions, Lichtpunkte, Tür, Grenzen …
 */
export function createInterior({ seed, colliders, level = 1, materials }) {
  const rooms = roomsOf(level);
  const xW = rooms[0].x0 - 4; // Außenwand West
  const xE = rooms[rooms.length - 1].x1 + 4; // Außenwand Ost (letzte Spalte)
  const { x: ox, z: oz } = LAYOUT.interior;
  const wx = (vx) => ox + vx * U;
  const wz = (vz) => oz + vz * U;
  const m = new VoxelModel();
  const glass = new VoxelModel(); // Himmel in den Fenstern

  // Boden und Rückwand je Raum (die Wände zwischen zwei Räumen gehören dem westlichen)
  const roomAt = (x) => rooms.find((r) => x >= r.x0 - 4 && x <= r.x1)?.id || rooms[rooms.length - 1].id;
  m.box(xW, 0, 0, xE, FLOOR - 1, DEPTH - 1, (x, y, z) => (y < FLOOR - 1 ? P.e2 : floorColor(roomAt(x), x, z, seed)));
  m.box(xW, FLOOR, 0, xE, TOP, 3, (x, y) => wallColor(roomAt(x), x, y, seed + 1));
  // Seiten- und Trennwände (abgeschnitten, mit dunkler Schnittkante), Durchgänge dazwischen
  const walls = [xW, ...rooms.slice(1).map((r) => r.x0 - 4), xE - 3];
  walls.forEach((x0, i) => {
    const outer = i === 0 || i === walls.length - 1;
    for (let x = x0; x <= x0 + 3; x++) {
      for (let z = 4; z < DEPTH; z++) {
        if (!outer && z >= PASS.z0 && z <= PASS.z1) continue;
        for (let y = FLOOR; y <= FLOOR + CUT; y++) m.set(x, y, z, y === FLOOR + CUT ? P.e1 : z === DEPTH - 1 ? P.e3 : P.e4);
      }
    }
    if (!outer) {
      // Schwelle und Türpfosten am Durchgang
      m.box(x0, FLOOR - 1, PASS.z0, x0 + 3, FLOOR - 1, PASS.z1, P.e3);
      for (const z of [PASS.z0 - 1, PASS.z1 + 1]) m.box(x0 - 1, FLOOR, z, x0 + 4, FLOOR + CUT + 2, z, P.e2);
    }
    // Eckpfosten an der Rückwand in voller Höhe
    m.box(x0, FLOOR, 4, x0 + 3, TOP, 5, P.e2);
  });
  // Vorderwand (niedrig) mit der Haustür im Wohnraum
  for (let x = xW; x <= xE; x++) {
    if (x >= ENTRY.x0 && x <= ENTRY.x1) continue;
    for (let z = 80; z < DEPTH; z++) for (let y = FLOOR; y < FLOOR + FRONT; y++) m.set(x, y, z, y === FLOOR + FRONT - 1 ? P.e1 : z === DEPTH - 1 ? P.e3 : P.e4);
  }
  m.box(ENTRY.x0 - 1, FLOOR, 80, ENTRY.x0 - 1, FLOOR + FRONT + 2, 83, P.e2).box(ENTRY.x1 + 1, FLOOR, 80, ENTRY.x1 + 1, FLOOR + FRONT + 2, 83, P.e2);
  // Fußmatte innen an der Tür
  m.box(ENTRY.x0 + 1, FLOOR, 72, ENTRY.x1 - 1, FLOOR, 79, (x, y, z) => (x === ENTRY.x0 + 1 || x === ENTRY.x1 - 1 || z === 72 || z === 79 ? P.e3 : (x + z) % 2 ? P.f5 : P.e7));

  // --- Wohnraum (Stufe 1): Kamin, Kommode mit Radio, Tisch, Bettecke --------------------
  const kamin = fireplace(m, 184, seed);
  const dres = dresser(m, 150, seed);
  windowFrame(m, glass, 168, 181, 20, 37, seed, [P.r3, P.r2]);
  // Der Tisch steht eine Armlänge von der Trennwand weg – bei x = 154 versperrte er den
  // Durchgang zur Küche (m12-r1: Theo kam nicht hinein; die Teekanne rückt mit)
  const tab = table(m, 162, 44);
  rug(m, 180, 18, 219, 41, [P.r1, P.r3, P.f4, P.f6]);
  woodBasket(m, 176, 12);
  plant(m, 150, 68, seed);
  // Schlafecke, solange es kein Schlafzimmer gibt (danach steht dort eine Truhe)
  let bedBox = null;
  if (level < 3) {
    bedBox = bed(m, 226, 4, seed);
    windowFrame(m, glass, 228, 243, 24, 37, seed + 1, [P.b3, P.b2]);
    // Nachttisch mit Kerze
    m.box(216, FLOOR, 6, 223, FLOOR + 9, 12, (x, y) => (y === FLOOR + 9 ? P.e6 : x === 219 ? P.e3 : P.e5));
    m.box(219, FLOOR + 10, 9, 220, FLOOR + 13, 10, P.a4);
  } else {
    windowFrame(m, glass, 228, 243, 20, 37, seed + 1, [P.b3, P.b2]);
    // Truhe unter dem Fenster
    m.box(226, FLOOR, 5, 249, FLOOR + 9, 14, (x, y, z) => (y === FLOOR + 9 ? P.e5 : y === FLOOR + 6 || x === 226 || x === 249 ? P.e3 : P.e4));
    m.box(236, FLOOR + 4, 15, 239, FLOOR + 6, 15, P.s6);
  }

  // Weitere Räume (Stufen 2–5): eigene Einrichtung; Feuer und Lampen leuchten separat
  const fx = { flame: new VoxelModel(), glow: new VoxelModel() };
  for (const r of rooms) if (r.id !== 'wohnraum') ROOM_BUILDERS[r.id]?.(m, glass, r, seed, fx);

  // --- Darstellung ------------------------------------------------------------------
  const group = new THREE.Group();
  group.name = 'Innenraum';
  group.position.set(ox, -FLOOR * U, oz);
  const mesh = (model, material, { shadow = true, jitter = 0.04 } = {}) => {
    const visual = new THREE.Mesh(model.toGeometry({ jitter, seed, visibleOnly: true, size: U }), material);
    visual.castShadow = false;
    visual.receiveShadow = true;
    if (shadow) {
      const proxy = new THREE.Mesh(shadowGeometry(model, 'full', U), SHADOW_PROXY_MATERIAL);
      proxy.castShadow = true;
      proxy.layers.set(SHADOW_LAYER);
      visual.add(proxy);
    }
    return visual;
  };
  group.add(mesh(m, materials.room));
  group.add(mesh(glass, materials.sky, { shadow: false, jitter: 0 }));
  // Glut im Kamin und drei Flammenbilder
  group.add(mesh(fireplaceEmbers(kamin.x0), materials.flame, { shadow: false, jitter: 0 }));
  const flames = [0, 1, 2].map((f) => {
    const o = mesh(fireplaceFlames(kamin.x0, f), materials.flame, { shadow: false, jitter: 0 });
    o.visible = f === 0;
    group.add(o);
    return o;
  });
  // Pendelleuchte über dem Tisch (hier hängt die Tischlampe)
  const lampX = tab.x0 + 12;
  const lampZ = tab.z0 + 8;
  const pendant = new VoxelModel();
  pendant.box(lampX, FLOOR + 33, lampZ, lampX, TOP + 2, lampZ, P.s2); // Kette (hängt vom unsichtbaren Deckenbalken)
  pendant.box(lampX - 3, FLOOR + 30, lampZ - 3, lampX + 3, FLOOR + 32, lampZ + 3, (x, y, z) => (y === FLOOR + 32 || x === lampX - 3 || x === lampX + 3 || z === lampZ - 3 || z === lampZ + 3 ? P.g4 : null));
  pendant.box(lampX - 2, FLOOR + 33, lampZ - 2, lampX + 2, FLOOR + 33, lampZ + 2, P.g3);
  group.add(mesh(pendant, materials.room));
  const bulb = new VoxelModel().box(lampX - 1, FLOOR + 29, lampZ - 1, lampX + 1, FLOOR + 30, lampZ + 1, 0xffffff);
  group.add(mesh(bulb, materials.lamp, { shadow: false, jitter: 0 }));
  // Kerzen
  const candles = new VoxelModel();
  candles.set(kamin.x0 + 4, FLOOR + 27, 8, 0xffffff).set(kamin.x0 + 27, FLOOR + 26, 8, 0xffffff);
  if (level < 3) candles.set(219, FLOOR + 14, 9, 0xffffff);
  candles.merge(fx.glow);
  group.add(mesh(candles, materials.candle, { shadow: false, jitter: 0 }));
  if (fx.flame.cells.size) group.add(mesh(fx.flame, materials.flame, { shadow: false, jitter: 0 }));

  // Unsichtbare Decke und Südwand mit zwei Fenstern je Raum: Sonnenflecken statt Tageslicht von oben
  const roof = new VoxelModel();
  roof.box(xW, TOP + 1, 0, xE, TOP + 2, DEPTH - 1, 1);
  roof.box(xW, FLOOR + FRONT, DEPTH - 2, xE, TOP, DEPTH - 1, 1);
  for (const r of rooms) {
    const w = r.x1 - r.x0;
    for (const f of [0.22, 0.62]) {
      const a = r.x0 + Math.round(w * f);
      roof.remove(a, FLOOR + 16, DEPTH - 2, a + 13, FLOOR + 34, DEPTH - 1);
    }
  }
  const roofProxy = new THREE.Mesh(shadowGeometry(roof, 'full', U), SHADOW_PROXY_MATERIAL);
  roofProxy.castShadow = true;
  roofProxy.layers.set(SHADOW_LAYER);
  group.add(roofProxy);

  // --- Kollision (Weltkoordinaten) ------------------------------------------------------
  const own = [];
  const box = (x0, z0, x1, z1, tag) => own.push(colliders.addBox(wx(x0), wz(z0), wx(x1 + 1), wz(z1 + 1), tag));
  box(xW, 0, xE, 3, 'wand');
  walls.forEach((x0, i) => {
    const outer = i === 0 || i === walls.length - 1;
    if (outer) box(x0, 4, x0 + 3, DEPTH - 1, 'wand');
    else {
      box(x0, 4, x0 + 3, PASS.z0 - 1, 'wand');
      box(x0, PASS.z1 + 1, x0 + 3, DEPTH - 1, 'wand');
    }
  });
  box(xW, 80, ENTRY.x0 - 1, DEPTH - 1, 'wand');
  box(ENTRY.x1 + 1, 80, xE, DEPTH - 1, 'wand');
  box(ENTRY.x0 - 2, DEPTH + 3, ENTRY.x1 + 2, DEPTH + 5, 'wand'); // hinter der Tür geht es nur nach draußen
  box(kamin.x0 + 2, 4, kamin.x1 - 2, 12, 'kamin');
  box(dres.x0, 4, dres.x1, 11, 'kommode');
  box(tab.x0, tab.z0 - 6, tab.x1, tab.z1 + 5, 'tisch');
  box(176, 12, 183, 17, 'holzkorb');
  box(150, 68, 155, 73, 'pflanze');
  if (bedBox) {
    box(bedBox.x0, 4, bedBox.x1, bedBox.z1, 'bett');
    box(216, 6, 223, 12, 'nachttisch');
  } else box(226, 4, 249, 14, 'truhe');
  for (const r of rooms) for (const c of ROOM_COLLIDERS[r.id]?.(r) || []) box(...c);

  // --- Interaktionen (nur von drinnen) ------------------------------------------------
  const interactions = [
    { id: 'kamin', x: wx(kamin.x0 + 16), z: wz(16), radius: 1.5, prompt: 'kamin', dialog: 'kamin', inside: true },
    { id: 'radio', x: wx(dres.x0 + 7), z: wz(12), radius: 1.3, prompt: 'radio', dialog: 'radio', inside: true },
  ];
  let wakeSpot;
  if (bedBox) {
    interactions.push({ id: 'bett', x: wx(bedBox.x0 - 1), z: wz(22), radius: 1.4, prompt: 'schlafen', action: 'sleep', inside: true });
    wakeSpot = { x: wx(bedBox.x0 - 8), z: wz(30), facing: Math.PI * 0.1 };
  }
  for (const r of rooms) {
    const extra = ROOM_INTERACTIONS[r.id]?.(r, wx, wz);
    if (!extra) continue;
    interactions.push(...extra.interactions);
    if (extra.wakeSpot) wakeSpot = extra.wakeSpot;
  }

  const entry = { ...INTERIOR_ENTRY, facing: Math.PI };
  return {
    group,
    level,
    colliders: own,
    interactions,
    flames,
    wakeSpot,
    entry,
    // In diesem Streifen hinter der Tür geht es hinaus
    exit: { minX: wx(ENTRY.x0) + 0.12, maxX: wx(ENTRY.x1 + 1) - 0.12, minZ: wz(INNER_Z1 + 1) - 0.12 },
    bounds: { minX: wx(xW), maxX: wx(xE + 1), minZ: wz(0), maxZ: wz(DEPTH) },
    // Raum, in dem man als »drinnen« gilt (großzügig um das ganze Haus)
    area: { minX: wx(xW) - 2, maxX: wx(xE + 1) + 2, minZ: wz(0) - 2, maxZ: wz(DEPTH) + 2 },
    wallTop: TOP * U,
    lights: {
      kamin: new THREE.Vector3(wx(kamin.x0 + 16), 0.55, wz(13)),
      lampe: new THREE.Vector3(wx(tab.x0 + 12), (FLOOR + 27) * U - FLOOR * U, wz(tab.z0 + 8)),
    },
    rooms: rooms.map((r) => ({ id: r.id, minX: wx(r.x0), maxX: wx(r.x1 + 1) })),
    // M28: Kartenabend am Kamin – der Klapptisch steht auf dem Teppich vor dem Feuer
    // (world.cardSpot baut daraus Sitze und Blickpunkt wie draußen)
    cardAnchor: { x: wx(kamin.x0 + 16), z: wz(30) },
    // M28: Kaminsims – vorn an der Kante stehen die gewonnenen Einsätze
    mantel: { x0: wx(kamin.x0 + 1), x1: wx(kamin.x1), z: wz(12.5), y: 23 * U },
    // Lichtinseln für Lampen ohne eigenes Punktlicht (nachts, siehe lightPools.js)
    pools: rooms.flatMap((r) => (ROOM_POOLS[r.id] || []).map(([vx, vz, radius]) => ({ x: wx(vx), z: wz(vz), radius }))),
  };
}

// --- Weitere Räume (Meilenstein 11b) ----------------------------------------------------

// Jeder Raum: Einrichtung (Voxel), Kollision [x0, z0, x1, z1, Name], Interaktionen, Lichtinseln.
// Koordinaten im Voxel-Raster des Innenraums; Rückwand bis z = 3, Vorderwand ab z = 80.

const ROOM_BUILDERS = {
  /** Küche (Stufe 2): Herd, Anrichte, Spülstein mit Pumpe unterm Fenster, Tisch mit Kürbissen. */
  kueche(m, glass, r, seed, fx) {
    // Anrichte mit Schränken und heller Arbeitsplatte
    m.box(77, FLOOR, 4, 96, FLOOR + 11, 11, (x, y, z) => {
      if (z === 11 && (x === 86 || y === FLOOR + 5)) return P.e3;
      if (z === 11 && (x === 84 || x === 88) && y === FLOOR + 8) return P.s6;
      return y === FLOOR ? P.e3 : P.e5;
    });
    m.box(77, FLOOR + 12, 4, 96, FLOOR + 12, 12, P.e7);
    m.box(80, FLOOR + 13, 7, 87, FLOOR + 13, 11, P.e6); // Schneidebrett
    m.ellipsoid(84, FLOOR + 14.5, 9, 3, 1.6, 2, P.e7); // Brot
    m.box(90, FLOOR + 13, 6, 92, FLOOR + 16, 8, P.a5).box(93, FLOOR + 13, 6, 95, FLOOR + 15, 8, P.f5); // Gläser
    // Regal mit Einmachgläsern, darüber Kräuterbündel an einer Leiste
    m.box(78, FLOOR + 25, 4, 95, FLOOR + 25, 8, P.e4);
    for (let x = 79; x <= 93; x += 3) m.box(x, FLOOR + 26, 5, x + 1, FLOOR + 28, 7, [P.f5, P.a0, P.g6, P.r3, P.f6][(x / 3) % 5 | 0]);
    m.box(78, FLOOR + 38, 4, 95, FLOOR + 38, 5, P.e3);
    for (let x = 79; x <= 94; x += 4) {
      const c = [P.g5, P.g6, P.a2, P.f6][(x / 4) % 4 | 0];
      m.box(x, FLOOR + 33, 5, x + 1, FLOOR + 37, 5, c);
      m.set(x, FLOOR + 32, 5, c);
    }
    // Gusseiserner Herd mit Backofentür, Feuerloch, Topf, Kessel und Ofenrohr
    const hx = 99;
    m.box(hx, FLOOR, 4, hx + 23, FLOOR + 13, 13, (x, y, z) => {
      if (y === FLOOR + 13) return (x + z) % 6 === 0 ? P.s3 : P.s2;
      if (z === 13 && x >= hx + 3 && x <= hx + 12 && y >= FLOOR + 3 && y <= FLOOR + 10) return x === hx + 3 || x === hx + 12 || y === FLOOR + 3 || y === FLOOR + 10 ? P.s5 : P.s1;
      if (z === 13 && y === FLOOR + 11) return P.s6; // Stange
      return y === FLOOR ? P.s1 : P.s2;
    });
    m.remove(hx + 16, FLOOR + 4, 13, hx + 20, FLOOR + 7, 13); // Feuerloch
    for (let x = hx + 16; x <= hx + 20; x++) for (let y = FLOOR + 4; y <= FLOOR + 7; y++) fx.flame.set(x, y, 12, y > FLOOR + 5 ? P.f5 : P.f3);
    m.box(hx + 18, FLOOR + 14, 5, hx + 20, TOP + 2, 7, (x, y) => (y % 8 === 0 ? P.s4 : P.s3));
    m.cylinder(hx + 6.5, 8.5, FLOOR + 14, FLOOR + 18, 3.3, (x, y) => (y === FLOOR + 18 ? P.s6 : P.s5));
    m.box(hx + 5, FLOOR + 19, 8, hx + 8, FLOOR + 19, 9, P.s4);
    m.box(hx + 11, FLOOR + 14, 7, hx + 14, FLOOR + 16, 10, P.r3); // Kessel
    m.set(hx + 15, FLOOR + 16, 8, P.r3).set(hx + 16, FLOOR + 17, 8, P.r3);
    m.box(hx + 12, FLOOR + 17, 8, hx + 13, FLOOR + 17, 9, P.s4);
    // Spülstein mit Handpumpe unter dem Fenster
    windowFrame(m, glass, 127, 140, 22, 37, seed + 3, [P.a4, P.s8]);
    m.box(125, FLOOR, 4, 142, FLOOR + 10, 11, (x, y, z) => (y === FLOOR + 10 ? P.s7 : (x + y) % 5 === 0 ? P.s5 : P.s6));
    m.remove(127, FLOOR + 8, 5, 140, FLOOR + 10, 10);
    m.box(127, FLOOR + 7, 5, 140, FLOOR + 7, 10, P.b4); // Wasser
    m.box(131, FLOOR + 11, 5, 132, FLOOR + 19, 6, P.s3);
    m.box(129, FLOOR + 17, 7, 131, FLOOR + 17, 7, P.s3); // Auslauf
    m.line(132, FLOOR + 19, 5, 136, FLOOR + 22, 5, P.s4); // Schwengel
    // Küchentisch mit Kürbissen, Brotkorb und Hocker
    for (const [lx, lz] of [[97, 45], [118, 45], [97, 56], [118, 56]]) m.box(lx, FLOOR, lz, lx, FLOOR + 11, lz, P.e3);
    m.box(96, FLOOR + 12, 44, 119, FLOOR + 13, 57, (x, y, z) => (y === FLOOR + 13 ? (z % 4 === 3 ? P.e6 : P.e7) : P.e5));
    for (const [cx, cz, rad] of [[102, 49, 3.2], [108, 52, 2.4]]) {
      m.ellipsoid(cx, FLOOR + 14 + rad * 0.8, cz, rad, rad * 0.8, rad, (x) => ((x - cx) % 2 === 0 ? P.f4 : P.f5));
      m.box(cx, FLOOR + 14 + Math.ceil(rad * 1.6), cz, cx, FLOOR + 15 + Math.ceil(rad * 1.6), cz, P.g4);
    }
    m.box(112, FLOOR + 14, 47, 117, FLOOR + 16, 52, (x, y, z) => (y === FLOOR + 16 && x > 112 && x < 117 && z > 47 && z < 52 ? P.e8 : (x + z) % 2 ? P.e5 : P.e4));
    m.box(104, FLOOR, 60, 109, FLOOR + 7, 64, (x, y, z) => (y === FLOOR + 7 ? P.e6 : (x === 104 || x === 109) && (z === 60 || z === 64) ? P.e3 : null));
  },

  /** Schlafzimmer (Stufe 3): Doppelbett unterm Fenster, Nachttisch mit Lampe, Kleiderschrank. */
  schlafzimmer(m, glass, r, seed, fx) {
    windowFrame(m, glass, 282, 297, 27, 37, seed + 4, [P.a1, P.a0]);
    const x0 = 276;
    const x1 = 303;
    m.box(x0, FLOOR, 4, x1, FLOOR + 17, 5, (x, y) => (y >= FLOOR + 16 || x === x0 || x === x1 ? P.e2 : (x - x0) % 4 === 0 ? P.e3 : P.e4)); // Kopfteil
    m.box(x0, FLOOR + 18, 4, x1, FLOOR + 18, 5, (x) => ((x - x0) % 3 === 1 ? P.e3 : null));
    m.box(x0, FLOOR, 6, x1, FLOOR + 3, 39, (x, y, z) => (y === FLOOR + 3 ? P.e4 : (x === x0 || x === x1) && (z === 6 || z === 39) ? P.e2 : P.e3));
    m.box(x0 + 1, FLOOR + 4, 6, x1 - 1, FLOOR + 6, 38, P.s9); // Matratze
    // Daunendecke mit Karos, umgeschlagener Rand
    m.box(x0, FLOOR + 7, 15, x1, FLOOR + 7, 39, (x, y, z) => (z === 15 ? P.a4 : (Math.floor(x / 3) + Math.floor(z / 3)) % 2 ? P.b4 : P.b3));
    m.box(x0, FLOOR + 4, 15, x0, FLOOR + 6, 39, P.b2).box(x1, FLOOR + 4, 15, x1, FLOOR + 6, 39, P.b2);
    m.box(x0 + 3, FLOOR + 7, 7, x0 + 12, FLOOR + 9, 12, P.a4).box(x1 - 12, FLOOR + 7, 7, x1 - 3, FLOOR + 9, 12, P.s9); // Kissen
    m.box(x0 + 14, FLOOR + 8, 24, x0 + 17, FLOOR + 9, 27, P.r3); // Buch auf der Decke
    // Nachttisch mit Lampe
    m.box(266, FLOOR, 6, 273, FLOOR + 10, 13, (x, y, z) => (y === FLOOR + 10 ? P.e6 : z === 13 && y === FLOOR + 5 ? P.e3 : P.e5));
    m.box(268, FLOOR + 11, 8, 271, FLOOR + 11, 11, P.s3).box(269, FLOOR + 12, 9, 270, FLOOR + 16, 10, P.s4);
    fx.glow.box(267, FLOOR + 17, 7, 272, FLOOR + 20, 12, (x, y, z) => ((x === 267 || x === 272) && (z === 7 || z === 12) ? null : 0xffffff));
    // Kleiderschrank
    m.box(307, FLOOR, 4, 322, FLOOR + 33, 13, (x, y, z) => {
      if (y === FLOOR + 33 || y === FLOOR) return P.e3;
      if (z === 13 && (x === 314 || x === 315)) return P.e3;
      if (z === 13 && (x === 313 || x === 316) && y === FLOOR + 17) return P.s6;
      return (x + y) % 11 === 0 ? P.e4 : P.e5;
    });
    m.box(309, FLOOR + 34, 6, 314, FLOOR + 36, 11, P.a4); // Hutschachtel
    rug(m, 272, 43, 307, 55, [P.b1, P.b3, P.a4, P.b5]);
  },

  /** Werkstatt (Stufe 4): Werkbank mit Werkzeugwand, Bretterstapel, Sägebock, Nagelfass. */
  werkstatt(m, glass, r, seed, fx) {
    // Werkbank mit dicker Platte und Schraubstock
    for (const [lx, lz] of [[11, 5], [40, 5], [11, 14], [40, 14]]) m.box(lx, FLOOR, lz, lx + 1, FLOOR + 11, lz + 1, P.e3);
    m.box(10, FLOOR + 3, 5, 41, FLOOR + 3, 15, P.e4); // Ablage unten
    m.box(10, FLOOR + 12, 4, 41, FLOOR + 13, 15, (x, y, z) => (y === FLOOR + 13 ? ((x + z) % 7 === 0 ? P.e5 : P.e7) : P.e5));
    m.box(37, FLOOR + 14, 12, 41, FLOOR + 17, 15, P.s3).box(38, FLOOR + 18, 13, 40, FLOOR + 18, 13, P.s5); // Schraubstock
    m.box(16, FLOOR + 14, 9, 23, FLOOR + 14, 10, P.s6).box(16, FLOOR + 14, 11, 17, FLOOR + 14, 12, P.e3); // Säge
    m.box(27, FLOOR + 14, 8, 28, FLOOR + 14, 13, P.e3).box(26, FLOOR + 15, 8, 29, FLOOR + 16, 9, P.s4); // Hammer
    // Werkzeugwand
    m.box(12, FLOOR + 19, 4, 39, FLOOR + 33, 4, (x, y) => ((x + y) % 4 === 0 ? P.e5 : P.e7));
    m.line(14, FLOOR + 30, 5, 20, FLOOR + 22, 5, P.s6); // Säge
    m.box(14, FLOOR + 29, 5, 16, FLOOR + 31, 5, P.e3);
    m.box(23, FLOOR + 21, 5, 23, FLOOR + 30, 5, P.e3).box(22, FLOOR + 29, 5, 25, FLOOR + 31, 5, P.s4); // Hammer
    m.box(28, FLOOR + 22, 5, 28, FLOOR + 31, 5, P.s5).box(27, FLOOR + 30, 5, 29, FLOOR + 31, 5, P.s5); // Schlüssel
    m.ellipsoid(34.5, FLOOR + 26.5, 5, 3, 3, 1, (x, y) => ((x + y) % 2 ? P.e8 : P.e7)); // Seilrolle
    // Lampe über der Werkbank
    m.box(26, FLOOR + 36, 9, 26, TOP + 2, 9, P.s2);
    m.box(23, FLOOR + 34, 6, 29, FLOOR + 35, 12, P.s3);
    fx.glow.box(25, FLOOR + 33, 8, 27, FLOOR + 33, 10, 0xffffff);
    // Fenster, darunter der Bretterstapel
    windowFrame(m, glass, 50, 63, 22, 37, seed + 5, null);
    for (let k = 0; k < 5; k++) m.box(48, FLOOR + k * 2, 5 + (k % 2), 67, FLOOR + k * 2 + 1, 13 + (k % 2), (x, y, z) => (x === 48 || x === 67 ? P.e8 : [P.e5, P.e6, P.e4][(k + y) % 3]));
    // Sägebock mit Brett
    for (const bx of [20, 34]) {
      m.line(bx, FLOOR, 44, bx + 1, FLOOR + 9, 47, P.e3);
      m.line(bx, FLOOR, 51, bx + 1, FLOOR + 9, 48, P.e3);
    }
    m.box(18, FLOOR + 10, 46, 37, FLOOR + 10, 49, P.e6);
    for (const [sx, sz] of [[24, 52], [29, 55], [33, 50], [21, 57]]) m.set(sx, FLOOR, sz, P.e8); // Späne
    // Nagelfass
    m.cylinder(60.5, 40.5, FLOOR, FLOOR + 11, 4.2, (x, y) => (y % 5 === 2 ? P.s3 : P.e4));
    m.cylinder(60.5, 40.5, FLOOR + 12, FLOOR + 12, 3.2, P.s5);
  },

  /** Lager (Stufe 5): Regale, Fässer, Kistenstapel, Säcke, eine Laterne. */
  lager(m, glass, r, seed, fx) {
    // Regalwand mit vier Böden
    m.box(330, FLOOR, 4, 385, FLOOR + 37, 10, (x, y, z) => {
      if (x === 330 || x === 385 || (x - 330) % 14 === 0) return P.e3;
      if ((y - FLOOR) % 9 === 0) return P.e4;
      return null;
    });
    for (let shelf = 0; shelf < 4; shelf++) {
      const y0 = FLOOR + 1 + shelf * 9;
      for (let x = 332; x <= 382; x += 6) {
        const h = hash3(x, shelf, 0, seed);
        if (h < 0.2) continue;
        if (h < 0.5) m.box(x, y0, 5, x + 4, y0 + 5, 9, (xx, yy) => (yy === y0 + 5 ? P.e6 : (xx + yy) % 3 ? P.e5 : P.e4)); // Kiste
        else if (h < 0.75) m.box(x + 1, y0, 6, x + 3, y0 + 4, 8, [P.a0, P.f5, P.g6, P.a5][Math.floor(h * 17) % 4]); // Glas
        else m.ellipsoid(x + 2.5, y0 + 2.5, 7, 2.5, 2.8, 2, P.e8); // Sack
      }
    }
    // Fässer
    for (const cx of [338.5, 348.5]) {
      m.cylinder(cx, 22.5, FLOOR, FLOOR + 13, 4.6, (x, y) => (y === FLOOR + 2 || y === FLOOR + 11 ? P.s3 : (x + y) % 3 ? P.e4 : P.e5));
      m.cylinder(cx, 22.5, FLOOR + 14, FLOOR + 14, 3.6, P.e3);
    }
    // Kistenstapel
    for (const [cx, cy, cz] of [[364, 0, 16], [374, 0, 16], [364, 0, 26], [374, 0, 27], [369, 9, 20]]) {
      m.box(cx, FLOOR + cy, cz, cx + 8, FLOOR + cy + 8, cz + 8, (x, y, z) => (x === cx || x === cx + 8 || y === FLOOR + cy + 8 || y === FLOOR + cy ? P.e3 : (x + z) % 4 === 0 ? P.e4 : P.e5));
    }
    // Säcke
    for (const [sx, sz, h] of [[352, 52, 4], [358, 54, 3.5], [355, 59, 3.2]]) m.ellipsoid(sx, FLOOR + h, sz, 3.6, h, 3, (x, y) => (y > FLOOR + h * 1.4 ? P.e7 : P.e8));
    // Laterne an einem Haken
    m.box(357, FLOOR + 30, 30, 357, TOP + 2, 30, P.s2);
    m.box(355, FLOOR + 22, 28, 359, FLOOR + 22, 32, P.s2).box(355, FLOOR + 29, 28, 359, FLOOR + 29, 32, P.s2);
    fx.glow.box(356, FLOOR + 23, 29, 358, FLOOR + 28, 31, 0xffffff);
  },
};

const ROOM_COLLIDERS = {
  kueche: () => [[77, 4, 96, 12, 'anrichte'], [99, 4, 122, 13, 'herd'], [125, 4, 142, 11, 'spuele'], [96, 44, 119, 57, 'tisch'], [104, 60, 109, 64, 'hocker']],
  schlafzimmer: () => [[276, 4, 303, 39, 'bett'], [266, 6, 273, 13, 'nachttisch'], [307, 4, 322, 13, 'schrank']],
  werkstatt: () => [[10, 4, 41, 15, 'werkbank'], [48, 5, 67, 14, 'bretter'], [18, 44, 37, 51, 'saegebock'], [56, 36, 65, 45, 'fass']],
  lager: () => [[330, 4, 385, 10, 'regal'], [333, 17, 354, 28, 'faesser'], [364, 16, 383, 35, 'kisten'], [348, 49, 362, 62, 'saecke']],
};

const ROOM_INTERACTIONS = {
  kueche: (r, wx, wz) => ({ interactions: [{ id: 'herd', x: wx(110), z: wz(16), radius: 1.4, prompt: 'herd', dialog: 'herd', inside: true }] }),
  schlafzimmer: (r, wx, wz) => ({
    interactions: [{ id: 'bett', x: wx(274), z: wz(24), radius: 1.4, prompt: 'schlafen', action: 'sleep', inside: true }],
    wakeSpot: { x: wx(268), z: wz(32), facing: Math.PI * 0.1 },
  }),
  werkstatt: (r, wx, wz) => ({ interactions: [{ id: 'werkbank-innen', x: wx(26), z: wz(18), radius: 1.5, prompt: 'werkbank', use: 'werkbank', inside: true }] }),
  lager: (r, wx, wz) => ({ interactions: [{ id: 'lager', x: wx(357), z: wz(14), radius: 1.6, prompt: 'lager', dialog: 'lager', inside: true }] }),
};

/** Lichtinseln [x, z, Radius in m]: Herd, Nachttischlampe, Werkstattlampe, Laterne im Lager. */
const ROOM_POOLS = {
  kueche: [[117, 18, 2.2]],
  schlafzimmer: [[270, 16, 1.8]],
  werkstatt: [[26, 14, 2.4]],
  lager: [[357, 32, 2.6]],
};

export { FLOOR as INTERIOR_FLOOR, TOP as INTERIOR_TOP };
