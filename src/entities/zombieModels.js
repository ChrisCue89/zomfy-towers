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
      m.box(-1, 12, -2, 0, 12, -1, P.a4); // der Streifen außen leuchtet (buildHeadGlow)
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

/**
 * Leuchtende Teile am Kopf: Augen vorn, leuchtende Moderpilzchen am
 * Hinterkopf (so sieht man Schlurfer nachts auch von hinten – die meisten
 * laufen von der Kamera weg aufs Haus zu), beim Leuchtpilz der große Hut.
 */
function buildHeadGlow(s) {
  const m = new VoxelModel();
  m.set(-2, 9, 2, s.eyes).set(1, 9, 2, s.eyes);
  m.set(-2, 9, -4, 0xb6f07a).set(1, 8, -4, 0xb6f07a).set(0, 10, -4, 0x8ee0a0);
  if (s.extra === 'kegel') {
    // Reflektorstreifen am Warnkegel: nachts erkennt man den Brummer sofort
    m.box(-2, 12, -2, 1, 12, 0, (x, y, z) => (z === 0 || x === -2 || x === 1 ? 0xf4f0e0 : null));
  }
  if (s.extra === 'leuchthut') {
    m.box(-4, 11, -4, 3, 11, 2, (x, y, z) => ((x === -4 || x === 3) && (z === -4 || z === 2) ? null : 0x6cc0ae));
    m.box(-3, 12, -3, 2, 12, 1, (x, y, z) => ((x + z) % 3 === 0 ? 0xf7f3ea : 0x8ee0cc));
    m.box(-2, 13, -2, 1, 13, 0, 0x8ee0cc);
  }
  return m;
}


// --- Feiner Detailgrad (1/16 m, Meilenstein 5) -------------------------------------
// Gleiche Maße in Metern wie oben, doppelt so viele Voxel je Richtung. Jede Art
// hat ein Merkmal, das man auch klein und nachts erkennt: Gänseblümchen,
// rote Kapuze, Fliegenpilze, Warnkegel und Warnweste mit Leuchtstreifen,
// leuchtender Pilzhut, Geweihkrone mit Moosumhang.

const U16 = 1 / 16;
/** Feiner Detailgrad an (Meilenstein 5); die groben Modelle bleiben als Rückfall. */
const FINE = true;
const VEST = 0xf2b632; // Warnweste
const REFLECT = 0xf4f0e0; // Leuchtstreifen (Glüh-Material)

/** Wie breit ist die Art (Voxel links/rechts zusätzlich)? */
const widthOf = (s) => (s.armor ? 2 : s.extra === 'kapuze' ? -1 : 0);

function buildLeg16(s, seed) {
  const m = new VoxelModel();
  const runner = s.extra === 'kapuze';
  // Schuhe: Laufschuhe beim Flitzer (hell mit rotem Streifen), sonst ausgelatscht
  m.box(0, 0, 0, 3, 0, 4, (x, y, z) => (z === 4 && x === 3 && !runner ? null : runner ? P.s8 : s.feet));
  m.box(0, 1, 0, 3, 1, 3, (x, y, z) => (runner ? (z === 3 || x === 0 ? P.r3 : P.s8) : s.feet));
  // Hose: zerrissen, mit Löchern
  m.box(0, 2, 0, 3, 5, 3, (x, y, z) => {
    const h = hash3(x, y, z, seed);
    if (y === 2 && h < 0.4 && !runner) return s.skin; // ausgefranster Saum
    if (z === 3 && h < 0.14) return s.skinShade; // Loch
    if (y === 5) return s.pantsDark;
    return x === 0 || z === 0 || h < 0.2 ? s.pantsDark : s.pants;
  });
  return m;
}

function buildArm16(s) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 1, 0, 3, (x, y, z) => (z === 3 || z === 1 ? s.skinShade : s.skin)); // Finger
  m.box(0, 1, 0, 1, 3, 3, (x, y, z) => (x === 1 && z === 0 ? s.skinShade : s.skin));
  m.box(0, 4, 0, 1, 7, 3, (x, y, z) => {
    if (s.armor && y === 7) return P.s5; // Schulterblech
    if (y === 4) return s.shirtDark;
    if (y === 7 && !s.extra.startsWith('kapuze')) return s.moss;
    return s.shirt;
  });
  return m;
}

function buildTorso16(s, seed) {
  const m = new VoxelModel();
  const w = widthOf(s);
  m.box(-6 - w, 6, -4, 5 + w, 13, 3, (x, y, z) => {
    const h = hash3(x, y, z, seed);
    const edge = x === -6 - w || x === 5 + w;
    if (s.armor) {
      // Warnweste über dem Hemd, Blechplatte vorn
      if (z === 3 && y >= 8 && y <= 11 && x >= -3 && x <= 2) return (x + y) % 3 ? P.s5 : P.s4;
      if (z === 3 && y === 10 && x === -1) return P.r3; // Rost
      return y === 6 ? s.shirtDark : VEST;
    }
    if (s.extra === 'kapuze') {
      // Kapuzenpulli mit Bauchtasche
      if (z === 3 && (y === 8 || y === 9) && x >= -3 && x <= 2) return s.shirtDark;
      if (y === 6) return s.shirtDark;
      return edge && h < 0.3 ? s.shirtDark : s.shirt;
    }
    if (y === 6) return h < 0.35 ? null : s.shirtDark; // ausgefranster Saum
    if (z === 3 && h < 0.08) return s.skin; // Löcher
    if (y === 13 && h < 0.45) return s.moss;
    if (z === 3 && x === 0 && (y === 8 || y === 10)) return P.e8; // Knöpfe
    return h < 0.14 ? s.shirtDark : s.shirt;
  });
  if (s.extra === 'kapuze') {
    // Kordeln der Kapuze
    m.set(-2, 12, 4, P.s9).set(-2, 11, 4, P.s9).set(1, 12, 4, P.s9).set(1, 11, 4, P.s9);
  } else if (!s.armor) {
    // Moospolster auf der Schulter
    m.box(3, 13, -2, 5, 14, 0, (x, y) => (y === 14 && x === 5 ? null : s.moss));
  }
  if (s.cape) {
    // Moosumhang am Rücken, unten ausgefranst
    m.box(-6, 5, -6, 5, 13, -5, (x, y, z) => {
      const h = hash3(x, y, z, seed + 3);
      if (y === 5 && h < 0.5) return null;
      return h < 0.3 ? P.g5 : h < 0.55 ? P.g4 : s.shirt;
    });
  }
  return m;
}

function buildHead16(s, seed) {
  const m = new VoxelModel();
  const hooded = s.extra === 'kapuze';
  m.box(-6, 14, -6, 5, 21, 3, (x, y, z) => {
    const front = z === 3;
    const h = hash3(x, y, z, seed);
    if (front) {
      if ((y === 17 || y === 18) && (x === -4 || x === -3 || x === 2 || x === 3)) return P.n0; // Augenhöhlen
      if (y === 15 && x >= -2 && x <= 1) return x % 2 ? P.n1 : s.skinShade; // genähter Mund
      if (y === 19 && (x === -5 || x === 4)) return s.skinShade; // Brauenwulst
      return h < 0.1 ? s.skinShade : s.skin;
    }
    if (y === 21 && h < 0.55 && !hooded) return s.moss;
    if (z <= -4 && y >= 18) return s.hair;
    return y === 14 ? s.skinShade : s.skin;
  });
  // Ohren
  m.set(-7, 17, -1, s.skinShade).set(6, 17, -1, s.skinShade);
  switch (s.extra) {
    case 'blume':
      // Gänseblümchen
      m.box(2, 22, -2, 2, 23, -2, P.g5);
      m.set(2, 24, -2, P.f6).set(1, 24, -2, P.s9).set(3, 24, -2, P.s9).set(2, 24, -3, P.s9).set(2, 24, -1, P.s9);
      m.set(1, 22, -2, P.g6).set(3, 22, -3, P.g4);
      break;
    case 'kapuze':
      // Rote Kapuze: Schale um den Kopf, vorn offen
      m.box(-7, 15, -7, 6, 23, 4, (x, y, z) => {
        const inside = x >= -6 && x <= 5 && y <= 21 && z >= -6 && z <= 3;
        if (inside) return null;
        if (z === 4 && y <= 20 && x > -6 && x < 5) return null; // Gesicht frei
        if (z === 4 && y < 16) return null;
        if (y === 23 && (x === -7 || x === 6 || z === -7 || z === 4)) return null;
        return z === 4 || y === 23 ? s.shirtDark : s.shirt;
      });
      break;
    case 'pilzchen':
      // Drei Fliegenpilze mit weißen Tupfen
      for (const [cx, cz, h] of [[-3, -2, 2], [2, 0, 1], [0, -4, 3]]) {
        m.box(cx, 22, cz, cx, 21 + h, cz, P.e8);
        m.box(cx - 1, 22 + h, cz - 1, cx + 1, 22 + h, cz + 1, (x, y, z) => ((x + z) % 2 === 0 && x !== cx ? P.s9 : P.a0));
        m.set(cx, 23 + h, cz, P.a0);
      }
      break;
    case 'kegel': {
      // Warnkegel als Helm (der weiße Streifen leuchtet, siehe buildHeadGlow16)
      m.box(-6, 22, -6, 5, 23, 3, P.f3);
      m.box(-4, 24, -4, 3, 25, 1, P.f4);
      m.box(-3, 26, -3, 2, 27, 0, P.f3);
      m.box(-2, 28, -2, 1, 29, -1, P.f4);
      break;
    }
    case 'krone':
      // Geweihkrone aus Ästen mit Blüten
      for (const side of [-1, 1]) {
        const bx = side < 0 ? -5 : 4;
        m.box(bx, 22, -2, bx, 27, -2, P.e5);
        m.set(bx + side, 25, -2, P.e5).set(bx + side * 2, 26, -2, P.e5).set(bx + side * 2, 27, -2, P.e6);
        m.set(bx - side, 27, -2, P.e5).set(bx - side, 28, -2, P.e6);
        m.set(bx + side * 2, 28, -2, P.a1).set(bx - side, 29, -2, P.a0).set(bx, 28, -2, P.a1);
      }
      m.box(-4, 22, -3, 3, 22, 0, P.g4);
      break;
    default:
      break;
  }
  return m;
}

/**
 * Leuchtende Teile am Kopf: Augen vorn, Moderpilzchen am Hinterkopf (man sieht
 * Schlurfer auch von hinten), Streifen am Warnkegel, der große Hut des Leuchtpilzes.
 */
function buildHeadGlow16(s) {
  const m = new VoxelModel();
  const zEye = s.extra === 'kapuze' ? 4 : 4;
  m.set(-4, 17, zEye, s.eyes).set(-3, 17, zEye, s.eyes).set(2, 17, zEye, s.eyes).set(3, 17, zEye, s.eyes);
  m.set(-3, 18, zEye, s.eyes).set(2, 18, zEye, s.eyes);
  if (s.extra !== 'kapuze') m.set(-3, 18, -7, 0xb6f07a).set(2, 17, -7, 0xb6f07a).set(0, 20, -7, 0x8ee0a0);
  if (s.extra === 'kegel') {
    // Reflektorring am Kegel (eine Voxelschicht außen um y 26..27)
    m.box(-4, 26, -4, 3, 27, 1, (x, y, z) => (x === -4 || x === 3 || z === -4 || z === 1 ? REFLECT : null));
  }
  if (s.extra === 'leuchthut') {
    m.box(-8, 22, -8, 7, 23, 5, (x, y, z) => {
      const corner = (x === -8 || x === 7) && (z === -8 || z === 5);
      if (corner) return null;
      if (y === 23 && (x === -8 || x === 7 || z === -8 || z === 5)) return null;
      return 0x6cc0ae;
    });
    m.box(-6, 24, -6, 5, 25, 3, (x, y, z) => ((x * 3 + z * 5) % 7 === 0 ? 0xf7f3ea : 0x8ee0cc));
    m.box(-3, 26, -4, 2, 26, 1, 0x8ee0cc);
  }
  return m;
}

/** Leuchtstreifen der Warnweste (Brummer), eine Schicht vor Brust und Rücken. */
function buildVestGlow16(s) {
  const m = new VoxelModel();
  const w = widthOf(s);
  for (const y of [9, 11]) {
    for (let x = -6 - w; x <= 5 + w; x++) {
      if (x >= -3 && x <= 2) continue; // vorn sitzt die Blechplatte
      m.set(x, y, 4, REFLECT);
    }
    for (let x = -6 - w; x <= 5 + w; x++) m.set(x, y, -5, REFLECT);
  }
  return m;
}

function fineParts(s, seed) {
  const w = widthOf(s);
  const parts = [
    { name: 'legL', model: buildLeg16(s, seed), joint: [-2, 6, 0], offset: [-4, 0, -2], parent: 'root', unit: U16 },
    { name: 'legR', model: buildLeg16(s, seed + 1), joint: [2, 6, 0], offset: [0, 0, -2], parent: 'root', unit: U16 },
    { name: 'torso', model: buildTorso16(s, seed), joint: [0, 6, 0], offset: [0, 0, 0], parent: 'body', unit: U16 },
    { name: 'head', model: buildHead16(s, seed), joint: [0, 14, -2], offset: [0, 0, 0], parent: 'body', unit: U16 },
    { name: 'glow', model: buildHeadGlow16(s), joint: [0, 14, -2], offset: [0, 0, 0], parent: 'head', glow: true, unit: U16 },
    { name: 'armL', model: buildArm16(s), joint: [-7 - w, 14, 0], offset: [-8 - w, 6, -2], parent: 'body', unit: U16 },
    { name: 'armR', model: buildArm16(s), joint: [7 + w, 14, 0], offset: [6 + w, 6, -2], parent: 'body', unit: U16 },
  ];
  if (s.armor) parts.push({ name: 'vest', model: buildVestGlow16(s), joint: [0, 6, 0], offset: [0, 0, 0], parent: 'body', glow: true, unit: U16 });
  return parts;
}

/**
 * Teile einer Art mit ihren Gelenken (wie in characters.js).
 * @returns {Array<{name:string, model:VoxelModel, joint:number[], offset:number[], parent:'root'|'body'|'head', glow?:boolean}>}
 */
export function zombieParts(type, seed = 11) {
  const s = SPECS[type];
  if (FINE) return fineParts(s, seed);
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
