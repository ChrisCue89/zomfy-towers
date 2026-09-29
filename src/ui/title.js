// Titelbild (Meilenstein 7): großer Schriftzug über der Lichtung im Abendlicht,
// darunter Weiterspielen, Neues Spiel, Einstellungen und Steuerung. »Neues
// Spiel« führt zur Figur: Name, Figur (Frau/Mann, N5) und Aussehen, live an Mika in
// der Szene, dazu Schwierigkeit und Einführung (N5: mit Edda oder ohne).
// N5 (Probespiel: »steht hellgrau unten – völlig deplatziert«): Was eine Zeile
// bedeutet, steht in einem Kasten mit Zipfel direkt an der gewählten Zeile, die
// Tasten stehen im Rahmen des Fensters.
// Klicks werden in update() ausgewertet (siehe CLAUDE.md).

import { T } from '../data/texts.js';
import { COLORS } from './ui.js';
import { measure, drawText, missingGlyphs, wrap, LINE_HEIGHT } from './font.js';
import { LOOKS, LOOK_KEYS, DEFAULT_LOOK, NAME_MAX, cleanName } from '../data/looks.js';
import { DIFFICULTY_ORDER, DEFAULT_DIFFICULTY } from '../data/difficulty.js';

const LOGO_SCALE = 3;
const GUARD = 0.3; // nach jedem Seitenwechsel zählen Klicks kurz nicht
const START_GUARD = 1.2; // m16-r1: »Los geht’s!« erst nach einem Moment – Tastenspam übersprang Name und Schwierigkeit

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
    this.look = { ...DEFAULT_LOOK };
    this.difficulty = DEFAULT_DIFFICULTY; // M16: Gemütlich · Ausgewogen · Wild
    this.tutorial = true; // N5: Einführung mit Edda (abwählbar)
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
    this.startGuard = screen === 'figur' ? START_GUARD : 0;
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
    // Figur: Name, Figur und Aussehen, Schwierigkeit (M16), Einführung (N5), Los, Zurück –
    // jede Zeile mit ihrer Erklärung (`info`, im Kasten an der Zeile)
    const I = T.titel.info;
    return [
      { label: `${T.titel.name}: ${this.name}${this.editing && Math.floor(this.t * 2.5) % 2 === 0 ? '_' : ''}`, name: true, info: I.name, action: () => this.toggleEditing() },
      ...LOOK_KEYS.map((key) => ({ label: `${T.titel.aussehen[key]}: ${T.titel.werte[key][this.look[key]]}`, look: key, info: key === 'body' ? I.body : I.aussehen, action: () => this.changeLook(key, 1) })),
      { label: `${T.schwierigkeit.titel}: ${T.schwierigkeit[this.difficulty]}`, difficulty: true, info: T.schwierigkeit.info[this.difficulty], action: () => this.changeDifficulty(1) },
      { label: `${T.titel.einfuehrung}: ${this.tutorial ? T.titel.mitEdda : T.titel.ohne}`, tutorial: true, info: I.einfuehrung[this.tutorial ? 'an' : 'aus'], action: () => this.toggleTutorial() },
      { label: T.titel.los, start: true, info: I.los, action: () => this.game.startNewFromTitle(cleanName(this.name), { ...this.look }, this.difficulty, this.tutorial) },
      { label: T.menue.zurueck, action: () => this.go('main') },
    ];
  }

  toggleEditing() {
    this.editing = !this.editing;
    if (!this.editing) this.name = cleanName(this.name);
  }

  toggleTutorial() {
    this.tutorial = !this.tutorial;
    this.game.sound.play('klick');
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
    this.startGuard = Math.max(0, (this.startGuard || 0) - dt);
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
    if (focused?.tutorial && (input.pressed('left') || input.pressed('right'))) this.toggleTutorial();
    if (input.mouse.clicked && this.guard > 0) {
      input.consumeClick();
    } else if (hovered >= 0 && input.mouse.clicked) {
      input.consumeClick();
      this.focus = hovered;
      this.game.sound.play('klick');
      L.rows[hovered].action();
    } else if (input.pressed('confirm') && this.guard <= 0 && !(focused?.start && this.startGuard > 0)) {
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
    const scale = figur ? 2 : LOGO_SCALE; // N5: auf der Figurseite kleiner – das Fenster ist höher geworden
    const lw = logo.width * scale;
    const lx = figur ? Math.round(ui.width * 0.62 + 100 - lw / 2) : Math.round((ui.width - lw) / 2);
    const ly = figur ? 16 : Math.round(ui.height * 0.2);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(logo, lx + scale, ly + scale, lw, logo.height * scale);
    ctx.globalAlpha = 1;
    ctx.drawImage(logo, lx, ly, lw, logo.height * scale);
    if (!figur) ui.textCentered(T.titel.untertitel, ui.width / 2, ly + logo.height * scale + 4, COLORS.textWarm, { outline: COLORS.outline });

    const L = this.layout(ui);
    const rowsBottom = L.rows.length ? L.rows[L.rows.length - 1].rect.y + L.rows[L.rows.length - 1].rect.h : L.y;
    if (figur) {
      // Rahmen mit Titel oben und der Tastenzeile unten im Fenster (N5)
      ui.panel(L.x - 8, L.y - 24, L.w + 16, rowsBottom - L.y + 24 + LINE_HEIGHT + 10);
      ui.textCentered(T.titel.figur, L.x + L.w / 2, L.y - 18, COLORS.gold);
      ui.rect(L.x, rowsBottom + 4, L.w, 1, COLORS.frameDark);
      ui.textCentered(this.editing ? T.titel.hinweisName : T.titel.hinweisFigur, L.x + L.w / 2, rowsBottom + 7, COLORS.textWarm);
    } else if (this.screen === 'confirm') {
      ui.textCentered(T.menue.sicherFrage, ui.width / 2, L.y - 16, COLORS.text, { outline: COLORS.outline });
    }
    L.rows.forEach((r, k) => ui.button(r.label, r.rect.x, r.rect.y, r.rect.w, r.rect.h, { focused: k === this.focus, hoverHighlight: false }));
    // Hauptseite: die Tasten direkt unter den Knöpfen, hell und mit Kontur (nicht mehr am Bildrand)
    if (!figur) ui.textCentered(T.titel.hinweis, ui.width / 2, rowsBottom + 8, COLORS.textWarm, { outline: COLORS.outline });
    // N5: Was die gewählte Zeile bedeutet – im Kasten mit Zipfel links neben der Zeile
    const focused = L.rows[this.focus];
    this.infoRect = null;
    if (figur && focused?.info) this.drawInfo(ui, focused.info, focused.rect);
  }

  /** Erklärkasten links an einer Zeile: warmes Papier auf dunklem Rahmen, Zipfel zur Zeile. */
  drawInfo(ui, text, row) {
    const w = 150;
    const lines = wrap(text, w - 14);
    const h = lines.length * LINE_HEIGHT + 10;
    const x = row.x - 8 - 10 - w;
    const y = Math.max(4, Math.min(ui.height - h - 4, Math.round(row.y + row.h / 2 - h / 2)));
    ui.panel(x, y, w, h, { frame: COLORS.gold });
    this.infoRect = { x, y, w, h, text, row: { ...row } };
    lines.forEach((line, k) => ui.text(line, x + 7, y + 5 + k * LINE_HEIGHT, COLORS.text));
    // Zipfel zur Zeile
    const cy = Math.round(row.y + row.h / 2);
    const ctx = ui.ctx;
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(x + w + k, cy - 4 + k, 1, 9 - 2 * k);
    }
  }
}
