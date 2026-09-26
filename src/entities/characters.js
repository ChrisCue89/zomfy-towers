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

  // Hand rechts: Anker für gehaltene Dinge (unteres Ende des Arms)
  const hand = new THREE.Group();
  hand.position.set(0, -4 * V, 0);
  armR.add(hand);

  // Laterne (zunächst versteckt)
  const lanternParts = buildLantern();
  const lanternGroup = new THREE.Group();
  const lanternFrame = new THREE.Mesh(lanternParts.frame.toGeometry({ jitter: 0, seed }), material);
  lanternFrame.castShadow = true;
  const lanternGlow = createGlowMaterial(0xffffff);
  const lanternGlass = new THREE.Mesh(lanternParts.glass.toGeometry({ jitter: 0, ao: false }), lanternGlow);
  lanternGroup.add(lanternFrame, lanternGlass);
  lanternGroup.position.set(-0.5 * V, -5 * V, 0);
  lanternGroup.visible = false;
  hand.add(lanternGroup);

  return {
    root,
    material,
    parts: { body, torso, head, armL, armR, legL, legR, hand },
    lantern: { group: lanternGroup, glow: lanternGlow, lightAnchor: lanternGlass },
  };
}

/** Oberkörper und Kopf als ein Voxel-Modell – für Porträts. */
export function buildBustModel(spec) {
  const m = new VoxelModel();
  m.merge(buildTorso(spec));
  m.merge(buildHead(spec));
  return m;
}
