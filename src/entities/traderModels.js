// Balduins Boot (Meilenstein 9, einfache Fassung) im feinen Maß (1/16 m).
// Seit M9 kommt Balduin nur noch übers Wasser – der Bollerwagen aus M8 ist
// fort. Ein kleines Fischerboot: dunkelblauer Rumpf mit weißem Streifen,
// Holzreling, hinten ein Steuerhaus mit rotem Dach und einem lila-gelben
// Wimpel, vorn Kisten, ein Fass und die Einmachgläser mit trüber grüner Brühe
// (in einem schwimmt ein Auge – was er mit den Zombieteilen macht, sagt er
// nicht). Bug zeigt nach −x (es kommt von Osten und legt längs am Steg an).
// Ursprung: Mitte des Boots auf der Wasserlinie.

import * as THREE from 'three';
import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';

const U = 1 / 16;

/** Lila-gelbe Streifen (Balduins Farben, am Wimpel). */
const stripe = (x) => (Math.floor((x + 12) / 3) % 2 ? P.f6 : P.d3);

/** Bootsmaße in Voxeln (1/16 m). */
export const BOAT = {
  halfLength: 30, // Rumpf x -30..29
  halfWidth: 11, // z -11..11
  deck: 7, // Oberkante Deck (Balduin steht darauf)
};

function boatModel() {
  const m = new VoxelModel();
  const L = BOAT.halfLength;
  const W = BOAT.halfWidth;
  // Rumpf: am Heck (+x) breit, zum Bug (−x) spitz
  for (let x = -L; x < L; x++) {
    const t = (x + L) / (2 * L); // 0 am Bug, 1 am Heck
    const half = t > 0.35 ? W : W * Math.sqrt(Math.max(0, t / 0.35)) + 1;
    for (let z = -W; z <= W; z++) {
      const d = Math.abs(z) / half;
      if (d > 1) continue;
      const shell = d > 0.82 || x === -L || x === L - 1 || (d > 0.7 && half < 4);
      for (let y = 0; y <= BOAT.deck; y++) {
        if (y === BOAT.deck) {
          // Reling oben am Rand, sonst Deck
          m.set(x, y, z, shell ? P.e5 : (x + 60) % 4 === 0 ? P.e4 : P.e6);
          if (shell) m.set(x, y + 1, z, P.e4);
          continue;
        }
        if (!shell) continue;
        m.set(x, y, z, y === 1 ? P.r2 : y === 4 ? P.s8 : (x + z) % 5 === 0 ? P.b1 : P.b2);
      }
    }
  }
  // Name am Heck? Lieber ein Rettungsring an der Seite (zur Kamera hin)
  for (let a = 0; a < 12; a++) {
    const t = (a / 12) * Math.PI * 2;
    m.set(12 + Math.round(Math.cos(t) * 2.2), 4 + Math.round(Math.sin(t) * 2.2), W + 1, a % 3 === 0 ? P.s9 : P.f3);
  }
  // Steuerhaus hinten
  const d = BOAT.deck + 1;
  m.box(14, d, -7, 25, d + 13, 7, (x, y, z) => {
    const wall = x === 14 || x === 25 || z === -7 || z === 7;
    if (!wall) return null;
    const window = y >= d + 6 && y <= d + 9 && ((z === 7 && x > 16 && x < 23) || (x === 14 && Math.abs(z) < 4));
    if (window) return y === d + 9 ? P.n4 : P.n3;
    return (x + y) % 6 === 0 ? P.e6 : P.e7;
  });
  m.box(13, d + 14, -8, 26, d + 14, 8, (x) => (x % 2 ? P.r2 : P.r3)); // Dach
  m.box(14, d + 15, -6, 25, d + 15, 6, P.r3);
  // Mast mit Wimpel
  m.box(22, d + 16, 0, 22, d + 26, 0, P.e3);
  for (let k = 0; k < 6; k++) for (let y = 0; y < 3 - Math.floor(k / 3); y++) m.set(21 - k, d + 24 - y, 0, stripe(k * 3));
  // Ladung vorn: Kisten, Fass, Einmachgläser auf einem Brett
  m.box(-12, d, -8, -5, d + 5, -2, (x, y, z) => (x === -12 || x === -5 || y === d + 5 || z === -8 || z === -2 ? P.e4 : P.e6));
  m.box(-10, d + 6, -7, -7, d + 8, -4, (x, y, z) => (x === -10 || x === -7 || y === d + 8 ? P.e4 : P.e7));
  m.box(2, d, -8, 6, d + 6, -4, (x, y, z) => {
    if ((x === 2 || x === 6) && (z === -8 || z === -4)) return null;
    if (y === d + 1 || y === d + 5) return P.s3;
    return y === d + 6 ? P.e4 : x % 2 ? P.e5 : P.e4;
  });
  m.box(-4, d, 2, 8, d, 5, P.e3);
  for (const [x0, h] of [[-3, 4], [0, 3], [3, 4], [6, 3]]) {
    m.box(x0, d + 1, 3, x0 + 1, d + h, 4, (x, y) => (y === d + h ? P.b5 : (x + y) % 3 ? P.g5 : P.g6));
    m.box(x0, d + h + 1, 3, x0 + 1, d + h + 1, 4, P.s3);
  }
  m.set(0, d + 2, 4, P.s9).set(1, d + 2, 4, P.n1); // das Auge
  // Laterne am Bug
  m.box(-L + 3, d + 1, 0, -L + 3, d + 5, 0, P.e3);
  m.box(-L + 2, d + 6, -1, -L + 4, d + 7, 1, P.f6);
  return m;
}

/**
 * Balduins Boot als bewegliche Gruppe (schaukelt nur auf und ab, dreht nicht).
 * @param {{world: THREE.Material}} materials
 * @returns {{root: THREE.Group}}
 */
export function buildBoat(materials) {
  const root = new THREE.Group();
  root.name = 'Balduins Boot';
  const mesh = new THREE.Mesh(boatModel().toGeometry({ jitter: 0.04, seed: 61, size: U }), materials.world);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(-U / 2, 0, -U / 2);
  root.add(mesh);
  return { root };
}
