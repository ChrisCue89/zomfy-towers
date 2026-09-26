// Loot am Boden (DESIGN.md 6.5): Stirbt ein Schlurfer, fällt sein Loot genau
// dort hin – Schrottbrocken, manchmal ein Zahnrad, beim Anführer ein
// Moderkern. Im Sammelradius fliegt es von selbst zu Mika. Nach 75 Sekunden
// zerfällt es (die letzten 10 Sekunden blinkt es).

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { createWorldMaterial } from '../render/materials.js';

export const LOOT_LIFE = 75;
const BLINK = 10;
const MAX = 160;

function scrapModel() {
  const m = new VoxelModel();
  m.box(-1, 0, -1, 1, 0, 1, (x, y, z) => ((x + z) % 2 ? P.s6 : P.s5));
  m.set(0, 1, 0, P.r3).set(-1, 1, -1, P.s7).set(1, 1, 0, P.s4);
  return m;
}

function gearModel() {
  const m = new VoxelModel();
  // Zahnrad aufrecht (in der x/y-Ebene), goldgelb
  for (let a = 0; a < 12; a++) {
    const t = (a / 12) * Math.PI * 2;
    const r = a % 2 ? 2.4 : 1.8;
    m.set(Math.round(Math.cos(t) * r), Math.round(Math.sin(t) * r) + 2, 0, a % 2 ? P.f5 : P.f6);
  }
  m.box(-1, 1, 0, 1, 3, 0, P.f6);
  m.set(0, 2, 0, P.e3);
  return m;
}

function coreModel() {
  const m = new VoxelModel();
  m.box(-1, 0, -1, 1, 2, 1, (x, y, z) => (x === 0 && z === 0 ? 0xd8b8ff : (x + y + z) % 2 ? 0xa88fd0 : 0x7b5aa6));
  return m;
}

const MODELS = { schrott: scrapModel, zahnraeder: gearModel, moderkerne: coreModel };

export class Loot {
  constructor(scene, rng) {
    this.rng = rng;
    this.items = [];
    this.material = createWorldMaterial();
    this.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.meshes = {};
    this.dummy = new THREE.Object3D();
    for (const [res, build] of Object.entries(MODELS)) {
      const geo = build().toGeometry({ jitter: 0.02, seed: 3 });
      const mesh = new THREE.InstancedMesh(geo, res === 'moderkerne' ? this.glow : this.material, MAX);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = res !== 'moderkerne';
      mesh.count = 0;
      scene.add(mesh);
      this.meshes[res] = mesh;
    }
  }

  /**
   * Beute würfeln und verstreut fallen lassen.
   * @param {object} table { schrott: [1,2], zahnraeder: 0.2 }
   * @param {number} factor Mengenfaktor (Tagesschlurfer 0,5; Glückslaterne > 1)
   */
  drop(x, z, table, factor = 1) {
    for (const [res, spec] of Object.entries(table)) {
      let n = Array.isArray(spec) ? this.rng.int(spec[0], spec[1]) : this.rng.chance(spec) ? 1 : 0;
      n *= factor;
      // Bruchteile als Wahrscheinlichkeit
      const whole = Math.floor(n) + (this.rng.chance(n - Math.floor(n)) ? 1 : 0);
      for (let k = 0; k < whole; k++) this.spawn(res, x, z);
    }
  }

  spawn(res, x, z) {
    if (this.items.length >= MAX * 2) this.items.shift();
    const a = this.rng.range(0, Math.PI * 2);
    const s = this.rng.range(0.6, 1.6);
    this.items.push({ res, x, z, y: 0.4, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: this.rng.range(2, 3.2), age: 0, flying: false, spin: this.rng.range(0, 6) });
  }

  clear() {
    this.items.length = 0;
  }

  /**
   * @param {number} dt
   * @param {{x:number, z:number}} player
   * @param {number} radius Sammelradius
   * @param {(res:string, x:number, y:number, z:number) => void} onCollect
   */
  update(dt, player, radius, onCollect) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      it.spin += dt * 2.5;
      if (it.age > LOOT_LIFE) {
        this.items.splice(i, 1);
        continue;
      }
      const dx = player.x - it.x;
      const dz = player.z - it.z;
      const d = Math.hypot(dx, dz);
      if (!it.flying && it.age > 0.35 && d < radius) it.flying = true;
      if (it.flying) {
        // Beschleunigt auf Mika zu, landet in der Tasche
        const speed = 3 + it.age * 0 + Math.max(0, 7 - d * 1.5);
        it.x += (dx / (d || 1)) * Math.min(d, speed * dt);
        it.z += (dz / (d || 1)) * Math.min(d, speed * dt);
        it.y = Math.max(it.y, 0.6 + Math.min(0.5, d * 0.25));
        if (d < 0.35) {
          this.items.splice(i, 1);
          onCollect(it.res, it.x, it.y, it.z);
        }
        continue;
      }
      // Hüpfen und liegen bleiben
      if (it.vy !== 0 || it.y > 0.05) {
        it.vy -= 14 * dt;
        it.x += it.vx * dt;
        it.z += it.vz * dt;
        it.y += it.vy * dt;
        if (it.y <= 0.05) {
          it.y = 0.05;
          it.vy = Math.abs(it.vy) > 1.5 ? -it.vy * 0.35 : 0;
          it.vx *= 0.5;
          it.vz *= 0.5;
        }
      }
    }
  }

  render() {
    const counts = { schrott: 0, zahnraeder: 0, moderkerne: 0 };
    const d = this.dummy;
    for (const it of this.items) {
      const mesh = this.meshes[it.res];
      const k = counts[it.res];
      if (k >= MAX) continue;
      // Letzte Sekunden: blinken
      const left = LOOT_LIFE - it.age;
      if (left < BLINK && Math.floor(left * (left < 4 ? 8 : 4)) % 2 === 0) continue;
      const bob = it.vy === 0 && !it.flying ? 0.08 + Math.sin(it.spin * 1.6) * 0.05 : 0;
      d.position.set(it.x, it.y + bob, it.z);
      d.rotation.set(0, it.res === 'zahnraeder' ? it.spin : it.spin * 0.3, 0);
      const scale = it.res === 'schrott' ? 1.25 : 1.1;
      d.scale.set(scale, scale, scale);
      d.updateMatrix();
      mesh.setMatrixAt(k, d.matrix);
      counts[it.res]++;
    }
    for (const [res, mesh] of Object.entries(this.meshes)) {
      mesh.count = counts[res];
      mesh.visible = counts[res] > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Zum Speichern (liegt noch Loot herum?). */
  toState() {
    return this.items.filter((it) => !it.flying).map((it) => ({ res: it.res, x: +it.x.toFixed(2), z: +it.z.toFixed(2), age: Math.round(it.age) }));
  }

  load(entries) {
    this.clear();
    for (const e of entries || []) {
      if (!MODELS[e.res]) continue;
      this.items.push({ res: e.res, x: e.x, z: e.z, y: 0.05, vx: 0, vz: 0, vy: 0, age: e.age || 0, flying: false, spin: this.rng.range(0, 6) });
    }
  }
}
