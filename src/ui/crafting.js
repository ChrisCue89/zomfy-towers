// Werkbank-Menü: Rezepte mit Kosten, W/S wählen, E herstellen, Esc schließen.
// Klicks werden in update() ausgewertet (siehe CLAUDE.md). Verwerten (Vorrat
// umwandeln): Ein Druck wandelt einmal um, gehaltenes E bzw. gehaltene
// Maustaste macht gemächlich weiter – ein Balken füllt die Zeile bis zur
// nächsten Umwandlung, ein Zähler zeigt, wie viel schon dabei herauskam (m3-r2).
// Dasselbe Fenster dient als Balduins Handel am Boot (Quelle »haendler«, M8/M9):
// Seine Angebote sind Umwandlungen wie das Verwerten, oben steht sein Spruch.
// H5: Die Werkbank hat zwei Seiten (A/D, Tab oder Klick auf den Reiter): »Herstellen«
// und »Figur« – Mikas Aufwertungen und die Stufen der Waffen (vorher ein Reiter im Baumenü).

import { T } from '../data/texts.js';
import { RECIPES } from '../data/recipes.js';
import { COLORS } from './ui.js';
import { drawIcon, iconSize } from './icons.js';
import { measure, LINE_HEIGHT, wrap } from './font.js';
import { canAfford } from '../core/inventory.js';
import { WEAPONS } from '../data/weapons.js';
import { TOWER_PART_IDS, TINKER_COUNT, nextRarity } from '../data/towers.js';

const num = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

const ROW_H = 22;
const HOLD_FIRST = 0.9; // so lange halten bis zur zweiten Umwandlung (ein langer Druck ist noch keiner)
const HOLD_REPEAT = 0.6; // jede weitere, solange gehalten wird
const FLASH = 0.35;
const COUNTER = 1.6; // so lange bleibt der Zähler nach dem Loslassen stehen
const OPEN_LOCK = 0.6; // gleich nach dem Öffnen stellt E nichts her (schnelles Durchdrücken, m4-r1; m7-r1: 0,3 s reichten Jonas nicht)
const MASH_GAP = 0.3; // Werkzeug/Waffe: ein Druck zählt nur, wenn davor so lange keiner kam – Hämmern auf E baut nichts (m7-r1)

/** Wandelt das Rezept nur Vorrat um (statt ein Werkzeug zu bauen)? Basteln (M21) zählt dazu. */
const isConversion = (r) => Boolean(r.gives.inventory || r.gives.tinker);
/** Höchstens so viele Zeilen »Basteln« (M21) – sonst wird das Fenster zu hoch. */
const TINKER_ROWS = 3;
/** Seiten der Werkbank (H5) und die Höhe ihrer Reiter. */
const PAGES = ['herstellen', 'figur'];
const TAB_H = 12;

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
    this.page = 'herstellen'; // H5: oder 'figur'
  }

  get shop() {
    return this.source === 'haendler';
  }

  open(source = 'werkbank') {
    this.source = source;
    this.page = 'herstellen';
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
    this.page = 'herstellen'; // H5: zu ist die Werkbank wieder bei ihren Rezepten (auch für `zomfy.craft`)
  }

  /** H5: Seite wechseln – gewählt ist die erste Zeile, die sich bezahlen lässt. */
  setPage(page) {
    this.page = page;
    this.hold = null;
    this.counter = null;
    this.flash = null;
    const list = this.recipes();
    const first = list.findIndex((r) => r.affordable && !r.owned);
    const open = list.findIndex((r) => !r.owned);
    this.focus = first >= 0 ? first : Math.max(0, open);
  }

  recipes() {
    const g = this.game;
    if (this.shop) {
      // Letzte Zeile: Tschüss sagen (M9.1 – schließt das Fenster auch ohne Esc)
      const traded = g.trader.tradedToday();
      const bye = { id: 'tschuess', close: true, icon: 'boot', name: T.haendler.fertig, info: traded ? T.haendler.fertigInfo : T.haendler.fertigInfoWarten, cost: {}, gives: {}, affordable: true };
      const bitte = g.quests.tradeRow(); // M23: Balduins Bitte (Nebenauftrag)
      // M28: eine Runde Karten am Steg, bevor er ablegt
      const karten = !g.cardNight.blocked('balduin') ? [{ id: 'karten', cards: true, icon: 'buch', name: T.karten.einladenBalduin, info: T.karten.titel, cost: {}, gives: {}, affordable: true }] : [];
      return [...g.trader.offers(), ...(bitte ? [bitte] : []), ...karten, bye];
    }
    if (this.page === 'figur') return g.builder.figureRows(); // H5
    const fogOpen = g.state.isles?.fog?.stage === 2 && !(g.state.inventory.naegel > 0); // N7: Marthe wartet auf Nägel
    const list = RECIPES.filter((r) => (!r.arms || g.state.arms?.unlocked) && (!r.fog || fogOpen)).map((r) => {
      const owned = r.once && ((r.gives.tool && g.state.tools[r.gives.tool]) || (r.gives.weapon && g.state.weapons[r.gives.weapon]));
      return { ...r, owned, affordable: !owned && canAfford(g.state.inventory, r.cost) };
    });
    // Basteln (M21): drei gleiche Turmteile ergeben eines der nächsten Seltenheit – nur, was man hat
    const parts = g.state.towerParts;
    const need = TINKER_COUNT - (this.game.survivors?.tinkerDiscount() || 0); // M27: mit Clara ein Teil weniger
    for (const id of TOWER_PART_IDS.filter((p) => (parts[p] || 0) >= need && nextRarity(p)).slice(0, TINKER_ROWS)) {
      const name = T.turmteile[id][0];
      list.push({ id: `basteln-${id}`, icon: id, name: T.werkbank.basteln(name), info: T.werkbank.bastelnInfo(T.turmteile.seltenheit[nextRarity(id)]), cost: { [id]: need }, stock: parts, gives: { tinker: id }, affordable: true });
    }
    return list;
  }

  layout(ui) {
    const list = this.recipes();
    const w = 300;
    // beim Händler: Spruch unter dem Titel – lange Sprüche brechen um (m16-r1: sie ragten über den Rahmen)
    this.quoteLines = this.shop ? wrap(this.game.trader.quote(), w - 20) : [];
    const pages = this.shop ? [] : PAGES; // H5: Reiter unter dem Titel
    const head = 28 + this.quoteLines.length * LINE_HEIGHT + (pages.length ? TAB_H + 2 : 0);
    // H4b: Bei großer Oberfläche rücken lange Listen zusammen (mindestens 17 Pixel je Zeile)
    const rowH = Math.max(17, Math.min(ROW_H, Math.floor((ui.height - 8 - head - 24) / Math.max(1, list.length))));
    const h = head + 6 + list.length * rowH + 18;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.max(2, Math.round((ui.height - h) / 2) - 20);
    const rows = list.map((r, k) => ({ recipe: r, rect: { x: x + 8, y: y + head + k * rowH, w: w - 16, h: rowH - 2 } }));
    const widths = pages.map((p) => measure(T.werkbank.seiten[p]) + 10);
    let tx = Math.round(x + (w - widths.reduce((sum, v) => sum + v + 4, -4)) / 2);
    const tabRects = pages.map((page, k) => {
      const r = { page, x: tx, y: y + 24, w: widths[k], h: TAB_H };
      tx += widths[k] + 4;
      return r;
    });
    return { x, y, w, h, rows, tabRects };
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
    // H5: Seite wechseln – A/D, Tab oder ein Klick auf den Reiter
    if (L.tabRects.length) {
      const tab = L.tabRects.findIndex((r) => ui.hover(r.x, r.y, r.w, r.h));
      let next = null;
      if (input.pressed('left') || input.pressed('right') || input.pressed('buildTab')) next = PAGES[(PAGES.indexOf(this.page) + 1) % PAGES.length];
      if (tab >= 0 && input.mouse.clicked) {
        input.consumeClick();
        next = L.tabRects[tab].page;
      }
      if (next && next !== this.page) {
        this.setPage(next);
        this.game.sound.play('klick');
        return;
      }
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
    if (r.cards) {
      this.hold = null;
      if ((pressed || clicked) && this.openT >= OPEN_LOCK) {
        this.close();
        this.game.mode = 'play';
        this.game.cardNight.begin('balduin');
      }
      return;
    }
    if (r.close) {
      this.hold = null;
      if ((pressed || clicked) && this.openT >= OPEN_LOCK) this.game.closeCrafting();
      return;
    }
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
    (this.quoteLines || []).forEach((line, k) => ui.textCentered(line, L.x + L.w / 2, L.y + 24 + k * LINE_HEIGHT, COLORS.textWarm));
    // H5: die Reiter der Werkbank, die Taste zum Wechseln daneben
    for (const r of L.tabRects) {
      const active = r.page === this.page;
      ui.panel(r.x, r.y, r.w, r.h, { fill: active ? COLORS.fillLight : COLORS.fill, frame: active ? COLORS.gold : COLORS.frame, highlight: null });
      ui.text(T.werkbank.seiten[r.page], r.x + 5, r.y + 1, active ? COLORS.gold : COLORS.textDim);
    }
    const lastTab = L.tabRects[L.tabRects.length - 1];
    if (lastTab) ui.text(T.werkbank.seitenTaste, lastTab.x + lastTab.w + 6, lastTab.y + 1, COLORS.textDim);
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
        const entry = r.gives.inventory ? Object.entries(r.gives.inventory)[0] : null; // Basteln (M21): nur die Zahl
        const text = T.werkbank.zaehler(this.counter.count * (entry ? entry[1] : 1));
        const tx = rect.x + 24 + measure(name);
        ui.text(text, tx, rect.y + 3, COLORS.gold);
        if (entry) drawIcon(ui.ctx, entry[0], tx + measure(text) + 2, rect.y + 5);
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
        ui.text(text, cx, rect.y + 3, ((r.stock || inv)[res] || 0) >= v ? COLORS.text : COLORS.red); // Basteln (M21): Turmteile statt Vorrat
        cx -= 12;
        drawIcon(ui.ctx, res, cx, rect.y + 5);
        cx -= 6;
      }
    });
    // Gewählte Zeile: was kommt dabei heraus? (Verwerten: »… E halten: weiter«)
    const r = L.rows[this.focus]?.recipe;
    const conversion = r && !r.close && isConversion(r) && !r.owned;
    const hint = this.shop ? (this.game.trader.tradedToday() ? T.haendler.hinweisTschuess : T.haendler.hinweis) : this.page === 'figur' ? T.werkbank.hinweisFigur : conversion ? T.werkbank.hinweisVerwerten : T.werkbank.hinweis;
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
