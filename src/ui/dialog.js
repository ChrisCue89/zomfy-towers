// Dialogfenster mit Porträt, Namensschild, Schreibmaschinen-Text und Antworten.
// Ein Druck während des Tippens zeigt die Zeile ganz. Erscheinen Antworten,
// zählt Bestätigen erst nach einem kurzen Moment – so wählt schnelles
// Durchdrücken nie aus Versehen eine Antwort, die man nicht gesehen hat.
// Die Maus wählt eine Antwort nur, wenn sie bewegt wird.

import { SPRECHER } from '../data/dialogs.js';
import { COLORS } from './ui.js';
import { wrap, measure, LINE_HEIGHT } from './font.js';
import { T } from '../data/texts.js';
import { drawIcon } from './icons.js';

const CHARS_PER_SECOND = 72;
const ANSWER_GUARD = 0.3;

export class DialogBox {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.shown = 0;
    this.choice = 0;
    this.onDone = null;
    this.time = 0;
    this.answersShownAt = null;
    this.layout = null;
  }

  /**
   * @param {Array<{s:string, t:string, antworten?:Array}>} lines
   * @param {(aktion: string|null) => void} [onDone]
   */
  open(lines, onDone = null) {
    this.lines = lines;
    this.index = 0;
    this.shown = 0;
    this.choice = this.defaultChoice(lines[0]);
    this.onDone = onDone;
    this.active = lines.length > 0;
    this.time = 0;
    this.answersShownAt = null;
    this.answerRects = [];
    if (!this.active && onDone) onDone(null);
  }

  get line() {
    return this.lines[this.index];
  }

  get complete() {
    return this.line && this.shown >= this.line.t.length;
  }

  finish(aktion = null) {
    this.active = false;
    const done = this.onDone;
    this.onDone = null;
    if (done) done(aktion);
  }

  advance() {
    if (!this.complete) {
      this.shown = this.line.t.length;
      return;
    }
    const answers = this.line.antworten;
    if (answers && answers.length) {
      this.finish(answers[this.choice].aktion || null);
      return;
    }
    if (this.index < this.lines.length - 1) {
      this.index++;
      this.shown = 0;
      this.choice = this.defaultChoice(this.line);
      this.answersShownAt = null;
    } else {
      this.finish(null);
    }
  }

  /** Vorgewählte Antwort: die als `standard` markierte (harmlose), sonst die erste. */
  defaultChoice(line) {
    const index = (line?.antworten || []).findIndex((a) => a.standard);
    return Math.max(0, index);
  }

  get hasAnswers() {
    return Boolean(this.line && this.line.antworten && this.line.antworten.length);
  }

  /** @param {import('../core/input.js').Input} input */
  update(dt, input) {
    if (!this.active) return;
    this.time += dt;
    if (!this.complete) this.shown = Math.min(this.line.t.length, this.shown + dt * CHARS_PER_SECOND);
    const nav = input.pressed('up') || input.pressed('left') ? -1 : input.pressed('down') || input.pressed('right') ? 1 : 0;
    // Pfeil/WASD während des Tippens: Zeile sofort ganz zeigen
    if (!this.complete && nav && this.hasAnswers) this.shown = this.line.t.length;
    const answers = this.complete ? this.line.antworten : null;
    if (answers && answers.length) {
      if (this.answersShownAt === null) this.answersShownAt = this.time;
      if (nav) this.choice = (this.choice + nav + answers.length) % answers.length;
      const hovered = (this.answerRects || []).findIndex((r) => this.game.ui.hover(r.x, r.y, r.w, r.h));
      if (hovered >= 0 && input.mouse.moved) this.choice = hovered;
      const ready = this.time - this.answersShownAt >= ANSWER_GUARD;
      if (!ready) return;
      if (hovered >= 0 && input.mouse.clicked) {
        this.choice = hovered;
        this.advance();
      } else if (input.pressed('confirm')) {
        this.advance();
      }
      return;
    }
    if (input.pressed('confirm') || input.mouse.clicked) this.advance();
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.active || !this.line) return;
    const line = this.line;
    const speaker = SPRECHER[line.s] || { name: '', portrait: null };
    const portrait = speaker.portrait ? this.game.portraits[speaker.portrait] : null;

    const w = Math.min(ui.width - 24, 440);
    const h = 74;
    const x = Math.round((ui.width - w) / 2);
    const y = ui.height - h - 8;

    // Namensschild
    if (speaker.name) {
      const nw = measure(speaker.name) + 12;
      ui.panel(x + 8, y - 13, nw, 17, { fill: COLORS.fillLight });
      ui.text(speaker.name, x + 14, y - 11, COLORS.gold);
    }
    ui.panel(x, y, w, h);

    let tx = x + 10;
    if (portrait) {
      const size = 56;
      ui.inset(x + 8, y + 9, size, size, { fill: COLORS.inset, border: COLORS.frameDark });
      ui.ctx.drawImage(portrait, x + 8 + Math.floor((size - portrait.width) / 2), y + 9 + Math.floor((size - portrait.height) / 2));
      tx = x + 8 + size + 8;
    }
    const textWidth = x + w - 10 - tx;
    const visible = line.t.slice(0, Math.floor(this.shown));
    const lines = wrap(line.t, textWidth);
    // Sichtbaren Teil zeilenweise ausgeben (Umbruch vom vollständigen Text,
    // damit Wörter beim Tippen nicht springen).
    let remaining = visible.length;
    let consumed = 0;
    lines.forEach((l, i) => {
      if (remaining <= 0) return;
      const part = l.slice(0, remaining);
      ui.text(part, tx, y + 7 + i * LINE_HEIGHT, COLORS.text);
      const used = l.length + (line.t[consumed + l.length] === ' ' || line.t[consumed + l.length] === '\n' ? 1 : 0);
      remaining -= used;
      consumed += used;
    });

    this.answerRects = [];
    if (this.complete) {
      const answers = line.antworten;
      if (answers && answers.length) {
        let ay = y + 7 + lines.length * LINE_HEIGHT + 3;
        answers.forEach((a, i) => {
          const aw = measure(a.t) + 16;
          const rect = { x: tx, y: ay - 1, w: aw, h: LINE_HEIGHT + 1 };
          this.answerRects.push(rect);
          const selected = i === this.choice;
          if (selected) drawIcon(ui.ctx, 'zeiger', tx, ay + 3);
          ui.text(a.t, tx + 7, ay, selected ? COLORS.gold : COLORS.textDim);
          ay += LINE_HEIGHT + 1;
        });
        const hint = T.dialog.auswahlHinweis;
        ui.text(hint, x + w - 10 - measure(hint), y + h - 14, COLORS.textDim);
      } else if (Math.floor(this.time * 2.5) % 2 === 0) {
        drawIcon(ui.ctx, 'weiter', x + w - 14, y + h - 10);
      }
    }
  }
}
