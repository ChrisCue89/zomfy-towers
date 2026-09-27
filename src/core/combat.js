// Nahkampf der Figur (DESIGN.md 6.13) und ihre Lebenspunkte. Linksklick
// schlägt in Richtung des Mauszeigers (ohne Maus: in Blickrichtung) mit dem,
// was Mika in der Hand hat: Waffe, Axt, Spitzhacke – sonst mit den Fäusten.
// Leertaste: Ausweichrolle (kurz unverwundbar). Treffer blitzen weiß auf,
// stoßen zurück, betäuben (Bratpfanne) und halten das Spiel ein, zwei Bilder
// lang an (Trefferstopp). Besiegte Schlurfer geben Erfahrung, jede Stufe
// eine Perk-Wahl (data/perks.js).

import { T } from '../data/texts.js';
import { upgradeValue } from '../data/upgrades.js';
import { WEAPONS, weaponStats } from '../data/weapons.js';
import { perkValue, xpForLevel, rollPerkChoice, PERKS, PERK_IDS, perkLevel } from '../data/perks.js';
import { BUILDINGS, SOUP, maxHpOf } from '../data/buildings.js';
import { FLINCH } from '../entities/player.js';

const REGEN_RATE = 4;
const ROLL = { duration: 0.3, speed: 7, cooldown: 0.75, invulnerable: 0.34 };
const COMBO_WINDOW = 0.8;
const TOWER_NEAR = 3.5;
const LUNGE = 1.1; // so weit geht Mika beim Ausholen auf einen Schlurfer zu (m3-r2)

export class Combat {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.sinceHurt = 99;
    this.invulnerable = 0;
    this.hurtFlash = 0;
    this.rollCooldown = 0;
    this.combo = 0;
    this.sinceHit = 99;
    this.counterReady = false; // Perk »Konter«: nach dem Ausweichen trifft der nächste Schlag härter
    this.warned = false;
  }

  get maxHp() {
    const st = this.game.state;
    const soup = st.player.soup === st.time.day ? SOUP.maxHp : 0; // Suppe aus der Küche (M11)
    return upgradeValue(st, 'leben') + (this.game.survivors?.maxHpBonus() || 0) + soup; // Hildes Schal
  }

  get hp() {
    return this.game.state.player.hp;
  }

  /** Womit Mika gerade zuschlägt (Name aus weapons.js). */
  get weaponId() {
    const g = this.game;
    const held = g.player.heldTool;
    return held && weaponStats(held, g.state) ? held : 'faeuste';
  }

  update(dt) {
    const g = this.game;
    const st = g.state;
    this.sinceHurt += dt;
    this.sinceHit += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.rollCooldown = Math.max(0, this.rollCooldown - dt);
    const max = this.maxHp;
    if (st.player.hp > max) st.player.hp = max;
    if (this.sinceHurt > perkValue(st, 'zweiterAtem') && st.player.hp < max) st.player.hp = Math.min(max, st.player.hp + REGEN_RATE * g.survivors.regenFactor() * dt);
    // Perk »Flickschusterin«: Bauten in der Nähe flicken sich
    const fix = perkValue(st, 'flicker');
    if (fix > 0) {
      const p = g.player.position;
      for (const b of g.world.buildings.list) {
        if (b.hp === undefined || b.broken) continue; // Trümmer flickt man nicht, man baut sie neu
        const max = maxHpOf(b);
        if (b.hp >= max) continue;
        const c = g.world.buildings.bounds(b);
        if (Math.hypot(c.x - p.x, c.z - p.z) < 2.5) {
          b.hp = Math.min(max, b.hp + fix * dt);
          g.world.buildings.refreshLook(b);
        }
      }
    }
  }

  /** Erreicht ein Klick diesen Schlurfer (Reichweite plus Ausfallschritt)? Für die Zielmarke. */
  canReach(z) {
    const w = weaponStats(this.weaponId, this.game.state) || WEAPONS.faeuste;
    const p = this.game.player.position;
    return Math.hypot(z.x - p.x, z.z - p.z) <= w.reach + z.def.radius - 0.2 + LUNGE;
  }

  /** Schlag in Richtung (dx, dz) mit dem, was Mika in der Hand hat. */
  attack(dx, dz) {
    const g = this.game;
    const p = g.player;
    const id = this.weaponId;
    const w = weaponStats(id, g.state) || WEAPONS.faeuste;
    const len = Math.hypot(dx, dz);
    const face = len > 0.01 ? { x: p.position.x + dx / len, z: p.position.z + dz / len } : null;
    const duration = 1 / (w.rate * perkValue(g.state, 'flink'));
    const hitAt = duration * 0.38;
    const lunge = len > 0.01 ? this.lunge(dx / len, dz / len, w, hitAt) : null;
    const started = p.startAction('swing', {
      duration,
      hitAt,
      tool: id === 'faeuste' ? null : id,
      face,
      dir: lunge?.dir,
      speed: lunge?.speed,
      onHit: () => this.hit(id, w),
      freeAfterHit: true,
    });
    if (started) g.sound.play('schwung');
    return started;
  }

  /**
   * Ausfallschritt: Steht in Schlagrichtung kein Schlurfer in Reichweite, aber
   * einer knapp dahinter, geht Mika beim Ausholen auf ihn zu – so sitzt der
   * Schlag auch, wenn man ein Stück zu weit weg geklickt hat (m3-r2).
   */
  lunge(nx, nz, w, hitAt) {
    const p = this.game.player.position;
    const arc = Math.cos((w.arc * Math.PI) / 180);
    let best = null;
    for (const z of this.game.horde.list) {
      if (z.state === 'dying') continue;
      const dx = z.x - p.x;
      const dz = z.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.3 && (dx * nx + dz * nz) / d < arc) continue;
      const reach = w.reach + z.def.radius - 0.2; // etwas Luft, damit der Schlag sicher sitzt
      if (d <= reach) return null; // es trifft ohnehin
      if (d > reach + LUNGE) continue;
      if (!best || d - reach < best.gap) best = { gap: d - reach, x: dx / d, z: dz / d };
    }
    return best ? { dir: { x: best.x, z: best.z }, speed: best.gap / hitAt } : null;
  }

  hit(id, w) {
    const g = this.game;
    const st = g.state;
    const p = g.player.position;
    const fx = Math.sin(g.player.facing);
    const fz = Math.cos(g.player.facing);
    const arc = Math.cos((w.arc * Math.PI) / 180);
    g.hud.swoosh(p.x, p.z, g.player.facing, w.reach * 0.8, ((w.arc * Math.PI) / 180) * 0.85);
    const found = [];
    for (const z of g.horde.list) {
      // Auch Schlurfer, die noch aus dem Wald kommen: was Mika erreicht, trifft sie (m3-r2)
      if (z.state === 'dying') continue;
      const dx = z.x - p.x;
      const dz = z.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > w.reach + z.def.radius) continue;
      if (d > 0.3 && (dx * fx + dz * fz) / d < arc) continue;
      found.push({ z, d });
    }
    if (!found.length) {
      this.combo = 0;
      return;
    }
    found.sort((a, b) => a.d - b.d);
    // Schnelle Folge: jeder n-te Treffer (Fäustlinge) trifft doppelt
    this.combo = this.sinceHit <= COMBO_WINDOW ? this.combo + 1 : 1;
    this.sinceHit = 0;
    let factor = upgradeValue(st, 'schlag');
    const comboHit = Boolean(w.combo && this.combo % w.combo === 0);
    if (comboHit) factor *= 2;
    if (this.counterReady) {
      factor *= perkValue(st, 'konter');
      this.counterReady = false;
    }
    if (g.world.buildings.towers.some((t) => {
      const c = g.world.buildings.bounds(t);
      return Math.hypot(c.x - p.x, c.z - p.z) < TOWER_NEAR;
    })) factor *= perkValue(st, 'turmfreund');
    const targets = found.slice(0, w.targets);
    for (const { z } of targets) {
      g.sound.play('treffer', { x: z.x, z: z.z });
      const killed = g.horde.damage(z, w.damage * factor, { push: w.push * (comboHit ? 1.6 : 1), fromX: p.x, fromZ: p.z, source: 'spieler' });
      if (w.stun && !killed) g.horde.stun(z, w.stun);
      g.effects.splat(z.x, 0.8, z.z, 'moos', comboHit ? 12 : 6, comboHit ? 1.1 : 0.7);
    }
    const heal = perkValue(st, 'lebensraub') * targets.length;
    if (heal > 0) st.player.hp = Math.min(this.maxHp, st.player.hp + heal);
    g.hitstop = comboHit || w.stun ? 0.08 : 0.05;
    g.rig.shake = comboHit || w.stun ? 0.18 : 0.12;
  }

  /** Kann Mika gerade ausweichen? */
  get canRoll() {
    const p = this.game.player;
    return this.rollCooldown <= 0 && (!p.action || p.action.kind === 'swing');
  }

  /** Ausweichrolle in Richtung (dx, dz) – ohne Richtung in Blickrichtung. */
  roll(dx, dz) {
    const g = this.game;
    const p = g.player;
    if (!this.canRoll) return false;
    let len = Math.hypot(dx, dz);
    if (len < 0.1) {
      dx = Math.sin(p.facing);
      dz = Math.cos(p.facing);
      len = 1;
    }
    p.action = null; // eine Rolle bricht einen Schwung ab
    p.startAction('roll', { duration: ROLL.duration, dir: { x: dx / len, z: dz / len }, speed: ROLL.speed });
    g.sound.play('rolle');
    this.rollCooldown = ROLL.cooldown;
    this.invulnerable = Math.max(this.invulnerable, ROLL.invulnerable);
    if (perkValue(g.state, 'konter') > 1) this.counterReady = true;
    g.effects.dust(p.position.x, p.position.z, 0.5, 8);
    return true;
  }

  /** Mika wird getroffen. */
  hurt(amount, from) {
    const g = this.game;
    if (this.invulnerable > 0 || g.mode !== 'play') return;
    const st = g.state;
    amount *= perkValue(st, 'dickesFell');
    st.player.hp = Math.max(0, st.player.hp - amount);
    g.sound.play('autsch');
    this.sinceHurt = 0;
    this.invulnerable = 0.35;
    this.hurtFlash = 0.25;
    g.player.flinch = FLINCH;
    g.rig.shake = 0.15;
    g.hud.damageNumber(g.player.position.x, 1.9, g.player.position.z, Math.round(amount), true);
    // Rückstoß weg vom Angreifer
    if (from) {
      const p = g.player.position;
      const dx = p.x - from.x;
      const dz = p.z - from.z;
      const d = Math.hypot(dx, dz) || 1;
      g.world.colliders.move(p, (dx / d) * 0.35, (dz / d) * 0.35, 0.3);
      g.player.syncObject();
    }
    if (st.player.hp <= 0) g.knockedOut();
    else if (st.player.hp < this.maxHp * 0.3 && !this.warned) {
      this.warned = true;
      g.hud.toast(T.horde.wenigLeben, 'herz', 3);
    }
    if (st.player.hp >= this.maxHp * 0.5) this.warned = false;
  }

  /**
   * Erfahrung für einen besiegten Schlurfer (im Nahkampf doppelt). Beim
   * Stufenaufstieg öffnet das Spiel die Perk-Wahl.
   */
  gainXp(amount) {
    const g = this.game;
    const pl = g.state.player;
    pl.xp += amount;
    let up = false;
    while (pl.xp >= xpForLevel(pl.level)) {
      pl.xp -= xpForLevel(pl.level);
      pl.level += 1;
      up = true;
    }
    if (up) {
      g.hud.toast(T.perks.stufeAuf(pl.level), 'ziel', 2.4);
      g.sound.play('stufe');
      g.player.express('froh', 2);
    }
    this.offerPerk();
  }

  /** Noch nicht gewählte Perks (eine Wahl pro Stufe, solange es welche gibt). */
  get owedPerks() {
    const st = this.game.state;
    const taken = PERK_IDS.reduce((n, id) => n + perkLevel(st, id), 0);
    const possible = PERK_IDS.reduce((n, id) => n + PERKS[id].max, 0);
    return Math.max(0, Math.min(st.player.level - 1, possible) - taken);
  }

  /** Nächste Perk-Wahl bereitlegen (das Spiel zeigt sie im Modus »perk«). */
  offerPerk() {
    const st = this.game.state;
    if (st.perkChoice || this.owedPerks <= 0) return;
    const choice = rollPerkChoice(st, this.game.world.particles.rng);
    if (choice.length) st.perkChoice = choice;
  }

  /** Perk nehmen. */
  choosePerk(id) {
    const st = this.game.state;
    if (!st.perkChoice || !st.perkChoice.includes(id)) return false;
    st.perks[id] = (st.perks[id] || 0) + 1;
    st.perkChoice = null;
    this.offerPerk();
    return true;
  }
}
