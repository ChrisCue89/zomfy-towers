// Der Waffenschrank (M30, OFFENE-FRAGEN 168): links die sieben Waffen, rechts die gewählte
// groß wie auf einem Foto – mit Munition, Reichweite und wer sie im Notfall bekommt.
// E nimmt sie heraus (in die Schnellleiste) oder legt sie zurück, Q wechselt, wer sie im
// Notfall nimmt. Dunkles Holz, grüner Filz, Messingschilder – kein Katalog, ein Schrank.

import { P, hexToCss } from '../render/palette.js';
import { renderVoxelPortrait } from '../render/portrait.js';
import { VoxelModel } from '../render/voxel.js';
import { armsModel } from '../entities/characters.js';
import { GUNS, ARMS_ORDER } from '../data/arms.js';
import { WEAPONS } from '../data/weapons.js';
import { T } from '../data/texts.js';
import { measure, wrap, drawText, LINE_HEIGHT } from './font.js';
import { drawIcon } from './icons.js';
import { PEOPLE, personOf } from '../core/survivors.js';

const OPEN_LOCK = 0.25; // das E am Schrank zählt nicht gleich als »nehmen«
const PIC = { w: 196, h: 92 };
const ROW_H = 16;

const WOOD = hexToCss(P.e2);
const WOOD_LIGHT = hexToCss(P.e4);
const FELT = hexToCss(P.t1);
const FELT_LIGHT = hexToCss(P.t2);
const LINE = hexToCss(P.n0);
const BRASS = hexToCss(P.f6);
const BRASS_DARK = hexToCss(P.f4);
const TEXT = hexToCss(P.s9);
const TEXT_SOFT = hexToCss(P.e8);
const PHOTO_BG = hexToCss(P.e7);
const PHOTO_BG_DARK = hexToCss(P.e6);

const pictures = new Map();

/** Foto einer Waffe: waagrecht, Mündung nach rechts, die Seite zu uns (ganze Pixel je Voxel). */
function armsPicture(id) {
  if (pictures.has(id)) return pictures.get(id);
  const src = armsModel(id);
  if (!src) return null;
  const m = new VoxelModel();
  src.forEach((x, y, z, c) => m.set(-y, z, -x, c));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  m.forEach((x, y, z) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });
  const scales = [{ w: 6, t: 2, f: 6 }, { w: 5, t: 2, f: 5 }, { w: 4, t: 2, f: 4 }, { w: 3, t: 1, f: 3 }, { w: 2, t: 1, f: 2 }];
  const fit = scales.find((s) => (maxX - minX + 1) * s.w + 2 <= PIC.w && (maxY - minY + 1) * s.f + (maxZ - minZ + 1) * s.t + 4 <= PIC.h) || scales[scales.length - 1];
  const canvas = renderVoxelPortrait(m, { size: Math.max(PIC.w, PIC.h), top: 2, ...fit });
  const pic = { canvas, used: (maxY - minY + 1) * fit.f + (maxZ - minZ + 1) * fit.t + 4 };
  pictures.set(id, pic);
  return pic;
}

export class Armory {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.focus = 0;
    this.openT = 0;
    this.note = null; // { text, t }
  }

  open() {
    this.isOpen = true;
    this.openT = 0;
    this.note = null;
  }

  close() {
    this.isOpen = false;
  }

  /** Wer im Lager wohnt und eine Waffe nehmen kann (Menschen, kein Hund). */
  people() {
    const s = this.game.survivors;
    return PEOPLE.filter((id) => s.resident(id) && !personOf(id)?.dog);
  }

  layout(ui) {
    const w = 460;
    const h = 282; // Platz für umbrochene Angaben und die Notfall-Zeile über der Tastenzeile
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 8;
    const rows = ARMS_ORDER.map((id, k) => ({ id, rect: { x: x + 12, y: y + 44 + k * ROW_H, w: 196, h: ROW_H - 2 } }));
    return { x, y, w, h, rows, photo: { x: x + w - PIC.w - 20, y: y + 40 } };
  }

  /** Unterkante des Fensters (Meldungen erscheinen darunter). */
  bottom(ui) {
    const L = this.layout(ui);
    return L.y + L.h + 4;
  }

  update(input, dt = 0) {
    if (!this.isOpen) return;
    this.openT += dt;
    if (this.note && (this.note.t -= dt) <= 0) this.note = null;
    const g = this.game;
    const ui = g.ui;
    const L = this.layout(ui);
    if (input.pressed('menu')) {
      g.closeArmory();
      return;
    }
    const hovered = L.rows.findIndex((r) => ui.hover(r.rect.x, r.rect.y, r.rect.w, r.rect.h));
    if (hovered >= 0 && input.mouse.moved) this.focus = hovered;
    const n = L.rows.length;
    if (input.pressed('up')) this.focus = (this.focus + n - 1) % n;
    if (input.pressed('down')) this.focus = (this.focus + 1) % n;
    const clicked = hovered >= 0 && input.mouse.clicked;
    if (clicked) {
      input.consumeClick();
      this.focus = hovered;
    }
    if (this.openT < OPEN_LOCK) return;
    const id = ARMS_ORDER[this.focus];
    if (input.pressed('confirm') || clicked) {
      const was = g.arms.taken(id);
      const ok = g.arms.toggleTake(id);
      if (ok) this.note = { text: was ? T.waffen.zurueck(T.gegenstaende[id]) : T.waffen.genommen(T.gegenstaende[id]), t: 2.2 };
      else if (!was) this.note = { text: T.waffen.leisteVoll, t: 2.4 };
    } else if (input.pressedCode?.('KeyQ')) {
      g.arms.cycleOwner(id, this.people());
    }
  }

  /** Wer bekommt diese Waffe im Notfall? */
  ownerOf(id) {
    const d = this.game.state.arms.notfall;
    return this.people().find((p) => d[p] === id) || null;
  }

  draw(ui) {
    if (!this.isOpen) return;
    const g = this.game;
    const L = this.layout(ui);
    const ctx = ui.ctx;
    const W = T.waffen;
    ui.ditherFill?.(0.35);
    // Schrank: dunkles Holz, innen grüner Filz, harter Schatten
    ctx.fillStyle = LINE;
    ctx.fillRect(L.x + 3, L.y + 3, L.w, L.h);
    ctx.fillRect(L.x - 1, L.y - 1, L.w + 2, L.h + 2);
    ctx.fillStyle = WOOD;
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.fillStyle = WOOD_LIGHT;
    ctx.fillRect(L.x, L.y, L.w, 1);
    ctx.fillStyle = FELT;
    ctx.fillRect(L.x + 6, L.y + 36, L.w - 12, L.h - 58);
    ctx.fillStyle = FELT_LIGHT;
    ctx.fillRect(L.x + 6, L.y + 36, L.w - 12, 1);
    // Messingschild mit dem Titel
    const title = W.schrank;
    const tw = measure(title) + 16;
    ctx.fillStyle = BRASS_DARK;
    ctx.fillRect(L.x + 10, L.y + 6, tw + 2, 15);
    ctx.fillStyle = BRASS;
    ctx.fillRect(L.x + 11, L.y + 7, tw, 13);
    drawText(ctx, title, L.x + 19, L.y + 8, LINE);
    drawText(ctx, W.untertitel, L.x + tw + 22, L.y + 9, TEXT_SOFT);
    // Links: die sieben Waffen
    L.rows.forEach((row, k) => {
      const r = row.rect;
      const sel = k === this.focus;
      const taken = g.arms.taken(row.id);
      if (sel) {
        ctx.fillStyle = FELT_LIGHT;
        ctx.fillRect(r.x - 2, r.y - 1, r.w + 4, r.h + 2);
        ctx.fillStyle = BRASS;
        ctx.fillRect(r.x - 2, r.y - 1, 2, r.h + 2);
      }
      drawIcon(ctx, row.id, r.x + 2, r.y + 1);
      drawText(ctx, T.gegenstaende[row.id], r.x + 18, r.y + 2, taken ? TEXT_SOFT : TEXT);
      const right = taken ? W.beiMika : '';
      if (right) drawText(ctx, right, r.x + r.w - measure(right) - 2, r.y + 2, BRASS);
    });
    // Rechts das Foto und was man wissen muss
    const id = ARMS_ORDER[this.focus];
    const ph = L.photo;
    ctx.fillStyle = LINE;
    ctx.fillRect(ph.x - 1, ph.y - 1, PIC.w + 10, PIC.h + 10);
    ctx.fillStyle = TEXT;
    ctx.fillRect(ph.x, ph.y, PIC.w + 8, PIC.h + 8);
    ctx.fillStyle = PHOTO_BG;
    ctx.fillRect(ph.x + 4, ph.y + 4, PIC.w, PIC.h);
    ctx.fillStyle = PHOTO_BG_DARK;
    ctx.fillRect(ph.x + 4, ph.y + 4 + PIC.h - 16, PIC.w, 16);
    const pic = armsPicture(id);
    if (pic) {
      const used = Math.min(PIC.h, pic.used);
      const dy = Math.max(0, Math.round((PIC.h - used) / 2));
      ctx.drawImage(pic.canvas, 0, 0, PIC.w, used, ph.x + 4, ph.y + 4 + dy, PIC.w, used);
    }
    let ty = ph.y + PIC.h + 14;
    drawText(ctx, T.gegenstaende[id], ph.x, ty, BRASS);
    ty += LINE_HEIGHT;
    for (const line of wrap(W.info[id], PIC.w + 8)) {
      drawText(ctx, line, ph.x, ty, TEXT);
      ty += LINE_HEIGHT;
    }
    const gun = GUNS[id];
    const facts = gun
      ? [W.munition(T.ressourcen[gun.ammo], g.state.inventory[gun.ammo] || 0), W.magazin(gun.mag), W.reichweite(gun.range), W.laut]
      : [W.fuerDieHand, WEAPONS[id] ? W.reichweite(WEAPONS[id].reach.toFixed(1).replace('.', ',')) : ''];
    for (const f of facts.filter(Boolean)) {
      for (const line of wrap(f, PIC.w + 8)) {
        drawText(ctx, line, ph.x, ty, TEXT_SOFT);
        ty += LINE_HEIGHT;
      }
    }
    const owner = this.ownerOf(id);
    drawText(ctx, owner ? W.notfall(personOf(owner).name) : W.niemand, ph.x, ty + 2, owner ? BRASS : TEXT_SOFT);
    // Fuß: Meldung oder Tasten, im Rahmen des Schranks
    const foot = this.note?.text || W.hinweis;
    drawText(ctx, foot, L.x + Math.round((L.w - measure(foot)) / 2), L.y + L.h - 17, this.note ? BRASS : TEXT_SOFT);
  }
}
