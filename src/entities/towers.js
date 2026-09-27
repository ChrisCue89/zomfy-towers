// Türme im Einsatz (DESIGN.md 6.9): Ziele wählen, Kopf drehen, schießen.
//
//   Bolzenwerfer   einzelne Bolzen, zielt auf den vordersten (Scharfschütze:
//                  den stärksten, durchschlägt Panzer; Repetierer: 2–3 Ziele)
//   Kürbiskatapult Kürbis im Bogen, Flächenschaden (Feuer: brennt nach,
//                  Streu: zerplatzt in kleine Kürbisse)
//   Rasensprenger  Sprühregen rundum: wenig Schaden, verlangsamt (Frost:
//                  friert ein, Schlamm: stößt zurück)
//   Laternenturm   stärkt Türme in der Nähe (Leuchtfeuer: Licht bremst die
//                  Horde, Glückslaterne: mehr Loot im Licht)
//
// Kaputte Türme (Haltbarkeit 0) tun nichts, bis sie repariert sind.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { towerStats } from '../data/towers.js';
import { dampAngle } from '../core/math.js';

const MAX_PROJECTILES = 120;
const HEAD_Y = { bolzen: 1.2, katapult: 0.9, sprenger: 1.3, laternenturm: 2.2 };

function boltModel() {
  const m = new VoxelModel();
  m.box(0, 0, -2, 0, 0, 1, P.e8);
  m.set(0, 0, 2, P.s9).set(-1, 0, -2, P.a4).set(1, 0, -2, P.a4);
  // Leuchtspur dahinter: auch nachts sieht man, wohin der Turm schießt (m3-r1)
  m.box(0, 0, -6, 0, 0, -3, (x, y, z) => (z >= -4 ? 0xfff0c8 : 0xffd98a));
  return m;
}

/** Kürbislaterne: leuchtet auch nachts, damit man die Schüsse sieht. */
function pumpkinModel(size) {
  const m = new VoxelModel();
  const r = size;
  m.box(-r, 0, -r, r - 1, 2 * r - 1, r - 1, (x, y, z) => {
    if (z === r - 1 && y === r && (x === -1 || x === 0 + (r > 1 ? 0 : -1))) return 0xfff2a0;
    return (x + z) % 2 ? 0xe8833a : 0xf4a64c;
  });
  m.set(-1, 2 * r, -1, 0x69963d);
  return m;
}

export class TowerSystem {
  /**
   * @param {object} deps scene, world, horde, effects
   * @param {object} callbacks onShot(kind)
   */
  constructor({ scene, world, horde, effects }, callbacks = {}) {
    this.world = world;
    this.horde = horde;
    this.effects = effects;
    this.cb = callbacks;
    this.projectiles = [];
    this.fires = [];
    this.time = 0;
    const basic = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.meshes = {
      bolt: new THREE.InstancedMesh(boltModel().toGeometry({ jitter: 0, ao: false }), basic, MAX_PROJECTILES),
      pumpkin: new THREE.InstancedMesh(pumpkinModel(2).toGeometry({ jitter: 0, ao: false }), basic, MAX_PROJECTILES),
      mini: new THREE.InstancedMesh(pumpkinModel(1).toGeometry({ jitter: 0, ao: false }), basic, MAX_PROJECTILES),
    };
    for (const mesh of Object.values(this.meshes)) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      scene.add(mesh);
    }
    this.dummy = new THREE.Object3D();
  }

  clear() {
    this.projectiles.length = 0;
    this.fires.length = 0;
  }

  /** Mittelpunkt und Kopfhöhe eines Turms. */
  origin(t) {
    return { x: t.i + 0.5, y: HEAD_Y[t.type], z: t.j + 0.5 };
  }

  /** Stärke der Laternen-Aura an jedem Turm (größter Bonus zählt). */
  updateAuras(towers) {
    for (const t of towers) t.aura = 0;
    for (const L of towers) {
      if (L.type !== 'laternenturm' || L.hp <= 0) continue;
      const s = towerStats(L.type, L.level, L.spec);
      for (const t of towers) {
        if (t === L || t.type === 'laternenturm') continue;
        if (Math.hypot(t.i - L.i, t.j - L.j) <= s.auraRange) t.aura = Math.max(t.aura, s.aura);
      }
    }
  }

  /** Verlangsamung durch Leuchtfeuer-Licht an einer Stelle (0..1). */
  lightSlow(x, z) {
    let best = 0;
    for (const L of this.world.buildings.list) {
      if (L.type !== 'laternenturm' || L.hp <= 0) continue;
      const s = towerStats(L.type, L.level, L.spec);
      if (!s.lightSlow) continue; // Glückslaterne bremst nicht
      if ((x - L.i - 0.5) ** 2 + (z - L.j - 0.5) ** 2 <= s.range * s.range) best = Math.max(best, s.lightSlow);
    }
    return best;
  }

  /** Loot-Bonus der Glückslaterne an einer Stelle (0 = keiner). */
  luckAt(x, z) {
    let best = 0;
    for (const L of this.world.buildings.list) {
      if (L.type !== 'laternenturm' || L.spec !== 'B' || L.hp <= 0) continue;
      const s = towerStats(L.type, L.level, L.spec);
      if ((x - L.i - 0.5) ** 2 + (z - L.j - 0.5) ** 2 <= s.range * s.range) best = Math.max(best, s.luck);
    }
    return best;
  }

  /** Ziele im Umkreis, sortiert nach Priorität. */
  targets(t, range, n, strongest, minRange = 0) {
    const o = this.origin(t);
    const pathing = this.world.pathing;
    const list = [];
    for (const z of this.horde.list) {
      if (z.state === 'dying' || z.state === 'enter') continue;
      const d2 = (z.x - o.x) ** 2 + (z.z - o.z) ** 2;
      if (d2 > range * range || d2 < minRange * minRange) continue;
      list.push(z);
    }
    if (strongest) list.sort((a, b) => b.hp - a.hp);
    else list.sort((a, b) => pathing.remaining(a.x, a.z) - pathing.remaining(b.x, b.z));
    return list.slice(0, n);
  }

  update(dt) {
    this.time += dt;
    const towers = this.world.buildings.towers;
    this.updateAuras(towers);
    for (const t of towers) {
      t.cool = Math.max(0, (t.cool ?? 0.5) - dt);
      t.kick = Math.max(0, (t.kick || 0) - dt * 4);
      if (t.hp <= 0) continue;
      const s = towerStats(t.type, t.level, t.spec);
      const mult = 1 + (t.aura || 0);
      switch (t.type) {
        case 'bolzen':
          this.runBolt(t, s, mult, dt);
          break;
        case 'katapult':
          this.runCatapult(t, s, mult, dt);
          break;
        case 'sprenger':
          this.runSprinkler(t, s, mult, dt);
          break;
        case 'laternenturm':
          t.headAngle = Math.sin(this.time * 0.8 + t.id) * 0.08;
          break;
        default:
          break;
      }
      if (t.head) {
        // Rückstoß entgegen der Schussrichtung; beim Katapult schnellt der Wurfarm vor
        const a = t.headAngle || 0;
        t.head.rotation.y = a;
        const back = t.type === 'katapult' ? 0.02 : 0.07;
        t.head.position.x = -Math.sin(a) * t.kick * back;
        t.head.position.z = -Math.cos(a) * t.kick * back;
        t.head.rotation.x = t.type === 'katapult' ? Math.sin(Math.min(1, t.kick) * Math.PI) * 0.55 : 0;
      }
    }
    this.updateProjectiles(dt);
    this.updateFires(dt);
  }

  aim(t, target, dt, speed = 10) {
    const o = this.origin(t);
    const want = Math.atan2(target.x - o.x, target.z - o.z);
    t.headAngle = dampAngle(t.headAngle || 0, want, speed, dt);
    let diff = Math.abs(want - t.headAngle) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff;
  }

  /** Kein Ziel in Reichweite: der Kopf schaut sich langsam um (M5). */
  scan(t, dt) {
    const want = Math.sin(this.time * 0.45 + t.id * 1.7) * 0.8;
    t.headAngle = dampAngle(t.headAngle || 0, want, 1.5, dt);
  }

  runBolt(t, s, mult, dt) {
    const list = this.targets(t, s.range, s.targets || 1, s.strongest);
    if (!list.length) {
      this.scan(t, dt);
      return;
    }
    const off = this.aim(t, list[0], dt, 12);
    if (t.cool > 0 || off > 0.45) return;
    t.cool = 1 / s.rate;
    t.kick = 1;
    const o = this.origin(t);
    for (const z of list) {
      this.projectiles.push({ kind: 'bolt', x: o.x, y: o.y, z: o.z, target: z, tx: z.x, tz: z.z, speed: 13, damage: s.damage * mult, pierce: Boolean(s.pierce), angle: 0 });
    }
    this.cb.onShot?.('bolzen', o.x, o.z);
  }

  runCatapult(t, s, mult, dt) {
    // Ziel mit den meisten Nachbarn im Splash-Radius (gegen Gruppen)
    const candidates = this.targets(t, s.range, 12, false, 1.2);
    if (!candidates.length) {
      this.scan(t, dt);
      return;
    }
    let best = candidates[0];
    let bestN = -1;
    for (const c of candidates) {
      let n = 0;
      for (const o of candidates) if ((o.x - c.x) ** 2 + (o.z - c.z) ** 2 < s.splash * s.splash) n++;
      if (n > bestN) {
        bestN = n;
        best = c;
      }
    }
    const off = this.aim(t, best, dt, 6);
    if (t.cool > 0 || off > 0.3) return;
    t.cool = 1 / s.rate;
    t.kick = 1;
    const o = this.origin(t);
    // Vorhalten: ein Stück in Laufrichtung des Ziels
    const lead = 0.5 * best.speed * (1 - best.slow);
    const tx = best.x + Math.sin(best.facing) * lead;
    const tz = best.z + Math.cos(best.facing) * lead;
    const dist = Math.hypot(tx - o.x, tz - o.z);
    this.projectiles.push({ kind: 'pumpkin', x0: o.x, y0: o.y + 0.4, z0: o.z, x1: tx, z1: tz, t: 0, T: 0.75 + dist * 0.05, h: 1.4 + dist * 0.15, damage: s.damage * mult, splash: s.splash, burn: s.burn || 0, split: s.split || 0, x: o.x, y: o.y, z: o.z });
    this.cb.onShot?.('katapult', o.x, o.z);
  }

  runSprinkler(t, s, mult, dt) {
    const o = this.origin(t);
    const inRange = this.horde.inRange(o.x, o.z, s.range);
    const kind = t.spec === 'A' ? 'frost' : t.spec === 'B' ? 'schlamm' : 'wasser';
    // Kopf dreht sich immer und tröpfelt ein wenig (man sieht, was er ist);
    // richtig los geht es, wenn jemand in der Nähe ist
    t.headAngle = (t.headAngle || 0) + dt * (inRange.length ? 5 : 1.2);
    if (!inRange.length) {
      t.dripAcc = (t.dripAcc || 0) + dt * 5;
      while (t.dripAcc >= 1) {
        t.dripAcc -= 1;
        this.effects.spray(o.x, o.y, o.z, t.headAngle, s.range * 0.35, kind);
      }
      return;
    }
    t.sprayAcc = (t.sprayAcc || 0) + dt * 36;
    this.cb.onShot?.('sprenger', o.x, o.z); // der Klang drosselt sich selbst
    while (t.sprayAcc >= 1) {
      t.sprayAcc -= 1;
      this.effects.spray(o.x, o.y, o.z, t.headAngle + (Math.floor(t.sprayAcc * 10) % 2 ? Math.PI : 0), s.range, kind);
    }
    if (t.cool > 0) return;
    t.cool = 1 / s.rate;
    t.freezeCd = (t.freezeCd ?? 0) - 1 / s.rate;
    const freezeNow = s.freeze && t.freezeCd <= 0;
    if (freezeNow) t.freezeCd = 4;
    for (const z of inRange) {
      if (this.horde.damage(z, s.damage * mult, { push: s.push || 0, fromX: o.x, fromZ: o.z, source: 'turm' })) continue;
      this.horde.slow(z, s.slow, s.slowTime);
      if (freezeNow) {
        this.horde.freeze(z, s.freeze);
        this.effects.splat(z.x, 0.6, z.z, 'frost', 6, 0.6);
      }
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.kind === 'bolt') {
        // Zielsuchend; stirbt das Ziel, fliegt der Bolzen zur letzten Stelle
        if (p.target && p.target.state !== 'dying') {
          p.tx = p.target.x;
          p.tz = p.target.z;
        }
        const ty = 0.7;
        const dx = p.tx - p.x;
        const dy = ty - p.y;
        const dz = p.tz - p.z;
        const d = Math.hypot(dx, dy, dz);
        const step = p.speed * dt;
        p.angle = Math.atan2(dx, dz);
        if (d <= step + 0.05) {
          if (p.target && p.target.state !== 'dying') {
            this.horde.damage(p.target, p.damage, { pierce: p.pierce, push: 0.15, fromX: p.x, fromZ: p.z, source: 'turm' });
            this.effects.splat(p.tx, 0.7, p.tz, 'funken', 4, 0.5);
          }
          this.projectiles.splice(i, 1);
          continue;
        }
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
        p.z += (dz / d) * step;
        continue;
      }
      // Kürbisse fliegen im Bogen
      p.t += dt;
      const q = Math.min(1, p.t / p.T);
      p.x = p.x0 + (p.x1 - p.x0) * q;
      p.z = p.z0 + (p.z1 - p.z0) * q;
      p.y = p.y0 * (1 - q) + 4 * p.h * q * (1 - q);
      if (q < 1) continue;
      this.projectiles.splice(i, 1);
      this.explode(p);
    }
  }

  explode(p) {
    const r = p.splash;
    this.cb.onImpact?.(p.x, p.z);
    for (const z of this.horde.inRange(p.x, p.z, r)) {
      if (this.horde.damage(z, p.damage, { push: 0.25, fromX: p.x, fromZ: p.z, source: 'turm' })) continue;
      if (p.burn) this.horde.ignite(z, p.burn, 3);
    }
    this.effects.splat(p.x, 0.3, p.z, p.burn ? 'feuer' : 'kuerbis', p.kind === 'mini' ? 8 : 16, p.kind === 'mini' ? 0.7 : 1);
    if (p.burn) this.fires.push({ x: p.x, z: p.z, r, dps: p.burn, t: 3 });
    if (p.split) {
      for (let k = 0; k < p.split; k++) {
        const a = (k / p.split) * Math.PI * 2 + this.time;
        const tx = p.x + Math.cos(a) * 1.3;
        const tz = p.z + Math.sin(a) * 1.3;
        this.projectiles.push({ kind: 'mini', x0: p.x, y0: 0.3, z0: p.z, x1: tx, z1: tz, t: 0, T: 0.45, h: 0.8, damage: p.damage * 0.55, splash: r * 0.7, burn: 0, split: 0, x: p.x, y: 0.3, z: p.z });
      }
    }
  }

  updateFires(dt) {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.t -= dt;
      if (f.t <= 0) {
        this.fires.splice(i, 1);
        continue;
      }
      if (Math.random() < dt * 30) this.effects.flames(f.x, f.z, f.r);
      for (const z of this.horde.inRange(f.x, f.z, f.r)) this.horde.ignite(z, f.dps, 1);
    }
  }

  render() {
    const counts = { bolt: 0, pumpkin: 0, mini: 0 };
    const d = this.dummy;
    for (const p of this.projectiles) {
      const key = p.kind === 'bolt' ? 'bolt' : p.kind === 'mini' ? 'mini' : 'pumpkin';
      const mesh = this.meshes[key];
      const k = counts[key]++;
      if (k >= MAX_PROJECTILES) continue;
      d.position.set(p.x, p.y, p.z);
      d.rotation.set(0, p.kind === 'bolt' ? p.angle : this.time * 6, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      mesh.setMatrixAt(k, d.matrix);
    }
    for (const [key, mesh] of Object.entries(this.meshes)) {
      mesh.count = Math.min(MAX_PROJECTILES, counts[key]);
      mesh.visible = mesh.count > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
