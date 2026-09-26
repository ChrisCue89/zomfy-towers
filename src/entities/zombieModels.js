// Voxel-Modelle der Schlurfer – gemütlich-schaurig statt eklig: moosig,
// mit Blümchen, Pilzen und alten Klamotten. Jede Art ist auf einen Blick an
// Größe, Farbe und einem Merkmal erkennbar (Warnkegel-Helm des Brummers,
// leuchtender Pilzhut des Leuchtpilzes, Geweihkrone des Anführers …).
//
// Aufbau wie bei Mika (characters.js): Beine, Rumpf, Kopf, Arme an Gelenken.
// Koordinaten in Voxeln (1/8 m), Blickrichtung +z, Ursprung zwischen den Füßen.
// `glow` sind leuchtende Teile am Kopf (Augen, Pilzhut), eigenes Material.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';

const SPECS = {
  schlurfer: {
    skin: P.t4, skinShade: P.t3, shirt: P.b2, shirtDark: P.b1, pants: P.e3, pantsDark: P.e2, feet: P.t3,
    moss: P.g5, eyes: 0xffe08a, hair: P.e2, extra: 'blume',
  },
  flitzer: {
    skin: P.t4, skinShade: P.t3, shirt: P.r3, shirtDark: P.r2, pants: P.s3, pantsDark: P.s2, feet: P.s2,
    moss: P.g6, eyes: 0xffe08a, hair: P.e1, extra: 'kapuze',
  },
  schwaermer: {
    skin: P.g4, skinShade: P.g3, shirt: P.g5, shirtDark: P.g4, pants: P.g3, pantsDark: P.g2, feet: P.g2,
    moss: P.g6, eyes: 0xfff2c4, hair: P.g5, extra: 'pilzchen',
  },
  brummer: {
    skin: P.t3, skinShade: P.t2, shirt: P.e4, shirtDark: P.e3, pants: P.e2, pantsDark: P.e1, feet: P.s2,
    moss: P.g4, eyes: 0xffc860, hair: P.e1, extra: 'kegel', armor: true,
  },
  leuchtpilz: {
    skin: P.t4, skinShade: P.t3, shirt: P.d2, shirtDark: P.d1, pants: P.d1, pantsDark: P.d0, feet: P.t3,
    moss: P.g5, eyes: 0xb8fff0, hair: P.d1, extra: 'leuchthut',
  },
  anfuehrer: {
    skin: P.t2, skinShade: P.t1, shirt: P.g3, shirtDark: P.g2, pants: P.e2, pantsDark: P.e1, feet: P.t1,
    moss: P.g4, eyes: 0xff9a4a, hair: P.e2, extra: 'krone', cape: true,
  },
};

function buildLeg(s, seed) {
  const m = new VoxelModel();
  m.box(0, 1, 0, 1, 2, 1, (x, y, z) => (hash3(x, y, z, seed) < 0.2 ? s.pantsDark : y === 2 ? s.pantsDark : s.pants));
  m.box(0, 0, 0, 1, 0, 1, s.feet);
  m.set(0, 0, 2, s.feet);
  return m;
}

function buildArm(s) {
  const m = new VoxelModel();
  m.box(0, 1, 0, 0, 3, 1, (x, y) => (y === 3 ? s.shirtDark : y === 1 ? s.skin : s.shirt));
  m.box(0, 0, 0, 0, 0, 1, s.skin);
  return m;
}

function buildTorso(s, seed) {
  const m = new VoxelModel();
  const wide = s.armor ? 1 : 0;
  m.box(-3 - wide, 3, -2, 2 + wide, 6, 1, (x, y, z) => {
    const h = hash3(x, y, z, seed);
    if (y === 3) return s.shirtDark; // Saum, ausgefranst
    if (z === 1 && h < 0.12) return s.skin; // Löcher
    if (y === 6 && h < 0.35) return s.moss; // Moos auf den Schultern
    return h < 0.15 ? s.shirtDark : s.shirt;
  });
  if (s.armor) {
    // Blechplatten vorn und auf den Schultern
    m.box(-2, 4, 2, 1, 5, 2, (x, y) => ((x + y) % 3 ? P.s5 : P.s4));
    m.box(-4, 6, -2, -3, 6, 1, P.s5).box(2, 6, -2, 3, 6, 1, P.s5);
    m.set(-1, 5, 2, P.r3); // Rost
  }
  if (s.cape) {
    // Moosumhang am Rücken
    m.box(-3, 2, -3, 2, 6, -3, (x, y, z) => (hash3(x, y, z, seed + 3) < 0.3 ? P.g5 : s.shirt));
  }
  return m;
}

function buildHead(s, seed) {
  const m = new VoxelModel();
  // Kopf: etwas schief, hohle Augen, schmaler Mund
  m.box(-3, 7, -3, 2, 10, 1, (x, y, z) => {
    const front = z === 1;
    const h = hash3(x, y, z, seed);
    if (front) {
      if (y === 9 && (x === -2 || x === 1)) return P.n0; // Augenhöhlen (Leuchtpunkt kommt extra)
      if (y === 7 && x >= -1 && x <= 0) return P.n1; // Mund
      return h < 0.12 ? s.skinShade : s.skin;
    }
    if (y === 10 && h < 0.5) return s.moss;
    if (z <= -2 && y >= 9) return s.hair;
    return y === 7 ? s.skinShade : s.skin;
  });
  switch (s.extra) {
    case 'blume':
      m.set(1, 11, -1, P.g5).set(1, 12, -1, P.a1).set(0, 12, -1, P.a0).set(2, 12, -1, P.a0).set(1, 12, 0, P.a0);
      break;
    case 'kapuze':
      m.box(-3, 10, -3, 2, 11, 1, (x, y, z) => (z === 1 && y === 10 ? null : y === 11 && (x === -3 || x === 2) ? null : s.shirt));
      m.box(-3, 7, -3, -3, 9, -3, s.shirt).box(2, 7, -3, 2, 9, -3, s.shirt);
      break;
    case 'pilzchen':
      m.box(-2, 11, -2, -1, 11, -1, P.e8).box(-3, 12, -3, 0, 12, 0, P.a0).set(-2, 13, -2, P.a0).set(-2, 12, -2, P.a4);
      m.box(1, 11, 0, 1, 11, 0, P.e8).box(0, 12, -1, 2, 12, 1, P.a1).set(1, 13, 0, P.a1);
      break;
    case 'kegel':
      // Warnkegel als Helm: orange mit weißem Streifen
      m.box(-3, 11, -3, 2, 11, 1, P.f3);
      m.box(-2, 12, -2, 1, 12, 0, P.a4);
      m.box(-2, 13, -2, 1, 13, 0, P.f3);
      m.box(-1, 14, -1, 0, 15, -1, P.f4);
      break;
    case 'krone':
      // Geweihkrone aus Ästen mit Blüten
      for (const side of [-1, 1]) {
        const bx = side < 0 ? -3 : 2;
        m.box(bx, 11, -1, bx, 13, -1, P.e5);
        m.set(bx + side, 13, -1, P.e5).set(bx + side * 2, 14, -1, P.e5).set(bx, 14, -1, P.e6);
        m.set(bx + side * 2, 15, -1, P.a1).set(bx, 15, -1, P.a0);
      }
      m.box(-2, 11, -2, 1, 11, 0, P.g4);
      break;
    default:
      break;
  }
  return m;
}

/** Leuchtende Teile am Kopf: Augen, beim Leuchtpilz der große Hut. */
function buildHeadGlow(s) {
  const m = new VoxelModel();
  m.set(-2, 9, 2, s.eyes).set(1, 9, 2, s.eyes);
  if (s.extra === 'leuchthut') {
    m.box(-4, 11, -4, 3, 11, 2, (x, y, z) => ((x === -4 || x === 3) && (z === -4 || z === 2) ? null : 0x6cc0ae));
    m.box(-3, 12, -3, 2, 12, 1, (x, y, z) => ((x + z) % 3 === 0 ? 0xf7f3ea : 0x8ee0cc));
    m.box(-2, 13, -2, 1, 13, 0, 0x8ee0cc);
  }
  return m;
}

/**
 * Teile einer Art mit ihren Gelenken (wie in characters.js).
 * @returns {Array<{name:string, model:VoxelModel, joint:number[], offset:number[], parent:'root'|'body'|'head', glow?:boolean}>}
 */
export function zombieParts(type, seed = 11) {
  const s = SPECS[type];
  const wide = s.armor ? 1 : 0;
  return [
    { name: 'legL', model: buildLeg(s, seed), joint: [-1, 3, 0], offset: [-2, 0, -1], parent: 'root' },
    { name: 'legR', model: buildLeg(s, seed + 1), joint: [1, 3, 0], offset: [0, 0, -1], parent: 'root' },
    { name: 'torso', model: buildTorso(s, seed), joint: [0, 3, 0], offset: [0, 0, 0], parent: 'body' },
    { name: 'head', model: buildHead(s, seed), joint: [0, 7, -1], offset: [0, 0, 0], parent: 'body' },
    { name: 'glow', model: buildHeadGlow(s), joint: [0, 7, -1], offset: [0, 0, 0], parent: 'head', glow: true },
    { name: 'armL', model: buildArm(s), joint: [-3.5 - wide, 7, 0], offset: [-4 - wide, 3, -1], parent: 'body' },
    { name: 'armR', model: buildArm(s), joint: [3.5 + wide, 7, 0], offset: [3 + wide, 3, -1], parent: 'body' },
  ];
}

export const ZOMBIE_TYPES = Object.keys(SPECS);
