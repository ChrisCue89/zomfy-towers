// A6: Das Schnitzfenster (core/festival.js, Modus 'schnitzen'). Unten ein Feld wie beim Kochen:
// links der Kürbis mit dem Gesicht, wie es gerade gewählt ist (Augen, Nase und Mund aus den Formen
// in data/festival.js – das Licht scheint durch, die Schnittkanten sind hell), rechts die drei
// Zeilen zum Wählen. W/S wechselt die Zeile, A/D die Form, E schnitzt, Esc legt das Messer weg.

import { COLORS } from './ui.js';
import { measure } from './font.js';
import { hexToCss, P } from '../render/palette.js';
import { faceGrid, faceOfChoice, EYE_ORDER, NOSE_ORDER, MOUTH_ORDER } from '../data/festival.js';
import { T } from '../data/texts.js';

const SKIN = [P.f2, P.f3, P.f4, P.f5].map(hexToCss); // Schatten unten rechts … Licht oben links
const RIB = hexToCss(P.f2);
const STEM = [hexToCss(P.g3), hexToCss(P.g5)];
const OUTLINE = hexToCss(P.e1);
const GLOW = hexToCss(P.f7);
const GLOW_DEEP = hexToCss(P.f6);
const CUT = hexToCss(P.f8);
const CELL = 3; // Bildpunkte je Feld des Gesichts

export class CarveView {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.rect = null;
  }

  draw(ui) {
    const c = this.game.festival.carving;
    if (!c) {
      this.rect = null;
      return;
    }
    const w = 280;
    const h = 96;
    const x = Math.round((ui.width - w) / 2);
    const y = ui.height - h - 10;
    ui.panel(x, y, w, h);
    this.rect = { x, y, w, h };
    this.drawPumpkin(ui.ctx, x + 10, y + 10, faceGrid(faceOfChoice(c.choice)));
    const lx = x + 98;
    ui.text(T.fest.titel, lx, y + 6, COLORS.gold);
    const names = [T.fest.augen, T.fest.nase, T.fest.mund];
    const orders = [EYE_ORDER, NOSE_ORDER, MOUTH_ORDER];
    for (let r = 0; r < 3; r++) {
      const ry = y + 22 + r * 16;
      const sel = r === c.row;
      if (sel) ui.rect(lx - 4, ry - 2, x + w - lx - 4, 14, COLORS.fillHover);
      ui.text(T.fest.zeilen[r], lx, ry, sel ? COLORS.gold : COLORS.textDim);
      const name = names[r][orders[r][c.choice[r]]];
      const vx = lx + 54;
      ui.text('<', vx, ry, sel ? COLORS.gold : COLORS.textDim);
      ui.textCentered(name, vx + 54, ry, sel ? COLORS.text : COLORS.textDim);
      ui.text('>', vx + 104, ry, sel ? COLORS.gold : COLORS.textDim);
    }
    const hint = T.fest.hilfe;
    ui.text(hint, x + w - 6 - measure(hint), y + h - 14, COLORS.textDim);
  }

  /** Der Kürbis (78 × 70): Rippen, Stiel, das Gesicht – geschnitzt scheint das Licht durch. */
  drawPumpkin(ctx, x, y, grid) {
    const W = 78;
    const H = 66;
    const cx = x + W / 2;
    const cy = y + 8 + H / 2;
    // Stiel
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(cx - 3, y, 7, 11);
    ctx.fillStyle = STEM[0];
    ctx.fillRect(cx - 2, y + 1, 5, 10);
    ctx.fillStyle = STEM[1];
    ctx.fillRect(cx - 1, y + 1, 2, 9);
    // Körper: Ellipse mit Rippen, Licht von oben links
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const dx = (px + 0.5 - W / 2) / (W / 2);
        const dy = (py + 0.5 - H / 2) / (H / 2);
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        const X = x + px;
        const Y = y + 8 + py;
        if (d > 0.9) {
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(X, Y, 1, 1);
          continue;
        }
        // Rippen: fünf Furchen, nach außen gebogen
        const u = dx / Math.sqrt(Math.max(0.05, 1 - dy * dy * 0.85));
        const rib = Math.abs(((u * 2.5 + 2.5) % 1) - 0.5) < 0.06 && Math.abs(u) < 0.98;
        const light = -dx * 0.6 - dy * 0.8 + (1 - d) * 0.8;
        const tone = light > 0.75 ? 3 : light > 0.15 ? 2 : light > -0.45 ? 1 : 0;
        ctx.fillStyle = rib ? (tone >= 2 ? SKIN[1] : RIB) : SKIN[tone];
        ctx.fillRect(X, Y, 1, 1);
      }
    }
    // Gesicht: 15 × 10 Felder, mittig, etwas unter der Mitte
    const fx = Math.round(cx - (15 * CELL) / 2);
    const fy = Math.round(cy - (10 * CELL) / 2 + 3);
    grid.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== '#') continue;
        const X = fx + i * CELL;
        const Y = fy + r * CELL;
        ctx.fillStyle = GLOW_DEEP;
        ctx.fillRect(X, Y, CELL, CELL);
        ctx.fillStyle = GLOW;
        ctx.fillRect(X, Y + 1, CELL, CELL - 1);
        // helle Schnittkante oben, wo kein Loch darüber ist
        if (r === 0 || grid[r - 1][i] !== '#') {
          ctx.fillStyle = CUT;
          ctx.fillRect(X, Y, CELL, 1);
        }
      }
    });
  }
}
