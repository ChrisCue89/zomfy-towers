// Morgenbericht (DESIGN.md 6.12): besiegte Schlurfer, eingesammeltes Loot,
// Schäden – und nach einer verlorenen Nacht, was weg ist. E, Leertaste oder
// Klick schließt ihn.

import { T } from '../data/texts.js';
import { clockText } from '../core/state.js';
import { RESOURCES } from '../data/items.js';
import { FLAWLESS } from '../data/risk.js';
import { STAR_KEYS } from '../data/book.js';
import { COLORS } from './ui.js';
import { measure, LINE_HEIGHT, wrap } from './font.js';
import { drawIcon } from './icons.js';

/** Sternenzeile (M25): Platz für ein Symbol samt Abstand zum Namen, Abstand zwischen zwei Sternen. */
const STAR_ICON = 12;
const STAR_GAP = 12;

export class ReportPanel {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.report = null;
    this.time = 0;
  }

  open(report) {
    this.report = report;
    this.time = 0;
  }

  get isOpen() {
    return Boolean(this.report);
  }

  /** @param {import('../core/input.js').Input} input */
  update(dt, input) {
    if (!this.report) return false;
    this.time += dt;
    // Auch Loslaufen schließt ihn (m5-r1: WASD bei offenem Bericht fühlte sich wie Festhängen an)
    const move = this.time > 0.8 && (input.pressed('up') || input.pressed('down') || input.pressed('left') || input.pressed('right'));
    if (move || (this.time > 0.4 && (input.pressed('confirm') || input.mouse.clicked || input.pressed('menu')))) {
      input.consumeClick();
      this.report = null;
      return true;
    }
    return false;
  }

  /** Zeilen des Berichts – mit `ui` so umgebrochen, dass sie in den Kasten passen (M23). */
  lines(ui = null) {
    const r = this.report;
    const out = [];
    out.push({ text: T.bericht.besiegt(r.kills) });
    if (r.turm) out.push({ text: T.turmrang.derNacht(r.turm.name, r.turm.art, r.turm.kills), warm: true }); // M16
    // Tor und Wall (M17): gehalten – oder wann sie fielen
    if (r.lager?.held) out.push({ text: T.lager.berichtGehalten, warm: true });
    else if (r.lager) {
      out.push({ text: T.lager.berichtGefallen(r.lager.gate, clockText(r.lager.at)), bad: true });
      if (r.lager.entered) out.push({ text: T.lager.berichtImLager(r.lager.entered) });
      // Was umgeworfen wurde (M17d): »Werkbank, 2× Schlafzelt«
      const n = {};
      for (const type of r.lager.raided || []) n[type] = (n[type] || 0) + 1;
      const list = Object.entries(n).map(([type, k]) => (k > 1 ? `${k}× ${T.bauten[type]}` : T.bauten[type]));
      if (list.length) out.push({ text: T.lager.berichtUmgeworfen(list.join(', ')), bad: true });
    }
    // M25: die Frostnacht – das Herz fiel oder erstarrte im Morgengrauen
    if (r.finale) out.unshift({ text: r.finale.heart ? T.herbst.bericht.gefallen : T.herbst.bericht.erstarrt, warm: true });
    // M24: Wagnis und Vorrat – Moderlocke, makellose Nacht, Vorratskammer
    const k = r.risk;
    if (k?.lure) out.push({ text: k.lure.chest ? T.wagnis.lockeKiste(T.horde.richtungKurz[k.lure.entry]) : T.wagnis.lockeFort, warm: k.lure.chest, dim: !k.lure.chest });
    if (k?.flawless) out.push({ text: T.wagnis.makellos(k.streak), res: FLAWLESS.reward });
    if (k?.treasure) out.push({ text: T.wagnis.schatz, warm: true });
    out.push({ text: T.bericht.eingesammelt, res: r.loot, empty: T.bericht.nichts });
    if (k?.interest > 0) out.push({ text: T.wagnis.zinsen, res: { schrott: k.interest } });
    else if (k?.breach && r.won) out.push({ text: T.wagnis.keineZinsen, dim: true });
    if (r.preLoss > 0) out.push({ text: T.bericht.vorher(Math.round(r.preLoss)) });
    out.push({ text: r.fell ? T.bericht.gefallen(r.homeNow, r.homeMax) : T.bericht.zuhause(r.homeLost, r.homeNow, r.homeMax) });
    if (r.broken) out.push({ text: T.bericht.kaputt(r.broken) });
    if (r.spent) out.push({ text: T.fallen.verbraucht(r.spent) }); // M19: Fallen neu richten
    if (r.lootLeft > 0) out.push({ text: T.bericht.beuteDraussen(r.lootLeft), warm: true });
    // Überlebende und Gemütlichkeit am Morgen (Meilenstein 6)
    for (const e of r.extra || []) out.push({ text: e.text, res: e.res, warm: !e.res });
    if (!r.won && r.losses) {
      out.push({ text: T.bericht.verlust, res: r.losses, bad: true, empty: T.bericht.nichts });
      out.push({ text: T.bericht.trost(r.damaged), dim: true });
    } else if (r.won) {
      // Ein Gedanke von Mika zum Schluss (m3-r1: »sehr nüchtern«)
      const heil = !r.homeLost && !r.broken && (r.homeNow === undefined || r.homeNow >= r.homeMax);
      out.push({ text: heil ? T.bericht.schlussHeil : T.bericht.schlussKratzer, dim: true });
    }
    // M25, Teil 2: die Sterne der Nacht ganz oben (gehalten, makellos, mutig)
    if (r.stars) out.unshift({ text: '', stars: r.stars });
    return ui ? this.wrapLines(ui, out) : out;
  }

  /** Lange Zeilen umbrechen (Junas Funkspruch nennt seit M22 viele Arten, die Posten erzählen viel). */
  wrapLines(ui, lines) {
    const max = ui.width - 16 - 24;
    const out = [];
    for (const l of lines) {
      if (l.res || measure(l.text) <= max) out.push(l);
      else wrap(l.text, max - 8).forEach((t, k) => out.push({ ...l, text: k ? `  ${t}` : t }));
    }
    return out;
  }

  /** Lage des Kastens (auch für die Meldungen darunter, m12-r1). */
  layout(ui, lines = this.lines(ui)) {
    const resW = (res) => Object.entries(res || {}).filter(([, n]) => n > 0).reduce((w, [, n]) => w + 14 + measure(String(n)) + 6, 0);
    const w = Math.min(ui.width - 16, Math.max(240, ...lines.map((l) => (l.stars ? this.starsWidth() : measure(l.text)) + (l.res ? resW(l.res) + 8 : 0) + 24)));
    // H4b: Passt der Bericht nicht in die Höhe (große Oberfläche), rücken die Zeilen zusammen
    const step = Math.max(LINE_HEIGHT, Math.min(LINE_HEIGHT + 3, Math.floor((ui.height - 8 - 50) / Math.max(1, lines.length))));
    const h = 34 + lines.length * step + 16;
    return { x: Math.round((ui.width - w) / 2), y: Math.max(2, Math.round((ui.height - h) / 2) - 16), w, h, step };
  }

  /** Breite der Sternenzeile: je Stern Symbol, Name und Abstand. */
  starsWidth() {
    return STAR_KEYS.reduce((w, k) => w + STAR_ICON + measure(T.buch.sterne[k]) + STAR_GAP, -STAR_GAP);
  }

  /** Sternenzeile (M25): drei Sterne mit Namen, verdiente golden, fehlende grau – mittig. */
  drawStars(ui, stars, x, w, cy) {
    let cx = Math.round(x + (w - this.starsWidth()) / 2);
    STAR_KEYS.forEach((k, i) => {
      drawIcon(ui.ctx, stars[i] ? 'stern' : 'sternLeer', cx, cy + 1);
      ui.text(T.buch.sterne[k], cx + STAR_ICON, cy, stars[i] ? COLORS.gold : COLORS.textDim);
      cx += STAR_ICON + measure(T.buch.sterne[k]) + STAR_GAP;
    });
  }

  /** Unterkante des Kastens: Meldungen erscheinen darunter statt über der Überschrift. */
  bottom(ui) {
    const { y, h } = this.layout(ui);
    return y + h + 4;
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    const r = this.report;
    if (!r) return;
    const lines = this.lines(ui);
    const { x, y, w, h, step } = this.layout(ui, lines);
    ui.ditherFill(0.4);
    ui.panel(x, y, w, h);
    const title = r.won ? T.bericht.gewonnen(r.n) : T.bericht.verloren(r.n);
    ui.textCentered(title, x + w / 2, y + 6, r.won ? COLORS.gold : COLORS.buildBad);
    ui.rect(x + 10, y + 20, w - 20, 1, COLORS.frameDark);
    let cy = y + 27;
    for (const l of lines) {
      if (l.stars) {
        this.drawStars(ui, l.stars, x, w, cy);
        cy += step;
        continue;
      }
      ui.text(l.text, x + 12, cy, l.dim ? COLORS.textDim : l.bad && !l.res ? COLORS.buildBad : l.warm ? COLORS.gold : COLORS.text);
      if (l.res) {
        let cx = x + 12 + measure(l.text) + 8;
        const entries = RESOURCES.map((res) => [res, l.res[res] || 0]).filter(([, n]) => n > 0);
        if (!entries.length) ui.text(l.empty, cx, cy, COLORS.textDim);
        for (const [res, n] of entries) {
          drawIcon(ui.ctx, res, cx, cy + 1);
          ui.text(String(n), cx + 12, cy, l.bad ? COLORS.buildBad : COLORS.textWarm);
          cx += 14 + measure(String(n)) + 6;
        }
      }
      cy += step;
    }
    if (this.time > 0.4 && Math.floor(this.time * 2.5) % 2 === 0) ui.textCentered(T.bericht.weiter, x + w / 2, y + h - 15, COLORS.textDim);
  }
}
