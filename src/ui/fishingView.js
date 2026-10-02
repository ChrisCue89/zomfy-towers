// Das Bild zum Angeln (M33): die Schnur von der Spitze zur Pose (ein Pixel, durchhängend,
// im Drill straff), unten ein kleines Feld mit dem Hinweis und dem Wurf-Zähler, beim Laden
// die Kraftleiste, beim Biss ein »!« über der Pose, im Drill die Leiste mit Kescher, Fisch
// und Fang-Balken, danach die Fangkarte. Die Bildmitte bleibt dem Wasser (N4) – nur die
// Karte des Fangs liegt, wie Lieferkarte und Katalog, kurz in der Mitte.

import * as THREE from 'three';
import { COLORS } from './ui.js';
import { measure, wrap, drawText, LINE_HEIGHT } from './font.js';
import { hexToCss, P } from '../render/palette.js';
import { renderVoxelPortrait } from '../render/portrait.js';
import { buildFishModel } from '../entities/fishingModels.js';
import { FISH } from '../data/fishing.js';
import { T } from '../data/texts.js';

const LINE = hexToCss(P.s8);
const LINE_DARK = hexToCss(P.s5);
const WATER = hexToCss(P.b1);
const ZONE = hexToCss(P.g6);
const ZONE_OFF = hexToCss(P.g3);
const FISH_COLOR = hexToCss(P.f6);
const PAPER = hexToCss(P.e9);
const INK = hexToCss(P.n1);
const INK_SOFT = hexToCss(P.e3);
const HEAD = hexToCss(P.b2);

const pictures = new Map();

/** Bild eines Fangs für die Karte (einmal je Art). */
function fishPicture(id) {
  if (!pictures.has(id)) pictures.set(id, renderVoxelPortrait(buildFishModel(id, 40), { size: 100, top: 26, w: 2, t: 1, f: 2 }));
  return pictures.get(id);
}

export class FishingView {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.session = null;
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
  }

  open(session) {
    this.session = session;
  }

  close() {
    this.session = null;
  }

  draw(ui) {
    const s = this.session;
    if (!s) return;
    const g = this.game;
    const f = g.fishing;
    // Schnüre: Mika und wer mitkommt
    const bobber = f.meshes?.bobber;
    const tip = f.rodTip(this._a);
    if (bobber?.visible) this.drawLine(ui, tip, bobber.position, s.phase === 'drill' ? 0 : s.phase === 'wurf' ? 0.1 : 0.45);
    else if (s.phase !== 'fang') this.drawLine(ui, tip, { x: tip.x, y: tip.y - 0.35, z: tip.z }, 0); // der Haken baumelt
    const ftip = f.friendTip(this._b);
    const fb = f.meshes?.friendBobber;
    if (ftip && fb?.visible) this.drawLine(ui, ftip, fb.position, 0.5);
    // »!« über der Pose beim Biss
    if (s.phase === 'biss' && bobber) {
      const at = g.worldToUi(bobber.position.x, 0.45, bobber.position.z);
      const bounce = Math.round(Math.sin(s.t * 30) * 1.5);
      ui.text('!', Math.round(at.x - 2), Math.round(at.y - 14 + bounce), COLORS.gold, { outline: COLORS.outline });
    }
    this.drawPanel(ui);
    if (s.card) this.drawCard(ui, s.card);
  }

  /** Eine Schnur als Pixelkette zwischen zwei Weltpunkten, `sag` = wie weit sie durchhängt (UI-Pixel je Pixel Länge). */
  drawLine(ui, a, b, sag) {
    const g = this.game;
    const p = g.worldToUi(a.x, a.y, a.z);
    const q = g.worldToUi(b.x, b.y + 0.12, b.z);
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const steps = Math.max(2, Math.ceil(len));
    const drop = len * sag * 0.25;
    const ctx = ui.ctx;
    let last = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(p.x + (q.x - p.x) * t);
      const y = Math.round(p.y + (q.y - p.y) * t + Math.sin(t * Math.PI) * drop);
      const key = x * 10000 + y;
      if (key === last) continue;
      last = key;
      ctx.fillStyle = (x + y) % 5 === 0 ? LINE_DARK : LINE;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  /** Das Feld unten: Hinweis, Wurf-Zähler, Kraft- bzw. Drill-Leiste. */
  drawPanel(ui) {
    const s = this.session;
    const A = T.angeln;
    const w = 200;
    const drill = s.phase === 'drill' && s.drill;
    const h = drill ? 58 : s.phase === 'laden' ? 44 : 32;
    const x = Math.round((ui.width - w) / 2);
    const y = ui.height - h - 10;
    ui.panel(x, y, w, h);
    const hint = s.card ? A.kartenHinweis : A.hinweise[s.phase] || '';
    ui.textCentered(hint, x + w / 2, y + 4, s.phase === 'biss' ? COLORS.gold : COLORS.text);
    const count = A.wurf(Math.min(s.cast + (s.phase === 'bereit' || s.phase === 'laden' ? 1 : 0), s.casts), s.casts);
    ui.text(count, x + 6, y + h - 13, COLORS.textDim);
    ui.text(A.aufstehen, x + w - 6 - measure(A.aufstehen), y + h - 13, COLORS.textDim);
    if (s.phase === 'laden') {
      // Kraft: links schwach, rechts weit
      const bx = x + 20;
      const bw = w - 40;
      ui.rect(bx - 1, y + 17, bw + 2, 8, COLORS.outline);
      ui.rect(bx, y + 18, bw, 6, WATER);
      ui.rect(bx, y + 18, Math.round(bw * s.power), 6, COLORS.gold);
    }
    if (drill) {
      const d = s.drill;
      const bx = x + 12;
      const bw = w - 24;
      const by = y + 17;
      ui.rect(bx - 1, by - 1, bw + 2, 14, COLORS.outline);
      ui.rect(bx, by, bw, 12, WATER);
      // der Kescher
      ui.rect(bx + Math.round(d.zx * bw), by, Math.max(4, Math.round(d.zone * bw)), 12, d.inside ? ZONE : ZONE_OFF);
      // der Fisch: ein kleiner goldener Körper mit Schwanz
      const fx = bx + Math.round(d.fx * (bw - 1));
      const dir = d.fv >= 0 ? 1 : -1;
      ui.rect(fx - 3, by + 4, 7, 4, COLORS.outline);
      ui.rect(fx - 2, by + 5, 5, 2, FISH_COLOR);
      ui.rect(fx - 4 * dir, by + 3, 1, 6, FISH_COLOR);
      // der Fang: füllt sich im Kescher
      ui.rect(bx - 1, by + 15, bw + 2, 5, COLORS.outline);
      ui.rect(bx, by + 16, Math.round(bw * Math.max(0, Math.min(1, d.progress))), 3, d.inside ? COLORS.gold : COLORS.goldDark);
    }
  }

  /** Die Fangkarte: Bild in Seitenansicht, Name, Größe, »Neu!« oder »Rekord!«, bei der Flaschenpost der Zettel. */
  drawCard(ui, c) {
    const ctx = ui.ctx;
    const A = T.angeln;
    const f = FISH[c.id];
    const w = 236;
    const noteLines = c.note ? wrap(c.note, w - 28) : [];
    const h = 26 + 100 + 8 + LINE_HEIGHT * 2 + (noteLines.length ? noteLines.length * LINE_HEIGHT + 6 : 0) + 22;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 24;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x + 3, y + 3, w, h);
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = HEAD;
    ctx.fillRect(x, y, w, 18);
    const title = f.bottle ? A.flaschenpost : f.junk ? A.stiefelTitel : A.fang;
    drawText(ctx, title, x + Math.round((w - measure(title)) / 2), y + 3, COLORS.text);
    const pic = fishPicture(c.id);
    ctx.drawImage(pic, x + Math.round((w - pic.width) / 2), y + 22);
    let ty = y + 22 + 100 + 6;
    const name = A.namen[c.id];
    drawText(ctx, name, x + Math.round((w - measure(name)) / 2), ty, INK);
    ty += LINE_HEIGHT;
    const sub = f.size ? `${A.cm(c.size)}${c.first ? ` · ${A.neu}` : c.record ? ` · ${A.rekord}` : ''}` : A.unterzeilen[c.id];
    drawText(ctx, sub, x + Math.round((w - measure(sub)) / 2), ty, c.first || c.record ? hexToCss(P.r2) : INK_SOFT);
    ty += LINE_HEIGHT + 6;
    for (const line of noteLines) {
      drawText(ctx, line, x + 14, ty, INK);
      ty += LINE_HEIGHT;
    }
    drawText(ctx, A.weiter, x + Math.round((w - measure(A.weiter)) / 2), y + h - 15, INK_SOFT);
  }
}
