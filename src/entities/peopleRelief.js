// F6c: Relief auf den Formen der Menschen (spriteBaker: `bump(l, p)` je Form). Falten, Rippen und
// Strähnen neigen nur die Normale – sie fangen Licht und Schatten wie gezeichnet (oben ein heller
// Grat, darunter ein Schattenstrich), ohne dass sich die Form ändert. Maße in Metern (ein Texel
// ist 1/40 m), `amp` ist die größte Neigung (0,5 ≈ 27°). Kein three.js – der Worker backt mit.

const SQRT = Math.sqrt;

/** Ableitung eines Grats (Gauß), auf 1 normiert: größter Wert bei u = ±0,71. */
function ridge(u) {
  return (2 * u * Math.exp(-u * u)) / 0.8578;
}

/**
 * Rippen rund um die y-Achse des eigenen Rahmens (Mützenbund, Bündchen, Strick): `n` je Umlauf,
 * nur zwischen den Höhen `from` und `to`.
 */
export function ribs(n, { amp = 0.45, from = -Infinity, to = Infinity } = {}) {
  return (l) => {
    if (l[1] < from || l[1] > to) return null;
    const th = Math.atan2(l[0], l[2]);
    const s = amp * Math.sin(th * n);
    return [Math.cos(th) * s, 0, -Math.sin(th) * s];
  };
}

/**
 * Querfalten im eigenen Rahmen einer Form (Ellipsoid, Quader): Grate bei den Höhen `at` (y), jeder
 * `w` breit und mit x leicht gewellt (`wave` Meter, `waveK` je Meter), nur vorn (`front`: z über
 * diesem Wert) und nur wo `where(l)` gilt.
 */
export function folds(at, { w = 0.018, amp = 0.55, wave = 0.012, waveK = 14, front = -Infinity, where = null } = {}) {
  return (l) => {
    if (l[2] < front || (where && !where(l))) return null;
    let g = 0;
    for (let k = 0; k < at.length; k++) {
      const u = (l[1] - at[k] - wave * Math.sin(l[0] * waveK + k * 1.7)) / w;
      if (u > -2.5 && u < 2.5) g += ridge(u);
    }
    return g ? [0, amp * g, 0] : null;
  };
}

/**
 * Ringfalten um eine Kapsel (Ellbogen, Knie, gestauchte Hose): Grate an den Stellen `at` (Anteil
 * der Länge von a nach b). `axis` ist die Richtung a → b in der Welt, `len` die Länge; l ist bei
 * Kapseln der Abstand zu a. `side` (Weltrichtung) beschränkt die Falten auf eine Seite des Glieds
 * (die Innenseite des Ellbogens), `bias` verschiebt die Grate je nach Seite (schräge Falten).
 */
export function rings(axis, len, at, { w = 0.018, amp = 0.55, side = null, bias = 0 } = {}) {
  return (l) => {
    const t = l[0] * axis[0] + l[1] * axis[1] + l[2] * axis[2];
    let k = 1;
    let shift = 0;
    if (side) {
      // Anteil der Richtung quer zum Glied, der zur gewünschten Seite zeigt
      const px = l[0] - axis[0] * t;
      const py = l[1] - axis[1] * t;
      const pz = l[2] - axis[2] * t;
      const pl = SQRT(px * px + py * py + pz * pz) || 1;
      const c = (px * side[0] + py * side[1] + pz * side[2]) / pl;
      k = Math.max(0, 0.35 + 0.65 * c);
      shift = bias * c;
    }
    if (!k) return null;
    let g = 0;
    for (let n = 0; n < at.length; n++) {
      const u = (t - (at[n] * len + shift)) / w;
      if (u > -2.5 && u < 2.5) g += ridge(u);
    }
    if (!g) return null;
    // Die Normale kippt längs der Achse: auf der Seite zu a hin heller (zum Licht oben), dahinter dunkel
    const s = -amp * g * k;
    return [axis[0] * s, axis[1] * s, axis[2] * s];
  };
}

/**
 * Strähnen längs einer Kapsel (eine Haarsträhne): Rillen quer zur Strähne, `period` Meter breit.
 * `across` ist eine Weltrichtung quer zur Strähne (meist die Bildwaagerechte).
 */
export function strands(axis, { period = 0.03, amp = 0.45, across = [1, 0, 0], phase = 0 } = {}) {
  // Querachse senkrecht zur Strähne
  const d = across[0] * axis[0] + across[1] * axis[1] + across[2] * axis[2];
  let e = [across[0] - axis[0] * d, across[1] - axis[1] * d, across[2] - axis[2] * d];
  const el = SQRT(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]) || 1;
  e = [e[0] / el, e[1] / el, e[2] / el];
  const f = (2 * Math.PI) / period;
  return (l) => {
    const c = l[0] * e[0] + l[1] * e[1] + l[2] * e[2];
    const s = amp * Math.sin(c * f + phase);
    return [e[0] * s, e[1] * s, e[2] * s];
  };
}

/** Mehrere Reliefs zusammen (die Neigungen addieren sich). */
export function combine(...list) {
  const fs = list.filter(Boolean);
  return (l, p) => {
    let v = null;
    for (const f of fs) {
      const r = f(l, p);
      if (!r) continue;
      v = v ? [v[0] + r[0], v[1] + r[1], v[2] + r[2]] : r;
    }
    return v;
  };
}

/**
 * Das Gesicht wölbt sich im Licht (Kopf der Menschen, Rahmen des Kopfs): Die Normale neigt sich zum
 * Rand hin nach außen – zum Licht links heller, rechts und am Kinn dunkler –, ohne dass sich der
 * Umriss des Kopfs ändert.
 */
export function roundFace(l) {
  if (l[2] < 0.05) return null;
  return [(l[0] / 0.29) * 0.45, ((l[1] + 0.03) / 0.235) * 0.28, 0];
}
