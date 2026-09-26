// Kollision in der Bodenebene (x/z): Kreise, achsenparallele Rechtecke und
// eine elliptische Außengrenze der Lichtung.

export class Colliders {
  constructor() {
    this.circles = [];
    this.boxes = [];
    this.bounds = null; // { cx, cz, rx, rz }
  }

  addCircle(x, z, r, tag = null) {
    const c = { x, z, r, tag, enabled: true };
    this.circles.push(c);
    return c;
  }

  addBox(minX, minZ, maxX, maxZ, tag = null) {
    const b = { minX: Math.min(minX, maxX), minZ: Math.min(minZ, maxZ), maxX: Math.max(minX, maxX), maxZ: Math.max(minZ, maxZ), tag, enabled: true };
    this.boxes.push(b);
    return b;
  }

  /** Außengrenze als Superellipse (power 2 = Ellipse, 4 = abgerundetes Rechteck). */
  setBounds(cx, cz, rx, rz, power = 2) {
    this.bounds = { cx, cz, rx, rz, power };
  }

  /** Position (Objekt mit x/z) aus allen Hindernissen herausschieben. */
  resolve(pos, radius) {
    for (let iteration = 0; iteration < 3; iteration++) {
      let moved = false;
      for (const c of this.circles) {
        if (!c.enabled) continue;
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
      }
      for (const b of this.boxes) {
        if (!b.enabled) continue;
        const nx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const nz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        let dx = pos.x - nx;
        let dz = pos.z - nz;
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
      if (this.bounds) {
        const { cx, cz, rx, rz, power } = this.bounds;
        const ex = Math.abs(pos.x - cx) / (rx - radius);
        const ez = Math.abs(pos.z - cz) / (rz - radius);
        const e = Math.pow(Math.pow(ex, power) + Math.pow(ez, power), 1 / power);
        if (e > 1) {
          pos.x = cx + (pos.x - cx) / e;
          pos.z = cz + (pos.z - cz) / e;
          moved = true;
        }
      }
      if (!moved) break;
    }
    return pos;
  }

  /** Liegt der Punkt (mit Rand) in einem Hindernis? Die Außengrenze zählt nicht. */
  blocks(x, z, margin = 0) {
    for (const c of this.circles) {
      const r = c.r + margin;
      if ((x - c.x) ** 2 + (z - c.z) ** 2 < r * r) return true;
    }
    for (const b of this.boxes) {
      if (x > b.minX - margin && x < b.maxX + margin && z > b.minZ - margin && z < b.maxZ + margin) return true;
    }
    return false;
  }

  /** In kleinen Schritten bewegen, damit dünne Wände nicht übersprungen werden. */
  move(pos, dx, dz, radius) {
    const distance = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(distance / 0.08));
    for (let i = 0; i < steps; i++) {
      pos.x += dx / steps;
      pos.z += dz / steps;
      this.resolve(pos, radius);
    }
    return pos;
  }
}
