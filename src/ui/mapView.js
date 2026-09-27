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

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.isOpen || !this.base) return;
    const g = this.game;
    const { x: ox, y: oy } = this.layout(ui);
    const at = (wx, wz) => ({ x: Math.round(ox + (wx - MAP.x0) * PX), y: Math.round(oy + (wz - MAP.z0) * PX) });
    ui.ditherFill(0.55, COLORS.night);
    ui.panel(ox - 8, oy - 22, W + 16, H + 22 + LINE_HEIGHT + 12);
    ui.textCentered(T.karte.titel, ox + W / 2, oy - 17, COLORS.gold, { outline: COLORS.outline });
    ui.ctx.drawImage(this.base, ox, oy);
    ui.frame(ox - 1, oy - 1, W + 2, H + 2, COLORS.outline);

    // Spawns: roter Pfeil am linken Rand mit Namen des Wegs
    const map = g.world.map;
    for (const s of map.spawns) {
      const p = at(s.x + 1.5, s.z);
      for (let k = 0; k < 4; k++) ui.rect(p.x - 6 + k, p.y - 3 + k, 2, 7 - k * 2, COLORS.outline);
      for (let k = 0; k < 3; k++) ui.rect(p.x - 5 + k, p.y - 2 + k, 1, 5 - k * 2, COLORS.buildBad);
      ui.text(T.horde.richtungKurz[s.name], p.x + 2, p.y - LINE_HEIGHT / 2 - 1, COLORS.textWarm, { outline: COLORS.outline });
    }

    // Liegende Überreste: kleine goldene Punkte
    for (const it of g.loot.items) {
      if (it.flying) continue;
      const p = at(it.x, it.z);
      ui.rect(p.x, p.y, 1, 1, COLORS.gold);
    }
    // Bauten: Türme golden, Barrikaden braun (Trümmer rot), anderes hell
    for (const b of g.world.buildings.list) {
      const c = g.world.buildings.bounds(b);
      const p = at(b.i, b.j);
      const w = Math.max(2, c.w * PX);
      const h = Math.max(2, c.d * PX);
      const def = BUILDINGS[b.type];
      const color = def.tower ? COLORS.gold : b.type === 'barrikade' ? (b.broken ? COLORS.buildBad : hexToCss(b.level >= 3 ? P.s7 : P.e7)) : COLORS.textDim;
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

    // Zuhause
    const home = at(LAYOUT.shelter.x + 2.5, LAYOUT.shelter.z - 1.2);
    const label = T.karte.zuhause;
    ui.text(label, home.x - Math.round(measure(label) / 2), home.y - LINE_HEIGHT, COLORS.textWarm, { outline: COLORS.outline });

    ui.textCentered(T.karte.schliessen, ox + W / 2, oy + H + 6, COLORS.textDim);
  }
}
