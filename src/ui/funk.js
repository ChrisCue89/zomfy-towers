// Hinweise über Funk (N4, Probespiel 29.09.): Anweisungen stehen nicht mehr mitten im
// Bild, sondern in einem Comic-Feld am Rand – seit H1 unten links über Mikas Leiste (das
// Funkgerät hängt an Mikas Gürtel, unten rechts ist das Baumenü). Edda – der früher die
// Holzlände gehörte – spricht über das alte Funkgerät: ihr Foto (sepia, mit Klebeband)
// links, eine helle Sprechblase rechts daneben, in die sich der Text tippt. Sie erklärt das nächste Ziel und jede Funktion beim ersten Mal und
// deutet ihre eigene Geschichte an. Nie ein Dialog: Das Spiel läuft weiter, ein Klick
// auf das Feld tippt fertig bzw. schließt es.

import { P, hexToCss } from '../render/palette.js';
import { measure, wrap, drawText, LINE_HEIGHT } from './font.js';
import { eddaPortrait } from '../render/portrait.js';
import { T } from '../data/texts.js';

/** Tippen (Zeichen je s), Lesezeit, Ein- und Ausfahren (s), Breite der Blase (UI-Pixel). */
export const FUNK = { type: 55, read: 2.6, perChar: 0.045, min: 4.5, slide: 0.22, bubble: 188, photo: 44, queue: 5 };

const PAPER = hexToCss(P.e9);
const INK = hexToCss(P.n1);
const LINE = hexToCss(P.n0);
const SHADOW = hexToCss(P.n0);
const NAME = hexToCss(P.f6);
const NAME_BG = hexToCss(P.d0);

export class Funk {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.queue = [];
    this.current = null; // { text, key, lines, t, typed, total }
    this.photo = null; // Foto (Canvas), beim ersten Zeichnen erzeugt
    this.rect = null; // wo das Feld gerade liegt (für Klicks)
    this.said = 0; // wie viele Zeilen schon gesprochen wurden (Prüfung)
  }

  /**
   * Eine Zeile über Funk; `key` verhindert, dass dieselbe Zeile doppelt wartet. `stale`
   * (N10): Ist die Zeile überholt, wenn sie an der Reihe wäre (das Ziel schon erreicht),
   * fällt sie weg.
   */
  say(text, key = text, stale = null) {
    if (!text) return;
    if (this.current?.key === key || this.queue.some((q) => q.key === key)) return;
    this.queue.push({ text, key, stale });
    if (this.queue.length > FUNK.queue) this.queue.shift();
  }

  /** Einmal im ganzen Spiel (gemerkt in state.flags): Erklärungen beim ersten Mal. */
  once(flag, text, stale = null) {
    const flags = this.game.state.flags;
    if (flags[`funk_${flag}`]) return false;
    flags[`funk_${flag}`] = true;
    this.say(text, flag, stale);
    return true;
  }

  /** Läuft oder wartet gerade etwas? */
  get busy() {
    return Boolean(this.current) || this.queue.length > 0;
  }

  /** Klick aufs Feld: erst fertig tippen, dann ausfahren. */
  skip() {
    const c = this.current;
    if (!c) return;
    const typedAt = FUNK.slide + c.typed;
    if (c.t < typedAt) c.t = typedAt;
    else c.t = Math.max(c.t, c.total - FUNK.slide);
  }

  /** Alles verwerfen (neues Spiel, Abspann). */
  clear() {
    this.queue.length = 0;
    this.current = null;
  }

  /** Liegt die Maus über dem Feld? */
  contains(ui) {
    const r = this.rect;
    return Boolean(r && ui.hover(r.x, r.y, r.w, r.h));
  }

  /** @param {number} dt echte Sekunden (auch in der Zeitlupe gleich schnell) */
  update(dt) {
    while (this.queue.length && this.queue[0].stale?.()) this.queue.shift(); // N10: überholt
    if (!this.current && this.queue.length) {
      const next = this.queue.shift();
      const lines = wrap(next.text, FUNK.bubble - 14);
      const typed = next.text.length / FUNK.type;
      const read = Math.max(FUNK.min, FUNK.read + next.text.length * FUNK.perChar);
      this.current = { ...next, lines, t: 0, typed, total: FUNK.slide + typed + read + FUNK.slide };
      this.said++;
      this.game.sound.play('funk');
    }
    const c = this.current;
    if (!c) return;
    c.t += dt;
    if (c.t >= c.total) this.current = null;
  }

  /**
   * Lage des Felds: unten links über Mikas Gruppe (Schnellleiste, Leben, Erfahrung) – H1.
   * @returns {{x:number, y:number, w:number, h:number, bx:number, by:number, bw:number, bh:number, px:number, py:number}|null}
   */
  layout(ui) {
    const c = this.current;
    if (!c) return null;
    this.photo ||= eddaPortrait({ frame: true, size: FUNK.photo }); // H1: kompakt, Kopf und Schultern
    const pw = this.photo.width;
    const ph = this.photo.height;
    const bw = FUNK.bubble;
    const bh = Math.max(ph - 12, 18 + c.lines.length * LINE_HEIGHT);
    const w = pw + 8 + bw;
    const h = Math.max(ph, bh + 6);
    const top = this.game.hud?.groupTop ? this.game.hud.groupTop(ui) : ui.height;
    const k = Math.min(1, c.t / FUNK.slide, (c.total - c.t) / FUNK.slide);
    const slide = Math.round((1 - Math.max(0, k)) * (w + 10));
    const x = 6 - slide; // gleitet von links herein
    let y = Math.round(top - 6 - h);
    // H4: Bei großer Oberfläche reicht das offene Baumenü bis unter Edda – dann spricht sie darüber
    const bar = this.game.buildbar;
    if (bar?.open && bar.lastLayout) {
      const m = bar.occupiedRect(ui);
      if (x < m.x + m.w && x + w > m.x && y < m.y + m.h && y + h > m.y) y = Math.max(4, m.y - h - 4);
    }
    return { x, y, w, h, px: x, py: y, bx: x + pw + 8, by: y + 4, bw, bh };
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    const L = this.layout(ui);
    this.rect = L ? { x: L.x, y: L.y, w: L.w, h: L.h } : null;
    if (!L) return;
    const c = this.current;
    const ctx = ui.ctx;
    // Sprechblase: helles Papier, dicke Kontur, harter Schatten wie im Comic
    ctx.fillStyle = SHADOW;
    ctx.fillRect(L.bx + 2, L.by + 2, L.bw, L.bh);
    ctx.fillStyle = LINE;
    ctx.fillRect(L.bx - 1, L.by - 1, L.bw + 2, L.bh + 2);
    ctx.fillStyle = PAPER;
    ctx.fillRect(L.bx, L.by, L.bw, L.bh);
    // Zipfel zum Foto (links)
    const ty = L.by + 12;
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = LINE;
      ctx.fillRect(L.bx - 1 - k, ty - 4 + k, 1, 9 - 2 * k);
      if (k < 4) {
        ctx.fillStyle = PAPER;
        ctx.fillRect(L.bx - k, ty - 3 + k, 1, Math.max(1, 7 - 2 * k));
      }
    }
    // Name oben links in der Blase
    const name = T.funk.name;
    const nw = measure(name) + 8;
    ctx.fillStyle = LINE;
    ctx.fillRect(L.bx + 4, L.by - 7, nw + 2, 13);
    ctx.fillStyle = NAME_BG;
    ctx.fillRect(L.bx + 5, L.by - 6, nw, 11);
    drawText(ctx, name, L.bx + 9, L.by - 7, NAME);
    // Text tippt sich hinein (Umbruch steht vorher fest, nichts springt)
    let left = Math.max(0, Math.floor((c.t - FUNK.slide) * FUNK.type));
    c.lines.forEach((line, i) => {
      if (left <= 0) return;
      const part = line.slice(0, left);
      left -= line.length + 1;
      drawText(ctx, part, L.bx + 7, L.by + 7 + i * LINE_HEIGHT, INK);
    });
    // Foto mit Klebeband; solange sie spricht, flackern oben rechts die Balken des Empfangs
    ctx.drawImage(this.photo, L.px, L.py);
    const typing = c.t < FUNK.slide + c.typed;
    const bars = typing ? 1 + (Math.floor(c.t * 9) % 3) : 3;
    for (let k = 0; k < 3; k++) {
      const bx = L.px + this.photo.width - 13 + k * 3;
      const bh = 2 + k * 2;
      ctx.fillStyle = LINE;
      ctx.fillRect(bx - 1, L.py + 10 - bh, 3, bh + 2);
      ctx.fillStyle = k < bars ? NAME : hexToCss(P.e5);
      ctx.fillRect(bx, L.py + 11 - bh, 1, bh);
    }
  }
}
