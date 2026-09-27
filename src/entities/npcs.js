// Darstellung der Überlebenden (Meilenstein 6): Figuren aus survivorModels.js
// (gleiches Rig wie Mika) und Knopf, der Hund. Nur Darstellung und Animation –
// wo jemand steht und ob er zu sehen ist, entscheidet core/survivors.js.

import * as THREE from 'three';
import { survivorParts } from './survivorModels.js';
import { buildDog, poseDog } from './dogModel.js';
import { createWorldMaterial } from '../render/materials.js';
import { VoxelModel } from '../render/voxel.js';
import { damp, dampAngle, clamp } from '../core/math.js';

const U = 1 / 16;
const WALK_SPEED = 1.6;

/** Menschliche Figur aus Teilen – Gelenke wie bei Mika (characters.js). */
function buildSurvivor(id, seed) {
  const parts = survivorParts(id);
  const material = createWorldMaterial({ selfLight: 0.3 });
  const geo = (model) => model.toGeometry({ jitter: 0.03, seed, size: U });
  const part = (model, joint, offset = [0, 0, 0]) => {
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
  root.name = id;
  const body = new THREE.Group();
  root.add(body);
  const legL = part(parts.leg, [-2, 6, 0], [-4, 0, -2]);
  const legR = part(parts.leg, [2, 6, 0], [0, 0, -2]);
  root.add(legL, legR);
  const torso = part(parts.torso, [0, 6, 0]);
  const head = part(parts.head, [0, 14, -2]);
  const armL = part(parts.arm, [-7, 14, 0], [-8, 6, -2]);
  const armR = part(parts.arm, [7, 14, 0], [6, 6, -2]);
  body.add(torso, head, armL, armR);
  // Lider: eine Hautreihe vor den Augen, meist versteckt
  const lids = new VoxelModel();
  for (const x of [-4, -3, 2, 3]) lids.set(x, 17, 4, parts.skin);
  const eyelids = new THREE.Mesh(geo(lids), material);
  eyelids.position.set(0, -14 * U, 2 * U);
  eyelids.visible = false;
  head.add(eyelids);
  return { root, material, parts: { body, torso, head, armL, armR, legL, legR, eyelids } };
}

export class Npcs {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../world/world.js').World} world
   */
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.list = new Map(); // id -> Figur mit Zustand
    this.time = 0;
    this.group = new THREE.Group();
    this.group.name = 'Überlebende';
    scene.add(this.group);
  }

  /** Figur anlegen (einmal) und zurückgeben. */
  get(id, dog = false) {
    let n = this.list.get(id);
    if (n) return n;
    const model = dog ? buildDog({ seed: 11 }) : buildSurvivor(id, 17 + this.list.size);
    n = {
      id,
      dog,
      model,
      x: 0,
      z: 0,
      facing: 0,
      target: null, // Laufziel {x, z}
      phase: 0,
      moving: 0,
      blinkAt: 1 + Math.random() * 3,
      wave: 0, // Winken (Sekunden)
      bark: 0, // Bellen (Sekunden)
      sit: 0,
      sitTarget: 0,
      drive: null, // m/s: Position setzt jemand anderes
      y: null, // Höhe, wenn sie nicht vom Boden kommt (Balduin im Boot)
      restFacing: null, // Blickrichtung im Stehen, wenn Mika weiter weg ist
      pull: null,
    };
    model.root.visible = false;
    this.group.add(model.root);
    this.list.set(id, n);
    return n;
  }

  /** Sofort an eine Stelle setzen. */
  place(n, x, z, facing = 0) {
    n.x = x;
    n.z = z;
    n.facing = facing;
    n.target = null;
    this.sync(n);
  }

  walkTo(n, x, z) {
    if (Math.hypot(n.x - x, n.z - z) < 0.05) return;
    n.target = { x, z };
  }

  sync(n) {
    const root = n.model.root;
    root.position.set(n.x, n.y ?? this.world.heightAt(n.x, n.z), n.z);
    root.rotation.y = n.facing;
  }

  /**
   * @param {number} dt
   * @param {{x:number, z:number}} player
   */
  update(dt, player) {
    this.time += dt;
    const t = this.time;
    for (const n of this.list.values()) {
      if (!n.model.root.visible) continue;
      // Laufen: gerade Linie mit Kollision, am Ziel stehen bleiben
      let speed = 0;
      if (n.drive !== null) speed = n.drive;
      else if (n.target) {
        const dx = n.target.x - n.x;
        const dz = n.target.z - n.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.08) n.target = null;
        else {
          const step = Math.min(d, WALK_SPEED * (n.dog ? 1.3 : 1) * dt);
          const pos = { x: n.x, z: n.z };
          this.world.colliders.move(pos, (dx / d) * step, (dz / d) * step, n.dog ? 0.2 : 0.25, { bounds: true });
          speed = Math.hypot(pos.x - n.x, pos.z - n.z) / Math.max(dt, 1e-4);
          if (speed < 0.05 && d > 0.3) n.target = null; // festgefahren: hier bleiben
          n.x = pos.x;
          n.z = pos.z;
          n.facing = dampAngle(n.facing, Math.atan2(dx, dz), 8, dt);
        }
      } else {
        // Stehend: Mika in der Nähe anschauen
        const px = player.x - n.x;
        const pz = player.z - n.z;
        if (px * px + pz * pz < 9) n.facing = dampAngle(n.facing, Math.atan2(px, pz), 4, dt);
        else if (n.restFacing !== null) n.facing = dampAngle(n.facing, n.restFacing, 3, dt);
      }
      n.moving = damp(n.moving, clamp(speed / WALK_SPEED, 0, 1), 10, dt);
      n.phase += dt * speed * 4.4;
      n.wave = Math.max(0, n.wave - dt);
      n.bark = Math.max(0, n.bark - dt);
      n.sit = damp(n.sit, n.sitTarget, 4, dt);
      if (n.dog) poseDog(n.model, { t, phase: n.phase, moving: n.moving, wag: n.target ? 0.6 : 1, sit: n.sit, bark: n.bark > 0 ? Math.abs(Math.sin(n.bark * 18)) : 0 });
      else this.poseHuman(n, dt);
      this.sync(n);
    }
  }

  poseHuman(n, dt) {
    const p = n.model.parts;
    const amt = n.moving;
    const s = Math.sin(n.phase);
    const idle = 1 - amt;
    p.legL.rotation.x = s * 0.7 * amt;
    p.legR.rotation.x = -s * 0.7 * amt;
    p.armL.rotation.x = -s * 0.55 * amt;
    p.armR.rotation.x = s * 0.55 * amt;
    p.body.position.y = Math.abs(Math.cos(n.phase)) * 0.03 * amt + Math.sin(this.time * 2 + n.x) * 0.005 * idle;
    p.head.rotation.x = Math.sin(n.phase * 2) * 0.05 * amt;
    p.head.rotation.y = Math.sin(this.time * 0.4 + n.z) * 0.15 * idle;
    // Winken zur Begrüßung
    if (n.wave > 0) {
      p.armR.rotation.x = -2.6;
      p.armR.rotation.z = 0.25 + Math.sin(n.wave * 14) * 0.35;
    } else {
      p.armR.rotation.z = damp(p.armR.rotation.z, 0, 8, dt);
    }
    if (this.time > n.blinkAt + 0.13) n.blinkAt = this.time + 2.5 + Math.random() * 3.5;
    p.eyelids.visible = this.time >= n.blinkAt;
  }

  setVisible(id, visible) {
    const n = this.list.get(id);
    if (n) n.model.root.visible = visible;
  }
}
