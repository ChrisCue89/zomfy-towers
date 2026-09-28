// Natur: Bäume, Büsche, Steine, Gras und Blumen als Voxel-Modelle – im
// Herbst (Meilenstein 9): Laub in Orange, Rot und Gelb, dazwischen dunkle
// Tannen. Der Wald wächst dort, wo die Karte nicht begehbar ist; am Saum
// stehen Büsche, auf Wiese und Hof Gras. Viele gleiche Modelle werden als
// InstancedMesh in räumlichen Blöcken gezeichnet, damit die Kamera nur die
// sichtbaren Blöcke rendert.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3, Rng, fbm, valueNoise } from '../core/rng.js';
import { LAYOUT, snapV } from './layout.js';
import { MAP, ISLANDS, BAY, shoreX } from './map.js';

/** Laubfarben (dunkel → hell) für Kronen. */
export const LEAVES = {
  gruen: [P.g3, P.g4, P.g5, P.g6, P.g7],
  orange: [P.r2, P.f2, P.f3, P.f4, P.f5],
  rot: [P.r0, P.r1, P.r2, P.r3, P.f3],
  gelb: [P.e6, P.e7, P.f5, P.f6, P.f7],
};
import { SHADOW_LAYER, SHADOW_PROXY_MATERIAL, shadowGeometry } from '../render/staticMesh.js';
import { FINE, shade } from './voxelKit.js';

// --- Modelle ---------------------------------------------------------------

/**
 * Tanne im feinen Maß (M13): runder Stamm, fünf Etagen aus Zweiglagen mit
 * hängenden Spitzen am Saum, heller Wipfel. Maße wie vorher (Koordinaten ×2).
 */
export function buildFir(seed, scale = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const trunkTop = Math.round(12 * scale);
  m.cylinder(0, 0, 0, trunkTop + 6, 1.9, (x, y, z) => (hash3(x, y, z, seed) < 0.3 ? P.e3 : x < 0 ? P.e3 : P.e2));
  const tiers = [
    [24, 16, 16],
    [20, 12, 16],
    [16, 8, 14],
    [12, 4, 14],
    [6, 0, 10],
  ].map(([r0, r1, h]) => [r0 * scale, r1 * scale, Math.max(6, Math.round(h * scale))]);
  let y = trunkTop;
  for (const [r0, r1, h] of tiers) {
    const wobble = rng.range(-1.2, 1.2);
    for (let k = 0; k < h; k++) {
      const t = h > 1 ? k / (h - 1) : 1;
      const r = Math.max(1.2, r0 + (r1 - r0) * t + (k < 2 ? wobble : 0));
      const yy = y + k;
      for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
        for (let z = Math.floor(-r); z <= Math.ceil(r); z++) {
          const d = Math.hypot(x + 0.5, z + 0.5);
          if (d > r) continue;
          const hsh = hash3(x, yy, z, seed);
          if (k === 0 && d > r - 1.5 && hsh < 0.18) continue; // ausgefranster Saum
          let c = t < 0.3 ? P.t1 : t < 0.7 ? P.t2 : P.t3;
          if (d > r - 2.5 && t > 0.4) c = P.t3;
          if ((Math.floor(d) + k) % 5 === 0 && d < r - 2) c = P.t1; // Zweiglagen
          if (hsh > 0.93) c = P.t4;
          else if (hsh < 0.06) c = P.t0;
          m.set(x, yy, z, c);
          // hängende Zweigspitzen unter dem Saum
          if (k === 0 && d > r - 2 && hsh > 0.55) m.set(x, yy - 1, z, hsh > 0.8 ? P.t3 : P.t2);
        }
      }
    }
    y += h - 6;
  }
  m.box(-1, y + 4, -1, 0, y + 8, 0, P.t3);
  m.set(-1, y + 9, -1, P.t4);
  return m;
}

/**
 * Laubbaum im feinen Maß (M13): Stamm mit Rindenfurchen und Wurzelansatz,
 * drei Äste, die Krone aus einem Kern und vielen Laubbüscheln – jedes Büschel
 * oben hell und unten dunkel, die ganze Krone oben heller als unten. So liest
 * sie sich als Blattwerk und nicht als Ball.
 */
export function buildDeciduous(seed, scale = 1, leaves = LEAVES.gruen) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const trunkH = Math.round(22 * scale);
  const bark = (x, y, z) => {
    const a = Math.atan2(z + 0.5, x + 0.5);
    const groove = Math.floor((a / Math.PI) * 7 + 14 + (y % 9 < 4 ? 0.5 : 0)) % 2 === 0;
    if (hash3(x, y, z, seed) > 0.94) return P.e4;
    return groove ? P.e2 : x < 0 ? P.e4 : P.e3;
  };
  m.cylinder(0, 0, 0, trunkH, 2.7, bark);
  m.cylinder(0, 0, 0, 1, 3.6, (x, y) => (y === 1 ? P.e3 : P.e2)); // Wurzelhals
  for (const [dx, dz] of [[1, 0.3], [-1, -0.2], [0.2, 1], [-0.3, -1]]) m.line(0, 0, 0, Math.round(dx * 5), 0, Math.round(dz * 5), P.e2, 1);
  // Äste
  m.line(0, trunkH - 6, 0, -10, trunkH + 4, 2, P.e2, 1);
  m.line(0, trunkH - 4, 0, 10, trunkH + 6, -4, P.e2, 1);
  m.line(0, trunkH - 2, 0, -2, trunkH + 10, -6, P.e3, 1);
  // Krone: Kern plus Büschel ringsum und obenauf
  const cy = trunkH + 14 * scale;
  const top = cy + 15 * scale;
  const bottom = cy - 13 * scale;
  const clumps = [[0, cy, 0, 16, 12, 16]];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const up = rng.range(-0.3, 0.9);
    const r = rng.range(7, 10);
    clumps.push([Math.cos(a) * 14 * scale, cy + up * 9 * scale, Math.sin(a) * 12 * scale, r, r * 0.8, r]);
  }
  for (let i = 0; i < 3; i++) clumps.push([rng.range(-6, 6) * scale, cy + 10 * scale, rng.range(-5, 5) * scale, rng.range(7, 9), 6, rng.range(7, 9)]);
  for (const [bx, by, bz, rx, ry, rz] of clumps) {
    m.ellipsoid(bx, by, bz, rx * scale, ry * scale, rz * scale, (x, y, z, dx, dy) => {
      const hsh = hash3(x, y, z, seed + 1);
      const global = (y - bottom) / (top - bottom); // 0 unten … 1 oben
      let k = dy > 0.45 ? 3 : dy > -0.05 ? 2 : 1;
      if (global < 0.3) k -= 1;
      else if (global > 0.75 && dy > 0) k += 1;
      if (hsh > 0.95) k += 1;
      else if (hsh < 0.04) k = 0;
      const prev = m.get(x, y, z);
      const c = leaves[Math.max(0, Math.min(4, k))];
      // Wo Büschel sich überlappen, gewinnt das hellere (oben liegende) Laub
      if (prev !== null && leaves.indexOf(prev) > leaves.indexOf(c)) return prev;
      return c;
    });
  }
  return m;
}

/** Birke im feinen Maß (M13): weißer Stamm mit schwarzen Querstrichen, lockere Krone aus goldenen Büscheln. */
export function buildBirch(seed, scale = 1, leaves = [P.g5, P.g6, P.g7, P.g8]) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const trunkH = Math.round(40 * scale);
  m.cylinder(0, 0, 0, trunkH, 1.9, (x, y, z) => {
    const mark = hash3(0, y, 0, seed);
    if (mark < 0.14 && hash3(x, y, z, seed + 2) < 0.8) return P.s1; // Querstriche
    if (y < 3) return P.s5;
    return x < 0 ? P.s9 : P.s8;
  });
  m.line(0, trunkH - 10, 0, -7, trunkH - 2, 1, P.s7);
  m.line(0, trunkH - 8, 0, 7, trunkH - 1, -1, P.s7);
  const cy = trunkH + 2;
  const clumps = [[0, cy, 0, 9, 8, 9]];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const r = rng.range(5, 7);
    clumps.push([Math.cos(a) * 8, cy + rng.range(-6, 9), Math.sin(a) * 7, r, r * 0.85, r]);
  }
  for (const [bx, by, bz, rx, ry, rz] of clumps) {
    m.ellipsoid(bx, by, bz, rx * scale, ry * scale, rz * scale, (x, y, z, dx, dy) => {
      const hsh = hash3(x, y, z, seed + 3);
      if (dx * dx + dy * dy > 0.7 && hsh < 0.15) return null;
      let k = dy > 0.35 ? 2 : dy > -0.2 ? 1 : 0;
      if (y > cy + 6) k += 1;
      if (hsh > 0.93) k += 1;
      const c = leaves[Math.max(0, Math.min(3, k))];
      const prev = m.get(x, y, z);
      if (prev !== null && leaves.indexOf(prev) > leaves.indexOf(c)) return prev;
      return c;
    });
  }
  return m;
}

/** Busch im feinen Maß (M13): ein Hauptbüschel und kleinere obendrauf, Beeren als Tupfen. */
export function buildBush(seed, size = 1, berries = false, leaves = [P.g4, P.g5, P.g6, P.g7]) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const rx = rng.range(9, 13) * size;
  const ry = rng.range(6, 9) * size;
  const rz = rng.range(8, 11) * size;
  const color = (x, y, z, dx, dy) => {
    const hsh = hash3(x, y, z, seed);
    if (y < 0) return null;
    let k = dy > 0.35 ? 2 : dy > -0.2 ? 1 : 0;
    if (valueNoise(x * 0.4, y * 0.4 + z * 0.3, seed + 5) > 0.66) k = Math.min(3, k + 1);
    if (hsh > 0.94) k = 3;
    if (berries && dy > -0.3 && hsh > 0.86 && hsh < 0.9) return hsh < 0.88 ? P.r3 : P.a0;
    return leaves[k];
  };
  m.ellipsoid(0, ry * 0.75, 0, rx, ry, rz, color);
  for (let i = 0; i < 3; i++) {
    const a = rng.range(0, Math.PI * 2);
    m.ellipsoid(Math.cos(a) * rx * 0.45, ry * 1.2, Math.sin(a) * rz * 0.4, rx * 0.45, ry * 0.5, rz * 0.45, color);
  }
  return m;
}

/** Fels im feinen Maß (M13): kantige Bänder aus Grautönen, oben Moos, ein Riss, Flechtenflecken. */
export function buildRock(seed, size = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const rx = rng.range(6, 10) * size;
  const ry = rng.range(4, 7) * size;
  const rz = rng.range(5, 8) * size;
  const crack = rng.range(-rx * 0.4, rx * 0.4);
  m.ellipsoid(0, ry * 0.45, 0, rx, ry, rz, (x, y, z, dx, dy, dz) => {
    if (y < 0) return null;
    const hsh = hash3(x, y, z, seed);
    const n = valueNoise(x * 0.25, z * 0.25 + y * 0.2, seed);
    if (dx * dx + dz * dz > 0.85 && hsh < 0.15) return null;
    let c = n < 0.35 ? P.s4 : n < 0.7 ? P.s5 : P.s6;
    if (dy > 0.3 && x < 0) c = shade(c, 1); // Lichtseite
    if (Math.abs(x - crack - y * 0.3) < 0.6 && dy > -0.2) c = P.s3; // Riss
    if (dy > 0.55 && n > 0.45) c = hsh < 0.5 ? P.g4 : P.g5; // Moos
    if (hsh > 0.97) c = P.e8; // Flechte
    return c;
  });
  return m;
}

function buildTuft(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const blades = rng.int(3, 6);
  for (let i = 0; i < blades; i++) {
    const x = rng.int(-2, 2);
    const z = rng.int(-1, 1);
    const h = rng.int(2, 5);
    const bend = rng.int(-1, 1);
    // Herbst: viele Spitzen schon gelb
    for (let y = 0; y < h; y++) m.set(x + (y >= h - 1 ? bend : 0), y, z, y === h - 1 && rng.chance(0.5) ? (rng.chance(0.5) ? P.e7 : P.g7) : y === 0 ? P.g5 : P.g6);
  }
  return m;
}

function buildFlower(seed, blossom) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const stems = rng.int(1, 3);
  m.set(0, 0, 0, P.g5).set(1, 0, 0, P.g4).set(-1, 0, 1, P.g4);
  for (let i = 0; i < stems; i++) {
    const x = i === 0 ? 0 : rng.int(-2, 2);
    const z = i === 0 ? 0 : rng.int(-2, 1);
    const h = rng.int(2, 4);
    for (let y = 0; y < h; y++) m.set(x, y, z, P.g4);
    m.set(x + 1, 1, z, P.g5); // Blatt
    m.set(x, h, z, P.f6).set(x - 1, h, z, blossom).set(x + 1, h, z, blossom).set(x, h, z + 1, blossom).set(x, h + 1, z, blossom);
  }
  return m;
}

function buildMushroom(seed) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 1, 2, 1, P.s8);
  m.ellipsoid(1, 3, 1, 2.4, 1.4, 2.4, (x, y, z, dx, dy) => (dy < -0.3 ? null : hash3(x, y, z, seed) < 0.2 ? P.a4 : P.r3));
  return m;
}

// --- Herbst (Meilenstein 12): im feinen Maß (1/16 m) -------------------------

/** Schilf mit Rohrkolben: steht im flachen Wasser am Ufer und wiegt sich im Wind. */
function buildReeds(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const stalks = rng.int(7, 11);
  for (let i = 0; i < stalks; i++) {
    const x = rng.int(-5, 5);
    const z = rng.int(-3, 3);
    const h = rng.int(10, 19);
    const bend = rng.int(-1, 1); // die Spitze neigt sich ein wenig
    for (let y = 0; y < h; y++) {
      const dx = y > h * 0.7 ? bend : 0;
      m.set(x + dx, y, z, y < 3 ? P.g3 : y >= h - 4 ? P.e7 : hash3(x, y, z, seed) < 0.3 ? P.e6 : P.g5);
    }
    // Rohrkolben: dunkelbraune Walze unter der Spitze
    if (rng.chance(0.5)) m.box(x + bend, h - 6, z, x + bend + 1, h - 3, z, (xx, yy) => (yy === h - 3 ? P.e3 : P.e2));
  }
  // Schmale Blätter, die schräg abstehen
  for (let i = 0; i < 4; i++) {
    const x = rng.int(-5, 5);
    const z = rng.int(-3, 3);
    const dir = rng.chance(0.5) ? 1 : -1;
    for (let k = 0; k < 7; k++) m.set(x + dir * Math.floor(k / 3), k, z, k > 4 ? P.e7 : P.g4);
  }
  return m;
}

/** Pilzgruppe: Fliegenpilze, Steinpilze oder Pfifferlinge – auf den ersten Blick zu unterscheiden. */
function buildMushroomGroup(seed, kind) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const count = kind === 'pfifferling' ? rng.int(4, 6) : rng.int(2, 3);
  const gap = kind === 'pfifferling' ? 3 : 6;
  const spots = [];
  for (let i = 0; i < count; i++) {
    let x = 0;
    let z = 0;
    for (let tries = 0; tries < 30; tries++) {
      x = rng.int(-5, 4);
      z = rng.int(-4, 3);
      if (!spots.some(([a, b]) => Math.abs(a - x) < gap && Math.abs(b - z) < gap)) break;
    }
    spots.push([x, z]);
    const s = i === 0 ? 1 : rng.range(0.55, 0.85);
    if (kind === 'fliegenpilz') {
      // Weißer Stiel mit Ring, roter Hut mit weißen Tupfen
      const h = Math.round(3 + 2 * s);
      m.box(x, 0, z, x + 1, h, z + 1, (xx, y) => (y === h - 1 ? P.s7 : P.s9));
      const r = 1.6 + 1.3 * s;
      m.ellipsoid(x + 1, h + 1, z + 1, r, 1.1 + 0.8 * s, r, (xx, y, zz, dx, dy) => {
        if (dy < -0.35) return null;
        if (dy < 0.05) return P.s8; // helle Lamellen unter dem Rand
        return hash3(xx, y, zz, seed) < 0.2 ? P.a4 : dy > 0.7 ? P.r4 : P.r3;
      });
    } else if (kind === 'steinpilz') {
      // Dicker heller Stiel, brauner Hut
      const h = Math.round(2 + 2 * s);
      m.cylinder(x + 1, z + 1, 0, h, 1.2 + 0.5 * s, (xx, y) => (y < 2 ? P.e8 : P.e9));
      const r = 1.8 + 1.3 * s;
      m.ellipsoid(x + 1, h + 1, z + 1, r, 1.2 + 0.8 * s, r, (xx, y, zz, dx, dy) => {
        if (dy < -0.35) return null;
        return dy < 0.05 ? P.e8 : dy > 0.6 ? P.e5 : P.e4;
      });
    } else {
      // Pfifferlinge: kleine gelbe Trichter
      const h = Math.round(1 + 2 * s);
      m.box(x, 0, z, x, h, z, P.f6);
      m.box(x - 1, h + 1, z - 1, x + 1, h + 1, z + 1, (xx, y, zz) => (xx === x && zz === z ? P.f5 : P.f6));
    }
  }
  return m;
}

/** Pilzgruppen am Fuß der Bäume in der Bucht (fest, M12). */
const BAY_MUSHROOMS = [
  { x: -6.5, z: -11.25, kind: 1 }, // unter der Eiche
  { x: -1.5, z: -11.5, kind: 0 }, // an der Birke
  { x: -6.0, z: 10.0, kind: 2 }, // am jungen Baum im Süden
  { x: 1.75, z: 10.5, kind: 0 },
];

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
   * @param {{shadow?: 'coarse'|'full'|'none', jitter?: number, size?: number}} [options] size: Voxelgröße (1/16 m für das feine Maß)
   */
  addModel(name, model, material, { shadow = 'coarse', jitter = 0.05, size = 1 / 8 } = {}) {
    this.models.set(name, { model, material, shadow, jitter, size, visuals: new Map(), proxy: null });
  }

  visualGeometry(entry, turns) {
    if (!entry.visuals.has(turns)) {
      const rotated = turns ? entry.model.rotated(turns) : entry.model;
      entry.visuals.set(turns, rotated.toGeometry({ jitter: entry.jitter, seed: this.seed, visibleOnly: true, size: entry.size }));
    }
    return entry.visuals.get(turns);
  }

  proxyGeometry(entry) {
    if (!entry.proxy) entry.proxy = shadowGeometry(entry.model, entry.shadow, entry.size);
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
 * Wald um Wege und Bucht, Büsche am Saum, Felsen, Gras und Blumen.
 * @param {object} o seed, materials, colliders, blockers (Flächen der Requisiten), map, nodes (Rohstoffquellen)
 * @returns {{ group: THREE.Group, stats: object }}
 */
export function createNature({ seed, materials, colliders, blockers, map, nodes = [] }) {
  const rng = new Rng(seed ^ 0x5eed);
  const deco = new Rng(seed ^ 0xa07); // Herbstschmuck (M12): eigener Zufall, der Wald bleibt, wie er war
  const scatter = new InstanceScatter(seed);
  const { occluder, world } = materials;
  const windy = materials.windy || world;

  const firs = [buildFir(seed + 1, 1.0), buildFir(seed + 2, 1.15), buildFir(seed + 3, 0.85)];
  const oaks = [
    buildDeciduous(seed + 11, 1.0, LEAVES.orange),
    buildDeciduous(seed + 12, 0.9, LEAVES.rot),
    buildDeciduous(seed + 13, 1.1, LEAVES.gelb),
    buildDeciduous(seed + 14, 0.95, LEAVES.orange),
    buildDeciduous(seed + 15, 1.05, LEAVES.gruen),
  ];
  const birches = [buildBirch(seed + 21, 1.0, [P.e7, P.f5, P.f6, P.f7]), buildBirch(seed + 22, 0.85, [P.e7, P.f5, P.f6, P.f7])];
  // Niedrige Bäume für den Waldrand südlich von Wegen und Bucht (hohe Kronen verdeckten sonst den Weg)
  const smalls = [buildFir(seed + 4, 0.55), buildDeciduous(seed + 16, 0.55, LEAVES.orange), buildDeciduous(seed + 17, 0.5, LEAVES.gelb)];
  const bushes = [
    buildBush(seed + 31, 1.0),
    buildBush(seed + 32, 1.2, true, [P.r1, P.r2, P.r3, P.f3]),
    buildBush(seed + 33, 0.8, false, [P.e5, P.e6, P.f4, P.f5]),
    buildBush(seed + 34, 1.0, true),
  ];
  // Kein Fels so klein wie ein Kiesel – die grauen Brocken am Rand hielt man für Beute (m12-r1)
  const rocks = [buildRock(seed + 41, 1.0), buildRock(seed + 42, 0.9), buildRock(seed + 43, 1.4), buildRock(seed + 44, 0.8)];
  const tufts = [0, 1, 2, 3, 4, 5].map((i) => buildTuft(seed + 51 + i));
  const flowerColors = [P.a2, P.a3, P.f6, P.a3, P.a1];
  const flowers = flowerColors.map((c, i) => buildFlower(seed + 61 + i, c));
  const mushrooms = [buildMushroom(seed + 71), buildMushroom(seed + 72)];
  // Herbst (M12): Pilzgruppen und Schilf im feinen Maß (seit M13 ist alles fein)
  const groups = ['fliegenpilz', 'steinpilz', 'pfifferling'].flatMap((kind, k) => [buildMushroomGroup(seed + 81 + k * 2, kind), buildMushroomGroup(seed + 82 + k * 2, kind)]);
  const reeds = [0, 1, 2, 3].map((i) => buildReeds(seed + 91 + i));

  // M13: alle Modelle im feinen Maß; Bäume und Büsche werfen grobe Schatten (1/4 m wie vorher)
  const tree = { shadow: 'rough', size: FINE, jitter: 0.04 };
  firs.forEach((m, i) => scatter.addModel(`fir${i}`, m, occluder, tree));
  oaks.forEach((m, i) => scatter.addModel(`oak${i}`, m, occluder, tree));
  birches.forEach((m, i) => scatter.addModel(`birch${i}`, m, occluder, tree));
  smalls.forEach((m, i) => scatter.addModel(`small${i}`, m, occluder, tree));
  bushes.forEach((m, i) => scatter.addModel(`bush${i}`, m, occluder, tree));
  rocks.forEach((m, i) => scatter.addModel(`rock${i}`, m, world, { shadow: 'coarse', size: FINE }));
  tufts.forEach((m, i) => scatter.addModel(`tuft${i}`, m, windy, { shadow: 'none', jitter: 0.03, size: FINE }));
  flowers.forEach((m, i) => scatter.addModel(`flower${i}`, m, windy, { shadow: 'none', jitter: 0, size: FINE }));
  mushrooms.forEach((m, i) => scatter.addModel(`mushroom${i}`, m, world, { shadow: 'none', size: FINE }));
  groups.forEach((m, i) => scatter.addModel(`pilze${i}`, m, world, { shadow: 'none', jitter: 0.03, size: FINE }));
  reeds.forEach((m, i) => scatter.addModel(`schilf${i}`, m, windy, { shadow: 'none', jitter: 0.02, size: FINE }));
  /** Eine Pilzgruppe der Art 0 (Fliegenpilz), 1 (Steinpilz) oder 2 (Pfifferling). */
  const placeMushrooms = (x, z, kind) => scatter.place(`pilze${kind * 2 + deco.int(0, 1)}`, snapV(x), snapV(z), deco.int(0, 3));

  const nearNode = (x, z, r) => nodes.some((n) => (n.x - x) ** 2 + (n.z - z) ** 2 < (r + (n.radius || 0.6)) ** 2);
  const blocked = (x, z, r) =>
    colliders.blocks(x, z, r) || blockers.some((b) => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) || nearNode(x, z, r);
  const land = (x, z) => !map.isWater(x, z) && !map.onDock(x, z, -0.6);
  // Läge eine Krone von hier aus (im Bild nach oben) über Weg oder Begehbarem?
  const covers = (x, z, reach) => {
    for (let dz = 1; dz <= reach; dz += 1) if (map.edgeDistance(x, z - dz) < -0.6 || map.pathDistance(x, z - dz) < 0.3) return true;
    return false;
  };

  // --- Wald: überall, wo die Karte nicht begehbar ist (Wege bleiben frei) ---
  const spacing = 2.2;
  let trees = 0;
  for (let gz = MAP.z0 - 2; gz <= MAP.z1 + 2; gz += spacing) {
    for (let gx = MAP.x0 - 2; gx <= MAP.x1; gx += spacing) {
      const x = snapV(gx + rng.range(-0.8, 0.8));
      const z = snapV(gz + rng.range(-0.8, 0.8));
      if (!land(x, z) || map.onIsland(x, z, -1)) continue;
      const edge = map.edgeDistance(x, z);
      if (edge < 0.55) continue;
      if (map.pathDistance(x, z) < 1.6) continue; // auch im Wald am Spawn bleibt der Weg frei
      if (blocked(x, z, 0.4)) continue;
      const turns = rng.int(0, 1) * 2; // zwei Drehungen reichen (weniger Zeichenaufrufe)
      if (covers(x, z, 5.5)) {
        // Südlich von Weg und Bucht: nur Niedriges
        if (!covers(x, z, 3)) scatter.place(`small${rng.int(0, smalls.length - 1)}`, x, z, turns);
        else if (rng.chance(0.55)) scatter.place(`bush${rng.int(0, 3)}`, x, z, turns);
        else continue;
        if (edge < 1.6) colliders.addCircle(x, z, 0.35, 'waldbaum');
        continue;
      }
      const roll = rng.next();
      const nearEdge = edge < 3;
      // Am Ufer (rechts) eher Kiefern und Birken, am Weg mehr bunte Laubbäume
      let name;
      if (roll < (nearEdge ? 0.3 : 0.5)) name = `fir${rng.int(0, 2)}`;
      else if (roll < (nearEdge ? 0.82 : 0.86)) name = `oak${rng.int(0, oaks.length - 1)}`;
      else name = `birch${rng.int(0, 1)}`;
      scatter.place(name, x, z, turns);
      trees++;
      if (edge < 1.6) colliders.addCircle(x, z, 0.35, 'waldbaum');
      if (nearEdge && rng.chance(0.2)) scatter.place(`mushroom${rng.int(0, 1)}`, snapV(x + rng.range(-1.2, 1.2)), snapV(z + rng.range(0.6, 1.4)), rng.int(0, 3));
      if (nearEdge && deco.chance(0.2)) {
        // Am Waldrand dazu Pilzgruppen im feinen Maß (M12)
        const px = x + deco.range(-1.2, 1.2);
        const pz = z + deco.range(0.6, 1.4);
        if (map.pathDistance(px, pz) > 0.9) placeMushrooms(px, pz, deco.int(0, 2));
      }
    }
  }
  // Inseln im See: ein paar Tannen und Felsen
  for (const isl of ISLANDS) {
    const n = Math.max(1, Math.round(isl.r * 1.3));
    for (let k = 0; k < n; k++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(0, isl.r * 0.5);
      scatter.place(`fir${rng.int(0, 2)}`, snapV(isl.x + Math.cos(a) * r), snapV(isl.z + Math.sin(a) * r * 0.8), rng.int(0, 3));
      trees++;
    }
    scatter.place(`rock${rng.int(0, 3)}`, snapV(isl.x + isl.r * 0.6), snapV(isl.z + isl.r * 0.35), rng.int(0, 3));
  }

  for (const spot of BAY_MUSHROOMS) placeMushrooms(spot.x, spot.z, spot.kind);

  // --- Schilf am Ufer (M12): im flachen Wasser, in Gruppen, der Steg bleibt frei ---
  let reedsPlaced = 0;
  for (let z = MAP.z0 + 2; z <= MAP.z1 - 2; z += 0.7) {
    if (z > BAY.dock.z0 - 2.5 && z < BAY.dock.z1 + 3) continue; // Anleger für Balduins Boot
    if (valueNoise(0, z * 0.35, seed + 17) < 0.45) continue; // Lücken zwischen den Beständen
    for (let k = 0; k < 2; k++) {
      const x = shoreX(z) + deco.range(0.05, 1.1);
      const zz = z + deco.range(-0.3, 0.3);
      if (!map.isWater(x, zz) || deco.chance(0.25)) continue;
      scatter.place(`schilf${deco.int(0, reeds.length - 1)}`, snapV(x), snapV(zz), deco.int(0, 3));
      reedsPlaced++;
    }
  }
  // Auch an den Felsinseln ein paar Halme
  for (const isl of ISLANDS) {
    for (let k = 0; k < 3; k++) {
      const a = deco.range(Math.PI * 0.4, Math.PI * 1.6); // eher an der Westseite (zum Ufer hin)
      const x = isl.x + Math.cos(a) * (isl.r + 0.3);
      const z = isl.z + Math.sin(a) * (isl.r + 0.3) * 0.8;
      if (!map.isWater(x, z)) continue;
      scatter.place(`schilf${deco.int(0, reeds.length - 1)}`, snapV(x), snapV(z), deco.int(0, 3));
      reedsPlaced++;
    }
  }

  // --- Büsche und Felsen als Saum (dort endet das Begehbare) ---
  let bushesPlaced = 0;
  let rocksPlaced = 0;
  for (let gz = MAP.z0 + 3; gz <= MAP.z1 - 3; gz += 1.3) {
    for (let gx = MAP.x0 + 8; gx <= MAP.x1; gx += 1.3) {
      const x = snapV(gx + rng.range(-0.5, 0.5));
      const z = snapV(gz + rng.range(-0.5, 0.5));
      if (!land(x, z)) continue;
      const edge = map.edgeDistance(x, z);
      if (edge < -0.1 || edge > 0.7) continue;
      if (map.pathDistance(x, z) < 1.4 || blocked(x, z, 0.5)) continue;
      if (rng.chance(0.45)) continue;
      if (rng.chance(0.18)) {
        scatter.place(`rock${rng.int(0, 3)}`, x, z, rng.int(0, 3));
        colliders.addCircle(x, z, 0.45, 'fels');
        rocksPlaced++;
      } else {
        scatter.place(`bush${rng.int(0, 3)}`, x, z, rng.int(0, 3));
        colliders.addCircle(x, z, 0.55, 'busch');
        bushesPlaced++;
      }
    }
  }

  // --- Gras und Blumen auf Wiese und Hof (nicht auf den Wegen) ---
  let tuftsPlaced = 0;
  let flowersPlaced = 0;
  const area = (MAP.x1 - MAP.x0) * (MAP.z1 - MAP.z0);
  for (let i = 0; i < area * 0.9; i++) {
    const x = snapV(rng.range(MAP.x0 + 8, MAP.x1 - 4));
    const z = snapV(rng.range(MAP.z0 + 4, MAP.z1 - 4));
    if (!land(x, z)) continue;
    const edge = map.edgeDistance(x, z);
    if (edge > 0.4) continue;
    if (map.pathDistance(x, z) < 0.45) continue;
    if (map.inYard(x, z) && rng.chance(0.5)) continue; // der Hof ist zertreten
    if (Math.hypot(x - LAYOUT.campfire.x, z - LAYOUT.campfire.z) < 2.2) continue;
    if (blocked(x, z, 0.3)) continue;
    const density = fbm(x * 0.22, z * 0.22, 2, seed + 99);
    const flowerPatch = valueNoise(x * 0.3, z * 0.3, seed + 5) > 0.72;
    if (flowerPatch && rng.chance(0.25)) {
      scatter.place(`flower${rng.int(0, flowers.length - 1)}`, x, z, rng.int(0, 3));
      flowersPlaced++;
    } else if (rng.next() < (density - 0.3) * 1.1) {
      scatter.place(`tuft${rng.int(0, tufts.length - 1)}`, x, z, rng.int(0, 3));
      tuftsPlaced++;
    }
  }

  const { group, instances } = scatter.build();
  return { group, stats: { trees, bushes: bushesPlaced, rocks: rocksPlaced, tufts: tuftsPlaced, flowers: flowersPlaced, reeds: reedsPlaced, instances } };
}
