// Grundriss der Lichtung. Alle Positionen in Metern: x nach Osten, z nach
// Süden (zur Kamera hin), y nach oben. Statische Objekte liegen auf dem
// 1/8-m-Raster, damit ihre Kanten exakt auf Pixelgrenzen fallen.

export const V = 1 / 8; // Voxelgröße

export const LAYOUT = {
  // Begehbare Fläche: Superellipse (Exponent 4) – fast ein abgerundetes Rechteck.
  clearing: { cx: 0, cz: 0.5, rx: 16, rz: 12.5, power: 4 },
  cameraBounds: { minX: -9.5, maxX: 9.5, minZ: -6.5, maxZ: 7.5 },

  // Notunterkunft: Ursprung = Südwest-Ecke unten, 40 × 28 Voxel (5 × 3,5 m).
  shelter: { x: -2.5, z: -6.0, width: 40, depth: 28 },

  campfire: { x: 4.5, z: 0.5 },
  road: { z0: 8.75, z1: 11.75 },
  path: [
    [-1.0, -2.3],
    [-0.7, 0.2],
    [0.2, 2.6],
    [0.3, 5.2],
    [-0.2, 7.4],
    [-0.4, 9.2],
  ],
  sidePath: [
    [-0.6, 0.6],
    [1.4, 1.0],
    [3.0, 0.7],
  ],
  car: { x: -8.0, z: 9.75 },
  sign: { x: 2.25, z: 8.0 },
  mailbox: { x: -1.75, z: 7.625 },
  tower: { x: 9.5, z: -7.0 },
  streetLamp: { x: 7.0, z: 8.125 },
  clothesline: { x0: -10.0, x1: -6.0, z: -4.0 },
  woodpile: { x: -3.5, z: -5.5 },
  choppingBlock: { x: -5.25, z: -1.25 },
  garden: { x: 3.75, z: -6.25 },
  oak: { x: -11.0, z: 3.0 },
  roadBlockWest: { x: -15.5, z: 10.25 },
  roadBlockEast: { x: 15.25, z: 10.25 },
};

/** Abstandsmaß zur Lichtungsgrenze: < 1 innen, 1 = Grenze, > 1 außen. */
export function clearingDistance(x, z) {
  const { cx, cz, rx, rz, power } = LAYOUT.clearing;
  const dx = Math.abs(x - cx) / rx;
  const dz = Math.abs(z - cz) / rz;
  return Math.pow(Math.pow(dx, power) + Math.pow(dz, power), 1 / power);
}

/** Abstand eines Punkts zu einem Polygonzug. */
export function distanceToPolyline(x, z, points) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    const len2 = vx * vx + vz * vz;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len2)) : 0;
    const px = ax + vx * t - x;
    const pz = az + vz * t - z;
    best = Math.min(best, Math.hypot(px, pz));
  }
  return best;
}

export function snapV(value) {
  return Math.round(value / V) * V;
}
