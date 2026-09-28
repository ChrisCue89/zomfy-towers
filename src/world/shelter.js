// Das alte Fischerhaus von außen: eine zusammengezimmerte Bretterhütte mit
// Blechdach, Vordach und Lichterkette, ab Stufe 2 mit Anbau und Veranda.
// Seit Meilenstein 11 ist das Innere ein eigenes Bild (world/interior.js): Wer
// in die Tür geht, ist drinnen; das Haus selbst bleibt von außen geschlossen,
// nachts leuchten die Fenster.
//
// Seit M13g doppelt fein (1/32 m, gut 2 px je Voxel). Die Modelle rechnen in
// diesen Voxeln: Ursprung Südwest-Ecke am Boden, x nach Osten (0..159), z nach
// Süden (0..111, Vorderseite bei z = 111), y nach oben. Kollision, Grundfläche
// und Tür bleiben in 1/8 m (W, D, DOOR). Die Kamera sieht nur Dach,
// Vorderseite und alles davor – dort sitzen die Einzelheiten (Fugen, Nägel,
// Maserung, Schrauben, Rost); Seitenwände tragen nur Schatten.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { createWorldMaterial, createGlowMaterial } from '../render/materials.js';
import { SHADOW_LAYER, SHADOW_PROXY_MATERIAL, shadowGeometry } from '../render/staticMesh.js';
import { hash3 } from '../core/rng.js';
import { LAYOUT, V } from './layout.js';
import { FINE32, shade, boardColor, deckColor } from './voxelKit.js';

// Grobe Maße (1/8 m): Kollision, Grundfläche, Tür
const W = 40; // Breite in Voxeln (x)
const D = 28; // Tiefe in Voxeln (z)
const FLOOR = 3; // Oberkante Fußboden (erste freie Voxelschicht)
const DOOR = { x0: 9, x1: 15, y1: 18 }; // Türöffnung inkl. Grenzen

// Feine Maße (1/32 m): die Modelle
const FW = W * 4; // 160
const FD = D * 4; // 112
const FZ = FD - 1; // Außenhaut der Vorderwand
const FFLOOR = FLOOR * 4; // 12
const FTOP = 91; // oberste Wandschicht
const FDOOR = { x0: 36, x1: 63, y1: 75 };
const FWIN = { x0: 100, x1: 127, y0: 36, y1: 63, mx: 113, my: 49 }; // Glas, Sprossen bei mx/my (je zwei breit)
const BATTENS = [20, 76]; // Querlatten, je drei Schichten hoch
const FRAME = [P.s8, P.s7]; // weiß gestrichene Rahmen (hell, Schattenkante)

/** Höhe der Dachoberfläche über Spalte x (Satteldach, First in Nord-Süd-Richtung). */
function roofHeight(x) {
  return 92 + Math.floor(Math.min(x + 8, 167 - x) / 2);
}

/** Bretterwand: Bretter 25 cm breit mit feiner Fuge und Lichtkante, unten dunkler (Spritzwasser). */
function wallColor(u, y, seed) {
  const c = boardColor(u, y, seed, { width: 8, grain: 10, edge: true });
  return y <= FFLOOR + 3 ? shade(c, -1) : c;
}

/** Stülpschalung im Giebel: liegende Bretter mit Schattenfuge und heller Unterkante. */
function sidingColor(x, y, seed) {
  const v = (y - 92) % 6;
  if (v === 0) return P.e3;
  const r = hash3(Math.floor(x / 36), Math.floor((y - 92) / 6), 0, seed);
  const c = r < 0.4 ? P.e5 : P.e4;
  if (v === 1) return shade(c, 1);
  if (v === 5) return shade(c, -1);
  return hash3(x, Math.floor(y / 6), 3, seed) > 0.9 ? shade(c, -1) : c;
}

/** Rahmen (Tür, Fenster): hell gestrichen, unten und rechts eine Stufe dunkler, abgeplatzte Stellen. */
function frameColor(x, y, seed, shadowSide) {
  if (hash3(x, y, 3, seed) > 0.96) return P.e6;
  return shadowSide ? FRAME[1] : FRAME[0];
}

/** Kleine Blüte im Maß 1/32: Stiel, fünf Blütenblätter um eine Mitte, der Kamera zugewandt. */
function bloom(m, x, y, z, petal, center, stem) {
  for (let k = 0; k < stem; k++) m.set(x, y + k, z, P.g4);
  const t = y + stem + 1;
  m.set(x, t, z, center).set(x - 1, t, z, petal).set(x + 1, t, z, petal).set(x, t + 1, z, petal).set(x - 1, t - 1, z, petal).set(x + 1, t - 1, z, petal);
  m.set(x + 1, y + 1, z, P.g5); // Blatt
  return m;
}

function buildBase(seed, level = 1) {
  const m = new VoxelModel();
  // Unterbau aus Paletten: unten Bretter, Klötze mit dunklen Lücken, oben Deckbretter
  m.box(0, 0, 0, FW - 1, 7, FD - 1, (x, y) => {
    if (y <= 1) return P.e3;
    const k = x % 32;
    if (y >= 6) return k === 31 ? P.e2 : y === 7 ? (k === 0 ? P.e5 : P.e4) : P.e3;
    const block = k < 6 || (k >= 13 && k <= 18) || k > 25;
    return block ? (y === 5 ? P.e4 : k === 0 || k === 13 || k === 26 ? P.e4 : P.e3) : P.e1;
  });
  // Dielen (Kante unter der Tür)
  m.box(0, 8, 0, FW - 1, 11, FD - 1, (x, y) => (y === 11 ? (Math.floor(x / 40) % 2 ? P.e5 : P.e6) : y === 8 ? P.e3 : P.e4));
  // Seiten- und Rückwand (von der Kamera nie zu sehen – nur für den Schatten)
  m.box(0, FFLOOR, 0, 1, FTOP, FD - 1, P.e4);
  m.box(FW - 2, FFLOOR, 0, FW - 1, FTOP, FD - 1, P.e4);
  m.box(2, FFLOOR, 0, FW - 3, FTOP, 1, P.e4);

  if (level < 2) {
    // Stufe vor der Tür mit Fußmatte aus Kokos (ab Stufe 2 ersetzt die Veranda sie)
    m.box(32, 0, FD, 67, 7, FD + 11, (x, y, z) => {
      if (y < 7) return z === FD + 11 ? (y <= 1 ? P.e3 : P.e4) : P.e3;
      return deckColor(x, z - FD, seed + 4, { width: 6, run: 36 });
    });
    m.box(40, 8, FD, 59, 8, FD + 5, (x, y, z) => (x === 40 || x === 59 || z === FD + 5 ? P.e6 : (x + z) % 2 ? P.e7 : P.e8));
    for (let x = 41; x <= 58; x += 2) m.set(x, 8, FD + 6, P.e7); // Fransen
  }
  return m;
}

function buildFront(seed) {
  const m = new VoxelModel();
  const inDoor = (x, y) => x >= FDOOR.x0 && x <= FDOOR.x1 && y <= FDOOR.y1;
  const inWindow = (x, y) => x >= FWIN.x0 && x <= FWIN.x1 && y >= FWIN.y0 && y <= FWIN.y1;
  for (let y = FFLOOR; y <= FTOP; y++) {
    for (let x = 0; x < FW; x++) {
      if (inDoor(x, y) || inWindow(x, y)) continue;
      m.set(x, y, FZ - 1, P.e3).set(x, y, FZ, wallColor(x, y, seed + 3));
    }
  }
  // Querlatten eine Schicht vor der Wand – unten Schatten, oben Licht, je Brett ein Nagel
  for (const by of BATTENS) {
    for (let x = 0; x < FW; x++) {
      if (x >= FDOOR.x0 - 4 && x <= FDOOR.x1 + 4 && by <= FDOOR.y1 + 4) continue;
      m.set(x, by, FZ + 1, P.e3).set(x, by + 1, FZ + 1, x % 8 === 4 ? P.s5 : P.e5).set(x, by + 2, FZ + 1, P.e6);
    }
  }
  // Türrahmen, weiß gestrichen, eine Schicht vorstehend, innen eine Schattenkante
  for (let y = FFLOOR; y <= FDOOR.y1 + 3; y++) {
    for (const x of [FDOOR.x0 - 3, FDOOR.x0 - 2, FDOOR.x0 - 1, FDOOR.x1 + 1, FDOOR.x1 + 2, FDOOR.x1 + 3]) {
      const inner = x === FDOOR.x0 - 1 || x === FDOOR.x1 + 1;
      m.set(x, y, FZ, FRAME[1]).set(x, y, FZ + 1, inner ? FRAME[1] : frameColor(x, y, seed + 1, x > FDOOR.x1));
    }
  }
  for (let x = FDOOR.x0 - 3; x <= FDOOR.x1 + 3; x++) {
    for (let k = 1; k <= 3; k++) m.set(x, FDOOR.y1 + k, FZ, FRAME[1]).set(x, FDOOR.y1 + k, FZ + 1, k === 1 ? FRAME[1] : k === 3 ? P.s9 : frameColor(x, k, seed + 2, false));
  }
  // Fensterrahmen mit Sprossenkreuz, Gardinen mit Falten und Raffband, Fensterbank, Blumenkasten
  for (let y = FWIN.y0 - 3; y <= FWIN.y1 + 3; y++) {
    for (let x = FWIN.x0 - 3; x <= FWIN.x1 + 3; x++) {
      const border = x < FWIN.x0 || x > FWIN.x1 || y < FWIN.y0 || y > FWIN.y1;
      const bar = x === FWIN.mx || x === FWIN.mx + 1 || y === FWIN.my || y === FWIN.my + 1;
      if (border) {
        const inner = x === FWIN.x0 - 1 || x === FWIN.x1 + 1 || y === FWIN.y0 - 1 || y === FWIN.y1 + 1;
        m.set(x, y, FZ + 1, inner ? FRAME[1] : y === FWIN.y1 + 3 ? P.s9 : frameColor(x, y, seed + 5, x > FWIN.x1 || y < FWIN.y0)).set(x, y, FZ, FRAME[1]);
      } else if (bar) m.set(x, y, FZ, x === FWIN.mx + 1 || y === FWIN.my ? FRAME[1] : FRAME[0]);
    }
  }
  for (const [x, y] of curtainCells()) {
    const i = Math.min(x - FWIN.x0, FWIN.x1 - x);
    m.set(x, y, FZ, i % 3 === 1 ? P.a0 : y === FWIN.y1 ? P.a4 : P.a1);
  }
  for (const x of [FWIN.x0, FWIN.x0 + 1, FWIN.x0 + 2, FWIN.x0 + 3, FWIN.x1 - 3, FWIN.x1 - 2, FWIN.x1 - 1, FWIN.x1]) m.set(x, 45, FZ, P.f6).set(x, 46, FZ, P.f5); // Raffband
  m.box(FWIN.x0 - 5, FWIN.y0 - 5, FZ + 1, FWIN.x1 + 5, FWIN.y0 - 4, FZ + 4, (x, y, z) => (z === FZ + 4 ? (y === FWIN.y0 - 4 ? P.e7 : P.e6) : P.e5)); // Fensterbank
  m.box(FWIN.x0 - 4, FWIN.y0 - 14, FZ + 3, FWIN.x1 + 4, FWIN.y0 - 7, FZ + 8, (x, y, z) => {
    if (y === FWIN.y0 - 7) return z === FZ + 8 ? P.e6 : P.e2; // Rand, dahinter Erde
    if (y === FWIN.y0 - 14) return P.e3;
    return (x - FWIN.x0 + 4) % 12 === 0 ? P.e3 : y === FWIN.y0 - 8 ? P.e5 : P.e4;
  });
  const blooms = [P.r4, P.a0, P.f6, P.a4, P.r3, P.a1, P.a3, P.f5];
  for (let x = FWIN.x0 - 3; x <= FWIN.x1 + 3; x++) {
    const h = hash3(x >> 1, 0, 0, seed + 9);
    m.set(x, FWIN.y0 - 6, FZ + 6, h < 0.5 ? P.g4 : P.g5);
    if (h > 0.4) m.set(x, FWIN.y0 - 5, FZ + 6, h > 0.8 ? P.g6 : P.g5);
    if (h < 0.15) m.set(x, FWIN.y0 - 9, FZ + 9, P.g5).set(x, FWIN.y0 - 10, FZ + 9, P.g4).set(x, FWIN.y0 - 11, FZ + 9, P.g5); // Ranke über den Rand
  }
  for (let k = 0; k < 8; k++) {
    const x = FWIN.x0 - 1 + k * 4;
    bloom(m, x, FWIN.y0 - 6, FZ + 6, blooms[k], k % 2 ? P.f6 : P.f7, 1 + (k % 3));
  }
  // Hufeisen über dem Vordach (Öffnung nach oben), Nagellöcher, zwei Nägel
  const hx = 44;
  const shoe = ['##......##', '##......##', '##......##', '##......##', '.##....##.', '.##....##.', '..######..', '...####...'];
  shoe.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== '#') continue;
      const hole = (r === 2 || r === 4) && (i === 0 || i === 9);
      m.set(hx + i, 105 - r, FZ + 3, hole ? P.s3 : i < 5 ? P.s7 : P.s6);
    }
  });
  m.set(hx, 105, FZ + 4, P.s3).set(hx + 9, 105, FZ + 4, P.s3);
  return m;
}

/** Gardinen links und rechts im Fenster: oben breit, am Raffband schmal, unten wieder etwas breiter. */
function curtainCells() {
  const cells = [];
  for (let y = FWIN.y0; y <= FWIN.y1; y++) {
    const w = y >= 56 ? 8 : y >= 51 ? 7 : y >= 48 ? 5 : y >= 43 ? 4 : y >= 39 ? 5 : 6;
    for (let i = 0; i < w; i++) {
      cells.push([FWIN.x0 + i, y]);
      cells.push([FWIN.x1 - i, y]);
    }
  }
  return cells;
}

function buildWindowGlass() {
  const m = new VoxelModel();
  const curtain = new Set(curtainCells().map(([x, y]) => `${x},${y}`));
  for (let x = FWIN.x0; x <= FWIN.x1; x++) {
    for (let y = FWIN.y0; y <= FWIN.y1; y++) {
      if (x === FWIN.mx || x === FWIN.mx + 1 || y === FWIN.my || y === FWIN.my + 1) continue;
      if (curtain.has(`${x},${y}`)) continue;
      m.set(x, y, FZ, 0xffffff);
    }
  }
  return m;
}

/** Die Tür: vier blaugrün gestrichene Bretter mit Z-Strebe und Nägeln, Bullauge mit Messingring, Knauf mit Schild. */
function buildDoor(seed) {
  const m = new VoxelModel();
  const width = FDOOR.x1 - FDOOR.x0 + 1; // 28
  const height = FDOOR.y1 - FFLOOR + 1; // 64
  m.box(0, 0, 0, width - 1, height - 1, 3, (x, y, z) => {
    if (z < 3) return P.t2;
    const b = x % 7;
    if (b === 6) return P.t3; // Fuge
    if (hash3(x, y >> 1, 0, seed) > 0.985) return P.e5; // abgeplatzte Farbe
    return b === 0 ? P.a6 : P.a5; // Lichtkante je Brett
  });
  // Querriegel und Strebe, eine Schicht vorstehend, darunter ein Schattenstrich
  const brace = (x, y) => {
    m.set(x, y, 4, P.a6);
    if (!m.has(x, y - 1, 4) && y > 0) m.set(x, y - 1, 3, P.t3);
  };
  for (let x = 0; x < width; x++) for (const y of [4, 5, 6, 7, 28, 29, 30, 31]) brace(x, y);
  for (let t = 0; t <= 20; t++) {
    const x = Math.round(2 + t * 1.1);
    for (let k = 0; k < 4; k++) brace(x + k, 8 + t);
  }
  for (let x = 3; x < width; x += 7) for (const y of [5, 29]) m.set(x, y, 5, P.s5); // Nägel
  // Bullauge: Messingring mit Schrauben, dunkles Glas mit Glanz
  const cx = width / 2;
  const cy = 45.5;
  for (let x = 0; x < width; x++) {
    for (let y = 33; y < height; y++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= 5.2) m.set(x, y, 2, d < 2.4 && x < cx - 0.5 && y > cy + 0.5 ? P.b4 : d < 3.2 && x > cx && y < cy ? P.b2 : P.b1).set(x, y, 3, null);
      else if (d <= 8.0) {
        const lit = x + y < cx + cy;
        m.set(x, y, 4, d > 7.2 ? P.f4 : lit ? P.f6 : P.f5);
        if (d > 6.2 && d < 7.0 && Math.abs(Math.abs(x + 0.5 - cx) - Math.abs(y + 0.5 - cy)) < 0.8) m.set(x, y, 5, P.s4); // Schrauben
      }
    }
  }
  // Knauf mit Schild und Schlüsselloch
  m.box(21, 20, 4, 24, 27, 4, (x, y) => (x === 22 && (y === 22 || y === 23) ? P.s1 : x === 21 ? P.s4 : P.s3));
  m.box(21, 24, 5, 24, 25, 6, (x, y, z) => (z === 6 ? (x < 23 ? P.f7 : P.f6) : P.f5));
  return m;
}

function buildRoof(seed) {
  const m = new VoxelModel();
  // Wellblech in Tafeln (1 m breit): Rillen den Hang hinab (Licht, Flanke,
  // Tal), Tafeln verschieden gefärbt, Schrauben in Reihen, Rostfahnen darunter
  const SHEET = 32;
  // je Hang: Rille oben, Rille unten, Unterseite, Vorderkante – der Westhang
  // liegt eine Stufe heller, damit man den First sieht
  const COLORS = [
    { rot: [P.r4, P.r3, P.r1, P.r4], grau: [P.s6, P.s5, P.s3, P.s7], rost: [P.r3, P.r2, P.r0, P.r4] },
    { rot: [P.r3, P.r2, P.r1, P.r4], grau: [P.s5, P.s4, P.s3, P.s6], rost: [P.r2, P.r1, P.r0, P.r3] },
  ];
  const tone = (side, sheet) => {
    const r = hash3(side, sheet, 0, seed + 2);
    return r < 0.25 ? 'grau' : r < 0.4 ? 'rost' : 'rot';
  };
  const ridge = FW / 2;
  const PROFILE = [1, 0, 0, -1, 0, -1]; // Licht, Kuppe, Kuppe, Flanke, Tal, Flanke
  for (let x = -8; x <= FW + 7; x++) {
    const h = roofHeight(x);
    const side = x < ridge ? 0 : 1;
    const down = side ? x - ridge : ridge - 1 - x; // Abstand vom First den Hang hinab
    const q = (x + 8) % 32;
    const col = Math.floor((x + 8) / 32);
    for (let z = -8; z <= FD + 11; z++) {
      const sheet = Math.floor((z + 8) / SHEET);
      const [crest, valley, under, edge] = COLORS[side][tone(side, sheet)];
      const u = (z + 8) % SHEET;
      const p = u % 6;
      let c = p === 4 ? valley : shade(crest, PROFILE[p]);
      if (u === SHEET - 1) c = under; // Stoß zur nächsten Tafel
      if (hash3(x >> 1, h, z >> 1, seed) > 0.985) c = shade(c, -1);
      // Schrauben in Reihen, unter manchen eine Rostfahne den Hang hinab
      if (u % 12 === 2) {
        if (q === 16) c = P.s7;
        else {
          const run = side ? q - 16 : 16 - q;
          const len = 2 + Math.floor(6 * hash3(col, 0, z, seed + 4));
          if (run > 0 && run <= len && hash3(col, 1, z, seed + 5) > 0.55) c = run < 3 ? P.r2 : P.r1;
        }
      }
      if (hash3(Math.floor(x / 6), 0, Math.floor(z / 4), seed + 8) > 0.965) c = P.r1; // Rost
      if (z === FD + 11) c = down % 4 === 0 ? shade(edge, -1) : edge; // Vorderkante, gewellt
      m.set(x, h, z, c);
      m.set(x, h - 1, z, z === FD + 11 ? P.e3 : under);
    }
  }
  // Firstkappe mit Stößen und Schrauben (darunter lückenlos bis aufs Blech)
  for (let z = -8; z <= FD + 11; z++) {
    for (let x = 76; x <= 83; x++) {
      const y = x === 76 || x === 83 ? 136 : 137;
      m.set(x, y, z, (z + 8) % 32 === 0 ? P.s3 : (z + 8) % 16 === 8 && (x === 78 || x === 81) ? P.s8 : x < 80 ? P.s6 : P.s5);
      for (let yy = roofHeight(x) + 1; yy < y; yy++) m.set(x, yy, z, P.s3);
    }
  }
  // Giebeldreiecke vorn und hinten (Stülpschalung), vorn mit Lüftung und Holzfisch
  for (const gz of [0, 1, FZ - 1, FZ]) {
    for (let x = 0; x < FW; x++) {
      for (let y = FTOP + 1; y <= roofHeight(x) - 2; y++) m.set(x, y, gz, gz === FZ ? sidingColor(x, y, seed) : P.e4);
    }
  }
  m.box(74, 112, FZ, 85, 121, FZ, (x, y) => (x === 74 || x === 85 || y === 112 || y === 121 ? P.e3 : y % 3 === 0 ? P.e1 : y % 3 === 1 ? P.e5 : P.e4));
  const fish = [
    '.....######.......##',
    '...##########....###',
    '..############..####',
    '.##.##############..',
    '###############.##..',
    '.##############.....',
    '..############..####',
    '...##########....###',
    '.....######.......##',
  ];
  fish.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== '#') continue;
      const scale = (i + r) % 4 === 0 && i > 4 && i < 15;
      m.set(68 + i, 108 - r, FZ + 1, r <= 1 ? P.e8 : scale ? P.e6 : i >= 16 ? P.e6 : P.e7);
    }
  });
  m.set(71, 105, FZ + 2, P.e1); // Auge
  // Plane mit zwei Reifen auf der Westseite: Falten als feine Linien, ausgefranster Rand
  for (let x = 16; x <= 55; x++) {
    for (let z = 56; z <= 99; z++) {
      const rim = x <= 17 || x >= 54 || z <= 57 || z >= 98;
      if (rim && hash3(x, 1, z, seed) < 0.3) continue;
      const f = (x + z * 2) % 18;
      m.set(x, roofHeight(x) + 1, z, f === 0 ? P.b1 : f === 1 ? P.b3 : (x + z) % 26 === 0 ? P.b3 : P.b2);
    }
  }
  for (const [cx, cz] of [[28, 68], [42, 86]]) {
    for (let x = cx - 10; x <= cx + 10; x++) {
      for (let z = cz - 10; z <= cz + 10; z++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (d > 9.2 || d < 4.4) continue;
        const y = roofHeight(x) + 2;
        m.set(x, y, z, P.s1).set(x, y + 1, z, P.s1);
        if (d < 8.4 && d > 5.0) m.set(x, y + 2, z, d < 5.8 ? P.s3 : ((x >> 1) + (z >> 1)) % 2 ? P.s2 : P.s1);
      }
    }
  }
  // Solarpaneel auf der Ostseite: erhöhter Rahmen, Zellen mit Gitter und Leiterbahnen, ein Lichtstreif
  for (let x = 100; x <= 135; x++) {
    for (let z = 20; z <= 59; z++) {
      const frame = x === 100 || x === 135 || z === 20 || z === 59;
      const grid = (x - 100) % 6 === 0 || (z - 20) % 5 === 0;
      const glint = Math.abs(x - 100 - (z - 20) * 0.8 - 8) < 2.2;
      const bus = (z - 20) % 5 === 2 && (x - 100) % 2 === 0;
      const y = roofHeight(x) + 1;
      m.set(x, y, z, frame ? P.s6 : grid ? P.b0 : glint ? (Math.abs(x - 100 - (z - 20) * 0.8 - 8) < 0.9 ? P.b4 : P.b3) : bus ? P.b2 : P.b1);
      if (frame) m.set(x, y + 1, z, x === 100 || z === 59 ? P.s7 : P.s6);
    }
  }
  // Ofenrohr mit Bändern, Ruß und Regenhut
  const cx = 128;
  const cz = 16;
  const base = roofHeight(cx) + 1;
  m.cylinder(cx, cz, base - 4, 143, 4.6, (x, y) => (y >= 139 ? (hash3(x, y, 0, seed) < 0.5 ? P.s1 : P.s2) : y % 10 === 0 ? P.s6 : y % 10 === 1 ? P.s3 : x < cx - 1 ? P.s5 : x < cx + 2 ? P.s4 : P.s3));
  for (const [dx, dz] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) m.box(cx + dx, 144, cz + dz, cx + dx, 145, cz + dz, P.s2);
  m.cylinder(cx, cz, 146, 147, 6.8, (x, y) => (y === 147 ? (x < cx ? P.s5 : P.s4) : P.s2));
  m.cylinder(cx, cz, 148, 149, 4.8, (x) => (x < cx ? P.s6 : P.s5));
  m.cylinder(cx, cz, 150, 150, 2.2, P.s7);
  // Rauch steigt über dem Hut auf (grobe Einheiten für toWorld)
  return { model: m, chimneyTop: { x: cx / 4, y: 152 / 4, z: cz / 4 } };
}

/** Lichterkette unter der vorderen Dachkante: Draht in Bögen, Lämpchen darunter. */
function wireY(x) {
  const k = ((x % 24) + 24) % 24;
  return roofHeight(x) - 6 - Math.round(Math.sin((k / 24) * Math.PI) * 4);
}

function buildFairyLights() {
  const m = new VoxelModel();
  const colors = [P.f7, P.f6, P.a1, P.a6, P.f5];
  let i = 0;
  for (let x = -4; x <= FW + 3; x += 8) {
    // Lämpchen: Fassung am Draht, darunter ein runder Kolben mit Spitze
    const c = colors[i % colors.length];
    const y = wireY(x);
    m.set(x, y - 1, FD + 12, shade(c, -2)).box(x - 1, y - 3, FD + 12, x, y - 2, FD + 12, c).set(x - 1, y - 4, FD + 12, shade(c, -1)).set(x, y - 2, FD + 12, shade(c, 1));
    i++;
  }
  return m;
}

function buildFairyWire() {
  const m = new VoxelModel();
  for (let x = -6; x <= FW + 5; x++) {
    m.set(x, wireY(x), FD + 12, P.e2);
    if (((x % 24) + 24) % 24 === 0) m.set(x, wireY(x) + 1, FD + 12, P.s3).set(x, wireY(x) + 2, FD + 12, P.s3); // Haken
  }
  return m;
}

/**
 * Vordach über der Tür: kurz und hoch genug, dass man Tür und Bullauge
 * darunter sieht (M13); zwei Streben halten es an der Wand, keine Stangen.
 * Stoff in grün-cremefarbenen Bahnen mit Naht, vorn ein Saum mit Bögen.
 */
function buildAwning() {
  const m = new VoxelModel();
  const x0 = 16;
  const x1 = 87;
  const z0 = FZ + 3;
  const zFront = FZ + 28;
  const fabricY = (z) => 91 - Math.floor((z - z0) / 4);
  // Leiste an der Wand und zwei Streben
  m.box(x0, 92, FZ + 1, x1, 93, FZ + 2, (x, y) => (y === 93 ? P.e4 : P.e3));
  for (const x of [x0 + 2, x1 - 3]) m.line(x, 66, FZ + 1, x, fabricY(zFront - 2) - 1, zFront - 2, P.e3, 1);
  for (let z = z0; z <= zFront; z++) {
    const y = fabricY(z);
    for (let x = x0; x <= x1; x++) {
      const k = (x - x0) % 8;
      const green = Math.floor((x - x0) / 8) % 2 === 0;
      let c = green ? P.g5 : P.e9;
      if (k === 0) c = green ? P.g4 : P.e8; // Naht
      if (z < z0 + 4) c = shade(c, -1);
      m.set(x, y, z, c);
      if (z === zFront) {
        // Saum mit Bögen
        m.set(x, y - 1, z, c).set(x, y - 2, z, green ? P.g4 : P.e8);
        if (k >= 2 && k <= 5) m.set(x, y - 3, z, green ? P.g4 : P.e8);
        if (k === 3 || k === 4) m.set(x, y - 4, z, green ? P.g3 : P.e7);
      }
    }
  }
  // Wandlaterne rechts neben der Tür (das Glas leuchtet separat)
  m.box(73, 67, FZ + 1, 74, 68, FZ + 5, P.s2); // Arm
  m.box(70, 64, FZ + 3, 77, 66, FZ + 10, (x, y) => (y === 66 ? P.s3 : P.s2)); // Dach
  m.box(72, 67, FZ + 5, 75, 68, FZ + 8, (x, y) => (y === 68 ? P.s4 : P.s3));
  m.box(70, 52, FZ + 3, 77, 53, FZ + 10, (x, y) => (y === 53 ? P.s2 : P.s1)); // Boden
  for (const [x, z] of [[70, FZ + 3], [77, FZ + 3], [70, FZ + 10], [77, FZ + 10]]) m.box(x, 54, z, x, 63, z, P.s2);
  return m;
}

function buildLanternGlass() {
  const m = new VoxelModel();
  m.box(71, 54, FZ + 4, 76, 63, FZ + 9, 0xffffff);
  return m;
}

// --- Ausbaustufe 2: Hütte ------------------------------------------------------
// Anbau im Osten (grob x 40..57, z 6..27) mit Leseecke, Veranda über die ganze Front.

const AX0 = W;
const AX1 = W + 17;
const FAX0 = AX0 * 4; // 160
const FAX1 = AX1 * 4 + 3; // 231
const FAZ0 = 24;
const AWIN = { x0: 184, x1: 211, y0: 32, y1: 55, mx: 197 };

function annexRoofHeight(x) {
  return 87 - Math.floor((x - FAX0) / 4);
}

function buildAnnexBase(seed) {
  const m = new VoxelModel();
  m.box(FAX0, 0, FAZ0, FAX1, 7, FD - 1, (x, y) => {
    if (y <= 1) return P.e3;
    const k = x % 32;
    if (y >= 6) return k === 31 ? P.e2 : y === 7 ? P.e4 : P.e3;
    return k < 6 || (k >= 13 && k <= 18) || k > 25 ? P.e3 : P.e1;
  });
  m.box(FAX0, 8, FAZ0, FAX1, 11, FD - 1, (x, y) => (y === 11 ? P.e5 : y === 8 ? P.e3 : P.e4));
  // Nord- und Ostwand (nur Schatten)
  m.box(FAX0, FFLOOR, FAZ0, FAX1, 79, FAZ0 + 1, P.e4);
  m.box(FAX1 - 1, FFLOOR, FAZ0, FAX1, 79, FD - 1, P.e4);
  return m;
}

function buildAnnexFront(seed) {
  const m = new VoxelModel();
  const inWindow = (x, y) => x >= AWIN.x0 && x <= AWIN.x1 && y >= AWIN.y0 && y <= AWIN.y1;
  for (let y = FFLOOR; y <= 79; y++) {
    for (let x = FAX0; x <= FAX1; x++) {
      if (inWindow(x, y)) continue;
      m.set(x, y, FZ - 1, P.e3).set(x, y, FZ, wallColor(x, y, seed + 9));
    }
  }
  for (let x = FAX0; x <= FAX1; x++) {
    if (x >= AWIN.x0 - 4 && x <= AWIN.x1 + 4) continue;
    m.set(x, 20, FZ + 1, P.e3).set(x, 21, FZ + 1, x % 8 === 4 ? P.s5 : P.e5).set(x, 22, FZ + 1, P.e6);
  }
  for (let y = AWIN.y0 - 3; y <= AWIN.y1 + 3; y++) {
    for (let x = AWIN.x0 - 3; x <= AWIN.x1 + 3; x++) {
      const border = x < AWIN.x0 || x > AWIN.x1 || y < AWIN.y0 || y > AWIN.y1;
      if (border) {
        const inner = x === AWIN.x0 - 1 || x === AWIN.x1 + 1 || y === AWIN.y0 - 1 || y === AWIN.y1 + 1;
        m.set(x, y, FZ + 1, inner ? FRAME[1] : y === AWIN.y1 + 3 ? P.s9 : frameColor(x, y, seed + 6, x > AWIN.x1 || y < AWIN.y0)).set(x, y, FZ, FRAME[1]);
      } else if (x === AWIN.mx || x === AWIN.mx + 1) m.set(x, y, FZ, x === AWIN.mx ? FRAME[0] : FRAME[1]);
    }
  }
  // Fensterbank und Kräuterkasten: Schnittlauch mit Blüten, Lavendel, Petersilie
  m.box(AWIN.x0 - 5, AWIN.y0 - 5, FZ + 1, AWIN.x1 + 5, AWIN.y0 - 4, FZ + 4, (x, y, z) => (z === FZ + 4 ? (y === AWIN.y0 - 4 ? P.e7 : P.e6) : P.e5));
  m.box(AWIN.x0 - 4, AWIN.y0 - 14, FZ + 3, AWIN.x1 + 4, AWIN.y0 - 7, FZ + 8, (x, y, z) => (y === AWIN.y0 - 7 ? (z === FZ + 8 ? P.e6 : P.e2) : y === AWIN.y0 - 14 ? P.e3 : (x - AWIN.x0) % 12 === 0 ? P.e3 : P.e4));
  for (let x = AWIN.x0 - 3; x <= AWIN.x1 + 3; x++) {
    const k = Math.floor((x - AWIN.x0 + 3) / 12) % 3;
    const h = hash3(x, 5, 0, seed);
    const y0 = AWIN.y0 - 6;
    const z = FZ + 5 + (x % 2);
    if (k === 0) {
      const top = y0 + 3 + Math.floor(h * 3);
      m.box(x, y0, z, x, top, z, x % 2 ? P.g6 : P.g5);
      if (h > 0.6) m.set(x, top + 1, z, P.a3).set(x, top + 2, z, P.a2);
    } else if (k === 1) {
      if (x % 2) m.box(x, y0, z, x, y0 + 3, z, P.g4).box(x, y0 + 4, z, x, y0 + 6, z, h > 0.4 ? P.a2 : P.a3);
      else m.set(x, y0, z, P.g5).set(x, y0 + 1, z, P.g4);
    } else m.set(x, y0, z, P.g5).set(x, y0 + 1, z, h > 0.5 ? P.g6 : P.g5).set(x, y0 + 2, z, h > 0.7 ? P.g7 : P.g6);
  }
  return m;
}

function buildAnnexGlass() {
  const m = new VoxelModel();
  for (let x = AWIN.x0; x <= AWIN.x1; x++) {
    for (let y = AWIN.y0; y <= AWIN.y1; y++) if (x !== AWIN.mx && x !== AWIN.mx + 1) m.set(x, y, FZ, 0xffffff);
  }
  return m;
}

function buildAnnexRoof(seed) {
  const m = new VoxelModel();
  for (let x = FAX0; x <= FAX1 + 8; x++) {
    const h = annexRoofHeight(x);
    for (let z = FAZ0 - 8; z <= FD + 7; z++) {
      const sheet = Math.floor((z - FAZ0 + 8) / 32);
      const grey = sheet % 3 === 1;
      const u = (z - FAZ0 + 8) % 32;
      const p = u % 6;
      let c = grey ? (p === 0 ? P.s6 : p === 4 ? P.s4 : P.s5) : p === 0 ? P.r4 : p === 4 ? P.r2 : P.r3;
      if (u === 31) c = grey ? P.s3 : P.r1;
      if (u % 12 === 2 && (x - FAX0) % 24 === 12) c = P.s7;
      if (z === FD + 7) c = grey ? P.s6 : P.r4;
      m.set(x, h, z, c);
      m.set(x, h - 1, z, z === FD + 7 ? P.e3 : grey ? P.s3 : P.r1);
    }
  }
  // Giebelwand zwischen Anbauwand und Dach
  for (let x = FAX0; x <= FAX1; x++) {
    for (let y = 80; y < annexRoofHeight(x) - 1; y++) {
      m.set(x, y, FZ, sidingColor(x, y + 12, seed + 3)).set(x, y, FZ - 1, P.e3);
      m.set(x, y, FAZ0, P.e4);
    }
  }
  // Regenrinne mit Fallrohr und Schellen an der Vorderecke
  const gy = annexRoofHeight(FAX1 + 8) - 1;
  for (let z = FAZ0 - 8; z <= FD + 7; z++) {
    m.set(FAX1 + 9, gy, z, z % 16 === 0 ? P.s4 : P.s5).set(FAX1 + 10, gy, z, P.s4).set(FAX1 + 11, gy + 1, z, P.s6).set(FAX1 + 9, gy - 1, z, P.s3);
  }
  m.box(FAX1 + 9, 2, FD + 7, FAX1 + 10, gy - 2, FD + 7, (x, y) => (y % 16 === 0 ? P.s3 : x === FAX1 + 9 ? P.s5 : P.s4));
  m.box(FAX1 + 9, 0, FD + 8, FAX1 + 10, 1, FD + 11, (x, y, z) => (z === FD + 11 ? P.s5 : P.s4));
  return m;
}

function buildDeck(seed) {
  const m = new VoxelModel();
  const x0 = -8;
  const x1 = FAX1 + 4;
  const z0 = FD;
  const z1 = FD + 23;
  m.box(x0, 0, z0, x1, 7, z1, (x, y, z) => {
    if (y === 7) return deckColor(x, z - z0, seed + 11, { width: 6, run: 44 });
    if (z === z1) return y <= 1 ? P.e2 : x % 24 < 4 ? P.e3 : y === 6 ? P.e5 : P.e4; // Balkenköpfe
    return P.e3;
  });
  // Geländer vorn mit Lücke für die Treppe: Pfosten mit Kappe, Handlauf, Stäbe
  const gap0 = (DOOR.x0 - 1) * 4;
  const gap1 = (DOOR.x1 + 1) * 4 + 3;
  const posts = [-8, 16, 28, 68, 88, 112, 136, 160, 184, 208, 232];
  const rail = (x) => {
    m.set(x, 26, z1 - 1, P.e4).set(x, 27, z1 - 1, P.e4).set(x, 26, z1, P.e4).set(x, 27, z1, P.e5).set(x, 28, z1 - 1, P.e6).set(x, 29, z1 - 1, P.e7).set(x, 28, z1, P.e6).set(x, 29, z1, P.e7); // Handlauf
    m.set(x, 10, z1, P.e4).set(x, 11, z1, P.e5); // unterer Riegel
    if (x % 6 < 2) m.box(x, 12, z1, x, 25, z1, x % 6 === 0 ? P.e6 : P.e5); // Stäbe
  };
  for (let x = x0; x <= x1; x++) if (x < gap0 || x > gap1) rail(x);
  for (const px of posts) {
    m.box(px, 8, z1 - 3, px + 3, 31, z1, (x, y) => (y === 31 ? P.e6 : x === px ? P.e5 : x === px + 3 ? P.e3 : P.e4));
    m.box(px - 1, 32, z1 - 4, px + 4, 33, z1 + 1, (x, y) => (y === 33 ? P.e7 : P.e5));
  }
  // Seitengeländer (von vorn nur Handlauf und Pfosten zu sehen)
  for (let z = z0; z <= z1; z++) {
    for (const x of [x0, x0 + 1, x0 + 2, x0 + 3, x1 - 3, x1 - 2, x1 - 1, x1]) m.set(x, 29, z, P.e7).set(x, 28, z, P.e6).set(x, 27, z, P.e4);
  }
  for (const x of [x0, x1 - 3]) m.box(x, 8, z0, x + 3, 31, z0 + 3, (xx, y) => (y === 31 ? P.e6 : P.e3));
  // Treppe
  m.box(gap0, 0, z1 + 1, gap1, 3, z1 + 8, (x, y, z) => (y === 3 ? deckColor(x, z - z1 - 1, seed + 12, { width: 8, run: 40 }) : z === z1 + 8 ? (y === 2 ? P.e5 : P.e3) : P.e4));
  // Blumentöpfe auf der Veranda: Terrakotta mit Rand, Geranie, Lavendel, Heidekraut
  const plants = [
    [96, [P.r4, P.r3]],
    [136, [P.a0, P.a1]],
    [176, [P.a2, P.a3]],
  ];
  for (const [px, [c1, c2]] of plants) {
    const cx = px + 3;
    const cz = z1 - 9;
    m.cylinder(cx, cz, 8, 17, 4.6, (x, y) => (y >= 16 ? (y === 17 ? P.r4 : P.r3) : y === 8 ? P.r1 : x < cx - 1 ? P.r3 : P.r2));
    m.cylinder(cx, cz, 17, 17, 3.0, P.e2);
    for (let k = 0; k < 16; k++) {
      const x = cx - 3 + (k % 4) * 2;
      const z = cz - 3 + Math.floor(k / 4) * 2;
      const top = 19 + ((k * 7) % 4);
      m.box(x, 18, z, x, top, z, k % 3 ? P.g4 : P.g5).set(x + 1, top - 1, z, P.g5);
      m.set(x, top + 1, z, k % 2 ? c1 : k % 3 ? c2 : P.g6);
      if (k % 2) m.set(x, top + 2, z, c2);
    }
  }
  return m;
}

// --- Ausbaustufen 3–5 von außen (M11): innen ein neuer Raum, außen ein Zeichen dafür ------

/** Stufe 3 (Schlafzimmer unterm Dach): ein Dachfenster in der Westseite des Dachs. */
function buildRoofWindow() {
  const m = new VoxelModel();
  const glass = new VoxelModel();
  // Neben der Plane (z 56..99): weiter nördlich, damit sich nichts überlagert
  for (let x = 20; x <= 47; x++) {
    for (let z = 12; z <= 43; z++) {
      const frame = x <= 23 || x >= 44 || z <= 15 || z >= 40;
      const bar = z === 27 || z === 28;
      const y = roofHeight(x) + 1;
      if (frame) m.set(x, y, z, x <= 23 || z <= 15 ? P.e3 : P.e2).set(x, y + 1, z, z >= 40 ? P.e5 : x <= 21 || z <= 13 ? P.e5 : P.e4);
      else if (bar) m.set(x, y, z, P.e3).set(x, y + 1, z, P.e4);
      else glass.set(x, y, z, 0xffffff);
    }
  }
  return { model: m, glass };
}

/** Stufe 4 (Werkstatt): Werkzeugbrett links neben der Tür, davor ein Sägebock. */
function buildToolBoard() {
  const m = new VoxelModel();
  const z = FD;
  // Lochwand
  m.box(4, 28, z, 27, 67, z + 1, (x, y, zz) => (zz === z ? P.e3 : x <= 5 || x >= 26 || y <= 29 || y >= 66 ? P.e4 : x % 4 === 2 && y % 4 === 2 ? P.e3 : P.e6));
  // Säge: Blatt mit Zähnen, Griff
  for (let y = 34; y <= 59; y++) {
    const x = 8 + Math.floor((59 - y) / 8);
    m.set(x, y, z + 2, P.s7).set(x + 1, y, z + 2, P.s7).set(x + 2, y, z + 2, y % 2 ? P.s5 : P.s8);
  }
  m.box(8, 60, z + 2, 13, 65, z + 2, (x, y) => (x >= 10 && x <= 11 && y >= 62 && y <= 63 ? P.e6 : P.e3));
  // Axt: Stiel und Kopf
  m.box(20, 34, z + 2, 21, 59, z + 2, (x) => (x === 20 ? P.e6 : P.e5));
  m.box(16, 54, z + 2, 25, 61, z + 2, (x, y) => (x <= 17 ? P.s8 : y === 61 ? P.s6 : x >= 20 && x <= 21 ? P.s4 : P.s5));
  // Hammer
  m.box(14, 36, z + 2, 15, 49, z + 2, P.e4).box(12, 48, z + 2, 17, 51, z + 2, (x) => (x === 12 ? P.s6 : P.s4));
  // Sägebock auf der Veranda mit einem Stamm
  for (const lx of [2, 24]) {
    m.box(lx, 8, z + 8, lx + 3, 25, z + 9, P.e3);
    m.box(lx, 8, z + 16, lx + 3, 25, z + 17, P.e3);
    m.box(lx, 18, z + 10, lx + 3, 19, z + 15, P.e4);
  }
  m.box(0, 26, z + 8, 31, 29, z + 17, (x, y) => (y === 29 ? P.e6 : y === 26 ? P.e3 : P.e4));
  for (let x = 4; x <= 24; x++) {
    for (let y = 30; y <= 35; y++) {
      for (let zz = z + 10; zz <= z + 15; zz++) {
        const d = Math.hypot(y + 0.5 - 32.5, zz + 0.5 - (z + 12.5));
        if (d > 3.2) continue;
        if (x === 24) m.set(x, y, zz, d < 1 ? P.e6 : Math.floor(d * 1.2) % 2 ? P.e7 : P.e8);
        else m.set(x, y, zz, d > 2.4 ? (y > 32 ? P.e4 : P.e3) : P.e6);
      }
    }
  }
  return m;
}

/** Stufe 5 (Lager): Kisten, ein Sack und ein Fass am Ostende der Veranda. */
function buildVerandaCrates() {
  const m = new VoxelModel();
  const crate = (x0, y0, z0, mark) =>
    m.box(x0, y0, z0, x0 + 15, y0 + 15, z0 + 15, (x, y, z) => {
      const edge = (x <= x0 + 1 || x >= x0 + 14) + (y <= y0 + 1 || y >= y0 + 14) + (z <= z0 + 1 || z >= z0 + 14) >= 2;
      if (edge) return P.e3;
      if ((y - y0) % 5 === 0 && z === z0 + 15) return P.e3; // Fugen vorn
      if (mark && z === z0 + 15 && (y === y0 + 8 || y === y0 + 9) && x > x0 + 3 && x < x0 + 12) return P.r3;
      if (mark && z === z0 + 15 && x === x0 + 11 && y >= y0 + 6 && y <= y0 + 11) return P.r3; // Pfeil
      return hash3(x >> 1, y >> 1, z >> 1, 5) < 0.3 ? P.e6 : P.e5;
    });
  crate(200, 8, FD, true);
  crate(216, 8, FD, false);
  crate(208, 24, FD, false);
  // Sack oben auf den Kisten
  m.ellipsoid(212, 43, FD + 8, 6, 4.4, 5, (x, y, z, dx, dy) => (y > 44 ? P.e9 : dy < -0.4 ? P.e7 : P.e8));
  m.box(211, 47, FD + 7, 213, 48, FD + 9, P.e6).set(212, 49, FD + 8, P.e5);
  // Fass mit Reifen
  m.cylinder(190, FD + 10, 8, 27, 7.2, (x, y) => (y === 12 || y === 13 || y === 22 || y === 23 ? (y % 2 ? P.s4 : P.s3) : x < 188 ? P.e5 : (x + y) % 9 === 0 ? P.e3 : P.e4));
  m.cylinder(190, FD + 10, 27, 27, 5.6, (x, y, z) => ((x + z) % 4 === 0 ? P.e4 : P.e3));
  return m;
}

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

/** Materialien der Unterkunft – einmal anlegen, bei jedem Ausbau wiederverwenden. */
export function createShelterMaterials() {
  const baseMat = createWorldMaterial({ occluder: true, snow: true });
  const glow = {
    window: createGlowMaterial(0xffffff),
    fairy: createGlowMaterial(0xffffff, { vertexColors: true }),
    lantern: createGlowMaterial(0xffffff, { occluder: true }),
  };
  return { baseMat, glow };
}

/**
 * Baut das Fischerhaus von außen.
 * @returns {object} group, Tür, Lichtpositionen, Kollision, Grundfläche
 */
export function createShelter({ seed, colliders, level = 1, stage = level, materials }) {
  const { x: ox, z: oz } = LAYOUT.shelter;
  const group = new THREE.Group();
  group.name = level >= 2 ? 'Hütte' : 'Notunterkunft';
  group.position.set(ox, 0, oz);
  const { baseMat, glow } = materials;
  const ownColliders = [];

  // Sichtbare Flächen für die Kamera (Maß 1/32), Schatten über einen groben
  // Stellvertreter (1/8 m) – feiner zeichnet die Schattenkarte ohnehin nicht.
  const mesh = (model, material, { shadow = 'coarse4', jitter = 0.04 } = {}) => {
    const visual = new THREE.Mesh(model.toGeometry({ jitter, seed, visibleOnly: true, size: FINE32 }), material);
    visual.castShadow = false;
    visual.receiveShadow = true;
    if (shadow !== 'none') {
      const proxy = new THREE.Mesh(shadowGeometry(model, shadow, FINE32), SHADOW_PROXY_MATERIAL);
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
  const door = new THREE.Mesh(buildDoor(seed).toGeometry({ jitter: 0.04, seed, size: FINE32 }), baseMat);
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
      mesh(buildDeck(seed), baseMat)
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

  const toWorld = (vx, vy, vz) => new THREE.Vector3(wx(vx), vy * V, wz(vz));

  return {
    group,
    stage,
    door: { pivot: doorPivot, hinge: toWorld(DOOR.x0, 0, D), center: toWorld((DOOR.x0 + DOOR.x1 + 1) / 2, 0, D), angle: 0 },
    glow,
    lights: {
      porch: toWorld(18.5, 14.75, 29.75), // Wandlaterne neben der Tür (Mitte im Maß 1/32: 74, 59, 119)
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
    // Haustür mit Hinweis (m12-r1: hinein kam man nur, wer zufällig in die Wand lief)
    interactions: [{ id: 'haustuer', x: wx((DOOR.x0 + DOOR.x1 + 1) / 2), z: wz(D) + 0.75, radius: 0.95, prompt: 'hineingehen', action: 'enterHouse', inside: false }],
  };
}

export { W as SHELTER_WIDTH, D as SHELTER_DEPTH };
