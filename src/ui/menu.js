// Pause-Menü: Weiter, Steuerung, Vollbild, Neues Spiel (mit Rückfrage).
// Layout wird einmal berechnet und von update() (Klicks) und draw() genutzt.

import { T } from '../data/texts.js';
import { COLORS } from './ui.js';
import { measure, LINE_HEIGHT, wrap } from './font.js';

export class Menu {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.screen = 'main';
    this.focus = 0;
  }

  open() {
    this.isOpen = true;
    this.screen = 'main';
    this.focus = 0;
  }

  close() {
    this.isOpen = false;
  }

  buttons() {
    if (this.screen === 'main') {
      return [
        { label: T.menue.weiter, action: () => this.game.closeMenu() },
        { label: T.menue.steuerung, action: () => this.go('controls') },
        { label: T.menue.vollbild, action: () => this.game.toggleFullscreen() },
        { label: T.menue.neuesSpiel, action: () => this.go('confirm') },
      ];
    }
    if (this.screen === 'confirm') {
      return [
        { label: T.menue.sicherNein, action: () => this.go('main') },
        { label: T.menue.sicherJa, action: () => this.game.newGame() },
      ];
    }
    return [{ label: T.menue.zurueck, action: () => this.go('main') }];
  }

  go(screen) {
    this.screen = screen;
    this.focus = 0;
  }

  /** Maße und Knopf-Rechtecke für die aktuelle Seite. */
  layout(ui) {
    const buttons = this.buttons();
    const controls = this.screen === 'controls' ? T.steuerung : [];
    const confirmText = this.screen === 'confirm' ? wrap(T.menue.sicherFrage, 190) : [];
    const w = this.screen === 'controls' ? 250 : 220;
    const bodyH = controls.length ? controls.length * LINE_HEIGHT + 8 : confirmText.length ? confirmText.length * LINE_HEIGHT + 8 : 0;
    const h = 30 + bodyH + buttons.length * 22 + 20;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2);
    let cy = y + 28 + bodyH;
    const rects = buttons.map((b) => {
      const rect = { x: x + 20, y: cy, w: w - 40, h: 19 };
      cy += 22;
      return { ...b, rect };
    });
    return { x, y, w, h, controls, confirmText, buttons: rects };
  }

  /** @param {import('../core/input.js').Input} input */
  update(input) {
    if (!this.isOpen) return;
    const ui = this.game.ui;
    const { buttons } = this.layout(ui);
    const hovered = buttons.findIndex((b) => ui.hover(b.rect.x, b.rect.y, b.rect.w, b.rect.h));
    if (hovered >= 0) this.focus = hovered;
    if (input.pressed('up')) this.focus = (this.focus + buttons.length - 1) % buttons.length;
    if (input.pressed('down')) this.focus = (this.focus + 1) % buttons.length;
    if (hovered >= 0 && input.mouse.clicked) {
      input.consumeClick();
      buttons[hovered].action();
    } else if (input.pressed('use')) {
      buttons[Math.min(this.focus, buttons.length - 1)].action();
    } else if (input.pressed('menu')) {
      if (this.screen === 'main') this.game.closeMenu();
      else this.go('main');
    }
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.isOpen) return;
    ui.ditherFill(0.5);
    const L = this.layout(ui);
    ui.panel(L.x, L.y, L.w, L.h);
    const title = this.screen === 'controls' ? T.menue.steuerung : this.screen === 'confirm' ? T.menue.neuesSpiel : T.menue.titel;
    ui.textCentered(title, L.x + L.w / 2, L.y + 7, COLORS.gold);
    ui.rect(L.x + 10, L.y + 21, L.w - 20, 1, COLORS.frameDark);
    let cy = L.y + 28;
    for (const [key, what] of L.controls) {
      ui.text(key, L.x + 12, cy, COLORS.textWarm);
      ui.text(what, L.x + L.w - 12 - measure(what), cy, COLORS.text);
      cy += LINE_HEIGHT;
    }
    for (const line of L.confirmText) {
      ui.textCentered(line, L.x + L.w / 2, cy, COLORS.text);
      cy += LINE_HEIGHT;
    }
    L.buttons.forEach((b, i) => ui.button(b.label, b.rect.x, b.rect.y, b.rect.w, b.rect.h, { focused: i === this.focus }));
    ui.textCentered(T.menue.fusszeile, L.x + L.w / 2, L.y + L.h - 15, COLORS.textDim);
  }
}
