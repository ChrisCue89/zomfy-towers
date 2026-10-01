// Menschen als Sprites (F4): Teile, Richtungen, Zustände und das Backen eines Bildes. Anders als
// die Horde haben Menschen acht gezeichnete Richtungen (Mika trägt links die Laterne, rechts das
// Werkzeug – gespiegelt wechselten sie die Hand), ihr Gesicht als kleine Flicken je Ausdruck
// (Blinzeln, Lächeln, »Aua« ändern nur diese Texel) und Anker für das Werkzeug, das als eigenes
// Bild darüber oder dahinter liegt. Reines JavaScript ohne three.js – der Worker backt mit.

import { trace, paint, stampAt, toTexel, lightField, TEXEL } from '../render/spriteBaker.js';
import { encodeFrame, encodePatch } from '../render/spriteCode.js';
import { frameContext, scaleFrame, add, sub, norm, dot, toWorld } from './spriteFigure.js';
import { posePerson, poseDog, PERSON_ANIMS, DOG_ANIMS, VIEW_TILT, HUMAN, toneOf } from './peopleFigure.js';
import { PEOPLE, TOOLS, TOOL_MATERIALS, BACK_BUCKET, TOOL_BUCKETS, buildTool, bucketOf, facesOf } from './peopleKinds.js';
import { mapFace, placeFace, stampFace } from './peopleFaces.js';
import { rings, ribs, strands, folds, locks, beardLocks } from './peopleRelief.js';

/** Gezeichnete Richtungen: 0 S, 1 SO, 2 O, 3 NO, 4 N, 5 NW, 6 W, 7 SW. */
export const PEOPLE_DIRS = 8;

/** Zelle je Bild (Texel) und Fußpunkt darin bei Größe 1 (wie bei der Horde). */
export const PEOPLE_CELL = { w: 80, h: 84, px: 40, py: 66 };

/** Zelle eines Werkzeugs: der Griff in der Mitte, Platz für einen langen Stiel in jede Richtung. */
export const TOOL_CELL = { w: 112, h: 112, px: 56, py: 56 };

/** Schatten unter den Füßen (Halbachsen auf dem Boden, m). */
const SHADOW = { x: 0.27, z: 0.16 };

const F = [0, -0.6, -0.8]; // Blickrichtung der Kamera (Tiefe wie im Bäcker)

/** Bilder je Zustand einer Figur (Menschen oder Hund). */
export function animsOf(id) {
  return PEOPLE[id]?.dog ? DOG_ANIMS : PERSON_ANIMS;
}

/**
 * Die Bilder eines Teils der Reihe nach: je Richtung die Zustände des Teils, je Zustand seine
 * Bilder. Ein Teil wird zusammen in den Atlas gelegt.
 */
export function partFrames(id, part) {
  const kind = PEOPLE[id];
  const spec = kind.parts[part];
  const anims = animsOf(id);
  const list = [];
  for (let d = 0; d < PEOPLE_DIRS; d++) for (const anim of spec.anims) for (let k = 0; k < anims[anim]; k++) list.push({ d, anim, k });
  return list;
}

const IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/**
 * F5: Ein Bild zum Backen nach hinten kippen – um die x-Achse der Welt durch `pivot` (der obere Teil
 * von der Kamera weg), damit die Figur frontaler im Bild steht. Formen, Stempel und Gesicht drehen
 * mit; Muster (`matAt`) rechnen weiter im ungekippten Bild. Gibt die Drehung für Punkte zurück.
 */
export function tiltFrame(ctx, angle, pivot = [0, 0, 0]) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const turn = (v) => [v[0], v[1] * ca + v[2] * sa, -v[1] * sa + v[2] * ca];
  const back = (v) => [v[0], v[1] * ca - v[2] * sa, v[1] * sa + v[2] * ca];
  const at = (p) => add(turn(sub(p, pivot)), pivot);
  const from = (p) => add(back(sub(p, pivot)), pivot);
  for (const s of ctx.shapes) {
    if (s.kind === 'capsule') {
      s.a = at(s.a);
      s.b = at(s.b);
    } else {
      s.c = at(s.c);
      s.ax = (s.ax || IDENTITY).map(turn);
    }
    const capsule = s.kind === 'capsule'; // bei Kapseln ist l der Weltabstand zu a
    if (s.matAt) {
      const f = s.matAt;
      s.matAt = (l, p) => f(capsule ? back(l) : l, from(p));
    }
    // F6c: Relief – bei Kapseln liegt die Neigung in der Welt und dreht mit, sonst im eigenen Rahmen
    if (s.bump) {
      const f = s.bump;
      s.bump = capsule ? (l, p) => { const v = f(back(l), from(p)); return v && turn(v); } : (l, p) => f(l, from(p));
    }
  }
  for (const st of ctx.stamps || []) st.at = at(st.at);
  if (ctx.face?.eyes) mapFace(ctx.face, at, turn);
  else if (ctx.face) ctx.face.at = at(ctx.face.at);
  return at;
}

/**
 * F5: Fürs Licht im Spiel zählt die ungekippte Figur. Die Normalen des Bildes drehen um die Kippung
 * zurück, am Kopf (Kopf und Formen im Kopfrahmen) um dessen Drehung dazu – sonst wiese das Gesicht
 * zum Himmel, und die Laterne vor der Brust erreichte es nicht mehr. Die Töne des Bildes bleiben, wie
 * sie im gekippten Bild gemalt sind.
 */
function uprightNormals(raster, shapes) {
  const out = raster.normal.slice();
  const turns = shapes.map((s) => {
    const a = -(VIEW_TILT + (s.part === 'head' || s.head ? HUMAN.headView : 0));
    return [Math.cos(a), Math.sin(a)];
  });
  for (let i = 0; i < raster.hit.length; i++) {
    const s = raster.hit[i];
    if (s < 0) continue;
    const [ca, sa] = turns[s];
    const y = out[i * 3 + 1];
    const z = out[i * 3 + 2];
    out[i * 3 + 1] = y * ca + z * sa;
    out[i * 3 + 2] = -y * sa + z * ca;
  }
  return out;
}

/**
 * F6c: Falten für alle, die der Bauplan nicht selbst gesetzt hat – in der Ellenbeuge (zur Innenseite
 * des Arms) und an der Hose über dem Schuh gestaucht.
 */
function clothRelief(ctx) {
  const along = (sh) => {
    const d = [sh.b[0] - sh.a[0], sh.b[1] - sh.a[1], sh.b[2] - sh.a[2]];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    return [[d[0] / l, d[1] / l, d[2] / l], l];
  };
  for (const i of [0, 1]) {
    const up = ctx.part(`upper${i}`);
    const fo = ctx.part(`fore${i}`);
    const sh = ctx.part(`shin${i}`);
    if (up && !up.bump) up.bump = rings(...along(up), [0.5, 0.8], { w: 0.016, amp: 0.8, side: ctx.fwd, bias: 0.01 });
    if (fo && !fo.bump) fo.bump = rings(...along(fo), [0.22], { w: 0.016, amp: 0.7, side: ctx.fwd, bias: -0.01 });
    if (sh && !sh.bump) sh.bump = rings(...along(sh), [0.5, 0.6], { w: 0.014, amp: 0.6 });
    // Schuhe: eine Kante über der Sohle (heller Grat, darunter Schatten)
    const shoe = ctx.part(`shoe${i}`);
    if (shoe && !shoe.bump && shoe.kind === 'ellipsoid') shoe.bump = folds([-shoe.rr[1] * 0.3], { w: 0.011, amp: 0.65, wave: 0 });
  }
  // Haar in Strähnen: am Kopf nur, wo Haar ist (das Gesicht behält seine Wölbung); Locken, Zöpfe und
  // Wuschel aus Haar bekommen Rillen – Kapseln längs, Ellipsoide rund um die eigene Hochachse; Bärte
  // fallen in senkrechten Strähnen. Rund 0,07 m je Strähne (knapp drei Texel), sonst wird es Gries.
  // F6c: Büschel ungleicher Breite statt gleicher Rillen (die lasen sich am Hinterkopf wie Bretter),
  // je Figur fest verteilt (`seed` aus der ID – in allen Richtungen und Bildern dieselben)
  const seed = [...(ctx.id || 'x')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7) / 97;
  const head = ctx.part('head');
  if (head && head.matAt && !head.hairRelief) {
    const face = head.bump;
    const hairy = head.matAt;
    const hh = head.h || [0.29, 0.235, 0.26];
    const n = Math.max(12, Math.round((Math.PI * (hh[0] + hh[2])) / 0.1));
    const crown = locks(n, { amp: 0.5, seed, fade: [hh[1] * 0.3, hh[1] * 0.95] });
    head.bump = (l, p) => (hairy(l, p) === 'haar' ? crown(l) : face ? face(l, p) : null);
    head.hairRelief = true;
  }
  // Stoff: über dem Bauch staucht sich der Stoff zu zwei weichen Falten (vorn), Röcke und
  // Mantelschöße fallen in senkrechten Falten
  for (const s of ctx.shapes) {
    if (s.bump) continue;
    if (s.torso === 1 && s.kind === 'ellipsoid') s.bump = folds([-s.rr[1] * 0.55, -s.rr[1] * 0.25], { w: 0.013, amp: 0.55, wave: 0.01, waveK: 11, front: s.rr[2] * 0.3 });
    else if (s.part === 'rock' && s.kind === 'ellipsoid') s.bump = ribs(Math.max(8, Math.round((2 * Math.PI * Math.max(s.rr[0], s.rr[2])) / 0.11)), { amp: 0.5, to: s.rr[1] * 0.4 });
  }
  for (const s of ctx.shapes) {
    if (s.bump || (s.mat !== 'haar' && s.mat !== 'bart')) continue;
    if (s.kind === 'capsule') {
      const [axis] = along(s);
      s.bump = strands(axis, { period: 0.065, amp: 0.38, across: ctx.right });
    } else if (s.kind === 'ellipsoid' && s.mat === 'bart') {
      s.bump = beardLocks({ seed });
    } else if (s.kind === 'ellipsoid') {
      s.bump = locks(Math.max(5, Math.round((2 * Math.PI * Math.max(s.rr[0], s.rr[2])) / 0.08)), { amp: 0.45, seed, jitter: 0.2 });
    }
  }
}

/** Formen, Stempel, Gesicht und Anker eines Bildes (Welt-Meter, Fußpunkt im Ursprung). */
export function personShapes(id, spec, part, d, anim, k) {
  const kind = PEOPLE[id];
  const p = kind.parts[part];
  const n = animsOf(id)[anim];
  const pose = kind.dog ? poseDog(anim, k, n) : posePerson(anim, k, n, { lantern: Boolean(p.lantern), gait: kind.gait });
  const ctx = frameContext(d, pose);
  ctx.anim = anim;
  ctx.k = k;
  ctx.id = id;
  ctx.stamps = [];
  ctx.face = null;
  kind.build(ctx, spec);
  if (!kind.dog) clothRelief(ctx);
  const size = kind.size || 1;
  scaleFrame(ctx, size);
  if (size !== 1) {
    for (const s of ctx.stamps) s.at = s.at.map((v) => v * size);
    if (ctx.face?.eyes) mapFace(ctx.face, (p) => p.map((v) => v * size));
    else if (ctx.face) ctx.face.at = ctx.face.at.map((v) => v * size);
  }
  // F5: frontaler backen; die Anker liegen im gekippten Bild, Richtung und Seite des Werkzeugs
  // rechnen weiter mit der ungekippten Figur
  ctx.view = tiltFrame(ctx, VIEW_TILT);
  return ctx;
}

/**
 * F5: Sel-out – die Kontur eines Stoffs liegt zwei Stufen unter seinem dunkelsten Ton (in der Rampe
 * der Palette), zur Lichtseite eine Stufe. So steht eine grüne Jacke auch auf grünem Gras.
 */
function withOutlines(materials) {
  const out = {};
  for (const [name, m] of Object.entries(materials)) {
    out[name] = m && !m.glow && m.outline === undefined ? { ...m, outline: toneOf(m.ramp[0], -2), outlineLit: toneOf(m.ramp[0], -1) } : m;
  }
  return out;
}

const materialCache = new Map();
/** Stoffe einer Figur für einen Stand (Mika: je Aussehen einmal gebaut). */
function materialsOf(id, spec) {
  const kind = PEOPLE[id];
  const key = typeof kind.materials === 'function' ? `${id}:${JSON.stringify(spec)}` : id;
  if (!materialCache.has(key)) materialCache.set(key, withOutlines(typeof kind.materials === 'function' ? kind.materials(spec) : kind.materials));
  return materialCache.get(key);
}

/** F5: Gruppe je Form für die Schattenlinien – jeder Arm und jedes Bein für sich, der Rest ist Körper. */
function groupsOf(shapes) {
  return shapes.map((s) => {
    const m = /^(upper|cuff|fore|hand|thumb|thigh|shin|shoe)(\d)$/.exec(s.part || '');
    if (!m) return 'body';
    return (['thigh', 'shin', 'shoe'].includes(m[1]) ? 'leg' : 'arm') + m[2];
  });
}

/** Wie die Menschen gemalt werden (F5): Schattenlinien ab 2,5 cm Abstand, Töne aufgeräumt. */
export const PEOPLE_PAINT = { occlude: 0.025, tidy: true, backlight: true, tones: { deep: -0.3, shade: 0.18, light: 0.52, shine: 0.9 } };
/**
 * F6b: Licht wie gezeichnet – seitlicher von oben links als bei der Horde (sonst ist von vorn alles
 * gleich hell und flach), Schlagschatten bis 55 cm, Verdeckung in Falten, geglättete Tonflächen.
 */
export const PEOPLE_LIGHT = { dir: [-0.7, 0.6, 0.38], wrap: 0.15, shadow: 0.55, ao: 0.75, smooth: true };

/** Schatten als Ellipse um den Fußpunkt, nur wo die Figur nicht selbst steht. */
function shadowOf(raster, color, size) {
  const { w, h, px, py } = raster;
  const shadow = new Uint8Array(w * h);
  const ax = size.x / TEXEL;
  const ay = (0.6 * size.z) / TEXEL;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dx = (i + 0.5 - px) / ax;
      const dy = (j + 0.5 - py) / ay;
      if (dx * dx + dy * dy <= 1 && color[j * w + i] < 0) shadow[j * w + i] = 1;
    }
  }
  return shadow;
}

/** Lage eines Weltpunkts relativ zum Fußpunkt in Texeln (x rechts, y oben) und seine Tiefe. */
function anchorOf(point, raster) {
  const t = toTexel(point, raster.px, raster.py);
  return { x: +(t.x - raster.px).toFixed(2), y: +(raster.py - t.y).toFixed(2), t: dot(point, F) };
}

/**
 * Ein Bild einer Figur backen. `spec` beschreibt den Stand (Mika: ihr Aussehen), `part` den Teil
 * der Fassung. Das Bild trägt das Gesicht im ersten Ausdruck; für die übrigen Ausdrücke gibt es
 * Flicken (nur die Texel, die irgendein Ausdruck berührt). Dazu Anker für das Werkzeug: die rechte
 * Hand (Lage, Winkelstufe, vor oder hinter dem Körper) und der Rücken.
 * @returns {{w, h, px, py, color, glow, normal, shadow, patches: Record<string, {mask, color, glow}>, anchors: object}}
 */
export function bakePerson(id, spec, part, d, anim, k) {
  const kind = PEOPLE[id];
  const ctx = personShapes(id, spec, part, d, anim, k);
  const raster = trace(ctx.shapes, kind.cell || PEOPLE_CELL, { cull: true });
  const materials = materialsOf(id, spec);
  const groups = groupsOf(ctx.shapes);
  const light = PEOPLE_LIGHT ? lightField(raster, ctx.shapes, { ...PEOPLE_LIGHT, groups }) : null;
  const out = paint(raster, materials, { ...PEOPLE_PAINT, groups, light });
  for (const s of ctx.stamps) stampAt(out, raster, s.stamp, s.at, s.opts);
  const patches = {};
  let color = out.color;
  let glow = out.glow;
  let eyes = null; // für die Prüfung: wo die Augen liegen (Texel der Mitte, Breite)
  if (ctx.face?.eyes && kind.expressions?.length) {
    const { look, legend } = facesOf(id, spec);
    const mask = new Uint8Array(raster.w * raster.h);
    // Das Gesicht liegt nur auf dem Kopf (und Nase, Bart), nie auf Mütze, Hand oder Werkzeug davor;
    // Augen und Wangen nur auf Haut (F6a: jedes Merkmal an seinem Punkt auf dem Kopf)
    const parts = new Set();
    ctx.shapes.forEach((sh, i) => (sh.part === 'head' || sh.face) && parts.add(i));
    const place = placeFace(ctx.face, raster, parts, new Set([kind.skin || 'haut']));
    eyes = place.eyes.map((e) => (e ? [e.i, e.j, e.width] : null));
    const results = {};
    for (const expr of kind.expressions) {
      const res = { color: out.color.slice(), glow: out.glow.slice() };
      stampFace(res, raster, place, expr, legend, look, parts, mask);
      results[expr] = res;
    }
    const first = kind.expressions[0];
    if (results[first]) {
      color = results[first].color;
      glow = results[first].glow;
    }
    for (const expr of kind.expressions.slice(1)) if (results[expr]) patches[expr] = { mask, color: results[expr].color, glow: results[expr].glow };
  }
  const shadow = kind.shadow === false ? new Uint8Array(raster.w * raster.h) : shadowOf(raster, color, kind.shadowSize || SHADOW);
  // Anker: rechte Hand mit der Richtung des Werkzeugs (Unterarm, in Ruhe schräg nach vorn
  // getragen), der Rücken; vorn heißt näher an der Kamera als die Brust
  const anchors = {};
  const m = ctx.marks;
  const view = ctx.view || ((p) => p);
  if (m.handR && m.chest) {
    const hand = anchorOf(view(m.handR), raster);
    // Richtung des Unterarms in Figurkoordinaten (die Welt dreht nur um die Hochachse)
    const yaw = ctx.yaw;
    const dw = norm(sub(m.handR, m.elbowR));
    const fig = [dw[0] * Math.cos(yaw) - dw[2] * Math.sin(yaw), dw[1], dw[0] * Math.sin(yaw) + dw[2] * Math.cos(yaw)];
    let phi = Math.atan2(fig[2], -fig[1]);
    if (anim !== 'schwung' && anim !== 'suchen') phi += 1.0; // in Ruhe schräg nach vorn (wie die Voxel-Figur)
    const bucket = bucketOf([0, -Math.cos(phi), Math.sin(phi)]);
    // Vorn liegt das Werkzeug, wenn seine Mitte näher zur Kamera (Süden) steht als die Brust –
    // über dem Kopf ausgeholt liegt es dahinter, von hinten gesehen davor
    const mid = add(m.handR, toWorld([0, -Math.cos(phi) * 0.3, Math.sin(phi) * 0.3], yaw));
    anchors.hand = [hand.x, hand.y, bucket, mid[2] - m.chest[2] > 0.08 ? 1 : 0];
  }
  if (m.back) {
    const back = anchorOf(view(m.back), raster);
    // Der Rücken zeigt zur Kamera (NO, N, NW): das Werkzeug liegt davor
    anchors.back = [back.x, back.y, BACK_BUCKET, m.back[2] - m.chest[2] > 0.08 ? 1 : 0];
  }
  if (m.laterne) {
    const l = m.laterne;
    anchors.lantern = [+l[0].toFixed(3), +l[1].toFixed(3), +l[2].toFixed(3)];
  }
  return { w: raster.w, h: raster.h, px: raster.px, py: raster.py, color, glow, normal: uprightNormals(raster, ctx.shapes), shadow, patches, anchors, eyes };
}

/**
 * Ein Werkzeug in einer Richtung und Winkelstufe backen. Gebaut wird es um den Griff, aber
 * `TOOL_LIFT` über dem Boden (unter dem Boden ist für den Bäcker Erde – ein Stiel, der nach unten
 * zeigt, verschwände sonst); der Fußpunkt des Bildes ist der Griff.
 */
export const TOOL_LIFT = 1.5;
export function bakeTool(id, d, bucket) {
  const ctx = frameContext(d, null);
  ctx.stamps = [];
  buildTool(ctx, id, bucket, [0, TOOL_LIFT, 0]);
  tiltFrame(ctx, VIEW_TILT, [0, TOOL_LIFT, 0]); // F5: gekippt wie die Figur, um den Griff
  const lift = Math.round((TOOL_LIFT * 0.8) / TEXEL);
  const raster = trace(ctx.shapes, { ...TOOL_CELL, py: TOOL_CELL.py + lift }, { cull: true });
  const out = paint(raster, TOOL_MATERIALS);
  return { w: raster.w, h: raster.h, px: raster.px, py: raster.py - lift, color: out.color, glow: out.glow, normal: uprightNormals(raster, ctx.shapes), shadow: null };
}

/** Bilder eines Werkzeugs der Reihe nach: je Richtung die Winkelstufen und der Rücken. */
export function toolFrames() {
  const list = [];
  for (let d = 0; d < PEOPLE_DIRS; d++) for (let b = 0; b <= TOOL_BUCKETS; b++) list.push({ d, bucket: b });
  return list;
}

/**
 * Ein gebackenes Bild für den Atlas kodieren: das Bild, je Ausdruck sein Flicken, die Anker.
 * Werkzeuge haben weder Flicken noch Anker.
 */
export function encodeBake(f) {
  const body = encodeFrame(f);
  const patches = {};
  for (const [expr, p] of Object.entries(f.patches || {})) patches[expr] = encodePatch(f, p.mask, p.color, p.glow);
  return { body, patches, anchors: f.anchors || null };
}

/** Bytes eines kodierten Bildes (zum Übertragen aus dem Worker). */
export function bakeBuffers(enc) {
  const out = [enc.body.bytes.buffer];
  for (const p of Object.values(enc.patches)) out.push(p.bytes.buffer);
  return out;
}

export const PERSON_IDS = Object.keys(PEOPLE);
export const TOOL_IDS = Object.keys(TOOLS);
export { BACK_BUCKET, TOOL_BUCKETS };
