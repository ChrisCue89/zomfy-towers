// Natur: Bäume, Büsche, Steine, Gras und Blumen als Voxel-Modelle.
// Viele gleiche Modelle werden als InstancedMesh in räumlichen Blöcken
// gezeichnet, damit die Kamera nur die sichtbaren Blöcke rendert.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3, Rng, fbm, valueNoise } from '../core/rng.js';
import { LAYOUT, clearingDistance, distanceToPolyline, snapV } from './layout.js';
import { SHADOW_LAYER, SHADOW_PROXY_MATERIAL, shadowGeometry } from '../render/staticMesh.js';

// --- Modelle ---------------------------------------------------------------

export function buildFir(seed, scale = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const trunkTop = Math.round(6 * scale);
  m.box(-1, 0, -1, 0, trunkTop + 3, 0, (x, y, z) => (hash3(x, y, z, seed) < 0.3 ? P.e3 : P.e2));
  const tiers = [
    [12, 8, 8],
    [10, 6, 8],
    [8, 4, 7],
    [6, 2, 7],
    [3, 0, 5],
  ].map(([r0, r1, h]) => [r0 * scale, r1 * scale, Math.max(3, Math.round(h * scale))]);
  let y = trunkTop;
  for (const [r0, r1, h] of tiers) {
    const wobble = rng.range(-0.6, 0.6);
    for (let k = 0; k < h; k++) {
      const t = h > 1 ? k / (h - 1) : 1;
      const r = Math.max(0.6, r0 + (r1 - r0) * t + (k === 0 ? wobble : 0));
      const yy = y + k;
      for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
        for (let z = Math.floor(-r); z <= Math.ceil(r); z++) {
          const dx = x + 0.5;
          const dz = z + 0.5;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d > r) continue;
          const hsh = hash3(x, yy, z, seed);
          // Ausgefranster Rand
          if (d > r - 1 && hsh < 0.28) continue;
          let c = t < 0.3 ? P.t1 : t < 0.7 ? P.t2 : P.t3;
          if (d > r - 1.5 && t > 0.5) c = P.t3;
          if (hsh > 0.9) c = P.t4;
          else if (hsh < 0.08) c = P.t0;
          m.set(x, yy, z, c);
        }
      }
    }
    y += h - 3;
  }
  m.box(-1, y + 2, -1, 0, y + 3, 0, P.t3);
  return m;
}

export function buildDeciduous(seed, scale = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const trunkH = Math.round(11 * scale);
  // Stamm mit Wurzelansatz
  m.box(-1, 0, -1, 1, trunkH, 1, (x, y, z) => (hash3(x, y, z, seed) < 0.25 ? P.e3 : P.e2));
  m.set(-2, 0, 0, P.e2).set(2, 0, -1, P.e2).set(0, 0, 2, P.e3).set(-1, 0, -2, P.e2);
  // Äste
  m.line(0, trunkH - 3, 0, -5, trunkH + 2, 1, P.e2);
  m.line(0, trunkH - 2, 0, 5, trunkH + 3, -2, P.e2);
  // Krone aus mehreren Blobs
  const cy = trunkH + 7 * scale;
  const blobs = [
    [0, cy, 0, 10, 7.5, 10],
    [rng.range(-7, -5), cy - 2, rng.range(-3, 3), 7, 6, 7],
    [rng.range(5, 7), cy - 1, rng.range(-3, 3), 7, 6, 7],
    [rng.range(-2, 2), cy + 4, rng.range(-2, 3), 7, 5, 7],
  ];
  for (const [bx, by, bz, rx, ry, rz] of blobs) {
    m.ellipsoid(bx, by, bz, rx * scale, ry * scale, rz * scale, (x, y, z, dx, dy) => {
      const hsh = hash3(x, y, z, seed + 1);
      const edge = dx * dx + dy * dy > 0.7;
      if (edge && hsh < 0.3) return null;
      let c = dy > 0.45 ? P.g6 : dy > 0 ? P.g5 : dy > -0.45 ? P.g4 : P.g3;
      if (hsh > 0.93) c = dy > 0.2 ? P.g7 : P.g5;
      else if (hsh < 0.06) c = P.g3;
      return c;
    });
  }
  return m;
}

export function buildBirch(seed, scale = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const trunkH = Math.round(20 * scale);
  m.box(-1, 0, -1, 0, trunkH, 0, (x, y, z) => {
    const hsh = hash3(0, y, 0, seed);
    if (hsh < 0.18) return P.s1;
    return hash3(x, y, z, seed) < 0.3 ? P.s8 : P.s9;
  });
  const blobs = [
    [0, trunkH + 1, 0, 6, 5, 6],
    [rng.range(-4, -3), trunkH - 4, rng.range(-2, 2), 4.5, 4, 4.5],
    [rng.range(3, 4), trunkH - 3, rng.range(-2, 2), 4.5, 4, 4.5],
    [0, trunkH + 5, 0, 4, 3.5, 4],
  ];
  for (const [bx, by, bz, rx, ry, rz] of blobs) {
    m.ellipsoid(bx, by, bz, rx * scale, ry * scale, rz * scale, (x, y, z, dx, dy) => {
      const hsh = hash3(x, y, z, seed + 3);
      if (dx * dx + dy * dy > 0.6 && hsh < 0.35) return null;
      let c = dy > 0.3 ? P.g7 : dy > -0.3 ? P.g6 : P.g5;
      if (hsh > 0.9) c = P.g8;
      return c;
    });
  }
  return m;
}

export function buildBush(seed, size = 1, berries = false) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const rx = rng.range(4.5, 6.5) * size;
  const ry = rng.range(3, 4.5) * size;
  const rz = rng.range(4, 5.5) * size;
  m.ellipsoid(0, ry * 0.75, 0, rx, ry, rz, (x, y, z, dx, dy) => {
    const hsh = hash3(x, y, z, seed);
    if (dx * dx + dy * dy > 0.55 && hsh < 0.3) return null;
    if (y < 0) return null;
    let c = dy > 0.35 ? P.g6 : dy > -0.2 ? P.g5 : P.g4;
    if (hsh > 0.92) c = P.g7;
    if (berries && dy > -0.2 && hsh > 0.86 && hsh < 0.9) c = rng.chance(0.5) ? P.r3 : P.a0;
    return c;
  });
  return m;
}

export function buildRock(seed, size = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const rx = rng.range(3, 5) * size;
  const ry = rng.range(2, 3.5) * size;
  const rz = rng.range(2.5, 4) * size;
  m.ellipsoid(0, ry * 0.45, 0, rx, ry, rz, (x, y, z, dx, dy, dz) => {
    if (y < 0) return null;
    const hsh = hash3(x, y, z, seed);
    const n = valueNoise(x * 0.4, z * 0.4 + y * 0.3, seed);
    if (dx * dx + dz * dz > 0.8 && hsh < 0.25) return null;
    let c = n < 0.35 ? P.s4 : n < 0.7 ? P.s5 : P.s6;
    if (dy > 0.5 && n > 0.45) c = hsh < 0.5 ? P.g4 : P.g5; // Moos
    if (hsh > 0.95) c = P.s7;
    return c;
  });
  return m;
}

function buildTuft(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const blades = rng.int(2, 4);
  for (let i = 0; i < blades; i++) {
    const x = rng.int(-1, 1);
    const z = rng.int(-1, 0);
    const h = rng.chance(0.25) ? 2 : 1;
    for (let y = 0; y < h; y++) m.set(x, y, z, y === h - 1 && rng.chance(0.4) ? P.g7 : P.g6);
  }
  return m;
}

function buildFlower(seed, blossom) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const stems = rng.int(1, 3);
  m.set(0, 0, 0, P.g5).set(1, 0, 0, P.g4);
  for (let i = 0; i < stems; i++) {
    const x = i === 0 ? 0 : rng.int(-1, 1);
    const z = i === 0 ? 0 : rng.int(-1, 1);
    const h = rng.int(1, 2);
    for (let y = 0; y < h; y++) m.set(x, y, z, P.g4);
    m.set(x, h, z, blossom);
  }
  return m;
}

function buildMushroom(seed) {
  const m = new VoxelModel();
  m.set(0, 0, 0, P.s8);
  m.box(-1, 1, -1, 0, 1, 0, (x, y, z) => (hash3(x, y, z, seed) < 0.3 ? P.a4 : P.r3));
  return m;
}

// --- Verteilen und Instanzen -------------------------------------------------

const CHUNK = 12;

/**
 * Sammelt Instanzen je Modell, Drehung und räumlichem Block und baut daraus
 * InstancedMeshes: sichtbare Flächen für die Kamera, grobe Stellvertreter für
 * den Schattenpass.
 */
export class InstanceScatter {
  constructor(seed = 3) {
    this.seed = seed;
    this.models = new Map();
    this.buckets = new Map();
  }

  /**
   * @param {string} name
   * @param {VoxelModel} model
   * @param {THREE.Material} material
   * @param {{shadow?: 'coarse'|'full'|'none', jitter?: number}} [options]
   */
  addModel(name, model, material, { shadow = 'coarse', jitter = 0.05 } = {}) {
    this.models.set(name, { model, material, shadow, jitter, visuals: new Map(), proxy: null });
  }

  visualGeometry(entry, turns) {
    if (!entry.visuals.has(turns)) {
      const rotated = turns ? entry.model.rotated(turns) : entry.model;
      entry.visuals.set(turns, rotated.toGeometry({ jitter: entry.jitter, seed: this.seed, visibleOnly: true }));
    }
    return entry.visuals.get(turns);
  }

  proxyGeometry(entry) {
    if (!entry.proxy) entry.proxy = shadowGeometry(entry.model, entry.shadow);
    return entry.proxy;
  }

  place(name, x, z, turns = 0) {
    const t = ((turns % 4) + 4) % 4;
    const key = `${name}|${t}|${Math.floor(x / CHUNK)}|${Math.floor(z / CHUNK)}`;
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push([x, z]);
  }

  build() {
    const group = new THREE.Group();
    group.name = 'Natur';
    let instances = 0;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    for (const [key, spots] of this.buckets) {
      const [name, turnsText] = key.split('|');
      const turns = Number(turnsText);
      const entry = this.models.get(name);
      const visual = new THREE.InstancedMesh(this.visualGeometry(entry, turns), entry.material, spots.length);
      spots.forEach(([x, z], i) => visual.setMatrixAt(i, m.makeTranslation(x, 0, z)));
      visual.instanceMatrix.needsUpdate = true;
      visual.computeBoundingSphere();
      visual.castShadow = false;
      visual.receiveShadow = true;
      visual.name = key;
      group.add(visual);
      if (entry.shadow !== 'none') {
        const proxy = new THREE.InstancedMesh(this.proxyGeometry(entry), SHADOW_PROXY_MATERIAL, spots.length);
        q.setFromAxisAngle(up, (turns * Math.PI) / 2);
        spots.forEach(([x, z], i) => proxy.setMatrixAt(i, m.compose(pos.set(x, 0, z), q, one)));
        proxy.instanceMatrix.needsUpdate = true;
        proxy.computeBoundingSphere();
        proxy.castShadow = true;
        proxy.receiveShadow = false;
        proxy.layers.set(SHADOW_LAYER);
        proxy.name = `${key}|schatten`;
        group.add(proxy);
      }
      instances += spots.length;
    }
    return { group, instances };
  }
}

/**
 * Wald rund um die Lichtung, Bäume und Büsche am Rand, Gras und Blumen.
 * @returns {{ group: THREE.Group, stats: object }}
 */
export function createNature({ seed, materials, colliders, blockers }) {
  const rng = new Rng(seed ^ 0x5eed);
  const scatter = new InstanceScatter(seed);
  const { occluder, world } = materials;

  const firs = [buildFir(seed + 1, 1.0), buildFir(seed + 2, 1.15), buildFir(seed + 3, 0.85)];
  const oaks = [buildDeciduous(seed + 11, 1.0), buildDeciduous(seed + 12, 0.9), buildDeciduous(seed + 13, 1.1)];
  const birches = [buildBirch(seed + 21, 1.0), buildBirch(seed + 22, 0.85)];
  const bushes = [buildBush(seed + 31, 1.0), buildBush(seed + 32, 1.2, true), buildBush(seed + 33, 0.8), buildBush(seed + 34, 1.0, true)];
  const rocks = [buildRock(seed + 41, 1.0), buildRock(seed + 42, 0.6), buildRock(seed + 43, 1.4), buildRock(seed + 44, 0.8)];
  const tufts = [0, 1, 2, 3, 4, 5].map((i) => buildTuft(seed + 51 + i));
  const flowerColors = [P.a4, P.f6, P.a1, P.a3, P.a4];
  const flowers = flowerColors.map((c, i) => buildFlower(seed + 61 + i, c));
  const mushrooms = [buildMushroom(seed + 71), buildMushroom(seed + 72)];

  firs.forEach((m, i) => scatter.addModel(`fir${i}`, m, occluder));
  oaks.forEach((m, i) => scatter.addModel(`oak${i}`, m, occluder));
  birches.forEach((m, i) => scatter.addModel(`birch${i}`, m, occluder));
  bushes.forEach((m, i) => scatter.addModel(`bush${i}`, m, occluder));
  rocks.forEach((m, i) => scatter.addModel(`rock${i}`, m, world));
  tufts.forEach((m, i) => scatter.addModel(`tuft${i}`, m, world, { shadow: 'none', jitter: 0.03 }));
  flowers.forEach((m, i) => scatter.addModel(`flower${i}`, m, world, { shadow: 'none', jitter: 0 }));
  mushrooms.forEach((m, i) => scatter.addModel(`mushroom${i}`, m, world, { shadow: 'none' }));

  const { z0: roadZ0, z1: roadZ1 } = LAYOUT.road;
  const onRoad = (z, margin = 0.4) => z > roadZ0 - margin && z < roadZ1 + margin;
  const blocked = (x, z, r) =>
    colliders.blocks(x, z, r) || blockers.some((b) => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r);

  // --- Waldgürtel ---
  const spacing = 2.3;
  let trees = 0;
  for (let gz = -28; gz <= 32; gz += spacing) {
    for (let gx = -32; gx <= 32; gx += spacing) {
      const x = snapV(gx + rng.range(-0.8, 0.8));
      const z = snapV(gz + rng.range(-0.8, 0.8));
      const e = clearingDistance(x, z);
      if (e < 1.07 || e > 1.95) continue;
      if (onRoad(z, 0.9)) continue;
      const turns = rng.int(0, 3);
      // Südlich der Straße nur niedriger Bewuchs, damit hohe Kronen nichts verdecken.
      if (z > roadZ1 && z < 17.5) {
        if (rng.chance(0.75)) scatter.place(`bush${rng.int(0, 3)}`, x, z, turns);
        continue;
      }
      const roll = rng.next();
      const nearEdge = e < 1.3;
      let name;
      if (roll < (nearEdge ? 0.35 : 0.55)) name = `fir${rng.int(0, 2)}`;
      else if (roll < (nearEdge ? 0.75 : 0.85)) name = `oak${rng.int(0, 2)}`;
      else name = `birch${rng.int(0, 1)}`;
      scatter.place(name, x, z, turns);
      trees++;
      if (e < 1.2) colliders.addCircle(x, z, 0.35);
      if (rng.chance(0.25)) scatter.place(`mushroom${rng.int(0, 1)}`, snapV(x + rng.range(-1.2, 1.2)), snapV(z + rng.range(0.6, 1.4)), rng.int(0, 3));
    }
  }

  // --- Büsche als weicher Saum ---
  let bushesPlaced = 0;
  for (let a = 0; a < Math.PI * 2; a += 0.075) {
    const { cx, cz, rx, rz } = LAYOUT.clearing;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // Punkt auf der Superellipse
    const k = Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s), 4), -1 / 4);
    const f = rng.range(0.97, 1.06);
    const x = snapV(cx + c * k * rx * f);
    const z = snapV(cz + s * k * rz * f);
    if (onRoad(z, 0.6)) continue;
    if (rng.chance(0.25)) continue;
    scatter.place(`bush${rng.int(0, 3)}`, x, z, rng.int(0, 3));
    colliders.addCircle(x, z, 0.55);
    bushesPlaced++;
  }

  // --- Gras und Blumen ---
  let tuftsPlaced = 0;
  let flowersPlaced = 0;
  for (let i = 0; i < 2600; i++) {
    const x = snapV(rng.range(-17, 17));
    const z = snapV(rng.range(-13, 14));
    const e = clearingDistance(x, z);
    if (e > 1.02) continue;
    const density = fbm(x * 0.22, z * 0.22, 2, seed + 99);
    const dPath = distanceToPolyline(x, z, LAYOUT.path);
    const dSide = distanceToPolyline(x, z, LAYOUT.sidePath);
    if (dPath < 0.75 || dSide < 0.5) continue;
    if (Math.hypot(x - LAYOUT.campfire.x, z - LAYOUT.campfire.z) < 2.2) continue;
    if (blocked(x, z, 0.3)) continue;
    const road = onRoad(z, 0);
    if (road && rng.chance(0.85)) continue;
    const flowerPatch = valueNoise(x * 0.3, z * 0.3, seed + 5) > 0.68;
    if (flowerPatch && rng.chance(0.3)) {
      scatter.place(`flower${rng.int(0, flowers.length - 1)}`, x, z, rng.int(0, 3));
      flowersPlaced++;
    } else if (rng.next() < (density - 0.3) * 1.1) {
      scatter.place(`tuft${rng.int(0, tufts.length - 1)}`, x, z, rng.int(0, 3));
      tuftsPlaced++;
    }
  }

  const { group, instances } = scatter.build();
  return { group, stats: { trees, bushes: bushesPlaced, tufts: tuftsPlaced, flowers: flowersPlaced, instances } };
}

