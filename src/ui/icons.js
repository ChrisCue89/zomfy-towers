// Pixel-Symbole für die Oberfläche, als Zeichenketten gemalt.
// Jedes Symbol: Legende (Zeichen -> Palettenfarbe) und Zeilen.

import { P, hexToCss } from '../render/palette.js';

const ICONS = {
  holz: {
    legend: { k: P.e1, b: P.e3, r: P.e6, R: P.e7, c: P.e8 },
    rows: [
      '...kkkk...',
      '.kkbbbbkk.',
      '.kbrrrrbk.',
      'kbrRRRRrbk',
      'kbrRccRrbk',
      'kbrRccRrbk',
      'kbrRRRRrbk',
      '.kbrrrrbk.',
      '.kkbbbbkk.',
      '...kkkk...',
    ],
  },
  stein: {
    legend: { k: P.s1, S: P.s6, s: P.s8, D: P.s4 },
    rows: [
      '..........',
      '....kkk...',
      '..kkSSSk..',
      '.kSSsSSSk.',
      '.kSsSSSSSk',
      'kSSSSSSDSk',
      'kSSSSSDDSk',
      'kDSSSDDDDk',
      '.kDDDDDDk.',
      '..kkkkkk..',
    ],
  },
  fasern: {
    legend: { g: P.g7, G: P.g5, t: P.e8, k: P.g2 },
    rows: [
      '.g..g..g..',
      '.g.g.g.g..',
      '..g.g.gg..',
      '..gGgGgg..',
      '..GgGgGG..',
      '..tttttt..',
      '..GgGgGG..',
      '..gGgGgg..',
      '..GGkGGk..',
      '..........',
    ],
  },
  schrott: {
    legend: { k: P.s1, S: P.s6, s: P.s8, r: P.r3 },
    rows: [
      '....kk....',
      '.kk.SS.kk.',
      '.kSSsSSSk.',
      '..SSkkSr..',
      'kSSk..kSSk',
      'kSsk..kSSk',
      '..SSkkrS..',
      '.kSSSSSSk.',
      '.kk.SS.kk.',
      '....kk....',
    ],
  },
  stoff: {
    legend: { k: P.b0, A: P.b3, B: P.b2, a: P.a4 },
    rows: [
      '..........',
      '.kkkkkkkk.',
      '.kAAAAAAk.',
      '.kAaAAaAk.',
      '.kAAAAAAk.',
      '.kBBBBBBk.',
      '.kAAAAAAk.',
      '.kAaAAaAk.',
      '.kkkkkkkk.',
      '..........',
    ],
  },
  technik: {
    legend: { k: P.s1, G: P.t3, g: P.t4, y: P.f6, l: P.s6 },
    rows: [
      '..l.l.l...',
      '..l.l.l...',
      '.kkkkkkk..',
      '.kGGGGGk..',
      '.kGyGgGk..',
      '.kGGGGGk..',
      '.kkkkkkk..',
      '..l.l.l...',
      '..l.l.l...',
      '..........',
    ],
  },
  laterne: {
    legend: { k: P.s1, M: P.s5, y: P.f5, Y: P.f6, W: P.f8 },
    rows: [
      '....kkkk....',
      '...k....k...',
      '....kkkk....',
      '..kkkkkkkk..',
      '..kMMMMMMk..',
      '..kyYYYYyk..',
      '..kYYWWYYk..',
      '..kYWWWWYk..',
      '..kYYWWYYk..',
      '..kyYYYYyk..',
      '..kMMMMMMk..',
      '..kkkkkkkk..',
      '...kkkkkk...',
    ],
  },
  laterneAus: {
    legend: { k: P.s1, M: P.s5, g: P.n6, G: P.n7, W: P.s8 },
    rows: [
      '....kkkk....',
      '...k....k...',
      '....kkkk....',
      '..kkkkkkkk..',
      '..kMMMMMMk..',
      '..kgGGGGgk..',
      '..kGGWGGGk..',
      '..kGWGGGGk..',
      '..kGGGGGGk..',
      '..kgGGGGgk..',
      '..kMMMMMMk..',
      '..kkkkkkkk..',
      '...kkkkkk...',
    ],
  },
  sonne: {
    legend: { y: P.f5, Y: P.f6, W: P.f8 },
    rows: [
      '.....y......',
      '.y...y...y..',
      '..y.....y...',
      '....YYY.....',
      '...YWWWY....',
      'yy.YWWWY.yy.',
      '...YWWWY....',
      '....YYY.....',
      '..y.....y...',
      '.y...y...y..',
      '.....y......',
      '............',
    ],
  },
  mond: {
    legend: { L: P.n8, M: P.n7, s: P.f7 },
    rows: [
      '............',
      '....LLL...s.',
      '..LLMM.....s',
      '..LMM.....s.',
      '.LMM........',
      '.LMM........',
      '.LMM........',
      '.LMMM.....L.',
      '..LMMMM..LL.',
      '..LLMMMMLL..',
      '....LLLL....',
      '............',
    ],
  },
  daemmerung: {
    legend: { y: P.f5, Y: P.f6, W: P.f8, h: P.d4 },
    rows: [
      '............',
      '............',
      '.....y......',
      '..y.....y...',
      '............',
      '....YYY.....',
      '...YWWWY....',
      '..YWWWWWY...',
      'hhhhhhhhhhhh',
      '..h..h..h...',
      '............',
      '............',
    ],
  },
  haus: {
    legend: { k: P.e1, R: P.r3, W: P.e6, Y: P.f6, D: P.e3 },
    rows: [
      '....kk....',
      '...kRRk...',
      '..kRRRRk..',
      '.kRRRRRRk.',
      'kRRRRRRRRk',
      '.kWWWWWWk.',
      '.kYYWkDWk.',
      '.kYYWkDWk.',
      '.kWWWkDWk.',
      '.kkkkkkkk.',
    ],
  },
  weiter: {
    legend: { c: P.e9 },
    rows: ['ccccc', '.ccc.', '..c..'],
  },
  zeiger: {
    legend: { c: P.f6 },
    rows: ['c...', 'cc..', 'ccc.', 'cc..', 'c...'],
  },
};

const cache = new Map();

function build(name) {
  const icon = ICONS[name];
  if (!icon) throw new Error(`Unbekanntes Symbol: ${name}`);
  const h = icon.rows.length;
  const w = Math.max(...icon.rows.map((r) => r.length));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  icon.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const hex = icon.legend[row[x]];
      if (hex === undefined) continue;
      ctx.fillStyle = hexToCss(hex);
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return canvas;
}

export function iconCanvas(name) {
  if (!cache.has(name)) cache.set(name, build(name));
  return cache.get(name);
}

export function drawIcon(ctx, name, x, y) {
  const c = iconCanvas(name);
  ctx.drawImage(c, Math.round(x), Math.round(y));
  return c;
}

export function iconSize(name) {
  const c = iconCanvas(name);
  return { w: c.width, h: c.height };
}
