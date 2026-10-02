// Baukasten für Menschen-Figuren aus Formen (N1): Mika, die Überlebenden und
// Balduin teilen Kopf- und Rumpfform, Glieder und die Regel, dass Gesichter,
// Bärte, Riemen und Taschen auf der Rundung sitzen (vorderste Voxelreihe je
// Spalte) statt als Brett davor. Maße wie im Maß 1/32 (M13g): Beine y 0–11,
// Rumpf y 12–27, Kopf y 28–43 (24 × 16 × 20), Arme 4 Voxel stark; Rumpf und
// Kopf in absoluten Koordinaten, Glieder lokal (Arm x 0..3, Bein x 0..7).

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { shade, sculpt, capsule, roundBox, blob, smoothUnion } from '../world/voxelKit.js';

/** Gerundeter Quader mit Rundung r (inline, damit die Formen schnell bleiben). */
function rbox(x, y, z, cx, cy, cz, hx, hy, hz, r) {
  const qx = Math.abs(x - cx) - hx + r;
  const qy = Math.abs(y - cy) - hy + r;
  const qz = Math.abs(z - cz) - hz + r;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const oz = Math.max(qz, 0);
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

/** Kopfform: gerundeter Quader 24 × 16 × 20, zum Kinn hin schmaler. */
export function headShape(x, y, z) {
  const taper = Math.max(0, 31.5 - y) * 0.6;
  return rbox(x, y, z, -0.5, 35.5, -2.5, 12 - taper, 8, 10 - taper * 0.3, 5.5);
}

/** Rumpfform: runde Schultern, etwas schmalere Taille. */
export function torsoShape(x, y, z) {
  const r = 3 + Math.max(0, y - 22.5) * 0.7;
  const waist = y < 16 ? (16 - y) * 0.3 : 0;
  return rbox(x, y, z, -0.5, 19.5, -0.5, 12 - waist, 8, 8, r);
}

/** Vorderste (und hinterste) Voxelreihe einer Form je (x, y) im Bereich. */
export function frontMap(shape, x0, x1, y0, y1, zFront, zBack) {
  const front = new Map();
  const back = new Map();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = zFront; z >= zBack; z--) {
        if (shape(x + 0.5, y + 0.5, z + 0.5) <= 0) {
          front.set(x * 128 + y, z);
          break;
        }
      }
      for (let z = zBack; z <= zFront; z++) {
        if (shape(x + 0.5, y + 0.5, z + 0.5) <= 0) {
          back.set(x * 128 + y, z);
          break;
        }
      }
    }
  }
  return { front: (x, y) => front.get(x * 128 + y), back: (x, y) => back.get(x * 128 + y) };
}

export const HEAD = frontMap(headShape, -13, 12, 27, 44, 10, -14);
export const TORSO = frontMap(torsoShape, -13, 12, 12, 28, 10, -10);

/** Voxel dz vor der Kopf-Rundung an (x, y) setzen (Nase, Bart, Brauen, Schirm). */
export function onFace(m, x, y, dz, color) {
  const z = HEAD.front(x, y);
  if (z !== undefined) m.set(x, y, z + dz, color);
  return m;
}

/** Voxel dz vor der Rumpf-Rundung an (x, y) setzen (Riemen, Schürze, Stethoskop). */
export function onChest(m, x, y, dz, color) {
  const z = TORSO.front(x, y);
  if (z !== undefined) m.set(x, y, z + dz, color);
  return m;
}

/**
 * Kopf ohne Gesicht: `paint(x, y, z, n)` färbt Haut, Haar und Ohren; wo die
 * Gesichtsplatte sitzt (vorderste Reihe, Reihen 28–39), bleibt der Kopf offen –
 * außer `face` ist gegeben, dann wird das Gesicht gleich mitgemalt.
 */
export function sculptHeadBase(paint, { face = null } = {}) {
  const m = new VoxelModel();
  sculpt(m, headShape, -13, 28, -13, 12, 43, 9, (x, y, z, n) => {
    if (y <= 39 && z === HEAD.front(x, y)) return face ? face(x, y) : null;
    return paint(x, y, z, n);
  });
  return m;
}

/** Gesichtsplatte: folgt der Rundung – jede Spalte sitzt auf der vordersten Reihe. */
export function facePlate(colorAt) {
  const m = new VoxelModel();
  for (let y = 28; y <= 39; y++) {
    for (let x = -12; x <= 11; x++) {
      const z = HEAD.front(x, y);
      if (z !== undefined) m.set(x, y, z, colorAt(x, y));
    }
  }
  return m;
}

/** Lider zum Blinzeln: eine Reihe vor den Augen, auf der Rundung. */
export function facLids(skin, eyes) {
  const m = new VoxelModel();
  for (const x of [-8, -7, -6, 5, 6, 7]) {
    for (const [y, c] of [[36, skin], [35, skin], [34, eyes]]) onFace(m, x, y, 1, c);
  }
  return m;
}

/** Ohren seitlich am Kopf. */
export function sculptEars(m, skin, skinShade) {
  for (const ex of [-13.2, 12.2]) sculpt(m, blob(ex, 33.5, -1.2, 1.3, 1.9, 1.5), -15, 31, -4, 14, 36, 1, (x, y) => (y >= 35 ? skin : skinShade));
  return m;
}

/** Rumpf: `paint(x, y, z, n, front)` – front ist true auf der vordersten Reihe. */
export function sculptTorsoBase(paint) {
  const m = new VoxelModel();
  sculpt(m, torsoShape, -13, 12, -9, 12, 27, 8, (x, y, z, n) => paint(x, y, z, n, z === TORSO.front(x, y)));
  return m;
}

/** Rollkragen, Schal oder Kragen um den Hals (Ring um den Halsansatz). */
export function sculptCollar(m, color, { r = 1.9, ring = 7.5, y = 27 } = {}) {
  const shape = (x, yy, z) => Math.hypot(Math.hypot(x + 0.5, (z + 1.5) * 1.15) - ring, (yy - y) * 1.2) - r;
  sculpt(m, shape, -12, y - 3, -13, 11, y + 1, 9, color);
  m.remove(-13, 28, -13, 12, 28, 9); // der Kopf sitzt darauf
  return m;
}

/**
 * Arm am Stück (Überlebende: ohne Ellbogen-Gelenk) oder geteilt (Mika):
 * `part` 'ganz' | 'oben' | 'unten'. Ärmel, Bündchen, Hand mit Daumen.
 * `forearm` färbt hochgekrempelte Unterarme (Bert).
 */
export function sculptArm({ sleeve, sleeveDark, sleeveLight = null, cuff, skin, skinShade, forearm = null }, part = 'ganz') {
  const m = new VoxelModel();
  const light = sleeveLight || shade(sleeve, 1);
  if (part !== 'unten') {
    sculpt(m, capsule(2, 15.2, 4, 2, 8.5, 4, 2.55, 2.2), -1, 8, 1, 5, 15, 7, (x, y, z, n) => {
      if (y >= 14) return light;
      if (forearm && y === 8) return sleeveDark; // Krempe
      if (y === 11 && n.z > 0.2) return sleeveDark; // Falte
      if (n.z < -0.5 || n.x > 0.7) return sleeveDark;
      return sleeve;
    });
  }
  if (part !== 'oben') {
    sculpt(m, capsule(2, 8.4, 4, 2, 5, 4.2, 2.2, 2.0), -1, 5, 1, 5, 7, 7, (x, y, z, n) => {
      if (forearm) return n.z < -0.5 ? skinShade : forearm;
      return n.z < -0.5 || n.x > 0.7 ? sleeveDark : sleeve;
    });
    sculpt(m, capsule(2, 4.4, 4.2, 2, 4.6, 4.2, 2.15), -1, 4, 1, 5, 4, 7, (x) => (forearm ? forearm : (x & 1) === 0 ? cuff : shade(cuff, -1)));
    sculpt(m, blob(2, 2, 4.4, 1.95, 2.3, 2.2), -1, 0, 1, 5, 3, 7, (x, y, z, n) => {
      if (n.z > 0.55 && y === 1) return skinShade; // Finger
      if (n.y > 0.5) return shade(skin, 1);
      return n.y < -0.4 ? skinShade : skin;
    });
    sculpt(m, capsule(2.4, 2.6, 6.1, 2.6, 1.6, 6.6, 0.8), 1, 1, 5, 4, 3, 7, skin); // Daumen
  }
  return m;
}

/**
 * Bein am Stück oder geteilt ('oben': Oberschenkel y 7–11, 'unten': Schienbein
 * mit Schuh y 0–6). Schuh mit runder Kappe, Hose oder Strümpfe, oben ggf. Rock.
 */
export function sculptLeg({ shoe, shoeLight, sole = null, low, high, top = null, patch = null, laces = null, cuff = null }, part = 'ganz') {
  const m = new VoxelModel();
  if (part !== 'oben') {
    sculpt(m, roundBox(4, 0.6, 5, 4, 0.7, 5.1, 0.8), -1, 0, -1, 8, 1, 10, (x, y, z) => (z >= 9 ? shade(sole || shoe, 1) : sole || shade(shoe, -1)));
    const shaft = capsule(4, 1.5, 3.8, 4, 4.4, 3.8, 3.5, 3.6);
    const toe = blob(4, 2.3, 7, 3.4, 2.3, 2.9);
    sculpt(m, smoothUnion(shaft, toe, 1.5), -1, 1, -1, 8, 4, 10, (x, y, z, n) => {
      if (z >= 8 && y === 3 && x === 2) return shoeLight; // Glanzpunkt
      if (laces && z >= 6 && z <= 7 && (x === 3 || x === 4) && y >= 2 && n.z > 0.3) return (y + x) % 2 ? laces : shade(laces, -1); // Schnürung
      if (n.z < -0.6) return shade(shoe, -1);
      return n.y > 0.5 || n.x < -0.5 ? shoeLight : shoe;
    });
    if (cuff) sculpt(m, capsule(4, 5.5, 4, 4, 5.5, 4, 3.9), -1, 5, -1, 8, 5, 8, (x, y, z) => ((x + z) % 3 === 0 ? P.e3 : cuff)); // umgeschlagener Rand
    sculpt(m, capsule(4, 5, 4, 4, 7, 4, 3.4), -1, cuff ? 6 : 5, -1, 8, 6, 8, (x, y, z, n) => (top && y >= 6 ? top : n.z < -0.5 ? shade(low, -1) : low));
  }
  if (part !== 'unten') {
    sculpt(m, capsule(4, 5, 4, 4, 12.5, 4, 3.4, 3.9), -1, 7, -1, 8, 11, 8, (x, y, z, n) => {
      if (top && y >= 8) return y === 8 ? shade(top, -1) : (x + y) % 5 === 0 ? shade(top, -1) : top;
      if (y === 11) return high.dark;
      const front = n.z > 0.6;
      if (patch && front && x >= 2 && x <= 5 && y >= 7 && y <= 9) {
        const edge = x === 2 || x === 5 || y === 7 || y === 9;
        return edge && (x + y) % 2 === 0 ? P.s8 : patch; // Flicken mit Stichen
      }
      if (front && x === 3) return shade(high.light, 1); // Bügelfalte
      return n.y < -0.5 || n.z < -0.6 || n.x > 0.75 ? high.dark : high.light;
    });
  }
  return m;
}
