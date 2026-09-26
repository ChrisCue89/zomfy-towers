// Bauen: Optionen der Bauleiste, Platzieren mit Vorschau, Auswählen,
// Abreißen und der Ausbau des Zuhauses. Die Bauleiste (ui/buildbar.js)
// zeigt nur an, was hier entschieden wird.
//
// Platzieren: Die Vorschau folgt der Maus, sobald sie bewegt wurde – sonst
// steht sie vor der Figur (reine Tastatur: Q … wählen, E setzt).

import * as THREE from 'three';
import { T } from '../data/texts.js';
import { BUILDINGS, HOME_TAB, HOUSE_LEVELS, footprint } from '../data/buildings.js';
import { canAfford, pay, gain, progressToward, missing } from './inventory.js';
import { BuildPreview } from '../world/buildPreview.js';
import { COLORS } from '../ui/ui.js';

/** Bauleisten-Optionen, die beim ersten Bezahlbar-Werden eine Meldung bekommen. */
const ANNOUNCE = new Set(['werkbank', 'huette']);

export class Builder {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.world = game.world;
    this.preview = new BuildPreview(game.scene, this.world.buildings, this.world.grid);
    this.placement = null; // { type, optionId, name, cost, turns, i, j, ok, reason }
    this.selection = null; // Bau-ID
    this.useMouse = false;
    this.announced = new Set();
    this._ground = new THREE.Vector3();
  }

  // --- Bauleiste ------------------------------------------------------------------

  tabs() {
    return ['zuhause'];
  }

  selectionTitle() {
    const b = this.selected();
    return b ? T.bauten[b.type] : null;
  }

  selected() {
    return this.selection === null ? null : this.world.buildings.get(this.selection);
  }

  /** Optionen des Reiters – oder die des ausgewählten Baus. */
  options(tab) {
    const b = this.selected();
    if (b) return this.selectionOptions(b);
    if (tab === 'zuhause') return this.homeOptions();
    return [];
  }

  homeOptions() {
    const inv = this.game.state.inventory;
    const buildings = this.world.buildings;
    const options = HOME_TAB.map((type) => {
      const def = BUILDINGS[type];
      const full = def.max && buildings.count(type) >= def.max;
      return this.option({
        id: type,
        icon: def.icon,
        name: T.bauten[type],
        info: T.bautenInfo[type],
        cost: def.cost,
        disabled: full,
        disabledText: def.max === 1 ? T.bauleiste.schonGebaut : T.bauleiste.genug,
        action: () => this.startPlacement(type),
      }, inv);
    });
    const level = this.game.state.world.houseLevel;
    const next = HOUSE_LEVELS[level + 1];
    options.push(
      this.option({
        id: 'huette',
        icon: 'huette',
        name: next ? T.bauten.huette : T.bauten.huetteFertig,
        info: next ? T.bautenInfo.huette : T.bauleiste.hausMax,
        cost: next ? next.cost : {},
        disabled: !next,
        disabledText: T.bauleiste.hausMax,
        action: () => this.askHouseUpgrade(),
      }, inv)
    );
    return options;
  }

  selectionOptions(building) {
    const def = BUILDINGS[building.type];
    return [
      {
        id: `abriss-${building.id}`,
        icon: 'abriss',
        name: T.bauleiste.abreissen,
        info: T.bautenInfo.abriss,
        cost: {},
        refund: def.cost,
        affordable: true,
        progress: 1,
        confirm: true,
        action: () => this.demolish(building.id),
      },
    ];
  }

  option(o, inv) {
    const affordable = canAfford(inv, o.cost);
    const lack = missing(inv, o.cost);
    const lackText = Object.entries(lack)
      .map(([res, n]) => `${n} ${T.ressourcen[res]}`)
      .join(', ');
    return {
      ...o,
      affordable,
      progress: progressToward(inv, o.cost),
      missingText: !o.disabled && lackText ? T.bauleiste.fehlt(lackText) : null,
    };
  }

  /** Eine Option ist gerade bezahlbar geworden (Bauleiste lässt sie aufleuchten). */
  onOptionAffordable(option) {
    if (!ANNOUNCE.has(option.id) || this.announced.has(option.id)) return;
    this.announced.add(option.id);
    this.game.hud.toast(T.meldungen.bereit(option.name), option.icon, 3.2);
  }

  // --- Platzieren ---------------------------------------------------------------------

  startPlacement(type, { byMouse = false } = {}) {
    this.selection = null;
    const def = BUILDINGS[type];
    const turns = this.placement?.type === type ? this.placement.turns : 0;
    this.placement = { type, optionId: type, name: T.bauten[type], cost: def.cost, turns, i: 0, j: 0, ok: false, reason: null };
    this.useMouse = byMouse;
  }

  cancel() {
    this.placement = null;
    this.selection = null;
    this.preview.hide();
  }

  /**
   * Abbrechen per Esc oder Rechtsklick. Gibt true zurück, wenn Esc dafür
   * verbraucht wurde (dann öffnet es nicht das Menü).
   */
  handleCancel(input) {
    if (!this.placement && this.selection === null) return false;
    if (input.pressed('cancel') || input.mouse.rightClicked) {
      this.cancel();
      return true;
    }
    return false;
  }

  /** Zielzelle aus Maus oder Blickrichtung der Figur. */
  target(type, turns) {
    const { w, d } = footprint(type, turns);
    let x;
    let z;
    const ground = this.game.pointerGround(this._ground);
    if (this.useMouse && ground) {
      x = ground.x;
      z = ground.z;
    } else {
      const p = this.game.player;
      const reach = 1.1 + Math.max(w, d) / 2;
      x = p.position.x + Math.sin(p.facing) * reach;
      z = p.position.z + Math.cos(p.facing) * reach;
    }
    return { i: Math.round(x - w / 2), j: Math.round(z - d / 2) };
  }

  /**
   * Pro Bild nach der Bewegung der Figur: Vorschau, Drehen, Setzen, Auswählen.
   * @param {import('./input.js').Input} input
   * @param {boolean} pointerFree Maus ist nicht über einer Leiste
   */
  update(dt, input, pointerFree) {
    if (input.mouse.moved && input.mouse.inside && pointerFree) this.useMouse = true;
    const pl = this.placement;
    if (pl) {
      const wheel = input.consumeWheel();
      if (wheel) pl.turns = (pl.turns + (wheel > 0 ? 1 : 3)) % 4;
      const { i, j } = this.target(pl.type, pl.turns);
      const p = this.game.player.position;
      const check = this.world.buildings.check(pl.type, i, j, pl.turns, [{ x: p.x, z: p.z, r: 0.32 }]);
      const affordable = canAfford(this.game.state.inventory, pl.cost);
      Object.assign(pl, { i, j, ok: check.ok && affordable, reason: check.ok ? (affordable ? null : 'teuer') : check.reason });
      this.preview.showPlacement(pl.type, pl.turns, i, j, pl.ok);
      const click = pointerFree && input.mouse.clicked;
      if (click) input.consumeClick();
      if (click || input.pressed('use')) this.tryPlace();
      return;
    }

    // Kein Platzieren: Klick in die Welt wählt einen Bau aus (oder hebt die Auswahl auf).
    if (pointerFree && input.mouse.clicked) {
      const ground = this.game.pointerGround(this._ground);
      const b = ground ? this.world.buildings.atCell(Math.floor(ground.x), Math.floor(ground.z)) : null;
      if (b) {
        input.consumeClick();
        this.select(b.id);
      } else if (this.selection !== null) {
        input.consumeClick();
        this.cancel();
      }
    }
    const sel = this.selected();
    if (sel) {
      this.preview.showSelection(sel);
      // Weit weggelaufen: Auswahl aufheben
      const c = this.world.buildings.bounds(sel);
      const p = this.game.player.position;
      if (Math.hypot(c.x - p.x, c.z - p.z) > 14) this.cancel();
    } else {
      this.selection = null;
      this.preview.hide();
    }
  }

  select(id) {
    this.placement = null;
    this.selection = id;
  }

  tryPlace() {
    const pl = this.placement;
    const hud = this.game.hud;
    if (!pl.ok) {
      const text = { max: T.bauleiste.schonGebaut, belegt: T.meldungen.keinPlatz, figur: T.meldungen.figurImWeg, teuer: T.meldungen.zuTeuer }[pl.reason];
      hud.toast(text || T.meldungen.keinPlatz, null, 1.8);
      return;
    }
    const state = this.game.state;
    if (!pay(state.inventory, pl.cost)) return;
    const b = this.world.buildings.place(pl.type, pl.i, pl.j, pl.turns);
    this.world.refreshInteractions();
    state.world.buildings = this.world.buildings.toState();
    state.stats.built += 1;
    const c = this.world.buildings.bounds(b);
    this.game.effects.dust(c.x, c.z, Math.max(c.w, c.d));
    hud.toast(T.meldungen.gebaut(pl.name), BUILDINGS[pl.type].icon, 2.2);
    this.game.quietSave();

    const def = BUILDINGS[pl.type];
    const again = def.repeat && canAfford(state.inventory, def.cost);
    if (!again) {
      this.placement = null;
      this.preview.hide();
    }
    if (pl.type === 'werkbank' && !state.flags.werkbankGebaut) {
      state.flags.werkbankGebaut = true;
      this.game.startDialog('werkbankGebaut');
    }
  }

  demolish(id) {
    const buildings = this.world.buildings;
    const b = buildings.get(id);
    if (!b) return;
    buildings.remove(id);
    this.world.refreshInteractions();
    const state = this.game.state;
    gain(state.inventory, BUILDINGS[b.type].cost);
    state.world.buildings = buildings.toState();
    this.selection = null;
    this.preview.hide();
    const c = { x: b.i + footprint(b.type, b.turns).w / 2, z: b.j + footprint(b.type, b.turns).d / 2 };
    this.game.effects.dust(c.x, c.z, 1.5);
    this.game.hud.toast(T.meldungen.abgerissen(T.bauten[b.type]), 'abriss', 2.2);
    this.game.quietSave();
  }

  // --- Klare Umrisse auf der Oberfläche -------------------------------------------------

  /**
   * Zielfeld und Auswahl als scharfe Pixel-Umrandung über der Szene (lesbarer als
   * getönte Flächen), dazu kleine Rastermarken an freien Feldern ringsum.
   * @param {import('../ui/ui.js').UICanvas} ui
   */
  drawOverlay(ui) {
    const pl = this.placement;
    const sel = this.selected();
    if (!pl && !sel) return;
    const g = this.game;
    const box = (i, j, w, d) => {
      const a = g.worldToUi(i, 0, j);
      const b = g.worldToUi(i + w, 0, j + d);
      return { x: Math.round(a.x), y: Math.round(a.y), w: Math.round(b.x) - Math.round(a.x), h: Math.round(b.y) - Math.round(a.y) };
    };
    const thick = (r, color) => {
      ui.frame(r.x - 1, r.y - 1, r.w + 2, r.h + 2, COLORS.outline);
      ui.frame(r.x, r.y, r.w, r.h, color);
      ui.frame(r.x + 1, r.y + 1, r.w - 2, r.h - 2, color);
    };
    if (pl) {
      const { w, d } = footprint(pl.type, pl.turns);
      const grid = this.world.grid;
      const cx = pl.i + w / 2;
      const cz = pl.j + d / 2;
      for (let j = Math.floor(cz) - 4; j <= Math.floor(cz) + 4; j++) {
        for (let i = Math.floor(cx) - 4; i <= Math.floor(cx) + 4; i++) {
          if (Math.hypot(i + 0.5 - cx, j + 0.5 - cz) > 3.6 || !grid.isFree(i, j)) continue;
          if (i >= pl.i && i < pl.i + w && j >= pl.j && j < pl.j + d) continue;
          const r = box(i, j, 1, 1);
          for (const [x, y] of [[r.x, r.y], [r.x + r.w - 2, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 2, r.y + r.h - 1]]) ui.rect(x, y, 2, 1, COLORS.textWarm);
        }
      }
      thick(box(pl.i, pl.j, w, d), pl.ok ? COLORS.buildOk : COLORS.buildBad);
    }
    if (sel) {
      const b = this.world.buildings.bounds(sel);
      thick(box(b.i, b.j, b.w, b.d), COLORS.gold);
    }
  }

  // --- Zuhause ausbauen ----------------------------------------------------------------

  askHouseUpgrade() {
    this.cancel();
    this.game.startDialog('hausAusbau', (aktion) => {
      if (aktion === 'hausAusbauen') this.upgradeHouse();
    });
  }

  upgradeHouse() {
    const state = this.game.state;
    const level = state.world.houseLevel + 1;
    const next = HOUSE_LEVELS[level];
    if (!next) return;
    if (!pay(state.inventory, next.cost)) {
      this.game.hud.toast(T.meldungen.zuTeuer);
      return;
    }
    this.game.startWork(T.schlaf.werkeln, 2, () => {
      state.world.houseLevel = level;
      this.world.setHouseLevel(level);
      this.game.pushPlayerOut();
    }, () => {
      this.game.hud.toast(T.meldungen.hausFertig, 'huette', 4);
      this.game.startDialog('hausFertig');
      this.game.quietSave();
    });
  }
}
