// Wege der Horde (DESIGN.md 6.11): Die Schlurfer betreten die Lichtung über
// feste Waldpfade und folgen dann einem Flussfeld auf dem Bauraster zum
// Zuhause. Bauten blockieren Felder (»Mazing«); ein Bauplatz, der das Zuhause
// von einem Eingang abschneiden würde, wird abgelehnt.
//
// Zwei Felder: `walk` (Bauten blockieren) und `brute` für Brummer und Anführer
// (Barrikaden sind passierbar, kosten aber viel – dort schlagen sie sich durch).

import { LAYOUT } from './layout.js';

/** Waldpfade: Startpunkte im Wald. Das erste freie Feld wird daraus berechnet. */
export const ENTRIES = {
  west: { x: -18.5, z: 10.2 },
  ost: { x: 18.5, z: 10.2 },
  nordwest: { x: -13.5, z: -13.5 },
  nordost: { x: 12.5, z: -13.5 },
};
export const ENTRY_NAMES = Object.keys(ENTRIES);

const BARRICADE_COST = 8;
const INF = 1e9;
const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export class Pathing {
  /**
   * @param {import('./grid.js').BuildGrid} grid
   * @param {(id:number) => object|null} buildingOf Bau zu einer Belegung
   */
  constructor(grid, buildingOf) {
    this.grid = grid;
    this.buildingOf = buildingOf;
    const n = grid.width * grid.height;
    this.walk = new Float32Array(n);
    this.brute = new Float32Array(n);
    this.targets = [];
    this.home = null; // Rechteck des Zuhauses (Wände)
    this.version = 0;
    this._scratch = new Float32Array(n);
    this.resolveEntries();
  }

  /**
   * Erstes Feld auf der Lichtung je Waldpfad: das nächste freie Feld, von dem
   * aus es einen Weg zum Zuhause gibt (vom Waldrand aus gesucht).
   */
  resolveEntries() {
    const g = this.grid;
    this.entries = {};
    const known = this.home !== null;
    for (const [name, e] of Object.entries(ENTRIES)) {
      let best = null;
      let bestD = Infinity;
      for (let k = 0; k < g.inside.length; k++) {
        if (!g.inside[k] || g.blocked[k]) continue;
        if (known && this.walk[k] >= INF) continue;
        const c = this.cellCenter(k);
        const d = Math.hypot(c.x - e.x, c.z - e.z);
        if (d < bestD) {
          bestD = d;
          best = { k, ...c };
        }
      }
      this.entries[name] = { name, from: { x: e.x, z: e.z }, k: best.k, x: best.x, z: best.z };
    }
  }

  /** Ziel: freie Felder rund ums Zuhause (bis 2,6 m von den Wänden). */
  setHome(rect) {
    this.home = rect;
    this.rebuild();
    this.resolveEntries();
  }

  cellCenter(k) {
    const g = this.grid;
    return { x: g.minX + (k % g.width) + 0.5, z: g.minZ + Math.floor(k / g.width) + 0.5 };
  }

  distanceToHome(x, z) {
    const r = this.home;
    const dx = Math.max(r.minX - x, 0, x - r.maxX);
    const dz = Math.max(r.minZ - z, 0, z - r.maxZ);
    return Math.hypot(dx, dz);
  }

  /** Nächster Punkt an der Hauswand, etwas davor – dort wird angegriffen. */
  attackPoint(x, z, out = { x: 0, z: 0 }) {
    const r = this.home;
    const px = Math.max(r.minX, Math.min(x, r.maxX));
    const pz = Math.max(r.minZ, Math.min(z, r.maxZ));
    let dx = x - px;
    let dz = z - pz;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d;
    dz /= d;
    out.x = px + dx * 0.45;
    out.z = pz + dz * 0.45;
    return out;
  }

  /** Durchgang für eine Zelle: 0 = frei, Kosten > 0, INF = gesperrt. */
  cost(k, brute, extraBlocked) {
    const g = this.grid;
    if (!g.inside[k] || g.blocked[k]) return INF;
    if (extraBlocked && extraBlocked.has(k)) return INF;
    const id = g.occupant[k];
    if (id === null) return 1;
    if (!brute) return INF;
    const b = this.buildingOf(id);
    return b && b.type === 'barrikade' ? BARRICADE_COST : INF;
  }

  /** Beide Flussfelder neu berechnen (nach jeder Bauänderung). */
  rebuild() {
    const g = this.grid;
    this.targets = [];
    for (let k = 0; k < this.walk.length; k++) {
      if (!g.inside[k] || g.blocked[k] || g.occupant[k] !== null) continue;
      const c = this.cellCenter(k);
      if (this.distanceToHome(c.x, c.z) <= 2.6) this.targets.push(k);
    }
    this.fill(this.walk, false, null);
    this.fill(this.brute, true, null);
    this.version++;
  }

  /**
   * Entfernungsfeld von den Zielfeldern aus. Ohne Barrikaden-Kosten reicht
   * Breitensuche; mit ihnen (brute) Dijkstra über einen kleinen Binärheap.
   */
  fill(field, brute, extraBlocked) {
    const g = this.grid;
    field.fill(INF);
    const heap = this._heap || (this._heap = new MinHeap(this.walk.length * 2));
    heap.clear();
    for (const k of this.targets) {
      if (extraBlocked && extraBlocked.has(k)) continue;
      field[k] = 0;
      heap.push(k, 0);
    }
    while (heap.size) {
      const { key: k, prio } = heap.pop();
      if (prio > field[k]) continue;
      const i = k % g.width;
      const j = Math.floor(k / g.width);
      for (const [di, dj] of N4) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= g.width || nj >= g.height) continue;
        const nk = nj * g.width + ni;
        const c = this.cost(nk, brute, extraBlocked);
        if (c >= INF) continue;
        const d = field[k] + c;
        if (d < field[nk]) {
          field[nk] = d;
          heap.push(nk, d);
        }
      }
    }
  }

  /** Würde ein Bau auf diesen Zellen einen Eingang vom Zuhause abschneiden? */
  wouldBlock(cells) {
    const g = this.grid;
    const blocked = new Set(cells.map(([i, j]) => g.index(i, j)).filter((k) => k >= 0));
    const field = this._scratch;
    this.fill(field, false, blocked);
    for (const e of Object.values(this.entries)) {
      if (blocked.has(e.k) || field[e.k] >= INF) return true;
    }
    return false;
  }

  /**
   * Richtung zum nächsten Feld auf dem Weg nach Hause (Einheitsvektor) oder
   * null, wenn die Zelle schon ein Ziel ist bzw. kein Weg existiert.
   */
  direction(x, z, brute, out = { x: 0, z: 0 }) {
    const g = this.grid;
    const field = brute ? this.brute : this.walk;
    const ci = Math.floor(x) - g.minX;
    const cj = Math.floor(z) - g.minZ;
    if (ci < 0 || cj < 0 || ci >= g.width || cj >= g.height) return null;
    const k = cj * g.width + ci;
    let best = field[k];
    if (best === 0) return null;
    let bx = 0;
    let bz = 0;
    // 8 Nachbarn, diagonal nur, wenn beide Kanten frei sind (keine Ecken schneiden)
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= g.width || nj >= g.height) continue;
        const nk = nj * g.width + ni;
        let d = field[nk];
        if (d >= INF) continue;
        if (di && dj) {
          if (field[cj * g.width + ni] >= INF || field[nj * g.width + ci] >= INF) continue;
          d += 0.4;
        }
        if (d < best) {
          best = d;
          bx = di;
          bz = dj;
        }
      }
    }
    if (!bx && !bz) return null;
    // Richtung zur Mitte des besten Nachbarfelds
    const tx = g.minX + ci + bx + 0.5;
    const tz = g.minZ + cj + bz + 0.5;
    const dx = tx - x;
    const dz = tz - z;
    const len = Math.hypot(dx, dz) || 1;
    out.x = dx / len;
    out.z = dz / len;
    return out;
  }

  /**
   * Weg eines Waldpfads bis an die Hauswand als Punktliste (Wegvorschau beim
   * Bauen). Gilt bis zur nächsten Bauänderung.
   */
  trace(name) {
    if (this._traceVersion !== this.version) {
      this._traceVersion = this.version;
      this._traces = {};
    }
    if (this._traces[name]) return this._traces[name];
    const e = this.entries[name];
    const points = [{ x: e.from.x, z: e.from.z }];
    const pos = { x: e.x, z: e.z };
    const dir = { x: 0, z: 0 };
    for (let n = 0; n < 400; n++) {
      points.push({ x: pos.x, z: pos.z });
      if (!this.direction(pos.x, pos.z, false, dir)) break;
      // Von Zellmitte zu Zellmitte (die Richtung zeigt genau auf den Nachbarn)
      pos.x += Math.sign(Math.round(dir.x * 2));
      pos.z += Math.sign(Math.round(dir.z * 2));
    }
    points.push(this.attackPoint(pos.x, pos.z));
    this._traces[name] = points;
    return points;
  }

  /** Ist diese Zelle ein Zielfeld (am Zuhause)? */
  atHome(x, z) {
    const g = this.grid;
    const k = g.index(Math.floor(x), Math.floor(z));
    return k >= 0 && this.walk[k] === 0;
  }

  /** Abstand im Flussfeld (für »wer ist am weitesten vorne«). */
  remaining(x, z, brute = false) {
    const g = this.grid;
    const k = g.index(Math.floor(x), Math.floor(z));
    if (k < 0) return INF;
    return (brute ? this.brute : this.walk)[k];
  }
}

/** Rechteck der Wände des Zuhauses je Ausbaustufe (Weltkoordinaten). */
export function homeRect(level) {
  const s = LAYOUT.shelter;
  const V = 1 / 8;
  const maxX = level >= 2 ? s.x + 58 * V : s.x + s.width * V;
  const maxZ = level >= 2 ? s.z + (s.depth + 6) * V : s.z + s.depth * V;
  return { minX: s.x, minZ: s.z, maxX, maxZ };
}

/** Kleiner Binärheap (Schlüssel = Zellindex, Priorität = Entfernung). */
class MinHeap {
  constructor(capacity) {
    this.keys = new Int32Array(capacity);
    this.prios = new Float32Array(capacity);
    this.size = 0;
    this._out = { key: 0, prio: 0 };
  }

  clear() {
    this.size = 0;
  }

  push(key, prio) {
    if (this.size >= this.keys.length) return;
    let i = this.size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.prios[p] <= prio) break;
      this.keys[i] = this.keys[p];
      this.prios[i] = this.prios[p];
      i = p;
    }
    this.keys[i] = key;
    this.prios[i] = prio;
  }

  pop() {
    const out = this._out;
    out.key = this.keys[0];
    out.prio = this.prios[0];
    const lastKey = this.keys[--this.size];
    const lastPrio = this.prios[this.size];
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      if (l >= this.size) break;
      const r = l + 1;
      const c = r < this.size && this.prios[r] < this.prios[l] ? r : l;
      if (this.prios[c] >= lastPrio) break;
      this.keys[i] = this.keys[c];
      this.prios[i] = this.prios[c];
      i = c;
    }
    this.keys[i] = lastKey;
    this.prios[i] = lastPrio;
    return out;
  }
}
