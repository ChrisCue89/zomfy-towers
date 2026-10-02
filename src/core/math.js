// Kleine Mathe-Helfer ohne Abhängigkeiten.

export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Bildratenunabhängiges Annähern: je größer `sharpness`, desto schneller. */
export function damp(current, target, sharpness, dt) {
  return lerp(current, target, 1 - Math.exp(-sharpness * dt));
}

/** Winkel auf den Bereich (-PI, PI] bringen. */
export function wrapAngle(angle) {
  let a = (angle + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

export function dampAngle(current, target, sharpness, dt) {
  const delta = wrapAngle(target - current);
  return current + delta * (1 - Math.exp(-sharpness * dt));
}

/** Auf ein Raster runden (z. B. 1/8 m). */
export function snap(value, step) {
  return Math.round(value / step) * step;
}
