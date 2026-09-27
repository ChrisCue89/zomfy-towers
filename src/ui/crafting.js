// Werkbank-Menü: Rezepte mit Kosten, W/S wählen, E herstellen, Esc schließen.
// Klicks werden in update() ausgewertet (siehe CLAUDE.md). Verwerten (Vorrat
// umwandeln) geht nur mit gehaltenem E bzw. gehaltener Maustaste – wie das
// Sammeln draußen: Ein Balken füllt die Zeile, jede Füllung wandelt einmal um.
// Ein kurzer Druck verwertet nichts, zeigt aber sofort, was zu tun ist.

import { T } from '../data/texts.js';
import { RECIPES } from '../data/recipes.js';
import { COLORS } from './ui.js';
import { drawIcon, iconSize } from './icons.js';
import { measure, LINE_HEIGHT } from './font.js';
import { canAfford } from '../core/inventory.js';

const ROW_H = 22;
const HOLD_FIRST = 0.5; // so lange halten bis zur ersten Umwandlung
const HOLD_REPEAT = 0.35; // jede weitere, solange gehalten wird
const TAP_HINT = 2.2;
const FLASH = 0.35;

/** Wandelt das Rezept nur Vorrat um (statt ein Werkzeug zu bauen)? */
const isConversion = (r) => Boolean(r.gives.inventory);

export class CraftingMenu {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.focus = 0;
    this.hold = null; // { id, t, count } – Verwerten läuft, solange gehalten wird
    this.tapHint = 0; // Hinweis »E halten« nach einem kurzen Druck
    this.flash = null; // { id, t } – Zeile leuchtet nach einer Umwandlung kurz auf
  }

  open() {
    this.isOpen = true;
    this.hold = null;
    this.tapHint = 0;
    this.flash = null;
    // Zuerst ein Werkzeug, das man sich leisten kann – nie ein Verwerten-Rezept
    const list = this.recipes();
    const first = list.findIndex((r) => r.affordable && !isConversion(r));
    const open = list.findIndex((r) => !r.owned && !isConversion(r));
    this.focus = first >= 0 ? first : Math.max(0, open);
  }

  close() {
    this.isOpen = false;
  }

  recipes() {
    const g = this.game;
    return RECIPES.map((r) => {
      const owned = r.once && ((r.gives.tool && g.state.tools[r.gives.tool]) || (r.gives.weapon && g.state.weapons[r.gives.weapon]));
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

  /**
   * @param {import('../core/input.js').Input} input
   * @param {number} dt
   */
  update(input, dt = 0) {
    if (!this.isOpen) return;
    const ui = this.game.ui;
    const L = this.layout(ui);
    const before = this.focus;
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
    this.tapHint = Math.max(0, this.tapHint - dt);
    if (this.flash && (this.flash.t -= dt) <= 0) this.flash = null;
    const r = L.rows[this.focus]?.recipe;
    if (!r) return;
    const started = input.pressed('confirm') || clicked;
    if (!isConversion(r)) {
      this.hold = null;
      if (started) this.game.craft(r);
      return;
    }
    // Verwerten: nur solange E (bzw. die Maus auf der Zeile) gehalten wird
    if (started && r.affordable) this.hold = { id: r.id, t: 0, count: 0 };
    else if (started) this.game.craft(r); // zu wenig Vorrat: sagt »Dafür fehlt noch etwas«
    const mouseHold = input.mouse.down && hovered === this.focus;
    if (!this.hold || this.hold.id !== r.id || this.focus !== before) {
      this.hold = null;
      return;
    }
    if (!input.isDown('confirm') && !mouseHold) {
      if (this.hold.count === 0) this.tapHint = TAP_HINT; // losgelassen, bevor etwas passiert ist
      this.hold = null;
      return;
    }
    this.hold.t += dt;
    if (this.hold.t < (this.hold.count ? HOLD_REPEAT : HOLD_FIRST)) return;
    this.hold.t = 0;
    const current = this.recipes().find((x) => x.id === r.id);
    if (current?.affordable && this.game.craft(current)) {
      this.hold.count += 1;
      this.flash = { id: r.id, t: FLASH };
      this.tapHint = 0;
    } else {
      this.hold = null; // Vorrat aufgebraucht
    }
  }

  /** Füllstand des Haltebalkens für ein Rezept (0…1). */
  holdProgress(id) {
    if (!this.hold || this.hold.id !== id) return 0;
    return Math.min(1, this.hold.t / (this.hold.count ? HOLD_REPEAT : HOLD_FIRST));
  }

  /** Unterkante des Fensters samt Info-Zeile (Meldungen erscheinen darunter). */
  bottom(ui) {
    const L = this.layout(ui);
    return L.y + L.h + LINE_HEIGHT + 14;
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
      const flashing = this.flash?.id === r.id;
      ui.inset(rect.x, rect.y, rect.w, rect.h, { fill: focused ? COLORS.fillHover : COLORS.inset, border: flashing ? COLORS.text : focused ? COLORS.gold : COLORS.frameDark });
      // Haltebalken beim Verwerten (unten in der Zeile)
      const progress = this.holdProgress(r.id);
      if (progress > 0) ui.rect(rect.x + 2, rect.y + rect.h - 3, Math.round((rect.w - 4) * progress), 2, COLORS.gold);
      if (flashing) ui.rect(rect.x + 2, rect.y + rect.h - 3, rect.w - 4, 2, COLORS.text);
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
    // Gewählte Zeile: was kommt dabei heraus? (Verwerten: »E halten: …«)
    const r = L.rows[this.focus]?.recipe;
    if (r) {
      const conversion = isConversion(r) && !r.owned;
      const loud = conversion && (this.tapHint > 0 || this.hold);
      const info = conversion ? T.werkbank.halten(T.rezeptInfo[r.id]) : T.rezeptInfo[r.id];
      const w = measure(info) + 12;
      ui.panel(Math.round(L.x + (L.w - w) / 2), L.y + L.h + 4, w, LINE_HEIGHT + 6, loud ? { frame: COLORS.gold } : undefined);
      ui.text(info, Math.round(L.x + (L.w - w) / 2) + 6, L.y + L.h + 6, loud ? COLORS.gold : COLORS.textWarm);
    }
  }
}
