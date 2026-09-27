// Grundriss der Bucht (Meilenstein 9). Alle Positionen in Metern: x nach Osten
// (rechts im Bild, zum See), z nach Süden (zur Kamera hin), y nach oben.
// Statische Objekte liegen auf dem 1/8-m-Raster, damit ihre Kanten exakt auf
// Pixelgrenzen fallen. Die Bucht ist in jedem Spiel gleich; das Wegenetz links
// davon entsteht je Spiel neu (map.js).

import { BAY } from './map.js';

export const V = 1 / 8; // Voxelgröße

export const LAYOUT = {
  // Blickpunkt der Kamera bleibt in diesem Rechteck (rechts: See, links: Spawns).
  // M10: rechts weiter, damit man vom Stegende Balduins Boot zwischen den Inseln sieht
  cameraBounds: { minX: -48, maxX: 21, minZ: -19, maxZ: 19 },

  // Das alte Fischerhaus: Ursprung = Südwest-Ecke unten, 40 × 28 Voxel (5 × 3,5 m).
  shelter: { x: 4.5, z: -9.0, width: 40, depth: 28 },

  // Hof vor dem Haus: letzte Verteidigung (siehe BAY.yard)
  campfire: { x: 0.5, z: -1.75 },
  dock: BAY.dock, // Steg nach Osten in den See
  bollard: { x: 16.0, z: -0.5 }, // Poller an der Südkante des Stegs: hier macht Balduin die Leine fest (M10)
  lighthouse: { x: 22.25, z: -1.0 }, // Leuchtmast am Ende des Stegs (früher Funkturm), Mitte zwischen den Beinen
  beacon: { x: 7.5, z: 1.0 }, // hierhin fällt das Leuchtfeuer: auf den Hof (Lichtinsel, bremst die Horde)
  towerDebris: { x: 10.75, z: 2.5 }, // ein abgebrochenes Stück des Masts am Strand
  wreck: { x: 10.25, z: 9.5 }, // Bootswrack am Strand (gibt einmal Schrott)
  garden: { x: -2.0, z: -9.0 },
  clothesline: { x0: -6.0, x1: -2.5, z: -6.0 },
  woodpile: { x: 3.0, z: -8.5 }, // an der Westwand des Hauses
  choppingBlock: { x: 1.75, z: -6.25 },
  oak: { x: -5.5, z: -10.5 }, // alte Eiche mit Reifenschaukel
  sign: { x: -6.5, z: -1.25 }, // Wegweiser am Hofeingang
  mailbox: { x: -6.25, z: 5.25 },
  start: { x: 5.5, z: -3.0, facing: 0 }, // hier steht Mika am ersten Morgen (vor der Tür)
};

/**
 * Ressourcenquellen in der Bucht (fest). kind: baum, felsen, kiesel, gras,
 * aeste, schrott. model wählt die Form (bei Bäumen: birke, tanne, eiche,
 * jung, jungtanne). Entlang der Wege kommen je Spiel weitere dazu (resources.js).
 */
export const BAY_NODES = [
  { id: 'birke-1', kind: 'baum', model: 'birke', x: -2.0, z: -11.75 },
  { id: 'tanne-1', kind: 'baum', model: 'tanne', x: 8.5, z: -11.75 },
  { id: 'jung-1', kind: 'baum', model: 'jung', x: -6.5, z: 9.5 },
  { id: 'jung-2', kind: 'baum', model: 'jungtanne', x: 1.25, z: 10.0 },
  { id: 'felsen-1', kind: 'felsen', model: 'mittel', x: -6.25, z: -12.0 },
  { id: 'kiesel-1', kind: 'kiesel', x: 12.75, z: 7.75 },
  { id: 'kiesel-2', kind: 'kiesel', x: 11.5, z: -10.5 },
  { id: 'gras-1', kind: 'gras', x: -3.25, z: 9.0 },
  { id: 'gras-2', kind: 'gras', x: -6.75, z: -8.0 },
  { id: 'aeste-1', kind: 'aeste', x: -1.25, z: 8.25 },
  { id: 'aeste-2', kind: 'aeste', x: 6.0, z: -11.25 },
  { id: 'schrott-1', kind: 'schrott', x: 4.75, z: 9.75 },
];

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
