// Karten für »Letzte Runde« (M28): Vorderseiten mit großer Ziffer und der Farbe
// als Symbol und Form (Blatt, Flamme, Sichel, Krähe – auch ohne Farbsehen
// lesbar), Rückseiten je Muster. Alles im Code gemalt und je Karte einmal in
// eine kleine Leinwand gelegt.

import { P, hexToCss } from '../render/palette.js';
import { CARD_BACKS } from '../data/cards.js';

export const CARD_W = 26;
export const CARD_H = 36;

/** Große Ziffern 1–9 (6 × 10, zwei Pixel breite Striche). */
const DIGITS = {
  1: ['..##..', '.###..', '####..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '######'],
  2: ['.####.', '##..##', '....##', '....##', '...##.', '..##..', '.##...', '##....', '##....', '######'],
  3: ['.####.', '##..##', '....##', '....##', '..###.', '....##', '....##', '....##', '##..##', '.####.'],
  4: ['...##.', '..###.', '.####.', '##.##.', '##.##.', '######', '...##.', '...##.', '...##.', '...##.'],
  5: ['######', '##....', '##....', '#####.', '....##', '....##', '....##', '....##', '##..##', '.####.'],
  6: ['.####.', '##..##', '##....', '##....', '#####.', '##..##', '##..##', '##..##', '##..##', '.####.'],
  7: ['######', '....##', '....##', '...##.', '...##.', '..##..', '..##..', '.##...', '.##...', '.##...'],
  8: ['.####.', '##..##', '##..##', '##..##', '.####.', '##..##', '##..##', '##..##', '##..##', '.####.'],
  9: ['.####.', '##..##', '##..##', '##..##', '##..##', '.#####', '....##', '....##', '##..##', '.####.'],
};

/** Die vier Farben: großes Symbol (11 × 11) und die Tinte der Ziffer. */
export const SUIT_ART = {
  blatt: {
    ink: P.g2,
    legend: { k: P.g1, G: P.g3, g: P.g5, l: P.g7, v: P.g2, s: P.e3 },
    rows: [
      '.....k.....',
      '....kgk....',
      '...kgglk...',
      '..kGgvglk..',
      '.kGggvgglk.',
      '.kGgvvvglk.',
      '.kGGgvgglk.',
      '..kGGvggk..',
      '...kkvkk...',
      '.....s.....',
      '....s......',
    ],
  },
  feuer: {
    ink: P.f1,
    legend: { k: P.f0, R: P.f2, o: P.f4, y: P.f6, w: P.f8 },
    rows: [
      '....k......',
      '...kRk.....',
      '...kRRk.k..',
      '..kRoRkkRk.',
      '..kRooRRRk.',
      '.kRooyoRRk.',
      '.kRoyyyoRk.',
      'kRooywyooRk',
      'kRoyywwyoRk',
      '.kRoyyyoRk.',
      '..kkkkkkk..',
    ],
  },
  mond: {
    ink: P.b1,
    legend: { k: P.n3, c: P.b4, m: P.s8, w: P.s9 },
    rows: [
      '...kkkk....',
      '..kwmmck...',
      '.kwmmck....',
      '.kwmmk.....',
      'kwmmck.....',
      'kwmmck.....',
      'kwmmmck....',
      '.kwmmmck...',
      '.kcwmmmckk.',
      '..kccmmmck.',
      '...kkkkkk..',
    ],
  },
  kraehe: {
    ink: P.n1,
    legend: { k: P.n0, K: P.n2, v: P.d1, b: P.f5, e: P.f7 },
    rows: [
      '...........',
      '.....kkk...',
      '....kKKekbb',
      '....kKKKk..',
      '..kkKKKKk..',
      '.kKvvKKKk..',
      'kKvvvvKKk..',
      '.kkvvvKKkk.',
      '...kkKKKKKk',
      '....b.b.kk.',
      '...b..b....',
    ],
  },
};

/** Kleine Farbsymbole (7 × 7) für die Ecke. */
const SUIT_SMALL = {
  blatt: { legend: { k: P.g1, g: P.g5, l: P.g7, s: P.e3 }, rows: ['...k...', '..kgk..', '.kggl..', 'kgggglk', '.kgglk.', '..kkk..', '...s...'] },
  feuer: { legend: { k: P.f0, R: P.f2, y: P.f6 }, rows: ['..k....', '..kRk..', '.kRRk.k', '.kRyRkR', 'kRyyyRk', 'kRyyyRk', '.kkkkk.'] },
  mond: { legend: { k: P.n3, m: P.s8 }, rows: ['..kkk..', '.kmmk..', 'kmmk...', 'kmmk...', 'kmmmk..', '.kmmmkk', '..kkkk.'] },
  kraehe: { legend: { k: P.n0, K: P.n2, b: P.f5 }, rows: ['...kk..', '..kKKbb', '.kKKKk.', 'kKKKKk.', '.kKKKKk', '..b.b..', '.b..b..'] },
};

/** Muster der Rückseiten (Mitte, 11 × 11, einfarbig in der Tinte). */
const BACK_MOTIF = {
  laub: ['.....#.....', '....###....', '..#.###.#..', '..#######..', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....', '.....#.....', '....#......'],
  kuerbis: ['.....##....', '....##.....', '..#######..', '.##.###.##.', '##..###..##', '##..###..##', '##..###..##', '##..###..##', '.##.###.##.', '..#######..', '...........'],
  funk: ['.....#.....', '..#..#..#..', '.#...#...#.', '#..#.#.#..#', '#.#..#..#.#', '#.#.###.#.#', '#..#.#.#..#', '.#...#...#.', '..#.###.#..', '....#.#....', '...#...#...'],
  anker: ['....###....', '....#.#....', '....###....', '.....#.....', '..#######..', '.....#.....', '.....#.....', '#....#....#', '##...#...##', '.###.#.###.', '...#####...'],
  strick: ['#...#.#...#', '.#.#...#.#.', '..#.....#..', '#...#.#...#', '.#.#...#.#.', '..#.....#..', '#...#.#...#', '.#.#...#.#.', '..#.....#..', '#...#.#...#', '.#.#...#.#.'],
  kranich: ['........##.', '.......#..#', '.......#...', '......#....', '.....##....', '..#######..', '.#########.', '#...####...', '.....#.#...', '.....#..#..', '.....#...#.'],
  moewe: ['...........', '...........', '...........', '.##.....##.', '#..#...#..#', '....#.#....', '.....#.....', '...........', '..##...##..', '.#..#.#..#.', '.....#.....'],
};

const css = (hex) => hexToCss(hex);
const cache = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function paint(ctx, art, ox, oy) {
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const hex = art.legend[row[x]];
      if (hex === undefined) continue;
      ctx.fillStyle = css(hex);
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

function mono(ctx, rows, ox, oy, hex) {
  ctx.fillStyle = css(hex);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') ctx.fillRect(ox + x, oy + y, 1, 1);
  });
}

/** Umriss mit abgerundeten Ecken und Papier. */
function blank(ctx, paper, edge, shade) {
  ctx.fillStyle = css(P.n0);
  ctx.fillRect(1, 0, CARD_W - 2, CARD_H);
  ctx.fillRect(0, 1, CARD_W, CARD_H - 2);
  ctx.fillStyle = css(edge);
  ctx.fillRect(1, 1, CARD_W - 2, CARD_H - 2);
  ctx.fillStyle = css(paper);
  ctx.fillRect(2, 2, CARD_W - 4, CARD_H - 4);
  // Schatten unten und rechts, Licht oben
  ctx.fillStyle = css(shade);
  ctx.fillRect(2, CARD_H - 3, CARD_W - 4, 1);
  ctx.fillRect(CARD_W - 3, 2, 1, CARD_H - 4);
}

function buildFace(suit, v) {
  const c = canvas(CARD_W, CARD_H);
  const ctx = c.getContext('2d');
  blank(ctx, P.s9, P.s7, P.s8);
  const art = SUIT_ART[suit];
  mono(ctx, DIGITS[v], 4, 4, art.ink);
  paint(ctx, SUIT_SMALL[suit], CARD_W - 11, 4);
  paint(ctx, art, Math.floor((CARD_W - 11) / 2), CARD_H - 17);
  return c;
}

function buildBack(id) {
  const b = CARD_BACKS[id] || CARD_BACKS.laub;
  const c = canvas(CARD_W, CARD_H);
  const ctx = c.getContext('2d');
  const paper = P[b.paper];
  const ink = P[b.ink];
  blank(ctx, paper, ink, paper);
  // Rautenmuster aus einzelnen Pixeln, darin das Motiv
  ctx.fillStyle = css(ink);
  for (let y = 4; y < CARD_H - 4; y++) for (let x = 4; x < CARD_W - 4; x++) if ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0) if ((x * 7 + y * 3) % 2 === 0) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = css(paper);
  ctx.fillRect(6, 11, CARD_W - 12, 15);
  ctx.fillStyle = css(ink);
  ctx.fillRect(6, 11, CARD_W - 12, 1);
  ctx.fillRect(6, 25, CARD_W - 12, 1);
  mono(ctx, BACK_MOTIF[id] || BACK_MOTIF.laub, Math.floor((CARD_W - 11) / 2), 13, ink);
  return c;
}

/** Leinwand einer Vorderseite (Farbe, Wert) – zwischengespeichert. */
export function faceCanvas(suit, v) {
  const key = `${suit}${v}`;
  if (!cache.has(key)) cache.set(key, buildFace(suit, v));
  return cache.get(key);
}

/** Leinwand einer Rückseite – zwischengespeichert. */
export function backCanvas(id) {
  const key = `back:${id}`;
  if (!cache.has(key)) cache.set(key, buildBack(id));
  return cache.get(key);
}

/**
 * Eine Karte zeichnen. `card` = { suit, v } oder null (Rückseite). `squash` (0–1)
 * staucht die Breite fürs Umdrehen (drei Bilder: 0,7 – 0,3 – 0,08), `lift` hebt
 * sie an, `veil` legt ein Raster darüber (Mikas verdeckte Karte).
 */
export function drawCard(ctx, card, x, y, { back = 'laub', squash = 1, lift = 0, veil = false } = {}) {
  const img = card ? faceCanvas(card.suit, card.v) : backCanvas(back);
  const w = Math.max(1, Math.round(CARD_W * squash));
  const dx = Math.round(x + (CARD_W - w) / 2);
  const dy = Math.round(y - lift);
  ctx.drawImage(img, 0, 0, CARD_W, CARD_H, dx, dy, w, CARD_H);
  if (veil && card && squash >= 1) {
    // Verdeckt (nur Mika sieht den Wert): schräge Streifen über der unteren Hälfte
    ctx.fillStyle = css(P.n2);
    for (let yy = 16; yy < CARD_H - 2; yy++) for (let xx = 2; xx < CARD_W - 2; xx++) if ((xx + yy) % 4 === 0) ctx.fillRect(dx + xx, dy + yy, 1, 1);
  }
}

/** Die Stufen des Umdrehens: Breite je Bild (drei Bilder hin, drei zurück). */
export const FLIP_STEPS = [0.7, 0.3, 0.08];
