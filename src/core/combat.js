// Nahkampf der Figur (Meilenstein 3: ein Schlag – Meilenstein 4 baut ihn aus)
// und ihre Lebenspunkte. Linksklick schlägt in Richtung des Mauszeigers
// (ohne Maus: in Blickrichtung). Treffer blitzen weiß auf, stoßen zurück und
// halten das Spiel ein, zwei Bilder lang an (Trefferstopp).

import { T } from '../data/texts.js';
import { upgradeValue } from '../data/upgrades.js';

const SWING = { duration: 0.42, hitAt: 0.16 };
const REACH = 1.55;
const ARC = Math.cos((65 * Math.PI) / 180);
const REGEN_DELAY = 5;
const REGEN_RATE = 4;

export class Combat {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.sinceHurt = 99;
    this.invulnerable = 0;
    this.hurtFlash = 0;
  }

  get maxHp() {
    return upgradeValue(this.game.state, 'leben');
  }

  get hp() {
    return this.game.state.player.hp;
  }

  update(dt) {
    const st = this.game.state;
    this.sinceHurt += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    const max = this.maxHp;
    if (st.player.hp > max) st.player.hp = max;
    if (this.sinceHurt > REGEN_DELAY && st.player.hp < max) st.player.hp = Math.min(max, st.player.hp + REGEN_RATE * dt);
  }

  /** Schlag in Richtung (dx, dz). */
  attack(dx, dz) {
    const g = this.game;
    const p = g.player;
    const len = Math.hypot(dx, dz);
    const face = len > 0.01 ? { x: p.position.x + dx / len, z: p.position.z + dz / len } : null;
    const tool = g.state.tools.axt ? 'axt' : null;
    return p.startAction('swing', {
      ...SWING,
      tool,
      face,
      onHit: () => this.hit(tool),
    });
  }

  hit(tool) {
    const g = this.game;
    const p = g.player.position;
    const fx = Math.sin(g.player.facing);
    const fz = Math.cos(g.player.facing);
    const base = (tool ? 12 : 6) * upgradeValue(g.state, 'schlag');
    let hits = 0;
    for (const z of g.horde.list) {
      if (z.state === 'dying' || z.state === 'enter') continue;
      const dx = z.x - p.x;
      const dz = z.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > REACH + z.def.radius) continue;
      if (d > 0.3 && (dx * fx + dz * fz) / d < ARC) continue;
      hits++;
      g.horde.damage(z, base, { push: 0.55, fromX: p.x, fromZ: p.z, source: 'spieler' });
      g.effects.splat(z.x, 0.8, z.z, 'moos', 6, 0.7);
    }
    if (hits) {
      g.hitstop = 0.05;
      g.rig.shake = 0.12;
    }
  }

  /** Mika wird getroffen. */
  hurt(amount, from) {
    const g = this.game;
    if (this.invulnerable > 0 || g.mode !== 'play') return;
    const st = g.state;
    st.player.hp = Math.max(0, st.player.hp - amount);
    this.sinceHurt = 0;
    this.invulnerable = 0.35;
    this.hurtFlash = 0.25;
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
}
