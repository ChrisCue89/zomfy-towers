// Sprite-Bäcker (F1, recherche/schlurfer-sprites.md 6; F-Design): »Formen in 3D, Zeichnen in 2D«.
// Eine Figur besteht aus runden Grundformen an einem Gerüst (Kapseln, Ellipsoide, gerundete
// Quader – die beiden letzten mit eigenen Achsen, damit sie sich mit der Figur drehen). Je Texel
// geht ein Strahl in Blickrichtung der Kamera (0, −0,6, −0,8) und tastet das Abstandsfeld ab;
// so stimmen Neigung und Richtung von selbst. Danach kommen Pixelregeln: vier Töne je Material aus
// den Rampen der Palette und ein Glanzpunkt auf Kuppen, Kantenlicht auf der Lichtseite, Linien an
// Tiefensprüngen und Materialgrenzen, eine farbige Kontur (auf der Lichtseite heller), Aufräumen
// einzelner Texel und handgezeichnete Stempel. Kein three.js, kein Canvas – reine Daten (auch in
// Node, siehe tools/schlurfer-bogen.mjs).
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

/** Lage eines Punkts im eigenen Rahmen einer Form (Achsen `ax` in Weltkoordinaten, sonst die Weltachsen). */
function local(p, s) {
  const d = sub(p, s.c);
  if (!s.ax) return d;
  return [dot(d, s.ax[0]), dot(d, s.ax[1]), dot(d, s.ax[2])];
}

/** Ellipsoid um c mit Halbachsen rr (Näherung nach Quilez), gedreht mit `ax`. */
function sdEllipsoid(p, s) {
  const l = local(p, s);
  const r = s.rr;
  const q = [l[0] / r[0], l[1] / r[1], l[2] / r[2]];
  const k0 = len(q);
  const k1 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(r[0], r[1], r[2]);
}

/** Gerundeter Quader um c, halbe Kanten h, Rundung r, gedreht mit `ax`. */
function sdBox(p, s) {
  const l = local(p, s);
  const qx = Math.abs(l[0]) - s.h[0] + s.r;
  const qy = Math.abs(l[1]) - s.h[1] + s.r;
  const qz = Math.abs(l[2]) - s.h[2] + s.r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - s.r;
}

/** Weiche Vereinigung (Polynom, Breite k). */
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/**
 * Eine Figur ist eine Liste von Formen in Weltkoordinaten (Meter, Fußpunkt im Ursprung):
 *   { kind: 'capsule', a, b, r, r1 }  { kind: 'ellipsoid', c, rr, ax }  { kind: 'box', c, h, r, ax }
 * dazu `mat` (Material), `blend` > 0 (verschmilzt weich mit dem Rest) und `cut` (schneidet sich
 * aus allem Vorigen heraus – Augenhöhlen, Risse). Abgetastet wird immer nur über eine
 * Kandidatenliste: die Formen, die dem Strahl überhaupt nahe kommen.
 */
function shapeDistance(s, p) {
  if (s.kind === 'capsule') return sdCapsule(p, s.a, s.b, s.r, s.r1 ?? s.r);
  if (s.kind === 'box') return sdBox(p, s);
  return sdEllipsoid(p, s);
}

function distanceOf(shapes, list, p) {
  let d = Infinity;
  for (let n = 0; n < list.length; n++) {
    const s = shapes[list[n]];
    const di = shapeDistance(s, p);
    if (s.cut) d = Math.max(d, -di);
    else d = s.blend ? smin(d, di, s.blend) : Math.min(d, di);
  }
  // Unter dem Boden ist Erde: Was darunter liegt, sieht man nicht (beim Zusammensacken versinkt
  // die Figur darin)
  return Math.max(d, -p[1]);
}

/** Die nächste (sichtbare) Form – für Material und Tiefenlinien; Schnitte färben ihre Wand. */
function nearestOf(shapes, list, p) {
  let best = Infinity;
  let part = -1;
  for (let n = 0; n < list.length; n++) {
    const s = shapes[list[n]];
    const di = s.cut ? Math.abs(shapeDistance(s, p)) : shapeDistance(s, p);
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

/** Wie weit eine Form um ihren Mittelpunkt reicht (für das Bildrechteck). */
function reachOf(s) {
  if (s.kind === 'capsule') return Math.max(s.r, s.r1 ?? s.r);
  if (s.kind === 'box') return Math.hypot(s.h[0], s.h[1], s.h[2]);
  return Math.max(...s.rr);
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
  // Bildrechteck und Tiefenbereich jeder Form (Schnitte rechnen nur dort mit, wo sie liegen)
  const rects = shapes.map((s) => {
    const pts = s.kind === 'capsule' ? [s.a, s.b] : [s.c];
    const r = reachOf(s) + (s.blend || 0) + 0.01;
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
        if (shapes[n].cut) continue;
        tMin = Math.min(tMin, r.t0);
        tMax = Math.max(tMax, r.t1);
      }
      if (!list.length || tMin === Infinity) continue;
      const u = (i + 0.5 - px) * TEXEL;
      const v = (py - j - 0.5) * TEXEL;
      // Vom vordersten Rand der Kandidaten aus in Blickrichtung
      let t = tMin - 0.02;
      let found = false;
      let p = null;
      for (let k = 0; k < 64 && t < tMax + 0.02; k++) {
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
      const s = shapes[part];
      hit[idx] = part;
      // `matAt(l)` malt Bereiche einer Form in einem anderen Material (Haar auf dem Kopf, ein
      // Flicken auf dem Knie) – l ist der Punkt im eigenen Rahmen der Form (bei Kapseln ab a), p in der Welt
      mat[idx] = s.cut ? s.wall || s.mat : (s.matAt && s.matAt(s.kind === 'capsule' ? sub(p, s.a) : local(p, s), p)) || s.mat;
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

/** Licht von oben links vorn – wie die Sonne im Spiel am Vormittag, weich genug für alle Richtungen. */
const LIGHT = (() => {
  const l = [-0.45, 0.75, 0.5];
  const n = Math.hypot(...l);
  return [l[0] / n, l[1] / n, l[2] / n];
})();

/** Schwellen der Töne: tiefer Schatten | Schatten | Grund | Licht (Glanz nur mit `shine`). */
const TONES = { deep: -0.35, shade: 0.05, light: 0.62, shine: 0.93 };

/**
 * Farben: Jedes Material ist eine Rampe (Palettenwerte, dunkel → hell) mit einem Grundton; die
 * Normale wählt tiefen Schatten, Schatten, Grundton oder Licht, `shine` setzt auf den hellsten
 * Kuppen einen Glanz. Muster (Karo, Flicken) über `pattern(pos, n)`. Danach Linien an
 * Tiefensprüngen und – mit `seam` – an Materialgrenzen, Kantenlicht auf der Lichtseite,
 * Aufräumen einzelner Texel und die farbige Kontur (Sel-out: oben links heller).
 * @param {object} raster aus trace()
 * @param {Record<string, {ramp:number[], base:number, pattern?:Function, glow?:boolean, shine?:boolean, seam?:boolean, flat?:boolean, outline?:number}>} materials
 * @returns {{color: Int32Array, glow: Uint8Array, tone: Int8Array}}
 */
export function paint(raster, materials, { outline = true, rim = true } = {}) {
  const { w, h, mat, normal, depth, pos, hit } = raster;
  const color = new Int32Array(w * h).fill(-1);
  const tone = new Int8Array(w * h).fill(-1);
  const glow = new Uint8Array(w * h);
  const toneOf = (m, k) => m.ramp[Math.max(0, Math.min(m.ramp.length - 1, k))];
  for (let i = 0; i < w * h; i++) {
    const m = mat[i] && materials[mat[i]];
    if (!m) continue;
    const n = [normal[i * 3], normal[i * 3 + 1], normal[i * 3 + 2]];
    const lit = dot(n, LIGHT);
    let step = m.flat ? 0 : lit > TONES.light ? 1 : lit > TONES.shade ? 0 : lit > TONES.deep ? -1 : -2;
    if (!m.flat && n[1] < -0.55) step = Math.min(step, -1); // Unterseiten immer im Schatten
    if (m.shine && lit > TONES.shine) step = 2;
    if (m.pattern) step += m.pattern([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], n) || 0;
    const k = Math.max(0, Math.min(m.ramp.length - 1, m.base + step));
    color[i] = m.ramp[k];
    tone[i] = k;
    if (m.glow) glow[i] = 1;
  }
  const inside = (i, j) => i >= 0 && j >= 0 && i < w && j < h;
  // Linien: wo die Tiefe zwischen zwei Teilen springt (das ferne Texel zwei Stufen dunkler) und –
  // bei Materialien mit `seam` – wo ein anderes Material beginnt (eine Stufe, nur auf der Seite,
  // die weiter hinten liegt)
  const dark = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      if (color[idx] < 0) continue;
      const d = depth[idx];
      let steps = 0;
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (!inside(i + di, j + dj)) continue;
        const q = (j + dj) * w + i + di;
        if (color[q] < 0) continue;
        if (hit[q] !== hit[idx] && depth[q] < d - 0.09) steps = Math.max(steps, 2);
        else if (mat[q] !== mat[idx] && materials[mat[idx]]?.seam && depth[q] < d + 0.004) steps = Math.max(steps, 1);
      }
      if (steps) dark.push([idx, steps]);
    }
  }
  for (const [idx, steps] of dark) {
    const m = materials[mat[idx]];
    if (!m || m.glow || m.flat) continue;
    tone[idx] = Math.max(0, tone[idx] - steps);
    color[idx] = m.ramp[tone[idx]];
  }
  // Kantenlicht: Texel am Rand der Figur, deren Nachbar oben links leer ist, eine Stufe heller
  if (rim) {
    const lift = [];
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const idx = j * w + i;
        if (color[idx] < 0) continue;
        const m = materials[mat[idx]];
        if (!m || m.flat || m.glow) continue;
        const emptyAt = (di, dj) => !inside(i + di, j + dj) || color[(j + dj) * w + i + di] < 0;
        if ((emptyAt(-1, 0) || emptyAt(0, -1)) && !emptyAt(1, 0) && !emptyAt(0, 1) && normal[idx * 3 + 1] > -0.3) lift.push(idx);
      }
    }
    for (const idx of lift) {
      const m = materials[mat[idx]];
      tone[idx] = Math.min(m.ramp.length - 1, tone[idx] + 1);
      color[idx] = m.ramp[tone[idx]];
    }
  }
  // Aufräumen: ein einzelnes Texel, dessen vier Nachbarn alle denselben anderen Ton desselben
  // Materials haben, nimmt diesen Ton an (sonst wird es Gries)
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      const idx = j * w + i;
      if (color[idx] < 0 || glow[idx]) continue;
      const nb = [idx - 1, idx + 1, idx - w, idx + w];
      if (nb.some((q) => mat[q] !== mat[idx] || color[q] < 0)) continue;
      const t0 = tone[nb[0]];
      if (t0 !== tone[idx] && nb.every((q) => tone[q] === t0)) {
        tone[idx] = t0;
        color[idx] = color[nb[0]];
      }
    }
  }
  if (!outline) return { color, glow, tone };
  // Kontur außen: dunkelster Ton des Nachbarmaterials, oben links (zum Licht) eine Stufe heller
  const edge = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      if (color[idx] >= 0) continue;
      let src = -1;
      let lightSide = false;
      for (const [di, dj] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        if (!inside(i + di, j + dj)) continue;
        const q = (j + dj) * w + i + di;
        if (color[q] >= 0) {
          src = q;
          lightSide = di > 0 || dj > 0; // die Figur liegt rechts bzw. unter dem Konturtexel
          break;
        }
      }
      if (src >= 0) edge.push([idx, src, lightSide]);
    }
  }
  for (const [idx, src, lightSide] of edge) {
    const m = materials[mat[src]];
    if (!m) color[idx] = 0x0d0b18;
    else if (m.outline !== undefined) color[idx] = m.outline;
    else color[idx] = toneOf(m, lightSide && pos[src * 3 + 1] > 0.3 ? 1 : 0);
  }
  return { color, glow, tone };
}

/**
 * Stempel: kleine Pixelbilder als Zeichenketten, deren Mitte auf einen Weltpunkt gesetzt wird
 * (nur, wo die Figur dort sichtbar ist und der Punkt nicht verdeckt: Liegt dort eine Fläche
 * mehr als `depth` Meter vor dem Punkt, bleibt das Texel, wie es ist). `mark` (F4) merkt sich je
 * Texel, ob der Stempel es gesetzt hat; `parts` (F4, Menge von Formen) setzt nur, wo eine dieser
 * Formen vorn liegt – statt der Tiefe (ein Gesicht auf einem halb gedrehten Kopf).
 * @param {{rows:string[], legend:Record<string, number|{glow:number}>}} stamp
 */
export function stampAt(out, raster, stamp, point, { flip = false, need = true, depth = 0.06, mark = null, parts = null } = {}) {
  const { w, h, px, py } = raster;
  const t = toTexel(point, px, py);
  const tq = dot(point, F);
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
      if (parts) {
        if (!parts.has(raster.hit[idx])) continue; // F4: nur auf diesen Formen (ein Gesicht nur auf dem Kopf)
      } else if (raster.depth[idx] < tq - depth) continue; // verdeckt
      const v = stamp.legend[ch];
      if (mark) mark[idx] = 1; // F4: welche Texel ein Gesicht berührt (für die Flicken je Ausdruck)
      if (typeof v === 'object') {
        out.color[idx] = v.glow;
        out.glow[idx] = 1;
      } else out.color[idx] = v;
    }
  }
}

/**
 * Achsen einer Form in Weltkoordinaten: die Figur blickt um `yaw` gedreht (0: nach Süden, zur
 * Kamera), dazu geneigt um `pitch` (vornüber) und `roll` (zur Seite). Für `ax` an Ellipsoiden
 * und Quadern.
 */
export function axesOf(yaw, pitch = 0, roll = 0) {
  // Figurachsen nach Kippen (um z) und Neigung (um x, vornüber): x rechts, y oben, z vorn
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  let x = [cr, sr * cp, sr * sp];
  let y = [-sr, cr * cp, cr * sp];
  let z = [0, -sp, cp];
  // um die Hochachse drehen (wie toWorld in zombieSprites.js)
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const turn = (v) => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  x = turn(x);
  y = turn(y);
  z = turn(z);
  return [x, y, z];
}
