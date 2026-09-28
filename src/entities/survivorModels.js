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
import { shade } from '../world/voxelKit.js';

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

/** Gesichtsplatten normal und froh (M12) im Maß 1/32. */
function faceSet32(spec, options = {}) {
  const plate = (expr) => {
    const m = new VoxelModel();
    for (let y = 28; y <= 39; y++) for (let x = -12; x <= 11; x++) m.set(x, y, 7, faceColor32(spec, x, y, expr, options));
    return m;
  };
  return { normal: plate('normal'), froh: plate('froh'), eyesClose: !options.glasses };
}

/** Kopf 24 × 16 × 20 wie bei Mika; die Vorderseite unter dem Pony kommt als Gesichtsplatte dazu. */
function baseHead32(spec, { beard = false, plate = true } = {}) {
  const m = new VoxelModel();
  const hairLight = shade(spec.hair, 1);
  m.box(-12, 28, -12, 11, 43, 7, (x, y, z) => {
    if (z === 7) {
      if (y < 40) return plate ? null : faceColor32(spec, x, y, 'normal', { beard });
      return (x + y) % 5 === 0 ? hairLight : spec.hair; // Pony mit Strähnen
    }
    if (z <= -4 || y >= 40) return (x * 3 + y) % 7 === 0 ? hairLight : spec.hair;
    if ((x === -12 || x === 11) && y >= 34) return spec.hair;
    if (beard && (x === -12 || x === 11) && y <= 33) return beard32(spec, z, y); // Bart an den Wangen
    return y === 28 ? spec.skinShade : spec.skin;
  });
  for (const x of [-13, 12]) m.box(x, 32, -2, x, 34, 0, (xx, y) => (y === 34 ? spec.skin : spec.skinShade)); // Ohren
  return m;
}

/** Lider zum Blinzeln (1/32): Haut über den Augen, darunter die Wimpernlinie. */
function lids32(spec) {
  const m = new VoxelModel();
  for (const x of [-8, -7, -6, 5, 6, 7]) m.set(x, 36, 8, spec.skin).set(x, 35, 8, spec.skin).set(x, 34, 8, spec.eyes);
  return m;
}

/** Beine (1/32): Schuhe mit heller Kappe, Strümpfe oder Hose, oben ggf. Rock. */
function baseLeg32({ shoe, shoeLight, low, high, top = null }) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 7, 1, 9, (x, y, z) => (y === 0 ? shade(shoe, -1) : z >= 8 ? shoeLight : shoe));
  m.box(0, 2, 0, 7, 5, 7, (x, y, z) => (y <= 3 ? (z === 7 && x === 3 && y === 3 ? shoeLight : shoe) : low));
  m.box(0, 6, 0, 7, 11, 7, (x, y, z) => {
    if (top && y >= 8) return y === 8 ? shade(top, -1) : (x + y) % 5 === 0 ? shade(top, -1) : top;
    if (y === 6) return high.dark; // Aufschlag
    return x === 0 || z === 0 ? high.dark : x === 6 && z === 7 ? shade(high.light, 1) : high.light;
  });
  return m;
}

/** Arme (1/32): Hand mit Daumen, Bündchen, Ärmel mit Falten; `forearm` für hochgekrempelte Ärmel. */
function baseArm32({ sleeve, sleeveDark, cuff, skin, skinShade, forearm = null }) {
  const m = new VoxelModel();
  m.box(0, 0, 1, 3, 3, 6, (x, y, z) => ((y === 0 && (z === 1 || z === 6)) ? null : z === 6 && y === 1 ? skinShade : y === 3 ? shade(skin, 1) : skin));
  m.set(3, 2, 7, skin).set(3, 1, 7, skinShade); // Daumen
  m.box(0, 4, 0, 3, 5, 7, (x, y) => (forearm ? forearm : y === 5 ? cuff : shade(cuff, -1)));
  m.box(0, 6, 0, 3, 15, 7, (x, y, z) => {
    if (forearm && y <= 7) return forearm;
    if (forearm && y === 8) return sleeveDark; // Krempe
    if (z === 0) return sleeveDark;
    if ((y === 10 || y === 13) && z >= 4) return sleeveDark; // Falten
    return y >= 14 ? shade(sleeve, 1) : sleeve;
  });
  return m;
}

function hildeHead32(s) {
  const m = baseHead32(s);
  // Postmütze mit Band, Schirm und Abzeichen
  m.box(-12, 44, -12, 11, 49, 7, (x, y, z) => ((x === -12 || x === 11) && (z === -12 || z === 7) && y === 49 ? null : y <= 45 ? s.capDark : y === 49 ? shade(s.cap, 1) : s.cap));
  m.box(-10, 44, 8, 9, 45, 11, (x, y, z) => (z === 11 ? shade(s.capDark, -1) : s.capDark)); // Schirm
  m.box(-2, 46, 8, 1, 48, 8, (x, y) => (y === 48 ? P.f7 : s.badge)).set(-1, 47, 9, P.f4).set(0, 47, 9, P.f4); // Abzeichen mit Posthorn
  // Grauer Dutt hinten unter der Mütze, mit Haarnadel
  m.ellipsoid(-0.5, 38, -15, 5, 5, 3.2, (x, y, z) => ((x + y) % 3 === 0 ? s.hairDark : s.hair));
  m.box(2, 40, -18, 5, 40, -18, P.s4);
  return m;
}

function hildeTorso32(s) {
  const m = new VoxelModel();
  m.box(-12, 12, -8, 11, 27, 7, (x, y, z) => {
    if (z === 7 && (x === -1 || x === 0)) return y % 4 === 1 && x === 0 ? s.buttons : s.cardiganDark; // Knopfleiste
    if (y <= 13 || y >= 26 || x === -12 || x === 11) return s.cardiganDark;
    const cable = (x + 12) % 6;
    if (cable === 2 || cable === 3) return (y + (cable === 2 ? 0 : 2)) % 4 < 2 ? s.cardiganDark : s.cardigan; // Zopfmuster
    return s.cardigan;
  });
  // Posttasche am Riemen (rechte Schulter zur linken Hüfte)
  for (let i = 0; i <= 13; i++) m.box(8 - Math.round(i * 1.4), 27 - i, 8, 9 - Math.round(i * 1.4), 27 - i, 8, s.bagDark);
  m.box(-16, 12, -2, -13, 19, 7, (x, y, z) => (y >= 18 ? s.bagDark : z === 7 && y === 17 ? shade(s.bag, 1) : s.bag));
  m.box(-16, 15, 7, -16, 16, 7, s.badge);
  return m;
}

function bertHead32(s) {
  const m = baseHead32(s, { beard: true });
  // Rote Kappe mit Nähten, Knopf und langem Schirm
  m.box(-12, 44, -12, 11, 49, 7, (x, y, z) => ((x === -12 || x === 11) && (z === -12 || z === 7) && y >= 48 ? null : y === 44 ? s.capDark : x === -1 || x === 0 ? s.capDark : s.cap));
  m.box(-2, 50, -4, 1, 50, -1, s.capDark);
  m.box(-10, 44, 8, 9, 45, 13, (x, y, z) => (z === 13 ? shade(s.capDark, -1) : s.capDark));
  // Bart ragt unten vor, mit Strähnen
  m.box(-8, 25, 7, 7, 29, 9, (x, y, z) => (y === 25 && (x + z) % 2 ? null : beard32(s, x, y)));
  return m;
}

function bertTorso32(s) {
  const m = new VoxelModel();
  // Karohemd: breite Karos mit feinen Linien
  m.box(-12, 12, -8, 11, 27, 7, (x, y, z) => {
    const cx = Math.floor((x + 16) / 4) % 2;
    const cy = Math.floor(y / 4) % 2;
    if ((x + 16) % 4 === 0 || y % 4 === 0) return s.shirtDark;
    return cx ^ cy ? s.shirt : shade(s.shirt, 1);
  });
  // Schürze vor dem Bauch mit Tasche, Bleistift und Trägern
  m.box(-10, 12, 8, 9, 25, 10, (x, y, z) => {
    if (y === 25) return s.apronDark;
    if (z === 10 && y >= 16 && y <= 19 && x >= -6 && x <= 5) return y === 19 || x === -6 || x === 5 ? s.apronDark : shade(s.apron, 1); // Tasche
    return x === -10 || x === 9 ? s.apronDark : s.apron;
  });
  m.box(2, 19, 11, 2, 24, 11, s.pencil).set(2, 25, 11, P.s7).set(2, 18, 11, P.e7);
  m.box(-8, 24, 8, -7, 27, 8, s.apronDark).box(6, 24, 8, 7, 27, 8, s.apronDark);
  return m;
}

function junaHead32(s) {
  const m = baseHead32(s);
  // Kurze, verwuschelte Haare mit Spange
  m.box(-12, 44, -10, 11, 45, 5, (x, y, z) => ((x + z * 2) % 5 < 2 ? (y === 45 ? null : s.hair) : (x * 2 + z) % 4 === 0 ? s.hair : null));
  m.box(8, 40, 8, 9, 43, 8, (x, y) => (y === 43 ? P.a1 : s.clip));
  // Dicke Kopfhörer mit Bügel und Lichtring
  for (const x0 of [-16, 12]) {
    m.box(x0, 30, -6, x0 + 3, 39, 3, (x, y, z) => {
      const outer = x0 < 0 ? x === x0 : x === x0 + 3;
      if (outer && Math.hypot(y - 34.5, z + 1.5) < 3.5 && Math.hypot(y - 34.5, z + 1.5) > 2.2) return s.phonesLight;
      return s.phones;
    });
  }
  m.box(-14, 40, -4, -13, 45, -2, s.phones).box(12, 40, -4, 13, 45, -2, s.phones);
  m.box(-12, 46, -4, 11, 47, -2, (x, y) => (y === 47 ? shade(s.phones, 1) : s.phones));
  return m;
}

function junaTorso32(s) {
  const m = new VoxelModel();
  m.box(-12, 12, -8, 11, 27, 7, (x, y, z) => {
    if (y <= 13 || y >= 26) return s.coatShade;
    if (z === 7 && (x === -1 || x === 0)) return y >= 22 ? s.coatShade : x === 0 ? P.s6 : s.coatDark; // Reißverschluss
    if (z === 7 && y >= 14 && y <= 17 && x >= -8 && x <= 7) return y === 17 || x === -8 || x === 7 ? s.coatShade : s.coatDark; // Bauchtasche
    if (x === -12 || x === 11) return s.coatDark;
    return s.coat;
  });
  // Kordeln der Kapuze
  m.box(-4, 21, 8, -4, 25, 8, P.a4).box(3, 21, 8, 3, 25, 8, P.a4);
  // Kleiner Rucksack mit Antenne
  m.box(-6, 16, -12, 5, 25, -9, (x, y) => (y >= 24 ? P.s3 : x === -6 || x === 5 ? P.s3 : P.s4));
  for (let y = 26; y <= 40; y++) m.set(4, y, -12, y % 5 === 0 ? P.s4 : s.antenna);
  m.box(3, 41, -13, 5, 42, -11, P.f3);
  return m;
}

function yusufHead32(s) {
  const m = baseHead32(s, { beard: true });
  // Graue Schläfen, welliges Haar oben
  for (const x of [-12, 11]) m.box(x, 36, 1, x, 39, 3, P.s6);
  m.box(-12, 44, -12, 11, 45, 5, (x, y, z) => ((x + z + (y === 45 ? 1 : 0)) % 3 === 0 ? null : (x + z) % 3 === 1 ? shade(s.hair, 1) : s.hair));
  return m;
}

function yusufTorso32(s) {
  const m = new VoxelModel();
  m.box(-12, 12, -8, 11, 27, 7, (x, y, z) => {
    if (z === 7 && x >= -3 && x <= 2 && y >= 16) return (x === -3 || x === 2) ? s.coatDark : s.shirt; // offener Kittel
    if (z === 7 && (x === -4 || x === 3) && y >= 16) return s.coatDark;
    if (y <= 13 || x === -12 || x === 11) return s.coatDark;
    return s.coat;
  });
  // Stethoskop um den Hals, das Bruststück hängt links
  m.box(-6, 24, 8, 5, 24, 8, (x) => (x === -6 || x === 5 ? s.scope : null));
  m.box(-6, 17, 8, -6, 23, 8, s.scope).box(-7, 15, 8, -5, 16, 8, P.s8);
  m.box(5, 21, 8, 5, 23, 8, s.scope);
  // Brusttasche mit Stiften
  m.box(5, 17, 8, 9, 20, 8, (x, y) => (y === 20 ? s.coatDark : s.coat));
  m.box(6, 21, 8, 6, 22, 8, s.pens).box(8, 21, 8, 8, 22, 8, P.r3);
  return m;
}

function balduinHead32(s) {
  const m = baseHead32(s, { beard: true, plate: false });
  // Kräftiger Bart: steht vorn ab und reicht bis auf die Brust. Darin ein
  // breites Grinsen mit einem Goldzahn
  m.box(-10, 22, 8, 9, 33, 9, (x, y, z) => {
    if (y >= 32 && x >= -2 && x <= 1) return s.nose;
    if (y === 30 && (x === -5 || x === 4)) return P.a0; // Mundwinkel oben
    if (y === 29 && x >= -4 && x <= 3) return x === -1 || x === 0 ? s.goldTooth : x === -2 || x === 1 ? P.s9 : P.a0; // Zähne, einer aus Gold
    if (y === 28 && x >= -3 && x <= 2) return P.a0; // Mund
    if (y >= 32 && (x < -8 || x > 7)) return null;
    if (y <= 23 && (x + z) % 2) return null; // ausgefranste Bartspitzen
    return beard32(s, x, y);
  });
  m.box(-2, 34, 8, 1, 35, 9, (x, y) => (y === 35 && x === -2 ? P.s9 : x < 0 ? s.skin : s.nose)); // runde Nase
  m.box(-11, 33, 7, -9, 34, 7, s.cheek).box(8, 33, 7, 10, 34, 7, s.cheek); // rote Wangen – der Wind auf dem See
  // Buschige Brauen, außen hochgezogen
  m.box(-10, 37, 7, -5, 38, 7, s.brow).box(4, 37, 7, 9, 38, 7, s.brow);
  m.box(-11, 39, 7, -10, 39, 7, s.brow).box(9, 39, 7, 10, 39, 7, s.brow);
  // Schiebermütze: flach, leicht nach vorn gezogen, Fischgrätmuster, Schirm und Knopf
  m.box(-14, 42, -14, 13, 43, 9, (x, y, z) => ((x + z) % 4 === 0 || (x - z) % 4 === 0 ? s.capLight : s.cap));
  m.box(-12, 44, -12, 11, 45, 7, (x, y, z) => (y === 45 && (x === -12 || x === 11 || z === -12) ? null : (x + z) % 4 === 0 ? s.capLight : s.cap));
  m.box(-12, 40, 8, 11, 41, 11, (x, y, z) => (z === 11 ? shade(s.capDark, -1) : s.capDark)); // Schirm
  m.box(-2, 46, -3, 1, 47, 0, s.capDark); // Knopf oben
  return m;
}

function balduinTorso32(s) {
  const m = new VoxelModel();
  // Dunkler Seemannsmantel mit zwei Reihen Messingknöpfen
  m.box(-12, 12, -8, 11, 27, 7, (x, y, z) => {
    if (z === 7 && (x === -5 || x === 4) && y % 5 === 2) return s.buttons;
    if (z === 7 && (x === -1 || x === 0)) return s.coatDark;
    if (y <= 13 || x === -12 || x === 11) return s.coatDark;
    return s.coat;
  });
  // Roter Schal um den Hals, ein Ende hängt vorn herunter, mit Fransen
  m.box(-12, 26, -10, 11, 29, 9, (x, y, z) => (z >= 8 || z <= -9 || x <= -11 || x >= 10 ? ((x + y + z) % 3 ? s.scarf : s.scarfDark) : null));
  m.box(-8, 15, 8, -5, 25, 9, (x, y) => (y <= 16 ? ((x & 1) ? s.scarfDark : null) : y % 4 === 0 ? s.scarfDark : s.scarf));
  // Tragegurte über die Schultern
  m.box(-10, 17, 8, -10, 25, 8, s.strap).box(9, 17, 8, 9, 25, 8, s.strap);
  // Riesiger Rucksack hinten, mit Deckenrolle obenauf und einer Pfanne an der Seite
  m.box(-12, 14, -20, 11, 39, -12, (x, y, z) => {
    if (y <= 15 || x === -12 || x === 11 || z === -20) return s.packDark;
    if ((y === 24 || y === 25) && z === -12) return s.strap; // Riemen
    if (z === -20 && y >= 20 && y <= 30 && x >= -6 && x <= 5) return y === 30 || x === -6 || x === 5 ? s.strap : s.pack; // Deckel
    return (x + y) % 9 === 0 ? s.packDark : s.pack;
  });
  for (let x = -14; x <= 13; x++) {
    for (let y = 40; y <= 43; y++) for (let z = -18; z <= -14; z++) {
      if (Math.hypot(y - 41.5, z + 15.5) > 2.6) continue;
      m.set(x, y, z, x === -14 || x === 13 ? (Math.floor(Math.hypot(y - 41.5, z + 15.5) * 1.5) % 2 ? s.roll : s.rollLight) : x % 6 === 0 ? s.strap : x % 3 === 0 ? s.rollLight : s.roll);
    }
  }
  m.ellipsoid(12.5, 24, -16, 1.2, 4, 3.6, s.pan).box(12, 29, -16, 13, 33, -16, s.strap);
  return m;
}

function balduinLeg32(s) {
  const m = new VoxelModel();
  // Feste Stiefel mit Schnürung, dunkle Arbeitshose mit Flicken
  m.box(0, 0, 0, 7, 1, 9, (x, y, z) => (y === 0 ? P.e1 : z >= 8 ? P.e2 : s.boots));
  m.box(0, 2, 0, 7, 5, 7, (x, y, z) => (z === 7 && (x === 3 || x === 4) && y % 2 === 0 ? P.e5 : y === 5 ? s.pantsDark : s.boots));
  m.box(0, 6, 0, 7, 11, 7, (x, y, z) => (x === 0 || z === 0 ? s.pantsDark : z === 7 && x >= 2 && x <= 4 && y >= 7 && y <= 9 ? P.e4 : s.pants));
  return m;
}

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
      return null;
  }
}
