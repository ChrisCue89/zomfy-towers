// Titelbild (Meilenstein 7): großer Schriftzug über der Lichtung im Abendlicht,
// darunter Weiterspielen, Neues Spiel, Einstellungen und Steuerung. »Neues
// Spiel« führt zur Figur: Name und Aussehen, live an Mika in der Szene.
// Klicks werden in update() ausgewertet (siehe CLAUDE.md).

import { T } from '../data/texts.js';
import { COLORS } from './ui.js';
import { measure, drawText, missingGlyphs } from './font.js';
import { LOOKS, LOOK_KEYS, NAME_MAX, cleanName } from '../data/looks.js';
import { DIFFICULTY_ORDER, DEFAULT_DIFFICULTY } from '../data/difficulty.js';

const LOGO_SCALE = 3;
const GUARD = 0.3; // nach jedem Seitenwechsel zählen Klicks kurz nicht

export class TitleScreen {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.screen = 'main'; // main · figur · confirm
    this.focus = 0;
    this.guard = 0;
    this.t = 0;
    this.editing = false; // Namensfeld nimmt gerade Tasten an
    this.name = 'Mika';
    this.look = { hat: 'orange', jacket: 'gruen', hair: 'braun', skin: 'mittel' };
    this.difficulty = DEFAULT_DIFFICULTY; // M16: Gemütlich · Ausgewogen · Wild
    this.logo = null;
  }

  open(hasSave) {
    this.isOpen = true;
    this.hasSave = hasSave;
    this.go('main');
  }

  close() {
    this.isOpen = false;
    this.editing = false;
  }

  go(screen) {
    this.screen = screen;
    this.focus = screen === 'figur' ? this.rows().length - 2 : 0; // »Los geht’s!« ist vorgewählt
    if (screen === 'confirm') this.focus = 1; // »Lieber nicht«
    this.guard = GUARD;
    this.editing = false;
  }

  rows() {
    const g = this.game;
    if (this.screen === 'main') {
      const list = [];
      if (this.hasSave) list.push({ label: T.titel.weiter, action: () => g.startFromTitle() });
      list.push({ label: T.titel.neu, action: () => this.go(this.hasSave ? 'confirm' : 'figur') });
      list.push({ label: T.menue.einstellungen, action: () => g.openMenuFromTitle('settings') });
      list.push({ label: T.menue.steuerung, action: () => g.openMenuFromTitle('controls') });
      return list;
    }
    if (this.screen === 'confirm') {
      return [
        { label: T.menue.sicherJa, action: () => this.go('figur') },
        { label: T.menue.sicherNein, action: () => this.go('main') },
      ];
    }
    // Figur: Name, vier Aussehen-Zeilen, Schwierigkeit (M16), Los, Zurück
    return [
      { label: `${T.titel.name}: ${this.name}${this.editing && Math.floor(this.t * 2.5) % 2 === 0 ? '_' : ''}`, name: true, action: () => this.toggleEditing() },
      ...LOOK_KEYS.map((key) => ({ label: `${T.titel.aussehen[key]}: ${T.titel.werte[key][this.look[key]]}`, look: key, action: () => this.changeLook(key, 1) })),
      { label: `${T.schwierigkeit.titel}: ${T.schwierigkeit[this.difficulty]}`, difficulty: true, action: () => this.changeDifficulty(1) },
      { label: T.titel.los, action: () => this.game.startNewFromTitle(cleanName(this.name), { ...this.look }, this.difficulty) },
      { label: T.menue.zurueck, action: () => this.go('main') },
    ];
  }

  toggleEditing() {
    this.editing = !this.editing;
    if (!this.editing) this.name = cleanName(this.name);
  }

  changeDifficulty(dir) {
    const n = DIFFICULTY_ORDER.length;
    this.difficulty = DIFFICULTY_ORDER[(DIFFICULTY_ORDER.indexOf(this.difficulty) + dir + n) % n];
    this.game.sound.play('klick');
  }

  changeLook(key, dir) {
    const options = Object.keys(LOOKS[key]);
    this.look[key] = options[(options.indexOf(this.look[key]) + dir + options.length) % options.length];
    this.game.previewLook(this.look);
    this.game.sound.play('klick');
  }

  layout(ui) {
    const rows = this.rows();
    const figur = this.screen === 'figur';
    const w = figur ? 200 : 170;
    const rowH = 19;
    const gap = 3;
    const h = rows.length * (rowH + gap) - gap;
    // Hauptseite: mittig unter dem Schriftzug; Figur: rechts, damit Mika frei steht
    const x = figur ? Math.round(ui.width * 0.62) : Math.round((ui.width - w) / 2);
    const y = figur ? Math.round((ui.height - h) / 2) + 10 : Math.round(ui.height * 0.5);
    return { x, y, w, rows: rows.map((r, k) => ({ ...r, rect: { x, y: y + k * (rowH + gap), w, h: rowH } })) };
  }

  /** @param {import('../core/input.js').Input} input */
  update(input, dt) {
    if (!this.isOpen) return;
    this.t += dt;
    this.guard = Math.max(0, this.guard - dt);
    const ui = this.game.ui;
    // Namensfeld: Tasten gehen in den Namen, Enter oder Esc beendet
    if (this.editing) {
      for (const key of input.typed) {
        if (key === 'Backspace') this.name = this.name.slice(0, -1);
        else if (this.name.length < NAME_MAX && /[A-Za-zÄÖÜäöüß\- ]/.test(key) && !missingGlyphs(key).length) this.name += key;
      }
      // Nur Enter oder Esc beenden – E ist hier ein Buchstabe
      if (input.pressedCode('Enter') || input.pressedCode('NumpadEnter') || input.pressed('cancel')) this.toggleEditing();
      return;
    }
    const L = this.layout(ui);
    const hovered = L.rows.findIndex((r) => ui.hover(r.rect.x, r.rect.y, r.rect.w, r.rect.h));
    if (hovered >= 0 && input.mouse.moved) this.focus = hovered;
    if (input.pressed('up')) this.focus = (this.focus + L.rows.length - 1) % L.rows.length;
    if (input.pressed('down')) this.focus = (this.focus + 1) % L.rows.length;
    const focused = L.rows[Math.min(this.focus, L.rows.length - 1)];
    if (focused?.look && (input.pressed('left') || input.pressed('right'))) this.changeLook(focused.look, input.pressed('left') ? -1 : 1);
    if (focused?.difficulty && (input.pressed('left') || input.pressed('right'))) this.changeDifficulty(input.pressed('left') ? -1 : 1);
    if (input.mouse.clicked && this.guard > 0) {
      input.consumeClick();
    } else if (hovered >= 0 && input.mouse.clicked) {
      input.consumeClick();
      this.focus = hovered;
      this.game.sound.play('klick');
      L.rows[hovered].action();
    } else if (input.pressed('confirm') && this.guard <= 0) {
      this.game.sound.play('klick');
      focused.action();
    } else if (input.pressed('menu') && this.screen !== 'main') {
      this.go('main');
    }
  }

  /** Schriftzug einmal in ein eigenes Bild zeichnen und dann groß kopieren. */
  logoCanvas() {
    if (this.logo) return this.logo;
    const text = T.spielName;
    const w = measure(text) + 4;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = 14;
    const ctx = c.getContext('2d');
    drawText(ctx, text, 2, 1, COLORS.gold, { outline: COLORS.outline });
    this.logo = c;
    return c;
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.isOpen) return;
    const ctx = ui.ctx;
    const figur = this.screen === 'figur';
    // Schriftzug mit Schatten, darunter der Untertitel
    const logo = this.logoCanvas();
    const lw = logo.width * LOGO_SCALE;
    const lx = figur ? Math.round(ui.width * 0.62 + 100 - lw / 2) : Math.round((ui.width - lw) / 2);
    const ly = figur ? 24 : Math.round(ui.height * 0.2);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(logo, lx + LOGO_SCALE, ly + LOGO_SCALE, lw, logo.height * LOGO_SCALE);
    ctx.globalAlpha = 1;
    ctx.drawImage(logo, lx, ly, lw, logo.height * LOGO_SCALE);
    if (!figur) ui.textCentered(T.titel.untertitel, ui.width / 2, ly + logo.height * LOGO_SCALE + 4, COLORS.textWarm, { outline: COLORS.outline });

    const L = this.layout(ui);
    if (figur) {
      ui.panel(L.x - 8, L.y - 24, L.w + 16, L.rows.length * 22 + 28);
      ui.textCentered(T.titel.figur, L.x + L.w / 2, L.y - 18, COLORS.gold);
    } else if (this.screen === 'confirm') {
      ui.textCentered(T.menue.sicherFrage, ui.width / 2, L.y - 16, COLORS.text, { outline: COLORS.outline });
    }
    L.rows.forEach((r, k) => ui.button(r.label, r.rect.x, r.rect.y, r.rect.w, r.rect.h, { focused: k === this.focus, hoverHighlight: false }));
    // Auf der Zeile »Schwierigkeit« sagt der Hinweis, was sie bedeutet (M16)
    const onDifficulty = figur && L.rows[this.focus]?.difficulty;
    const hint = this.editing ? T.titel.hinweisName : onDifficulty ? T.schwierigkeit.info[this.difficulty] : figur ? T.titel.hinweisFigur : T.titel.hinweis;
    ui.textCentered(hint, ui.width / 2, ui.height - 16, COLORS.textDim, { outline: COLORS.outline });
  }
}
