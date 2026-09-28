// Kollision in der Bodenebene (x/z): Kreise, achsenparallele Rechtecke und
// die Außengrenze des Begehbaren (Karte: Wald und Wasser, siehe map.js). Ein
// Raster aus 2-m-Zellen sortiert die Hindernisse vor, damit auch viele
// Schlurfer schnell prüfen.

const CELL = 2;

export class Colliders {
  constructor() {
    this.circles = [];
    this.boxes = [];
    this.boundsFn = null; // (pos, radius, horde) => verschoben? – schiebt ins Begehbare zurück
    this.cells = new Map(); // "i,j" -> Hindernisse
    this.stamp = 0;
    this._near = [];
  }

  key(i, j) {
    return i * 4096 + j;
  }

  /** Zellen, die ein Rechteck überdeckt, aufrufen. */
  eachCell(minX, minZ, maxX, maxZ, fn) {
    const i0 = Math.floor(minX / CELL);
    const i1 = Math.floor(maxX / CELL);
    const j0 = Math.floor(minZ / CELL);
    const j1 = Math.floor(maxZ / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) fn(this.key(i, j));
  }

  insert(c, minX, minZ, maxX, maxZ) {
    c.cellKeys = [];
    this.eachCell(minX, minZ, maxX, maxZ, (k) => {
      let list = this.cells.get(k);
      if (!list) this.cells.set(k, (list = []));
      list.push(c);
      c.cellKeys.push(k);
    });
  }

  addCircle(x, z, r, tag = null) {
    const c = { x, z, r, tag, enabled: true, seen: 0 };
    this.circles.push(c);
    this.insert(c, x - r, z - r, x + r, z + r);
    return c;
  }

  addBox(minX, minZ, maxX, maxZ, tag = null) {
    const b = { minX: Math.min(minX, maxX), minZ: Math.min(minZ, maxZ), maxX: Math.max(minX, maxX), maxZ: Math.max(minZ, maxZ), tag, enabled: true, seen: 0 };
    this.boxes.push(b);
    this.insert(b, b.minX, b.minZ, b.maxX, b.maxZ);
    return b;
  }

  /** Hindernis entfernen (z. B. beim Abreißen oder Umbauen). */
  remove(collider) {
    const list = 'r' in collider ? this.circles : this.boxes;
    const index = list.indexOf(collider);
    if (index >= 0) list.splice(index, 1);
    for (const k of collider.cellKeys || []) {
      const cell = this.cells.get(k);
      const at = cell ? cell.indexOf(collider) : -1;
      if (at >= 0) cell.splice(at, 1);
    }
  }

  /** Außengrenze: Funktion, die eine Position ins Begehbare zurückschiebt. */
  setBoundsFn(fn) {
    this.boundsFn = fn;
  }

  /** Alle Hindernisse im Umkreis (ohne Doppelte). Die Liste wird wiederverwendet. */
  near(x, z, reach) {
    const out = this._near;
    out.length = 0;
    const stamp = ++this.stamp;
    this.eachCell(x - reach, z - reach, x + reach, z + reach, (k) => {
      const list = this.cells.get(k);
      if (!list) return;
      for (const c of list) {
        if (c.seen === stamp || !c.enabled) continue;
        c.seen = stamp;
        out.push(c);
      }
    });
    return out;
  }

  /**
   * Position (Objekt mit x/z) aus allen Hindernissen herausschieben.
   * @param {{bounds?: boolean, horde?: boolean, climb?: boolean}} [options] bounds =
   *   Außengrenze beachten; horde = Schlurfer laufen durch Hindernisse mit
   *   `hordeFree` und dürfen auf den Wegen auch dort gehen, wo die Figur nicht
   *   hinkommt; climb = die Figur klettert über Hindernisse mit `climb`
   *   (eigene Barrikaden, m12-r1)
   */
  resolve(pos, radius, { bounds = true, horde = false, climb = false } = {}) {
    for (let iteration = 0; iteration < 3; iteration++) {
      let moved = false;
      for (const c of this.near(pos.x, pos.z, radius + 1)) {
        if (horde && c.hordeFree) continue;
        if (climb && c.climb) continue;
        if ('r' in c) {
          const dx = pos.x - c.x;
          const dz = pos.z - c.z;
          const min = radius + c.r;
          const d2 = dx * dx + dz * dz;
          if (d2 < min * min) {
            const d = Math.sqrt(d2) || 0.0001;
            const push = min - d;
            pos.x += (dx / d) * push;
            pos.z += (dz / d) * push;
            moved = true;
          }
          continue;
        }
        const b = c;
        const nx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const nz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        const dx = pos.x - nx;
        const dz = pos.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 < radius * radius) {
          if (d2 > 1e-9) {
            const d = Math.sqrt(d2);
            pos.x += (dx / d) * (radius - d);
            pos.z += (dz / d) * (radius - d);
          } else {
            // Mittelpunkt steckt im Rechteck: zur nächsten Kante hinaus.
            const left = pos.x - b.minX;
            const right = b.maxX - pos.x;
            const top = pos.z - b.minZ;
            const bottom = b.maxZ - pos.z;
            const m = Math.min(left, right, top, bottom);
            if (m === left) pos.x = b.minX - radius;
            else if (m === right) pos.x = b.maxX + radius;
            else if (m === top) pos.z = b.minZ - radius;
            else pos.z = b.maxZ + radius;
          }
          moved = true;
        }
      }
      if (bounds && this.boundsFn && this.boundsFn(pos, radius, horde)) moved = true;
      if (!moved) break;
    }
    return pos;
  }

  /** Liegt der Punkt (mit Rand) in einem Hindernis? Die Außengrenze zählt nicht. */
  blocks(x, z, margin = 0) {
    for (const c of this.near(x, z, margin + 1)) {
      if ('r' in c) {
        const r = c.r + margin;
        if ((x - c.x) ** 2 + (z - c.z) ** 2 < r * r) return true;
      } else if (x > c.minX - margin && x < c.maxX + margin && z > c.minZ - margin && z < c.maxZ + margin) {
        return true;
      }
    }
    return false;
  }

  /** In kleinen Schritten bewegen, damit dünne Wände nicht übersprungen werden. */
  move(pos, dx, dz, radius, options) {
    const distance = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(distance / 0.08));
    for (let i = 0; i < steps; i++) {
      pos.x += dx / steps;
      pos.z += dz / steps;
      this.resolve(pos, radius, options);
    }
    return pos;
  }
}
