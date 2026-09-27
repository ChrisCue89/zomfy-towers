// Die Überlebenden (Meilenstein 6) im feinen Maß (1/16 m). Gleiche Maße und
// Gelenke wie Mika (characters.js): Beine y 0–5, Rumpf y 6–13, Kopf y 14–21,
// Arme 2 × 8 Voxel – so passen Rig und Animationen. Jede Figur hat ein
// eigenes, schon von Weitem lesbares Merkmal (DESIGN.md 4.5):
//   Oma Hilde   – blaue Postmütze, grauer Dutt, Brille, Posttasche
//   Bert        – rote Kappe, Rauschebart, Karohemd mit oranger Schürze
//   Juna        – dicke Kopfhörer, gelbe Regenjacke, Antenne am Rucksack
//   Dr. Yusuf   – weißer Kittel, Brille, Stethoskop
//   Balduin     – der Händler (M8), seit M9 ein Seebär: Schiebermütze,
//                 kräftiger grauer Bart, roter Schal, dunkler Mantel und ein
//                 riesiger Rucksack mit Deckenrolle und Pfanne
// Der Hund Knopf ist ein eigenes Modell (vierbeinig, siehe dogModel.js).

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';

/** Gesicht auf der Vorderseite (z = 3): Augen, Brauen, Wangen, Mund. */
function face(spec, x, y, { glasses = false, beard = false } = {}) {
  if ((x === -4 || x === -3 || x === 2 || x === 3) && y === 17) return spec.eyes;
  if (glasses && y === 18 && ((x >= -5 && x <= -2) || (x >= 1 && x <= 4))) return P.s3; // Brillenrand
  if (glasses && y === 18 && (x === -1 || x === 0)) return P.s4; // Steg
  if (glasses && y === 17 && (x === -5 || x === -2 || x === 1 || x === 4)) return P.s3;
  if (!glasses && y === 18 && (x === -4 || x === -3 || x === 2 || x === 3)) return spec.brow || spec.skinShade;
  if (beard && y <= 16) {
    if (y === 16 && x >= -1 && x <= 0) return spec.skinShade; // Nase über dem Bart
    if (y === 15 && x >= -1 && x <= 0) return P.a0; // Mund im Bart
    return (x + y) % 3 === 0 ? spec.beardLight : spec.beard;
  }
  if (y === 16 && (x === -5 || x === -4 || x === 3 || x === 4)) return spec.cheek;
  if (y === 16 && x === -1) return spec.skinShade;
  if (y === 15 && (x === -1 || x === 0)) return P.a0;
  return y === 14 ? spec.skinShade : spec.skin;
}

/**
 * Gesicht als Platten (M12): Die Vorderseite des Kopfes (z = 3, Reihen 14–19)
 * wird herausgelöst – einmal wie gebaut, einmal lächelnd. Das Lächeln zeigt
 * sich, wenn jemand Mika begrüßt oder sie dabeisteht. Ohne Brille lachen auch
 * die Augen (Bögen statt Punkte); im Bart wird nur der Mund breiter.
 */
function faceSet(head, spec, { glasses = false, beard = false } = {}) {
  const bare = new VoxelModel();
  const normal = new VoxelModel();
  head.forEach((x, y, z, c) => (z === 3 && y >= 14 && y <= 19 && x >= -6 && x <= 5 ? normal : bare).set(x, y, z, c));
  const froh = new VoxelModel();
  normal.forEach((x, y, z, c) => froh.set(x, y, z, c));
  for (let x = -2; x <= 1; x++) froh.set(x, 15, 3, beard ? P.a0 : P.r1);
  if (!beard) froh.set(-3, 16, 3, P.r1).set(2, 16, 3, P.r1); // Mundwinkel oben
  if (!glasses) {
    for (const x of [-4, -3, 2, 3]) froh.set(x, 17, 3, spec.skin).set(x, 18, 3, spec.eyes);
    for (const x of [-5, -2, 1, 4]) froh.set(x, 17, 3, spec.eyes);
  }
  return { bare, normal, froh, eyesClose: !glasses };
}

/** Kopfform wie bei Mika: 12 × 8 × 10, Haare hinten und oben. */
function baseHead(spec, faceOptions = {}) {
  const m = new VoxelModel();
  m.box(-6, 14, -6, 5, 21, 3, (x, y, z) => {
    if (z === 3) {
      if (y >= 20) return spec.hair;
      return face(spec, x, y, faceOptions);
    }
    if (z <= -2 || y >= 20) return spec.hair;
    if ((x === -6 || x === 5) && y >= 17) return spec.hair;
    if (faceOptions.beard && (x === -6 || x === 5) && y <= 16) return spec.beard; // Bart an den Wangen
    return y === 14 ? spec.skinShade : spec.skin;
  });
  return m;
}

/** Beine: Schuhe, Strümpfe oder Hose, oben ggf. Rock. */
function baseLeg({ shoe, shoeLight, low, high, top = null }) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 3, 0, 4, (x, y, z) => (z === 4 ? shoeLight : shoe));
  m.box(0, 1, 0, 3, 2, 3, (x, y, z) => (y === 1 ? shoe : low));
  m.box(0, 3, 0, 3, 5, 3, (x, y, z) => (top && y >= 4 ? top : x === 0 || z === 0 ? high.dark : high.light));
  return m;
}

function baseArm({ sleeve, sleeveDark, cuff, skin, skinShade, forearm = null }) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 1, 1, 3, (x, y, z) => (y === 0 && z === 3 ? skinShade : skin));
  m.box(0, 2, 0, 1, 2, 3, forearm || cuff);
  m.box(0, 3, 0, 1, 7, 3, (x, y, z) => (forearm && y <= 3 ? forearm : x === 1 && z === 0 ? sleeveDark : sleeve));
  return m;
}

// --- Oma Hilde -------------------------------------------------------------------

export const HILDE = {
  skin: P.h4,
  skinShade: P.h3,
  cheek: P.a1,
  eyes: P.n1,
  hair: P.s8,
  hairDark: P.s6,
  cap: P.b3,
  capDark: P.b2,
  badge: P.f6,
  cardigan: P.a2,
  cardiganDark: P.d2,
  buttons: P.a4,
  bag: P.e5,
  bagDark: P.e3,
  skirt: P.r2,
  stockings: P.s5,
  shoes: P.e2,
};

function hildeHead(s) {
  const m = baseHead(s, { glasses: true });
  // Postmütze mit Schirm und Abzeichen
  m.box(-6, 22, -6, 5, 23, 3, (x, y) => (y === 22 ? s.capDark : s.cap));
  m.box(-5, 22, 4, 4, 22, 5, s.capDark); // Schirm
  m.set(-1, 23, 4, s.badge).set(0, 23, 4, s.badge);
  // Grauer Dutt hinten unter der Mütze
  m.box(-2, 17, -9, 1, 21, -7, (x, y) => (y === 17 || y === 21 ? s.hairDark : s.hair));
  return m;
}

function hildeTorso(s) {
  const m = new VoxelModel();
  m.box(-6, 6, -4, 5, 13, 3, (x, y, z) => {
    if (z === 3 && x === 0 && y % 2 === 0) return s.buttons; // Knopfleiste
    if (y === 13 || y === 6 || x === -6 || x === 5) return s.cardiganDark;
    return (x + y) % 4 === 0 ? s.cardiganDark : s.cardigan; // Strickmuster
  });
  // Posttasche am Riemen (rechte Schulter zur linken Hüfte)
  for (let i = 0; i <= 6; i++) m.set(4 - Math.round(i * 1.4), 13 - i, 4, s.bagDark);
  m.box(-8, 6, -1, -7, 9, 3, (x, y) => (y === 9 ? s.bagDark : s.bag));
  m.set(-8, 8, 3, s.badge);
  return m;
}

// --- Baumarkt-Bert ------------------------------------------------------------------

export const BERT = {
  skin: P.h2,
  skinShade: P.h1,
  cheek: P.r4,
  eyes: P.n1,
  brow: P.e2,
  hair: P.e3,
  beard: P.e3,
  beardLight: P.s6,
  cap: P.r3,
  capDark: P.r2,
  shirt: P.r3,
  shirtDark: P.r1,
  apron: P.f4,
  apronDark: P.f3,
  pencil: P.f6,
  pants: P.s3,
  pantsDark: P.s2,
  boots: P.e2,
};

function bertHead(s) {
  const m = baseHead(s, { beard: true });
  // Rote Kappe mit langem Schirm
  m.box(-6, 22, -6, 5, 24, 3, (x, y) => (y === 22 ? s.capDark : s.cap));
  m.box(-5, 22, 4, 4, 22, 6, s.capDark);
  // Bart ragt unten vor
  m.box(-4, 13, 3, 3, 14, 4, (x, y) => ((x + y) % 2 ? s.beard : s.beardLight));
  return m;
}

function bertTorso(s) {
  const m = new VoxelModel();
  // Karohemd, der Bauch wölbt sich vor
  m.box(-6, 6, -4, 5, 13, 3, (x, y, z) => ((Math.floor((x + 8) / 2) + Math.floor(y / 2)) % 2 ? s.shirtDark : s.shirt));
  // Bauch mit Schürze darüber (zwei Voxel vor dem Hemd), Tasche und Bleistift
  m.box(-5, 6, 4, 4, 12, 5, (x, y) => {
    if (y === 12) return s.apronDark;
    if (y === 9 && x >= -3 && x <= 2) return s.apronDark;
    return s.apron;
  });
  m.set(1, 10, 6, s.pencil).set(1, 11, 6, s.pencil).set(1, 12, 6, P.s7);
  // Träger über die Schultern
  m.box(-4, 12, 4, -4, 13, 4, s.apronDark).box(3, 12, 4, 3, 13, 4, s.apronDark);
  return m;
}

// --- Juna -------------------------------------------------------------------------

export const JUNA = {
  skin: P.h2,
  skinShade: P.h1,
  cheek: P.a0,
  eyes: P.n1,
  hair: P.n2,
  clip: P.a0,
  phones: P.s2,
  phonesLight: P.a6,
  coat: P.f6,
  coatDark: P.f5,
  coatShade: P.f4,
  antenna: P.s6,
  jeans: P.b3,
  jeansDark: P.b2,
  shoes: P.a4,
  shoesLight: P.r3,
};

function junaHead(s) {
  const m = baseHead(s);
  // Kurze, verwuschelte Haare mit Spange
  m.box(-6, 22, -5, 5, 22, 2, (x) => (x % 3 === 0 ? s.hair : null));
  m.set(4, 20, 4, s.clip).set(3, 21, 4, s.clip);
  // Dicke Kopfhörer mit Bügel
  m.box(-8, 15, -3, -7, 19, 1, (x, y) => (y === 17 && x === -8 ? s.phonesLight : s.phones));
  m.box(6, 15, -3, 7, 19, 1, (x, y) => (y === 17 && x === 7 ? s.phonesLight : s.phones));
  m.box(-7, 20, -2, -7, 22, -1, s.phones).box(6, 20, -2, 6, 22, -1, s.phones);
  m.box(-6, 23, -2, 5, 23, -1, s.phones);
  return m;
}

function junaTorso(s) {
  const m = new VoxelModel();
  m.box(-6, 6, -4, 5, 13, 3, (x, y, z) => {
    if (y === 6 || y === 13) return s.coatShade;
    if (z === 3 && (x === -1 || x === 0)) return y >= 11 ? s.coatShade : s.coatDark; // Reißverschluss
    if (z === 3 && y >= 7 && y <= 8 && x >= -4 && x <= 3) return s.coatDark; // Bauchtasche
    return s.coat;
  });
  // Kordeln der Kapuze
  m.set(-2, 12, 4, P.a4).set(-2, 11, 4, P.a4).set(1, 12, 4, P.a4).set(1, 11, 4, P.a4);
  // Kleiner Rucksack mit Antenne
  m.box(-3, 8, -6, 2, 12, -5, (x, y) => (y === 12 ? P.s3 : P.s4));
  for (let y = 13; y <= 19; y++) m.set(2, y, -6, s.antenna);
  m.set(2, 20, -6, P.f3);
  return m;
}

// --- Dr. Yusuf ----------------------------------------------------------------------

export const YUSUF = {
  skin: P.h1,
  skinShade: P.h0,
  cheek: P.r4,
  eyes: P.n0,
  hair: P.n1,
  beard: P.n1,
  beardLight: P.s5,
  coat: P.a4,
  coatDark: P.s8,
  shirt: P.a5,
  scope: P.s5,
  pens: P.b3,
  pants: P.n3,
  pantsDark: P.n2,
  shoes: P.e3,
};

function yusufHead(s) {
  const m = baseHead(s, { glasses: true, beard: true });
  // Graue Schläfen
  m.set(-6, 18, 1, P.s6).set(-6, 19, 1, P.s6).set(5, 18, 1, P.s6).set(5, 19, 1, P.s6);
  // Welliges Haar oben
  m.box(-6, 22, -6, 5, 22, 2, (x, y, z) => ((x + z) % 2 ? s.hair : null));
  return m;
}

function yusufTorso(s) {
  const m = new VoxelModel();
  m.box(-6, 6, -4, 5, 13, 3, (x, y, z) => {
    if (z === 3 && x >= -1 && x <= 0 && y >= 8) return s.shirt; // offener Kittel
    if (z === 3 && x === -2 && y >= 8) return s.coatDark;
    if (y === 6 || x === -6 || x === 5) return s.coatDark;
    return s.coat;
  });
  // Stethoskop um den Hals
  m.box(-3, 12, 4, 2, 12, 4, (x) => (x === -3 || x === 2 ? s.scope : null));
  m.set(-3, 11, 4, s.scope).set(-3, 10, 4, s.scope).set(-3, 9, 4, P.s8);
  m.set(2, 11, 4, s.scope);
  // Brusttasche mit Stiften
  m.set(3, 10, 4, s.pens).set(4, 10, 4, P.r3).set(3, 9, 4, s.coatDark).set(4, 9, 4, s.coatDark);
  return m;
}

// --- Balduin, der Händler (Meilenstein 8) -------------------------------------------

export const BALDUIN = {
  skin: P.h3,
  skinShade: P.h2,
  cheek: P.a1,
  goldTooth: P.f6,
  eyes: P.n1,
  brow: P.s7,
  hair: P.s7,
  beard: P.s7,
  beardLight: P.s8,
  nose: P.r4,
  cap: P.e3,
  capLight: P.e4,
  capDark: P.e2,
  scarf: P.r3,
  scarfDark: P.r2,
  coat: P.b1,
  coatDark: P.n3,
  buttons: P.f5,
  strap: P.e2,
  pack: P.e6,
  packDark: P.e5,
  roll: P.a5,
  rollLight: P.a6,
  pan: P.s3,
  pants: P.e3,
  pantsDark: P.e2,
  boots: P.e1,
};

function balduinHead(s) {
  const m = baseHead(s, { beard: true });
  // Kräftiger Bart: steht vorn ab und reicht bis auf die Brust. Darin ein
  // breites Grinsen mit einem Goldzahn (M10: Balduin im feinen Look-Schliff)
  m.box(-5, 12, 4, 4, 16, 4, (x, y) => {
    if (y === 16 && (x === -1 || x === 0)) return s.nose;
    if (y === 15 && (x === -2 || x === 1)) return P.a0; // Mundwinkel oben
    if (y === 15 && x === -1) return P.s9; // Zahn
    if (y === 15 && x === 0) return s.goldTooth; // Goldzahn
    if (y === 14 && (x === -1 || x === 0)) return P.a0; // Mund
    if (y === 16 && (x < -4 || x > 3)) return null;
    return (x + y) % 3 === 0 ? s.beardLight : s.beard;
  });
  m.box(-4, 11, 4, 3, 11, 4, (x) => (x % 2 ? s.beardLight : s.beard));
  m.set(-1, 17, 4, s.skin).set(0, 17, 4, s.nose); // runde Nase
  // Rote Wangen neben den Augen – der Wind auf dem See
  m.set(-5, 17, 3, s.cheek).set(4, 17, 3, s.cheek);
  // Buschige Brauen, außen hochgezogen
  for (const x of [-5, -4, -3, 2, 3, 4]) m.set(x, 18, 3, s.brow);
  m.set(-5, 19, 3, s.brow).set(4, 19, 3, s.brow);
  // Schiebermütze: flach, leicht nach vorn gezogen, mit Schirm
  m.box(-7, 21, -7, 6, 21, 4, (x, y, z) => ((x + z) % 4 === 0 ? s.capLight : s.cap));
  m.box(-6, 22, -6, 5, 22, 3, (x, y, z) => ((x + z) % 4 === 0 ? s.capLight : s.cap));
  m.box(-6, 20, 4, 5, 20, 5, s.capDark); // Schirm
  m.set(-1, 23, -1, s.capDark).set(0, 23, -1, s.capDark); // Knopf oben
  return m;
}

function balduinTorso(s) {
  const m = new VoxelModel();
  // Dunkler Seemannsmantel mit Messingknöpfen
  m.box(-6, 6, -4, 5, 13, 3, (x, y, z) => {
    if (z === 3 && (x === -1 || x === 0)) return y % 2 === 1 && x === 0 ? s.buttons : s.coatDark;
    if (y === 6 || x === -6 || x === 5) return s.coatDark;
    return s.coat;
  });
  // Roter Schal um den Hals, ein Ende hängt vorn herunter
  m.box(-6, 13, -5, 5, 14, 4, (x, y, z) => (z === 4 || z === -5 || x === -6 || x === 5 ? ((x + y + z) % 3 ? s.scarf : s.scarfDark) : null));
  m.box(-4, 8, 4, -3, 12, 4, (x, y) => (y === 8 ? s.scarfDark : s.scarf));
  // Tragegurte über die Schultern
  m.box(-5, 9, 4, -5, 12, 4, s.strap).box(4, 9, 4, 4, 12, 4, s.strap);
  // Riesiger Rucksack hinten, mit Deckenrolle obenauf und einer Pfanne an der Seite
  m.box(-6, 7, -10, 5, 19, -6, (x, y, z) => {
    if (y === 7 || x === -6 || x === 5 || z === -10) return s.packDark;
    if (y === 12 && z === -6) return s.strap; // Riemen
    return (x + y) % 5 === 0 ? s.packDark : s.pack;
  });
  m.box(-7, 20, -9, 6, 21, -7, (x) => (x % 3 === 0 ? s.rollLight : s.roll));
  m.box(6, 10, -9, 6, 13, -7, s.pan).box(6, 14, -8, 6, 16, -8, s.strap);
  return m;
}

function balduinLeg(s) {
  const m = new VoxelModel();
  // Feste Stiefel, dunkle Arbeitshose
  m.box(0, 0, 0, 3, 0, 4, (x, y, z) => (z === 4 ? P.e2 : s.boots));
  m.box(0, 1, 0, 3, 2, 3, (x, y) => (y === 2 ? s.pantsDark : s.boots));
  m.box(0, 3, 0, 3, 5, 3, (x, y, z) => (x === 0 || z === 0 ? s.pantsDark : s.pants));
  return m;
}

/**
 * Teile einer Überlebenden-Figur (für buildCharacter).
 * @returns {{head: VoxelModel, torso: VoxelModel, arm: VoxelModel, leg: VoxelModel}}
 */
export function survivorParts(id) {
  switch (id) {
    case 'hilde': {
      const s = HILDE;
      return {
        skin: s.skin,
        head: hildeHead(s),
        faces: faceSet(hildeHead(s), s, { glasses: true }),
        torso: hildeTorso(s),
        arm: baseArm({ sleeve: s.cardigan, sleeveDark: s.cardiganDark, cuff: s.cardiganDark, skin: s.skin, skinShade: s.skinShade }),
        leg: baseLeg({ shoe: s.shoes, shoeLight: P.e3, low: s.stockings, high: { light: s.skirt, dark: P.r1 }, top: s.skirt }),
      };
    }
    case 'bert': {
      const s = BERT;
      return {
        skin: s.skin,
        head: bertHead(s),
        faces: faceSet(bertHead(s), s, { beard: true }),
        torso: bertTorso(s),
        arm: baseArm({ sleeve: s.shirt, sleeveDark: s.shirtDark, cuff: s.shirtDark, skin: s.skin, skinShade: s.skinShade, forearm: s.skin }),
        leg: baseLeg({ shoe: s.boots, shoeLight: P.e3, low: s.pantsDark, high: { light: s.pants, dark: s.pantsDark } }),
      };
    }
    case 'juna': {
      const s = JUNA;
      return {
        skin: s.skin,
        head: junaHead(s),
        faces: faceSet(junaHead(s), s),
        torso: junaTorso(s),
        arm: baseArm({ sleeve: s.coat, sleeveDark: s.coatDark, cuff: s.coatShade, skin: s.skin, skinShade: s.skinShade }),
        leg: baseLeg({ shoe: s.shoes, shoeLight: s.shoesLight, low: s.jeansDark, high: { light: s.jeans, dark: s.jeansDark } }),
      };
    }
    case 'yusuf': {
      const s = YUSUF;
      return {
        skin: s.skin,
        head: yusufHead(s),
        faces: faceSet(yusufHead(s), s, { glasses: true, beard: true }),
        torso: yusufTorso(s),
        arm: baseArm({ sleeve: s.coat, sleeveDark: s.coatDark, cuff: s.coatDark, skin: s.skin, skinShade: s.skinShade }),
        leg: baseLeg({ shoe: s.shoes, shoeLight: P.e4, low: s.pantsDark, high: { light: s.pants, dark: s.pantsDark } }),
      };
    }
    case 'balduin': {
      const s = BALDUIN;
      return {
        skin: s.skin,
        head: balduinHead(s),
        torso: balduinTorso(s),
        arm: baseArm({ sleeve: s.coat, sleeveDark: s.coatDark, cuff: s.coatDark, skin: s.skin, skinShade: s.skinShade }),
        leg: balduinLeg(s),
      };
    }
    default:
      return null;
  }
}
