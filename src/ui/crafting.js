// Werkbank-Menü: Rezepte mit Kosten, W/S wählen, E herstellen, Esc schließen.
// Klicks werden in update() ausgewertet (siehe CLAUDE.md).

import { T } from '../data/texts.js';
import { RECIPES } from '../data/recipes.js';
import { COLORS } from './ui.js';
import { drawIcon, iconSize } from './icons.js';
import { measure, LINE_HEIGHT } from './font.js';
import { canAfford } from '../core/inventory.js';

const ROW_H = 22;

export class CraftingMenu {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.focus = 0;
  }

  open() {
    this.isOpen = true;
    this.focus = 0;
  }

  close() {
    this.isOpen = false;
  }

  recipes() {
    const g = this.game;
    return RECIPES.map((r) => {
      const owned = r.once && r.gives.tool && g.state.tools[r.gives.tool];
      return { ...r, owned, affordable: !owned && canAfford(g.state.inventory, r.cost) };
    });
  }

  layout(ui) {
    const list = this.recipes();
    const w = 300;
    const h = 34 + list.length * ROW_H + 18;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 20;
    const rows = list.map((r, k) => ({ recipe: r, rect: { x: x + 8, y: y + 28 + k * ROW_H, w: w - 16, h: ROW_H - 2 } }));
    return { x, y, w, h, rows };
  }

  /** @param {import('../core/input.js').Input} input */
  update(input) {
    if (!this.isOpen) return;
    const ui = this.game.ui;
    const L = this.layout(ui);
    const hovered = L.rows.findIndex((r) => ui.hover(r.rect.x, r.rect.y, r.rect.w, r.rect.h));
    if (hovered >= 0 && input.mouse.moved) this.focus = hovered;
    if (input.pressed('up')) this.focus = (this.focus + L.rows.length - 1) % L.rows.length;
    if (input.pressed('down')) this.focus = (this.focus + 1) % L.rows.length;
    if (input.pressed('menu')) {
      this.game.closeCrafting();
      return;
    }
    const clicked = hovered >= 0 && input.mouse.clicked;
    if (clicked) {
      input.consumeClick();
      this.focus = hovered;
    }
    if (input.pressed('confirm') || clicked) {
      const row = L.rows[this.focus];
      if (row) this.game.craft(row.recipe);
    }
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.isOpen) return;
    const L = this.layout(ui);
    const inv = this.game.state.inventory;
    ui.ditherFill(0.35);
    ui.panel(L.x, L.y, L.w, L.h);
    ui.textCentered(T.werkbank.titel, L.x + L.w / 2, L.y + 6, COLORS.gold);
    ui.rect(L.x + 10, L.y + 20, L.w - 20, 1, COLORS.frameDark);
    L.rows.forEach((row, k) => {
      const { recipe: r, rect } = row;
      const focused = k === this.focus;
      ui.inset(rect.x, rect.y, rect.w, rect.h, { fill: focused ? COLORS.fillHover : COLORS.inset, border: focused ? COLORS.gold : COLORS.frameDark });
      const size = iconSize(r.icon);
      drawIcon(ui.ctx, r.icon, rect.x + 4 + Math.floor((12 - size.w) / 2), rect.y + Math.floor((rect.h - size.h) / 2));
      ui.text(T.rezepte[r.id], rect.x + 20, rect.y + 3, r.owned ? COLORS.textDim : r.affordable ? COLORS.text : COLORS.textDim);
      // Kosten rechtsbündig
      let cx = rect.x + rect.w - 6;
      if (r.owned) {
        const t = T.werkbank.vorhanden;
        ui.text(t, cx - measure(t), rect.y + 3, COLORS.textDim);
        return;
      }
      for (const [res, v] of Object.entries(r.cost).reverse()) {
        const text = String(v);
        cx -= measure(text);
        ui.text(text, cx, rect.y + 3, (inv[res] || 0) >= v ? COLORS.text : COLORS.red);
        cx -= 12;
        drawIcon(ui.ctx, res, cx, rect.y + 5);
        cx -= 6;
      }
    });
    ui.textCentered(T.werkbank.hinweis, L.x + L.w / 2, L.y + L.h - 14, COLORS.textDim);
    // Gewählte Zeile: was kommt dabei heraus?
    const r = L.rows[this.focus]?.recipe;
    if (r) {
      const info = T.rezeptInfo[r.id];
      const w = measure(info) + 12;
      ui.panel(Math.round(L.x + (L.w - w) / 2), L.y + L.h + 4, w, LINE_HEIGHT + 6);
      ui.text(info, Math.round(L.x + (L.w - w) / 2) + 6, L.y + L.h + 6, COLORS.textWarm);
    }
  }
}
