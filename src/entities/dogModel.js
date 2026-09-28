// Knopf, der struppige Hund (Meilenstein 6), im feinen Maß (1/16 m; in der
// Welt seit M13g doppelt fein, 1/32 m – das Porträt nimmt die 1/16-Teile).
// Eigenes kleines Rig: Rumpf, Kopf, Schwanz, vier Beine. Blick nach +z wie
// alle Figuren. Fell mit hellen und grauen Zotteln, rotes Halsband mit einem
// großen Knopf als Anhänger – daher der Name.

import * as THREE from 'three';
import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { createWorldMaterial } from '../render/materials.js';
import { hash3 } from '../core/rng.js';
import { sculpt, capsule, blob, smoothUnion, roundTone } from '../world/voxelKit.js';
import { frontMap } from './figureKit.js';

const U = 1 / 32;

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

// --- Geformt (N1, 1/32 m): runder Rumpf mit Brust, Kopf mit Schnauze und --
// Schlappohren, gebogener Schwanz, Beine mit Pfoten, Zotteln als Büschel.
// Alle Teile in absoluten Koordinaten der Figur (Beine um ihre Mitte).

// Fell in Büscheln (2er-Zellen), dazwischen einzelne graue Haare
const FUR32 = [P.e5, P.e6, P.e5, P.e6, P.e4];
const fur32 = (x, y, z) => (hash3(x, y, z, 47) < 0.07 ? P.s5 : FUR32[Math.floor(hash3(x >> 1, y >> 1, z >> 1, 41) * FUR32.length)]);
/** Fell mit Rundung: Kuppen heller, graue Haare bleiben grau. */
const furTone = (x, y, z, n) => {
  const c = fur32(x, y, z);
  return c === P.s5 ? c : roundTone(c, n, { light: 1, dark: 0 });
};

/** Zottel: kurzer, nach unten spitz zulaufender Büschel von a nach b. */
function tuft(m, ax, ay, az, bx, by, bz, ra, color, tip = color) {
  const f = capsule(ax, ay, az, bx, by, bz, ra, ra * 0.45);
  const lo = Math.min(ay, by) - ra;
  sculpt(m, f, Math.floor(Math.min(ax, bx) - ra), Math.floor(lo), Math.floor(Math.min(az, bz) - ra), Math.ceil(Math.max(ax, bx) + ra), Math.ceil(Math.max(ay, by) + ra), Math.ceil(Math.max(az, bz) + ra), (x, y) => (y <= lo + 1 ? tip : color));
  return m;
}

const BODY = smoothUnion(capsule(0, 13, -5, 0, 13.6, 4.6, 5, 5.5), blob(0, 12.6, 5.4, 5.7, 5.3, 4.6), 3);

function buildBody32() {
  const m = new VoxelModel();
  sculpt(m, BODY, -7, 6, -11, 6, 20, 11, (x, y, z, n) => {
    if (n.y < -0.45) return (x + z) % 3 === 0 ? P.e6 : P.e7; // Bauch heller
    if (n.z > 0.55 && y <= 15 && Math.abs(x + 0.5) <= 3) return (x + y) % 4 === 0 ? P.e8 : P.e7; // Brustlatz
    if (n.y > 0.55 && Math.abs(x + 0.5) <= 3.5 && z >= -6 && z <= 4) return hash3(x >> 1, 0, z >> 1, 43) < 0.5 ? P.e4 : P.e5; // dunkler Sattel
    return furTone(x, y, z, n);
  });
  // Zotteln hängen an den Seiten und an der Brust
  for (const z of [-7, -3, 1, 5]) {
    for (const side of [-1, 1]) tuft(m, side * 4.9, 10.2, z + (side > 0 ? 1 : 0), side * 5.3, 7.4, z + 0.6, 1.2, P.e6, P.e7);
  }
  for (const x of [-1.6, 1.6]) tuft(m, x, 10.4, 9.2, x * 1.1, 7.6, 9.6, 1.3, P.e7, P.e8);
  tuft(m, 0, 10, -9.2, 0, 8, -9.8, 1.2, P.e6, P.e7);
  return m;
}

// Kopf: Schädel, Schnauze und Hals, weich verschmolzen
const SKULL = blob(0, 22.2, 9.6, 4.9, 4.5, 4.6);
const MUZZLE = capsule(0, 20, 12.2, 0, 19.7, 15.6, 2.8, 2.4);
const NECK = capsule(0, 16.5, 6.4, 0, 20.5, 9.2, 3.7, 3.4);
const HEAD_SHAPE = smoothUnion(smoothUnion(SKULL, MUZZLE, 1.6), NECK, 2);
const DOG_FACE = frontMap(HEAD_SHAPE, -6, 5, 16, 28, 19, 2);
const eyeAt = (x) => x === -3 || x === -2 || x === 1 || x === 2;

function buildHead32() {
  const m = new VoxelModel();
  sculpt(m, HEAD_SHAPE, -6, 12, 2, 5, 28, 19, (x, y, z, n) => {
    const front = z === DOG_FACE.front(x, y);
    if (front && (y === 23 || y === 24) && eyeAt(x)) return y === 24 && (x === -3 || x === 1) ? P.s9 : P.n0; // Augen mit Glanz
    if (front && y === 25 && eyeAt(x)) return P.e7; // helle Brauen
    if (MUZZLE(x + 0.5, y + 0.5, z + 0.5) < 0.6 && z >= 12) {
      if (front && y === 18 && Math.abs(x + 0.5) <= 2) return P.e4; // Maul
      return n.y > 0.5 ? P.e6 : P.e7; // Schnauze heller
    }
    return furTone(x, y + 20, z, n);
  });
  // Nase mit Glanz
  sculpt(m, blob(0, 21.1, 17.9, 1.6, 1.1, 1), -2, 19, 16, 1, 22, 19, (x, y) => (y === 21 && x === -1 ? P.s5 : P.n1));
  // Schlappohren: oben umgeknickt, hängen seitlich bis unters Kinn
  for (const side of [-1, 1]) {
    const ear = smoothUnion(blob(side * 4.6, 25, 9.2, 1.6, 1.5, 2.3), blob(side * 5.4, 21.4, 8.9, 1.25, 3.7, 2.2), 1.2);
    sculpt(m, ear, side < 0 ? -8 : 3, 16, 5, side < 0 ? -3 : 7, 27, 12, (x, y, z, n) => (n.y > 0.6 ? P.e4 : y <= 18 ? P.e2 : P.e3));
  }
  // Strubbel auf dem Kopf und an den Backen
  tuft(m, -1.2, 26, 9.4, -1.8, 28.2, 9.8, 0.95, P.e6, P.s5);
  tuft(m, 0.8, 26.2, 9.8, 1.4, 28, 10.4, 0.85, P.e6, P.e6);
  for (const side of [-1, 1]) tuft(m, side * 3.2, 19.4, 12, side * 3.8, 17.4, 12.4, 1.05, P.e6, P.e7);
  // Rotes Halsband mit Naht, vorn der große Knopf mit vier Löchern an einer Öse
  const ay = 4 / Math.hypot(4, 2.8);
  const az = 2.8 / Math.hypot(4, 2.8);
  const along = (y, z) => (y - 17.8) * ay + (z - 7.3) * az;
  const collar = (x, y, z) => Math.max(NECK(x, y, z) - 1.2, Math.abs(along(y, z)) - 1.05);
  sculpt(m, collar, -7, 12, 1, 6, 23, 14, (x, y, z) => (along(y + 0.5, z + 0.5) > 0.2 && x & 1 ? P.r4 : P.r3));
  // (hängt unter der Schnauze, damit man ihn von vorn sieht)
  m.box(-1, 13, 11, 0, 14, 11, P.s6); // Öse
  m.box(-2, 9, 11, 1, 12, 11, (x, y) => ((x === -2 || x === 1) && (y === 9 || y === 12) ? null : (x === -1 || x === 0) && (y === 10 || y === 11) ? P.e3 : y === 12 ? P.f7 : P.f6));
  return m;
}

// Schwanz: vom Ansatz nach hinten, die Spitze biegt sich hoch und ist hell
const TAIL = smoothUnion(capsule(0, 16.8, -8, 0, 17.4, -12.4, 1.9, 1.55), capsule(0, 17.4, -12.4, 0, 19.2, -15.2, 1.55, 1.1), 1);

function buildTail32() {
  const m = new VoxelModel();
  sculpt(m, TAIL, -3, 14, -17, 2, 21, -7, (x, y, z, n) => (z <= -14 ? P.e7 : roundTone(z % 3 === 0 ? P.e6 : P.e5, n, { light: 1, dark: 0 })));
  tuft(m, 0, 16, -11, 0, 14.6, -11.8, 0.9, P.e6, P.e7);
  return m;
}

/** Bein um die eigene Mitte (x = z = 0), Pfote vorn etwas länger; hinten mit Keule. */
function buildLeg32(hind) {
  const m = new VoxelModel();
  let shape = capsule(0, 8.5, 0, 0, 2.2, 0.2, 1.9, 1.6);
  if (hind) shape = smoothUnion(shape, blob(0, 7.4, -0.5, 2.3, 2.9, 2.6), 1.5);
  const paw = blob(0, 1.1, 0.8, 2, 1.25, 2.4);
  shape = smoothUnion(shape, paw, 1);
  sculpt(m, shape, -3, 0, -4, 2, 11, 4, (x, y, z, n) => {
    if (y <= 1) return n.z > 0.6 && (x === -1 || x === 1) ? P.e2 : P.e3; // Pfote mit Zehen
    if (y === 2) return P.e4;
    return roundTone(x < 0 ? P.e6 : P.e5, n, { light: 1, dark: 0 });
  });
  if (!hind) tuft(m, 0, 6.5, -1.6, 0, 3.6, -2.2, 1, P.e6, P.e7); // Befiederung hinten
  return m;
}

/** Die Einzelteile als Voxel-Modelle (für das Porträt, 1/16 m). */
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
  // Gelenke der 1/16-Figur mal zwei (M13g); alle Teile in Figur-Koordinaten
  const body = part(buildBody32(), [0, 12, 0], [0, 0, 0]);
  const head = part(buildHead32(), [0, 18, 8], [0, 0, 0]);
  const tail = part(buildTail32(), [0, 16, -8], [0, 0, 0]);
  const front = buildLeg32(false);
  const hind = buildLeg32(true);
  const legs = [
    part(front, [-4, 8, 6], [-4, 0, 6]),
    part(front, [4, 8, 6], [4, 0, 6]),
    part(hind, [-4, 8, -6], [-4, 0, -6]),
    part(hind, [4, 8, -6], [4, 0, -6]),
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
  body.position.y = 12 * U + Math.abs(Math.cos(phase)) * 0.02 * moving - sit * 0.08;
  body.rotation.x = -sit * 0.45;
  // Sitzen: Hinterbeine nach vorn geklappt
  legs[2].rotation.x += sit * 1.2;
  legs[3].rotation.x += sit * 1.2;
  tail.rotation.y = Math.sin(t * (6 + wag * 8)) * 0.6 * wag;
  tail.rotation.x = 0.5 - sit * 0.4;
  head.rotation.z = Math.sin(t * 0.7) * 0.12 * (1 - moving);
  head.rotation.x = sit * 0.35 - bark * 0.35;
}
