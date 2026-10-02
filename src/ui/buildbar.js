// Das Baumenü (H1, recherche/hud-baumenue.md 4.5): Zu ist es ein Knopf »Bauen« unten
// rechts, offen zeigt es Reiter und große Kacheln – jede mit dem Bild des Baus aus seinem
// Modell, Tastenkappe und Preis – und darüber den Bauzettel (Name, Wirkung, Werte, Preis).
// Tab öffnet und wechselt dann den Reiter; Q R T G C bauen auch bei zugeklapptem Menü
// sofort einen Turm (danach klappt es wieder zu); Esc und Rechtsklick klappen es zu.
// Ist ein Bau ausgewählt, zeigt das Menü dessen Möglichkeiten (Ausbau, Abreißen …).
// Was angeboten wird, entscheidet der Builder (core/builder.js).

import { T } from '../data/texts.js';
import { BUILDINGS } from '../data/buildings.js';
import { COLORS } from './ui.js';
import { drawIcon, iconCanvas } from './icons.js';
import { measure, wrap, LINE_HEIGHT } from './font.js';
import { P, hexToCss } from '../render/palette.js';
import { BuildPictures, PICTURE, registerTowerTypes } from './buildPictures.js';

export const HOTKEYS = ['KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyC', 'KeyV'];
const KEY_LABELS = ['Q', 'R', 'T', 'G', 'C', 'V'];
/** Maße (UI-Pixel): Kachel, Bildfläche, Abstände; Bauzettel höchstens so breit. */
export const MENU = { tileW: 48, tileH: 58, gap: 2, picX: 2, picY: 2, costY: 43, noteW: 300, tabH: 17 };
const FLASH_TIME = 1.4;
const FLASH_AGAIN = 45; // dieselbe Option leuchtet frühestens nach 45 s wieder auf
const ARM_TIME = 2.5;
const PIC_BG = hexToCss(P.e6); // warmer Fotogrund wie im Katalog
const PIC_BG_DARK = hexToCss(P.e5);
const PIC_DIM = hexToCss(P.e4);

registerTowerTypes(Object.keys(BUILDINGS).filter((t) => BUILDINGS[t].tower));

export class BuildBar {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.tabId = 'tuerme'; // Reiter nach Namen: drinnen fehlt »Türme«, draußen ist er wieder da (m12-r1)
    this.userOpen = false; // mit Tab oder dem Knopf geöffnet: bleibt offen, bis Esc es schließt
    this.quick = false; // mit Q … bei zugeklapptem Menü: klappt nach dem Setzen wieder zu
    this.pages = new Map(); // Reiter -> Seite (mehr als sechs Möglichkeiten)
    this.hover = -1;
    this.flash = new Map(); // Options-ID -> verbleibende Leuchtzeit
    this.buttonFlash = 0; // der Knopf funkelt, wenn im zugeklappten Menü etwas bezahlbar wird
    this.affordable = new Map(); // Options-ID -> war bezahlbar?
    this.lastFlash = new Map(); // Options-ID -> this.time beim letzten Aufleuchten
    this.armed = null; // { id, t, key } – Abreißen/Kaufen per Taste wartet auf Bestätigung
    this.buyLock = 0; // bis wann nach einem Kauf nichts Weiteres gekauft wird
    this.time = 0;
    this.lastLayout = null;
    this.pictures = new BuildPictures();
    // Die Türme gleich im Hintergrund vorbereiten – das erste Öffnen soll nicht warten
    for (const type of ['bolzen', 'katapult', 'sprenger', 'laternenturm', 'barrikade']) this.pictures.get(`bau:${type}`);
  }

  /** Ist das Menü offen (auch beim Setzen und bei einer Auswahl)? */
  get open() {
    return this.userOpen || this.quick || Boolean(this.builder.placement) || this.builder.selection !== null;
  }

  /** Zeigt das Menü gerade einen Bauzettel (Maus über einer Kachel oder Rückfrage)? */
  get showsTip() {
    return Boolean(this.open && !this.builder.placement && (this.hover >= 0 || this.armed));
  }

  get builder() {
    return this.game.builder;
  }

  tabs() {
    return this.builder.tabs();
  }

  get tab() {
    const tabs = this.tabs();
    return tabs.includes(this.tabId) ? this.tabId : tabs[0];
  }

  /** Aufklappen (Tab, Knopf; die Prüfung über `buildbarLayout`). */
  openMenu() {
    this.userOpen = true;
  }

  /** Zuklappen (Esc, Rechtsklick, Karte, Dialog …). */
  close() {
    this.userOpen = false;
    this.quick = false;
    this.armed = null;
    this.hover = -1;
  }

  /**
   * Kacheln einer Seite: Abreißen liegt immer auf V (m3-r1); sind es mehr als sechs,
   * wird die letzte freie Kachel zu »weiter ›« und die zweite Seite nimmt dieselben Tasten.
   */
  pageOptions(options, key) {
    const danger = options.find((o) => o.danger) || null;
    const rest = options.filter((o) => o !== danger);
    const slots = HOTKEYS.length - (danger ? 1 : 0);
    if (rest.length <= slots) return { shown: rest, danger, page: 0, pages: 1 };
    const per = slots - 1;
    const pages = Math.ceil(rest.length / per);
    const page = Math.min(this.pages.get(key) || 0, pages - 1);
    const shown = rest.slice(page * per, page * per + per);
    const more = {
      id: 'weiter',
      more: true,
      icon: 'zeiger',
      name: T.bauleiste.weiter(page + 1, pages),
      info: T.bauleiste.weiterInfo,
      cost: {},
      affordable: true,
      progress: 1,
      action: () => this.pages.set(key, (page + 1) % pages),
    };
    return { shown: [...shown, more], danger, page, pages };
  }

  layout(ui) {
    const { tileW, tileH, gap, tabH } = MENU;
    if (!this.open) {
      // Zu: nur der Knopf »Bauen« mit Hammer und Tastenkappe
      const label = T.bauleiste.bauen;
      const w = 20 + Math.max(measure(label), measure(T.bauleiste.tab) + 5) + 6; // Hammer, daneben Wort und Taste
      const h = 30;
      const button = { x: ui.width - w - 4, y: ui.height - h - 4, w, h };
      return { closed: true, button, x: button.x, y: button.y, w, h, tiles: [], title: label, tabs: [], tabRects: [], note: null };
    }
    const sel = this.builder.selected();
    const key = sel ? `auswahl:${sel.id}` : this.tab;
    const all = this.builder.options(this.tab);
    const { shown, danger } = this.pageOptions(all, key);
    const options = danger ? [...shown, danger] : shown;
    const n = Math.max(options.length, 1);
    const w = n * tileW + (n - 1) * gap + 8;
    const h = tileH + 8;
    const x = ui.width - w - 4;
    const y = ui.height - h - 4;
    const tiles = options.map((option, k) => {
      const keyIndex = option.danger ? HOTKEYS.length - 1 : k;
      return { option, keyIndex, key: KEY_LABELS[keyIndex], rect: { x: x + 4 + k * (tileW + gap), y: y + 4, w: tileW, h: tileH } };
    });
    const selected = this.builder.selectionTitle();
    const title = selected || T.bauleiste.reiter[this.tab];
    const tabs = selected ? [] : this.tabs();
    // Reiterzeile: rückt nach links, wenn sie breiter ist als das Menü
    const widths = tabs.map((tab) => measure(T.bauleiste.reiter[tab]) + 10);
    const total = widths.reduce((sum, tw) => sum + tw + 2, 0) + 22;
    let tx = Math.min(x, ui.width - 4 - total);
    const tabRects = widths.map((tw) => {
      const r = { x: tx, y: y - tabH + 2, w: tw, h: tabH };
      tx += tw + 2;
      return r;
    });
    return { closed: false, x, y, w, h, tiles, title, tabs, tabRects, all };
  }

  /** Mausklicks und Tasten (nur im Spielmodus aufrufen). */
  update(dt, input) {
    this.time += dt;
    for (const [id, t] of this.flash) {
      if (t - dt <= 0) this.flash.delete(id);
      else this.flash.set(id, t - dt);
    }
    this.buttonFlash = Math.max(0, this.buttonFlash - dt);
    if (this.armed) {
      this.armed.t -= dt;
      if (this.armed.t <= 0) this.armed = null;
    }
    // Schnell gebaut (Q bei zugeklapptem Menü): nach dem Setzen klappt es wieder zu
    if (this.quick && !this.builder.placement) this.quick = false;
    this.pictures.tick();
    const ui = this.game.ui;
    let L = this.layout(ui);
    this.lastLayout = L;

    // Aufleuchten, sobald eine Option bezahlbar wird (zugeklappt: die des Reiters, am Knopf)
    const watched = L.closed ? this.builder.options(this.tab) : L.tiles.map((t) => t.option);
    for (const option of watched) {
      const ready = option.affordable && !option.disabled;
      if (this.affordable.get(option.id) === false && ready) {
        // Billiges (Barrikade, Laterne) wird oft bezahlbar – sonst nutzt sich das Signal ab
        if (this.time - (this.lastFlash.get(option.id) ?? -FLASH_AGAIN) >= FLASH_AGAIN) {
          this.flash.set(option.id, FLASH_TIME);
          this.lastFlash.set(option.id, this.time);
          if (L.closed) this.buttonFlash = FLASH_TIME * 2;
          this.game.sound.play('glocke', { volume: 0.5 });
        }
        this.builder.onOptionAffordable(option);
      }
      this.affordable.set(option.id, ready);
    }

    if (input.pressed('buildTab')) {
      if (!this.open) this.openMenu();
      else if (L.tabs.length > 1) this.tabId = L.tabs[(L.tabs.indexOf(this.tab) + 1) % L.tabs.length];
      L = this.layout(ui);
      this.lastLayout = L;
    }
    for (let k = 0; k < HOTKEYS.length; k++) {
      if (!input.pressedCode(HOTKEYS[k])) continue;
      if (L.closed) {
        // Zugeklappt gehören Q R T G C immer den Türmen (so baut Q nie etwas anderes)
        if (this.tabs().includes('tuerme')) this.tabId = 'tuerme';
        this.quick = true;
        L = this.layout(ui);
        this.lastLayout = L;
      }
      const tile = L.tiles.find((t) => t.keyIndex === k);
      if (tile) this.activate(tile.option, false, KEY_LABELS[k]);
      // Kein Setzen daraus geworden (zu teuer, Rückfrage): dann bleibt das Menü offen stehen
      if (this.quick && !this.builder.placement) {
        this.quick = false;
        this.userOpen = true;
      }
      L = this.layout(ui);
      this.lastLayout = L;
    }

    if (L.closed) {
      this.hover = -1;
      if (input.mouse.clicked && this.contains(ui)) {
        input.consumeClick();
        this.openMenu();
        this.lastLayout = this.layout(ui);
      }
      return;
    }
    this.hover = L.tiles.findIndex((t) => ui.hover(t.rect.x, t.rect.y, t.rect.w, t.rect.h));
    if (input.mouse.clicked && this.contains(ui)) {
      input.consumeClick();
      const tab = L.tabs.length > 1 ? L.tabRects.findIndex((r) => ui.hover(r.x, r.y, r.w, r.h)) : -1;
      if (tab >= 0) this.tabId = L.tabs[tab]; // Reiter auch per Klick
      else if (this.hover >= 0) this.activate(L.tiles[this.hover].option, true, L.tiles[this.hover].key);
    }
  }

  /**
   * Esc oder Rechtsklick bei offenem Menü (ohne Setzen und Auswahl): zuklappen.
   * Gibt true zurück, wenn der Druck dafür verbraucht wurde (dann kein Pausenmenü).
   */
  handleClose(input) {
    if (!this.userOpen && !this.quick) return false;
    if (this.builder.placement || this.builder.selection !== null) return false;
    if (!input.pressed('cancel') && !input.mouse.rightClicked) return false;
    this.close();
    return true;
  }

  activate(option, byMouse, key = null) {
    if (option.more) {
      option.action();
      return;
    }
    if (option.disabled) {
      this.game.hud.toast(option.disabledText || T.bauleiste.gesperrt, null, 2);
      return;
    }
    if (!option.affordable) {
      this.game.hud.toast(option.missingText || T.meldungen.zuTeuer, null, 2.2);
      return;
    }
    // Rückfragen stehen auf der Kachel (»noch mal Q«), nicht mehr als Meldung am anderen Bildrand
    if (option.confirm && (!this.armed || this.armed.id !== option.id)) {
      this.armed = { id: option.id, t: option.confirmText ? 3.5 : ARM_TIME, key };
      if (option.confirmText) this.game.hud.toast(option.confirmText, option.confirmIcon || 'abriss', 3.5); // Teilreparatur: was es kostet
      return;
    }
    // Kaufen per Taste (Aufwertung, Stufe, Spezialisierung) braucht einen
    // zweiten Druck – schnelles Tippen gibt sonst Schrott aus (m3-r2). Ein
    // Mausklick auf die Kachel ist Absicht genug.
    if (option.buy && !byMouse) {
      if (this.time < this.buyLock) return;
      if (!this.armed || this.armed.id !== option.id) {
        this.armed = { id: option.id, t: ARM_TIME, buy: true, key };
        return;
      }
    }
    this.armed = null;
    option.action();
    if (option.buy) this.buyLock = this.time + 0.45; // gleich danach nichts Weiteres kaufen
    if (byMouse && this.builder.placement) this.builder.useMouse = true;
  }

  /** Bauzettel: für welche Option, wo, wie groß (null = keiner). */
  noteLayout(ui, L) {
    if (L.closed || this.builder.placement) return null;
    const armedTile = this.armed ? L.tiles.find((t) => t.option.id === this.armed.id) : null;
    const tile = this.hover >= 0 ? L.tiles[this.hover] : armedTile;
    if (!tile) return null;
    const o = tile.option;
    const w = Math.min(ui.width - 8, Math.max(L.w, 220, Math.min(MENU.noteW, measure(o.name) + 90)));
    const lines = [
      [o.info, COLORS.textDim],
      [o.hint, COLORS.textWarm],
      [this.armed && this.armed.id === o.id ? T.bauleiste.nochmalZettel(tile.key, o.danger) : null, o.danger ? COLORS.buildBad : COLORS.gold],
      [o.disabled ? o.disabledText : o.missingText, o.disabled ? COLORS.textDim : COLORS.red],
    ].flatMap(([text, color]) => (text ? wrap(text, w - 10).map((t) => [t, color]) : []));
    const h = 6 + LINE_HEIGHT + lines.length * LINE_HEIGHT + 2;
    const top = Math.min(L.y - MENU.tabH + 2, ...L.tabRects.map((r) => r.y));
    return { option: o, key: tile.key, x: ui.width - w - 4, y: top - 3 - h, w, h, lines };
  }

  /** Liegt die Maus über dem Menü (dann gehen Klicks nicht in die Welt)? */
  contains(ui) {
    const L = this.lastLayout || this.layout(ui);
    if (L.closed) return ui.hover(L.button.x, L.button.y, L.button.w, L.button.h);
    return ui.hover(L.x, L.y - MENU.tabH, L.w, L.h + MENU.tabH) || (L.tabs.length > 1 && L.tabRects.some((r) => ui.hover(r.x, r.y, r.w, r.h)));
  }

  /** Oberkante des Menüs (für Edda und Meldungen). */
  top(ui) {
    const L = this.lastLayout || this.layout(ui);
    if (L.closed) return L.button.y;
    return Math.min(L.y - MENU.tabH + 2, ...L.tabRects.map((r) => r.y));
  }

  /** H4: alles, was das Menü gerade belegt – Menü, Reiter und Bauzettel (dem weicht Edda aus). */
  occupiedRect(ui) {
    const m = this.menuRect(ui);
    const L = this.lastLayout || this.layout(ui);
    const note = L.closed ? null : this.noteLayout(ui, L);
    if (!note) return m;
    const x = Math.min(m.x, note.x);
    const y = Math.min(m.y, note.y);
    return { x, y, w: Math.max(m.x + m.w, note.x + note.w) - x, h: Math.max(m.y + m.h, note.y + note.h) - y };
  }

  /** Das Menü samt Reitern als ein Rechteck (zu: der Knopf) – dem weicht das Schild am Geist aus. */
  menuRect(ui) {
    const L = this.lastLayout || this.layout(ui);
    if (L.closed) return { ...L.button };
    const x = Math.min(L.x, ...L.tabRects.map((r) => r.x));
    const y = this.top(ui);
    return { x, y, w: L.x + L.w - x + 16, h: L.y + L.h - y }; // +16: die Tastenkappe »Tab« rechts neben den Reitern
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    const L = this.layout(ui);
    if (L.closed) {
      this.drawButton(ui, L);
      return;
    }
    // Kopfzeile: Reiter bzw. Titel der Auswahl
    if (L.tabs.length > 1) {
      L.tabs.forEach((tab, k) => {
        const r = L.tabRects[k];
        const active = tab === this.tab;
        ui.panel(r.x, r.y, r.w, r.h, { fill: active ? COLORS.fillLight : COLORS.fill, frame: active ? COLORS.gold : COLORS.frame, highlight: null });
        ui.text(T.bauleiste.reiter[tab], r.x + 5, r.y + 1, active ? COLORS.gold : COLORS.textDim);
      });
      // Taste zum Wechseln als Kappe (wie der E-Hinweis)
      const last = L.tabRects[L.tabRects.length - 1];
      this.drawCap(ui, T.bauleiste.tab, last.x + last.w + 3, last.y + 3);
    } else {
      const tw = measure(L.title) + 10;
      const tx = Math.min(L.x, ui.width - tw - 4);
      ui.panel(tx, L.y - MENU.tabH + 2, tw, MENU.tabH, { fill: COLORS.fillLight, highlight: null });
      ui.text(L.title, tx + 5, L.y - MENU.tabH + 3, COLORS.gold);
      // Türme (M16): Rang und Strichliste links daneben
      const record = this.builder.selectionRecord();
      if (record) {
        const rw = measure(record) + 10;
        ui.panel(tx - rw - 2, L.y - MENU.tabH + 2, rw, MENU.tabH, { fill: COLORS.fill, highlight: null });
        ui.text(record, tx - rw + 3, L.y - MENU.tabH + 3, COLORS.textWarm);
      }
    }
    ui.panel(L.x, L.y, L.w, L.h);
    const placing = this.builder.placement;
    L.tiles.forEach((tile, k) => this.drawTile(ui, tile, k, placing));
    const note = this.noteLayout(ui, L);
    if (note) this.drawNote(ui, note);
    else if (placing) {
      // Beim Setzen nur eine blasse Tastenzeile über dem Menü (Preis und Grund stehen am Geist)
      const text = T.bauleiste.setzenKurz;
      const tw = measure(text);
      ui.text(text, ui.width - tw - 6, this.top(ui) - LINE_HEIGHT - 1, COLORS.textDim, { outline: COLORS.outline });
    }
  }

  drawButton(ui, L) {
    const b = L.button;
    const hovered = ui.hover(b.x, b.y, b.w, b.h);
    const glint = this.buttonFlash > 0 && Math.floor(this.buttonFlash * 8) % 2 === 0;
    ui.panel(b.x, b.y, b.w, b.h, { fill: hovered ? COLORS.fillHover : COLORS.fill, frame: glint || hovered ? COLORS.gold : COLORS.frame });
    drawIcon(ui.ctx, 'reparieren', b.x + 5, b.y + 5); // der Hammer
    ui.text(T.bauleiste.bauen, b.x + 20, b.y + 3, glint ? COLORS.gold : COLORS.text);
    this.drawCap(ui, T.bauleiste.tab, b.x + 20, b.y + 16);
    if (this.buttonFlash > 0) this.drawSparkles(ui, b, this.buttonFlash % FLASH_TIME);
  }

  /** Tastenkappe im Stil des E-Hinweises (hell, dunkle Schrift). */
  drawCap(ui, label, x, y) {
    const w = Math.max(11, measure(label) + 5);
    ui.inset(x, y, w, 11, { fill: COLORS.textWarm, border: COLORS.outline });
    ui.text(label, x + 3, y - 2, COLORS.outline);
    return w;
  }

  drawTile(ui, tile, k, placing) {
    const { option, rect } = tile;
    const ctx = ui.ctx;
    const { picX, picY, costY } = MENU;
    const ready = option.affordable && !option.disabled;
    const flash = this.flash.get(option.id) || 0;
    const active = placing && placing.optionId === option.id;
    const armed = this.armed && this.armed.id === option.id;
    const hovered = k === this.hover;
    const pulse = (flash > 0 && Math.floor(flash * 10) % 2 === 0) || (armed && Math.floor(this.time * 6) % 2 === 0);
    // Abreißen ist nie eine Empfehlung: kein goldener »bezahlbar«-Rahmen
    const readyFrame = option.danger ? COLORS.frameDark : COLORS.gold;
    ui.inset(rect.x, rect.y, rect.w, rect.h, {
      fill: active || armed ? COLORS.fillHover : hovered ? COLORS.fillLight : COLORS.inset,
      border: armed ? (this.armed.buy ? COLORS.gold : COLORS.red) : pulse ? COLORS.textWarm : active ? COLORS.gold : ready || option.more ? readyFrame : COLORS.frameDark,
    });
    // Bildfläche: warmer Fotogrund, unten etwas dunkler (wie das Katalogfoto)
    const px = rect.x + picX;
    const py = rect.y + picY;
    ui.rect(px, py, PICTURE.w, PICTURE.h, PIC_BG);
    ui.rect(px, py + PICTURE.h - 9, PICTURE.w, 9, PIC_BG_DARK);
    const pic = option.picture ? this.pictures.get(option.picture) : null;
    if (pic) ctx.drawImage(pic.canvas, px, py);
    else this.drawBigIcon(ctx, option.icon, px, py);
    if (option.disabled && option.locked) {
      ui.ditherRect(px, py, PICTURE.w, PICTURE.h, 0.5, PIC_DIM);
      drawIcon(ctx, 'schloss', px + PICTURE.w - 10, py + 2);
    }
    // Tastenkappe oben links
    this.drawCap(ui, tile.key, rect.x + 1, rect.y + 1);
    if (option.badge) {
      const bw = measure(option.badge) + 4;
      ui.rect(px + PICTURE.w - bw - 1, py + 1, bw + 1, LINE_HEIGHT - 1, COLORS.outline);
      ui.text(option.badge, px + PICTURE.w - bw + 1, py - 1, ready ? COLORS.gold : COLORS.textDim);
    }
    // Preiszeile – oder die Rückfrage auf der Kachel
    if (armed) {
      const text = T.bauleiste.nochmalKachel;
      ui.text(text, rect.x + Math.round((rect.w - measure(text)) / 2), rect.y + costY - 1, option.danger ? COLORS.buildBad : COLORS.gold);
    } else this.drawCost(ui, option, rect);
    // Füllbalken: wie nah bin ich dran?
    const barW = rect.w - 4;
    ui.rect(rect.x + 2, rect.y + rect.h - 3, barW, 2, COLORS.outline);
    const fill = option.disabled ? 0 : Math.max(0, Math.min(1, option.progress));
    if (fill > 0 && !option.more) ui.rect(rect.x + 2, rect.y + rect.h - 3, Math.max(1, Math.round(barW * fill)), 2, ready ? COLORS.gold : COLORS.goldDark);
    if (flash > 0) this.drawSparkles(ui, rect, flash);
  }

  /** Symbol doppelt so groß (Figur, Reparieren, Abreißen … – Dinge ohne Modell). */
  drawBigIcon(ctx, name, x, y) {
    if (!name) return;
    const c = iconCanvas(name);
    const s = c.width <= 20 && c.height <= 18 ? 2 : 1;
    const w = c.width * s;
    const h = c.height * s;
    ctx.drawImage(c, x + Math.floor((PICTURE.w - w) / 2), y + Math.max(1, Math.floor((PICTURE.h - h) / 2)), w, h);
  }

  drawCost(ui, option, rect) {
    const ctx = ui.ctx;
    const y = rect.y + MENU.costY;
    if (option.more) {
      const text = T.bauleiste.weiterKachel;
      ui.text(text, rect.x + Math.round((rect.w - measure(text)) / 2), y - 1, COLORS.textWarm);
      return;
    }
    if (option.disabled && option.locked) return; // gesperrt: das Schloss steht im Bild
    if (option.disabled) {
      // Häkchen: gebaut bzw. fertig
      drawIcon(ctx, 'passt', rect.x + Math.floor(rect.w / 2) - 4, y + 1);
      return;
    }
    let entries = Object.entries(option.cost || {}).filter(([, v]) => v > 0);
    // Abreißen: statt eines Preises zeigt die Kachel grün, was zurückkommt
    const refund = !entries.length && option.refund;
    if (refund) entries = Object.entries(option.refund).filter(([, v]) => v > 0);
    if (!entries.length) return;
    const inv = this.game.state.inventory;
    const label = (v) => (refund ? `+${v}` : String(v));
    // Zwei Sorten passen; mehr deutet ein »+« an (der volle Preis steht im Bauzettel)
    const shown = entries.slice(0, 2);
    const more = entries.length > 2;
    const itemW = ([, v]) => measure(label(v)) + 11;
    let total = shown.reduce((s, e) => s + itemW(e) + 2, -2) + (more ? measure('+') + 2 : 0);
    if (total > rect.w - 2) {
      shown.length = 1;
      total = itemW(shown[0]) + measure('+') + 2;
    }
    let x = rect.x + Math.round((rect.w - total) / 2);
    for (const [res, v] of shown) {
      const text = label(v);
      ui.text(text, x, y - 1, refund ? COLORS.green : (inv[res] || 0) >= v ? COLORS.text : COLORS.red);
      x += measure(text) + 1;
      drawIcon(ctx, res, x, y + 1);
      x += 12;
    }
    if (more || shown.length < entries.length) ui.text('+', x, y - 1, COLORS.textDim);
  }

  drawSparkles(ui, rect, flash) {
    const t = FLASH_TIME - flash;
    for (let k = 0; k < 6; k++) {
      const a = k * 1.047 + t * 3;
      const r = 10 + t * 14;
      const x = rect.x + rect.w / 2 + Math.cos(a) * r;
      const y = rect.y + rect.h / 2 + Math.sin(a) * r * 0.7;
      ui.rect(Math.round(x), Math.round(y), 1, 1, k % 2 ? COLORS.gold : COLORS.textWarm);
    }
  }

  /** Bauzettel: Name und voller Preis, Wirkung, Werte, Zusatz. */
  drawNote(ui, N) {
    const o = N.option;
    const inv = this.game.state.inventory;
    ui.panel(N.x, N.y, N.w, N.h);
    ui.text(o.name, N.x + 5, N.y + 3, COLORS.gold);
    const cost = Object.entries(o.cost || {}).filter(([, v]) => v > 0);
    const refund = Object.entries(o.refund || {}).filter(([, v]) => v > 0);
    const row = cost.length ? cost : refund;
    const isRefund = !cost.length && refund.length > 0;
    let cx = N.x + N.w - 5;
    for (const [res, v] of [...row].reverse()) {
      const text = `${isRefund ? '+' : ''}${v}`;
      cx -= 10;
      drawIcon(ui.ctx, res, cx, N.y + 4);
      cx -= measure(text) + 1;
      ui.text(text, cx, N.y + 3, isRefund ? COLORS.green : (inv[res] || 0) >= v ? COLORS.text : COLORS.red);
      cx -= 5;
    }
    let y = N.y + 3 + LINE_HEIGHT;
    for (const [text, color] of N.lines) {
      ui.text(text, N.x + 5, y, color);
      y += LINE_HEIGHT;
    }
  }
}
