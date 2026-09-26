// Die Horde: Schlurfer anlegen, bewegen, animieren, verletzen, sterben lassen.
//
// Darstellung: je Art und Körperteil ein InstancedMesh (wenige Draw-Calls auch
// bei vielen Schlurfern). Die Haltung rechnet ein unsichtbares Gerüst aus
// Object3D-Knoten (wie Mikas Figur), dessen Weltmatrizen in die Instanzen
// kopiert werden.
//
// Verhalten je Zustand:
//   enter    vom Waldrand zum ersten Feld der Lichtung (ohne Kollision)
//   walk     dem Flussfeld nach Hause folgen (Brummer: durch Barrikaden)
//   approach vom Zielfeld an die Hauswand
//   attack   aufs Zuhause einschlagen
//   smash    Barrikade einschlagen (Brummer, Anführer)
//   chase    Mika verfolgen und schlagen, wenn sie nah ist
//   dying    umfallen und im Boden versinken

import * as THREE from 'three';
import { createWorldMaterial } from '../render/materials.js';
import { V } from '../world/layout.js';
import { ZOMBIES } from '../data/zombies.js';
import { zombieParts, ZOMBIE_TYPES } from './zombieModels.js';
import { damp, dampAngle } from '../core/math.js';

const MAX_PER_TYPE = 110;
const TINT = {
  normal: new THREE.Color(1, 1, 1),
  flash: new THREE.Color(4, 4, 4),
  frozen: new THREE.Color(0.75, 0.95, 1.5),
  burning: new THREE.Color(1.5, 0.95, 0.6),
  slowed: new THREE.Color(0.85, 0.97, 1.2),
};

/** Unsichtbares Gerüst einer Art: Gelenke als Object3D, Teile als Anker. */
class Rig {
  constructor(parts) {
    this.root = new THREE.Object3D();
    this.body = new THREE.Object3D();
    this.root.add(this.body);
    this.pivots = {};
    this.anchors = {};
    const headJoint = parts.find((p) => p.name === 'head').joint;
    for (const p of parts) {
      if (p.parent === 'head') continue;
      const pivot = new THREE.Object3D();
      pivot.position.set(p.joint[0] * V, p.joint[1] * V, p.joint[2] * V);
      const anchor = new THREE.Object3D();
      anchor.position.set((p.offset[0] - p.joint[0]) * V, (p.offset[1] - p.joint[1]) * V, (p.offset[2] - p.joint[2]) * V);
      pivot.add(anchor);
      (p.parent === 'root' ? this.root : this.body).add(pivot);
      this.pivots[p.name] = pivot;
      this.anchors[p.name] = anchor;
    }
    for (const p of parts) {
      if (p.parent !== 'head') continue;
      const anchor = new THREE.Object3D();
      anchor.position.set((p.offset[0] - headJoint[0]) * V, (p.offset[1] - headJoint[1]) * V, (p.offset[2] - headJoint[2]) * V);
      this.pivots.head.add(anchor);
      this.anchors[p.name] = anchor;
    }
  }
}

export class Horde {
  /**
   * @param {object} deps scene, world (colliders, pathing, grid, buildings), rng
   * @param {object} callbacks onKill(z), onHouseHit(dmg, z), onPlayerHit(dmg, z), onBarricadeHit(b, dmg), onDamage(z, amount, crit)
   */
  constructor({ scene, world, rng }, callbacks) {
    this.world = world;
    this.rng = rng;
    this.cb = callbacks;
    this.list = [];
    this.nextId = 1;
    this.time = 0;
    this.material = createWorldMaterial();
    this.glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.kinds = {};
    this.group = new THREE.Group();
    this.group.name = 'Horde';
    scene.add(this.group);
    for (const type of ZOMBIE_TYPES) {
      const parts = zombieParts(type, 11 + type.length);
      const meshes = {};
      for (const p of parts) {
        const geo = p.model.toGeometry({ jitter: p.glow ? 0 : 0.03, seed: 7, ao: !p.glow });
        const mesh = new THREE.InstancedMesh(geo, p.glow ? this.glowMaterial : this.material, MAX_PER_TYPE);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if (!p.glow) {
          mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PER_TYPE * 3).fill(1), 3);
          mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
        mesh.frustumCulled = false;
        mesh.count = 0;
        mesh.visible = false;
        this.group.add(mesh);
        meshes[p.name] = mesh;
      }
      this.kinds[type] = { rig: new Rig(parts), meshes, parts: parts.map((p) => p.name) };
    }
    this._dir = { x: 0, z: 0 };
    this._pt = { x: 0, z: 0 };
    this._pos = new THREE.Vector3();
  }

  get alive() {
    let n = 0;
    for (const z of this.list) if (z.state !== 'dying') n++;
    return n;
  }

  /**
   * Schlurfer anlegen.
   * @param {string} type
   * @param {{from?:{x,z}, entry?:{x,z}, x?:number, z?:number, hpFactor?:number, day?:boolean}} o
   */
  spawn(type, o = {}) {
    const def = ZOMBIES[type];
    const day = Boolean(o.day);
    const hp = Math.round(def.hp * (o.hpFactor || 1) * (day ? 0.7 : 1));
    const start = o.from || { x: o.x, z: o.z };
    const z = {
      id: this.nextId++,
      type,
      def,
      day,
      x: start.x,
      z: start.z,
      y: 0,
      facing: 0,
      hp,
      maxHp: hp,
      speed: def.speed * (day ? 0.65 : 1) * (0.92 + this.rng.next() * 0.16),
      state: o.entry ? 'enter' : 'walk',
      entry: o.entry || null,
      phase: this.rng.next() * 6,
      cooldown: 0.5 + this.rng.next(),
      windup: 0,
      attackAnim: 0,
      slow: 0,
      slowT: 0,
      freezeT: 0,
      burn: 0,
      burnT: 0,
      kx: 0,
      kz: 0,
      flash: 0,
      hasteT: 0,
      summonT: def.summon ? def.summon.every : 0,
      stuck: 0,
      lastX: start.x,
      lastZ: start.z,
      target: null,
      deathT: 0,
      aggro: day ? 1.4 : 3.2,
      lootFactor: day ? 0.5 : 1,
    };
    if (o.entry) z.facing = Math.atan2(o.entry.x - start.x, o.entry.z - start.z);
    this.list.push(z);
    return z;
  }

  clear() {
    this.list.length = 0;
  }

  /** Schaden austeilen. Gibt true zurück, wenn der Schlurfer daran stirbt. */
  damage(z, amount, { pierce = false, push = 0, fromX = null, fromZ = null, source = null } = {}) {
    if (z.state === 'dying') return false;
    const dealt = Math.max(1, Math.round(pierce ? amount : amount - z.def.armor));
    z.hp -= dealt;
    z.flash = 0.1;
    if (push && fromX !== null) {
      const dx = z.x - fromX;
      const dz = z.z - fromZ;
      const d = Math.hypot(dx, dz) || 1;
      const resist = z.type === 'brummer' || z.type === 'anfuehrer' ? 0.35 : 1;
      z.kx += (dx / d) * push * 6 * resist;
      z.kz += (dz / d) * push * 6 * resist;
    }
    this.cb.onDamage?.(z, dealt, source);
    if (z.hp <= 0) {
      this.kill(z, source);
      return true;
    }
    return false;
  }

  kill(z, source) {
    z.hp = 0;
    z.state = 'dying';
    z.deathT = 0;
    z.deathDir = source === 'spieler' ? 1 : -1;
    this.cb.onKill?.(z, source);
  }

  slow(z, amount, time) {
    if (z.def.immuneSlow || z.state === 'dying') return;
    if (amount >= z.slow || z.slowT <= 0) z.slow = amount;
    z.slowT = Math.max(z.slowT, time);
  }

  freeze(z, time) {
    if (z.def.immuneSlow || z.state === 'dying') return;
    z.freezeT = Math.max(z.freezeT, time * (z.type === 'brummer' || z.type === 'anfuehrer' ? 0.5 : 1));
  }

  ignite(z, dps, time) {
    if (z.state === 'dying') return;
    z.burn = Math.max(z.burn, dps);
    z.burnT = Math.max(z.burnT, time);
  }

  /** Alle Lebenden im Umkreis (neue Liste). */
  inRange(x, z, r) {
    const out = [];
    for (const zo of this.list) if (zo.state !== 'dying' && zo.state !== 'enter' && (zo.x - x) ** 2 + (zo.z - z) ** 2 <= r * r) out.push(zo);
    return out;
  }

  /**
   * @param {number} dt
   * @param {{player:{x:number,z:number,inside:boolean,alive:boolean}, lightSlow:(x,z)=>number}} ctx
   */
  update(dt, ctx) {
    this.time += dt;
    const world = this.world;
    const pathing = world.pathing;
    const player = ctx.player;

    // Leuchtpilze: heilen und beschleunigen Nachbarn
    for (const z of this.list) z.hasted = false;
    for (const lp of this.list) {
      if (lp.state === 'dying' || !lp.def.heal) continue;
      for (const o of this.list) {
        if (o === lp || o.state === 'dying') continue;
        if ((o.x - lp.x) ** 2 + (o.z - lp.z) ** 2 > lp.def.healRange ** 2) continue;
        o.hp = Math.min(o.maxHp, o.hp + lp.def.heal * dt);
        o.hasted = true;
      }
    }

    for (let idx = this.list.length - 1; idx >= 0; idx--) {
      const z = this.list[idx];
      if (z.state === 'dying') {
        z.deathT += dt;
        if (z.deathT > 1.1) this.list.splice(idx, 1);
        continue;
      }
      // Zustände
      z.flash = Math.max(0, z.flash - dt);
      z.slowT = Math.max(0, z.slowT - dt);
      if (z.slowT <= 0) z.slow = 0;
      z.freezeT = Math.max(0, z.freezeT - dt);
      if (z.burnT > 0) {
        z.burnT -= dt;
        z.burnAcc = (z.burnAcc || 0) + z.burn * dt;
        if (z.burnAcc >= 1) {
          const n = Math.floor(z.burnAcc);
          z.burnAcc -= n;
          if (this.damage(z, n, { pierce: true, source: 'feuer' })) continue;
        }
      }
      if (z.def.summon && z.state !== 'enter') {
        z.summonT -= dt;
        if (z.summonT <= 0) {
          z.summonT = z.def.summon.every;
          for (let k = 0; k < z.def.summon.count; k++) {
            const a = (k / z.def.summon.count) * Math.PI * 2;
            const s = this.spawn(z.def.summon.type, { x: z.x + Math.cos(a) * 0.9, z: z.z + Math.sin(a) * 0.9, hpFactor: z.maxHp / z.def.hp });
            s.state = 'walk';
            this.cb.onSummon?.(s);
          }
        }
      }

      const frozen = z.freezeT > 0;
      let speed = z.speed * (1 - z.slow) * (z.hasted ? 1 + 0.15 : 1) * (1 - (ctx.lightSlow ? ctx.lightSlow(z.x, z.z) : 0));
      if (frozen) speed = 0;
      z.cooldown = Math.max(0, z.cooldown - dt);
      z.attackAnim = Math.max(0, z.attackAnim - dt);

      let vx = 0;
      let vz = 0;
      const reach = z.def.radius + 0.5;
      const pd = Math.hypot(player.x - z.x, player.z - z.z);

      // Mika in der Nähe? (Nicht, wenn sie im Haus ist.)
      if (z.state !== 'enter' && player.alive && !player.inside && pd < z.aggro) z.state = 'chase';
      else if (z.state === 'chase' && (pd > z.aggro * 2 || player.inside || !player.alive)) z.state = 'walk';

      switch (z.state) {
        case 'enter': {
          const e = z.entry;
          const dx = e.x - z.x;
          const dz = e.z - z.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.3) z.state = 'walk';
          else {
            vx = (dx / d) * speed;
            vz = (dz / d) * speed;
          }
          break;
        }
        case 'walk': {
          const brute = Boolean(z.def.breaksBarricades);
          const dir = pathing.direction(z.x, z.z, brute, this._dir);
          if (!dir) {
            if (pathing.atHome(z.x, z.z)) z.state = 'approach';
            else {
              // Außerhalb des Rasters oder eingeschlossen: direkt aufs Haus zu
              const p = pathing.attackPoint(z.x, z.z, this._pt);
              const dx = p.x - z.x;
              const dz = p.z - z.z;
              const d = Math.hypot(dx, dz) || 1;
              vx = (dx / d) * speed;
              vz = (dz / d) * speed;
            }
            break;
          }
          vx = dir.x * speed;
          vz = dir.z * speed;
          if (brute) {
            const ahead = world.buildings.atCell(Math.floor(z.x + dir.x * 0.55), Math.floor(z.z + dir.z * 0.55));
            if (ahead && ahead.type === 'barrikade') {
              z.state = 'smash';
              z.target = ahead.id;
              vx = 0;
              vz = 0;
            }
          }
          break;
        }
        case 'approach': {
          const p = pathing.attackPoint(z.x, z.z, this._pt);
          const dx = p.x - z.x;
          const dz = p.z - z.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.25 || pathing.distanceToHome(z.x, z.z) < z.def.radius + 0.35) {
            z.state = 'attack';
          } else {
            vx = (dx / d) * speed;
            vz = (dz / d) * speed;
          }
          break;
        }
        case 'attack': {
          z.facing = dampAngle(z.facing, Math.atan2(...this.toHome(z)), 8, dt);
          if (!frozen && z.cooldown <= 0) {
            z.cooldown = 1 / z.def.hitRate;
            z.attackAnim = 0.45;
            this.cb.onHouseHit?.(z.def.hit, z);
          }
          break;
        }
        case 'smash': {
          const b = world.buildings.get(z.target);
          if (!b) {
            z.state = 'walk';
            break;
          }
          const c = world.buildings.bounds(b);
          z.facing = dampAngle(z.facing, Math.atan2(c.x - z.x, c.z - z.z), 8, dt);
          if (!frozen && z.cooldown <= 0) {
            z.cooldown = 1 / z.def.hitRate;
            z.attackAnim = 0.45;
            this.cb.onBarricadeHit?.(b, z.def.hit, z);
          }
          break;
        }
        case 'chase': {
          if (pd > reach) {
            vx = ((player.x - z.x) / pd) * speed * 1.1;
            vz = ((player.z - z.z) / pd) * speed * 1.1;
            z.windup = 0;
          } else if (!frozen) {
            z.facing = dampAngle(z.facing, Math.atan2(player.x - z.x, player.z - z.z), 10, dt);
            if (z.windup > 0) {
              z.windup -= dt;
              if (z.windup <= 0) {
                z.attackAnim = 0.35;
                if (pd <= reach + 0.25) this.cb.onPlayerHit?.(z.def.bite * (z.day ? 0.6 : 1), z);
                z.cooldown = 1 / z.def.hitRate;
              }
            } else if (z.cooldown <= 0) {
              z.windup = 0.38;
            }
          }
          break;
        }
        default:
          break;
      }

      // Rückstoß abklingen lassen
      vx += z.kx;
      vz += z.kz;
      z.kx = damp(z.kx, 0, 9, dt);
      z.kz = damp(z.kz, 0, 9, dt);

      if (vx || vz) {
        const moving = Math.hypot(vx, vz);
        if (z.state === 'enter') {
          z.x += vx * dt;
          z.z += vz * dt;
        } else {
          this._pos.set(z.x, 0, z.z);
          world.colliders.move(this._pos, vx * dt, vz * dt, z.def.radius * 0.9);
          z.x = this._pos.x;
          z.z = this._pos.z;
        }
        if (moving > 0.05 && (Math.abs(vx - z.kx) > 0.01 || Math.abs(vz - z.kz) > 0.01)) z.facing = dampAngle(z.facing, Math.atan2(vx - z.kx, vz - z.kz), 7, dt);
        z.phase += dt * Math.min(moving, 2.2) * 5.5;
      }

      // Festgefahren (z. B. an einer Ecke)? Kurz seitlich ausweichen.
      if (z.state === 'walk' || z.state === 'approach') {
        const progressed = Math.hypot(z.x - z.lastX, z.z - z.lastZ);
        z.stuck = progressed < speed * dt * 0.2 && speed > 0 ? z.stuck + dt : 0;
        if (z.stuck > 0.8) {
          if (z.state === 'approach' && pathing.distanceToHome(z.x, z.z) < 1.3) z.state = 'attack';
          else {
            const a = this.rng.next() * Math.PI * 2;
            z.kx += Math.cos(a) * 1.2;
            z.kz += Math.sin(a) * 1.2;
          }
          z.stuck = 0;
        }
      }
      z.lastX = z.x;
      z.lastZ = z.z;
    }

    this.separate(dt);
  }

  /** Richtung zur nächsten Hauswand als [dx, dz] (für atan2). */
  toHome(z) {
    const r = this.world.pathing.home;
    const hx = Math.max(r.minX, Math.min(z.x, r.maxX));
    const hz = Math.max(r.minZ, Math.min(z.z, r.maxZ));
    return [hx - z.x || 0.001, hz - z.z || 0.001];
  }

  /** Schlurfer schieben sich nicht ineinander. */
  separate(dt) {
    const list = this.list;
    for (let a = 0; a < list.length; a++) {
      const A = list[a];
      if (A.state === 'dying' || A.state === 'enter') continue;
      for (let b = a + 1; b < list.length; b++) {
        const B = list[b];
        if (B.state === 'dying' || B.state === 'enter') continue;
        const dx = B.x - A.x;
        const dz = B.z - A.z;
        const min = (A.def.radius + B.def.radius) * 0.9;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5 * Math.min(1, dt * 12);
        const wa = A.type === 'brummer' || A.type === 'anfuehrer' ? 0.25 : 1;
        const wb = B.type === 'brummer' || B.type === 'anfuehrer' ? 0.25 : 1;
        A.x -= dx * push * wa;
        A.z -= dz * push * wa;
        B.x += dx * push * wb;
        B.z += dz * push * wb;
      }
    }
  }

  /** Haltung berechnen und in die Instanzen schreiben. */
  render() {
    const counts = {};
    for (const type of ZOMBIE_TYPES) counts[type] = 0;
    for (const z of this.list) {
      const kind = this.kinds[z.type];
      const k = counts[z.type];
      if (k >= MAX_PER_TYPE) continue;
      counts[z.type]++;
      this.pose(kind.rig, z);
      kind.rig.root.updateMatrixWorld(true);
      const tint = z.flash > 0 ? TINT.flash : z.freezeT > 0 ? TINT.frozen : z.burnT > 0 ? TINT.burning : z.slowT > 0 ? TINT.slowed : TINT.normal;
      for (const name of kind.parts) {
        const mesh = kind.meshes[name];
        mesh.setMatrixAt(k, kind.rig.anchors[name].matrixWorld);
        if (mesh.instanceColor) mesh.setColorAt(k, tint);
      }
    }
    for (const type of ZOMBIE_TYPES) {
      const kind = this.kinds[type];
      for (const name of kind.parts) {
        const mesh = kind.meshes[name];
        mesh.count = counts[type];
        mesh.visible = counts[type] > 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  pose(rig, z) {
    const s = z.def.scale;
    const t = this.time;
    const p = rig.pivots;
    const walk = Math.sin(z.phase);
    const moving = z.state === 'walk' || z.state === 'enter' || z.state === 'approach' || (z.state === 'chase' && z.windup <= 0);
    const amt = z.freezeT > 0 ? 0 : moving ? 1 : 0.15;
    const run = z.type === 'flitzer';
    let lean = run ? 0.32 : 0.14;
    let fall = 0;
    let sink = 0;
    if (z.state === 'dying') {
      const q = Math.min(1, z.deathT / 0.45);
      fall = q * q * 1.45 * z.deathDir;
      sink = Math.max(0, z.deathT - 0.55) * 0.6;
    }
    rig.root.position.set(z.x, z.y - sink, z.z);
    rig.root.rotation.set(0, z.facing, 0);
    rig.root.scale.set(s, s, s);
    rig.body.position.y = Math.abs(Math.cos(z.phase)) * 0.03 * amt;
    rig.body.rotation.set(lean + fall * 0.2, 0, Math.sin(z.phase * 0.5) * 0.06 * amt);
    // Hinken: ein Bein schwingt weniger
    p.legL.rotation.x = walk * 0.62 * amt;
    p.legR.rotation.x = -walk * 0.45 * amt;
    p.head.rotation.set(0.1 + Math.sin(t * 1.3 + z.id) * 0.06, Math.sin(t * 0.7 + z.id) * 0.2, 0.18 * Math.sin(t * 0.9 + z.id * 2));
    // Arme: klassisch nach vorn gestreckt; beim Schlag hoch und herunter
    let arm = run ? -0.4 - walk * 0.7 * amt : -1.35 + Math.sin(z.phase * 1.3) * 0.12 * amt;
    if (z.attackAnim > 0) {
      const q = 1 - z.attackAnim / 0.45;
      arm = q < 0.45 ? -1.4 - q * 2.4 : -2.5 + (q - 0.45) * 3.4;
    } else if (z.windup > 0) {
      arm = -2.2;
    }
    p.armL.rotation.set(arm + (run ? walk * 0.9 * amt : 0), 0, -0.1);
    p.armR.rotation.set(arm - (run ? walk * 0.9 * amt : 0) + 0.12, 0, 0.1);
    if (fall) {
      // Umfallen um die Füße nach hinten (oder vorn)
      rig.root.rotation.set(-fall, z.facing, 0, 'YXZ');
    }
  }

  /** Zustand zum Speichern (nur Lebende). */
  toState() {
    return this.list.filter((z) => z.state !== 'dying').map((z) => ({ type: z.type, x: +z.x.toFixed(2), z: +z.z.toFixed(2), hp: Math.round(z.hp), max: z.maxHp, day: z.day || undefined }));
  }

  load(entries) {
    this.clear();
    for (const e of entries || []) {
      if (!ZOMBIES[e.type]) continue;
      const z = this.spawn(e.type, { x: e.x, z: e.z, day: e.day });
      z.maxHp = e.max || z.maxHp;
      z.hp = Math.min(z.maxHp, e.hp || z.maxHp);
      z.state = 'walk';
    }
  }
}
