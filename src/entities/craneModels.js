// A4: Die Kraniche als Modelle (doppelt fein, 1/32 m, Blick nach +z): Rumpf mit Schmuckfedern, Hals
// mit Kopf, Bein, Flügel und der fliegende Kranich. Verhalten in entities/cranes.js.
// Ein Graukranich: aschgrau, der Vorderhals schwarz, vom Auge zieht ein weißer Streifen den Hals
// hinunter, auf dem Kopf eine rote Kappe; die Schwungfedern sind schwarz, hinten hängen buschige
// Schmuckfedern über den Schwanz.

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';

const BLACK = P.s1;
const WHITE = P.s9;
const CAP = P.f2;

/** Rumpf eines stehenden Kranichs: grau, oben heller, unten dunkler, hinten die hängenden Schmuckfedern. */
export function buildBody() {
  const m = new VoxelModel();
  for (let x = -4; x <= 4; x++) {
    for (let y = 15; y <= 27; y++) {
      for (let z = -9; z <= 9; z++) {
        const d = (x / 4.4) ** 2 + ((y - 21) / 5.6) ** 2 + (z / 9.4) ** 2;
        if (d > 1) continue;
        let c = y >= 25 ? P.s7 : y <= 17 ? P.s5 : P.s6;
        if (Math.abs(x) >= 3 && y >= 20 && y <= 23 && z < 4 && (z - y) % 5 === 0) c = P.s5; // Kante des angelegten Flügels
        m.set(x, y, z, c);
      }
    }
  }
  // Schmuckfedern: buschig über den Schwanz, grau mit dunklen Spitzen
  for (let z = -12; z <= -7; z++) {
    const back = -7 - z; // 0 vorn … 5 hinten
    const half = 3 - Math.floor(back * 0.4);
    const top = 24 - Math.floor(back * 0.5);
    const bottom = 18 - Math.floor(back * 0.9);
    for (let x = -half; x <= half; x++) {
      for (let y = bottom; y <= top; y++) {
        let c = (x + y + z) % 3 === 0 ? P.s3 : P.s4;
        if (y === bottom || back >= 5) c = P.s2;
        m.set(x, y, z, c);
      }
    }
  }
  return m;
}

/**
 * Mitte des Halses auf Höhe y: gerade aufrecht (schräg gestuft las sich die Grenze zwischen dem
 * schwarzen Vorderhals und dem weißen Streifen im Bild wie Zebrastreifen); nach vorn neigt ihn das
 * Picken.
 */
const neckCenter = () => 1;

/** Hals und Kopf (Drehpunkt am Halsansatz: 0, 0, 0): schwarzer Vorderhals, weißer Streifen, rote Kappe, langer Schnabel. */
export function buildNeck() {
  const m = new VoxelModel();
  // Der Hals als Röhre: vorn schwarz, hinten der weiße Streifen; unten grau
  for (let y = 0; y <= 11; y++) {
    const zc = neckCenter(y);
    for (let x = -1; x <= 1; x++) {
      for (let z = Math.floor(zc) - 2; z <= Math.floor(zc) + 2; z++) {
        const f = z + 0.5 - zc; // > 0: vorn (Kehle)
        if (x * x + f * f > 1.6) continue;
        let c;
        if (y >= 5) c = f > 0.1 ? BLACK : WHITE;
        else c = y >= 3 && f > 0.6 ? BLACK : P.s6;
        m.set(x, y, z, c);
      }
    }
  }
  // Der Kopf: schwarz, die rote Kappe oben, weiß hinter dem Auge
  const hz = Math.floor(neckCenter(12));
  m.box(-1, 11, hz - 1, 1, 13, hz + 2, (x, y, z) => {
    if (y === 13 && (x === 1 || x === -1) && z === hz - 1) return null; // rund am Hinterkopf
    if (y === 13 && z >= hz && z <= hz + 1) return CAP;
    if (Math.abs(x) === 1 && y <= 12 && z <= hz) return WHITE; // der Streifen beginnt hinter dem Auge
    return BLACK;
  });
  m.set(-1, 12, hz + 1, P.f3).set(1, 12, hz + 1, P.f3); // Augen
  // Der Schnabel: lang, hell hornfarben, an der Spitze etwas nach unten
  m.box(0, 12, hz + 3, 0, 12, hz + 5, P.s7).set(0, 11, hz + 6, P.s6);
  return m;
}

/**
 * Der Kopf im Schlaf (in Rumpf-Koordinaten): der Hals liegt gefaltet auf dem Rücken, der Kopf
 * obenauf, der Schnabel zeigt nach hinten ins Gefieder.
 */
export function buildTucked() {
  const m = new VoxelModel();
  for (let x = -2; x <= 2; x++) {
    for (let y = 24; y <= 29; y++) {
      for (let z = 0; z <= 7; z++) {
        const d = (x / 2.4) ** 2 + ((y - 26.8) / 2.3) ** 2 + ((z - 3.5) / 3.2) ** 2;
        if (d > 1) continue;
        let c = P.s6;
        if (y >= 28) c = y === 29 && z >= 3 && z <= 4 ? CAP : BLACK; // der Kopf obenauf, die Kappe
        else if (Math.abs(x) === 2 && y >= 26) c = WHITE; // der weiße Streifen des gefalteten Halses
        else if (z >= 6 && y >= 25) c = BLACK; // der Vorderhals
        m.set(x, y, z, c);
      }
    }
  }
  m.set(0, 28, 0, P.s7).set(0, 28, -1, P.s7).set(0, 27, -2, P.s6); // der Schnabel nach hinten
  return m;
}

/** Ein Bein (Drehpunkt an der Hüfte, 0, 0, 0): lang und dunkel, mit Ferse und Zehen. */
export function buildLeg() {
  const m = new VoxelModel();
  for (let y = -15; y <= 0; y++) m.set(0, y, 0, y === -8 ? P.s3 : P.s2);
  m.set(0, -15, 1, P.s2).set(0, -15, 2, P.s2).set(0, -15, -1, P.s2);
  return m;
}

/** Ein Flügel (Drehpunkt an der Schulter): graue Decken vorn, schwarze Schwungfedern hinten und außen, gefingert. */
export function buildWing(side) {
  const m = new VoxelModel();
  for (let k = 0; k < 22; k++) {
    const x = side > 0 ? k : -1 - k;
    const hand = k >= 14;
    const z0 = hand ? -3 + Math.floor((k - 14) * 0.4) : -5;
    const z1 = hand ? 4 - Math.floor((k - 14) * 0.5) : 4;
    for (let z = z0; z <= z1; z++) {
      if (hand && z === z0 && k % 2) continue; // gefingerte Spitzen
      const c = hand ? P.s0 : z <= -3 ? BLACK : z <= 0 ? P.s5 : P.s6;
      m.set(x, 0, z, c);
    }
  }
  return m;
}

/** Ein fliegender Kranich (Rumpf, Hals gestreckt nach vorn, Beine nach hinten): Mitte bei 0. */
export function buildFlyer() {
  const m = new VoxelModel();
  for (let x = -3; x <= 3; x++) {
    for (let y = -3; y <= 3; y++) {
      for (let z = -8; z <= 8; z++) {
        const d = (x / 3.4) ** 2 + (y / 3.2) ** 2 + (z / 8.4) ** 2;
        if (d <= 1) m.set(x, y, z, y >= 2 ? P.s7 : y <= -2 ? P.s5 : P.s6);
      }
    }
  }
  // Der Hals gestreckt: oben der weiße Streifen, an den Seiten und unten schwarz, zum Rumpf hin grau
  for (let z = 8; z <= 15; z++) {
    for (let x = -1; x <= 1; x++) {
      for (let y = 0; y <= 2; y++) {
        if (Math.abs(x) === 1 && y !== 1) continue; // rund
        let c = P.s6;
        if (z >= 11) c = y === 2 ? WHITE : BLACK;
        m.set(x, y, z, c);
      }
    }
  }
  // Der Kopf mit roter Kappe, der Schnabel
  m.box(-1, 0, 16, 1, 2, 18, (x, y, z) => {
    if (y === 2 && z >= 17) return CAP;
    if (Math.abs(x) === 1 && y === 1 && z === 16) return WHITE;
    return BLACK;
  });
  m.box(0, 1, 19, 0, 1, 21, P.s7);
  // Die Beine ragen hinten über den kurzen Schwanz hinaus
  for (const x of [-1, 1]) for (let z = -9; z >= -18; z--) m.set(x, -1, z, z <= -17 ? P.s1 : P.s2);
  return m;
}
