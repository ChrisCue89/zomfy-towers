// Darstellung der Überlebenden (Meilenstein 6): Figuren aus survivorModels.js
// (gleiches Rig wie Mika) und Knopf, der Hund. Nur Darstellung und Animation –
// wo jemand steht und ob er zu sehen ist, entscheidet core/survivors.js.

import * as THREE from 'three';
import { survivorParts32, bedrollModel } from './survivorModels.js';
import { buildDog, poseDog } from './dogModel.js';
import { createWorldMaterial } from '../render/materials.js';
import { damp, dampAngle, clamp } from '../core/math.js';

const U = 1 / 32; // M13g: doppelt fein wie Mika – Gelenke der 1/16-Figur mal zwei
const WALK_SPEED = 1.6;

/** Menschliche Figur aus Teilen – Gelenke wie bei Mika (characters.js). */
function buildSurvivor(id, seed) {
  const parts = survivorParts32(id);
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
  const legL = part(parts.leg, [-4, 12, 0], [-8, 0, -4]);
  const legR = part(parts.leg, [4, 12, 0], [0, 0, -4]);
  root.add(legL, legR);
  const torso = part(parts.torso, [0, 12, 0]);
  const head = part(parts.head, [0, 28, -4]);
  const armL = part(parts.arm, [-14, 28, 0], [-16, 12, -4]);
  const armR = part(parts.arm, [14, 28, 0], [12, 12, -4]);
  body.add(torso, head, armL, armR);
  // Lider: Haut vor den Augen, meist versteckt
  const eyelids = new THREE.Mesh(geo(parts.lids), material);
  eyelids.position.set(0, -28 * U, 4 * U);
  eyelids.visible = false;
  head.add(eyelids);
  // Gesichtsplatten (M12): normal und lächelnd – Balduin grinst ohnehin immer
  let faces = null;
  if (parts.faces) {
    faces = {};
    for (const expr of ['normal', 'froh']) {
      const plate = new THREE.Mesh(geo(parts.faces[expr]), material);
      plate.position.set(0, -28 * U, 4 * U);
      plate.castShadow = true;
      plate.receiveShadow = true;
      plate.visible = expr === 'normal';
      head.add(plate);
      faces[expr] = plate;
    }
  }
  return { root, material, parts: { body, torso, head, armL, armR, legL, legR, eyelids, faces }, smileEyes: Boolean(parts.faces?.eyesClose) };
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
      gestures: [], // Gesten nacheinander (M10): { kind, dur, t }
      bark: 0, // Bellen (Sekunden)
      sit: 0,
      sitTarget: 0,
      drive: null, // m/s: Position setzt jemand anderes
      y: null, // Höhe, wenn sie nicht vom Boden kommt (Balduin im Boot)
      restFacing: null, // Blickrichtung im Stehen, wenn Mika weiter weg ist
      pull: null,
      near: false, // Mika steht nah dabei (dann lächeln sie, M12)
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
      n.near = false;
      if (n.drive !== null) speed = n.drive;
      else if (n.target) {
        const dx = n.target.x - n.x;
        const dz = n.target.z - n.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.08) n.target = null;
        else {
          const step = Math.min(d, WALK_SPEED * (n.dog ? 1.3 : 1) * (n.rush || 1) * dt); // rush: Knopf auf den Pfiff (M16)
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
        n.near = px * px + pz * pz < 9;
        if (n.near) n.facing = dampAngle(n.facing, Math.atan2(px, pz), 4, dt);
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
    p.armL.rotation.z = damp(p.armL.rotation.z, 0, 8, dt);
    p.head.rotation.z = damp(p.head.rotation.z, 0, 8, dt);
    this.poseGesture(n, dt);
    // Lächeln beim Winken, bei Gesten und wenn Mika dabeisteht (M12)
    const happy = n.wave > 0 || n.near || n.gestures.length > 0;
    if (p.faces) {
      p.faces.froh.visible = happy;
      p.faces.normal.visible = !happy;
    }
    if (this.time > n.blinkAt + 0.13) n.blinkAt = this.time + 2.5 + Math.random() * 3.5;
    p.eyelids.visible = this.time >= n.blinkAt && !(happy && n.model.smileEyes);
  }

  /** Eine Geste vorspielen (M10); mehrere laufen nacheinander. */
  gesture(n, kind, dur) {
    n.gestures.push({ kind, dur, t: 0 });
  }

  /**
   * Gesten über der Grundhaltung (M10, Balduin): Mütze lüften, Hände reiben,
   * Daumen hoch, Winken, Achselzucken, Bart kraulen. Weich ein- und ausgeblendet.
   */
  poseGesture(n, dt) {
    const g = n.gestures[0];
    if (!g) return;
    g.t += dt;
    const p = n.model.parts;
    const k = clamp(Math.min(g.t / 0.18, (g.dur - g.t) / 0.18), 0, 1);
    const to = (obj, axis, value) => {
      obj.rotation[axis] += (value - obj.rotation[axis]) * k;
    };
    switch (g.kind) {
      case 'muetze': // rechte Hand an den Mützenschirm, Kopf nickt
        to(p.armR, 'x', -2.85);
        to(p.armR, 'z', -0.45);
        p.head.rotation.x += Math.sin(g.t * 7) * 0.1 * k;
        break;
      case 'reiben': // beide Hände vor dem Bauch, die reiben sich
        to(p.armL, 'x', -1.05);
        to(p.armR, 'x', -1.05);
        to(p.armL, 'z', -0.38 + Math.sin(g.t * 20) * 0.1);
        to(p.armR, 'z', 0.38 - Math.sin(g.t * 20) * 0.1);
        break;
      case 'daumen': // rechter Arm nach vorn oben, kurz gehalten
        to(p.armR, 'x', -1.75);
        to(p.armR, 'z', -0.1);
        break;
      case 'winken':
        to(p.armR, 'x', -2.6);
        to(p.armR, 'z', 0.25 + Math.sin(g.t * 14) * 0.35);
        break;
      case 'schulter': // Achseln zucken, Kopf schief
        to(p.armL, 'z', 0.4);
        to(p.armR, 'z', -0.4);
        to(p.head, 'z', 0.16);
        break;
      case 'bart': // rechte Hand am Kinn, nachdenklich
        to(p.armR, 'x', -2.1);
        to(p.armR, 'z', -0.55);
        to(p.head, 'x', -0.1);
        break;
      default:
        break;
    }
    if (g.t >= g.dur) n.gestures.shift();
  }

  setVisible(id, visible) {
    const n = this.list.get(id);
    if (n) n.model.root.visible = visible;
  }

  /**
   * Schlafsäcke an den Gästeplätzen (M27): einmal angelegt, sichtbar, solange
   * dort ein Gast übernachtet.
   * @param {Array<{x:number, z:number, facing:number}>} spots
   * @param {Set<number>} used Indizes der belegten Plätze
   */
  setBedrolls(spots, used) {
    if (!this.bedrolls) {
      const geo = bedrollModel().toGeometry({ jitter: 0.02, seed: 5, size: U });
      const material = createWorldMaterial({ selfLight: 0.2 });
      this.bedrolls = spots.map((s) => {
        const mesh = new THREE.Mesh(geo, material);
        // hinter dem Sitzplatz, vom Feuer weg
        const bx = s.x - Math.sin(s.facing) * 0.8;
        const bz = s.z - Math.cos(s.facing) * 0.8;
        mesh.position.set(Math.round(bx * 8) / 8, this.world.heightAt(bx, bz), Math.round(bz * 8) / 8);
        mesh.rotation.y = Math.round(s.facing / (Math.PI / 2)) * (Math.PI / 2); // nur 90°-Drehungen (Pixelraster)
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.visible = false;
        this.group.add(mesh);
        return mesh;
      });
    }
    this.bedrolls.forEach((mesh, i) => (mesh.visible = used.has(i)));
  }
}
