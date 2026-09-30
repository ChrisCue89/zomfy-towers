// Voxel-Figuren. Eine Figur besteht aus Teilen (Beine, Körper, Arme, Kopf),
// die an Gelenken hängen und sich so animieren lassen. Der gleiche Bauer wird
// später für Überlebende benutzt; Porträts werden aus dem Kopf gerendert.
//
// Koordinaten in Voxeln (1/8 m), Blickrichtung +z, Ursprung zwischen den Füßen.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { createWorldMaterial, createGlowMaterial } from '../render/materials.js';
import { V } from '../world/layout.js';
import { hash3 } from '../core/rng.js';
import { shade, edgeLight, sculpt, roundBox, blob, capsule, roundTone } from '../world/voxelKit.js';
import { HEAD, TORSO, headShape, torsoShape, facePlate, facLids, sculptArm, sculptLeg, sculptCollar } from './figureKit.js';
import { buildRod32, ROD_TIP } from './fishingModels.js';

/** Aussehen der Hauptfigur Mika. */
export const MIKA = {
  skin: P.h3,
  skinShade: P.h2,
  cheek: P.a1,
  eyes: P.n1,
  hair: P.e3,
  hat: P.f4,
  hatDark: P.f3,
  hatLight: P.f5,
  pompom: P.e9,
  jacket: P.g5,
  jacketDark: P.g4,
  jacketLight: P.g6,
  zipper: P.e8,
  pants: P.b2,
  pantsDark: P.b1,
  boots: P.e2,
  bootsLight: P.e4,
  backpack: P.e6,
  backpackDark: P.e4,
  bedroll: P.b3,
  strap: P.e3,
};

function buildLeg(spec) {
  const m = new VoxelModel();
  m.box(0, 1, 0, 1, 2, 1, (x, y) => (y === 2 ? spec.pantsDark : spec.pants));
  m.box(0, 0, 0, 1, 0, 1, spec.boots);
  m.box(0, 0, 2, 1, 0, 2, spec.bootsLight);
  return m;
}

function buildArm(spec) {
  const m = new VoxelModel();
  m.box(0, 1, 0, 0, 3, 1, (x, y) => (y === 3 ? spec.jacketLight : spec.jacket));
  m.box(0, 0, 0, 0, 0, 1, spec.skin);
  return m;
}

function buildTorso(spec) {
  const m = new VoxelModel();
  // Jacke
  m.box(-3, 3, -2, 2, 6, 1, (x, y, z) => {
    if (y === 3) return spec.jacketDark; // Saum
    if (z === 1 && x === 0) return spec.zipper;
    if (z === 1 && y === 4 && (x === -3 || x === 2)) return spec.jacketDark; // Taschen
    if (y === 6 && (z === 1 || z === -2)) return spec.jacketDark; // Kragen
    return spec.jacket;
  });
  // Riemen vorn
  m.box(-2, 4, 1, -2, 6, 1, spec.strap);
  m.box(1, 4, 1, 1, 6, 1, spec.strap);
  // Rucksack mit Isomatte
  m.box(-2, 3, -4, 1, 6, -3, (x, y, z) => (y === 6 ? spec.backpackDark : z === -4 && y === 4 ? spec.backpackDark : spec.backpack));
  m.box(-3, 7, -4, 2, 7, -3, (x) => (x % 2 ? spec.bedroll : P.b2));
  return m;
}

function buildHead(spec) {
  const m = new VoxelModel();
  // Kopf: 6 breit, 4 hoch, 5 tief
  m.box(-3, 7, -3, 2, 10, 1, (x, y, z) => {
    const front = z === 1;
    if (front) {
      if (y === 10) return spec.hair; // Pony
      if (y === 9 && (x === -2 || x === 1)) return spec.eyes;
      if (y === 8 && (x === -3 || x === 2)) return spec.cheek;
      return spec.skin;
    }
    if (z <= -1 || y >= 9) return spec.hair;
    return y === 7 ? spec.skinShade : spec.skin;
  });
  // Mütze: umgeschlagener Rand, Kappe, Bommel
  m.box(-3, 11, -3, 2, 11, 1, (x) => (x % 2 ? spec.hatDark : spec.hat));
  m.box(-3, 12, -3, 2, 12, 1, (x, y, z) => ((x === -3 || x === 2) && (z === -3 || z === 1) ? null : x % 2 ? spec.hat : spec.hatLight));
  m.box(-2, 13, -2, 1, 13, 0, spec.hat);
  m.box(-1, 14, -2, 0, 14, -1, spec.pompom);
  return m;
}


// --- Feiner Detailgrad (1/16 m, Meilenstein 5) -------------------------------------
// Gleiche Maße in Metern wie oben, doppelt so viele Voxel je Richtung.

function buildLeg16(spec) {
  const m = new VoxelModel();
  // Stiefel: Sohle mit Kappe vorn, Schaft, heller Kragen
  m.box(0, 0, 0, 3, 0, 4, (x, y, z) => (z === 4 ? spec.bootsLight : P.e1));
  m.box(0, 1, 0, 3, 1, 3, (x, y, z) => (z === 3 && (x === 1 || x === 2) ? spec.bootsLight : spec.boots));
  m.box(0, 2, 0, 3, 2, 3, spec.bootsLight);
  // Hose mit Flicken am Knie
  m.box(0, 3, 0, 3, 5, 3, (x, y, z) => {
    if (z === 3 && y === 4 && (x === 1 || x === 2)) return P.b3;
    if (y === 5) return spec.pantsDark;
    return x === 0 || z === 0 ? spec.pantsDark : spec.pants;
  });
  return m;
}

function buildArm16(spec) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 1, 1, 3, (x, y, z) => (y === 0 && z === 3 ? spec.skinShade : spec.skin)); // Hand
  m.box(0, 2, 0, 1, 2, 3, spec.jacketDark); // Bündchen
  m.box(0, 3, 0, 1, 7, 3, (x, y, z) => (y === 7 ? spec.jacketLight : x === 1 && z === 0 ? spec.jacketDark : spec.jacket));
  return m;
}

function buildTorso16(spec) {
  const m = new VoxelModel();
  // Jacke: Saum, Reißverschluss, Taschen, Kragen
  m.box(-6, 6, -4, 5, 13, 3, (x, y, z) => {
    if (y === 6) return spec.jacketDark;
    if (z === 3 && x === 0) return y === 12 ? spec.zipper : P.s6; // Reißverschluss mit Zipper oben
    if (z === 3 && x === -1) return spec.jacketDark;
    if (z === 3 && (y === 8 || y === 9) && (x === -5 || x === -4 || x === 3 || x === 4)) return y === 9 ? spec.jacketDark : spec.jacketLight;
    if (y === 13) return spec.jacketDark;
    if (x === -6 || x === 5) return spec.jacketDark;
    return spec.jacket;
  });
  // Riemen vorn mit Schnalle
  for (const sx of [-4, 3]) {
    m.box(sx, 8, 4, sx, 13, 4, spec.strap);
    m.set(sx, 10, 4, P.s7);
  }
  // Rucksack mit Klappe, Tasche und Isomatte
  m.box(-4, 7, -7, 3, 13, -5, (x, y, z) => {
    if (y >= 12) return spec.backpackDark;
    if (z === -7 && y >= 8 && y <= 9 && x >= -2 && x <= 1) return spec.backpackDark;
    return spec.backpack;
  });
  m.set(-1, 11, -8, P.s7).set(0, 11, -8, P.s7);
  m.box(-6, 14, -9, 5, 15, -7, (x, y) => ((x + y) % 3 === 0 ? P.b2 : spec.bedroll));
  return m;
}

/**
 * Gesichtsausdrücke (M12): Die Vorderseite des Kopfes (z = 3, Reihen 14–19) ist
 * je Ausdruck eine eigene Platte – immer nur eine ist sichtbar.
 */
export const EXPRESSIONS = ['normal', 'froh', 'aua', 'staunen', 'muede', 'besorgt', 'entschlossen'];
/** Bei diesen Ausdrücken sind die Augen offen (dann wird geblinzelt). */
export const OPEN_EYES = new Set(['normal', 'staunen', 'besorgt']);

/** Farbe der Gesichtsplatte an (x, y) für einen Ausdruck. */
function faceColor16(spec, x, y, expr) {
  const eye = x === -4 || x === -3 || x === 2 || x === 3;
  const mid = x === -1 || x === 0;
  const line = P.r1; // Mundlinie, offener Mund
  if (y === 19) {
    if (x === -6 || x === -5 || x === 4 || x === 5) return spec.hair; // Strähnen
    if (expr === 'entschlossen') return x === -3 || x === -2 || x === 1 || x === 2 ? spec.skinShade : spec.skin; // Brauen zusammengezogen
    if (expr === 'besorgt' || expr === 'aua') return x === -3 || x === 2 ? spec.skinShade : spec.skin; // nur innen: hochgezogen
    return eye ? spec.skinShade : spec.skin;
  }
  if (y === 18 || y === 17) {
    switch (expr) {
      case 'froh': // lachende Bögen
        if (y === 18) return eye ? spec.eyes : spec.skin;
        return x === -5 || x === -2 || x === 1 || x === 4 ? spec.eyes : spec.skin;
      case 'aua': // zusammengekniffen
        if (y === 18) return x === -5 || x === 4 ? spec.eyes : spec.skin;
        return (x >= -4 && x <= -2) || (x >= 1 && x <= 3) ? spec.eyes : spec.skin;
      case 'muede':
      case 'entschlossen': // Lider halb zu
        if (y === 18) return spec.skin;
        return eye ? spec.eyes : spec.skin;
      default:
        if (!eye) return spec.skin;
        return y === 18 && (x === -4 || x === 2) ? P.s9 : spec.eyes; // Lichtpunkt
    }
  }
  if (y === 16) {
    if (expr === 'froh' && (x === -3 || x === 2)) return line; // Mundwinkel oben
    if (x === -5 || x === -4 || x === 3 || x === 4) return spec.cheek;
    return x === -1 ? spec.skinShade : spec.skin; // Nase, nur angedeutet
  }
  if (y === 15) {
    switch (expr) {
      case 'froh':
        return x >= -2 && x <= 1 ? line : spec.skin; // breites Lächeln
      case 'aua':
      case 'staunen':
      case 'besorgt':
        return mid ? line : spec.skin;
      case 'muede':
        return x === 0 ? P.a0 : spec.skin;
      case 'entschlossen':
        if (x === -2 || x === 1) return line;
        return mid ? P.s9 : spec.skin; // zusammengebissene Zähne
      default:
        return mid ? P.a0 : spec.skin;
    }
  }
  // Kinn (y 14): offener Mund, hängende Mundwinkel
  if ((expr === 'aua' || expr === 'staunen') && mid) return line;
  if (expr === 'besorgt' && (x === -2 || x === 1)) return line;
  return spec.skinShade;
}

/** Gesichtsplatte eines Ausdrucks (nur die Voxel der Vorderseite). */
export function buildFacePlate16(spec, expr) {
  const m = new VoxelModel();
  for (let y = 14; y <= 19; y++) for (let x = -6; x <= 5; x++) m.set(x, y, 3, faceColor16(spec, x, y, expr));
  return m;
}

function buildHead16(spec) {
  const m = new VoxelModel();
  // Kopf 12 × 8 × 10; die Vorderseite unter dem Pony kommt als Gesichtsplatte dazu
  m.box(-6, 14, -6, 5, 21, 3, (x, y, z) => {
    if (z === 3) return y >= 20 ? spec.hair : null; // Pony; darunter die Gesichtsplatte
    if (z <= -2 || y >= 19) return spec.hair;
    if ((x === -6 || x === 5) && y >= 16) return spec.hair; // Haare über den Ohren
    return y === 14 ? spec.skinShade : spec.skin;
  });
  // Mütze: gerippter Umschlag, gestreifte Kappe, Bommel
  m.box(-7, 22, -7, 6, 23, 4, (x, y, z) => ((x === -7 || x === 6) && (z === -7 || z === 4) ? null : (x + z) % 2 ? spec.hatDark : spec.hat));
  m.box(-6, 24, -6, 5, 26, 3, (x, y, z) => {
    if ((x === -6 || x === 5) && (z === -6 || z === 3)) return null;
    return y === 25 ? spec.hatLight : spec.hat;
  });
  m.box(-4, 27, -4, 3, 28, 1, (x, y) => (y === 28 ? spec.hatDark : spec.hat));
  m.box(-2, 29, -3, 1, 31, 0, (x, y, z) => ((x === -2 || x === 1) && (y === 29 || y === 31) && (z === -3 || z === 0) ? null : spec.pompom));
  return m;
}

// --- Doppelt fein (M13g, 1/32 m): Detaildichte wie im Vorbild des Auftraggebers ---
// Gleiche Maße in Metern wie oben, noch einmal doppelt so viele Voxel je
// Richtung (gut 2 px je Voxel bei 80 px/m). Gelenke und Versätze sind die
// Werte der 1/16-Figur mal zwei.

/** Brauenhöhe außen/innen je Ausdruck (Reihen 37–39). */
const BROWS32 = {
  normal: [38, 38],
  froh: [38, 38],
  staunen: [39, 39],
  entschlossen: [38, 37], // innen tief: grimmig
  besorgt: [37, 38], // innen hoch: sorgenvoll
  aua: [37, 38],
  muede: [37, 37],
};

/** Farbe der Gesichtsplatte an (x, y) für einen Ausdruck – 24 × 12 Voxel, Augen 3 × 3 mit Lichtpunkt. */
function faceColor32(spec, x, y, expr) {
  const eyeL = x >= -8 && x <= -6;
  const eyeR = x >= 5 && x <= 7;
  const eye = eyeL || eyeR;
  const skin = spec.skin;
  const shadeS = spec.skinShade;
  const dark = spec.eyes;
  const line = P.r1;
  // Seitliche Strähnen (N5: bei »Frau« länger, sie rahmen das Gesicht bis zum Mund)
  const low = spec.body === 'frau' ? 30 : 36;
  if (y >= low && (x <= -11 || x >= 10)) return spec.hair;
  if (y === 39 && (x <= -10 || x >= 9)) return spec.hair;
  // Brauen: außen x −9..−8 / 7..8, innen −7..−6 / 5..6
  if (y >= 37) {
    const [outer, inner] = BROWS32[expr] || BROWS32.normal;
    const isOuter = x === -9 || x === -8 || x === 7 || x === 8;
    const isInner = x === -7 || x === -6 || x === 5 || x === 6;
    if ((isOuter && y === outer) || (isInner && y === inner)) return shade(spec.hair, 1);
    return skin;
  }
  // Augen (Reihen 34–36)
  if (y >= 34) {
    switch (expr) {
      case 'froh': // lachende Bögen
        if (y === 36) return x === -7 || x === 6 ? dark : skin;
        if (y === 35) return x === -8 || x === -6 || x === 5 || x === 7 ? dark : skin;
        return skin;
      case 'aua': // zusammengekniffen > <
        if (y === 35) return x === -7 || x === 6 ? dark : skin;
        return x === -8 || x === 7 ? dark : skin;
      case 'muede': // Lider halb zu
        if (y === 36) return eye ? shadeS : skin;
        if (y === 35) return eye ? dark : skin;
        return eye ? P.n2 : skin;
      case 'entschlossen': // Lider ein wenig zu
        if (y === 36) return eye ? shadeS : skin;
        return eye ? dark : skin;
      default: {
        // N5: Wimpern am äußeren Augenwinkel (Frau)
        if (spec.body === 'frau' && y === 36 && (x === -9 || x === 8)) return dark;
        if (!eye) return skin;
        if ((x === -8 || x === 5) && y === 36) return P.s9; // Lichtpunkt oben links
        return y === 34 ? P.n2 : dark;
      }
    }
  }
  // Nase und Wangen
  if (y === 33) return x === 0 ? shadeS : skin;
  if (y === 32) {
    if ((x >= -11 && x <= -9) || (x >= 8 && x <= 10)) return spec.cheek;
    return x === 0 || x === -1 ? shadeS : skin;
  }
  // Mund (Reihen 29–31)
  if (y === 31) return expr === 'froh' && (x === -4 || x === 3) ? line : skin;
  if (y === 30) {
    switch (expr) {
      case 'froh':
        return x >= -3 && x <= 2 ? line : skin;
      case 'aua':
      case 'staunen':
        return x >= -1 && x <= 0 ? line : x === -2 || x === 1 ? shadeS : skin;
      case 'besorgt':
        return x === -2 || x === 1 ? line : skin;
      case 'entschlossen':
        if (x === -3 || x === 2) return line;
        return x >= -2 && x <= 1 ? P.s9 : skin; // zusammengebissene Zähne
      case 'muede':
        return x === -1 || x === 0 ? P.a0 : skin;
      default:
        return x >= -1 && x <= 0 ? P.a0 : x === -2 || x === 1 ? shadeS : skin;
    }
  }
  if (y === 29) {
    if (expr === 'froh') return x >= -2 && x <= 1 ? P.a0 : skin; // Zunge im Lachen
    if (expr === 'aua' || expr === 'staunen') return x >= -1 && x <= 0 ? line : skin;
    if (expr === 'besorgt') return x >= -1 && x <= 0 ? line : skin;
    return skin;
  }
  // Kinn
  return shadeS;
}

// --- N1: Figuren aus Formen statt Kästen ---------------------------------------
// Gleiche Größe und Gelenke wie die Figur im Maß 1/32 (M13g), aber aus
// Abstandsfeldern geformt (voxelKit.sculpt): runder Kopf mit schmalerem Kinn,
// Mütze als Kuppel mit Rippenbund, Rumpf mit runden Schultern und Rollkragen,
// Arme mit Ellbogen und Händen mit Daumen, Beine mit Knien und Stiefeln mit
// runder Kappe. Rundungen bekommen oben und zur Lichtseite eine Stufe Licht,
// unten Schatten (roundTone). Koordinaten wie oben: absolut für Rumpf und
// Kopf, je Glied lokal (Arm x 0..3, Bein x 0..7, jeweils y von unten).

/** Glieder im Stil der Figur (figureKit): Mikas Jacke, Hose mit Flicken, Stiefel mit Schnürung. */
const mikaArm = (spec) => ({ sleeve: spec.jacket, sleeveDark: spec.jacketDark, sleeveLight: spec.jacketLight, cuff: spec.jacketDark, skin: spec.skin, skinShade: spec.skinShade });
const mikaLeg = (spec) => ({ shoe: spec.boots, shoeLight: spec.bootsLight, sole: P.e1, low: spec.pantsDark, high: { light: spec.pants, dark: spec.pantsDark }, patch: P.b3, laces: P.e8, cuff: spec.bootsLight });

/** Rumpf: Jacke mit runden Schultern, Rollkragen, Taschen, Riemen; Rucksack und Isomatte. */
function sculptTorso(spec) {
  const m = new VoxelModel();
  const front = TORSO.front;
  sculpt(m, torsoShape, -13, 12, -9, 12, 27, 8, (x, y, z, n) => {
    if (y <= 13) return y === 12 ? shade(spec.jacketDark, -1) : spec.jacketDark; // Saum
    const isFront = z === front(x, y);
    if (isFront) {
      if (x === -1 || x === 0) return y % 2 ? P.s6 : P.s7; // Reißverschluss
      if (x === -2) return spec.jacketDark;
      // Taschen mit Klappe und Knopf
      const pocket = (x >= -10 && x <= -5) || (x >= 4 && x <= 9);
      if (pocket && y >= 15 && y <= 20) {
        if (y === 20) return spec.jacketDark;
        if (y === 19) return x === -8 || x === 6 ? P.s7 : spec.jacketDark;
        if (x === -10 || x === 9 || y === 15) return spec.jacketDark;
        return spec.jacketLight;
      }
      // Riemen des Rucksacks über die Brust, mit Schnalle
      if (x === -9 || x === -8 || x === 7 || x === 8) {
        if (y === 19 || y === 20) return y === 20 ? P.s8 : P.s6;
        return y % 4 === 0 ? shade(spec.strap, -1) : spec.strap;
      }
    }
    if (hash3(x >> 1, y >> 1, z >> 1, 5) > 0.93) return spec.jacketDark; // Stoff
    return roundTone(spec.jacket, n);
  });
  // Rollkragen um den Hals
  sculptCollar(m, (x, y, z, n) => (n.y > 0.4 ? spec.jacketLight : spec.jacketDark));
  m.box(-1, 25, 7, 0, 26, 7, spec.zipper); // Zipper am Kragen
  // Rucksack: runde Kanten, Klappe, Außentasche, Riemen mit Schnalle
  sculpt(m, roundBox(-0.5, 20, -11.5, 9, 7.2, 3.2, 2.2), -10, 12, -15, 9, 28, -8, (x, y, z, n) => {
    if (y <= 13) return spec.backpackDark;
    if (y >= 23) return y === 23 ? shade(spec.backpackDark, -1) : spec.backpackDark; // Klappe
    const back = n.z < -0.6;
    if (back && (x === -1 || x === 0) && y >= 18) return spec.strap;
    if (back && x >= -6 && x <= 5 && y >= 15 && y <= 18) return x === -6 || x === 5 || y === 18 ? spec.backpackDark : spec.backpack; // Außentasche
    return roundTone(spec.backpack, n);
  });
  m.box(-1, 18, -15, 0, 19, -15, P.s7); // Schnalle
  // Isomatte oben quer: gerollt, mit Spirale an den Stirnseiten und zwei Riemen
  for (let x = -13; x <= 12; x++) {
    for (let y = 28; y <= 32; y++) {
      for (let z = -18; z <= -13; z++) {
        const d = Math.hypot(y + 0.5 - 30.5, z + 0.5 - -15.5);
        if (d > 2.8) continue;
        let c = Math.floor(d * 1.6) % 2 ? spec.bedroll : P.b2;
        if (x === -13 || x === 12) c = Math.floor(d) % 2 ? P.b2 : spec.bedroll;
        if (x === -8 || x === 7) c = P.e3;
        m.set(x, y, z, c);
      }
    }
  }
  return m;
}

/** Kopf: Rundung aus headShape, Haar hinten und seitlich, Pony mit Strähnen, Ohren, Mütze. */
function sculptHead(spec) {
  const m = new VoxelModel();
  const hairLight = shade(spec.hair, 1);
  sculpt(m, headShape, -13, 28, -13, 12, 43, 9, (x, y, z, n) => {
    if (y <= 39 && z === HEAD.front(x, y)) return null; // Gesichtsplatte
    const isFront = n.z > 0.55;
    if (isFront && y >= 40) {
      if (y === 40 && (x + 12) % 5 === 2) return null; // Pony mit Strähnen
      return (x + y) % 5 === 0 ? hairLight : spec.hair;
    }
    if (z <= -4 || y >= 38) return (x * 3 + y) % 7 === 0 ? hairLight : n.y < -0.4 ? shade(spec.hair, -1) : spec.hair;
    if (Math.abs(n.x) > 0.6 && y >= 32) return spec.hair; // über den Ohren
    if (y === 28) return spec.skinShade;
    return roundTone(spec.skin, n, { light: 0 });
  });
  // Ohren
  for (const ex of [-13.2, 12.2]) sculpt(m, blob(ex, 33.5, -1.2, 1.3, 1.9, 1.5), -15, 31, -4, 14, 36, 1, (x, y) => (y >= 35 ? spec.skin : spec.skinShade));
  // N5 (Figur »Frau«): schulterlanges Haar über den Ohren und im Nacken, dazu ein kurzer
  // Zopf, der unter der Mütze hervorschaut – mit einem Haargummi in der Mützenfarbe
  if (spec.body === 'frau') {
    const hairDark = shade(spec.hair, -1);
    const sides = (x, y, z) => Math.min(roundBox(-13.3, 31.5, -3.5, 1.8, 5.2, 7, 1.5)(x, y, z), roundBox(12.3, 31.5, -3.5, 1.8, 5.2, 7, 1.5)(x, y, z));
    sculpt(m, sides, -16, 26, -12, 15, 37, 4, (x, y, z, n) => (n.y < -0.5 ? hairDark : (x + y * 2) % 5 === 0 ? hairLight : spec.hair));
    sculpt(m, roundBox(-0.5, 32, -11, 12.2, 5, 3.4, 2.4), -14, 26, -15, 13, 38, -7, (x, y, z, n) => (n.y < -0.5 ? hairDark : (x * 3 + y) % 7 === 0 ? hairLight : spec.hair));
    sculpt(m, capsule(-0.5, 36, -13.5, -0.5, 27, -16.5, 2.6, 1.7), -4, 24, -20, 3, 39, -11, (x, y, z, n) => ((y + 1) % 3 === 0 ? hairDark : n.x > 0.5 ? hairLight : spec.hair));
    sculpt(m, blob(-0.5, 34.5, -14.4, 2.2, 1, 2), -3, 33, -17, 2, 36, -12, spec.hat);
  }
  // Mütze: gerippter Bund, Kuppel mit hellem Streifen, Knubbel, flauschiger Bommel
  sculpt(m, roundBox(-0.5, 45.6, -2.5, 13.6, 2.1, 11.6, 2.6), -15, 44, -15, 14, 47, 10, (x, y, z, n) => {
    if (y === 47 && n.y > 0.3) return spec.hatLight;
    const rib = Math.abs(n.x) > 0.7 ? z : x;
    return (rib & 1) === 0 ? spec.hatDark : spec.hat;
  });
  // Kuppel als weiches Kissen (ein Ellipsoid zerfiel in Voxeln zu Stufen wie eine Torte)
  sculpt(m, roundBox(-0.5, 51.5, -2.5, 12.3, 4.6, 10.3, 4.2), -13, 48, -13, 12, 56, 8, (x, y, z, n) => {
    if (y === 50 && n.y < 0.5) return spec.hatLight; // ein heller Streifen rundum
    if (n.y > 0.7) return (x + z) % 2 ? shade(spec.hat, 1) : spec.hat; // gestrickte Kuppe
    return (x + y + z) % 2 ? spec.hat : shade(spec.hat, -1);
  });
  m.cylinder(-0.5, -2.5, 56, 57, 2.4, (x, y) => (y === 57 ? spec.hatDark : spec.hat));
  m.ellipsoid(-0.5, 60, -2.5, 4.2, 3.6, 4.2, (x, y, z, dx, dy) => {
    const h = hash3(x, y, z, 11);
    if (dx * dx + dy * dy > 0.7 && h < 0.3) return null; // flauschig
    return dy > 0.3 ? spec.pompom : h < 0.4 ? shade(spec.pompom, -1) : spec.pompom;
  });
  return m;
}

/** Gesichtsplatte (N1): folgt der Rundung des Kopfs (figureKit.facePlate). */
const sculptFacePlate = (spec, expr) => facePlate((x, y) => faceColor32(spec, x, y, expr));

/** Laterne im feinen Maß (M12): Boden, vier Streben, Dach mit Bügel; dazwischen das Glas. */
function buildLantern() {
  const frame = new VoxelModel();
  frame.box(-3, 0, -3, 2, 0, 2, P.s2);
  for (const [x, z] of [[-3, -3], [2, -3], [-3, 2], [2, 2]]) frame.box(x, 1, z, x, 5, z, P.s3);
  frame.box(-3, 6, -3, 2, 6, 2, P.e5);
  frame.box(-2, 7, -2, 1, 7, 1, P.e4);
  frame.box(-1, 8, -1, 0, 8, 0, P.s3);
  frame.set(-1, 9, 0, P.s4).set(0, 9, 0, P.s4); // Bügel
  const glass = new VoxelModel();
  glass.box(-3, 1, -3, 2, 5, 2, (x, y, z) => ((x === -3 || x === 2) && (z === -3 || z === 2) ? null : 0xffffff));
  return { frame, glass };
}

/** Laterne im Maß 1/32 (M13g): Boden, dünne Streben, Dach in Stufen mit Knauf und Bügel; dazwischen das Glas. */
function buildLantern32() {
  const frame = new VoxelModel();
  frame.box(-6, 0, -6, 5, 1, 5, (x, y) => (y === 1 ? P.s3 : P.s2));
  for (const [x, z] of [[-6, -6], [5, -6], [-6, 5], [5, 5]]) frame.box(x, 2, z, x, 11, z, P.s3);
  frame.box(-6, 12, -6, 5, 13, 5, (x, y) => (y === 13 ? P.e6 : P.e5));
  frame.box(-4, 14, -4, 3, 15, 3, (x, y) => (y === 15 ? P.e5 : P.e4));
  frame.box(-2, 16, -2, 1, 17, 1, P.s3);
  frame.box(-3, 18, 0, -3, 19, 0, P.s4).box(2, 18, 0, 2, 19, 0, P.s4).box(-2, 20, 0, 1, 20, 0, P.s5); // Bügel
  const glass = new VoxelModel();
  glass.box(-5, 2, -5, 4, 11, 4, 0xffffff);
  return { frame, glass };
}

/**
 * Werkzeug im Maß 1/32 (M13g): die 1/16-Fassung verdoppelt, dazu Kantenlicht,
 * Maserung am Stiel und blanke Schneiden.
 */
function fineTool32(name, coarse) {
  const m = fineTool(name, coarse).upsampled(2);
  // Maserung: auf der hellen Stielseite feine dunklere Striche
  m.forEach((x, y, z, c) => {
    if ((c === P.e6 || c === P.e4) && x === 0 && y % 6 === 0) m.set(x, y, z, shade(c, -1));
  });
  switch (name) {
    case 'axt':
      m.paint(0, -36, 12, 3, -17, 12, P.s6); // Fase vor der Schneide
      break;
    case 'schaufel':
      m.paint(0, -47, 0, 3, -36, 1, P.s7); // Mittelrippe im Blatt
      break;
    case 'rechen':
      m.remove(2, -48, -15, 3, -45, 15); // Zinken noch schlanker
      break;
    default:
      break;
  }
  return edgeLight(m);
}

// --- M30: die Waffen aus dem Waffenschrank, gleich im Maß 1/32 gebaut --------------------
// Der Griff liegt in der Hand wie die Stiele der Werkzeuge (x 0–3, z 0–3); was nach vorn
// zeigt, liegt bei −y. Beim Zielen hebt Mika den Arm: Dann zeigt −y nach vorn und +z nach
// oben – Lauf und Visier liegen deshalb bei +z über der Hand. Kolben und Knauf ragen nach +y.

/** Pistole: dunkler Schlitten mit hellem Grat, Holzgriff, Abzugsbügel. */
function buildPistol32() {
  const m = new VoxelModel();
  m.box(1, -3, 0, 2, 1, 3, (x, y, z) => (z === 0 ? P.e2 : (y + z) % 3 === 0 ? P.e4 : P.e3)); // Griff
  m.box(1, -11, 4, 2, 1, 5, (x, y, z) => (z === 5 ? P.s4 : P.s2)); // Schlitten und Lauf
  m.box(1, -11, 4, 2, -11, 5, P.n1); // Mündung
  m.set(1, 2, 5, P.s3).set(2, 2, 5, P.s3); // Hahn
  m.box(1, -5, 3, 2, -4, 3, P.s1).set(1, -6, 3, P.s1).set(2, -6, 3, P.s1); // Abzugsbügel
  m.set(1, -10, 6, P.s5); // Korn
  return m;
}

/** Signalpistole: dick, leuchtend orange, mit gelbem Band und weiter Mündung (Junas Waffe). */
function buildFlareGun32() {
  const m = new VoxelModel();
  m.box(1, -3, 0, 2, 1, 3, (x, y, z) => (z === 0 ? P.f1 : P.f2)); // Griff
  m.box(0, -10, 4, 3, 1, 6, (x, y, z) => (y === -4 ? P.f6 : z === 6 ? P.f5 : P.f3)); // Lauf mit Band
  m.box(1, -10, 5, 2, -10, 5, P.n1); // Mündung
  m.box(0, -11, 4, 3, -11, 6, (x, y, z) => ((x === 0 || x === 3) && (z === 4 || z === 6) ? null : P.f2)); // Ring
  m.set(1, 2, 6, P.s3).set(2, 2, 6, P.s3); // Hahn
  m.box(1, -5, 3, 2, -4, 3, P.s1);
  return m;
}

/** Jagdgewehr: Holzschaft mit Kolben nach hinten, langer dunkler Lauf, Zielfernrohr. */
function buildRifle32() {
  const m = new VoxelModel();
  m.box(1, -2, 0, 2, 9, 3, (x, y, z) => (y >= 6 ? (z === 0 ? P.e3 : P.e5) : y % 4 === 0 ? P.e4 : P.e5)); // Kolben und Griff
  m.box(1, 10, 0, 2, 10, 3, P.e2); // Kappe
  m.box(1, -14, 2, 2, -3, 3, (x, y) => (y % 5 === 0 ? P.e4 : P.e5)); // Vorderschaft
  m.box(1, -30, 4, 2, 2, 4, (x, y) => (y === -30 ? P.n1 : P.s3)); // Lauf
  m.box(1, -30, 5, 2, 2, 5, (x, y) => (y === -30 ? P.n1 : P.s4));
  m.box(1, -6, 6, 2, 1, 7, (x, y, z) => (z === 7 ? P.s3 : P.s1)).set(1, -7, 7, P.b4).set(2, 2, 7, P.b3); // Zielfernrohr, Linsen glänzen
  m.box(1, -4, 3, 2, -3, 3, P.s1); // Abzugsbügel
  return m;
}

/** Doppelflinte: zwei Läufe nebeneinander, kurzer Holzschaft. */
function buildShotgun32() {
  const m = new VoxelModel();
  m.box(1, -2, 0, 2, 7, 3, (x, y, z) => (y >= 4 ? (z === 0 ? P.e2 : P.e4) : P.e4)); // Kolben und Griff
  m.box(1, 8, 0, 2, 8, 3, P.e1);
  m.box(1, -10, 2, 2, -3, 3, P.e5); // Vorderschaft
  m.box(0, -24, 4, 3, 2, 5, (x, y, z) => (y === -24 ? (x === 0 || x === 3 ? P.n1 : P.s3) : z === 5 ? (x === 1 || x === 2 ? P.s2 : P.s4) : P.s3)); // zwei Läufe
  m.box(0, 0, 4, 3, 2, 6, (x, y, z) => (z === 6 ? P.s5 : P.s3)); // Verschluss
  m.box(1, -4, 3, 2, -3, 3, P.s1);
  return m;
}

/** Spaltaxt (Berts): langer Stiel, schwerer roter Keil mit blanker Schneide. */
function buildMaul32() {
  const m = new VoxelModel();
  m.box(1, -27, 1, 2, 2, 2, (x, y) => (y === 2 ? P.e3 : y % 6 === 0 ? P.e5 : P.e6)); // Stiel
  m.box(1, -3, 0, 2, 0, 3, P.e2); // Griffband
  m.box(0, -33, -2, 3, -26, 5, (x, y, z) => {
    if (z >= 5) return P.s8; // Schneide
    if (z === 4) return P.s6;
    if (z <= -1) return P.s3; // Nacken
    return (x + y) % 5 === 0 ? P.r1 : P.r2;
  });
  m.remove(0, -33, 4, 0, -33, 5).remove(3, -33, 4, 3, -33, 5).remove(0, -26, 4, 0, -26, 5).remove(3, -26, 4, 3, -26, 5); // Keil abgerundet
  return m;
}

/** Mistgabel: langer Stiel, Zwinge, vier Zinken. */
function buildPitchfork32() {
  const m = new VoxelModel();
  m.box(1, -31, 1, 2, 5, 2, (x, y) => (y % 7 === 0 ? P.e5 : P.e6)); // Stiel
  m.box(1, -33, 0, 2, -32, 3, P.s4); // Zwinge
  m.box(1, -34, -4, 2, -34, 7, P.s4); // Querstück
  for (const z of [-4, -1, 2, 5]) m.box(1, -44, z, 2, -35, z + 1, (x, y) => (y <= -43 ? P.s8 : P.s5)); // Zinken
  return m;
}

/** Baseballschläger: Knauf, umwickelter Griff, heller Schlagteil mit Kerben. */
function buildBat32() {
  const m = new VoxelModel();
  m.box(0, 1, 0, 3, 2, 3, P.e4); // Knauf
  m.box(1, -7, 1, 2, 0, 2, (x, y) => (y % 2 ? P.n2 : P.n3)); // Griffband
  m.box(1, -13, 1, 2, -8, 2, P.e7);
  m.box(0, -28, 0, 3, -14, 3, (x, y, z) => {
    if ((x === 0 || x === 3) && (z === 0 || z === 3) && (y === -28 || y === -14)) return null; // rund
    if (y === -21 && z === 3) return P.r3; // roter Streifen
    return (x + y + z) % 7 === 0 ? P.e6 : P.e7;
  });
  m.set(3, -24, 2, P.e5).set(0, -18, 1, P.e5); // Kerben
  return m;
}

/** M30: die Waffen des Schranks (Modelle im Maß 1/32 – auch für Fotos und den Schrank). */
export const ARMS_MODELS32 = {
  jagdgewehr: buildRifle32,
  doppelflinte: buildShotgun32,
  pistole: buildPistol32,
  signalpistole: buildFlareGun32,
  spaltaxt: buildMaul32,
  mistgabel: buildPitchfork32,
  schlaeger: buildBat32,
  angel: buildRod32, // M33: die Angel (kein Schrankstück – nur zum Halten)
};

/** Eine Waffe des Schranks als fertiges Modell (mit Kantenlicht). */
export function armsModel(id) {
  const make = ARMS_MODELS32[id];
  return make ? edgeLight(make()) : null;
}

/**
 * Baut eine animierbare Figur.
 * @returns {{root: THREE.Group, parts: object, lantern: object}}
 */
export function buildCharacter(spec, { seed = 3, occluder = false, fine = true, res = 32 } = {}) {
  const material = createWorldMaterial({ occluder, selfLight: 0.3 }); // nachts nie ein dunkler Klumpen (m3-r2)
  // M13g: doppelt fein (1/32 m) – Gelenke und Versätze der 1/16-Figur mal zwei
  const d32 = fine && res === 32;
  const U = d32 ? V / 4 : fine ? V / 2 : V;
  const k = d32 ? 2 : 1;
  const geo = (model) => model.toGeometry({ jitter: 0.03, seed, size: U });
  const root = new THREE.Group();
  root.name = 'Figur';

  // Teil an einem Gelenk: Mesh wird so versetzt, dass das Gelenk der Drehpunkt ist.
  const part = (model, joint, offset = [0, 0, 0]) => {
    const pivot = new THREE.Group();
    pivot.position.set(joint[0] * U, joint[1] * U, joint[2] * U);
    const mesh = new THREE.Mesh(geo(model), material);
    mesh.position.set((offset[0] - joint[0]) * U, (offset[1] - joint[1]) * U, (offset[2] - joint[2]) * U);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    return pivot;
  };

  const body = new THREE.Group(); // alles oberhalb der Hüfte
  root.add(body);
  const J = (v) => v.map((n) => n * k);
  /** Teil an einem Untergelenk (N1: Ellbogen, Knie) – Lage relativ zum Elterngelenk. */
  const sub = (parent, parentJoint, model, joint, offset) => {
    const pivot = part(model, joint, offset);
    pivot.position.set((joint[0] - parentJoint[0]) * U, (joint[1] - parentJoint[1]) * U, (joint[2] - parentJoint[2]) * U);
    parent.add(pivot);
    return pivot;
  };
  let legL;
  let legR;
  let torso;
  let head;
  let armL;
  let armR;
  let kneeL = null;
  let kneeR = null;
  let elbowL = null;
  let elbowR = null;
  if (d32) {
    // N1: geformte Glieder mit Knie und Ellbogen (Gelenke wie im Maß 1/32)
    legL = part(sculptLeg(mikaLeg(spec), 'oben'), [-4, 12, 0], [-8, 0, -4]);
    legR = part(sculptLeg(mikaLeg(spec), 'oben'), [4, 12, 0], [0, 0, -4]);
    kneeL = sub(legL, [-4, 12, 0], sculptLeg(mikaLeg(spec), 'unten'), [-4, 7, 0], [-8, 0, -4]);
    kneeR = sub(legR, [4, 12, 0], sculptLeg(mikaLeg(spec), 'unten'), [4, 7, 0], [0, 0, -4]);
    torso = part(sculptTorso(spec), [0, 12, 0]);
    head = part(sculptHead(spec), [0, 28, -4]);
    armL = part(sculptArm(mikaArm(spec), 'oben'), [-14, 28, 0], [-16, 12, -4]);
    armR = part(sculptArm(mikaArm(spec), 'oben'), [14, 28, 0], [12, 12, -4]);
    elbowL = sub(armL, [-14, 28, 0], sculptArm(mikaArm(spec), 'unten'), [-14, 20, 0], [-16, 12, -4]);
    elbowR = sub(armR, [14, 28, 0], sculptArm(mikaArm(spec), 'unten'), [14, 20, 0], [12, 12, -4]);
  } else {
    const leg = buildLeg16;
    const arm = buildArm16;
    legL = fine ? part(leg(spec), J([-2, 6, 0]), J([-4, 0, -2])) : part(buildLeg(spec), [-1, 3, 0], [-2, 0, -1]);
    legR = fine ? part(leg(spec), J([2, 6, 0]), J([0, 0, -2])) : part(buildLeg(spec), [1, 3, 0], [0, 0, -1]);
    torso = fine ? part(buildTorso16(spec), J([0, 6, 0])) : part(buildTorso(spec), [0, 3, 0]);
    head = fine ? part(buildHead16(spec), J([0, 14, -2])) : part(buildHead(spec), [0, 7, -1]);
    armL = fine ? part(arm(spec), J([-7, 14, 0]), J([-8, 6, -2])) : part(buildArm(spec), [-3.5, 7, 0], [-4, 3, -1]);
    armR = fine ? part(arm(spec), J([7, 14, 0]), J([6, 6, -2])) : part(buildArm(spec), [3.5, 7, 0], [3, 3, -1]);
  }
  root.add(legL, legR);
  body.add(torso, head, armL, armR);

  // Gesichter (M12): je Ausdruck eine Platte vorn am Kopf, sichtbar ist nur eine
  let faces = null;
  if (fine) {
    faces = {};
    for (const expr of EXPRESSIONS) {
      const plate = new THREE.Mesh(geo(d32 ? sculptFacePlate(spec, expr) : buildFacePlate16(spec, expr)), material);
      plate.position.set(0, -14 * k * U, 2 * k * U);
      plate.castShadow = true;
      plate.receiveShadow = true;
      plate.visible = expr === 'normal';
      plate.renderOrder = 2; // nach Mikas Umriss (renderOrder 1.75), sonst schimmert er über dem Gesicht
      head.add(plate);
      faces[expr] = plate;
    }
  }

  // Lider zum Blinzeln (nur fein): eine Hautreihe über den Augen und darunter
  // die Wimpernlinie – liegt eine Voxelschicht vor dem Gesicht, meist versteckt
  let eyelids = null;
  if (fine) {
    let lids = new VoxelModel();
    if (d32) lids = facLids(spec.skin, spec.eyes);
    else {
      for (const x of [-4, -3, 2, 3]) {
        lids.set(x, 18, 4, spec.skin);
        lids.set(x, 17, 4, spec.eyes);
      }
    }
    eyelids = new THREE.Mesh(geo(lids), material);
    eyelids.position.set(0, -14 * k * U, 2 * k * U);
    eyelids.visible = false;
    eyelids.renderOrder = 2;
    head.add(eyelids);
  }

  // Hände: Anker am unteren Ende der Arme (N1: am Unterarm). Rechts Werkzeuge/Waffen, links die Laterne.
  const hand = new THREE.Group();
  hand.position.set(0, (elbowR ? -2 : -4) * V, 0);
  (elbowR || armR).add(hand);
  const handL = new THREE.Group();
  handL.position.set(0, (elbowL ? -2 : -4) * V, 0);
  (elbowL || armL).add(handL);

  // Laterne (zunächst versteckt) in der linken Hand – im Maß der Figur (M13g: 1/32 m)
  const lanternParts = d32 ? buildLantern32() : buildLantern();
  const LU = d32 ? V / 4 : V / 2;
  const lanternGroup = new THREE.Group();
  const lanternFrame = new THREE.Mesh(lanternParts.frame.toGeometry({ jitter: 0, seed, size: LU }), material);
  lanternFrame.castShadow = true;
  const lanternGlow = createGlowMaterial(0xffffff);
  const lanternGlass = new THREE.Mesh(lanternParts.glass.toGeometry({ jitter: 0, ao: false, size: LU }), lanternGlow);
  lanternFrame.renderOrder = 2; // nach Mikas Umriss, sonst schimmert der Arm durch die Laterne
  lanternGlass.renderOrder = 2;
  lanternGroup.add(lanternFrame, lanternGlass);
  lanternGroup.position.set(V, -5 * V, 0.5 * V); // Mitte wie bei der groben Laterne
  lanternGroup.visible = false;
  handL.add(lanternGroup);

  // Werkzeuge in der rechten Hand (Stiel entlang des Arms nach unten)
  const tools = {};
  for (const [name, model] of Object.entries(TOOL_MODELS)) {
    const geometry = d32 ? fineTool32(name, model()).toGeometry({ jitter: 0.02, seed, size: V / 4 }) : fine ? fineTool(name, model()).toGeometry({ jitter: 0.02, seed, size: V / 2 }) : model().toGeometry({ jitter: 0.02, seed });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.renderOrder = 2; // wie die Laterne: nach Mikas Umriss
    mesh.position.set(-0.5 * V, 0, -0.5 * V);
    mesh.visible = false;
    hand.add(mesh);
    tools[name] = mesh;
  }

  // M30: die Waffen aus dem Waffenschrank (nur in der feinen Figur)
  if (d32) {
    for (const name of Object.keys(ARMS_MODELS32)) {
      const mesh = new THREE.Mesh(armsModel(name).toGeometry({ jitter: 0.02, seed, size: V / 4 }), material);
      mesh.castShadow = true;
      mesh.renderOrder = 2;
      mesh.position.set(-0.5 * V, 0, -0.5 * V);
      mesh.visible = false;
      hand.add(mesh);
      tools[name] = mesh;
    }
  }

  // N4 (Probespiel): Werkzeug bzw. Waffe steckt auf dem Rücken, schräg, der Kopf ragt über
  // die rechte Schulter. Gezogen wird erst beim Benutzen (player.js). Dieselbe Geometrie
  // wie in der Hand, um die Mitte gedreht.
  const backTools = {};
  const backMount = new THREE.Group();
  backMount.position.set(0, (d32 ? 10 : 5 * k) * U, (d32 ? -10.5 : -5 * k) * U);
  backMount.rotation.set(0, Math.PI, Math.PI - 0.62);
  torso.add(backMount);
  for (const [name, mesh] of Object.entries(tools)) {
    const g = mesh.geometry;
    g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    const b = new THREE.Mesh(g, material);
    b.castShadow = true;
    b.userData.gear = true; // setLook tauscht nur die Körperteile
    b.position.set(-c.x, -c.y, -c.z);
    b.visible = false;
    backMount.add(b);
    backTools[name] = b;
  }

  // M33: Die Spitze der Angel (für die Schnur, die die Oberfläche zeichnet)
  let rodTip = null;
  if (tools.angel) {
    rodTip = new THREE.Object3D();
    rodTip.position.set(1.5 * U, (-ROD_TIP + 0.5) * U, 1.5 * U);
    tools.angel.add(rodTip);
  }

  return {
    root,
    material,
    parts: { body, torso, head, armL, armR, legL, legR, elbowL, elbowR, kneeL, kneeR, hand, handL, eyelids, faces },
    lantern: { group: lanternGroup, glow: lanternGlow, lightAnchor: lanternGlass },
    tools,
    backTools,
    rodTip,
  };
}

/** Axt: heller Stiel nach unten (−y), breites, blankes Blatt mit roter Bindung. */
function buildAxeModel() {
  const m = new VoxelModel();
  m.box(0, -7, 0, 0, 0, 0, (x, y) => (y === 0 ? P.e3 : P.e6));
  m.box(0, -9, 1, 0, -5, 2, P.s7);
  m.set(0, -9, 3, P.s9).set(0, -8, 3, P.s9).set(0, -7, 3, P.s9).set(0, -6, 3, P.s9).set(0, -5, 3, P.s9);
  m.set(0, -7, -1, P.r3);
  return m;
}

/** Spitzhacke: dunkler Stiel, quer liegender dunkler Kopf mit hellen Spitzen. */
function buildPickaxeModel() {
  const m = new VoxelModel();
  m.box(0, -7, 0, 0, 0, 0, (x, y) => (y === 0 ? P.e2 : P.e4));
  m.box(0, -8, -3, 0, -8, 3, P.s3);
  m.set(0, -7, -4, P.s8).set(0, -7, 4, P.s8).set(0, -8, -4, P.s6).set(0, -8, 4, P.s6);
  return m;
}

/** Schaufel: langer heller Stiel mit Griff, graues Blatt unten. */
function buildShovelModel() {
  const m = new VoxelModel();
  m.box(0, -8, 0, 0, 0, 0, (x, y) => (y === 0 ? P.e3 : P.e6));
  m.box(0, 1, -1, 0, 1, 1, P.e3);
  m.box(0, -12, -1, 0, -9, 1, (x, y, z) => (y === -12 ? P.s8 : z === 0 ? P.s6 : P.s5));
  return m;
}

/** Bratpfanne: kurzer dunkler Griff, schwere schwarze Pfanne mit hellem Rand. */
function buildPanModel() {
  const m = new VoxelModel();
  m.box(0, -4, 0, 0, 0, 0, P.e2);
  m.box(0, -9, -2, 0, -5, 2, (x, y, z) => (Math.abs(z) === 2 || y === -9 || y === -5 ? P.s4 : P.s2));
  return m;
}

/** Rechen: langer Stiel, Querholz mit Zinken. */
function buildRakeModel() {
  const m = new VoxelModel();
  m.box(0, -10, 0, 0, 0, 0, (x, y) => (y === 0 ? P.e3 : P.e6));
  m.box(0, -11, -3, 0, -11, 3, P.e4);
  for (let z = -3; z <= 3; z += 2) m.set(0, -12, z, P.s6);
  return m;
}

/** Fäustlinge: dicker roter Strickhandschuh mit weißem Bündchen. */
function buildMittenModel() {
  const m = new VoxelModel();
  m.box(-1, -2, -1, 1, 0, 1, (x, y, z) => (y === 0 ? P.s9 : (x + y + z) % 2 ? P.f2 : P.f3));
  m.set(0, -1, 2, P.f2);
  return m;
}

/**
 * Werkzeug in 1/16 m: das grobe Modell verdoppelt, dazu blanke Schneiden,
 * Griffwicklungen und Muster (Meilenstein 5).
 */
function fineTool(name, coarse) {
  const m = coarse.upsampled(2);
  switch (name) {
    case 'axt':
      m.box(0, -18, 7, 1, -9, 7, P.s9); // Schneide blitzt
      m.box(0, -15, -1, 1, -14, 1, P.r3); // Wicklung am Stiel
      break;
    case 'spitzhacke':
      m.set(0, -15, -9, P.s9).set(1, -15, 9, P.s9).set(0, -14, -8, P.s8).set(1, -14, 8, P.s8);
      break;
    case 'schaufel':
      m.box(0, -24, -3, 1, -24, 3, P.s9); // blanke Kante
      m.box(0, -2, -1, 1, -1, 1, P.e2); // Griffband
      break;
    case 'pfanne':
      // Glänzender Rand oben, dunkler Boden
      m.paint(0, -17, -3, 1, -11, 3, P.s1);
      m.set(0, -10, -4, P.s8).set(1, -10, 3, P.s8);
      break;
    case 'rechen':
      // Zinken schlanker: jede zweite Reihe weg
      m.remove(1, -24, -7, 1, -23, 7);
      break;
    case 'faeustlinge':
      // Strickmuster: Zopf in Rot und Weiß
      m.paint(-2, -5, -2, 3, -2, 3, (x, y, z) => ((x + y) % 3 === 0 ? P.f2 : (x + z) % 2 ? P.f3 : P.f2));
      m.paint(-2, -1, -2, 3, 1, 3, (x, y) => (y % 2 ? P.s9 : P.s8));
      break;
    default:
      break;
  }
  return m;
}

const TOOL_MODELS = {
  axt: buildAxeModel,
  spitzhacke: buildPickaxeModel,
  schaufel: buildShovelModel,
  pfanne: buildPanModel,
  rechen: buildRakeModel,
  faeustlinge: buildMittenModel,
};

/** Oberkörper und Kopf als ein Voxel-Modell für Porträts – im feinen Maß (m12-r1: das grobe hatte kein Gesicht). */
export function buildFineBustModel(spec, expr = 'normal') {
  const m = new VoxelModel();
  m.merge(buildTorso16(spec));
  m.merge(buildHead16(spec));
  m.merge(buildFacePlate16(spec, expr));
  return m;
}
