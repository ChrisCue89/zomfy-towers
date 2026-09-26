// Voxel-Figuren. Eine Figur besteht aus Teilen (Beine, Körper, Arme, Kopf),
// die an Gelenken hängen und sich so animieren lassen. Der gleiche Bauer wird
// später für Überlebende benutzt; Porträts werden aus dem Kopf gerendert.
//
// Koordinaten in Voxeln (1/8 m), Blickrichtung +z, Ursprung zwischen den Füßen.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { createWorldMaterial, createGlowMaterial } from '../render/materials.js';
import { V } from '../world/layout.js';

/** Aussehen der Hauptfigur Mika. */
export const MIKA = {
  skin: P.h3,
  skinShade: P.h2,
  cheek: P.a1,
  eyes: P.n1,
  hair: P.e3,
  hat: P.f4,
  hatDark: P.f3,
  hatLight: P.f5,
  pompom: P.e9,
  jacket: P.g5,
  jacketDark: P.g4,
  jacketLight: P.g6,
  zipper: P.e8,
  pants: P.b2,
  pantsDark: P.b1,
  boots: P.e2,
  bootsLight: P.e4,
  backpack: P.e6,
  backpackDark: P.e4,
  bedroll: P.b3,
  strap: P.e3,
};

function buildLeg(spec) {
  const m = new VoxelModel();
  m.box(0, 1, 0, 1, 2, 1, (x, y) => (y === 2 ? spec.pantsDark : spec.pants));
  m.box(0, 0, 0, 1, 0, 1, spec.boots);
  m.box(0, 0, 2, 1, 0, 2, spec.bootsLight);
  return m;
}

function buildArm(spec) {
  const m = new VoxelModel();
  m.box(0, 1, 0, 0, 3, 1, (x, y) => (y === 3 ? spec.jacketLight : spec.jacket));
  m.box(0, 0, 0, 0, 0, 1, spec.skin);
  return m;
}

function buildTorso(spec) {
  const m = new VoxelModel();
  // Jacke
  m.box(-3, 3, -2, 2, 6, 1, (x, y, z) => {
    if (y === 3) return spec.jacketDark; // Saum
    if (z === 1 && x === 0) return spec.zipper;
    if (z === 1 && y === 4 && (x === -3 || x === 2)) return spec.jacketDark; // Taschen
    if (y === 6 && (z === 1 || z === -2)) return spec.jacketDark; // Kragen
    return spec.jacket;
  });
  // Riemen vorn
  m.box(-2, 4, 1, -2, 6, 1, spec.strap);
  m.box(1, 4, 1, 1, 6, 1, spec.strap);
  // Rucksack mit Isomatte
  m.box(-2, 3, -4, 1, 6, -3, (x, y, z) => (y === 6 ? spec.backpackDark : z === -4 && y === 4 ? spec.backpackDark : spec.backpack));
  m.box(-3, 7, -4, 2, 7, -3, (x) => (x % 2 ? spec.bedroll : P.b2));
  return m;
}

function buildHead(spec) {
  const m = new VoxelModel();
  // Kopf: 6 breit, 4 hoch, 5 tief
  m.box(-3, 7, -3, 2, 10, 1, (x, y, z) => {
    const front = z === 1;
    if (front) {
      if (y === 10) return spec.hair; // Pony
      if (y === 9 && (x === -2 || x === 1)) return spec.eyes;
      if (y === 8 && (x === -3 || x === 2)) return spec.cheek;
      return spec.skin;
    }
    if (z <= -1 || y >= 9) return spec.hair;
    return y === 7 ? spec.skinShade : spec.skin;
  });
  // Mütze: umgeschlagener Rand, Kappe, Bommel
  m.box(-3, 11, -3, 2, 11, 1, (x) => (x % 2 ? spec.hatDark : spec.hat));
  m.box(-3, 12, -3, 2, 12, 1, (x, y, z) => ((x === -3 || x === 2) && (z === -3 || z === 1) ? null : x % 2 ? spec.hat : spec.hatLight));
  m.box(-2, 13, -2, 1, 13, 0, spec.hat);
  m.box(-1, 14, -2, 0, 14, -1, spec.pompom);
  return m;
}

function buildLantern() {
  const frame = new VoxelModel();
  frame.box(-1, 0, -1, 1, 0, 1, P.s2);
  frame.box(-1, 3, -1, 1, 3, 1, P.e5);
  frame.set(0, 4, 0, P.s3);
  const glass = new VoxelModel();
  glass.box(-1, 1, -1, 1, 2, 1, 0xffffff);
  return { frame, glass };
}

/**
 * Baut eine animierbare Figur.
 * @returns {{root: THREE.Group, parts: object, lantern: object}}
 */
export function buildCharacter(spec, { seed = 3, occluder = false } = {}) {
  const material = createWorldMaterial({ occluder });
  const geo = (model) => model.toGeometry({ jitter: 0.03, seed });
  const root = new THREE.Group();
  root.name = 'Figur';

  // Teil an einem Gelenk: Mesh wird so versetzt, dass das Gelenk der Drehpunkt ist.
  const part = (model, joint, offset = [0, 0, 0]) => {
    const pivot = new THREE.Group();
    pivot.position.set(joint[0] * V, joint[1] * V, joint[2] * V);
    const mesh = new THREE.Mesh(geo(model), material);
    mesh.position.set((offset[0] - joint[0]) * V, (offset[1] - joint[1]) * V, (offset[2] - joint[2]) * V);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    return pivot;
  };

  const body = new THREE.Group(); // alles oberhalb der Hüfte
  root.add(body);
  const legL = part(buildLeg(spec), [-1, 3, 0], [-2, 0, -1]);
  const legR = part(buildLeg(spec), [1, 3, 0], [0, 0, -1]);
  root.add(legL, legR);
  const torso = part(buildTorso(spec), [0, 3, 0]);
  const head = part(buildHead(spec), [0, 7, -1]);
  const armL = part(buildArm(spec), [-3.5, 7, 0], [-4, 3, -1]);
  const armR = part(buildArm(spec), [3.5, 7, 0], [3, 3, -1]);
  body.add(torso, head, armL, armR);

  // Hände: Anker am unteren Ende der Arme. Rechts Werkzeuge/Waffen, links die Laterne.
  const hand = new THREE.Group();
  hand.position.set(0, -4 * V, 0);
  armR.add(hand);
  const handL = new THREE.Group();
  handL.position.set(0, -4 * V, 0);
  armL.add(handL);

  // Laterne (zunächst versteckt) in der linken Hand
  const lanternParts = buildLantern();
  const lanternGroup = new THREE.Group();
  const lanternFrame = new THREE.Mesh(lanternParts.frame.toGeometry({ jitter: 0, seed }), material);
  lanternFrame.castShadow = true;
  const lanternGlow = createGlowMaterial(0xffffff);
  const lanternGlass = new THREE.Mesh(lanternParts.glass.toGeometry({ jitter: 0, ao: false }), lanternGlow);
  lanternGroup.add(lanternFrame, lanternGlass);
  lanternGroup.position.set(0.5 * V, -5 * V, 0);
  lanternGroup.visible = false;
  handL.add(lanternGroup);

  // Werkzeuge in der rechten Hand (Stiel entlang des Arms nach unten)
  const tools = {};
  for (const [name, model] of Object.entries(TOOL_MODELS)) {
    const mesh = new THREE.Mesh(model().toGeometry({ jitter: 0.02, seed }), material);
    mesh.castShadow = true;
    mesh.position.set(-0.5 * V, 0, -0.5 * V);
    mesh.visible = false;
    hand.add(mesh);
    tools[name] = mesh;
  }

  return {
    root,
    material,
    parts: { body, torso, head, armL, armR, legL, legR, hand, handL },
    lantern: { group: lanternGroup, glow: lanternGlow, lightAnchor: lanternGlass },
    tools,
  };
}

/** Axt: heller Stiel nach unten (−y), breites, blankes Blatt mit roter Bindung. */
function buildAxeModel() {
  const m = new VoxelModel();
  m.box(0, -7, 0, 0, 0, 0, (x, y) => (y === 0 ? P.e3 : P.e6));
  m.box(0, -9, 1, 0, -5, 2, P.s7);
  m.set(0, -9, 3, P.s9).set(0, -8, 3, P.s9).set(0, -7, 3, P.s9).set(0, -6, 3, P.s9).set(0, -5, 3, P.s9);
  m.set(0, -7, -1, P.r3);
  return m;
}

/** Spitzhacke: dunkler Stiel, quer liegender dunkler Kopf mit hellen Spitzen. */
function buildPickaxeModel() {
  const m = new VoxelModel();
  m.box(0, -7, 0, 0, 0, 0, (x, y) => (y === 0 ? P.e2 : P.e4));
  m.box(0, -8, -3, 0, -8, 3, P.s3);
  m.set(0, -7, -4, P.s8).set(0, -7, 4, P.s8).set(0, -8, -4, P.s6).set(0, -8, 4, P.s6);
  return m;
}

/** Schaufel: langer heller Stiel mit Griff, graues Blatt unten. */
function buildShovelModel() {
  const m = new VoxelModel();
  m.box(0, -8, 0, 0, 0, 0, (x, y) => (y === 0 ? P.e3 : P.e6));
  m.box(0, 1, -1, 0, 1, 1, P.e3);
  m.box(0, -12, -1, 0, -9, 1, (x, y, z) => (y === -12 ? P.s8 : z === 0 ? P.s6 : P.s5));
  return m;
}

/** Bratpfanne: kurzer dunkler Griff, schwere schwarze Pfanne mit hellem Rand. */
function buildPanModel() {
  const m = new VoxelModel();
  m.box(0, -4, 0, 0, 0, 0, P.e2);
  m.box(0, -9, -2, 0, -5, 2, (x, y, z) => (Math.abs(z) === 2 || y === -9 || y === -5 ? P.s4 : P.s2));
  return m;
}

/** Rechen: langer Stiel, Querholz mit Zinken. */
function buildRakeModel() {
  const m = new VoxelModel();
  m.box(0, -10, 0, 0, 0, 0, (x, y) => (y === 0 ? P.e3 : P.e6));
  m.box(0, -11, -3, 0, -11, 3, P.e4);
  for (let z = -3; z <= 3; z += 2) m.set(0, -12, z, P.s6);
  return m;
}

/** Fäustlinge: dicker roter Strickhandschuh mit weißem Bündchen. */
function buildMittenModel() {
  const m = new VoxelModel();
  m.box(-1, -2, -1, 1, 0, 1, (x, y, z) => (y === 0 ? P.s9 : (x + y + z) % 2 ? P.f2 : P.f3));
  m.set(0, -1, 2, P.f2);
  return m;
}

const TOOL_MODELS = {
  axt: buildAxeModel,
  spitzhacke: buildPickaxeModel,
  schaufel: buildShovelModel,
  pfanne: buildPanModel,
  rechen: buildRakeModel,
  faeustlinge: buildMittenModel,
};

/** Oberkörper und Kopf als ein Voxel-Modell – für Porträts. */
export function buildBustModel(spec) {
  const m = new VoxelModel();
  m.merge(buildTorso(spec));
  m.merge(buildHead(spec));
  return m;
}
