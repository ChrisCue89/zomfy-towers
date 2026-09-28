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
import { shade } from '../world/voxelKit.js';
import { CHEST_REACH } from '../data/champions.js';

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

// --- Doppelt fein (1/32 m, M13g; vorher 1/16 m seit Meilenstein 5) -------------------

const FINE32 = 1 / 32;

/** Schrottbrocken: verbogenes Blech mit aufgebogener Kante, Nieten und Rostflecken. */
function scrap32() {
  const m = new VoxelModel();
  m.box(-6, 0, -6, 5, 1, 5, (x, y, z) => (y === 0 ? P.s4 : (x + z) % 5 === 0 ? P.s6 : (x - z) % 7 === 0 ? P.s4 : P.s5));
  m.box(-5, 2, -5, 2, 3, 0, (x, y, z) => (y === 3 && x === -5 ? P.s8 : y === 3 ? P.s7 : P.s6)); // aufgebogene Platte
  m.box(-3, 4, -4, 1, 4, -3, P.s8); // blanke Kante
  for (const [x, z] of [[-4, 3], [3, -4], [4, 3]]) m.box(x, 2, z, x + 1, 2, z + 1, (xx, y, zz) => ((xx + zz) % 2 ? P.r3 : P.r4)); // Rost
  for (const [x, y, z] of [[-4, 4, -1], [1, 4, -4], [3, 2, 1], [-5, 2, 4]]) m.set(x, y, z, P.s9); // Nieten
  return m;
}

/** Zahnrad: Kranz mit acht Zähnen, Speichen, Nabe mit Loch – aufrecht, goldgelb, zwei Voxel stark. */
function gear32() {
  const m = new VoxelModel();
  for (let x = -11; x <= 10; x++) {
    for (let y = -11; y <= 10; y++) {
      const r = Math.hypot(x + 0.5, y + 0.5);
      const a = Math.atan2(y + 0.5, x + 0.5);
      const tooth = Math.cos(a * 8) > 0.35;
      const spoke = Math.cos(a * 4) > 0.92 && r < 5.2;
      let c = null;
      if ((r >= 5.0 && r <= 7.4) || (tooth && r > 7.4 && r <= 10.4)) c = r > 7.4 ? P.f5 : r > 6.6 ? P.f6 : P.f5;
      else if (spoke || (r < 3.4 && r >= 1.6)) c = P.f4;
      if (!c) continue;
      m.set(x, y + 11, 0, x + y < -6 && r > 5 ? P.f7 : c).set(x, y + 11, 1, shade(c, -1));
    }
  }
  return m;
}

/** Moderkern: leuchtender, facettierter Klumpen mit hellem Kern. */
function core32() {
  const m = new VoxelModel();
  m.ellipsoid(0, 6, 0, 6.4, 6.4, 6.4, (x, y, z, dx, dy) => {
    if (Math.abs(x + 0.5) < 1 && Math.abs(z + 0.5) < 1) return 0xf2e4ff;
    const facet = (Math.floor((x + 8) / 3) + Math.floor(y / 3) + Math.floor((z + 8) / 3)) % 3;
    if (dy > 0.6) return 0xd8b8ff;
    return facet === 0 ? 0xd8b8ff : facet === 1 ? 0xa88fd0 : 0x7b5aa6;
  });
  return m;
}

/**
 * Zombieteil (Meilenstein 8): eine grünlich-graue Hand, flach auf dem Boden,
 * mit Fingergliedern, dunklen Nägeln, Ärmelrest und Moosfleck mit Blümchen –
 * kein Blut, eher traurig als eklig.
 */
function part32() {
  const m = new VoxelModel();
  m.box(-6, 0, -4, 5, 3, 5, (x, y, z) => (y === 0 ? P.t2 : y === 3 && (x + z) % 5 === 0 ? P.t3 : P.t4)); // Handrücken
  for (const [fx, len] of [[-6, 11], [-2, 12], [2, 11]]) {
    m.box(fx, 0, 6, fx + 2, 2, len, (x, y, z) => (z === len ? (y === 2 ? P.n2 : P.t2) : y === 0 ? P.t2 : z === 8 ? P.t3 : P.t4));
  }
  m.box(6, 0, 0, 9, 2, 3, (x, y, z) => (x === 9 && y === 2 ? P.n2 : y === 0 ? P.t2 : P.t4)); // Daumen zur Seite
  m.box(-4, 4, -2, -1, 4, 1, (x, y, z) => ((x + z) % 2 ? P.g5 : P.g4)).set(-3, 5, -1, P.g6).set(-2, 5, 0, P.a4).set(-2, 6, 0, P.f6); // Moos mit Blümchen
  m.box(-6, 0, -8, 5, 4, -5, (x, y, z) => (y === 4 && (x + z) % 2 ? null : (x + y) % 2 ? P.b2 : P.b1)); // Ärmelrest
  return m;
}

/**
 * Fundkiste (M21): Holzkiste mit Messingbeschlägen, gewölbtem Deckel und Schloss –
 * die Beute eines Champions. Sie fliegt nicht zu Mika, sie platzt auf, wenn Mika davorsteht.
 */
function chest32() {
  const m = new VoxelModel();
  const band = (x) => x === -7 || x === 6 || x === -3 || x === 2; // Beschläge
  m.box(-7, 0, -5, 6, 6, 4, (x, y) => (band(x) ? (y === 6 ? P.f6 : P.f5) : y === 0 ? P.e2 : y === 3 ? P.e4 : (x + y) % 5 === 0 ? P.e5 : P.e6));
  m.box(-7, 7, -5, 6, 8, 4, (x, y) => (band(x) ? P.f6 : y === 8 ? P.e7 : P.e6)); // Deckel
  m.box(-7, 9, -3, 6, 9, 2, (x) => (band(x) ? P.f7 : P.e7)); // Wölbung
  m.box(-1, 4, 5, 0, 7, 5, P.f6).set(-1, 5, 5, P.e1).set(0, 5, 5, P.e1); // Schloss vorn
  m.set(-7, 9, -3, P.f8).set(2, 9, -3, P.f8); // Glanzpunkte
  return m;
}

/** Grobe Variante (Stand vor Meilenstein 5): nur noch zum Laden alter Stände nötig. */
function partModel() {
  const m = new VoxelModel();
  m.box(-1, 0, -1, 1, 0, 1, P.t4);
  m.set(0, 0, 2, P.t3).set(-1, 0, 2, P.t3);
  return m;
}

const MODELS = { schrott: scrapModel, teile: partModel, zahnraeder: gearModel, moderkerne: coreModel, kiste: chest32 };
const FINE32_MODELS = { schrott: scrap32, teile: part32, zahnraeder: gear32, moderkerne: core32, kiste: chest32 };

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
    for (const [res, build] of Object.entries(FINE32_MODELS)) {
      const geo = build().toGeometry({ jitter: 0.02, seed: 3, size: FINE32 });
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
  /** @returns {Record<string, number>} wie viel je Sorte gefallen ist */
  drop(x, z, table, factor = 1) {
    const out = {};
    for (const [res, spec] of Object.entries(table)) {
      let n = Array.isArray(spec) ? this.rng.int(spec[0], spec[1]) : this.rng.chance(spec) ? 1 : 0;
      n *= factor;
      // Bruchteile als Wahrscheinlichkeit
      const whole = Math.floor(n) + (this.rng.chance(n - Math.floor(n)) ? 1 : 0);
      for (let k = 0; k < whole; k++) this.spawn(res, x, z);
      out[res] = whole;
    }
    return out;
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
      // Fundkiste (M21): fliegt nicht, platzt auf, wenn Mika davorsteht
      if (it.res === 'kiste') {
        if (it.age > 0.6 && d < CHEST_REACH && it.y <= 0.05) {
          this.items.splice(i, 1);
          onCollect(it.res, it.x, it.y, it.z);
          continue;
        }
      } else if (!it.flying && it.age > 0.35 && d < radius) it.flying = true;
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
    const counts = { schrott: 0, teile: 0, zahnraeder: 0, moderkerne: 0, kiste: 0 };
    const d = this.dummy;
    let glints = 0;
    for (const it of this.items) {
      const mesh = this.meshes[it.res];
      const k = counts[it.res];
      if (k >= MAX) continue;
      // Letzte Spielstunde: blinken (schneller zum Schluss)
      const left = it.until - this.now;
      if (left < BLINK && Math.floor(this.time * (left < 12 ? 8 : 4)) % 2 === 0) continue;
      const chest = it.res === 'kiste'; // steht still auf dem Boden, gerade ausgerichtet
      const bob = it.vy === 0 && !it.flying && !chest ? 0.08 + Math.sin(it.spin * 1.6) * 0.05 : 0;
      d.position.set(it.x, it.y + bob, it.z);
      d.rotation.set(0, chest ? 0 : it.res === 'zahnraeder' ? it.spin : it.spin * 0.3, 0);
      const scale = chest ? 1.35 : it.res === 'schrott' || it.res === 'teile' ? 1.25 : 1.1; // die Kiste soll auffallen
      d.scale.set(scale, scale, scale);
      d.updateMatrix();
      mesh.setMatrixAt(k, d.matrix);
      counts[it.res]++;
      // Liegende Beute funkelt ab und zu (jedes Stück zu seiner eigenen Zeit)
      const phase = (this.time + it.spin * 0.61) % GLINT_EVERY;
      if (!it.flying && it.vy === 0 && phase < GLINT_TIME && glints < MAX) {
        const grow = Math.sin((phase / GLINT_TIME) * Math.PI) * (chest ? 1.6 : 1);
        d.position.set(it.x + (chest ? 0.22 : 0.08), it.y + (chest ? 0.62 : 0.42), it.z);
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
