// Die Bauleiste (unten rechts). Jede Option zeigt Symbol und Preis, ist
// ausgegraut, solange man sie sich nicht leisten kann, zeigt mit einem
// Füllbalken, wie nah man dran ist, und leuchtet auf, sobald sie bezahlbar
// wird. Tastenkürzel Q R T G C V, Tab wechselt den Reiter.
// Ist ein Bau ausgewählt, zeigt die Leiste dessen Optionen (Abreißen …).
// Was angeboten wird, entscheidet der Builder (core/builder.js).

import { T } from '../data/texts.js';
import { BUILDINGS, TOWER_TAB } from '../data/buildings.js';
import { COLORS } from './ui.js';
import { drawIcon, iconSize } from './icons.js';
import { drawTiny, measure, wrap, LINE_HEIGHT } from './font.js';

export const HOTKEYS = ['KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyC', 'KeyV'];
const KEY_LABELS = ['Q', 'R', 'T', 'G', 'C', 'V'];
const TILE_W = 34;
const TILE_H = 36; // Platz für zwei Preiszeilen (Hüttenausbau: vier Posten)
const GAP = 2;
const FLASH_TIME = 1.4;
const FLASH_AGAIN = 45; // dieselbe Option leuchtet frühestens nach 45 s wieder auf
const ARM_TIME = 2.5;
const TIP_TOP = 40; // letzter Ausweichplatz der Hinweis-Tafel: oben rechts unter dem Vorrat
const TIP_WRAP = 236; // so breit werden Zeilen der Hinweis-Tafel höchstens

export class BuildBar {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.tabIndex = 0;
    this.hover = -1;
    this.flash = new Map(); // Options-ID -> verbleibende Leuchtzeit
    this.affordable = new Map(); // Options-ID -> war bezahlbar?
    this.lastFlash = new Map(); // Options-ID -> this.time beim letzten Aufleuchten
    this.armed = null; // { id, t } – Abreißen/Kaufen per Taste wartet auf Bestätigung
    this.buyLock = 0; // bis wann nach einem Kauf nichts Weiteres gekauft wird
    this.time = 0;
    this.lastLayout = null;
  }

  /** Zeigt die Leiste gerade eine Hinweis-Tafel? */
  get showsTip() {
    return Boolean(this.builder.placement || this.hover >= 0);
  }

  get builder() {
    return this.game.builder;
  }

  tabs() {
    return this.builder.tabs();
  }

  get tab() {
    const tabs = this.tabs();
    return tabs[Math.min(this.tabIndex, tabs.length - 1)];
  }

  layout(ui) {
    const options = this.builder.options(this.tab).slice(0, HOTKEYS.length);
    const n = Math.max(options.length, 1);
    const w = n * TILE_W + (n - 1) * GAP + 8;
    const h = TILE_H + 8;
    const x = ui.width - w - 4;
    const y = ui.height - h - 4;
    // Abreißen liegt immer auf V – so reißt ein gewohntes Q/R/T nie einen Turm ab (m3-r1)
    const tiles = options.map((option, k) => {
      const keyIndex = option.danger ? HOTKEYS.length - 1 : k;
      return { option, keyIndex, key: KEY_LABELS[keyIndex], rect: { x: x + 4 + k * (TILE_W + GAP), y: y + 4, w: TILE_W, h: TILE_H } };
    });
    const selected = this.builder.selectionTitle();
    const title = selected || T.bauleiste.reiter[this.tab];
    const tabs = selected ? [] : this.tabs();
    return { x, y, w, h, tiles, title, tabs };
  }

  /** Mausklicks und Tasten (nur im Spielmodus aufrufen). */
  update(dt, input) {
    this.time += dt;
    for (const [id, t] of this.flash) {
      if (t - dt <= 0) this.flash.delete(id);
      else this.flash.set(id, t - dt);
    }
    if (this.armed) {
      this.armed.t -= dt;
      if (this.armed.t <= 0) this.armed = null;
    }
    const ui = this.game.ui;
    const L = this.layout(ui);
    this.lastLayout = L;

    // Aufleuchten, sobald eine Option bezahlbar wird
    for (const { option } of L.tiles) {
      const ready = option.affordable && !option.disabled;
      if (this.affordable.get(option.id) === false && ready) {
        // Billiges (Barrikade, Laterne) wird oft bezahlbar – sonst nutzt sich das Signal ab
        if (this.time - (this.lastFlash.get(option.id) ?? -FLASH_AGAIN) >= FLASH_AGAIN) {
          this.flash.set(option.id, FLASH_TIME);
          this.lastFlash.set(option.id, this.time);
        }
        this.builder.onOptionAffordable(option);
      }
      this.affordable.set(option.id, ready);
    }

    if (input.pressed('buildTab') && L.tabs.length > 1) this.tabIndex = (this.tabIndex + 1) % L.tabs.length;
    HOTKEYS.forEach((code, k) => {
      const tile = input.pressedCode(code) && L.tiles.find((t) => t.keyIndex === k);
      if (tile) this.activate(tile.option, false);
    });

    this.hover = L.tiles.findIndex((t) => ui.hover(t.rect.x, t.rect.y, t.rect.w, t.rect.h));
    if (input.mouse.clicked && this.contains(ui)) {
      input.consumeClick();
      if (this.hover >= 0) this.activate(L.tiles[this.hover].option, true);
    }
  }

  activate(option, byMouse) {
    if (option.disabled) {
      this.game.hud.toast(option.disabledText || T.bauleiste.gesperrt, null, 2);
      return;
    }
    if (!option.affordable) {
      this.game.hud.toast(option.missingText || T.meldungen.zuTeuer, null, 2.2);
      return;
    }
    if (option.confirm && (!this.armed || this.armed.id !== option.id)) {
      this.armed = { id: option.id, t: ARM_TIME };
      this.game.hud.toast(T.bauleiste.nochmal, 'abriss', 2);
      return;
    }
    // Kaufen per Taste (Aufwertung, Stufe, Spezialisierung) braucht einen
    // zweiten Druck – schnelles Tippen gibt sonst Schrott aus (m3-r2). Ein
    // Mausklick auf die Kachel ist Absicht genug.
    if (option.buy && !byMouse) {
      if (this.time < this.buyLock) return;
      if (!this.armed || this.armed.id !== option.id) {
        this.armed = { id: option.id, t: ARM_TIME, buy: true };
        this.game.hud.toast(T.bauleiste.nochmalKaufen(option.name), option.icon, 2);
        return;
      }
    }
    this.armed = null;
    option.action();
    if (option.buy) this.buyLock = this.time + 0.45; // gleich danach nichts Weiteres kaufen
    if (byMouse && this.builder.placement) this.builder.useMouse = true;
  }

  /** Liegt die Maus über der Leiste (dann gehen Klicks nicht in die Welt)? */
  contains(ui) {
    const L = this.lastLayout || this.layout(ui);
    return ui.hover(L.x, L.y - 15, L.w, L.h + 15);
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    const L = this.layout(ui);
    const ctx = ui.ctx;
    // Kopfzeile: Titel bzw. Reiter
    if (L.tabs.length > 1) {
      let tx = L.x;
      L.tabs.forEach((tab, k) => {
        const label = T.bauleiste.reiter[tab];
        const tw = measure(label) + 10;
        const active = k === this.tabIndex;
        ui.panel(tx, L.y - 15, tw, 17, { fill: active ? COLORS.fillLight : COLORS.fill, frame: active ? COLORS.gold : COLORS.frame, highlight: null });
        ui.text(label, tx + 5, L.y - 14, active ? COLORS.gold : COLORS.textDim);
        tx += tw + 2;
      });
      drawTiny(ctx, 'TAB', tx + 2, L.y - 9, COLORS.textDim);
    } else {
      const tw = measure(L.title) + 10;
      const tx = Math.min(L.x, ui.width - tw - 4);
      ui.panel(tx, L.y - 15, tw, 17, { fill: COLORS.fillLight, highlight: null });
      ui.text(L.title, tx + 5, L.y - 14, COLORS.gold);
    }
    ui.panel(L.x, L.y, L.w, L.h);

    const placing = this.builder.placement;
    L.tiles.forEach((tile, k) => {
      const { option, rect } = tile;
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
        border: armed ? (this.armed.buy ? COLORS.gold : COLORS.red) : pulse ? COLORS.textWarm : active ? COLORS.gold : ready ? readyFrame : COLORS.frameDark,
      });
      const size = iconSize(option.icon);
      drawIcon(ctx, option.icon, rect.x + Math.floor((rect.w - size.w) / 2), rect.y + 2 + Math.max(0, Math.floor((16 - size.h) / 2)));
      if (!ready) ui.ditherRect(rect.x + 1, rect.y + 1, rect.w - 2, 18, 0.35, COLORS.inset);
      if (option.badge) drawTiny(ctx, option.badge, rect.x + rect.w - 6, rect.y + 2, ready ? COLORS.textWarm : COLORS.textDim);
      this.drawCost(ctx, option, rect);
      // Füllbalken: wie nah bin ich dran?
      const barW = rect.w - 4;
      ui.rect(rect.x + 2, rect.y + rect.h - 4, barW, 2, COLORS.outline);
      const fill = option.disabled ? 0 : Math.max(0, Math.min(1, option.progress));
      if (fill > 0) ui.rect(rect.x + 2, rect.y + rect.h - 4, Math.max(1, Math.round(barW * fill)), 2, ready ? COLORS.gold : COLORS.goldDark);
      drawTiny(ctx, tile.key, rect.x + 2, rect.y + 2, ready && !option.danger ? COLORS.gold : COLORS.textDim);
      // Nur zum Teil bezahlbar (Reparieren): kleines % oben rechts (m5-r1)
      if (option.hint && ready) drawTiny(ctx, '%', rect.x + rect.w - 5, rect.y + 2, COLORS.textWarm);
      if (flash > 0) this.drawSparkles(ui, rect, flash);
    });

    // Hinweis-Tafel: gewählte Option beim Platzieren, sonst die unter der Maus
    const tip = this.hover >= 0 ? L.tiles[this.hover]?.option : null;
    if (placing) {
      // Türme: gleich beim ersten Setzen sagen, was die Pünktchen bedeuten (m3-r1)
      const note = BUILDINGS[placing.type].tower ? T.bauleiste.wegeHinweis : TOWER_TAB.includes(placing.type) ? T.bauleiste.wegeHinweisKurz : null;
      this.drawTip(ui, L, { name: placing.name, info: placing.info || T.bautenInfo[placing.type], hint: T.bauleiste.setzen, note, cost: placing.cost }, this.builder.placementRect());
    }
    else if (tip) this.drawTip(ui, L, tip);
  }

  drawCost(ctx, option, rect) {
    if (option.disabled) {
      // Häkchen: gebaut bzw. fertig
      const cx = rect.x + Math.floor(rect.w / 2) - 3;
      const cy = rect.y + 21;
      ctx.fillStyle = COLORS.green;
      for (const [x, y] of [[0, 2], [1, 3], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0]]) ctx.fillRect(cx + x, cy + y, 1, 1);
      return;
    }
    let entries = Object.entries(option.cost || {}).filter(([, v]) => v > 0);
    // Abreißen: statt eines Preises zeigt die Kachel grün, was zurückkommt
    const refund = !entries.length && option.refund;
    if (refund) entries = Object.entries(option.refund).filter(([, v]) => v > 0);
    if (!entries.length) return;
    const inv = this.game.state.inventory;
    const label = (v) => (refund ? `+${v}` : String(v));
    const itemW = ([, v]) => label(v).length * 4 + 5; // Ziffern + Mini-Symbol
    const rowW = (row) => row.reduce((w, e) => w + itemW(e) + 1, 0) - 1;
    // Bis zu zwei Zeilen; passt dann noch etwas nicht, deutet es ein »+« an
    const rows = [[]];
    let more = false;
    for (const e of entries) {
      const row = rows[rows.length - 1];
      if (!row.length || rowW([...row, e]) <= rect.w - 4) row.push(e);
      else if (rows.length < 2) rows.push([e]);
      else more = true;
    }
    rows.forEach((row, r) => {
      const y = rect.y + 20 + r * 6;
      let x = rect.x + Math.round((rect.w - rowW(row)) / 2);
      for (const [res, v] of row) {
        const text = label(v);
        drawTiny(ctx, text, x, y, refund ? COLORS.green : (inv[res] || 0) >= v ? COLORS.text : COLORS.red);
        x += text.length * 4;
        drawIcon(ctx, `mini_${res}`, x, y);
        x += 6;
      }
    });
    if (more) drawTiny(ctx, '+', rect.x + rect.w - 5, rect.y + 26, COLORS.textDim);
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

  /**
   * @param {{x:number, y:number, w:number, h:number}} [avoid] Geist beim Platzieren:
   *   Liegt er unter der Tafel, rückt sie nach oben rechts (m3-r2).
   */
  drawTip(ui, L, option, avoid = null) {
    const inv = this.game.state.inventory;
    const cost = Object.entries(option.cost || {}).filter(([, v]) => v > 0);
    const refund = Object.entries(option.refund || {}).filter(([, v]) => v > 0);
    const row = cost.length ? cost : refund;
    // Lange Zeilen umbrechen: eine schmale Tafel verdeckt weniger Wiese (m3-r2)
    const lines = [
      [option.info, COLORS.textDim],
      [option.hint, COLORS.textWarm],
      [option.note, COLORS.buildBad],
      [option.missingText, COLORS.red],
    ].flatMap(([text, color]) => (text ? wrap(text, TIP_WRAP).map((t) => [t, color]) : []));
    const rowW = row.reduce((sum, [, v]) => sum + 14 + measure(`${refund.length && !cost.length ? '+' : ''}${v}`) + 6, 0);
    const w = Math.max(measure(option.name) + 10, ...lines.map(([t]) => measure(t) + 10), rowW + 10, 90);
    const h = 8 + LINE_HEIGHT + (row.length ? 14 : 0) + lines.length * LINE_HEIGHT;
    // Platz: über der Bauleiste; liegt dort der Geist, links über der Schnellleiste, sonst oben rechts
    const hot = this.game.hud.hotbarRect(ui);
    const spots = [
      { x: Math.min(ui.width - w - 4, Math.max(4, L.x + L.w - w)), y: L.y - 18 - h },
      { x: 4, y: hot.y - 20 - h },
      { x: ui.width - w - 4, y: TIP_TOP },
    ];
    const hits = (p) => avoid && avoid.x < p.x + w && avoid.x + avoid.w > p.x && avoid.y < p.y + h && avoid.y + avoid.h > p.y;
    const { x, y } = spots.find((p) => !hits(p)) || spots[0];
    ui.panel(x, y, w, h);
    let cy = y + 3;
    ui.text(option.name, x + 5, cy, COLORS.gold);
    cy += LINE_HEIGHT;
    if (row.length) {
      let cx = x + 5;
      for (const [res, v] of row) {
        drawIcon(ui.ctx, res, cx, cy + 1);
        const isRefund = row === refund && !cost.length;
        const text = `${isRefund ? '+' : ''}${v}`;
        const color = isRefund ? COLORS.green : (inv[res] || 0) >= v ? COLORS.text : COLORS.red;
        ui.text(text, cx + 12, cy, color);
        cx += 14 + measure(text) + 6;
      }
      cy += 14;
    }
    for (const [text, color] of lines) {
      ui.text(text, x + 5, cy, color);
      cy += LINE_HEIGHT;
    }
  }

}
