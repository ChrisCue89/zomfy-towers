// Krähen (Meilenstein 12, DESIGN.md 8): Tagsüber sitzen sie auf Pfählen,
// Pfosten und im Gras der Bucht, picken und schauen sich um. Kommt Mika (oder
// ein Schlurfer) zu nahe, flattern sie krächzend auf – die Nachbarn gleich mit –
// und verschwinden über dem Wald; nach einer Weile kommt eine zurück. Abends
// ziehen sie in den Wald. Feines Maß (1/16 m), die Flügel sind eigene Teile.

import * as THREE from 'three';
import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { createWorldMaterial } from '../render/materials.js';
import { Rng } from '../core/rng.js';

const U = 1 / 16;
const COUNT = 5;
const SHY = 2.6; // so nah darf Mika kommen (m), rennend das Anderthalbfache
const ZOMBIE_SHY = 2.4;
const FLOCK = 4; // Nachbarn in diesem Umkreis fliegen mit auf
const DAY = [6.5, 18.6]; // Stunden, in denen Krähen in der Bucht sind

function buildBody() {
  const m = new VoxelModel();
  // Blick nach +z: Rumpf, Kopf mit hellem Auge, grauer Schnabel, gefächerter Schwanz
  m.box(-1, 1, -2, 1, 3, 2, (x, y, z) => (y === 3 ? P.n2 : P.n1));
  m.box(-1, 3, 2, 1, 5, 4, (x, y) => (y === 5 ? P.n3 : P.n1));
  m.set(-1, 4, 3, P.s8).set(1, 4, 3, P.s8);
  m.box(0, 3, 5, 0, 4, 6, (x, y, z) => (y === 4 && z === 6 ? null : y === 4 ? P.s6 : P.s5));
  m.box(-1, 2, -4, 1, 2, -3, (x, y, z) => (x === 0 && z === -4 ? P.n2 : P.n0));
  m.set(-1, 0, 0, P.s2).set(1, 0, 0, P.s2);
  return m;
}

/** Flügel als flache Platte nach außen (side = +1 rechts, -1 links). */
function buildWing(side) {
  const m = new VoxelModel();
  for (let k = 0; k < 4; k++) {
    const x = side > 0 ? k : -1 - k;
    m.box(x, 0, -2, x, 0, 2 - (k === 3 ? 1 : 0), (xx, y, z) => (k === 3 || z === -2 ? P.n0 : P.n1));
  }
  return m;
}

export class Crows {
  /**
   * @param {{scene: THREE.Scene, perches: Array<{x:number,y:number,z:number,ground?:boolean}>, seed: number, isFree?: (p:object)=>boolean}} options
   */
  constructor({ scene, perches, seed, isFree = () => true }) {
    this.rng = new Rng(seed + 404);
    this.perches = perches.map((p) => ({ ...p, crow: null }));
    this.isFree = isFree;
    this.onCaw = null; // (x, z) => Klang (game.js)
    this.caws = 0; // für die Prüfung: wie oft sind Krähen krächzend aufgeflogen
    this.cawCooldown = 0;
    this.material = createWorldMaterial({ selfLight: 0.1 });
    const body = buildBody().toGeometry({ size: U, jitter: 0.02, seed });
    const wingR = buildWing(1).toGeometry({ size: U, jitter: 0.02, seed });
    const wingL = buildWing(-1).toGeometry({ size: U, jitter: 0.02, seed });
    this.group = new THREE.Group();
    this.group.name = 'Krähen';
    scene.add(this.group);
    this.list = [];
    for (let i = 0; i < COUNT; i++) {
      const root = new THREE.Group();
      const pose = new THREE.Group(); // picken, wippen
      root.add(pose);
      const bodyMesh = new THREE.Mesh(body, this.material);
      bodyMesh.position.x = -0.5 * U; // Rumpf ist drei Voxel breit: auf die Mitte schieben
      bodyMesh.castShadow = true;
      pose.add(bodyMesh);
      const makeWing = (geo, side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side > 0 ? 1.5 * U : -1.5 * U, 3 * U, 0);
        const mesh = new THREE.Mesh(geo, this.material);
        mesh.castShadow = true;
        pivot.add(mesh);
        pivot.visible = false; // im Sitzen angelegt (der Rumpf zeigt sie schon)
        pose.add(pivot);
        return pivot;
      };
      const crow = {
        id: i,
        root,
        pose,
        wingR: makeWing(wingR, 1),
        wingL: makeWing(wingL, -1),
        state: 'weg',
        perch: null,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        target: new THREE.Vector3(),
        facing: 0,
        timer: this.rng.range(2, 20),
        idle: this.rng.range(1, 4),
        peck: 0,
        turnTo: null,
        flap: this.rng.range(0, 6),
        startle: -1,
        startleFrom: { x: 0, z: 0 },
      };
      root.visible = false;
      this.group.add(root);
      this.list.push(crow);
    }
    this._want = new THREE.Vector3();
  }

  /** Beim Laden und am Morgen: tagsüber sitzen alle schon (nicht weit weg von `avoid`). */
  settle(hours, avoid) {
    for (const c of this.list) this.leave(c, true);
    if (hours < DAY[0] || hours > DAY[1]) return;
    for (const c of this.list) {
      const perch = this.pickPerch(avoid, 5);
      if (perch) this.sit(c, perch);
    }
  }

  pickPerch(avoid, minDist) {
    const free = this.perches.filter((p) => !p.crow && this.isFree(p) && (!avoid || Math.hypot(p.x - avoid.x, p.z - avoid.z) > minDist));
    return free.length ? free[this.rng.int(0, free.length - 1)] : null;
  }

  sit(c, perch) {
    c.state = 'sitzt';
    c.perch = perch;
    perch.crow = c;
    c.pos.set(perch.x, perch.y, perch.z);
    c.facing = (this.rng.int(0, 3) * Math.PI) / 2 + this.rng.range(-0.3, 0.3);
    c.idle = this.rng.range(1, 4);
    c.root.visible = true;
    this.pose(c, null);
  }

  leave(c, instant = false) {
    if (c.perch) c.perch.crow = null;
    c.perch = null;
    c.state = instant ? 'weg' : 'fliegt';
    c.timer = this.rng.range(35, 80);
    c.root.visible = !instant;
    c.startle = -1;
  }

  /** Auffliegen, weg von der Störung, dann über den Wald im Nordwesten. */
  flee(c, from, caw) {
    const away = new THREE.Vector3(c.pos.x - from.x, 0, c.pos.z - from.z);
    if (away.lengthSq() < 0.01) away.set(-1, 0, -1);
    away.normalize();
    this.leave(c);
    c.vel.set(away.x * 2.5, 3.2, away.z * 2.5);
    c.target.set(c.pos.x - 14 + away.x * 4, 9, c.pos.z - 10 + away.z * 4);
    if (caw && this.cawCooldown <= 0) {
      this.cawCooldown = 1.2;
      this.caws++;
      if (this.onCaw) this.onCaw(c.pos.x, c.pos.z);
    }
    // Die Nachbarn erschrecken kurz danach mit
    for (const o of this.list) {
      if (o === c || o.state !== 'sitzt' || o.startle >= 0) continue;
      if (Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z) < FLOCK) {
        o.startle = this.rng.range(0.1, 0.45);
        o.startleFrom.x = from.x;
        o.startleFrom.z = from.z;
      }
    }
  }

  /** Haltung: Picken und Flügel (wing = Winkel über der Waagrechten, null = angelegt). */
  pose(c, wing) {
    c.root.position.copy(c.pos);
    c.root.rotation.y = c.facing;
    const peck = c.peck > 0 ? Math.sin((1 - c.peck / 0.3) * Math.PI) : 0;
    c.pose.rotation.x = peck * 0.6;
    const spread = wing !== null;
    c.wingR.visible = spread;
    c.wingL.visible = spread;
    if (spread) {
      c.wingR.rotation.z = wing;
      c.wingL.rotation.z = -wing;
    }
  }

  /**
   * @param {number} dt
   * @param {{hours:number, player:{position:THREE.Vector3, velocity:THREE.Vector3}, zombies:Array<{x:number,z:number,state:string}>, inside:boolean}} ctx
   */
  update(dt, { hours, player, zombies, inside }) {
    this.cawCooldown -= dt;
    const day = hours >= DAY[0] && hours <= DAY[1];
    const p = player.position;
    const running = Math.hypot(player.velocity.x, player.velocity.z) > 4;
    for (const c of this.list) {
      if (c.state === 'sitzt') {
        // Abends in den Wald, sonst: Wer kommt zu nahe?
        if (!day) {
          this.flee(c, { x: c.pos.x + 1, z: c.pos.z + 1 }, false);
          continue;
        }
        const d = Math.hypot(p.x - c.pos.x, p.z - c.pos.z);
        if (!inside && d < SHY * (running ? 1.5 : 1)) {
          this.flee(c, p, true);
          continue;
        }
        if (!this.isFree(c.perch)) {
          // Dort wird gerade gebaut: lieber weg
          this.flee(c, { x: c.pos.x + 1, z: c.pos.z + 1 }, true);
          continue;
        }
        let scared = null;
        for (const z of zombies) {
          if (z.state === 'dying') continue;
          if (Math.hypot(z.x - c.pos.x, z.z - c.pos.z) < ZOMBIE_SHY) {
            scared = z;
            break;
          }
        }
        if (scared) {
          this.flee(c, scared, true);
          continue;
        }
        if (c.startle >= 0) {
          c.startle -= dt;
          if (c.startle < 0) {
            this.flee(c, c.startleFrom, false);
            continue;
          }
        }
        // Picken, umdrehen, wippen
        c.idle -= dt;
        if (c.peck > 0) c.peck = Math.max(0, c.peck - dt);
        if (c.idle <= 0) {
          c.idle = this.rng.range(1.2, 4);
          if (this.rng.chance(0.6)) c.peck = 0.3;
          else c.turnTo = c.facing + (this.rng.chance(0.5) ? 1 : -1) * this.rng.range(0.8, 1.8);
        }
        if (c.turnTo !== null) {
          const k = Math.min(1, dt * 8);
          c.facing += (c.turnTo - c.facing) * k;
          if (Math.abs(c.turnTo - c.facing) < 0.02) c.turnTo = null;
        }
        this.pose(c, null);
      } else if (c.state === 'fliegt') {
        // Kräftig flattern, steigen, Richtung Wald
        c.flap += dt * 22;
        const to = c.target;
        const want = this._want.set(to.x - c.pos.x, to.y - c.pos.y, to.z - c.pos.z);
        const dist = want.length();
        want.multiplyScalar(5.5 / Math.max(0.001, dist));
        c.vel.lerp(want, Math.min(1, dt * 1.5));
        c.pos.addScaledVector(c.vel, dt);
        c.facing = Math.atan2(c.vel.x, c.vel.z);
        this.pose(c, 0.15 + Math.sin(c.flap) * 0.65);
        if (dist < 1 || c.pos.y > 8.5) {
          c.state = 'weg';
          c.root.visible = false;
        }
      } else if (c.state === 'weg') {
        if (!day) continue;
        c.timer -= dt;
        if (c.timer > 0) continue;
        const perch = this.pickPerch(p, 7);
        if (!perch) {
          c.timer = this.rng.range(10, 20);
          continue;
        }
        // Aus dem Wald im Nordwesten zurück zu einem freien Platz
        c.state = 'kommt';
        c.perch = perch;
        perch.crow = c;
        c.pos.set(perch.x - 12, 8, perch.z - 9);
        c.vel.set(0, 0, 0);
        c.root.visible = true;
      } else if (c.state === 'kommt') {
        const perch = c.perch;
        const dx = perch.x - c.pos.x;
        const dy = perch.y - c.pos.y;
        const dz = perch.z - c.pos.z;
        const dist = Math.hypot(dx, dy, dz);
        const nearPlayer = Math.hypot(p.x - perch.x, p.z - perch.z) < SHY + 1.5;
        if (!day || nearPlayer || !this.isFree(perch)) {
          // Platz besetzt oder Mika steht da: abdrehen
          this.flee(c, { x: perch.x + 1, z: perch.z + 1 }, false);
          continue;
        }
        if (dist < 0.12) {
          this.sit(c, perch);
          continue;
        }
        const speed = Math.min(4.5, 1 + dist * 1.2);
        c.pos.x += (dx / dist) * speed * dt;
        c.pos.y += (dy / dist) * speed * dt;
        c.pos.z += (dz / dist) * speed * dt;
        c.facing = Math.atan2(dx, dz);
        // Gleiten, kurz vor dem Landen flattern
        c.flap += dt * (dist < 2 ? 20 : 9);
        this.pose(c, dist < 2 ? 0.1 + Math.sin(c.flap) * 0.6 : -0.15 + Math.sin(c.flap) * 0.25);
      }
    }
  }

  /** Für die Prüfung: Zustand aller Krähen. */
  info() {
    return this.list.map((c) => ({ id: c.id, state: c.state, x: c.pos.x, y: c.pos.y, z: c.pos.z, perch: c.perch ? this.perches.indexOf(c.perch) : -1 }));
  }
}
