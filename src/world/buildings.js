// Gebaute Dinge auf dem Raster: anlegen, laden, ausbauen, abreißen. Jeder Bau
// belegt Rasterzellen, bekommt eine Kollision und eine Interaktion (benutzen
// oder mit E auswählen). Türme haben Stufe, Spezialisierung, Haltbarkeit und
// einen Kopf, der sich zum Ziel dreht. Nach jeder Änderung rechnet die Horde
// ihre Wege neu (pathing.rebuild).

import * as THREE from 'three';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { createGlowMaterial } from '../render/materials.js';
import { BUILDINGS, footprint } from '../data/buildings.js';
import { towerStats } from '../data/towers.js';
import { BUILDING_MODELS } from './buildingModels.js';
import { fineTowerModels } from './towerModels.js';
import { V } from './layout.js';

export class Buildings {
  /**
   * @param {object} deps scene, grid, colliders, materials, lightPools, lights (WarmLights), seed
   */
  constructor({ scene, grid, colliders, materials, lightPools, lights, seed }) {
    this.grid = grid;
    this.colliders = colliders;
    this.materials = materials;
    this.lightPools = lightPools;
    this.lights = lights;
    this.seed = seed;
    this.pathing = null; // wird von der Welt gesetzt
    this.group = new THREE.Group();
    this.group.name = 'Bauten';
    scene.add(this.group);
    this.list = [];
    this.nextId = 1;
    this.glowMaterial = createGlowMaterial(0xffffff);
    lights.addGlow(this.glowMaterial, { dim: 0x6a6f80, bright: 0xffc86a, boost: 1.1, mode: 'lamp' });
    this.models = new Map();
    this.checkCache = { key: '', result: null };
  }

  count(type) {
    let n = 0;
    for (const b of this.list) if (b.type === type) n++;
    return n;
  }

  get(id) {
    return this.list.find((b) => b.id === id) || null;
  }

  atCell(i, j) {
    const id = this.grid.occupantAt(i, j);
    return id === null ? null : this.get(id);
  }

  get towers() {
    return this.list.filter((b) => BUILDINGS[b.type].tower);
  }

  /**
   * Prüft, ob ein Bau an (i, j) passt – auch, ob er der Horde den letzten Weg
   * zum Zuhause abschneiden würde (Ergebnis zwischengespeichert).
   * @returns {{ok:boolean, reason?:string}}
   */
  check(type, i, j, turns, blockers = []) {
    const def = BUILDINGS[type];
    if (def.max && this.count(type) >= def.max) return { ok: false, reason: 'max' };
    const { w, d } = footprint(type, turns);
    if (!this.grid.canPlace(i, j, w, d)) return { ok: false, reason: 'belegt' };
    for (const b of blockers) {
      if (b.x + b.r > i && b.x - b.r < i + w && b.z + b.r > j && b.z - b.r < j + d) return { ok: false, reason: 'figur' };
    }
    if (this.pathing) {
      const key = `${i}|${j}|${w}|${d}|${this.pathing.version}`;
      if (this.checkCache.key !== key) {
        this.checkCache = { key, result: this.pathing.wouldBlock(this.grid.cells(i, j, w, d)) };
      }
      if (this.checkCache.result) return { ok: false, reason: 'weg' };
    }
    return { ok: true };
  }

  /**
   * Darstellung eines Baus (Modelle zwischengespeichert). Türme bekommen einen
   * drehbaren Kopf (`userData.head`).
   * @param {{material?: THREE.Material, glowMaterial?: THREE.Material, shadow?: string, level?: number, spec?: string|null}} [options]
   */
  object(type, turns, options = {}) {
    const { material = this.materials.building || this.materials.occluder, glowMaterial = this.glowMaterial, shadow = 'full', level = 1, spec = null } = options;
    if (BUILDINGS[type].tower) return this.towerObject(type, level, spec, material, glowMaterial, shadow);
    const key = type;
    if (!this.models.has(key)) {
      const s = BUILDING_MODELS[type];
      this.models.set(key, { model: s.model(this.seed), glow: s.glow ? s.glow() : null });
    }
    const { model, glow } = this.models.get(key);
    const group = createStaticVoxelObject(model, material, { turns, seed: this.seed, shadow });
    if (glow) group.add(createStaticVoxelObject(glow, glowMaterial, { turns, shadow: 'none', jitter: 0 }));
    return group;
  }

  towerObject(type, level, spec, material, glowMaterial, shadow) {
    const key = `${type}|${level}|${spec}`;
    if (!this.models.has(key)) this.models.set(key, fineTowerModels(type, level, spec, this.seed));
    const m = this.models.get(key);
    const U = m.unit || V;
    const group = createStaticVoxelObject(m.base, material, { seed: this.seed, shadow, size: U });
    const head = new THREE.Group();
    head.rotation.order = 'YXZ'; // erst zielen (y), dann nicken (Wurfarm)
    head.position.y = m.headY * U;
    const headMesh = new THREE.Mesh(m.head.toGeometry({ jitter: 0.03, seed: this.seed, size: U }), material);
    headMesh.castShadow = shadow !== 'none';
    headMesh.receiveShadow = true;
    head.add(headMesh);
    group.add(head);
    if (m.glow) {
      const glow = new THREE.Mesh(m.glow.toGeometry({ jitter: 0, ao: false, size: U }), glowMaterial);
      if (m.glowOnHead) head.add(glow);
      else group.add(glow);
    }
    group.userData.head = head;
    return group;
  }

  /** Bau anlegen. Kosten werden hier nicht abgezogen (macht das Spiel). */
  place(type, i, j, turns = 0, id = null, extra = {}) {
    const def = BUILDINGS[type];
    const { w, d } = footprint(type, turns);
    const building = { id: id ?? this.nextId++, type, i, j, turns };
    this.nextId = Math.max(this.nextId, building.id + 1);
    if (def.tower) {
      building.level = extra.level || 1;
      building.spec = extra.spec || null;
    }
    if (def.hp) building.hp = Math.min(def.hp, extra.hp ?? def.hp);
    const cx = i + w / 2;
    const cz = j + d / 2;
    this.attachObject(building);
    // Türme sind rund: schräg zwischen zwei Türmen bleibt ein Durchschlupf (m3-r1: Engstellen)
    building.collider =
      def.tower && w === 1 && d === 1
        ? this.colliders.addCircle(cx, cz, 0.36, `bau-${building.id}`)
        : this.colliders.addBox(i + 0.08, j + 0.08, i + w - 0.08, j + d - 0.08, `bau-${building.id}`);
    this.grid.occupy(building.id, i, j, w, d);
    const radius = 1.1 + Math.max(w, d) * 0.3;
    // Werkbank, Bank, Beet: benutzen. Alles andere (auch Türme): mit E auswählen.
    building.interaction = def.use
      ? { id: `bau-${building.id}`, x: cx, z: cz, radius, prompt: def.use, use: def.use, building: building.id }
      : { id: `bau-${building.id}`, x: cx, z: cz, radius: radius - 0.2, prompt: 'auswaehlen', select: building.id };
    this.list.push(building);
    this.pathing?.rebuild();
    return building;
  }

  /** Darstellung (neu) anlegen – nach Bau oder Ausbau. */
  attachObject(b) {
    const { w, d } = footprint(b.type, b.turns);
    const cx = b.i + w / 2;
    const cz = b.j + d / 2;
    if (b.object) {
      this.group.remove(b.object);
      b.object.traverse((o) => o.geometry?.dispose());
    }
    if (b.pool) {
      this.lightPools.remove(b.pool);
      b.pool = null;
    }
    b.object = this.object(b.type, b.turns, { level: b.level, spec: b.spec });
    b.object.position.set(cx, 0, cz);
    b.head = b.object.userData.head || null;
    if (b.head && b.headAngle !== undefined) b.head.rotation.y = b.headAngle;
    this.group.add(b.object);
    const spec = BUILDING_MODELS[b.type];
    if (spec?.pool) b.pool = this.lightPools.add(cx, cz + 0.3, spec.pool.radius);
    if (b.type === 'laternenturm') b.pool = this.lightPools.add(cx, cz, towerStats(b.type, b.level, b.spec).range);
  }

  /** Turm auf eine neue Stufe/Spezialisierung bringen. */
  upgrade(b, level, spec) {
    b.level = level;
    if (spec) b.spec = spec;
    this.attachObject(b);
  }

  remove(id) {
    const index = this.list.findIndex((b) => b.id === id);
    if (index < 0) return null;
    const [building] = this.list.splice(index, 1);
    this.group.remove(building.object);
    building.object.traverse((o) => o.geometry?.dispose());
    this.colliders.remove(building.collider);
    this.grid.release(building.id);
    if (building.pool) this.lightPools.remove(building.pool);
    this.pathing?.rebuild();
    return building;
  }

  get interactions() {
    return this.list.map((b) => b.interaction);
  }

  /** Mittelpunkt und Grundriss eines Baus in Weltkoordinaten. */
  bounds(building) {
    const { w, d } = footprint(building.type, building.turns);
    return { i: building.i, j: building.j, w, d, x: building.i + w / 2, z: building.j + d / 2 };
  }

  toState() {
    return this.list.map((b) => {
      const e = { id: b.id, type: b.type, i: b.i, j: b.j, turns: b.turns };
      if (b.day) e.day = b.day;
      if (b.level) e.level = b.level;
      if (b.spec) e.spec = b.spec;
      if (b.hp !== undefined && b.hp < BUILDINGS[b.type].hp) e.hp = Math.round(b.hp);
      return e;
    });
  }

  load(entries) {
    const pathing = this.pathing;
    this.pathing = null; // erst am Ende einmal neu rechnen
    for (const b of [...this.list]) this.remove(b.id);
    for (const e of entries) {
      if (!BUILDINGS[e.type]) continue;
      const { w, d } = footprint(e.type, e.turns);
      // Ältere Stände dürfen auf heutigen Rohstoff-Zellen stehen (nicht strikt)
      if (!this.grid.canPlace(e.i, e.j, w, d, false)) continue;
      const b = this.place(e.type, e.i, e.j, e.turns, e.id, e);
      if (e.day) b.day = e.day;
    }
    this.pathing = pathing;
    this.pathing?.rebuild();
  }
}
