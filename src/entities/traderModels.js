// Balduins Boot (Meilenstein 9), seit M13g doppelt fein (1/32 m).
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

/** Voxelgröße des Boots (M13g: 1/32 m). */
export const BOAT_UNIT = 1 / 32;
const U = BOAT_UNIT;
const ROPE_UNIT = 1 / 16; // die Leine bleibt kräftig genug, um sie zu sehen

/** Lila-gelbe Streifen (Balduins Farben, am Wimpel). */
const stripe = (x) => (Math.floor((x + 24) / 6) % 2 ? P.f6 : P.d3);

/** Bootsmaße in Voxeln (1/32 m). */
export const BOAT = {
  halfLength: 60, // Rumpf x -60..59
  halfWidth: 22, // z -22..22
  deck: 15, // Oberkante Deck (Balduin steht darauf)
};

function boatModel() {
  const m = new VoxelModel();
  const L = BOAT.halfLength;
  const W = BOAT.halfWidth;
  const D = BOAT.deck;
  // Rumpf: am Heck (+x) breit, zum Bug (−x) spitz; Planken mit Fugen, weißer
  // Streifen, rotes Unterwasserschiff an der Wasserlinie, Nieten
  for (let x = -L; x < L; x++) {
    const t = (x + L) / (2 * L); // 0 am Bug, 1 am Heck
    const half = t > 0.35 ? W : W * Math.sqrt(Math.max(0, t / 0.35)) + 2;
    for (let z = -W; z <= W; z++) {
      const d = Math.abs(z) / half;
      if (d > 1) continue;
      const shell = d > 0.9 || x === -L || x === L - 1 || x === L - 2 || (d > 0.75 && half < 6);
      for (let y = 0; y <= D; y++) {
        if (y === D) {
          // Reling oben am Rand, sonst Deck aus Planken
          if (shell) {
            m.set(x, y, z, P.e5).set(x, y + 1, z, P.e4);
            if ((x + L) % 10 === 0) m.set(x, y + 2, z, P.e4).set(x, y + 3, z, P.e5); // Stützen
          } else m.set(x, y, z, (x + 2 * L) % 8 === 0 ? P.e4 : (z + x) % 11 === 0 ? P.e7 : P.e6);
          continue;
        }
        if (!shell) continue;
        let c = (y >> 2) % 2 ? P.b2 : P.b1; // Planken
        if (y % 4 === 0) c = P.b0;
        if (y <= 3) c = y === 3 ? P.r3 : P.r2; // Unterwasserschiff
        if (y === 8 || y === 9) c = P.s8; // weißer Streifen
        if (y === 11 && (x + L) % 6 === 3) c = P.s6; // Nieten
        m.set(x, y, z, c);
      }
    }
  }
  // Rettungsring an der Seite (zur Kamera hin), rot-weiß mit Leine
  for (let a = -6; a <= 6; a++) {
    for (let b = -6; b <= 6; b++) {
      const r = Math.hypot(a + 0.5, b + 0.5);
      if (r > 5.2 || r < 2.6) continue;
      const seg = Math.floor(((Math.atan2(b + 0.5, a + 0.5) + Math.PI) / (Math.PI * 2)) * 8);
      m.set(24 + a, 9 + b, W + 1, seg % 2 ? P.s9 : P.f3).set(24 + a, 9 + b, W + 2, r > 4.4 ? (seg % 2 ? P.s8 : P.f2) : null);
    }
  }
  // Steuerhaus hinten: Bretter, Fenster mit weißem Rahmen und Spiegelung, Tür
  const d = D + 1;
  m.box(28, d, -14, 51, d + 27, 15, (x, y, z) => {
    const wall = x === 28 || x === 51 || z === -14 || z === 15;
    if (!wall) return null;
    const winS = z === 15 && x >= 33 && x <= 45 && y >= d + 12 && y <= d + 19;
    const winW = x === 28 && Math.abs(z + 0.5) < 8 && y >= d + 12 && y <= d + 19;
    if (winS || winW) {
      const edge = y === d + 12 || y === d + 19 || (winS && (x === 33 || x === 45 || x === 39)) || (winW && (z === -7 || z === 7));
      if (edge) return P.s8;
      return (x + y + z) % 7 === 0 ? P.n4 : P.n3;
    }
    if (z === 15 && x >= 47 && x <= 50 && y <= d + 18) return y === d + 9 && x === 48 ? P.f6 : P.e5; // Tür mit Knauf
    return (y - d) % 5 === 0 ? P.e5 : (x + y) % 9 === 0 ? P.e6 : P.e7;
  });
  m.box(26, d + 28, -16, 53, d + 29, 17, (x, y) => (y === d + 29 ? (x % 4 === 0 ? P.r2 : P.r3) : P.r1)); // Dach
  m.box(28, d + 30, -12, 51, d + 30, 13, P.r3);
  // Mast mit Wimpel
  m.box(44, d + 31, 0, 45, d + 53, 1, (x) => (x === 44 ? P.e4 : P.e3));
  for (let k = 0; k < 12; k++) for (let y = 0; y < 6 - Math.floor(k / 2); y++) m.set(43 - k, d + 49 - y, 0, stripe(k * 3 + (y >> 1)));
  // Ladung vorn: Kisten, Fass, Einmachgläser auf einem Brett
  m.box(-24, d, -16, -9, d + 11, -3, (x, y, z) => (x <= -23 || x >= -10 || y >= d + 10 || z <= -15 || z >= -4 ? P.e4 : y % 4 === 0 ? P.e5 : P.e6));
  m.box(-20, d + 12, -14, -13, d + 17, -7, (x, y, z) => (x === -20 || x === -13 || y === d + 17 || z === -14 ? P.e4 : P.e7));
  m.cylinder(8.5, -11.5, d, d + 13, 4.8, (x, y) => (y === d + 2 || y === d + 3 || y === d + 10 || y === d + 11 ? P.s3 : y === d + 13 ? P.e4 : x < 7 ? P.e6 : x % 3 ? P.e5 : P.e4));
  m.box(-8, d, 4, 17, d + 1, 11, (x, y) => (y === d + 1 ? P.e4 : P.e3));
  for (const [x0, h] of [[-6, 8], [0, 6], [6, 8], [12, 6]]) {
    m.box(x0, d + 2, 6, x0 + 3, d + 1 + h, 9, (x, y, z) => {
      if (x === x0 && z === 9 && y > d + 3) return P.b5; // Glanz auf dem Glas
      if (y === d + 1 + h) return P.b5;
      return (x + y + z) % 5 === 0 ? P.g6 : P.g5; // trübe Brühe mit Bläschen
    });
    m.box(x0, d + 2 + h, 6, x0 + 3, d + 3 + h, 9, (x, y) => (y === d + 3 + h ? P.s4 : P.s3)); // Deckel
  }
  m.box(1, d + 4, 9, 2, d + 5, 9, P.s9).set(2, d + 4, 10, P.b3).set(1, d + 5, 10, P.n1); // das Auge
  // Laterne am Bug
  m.box(-54, d, 0, -53, d + 11, 1, P.e3);
  m.box(-56, d + 12, -2, -51, d + 15, 3, (x, y, z) => (y === d + 15 ? P.s3 : (x === -56 || x === -51) && (z === -2 || z === 3) ? P.s2 : P.f6));
  // Klampe an der Stegseite (Norden): hier hängt die Leine (M10)
  m.box(CLEAT.x - 2, d, CLEAT.z, CLEAT.x + 3, d + 1, CLEAT.z + 1, P.s3).box(CLEAT.x, d + 2, CLEAT.z, CLEAT.x + 1, d + 3, CLEAT.z + 1, P.s4);
  return m;
}

/** Klampe am Bug in Voxeln (1/32 m; Bug zeigt nach −x, der Steg liegt nördlich, also −z). */
export const CLEAT = { x: -48, z: -16 };

/**
 * G6: Ab Tag 20 liegt vorn im Boot etwas Großes unter einer Plane (über den Kisten): olivgrünes
 * Segeltuch mit Falten, zwei Leinen darüber, an einer Stelle drückt etwas Spitzes von innen
 * dagegen. Was darunter ist? »Frag nicht.« – die Plane geht nie auf.
 */
function tarpModel() {
  const m = new VoxelModel();
  const d = BOAT.deck + 1;
  const cx = -17;
  const cz = -8;
  // Groß genug für die Kisten darunter; nie in das Brett mit den Gläsern oder ins Fass
  m.ellipsoid(cx, d, cz, 22, 21, 14, (x, y, z) => {
    if (y < d || x > 2 || (x >= -8 && z >= 4)) return null;
    if (x === -28 || x === -6) return (y + z) % 2 ? P.e3 : P.e2; // Leinen quer darüber
    const fold = Math.floor((x - cx) / 3 + (z - cz) / 5) % 2 === 0;
    return y > d + 14 ? (fold ? P.g5 : P.g4) : fold ? P.g4 : P.g3;
  });
  // Etwas Spitzes drückt von innen gegen die Plane (ein Horn? ein Rohr? – frag nicht)
  m.ellipsoid(-12, d + 19, -9, 3, 6, 3, (x, y) => (y > d + 22 ? P.g5 : P.g4));
  return m;
}

/**
 * Balduins Leine (M10): kleine Würfel entlang einer Kurve – beim Anlegen
 * geworfen, dann festgemacht (hängt durch), beim Ablegen gelöst.
 * @param {THREE.Material} material
 */
export function buildRope(material, count = 20) {
  const cube = new VoxelModel().set(0, 0, 0, P.e7);
  const mesh = new THREE.InstancedMesh(cube.toGeometry({ jitter: 0, ao: false, size: ROPE_UNIT }), material, count);
  mesh.name = 'Leine';
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  return {
    mesh,
    /**
     * Von a nach b; `sag` > 0 hängt in der Mitte so weit durch, < 0 wölbt sich
     * nach oben (Wurf). Zu sehen ist das Stück bis `progress` (0…1).
     */
    set(a, b, sag, progress = 1) {
      const n = Math.max(0, Math.min(count, Math.round(count * progress)));
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2 - sag * 2;
      const cz = (a.z + b.z) / 2;
      for (let k = 0; k < n; k++) {
        const s = k / (count - 1);
        const w0 = (1 - s) * (1 - s);
        const w1 = 2 * (1 - s) * s;
        const w2 = s * s;
        dummy.position.set(w0 * a.x + w1 * cx + w2 * b.x - ROPE_UNIT / 2, w0 * a.y + w1 * cy + w2 * b.y - ROPE_UNIT / 2, w0 * a.z + w1 * cz + w2 * b.z - ROPE_UNIT / 2);
        dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    },
    hide() {
      mesh.count = 0;
    },
  };
}

/**
 * Balduins Boot als bewegliche Gruppe (schaukelt auf und ab, dreht sich in
 * die Fahrtrichtung).
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
  // G6: die Plane (erst ab Tag 20 sichtbar, trader.js)
  const tarp = new THREE.Mesh(tarpModel().toGeometry({ jitter: 0.04, seed: 67, size: U }), materials.world);
  tarp.castShadow = true;
  tarp.receiveShadow = true;
  tarp.position.copy(mesh.position);
  tarp.visible = false;
  tarp.name = 'Balduins Plane';
  root.add(tarp);
  return { root, tarp };
}

// --- N5: Mikas Ruderboot ----------------------------------------------------------
// Mit dem kam Mika im Morgennebel an (die Ankunft, core/arrival.js); danach liegt es
// nördlich am Steg. Klein und geflickt: helle Planken mit dunklen Fugen, eine
// Ruderbank, zwei Riemen in Dollen, vorn ein verschnürtes Bündel und eine Konservendose
// als Schöpfer. Bug nach −x wie bei Balduins Boot, Ursprung Mitte auf der Wasserlinie.

/** Maße in Voxeln (1/32 m): 2,4 m lang, knapp 1 m breit. */
export const ROWBOAT = { halfLength: 38, halfWidth: 15, seat: 9, oarAt: 1 };

function rowboatModel() {
  const m = new VoxelModel();
  const L = ROWBOAT.halfLength;
  const W = ROWBOAT.halfWidth;
  for (let x = -L; x <= L; x++) {
    const u = x / L; // −1 Bug, +1 Heck
    const half = u < 0 ? W * Math.sqrt(Math.max(0, 1 - u * u)) : W * Math.sqrt(Math.max(0, 1 - u ** 4));
    const w = Math.round(half);
    if (w < 1) continue;
    const sheer = Math.round(11 + (u < 0 ? -u * 4 : u)); // der Bug hebt sich
    for (let z = -w; z <= w; z++) {
      const rim = Math.abs(z) >= w - 1 || Math.abs(x) >= L - 1;
      const floor = 1 + Math.round((Math.abs(z) / w) ** 2 * 3); // gewölbter Boden
      if (rim) {
        for (let y = 0; y <= sheer; y++) {
          const c = y === sheer ? P.e7 : y === sheer - 1 ? P.e3 : (y + 30) % 3 === 0 ? P.e4 : (x + y) % 9 === 0 ? P.e5 : P.e6;
          m.set(x, y, z, y <= 1 ? P.b1 : c); // unten dunkel wie nasses Holz
        }
      } else {
        m.set(x, floor, z, (x + 40) % 5 === 0 ? P.e4 : P.e5); // Bodenbretter
        for (let y = 0; y < floor; y++) m.set(x, y, z, P.e3);
      }
    }
  }
  // Ruderbank und Heckbank
  m.box(-3, ROWBOAT.seat, -W + 2, 3, ROWBOAT.seat, W - 2, P.e7).box(-3, ROWBOAT.seat - 1, -W + 2, 3, ROWBOAT.seat - 1, W - 2, P.e4);
  m.box(L - 12, 8, -W + 4, L - 3, 8, W - 4, P.e7);
  // Dollen an der Bordwand
  for (const s of [-1, 1]) m.box(-1, 12, s * (W - 1), 1, 13, s * (W - 1), P.s4);
  // Vorn ein verschnürtes Bündel (Decke und Beutel) und die Dose zum Schöpfen
  m.ellipsoid(-L + 12, 6, 0, 5, 3.5, 6, (x, y, z) => (z % 4 === 0 ? P.r1 : y > 7 ? P.r3 : P.r2));
  m.box(-L + 9, 9, -1, -L + 15, 9, 0, P.e2);
  m.box(L - 8, 9, 5, L - 6, 11, 7, (x, y) => (y === 11 ? P.s7 : P.s5));
  return m;
}

/** Ein Riemen: Griff am Ursprung, der Schaft nach außen (+z), am Ende das Blatt. */
function oarModel() {
  const m = new VoxelModel();
  m.box(0, 0, 0, 1, 1, 3, P.e2); // Griff
  m.box(0, 0, 4, 0, 0, 34, P.e6); // Schaft
  m.box(-2, 0, 35, 2, 0, 46, (x, y, z) => (z === 46 || Math.abs(x) === 2 ? P.e4 : P.e5)); // Blatt
  return m;
}

/**
 * Mikas Ruderboot mit zwei beweglichen Riemen.
 * @returns {{root: THREE.Group, oars: THREE.Object3D[]}}
 */
export function buildRowboat(materials) {
  const root = new THREE.Group();
  root.name = 'Mikas Ruderboot';
  const mesh = new THREE.Mesh(rowboatModel().toGeometry({ jitter: 0.04, seed: 67, size: U }), materials.world);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(-U / 2, 0, -U / 2);
  root.add(mesh);
  const geo = oarModel().toGeometry({ jitter: 0.02, seed: 68, size: U });
  const oars = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(ROWBOAT.oarAt * U, 13 * U, s * (ROWBOAT.halfWidth - 1) * U);
    const oar = new THREE.Mesh(geo, materials.world);
    oar.castShadow = true;
    oar.position.set(0, 0, -s * 8 * U); // der Griff ragt ein Stück nach innen
    if (s < 0) oar.rotation.y = Math.PI; // links nach außen gespiegelt
    pivot.add(oar);
    root.add(pivot);
    return pivot;
  });
  return { root, oars };
}
