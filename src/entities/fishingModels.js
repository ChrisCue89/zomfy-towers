// Modelle fürs Angeln (M33) im Maß 1/32 m: die Angel (wie die Waffen in der Hand: Griff
// oben, die Rute nach unten entlang des Arms), die Pose auf dem Wasser und die Fänge – als
// Seitenansicht für die Fangkarte und für den Sprung aus dem Wasser.

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { FISH } from '../data/fishing.js';

/** Länge der Rute in Voxeln (die Spitze liegt bei y = -ROD_TIP). */
export const ROD_TIP = 58;

/** Die Angel: Korkgriff, Rolle mit Kurbel, zweiteilige Rute mit Ringen, rote Spitze. */
export function buildRod32() {
  const m = new VoxelModel();
  m.box(0, 1, 0, 3, 2, 3, P.e3); // Endkappe
  m.box(0, -8, 0, 3, 0, 3, (x, y, z) => {
    if ((x === 0 || x === 3) && (z === 0 || z === 3)) return null; // runder Kork
    return (x * 3 + y * 5 + z) % 7 === 0 ? P.e6 : P.e7;
  });
  // Rolle unter dem Griff: Spule, Bügel, Kurbel
  m.box(1, -7, -4, 2, -5, -1, P.s4);
  m.box(0, -8, -6, 3, -4, -5, (x, y) => (y === -6 ? P.s8 : P.s6)); // Spule mit Schnur
  m.box(4, -6, -6, 4, -6, -5, P.s3); // Kurbel
  m.set(5, -7, -6, P.e2);
  // Rute: unten zwei Voxel stark, oben einer, alle zehn ein Ring
  for (let y = -9; y >= -ROD_TIP; y--) {
    const thick = y > -30;
    const ring = y % 10 === 0;
    const c = y <= -ROD_TIP + 2 ? P.r3 : ring ? P.s7 : thick ? P.n3 : P.n4;
    if (thick) m.box(1, y, 1, 2, y, 2, c);
    else m.set(1, y, 1, c);
    if (ring) m.set(1, y, 0, P.s8);
  }
  return m;
}

/** Die Pose: rot-weißer Körper, eine dünne rote Antenne (Ursprung an der Wasserlinie). */
export function buildBobber32() {
  const m = new VoxelModel();
  for (let y = -2; y <= 3; y++) {
    const r = y === -2 || y === 3 ? 1 : 2;
    for (let x = -r; x < r; x++) for (let z = -r; z < r; z++) m.set(x, y, z, y >= 1 ? (y === 3 ? P.r4 : P.r3) : P.s9);
  }
  m.box(-1, 4, -1, -1, 7, -1, P.r4); // Antenne
  m.set(-1, 8, -1, P.f7);
  return m;
}

/**
 * Ein Fang in Seitenansicht (Kopf rechts), `len` Voxel lang: Rücken dunkel, Seiten, heller
 * Bauch, Flossen, Auge; Barsch mit Streifen, Hecht mit Flecken, Aal und Hecht gestreckt.
 */
export function buildFishModel(id, len = 36) {
  const def = FISH[id];
  if (def?.junk) return buildBoot32(len);
  if (def?.bottle) return buildBottle32(len);
  const [back, side, belly, fin] = (def?.colors || ['s5', 's7', 's8', 'r3']).map((k) => P[k]);
  const m = new VoxelModel();
  const L = len;
  const H = def?.long ? L * 0.16 : L * 0.3; // halbe Höhe = H/2
  const T = Math.max(1, Math.round(L * 0.06)); // halbe Dicke
  const tailStart = Math.round(L * 0.16);
  for (let x = tailStart; x < L; x++) {
    const t = (x - tailStart) / (L - tailStart); // 0 am Schwanzstiel, 1 an der Schnauze
    const shape = Math.sin(Math.PI * Math.min(1, 0.18 + t * 0.9)) ** 0.7;
    const h = Math.max(1, Math.round((H / 2) * shape));
    const mid = Math.round(-h * 0.1);
    for (let y = mid - h; y <= mid + h; y++) {
      const v = (y - (mid - h)) / (2 * h); // 0 unten, 1 oben
      for (let z = -T; z <= T; z++) {
        let c = v > 0.68 ? back : v < 0.3 ? belly : side;
        if (def?.stripes && v > 0.3 && Math.floor((x - tailStart) / Math.max(2, Math.round(L * 0.09))) % 2 === 0 && t > 0.15 && t < 0.8) c = back;
        if (def?.spots && v > 0.3 && v < 0.75 && ((x * 7 + y * 13) % 11 === 0)) c = belly;
        if (z === T && v > 0.35 && v < 0.6 && x > L * 0.35 && x < L * 0.8 && x % 3 === 0 && !def?.stripes) c = P.s9; // Glanz der Schuppen
        m.set(x, y, z, c);
      }
    }
    // Rückenflosse in der Mitte, Bauchflosse etwas weiter vorn
    if (t > 0.35 && t < 0.62) for (let y = mid + h + 1; y <= mid + h + Math.round(L * 0.07); y++) m.set(x, y, 0, fin);
    if (t > 0.5 && t < 0.62) for (let y = mid - h - Math.round(L * 0.05); y < mid - h; y++) m.set(x, y, 0, fin);
  }
  // Schwanzflosse: ein Fächer nach links
  const fan = Math.round(H * 0.55);
  for (let x = 0; x < tailStart; x++) {
    const spread = Math.round(((tailStart - x) / tailStart) * fan) + 1;
    for (let y = -spread; y <= spread; y++) if (Math.abs(y) > spread * 0.35 || x > tailStart * 0.6) m.set(x, y, 0, fin);
  }
  // Auge und Maul
  const ex = L - Math.max(2, Math.round(L * 0.12));
  const ey = Math.round((H / 2) * 0.25);
  m.set(ex, ey, T + 1, P.n0).set(ex, ey + 1, T + 1, P.s9);
  m.set(L - 1, Math.round(-H * 0.08), T, P.r1);
  return m;
}

/** Ein alter Gummistiefel (Seitenansicht), mit Wasserpflanze. */
function buildBoot32(len) {
  const m = new VoxelModel();
  const k = len / 36;
  const s = (v) => Math.round(v * k);
  m.box(s(4), s(0), -2, s(30), s(6), 2, (x, y) => (y === 0 ? P.n1 : P.g2)); // Sohle und Fuß
  m.box(s(4), s(6), -2, s(14), s(30), 2, (x, y) => (y >= s(28) ? P.g4 : x === s(4) ? P.g1 : P.g2)); // Schaft
  m.box(s(24), s(6), -2, s(30), s(10), 2, P.g3); // Kappe
  for (let y = s(24); y <= s(36); y++) m.set(s(10) + (y % 3) - 1, y, 3, P.g6); // Wasserpflanze
  return m;
}

/** Flaschenpost: grünes Glas, Korken, ein Zettel darin. */
function buildBottle32(len) {
  const m = new VoxelModel();
  const k = len / 36;
  const s = (v) => Math.round(v * k);
  m.box(s(2), s(-6), -3, s(24), s(6), 3, (x, y, z) => ((Math.abs(y) === s(6) && Math.abs(z) === 3) ? null : y > s(3) ? P.t4 : P.t3));
  m.box(s(25), s(-3), -2, s(32), s(3), 2, P.t3); // Hals
  m.box(s(33), s(-2), -1, s(36), s(2), 1, P.e6); // Korken
  m.box(s(6), s(-3), 4, s(20), s(3), 4, (x, y) => ((x + y) % 4 === 0 ? P.e5 : P.e9)); // Zettel hinter dem Glas
  return m;
}
