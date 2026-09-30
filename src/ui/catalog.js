// Balduins Katalog (N4, Probespiel 29.09.): Über das Funkgerät in der Stube bestellt
// Mika Möbel und Kleinigkeiten, Balduin bringt sie am nächsten Morgen mit dem Boot.
// Das Fenster sieht aus wie ein Versandkatalog – links die Seiten (ein Raum je Seite)
// und die Stücke, rechts das gewählte Stück groß wie auf einem Katalogfoto. Dieselben
// Bilder zeigt die Lieferkarte am Morgen: Was Balduin bringt, sieht man einmal groß.
// M29: Dieselbe Karte zeigt, was die Bewohner Mika schenken (ihr Erinnerungsstück).

import { P, hexToCss } from '../render/palette.js';
import { renderVoxelPortrait, sepiaOf } from '../render/portrait.js';
import { VoxelModel } from '../render/voxel.js';
import { FURNITURE, FURNITURE_ORDER, CATALOG_ROOMS } from '../data/furniture.js';
import { FURNITURE_MODELS } from '../world/furnitureModels.js';
import { buildKeepsake } from '../world/keepsakeModels.js';
import { T } from '../data/texts.js';
import { measure, wrap, drawText, LINE_HEIGHT } from './font.js';
import { drawIcon } from './icons.js';

const OPEN_LOCK = 0.25; // so lange nach dem Öffnen zählt E nicht (das E am Funkgerät)
const MASH_GAP = 0.18;
const PIC = { w: 176, h: 132 }; // Fläche des Katalogfotos (UI-Pixel)
const ROW_H = 13;

const PAPER = hexToCss(P.e9);
const PAPER_DARK = hexToCss(P.e8);
const INK = hexToCss(P.n1);
const INK_SOFT = hexToCss(P.e3);
const LINE = hexToCss(P.n0);
const RED = hexToCss(P.r3);
const RED_DARK = hexToCss(P.r1);
const WHITE = hexToCss(P.s9);
const GOLD = hexToCss(P.f6);
const PHOTO_BG = hexToCss(P.e7);
const GREEN = hexToCss(P.g3); // Kopf der Geschenkkarte (M29)
const DUSK = hexToCss(P.d1); // Kopf der Erinnerungskarte (M31)
// M32: Briefe (Luftpost) und Pakete
const LETTER = hexToCss(P.s9);
const LETTER_LINE = hexToCss(P.s8);
const AIRMAIL = hexToCss(P.b2);
const AIRMAIL_LIGHT = hexToCss(P.b4);
const PARCEL = hexToCss(P.e5);
const PARCEL_DARK = hexToCss(P.e3);
const PARCEL_LIGHT = hexToCss(P.e7);
const STRING = hexToCss(P.s7);

const sepias = new Map();

/** M31: das Porträt einer Person als altes Foto (einmal je Person erzeugt). */
function memorialPicture(portrait, id) {
  if (!portrait) return null;
  if (!sepias.has(id)) sepias.set(id, sepiaOf(portrait));
  return sepias.get(id);
}

const pictures = new Map();

/**
 * Sitzmöbel stehen im Haus seitlich zur Kamera – fürs Katalogfoto werden sie so gedreht,
 * dass man auf die Sitzfläche schaut (nach Westen bzw. Osten gewandt).
 */
const PHOTO_TURN = { sofa: 'west', lesesessel: 'east' };
/** Stücke, die quer durch den Raum laufen (Ketten, breiter als PHOTO_WIDE), zeigt das Foto als Ausschnitt. */
const PHOTO_WIDE = 64;
const PHOTO_CROP = 24;

function photoModel(spec, id) {
  const model = new VoxelModel();
  const turn = PHOTO_TURN[id];
  const put = (x, y, z, c) => {
    if (turn === 'west') model.set(z, y, -x, c); // Lehne im Osten – nach der Drehung hinten
    else if (turn === 'east') model.set(-z, y, x, c); // Lehne im Westen – nach der Drehung hinten
    else model.set(x, y, z, c);
  };
  spec.model.forEach(put);
  if (spec.glow) spec.glow.forEach((x, y, z) => put(x, y, z, P.f6)); // Leuchtendes in warmem Gelb
  let minX = Infinity;
  let maxX = -Infinity;
  model.forEach((x) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  });
  if (maxX - minX + 1 <= PHOTO_WIDE) return model;
  const cut = new VoxelModel();
  model.forEach((x, y, z, c) => x < minX + PHOTO_CROP && cut.set(x, y, z, c));
  return cut;
}

/**
 * Katalogfoto eines Stücks: das Modell aus furnitureModels.js mit der Projektion der
 * Porträts, so groß wie es in die Fläche passt (ganze Pixel je Voxel, nie skaliert).
 */
export function itemPicture(id) {
  if (pictures.has(id)) return pictures.get(id);
  const spec = FURNITURE_MODELS[id]?.();
  if (!spec) return null;
  return pictureOf(id, photoModel(spec, id));
}

/** M29: Foto eines Erinnerungsstücks (keepsakeModels.js) für die Geschenkkarte. */
export function keepsakePicture(item) {
  const key = `andenken:${item}`;
  if (pictures.has(key)) return pictures.get(key);
  return pictureOf(key, buildKeepsake(item));
}

/** Ein Modell so groß wie möglich aufs Foto (ganze Pixel je Voxel), einmal gerechnet und gemerkt. */
function pictureOf(key, model) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  model.forEach((x, y, z) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });
  // Größte Stufe, die passt; hohe, schmale Stücke (Standuhr, Spiegel) nehmen die flachere Draufsicht
  const scales = [
    { w: 8, t: 5, f: 6 }, // Kleinkram (Teekanne, Hausschuhe) füllt das Foto
    { w: 6, t: 4, f: 5 },
    { w: 5, t: 3, f: 4 },
    { w: 4, t: 2, f: 3 },
    { w: 4, t: 1, f: 3 },
    { w: 3, t: 2, f: 2 },
    { w: 3, t: 1, f: 2 },
    { w: 2, t: 1, f: 2 },
    { w: 2, t: 1, f: 1 },
    { w: 1, t: 1, f: 1 },
  ];
  const fit = scales.find((s) => (maxX - minX + 1) * s.w + 2 <= PIC.w && (maxY - minY + 1) * s.f + (maxZ - minZ + 1) * s.t + 4 <= PIC.h) || scales[scales.length - 1];
  const size = Math.max(PIC.w, PIC.h);
  const canvas = renderVoxelPortrait(model, { size, top: 2, ...fit });
  const used = (maxY - minY + 1) * fit.f + (maxZ - minZ + 1) * fit.t + 4;
  const pic = { canvas, used };
  pictures.set(key, pic);
  return pic;
}

/** Katalogfoto in einen Rahmen zeichnen: helles Fotopapier, Bild mittig (`pic` aus itemPicture/keepsakePicture). */
function drawPhoto(ctx, pic, x, y) {
  ctx.fillStyle = LINE;
  ctx.fillRect(x - 1, y - 1, PIC.w + 10, PIC.h + 10);
  ctx.fillStyle = WHITE;
  ctx.fillRect(x, y, PIC.w + 8, PIC.h + 8);
  ctx.fillStyle = PHOTO_BG;
  ctx.fillRect(x + 4, y + 4, PIC.w, PIC.h);
  // leichte Lichtstufen auf dem Hintergrund (gestuft, nicht weich)
  ctx.fillStyle = PAPER_DARK;
  ctx.fillRect(x + 4, y + 4 + PIC.h - 22, PIC.w, 22);
  if (!pic) return;
  const used = Math.min(PIC.h, pic.used);
  const dy = Math.max(0, Math.round((PIC.h - used) / 2));
  ctx.drawImage(pic.canvas, 0, 0, PIC.w, used, x + 4, y + 4 + dy, PIC.w, used);
}

export class Catalog {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.page = 0;
    this.focus = 0;
    this.openT = 0;
    this.lastPressAt = -Infinity;
    this.flash = null; // { id, t } – gerade bestellt
    this.note = null; // { text, t } – warum es nicht geht
  }

  open() {
    this.isOpen = true;
    this.openT = 0;
    this.note = null;
    this.flash = null;
    const f = this.game.furnishing;
    // Aufschlagen auf der ersten Seite, die noch etwas Bestellbares hat
    const first = CATALOG_ROOMS.findIndex((r) => this.items(r).some((id) => f.orderState(id) === 'ok'));
    this.page = first >= 0 ? first : 0;
    this.focus = Math.max(0, this.items().findIndex((id) => f.orderState(id) === 'ok'));
  }

  close() {
    this.isOpen = false;
  }

  /** Die Stücke einer Seite. */
  items(room = CATALOG_ROOMS[this.page]) {
    return FURNITURE_ORDER.filter((id) => FURNITURE[id].room === room);
  }

  layout(ui) {
    const w = 470;
    const h = 262;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 8;
    const tabs = [];
    let tx = x + 10;
    for (const room of CATALOG_ROOMS) {
      const tw = measure(T.katalog.seiten[room]) + 10;
      tabs.push({ room, rect: { x: tx, y: y + 40, w: tw, h: 14 } });
      tx += tw + 3;
    }
    const rows = this.items().map((id, k) => ({ id, rect: { x: x + 10, y: y + 60 + k * ROW_H, w: 250, h: ROW_H - 1 } }));
    return { x, y, w, h, tabs, rows, photo: { x: x + w - PIC.w - 18, y: y + 38 } };
  }

  /** Unterkante des Fensters (Meldungen erscheinen darunter). */
  bottom(ui) {
    const L = this.layout(ui);
    return L.y + L.h + 4;
  }

  update(input, dt = 0) {
    if (!this.isOpen) return;
    this.openT += dt;
    if (this.flash && (this.flash.t -= dt) <= 0) this.flash = null;
    if (this.note && (this.note.t -= dt) <= 0) this.note = null;
    const ui = this.game.ui;
    let L = this.layout(ui);
    if (input.pressed('menu')) {
      this.game.closeCatalog();
      return;
    }
    // Seiten: A/D oder Klick auf einen Reiter
    const tabHit = L.tabs.findIndex((t) => ui.hover(t.rect.x, t.rect.y, t.rect.w, t.rect.h));
    let turn = 0;
    if (input.pressed('left')) turn = -1;
    if (input.pressed('right')) turn = 1;
    if (turn || (tabHit >= 0 && input.mouse.clicked)) {
      this.page = tabHit >= 0 && input.mouse.clicked ? tabHit : (this.page + turn + CATALOG_ROOMS.length) % CATALOG_ROOMS.length;
      this.focus = 0;
      if (tabHit >= 0 && input.mouse.clicked) input.consumeClick();
      this.game.sound.play('karte');
      L = this.layout(ui);
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
    const pressed = input.pressed('confirm');
    const calm = this.openT - this.lastPressAt >= MASH_GAP;
    if (pressed) this.lastPressAt = this.openT;
    if (!(pressed || clicked) || this.openT < OPEN_LOCK || (!clicked && !calm)) return;
    const id = L.rows[this.focus]?.id;
    if (!id) return;
    const why = this.game.furnishing.order(id);
    if (why === 'ok') this.flash = { id, t: 1.2 };
    else this.note = { text: this.reason(id, why), t: 2.4 };
  }

  /** Warum ein Stück nicht bestellbar ist – als Satz. */
  reason(id, state) {
    const K = T.katalog;
    const def = FURNITURE[id];
    if (state === 'imHaus') return K.imHaus;
    if (state === 'bestellt') return K.bestellt;
    if (state === 'raum') return K.raumFehlt({ wohnraum: 1, kueche: 2, schlafzimmer: 3, werkstatt: 4, lager: 5 }[def.room]);
    if (state === 'braucht') return K.braucht('Knopf');
    if (state === 'voll') return K.voll;
    return K.zuTeuer;
  }

  draw(ui) {
    if (!this.isOpen) return;
    const L = this.layout(ui);
    const ctx = ui.ctx;
    const K = T.katalog;
    const f = this.game.furnishing;
    ui.ditherFill?.(0.35);
    // Papier mit dunkler Kontur und hartem Schatten
    ctx.fillStyle = LINE;
    ctx.fillRect(L.x + 3, L.y + 3, L.w, L.h);
    ctx.fillRect(L.x - 1, L.y - 1, L.w + 2, L.h + 2);
    ctx.fillStyle = PAPER;
    ctx.fillRect(L.x, L.y, L.w, L.h);
    // Kopf: rotes Band mit Titel, darunter der Untertitel und der Vorrat an Zombieteilen
    ctx.fillStyle = RED;
    ctx.fillRect(L.x, L.y, L.w, 20);
    ctx.fillStyle = RED_DARK;
    ctx.fillRect(L.x, L.y + 20, L.w, 2);
    drawText(ctx, K.titel, L.x + 10, L.y + 4, WHITE);
    const have = this.game.state.inventory.teile || 0;
    const hv = String(have);
    drawIcon(ctx, 'teile', L.x + L.w - 22 - measure(hv), L.y + 5);
    drawText(ctx, hv, L.x + L.w - 8 - measure(hv), L.y + 4, WHITE);
    drawText(ctx, K.untertitel, L.x + 10, L.y + 25, INK_SOFT);
    // Reiter (Räume)
    L.tabs.forEach((t, k) => {
      const on = k === this.page;
      const r = t.rect;
      ctx.fillStyle = LINE;
      ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + (on ? 1 : 2));
      ctx.fillStyle = on ? PAPER : PAPER_DARK;
      ctx.fillRect(r.x, r.y, r.w, r.h + (on ? 1 : 0));
      drawText(ctx, K.seiten[t.room], r.x + 5, r.y + 1, on ? INK : INK_SOFT);
    });
    ctx.fillStyle = LINE;
    ctx.fillRect(L.x + 8, L.y + 55, 256, 1);
    // Zeilen: Name links, Preis bzw. Zustand rechts
    L.rows.forEach((row, k) => {
      const r = row.rect;
      const st = f.orderState(row.id);
      const sel = k === this.focus;
      if (sel) {
        ctx.fillStyle = PAPER_DARK;
        ctx.fillRect(r.x - 2, r.y - 1, r.w + 4, r.h + 1);
        ctx.fillStyle = RED;
        ctx.fillRect(r.x - 2, r.y - 1, 2, r.h + 1);
      }
      const dim = st === 'imHaus' || st === 'raum' || st === 'braucht';
      drawText(ctx, T.moebel[row.id][0], r.x + 4, r.y, dim ? INK_SOFT : INK);
      const right = st === 'imHaus' ? K.imHausKurz : st === 'bestellt' ? K.bestelltKurz : String(FURNITURE[row.id].cost.teile);
      const rw = measure(right);
      if (st !== 'imHaus' && st !== 'bestellt') drawIcon(ctx, 'teile', r.x + r.w - rw - 14, r.y + 1);
      drawText(ctx, right, r.x + r.w - rw - 2, r.y, st === 'teuer' ? hexToCss(P.a0) : dim ? INK_SOFT : INK);
      if (this.flash?.id === row.id && Math.floor(this.flash.t * 10) % 2 === 0) {
        ctx.fillStyle = GOLD;
        ctx.fillRect(r.x - 2, r.y + r.h - 1, r.w + 4, 1);
      }
    });
    // Rechts das Katalogfoto mit Name, Beschreibung, Preis und Gemütlichkeit
    const id = L.rows[this.focus]?.id;
    if (id) {
      const ph = L.photo;
      drawPhoto(ctx, itemPicture(id), ph.x, ph.y);
      const tx = ph.x;
      let ty = ph.y + PIC.h + 13;
      drawText(ctx, T.moebel[id][0], tx, ty, INK);
      ty += LINE_HEIGHT;
      for (const line of wrap(T.moebel[id][1], PIC.w + 8)) {
        drawText(ctx, line, tx, ty, INK_SOFT);
        ty += LINE_HEIGHT;
      }
      const def = FURNITURE[id];
      drawText(ctx, `${K.preis(def.cost.teile)} · ${K.gemuetlich(def.cozy)}`, tx, ty + 2, INK);
    }
    // Fuß: Zustand bzw. Grund, unterwegs, Tasten
    const st = id ? f.orderState(id) : null;
    const status = this.note?.text || (st && st !== 'ok' && st !== 'teuer' ? this.reason(id, st) : null);
    const out = f.orders.length;
    const foot = L.y + L.h - 16;
    if (status) drawText(ctx, status, L.x + 10, foot - LINE_HEIGHT - 2, this.note ? hexToCss(P.a0) : INK_SOFT);
    else if (out) drawText(ctx, K.unterwegs(out), L.x + 10, foot - LINE_HEIGHT - 2, INK_SOFT);
    ctx.fillStyle = PAPER_DARK;
    ctx.fillRect(L.x, foot - 2, L.w, 18);
    drawText(ctx, K.hinweis, L.x + 10, foot + 1, INK_SOFT);
  }
}

/**
 * Lieferkarte (N4): Was Balduin bringt (und später, was die Bewohner schenken), einmal
 * groß wie im Katalog – mit Namen und dem Raum, in dem es jetzt steht. E blättert weiter.
 */
export class DeliveryCard {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.items = [];
    this.k = 0;
    this.openT = 0;
  }

  open(items) {
    this.items = items;
    this.k = 0;
    this.openT = 0;
    this.isOpen = items.length > 0;
  }

  /** true, wenn die letzte Karte weggeklickt ist. */
  update(input, dt = 0) {
    if (!this.isOpen) return true;
    this.openT += dt;
    if (this.openT < OPEN_LOCK) return false;
    if (input.pressed('confirm') || input.mouse.clicked || input.pressed('menu')) {
      input.consumeClick?.();
      this.game.sound.play('aufheben');
      this.k += 1;
      this.openT = 0;
      if (this.k >= this.items.length || input.pressed('menu')) {
        this.isOpen = false;
        return true;
      }
    }
    return false;
  }

  draw(ui) {
    if (!this.isOpen) return;
    const id = this.items[this.k];
    if (id && typeof id === 'object' && id.memorial) return this.drawMemorial(ui, id); // M31
    if (id && typeof id === 'object' && id.letter) return this.drawLetter(ui, id); // M32
    if (id && typeof id === 'object' && id.parcel) return this.drawParcel(ui, id); // M32
    const gift = typeof id === 'object' ? id : null; // M29: ein Geschenk { gift, from, name }
    const ctx = ui.ctx;
    const K = T.katalog;
    const w = PIC.w + 40;
    const h = PIC.h + 84;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 6;
    const pop = Math.min(1, this.openT / 0.18);
    const dy = Math.round((1 - pop) * 10);
    ui.ditherFill?.(0.35);
    ctx.fillStyle = LINE;
    ctx.fillRect(x + 3, y + 3 + dy, w, h);
    ctx.fillRect(x - 1, y - 1 + dy, w + 2, h + 2);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, y + dy, w, h);
    ctx.fillStyle = gift ? GREEN : RED;
    ctx.fillRect(x, y + dy, w, 18);
    const head = gift ? T.bindung.karte.titel(gift.name) : K.lieferung;
    const title = this.items.length > 1 ? `${head} · ${this.k + 1}/${this.items.length}` : head;
    drawText(ctx, title, x + Math.round((w - measure(title)) / 2), y + 3 + dy, WHITE);
    drawPhoto(ctx, gift ? keepsakePicture(gift.gift) : itemPicture(id), x + 16, y + 24 + dy);
    const name = gift ? T.bindung.karte.namen[gift.gift] : T.moebel[id][0];
    drawText(ctx, name, x + Math.round((w - measure(name)) / 2), y + PIC.h + 38 + dy, INK);
    const room = gift ? T.bindung.karte.wo[gift.gift] || T.bindung.karte.regal : K.steht(FURNITURE[id].room);
    drawText(ctx, room, x + Math.round((w - measure(room)) / 2), y + PIC.h + 38 + LINE_HEIGHT + dy, INK_SOFT);
    const hint = this.k + 1 < this.items.length ? K.weiter : K.fertig;
    drawText(ctx, hint, x + Math.round((w - measure(hint)) / 2), y + h - 15 + dy, INK_SOFT);
  }

  /**
   * M31: Eine Karte vom Erinnerungsbrett – ihr Foto in Sepia mit Wäscheklammer, Name,
   * die Tage in der Bucht, das Erinnerungsstück und eine Zeile, die bleibt.
   */
  drawMemorial(ui, m) {
    const ctx = ui.ctx;
    const E = T.erinnerung;
    const w = 236;
    const lines = wrap(E.zeilen[m.memorial] || E.zeile(m.name), w - 28);
    // Foto (bis 100), Name und Tage, die Zeilen, das Stück, darunter Luft und der Hinweis
    const h = 104 + (2 + lines.length + (m.item ? 1 : 0)) * LINE_HEIGHT + 22;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 6;
    const pop = Math.min(1, this.openT / 0.18);
    const dy = Math.round((1 - pop) * 10);
    ui.ditherFill?.(0.35);
    ctx.fillStyle = LINE;
    ctx.fillRect(x + 3, y + 3 + dy, w, h);
    ctx.fillRect(x - 1, y - 1 + dy, w + 2, h + 2);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, y + dy, w, h);
    ctx.fillStyle = DUSK;
    ctx.fillRect(x, y + dy, w, 18);
    const head = this.items.length > 1 ? `${E.brett} · ${this.k + 1}/${this.items.length}` : E.brett;
    drawText(ctx, head, x + Math.round((w - measure(head)) / 2), y + 3 + dy, WHITE);
    // Das Foto: weißer Rand, Sepia, oben eine Wäscheklammer
    const pic = memorialPicture(this.game.portraits?.[m.memorial], m.memorial);
    const pw = 60;
    const px = x + Math.round((w - pw - 8) / 2);
    const py = y + 26 + dy;
    ctx.fillStyle = LINE;
    ctx.fillRect(px - 1, py - 1, pw + 10, pw + 10);
    ctx.fillStyle = WHITE;
    ctx.fillRect(px, py, pw + 8, pw + 8);
    ctx.fillStyle = PHOTO_BG;
    ctx.fillRect(px + 4, py + 4, pw, pw);
    if (pic) ctx.drawImage(pic, 0, 0, pic.width, pic.height, px + 4 + Math.round((pw - pic.width) / 2), py + 4 + Math.round((pw - pic.height) / 2), pic.width, pic.height);
    ctx.fillStyle = hexToCss(P.e5);
    ctx.fillRect(px + Math.round(pw / 2), py - 4, 6, 9); // Wäscheklammer
    ctx.fillStyle = hexToCss(P.e7);
    ctx.fillRect(px + Math.round(pw / 2) + 1, py - 3, 4, 7);
    let ty = py + pw + 14;
    drawText(ctx, m.name, x + Math.round((w - measure(m.name)) / 2), ty, INK);
    ty += LINE_HEIGHT;
    const days = E.tage(m.from, m.to);
    drawText(ctx, days, x + Math.round((w - measure(days)) / 2), ty, INK_SOFT);
    ty += LINE_HEIGHT + 4;
    for (const line of lines) {
      drawText(ctx, line, x + Math.round((w - measure(line)) / 2), ty, INK);
      ty += LINE_HEIGHT;
    }
    if (m.item) {
      const it = E.stueck(T.bindung.karte.namen[m.item] || m.item);
      drawText(ctx, it, x + Math.round((w - measure(it)) / 2), ty, INK_SOFT);
    }
    const hint = this.k + 1 < this.items.length ? T.katalog.weiter : E.fertig;
    drawText(ctx, hint, x + Math.round((w - measure(hint)) / 2), y + h - 15 + dy, INK_SOFT);
  }

  /** Rahmen einer Karte (Schatten, Papier, farbiger Kopf mit Titel); gibt Lage und Versatz zurück. */
  cardFrame(ui, w, h, paper, headColor, title) {
    const ctx = ui.ctx;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 6;
    const dy = Math.round((1 - Math.min(1, this.openT / 0.18)) * 10);
    ui.ditherFill?.(0.35);
    ctx.fillStyle = LINE;
    ctx.fillRect(x + 3, y + 3 + dy, w, h);
    ctx.fillRect(x - 1, y - 1 + dy, w + 2, h + 2);
    ctx.fillStyle = paper;
    ctx.fillRect(x, y + dy, w, h);
    ctx.fillStyle = headColor;
    ctx.fillRect(x, y + dy, w, 18);
    const head = this.items.length > 1 ? `${title} · ${this.k + 1}/${this.items.length}` : title;
    drawText(ctx, head, x + Math.round((w - measure(head)) / 2), y + 3 + dy, WHITE);
    return { x, y: y + dy, dy };
  }

  /**
   * M32: Ein Brief von jemandem, der weitergezogen ist – Luftpostpapier mit feinen Linien, eine
   * Briefmarke, das Porträt des Absenders (in Farbe), Ort und Tag, dann der Brief.
   */
  drawLetter(ui, m) {
    const ctx = ui.ctx;
    const N = T.netz;
    const w = 256;
    const text = m.text || (m.kind === 'brief2' ? N.zweite[m.letter] : T.wanderer.briefe[m.letter]) || N.stimmeAlle; // N6: eine Notiz bringt ihren Text mit
    const lines = wrap(text, w - 30);
    const h = 104 + (2 + lines.length) * LINE_HEIGHT + 22;
    const { x, y } = this.cardFrame(ui, w, h, LETTER, AIRMAIL, m.kind === 'notiz' ? T.inseln.notizTitel : N.brief);
    for (let i = 0; i < w; i += 8) {
      ctx.fillStyle = (i >> 3) % 2 ? RED : AIRMAIL_LIGHT; // Luftpost-Rand
      ctx.fillRect(x + i, y + 18, 5, 2);
    }
    // Briefmarke oben rechts: gezackter Rand, ein Kürbis
    const sx = x + w - 30;
    const sy = y + 26;
    ctx.fillStyle = WHITE;
    ctx.fillRect(sx, sy, 20, 24);
    ctx.fillStyle = LETTER;
    for (let k = 0; k < 20; k += 4) {
      ctx.fillRect(sx + k + 1, sy, 2, 1);
      ctx.fillRect(sx + k + 1, sy + 23, 2, 1);
    }
    ctx.fillStyle = hexToCss(P.d4);
    ctx.fillRect(sx + 3, sy + 3, 14, 18);
    drawIcon(ctx, 'kuerbis', sx + 4, sy + 6);
    // Das Porträt (in Farbe, weißer Rand)
    const pic = this.game.portraits?.[m.letter];
    const pw = 60;
    const px = x + Math.round((w - pw - 8) / 2);
    const py = y + 26;
    ctx.fillStyle = LINE;
    ctx.fillRect(px - 1, py - 1, pw + 10, pw + 10);
    ctx.fillStyle = WHITE;
    ctx.fillRect(px, py, pw + 8, pw + 8);
    ctx.fillStyle = PHOTO_BG;
    ctx.fillRect(px + 4, py + 4, pw, pw);
    if (pic) ctx.drawImage(pic, 0, 0, pic.width, pic.height, px + 4 + Math.round((pw - pic.width) / 2), py + 4 + Math.round((pw - pic.height) / 2), pic.width, pic.height);
    let ty = py + pw + 14;
    const from = m.kind === 'notiz' ? m.name : N.von(m.name, T.wanderer.vomOrt[m.place] || '');
    drawText(ctx, from, x + Math.round((w - measure(from)) / 2), ty, INK);
    ty += LINE_HEIGHT;
    const day = N.tag(m.day);
    drawText(ctx, day, x + Math.round((w - measure(day)) / 2), ty, INK_SOFT);
    ty += LINE_HEIGHT + 4;
    for (const line of lines) {
      ctx.fillStyle = LETTER_LINE; // Linien des Briefpapiers
      ctx.fillRect(x + 12, ty + LINE_HEIGHT - 2, w - 24, 1);
      drawText(ctx, line, x + 15, ty, INK);
      ty += LINE_HEIGHT;
    }
    const hint = this.k + 1 < this.items.length ? T.katalog.weiter : N.gelesen;
    drawText(ctx, hint, x + Math.round((w - measure(hint)) / 2), y + h - 15, INK_SOFT);
  }

  /** M32: Ein Paket von einem Ort – Karton mit Schnur und Anhänger, darunter, was darin war. */
  drawParcel(ui, m) {
    const ctx = ui.ctx;
    const N = T.netz;
    const w = 236;
    const title = wrap(N.paket(m.name, T.wanderer.vomOrt[m.place] || ''), w - 24);
    const h = 26 + 58 + 10 + (title.length + 1) * LINE_HEIGHT + 6 + 14 + 22;
    const { x, y } = this.cardFrame(ui, w, h, PAPER, PARCEL_DARK, N.paketTitel);
    // Der Karton
    const bw = 72;
    const bh = 50;
    const bx = x + Math.round((w - bw) / 2);
    const by = y + 28;
    ctx.fillStyle = LINE;
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = PARCEL;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = PARCEL_LIGHT;
    ctx.fillRect(bx, by, bw, 12); // Deckel im Licht
    ctx.fillStyle = PARCEL_DARK;
    ctx.fillRect(bx, by + 12, bw, 1);
    ctx.fillStyle = STRING; // Schnur über Kreuz, oben eine Schleife
    ctx.fillRect(bx + Math.round(bw / 2) - 1, by, 2, bh);
    ctx.fillRect(bx, by + 28, bw, 2);
    ctx.fillRect(bx + Math.round(bw / 2) - 6, by - 4, 5, 4);
    ctx.fillRect(bx + Math.round(bw / 2) + 1, by - 4, 5, 4);
    ctx.fillStyle = WHITE; // Anhänger mit dem Anfangsbuchstaben
    ctx.fillRect(bx + 8, by + 32, 18, 12);
    drawText(ctx, (m.name || '?')[0], bx + 13, by + 32, INK);
    let ty = by + bh + 10;
    for (const line of title) {
      drawText(ctx, line, x + Math.round((w - measure(line)) / 2), ty, INK);
      ty += LINE_HEIGHT;
    }
    drawText(ctx, N.paketDabei, x + Math.round((w - measure(N.paketDabei)) / 2), ty, INK_SOFT);
    ty += LINE_HEIGHT + 6;
    // Was darin war: Symbol und Anzahl je Vorrat
    const entries = Object.entries(m.gives || {});
    const widths = entries.map(([, n]) => 14 + measure(`+${n}`) + 8);
    let cx = x + Math.round((w - widths.reduce((a, b) => a + b, 0)) / 2);
    entries.forEach(([res, n], k) => {
      drawIcon(ctx, res, cx, ty + 1);
      drawText(ctx, `+${n}`, cx + 14, ty, INK);
      cx += widths[k];
    });
    const hint = this.k + 1 < this.items.length ? T.katalog.weiter : T.katalog.fertig;
    drawText(ctx, hint, x + Math.round((w - measure(hint)) / 2), y + h - 15, INK_SOFT);
  }
}
