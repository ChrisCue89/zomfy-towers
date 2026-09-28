// Perk-Wahl nach einem Stufenaufstieg (DESIGN.md 6.13): drei Karten, das
// Spiel hält an. Wählen mit 1/2/3, A/D und E oder per Klick. In den ersten
// Augenblicken zählen keine Eingaben – wer gerade E hämmert, wählt nicht aus
// Versehen. Klicks werden in update() ausgewertet (siehe CLAUDE.md).
// Dieselben Karten zeigen auf Stufe 3, 6 und 9 die Fähigkeiten (M16): erst
// lernen (»lernen«), dann schärfen (»schaerfen«).

import { T } from '../data/texts.js';
import { PERKS, perkLevel } from '../data/perks.js';
import { SKILLS, SKILL_MAX_RANK } from '../data/skills.js';
import { COLORS } from './ui.js';
import { drawIcon, iconSize } from './icons.js';
import { measure, wrap, LINE_HEIGHT } from './font.js';

const CARD_W = 124;
const CARD_H = 112;
const GAP = 8;
const LOCK = 0.5;

export class PerkChoice {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.options = [];
    this.focus = 0;
    this.t = 0;
    this.level = 1;
    this.kind = 'perk'; // 'perk' | 'lernen' | 'schaerfen' (M16)
  }

  open(options, level, kind = 'perk') {
    this.isOpen = true;
    this.options = options;
    this.level = level;
    this.kind = kind;
    this.focus = 0;
    this.t = 0;
    this.aimed = false; // Maus seit dem Öffnen bewegt? Erst dann zählt ein Klick (m12-r1)
  }

  close() {
    this.isOpen = false;
  }

  layout(ui) {
    const n = this.options.length;
    const total = n * CARD_W + (n - 1) * GAP;
    const x0 = Math.round((ui.width - total) / 2);
    const y = Math.round((ui.height - CARD_H) / 2) + 4;
    return this.options.map((id, k) => ({ id, rect: { x: x0 + k * (CARD_W + GAP), y, w: CARD_W, h: CARD_H } }));
  }

  /** Unterkante samt Hinweiszeile (Meldungen erscheinen darunter). */
  bottom(ui) {
    return Math.round((ui.height - CARD_H) / 2) + 4 + CARD_H + 22;
  }

  /**
   * @param {import('../core/input.js').Input} input
   * @returns {string|null} gewählter Perk
   */
  update(input, dt) {
    if (!this.isOpen) return null;
    this.t += dt;
    const ui = this.game.ui;
    const cards = this.layout(ui);
    const hovered = cards.findIndex((c) => ui.hover(c.rect.x, c.rect.y, c.rect.w, c.rect.h));
    if (input.mouse.moved) this.aimed = true;
    if (hovered >= 0 && input.mouse.moved) this.focus = hovered;
    // W/S wandern mit (m7-r1: Theo drückte S, S, Enter und bekam die erste Karte)
    if (input.pressed('left') || input.pressed('up')) this.focus = (this.focus + cards.length - 1) % cards.length;
    if (input.pressed('right') || input.pressed('down')) this.focus = (this.focus + 1) % cards.length;
    if (this.t < LOCK) {
      // m16-r1: Eine Ziffer in der Sperre wählt schon sichtbar aus (bestätigt aber nicht) –
      // sonst nahm das nächste E die Vorauswahl, und Theo bekam Konter statt Sammlerherz
      for (let k = 0; k < cards.length; k++) if (input.pressed(`slot${k + 1}`)) this.focus = k;
      if (input.mouse.clicked) input.consumeClick();
      return null;
    }
    for (let k = 0; k < cards.length; k++) if (input.pressed(`slot${k + 1}`)) return cards[k].id;
    // Ein Klick wählt nur, wenn die Maus bewusst auf eine Karte gezielt hat –
    // ein Schlag-Klick aus dem Kampf wählt sonst ungesehen (m12-r1)
    if (input.mouse.clicked && (hovered < 0 || !this.aimed)) input.consumeClick();
    if (hovered >= 0 && this.aimed && input.mouse.clicked) {
      input.consumeClick();
      return cards[hovered].id;
    }
    if (input.pressed('confirm')) return cards[this.focus]?.id || null;
    return null;
  }

  /** Solange die Wahl gesperrt ist, liegen die Karten gerastert im Schatten (m16-r1: die Sperre war unsichtbar). */
  drawLock(ui, rect) {
    if (this.t < LOCK) ui.ditherRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 0.45 * (1 - this.t / LOCK) + 0.1, COLORS.night);
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.isOpen) return;
    const st = this.game.state;
    const cards = this.layout(ui);
    ui.ditherFill(0.45);
    const skill = this.kind !== 'perk';
    const title = !skill ? T.perks.titel(this.level) : this.kind === 'lernen' ? T.faehigkeiten.titelLernen(this.level) : T.faehigkeiten.titelSchaerfen(this.level);
    const tw = measure(title) + 16;
    ui.panel(Math.round((ui.width - tw) / 2), cards[0].rect.y - 30, tw, 20, { fill: COLORS.fillLight });
    ui.textCentered(title, ui.width / 2, cards[0].rect.y - 27, COLORS.gold);
    cards.forEach(({ id, rect }, k) => {
      const focused = k === this.focus;
      const perk = skill ? { icon: SKILLS[id].icon, max: SKILL_MAX_RANK } : PERKS[id];
      const [name, baseInfo] = skill ? T.faehigkeiten[id] : T.perks[id];
      const have = skill ? this.game.skills.rankOf(id) : perkLevel(st, id);
      const info = this.kind === 'schaerfen' ? T.faehigkeiten.rang(have + 1) : baseInfo;
      ui.panel(rect.x, rect.y, rect.w, rect.h, { fill: focused ? COLORS.fillHover : COLORS.fill, frame: focused ? COLORS.gold : COLORS.frame });
      // Taste 1/2/3 oben links
      ui.text(String(k + 1), rect.x + 5, rect.y + 3, focused ? COLORS.gold : COLORS.textDim);
      const size = iconSize(perk.icon);
      ui.inset(rect.x + rect.w / 2 - 11, rect.y + 6, 22, 22, { fill: COLORS.inset });
      drawIcon(ui.ctx, perk.icon, Math.round(rect.x + rect.w / 2 - size.w / 2), Math.round(rect.y + 17 - size.h / 2));
      ui.textCentered(name, rect.x + rect.w / 2, rect.y + 32, focused ? COLORS.gold : COLORS.text);
      const lines = wrap(info, rect.w - 12);
      lines.slice(0, 4).forEach((line, i) => ui.text(line, rect.x + 6, rect.y + 48 + i * LINE_HEIGHT, COLORS.textDim));
      // Eine neue Fähigkeit: Taste statt Stufen-Punkten
      if (this.kind === 'lernen') {
        ui.textCentered(T.faehigkeiten.liegtAuf, rect.x + rect.w / 2, rect.y + rect.h - 13, focused ? COLORS.textWarm : COLORS.frame);
        return;
      }
      // Stufen-Punkte: schon genommen / möglich
      for (let n = 0; n < perk.max; n++) {
        const px = rect.x + rect.w / 2 - (perk.max * 6) / 2 + n * 6;
        ui.rect(px, rect.y + rect.h - 9, 4, 4, COLORS.outline);
        ui.rect(px + 1, rect.y + rect.h - 8, 2, 2, n < have ? COLORS.gold : n === have ? (focused ? COLORS.textWarm : COLORS.frame) : COLORS.inset);
      }
    });
    for (const { rect } of cards) this.drawLock(ui, rect);
    // Der Tasten-Hinweis erscheint erst, wenn die Wahl Eingaben annimmt (m5-r1: 1/2/3 »ohne Wirkung«)
    if (this.t >= LOCK) ui.textCentered(T.perks.hinweis, ui.width / 2, cards[0].rect.y + CARD_H + 8, COLORS.textDim, { outline: COLORS.outline });
  }
}
