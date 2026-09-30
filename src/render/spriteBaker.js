// Sprite-Bäcker (F1, recherche/schlurfer-sprites.md 6): »Formen in 3D, Zeichnen in 2D«.
// Eine Figur besteht aus runden Grundformen an einem Gerüst (Kapseln, Ellipsoide). Je Texel
// geht ein Strahl in Blickrichtung der Kamera (0, −0,6, −0,8) und tastet das Abstandsfeld ab;
// so stimmen Neigung und Richtung von selbst. Danach kommen Pixelregeln: drei Töne je Material
// aus den Rampen der Palette, eine dunkle Kontur, Linien an Tiefensprüngen, handgezeichnete
// Stempel (Augen, Mund, Blume). Kein three.js, kein Canvas – reine Daten (auch in Node).
//
// Ein Texel ist im Bild 2 × 2 Pixel groß: 1/40 m breit, 1/40 m hoch in der Bildebene (bei einer
// aufrechten Fläche 1/32 m Höhe). Das Ergebnis: Farbe (Palettenwert oder −1), Weltnormale je
// Texel und eine Glühmaske.

export const TEXEL = 1 / 40; // Meter in der Bildebene je Texel

// Blickrichtung und Bildachsen der Kamera (Neigung 3-4-5, Gier 0)
const F = [0, -0.6, -0.8];
const U = [0, 0.8, -0.6];

// --- Abstandsfelder ------------------------------------------------------------------------

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function len(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

/** Kapsel von a nach b mit Radius r (r1 am Ende b, sonst gleich – dann ein Kegelstumpf). */
function sdCapsule(p, a, b, r, r1 = r) {
  const pa = sub(p, a);
  const ba = sub(b, a);
  const h = Math.max(0, Math.min(1, dot(pa, ba) / Math.max(1e-9, dot(ba, ba))));
  const d = [pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h];
  return len(d) - (r + (r1 - r) * h);
}

/** Ellipsoid um c mit Halbachsen r (Näherung nach Quilez). */
function sdEllipsoid(p, c, r) {
  const q = [(p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]];
  const k0 = len(q);
  const k1 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(r[0], r[1], r[2]);
}

/** Weiche Vereinigung (Polynom, Breite k). */
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/**
 * Eine Figur ist eine Liste von Formen { kind: 'capsule'|'ellipsoid', a, b, r, r1 | c, rr, mat,
 * blend } in Weltkoordinaten (Meter, Fußpunkt im Ursprung); `blend` > 0 verschmilzt weich mit
 * dem Rest. Abgetastet wird immer nur über eine Kandidatenliste: die Formen, die dem Strahl
 * überhaupt nahe kommen (die übrigen ändern den Abstand dort nicht).
 */
function shapeDistance(s, p) {
  return s.kind === 'capsule' ? sdCapsule(p, s.a, s.b, s.r, s.r1 ?? s.r) : sdEllipsoid(p, s.c, s.rr);
}

function distanceOf(shapes, list, p) {
  let d = Infinity;
  for (let n = 0; n < list.length; n++) {
    const s = shapes[list[n]];
    const di = shapeDistance(s, p);
    d = s.blend ? smin(d, di, s.blend) : Math.min(d, di);
  }
  return d;
}

/** Die nächste Form (für Material und Tiefenlinien). */
function nearestOf(shapes, list, p) {
  let best = Infinity;
  let part = -1;
  for (let n = 0; n < list.length; n++) {
    const di = shapeDistance(shapes[list[n]], p);
    if (di < best) {
      best = di;
      part = list[n];
    }
  }
  return part;
}

function normalOf(shapes, list, p) {
  const e = 0.004;
  const nx = distanceOf(shapes, list, [p[0] + e, p[1], p[2]]) - distanceOf(shapes, list, [p[0] - e, p[1], p[2]]);
  const ny = distanceOf(shapes, list, [p[0], p[1] + e, p[2]]) - distanceOf(shapes, list, [p[0], p[1] - e, p[2]]);
  const nz = distanceOf(shapes, list, [p[0], p[1], p[2] + e]) - distanceOf(shapes, list, [p[0], p[1], p[2] - e]);
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/** Bildlage eines Weltpunkts in Texeln (x nach rechts, y nach unten), Fußpunkt bei (px, py). */
export function toTexel(p, px, py) {
  return { x: px + p[0] / TEXEL, y: py - dot(p, U) / TEXEL };
}

// --- Rastern ---------------------------------------------------------------------------------

/**
 * Formen → Texelfeld. Je Texel ein Strahl (Sphere Tracing); getroffen wird die vorderste Form.
 * Jeder Strahl prüft nur die Formen, deren Bildrechteck (samt Rand fürs weiche Verschmelzen)
 * sein Texel enthält, und nur ihren Tiefenbereich – so bleibt ein Bild bei wenigen Millisekunden.
 * @param {Array} shapes Formen in Welt-Metern (Fußpunkt im Ursprung)
 * @param {{w:number, h:number, px:number, py:number}} cell Zelle und Fußpunkt (Texel)
 * @returns {{w, h, px, py, hit: Int16Array, depth: Float32Array, normal: Float32Array, mat: Array, pos: Float32Array}}
 */
export function trace(shapes, cell) {
  const { w, h, px, py } = cell;
  const hit = new Int16Array(w * h).fill(-1);
  const depth = new Float32Array(w * h).fill(Infinity);
  const normal = new Float32Array(w * h * 3);
  const mat = new Array(w * h).fill(null);
  const pos = new Float32Array(w * h * 3);
  // Bildrechteck und Tiefenbereich jeder Form
  const rects = shapes.map((s) => {
    const pts = s.kind === 'capsule' ? [s.a, s.b] : [s.c];
    const r = (s.kind === 'capsule' ? Math.max(s.r, s.r1 ?? s.r) : Math.max(...s.rr)) + (s.blend || 0) + 0.01;
    const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, t0: Infinity, t1: -Infinity };
    for (const q of pts) {
      const t = toTexel(q, px, py);
      const m = r / TEXEL + 1;
      box.x0 = Math.min(box.x0, Math.floor(t.x - m));
      box.x1 = Math.max(box.x1, Math.ceil(t.x + m));
      box.y0 = Math.min(box.y0, Math.floor(t.y - m));
      box.y1 = Math.max(box.y1, Math.ceil(t.y + m));
      const tq = dot(q, F);
      box.t0 = Math.min(box.t0, tq - r);
      box.t1 = Math.max(box.t1, tq + r);
    }
    return box;
  });
  const list = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      list.length = 0;
      let tMin = Infinity;
      let tMax = -Infinity;
      for (let n = 0; n < shapes.length; n++) {
        const r = rects[n];
        if (i < r.x0 || i > r.x1 || j < r.y0 || j > r.y1) continue;
        list.push(n);
        tMin = Math.min(tMin, r.t0);
        tMax = Math.max(tMax, r.t1);
      }
      if (!list.length) continue;
      const u = (i + 0.5 - px) * TEXEL;
      const v = (py - j - 0.5) * TEXEL;
      // Vom vordersten Rand der Kandidaten aus in Blickrichtung
      let t = tMin - 0.02;
      let found = false;
      let p = null;
      for (let k = 0; k < 48 && t < tMax + 0.02; k++) {
        p = [u + t * F[0], v * U[1] + t * F[1], v * U[2] + t * F[2]];
        const d = distanceOf(shapes, list, p);
        if (d < 0.002) {
          found = true;
          break;
        }
        t += Math.max(d, 0.003);
      }
      if (!found) continue;
      const idx = j * w + i;
      const part = nearestOf(shapes, list, p);
      hit[idx] = part;
      mat[idx] = shapes[part].mat;
      depth[idx] = t;
      const n = normalOf(shapes, list, p);
      normal[idx * 3] = n[0];
      normal[idx * 3 + 1] = n[1];
      normal[idx * 3 + 2] = n[2];
      pos[idx * 3] = p[0];
      pos[idx * 3 + 1] = p[1];
      pos[idx * 3 + 2] = p[2];
    }
  }
  return { w, h, px, py, hit, depth, normal, mat, pos };
}

// --- Pixelregeln -----------------------------------------------------------------------------

const LIGHT = (() => {
  const l = [-0.45, 0.75, 0.5];
  const n = Math.hypot(...l);
  return [l[0] / n, l[1] / n, l[2] / n];
})();

/**
 * Farben: Jedes Material ist eine Rampe (Palettenwerte, dunkel → hell) mit einem Grundton; die
 * Normale wählt Schatten, Grundton oder Licht. Muster (Karo, Flicken) über `pattern(pos, n)`.
 * Danach Kontur, Linien an Tiefensprüngen und Einzelpixel aufräumen.
 * @param {object} raster aus trace()
 * @param {Record<string, {ramp:number[], base:number, pattern?:Function, glow?:boolean}>} materials
 * @returns {{color: Int32Array, glow: Uint8Array}}
 */
export function paint(raster, materials, { outline = true } = {}) {
  const { w, h, mat, normal, depth, pos, hit } = raster;
  const color = new Int32Array(w * h).fill(-1);
  const tone = new Int8Array(w * h).fill(-1);
  const glow = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const m = mat[i] && materials[mat[i]];
    if (!m) continue;
    const n = [normal[i * 3], normal[i * 3 + 1], normal[i * 3 + 2]];
    const lit = dot(n, LIGHT);
    let step = lit > 0.55 ? 1 : lit > -0.05 ? 0 : -1;
    if (n[1] < -0.6) step = -1; // Unterseiten immer im Schatten
    if (m.pattern) step += m.pattern([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], n) || 0;
    const k = Math.max(0, Math.min(m.ramp.length - 1, m.base + step));
    color[i] = m.ramp[k];
    tone[i] = k;
    if (m.glow) glow[i] = 1;
  }
  // Linien, wo die Tiefe zwischen zwei Teilen springt: das ferne Texel eine Stufe dunkler
  const dark = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      if (color[idx] < 0) continue;
      const d = depth[idx];
      const near = (q) => color[q] >= 0 && hit[q] !== hit[idx] && depth[q] < d - 0.09;
      if ((i > 0 && near(idx - 1)) || (i < w - 1 && near(idx + 1)) || (j > 0 && near(idx - w)) || (j < h - 1 && near(idx + w))) dark.push(idx);
    }
  }
  for (const idx of dark) {
    const m = materials[mat[idx]];
    if (!m || m.glow) continue;
    color[idx] = m.ramp[Math.max(0, tone[idx] - 2)];
  }
  if (!outline) return { color, glow };
  // Kontur außen: dunkelster Ton des Nachbarmaterials (farbige Kontur, »Sel-out«)
  const edge = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      if (color[idx] >= 0) continue;
      let src = -1;
      for (const q of [idx - 1, idx + 1, idx - w, idx + w]) {
        if (q < 0 || q >= w * h) continue;
        if ((q === idx - 1 && i === 0) || (q === idx + 1 && i === w - 1)) continue;
        if (color[q] >= 0) {
          src = q;
          break;
        }
      }
      if (src >= 0) edge.push([idx, src]);
    }
  }
  for (const [idx, src] of edge) {
    const m = materials[mat[src]];
    color[idx] = m && m.outline !== undefined ? m.outline : m ? m.ramp[0] : 0x0d0b18;
  }
  return { color, glow };
}

/**
 * Stempel: kleine Pixelbilder als Zeichenketten, deren Mitte auf einen Weltpunkt gesetzt wird
 * (nur, wo die Figur dort sichtbar ist und der Punkt nicht verdeckt).
 * @param {{rows:string[], legend:Record<string, number|{glow:number}>}} stamp
 */
export function stampAt(out, raster, stamp, point, { flip = false, need = true } = {}) {
  const { w, h, px, py } = raster;
  const t = toTexel(point, px, py);
  const cx = Math.floor(t.x);
  const cy = Math.floor(t.y);
  const rows = stamp.rows;
  const sw = rows[0].length;
  const sh = rows.length;
  const ox = cx - Math.floor(sw / 2);
  const oy = cy - Math.floor(sh / 2);
  for (let r = 0; r < sh; r++) {
    for (let c = 0; c < sw; c++) {
      const ch = rows[r][flip ? sw - 1 - c : c];
      if (ch === '.' || ch === ' ') continue;
      const x = ox + c;
      const y = oy + r;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const idx = y * w + x;
      if (need && out.color[idx] < 0) continue;
      const v = stamp.legend[ch];
      if (typeof v === 'object') {
        out.color[idx] = v.glow;
        out.glow[idx] = 1;
      } else out.color[idx] = v;
    }
  }
}
