// Gerüst der Sprite-Figuren (F-Design): Vektorhilfen, der Körper eines Schlurfers aus runden
// Formen (Beine, Rumpf, Arme, Hals, Kopf) und die Posen je Gangart und Zustand. Jede Art
// beschreibt nur ihren Körper (Maße, Stoffe) und ihr Zubehör (zombieSpriteKinds.js); gerastert
// und gemalt wird in render/spriteBaker.js.
//
// Figurkoordinaten: x rechts, y oben, z vorn (die Figur blickt nach +z), Fußpunkt im Ursprung,
// Meter bei Größe 1. Die Welt dreht die Figur um die Hochachse (`yaw`, 0: blickt nach Süden,
// zur Kamera).

import { axesOf } from '../render/spriteBaker.js';

// --- Vektorhilfen ----------------------------------------------------------------------------

export function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
export function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
export function mul(a, k) {
  return [a[0] * k, a[1] * k, a[2] * k];
}
export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
export function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
/** Punkt in Figurkoordinaten → Welt, Blick um `yaw` gedreht. */
export function toWorld(p, yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}
/** Punkt `l` im Rahmen `ax` (Achsen in Figurkoordinaten) um den Mittelpunkt `c`. */
export function inFrame(c, ax, l) {
  return [c[0] + ax[0][0] * l[0] + ax[1][0] * l[1] + ax[2][0] * l[2], c[1] + ax[0][1] * l[0] + ax[1][1] * l[1] + ax[2][1] * l[2], c[2] + ax[0][2] * l[0] + ax[1][2] * l[1] + ax[2][2] * l[2]];
}
/** Ein Glied: Winkel gegen die Senkrechte nach vorn (swing) von `top` aus, Länge `length`. */
export function limb(top, swing, length) {
  return [top[0], top[1] - Math.cos(swing) * length, top[2] + Math.sin(swing) * length];
}
/** Kleiner Hash für Muster (0 … 1). */
export function hash(x, y = 0, z = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// --- Bild-Kontext ----------------------------------------------------------------------------

/**
 * Der Rahmen eines Bildes: Richtung, Pose, die Formen und benannte Punkte für Stempel. `W`
 * dreht Figurkoordinaten in die Welt, `AX` gibt die Achsen einer geneigten Form.
 */
export function frameContext(dir, pose) {
  const yaw = (dir * Math.PI) / 4;
  const ctx = {
    dir,
    yaw,
    pose,
    shapes: [],
    marks: {},
    W: (p) => toWorld(p, yaw),
    AX: (pitch = 0, roll = 0) => axesOf(yaw, pitch, roll),
    fwd: toWorld([0, 0, 1], yaw),
    right: toWorld([1, 0, 0], yaw),
    push(...s) {
      ctx.shapes.push(...s);
      return s[0];
    },
    /** Die zuerst gesetzte Form mit diesem Namen (für nachträgliche Muster). */
    part(name) {
      return ctx.shapes.find((s) => s.part === name);
    },
    /** Eine Kapsel zwischen zwei Punkten in Figurkoordinaten. */
    capsule(a, b, r, r1, mat, more = {}) {
      return ctx.push({ kind: 'capsule', a: ctx.W(a), b: ctx.W(b), r, r1: r1 ?? r, mat, ...more });
    },
    /** Ein Ellipsoid um `c` (Figurkoordinaten), geneigt um pitch/roll. */
    ellipsoid(c, rr, mat, more = {}) {
      const { pitch = 0, roll = 0, ax, ...rest } = more;
      return ctx.push({ kind: 'ellipsoid', c: ctx.W(c), rr, ax: ax || ctx.AX(pitch, roll), mat, ...rest });
    },
    /** Ein gerundeter Quader um `c` (Figurkoordinaten). */
    box(c, h, r, mat, more = {}) {
      const { pitch = 0, roll = 0, ax, ...rest } = more;
      return ctx.push({ kind: 'box', c: ctx.W(c), h, r, ax: ax || ctx.AX(pitch, roll), mat, ...rest });
    },
    /** Einen Punkt (Figurkoordinaten) für einen Stempel merken. */
    mark(name, p) {
      ctx.marks[name] = ctx.W(p);
    },
  };
  return ctx;
}

/** Alle Formen und Punkte um den Fußpunkt skalieren (große Arten, Bosse). */
export function scaleFrame(ctx, k) {
  if (k === 1) return;
  for (const s of ctx.shapes) {
    if (s.kind === 'capsule') {
      s.a = mul(s.a, k);
      s.b = mul(s.b, k);
      s.r *= k;
      s.r1 *= k;
    } else {
      s.c = mul(s.c, k);
      if (s.rr) s.rr = mul(s.rr, k);
      if (s.h) s.h = mul(s.h, k);
      if (s.r) s.r *= k;
    }
    if (s.blend) s.blend *= k;
    if (s.matAt) {
      // Muster rechnen in Metern der Größe 1
      const f = s.matAt;
      s.matAt = (l, p) => f(mul(l, 1 / k), mul(p, 1 / k));
    }
    if (s.bump) {
      // F6c: Relief ebenso (die Neigung selbst hat kein Maß)
      const f = s.bump;
      s.bump = (l, p) => f(mul(l, 1 / k), mul(p, 1 / k));
    }
  }
  for (const key of Object.keys(ctx.marks)) {
    const m = ctx.marks[key];
    ctx.marks[key] = Array.isArray(m[0]) ? m.map((q) => mul(q, k)) : mul(m, k);
  }
}

// --- Der Körper --------------------------------------------------------------------------------

/**
 * Maße eines Körpers (Größe 1, Meter). Die Arten überschreiben, was sie anders haben.
 * - `gap` halber Abstand der Hüftgelenke, `thigh`/`shin` Längen, `legR` Radien (Hüfte, Knie, Knöchel)
 * - `shoe` Halbachsen des Schuhs, `footZ` wie weit er vor dem Knöchel sitzt
 * - `torso` Ellipsoide entlang der Wirbelsäule: d (Meter hinauf), rr, mat
 * - `shoulderD`/`shoulderW` Schultern, `upper`/`fore` Armlängen, `armR` Radien
 * - `neckD` Hals, `headOffset` Kopfmitte über dem Hals, `head` Halbkanten und Rundung
 */
export const BODY = {
  gap: 0.11,
  thigh: 0.2,
  shin: 0.18,
  ankle: 0.06,
  legR: [0.095, 0.085, 0.08],
  shoe: [0.09, 0.058, 0.14],
  footZ: 0.05,
  stoop: 0.24,
  torso: [
    { d: 0.03, rr: [0.21, 0.1, 0.16], mat: 'hose', blend: 0.05 },
    { d: 0.17, rr: [0.24, 0.16, 0.19], mat: 'hemd' },
    { d: 0.31, rr: [0.28, 0.14, 0.18], mat: 'hemd', part: 'brust' },
  ],
  shoulderD: 0.34,
  shoulderW: 0.26,
  upper: 0.2,
  fore: 0.18,
  armR: [0.075, 0.068, 0.055, 0.05],
  hand: [0.055, 0.072, 0.05],
  limp: 0.4,
  cuff: null,
  neckD: 0.4,
  neckR: 0.075,
  headOffset: [0, 0.25, 0.07],
  head: { h: [0.255, 0.215, 0.235], r: 0.16 },
  headPitch: -0.16,
  headRoll: 0.1,
  mats: { thigh: 'hose', shin: 'hose', shoe: 'schuh', upper: 'hemd', fore: 'haut', hand: 'haut', neck: 'haut', head: 'haut' },
};

/** So hoch steht die Hüfte, wenn der tiefere Fuß gerade den Boden berührt. */
export function hipHeight(B, pose) {
  let h = 0;
  for (const [swing, knee] of [[pose.legL, pose.kneeL], [pose.legR, pose.kneeR]]) h = Math.max(h, Math.cos(swing) * B.thigh + Math.cos(swing - knee) * B.shin);
  return h + B.ankle;
}

/**
 * Den Körper setzen. `B` sind die Maße (BODY mit den Abweichungen der Art), `skip` lässt Teile
 * aus (legs, arms, head – etwa unter einer Kutte). Gibt die Gelenke zurück: Hüfte, Beine
 * (Knie, Knöchel, Fuß), die Wirbelsäule `spine(d)`, Arme (Schulter, Ellbogen, Hand), Hals,
 * Kopfmitte, `H(l)` (Punkt im Kopfrahmen → Figur) und die Kopfachsen in der Welt.
 */
export function humanoid(ctx, B, skip = {}) {
  const { pose, W } = ctx;
  const stoop = B.stoop + pose.lean;
  const hip = [0, hipHeight(B, pose) + pose.bob - pose.sink, 0];
  const M = B.mats;
  const legs = [];
  for (const [i, side, swing, knee] of [[0, -B.gap, pose.legL, pose.kneeL], [1, B.gap, pose.legR, pose.kneeR]]) {
    const top = [side, hip[1], 0];
    const knee_ = limb(top, swing, B.thigh);
    const ankle = limb(knee_, swing - knee, B.shin);
    const foot = [ankle[0], Math.max(B.shoe[1] - 0.013, ankle[1] - 0.015), ankle[2] + B.footZ];
    legs.push({ side, top, knee: knee_, ankle, foot, swing });
    if (skip.legs) continue;
    ctx.capsule(top, knee_, B.legR[0], B.legR[1], M.thigh, { blend: 0.03, part: `thigh${i}` });
    ctx.capsule(knee_, ankle, B.legR[1], B.legR[2], M.shin, { part: `shin${i}` });
    if (!skip.feet) ctx.ellipsoid(foot, B.shoe, M.shoe, { part: `shoe${i}` });
  }
  // Die Wirbelsäule: vornüber gebeugt (stoop) und beim Stampfen und Watscheln zur Seite (roll)
  const roll = pose.roll || 0;
  const spine = (d, x = 0, y = 0, z = 0) => [x + Math.sin(roll) * d, hip[1] + d * Math.cos(stoop) * Math.cos(roll) + y, Math.sin(stoop) * d + z];
  const tilt = ctx.AX(stoop, roll);
  if (!skip.torso) {
    for (const t of B.torso) ctx.push({ kind: 'ellipsoid', c: W(spine(t.d, t.x || 0, t.y || 0, t.z || 0)), rr: t.rr, ax: t.roll ? ctx.AX(stoop, roll + t.roll) : tilt, mat: t.mat, blend: t.blend ?? 0.06, part: t.part, matAt: t.matAt, ...(t.bump ? { bump: t.bump } : {}) });
  }
  const arms = [];
  for (const [i, side, swing] of [[0, -1, pose.armL], [1, 1, pose.armR]]) {
    const sh = add(spine(B.shoulderD), [side * B.shoulderW, 0, 0]);
    const out = (i === 0 ? pose.spreadL : pose.spreadR) ?? pose.spread;
    const elbow = add(sh, [side * (0.03 + out * B.upper), -Math.cos(swing) * B.upper * (1 - 0.4 * out), Math.sin(swing) * B.upper * (1 - 0.4 * out)]);
    const fore = swing + ((i === 0 ? pose.elbowL : pose.elbowR) ?? pose.elbow);
    const wrist = add(elbow, [side * (0.01 + 0.5 * out * B.fore), -Math.cos(fore) * B.fore, Math.sin(fore) * B.fore]);
    // Die Hand setzt den Unterarm fort und hängt schlaff herab, solange der Arm nach vorn zeigt
    const limp = B.limp * Math.max(0, Math.sin(fore));
    const hand = add(wrist, [0, -Math.cos(fore) * 0.04 - 0.06 * limp, Math.sin(fore) * 0.04]);
    arms.push({ side, shoulder: sh, elbow, wrist, hand, swing, fore, handPitch: Math.PI - fore + limp });
    if (skip.arms) continue;
    ctx.capsule(sh, elbow, B.armR[0], B.armR[1], M.upper, { blend: 0.03, part: `upper${i}` });
    if (B.cuff) {
      const up = norm(sub(elbow, sh));
      ctx.capsule(add(elbow, mul(up, -0.045)), add(elbow, mul(up, 0.01)), B.armR[0] + 0.007, null, B.cuff, { part: `cuff${i}` });
    }
    ctx.capsule(elbow, wrist, B.armR[2], B.armR[3], M.fore, { part: `fore${i}` });
    if (!skip.hands) ctx.ellipsoid(hand, B.hand, M.hand, { pitch: Math.PI - fore + limp, part: `hand${i}` });
    if (!skip.hands && B.thumb) {
      // F6c (nur Menschen): ein Daumen vorn innen an der Hand – die Hand wird lesbar statt Klecks
      const down = norm(sub(wrist, elbow));
      const ahead = norm(sub([0, 0, 1], mul(down, down[2])));
      const inward = [-side, 0, 0];
      const base = add(add(hand, mul(ahead, B.thumb.at)), add(mul(inward, 0.012), mul(down, -0.012)));
      const tip = add(base, add(mul(down, B.thumb.len), add(mul(ahead, 0.012), mul(inward, 0.006))));
      ctx.capsule(base, tip, B.thumb.r, B.thumb.r * 0.85, M.hand, { blend: 0.012, part: `thumb${i}` });
    }
  }
  const neck = spine(B.neckD);
  const headRoll = B.headRoll + pose.head + roll;
  const pitch = B.headPitch + pose.nod;
  // F5 (nur Menschen, `headView`): Der Kopf dreht sich zum Backen über dem Hals zur Kamera (um die
  // x-Achse der Welt, der Scheitel von ihr weg) – das Gesicht steht fast frontal im Bild, vom
  // Scheitel bleibt nur der Umriss (recherche/menschen-gestaltung.md 1.1)
  const turn = B.headView ? viewTurn(ctx.yaw, B.headView) : null;
  const hAx = turn ? axesOf(0, pitch, headRoll).map(turn) : axesOf(0, pitch, headRoll); // Kopfrahmen in Figurkoordinaten
  const headC = turn ? add(neck, turn(B.headOffset)) : add(neck, B.headOffset);
  const H = (l) => inFrame(headC, hAx, l);
  const headAx = turn ? hAx.map((v) => toWorld(v, ctx.yaw)) : ctx.AX(pitch, headRoll);
  /** Achsen in der Welt für eine Form am Kopf, die zusätzlich geneigt ist (Schirm, Krempe). */
  const headAxes = (dPitch = 0, dRoll = 0) => (turn ? axesOf(0, pitch + dPitch, headRoll + dRoll).map((v) => toWorld(turn(v), ctx.yaw)) : ctx.AX(pitch + dPitch, headRoll + dRoll));
  if (!skip.head) {
    const chin = [0, -B.head.h[1] + 0.055, -0.02];
    ctx.capsule(add(neck, [0, -0.03, 0]), add(headC, turn ? turn(chin) : chin), B.neckR, null, M.neck, { blend: 0.03, part: 'neck' });
    ctx.push({ kind: 'box', c: W(headC), h: B.head.h, r: B.head.r, taper: B.head.taper, ax: headAx, mat: M.head, blend: 0.03, matAt: B.head.matAt, part: 'head', ...(B.head.bump ? { bump: B.head.bump } : {}) });
  }
  return { hip, legs, spine, tilt, stoop, arms, neck, headC, H, headAx, headAxes, pitch, roll: headRoll, head: B.head };
}

/**
 * F5: Eine Drehung um die x-Achse der Welt (der obere Teil von der Kamera weg), ausgedrückt in
 * Figurkoordinaten einer Figur, die um `yaw` gedreht steht. Für Vektoren (ohne Verschiebung).
 */
export function viewTurn(yaw, angle) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return (v) => {
    const wx = v[0] * c + v[2] * s;
    const wz = -v[0] * s + v[2] * c;
    const y = v[1] * ca + wz * sa;
    const z = -v[1] * sa + wz * ca;
    return [wx * c - z * s, y, wx * s + z * c];
  };
}

/** Eine Form im Kopfrahmen: Ellipsoid bei `l` (Kopfpunkt) mit Halbachsen `rr` (`head` merkt: am Kopf, F5). */
export function headEllipsoid(ctx, body, l, rr, mat, more = {}) {
  return ctx.push({ kind: 'ellipsoid', c: ctx.W(body.H(l)), rr, ax: body.headAx, mat, head: true, ...more });
}
/** Eine Kapsel im Kopfrahmen von Kopfpunkt a nach b. */
export function headCapsule(ctx, body, a, b, r, r1, mat, more = {}) {
  return ctx.push({ kind: 'capsule', a: ctx.W(body.H(a)), b: ctx.W(body.H(b)), r, r1: r1 ?? r, mat, head: true, ...more });
}

// --- Posen ---------------------------------------------------------------------------------------

/** Grundpose: stehen, die Arme halb nach vorn, müde. */
function basePose() {
  return { legL: 0, legR: 0, kneeL: 0.12, kneeR: 0.12, armL: 1.05, armR: 0.95, elbow: 0.2, bob: 0, lean: 0, head: 0, nod: 0, sink: 0, spread: 0, roll: 0, extra: 0 };
}

/**
 * Gangarten: je Bild k von n die Winkel des Gehens. `ph` läuft einmal um den Kreis.
 * - hinken: das linke Bein schwingt weit, das rechte schleift nach (der Schlurfer)
 * - rennen: vorgebeugt, Knie hoch, die Arme angewinkelt im Takt (der Flitzer)
 * - trippeln: kleine, schnelle Schritte, wippt (der Schwärmer)
 * - stampfen: schwer, breitbeinig, schaukelt von Seite zu Seite (der Brummer, der Riese)
 * - schreiten: aufrecht, lange ruhige Schritte (der Anführer, Bosse)
 * - watscheln: kurze Beine, der Leib wiegt sich (der Brüter)
 */
export const GAITS = {
  hinken(p, ph) {
    p.legL = 0.45 * Math.sin(ph);
    p.legR = -0.28 * Math.sin(ph);
    p.kneeL = 0.1 + 0.55 * Math.max(0, -Math.sin(ph));
    p.kneeR = 0.08 + 0.2 * Math.max(0, Math.sin(ph));
    p.armL = 1.05 - 0.12 * Math.sin(ph);
    p.armR = 0.95 + 0.08 * Math.sin(ph);
    p.bob = -0.02 * Math.abs(Math.sin(ph));
    p.head = 0.09 * Math.sin(ph);
    p.nod = 0.05 * Math.abs(Math.cos(ph));
  },
  rennen(p, ph) {
    p.legL = 0.75 * Math.sin(ph);
    p.legR = -0.75 * Math.sin(ph);
    p.kneeL = 0.25 + 1.0 * Math.max(0, -Math.sin(ph + 0.6));
    p.kneeR = 0.25 + 1.0 * Math.max(0, Math.sin(ph + 0.6));
    p.armL = 0.35 - 0.75 * Math.sin(ph);
    p.armR = 0.35 + 0.75 * Math.sin(ph);
    p.elbow = 1.45;
    p.lean = 0.28;
    p.bob = 0.035 * Math.abs(Math.cos(ph)) - 0.02;
    p.nod = -0.12;
    p.head = 0.04 * Math.sin(ph);
  },
  trippeln(p, ph) {
    p.legL = 0.35 * Math.sin(ph);
    p.legR = -0.35 * Math.sin(ph);
    p.kneeL = 0.2 + 0.5 * Math.max(0, -Math.sin(ph));
    p.kneeR = 0.2 + 0.5 * Math.max(0, Math.sin(ph));
    p.armL = 0.7 + 0.3 * Math.sin(ph);
    p.armR = 0.7 - 0.3 * Math.sin(ph);
    p.elbow = 0.5;
    p.bob = 0.03 * Math.abs(Math.sin(ph)) - 0.015;
    p.head = 0.12 * Math.sin(ph);
  },
  stampfen(p, ph) {
    p.legL = 0.32 * Math.sin(ph);
    p.legR = -0.32 * Math.sin(ph);
    p.kneeL = 0.15 + 0.45 * Math.max(0, -Math.sin(ph));
    p.kneeR = 0.15 + 0.45 * Math.max(0, Math.sin(ph));
    p.armL = 0.55 - 0.18 * Math.sin(ph);
    p.armR = 0.55 + 0.18 * Math.sin(ph);
    p.elbow = 0.35;
    p.bob = -0.03 * Math.abs(Math.sin(ph));
    p.roll = 0.07 * Math.sin(ph);
    p.head = -0.05 * Math.sin(ph);
  },
  schreiten(p, ph) {
    p.legL = 0.4 * Math.sin(ph);
    p.legR = -0.4 * Math.sin(ph);
    p.kneeL = 0.12 + 0.5 * Math.max(0, -Math.sin(ph));
    p.kneeR = 0.12 + 0.5 * Math.max(0, Math.sin(ph));
    p.armL = 0.3 - 0.3 * Math.sin(ph);
    p.armR = 0.3 + 0.3 * Math.sin(ph);
    p.elbow = 0.3;
    p.bob = -0.02 * Math.abs(Math.sin(ph));
    p.head = 0.03 * Math.sin(ph);
  },
  watscheln(p, ph) {
    p.legL = 0.25 * Math.sin(ph);
    p.legR = -0.25 * Math.sin(ph);
    p.kneeL = 0.12 + 0.35 * Math.max(0, -Math.sin(ph));
    p.kneeR = 0.12 + 0.35 * Math.max(0, Math.sin(ph));
    p.armL = 0.6 + 0.1 * Math.sin(ph);
    p.armR = 0.6 - 0.1 * Math.sin(ph);
    p.elbow = 0.4;
    p.roll = 0.12 * Math.sin(ph);
    p.bob = -0.015 * Math.abs(Math.sin(ph));
    p.head = -0.1 * Math.sin(ph);
  },
};

/**
 * Pose je Zustand und Bild. `gait` die Gangart, `k` Bild im Zustand, `n` Bilder im Zustand.
 * Zustände: gehen, stehen, ausholen, schlag, treffer, fallen.
 */
export function poseOf(gait, anim, k, n) {
  const p = basePose();
  const ph = (n > 1 ? k / n : 0) * Math.PI * 2;
  if (anim === 'gehen') GAITS[gait](p, ph);
  else if (anim === 'stehen') {
    p.bob = -0.012 * k;
    p.armL = 1.0 + 0.05 * k;
    p.armR = 0.92 - 0.05 * k;
    p.head = 0.1 * (k ? 1 : -1);
    p.nod = 0.04 * k;
    p.extra = k;
  } else if (anim === 'ausholen') {
    // Beide Arme hoch über den Kopf, breitbeinig, das Gesicht hebt sich
    Object.assign(p, { legL: 0.22, legR: -0.16, kneeL: 0.3, kneeR: 0.25, armL: 2.75, armR: 2.6, elbow: 0.25, spread: 0.55, lean: -0.14, nod: -0.14, head: -0.05 });
  } else if (anim === 'schlag') {
    // Herab (0), der Wischer (1), der Aufprall vornübergebeugt (2)
    const q = [0.25, 0.62, 1][k];
    Object.assign(p, {
      legL: 0.22,
      legR: -0.16,
      kneeL: 0.3 + 0.1 * q,
      kneeR: 0.25 + 0.1 * q,
      armL: 2.45 - 1.85 * q,
      armR: 2.35 - 1.8 * q,
      elbow: 0.2 - 0.05 * q,
      spread: 0.45 * (1 - q),
      lean: -0.08 + 0.42 * q,
      nod: -0.1 + 0.28 * q,
      bob: -0.03 * q,
      extra: q,
    });
  } else if (anim === 'treffer') {
    Object.assign(p, { lean: -0.3, armL: -0.35, armR: -0.2, elbow: 0.6, head: -0.15, nod: -0.2 });
  } else if (anim === 'fallen') {
    // Er sackt in sich zusammen: die Knie geben nach, der Rumpf kippt vornüber, die Arme sinken –
    // er schläft ein und versinkt ein wenig im Laub (die Füße bleiben auf der Erde)
    const q = (k + 1) / n;
    Object.assign(p, {
      legL: 0.9 * q,
      legR: 0.75 * q,
      kneeL: 0.2 + 1.9 * q,
      kneeR: 0.2 + 1.7 * q,
      lean: k >= 3 ? 1.2 : 0.95 * q,
      armL: 1.0 - 0.8 * q,
      armR: 0.9 - 0.7 * q,
      head: 0.25 * q,
      nod: 0.4 * q,
      sink: [0, 0, 0.05, 0.14][k] || 0,
      extra: q,
    });
  }
  return p;
}
