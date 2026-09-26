// Ressourcenquellen: Bäume, Felsen, Kiesel, hohes Gras, Äste, Schrotthaufen.
// Jede Quelle hat ein Modell, eine Kollision, eine Interaktion und einen
// Zustand im Spielstand (erschöpft bis Tag X). Erschöpfte Quellen wachsen
// über die Tage nach.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { hash3, Rng } from '../core/rng.js';
import { NODES } from './layout.js';
import { buildBirch, buildDeciduous, buildFir, buildRock } from './nature.js';

/**
 * Regeln je Art. yield = pro Treffer, bonus = beim letzten Treffer.
 * tool: nötiges Werkzeug oder null (mit der Hand).
 */
export const NODE_RULES = {
  baum: { tool: 'axt', hits: 4, yield: { holz: 1 }, bonus: { holz: 2 }, regrowDays: 2, prompt: 'hacken', sound: 'holz' },
  felsen: { tool: 'spitzhacke', hits: 4, yield: { stein: 1 }, bonus: { stein: 2 }, regrowDays: 2, prompt: 'abbauen', sound: 'stein' },
  kiesel: { tool: null, hits: 1, yield: { stein: 2 }, bonus: {}, regrowDays: 1, prompt: 'aufsammeln', sound: 'stein' },
  gras: { tool: null, hits: 2, yield: { fasern: 1 }, bonus: { fasern: 1 }, regrowDays: 1, prompt: 'rupfen', sound: 'gras' },
  aeste: { tool: null, hits: 1, yield: { holz: 2 }, bonus: {}, regrowDays: 1, prompt: 'aufsammeln', sound: 'holz' },
  schrott: { tool: null, hits: 1, search: true, regrowDays: 1, prompt: 'durchsuchen', sound: 'schrott' },
};

/** Beute beim Durchsuchen: [min, max] oder Wahrscheinlichkeit für 1. */
export const SEARCH_LOOT = {
  schrott: { schrott: [2, 4], stoff: [0, 2], zahnraeder: 0.12 },
  auto: { schrott: [3, 5], stoff: [1, 2], zahnraeder: 0.25 },
};

// --- Modelle ------------------------------------------------------------------

function buildStump(seed, radius = 2) {
  const m = new VoxelModel();
  m.cylinder(0, 0, 0, 1, radius + 0.4, (x, y, z) => {
    if (y === 1) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      return d < 0.9 ? P.e6 : d < radius - 0.4 ? P.e8 : P.e7;
    }
    return hash3(x, y, z, seed) < 0.4 ? P.e3 : P.e2;
  });
  return m;
}

/** Faserbusch: dichter Horst mit hellen Spitzen und goldenen Samenrispen. */
function buildTallGrass(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = rng.int(-3, 2);
    const z = rng.int(-2, 2);
    const h = rng.int(3, 6);
    for (let y = 0; y < h; y++) m.set(x, y, z, y === h - 1 ? (rng.chance(0.5) ? P.g9 : P.g8) : y === 0 ? P.g4 : P.g6);
    if (rng.chance(0.35)) m.set(x, h, z, P.f6);
  }
  return m;
}

/** Lose Steine: ein kleiner Haufen heller Brocken auf einem Fleck Erde – hebt sich vom Gras ab. */
function buildPebbles(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  m.box(-4, 0, -3, 3, 0, 2, (x, y, z) => ((x === -4 || x === 3) && (z === -3 || z === 2) ? null : hash3(x, y, z, seed) < 0.5 ? P.e3 : P.e4));
  const stones = [[-2, -1, 2], [1, 0, 2], [-1, 1, 1], [0, -2, 1], [2, 1, 1]];
  for (const [x, z, h] of stones) {
    const c = rng.pick([P.s7, P.s8, P.s6]);
    m.box(x, 1, z, x + 1, h, z + 1, (vx, vy) => (vy === h ? P.s9 : c));
  }
  m.set(-1, 3, 0, P.s9);
  return m;
}

/** Äste: ein zusammengeschnürtes Bündel, das man im Gras sieht. */
function buildBranches(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  for (let i = 0; i < 5; i++) {
    const z0 = rng.int(-2, 1);
    const y = i < 3 ? 0 : 1;
    m.line(-4, y, z0, 3, y, z0 + rng.int(-1, 1), i % 2 ? P.e4 : P.e6);
  }
  m.box(-1, 0, -2, -1, 2, 1, P.e8); // Schnur
  m.set(2, 2, 0, P.g6).set(-3, 1, -1, P.g5);
  return m;
}

/** Rotes Stoffband um den Stamm: Diesen Baum darf man fällen. */
function ribbon(m, y) {
  const trunk = [];
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (m.has(x, y, z)) trunk.push([x, z]);
  // Rot-weißes Markierband wie im Forst, drei Voxel hoch – auch im Augenwinkel erkennbar
  const stripes = [P.f2, P.s9, P.f2];
  for (const [x, z] of trunk) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      stripes.forEach((c, k) => {
        if (!m.has(nx, y + k, nz)) m.set(nx, y + k, nz, c);
      });
    }
  }
  // Lose Enden flattern zur Kamera hin (Süden)
  const [fx, fz] = trunk.reduce((best, t) => (t[1] > best[1] ? t : best), trunk[0] || [0, 0]);
  m.set(fx + 1, y + 1, fz + 2, P.f2).set(fx + 1, y, fz + 2, P.s9).set(fx + 2, y, fz + 2, P.f2).set(fx + 2, y - 1, fz + 2, P.s9).set(fx + 2, y - 2, fz + 3, P.f3);
}

/** Frischer Trieb auf dem Stumpf: morgen steht hier wieder ein Baum. */
function buildSprout() {
  const m = new VoxelModel();
  m.set(0, 2, 0, P.g5).set(0, 3, 0, P.g6).set(0, 4, 0, P.g7).set(-1, 4, 0, P.g8).set(1, 5, 0, P.g8).set(-1, 3, 1, P.g7).set(1, 4, -1, P.g6).set(0, 5, 0, P.g9);
  return m;
}

function buildScrapPile(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  // Reifen
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    m.set(Math.round(Math.cos(t) * 2.4) - 3, 0, Math.round(Math.sin(t) * 2.4), P.s1);
    m.set(Math.round(Math.cos(t) * 2.4) - 3, 1, Math.round(Math.sin(t) * 2.4), P.s1);
  }
  // Blechplatte schräg
  for (let x = -1; x <= 4; x++) for (let z = -3; z <= 0; z++) m.set(x, Math.max(0, 3 - Math.abs(z + 1) - (x > 2 ? 1 : 0)), z, (x + z) % 3 ? P.s5 : P.r3);
  // Fass
  m.cylinder(2, 2, 0, 3, 1.4, (x, y) => (y === 1 ? P.s4 : P.b2));
  // Rohre und Kram
  m.line(-4, 0, 3, 3, 1, 3, P.s4);
  for (let i = 0; i < 8; i++) m.set(rng.int(-4, 4), 0, rng.int(-3, 3), rng.pick([P.s3, P.s6, P.r2, P.e4, P.b3]));
  return m;
}

function treeModel(model, seed) {
  let m;
  switch (model) {
    case 'birke':
      m = buildBirch(seed, 1.0);
      break;
    case 'tanne':
      m = buildFir(seed, 0.85);
      break;
    case 'eiche':
      m = buildDeciduous(seed, 0.9);
      break;
    case 'jungtanne':
      m = buildFir(seed, 0.6);
      break;
    default:
      m = buildDeciduous(seed, 0.62);
  }
  ribbon(m, 5);
  return m;
}

// --- Verwaltung -----------------------------------------------------------------

export class ResourceNodes {
  /**
   * @param {object} deps scene, colliders, materials, seed
   */
  constructor({ scene, colliders, materials, seed }) {
    this.group = new THREE.Group();
    this.group.name = 'Ressourcen';
    scene.add(this.group);
    this.nodes = [];
    this.byId = new Map();

    for (const def of NODES) {
      const node = { ...def, rules: NODE_RULES[def.kind], hitsLeft: NODE_RULES[def.kind].hits, shake: 0 };
      const s = seed + hash3(Math.round(def.x * 8), 0, Math.round(def.z * 8), 5) * 1000;
      let model;
      let radius = 0.3;
      let blocking = true;
      switch (def.kind) {
        case 'baum':
          model = treeModel(def.model, Math.floor(s));
          radius = def.model.startsWith('jung') ? 0.25 : 0.32;
          node.stump = createStaticVoxelObject(buildStump(Math.floor(s), def.model.startsWith('jung') ? 1.4 : 2), materials.world, { seed });
          node.sprout = createStaticVoxelObject(buildSprout(), materials.world, { seed, shadow: 'none' });
          break;
        case 'felsen':
          model = buildRock(Math.floor(s), def.model === 'gross' ? 1.4 : 1.0);
          radius = def.model === 'gross' ? 0.75 : 0.5;
          break;
        case 'kiesel':
          model = buildPebbles(Math.floor(s));
          blocking = false;
          break;
        case 'gras':
          model = buildTallGrass(Math.floor(s));
          blocking = false;
          break;
        case 'aeste':
          model = buildBranches(Math.floor(s));
          blocking = false;
          break;
        case 'schrott':
          model = buildScrapPile(Math.floor(s));
          radius = 0.6;
          break;
        default:
          continue;
      }
      const material = def.kind === 'baum' ? materials.occluder : materials.world;
      node.object = createStaticVoxelObject(model, material, { seed, shadow: def.kind === 'baum' ? 'coarse' : 'full' });
      node.object.position.set(def.x, 0, def.z);
      this.group.add(node.object);
      if (node.stump) {
        node.stump.position.set(def.x, 0, def.z);
        node.stump.visible = false;
        this.group.add(node.stump);
        node.sprout.position.set(def.x, 0, def.z);
        node.sprout.visible = false;
        this.group.add(node.sprout);
      }
      if (blocking) node.collider = colliders.addCircle(def.x, def.z, radius, def.id);
      node.interaction = { id: def.id, x: def.x, z: def.z, radius: 1.2 + radius, prompt: node.rules.prompt, node: def.id };
      if (def.kind === 'baum') node.interaction.north = def.model.startsWith('jung') ? 0.9 : 1.6;
      this.nodes.push(node);
      this.byId.set(def.id, node);
    }
  }

  get interactions() {
    return this.nodes.map((n) => n.interaction);
  }

  /** Zustand aus dem Spielstand übernehmen (erschöpft bis Tag X). */
  apply(worldState, day) {
    this.day = day;
    for (const node of this.nodes) {
      const entry = worldState.nodes[node.id];
      const depleted = Boolean(entry && entry.until > day);
      node.until = depleted ? entry.until : 0;
      this.setDepleted(node, depleted);
      if (!depleted && entry) delete worldState.nodes[node.id];
    }
  }

  /** Tage, bis eine erschöpfte Quelle wieder da ist (0 = da). */
  daysLeft(node) {
    return node.depleted ? Math.max(1, (node.until || 0) - (this.day || 0)) : 0;
  }

  setDepleted(node, depleted) {
    node.depleted = depleted;
    node.hitsLeft = node.rules.hits;
    node.object.visible = !depleted;
    if (node.stump) node.stump.visible = depleted;
    // Am letzten Tag vor dem Nachwachsen treibt der Stumpf schon aus
    if (node.sprout) node.sprout.visible = depleted && this.daysLeft(node) <= 1;
    // Baumstümpfe bleiben Hindernis (und sagen, wann sie nachwachsen), Felsen verschwinden ganz.
    if (node.collider && node.kind !== 'baum') node.collider.enabled = !depleted;
    node.interaction.enabled = !depleted || node.kind === 'baum';
  }

  /** Letzter Treffer: die Quelle sackt in sich zusammen, dann bleibt der Stumpf. */
  startFall(node, until) {
    node.depleted = true;
    node.until = until;
    node.interaction.enabled = false;
    node.fall = 0.3;
  }

  /** Wackeln und Pulsen nach einem Treffer, Zusammensacken nach dem letzten. */
  update(dt) {
    for (const node of this.nodes) {
      if (node.fall > 0) {
        node.fall = Math.max(0, node.fall - dt);
        const q = 1 - node.fall / 0.3;
        node.object.scale.set(1 + q * 0.3, Math.max(0.05, 1 - q * q), 1 + q * 0.3);
        if (node.fall === 0) {
          node.object.scale.set(1, 1, 1);
          node.object.position.x = node.x;
          this.setDepleted(node, true);
        }
        continue;
      }
      if (node.shake <= 0) continue;
      node.shake = Math.max(0, node.shake - dt * 3.5);
      // Nur seitlich versetzen, nicht kippen: die Modelle haben keine Seitenflächen.
      node.object.position.x = node.x + Math.sin(node.shake * 40) * node.shake * 0.09;
      const pulse = 1 + node.shake * node.shake * 0.06;
      node.object.scale.set(pulse, 1 + node.shake * node.shake * 0.04, pulse);
    }
  }
}
