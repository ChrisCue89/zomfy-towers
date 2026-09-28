// Pause-Menü: Weiter, Steuerung, Vollbild, Neues Spiel (mit Rückfrage).
// Layout wird einmal berechnet und von update() (Klicks) und draw() genutzt.
// Schutz vor versehentlichem Löschen: Nach jedem Seitenwechsel zählen Klicks
// kurz nicht, die Maus wählt nur aus, wenn sie bewegt wird, und in der
// Rückfrage liegt „Lieber nicht“ dort, wo eben noch „Neues Spiel“ stand.

import { T } from '../data/texts.js';
import { COLORS } from './ui.js';
import { measure, LINE_HEIGHT, wrap } from './font.js';
import { PIXEL_SIZES, TEXT_SPEEDS, VIEWS } from '../core/settings.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';

/** Einstellungen der Reihe nach; Zahlen gehen von 0 bis 10. */
const SETTING_KEYS = ['master', 'music', 'sfx', 'view', 'pixel', 'text'];
const CHOICES = { pixel: Object.keys(PIXEL_SIZES), text: Object.keys(TEXT_SPEEDS), view: VIEWS };

export class Menu {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.screen = 'main';
    this.focus = 0;
    this.guard = 0;
  }

  open() {
    this.isOpen = true;
    this.go('main');
  }

  close() {
    this.isOpen = false;
  }

  buttons() {
    if (this.screen === 'main') {
      return [
        { label: T.menue.weiter, action: () => this.game.closeMenu() },
        { label: T.menue.steuerung, action: () => this.go('controls') },
        { label: T.menue.einstellungen, action: () => this.go('settings') },
        { label: T.menue.vollbild, action: () => this.game.toggleFullscreen() },
        { label: T.menue.neuesSpiel, action: () => this.go('confirm') },
      ];
    }
    if (this.screen === 'settings') {
      const st = this.game.settings;
      const rows = SETTING_KEYS.map((key) => ({
        label: `${T.menue.einstellung[key]}: ${CHOICES[key] ? T.menue.wert[st[key]] : st[key]}`,
        setting: key,
        action: () => this.change(key, 1, true),
      }));
      // M16: Die Schwierigkeit gehört zum Spielstand und gilt ab der nächsten Nacht
      if (!this.fromTitle) rows.push({ label: `${T.schwierigkeit.titel}: ${T.schwierigkeit[this.game.state.difficulty]}`, setting: 'difficulty', action: () => this.change('difficulty', 1) });
      return [...rows, { label: T.menue.zurueck, action: () => this.go('main') }];
    }
    if (this.screen === 'confirm') {
      return [
        { label: T.menue.sicherJa, action: () => this.game.newGameFromMenu() },
        { label: T.menue.sicherNein, action: () => this.go('main'), safe: true },
      ];
    }
    return [{ label: T.menue.zurueck, action: () => this.go('main') }];
  }

  /**
   * Einen Wert ändern. A/D schieben Zahlen (0–10) bis zum Anschlag – eine
   * leise gestellte Lautstärke springt so nie auf voll (m7-r1). E/Enter geht
   * der Reihe nach weiter, auch mit Umlauf, sonst käme man per E nicht zurück.
   */
  change(key, dir, cycle = false) {
    if (key === 'difficulty') {
      const n = DIFFICULTY_ORDER.length;
      const next = DIFFICULTY_ORDER[(DIFFICULTY_ORDER.indexOf(this.game.state.difficulty) + dir + n) % n];
      this.game.setDifficulty(next);
      this.game.sound.play('klick');
      return;
    }
    const st = this.game.settings;
    let value;
    if (CHOICES[key]) {
      const list = CHOICES[key];
      value = list[(list.indexOf(st[key]) + dir + list.length) % list.length];
    } else value = cycle ? (st[key] + dir + 11) % 11 : Math.max(0, Math.min(10, st[key] + dir));
    if (value === st[key]) return; // am Anschlag: kein Klick, nichts zu speichern
    this.game.applySettings({ [key]: value });
    this.game.sound.play('klick');
  }

  go(screen) {
    // Vom Titelbild aus: »Zurück« führt wieder dorthin, nicht ins Pausenmenü
    if (screen === 'main' && this.fromTitle) {
      this.game.closeMenu();
      return;
    }
    this.screen = screen;
    const safe = this.buttons().findIndex((b) => b.safe);
    this.focus = Math.max(0, safe);
    this.guard = 0.35;
  }

  /** Maße und Knopf-Rechtecke für die aktuelle Seite. */
  layout(ui) {
    const buttons = this.buttons();
    const controls = this.screen === 'controls' ? T.steuerung : [];
    const confirmText = this.screen === 'confirm' ? wrap(T.menue.sicherFrage, 190) : this.screen === 'settings' ? [T.menue.einstellungenHinweis] : [];
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
  update(input, dt = 0) {
    if (!this.isOpen) return;
    this.guard = Math.max(0, this.guard - dt);
    const ui = this.game.ui;
    const { buttons } = this.layout(ui);
    const hovered = buttons.findIndex((b) => ui.hover(b.rect.x, b.rect.y, b.rect.w, b.rect.h));
    if (hovered >= 0 && input.mouse.moved) this.focus = hovered;
    if (input.pressed('up')) this.focus = (this.focus + buttons.length - 1) % buttons.length;
    if (input.pressed('down')) this.focus = (this.focus + 1) % buttons.length;
    // Einstellungen: A/D bzw. Pfeile ändern den Wert der gewählten Zeile
    const focused = buttons[Math.min(this.focus, buttons.length - 1)];
    if (focused?.setting && (input.pressed('left') || input.pressed('right'))) this.change(focused.setting, input.pressed('left') ? -1 : 1);
    if (input.mouse.clicked && this.guard > 0) {
      input.consumeClick();
    } else if (hovered >= 0 && input.mouse.clicked) {
      input.consumeClick();
      buttons[hovered].action();
    } else if (input.pressed('confirm')) {
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
    const title = { controls: T.menue.steuerung, confirm: T.menue.neuesSpiel, settings: T.menue.einstellungen }[this.screen] || T.menue.titel;
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
    L.buttons.forEach((b, i) => ui.button(b.label, b.rect.x, b.rect.y, b.rect.w, b.rect.h, { focused: i === this.focus, hoverHighlight: false }));
    ui.textCentered(T.menue.fusszeile, L.x + L.w / 2, L.y + L.h - 15, COLORS.textDim);
  }
}
