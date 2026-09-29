// Kleine Hilfen: Zeit, Übergänge, deterministischer Zufall.

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => u * u * (3 - 2 * u);
export const easeOut = (u) => 1 - (1 - u) ** 3;
export const easeIn = (u) => u * u * u;
export const easeInOut = (u) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
/** Überschwingen (Bauen mit Schwung): 0 → 1 mit kleinem Überschuss. */
export const backOut = (u, s = 1.9) => {
  u = clamp(u) - 1;
  return u * u * ((s + 1) * u + s) + 1;
};
/** 0..1 innerhalb [a, b] (mit Kappung). */
export const ramp = (t, a, b) => clamp((t - a) / (b - a));
/** Ein- und Ausblenden: 1 zwischen [t0+fi, t1-fo], sonst Rampen. */
export const fade = (t, t0, t1, fi = 0.2, fo = 0.2) => Math.min(fi > 0 ? ramp(t, t0, t0 + fi) : t >= t0 ? 1 : 0, fo > 0 ? 1 - ramp(t, t1 - fo, t1) : t <= t1 ? 1 : 0);

/** Deterministischer Zufall 0..1 aus zwei Zahlen. */
export function rnd(seed, k = 0) {
  const x = Math.sin(seed * 127.1 + k * 311.7 + 74.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Abklingende Spitze: 1 im Moment `t0`, danach exponentiell zurück. */
export const pulse = (t, t0, decay = 6) => (t < t0 ? 0 : Math.exp(-(t - t0) * decay));
/** Nächste Spitze aus einer Liste von Zeiten. */
export function pulseAt(t, times, decay = 6) {
  let best = 0;
  for (const t0 of times) {
    if (t0 > t) break;
    best = Math.max(best, pulse(t, t0, decay));
  }
  return best;
}
export const frameOf = (t) => Math.round(t * FPS);
export const pad4 = (n) => String(n).padStart(4, '0');
