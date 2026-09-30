// Schlurfer als Sprites (F1): der Bauplan eines Menschen aus runden Formen, die Haut der Art
// (Rampen der Palette), die Stempel für Gesicht und Merkmale – und die Posen je Zustand und Bild.
// Gebacken wird mit render/spriteBaker.js in 5 Richtungen (S, SO, O, NO, N); W, NW und SW sind
// gespiegelt.

import { P, RAMPS } from '../render/palette.js';
import { trace, paint, stampAt, TEXEL } from '../render/spriteBaker.js';

/** Zelle je Bild (Texel) und Fußpunkt darin – unten und seitlich Platz fürs Zusammensacken. */
export const CELL = { w: 80, h: 84, px: 40, py: 66 };

/** Richtungen: Index 0 S, 1 SO, 2 O, 3 NO, 4 N (gezeichnet), 5–7 gespiegelt. */
export const DIRS = 5;

/** Bilder je Zustand (gehen: sechs je Schritt – mit vier ruckelte das Hinken). */
export const ANIMS = { gehen: 6, stehen: 2, treffer: 1, fallen: 4 };

/** Schatten unter den Füßen: Halbachsen auf dem Boden (m), quer und in der Tiefe. */
const SHADOW = { x: 0.3, z: 0.17 };

const R = RAMPS;

/** Häute: Materialien je Art (Rampe, Grundton). */
export const SKINS = {
  schlurfer: {
    materials: {
      haut: { ramp: R.t, base: 3 },
      hemd: { ramp: R.b, base: 2, pattern: (p) => ((Math.floor(p[1] * 18) + Math.floor(p[0] * 18)) % 5 === 0 ? -1 : 0) }, // verwaschene Flecken
      hose: { ramp: R.e, base: 3 },
      schuh: { ramp: R.e, base: 1 },
      moos: { ramp: R.g, base: 5, pattern: (p) => ((Math.floor(p[0] * 40) ^ Math.floor(p[2] * 40)) & 1 ? 1 : 0) },
      haar: { ramp: R.e, base: 2 },
    },
    stoop: 0.18,
  },
};

const EYES = { glow: P.f7 };
const STAMPS = {
  // Gesicht von vorn: zwei Glühaugen, darunter ein genähter Mund
  gesichtS: { rows: ['ee..ee', 'ee..ee', '......', '.mmmm.', '.m.s.m'], legend: { e: EYES, m: P.t0, s: P.t2 } },
  gesichtSO: { rows: ['ee..ee', 'ee..ee', '......', '..mmm.'], legend: { e: EYES, m: P.t0 } },
  gesichtO: { rows: ['..ee', '..ee', '....', 'mm..'], legend: { e: EYES, m: P.t0 } },
  // Gänseblümchen auf dem Kopf (das Merkmal der Art, sichtbar auch im Pulk)
  blume: { rows: ['.www.', 'wwyww', 'wyyyw', 'wwyww', '.www.', '..g..', '..g..'], legend: { w: P.a4, y: P.f6, g: P.g6 } },
};

// --- Vektorhilfen ----------------------------------------------------------------------------

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
/** Punkt in Figurkoordinaten (x rechts, y oben, z vorn) → Welt, Blick um `yaw` gedreht. */
function toWorld(p, yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

/** Ein Glied: Winkel gegen die Senkrechte nach vorn (swing) von `top` aus, Länge len. */
function limb(top, swing, length, side = 0) {
  return [top[0] + side, top[1] - Math.cos(swing) * length, top[2] + Math.sin(swing) * length];
}

/** Länge von Ober- und Unterschenkel und Höhe des Knöchels über dem Boden (m). */
const THIGH = 0.32;
const SHIN = 0.3;
const ANKLE = 0.07;

/** So hoch steht die Hüfte, wenn der tiefere Fuß gerade den Boden berührt. */
function hipHeight(legs) {
  let h = 0;
  for (const [swing, knee] of legs) h = Math.max(h, Math.cos(swing) * THIGH + Math.cos(swing - knee) * SHIN);
  return h + ANKLE;
}

/**
 * Pose eines Schlurfers: Winkel der Glieder und des Rumpfs. `anim` (gehen, stehen, treffer,
 * fallen), `k` Bild im Zustand, `n` Bilder im Zustand.
 */
function poseOf(anim, k, n) {
  const t = n > 1 ? k / n : 0;
  const ph = t * Math.PI * 2;
  let legL = 0;
  let legR = 0;
  let kneeL = 0.15;
  let kneeR = 0.15;
  let armSwing = 0;
  let armPitch = 0.95; // die Arme halb nach vorn gestreckt
  let bob = 0;
  let lean = 0;
  let head = 0;
  if (anim === 'gehen') {
    // Schlurfer hinken: das linke Bein schwingt weiter als das rechte, das rechte schleift nach
    legL = 0.38 * Math.sin(ph);
    legR = -0.24 * Math.sin(ph);
    kneeL = 0.12 + 0.45 * Math.max(0, -Math.sin(ph));
    kneeR = 0.1 + 0.25 * Math.max(0, Math.sin(ph));
    armSwing = 0.1 * Math.sin(ph);
    bob = -0.025 * Math.abs(Math.sin(ph));
    head = 0.1 * Math.sin(ph);
  } else if (anim === 'stehen') {
    bob = -0.015 * k;
    armSwing = 0.05 * (k ? 1 : -1);
    head = 0.1 * (k ? 1 : -1);
  } else if (anim === 'treffer') {
    lean = -0.28; // zurückgestoßen
    armSwing = -0.35;
    head = -0.2;
  } else if (anim === 'fallen') {
    // Er sackt in sich zusammen: die Knie geben nach, der Rumpf kippt vornüber, die Arme sinken
    // bis zum Boden – ein Häufchen, das danach im Boden versinkt (die Füße bleiben auf der Erde)
    const q = (k + 1) / n;
    legL = 0.9 * q;
    legR = 0.75 * q;
    kneeL = 0.2 + 1.9 * q;
    kneeR = 0.2 + 1.7 * q;
    lean = 0.95 * q;
    armPitch = 0.95 - 0.8 * q;
    head = 0.35 * q;
  }
  const hip = hipHeight([[legL, kneeL], [legR, kneeR]]);
  return { legL, legR, kneeL, kneeR, armSwing, armPitch, bob, lean, head, hip };
}

/**
 * Formen des Schlurfers in Welt-Metern für Richtung `dir` (0 S … 4 N), Zustand und Bild.
 * Rund 1,7 m groß, vorgebeugt, die Arme halb nach vorn gestreckt.
 */
export function schlurferShapes(dir, anim, k) {
  const yaw = (dir * Math.PI) / 4; // 0: nach Süden (zur Kamera)
  const pose = poseOf(anim, k, ANIMS[anim]);
  const stoop = SKINS.schlurfer.stoop + pose.lean;
  const W = (p) => toWorld(p, yaw);
  const shapes = [];
  const hip = [0, pose.hip + pose.bob, 0];
  // Beine: Oberschenkel, Knie, Unterschenkel, Schuh
  for (const [side, swing, knee, mat] of [[-0.1, pose.legL, pose.kneeL, 'hose'], [0.1, pose.legR, pose.kneeR, 'hose']]) {
    const top = [hip[0] + side, hip[1], hip[2]];
    const kneeP = limb(top, swing, THIGH);
    const ankle = limb(kneeP, swing - knee, SHIN);
    shapes.push({ kind: 'capsule', a: W(top), b: W(kneeP), r: 0.095, r1: 0.085, mat, blend: 0.03 });
    shapes.push({ kind: 'capsule', a: W(kneeP), b: W(ankle), r: 0.08, r1: 0.07, mat });
    shapes.push({ kind: 'ellipsoid', c: W([ankle[0], ankle[1] - 0.01, ankle[2] + 0.06]), rr: [0.085, 0.06, 0.13], mat: 'schuh' });
  }
  // Rumpf um die Hüfte vorgebeugt: `d` Meter die Wirbelsäule hinauf
  const spine = (d) => [0, hip[1] + d * Math.cos(stoop), Math.sin(stoop) * d * 1.1];
  const pelvis = spine(0.05);
  const chest = spine(0.36);
  const neck = spine(0.52);
  shapes.push({ kind: 'ellipsoid', c: W(pelvis), rr: [0.2, 0.13, 0.14], mat: 'hose', blend: 0.05 });
  shapes.push({ kind: 'ellipsoid', c: W(spine(0.2)), rr: [0.22, 0.19, 0.16], mat: 'hemd', blend: 0.07 });
  shapes.push({ kind: 'ellipsoid', c: W(chest), rr: [0.25, 0.16, 0.16], mat: 'hemd', blend: 0.07 });
  // Moos auf der linken Schulter
  shapes.push({ kind: 'ellipsoid', c: W(add(chest, [-0.17, 0.1, -0.01])), rr: [0.1, 0.07, 0.1], mat: 'moos' });
  // Arme: Oberarm, Unterarm, Hand – halb nach vorn gestreckt, leicht pendelnd
  for (const [side, sw] of [[-1, pose.armSwing], [1, -pose.armSwing]]) {
    const sh = add(chest, [side * 0.25, 0.08, 0]);
    const pitch = pose.armPitch + sw * side;
    const elbow = add(sh, [side * 0.02, -Math.cos(pitch) * 0.24, Math.sin(pitch) * 0.24]);
    const wrist = add(elbow, [0, -Math.cos(pitch + 0.2) * 0.2, Math.sin(pitch + 0.2) * 0.2]);
    shapes.push({ kind: 'capsule', a: W(sh), b: W(elbow), r: 0.07, r1: 0.062, mat: 'hemd', blend: 0.03 });
    shapes.push({ kind: 'capsule', a: W(elbow), b: W(wrist), r: 0.055, r1: 0.05, mat: 'haut' });
    shapes.push({ kind: 'ellipsoid', c: W(add(wrist, [0, -0.02, 0.03])), rr: [0.06, 0.055, 0.065], mat: 'haut' });
  }
  // Hals und Kopf, nach vorn geneigt, leicht schief
  const headC = add(spine(0.72), [pose.head * 0.25, 0, 0.03]);
  shapes.push({ kind: 'capsule', a: W(neck), b: W(add(headC, [0, -0.1, -0.02])), r: 0.065, mat: 'haut', blend: 0.03 });
  shapes.push({ kind: 'ellipsoid', c: W(headC), rr: [0.185, 0.19, 0.18], mat: 'haut', blend: 0.02 });
  // Wirres Haar oben und am Hinterkopf
  shapes.push({ kind: 'ellipsoid', c: W(add(headC, [0.02, 0.09, -0.07])), rr: [0.17, 0.11, 0.14], mat: 'haar' });
  return { shapes, headC: W(headC), face: W(add(headC, [0, -0.02, 0.17])), top: W(add(headC, [-0.05, 0.2, 0])), yaw };
}

/**
 * Ein Bild backen: Formen rastern, malen, Stempel setzen.
 * @returns {{w, h, px, py, color: Int32Array, glow: Uint8Array, normal: Float32Array, shadow: Uint8Array}}
 */
export function bakeFrame(dir, anim, k) {
  const { shapes, face, top } = schlurferShapes(dir, anim, k);
  const raster = trace(shapes, CELL);
  const out = paint(raster, SKINS.schlurfer.materials);
  // Gesicht nur, wo man es von vorn oder schräg sieht (Süd, Südost, Ost)
  if (anim !== 'fallen' || k < 2) {
    if (dir === 0) stampAt(out, raster, STAMPS.gesichtS, face);
    else if (dir === 1) stampAt(out, raster, STAMPS.gesichtSO, face);
    else if (dir === 2) stampAt(out, raster, STAMPS.gesichtO, face);
  }
  stampAt(out, raster, STAMPS.blume, top, { need: false });
  return { w: raster.w, h: raster.h, px: raster.px, py: raster.py, color: out.color, glow: out.glow, normal: raster.normal, shadow: shadowOf(raster, out.color) };
}

/**
 * Schatten als Ellipse auf dem Boden um den Fußpunkt – nur, wo die Figur nicht selbst steht.
 * Im Bild ist sie so hoch, wie der Boden in der Neigung der Kamera erscheint (0,6).
 */
function shadowOf(raster, color) {
  const { w, h, px, py } = raster;
  const shadow = new Uint8Array(w * h);
  const ax = SHADOW.x / TEXEL;
  const ay = (0.6 * SHADOW.z) / TEXEL;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dx = (i + 0.5 - px) / ax;
      const dy = (j + 0.5 - py) / ay;
      if (dx * dx + dy * dy <= 1 && color[j * w + i] < 0) shadow[j * w + i] = 1;
    }
  }
  return shadow;
}
