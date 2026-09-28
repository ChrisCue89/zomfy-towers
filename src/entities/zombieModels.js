// Voxel-Modelle der Schlurfer – gemütlich-schaurig statt eklig: moosig,
// mit Blümchen, Pilzen und alten Klamotten. Jede Art ist auf einen Blick an
// Größe, Farbe und einem Merkmal erkennbar (Warnkegel-Helm des Brummers,
// leuchtender Pilzhut des Leuchtpilzes, Geweihkrone des Anführers …).
//
// Aufbau wie bei Mika (characters.js): Beine, Rumpf, Kopf, Arme an Gelenken.
// Koordinaten in Voxeln (grob 1/8 m, fein 1/16 m, seit M13g doppelt fein 1/32 m),
// Blickrichtung +z, Ursprung zwischen den Füßen.
// `glow` sind leuchtende Teile am Kopf (Augen, Pilzhut), eigenes Material.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';
import { shade, sculpt, capsule, roundBox, blob, smoothUnion, roundTone } from '../world/voxelKit.js';

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
  // --- Neue Arten (M22) ---
  // Moderfalter: eine pflaumenfarbene Motte mit Augenflecken auf den Flügeln (eigener Bauplan)
  moderfalter: {
    skin: P.d3, skinShade: P.d2, shirt: P.d3, shirtDark: P.d2, pants: P.d1, pantsDark: P.d0, feet: P.d1,
    moss: P.g5, eyes: 0xf7e0a0, hair: P.d4, extra: null, moth: true,
  },
  // Gräber: Latzhose voller Erde, Schiebermütze, eine Schaufel in der Hand
  graeber: {
    skin: P.t4, skinShade: P.t3, shirt: P.e5, shirtDark: P.e4, pants: P.e3, pantsDark: P.e2, feet: P.e2,
    moss: P.g5, eyes: 0xffe08a, hair: P.e2, extra: 'kappe', dirt: true, tool: 'schaufel',
  },
  // Schildträger: ein Kochtopf als Helm, vor sich eine alte Tür mit Knauf
  schildtraeger: {
    skin: P.t3, skinShade: P.t2, shirt: P.s4, shirtDark: P.s3, pants: P.e3, pantsDark: P.e2, feet: P.s2,
    moss: P.g5, eyes: 0xffd070, hair: P.e1, extra: 'topf', door: true,
  },
  // Lichtfresser: graublaue Kutte mit Ruß, bleiche Augen, ein Kerzenlöscher an langem Stiel
  lichtfresser: {
    skin: P.n6, skinShade: P.n5, shirt: P.n3, shirtDark: P.n2, pants: P.n2, pantsDark: P.n1, feet: P.n1,
    moss: P.g4, eyes: 0xe8f8ff, hair: P.n1, extra: 'kutte', soot: true, tool: 'loescher',
  },
  // Brüter: aufgedunsen, mit violett glimmenden Sporensäcken auf dem Rücken
  brueter: {
    skin: P.g4, skinShade: P.g3, shirt: P.d3, shirtDark: P.d2, pants: P.d1, pantsDark: P.d0, feet: P.g2,
    moss: P.g6, eyes: 0xd8ffa0, hair: P.g4, extra: 'sporen', wide: true, sacs: true,
  },
  // --- Bosse (M22): je eine eigene Silhouette ---
  // Der Holzfäller: rot-schwarz kariertes Hemd, Bart, Pudelmütze, die Axt erhoben
  holzfaeller: {
    skin: P.t3, skinShade: P.t2, shirt: P.r3, shirtDark: P.r2, pants: P.b1, pantsDark: P.b0, feet: P.e2,
    moss: P.g4, eyes: 0xffb050, hair: P.e2, extra: 'muetze', plaid: true, beard: true, tool: 'axt', wide: true,
  },
  // Die Pilzmutter: pflaumenfarbenes Kleid, Moosumhang, ein riesiger leuchtender Pilzhut
  pilzmutter: {
    skin: P.g4, skinShade: P.g3, shirt: P.d2, shirtDark: P.d1, pants: P.d1, pantsDark: P.d0, feet: P.g2,
    moss: P.g5, eyes: 0xd8ffa0, hair: P.g3, extra: 'mutterhut', cape: true, dress: true,
  },
  // Die Laternenhexe: dunkle Kutte mit Sternen, spitzer Hut, der Laternenstab
  laternenhexe: {
    skin: P.t4, skinShade: P.t3, shirt: P.d1, shirtDark: P.d0, pants: P.d0, pantsDark: P.n1, feet: P.n1,
    moss: P.g4, eyes: 0xfff2c4, hair: P.s7, extra: 'hexenhut', robe: true, tool: 'stab',
  },
  // Der Moosriese: Stein und Moos, Farne auf dem Kopf, breit wie ein Tor
  moosriese: {
    skin: P.g3, skinShade: P.g2, shirt: P.g4, shirtDark: P.g3, pants: P.s4, pantsDark: P.s3, feet: P.s3,
    moss: P.g6, eyes: 0xb6f07a, hair: P.g4, extra: 'farn', stone: true, wide: true,
  },
  // --- Finale (M25) ---
  // Das Moderherz: ein pochendes Herz aus Pilzgeflecht auf Wurzelbeinen, eine
  // Krone aus Hüten, Ranken statt Armen; die Knoten glimmen violett
  moderherz: {
    skin: P.d2, skinShade: P.d1, shirt: P.d2, shirtDark: P.d1, pants: P.d1, pantsDark: P.d0, feet: P.d0,
    moss: P.g4, eyes: P.a3, hair: P.d3, extra: null, heart: true,
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
  if (s.extra === 'mutterhut') {
    // Pilzmutter (M22): ein riesiger, violett leuchtender Hut mit hellen Tupfen
    m.ellipsoid(-0.5, 45, -2.5, 20, 14, 18, (x, y, z, dx, dy) => {
      if (y < 45) return null;
      if ((x * 3 + z * 5 + y) % 11 === 0 && dy > 0.2) return 0xf7f3ea; // helle Tupfen
      return dy > 0.7 ? 0xc4a8f0 : dy > 0.35 ? 0xa88fd0 : 0x8a6cc0;
    });
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
/** Detailgrad: 32 = doppelt fein (M13g), 16 = fein (M5), 8 = die groben Modelle als Rückfall. */
const DETAIL = 32;
const VEST = 0xf2b632; // Warnweste
const REFLECT = 0xf4f0e0; // Leuchtstreifen (Glüh-Material)

/** Wie breit ist die Art (Voxel links/rechts zusätzlich)? */
const widthOf = (s) => (s.armor || s.wide ? 2 : s.extra === 'kapuze' ? -1 : 0);

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

// --- Doppelt fein (1/32 m, M13g) ------------------------------------------------------
// Gleiche Maße in Metern wie die 1/16-Modelle, doppelt so viele Voxel je Richtung.
// Gelenke und Versätze sind die Werte der 1/16-Schlurfer mal zwei. Die Feinheit
// steckt in den Merkmalen: ein Zeh schaut aus dem Schuh, Finger einzeln,
// Knopfleiste und Taschen, genähter Mund, schwere Brauen, ein eingerissenes Ohr.

const U32 = 1 / 32;

/** Leuchtstreifen der Warnweste (Brummer), eine Schicht vor Brust und Rücken. */
function buildVestGlow32(s) {
  const m = new VoxelModel();
  const w = widthOf(s) * 2;
  // N1: Die Streifen liegen eine Schicht vor der gerundeten Weste (Bauch vorn, Rücken hinten)
  const shape = zombieTorsoShape(s);
  for (const y of [18, 19, 22, 23]) {
    for (let x = -13 - w; x <= 12 + w; x++) {
      let front = null;
      let back = null;
      for (let z = 12; z >= -12; z--) if (front === null && shape(x + 0.5, y + 0.5, z + 0.5) <= 0) front = z;
      for (let z = -12; z <= 12; z++) if (back === null && shape(x + 0.5, y + 0.5, z + 0.5) <= 0) back = z;
      if (front === null) continue;
      if (!(x >= -6 && x <= 5)) m.set(x, y, front + 1, REFLECT); // vorn sitzt die Blechplatte
      m.set(x, y, back - 1, REFLECT);
    }
  }
  return m;
}

// --- N1: Schlurfer aus Formen statt Kästen --------------------------------------
// Größe, Gelenke und Merkmale wie im Maß 1/32 (M13g), aber geformt: runder,
// etwas schiefer Kopf mit eingesunkenen Augenhöhlen, Nase und genähtem Mund,
// gebeugter Rücken (der Brummer mit Bauch), Arme mit Ellbogen, die Hände hängen
// – beim Flitzer angewinkelt wie beim Rennen –, Beine mit Knie und Schuhen.

/** Kopfform: gerundeter Quader, zur linken Seite etwas tiefer, schmales Kinn. */
function zombieHeadShape(x, y, z) {
  const yy = y + (x + 0.5) * 0.05; // schief
  const taper = Math.max(0, 31.5 - yy) * 0.7;
  const r = 6;
  const qx = Math.abs(x + 0.5) - (12 - taper) + r;
  const qy = Math.abs(yy - 35.5) - 8 + r;
  const qz = Math.abs(z + 2.5) - (10 - taper * 0.3) + r;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const oz = Math.max(qz, 0);
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

/** Vorderste und hinterste Voxelreihe des Kopfs je (x, y). */
const ZHEAD = (() => {
  const front = new Map();
  const back = new Map();
  for (let y = 27; y <= 44; y++) {
    for (let x = -13; x <= 12; x++) {
      for (let z = 9; z >= -13; z--) {
        if (zombieHeadShape(x + 0.5, y + 0.5, z + 0.5) <= 0) {
          front.set(x * 64 + y, z);
          break;
        }
      }
      for (let z = -13; z <= 9; z++) {
        if (zombieHeadShape(x + 0.5, y + 0.5, z + 0.5) <= 0) {
          back.set(x * 64 + y, z);
          break;
        }
      }
    }
  }
  return { front: (x, y) => front.get(x * 64 + y), back: (x, y) => back.get(x * 64 + y) };
})();

/** Augenhöhlen (Reihen 34–36), innen die leuchtenden Augen. */
const eyeAt = (x) => (x >= -8 && x <= -5) || (x >= 4 && x <= 7);

function sculptZombieLeg(s, seed) {
  const m = new VoxelModel();
  const runner = s.extra === 'kapuze';
  // Schuh: Sohle, runde Kappe; beim Flitzer ein heller Laufschuh mit rotem Streifen
  sculpt(m, roundBox(4, 0.6, 5, 4, 0.7, 5.1, 0.8), -1, 0, -1, 8, 1, 10, (x, y, z) => (runner ? (y === 0 ? P.s6 : P.s8) : y === 0 ? shade(s.feet, -1) : s.feet));
  const shoe = smoothUnion(capsule(4, 1.5, 3.8, 4, 3.5, 3.8, 3.5), blob(4, 2.2, 7, 3.3, 2.1, 2.8), 1.4);
  sculpt(m, shoe, -1, 1, -1, 8, 4, 10, (x, y, z, n) => {
    if (runner) return z >= 7 && y === 2 ? P.r3 : n.x < -0.6 && y <= 2 ? P.r3 : n.y > 0.5 ? P.s9 : P.s8;
    if (z >= 8 && x >= 5) return null; // aufgerissene Kappe …
    if (n.z > 0.4 && x % 3 === 1 && y === 3) return P.e7; // Schnürung
    return n.y > 0.5 ? shade(s.feet, 1) : s.feet;
  });
  if (!runner) m.box(5, 1, 8, 6, 1, 9, s.skin).set(5, 2, 8, s.skinShade); // … ein Zeh schaut heraus
  // Schienbein und Oberschenkel, das Knie ein wenig vor
  const leg = smoothUnion(capsule(4, 4, 4, 4, 7.6, 4.7, 3.2, 3.4), capsule(4, 7.6, 4.7, 4, 12.4, 4, 3.4, 3.9), 1.2);
  sculpt(m, leg, -1, 4, -1, 8, 11, 9, (x, y, z, n) => {
    const h = hash3(x >> 1, y >> 1, z >> 1, seed);
    if (y === 4 && h < 0.45 && !runner) return s.skin; // Knöchel unter dem ausgefransten Saum
    if (y === 11) return s.pantsDark;
    if (runner && Math.abs(n.x) > 0.8) return P.s8; // Streifen der Trainingshose
    if (!runner && n.z > 0.5 && x >= 2 && x <= 4 && y >= 7 && y <= 8) return y === 7 ? s.skinShade : s.skin; // Riss am Knie
    if (n.z < -0.5 || n.x > 0.7) return s.pantsDark;
    return h < 0.18 ? s.pantsDark : s.pants;
  });
  return m;
}

function sculptZombieArm(s, seed, right = false) {
  const m = new VoxelModel();
  const runner = s.extra === 'kapuze';
  if (right && s.tool) addTool(m, s.tool); // M22: Axt bzw. Laternenstab in der rechten Hand
  // Oberarm im Ärmel, unten ausgefranst; der Brummer hat ein Schulterblech
  sculpt(m, capsule(2, 15.2, 4, 2, 8.6, 4, 2.5, 2.2), -1, 8, 1, 5, 15, 7, (x, y, z, n) => {
    if (s.armor && y >= 13) return n.y > 0.4 ? P.s6 : P.s5; // Schulterblech
    const h = hash3(x, y, z, seed + 5);
    if (y === 8) return h < 0.4 ? null : s.shirtDark; // ausgefranster Ärmel
    if (y === 15 && !runner && n.y > 0.6) return h < 0.5 ? s.moss : shade(s.moss, 1);
    if (y === 11 && n.x < -0.5) return s.shirtDark; // Falte
    return n.z < -0.5 ? s.shirtDark : s.shirt;
  });
  // Unterarm: hängt beim Schlurfer nach hinten weg (nach vorn gestreckt baumeln die
  // Hände), beim Flitzer angewinkelt nach vorn wie beim Rennen
  const bend = runner ? 3.2 : -1.8;
  const wx = 2;
  const wy = runner ? 4.8 : 3.4;
  const wz = 4 + bend;
  sculpt(m, capsule(2, 8.2, 4, wx, wy, wz, 2.0, 1.75), -2, 2, -3, 6, 8, 11, (x, y, z, n) => {
    if (runner && y >= 6) return n.z < -0.4 ? s.shirtDark : s.shirt; // Ärmel bis zum Handgelenk
    return n.y < -0.4 || n.z < -0.5 ? s.skinShade : s.skin;
  });
  // Hand: hängt weiter nach unten, Finger als Streifen, dunkle Nägel
  const hx = wx;
  const hy = wy - 2.2;
  const hz = wz + (runner ? 0.6 : -0.9);
  sculpt(m, blob(hx, hy, hz, 1.9, 2.3, 2.1), -2, -2, -4, 6, 6, 12, (x, y, z, n) => {
    if (y === Math.floor(hy - 1.6)) return (x + z) % 2 ? P.e6 : s.skinShade; // Nägel
    if (n.z > 0.5 && (x + y) % 2 === 0) return s.skinShade; // Fingerglieder
    return n.y > 0.5 ? shade(s.skin, 1) : s.skin;
  });
  return m;
}

/**
 * Werkzeug in der Hand (M22), im Maß des Arms: Die Hand liegt bei (2, 1, 1); der
 * Stiel zeigt nach +z – bei nach vorn gestreckten Armen also nach oben.
 * - Axt: Stiel aus Esche, Blatt aus Stahl mit blanker Schneide (zeigt nach vorn)
 * - Stab: knorriger Stab, oben der Käfig der Laterne (das Licht ist ein eigenes Glühteil)
 */
function addTool(m, tool) {
  if (tool === 'axt') {
    m.box(1, 0, -3, 2, 1, 17, (x, y, z) => (z % 5 === 0 ? P.e4 : x === 1 ? P.e6 : P.e5));
    m.box(1, -7, 12, 2, -1, 17, (x, y, z) => (y === -7 ? P.s9 : y === -6 ? P.s8 : z === 12 || z === 17 ? P.s5 : x === 1 ? P.s7 : P.s6));
    m.box(1, 2, 13, 2, 3, 16, P.s5); // Nacken der Axt
    return;
  }
  if (tool === 'schaufel') {
    // Spaten: Stiel mit Griff, das Blatt vorn voller Erde
    m.box(1, 0, -6, 2, 1, 14, (x, y, z) => (z === -6 ? P.e3 : x === 1 ? P.e6 : P.e5));
    m.box(0, -1, -8, 3, 2, -7, P.e4); // Griff
    m.box(0, -6, 14, 3, 1, 19, (x, y, z) => (y <= -5 ? P.e3 : z === 19 ? P.s8 : x === 0 ? P.s6 : P.s5));
    return;
  }
  if (tool === 'loescher') {
    // Kerzenlöscher: langer Stiel, oben ein Messinghütchen, verrußt
    m.box(1, 0, -6, 2, 1, 22, (x, y, z) => (z % 7 === 0 ? P.e3 : P.e4));
    for (let z = 23; z <= 27; z++) {
      const r = Math.max(0, (27 - z) * 0.7) + 0.6;
      for (let y = -3; y <= 4; y++) for (let x = -2; x <= 5; x++) if (Math.hypot(x - 1.5, y - 0.5) <= r && Math.hypot(x - 1.5, y - 0.5) > r - 1.2) m.set(x, y, z, z >= 26 ? P.n1 : P.f4);
    }
    return;
  }
  if (tool === 'stab') {
    m.box(1, 0, -8, 2, 1, 23, (x, y, z) => (z % 6 === 0 ? P.e3 : (x + z) % 4 === 0 ? P.e5 : P.e4));
    m.set(0, 0, 4, P.e4).set(3, 1, 12, P.e4); // Knorren
    // Käfig: vier Stäbe, Deckel und Boden
    for (const [x, y] of [[-1, -1], [4, -1], [-1, 2], [4, 2]]) m.box(x, y, 24, x, y, 29, P.s3);
    m.box(-1, -1, 30, 4, 2, 30, P.s4).box(-1, -1, 23, 4, 2, 23, P.s4);
    m.box(1, 0, 31, 2, 1, 32, P.s5); // Ring oben
  }
}

/** Leuchten der Hexenlaterne (M22): eigenes Glühteil am rechten Arm, im Maß des Arms. */
function buildLanternGlow32() {
  const m = new VoxelModel();
  m.box(0, 0, 24, 3, 1, 29, (x, y, z) => (z >= 26 && z <= 27 && x >= 1 && x <= 2 ? 0xfff2c4 : 0xffc860));
  return m;
}

/** Rumpfform: runde Schultern, gebeugter Rücken (Buckel oben hinten), der Brummer mit Bauch. */
function zombieTorsoShape(s) {
  const w = widthOf(s) * 2;
  let shape = roundBox(-0.5, 19.5, -0.5, 12 + w, 8, 8, 3.8);
  if (s.extra !== 'kapuze') shape = smoothUnion(shape, blob(-0.5, 24, -5, 10 + w, 5.5, 4.5), 2.5);
  if (s.armor) shape = smoothUnion(shape, blob(-0.5, 17.5, 3.5, 11 + w, 6.5, 5.5), 2.5);
  return shape;
}

function sculptZombieTorso(s, seed) {
  const m = new VoxelModel();
  const w = widthOf(s) * 2;
  const shape = zombieTorsoShape(s);
  const front = new Map();
  for (let y = 12; y <= 28; y++) {
    for (let x = -13 - w; x <= 12 + w; x++) {
      for (let z = 11; z >= -12; z--) {
        if (shape(x + 0.5, y + 0.5, z + 0.5) <= 0) {
          front.set(x * 64 + y, z);
          break;
        }
      }
    }
  }
  const isFront = (x, y, z) => front.get(x * 64 + y) === z;
  sculpt(m, shape, -14 - w, 12, -12, 13 + w, 29, 11, (x, y, z, n) => {
    const h = hash3(x >> 1, y >> 1, z >> 1, seed);
    const f = isFront(x, y, z);
    if (s.armor) {
      // Warnweste über dem Hemd, vernietete Blechplatte vorn
      if (f && y >= 16 && y <= 23 && x >= -6 && x <= 5) {
        if ((x === -6 || x === 5) && (y === 16 || y === 23)) return P.s8; // Nieten
        if (x === 1 && y === 20) return P.r3; // Rost
        return (x + (y >> 1)) % 3 ? P.s5 : P.s4;
      }
      if (y <= 13) return s.shirtDark;
      return f && (x === -8 || x === 7) ? shade(VEST, -1) : n.y > 0.6 ? shade(VEST, 1) : VEST;
    }
    if (s.dirt) {
      // Gräber (M22): Latzhose über dem Hemd, voller Erdflecken
      if (f && y >= 16 && y <= 24 && x >= -6 && x <= 5) return (x === -6 || x === 5) && y === 24 ? P.s7 : h < 0.3 ? P.e2 : P.b2; // Latz
      if (f && (x === -7 || x === 6) && y >= 22) return P.b1; // Träger
      if (h < 0.18) return P.e3;
      return roundTone(s.shirt, n, { light: 0 });
    }
    if (s.soot) {
      // Lichtfresser (M22): Kutte voller Ruß, ein Strick als Gürtel
      if (y === 17) return x % 3 ? P.e6 : P.e5;
      if (h < 0.3) return P.n1;
      return roundTone(s.shirt, n, { light: 0 });
    }
    if (s.plaid) {
      // Holzfällerhemd (M22): rot-schwarz kariert, Knopfleiste, Hosenträger
      if (f && (x === -7 || x === 6) && y >= 14) return P.e2;
      if (f && (x === -1 || x === 0)) return (y === 17 || y === 21 || y === 25) && x === 0 ? P.e8 : P.r1;
      const lx = ((x + 64) >> 2) % 2;
      const ly = (y >> 2) % 2;
      return roundTone(lx && ly ? P.n1 : lx || ly ? s.shirtDark : s.shirt, n, { light: 0 });
    }
    if (s.dress) {
      // Kleid der Pilzmutter (M22): Moosflecken, kleine Pilze, ein Gürtel aus Wurzeln
      if (y === 18 || y === 19) return (x & 1) ? P.e3 : P.e4;
      if (h < 0.22) return (x + y) % 3 ? s.moss : shade(s.moss, 1);
      return roundTone(s.shirt, n, { light: 0 });
    }
    if (s.robe) {
      // Kutte der Hexe (M22): dunkel, mit gestickten Sternen, ein Strick als Gürtel
      if (y === 17) return x % 3 ? P.e6 : P.e5;
      if (f && (x * 7 + y * 3) % 23 === 0) return P.f6;
      return roundTone(s.shirt, n, { light: 0 });
    }
    if (s.stone) {
      // Moosriese (M22): Steinplatten im Moos, dazwischen Farn
      const st = hash3(x >> 2, y >> 2, z >> 2, seed + 11);
      if (st < 0.38) return n.y > 0.5 ? P.s6 : st < 0.2 ? P.s5 : P.s4;
      if (h < 0.1) return P.g7;
      return roundTone(h < 0.5 ? s.shirt : s.moss, n, { light: 0 });
    }
    if (s.extra === 'kapuze') {
      // Kapuzenpulli mit Bauchtasche und Bündchen
      if (f && y >= 16 && y <= 19 && x >= -6 && x <= 5) return y === 19 || x === -6 || x === 5 ? shade(s.shirtDark, -1) : s.shirtDark;
      if (y <= 13) return x & 1 ? s.shirtDark : shade(s.shirtDark, -1); // Bündchen gerippt
      return roundTone(s.shirt, n, { light: 0 });
    }
    if (y === 12) return h < 0.35 ? null : s.shirtDark; // ausgefranster Saum
    if (y === 13) return s.shirtDark;
    if (f && h < 0.06) return s.skin; // Löcher
    if (y >= 26 && n.y > 0.5 && h < 0.45) return s.moss;
    if (f && (x === -1 || x === 0)) return (y === 17 || y === 21 || y === 25) && x === 0 ? P.e8 : s.shirtDark; // Knopfleiste
    if (f && y >= 25 && (x === -3 || x === 2 || x === -2 || x === 1)) return s.shirtDark; // Kragen
    if (f && x >= 4 && x <= 8 && (y === 23 || (y >= 20 && y <= 23 && (x === 4 || x === 8)))) return s.shirtDark; // Brusttasche
    if (h < 0.14) return s.shirtDark;
    return roundTone(s.shirt, n, { light: 0 });
  });
  if (s.extra === 'kapuze') {
    // Kordeln der Kapuze
    for (const x of [-4, 3]) {
      for (let y = 20; y <= 26; y++) {
        const z = (front.get(x * 64 + y) ?? 7) + 1;
        m.set(x, y, z, y === 20 ? P.s7 : P.s9);
      }
    }
  } else if (!s.armor) {
    // Moospolster auf der Schulter, mit einem Pilzchen
    sculpt(m, blob(8.5, 27.5, -2, 3.6, 2.2, 3.4), 4, 26, -6, 13, 30, 2, (x, y, z, n) => (n.y > 0.5 ? shade(s.moss, 1) : s.moss));
    m.set(8, 30, -2, P.e8).set(8, 31, -2, P.f5).set(7, 31, -2, P.f4).set(9, 31, -2, P.f4);
  }
  if (s.cape) {
    // Moosumhang am Rücken, gewellt und unten ausgefranst
    sculpt(m, roundBox(-0.5, 18.5, -12.5, 12, 9, 1.8, 1.5), -13, 9, -15, 12, 28, -10, (x, y, z) => {
      const h = hash3(x >> 1, y >> 1, z, seed + 3);
      if (y <= 11 && h < 0.5) return null;
      if (Math.sin(x * 0.7) > 0.6 && z === -11) return null; // Falten
      return h < 0.3 ? P.g5 : h < 0.55 ? P.g4 : s.shirt;
    });
  }
  return m;
}

function sculptZombieHead(s, seed) {
  const m = new VoxelModel();
  const hooded = s.extra === 'kapuze';
  sculpt(m, zombieHeadShape, -13, 27, -13, 12, 44, 9, (x, y, z, n) => {
    const h = hash3(x >> 1, y >> 1, z >> 1, seed);
    if (z === ZHEAD.front(x, y) && n.z > 0.3) {
      if (y >= 34 && y <= 36 && eyeAt(x)) return y === 36 ? s.skinShade : P.n0; // Augenhöhlen
      if (y === 37 && x >= -9 && x <= 8 && !(x >= -4 && x <= 3)) return shade(s.skinShade, -1); // schwere Brauen
      if (y === 30 && x >= -5 && x <= 4) return P.n1; // Mund
      if ((y === 29 || y === 31) && x >= -5 && x <= 4 && x % 2 === 0) return P.e8; // Stiche
      if (y <= 29) return s.skinShade; // Kinn im Schatten
    }
    if (y >= 42 && n.y > 0.5 && h < 0.55 && !hooded) return s.moss;
    if (n.z < -0.55 && y >= 35) return (x + y) % 5 === 0 ? shade(s.hair, 1) : s.hair; // Haarsträhnen
    if (h < 0.08) return s.skinShade; // Flecken
    return roundTone(s.skin, n, { light: 0 });
  });
  // Nase
  for (const x of [-1, 0]) for (const y of [32, 33]) m.set(x, y, (ZHEAD.front(x, y) ?? 7) + 1, s.skinShade);
  // Ohren, das linke eingerissen
  sculpt(m, blob(-13, 34.5, -2, 1.3, 2.1, 1.6), -15, 32, -5, -11, 37, 1, (x, y) => (y >= 36 && x <= -14 ? null : s.skinShade));
  sculpt(m, blob(12, 34.5, -2, 1.3, 2.1, 1.6), 10, 32, -5, 14, 37, 1, s.skinShade);
  switch (s.extra) {
    case 'blume':
      // Gänseblümchen mit gelber Mitte, ein Blatt am Stiel
      m.box(4, 43, -4, 4, 47, -4, P.g5).set(5, 45, -4, P.g6).set(6, 46, -4, P.g6);
      m.box(3, 48, -5, 5, 48, -3, P.f6);
      for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]]) m.set(4 + dx, 48, -4 + dz, P.s9);
      m.set(4, 49, -4, P.f7);
      break;
    case 'kapuze': {
      // Rote Kapuze: Schale um den runden Kopf, vorn offen, Saum etwas dunkler
      const hood = (x, y, z) => Math.max(zombieHeadShape(x, y - 1, z) - 2.2, -zombieHeadShape(x, y, z));
      sculpt(m, hood, -16, 29, -16, 15, 47, 11, (x, y, z, n) => {
        const f = ZHEAD.front(x, Math.min(44, y));
        if (y <= 41 && f !== undefined && z >= f - 1 && x > -11 && x < 10) return null; // Gesicht frei
        if (y < 31) return null;
        return n.z > 0.5 || y >= 46 ? s.shirtDark : (x + y) % 6 === 0 ? shade(s.shirt, -1) : s.shirt;
      });
      break;
    }
    case 'pilzchen':
      // Drei Fliegenpilze mit weißen Tupfen
      for (const [cx, cz, hh] of [[-6, -4, 4], [4, 0, 2], [0, -8, 6]]) {
        m.box(cx, 43, cz, cx + 1, 43 + hh, cz + 1, P.e8);
        m.ellipsoid(cx + 1, 44 + hh, cz + 1, 3.2, 2.2, 3.2, (x, y, z, dx, dy) => (dy < -0.2 ? null : (x + z + y) % 4 === 0 ? P.s9 : P.a0));
      }
      break;
    case 'kegel': {
      // Warnkegel als Helm (die weißen Streifen leuchten, siehe sculptZombieGlow)
      sculpt(m, roundBox(-0.5, 45.5, -2.5, 12, 2, 10, 1.5), -13, 44, -13, 12, 47, 8, (x, y) => (y === 47 ? P.f4 : P.f3));
      for (let y = 48; y <= 59; y++) {
        const r = 9 - Math.floor((y - 48) * 0.6);
        m.cylinder(-0.5, -2.5, y, y, r, (x) => (x < -r + 2 ? P.f4 : P.f3));
      }
      break;
    }
    case 'muetze': {
      // Holzfäller (M22): Pudelmütze, rot mit schwarzem Rand, und ein buschiger Bart ums Kinn
      sculpt(m, roundBox(-0.5, 45, -2.5, 12.5, 3.5, 10.5, 3), -14, 42, -14, 13, 49, 9, (x, y) => (y <= 42 ? P.n1 : (x + y) % 4 === 0 ? P.r2 : P.r3));
      sculpt(m, blob(-0.5, 51, -2.5, 3.2, 2.6, 3.2), -5, 48, -7, 4, 54, 2, (x, y, z, n) => (n.y > 0.4 ? P.s9 : P.s8));
      const beard = (x, y, z) => Math.max(blob(-0.5, 29, 5.5, 10, 5.5, 4.5)(x, y, z), -zombieHeadShape(x, y, z) - 0.5);
      sculpt(m, beard, -12, 23, 0, 11, 34, 11, (x, y, z, n) => {
        if (y >= 30 && x >= -5 && x <= 4) return null; // der Mund bleibt frei
        return (x + y) % 3 === 0 ? P.e2 : n.y < -0.4 ? P.e2 : P.e3;
      });
      break;
    }
    case 'kappe':
      // Gräber (M22): flache Schiebermütze mit Schirm nach vorn
      sculpt(m, roundBox(-0.5, 44.5, -3, 12.5, 2.2, 10.5, 2), -14, 42, -14, 13, 47, 8, (x, y) => (y === 42 ? P.e2 : (x + y) % 3 ? P.e4 : P.e3));
      m.box(-8, 43, 8, 7, 43, 11, P.e3);
      break;
    case 'topf':
      // Schildträger (M22): Kochtopf als Helm, mit Henkeln
      sculpt(m, roundBox(-0.5, 46, -2.5, 12.5, 4, 10.5, 1.5), -14, 42, -14, 13, 50, 9, (x, y, z, n) => (y === 42 ? P.s3 : n.y > 0.6 ? P.s6 : x < -8 ? P.s4 : P.s5));
      m.box(-15, 47, -3, -14, 48, -1, P.s3).box(13, 47, -3, 14, 48, -1, P.s3);
      break;
    case 'kutte': {
      // Lichtfresser (M22): tiefe Kapuze der Kutte, das Gesicht im Schatten
      const hood = (x, y, z) => Math.max(zombieHeadShape(x, y - 1, z) - 2.4, -zombieHeadShape(x, y, z));
      sculpt(m, hood, -16, 29, -16, 15, 48, 11, (x, y, z, n) => {
        const f = ZHEAD.front(x, Math.min(44, y));
        if (y <= 40 && f !== undefined && z >= f - 1 && x > -10 && x < 9) return null; // Gesicht frei
        if (y < 31) return null;
        return n.z > 0.5 ? s.shirtDark : (x + y) % 7 === 0 ? P.n1 : s.shirt;
      });
      break;
    }
    case 'sporen':
      // Brüter (M22): Sporenhöcker auf dem Kopf, mit hellen Spitzen
      for (const [x, z, r] of [[-5, -4, 3], [4, -2, 2.5], [0, -9, 2.2]]) sculpt(m, blob(x, 44.5, z, r, r * 0.9, r), x - 4, 42, z - 4, x + 4, 48, z + 4, (xx, y, zz, n) => (n.y > 0.6 ? P.a3 : P.d3));
      break;
    case 'mutterhut':
      // Pilzmutter (M22): Lamellen unter dem großen Hut (der Hut selbst leuchtet, siehe Glühteil)
      sculpt(m, roundBox(-0.5, 44.5, -2.5, 14, 1.5, 12, 1.2), -15, 43, -15, 14, 46, 10, (x, y) => (y === 43 ? P.d3 : (x & 1) ? P.d3 : P.d4));
      break;
    case 'hexenhut': {
      // Laternenhexe (M22): breite Krempe, hohe Spitze, die oben abknickt, ein Band mit Schnalle
      sculpt(m, roundBox(-0.5, 44.5, -2.5, 16, 1, 14, 0.8), -17, 43, -17, 16, 46, 12, (x, y) => (y === 44 ? P.n1 : P.d0));
      for (let y = 46; y <= 64; y++) {
        const r = Math.max(1.5, 9.5 - (y - 46) * 0.45);
        const lean = y > 58 ? (y - 58) * 1.1 : 0; // die Spitze knickt nach hinten
        m.cylinder(-0.5, -2.5 - lean, y, y, r, (x) => (y === 48 || y === 49 ? (x === 0 ? P.f6 : P.f4) : x < -r + 2 ? P.d1 : P.d0));
      }
      break;
    }
    case 'farn':
      // Moosriese (M22): Moospolster, drei Steine und Farnwedel auf dem Kopf
      sculpt(m, roundBox(-0.5, 44, -2.5, 11, 2, 9, 1.8), -12, 42, -12, 11, 47, 7, (x, y, z) => (hash3(x, y, z, seed) < 0.5 ? P.g5 : P.g4));
      for (const [x, z] of [[-7, -5], [5, 0], [0, -9]]) m.box(x, 46, z, x + 2, 48, z + 2, (xx, yy) => (yy === 48 ? P.s6 : P.s5));
      for (const side of [-1, 1]) {
        m.line(side * 3, 46, -2, side * 11, 57, -4, P.g6, 1);
        m.line(side * 5, 49, -3, side * 9, 53, 1, P.g7);
      }
      break;
    case 'krone':
      // Geweihkrone aus Ästen mit Gabeln und Blüten, ein Moosband darunter
      for (const side of [-1, 1]) {
        const bx = side < 0 ? -10 : 8;
        m.box(bx, 43, -4, bx + 1, 55, -3, P.e5);
        m.line(bx + side, 50, -4, bx + side * 5, 54, -4, P.e5, 1);
        m.line(bx - side, 54, -4, bx - side * 3, 58, -4, P.e6, 1);
        m.box(bx + side * 5, 55, -4, bx + side * 5 + 1, 57, -3, P.e6);
        m.set(bx + side * 5, 58, -4, P.a1).set(bx - side * 3, 59, -4, P.a0).set(bx, 56, -4, P.a1).set(bx + 1, 56, -4, P.a4);
      }
      sculpt(m, roundBox(-0.5, 44, -2.5, 8.5, 1.2, 5, 1), -10, 43, -9, 9, 45, 4, (x) => (x % 3 === 0 ? P.g5 : P.g4));
      break;
    default:
      break;
  }
  return m;
}

/**
 * Leuchtende Teile am Kopf (N1): Augen in den Höhlen, Moderpilzchen am
 * Hinterkopf, Reflektorstreifen am Warnkegel, der große Hut des Leuchtpilzes.
 */
function sculptZombieGlow(s) {
  const m = new VoxelModel();
  for (let x = -8; x <= 7; x++) {
    if (!eyeAt(x)) continue;
    for (let y = 34; y <= 35; y++) {
      const z = (ZHEAD.front(x, y) ?? 7) + 1;
      const inner = (x === -7 || x === -6 || x === 5 || x === 6) && y === 35;
      m.set(x, y, z, inner ? 0xffffff : s.eyes);
    }
  }
  if (s.extra !== 'kapuze') {
    for (const [x, y] of [[-6, 36], [4, 34], [0, 40]]) {
      const z = (ZHEAD.back(x, y) ?? -12) - 1;
      m.box(x, y, z, x + 1, y + 1, z, (xx, yy) => (yy === y + 1 ? 0xd8ffa0 : 0xb6f07a));
    }
  }
  if (s.extra === 'kegel') {
    // Reflektorring am Kegel (eine Voxelschicht außen)
    for (let y = 52; y <= 55; y++) {
      const r = 9 - Math.floor((y - 48) * 0.6);
      for (let x = -12; x <= 11; x++) {
        for (let z = -14; z <= 9; z++) {
          const d = Math.hypot(x + 0.5 + 0.5, z + 0.5 + 2.5);
          if (d > r && d <= r + 1) m.set(x, y, z, REFLECT);
        }
      }
    }
  }
  if (s.extra === 'leuchthut') {
    m.ellipsoid(-0.5, 44, -2.5, 16, 6, 14, (x, y, z, dx, dy) => {
      if (y < 44) return null;
      if ((x * 3 + z * 5 + y) % 11 === 0 && dy > 0.3) return 0xf7f3ea; // helle Tupfen
      return dy > 0.6 ? 0x8ee0cc : 0x6cc0ae;
    });
  }
  return m;
}

/** Alte Tür (M22, Schildträger): Bretter, Z-Riegel, Knauf – vor dem Bauch, von den Händen gehalten. */
function buildDoor32(seed) {
  const m = new VoxelModel();
  m.box(-10, 6, 13, 9, 36, 14, (x, y, z) => {
    if (z === 13) return P.e3; // Rückseite
    const plank = (x + 10) % 5 === 0;
    const h = hash3(x >> 1, y >> 2, 0, seed + 40);
    if ((y === 10 || y === 31) || Math.abs(y - 10 - ((x + 10) * 21) / 19) < 1) return P.e4; // Riegel und Strebe
    return plank ? P.e5 : h < 0.2 ? P.e6 : P.e7;
  });
  m.box(6, 20, 15, 7, 21, 15, P.f5).set(6, 21, 15, P.f7); // Knauf
  return m;
}

/** Sporensäcke des Brüters (M22): drei violett glimmende Beulen auf dem Rücken. */
function buildSacsGlow32() {
  const m = new VoxelModel();
  for (const [x, y, r] of [[-6, 24, 4], [5, 23, 4.5], [0, 18, 3.5]]) {
    m.ellipsoid(x, y, -11, r, r, r * 0.8, (xx, yy, zz, dx, dy) => (zz > -11 ? null : dy > 0.4 ? 0xd8b8ff : (xx + yy) % 3 === 0 ? 0xf2e4ff : 0xa88fd0));
  }
  return m;
}

/**
 * Moderfalter (M22): eine Motte statt eines Menschen, aber mit denselben
 * Gelenknamen (die Flügel sind die »Arme«, damit Horde und Gerüst gleich bleiben).
 */
function mothParts32(s, seed) {
  const leg = () => {
    const m = new VoxelModel();
    m.line(0, 0, 0, 0, 5, -1, P.d1).line(0, 5, -1, 0, 8, 1, P.d1);
    return m;
  };
  const body = new VoxelModel();
  sculpt(body, smoothUnion(blob(0, 17, -3, 5.5, 5, 9), blob(0, 19, 4, 5, 5, 4.5), 2), -7, 11, -13, 7, 25, 10, (x, y, z, n) => {
    const h = hash3(x >> 1, y >> 1, z >> 1, seed);
    if (z < -4 && (z & 3) === 0) return s.shirtDark; // Ringe am Hinterleib
    if (n.y > 0.5 && h < 0.4) return shade(s.skin, 1); // Pelz
    return roundTone(s.skin, n, { light: 0 });
  });
  const head = new VoxelModel();
  sculpt(head, blob(0, 21, 10, 3.6, 3.4, 3.2), -5, 17, 6, 5, 25, 14, (x, y, z, n) => roundTone(s.skinShade, n, { light: 0 }));
  for (const side of [-1, 1]) {
    head.line(side * 1, 24, 11, side * 5, 30, 14, P.d4);
    for (let k = 1; k <= 4; k++) head.set(side * (1 + k), 24 + k + 1, 12 + k * 0.6 | 0, P.d4); // gefiederte Fühler
  }
  const glow = new VoxelModel();
  for (const side of [-1, 1]) glow.box(side < 0 ? -3 : 2, 21, 13, side < 0 ? -2 : 3, 22, 13, s.eyes);
  const wing = (side) => {
    const m = new VoxelModel();
    // Vorder- und Hinterflügel: flach, zum Rand heller, ein Augenfleck
    for (let x = 0; x <= 26; x++) {
      for (let z = -14; z <= 12; z++) {
        const fx = x / 26;
        const front = z >= 0 && z <= 12 - fx * 6 && Math.hypot(x - 13, (z - 5) * 1.4) <= 15;
        const back = z < 0 && z >= -14 + fx * 5 && Math.hypot(x - 10, (z + 6) * 1.3) <= 12;
        if (!front && !back) continue;
        const spot = Math.hypot(x - 16, z - 4) <= 3.2;
        const rim = Math.hypot(x - 13, (z - 5) * 1.4) > 13 || Math.hypot(x - 10, (z + 6) * 1.3) > 10.5;
        const c = spot ? (Math.hypot(x - 16, z - 4) <= 1.5 ? P.n1 : P.f6) : rim ? P.d4 : (x + z) % 7 === 0 ? P.d2 : P.d3;
        m.set(side * x, 0, z, c);
      }
    }
    return m;
  };
  return [
    { name: 'legL', model: leg(), joint: [-2, 12, 1], offset: [-2, 4, 1], parent: 'root', unit: U32 },
    { name: 'legR', model: leg(), joint: [2, 12, 1], offset: [2, 4, 1], parent: 'root', unit: U32 },
    { name: 'torso', model: body, joint: [0, 12, 0], offset: [0, 0, 0], parent: 'body', unit: U32 },
    { name: 'head', model: head, joint: [0, 20, 8], offset: [0, 0, 0], parent: 'body', unit: U32 },
    { name: 'glow', model: glow, joint: [0, 20, 8], offset: [0, 0, 0], parent: 'head', glow: true, unit: U32 },
    { name: 'armL', model: wing(-1), joint: [-4, 21, 0], offset: [-4, 21, 0], parent: 'body', unit: U32 },
    { name: 'armR', model: wing(1), joint: [4, 21, 0], offset: [4, 21, 0], parent: 'body', unit: U32 },
  ];
}

/**
 * Moderherz (M25, Finale): kein Mensch mehr, sondern das Herz des Moders – mit
 * denselben Gelenknamen wie alle Schlurfer (Wurzeln sind die »Beine«, Ranken
 * die »Arme«, die Krone aus Pilzhüten der »Kopf«), damit Horde und Gerüst gleich
 * bleiben. Maß 1/32 wie alle Schlurfer; groß wird es über `scale`.
 */
function heartParts32(s, seed) {
  const bark = (x, y, z, n) => {
    const h = hash3(x >> 1, y >> 1, z >> 1, seed + 3);
    if (h < 0.12) return s.moss; // Moosflecken
    if (((x + z * 2 + (y >> 1)) & 7) === 0) return P.d0; // Rindenfurchen
    return roundTone(s.pants, n, { light: 1, dark: -1 });
  };
  // Wurzelbeine: ein dicker Strang, unten aufgefächert in kleine Wurzeln
  const leg = (side) => {
    const m = new VoxelModel();
    sculpt(m, smoothUnion(capsule(4, 13, 4, 4 + side, 3, 5, 4, 3.2), capsule(4 + side, 4, 5, 4 + side * 3, 0.8, 9, 2.4, 1.6), 1.5), -3, 0, -3, 12, 14, 13, bark);
    sculpt(m, capsule(4 + side, 3, 4, 4 - side * 3, 0.6, 0, 2.2, 1.2), -3, 0, -3, 12, 5, 9, bark);
    sculpt(m, capsule(4, 3, 4, 4 + side * 5, 0.6, 2, 2, 1.1), -4, 0, -2, 13, 5, 9, bark);
    return m;
  };
  // Das Herz: zwei Kammern oben, unten spitz zulaufend; helle Adern, Moos auf der Kuppe
  const heart = new VoxelModel();
  const shape = smoothUnion(smoothUnion(blob(-6, 30, 0, 10, 9.5, 9), blob(6, 30.5, 0, 10, 9, 9), 3), blob(0, 21, 0, 11, 10, 8.5), 4);
  sculpt(heart, shape, -17, 11, -10, 17, 40, 10, (x, y, z, n) => {
    const h = hash3(x >> 1, y >> 1, z >> 1, seed);
    if (n.y > 0.7 && h < 0.5) return h < 0.22 ? shade(s.moss, 1) : s.moss; // Moos oben
    const vein = Math.abs(Math.sin(x * 0.55 + y * 0.35) + Math.cos(z * 0.5 - y * 0.25)) < 0.16;
    if (vein && n.z > -0.3) return P.d4; // helle Adern
    if (h < 0.08) return P.d3;
    return roundTone(s.skin, n, { light: 1, dark: -1 });
  });
  // Krone aus Pilzhüten (»Kopf«): ein Ring kleiner Pilze auf der Kuppe
  const crown = new VoxelModel();
  const caps = [[-9, 0, -1, P.f4], [-4, 3, 4, P.r3], [2, 4, 5, P.f5], [7, 1, 2, P.r3], [0, 2, -5, P.f4], [9, -1, -4, P.f5], [-6, 1, -6, P.r4]];
  caps.forEach(([cx, dy, cz, cap], k) => {
    const stem = 3 + (k % 3);
    crown.box(cx, 0, cz, cx, stem + dy, cz, P.s8);
    sculpt(crown, blob(cx + 0.5, stem + dy + 1.2, cz + 0.5, 2.6, 1.4, 2.6), cx - 3, stem + dy, cz - 3, cx + 3, stem + dy + 3, cz + 3, (x, y, z, n) => (((x + z + k) & 3) === 0 && n.y > 0.3 ? P.a4 : roundTone(cap, n, { light: 1, dark: -1 })));
  });
  // Glimmende Knoten vorn auf dem Herzen (Glüh-Material, pochen mit dem Licht)
  const glow = new VoxelModel();
  for (const [kx, ky] of [[-7, 31], [5, 33], [-2, 24], [8, 25], [-9, 23], [1, 29]]) {
    for (let z = 10; z >= -10; z--) {
      if (shape(kx + 0.5, ky + 0.5, z + 0.5) <= 0) {
        glow.box(kx, ky, z + 1, kx + 1, ky + 1, z + 1, P.a3).set(kx, ky + 1, z + 1, P.a4);
        break;
      }
    }
  }
  // Ranken statt Arme: hängen seitlich herab und rollen sich am Ende ein
  const tendril = (side) => {
    const m = new VoxelModel();
    sculpt(m, smoothUnion(capsule(0, 14, 2, side * 4, 7, 3, 2.6, 2), capsule(side * 4, 7, 3, side * 2, 1.5, 6, 2, 1.4), 1.2), -8, 0, -2, 8, 17, 9, (x, y, z, n) => roundTone(s.shirt, n, { light: 1, dark: -1 }));
    sculpt(m, capsule(side * 2, 1.5, 6, side * -1, 3, 8, 1.4, 1), -6, 0, 3, 6, 6, 10, s.shirtDark);
    return m;
  };
  return [
    { name: 'legL', model: leg(-1), joint: [-6, 13, 0], offset: [-10, 0, -4], parent: 'root', unit: U32 },
    { name: 'legR', model: leg(1), joint: [6, 13, 0], offset: [2, 0, -4], parent: 'root', unit: U32 },
    { name: 'torso', model: heart, joint: [0, 12, 0], offset: [0, 0, 0], parent: 'body', unit: U32 },
    { name: 'head', model: crown, joint: [0, 38, 0], offset: [0, 38, 0], parent: 'body', unit: U32 },
    { name: 'glow', model: glow, joint: [0, 12, 0], offset: [0, 0, 0], parent: 'body', glow: true, unit: U32 },
    { name: 'armL', model: tendril(-1), joint: [-15, 30, 0], offset: [-15, 16, -2], parent: 'body', unit: U32 },
    { name: 'armR', model: tendril(1), joint: [15, 30, 0], offset: [15, 16, -2], parent: 'body', unit: U32 },
  ];
}

function fineParts32(s, seed) {
  if (s.moth) return mothParts32(s, seed);
  if (s.heart) return heartParts32(s, seed);
  const w = widthOf(s) * 2;
  const parts = [
    { name: 'legL', model: sculptZombieLeg(s, seed), joint: [-4, 12, 0], offset: [-8, 0, -4], parent: 'root', unit: U32 },
    { name: 'legR', model: sculptZombieLeg(s, seed + 1), joint: [4, 12, 0], offset: [0, 0, -4], parent: 'root', unit: U32 },
    { name: 'torso', model: sculptZombieTorso(s, seed), joint: [0, 12, 0], offset: [0, 0, 0], parent: 'body', unit: U32 },
    { name: 'head', model: sculptZombieHead(s, seed), joint: [0, 28, -4], offset: [0, 0, 0], parent: 'body', unit: U32 },
    { name: 'glow', model: sculptZombieGlow(s), joint: [0, 28, -4], offset: [0, 0, 0], parent: 'head', glow: true, unit: U32 },
    { name: 'armL', model: sculptZombieArm(s, seed), joint: [-14 - w, 28, 0], offset: [-16 - w, 12, -4], parent: 'body', unit: U32 },
    { name: 'armR', model: sculptZombieArm(s, seed + 2, true), joint: [14 + w, 28, 0], offset: [12 + w, 12, -4], parent: 'body', unit: U32 },
  ];
  if (s.armor) parts.push({ name: 'vest', model: buildVestGlow32(s), joint: [0, 12, 0], offset: [0, 0, 0], parent: 'body', glow: true, unit: U32 });
  // M22: die Tür des Schildträgers vor dem Bauch, die Sporensäcke des Brüters auf dem Rücken
  if (s.door) parts.push({ name: 'door', model: buildDoor32(seed), joint: [0, 12, 0], offset: [0, 0, 0], parent: 'body', unit: U32 });
  if (s.sacs) parts.push({ name: 'sacs', model: buildSacsGlow32(), joint: [0, 12, 0], offset: [0, 0, 0], parent: 'body', glow: true, unit: U32 });
  // M22: Das Licht der Hexenlaterne hängt am rechten Arm (im Maß des Arms)
  if (s.tool === 'stab') parts.push({ name: 'lantern', model: buildLanternGlow32(), joint: [14 + w, 28, 0], offset: [12 + w, 12, -4], parent: 'armR', glow: true, unit: U32 });
  return parts;
}

/**
 * Teile einer Art mit ihren Gelenken (wie in characters.js).
 * @returns {Array<{name:string, model:VoxelModel, joint:number[], offset:number[], parent:'root'|'body'|'head', glow?:boolean}>}
 */
export function zombieParts(type, seed = 11) {
  const s = SPECS[type];
  if (DETAIL === 32) return fineParts32(s, seed);
  if (DETAIL === 16) return fineParts(s, seed);
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

/** Sporenkapsel des Brüters (M22): ein violett glimmender Sack mit hellen Adern (Glüh-Material). */
export function podModel() {
  const m = new VoxelModel();
  m.ellipsoid(0, 5, 0, 5.5, 5, 5.5, (x, y, z, dx, dy) => (y < 0 ? null : (x * 3 + z * 5 + y) % 7 === 0 ? 0xf2e4ff : dy > 0.5 ? 0xd8b8ff : 0xa88fd0));
  m.box(-1, 10, -1, 0, 11, 0, 0xf2e4ff);
  return m;
}
