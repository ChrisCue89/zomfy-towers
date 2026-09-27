// Wege der Horde (DESIGN.md 6.2, 6.11): Die Schlurfer treten an den Spawns
// am linken Kartenrand auf die Wege und folgen einem Flussfeld auf dem
// Bauraster zum Zuhause. Das Feld reicht nur über Wegfelder und den Hof – die
// Horde bleibt auf den Wegen. Wer (hinter Mika her) abseits steht, findet
// über ein zweites Feld (`back`) auf den nächsten Weg zurück.
//
// Zwei Felder: `walk` (jeder Bau sperrt) und `brute` (Barrikaden sind
// passierbar, kosten aber viel – dort schlagen sich alle Schlurfer durch).
// Die Horde läuft nach `brute`; ein Bauplatz, der das Zuhause von einem Spawn
// abschneiden würde, wird abgelehnt (Barrikaden schneiden nie ab).

import { LAYOUT } from './layout.js';
import { SPAWN_NAMES } from './map.js';

/** Spawns (Namen nach ihrer Lage am linken Kartenrand). */
export const ENTRY_NAMES = SPAWN_NAMES;

const BARRICADE_COST = 8;
const INF = 1e9;
const CHASE_R = 12; // Umkreis (Zellen) um Mika, in dem Jäger einen Weg um Bauten suchen
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
  constructor(grid, buildingOf, map) {
    this.grid = grid;
    this.buildingOf = buildingOf;
    this.map = map;
    const n = grid.width * grid.height;
    this.walk = new Float32Array(n);
    this.brute = new Float32Array(n);
    this.back = new Float32Array(n); // Schritte bis zum nächsten Weg- oder Hoffeld (abseits)
    this.targets = [];
    this.home = null; // Rechteck des Zuhauses (Wände)
    this.version = 0;
    this._scratch = new Float32Array(n);
    this.chase = new Float32Array((CHASE_R * 2 + 1) ** 2); // Schritte bis Mika (Fenster um sie)
    this._chaseI = null;
    this.resolveEntries();
  }

  /**
   * Erstes Wegfeld je Spawn: das nächste Wegfeld am Spawn, von dem aus es
   * einen Weg zum Zuhause gibt. `from` liegt im Wald links davon.
   */
  resolveEntries() {
    const g = this.grid;
    this.entries = {};
    const known = this.home !== null;
    for (const e of Object.values(this.map.entries())) {
      let best = null;
      let bestD = Infinity;
      for (let k = 0; k < g.path.length; k++) {
        if (!g.path[k] || g.blocked[k]) continue;
        if (known && this.brute[k] >= INF) continue;
        const c = this.cellCenter(k);
        const d = Math.hypot(c.x - e.x, c.z - e.z);
        if (d < bestD) {
          bestD = d;
          best = { k, ...c };
        }
      }
      this.entries[e.name] = { name: e.name, from: { x: e.from.x, z: e.from.z }, k: best.k, x: e.x, z: e.z };
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

  /**
   * Durchgang für eine Zelle: Kosten > 0, INF = gesperrt. Nur Wege und Hof;
   * in der Wegmitte billiger als am Rand. Eine zerstörte Barrikade (Trümmer)
   * ist frei.
   */
  cost(k, brute, extraBlocked) {
    const g = this.grid;
    if ((!g.path[k] && !g.yard[k]) || g.blocked[k]) return INF;
    if (extraBlocked && extraBlocked.has(k)) return INF;
    const id = g.occupant[k];
    if (id === null) return g.pathCost[k];
    const b = this.buildingOf(id);
    if (!b || b.type !== 'barrikade') return INF;
    if (b.broken) return g.pathCost[k];
    return brute ? BARRICADE_COST : INF;
  }

  /** Flussfelder neu berechnen (nach jeder Bauänderung). */
  rebuild() {
    const g = this.grid;
    this.targets = [];
    for (let k = 0; k < this.walk.length; k++) {
      if ((!g.path[k] && !g.yard[k]) || g.blocked[k] || g.occupant[k] !== null) continue;
      const c = this.cellCenter(k);
      if (this.distanceToHome(c.x, c.z) <= 2.6) this.targets.push(k);
    }
    this.fill(this.walk, false, null);
    this.fill(this.brute, true, null);
    this.fillBack();
    this.version++;
  }

  /**
   * Abseits der Wege (hinter Mika her): Schritte bis zum nächsten Feld mit
   * einem Weg nach Hause – über freies, begehbares Land.
   */
  fillBack() {
    const g = this.grid;
    const back = this.back;
    back.fill(INF);
    const queue = this._queue || (this._queue = new Int32Array(back.length));
    let head = 0;
    let tail = 0;
    for (let k = 0; k < back.length; k++) {
      if (this.brute[k] < INF) {
        back[k] = 0;
        queue[tail++] = k;
      }
    }
    while (head < tail) {
      const k = queue[head++];
      const i = k % g.width;
      const j = (k - i) / g.width;
      for (const [di, dj] of N4) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= g.width || nj >= g.height) continue;
        const nk = nj * g.width + ni;
        if (back[nk] < INF || !g.inside[nk] || g.blocked[nk] || g.occupant[nk] !== null) continue;
        back[nk] = back[k] + 1;
        queue[tail++] = nk;
      }
    }
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

  /** Würde ein Bau auf diesen Zellen einen Spawn vom Zuhause abschneiden? (Barrikaden zählen als passierbar) */
  wouldBlock(cells) {
    const g = this.grid;
    const blocked = new Set(cells.map(([i, j]) => g.index(i, j)).filter((k) => k >= 0));
    const field = this._scratch;
    this.fill(field, true, blocked);
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
    const ci = Math.floor(x) - g.minX;
    const cj = Math.floor(z) - g.minZ;
    if (ci < 0 || cj < 0 || ci >= g.width || cj >= g.height) return null;
    const k = cj * g.width + ci;
    let field = brute ? this.brute : this.walk;
    // Abseits der Wege: erst zurück auf den nächsten Weg
    if (field[k] >= INF && this.back[k] < INF) field = this.back;
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
    const start = this.cellCenter(e.k);
    const pos = { x: start.x, z: start.z };
    const dir = { x: 0, z: 0 };
    for (let n = 0; n < 400; n++) {
      points.push({ x: pos.x, z: pos.z });
      if (!this.direction(pos.x, pos.z, true, dir)) break;
      // Von Zellmitte zu Zellmitte (die Richtung zeigt genau auf den Nachbarn)
      pos.x += Math.sign(Math.round(dir.x * 2));
      pos.z += Math.sign(Math.round(dir.z * 2));
    }
    points.push(this.attackPoint(pos.x, pos.z));
    this._traces[name] = points;
    return points;
  }

  /**
   * Kommt ein Jäger über dieses Feld? Freies Land und Trümmer; die künftigen
   * Anbauten des Zuhauses sind bis dahin noch Wiese.
   */
  chasePassable(i, j) {
    const g = this.grid;
    const k = g.index(i, j);
    if (k < 0 || !g.inside[k]) return false;
    if (g.blocked[k] && !(g.house[k] > g.houseLevel)) return false;
    const id = g.occupant[k];
    if (id === null) return true;
    const b = this.buildingOf(id);
    return Boolean(b && b.type === 'barrikade' && b.broken);
  }

  /** Steht zwischen zwei Punkten nichts im Raster (Bau, Hindernis, Wald)? */
  clearLine(ax, az, bx, bz) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.4);
    const ai = Math.floor(ax);
    const aj = Math.floor(az);
    const bi = Math.floor(bx);
    const bj = Math.floor(bz);
    for (let s = 1; s < n; s++) {
      const t = s / n;
      const i = Math.floor(ax + (bx - ax) * t);
      const j = Math.floor(az + (bz - az) * t);
      if ((i === ai && j === aj) || (i === bi && j === bj)) continue;
      if (!this.chasePassable(i, j)) return false;
    }
    return true;
  }

  /** Breitensuche von Mikas Feld aus über das Fenster um sie. */
  fillChase(ci, cj) {
    const size = CHASE_R * 2 + 1;
    const f = this.chase;
    f.fill(INF);
    this._chaseI = ci;
    this._chaseJ = cj;
    this._chaseVersion = this.version;
    this._chaseLevel = this.grid.houseLevel;
    const queue = this._chaseQueue || (this._chaseQueue = new Int32Array(size * size));
    let head = 0;
    let tail = 0;
    const c = CHASE_R * size + CHASE_R;
    f[c] = 0;
    queue[tail++] = c;
    while (head < tail) {
      const l = queue[head++];
      const li = l % size;
      const lj = (l - li) / size;
      for (const [di, dj] of N4) {
        const ni = li + di;
        const nj = lj + dj;
        if (ni < 0 || nj < 0 || ni >= size || nj >= size) continue;
        const nl = nj * size + ni;
        if (f[nl] < INF || !this.chasePassable(ci - CHASE_R + ni, cj - CHASE_R + nj)) continue;
        f[nl] = f[l] + 1;
        queue[tail++] = nl;
      }
    }
  }

  /**
   * Jagd um Hindernisse (m7-r1): Richtung zum nächsten Feld auf dem kürzesten
   * Weg zu Mika (Einheitsvektor) oder null, wenn es keinen gibt. Das Feld wird
   * neu gerechnet, wenn Mika das Feld wechselt oder sich am Bau etwas ändert.
   */
  chaseDirection(x, z, px, pz, out = { x: 0, z: 0 }) {
    const ci = Math.floor(px);
    const cj = Math.floor(pz);
    if (ci !== this._chaseI || cj !== this._chaseJ || this._chaseVersion !== this.version || this._chaseLevel !== this.grid.houseLevel) this.fillChase(ci, cj);
    const size = CHASE_R * 2 + 1;
    const li = Math.floor(x) - ci + CHASE_R;
    const lj = Math.floor(z) - cj + CHASE_R;
    if (li < 0 || lj < 0 || li >= size || lj >= size) return null;
    const f = this.chase;
    let best = f[lj * size + li];
    if (best === 0) return null;
    let bi = 0;
    let bj = 0;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = li + di;
        const nj = lj + dj;
        if (ni < 0 || nj < 0 || ni >= size || nj >= size) continue;
        let d = f[nj * size + ni];
        if (d >= INF) continue;
        if (di && dj) {
          if (f[lj * size + ni] >= INF || f[nj * size + li] >= INF) continue;
          d += 0.4;
        }
        if (d < best) {
          best = d;
          bi = di;
          bj = dj;
        }
      }
    }
    if (!bi && !bj) return null;
    const dx = Math.floor(x) + bi + 0.5 - x;
    const dz = Math.floor(z) + bj + 0.5 - z;
    const len = Math.hypot(dx, dz) || 1;
    out.x = dx / len;
    out.z = dz / len;
    return out;
  }

  /** Ist diese Zelle ein Zielfeld (am Zuhause)? */
  atHome(x, z) {
    const g = this.grid;
    const k = g.index(Math.floor(x), Math.floor(z));
    return k >= 0 && this.brute[k] === 0;
  }

  /** Abstand im Flussfeld (für »wer ist am weitesten vorne«). */
  remaining(x, z) {
    const g = this.grid;
    const k = g.index(Math.floor(x), Math.floor(z));
    if (k < 0) return INF;
    return this.brute[k] < INF ? this.brute[k] : INF;
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
