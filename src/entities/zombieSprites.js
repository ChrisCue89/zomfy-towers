// Schlurfer als Sprites (F1, F-Design): Richtungen, Zustände und das Backen eines Bildes. Die
// Arten (Stoffe, Körper, Zubehör, Stempel) stehen in zombieSpriteKinds.js, Gerüst und Posen in
// spriteFigure.js, gerastert und gemalt wird in render/spriteBaker.js. Gebacken wird in 5
// Richtungen (S, SO, O, NO, N); W, NW und SW sind gespiegelt.

import { trace, paint, stampAt, TEXEL } from '../render/spriteBaker.js';
import { frameContext, poseOf, scaleFrame } from './spriteFigure.js';
import { KINDS } from './zombieSpriteKinds.js';

/** Zelle je Bild (Texel) und Fußpunkt darin bei Größe 1 – unten und seitlich Platz fürs Zusammensacken. */
export const CELL = { w: 80, h: 84, px: 40, py: 66 };

/** Richtungen: Index 0 S, 1 SO, 2 O, 3 NO, 4 N (gezeichnet), 5–7 gespiegelt. */
export const DIRS = 5;

/**
 * Bilder je Zustand: gehen sechs je Schritt (mit vier ruckelte das Hinken), stehen zwei
 * (Schwanken), ausholen eins (Arme hoch), schlag drei (herab, Wischer, Aufprall), treffer eins,
 * fallen vier (sackt zusammen, schläft ein, Laub).
 */
export const ANIMS = { gehen: 6, stehen: 2, ausholen: 1, schlag: 3, treffer: 1, fallen: 4 };

/** Arten mit Sprites. */
export const SPRITE_TYPES = Object.keys(KINDS);

/** Schatten unter den Füßen: Halbachsen auf dem Boden (m), quer und in der Tiefe, bei Größe 1. */
const SHADOW = { x: 0.3, z: 0.18 };

/**
 * Die Zelle einer Art: groß genug für ihre Größe und ihr Zubehör. `f` ist ein Faktor auf die
 * Größe der Art (F2: Champions ×1,15, die Teile des Moosriesen ×0,55) – gebacken wird dann in
 * dieser Größe, ein Texel bleibt 1/40 m.
 */
export function cellOf(type, f = 1) {
  const kind = KINDS[type];
  const base = kind.cell || (() => {
    const s = Math.max(1, kind.size);
    const w = 2 * Math.ceil((CELL.w * s) / 2);
    return { w, h: Math.ceil(CELL.h * s), px: w / 2, py: Math.round(CELL.py * s) };
  })();
  if (f === 1) return base;
  const w = 2 * Math.ceil((base.w * f) / 2);
  return { w, h: Math.ceil(base.h * f), px: w / 2, py: Math.round(base.py * f) };
}

/** Formen und Stempel eines Bildes (Welt-Meter, Fußpunkt im Ursprung), `f` wie bei cellOf. */
export function frameShapes(type, dir, anim, k, f = 1) {
  const kind = KINDS[type];
  const pose = poseOf(kind.gait, anim, k, ANIMS[anim]);
  const ctx = frameContext(dir, pose);
  ctx.anim = anim;
  ctx.k = k;
  ctx.stamps = [];
  kind.build(ctx);
  const size = kind.size * f;
  scaleFrame(ctx, size);
  if (size !== 1) for (const s of ctx.stamps) s.at = s.at.map((v) => v * size);
  return ctx;
}

/**
 * Ein Bild backen: Formen rastern, malen, Stempel setzen. `type` ist die Art, `f` ein Faktor auf
 * ihre Größe (F2).
 * @returns {{w, h, px, py, color: Int32Array, glow: Uint8Array, normal: Float32Array, shadow: Uint8Array}}
 */
export function bakeFrame(dir, anim, k, type = 'schlurfer', f = 1) {
  const kind = KINDS[type];
  const ctx = frameShapes(type, dir, anim, k, f);
  const raster = trace(ctx.shapes, cellOf(type, f));
  const out = paint(raster, kind.materials);
  for (const s of ctx.stamps) stampAt(out, raster, s.stamp, s.at, s.opts);
  const shadow = kind.shadow === false ? new Uint8Array(raster.w * raster.h) : shadowOf(raster, out.color, kind.shadowSize || SHADOW, kind.size * f);
  return { w: raster.w, h: raster.h, px: raster.px, py: raster.py, color: out.color, glow: out.glow, normal: raster.normal, shadow };
}

/**
 * Schatten als Ellipse auf dem Boden um den Fußpunkt – nur, wo die Figur nicht selbst steht.
 * Im Bild ist sie so hoch, wie der Boden in der Neigung der Kamera erscheint (0,6).
 */
function shadowOf(raster, color, size, k) {
  const { w, h, px, py } = raster;
  const shadow = new Uint8Array(w * h);
  const ax = (size.x * k) / TEXEL;
  const ay = (0.6 * size.z * k) / TEXEL;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dx = (i + 0.5 - px) / ax;
      const dy = (j + 0.5 - py) / ay;
      if (dx * dx + dy * dy <= 1 && color[j * w + i] < 0) shadow[j * w + i] = 1;
    }
  }
  return shadow;
}
