// Die Insel im Nebel (N7): Boden, Felsen und Apfelbaum im Maß 1/16 (Natur), Hütte aus
// Treibholz, Glockengestell mit Marthes Schiffsglocke, Wäscheleine, Feuerstelle und Marthes
// Kahn im Maß 1/32. Dazu der Seenebel (gerasterte Lagen mit freier Sicht um Boot und Insel)
// und in der Bucht, wenn die drei dort wohnen: der geflickte Kahn am Steg und die Reuse.
// Was geschieht, entscheidet core/fogIsle.js.

import * as THREE from 'three';
import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { hash3 } from '../core/rng.js';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { sharedUniforms } from '../render/materials.js';
import { BAYER_GLSL } from '../render/shaders.js';
import { FINE, FINE32, sculpt, blob, capsule, shade, stoneBlob, logX, edgeLight } from './voxelKit.js';
import { FOG_ISLE, FOG_SPOTS, BAY_SPOTS, SEA_FOG, fogIsleEdge } from '../data/fogIsle.js';

// --- Modelle ------------------------------------------------------------------------

/** Der Inselboden (1/16): Gras, zum Wasser hin Kies und Sand, vor dem Anleger ein Kiesstrand. */
function buildGround(seed) {
  const m = new VoxelModel();
  const C = FOG_ISLE;
  for (let i = -80; i <= 80; i++) {
    for (let k = -64; k <= 64; k++) {
      const x = C.x + (i + 0.5) * FINE;
      const z = C.z + (k + 0.5) * FINE;
      const e = fogIsleEdge(x, z);
      if (e >= 0) continue;
      const h = hash3(i >> 1, 0, k >> 1, seed);
      let c;
      if (e > -0.3) c = h < 0.3 ? P.s6 : h < 0.55 ? P.e7 : h < 0.8 ? P.e8 : P.s7; // Kies und Sand am Wasser
      else if (e > -0.55) c = h < 0.5 ? P.e6 : P.g4; // Übergang
      else c = h < 0.18 ? P.g4 : h < 0.72 ? P.g5 : h < 0.93 ? P.g6 : P.f5; // Gras mit welkem Laub
      // Trampelpfad vom Anleger zum Feuer und zur Hütte
      const path = Math.abs(z - FOG_SPOTS.fire.z + (x - FOG_SPOTS.fire.x) * 0.05) < 0.28 && x < FOG_SPOTS.fire.x && x > FOG_SPOTS.shore.x - 0.4;
      const toHut = Math.abs(x - FOG_SPOTS.hut.x) < 0.26 && z < FOG_SPOTS.fire.z - 0.3 && z > FOG_SPOTS.hut.z + 0.5;
      if ((path || toHut) && e < -0.3) c = h < 0.5 ? P.e5 : P.e4;
      m.set(i, 0, k, c);
    }
  }
  // Felsen am Ufer, oben mit Moos (Stellen relativ zur Inselmitte, in Metern)
  const rocks = [[-3.7, -1.6, 7, 6, 6], [-3.9, 1.3, 6, 4, 5], [3.9, -1.0, 8, 7, 6], [2.9, 2.5, 6, 5, 5], [-1.4, -3.0, 7, 5, 5], [1.6, -3.0, 5, 4, 4], [4.2, 1.2, 4, 3, 4]];
  rocks.forEach(([rx, rz, a, b, c], n) => {
    const cx = Math.round(rx * 16);
    const cz = Math.round(rz * 16);
    stoneBlob(m, cx, cz, a, b, c, seed + n);
    m.forEach((x, y, z, col) => {
      if (Math.abs(x - cx) <= a && Math.abs(z - cz) <= c && y >= b - 1 && !m.has(x, y + 1, z) && hash3(x >> 1, y, z >> 1, seed + 40 + n) < 0.45) m.set(x, y, z, P.g4);
    });
  });
  // Grasbüschel und ein paar Kiesel
  for (let n = 0; n < 70; n++) {
    const i = Math.round((hash3(n, 1, 2, seed) - 0.5) * 150);
    const k = Math.round((hash3(n, 3, 4, seed) - 0.5) * 110);
    const x = C.x + i * FINE;
    const z = C.z + k * FINE;
    const e = fogIsleEdge(x, z);
    if (e > -0.6 || m.has(i, 1, k)) continue;
    const tall = 1 + Math.floor(hash3(n, 5, 6, seed) * 3);
    for (let y = 1; y <= tall; y++) m.set(i, y, k, y === tall ? P.g7 : P.g6);
    m.set(i + 1, 1, k, P.g6);
  }
  return m;
}

/** Apfelbaum (1/16): knorriger Stamm, runde Krone in Herbstfarben, rote Äpfel, Fallobst. */
function buildAppleTree(seed) {
  const m = new VoxelModel();
  sculpt(m, capsule(0, 0, 0, 1, 17, 0, 2.3, 1.7), -4, 0, -4, 4, 18, 4, (x, y, z, n) => (n.x < -0.3 ? P.e4 : hash3(x, y >> 1, z, seed) < 0.2 ? P.e2 : P.e3));
  sculpt(m, capsule(1, 14, 0, 6, 20, -1, 1.2), -2, 12, -3, 8, 22, 2, P.e3); // Ast nach rechts
  sculpt(m, capsule(0, 15, 0, -5, 21, 1, 1.2), -7, 13, -2, 2, 23, 3, P.e3); // Ast nach links
  const crown = (x, y, z) => Math.min(blob(0.5, 28, 0, 14, 10, 12)(x, y, z), blob(-5, 24, 3, 8, 6, 7)(x, y, z), blob(7, 25, 2, 7, 6, 7)(x, y, z));
  sculpt(m, crown, -16, 16, -13, 16, 38, 13, (x, y, z, n) => {
    const h = hash3(x >> 1, y >> 1, z >> 1, seed + 1);
    if (n.z > 0.3 && hash3(x, y, z, seed + 2) < 0.045) return hash3(x, y, z, seed + 3) < 0.5 ? P.f2 : P.r3; // Äpfel
    if (n.y > 0.55) return h < 0.3 ? P.g8 : h < 0.55 ? P.f6 : P.g7;
    if (n.y < -0.4) return h < 0.5 ? P.g3 : P.g4;
    return h < 0.2 ? P.f5 : h < 0.6 ? P.g6 : P.g5;
  });
  // Fallobst im Gras
  for (const [x, z] of [[-6, 7], [5, 9], [9, 4], [-3, 11], [11, 8]]) m.set(x, 0, z, P.f2).set(x + 1, 0, z, P.r3);
  return m;
}

/** Hütte aus Treibholz (1/32): graue Bretter, Bullauge, Tür mit Tauwerk, geflicktes Dach, Ofenrohr. */
function buildDriftwoodHut(seed) {
  const m = new VoxelModel();
  const W = 28; // halbe Breite
  const D = 20; // halbe Tiefe
  const H = 46; // Traufhöhe
  const board = (x, y) => {
    const b = Math.floor((x + 64) / 5);
    const tones = [P.s6, P.s7, P.e6, P.s5, P.s6, P.e7];
    if ((x + 64) % 5 === 0) return P.s3; // Fuge
    let c = tones[Math.floor(hash3(b, 0, 0, seed) * tones.length)];
    if (hash3(b, y >> 3, 0, seed + 1) < 0.08) c = shade(c, -1); // Astloch, dunkle Stelle
    if (y === 0) c = P.s3;
    return c;
  };
  // Wände als Schale (vorn, hinten, Seiten)
  for (let y = 0; y <= H; y++) {
    for (let x = -W; x <= W; x++) {
      m.set(x, y, D, board(x, y));
      m.set(x, y, -D, board(x, y));
    }
    for (let z = -D; z <= D; z++) {
      m.set(-W, y, z, board(z, y));
      m.set(W, y, z, board(z, y));
    }
  }
  // Giebel (First entlang x): Dachflächen nach vorn und hinten, Bretter mit Teerpappe
  for (let x = -W - 3; x <= W + 3; x++) {
    for (let z = -D - 4; z <= D + 4; z++) {
      const y = H + 1 + Math.round((D + 4 - Math.abs(z)) * 0.62);
      const patch = x > 4 && x < 18 && z > 2 && z < 14;
      let c = (x + 64) % 6 === 0 ? P.e2 : hash3(x >> 2, 0, z >> 2, seed + 2) < 0.4 ? P.e4 : P.e3;
      if (patch) c = (x + z) % 5 === 0 ? P.n3 : P.n2;
      if (Math.abs(z) <= 1) c = P.e5; // Firstbrett
      m.set(x, y, z, c);
      m.set(x, y - 1, z, P.e2);
    }
  }
  // Steine halten die Pappe fest
  for (const [x, z] of [[7, 7], [15, 11], [-12, 9]]) {
    const y = H + 1 + Math.round((D + 4 - Math.abs(z)) * 0.62) + 1;
    m.box(x - 1, y, z - 1, x + 1, y + 1, z + 1, (xx, yy) => (yy > y ? P.s7 : P.s5));
  }
  // Tür: dunklere Bretter, Tau als Griff, darüber ein Hufeisen
  for (let y = 0; y <= 36; y++) for (let x = -8; x <= 6; x++) m.set(x, y, D + 1, (x + 64) % 5 === 0 ? P.e2 : y === 36 || x === -8 || x === 6 ? P.e3 : P.e4);
  m.box(3, 17, D + 2, 4, 19, D + 2, P.e7);
  m.set(4, 16, D + 2, P.e6);
  for (const [x, y] of [[-3, 39], [-2, 41], [-1, 42], [0, 42], [1, 41], [2, 39]]) m.set(x, y, D + 1, P.s5);
  // Bullauge: Messingring, Glas mit Lichtpunkt
  for (let y = 22; y <= 33; y++) {
    for (let x = 12; x <= 23; x++) {
      const d = Math.hypot(x - 17.5, y - 27.5);
      if (d > 6) continue;
      m.set(x, y, D + 1, d > 4.6 ? (y > 28 ? P.f6 : P.f4) : d < 1.5 && x < 17 ? P.s9 : y > 28 ? P.b4 : P.b3);
    }
  }
  // Ein Fischernetz mit zwei Schwimmern links neben der Tür
  for (let y = 10; y <= 34; y++) for (let x = -24; x <= -12; x++) if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) m.set(x, y, D + 1, P.s8);
  m.box(-22, 16, D + 2, -20, 18, D + 3, P.f2);
  m.box(-15, 24, D + 2, -13, 26, D + 3, P.s9);
  // Ofenrohr hinten rechts, mit Hut
  for (let y = H + 6; y <= H + 26; y++) m.box(18, y, -12, 21, y, -9, (x) => (x === 18 ? P.s4 : P.s3));
  m.box(16, H + 27, -14, 23, H + 28, -7, P.s4);
  return edgeLight(m);
}

/** Glockengestell (1/32) ohne Glocke: zwei Pfosten aus Treibholz, Querbalken, Tau zum Pfosten. */
function buildBellFrame(seed) {
  const m = new VoxelModel();
  const post = (x0) => {
    for (let y = 0; y <= 52; y++) m.box(x0, y, -2, x0 + 3, y, 1, (x) => (x === x0 ? P.s7 : hash3(x0, y >> 2, 0, seed) < 0.15 ? P.s5 : P.s6));
  };
  post(-17);
  post(14);
  for (let x = -20; x <= 20; x++) m.box(x, 49, -2, x, 53, 1, (xx, y) => (y === 53 ? P.s7 : (x + 64) % 9 === 0 ? P.s4 : P.s6));
  // Streben
  for (let k = 0; k < 9; k++) {
    m.set(-13 + k, 48 - k, 0, P.s5);
    m.set(13 - k, 48 - k, 0, P.s5);
  }
  // Das Glockenseil ist am rechten Pfosten festgebunden
  m.box(18, 20, 1, 18, 22, 2, P.e7);
  return edgeLight(m);
}

/** Die Schiffsglocke (1/32) mit Joch, Klöppel und Seil – eigenes Teil, damit sie schwingen kann. */
function buildShipBell() {
  const m = new VoxelModel();
  // Joch unter dem Balken (Ursprung = Aufhängung)
  m.box(-3, -3, -2, 2, 0, 1, P.s3);
  // Glockenkörper: oben schmal, unten weit, mit Wulst am Rand
  for (let y = -4; y >= -17; y--) {
    const t = (-4 - y) / 13;
    const r = 3.6 + t * t * 3.4 + (y <= -15 ? 0.8 : 0);
    for (let x = -8; x <= 7; x++) {
      for (let z = -8; z <= 7; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d > r) continue;
        if (y <= -16 && d < r - 1.6) continue; // die Öffnung unten
        let c = x < -2 ? P.f7 : x < 2 ? P.f6 : P.f4;
        if (y <= -15) c = y === -17 ? P.f3 : P.f5; // Wulst
        if (y === -9 && z > 3) c = P.f4; // Zierband mit der Gravur
        m.set(x, y, z, c);
      }
    }
  }
  m.box(-1, -19, -1, 0, -18, 0, P.s3); // Klöppel
  for (let y = -34; y <= -20; y++) m.set(0, y, 0, y % 4 === 0 ? P.e6 : P.e7); // Seil
  m.box(-1, -36, -1, 1, -35, 1, P.e6); // Knoten
  return m;
}

/** N8: Marthes Glocke am Steg – ein Pfahl aus Treibholz mit Ausleger nach Osten (die Glocke hängt eigens daran). */
function buildBellPost(seed) {
  const m = new VoxelModel();
  for (let y = 0; y <= 56; y++) m.box(-2, y, -2, 1, y, 1, (x) => (x === -2 ? P.s7 : hash3(0, y >> 2, 0, seed) < 0.15 ? P.s5 : P.s6));
  for (let x = 2; x <= 14; x++) m.box(x, 53, -1, x, 55, 0, (xx, y) => (y === 55 ? P.s7 : P.s6));
  for (let k = 0; k < 8; k++) m.set(2 + k, 44 + k, 0, P.s5); // Strebe
  m.box(-3, 20, -3, 2, 22, 2, P.e7); // Tau um den Pfahl
  return edgeLight(m);
}

/** Wäscheleine (1/32) mit zwei Pfählen – die Wäsche hängt einzeln daran (Wind). */
function buildLine() {
  const m = new VoxelModel();
  for (const x0 of [-26, 24]) m.box(x0, 0, 0, x0 + 2, 46, 2, (x, y) => (x === x0 ? P.s7 : y % 11 === 0 ? P.s5 : P.s6));
  for (let x = -24; x < 24; x++) m.set(x, 43 - Math.round(Math.sin(((x + 24) / 48) * Math.PI) * 4), 1, (x >> 1) % 2 ? P.s7 : P.s8);
  return m;
}

/** Kinderwäsche: Ringelpulli, rote Socke, gelbes Halstuch, eine kleine Latzhose. */
function buildKidsLaundry() {
  const sag = (x) => 43 - Math.round(Math.sin(((x + 24) / 48) * Math.PI) * 4);
  const pieces = [];
  const piece = (x0, rows, colors) => {
    const m = new VoxelModel();
    const anchor = sag(x0);
    rows.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) {
        const c = colors[row[i]];
        if (c) m.set(i, sag(x0 + i) - 1 - r - anchor, 1, c);
      }
    });
    const w = rows[0].length;
    m.set(1, sag(x0 + 1) - anchor, 2, P.e7).set(w - 2, sag(x0 + w - 2) - anchor, 2, P.e7); // Klammern
    pieces.push({ model: m, x: x0, y: anchor });
  };
  piece(-20, ['SSWWWWWWWWSS', 'SSBBBBBBBBSS', 'ss.WWWWWWW.ss', '...BBBBBBBB..', '...WWWWWWWW..', '...BBBBBBBB..', '...WWWWWWWW..', '...bbbbbbbb..'], { W: P.s9, B: P.b3, b: P.b2, S: P.b3, s: P.s8 });
  piece(-4, ['rrr', 'rrr', 'wrw', 'rrr', 'rrr', 'rrrr', 'rrrr'], { r: P.r3, w: P.s9 });
  piece(2, ['yyyyyy', 'yoyoyo', '.yyyy.', '..yy..'], { y: P.f6, o: P.f5 });
  piece(10, ['.dd..dd.', '.dd..dd.', 'dddddddd', 'dDDDDDDd', 'dDDddDDd', 'dDDDDDDd', 'ddd..ddd', 'ddd..ddd', 'ddd..ddd', 'eee..eee'], { d: P.g4, D: P.g5, e: P.g3 });
  return pieces;
}

/** Feuerstelle (1/32): Steinkreis, verkohlte Scheite, Asche, ein Blechkessel. */
function buildFirePit(seed) {
  const m = new VoxelModel();
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    stoneBlob(m, Math.round(Math.cos(a) * 11), Math.round(Math.sin(a) * 9), 3, 3, 3, seed + k, [P.s3, P.s4, P.s5, P.s6, P.s7]);
  }
  for (let x = -7; x <= 7; x++) for (let z = -6; z <= 6; z++) if (x * x + z * z < 45) m.set(x, 0, z, hash3(x, 0, z, seed) < 0.4 ? P.s4 : P.s3);
  logX(m, -6, 5, 2, -1, 1.6, seed, { bark: [P.n1, P.e1, P.e2] });
  logX(m, -4, 7, 2, 2, 1.5, seed + 1, { bark: [P.n1, P.e1, P.e2] });
  // Kessel auf einem Stein am Rand
  for (let y = 4; y <= 9; y++) for (let x = 11; x <= 17; x++) for (let z = 4; z <= 10; z++) if (Math.hypot(x - 14, z - 7) < (y === 9 ? 2.2 : 3.2)) m.set(x, y, z, x < 13 ? P.s6 : P.s4);
  for (let x = 11; x <= 17; x++) m.set(x, 12, 7, P.s3);
  m.set(11, 11, 7, P.s3).set(17, 11, 7, P.s3).set(11, 10, 7, P.s3).set(17, 10, 7, P.s3);
  return edgeLight(m);
}

/**
 * Marthes Kahn (1/32): flach, vorn und hinten gerade abgeschnitten, drei Planken je Seite,
 * eine Ducht, zwei Riemen. `mended`: Das Leck in der mittleren Planke ist geflickt (helles
 * neues Brett, Nagelköpfe, Leim aus Zucker und Harz), sonst klafft dort ein dunkles Loch.
 */
export function buildKahn(seed, mended) {
  const m = new VoxelModel();
  const L = 36; // halbe Länge
  const B = 13; // halbe Breite
  for (let x = -L; x <= L; x++) {
    const end = Math.abs(x) > L - 3;
    for (let y = 0; y <= 10; y++) {
      const w = B - (y === 0 ? 1 : 0);
      for (let z = -w; z <= w; z++) {
        const side = Math.abs(z) >= w - 1;
        const floor = y === 0;
        if (!side && !floor && !end) continue; // innen hohl
        const strake = y <= 3 ? 0 : y <= 7 ? 1 : 2;
        let c = [P.e4, P.e5, P.e4][strake];
        if (y === 3 || y === 7) c = P.e2; // Fugen
        if (y === 10) c = P.e6; // Dollbord
        if (floor && !side) c = hash3(x >> 2, 0, z >> 2, seed) < 0.3 ? P.e3 : P.e4;
        if (hash3(x >> 3, y, z, seed + 1) < 0.07) c = shade(c, -1);
        // Das Leck vorn (Südseite) in der mittleren Planke
        if (z === w && strake === 1 && x >= -8 && x <= 5 && y !== 7) {
          if (mended) c = (x + y) % 5 === 0 ? P.s4 : y === 4 ? P.f4 : P.e7;
          else c = y === 5 || y === 6 ? P.n1 : P.e2;
        }
        m.set(x, y, z, c);
      }
    }
  }
  // Ducht in der Mitte, Riemen längs darin
  for (let z = -B + 1; z <= B - 1; z++) m.box(-3, 8, z, 2, 8, z, (x) => (x === -3 ? P.e5 : P.e6));
  logX(m, -30, 24, 3, -5, 0.8, seed + 2, { ends: false, bark: [P.e6, P.e7, P.e7] });
  logX(m, -24, 30, 3, 5, 0.8, seed + 3, { ends: false, bark: [P.e6, P.e7, P.e7] });
  for (const z of [-5, 5]) m.box(z < 0 ? 24 : -30, 2, z - 2, z < 0 ? 30 : -24, 4, z + 2, P.e7); // Blätter
  if (!mended) {
    // Ein loses Brett lehnt am Leck, daneben Werkzeug
    for (let y = 0; y <= 9; y++) m.box(8 + (y >> 2), y, B + 2, 11 + (y >> 2), y, B + 2, P.e6);
  }
  return edgeLight(m);
}

/** Die Reuse (1/32): ein Weidenkorb wie ein liegender Trichter, mit Ringen und Leine zum Pfahl. */
function buildTrap(seed) {
  const m = new VoxelModel();
  for (let x = -14; x <= 14; x++) {
    const r = 3 + ((x + 14) / 28) * 4.5;
    for (let y = 0; y <= 9; y++) {
      for (let z = -8; z <= 8; z++) {
        const d = Math.hypot(y - 2, z);
        if (d > r || d < r - 1.2) continue;
        const ring = (x + 20) % 7 === 0;
        m.set(x, y, z, ring ? P.e3 : (x + y + z) % 2 ? P.e6 : P.e5);
      }
    }
  }
  // Pfahl und Leine
  m.box(-22, 0, -1, -20, 16, 1, (x) => (x === -22 ? P.e4 : P.e3));
  for (let k = 0; k < 7; k++) m.set(-19 + k, 14 - k * 2, 0, P.s7);
  // Ein Korb mit Deckel auf dem Steg davor (für den Fang)
  return edgeLight(m);
}

// --- Seenebel -----------------------------------------------------------------------

const SEA_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const SEA_FRAG = /* glsl */ `
uniform float uAmount;
uniform vec3 uColor;
uniform ivec2 uDitherOffset;
uniform ivec2 uLayer;
uniform vec3 uBoat;
uniform vec3 uIsle;
uniform vec2 uWall;
varying vec3 vWorld;
${BAYER_GLSL}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  // Das Muster steht fest in der Welt (N4: sonst flackert es), nur die freie Sicht wandert mit
  vec2 p = vWorld.xz * 0.3;
  float n = noise(p) * 0.6 + noise(p * 2.1 + 5.0) * 0.4;
  float d = uAmount * (0.62 + 0.38 * smoothstep(0.15, 0.85, n)) * smoothstep(uWall.x, uWall.y, vWorld.x);
  // Freie Sicht um Boot und Insel – je Lage nach Süden verschoben (die Kamera blickt schräg
  // von Süden: über dem Boot liegt das Loch einer hohen Lage weiter südlich)
  float lift = (vWorld.y - 0.4) * 1.3333;
  float rb = length(vWorld.xz - vec2(uBoat.x, uBoat.y + lift));
  d *= smoothstep(uBoat.z * 0.5, uBoat.z + 0.001, rb);
  float ri = length((vWorld.xz - vec2(uIsle.x, uIsle.y + lift)) * vec2(0.8, 1.0));
  d *= smoothstep(uIsle.z * 0.55, uIsle.z + 0.001, ri);
  if (bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset + uLayer) >= d) discard;
  gl_FragColor = vec4(uColor, 1.0);
}
`;

/** Seenebel: zwei große Lagen über dem See östlich der Felsinseln. */
class SeaFog {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Seenebel';
    this.uniforms = {
      uAmount: { value: 0 },
      uColor: { value: new THREE.Color(0xdde2e8) },
      uDitherOffset: sharedUniforms.uDitherOffset,
      uBoat: { value: new THREE.Vector3(0, 0, 0) },
      uIsle: { value: new THREE.Vector3(FOG_ISLE.x, FOG_ISLE.z, 0) },
      uWall: { value: new THREE.Vector2(SEA_FOG.x0, SEA_FOG.x1) },
    };
    const geometry = new THREE.PlaneGeometry(70, 70).rotateX(-Math.PI / 2);
    SEA_FOG.layers.forEach((y, k) => {
      const material = new THREE.ShaderMaterial({ vertexShader: SEA_VERT, fragmentShader: SEA_FRAG, uniforms: { ...this.uniforms, uLayer: { value: new THREE.Vector2(k * 2, k) } }, depthWrite: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(56, y, -10);
      mesh.renderOrder = 1.5; // wie die Nebelbänke: nach Boden und Bauten, vor den Figuren
      mesh.frustumCulled = false;
      this.group.add(mesh);
    });
    this.group.visible = false;
  }

  /** Dichte, freie Sicht um das Boot (x, z, Radius) und um die Insel (Radius), Farbe. */
  set({ amount, boat = null, clear = 0, isle = 0, color = null }) {
    const u = this.uniforms;
    u.uAmount.value = amount;
    this.group.visible = amount > 0.01;
    if (boat) u.uBoat.value.set(boat.x, boat.z, clear);
    else u.uBoat.value.z = 0;
    u.uIsle.value.z = isle;
    if (color) u.uColor.value.copy(color);
  }
}

// --- Zusammenbau ----------------------------------------------------------------------

/**
 * Die Insel samt Nebel, Figurenplätzen und Einblendungen. `group` ist nur sichtbar, solange
 * Mika dorthin rudert oder dort ist (core/fogIsle.js); der Kahn und die Reuse in der Bucht
 * erscheinen, sobald die drei dort wohnen.
 */
export function createFogIsle({ seed, materials, colliders }) {
  const group = new THREE.Group();
  group.name = 'Nebelinsel';
  const bay = new THREE.Group();
  bay.name = 'Marthes Kahn';
  const add = (parent, model, x, z, { size = FINE32, shadow = 'coarse4', name, material = materials.world } = {}) => {
    const object = createStaticVoxelObject(model, material, { seed, size, shadow });
    object.position.set(x, 0, z);
    object.name = name;
    parent.add(object);
    return object;
  };
  const S = FOG_SPOTS;
  const ground = add(group, buildGround(seed), FOG_ISLE.x, FOG_ISLE.z, { size: FINE, shadow: 'none', name: 'Inselboden' });
  ground.position.y = 0;
  const top = FOG_ISLE.top;
  const onTop = (object) => {
    object.position.y = top;
    return object;
  };
  onTop(add(group, buildAppleTree(seed + 1), S.tree.x, S.tree.z, { size: FINE, shadow: 'rough', name: 'Apfelbaum' }));
  onTop(add(group, buildDriftwoodHut(seed + 2), S.hut.x, S.hut.z, { name: 'Treibholzhütte', material: materials.occluder }));
  onTop(add(group, buildBellFrame(seed + 3), S.bell.x, S.bell.z, { name: 'Glockengestell' }));
  onTop(add(group, buildFirePit(seed + 4), S.fire.x, S.fire.z, { name: 'Feuerstelle' }));
  onTop(add(group, buildLine(), S.line.x, S.line.z, { name: 'Wäscheleine' }));
  for (const c of buildKidsLaundry()) {
    const piece = add(group, c.model, S.line.x + c.x * FINE32, S.line.z, { shadow: 'coarse', name: 'Kinderwäsche', material: materials.laundry || materials.world });
    piece.position.y = top + c.y * FINE32;
  }
  const kahn = onTop(add(group, buildKahn(seed + 5, false), S.kahn.x, S.kahn.z, { name: 'Marthes Kahn (leck)' }));
  // Die Glocke hängt am Balken und schwingt, wenn sie läutet (Drehung nur beim Schwingen)
  const bellGeo = buildShipBell().toGeometry({ size: FINE32, jitter: 0.02, seed });
  const bell = new THREE.Mesh(bellGeo, materials.world);
  bell.castShadow = true;
  bell.receiveShadow = true;
  const bellPivot = new THREE.Group();
  bellPivot.position.set(S.bell.x, top + 49 * FINE32, S.bell.z);
  bellPivot.add(bell);
  group.add(bellPivot);

  // Kollision (auf der Insel): Hütte, Stamm, Pfosten, Feuer, Kahn, Pfähle der Leine, Felsen
  const blockers = [
    colliders.addCircle(S.hut.x - 0.45, S.hut.z, 0.72, 'nebelinsel'),
    colliders.addCircle(S.hut.x + 0.45, S.hut.z, 0.72, 'nebelinsel'),
    colliders.addCircle(S.tree.x, S.tree.z, 0.22, 'nebelinsel'),
    colliders.addCircle(S.bell.x - 0.5, S.bell.z, 0.1, 'nebelinsel'),
    colliders.addCircle(S.bell.x + 0.5, S.bell.z, 0.1, 'nebelinsel'),
    colliders.addCircle(S.fire.x, S.fire.z, 0.42, 'nebelinsel'),
    colliders.addCircle(S.kahn.x - 0.6, S.kahn.z, 0.45, 'nebelinsel'),
    colliders.addCircle(S.kahn.x + 0.6, S.kahn.z, 0.45, 'nebelinsel'),
    colliders.addCircle(S.line.x - 0.78, S.line.z, 0.08, 'nebelinsel'),
    colliders.addCircle(S.line.x + 0.78, S.line.z, 0.08, 'nebelinsel'),
  ];

  // In der Bucht: der geflickte Kahn am Steg, die Reuse im Wasser, ein Korb auf dem Steg
  const bayKahn = add(bay, buildKahn(seed + 6, true), BAY_SPOTS.kahn.x, BAY_SPOTS.kahn.z, { name: 'Marthes Kahn' });
  const trap = add(bay, buildTrap(seed + 7), BAY_SPOTS.trap.x, BAY_SPOTS.trap.z, { name: 'Reuse' });
  trap.position.y = -FINE32; // liegt halb im Wasser
  // N8: Marthes Glocke am Steg (Pfahl auf den Planken, die Glocke am Ausleger)
  const bellPost = add(bay, buildBellPost(seed + 8), BAY_SPOTS.bell.x, BAY_SPOTS.bell.z, { name: 'Glocke am Steg' });
  const bayBell = new THREE.Mesh(bellGeo, materials.world);
  bayBell.castShadow = true;
  bayBell.receiveShadow = true;
  const bayBellPivot = new THREE.Group();
  bayBellPivot.position.set(BAY_SPOTS.bell.x + 12 * FINE32, 53 * FINE32, BAY_SPOTS.bell.z);
  bayBellPivot.add(bayBell);
  bay.add(bayBellPivot);
  const bellBlock = colliders.addCircle(BAY_SPOTS.bell.x, BAY_SPOTS.bell.z, 0.12, 'glocke-steg');
  bay.visible = false;
  // Der Kahn, der am Morgen der Ankunft über den See kommt (derselbe wie am Steg)
  const glideKahn = add(bay, buildKahn(seed + 6, true), 0, 0, { name: 'Marthes Kahn (unterwegs)' });
  glideKahn.visible = false;

  const sea = new SeaFog();
  const island = {
    group,
    bay,
    sea,
    kahn,
    bayKahn,
    trap,
    glideKahn,
    bell,
    bellPivot,
    blockers,
    interactions: [
      { id: 'nebel-glocke', x: S.bell.x, z: S.bell.z + 0.55, radius: 0.9, prompt: 'ansehen', fogLook: 'glocke', flavor: true, enabled: false },
      { id: 'nebel-baum', x: S.tree.x, z: S.tree.z + 0.4, radius: 1.0, prompt: 'ansehen', fogLook: 'baum', flavor: true, enabled: false },
      { id: 'nebel-huette', x: S.hut.x, z: S.hut.z + 0.9, radius: 0.9, prompt: 'ansehen', fogLook: 'huette', flavor: true, enabled: false },
      { id: 'nebel-kahn', x: S.kahn.x - 0.875, z: S.kahn.z - 0.625, radius: 1.0, prompt: 'ansehen', fogLook: 'kahn', flavor: true, enabled: false }, // von der Insel aus (südlich ist Wasser)
    ],
    trapInteraction: { id: 'reuse', x: BAY_SPOTS.trapUse.x, z: BAY_SPOTS.trapUse.z, radius: 0.9, prompt: 'reuseLeeren', fogTrap: true, enabled: false },
    bellInteraction: { id: 'dockglocke', x: BAY_SPOTS.bellUse.x, z: BAY_SPOTS.bellUse.z, radius: 0.8, prompt: 'dockGlocke', fogBell: true, enabled: false },
    bellPost,
    bayBellPivot,
    /** N8: Pfahl und Glocke stehen auf dem Steg – ihre Höhe kommt vom Steg (world.heightAt). */
    placeBayBell(y) {
      bellPost.position.y = y;
      bayBellPivot.position.y = y + 53 * FINE32;
    },
    /** Insel und Kollision an (Mika ist unterwegs oder dort) oder aus. */
    setShown(on) {
      group.visible = on;
      for (const b of blockers) b.enabled = on;
    },
    /** Die drei wohnen in der Bucht: Kahn am Steg, Reuse, die Einblendung zum Leeren. */
    setBay(on) {
      bay.visible = on;
      bayKahn.visible = on;
      trap.visible = on;
      bellPost.visible = on;
      bayBellPivot.visible = on;
      bellBlock.enabled = on;
      island.trapInteraction.enabled = on;
      island.bellInteraction.enabled = on;
    },
  };
  island.setShown(false);
  return island;
}
