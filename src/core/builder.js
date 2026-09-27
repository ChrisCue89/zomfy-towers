// Bauen: Optionen der Bauleiste, Platzieren mit Vorschau, Auswählen,
// Ausbauen, Reparieren, Abreißen und der Ausbau des Zuhauses. Die Bauleiste
// (ui/buildbar.js) zeigt nur an, was hier entschieden wird.
//
// Reiter: Türme · Figur · Zuhause (DESIGN.md 6.6). Ist ein Turm ausgewählt,
// zeigt die Leiste seine Ausbau- und Spezialisierungsoptionen.
//
// Platzieren: Die Vorschau folgt der Maus, sobald sie bewegt wurde – sonst
// steht sie vor der Figur (reine Tastatur: Q … wählen, E setzt).

import * as THREE from 'three';
import { T } from '../data/texts.js';
import { BUILDINGS, HOME_TAB, TOWER_TAB, HOUSE_LEVELS, footprint, maxHpOf, barricadeLevel, barricadeInvested, BARRICADE_LEVELS, BARRICADE_REBUILD } from '../data/buildings.js';
import { TOWERS, towerStats, towerInvested, towerBuildCost, TOWER_REFUND, TOWER_EXTRA } from '../data/towers.js';
import { UPGRADES, UPGRADE_ORDER } from '../data/upgrades.js';
import { WEAPONS, WEAPON_ORDER, weaponStats } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { SURVIVORS } from '../data/survivors.js';
import { canAfford, pay, gain, progressToward, missing } from './inventory.js';
import { BuildPreview } from '../world/buildPreview.js';
import { COLORS } from '../ui/ui.js';
import { measure, LINE_HEIGHT } from '../ui/font.js';

/** Bauleisten-Optionen, die beim ersten Bezahlbar-Werden eine Meldung bekommen. */
const ANNOUNCE = new Set(['werkbank', 'huette', 'bolzen', 'specA', 'specB']);
const FIGHT_NEAR = 2.4; // so nah an einem Schlurfer schlägt jeder Klick zu
const POINTER_NEAR = 1.1; // so nah am Bodenpunkt unter dem Zeiger zählt ein Schlurfer als »angeklickt«
const num = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

export class Builder {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.world = game.world;
    this.preview = new BuildPreview(game.scene, this.world.buildings, this.world.grid);
    this.placement = null; // { type, optionId, name, cost, turns, i, j, ok, reason }
    this.selection = null; // Bau-ID
    this.useMouse = false;
    this.hovered = null; // Bau unter dem Mauszeiger
    this.pointerZombie = null; // Schlurfer unter dem Mauszeiger (geht beim Klick vor)
    this.endedAt = -10; // wann das Platzieren zuletzt von selbst endete (this.game.clock)
    this.announced = new Set();
    this._ground = new THREE.Vector3();
  }

  // --- Bauleiste ------------------------------------------------------------------

  tabs() {
    // »Einrichten« (Zelte, Möbel, Funkturm) kommt mit dem ersten Besuch (Meilenstein 6)
    const guests = Object.values(this.game.state.survivors).some((s) => s.stage > 0);
    return guests ? ['tuerme', 'figur', 'zuhause', 'einrichten'] : ['tuerme', 'figur', 'zuhause'];
  }

  selectionTitle() {
    const b = this.selected();
    if (!b) return null;
    const name = T.bauten[b.type];
    if (!BUILDINGS[b.type].tower) return name;
    const spec = b.spec ? ` · ${T.tuerme[b.spec][b.type][0]}` : '';
    return `${name} · ${T.bauleiste.stufe(b.level)}${spec}`; // »Bolzenwerfer 2« las sich wie »der zweite«
  }

  selected() {
    return this.selection === null ? null : this.world.buildings.get(this.selection);
  }

  /** Optionen des Reiters – oder die des ausgewählten Baus. */
  options(tab) {
    const b = this.selected();
    if (b) return this.selectionOptions(b);
    if (tab === 'tuerme') return this.buildOptions(TOWER_TAB);
    if (tab === 'figur') return this.figureOptions();
    if (tab === 'zuhause') return this.homeOptions();
    if (tab === 'einrichten') return this.furnishOptions();
    return [];
  }

  /** Bau-Optionen (Platzieren) für eine Liste von Arten. */
  buildOptions(types) {
    const inv = this.game.state.inventory;
    const buildings = this.world.buildings;
    return types.map((type) => {
      const def = BUILDINGS[type];
      const full = def.max && buildings.count(type) >= def.max;
      return this.option(
        {
          id: type,
          icon: def.icon,
          name: T.bauten[type],
          info: this.infoFor(type),
          hint: def.tower && buildings.count(type) > 0 ? T.bauleiste.staffel(TOWER_EXTRA) : null,
          cost: this.costOf(type),
          disabled: full,
          disabledText: def.max === 1 ? T.bauleiste.schonGebaut : T.bauleiste.genug,
          action: () => this.startPlacement(type),
        },
        inv
      );
    });
  }

  /** Reiter »Einrichten«: Schlafzelt, das nächste Möbelstück, Körbchen, Funkturm. */
  furnishOptions() {
    const inv = this.game.state.inventory;
    const options = this.buildOptions(['zelt']);
    for (const o of this.game.furnishing.options()) options.push(this.option({ ...o, buy: true }, inv));
    const tower = this.game.survivors.towerOption();
    if (tower) options.push(this.option(tower, inv));
    return options;
  }

  homeOptions() {
    const inv = this.game.state.inventory;
    const options = this.buildOptions(HOME_TAB);
    const level = this.game.state.world.houseLevel;
    const next = HOUSE_LEVELS[level + 1];
    options.push(
      this.option(
        {
          id: 'huette',
          icon: 'huette',
          name: next ? T.bauten.huette : T.bauten.huetteFertig,
          info: next ? T.bautenInfo.huette : T.bauleiste.hausMax,
          cost: next ? next.cost : {},
          disabled: !next,
          disabledText: T.bauleiste.hausMax,
          action: () => this.askHouseUpgrade(),
        },
        inv
      )
    );
    const repair = this.repairCost();
    options.push(this.repairOption({ id: 'reparieren', cost: repair, action: () => this.repairAll() }, inv));
    return options;
  }

  /**
   * Reparieren: Reicht der Vorrat nicht für alles, wird anteilig geflickt
   * (m3-r1). Solange nachts Schlurfer da sind, geht es gar nicht – erst die
   * Welle abwehren, dann flicken (sonst ist das Zuhause unverwundbar).
   */
  repairOption({ id, cost, action, rebuild = false }, inv) {
    const busy = this.waveRunning();
    const share = cost ? this.repairShare(cost) : 0;
    const o = this.option(
      {
        id,
        icon: 'reparieren',
        name: rebuild ? T.barrikaden.aufbauen : T.bauleiste.reparieren,
        info: rebuild ? T.barrikaden.aufbauenInfo : T.bautenInfo.reparieren,
        cost: cost || {},
        disabled: !cost || busy,
        disabledText: busy ? T.bauleiste.erstWelle : T.bauleiste.nichtsKaputt,
        action,
      },
      inv
    );
    // Anteilig flicken geht, anteilig aufbauen nicht
    if (!rebuild && !o.disabled && !o.affordable && share > 0) {
      o.affordable = true;
      o.hint = T.bauleiste.teilweise(Math.round(share * 100));
    }
    return o;
  }

  /** Läuft gerade eine Welle (Nacht aktiv und Schlurfer unterwegs)? */
  waveRunning() {
    const g = this.game;
    return g.nights.active && (g.horde.alive > 0 || g.nights.queue.length > 0);
  }

  /** Welcher Anteil einer Reparatur ist mit dem Vorrat bezahlbar (0…1)? */
  repairShare(cost) {
    const inv = this.game.state.inventory;
    let share = 1;
    for (const [res, n] of Object.entries(cost)) if (n > 0) share = Math.min(share, (inv[res] || 0) / n);
    return Math.max(0, share);
  }

  /** Anteil `share` einer Reparatur bezahlen (aufgerundet, nie mehr als da ist). */
  payShare(cost, share) {
    const inv = this.game.state.inventory;
    for (const [res, n] of Object.entries(cost)) inv[res] = Math.max(0, (inv[res] || 0) - Math.min(inv[res] || 0, Math.ceil(n * share - 1e-6)));
  }

  figureOptions() {
    const st = this.game.state;
    const options = UPGRADE_ORDER.map((id) => {
      const u = UPGRADES[id];
      const level = st.upgrades[id] || 0;
      const maxed = level >= u.cost.length;
      const [name, info] = T.figur[id];
      const nextValue = u.values[Math.min(level + 1, u.values.length - 1)];
      return this.option(
        {
          id: `figur-${id}`,
          icon: u.icon,
          name: `${name} ${Math.min(level + 1, u.cost.length)}/${u.cost.length}`,
          info: maxed ? T.figur.max : info(num(nextValue)),
          cost: maxed ? {} : u.cost[level],
          disabled: maxed,
          disabledText: T.figur.max,
          badge: String(level),
          buy: true,
          action: () => this.buyUpgrade(id),
        },
        st.inventory
      );
    });
    const weapon = this.weaponToUpgrade();
    if (weapon) options.push(this.weaponOption(weapon));
    return options;
  }

  /** Welche Waffe die Leiste zum Aufwerten anbietet: die in der Hand, sonst die erste gebaute. */
  weaponToUpgrade() {
    const st = this.game.state;
    const held = this.game.player.heldTool;
    if (held && WEAPONS[held]?.cost && st.weapons[held]) return held;
    return WEAPON_ORDER.find((id) => st.weapons[id]) || null;
  }

  weaponOption(id) {
    const st = this.game.state;
    const level = st.weapons[id];
    const maxed = level >= 3;
    const next = maxed ? level : level + 1;
    const damage = Math.round(weaponStats(id, { ...st, weapons: { ...st.weapons, [id]: next } }).damage);
    return this.option(
      {
        id: `waffe-${id}`,
        icon: WEAPONS[id].icon,
        name: T.figur.waffe(T.gegenstaende[id], next),
        info: maxed ? T.figur.max : T.figur.waffeInfo(damage),
        cost: maxed ? {} : WEAPONS[id].upgrades[level - 1],
        disabled: maxed,
        disabledText: T.figur.max,
        badge: String(level),
        buy: true,
        action: () => this.upgradeWeapon(id),
      },
      st.inventory
    );
  }

  upgradeWeapon(id) {
    const st = this.game.state;
    const level = st.weapons[id] || 0;
    if (!level || level >= 3 || !pay(st.inventory, WEAPONS[id].upgrades[level - 1])) return;
    st.weapons[id] = level + 1;
    const p = this.game.player.position;
    this.game.effects.splat(p.x, 1.2, p.z, 'funken', 12, 0.8);
    this.game.hud.toast(T.meldungen.waffeAufgewertet(T.gegenstaende[id], level + 1, ITEMS[id]?.plural), WEAPONS[id].icon, 2.4);
    this.game.sound.play('aufwertung');
    this.game.quietSave();
  }

  selectionOptions(b) {
    const inv = this.game.state.inventory;
    const def = BUILDINGS[b.type];
    const options = [];
    if (def.tower) {
      const t = TOWERS[b.type];
      if (b.level === 1) {
        options.push(this.option({ id: 'stufe2', icon: def.icon, badge: '2', name: T.bauleiste.stufe(2), info: this.statLine(b.type, 2, null), cost: t.base[1].cost, buy: true, action: () => this.upgradeTower(b, 2, null) }, inv));
      } else if (b.level === 2) {
        for (const spec of ['A', 'B']) {
          const [name, info] = T.tuerme[spec][b.type];
          options.push(this.option({ id: `spec${spec}`, icon: def.icon, badge: spec, name, info: `${info} ${this.statLine(b.type, 3, spec)}`, cost: t.specs[spec].levels[0].cost, buy: true, action: () => this.upgradeTower(b, 3, spec) }, inv));
        }
      } else if (b.level < 5) {
        const [name] = T.tuerme[b.spec][b.type];
        options.push(this.option({ id: `stufe${b.level + 1}`, icon: def.icon, badge: String(b.level + 1), name: `${name} ${b.level + 1}`, info: this.statLine(b.type, b.level + 1, b.spec), cost: t.specs[b.spec].levels[b.level - 2].cost, buy: true, action: () => this.upgradeTower(b, b.level + 1, b.spec) }, inv));
      } else {
        options.push({ id: 'max', icon: def.icon, badge: '5', name: T.bauleiste.hoechste, info: this.statLine(b.type, 5, b.spec), cost: {}, affordable: false, disabled: true, disabledText: T.bauleiste.hoechste, progress: 1 });
      }
    }
    if (b.type === 'barrikade') {
      if (b.broken) {
        // Trümmer: wieder aufbauen (tagsüber) oder abräumen
        options.push(this.repairOption({ id: `rep-${b.id}`, cost: this.buildingRepairCost(b), action: () => this.repairBuilding(b), rebuild: true }, inv));
      } else if (b.level < BARRICADE_LEVELS.length - 1) {
        const next = b.level + 1;
        const [name, info] = T.barrikaden[BARRICADE_LEVELS[next].key];
        options.push(this.option({ id: `stufe${next}`, icon: def.icon, badge: String(next), name, info: `${info} ${T.barrikaden.haelt(barricadeLevel(next).hp)}`, cost: BARRICADE_LEVELS[next].cost, buy: true, action: () => this.upgradeBarricade(b) }, inv));
      }
    }
    if (def.hp && !b.broken && b.hp < maxHpOf(b)) {
      const cost = this.buildingRepairCost(b);
      options.push(this.repairOption({ id: `rep-${b.id}`, cost, action: () => this.repairBuilding(b) }, inv));
    }
    // Bewohntes Zelt: vor dem Abriss sagen, wer darin schläft (m6-r1)
    const guest = b.type === 'zelt' ? this.game.survivors.occupant(b.id) : null;
    const guestName = guest ? SURVIVORS[guest].name : null;
    options.push({
      id: `abriss-${b.id}`,
      icon: 'abriss',
      name: b.broken ? T.barrikaden.abraeumen : T.bauleiste.abreissen,
      info: guestName ? T.bautenInfo.abrissBewohnt(guestName) : b.broken ? T.barrikaden.abraeumenInfo : def.tower || def.defense ? T.bautenInfo.abrissTurm : T.bautenInfo.abriss,
      confirmText: guestName ? T.bauleiste.nochmalBewohnt(guestName) : null,
      cost: {},
      refund: this.refundFor(b),
      affordable: true,
      progress: 1,
      confirm: true,
      danger: true,
      action: () => this.demolish(b.id),
    });
    return options;
  }

  /** Zeigt das Platzieren dieses Baus die Wege der Horde? Immer – auch eine Bank kann im Weg stehen. */
  showsHordePaths() {
    return true;
  }

  /** Was kostet der nächste Bau dieser Art? (Türme: Staffelpreis) */
  costOf(type) {
    const def = BUILDINGS[type];
    return def.tower ? towerBuildCost(type, this.world.buildings.count(type)) : def.cost;
  }

  /** Beschreibung samt Werten (Türme) – für Kachel und Platzier-Tafel. */
  infoFor(type) {
    return BUILDINGS[type].tower ? `${T.bautenInfo[type]} ${this.statLine(type, 1, null)}` : T.bautenInfo[type];
  }

  /** »Schaden 21 · 1,2/s · 5,2 m« */
  statLine(type, level, spec) {
    const s = towerStats(type, level, spec);
    if (type === 'laternenturm') return `+${Math.round(s.aura * 100)} % Schaden · ${num(s.auraRange)} m`;
    if (type === 'sprenger') return `Bremst ${Math.round(s.slow * 100)} % · ${num(s.range)} m`;
    return `Schaden ${Math.round(s.damage)} · ${num(s.rate)}/s · ${num(s.range)} m`;
  }

  option(o, inv) {
    const affordable = canAfford(inv, o.cost);
    const lack = missing(inv, o.cost);
    const lackText = Object.entries(lack)
      .map(([res, n]) => T.menge(n, res))
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

  // --- Figur und Türme ausbauen -------------------------------------------------------

  buyUpgrade(id) {
    const st = this.game.state;
    const u = UPGRADES[id];
    const level = st.upgrades[id] || 0;
    if (level >= u.cost.length || !pay(st.inventory, u.cost[level])) return;
    st.upgrades[id] = level + 1;
    if (id === 'leben') st.player.hp += u.values[level + 1] - u.values[level];
    this.game.hud.toast(T.meldungen.aufgewertet(T.figur[id][0], level + 1), u.icon, 2.4);
    this.game.effects.splat(this.game.player.position.x, 1.2, this.game.player.position.z, 'funken', 14, 0.8);
    this.game.quietSave();
  }

  upgradeTower(b, level, spec) {
    const t = TOWERS[b.type];
    const cost = level <= 2 ? t.base[level - 1].cost : t.specs[spec].levels[level - 3].cost;
    if (!pay(this.game.state.inventory, cost)) return;
    this.game.sound.play('aufwertung');
    this.world.buildings.upgrade(b, level, spec);
    this.game.state.world.buildings = this.world.buildings.toState();
    const c = this.world.buildings.bounds(b);
    this.game.effects.dust(c.x, c.z, 1.2);
    this.game.effects.splat(c.x, 1.5, c.z, 'funken', 16, 0.9);
    this.game.hud.toast(T.meldungen.ausgebaut(this.selectionTitle() || T.bauten[b.type]), BUILDINGS[b.type].icon, 2.6);
    this.game.quietSave();
  }

  /** Barrikade eine Stufe höher (Holz → verstärkt → Metall). */
  upgradeBarricade(b) {
    const next = BARRICADE_LEVELS[b.level + 1];
    if (!next || !pay(this.game.state.inventory, next.cost)) return;
    this.game.sound.play('aufwertung');
    this.world.buildings.upgradeBarricade(b);
    this.game.state.world.buildings = this.world.buildings.toState();
    const c = this.world.buildings.bounds(b);
    this.game.effects.dust(c.x, c.z, 1.1);
    this.game.effects.splat(c.x, 0.9, c.z, b.level >= 3 ? 'funken' : 'holz', 12, 0.8);
    this.game.hud.toast(T.meldungen.ausgebaut(T.barrikaden[next.key][0]), BUILDINGS[b.type].icon, 2.4);
    this.game.quietSave();
  }

  // --- Reparieren ------------------------------------------------------------------------

  /** Flicken (anteilig nach Schaden) bzw. Wiederaufbau aus Trümmern – oder null. */
  buildingRepairCost(b) {
    const def = BUILDINGS[b.type];
    if (b.type === 'barrikade') {
      const invested = barricadeInvested(b.level);
      const share = b.broken ? BARRICADE_REBUILD : (maxHpOf(b) - b.hp) / maxHpOf(b);
      if (share <= 0) return null;
      const cost = {};
      for (const [res, n] of Object.entries(invested)) cost[res] = Math.max(1, Math.ceil(n * share));
      return cost;
    }
    const missingHp = (maxHpOf(b) - b.hp) / maxHpOf(b);
    if (missingHp <= 0) return null;
    if (def.tower) return { holz: Math.max(1, Math.ceil(missingHp * 4)), schrott: Math.max(1, Math.ceil(missingHp * 4)) };
    return { holz: Math.max(1, Math.ceil(missingHp * 3)) };
  }

  /** Gesamtkosten, um Zuhause, Türme und Barrikaden zu flicken (oder null). */
  repairCost() {
    const st = this.game.state;
    const total = {};
    const add = (c) => {
      for (const [r, n] of Object.entries(c || {})) total[r] = (total[r] || 0) + n;
    };
    const maxHome = HOUSE_LEVELS[st.world.houseLevel].hp;
    const home = maxHome - st.world.homeHp;
    // m3-r2: Flicken war fast umsonst (76 Schaden = 5 Holz + 2 Schrott) – Schaden soll zählen
    if (home > 0.5) add({ holz: Math.ceil(home / 10), schrott: Math.ceil(home / 15) });
    for (const b of this.world.buildings.list) if (BUILDINGS[b.type].hp && (b.broken || b.hp < maxHpOf(b))) add(this.buildingRepairCost(b));
    if (!Object.keys(total).length) return null;
    // Bert flickt mit: nur ein Teil der Kosten (Meilenstein 6)
    const factor = this.game.survivors.repairFactor();
    if (factor < 1) for (const r of Object.keys(total)) total[r] = Math.max(1, Math.ceil(total[r] * factor));
    return total;
  }

  repairAll() {
    const st = this.game.state;
    const cost = this.repairCost();
    if (!cost || this.waveRunning()) return;
    const share = this.repairShare(cost);
    if (share <= 0) return;
    this.payShare(cost, share);
    const max = HOUSE_LEVELS[st.world.houseLevel].hp;
    st.world.homeHp = Math.min(max, st.world.homeHp + (max - st.world.homeHp) * share);
    for (const b of this.world.buildings.list) {
      if (!BUILDINGS[b.type].hp) continue;
      if (b.broken) {
        if (share >= 1) this.world.buildings.rebuildBarricade(b); // Trümmer nur ganz oder gar nicht
        continue;
      }
      const full = maxHpOf(b);
      b.hp = Math.min(full, b.hp + (full - b.hp) * share);
      this.world.buildings.refreshLook(b);
    }
    st.world.buildings = this.world.buildings.toState();
    this.game.hud.toast(share >= 1 ? T.meldungen.repariert : T.meldungen.teilRepariert(Math.round(share * 100)), 'reparieren', 2.4);
    this.game.sound.play('bau');
    this.game.quietSave();
  }

  repairBuilding(b) {
    const cost = this.buildingRepairCost(b);
    if (!cost || this.waveRunning()) return;
    if (b.broken) {
      // Wiederaufbau: ganz oder gar nicht
      if (!pay(this.game.state.inventory, cost)) return;
      this.world.buildings.rebuildBarricade(b);
      this.game.state.world.buildings = this.world.buildings.toState();
      const c = this.world.buildings.bounds(b);
      this.game.effects.dust(c.x, c.z, 1.1);
      this.game.sound.play('bau');
      this.game.hud.toast(T.barrikaden.wiederAufgebaut, 'barrikade', 2);
      this.game.quietSave();
      return;
    }
    const share = this.repairShare(cost);
    if (share <= 0) return;
    this.payShare(cost, share);
    const full = maxHpOf(b);
    b.hp = Math.min(full, b.hp + (full - b.hp) * share);
    this.world.buildings.refreshLook(b);
    this.game.state.world.buildings = this.world.buildings.toState();
    this.game.hud.toast(share >= 1 ? T.meldungen.repariert : T.meldungen.teilRepariert(Math.round(share * 100)), 'reparieren', 2);
  }

  // --- Platzieren ---------------------------------------------------------------------

  startPlacement(type, { byMouse = false } = {}) {
    this.selection = null;
    const turns = this.placement?.type === type ? this.placement.turns : 0;
    this.placement = { type, optionId: type, name: T.bauten[type], info: this.infoFor(type), cost: this.costOf(type), turns, i: 0, j: 0, ok: false, reason: null };
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
    if (!this.placement && this.selection === null) {
      // Esc gleich nach dem letzten Setzen heißt »fertig«, nicht »Menü«
      return input.pressed('cancel') && this.game.clock - this.endedAt < 2;
    }
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
   * Gibt 'click' zurück, wenn ein Klick in die Welt übrig bleibt (→ Schlag).
   * @param {import('./input.js').Input} input
   * @param {boolean} pointerFree Maus ist nicht über einer Leiste
   */
  update(dt, input, pointerFree) {
    if (input.mouse.moved && input.mouse.inside && pointerFree) this.useMouse = true;
    const pl = this.placement;
    if (pl) {
      const wheel = input.consumeWheel();
      if (wheel) {
        pl.turns = (pl.turns + (wheel > 0 ? 1 : 3)) % 4;
        pl.turned = true;
      }
      const { i, j } = this.target(pl.type, pl.turns);
      // Barrikaden stellen sich von selbst quer zum Weg (bis man selbst dreht)
      if (BUILDINGS[pl.type].onPath && !pl.turned) pl.turns = this.fenceTurns(i, j);
      const p = this.game.player.position;
      const check = this.world.buildings.check(pl.type, i, j, pl.turns, [{ x: p.x, z: p.z, r: 0.32 }]);
      const affordable = canAfford(this.game.state.inventory, pl.cost);
      Object.assign(pl, { i, j, ok: check.ok && affordable, reason: check.ok ? (affordable ? null : 'teuer') : check.reason, why: check.why || null });
      this.preview.showPlacement(pl.type, pl.turns, i, j, pl.ok);
      const click = pointerFree && input.mouse.clicked;
      if (click) input.consumeClick();
      if (click || input.pressed('use')) {
        input.consume('use');
        this.tryPlace();
      }
      return null;
    }

    // Kein Platzieren: Klick auf einen Bau wählt ihn aus, sonst ist es ein Schlag.
    // Ein Schlurfer unter dem Zeiger geht vor – sonst wählt man mitten im
    // Kampf den Turm dahinter aus (m3-r1). Steht ein Schlurfer dicht bei Mika,
    // schlägt jeder Klick zu; auswählen geht dann mit E (m3-r2).
    let rest = null;
    const fight = this.fighting();
    this.pointerZombie = pointerFree ? this.zombieAtPointer() : null;
    this.hovered = pointerFree && !this.pointerZombie && !fight ? this.pick() : null;
    if (pointerFree && input.mouse.clicked && (this.pointerZombie || fight)) {
      rest = 'click';
    } else if (pointerFree && input.mouse.clicked) {
      const b = this.hovered;
      if (b) {
        input.consumeClick();
        this.select(b.id);
      } else if (this.selection !== null) {
        input.consumeClick();
        this.cancel();
      } else {
        rest = 'click';
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
    return rest;
  }

  /** Drehung, bei der eine Barrikade quer zur Laufrichtung der Horde steht. */
  fenceTurns(i, j) {
    const dir = this.world.pathing.direction(i + 0.5, j + 0.5, true, this._dir || (this._dir = { x: 0, z: 0 }));
    if (!dir) return 0;
    return Math.abs(dir.x) >= Math.abs(dir.z) ? 1 : 0;
  }

  /** Bildschirm-Kasten um Geist, Umriss und Grund-Zeile – dort soll keine Tafel liegen. */
  placementRect() {
    const pl = this.placement;
    if (!pl) return null;
    const g = this.game;
    const { w, d } = footprint(pl.type, pl.turns);
    const top = g.worldToUi(pl.i, BUILDINGS[pl.type].height || 1.2, pl.j);
    const bottom = g.worldToUi(pl.i + w, 0, pl.j + d);
    const label = pl.ok ? 0 : LINE_HEIGHT + 10;
    return { x: top.x - 40, y: top.y - 4, w: bottom.x - top.x + 80, h: bottom.y - top.y + 8 + label };
  }

  /** Steht ein Schlurfer dicht bei Mika? Dann hat Zuschlagen Vorrang vor dem Auswählen. */
  fighting() {
    const p = this.game.player.position;
    return this.game.horde.list.some((z) => z.state !== 'dying' && Math.hypot(z.x - p.x, z.z - p.z) < FIGHT_NEAR);
  }

  /**
   * Bau unter dem Mauszeiger: Jeder Bau ist auf dem Bildschirm ein Kasten
   * (Grundfläche × Höhe). Getroffen wird der vorderste.
   */
  pick() {
    const g = this.game;
    const m = g.input.mouse;
    if (!m.inside) return null;
    let best = null;
    let bestZ = -Infinity;
    for (const b of this.world.buildings.list) {
      const { w, d } = footprint(b.type, b.turns);
      const h = BUILDINGS[b.type].height || 1.2;
      const a = g.worldToUi(b.i, h, b.j);
      const c = g.worldToUi(b.i + w, 0, b.j + d);
      if (m.x < a.x - 1 || m.x > c.x + 1 || m.y < a.y - 1 || m.y > c.y + 1) continue;
      if (b.j + d > bestZ) {
        bestZ = b.j + d;
        best = b;
      }
    }
    return best;
  }

  /** Lebender Schlurfer in Schlagweite unter dem Mauszeiger (Bildschirmkasten wie bei Bauten). */
  zombieAtPointer() {
    const g = this.game;
    const m = g.input.mouse;
    if (!m.inside) return null;
    const p = g.player.position;
    let best = null;
    let bestD = Infinity;
    for (const z of g.horde.list) {
      if (z.state === 'dying') continue;
      const d = Math.hypot(z.x - p.x, z.z - p.z);
      if (d > 6 || d >= bestD) continue;
      const r = z.def.radius + 0.15;
      const a = g.worldToUi(z.x - r, 1.7 * (z.def.scale || 1), z.z - r);
      const c = g.worldToUi(z.x + r, 0, z.z + r);
      if (m.x < a.x - 2 || m.x > c.x + 2 || m.y < a.y - 2 || m.y > c.y + 2) continue;
      best = z;
      bestD = d;
    }
    if (best) return best;
    // Knapp daneben (Schatten, Füße, gerade weitergeschlurft): Ein Schlurfer nahe dem
    // Bodenpunkt unter dem Zeiger geht trotzdem vor – sonst wählt der Klick den Bau
    // dahinter aus (m5-r1)
    const ground = g.pointerGround(this._aim || (this._aim = new THREE.Vector3()));
    if (!ground) return null;
    let near = POINTER_NEAR;
    for (const z of g.horde.list) {
      if (z.state === 'dying' || Math.hypot(z.x - p.x, z.z - p.z) > 6) continue;
      const d = Math.hypot(z.x - ground.x, z.z - ground.z);
      if (d < near) {
        near = d;
        best = z;
      }
    }
    return best;
  }

  select(id) {
    this.placement = null;
    this.selection = id;
  }

  tryPlace() {
    const pl = this.placement;
    const hud = this.game.hud;
    if (!pl.ok) {
      const text = {
        max: T.bauleiste.schonGebaut,
        belegt: (pl.why && T.meldungen.keinPlatzWeil[pl.why]) || T.meldungen.keinPlatz,
        figur: T.meldungen.figurImWeg,
        weg: T.bauleiste.weg,
        aufWeg: T.bauleiste.grund.aufWeg,
        nurWeg: T.bauleiste.grund.nurWeg,
        teuer: T.bauleiste.fehlt(this.lackText(pl.cost)),
      }[pl.reason];
      hud.toast(text || T.meldungen.keinPlatz, null, 2);
      return;
    }
    const state = this.game.state;
    if (!pay(state.inventory, pl.cost)) return;
    const b = this.world.buildings.place(pl.type, pl.i, pl.j, pl.turns);
    this.game.sound.play('bau');
    if (BUILDINGS[pl.type].harvest) b.day = state.time.day; // frisch gesät: erst morgen erntereif
    b.headAngle = -Math.PI / 2; // Türme schauen anfangs nach Westen (von dort kommt die Horde)
    if (b.head) b.head.rotation.y = b.headAngle;
    this.world.refreshInteractions();
    state.world.buildings = this.world.buildings.toState();
    state.stats.built += 1;
    const c = this.world.buildings.bounds(b);
    this.game.effects.dust(c.x, c.z, Math.max(c.w, c.d));
    hud.toast(T.meldungen.gebaut(pl.name), BUILDINGS[pl.type].icon, 2.2);
    this.game.survivors.onBuilt(pl.type);
    this.game.quietSave();

    const def = BUILDINGS[pl.type];
    const again = def.repeat && canAfford(state.inventory, def.cost);
    if (!again) {
      this.placement = null;
      this.preview.hide();
      this.endedAt = this.game.clock;
    }
    if (pl.type === 'werkbank' && !state.flags.werkbankGebaut) {
      state.flags.werkbankGebaut = true;
      this.game.startDialog('werkbankGebaut');
    }
    if (def.tower && !state.flags.ersterTurm) {
      state.flags.ersterTurm = true;
      this.game.startDialog('ersterTurm');
    }
  }

  lackText(cost) {
    return Object.entries(missing(this.game.state.inventory, cost))
      .map(([res, n]) => T.menge(n, res))
      .join(', ');
  }

  /** Rückgabe beim Abreißen: Zuhause-Bauten alles, Verteidigung (Türme, Barrikaden) 70 %. */
  refundFor(b) {
    const def = BUILDINGS[b.type];
    if (def.tower) {
      // Der Bau selbst zählt zum Staffelpreis des zuletzt gebauten Turms dieser Art
      const invested = towerInvested(b.type, b.level, b.spec);
      const extra = towerBuildCost(b.type, Math.max(0, this.world.buildings.count(b.type) - 1)).schrott - TOWERS[b.type].base[0].cost.schrott;
      return scale({ ...invested, schrott: (invested.schrott || 0) + extra }, TOWER_REFUND);
    }
    if (b.type === 'barrikade') return b.broken ? {} : scale(barricadeInvested(b.level), TOWER_REFUND); // Trümmer: nur abräumen
    if (def.defense) return scale(def.cost, TOWER_REFUND);
    return def.cost;
  }

  demolish(id) {
    const buildings = this.world.buildings;
    const b = buildings.get(id);
    if (!b) return;
    const refund = this.refundFor(b);
    buildings.remove(id);
    this.world.refreshInteractions();
    this.game.sound.play('abriss');
    const state = this.game.state;
    gain(state.inventory, refund);
    state.world.buildings = buildings.toState();
    this.selection = null;
    this.preview.hide();
    const { w, d } = footprint(b.type, b.turns);
    this.game.effects.dust(b.i + w / 2, b.j + d / 2, 1.5);
    this.game.hud.toast(T.meldungen.abgerissen(T.bauten[b.type]), 'abriss', 2.2);
    if (b.type === 'zelt') this.game.survivors.checkTents();
    this.game.quietSave();
  }

  // --- Klare Umrisse auf der Oberfläche -------------------------------------------------

  /**
   * Zielfeld und Auswahl als scharfe Pixel-Umrandung über der Szene (lesbarer als
   * getönte Flächen), dazu kleine Rastermarken an freien Feldern ringsum und
   * die Reichweite von Türmen als gepunkteter Kreis.
   * @param {import('../ui/ui.js').UICanvas} ui
   */
  drawOverlay(ui) {
    const pl = this.placement;
    const sel = this.selected();
    const hov = !pl && this.hovered && this.hovered !== sel ? this.hovered : null;
    if (!pl && !sel && !hov) return;
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
    const ring = (cx, cz, radius, color) => {
      // Die Kamera dreht nie: der Kreis am Boden ist auf dem Bild eine Ellipse.
      // Ein durchgehender dunkler Rand mit hellen, langsam umlaufenden Strichen
      // darauf – so hebt er sich von Blumen und Gras ab.
      const o = g.worldToUi(cx, 0, cz);
      const rx = g.worldToUi(cx + radius, 0, cz).x - o.x;
      const ry = g.worldToUi(cx, 0, cz + radius).y - o.y;
      const steps = Math.max(48, Math.round(Math.PI * (Math.abs(rx) + Math.abs(ry)) * 1.2));
      const march = Math.floor(g.clock * 6);
      for (let pass = 0; pass < 2; pass++) {
        for (let k = 0; k < steps; k++) {
          const a = (k / steps) * Math.PI * 2;
          const x = Math.round(o.x + Math.cos(a) * rx);
          const y = Math.round(o.y + Math.sin(a) * ry);
          if (pass === 0) ui.rect(x - 1, y - 1, 4, 4, COLORS.outline);
          else if ((Math.floor(k / 4) + march) % 3 !== 0) ui.rect(x, y, 2, 2, color);
        }
      }
    };
    if (pl && this.showsHordePaths(pl.type)) this.drawHordePaths(ui);
    if (pl) {
      const { w, d } = footprint(pl.type, pl.turns);
      const grid = this.world.grid;
      const cx = pl.i + w / 2;
      const cz = pl.j + d / 2;
      // Barrikaden nur auf Wegfeldern, alles andere nur daneben
      const onPath = Boolean(BUILDINGS[pl.type].onPath);
      for (let j = Math.floor(cz) - 4; j <= Math.floor(cz) + 4; j++) {
        for (let i = Math.floor(cx) - 4; i <= Math.floor(cx) + 4; i++) {
          if (Math.hypot(i + 0.5 - cx, j + 0.5 - cz) > 3.6) continue;
          if (i >= pl.i && i < pl.i + w && j >= pl.j && j < pl.j + d) continue;
          const r = box(i, j, 1, 1);
          if (!grid.isFree(i, j) || grid.isPath(i, j) !== onPath) {
            // belegt: kleiner roter Punkt in der Mitte (so sieht man, warum es rot wird)
            if (grid.index(i, j) >= 0 && grid.inside[grid.index(i, j)]) ui.rect(r.x + r.w / 2 - 1, r.y + r.h / 2, 2, 1, COLORS.buildBad);
            continue;
          }
          for (const [x, y] of [[r.x, r.y], [r.x + r.w - 2, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 2, r.y + r.h - 1]]) ui.rect(x, y, 2, 1, COLORS.textWarm);
        }
      }
      if (BUILDINGS[pl.type].tower) ring(cx, cz, towerStats(pl.type, 1, null).range, COLORS.gold);
      const r = box(pl.i, pl.j, w, d);
      thick(r, pl.ok ? COLORS.buildOk : COLORS.buildBad);
      // Warum rot? Gleich am Geist sagen, nicht erst nach dem Klick (m3-r2)
      const why = !pl.ok && ((pl.reason === 'belegt' && pl.why && T.bauleiste.grundBelegt[pl.why]) || T.bauleiste.grund[pl.reason]);
      if (why) {
        const tw = measure(why) + 8;
        const tx = Math.round(r.x + r.w / 2 - tw / 2);
        const ty = r.y + r.h + 5;
        ui.rect(tx - 1, ty - 1, tw + 2, LINE_HEIGHT + 5, COLORS.outline);
        ui.rect(tx, ty, tw, LINE_HEIGHT + 3, COLORS.fill);
        ui.text(why, tx + 4, ty + 1, COLORS.buildBad);
      }
    }
    if (sel) {
      const b = this.world.buildings.bounds(sel);
      if (BUILDINGS[sel.type].tower) ring(b.x, b.z, towerStats(sel.type, sel.level, sel.spec).range, COLORS.gold);
      thick(box(b.i, b.j, b.w, b.d), COLORS.gold);
    }
    if (hov) {
      // Was träfe ein Klick? Dünner Rahmen um den Bau unter der Maus.
      const b = this.world.buildings.bounds(hov);
      const r = box(b.i, b.j, b.w, b.d);
      ui.frame(r.x, r.y, r.w, r.h, COLORS.textWarm);
    }
  }

  /**
   * Wegvorschau beim Turm- und Barrikadenbau: Punkte laufen die Wege der
   * Horde entlang, vom Waldrand bis an die Hauswand (DESIGN.md 6.11).
   */
  drawHordePaths(ui) {
    const g = this.game;
    const pathing = this.world.pathing;
    const step = 0.45;
    const shift = (g.clock * 1.2) % step;
    for (const name of Object.keys(pathing.entries)) {
      const points = pathing.trace(name);
      let carry = shift;
      for (let k = 1; k < points.length; k++) {
        const a = points[k - 1];
        const b = points[k];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        let s = carry;
        for (; s < len; s += step) {
          const p = g.worldToUi(a.x + ((b.x - a.x) * s) / len, 0, a.z + ((b.z - a.z) * s) / len);
          const x = Math.round(p.x);
          const y = Math.round(p.y);
          ui.rect(x - 2, y - 2, 5, 5, COLORS.outline);
          ui.rect(x - 1, y - 1, 3, 3, COLORS.hordePath);
        }
        carry = s - len;
      }
    }
    // Wo kommt die Horde am Haus an (Kreuz), wo laufen Wege aus dem Bild
    // (Pfeil am Rand)? m3-r2: Die Wege zur Rückwand übersah man leicht.
    const safe = { x0: 14, x1: ui.width - 14, y0: 86, y1: ui.height - 60 };
    const inView = (p) => p.x >= safe.x0 && p.x < safe.x1 && p.y >= safe.y0 && p.y < safe.y1;
    const seen = new Set();
    for (const name of Object.keys(pathing.entries)) {
      const points = pathing.trace(name);
      const last = points[points.length - 1];
      const end = g.worldToUi(last.x, 0, last.z);
      const key = `${Math.round(end.x / 8)},${Math.round(end.y / 8)}`;
      if (!seen.has(key)) {
        seen.add(key);
        this.drawCross(ui, Math.round(end.x), Math.round(end.y));
      }
      // Vom Haus aus rückwärts: Wo verlässt der Weg das Bild?
      let prev = inView(end) ? end : null;
      for (let k = points.length - 2; k >= 0 && prev; k--) {
        const p = g.worldToUi(points[k].x, 0, points[k].z);
        if (!inView(p)) {
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const len = Math.hypot(dx, dy) || 1;
          const ax = Math.round(prev.x);
          const ay = Math.round(prev.y);
          g.hud.drawArrow(ui, ax, ay, dx / len, dy / len, 7, COLORS.outline);
          g.hud.drawArrow(ui, ax, ay, dx / len, dy / len, 5, COLORS.hordePath);
          break;
        }
        prev = p;
      }
    }
  }

  /** Rotes Kreuz mit dunklem Rand: Hier greift die Horde das Zuhause an. */
  drawCross(ui, x, y) {
    for (const color of [COLORS.outline, COLORS.hordePath]) {
      const w = color === COLORS.outline ? 4 : 2;
      const o = color === COLORS.outline ? -1 : 0;
      for (let d = -3; d <= 3; d++) {
        ui.rect(x + d + o, y + d + o, w, w, color);
        ui.rect(x + d + o, y - d + o, w, w, color);
      }
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
      // Mehr Standfestigkeit: der Zugewinn kommt obendrauf
      state.world.homeHp += next.hp - HOUSE_LEVELS[level - 1].hp;
      this.world.setHouseLevel(level);
      this.game.pushPlayerOut();
    }, () => {
      this.game.hud.toast(T.meldungen.hausFertig, 'huette', 4);
      this.game.sound.play('stufe');
      this.game.startDialog('hausFertig');
      this.game.quietSave();
    });
  }
}

/** Kosten mit Faktor (abgerundet), z. B. 70 % Rückgabe. */
function scale(cost, factor) {
  const out = {};
  for (const [res, n] of Object.entries(cost)) {
    const v = Math.floor(n * factor);
    if (v > 0) out[res] = v;
  }
  return out;
}
