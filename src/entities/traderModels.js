// Balduins Bollerwagen (Meilenstein 8) im feinen Maß (1/16 m). Der Wagen
// fährt, deshalb mit allen Flächen gebaut (nicht nur den sichtbaren) – er
// dreht sich zum Abfahren um. Räder und Deichsel sind eigene Teile, die sich
// bewegen; die Fransen am Sonnendach wehen im Wind (Vertex-Shader).
//
// Lesbar schon von Weitem: lila-gelb gestreiftes Sonnendach auf vier Stangen,
// darunter Kiste, Fass, Sack und Einmachgläser mit trüber grüner Brühe
// (in einem schwimmt ein Auge – was er mit den Zombieteilen macht, sagt er nicht).

import * as THREE from 'three';
import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';

const U = 1 / 16;

/** Wagenmaße in Voxeln (Ursprung: Mitte des Wagens am Boden). */
export const CART = {
  halfLength: 10, // Kasten x -10..10
  halfWidth: 5, // Kasten z -5..5
  wheelX: 7, // Achsen bei x = ±7
  wheelZ: 7, // Räder bei z = ±7
  wheelY: 4, // Radmitte
  wheelRadius: 4.5,
  handleY: 6, // Gelenk der Deichsel am Kastenende
};

const stripe = (x) => (Math.floor((x + 12) / 3) % 2 ? P.f6 : P.d3);
const ROOF = 32; // Höhe des Sonnendachs (2 m)

function bodyModel() {
  const m = new VoxelModel();
  const L = CART.halfLength;
  const W = CART.halfWidth;
  // Unterbau: Längsbalken und Achsen
  m.box(-L + 1, 5, -W + 1, L - 1, 5, -W + 1, P.e2).box(-L + 1, 5, W - 1, L - 1, 5, W - 1, P.e2);
  for (const x of [-CART.wheelX, CART.wheelX]) m.box(x, CART.wheelY, -CART.wheelZ + 1, x, CART.wheelY, CART.wheelZ - 1, P.s2);
  // Boden und Bordwände aus Brettern, dunkle Pfosten, Eisenbeschläge an den Ecken
  m.box(-L, 6, -W, L, 7, W, (x, y) => (y === 6 ? P.e2 : P.e3));
  m.box(-L, 8, -W, L, 10, W, (x, y, z) => {
    const edge = x === -L || x === L || z === -W || z === W;
    if (!edge) return null;
    const corner = (x === -L || x === L) && (z === -W || z === W);
    if (corner) return y === 10 ? P.s3 : P.e2;
    if (z === W && y === 10) return null; // vorn niedriger: die Ladung soll man sehen
    if (x === 0 || x === -5 || x === 5) return P.e3;
    if (y === 10) return P.e4;
    return (y + (z === W || z === -W ? x : z)) % 4 === 0 ? P.e4 : P.e5;
  });
  // Ladung: Kiste (links hinten)
  m.box(-9, 8, -4, -4, 12, 0, (x, y, z) => (x === -9 || x === -4 || y === 12 || z === 0 || z === -4 ? P.e4 : P.e6));
  m.box(-8, 13, -3, -6, 13, -1, (x, y, z) => ((x + z) % 2 ? P.s5 : null)); // Schraubenkram obenauf
  // Fass (rechts hinten) mit Eisenreifen
  m.box(5, 8, -4, 9, 14, 0, (x, y, z) => {
    if ((x === 5 || x === 9) && (z === -4 || z === 0)) return null; // runde Kanten
    if (y === 9 || y === 13) return P.s3;
    return y === 14 ? P.e4 : x % 2 ? P.e5 : P.e4;
  });
  // Sack (rechts vorn) mit Schnur
  m.box(6, 8, 1, 9, 10, 4, (x, y, z) => ((x === 6 || x === 9) && (z === 1 || z === 4) && y === 10 ? null : (x + y + z) % 3 ? P.e7 : P.e6));
  m.set(7, 11, 2, P.e5).set(8, 11, 3, P.e5);
  // Einmachgläser mit trüber grüner Brühe auf einem Brett – in einem schwimmt ein Auge
  m.box(-4, 8, 1, 5, 9, 3, (x, y) => (y === 9 ? P.e5 : P.e3));
  for (const [x0, h] of [[-3, 4], [0, 3], [3, 4]]) {
    m.box(x0, 10, 1, x0 + 1, 9 + h, 2, (x, y) => (y === 9 + h ? P.b5 : (x + y) % 3 ? P.g5 : P.g6));
    m.box(x0, 10 + h, 1, x0 + 1, 10 + h, 2, P.s3); // Deckel
  }
  m.set(0, 11, 2, P.s9).set(1, 11, 2, P.n1); // das Auge
  // Glöckchen an der vorderen linken Stange
  m.set(-L - 1, ROOF - 5, W, P.e3).set(-L - 1, ROOF - 6, W, P.f5).set(-L - 1, ROOF - 7, W, P.f4);
  // Vier Stangen und das gestreifte Sonnendach – höher als Balduins Hut
  for (const x of [-L, L]) for (const z of [-W, W]) m.box(x, 11, z, x, ROOF - 1, z, P.e3);
  // Dach in zwei Lagen: von oben zeigt die Stufe am Rand die Form
  m.box(-12, ROOF, -7, 12, ROOF, 7, (x) => stripe(x));
  m.box(-11, ROOF + 1, -5, 11, ROOF + 1, 5, (x) => stripe(x));
  return m;
}

/** Fransen an der Vorderkante (Ursprung oben: sie hängen nach unten und wehen). */
function fringeModel() {
  const m = new VoxelModel();
  for (let x = -12; x <= 12; x++) {
    const c = stripe(x);
    m.set(x, -1, 0, c);
    if ((x + 12) % 3 !== 2) m.set(x, -2, 0, c);
    if ((x + 12) % 3 === 1) m.set(x, -3, 0, c);
  }
  return m;
}

/** Speichenrad in der x-y-Ebene, Mitte im Ursprung; die Nabe zeigt nach `out` (±1). */
function wheelModel(out) {
  const m = new VoxelModel();
  const R = CART.wheelRadius;
  for (let y = -5; y <= 5; y++) {
    for (let x = -5; x <= 5; x++) {
      const r = Math.hypot(x, y);
      if (r > R) continue;
      if (r > R - 1.2) m.set(x, y, 0, (x + y) % 2 ? P.s2 : P.s3); // Eisenreifen
      else if (r <= 1) m.set(x, y, 0, P.s4).set(x, y, out, P.s3); // Nabe
      else if (x === 0 || y === 0 || Math.abs(x) === Math.abs(y)) m.set(x, y, 0, P.e4); // Speichen
    }
  }
  return m;
}

/** Deichsel: zeigt nach -x, Gelenk im Ursprung, Griff als Querholz. */
function handleModel() {
  const m = new VoxelModel();
  m.box(-11, 0, 0, -1, 0, 0, P.e4);
  m.box(-3, 0, -2, -1, 0, -2, P.e3).box(-3, 0, 2, -1, 0, 2, P.e3); // Gabel am Kasten
  m.set(-4, 0, -1, P.e3).set(-4, 0, 1, P.e3);
  m.box(-12, 0, -3, -12, 0, 3, P.e2); // Griff
  return m;
}

/**
 * Bollerwagen als bewegliche Gruppe.
 * @param {{world: THREE.Material, fringe: THREE.Material}} materials
 * @returns {{root: THREE.Group, turn: THREE.Group, wheels: THREE.Group[], handle: THREE.Group}}
 */
export function buildCart(materials) {
  const geo = (model, seed) => model.toGeometry({ jitter: 0.04, seed, size: U });
  const mesh = (model, material, seed) => {
    const m = new THREE.Mesh(geo(model, seed), material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  // Voxel (x, y, z) liegt bei [x·U, (x+1)·U] – Mitte um ein halbes Voxel verschieben
  const centered = (object) => {
    object.position.set(-U / 2, 0, -U / 2);
    return object;
  };
  const root = new THREE.Group();
  root.name = 'Bollerwagen';
  const turn = new THREE.Group(); // dreht den Wagen zum Abfahren um (Deichsel voran)
  root.add(turn);
  turn.add(centered(mesh(bodyModel(), materials.world, 41)));
  const fringe = mesh(fringeModel(), materials.fringe, 43);
  fringe.castShadow = false;
  fringe.position.set(-U / 2, ROOF * U, 7.5 * U);
  turn.add(fringe);
  const wheels = [];
  const models = { [-1]: wheelModel(-1), [1]: wheelModel(1) };
  for (const x of [-CART.wheelX, CART.wheelX]) {
    for (const z of [-CART.wheelZ, CART.wheelZ]) {
      const pivot = new THREE.Group();
      pivot.position.set(x * U, (CART.wheelY + 0.5) * U, z * U);
      const m = mesh(models[Math.sign(z)], materials.world, 47); // Nabe zeigt nach außen
      m.position.set(-U / 2, -U / 2, -U / 2);
      pivot.add(m);
      turn.add(pivot);
      wheels.push(pivot);
    }
  }
  const handle = new THREE.Group();
  handle.position.set((-CART.halfLength - 0.5) * U, (CART.handleY + 0.5) * U, 0);
  const h = mesh(handleModel(), materials.world, 53);
  h.position.set(0, -U / 2, -U / 2);
  handle.add(h);
  turn.add(handle);
  return { root, turn, wheels, handle };
}
