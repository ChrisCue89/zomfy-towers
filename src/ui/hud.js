// HUD: Tag und Uhrzeit, Ressourcen, Schnellleiste, Kontexthinweise und Meldungen.

import { T } from '../data/texts.js';
import { RESOURCES, ITEMS, HOTBAR_SIZE } from '../data/items.js';
import { clockText, hoursOf } from '../core/state.js';
import { COLORS } from './ui.js';
import { measure, LINE_HEIGHT, drawTiny } from './font.js';
import { drawIcon, iconSize } from './icons.js';

const SLOT = 20;

/** Anzeigename der Tageszeit, z. B. „Vormittag“. */
export function dayPartLabel(hours) {
  const h = ((hours % 24) + 24) % 24;
  let label = T.tageszeiten[T.tageszeiten.length - 1][1];
  for (const [from, name] of T.tageszeiten) if (h >= from) label = name;
  return label;
}
const SLOT_GAP = 2;

export class Hud {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.toasts = [];
    this.itemLabel = { text: '', time: 0 };
    this.hint = { text: '', time: 0 };
    this.prompt = null; // { text, x, y }
    this.debugLines = null;
    this.slotRects = [];
  }

  toast(text, icon = null, duration = 2.8) {
    this.toasts.push({ text, icon, time: 0, duration });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  showItemLabel(text) {
    this.itemLabel = { text, time: 1.8 };
  }

  showHint(text, duration = 12) {
    this.hint = { text, time: duration };
  }

  update(dt) {
    for (const t of this.toasts) t.time += dt;
    this.toasts = this.toasts.filter((t) => t.time < t.duration);
    this.itemLabel.time = Math.max(0, this.itemLabel.time - dt);
    this.hint.time = Math.max(0, this.hint.time - dt);
  }

  /**
   * @param {import('./ui.js').UICanvas} ui
   * @param {{hotbar: boolean, prompt: boolean}} show
   */
  draw(ui, show) {
    this.drawClock(ui);
    this.drawResources(ui);
    if (show.hotbar) this.drawHotbar(ui);
    if (show.prompt && this.prompt) this.drawPrompt(ui, this.prompt);
    if (show.hotbar) this.drawLabels(ui);
    this.drawToasts(ui);
    if (this.debugLines) this.drawDebug(ui);
  }

  drawClock(ui) {
    const state = this.game.state;
    const hours = hoursOf(state.time.minute);
    const icon = (hours >= 5 && hours < 7.5) || (hours >= 18.5 && hours < 21) ? 'daemmerung' : hours >= 7.5 && hours < 18.5 ? 'sonne' : 'mond';
    const line1 = `${T.tag} ${state.time.day}`;
    const line2 = `${clockText(state.time.minute)} · ${dayPartLabel(hours)}`;
    const w = Math.max(measure(line1), measure(line2)) + 32;
    const x = 4;
    const y = 4;
    ui.panel(x, y, w, 34);
    ui.inset(x + 5, y + 6, 16, 16, { fill: COLORS.inset });
    drawIcon(ui.ctx, icon, x + 7, y + 8);
    ui.text(line1, x + 26, y + 2, COLORS.gold);
    ui.text(line2, x + 26, y + 14, COLORS.text);
    // Tagesfortschritt (Tag beginnt um 06:00) als dünner Balken
    const progress = state.time.minute / 1440;
    ui.rect(x + 5, y + 27, w - 10, 2, COLORS.inset);
    ui.rect(x + 5, y + 27, Math.max(1, Math.round((w - 10) * progress)), 2, COLORS.goldDark);
  }

  drawResources(ui) {
    const inv = this.game.state.inventory;
    const entries = RESOURCES.map((id) => ({ id, value: String(inv[id] ?? 0) }));
    const widths = entries.map((e) => 10 + 3 + measure(e.value));
    const total = widths.reduce((a, b) => a + b, 0) + (entries.length - 1) * 7 + 12;
    const x0 = ui.width - total - 4;
    const y = 4;
    ui.panel(x0, y, total, 20);
    let x = x0 + 6;
    const hovered = [];
    entries.forEach((e, i) => {
      drawIcon(ui.ctx, e.id, x, y + 5);
      ui.text(e.value, x + 13, y + 3, COLORS.text);
      if (ui.hover(x, y, widths[i], 20)) hovered.push(e.id);
      x += widths[i] + 7;
    });
    if (hovered.length) {
      const name = T.ressourcen[hovered[0]];
      const w = measure(name) + 10;
      const mx = Math.min(ui.width - w - 2, Math.max(2, ui.mouse.x - w / 2));
      ui.panel(mx, y + 23, w, 16);
      ui.text(name, mx + 5, y + 25, COLORS.textWarm);
    }
  }

  hotbarRect(ui) {
    const width = HOTBAR_SIZE * SLOT + (HOTBAR_SIZE - 1) * SLOT_GAP + 8;
    return { x: Math.round((ui.width - width) / 2), y: ui.height - SLOT - 12, w: width, h: SLOT + 8 };
  }

  drawHotbar(ui) {
    const { slots, selected } = this.game.state.hotbar;
    const r = this.hotbarRect(ui);
    ui.panel(r.x, r.y, r.w, r.h);
    this.slotRects = [];
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const sx = r.x + 4 + i * (SLOT + SLOT_GAP);
      const sy = r.y + 4;
      const isSelected = i === selected;
      const hovered = ui.hover(sx, sy, SLOT, SLOT);
      ui.inset(sx, sy, SLOT, SLOT, {
        fill: isSelected ? COLORS.fillHover : hovered ? COLORS.fillLight : COLORS.inset,
        border: isSelected ? COLORS.gold : COLORS.frameDark,
      });
      const item = slots[i];
      if (item && ITEMS[item]) {
        const lit = item === 'laterne' && this.game.player.holdingLantern;
        const icon = lit ? ITEMS[item].icon : ITEMS[item].iconOff;
        const size = iconSize(icon);
        drawIcon(ui.ctx, icon, sx + Math.floor((SLOT - size.w) / 2), sy + Math.floor((SLOT - size.h) / 2));
      }
      drawTiny(ui.ctx, i + 1, sx + 2, sy + 2, isSelected ? COLORS.gold : COLORS.textDim);
      this.slotRects.push({ x: sx, y: sy, w: SLOT, h: SLOT });
    }
  }

  /** Index des Platzes unter der Maus oder -1. */
  slotAt(ui) {
    return this.slotRects.findIndex((s) => ui.hover(s.x, s.y, s.w, s.h));
  }

  drawLabels(ui) {
    const r = this.hotbarRect(ui);
    if (this.itemLabel.time > 0 && this.itemLabel.text) {
      ui.textCentered(this.itemLabel.text, ui.width / 2, r.y - 14, COLORS.gold, { outline: COLORS.outline });
    } else if (this.hint.time > 0 && this.hint.text) {
      const blinkOut = this.hint.time < 1 && Math.floor(this.hint.time * 8) % 2 === 0;
      if (!blinkOut) ui.textCentered(this.hint.text, ui.width / 2, r.y - 14, COLORS.textWarm, { outline: COLORS.outline });
    }
  }

  drawPrompt(ui, prompt) {
    const label = prompt.text;
    const w = measure(label) + 24;
    const h = 17;
    const x = Math.round(Math.min(ui.width - w - 2, Math.max(2, prompt.x - w / 2)));
    const y = Math.round(Math.min(ui.height - 60, Math.max(40, prompt.y - h)));
    ui.panel(x, y, w, h);
    // Tastenkappe
    ui.inset(x + 4, y + 3, 11, 11, { fill: COLORS.textWarm, border: COLORS.outline });
    ui.text(T.tasten.benutzen, x + 7, y + 1, COLORS.outline);
    ui.text(label, x + 19, y + 2, COLORS.text);
  }

  drawToasts(ui) {
    let y = 40;
    for (const t of this.toasts) {
      const w = measure(t.text) + (t.icon ? 26 : 12);
      const slide = Math.min(1, t.time / 0.18);
      const out = t.duration - t.time < 0.35 && Math.floor(t.time * 12) % 2 === 0;
      if (!out) {
        const x = Math.round((ui.width - w) / 2);
        const yy = Math.round(y - (1 - slide) * 6);
        ui.panel(x, yy, w, 18);
        let tx = x + 6;
        if (t.icon) {
          drawIcon(ui.ctx, t.icon, x + 5, yy + 4);
          tx = x + 20;
        }
        ui.text(t.text, tx, yy + 3, COLORS.textWarm);
      }
      y += 21;
    }
  }

  drawDebug(ui) {
    const lines = this.debugLines;
    const w = Math.max(...lines.map((l) => measure(l))) + 10;
    const x = 4;
    const y = 40;
    ui.panel(x, y, w, lines.length * LINE_HEIGHT + 6, { fill: COLORS.inset });
    lines.forEach((l, i) => ui.text(l, x + 5, y + 2 + i * LINE_HEIGHT, i === 0 ? COLORS.gold : COLORS.text));
  }
}
