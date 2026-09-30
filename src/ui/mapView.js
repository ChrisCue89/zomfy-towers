// Übersichtskarte (Taste M, Meilenstein 9): das ganze Wegenetz auf einen
// Blick – Wege, Spawns, Bucht, Türme, Barrikaden, Schlurfer, liegende
// Überreste und Mika. Das Spiel steht still, solange sie offen ist. Der
// Hintergrund wird einmal aus der Karte gemalt (4 Pixel je Meter), darüber
// liegt jedes Bild, was sich bewegt.

import { P, hexToCss } from '../render/palette.js';
import { COLORS } from './ui.js';
import { LINE_HEIGHT, measure } from './font.js';
import { T } from '../data/texts.js';
import { BUILDINGS } from '../data/buildings.js';
import { MAP, shoreX } from '../world/map.js';
import { LAYOUT } from '../world/layout.js';
import { ISLES, ISLE_ORDER, BAY_LABEL } from '../data/isles.js';

const PX = 4; // Pixel je Meter
const W = (MAP.x1 - MAP.x0) * PX;
const H = (MAP.z1 - MAP.z0) * PX;

const C = {
  forest: [P.t1, P.g2, P.t0],
  meadow: [P.g5, P.g4],
  yard: P.g6,
  path: [P.e6, P.e5],
  pathEdge: P.e4,
  water: [P.b2, P.b1],
  shallow: P.b3,
  sand: P.e8,
  dock: P.e5,
  house: P.r2,
};

export class MapView {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.base = null; // Hintergrund (einmal gemalt)
    this.t = 0;
  }

  open() {
    this.isOpen = true;
    this.t = 0;
    if (!this.base) this.base = this.paintBase();
  }

  close() {
    this.isOpen = false;
  }

  /** @returns {boolean} true, wenn die Karte geschlossen wurde */
  update(input, dt) {
    this.t += dt;
    if (this.t > 0.1 && (input.pressed('map') || input.pressed('cancel') || input.pressed('use') || input.mouse.rightClicked)) {
      input.consume?.('use');
      this.close();
      return true;
    }
    return false;
  }

  /** Hintergrund aus der Karte malen: Wald, Wiese, Wege, See, Bucht. */
  paintBase() {
    const map = this.game.world.map;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(W, H);
    const put = (i, j, hex) => {
      const k = (j * W + i) * 4;
      img.data[k] = (hex >> 16) & 255;
      img.data[k + 1] = (hex >> 8) & 255;
      img.data[k + 2] = hex & 255;
      img.data[k + 3] = 255;
    };
    for (let j = 0; j < H; j++) {
      const z = MAP.z0 + (j + 0.5) / PX;
      for (let i = 0; i < W; i++) {
        const x = MAP.x0 + (i + 0.5) / PX;
        const n = map.noise(x, z, 0.35, 5) > 0.5 ? 1 : 0;
        let c;
        if (map.onDock(x, z)) c = C.dock;
        else if (map.isWater(x, z)) c = x - shoreX(z) < 1.2 ? C.shallow : C.water[map.noise(x, z, 0.2, 9) > 0.6 ? 1 : 0];
        else if (map.onIsland(x, z)) c = P.s5;
        else {
          const edge = map.edgeDistance(x, z);
          const d = map.pathDistance(x, z);
          if (d < -0.2) c = C.path[n];
          else if (d < 0.2) c = C.pathEdge;
          else if (x > shoreX(z) - 1.5) c = C.sand;
          else if (edge > 0) c = C.forest[edge > 3 ? 2 : n];
          else if (map.inYard(x, z)) c = C.yard;
          else c = C.meadow[n];
        }
        put(i, j, c);
      }
    }
    // Das Haus (Grundriss der ersten Stufe) als Dach
    const s = LAYOUT.shelter;
    for (let j = Math.floor((s.z - MAP.z0) * PX); j < Math.ceil((s.z + 3.5 - MAP.z0) * PX); j++) {
      for (let i = Math.floor((s.x - MAP.x0) * PX); i < Math.ceil((s.x + 5 - MAP.x0) * PX); i++) put(i, j, (i + j) % 3 ? C.house : P.r1);
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  layout(ui) {
    const x = Math.round((ui.width - W) / 2);
    const y = Math.max(22, Math.round((ui.height - H) / 2) + 4);
    return { x, y };
  }

  /** Unterkante der Tafel: Meldungen erscheinen darunter statt auf der Karte (m16-r1). */
  bottom(ui) {
    const { y } = this.layout(ui);
    return y + H + LINE_HEIGHT + 4;
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.isOpen || !this.base) return;
    const { x: ox, y: oy } = this.layout(ui);
    ui.ditherFill(0.55, COLORS.night);
    ui.panel(ox - 8, oy - 22, W + 16, H + 22 + LINE_HEIGHT + 12);
    ui.textCentered(T.karte.titel, ox + W / 2, oy - 17, COLORS.gold, { outline: COLORS.outline });
    this.drawMap(ui, ox, oy);
    ui.textCentered(T.karte.schliessen, ox + W / 2, oy + H + 6, COLORS.textDim);
  }

  /**
   * Die Karte als Bild in der Einleitung (M15): alle Wege auf einen Blick, über
   * dem Dialogfenster, ohne das Bild dahinter abzudunkeln.
   * @param {import('./ui.js').UICanvas} ui
   * @param {number} bottom Unterkante (Oberkante des Dialogs)
   */
  drawInset(ui, bottom) {
    if (!this.base) this.base = this.paintBase();
    this.t = this.game.clock; // Mika blinkt im Takt der Spielzeit
    // Auf niedrigen Oberflächen (z. B. 300 Zeilen) halb so groß, damit sie über den Dialog passt
    const k = bottom - 24 >= H ? 1 : 0.5;
    const ox = Math.round((ui.width - W * k) / 2);
    const oy = Math.max(18, bottom - H * k - 6);
    ui.panel(ox - 6, oy - 17, W * k + 12, H * k + 23);
    ui.textCentered(T.karte.titel, ox + (W * k) / 2, oy - 13, COLORS.gold, { outline: COLORS.outline });
    this.drawMap(ui, ox, oy, k);
  }

  /** Karte mit Spawns, Überresten, Bauten, Schlurfern, Mika und dem Zuhause (k: Maßstab). */
  drawMap(ui, ox, oy, k = 1) {
    const g = this.game;
    const px = PX * k;
    const at = (wx, wz) => ({ x: Math.round(ox + (wx - MAP.x0) * px), y: Math.round(oy + (wz - MAP.z0) * px) });
    ui.ctx.drawImage(this.base, ox, oy, W * k, H * k);
    ui.frame(ox - 1, oy - 1, W * k + 2, H * k + 2, COLORS.outline);

    // Spawns: roter Pfeil am linken Rand mit Namen des Wegs
    const map = g.world.map;
    for (const s of map.spawns) {
      const p = at(s.x + 1.5, s.z);
      for (let k = 0; k < 4; k++) ui.rect(p.x - 6 + k, p.y - 3 + k, 2, 7 - k * 2, COLORS.outline);
      for (let k = 0; k < 3; k++) ui.rect(p.x - 5 + k, p.y - 2 + k, 1, 5 - k * 2, COLORS.buildBad);
      ui.text(T.horde.richtungKurz[s.name], p.x + 2, p.y - LINE_HEIGHT / 2 - 1, COLORS.textWarm, { outline: COLORS.outline });
      // G1: darunter der alte Name des Holzfällerwegs (nur auf der großen Karte)
      if (k === 1) ui.text(T.karte.alteWege[s.name], p.x + 2, p.y + LINE_HEIGHT / 2 - 1, COLORS.textDim, { outline: COLORS.outline });
    }

    // G1: der Name der Bucht und der Inseln, auf denen Mika schon war – mittig, in der Karte
    if (k === 1) {
      const name = (text, wx, wz) => {
        const p = at(wx, wz);
        const w = measure(text);
        ui.text(text, Math.max(ox + 2, Math.min(ox + W - 2 - w, p.x - Math.round(w / 2))), p.y, COLORS.textDim, { outline: COLORS.outline });
      };
      name(T.karte.bucht, BAY_LABEL.x, BAY_LABEL.z);
      const visited = g.state.isles?.visited || [];
      for (const id of ISLE_ORDER) if (visited.includes(id)) name(T.karte.inseln[id], ISLES[id].label.x, ISLES[id].label.z);
    }

    // Liegende Überreste: kleine goldene Punkte
    for (const it of g.loot.items) {
      if (it.flying) continue;
      const p = at(it.x, it.z);
      ui.rect(p.x, p.y, 1, 1, COLORS.gold);
    }
    // Bauten: Türme golden, Barrikaden braun (Trümmer rot), Wall dunkel und
    // das Tor hell (M17, eingebrochen rot), Fallen violett (M19), anderes hell
    for (const b of g.world.buildings.list) {
      const c = g.world.buildings.bounds(b);
      const p = at(b.i, b.j);
      const w = Math.max(2, c.w * px);
      const h = Math.max(2, c.d * px);
      const def = BUILDINGS[b.type];
      const color = def.tower
        ? COLORS.gold
        : def.camp
          ? b.broken
            ? COLORS.buildBad
            : hexToCss(def.camp === 'tor' ? P.e8 : b.level >= 4 ? P.s6 : P.e3)
          : b.type === 'barrikade'
            ? b.broken
              ? COLORS.buildBad
              : hexToCss(b.level >= 3 ? P.s7 : P.e7)
            : def.trap // Fallen (M19): violett wie ein Hinweis, verbraucht rot
              ? b.broken
                ? COLORS.buildBad
                : hexToCss(P.a3)
              : def.bait // Moderlocke (M24): pflaumenviolett wie der Moder
                ? hexToCss(P.d2)
                : COLORS.textDim;
      ui.rect(p.x - 1, p.y - 1, w + 2, h + 2, COLORS.outline);
      ui.rect(p.x, p.y, w, h, color);
    }
    // Schlurfer
    for (const z of g.horde.list) {
      if (z.state === 'dying') continue;
      const p = at(z.x, z.z);
      ui.rect(p.x - 1, p.y - 1, 3, 3, COLORS.outline);
      ui.rect(p.x, p.y, 2, 2, hexToCss(P.a3));
    }
    // Mika (blinkt)
    const where = g.viewInside ? g.world.outsideDoorSpot() : g.player.position; // drinnen: am Haus
    const me = at(where.x, where.z);
    ui.rect(me.x - 2, me.y - 2, 5, 5, COLORS.outline);
    ui.rect(me.x - 1, me.y - 1, 3, 3, Math.floor(this.t * 3) % 2 ? COLORS.text : COLORS.gold);

    // M32: Signalfeuer der Frostnacht auf den Inseln – ein flackernder Punkt mit dem Ort. Die
    // Namen bleiben in der Karte (sonst links vom Punkt) und rücken auseinander, wenn zwei
    // Feuer nah beieinander brennen
    const placed = [];
    const right = ox + W * k - 2;
    for (const f of [...(g.world.signalSpots || [])].sort((a, c) => a.z - c.z)) {
      const p = at(f.x, f.z);
      ui.rect(p.x - 2, p.y - 2, 5, 5, COLORS.outline);
      ui.rect(p.x - 1, p.y - 1, 3, 3, Math.floor(this.t * 5 + f.x) % 2 ? COLORS.gold : hexToCss(P.f4));
      const name = T.wanderer.orte[f.place] || f.place;
      const w = measure(name);
      const box = { x: p.x + 4 + w > right ? p.x - 4 - w : p.x + 4, y: p.y - LINE_HEIGHT + 2, w, h: LINE_HEIGHT - 1 };
      for (let n = 0; n < 4 && placed.some((q) => box.x < q.x + q.w && q.x < box.x + box.w && box.y < q.y + q.h && q.y < box.y + box.h); n++) box.y += LINE_HEIGHT - 1;
      placed.push(box);
      ui.text(name, box.x, box.y, COLORS.textWarm, { outline: COLORS.outline });
    }

    // Zuhause
    const home = at(LAYOUT.shelter.x + 2.5, LAYOUT.shelter.z - 1.2);
    const label = T.karte.zuhause;
    ui.text(label, home.x - Math.round(measure(label) / 2), home.y - LINE_HEIGHT, COLORS.textWarm, { outline: COLORS.outline });
  }
}
