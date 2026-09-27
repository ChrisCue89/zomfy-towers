// Werkbank-Menü: Rezepte mit Kosten, W/S wählen, E herstellen, Esc schließen.
// Klicks werden in update() ausgewertet (siehe CLAUDE.md). Verwerten (Vorrat
// umwandeln): Ein Druck wandelt einmal um, gehaltenes E bzw. gehaltene
// Maustaste macht gemächlich weiter – ein Balken füllt die Zeile bis zur
// nächsten Umwandlung, ein Zähler zeigt, wie viel schon dabei herauskam (m3-r2).
// Dasselbe Fenster dient als Balduins Handel am Boot (Quelle »haendler«, M8/M9):
// Seine Angebote sind Umwandlungen wie das Verwerten, oben steht sein Spruch.

import { T } from '../data/texts.js';
import { RECIPES } from '../data/recipes.js';
import { COLORS } from './ui.js';
import { drawIcon, iconSize } from './icons.js';
import { measure, LINE_HEIGHT } from './font.js';
import { canAfford } from '../core/inventory.js';
import { WEAPONS } from '../data/weapons.js';

const num = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

const ROW_H = 22;
const HOLD_FIRST = 0.9; // so lange halten bis zur zweiten Umwandlung (ein langer Druck ist noch keiner)
const HOLD_REPEAT = 0.6; // jede weitere, solange gehalten wird
const FLASH = 0.35;
const COUNTER = 1.6; // so lange bleibt der Zähler nach dem Loslassen stehen
const OPEN_LOCK = 0.6; // gleich nach dem Öffnen stellt E nichts her (schnelles Durchdrücken, m4-r1; m7-r1: 0,3 s reichten Jonas nicht)
const MASH_GAP = 0.3; // Werkzeug/Waffe: ein Druck zählt nur, wenn davor so lange keiner kam – Hämmern auf E baut nichts (m7-r1)

/** Wandelt das Rezept nur Vorrat um (statt ein Werkzeug zu bauen)? */
const isConversion = (r) => Boolean(r.gives.inventory);

export class CraftingMenu {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.focus = 0;
    this.hold = null; // { id, t, count } – Verwerten läuft, solange gehalten wird
    this.openT = 0; // seit wann offen (s)
    this.counter = null; // { id, count, t } – »+n« an der Zeile
    this.flash = null; // { id, t } – Zeile leuchtet nach einer Umwandlung kurz auf
    this.source = 'werkbank'; // oder 'haendler'
  }

  get shop() {
    return this.source === 'haendler';
  }

  open(source = 'werkbank') {
    this.source = source;
    this.isOpen = true;
    this.openT = 0;
    this.lastPressAt = null;
    this.hold = null;
    this.counter = null;
    this.flash = null;
    // Zuerst ein Werkzeug, das man sich leisten kann – nie ein Verwerten-Rezept;
    // beim Händler das erste bezahlbare Angebot
    const list = this.recipes();
    if (this.shop) {
      this.focus = Math.max(0, list.findIndex((r) => r.affordable));
      return;
    }
    const first = list.findIndex((r) => r.affordable && !isConversion(r));
    const open = list.findIndex((r) => !r.owned && !isConversion(r));
    this.focus = first >= 0 ? first : Math.max(0, open);
  }

  close() {
    this.isOpen = false;
  }

  recipes() {
    const g = this.game;
    if (this.shop) return g.trader.offers();
    return RECIPES.map((r) => {
      const owned = r.once && ((r.gives.tool && g.state.tools[r.gives.tool]) || (r.gives.weapon && g.state.weapons[r.gives.weapon]));
      return { ...r, owned, affordable: !owned && canAfford(g.state.inventory, r.cost) };
    });
  }

  layout(ui) {
    const list = this.recipes();
    const w = 300;
    const head = this.shop ? 28 + LINE_HEIGHT : 28; // beim Händler: Spruch unter dem Titel
    const h = head + 6 + list.length * ROW_H + 18;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 20;
    const rows = list.map((r, k) => ({ recipe: r, rect: { x: x + 8, y: y + head + k * ROW_H, w: w - 16, h: ROW_H - 2 } }));
    return { x, y, w, h, rows };
  }

  /**
   * @param {import('../core/input.js').Input} input
   * @param {number} dt
   */
  update(input, dt = 0) {
    if (!this.isOpen) return;
    this.openT += dt;
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
    if (this.flash && (this.flash.t -= dt) <= 0) this.flash = null;
    if (this.counter && !this.hold && (this.counter.t -= dt) <= 0) this.counter = null;
    const r = L.rows[this.focus]?.recipe;
    if (!r) return;
    const pressed = input.pressed('confirm');
    const calm = this.openT - (this.lastPressAt ?? -Infinity) >= MASH_GAP;
    if (pressed) this.lastPressAt = this.openT;
    const started = (pressed || clicked) && this.openT >= OPEN_LOCK;
    if (!isConversion(r)) {
      this.hold = null;
      // Werkzeug oder Waffe: nicht mitten im Hämmern auf E (die Maus ist Absicht genug)
      if (started && (clicked || calm)) this.game.craft(r);
      return;
    }
    // Verwerten: ein Druck wandelt einmal um, gehalten geht es weiter
    if (started) {
      if (r.affordable && this.convert(r)) this.hold = { id: r.id, t: 0, count: 1 };
      else this.game.craft(r); // zu wenig Vorrat: sagt »Dafür fehlt noch etwas«
    }
    const mouseHold = input.mouse.down && hovered === this.focus;
    if (!this.hold || this.hold.id !== r.id || this.focus !== before || (!input.isDown('confirm') && !mouseHold)) {
      this.hold = null;
      return;
    }
    this.hold.t += dt;
    if (this.hold.t < (this.hold.count > 1 ? HOLD_REPEAT : HOLD_FIRST)) return;
    this.hold.t = 0;
    const current = this.recipes().find((x) => x.id === r.id);
    if (current?.affordable && this.convert(current)) this.hold.count += 1;
    else this.hold = null; // Vorrat aufgebraucht
  }

  /** Einmal umwandeln, Zeile aufleuchten lassen, Zähler hochzählen. */
  convert(r) {
    if (!this.game.craft(r)) return false;
    this.flash = { id: r.id, t: FLASH };
    const same = this.counter && this.counter.id === r.id;
    this.counter = { id: r.id, count: (same ? this.counter.count : 0) + 1, t: COUNTER };
    return true;
  }

  /** Füllstand des Haltebalkens für ein Rezept (0…1). */
  holdProgress(id) {
    if (!this.hold || this.hold.id !== id) return 0;
    return Math.min(1, this.hold.t / (this.hold.count > 1 ? HOLD_REPEAT : HOLD_FIRST));
  }

  /** Unterkante des Fensters samt Info-Zeile (Meldungen erscheinen darunter). */
  bottom(ui) {
    const L = this.layout(ui);
    return L.y + L.h + LINE_HEIGHT * 2 + 14; // Platz für die Waffen-Zeile
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.isOpen) return;
    const L = this.layout(ui);
    const inv = this.game.state.inventory;
    ui.ditherFill(0.35);
    ui.panel(L.x, L.y, L.w, L.h);
    ui.textCentered(this.shop ? T.haendler.titel : T.werkbank.titel, L.x + L.w / 2, L.y + 6, COLORS.gold);
    ui.rect(L.x + 10, L.y + 20, L.w - 20, 1, COLORS.frameDark);
    if (this.shop) ui.textCentered(this.game.trader.quote(), L.x + L.w / 2, L.y + 24, COLORS.textWarm);
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
      const name = r.name ?? T.rezepte[r.id];
      ui.text(name, rect.x + 20, rect.y + 3, r.owned ? COLORS.textDim : r.affordable ? COLORS.text : COLORS.textDim);
      // Zähler beim Verwerten: wie viel ist schon dabei herausgekommen?
      if (this.counter?.id === r.id) {
        const [res, n] = Object.entries(r.gives.inventory)[0];
        const text = T.werkbank.zaehler(this.counter.count * n);
        const tx = rect.x + 24 + measure(name);
        ui.text(text, tx, rect.y + 3, COLORS.gold);
        drawIcon(ui.ctx, res, tx + measure(text) + 2, rect.y + 5);
      }
      // Kosten rechtsbündig
      let cx = rect.x + rect.w - 6;
      if (r.owned) {
        const t = r.ownedText ?? T.werkbank.vorhanden;
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
    // Gewählte Zeile: was kommt dabei heraus? (Verwerten: »… E halten: weiter«)
    const r = L.rows[this.focus]?.recipe;
    const conversion = r && isConversion(r) && !r.owned;
    const hint = this.shop ? T.haendler.hinweis : conversion ? T.werkbank.hinweisVerwerten : T.werkbank.hinweis;
    ui.textCentered(hint, L.x + L.w / 2, L.y + L.h - 14, COLORS.textDim);
    if (r) {
      const loud = conversion && Boolean(this.hold);
      const text = r.info ?? T.rezeptInfo[r.id];
      const info = conversion ? T.werkbank.halten(text) : text;
      // Waffen: zweite Zeile mit Schaden, Tempo und Reichweite
      const wpn = r.gives.weapon ? WEAPONS[r.gives.weapon] : null;
      const stats = wpn ? T.werkbank.werte(num(wpn.damage), num(wpn.rate), num(wpn.reach), wpn.targets || 1) : null;
      const w = Math.max(measure(info), stats ? measure(stats) : 0) + 12;
      const px = Math.round(L.x + (L.w - w) / 2);
      ui.panel(px, L.y + L.h + 4, w, LINE_HEIGHT * (stats ? 2 : 1) + 6, loud ? { frame: COLORS.gold } : undefined);
      ui.text(info, px + 6, L.y + L.h + 6, loud ? COLORS.gold : COLORS.textWarm);
      if (stats) ui.text(stats, px + 6, L.y + L.h + 6 + LINE_HEIGHT, COLORS.text);
    }
  }
}
