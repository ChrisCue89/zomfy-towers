// Die Palette von Zomfy Towers.
// Farbrampen von dunkel nach hell, jeweils farbverschoben: Schatten ziehen ins
// Violett-Blaue, Lichter ins Warm-Gelbe. Das fertige Bild wird im Post-Pass auf
// genau diese Farben abgebildet (siehe buildPaletteLut).

export const RAMPS = {
  // Nacht, Schatten, Tiefe
  n: [0x0d0b18, 0x161429, 0x1f1f3d, 0x2a2d52, 0x353f69, 0x445683, 0x58719e, 0x7690b8, 0xa0b6d2],
  // Dämmerung, Pflaume, Rosé
  d: [0x2a1830, 0x432645, 0x5e3656, 0x7c4a66, 0x9f6474, 0xc4837f, 0xe0a58f],
  // Gras und Laub
  g: [0x10201d, 0x16301f, 0x1f4226, 0x2b552b, 0x3b6a31, 0x508037, 0x69963d, 0x86ad47, 0xa6c357, 0xc9d975],
  // Tannen, kühles Grün
  t: [0x142a2c, 0x1d3b38, 0x285045, 0x356655, 0x467e66],
  // Erde und Holz
  e: [0x1e1410, 0x2e1f17, 0x422c1e, 0x573b26, 0x6e4c2f, 0x875f38, 0xa17444, 0xbb8d54, 0xd2a86b, 0xe6c692],
  // Feuer und warmes Licht
  f: [0x5a1c1a, 0x86281f, 0xb03e25, 0xd15d2c, 0xe8833a, 0xf4a64c, 0xfac665, 0xfde08e, 0xfff2c4],
  // Stein, Metall, Beton
  s: [0x1b1b24, 0x2b2b36, 0x3c3c47, 0x504f58, 0x66646a, 0x7e7b7d, 0x999490, 0xb4aea5, 0xd0c9bc, 0xebe4d6],
  // Rost und Rot
  r: [0x3b1718, 0x5c2222, 0x7f3027, 0xa0432e, 0xbf5e3a],
  // Blau (Plane, Jeans, Wasser)
  b: [0x1c2a4a, 0x27406b, 0x34598d, 0x4876ad, 0x6697c9, 0x93bce0],
  // Haut
  h: [0x7a4a35, 0xa5694a, 0xcc8f66, 0xe8b48a, 0xf6d3ae],
  // Akzente: Blüten, Violett, Weiß, Türkis
  a: [0xe27b93, 0xf4acc0, 0x7b5aa6, 0xa88fd0, 0xf7f3ea, 0x3f8f86, 0x6cc0ae],
};

/** Kurzzugriff: P.g5, P.e3, P.f7 … */
export const P = {};
for (const [name, ramp] of Object.entries(RAMPS)) {
  ramp.forEach((hex, i) => {
    P[name + i] = hex;
  });
}

export const PALETTE = [...new Set(Object.values(RAMPS).flat())];

// --- Farbraum-Helfer -------------------------------------------------------

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** sRGB (0..1) -> OKLab. */
function srgbToOklab(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function hexToRgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

export function hexToCss(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

const paletteLab = PALETTE.map((hex) => {
  const [r, g, b] = hexToRgb(hex);
  return srgbToOklab(r, g, b);
});

/** Index der nächstgelegenen Palettenfarbe (Abstand in OKLab). */
export function nearestPaletteIndex(r, g, b) {
  const [L, A, B] = srgbToOklab(r, g, b);
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < paletteLab.length; i++) {
    const p = paletteLab[i];
    const dl = (L - p[0]) * 1.15; // Helligkeit etwas stärker gewichten
    const da = A - p[1];
    const db = B - p[2];
    const dist = dl * dl + da * da + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export function nearestPaletteHex(r, g, b) {
  return PALETTE[nearestPaletteIndex(r, g, b)];
}

/**
 * Nachschlagetabelle für den Post-Pass: size³ Zellen, abgelegt als
 * 2D-Textur (Breite size*size, Höhe size). Zelle (r, g, b) liegt bei
 * x = r + b * size, y = g. Inhalt: nächste Palettenfarbe in sRGB.
 */
export function buildPaletteLut(size = 32) {
  const data = new Uint8Array(size * size * size * 4);
  const max = size - 1;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const hex = PALETTE[nearestPaletteIndex(r / max, g / max, b / max)];
        const index = (g * size * size + b * size + r) * 4;
        data[index] = (hex >> 16) & 255;
        data[index + 1] = (hex >> 8) & 255;
        data[index + 2] = hex & 255;
        data[index + 3] = 255;
      }
    }
  }
  return { data, width: size * size, height: size, size };
}
