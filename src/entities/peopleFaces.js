// Gesichter der Menschen als Sprites (F6a): Jedes Merkmal – Auge, Braue, Mund, Nase, Wange, Brille –
// sitzt an einem eigenen Punkt auf der Kopfoberfläche. Beim Backen fragt jedes, wie weit es zur
// Kamera zeigt (die Augen dann 3, 2 oder 1 Texel breit, oder verdeckt), ob etwas davor liegt und
// wohin der Kopf blickt. So stehen die Augen in jeder der acht Richtungen dort, wo der Kopf sie hat:
// schräg ist das ferne Auge schmaler und rückt nach innen statt an den Rand (vorher stand dort ein
// Stempel für drei Blicke – das ferne Auge klebte am Gesichtsrand, die Figuren schielten).
// Reines JavaScript ohne three.js – der Worker backt mit.

import { toTexel, stampAt } from '../render/spriteBaker.js';

/** Lage der Merkmale im Kopfrahmen (Meter): Augenmitte, Nase, Mund, Wangen. */
export const FACE = { eyeX: 0.075, eyeY: -0.05, noseY: -0.098, mouthY: -0.125, cheekX: 0.14, cheekY: -0.1 };
/** Kinder: der Kopf ist kleiner, die Augen sitzen etwas tiefer und enger. */
export const FACE_CHILD = { eyeX: 0.068, eyeY: -0.04, noseY: -0.08, mouthY: -0.104, cheekX: 0.12, cheekY: -0.084 };

/** Wie stark das Gesicht für die Blickrichtung gewölbt gedacht wird (seitlich, in der Höhe). */
const CURVE = [4.5, 2];
/** Merkmale sitzen ein Stück hinter der Oberfläche (im Profil nicht auf dem Umriss). */
const INSET = { eye: 0.035, mouth: 0.03, nose: 0.02, cheek: 0.02 };
/** Ab welcher Zuwendung ein Auge 3 bzw. 2 Texel breit ist (darunter 1, unter `hidden` verdeckt). */
const EYE_WIDTH = { three: 0.78, two: 0.25, hidden: 0.15 };

const F = [0, -0.6, -0.8]; // Blickrichtung der Kamera
const V = [0, 0.6, 0.8]; // zur Kamera

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** Ein Vektor im Rahmen `ax` (Achsen in der Welt) → Welt. */
const inAxes = (ax, l) => [ax[0][0] * l[0] + ax[1][0] * l[1] + ax[2][0] * l[2], ax[0][1] * l[0] + ax[1][1] * l[1] + ax[2][1] * l[2], ax[0][2] * l[0] + ax[1][2] * l[1] + ax[2][2] * l[2]];

/**
 * Vorderseite des Kopfs (gerundeter Quader, unten verjüngt) bei (x, y) im Kopfrahmen: z der
 * Oberfläche. Außerhalb der Vorderseite (an der Kante) null.
 */
function frontZ(head, x, y) {
  const [hx, hy, hz] = head.h;
  const r = head.r;
  const k = head.taper ? 1 + head.taper * Math.min(1, Math.max(0, -y / hy)) : 1;
  const ex = Math.max(0, Math.abs(x) * k - (hx - r));
  const ey = Math.max(0, Math.abs(y) - (hy - r));
  const q = r * r - ex * ex - ey * ey;
  return q > 0 ? hz - r + Math.sqrt(q) : null;
}

/**
 * Die Merkmale eines Gesichts im Bild: Punkte und gedachte Normalen in der Welt, dazu Blick- und
 * Seitenachse des Kopfs. `body` aus spriteFigure.humanoid (H, headAx, head), `geo` FACE bzw.
 * FACE_CHILD. Die Arten setzen es mit `ctx.face = faceOf(ctx, body, FACE)`.
 */
export function faceOf(ctx, body, geo = FACE) {
  const head = body.head;
  const ax = body.headAx;
  const feature = (x, y, inset) => {
    const z = frontZ(head, x, y);
    if (z === null) return null;
    return { p: ctx.W(body.H([x, y, z - inset])), n: norm(inAxes(ax, norm([x * CURVE[0], y * CURVE[1], 1]))), x };
  };
  return {
    eyes: [feature(-geo.eyeX, geo.eyeY, INSET.eye), feature(geo.eyeX, geo.eyeY, INSET.eye)],
    cheeks: [feature(-geo.cheekX, geo.cheekY, INSET.cheek), feature(geo.cheekX, geo.cheekY, INSET.cheek)],
    nose: feature(0, geo.noseY, INSET.nose),
    mouth: feature(0, geo.mouthY, INSET.mouth),
    center: feature(0, geo.eyeY, INSET.eye),
    fwd: inAxes(ax, [0, 0, 1]),
    side: inAxes(ax, [1, 0, 0]),
  };
}

/** Alle Punkte und Richtungen eines Gesichts umrechnen (Größe, Kippen beim Backen). */
export function mapFace(face, point, dir = (v) => v) {
  for (const f of [...face.eyes, ...face.cheeks, face.nose, face.mouth, face.center]) {
    if (!f) continue;
    f.p = point(f.p);
    f.n = dir(f.n);
  }
  face.fwd = dir(face.fwd);
  face.side = dir(face.side);
}

// --- Merkmale als kleine Bilder ------------------------------------------------------------------

/**
 * Augen je Form und Breite (Zeilen von oben; `.` frei). Legende: k Auge, i Iris, w Glanz bzw.
 * Augenweiß, l Lid, K unteres Lid.
 *
 * Gegen das Schielen (recherche/menschen-gestaltung.md, F6a, F6g): Ein weißer Punkt am Rand eines
 * Auges liest sich als Augenweiß – die Pupille blickt dann von ihm weg. Auch Seitenblicke (das Weiß
 * bei beiden Augen auf derselben Seite) lasen sich in der Schrägansicht als schiefe, schielende
 * Augen (Rückmeldung 01.10.: »Du machst sie schräg. Mach sie gerade«). Darum blicken die Augen in
 * jeder Richtung gerade: jedes Auge in sich symmetrisch, der Glanz *in* der Pupille (nur bei drei
 * Texeln, sonst keiner), beide gleich breit.
 */
const EYES = {
  offen: { 3: ['kkk', 'kwk', 'kik'], 2: ['kk', 'kk', 'ii'], 1: ['k', 'k', 'k'] },
  weit: { 3: ['kwk', 'kkk', 'kik'], 2: ['kk', 'kk', 'ii'], 1: ['k', 'k', 'k'] },
  halb: { 3: ['lll', 'kkk', 'kik'], 2: ['ll', 'kk', 'ii'], 1: ['.', 'l', 'k'] },
  zu: { 3: ['...', 'lll', 'kkk'], 2: ['..', 'll', 'kk'], 1: ['.', '.', 'k'] },
  // lachende Bögen: ein Texel breiter als das Auge, die Enden eine Reihe tiefer
  froh: { 3: ['.kkk.', 'k...k'], 2: ['.kk.', 'k..k'], 1: ['k.', '.k'] },
  // zusammengekniffen: die Spitze zeigt zur Nase (für das rechte Auge gespiegelt)
  aua: { 3: ['k..', '.kk', 'k..'], 2: ['k.', '.k', 'k.'], 1: ['k', 'k', 'k'] },
  grinsen: { 3: ['kkk', 'kwk', 'KKK'], 2: ['kk', 'kk', 'KK'], 1: ['.', 'k', 'k'] },
};
/** Versatz der lachenden Bögen (sie sind breiter als das Auge). */
const EYE_SHIFT = { froh: -1 };

/** Brauen: Höhe der Enden (innen, außen) gegenüber der Mitte; positiv = tiefer. */
const BROWS = { normal: [0, 0], froh: [-1, 0], aua: [-1, 1], staunen: [0, 0], muede: [1, 1], besorgt: [-1, 1], entschlossen: [1, -1], blinzeln: [0, 0], grinsen: [-1, 0] };
/** Abstand der Braue über dem oberen Augenrand (Reihen); staunen hebt sie. */
const BROW_GAP = { staunen: 3 };

/** Münder je Ausdruck: von vorn, schräg, im Profil (am vorderen Rand). */
const MOUTHS = {
  normal: { vorn: ['nt'], schraeg: ['t'], profil: ['t'] },
  froh: { vorn: ['mmmmm', '.ttt.'], schraeg: ['mmm', 'tt.'], profil: ['m', 't'] },
  aua: { vorn: ['mmm', 'mtm'], schraeg: ['mm', 'mt'], profil: ['m', 'm'] },
  staunen: { vorn: ['.m.', 'mtm'], schraeg: ['m', 't'], profil: ['m', 't'] },
  muede: { vorn: ['t'], schraeg: ['t'], profil: ['t'] },
  besorgt: { vorn: ['.m.', 'm.m'], schraeg: ['m.', '.m'], profil: ['m'] },
  entschlossen: { vorn: ['mzzzm'], schraeg: ['zzm'], profil: ['m'] },
  blinzeln: { vorn: ['t'], schraeg: ['t'], profil: ['t'] },
  grinsen: { vorn: ['mmmmm', '.zzg.'], schraeg: ['mmm', 'zg.'], profil: ['m', 'z'] },
};

/** Welche Augenform ein Ausdruck nimmt. */
const EYE_OF = { normal: 'offen', froh: 'froh', aua: 'aua', staunen: 'weit', muede: 'halb', besorgt: 'offen', entschlossen: 'halb', blinzeln: 'zu', grinsen: 'grinsen' };

/** Ausdrücke, deren Augen offen sind (Wimpern, Brillengläser bleiben offen). */
const OPEN = new Set(['normal', 'staunen', 'besorgt']);

const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));

// --- Platzieren -----------------------------------------------------------------------------------

/**
 * Wo die Merkmale eines Gesichts in diesem Bild liegen: je Auge Texel und Breite (oder verdeckt),
 * Mund, Nase, Wangen, Blick nach links oder rechts. `skin` sind die Stoffe, auf denen Augen und
 * Wangen liegen dürfen (Haut); `faceParts` die Formen des Gesichts (Kopf, Nase, Bart).
 */
export function placeFace(face, raster, faceParts, skin) {
  const { w, h, px, py } = raster;
  const at = (f, needSkin) => {
    if (!f) return null;
    const facing = dot(f.n, V);
    const t = toTexel(f.p, px, py);
    const i = Math.floor(t.x);
    const j = Math.floor(t.y);
    if (i < 0 || j < 0 || i >= w || j >= h) return null;
    const idx = j * w + i;
    // daneben oder verdeckt (Hand, Hut, Haarsträhne – eigene Formen); der eigene Kopf darf davor
    // liegen: im Profil sieht man das Auge auf der Seite des Kopfs, nicht auf seiner Vorderseite
    if (!faceParts.has(raster.hit[idx])) return null;
    if (needSkin && !skin.has(raster.mat[idx])) return null; // unter Haar oder Bart
    return { i, j, x: t.x, y: t.y, facing };
  };
  const look = face.fwd[0] > 0.35 ? 1 : face.fwd[0] < -0.35 ? -1 : 0;
  const eyes = face.eyes.map((f) => {
    const e = at(f, true);
    if (!e || e.facing < EYE_WIDTH.hidden) return null;
    e.width = e.facing >= EYE_WIDTH.three ? 3 : e.facing >= EYE_WIDTH.two ? 2 : 1;
    return e;
  });
  // Von vorn sitzen beide Augen auf einer Reihe und spiegelgleich um die Mitte (die Mitte rundet
  // einmal, nicht jedes Auge für sich – sonst stünde ein Auge einen Texel höher). F6g: Beide sind
  // gleich breit – ein breites und ein schmales Auge lasen sich in der Schrägansicht als schief.
  const center = at(face.center, false);
  if (eyes[0] && eyes[1]) {
    const row = Math.floor((eyes[0].y + eyes[1].y) / 2);
    eyes[0].j = row;
    eyes[1].j = row;
    const width = Math.min(eyes[0].width, eyes[1].width);
    eyes[0].width = width;
    eyes[1].width = width;
    if (look === 0 && center && eyes[0].width === eyes[1].width) {
      const half = Math.round((eyes[1].x - eyes[0].x) / 2);
      eyes[0].i = center.i - half;
      eyes[1].i = center.i + half;
    }
  }
  // Wo liegt die Nase vom Auge aus (für die Spitze von > < und die Wimpern außen)?
  const midX = center ? center.x : eyes[0] && eyes[1] ? (eyes[0].x + eyes[1].x) / 2 : null;
  const both = Boolean(eyes[0] && eyes[1]);
  eyes.forEach((e, k) => {
    if (!e) return;
    // Mit einem Auge (Profil) liegt die Nase in Blickrichtung
    if (!both && look) e.inward = look;
    else e.inward = midX === null ? (k === 0 ? 1 : -1) : Math.sign(midX - e.x) || (k === 0 ? 1 : -1);
  });
  let mouth = at(face.mouth, false);
  if (mouth && mouth.facing < -0.3) mouth = null;
  if (mouth) {
    mouth.kind = mouth.facing >= 0.72 ? 'vorn' : mouth.facing >= 0.35 ? 'schraeg' : 'profil';
    if (look === 0 && center) mouth.i = center.i;
  }
  const nose = at(face.nose, true);
  const cheeks = face.cheeks.map((f) => {
    const c = at(f, true);
    return c && c.facing >= 0.4 ? c : null;
  });
  if (cheeks[0] && cheeks[1] && eyes[0] && eyes[1]) {
    const row = Math.floor((cheeks[0].y + cheeks[1].y) / 2);
    cheeks[0].j = row;
    cheeks[1].j = row;
  }
  return { eyes, mouth, nose: nose && nose.facing >= 0.55 ? nose : null, cheeks, look };
}

/**
 * Die kleinen Bilder eines Ausdrucks für eine Platzierung: Liste von { rows, x0, y0 } (Texel der
 * linken oberen Ecke). `o.lashes` gibt Wimpern, `o.glasses` eine Brille; F6c: `o.bushy` buschige
 * Brauen, `o.lines` Lachfältchen (Sommersprossen lasen sich neben den kleinen Augen wie ein Schielen).
 */
export function faceStamps(place, expr, o = {}) {
  const out = [];
  const put = (rows, x0, y0) => out.push({ rows, x0, y0 });
  const eyeKind = EYE_OF[expr] || 'offen';
  const open = OPEN.has(expr);
  const tops = [];
  place.eyes.forEach((e) => {
    if (!e) return;
    const glasses = o.glasses && (e.width > 1 || open);
    const kind = glasses && (eyeKind === 'froh' || eyeKind === 'aua') ? 'offen' : eyeKind; // hinter der Brille bleiben die Augen offen
    // F6g: in jeder Richtung gerade (in sich symmetrisch); nur > < zeigt zur Nase (gezeichnet für ein
    // Auge links davon)
    let rows = EYES[kind][e.width];
    if (kind === 'aua' && e.inward < 0) rows = mirror(rows);
    const shift = EYE_SHIFT[kind] || 0;
    const x0 = e.i - Math.floor(e.width / 2) + (kind === 'froh' && e.width === 1 ? (e.inward > 0 ? 0 : -1) : shift);
    const y0 = e.j - 1;
    put(rows, x0, y0);
    tops.push({ e, x0: e.i - Math.floor(e.width / 2), y0 });
    // Wimpern am äußeren oberen Winkel offener Augen – nur von vorn (schräg zog der eine Strich das
    // Auge schief, F6g)
    if (o.lashes && open && e.width > 1 && place.look === 0) put(['L'], e.inward > 0 ? x0 - 1 : x0 + e.width, y0);
  });
  // Brauen über den Augen (so breit wie das Auge; das schmale Auge bekommt eine längere). F6c:
  // `o.bushy` – buschig, innen zwei Reihen hoch
  const brow = BROWS[expr] || [0, 0];
  const gap = BROW_GAP[expr] || 2;
  for (const { e, x0, y0 } of tops) {
    const w = e.width === 1 ? 2 : e.width;
    const left = e.inward > 0 ? x0 - (w - e.width) : x0;
    const y = y0 - gap;
    for (let k = 0; k < w; k++) {
      const x = left + k;
      // innen ist die Seite zur Nase
      const inner = e.inward > 0 ? k === w - 1 : k === 0;
      const outer = e.inward > 0 ? k === 0 : k === w - 1;
      const by = y + (inner ? brow[0] : outer ? brow[1] : 0);
      put(['b'], x, by);
      if (o.bushy && !outer) put(['b'], x, by - 1);
    }
  }
  // F6c: Lachfältchen – ein Strich im Hautschatten am äußeren unteren Augenwinkel (die Älteren)
  if (o.lines) {
    for (const { e, x0, y0 } of tops) {
      if (e.width < 2) continue;
      const out = e.inward > 0 ? x0 - 1 : x0 + e.width;
      put(['l'], out, y0 + 2);
      if (expr === 'froh' || expr === 'grinsen') put(['l'], out + (e.inward > 0 ? -1 : 1), y0 + 1);
    }
  }
  // Brille: ein runder Rahmen um jedes Auge, zwischen den Augen der Steg, im Profil der Bügel
  if (o.glasses) {
    for (const { e, x0, y0 } of tops) {
      const w = e.width;
      for (let k = 0; k < w; k++) {
        put(['G'], x0 + k, y0 - 1);
        put(['G'], x0 + k, y0 + 3);
      }
      for (let r = 0; r < 3; r++) {
        put(['G'], x0 - 1, y0 + r);
        put(['G'], x0 + w, y0 + r);
      }
    }
    if (tops.length === 2) {
      const [a, b] = tops[0].x0 < tops[1].x0 ? tops : [tops[1], tops[0]];
      for (let x = a.x0 + a.e.width + 1; x < b.x0 - 1; x++) put(['S'], x, a.y0);
    } else if (tops.length === 1) {
      const { e, x0, y0 } = tops[0];
      // der Bügel geht vom Glas nach hinten (weg von der Nase)
      for (let k = 2; k <= 3; k++) put(['S'], e.inward > 0 ? x0 - k : x0 + e.width + k - 1, y0);
    }
  }
  // Wangen: zwei Texel Rot unter dem äußeren Augenwinkel (froh eine Reihe höher)
  place.cheeks.forEach((c) => {
    if (!c) return;
    const y = c.j - (expr === 'froh' || expr === 'grinsen' ? 1 : 0);
    if (c.facing >= 0.65) put(['cc'], c.i - 1, y);
    else put(['c'], c.i, y);
  });
  if (place.nose && expr !== 'froh' && expr !== 'grinsen') put(['n'], place.nose.i, place.nose.j);
  const m = place.mouth;
  if (m) {
    let rows = (MOUTHS[expr] || MOUTHS.normal)[m.kind];
    if (m.kind !== 'vorn' && place.look < 0) rows = mirror(rows);
    const wM = rows[0].length;
    const x0 = m.kind === 'vorn' ? m.i - Math.floor(wM / 2) : place.look < 0 ? m.i - wM + 1 : m.i;
    put(rows, x0, m.j);
  }
  return out;
}

/**
 * Ein Gesicht in einem Ausdruck stempeln: nur auf den Formen des Gesichts (`faceParts`), `mark`
 * merkt die berührten Texel (für die Flicken je Ausdruck).
 */
export function stampFace(res, raster, place, expr, legend, o, faceParts, mark) {
  for (const s of faceStamps(place, expr, o)) {
    const rows = s.rows;
    // stampAt setzt die Mitte auf einen Weltpunkt; hier liegen die Ecken schon im Bild – also ein
    // Punkt, dessen Texel die Mitte ist
    const cx = s.x0 + Math.floor(rows[0].length / 2);
    const cy = s.y0 + Math.floor(rows.length / 2);
    stampAt(res, raster, { rows, legend }, null, { parts: faceParts, mark, texel: [cx, cy] });
  }
}
