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

/**
 * Kapsel von a nach b mit Radius r (r1 am Ende b, sonst gleich – dann ein Kegelstumpf). F6e: ohne
 * Zwischen-Arrays (das Aufräumen des Speichers kostete ein Zehntel der Backzeit) und in genau der
 * Reihenfolge der Rechnung wie vorher – die Bilder bleiben bitgleich.
 */
function sdCapsule(p, a, b, r, r1 = r) {
  const pax = p[0] - a[0];
  const pay = p[1] - a[1];
  const paz = p[2] - a[2];
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / Math.max(1e-9, bax * bax + bay * bay + baz * baz)));
  return Math.sqrt((pax - bax * h) ** 2 + (pay - bay * h) ** 2 + (paz - baz * h) ** 2) - (r + (r1 - r) * h);
}

/** Lage eines Punkts im eigenen Rahmen einer Form (Achsen `ax` in Weltkoordinaten, sonst die Weltachsen). */
function local(p, s) {
  const d = sub(p, s.c);
  if (!s.ax) return d;
  return [dot(d, s.ax[0]), dot(d, s.ax[1]), dot(d, s.ax[2])];
}

// Lage im eigenen Rahmen für die Abstandsfelder, ohne neues Array (dieselbe Rechnung wie local)
const LOC = [0, 0, 0];
function localTo(p, s) {
  const dx = p[0] - s.c[0];
  const dy = p[1] - s.c[1];
  const dz = p[2] - s.c[2];
  const A = s.ax;
  if (!A) {
    LOC[0] = dx;
    LOC[1] = dy;
    LOC[2] = dz;
  } else {
    LOC[0] = dx * A[0][0] + dy * A[0][1] + dz * A[0][2];
    LOC[1] = dx * A[1][0] + dy * A[1][1] + dz * A[1][2];
    LOC[2] = dx * A[2][0] + dy * A[2][1] + dz * A[2][2];
  }
  return LOC;
}

/** Ellipsoid um c mit Halbachsen rr (Näherung nach Quilez), gedreht mit `ax`. */
function sdEllipsoid(p, s) {
  const l = localTo(p, s);
  const r = s.rr;
  const q0 = l[0] / r[0];
  const q1 = l[1] / r[1];
  const q2 = l[2] / r[2];
  const k0 = Math.sqrt(q0 * q0 + q1 * q1 + q2 * q2);
  const k1 = Math.sqrt((q0 / r[0]) ** 2 + (q1 / r[1]) ** 2 + (q2 / r[2]) ** 2);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(r[0], r[1], r[2]);
}

/**
 * Gerundeter Quader um c, halbe Kanten h, Rundung r, gedreht mit `ax`. F5: `taper` macht ihn nach
 * unten (−y) schmaler – am unteren Rand um den Faktor 1 + taper (ein Kopf mit runderem Kinn); der
 * Abstand wird dann vorsichtig geteilt, damit kein Strahl durch die Form springt.
 */
function sdBox(p, s) {
  const l = localTo(p, s);
  const k = s.taper ? 1 + s.taper * Math.min(1, Math.max(0, -l[1] / s.h[1])) : 1;
  const qx = Math.abs(l[0]) * k - s.h[0] + s.r;
  const qy = Math.abs(l[1]) - s.h[1] + s.r;
  const qz = Math.abs(l[2]) - s.h[2] + s.r;
  const mx = Math.max(qx, 0);
  const my = Math.max(qy, 0);
  const mz = Math.max(qz, 0);
  const d = Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - s.r;
  return s.taper ? d / (1 + s.taper) : d;
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

const PROBE = [0, 0, 0];
const RAY = [0, 0, 0];
function probe(shapes, list, x, y, z) {
  PROBE[0] = x;
  PROBE[1] = y;
  PROBE[2] = z;
  return distanceOf(shapes, list, PROBE);
}
function normalOf(shapes, list, p) {
  const e = 0.004;
  const nx = probe(shapes, list, p[0] + e, p[1], p[2]) - probe(shapes, list, p[0] - e, p[1], p[2]);
  const ny = probe(shapes, list, p[0], p[1] + e, p[2]) - probe(shapes, list, p[0], p[1] - e, p[2]);
  const nz = probe(shapes, list, p[0], p[1], p[2] + e) - probe(shapes, list, p[0], p[1], p[2] - e);
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/**
 * F6c (nur Menschen): Relief auf einer Form. `bump(l, p)` gibt eine kleine Neigung der Normale –
 * im eigenen Rahmen der Form (bei Kapseln in der Welt, l ist dann der Abstand zu a). Falten, Rippen
 * und Strähnen fangen so Licht und Schatten, ohne dass sich die Form selbst ändert.
 */
function bend(n, s, p) {
  const capsule = s.kind === 'capsule';
  const v = s.bump(capsule ? sub(p, s.a) : local(p, s), p);
  if (!v) return n;
  const ax = capsule ? null : s.ax;
  const m = ax
    ? [n[0] + v[0] * ax[0][0] + v[1] * ax[1][0] + v[2] * ax[2][0], n[1] + v[0] * ax[0][1] + v[1] * ax[1][1] + v[2] * ax[2][1], n[2] + v[0] * ax[0][2] + v[1] * ax[1][2] + v[2] * ax[2][2]]
    : [n[0] + v[0], n[1] + v[1], n[2] + v[2]];
  const l = Math.hypot(m[0], m[1], m[2]) || 1;
  return [m[0] / l, m[1] / l, m[2] / l];
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
 * F6e (nur Menschen, `cull`): dazu fallen die Formen weg, deren Kugel (samt doppeltem Rand fürs
 * Verschmelzen) der Strahl gar nicht berührt – die Fläche bleibt dieselbe, nur die Schritte durch
 * den leeren Raum ändern sich, und ein Bild ist mehr als doppelt so schnell.
 * @param {Array} shapes Formen in Welt-Metern (Fußpunkt im Ursprung)
 * @param {{w:number, h:number, px:number, py:number}} cell Zelle und Fußpunkt (Texel)
 * @param {{cull?: boolean}} [opts]
 * @returns {{w, h, px, py, hit: Int16Array, depth: Float32Array, normal: Float32Array, mat: Array, pos: Float32Array}}
 */
export function trace(shapes, cell, { cull = false } = {}) {
  const { w, h, px, py } = cell;
  const hit = new Int16Array(w * h).fill(-1);
  const depth = new Float32Array(w * h).fill(Infinity);
  const normal = new Float32Array(w * h * 3);
  // F6c: Mit Relief merkt sich das Bild auch die Normale der glatten Form (fürs geglättete Licht)
  const flat = shapes.some((s) => s.bump) ? new Float32Array(w * h * 3) : null;
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
  const balls = cull ? shapes.map((s) => { const b = sphereOf(s); return { c: b.c, r: b.r + (s.blend || 0) + 0.012 }; }) : null;
  const list = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      list.length = 0;
      let tMin = Infinity;
      let tMax = -Infinity;
      const ou = (i + 0.5 - px) * TEXEL;
      const ov = (py - j - 0.5) * TEXEL;
      for (let n = 0; n < shapes.length; n++) {
        const r = rects[n];
        if (i < r.x0 || i > r.x1 || j < r.y0 || j > r.y1) continue;
        if (balls) {
          // Abstand der Kugelmitte vom Strahl (Ursprung in der Bildebene, Richtung F)
          const b = balls[n];
          const dx = b.c[0] - ou;
          const dy = b.c[1] - ov * U[1];
          const dz = b.c[2] - ov * U[2];
          const along = dx * F[0] + dy * F[1] + dz * F[2];
          const ex = dx - along * F[0];
          const ey = dy - along * F[1];
          const ez = dz - along * F[2];
          if (ex * ex + ey * ey + ez * ez > b.r * b.r) continue;
        }
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
      for (let k = 0; k < 64 && t < tMax + 0.02; k++) {
        RAY[0] = u + t * F[0];
        RAY[1] = v * U[1] + t * F[1];
        RAY[2] = v * U[2] + t * F[2];
        const d = distanceOf(shapes, list, RAY);
        if (d < 0.002) {
          found = true;
          break;
        }
        t += Math.max(d, 0.003);
      }
      if (!found) continue;
      const p = [RAY[0], RAY[1], RAY[2]];
      const idx = j * w + i;
      const part = nearestOf(shapes, list, p);
      const s = shapes[part];
      hit[idx] = part;
      // `matAt(l)` malt Bereiche einer Form in einem anderen Material (Haar auf dem Kopf, ein
      // Flicken auf dem Knie) – l ist der Punkt im eigenen Rahmen der Form (bei Kapseln ab a), p in der Welt
      mat[idx] = s.cut ? s.wall || s.mat : (s.matAt && s.matAt(s.kind === 'capsule' ? sub(p, s.a) : local(p, s), p)) || s.mat;
      depth[idx] = t;
      const n0 = normalOf(shapes, list, p);
      const n = s.bump ? bend(n0, s, p) : n0;
      normal[idx * 3] = n[0];
      normal[idx * 3 + 1] = n[1];
      normal[idx * 3 + 2] = n[2];
      if (flat) {
        flat[idx * 3] = n0[0];
        flat[idx * 3 + 1] = n0[1];
        flat[idx * 3 + 2] = n0[2];
      }
      pos[idx * 3] = p[0];
      pos[idx * 3 + 1] = p[1];
      pos[idx * 3 + 2] = p[2];
    }
  }
  return { w, h, px, py, hit, depth, normal, flat, mat, pos };
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
 * F5 (nur Menschen): `groups` nennt je Form eine Gruppe (Arm, Bein, Körper); wo eine Form einer
 * anderen Gruppe um mehr als `occlude` Meter davor liegt, wird das hintere Texel eine Stufe dunkler
 * (der Arm wirft einen Schatten auf die Jacke). `tidy` räumt die Töne vor den Linien nach der
 * Mehrheit der acht Nachbarn auf (Stoffe ohne Muster). Ein Stoff mit `outlineLit` hat zur Lichtseite
 * eine eigene Kontur.
 * @param {object} raster aus trace()
 * @param {Record<string, {ramp:number[], base:number, pattern?:Function, glow?:boolean, shine?:boolean, seam?:boolean, flat?:boolean, outline?:number, outlineLit?:number}>} materials
 * @returns {{color: Int32Array, glow: Uint8Array, tone: Int8Array}}
 */
export function paint(raster, materials, { outline = true, rim = true, groups = null, occlude = 0, tidy = false, light = null, backlight = false, tones = TONES } = {}) {
  const { w, h, mat, normal, depth, pos, hit } = raster;
  const color = new Int32Array(w * h).fill(-1);
  const tone = new Int8Array(w * h).fill(-1);
  const glow = new Uint8Array(w * h);
  const toneOf = (m, k) => m.ramp[Math.max(0, Math.min(m.ramp.length - 1, k))];
  for (let i = 0; i < w * h; i++) {
    const m = mat[i] && materials[mat[i]];
    if (!m) continue;
    const n = [normal[i * 3], normal[i * 3 + 1], normal[i * 3 + 2]];
    const lit = light ? light[i] : dot(n, LIGHT); // F6b: Lichtwert aus lightField (Schatten, Verdeckung)
    let step = m.flat ? 0 : lit > tones.light ? 1 : lit > tones.shade ? 0 : lit > tones.deep ? -1 : -2;
    if (!m.flat && n[1] < -0.55) step = Math.min(step, -1); // Unterseiten immer im Schatten
    if (m.shine && lit > tones.shine) step = 2;
    if (light?.gloss && m.gloss !== undefined && light.gloss[i] > m.gloss) step = 2; // F6b: Glanz (Haar, Leder, Metall)
    if (m.pattern) step += m.pattern([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], n) || 0;
    const k = Math.max(0, Math.min(m.ramp.length - 1, m.base + step));
    color[i] = m.ramp[k];
    tone[i] = k;
    if (m.glow) glow[i] = 1;
  }
  const inside = (i, j) => i >= 0 && j >= 0 && i < w && j < h;
  if (tidy) tidyTones(raster, materials, color, tone, glow);
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
        else if (groups && groups[hit[q]] !== groups[hit[idx]] && depth[q] < d - occlude) steps = Math.max(steps, 1);
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
  // F6b: Gegenlicht – am Rand der Schattenseite fängt die Figur kühles Himmelslicht (eine Stufe
  // heller), wie in gezeichneter Pixel-Art; nicht an Unterseiten
  if (light?.dir && backlight) {
    const L = light.dir;
    const lift = [];
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const idx = j * w + i;
        if (color[idx] < 0) continue;
        const m = materials[mat[idx]];
        if (!m || m.flat || m.glow) continue;
        const emptyAt = (di, dj) => !inside(i + di, j + dj) || color[(j + dj) * w + i + di] < 0;
        if (!(emptyAt(1, 0) || emptyAt(1, -1))) continue;
        const n = [normal[idx * 3], normal[idx * 3 + 1], normal[idx * 3 + 2]];
        if (dot(n, L) < -0.05 && n[1] > -0.35) lift.push(idx);
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
    else if (m.outline !== undefined) color[idx] = m.outlineLit !== undefined && lightSide && pos[src * 3 + 1] > 0.3 ? m.outlineLit : m.outline;
    else color[idx] = toneOf(m, lightSide && pos[src * 3 + 1] > 0.3 ? 1 : 0);
  }
  return { color, glow, tone };
}

const norm3 = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Kugel um eine Form (Mitte, Radius) – für die Kandidaten der Schatten- und Verdeckungsproben. */
function sphereOf(s) {
  if (s.kind === 'capsule') {
    const c = [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2, (s.a[2] + s.b[2]) / 2];
    return { c, r: len(sub(s.b, s.a)) / 2 + Math.max(s.r, s.r1 ?? s.r) + (s.blend || 0) };
  }
  return { c: s.c, r: reachOf(s) + (s.blend || 0) };
}

/**
 * F6b (nur Menschen): ein Lichtwert je Texel wie in einer gezeichneten Figur. Das Hauptlicht kommt
 * von oben links (weich umgeschlagen, `wrap`); was zwischen dem Texel und dem Licht liegt, wirft
 * einen Schlagschatten (die Mütze auf die Stirn, der Kopf auf den Kragen, der Arm auf die Seite);
 * Falten und Winkel (Achseln, unter dem Kinn, zwischen den Beinen, am Boden) verdeckt das
 * Abstandsfeld selbst. Zuletzt wird der Wert je Stoff und Gruppe geglättet, damit die Tongrenzen als
 * ruhige Linien statt als Zacken verlaufen. Das Ergebnis geht als `light` an paint().
 * @returns {Float32Array} Lichtwert je Texel (wie dot(n, LIGHT), etwa −1 … 1)
 */
export function lightField(raster, shapes, { dir = LIGHT, wrap = 0.2, shadow = 0.55, ao = 0.75, smooth = true, groups = null, relief = 1 } = {}) {
  const { w, h, hit, normal, pos, mat, flat } = raster;
  // F6c: Das Relief (Falten, Steppnähte, Strähnen) kommt nach dem Glätten scharf dazu
  const detail = flat ? new Float32Array(w * h) : null;
  const L = norm3(dir);
  const Hv = norm3([L[0], L[1] + 0.6, L[2] + 0.8]); // halber Weg zwischen Licht und Blick (Glanz)
  const gloss = new Float32Array(w * h);
  const raw = new Float32Array(w * h);
  const spheres = shapes.map(sphereOf);
  const list = [];
  // Formen, deren Kugel die Strecke von (fx, fy, fz) um (dx, dy, dz) berührt (ohne neue Arrays)
  const pick = (fx, fy, fz, dx, dy, dz) => {
    list.length = 0;
    const dd = dx * dx + dy * dy + dz * dz || 1;
    let solid = false;
    for (let k = 0; k < shapes.length; k++) {
      const sp = spheres[k];
      const c = sp.c;
      const t = Math.max(0, Math.min(1, ((c[0] - fx) * dx + (c[1] - fy) * dy + (c[2] - fz) * dz) / dd));
      const qx = fx + dx * t - c[0];
      const qy = fy + dy * t - c[1];
      const qz = fz + dz * t - c[2];
      const r = sp.r + 0.02;
      if (qx * qx + qy * qy + qz * qz <= r * r) {
        list.push(k);
        if (!shapes[k].cut) solid = true;
      }
    }
    return solid;
  };
  const q = [0, 0, 0];
  for (let i = 0; i < w * h; i++) {
    if (hit[i] < 0) continue;
    const px = pos[i * 3];
    const py = pos[i * 3 + 1];
    const pz = pos[i * 3 + 2];
    const src = flat || normal;
    const nx = src[i * 3];
    const ny = src[i * 3 + 1];
    const nz = src[i * 3 + 2];
    const key = nx * L[0] + ny * L[1] + nz * L[2];
    // Glanz aus der Normale mit Relief (Strähnen brechen den Glanz)
    gloss[i] = normal[i * 3] * Hv[0] + normal[i * 3 + 1] * Hv[1] + normal[i * 3 + 2] * Hv[2];
    if (detail) detail[i] = ((normal[i * 3] * L[0] + normal[i * 3 + 1] * L[1] + normal[i * 3 + 2] * L[2]) - key) * relief;
    let lit = (key + wrap) / (1 + wrap);
    // Schlagschatten: weicher Schatten (Quilez) auf dem Weg zum Licht
    if (shadow && key > -0.15) {
      const fx = px + nx * 0.012;
      const fy = py + ny * 0.012;
      const fz = pz + nz * 0.012;
      if (pick(fx, fy, fz, L[0] * shadow, L[1] * shadow, L[2] * shadow)) {
        let res = 1;
        let t = 0.01;
        for (let k = 0; k < 40 && t < shadow; k++) {
          q[0] = fx + L[0] * t;
          q[1] = fy + L[1] * t;
          q[2] = fz + L[2] * t;
          const d = distanceOf(shapes, list, q);
          if (d < 0.002) {
            res = 0;
            break;
          }
          res = Math.min(res, (14 * d) / t);
          t += Math.max(d, 0.006);
        }
        res = Math.max(0, Math.min(1, res));
        lit = res * lit + (1 - res) * Math.min(lit, -0.05);
      }
    }
    // Umgebungsverdeckung: wie viel Abstandsfeld fehlt entlang der Normale
    if (ao) {
      if (pick(px, py, pz, nx * 0.14, ny * 0.14, nz * 0.14)) {
        let occ = 0;
        let sc = 1;
        for (let k = 1; k <= 4; k++) {
          const hk = 0.025 * k;
          q[0] = px + nx * hk;
          q[1] = py + ny * hk;
          q[2] = pz + nz * hk;
          const d = distanceOf(shapes, list, q);
          occ += (hk - Math.min(hk, d)) * sc;
          sc *= 0.75;
        }
        const a = Math.max(0, Math.min(1, 1 - 4.5 * occ));
        lit -= (1 - a) * ao;
      }
    }
    if (lit < 0.5) gloss[i] = 0; // kein Glanz im Schatten
    raw[i] = lit;
  }
  raw.gloss = gloss;
  raw.dir = L;
  if (!smooth) {
    if (detail) for (let i = 0; i < w * h; i++) raw[i] += detail[i];
    return raw;
  }
  // Glätten je Stoff und Gruppe (Mitte 4, Seiten 2, Ecken 1)
  const out = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      if (hit[idx] < 0) continue;
      const g = groups ? groups[hit[idx]] : null;
      let sum = 0;
      let wsum = 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const x = i + di;
          const y = j + dj;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const q = y * w + x;
          if (hit[q] < 0 || mat[q] !== mat[idx]) continue;
          if (groups && groups[hit[q]] !== g) continue;
          const wt = di === 0 && dj === 0 ? 4 : di === 0 || dj === 0 ? 2 : 1;
          sum += raw[q] * wt;
          wsum += wt;
        }
      }
      out[idx] = sum / wsum + (detail ? detail[idx] : 0);
    }
  }
  out.gloss = gloss;
  out.dir = L;
  return out;
}

/**
 * F5: Töne nach der Mehrheit aufräumen (vor den Linien). Ein Texel übernimmt den Ton, den mindestens
 * fünf seiner acht Nachbarn desselben Stoffs tragen, solange höchstens einer der vier direkten
 * Nachbarn seinen eigenen Ton teilt – so verschwinden Gries und Zacken an den Tonwechseln, Linien
 * und Flächen bleiben. Stoffe mit Muster, Glühen oder flacher Farbe bleiben, wie sie sind.
 */
function tidyTones(raster, materials, color, tone, glow) {
  const { w, h, mat } = raster;
  const next = tone.slice();
  const count = new Int8Array(16);
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      const idx = j * w + i;
      if (color[idx] < 0 || glow[idx]) continue;
      const m = materials[mat[idx]];
      if (!m || m.pattern || m.flat || m.glow) continue;
      count.fill(0);
      let same = 0;
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const q = idx + di + dj * w;
        if (mat[q] === mat[idx] && color[q] >= 0 && tone[q] === tone[idx]) same++;
      }
      if (same > 1) continue;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const q = idx + di + dj * w;
          if (mat[q] === mat[idx] && color[q] >= 0 && tone[q] >= 0) count[tone[q]]++;
        }
      }
      let best = -1;
      for (let k = 0; k < count.length; k++) if (count[k] >= 5 && (best < 0 || count[k] > count[best])) best = k;
      if (best >= 0 && best !== tone[idx]) next[idx] = best;
    }
  }
  for (let idx = 0; idx < w * h; idx++) {
    if (next[idx] === tone[idx]) continue;
    tone[idx] = next[idx];
    color[idx] = materials[mat[idx]].ramp[tone[idx]];
  }
}

/**
 * Stempel: kleine Pixelbilder als Zeichenketten, deren Mitte auf einen Weltpunkt gesetzt wird
 * (nur, wo die Figur dort sichtbar ist und der Punkt nicht verdeckt: Liegt dort eine Fläche
 * mehr als `depth` Meter vor dem Punkt, bleibt das Texel, wie es ist). `mark` (F4) merkt sich je
 * Texel, ob der Stempel es gesetzt hat; `parts` (F4, Menge von Formen) setzt nur, wo eine dieser
 * Formen vorn liegt – statt der Tiefe (ein Gesicht auf einem halb gedrehten Kopf).
 * @param {{rows:string[], legend:Record<string, number|{glow:number}>}} stamp
 */
export function stampAt(out, raster, stamp, point, { flip = false, need = true, depth = 0.06, mark = null, parts = null, texel = null } = {}) {
  const { w, h, px, py } = raster;
  // F6: `texel` setzt die Mitte direkt auf ein Texel (Gesichter, die schon im Bild platziert sind)
  const t = texel ? null : toTexel(point, px, py);
  const tq = texel ? 0 : dot(point, F);
  const cx = texel ? texel[0] : Math.floor(t.x);
  const cy = texel ? texel[1] : Math.floor(t.y);
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
