// Die Horde: Schlurfer anlegen, bewegen, animieren, verletzen, sterben lassen.
//
// Darstellung: je Art und Körperteil ein InstancedMesh (wenige Draw-Calls auch
// bei vielen Schlurfern). Die Haltung rechnet ein unsichtbares Gerüst aus
// Object3D-Knoten (wie Mikas Figur), dessen Weltmatrizen in die Instanzen
// kopiert werden.
//
// Verhalten je Zustand:
//   enter    aus dem Wald am Spawn auf den Weg (ohne Kollision)
//   walk     dem Flussfeld auf den Wegen nach Hause folgen; wer abseits steht
//            (hinter Mika her), findet erst auf den nächsten Weg zurück
//   approach vom Zielfeld an die Hauswand
//   attack   aufs Zuhause einschlagen
//   smash    Barrikade, Wall oder Tor einschlagen (seit Meilenstein 9 alle Arten;
//            Brummer und Anführer schlagen besonders hart zu)
//   raid     im Lager (M17d): umwerfen, was dort steht (Werkbank, Zelt, Beet,
//            Lampe, Bank, Holzlager), danach weiter zum Haus
//   chase    Mika verfolgen und schlagen, wenn sie nah ist; steht ein Bau
//            dazwischen, außen herum (Breitensuche um Mika, pathing.js)
//   dying    umfallen und im Boden versinken

import * as THREE from 'three';
import { createWorldMaterial, createSilhouetteMaterial } from '../render/materials.js';
import { SHADOW_LAYER, SHADOW_PROXY_MATERIAL } from '../render/staticMesh.js';
import { V } from '../world/layout.js';
import { ZOMBIES, DAY_ZOMBIE, NIGHT_AGGRO } from '../data/zombies.js';
import { BUILDINGS, RAID } from '../data/buildings.js';
import { zombieParts, ZOMBIE_TYPES } from './zombieModels.js';
import { damp, dampAngle } from '../core/math.js';

/** Jagd hinter einem Hindernis: nach so vielen Sekunden ohne Durchkommen aufgeben … */
const CHASE_GIVE_UP = 2.5;
/** … und so lange nicht wieder auf Mika losgehen. */
const CHASE_PAUSE = 4;
/**
 * Nach der Jagd zurück an die Stelle, an der er den Weg verlassen hat (m12-r1:
 * sonst lief er um eine Barrikadenreihe herum und stand dahinter). So nah heran …
 */
const REJOIN_NEAR = 0.4;
/** … oder nach so vielen Sekunden geht es wieder auf dem Weg weiter. */
const REJOIN_MAX = 15;

const MAX_PER_TYPE = 110;
const RECOIL = 0.22; // so lange taumelt ein Schlurfer nach einem Treffer zurück
const WINDUP = 0.38; // so lange holt ein Schlurfer aus, bevor er beißt
const BITE_LUNGE = 0.45; // M16: so weit reicht der Biss über die Reichweite hinaus (Ausfallschritt)
const HORDE_MOVE = { bounds: true, horde: true }; // durch Balduins Wagen hindurch (steht nicht im Flussfeld)
const TINT = {
  normal: new THREE.Color(1, 1, 1),
  flash: new THREE.Color(4, 4, 4),
  frozen: new THREE.Color(0.75, 0.95, 1.5),
  burning: new THREE.Color(1.5, 0.95, 0.6),
  slowed: new THREE.Color(0.85, 0.97, 1.2),
  stunned: new THREE.Color(1.35, 1.25, 0.75),
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
      const U = p.unit || V;
      pivot.position.set(p.joint[0] * U, p.joint[1] * U, p.joint[2] * U);
      const anchor = new THREE.Object3D();
      anchor.position.set((p.offset[0] - p.joint[0]) * U, (p.offset[1] - p.joint[1]) * U, (p.offset[2] - p.joint[2]) * U);
      pivot.add(anchor);
      (p.parent === 'root' ? this.root : this.body).add(pivot);
      this.pivots[p.name] = pivot;
      this.anchors[p.name] = anchor;
    }
    for (const p of parts) {
      if (p.parent !== 'head') continue;
      const anchor = new THREE.Object3D();
      const U = p.unit || V;
      anchor.position.set((p.offset[0] - headJoint[0]) * U, (p.offset[1] - headJoint[1]) * U, (p.offset[2] - headJoint[2]) * U);
      this.pivots.head.add(anchor);
      this.anchors[p.name] = anchor;
    }
  }
}

export class Horde {
  /**
   * @param {object} deps scene, world (colliders, pathing, grid, buildings), rng
   * @param {object} callbacks onKill(z, source, lucky), onHouseHit(dmg, z), onPlayerHit(dmg, z), onBarricadeHit(b, dmg), onDamage(z, amount, crit)
   */
  constructor({ scene, world, rng }, callbacks) {
    this.world = world;
    this.rng = rng;
    this.cb = callbacks;
    this.list = [];
    this.nextId = 1;
    this.time = 0;
    this.material = createWorldMaterial({ selfLight: 0.2 }); // nachts erkennbar, nicht nur die Augen
    this.glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
    // Hinter dem Haus (und anderen Verdeckungen) bleiben Schlurfer als Umriss sichtbar
    this.silhouetteMaterial = createSilhouetteMaterial(0xa88fd0, 0.38); // zurückhaltender: im Pulk kein Knäuel (m3-r2)
    this.kinds = {};
    this.group = new THREE.Group();
    this.group.name = 'Horde';
    scene.add(this.group);
    const silhouettes = [];
    this.silhouettes = silhouettes;
    this.shadowProxies = [];
    for (const type of ZOMBIE_TYPES) {
      const parts = zombieParts(type, 11 + type.length);
      const meshes = {};
      for (const p of parts) {
        const U = p.unit || V;
        const geo = p.model.toGeometry({ jitter: p.glow ? 0 : 0.03, seed: 7, ao: !p.glow, size: U });
        // Umriss und Schatten aus einer gröberen Fassung (M13g: im Maß 1/32 kostete
        // jeder Schlurfer sonst dreimal die volle Zahl an Dreiecken)
        const coarse = !p.glow && U < 1 / 16 ? p.model.downsampled(2, 1).toGeometry({ jitter: 0, ao: false, size: U * 2 }) : geo;
        const mesh = new THREE.InstancedMesh(geo, p.glow ? this.glowMaterial : this.material, MAX_PER_TYPE);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if (!p.glow) {
          mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PER_TYPE * 3).fill(1), 3);
          mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
          mesh.receiveShadow = true;
          if (coarse === geo) mesh.castShadow = true;
          else {
            const proxy = new THREE.InstancedMesh(coarse, SHADOW_PROXY_MATERIAL, MAX_PER_TYPE);
            proxy.instanceMatrix = mesh.instanceMatrix; // dieselben Matrizen, nur für den Schattenpass
            proxy.castShadow = true;
            proxy.layers.set(SHADOW_LAYER);
            proxy.frustumCulled = false;
            proxy.count = 0;
            proxy.visible = false;
            this.group.add(proxy);
            this.shadowProxies.push({ type, mesh: proxy });
          }
        }
        mesh.frustumCulled = false;
        mesh.count = 0;
        mesh.visible = false;
        mesh.renderOrder = 1.5; // nach dem eigenen Umriss (1), vor Mikas Umriss (1.75) – siehe materials.js
        this.group.add(mesh);
        meshes[p.name] = mesh;
        if (!p.glow) {
          const sil = new THREE.InstancedMesh(coarse, this.silhouetteMaterial, MAX_PER_TYPE);
          sil.instanceMatrix = mesh.instanceMatrix; // dieselben Matrizen, nur anders gezeichnet
          sil.frustumCulled = false;
          sil.count = 0;
          sil.visible = false;
          sil.renderOrder = 1;
          this.group.add(sil);
          silhouettes.push({ type, mesh: sil });
        }
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
      speed: def.speed * (day ? 0.65 : o.speedFactor || 1) * (0.92 + this.rng.next() * 0.16),
      state: o.entry ? 'enter' : 'walk',
      entry: o.entry || null,
      phase: this.rng.next() * 6,
      cooldown: 0.5 + this.rng.next(),
      windup: 0,
      attackAnim: 0,
      slow: 0,
      slowT: 0,
      freezeT: 0,
      stunT: 0, // betäubt (Bratpfanne): steht, der Kopf taumelt
      lureT: 0, // abgelenkt (Pfiff, M16): steht und starrt Knopf an
      lureX: 0,
      lureZ: 0,
      burn: 0,
      burnT: 0,
      kx: 0,
      kz: 0,
      flash: 0,
      recoil: 0,
      hasteT: 0,
      summonT: def.summon ? def.summon.every : 0,
      stuck: 0,
      lastX: start.x,
      lastZ: start.z,
      ax: start.x, // letzte Stelle auf Weg oder Hof (m12-r1)
      az: start.z,
      anchored: false,
      rejoinT: 0,
      target: null,
      inCamp: false, // schon einmal hinter Wall und Tor gewesen (M17d)
      raidScan: 0,
      raidT: 0,
      raidIgnore: null, // an diesen Bau kam er nicht heran
      deathT: 0,
      aggro: day ? DAY_ZOMBIE.aggro : def.aggro ?? NIGHT_AGGRO,
      lootFactor: day ? 0.5 : o.lootFactor || 1, // M16: Schwierigkeit und Mutbonus
    };
    if (o.entry) z.facing = Math.atan2(o.entry.x - start.x, o.entry.z - start.z);
    this.list.push(z);
    return z;
  }

  clear() {
    this.list.length = 0;
  }

  /** Schaden austeilen. Gibt true zurück, wenn der Schlurfer daran stirbt. */
  /** @param {{by?: number|null}} [opts] by: Turm, dem Schaden und Abschuss gutgeschrieben werden (M16) */
  damage(z, amount, { pierce = false, push = 0, fromX = null, fromZ = null, source = null, lucky = false, by = null } = {}) {
    if (z.state === 'dying') return false;
    const dealt = Math.max(1, Math.round(pierce ? amount : amount - z.def.armor));
    z.hp -= dealt;
    z.flash = 0.1;
    z.recoil = RECOIL;
    if (push && fromX !== null) {
      const dx = z.x - fromX;
      const dz = z.z - fromZ;
      const d = Math.hypot(dx, dz) || 1;
      const resist = z.type === 'brummer' || z.type === 'anfuehrer' ? 0.35 : 1;
      z.kx += (dx / d) * push * 6 * resist;
      z.kz += (dz / d) * push * 6 * resist;
    }
    this.cb.onDamage?.(z, dealt, source, by);
    if (z.hp <= 0) {
      this.kill(z, source, lucky, by);
      return true;
    }
    return false;
  }

  /** @param {boolean} [lucky] ein Turm mit Glücksmünze war es (M10: dann sicher Teile) */
  kill(z, source, lucky = false, by = null) {
    z.hp = 0;
    z.state = 'dying';
    z.deathT = 0;
    z.deathDir = source === 'spieler' ? 1 : -1;
    this.cb.onKill?.(z, source, lucky, by);
  }

  slow(z, amount, time) {
    if (z.def.immuneSlow || z.state === 'dying') return;
    if (amount >= z.slow || z.slowT <= 0) z.slow = amount;
    z.slowT = Math.max(z.slowT, time);
  }

  freeze(z, time) {
    if (z.def.immuneSlow || z.state === 'dying') return;
    z.freezeT = Math.max(z.freezeT, time * (z.type === 'brummer' || z.type === 'anfuehrer' ? 0.5 : 1));
    z.windup = 0;
  }

  /** Betäuben (Nahkampf, Laternenblitz): steht still, schlägt nicht, holt neu aus. Zähe nur halb so lange. */
  stun(z, time) {
    if (z.state === 'dying') return;
    z.stunT = Math.max(z.stunT, time * (z.type === 'brummer' || z.type === 'anfuehrer' ? 0.5 : 1));
    z.windup = 0;
  }

  /** Ablenken (Pfiff, M16): bleibt stehen und starrt auf (x, zz). Zähe nur halb so lange. */
  lure(z, x, zz, time) {
    if (z.state === 'dying' || z.state === 'enter') return;
    z.lureT = Math.max(z.lureT, time * (z.type === 'brummer' || z.type === 'anfuehrer' ? 0.5 : 1));
    z.lureX = x;
    z.lureZ = zz;
    z.windup = 0;
  }

  ignite(z, dps, time, by = null) {
    if (z.state === 'dying') return;
    z.burn = Math.max(z.burn, dps);
    z.burnT = Math.max(z.burnT, time);
    if (by !== null) z.burnBy = by; // wer zuletzt angezündet hat, bekommt den Brand gutgeschrieben (M16)
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

    // Wall und Tor (M17): Ostkante des Lagers und ob nichts eingebrochen ist
    const campX = world.buildings.campX;
    const campShut = campX !== null && world.buildings.campShut;

    for (let idx = this.list.length - 1; idx >= 0; idx--) {
      const z = this.list[idx];
      if (z.state === 'dying') {
        z.deathT += dt;
        if (z.deathT > 1.1) this.list.splice(idx, 1);
        continue;
      }
      // Zustände
      z.flash = Math.max(0, z.flash - dt);
      z.recoil = Math.max(0, z.recoil - dt);
      z.slowT = Math.max(0, z.slowT - dt);
      if (z.slowT <= 0) z.slow = 0;
      z.freezeT = Math.max(0, z.freezeT - dt);
      z.stunT = Math.max(0, z.stunT - dt);
      z.lureT = Math.max(0, z.lureT - dt);
      if (z.noChase > 0) z.noChase -= dt;
      if (z.burnT > 0) {
        z.burnT -= dt;
        z.burnAcc = (z.burnAcc || 0) + z.burn * dt;
        if (z.burnAcc >= 1) {
          const n = Math.floor(z.burnAcc);
          z.burnAcc -= n;
          if (this.damage(z, n, { pierce: true, source: 'feuer', by: z.burnBy ?? null })) continue;
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

      const lured = z.lureT > 0;
      const frozen = z.freezeT > 0 || z.stunT > 0 || lured;
      const light = ctx.lightSlow ? ctx.lightSlow(z.x, z.z) : 0; // Licht macht den Moder müde
      let speed = z.speed * (1 - z.slow) * (z.hasted ? 1 + 0.15 : 1) * (1 - light);
      if (frozen) speed = 0;
      z.cooldown = Math.max(0, z.cooldown - dt);
      z.attackAnim = Math.max(0, z.attackAnim - dt);

      let vx = 0;
      let vz = 0;
      const reach = z.def.radius + 0.5;
      const pd = Math.hypot(player.x - z.x, player.z - z.z);

      // Letzte Stelle auf Weg oder Hof merken: Dorthin kehrt ein Jäger zurück (m12-r1)
      if (z.state !== 'chase' && z.state !== 'rejoin' && z.state !== 'enter' && pathing.onPathOrYard(z.x, z.z)) {
        z.ax = z.x;
        z.az = z.z;
        z.anchored = true;
      }

      // Mika in der Nähe? (Nicht, wenn sie im Haus ist – und nicht, solange Wall und Tor
      // dazwischen stehen, M17: dann geht er weiter zum Tor und schlägt es ein. In der
      // Schlupftür steht sie beiden Seiten offen.)
      const walled = campShut && (z.x < campX - 1.05 ? player.x > campX : z.x > campX && player.x < campX - 1.05);
      if (z.state !== 'enter' && !(z.noChase > 0) && player.alive && !player.inside && pd < z.aggro && !walled) z.state = 'chase';
      else if (z.state === 'chase' && (pd > z.aggro * 2 || player.inside || !player.alive || walled)) this.endChase(z);

      // Im Lager (M17d): Wer hinter Wall und Tor steht, wirft um, was dort steht
      if (campX !== null && z.state !== 'enter' && z.x > campX + 0.2) {
        if (!z.inCamp) {
          z.inCamp = true;
          this.cb.onEnterCamp?.(z);
        }
        if (z.state === 'walk') {
          z.raidScan -= dt;
          if (z.raidScan <= 0) {
            z.raidScan = RAID.scan;
            const b = this.raidTarget(z);
            if (b) {
              z.state = 'raid';
              z.target = b.id;
              z.raidT = 0;
            }
          }
        }
      }

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
          const dir = pathing.direction(z.x, z.z, true, this._dir);
          if (!dir) {
            // Am Haus (auch auf der Fläche künftiger Anbauten, die das Raster sperrt): angreifen
            if (pathing.atHome(z.x, z.z) || pathing.distanceToHome(z.x, z.z) < 2.6) z.state = 'approach';
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
          // Barrikade oder Tor voraus: stehen bleiben und einschlagen (Trümmer sind kein Hindernis)
          const ahead = world.buildings.atCell(Math.floor(z.x + dir.x * 0.55), Math.floor(z.z + dir.z * 0.55));
          if (ahead && BUILDINGS[ahead.type].smash && !ahead.broken) {
            z.state = 'smash';
            z.target = ahead.id;
            vx = 0;
            vz = 0;
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
          if (!b || b.broken) {
            z.state = 'walk';
            break;
          }
          const c = world.buildings.bounds(b);
          z.facing = dampAngle(z.facing, Math.atan2(c.x - z.x, c.z - z.z), 8, dt);
          if (!frozen && z.cooldown <= 0) {
            z.cooldown = 1 / (z.def.hitRate * (1 - light)); // geblendet schlägt er seltener (M17e)
            z.attackAnim = 0.45;
            this.cb.onBarricadeHit?.(b, z.def.hit, z);
          }
          break;
        }
        case 'raid': {
          // Im Lager (M17d): an die nächste Kante des Baus und draufschlagen
          const b = world.buildings.get(z.target);
          if (!b || b.broken) {
            z.state = 'walk';
            break;
          }
          const r = world.buildings.bounds(b);
          const dx = Math.max(r.i, Math.min(z.x, r.i + r.w)) - z.x;
          const dz = Math.max(r.j, Math.min(z.z, r.j + r.d)) - z.z;
          const d = Math.hypot(dx, dz);
          z.raidMoving = d > z.def.radius + 0.35;
          if (z.raidMoving) {
            z.raidT += dt;
            if (z.raidT > RAID.giveUp) {
              z.raidIgnore = b.id; // kommt nicht heran: weiter zum Haus
              z.state = 'walk';
              break;
            }
            vx = (dx / d) * speed;
            vz = (dz / d) * speed;
          } else {
            z.facing = dampAngle(z.facing, Math.atan2(dx || r.x - z.x, dz || r.z - z.z), 8, dt);
            if (!frozen && z.cooldown <= 0) {
              z.cooldown = 1 / (z.def.hitRate * (1 - light));
              z.attackAnim = 0.45;
              this.cb.onRaidHit?.(b, z.def.hit, z);
            }
          }
          break;
        }
        case 'rejoin': {
          // Zurück an die Absprungstelle, um Bauten herum – erst dort geht es auf dem Weg weiter
          z.rejoinT += dt;
          const dx = z.ax - z.x;
          const dz = z.az - z.z;
          const d = Math.hypot(dx, dz);
          if (d < REJOIN_NEAR || z.rejoinT > REJOIN_MAX) {
            z.state = 'walk';
            break;
          }
          let nx = dx / d;
          let nz = dz / d;
          if (!pathing.clearLine(z.x, z.z, z.ax, z.az)) {
            const dir = pathing.towardDirection(z.x, z.z, z.ax, z.az, this._dir);
            if (dir) {
              nx = dir.x;
              nz = dir.z;
            }
          }
          vx = nx * speed;
          vz = nz * speed;
          break;
        }
        case 'chase': {
          if (pd > reach) {
            // Steht ein Bau dazwischen, kommt er außen herum; sonst geradewegs auf Mika zu
            let dx = (player.x - z.x) / pd;
            let dz = (player.z - z.z) / pd;
            if (!pathing.clearLine(z.x, z.z, player.x, player.z)) {
              const dir = pathing.chaseDirection(z.x, z.z, player.x, player.z, this._dir);
              if (dir) {
                dx = dir.x;
                dz = dir.z;
              }
            }
            vx = dx * speed * 1.1;
            vz = dz * speed * 1.1;
            // M16: Wer einmal ausholt, schlägt zu – ein Rückstoß aus der Reichweite
            // bricht das nicht mehr ab (m12-r1: wer im Takt klickte, wurde nie
            // getroffen). Nur Betäuben, Blenden und Ablenken stoppen ihn.
            if (z.windup > 0 && !frozen) this.swing(z, pd, reach, dt);
          } else if (!frozen) {
            z.facing = dampAngle(z.facing, Math.atan2(player.x - z.x, player.z - z.z), 10, dt);
            if (z.windup > 0) this.swing(z, pd, reach, dt);
            else if (z.cooldown <= 0) z.windup = WINDUP;
          }
          break;
        }
        default:
          break;
      }

      // Abgelenkt: steht und starrt dorthin, wo Knopf bellt
      if (lured) z.facing = dampAngle(z.facing, Math.atan2(z.lureX - z.x, z.lureZ - z.z), 6, dt);

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
          world.colliders.move(this._pos, vx * dt, vz * dt, z.def.radius * 0.9, HORDE_MOVE);
          z.x = this._pos.x;
          z.z = this._pos.z;
        }
        if (moving > 0.05 && (Math.abs(vx - z.kx) > 0.01 || Math.abs(vz - z.kz) > 0.01)) z.facing = dampAngle(z.facing, Math.atan2(vx - z.kx, vz - z.kz), 7, dt);
        z.phase += dt * Math.min(moving, 2.2) * 5.5;
      }

      // Festgefahren (z. B. an einem Pfosten oder einer Ecke)? Seitlich
      // ausweichen – quer zur Laufrichtung, damit er sicher vorbeikommt (m3-r2:
      // Schlurfer hingen lange an der Wäscheleine).
      const chasing = z.state === 'chase' && pd > reach;
      const raiding = z.state === 'raid' && (vx || vz);
      if (z.state === 'walk' || z.state === 'approach' || z.state === 'rejoin' || chasing || raiding) {
        const progressed = Math.hypot(z.x - z.lastX, z.z - z.lastZ);
        const blocked = progressed < speed * dt * 0.2 && speed > 0;
        z.stuck = blocked ? z.stuck + dt : 0;
        // Mika hinter einem Bau (Werkbank, Turm, Beet): Wer nicht herumkommt, gibt die
        // Jagd eine Weile auf und läuft auf seinem Weg zum Haus weiter (m7-r1: sonst
        // standen Schlurfer stundenlang dort, griffen nichts an und waren nicht zu treffen)
        z.chaseStuck = chasing ? Math.max(0, (z.chaseStuck || 0) + (blocked ? dt : -dt * 0.5)) : 0;
        if (z.chaseStuck > CHASE_GIVE_UP) {
          // Mika hinter Wall oder Tor (M17): Wer dort hängt, schlägt sich durch, statt aufzugeben
          const wall = this.campNear(z);
          if (wall) {
            z.state = 'smash';
            z.target = wall.id;
          } else {
            this.endChase(z);
            z.noChase = CHASE_PAUSE;
          }
          z.chaseStuck = 0;
          z.stuck = 0;
        } else if (z.stuck > 0.5) {
          if (z.state === 'approach' && pathing.distanceToHome(z.x, z.z) < 1.3) z.state = 'attack';
          else {
            const wx = vx - z.kx;
            const wz = vz - z.kz;
            const side = this.rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
            const a = wx || wz ? Math.atan2(wz, wx) + side : this.rng.next() * Math.PI * 2;
            z.kx += Math.cos(a) * 1.6;
            z.kz += Math.sin(a) * 1.6;
          }
          z.stuck = 0;
        }
      }
      z.lastX = z.x;
      z.lastZ = z.z;
    }

    this.separate(dt);
  }

  /** Ausholen läuft ab; am Ende beißt er zu, wenn Mika noch in Reichweite (plus Ausfallschritt) ist. */
  swing(z, pd, reach, dt) {
    z.windup -= dt;
    if (z.windup > 0) return;
    z.windup = 0;
    z.attackAnim = 0.35;
    if (pd <= reach + BITE_LUNGE) this.cb.onPlayerHit?.(z.def.bite * (z.day ? 0.6 : 1), z);
    z.cooldown = 1 / z.def.hitRate;
  }

  /** Nächster Bau im Lager zum Umwerfen (M17d), höchstens RAID.reach bis zur Kante – oder null. */
  raidTarget(z) {
    let best = null;
    let bestD = RAID.reach;
    for (const b of this.world.buildings.list) {
      if (!BUILDINGS[b.type].raid || b.broken || b.id === z.raidIgnore) continue;
      const r = this.world.buildings.bounds(b);
      const dx = Math.max(r.i - z.x, 0, z.x - (r.i + r.w));
      const dz = Math.max(r.j - z.z, 0, z.z - (r.j + r.d));
      const d = Math.hypot(dx, dz);
      if (d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  /** Heiler Wall-Abschnitt oder Tor direkt neben einem Schlurfer (höchstens 1,2 m bis zur Kante). */
  campNear(z) {
    for (const b of this.world.buildings.camp) {
      if (b.broken) continue;
      const r = this.world.buildings.bounds(b);
      const dx = Math.max(r.i - z.x, 0, z.x - (r.i + r.w));
      const dz = Math.max(r.j - z.z, 0, z.z - (r.j + r.d));
      if (Math.hypot(dx, dz) < 1.2) return b;
    }
    return null;
  }

  /** Jagd vorbei: zurück zur letzten Stelle auf dem Weg – ohne eine zum nächsten Weg. */
  endChase(z) {
    z.state = z.anchored ? 'rejoin' : 'walk';
    z.rejoinT = 0;
    z.windup = 0;
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
    const living = {};
    for (const type of ZOMBIE_TYPES) counts[type] = 0;
    // Erst die Lebenden, dann die Sterbenden: Umrisse zeigen nur die Lebenden
    // (wer im Boden versinkt, soll nicht als Umriss durch die Erde schimmern).
    const order = this._order || (this._order = []);
    order.length = 0;
    for (const z of this.list) if (z.state !== 'dying') order.push(z);
    for (const type of ZOMBIE_TYPES) living[type] = 0;
    for (const z of order) living[z.type] = Math.min(MAX_PER_TYPE, living[z.type] + 1);
    for (const z of this.list) if (z.state === 'dying') order.push(z);
    for (const z of order) {
      const kind = this.kinds[z.type];
      const k = counts[z.type];
      if (k >= MAX_PER_TYPE) continue;
      counts[z.type]++;
      this.pose(kind.rig, z);
      kind.rig.root.updateMatrixWorld(true);
      const tint = z.flash > 0 ? TINT.flash : z.stunT > 0 ? TINT.stunned : z.freezeT > 0 ? TINT.frozen : z.burnT > 0 ? TINT.burning : z.slowT > 0 ? TINT.slowed : TINT.normal;
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
    for (const s of this.silhouettes) {
      s.mesh.count = living[s.type];
      s.mesh.visible = living[s.type] > 0;
    }
    for (const s of this.shadowProxies) {
      s.mesh.count = counts[s.type];
      s.mesh.visible = counts[s.type] > 0;
    }
  }

  pose(rig, z) {
    const s = z.def.scale;
    const t = this.time;
    const p = rig.pivots;
    const walk = Math.sin(z.phase);
    const moving = z.state === 'walk' || z.state === 'enter' || z.state === 'approach' || z.state === 'rejoin' || (z.state === 'chase' && z.windup <= 0) || (z.state === 'raid' && z.raidMoving);
    const amt = z.freezeT > 0 || z.stunT > 0 ? 0 : moving ? 1 : 0.15;
    const run = z.type === 'flitzer';
    const heavy = z.type === 'brummer' || z.type === 'anfuehrer';
    let lean = run ? 0.32 : heavy ? 0.06 : 0.14;
    // Getroffen: kurz nach hinten geworfen
    const hit = z.recoil > 0 ? Math.sin((z.recoil / RECOIL) * Math.PI) : 0;
    lean -= hit * 0.38;
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
    // Schwere stampfen (tiefer Tritt, breites Wanken), Schwärmer trippeln
    const bob = heavy ? Math.pow(Math.abs(Math.cos(z.phase)), 3) * 0.06 : Math.abs(Math.cos(z.phase)) * 0.03;
    const sway = heavy ? 0.12 : z.type === 'schwaermer' ? 0.1 : 0.06;
    rig.body.position.y = bob * amt;
    rig.body.rotation.set(lean + fall * 0.2, 0, Math.sin(z.phase * 0.5) * sway * amt + (1 - amt) * Math.sin(t * 0.8 + z.id) * 0.04);
    // Hinken: ein Bein schwingt weniger
    p.legL.rotation.x = walk * 0.62 * amt;
    p.legR.rotation.x = -walk * 0.45 * amt;
    const jitter = z.type === 'schwaermer' ? Math.sin(t * 17 + z.id) * 0.08 : 0;
    p.head.rotation.set(0.1 + Math.sin(t * 1.3 + z.id) * 0.06 - hit * 0.4, Math.sin(t * 0.7 + z.id) * 0.2 + jitter, 0.18 * Math.sin(t * 0.9 + z.id * 2));
    // Betäubt: der Kopf kreist benommen
    if (z.stunT > 0) p.head.rotation.set(0.25 + Math.cos(t * 9) * 0.2, 0, Math.sin(t * 9) * 0.45);
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
