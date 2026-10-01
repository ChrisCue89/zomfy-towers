// Menschen als Sprites (F4): Teile, Richtungen, Zustände und das Backen eines Bildes. Anders als
// die Horde haben Menschen acht gezeichnete Richtungen (Mika trägt links die Laterne, rechts das
// Werkzeug – gespiegelt wechselten sie die Hand), ihr Gesicht als kleine Flicken je Ausdruck
// (Blinzeln, Lächeln, »Aua« ändern nur diese Texel) und Anker für das Werkzeug, das als eigenes
// Bild darüber oder dahinter liegt. Reines JavaScript ohne three.js – der Worker backt mit.

import { trace, paint, stampAt, toTexel, TEXEL } from '../render/spriteBaker.js';
import { encodeFrame, encodePatch } from '../render/spriteCode.js';
import { frameContext, scaleFrame, add, sub, norm, dot, toWorld } from './spriteFigure.js';
import { posePerson, poseDog, PERSON_ANIMS, DOG_ANIMS } from './peopleFigure.js';
import { PEOPLE, TOOLS, TOOL_MATERIALS, BACK_BUCKET, TOOL_BUCKETS, buildTool, bucketOf, facesOf } from './peopleKinds.js';

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

/** Formen, Stempel, Gesicht und Anker eines Bildes (Welt-Meter, Fußpunkt im Ursprung). */
export function personShapes(id, spec, part, d, anim, k) {
  const kind = PEOPLE[id];
  const p = kind.parts[part];
  const n = animsOf(id)[anim];
  const pose = kind.dog ? poseDog(anim, k, n) : posePerson(anim, k, n, { lantern: Boolean(p.lantern), gait: kind.gait });
  const ctx = frameContext(d, pose);
  ctx.anim = anim;
  ctx.k = k;
  ctx.stamps = [];
  ctx.face = null;
  kind.build(ctx, spec);
  const size = kind.size || 1;
  scaleFrame(ctx, size);
  if (size !== 1) {
    for (const s of ctx.stamps) s.at = s.at.map((v) => v * size);
    if (ctx.face) ctx.face.at = ctx.face.at.map((v) => v * size);
  }
  return ctx;
}

const materialCache = new Map();
/** Stoffe einer Figur für einen Stand (Mika: je Aussehen einmal gebaut). */
function materialsOf(id, spec) {
  const kind = PEOPLE[id];
  if (typeof kind.materials !== 'function') return kind.materials;
  const key = `${id}:${JSON.stringify(spec)}`;
  if (!materialCache.has(key)) materialCache.set(key, kind.materials(spec));
  return materialCache.get(key);
}

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
  const raster = trace(ctx.shapes, kind.cell || PEOPLE_CELL);
  const materials = materialsOf(id, spec);
  const out = paint(raster, materials);
  for (const s of ctx.stamps) stampAt(out, raster, s.stamp, s.at, s.opts);
  const patches = {};
  let color = out.color;
  let glow = out.glow;
  if (ctx.face && kind.expressions?.length) {
    const { faces, legend } = facesOf(id, spec);
    const mask = new Uint8Array(raster.w * raster.h);
    // Das Gesicht liegt nur auf dem Kopf (und der Nase), nie auf Mütze, Hand oder Werkzeug davor
    const parts = new Set();
    ctx.shapes.forEach((sh, i) => (sh.part === 'head' || sh.face) && parts.add(i));
    const results = {};
    for (const expr of kind.expressions) {
      const face = faces[expr]?.[ctx.face.view];
      if (!face) continue;
      const res = { color: out.color.slice(), glow: out.glow.slice() };
      stampAt(res, raster, { rows: face, legend }, ctx.face.at, { flip: ctx.face.flip, mark: mask, parts });
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
  if (m.handR && m.chest) {
    const hand = anchorOf(m.handR, raster);
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
    const back = anchorOf(m.back, raster);
    // Der Rücken zeigt zur Kamera (NO, N, NW): das Werkzeug liegt davor
    anchors.back = [back.x, back.y, BACK_BUCKET, m.back[2] - m.chest[2] > 0.08 ? 1 : 0];
  }
  if (m.laterne) {
    const l = m.laterne;
    anchors.lantern = [+l[0].toFixed(3), +l[1].toFixed(3), +l[2].toFixed(3)];
  }
  return { w: raster.w, h: raster.h, px: raster.px, py: raster.py, color, glow, normal: raster.normal, shadow, patches, anchors };
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
  const lift = Math.round((TOOL_LIFT * 0.8) / TEXEL);
  const raster = trace(ctx.shapes, { ...TOOL_CELL, py: TOOL_CELL.py + lift });
  const out = paint(raster, TOOL_MATERIALS);
  return { w: raster.w, h: raster.h, px: raster.px, py: raster.py - lift, color: out.color, glow: out.glow, normal: raster.normal, shadow: null };
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
