// Mikas Fähigkeiten im Spiel (M16, Werte in data/skills.js): Rechtsklick nutzt
// Platz 1, X Platz 2. Danach wartet die Fähigkeit ihre Abklingzeit ab. Was
// kein Ziel findet (keine Barrikade in Reichweite, kein Turm in der Nähe),
// kostet nichts. Auf Stufe 3, 6 und 9 kommt – zusätzlich zum Perk – eine
// Fähigkeiten-Wahl: erst eine zweite Fähigkeit lernen, dann schärfen.

import * as THREE from 'three';
import { T } from '../data/texts.js';
import { SKILLS, SKILL_IDS, SKILL_MAX_RANK, SKILL_LEVELS, FLASH_TIME, skillRank, skillChoicesDue, skillChoicesTaken } from '../data/skills.js';
import { BUILDINGS, maxHpOf } from '../data/buildings.js';

/** Pfiff: so oft sieht Knopf nach, wer neu in seine Nähe kommt (Sekunden). */
const LURE_TICK = 0.25;
/** Notbrett: So weit darf der Zeiger neben der Barrikade liegen. */
const POINTER_SLACK = 1.2;

export class Skills {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.cool = [0, 0]; // verbleibende Abklingzeit je Platz (wird nicht gespeichert)
    this.readyFlash = [0, 0]; // leuchtet kurz auf, wenn die Fähigkeit wieder bereit ist
    this.denied = [0, 0]; // wackelt kurz, wenn sie noch wartet
    this.used = {}; // wie oft jede Fähigkeit genutzt wurde (Prüfung)
    this.lure = null; // laufender Pfiff { x, z, t, tick }
    this._ground = new THREE.Vector3();
  }

  get state() {
    return this.game.state.skills;
  }

  slot(k) {
    return this.state.slots[k] || null;
  }

  rankOf(id) {
    return this.state.ranks[id] || 1;
  }

  cooldownOf(id) {
    return SKILLS[id].cooldown * skillRank(this.rankOf(id)).cooldown;
  }

  powerOf(id) {
    return skillRank(this.rankOf(id)).power;
  }

  /** Abklingzeit als Anteil: 1 = gerade benutzt, 0 = bereit. */
  coolFraction(k) {
    const id = this.slot(k);
    return id && this.cool[k] > 0 ? Math.min(1, this.cool[k] / this.cooldownOf(id)) : 0;
  }

  /** Nach dem Laden: alles bereit. */
  reset() {
    this.cool = [0, 0];
    this.readyFlash = [0, 0];
    this.denied = [0, 0];
    this.lure = null;
  }

  /** Pro Spielschritt (nur wenn die Zeit läuft). */
  update(dt) {
    for (let k = 0; k < 2; k++) {
      if (this.cool[k] > 0) {
        this.cool[k] = Math.max(0, this.cool[k] - dt);
        if (this.cool[k] === 0) this.readyFlash[k] = 0.6;
      }
      this.readyFlash[k] = Math.max(0, this.readyFlash[k] - dt);
      this.denied[k] = Math.max(0, this.denied[k] - dt);
    }
    // Pfiff: Wer während des Bellens in Knopfs Nähe kommt, bleibt auch stehen
    const lure = this.lure;
    if (lure) {
      lure.t -= dt;
      lure.tick -= dt;
      if (lure.t <= 0) this.lure = null;
      else if (lure.tick <= 0) {
        lure.tick = LURE_TICK;
        const g = this.game;
        for (const z of g.horde.inRange(lure.x, lure.z, lure.r)) g.horde.lure(z, lure.x, lure.z, lure.t);
      }
    }
  }

  /**
   * Fähigkeit auf Platz k nutzen.
   * @returns {boolean} ob sie ausgelöst wurde
   */
  use(k) {
    const g = this.game;
    const id = this.slot(k);
    if (!id) {
      // m16-r1: Auf Stufe 3 mit wartender Wahl hieß es »kommt auf Stufe 3«
      g.hud.toast(g.state.skillChoice ? T.faehigkeiten.leerWartet : T.faehigkeiten.leer, null, 2.6);
      return false;
    }
    if (this.cool[k] > 0) {
      this.denied[k] = 0.3;
      g.sound.play('tipp', { pitch: 260 });
      return false;
    }
    if (g.world.playerInside) {
      g.hud.toast(T.faehigkeiten.drinnen, null, 2.4);
      return false;
    }
    if (!this.freeHands()) return false;
    const S = SKILLS[id];
    const power = this.powerOf(id);
    let ok = false;
    switch (id) {
      case 'laternenblitz':
        ok = this.laternenblitz(S, power);
        break;
      case 'kuerbiswurf':
        ok = this.kuerbiswurf(S, power);
        break;
      case 'pfiff':
        ok = this.pfiff(S, power);
        break;
      case 'notbrett':
        ok = this.notbrett(S, power);
        break;
      case 'anfeuern':
        ok = this.anfeuern(S, power);
        break;
      case 'wirbel':
        ok = g.combat.spin(S, power);
        break;
      default:
        break;
    }
    if (!ok) return false;
    this.cool[k] = this.cooldownOf(id);
    this.used[id] = (this.used[id] || 0) + 1;
    return true;
  }

  /**
   * Hände frei machen: Ein Schlag und Durchsuchen brechen ab; mitten in einer
   * Rolle oder einer anderen Fähigkeit geht nichts.
   */
  freeHands() {
    const p = this.game.player;
    const a = p.action;
    if (!a) return true;
    // Ein Schlag weicht der Fähigkeit – auch vor dem Treffer (sie geht vor)
    if (a.kind === 'swing') {
      p.action = null;
      return true;
    }
    if (a.cancelable) {
      p.action = null;
      if (a.onCancel) a.onCancel();
      return true;
    }
    return false;
  }

  /** Zielpunkt am Boden: der Mauszeiger, sonst vor Mika – höchstens `range` weit. */
  aim(range, fallback) {
    const g = this.game;
    const p = g.player.position;
    const ground = g.input.mouse.inside ? g.pointerGround(this._ground) : null;
    let x = ground ? ground.x : p.x + Math.sin(g.player.facing) * fallback;
    let z = ground ? ground.z : p.z + Math.cos(g.player.facing) * fallback;
    const dx = x - p.x;
    const dz = z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > range) {
      x = p.x + (dx / d) * range;
      z = p.z + (dz / d) * range;
    }
    return { x, z, d: Math.min(d, range) };
  }

  // --- Die Fähigkeiten ---------------------------------------------------------

  /** Die Laterne flammt grell auf: ringsum gelähmt, danach langsam. */
  laternenblitz(S, power) {
    const g = this.game;
    const p = g.player;
    return p.startAction('blitz', {
      duration: 0.5,
      hitAt: 0.14,
      onHit: () => {
        const x = p.position.x;
        const z = p.position.z;
        p.flashT = FLASH_TIME;
        g.hud.ring(x, z, S.radius, 'licht');
        g.effects.splat(x, 1.3, z, 'licht', 20, 1.4);
        g.sound.play('blitz');
        g.rig.shake = Math.max(g.rig.shake || 0, 0.08);
        for (const zo of g.horde.inRange(x, z, S.radius)) {
          g.horde.stun(zo, S.stun * power);
          g.horde.slow(zo, S.slow, S.slowTime * power);
          g.horde.status(zo, 'geblendet', S.slowTime * power); // M18: geblendet – Bolzen treffen die Schwachstelle
          zo.flash = 0.25;
        }
      },
    });
  }

  /** Ein Kürbis an den Zeiger: platzt und setzt die Stelle in Brand. */
  kuerbiswurf(S, power) {
    const g = this.game;
    const p = g.player;
    const t = this.aim(S.range, 4.5);
    return p.startAction('wurf', {
      duration: 0.4,
      hitAt: 0.16,
      face: t,
      onHit: () => {
        const hx = p.position.x + Math.sin(p.facing) * 0.25;
        const hz = p.position.z + Math.cos(p.facing) * 0.25;
        g.towers.throwPumpkin({ x0: hx, y0: 1.4, z0: hz, x1: t.x, z1: t.z, damage: S.damage * power, splash: S.radius, burn: S.burn * power, burnTime: S.burnTime * power, source: 'wurf' });
        g.sound.play('katapult', { x: hx, z: hz, volume: 0.7 });
      },
    });
  }

  /** Knopf rennt zum Zeiger und bellt: Wer dort steht, starrt ihn an. */
  pfiff(S, power) {
    const g = this.game;
    const p = g.player;
    if (!g.survivors.resident('knopf')) {
      g.hud.toast(T.faehigkeiten.keinKnopf, 'pfote', 2.4);
      return false;
    }
    const t = this.aim(S.range, 5);
    return p.startAction('pfiff', {
      duration: 0.6,
      hitAt: 0.22,
      face: t,
      onHit: () => {
        const time = S.lure * power;
        g.sound.play('pfiff');
        g.survivors.whistle(t.x, t.z, time);
        g.hud.ring(t.x, t.z, S.radius, 'pfiff');
        this.lure = { x: t.x, z: t.z, r: S.radius, t: time, tick: 0 };
      },
    });
  }

  /** Barrikade am Zeiger (oder die schwächste in Reichweite), die ein Brett brauchen kann. */
  barricadeTarget(reach) {
    const g = this.game;
    const p = g.player.position;
    const ground = g.input.mouse.inside ? g.pointerGround(this._ground) : null;
    let best = null;
    let bestScore = Infinity;
    for (const b of g.world.buildings.list) {
      if (!BUILDINGS[b.type].onPath || b.broken || b.hp === undefined || b.hp >= maxHpOf(b)) continue;
      const c = g.world.buildings.bounds(b);
      if (Math.hypot(c.x - p.x, c.z - p.z) > reach) continue;
      // Am Zeiger zählt der Abstand zum Zeiger, sonst die fehlende Haltbarkeit
      const toPointer = ground ? Math.hypot(c.x - ground.x, c.z - ground.z) : Infinity;
      const score = toPointer <= POINTER_SLACK ? toPointer - 10 : b.hp / maxHpOf(b);
      if (score < bestScore) {
        bestScore = score;
        best = b;
      }
    }
    return best;
  }

  /** Ein Brett auf die Barrikade – mitten in der Welle. */
  notbrett(S, power) {
    const g = this.game;
    const p = g.player;
    const b = this.barricadeTarget(S.reach);
    if (!b) {
      g.hud.toast(T.faehigkeiten.keineBarrikade, 'barrikade', 2.4);
      return false;
    }
    const c = g.world.buildings.bounds(b);
    return p.startAction('search', {
      duration: 0.5,
      hitAt: 0.3,
      cancelable: false,
      face: c,
      onHit: () => {
        if (b.broken) return; // in der halben Sekunde zerbrochen: das Brett kommt zu spät
        const max = maxHpOf(b);
        const before = b.hp;
        b.hp = Math.min(max, b.hp + max * S.heal * power);
        g.world.buildings.refreshLook(b);
        g.effects.chips(c.x, 0.7, c.z, 'holz', 9);
        g.sound.play('bau', { x: c.x, z: c.z });
        g.hud.healNumber(c.x, 1.2, c.z, Math.round(b.hp - before));
      },
    });
  }

  /** Türme rings um Mika schießen eine Weile schneller. */
  anfeuern(S, power) {
    const g = this.game;
    const p = g.player;
    const x = p.position.x;
    const z = p.position.z;
    const towers = g.world.buildings.towers.filter((t) => t.hp > 0 && t.type !== 'laternenturm' && Math.hypot(t.i + 0.5 - x, t.j + 0.5 - z) <= S.radius);
    if (!towers.length) {
      g.hud.toast(T.faehigkeiten.keinTurm, 'bolzen', 2.4);
      return false;
    }
    return p.startAction('jubel', {
      duration: 0.7,
      hitAt: 0.16,
      onHit: () => {
        for (const t of towers) {
          t.hasteT = S.time * power;
          t.haste = S.haste;
        }
        g.sound.play('jubel');
        g.hud.ring(x, z, S.radius, 'jubel');
        p.express('froh', 1.6);
      },
    });
  }

  // --- Wahl auf Stufe 3, 6, 9 ---------------------------------------------------------

  /** Steht die Fähigkeit schon zur Wahl? (Pfiff erst, wenn Knopf da ist.) */
  available(id) {
    const need = SKILLS[id].needs;
    return !need || this.game.survivors.resident(need);
  }

  /** Fällige Fähigkeiten-Wahl bereitlegen (das Spiel zeigt sie im Modus »perk«). */
  offer() {
    const st = this.game.state;
    if (st.skillChoice) return;
    if (skillChoicesDue(st.player.level) - skillChoicesTaken(st.skills) <= 0) return;
    const rng = this.game.world.particles.rng;
    if (!st.skills.slots[1]) {
      const open = SKILL_IDS.filter((id) => !st.skills.slots.includes(id) && this.available(id));
      const options = [];
      while (options.length < 3 && open.length) options.push(open.splice(Math.floor(rng.next() * open.length), 1)[0]);
      if (options.length) st.skillChoice = { mode: 'lernen', options };
    } else {
      const options = st.skills.slots.filter((id) => id && this.rankOf(id) < SKILL_MAX_RANK);
      if (options.length) st.skillChoice = { mode: 'schaerfen', options };
    }
  }

  /** Zu welcher Stufe die offene Fähigkeiten-Wahl gehört (3, 6 oder 9). */
  get choiceLevel() {
    return SKILL_LEVELS[skillChoicesTaken(this.state)] ?? this.game.state.player.level;
  }

  /** Karte gewählt: lernen (Platz 2) oder schärfen. */
  choose(id) {
    const st = this.game.state;
    const c = st.skillChoice;
    if (!c || !c.options.includes(id)) return false;
    if (c.mode === 'lernen') {
      st.skills.slots[1] = id;
      st.skills.ranks[id] = 1;
      this.cool[1] = 0;
    } else {
      st.skills.ranks[id] = Math.min(SKILL_MAX_RANK, this.rankOf(id) + 1);
    }
    st.skillChoice = null;
    this.offer();
    return true;
  }

  /** Für die Anzeige und die Prüfung. */
  view() {
    return this.state.slots.map((id, k) => (id ? { id, name: T.faehigkeiten[id][0], rang: this.rankOf(id), wartet: +this.cool[k].toFixed(1) } : null));
  }
}
