// A5: Das Bild zum Kochen (core/cooking.js). Unten ein Feld wie beim Angeln: bei der Wahl drei
// Kacheln mit den Gerichten (Bild, Name, was hineinkommt, ein Herz beim Lieblingsgericht des
// Gegenübers), beim Schnippeln das Brett mit Messer und Schnittmarke, beim Würzen drei Gläser, beim
// Köcheln die Leiste vom rohen über das goldene Fenster bis »angebrannt«. Am Ende liegt die Karte
// mit der Schüssel kurz in der Mitte (wie Fangkarte und Lieferkarte, N4).

import { COLORS } from './ui.js';
import { measure, wrap, drawText, LINE_HEIGHT } from './font.js';
import { hexToCss, P } from '../render/palette.js';
import { renderVoxelPortrait } from '../render/portrait.js';
import { buildDishBowl } from '../world/cookModels.js';
import { COOKING, DISHES, DISH_ORDER, SPICES, missingFor } from '../data/cooking.js';
import { T } from '../data/texts.js';
import { personOf } from '../core/survivors.js';

const PAPER = hexToCss(P.e9);
const PAPER_DARK = hexToCss(P.e8);
const INK = hexToCss(P.n1);
const INK_SOFT = hexToCss(P.e3);
const HEAD = hexToCss(P.r1);
const BOARD = hexToCss(P.e6);
const BOARD_DARK = hexToCss(P.e4);
const BOARD_LIGHT = hexToCss(P.e7);
const MARK = hexToCss(P.g6);
const BLADE = hexToCss(P.s8);
const HANDLE = hexToCss(P.e2);
const HEART = hexToCss(P.r3);
const RAW = hexToCss(P.e8);
const GOLD = hexToCss(P.f5);
const BURNT = hexToCss(P.e1);
const JARS = { salz: [P.s9, P.s7], kraeuter: [P.g6, P.g4], pfeffer: [P.n2, P.s3] };

const pictures = new Map();

/** Bild eines Gerichts (Schüssel) – klein für die Kacheln, groß für die Karte; einmal je Größe. */
function dishPicture(id, big) {
  const key = `${id}:${big ? 1 : 0}`;
  if (!pictures.has(key)) pictures.set(key, renderVoxelPortrait(buildDishBowl(id), big ? { size: 92, top: 18, w: 3, t: 2, f: 2 } : { size: 36, top: 5, w: 1, t: 1, f: 1 }));
  return pictures.get(key);
}

/** Kleines Pixelherz (5 × 4). */
function heart(ctx, x, y) {
  ctx.fillStyle = HEART;
  for (const [dx, dy, w] of [[0, 0, 2], [3, 0, 2], [0, 1, 5], [1, 2, 3], [2, 3, 1]]) ctx.fillRect(x + dx, y + dy, w, 1);
}

/** Ein Holzlöffel (7 × 12): runde Laffe oben, schmaler Stiel; voll golden, sonst nur blass. */
const SPOON = ['..kkk..', '.kolok.', 'koooook', 'koooook', '.kooook', '..kok..', '..kok..', '..kok..', '..kok..', '..kok..', '..kok..', '..kkk..'];
function spoon(ctx, x, y, full) {
  const col = { k: full ? hexToCss(P.e2) : hexToCss(P.e7), o: full ? GOLD : PAPER_DARK, l: full ? hexToCss(P.f6) : PAPER_DARK };
  SPOON.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const c = col[row[dx]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  });
}

export class CookingView {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.session = null;
  }

  open(session) {
    this.session = session;
  }

  close() {
    this.session = null;
  }

  draw(ui) {
    const s = this.session;
    if (!s) return;
    if (s.phase === 'essen' && s.card) this.drawCard(ui, s.card);
    else this.drawPanel(ui);
  }

  /** Das Feld unten. */
  drawPanel(ui) {
    const s = this.session;
    const K = T.kochen;
    const w = 236;
    const h = s.phase === 'wahl' ? 84 : 52;
    const x = Math.round((ui.width - w) / 2);
    const y = ui.height - h - 10;
    ui.panel(x, y, w, h);
    const hint = K.hinweise[s.phase];
    ui.textCentered(typeof hint === 'function' ? hint(personOf(s.friend)?.name || '') : hint || '', x + w / 2, y + 4, COLORS.text);
    if (s.phase === 'wahl') this.drawChoice(ui, x, y, w);
    else if (s.phase === 'schnippeln') this.drawBoard(ui, x, y, w);
    else if (s.phase === 'wuerzen') this.drawJars(ui, x, y, w);
    else if (s.phase === 'koecheln') this.drawPot(ui, x, y, w);
    if (s.message) ui.textCentered(s.message.text, x + w / 2, y - 12, COLORS.buildBad, { outline: COLORS.outline });
  }

  /** Drei Kacheln: Bild, Name, Zutaten (oder was fehlt), ein Herz fürs Lieblingsgericht. */
  drawChoice(ui, x, y, w) {
    const s = this.session;
    const ctx = ui.ctx;
    const st = this.game.state;
    const tw = 72;
    const gap = 4;
    const x0 = x + Math.round((w - (tw * 3 + gap * 2)) / 2);
    DISH_ORDER.forEach((id, k) => {
      const tx = x0 + k * (tw + gap);
      const ty = y + 16;
      const sel = k === s.choice;
      const missing = missingFor(st, id);
      const ok = !Object.keys(missing).length;
      ui.panel(tx, ty, tw, 62, { fill: sel ? COLORS.fillHover : COLORS.fill, frame: sel ? COLORS.gold : COLORS.frame, highlight: null });
      const pic = dishPicture(id, false);
      ctx.globalAlpha = ok ? 1 : 0.45;
      ctx.drawImage(pic, tx + Math.round((tw - pic.width) / 2), ty + 3);
      ctx.globalAlpha = 1;
      if (id === s.taste.dish) heart(ctx, tx + tw - 9, ty + 4);
      const name = T.kochen.kurz[id];
      ui.textCentered(name, tx + tw / 2, ty + 36, sel ? COLORS.gold : ok ? COLORS.text : COLORS.textDim);
      const need = ok ? Object.entries(DISHES[id].need).map(([r, n]) => T.kochen.zutat(n, r)).join(', ') : T.kochen.fehltKurz(Object.entries(missing).map(([r, n]) => T.kochen.zutat(n, r)).join(', '));
      const line = measure(need) > tw - 4 ? need.split(', ')[0] + (need.includes(', ') ? ' …' : '') : need;
      ui.textCentered(line, tx + tw / 2, ty + 47, ok ? COLORS.textDim : COLORS.buildBad);
    });
  }

  /** Das Brett: die Zutat, die Schnittmarke, das Messer; darunter die Schnitte. */
  drawBoard(ui, x, y, w) {
    const s = this.session;
    const ctx = ui.ctx;
    const bx = x + 16;
    const bw = w - 32;
    const by = y + 17;
    ui.rect(bx - 1, by - 1, bw + 2, 16, COLORS.outline);
    ui.rect(bx, by, bw, 14, BOARD);
    ui.rect(bx, by, bw, 1, BOARD_LIGHT);
    ui.rect(bx, by + 13, bw, 1, BOARD_DARK);
    for (let k = 0; k < bw; k += 11) ui.rect(bx + k, by + 4 + (k % 3), 4, 1, BOARD_DARK); // Maserung
    // die Schnittmarke
    const zw = Math.max(4, Math.round(COOKING.zone * bw));
    ui.rect(bx + Math.round(s.mark * bw - zw / 2), by + 1, zw, 12, MARK);
    // das Messer: Klinge und Griff
    const kx = bx + Math.round(s.knife * (bw - 1));
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(kx - 1, by - 7, 3, 21);
    ctx.fillStyle = BLADE;
    ctx.fillRect(kx, by - 2, 1, 15);
    ctx.fillStyle = HANDLE;
    ctx.fillRect(kx, by - 6, 1, 4);
    // die Schnitte: gold sauber, rot ungleich, grau noch offen
    const n = COOKING.cuts;
    const px = x + Math.round(w / 2 - (n * 8) / 2);
    for (let k = 0; k < n; k++) {
      const c = s.cuts[k];
      ui.rect(px + k * 8, y + 38, 6, 6, COLORS.outline);
      ui.rect(px + k * 8 + 1, y + 39, 4, 4, c === undefined ? COLORS.textDim : c ? COLORS.gold : COLORS.buildBad);
    }
  }

  /** Drei Gläser: Salz, Kräuter, Pfeffer – das gewählte steht etwas höher. */
  drawJars(ui, x, y, w) {
    const s = this.session;
    const ctx = ui.ctx;
    const gap = 64;
    const x0 = x + Math.round(w / 2 - gap);
    SPICES.forEach((id, k) => {
      const sel = k === s.spice;
      const jx = x0 + k * gap - 6;
      const jy = y + 17 - (sel ? 2 : 0);
      const [fill, dark] = JARS[id].map(hexToCss);
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(jx - 1, jy - 1, 14, 18);
      ctx.fillStyle = hexToCss(P.e3); // Deckel
      ctx.fillRect(jx + 1, jy, 10, 3);
      ctx.fillStyle = hexToCss(P.n6); // Glas
      ctx.fillRect(jx, jy + 3, 12, 13);
      ctx.fillStyle = fill; // Inhalt
      ctx.fillRect(jx + 1, jy + 7, 10, 8);
      ctx.fillStyle = dark;
      for (let k2 = 0; k2 < 5; k2++) ctx.fillRect(jx + 2 + ((k2 * 3) % 8), jy + 9 + (k2 % 3) * 2, 1, 1);
      ctx.fillStyle = hexToCss(P.n8);
      ctx.fillRect(jx + 1, jy + 4, 1, 9); // Glanz
      if (sel) {
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(jx - 2, jy + 18, 16, 1);
      }
      ui.textCentered(T.kochen.gewuerze[id], jx + 6, y + 37, sel ? COLORS.gold : COLORS.textDim);
    });
  }

  /** Der Kessel: roh – golden – angebrannt, die Marke wandert; darüber Blasen. */
  drawPot(ui, x, y, w) {
    const s = this.session;
    const ctx = ui.ctx;
    const bx = x + 16;
    const bw = w - 32;
    const by = y + 20;
    const [a, b] = COOKING.window;
    ui.rect(bx - 1, by - 1, bw + 2, 10, COLORS.outline);
    ui.rect(bx, by, Math.round(bw * a), 8, RAW);
    ui.rect(bx + Math.round(bw * a), by, Math.round(bw * (b - a)), 8, GOLD);
    ui.rect(bx + Math.round(bw * b), by, bw - Math.round(bw * b), 8, BURNT);
    const mx = bx + Math.round(Math.min(1, s.boil) * (bw - 1));
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(mx - 2, by - 4, 5, 16);
    ctx.fillStyle = COLORS.text;
    ctx.fillRect(mx - 1, by - 3, 3, 14);
    // Blasen über der Leiste, je heißer, desto mehr
    const n = 2 + Math.floor(s.boil * 6);
    for (let k = 0; k < n; k++) {
      const t = (s.t * 1.6 + k * 0.37) % 1;
      const bxk = bx + ((k * 47) % bw);
      ui.rect(bxk, by - 3 - Math.round(t * 8), 2, 2, k % 2 ? COLORS.textDim : COLORS.text);
    }
    ui.textCentered(T.kochen.vomFeuer, x + w / 2, y + 36, COLORS.textDim);
  }

  /** Die Karte am Ende: das Gericht in der Schüssel, Löffel, der Satz des Gegenübers, die Wirkung. */
  drawCard(ui, c) {
    const ctx = ui.ctx;
    const K = T.kochen;
    const w = 236;
    const lines = wrap(`„${c.line}“`, w - 28);
    const h = 22 + 92 + 6 + LINE_HEIGHT + 14 + lines.length * LINE_HEIGHT + 6 + LINE_HEIGHT + 22;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.max(8, Math.round((ui.height - h) / 2) - 20);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x + 3, y + 3, w, h);
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = HEAD;
    ctx.fillRect(x, y, w, 18);
    drawText(ctx, K.karte, x + Math.round((w - measure(K.karte)) / 2), y + 3, COLORS.text);
    const pic = dishPicture(c.dish, true);
    ctx.drawImage(pic, x + Math.round((w - pic.width) / 2), y + 22);
    let ty = y + 22 + 92 + 6;
    const name = K.namen[c.dish];
    drawText(ctx, name, x + Math.round((w - measure(name)) / 2), ty, INK);
    ty += LINE_HEIGHT + 2;
    for (let k = 0; k < 3; k++) spoon(ctx, x + Math.round(w / 2) - 14 + k * 10, ty, k < c.spoons);
    ty += 16;
    for (const line of lines) {
      drawText(ctx, line, x + 14, ty, INK);
      ty += LINE_HEIGHT;
    }
    ty += 6;
    drawText(ctx, c.effect, x + Math.round((w - measure(c.effect)) / 2), ty, hexToCss(P.r2));
    drawText(ctx, K.weiter, x + Math.round((w - measure(K.weiter)) / 2), y + h - 15, INK_SOFT);
  }
}
