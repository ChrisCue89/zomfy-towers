// Das alte Fischerhaus von außen: eine zusammengezimmerte Bretterhütte mit
// Blechdach, Vordach und Lichterkette, ab Stufe 2 mit Anbau und Veranda.
// Seit Meilenstein 11 ist das Innere ein eigenes Bild (world/interior.js): Wer
// in die Tür geht, ist drinnen; das Haus selbst bleibt von außen geschlossen,
// nachts leuchten die Fenster.
//
// Seit M13 im feinen Maß (1/16 m). Die Modelle rechnen in feinen Voxeln:
// Ursprung Südwest-Ecke am Boden, x nach Osten (0..79), z nach Süden (0..55,
// Vorderseite bei z = 55), y nach oben. Kollision, Grundfläche und Tür
// bleiben in 1/8 m (W, D, DOOR). Die Kamera sieht nur Dach, Vorderseite und
// alles davor – dort sitzen die Einzelheiten; Seitenwände tragen nur Schatten.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { createWorldMaterial, createGlowMaterial } from '../render/materials.js';
import { SHADOW_LAYER, SHADOW_PROXY_MATERIAL, shadowGeometry } from '../render/staticMesh.js';
import { hash3 } from '../core/rng.js';
import { LAYOUT, V } from './layout.js';
import { FINE, shade, boardColor, deckColor, flower } from './voxelKit.js';

// Grobe Maße (1/8 m): Kollision, Grundfläche, Tür
const W = 40; // Breite in Voxeln (x)
const D = 28; // Tiefe in Voxeln (z)
const FLOOR = 3; // Oberkante Fußboden (erste freie Voxelschicht)
const DOOR = { x0: 9, x1: 15, y1: 18 }; // Türöffnung inkl. Grenzen

// Feine Maße (1/16 m): die Modelle
const FW = W * 2; // 80
const FD = D * 2; // 56
const FZ = FD - 1; // Außenhaut der Vorderwand
const FFLOOR = FLOOR * 2;
const FTOP = 45; // oberste Wandschicht
const FDOOR = { x0: 18, x1: 31, y1: 37 };
const FWIN = { x0: 50, x1: 63, y0: 18, y1: 31, mx: 56, my: 24 }; // Glas, Sprossen bei mx/my (je zwei breit)
const BATTENS = [10, 38]; // Querlatten, je zwei Schichten hoch
const FRAME = [P.s8, P.s7]; // weiß gestrichene Rahmen (hell, Schattenkante)

/** Höhe der Dachoberfläche über Spalte x (Satteldach, First in Nord-Süd-Richtung). */
function roofHeight(x) {
  return 46 + Math.floor(Math.min(x + 4, 83 - x) / 2);
}

/** Bretterwand: unten dunkler (Spritzwasser). */
function wallColor(u, y, seed) {
  const c = boardColor(u, y, seed);
  return y <= FFLOOR + 1 ? shade(c, -1) : c;
}

/** Stülpschalung im Giebel: liegende Bretter mit Schattenkante. */
function sidingColor(x, y, seed) {
  const v = (y - 46) % 3;
  if (v === 0) return P.e3;
  const r = hash3(Math.floor(x / 18), Math.floor((y - 46) / 3), 0, seed);
  const c = r < 0.4 ? P.e5 : P.e4;
  return v === 2 ? shade(c, 1) : c;
}

/** Rahmen (Tür, Fenster): hell gestrichen, unten und rechts eine Stufe dunkler, abgeplatzte Stellen. */
function frameColor(x, y, seed, shadowSide) {
  if (hash3(x, y, 3, seed) > 0.94) return P.e6;
  return shadowSide ? FRAME[1] : FRAME[0];
}

function buildBase(seed, level = 1) {
  const m = new VoxelModel();
  // Unterbau aus Paletten: unten Bretter, Klötze mit dunklen Lücken, oben Deckbretter
  m.box(0, 0, 0, FW - 1, 3, FD - 1, (x, y) => {
    if (y === 0) return P.e3;
    if (y === 3) return x % 16 === 15 ? P.e3 : P.e4;
    const k = x % 16;
    return k < 3 || (k >= 7 && k <= 8) || k > 12 ? (y === 2 ? P.e4 : P.e3) : P.e1;
  });
  // Dielen (Kante unter der Tür)
  m.box(0, 4, 0, FW - 1, 5, FD - 1, (x, y) => (y === 5 ? (Math.floor(x / 20) % 2 ? P.e5 : P.e6) : P.e4));
  // Seiten- und Rückwand (von der Kamera nie zu sehen – nur für den Schatten)
  m.box(0, FFLOOR, 0, 1, FTOP, FD - 1, P.e4);
  m.box(FW - 2, FFLOOR, 0, FW - 1, FTOP, FD - 1, P.e4);
  m.box(2, FFLOOR, 0, FW - 3, FTOP, 1, P.e4);

  if (level < 2) {
    // Stufe vor der Tür mit Fußmatte (ab Stufe 2 ersetzt die Veranda sie)
    m.box(16, 0, FD, 33, 3, FD + 5, (x, y, z) => {
      if (y < 3) return z === FD + 5 ? (y === 0 ? P.e3 : P.e4) : P.e3;
      return deckColor(x, z - FD, seed + 4, { width: 3, run: 18 });
    });
    m.box(20, 4, FD, 29, 4, FD + 2, (x, y, z) => (x === 20 || x === 29 || z === FD + 2 ? P.e6 : (x + z) % 2 ? P.e7 : P.e8));
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
  // Querlatten eine Schicht vor der Wand – oben ein heller Streifen, je Brett ein Nagel
  for (const by of BATTENS) {
    for (let x = 0; x < FW; x++) {
      if (x >= FDOOR.x0 - 2 && x <= FDOOR.x1 + 2 && by <= FDOOR.y1 + 2) continue;
      m.set(x, by, FZ + 1, P.e3).set(x, by + 1, FZ + 1, x % 4 === 2 ? P.s5 : P.e5);
    }
  }
  // Türrahmen, weiß gestrichen, eine Schicht vorstehend
  for (let y = FFLOOR; y <= FDOOR.y1 + 2; y++) {
    for (const x of [FDOOR.x0 - 2, FDOOR.x0 - 1, FDOOR.x1 + 1, FDOOR.x1 + 2]) {
      m.set(x, y, FZ, frameColor(x, y, seed, x > FDOOR.x1)).set(x, y, FZ + 1, frameColor(x, y, seed + 1, x > FDOOR.x1));
    }
  }
  for (let x = FDOOR.x0 - 2; x <= FDOOR.x1 + 2; x++) {
    m.set(x, FDOOR.y1 + 1, FZ + 1, frameColor(x, 0, seed + 2, true)).set(x, FDOOR.y1 + 2, FZ + 1, frameColor(x, 1, seed + 2, false));
    m.set(x, FDOOR.y1 + 1, FZ, FRAME[1]).set(x, FDOOR.y1 + 2, FZ, FRAME[0]);
  }
  // Fensterrahmen mit Sprossenkreuz, Gardinen mit Raffband, Fensterbank, Blumenkasten
  for (let y = FWIN.y0 - 2; y <= FWIN.y1 + 2; y++) {
    for (let x = FWIN.x0 - 2; x <= FWIN.x1 + 2; x++) {
      const border = x < FWIN.x0 || x > FWIN.x1 || y < FWIN.y0 || y > FWIN.y1;
      const bar = x === FWIN.mx || x === FWIN.mx + 1 || y === FWIN.my || y === FWIN.my + 1;
      if (border) m.set(x, y, FZ + 1, frameColor(x, y, seed + 5, x > FWIN.x1 || y < FWIN.y0)).set(x, y, FZ, FRAME[1]);
      else if (bar) m.set(x, y, FZ, x === FWIN.mx + 1 || y === FWIN.my ? FRAME[1] : FRAME[0]);
    }
  }
  for (const [x, y] of curtainCells()) m.set(x, y, FZ, (x + (y >> 1)) % 3 === 0 ? P.a0 : P.a1);
  for (const x of [FWIN.x0, FWIN.x0 + 1, FWIN.x1 - 1, FWIN.x1]) m.set(x, 23, FZ, P.f6); // Raffband
  m.box(FWIN.x0 - 3, FWIN.y0 - 3, FZ + 1, FWIN.x1 + 3, FWIN.y0 - 3, FZ + 2, (x, y, z) => (z === FZ + 2 ? P.e6 : P.e5)); // Fensterbank
  m.box(FWIN.x0 - 2, FWIN.y0 - 7, FZ + 2, FWIN.x1 + 2, FWIN.y0 - 4, FZ + 4, (x, y, z) => {
    if (y === FWIN.y0 - 4) return z === FZ + 4 ? P.e6 : P.e2; // Rand, dahinter Erde
    return y === FWIN.y0 - 7 ? P.e3 : x % 6 === 0 ? P.e3 : P.e4;
  });
  const blooms = [P.r4, P.a0, P.f6, P.a4, P.r3, P.a1];
  for (let x = FWIN.x0 - 1; x <= FWIN.x1 + 1; x++) {
    const h = hash3(x, 0, 0, seed + 9);
    m.set(x, FWIN.y0 - 3, FZ + 3, h < 0.5 ? P.g4 : P.g5);
    if (h > 0.45) m.set(x, FWIN.y0 - 2, FZ + 3, h > 0.8 ? P.g6 : P.g5);
    if (h < 0.18) m.set(x, FWIN.y0 - 5, FZ + 5, P.g5).set(x, FWIN.y0 - 6, FZ + 5, P.g4); // Ranke über den Rand
  }
  for (let k = 0; k < 6; k++) {
    const x = FWIN.x0 + k * 3;
    flower(m, x, FWIN.y0 - 3, FZ + 3, blooms[k], k % 2 ? P.f6 : P.f7, 1 + (k % 2));
  }
  // Hufeisen über dem Vordach (Öffnung nach oben), zwei Nägel
  const hx = 22;
  const shoe = ['#....#', '#....#', '#....#', '.#..#.', '..##..'];
  shoe.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') m.set(hx + i, 52 - r, FZ + 2, i < 3 ? P.s7 : P.s6);
  });
  m.set(hx, 52, FZ + 3, P.s3).set(hx + 5, 52, FZ + 3, P.s3);
  return m;
}

/** Gardinen links und rechts im Fenster: oben breit, am Raffband schmal, unten wieder etwas breiter. */
function curtainCells() {
  const cells = [];
  for (let y = FWIN.y0; y <= FWIN.y1; y++) {
    const w = y >= 28 ? 4 : y >= 24 ? 3 : y >= 22 ? 2 : 3;
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

/** Die Tür: blaugrün gestrichene Bretter mit Z-Strebe, Bullauge und Messingknauf. */
function buildDoor(seed) {
  const m = new VoxelModel();
  const width = FDOOR.x1 - FDOOR.x0 + 1; // 14
  const height = FDOOR.y1 - FFLOOR + 1; // 32
  m.box(0, 0, 0, width - 1, height - 1, 1, (x, y, z) => {
    if (z === 0) return P.t2;
    if (x === 4 || x === 9) return P.t3; // Fugen
    if (hash3(x, y, 0, seed) > 0.975) return P.e5; // abgeplatzte Farbe
    return x === 0 || x === 5 || x === 10 ? P.a6 : P.a5; // Lichtkante je Brett
  });
  // Querriegel und Strebe, eine Schicht vorstehend
  const brace = (x, y) => m.set(x, y, 2, P.a6);
  for (let x = 0; x < width; x++) for (const y of [2, 3, 14, 15]) brace(x, y);
  for (let t = 0; t <= 10; t++) {
    const x = Math.round(1 + t * 1.15);
    brace(x, 4 + t);
    brace(x + 1, 4 + t);
  }
  // Bullauge: Messingring, dunkles Glas mit einem Lichtpunkt
  const cx = width / 2;
  const cy = 21.5;
  for (let x = 0; x < width; x++) {
    for (let y = 16; y < height; y++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= 2.6) m.set(x, y, 1, d < 1.2 && x < cx && y > cy ? P.b4 : P.b1);
      else if (d <= 4.0) m.set(x, y, 2, x + y < cx + cy ? P.f6 : P.f5);
    }
  }
  // Knauf mit Schild
  m.box(11, 11, 2, 12, 13, 2, P.s3);
  m.set(11, 12, 3, P.f6).set(12, 12, 3, P.f5);
  return m;
}

function buildRoof(seed) {
  const m = new VoxelModel();
  // Wellblech in Tafeln (1 m breit): Rillen den Hang hinab, Tafeln verschieden
  // gefärbt, Schrauben in Reihen, Rost an einzelnen Stellen
  const SHEET = 16;
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
  for (let x = -4; x <= FW + 3; x++) {
    const h = roofHeight(x);
    const side = x < FW / 2 ? 0 : 1;
    for (let z = -4; z <= FD + 5; z++) {
      const sheet = Math.floor((z + 4) / SHEET);
      const [crest, valley, under, edge] = COLORS[side][tone(side, sheet)];
      const u = (z + 4) % SHEET;
      let c = u % 3 === 2 ? valley : crest;
      if (u === SHEET - 1) c = under; // Stoß zur nächsten Tafel
      if (hash3(x, h, z, seed) > 0.975) c = shade(c, -1);
      if (u % 6 === 1 && (x + 4) % 16 === 8) c = P.s7; // Schrauben
      if (hash3(Math.floor(x / 3), 0, Math.floor(z / 2), seed + 8) > 0.965) c = P.r1; // Rost
      if (z === FD + 5) c = edge; // Vorderkante
      m.set(x, h, z, c);
      m.set(x, h - 1, z, z === FD + 5 ? P.e3 : under);
    }
  }
  // Firstkappe mit Stößen
  for (let z = -4; z <= FD + 5; z++) {
    for (let x = 38; x <= 41; x++) m.set(x, 68, z, (z + 4) % 16 === 0 ? P.s3 : x < 40 ? P.s6 : P.s5);
  }
  // Giebeldreiecke vorn und hinten (Stülpschalung), vorn mit Lüftung und Holzfisch
  for (const gz of [0, 1, FZ - 1, FZ]) {
    for (let x = 0; x < FW; x++) {
      for (let y = FTOP + 1; y <= roofHeight(x) - 2; y++) m.set(x, y, gz, gz === FZ ? sidingColor(x, y, seed) : P.e4);
    }
  }
  m.box(37, 56, FZ, 42, 60, FZ, (x, y) => (x === 37 || x === 42 || y === 56 || y === 60 ? P.e3 : y % 2 ? P.e1 : P.e4));
  const fish = ['...####...#', '.########.#', '#.#########', '.########.#', '...####...#'];
  fish.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') m.set(34 + i, 53 - r, FZ + 1, r === 0 || (r === 1 && i > 2) ? P.e8 : P.e7);
  });
  m.set(36, 51, FZ + 2, P.e2); // Auge
  // Plane mit zwei Reifen auf der Westseite
  for (let x = 8; x <= 27; x++) {
    for (let z = 28; z <= 49; z++) {
      const rim = x === 8 || x === 27 || z === 28 || z === 49;
      if (rim && hash3(x, 1, z, seed) < 0.3) continue;
      const fold = (x + z * 2) % 9 === 0;
      m.set(x, roofHeight(x) + 1, z, fold ? P.b1 : (x + z) % 13 === 0 ? P.b3 : P.b2);
    }
  }
  for (const [cx, cz] of [[14, 34], [21, 43]]) {
    for (let x = cx - 5; x <= cx + 5; x++) {
      for (let z = cz - 5; z <= cz + 5; z++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (d > 4.6 || d < 2.2) continue;
        const y = roofHeight(x) + 2;
        m.set(x, y, z, P.s1);
        if (d < 3.9) m.set(x, y + 1, z, z < cz ? P.s3 : (x + z) % 2 ? P.s2 : P.s1);
      }
    }
  }
  // Solarpaneel auf der Ostseite: Rahmen, Zellen mit Gitter, ein Lichtstreif
  for (let x = 50; x <= 67; x++) {
    for (let z = 10; z <= 29; z++) {
      const frame = x === 50 || x === 67 || z === 10 || z === 29;
      const grid = (x - 50) % 4 === 0 || (z - 10) % 5 === 0;
      const glint = Math.abs(x - 50 - (z - 10) * 0.8 - 4) < 1.2;
      m.set(x, roofHeight(x) + 1, z, frame ? P.s6 : grid ? P.b0 : glint ? P.b3 : P.b1);
    }
  }
  // Ofenrohr mit Bändern, Ruß und Regenhut
  const cx = 64;
  const cz = 8;
  const base = roofHeight(cx) + 1;
  m.cylinder(cx, cz, base - 2, 71, 2.3, (x, y) => (y >= 70 ? P.s1 : y % 5 === 0 ? P.s5 : x < cx ? P.s4 : P.s3));
  for (const [dx, dz] of [[-2, -2], [1, -2], [-2, 1], [1, 1]]) m.set(cx + dx, 72, cz + dz, P.s2);
  m.cylinder(cx, cz, 73, 73, 3.4, P.s3);
  m.cylinder(cx, cz, 74, 74, 2.4, P.s5);
  m.set(cx - 1, 75, cz - 1, P.s6).set(cx, 75, cz - 1, P.s6).set(cx - 1, 75, cz, P.s6).set(cx, 75, cz, P.s6);
  // Rauch steigt über dem Hut auf (grobe Einheiten für toWorld)
  return { model: m, chimneyTop: { x: cx / 2, y: 76 / 2, z: cz / 2 } };
}

/** Lichterkette unter der vorderen Dachkante: Draht in Bögen, Lämpchen darunter. */
function wireY(x) {
  const k = ((x % 12) + 12) % 12;
  return roofHeight(x) - 3 - Math.round(Math.sin((k / 12) * Math.PI) * 2);
}

function buildFairyLights() {
  const m = new VoxelModel();
  const colors = [P.f7, P.f6, P.a1, P.a6, P.f5];
  let i = 0;
  for (let x = -2; x <= FW + 1; x += 4) {
    m.set(x, wireY(x) - 1, FD + 6, colors[i % colors.length]);
    i++;
  }
  return m;
}

function buildFairyWire() {
  const m = new VoxelModel();
  for (let x = -3; x <= FW + 2; x++) {
    m.set(x, wireY(x), FD + 6, P.e2);
    if (((x % 12) + 12) % 12 === 0) m.set(x, wireY(x) + 1, FD + 6, P.s3); // Haken
  }
  return m;
}

/**
 * Vordach über der Tür: kurz und hoch genug, dass man Tür und Bullauge
 * darunter sieht (M13); zwei Streben halten es an der Wand, keine Stangen.
 */
function buildAwning() {
  const m = new VoxelModel();
  const x0 = 8;
  const x1 = 43;
  const z0 = FZ + 2;
  const zFront = FZ + 14;
  const fabricY = (z) => 45 - Math.floor((z - z0) / 4);
  // Leiste an der Wand und zwei Streben
  m.box(x0, 46, FZ + 1, x1, 46, FZ + 1, P.e3);
  for (const x of [x0 + 1, x1 - 1]) m.line(x, 33, FZ + 1, x, fabricY(zFront - 1) - 1, zFront - 1, P.e3);
  // Stoffbahn: Streifen grün und creme, zur Wand hin im Schatten, vorn gewellter Saum
  for (let z = z0; z <= zFront; z++) {
    const y = fabricY(z);
    for (let x = x0; x <= x1; x++) {
      const green = Math.floor((x - x0) / 4) % 2 === 0;
      let c = green ? P.g5 : P.e9;
      if (z < z0 + 2) c = green ? P.g4 : P.e8;
      m.set(x, y, z, c);
      if (z === zFront) {
        const k = (x - x0) % 4;
        m.set(x, y - 1, z, c);
        if (k === 1 || k === 2) m.set(x, y - 2, z, green ? P.g4 : P.e8);
      }
    }
  }
  // Wandlaterne rechts neben der Tür (das Glas leuchtet separat)
  m.box(36, 34, FZ + 1, 37, 34, FZ + 3, P.s2); // Arm
  m.box(35, 32, FZ + 2, 38, 33, FZ + 5, (x, y) => (y === 33 ? P.s3 : P.s2)); // Dach
  m.set(36, 34, FZ + 3, P.s4).set(37, 34, FZ + 3, P.s4);
  m.box(35, 26, FZ + 2, 38, 26, FZ + 5, P.s1); // Boden
  for (const [x, z] of [[35, FZ + 2], [38, FZ + 2], [35, FZ + 5], [38, FZ + 5]]) m.box(x, 27, z, x, 31, z, P.s2);
  return m;
}

function buildLanternGlass() {
  const m = new VoxelModel();
  m.box(36, 27, FZ + 3, 37, 31, FZ + 5, 0xffffff);
  m.box(35, 27, FZ + 3, 35, 31, FZ + 4, 0xffffff).box(38, 27, FZ + 3, 38, 31, FZ + 4, 0xffffff);
  return m;
}

// --- Ausbaustufe 2: Hütte ------------------------------------------------------
// Anbau im Osten (grob x 40..57, z 6..27) mit Leseecke, Veranda über die ganze Front.

const AX0 = W;
const AX1 = W + 17;
const FAX0 = AX0 * 2; // 80
const FAX1 = AX1 * 2 + 1; // 115
const FAZ0 = 12;
const AWIN = { x0: 92, x1: 105, y0: 16, y1: 27, mx: 98 };

function annexRoofHeight(x) {
  return 43 - Math.floor((x - FAX0) / 4);
}

function buildAnnexBase(seed) {
  const m = new VoxelModel();
  m.box(FAX0, 0, FAZ0, FAX1, 3, FD - 1, (x, y) => {
    if (y === 0) return P.e3;
    if (y === 3) return x % 16 === 15 ? P.e3 : P.e4;
    const k = x % 16;
    return k < 3 || (k >= 7 && k <= 8) || k > 12 ? P.e3 : P.e1;
  });
  m.box(FAX0, 4, FAZ0, FAX1, 5, FD - 1, (x, y) => (y === 5 ? P.e5 : P.e4));
  // Nord- und Ostwand (nur Schatten)
  m.box(FAX0, FFLOOR, FAZ0, FAX1, 39, FAZ0 + 1, P.e4);
  m.box(FAX1 - 1, FFLOOR, FAZ0, FAX1, 39, FD - 1, P.e4);
  return m;
}

function buildAnnexFront(seed) {
  const m = new VoxelModel();
  const inWindow = (x, y) => x >= AWIN.x0 && x <= AWIN.x1 && y >= AWIN.y0 && y <= AWIN.y1;
  for (let y = FFLOOR; y <= 39; y++) {
    for (let x = FAX0; x <= FAX1; x++) {
      if (inWindow(x, y)) continue;
      m.set(x, y, FZ - 1, P.e3).set(x, y, FZ, wallColor(x, y, seed + 9));
    }
  }
  for (let x = FAX0; x <= FAX1; x++) {
    if (x >= AWIN.x0 - 2 && x <= AWIN.x1 + 2) continue;
    m.set(x, 10, FZ + 1, P.e3).set(x, 11, FZ + 1, x % 4 === 2 ? P.s5 : P.e5);
  }
  for (let y = AWIN.y0 - 2; y <= AWIN.y1 + 2; y++) {
    for (let x = AWIN.x0 - 2; x <= AWIN.x1 + 2; x++) {
      const border = x < AWIN.x0 || x > AWIN.x1 || y < AWIN.y0 || y > AWIN.y1;
      if (border) m.set(x, y, FZ + 1, frameColor(x, y, seed + 6, x > AWIN.x1 || y < AWIN.y0)).set(x, y, FZ, FRAME[1]);
      else if (x === AWIN.mx || x === AWIN.mx + 1) m.set(x, y, FZ, x === AWIN.mx ? FRAME[0] : FRAME[1]);
    }
  }
  // Fensterbank und Kräuterkasten
  m.box(AWIN.x0 - 3, AWIN.y0 - 3, FZ + 1, AWIN.x1 + 3, AWIN.y0 - 3, FZ + 2, (x, y, z) => (z === FZ + 2 ? P.e6 : P.e5));
  m.box(AWIN.x0 - 2, AWIN.y0 - 7, FZ + 2, AWIN.x1 + 2, AWIN.y0 - 4, FZ + 4, (x, y, z) => (y === AWIN.y0 - 4 ? (z === FZ + 4 ? P.e6 : P.e2) : y === AWIN.y0 - 7 ? P.e3 : P.e4));
  for (let x = AWIN.x0 - 1; x <= AWIN.x1 + 1; x++) {
    const k = Math.floor((x - AWIN.x0 + 1) / 4) % 3; // Schnittlauch, Lavendel, Petersilie
    const h = hash3(x, 5, 0, seed);
    const y0 = AWIN.y0 - 3;
    if (k === 0) m.box(x, y0, FZ + 3, x, y0 + 2 + (h > 0.5 ? 1 : 0), FZ + 3, P.g6).set(x, y0 + 3 + (h > 0.5 ? 1 : 0), FZ + 3, h > 0.7 ? P.a3 : P.g7);
    else if (k === 1) m.box(x, y0, FZ + 3, x, y0 + 1, FZ + 3, P.g4).set(x, y0 + 2, FZ + 3, h > 0.4 ? P.a2 : P.a3);
    else m.set(x, y0, FZ + 3, P.g5).set(x, y0 + 1, FZ + 3, h > 0.5 ? P.g6 : P.g5);
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
  for (let x = FAX0; x <= FAX1 + 4; x++) {
    const h = annexRoofHeight(x);
    for (let z = FAZ0 - 4; z <= FD + 3; z++) {
      const sheet = Math.floor((z - FAZ0 + 4) / 16);
      const grey = sheet % 3 === 1;
      const u = (z - FAZ0 + 4) % 16;
      let c = grey ? (u % 3 === 2 ? P.s4 : P.s5) : u % 3 === 2 ? P.r2 : P.r3;
      if (u === 15) c = grey ? P.s3 : P.r1;
      if (u % 3 === 1 && (x - FAX0) % 12 === 6) c = P.s7;
      if (z === FD + 3) c = grey ? P.s6 : P.r4;
      m.set(x, h, z, c);
      m.set(x, h - 1, z, z === FD + 3 ? P.e3 : grey ? P.s3 : P.r1);
    }
  }
  // Giebelwand zwischen Anbauwand und Dach
  for (let x = FAX0; x <= FAX1; x++) {
    for (let y = 40; y < annexRoofHeight(x) - 1; y++) {
      m.set(x, y, FZ, sidingColor(x, y + 6, seed + 3)).set(x, y, FZ - 1, P.e3);
      m.set(x, y, FAZ0, P.e4);
    }
  }
  // Regenrinne mit Fallrohr an der Vorderecke
  const gy = annexRoofHeight(FAX1 + 4) - 1;
  for (let z = FAZ0 - 4; z <= FD + 3; z++) m.set(FAX1 + 5, gy, z, z % 8 === 0 ? P.s4 : P.s5).set(FAX1 + 6, gy + 1, z, P.s6);
  m.box(FAX1 + 5, 1, FD + 3, FAX1 + 5, gy - 1, FD + 3, (x, y) => (y % 8 === 0 ? P.s3 : P.s4));
  m.set(FAX1 + 5, 0, FD + 4, P.s4).set(FAX1 + 5, 0, FD + 5, P.s5);
  return m;
}

function buildDeck(seed) {
  const m = new VoxelModel();
  const x0 = -4;
  const x1 = FAX1 + 2;
  const z0 = FD;
  const z1 = FD + 11;
  m.box(x0, 0, z0, x1, 3, z1, (x, y, z) => {
    if (y === 3) return deckColor(x, z - z0, seed + 11);
    if (z === z1) return y === 0 ? P.e2 : x % 12 < 2 ? P.e3 : P.e4; // Balkenköpfe
    return P.e3;
  });
  // Geländer vorn mit Lücke für die Treppe: Pfosten mit Kappe, Handlauf, Stäbe
  const gap0 = (DOOR.x0 - 1) * 2;
  const gap1 = (DOOR.x1 + 1) * 2 + 1;
  const posts = [-4, 8, 14, 34, 44, 56, 68, 80, 92, 104, 116];
  const rail = (x) => {
    m.set(x, 13, z1 - 1, P.e4).set(x, 13, z1, P.e5).set(x, 14, z1 - 1, P.e6).set(x, 14, z1, P.e6); // Handlauf
    m.set(x, 5, z1, P.e4); // unterer Riegel
    if (x % 3 === 0) m.box(x, 6, z1, x, 12, z1, P.e5); // Stäbe
  };
  for (let x = x0; x <= x1; x++) if (x < gap0 || x > gap1) rail(x);
  for (const px of posts) {
    m.box(px, 4, z1 - 1, px + 1, 15, z1, (x, y) => (y === 15 ? P.e6 : x === px ? P.e4 : P.e3));
    m.box(px, 16, z1 - 1, px + 1, 16, z1, P.e7);
  }
  // Seitengeländer (von vorn nur Handlauf und Pfosten zu sehen)
  for (let z = z0; z <= z1; z++) {
    for (const x of [x0, x0 + 1, x1 - 1, x1]) m.set(x, 14, z, P.e6).set(x, 13, z, P.e4);
  }
  for (const x of [x0, x1 - 1]) m.box(x, 4, z0, x + 1, 15, z0 + 1, (xx, y) => (y === 15 ? P.e6 : P.e3));
  // Treppe
  m.box(gap0, 0, z1 + 1, gap1, 1, z1 + 4, (x, y, z) => (y === 1 ? deckColor(x, z - z1 - 1, seed + 12, { width: 4 }) : z === z1 + 4 ? P.e3 : P.e4));
  // Blumentöpfe auf der Veranda: Terrakotta mit Rand, Geranie, Lavendel, Heidekraut
  const plants = [
    [48, [P.r4, P.r3]],
    [68, [P.a0, P.a1]],
    [88, [P.a2, P.a3]],
  ];
  for (const [px, [c1, c2]] of plants) {
    m.cylinder(px + 1.5, z1 - 4.5, 4, 8, 2.3, (x, y) => (y === 8 ? P.r4 : y === 4 ? P.r1 : x < px + 1 ? P.r3 : P.r2));
    m.cylinder(px + 1.5, z1 - 4.5, 8, 8, 1.4, P.e2);
    for (let k = 0; k < 9; k++) {
      const x = px + (k % 3);
      const z = z1 - 6 + Math.floor(k / 3);
      const top = 9 + ((k * 7) % 3);
      m.box(x, 9, z, x, top, z, P.g4).set(x, top + 1, z, k % 2 ? c1 : k % 3 ? c2 : P.g5);
    }
  }
  return m;
}

// --- Ausbaustufen 3–5 von außen (M11): innen ein neuer Raum, außen ein Zeichen dafür ------

/** Stufe 3 (Schlafzimmer unterm Dach): ein Dachfenster in der Westseite des Dachs. */
function buildRoofWindow() {
  const m = new VoxelModel();
  const glass = new VoxelModel();
  // Neben der Plane (z 28..49): weiter nördlich, damit sich nichts überlagert
  for (let x = 10; x <= 23; x++) {
    for (let z = 6; z <= 21; z++) {
      const frame = x <= 11 || x >= 22 || z <= 7 || z >= 20;
      const bar = z === 13 || z === 14;
      const y = roofHeight(x) + 1;
      if (frame) m.set(x, y, z, x <= 11 || z <= 7 ? P.e3 : P.e2).set(x, y + 1, z, z === 20 || z === 21 ? P.e4 : P.e3);
      else if (bar) m.set(x, y, z, P.e3);
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
  m.box(2, 14, z, 13, 33, z, (x, y) => (x === 2 || x === 13 || y === 14 || y === 33 ? P.e4 : (x % 3 === 1 && y % 3 === 1 ? P.e3 : P.e6)));
  // Säge: Blatt mit Zähnen, Griff
  for (let y = 17; y <= 29; y++) {
    const x = 4 + Math.floor((29 - y) / 6);
    m.set(x, y, z + 1, P.s7).set(x + 1, y, z + 1, y % 2 ? P.s5 : P.s8);
  }
  m.box(4, 30, z + 1, 6, 32, z + 1, (x, y) => (x === 5 && y === 31 ? P.e6 : P.e3));
  // Axt: Stiel und Kopf
  m.box(10, 17, z + 1, 10, 29, z + 1, P.e5);
  m.box(8, 27, z + 1, 12, 30, z + 1, (x, y) => (x === 8 ? P.s8 : y === 30 ? P.s6 : P.s5));
  // Hammer
  m.box(7, 18, z + 1, 7, 24, z + 1, P.e4).box(6, 24, z + 1, 8, 25, z + 1, P.s4);
  // Sägebock auf der Veranda mit einem Stamm
  for (const lx of [1, 12]) {
    m.box(lx, 4, z + 4, lx + 1, 12, z + 4, P.e3);
    m.box(lx, 4, z + 8, lx + 1, 12, z + 8, P.e3);
    m.box(lx, 9, z + 5, lx + 1, 9, z + 7, P.e4);
  }
  m.box(0, 13, z + 4, 15, 14, z + 8, (x, y) => (y === 14 ? P.e6 : P.e4));
  m.box(2, 15, z + 5, 12, 17, z + 7, (x, y, zz) => (x === 12 ? (y === 16 && zz === z + 6 ? P.e6 : P.e8) : y === 17 ? P.e4 : P.e3));
  return m;
}

/** Stufe 5 (Lager): Kisten, ein Sack und ein Fass am Ostende der Veranda. */
function buildVerandaCrates() {
  const m = new VoxelModel();
  const crate = (x0, y0, z0, mark) =>
    m.box(x0, y0, z0, x0 + 7, y0 + 7, z0 + 7, (x, y, z) => {
      const edge = (x === x0 || x === x0 + 7) + (y === y0 || y === y0 + 7) + (z === z0 || z === z0 + 7) >= 2;
      if (edge) return P.e3;
      if ((y - y0) % 3 === 0 && z === z0 + 7) return P.e3; // Fugen vorn
      if (mark && z === z0 + 7 && y === y0 + 4 && x > x0 + 1 && x < x0 + 6) return P.r3;
      return hash3(x, y, z, 5) < 0.3 ? P.e6 : P.e5;
    });
  crate(100, 4, FD, true);
  crate(108, 4, FD, false);
  crate(104, 12, FD, false);
  // Sack oben auf den Kisten
  m.ellipsoid(106, 21, FD + 4, 3, 2.2, 2.5, (x, y) => (y > 21 ? P.e9 : P.e8));
  m.set(106, 23, FD + 4, P.e6);
  // Fass mit Reifen
  m.cylinder(95, FD + 5, 4, 13, 3.6, (x, y) => (y === 6 || y === 11 ? P.s3 : x < 95 ? P.e5 : P.e4));
  m.cylinder(95, FD + 5, 13, 13, 2.8, P.e3);
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
  const baseMat = createWorldMaterial({ occluder: true });
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

  // Sichtbare Flächen für die Kamera (feines Maß), Schatten über einen groben
  // Stellvertreter – feiner zeichnet die Schattenkarte ohnehin nicht.
  const mesh = (model, material, { shadow = 'coarse', jitter = 0.04 } = {}) => {
    const visual = new THREE.Mesh(model.toGeometry({ jitter, seed, visibleOnly: true, size: FINE }), material);
    visual.castShadow = false;
    visual.receiveShadow = true;
    if (shadow !== 'none') {
      const proxy = new THREE.Mesh(shadowGeometry(model, shadow, FINE), SHADOW_PROXY_MATERIAL);
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
  const door = new THREE.Mesh(buildDoor(seed).toGeometry({ jitter: 0.04, seed, size: FINE }), baseMat);
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
      porch: toWorld(18.5, 14.75, 29.75), // Wandlaterne neben der Tür (feine Mitte 37, 29,5, 59,5)
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
