// Gebaute Dinge auf dem Raster: anlegen, laden, abreißen. Jeder Bau belegt
// Rasterzellen, bekommt eine Kollision und – wenn er etwas kann – eine
// Interaktion (Werkbank: Crafting, Bank: Ausruhen).

import * as THREE from 'three';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { createGlowMaterial } from '../render/materials.js';
import { BUILDINGS, footprint } from '../data/buildings.js';
import { BUILDING_MODELS } from './buildingModels.js';

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
    this.group = new THREE.Group();
    this.group.name = 'Bauten';
    scene.add(this.group);
    this.list = [];
    this.nextId = 1;
    this.glowMaterial = createGlowMaterial(0xffffff);
    lights.addGlow(this.glowMaterial, { dim: 0x6a6f80, bright: 0xffc86a, boost: 1.1, mode: 'lamp' });
    this.models = new Map();
  }

  count(type) {
    return this.list.filter((b) => b.type === type).length;
  }

  get(id) {
    return this.list.find((b) => b.id === id) || null;
  }

  atCell(i, j) {
    const id = this.grid.occupantAt(i, j);
    return id === null ? null : this.get(id);
  }

  /**
   * Prüft, ob ein Bau an (i, j) passt.
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
    return { ok: true };
  }

  /**
   * Voxel-Modell je Art und Drehung (Modelle zwischengespeichert).
   * @param {{material?: THREE.Material, glowMaterial?: THREE.Material, shadow?: string}} [options]
   */
  object(type, turns, options = {}) {
    const key = type;
    if (!this.models.has(key)) {
      const spec = BUILDING_MODELS[type];
      this.models.set(key, { model: spec.model(this.seed), glow: spec.glow ? spec.glow() : null });
    }
    const { model, glow } = this.models.get(key);
    const { material = this.materials.occluder, glowMaterial = this.glowMaterial, shadow = 'full' } = options;
    const group = createStaticVoxelObject(model, material, { turns, seed: this.seed, shadow });
    if (glow) group.add(createStaticVoxelObject(glow, glowMaterial, { turns, shadow: 'none', jitter: 0 }));
    return group;
  }

  /** Bau anlegen. Kosten werden hier nicht abgezogen (macht das Spiel). */
  place(type, i, j, turns = 0, id = null) {
    const def = BUILDINGS[type];
    const { w, d } = footprint(type, turns);
    const building = { id: id ?? this.nextId++, type, i, j, turns };
    this.nextId = Math.max(this.nextId, building.id + 1);
    const cx = i + w / 2;
    const cz = j + d / 2;
    building.object = this.object(type, turns);
    building.object.position.set(cx, 0, cz);
    this.group.add(building.object);
    building.collider = this.colliders.addBox(i + 0.08, j + 0.08, i + w - 0.08, j + d - 0.08, `bau-${building.id}`);
    this.grid.occupy(building.id, i, j, w, d);
    const spec = BUILDING_MODELS[type];
    if (spec.pool) building.pool = this.lightPools.add(cx, cz + 0.3, spec.pool.radius);
    // Werkbank, Bank, Beet: benutzen. Alles andere: mit E auswählen (Abreißen …).
    const radius = 1.1 + Math.max(w, d) * 0.3;
    building.interaction = def.use
      ? { id: `bau-${building.id}`, x: cx, z: cz, radius, prompt: def.use, use: def.use, building: building.id }
      : { id: `bau-${building.id}`, x: cx, z: cz, radius: radius - 0.2, prompt: 'auswaehlen', select: building.id };
    this.list.push(building);
    return building;
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
    return this.list.map(({ id, type, i, j, turns, day }) => (day ? { id, type, i, j, turns, day } : { id, type, i, j, turns }));
  }

  load(entries) {
    for (const b of [...this.list]) this.remove(b.id);
    for (const e of entries) {
      if (!BUILDINGS[e.type]) continue;
      const { w, d } = footprint(e.type, e.turns);
      if (!this.grid.canPlace(e.i, e.j, w, d)) continue;
      const b = this.place(e.type, e.i, e.j, e.turns, e.id);
      if (e.day) b.day = e.day;
    }
  }
}
