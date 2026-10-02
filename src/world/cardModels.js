// Modelle zum Kartenabend (M28, im Maß 1/32): der Klapptisch mit kariertem Tuch,
// Hackklötze als Sitze und die sechs Einsätze, die auf dem Tisch liegen und nach
// dem ersten Sieg auf dem Kaminsims stehen. Ursprung am Boden bzw. auf der
// Tischplatte, um die Mitte gebaut; Süden (+z) ist die Seite zur Kamera.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';
import { deckColor, logZ } from './voxelKit.js';

/** Höhe der Tischplatte (Voxel à 1/32 m): Einsätze stehen darauf. */
export const TABLE_TOP = 17;

/**
 * Klapptisch (0,9 × 0,6 m): Brettplatte mit Fugen, vier gekreuzte Beine, ein rot-weiß
 * kariertes Tuch, das an der Südseite fast bis zum Boden hängt (Beine unter dem
 * Tisch sieht man nicht), eine Kerze in einem Glas an der Ecke.
 */
export function buildCardTable(seed) {
  const m = new VoxelModel();
  const hx = 14;
  const hz = 9;
  // Beine (gekreuzt, an den Seiten)
  for (const sx of [-hx + 2, hx - 3]) {
    for (let y = 0; y < TABLE_TOP; y++) {
      const t = y / TABLE_TOP;
      m.set(sx, y, Math.round(-hz + 2 + t * (2 * hz - 4)), P.e3).set(sx + 1, y, Math.round(-hz + 2 + t * (2 * hz - 4)), P.e4);
      m.set(sx, y, Math.round(hz - 2 - t * (2 * hz - 4)), P.e3).set(sx + 1, y, Math.round(hz - 2 - t * (2 * hz - 4)), P.e4);
    }
  }
  // Platte aus Brettern
  m.box(-hx, TABLE_TOP - 1, -hz, hx, TABLE_TOP - 1, hz, (x, y, z) => deckColor(z + 20, x + 20, seed, { width: 4, run: 40, tones: [P.e5, P.e6, P.e5] }));
  // Tuch: kariert, Rand hängt nach Süden und an den Seiten über
  const check = (x, z) => ((Math.floor((x + 40) / 3) + Math.floor((z + 40) / 3)) % 2 ? P.r3 : P.s9);
  m.box(-hx + 2, TABLE_TOP, -hz + 1, hx - 2, TABLE_TOP, hz, (x, y, z) => {
    const c = check(x, z);
    return hash3(x >> 1, 0, z >> 1, seed) < 0.06 ? (c === P.s9 ? P.s8 : P.r2) : c;
  });
  for (let y = 3; y < TABLE_TOP; y++) {
    for (let x = -hx + 2; x <= hx - 2; x++) {
      // Südkante: Falten (jede vierte Spalte eine Stufe dunkler), unten ein Saum
      const fold = (x + 40) % 4 === 0;
      const c = check(x, y);
      m.set(x, y, hz + 1, y === 3 ? P.r1 : fold ? (c === P.s9 ? P.s7 : P.r2) : c);
    }
  }
  for (const sx of [-hx + 1, hx - 1]) for (let y = 9; y < TABLE_TOP; y++) for (let z = -hz + 1; z <= hz + 1; z++) m.set(sx, y, z, y === 9 ? P.r1 : check(z, y) === P.s9 ? P.s8 : P.r2);
  // Kerze im Glas (Nordostecke): Wachs, Docht, ein Glasrand
  m.box(hx - 6, TABLE_TOP + 1, -hz + 3, hx - 4, TABLE_TOP + 4, -hz + 5, (x, y) => (y === TABLE_TOP + 4 ? P.s9 : P.s8));
  m.set(hx - 5, TABLE_TOP + 5, -hz + 4, P.n1);
  for (const [x, z] of [[hx - 7, -hz + 3], [hx - 7, -hz + 5], [hx - 3, -hz + 3], [hx - 3, -hz + 5], [hx - 5, -hz + 2], [hx - 5, -hz + 6]]) m.set(x, TABLE_TOP + 1, z, P.b5).set(x, TABLE_TOP + 2, z, P.b4);
  return m;
}

/** Flamme der Kerze (Glüh-Material, ein Voxel über dem Docht). */
export function buildCandleFlame() {
  const m = new VoxelModel();
  m.set(0, 0, 0, P.f7).set(0, 1, 0, P.f6);
  return m;
}

/** Hackklotz als Hocker (0,3 m hoch): Rinde, Jahresringe oben, eine Axtkerbe. */
export function buildStump(seed) {
  const m = new VoxelModel();
  const r = 5.6;
  m.cylinder(0, 0, 0, 8, r, (x, y, z) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    if (y === 8) {
      if (d > r - 1.2) return P.e3;
      return Math.floor(d * 1.3) % 2 ? P.e7 : P.e8; // Jahresringe
    }
    return hash3(x, y >> 1, z, seed) < 0.3 ? P.e2 : d > r - 0.6 && (x + y) % 3 === 0 ? P.e4 : P.e3;
  });
  m.set(2, 8, -1, P.e5).set(3, 8, -1, P.e5).set(2, 8, 0, P.e6); // Kerbe
  void logZ;
  return m;
}

/** Berts Grinsekürbis: kleiner Kürbis mit breitem, schiefem Grinsen. */
function grinsekuerbis() {
  const m = new VoxelModel();
  m.ellipsoid(0, 3.5, 0, 4.5, 3.6, 4.2, (x, y, z, dx, dy) => (Math.abs(((Math.atan2(z + 0.5, x + 0.5) / Math.PI) * 4 + 8) % 1) < 0.15 ? P.f2 : dy > 0.4 ? P.f5 : P.f4));
  m.box(0, 7, 0, 0, 8, 0, P.g3).set(1, 8, 0, P.g4);
  // Gesicht nach Süden: Augen und ein schiefes Grinsen
  for (const [x, y] of [[-2, 4], [2, 4], [-3, 2], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 2], [3, 3]]) m.set(x, y, 4, P.f7);
  return m;
}

/** Junas Funkabzeichen: runde Blechplakette mit Blitz und Antennenbogen. */
function funkabzeichen() {
  const m = new VoxelModel();
  m.cylinder(0, 0, 0, 0, 3.6, (x, y, z) => (Math.hypot(x + 0.5, z + 0.5) > 2.8 ? P.s7 : P.b3));
  for (const [x, z] of [[0, -2], [1, -1], [0, 0], [-1, 0], [0, 1], [-1, 2]]) m.set(x, 1, z, P.f6);
  return m;
}

/** Balduins Taschenuhr: Goldgehäuse, helles Zifferblatt, Zeiger, Kette. */
function taschenuhr() {
  const m = new VoxelModel();
  m.cylinder(0, 0, 0, 1, 3.8, (x, y, z) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    if (y === 1 && d < 2.9) return P.s9;
    return d > 3.2 ? P.f4 : P.f5;
  });
  m.set(0, 2, 0, P.n1).set(0, 2, -1, P.n1).set(1, 2, 0, P.n1); // Zeiger
  m.set(0, 1, -4, P.f6).set(0, 1, -5, P.f5); // Krone
  for (let i = 0; i < 6; i++) m.set(1 + i, 0, -5 - (i % 2), i % 2 ? P.f4 : P.f5); // Kette
  return m;
}

/** Hildes Kartenbeutel: gestrickt, rot mit hellem Zopfmuster, Kordel oben. */
function kartenbeutel() {
  const m = new VoxelModel();
  m.ellipsoid(0, 3, 0, 3.6, 3.2, 2.6, (x, y) => ((x + y + 20) % 3 === 0 ? P.a1 : y > 3 ? P.r3 : P.r2));
  m.box(-1, 6, -1, 1, 6, 1, P.r1);
  m.set(-2, 7, 0, P.s8).set(2, 7, 0, P.s8).set(0, 7, 0, P.s9);
  return m;
}

/** Yusufs Teedose: grüne Blechdose mit goldenem Deckel und Etikett. */
function teedose() {
  const m = new VoxelModel();
  m.cylinder(0, 0, 0, 5, 2.8, (x, y, z) => (y === 5 ? P.f5 : z + 0.5 > 1.5 && y >= 2 && y <= 3 ? P.s9 : (x + 0.5 < -1 ? P.t3 : P.t2)));
  m.cylinder(0, 0, 6, 6, 3.1, P.f4);
  return m;
}

/** Fietes Flaschenschiff: liegende Flasche (Glasrand), innen ein Segelboot, Korken. */
function flaschenschiff() {
  const m = new VoxelModel();
  for (let x = -5; x <= 4; x++) {
    for (const [y, z] of [[0, -2], [0, 2], [4, -2], [4, 2], [0, -1], [0, 1], [4, -1], [4, 1], [0, 0], [4, 0], [1, -2], [2, -2], [3, -2], [1, 2], [2, 2], [3, 2]]) m.set(x, y, z, x === -5 || x === 4 ? P.b4 : P.b5);
  }
  m.box(5, 1, -1, 6, 3, 1, P.e5); // Hals mit Korken
  m.box(-3, 1, 0, 2, 1, 0, P.e4); // Rumpf
  m.box(-1, 2, 0, -1, 3, 0, P.e3); // Mast
  m.set(0, 3, 0, P.s9).set(0, 2, 0, P.s9).set(-2, 2, 0, P.s9); // Segel
  return m;
}

const STAKE_BUILDERS = { grinsekuerbis, funkabzeichen, taschenuhr, kartenbeutel, teedose, flaschenschiff };

/** Einsatz-Modell nach Name (data/cards.js STAKES). */
export function buildStake(id) {
  return (STAKE_BUILDERS[id] || grinsekuerbis)();
}
