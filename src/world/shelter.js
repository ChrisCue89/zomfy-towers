// Die Notunterkunft: eine zusammengezimmerte Bretterhütte mit Blechdach,
// Vordach, Lichterkette und einem kleinen, warmen Innenraum.
//
// Voxel-Koordinaten: Ursprung Südwest-Ecke am Boden, x nach Osten (0..39),
// z nach Süden (0..27, Vorderseite bei z = 27), y nach oben.
// Betritt die Spielfigur das Haus, werden Dach und Vorderwand gerastert
// ausgeblendet (FADE), damit man hineinsieht.

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

function buildBase(seed) {
  const m = new VoxelModel();
  // Unterbau aus Paletten
  m.box(0, 0, 0, W - 1, 1, D - 1, (x, y, z) => {
    const edge = z === D - 1 || x === 0 || x === W - 1;
    if (edge && (z === D - 1 ? x : z) % 8 === 7) return P.e2;
    return y === 1 ? P.e4 : P.e3;
  });
  // Dielen, darauf ein warmer Flickenteppich
  m.box(0, 2, 0, W - 1, 2, D - 1, (x, y, z) => {
    const rugX = x >= 14 && x <= 26;
    const rugZ = z >= 11 && z <= 20;
    if (rugX && rugZ) {
      const border = x === 14 || x === 26 || z === 11 || z === 20;
      if (border) return P.r2;
      return (x + z) % 4 === 0 ? P.f4 : (Math.floor(z / 2) % 2 === 0 ? P.r3 : P.r4);
    }
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

  // --- Einrichtung ---
  // Bett mit Kopfteil, Matratze, Flickendecke und Kissen
  m.box(1, FLOOR, 2, 1, FLOOR + 5, 9, P.e3);
  m.box(2, FLOOR, 2, 14, FLOOR, 9, (x) => (x % 4 === 0 ? P.e2 : P.e4));
  m.box(2, FLOOR + 1, 2, 14, FLOOR + 1, 9, P.s8);
  m.box(5, FLOOR + 2, 2, 14, FLOOR + 2, 9, (x, y, z) => {
    const patch = [P.r3, P.b3, P.f5, P.g6, P.a1, P.e7];
    return patch[(Math.floor(x / 2) * 3 + Math.floor(z / 2)) % patch.length];
  });
  m.box(2, FLOOR + 2, 3, 4, FLOOR + 2, 8, P.s9);
  // Nachttisch (Kiste) mit Kerze
  m.box(2, FLOOR, 11, 4, FLOOR + 3, 13, (x, y) => (y === FLOOR + 3 ? P.e6 : x === 3 ? P.e4 : P.e5));
  m.box(3, FLOOR + 4, 12, 3, FLOOR + 4, 12, P.a4);
  // Ofen mit Rohr
  m.box(30, FLOOR, 2, 34, FLOOR, 6, (x, y, z) => ((x === 30 || x === 34) && (z === 2 || z === 6) ? P.s1 : null));
  m.box(30, FLOOR + 1, 2, 34, FLOOR + 6, 6, (x, y, z) => (y === FLOOR + 6 ? P.s3 : z === 6 ? P.s2 : P.s1));
  m.remove(31, FLOOR + 2, 6, 33, FLOOR + 3, 6); // Sichtfenster (leuchtet separat)
  m.box(31, FLOOR + 7, 3, 32, roofHeight(32) - 2, 4, (x, y) => (y % 5 === 0 ? P.s3 : P.s2));
  m.box(29, FLOOR + 7, 4, 29, FLOOR + 8, 5, P.b3); // Kessel
  m.set(28, FLOOR + 8, 4, P.s6);
  // Holzkorb
  m.box(35, FLOOR, 2, 37, FLOOR + 1, 4, P.e3);
  m.box(35, FLOOR + 2, 2, 37, FLOOR + 2, 4, (x, y, z) => ((x + z) % 2 ? P.e7 : P.e4));
  // Tisch unter dem Fenster
  for (const [lx, lz] of [[23, 22], [32, 22], [23, 25], [32, 25]]) m.box(lx, FLOOR, lz, lx, FLOOR + 5, lz, P.e4);
  m.box(23, FLOOR + 6, 22, 32, FLOOR + 6, 25, (x, y, z) => (z === 25 ? P.e5 : P.e6));
  m.box(25, FLOOR + 7, 23, 25, FLOOR + 8, 23, P.b3); // Becher
  m.box(27, FLOOR + 7, 23, 28, FLOOR + 7, 24, P.r3); // Buch
  m.box(27, FLOOR + 8, 23, 28, FLOOR + 8, 24, P.a4);
  m.box(30, FLOOR + 7, 23, 30, FLOOR + 7, 23, P.s6); // Lampenfuß
  // Stuhl
  m.box(26, FLOOR, 18, 28, FLOOR + 3, 20, (x, y, z) => (y === FLOOR + 3 ? P.e6 : (x === 26 || x === 28) && (z === 18 || z === 20) ? P.e4 : null));
  m.box(26, FLOOR + 4, 18, 28, FLOOR + 7, 18, (x, y) => (y === FLOOR + 7 || x !== 27 ? P.e4 : null));
  // Regal an der Rückwand mit Dosen und Radio
  m.box(16, 12, 1, 27, 12, 2, P.e5);
  m.box(16, 17, 1, 27, 17, 2, P.e5);
  [[17, P.s6], [19, P.r3], [21, P.f5], [23, P.b3], [25, P.s6]].forEach(([x, c]) => {
    m.box(x, 13, 1, x, 14, 1, c);
    m.set(x, 15, 1, P.s7);
  });
  m.box(18, 18, 1, 21, 20, 2, P.s2); // Radio
  m.set(19, 19, 2, P.e8).set(20, 19, 2, P.s6).set(21, 20, 2, P.f6);
  m.line(21, 21, 1, 23, 25, 1, P.s5); // Antenne
  // Kiste neben der Tür, Pflanze
  m.box(2, FLOOR, 21, 6, FLOOR + 3, 25, (x, y, z) => (y === FLOOR + 3 ? P.e6 : (x + y) % 3 === 0 ? P.e3 : P.e5));
  m.box(17, FLOOR, 24, 18, FLOOR + 1, 25, P.r3);
  m.box(16, FLOOR + 2, 23, 19, FLOOR + 3, 26, (x, y, z) => (hash3(x, y, z, seed) < 0.35 ? null : y === FLOOR + 3 ? P.g6 : P.g5));

  // Stufe vor der Tür
  m.box(8, 0, 28, 16, 1, 30, (x, y, z) => (y === 1 ? (z === 30 ? P.e5 : P.e6) : P.e3));
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

function buildStoveGlow() {
  return new VoxelModel().box(31, FLOOR + 2, 6, 33, FLOOR + 3, 6, 0xffffff);
}

function buildTableLampGlow() {
  const m = new VoxelModel();
  m.box(30, FLOOR + 8, 23, 30, FLOOR + 9, 23, 0xffffff);
  return m;
}

function buildCandleGlow() {
  return new VoxelModel().set(3, FLOOR + 5, 12, 0xffffff);
}

/**
 * Baut die Notunterkunft.
 * @returns {object} group, fade-Uniform, Lichtpositionen, Interaktionen, Kollision
 */
export function createShelter({ seed, colliders }) {
  const { x: ox, z: oz } = LAYOUT.shelter;
  const group = new THREE.Group();
  group.name = 'Notunterkunft';
  group.position.set(ox, 0, oz);

  const baseMat = createWorldMaterial({ occluder: true });
  const fadeMat = createWorldMaterial({ occluder: true, fade: true });
  const fade = fadeMat.userData.fade;

  const glow = {
    window: createGlowMaterial(0xffffff, { fade: true, fadeUniform: fade }),
    fairy: createGlowMaterial(0xffffff, { fade: true, fadeUniform: fade, vertexColors: true }),
    lantern: createGlowMaterial(0xffffff, { occluder: true, fade: true, fadeUniform: fade }),
    stove: createGlowMaterial(0xffffff),
    lamp: createGlowMaterial(0xffffff),
    candle: createGlowMaterial(0xffffff),
  };

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

  const base = mesh(buildBase(seed), baseMat);
  const front = mesh(buildFront(seed), fadeMat);
  const roofParts = buildRoof(seed);
  const roof = mesh(roofParts.model, fadeMat);
  const awning = mesh(buildAwning(), fadeMat);
  const windowGlass = mesh(buildWindowGlass(), glow.window, { shadow: 'none', jitter: 0 });
  const fairyWire = mesh(buildFairyWire(), fadeMat, { shadow: 'none' });
  const fairy = mesh(buildFairyLights(), glow.fairy, { shadow: 'none', jitter: 0 });
  const lanternGlass = mesh(buildLanternGlass(), glow.lantern, { shadow: 'none', jitter: 0 });
  const stoveGlow = mesh(buildStoveGlow(), glow.stove, { shadow: 'none', jitter: 0 });
  const lampGlow = mesh(buildTableLampGlow(), glow.lamp, { shadow: 'none', jitter: 0 });
  const candleGlow = mesh(buildCandleGlow(), glow.candle, { shadow: 'none', jitter: 0 });

  // Tür mit Drehpunkt an der Angel
  const doorPivot = new THREE.Group();
  doorPivot.position.set(DOOR.x0 * V, FLOOR * V, (D - 1) * V);
  // Die Tür dreht sich: alle Flächen, wirft selbst Schatten.
  const door = new THREE.Mesh(buildDoor(seed).toGeometry({ jitter: 0.05, seed }), fadeMat);
  door.castShadow = true;
  door.receiveShadow = true;
  doorPivot.add(door);

  group.add(base, front, roof, awning, windowGlass, fairyWire, fairy, lanternGlass, stoveGlow, lampGlow, candleGlow, doorPivot);

  // --- Kollision (Weltkoordinaten) ---
  const wx = (vx) => ox + vx * V;
  const wz = (vz) => oz + vz * V;
  colliders.addBox(wx(0), wz(0), wx(1), wz(D), 'wand');
  colliders.addBox(wx(W - 1), wz(0), wx(W), wz(D), 'wand');
  colliders.addBox(wx(0), wz(0), wx(W), wz(1), 'wand');
  colliders.addBox(wx(0), wz(D - 1), wx(DOOR.x0), wz(D), 'wand');
  colliders.addBox(wx(DOOR.x1 + 1), wz(D - 1), wx(W), wz(D), 'wand');
  colliders.addBox(wx(1), wz(2), wx(15), wz(10), 'bett');
  colliders.addBox(wx(2), wz(11), wx(5), wz(14), 'nachttisch');
  colliders.addBox(wx(30), wz(2), wx(38), wz(7), 'ofen');
  colliders.addBox(wx(23), wz(22), wx(33), wz(26), 'tisch');
  colliders.addBox(wx(26), wz(18), wx(29), wz(21), 'stuhl');
  colliders.addBox(wx(2), wz(21), wx(7), wz(26), 'kiste');
  colliders.addBox(wx(16), wz(23), wx(20), wz(26), 'pflanze');
  colliders.addCircle(wx(5.5), wz(40.5), 0.12);
  colliders.addCircle(wx(20.5), wz(40.5), 0.12);

  const toWorld = (vx, vy, vz) => new THREE.Vector3(wx(vx), vy * V, wz(vz));

  return {
    group,
    fade,
    door: { pivot: doorPivot, hinge: toWorld(DOOR.x0, 0, D), center: toWorld((DOOR.x0 + DOOR.x1 + 1) / 2, 0, D), angle: 0 },
    glow,
    lights: {
      porch: toWorld(12.5, 11.5, 40.5),
      table: toWorld(30.5, FLOOR + 10, 23.5),
      stove: toWorld(32.5, FLOOR + 3, 8),
    },
    chimney: toWorld(roofParts.chimneyTop.x, roofParts.chimneyTop.y, roofParts.chimneyTop.z),
    interior: { minX: wx(1), maxX: wx(W - 1), minZ: wz(1), maxZ: wz(D - 1) },
    floorHeight: FLOOR * V,
    heightZones: [
      { minX: wx(0), maxX: wx(W), minZ: wz(0), maxZ: wz(D), y: FLOOR * V },
      { minX: wx(8), maxX: wx(17), minZ: wz(D), maxZ: wz(31), y: 2 * V },
    ],
    // inside: nur von drinnen benutzbar (nicht durch die Wand)
    interactions: [
      { id: 'bett', x: wx(8), z: wz(8), radius: 1.35, prompt: 'schlafen', action: 'sleep', inside: true },
      { id: 'radio', x: wx(20), z: wz(3), radius: 1.3, prompt: 'radio', dialog: 'radio', inside: true },
      { id: 'ofen', x: wx(32), z: wz(6), radius: 1.2, prompt: 'ofen', dialog: 'ofen', inside: true },
    ],
    // Bereich, in dem die Figur nach dem Schlafen steht
    wakeSpot: { x: wx(9), z: wz(13), facing: Math.PI * 0.1 },
  };
}

export { W as SHELTER_WIDTH, D as SHELTER_DEPTH };
