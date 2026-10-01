// Die Menschen als Sprites (F4): je Figur die Stoffe (Rampen der Palette, bei Mika aus dem
// gewählten Aussehen), der Körper (Maße aus peopleFigure.HUMAN), Kleider und Dinge, die Gesichter
// je Ausdruck und Blick, dazu die Werkzeuge und Waffen, die Mika trägt. Vorbild sind die
// Voxel-Figuren (characters.js, survivorModels.js, dogModel.js) – jede behält ihr Merkmal, das man
// schon von Weitem liest (DESIGN 4.5), und bekommt die kleinen Dinge dazu, die sie erzählen.
//
// Ein Bauplan `build(ctx, spec)` setzt Formen und Stempel in Figurkoordinaten und mit
// `ctx.face = faceAt(ctx, punkt)` die Stelle des Gesichts; gebacken wird in peopleSprites.js.
// Kein three.js – der Worker backt mit denselben Bauplänen.

import { P, RAMPS } from '../render/palette.js';
import { humanoid, headEllipsoid, headCapsule, add, sub, mul, norm, dot, hash } from './spriteFigure.js';
import { HUMAN, CHILD, DOG, quadruped, lanternShapes, LANTERN_MATERIALS, faceAt, rampAround, toneOf } from './peopleFigure.js';

const R = RAMPS;

// --- Gesichter -----------------------------------------------------------------------------------

/**
 * Ein Gesicht als Stempel: Augen, Brauen, Wangen, Nase, Mund je Ausdruck, gezeichnet für drei
 * Blicke (S von vorn, SO halb gedreht, O im Profil). Legende: k Auge, i Iris (unten im Auge),
 * w Lichtpunkt, l Lid, K unteres Lid, b Braue, c Wange, n Nase, m Mund, t Zunge, z Zähne, L Wimper.
 * `o.lashes` gibt Wimpern, `o.glasses` eine Brille.
 *
 * F5 (recherche/menschen-gestaltung.md): Die Augen sind von vorn 3 Texel breit und 3 hoch, so weit
 * auseinander wie ein Auge breit ist, mit dem Lichtpunkt in beiden Augen oben links und der Iris
 * unten; im Halbprofil ist das ferne Auge schmaler. Die Brauen stehen eine Reihe über den Augen.
 */
export function faceRows(view, expr, o = {}) {
  const W = view === 'S' ? 15 : view === 'SO' ? 13 : 7;
  const H = 9;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const set = (x, y, ch) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch;
  };
  // Augen [linke Spalte, Breite, außen (−1 links, 1 rechts)], Mund und Wangen je Blick
  const eyes = view === 'S' ? [[3, 3, -1], [9, 3, 1]] : view === 'SO' ? [[2, 3, -1], [8, 2, 1]] : [[1, 2, 1]];
  const mouth = view === 'S' ? 7 : view === 'SO' ? 6 : 3;
  const cheeks = view === 'S' ? [[1, 2], [12, 2]] : view === 'SO' ? [[0, 2], [10, 1]] : [[0, 2]];
  /** Brauen so breit wie das Auge (das schmale im Halbprofil eine Spalte länger); inner/outer heben bzw. senken die Enden. */
  const brow = (y, inner, outer) => {
    for (const [x0, w, side] of eyes) {
      const from = side < 0 && w < 3 ? x0 - 1 : x0;
      const to = side > 0 && w < 3 ? x0 + w : x0 + w - 1;
      for (let x = from; x <= to; x++) {
        const out = side < 0 ? x === from : x === to;
        const inn = side < 0 ? x === to : x === from;
        set(x, y + (out ? outer : inn ? inner : 0), 'b');
      }
    }
  };
  /** Augen aus Zeilen je Breite (3 bzw. 2), ab Reihe 3. */
  const eyeRows = (rows3, rows2 = rows3.map((r) => r && r.slice(0, 1) + r.slice(2))) => {
    for (const [x0, w] of eyes) {
      const rows = w === 3 ? rows3 : rows2;
      rows.forEach((row, dy) => row && [...row].forEach((ch, dx) => ch !== '.' && set(x0 + dx, 3 + dy, ch)));
    }
  };
  const open = () => eyeRows(['wkk', 'kkk', 'kik'], ['wk', 'kk', 'ik']);
  const cheek = (y = 6) => {
    for (const [x0, w] of cheeks) for (let x = x0; x < x0 + w; x++) set(x, y, 'c');
  };
  const nose = () => set(mouth, 6, 'n');
  const line = (y, x0, x1, ch = 'm') => {
    for (let x = x0; x <= x1; x++) set(x, y, ch);
  };
  switch (expr) {
    case 'froh': // lachende Bögen (hinter einer Brille bleiben die Augen offen), ein offenes Lächeln
      brow(1, -1, 0);
      if (o.glasses) open();
      else {
        for (const [x0, w] of eyes) {
          for (let x = x0; x < x0 + w; x++) set(x, 3, 'k');
          set(x0 - 1, 4, 'k');
          set(x0 + w, 4, 'k');
        }
      }
      cheek(5);
      nose();
      line(7, mouth - 2, mouth + 2);
      line(8, mouth - 1, mouth + 1, 't');
      break;
    case 'aua': // zusammengekniffen > <, der Mund ein kleines O
      brow(1, -1, 1);
      for (const [x0, w, side] of eyes) {
        const a = side < 0 ? x0 : x0 + w - 1; // die Spitze zeigt zur Nase
        const b = side < 0 ? x0 + w - 1 : x0;
        set(a, 3, 'k');
        for (let x = Math.min(a, b) + 1; x < Math.max(a, b); x++) set(x, 4, 'k');
        set(b, 4, 'k');
        set(a, 5, 'k');
      }
      cheek();
      line(7, mouth - 1, mouth + 1);
      line(8, mouth - 1, mouth + 1);
      set(mouth, 8, 't');
      break;
    case 'staunen': // weit offen, die Brauen hoch, ein rundes O
      brow(0, 0, 0);
      eyeRows(['wkw', 'kkk', 'kik'], ['wk', 'kk', 'ik']);
      cheek();
      nose();
      line(7, mouth, mouth);
      line(8, mouth - 1, mouth + 1);
      set(mouth, 8, 't');
      break;
    case 'muede': // die Lider halb zu, die Brauen tief
      brow(1, 1, 1);
      eyeRows(['lll', 'kkk', 'kik'], ['ll', 'kk', 'ik']);
      cheek();
      nose();
      set(mouth, 7, 't');
      break;
    case 'besorgt': // die Brauen innen hoch, der Mund ein kleiner Bogen nach unten
      brow(1, -1, 1);
      open();
      cheek();
      nose();
      set(mouth, 7, 'm');
      set(mouth - 1, 8, 'm');
      set(mouth + 1, 8, 'm');
      break;
    case 'entschlossen': // die Brauen innen tief, die Lider ein wenig zu, die Zähne zusammen
      brow(1, 1, -1);
      eyeRows(['lll', 'kkk', 'kik'], ['ll', 'kk', 'ik']);
      cheek();
      nose();
      line(7, mouth - 2, mouth + 2);
      line(7, mouth - 1, mouth + 1, 'z');
      break;
    case 'blinzeln': // die Lider zu: eine dunkle Linie, darüber Haut
      brow(1, 0, 0);
      eyeRows([null, 'lll', 'kkk'], [null, 'll', 'kk']);
      cheek();
      nose();
      set(mouth, 7, 't');
      break;
    case 'grinsen': // Balduin: ein breites Grinsen mit Goldzahn
      brow(1, -1, 0);
      eyeRows(['wkk', 'kkk', 'KKK'], ['wk', 'kk', 'KK']);
      cheek(5);
      line(7, mouth - 2, mouth + 2);
      line(8, mouth - 1, mouth + 1, 'z');
      set(mouth + 1, 8, 'g');
      break;
    default: // normal: offene Augen mit Lichtpunkt, ein kleiner Mund
      brow(1, 0, 0);
      open();
      cheek();
      nose();
      line(7, mouth, mouth, 't');
      if (view !== 'O') set(mouth - 1, 7, 'n');
      break;
  }
  // Wimpern am äußeren Augenwinkel (offene Augen)
  if (o.lashes && ['normal', 'staunen', 'besorgt'].includes(expr)) {
    for (const [x0, w, side] of eyes) set(side < 0 ? x0 - 1 : x0 + w, 3, 'L');
  }
  // Brille: ein runder Rahmen um jedes Auge (F5: hell, ohne Ecken – dunkel und eckig sah sie wie eine
  // Schweißerbrille aus), dazwischen der Steg, im Profil der Bügel nach hinten
  if (o.glasses) {
    for (const [x0, w] of eyes) {
      for (let x = x0; x < x0 + w; x++) {
        set(x, 2, 'G');
        set(x, 6, 'G');
      }
      for (let y = 3; y <= 5; y++) {
        set(x0 - 1, y, 'G');
        set(x0 + w, y, 'G');
      }
    }
    if (eyes.length === 2) for (let x = eyes[0][0] + eyes[0][1] + 1; x < eyes[1][0] - 1; x++) set(x, 3, 'S');
    else for (let x = eyes[0][0] - 3; x < eyes[0][0] - 1; x++) set(x, 3, 'S');
  }
  return g.map((r) => r.join(''));
}

/** Gesichter einer Figur je Ausdruck und Blick (einmal gebaut). */
function faceSet(exprs, o = {}) {
  const out = {};
  for (const e of exprs) out[e] = { S: faceRows('S', e, o), SO: faceRows('SO', e, o), O: faceRows('O', e, o) };
  return out;
}

/** Legende eines Gesichts aus Haut, Haar, Augen und Wangen (Palettenwerte). */
function faceLegend({ skin, hair, eyes = P.n1, cheek = P.a1, lips = P.r1, brow = null }) {
  return { k: eyes, i: toneOf(eyes, 2), w: P.s9, l: toneOf(skin, -1), K: P.n2, b: brow ?? toneOf(hair, -1), c: cheek, n: toneOf(skin, -1), m: lips, t: P.a0, z: P.s9, L: eyes, g: P.f6, G: P.s6, S: P.s6 };
}

// --- Gemeinsame Stempel ------------------------------------------------------------------------

const STAMPS = {
  // Schnalle an den Rucksackriemen, Knöpfe, Schnürung der Stiefel
  schnalle: { rows: ['ss', 'sS'], legend: { s: R.s[7], S: R.s[5] } },
  knopf: { rows: ['k'], legend: { k: R.s[6] } },
  schnuerung: { rows: ['w.w', '.w.'], legend: { w: R.e[6] } },
};

// --- Mika --------------------------------------------------------------------------------------

/** Farben Mikas, die das Aussehen nicht ändert (wie MIKA in characters.js). */
export const MIKA_BASE = {
  cheek: P.a1,
  eyes: P.n1,
  pompom: P.e9,
  zipper: P.e8,
  pants: P.b2,
  boots: P.e2,
  backpack: P.e6,
  bedroll: P.b3,
  strap: P.e3,
};

const MIKA_EXPRESSIONS = ['normal', 'froh', 'aua', 'staunen', 'muede', 'besorgt', 'entschlossen', 'blinzeln'];
const MIKA_FACES = { frau: faceSet(MIKA_EXPRESSIONS, { lashes: true }), mann: faceSet(MIKA_EXPRESSIONS) };

/**
 * Wo der Kopf Haar trägt (Punkt im Kopfrahmen): oben und hinten, über den Ohren; vorn ein Pony
 * mit Strähnen unter dem Mützenrand. Bei »Frau« fällt es an den Seiten bis zum Kinn.
 */
function mikaHair(long) {
  return (l) => {
    const [x, y, z] = l;
    const zig = Math.floor((x + 0.5) * 26) & 1;
    if (z > 0.12) return y > 0.085 + 0.025 * zig ? 'haar' : null; // Pony mit Strähnen
    if (y > 0.11) return 'haar'; // oben unter der Mütze
    // Seiten: hinter dem Ohr, bei »Frau« bis zum Kinn hinab; davor ein kurzer Koteletten-Streif
    if (Math.abs(x) > 0.2 && z < (long ? 0.0 : -0.05)) return y > (long ? -0.22 : -0.06) ? 'haar' : null;
    if (Math.abs(x) > 0.24 && z < 0.07 && y > 0.02) return 'haar';
    // Hinterkopf bis in den Nacken
    if (z < -0.06) return y > (long ? -0.24 : -0.13) ? 'haar' : null;
    return null;
  };
}

const mika = {
  size: 1,
  expressions: MIKA_EXPRESSIONS,
  /** Teile der Fassung: zuerst Stehen und Gehen, dann Taten, dann dasselbe mit der Laterne. */
  parts: {
    base: { anims: ['stehen', 'gehen', 'rennen'] },
    aktion: { anims: ['schwung', 'treffer', 'rolle', 'suchen', 'wurf', 'jubel', 'blitz'] },
    laterne: { anims: ['stehen', 'gehen', 'rennen'], lantern: true },
    laterneAktion: { anims: ['schwung', 'treffer', 'suchen', 'wurf'], lantern: true },
  },
  /** Stoffe aus dem Aussehen (spec = lookSpec(MIKA_BASE, look)). */
  materials(s) {
    const r = (c, below = 2, above = 2, more = {}) => ({ ...rampAround(c, below, above), ...more });
    return {
      haut: r(s.skin, 2, 1, { shine: true }),
      haar: r(s.hair, 2, 2, { seam: true, pattern: (p) => (Math.floor((p[0] - p[2]) * 44) % 4 === 0 ? -1 : 0) }),
      muetze: r(s.hat, 2, 2, { seam: true }),
      muetzeAb: r(s.hat, 2, 2, { base: rampAround(s.hat, 2, 2).base, pattern: () => -1 }),
      rippe: r(s.hat, 2, 1, { seam: true, base: rampAround(s.hat, 2, 1).base - 1 }),
      streifen: r(s.hat, 1, 3, { base: rampAround(s.hat, 1, 3).base + 1 }),
      bommel: { ramp: [R.e[6], R.e[7], R.e[8], R.e[9], R.s[9]], base: 3, pattern: (p) => ((Math.floor(p[0] * 50) * 7 + Math.floor(p[1] * 50) * 3 + Math.floor(p[2] * 50)) % 5 === 0 ? -1 : 0) },
      jacke: r(s.jacket, 2, 2, { seam: true }),
      saum: r(s.jacket, 2, 1, { seam: true, base: rampAround(s.jacket, 2, 1).base - 1 }),
      kragen: r(s.jacket, 1, 3, { seam: true, base: rampAround(s.jacket, 1, 3).base + 1 }),
      zipper: { ramp: [R.s[3], R.s[4], R.s[5], R.s[6]], base: 1 },
      hose: { ramp: [R.b[0], R.b[1], R.b[2], R.b[3], R.b[4]], base: 2, seam: true },
      flicken: { ramp: [R.b[1], R.b[2], R.b[3], R.b[4], R.b[5]], base: 2, seam: true },
      stiefel: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3], R.e[4]], base: 2, seam: true, shine: true },
      stiefelRand: { ramp: [R.e[2], R.e[3], R.e[4], R.e[5]], base: 2, seam: true },
      sohle: { ramp: [R.n[0], R.e[0], R.e[1]], base: 1, seam: true },
      rucksack: { ramp: [R.e[3], R.e[4], R.e[5], R.e[6], R.e[7]], base: 3, seam: true },
      klappe: { ramp: [R.e[2], R.e[3], R.e[4], R.e[5], R.e[6]], base: 2, seam: true },
      matte: { ramp: [R.b[1], R.b[2], R.b[3], R.b[4], R.b[5]], base: 2, seam: true },
      matteHell: { ramp: [R.b[2], R.b[3], R.b[4], R.b[5]], base: 2 },
      riemen: { ramp: [R.e[1], R.e[2], R.e[3], R.e[4]], base: 2, seam: true },
      gurt: { ramp: [R.e[3], R.e[4], R.e[5], R.e[6], R.e[7]], base: 2, seam: true },
      ...LANTERN_MATERIALS,
    };
  },
  build(ctx, s) {
    const { W, stamps, dir, pose } = ctx;
    const long = s.body === 'frau';
    // Der Saum der Jacke unten am Bauch (gerippt), der Reißverschluss vorn in der Mitte
    const zip = (l) => (l[2] > 0.08 && Math.abs(l[0]) < 0.014 ? 'zipper' : null);
    const belly = (l) => (l[1] < -0.12 ? 'saum' : zip(l));
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'hose' },
        { ...HUMAN.torso[1], mat: 'jacke', matAt: belly },
        { ...HUMAN.torso[2], mat: 'jacke', matAt: zip },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: mikaHair(long) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'stiefel', upper: 'jacke', fore: 'jacke', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs, arms } = body;
    // Hose: Flicken auf dem linken Knie, die Stiefel reichen bis über den Knöchel (heller Rand)
    legs.forEach((leg, i) => {
      const kneeW = W(leg.knee);
      const ankleW = W(leg.ankle);
      const along = norm(sub(ankleW, kneeW));
      const len = Math.hypot(...sub(ankleW, kneeW));
      ctx.part(`shin${i}`).matAt = (l, p) => {
        const t = dot(sub(p, kneeW), along) / len;
        if (t > 0.58) return t < 0.68 ? 'stiefelRand' : 'stiefel';
        if (i === 0 && t < 0.3 && t > -0.05 && dot(sub(p, kneeW), ctx.fwd) > 0.04 && Math.abs(dot(sub(p, kneeW), ctx.right)) < 0.055) return 'flicken';
        return null;
      };
      ctx.part(`shoe${i}`).matAt = (l) => (l[1] < -0.035 ? 'sohle' : null);
    });
    // Bündchen an den Handgelenken
    for (const a of arms) {
      const d = norm(sub(a.wrist, a.elbow));
      ctx.capsule(add(a.wrist, mul(d, -0.04)), add(a.wrist, mul(d, 0.004)), 0.066, 0.063, 'saum');
    }
    // Rollkragen
    ctx.ellipsoid(spine(0.41), [0.16, 0.06, 0.14], 'kragen', { pitch: body.stoop });
    // Rucksack: runde Kanten, Klappe oben, Außentasche hinten; darauf quer die Isomatte
    const packC = add(spine(0.22), [0, 0, -0.24]);
    ctx.box(packC, [0.2, 0.19, 0.1], 0.07, 'rucksack', {
      pitch: body.stoop,
      matAt: (l) => {
        if (l[1] > 0.07) return 'klappe';
        if (l[2] < -0.07 && Math.abs(l[0]) < 0.11 && l[1] > -0.14 && l[1] < 0.02) return Math.abs(l[0]) > 0.095 || l[1] > 0.005 ? 'klappe' : 'rucksack';
        return null;
      },
    });
    const rollA = W(add(spine(0.0), [-0.14, 0.01, -0.25]));
    const rollB = W(add(spine(0.0), [0.14, 0.01, -0.25]));
    const axis = norm(sub(rollB, rollA));
    ctx.push({
      kind: 'capsule',
      a: rollA,
      b: rollB,
      r: 0.075,
      r1: 0.075,
      mat: 'matte',
      matAt: (l) => {
        const t = dot(l, axis);
        if (Math.abs(t - 0.07) < 0.02 || Math.abs(t - 0.21) < 0.02) return 'riemen';
        if (t < 0.02 || t > 0.26) {
          const radial = Math.hypot(...sub(l, mul(axis, t)));
          return Math.floor(radial * 55) & 1 ? 'matteHell' : 'matte'; // die Spirale an der Stirnseite
        }
        return null;
      },
    });
    // Riemen über die Schultern und gerade über die Brust hinab (F5: ruhig, ohne Schnallen – ein
    // Pixel Metall auf der Jacke war im Spiel nur Rauschen)
    for (const side of [-1, 1]) {
      const top = add(spine(0.37), [side * 0.15, 0.045, 0.02]);
      const chest = add(spine(0.26), [side * 0.155, 0, 0.172]);
      const low = add(spine(0.13), [side * 0.165, 0, 0.17]);
      ctx.capsule(add(top, [0, 0, -0.14]), top, 0.03, null, 'riemen');
      ctx.capsule(top, chest, 0.03, null, 'riemen');
      ctx.capsule(chest, low, 0.028, null, 'riemen');
    }
    // Kopf: Ohren, Nase; bei »Frau« schulterlanges Haar und ein kurzer Zopf mit Haargummi
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.285, -0.04, -0.01], [0.04, 0.07, 0.055], long ? 'haar' : 'haut', { blend: 0.02 });
    headEllipsoid(ctx, body, [0, -0.07, 0.262], [0.038, 0.033, 0.036], 'haut', { blend: 0.012, face: true });
    if (long) {
      for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.27, -0.11, -0.1], [0.05, 0.15, 0.15], 'haar', { blend: 0.03 });
      headEllipsoid(ctx, body, [0, -0.12, -0.2], [0.25, 0.15, 0.08], 'haar', { blend: 0.03 });
      headCapsule(ctx, body, [0, 0.0, -0.27], [0, -0.3, -0.35], 0.07, 0.045, 'haar');
      headEllipsoid(ctx, body, [0, -0.05, -0.3], [0.06, 0.03, 0.05], 'muetze');
    }
    // Mütze: gerippter Bund, Kuppel mit hellem Streifen, Bommel
    const ribs = (l) => (Math.floor((Math.abs(l[0]) > 0.24 ? l[2] : l[0]) * 40 + 40) & 1 ? 'rippe' : 'muetze');
    ctx.box(H([0, 0.18, -0.01]), [0.297, 0.054, 0.27], 0.12, 'rippe', { ax: body.headAx, matAt: ribs });
    // Die Kuppel: ein heller Streifen rundum, oben sechs Abnäher (die Maschen laufen zur Mitte)
    const dome = (l) => {
      if (l[1] > -0.03 && l[1] < 0.0) return 'streifen';
      if (l[1] > 0.02 && Math.floor((Math.atan2(l[0], l[2]) / Math.PI) * 3 + 3) & 1) return 'muetzeAb';
      return null;
    };
    headEllipsoid(ctx, body, [0, 0.21, -0.02], [0.27, 0.12, 0.243], 'muetze', { blend: 0.02, matAt: dome });
    headEllipsoid(ctx, body, [0, 0.325, -0.03], [0.045, 0.03, 0.045], 'muetze');
    for (const [x, y, z, r] of [[0, 0.395, -0.035, 0.088], [-0.05, 0.38, -0.01, 0.05], [0.05, 0.4, -0.06, 0.05], [0.02, 0.43, 0.02, 0.045]]) headEllipsoid(ctx, body, [x, y, z], [r, r * 0.9, r], 'bommel', { blend: 0.012 });
    // Laterne in der linken Hand
    if (pose.lantern) lanternShapes(ctx, arms[0].hand);
    // Anker: Hand rechts (Werkzeug), Rücken (Werkzeug auf dem Rücken), Brust (Tiefe)
    ctx.mark('handR', arms[1].hand);
    ctx.mark('elbowR', arms[1].elbow);
    ctx.mark('wristR', arms[1].wrist);
    ctx.mark('back', add(spine(0.25), [0, 0, -0.36]));
    ctx.mark('chest', spine(0.25));
    // Stempel: Gesicht, Schnallen, Taschen, Schnürung
    ctx.face = faceAt(ctx, H([0, -0.05, 0.265]));
    if (dir <= 2 || dir >= 6) for (const leg of legs) stamps.push({ stamp: STAMPS.schnuerung, at: W(add(leg.foot, [0, 0.045, 0.06])), opts: { depth: 0.05 } });
  },
};

// --- Die Leute ----------------------------------------------------------------------------------

/** Stoff aus einer Palettenfarbe (Rampe der eigenen Familie), mit Naht. */
const cloth = (c, below = 2, above = 2, more = {}) => ({ ...rampAround(c, below, above), seam: true, ...more });
/** Stoff aus einer festen Rampe. */
const rampOf = (ramp, base, more = {}) => ({ ramp, base, seam: true, ...more });
/** Strickmuster: jede zweite Doppelreihe eine Stufe dunkler (grob, kein Gries). */
const knit = (p) => (Math.floor(p[1] * 20) & 1 && Math.floor(p[0] * 20 + p[2] * 20) & 1 ? -1 : 0);

/** Die Teile der Leute: stehen, gehen, winken, sitzen. */
const FOLK_PARTS = { base: { anims: ['stehen', 'gehen', 'winken', 'sitzen'] } };
const FOLK_EXPRESSIONS = ['normal', 'froh', 'blinzeln'];

/**
 * Haar auf dem Kopf (Punkt im Kopfrahmen): oben ab `top`, vorn ein Pony ab `fringe` (null: keiner),
 * hinten bis `back`, an den Seiten hinter dem Ohr bis `sides`.
 */
function hairOf({ top = 0.1, fringe = null, back = -0.13, sides = -0.04, zig = 0.025 } = {}) {
  return (l) => {
    const [x, y, z] = l;
    const w = Math.floor((x + 0.5) * 26) & 1;
    if (z > 0.12) return fringe !== null && y > fringe + zig * w ? 'haar' : null;
    if (y > top) return 'haar';
    if (Math.abs(x) > 0.2 && z < -0.05) return y > sides ? 'haar' : null;
    if (z < -0.06) return y > back ? 'haar' : null;
    return null;
  };
}

/** Ohren und Nase (die Nase trägt das Gesicht mit). */
function earsNose(ctx, body, { ear = 'haut', nose = 'haut', noseR = [0.038, 0.033, 0.036] } = {}) {
  for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.285, -0.04, -0.01], [0.04, 0.07, 0.055], ear, { blend: 0.02 });
  headEllipsoid(ctx, body, [0, -0.07, 0.262], noseR, nose, { blend: 0.012, face: true });
}

/** Schirmmütze: Band um den Kopf, runder Deckel, vorn der Schirm (leicht nach unten). */
function visorCap(ctx, body, { top = 'muetze', band = 'band', visor = 'schirm', h = 0.1, lift = 0.17, visorLen = 0.13, wide = 1 } = {}) {
  ctx.box(body.H([0, lift, -0.01]), [0.298 * wide, 0.045, 0.272 * wide], 0.1, band, { ax: body.headAx });
  headEllipsoid(ctx, body, [0, lift + 0.035, -0.02], [0.288 * wide, h, 0.262 * wide], top, { blend: 0.02 });
  ctx.push({ kind: 'box', c: ctx.W(body.H([0, lift - 0.035, 0.265 + visorLen / 2])), h: [0.2 * wide, 0.013, visorLen / 2], r: 0.012, ax: body.headAxes(0.2), mat: visor });
}

/** Ein Rock bzw. Mantelschoß um die Hüften (Ellipsoid, das die Oberschenkel bedeckt). */
function skirt(ctx, body, mat, { drop = 0.1, rr = [0.25, 0.15, 0.2] } = {}) {
  return ctx.ellipsoid(add(body.hip, [0, -drop, 0.01]), rr, mat, { blend: 0.03, part: 'rock' });
}

/** Die Stelle des Gesichts (wie bei Mika) und Stempel für die Augen eines Kindes oder Hundes. */
const FACE_POINT = [0, -0.05, 0.265];

// --- Oma Hilde ------------------------------------------------------------------------------------

/**
 * Oma Hilde, früher Briefträgerin am See: blaue Postmütze mit goldenem Posthorn, der graue Dutt
 * darunter, eine runde Brille; lila Strickjacke mit Zopfmuster und weißen Knöpfen, darüber quer
 * der Riemen der alten Posttasche; roter Rock, graue Strümpfe, braune Schuhe. Ein wenig kleiner und
 * gebeugter als die anderen.
 */
const hilde = {
  size: 0.94,
  expressions: FOLK_EXPRESSIONS,
  parts: FOLK_PARTS,
  materials: {
    haut: cloth(P.h4, 2, 0, { shine: true, seam: false }),
    haar: rampOf([R.s[5], R.s[6], R.s[7], R.s[8], R.s[9]], 3),
    muetze: rampOf([R.b[1], R.b[2], R.b[3], R.b[4], R.b[5]], 2),
    band: rampOf([R.b[0], R.b[1], R.b[2], R.b[3]], 2),
    schirm: rampOf([R.n[2], R.b[0], R.b[1], R.b[2]], 2, { shine: true }),
    jacke: rampOf([R.d[1], R.d[2], P.a2, P.a3], 2, { pattern: knit }),
    blende: rampOf([R.d[0], R.d[1], R.d[2], P.a2], 2),
    tasche: cloth(P.e5, 2, 2),
    gurt: cloth(P.e3, 2, 1),
    rock: cloth(P.r2, 2, 2),
    hose: cloth(P.s5, 2, 2),
    schuh: cloth(P.e2, 2, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const button = (l) => (l[2] > 0.1 && Math.abs(l[0]) < 0.022 ? 'blende' : null);
    const B = {
      ...HUMAN,
      stoop: 0.08,
      torso: [
        { ...HUMAN.torso[0], mat: 'rock', rr: [0.25, 0.13, 0.19] },
        { ...HUMAN.torso[1], mat: 'jacke', matAt: button },
        { ...HUMAN.torso[2], mat: 'jacke', matAt: button },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.06, fringe: 0.1, back: -0.12, sides: -0.07 }) },
      mats: { thigh: 'rock', shin: 'hose', shoe: 'schuh', upper: 'jacke', fore: 'jacke', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms } = body;
    skirt(ctx, body, 'rock', { drop: 0.1, rr: [0.25, 0.16, 0.21] });
    // Kragen der Strickjacke
    ctx.ellipsoid(spine(0.41), [0.16, 0.055, 0.14], 'blende', { pitch: body.stoop });
    // Riemen der Posttasche von der rechten Schulter zur linken Hüfte, die Tasche an der Seite
    const a = add(spine(0.38), [0.17, 0.03, 0.06]);
    const m = add(spine(0.22), [0.0, 0, 0.2]);
    const b = add(spine(0.04), [-0.24, 0, 0.08]);
    ctx.capsule(add(a, [0, 0, -0.15]), a, 0.022, null, 'gurt');
    ctx.capsule(a, m, 0.022, null, 'gurt');
    ctx.capsule(m, b, 0.022, null, 'gurt');
    const bagC = add(spine(-0.02), [-0.28, 0, 0.02]);
    ctx.box(bagC, [0.05, 0.1, 0.13], 0.03, 'tasche', { pitch: body.stoop, matAt: (l) => (l[1] > 0.05 ? 'gurt' : null) });
    // Grauer Dutt hinten, Postmütze
    headEllipsoid(ctx, body, [0, 0.03, -0.29], [0.1, 0.09, 0.07], 'haar', { blend: 0.02 });
    earsNose(ctx, body);
    visorCap(ctx, body, { h: 0.075, lift: 0.17, visorLen: 0.12 });
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    // Stempel: Posthorn an der Mütze, Knöpfe, Abzeichen an der Tasche
    if (dir <= 2 || dir >= 6) stamps.push({ stamp: STAMPS_FOLK.posthorn, at: W(H([0, 0.21, 0.275])), opts: { depth: 0.08 } });
    if (dir <= 1 || dir === 7) for (const y of [0.3, 0.2, 0.1]) stamps.push({ stamp: STAMPS_FOLK.knopfWeiss, at: W(add(spine(y), [0, 0, 0.19])) });
    if (dir <= 1 || dir >= 6) stamps.push({ stamp: STAMPS_FOLK.posthorn, at: W(add(bagC, [-0.05, 0.02, 0.0])), opts: { depth: 0.1 } });
    // Haarnadel im Dutt (von hinten)
    if (dir >= 3 && dir <= 5) stamps.push({ stamp: STAMPS_FOLK.nadel, at: W(H([0.05, 0.08, -0.36])), opts: { need: false } });
    void arms;
  },
};

// --- Baumarkt-Bert -----------------------------------------------------------------------------------

/**
 * Baumarkt-Bert: rote Kappe mit langem Schirm, ein buschiger brauner Bart mit grauen Strähnen; das
 * rot-dunkle Karohemd über dem Bauch, darüber die orange Schürze mit Tasche und Bleistift, die
 * Träger über den Schultern; graue Arbeitshose und feste Stiefel. Breit und gemütlich.
 */
const plaid = (p) => ((Math.floor(p[0] * 11 + 20) + Math.floor(p[1] * 11 + 20)) & 1 ? 0 : -1);
const bert = {
  size: 1.04,
  expressions: FOLK_EXPRESSIONS,
  parts: FOLK_PARTS,
  materials: {
    haut: cloth(P.h2, 1, 2, { shine: true, seam: false }),
    haar: cloth(P.e3, 2, 2),
    bart: rampOf([R.e[1], R.e[2], R.e[3], R.e[4], R.s[6]], 2, { pattern: (p) => (Math.floor(p[0] * 40 + 40) % 3 === 0 ? 1 : 0) }),
    muetze: cloth(P.r3, 2, 1),
    band: cloth(P.r2, 1, 2),
    schirm: cloth(P.r2, 2, 1, { shine: true }),
    hemd: rampOf([R.r[0], R.r[1], R.r[2], R.r[3], R.r[4]], 3, { pattern: plaid }),
    schuerze: rampOf([R.f[2], R.f[3], R.f[4], R.f[5], R.f[6]], 2),
    traeger: rampOf([R.f[1], R.f[2], R.f[3], R.f[4]], 2),
    hose: cloth(P.s3, 2, 2),
    schuh: cloth(P.e2, 2, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    // Die Schürze vorn über dem Bauch, oben als Latz
    const apron = (width) => (l) => (l[2] > 0.05 && Math.abs(l[0]) < width ? 'schuerze' : null);
    const B = {
      ...HUMAN,
      stoop: 0.02,
      torso: [
        { d: 0.04, rr: [0.25, 0.13, 0.2], mat: 'hose', blend: 0.05 },
        { d: 0.19, rr: [0.29, 0.19, 0.25], mat: 'hemd', matAt: apron(0.22) },
        { d: 0.34, rr: [0.29, 0.14, 0.2], mat: 'hemd', part: 'brust', matAt: apron(0.13) },
      ],
      shoulderW: 0.285,
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.05, fringe: null, back: -0.12, sides: -0.04 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'hemd', fore: 'hemd', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    // Träger der Schürze über die Schultern
    for (const side of [-1, 1]) {
      const top = add(spine(0.37), [side * 0.13, 0.05, 0.03]);
      ctx.capsule(add(top, [0, 0, -0.16]), top, 0.02, null, 'traeger');
      ctx.capsule(top, add(spine(0.28), [side * 0.12, 0, 0.17]), 0.02, null, 'traeger');
    }
    // Der Bart: buschig unter dem Mund bis aufs Kinn, die Wangen hinauf
    headEllipsoid(ctx, body, [0, -0.17, 0.17], [0.25, 0.13, 0.12], 'bart', { blend: 0.03, face: true });
    headEllipsoid(ctx, body, [0, -0.26, 0.12], [0.18, 0.08, 0.1], 'bart', { blend: 0.03, face: true });
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.22, -0.08, 0.14], [0.07, 0.1, 0.09], 'bart', { blend: 0.02 });
    earsNose(ctx, body, { noseR: [0.045, 0.04, 0.04] });
    visorCap(ctx, body, { h: 0.1, lift: 0.17, visorLen: 0.17 });
    headEllipsoid(ctx, body, [0, 0.31, -0.02], [0.035, 0.02, 0.035], 'band'); // Knopf oben
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) {
      stamps.push({ stamp: STAMPS_FOLK.schuerzenTasche, at: W(add(spine(0.15), [0, 0, 0.255])) });
      stamps.push({ stamp: STAMPS_FOLK.bleistift, at: W(add(spine(0.21), [0.06, 0, 0.25])), opts: { depth: 0.08 } });
    }
  },
};

// --- Juna ------------------------------------------------------------------------------------------

/**
 * Juna, die den Sender ihres Vaters betreibt: kurzes, verwuscheltes dunkles Haar mit pinker Spange,
 * dicke Kopfhörer mit Bügel; die gelbe Regenjacke mit Reißverschluss, Bauchtasche und weißen
 * Kordeln; ein kleiner grauer Rucksack, aus dem die Antenne mit roter Spitze ragt; Jeans und weiße
 * Turnschuhe mit rotem Streifen.
 */
const juna = {
  size: 0.92,
  expressions: FOLK_EXPRESSIONS,
  parts: FOLK_PARTS,
  materials: {
    haut: cloth(P.h2, 1, 2, { shine: true, seam: false }),
    haar: rampOf([R.n[0], R.n[1], R.n[2], R.n[3], R.n[4]], 2),
    jacke: rampOf([R.f[3], R.f[4], R.f[5], R.f[6], R.f[7]], 3),
    jackeDunkel: rampOf([R.f[2], R.f[3], R.f[4], R.f[5]], 2),
    zipper: { ramp: [R.s[4], R.s[6], R.s[7], R.s[8]], base: 1 },
    kopfhoerer: rampOf([R.s[0], R.s[1], R.s[2], R.s[3], R.s[4]], 2, { shine: true }),
    polster: rampOf([P.a5, P.a6, R.s[9]], 1),
    rucksack: cloth(P.s4, 2, 2),
    antenne: rampOf([R.s[4], R.s[5], R.s[6], R.s[7]], 2, { shine: true }),
    spitze: rampOf([R.f[1], R.f[2], R.f[3], R.f[4]], 2),
    hose: cloth(P.b3, 2, 2),
    schuh: rampOf([R.s[6], R.s[7], R.s[8], R.s[9]], 2, { shine: true }),
    streifen: cloth(P.r3, 1, 1),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const zip = (l) => (l[2] > 0.08 && Math.abs(l[0]) < 0.014 ? 'zipper' : null);
    const belly = (l) => {
      if (l[1] < -0.12) return 'jackeDunkel';
      if (l[2] > 0.1 && l[1] > -0.1 && l[1] < -0.01 && Math.abs(l[0]) < 0.15) return 'jackeDunkel';
      return zip(l);
    };
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'hose' },
        { ...HUMAN.torso[1], rr: [0.25, 0.17, 0.19], mat: 'jacke', matAt: belly },
        { ...HUMAN.torso[2], rr: [0.265, 0.135, 0.18], mat: 'jacke', matAt: zip },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.04, fringe: 0.06, back: -0.12, sides: -0.03, zig: 0.035 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'jacke', fore: 'jacke', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs } = body;
    for (const [i] of legs.entries()) ctx.part(`shoe${i}`).matAt = (l) => (Math.abs(l[0]) > 0.05 && Math.abs(l[1] + 0.005) < 0.013 ? 'streifen' : null);
    // Kragen der Jacke
    ctx.ellipsoid(spine(0.41), [0.16, 0.06, 0.14], 'jackeDunkel', { pitch: body.stoop });
    // Wuschel oben auf dem Kopf
    for (const [x, y, z, r] of [[-0.12, 0.2, 0.05, 0.08], [0.1, 0.21, 0.0, 0.085], [0.0, 0.23, -0.1, 0.09], [-0.05, 0.2, 0.15, 0.07], [0.15, 0.17, 0.13, 0.06]]) headEllipsoid(ctx, body, [x, y, z], [r, r * 0.75, r], 'haar', { blend: 0.02 });
    earsNose(ctx, body);
    // Kopfhörer: zwei dicke Muscheln, der Bügel über den Kopf
    for (const side of [-1, 1]) {
      headEllipsoid(ctx, body, [side * 0.31, -0.03, -0.01], [0.055, 0.095, 0.085], 'kopfhoerer');
      headEllipsoid(ctx, body, [side * 0.36, -0.03, -0.01], [0.012, 0.06, 0.055], 'polster');
    }
    headCapsule(ctx, body, [-0.31, 0.06, -0.02], [-0.18, 0.27, -0.03], 0.025, null, 'kopfhoerer');
    headCapsule(ctx, body, [-0.18, 0.27, -0.03], [0.18, 0.27, -0.03], 0.025, null, 'kopfhoerer');
    headCapsule(ctx, body, [0.18, 0.27, -0.03], [0.31, 0.06, -0.02], 0.025, null, 'kopfhoerer');
    // Kleiner Rucksack, die Antenne ragt mit roter Spitze heraus
    const packC = add(spine(0.22), [0, 0, -0.22]);
    ctx.box(packC, [0.15, 0.14, 0.07], 0.05, 'rucksack', { pitch: body.stoop, matAt: (l) => (l[1] > 0.08 ? 'kopfhoerer' : null) });
    const antA = add(packC, [0.1, 0.12, -0.02]);
    const antB = add(antA, [0.02, 0.5, -0.04]);
    ctx.capsule(antA, antB, 0.012, 0.009, 'antenne');
    ctx.ellipsoid(antB, [0.028, 0.028, 0.028], 'spitze');
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) for (const side of [-1, 1]) stamps.push({ stamp: STAMPS_FOLK.kordel, at: W(add(spine(0.33), [side * 0.05, 0, 0.19])) });
    if (dir <= 2) stamps.push({ stamp: STAMPS_FOLK.spange, at: W(H([0.2, 0.12, 0.2])), opts: { need: false } });
    if (dir >= 6) stamps.push({ stamp: STAMPS_FOLK.spange, at: W(H([0.2, 0.12, 0.2])), opts: { need: false, flip: true } });
  },
};

// --- Dr. Yusuf ----------------------------------------------------------------------------------------

/**
 * Dr. Yusuf, der Arzt: schwarzes, welliges Haar mit grauen Schläfen, ein kurzer Bart, die Brille;
 * der weiße Kittel offen über dem türkisen Hemd, um den Hals das Stethoskop, in der Brusttasche
 * zwei Stifte; dunkle Hose, braune Schuhe.
 */
const yusuf = {
  size: 1.0,
  expressions: FOLK_EXPRESSIONS,
  parts: FOLK_PARTS,
  materials: {
    haut: cloth(P.h1, 1, 2, { shine: true, seam: false }),
    haar: rampOf([R.n[0], R.n[1], R.n[2], R.n[3]], 1, { pattern: (p) => (Math.floor((p[0] + p[2]) * 30) % 3 === 0 ? 1 : 0) }),
    grau: rampOf([R.s[4], R.s[5], R.s[6], R.s[7]], 2),
    bart: rampOf([R.n[0], R.n[1], R.n[2], R.s[4]], 1),
    kittel: rampOf([R.s[5], R.s[7], R.s[8], R.s[9], P.a4], 3),
    kittelSaum: rampOf([R.s[4], R.s[6], R.s[7], R.s[8]], 2),
    hemd: rampOf([R.t[2], P.a5, P.a6], 1),
    stetho: rampOf([R.s[2], R.s[3], R.s[4], R.s[6]], 2, { shine: true }),
    hose: rampOf([R.n[1], R.n[2], R.n[3], R.n[4], R.n[5]], 2),
    schuh: cloth(P.e3, 2, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    // Der Kittel ist vorn offen: in der Mitte das Hemd, daneben die Kanten
    const open = (l) => (l[2] > 0.08 ? (Math.abs(l[0]) < 0.05 ? 'hemd' : Math.abs(l[0]) < 0.07 ? 'kittelSaum' : null) : null);
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'kittel' },
        { ...HUMAN.torso[1], mat: 'kittel', matAt: open },
        { ...HUMAN.torso[2], mat: 'kittel', matAt: open },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: (l) => {
        const h = hairOf({ top: 0.07, fringe: 0.11, back: -0.12, sides: -0.04, zig: 0.02 })(l);
        if (h && Math.abs(l[0]) > 0.22 && l[1] < 0.12 && l[2] > -0.12) return 'grau'; // graue Schläfen
        return h;
      } },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'kittel', fore: 'kittel', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    // Kittelschoß bis über die Oberschenkel, offen in der Mitte (dort sieht man die Hose)
    ctx.ellipsoid(add(body.hip, [0, -0.08, 0.0]), [0.255, 0.13, 0.205], 'kittel', { blend: 0.03, matAt: (l) => (l[2] > 0.1 && Math.abs(l[0]) < 0.045 ? 'hose' : null) });
    ctx.ellipsoid(spine(0.41), [0.16, 0.06, 0.14], 'kittel', { pitch: body.stoop });
    // Welliges Haar oben, ein kurzer Bart ums Kinn
    for (const [x, z] of [[-0.14, 0.05], [0.0, 0.08], [0.14, 0.04], [-0.08, -0.12], [0.1, -0.13]]) headEllipsoid(ctx, body, [x, 0.215, z], [0.09, 0.05, 0.09], 'haar', { blend: 0.02 });
    headEllipsoid(ctx, body, [0, -0.2, 0.16], [0.2, 0.08, 0.1], 'bart', { blend: 0.02, face: true });
    earsNose(ctx, body, { noseR: [0.04, 0.036, 0.038] });
    // Stethoskop: um den Hals, die Schläuche hängen vorn, links das Bruststück
    const neckL = add(spine(0.39), [-0.11, 0.02, 0.1]);
    const neckR = add(spine(0.39), [0.11, 0.02, 0.1]);
    ctx.capsule(add(spine(0.4), [0, 0.03, -0.12]), neckL, 0.016, null, 'stetho');
    ctx.capsule(add(spine(0.4), [0, 0.03, -0.12]), neckR, 0.016, null, 'stetho');
    const endL = add(spine(0.2), [-0.1, 0, 0.2]);
    ctx.capsule(neckL, endL, 0.016, null, 'stetho');
    ctx.capsule(neckR, add(spine(0.26), [0.1, 0, 0.19]), 0.016, null, 'stetho');
    ctx.ellipsoid(add(endL, [0, -0.02, 0.01]), [0.035, 0.035, 0.02], 'stetho');
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) stamps.push({ stamp: STAMPS_FOLK.stifte, at: W(add(spine(0.28), [0.15, 0, 0.17])) });
  },
};

// --- Balduin ---------------------------------------------------------------------------------------------

/**
 * Balduin, der Händler übers Wasser – ein Seebär: braune Schiebermütze, ein mächtiger grauer Bart
 * bis auf die Brust, darin ein breites Grinsen mit Goldzahn, eine rote Nase vom Wind auf dem See;
 * roter Schal, ein Ende hängt vorn herab; dunkelblauer Mantel mit Messingknöpfen bis über die
 * Knie; ein riesiger Rucksack mit Deckenrolle obenauf und einer Pfanne an der Seite.
 */
const balduin = {
  size: 1.05,
  expressions: ['grinsen', 'blinzeln'],
  parts: {
    base: { anims: ['stehen', 'gehen', 'winken', 'sitzen'] },
    gesten: { anims: ['muetze', 'reiben', 'daumen', 'schulter', 'bart'] },
  },
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    nase: rampOf([R.r[2], R.r[3], R.r[4], R.d[6]], 2, { shine: true }),
    haar: rampOf([R.s[5], R.s[6], R.s[7], R.s[8]], 2),
    bart: rampOf([R.s[5], R.s[6], R.s[7], R.s[8], R.s[9]], 2, { pattern: (p) => (Math.floor(p[0] * 40 + 40) % 3 === 0 ? 1 : 0) }),
    muetze: rampOf([R.e[1], R.e[2], R.e[3], R.e[4], R.e[5]], 3, { pattern: (p) => ((Math.floor(p[0] * 20 + 20) + Math.floor(p[2] * 20 + 20)) % 4 === 0 ? 1 : 0) }),
    schirm: rampOf([R.e[0], R.e[1], R.e[2], R.e[3]], 2),
    schal: rampOf([R.r[0], R.r[1], R.r[2], R.r[3], R.r[4]], 3, { pattern: (p) => (Math.floor(p[1] * 20 + 20) % 3 === 0 ? -1 : 0) }),
    mantel: rampOf([R.n[2], R.n[3], R.b[0], R.b[1], R.b[2]], 3),
    rucksack: rampOf([R.e[3], R.e[4], R.e[5], R.e[6], R.e[7]], 3),
    rolle: rampOf([R.t[1], R.t[2], P.a5, P.a6], 2, { pattern: (p) => (Math.floor(p[0] * 20 + 20) % 3 === 0 ? 1 : 0) }),
    pfanne: rampOf([R.s[0], R.s[1], R.s[2], R.s[3], R.s[5]], 2, { shine: true }),
    gurt: cloth(P.e2, 1, 2),
    hose: cloth(P.e3, 2, 2),
    schuh: rampOf([R.n[0], R.e[0], R.e[1], R.e[2]], 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const B = {
      ...HUMAN,
      torso: [
        { d: 0.04, rr: [0.25, 0.13, 0.2], mat: 'mantel', blend: 0.05 },
        { d: 0.19, rr: [0.28, 0.18, 0.21], mat: 'mantel' },
        { d: 0.33, rr: [0.29, 0.14, 0.2], mat: 'mantel', part: 'brust' },
      ],
      shoulderW: 0.285,
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.08, fringe: null, back: -0.15, sides: -0.07 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'mantel', fore: 'mantel', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    // Mantelschoß bis übers Knie
    ctx.ellipsoid(add(body.hip, [0, -0.12, 0.0]), [0.265, 0.17, 0.215], 'mantel', { blend: 0.03, part: 'rock' });
    // Riesiger Rucksack, obenauf die Deckenrolle, an der Seite die Pfanne
    const packC = add(spine(0.2), [0, 0.05, -0.3]);
    ctx.box(packC, [0.26, 0.27, 0.13], 0.07, 'rucksack', { pitch: body.stoop, matAt: (l) => (Math.abs(l[1] - 0.02) < 0.02 ? 'gurt' : null) });
    const rollA = W(add(packC, [-0.2, 0.32, -0.02]));
    const rollB = W(add(packC, [0.2, 0.32, -0.02]));
    ctx.push({ kind: 'capsule', a: rollA, b: rollB, r: 0.085, r1: 0.085, mat: 'rolle' });
    ctx.ellipsoid(add(packC, [0.3, -0.05, 0.02]), [0.02, 0.11, 0.11], 'pfanne');
    ctx.capsule(add(packC, [0.31, 0.06, 0.02]), add(packC, [0.31, 0.2, 0.02]), 0.016, null, 'gurt');
    // Tragegurte vorn
    for (const side of [-1, 1]) {
      const top = add(spine(0.37), [side * 0.16, 0.05, 0.02]);
      ctx.capsule(add(top, [0, 0, -0.15]), top, 0.024, null, 'gurt');
      ctx.capsule(top, add(spine(0.15), [side * 0.2, 0, 0.17]), 0.022, null, 'gurt');
    }
    // Roter Schal, ein Ende hängt vorn herab
    ctx.ellipsoid(spine(0.41), [0.2, 0.07, 0.17], 'schal', { pitch: body.stoop });
    ctx.capsule(add(spine(0.38), [-0.1, 0, 0.15]), add(spine(0.14), [-0.13, 0, 0.21]), 0.04, 0.035, 'schal');
    // Der Bart: mächtig, bis auf die Brust; die rote Nase
    headEllipsoid(ctx, body, [0, -0.17, 0.17], [0.27, 0.15, 0.13], 'bart', { blend: 0.03, face: true });
    headEllipsoid(ctx, body, [0, -0.3, 0.13], [0.21, 0.12, 0.11], 'bart', { blend: 0.03, face: true });
    headEllipsoid(ctx, body, [0, -0.4, 0.11], [0.12, 0.07, 0.08], 'bart', { blend: 0.03 });
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.23, -0.07, 0.12], [0.07, 0.11, 0.09], 'bart', { blend: 0.02 });
    earsNose(ctx, body, { nose: 'nase', noseR: [0.05, 0.045, 0.045] });
    // Schiebermütze: flach, nach vorn gezogen, mit kurzem Schirm und Knopf
    ctx.push({ kind: 'ellipsoid', c: ctx.W(H([0, 0.2, 0.02])), rr: [0.31, 0.085, 0.3], ax: body.headAxes(0.14), mat: 'muetze', blend: 0.02 });
    ctx.push({ kind: 'box', c: ctx.W(H([0, 0.14, 0.31])), h: [0.19, 0.014, 0.055], r: 0.012, ax: body.headAxes(0.3), mat: 'schirm' });
    headEllipsoid(ctx, body, [0, 0.29, 0.0], [0.03, 0.02, 0.03], 'schirm');
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) for (const y of [0.26, 0.16, 0.06, -0.04]) stamps.push({ stamp: STAMPS_FOLK.messing, at: W(add(spine(y), [0.04, 0, 0.2])) });
  },
};

// --- Knopf -------------------------------------------------------------------------------------------------

/**
 * Knopf, der struppige Hund: braunes Fell mit hellen und grauen Zotteln, heller Bauch und Brustlatz,
 * dunkle Schlappohren, eine helle Schwanzspitze, das rote Halsband mit dem großen goldenen Knopf –
 * daher der Name.
 */
const KNOPF_EYES = {
  S: ['k.....k', 'w.....w'],
  SO: ['k...k.', 'w...w.'],
  O: ['..k', '..w'],
};
const knopf = {
  size: 1.3,
  dog: true,
  expressions: [],
  shadowSize: { x: 0.26, z: 0.4 },
  parts: { base: { anims: ['stehen', 'traben', 'sitzen', 'bellen'] } },
  materials: {
    fell: rampOf([R.e[2], R.e[3], R.e[4], R.e[5], R.e[6]], 3, { pattern: (p) => {
      const h = hash(Math.floor(p[0] * 20 + 99), Math.floor(p[1] * 20 + 99), Math.floor(p[2] * 20 + 99));
      return h < 0.08 ? 2 : h < 0.3 ? -1 : 0;
    } }),
    bauch: rampOf([R.e[4], R.e[5], R.e[6], R.e[7]], 2),
    pfote: rampOf([R.e[1], R.e[2], R.e[3], R.e[4]], 2),
    schnauze: rampOf([R.e[4], R.e[5], R.e[6], R.e[7], R.e[8]], 3),
    ohr: rampOf([R.e[1], R.e[2], R.e[3], R.e[4]], 2),
    maul: rampOf([R.r[0], R.r[1], P.a0], 1),
    schwanzspitze: rampOf([R.e[5], R.e[6], R.e[7], R.e[8]], 2),
    halsband: rampOf([R.r[0], R.r[1], R.r[2], R.r[3], R.r[4]], 3),
  },
  build(ctx) {
    const { W, stamps, dir, pose } = ctx;
    const M = { fell: 'fell', bauch: 'bauch', pfote: 'pfote', schnauze: 'schnauze', ohr: 'ohr', maul: 'maul', schwanzspitze: 'schwanzspitze' };
    const res = quadruped(ctx, DOG, pose, M);
    // Halsband und der goldene Knopf
    const collar = add(res.headC, [0, -0.1, -0.06]);
    ctx.ellipsoid(collar, [0.085, 0.03, 0.08], 'halsband', { pitch: -0.4 });
    const face = faceAt(ctx, res.H([0, 0.015, 0.1]), 0.05);
    if (face) {
      stamps.push({ stamp: { rows: KNOPF_EYES[face.view], legend: { k: P.n0, w: P.s8 } }, at: face.at, opts: { flip: face.flip, depth: 0.12 } });
      stamps.push({ stamp: STAMPS_FOLK.nase, at: W(res.H([0, -0.01, 0.2])), opts: { depth: 0.1 } });
    }
    if (dir <= 2 || dir >= 6) stamps.push({ stamp: STAMPS_FOLK.knopfGold, at: W(add(collar, [0, -0.03, 0.08])), opts: { need: false } });
  },
};

// --- Die Wanderer (F4, zweite Stufe) ------------------------------------------------------------
// Vorbild sind ihre Voxel-Figuren (survivorModels.js, M27/M29): jede behält das Merkmal, das man
// schon von Weitem liest, und bekommt ein paar kleine Dinge dazu.

/** Gemeinsam: Gesichter, Teile (stehen, gehen, winken, sitzen). */
const WANDER = { expressions: FOLK_EXPRESSIONS, parts: FOLK_PARTS };

/** Punkt zwischen a und b (t = 0 … 1). */
const along = (a, b, t) => add(a, mul(sub(b, a), t));

/** Die Hosenbeine unten weit (Schlaghose, Wathose): ein Kegel vom Schienbein zum Knöchel. */
function flare(ctx, legs, mat, r0, r1, from = 0.5) {
  for (const leg of legs) ctx.capsule(along(leg.knee, leg.ankle, from), add(leg.ankle, [0, 0.01, 0]), r0, r1, mat);
}

/** Ein flacher Rand um den Kopf (Hutkrempe), geneigt um `tilt` (vorn runter positiv). */
function brim(ctx, body, l, rr, mat, tilt = 0, more = {}) {
  return ctx.push({ kind: 'ellipsoid', c: ctx.W(body.H(l)), rr, ax: body.headAxes(tilt), mat, ...more });
}

/** Ein Zopf als Kette aus Kapseln im Kopfrahmen; `tie` legt ein Band ans Ende. */
function braid(ctx, body, points, r, mat, tie = null) {
  for (let i = 0; i + 1 < points.length; i++) headCapsule(ctx, body, points[i], points[i + 1], r * (1 - i * 0.08), r * (1 - (i + 1) * 0.08), mat);
  if (tie) headEllipsoid(ctx, body, points[points.length - 1], [r * 1.05, r * 0.6, r * 1.05], tie);
}

/** Streifen quer (in Bildhöhe): jede `n`-te Lage aus `stripe`. */
const rings = (stripe, n = 3, k = 13) => (l, p) => (Math.floor(p[1] * k + 40) % n === 0 ? stripe : null);

// --- Hannes ---------------------------------------------------------------------------------------

/**
 * Hannes, Zimmermann auf der Walz: der breite schwarze Hut, ein kurzer brauner Vollbart; die schwarze
 * Cordweste mit zwei Reihen Perlmuttknöpfen über der weißen Staude, das rote Halstuch mit Knoten;
 * die weite schwarze Schlaghose der Kluft und feste Stiefel.
 */
const hannes = {
  ...WANDER,
  size: 1.02,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: cloth(P.e2, 1, 2),
    bart: rampOf([R.e[1], R.e[2], R.e[3], R.e[4]], 1, { pattern: (p) => (Math.floor(p[0] * 40 + 40) % 3 === 0 ? 1 : 0) }),
    hut: rampOf([R.n[0], R.n[1], R.n[2], R.n[3]], 1, { shine: true }),
    hutband: rampOf([R.s[1], R.s[2], R.s[3], R.s[4]], 1),
    hemd: rampOf([R.s[6], R.s[7], R.s[8], R.s[9]], 2),
    weste: rampOf([R.n[0], R.n[1], R.n[2], R.n[3]], 2, { pattern: (p) => (Math.floor(p[0] * 20 + 40) & 1 ? -1 : 0) }),
    tuch: rampOf([R.r[0], R.r[1], R.r[2], R.r[3], R.r[4]], 3),
    hose: rampOf([R.n[0], R.n[1], R.n[2], R.n[3]], 1, { pattern: (p) => (Math.floor(p[0] * 20 + 40) & 1 ? -1 : 0) }),
    schuh: cloth(P.e1, 1, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    // Die Weste ist vorn offen: in der Mitte die weiße Staude
    const vest = (l) => (l[2] > 0.08 && Math.abs(l[0]) < 0.045 ? 'hemd' : null);
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'hose' },
        { ...HUMAN.torso[1], mat: 'weste', matAt: vest },
        { ...HUMAN.torso[2], mat: 'weste', matAt: vest },
      ],
      shoulderW: 0.28,
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.06, fringe: null, back: -0.12, sides: -0.05 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'hemd', fore: 'hemd', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs } = body;
    flare(ctx, legs, 'hose', 0.08, 0.105, 0.45);
    // Rotes Halstuch mit Knoten und zwei Zipfeln
    ctx.ellipsoid(spine(0.41), [0.15, 0.05, 0.135], 'tuch', { pitch: body.stoop });
    ctx.ellipsoid(add(spine(0.37), [0, 0, 0.15]), [0.045, 0.04, 0.035], 'tuch');
    for (const side of [-1, 1]) ctx.capsule(add(spine(0.36), [side * 0.02, 0, 0.16]), add(spine(0.28), [side * 0.05, 0, 0.175]), 0.026, 0.014, 'tuch');
    // Kurzer, dichter Vollbart
    headEllipsoid(ctx, body, [0, -0.16, 0.17], [0.24, 0.11, 0.11], 'bart', { blend: 0.03, face: true });
    headEllipsoid(ctx, body, [0, -0.23, 0.12], [0.16, 0.06, 0.09], 'bart', { blend: 0.03, face: true });
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.22, -0.07, 0.12], [0.06, 0.09, 0.08], 'bart', { blend: 0.02 });
    earsNose(ctx, body, { noseR: [0.042, 0.037, 0.038] });
    // Der breite Hut: Krempe, darauf die Krone mit Band
    brim(ctx, body, [0, 0.235, -0.04], [0.37, 0.017, 0.33], 'hut', 0.08);
    headEllipsoid(ctx, body, [0, 0.31, -0.03], [0.225, 0.095, 0.205], 'hut', { blend: 0.02, matAt: (l) => (l[1] < -0.045 ? 'hutband' : null) });
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) for (const y of [0.31, 0.23, 0.15]) for (const side of [-1, 1]) stamps.push({ stamp: STAMPS_FOLK.knopfWeiss, at: W(add(spine(y), [side * 0.075, 0, 0.19])) });
  },
};

// --- Clara ----------------------------------------------------------------------------------------

/**
 * Clara, Mechanikerin: roter Pferdeschwanz hoch am Hinterkopf, die Schweißbrille auf der Stirn; der
 * blaue Overall mit Reißverschluss und Gürtel, ein gelber Flicken, die Brusttasche mit dem
 * Schraubenschlüssel, an der Hüfte ein roter Lappen.
 */
const clara = {
  ...WANDER,
  size: 0.98,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: rampOf([R.r[1], R.r[2], R.r[3], R.r[4], R.f[3]], 2),
    gummi: rampOf([R.f[4], R.f[5], R.f[6]], 1),
    overall: rampOf([R.b[0], R.b[1], R.b[2], R.b[3], R.b[4]], 2),
    overallDunkel: rampOf([R.n[3], R.b[0], R.b[1], R.b[2]], 2),
    zipper: { ramp: [R.s[4], R.s[6], R.s[7], R.s[8]], base: 1 },
    gurt: cloth(P.e2, 1, 2),
    brille: rampOf([R.s[1], R.s[2], R.s[3], R.s[4]], 2, { shine: true }),
    glas: rampOf([R.t[4], P.a6, R.s[9]], 1, { shine: true }),
    lappen: rampOf([R.r[2], R.r[3], R.r[4]], 1),
    schuh: cloth(P.e2, 2, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const zip = (l) => (l[2] > 0.08 && Math.abs(l[0]) < 0.014 ? 'zipper' : null);
    const belt = (l) => (l[1] < -0.13 ? 'gurt' : zip(l));
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'overall' },
        { ...HUMAN.torso[1], mat: 'overall', matAt: belt },
        { ...HUMAN.torso[2], mat: 'overall', matAt: zip },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.04, fringe: 0.09, back: -0.12, sides: -0.03 }) },
      mats: { thigh: 'overall', shin: 'overall', shoe: 'schuh', upper: 'overall', fore: 'overall', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms } = body;
    // Ärmel hochgekrempelt (dunkler Umschlag)
    for (const a of arms) ctx.capsule(along(a.elbow, a.wrist, 0.55), along(a.elbow, a.wrist, 0.75), 0.068, 0.064, 'overallDunkel');
    ctx.ellipsoid(spine(0.41), [0.16, 0.055, 0.14], 'overallDunkel', { pitch: body.stoop });
    // Lappen an der linken Hüfte
    ctx.capsule(add(spine(0.06), [-0.24, 0, 0.06]), add(spine(-0.1), [-0.26, 0, 0.08]), 0.035, 0.03, 'lappen');
    // Hoher Pferdeschwanz mit Haargummi
    braid(ctx, body, [[0, 0.2, -0.2], [0, 0.12, -0.33], [0, -0.04, -0.37], [0, -0.16, -0.34]], 0.07, 'haar');
    headEllipsoid(ctx, body, [0, 0.2, -0.22], [0.06, 0.05, 0.05], 'gummi');
    earsNose(ctx, body);
    // Schweißbrille auf der Stirn: Band ringsum, vorn zwei runde Gläser
    ctx.box(H([0, 0.135, -0.01]), [0.296, 0.03, 0.27], 0.12, 'gurt', { ax: body.headAx });
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.11, 0.14, 0.255], [0.07, 0.062, 0.04], 'brille', { matAt: (l) => (l[2] > 0.0 && Math.hypot(l[0], l[1]) < 0.042 ? 'glas' : null) });
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) {
      stamps.push({ stamp: STAMPS_FOLK.tasche, at: W(add(spine(0.27), [0.13, 0, 0.17])) });
      stamps.push({ stamp: STAMPS_FOLK.schluessel, at: W(add(spine(0.3), [0.13, 0, 0.18])), opts: { depth: 0.08 } });
      stamps.push({ stamp: STAMPS_FOLK.flicken, at: W(add(spine(0.22), [-0.13, 0, 0.19])) });
    }
  },
};

// --- Lotte ----------------------------------------------------------------------------------------

/**
 * Lotte, Laternenmacherin: blonde Zöpfe mit mintgrünen Schleifen; der rosa Mantel mit Knebelknöpfen
 * bis übers Knie, ein langer bunter Strickschal, dessen eines Ende vorn bis zur Hüfte hängt; an der
 * Hüfte eine kleine Laterne, die nachts leuchtet; lila Strumpfhose, braune Schuhe.
 */
const SCARF = ['schal1', 'schal2', 'schal3', 'schal4'];
const lotte = {
  ...WANDER,
  size: 0.95,
  materials: {
    haut: cloth(P.h4, 2, 0, { shine: true, seam: false }),
    haar: rampOf([R.e[6], R.e[7], R.e[8], R.e[9]], 2, { pattern: (p) => (Math.floor(p[1] * 20 + 40) % 3 === 0 ? -1 : 0) }),
    schleife: rampOf([R.t[4], P.a6, R.s[9]], 1),
    mantel: rampOf([R.d[4], R.d[5], P.a0, P.a1], 2),
    mantelDunkel: rampOf([R.d[3], R.d[4], R.d[5], P.a0], 2),
    knebel: rampOf([R.s[7], R.s[8], R.s[9]], 1),
    schal1: rampOf([R.f[5], R.f[6], R.f[7]], 1),
    schal2: rampOf([R.t[4], P.a6, R.s[9]], 1),
    schal3: rampOf([R.f[3], R.f[4], R.f[5]], 1),
    schal4: rampOf([P.a2, P.a3, R.s[9]], 1),
    strumpf: rampOf([R.d[1], R.d[2], R.d[3], R.d[4]], 1),
    schuh: cloth(P.e2, 2, 2, { shine: true }),
    ...LANTERN_MATERIALS,
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'mantel' },
        { ...HUMAN.torso[1], mat: 'mantel' },
        { ...HUMAN.torso[2], mat: 'mantel' },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.05, fringe: 0.1, back: -0.12, sides: -0.06 }) },
      mats: { thigh: 'mantel', shin: 'strumpf', shoe: 'schuh', upper: 'mantel', fore: 'mantel', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms } = body;
    // Mantelschoß bis übers Knie, unten ein dunkler Saum
    skirt(ctx, body, 'mantel', { drop: 0.13, rr: [0.255, 0.18, 0.21] });
    for (const a of arms) ctx.capsule(along(a.elbow, a.wrist, 0.7), a.wrist, 0.066, 0.062, 'mantelDunkel');
    // Der Strickschal: dick um den Hals, ein Ende hängt vorn bis zur Hüfte (Streifen in vier Farben)
    const stripes = (l, p) => SCARF[((Math.floor(p[1] * 16 + 40) % 4) + 4) % 4];
    ctx.ellipsoid(spine(0.41), [0.19, 0.075, 0.17], 'schal1', { pitch: body.stoop, matAt: (l) => SCARF[((Math.floor((Math.atan2(l[0], l[2]) / Math.PI) * 6 + 6) % 4) + 4) % 4] });
    ctx.capsule(add(spine(0.38), [0.08, 0, 0.15]), add(spine(0.02), [0.11, 0, 0.21]), 0.05, 0.045, 'schal1', { matAt: stripes });
    // Zöpfe hinter den Ohren mit Schleifen
    for (const side of [-1, 1]) braid(ctx, body, [[side * 0.26, 0.0, -0.09], [side * 0.29, -0.16, -0.07], [side * 0.3, -0.31, -0.04]], 0.058, 'haar', 'schleife');
    earsNose(ctx, body);
    // Kleine Laterne an der linken Hüfte (leuchtet nachts)
    const c = add(body.hip, [-0.3, -0.02, 0.1]);
    ctx.box(c, [0.038, 0.05, 0.038], 0.012, 'glas', { matAt: (l) => (Math.abs(l[1]) > 0.04 ? 'rahmen' : null), part: 'laterne' });
    ctx.capsule(add(c, [0, 0.055, 0]), add(c, [0, 0.085, 0]), 0.03, 0.014, 'dach');
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) for (const y of [0.3, 0.2, 0.1]) stamps.push({ stamp: STAMPS_FOLK.knebel, at: W(add(spine(y), [-0.03, 0, 0.2])) });
  },
};

// --- Greta ----------------------------------------------------------------------------------------

/**
 * Greta, Jägerin: der grüne Filzhut mit Feder, kurzes graues Haar mit einem Knoten im Nacken; die
 * Lodenjacke mit Knopfleiste und Taschen, das Fernglas am Riemen vor der Brust; Kniebundhose,
 * graue Wollstrümpfe, schwere Stiefel.
 */
const greta = {
  ...WANDER,
  size: 0.97,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: rampOf([R.s[4], R.s[5], R.s[6], R.s[7], R.s[8]], 3),
    hut: rampOf([R.t[0], R.t[1], R.t[2], R.t[3]], 2),
    hutband: rampOf([R.n[0], R.t[0], R.t[1]], 1),
    feder: rampOf([R.s[7], R.s[8], R.s[9]], 2),
    federSpitze: rampOf([R.n[1], R.n[2], R.n[3]], 1),
    jacke: rampOf([R.t[1], R.t[2], R.t[3], R.t[4]], 2, { pattern: (p) => (hash(Math.floor(p[0] * 20 + 99), Math.floor(p[1] * 20 + 99), Math.floor(p[2] * 20 + 99)) < 0.18 ? -1 : 0) }),
    jackeDunkel: rampOf([R.t[0], R.t[1], R.t[2]], 1),
    glas: rampOf([R.s[1], R.s[2], R.s[3], R.s[5]], 2, { shine: true }),
    gurt: cloth(P.e2, 1, 2),
    hose: cloth(P.e4, 2, 2),
    strumpf: rampOf([R.s[4], R.s[5], R.s[6], R.s[7]], 2, { pattern: knit }),
    schuh: cloth(P.e2, 2, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const placket = (l) => (l[2] > 0.08 && Math.abs(l[0]) < 0.02 ? 'jackeDunkel' : null);
    const hem = (l) => (l[1] < -0.12 ? 'jackeDunkel' : placket(l));
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'hose' },
        { ...HUMAN.torso[1], mat: 'jacke', matAt: hem },
        { ...HUMAN.torso[2], mat: 'jacke', matAt: placket },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.05, fringe: 0.12, back: -0.15, sides: -0.07 }) },
      mats: { thigh: 'hose', shin: 'strumpf', shoe: 'schuh', upper: 'jacke', fore: 'jacke', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs } = body;
    // Die Kniebundhose endet unter dem Knie
    for (const leg of legs) ctx.capsule(leg.knee, along(leg.knee, leg.ankle, 0.3), 0.09, 0.085, 'hose');
    ctx.ellipsoid(spine(0.41), [0.16, 0.06, 0.14], 'jackeDunkel', { pitch: body.stoop });
    // Fernglas am Riemen vor der Brust
    for (const side of [-1, 1]) ctx.capsule(add(spine(0.4), [side * 0.1, 0.02, 0.08]), add(spine(0.24), [side * 0.07, 0, 0.21]), 0.014, null, 'gurt');
    for (const side of [-1, 1]) ctx.capsule(add(spine(0.24), [side * 0.05, 0, 0.225]), add(spine(0.16), [side * 0.05, 0, 0.225]), 0.04, 0.042, 'glas');
    // Knoten im Nacken, Filzhut mit schmaler Krempe, Band und Feder
    headEllipsoid(ctx, body, [0, -0.1, -0.29], [0.09, 0.08, 0.07], 'haar', { blend: 0.02 });
    earsNose(ctx, body);
    brim(ctx, body, [0, 0.19, -0.02], [0.35, 0.016, 0.32], 'hut');
    headEllipsoid(ctx, body, [0, 0.28, -0.02], [0.225, 0.11, 0.205], 'hut', { blend: 0.02, matAt: (l) => (l[1] < -0.06 ? 'hutband' : null) });
    headCapsule(ctx, body, [0.2, 0.24, -0.06], [0.27, 0.41, -0.19], 0.022, 0.012, 'feder');
    headEllipsoid(ctx, body, [0.275, 0.43, -0.2], [0.014, 0.02, 0.014], 'federSpitze');
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) for (const y of [0.29, 0.19, 0.09]) stamps.push({ stamp: STAMPS_FOLK.hornknopf, at: W(add(spine(y), [0, 0, 0.2])) });
  },
};

// --- Fiete ----------------------------------------------------------------------------------------

/**
 * Fiete, der alte Fischer: der gelbe Südwester (hinten lang), weißes Haar und ein weißer Vollbart,
 * die Pfeife im Mundwinkel; der dunkelblaue Fischerpullover, darüber die grüne Wathose mit Trägern
 * bis zur Brust, grüne Gummistiefel.
 */
const fiete = {
  ...WANDER,
  size: 1.0,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: rampOf([R.s[6], R.s[7], R.s[8], R.s[9]], 2),
    bart: rampOf([R.s[6], R.s[7], R.s[8], R.s[9]], 2, { pattern: (p) => (Math.floor(p[0] * 40 + 40) % 3 === 0 ? 1 : 0) }),
    hut: rampOf([R.f[4], R.f[5], R.f[6], R.f[7], R.f[8]], 2, { shine: true }),
    pulli: rampOf([R.n[2], R.n[3], R.n[4], R.n[5]], 1, { pattern: knit }),
    wathose: rampOf([R.g[1], R.g[2], R.g[3], R.g[4]], 2, { shine: true }),
    traeger: rampOf([R.g[0], R.g[1], R.g[2]], 1),
    stiefel: rampOf([R.g[1], R.g[2], R.g[3], R.g[4]], 1, { shine: true }),
    pfeife: rampOf([R.e[1], R.e[2], R.e[3], R.e[4]], 1),
    glut: { ramp: [R.f[2], R.f[3], R.f[4]], base: 1, glow: true },
  },
  build(ctx) {
    const { dir } = ctx;
    const bib = (l) => (l[2] > 0.04 && l[1] < 0.0 && Math.abs(l[0]) < 0.16 ? 'wathose' : null);
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'wathose' },
        { ...HUMAN.torso[1], mat: 'wathose' },
        { ...HUMAN.torso[2], mat: 'pulli', matAt: bib },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.05, fringe: null, back: -0.12, sides: -0.07 }) },
      mats: { thigh: 'wathose', shin: 'wathose', shoe: 'stiefel', upper: 'pulli', fore: 'pulli', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs } = body;
    flare(ctx, legs, 'stiefel', 0.088, 0.095, 0.4); // die Stiefel reichen bis übers Schienbein
    ctx.ellipsoid(spine(0.41), [0.17, 0.065, 0.15], 'pulli', { pitch: body.stoop });
    for (const side of [-1, 1]) {
      const top = add(spine(0.37), [side * 0.14, 0.04, 0.0]);
      ctx.capsule(add(top, [0, 0, -0.15]), top, 0.02, null, 'traeger');
      ctx.capsule(top, add(spine(0.27), [side * 0.13, 0, 0.17]), 0.02, null, 'traeger');
    }
    // Weißer Vollbart, die Pfeife im rechten Mundwinkel
    headEllipsoid(ctx, body, [0, -0.17, 0.17], [0.26, 0.13, 0.12], 'bart', { blend: 0.03, face: true });
    headEllipsoid(ctx, body, [0, -0.28, 0.12], [0.18, 0.08, 0.1], 'bart', { blend: 0.03, face: true });
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.22, -0.07, 0.13], [0.07, 0.1, 0.09], 'bart', { blend: 0.02 });
    earsNose(ctx, body, { noseR: [0.045, 0.04, 0.04] });
    headCapsule(ctx, body, [0.07, -0.14, 0.28], [0.16, -0.19, 0.36], 0.013, null, 'pfeife');
    headEllipsoid(ctx, body, [0.17, -0.15, 0.37], [0.032, 0.04, 0.032], 'pfeife');
    if (dir !== 4) headEllipsoid(ctx, body, [0.17, -0.11, 0.37], [0.02, 0.008, 0.02], 'glut');
    // Südwester: runde Kappe, die Krempe vorn kurz und hinten lang heruntergezogen
    headEllipsoid(ctx, body, [0, 0.19, -0.03], [0.3, 0.13, 0.28], 'hut', { blend: 0.02 });
    brim(ctx, body, [0, 0.11, -0.09], [0.33, 0.02, 0.35], 'hut', -0.32);
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
  },
};

// --- Ida ------------------------------------------------------------------------------------------

/**
 * Ida, die Försterin: die orange Strickmütze mit Bommel, ein langer brauner Zopf über dem Rücken; die
 * grüne Jacke mit orangen Warnstreifen um Arme und Brust; dunkle Hose, Stiefel, am Gürtel ein kleines
 * Beil.
 */
const ida = {
  ...WANDER,
  size: 0.98,
  materials: {
    haut: cloth(P.h4, 2, 0, { shine: true, seam: false }),
    haar: rampOf([R.e[1], R.e[2], R.e[3], R.e[4]], 2, { pattern: (p) => (Math.floor(p[1] * 20 + 40) % 3 === 0 ? -1 : 0) }),
    muetze: rampOf([R.f[1], R.f[2], R.f[3], R.f[4]], 2, { pattern: knit }),
    bund: rampOf([R.f[0], R.f[1], R.f[2], R.f[3]], 2),
    bommel: rampOf([R.f[4], R.f[5], R.f[6], R.f[7]], 2, { pattern: (p) => ((Math.floor(p[0] * 50) * 7 + Math.floor(p[1] * 50) * 3) % 5 === 0 ? -1 : 0) }),
    jacke: rampOf([R.g[2], R.g[3], R.g[4], R.g[5]], 2),
    jackeDunkel: rampOf([R.g[1], R.g[2], R.g[3]], 1),
    warn: rampOf([R.f[3], R.f[4], R.f[5], R.f[6]], 1, { shine: true }),
    hose: rampOf([R.t[0], R.t[1], R.t[2]], 1),
    schuh: cloth(P.e2, 2, 2, { shine: true }),
    stiel: rampOf([R.e[4], R.e[5], R.e[6], R.e[7]], 2),
    eisen: rampOf([R.s[3], R.s[4], R.s[5], R.s[7]], 2, { shine: true }),
  },
  build(ctx) {
    const warn = (l) => (Math.abs(l[1] + 0.01) < 0.022 ? 'warn' : null); // Warnstreifen quer über die Brust
    const zip = (l) => (l[2] > 0.08 && Math.abs(l[0]) < 0.014 ? 'jackeDunkel' : null);
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'hose' },
        { ...HUMAN.torso[1], mat: 'jacke', matAt: (l) => (l[1] < -0.13 ? 'jackeDunkel' : zip(l)) },
        { ...HUMAN.torso[2], mat: 'jacke', matAt: (l) => warn(l) || zip(l) },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.04, fringe: 0.09, back: -0.12, sides: -0.05 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'jacke', fore: 'jacke', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms } = body;
    // Warnstreifen um die Oberarme
    for (const a of arms) ctx.capsule(along(a.shoulder, a.elbow, 0.55), along(a.shoulder, a.elbow, 0.72), 0.078, 0.076, 'warn');
    ctx.ellipsoid(spine(0.41), [0.16, 0.06, 0.14], 'jackeDunkel', { pitch: body.stoop });
    // Langer Zopf über den Rücken
    braid(ctx, body, [[0, 0.02, -0.25], [0, -0.2, -0.31], [0, -0.42, -0.3], [0, -0.6, -0.26]], 0.06, 'haar', 'bund');
    earsNose(ctx, body);
    // Strickmütze: gerippter Bund, Kuppel, Bommel
    const ribs = (l) => (Math.floor((Math.abs(l[0]) > 0.24 ? l[2] : l[0]) * 40 + 40) & 1 ? 'bund' : 'muetze');
    ctx.box(H([0, 0.17, -0.01]), [0.297, 0.05, 0.27], 0.12, 'bund', { ax: body.headAx, matAt: ribs });
    headEllipsoid(ctx, body, [0, 0.21, -0.02], [0.27, 0.12, 0.243], 'muetze', { blend: 0.02 });
    for (const [x, y, z, r] of [[0, 0.36, -0.03, 0.085], [-0.045, 0.35, 0.0, 0.05], [0.05, 0.37, -0.06, 0.05]]) headEllipsoid(ctx, body, [x, y, z], [r, r * 0.9, r], 'bommel', { blend: 0.012 });
    // Kleines Beil am Gürtel rechts
    const hip = add(body.hip, [0.25, 0.02, 0.04]);
    ctx.capsule(add(hip, [0, 0.07, 0]), add(hip, [0, -0.14, 0.02]), 0.016, null, 'stiel');
    ctx.box(add(hip, [0, 0.07, 0.045]), [0.012, 0.035, 0.045], 0.008, 'eisen');
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
  },
};

// --- Rosa -----------------------------------------------------------------------------------------

/**
 * Rosa, die Köchin: das rote Kopftuch mit weißen Punkten, hinten geknotet; die weiße Kochjacke mit
 * zwei Knopfreihen, darüber die blau-weiß gestreifte Schürze; der Kochlöffel steckt im Schürzenband.
 */
const rosa = {
  ...WANDER,
  size: 0.97,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: rampOf([R.e[0], R.e[1], R.e[2], R.e[3]], 2),
    tuch: rampOf([R.r[1], R.r[2], R.r[3], R.r[4]], 2),
    punkt: rampOf([R.s[8], R.s[9]], 1),
    jacke: rampOf([R.s[6], R.s[7], R.s[8], R.s[9]], 2),
    schuerze: rampOf([R.b[1], R.b[2], R.b[3], R.b[4]], 2),
    streifen: rampOf([R.s[7], R.s[8], R.s[9]], 1),
    loeffel: rampOf([R.e[4], R.e[5], R.e[6], R.e[7]], 2),
    hose: rampOf([R.n[2], R.n[3], R.n[4]], 1),
    schuh: cloth(P.e1, 1, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const apronStripes = (l, p) => (Math.floor(p[0] * 20 + 40) % 3 === 0 ? 'streifen' : null);
    const apron = (l, p) => (l[2] > 0.06 && Math.abs(l[0]) < 0.2 ? apronStripes(l, p) || 'schuerze' : null);
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'hose', matAt: apron },
        { ...HUMAN.torso[1], mat: 'jacke', matAt: (l, p) => (l[1] < -0.04 ? apron(l, p) : null) },
        { ...HUMAN.torso[2], mat: 'jacke' },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.03, fringe: 0.08, back: -0.13, sides: -0.05 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'jacke', fore: 'jacke', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    // Schürze bis übers Knie
    ctx.ellipsoid(add(body.hip, [0, -0.13, 0.1]), [0.21, 0.17, 0.11], 'schuerze', { blend: 0.02, matAt: apronStripes });
    ctx.ellipsoid(spine(0.41), [0.16, 0.06, 0.14], 'jacke', { pitch: body.stoop });
    // Kochlöffel im Schürzenband rechts
    ctx.capsule(add(spine(0.08), [0.16, 0, 0.17]), add(spine(-0.14), [0.18, 0, 0.19]), 0.013, null, 'loeffel');
    ctx.ellipsoid(add(spine(0.12), [0.155, 0, 0.17]), [0.03, 0.045, 0.015], 'loeffel');
    // Kopftuch mit Punkten, hinten geknotet
    const dots = (l) => (hash(Math.floor(l[0] * 22 + 99), Math.floor(l[1] * 22 + 99), Math.floor(l[2] * 22 + 99)) < 0.16 ? 'punkt' : null);
    headEllipsoid(ctx, body, [0, 0.11, -0.04], [0.31, 0.18, 0.29], 'tuch', { blend: 0.02, matAt: dots });
    headEllipsoid(ctx, body, [0, -0.02, -0.31], [0.07, 0.05, 0.05], 'tuch');
    for (const side of [-1, 1]) headCapsule(ctx, body, [side * 0.03, -0.04, -0.33], [side * 0.08, -0.17, -0.34], 0.03, 0.02, 'tuch');
    earsNose(ctx, body);
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) for (const y of [0.32, 0.25, 0.18]) for (const side of [-1, 1]) stamps.push({ stamp: STAMPS_FOLK.knopfGrau, at: W(add(spine(y), [side * 0.07, 0, 0.18])) });
  },
};

// --- Anton ----------------------------------------------------------------------------------------

/**
 * Anton, der Musiker: die rote Baskenmütze schief auf dem Kopf, lange braune Haare bis auf die
 * Schultern; die braune Jacke, vor der Brust die Quetschkommode am Riemen – roter Balg, weiße und
 * schwarze Tasten.
 */
const anton = {
  ...WANDER,
  size: 1.0,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: rampOf([R.e[2], R.e[3], R.e[4], R.e[5]], 2, { pattern: (p) => (Math.floor((p[0] - p[2]) * 30) % 3 === 0 ? -1 : 0) }),
    muetze: rampOf([R.r[0], R.r[1], R.r[2], R.r[3]], 2),
    jacke: rampOf([R.e[4], R.e[5], R.e[6], R.e[7]], 2),
    jackeDunkel: rampOf([R.e[3], R.e[4], R.e[5]], 1),
    balg: rampOf([R.r[1], R.r[2], R.r[3], R.r[4]], 2),
    balgDunkel: rampOf([R.r[0], R.r[1], R.r[2]], 1),
    kasten: rampOf([R.n[0], R.n[1], R.n[2], R.n[3]], 1, { shine: true }),
    tasten: rampOf([R.s[7], R.s[8], R.s[9]], 1),
    tastenDunkel: rampOf([R.n[0], R.n[1]], 1),
    gurt: cloth(P.e2, 1, 2),
    hose: rampOf([R.n[2], R.n[3], R.n[4]], 1),
    schuh: cloth(P.e1, 1, 2, { shine: true }),
  },
  build(ctx) {
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'hose' },
        { ...HUMAN.torso[1], mat: 'jacke', matAt: (l) => (l[1] < -0.13 ? 'jackeDunkel' : null) },
        { ...HUMAN.torso[2], mat: 'jacke' },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.04, fringe: 0.08, back: -0.2, sides: -0.16 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'jacke', fore: 'jacke', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    ctx.ellipsoid(spine(0.41), [0.16, 0.06, 0.14], 'jackeDunkel', { pitch: body.stoop });
    // Lange Haare bis auf die Schultern
    headEllipsoid(ctx, body, [0, -0.14, -0.17], [0.27, 0.17, 0.1], 'haar', { blend: 0.03 });
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.26, -0.16, -0.06], [0.06, 0.15, 0.1], 'haar', { blend: 0.03 });
    earsNose(ctx, body);
    // Baskenmütze schief nach rechts, mit Stiel oben
    ctx.push({ kind: 'ellipsoid', c: ctx.W(H([0.04, 0.22, -0.02])), rr: [0.3, 0.07, 0.28], ax: body.headAxes(0, -0.22), mat: 'muetze', blend: 0.02 });
    headEllipsoid(ctx, body, [0.02, 0.3, -0.02], [0.018, 0.03, 0.018], 'muetze');
    // Quetschkommode vor der Brust: zwei Kästen, dazwischen der gefaltete Balg; rechts die Tasten
    const box = add(spine(0.2), [0, 0, 0.27]);
    ctx.box(box, [0.17, 0.12, 0.075], 0.025, 'balg', {
      pitch: body.stoop,
      matAt: (l) => {
        if (l[0] > 0.1) return l[2] > 0.045 && Math.abs(l[1]) < 0.1 ? (Math.floor(l[1] * 40 + 40) % 2 ? 'tasten' : 'tastenDunkel') : 'kasten';
        if (l[0] < -0.11) return 'kasten';
        return Math.floor(l[0] * 40 + 40) % 2 ? 'balgDunkel' : null;
      },
    });
    for (const side of [-1, 1]) {
      const top = add(spine(0.37), [side * 0.15, 0.04, 0.03]);
      ctx.capsule(add(top, [0, 0, -0.15]), top, 0.02, null, 'gurt');
      ctx.capsule(top, add(box, [side * 0.12, 0.1, -0.03]), 0.02, null, 'gurt');
    }
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
  },
};

// --- Emil -----------------------------------------------------------------------------------------

/**
 * Emil, der Gärtner: der Strohhut mit grünem Band und einer rosa Blume, ein grauer Schnurrbart; das
 * blaue Hemd unter der grünen Latzhose mit gelben Knöpfen, die Pflanzkelle in der Brusttasche;
 * Gummistiefel. Ein wenig gebeugt.
 */
const emil = {
  ...WANDER,
  size: 0.98,
  materials: {
    haut: cloth(P.h4, 2, 0, { shine: true, seam: false }),
    haar: rampOf([R.s[5], R.s[6], R.s[7], R.s[8]], 2),
    bart: rampOf([R.s[6], R.s[7], R.s[8], R.s[9]], 2),
    stroh: rampOf([R.e[6], R.e[7], R.e[8], R.e[9]], 2, { pattern: (p) => (Math.floor((p[0] + p[2]) * 30 + 99) % 3 === 0 ? -1 : 0) }),
    hutband: rampOf([R.g[1], R.g[2], R.g[3], R.g[4]], 2),
    blume: rampOf([R.d[6], P.a0, P.a1], 1),
    hemd: rampOf([R.b[3], R.b[4], R.b[5]], 1),
    latz: rampOf([R.g[2], R.g[3], R.g[4], R.g[5]], 2),
    knopf: rampOf([R.f[5], R.f[6], R.f[7]], 1),
    kelle: rampOf([R.s[4], R.s[5], R.s[6], R.s[7]], 1, { shine: true }),
    griff: rampOf([R.e[4], R.e[5], R.e[6]], 1),
    schuh: cloth(P.e3, 2, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const bib = (l) => (l[2] > 0.04 && Math.abs(l[0]) < 0.14 ? 'latz' : null);
    const B = {
      ...HUMAN,
      stoop: 0.06,
      torso: [
        { ...HUMAN.torso[0], mat: 'latz' },
        { ...HUMAN.torso[1], mat: 'latz' },
        { ...HUMAN.torso[2], mat: 'hemd', matAt: bib },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.06, fringe: null, back: -0.12, sides: -0.06 }) },
      mats: { thigh: 'latz', shin: 'latz', shoe: 'schuh', upper: 'hemd', fore: 'hemd', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    for (const side of [-1, 1]) {
      const top = add(spine(0.37), [side * 0.13, 0.04, 0.0]);
      ctx.capsule(add(top, [0, 0, -0.15]), top, 0.02, null, 'latz');
      ctx.capsule(top, add(spine(0.28), [side * 0.12, 0, 0.17]), 0.02, null, 'latz');
    }
    ctx.ellipsoid(spine(0.41), [0.16, 0.055, 0.14], 'hemd', { pitch: body.stoop });
    // Pflanzkelle in der Brusttasche
    ctx.capsule(add(spine(0.3), [-0.06, 0, 0.19]), add(spine(0.38), [-0.07, 0, 0.19]), 0.012, null, 'griff');
    ctx.ellipsoid(add(spine(0.25), [-0.06, 0, 0.195]), [0.025, 0.04, 0.01], 'kelle');
    // Grauer Schnurrbart
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.05, -0.12, 0.27], [0.06, 0.022, 0.025], 'bart', { face: true });
    earsNose(ctx, body);
    // Strohhut: weite Krempe, Krone mit grünem Band, die Blume rechts
    brim(ctx, body, [0, 0.18, -0.02], [0.4, 0.018, 0.37], 'stroh');
    headEllipsoid(ctx, body, [0, 0.27, -0.02], [0.235, 0.1, 0.215], 'stroh', { blend: 0.02, matAt: (l) => (l[1] < -0.045 ? 'hutband' : null) });
    headEllipsoid(ctx, body, [0.2, 0.23, 0.08], [0.045, 0.04, 0.04], 'blume');
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) for (const side of [-1, 1]) stamps.push({ stamp: STAMPS_FOLK.knopfGelb, at: W(add(spine(0.3), [side * 0.12, 0, 0.18])) });
  },
};

// --- Frieda ---------------------------------------------------------------------------------------

/**
 * Frieda, die Schmiedin: rote Stoppeln und ein blaues Stirnband; das graue Hemd mit hochgekrempelten
 * Ärmeln (kräftige Unterarme), die Lederschürze mit Nieten von der Brust bis übers Knie, der Hammer
 * am Gürtel; graue Hose, schwere Stiefel. Breit in den Schultern.
 */
const frieda = {
  ...WANDER,
  size: 1.0,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: rampOf([R.r[2], R.r[3], R.r[4], R.f[3]], 1, { pattern: (p) => (hash(Math.floor(p[0] * 40 + 99), Math.floor(p[1] * 40 + 99), Math.floor(p[2] * 40 + 99)) < 0.3 ? -1 : 0) }),
    band: rampOf([R.b[1], R.b[2], R.b[3], R.b[4]], 2),
    hemd: rampOf([R.s[4], R.s[5], R.s[6], R.s[7]], 2),
    schuerze: rampOf([R.e[1], R.e[2], R.e[3], R.e[4]], 2, { pattern: (p) => (hash(Math.floor(p[0] * 20 + 99), Math.floor(p[1] * 20 + 99), 7) < 0.12 ? 1 : 0) }),
    hammer: rampOf([R.s[2], R.s[3], R.s[4], R.s[6]], 2, { shine: true }),
    stiel: rampOf([R.e[4], R.e[5], R.e[6]], 1),
    hose: rampOf([R.s[1], R.s[2], R.s[3], R.s[4]], 2),
    schuh: cloth(P.e1, 1, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const apron = (l) => (l[2] > 0.04 && Math.abs(l[0]) < 0.17 ? 'schuerze' : null);
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'hose', matAt: apron },
        { ...HUMAN.torso[1], rr: [0.27, 0.17, 0.2], mat: 'hemd', matAt: apron },
        { ...HUMAN.torso[2], rr: [0.29, 0.14, 0.19], mat: 'hemd', matAt: (l) => (l[1] < 0.02 ? apron(l) : null) },
      ],
      shoulderW: 0.29,
      armR: [0.08, 0.072, 0.07, 0.064],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.08, fringe: 0.14, back: -0.1, sides: 0.0 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'hemd', fore: 'haut', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms } = body;
    // Hochgekrempelte Ärmel: ein dicker Wulst über dem Ellbogen
    for (const a of arms) ctx.capsule(along(a.shoulder, a.elbow, 0.75), add(a.elbow, mul(norm(sub(a.wrist, a.elbow)), 0.02)), 0.085, 0.08, 'hemd');
    // Lederschürze bis übers Knie, Träger um den Nacken
    ctx.ellipsoid(add(body.hip, [0, -0.13, 0.1]), [0.2, 0.18, 0.11], 'schuerze', { blend: 0.02 });
    ctx.capsule(add(spine(0.31), [-0.12, 0, 0.17]), add(spine(0.42), [-0.06, 0.02, 0.09]), 0.02, null, 'schuerze');
    ctx.capsule(add(spine(0.31), [0.12, 0, 0.17]), add(spine(0.42), [0.06, 0.02, 0.09]), 0.02, null, 'schuerze');
    // Hammer am Gürtel links
    const hip = add(body.hip, [-0.26, 0.03, 0.03]);
    ctx.capsule(add(hip, [0, 0.06, 0]), add(hip, [0, -0.15, 0.02]), 0.017, null, 'stiel');
    ctx.box(add(hip, [0, 0.075, 0.0]), [0.025, 0.028, 0.06], 0.008, 'hammer');
    // Stirnband über den Stoppeln
    ctx.box(H([0, 0.1, -0.01]), [0.305, 0.036, 0.28], 0.12, 'band', { ax: body.headAx });
    earsNose(ctx, body);
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) for (const [x, y] of [[-0.14, 0.26], [0.14, 0.26], [-0.15, 0.04], [0.15, 0.04]]) stamps.push({ stamp: STAMPS_FOLK.niete, at: W(add(spine(y), [x, 0, 0.19])) });
  },
};

// --- Mara -----------------------------------------------------------------------------------------

/**
 * Mara, die Späherin: Kapuze mit Zipfel und ein Umhang bis über die Knie, vorn mit goldener Spange;
 * schwarzes Haar unter der Kapuze; quer über dem Rücken die Kartenrolle, vor der Brust der Kompass;
 * dunkle Hose, Stiefel.
 */
const mara = {
  ...WANDER,
  size: 0.98,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: rampOf([R.n[0], R.n[1], R.n[2]], 1),
    umhang: rampOf([R.n[2], R.n[3], R.n[4], R.n[5], R.n[6]], 2),
    umhangDunkel: rampOf([R.n[1], R.n[2], R.n[3]], 1),
    spange: rampOf([R.f[4], R.f[5], R.f[6], R.f[7]], 2, { shine: true }),
    rolle: rampOf([R.e[3], R.e[4], R.e[5], R.e[6]], 2),
    rolleDunkel: rampOf([R.e[1], R.e[2], R.e[3]], 1),
    hose: rampOf([R.n[1], R.n[2], R.n[3]], 1),
    schuh: cloth(P.e2, 2, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'umhang' },
        { ...HUMAN.torso[1], mat: 'umhang' },
        { ...HUMAN.torso[2], mat: 'umhang' },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.02, fringe: 0.07, back: -0.12, sides: -0.05 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'umhang', fore: 'umhang', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    // Umhang: über den Schultern weit, unten bis übers Knie
    ctx.ellipsoid(spine(0.33), [0.33, 0.12, 0.23], 'umhang', { pitch: body.stoop, blend: 0.04 });
    ctx.ellipsoid(add(body.hip, [0, -0.08, -0.02]), [0.29, 0.24, 0.23], 'umhang', { blend: 0.04, part: 'rock', matAt: (l) => (l[1] < -0.2 ? 'umhangDunkel' : null) });
    // Kartenrolle quer über dem Rücken
    ctx.capsule(add(spine(0.38), [-0.17, 0.08, -0.25]), add(spine(0.02), [0.17, 0, -0.24]), 0.05, null, 'rolle');
    ctx.ellipsoid(add(spine(0.38), [-0.17, 0.08, -0.25]), [0.052, 0.052, 0.052], 'rolleDunkel');
    // Kapuze: hinter dem Gesicht, oben der Zipfel
    headEllipsoid(ctx, body, [0, 0.04, -0.07], [0.335, 0.285, 0.3], 'umhang', { blend: 0.02 });
    headCapsule(ctx, body, [0, 0.24, -0.16], [0.02, 0.38, -0.33], 0.085, 0.02, 'umhang');
    earsNose(ctx, body);
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 2 || dir >= 6) stamps.push({ stamp: STAMPS_FOLK.schliesse, at: W(add(spine(0.4), [0, 0, 0.2])), opts: { need: false } });
    if (dir <= 1 || dir === 7) stamps.push({ stamp: STAMPS_FOLK.kompass, at: W(add(spine(0.2), [0.08, 0, 0.23])) });
  },
};

// --- Paula ----------------------------------------------------------------------------------------

/**
 * Paula, die Näherin: der hohe weiße Dutt mit zwei Stricknadeln, eine Brille; die fliederfarbene
 * Strickjacke, um den Hals das gelbe Maßband, am linken Handgelenk das Nadelkissen; der lila Rock,
 * Strümpfe, Schuhe. Etwas kleiner, ein wenig gebeugt.
 */
const paula = {
  ...WANDER,
  size: 0.93,
  materials: {
    haut: cloth(P.h4, 2, 0, { shine: true, seam: false }),
    haar: rampOf([R.s[6], R.s[7], R.s[8], R.s[9]], 2),
    nadel: rampOf([R.s[4], R.s[5], R.s[6], R.s[7]], 1, { shine: true }),
    knauf: rampOf([R.d[6], P.a0, P.a1], 1),
    jacke: rampOf([P.a2, P.a3, R.s[8]], 1, { pattern: knit }),
    blende: rampOf([R.d[2], P.a2, P.a3], 1),
    band: rampOf([R.f[5], R.f[6], R.f[7]], 1, { pattern: (p) => (Math.floor(p[1] * 40 + 400) % 3 === 0 ? -1 : 0) }),
    kissen: rampOf([R.r[2], R.r[3], R.r[4]], 1),
    rock: rampOf([R.d[1], R.d[2], R.d[3], R.d[4]], 2),
    strumpf: rampOf([R.s[4], R.s[5], R.s[6], R.s[7]], 2),
    schuh: cloth(P.e1, 1, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const button = (l) => (l[2] > 0.1 && Math.abs(l[0]) < 0.022 ? 'blende' : null);
    const B = {
      ...HUMAN,
      stoop: 0.07,
      torso: [
        { ...HUMAN.torso[0], mat: 'rock', rr: [0.25, 0.13, 0.19] },
        { ...HUMAN.torso[1], mat: 'jacke', matAt: button },
        { ...HUMAN.torso[2], mat: 'jacke', matAt: button },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.06, fringe: 0.12, back: -0.12, sides: -0.07 }) },
      mats: { thigh: 'rock', shin: 'strumpf', shoe: 'schuh', upper: 'jacke', fore: 'jacke', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms } = body;
    skirt(ctx, body, 'rock', { drop: 0.12, rr: [0.25, 0.18, 0.21] });
    ctx.ellipsoid(spine(0.41), [0.16, 0.055, 0.14], 'blende', { pitch: body.stoop });
    // Maßband um den Nacken, beide Enden hängen vorn herab
    for (const side of [-1, 1]) ctx.capsule(add(spine(0.41), [side * 0.1, 0.02, 0.09]), add(spine(0.2), [side * 0.09, 0, 0.21]), 0.017, null, 'band');
    // Nadelkissen am linken Handgelenk
    ctx.ellipsoid(add(arms[0].wrist, [0, 0.01, 0]), [0.05, 0.03, 0.05], 'kissen');
    // Hoher Dutt mit zwei Stricknadeln über Kreuz
    headEllipsoid(ctx, body, [0, 0.27, -0.06], [0.13, 0.1, 0.12], 'haar', { blend: 0.03 });
    headCapsule(ctx, body, [-0.2, 0.22, -0.02], [0.17, 0.36, -0.1], 0.011, null, 'nadel');
    headCapsule(ctx, body, [0.2, 0.22, -0.02], [-0.16, 0.37, -0.12], 0.011, null, 'nadel');
    headEllipsoid(ctx, body, [0.18, 0.37, -0.1], [0.022, 0.022, 0.022], 'knauf');
    headEllipsoid(ctx, body, [-0.17, 0.38, -0.12], [0.022, 0.022, 0.022], 'knauf');
    earsNose(ctx, body);
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) for (const y of [0.3, 0.2, 0.1]) stamps.push({ stamp: STAMPS_FOLK.knopfWeiss, at: W(add(spine(y), [0, 0, 0.19])) });
  },
};

// --- Edda -----------------------------------------------------------------------------------------

/**
 * Edda nach dem Herbst (M32): der silberne Zopfkranz, kleine goldene Ohrringe; das grüne Strick-
 * tuch über der weißen Bluse, die Bernsteinbrosche, die alten Kopfhörer um den Hals; der dunkle
 * Rock, Schuhe. Ein wenig gebeugt.
 */
const edda = {
  ...WANDER,
  size: 0.95,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: rampOf([R.s[6], R.s[7], R.s[8], R.s[9]], 2),
    zopf: rampOf([R.s[5], R.s[6], R.s[7], R.s[8], R.s[9]], 3, { pattern: (p) => (Math.floor((p[0] + p[2] + p[1] * 2) * 26 + 999) % 3 === 0 ? -2 : 0) }),
    tuch: rampOf([R.t[1], R.t[2], R.t[3], R.t[4]], 2, { pattern: knit }),
    bluse: rampOf([R.s[7], R.s[8], R.s[9]], 2),
    gold: rampOf([R.f[4], R.f[5], R.f[6]], 1, { shine: true }),
    kopfhoerer: rampOf([R.n[1], R.n[2], R.n[3], R.s[4]], 1, { shine: true }),
    rock: rampOf([R.n[1], R.n[2], R.n[3]], 1),
    strumpf: rampOf([R.s[3], R.s[4], R.s[5]], 1),
    schuh: cloth(P.e1, 1, 2, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const blouse = (l) => (l[2] > 0.08 && Math.abs(l[0]) < 0.06 && l[1] > -0.02 ? 'bluse' : null);
    const B = {
      ...HUMAN,
      stoop: 0.06,
      torso: [
        { ...HUMAN.torso[0], mat: 'rock', rr: [0.25, 0.13, 0.19] },
        { ...HUMAN.torso[1], mat: 'tuch' },
        { ...HUMAN.torso[2], mat: 'tuch', matAt: blouse },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.06, fringe: 0.11, back: -0.08, sides: -0.03 }) },
      mats: { thigh: 'rock', shin: 'strumpf', shoe: 'schuh', upper: 'tuch', fore: 'tuch', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    skirt(ctx, body, 'rock', { drop: 0.14, rr: [0.25, 0.2, 0.21] });
    ctx.ellipsoid(spine(0.41), [0.15, 0.05, 0.13], 'bluse', { pitch: body.stoop });
    // Alte Kopfhörer um den Hals: zwei Muscheln auf den Schultern
    for (const side of [-1, 1]) ctx.ellipsoid(add(spine(0.42), [side * 0.15, 0.0, 0.05]), [0.045, 0.06, 0.05], 'kopfhoerer');
    ctx.capsule(add(spine(0.42), [-0.15, 0, 0.0]), add(spine(0.44), [0, 0.0, -0.13]), 0.016, null, 'kopfhoerer');
    ctx.capsule(add(spine(0.44), [0, 0.0, -0.13]), add(spine(0.42), [0.15, 0, 0.0]), 0.016, null, 'kopfhoerer');
    // Silberner Zopfkranz rund um den Kopf
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const b = ((k + 1) / 8) * Math.PI * 2;
      headCapsule(ctx, body, [Math.sin(a) * 0.27, 0.18, Math.cos(a) * 0.245 - 0.02], [Math.sin(b) * 0.27, 0.18, Math.cos(b) * 0.245 - 0.02], 0.065, null, 'zopf');
    }
    earsNose(ctx, body);
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.29, -0.11, 0.0], [0.016, 0.02, 0.016], 'gold');
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
    if (dir <= 1 || dir === 7) stamps.push({ stamp: STAMPS_FOLK.brosche, at: W(add(spine(0.3), [0, 0, 0.19])) });
  },
};

// --- Marthe ---------------------------------------------------------------------------------------

/**
 * Marthe, die Bootsbauerin vom Apfelwerder: die petrolfarbene Hafenmütze mit dickem Umschlag,
 * kastanienbraunes Haar mit grauen Strähnen, der dicke Zopf über der rechten Schulter mit rotem Band,
 * der Bleistift hinter dem Ohr; der helle Zopfmusterpullover, die Lederschürze mit Latz, in der Tasche
 * der gelbe Zollstock; dunkelblaue Hose, Stiefel.
 */
const marthe = {
  ...WANDER,
  size: 0.99,
  materials: {
    haut: cloth(P.h3, 2, 1, { shine: true, seam: false }),
    haar: rampOf([R.e[3], R.e[4], R.e[5], R.e[6]], 2, { pattern: (p) => (Math.floor((p[0] * 7 + p[1] * 3 + p[2] * 5) * 20 + 999) % 11 === 0 ? 3 : 0) }),
    muetze: rampOf([R.t[2], R.t[3], P.a5, P.a6], 2, { pattern: knit }),
    umschlag: rampOf([R.t[0], R.t[1], R.t[2], R.t[3]], 2),
    pulli: rampOf([R.s[5], R.s[6], R.s[7], R.s[8], R.s[9]], 3, { pattern: (p) => (Math.floor(p[0] * 20 + 40) % 4 === 0 ? -1 : 0) }),
    schuerze: rampOf([R.e[2], R.e[3], R.e[4], R.e[5], R.e[6]], 2, { pattern: (p) => (hash(Math.floor(p[0] * 20 + 99), Math.floor(p[1] * 20 + 99), 3) < 0.1 ? 1 : 0) }),
    band: rampOf([R.r[2], R.r[3], R.r[4]], 1),
    stift: rampOf([R.f[4], R.f[5], R.f[6]], 1),
    zollstock: rampOf([R.f[5], R.f[6], R.f[7]], 1, { pattern: (p) => (Math.floor(p[1] * 40 + 400) % 2 ? -2 : 0) }),
    hose: rampOf([R.b[0], R.b[1], R.b[2]], 1),
    schuh: cloth(P.e1, 1, 2, { shine: true }),
  },
  build(ctx) {
    const B = {
      ...HUMAN,
      torso: [
        { ...HUMAN.torso[0], mat: 'hose', matAt: (l) => (l[2] > 0.04 && Math.abs(l[0]) < 0.18 ? 'schuerze' : null) },
        { ...HUMAN.torso[1], mat: 'pulli', matAt: (l) => (l[2] > 0.04 && Math.abs(l[0]) < 0.18 ? 'schuerze' : null) },
        { ...HUMAN.torso[2], mat: 'pulli', matAt: (l) => (l[2] > 0.06 && Math.abs(l[0]) < 0.12 && l[1] < 0.06 ? 'schuerze' : null) },
      ],
      head: { ...HUMAN.head, r: 0.2, matAt: hairOf({ top: 0.04, fringe: 0.1, back: -0.12, sides: -0.05 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'pulli', fore: 'pulli', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    ctx.ellipsoid(add(body.hip, [0, -0.12, 0.1]), [0.2, 0.16, 0.11], 'schuerze', { blend: 0.02 });
    ctx.ellipsoid(spine(0.41), [0.17, 0.065, 0.15], 'pulli', { pitch: body.stoop });
    for (const side of [-1, 1]) ctx.capsule(add(spine(0.3), [side * 0.11, 0, 0.17]), add(spine(0.42), [side * 0.07, 0.02, 0.07]), 0.018, null, 'schuerze');
    // Zollstock aus der Schürzentasche
    ctx.capsule(add(spine(0.08), [-0.1, 0, 0.21]), add(spine(0.2), [-0.11, 0, 0.21]), 0.016, null, 'zollstock');
    // Der dicke Zopf über der rechten Schulter, unten das rote Band
    braid(ctx, body, [[0.2, -0.05, -0.12], [0.26, -0.22, 0.02], [0.24, -0.4, 0.14], [0.22, -0.56, 0.18]], 0.065, 'haar', 'band');
    earsNose(ctx, body);
    // Bleistift hinter dem linken Ohr
    headCapsule(ctx, body, [-0.31, 0.02, -0.06], [-0.3, 0.02, 0.1], 0.014, null, 'stift');
    // Hafenmütze: dicker gerippter Umschlag, oben etwas flach
    const ribs = (l) => (Math.floor((Math.abs(l[0]) > 0.24 ? l[2] : l[0]) * 40 + 40) & 1 ? 'umschlag' : 'muetze');
    ctx.box(H([0, 0.165, -0.01]), [0.305, 0.06, 0.28], 0.12, 'umschlag', { ax: body.headAx, matAt: ribs });
    headEllipsoid(ctx, body, [0, 0.22, -0.02], [0.28, 0.11, 0.255], 'muetze', { blend: 0.02 });
    ctx.mark('chest', spine(0.25));
    ctx.face = faceAt(ctx, H(FACE_POINT));
  },
};

// --- Pim und Lu -----------------------------------------------------------------------------------

/** Die Stelle des Gesichts eines Kindes (kleinerer Kopf). */
const FACE_POINT_CHILD = [0, -0.04, 0.228];

/**
 * Pim, Marthes Sohn: ein Hut aus Zeitungspapier über roten Locken, Sommersprossen; der weiße
 * Ringelpulli mit blauen Streifen und Rollkragen, braune Hose, grüne Gummistiefel.
 */
const pim = {
  ...WANDER,
  size: 1.0,
  materials: {
    haut: cloth(P.h4, 2, 0, { shine: true, seam: false }),
    haar: rampOf([R.r[2], R.r[3], R.r[4], R.f[3]], 2),
    papier: rampOf([R.s[6], R.s[7], R.s[8], R.s[9]], 2),
    tinte: rampOf([R.s[3], R.s[4], R.s[5]], 1),
    pulli: rampOf([R.s[7], R.s[8], R.s[9]], 2, { pattern: knit }),
    streifen: rampOf([R.b[1], R.b[2], R.b[3], R.b[4]], 2),
    hose: cloth(P.e3, 2, 2),
    schuh: rampOf([R.g[2], R.g[3], R.g[4], R.g[5]], 1, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const stripes = rings('streifen', 3, 14);
    const B = {
      ...CHILD,
      torso: [
        { ...CHILD.torso[0], mat: 'hose' },
        { ...CHILD.torso[1], mat: 'pulli', matAt: stripes },
        { ...CHILD.torso[2], mat: 'pulli', matAt: stripes },
      ],
      head: { ...CHILD.head, r: 0.17, matAt: hairOf({ top: 0.02, fringe: 0.06, back: -0.1, sides: -0.04, zig: 0.035 }) },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'pulli', fore: 'pulli', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H } = body;
    for (const i of [0, 1]) for (const p of [`upper${i}`, `fore${i}`]) ctx.part(p).matAt = stripes;
    // Rollkragen
    ctx.ellipsoid(spine(0.31), [0.12, 0.05, 0.11], 'streifen', { pitch: body.stoop });
    // Locken, die unter dem Hut hervorschauen
    for (const [x, y, z] of [[-0.22, 0.1, 0.1], [0.22, 0.1, 0.1], [-0.24, 0.02, -0.05], [0.24, 0.02, -0.05]]) headEllipsoid(ctx, body, [x, y, z], [0.05, 0.045, 0.05], 'haar', { blend: 0.02 });
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.245, -0.035, -0.01], [0.035, 0.06, 0.045], 'haut', { blend: 0.02 });
    headEllipsoid(ctx, body, [0, -0.06, 0.226], [0.032, 0.028, 0.03], 'haut', { blend: 0.012, face: true });
    // Hut aus Zeitungspapier: Band um den Kopf, darüber die gefaltete Spitze (von vorn ein Dreieck)
    const print = (l, p) => (Math.floor(p[1] * 40 + 400) % 2 === 0 && hash(Math.floor(p[0] * 40 + 99), Math.floor(p[1] * 40 + 99), 5) < 0.45 ? 'tinte' : null);
    ctx.box(H([0, 0.15, -0.01]), [0.26, 0.035, 0.235], 0.1, 'papier', { ax: body.headAx });
    ctx.push({ kind: 'box', c: ctx.W(H([0, 0.17, -0.02])), h: [0.19, 0.19, 0.085], r: 0.03, ax: body.headAxes(0, Math.PI / 4), mat: 'papier', matAt: print });
    ctx.mark('chest', spine(0.2));
    ctx.face = faceAt(ctx, H(FACE_POINT_CHILD));
    if (dir <= 1 || dir === 7) for (const side of [-1, 1]) stamps.push({ stamp: STAMPS_FOLK.sommersprossen, at: W(H([side * 0.12, -0.07, 0.235])), opts: { depth: 0.06 } });
  },
};

/**
 * Lu, Marthes Tochter: zwei abstehende Zöpfe mit roten Bändern, Mittelscheitel; der rote Dufflecoat
 * mit hellen Knebeln und Kapuze im Nacken, gelbe Gummistiefel; in der rechten Hand ein Apfel.
 */
const lu = {
  ...WANDER,
  size: 1.0,
  materials: {
    haut: cloth(P.h4, 2, 0, { shine: true, seam: false }),
    haar: rampOf([R.e[0], R.e[1], R.e[2], R.e[3]], 2),
    band: rampOf([R.r[2], R.r[3], R.r[4]], 1),
    mantel: rampOf([R.r[1], R.r[2], R.r[3], R.r[4]], 2),
    mantelDunkel: rampOf([R.r[0], R.r[1], R.r[2]], 1),
    knebel: rampOf([R.e[7], R.e[8], R.e[9]], 1),
    apfel: rampOf([R.f[1], R.f[2], R.r[4], R.f[4]], 1, { shine: true }),
    blatt: rampOf([R.g[4], R.g[5], R.g[6]], 1),
    hose: rampOf([R.n[2], R.n[3], R.n[4]], 1),
    schuh: rampOf([R.f[5], R.f[6], R.f[7]], 1, { shine: true }),
  },
  build(ctx) {
    const { W, stamps, dir } = ctx;
    const placket = (l) => (l[2] > 0.08 && Math.abs(l[0]) < 0.016 ? 'mantelDunkel' : null);
    const B = {
      ...CHILD,
      torso: [
        { ...CHILD.torso[0], mat: 'mantel', matAt: (l) => (l[1] < -0.06 ? 'mantelDunkel' : null) },
        { ...CHILD.torso[1], mat: 'mantel', matAt: placket },
        { ...CHILD.torso[2], mat: 'mantel', matAt: placket },
      ],
      head: { ...CHILD.head, r: 0.17, matAt: (l) => {
        const h = hairOf({ top: 0.02, fringe: 0.09, back: -0.1, sides: -0.04 })(l);
        if (h && l[2] > -0.15 && l[1] > 0.12 && Math.abs(l[0]) < 0.012) return null; // Mittelscheitel (Haut)
        return h;
      } },
      mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'mantel', fore: 'mantel', hand: 'haut', neck: 'haut', head: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms } = body;
    // Kapuze im Nacken
    ctx.ellipsoid(add(spine(0.28), [0, 0.02, -0.12]), [0.16, 0.06, 0.07], 'mantel', { pitch: body.stoop });
    // Zwei abstehende Zöpfe mit roten Bändern
    for (const side of [-1, 1]) {
      headCapsule(ctx, body, [side * 0.22, 0.08, -0.06], [side * 0.36, 0.0, -0.06], 0.05, 0.035, 'haar');
      headEllipsoid(ctx, body, [side * 0.23, 0.08, -0.06], [0.035, 0.05, 0.05], 'band');
    }
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.245, -0.035, -0.01], [0.035, 0.06, 0.045], 'haut', { blend: 0.02 });
    headEllipsoid(ctx, body, [0, -0.06, 0.226], [0.032, 0.028, 0.03], 'haut', { blend: 0.012, face: true });
    // Ein Apfel in der rechten Hand, mit Stiel und Blatt
    const apple = add(arms[1].hand, [0, -0.02, 0.045]);
    ctx.ellipsoid(apple, [0.048, 0.044, 0.048], 'apfel');
    ctx.ellipsoid(add(apple, [0.02, 0.05, 0]), [0.02, 0.008, 0.012], 'blatt');
    ctx.mark('chest', spine(0.2));
    ctx.face = faceAt(ctx, H(FACE_POINT_CHILD));
    if (dir <= 1 || dir === 7) for (const y of [0.22, 0.15, 0.08]) for (const side of [-1, 1]) stamps.push({ stamp: STAMPS_FOLK.knebel, at: W(add(spine(y), [side * 0.045, 0, 0.16])) });
  },
};

/** Kleine Stempel der Leute. */
const STAMPS_FOLK = {
  posthorn: { rows: ['.yy.', 'y..y', '.yyy'], legend: { y: R.f[6] } },
  knopfWeiss: { rows: ['w'], legend: { w: P.a4 } },
  nadel: { rows: ['s', 's', 'k'], legend: { s: R.s[7], k: R.r[3] } },
  schuerzenTasche: { rows: ['kkkkkk', 'k....k', 'kkkkkk'], legend: { k: R.f[2] } },
  bleistift: { rows: ['k', 'y', 'y', 'y'], legend: { k: R.n[1], y: R.f[6] } },
  kordel: { rows: ['w', 'w', 's'], legend: { w: P.a4, s: R.s[6] } },
  spange: { rows: ['pp', 'pP'], legend: { p: P.a0, P: P.a1 } },
  stifte: { rows: ['b.r', 'b.r', 'kkk'], legend: { b: R.b[3], r: R.r[3], k: R.s[6] } },
  messing: { rows: ['y'], legend: { y: R.f[5] } },
  nase: { rows: ['kk'], legend: { k: P.n0 } },
  knopfGold: { rows: ['.y.', 'yYy', '.y.'], legend: { y: R.f[6], Y: R.f[4] } },
  // Die Wanderer, Edda, Marthe und die Kinder (zweite Stufe)
  tasche: { rows: ['kkkk', 'k..k', 'kkkk'], legend: { k: R.b[1] } },
  schluessel: { rows: ['s.s', 'sss', '.s.', '.s.'], legend: { s: R.s[7] } },
  flicken: { rows: ['yyy', 'yYy', 'yyy'], legend: { y: R.f[5], Y: R.f[4] } },
  knebel: { rows: ['ww'], legend: { w: R.e[8] } },
  hornknopf: { rows: ['k'], legend: { k: R.e[2] } },
  knopfGrau: { rows: ['k'], legend: { k: R.s[5] } },
  knopfGelb: { rows: ['y'], legend: { y: R.f[6] } },
  niete: { rows: ['s'], legend: { s: R.s[7] } },
  kompass: { rows: ['.y.', 'yky', '.y.'], legend: { y: R.f[6], k: R.n[1] } },
  schliesse: { rows: ['yy', 'yY'], legend: { y: R.f[6], Y: R.f[4] } },
  brosche: { rows: ['.y.', 'yoy', '.y.'], legend: { y: R.f[4], o: R.f[6] } },
  sommersprossen: { rows: ['f.f', '.f.'], legend: { f: P.h2 } },
};

// --- Werkzeuge und Waffen -----------------------------------------------------------------------

/**
 * Werkzeuge als eigene Bilder (F4): im Rahmen des Werkzeugs gebaut – der Griff liegt im Ursprung
 * (dort sitzt die Hand), `A` zeigt den Stiel entlang zum Arbeitsende, `E` zur Schneide bzw. zur
 * Seite, die beim Schlag vorangeht, `X` quer dazu. `at(a, e, x)` setzt einen Punkt.
 */
const TOOL_MATS = {
  stiel: { ramp: [R.e[3], R.e[4], R.e[5], R.e[6], R.e[7]], base: 3, seam: true },
  stielDunkel: { ramp: [R.e[1], R.e[2], R.e[3], R.e[4]], base: 2, seam: true },
  eisen: { ramp: [R.s[1], R.s[2], R.s[3], R.s[4], R.s[6]], base: 2, seam: true, shine: true },
  blank: { ramp: [R.s[5], R.s[6], R.s[7], R.s[8], R.s[9]], base: 2, shine: true },
  rot: { ramp: [R.r[0], R.r[1], R.r[2], R.r[3], R.r[4]], base: 3, seam: true },
  schwarz: { ramp: [R.n[0], R.s[0], R.s[1], R.s[2], R.s[4]], base: 2, seam: true, shine: true },
  orange: { ramp: [R.f[1], R.f[2], R.f[3], R.f[4], R.f[5]], base: 3, seam: true },
  gelb: { ramp: [R.f[4], R.f[5], R.f[6], R.f[7]], base: 2 },
  strick: { ramp: [R.f[0], R.f[1], R.f[2], R.f[3], R.f[4]], base: 2, pattern: (p) => ((Math.floor(p[0] * 40) + Math.floor(p[1] * 40)) & 1 ? 0 : -1) },
  weiss: { ramp: [R.s[6], R.s[7], R.s[8], R.s[9]], base: 2 },
  holzHell: { ramp: [R.e[5], R.e[6], R.e[7], R.e[8], R.e[9]], base: 2, seam: true },
};

function toolKit(ctx, A, E, X) {
  const at = (a, e = 0, x = 0) => [A[0] * a + E[0] * e + X[0] * x, A[1] * a + E[1] * e + X[1] * x, A[2] * a + E[2] * e + X[2] * x];
  // Achsen eines Quaders entlang des Werkzeugs (in Weltkoordinaten): x quer, y entlang A, z zur Schneide
  const axes = [ctx.W(X), ctx.W(A), ctx.W(E)];
  const box = (c, h, r, mat, more = {}) => ctx.push({ kind: 'box', c: ctx.W(c), h, r, ax: axes, mat, ...more });
  const ell = (c, rr, mat, more = {}) => ctx.push({ kind: 'ellipsoid', c: ctx.W(c), rr, ax: axes, mat, ...more });
  const cap = (a, b, r, r1, mat, more = {}) => ctx.capsule(a, b, r, r1, mat, more);
  return { at, box, ell, cap, axis: ctx.W(A) };
}

export const TOOLS = {
  // Axt: heller Stiel, rote Wicklung, breites blankes Blatt
  axt: {
    length: 0.62,
    build(ctx, k) {
      k.cap(k.at(-0.07), k.at(0.6), 0.02, 0.018, 'stiel');
      k.cap(k.at(0.38), k.at(0.44), 0.024, null, 'rot');
      k.box(k.at(0.56, 0.04), [0.02, 0.055, 0.06], 0.012, 'eisen');
      k.box(k.at(0.56, 0.115), [0.016, 0.085, 0.022], 0.01, 'blank');
      k.box(k.at(0.57, -0.035), [0.024, 0.03, 0.024], 0.01, 'eisen');
    },
  },
  // Spitzhacke: dunkler Stiel, quer der Kopf mit hellen Spitzen
  spitzhacke: {
    length: 0.6,
    build(ctx, k) {
      k.cap(k.at(-0.07), k.at(0.58), 0.02, 0.018, 'stielDunkel');
      k.cap(k.at(0.56, -0.2), k.at(0.56, 0.2), 0.026, 0.026, 'eisen');
      k.cap(k.at(0.56, 0.18), k.at(0.52, 0.28), 0.02, 0.006, 'blank');
      k.cap(k.at(0.56, -0.18), k.at(0.52, -0.28), 0.02, 0.006, 'blank');
    },
  },
  // Schaufel: langer heller Stiel mit Querholz, graues Blatt mit blanker Kante
  schaufel: {
    length: 0.85,
    build(ctx, k) {
      k.cap(k.at(-0.06, 0, -0.05), k.at(-0.06, 0, 0.05), 0.02, null, 'stielDunkel');
      k.cap(k.at(-0.06), k.at(0.62), 0.019, 0.019, 'stiel');
      k.box(k.at(0.72), [0.09, 0.11, 0.012], 0.02, 'eisen', { matAt: (l) => (l[1] > 0.085 ? 'blank' : null) });
    },
  },
  // Bratpfanne: kurzer dunkler Griff, schwere schwarze Pfanne mit hellem Rand
  pfanne: {
    length: 0.42,
    build(ctx, k) {
      k.cap(k.at(-0.04), k.at(0.18), 0.02, 0.018, 'stielDunkel');
      k.ell(k.at(0.3), [0.13, 0.13, 0.03], 'schwarz', { matAt: (l) => (Math.hypot(l[0], l[1]) > 0.11 ? 'blank' : null) });
    },
  },
  // Rechen: langer Stiel, Querholz, Zinken
  rechen: {
    length: 0.95,
    build(ctx, k) {
      k.cap(k.at(-0.06), k.at(0.86), 0.018, 0.017, 'stiel');
      k.cap(k.at(0.88, 0, -0.17), k.at(0.88, 0, 0.17), 0.022, null, 'stielDunkel');
      for (let i = -3; i <= 3; i++) k.cap(k.at(0.88, 0, i * 0.055), k.at(0.88, 0.09, i * 0.055), 0.009, 0.006, 'blank');
    },
  },
  // Fäustlinge: dicke rote Strickhandschuhe (sie stecken über der Hand)
  faeustlinge: {
    length: 0.1,
    build(ctx, k) {
      k.ell(k.at(0.02), [0.07, 0.08, 0.065], 'strick');
      k.ell(k.at(-0.05), [0.064, 0.025, 0.06], 'weiss');
    },
  },
  // Spaltaxt (Bert): langer Stiel, schwerer roter Keil mit blanker Schneide
  spaltaxt: {
    length: 0.95,
    build(ctx, k) {
      k.cap(k.at(-0.07), k.at(0.9), 0.022, 0.02, 'stiel');
      k.cap(k.at(-0.07), k.at(0.06), 0.026, null, 'stielDunkel');
      k.box(k.at(0.86, 0.05), [0.03, 0.09, 0.075], 0.016, 'rot');
      k.box(k.at(0.86, 0.13), [0.02, 0.1, 0.018], 0.01, 'blank');
      k.box(k.at(0.86, -0.04), [0.03, 0.05, 0.03], 0.012, 'eisen');
    },
  },
  // Mistgabel: langer Stiel, Zwinge, vier Zinken
  mistgabel: {
    length: 1.2,
    build(ctx, k) {
      k.cap(k.at(-0.06), k.at(0.98), 0.018, 0.017, 'stiel');
      k.cap(k.at(0.98), k.at(1.02), 0.026, null, 'eisen');
      k.cap(k.at(1.03, 0, -0.1), k.at(1.03, 0, 0.1), 0.014, null, 'eisen');
      for (const x of [-0.1, -0.033, 0.033, 0.1]) k.cap(k.at(1.03, 0, x), k.at(1.28, 0, x), 0.01, 0.006, 'blank');
    },
  },
  // Baseballschläger: Knauf, umwickelter Griff, heller Schlagteil mit rotem Streifen
  schlaeger: {
    length: 0.8,
    build(ctx, k) {
      k.cap(k.at(-0.08), k.at(-0.06), 0.03, null, 'stielDunkel');
      k.cap(k.at(-0.06), k.at(0.18), 0.022, 0.024, 'schwarz');
      k.cap(k.at(0.18), k.at(0.76), 0.026, 0.045, 'holzHell', { matAt: (l) => (Math.abs(dot(l, k.axis) - 0.34) < 0.02 ? 'rot' : null) });
    },
  },
  // Pistole: dunkler Schlitten, Holzgriff
  pistole: {
    length: 0.25,
    build(ctx, k) {
      k.box(k.at(0.0, 0.0), [0.018, 0.05, 0.028], 0.01, 'stielDunkel');
      k.box(k.at(0.1, -0.05), [0.02, 0.13, 0.03], 0.01, 'schwarz');
    },
  },
  // Signalpistole (Junas): dick, leuchtend orange, gelbes Band
  signalpistole: {
    length: 0.28,
    build(ctx, k) {
      k.box(k.at(0.0, 0.0), [0.02, 0.05, 0.03], 0.012, 'orange');
      k.cap(k.at(0.0, -0.06), k.at(0.22, -0.06), 0.035, 0.038, 'orange', { matAt: (l) => (Math.abs(dot(l, k.axis) - 0.1) < 0.018 ? 'gelb' : null) });
    },
  },
  // Jagdgewehr: Holzschaft, langer dunkler Lauf, Zielfernrohr
  jagdgewehr: {
    length: 1.0,
    build(ctx, k) {
      k.box(k.at(-0.12, 0.01), [0.022, 0.16, 0.05], 0.018, 'stiel');
      k.box(k.at(0.2, -0.02), [0.02, 0.18, 0.03], 0.012, 'stiel');
      k.cap(k.at(0.05, -0.06), k.at(0.9, -0.06), 0.014, 0.012, 'schwarz');
      k.cap(k.at(0.0, -0.11), k.at(0.2, -0.11), 0.022, 0.022, 'schwarz');
    },
  },
  // Doppelflinte: zwei Läufe, kurzer Holzschaft
  doppelflinte: {
    length: 0.8,
    build(ctx, k) {
      k.box(k.at(-0.1, 0.01), [0.022, 0.13, 0.05], 0.018, 'stiel');
      k.box(k.at(0.15, -0.02), [0.022, 0.12, 0.03], 0.012, 'stiel');
      for (const x of [-0.016, 0.016]) k.cap(k.at(0.02, -0.06, x), k.at(0.72, -0.06, x), 0.016, 0.016, 'schwarz');
    },
  },
};

/**
 * Lage eines Werkzeugs in einer Winkelstufe (0–15: um die Querachse der rechten Hand, 0 zeigt
 * nach unten, 4 nach vorn, 8 nach oben) oder auf dem Rücken (16: schräg, der Kopf ragt über die
 * rechte Schulter). Gibt A, E, X in Figurkoordinaten und den Versatz des Ursprungs.
 */
export const TOOL_BUCKETS = 16;
export const BACK_BUCKET = 16;
export function toolFrame(bucket, length) {
  let A;
  let E;
  let X;
  let origin = [0, 0, 0];
  if (bucket === BACK_BUCKET) {
    A = norm([0.62, 0.78, 0]);
    E = [0, 0, -1];
    X = [A[1], -A[0], 0];
    origin = mul(A, -length * 0.45);
  } else {
    const phi = (bucket / TOOL_BUCKETS) * Math.PI * 2;
    A = [0, -Math.cos(phi), Math.sin(phi)];
    E = [0, -Math.sin(phi), -Math.cos(phi)];
    X = [1, 0, 0];
  }
  // Um 45° um den Stiel gedreht: Blatt und Kopf zeigen sich von vorn wie von der Seite (sonst
  // sähe man eine Axt von vorn nur als Strich)
  const E45 = norm(add(E, X));
  const X45 = norm(sub(X, E));
  return { A, E: E45, X: X45, origin };
}

/** Winkelstufe aus der Richtung (Figurkoordinaten) – nur der Anteil in der Ebene y-z zählt. */
export function bucketOf(dirFig) {
  const phi = Math.atan2(dirFig[2], -dirFig[1]);
  return ((Math.round((phi / (Math.PI * 2)) * TOOL_BUCKETS) % TOOL_BUCKETS) + TOOL_BUCKETS) % TOOL_BUCKETS;
}

/** Werkzeug bauen: Formen im Rahmen der Winkelstufe, um den Griff. */
export function buildTool(ctx, id, bucket, lift = [0, 0, 0]) {
  const tool = TOOLS[id];
  const { A, E, X, origin } = toolFrame(bucket, tool.length);
  const k = toolKit(ctx, A, E, X);
  const at0 = k.at;
  k.at = (a, e = 0, x = 0) => add(add(at0(a, e, x), origin), lift);
  tool.build(ctx, k);
}

export const TOOL_MATERIALS = TOOL_MATS;

// --- Alle Figuren -----------------------------------------------------------------------------

export const PEOPLE = {
  mika, hilde, bert, juna, yusuf, balduin, knopf,
  // Zweite Stufe: die Wanderer, Edda nach dem Herbst, Marthe und ihre Kinder
  hannes, clara, lotte, greta, fiete, ida, rosa, anton, emil, frieda, mara, paula, edda, marthe, pim, lu,
};

/** Gesichter und Legende einer Figur für einen Stand (Mika: aus dem Aussehen). */
export function facesOf(id, spec) {
  if (id === 'mika') return { faces: MIKA_FACES[spec.body === 'mann' ? 'mann' : 'frau'], legend: faceLegend({ skin: spec.skin, hair: spec.hair, eyes: spec.eyes, cheek: CHEEK_ON[spec.skin] ?? spec.cheek }) };
  return FOLK_FACES[id] || { faces: {}, legend: {} };
}

/** F5: Wangen auf dunklerer Haut gedämpfter (helles Rosa leuchtete dort wie zwei Lämpchen). */
const CHEEK_ON = { [P.h2]: R.d[5], [P.h1]: R.d[4], [P.h0]: R.d[3] };

/** Gesichter der Leute: Haut, Haar (Brauen), Augen, Wangen und Brille bzw. Bart. */
const FOLK_FACES = {
  hilde: { faces: faceSet(FOLK_EXPRESSIONS, { glasses: true }), legend: faceLegend({ skin: P.h4, hair: P.s7, cheek: P.a1 }) },
  bert: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h2, hair: P.e3, cheek: P.r4, lips: P.a0, brow: P.e2 }) },
  juna: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h2, hair: P.n2, cheek: P.a0 }) },
  yusuf: { faces: faceSet(FOLK_EXPRESSIONS, { glasses: true }), legend: faceLegend({ skin: P.h1, hair: P.n1, eyes: P.n0, cheek: P.r4, lips: P.a0, brow: P.n0 }) },
  balduin: { faces: faceSet(['grinsen', 'blinzeln']), legend: faceLegend({ skin: P.h3, hair: P.s7, cheek: P.a1, lips: P.a0, brow: P.s6 }) },
  hannes: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h3, hair: P.e2, cheek: P.a0, lips: P.a0, brow: P.e1 }) },
  clara: { faces: faceSet(FOLK_EXPRESSIONS, { lashes: true }), legend: faceLegend({ skin: P.h3, hair: P.r3, cheek: P.a1, brow: P.r1 }) },
  lotte: { faces: faceSet(FOLK_EXPRESSIONS, { lashes: true }), legend: faceLegend({ skin: P.h4, hair: P.e8, cheek: P.a1, brow: P.e6 }) },
  greta: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h3, hair: P.s7, cheek: P.r4, brow: P.s5 }) },
  fiete: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h3, hair: P.s8, cheek: P.r4, lips: P.a0, brow: P.s9 }) },
  ida: { faces: faceSet(FOLK_EXPRESSIONS, { lashes: true }), legend: faceLegend({ skin: P.h4, hair: P.e3, cheek: P.a1, brow: P.e3 }) },
  rosa: { faces: faceSet(FOLK_EXPRESSIONS, { lashes: true }), legend: faceLegend({ skin: P.h3, hair: P.e2, cheek: P.a1, brow: P.e2 }) },
  anton: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h3, hair: P.e4, cheek: P.r4, brow: P.e3 }) },
  emil: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h4, hair: P.s7, cheek: P.r4, brow: P.s8 }) },
  frieda: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h3, hair: P.r3, cheek: P.r4, brow: P.r2 }) },
  mara: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h3, hair: P.n1, cheek: P.a1, brow: P.n1 }) },
  paula: { faces: faceSet(FOLK_EXPRESSIONS, { glasses: true }), legend: faceLegend({ skin: P.h4, hair: P.s8, cheek: P.a1, brow: P.s7 }) },
  edda: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h3, hair: P.s9, cheek: P.a1, brow: P.s8 }) },
  marthe: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h3, hair: P.e5, cheek: P.a0, brow: P.e3 }) },
  pim: { faces: faceSet(FOLK_EXPRESSIONS), legend: faceLegend({ skin: P.h4, hair: P.r4, cheek: P.a1, brow: P.r2 }) },
  lu: { faces: faceSet(FOLK_EXPRESSIONS, { lashes: true }), legend: faceLegend({ skin: P.h4, hair: P.e2, cheek: P.a0, brow: P.e1 }) },
};

export { DOG, quadruped };
