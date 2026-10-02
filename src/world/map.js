// Die Karte an der Bucht (Meilenstein 9, DESIGN.md 0 und 6.2). Rechts liegt
// der Kranichsee mit der festen Bucht (Haus, Steg, Hof), links die Landseite
// mit einem Wegenetz, das bei jedem neuen Spiel aus einem eigenen Startwert
// entsteht: drei Zuführungen von den Spawns am linken Rand, die sich treffen
// und kurz vor dem Hof in einen gemeinsamen letzten Abschnitt münden.
//
// Koordinaten in Metern: x nach Osten (rechts im Bild), z nach Süden (unten
// im Bild). Die Karte beantwortet Fragen für Gelände, Natur, Bauraster,
// Wegfindung der Horde und die Begrenzung der Figur.

import { Rng, valueNoise, fbm } from '../core/rng.js';
import { fogIsleEdge } from '../data/fogIsle.js';

/** Ausdehnung des Geländes. */
export const MAP = { x0: -62, x1: 34, z0: -30, z1: 30 };

/** Die feste Bucht (bei jedem Spiel gleich). */
export const BAY = {
  x0: -8, // westlicher Rand der Bucht (dahinter beginnt das Wegenetz)
  z0: -13,
  z1: 11,
  yard: { x0: -7, x1: 12.5, z0: -6, z1: 8 }, // Hof vor dem Haus: letzte Verteidigung, die Horde darf hinein
  entry: { x: -7, z: 1.5 }, // hier mündet der gemeinsame letzte Abschnitt in den Hof
  dock: { x0: 13, x1: 21.5, z0: -1.75, z1: -0.25 }, // Steg nach Osten in den See
};

/** Spawns am linken Rand: Namen nach ihrer Lage (für Meldungen). */
export const SPAWN_NAMES = ['nord', 'mitte', 'sued'];
const BANDS = { nord: [-21, -9], mitte: [-5, 6], sued: [9, 21] };
const LEFT = -57; // hier treten die Schlurfer aus dem Wald auf den Weg
const PLAYER_LEFT = -50; // weiter nach links kommt die Figur nicht
const FEEDER_WIDTH = 3;
const FINAL_WIDTH = 4;
export const FIELD_STEP = 0.25; // Auflösung der Abstandsfelder (m)

/**
 * Kleine Felsinseln im See (fest). N6: Die kleine Südinsel ist etwas größer geworden, damit
 * Mika dort an Land gehen kann – `trees` hält die Zahl ihrer Tannen wie vorher (sonst
 * verschöbe sich der Zufall der ganzen Natur danach).
 */
export const ISLANDS = [
  { x: 22.5, z: -8.5, r: 2.4 },
  { x: 27, z: 5.5, r: 3.1 },
  { x: 20.5, z: 12.5, r: 2.0, trees: 2 },
];

/** x der Uferlinie auf Höhe z: östlich davon ist Wasser. */
export function shoreX(z) {
  return 13.6 + 0.8 * Math.sin(z * 0.3 + 1) + 0.35 * Math.sin(z * 0.83 + 2.2);
}

/** Catmull-Rom durch die Stützpunkte, abgetastet alle `step` Meter. */
function smooth(points, step = 0.5) {
  const out = [];
  const p = [points[0], ...points, points[points.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    const n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  out.push({ ...points[points.length - 1] });
  return out;
}

/** Ein Wegstück von a nach b mit Stützpunkten, die innerhalb von [zMin, zMax] schlängeln. */
function wander(rng, a, b, zMin, zMax, amp) {
  const pts = [a];
  const n = Math.max(1, Math.round(Math.abs(b.x - a.x) / 9));
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const x = a.x + (b.x - a.x) * t + rng.range(-1.5, 1.5);
    const base = a.z + (b.z - a.z) * t;
    const z = Math.max(zMin, Math.min(zMax, base + rng.range(-amp, amp)));
    pts.push({ x, z });
  }
  pts.push(b);
  return smooth(pts);
}

/** Kleinster Abstand zweier Punktlisten (für den Mindestabstand der Zuführungen). */
function minGap(a, b, ignore) {
  let best = Infinity;
  for (const p of a) {
    if (ignore && Math.hypot(p.x - ignore.x, p.z - ignore.z) < 9) continue;
    for (const q of b) best = Math.min(best, Math.hypot(p.x - q.x, p.z - q.z));
  }
  return best;
}

/**
 * Das Wegenetz eines Spiels.
 * @returns {{topology:string, spawns:Array, paths:Array, merge:{x:number,z:number}}}
 */
export function generatePaths(seed) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const rng = new Rng((seed * 7919 + attempt * 104729 + 13) >>> 0);
    const merge = { x: rng.range(-24, -20), z: rng.range(-0.5, 3) }; // Zusammenfluss vor der Bucht
    const spawns = SPAWN_NAMES.map((name) => {
      const [a, b] = BANDS[name];
      return { name, x: LEFT, z: rng.range(a + 3, b - 3) };
    });
    const topology = rng.pick(['nm', 'ms', 'alle']);
    const paths = [];
    const feeder = (name, to, zMin, zMax) => {
      const s = spawns.find((sp) => sp.name === name);
      return wander(rng, { x: s.x, z: s.z }, to, zMin, zMax, 5);
    };
    if (topology === 'alle') {
      for (const name of SPAWN_NAMES) {
        const [a, b] = BANDS[name];
        paths.push({ id: name, feeder: name, width: FEEDER_WIDTH, points: feeder(name, merge, Math.min(a, merge.z), Math.max(b, merge.z)) });
      }
    } else {
      const pair = topology === 'nm' ? ['nord', 'mitte'] : ['mitte', 'sued'];
      const single = topology === 'nm' ? 'sued' : 'nord';
      const [a0] = BANDS[pair[0]];
      const [, b1] = BANDS[pair[1]];
      const knot = { x: rng.range(-39, -33), z: topology === 'nm' ? rng.range(-9, -4) : rng.range(4, 9) };
      for (const name of pair) {
        const [a, b] = BANDS[name];
        paths.push({ id: name, feeder: name, width: FEEDER_WIDTH, points: feeder(name, knot, Math.min(a, knot.z), Math.max(b, knot.z)) });
      }
      paths.push({ id: `${pair[0]}-${pair[1]}`, feeder: null, width: FEEDER_WIDTH, points: wander(rng, knot, merge, Math.min(a0, merge.z), Math.max(b1, merge.z), 3) });
      const [a, b] = BANDS[single];
      paths.push({ id: single, feeder: single, width: FEEDER_WIDTH, points: feeder(single, merge, Math.min(a, merge.z), Math.max(b, merge.z)) });
    }
    // Gemeinsamer letzter Abschnitt bis in den Hof
    const last = smooth([merge, { x: (merge.x + BAY.entry.x) / 2, z: rng.range(0, 3) }, BAY.entry, { x: BAY.entry.x + 3, z: BAY.entry.z }]);
    paths.push({ id: 'letzter', feeder: null, width: FINAL_WIDTH, points: last });
    // Zuführungen dürfen sich nur an ihren Treffpunkten nahe kommen
    const feeders = paths.filter((p) => p.feeder);
    let ok = true;
    for (let i = 0; i < feeders.length && ok; i++) {
      for (let j = i + 1; j < feeders.length && ok; j++) {
        const end = feeders[i].points[feeders[i].points.length - 1];
        if (minGap(feeders[i].points, feeders[j].points, end) < 9) ok = false;
      }
    }
    if (ok || attempt === 29) return { topology, spawns, paths, merge };
  }
  return null;
}

/**
 * Die Karte eines Spiels mit allen Abfragen. Abstandsfelder werden einmal beim
 * Anlegen berechnet (0,25 m Auflösung).
 */
export class GameMap {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.isle = null; // N6: auf welcher Insel Mika gerade an Land ist (core/isles.js)
    const net = generatePaths(this.seed);
    this.topology = net.topology;
    this.spawns = net.spawns;
    this.paths = net.paths;
    this.merge = net.merge;
    this.fw = Math.round((MAP.x1 - MAP.x0) / FIELD_STEP);
    this.fh = Math.round((MAP.z1 - MAP.z0) / FIELD_STEP);
    this.buildPathField();
    this.buildWalkField();
  }

  /** Abstand zum nächsten Wegrand (negativ: auf dem Weg), als Feld. */
  buildPathField() {
    const { fw, fh } = this;
    const field = new Float32Array(fw * fh).fill(99);
    const reach = Math.ceil(12 / FIELD_STEP);
    for (const path of this.paths) {
      const half = path.width / 2;
      const pts = path.points;
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k];
        const b = pts[Math.min(k + 1, pts.length - 1)];
        // Zwischenpunkte, damit der Abstand zwischen den Stützpunkten stimmt
        for (let t = 0; t < 1; t += 0.5) {
          const px = a.x + (b.x - a.x) * t;
          const pz = a.z + (b.z - a.z) * t;
          const ci = Math.floor((px - MAP.x0) / FIELD_STEP);
          const cj = Math.floor((pz - MAP.z0) / FIELD_STEP);
          for (let j = Math.max(0, cj - reach); j <= Math.min(fh - 1, cj + reach); j++) {
            const z = MAP.z0 + (j + 0.5) * FIELD_STEP;
            for (let i = Math.max(0, ci - reach); i <= Math.min(fw - 1, ci + reach); i++) {
              const x = MAP.x0 + (i + 0.5) * FIELD_STEP;
              const d = Math.hypot(x - px, z - pz) - half;
              const idx = j * fw + i;
              if (d < field[idx]) field[idx] = d;
            }
          }
        }
      }
    }
    this.pathField = field;
  }

  sample(field, x, z, outside = 99) {
    const i = Math.floor((x - MAP.x0) / FIELD_STEP);
    const j = Math.floor((z - MAP.z0) / FIELD_STEP);
    if (i < 0 || j < 0 || i >= this.fw || j >= this.fh) return outside;
    return field[j * this.fw + i];
  }

  /** Wie sample, aber zwischen den Feldpunkten gemittelt (weiche Wegränder im Gelände). */
  sampleLinear(field, x, z, outside = 99) {
    const fx = (x - MAP.x0) / FIELD_STEP - 0.5;
    const fz = (z - MAP.z0) / FIELD_STEP - 0.5;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= this.fw - 1 || j >= this.fh - 1) return this.sample(field, x, z, outside);
    const tx = fx - i;
    const tz = fz - j;
    const k = j * this.fw + i;
    const a = field[k] + (field[k + 1] - field[k]) * tx;
    const b = field[k + this.fw] + (field[k + this.fw + 1] - field[k + this.fw]) * tx;
    return a + (b - a) * tz;
  }

  /** Abstand zum nächsten Wegrand in Metern (≤ 0: auf dem Weg). */
  pathDistance(x, z) {
    return this.sample(this.pathField, x, z);
  }

  /** Liegt der Punkt auf einem Weg? `margin` > 0 zählt auch den Randstreifen. */
  onPath(x, z, margin = 0) {
    return this.pathDistance(x, z) <= margin;
  }

  /** Breite des offenen, bebaubaren Streifens neben den Wegen (4–8,5 m, wechselt). */
  openWidth(x, z) {
    return 4 + 4.5 * fbm(x * 0.06, z * 0.06, 2, this.seed + 31);
  }

  isWater(x, z) {
    return x > shoreX(z) && !this.onDock(x, z) && !this.onIsland(x, z);
  }

  /** N6: Abstand zum Rand der Insel `i` (gestreckt wie onIsland; negativ: an Land). N7: 'nebel' ist die Nebelinsel. */
  isleEdge(i, x, z) {
    if (i === 'nebel') return fogIsleEdge(x, z);
    const s = ISLANDS[i];
    return Math.hypot(x - s.x, (z - s.z) * 1.25) - s.r - (this.noise(x, z, 0.9, 71) - 0.5) * 0.8;
  }

  /** Auf einer der Felsinseln (mit Rauschen am Rand). */
  onIsland(x, z, margin = 0) {
    for (const s of ISLANDS) {
      const d = Math.hypot(x - s.x, (z - s.z) * 1.25);
      if (d < s.r - margin + (this.noise(x, z, 0.9, 71) - 0.5) * 0.8) return true;
    }
    return false;
  }

  onDock(x, z, margin = 0) {
    const d = BAY.dock;
    return x > d.x0 - 0.5 && x < d.x1 - margin && z > d.z0 + margin && z < d.z1 - margin;
  }

  inBay(x, z, margin = 0) {
    return x > BAY.x0 + margin && x < shoreX(z) - 0.25 - margin && z > BAY.z0 + margin && z < BAY.z1 - margin;
  }

  inYard(x, z) {
    const y = BAY.yard;
    return x > y.x0 && x < y.x1 && z > y.z0 && z < y.z1;
  }

  /**
   * Begehbar für die Figur (ohne Hindernisse): Bucht, Steg, offene Streifen an
   * den Wegen. Weiter weg vom Weg stehen Waldinseln – so bleiben die Wege auch
   * zwischen zwei Zuführungen natürlich begrenzt.
   */
  walkableRaw(x, z) {
    if (this.onDock(x, z)) return true;
    if (this.isWater(x, z)) return false;
    if (this.onIsland(x, z)) return false;
    if (this.inBay(x, z)) return true;
    if (x < PLAYER_LEFT || z < MAP.z0 + 5 || z > MAP.z1 - 5) return false; // oben und unten bleibt Wald im Bild
    const d = this.pathDistance(x, z);
    if (d <= 3) return true;
    if (d > this.openWidth(x, z)) return false;
    return this.noise(x, z, 0.16, 57) < 0.64;
  }

  /** Abstand zum Rand des Begehbaren (negativ innen), als Feld für die Begrenzung. */
  buildWalkField() {
    const { fw, fh } = this;
    const inside = new Uint8Array(fw * fh);
    for (let j = 0; j < fh; j++) {
      const z = MAP.z0 + (j + 0.5) * FIELD_STEP;
      for (let i = 0; i < fw; i++) {
        const x = MAP.x0 + (i + 0.5) * FIELD_STEP;
        inside[j * fw + i] = this.walkableRaw(x, z) ? 1 : 0;
      }
    }
    // Nur, was mit der Bucht zusammenhängt, zählt (keine abgeschnittenen Lichtungen)
    const reached = new Uint8Array(fw * fh);
    const start = Math.floor((2 - MAP.z0) / FIELD_STEP) * fw + Math.floor((2 - MAP.x0) / FIELD_STEP);
    const stack = [start];
    reached[start] = 1;
    while (stack.length) {
      const k = stack.pop();
      const i = k % fw;
      const j = (k - i) / fw;
      if (i > 0 && inside[k - 1] && !reached[k - 1]) (reached[k - 1] = 1), stack.push(k - 1);
      if (i < fw - 1 && inside[k + 1] && !reached[k + 1]) (reached[k + 1] = 1), stack.push(k + 1);
      if (j > 0 && inside[k - fw] && !reached[k - fw]) (reached[k - fw] = 1), stack.push(k - fw);
      if (j < fh - 1 && inside[k + fw] && !reached[k + fw]) (reached[k + fw] = 1), stack.push(k + fw);
    }
    for (let k = 0; k < inside.length; k++) if (!reached[k]) inside[k] = 0;
    this.walkMask = inside;
    // Zwei Durchgänge (Chamfer 3-4): Abstand zur jeweils anderen Seite
    const distTo = (target) => {
      const d = new Float32Array(fw * fh);
      for (let k = 0; k < d.length; k++) d[k] = inside[k] === target ? 0 : 1e6;
      const w1 = 3;
      const w2 = 4;
      for (let j = 0; j < fh; j++) {
        for (let i = 0; i < fw; i++) {
          const k = j * fw + i;
          if (i > 0) d[k] = Math.min(d[k], d[k - 1] + w1);
          if (j > 0) {
            d[k] = Math.min(d[k], d[k - fw] + w1);
            if (i > 0) d[k] = Math.min(d[k], d[k - fw - 1] + w2);
            if (i < fw - 1) d[k] = Math.min(d[k], d[k - fw + 1] + w2);
          }
        }
      }
      for (let j = fh - 1; j >= 0; j--) {
        for (let i = fw - 1; i >= 0; i--) {
          const k = j * fw + i;
          if (i < fw - 1) d[k] = Math.min(d[k], d[k + 1] + w1);
          if (j < fh - 1) {
            d[k] = Math.min(d[k], d[k + fw] + w1);
            if (i < fw - 1) d[k] = Math.min(d[k], d[k + fw + 1] + w2);
            if (i > 0) d[k] = Math.min(d[k], d[k + fw - 1] + w2);
          }
        }
      }
      return d;
    };
    const toInside = distTo(1);
    const toOutside = distTo(0);
    const field = new Float32Array(fw * fh);
    const unit = FIELD_STEP / 3;
    for (let k = 0; k < field.length; k++) field[k] = inside[k] ? -toOutside[k] * unit : toInside[k] * unit;
    this.walkField = field;
  }

  /** Abstand zum Rand des Begehbaren (m; negativ: innen, positiv: draußen im Wald oder Wasser). */
  edgeDistance(x, z) {
    return this.sampleLinear(this.walkField, x, z, 99);
  }

  /** Wie tief im Wald (0 im Begehbaren, wächst nach außen). */
  wildness(x, z) {
    return Math.max(0, this.edgeDistance(x, z));
  }

  /**
   * Position (mit Radius) ins Begehbare zurückschieben. true = verschoben.
   * Schlurfer (horde) dürfen auf dem ganzen Weg gehen, auch im Wald am Spawn.
   */
  pushInside(pos, radius, horde = false) {
    // N6: Wer auf einer Insel an Land ist, läuft nur auf ihr – am echten Rand entlang
    // (Newton-Schritte auf das Abstandsmaß der Insel, so gleitet man am Ufer weiter)
    // N7: nur in der Nähe der Insel – wer in der Bucht läuft (Überlebende, Balduin), wurde
    // sonst an den Inselrand gezogen, solange Mika drüben war
    if (this.isle !== null && this.isle !== undefined && !horde && this.isleEdge(this.isle, pos.x, pos.z) < 4) {
      const m = radius + 0.1;
      const e = 0.05;
      let moved = false;
      for (let k = 0; k < 4; k++) {
        const f = this.isleEdge(this.isle, pos.x, pos.z) + m;
        if (f <= 0) break;
        const gx = (this.isleEdge(this.isle, pos.x + e, pos.z) - this.isleEdge(this.isle, pos.x - e, pos.z)) / (2 * e);
        const gz = (this.isleEdge(this.isle, pos.x, pos.z + e) - this.isleEdge(this.isle, pos.x, pos.z - e)) / (2 * e);
        const g2 = gx * gx + gz * gz;
        if (g2 < 1e-6) break;
        pos.x -= (gx / g2) * (f + 0.002);
        pos.z -= (gz / g2) * (f + 0.002);
        moved = true;
      }
      return moved;
    }
    const d = this.edgeDistance(pos.x, pos.z) + radius;
    if (d <= 0) return false;
    if (horde && this.pathDistance(pos.x, pos.z) <= 0.2) return false;
    // Gefälle des Abstandsfelds zeigt nach außen
    const e = FIELD_STEP;
    const gx = this.edgeDistance(pos.x + e, pos.z) - this.edgeDistance(pos.x - e, pos.z);
    const gz = this.edgeDistance(pos.x, pos.z + e) - this.edgeDistance(pos.x, pos.z - e);
    const len = Math.hypot(gx, gz);
    if (len < 1e-6) return false;
    pos.x -= (gx / len) * d;
    pos.z -= (gz / len) * d;
    return true;
  }

  /** Wo die Horde auf den Weg tritt (je Spawn) und woher sie aus dem Wald kommt. */
  entries() {
    const out = {};
    for (const s of this.spawns) {
      const path = this.paths.find((p) => p.feeder === s.name) || this.paths[0];
      const first = path.points[Math.min(4, path.points.length - 1)];
      out[s.name] = { name: s.name, from: { x: s.x - 3, z: s.z }, x: first.x, z: first.z };
    }
    return out;
  }

  /** Grobe Rauschwerte für Natur und Gelände. */
  noise(x, z, scale, salt) {
    return valueNoise(x * scale, z * scale, this.seed + salt);
  }
}
