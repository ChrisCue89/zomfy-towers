// Ressourcenquellen: Bäume, Felsen, Kiesel, hohes Gras, Äste, Schrotthaufen.
// Jede Quelle hat ein Modell, eine Kollision, eine Interaktion und einen
// Zustand im Spielstand (erschöpft bis Tag X). Erschöpfte Quellen wachsen
// über die Tage nach.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { hash3, Rng } from '../core/rng.js';
import { BAY_NODES } from './layout.js';
import { buildBirch, buildDeciduous, buildFir, buildRock, LEAVES } from './nature.js';
import { FINE, stoneBlob } from './voxelKit.js';

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
  schrott: { tool: null, hits: 1, search: true, regrowDays: 2, prompt: 'durchsuchen', sound: 'schrott' }, // M8: alle zwei Tage
};

/** Beute beim Durchsuchen: [min, max] oder Wahrscheinlichkeit für 1. */
export const SEARCH_LOOT = {
  schrott: { schrott: [2, 3], stoff: [0, 1], zahnraeder: 0.15 },
  // Das Bootswrack gibt nur einmal etwas her (M8: früher das Autowrack) – dafür
  // reichlich für den ersten Turm
  wrack: { schrott: [5, 6], stoff: [1, 2], zahnraeder: 0.35 },
};

/** So viele Tage braucht ein Schrotthaufen, bis wieder etwas darin liegt. */
export const SEARCH_REGROW_DAYS = 2;

// --- Modelle ------------------------------------------------------------------

// Seit M13 im feinen Maß (1/16 m, Koordinaten verdoppelt): Stumpf, Faserbusch,
// Kiesel, Äste, Trieb und Schrotthaufen.

function buildStump(seed, radius = 2) {
  const m = new VoxelModel();
  const r = radius * 2 + 0.8;
  m.cylinder(0, 0, 0, 3, r, (x, y, z) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    if (y === 3) {
      if (d > r - 1.1) return P.e3; // Rinde
      if (d < 1) return P.e6;
      return Math.floor(d * 1.3) % 2 ? P.e7 : P.e8; // Jahresringe
    }
    const a = Math.atan2(z + 0.5, x + 0.5);
    return Math.floor((a / Math.PI) * 8 + 16) % 2 ? P.e3 : hash3(x, y, z, seed) < 0.4 ? P.e2 : P.e3;
  });
  // Wurzelansätze
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = Math.round(dx * (r + 0.6));
    const z = Math.round(dz * (r + 0.6));
    m.box(Math.min(x, x - dx), 0, Math.min(z, z - dz), Math.max(x, x - dx), 0, Math.max(z, z - dz), P.e3);
  }
  return m;
}

/** Faserbusch: dichter Horst langer, gebogener Halme mit hellen Spitzen und goldenen Samenrispen. */
function buildTallGrass(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  for (let i = 0; i < 70; i++) {
    const x0 = rng.int(-6, 5);
    const z0 = rng.int(-4, 4);
    const h = rng.int(7, 13);
    const lean = rng.range(-0.35, 0.35);
    for (let y = 0; y < h; y++) {
      const x = Math.round(x0 + lean * (y * y) / h);
      const c = y === h - 1 ? (rng.chance(0.5) ? P.g9 : P.g8) : y < 2 ? P.g4 : y < h * 0.6 ? P.g5 : P.g6;
      m.set(x, y, z0, c);
    }
    if (rng.chance(0.3)) {
      const x = Math.round(x0 + lean * h);
      m.set(x, h, z0, P.f6).set(x, h + 1, z0, P.e8).set(x + (lean > 0 ? 1 : -1), h, z0, P.f6);
    }
  }
  return m;
}

/** Lose Steine: ein Häufchen heller, runder Kiesel mit Glanzpunkt auf einem Fleck Erde – hebt sich vom Gras ab. */
function buildPebbles(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  // Dunkler Erdfleck, darauf ein Häufchen heller, runder Kiesel mit Glanz: sammelbar –
  // anders als die grauen Felsen und die Tupfer im Weg (m12-r1: keiner fand den Stein)
  m.ellipsoid(-0.5, 0, -0.5, 8, 1, 6.5, (x, y, z) => (y !== 0 ? null : hash3(x, y, z, seed) < 0.5 ? P.e2 : P.e3));
  const stones = [[-4, -2, 2.6], [2, 0, 2.4], [-2, 2, 2.2], [0, -4, 2.0], [4, 3, 1.8], [-6, 1, 1.6], [5, -3, 1.5], [1, 4, 1.4]];
  for (const [x, z, r] of stones) {
    const tones = rng.chance(0.5) ? [P.s6, P.s7, P.s8, P.s9, P.s9] : [P.s5, P.s6, P.s7, P.s8, P.s9];
    const pebble = stoneBlob(new VoxelModel(), 0, 0, r, r * 0.8, r * 0.85, seed + x * 7 + z, tones);
    let top = null;
    pebble.forEach((px, py, pz) => {
      if (!top || py > top[1] || (py === top[1] && px + pz < top[0] + top[2])) top = [px, py, pz];
    });
    m.merge(pebble, x, 1, z);
    if (top) m.set(x + top[0], 1 + top[1], z + top[2], P.a4); // Glanz
  }
  return m;
}

/** Äste: ein zusammengeschnürtes Bündel mit Zweigen und ein paar Blättern, das man im Gras sieht. */
function buildBranches(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  for (let i = 0; i < 6; i++) {
    const z0 = rng.int(-4, 2);
    const y = i < 3 ? 0 : i < 5 ? 1 : 2;
    const z1 = z0 + rng.int(-2, 2);
    const c = i % 2 ? P.e4 : P.e5;
    m.line(-8, y, z0, 7, y, z1, c);
    m.line(-8, y, z0 + 1, 7, y, z1 + 1, i % 2 ? P.e3 : P.e4);
    // ein Zweig schräg ab
    const fx = rng.int(-4, 4);
    m.line(fx, y, z0 + 1, fx + 3, y, z0 + 3 + rng.int(0, 1), P.e4);
  }
  m.box(-2, 0, -5, -1, 3, 3, (x, y) => (y === 3 ? P.e9 : P.e8)); // Schnur
  m.set(5, 2, 0, P.g6).set(6, 2, 1, P.g7).set(-6, 1, -2, P.f5).set(-5, 2, -2, P.f6);
  return m;
}

/** Rot-weißes Stoffband um den Stamm: Diesen Baum darf man fällen (feines Maß, M13). */
function ribbon(m, y) {
  const trunk = [];
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (m.has(x, y, z)) trunk.push([x, z]);
  // Rot-weißes Markierband wie im Forst, sechs Voxel hoch – auch im Augenwinkel erkennbar
  const stripes = [P.f2, P.f2, P.s9, P.s9, P.f2, P.f2];
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
  m.box(fx + 1, y + 2, fz + 2, fx + 2, y + 3, fz + 3, P.f2).box(fx + 2, y, fz + 3, fx + 3, y + 1, fz + 4, P.s9);
  m.box(fx + 3, y - 2, fz + 4, fx + 4, y - 1, fz + 5, P.f2).set(fx + 4, y - 3, fz + 5, P.f3);
}

/**
 * Markierpflock vor dem Baum (Süden, zur Kamera hin): Das Band am Stamm
 * verdeckt oft die Krone, den Pflock sieht man immer (m12-r1: fällbare Bäume
 * sahen aus wie Kulisse).
 */
function markerStake(m) {
  let south = 4;
  for (let y = 6; y <= 112; y++) {
    for (let x = -6; x <= 6; x++) {
      for (let z = 60; z > south; z--) {
        if (m.has(x, y, z)) {
          south = z;
          break;
        }
      }
    }
  }
  // Blau-weiß: Rot-Weiß tragen schon die Fliegenpilze unter den Bäumen, Blau sonst kaum etwas
  const z = south + 4;
  m.box(0, 0, z, 1, 9, z + 1, (x) => (x === 0 ? P.e6 : P.e5)); // Pfahl
  m.box(0, 10, z, 1, 11, z + 1, P.s9).box(0, 12, z, 1, 15, z + 1, P.b4); // weiß-blaue Spitze
  m.box(2, 12, z, 5, 15, z, (x, y) => ((x + y) % 3 === 0 ? P.b3 : x > 3 ? P.b3 : P.b4)); // Fähnchen
}

/** Frischer Trieb auf dem Stumpf: morgen steht hier wieder ein Baum. */
function buildSprout() {
  const m = new VoxelModel();
  m.box(0, 4, 0, 0, 9, 0, P.g4);
  m.set(-1, 7, 0, P.g6).set(-2, 8, 0, P.g7).set(-1, 8, 0, P.g6);
  m.set(1, 9, 0, P.g6).set(2, 10, 0, P.g7).set(1, 10, 0, P.g8);
  m.set(0, 10, 0, P.g8).set(0, 11, 0, P.g9).set(0, 8, 1, P.g6);
  return m;
}

/** Schrotthaufen: angelehnter Reifen, blaue Öltonne, ein schräges Wellblech, Rohre, Dosen und Kleinkram. */
function buildScrapPile(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  // Reifen, schräg angelehnt (Ring in der x-y-Ebene)
  for (let x = -10; x <= -1; x++) {
    for (let y = 0; y <= 9; y++) {
      const d = Math.hypot(x + 0.5 + 5.5, y + 0.5 - 4.5);
      if (d > 4.8 || d < 2.4) continue;
      for (let z = 1; z <= 3; z++) m.set(x, y, z + (y > 5 ? -1 : 0), d > 4 && (x + y) % 2 ? P.s2 : P.s1);
    }
  }
  // Wellblech schräg über dem Haufen
  for (let x = -3; x <= 8; x++) {
    for (let z = -7; z <= -1; z++) {
      const y = Math.max(0, 6 - Math.abs(z + 4) - (x > 5 ? 2 : 0));
      const rust = hash3(x, 0, z, seed) > 0.72;
      m.set(x, y, z, rust ? P.r2 : x % 3 === 0 ? P.s4 : P.s5);
    }
  }
  // Blaue Öltonne mit Sicken und Rostflecken (nicht rund wie ein Kürbis: gerade Wand, flacher Deckel)
  m.cylinder(5, 4, 0, 9, 2.8, (x, y, z) => {
    if (y === 3 || y === 6) return P.s4;
    if (hash3(x, y, z, seed) > 0.82) return P.r2;
    return x < 5 ? P.b3 : P.b2;
  });
  m.cylinder(5, 4, 9, 9, 2.8, (x, y, z) => (Math.hypot(x + 0.5 - 5, z + 0.5 - 4) > 2 ? P.s5 : P.b2));
  m.set(6, 10, 4, P.s6);
  // Rohre und Kram
  m.line(-8, 0, 6, 7, 1, 7, P.s4).line(-8, 1, 6, 7, 2, 7, P.s6);
  m.cylinder(-4, -4, 0, 2, 1.2, (x, y) => (y === 2 ? P.s6 : P.r3)); // Dose
  m.cylinder(1, 6, 0, 0, 1.8, (x, z) => ((x + z) % 2 ? P.s7 : P.s6)); // Radkappe
  for (let i = 0; i < 12; i++) m.set(rng.int(-9, 9), 0, rng.int(-7, 8), rng.pick([P.s3, P.s6, P.r2, P.e4, P.b3, P.s7]));
  return m;
}

function treeModel(model, seed) {
  let m;
  switch (model) {
    case 'birke':
      m = buildBirch(seed, 1.0, [P.e7, P.f5, P.f6, P.f7]);
      break;
    case 'tanne':
      m = buildFir(seed, 0.85);
      break;
    case 'eiche':
      m = buildDeciduous(seed, 0.9, LEAVES.orange);
      break;
    case 'jungtanne':
      m = buildFir(seed, 0.6);
      break;
    default:
      m = buildDeciduous(seed, 0.62, LEAVES.gelb);
  }
  ribbon(m, 10);
  markerStake(m);
  return m;
}

// --- Verwaltung -----------------------------------------------------------------

/**
 * Quellen entlang der Wege (je Spiel neu, aus dem Startwert der Karte): alle
 * gut 8 m ein Baum, Fels, Kiesel, Faserbusch, Äste oder Schrott – seitlich
 * neben dem Weg auf dem offenen Streifen, wo später auch Türme stehen.
 * @param {import('./map.js').GameMap} map
 */
export function pathNodes(map) {
  const rng = new Rng(map.seed * 131 + 7);
  const out = [];
  const kinds = [
    ['baum', 0.3],
    ['felsen', 0.14],
    ['kiesel', 0.14],
    ['gras', 0.16],
    ['aeste', 0.18],
    ['schrott', 0.08],
  ];
  const trees = ['birke', 'eiche', 'tanne', 'jung', 'jungtanne'];
  const taken = [...BAY_NODES];
  for (const path of map.paths) {
    const pts = path.points;
    for (let k = 6; k < pts.length - 4; k += 16) {
      const a = pts[k];
      const b = pts[k + 1];
      const tx = b.x - a.x;
      const tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1;
      const off = path.width / 2 + rng.range(2, 4.2);
      let r = rng.next();
      let kind = 'aeste';
      for (const [name, w] of kinds) {
        if (r < w) {
          kind = name;
          break;
        }
        r -= w;
      }
      // Bäume nur nördlich vom Weg: Ihre Krone ragt im Bild nach oben und verdeckt ihn sonst
      const sides = [1, -1].map((side) => ({ x: Math.round((a.x - (tz / len) * off * side) * 8) / 8, z: Math.round((a.z + (tx / len) * off * side) * 8) / 8 }));
      const spot = kind === 'baum' ? (sides[0].z < sides[1].z ? sides[0] : sides[1]) : sides[rng.int(0, 1)];
      const { x, z } = spot;
      if (map.edgeDistance(x, z) > -1.2 || map.pathDistance(x, z) < 1.6 || map.inBay(x, z, -2)) continue;
      if (taken.some((n) => (n.x - x) ** 2 + (n.z - z) ** 2 < 16)) continue;
      const node = { id: `weg-${out.length + 1}`, kind, x, z };
      if (kind === 'baum') node.model = rng.pick(trees);
      if (kind === 'felsen') node.model = rng.chance(0.3) ? 'gross' : 'mittel';
      out.push(node);
      taken.push(node);
    }
  }
  return out;
}

export class ResourceNodes {
  /**
   * @param {object} deps scene, colliders, materials, seed, map
   */
  constructor({ scene, colliders, materials, seed, map }) {
    this.group = new THREE.Group();
    this.group.name = 'Ressourcen';
    scene.add(this.group);
    this.nodes = [];
    this.byId = new Map();

    for (const def of [...BAY_NODES, ...pathNodes(map)]) {
      const node = { ...def, rules: NODE_RULES[def.kind], hitsLeft: NODE_RULES[def.kind].hits, shake: 0 };
      const s = seed + hash3(Math.round(def.x * 8), 0, Math.round(def.z * 8), 5) * 1000;
      let model;
      let radius = 0.3;
      let blocking = true;
      switch (def.kind) {
        case 'baum':
          model = treeModel(def.model, Math.floor(s));
          radius = def.model.startsWith('jung') ? 0.25 : 0.32;
          node.stump = createStaticVoxelObject(buildStump(Math.floor(s), def.model.startsWith('jung') ? 1.4 : 2), materials.world, { seed, size: FINE, shadow: 'coarse' });
          node.sprout = createStaticVoxelObject(buildSprout(), materials.world, { seed, shadow: 'none', size: FINE });
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
      // Seit M13 alle im feinen Maß; Bäume werfen grobe Schatten (1/4 m)
      node.object = createStaticVoxelObject(model, material, { seed, shadow: def.kind === 'baum' ? 'rough' : 'coarse', size: FINE });
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
