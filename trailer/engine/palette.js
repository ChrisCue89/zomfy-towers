// Die Palette des Spiels (src/render/palette.js), als CSS-Farben. Nur, was der Trailer braucht.

export const RAMPS = {
  n: [0x0d0b18, 0x161429, 0x1f1f3d, 0x2a2d52, 0x353f69, 0x445683, 0x58719e, 0x7690b8, 0xa0b6d2],
  d: [0x2a1830, 0x432645, 0x5e3656, 0x7c4a66, 0x9f6474, 0xc4837f, 0xe0a58f],
  g: [0x10201d, 0x16301f, 0x1f4226, 0x2b552b, 0x3b6a31, 0x508037, 0x69963d, 0x86ad47, 0xa6c357, 0xc9d975],
  e: [0x1e1410, 0x2e1f17, 0x422c1e, 0x573b26, 0x6e4c2f, 0x875f38, 0xa17444, 0xbb8d54, 0xd2a86b, 0xe6c692],
  f: [0x5a1c1a, 0x86281f, 0xb03e25, 0xd15d2c, 0xe8833a, 0xf4a64c, 0xfac665, 0xfde08e, 0xfff2c4],
  s: [0x1b1b24, 0x2b2b36, 0x3c3c47, 0x504f58, 0x66646a, 0x7e7b7d, 0x999490, 0xb4aea5, 0xd0c9bc, 0xebe4d6],
  r: [0x3b1718, 0x5c2222, 0x7f3027, 0xa0432e, 0xbf5e3a],
  b: [0x1c2a4a, 0x27406b, 0x34598d, 0x4876ad, 0x6697c9, 0x93bce0],
  a: [0xe27b93, 0xf4acc0, 0x7b5aa6, 0xa88fd0, 0xf7f3ea, 0x3f8f86, 0x6cc0ae],
};
export const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
export const rgb = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const P = {};
for (const [name, ramp] of Object.entries(RAMPS)) ramp.forEach((v, i) => (P[name + i] = v));
export { P };

export const C = {
  black: hex(P.n0),
  outline: hex(P.n0),
  plum: hex(P.d0),
  plumLight: hex(P.d1),
  frame: hex(P.e5),
  frameDark: hex(P.e3),
  text: hex(P.s9),
  warm: hex(P.e9),
  gold: hex(P.f6),
  goldLight: hex(P.f7),
  cream: hex(P.f8),
  orange: hex(P.f4),
  ember: hex(P.f3),
  red: hex(P.r4),
  ice: hex(P.b5),
  iceDeep: hex(P.b3),
  night: hex(P.n2),
  nightLight: hex(P.n5),
  violet: hex(P.a3),
  moder: hex(P.a2),
  moss: hex(P.g7),
  snow: hex(P.a4),
};
export const LEAVES = [P.f2, P.f3, P.f4, P.f5, P.e6, P.f6, P.r3].map(hex);
