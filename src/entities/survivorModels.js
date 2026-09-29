// Die Überlebenden (Meilenstein 6) im feinen Maß (1/16 m; in der Welt seit
// M13g doppelt fein, survivorParts32 unten). Gleiche Maße und Gelenke wie Mika
// (characters.js): Beine y 0–5, Rumpf y 6–13, Kopf y 14–21, Arme 2 × 8 Voxel
// – so passen Rig und Animationen. Jede Figur hat ein
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
import { shade, sculpt, capsule, roundBox, roundTone, blob, subtract } from '../world/voxelKit.js';
import { HEAD, TORSO, onFace, onChest, sculptHeadBase, facePlate, facLids, sculptEars, sculptTorsoBase, sculptCollar, sculptArm, sculptLeg } from './figureKit.js';

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

// --- Doppelt fein (M13g, 1/32 m) -------------------------------------------------------
// Die Figuren in der Welt sind wie Mika doppelt fein: Beine y 0–11, Rumpf
// y 12–27, Kopf y 28–43, Arme 4 × 16 Voxel; Gesichtsplatte z = 7, Reihen
// 28–39 (Augen 3 × 3 mit Lichtpunkt). Gelenke = Werte der 1/16-Figur mal zwei.
// Die Porträts bleiben bei den 1/16-Modellen oben (survivorParts).

/** Bart im Maß 1/32: senkrechte Strähnen, jede dritte etwas heller, vereinzelt graue Haare. */
function beard32(spec, x, y) {
  if ((x * 5 + y * 3) % 11 === 0) return spec.beardLight;
  return (x + 12) % 3 === 0 ? shade(spec.beard, 1) : spec.beard;
}

/** Gesicht (1/32) an (x, y) für einen Ausdruck: Augen, Brauen, Brille, Bart, Wangen, Mund. */
function faceColor32(spec, x, y, expr, { glasses = false, beard = false } = {}) {
  const eyeL = x >= -8 && x <= -6;
  const eyeR = x >= 5 && x <= 7;
  const eye = eyeL || eyeR;
  const skin = spec.skin;
  const dark = spec.eyes;
  const line = beard ? P.a0 : P.r1;
  // Seitliche Strähnen
  if (y >= 36 && (x <= -11 || x >= 10)) return spec.hair;
  if (glasses) {
    const rimL = x >= -10 && x <= -4;
    const rimR = x >= 3 && x <= 9;
    if ((rimL || rimR) && (y === 33 || y === 37)) return P.s3; // Brillenrand oben und unten
    if ((x === -10 || x === -4 || x === 3 || x === 9) && y >= 33 && y <= 37) return P.s3;
    if (y === 36 && x >= -3 && x <= 2) return P.s4; // Steg
  }
  // Brauen
  if (y >= 38) return y === 38 && ((x >= -9 && x <= -6) || (x >= 5 && x <= 8)) ? spec.brow || shade(spec.skinShade, -1) : skin;
  if (y === 37) return skin;
  // Augen (Reihen 34–36)
  if (y >= 34) {
    if (expr === 'froh' && !glasses) {
      // lachende Bögen
      if (y === 36) return x === -7 || x === 6 ? dark : skin;
      if (y === 35) return x === -8 || x === -6 || x === 5 || x === 7 ? dark : skin;
      return skin;
    }
    if (!eye) return skin;
    if ((x === -8 || x === 5) && y === 36) return P.s9; // Lichtpunkt
    return y === 34 ? P.n2 : dark;
  }
  // Bart unter der Nase
  if (beard && y <= 32) {
    if (y >= 32 && x >= -1 && x <= 0) return spec.skinShade; // Nase über dem Bart
    if (y === 30 && x >= -2 && x <= 1) return line; // Mund im Bart
    if (y === 30 && expr === 'froh' && (x === -3 || x === 2)) return line;
    return beard32(spec, x, y);
  }
  if (y === 33) return x === 0 || x === -1 ? spec.skinShade : skin;
  if (y === 32) {
    if ((x >= -11 && x <= -9) || (x >= 8 && x <= 10)) return spec.cheek;
    return x === 0 || x === -1 ? spec.skinShade : skin;
  }
  if (y === 31) return expr === 'froh' && (x === -4 || x === 3) ? line : skin;
  if (y === 30) {
    if (expr === 'froh') return x >= -3 && x <= 2 ? line : skin;
    return x >= -1 && x <= 0 ? P.a0 : x === -2 || x === 1 ? spec.skinShade : skin;
  }
  if (y === 29) return expr === 'froh' && x >= -2 && x <= 1 ? P.a0 : skin;
  return spec.skinShade;
}

/** Gesichtsplatten normal und froh (M12) – N1: auf der Rundung des Kopfs. */
function faceSet32(spec, options = {}) {
  const plate = (expr) => facePlate((x, y) => faceColor32(spec, x, y, expr, options));
  return { normal: plate('normal'), froh: plate('froh'), eyesClose: !options.glasses };
}

/**
 * Kopf (N1): runde Form aus dem Figuren-Baukasten. Haar oben und hinten mit
 * Strähnen, Pony vorn, über den Ohren; mit `beard` Bart an den Wangen. Ohne
 * `plate` wird das Gesicht gleich mitgemalt (Balduin grinst immer).
 */
function baseHead32(spec, { beard = false, plate = true } = {}) {
  const hairLight = shade(spec.hair, 1);
  const m = sculptHeadBase(
    (x, y, z, n) => {
      if (n.z > 0.55 && y >= 40) {
        if (y === 40 && (x + 12) % 5 === 2) return spec.skin; // Pony mit Strähnen
        return (x + y) % 5 === 0 ? hairLight : spec.hair;
      }
      if (z <= -4 || y >= 40) return (x * 3 + y) % 7 === 0 ? hairLight : n.y < -0.4 ? shade(spec.hair, -1) : spec.hair;
      if (Math.abs(n.x) > 0.6 && y >= 34) return spec.hair;
      if (beard && Math.abs(n.x) > 0.6 && y <= 33) return beard32(spec, z, y); // Bart an den Wangen
      if (y === 28) return spec.skinShade;
      return roundTone(spec.skin, n, { light: 0 });
    },
    { face: plate ? null : (x, y) => faceColor32(spec, x, y, 'normal', { beard }) }
  );
  return sculptEars(m, spec.skin, spec.skinShade);
}

/** Lider zum Blinzeln (N1: auf der Rundung). */
const lids32 = (spec) => facLids(spec.skin, spec.eyes);

/** Beine (N1): Schuhe mit runder Kappe, Strümpfe oder Hose, oben ggf. Rock. */
const baseLeg32 = (o) => sculptLeg(o);

/** Arme (N1): Ärmel, Bündchen, Hand mit Daumen; `forearm` für hochgekrempelte Ärmel. */
const baseArm32 = (o) => sculptArm(o);

/** Kappe auf dem runden Kopf: Deckel (roundBox), Band unten, Schirm vorn auf der Rundung. */
function capOnHead(m, { color, dark, light, height = 5, visor = 3, visorWidth = 10 }) {
  sculpt(m, roundBox(-0.5, 44 + height / 2, -2.5, 12.2, height / 2 + 0.6, 10.2, 3.2), -13, 43, -13, 12, 44 + height, 8, (x, y, z, n) => {
    if (y <= 45) return dark;
    if (n.y > 0.7) return light;
    return color;
  });
  // Schirm: flach nach vorn, vorn etwas dunkler
  for (let x = -visorWidth; x < visorWidth; x++) {
    const z0 = (HEAD.front(Math.max(-11, Math.min(10, x)), 42) ?? 6) + 1;
    for (let k = 0; k < visor; k++) m.box(x, 44, z0 + k, x, 45, z0 + k, k === visor - 1 ? shade(dark, -1) : dark);
  }
  return m;
}

function hildeHead32(s) {
  const m = baseHead32(s);
  // Postmütze mit Band, Schirm und Abzeichen
  capOnHead(m, { color: s.cap, dark: s.capDark, light: shade(s.cap, 1), height: 6, visor: 4 });
  const bz = (HEAD.front(0, 43) ?? 6) + 1;
  m.box(-2, 46, bz, 1, 48, bz, (x, y) => (y === 48 ? P.f7 : s.badge)).set(-1, 47, bz + 1, P.f4).set(0, 47, bz + 1, P.f4); // Abzeichen mit Posthorn
  // Grauer Dutt hinten unter der Mütze, mit Haarnadel
  m.ellipsoid(-0.5, 38, -15, 5, 5, 3.2, (x, y) => ((x + y) % 3 === 0 ? s.hairDark : s.hair));
  m.box(2, 40, -18, 5, 40, -18, P.s4);
  return m;
}

function hildeTorso32(s) {
  const m = sculptTorsoBase((x, y, z, n, front) => {
    if (front && (x === -1 || x === 0)) return y % 4 === 1 && x === 0 ? s.buttons : s.cardiganDark; // Knopfleiste
    if (y <= 13 || y >= 26) return s.cardiganDark;
    const cable = (x + 12) % 6;
    if (front && (cable === 2 || cable === 3)) return (y + (cable === 2 ? 0 : 2)) % 4 < 2 ? s.cardiganDark : s.cardigan; // Zopfmuster
    return roundTone(s.cardigan, n, { light: 0 });
  });
  sculptCollar(m, s.cardiganDark, { r: 1.6 });
  // Posttasche am Riemen (rechte Schulter zur linken Hüfte)
  for (let i = 0; i <= 13; i++) {
    const x = 8 - Math.round(i * 1.4);
    onChest(m, x, 27 - i, 1, s.bagDark).set(x + 1, 27 - i, (TORSO.front(x + 1, 27 - i) ?? 7) + 1, s.bagDark);
  }
  sculpt(m, roundBox(-14.5, 15.5, 2.5, 2.2, 4, 5, 1.2), -17, 11, -3, -12, 20, 8, (x, y, z, n) => (y >= 18 ? s.bagDark : n.z > 0.6 && y === 17 ? shade(s.bag, 1) : s.bag));
  m.box(-17, 15, 7, -17, 16, 7, s.badge);
  return m;
}

function bertHead32(s) {
  const m = baseHead32(s, { beard: true });
  // Rote Kappe mit Nähten, Knopf und langem Schirm
  capOnHead(m, { color: s.cap, dark: s.capDark, light: shade(s.cap, 1), height: 5, visor: 6 });
  m.box(-2, 50, -4, 1, 50, -1, s.capDark);
  // Bart ragt unten vor und hängt unter das Kinn, mit Strähnen
  for (let x = -8; x <= 7; x++) {
    for (let y = 24; y <= 30; y++) {
      const z0 = HEAD.front(x, Math.max(28, y));
      if (z0 === undefined) continue;
      const depth = y <= 26 ? 2 : 1;
      for (let k = 1; k <= depth; k++) {
        if (y === 24 && (x + k) % 2) continue;
        m.set(x, y, z0 + k - (y < 28 ? 1 : 0), beard32(s, x, y));
      }
    }
  }
  return m;
}

function bertTorso32(s) {
  const m = sculptTorsoBase((x, y, z, n) => {
    // Karohemd: breite Karos mit feinen Linien
    const cx = Math.floor((x + 16) / 4) % 2;
    const cy = Math.floor(y / 4) % 2;
    if ((x + 16) % 4 === 0 || y % 4 === 0) return s.shirtDark;
    return cx ^ cy ? s.shirt : shade(s.shirt, 1);
  });
  // Schürze vor dem Bauch, auf der Rundung, mit Tasche, Bleistift und Trägern
  for (let x = -10; x <= 9; x++) {
    for (let y = 12; y <= 25; y++) {
      const edge = x === -10 || x === 9;
      const pocket = y >= 16 && y <= 19 && x >= -6 && x <= 5;
      const c = y === 25 ? s.apronDark : pocket ? (y === 19 || x === -6 || x === 5 ? s.apronDark : shade(s.apron, 1)) : edge ? s.apronDark : s.apron;
      onChest(m, x, y, 1, c);
    }
  }
  for (let y = 19; y <= 24; y++) onChest(m, 2, y, 2, s.pencil);
  onChest(m, 2, 25, 2, P.s7);
  for (let y = 24; y <= 27; y++) for (const x of [-8, -7, 6, 7]) onChest(m, x, y, 1, s.apronDark);
  return m;
}

function junaHead32(s) {
  const m = baseHead32(s);
  // Kurze, verwuschelte Haare obenauf, mit Spange
  sculpt(m, roundBox(-0.5, 42.5, -3, 12.4, 3.2, 10.4, 3.4), -13, 40, -14, 12, 46, 8, (x, y, z, n) => {
    if (n.y < 0.3 && y <= 42) return null; // nur die Wuschel oben
    if (y >= 45 && (x * 2 + z) % 4 !== 0) return null;
    return (x + z * 2) % 5 < 2 ? shade(s.hair, 1) : s.hair;
  });
  onFace(m, 8, 42, 1, P.a1).set(9, 42, (HEAD.front(9, 42) ?? 5) + 1, s.clip);
  // Dicke Kopfhörer: runde Muscheln mit Lichtring, Bügel über den Kopf
  for (const [ax, bx] of [[-16.5, -13.2], [15.5, 12.2]]) {
    sculpt(m, capsule(ax, 34.5, -1.5, bx, 34.5, -1.5, 4, 4), -18, 29, -7, 17, 40, 4, (x, y, z, n) => {
      const outer = Math.abs(n.x) > 0.7;
      const d = Math.hypot(y + 0.5 - 34.5, z + 0.5 + 1.5);
      if (outer && d < 3.4 && d > 2.2) return s.phonesLight;
      return s.phones;
    });
  }
  const band = (x, y, z) => Math.hypot(Math.hypot(x + 0.5, (y - 34.5) * 1.05) - 15, (z + 3) * 1.4) - 1.3;
  sculpt(m, band, -17, 38, -6, 16, 51, 0, (x, y) => (y >= 48 ? shade(s.phones, 1) : s.phones));
  return m;
}

function junaTorso32(s) {
  const m = sculptTorsoBase((x, y, z, n, front) => {
    if (y <= 13 || y >= 26) return s.coatShade;
    if (front && (x === -1 || x === 0)) return y >= 22 ? s.coatShade : x === 0 ? P.s6 : s.coatDark; // Reißverschluss
    if (front && y >= 14 && y <= 17 && x >= -8 && x <= 7) return y === 17 || x === -8 || x === 7 ? s.coatShade : s.coatDark; // Bauchtasche
    return roundTone(s.coat, n, { light: 0 });
  });
  sculptCollar(m, s.coatShade, { r: 2.1 });
  // Kordeln der Kapuze
  for (let y = 21; y <= 25; y++) {
    onChest(m, -4, y, 1, P.a4);
    onChest(m, 3, y, 1, P.a4);
  }
  // Kleiner Rucksack mit Antenne
  sculpt(m, roundBox(-0.5, 20.5, -10.5, 6, 5, 2, 1.5), -7, 15, -13, 6, 26, -8, (x, y) => (y >= 24 ? P.s3 : P.s4));
  for (let y = 26; y <= 40; y++) m.set(4, y, -12, y % 5 === 0 ? P.s4 : s.antenna);
  m.box(3, 41, -13, 5, 42, -11, P.f3);
  return m;
}

function yusufHead32(s) {
  const m = baseHead32(s, { beard: true });
  // Graue Schläfen, welliges Haar oben
  for (const x of [-12, 11]) for (let y = 36; y <= 39; y++) for (let z = 1; z <= 3; z++) if (m.has(x, y, z)) m.set(x, y, z, P.s6);
  sculpt(m, roundBox(-0.5, 42.5, -3, 12.3, 2.6, 10.3, 3.2), -13, 41, -14, 12, 45, 8, (x, y, z, n) => {
    if (n.y < 0.4 && y <= 42) return null;
    if ((x + z + (y === 45 ? 1 : 0)) % 3 === 0) return null;
    return (x + z) % 3 === 1 ? shade(s.hair, 1) : s.hair;
  });
  return m;
}

function yusufTorso32(s) {
  const m = sculptTorsoBase((x, y, z, n, front) => {
    if (front && x >= -3 && x <= 2 && y >= 16) return x === -3 || x === 2 ? s.coatDark : s.shirt; // offener Kittel
    if (front && (x === -4 || x === 3) && y >= 16) return s.coatDark;
    if (y <= 13) return s.coatDark;
    return n.y < -0.4 || n.z < -0.6 ? s.coatDark : s.coat;
  });
  sculptCollar(m, s.coat, { r: 1.7 });
  // Stethoskop um den Hals, das Bruststück hängt links
  for (let x = -6; x <= 5; x++) if (x === -6 || x === 5) onChest(m, x, 24, 1, s.scope);
  for (let y = 17; y <= 23; y++) onChest(m, -6, y, 1, s.scope);
  for (const x of [-7, -6, -5]) for (const y of [15, 16]) onChest(m, x, y, 1, P.s8);
  for (let y = 21; y <= 23; y++) onChest(m, 5, y, 1, s.scope);
  // Brusttasche mit Stiften
  for (let x = 5; x <= 9; x++) for (let y = 17; y <= 20; y++) onChest(m, x, y, 1, y === 20 ? s.coatDark : s.coat);
  onChest(m, 6, 21, 1, s.pens).set(6, 22, (TORSO.front(6, 22) ?? 7) + 1, s.pens);
  onChest(m, 8, 21, 1, P.r3).set(8, 22, (TORSO.front(8, 22) ?? 7) + 1, P.r3);
  return m;
}

function balduinHead32(s) {
  const m = baseHead32(s, { beard: true, plate: false });
  // Kräftiger Bart: steht vorn ab und reicht bis auf die Brust. Darin ein
  // breites Grinsen mit einem Goldzahn
  for (let x = -10; x <= 9; x++) {
    for (let y = 22; y <= 33; y++) {
      if (y >= 32 && (x < -8 || x > 7)) continue;
      const z0 = HEAD.front(x, Math.max(28, y));
      if (z0 === undefined) continue;
      for (let k = 1; k <= 2; k++) {
        if (y <= 23 && (x + k) % 2) continue; // ausgefranste Bartspitzen
        let c = beard32(s, x, y);
        if (y >= 32 && x >= -2 && x <= 1) c = s.nose;
        if (y === 30 && (x === -5 || x === 4)) c = P.a0; // Mundwinkel oben
        if (y === 29 && x >= -4 && x <= 3) c = x === -1 || x === 0 ? s.goldTooth : x === -2 || x === 1 ? P.s9 : P.a0; // Zähne, einer aus Gold
        if (y === 28 && x >= -3 && x <= 2) c = P.a0; // Mund
        m.set(x, y, z0 + k - (y < 28 ? 1 : 0), c);
      }
    }
  }
  for (const x of [-2, -1, 0, 1]) for (const y of [34, 35]) onFace(m, x, y, 1, y === 35 && x === -2 ? P.s9 : x < 0 ? s.skin : s.nose); // runde Nase
  for (const [x0, x1] of [[-11, -9], [8, 10]]) for (let x = x0; x <= x1; x++) for (const y of [33, 34]) onFace(m, x, y, 0, s.cheek); // rote Wangen
  // Buschige Brauen, außen hochgezogen
  for (const [x0, x1] of [[-10, -5], [4, 9]]) for (let x = x0; x <= x1; x++) for (const y of [37, 38]) onFace(m, x, y, 1, s.brow);
  for (const x of [-11, -10, 9, 10]) onFace(m, x, 39, 1, s.brow);
  // Schiebermütze: flach, leicht nach vorn gezogen, Fischgrätmuster, Schirm und Knopf
  sculpt(m, roundBox(-0.5, 43.5, -2, 13.4, 2.3, 11.5, 2.4), -15, 41, -15, 14, 46, 10, (x, y, z) => ((x + z) % 4 === 0 || (x - z) % 4 === 0 ? s.capLight : s.cap));
  for (let x = -12; x <= 11; x++) {
    const z0 = (HEAD.front(Math.max(-11, Math.min(10, x)), 41) ?? 6) + 1;
    for (let k = 0; k < 3; k++) m.box(x, 40, z0 + k, x, 41, z0 + k, k === 2 ? shade(s.capDark, -1) : s.capDark); // Schirm
  }
  m.box(-2, 46, -3, 1, 47, 0, s.capDark); // Knopf oben
  return m;
}

function balduinTorso32(s) {
  // Dunkler Seemannsmantel mit zwei Reihen Messingknöpfen
  const m = sculptTorsoBase((x, y, z, n, front) => {
    if (front && (x === -5 || x === 4) && y % 5 === 2) return s.buttons;
    if (front && (x === -1 || x === 0)) return s.coatDark;
    if (y <= 13) return s.coatDark;
    return n.y < -0.4 || n.z < -0.6 || Math.abs(n.x) > 0.8 ? s.coatDark : s.coat;
  });
  // Roter Schal um den Hals, ein Ende hängt vorn herunter, mit Fransen
  sculptCollar(m, (x, y, z) => ((x + y + z) % 3 ? s.scarf : s.scarfDark), { r: 2.4, ring: 8 });
  for (let x = -8; x <= -5; x++) {
    for (let y = 15; y <= 25; y++) {
      if (y <= 16 && !(x & 1)) continue;
      onChest(m, x, y, 1, y <= 16 ? s.scarfDark : y % 4 === 0 ? s.scarfDark : s.scarf);
    }
  }
  // Tragegurte über die Schultern
  for (let y = 17; y <= 25; y++) {
    onChest(m, -10, y, 1, s.strap);
    onChest(m, 9, y, 1, s.strap);
  }
  // Riesiger Rucksack hinten, mit Deckenrolle obenauf und einer Pfanne an der Seite
  sculpt(m, roundBox(-0.5, 26.5, -16, 12, 12.5, 4.5, 2.5), -13, 14, -21, 12, 39, -11, (x, y, z, n) => {
    if (y <= 15) return s.packDark;
    const back = n.z < -0.6;
    if ((y === 24 || y === 25) && n.z > 0.5) return s.strap; // Riemen
    if (back && y >= 20 && y <= 30 && x >= -6 && x <= 5) return y === 30 || x === -6 || x === 5 ? s.strap : s.pack; // Deckel
    return (x + y) % 9 === 0 ? s.packDark : roundTone(s.pack, n, { light: 0 });
  });
  for (let x = -14; x <= 13; x++) {
    for (let y = 40; y <= 43; y++) {
      for (let z = -18; z <= -14; z++) {
        if (Math.hypot(y - 41.5, z + 15.5) > 2.6) continue;
        m.set(x, y, z, x === -14 || x === 13 ? (Math.floor(Math.hypot(y - 41.5, z + 15.5) * 1.5) % 2 ? s.roll : s.rollLight) : x % 6 === 0 ? s.strap : x % 3 === 0 ? s.rollLight : s.roll);
      }
    }
  }
  m.ellipsoid(12.5, 24, -16, 1.2, 4, 3.6, s.pan).box(12, 29, -16, 13, 33, -16, s.strap);
  return m;
}

/** Balduins Beine (N1): feste Stiefel mit Schnürung, dunkle Arbeitshose mit Flicken. */
const balduinLeg32 = (s) => sculptLeg({ shoe: s.boots, shoeLight: P.e2, sole: P.e1, low: s.pantsDark, high: { light: s.pants, dark: s.pantsDark }, patch: P.e4, laces: P.e5 });

/**
 * Teile einer Überlebenden-Figur im Maß 1/32 (für npcs.js).
 * @returns {{skin: number, head: VoxelModel, faces: object|null, lids: VoxelModel, torso: VoxelModel, arm: VoxelModel, leg: VoxelModel}}
 */
export function survivorParts32(id) {
  switch (id) {
    case 'hilde': {
      const s = HILDE;
      return {
        skin: s.skin,
        head: hildeHead32(s),
        faces: faceSet32(s, { glasses: true }),
        lids: lids32(s),
        torso: hildeTorso32(s),
        arm: baseArm32({ sleeve: s.cardigan, sleeveDark: s.cardiganDark, cuff: s.cardiganDark, skin: s.skin, skinShade: s.skinShade }),
        leg: baseLeg32({ shoe: s.shoes, shoeLight: P.e3, low: s.stockings, high: { light: s.skirt, dark: P.r1 }, top: s.skirt }),
      };
    }
    case 'bert': {
      const s = BERT;
      return {
        skin: s.skin,
        head: bertHead32(s),
        faces: faceSet32(s, { beard: true }),
        lids: lids32(s),
        torso: bertTorso32(s),
        arm: baseArm32({ sleeve: s.shirt, sleeveDark: s.shirtDark, cuff: s.shirtDark, skin: s.skin, skinShade: s.skinShade, forearm: s.skin }),
        leg: baseLeg32({ shoe: s.boots, shoeLight: P.e3, low: s.pantsDark, high: { light: s.pants, dark: s.pantsDark } }),
      };
    }
    case 'juna': {
      const s = JUNA;
      return {
        skin: s.skin,
        head: junaHead32(s),
        faces: faceSet32(s),
        lids: lids32(s),
        torso: junaTorso32(s),
        arm: baseArm32({ sleeve: s.coat, sleeveDark: s.coatDark, cuff: s.coatShade, skin: s.skin, skinShade: s.skinShade }),
        leg: baseLeg32({ shoe: s.shoes, shoeLight: s.shoesLight, low: s.jeansDark, high: { light: s.jeans, dark: s.jeansDark } }),
      };
    }
    case 'yusuf': {
      const s = YUSUF;
      return {
        skin: s.skin,
        head: yusufHead32(s),
        faces: faceSet32(s, { glasses: true, beard: true }),
        lids: lids32(s),
        torso: yusufTorso32(s),
        arm: baseArm32({ sleeve: s.coat, sleeveDark: s.coatDark, cuff: s.coatDark, skin: s.skin, skinShade: s.skinShade }),
        leg: baseLeg32({ shoe: s.shoes, shoeLight: P.e4, low: s.pantsDark, high: { light: s.pants, dark: s.pantsDark } }),
      };
    }
    case 'balduin': {
      const s = BALDUIN;
      return {
        skin: s.skin,
        head: balduinHead32(s),
        faces: null,
        lids: lids32(s),
        torso: balduinTorso32(s),
        arm: baseArm32({ sleeve: s.coat, sleeveDark: s.coatDark, cuff: s.coatDark, skin: s.skin, skinShade: s.skinShade }),
        leg: balduinLeg32(s),
      };
    }
    default:
      return wandererParts32(id); // M27: die Wanderer
  }
}

// --- Die Wanderer (M27) im Maß 1/32 ----------------------------------------------------
// Aus demselben Baukasten wie die Stammbesetzung; jede Figur hat ein Merkmal,
// das man schon von Weitem liest (OFFENE-FRAGEN 162):
//   Hannes (Zimmerer)          – breiter schwarzer Hut, Weste mit Perlmuttknöpfen,
//                                rotes Halstuch, kurzer Vollbart
//   Clara (Mechanikerin)       – blauer Overall, Schweißbrille auf der Stirn,
//                                roter Pferdeschwanz, Schraubenschlüssel
//   Lotte (Laternenmacherin)   – rosa Mantel, langer bunter Strickschal, blonde
//                                Zöpfe, kleine Laterne am Gürtel
//   Greta (Jägerin)            – grüne Lodenjacke, Filzhut mit Feder, graue Haare,
//                                Fernglas vor der Brust, Kniebundhose

export const HANNES = {
  skin: P.h3,
  skinShade: P.h2,
  cheek: P.a0,
  eyes: P.n1,
  brow: P.e1,
  hair: P.e2,
  beard: P.e2,
  beardLight: P.e4,
  hat: P.n1,
  hatDark: P.n0,
  hatLight: P.n2,
  band: P.s3,
  shirt: P.s9,
  shirtDark: P.s7,
  vest: P.n2,
  vestDark: P.n1,
  buttons: P.s8,
  scarf: P.r3,
  scarfDark: P.r1,
  pants: P.n2,
  pantsDark: P.n1,
  boots: P.e1,
};

export const CLARA = {
  skin: P.h3,
  skinShade: P.h2,
  cheek: P.a1,
  eyes: P.n1,
  brow: P.r1,
  hair: P.r3,
  hairDark: P.r2,
  overall: P.b3,
  overallDark: P.b2,
  goggles: P.s3,
  lens: P.a6,
  strap: P.e2,
  wrench: P.s6,
  rag: P.r4,
  patch: P.f5,
  boots: P.e2,
};

export const LOTTE = {
  skin: P.h4,
  skinShade: P.h3,
  cheek: P.a1,
  eyes: P.n1,
  brow: P.e6,
  hair: P.e8,
  hairDark: P.e7,
  ribbon: P.a6,
  coat: P.a0,
  coatDark: P.d4,
  scarf: [P.f6, P.a6, P.f4, P.a3],
  lanternFrame: P.s3,
  lanternGlass: P.f7,
  tights: P.d2,
  shoes: P.e2,
};

export const GRETA = {
  skin: P.h3,
  skinShade: P.h2,
  cheek: P.r4,
  eyes: P.n1,
  brow: P.s5,
  hair: P.s7,
  hairDark: P.s5,
  hat: P.t2,
  hatDark: P.t1,
  hatLight: P.t3,
  feather: P.s9,
  featherTip: P.n2,
  jacket: P.t3,
  jacketDark: P.t2,
  buttons: P.e3,
  glass: P.s2,
  glassLight: P.s5,
  strap: P.e2,
  breeches: P.e4,
  breechesDark: P.e3,
  socks: P.s6,
  boots: P.e2,
};

/** Breitkrempiger Hut (Zimmermann): Krempe als flache Scheibe, darauf die Krone mit Band. */
function wideHat32(m, { color, dark, light, band, brim = 16, crown = 7 }) {
  const disc = (x, y, z) => Math.max(Math.hypot(x + 0.5, (z + 2.5) * 1.08) - brim, Math.abs(y - 44.5) - 0.9);
  sculpt(m, disc, -brim - 1, 43, -brim - 4, brim, 46, brim, (x, y, z) => {
    const r = Math.hypot(x + 0.5, (z + 2.5) * 1.08);
    if (r > brim - 1.2) return y >= 45 ? color : dark; // Rand der Krempe
    return y >= 45 ? light : dark;
  });
  sculpt(m, roundBox(-0.5, 46 + crown / 2, -2.5, 9.6, crown / 2, 8.4, 2.8), -11, 45, -12, 10, 47 + crown, 7, (x, y, z, n) => {
    if (y <= 47) return band;
    if (n.y > 0.7) return (x + z) % 4 === 0 ? color : light;
    return n.x > 0.6 || n.z < -0.6 ? dark : color;
  });
  return m;
}

function hannesHead32(s) {
  const m = baseHead32(s, { beard: true });
  // Kurzer, dichter Vollbart um das Kinn
  for (let x = -9; x <= 8; x++) {
    for (let y = 26; y <= 29; y++) {
      const z0 = HEAD.front(x, Math.max(28, y));
      if (z0 === undefined) continue;
      if (y === 26 && (x < -6 || x > 5)) continue;
      m.set(x, y, z0 + (y < 28 ? 0 : 1), beard32(s, x, y));
    }
  }
  return wideHat32(m, { color: s.hat, dark: s.hatDark, light: s.hatLight, band: s.band });
}

function hannesTorso32(s) {
  const m = sculptTorsoBase((x, y, z, n, front) => {
    // Weiße Staude in der Mitte, darüber die schwarze Cordweste
    if (front && x >= -3 && x <= 2 && y >= 15) return x === -3 || x === 2 ? s.shirtDark : s.shirt;
    if (y <= 13) return s.vestDark;
    if (Math.abs(n.x) > 0.75 && y >= 22) return s.shirt; // Ärmelansatz
    const rib = (x + 13) % 2 === 0 && n.z > 0.2;
    return rib ? s.vestDark : roundTone(s.vest, n, { light: 0 });
  });
  // Zwei Reihen Perlmuttknöpfe
  for (const y of [15, 18, 21, 24]) {
    onChest(m, -5, y, 1, s.buttons);
    onChest(m, 4, y, 1, s.buttons);
  }
  // Rotes Halstuch mit Knoten und Zipfeln
  sculptCollar(m, s.scarf, { r: 1.5 });
  for (const [x, y] of [[-1, 25], [0, 25], [-1, 24], [0, 24], [-2, 23], [1, 23], [-2, 22], [1, 22]]) onChest(m, x, y, 1, y >= 24 ? s.scarf : s.scarfDark);
  return m;
}

function claraHead32(s) {
  const m = baseHead32(s);
  // Hoher Pferdeschwanz: Gummi oben am Hinterkopf, dann in einem Bogen nach hinten unten
  sculpt(m, capsule(-0.5, 44, -9, -0.5, 36, -17, 3.2, 2.2), -5, 33, -21, 4, 48, -6, (x, y, z, n) => ((x + y) % 4 === 0 ? s.hairDark : n.y > 0.5 ? shade(s.hair, 1) : s.hair));
  sculpt(m, capsule(-0.5, 44.5, -8.5, -0.5, 44.5, -9.5, 2.4), -4, 42, -12, 3, 47, -6, P.f5); // Haargummi
  // Schweißbrille auf der Stirn: Band ringsum, vorn zwei runde Gläser
  for (let x = -12; x <= 11; x++) {
    for (const y of [41, 42]) {
      const z = HEAD.front(x, y);
      if (z === undefined) continue;
      m.set(x, y, z + 1, s.strap);
    }
  }
  for (const cx of [-6, 5]) {
    for (let x = cx - 3; x <= cx + 3; x++) {
      for (let y = 40; y <= 44; y++) {
        const d = Math.hypot(x - cx, (y - 42) * 1.2);
        if (d > 3.3) continue;
        const z = (HEAD.front(Math.max(-12, Math.min(11, x)), Math.min(y, 43)) ?? 5) + 2;
        m.set(x, y, z, d > 2.2 ? s.goggles : d < 1 ? P.s9 : s.lens);
      }
    }
  }
  return m;
}

function claraTorso32(s) {
  const m = sculptTorsoBase((x, y, z, n, front) => {
    if (front && (x === -1 || x === 0) && y >= 14) return y % 3 === 0 ? P.s6 : s.overallDark; // Reißverschluss
    if (y === 13 || y === 12) return s.overallDark; // Gürtel
    return roundTone(s.overall, n, { light: 0 });
  });
  sculptCollar(m, s.overallDark, { r: 1.6 });
  // Brusttasche mit Schraubenschlüssel, Namensschild, Lappen an der Hüfte
  for (let x = 3; x <= 8; x++) for (let y = 18; y <= 22; y++) onChest(m, x, y, 1, y === 22 || x === 3 || x === 8 ? s.overallDark : s.overall);
  for (let y = 21; y <= 26; y++) onChest(m, 5, y, 2, y >= 25 ? P.s7 : s.wrench);
  onChest(m, 4, 26, 2, s.wrench).set(6, 26, (TORSO.front(6, 26) ?? 7) + 2, s.wrench);
  for (let x = -8; x <= -4; x++) for (let y = 20; y <= 21; y++) onChest(m, x, y, 1, s.patch);
  for (let y = 9; y <= 14; y++) m.set(-12, y, 3 - (y % 2), s.rag).set(-12, y, 4 - (y % 2), shade(s.rag, -1));
  return m;
}

function lotteHead32(s) {
  const m = baseHead32(s);
  // Zwei Zöpfe hinter den Ohren, geflochten, mit Schleifen an den Enden
  for (const side of [-1, 1]) {
    const x = side < 0 ? -12.5 : 11.5;
    sculpt(m, capsule(x, 36, -3, x + side * 0.8, 24, -2, 2.1, 1.7), x - 4, 22, -7, x + 4, 38, 2, (px, py) => ((py + (side > 0 ? 1 : 0)) % 3 === 0 ? s.hairDark : s.hair));
    sculpt(m, blob(x + side * 0.8, 23.5, -1.5, 2.2, 1.4, 1.6), x - 4, 21, -5, x + 4, 25, 2, s.ribbon);
  }
  // Mittelscheitel oben
  for (let z = -8; z <= 5; z++) if (m.has(-1, 44, z)) m.set(-1, 44, z, s.hairDark);
  return m;
}

function lotteTorso32(s) {
  const m = sculptTorsoBase((x, y, z, n, front) => {
    if (front && (x === -2 || x === 1) && y % 4 === 2 && y >= 14 && y <= 22) return P.s8; // Knebelknöpfe
    if (y <= 13) return s.coatDark;
    return roundTone(s.coat, n, { light: 0 });
  });
  // Langer Strickschal: dick um den Hals, ein Ende hängt vorn bis zur Hüfte
  const stripe = (i) => s.scarf[((i % s.scarf.length) + s.scarf.length) % s.scarf.length];
  sculptCollar(m, (x, y) => stripe(Math.floor((x + 13) / 3)), { r: 2.4, ring: 8 });
  for (let y = 12; y <= 25; y++) {
    for (let x = 3; x <= 6; x++) onChest(m, x, y, 2, y === 12 ? P.s8 : stripe(Math.floor(y / 3)));
    if (y === 12) for (const x of [3, 5]) onChest(m, x, 11, 2, P.s8); // Fransen
  }
  // Kleine Laterne am Gürtel (links)
  sculpt(m, roundBox(-13.5, 12, 3, 2, 2.6, 2, 0.6), -16, 9, 0, -11, 15, 6, (x, y, z, n) => (y >= 14 || y <= 9 || Math.abs(n.x) > 0.7 ? s.lanternFrame : s.lanternGlass));
  m.set(-14, 16, 3, s.lanternFrame).set(-13, 16, 3, s.lanternFrame);
  return m;
}

function gretaHead32(s) {
  const m = baseHead32(s);
  // Kurzes graues Haar mit Knoten im Nacken
  m.ellipsoid(-0.5, 33, -14, 3.5, 3, 2.4, (x, y) => ((x + y) % 3 === 0 ? s.hairDark : s.hair));
  // Filzhut mit schmaler Krempe, eingedellter Krone, Band und Feder
  const disc = (x, y, z) => Math.max(Math.hypot(x + 0.5, (z + 2.5) * 1.05) - 13.5, Math.abs(y - 44.5) - 0.8);
  sculpt(m, disc, -15, 43, -18, 14, 46, 13, (x, y) => (y >= 45 ? s.hatLight : s.hatDark));
  sculpt(m, subtract(roundBox(-0.5, 48.5, -2.5, 9, 4.5, 8, 3), roundBox(-0.5, 53.2, -2.5, 2, 1.2, 6, 1)), -11, 45, -12, 10, 53, 7, (x, y, z, n) => {
    if (y <= 46) return s.hatDark; // Band
    return n.y > 0.7 ? s.hatLight : n.x > 0.6 || n.z < -0.6 ? s.hatDark : s.hat;
  });
  // Feder rechts am Band, schräg nach hinten
  for (let i = 0; i <= 7; i++) m.set(10 + Math.floor(i / 4), 47 + i, -1 - i, i >= 6 ? s.featherTip : s.feather);
  return m;
}

function gretaTorso32(s) {
  const m = sculptTorsoBase((x, y, z, n, front) => {
    if (front && (x === -1 || x === 0)) return s.jacketDark; // Knopfleiste
    if (y <= 13) return s.jacketDark;
    if (front && y >= 14 && y <= 17 && ((x >= -9 && x <= -4) || (x >= 3 && x <= 8))) return y === 17 ? s.jacketDark : shade(s.jacket, 1); // Taschen
    return roundTone(s.jacket, n, { light: 0 });
  });
  sculptCollar(m, s.jacketDark, { r: 1.8 });
  for (const y of [15, 19, 23]) onChest(m, 0, y, 1, s.buttons);
  // Fernglas vor der Brust am Riemen
  for (let x = -7; x <= 6; x++) if (x === -7 || x === 6) for (let y = 21; y <= 26; y++) onChest(m, x, y, 1, s.strap);
  for (const cx of [-4, 2]) {
    sculpt(m, capsule(cx, 19.5, 9.5, cx, 16.5, 9.5, 1.9), cx - 3, 14, 7, cx + 3, 22, 12, (x, y) => (y >= 21 ? s.glassLight : y <= 15 ? P.s8 : s.glass));
  }
  return m;
}

/** Teile eines Wanderers im Maß 1/32 (für npcs.js und die Porträts). */
function wandererParts32(id) {
  switch (id) {
    case 'hannes': {
      const s = HANNES;
      return {
        skin: s.skin,
        head: hannesHead32(s),
        faces: faceSet32(s, { beard: true }),
        lids: lids32(s),
        torso: hannesTorso32(s),
        arm: baseArm32({ sleeve: s.shirt, sleeveDark: s.shirtDark, cuff: s.shirtDark, skin: s.skin, skinShade: s.skinShade }),
        leg: baseLeg32({ shoe: s.boots, shoeLight: P.e2, low: s.pantsDark, high: { light: s.pants, dark: s.pantsDark } }),
      };
    }
    case 'clara': {
      const s = CLARA;
      return {
        skin: s.skin,
        head: claraHead32(s),
        faces: faceSet32(s),
        lids: lids32(s),
        torso: claraTorso32(s),
        arm: baseArm32({ sleeve: s.overall, sleeveDark: s.overallDark, cuff: s.overallDark, skin: s.skin, skinShade: s.skinShade, forearm: s.skin }),
        leg: baseLeg32({ shoe: s.boots, shoeLight: P.e3, low: s.overallDark, high: { light: s.overall, dark: s.overallDark }, patch: s.patch }),
      };
    }
    case 'lotte': {
      const s = LOTTE;
      return {
        skin: s.skin,
        head: lotteHead32(s),
        faces: faceSet32(s),
        lids: lids32(s),
        torso: lotteTorso32(s),
        arm: baseArm32({ sleeve: s.coat, sleeveDark: s.coatDark, cuff: s.scarf[1], skin: s.skin, skinShade: s.skinShade }),
        leg: baseLeg32({ shoe: s.shoes, shoeLight: P.e3, low: s.tights, high: { light: s.coat, dark: s.coatDark }, top: s.coat }),
      };
    }
    case 'greta': {
      const s = GRETA;
      return {
        skin: s.skin,
        head: gretaHead32(s),
        faces: faceSet32(s),
        lids: lids32(s),
        torso: gretaTorso32(s),
        arm: baseArm32({ sleeve: s.jacket, sleeveDark: s.jacketDark, cuff: s.jacketDark, skin: s.skin, skinShade: s.skinShade }),
        leg: baseLeg32({ shoe: s.boots, shoeLight: P.e3, low: s.socks, high: { light: s.breeches, dark: s.breechesDark }, cuff: s.socks, laces: P.e5 }),
      };
    }
    default:
      return null;
  }
}

// --- N4: Edda ------------------------------------------------------------------------
// Die frühere Herrin der Holzlände spricht über das alte Funkgerät zu Mika. Man kennt
// sie nur von einem Foto (sepia, im Hinweis-Feld unten rechts); erst im Netzwerk
// (M32) steht sie selbst in der Bucht. Merkmale: silberner Zopfkranz, dunkelgrüner
// Strickumhang, Bernsteinbrosche, alte Kopfhörer um den Hals.
export const EDDA = {
  skin: P.h3,
  skinShade: P.h2,
  cheek: P.a1,
  eyes: P.n1,
  brow: P.s8,
  hair: P.s9,
  hairDark: P.s7,
  shawl: P.t2,
  shawlDark: P.t1,
  shawlLight: P.t3,
  blouse: P.s9,
  brooch: P.f6,
  broochDark: P.f4,
  phones: P.n2,
  phonesLight: P.s5,
  earring: P.f6,
  skirt: P.n2,
  skirtDark: P.n1,
  shoes: P.e1,
};

function eddaHead32(s) {
  const m = baseHead32(s);
  // Silberner Zopfkranz rund um den Kopf, Strähnen schräg geflochten
  const crown = (x, y, z) => Math.hypot(Math.hypot(x + 0.5, (z + 2.5) * 1.12) - 11.2, (y - 42.5) * 1.35) - 2.1;
  sculpt(m, crown, -15, 39, -16, 14, 46, 10, (x, y, z) => {
    const a = Math.atan2(z + 2.5, x + 0.5);
    const strand = Math.floor((a / Math.PI) * 14 + (y - 42) * 0.8);
    return ((strand % 2) + 2) % 2 ? s.hair : s.hairDark;
  });
  // Kleine goldene Ohrringe
  m.set(-14, 31, -1, s.earring).set(13, 31, -1, s.earring);
  return m;
}

function eddaTorso32(s) {
  const m = sculptTorsoBase((x, y, z, n, front) => {
    if (front && x >= -3 && x <= 2 && y >= 22) return y === 22 ? s.shawlDark : s.blouse; // Bluse im Ausschnitt
    if (front && (x + y) % 5 === 0) return s.shawlLight; // Strickmuster
    return n.y < -0.4 || n.z < -0.6 ? s.shawlDark : s.shawl;
  });
  sculptCollar(m, s.blouse, { r: 1.4 });
  // Brosche mit Bernstein
  for (const [x, y, c] of [[-1, 21, s.broochDark], [0, 21, s.broochDark], [-2, 20, s.broochDark], [-1, 20, s.brooch], [0, 20, s.brooch], [1, 20, s.broochDark], [-1, 19, s.broochDark], [0, 19, s.broochDark]]) onChest(m, x, y, 1, c);
  onChest(m, -1, 20, 2, P.f7);
  // Alte Kopfhörer um den Hals: zwei Muscheln auf den Schultern, der Bügel hinten
  for (const side of [-1, 1]) sculpt(m, blob(-0.5 + side * 8, 26.5, 4.5, 2.6, 2.6, 1.8), -13, 23, 1, 12, 30, 8, (x, y, z, n) => (n.z > 0.6 ? s.phonesLight : s.phones));
  return m;
}

/** Edda im Maß 1/32 (Porträt jetzt, ganze Figur ab M32); `s` erlaubt eine andere Palette (das alte Foto). */
export function eddaParts32(s = EDDA) {
  return {
    skin: s.skin,
    head: eddaHead32(s),
    faces: faceSet32(s),
    lids: lids32(s),
    torso: eddaTorso32(s),
    arm: baseArm32({ sleeve: s.shawl, sleeveDark: s.shawlDark, cuff: s.blouse, skin: s.skin, skinShade: s.skinShade }),
    leg: baseLeg32({ shoe: s.shoes, shoeLight: P.e2, low: s.skirtDark, high: { light: s.skirt, dark: s.skirtDark }, top: s.skirt }),
  };
}

/** Schlafsack am Gästeplatz (M27): Unterlage, gesteppter Sack, Kissen, karierte Decke, Blechbecher. */
export function bedrollModel() {
  const m = new VoxelModel();
  m.box(-11, 0, -26, 10, 0, 23, (x, y, z) => ((x + z) % 7 === 0 ? P.e4 : P.e5));
  sculpt(m, roundBox(-0.5, 2.5, -2, 9.5, 2.6, 21, 2.2), -11, 1, -24, 10, 5, 20, (x, y, z, n) => (z % 6 === 0 ? P.r1 : n.y > 0.6 ? P.r3 : P.r2));
  sculpt(m, roundBox(-0.5, 3, -21.5, 8, 2.8, 4, 2), -10, 1, -26, 9, 6, -17, (x, y, z, n) => (n.y > 0.5 ? P.s9 : P.s8));
  m.box(-10, 5, 12, 9, 7, 19, (x, y, z) => ((((x + 20) >> 2) + (z >> 2)) % 2 ? P.b3 : P.b4));
  m.box(13, 0, -6, 15, 4, -4, (x, y) => (y === 4 ? P.s6 : P.s4));
  return m;
}
