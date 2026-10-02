// Gerüst der Menschen als Sprites (F4): Maße eines aufrechten Körpers, die Posen je Zustand, die
// Laterne in der linken Hand, Gesichter in acht Richtungen und der Körper eines Vierbeiners
// (Knopf). Der Körper selbst kommt aus spriteFigure.humanoid (dieselben runden Formen wie bei der
// Horde) – nur aufrecht, mit großem Kopf wie die Voxel-Figuren (N1) und wachen Gliedern.
// Gebacken wird in peopleSprites.js, die Figuren selbst stehen in peopleKinds.js.
//
// Figurkoordinaten wie in spriteFigure.js: x rechts, y oben, z vorn, Fußpunkt im Ursprung, Meter.

import { RAMPS } from '../render/palette.js';
import { BODY, add, sub, mul, norm, lerp, hash } from './spriteFigure.js';
import { roundFace } from './peopleRelief.js';

// --- Farben ------------------------------------------------------------------------------------

/**
 * F5: Eigene Rampen für Farben, deren Palettenrampe für Stoff und Haar nicht taugt: Die Akzente
 * liegen dort nebeneinander (Rosa, Violett, Weiß, Türkis – dunkler als Violett wäre Rosa), Blond
 * liegt in der Feuerrampe (darunter Orange und Rot). Sie gehen den Rampen der Palette vor.
 */
const OWN_RAMPS = [
  [RAMPS.d[1], RAMPS.d[2], RAMPS.d[4], RAMPS.a[0], RAMPS.a[1]], // Rosa
  [RAMPS.d[0], RAMPS.d[1], RAMPS.d[2], RAMPS.a[2], RAMPS.a[3]], // Violett
  [RAMPS.s[5], RAMPS.s[6], RAMPS.s[8], RAMPS.a[4]], // Weiß
  [RAMPS.t[0], RAMPS.t[1], RAMPS.t[2], RAMPS.a[5], RAMPS.a[6]], // Türkis
  [RAMPS.e[5], RAMPS.e[7], RAMPS.f[6], RAMPS.f[7], RAMPS.f[8]], // Blond (Honig statt Feuer)
];
const ALL_RAMPS = [...OWN_RAMPS, ...Object.values(RAMPS)];

/**
 * F6f: die nächst dunklere Farbe in der Rampe einer Palettenfarbe (die dunkelste bleibt) – nachts
 * dunkeln die Menschen im Spiel so ab, statt dass ein blasser Ton (die hellste Haut) zu Grau wird.
 * Die Akzente (`RAMPS.a`) sind keine Rampe; ihre Farben stehen in den eigenen Rampen.
 */
export function darkerColor(color) {
  for (const ramp of ALL_RAMPS) {
    if (ramp === RAMPS.a) continue;
    const i = ramp.indexOf(color);
    if (i >= 0) return ramp[Math.max(0, i - 1)];
  }
  return color;
}

/**
 * Eine Rampe um eine Palettenfarbe: `below` Stufen dunkler, `above` heller, soweit ihre Rampe
 * reicht. Gibt { ramp, base } – base ist die Stelle der Farbe selbst (für das Aussehen aus
 * data/looks.js, dessen Farben einzelne Palettenwerte sind).
 */
export function rampAround(color, below = 2, above = 2) {
  for (const ramp of ALL_RAMPS) {
    const i = ramp.indexOf(color);
    if (i < 0) continue;
    const lo = Math.max(0, i - below);
    const hi = Math.min(ramp.length - 1, i + above);
    return { ramp: ramp.slice(lo, hi + 1), base: i - lo };
  }
  return { ramp: [color], base: 0 };
}

/** Eine Stufe dunkler bzw. heller in der eigenen Rampe (am Rand bleibt die Farbe). */
export function toneOf(color, step) {
  for (const ramp of ALL_RAMPS) {
    const i = ramp.indexOf(color);
    if (i >= 0) return ramp[Math.max(0, Math.min(ramp.length - 1, i + step))];
  }
  return color;
}

// --- Frontaler gezeichnet (F5) ---------------------------------------------------------------------

/**
 * Menschen werden frontaler gebacken, als die Kamera die Welt sieht (recherche/menschen-gestaltung.md):
 * die ganze Figur um `body` nach hinten gekippt (um die x-Achse der Welt durch den Fußpunkt, mit ihr
 * die Werkzeuge um den Griff), der Kopf um `HUMAN.headView` dazu. So steht das Gesicht fast frontal
 * im Bild, der Scheitel zeigt nur noch seinen Umriss – wie in Stardew Valley oder Zelda.
 */
export const VIEW_TILT = 0.2;

// --- Der Körper ----------------------------------------------------------------------------------

/**
 * Maße eines Menschen (Größe 1, Meter): aufrecht (kaum gebeugt), der Kopf groß und rund wie bei
 * den Voxel-Figuren, kurze kräftige Beine, die Arme hängen locker etwas vom Körper weg. Der
 * Scheitel liegt bei gut 1,3 m, mit Mütze darüber.
 */
export const HUMAN = {
  ...BODY,
  headView: 0.25, // F5: der Kopf zum Backen zusätzlich zur Kamera gedreht (spriteFigure.humanoid)
  gap: 0.112,
  thigh: 0.17,
  shin: 0.16,
  ankle: 0.055,
  legR: [0.098, 0.086, 0.078],
  shoe: [0.092, 0.066, 0.15],
  footZ: 0.05,
  stoop: 0.03,
  torso: [
    { d: 0.04, rr: [0.225, 0.12, 0.18], mat: 'hose', blend: 0.05 },
    { d: 0.19, rr: [0.245, 0.17, 0.195], mat: 'jacke' },
    { d: 0.33, rr: [0.255, 0.135, 0.185], mat: 'jacke', part: 'brust' },
  ],
  shoulderD: 0.37,
  shoulderW: 0.25,
  upper: 0.19,
  fore: 0.17,
  armR: [0.074, 0.066, 0.062, 0.057],
  hand: [0.06, 0.066, 0.056],
  thumb: { at: 0.034, len: 0.034, r: 0.02 }, // F6c: Daumen (Abstand vor der Handmitte, Länge, Radius)
  limp: 0,
  cuff: null,
  neckD: 0.41,
  neckR: 0.08,
  headOffset: [0, 0.235, 0.0],
  head: { h: [0.29, 0.235, 0.26], r: 0.17, taper: 0.22, bump: roundFace }, // F6c: gewölbt im Licht
  headPitch: 0,
  headRoll: 0,
  mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'jacke', fore: 'jacke', hand: 'haut', neck: 'haut', head: 'haut' },
};

/** Ein Kind (N7): kürzere Beine und Arme, der Kopf fast so groß wie bei den Großen. */
export const CHILD = {
  ...HUMAN,
  gap: 0.09,
  thigh: 0.11,
  shin: 0.1,
  ankle: 0.045,
  legR: [0.08, 0.072, 0.066],
  shoe: [0.074, 0.056, 0.115],
  torso: [
    { d: 0.03, rr: [0.18, 0.1, 0.14], mat: 'hose', blend: 0.04 },
    { d: 0.14, rr: [0.2, 0.13, 0.15], mat: 'jacke' },
    { d: 0.25, rr: [0.21, 0.105, 0.145], mat: 'jacke', part: 'brust' },
  ],
  shoulderD: 0.28,
  shoulderW: 0.21,
  upper: 0.14,
  fore: 0.13,
  armR: [0.06, 0.054, 0.05, 0.047],
  hand: [0.047, 0.052, 0.045],
  thumb: { at: 0.027, len: 0.026, r: 0.016 },
  neckD: 0.31,
  neckR: 0.065,
  headOffset: [0, 0.2, 0.0],
  head: { h: [0.25, 0.205, 0.225], r: 0.15, bump: roundFace },
};

// --- Posen ---------------------------------------------------------------------------------------

/**
 * Zustände der Menschen und ihre Bilder je Richtung. Die Arten wählen, was sie brauchen
 * (peopleKinds.js `anims`); die Laterne ist eine eigene Fassung derselben Zustände.
 * - stehen: atmen; gehen, rennen: ein Schritt je Bein
 * - schwung: ausholen, Hieb, Treffer, ausschwingen (das Werkzeug liegt als eigenes Bild darüber)
 * - treffer: zusammenzucken; rolle: Hechtsprung; suchen: kramen; wurf: ausholen, werfen
 * - jubel: Arme hoch; blitz: die Laterne hoch über den Kopf; winken; sitzen
 * - Balduins Gesten: muetze, reiben, daumen, schulter, bart
 */
export const PERSON_ANIMS = {
  stehen: 2,
  gehen: 6,
  rennen: 6,
  schwung: 4,
  treffer: 1,
  rolle: 3,
  suchen: 2,
  wurf: 2,
  jubel: 2,
  blitz: 2,
  winken: 2,
  sitzen: 2,
  rudern: 4,
  // F7: was vorher die Voxel-Figur zeigte
  karten: 2,
  angeln: 4,
  schiessen: 2,
  anschlag: 2,
  pfiff: 1,
  wirbel: 1,
  drachen: 2,
  tick: 2,
  gucken: 2,
  // F7e: die letzten Voxel – auf der Reifenschaukel (Neigung in sieben Stufen) und am Boden liegen
  schaukeln: 7,
  liegen: 1,
  muetze: 1,
  reiben: 2,
  daumen: 1,
  schulter: 1,
  bart: 1,
};

/** Grundpose: aufrecht, die Arme hängen locker, die Ellbogen ein wenig gebeugt. */
function basePose() {
  return { legL: 0, legR: 0, kneeL: 0.05, kneeR: 0.05, armL: 0.06, armR: 0.06, elbow: 0.16, bob: 0, lean: 0, head: 0, nod: 0, sink: 0, spread: 0.09, roll: 0, extra: 0 };
}

/**
 * F7e: So weit neigt sich die Schaukel (game.js `SWING.amp`) – die Bilder von »schaukeln« decken
 * −SWING_TILT … +SWING_TILT in gleichen Stufen ab.
 */
export const SWING_TILT = 0.42;

/** F7: Beine im Sitzen (wie »sitzen«): die Oberschenkel nach vorn, die Füße hängen. */
const SIT_LEGS = { legL: 1.5, legR: 1.42, kneeL: 1.42, kneeR: 1.32 };

/** Linker Arm mit der Laterne (N1 der Voxel-Figur): Oberarm leicht vor, Unterarm waagerecht. */
const LANTERN_ARM = { armL: 0.55, elbowL: 0.95, spreadL: 0.02 };

/**
 * Pose je Zustand und Bild. `k` Bild im Zustand, `n` Bilder im Zustand; `lantern` hält links die
 * Laterne (wo der Zustand den linken Arm nicht selbst braucht).
 */
export function posePerson(anim, k, n, { lantern = false, gait = 'gehen', tell = null } = {}) {
  const p = basePose();
  const ph = (n > 1 ? k / n : 0) * Math.PI * 2;
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  if (anim === 'gehen' && gait === 'kind') {
    // Kinder hüpfen fast: kurze, schnelle Schritte, die Arme schwingen weit
    Object.assign(p, { legL: 0.5 * s, legR: -0.5 * s, kneeL: 0.1 + 0.7 * Math.max(0, -Math.sin(ph + 0.5)), kneeR: 0.1 + 0.7 * Math.max(0, Math.sin(ph + 0.5)), armL: -0.6 * s, armR: 0.6 * s, elbow: 0.35, bob: 0.03 * Math.abs(c) - 0.01, head: 0.05 * s });
  } else if (anim === 'gehen') {
    // Aufrecht, das Knie hebt das Bein, das gerade nach vorn schwingt; die Arme gegengleich
    Object.assign(p, {
      legL: 0.44 * s,
      legR: -0.44 * s,
      kneeL: 0.07 + 0.62 * Math.max(0, -Math.sin(ph + 0.55)),
      kneeR: 0.07 + 0.62 * Math.max(0, Math.sin(ph + 0.55)),
      armL: -0.5 * s + 0.04,
      armR: 0.5 * s + 0.04,
      elbowL: 0.18 + 0.3 * Math.max(0, -s),
      elbowR: 0.18 + 0.3 * Math.max(0, s),
      spread: 0.1,
      // F6d: Federn – oben beim Durchschwingen, unten nach dem Aufsetzen –, das Gewicht wandert
      // über das Standbein, der Kopf hält dagegen
      bob: 0.034 * Math.abs(c) - 0.017,
      roll: 0.035 * s,
      nod: 0.03 * Math.abs(c),
      head: 0.035 * s - 0.03 * s,
    });
  } else if (anim === 'rennen') {
    // Vorgebeugt, Knie hoch, die Arme angewinkelt im Takt
    Object.assign(p, {
      legL: 0.78 * s,
      legR: -0.78 * s,
      kneeL: 0.3 + 1.05 * Math.max(0, -Math.sin(ph + 0.6)),
      kneeR: 0.3 + 1.05 * Math.max(0, Math.sin(ph + 0.6)),
      armL: 0.3 - 0.75 * s,
      armR: 0.3 + 0.75 * s,
      elbow: 1.35,
      spread: 0.12,
      lean: 0.2,
      bob: 0.045 * Math.abs(c) - 0.02,
      nod: -0.08,
      head: 0.04 * s,
    });
  } else if (anim === 'stehen') {
    // Atmen: die Brust hebt sich kaum, die Arme rücken ein wenig vom Körper
    // F6c: die Arme etwas weiter vom Körper – an der Taille bleibt Luft, die Figur liest sich
    Object.assign(p, { bob: -0.006 * k, spread: 0.2 + 0.02 * k, armL: 0.06 + 0.02 * k, armR: 0.06 - 0.01 * k, nod: 0.02 * k });
  } else if (anim === 'schwung') {
    // Rechts mit dem Werkzeug: hoch über die Schulter, herab, Treffer, ausschwingen; der linke Arm
    // hält das Gleichgewicht, das linke Bein steht vorn
    const arm = [2.65, 1.55, 0.55, 0.32][k];
    const elbow = [0.62, 0.15, 0.04, 0.2][k];
    const lean = [-0.1, 0.08, 0.17, 0.07][k];
    Object.assign(p, {
      legL: 0.22,
      legR: -0.14,
      kneeL: 0.24 + 0.06 * k,
      kneeR: 0.12,
      armR: arm,
      elbowR: elbow,
      spreadR: k === 0 ? 0.12 : 0.04,
      armL: [0.7, 0.35, 0.1, 0.2][k],
      elbowL: 0.55,
      spreadL: 0.16,
      lean,
      nod: [-0.12, 0.05, 0.14, 0.08][k],
      bob: [-0.01, -0.02, -0.035, -0.02][k],
      extra: k,
    });
  } else if (anim === 'treffer') {
    Object.assign(p, { lean: -0.26, nod: -0.22, head: 0.12, armL: -0.32, armR: -0.28, spread: 0.32, elbow: 0.55, kneeL: 0.14, kneeR: 0.1 });
  } else if (anim === 'rolle') {
    // Hechtsprung: tief nach vorn, die Beine angezogen, die Arme voraus
    const q = [0.55, 1, 0.45][k];
    Object.assign(p, {
      lean: 1.1 * q,
      legL: 1.1 * q,
      legR: 0.8 * q,
      kneeL: 1.6 * q,
      kneeR: 1.4 * q,
      armL: 0.6 + 0.9 * q,
      armR: 0.6 + 0.9 * q,
      elbow: 0.3,
      spread: 0.14,
      nod: 0.35 * q,
      bob: -0.13 * q,
    });
  } else if (anim === 'suchen') {
    // Vornübergebeugt, beide Hände kramen
    const w = k ? 1 : -1;
    Object.assign(p, { lean: 0.38, nod: 0.25, kneeL: 0.32, kneeR: 0.28, legL: 0.12, legR: 0.08, armL: 0.95 - 0.3 * w, armR: 0.95 + 0.3 * w, elbowL: 0.55 + 0.3 * w, elbowR: 0.55 - 0.3 * w, spread: 0.02, bob: -0.04 });
  } else if (anim === 'wurf') {
    Object.assign(p, k === 0 ? { armR: 3.0, elbowR: 1.1, spreadR: 0.15, lean: -0.12, legL: 0.22, legR: -0.12, armL: 0.6, elbowL: 0.4 } : { armR: 0.95, elbowR: 0.12, lean: 0.17, legL: 0.25, legR: -0.18, kneeL: 0.25, armL: 0.0, elbowL: 0.3, nod: 0.1 });
  } else if (anim === 'jubel') {
    const w = k ? -1 : 1;
    Object.assign(p, { armR: 2.85 + 0.12 * w, armL: 2.85 - 0.12 * w, spread: 0.36, elbow: 0.1, bob: k ? 0.0 : 0.065, nod: -0.12, kneeL: k ? 0.2 : 0.05, kneeR: k ? 0.2 : 0.05 });
  } else if (anim === 'blitz') {
    // Die Laterne hoch über den Kopf (beim zweiten Bild ganz oben) – der Blick folgt ihr
    Object.assign(p, { armL: k ? 2.95 : 1.9, elbowL: k ? 0.05 : 0.5, spreadL: 0.1, nod: -0.16 - 0.06 * k, lean: -0.05 });
  } else if (anim === 'winken') {
    Object.assign(p, { armR: 2.6, elbowR: 0.25, spreadR: k ? 0.55 : -0.05, nod: -0.04, head: k ? 0.06 : -0.03 });
  } else if (anim === 'sitzen') {
    // Auf einer Bank oder am Tisch: die Oberschenkel nach vorn, die Füße hängen, die Hände auf den Knien
    Object.assign(p, { legL: 1.5, legR: 1.42, kneeL: 1.42, kneeR: 1.32, armL: 0.95, armR: 0.95, elbow: 0.32, spread: 0.06, bob: -0.004 * k, nod: 0.03 * k });
  } else if (anim === 'rudern') {
    // N12: im Boot rudern (wie die Voxel-Figur in player.js): sitzen, beide Hände an den Griffen,
    // ein Zug je Umlauf – vorgebeugt ausgreifen, zurückgelehnt durchziehen
    const q = Math.sin((k / n) * Math.PI * 2);
    Object.assign(p, { legL: 1.42, legR: 1.36, kneeL: 1.25, kneeR: 1.2, armL: 1.2 - 0.45 * q, armR: 1.2 - 0.45 * q, elbow: 0.65 + 0.35 * q, spread: 0.22, lean: 0.08 - 0.12 * q, nod: 0.04 - 0.05 * q });
  } else if (anim === 'karten') {
    // F7: am Kartentisch – sitzen, beide Hände mit dem Fächer vor der Brust (Ziele um die Kopfmitte,
    // `reachL`/`reachR`), der Blick in die Karten
    // (über der Tischkante: die Platte liegt eine Handbreit höher als der Schoß)
    Object.assign(p, SIT_LEGS, { reachL: [-0.07, -0.3, 0.25], reachR: [0.07, -0.3 + 0.012 * k, 0.25], nod: 0.1, bob: -0.003 * k });
  } else if (anim === 'tick') {
    // F7: der eigene Tick am Kartentisch (`tell`, Menschenkunde): sitzen, links die Karten, rechts die
    // Geste wie bei der Voxel-Figur (npcs.poseGesture) – so verrät sich das Gegenüber auch in 2D
    const w = k ? 1 : -1;
    Object.assign(p, SIT_LEGS, { reachL: [-0.09, -0.3, 0.25], reachR: [0.07, -0.3, 0.25], nod: 0.08 });
    if (tell === 'reiben') Object.assign(p, { reachL: [-0.035 + 0.03 * w, -0.34, 0.22], reachR: [0.035 + 0.03 * w, -0.35 + 0.015 * w, 0.22], nod: 0.06 });
    else if (tell === 'kichern') Object.assign(p, { reachR: [0.04, -0.12, 0.29], head: 0.12, nod: 0.04, bob: k ? 0.014 : 0 });
    else if (tell === 'muetze') Object.assign(p, { reachR: [0.09, 0.15 + 0.04 * k, 0.27 - 0.02 * k], nod: 0.06 + 0.1 * k });
    else if (tell === 'summen') Object.assign(p, { reachR: [0.07, -0.3, 0.25], head: 0.17 * w, nod: 0.04 });
    else if (tell === 'brille') Object.assign(p, { reachR: [0.1, 0.02, 0.28], nod: 0.14 });
    else if (tell === 'pfeife') Object.assign(p, { reachR: [0.16, -0.15 - 0.02 * k, 0.36], nod: -0.04 - 0.06 * k });
  } else if (anim === 'schaukeln') {
    // F7e: auf dem Reifen stehen, beide Hände oben an den Seilen; das ganze Bild neigt sich mit der
    // Schaukel (`rollZ` um den Fußpunkt, wie die Voxel-Figur um ihren Ursprung)
    Object.assign(p, { kneeL: 0.04, kneeR: 0.04, armL: 2.8, armR: 2.8, elbowL: 0.12, elbowR: 0.12, spreadL: -0.16, spreadR: -0.16, nod: -0.08, rollZ: -SWING_TILT + (2 * SWING_TILT * k) / Math.max(1, n - 1) });
  } else if (anim === 'liegen') {
    // F7e: nach der Lagerglocke am Boden – auf dem Rücken, der Kopf nach Norden (`lie`: wie die
    // Voxel-Figur um die x-Achse gekippt und ein wenig angehoben), die Arme seitlich
    Object.assign(p, { armL: 0.35, armR: 0.3, spreadL: 0.4, spreadR: 0.45, elbowL: 0.25, elbowR: 0.3, legL: 0.12, legR: -0.06, kneeL: 0.2, kneeR: 0.1, nod: 0.1, lie: true });
  } else if (anim === 'gucken') {
    // F7: dem Drachen nachschauen – der Kopf im Nacken, die Arme locker
    Object.assign(p, { nod: -0.34, lean: -0.05, spread: 0.18, armL: 0.08, armR: 0.1 - 0.04 * k, bob: -0.005 * k });
  } else if (anim === 'angeln') {
    // F7: an der Stegkante – die Beine hängen über den Rand (`ledge`: die Hüfte liegt auf dem
    // Fußpunkt, die Beine in der Erde des Bäckers), rechts neben dem Bauch die Rute (eigenes Bild,
    // `toolPhi` ist ihre Richtung: 0 hängt, π/2 vorn, π oben), links die Hand an der Kurbel. Bilder:
    // warten, ausholen (über die Schulter), Wurf (nach vorn), Drill (steil, zurückgelehnt)
    const legs = { legL: 1.45, legR: 1.38, kneeL: 1.55, kneeR: 1.45, ledge: true };
    // Die Rute steht schräg zur rechten Seite (`toolTurn`), sonst verschwände sie von hinten hinter dem Kopf
    const arm = [
      { reachR: [0.24, -0.5, 0.2], reachL: [0.12, -0.53, 0.29], toolPhi: 2.2, lean: 0.02 },
      { reachR: [0.26, 0.04, 0.0], reachL: [0.1, -0.42, 0.24], toolPhi: 2.95, lean: -0.08, nod: -0.06 },
      { reachR: [0.22, -0.3, 0.36], reachL: [0.06, -0.44, 0.3], toolPhi: 1.85, lean: 0.1, nod: 0.06 },
      { reachR: [0.24, -0.4, 0.24], reachL: [0.12, -0.47, 0.32], toolPhi: 2.65, lean: -0.1, nod: -0.04 },
    ][k];
    Object.assign(p, legs, arm, { toolTurn: 1 });
  } else if (anim === 'schiessen') {
    // F7: Pistole – der rechte Arm gestreckt nach vorn, beim Schuss ruckt er hoch (Rückstoß)
    Object.assign(p, { armR: 1.52 + 0.22 * k, elbowR: 0.02, spreadR: -0.06, armL: 0.2, elbowL: 0.3, toolPhi: Math.PI / 2 + 0.3 * k, lean: -0.04 * k, nod: 0.02 - 0.05 * k, legL: 0.12, legR: -0.08 });
  } else if (anim === 'anschlag') {
    // F7: lange Waffe – rechts am Griff vor der Schulter, links stützt die Hand den Vorderschaft
    Object.assign(p, { armR: 1.18 + 0.12 * k, elbowR: 0.4, spreadR: -0.16, armL: 1.42 + 0.1 * k, elbowL: 0.12, spreadL: -0.36, toolPhi: Math.PI / 2 + 0.22 * k, lean: 0.04 - 0.08 * k, nod: 0.06, legL: 0.2, legR: -0.12, kneeL: 0.12 });
  } else if (anim === 'pfiff') {
    // F7: zwei Finger an den Mund, der Kopf ein wenig zurück
    Object.assign(p, { reachR: [0.04, -0.11, 0.29], nod: -0.16 });
  } else if (anim === 'wirbel') {
    // F7: Wirbel – der Arm mit der Waffe weit hinaus, leicht vorgebeugt (die Figur dreht sich im Spiel)
    Object.assign(p, { armR: 1.4, elbowR: 0.02, spreadR: 0.75, armL: 0.5, spreadL: 0.3, toolPhi: Math.PI / 2, toolTurn: 1, lean: 0.12, kneeL: 0.18, kneeR: 0.18 });
  } else if (anim === 'drachen') {
    // F7: Pims Drachen – beide Hände an der Spule vor der Brust, der Blick geht hinauf; beim Zupfen
    // ruckt die Spule zur Brust
    Object.assign(p, { reachL: [-0.08, -0.33 + 0.03 * k, 0.3 - 0.06 * k], reachR: [0.08, -0.33 + 0.03 * k, 0.3 - 0.06 * k], toolPhi: Math.PI / 2, nod: -0.3, lean: -0.04 - 0.08 * k, legL: 0.1, legR: -0.06 });
  } else if (anim === 'muetze') {
    Object.assign(p, { armR: 2.85, elbowR: 0.45, spreadR: -0.42, nod: 0.12 });
  } else if (anim === 'reiben') {
    const w = k ? 1 : -1;
    Object.assign(p, { armL: 1.05, armR: 1.05, elbowL: 0.95, elbowR: 0.95, spreadL: -0.36 + 0.06 * w, spreadR: -0.36 - 0.06 * w, nod: 0.06 });
  } else if (anim === 'daumen') {
    Object.assign(p, { armR: 1.75, elbowR: 0.2, spreadR: -0.08, nod: -0.05 });
  } else if (anim === 'schulter') {
    Object.assign(p, { armL: 0.3, armR: 0.3, elbow: 1.15, spread: 0.42, head: 0.17, bob: 0.01 });
  } else if (anim === 'bart') {
    Object.assign(p, { armR: 2.1, elbowR: 1.25, spreadR: -0.55, nod: -0.1, head: 0.05 });
  }
  // Mit der Laterne: der linke Arm hält sie vor der Brust (nicht beim Blitz, der hebt sie selbst)
  if (lantern && anim !== 'blitz' && anim !== 'jubel' && anim !== 'winken' && anim !== 'drachen') {
    Object.assign(p, LANTERN_ARM);
    if (anim === 'gehen' || anim === 'rennen') p.armL += 0.06 * s;
  }
  p.lantern = lantern || anim === 'blitz';
  return p;
}

// --- Die Laterne ------------------------------------------------------------------------------

/**
 * Die Laterne hängt am Bügel unter der linken Hand, immer senkrecht: Boden, vier Streben, das
 * glühende Glas, Dach und Bügel (wie die Voxel-Laterne, M12). Stoffe: rahmen, dach, glas.
 */
export function lanternShapes(ctx, hand) {
  const top = add(hand, [0, -0.05, 0.015]);
  const c = add(top, [0, -0.13, 0]);
  // Bügel: ein flacher Bogen aus zwei Stücken
  ctx.capsule(add(top, [-0.04, -0.03, 0]), add(top, [0, 0.012, 0]), 0.011, null, 'rahmen');
  ctx.capsule(add(top, [0, 0.012, 0]), add(top, [0.04, -0.03, 0]), 0.011, null, 'rahmen');
  // Dach: Kegelstumpf mit Knauf
  ctx.capsule(add(c, [0, 0.085, 0]), add(c, [0, 0.11, 0]), 0.066, 0.03, 'dach');
  // Glas mit vier Streben an den Kanten (aus dem eigenen Rahmen des Quaders)
  const struts = (l) => (Math.abs(Math.abs(l[0]) - Math.abs(l[2])) < 0.014 && Math.abs(l[0]) > 0.035 ? 'rahmen' : null);
  ctx.box(c, [0.058, 0.075, 0.058], 0.016, 'glas', { matAt: struts, part: 'laterne' });
  // Boden
  ctx.box(add(c, [0, -0.085, 0]), [0.066, 0.016, 0.066], 0.01, 'rahmen');
  ctx.mark('laterne', c);
  return c;
}

/** Stoffe der Laterne (die Arten übernehmen sie in ihre Stoffe). */
export const LANTERN_MATERIALS = {
  rahmen: { ramp: [RAMPS.s[0], RAMPS.s[1], RAMPS.s[2], RAMPS.s[3], RAMPS.s[5]], base: 2, shine: true },
  dach: { ramp: [RAMPS.e[2], RAMPS.e[3], RAMPS.e[4], RAMPS.e[5], RAMPS.e[6]], base: 2, seam: true },
  glas: { ramp: [RAMPS.f[5], RAMPS.f[6], RAMPS.f[7], RAMPS.f[8]], base: 1, glow: true, flat: true, pattern: (p) => (p[1] % 0.05 < 0.025 ? 1 : 0) },
};

// --- Gesichter -----------------------------------------------------------------------------------

/** Welcher Blick in welcher Richtung (0 S … 7 SW): S, SO, O gezeichnet, W und SW gespiegelt. */
const FACE_VIEW = ['S', 'SO', 'O', null, null, null, 'O', 'SO'];

/**
 * Wo das Gesicht sitzt und wie es zu sehen ist (null: von hinten). Die Arten setzen es mit
 * `ctx.face = faceAt(ctx, punkt)`; gebacken wird es mit jedem Ausdruck (peopleSprites.js).
 */
export function faceAt(ctx, point, profileShift = 0.1) {
  const view = FACE_VIEW[ctx.dir];
  if (!view) return null;
  const at = ctx.W(point);
  // Im Profil sitzt das Auge auf der Seite, die zur Kamera schaut – ein Stück vor der Mitte des
  // Kopfs (die Kamera blickt von oben: mittig läge es unter dem Mützenrand)
  if (view === 'O') at[2] += profileShift;
  return { at, view, flip: ctx.dir >= 6 };
}

// --- Vierbeiner (Knopf) -------------------------------------------------------------------------

/**
 * Maße eines Hundes (Meter): Rumpf als Ellipsoid entlang z, vier Beine mit Gelenk, Hals, Kopf
 * mit Schnauze, Schwanz. Die Arten färben über `mats`.
 */
export const DOG = {
  bodyY: 0.33,
  body: [0.165, 0.145, 0.265],
  legX: 0.085,
  frontZ: 0.17,
  backZ: -0.16,
  upper: 0.13,
  lower: 0.12,
  legR: [0.05, 0.042, 0.038],
  paw: [0.045, 0.03, 0.06],
  neck: [0, 0.48, 0.26],
  head: [0.13, 0.12, 0.12],
  snout: [0.065, 0.055, 0.075],
  tail: 0.2,
};

/** Posen des Hundes: traben, stehen (wedeln), sitzen, bellen. */
export const DOG_ANIMS = { stehen: 2, traben: 6, sitzen: 2, bellen: 2 };

export function poseDog(anim, k, n) {
  const ph = (n > 1 ? k / n : 0) * Math.PI * 2;
  const p = { legs: [0, 0, 0, 0], knees: [0.1, 0.1, 0.1, 0.1], bob: 0, pitch: 0, headPitch: 0, headRoll: 0, tail: 0, tailUp: 0.6, sit: 0, mouth: 0 };
  if (anim === 'traben') {
    // Diagonal: vorn links mit hinten rechts
    const s = Math.sin(ph);
    p.legs = [0.6 * s, -0.6 * s, -0.6 * s, 0.6 * s];
    p.knees = [0.1 + 0.7 * Math.max(0, -Math.sin(ph + 0.5)), 0.1 + 0.7 * Math.max(0, Math.sin(ph + 0.5)), 0.1 + 0.6 * Math.max(0, Math.sin(ph + 0.5)), 0.1 + 0.6 * Math.max(0, -Math.sin(ph + 0.5))];
    p.bob = 0.022 * Math.abs(Math.cos(ph)) - 0.01;
    p.tail = 0.35 * Math.sin(ph * 2);
    p.tailUp = 0.75;
    p.headPitch = 0.05 * Math.sin(ph * 2);
  } else if (anim === 'stehen') {
    p.tail = k ? 0.65 : -0.65;
    p.headRoll = k ? 0.08 : -0.04;
  } else if (anim === 'sitzen') {
    p.sit = 1;
    p.tail = k ? 0.45 : -0.45;
    p.tailUp = 0.1;
    p.headPitch = -0.1;
  } else if (anim === 'bellen') {
    p.mouth = k ? 1 : 0.2;
    p.headPitch = k ? -0.35 : -0.15;
    p.bob = k ? 0.012 : 0;
    p.tail = k ? 0.5 : -0.5;
  }
  return p;
}

/**
 * Den Hund setzen: Rumpf, Beine, Hals, Kopf, Schwanz. Gibt die Punkte für Gesicht, Halsband
 * und Ohren zurück. `M` sind die Stoffe (fell, bauch, pfote, schnauze, ohr).
 */
export function quadruped(ctx, D, pose, M) {
  const sitDrop = 0.1 * pose.sit;
  const bodyC = [0, D.bodyY + pose.bob - sitDrop, -0.02 * pose.sit];
  const pitch = -0.5 * pose.sit;
  const bodyAx = ctx.AX(pitch, 0);
  const B = (l) => {
    // Punkt im Rahmen des Rumpfs (geneigt beim Sitzen) → Figur
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    return [bodyC[0] + l[0], bodyC[1] + l[1] * cp - l[2] * sp, bodyC[2] + l[1] * sp + l[2] * cp];
  };
  ctx.push({ kind: 'ellipsoid', c: ctx.W(bodyC), rr: D.body, ax: bodyAx, mat: M.fell, blend: 0.04, part: 'rumpf', matAt: (l) => (l[1] < -0.06 ? M.bauch : null) });
  // Beine: vorn (0 links, 1 rechts), hinten (2 links, 3 rechts); beim Sitzen liegen die Hinterbeine
  const feet = [];
  for (let i = 0; i < 4; i++) {
    const front = i < 2;
    const side = i % 2 ? 1 : -1;
    const top = B([side * D.legX, -0.04, front ? D.frontZ : D.backZ]);
    let swing = pose.legs[i];
    let knee = pose.knees[i];
    if (!front && pose.sit) {
      swing = 1.15;
      knee = 2.45;
    }
    const kneeP = [top[0], top[1] - Math.cos(swing) * D.upper, top[2] + Math.sin(swing) * D.upper];
    // Der Unterschenkel knickt nach hinten (die Pfote hebt sich hinter dem Gelenk)
    const lowerA = swing - knee;
    const foot = [kneeP[0], Math.max(D.paw[1], kneeP[1] - Math.cos(lowerA) * D.lower), kneeP[2] + Math.sin(lowerA) * D.lower];
    ctx.capsule(top, kneeP, D.legR[0], D.legR[1], M.fell, { blend: 0.03 });
    ctx.capsule(kneeP, foot, D.legR[1], D.legR[2], M.fell);
    ctx.ellipsoid(add(foot, [0, -0.005, 0.02]), D.paw, M.pfote);
    feet.push(foot);
  }
  // Hals und Kopf
  const neckBase = B([0, 0.06, D.body[2] - 0.06]);
  const headC = add([0, D.neck[1] + pose.bob - sitDrop * 0.4, D.neck[2]], [0, 0.0, 0.0]);
  ctx.capsule(neckBase, add(headC, [0, -0.04, -0.03]), 0.085, 0.075, M.fell, { blend: 0.04 });
  const hAx = ctx.AX(pose.headPitch, pose.headRoll);
  const H = (l) => {
    const cp = Math.cos(pose.headPitch);
    const sp = Math.sin(pose.headPitch);
    const cr = Math.cos(pose.headRoll);
    const sr = Math.sin(pose.headRoll);
    const x = l[0] * cr - l[1] * sr;
    const y0 = l[0] * sr + l[1] * cr;
    return [headC[0] + x, headC[1] + y0 * cp - l[2] * sp, headC[2] + y0 * sp + l[2] * cp];
  };
  ctx.push({ kind: 'ellipsoid', c: ctx.W(headC), rr: D.head, ax: hAx, mat: M.fell, blend: 0.03, part: 'kopf' });
  // Schnauze, beim Bellen offen (Unterkiefer klappt herab)
  const snoutC = H([0, -0.035, 0.12]);
  ctx.push({ kind: 'ellipsoid', c: ctx.W(snoutC), rr: D.snout, ax: hAx, mat: M.schnauze, blend: 0.025, part: 'schnauze' });
  if (pose.mouth > 0.5) {
    const jaw = H([0, -0.085, 0.1]);
    ctx.push({ kind: 'ellipsoid', c: ctx.W(jaw), rr: [D.snout[0] * 0.8, 0.022, D.snout[2] * 0.8], ax: ctx.AX(pose.headPitch + 0.45, pose.headRoll), mat: M.schnauze });
    ctx.push({ kind: 'ellipsoid', c: ctx.W(H([0, -0.06, 0.15])), rr: [0.035, 0.018, 0.04], ax: hAx, mat: M.maul });
  }
  // Schlappohren: hängen seitlich herab
  for (const side of [-1, 1]) {
    ctx.push({ kind: 'ellipsoid', c: ctx.W(H([side * 0.12, -0.02, -0.01])), rr: [0.03, 0.085, 0.055], ax: ctx.AX(pose.headPitch, pose.headRoll + side * 0.25), mat: M.ohr, blend: 0.01 });
  }
  // Schwanz: zwei Stücke, wedelt seitlich
  const tailBase = B([0, 0.07, -D.body[2] + 0.03]);
  const mid = add(tailBase, [Math.sin(pose.tail) * 0.07, 0.06 + 0.06 * pose.tailUp, -0.07]);
  const tip = add(mid, [Math.sin(pose.tail) * 0.09, 0.03 + 0.07 * pose.tailUp, -0.04]);
  ctx.capsule(tailBase, mid, 0.04, 0.035, M.fell, { blend: 0.02 });
  ctx.capsule(mid, tip, 0.035, 0.022, M.schwanzspitze || M.fell);
  return { headC, H, feet, bodyC, B, snoutC };
}

/** Kleine Helfer für die Arten. */
export { add, sub, mul, norm, lerp, hash };
