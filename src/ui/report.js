// Morgenbericht (DESIGN.md 6.12): besiegte Schlurfer, eingesammeltes Loot,
// Schäden – und nach einer verlorenen Nacht, was weg ist. E, Leertaste oder
// Klick schließt ihn.

import { T } from '../data/texts.js';
import { RESOURCES } from '../data/items.js';
import { COLORS } from './ui.js';
import { measure, LINE_HEIGHT } from './font.js';
import { drawIcon } from './icons.js';

export class ReportPanel {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.report = null;
    this.time = 0;
  }

  open(report) {
    this.report = report;
    this.time = 0;
  }

  get isOpen() {
    return Boolean(this.report);
  }

  /** @param {import('../core/input.js').Input} input */
  update(dt, input) {
    if (!this.report) return false;
    this.time += dt;
    // Auch Loslaufen schließt ihn (m5-r1: WASD bei offenem Bericht fühlte sich wie Festhängen an)
    const move = this.time > 0.8 && (input.pressed('up') || input.pressed('down') || input.pressed('left') || input.pressed('right'));
    if (move || (this.time > 0.4 && (input.pressed('confirm') || input.mouse.clicked || input.pressed('menu')))) {
      input.consumeClick();
      this.report = null;
      return true;
    }
    return false;
  }

  lines() {
    const r = this.report;
    const out = [];
    out.push({ text: T.bericht.besiegt(r.kills) });
    out.push({ text: T.bericht.eingesammelt, res: r.loot, empty: T.bericht.nichts });
    if (r.preLoss > 0) out.push({ text: T.bericht.vorher(Math.round(r.preLoss)) });
    out.push({ text: r.fell ? T.bericht.gefallen(r.homeNow, r.homeMax) : T.bericht.zuhause(r.homeLost, r.homeNow, r.homeMax) });
    if (r.broken) out.push({ text: T.bericht.kaputt(r.broken) });
    if (r.lootLeft > 0) out.push({ text: T.bericht.beuteDraussen(r.lootLeft), warm: true });
    // Überlebende und Gemütlichkeit am Morgen (Meilenstein 6)
    for (const e of r.extra || []) out.push({ text: e.text, res: e.res, warm: !e.res });
    if (!r.won && r.losses) {
      out.push({ text: T.bericht.verlust, res: r.losses, bad: true, empty: T.bericht.nichts });
      out.push({ text: T.bericht.trost(r.damaged), dim: true });
    } else if (r.won) {
      // Ein Gedanke von Mika zum Schluss (m3-r1: »sehr nüchtern«)
      const heil = !r.homeLost && !r.broken && (r.homeNow === undefined || r.homeNow >= r.homeMax);
      out.push({ text: heil ? T.bericht.schlussHeil : T.bericht.schlussKratzer, dim: true });
    }
    return out;
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    const r = this.report;
    if (!r) return;
    const lines = this.lines();
    const resW = (res) => Object.entries(res || {}).filter(([, n]) => n > 0).reduce((w, [, n]) => w + 14 + measure(String(n)) + 6, 0);
    const w = Math.min(ui.width - 16, Math.max(240, ...lines.map((l) => measure(l.text) + (l.res ? resW(l.res) + 8 : 0) + 24)));
    const h = 34 + lines.length * (LINE_HEIGHT + 3) + 16;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 16;
    ui.ditherFill(0.4);
    ui.panel(x, y, w, h);
    const title = r.won ? T.bericht.gewonnen(r.n) : T.bericht.verloren(r.n);
    ui.textCentered(title, x + w / 2, y + 6, r.won ? COLORS.gold : COLORS.buildBad);
    ui.rect(x + 10, y + 20, w - 20, 1, COLORS.frameDark);
    let cy = y + 27;
    for (const l of lines) {
      ui.text(l.text, x + 12, cy, l.dim ? COLORS.textDim : l.warm ? COLORS.gold : COLORS.text);
      if (l.res) {
        let cx = x + 12 + measure(l.text) + 8;
        const entries = RESOURCES.map((res) => [res, l.res[res] || 0]).filter(([, n]) => n > 0);
        if (!entries.length) ui.text(l.empty, cx, cy, COLORS.textDim);
        for (const [res, n] of entries) {
          drawIcon(ui.ctx, res, cx, cy + 1);
          ui.text(String(n), cx + 12, cy, l.bad ? COLORS.buildBad : COLORS.textWarm);
          cx += 14 + measure(String(n)) + 6;
        }
      }
      cy += LINE_HEIGHT + 3;
    }
    if (this.time > 0.4 && Math.floor(this.time * 2.5) % 2 === 0) ui.textCentered(T.bericht.weiter, x + w / 2, y + h - 15, COLORS.textDim);
  }
}
