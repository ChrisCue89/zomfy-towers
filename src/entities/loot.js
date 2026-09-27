// Überreste am Boden (DESIGN.md 0 Nr. 8, 6.5): Stirbt ein Schlurfer, fällt
// seine Beute genau dort hin – Zombieteile (seit Meilenstein 8, vorher
// Schrott), manchmal ein Zahnrad, beim Anführer ein Moderkern. Im Sammelradius
// fliegt sie von selbst zu Mika. Seit Meilenstein 9 bleibt sie bis zu drei
// Spieltage liegen (auch über das Schlafen hinweg) und verrottet dann; die
// letzte Spielstunde blinkt sie. Liegende Beute funkelt ab und zu, nachts
// glimmt sie; außerhalb des Bildes zeigen Rauten am Rand hin.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { createWorldMaterial } from '../render/materials.js';

/** So viele Spieltage bleiben Überreste liegen (M9: vorher 90 Sekunden). */
export const LOOT_DAYS = 3;
const LIFE = LOOT_DAYS * 24 * 60; // in Spielminuten
const BLINK = 60; // die letzte Spielstunde blinkt es
const MAX = 240;

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

// --- Feiner Detailgrad (1/16 m, Meilenstein 5) -------------------------------------

const FINE = 1 / 16;

/** Schrottbrocken: verbogenes Blech mit Schrauben und Rost. */
function scrapFine() {
  const m = new VoxelModel();
  m.box(-3, 0, -3, 2, 0, 2, (x, y, z) => ((x + z) % 3 === 0 ? P.s6 : (x * z) % 4 === 1 ? P.s4 : P.s5));
  m.box(-2, 1, -2, 1, 1, 0, (x, z) => (x === -2 ? P.s7 : P.s6));
  m.set(-1, 2, -1, P.s8).set(0, 2, -1, P.s7); // aufgebogene Kante
  m.set(1, 1, 1, P.r3).set(-3, 1, 2, P.r4).set(2, 1, -3, P.r3); // Rost
  m.set(-2, 1, 1, P.s9).set(1, 2, -2, P.s9); // blanke Schrauben
  return m;
}

/** Zahnrad: Kranz mit acht Zähnen, Nabe mit Loch – aufrecht, goldgelb. */
function gearFine() {
  const m = new VoxelModel();
  for (let x = -5; x <= 5; x++) {
    for (let y = -5; y <= 5; y++) {
      const r = Math.hypot(x, y);
      const a = Math.atan2(y, x);
      const tooth = Math.cos(a * 8) > 0.35;
      if ((r >= 2.4 && r <= 3.6) || (tooth && r > 3.6 && r <= 5.1)) m.set(x, y + 5, 0, r > 3.6 ? P.f5 : P.f6);
      else if (r < 1.6 && r >= 0.9) m.set(x, y + 5, 0, P.f4);
    }
  }
  m.set(-1, 6, 0, P.f7).set(1, 8, 0, P.f7); // Glanzlichter
  return m;
}

/** Moderkern: leuchtender, facettierter Klumpen. */
function coreFine() {
  const m = new VoxelModel();
  m.ellipsoid(0, 3, 0, 3.2, 3.2, 3.2, (x, y, z) => {
    if (x === 0 && z === 0) return 0xf2e4ff;
    return (x + y + z) % 3 === 0 ? 0xd8b8ff : (x + y) % 2 ? 0xa88fd0 : 0x7b5aa6;
  });
  return m;
}

/**
 * Zombieteil (Meilenstein 8): eine grünlich-graue Hand, flach auf dem Boden,
 * mit Ärmelrest und Moosfleck – kein Blut, eher traurig als eklig.
 */
function partFine() {
  const m = new VoxelModel();
  // Handrücken
  m.box(-3, 0, -2, 2, 1, 2, (x, y, z) => (y === 0 ? P.t2 : (x + z) % 3 === 0 ? P.t3 : P.t4));
  // Drei Finger nach vorn, etwas gespreizt, Knöchel dunkler
  for (const [fx, len] of [[-3, 5], [-1, 6], [1, 5]]) {
    m.box(fx, 0, 3, fx, 1, len, (x, y, z) => (y === 0 ? P.t2 : z === 4 ? P.t3 : P.t4));
  }
  // Daumen zur Seite
  m.box(3, 0, 0, 4, 1, 1, (x, y) => (y === 0 ? P.t2 : P.t4));
  // Moosfleck auf dem Handrücken
  m.set(-2, 2, -1, P.g5).set(-1, 2, 0, P.g4).set(-2, 2, 0, P.g6);
  // Ärmelrest am Handgelenk (ausgefranster Stoff)
  m.box(-3, 0, -4, 2, 2, -3, (x, y, z) => (y === 2 && (x + z) % 2 ? null : (x + y) % 2 ? P.b2 : P.b1));
  return m;
}

/** Grobe Variante (Stand vor Meilenstein 5): nur noch zum Laden alter Stände nötig. */
function partModel() {
  const m = new VoxelModel();
  m.box(-1, 0, -1, 1, 0, 1, P.t4);
  m.set(0, 0, 2, P.t3).set(-1, 0, 2, P.t3);
  return m;
}

const MODELS = { schrott: scrapModel, teile: partModel, zahnraeder: gearModel, moderkerne: coreModel };
const FINE_MODELS = { schrott: scrapFine, teile: partFine, zahnraeder: gearFine, moderkerne: coreFine };

/** Funkeln über liegender Beute: ein kleines helles Kreuz (zum Finden, auch nachts). */
function glintModel() {
  const m = new VoxelModel();
  m.set(0, 0, 0, 0xfff6d8).set(-1, 0, 0, 0xffd98a).set(1, 0, 0, 0xffd98a).set(0, -1, 0, 0xffd98a).set(0, 1, 0, 0xffd98a);
  return m;
}
const GLINT_EVERY = 1.6; // Sekunden zwischen zwei Funkeln je Stück
const GLINT_TIME = 0.22;

export class Loot {
  constructor(scene, rng) {
    this.now = 0; // absolute Spielzeit in Minuten (vom Spiel gesetzt)
    this.rng = rng;
    this.items = [];
    this.material = createWorldMaterial({ selfLight: 0.55 }); // Beute glimmt nachts
    this.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.meshes = {};
    this.dummy = new THREE.Object3D();
    for (const [res, build] of Object.entries(FINE_MODELS)) {
      const geo = build().toGeometry({ jitter: 0.02, seed: 3, size: FINE });
      const mesh = new THREE.InstancedMesh(geo, res === 'moderkerne' ? this.glow : this.material, MAX);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = res !== 'moderkerne';
      mesh.count = 0;
      scene.add(mesh);
      this.meshes[res] = mesh;
    }
    this.glints = new THREE.InstancedMesh(glintModel().toGeometry({ jitter: 0, ao: false }), this.glow, MAX);
    this.glints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.glints.frustumCulled = false;
    this.glints.count = 0;
    scene.add(this.glints);
    this.time = 0;
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
    if (this.items.length >= MAX * 2.5) this.items.shift();
    const a = this.rng.range(0, Math.PI * 2);
    const s = this.rng.range(0.6, 1.6);
    this.items.push({ res, x, z, y: 0.4, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: this.rng.range(2, 3.2), age: 0, until: this.now + LIFE, flying: false, spin: this.rng.range(0, 6) });
  }

  clear() {
    this.items.length = 0;
  }

  /**
   * @param {number} dt
   * @param {{x:number, z:number}} player
   * @param {number} radius Sammelradius
   * @param {(res:string, x:number, y:number, z:number) => void} onCollect
   * @param {number} now absolute Spielzeit in Minuten (state.absoluteMinute)
   */
  update(dt, player, radius, onCollect, now) {
    this.time += dt;
    this.now = now;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      it.spin += dt * 2.5;
      if (now >= it.until) {
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
    const counts = { schrott: 0, teile: 0, zahnraeder: 0, moderkerne: 0 };
    const d = this.dummy;
    let glints = 0;
    for (const it of this.items) {
      const mesh = this.meshes[it.res];
      const k = counts[it.res];
      if (k >= MAX) continue;
      // Letzte Spielstunde: blinken (schneller zum Schluss)
      const left = it.until - this.now;
      if (left < BLINK && Math.floor(this.time * (left < 12 ? 8 : 4)) % 2 === 0) continue;
      const bob = it.vy === 0 && !it.flying ? 0.08 + Math.sin(it.spin * 1.6) * 0.05 : 0;
      d.position.set(it.x, it.y + bob, it.z);
      d.rotation.set(0, it.res === 'zahnraeder' ? it.spin : it.spin * 0.3, 0);
      const scale = it.res === 'schrott' || it.res === 'teile' ? 1.25 : 1.1;
      d.scale.set(scale, scale, scale);
      d.updateMatrix();
      mesh.setMatrixAt(k, d.matrix);
      counts[it.res]++;
      // Liegende Beute funkelt ab und zu (jedes Stück zu seiner eigenen Zeit)
      const phase = (this.time + it.spin * 0.61) % GLINT_EVERY;
      if (!it.flying && it.vy === 0 && phase < GLINT_TIME && glints < MAX) {
        const grow = Math.sin((phase / GLINT_TIME) * Math.PI);
        d.position.set(it.x + 0.08, it.y + 0.42, it.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(grow, grow, 1);
        d.updateMatrix();
        this.glints.setMatrixAt(glints++, d.matrix);
      }
    }
    for (const [res, mesh] of Object.entries(this.meshes)) {
      mesh.count = counts[res];
      mesh.visible = counts[res] > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.glints.count = glints;
    this.glints.visible = glints > 0;
    this.glints.instanceMatrix.needsUpdate = true;
  }

  /** Zum Speichern (liegt noch Beute herum?). */
  toState() {
    return this.items.filter((it) => !it.flying).map((it) => ({ res: it.res, x: +it.x.toFixed(2), z: +it.z.toFixed(2), until: Math.round(it.until) }));
  }

  /** @param {number} now absolute Spielzeit in Minuten */
  load(entries, now) {
    this.clear();
    this.now = now;
    for (const e of entries || []) {
      if (!MODELS[e.res]) continue;
      const until = Number.isFinite(e.until) ? e.until : now + LIFE;
      if (until <= now) continue; // inzwischen verrottet (z. B. im Schlaf)
      this.items.push({ res: e.res, x: e.x, z: e.z, y: 0.05, vx: 0, vz: 0, vy: 0, age: 1, until, flying: false, spin: this.rng.range(0, 6) });
    }
  }
}
