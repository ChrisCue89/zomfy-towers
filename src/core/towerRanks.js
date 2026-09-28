// Türme mit Geschichte (M16, DESIGN.md 8): Türme sammeln Erfahrung aus Schaden
// und Abschüssen, steigen in vier Ränge auf (Wimpel am Mast, etwas mehr
// Wirkung), tragen einen Namen (»Gertrud, Kürbiskatapult«) und führen eine
// Strichliste. Der Morgenbericht kürt den Turm der Nacht.

import { T } from '../data/texts.js';
import { BUILDINGS } from '../data/buildings.js';
import { towerRank, towerStatsOf, TOWER_RANKS, TOWER_KILL_XP, TOWER_LIGHT_XP, TOWER_DAMAGE_XP, RANK_NAMES } from '../data/towers.js';

export class TowerRanks {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
  }

  get buildings() {
    return this.game.world.buildings;
  }

  tower(id) {
    if (id === null || id === undefined) return null;
    const b = this.buildings.get(id);
    return b && BUILDINGS[b.type].tower ? b : null;
  }

  /** Name des Turms; beim ersten Mal bekommt er einen freien aus T.turmnamen. */
  nameOf(b) {
    if (!Number.isInteger(b.name)) this.assignName(b);
    return T.turmnamen[b.name % T.turmnamen.length];
  }

  assignName(b) {
    const count = T.turmnamen.length;
    const used = new Set(this.buildings.towers.filter((t) => Number.isInteger(t.name)).map((t) => t.name % count));
    const start = (b.id * 7 + (this.game.state.world.mapSeed || 0)) % count;
    b.name = start;
    for (let k = 0; k < count; k++) {
      const n = (start + k) % count;
      if (!used.has(n)) {
        b.name = n;
        return;
      }
    }
  }

  /** »Gertrud, Kürbiskatapult« */
  title(b) {
    return T.turmrang.titel(this.nameOf(b), T.bauten[b.type]);
  }

  /** Schaden eines Turms: Erfahrung je Schadenspunkt (m16-r1: ein Repetierer war sonst nach einer Nacht ausgereizt). */
  onDamage(by, amount) {
    const b = this.tower(by);
    if (b) this.gain(b, amount * TOWER_DAMAGE_XP);
  }

  /** Abschuss: Strichliste, Zähler der Nacht, Erfahrung; Laternentürme im Licht verdienen mit. */
  onKill(by, z) {
    const b = this.tower(by);
    if (b) {
      b.kills = (b.kills || 0) + 1;
      if (this.game.nights.active) {
        const night = this.game.state.night;
        night.towers = night.towers || {};
        night.towers[b.id] = (night.towers[b.id] || 0) + 1;
      }
      this.gain(b, TOWER_KILL_XP);
    }
    for (const L of this.buildings.towers) {
      if (L.type !== 'laternenturm' || L.hp <= 0) continue;
      const r = towerStatsOf(L).range;
      if ((z.x - L.i - 0.5) ** 2 + (z.z - L.j - 0.5) ** 2 <= r * r) this.gain(L, TOWER_LIGHT_XP);
    }
  }

  gain(b, xp) {
    const before = towerRank(b.xp);
    b.xp = (b.xp || 0) + xp;
    const after = towerRank(b.xp);
    if (after > before) this.rankUp(b, after);
  }

  rankUp(b, rank) {
    const g = this.game;
    this.buildings.attachObject(b); // ein Wimpel mehr
    const c = this.buildings.bounds(b);
    g.effects.splat(c.x, 1.7, c.z, 'licht', 18, 1.1);
    g.sound.play('aufwertung', { x: c.x, z: c.z });
    g.hud.toast(T.turmrang.aufgestiegen(this.title(b), RANK_NAMES[rank - 1]), BUILDINGS[b.type].icon, 3.4);
  }

  /** Zeile im Auswahlfenster: Rang, Abschüsse, Erfahrung bis zum nächsten Rang. */
  record(b) {
    const rank = towerRank(b.xp);
    const next = TOWER_RANKS[rank]?.xp ?? null;
    return T.turmrang.zeile(RANK_NAMES[rank - 1], b.kills || 0, Math.floor(b.xp || 0), next);
  }

  /** Turm der Nacht (meiste Abschüsse) für den Morgenbericht, sonst null. */
  bestOfNight() {
    const counts = this.game.state.night.towers || {};
    let best = null;
    for (const [id, n] of Object.entries(counts)) {
      const b = this.tower(Number(id));
      if (!b || n <= 0) continue;
      if (!best || n > best.kills) best = { id: b.id, name: this.nameOf(b), art: T.bauten[b.type], kills: n, rang: RANK_NAMES[towerRank(b.xp) - 1] };
    }
    return best;
  }

  /** Der Turm der Nacht bekommt einen Strich mehr (Turmalbum, M25). */
  crown(id) {
    const b = this.tower(id);
    if (b) b.best = (b.best || 0) + 1;
  }

  /** Für die Prüfung. */
  view() {
    return this.buildings.towers.map((b) => ({ id: b.id, type: b.type, name: this.nameOf(b), xp: Math.round(b.xp || 0), kills: b.kills || 0, rang: towerRank(b.xp), wimpel: b.object?.getObjectByName('wimpel') ? b.object.getObjectByName('wimpel').children.length - 1 : 0 }));
  }
}
