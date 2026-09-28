// Fallen auf den Wegen (M19, DESIGN.md 8): Jede Falle wirkt auf die Schlurfer,
// die über ihr Feld laufen – das Stachelbrett sticht, Leim klebt, Kletten
// bremsen lange, Knallerbsen knallen einmal, die Ölspur ist rutschig und brennt
// mit Feuer als Flammenwand. Fallen nutzen sich ab (Haltbarkeit); verbraucht
// (`broken`) wirken sie nicht mehr, bis Mika sie tagsüber neu richtet.
// Werte in data/traps.js.

import { BUILDINGS } from '../data/buildings.js';
import { TRAPS } from '../data/traps.js';

/** So weit (m) um die Feldmitte zählt ein Schlurfer als »auf der Falle«. */
const ON_TRAP = 0.55;

export class TrapSystem {
  /**
   * @param {{world: any, horde: any, towers: any, effects: any, sound: any, callbacks?: object}} deps
   * callbacks: onTrap(kind, b, z) – etwas ist passiert (Wort, Klang); onTrapSpent(b)
   */
  constructor({ world, horde, towers, effects, sound, callbacks = {} }) {
    this.world = world;
    this.horde = horde;
    this.towers = towers;
    this.effects = effects;
    this.sound = sound;
    this.cb = callbacks;
    this.time = 0;
    this.stats = { spikes: 0, glued: 0, burrs: 0, pops: 0, flames: 0 }; // für die Prüfung
  }

  update(dt) {
    this.time += dt;
    for (const b of this.world.buildings.list) {
      const def = BUILDINGS[b.type];
      if (!def.trap || b.broken) continue;
      const t = TRAPS[b.type];
      const cx = b.i + 0.5;
      const cz = b.j + 0.5;
      // Ölspur: Ein Feuer daneben (Feuerkürbis, Pechkessel, Flammenwand) zündet sie an
      if (b.type === 'oelspur' && this.fireNear(cx, cz)) {
        this.ignite(b, cx, cz, t);
        continue;
      }
      for (const z of this.horde.list) {
        if (z.state === 'dying' || z.state === 'enter' || z.def.flying || z.y < -0.5) continue; // M22: Flieger drüber, Gräber drunter
        if (Math.abs(z.x - cx) > ON_TRAP || Math.abs(z.z - cz) > ON_TRAP) continue;
        if (this.step(b, t, z, cx, cz, dt)) break; // verbraucht
      }
      if (!b.broken && b.hp <= 0) this.spend(b);
    }
  }

  /** Ein Schlurfer steht auf der Falle. Gibt true zurück, wenn die Falle damit verbraucht ist. */
  step(b, t, z, cx, cz, dt) {
    const h = this.horde;
    switch (b.type) {
      case 'stachelbrett':
        if ((z.spikeAt || 0) > this.time) return false;
        z.spikeAt = this.time + t.again;
        this.stats.spikes++;
        b.hp -= t.wear;
        this.effects.splat(z.x, 0.25, z.z, 'funken', 5, 0.5);
        this.sound.play('treffer', { x: z.x, z: z.z, volume: 0.6 });
        h.damage(z, t.damage, { pierce: true, source: 'turm', kind: 'falle' });
        return false;
      case 'leimtopf':
        // gezählt wird jeder neue Tritt hinein – auch wenn ihn gerade etwas anderes bremst (Kletten davor)
        if (!(z.glueT > this.time)) this.stats.glued++;
        z.glueT = this.time + t.slowTime;
        h.slow(z, t.slow, t.slowTime);
        b.hp -= t.wear * dt;
        if (Math.random() < dt * 4) this.effects.splat(z.x, 0.15, z.z, 'honig', 2, 0.3);
        return false;
      case 'klettenteppich':
        if (!(z.burrT > this.time)) this.stats.burrs++;
        z.burrT = this.time + t.slowTime;
        h.slow(z, t.slow, t.slowTime);
        b.hp -= t.wear * dt;
        if (Math.random() < dt * 3) this.effects.splat(z.x, 0.4, z.z, 'kletten', 2, 0.3);
        return false;
      case 'knallerbsen': {
        this.stats.pops++;
        for (const o of h.inRange(cx, cz, t.radius)) {
          if (o.def.flying) continue; // M22: der Moderfalter fliegt drüber
          if (h.damage(o, t.damage, { push: 0.3, fromX: cx, fromZ: cz, source: 'turm', kind: 'falle' })) continue;
          h.stun(o, t.stun);
        }
        this.effects.splat(cx, 0.4, cz, 'papier', 22, 1.4);
        this.effects.splat(cx, 0.5, cz, 'funken', 14, 1.2);
        this.sound.play('knall', { x: cx, z: cz });
        this.cb.onTrap?.('knall', b, z);
        b.hp = 0;
        this.spend(b);
        return true;
      }
      case 'oelspur':
        h.slow(z, t.slow, t.slowTime);
        if (z.burnT > 0) {
          this.ignite(b, cx, cz, t); // ein Brennender tritt hinein
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  /** Brennt es in der Nähe der Ölspur? */
  fireNear(x, z) {
    for (const f of this.towers.fires) if ((f.x - x) ** 2 + (f.z - z) ** 2 < (f.r + 0.5) ** 2) return true;
    return false;
  }

  /** Die Ölspur fängt Feuer: eine Flammenwand, danach ist sie verbraucht. */
  ignite(b, x, z, t) {
    this.stats.flames++;
    this.towers.fires.push({ x, z, r: t.radius, dps: t.fire, t: t.fireTime, by: null });
    this.effects.splat(x, 0.3, z, 'feuer', 26, 1.3);
    this.sound.play('flammen', { x, z });
    this.cb.onTrap?.('flammen', b, null);
    b.hp = 0;
    this.spend(b);
  }

  spend(b) {
    this.world.buildings.wreck(b);
    this.cb.onTrapSpent?.(b);
  }
}
