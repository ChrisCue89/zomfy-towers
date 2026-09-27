// Knopf, der struppige Hund (Meilenstein 6), im feinen Maß (1/16 m).
// Eigenes kleines Rig: Rumpf, Kopf, Schwanz, vier Beine. Blick nach +z wie
// alle Figuren. Fell mit hellen und grauen Zotteln, rotes Halsband mit einem
// großen Knopf als Anhänger – daher der Name.

import * as THREE from 'three';
import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { createWorldMaterial } from '../render/materials.js';
import { hash3 } from '../core/rng.js';

const U = 1 / 16;

const FUR = [P.e5, P.e6, P.e5, P.s5];
const fur = (x, y, z) => FUR[Math.floor(hash3(x, y, z, 41) * FUR.length)];

function buildBody() {
  const m = new VoxelModel();
  // Rumpf 6 breit, 5 hoch, 9 lang (z −4 … 4), Bauch heller
  m.box(-3, 4, -4, 2, 8, 4, (x, y, z) => (y === 4 ? P.e7 : fur(x, y, z)));
  // Zotteln an den Seiten
  for (const [x, z] of [[-4, -2], [-4, 1], [3, -1], [3, 2]]) m.set(x, 6, z, P.e6);
  return m;
}

function buildHead() {
  const m = new VoxelModel();
  // Kopf 5 breit, 5 hoch, 5 tief; Schnauze vorn, Ohren hängen
  m.box(-2, 0, -2, 2, 4, 2, (x, y, z) => fur(x, y + 10, z));
  m.box(-1, 0, 3, 1, 2, 4, (x, y, z) => (y === 2 ? P.e6 : P.e7)); // Schnauze
  m.set(0, 2, 5, P.n1); // Nase
  m.set(-1, 3, 3, P.n0).set(1, 3, 3, P.n0); // Augen
  m.box(-3, 1, -1, -3, 4, 0, P.e3).box(3, 1, -1, 3, 4, 0, P.e3); // Schlappohren
  // Halsband mit Knopf
  m.box(-2, -1, -2, 2, -1, 2, P.r3);
  m.set(0, -2, 3, P.f6).set(0, -1, 3, P.f6);
  return m;
}

function buildTail() {
  const m = new VoxelModel();
  m.box(0, 0, -3, 0, 1, 0, (x, y, z) => (z === -3 ? P.e7 : P.e5));
  return m;
}

function buildLeg() {
  const m = new VoxelModel();
  m.box(0, 0, 0, 1, 4, 1, (x, y) => (y === 0 ? P.e3 : P.e5));
  return m;
}

/** Die Einzelteile als Voxel-Modelle (für das Porträt). */
export function dogModels() {
  return { body: buildBody(), head: buildHead(), tail: buildTail() };
}

/**
 * Baut Knopf als animierbare Gruppe.
 * @returns {{root: THREE.Group, parts: {body, head, tail, legs: THREE.Group[]}}}
 */
export function buildDog({ seed = 5 } = {}) {
  const material = createWorldMaterial({ selfLight: 0.25 });
  const geo = (model) => model.toGeometry({ jitter: 0.03, seed, size: U });
  const part = (model, joint, offset) => {
    const pivot = new THREE.Group();
    pivot.position.set(joint[0] * U, joint[1] * U, joint[2] * U);
    const mesh = new THREE.Mesh(geo(model), material);
    mesh.position.set((offset[0] - joint[0]) * U, (offset[1] - joint[1]) * U, (offset[2] - joint[2]) * U);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    return pivot;
  };
  const root = new THREE.Group();
  root.name = 'Knopf';
  const body = part(buildBody(), [0, 6, 0], [0, 0, 0]);
  const head = part(buildHead(), [0, 9, 4], [0, 8, 4]);
  const tail = part(buildTail(), [0, 8, -4], [0, 8, -5]);
  const legs = [
    part(buildLeg(), [-2, 4, 3], [-3, 0, 2]),
    part(buildLeg(), [1, 4, 3], [1, 0, 2]),
    part(buildLeg(), [-2, 4, -3], [-3, 0, -4]),
    part(buildLeg(), [1, 4, -3], [1, 0, -4]),
  ];
  // Kopf und Schwanz hängen am Rumpf, damit sie beim Traben mitwippen
  body.add(head, tail);
  head.position.sub(body.position);
  tail.position.sub(body.position);
  root.add(body, ...legs);
  return { root, material, parts: { body, head, tail, legs } };
}

/**
 * Pose: Traben (`moving` 0…1), Schwanzwedeln, Kopf schief legen, Sitzen.
 * @param {ReturnType<typeof buildDog>} dog
 */
export function poseDog(dog, { t, phase, moving = 0, wag = 1, sit = 0, bark = 0 }) {
  const { body, head, tail, legs } = dog.parts;
  const s = Math.sin(phase);
  legs[0].rotation.x = s * 0.7 * moving;
  legs[3].rotation.x = s * 0.7 * moving;
  legs[1].rotation.x = -s * 0.7 * moving;
  legs[2].rotation.x = -s * 0.7 * moving;
  body.position.y = 6 * U + Math.abs(Math.cos(phase)) * 0.02 * moving - sit * 0.08;
  body.rotation.x = -sit * 0.45;
  // Sitzen: Hinterbeine nach vorn geklappt
  legs[2].rotation.x += sit * 1.2;
  legs[3].rotation.x += sit * 1.2;
  tail.rotation.y = Math.sin(t * (6 + wag * 8)) * 0.6 * wag;
  tail.rotation.x = 0.5 - sit * 0.4;
  head.rotation.z = Math.sin(t * 0.7) * 0.12 * (1 - moving);
  head.rotation.x = sit * 0.35 - bark * 0.35;
}
