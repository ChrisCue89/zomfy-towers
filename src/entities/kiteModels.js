// Modelle für Pims Drachen (N9) im Maß 1/32 m: der Drachen selbst (Raute im Harlekinmuster, rote
// Einfassung, Querstab, in der Mitte Lus Bild von Mieze), die Schleifen am Schwanz und die
// Holzspule, die Pim oder Mika in der Hand hält (wie die Angel: Griff oben, die Spule davor).
// Der Drachen steht als Raute in der Bildebene – die Kamera dreht nie, so bleibt er lesbar.

import * as THREE from 'three';
import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { FINE32, edgeLight } from '../world/voxelKit.js';

const U = FINE32;

/** Maße der Raute in Voxeln: halbe Breite, Höhe über dem Querstab, Höhe darunter. */
const HALF = 11;
const TOP = 10;
const BOTTOM = 21;
/** So weit liegt die Spitze unten (für den Schwanz) unter der Waage (Querstab), in Metern. */
export const KITE_TAIL_DROP = (BOTTOM + 0.5) * U;
/** Wo die Schnur die Spule verlässt (Voxel, im Modell der Spule). */
export const SPOOL_TIP = { x: 1.5, y: -9, z: 5.5 };

/** Liegt (x, y) in der Raute (Querstab bei y = BOTTOM, Spitze unten bei y = 0)? */
function inKite(x, y) {
  if (y < 0 || y > BOTTOM + TOP) return false;
  const reach = y >= BOTTOM ? HALF * ((BOTTOM + TOP - y) / TOP) : HALF * (y / BOTTOM);
  return Math.abs(x) <= reach + 0.35;
}

/** Lus Bild in der Mitte: Mieze, rot getigert, mit Ohren, Augen, Näschen und Schnurrhaaren. */
function catPixel(x, y) {
  const cx = 0;
  const cy = 11;
  const dx = x - cx;
  const dy = y - cy;
  // Ohren (spitz, innen rosa)
  if ((x === -3 || x === 3) && (y === 15 || y === 16)) return y === 15 ? P.a0 : P.f4;
  if ((x === -2 || x === 2) && y === 15) return P.f4;
  // Kopf
  if (dx * dx + dy * dy * 1.15 <= 13.5) {
    if ((x === -2 || x === 2) && y === 12) return P.n1; // Augen
    if (x === 0 && y === 11) return P.a0; // Näschen
    if ((x === -1 || x === 1) && y === 10) return P.n2; // Mund
    if ((x === -1 || x === 1) && y === 14) return P.f3; // Streifen auf der Stirn
    if (x === 0 && y === 14) return P.f3;
    return P.f4;
  }
  // Schnurrhaare auf dem hellen Grund
  if ((x === -4 || x === -5 || x === 4 || x === 5) && y === 11) return P.s7;
  if (dx * dx + dy * dy <= 30) return P.f8; // der helle Grund, auf den Lu gemalt hat
  return null;
}

/** Der Drachen (Waage am Querstab bei y = BOTTOM, x = 0; zwei Voxel dick, vorn z = 1). */
export function buildKite32() {
  const m = new VoxelModel();
  for (let y = 0; y <= BOTTOM + TOP; y++) {
    for (let x = -HALF; x <= HALF; x++) {
      if (!inKite(x, y)) continue;
      const edge = !inKite(x - 1, y) || !inKite(x + 1, y) || !inKite(x, y - 1) || !inKite(x, y + 1);
      let c;
      if (edge) c = P.f0; // Einfassung
      else {
        const cat = catPixel(x, y);
        if (cat) c = cat;
        else if (y === BOTTOM || x === 0) c = P.e6; // Querstab und Längsstab
        else c = (x < 0) === (y > BOTTOM) ? P.f3 : P.f6; // Harlekin: oben links rot, oben rechts gelb …
      }
      m.set(x, y, 1, c);
      m.set(x, y, 0, edge ? P.f0 : P.e5); // Rückseite (sieht man nur an den Kanten)
    }
  }
  return edgeLight(m);
}

/** Eine Schleife am Schwanz (Knoten in der Mitte), Farbe je Schleife. */
export function buildBow32(color) {
  const m = new VoxelModel();
  for (let x = -2; x <= 2; x++) {
    for (let y = -1; y <= 1; y++) {
      if (x === 0 && y !== 0) continue;
      m.set(x, y, 0, x === 0 ? P.e3 : color);
    }
  }
  m.set(-2, 0, 0, P.e3).set(2, 0, 0, P.e3); // die Falten außen
  return m;
}

/**
 * Die Holzspule (Haspel): kurzer Griff oben (in der Hand), darunter die Spule mit zwei Scheiben
 * und der aufgewickelten hellen Schnur – wie die Werkzeuge nach −y entlang des Arms.
 */
export function buildSpool32() {
  const m = new VoxelModel();
  m.box(1, -2, 1, 2, 1, 2, (x, y) => (y === 1 ? P.e3 : P.e5)); // Griff
  m.box(-1, -12, 0, -1, -3, 5, (x, y, z) => ((y === -12 || y === -3) && (z === 0 || z === 5) ? null : P.e4)); // Scheibe links
  m.box(4, -12, 0, 4, -3, 5, (x, y, z) => ((y === -12 || y === -3) && (z === 0 || z === 5) ? null : P.e4)); // Scheibe rechts
  m.box(0, -11, 1, 3, -4, 4, (x, y) => (y % 2 ? P.f8 : P.s8)); // aufgewickelte Schnur
  m.set(-1, -8, 2, P.e2).set(4, -8, 2, P.e2); // Achse
  return edgeLight(m);
}

/** Farben der Schleifen am Schwanz (von oben nach unten). */
const BOW_COLORS = [P.f6, P.a5, P.f3, P.f6, P.a5, P.f3];
export const TAIL_POINTS = 26; // Glieder des Schwanzes
export const TAIL_BOWS = [4, 8, 12, 16, 20, 24]; // an diesen Gliedern hängt eine Schleife
export const LINE_POINTS = 48; // Stützpunkte der Leine (sie hängt leicht durch)

/**
 * Alles, was man vom Drachen sieht: der Drachen (Waage im Ursprung von `kite`), die Leine und der
 * Schwanz als dünne Linien (1 Bildpunkt – ohne Tiefe, sonst zöge der Umriss sie dunkel nach), die
 * Schleifen am Schwanz. Alles bleibt angelegt; unsichtbar ist es über `visible` der Gruppe.
 * @param {{world: THREE.Material}} materials
 */
export function buildKiteView(materials) {
  const root = new THREE.Group();
  root.name = 'Pims Drachen';
  root.visible = false;
  const kite = new THREE.Group();
  const mesh = new THREE.Mesh(buildKite32().toGeometry({ jitter: 0.02, seed: 91, size: U }), materials.world);
  mesh.position.set(-0.5 * U, -(BOTTOM + 0.5) * U, -1 * U);
  mesh.castShadow = true;
  kite.add(mesh);
  root.add(kite);
  const lineMaterial = new THREE.LineBasicMaterial({ color: P.f8, depthWrite: false });
  const makeLine = (n, name) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const line = new THREE.Line(geometry, lineMaterial);
    line.name = name;
    line.frustumCulled = false;
    root.add(line);
    return line;
  };
  const line = makeLine(LINE_POINTS, 'Drachenschnur');
  const tail = makeLine(TAIL_POINTS, 'Drachenschwanz');
  const bows = BOW_COLORS.map((c, k) => {
    const b = new THREE.Mesh(buildBow32(c).toGeometry({ jitter: 0, seed: 92 + k, size: U }), materials.world);
    b.geometry.translate(-0.5 * U, -0.5 * U, -0.5 * U); // Mitte des Knotens im Ursprung
    b.castShadow = true;
    root.add(b);
    return b;
  });
  return { root, kite, mesh, line, tail, bows };
}
