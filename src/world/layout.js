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

/**
 * Ressourcenquellen (Meilenstein 2). kind: baum, felsen, kiesel, gras, aeste,
 * schrott. model wählt die Form (bei Bäumen: birke, tanne, eiche, jung).
 */
export const NODES = [
  { id: 'birke-1', kind: 'baum', model: 'birke', x: -13.5, z: -6.5 },
  { id: 'birke-2', kind: 'baum', model: 'birke', x: 12.75, z: -3.0 },
  { id: 'birke-3', kind: 'baum', model: 'birke', x: 13.5, z: 5.5 },
  { id: 'tanne-1', kind: 'baum', model: 'tanne', x: -14.0, z: 7.0 },
  { id: 'eiche-1', kind: 'baum', model: 'eiche', x: 13.0, z: -9.5 },
  { id: 'jung-1', kind: 'baum', model: 'jung', x: -7.75, z: -2.75 },
  { id: 'jung-2', kind: 'baum', model: 'jungtanne', x: -8.0, z: -8.75 },
  { id: 'jung-3', kind: 'baum', model: 'jung', x: -5.25, z: -9.75 },
  { id: 'jung-4', kind: 'baum', model: 'jungtanne', x: 5.0, z: -9.75 },
  { id: 'jung-5', kind: 'baum', model: 'jung', x: 7.25, z: -10.5 },
  { id: 'jung-6', kind: 'baum', model: 'jungtanne', x: -10.75, z: 7.25 },
  { id: 'jung-7', kind: 'baum', model: 'jung', x: 10.25, z: 5.0 },
  { id: 'felsen-1', kind: 'felsen', model: 'gross', x: 12.25, z: 2.25 },
  { id: 'felsen-2', kind: 'felsen', model: 'mittel', x: -6.5, z: 6.5 },
  { id: 'felsen-3', kind: 'felsen', model: 'mittel', x: -3.75, z: 10.5 },
  { id: 'kiesel-1', kind: 'kiesel', x: 6.25, z: -3.25 },
  { id: 'kiesel-2', kind: 'kiesel', x: 10.5, z: 6.25 },
  { id: 'kiesel-3', kind: 'kiesel', x: -6.0, z: 5.5 },
  { id: 'kiesel-4', kind: 'kiesel', x: -3.5, z: 2.75 },
  { id: 'kiesel-5', kind: 'kiesel', x: 7.0, z: -4.25 },
  { id: 'gras-1', kind: 'gras', x: -7.5, z: 1.5 },
  { id: 'gras-2', kind: 'gras', x: 7.75, z: 3.25 },
  { id: 'gras-3', kind: 'gras', x: -3.25, z: 6.25 },
  { id: 'gras-4', kind: 'gras', x: 9.0, z: -1.5 },
  { id: 'gras-5', kind: 'gras', x: -9.75, z: -6.5 },
  { id: 'gras-6', kind: 'gras', x: 1.75, z: 5.5 },
  { id: 'aeste-1', kind: 'aeste', x: -6.5, z: -6.75 },
  { id: 'aeste-2', kind: 'aeste', x: 6.5, z: -7.75 },
  { id: 'aeste-3', kind: 'aeste', x: -12.5, z: 5.25 },
  // Astbündel wachsen jeden Tag nach: die Holzquelle für Tage, an denen die Bäume noch Stümpfe sind
  { id: 'aeste-4', kind: 'aeste', x: -4.75, z: 8.0 },
  { id: 'aeste-5', kind: 'aeste', x: 8.25, z: 1.75 },
  { id: 'aeste-6', kind: 'aeste', x: -11.25, z: -2.25 },
  { id: 'schrott-1', kind: 'schrott', x: -12.25, z: 9.25 },
  { id: 'schrott-2', kind: 'schrott', x: 11.25, z: 9.5 },
  { id: 'schrott-3', kind: 'schrott', x: -9.25, z: -8.5 },
];

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
