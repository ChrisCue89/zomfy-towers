// Die Arten der Horde als Sprites (F-Design): je Art die Stoffe (Rampen der Palette), der Körper
// (Maße aus spriteFigure.BODY), die Gangart, das Zubehör und die Stempel. Vorbild sind die
// Voxel-Modelle (zombieModels.js, N1) – nur als Grundlage: Jede Art bekommt hier ihre eigene
// kleine Geschichte in Kleidern und Dingen, liebevoll bis in die Einzelheiten, und bleibt im
// Pulk an Umriss und Farbe erkennbar.
//
// Ein Bauplan `build(ctx)` setzt Formen (ctx.capsule, ctx.ellipsoid, ctx.box, humanoid …) und
// Stempel (ctx.stamps) in Figurkoordinaten; gebacken wird in zombieSprites.bakeFrame.

import { P, RAMPS } from '../render/palette.js';
import { BODY, humanoid, headEllipsoid, headCapsule, add, sub, dot, norm, mul } from './spriteFigure.js';

const R = RAMPS;

// --- Gemeinsame Stempel -----------------------------------------------------------------------

/**
 * Gesichter der Menschen-Schlurfer je Ausdruck und Richtung (S, SO, O). Legende: b Braue, d Lid
 * bzw. Augenrand, Y Glimmen, w Lichtpunkt, l Unterlid, n Nase, k Mund, m Mundhöhle, p Zunge.
 */
export const FACES = {
  // müde Augen unter schweren Lidern (das rechte größer), eine Nase als Schatten, der schiefe genähte Mund
  muede: {
    S: ['.bb......bbb.', 'dddd....ddddd', 'dYwd....dwYYd', 'lddl....ldddl', '......n......', '....k.k.k....', '...kkkkkkk...'],
    SO: ['bb......bbb.', 'ddd....ddddd', 'Ywd....dwYYd', 'ddl....ldddl', '.......n....', '.....k.k.k..', '....kkkkkk..'],
    O: ['..bbb.', '.ddddd', '.dwYYd', '.lddd.', '.....n', '..k.k.', '.kkkk.'],
  },
  // beim Ausholen und Schlag: die Augen offen, der Mund zu einem großen Gähnen aufgerissen
  gaehnen: {
    S: ['bbb......bbb.', 'dddd....ddddd', 'dYYd....dYYwd', 'dwYd....dYYYd', 'lddl....ldddl', '....kkkkk....', '...kmmmmmk...', '...kmmmmmk...', '....kkkkk....'],
    SO: ['bb.......bbb', 'ddd.....dddd', 'YYd.....YYwd', 'wYd.....YYYd', 'ddl.....lddl', '....kkkkk...', '...kmmmmk...', '...kmmmmk...', '....kkkk....'],
    O: ['..bbb.', '.ddddd', '.dYYwd', '.dYYYd', '.lddl.', '...kkk', '..kmmm', '..kmmm', '...kkk'],
  },
  // getroffen: die Augen zugekniffen (> <), der Mund ein kleines O
  aua: {
    S: ['.bb......bb..', '.d.......dd..', '..dd....dd...', '.d.......dd..', '......n......', '.....kkk.....', '.....kmk.....', '.....kkk.....'],
    SO: ['bb......bb..', 'd.......dd..', '.dd....dd...', 'd.......dd..', '.......n....', '......kkk...', '......kmk...', '......kkk...'],
    O: ['..bb..', '...dd.', '..dd..', '...dd.', '.....n', '...kkk', '...kmk', '...kkk'],
  },
  // beim Fallen: er schläft ein – die Lider zu, der Mund entspannt
  schlaf: {
    S: ['.bb......bbb.', '.............', 'dddd....ddddd', '.ll......lll.', '......n......', '.....kkk.....'],
    SO: ['bb......bbb.', '............', 'ddd....ddddd', 'll......lll.', '.......n....', '......kkk...'],
    O: ['..bbb.', '......', '.ddddd', '..lll.', '.....n', '...kkk'],
  },
};

/** Legende der Gesichter aus der Haut einer Art (Rampe dunkel → hell) und der Farbe der Augen. */
export function faceLegend(skin, eyes, spark = 0xfff2c4) {
  return { d: skin[0], D: R.n[1], Y: { glow: eyes }, w: { glow: spark }, n: skin[1], k: R.n[1], b: skin[1], l: skin[2], m: R.d[1], p: R.a[0] };
}

/** Welches Gesicht zu Zustand und Bild gehört (null: keins – er liegt schon). */
export function expressionOf(anim, k) {
  if (anim === 'ausholen' || anim === 'schlag') return 'gaehnen';
  if (anim === 'treffer') return 'aua';
  if (anim === 'fallen') return k < 2 ? 'schlaf' : null;
  return 'muede';
}

/** Das Gesicht setzen (nur von S, SO und O zu sehen). */
export function putFace(ctx, faces, legend, point) {
  const key = ['S', 'SO', 'O'][ctx.dir];
  const face = faces[expressionOf(ctx.anim, ctx.k)];
  if (!key || !face) return;
  ctx.stamps.push({ stamp: { rows: face[key], legend }, at: point });
}

/** Laub, zu dem die Schlurfer beim Fallen zerfallen, und Staub beim Aufprall eines Schlags. */
export const COMMON = {
  blattRot: { rows: ['rr.', '.rR'], legend: { r: R.r[3], R: R.r[2] } },
  blattGelb: { rows: ['.y', 'yY', 'y.'], legend: { y: R.f[6], Y: R.f[5] } },
  blattBraun: { rows: ['.oo', 'oO.'], legend: { o: R.f[4], O: R.f[3] } },
  staub: { rows: ['.s.s', 's.s.', '.s..'], legend: { s: R.e[7] } },
  // Moderpilzchen: winzige glimmende Pilze am Hinterkopf (nachts von hinten zu sehen)
  moderpilz: { rows: ['YY', '.g'], legend: { Y: { glow: R.g[9] }, g: { glow: R.g[7] } } },
};
const LEAVES = [COMMON.blattRot, COMMON.blattGelb, COMMON.blattBraun];

/** Staub beim Aufprall und Laub beim Fallen (für alle Arten gleich, am Boden um die Figur). */
export function groundStamps(ctx, hands, spread = 1) {
  const { anim, k, stamps, W } = ctx;
  if (anim === 'schlag' && k === 2) for (const h of hands) stamps.push({ stamp: COMMON.staub, at: [W(h)[0], 0.02, W(h)[2]], opts: { need: false, depth: 1 } });
  if (anim === 'fallen' && k >= 2) {
    const spots = [[-0.22, 0.14], [0.2, 0.2], [0.02, 0.3], [-0.3, -0.04], [0.28, -0.02]];
    const n = k === 2 ? 3 : 5;
    for (let i = 0; i < n; i++) stamps.push({ stamp: LEAVES[(i + ctx.dir) % 3], at: W([spots[i][0] * spread, 0, spots[i][1] * spread]), opts: { need: false, depth: 1 } });
  }
}

// --- Der Schlurfer ---------------------------------------------------------------------------

/** Wo der Kopf Haar trägt (Punkt im Kopfrahmen): oben, fransig in die Stirn, hinten zottelig bis zum Nacken. */
function hairAt(l) {
  const [x, y, z] = l;
  // Strähnen von gut 4 cm: vorn quer über die Stirn, hinten längs (quer zum Nacken)
  const zig = Math.floor((x + 0.4) * 22) & 1;
  // Der Haaransatz fällt von der Stirn schräg über die Ohren in den Nacken
  const line = Math.max(-0.075, 0.14 - 0.85 * Math.max(0, 0.1 - z));
  return y > line + (z > 0.1 ? 0.025 : -0.03) * zig ? 'haar' : null;
}

const SCHLURFER_STAMPS = {
  // Knopfleiste auf dem Hemd, Brusttasche mit Bleistift, ein Flicken am Bauch, Gesäßtasche
  knopf: { rows: ['w'], legend: { w: R.e[8] } },
  tasche: { rows: ['.y..', 'kykk', 'k..k', 'kkkk'], legend: { k: R.b[1], y: R.f[6] } },
  flicken: { rows: ['kkkk', 'kppk', 'kppk', 'kkkk'], legend: { k: R.e[4], p: R.e[6] } },
  hosentasche: { rows: ['kkkk', 'k..k', 'kkkk'], legend: { k: R.e[1] } },
  // Gänseblümchen hinterm Ohr (das Merkmal der Art, sichtbar auch im Pulk)
  blume: { rows: ['.w.w.', 'wwyww', '.wyw.', 'ww.ww', '..g..'], legend: { w: P.a4, y: P.f6, g: P.g6 } },
  // Ein Fliegenpilzchen im Moos auf der Schulter
  pilz: { rows: ['rwr', 'rrr', '.s.'], legend: { r: R.r[3], w: P.a4, s: R.e[8] } },
};

/**
 * Der Schlurfer: war einmal ein Mann im blauen Arbeitshemd – Knopfleiste, Brusttasche mit
 * Bleistift, hochgekrempelte Ärmel, das Hemd hängt auf einer Seite aus der Hose, auf dem Rücken
 * ist es zerrissen und darunter wächst Moos. Flicken auf Bauch und Knie, aus dem linken Schuh
 * schaut ein Zeh. Wirres Haar mit einer Locke in der Stirn, ein eingerissenes Ohr, dahinter ein
 * Gänseblümchen, Moos und ein Pilzchen auf der Schulter, am Hinterkopf glimmen Moderpilzchen.
 */
const schlurfer = {
  size: 1,
  gait: 'hinken',
  materials: {
    // Haut: kühles Moosgrün, die Lichter ziehen ins Türkis
    haut: { ramp: [R.t[0], R.t[1], R.t[2], R.t[3], R.t[4], R.a[5]], base: 3, shine: true },
    hemd: { ramp: [R.b[0], R.b[1], R.b[2], R.b[3], R.b[4]], base: 2, seam: true },
    // Kragen und gekrempelte Ärmel: der helle Stoff der Innenseite
    saum: { ramp: [R.b[1], R.b[2], R.b[3], R.b[4], R.b[5]], base: 2, seam: true },
    hose: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3], R.e[4], R.e[5]], base: 3, seam: true },
    // Flicken aus hellem Leinen auf dem Knie
    leinen: { ramp: [R.e[3], R.e[5], R.e[6], R.e[7], R.e[8]], base: 2, seam: true },
    schuh: { ramp: [R.n[0], R.e[0], R.e[1], R.e[2], R.e[3]], base: 2, seam: true, shine: true },
    moos: { ramp: [R.g[2], R.g[3], R.g[4], R.g[5], R.g[6], R.g[7]], base: 3, pattern: (p) => ((Math.floor(p[0] * 30) ^ Math.floor(p[2] * 30) ^ Math.floor(p[1] * 30)) & 1 ? 1 : 0) },
    haar: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3], R.e[4]], base: 2, seam: true },
    // Wischer beim Schlag: nur ein heller Schemen der Hand
    wisch: { ramp: [R.t[3], R.t[4], R.a[6]], base: 1, flat: true, outline: R.t[2] },
  },
  build(ctx) {
    const { W, stamps, anim, k, dir } = ctx;
    // Auf dem Rücken ist das Hemd zerrissen, darunter wächst Moos
    const hole = (l) => (l[2] < -0.08 && Math.hypot(l[0] - 0.09, l[1] - 0.01) < 0.06 + 0.012 * (Math.floor(Math.atan2(l[1], l[0] - 0.09) * 3) & 1) ? 'moos' : null);
    const B = {
      ...BODY,
      cuff: 'saum',
      torso: BODY.torso.map((t) => (t.part === 'brust' ? { ...t, matAt: hole } : t)),
      head: { ...BODY.head, matAt: hairAt },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs, arms } = body;
    // Auf dem rechten Knie ein Flicken aus hellem Leinen (vorn, gut handbreit)
    const leg = legs[1];
    const kneeW = W(leg.knee);
    const along = norm(sub(W(leg.ankle), kneeW));
    const patch = (l, p) => {
      const d = sub(p, kneeW);
      const t = dot(d, along);
      return t > -0.05 && t < 0.07 && Math.abs(dot(d, ctx.right)) < 0.05 && dot(d, ctx.fwd) > 0.03 ? 'leinen' : null;
    };
    ctx.part('thigh1').matAt = patch;
    ctx.part('shin1').matAt = patch;
    // Aus dem linken Schuh schaut vorn ein Zeh
    ctx.ellipsoid(add(legs[0].foot, [0.025, 0.025, 0.125]), [0.04, 0.034, 0.045], 'haut');
    // Links hängt das Hemd aus der Hose
    ctx.ellipsoid(add(spine(0.04), [-0.12, -0.02, 0.015]), [0.115, 0.075, 0.165], 'hemd', { pitch: body.stoop, roll: -0.12, blend: 0.02 });
    // Kragen um den Hals (von hinten und von der Seite zu sehen)
    ctx.ellipsoid(spine(0.41), [0.13, 0.05, 0.115], 'saum', { pitch: body.stoop });
    // Moos auf der linken Schulter
    const shoulderL = add(spine(0.35), [-0.24, 0, 0]);
    ctx.ellipsoid(add(shoulderL, [0, 0.06, -0.01]), [0.11, 0.06, 0.11], 'moos', { pitch: body.stoop });
    // Der Wischer beim Schlag: ein heller Schemen von oben herab bis zu den Händen
    if (anim === 'schlag' && k === 1) {
      for (const a of arms) ctx.capsule(add(spine(0.34), [a.side * 0.28, 0.42, 0.12]), a.hand, 0.03, 0.05, 'wisch');
    }
    // Eine runde Nase (von der Seite sieht man sie)
    headEllipsoid(ctx, body, [0.01, -0.035, 0.235], [0.04, 0.045, 0.045], 'haut', { blend: 0.02 });
    // Das Haar ist wirr: Büschel über den Rand des Kopfs hinaus, eine Locke fällt in die Stirn
    for (const [x, y, z, r] of [[-0.1, 0.12, -0.19, 0.075], [0.12, 0.06, -0.2, 0.07], [0.0, 0.2, 0.06, 0.06]]) {
      headEllipsoid(ctx, body, [x, y, z], [r, r * 0.8, r], 'haar', { blend: 0.015 });
    }
    headCapsule(ctx, body, [-0.03, 0.2, 0.17], [-0.1, 0.09, 0.245], 0.03, 0.018, 'haar');
    // Ohren, das linke oben eingerissen
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.255, -0.01, -0.02], [0.045, 0.08, 0.06], 'haut', { blend: 0.02 });
    headEllipsoid(ctx, body, [-0.285, 0.07, -0.02], [0.05, 0.035, 0.03], 'haut', { cut: true, wall: 'haut' });
    // Wirbel: drei Strähnen stehen ab, eine hängt hinten heraus
    headCapsule(ctx, body, [0.02, 0.2, -0.04], [0.1, 0.32, 0.03], 0.032, 0.012, 'haar');
    headCapsule(ctx, body, [-0.08, 0.2, -0.05], [-0.18, 0.29, 0.02], 0.03, 0.01, 'haar');
    headCapsule(ctx, body, [0.0, 0.2, -0.12], [-0.02, 0.3, -0.2], 0.03, 0.012, 'haar');
    headCapsule(ctx, body, [0.12, 0.02, -0.2], [0.17, -0.12, -0.22], 0.03, 0.014, 'haar');
    // Stempel: Gesicht, Hemd (von vorn), Gesäßtasche (von hinten), Pilzchen, Blume, Moderpilzchen
    putFace(ctx, FACES, SCHLURFER_FACE, W(H([0.0, 0.0, 0.24])));
    const chest = spine(0.31);
    const S = SCHLURFER_STAMPS;
    if (dir < 2) {
      for (const b of [add(chest, [0, 0.05, 0.19]), add(chest, [0, -0.07, 0.2]), add(spine(0.17), [0, -0.05, 0.2])]) stamps.push({ stamp: S.knopf, at: W(b) });
      stamps.push({ stamp: S.flicken, at: W(add(spine(0.15), [0.13, 0, 0.19])) });
      stamps.push({ stamp: S.tasche, at: W(add(chest, [-0.1, 0.03, 0.18])) });
    }
    if (dir >= 3) stamps.push({ stamp: S.hosentasche, at: W(add(spine(0.02), [-0.1, -0.02, -0.16])), opts: { depth: 0.04 } });
    if (dir >= 2 && !(anim === 'fallen' && k >= 2)) {
      for (const l of [[-0.12, 0.02, -0.25], [0.09, -0.04, -0.25], [0.0, 0.1, -0.235]]) stamps.push({ stamp: COMMON.moderpilz, at: W(H(l)), opts: { depth: 0.04 } });
    }
    stamps.push({ stamp: S.pilz, at: W(add(shoulderL, [0.02, 0.13, 0.02])), opts: { need: false } });
    stamps.push({ stamp: S.blume, at: W(H([0.2, 0.17, 0.08])), opts: { need: false } });
    groundStamps(ctx, arms.map((a) => a.hand));
  },
};
const SCHLURFER_FACE = faceLegend(schlurfer.materials.haut.ramp, R.f[7]);

// --- Der Flitzer ----------------------------------------------------------------------------

/** Kapuze über dem Kopf (Punkt im Kopfrahmen): vorn ein Oval fürs Gesicht, darin oben Stirnfransen. */
function hoodAt(l) {
  const [x, y, z] = l;
  const ox = x / 0.2;
  const oy = (y + 0.015) / 0.175;
  if (z > 0.08 && ox * ox + oy * oy < 1) {
    const zig = Math.floor((x + 0.4) * 22) & 1;
    return y > 0.1 + 0.03 * zig ? 'haar' : 'haut';
  }
  // Die Naht über die Mitte der Kapuze, von der Stirn bis in den Nacken
  return Math.abs(x) < 0.014 && (y > 0.12 || z < 0) ? 'naht' : 'kapuze';
}

const FLITZER_FACES = {
  ...FACES,
  // Er hechelt: die Augen weit offen, der Mund offen, die Zunge hängt heraus
  muede: {
    S: ['.bbb.....bbb.', '.ddd.....ddd.', 'dYwYd...dYwYd', 'dYYYd...dYYYd', '.ddd.....ddd.', '......n......', '....kkkkk....', '....kmmmk....', '.....kppk....', '......kk.....'],
    SO: ['bb.....bbb..', 'dd.....ddd..', 'Ywd...dYwYd.', 'YYd...dYYYd.', 'dd.....ddd..', '.......n....', '.....kkkkk..', '.....kmmmk..', '......kppk..', '.......kk...'],
    O: ['..bbb.', '..ddd.', '.dYwYd', '.dYYYd', '..ddd.', '.....n', '...kkk', '...kmm', '....kp', '....kp'],
  },
};

const FLITZER_STAMPS = {
  // Die Startnummer vom letzten Lauf, mit zwei Sicherheitsnadeln angesteckt
  nummer: { rows: ['swwwwwwws', 'wwkwwkkkw', 'wkkwwwwkw', 'wwkwwwkkw', 'wwkwwwwkw', 'wkkkwkkkw', 'wwwwwwwww'], legend: { w: P.a4, k: R.n[1], s: R.s[6] } },
  // Die Enden der Kordeln (Metallhülsen)
  kordelEnde: { rows: ['s', 's'], legend: { s: R.s[5] } },
};

/**
 * Der Flitzer: war einmal ein Läufer – rote Kapuzenjacke mit Kängurutasche und Kordeln, die beim
 * Rennen flattern, auf der Brust noch die Startnummer 13 vom letzten Lauf, graue Trainingshose
 * mit weißen Seitenstreifen, helle Laufschuhe mit rotem Streifen. Er rennt vorgebeugt mit
 * angewinkelten Armen und hechelt mit heraushängender Zunge. Auf der Kapuze wächst Moos.
 */
const flitzer = {
  size: 0.95,
  gait: 'rennen',
  materials: {
    haut: schlurfer.materials.haut,
    kapuze: { ramp: [R.r[0], R.r[1], R.r[2], R.r[3], R.r[4], R.f[3]], base: 3, seam: true },
    naht: { ramp: [R.r[0], R.r[1], R.r[2], R.r[3]], base: 1 },
    // Bündchen und Tasche: dunkler, gerippt
    bund: { ramp: [R.r[0], R.r[1], R.r[2], R.r[3]], base: 2, seam: true, pattern: (p) => (Math.floor((p[0] + p[2]) * 40) & 1 ? -1 : 0) },
    tasche: { ramp: [R.r[0], R.r[1], R.r[2], R.r[3], R.r[4]], base: 2, seam: true },
    hose: { ramp: [R.s[0], R.s[1], R.s[2], R.s[3], R.s[4], R.s[5]], base: 3, seam: true },
    streifen: { ramp: [R.s[5], R.s[7], R.s[8], R.s[9]], base: 2 },
    schuh: { ramp: [R.s[3], R.s[5], R.s[7], R.s[8], R.s[9]], base: 3, seam: true, shine: true },
    schuhRot: { ramp: [R.r[1], R.r[2], R.r[3], R.r[4]], base: 2 },
    sohle: { ramp: [R.s[1], R.s[2], R.s[3], R.s[4]], base: 1, seam: true },
    kordel: { ramp: [R.s[5], R.s[7], R.s[8], R.s[9]], base: 2 },
    haar: schlurfer.materials.haar,
    wisch: schlurfer.materials.wisch,
  },
  build(ctx) {
    const { W, stamps, anim, k, dir } = ctx;
    // Kängurutasche und gerippter Bund am Bauch der Jacke
    const belly = (l) => {
      if (l[1] < -0.105) return 'bund';
      const w = 0.12 + 0.35 * Math.max(0, -0.02 - l[1]);
      return l[2] > 0.08 && l[1] > -0.1 && l[1] < -0.005 && Math.abs(l[0]) < w ? 'tasche' : null;
    };
    const B = {
      ...BODY,
      gap: 0.1,
      legR: [0.085, 0.075, 0.068],
      shoe: [0.085, 0.056, 0.145],
      stoop: 0.12,
      torso: [
        { d: 0.03, rr: [0.19, 0.1, 0.15], mat: 'hose', blend: 0.05 },
        { d: 0.17, rr: [0.215, 0.15, 0.17], mat: 'kapuze', matAt: belly },
        { d: 0.3, rr: [0.25, 0.14, 0.165], mat: 'kapuze', part: 'brust' },
      ],
      shoulderW: 0.24,
      armR: [0.07, 0.064, 0.058, 0.054],
      hand: [0.05, 0.06, 0.05],
      limp: 0,
      head: { ...BODY.head, matAt: hoodAt },
      mats: { ...BODY.mats, upper: 'kapuze', fore: 'kapuze', head: 'kapuze', neck: 'kapuze' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms } = body;
    // Weiße Seitenstreifen an der Trainingshose (je Bein außen)
    for (const i of [0, 1]) {
      const out = mul(ctx.right, i ? 1 : -1);
      for (const name of ['thigh', 'shin']) {
        const s = ctx.part(name + i);
        const axis = norm(sub(s.b, s.a));
        s.matAt = (l) => {
          const radial = norm(sub(l, mul(axis, dot(l, axis))));
          return dot(radial, out) > 0.86 ? 'streifen' : null;
        };
      }
      // Laufschuhe: graue Sohle, ein roter Streifen an der Seite
      ctx.part('shoe' + i).matAt = (l) => (l[1] < -0.028 ? 'sohle' : Math.abs(l[0]) > 0.05 && Math.abs(l[1] - 0.004 + l[2] * 0.18) < 0.013 ? 'schuhRot' : null);
    }
    // Bündchen an den Handgelenken
    for (const a of arms) {
      const d = norm(sub(a.wrist, a.elbow));
      ctx.capsule(add(a.wrist, mul(d, -0.035)), a.wrist, 0.06, 0.058, 'bund');
    }
    // Die Kapuze: hinten gebauscht, oben ein Zipfel; die Naht läuft über die Mitte
    const seam = (l) => (Math.abs(l[0]) < 0.014 ? 'naht' : null);
    headEllipsoid(ctx, body, [0, 0.03, -0.15], [0.25, 0.21, 0.16], 'kapuze', { blend: 0.02, matAt: seam });
    headEllipsoid(ctx, body, [0, 0.13, -0.27], [0.08, 0.075, 0.06], 'kapuze', { blend: 0.03, matAt: seam });
    // Kordeln: aus dem Rand der Kapuze über die Brust, sie flattern beim Rennen
    const flap = anim === 'gehen' ? Math.sin(((k / 6) * Math.PI * 2) + 1) : 0;
    const ends = [];
    for (const side of [-1, 1]) {
      const top = H([side * 0.075, -0.175, 0.2]);
      const end = add(spine(0.2), [side * 0.07 + 0.02 * flap * side, -0.02, 0.2 + 0.05 * Math.abs(flap)]);
      ctx.capsule(top, end, 0.014, 0.013, 'kordel');
      ends.push(end);
    }
    if (anim === 'schlag' && k === 1) {
      for (const a of arms) ctx.capsule(add(spine(0.34), [a.side * 0.28, 0.42, 0.12]), a.hand, 0.03, 0.05, 'wisch');
    }
    headEllipsoid(ctx, body, [0.01, -0.035, 0.235], [0.04, 0.045, 0.045], 'haut', { blend: 0.02 });
    // Stempel
    putFace(ctx, FLITZER_FACES, FLITZER_FACE, W(H([0.0, -0.01, 0.24])));
    if (dir < 2) stamps.push({ stamp: FLITZER_STAMPS.nummer, at: W(add(spine(0.27), [0.03, 0, 0.17])) });
    if (dir <= 2) for (const e of ends) stamps.push({ stamp: FLITZER_STAMPS.kordelEnde, at: W(add(e, [0, -0.02, 0])), opts: { need: false } });
    groundStamps(ctx, arms.map((a) => a.hand));
  },
};
const FLITZER_FACE = faceLegend(schlurfer.materials.haut.ramp, R.f[7]);

// --- Der Schwärmer ---------------------------------------------------------------------------

const SCHWAERMER_FACES = {
  // große, runde, blasse Augen und ein winziger Mund
  muede: {
    S: ['.dd...dd.', 'dYYd.dYYd', 'dwYd.dwYd', '.dd...dd.', '....k....'],
    SO: ['d...dd..', 'Yd.dYYd.', 'Yd.dwYd.', 'd...dd..', '.....k..'],
    O: ['.dd.', 'dYYd', 'dwYd', '.dd.', '...k'],
  },
  gaehnen: {
    S: ['.dd...dd.', 'dYYd.dYYd', 'dwYd.dwYd', '.dd...dd.', '...kkk...', '...kmk...', '...kkk...'],
    SO: ['d...dd..', 'Yd.dYYd.', 'Yd.dwYd.', 'd...dd..', '....kkk.', '....kmk.', '....kkk.'],
    O: ['.dd.', 'dYYd', 'dwYd', '.dd.', '..kk', '..km', '..kk'],
  },
  aua: {
    S: ['dd.....dd', '.dd...dd.', 'dd.....dd', '.........', '...kkk...'],
    SO: ['d....dd.', '.d..dd..', 'd....dd.', '........', '....kk..'],
    O: ['.dd.', 'dd..', '.dd.', '....', '..kk'],
  },
  schlaf: {
    S: ['.........', 'ddd...ddd', '.........', '....k....'],
    SO: ['........', 'dd..ddd.', '........', '.....k..'],
    O: ['....', '.ddd', '....', '...k'],
  },
};

const SCHWAERMER_STAMPS = {
  // winzige weiße Blüten im Moos
  bluete: { rows: ['w'], legend: { w: P.a4 } },
  bluete2: { rows: ['wy'], legend: { w: P.a4, y: P.f6 } },
};

/**
 * Der Schwärmer: kein Mensch, sondern ein Sporenkind aus der Kapsel des Brüters – klein, rund und
 * ganz aus Moos, mit kurzen Stummelbeinen, großen blassen Augen und drei Fliegenpilzen auf dem
 * Kopf (das Zeichen der Art, auch im dichtesten Schwarm). Im Moos blühen winzige weiße Blüten.
 * Er trippelt mit kleinen, schnellen Schritten.
 */
const schwaermer = {
  size: 0.62,
  gait: 'trippeln',
  shadowSize: { x: 0.34, z: 0.2 },
  materials: {
    // Moos in Büscheln (je gut 5 cm hell oder dunkel, kein Gries), der Kopf heller als der Leib
    moos: { ramp: [R.g[2], R.g[3], R.g[4], R.g[5], R.g[6], R.g[7], R.g[8]], base: 4, pattern: clumps },
    dunkelmoos: { ramp: [R.g[0], R.g[1], R.g[2], R.g[3], R.g[4], R.g[5]], base: 3, seam: true, pattern: clumps },
    // Das Gesicht: eine Flechte, blass und glatt
    flechte: { ramp: [R.g[4], R.g[6], R.g[7], R.g[8], R.g[9]], base: 2, seam: true },
    pilzhut: { ramp: [R.r[1], R.r[2], R.r[3], R.r[4], P.a4], base: 2, shine: false, seam: true, pattern: (p) => (hashDot(p) ? 9 : 0) },
    stiel: { ramp: [R.e[5], R.e[6], R.e[7], R.e[8], R.e[9]], base: 3, seam: true },
    wisch: { ramp: [R.g[5], R.g[6], R.g[8]], base: 1, flat: true, outline: R.g[3] },
  },
  build(ctx) {
    const { W, stamps, anim, k, dir } = ctx;
    const B = {
      ...BODY,
      gap: 0.1,
      thigh: 0.13,
      shin: 0.12,
      ankle: 0.07,
      legR: [0.085, 0.08, 0.075],
      shoe: [0.08, 0.07, 0.1],
      footZ: 0.02,
      stoop: 0.1,
      torso: [
        { d: 0.06, rr: [0.18, 0.13, 0.16], mat: 'dunkelmoos', blend: 0.05 },
        { d: 0.19, rr: [0.19, 0.13, 0.16], mat: 'dunkelmoos', part: 'brust' },
      ],
      shoulderD: 0.22,
      shoulderW: 0.2,
      upper: 0.14,
      fore: 0.12,
      armR: [0.06, 0.055, 0.052, 0.05],
      hand: [0.055, 0.06, 0.055],
      limp: 0.2,
      neckD: 0.26,
      neckR: 0.08,
      headOffset: [0, 0.29, 0.03],
      head: { h: [0.32, 0.28, 0.3], r: 0.24, matAt: (l) => (l[2] > 0.1 && (l[0] / 0.22) ** 2 + ((l[1] + 0.03) / 0.17) ** 2 < 1 ? 'flechte' : null) },
      headPitch: -0.12,
      mats: { thigh: 'dunkelmoos', shin: 'dunkelmoos', shoe: 'dunkelmoos', upper: 'dunkelmoos', fore: 'dunkelmoos', hand: 'dunkelmoos', neck: 'dunkelmoos', head: 'moos' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms } = body;
    // Drei Fliegenpilze auf dem Kopf: groß links, klein rechts, einer hinten
    for (const [x, z, stem, cap, lean] of [[-0.15, 0.0, 0.17, 0.13, -0.35], [0.16, 0.04, 0.09, 0.1, 0.4], [0.02, -0.18, 0.13, 0.11, -0.05]]) {
      const base = [x, 0.24, z];
      const top = [x + Math.sin(lean) * stem, 0.24 + Math.cos(lean) * stem, z];
      headCapsule(ctx, body, base, top, 0.035, 0.03, 'stiel', { blend: 0.02 });
      headEllipsoid(ctx, body, add(top, [0, 0.035, 0]), [cap, cap * 0.62, cap], 'pilzhut', { roll: lean * 0.6 });
    }
    if (anim === 'schlag' && k === 1) {
      for (const a of arms) ctx.capsule(add(spine(0.22), [a.side * 0.22, 0.3, 0.1]), a.hand, 0.03, 0.045, 'wisch');
    }
    putFace(ctx, SCHWAERMER_FACES, SCHWAERMER_FACE, W(H([0.0, -0.03, 0.28])));
    // Blüten im Moos: am Bauch (vorn) und auf dem Rücken
    if (dir <= 2) {
      stamps.push({ stamp: SCHWAERMER_STAMPS.bluete2, at: W(add(spine(0.12), [0.1, 0, 0.17])) });
      stamps.push({ stamp: SCHWAERMER_STAMPS.bluete, at: W(add(spine(0.2), [-0.12, 0.02, 0.16])) });
    } else {
      stamps.push({ stamp: SCHWAERMER_STAMPS.bluete2, at: W(add(spine(0.16), [-0.06, 0, -0.17])) });
    }
    groundStamps(ctx, arms.map((a) => a.hand), 0.8);
  },
};
const SCHWAERMER_FACE = faceLegend([R.g[1], R.g[2], R.g[3]], R.f[8], P.a4);

// --- Der Brummer ----------------------------------------------------------------------------

const BRUMMER_FACES = {
  // kleine, grimmige Augen unter schweren Brauen; der Mund steckt unter dem Schnurrbart
  muede: {
    S: ['.bbbb...bbbb.', '..ddd...ddd..', '..dYY...YYd..', '...l.....l...', '......n......'],
    SO: ['bbb....bbbb.', '.dd....ddd..', '.YY....YYd..', '..l.....l...', '.......n....'],
    O: ['.bbbb.', '..ddd.', '..dYY.', '...l..', '.....n'],
  },
  gaehnen: {
    S: ['bbbb.....bbbb', '.dddd...dddd.', '.dYYd...dYYd.', '.dYwd...dwYd.', '..dd.....dd..', '......n......'],
    SO: ['bbb.....bbbb', 'ddd....dddd.', 'YYd....dYYd.', 'wYd....dwYd.', 'dd......dd..', '.......n....'],
    O: ['.bbbb.', '.dddd.', '.dYYd.', '.dwYd.', '..dd..', '.....n'],
  },
  aua: {
    S: ['.bbb....bbb..', '.d.......dd..', '..dd....dd...', '.d.......dd..', '......n......'],
    SO: ['bbb....bbb..', 'd.......dd..', '.dd....dd...', 'd.......dd..', '.......n....'],
    O: ['..bbb.', '...dd.', '..dd..', '...dd.', '.....n'],
  },
  schlaf: {
    S: ['.bbbb...bbbb.', '.............', '..ddd...ddd..', '......n......'],
    SO: ['bbb....bbbb.', '............', '.dd....ddd..', '.......n....'],
    O: ['.bbbb.', '......', '..ddd.', '.....n'],
  },
};

const BRUMMER_STAMPS = {
  niete: { rows: ['w'], legend: { w: R.s[8] } },
  rost: { rows: ['rR', 'R.'], legend: { r: R.r[3], R: R.r[2] } },
  // Der Schraubenschlüssel am Gürtel
  schluessel: { rows: ['s.s', 'sss', '.s.', '.s.', '.s.', 'sss'], legend: { s: R.s[6] } },
};

/**
 * Der Brummer: war einmal Straßenarbeiter – groß und breit, mit Bauch, eine orange Warnweste mit
 * Leuchtstreifen (offen über dem braunen Hemd), Blechplatten auf den Schultern und vor dem Bauch
 * (eine vernietet, mit Rost), ein Werkzeuggürtel mit Schraubenschlüssel, schwere Stiefel mit
 * Stahlkappen, ein buschiger Schnurrbart und als Helm ein schiefer Warnkegel mit Leuchtring. Er
 * stampft und schaukelt von einer Seite zur anderen. Nachts leuchten Streifen und Ring.
 */
const brummer = {
  size: 1.4,
  gait: 'stampfen',
  materials: {
    haut: { ramp: [R.t[0], R.t[1], R.t[2], R.t[3], R.t[4]], base: 2, shine: true },
    hemd: { ramp: [R.e[1], R.e[2], R.e[3], R.e[4], R.e[5], R.e[6]], base: 3, seam: true },
    weste: { ramp: [R.f[0], R.f[1], R.f[2], R.f[3], R.f[4], R.f[5]], base: 3, seam: true },
    reflektor: { ramp: [R.s[7], R.s[8], R.s[9]], base: 1, glow: true },
    hose: { ramp: [R.n[1], R.n[2], R.e[1], R.e[2], R.e[3]], base: 3, seam: true },
    gurt: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3]], base: 2, seam: true },
    stiefel: { ramp: [R.n[0], R.n[1], R.n[2], R.n[3], R.n[4]], base: 2, seam: true, shine: true },
    kappe: { ramp: [R.s[2], R.s[3], R.s[4], R.s[5], R.s[6], R.s[7]], base: 2, seam: true, shine: true },
    blech: { ramp: [R.s[1], R.s[2], R.s[3], R.s[4], R.s[5], R.s[6], R.s[7]], base: 3, seam: true, shine: true },
    kegel: { ramp: [R.f[0], R.f[1], R.f[2], R.f[3], R.f[4], R.f[5]], base: 3, seam: true, shine: true },
    kegelfuss: { ramp: [R.f[0], R.f[1], R.f[2], R.f[3]], base: 1, seam: true },
    bart: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3], R.e[4]], base: 2, seam: true },
    moos: schlurfer.materials.moos,
    wisch: { ramp: [R.t[2], R.t[3], R.t[4]], base: 1, flat: true, outline: R.t[1] },
  },
  build(ctx) {
    const { W, stamps, anim, k, dir } = ctx;
    // Warnweste: offen vorn (dort das Hemd), ein Leuchtstreifen um den Bauch, zwei über die Brust
    const belly = (l) => (l[2] > 0.1 && Math.abs(l[0]) < 0.035 ? 'hemd' : l[1] > -0.075 && l[1] < -0.035 ? 'reflektor' : null);
    const chest = (l) => (l[2] > 0.1 && Math.abs(l[0]) < 0.035 ? 'hemd' : Math.abs(Math.abs(l[0]) - 0.15) < 0.022 ? 'reflektor' : null);
    const B = {
      ...BODY,
      gap: 0.14,
      thigh: 0.19,
      shin: 0.17,
      ankle: 0.07,
      legR: [0.115, 0.1, 0.095],
      shoe: [0.11, 0.07, 0.16],
      stoop: 0.18,
      torso: [
        { d: 0.03, rr: [0.26, 0.11, 0.19], mat: 'hose', blend: 0.05, matAt: (l) => (l[1] > 0.035 ? 'gurt' : null) },
        { d: 0.17, z: 0.04, rr: [0.3, 0.19, 0.25], mat: 'weste', matAt: belly },
        { d: 0.33, rr: [0.33, 0.15, 0.21], mat: 'weste', part: 'brust', matAt: chest },
      ],
      shoulderD: 0.36,
      shoulderW: 0.32,
      upper: 0.21,
      fore: 0.19,
      armR: [0.095, 0.088, 0.075, 0.07],
      hand: [0.075, 0.09, 0.07],
      limp: 0.3,
      neckD: 0.42,
      neckR: 0.09,
      headOffset: [0, 0.21, 0.08],
      head: { h: [0.24, 0.2, 0.22], r: 0.15 },
      headPitch: -0.1,
      mats: { ...BODY.mats, shoe: 'stiefel' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs, arms, stoop } = body;
    // Stahlkappen vorn auf den Stiefeln
    for (const leg of legs) ctx.ellipsoid(add(leg.foot, [0, 0.01, 0.09]), [0.1, 0.06, 0.07], 'kappe');
    // Blech auf den Schultern, vernietet
    for (const a of arms) ctx.ellipsoid(add(a.shoulder, [a.side * 0.02, 0.06, -0.01]), [0.125, 0.05, 0.13], 'blech', { pitch: stoop, roll: a.side * -0.35 });
    // Schnurrbart unter der Nase
    headEllipsoid(ctx, body, [0.01, -0.03, 0.225], [0.035, 0.04, 0.04], 'haut', { blend: 0.02 });
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.055, -0.085, 0.215], [0.065, 0.03, 0.032], 'bart', { roll: side * -0.35 });
    // Der Warnkegel als Helm: schief, mit Leuchtring und schwarzem Fuß
    ctx.box(body.H([0, 0.195, -0.01]), [0.185, 0.018, 0.185], 0.02, 'kegelfuss', { ax: body.headAx });
    const cone = headCapsule(ctx, body, [0, 0.22, -0.01], [0.05, 0.62, -0.05], 0.165, 0.028, 'kegel');
    const axis = norm(sub(cone.b, cone.a));
    const len = Math.hypot(...sub(cone.b, cone.a));
    cone.matAt = (l) => {
      const t = dot(l, axis) / len;
      return t > 0.36 && t < 0.52 ? 'reflektor' : null;
    };
    // Moos auf der rechten Schulterplatte
    ctx.ellipsoid(add(arms[1].shoulder, [0.03, 0.11, -0.03]), [0.08, 0.035, 0.07], 'moos');
    if (anim === 'schlag' && k === 1) {
      for (const a of arms) ctx.capsule(add(spine(0.36), [a.side * 0.34, 0.45, 0.14]), a.hand, 0.035, 0.06, 'wisch');
    }
    putFace(ctx, BRUMMER_FACES, BRUMMER_FACE, W(H([0.0, 0.03, 0.225])));
    for (const a of arms) {
      for (const dz of [-0.07, 0.07]) stamps.push({ stamp: BRUMMER_STAMPS.niete, at: W(add(a.shoulder, [a.side * 0.05, 0.1, dz])), opts: { depth: 0.04 } });
    }
    stamps.push({ stamp: BRUMMER_STAMPS.rost, at: W(add(arms[0].shoulder, [-0.02, 0.1, 0.02])), opts: { depth: 0.04 } });
    if (dir >= 1 && dir <= 3) stamps.push({ stamp: BRUMMER_STAMPS.schluessel, at: W(add(spine(0.0), [0.27, -0.06, 0.02])), opts: { need: false, depth: 0.1 } });
    groundStamps(ctx, arms.map((a) => a.hand), 1.2);
  },
};
const BRUMMER_FACE = faceLegend(brummer.materials.haut.ramp, R.f[6]);

// --- Der Leuchtpilz --------------------------------------------------------------------------

const LEUCHTPILZ_STAMPS = {
  // Kräuter, die aus dem Beutel am Gürtel schauen
  kraut: { rows: ['g.g', '.gG', '.G.'], legend: { g: R.g[6], G: R.g[4] } },
  // Glimmende Sporen, die um ihn schweben (nur beim Stehen und Gehen)
  spore: { rows: ['s'], legend: { s: { glow: R.a[6] } } },
};

/**
 * Der Leuchtpilz: ein stiller Kräutersammler, dem ein großer Pilz aus dem Kopf gewachsen ist –
 * der Hut glimmt türkis und hat helle Tupfen, darunter feine Lamellen. Ein pflaumenfarbenes
 * Gewand bis unter die Knie, ein Strick als Gürtel, daran ein Beutel mit Kräutern und ein kleiner
 * glimmender Sporenbeutel, ein Kragen aus Moos. Um ihn schweben ein paar glimmende Sporen (er
 * heilt die anderen). Er geht ruhig und aufrecht.
 */
const leuchtpilz = {
  size: 1.05,
  gait: 'schreiten',
  materials: {
    haut: schlurfer.materials.haut,
    gewand: { ramp: [R.d[0], R.d[1], R.d[2], R.d[3], R.d[4]], base: 2, seam: true },
    hose: { ramp: [R.n[1], R.d[0], R.d[1], R.d[2]], base: 2, seam: true },
    strick: { ramp: [R.e[4], R.e[5], R.e[6], R.e[7]], base: 2, seam: true },
    beutel: { ramp: [R.e[2], R.e[3], R.e[4], R.e[5], R.e[6]], base: 2, seam: true },
    hut: { ramp: [R.t[3], R.a[5], R.a[6]], base: 1, glow: true },
    tupfen: { ramp: [P.a4], base: 0, glow: true, flat: true },
    lamellen: { ramp: [R.d[2], R.d[3], R.d[4], R.d[5]], base: 1, seam: true, pattern: (p) => (Math.floor(Math.atan2(p[2], p[0]) * 9) & 1 ? -1 : 0) },
    sporen: { ramp: [R.a[6], P.a4], base: 0, glow: true },
    schuh: { ramp: [R.n[0], R.e[0], R.e[1], R.e[2]], base: 2, seam: true },
    moos: schlurfer.materials.moos,
    wisch: schlurfer.materials.wisch,
  },
  build(ctx) {
    const { W, stamps, anim, k, dir, pose } = ctx;
    const B = {
      ...BODY,
      stoop: 0.14,
      torso: [
        { d: 0.03, rr: [0.21, 0.1, 0.16], mat: 'gewand', blend: 0.05, matAt: (l) => (l[1] > 0.02 && l[1] < 0.055 ? 'strick' : null) },
        { d: 0.17, rr: [0.23, 0.15, 0.18], mat: 'gewand' },
        { d: 0.31, rr: [0.26, 0.14, 0.17], mat: 'gewand', part: 'brust' },
      ],
      mats: { ...BODY.mats, thigh: 'hose', shin: 'hose', upper: 'gewand', fore: 'gewand' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs, arms, stoop } = body;
    // Das Gewand fällt bis ans Knie und schwingt mit den Schritten
    const hem = add(lerp3(legs[0].knee, legs[1].knee, 0.5), [0, 0.03, 0.02]);
    ctx.capsule(spine(0.05), hem, 0.22, 0.225, 'gewand', { blend: 0.04 });
    // Strick als Gürtel, Kragen aus Moos
    ctx.ellipsoid(spine(0.02), [0.245, 0.032, 0.205], 'strick', { pitch: stoop });
    ctx.ellipsoid(spine(0.4), [0.17, 0.06, 0.15], 'moos', { pitch: stoop });
    // Beutel mit Kräutern (rechts) und ein glimmender Sporenbeutel (links) am Strick
    const bag = add(spine(0.0), [0.24, -0.1, 0.05]);
    ctx.ellipsoid(bag, [0.07, 0.085, 0.05], 'beutel', { pitch: stoop });
    const spores = add(spine(0.0), [-0.23, -0.08, 0.07]);
    ctx.ellipsoid(spores, [0.045, 0.05, 0.045], 'sporen');
    // Der Hut: gewölbt, mit hellen Tupfen, darunter die Lamellen
    headEllipsoid(ctx, body, [0, 0.19, -0.01], [0.37, 0.06, 0.35], 'lamellen');
    headEllipsoid(ctx, body, [0, 0.26, -0.01], [0.38, 0.19, 0.36], 'hut', { matAt: (l) => (l[1] < -0.035 ? 'lamellen' : capSpot(l, [0.38, 0.19, 0.36], 0.05) ? 'tupfen' : null) });
    if (anim === 'schlag' && k === 1) {
      for (const a of arms) ctx.capsule(add(spine(0.34), [a.side * 0.28, 0.42, 0.12]), a.hand, 0.03, 0.05, 'wisch');
    }
    headEllipsoid(ctx, body, [0.01, -0.035, 0.235], [0.04, 0.045, 0.045], 'haut', { blend: 0.02 });
    putFace(ctx, FACES, LEUCHTPILZ_FACE, W(H([0.0, -0.02, 0.24])));
    stamps.push({ stamp: LEUCHTPILZ_STAMPS.kraut, at: W(add(bag, [0, 0.09, 0])), opts: { need: false } });
    // Schwebende Sporen: je Bild an anderer Stelle
    if (anim === 'gehen' || anim === 'stehen') {
      const t = k * 1.7 + (anim === 'stehen' ? 5 : 0);
      for (let i = 0; i < 3; i++) {
        const a = t + i * 2.1;
        stamps.push({ stamp: LEUCHTPILZ_STAMPS.spore, at: W([Math.cos(a) * 0.45, 0.7 + 0.35 * ((i * 0.37 + t * 0.13) % 1), Math.sin(a) * 0.3]), opts: { need: false, depth: 1 } });
      }
    }
    groundStamps(ctx, arms.map((a) => a.hand));
    void dir;
    void pose;
  },
};
const LEUCHTPILZ_FACE = faceLegend(schlurfer.materials.haut.ramp, R.a[6], P.a4);

// --- Der Moderfalter -----------------------------------------------------------------------------

/**
 * Pose der Motte je Zustand: Höhe des Leibs, Flügelschlag (Winkel über der Waagerechten, vorn
 * und hinten), Neigung (Kopf runter positiv) und Schieflage.
 */
function mothPose(anim, k) {
  const n = { gehen: 6, stehen: 2, ausholen: 1, schlag: 3, treffer: 1, fallen: 4 }[anim];
  const ph = (n > 1 ? k / n : 0) * Math.PI * 2;
  if (anim === 'gehen') return { h: 1.15 + 0.05 * Math.cos(ph), wing: 0.2 + 0.9 * Math.sin(ph), hind: 0.2 + 0.8 * Math.sin(ph - 0.5), pitch: 0.05, roll: 0 };
  if (anim === 'stehen') return { h: 1.15 + 0.03 * k, wing: k ? -0.1 : 0.55, hind: k ? 0 : 0.45, pitch: 0, roll: 0 };
  if (anim === 'ausholen') return { h: 1.25, wing: 1.25, hind: 1.1, pitch: -0.45, roll: 0 };
  if (anim === 'schlag') return { h: 1.1 - 0.2 * k, wing: [0.6, -0.35, -0.2][k], hind: [0.5, -0.3, -0.15][k], pitch: [0.2, 0.55, 0.7][k], roll: 0 };
  if (anim === 'treffer') return { h: 1.2, wing: 0.9, hind: -0.2, pitch: -0.3, roll: 0.4 };
  // fallen: die Flügel klappen hoch, er trudelt zu Boden und liegt mit ausgebreiteten Flügeln im Laub
  return [
    { h: 1.0, wing: 1.35, hind: 1.25, pitch: 0.3, roll: 0.5 },
    { h: 0.62, wing: 1.1, hind: 0.9, pitch: 0.5, roll: 0.9 },
    { h: 0.22, wing: 0.3, hind: 0.25, pitch: 0.15, roll: 0.3 },
    { h: 0.1, wing: -0.05, hind: -0.05, pitch: 0.05, roll: 0.1 },
  ][k];
}

const FALTER_STAMPS = {
  // Fiedern an den Fühlern
  fieder: { rows: ['f.f', '.f.'], legend: { f: R.d[5] } },
  staub: { rows: ['.s.', 's.s', '.s.'], legend: { s: { glow: R.d[6] } } },
};

/**
 * Der Moderfalter: eine große pflaumenfarbene Motte, die in Kopfhöhe flattert – ein pelziger Leib
 * mit geringeltem Hinterleib, große glimmende Augen, gefiederte Fühler, sechs baumelnde Beinchen.
 * Auf den Vorderflügeln sitzen Augenflecken mit gelbem Ring, die nachts glimmen, die Ränder sind
 * hell, feine Adern laufen vom Leib aus. Zum Angriff stößt er herab und stäubt; wenn er fällt,
 * trudelt er ins Laub und liegt mit ausgebreiteten Flügeln da.
 */
const moderfalter = {
  size: 0.85,
  gait: 'hinken',
  shadowSize: { x: 0.36, z: 0.2 },
  materials: {
    pelz: { ramp: [R.d[1], R.d[2], R.d[3], R.d[4], R.d[5]], base: 2, pattern: clumps },
    leib: { ramp: [R.d[0], R.d[1], R.d[2], R.d[3], R.d[4]], base: 2, seam: true },
    ring: { ramp: [R.d[0], R.d[1], R.d[2]], base: 1 },
    fluegel: { ramp: [R.d[1], R.d[2], R.d[3], R.d[4], R.d[5]], base: 2, seam: true },
    ader: { ramp: [R.d[0], R.d[1], R.d[2]], base: 1 },
    rand: { ramp: [R.d[3], R.d[4], R.d[5], R.d[6]], base: 1, seam: true },
    fleckRing: { ramp: [R.f[5], R.f[6], R.f[7]], base: 1, glow: true },
    fleckAuge: { ramp: [R.n[0], R.n[1]], base: 1, flat: true },
    augen: { ramp: [R.f[6], R.f[7], R.f[8]], base: 1, glow: true },
    fuehler: { ramp: [R.d[3], R.d[4], R.d[5], R.e[7]], base: 2 },
    bein: { ramp: [R.d[0], R.d[1], R.d[2]], base: 1 },
  },
  build(ctx) {
    const { W, stamps, anim, k } = ctx;
    const m = mothPose(anim, k);
    const h = m.h;
    // Rahmen des Leibs: geneigt (pitch) und schief (roll)
    const bodyAx = axesFrame(m.pitch, m.roll);
    const B = (l) => add([0, h, 0], rot(bodyAx, l));
    const bodyW = ctx.AX(m.pitch, m.roll);
    ctx.push({ kind: 'ellipsoid', c: W(B([0, 0, 0.02])), rr: [0.1, 0.1, 0.12], ax: bodyW, mat: 'pelz', blend: 0.03 });
    ctx.push({ kind: 'ellipsoid', c: W(B([0, -0.04, -0.21])), rr: [0.085, 0.085, 0.2], ax: ctx.AX(m.pitch + 0.25, m.roll), mat: 'leib', blend: 0.03, matAt: (l) => (Math.floor((l[2] + 1) * 28) % 3 === 0 ? 'ring' : null) });
    ctx.push({ kind: 'ellipsoid', c: W(B([0, 0.03, 0.15])), rr: [0.075, 0.07, 0.065], ax: bodyW, mat: 'pelz', blend: 0.02 });
    for (const side of [-1, 1]) {
      ctx.push({ kind: 'ellipsoid', c: W(B([side * 0.05, 0.04, 0.19])), rr: [0.032, 0.032, 0.03], ax: bodyW, mat: 'augen' });
      // Gefiederte Fühler
      const a = B([side * 0.03, 0.08, 0.17]);
      const b = B([side * 0.13, 0.27, 0.26]);
      ctx.capsule(a, b, 0.012, 0.009, 'fuehler');
      stamps.push({ stamp: FALTER_STAMPS.fieder, at: W(lerp3(a, b, 0.6)), opts: { need: false, depth: 0.05 } });
      stamps.push({ stamp: FALTER_STAMPS.fieder, at: W(lerp3(a, b, 0.9)), opts: { need: false, depth: 0.05 } });
      // Sechs Beinchen baumeln unter dem Leib
      for (let i = 0; i < 3; i++) ctx.capsule(B([side * 0.05, -0.07, 0.07 - i * 0.06]), B([side * 0.1, -0.2 + i * 0.02, 0.05 - i * 0.07]), 0.011, 0.008, 'bein');
      // Flügel: vorn groß mit Augenfleck, hinten kleiner; die Achse x zeigt nach außen
      for (const [root, span, rr, angle, sweepBack, front] of [
        [[side * 0.07, 0.03, 0.04], 0.3, [0.31, 0.015, 0.19], m.wing, 0.25, true],
        [[side * 0.06, 0.0, -0.08], 0.21, [0.22, 0.015, 0.14], m.hind, 0.55, false],
      ]) {
        const wingAx = axesFrame(m.pitch, m.roll + side * angle, side * sweepBack);
        const out = rot(wingAx, [side, 0, 0]);
        const c = add(B(root), mul(out, span));
        const ax = [rot(bodyWorldTurn(ctx), mul(out, side)), rot(bodyWorldTurn(ctx), rot(wingAx, [0, 1, 0])), rot(bodyWorldTurn(ctx), rot(wingAx, [0, 0, 1]))];
        const pattern = (l) => {
          const x = l[0] * side;
          const e = (l[0] / rr[0]) ** 2 + (l[2] / rr[2]) ** 2;
          if (front) {
            const d = Math.hypot(x - 0.1, l[2] - 0.02);
            if (d < 0.03) return 'fleckAuge';
            if (d < 0.058) return 'fleckRing';
          }
          if (e > 0.72) return 'rand';
          const ang = Math.atan2(l[2], x + rr[0]);
          return Math.abs(Math.sin(ang * 7)) < 0.14 ? 'ader' : null;
        };
        ctx.push({ kind: 'ellipsoid', c: W(c), rr, ax, mat: 'fluegel', matAt: pattern });
      }
    }
    if (anim === 'schlag' && k >= 1) stamps.push({ stamp: FALTER_STAMPS.staub, at: W(B([0, -0.12, 0.3])), opts: { need: false, depth: 1 } });
    groundStamps(ctx, [], 1.1);
  },
};

// --- Bosse ----------------------------------------------------------------------------------------

/** Kreuzprodukt. */
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * Eine Axt: Stiel von `grip` in Richtung `dir` (Figurkoordinaten), am Ende der Kopf, die Schneide
 * zeigt nach `edge` (senkrecht zum Stiel). Gibt den Kopf zurück.
 */
function axe(ctx, grip, dir, edge, len = 0.95) {
  const { W } = ctx;
  const end = add(grip, mul(dir, len));
  ctx.capsule(add(grip, mul(dir, -0.06)), end, 0.026, 0.024, 'stiel');
  const head = add(grip, mul(dir, len - 0.07));
  const blade = add(head, mul(edge, 0.1));
  const wEdge = sub(W(add(blade, edge)), W(blade));
  const wDir = sub(W(add(blade, dir)), W(blade));
  const wSide = cross(wEdge, wDir);
  ctx.push({ kind: 'box', c: W(add(blade, mul(edge, 0.03))), h: [0.024, 0.13, 0.12], r: 0.014, ax: [norm(wSide), norm(wEdge), norm(wDir)], mat: 'axt', matAt: (l) => (l[1] > 0.095 ? 'schneide' : null) });
  ctx.push({ kind: 'box', c: W(add(head, mul(edge, -0.05))), h: [0.032, 0.05, 0.06], r: 0.012, ax: [norm(wSide), norm(wEdge), norm(wDir)], mat: 'axt' });
  return blade;
}

const HOLZ_FACES = {
  muede: BRUMMER_FACES.muede,
  gaehnen: BRUMMER_FACES.gaehnen,
  aua: BRUMMER_FACES.aua,
  schlaf: BRUMMER_FACES.schlaf,
};

/** Rot-schwarzes Karo im Rahmen einer Form, dazu die Hosenträger. */
function plaid(l, braces = true) {
  if (braces && l[2] > -0.3 && Math.abs(Math.abs(l[0]) - 0.13) < 0.026) return 'traeger';
  const a = Math.floor((l[0] + 1) * 8) & 1;
  const b = Math.floor((l[1] + 1) * 8) & 1;
  return a && b ? 'karoDunkel' : a || b ? 'karoMittel' : null;
}

/**
 * Der Holzfäller (Boss): ein Riese im rot-schwarz karierten Hemd mit Hosenträgern, die Ärmel
 * hochgekrempelt, ein buschiger Bart, eine rote Pudelmütze mit Bommel, schwere Stiefel. Die Axt
 * trägt er geschultert; zum Hieb reißt er sie hoch über den Kopf und schlägt zu.
 */
const holzfaeller = {
  size: 1.75,
  gait: 'stampfen',
  cell: { w: 180, h: 184, px: 90, py: 150 },
  materials: {
    haut: { ramp: [R.t[0], R.t[1], R.t[2], R.t[3], R.t[4]], base: 2, shine: true },
    karo: { ramp: [R.r[0], R.r[1], R.r[2], R.r[3], R.r[4]], base: 3, seam: true },
    karoMittel: { ramp: [R.r[0], R.r[1], R.r[2], R.r[3]], base: 1 },
    karoDunkel: { ramp: [R.n[0], R.n[1], R.n[2], R.n[3]], base: 1 },
    traeger: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3]], base: 1, seam: true },
    hose: { ramp: [R.b[0], R.b[1], R.b[2], R.b[3]], base: 2, seam: true },
    stiefel: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3], R.e[4]], base: 2, seam: true, shine: true },
    bart: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3], R.e[4]], base: 2, seam: true, pattern: clumps },
    muetze: { ramp: [R.r[1], R.r[2], R.r[3], R.r[4]], base: 2, seam: true, pattern: (p) => (Math.floor(p[0] * 40) % 3 === 0 ? -1 : 0) },
    muetzeRand: { ramp: [R.n[1], R.n[2], R.n[3]], base: 1, seam: true },
    bommel: { ramp: [R.s[6], R.s[7], R.s[8], P.a4], base: 2, pattern: clumps },
    stiel: { ramp: [R.e[4], R.e[5], R.e[6], R.e[7]], base: 2, seam: true },
    axt: { ramp: [R.s[2], R.s[3], R.s[4], R.s[5], R.s[6]], base: 3, seam: true, shine: true },
    schneide: { ramp: [R.s[7], R.s[8], R.s[9]], base: 1 },
  },
  build(ctx) {
    const { W, anim, k, pose } = ctx;
    const carry = anim === 'gehen' || anim === 'stehen' || anim === 'treffer';
    if (carry) Object.assign(pose, { armR: 0.5, elbowR: 2.35, spreadR: 0.05 });
    else if (anim === 'ausholen') Object.assign(pose, { armL: 2.8, armR: 2.8, elbow: 0.45, spread: 0.08, lean: -0.2 });
    else if (anim === 'schlag') {
      const q = [0.25, 0.62, 1][k];
      Object.assign(pose, { armL: 2.7 - 1.9 * q, armR: 2.7 - 1.9 * q, elbow: 0.3 - 0.25 * q, spread: 0.08 });
    }
    const B = {
      ...BODY,
      gap: 0.14,
      thigh: 0.21,
      shin: 0.19,
      legR: [0.115, 0.1, 0.095],
      shoe: [0.11, 0.07, 0.16],
      stoop: 0.1,
      torso: [
        { d: 0.03, rr: [0.26, 0.11, 0.19], mat: 'hose', blend: 0.05 },
        { d: 0.18, rr: [0.3, 0.18, 0.23], mat: 'karo', matAt: (l) => plaid(l) },
        { d: 0.34, rr: [0.34, 0.16, 0.21], mat: 'karo', part: 'brust', matAt: (l) => plaid(l) },
      ],
      shoulderD: 0.37,
      shoulderW: 0.33,
      upper: 0.22,
      fore: 0.2,
      armR: [0.1, 0.092, 0.078, 0.072],
      hand: [0.075, 0.09, 0.07],
      cuff: 'karoDunkel',
      neckD: 0.43,
      neckR: 0.09,
      headOffset: [0, 0.22, 0.07],
      head: { h: [0.25, 0.21, 0.23], r: 0.17 },
      headPitch: -0.1,
      mats: { ...BODY.mats, upper: 'karo', thigh: 'hose', shin: 'hose', shoe: 'stiefel' },
    };
    const body = humanoid(ctx, B);
    const { H, arms } = body;
    for (const i of [0, 1]) ctx.part('upper' + i).matAt = (l) => plaid(l, false);
    // Buschiger Bart mit Schnauzer, Nase
    headEllipsoid(ctx, body, [0, -0.13, 0.12], [0.22, 0.15, 0.14], 'bart', { blend: 0.02 });
    headEllipsoid(ctx, body, [0.01, -0.02, 0.235], [0.045, 0.05, 0.05], 'haut', { blend: 0.02 });
    // Pudelmütze mit umgeschlagenem Rand und Bommel
    headEllipsoid(ctx, body, [0, 0.16, -0.01], [0.27, 0.13, 0.26], 'muetze', { matAt: (l) => (l[1] < -0.045 ? 'muetzeRand' : null) });
    headEllipsoid(ctx, body, [0.03, 0.3, -0.04], [0.085, 0.08, 0.085], 'bommel');
    // Die Axt: geschultert oder im Hieb
    let blade;
    if (carry) {
      const hand = arms[1].hand;
      const shoulder = add(arms[1].shoulder, [0.02, 0.12, 0]);
      const d = norm(sub(shoulder, hand));
      blade = axe(ctx, add(hand, mul(d, -0.15)), d, norm([0, 1, 0.3]));
    } else if (anim === 'fallen') {
      blade = axe(ctx, [0.35, 0.04, 0.3], norm([0.2, 0, -1]), [1, 0, 0]);
    } else {
      const mid = lerp3(arms[0].hand, arms[1].hand, 0.5);
      const a = anim === 'ausholen' ? -0.8 : [0.5, 1.5, 2.3][k];
      blade = axe(ctx, add(mid, mul(sweep(a), -0.1)), sweep(a), sweep(a + Math.PI / 2));
    }
    putFace(ctx, HOLZ_FACES, HOLZ_FACE, W(H([0.0, 0.03, 0.235])));
    if (anim === 'schlag' && k === 2) ctx.stamps.push({ stamp: COMMON.staub, at: [W(blade)[0], 0.02, W(blade)[2]], opts: { need: false, depth: 1 } });
    groundStamps(ctx, [], 1.5);
  },
};
const HOLZ_FACE = faceLegend(holzfaeller.materials.haut.ramp, R.f[5]);

const PILZMUTTER_STAMPS = {
  wange: { rows: ['pp'], legend: { p: R.a[0] } },
  spore: { rows: ['.s.', 'sws', '.s.'], legend: { s: { glow: R.a[3] }, w: { glow: P.a4 } } },
  pilzchen: { rows: ['rwr', '.s.'], legend: { r: R.r[3], w: P.a4, s: R.e[8] } },
};

/**
 * Die Pilzmutter (Boss): eine große, sanfte Gestalt im pflaumenfarbenen Kleid bis auf den Boden,
 * mit Moosflecken und kleinen Pilzen darauf, einem Umhang aus Moos und einem riesigen violett
 * glimmenden Pilzhut mit hellen Tupfen. Rosige Wangen, blassgrüne Augen. Im Arm trägt sie einen
 * Korb voller Pilze. Zum Angriff hebt sie die Arme und lässt eine Sporenwolke steigen.
 */
const pilzmutter = {
  size: 1.8,
  gait: 'schreiten',
  cell: { w: 170, h: 170, px: 85, py: 136 },
  materials: {
    haut: { ramp: [R.g[1], R.g[2], R.g[3], R.g[4], R.g[5], R.g[6]], base: 3, shine: true },
    kleid: { ramp: [R.d[0], R.d[1], R.d[2], R.d[3], R.d[4]], base: 2, seam: true },
    moos: { ramp: [R.g[2], R.g[3], R.g[4], R.g[5], R.g[6]], base: 2, seam: true, pattern: clumps },
    hut: { ramp: [R.d[2], R.a[2], R.a[3]], base: 1, glow: true },
    tupfen: { ramp: [P.a4], base: 0, glow: true, flat: true },
    lamellen: { ramp: [R.d[1], R.d[2], R.d[3], R.d[4]], base: 1, seam: true, pattern: (p) => (Math.floor(Math.atan2(p[2], p[0]) * 12) & 1 ? -1 : 0) },
    korb: { ramp: [R.e[3], R.e[4], R.e[5], R.e[6], R.e[7]], base: 2, seam: true, pattern: (p) => ((Math.floor(p[0] * 40) + Math.floor(p[1] * 40)) & 1 ? -1 : 0) },
    pilzrot: { ramp: [R.r[1], R.r[2], R.r[3], R.r[4]], base: 2, seam: true },
    schuh: { ramp: [R.g[0], R.g[1], R.g[2], R.g[3]], base: 2, seam: true },
  },
  build(ctx) {
    const { W, stamps, anim, k, pose } = ctx;
    const raise = anim === 'ausholen' || (anim === 'schlag' && k < 2);
    if (raise) Object.assign(pose, { armL: 2.6, armR: 2.6, elbow: 0.3, spread: 0.5, lean: -0.1 });
    else if (anim !== 'fallen') Object.assign(pose, { armL: 0.6, elbowL: 1.5, spreadL: 0.25 }); // der Korb im linken Arm
    const B = {
      ...BODY,
      stoop: 0.05,
      torso: [
        { d: 0.03, rr: [0.23, 0.1, 0.17], mat: 'kleid', blend: 0.05 },
        { d: 0.18, rr: [0.24, 0.16, 0.18], mat: 'kleid' },
        { d: 0.32, rr: [0.27, 0.14, 0.17], mat: 'kleid', part: 'brust' },
      ],
      head: { h: [0.24, 0.21, 0.22], r: 0.18 },
      headPitch: -0.12,
      mats: { ...BODY.mats, upper: 'kleid', fore: 'haut', shoe: 'schuh' },
    };
    const body = humanoid(ctx, B, { legs: true });
    const { spine, H, legs, arms, stoop } = body;
    // Das Kleid fällt bis auf den Boden, mit Moosflecken
    const mid = lerp3(legs[0].foot, legs[1].foot, 0.5);
    ctx.capsule(spine(0.08), [mid[0], 0.02, mid[2] - 0.03], 0.22, 0.32, 'kleid', { blend: 0.05, matAt: (l, p) => (clumps(mul(p, 0.5)) > 0 && soot(p) ? 'moos' : null) });
    // Umhang aus Moos am Rücken
    ctx.box(spine(0.24, 0, 0, -0.1), [0.3, 0.2, 0.11], 0.09, 'moos', { pitch: stoop, blend: 0.03 });
    ctx.box(spine(-0.1, 0, 0, -0.18), [0.31, 0.27, 0.04], 0.03, 'moos', { pitch: stoop - 0.12, blend: 0.05 });
    // Der riesige Hut
    headEllipsoid(ctx, body, [0, 0.22, -0.01], [0.49, 0.065, 0.47], 'lamellen');
    headEllipsoid(ctx, body, [0, 0.3, -0.01], [0.5, 0.23, 0.48], 'hut', { matAt: (l) => (l[1] < -0.05 ? 'lamellen' : capSpot(l, [0.5, 0.23, 0.48], 0.055) ? 'tupfen' : null) });
    headEllipsoid(ctx, body, [0.01, -0.04, 0.215], [0.04, 0.045, 0.045], 'haut', { blend: 0.02 });
    // Der Korb mit Pilzen (linker Arm)
    if (!raise && anim !== 'fallen') {
      const c = add(arms[0].hand, [0.05, -0.08, 0.05]);
      ctx.ellipsoid(c, [0.16, 0.1, 0.12], 'korb', { matAt: (l) => (l[1] > 0.06 ? 'pilzrot' : null) });
      ctx.capsule(add(c, [-0.14, 0.02, 0]), add(c, [0.14, 0.02, 0]), 0.015, null, 'korb', { blend: 0 });
      stamps.push({ stamp: PILZMUTTER_STAMPS.pilzchen, at: W(add(c, [0.06, 0.12, 0])), opts: { need: false } });
    }
    putFace(ctx, FACES, PILZ_FACE, W(H([0.0, -0.01, 0.225])));
    if (ctx.dir <= 2 && ctx.anim !== 'fallen') for (const side of [-1, 1]) stamps.push({ stamp: PILZMUTTER_STAMPS.wange, at: W(H([side * 0.14, -0.08, 0.2])), opts: { depth: 0.04 } });
    if (raise) for (let i = 0; i < 5; i++) stamps.push({ stamp: PILZMUTTER_STAMPS.spore, at: W([Math.cos(i * 1.3 + k) * 0.5, 1.5 + 0.25 * Math.sin(i * 2.1 + k), Math.sin(i * 1.3 + k) * 0.3]), opts: { need: false, depth: 2 } });
    groundStamps(ctx, [], 1.6);
  },
};
const PILZ_FACE = faceLegend(pilzmutter.materials.haut.ramp, R.g[9], P.a4);

const HEXE_STAMPS = {
  stern: { rows: ['.y.', 'yyy', '.y.'], legend: { y: R.f[6] } },
  schnalle: { rows: ['yyy', 'y.y', 'yyy'], legend: { y: R.f[6] } },
  warze: { rows: ['w'], legend: { w: R.t[1] } },
};

/**
 * Die Laternenhexe (Boss): eine lange, dunkle Kutte mit gestickten Sternen und einem Strick,
 * graues Haar bis über die Schultern, eine spitze Nase mit Warze und ein breitkrempiger
 * Spitzhut, dessen Spitze nach hinten abknickt, mit orangem Band und Schnalle. Sie stützt sich
 * auf einen knorrigen Stab, an dem eine Laterne hängt – zum Lichtraub hebt sie sie hoch.
 */
const laternenhexe = {
  size: 1.6,
  gait: 'schreiten',
  cell: { w: 150, h: 170, px: 75, py: 138 },
  materials: {
    haut: { ramp: [R.t[1], R.t[2], R.t[3], R.t[4], R.a[6]], base: 2, shine: true },
    kutte: { ramp: [R.d[0], R.d[1], R.d[2], R.d[3]], base: 1, seam: true },
    strick: { ramp: [R.e[4], R.e[5], R.e[6], R.e[7]], base: 2, seam: true },
    hut: { ramp: [R.n[0], R.n[1], R.d[0], R.d[1], R.d[2]], base: 2, seam: true },
    hutband: { ramp: [R.f[2], R.f[3], R.f[4], R.f[5]], base: 2, seam: true },
    haar: { ramp: [R.s[4], R.s[5], R.s[6], R.s[7], R.s[8]], base: 2, seam: true, pattern: (p) => (Math.floor(p[0] * 40) % 3 === 0 ? -1 : 0) },
    stab: { ramp: [R.e[2], R.e[3], R.e[4], R.e[5], R.e[6]], base: 2, seam: true },
    rahmen: { ramp: [R.n[0], R.n[1], R.s[2], R.s[3]], base: 1, seam: true },
    licht: { ramp: [R.f[6], R.f[7], R.f[8]], base: 1, glow: true },
    schuh: { ramp: [R.n[0], R.n[1], R.d[0], R.d[1]], base: 2, seam: true },
  },
  build(ctx) {
    const { W, stamps, anim, k, pose } = ctx;
    const lift = anim === 'ausholen' || (anim === 'schlag' && k === 0);
    if (anim !== 'fallen') Object.assign(pose, lift ? { armR: 2.9, elbowR: 0.1, spreadR: 0.1, lean: -0.1 } : { armR: 0.7, elbowR: 0.9, spreadR: 0.2 });
    const B = {
      ...BODY,
      stoop: 0.2,
      torso: [
        { d: 0.03, rr: [0.2, 0.1, 0.15], mat: 'kutte', blend: 0.05 },
        { d: 0.17, rr: [0.21, 0.15, 0.16], mat: 'kutte' },
        { d: 0.31, rr: [0.24, 0.13, 0.16], mat: 'kutte', part: 'brust' },
      ],
      head: { h: [0.22, 0.2, 0.21], r: 0.16 },
      armR: [0.07, 0.065, 0.055, 0.05],
      mats: { ...BODY.mats, upper: 'kutte', fore: 'kutte', shoe: 'schuh' },
    };
    const body = humanoid(ctx, B, { legs: true });
    const { spine, H, legs, arms, stoop } = body;
    const mid = lerp3(legs[0].foot, legs[1].foot, 0.5);
    ctx.capsule(spine(0.08), [mid[0], 0.02, mid[2] - 0.03], 0.2, 0.27, 'kutte', { blend: 0.05 });
    ctx.ellipsoid(spine(0.03), [0.22, 0.028, 0.18], 'strick', { pitch: stoop });
    // Haar bis über die Schultern
    headEllipsoid(ctx, body, [0, -0.08, -0.12], [0.24, 0.26, 0.14], 'haar', { blend: 0.03 });
    // Spitze Nase mit Warze
    headCapsule(ctx, body, [0, 0.0, 0.2], [0.0, -0.08, 0.33], 0.04, 0.018, 'haut', { blend: 0.02 });
    // Der Hut: breite Krempe, hohe Spitze, die nach hinten abknickt, ein Band mit Schnalle
    headEllipsoid(ctx, body, [0, 0.14, -0.01], [0.42, 0.024, 0.4], 'hut');
    const cone = headCapsule(ctx, body, [0, 0.17, -0.02], [0.0, 0.58, -0.08], 0.21, 0.07, 'hut');
    const axis = norm(sub(cone.b, cone.a));
    cone.matAt = (l) => {
      const t = dot(l, axis);
      return t > 0.02 && t < 0.085 ? 'hutband' : null;
    };
    headCapsule(ctx, body, [0.0, 0.58, -0.08], [0.03, 0.66, -0.3], 0.07, 0.015, 'hut');
    // Der Stab mit der Laterne
    const hand = arms[1].hand;
    let up = lift ? norm([0.05, 1, 0.15]) : norm([0.08, 1, 0.1]);
    if (anim === 'fallen') up = norm([1, 0.2 - 0.1 * k, 0.3]);
    const top = add(hand, mul(up, lift ? 0.55 : 0.75));
    ctx.capsule(add(hand, mul(up, lift ? -0.9 : -0.72)), top, 0.025, 0.02, 'stab');
    const lamp = add(top, [0.1, -0.12, 0.02]);
    ctx.capsule(top, add(lamp, [0, 0.1, 0]), 0.01, null, 'rahmen');
    ctx.box(lamp, [0.07, 0.09, 0.07], 0.015, 'rahmen', { matAt: (l) => (Math.abs(l[0]) < 0.045 && Math.abs(l[2]) < 0.045 && Math.abs(l[1]) < 0.06 ? 'licht' : Math.abs(l[0]) < 0.05 || Math.abs(l[2]) < 0.05 ? 'licht' : null) });
    ctx.ellipsoid(add(lamp, [0, 0.1, 0]), [0.06, 0.02, 0.06], 'rahmen');
    putFace(ctx, FACES, HEXE_FACE, W(H([0.0, 0.02, 0.22])));
    if (ctx.dir <= 2) {
      stamps.push({ stamp: HEXE_STAMPS.warze, at: W(H([0.03, -0.05, 0.3])), opts: { depth: 0.03 } });
      stamps.push({ stamp: HEXE_STAMPS.schnalle, at: W(H([0, 0.24, 0.2])), opts: { depth: 0.05 } });
    }
    for (const [x, y, z] of [[-0.12, 0.2, 0.2], [0.14, 0.05, 0.24], [-0.05, -0.12, 0.27], [0.2, 0.28, -0.1], [-0.2, -0.05, -0.2]]) stamps.push({ stamp: HEXE_STAMPS.stern, at: W(add(spine(0.2), [x, y, z])), opts: { depth: 0.04 } });
    groundStamps(ctx, [], 1.4);
  },
};
const HEXE_FACE = faceLegend(laternenhexe.materials.haut.ramp, R.f[8], P.a4);

const RIESE_STAMPS = {
  fieder: { rows: ['g...g', '.g.g.', '..g..'], legend: { g: R.g[7] } },
  fieder2: { rows: ['g.g', '.g.'], legend: { g: R.g[8] } },
  flechte: { rows: ['aa', 'a.'], legend: { a: R.a[6] } },
};

/**
 * Der Moosriese (Boss): breit wie ein Tor, ein Leib aus Moos, in dem Steinplatten stecken, lange
 * schwere Arme, deren Fäuste fast den Boden berühren, kurze Stampfbeine, ein kleiner Kopf tief
 * zwischen den Schultern mit grün glimmenden Augen, darauf Steine und Farnwedel, auf den Steinen
 * Flechten. Zum Stampfer reißt er die Fäuste hoch und schlägt auf den Boden.
 */
const moosriese = {
  size: 2.1,
  gait: 'stampfen',
  cell: { w: 190, h: 200, px: 95, py: 150 },
  materials: {
    moos: { ramp: [R.g[1], R.g[2], R.g[3], R.g[4], R.g[5], R.g[6]], base: 3, seam: true, pattern: clumps },
    stein: { ramp: [R.s[2], R.s[3], R.s[4], R.s[5], R.s[6], R.s[7]], base: 3, seam: true, shine: true },
    farn: { ramp: [R.g[4], R.g[5], R.g[6], R.g[7], R.g[8]], base: 2, seam: true },
  },
  build(ctx) {
    const { W, stamps, anim, pose } = ctx;
    if (anim === 'gehen' || anim === 'stehen') Object.assign(pose, { armL: 0.25 + (pose.armL - 0.55) * 0.5, armR: 0.25 + (pose.armR - 0.55) * 0.5, elbow: 0.25 });
    // Steinplatten: runde Flecken um feste Mitten (wie Findlinge im Moos)
    const plates = [[0.18, 0.08, 0.2, 0.1], [-0.2, -0.05, 0.22, 0.09], [0.05, -0.12, 0.25, 0.08], [-0.1, 0.12, 0.2, 0.075], [0.25, -0.08, -0.15, 0.1], [-0.15, 0.1, -0.22, 0.11], [0.0, -0.1, -0.26, 0.09], [0.32, 0.1, 0.0, 0.08], [-0.35, 0.0, 0.05, 0.085]];
    const rocks = (l) => (plates.some(([x, y, z, r]) => Math.hypot(l[0] - x, l[1] - y, l[2] - z) < r) ? 'stein' : null);
    const B = {
      ...BODY,
      gap: 0.16,
      thigh: 0.17,
      shin: 0.16,
      legR: [0.13, 0.12, 0.11],
      shoe: [0.12, 0.07, 0.15],
      stoop: 0.3,
      torso: [
        { d: 0.04, rr: [0.3, 0.13, 0.22], mat: 'moos', blend: 0.06, matAt: rocks },
        { d: 0.22, rr: [0.38, 0.22, 0.28], mat: 'moos', matAt: rocks },
        { d: 0.4, rr: [0.44, 0.2, 0.27], mat: 'moos', part: 'brust', matAt: rocks },
      ],
      shoulderD: 0.42,
      shoulderW: 0.42,
      upper: 0.3,
      fore: 0.28,
      armR: [0.13, 0.12, 0.11, 0.1],
      hand: [0.11, 0.12, 0.11],
      limp: 0,
      neckD: 0.46,
      neckR: 0.1,
      headOffset: [0, 0.12, 0.14],
      head: { h: [0.2, 0.17, 0.19], r: 0.15 },
      headPitch: -0.2,
      headRoll: 0,
      mats: { thigh: 'moos', shin: 'moos', shoe: 'stein', upper: 'moos', fore: 'moos', hand: 'stein', neck: 'moos', head: 'moos' },
    };
    const body = humanoid(ctx, B);
    const { H, arms } = body;
    for (const i of [0, 1]) {
      ctx.part('upper' + i).matAt = (l) => (Math.hypot(l[0], l[1] + 0.08, l[2]) < 0.09 ? 'stein' : null);
      ctx.part('fore' + i).matAt = (l) => (Math.hypot(l[0] * 0.8, l[1] + 0.12, l[2]) < 0.08 ? 'stein' : null);
      // Fäuste aus Moos mit steinernen Knöcheln
      ctx.part('hand' + i).mat = 'moos';
      ctx.part('hand' + i).matAt = (l) => (l[1] < -0.02 ? 'stein' : null);
    }
    // Steine auf den Schultern und auf dem Kopf
    for (const a of arms) ctx.ellipsoid(add(a.shoulder, [a.side * 0.02, 0.12, -0.02]), [0.14, 0.09, 0.13], 'stein', { roll: a.side * 0.3 });
    for (const [x, z, r] of [[-0.09, -0.03, 0.08], [0.1, 0.02, 0.065]]) headEllipsoid(ctx, body, [x, 0.17, z], [r, r * 0.8, r], 'stein');
    // Farnwedel auf dem Kopf
    const fronds = [];
    for (const [x, z, tx, ty, tz] of [[-0.05, -0.05, -0.34, 0.5, -0.1], [0.06, -0.08, 0.3, 0.55, -0.15], [0.0, -0.1, 0.05, 0.62, -0.3], [-0.08, 0.04, -0.2, 0.42, 0.2]]) {
      const a = [x, 0.18, z];
      const b = [tx, ty, tz];
      headCapsule(ctx, body, a, b, 0.03, 0.012, 'farn');
      fronds.push([a, b]);
    }
    for (const [a, b] of fronds) for (const t of [0.3, 0.45, 0.6, 0.75, 0.9]) stamps.push({ stamp: t < 0.7 ? RIESE_STAMPS.fieder : RIESE_STAMPS.fieder2, at: W(H(lerp3(a, b, t))), opts: { need: false, depth: 0.08 } });
    stamps.push({ stamp: RIESE_STAMPS.flechte, at: W(add(arms[0].shoulder, [-0.02, 0.2, 0])), opts: { depth: 0.05 } });
    putFace(ctx, FACES, RIESE_FACE, W(H([0.0, 0.0, 0.19])));
    groundStamps(ctx, arms.map((a) => a.hand), 2);
  },
};
const RIESE_FACE = faceLegend([R.g[0], R.g[1], R.g[2]], R.g[8], R.g[9]);

const HERZ_STAMPS = {
  knoten: { rows: ['.a.', 'aAa', '.a.'], legend: { a: { glow: R.a[3] }, A: { glow: P.a4 } } },
  knotenKlein: { rows: ['a', 'A'], legend: { a: { glow: R.a[3] }, A: { glow: R.a[2] } } },
  dorn: { rows: ['.e.', '.e.', 'eEe'], legend: { e: R.e[2], E: R.e[1] } },
};

/**
 * Das Moderherz (Finale): kein Mensch mehr, sondern das Herz des Moders – zwei Kammern aus
 * pflaumenfarbenem Pilzgeflecht mit hellen Adern, oben ein Moospolster und eine Krone aus
 * kleinen Pilzhüten, vorn glimmende violette Knoten. Es geht auf zwei Wurzelbeinen, die sich am
 * Boden auffächern, und statt Armen hängen Ranken herab, die sich einrollen. Im Stehen pocht es.
 * Zum Angriff reißt es die Ranken hoch, und Wurzeln brechen aus dem Boden.
 */
const moderherz = {
  size: 2.3,
  gait: 'stampfen',
  cell: { w: 200, h: 210, px: 100, py: 165 },
  shadowSize: { x: 0.42, z: 0.26 },
  materials: {
    geflecht: { ramp: [R.d[0], R.d[1], R.d[2], R.d[3], R.d[4]], base: 2, seam: true, shine: true },
    ader: { ramp: [R.d[2], R.d[3], R.d[4], R.d[5]], base: 2 },
    furche: { ramp: [R.d[1], R.d[2]], base: 0, flat: true },
    moos: { ramp: [R.g[2], R.g[3], R.g[4], R.g[5], R.g[6]], base: 2, seam: true, pattern: clumps },
    rinde: { ramp: [R.d[0], R.e[0], R.e[1], R.e[2], R.e[3]], base: 2, seam: true, pattern: (p) => (Math.floor(p[1] * 30 + p[0] * 10) % 4 === 0 ? -1 : 0) },
    ranke: { ramp: [R.d[1], R.d[2], R.d[3], R.d[4]], base: 2, seam: true },
    stiel: { ramp: [R.e[6], R.e[7], R.e[8], R.e[9]], base: 2, seam: true },
    hutRot: { ramp: [R.r[1], R.r[2], R.r[3], R.r[4], P.a4], base: 2, seam: true, pattern: (p) => (hashDot(p) ? 9 : 0) },
    hutGelb: { ramp: [R.f[2], R.f[3], R.f[4], R.f[5], P.a4], base: 2, seam: true, pattern: (p) => (hashDot(p) ? 9 : 0) },
  },
  build(ctx) {
    const { W, stamps, anim, k, pose } = ctx;
    const beat = anim === 'stehen' ? 1 + 0.05 * k : 1;
    const wither = anim === 'fallen' ? 1 - 0.12 * k : 1;
    const sink = anim === 'fallen' ? [0, 0.08, 0.2, 0.32][k] : 0;
    const lift = anim === 'gehen' ? 0.03 * Math.abs(Math.sin(pose.legL * 3)) : 0;
    const y0 = 0.02 + lift - sink;
    const S = beat * wither;
    const C = (x, y, z) => [x * S, y0 + 0.5 + (y - 0.5) * S, z * S];
    // Das Herz: zwei Kammern oben, unten spitz; helle Adern, Moos auf der Kuppe
    // Die Kerbe zwischen den Kammern bleibt frei von Moos, eine dunkle Furche läuft vorn herab
    const cleft = (p) => Math.abs(dot(p, ctx.right)) < 0.022 * S * 2.3;
    const veins = (l, p) => (cleft(p) && p[1] > y0 + (0.5 + 0.2 * S) * 2.3 ? 'furche' : Math.abs(Math.sin(p[0] * 17 + p[1] * 11) + Math.cos(p[2] * 14 - p[1] * 9)) < 0.18 ? 'ader' : null);
    const lobe = (l, p) => (l[1] > 0.12 && !cleft(p) ? 'moos' : veins(l, p));
    for (const side of [-1, 1]) ctx.ellipsoid(C(side * 0.2, 0.9, 0), [0.25 * S, 0.27 * S, 0.22 * S], 'geflecht', { blend: 0.05, matAt: lobe });
    ctx.ellipsoid(C(0, 0.7, 0.01), [0.3 * S, 0.24 * S, 0.21 * S], 'geflecht', { blend: 0.08, matAt: veins });
    ctx.capsule(C(0, 0.62, 0.02), C(0, 0.3, 0.06), 0.2 * S, 0.035 * S, 'geflecht', { blend: 0.08, matAt: veins });
    // Wurzelbeine: ein dicker Strang je Seite, unten in drei kleine Wurzeln gefächert
    for (const [side, swing] of [[-1, pose.legL], [1, pose.legR]]) {
      const hip = C(side * 0.2, 0.55, -0.04);
      const foot = [side * 0.24, 0.05 + Math.max(0, Math.sin(swing)) * 0.05, Math.sin(swing) * 0.3];
      const knee = lerp3(hip, foot, 0.5);
      knee[0] += side * 0.08;
      ctx.capsule(hip, knee, 0.1, 0.085, 'rinde', { blend: 0.04 });
      ctx.capsule(knee, foot, 0.085, 0.065, 'rinde', { blend: 0.03 });
      for (const [dx, dz] of [[side * 0.14, 0.12], [side * 0.02, 0.18], [side * 0.16, -0.08]]) ctx.capsule(foot, [foot[0] + dx, 0.015, foot[2] + dz], 0.05, 0.02, 'rinde', { blend: 0.02 });
    }
    // Ranken statt Arme: hängen herab und rollen sich ein; zum Angriff reißt es sie hoch
    const up = anim === 'ausholen' || (anim === 'schlag' && k === 0);
    const tips = [];
    for (const [side, swing] of [[-1, pose.armL], [1, pose.armR]]) {
      const root = C(side * 0.38, 0.82, 0);
      const sway = 0.08 * Math.sin(swing * 2);
      const mid = up ? C(side * 0.62, 1.2, 0.05) : anim === 'schlag' ? C(side * 0.58, 0.5 - 0.1 * k, 0.35) : C(side * 0.52, 0.55, 0.08 + sway);
      const end = up ? C(side * 0.55, 1.52, 0.1) : anim === 'schlag' ? C(side * 0.45, 0.15, 0.55) : C(side * 0.46, 0.3, 0.18 + sway);
      const curl = add(end, up ? [side * -0.1, 0.06, 0.06] : [side * -0.09, 0.06, 0.07]);
      ctx.capsule(root, mid, 0.075, 0.06, 'ranke', { blend: 0.05 });
      ctx.capsule(mid, end, 0.06, 0.04, 'ranke', { blend: 0.03 });
      ctx.capsule(end, curl, 0.04, 0.03, 'ranke', { blend: 0.02 });
      tips.push(end);
    }
    // Krone aus Pilzhüten auf der Kuppe (beim Fallen kippen sie)
    const caps = [[-0.2, 0.02, 0.07, 'hutGelb'], [-0.09, 0.08, 0.1, 'hutRot'], [0.04, 0.1, 0.12, 'hutGelb'], [0.16, 0.06, 0.1, 'hutRot'], [0.26, 0.0, 0.06, 'hutGelb'], [0.0, -0.08, 0.09, 'hutRot'], [-0.14, -0.1, 0.08, 'hutRot']];
    caps.forEach(([x, z, stem, mat], i) => {
      const base = C(x * 1.1, 1.13 - Math.abs(Math.abs(x) - 0.2) * 0.6, z);
      const droop = anim === 'fallen' ? 0.4 * k * (i % 2 ? 1 : -1) : 0;
      const top = add(base, [Math.sin(droop) * stem, Math.cos(droop) * stem, 0]);
      ctx.capsule(base, top, 0.022, 0.018, 'stiel');
      ctx.ellipsoid(add(top, [0, 0.02, 0]), [0.065, 0.038, 0.065], mat, { roll: droop });
    });
    // Glimmende Knoten vorn auf dem Herzen (vor dem Angriff leuchten mehr)
    const nodes = [[-0.2, 0.9, 0.2], [0.14, 0.95, 0.2], [-0.05, 0.72, 0.22], [0.2, 0.7, 0.19], [-0.23, 0.66, 0.16], [0.03, 0.85, 0.24]];
    const n = anim === 'fallen' ? Math.max(0, 4 - k * 2) : up ? 6 : 4;
    for (let i = 0; i < n; i++) stamps.push({ stamp: i < 3 ? HERZ_STAMPS.knoten : HERZ_STAMPS.knotenKlein, at: W(C(...nodes[i])), opts: { depth: 0.08 } });
    // Wurzeln brechen aus dem Boden (Aufprall)
    if (anim === 'schlag' && k === 2) for (const [x, z] of [[-0.5, 0.6], [0.4, 0.7], [0.0, 0.9], [-0.2, 0.45], [0.55, 0.35]]) stamps.push({ stamp: HERZ_STAMPS.dorn, at: W([x, 0.03, z]), opts: { need: false, depth: 1 } });
    groundStamps(ctx, [], 2);
    void tips;
  },
};

/** Achsen eines um pitch (vornüber), roll (zur Seite) und yaw (um die Hochachse) gedrehten Rahmens, in Figurkoordinaten. */
function axesFrame(pitch, roll, yaw = 0) {
  const a = axesFromAngles(pitch, roll);
  if (!yaw) return a;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const turn = (v) => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  return a.map(turn);
}
function axesFromAngles(pitch, roll) {
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [
    [cr, sr * cp, sr * sp],
    [-sr, cr * cp, cr * sp],
    [0, -sp, cp],
  ];
}
/** Einen Vektor im Rahmen `ax` ausdrücken (lokal → Figur). */
function rot(ax, l) {
  return [ax[0][0] * l[0] + ax[1][0] * l[1] + ax[2][0] * l[2], ax[0][1] * l[0] + ax[1][1] * l[1] + ax[2][1] * l[2], ax[0][2] * l[0] + ax[1][2] * l[1] + ax[2][2] * l[2]];
}
/** Die Drehung Figur → Welt (um die Hochachse) als Rahmen. */
function bodyWorldTurn(ctx) {
  return [ctx.W([1, 0, 0]), ctx.W([0, 1, 0]), ctx.W([0, 0, 1])];
}

/** Große Rußflecken (je 10 cm eine Zelle, etwa jede fünfte dunkel). */
function soot(p) {
  const x = Math.floor(p[0] * 10);
  const y = Math.floor(p[1] * 10);
  const z = Math.floor(p[2] * 10);
  return (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 5 === 0;
}

/**
 * Runde helle Tupfen auf einem Hut (Punkt im Rahmen des Huts, Halbachsen `rr`): feste Mitten auf
 * der oberen Halbkugel, Radius `r` in Metern – so bleiben sie rund und ruhig.
 */
const CAP_SPOTS = [[0.3, 0.55], [1.4, 0.7], [2.5, 0.5], [3.6, 0.75], [4.7, 0.45], [5.6, 0.8], [0.9, 1.15], [2.0, 1.2], [3.1, 1.1], [4.2, 1.25], [5.2, 1.05], [0, 0]];
function capSpot(l, rr, r) {
  for (const [a, b] of CAP_SPOTS) {
    const c = [Math.cos(a) * Math.sin(b) * rr[0], Math.cos(b) * rr[1], Math.sin(a) * Math.sin(b) * rr[2]];
    if (Math.hypot(l[0] - c[0], (l[1] - c[1]) * 1.4, l[2] - c[2]) < r) return true;
  }
  return false;
}

/** Helle Tupfen auf dem Leuchthut (größer als bei Fliegenpilzen). */
function spotAt(p) {
  const x = Math.floor(p[0] * 16);
  const y = Math.floor(p[1] * 16);
  const z = Math.floor(p[2] * 16);
  const h = (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 11;
  return h < 2;
}

function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// --- Der Anführer ----------------------------------------------------------------------------

const ANFUEHRER_FACES = {
  // streng: schwere Brauen, glühende Augen, ein Bart aus Moos (Mund darunter verborgen)
  muede: {
    S: ['bbbb.....bbbb', '.bbdd...ddbb.', '..dYYd.dYYd..', '...dd...dd...', '......n......'],
    SO: ['bbb.....bbbb', '.bdd...ddbb.', '.YYd..dYYd..', '..dd...dd...', '.......n....'],
    O: ['.bbbb.', '..bbd.', '..dYYd', '...dd.', '.....n'],
  },
  gaehnen: {
    S: ['bbb.......bbb', '.bbdd...ddbb.', '.dYYYd.dYYYd.', '.dYwYd.dYwYd.', '..ddd...ddd..', '......n......'],
    SO: ['bb......bbb.', '.bdd...ddbb.', 'dYYd..dYYYd.', 'dwYd..dYwYd.', '.dd....ddd..', '.......n....'],
    O: ['.bbb..', '..bdd.', '.dYYYd', '.dYwYd', '..ddd.', '.....n'],
  },
  aua: BRUMMER_FACES.aua,
  schlaf: BRUMMER_FACES.schlaf,
};

const ANFUEHRER_STAMPS = {
  knopf: { rows: ['w'], legend: { w: R.f[6] } },
  // Blüten an den Enden des Geweihs
  bluete: { rows: ['.p.', 'pyp', '.p.'], legend: { p: R.a[1], y: P.f6 } },
  bluete2: { rows: ['w.', 'ww'], legend: { w: P.a4 } },
};

/**
 * Der Anführer: der alte Förster – groß und aufrecht, ein langer dunkelgrüner Rock mit
 * Messingknöpfen bis an die Knie, ein Umhang aus Moos, der hinter ihm herweht, ein Bart aus
 * Moos, glühend orange Augen unter schweren Brauen und auf dem Kopf eine Krone aus
 * Geweihzweigen, an denen Blüten wachsen, darunter ein Moosband. Er schreitet ruhig.
 */
const anfuehrer = {
  size: 1.65,
  gait: 'schreiten',
  materials: {
    haut: { ramp: [R.t[0], R.t[1], R.t[2], R.t[3], R.t[4]], base: 2, shine: true },
    rock: { ramp: [R.g[0], R.g[1], R.g[2], R.g[3], R.g[4]], base: 2, seam: true },
    saum: { ramp: [R.g[1], R.g[2], R.g[3], R.g[4], R.g[5]], base: 2, seam: true },
    hose: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3]], base: 2, seam: true },
    stiefel: { ramp: [R.n[0], R.e[0], R.e[1], R.e[2], R.e[3]], base: 2, seam: true, shine: true },
    umhang: { ramp: [R.g[1], R.g[2], R.g[3], R.g[4], R.g[5], R.g[6]], base: 3, seam: true, pattern: clumps },
    bart: { ramp: [R.s[3], R.s[4], R.s[5], R.s[6], R.s[7], R.s[8]], base: 3, seam: true, pattern: (p) => (Math.floor(p[0] * 40) % 3 === 0 ? -1 : 0) },
    riemen: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3], R.e[4]], base: 2, seam: true },
    haar: { ramp: [R.s[2], R.s[3], R.s[4], R.s[5], R.s[6], R.s[7]], base: 3, seam: true },
    geweih: { ramp: [R.e[3], R.e[4], R.e[5], R.e[6], R.e[7], R.e[8]], base: 3, seam: true },
    moos: schlurfer.materials.moos,
    wisch: { ramp: [R.t[2], R.t[3], R.t[4]], base: 1, flat: true, outline: R.t[1] },
  },
  build(ctx) {
    const { W, stamps, anim, k, dir, pose } = ctx;
    const B = {
      ...BODY,
      gap: 0.11,
      thigh: 0.24,
      shin: 0.22,
      stoop: 0.06,
      torso: [
        { d: 0.03, rr: [0.21, 0.1, 0.16], mat: 'rock', blend: 0.05 },
        { d: 0.19, rr: [0.23, 0.17, 0.18], mat: 'rock' },
        { d: 0.36, rr: [0.29, 0.16, 0.18], mat: 'rock', part: 'brust' },
      ],
      shoulderD: 0.4,
      shoulderW: 0.28,
      upper: 0.24,
      fore: 0.22,
      cuff: 'saum',
      neckD: 0.46,
      headOffset: [0, 0.22, 0.05],
      head: { h: [0.23, 0.2, 0.21], r: 0.185, matAt: (l) => (l[2] < -0.02 && l[1] > -0.1 + 0.03 * (Math.floor((l[0] + 1) * 22) & 1) ? 'haar' : null) },
      headPitch: -0.08,
      headRoll: 0,
      mats: { ...BODY.mats, upper: 'rock', fore: 'haut', thigh: 'hose', shin: 'hose', shoe: 'stiefel' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs, arms, stoop } = body;
    // Der Rock fällt bis an die Knie, vorn offen
    const hem = add(lerp3(legs[0].knee, legs[1].knee, 0.5), [0, 0.02, -0.01]);
    ctx.capsule(spine(0.08), hem, 0.22, 0.26, 'rock', { blend: 0.04, matAt: (l, p) => (dot(sub(p, W(spine(0.08))), ctx.fwd) > 0.2 && Math.abs(dot(sub(p, W(spine(0.08))), ctx.right)) < 0.03 ? 'hose' : null) });
    // Der Umhang aus Moos: dünn, von den Schultern bis an die Waden, er weht hinter ihm her
    const sway = anim === 'gehen' ? 0.06 * Math.sin((k / 6) * Math.PI * 2) : 0;
    // oben liegt er dem Rücken an, unten hängt er frei und dünn, der Saum ist ausgefranst
    const fringe = (l) => (l[1] < -0.2 + 0.05 * (Math.floor((l[0] + 1) * 22) & 1) ? 'saum' : null);
    ctx.box(spine(0.24, 0, 0, -0.1), [0.3, 0.2, 0.11], 0.09, 'umhang', { pitch: stoop, blend: 0.03 });
    ctx.box(add(spine(-0.08, 0, 0, -0.17), [sway, 0, 0]), [0.3, 0.24, 0.035], 0.03, 'umhang', { pitch: stoop - 0.12, roll: sway * 1.5, blend: 0.05, matAt: fringe });
    // Ein Lederriemen quer über die Brust
    ctx.ellipsoid(spine(0.28), [0.3, 0.035, 0.195], 'riemen', { pitch: stoop, roll: 0.62 });
    // Grauer Bart ums Kinn
    headEllipsoid(ctx, body, [0, -0.13, 0.13], [0.17, 0.12, 0.12], 'bart', { blend: 0.02 });
    headEllipsoid(ctx, body, [0.01, -0.03, 0.215], [0.04, 0.045, 0.045], 'haut', { blend: 0.02 });
    // Moosband und Geweihkrone mit Blüten
    headEllipsoid(ctx, body, [0, 0.16, -0.01], [0.25, 0.085, 0.235], 'moos', { blend: 0.015 });
    const tips = [];
    for (const side of [-1, 1]) {
      const root = [side * 0.13, 0.16, -0.02];
      const mid = [side * 0.24, 0.42, -0.04];
      const top = [side * 0.2, 0.62, -0.06];
      headCapsule(ctx, body, root, mid, 0.035, 0.028, 'geweih');
      headCapsule(ctx, body, mid, top, 0.028, 0.018, 'geweih');
      const fork = [side * 0.42, 0.5, -0.02];
      headCapsule(ctx, body, [side * 0.22, 0.36, -0.04], fork, 0.024, 0.016, 'geweih');
      const fork2 = [side * 0.08, 0.52, 0.0];
      headCapsule(ctx, body, [side * 0.23, 0.46, -0.05], fork2, 0.02, 0.014, 'geweih');
      tips.push(top, fork, fork2);
    }
    if (anim === 'schlag' && k === 1) {
      for (const a of arms) ctx.capsule(add(spine(0.4), [a.side * 0.3, 0.45, 0.12]), a.hand, 0.03, 0.05, 'wisch');
    }
    putFace(ctx, ANFUEHRER_FACES, ANFUEHRER_FACE, W(H([0.0, 0.02, 0.215])));
    if (dir < 2) for (const y of [0.1, 0.0, -0.1]) stamps.push({ stamp: ANFUEHRER_STAMPS.knopf, at: W(add(spine(0.3), [0.06, y, 0.18])) });
    tips.forEach((t, i) => stamps.push({ stamp: i % 3 === 1 ? ANFUEHRER_STAMPS.bluete2 : ANFUEHRER_STAMPS.bluete, at: W(H(t)), opts: { need: false } }));
    groundStamps(ctx, arms.map((a) => a.hand), 1.2);
    void pose;
  },
};
const ANFUEHRER_FACE = faceLegend(anfuehrer.materials.haut.ramp, R.f[4], R.f[7]);

// --- Werkzeug in der Hand ------------------------------------------------------------------------

/** Achsen einer Form, deren y-Achse in Richtung `dir` (Welt) zeigt; `side` wählt die x-Achse. */
function axesAlong(dir, side = [1, 0, 0]) {
  const y = norm(dir);
  let x = sub(side, mul(y, dot(side, y)));
  if (Math.hypot(...x) < 1e-3) x = [0, 0, 1];
  x = norm(x);
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [x, y, z];
}

/** Richtung in der Blickebene der Figur: Winkel `a` von oben (0) über vorn (π/2) nach unten (π). */
function sweep(a, x = 0) {
  return norm([x, Math.cos(a), Math.sin(a)]);
}

/**
 * Ein Spaten: der Stiel läuft von `grip` in Richtung `dir` (Figurkoordinaten), am Anfang ein
 * Querholz, am Ende das Blatt mit Erde. Gibt das Blatt zurück (für Staub beim Aufprall).
 */
function spade(ctx, grip, dir, len = 0.95) {
  const { W } = ctx;
  const end = add(grip, mul(dir, len * 0.72));
  ctx.capsule(add(grip, mul(dir, -0.04)), end, 0.022, 0.02, 'stiel');
  const across = norm([dir[2] || 0.001, 0, -dir[0]]);
  ctx.capsule(add(grip, mul(across, -0.07)), add(grip, mul(across, 0.07)), 0.02, null, 'stiel');
  const blade = add(end, mul(dir, 0.15));
  const worldDir = sub(W(add(blade, dir)), W(blade));
  ctx.push({ kind: 'box', c: W(blade), h: [0.1, 0.15, 0.014], r: 0.01, ax: axesAlong(worldDir, ctx.right), mat: 'blatt', matAt: (l) => (l[1] > 0.02 ? 'erde' : null) });
  return blade;
}

// --- Der Gräber ------------------------------------------------------------------------------

const GRAEBER_STAMPS = {
  knopf: { rows: ['y'], legend: { y: R.f[6] } },
  // Eine Möhre in der Latztasche
  moehre: { rows: ['g.g', '.g.', '.o.', '.o.'], legend: { g: R.g[6], o: R.f[4] } },
  tasche: { rows: ['kkkkk', 'k...k', 'kkkkk'], legend: { k: R.b[0] } },
};

/**
 * Der Gräber: war einmal Gärtner – eine blaue Latzhose voller Erde (die Knie ganz braun), ein
 * helles Hemd, Hosenträger mit Messingknöpfen, in der Latztasche eine Möhre, auf dem Kopf eine
 * Schiebermütze, darunter braune Koteletten. Den Spaten trägt er über der Schulter, zum Schlag
 * reißt er ihn hoch und haut ihn in die Erde.
 */
const graeber = {
  size: 1,
  gait: 'hinken',
  cell: { w: 96, h: 100, px: 48, py: 80 },
  materials: {
    haut: schlurfer.materials.haut,
    hemd: { ramp: [R.e[4], R.e[5], R.e[6], R.e[7], R.e[8], R.e[9]], base: 3, seam: true },
    latz: { ramp: [R.b[0], R.b[1], R.b[2], R.b[3], R.b[4]], base: 2, seam: true, pattern: (p) => (clumps(p) < 0 && Math.floor(p[1] * 30) % 3 === 0 ? -1 : 0) },
    erde: { ramp: [R.e[0], R.e[1], R.e[2], R.e[3], R.e[4]], base: 2, pattern: clumps },
    muetze: { ramp: [R.s[1], R.s[2], R.s[3], R.s[4], R.s[5], R.s[6]], base: 3, seam: true, pattern: (p) => ((Math.floor(p[0] * 40) + Math.floor(p[2] * 40)) % 4 === 0 ? -1 : 0) },
    haar: schlurfer.materials.haar,
    schuh: schlurfer.materials.schuh,
    stiel: { ramp: [R.e[3], R.e[4], R.e[5], R.e[6], R.e[7]], base: 2, seam: true },
    blatt: { ramp: [R.s[2], R.s[3], R.s[4], R.s[5], R.s[6], R.s[7]], base: 3, seam: true, shine: true },
    wisch: schlurfer.materials.wisch,
  },
  build(ctx) {
    const { W, stamps, anim, k, dir, pose } = ctx;
    // Den Spaten hält die rechte Hand an der Schulter; zum Schlag greifen beide Hände zu
    const carry = anim === 'gehen' || anim === 'stehen' || anim === 'treffer';
    if (carry) Object.assign(pose, { armR: 0.55, elbowR: 2.3, spreadR: 0.05 });
    else if (anim === 'ausholen') Object.assign(pose, { armL: 2.6, armR: 2.6, elbow: 0.5, spread: 0.1 });
    else if (anim === 'schlag') {
      const q = [0.25, 0.62, 1][k];
      Object.assign(pose, { armL: 2.5 - 1.6 * q, armR: 2.5 - 1.6 * q, elbow: 0.3 - 0.2 * q, spread: 0.1 });
    }
    // Latzhose mit Trägern über dem Hemd, Erde an den Knien
    const bib = (l) => (l[2] > 0.06 && Math.abs(l[0]) < 0.15 && l[1] < 0.07 ? 'latz' : Math.abs(Math.abs(l[0]) - 0.12) < 0.025 ? 'latz' : null);
    const B = {
      ...BODY,
      torso: [
        { d: 0.03, rr: [0.21, 0.1, 0.16], mat: 'latz', blend: 0.05 },
        { d: 0.17, rr: [0.24, 0.16, 0.19], mat: 'latz' },
        { d: 0.31, rr: [0.27, 0.14, 0.18], mat: 'hemd', part: 'brust', matAt: bib },
      ],
      head: { ...BODY.head, matAt: (l) => (l[1] > -0.02 && (Math.abs(l[0]) > 0.2 || l[2] < -0.1) ? 'haar' : null) },
      mats: { ...BODY.mats, thigh: 'latz', shin: 'latz', upper: 'hemd', fore: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, legs, arms, stoop } = body;
    for (const [i, leg] of legs.entries()) {
      const kneeW = W(leg.knee);
      const dirty = (l, p) => (Math.hypot(...sub(p, kneeW)) < 0.075 && dot(sub(p, kneeW), ctx.fwd) > 0.0 ? 'erde' : null);
      ctx.part('thigh' + i).matAt = dirty;
      ctx.part('shin' + i).matAt = dirty;
    }
    // Schiebermütze: flach, der Schirm vorn
    headEllipsoid(ctx, body, [0, 0.18, -0.01], [0.275, 0.055, 0.265], 'muetze');
    headEllipsoid(ctx, body, [0, 0.15, 0.21], [0.21, 0.024, 0.11], 'muetze', { pitch: -0.3 });
    headEllipsoid(ctx, body, [0.01, -0.035, 0.235], [0.04, 0.045, 0.045], 'haut', { blend: 0.02 });
    // Der Spaten
    let blade;
    if (carry) {
      const hand = arms[1].hand;
      const shoulder = add(arms[1].shoulder, [0.02, 0.1, 0]);
      const d = norm(sub(shoulder, hand));
      blade = spade(ctx, add(hand, mul(d, -0.2)), d);
    } else if (anim === 'fallen') {
      // Der Spaten fällt ihm aus den Händen und liegt neben ihm
      if (k === 0) blade = spade(ctx, add(arms[1].hand, [0, 0, -0.1]), sweep(1.2, 0.3));
      else blade = spade(ctx, [0.32, 0.03, 0.35], norm([0.15, 0, -1]));
    } else {
      const mid = lerp3(arms[0].hand, arms[1].hand, 0.5);
      const a = anim === 'ausholen' ? -0.7 : [0.5, 1.5, 2.25][k];
      blade = spade(ctx, add(mid, mul(sweep(a), -0.12)), sweep(a));
    }
    putFace(ctx, FACES, SCHLURFER_FACE, W(H([0.0, -0.01, 0.24])));
    if (dir < 2) {
      const chest = spine(0.31);
      stamps.push({ stamp: GRAEBER_STAMPS.tasche, at: W(add(chest, [0, -0.04, 0.19])) });
      stamps.push({ stamp: GRAEBER_STAMPS.moehre, at: W(add(chest, [0.03, 0.01, 0.2])), opts: { need: false } });
      for (const side of [-1, 1]) stamps.push({ stamp: GRAEBER_STAMPS.knopf, at: W(add(chest, [side * 0.12, 0.05, 0.18])) });
    }
    if (anim === 'schlag' && k === 2) stamps.push({ stamp: COMMON.staub, at: [W(blade)[0], 0.02, W(blade)[2]], opts: { need: false, depth: 1 } });
    groundStamps(ctx, [], 1);
    void stoop;
  },
};

// --- Der Schildträger ----------------------------------------------------------------------------

const SCHILD_STAMPS = {
  // Ein Herz ausgesägt (die Tür war einmal die Tür eines Häuschens im Garten)
  herz: { rows: ['kk.kk', 'kkkkk', '.kkk.', '..k..'], legend: { k: R.n[1] } },
  knauf: { rows: ['yY', 'Yy'], legend: { y: R.f[6], Y: R.f[5] } },
  // Ein Hufeisen für das Glück, die Öffnung nach oben
  hufeisen: { rows: ['s...s', 's...s', '.sss.'], legend: { s: R.s[6] } },
};

/**
 * Der Schildträger: trägt eine alte Brettertür vor sich her – die Tür eines Gartenhäuschens mit
 * ausgesägtem Herz, Messingknauf und einem Hufeisen für das Glück – und auf dem Kopf einen
 * Kochtopf mit zwei Henkeln. Eine graublaue Arbeitsjacke, braune Hose. Bricht die Tür, geht er
 * ohne weiter (eigene Art `schildtraegerOhne`).
 */
function schildtraegerBuild(withDoor) {
  return (ctx) => {
    const { W, stamps, anim, k, dir, pose } = ctx;
    if (withDoor && anim !== 'fallen' && anim !== 'treffer') {
      // Beide Hände halten die Tür an den Kanten; beim Schlag stößt er sie nach vorn
      const push = anim === 'schlag' ? [0.2, 0.6, 0.35][k] : anim === 'ausholen' ? -0.15 : 0;
      Object.assign(pose, { armL: 1.05 + push, armR: 1.05 + push, elbow: 0.75 - push * 0.8, spread: 0.12 });
    }
    const B = {
      ...BODY,
      torso: [
        { d: 0.03, rr: [0.22, 0.1, 0.16], mat: 'hose', blend: 0.05 },
        { d: 0.17, rr: [0.25, 0.16, 0.19], mat: 'jacke' },
        { d: 0.31, rr: [0.29, 0.14, 0.18], mat: 'jacke', part: 'brust' },
      ],
      mats: { ...BODY.mats, upper: 'jacke', fore: 'jacke' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms, stoop } = body;
    // Der Kochtopf: Boden nach oben, ein Rand unten, zwei Henkel
    headEllipsoid(ctx, body, [0, 0.13, 0], [0.29, 0.024, 0.28], 'topfDunkel');
    ctx.push({ kind: 'box', c: W(H([0, 0.21, 0])), h: [0.265, 0.085, 0.255], r: 0.08, ax: body.headAx, mat: 'topf' });
    for (const side of [-1, 1]) headCapsule(ctx, body, [side * 0.26, 0.21, -0.06], [side * 0.34, 0.21, 0.06], 0.022, null, 'topfDunkel');
    headEllipsoid(ctx, body, [0.01, -0.035, 0.235], [0.04, 0.045, 0.045], 'haut', { blend: 0.02 });
    if (withDoor && anim === 'fallen' && k >= 1) {
      // Die Tür fällt vor ihm flach ins Laub
      ctx.box([0.02, 0.03, 0.42], [0.3, 0.5, 0.028], 0.012, 'tuer', { pitch: Math.PI / 2 - 0.06 });
    } else if (withDoor && anim !== 'fallen') {
      // Die Tür: Bretter mit Fugen, vor dem Bauch zwischen den Händen
      const mid = lerp3(arms[0].hand, arms[1].hand, 0.5);
      const c = add(mid, [0, -0.08, 0.06]);
      const tilt = anim === 'treffer' ? -0.35 : stoop - 0.1;
      const planks = (l) => (Math.abs((((l[0] + 0.45) % 0.15) + 0.15) % 0.15 - 0.075) > 0.064 ? 'fuge' : null);
      ctx.box(c, [0.3, 0.5, 0.028], 0.012, 'tuer', { pitch: tilt, matAt: planks });
      if (dir < 2 || dir > 6) {
        const at = (x, y) => W(add(c, [x, y * Math.cos(tilt), 0.035 + y * Math.sin(tilt) * -1]));
        stamps.push({ stamp: SCHILD_STAMPS.herz, at: at(0, 0.34) });
        stamps.push({ stamp: SCHILD_STAMPS.knauf, at: at(0.22, 0.0) });
        stamps.push({ stamp: SCHILD_STAMPS.hufeisen, at: at(-0.02, 0.12) });
      }
    }
    if (!withDoor && anim === 'schlag' && k === 1) {
      for (const a of arms) ctx.capsule(add(spine(0.34), [a.side * 0.28, 0.42, 0.12]), a.hand, 0.03, 0.05, 'wisch');
    }
    putFace(ctx, FACES, SCHILD_FACE, W(H([0.0, -0.01, 0.24])));
    groundStamps(ctx, withDoor ? [] : arms.map((a) => a.hand));
  };
}
const SCHILD_MATERIALS = {
  haut: { ramp: [R.t[0], R.t[1], R.t[2], R.t[3], R.t[4]], base: 2, shine: true },
  jacke: { ramp: [R.n[1], R.n[2], R.n[3], R.n[4], R.n[5], R.n[6]], base: 3, seam: true },
  hose: schlurfer.materials.hose,
  schuh: schlurfer.materials.schuh,
  topf: { ramp: [R.s[1], R.s[2], R.s[3], R.s[4], R.s[5], R.s[6], R.s[8]], base: 3, seam: true, shine: true },
  topfDunkel: { ramp: [R.s[0], R.s[1], R.s[2], R.s[3], R.s[4]], base: 2, seam: true },
  tuer: { ramp: [R.e[3], R.e[4], R.e[5], R.e[6], R.e[7]], base: 3, seam: true, pattern: (p) => (Math.floor(p[1] * 13 + Math.floor(p[0] * 7) * 0.5) % 5 === 0 ? -1 : 0) },
  fuge: { ramp: [R.e[1], R.e[2], R.e[3]], base: 1 },
  wisch: schlurfer.materials.wisch,
};
const schildtraeger = { size: 1.1, gait: 'hinken', materials: SCHILD_MATERIALS, build: schildtraegerBuild(true) };
const schildtraegerOhne = { size: 1.1, gait: 'hinken', materials: SCHILD_MATERIALS, build: schildtraegerBuild(false) };
const SCHILD_FACE = faceLegend(SCHILD_MATERIALS.haut.ramp, R.f[6]);

// --- Der Lichtfresser --------------------------------------------------------------------------

const LICHT_FACES = {
  // Im Schatten der Kapuze sieht man nur zwei blasse Augen
  muede: { S: ['ww...ww', 'YY...YY'], SO: ['w...ww', 'Y...YY'], O: ['.ww', '.YY'] },
  gaehnen: { S: ['ww...ww', 'YY...YY', 'YY...YY'], SO: ['w...ww', 'Y...YY', 'Y...YY'], O: ['.ww', '.YY', '.YY'] },
  aua: { S: ['l.....l', '.l...l.', 'l.....l'], SO: ['l....l.', '.l..l..', 'l....l.'], O: ['..l', '.l.', '..l'] },
  schlaf: { S: ['.......', 'll...ll'], SO: ['......', 'l...ll'], O: ['...', '.ll'] },
};
const LICHT_FACE = { Y: { glow: R.n[8] }, w: { glow: P.a4 }, l: R.n[4] };

const LICHT_STAMPS = {
  // Kerzenstummel im Gürtel – er sammelt, was er ausgelöscht hat
  kerze: { rows: ['k', 'w', 'w', 'W'], legend: { k: R.n[1], w: R.e[9], W: R.e[8] } },
  rauch: { rows: ['.s.', 's..', '.s.', '..s', '.s.'], legend: { s: R.s[7] } },
  rauch2: { rows: ['s..', '.s.', '..s', '.s.', 's..'], legend: { s: R.s[7] } },
};

/**
 * Der Lichtfresser: eine graublaue Kutte bis auf den Boden, voller Ruß, eine tiefe Kapuze mit
 * Zipfel, darin nur zwei blasse Augen. Ein Strick als Gürtel mit Knoten, darin stecken
 * Kerzenstummel – er sammelt, was er ausgelöscht hat. In der Hand ein Kerzenlöscher an langem
 * Stiel, mit einem Messinghütchen. Unter dem Saum schauen beim Gehen die Zehen hervor.
 */
const lichtfresser = {
  size: 1,
  gait: 'hinken',
  cell: { w: 88, h: 100, px: 44, py: 80 },
  materials: {
    haut: schlurfer.materials.haut,
    // Ruß: unten am Saum am dunkelsten, darüber in großen Flecken
    kutte: { ramp: [R.n[1], R.n[2], R.n[3], R.n[4], R.n[5], R.n[6]], base: 3, seam: true, pattern: (p) => (p[1] < 0.2 + 0.06 * (Math.floor(p[0] * 20) & 1) ? -1 : soot(p) ? -1 : 0) },
    schatten: { ramp: [R.n[0], R.n[1]], base: 0, flat: true },
    strick: { ramp: [R.e[4], R.e[5], R.e[6], R.e[7]], base: 2, seam: true },
    stiel: { ramp: [R.e[2], R.e[3], R.e[4], R.e[5], R.e[6]], base: 2, seam: true },
    messing: { ramp: [R.e[1], R.e[2], R.e[4], R.e[6], R.e[8]], base: 2, seam: true, shine: true },
    schuh: { ramp: [R.t[0], R.t[1], R.t[2], R.t[3]], base: 2, seam: true },
    wisch: { ramp: [R.n[5], R.n[6], R.n[7]], base: 1, flat: true, outline: R.n[4] },
  },
  build(ctx) {
    const { W, stamps, anim, k, pose } = ctx;
    // Die Rechte hält den Löscher wie einen Stab; zum Schlag schwingt er ihn herab
    const hold = anim === 'gehen' || anim === 'stehen' || anim === 'treffer';
    if (hold) Object.assign(pose, { armR: 0.5, elbowR: 1.1, spreadR: 0.2 });
    else if (anim === 'ausholen') Object.assign(pose, { armL: 1.0, armR: 2.6, elbowR: 0.5, spreadR: 0.2 });
    else if (anim === 'schlag') {
      const q = [0.25, 0.62, 1][k];
      Object.assign(pose, { armR: 2.5 - 1.5 * q, elbowR: 0.3, spreadR: 0.15 });
    }
    const hoodAt = (l) => {
      const ox = l[0] / 0.19;
      const oy = (l[1] + 0.02) / 0.17;
      return l[2] > 0.08 && ox * ox + oy * oy < 1 ? 'schatten' : null;
    };
    const B = {
      ...BODY,
      stoop: 0.3,
      torso: [
        { d: 0.03, rr: [0.21, 0.1, 0.16], mat: 'kutte', blend: 0.05 },
        { d: 0.17, rr: [0.23, 0.16, 0.18], mat: 'kutte' },
        { d: 0.31, rr: [0.26, 0.14, 0.17], mat: 'kutte', part: 'brust' },
      ],
      head: { ...BODY.head, matAt: hoodAt },
      armR: [0.08, 0.075, 0.065, 0.058],
      mats: { ...BODY.mats, upper: 'kutte', fore: 'kutte', head: 'kutte', neck: 'kutte', thigh: 'kutte', shin: 'kutte', shoe: 'schuh', hand: 'haut' },
    };
    const body = humanoid(ctx, B, { legs: false });
    const { spine, H, legs, arms, stoop } = body;
    // Die Kutte fällt bis auf den Boden; die Füße schauen vorn heraus
    const mid = lerp3(legs[0].foot, legs[1].foot, 0.5);
    ctx.capsule(spine(0.1), [mid[0], 0.02, mid[2] - 0.04], 0.22, 0.29, 'kutte', { blend: 0.05 });
    for (const leg of legs) ctx.ellipsoid(add(leg.foot, [0, -0.01, 0.06]), [0.07, 0.045, 0.08], 'schuh');
    // Tiefe Kapuze mit Zipfel
    headEllipsoid(ctx, body, [0, 0.03, -0.14], [0.26, 0.22, 0.17], 'kutte', { blend: 0.02 });
    headCapsule(ctx, body, [0, 0.14, -0.22], [0.02, -0.1, -0.42], 0.08, 0.02, 'kutte', { blend: 0.03 });
    // Strick mit Knoten und zwei Enden
    ctx.ellipsoid(spine(0.03), [0.24, 0.03, 0.2], 'strick', { pitch: stoop });
    const knot = add(spine(0.03), [0.08, -0.01, 0.19]);
    ctx.ellipsoid(knot, [0.035, 0.035, 0.03], 'strick');
    ctx.capsule(knot, add(knot, [0.02, -0.2, 0.03]), 0.016, 0.014, 'strick');
    ctx.capsule(knot, add(knot, [0.07, -0.16, 0.02]), 0.016, 0.014, 'strick');
    // Der Kerzenlöscher: Stiel, am oberen Ende ein Arm mit dem Messinghütchen
    const hand = arms[1].hand;
    let up;
    if (hold) up = norm([0.02, 1, 0.12]);
    else if (anim === 'fallen') up = norm([0.8, 0.25 - k * 0.1, 0.4]);
    else {
      const a = anim === 'ausholen' ? -0.5 : [0.5, 1.4, 2.0][k];
      up = sweep(a, 0.1);
    }
    const bottom = add(hand, mul(up, -0.35));
    const top = add(hand, mul(up, 0.95));
    ctx.capsule(bottom, top, 0.02, 0.018, 'stiel');
    const side = norm([up[1] * 0.2 + 0.1, -0.2, 0.9]);
    const hat = add(top, mul(side, 0.1));
    ctx.capsule(top, hat, 0.012, null, 'messing');
    ctx.capsule(add(hat, mul(up, 0.06)), add(hat, mul(up, -0.08)), 0.014, 0.07, 'messing');
    putFace(ctx, LICHT_FACES, LICHT_FACE, W(H([0.0, -0.01, 0.245])));
    if (ctx.dir <= 2) for (const x of [-0.12, -0.05]) stamps.push({ stamp: LICHT_STAMPS.kerze, at: W(add(spine(0.05), [x, 0.02, 0.2])), opts: { need: false } });
    // Aus dem Hütchen kräuselt sich der Rauch der letzten Flamme
    if (hold) stamps.push({ stamp: k % 2 ? LICHT_STAMPS.rauch2 : LICHT_STAMPS.rauch, at: W(add(hat, [0, 0.14, 0])), opts: { need: false, depth: 1 } });
    if (anim === 'schlag' && k === 2) stamps.push({ stamp: COMMON.staub, at: [W(hat)[0], 0.02, W(hat)[2]], opts: { need: false, depth: 1 } });
    groundStamps(ctx, []);
  },
};

// --- Der Brüter ----------------------------------------------------------------------------------

const BRUETER_STAMPS = {
  nabel: { rows: ['k'], legend: { k: R.g[1] } },
  sporenspitze: { rows: ['w'], legend: { w: { glow: P.a4 } } },
};

/**
 * Der Brüter: aufgedunsen und gutmütig – ein runder Bauch, über dem das zu kleine pflaumenfarbene
 * Hemd hochgerutscht ist (der Nabel schaut heraus), kurze Beine, kleiner Kopf mit Pausbacken und
 * drei violetten Sporenhöckern. Auf dem Rücken wachsen drei violett glimmende Sporensäcke, die
 * leise pulsieren. Er watschelt und wiegt sich von einer Seite zur anderen.
 */
const brueter = {
  size: 1.2,
  gait: 'watscheln',
  materials: {
    haut: { ramp: [R.g[1], R.g[2], R.g[3], R.g[4], R.g[5], R.g[6]], base: 3, shine: true },
    hemd: { ramp: [R.d[0], R.d[1], R.d[2], R.d[3], R.d[4]], base: 2, seam: true },
    hose: { ramp: [R.n[1], R.d[0], R.d[1], R.d[2]], base: 2, seam: true },
    schuh: schlurfer.materials.schuh,
    hoecker: { ramp: [R.d[1], R.d[2], R.d[3], R.d[4], R.a[3]], base: 2, seam: true },
    sack: { ramp: [R.d[2], R.a[2], R.a[3]], base: 1, glow: true },
    wisch: { ramp: [R.g[4], R.g[5], R.g[7]], base: 1, flat: true, outline: R.g[3] },
  },
  build(ctx) {
    const { W, stamps, anim, k, dir } = ctx;
    // Das Hemd ist zu kurz: unten schaut der Bauch heraus
    const belly = (l) => (l[1] < -0.06 + 0.02 * Math.sin(l[0] * 20) && l[2] > -0.05 ? 'haut' : null);
    const B = {
      ...BODY,
      gap: 0.15,
      thigh: 0.16,
      shin: 0.15,
      ankle: 0.06,
      legR: [0.11, 0.1, 0.095],
      shoe: [0.1, 0.06, 0.14],
      stoop: 0.05,
      torso: [
        { d: 0.03, rr: [0.28, 0.12, 0.22], mat: 'hose', blend: 0.05 },
        { d: 0.2, z: 0.05, rr: [0.36, 0.27, 0.33], mat: 'hemd', matAt: belly },
        { d: 0.38, rr: [0.3, 0.15, 0.22], mat: 'hemd', part: 'brust' },
      ],
      shoulderD: 0.4,
      shoulderW: 0.32,
      upper: 0.17,
      fore: 0.15,
      armR: [0.08, 0.075, 0.068, 0.064],
      hand: [0.06, 0.07, 0.06],
      neckD: 0.47,
      neckR: 0.08,
      headOffset: [0, 0.17, 0.08],
      head: { h: [0.22, 0.19, 0.2], r: 0.16 },
      mats: { ...BODY.mats, upper: 'hemd', fore: 'haut' },
    };
    const body = humanoid(ctx, B);
    const { spine, H, arms, stoop } = body;
    // Pausbacken
    for (const side of [-1, 1]) headEllipsoid(ctx, body, [side * 0.13, -0.08, 0.15], [0.09, 0.075, 0.08], 'haut', { blend: 0.03 });
    headEllipsoid(ctx, body, [0.01, -0.035, 0.215], [0.035, 0.04, 0.04], 'haut', { blend: 0.02 });
    // Drei Sporenhöcker auf dem Kopf
    const tips = [];
    for (const [x, z, r] of [[-0.1, -0.03, 0.08], [0.1, 0.02, 0.065], [0.0, -0.13, 0.07]]) {
      headEllipsoid(ctx, body, [x, 0.17, z], [r, r * 0.8, r], 'hoecker', { blend: 0.02 });
      tips.push([x, 0.17 + r * 0.8, z]);
    }
    // Drei glimmende Sporensäcke auf dem Rücken, sie pulsieren im Stehen
    const pulse = anim === 'stehen' ? 1 + 0.08 * k : 1;
    for (const [c, r] of [[spine(0.34, -0.14, 0.03, -0.22), 0.13], [spine(0.3, 0.15, 0.0, -0.22), 0.14], [spine(0.14, 0.0, 0.0, -0.3), 0.12]]) {
      ctx.ellipsoid(c, [r * pulse, r * pulse, r * 0.85 * pulse], 'sack', { pitch: stoop, matAt: (l) => (spotAt(mul(l, 1.6)) ? 'hoecker' : null) });
    }
    if (anim === 'schlag' && k === 1) {
      for (const a of arms) ctx.capsule(add(spine(0.4), [a.side * 0.34, 0.4, 0.14]), a.hand, 0.035, 0.055, 'wisch');
    }
    putFace(ctx, FACES, BRUETER_FACE, W(H([0.0, 0.0, 0.215])));
    if (dir <= 2) stamps.push({ stamp: BRUETER_STAMPS.nabel, at: W(add(spine(0.12), [0, 0, 0.38])) });
    for (const t of tips) stamps.push({ stamp: BRUETER_STAMPS.sporenspitze, at: W(H(t)), opts: { need: false, depth: 0.03 } });
    groundStamps(ctx, arms.map((a) => a.hand), 1.2);
  },
};
const BRUETER_FACE = faceLegend(brueter.materials.haut.ramp, R.g[9], P.a4);

/** Moosbüschel: je Zelle von 5 cm heller (+1) oder dunkler (−1) oder wie der Grund. */
function clumps(p) {
  const x = Math.floor(p[0] * 20);
  const y = Math.floor(p[1] * 20);
  const z = Math.floor(p[2] * 20);
  const h = (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 10;
  return h < 3 ? 1 : h > 7 ? -1 : 0;
}

/** Weiße Tupfen auf Pilzhüten: gut jedes sechste Texel der Oberfläche. */
function hashDot(p) {
  const x = Math.floor(p[0] * 40);
  const y = Math.floor(p[1] * 40);
  const z = Math.floor(p[2] * 40);
  const h = (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 97;
  return h < 16;
}

/** Alle Arten mit Sprites. */
export const KINDS = { schlurfer, flitzer, schwaermer, brummer, leuchtpilz, anfuehrer, moderfalter, graeber, schildtraeger, schildtraegerOhne, lichtfresser, brueter, holzfaeller, pilzmutter, laternenhexe, moosriese, moderherz };

// Nicht jede Hilfe braucht jede Art
export { mul };
