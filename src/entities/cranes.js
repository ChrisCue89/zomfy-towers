// A4: Die Kraniche vom Kranichsee (data/cranes.js). Ein paar stehen tagsüber im flachen Wasser am
// Ufer: Sie staksen, picken, schauen auf, tanzen manchmal mit offenen Flügeln, fliegen rufend auf,
// wenn Mika (oder ein Schlurfer) zu nahe kommt, kommen später wieder und schlafen nachts auf einem
// Bein, den Kopf unter dem Flügel. Morgens und am späten Nachmittag ziehen Keile rufend über die
// Bucht nach Südwesten – so über Mika, dass man sie im Bild sieht. Doppelt fein (1/32 m) wie die
// Krähen; Hals, Beine und Flügel sind eigene Teile. Mit den Tagen werden es weniger.

import * as THREE from 'three';
import { createWorldMaterial } from '../render/materials.js';
import { Rng } from '../core/rng.js';
import { shoreX } from '../world/map.js';
import { CRANE_FLOCK, CRANE_REST, flocksOn, restingOn } from '../data/cranes.js';
import { buildBody, buildNeck, buildTucked, buildLeg, buildWing, buildFlyer } from './craneModels.js';

const U = 1 / 32;
const MAX_REST = 6;
const MAX_FLOCK = 14;
const TILT = { sin: 0.6, cos: 0.8 }; // Neigung der Kamera (CLAUDE.md): wo ein Vogel in der Höhe im Bild steht

// --- Die Kraniche ------------------------------------------------------------------------------

export class Cranes {
  /**
   * @param {{scene: THREE.Scene, seed: number, isWater: (x:number, z:number) => boolean}} options
   */
  constructor({ scene, seed, isWater }) {
    this.rng = new Rng(seed + 808);
    this.isWater = isWater;
    this.material = createWorldMaterial({ selfLight: 0.08 });
    const geo = (m) => m.toGeometry({ size: U, jitter: 0.02, seed });
    this.geo = {
      body: geo(buildBody()),
      neck: geo(buildNeck()),
      tucked: geo(buildTucked()),
      leg: geo(buildLeg()),
      wingR: geo(buildWing(1)),
      wingL: geo(buildWing(-1)),
      flyer: geo(buildFlyer()),
    };
    this.group = new THREE.Group();
    this.group.name = 'Kraniche';
    scene.add(this.group);
    this.spots = CRANE_REST.spots.map((s) => ({ x: shoreX(s.z) + s.off, z: s.z }));
    this.resting = [];
    for (let i = 0; i < MAX_REST; i++) this.resting.push(this.makeStanding(i));
    this.flyers = [];
    for (let i = 0; i < MAX_FLOCK; i++) this.flyers.push(this.makeFlyer());
    this.flock = null;
    this.enabled = true; // in der Prüfung aus (CONFIG.cranes), sonst stören Rufe und Gedanken andere Abschnitte
    this.plan = []; // Stunden, zu denen heute noch ein Keil zieht
    this.flocksToday = 0;
    this.day = -1;
    this.count = 0; // wie viele heute rasten
    this.onCall = null; // (x, z, n) => Ruf (game.js)
    this.onMoment = null; // (art, x, z) => etwas, das Mika sieht: 'zug', 'auf', 'tanz', 'schlaf' (game.js: je Art einmal ein Gedanke)
    this.calls = 0; // für die Prüfung
    this.dances = 0;
    this.takeoffs = 0;
    this._v = new THREE.Vector3();
  }

  /** An- und ausschalten (Prüfung): aus heißt unsichtbar und still; an stellt die Rastenden neu auf. */
  setEnabled(on) {
    this.enabled = Boolean(on);
    this.flock = null;
    for (const b of this.flyers) b.root.visible = false;
    for (const c of this.resting) c.root.visible = false;
    this.day = -1; // beim nächsten Schritt neu aufstellen
  }

  makeStanding(i) {
    const root = new THREE.Group();
    const body = new THREE.Mesh(this.geo.body, this.material);
    body.castShadow = true;
    root.add(body);
    const neck = new THREE.Group();
    neck.position.set(0, 25 * U, 7 * U);
    const neckMesh = new THREE.Mesh(this.geo.neck, this.material);
    neckMesh.castShadow = true;
    neck.add(neckMesh);
    root.add(neck);
    const tucked = new THREE.Mesh(this.geo.tucked, this.material); // der Kopf im Schlaf
    tucked.castShadow = true;
    tucked.visible = false;
    root.add(tucked);
    const legs = [-2, 2].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x * U, 15 * U, 0);
      const mesh = new THREE.Mesh(this.geo.leg, this.material);
      mesh.castShadow = true;
      pivot.add(mesh);
      root.add(pivot);
      return pivot;
    });
    const wing = (geo, side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 4 * U, 23 * U, 0);
      pivot.add(new THREE.Mesh(geo, this.material));
      pivot.visible = false;
      root.add(pivot);
      return pivot;
    };
    root.visible = false;
    this.group.add(root);
    return {
      id: i,
      root,
      neck,
      tucked,
      legs,
      wingR: wing(this.geo.wingR, 1),
      wingL: wing(this.geo.wingL, -1),
      state: 'weg',
      spot: i % this.spots.length,
      pos: new THREE.Vector3(),
      target: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      facing: 0,
      t: 0,
      timer: this.rng.range(1, 4),
      peck: 0,
      flap: this.rng.range(0, 6),
      phase: this.rng.range(0, 6),
    };
  }

  makeFlyer() {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(this.geo.flyer, this.material));
    const wing = (geo, side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 3 * U, U, 0);
      pivot.add(new THREE.Mesh(geo, this.material));
      root.add(pivot);
      return pivot;
    };
    root.visible = false;
    this.group.add(root);
    return { root, wingR: wing(this.geo.wingR, 1), wingL: wing(this.geo.wingL, -1), flap: this.rng.range(0, 6) };
  }

  /** Eine Stelle im Wasser nahe dem Rastplatz (nie an Land). */
  wadeSpot(c, radius = 1.2) {
    const s = this.spots[c.spot];
    for (let k = 0; k < 8; k++) {
      const x = s.x + this.rng.range(-radius, radius);
      const z = s.z + this.rng.range(-radius, radius) * 1.4;
      if (this.isWater(x, z) && this.isWater(x - 0.4, z)) return { x, z };
    }
    return { x: s.x, z: s.z };
  }

  /**
   * Die Keile des Tages: verteilt auf die Morgen- und die Abendstunden (morgens zuerst), jeder mit
   * etwas Zufall; was schon vorbei ist, zieht heute nicht mehr (nach dem Laden kommen keine auf einmal).
   */
  planFlocks(day, hours) {
    const n = flocksOn(day);
    const per = [Math.ceil(n / 2), Math.floor(n / 2)];
    const list = [];
    CRANE_FLOCK.times.forEach(([a, b], w) => {
      for (let j = 0; j < per[w]; j++) list.push(a + ((b - a) * (j + 0.5 + this.rng.range(-0.3, 0.3))) / per[w]);
    });
    this.plan = list.sort((x, y) => x - y).filter((h) => h >= hours - 0.05);
    this.flocksToday = 0;
  }

  /** Beim Laden und am Morgen: die Rastenden stehen schon da (je nach Tag und Stunde). */
  settle(day, hours) {
    this.day = day;
    this.planFlocks(day, hours);
    this.count = restingOn(day);
    for (const c of this.resting) {
      if (c.id >= this.count) {
        c.state = 'weg';
        c.root.visible = false;
        continue;
      }
      const at = this.wadeSpot(c);
      c.pos.set(at.x, -CRANE_REST.wade, at.z);
      c.facing = this.rng.range(-Math.PI, Math.PI);
      c.state = this.sleeping(hours) ? 'schlaeft' : 'steht';
      c.timer = this.rng.range(1, 5);
      c.root.visible = true;
      this.pose(c, 0);
    }
  }

  sleeping(hours) {
    const [from, until] = CRANE_REST.sleep;
    return hours >= from || hours < until;
  }

  /** Eine Ruf-Stelle melden (das Spiel spielt den Klang, leiser mit der Entfernung). */
  call(x, z, n = 1) {
    this.calls++;
    if (this.onCall) this.onCall(x, z, n);
  }

  /** Ein Moment für Mika (ein Gedanke, das Spiel entscheidet, ob er kommt). */
  moment(kind, x, z) {
    if (this.onMoment) this.onMoment(kind, x, z);
  }

  /** Auffliegen: alle an diesem Rastplatz (mit einem Ruf), über den See hinaus. `mika`: Mika kam zu nahe. */
  takeOff(spot, from, mika = false) {
    let first = true;
    for (const c of this.resting) {
      if (c.spot !== spot || (c.state !== 'steht' && c.state !== 'geht' && c.state !== 'tanzt' && c.state !== 'schlaeft')) continue;
      const away = this._v.set(c.pos.x - from.x, 0, c.pos.z - from.z);
      if (away.lengthSq() < 0.01) away.set(1, 0, 0);
      away.normalize();
      c.state = 'fliegt';
      c.t = 0;
      c.vel.set(Math.max(0.6, away.x) * 2.4, 2.2, away.z * 1.6);
      c.timer = this.rng.range(CRANE_REST.back[0], CRANE_REST.back[1]);
      if (first) {
        this.call(c.pos.x, c.pos.z, 2);
        if (mika) this.moment('auf', c.pos.x, c.pos.z);
      }
      first = false;
      this.takeoffs++;
    }
  }

  /** Haltung eines Stehenden: Hals (Picken, Schlafen), Beine (Schritt, ein Bein), Flügel (Tanz, Flug). */
  pose(c, walk) {
    c.root.position.copy(c.pos);
    c.root.rotation.y = c.facing;
    const peck = c.peck > 0 ? Math.sin((1 - c.peck / 0.6) * Math.PI) : 0;
    const asleep = c.state === 'schlaeft';
    c.neck.visible = !asleep; // im Schlaf liegt der Kopf auf dem Rücken
    c.tucked.visible = asleep;
    c.legs[1].visible = !asleep; // ein Bein ins Gefieder gezogen
    if (asleep) {
      c.legs[0].rotation.x = 0;
    } else {
      c.neck.rotation.x = peck * 1.5;
      const swing = Math.sin(walk) * 0.45;
      c.legs[0].rotation.x = swing;
      c.legs[1].rotation.x = -swing;
    }
    const spread = c.state === 'tanzt' || c.state === 'fliegt' || c.state === 'kommt';
    c.wingR.visible = spread;
    c.wingL.visible = spread;
    if (spread) {
      const a = c.state === 'tanzt' ? 0.5 + Math.sin(c.flap) * 0.35 : 0.1 + Math.sin(c.flap) * 0.6;
      c.wingR.rotation.z = a;
      c.wingL.rotation.z = -a;
    }
  }

  /** Einen Keil starten: so, dass er über die Stelle (px, pz) – Mika – im Bild zieht. */
  startFlock(px, pz) {
    const n = this.rng.int(CRANE_FLOCK.size[0], Math.min(MAX_FLOCK, CRANE_FLOCK.size[1]));
    const h = CRANE_FLOCK.height;
    // Im Bild etwas über Mika (orthografische Kamera: je höher er fliegt, desto weiter südlich muss er
    // ziehen, um auf Mikas Bildhöhe zu stehen; jeder Meter darüber im Bild ist 1/sin weiter nördlich)
    const z = pz + ((h - 1) * TILT.cos) / TILT.sin - CRANE_FLOCK.above * (1 + this.rng.range(-0.3, 0.3)) / TILT.sin;
    const dir = new THREE.Vector3(-1, 0, 0.22).normalize();
    const start = new THREE.Vector3(px + 30, h, z - dir.z * 30);
    this.flock = { n, dir, pos: start, t: 0, callT: this.rng.range(0.4, 1.2), over: false, px, pz };
    for (let i = 0; i < MAX_FLOCK; i++) this.flyers[i].root.visible = i < n;
    this.placeFlock();
  }

  /** Die Vögel im Keil: der Erste vorn, die anderen abwechselnd links und rechts dahinter. */
  placeFlock() {
    const f = this.flock;
    const side = new THREE.Vector3(-f.dir.z, 0, f.dir.x);
    const yaw = Math.atan2(f.dir.x, f.dir.z);
    for (let i = 0; i < f.n; i++) {
      const b = this.flyers[i];
      const rank = Math.ceil(i / 2);
      const s = i === 0 ? 0 : i % 2 ? 1 : -1;
      const back = rank * CRANE_FLOCK.spacing;
      b.root.position.set(f.pos.x - f.dir.x * back + side.x * s * rank * CRANE_FLOCK.spacing * 0.8, f.pos.y + Math.sin(f.t * 0.7 + i) * 0.12, f.pos.z - f.dir.z * back + side.z * s * rank * CRANE_FLOCK.spacing * 0.8);
      b.root.rotation.y = yaw;
      const a = 0.12 + Math.sin(b.flap) * 0.5;
      b.wingR.rotation.z = a;
      b.wingL.rotation.z = -a;
    }
  }

  /**
   * @param {number} dt
   * @param {{day:number, hours:number, player:{position:THREE.Vector3}, zombies:Array<{x:number,z:number,state:string}>, inside:boolean}} ctx
   */
  update(dt, { day, hours, player, zombies = [], inside = false }) {
    if (!this.enabled) return;
    if (day !== this.day) this.settle(day, hours);
    const p = player.position;
    // --- Keile am Himmel ---
    if (this.flock) {
      const f = this.flock;
      f.t += dt;
      f.pos.addScaledVector(f.dir, CRANE_FLOCK.speed * dt);
      for (let i = 0; i < f.n; i++) this.flyers[i].flap += dt * (CRANE_FLOCK.beat + (i % 3) * 0.4); // tiefe, ruhige Schläge, jeder in seinem Takt
      this.placeFlock();
      f.callT -= dt;
      if (f.callT <= 0) {
        f.callT = this.rng.range(CRANE_FLOCK.call[0], CRANE_FLOCK.call[1]);
        this.call(f.pos.x, f.pos.z, f.n);
      }
      if (!f.over && Math.abs(f.pos.x - f.px) < 3) {
        f.over = true;
        if (!inside) this.moment('zug');
      }
      if (f.pos.x < f.px - 34) {
        for (const b of this.flyers) b.root.visible = false;
        this.flock = null;
      }
    } else if (dt > 0 && this.plan.length && hours >= this.plan[0]) {
      // Der nächste Keil des Tages – drinnen wartet er ein wenig; ist seine Zeit vorbei (die Uhr
      // sprang, Mika blieb drinnen), zieht er ungesehen vorbei
      if (hours > this.plan[0] + 0.5) this.plan.shift();
      else if (!inside) {
        this.plan.shift();
        this.flocksToday++;
        this.startFlock(p.x, p.z);
      }
    }
    // --- Die Rastenden ---
    const night = this.sleeping(hours);
    for (const c of this.resting) {
      if (c.id >= this.count) continue;
      c.flap += dt * (c.state === 'tanzt' ? 9 : 7);
      if (c.state === 'weg') {
        // Nach dem Auffliegen kommen sie über den See zurück
        c.timer -= dt;
        if (c.timer > 0 || dt === 0) continue;
        const near = Math.hypot(p.x - this.spots[c.spot].x, p.z - this.spots[c.spot].z) < CRANE_REST.shy + 3;
        if (near) {
          c.timer = 8;
          continue;
        }
        const at = this.wadeSpot(c);
        c.target.set(at.x, -CRANE_REST.wade, at.z);
        c.pos.set(at.x + 18, 6, at.z - 3);
        c.state = 'kommt';
        c.root.visible = true;
        continue;
      }
      if (c.state === 'fliegt') {
        c.t += dt;
        c.pos.addScaledVector(c.vel, dt);
        c.vel.y = Math.max(0.4, c.vel.y - dt * 0.6);
        c.facing = Math.atan2(c.vel.x, c.vel.z);
        this.pose(c, 0);
        if (c.t > 9) {
          c.state = 'weg';
          c.root.visible = false;
        }
        continue;
      }
      if (c.state === 'kommt') {
        const dx = c.target.x - c.pos.x;
        const dy = c.target.y - c.pos.y;
        const dz = c.target.z - c.pos.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 0.08) {
          c.pos.copy(c.target);
          c.state = night ? 'schlaeft' : 'steht';
          c.timer = this.rng.range(1, 3);
          this.pose(c, 0);
          continue;
        }
        const speed = Math.min(3.5, 0.6 + dist * 0.6);
        c.pos.x += (dx / dist) * speed * dt;
        c.pos.y += (dy / dist) * speed * dt;
        c.pos.z += (dz / dist) * speed * dt;
        c.facing = Math.atan2(dx, dz);
        this.pose(c, 0);
        continue;
      }
      // Am Boden: Wer kommt zu nahe? (Mika, ein Schlurfer) – dann fliegen alle an diesem Platz auf
      if (dt > 0) {
        const mikaDist = inside ? Infinity : Math.hypot(p.x - c.pos.x, p.z - c.pos.z);
        let scare = mikaDist < CRANE_REST.shy ? p : null;
        if (!scare) for (const zb of zombies) if (zb.state !== 'dying' && Math.hypot(zb.x - c.pos.x, zb.z - c.pos.z) < 4) scare = zb;
        if (scare) {
          this.takeOff(c.spot, scare, scare === p);
          continue;
        }
        if (c.state === 'schlaeft' && mikaDist < 8) this.moment('schlaf', c.pos.x, c.pos.z);
      }
      if (night && c.state !== 'schlaeft') {
        c.state = 'schlaeft';
        this.pose(c, 0);
        continue;
      }
      if (!night && c.state === 'schlaeft') c.state = 'steht';
      if (c.state === 'schlaeft') {
        this.pose(c, 0);
        continue;
      }
      if (c.state === 'tanzt') {
        c.t += dt;
        const hop = Math.max(0, Math.sin(c.t * 4.2)) * 0.22;
        c.pos.y = -CRANE_REST.wade + hop;
        c.facing += dt * 0.8;
        this.pose(c, 0);
        if (c.t > 2.6) {
          c.state = 'steht';
          c.pos.y = -CRANE_REST.wade;
          c.timer = this.rng.range(2, 5);
        }
        continue;
      }
      if (c.state === 'geht') {
        const dx = c.target.x - c.pos.x;
        const dz = c.target.z - c.pos.z;
        const dist = Math.hypot(dx, dz);
        c.phase += dt * 5;
        if (dist < 0.05) {
          c.state = 'steht';
          c.timer = this.rng.range(1.5, 4);
        } else {
          const step = Math.min(dist, CRANE_REST.walk * dt);
          c.pos.x += (dx / dist) * step;
          c.pos.z += (dz / dist) * step;
          c.facing = Math.atan2(dx, dz);
        }
        this.pose(c, c.phase);
        continue;
      }
      // steht: picken, schauen, ein paar Schritte, selten ein Tanz
      if (c.peck > 0) c.peck = Math.max(0, c.peck - dt);
      c.timer -= dt;
      if (c.timer <= 0 && dt > 0) {
        const r = this.rng.next();
        if (r < (CRANE_REST.dance / 60) * 8) {
          c.state = 'tanzt';
          c.t = 0;
          this.dances++;
          this.moment('tanz', c.pos.x, c.pos.z);
          if (this.rng.chance(0.5)) this.call(c.pos.x, c.pos.z, 1);
        } else if (r < 0.45) {
          c.peck = 0.6;
          c.timer = this.rng.range(1, 2.5);
        } else if (r < 0.75) {
          const at = this.wadeSpot(c, 1.3);
          c.target.set(at.x, -CRANE_REST.wade, at.z);
          c.state = 'geht';
        } else {
          c.facing += this.rng.range(-1.2, 1.2);
          c.timer = this.rng.range(1.5, 4);
        }
      }
      this.pose(c, 0);
    }
  }

  /** Für die Prüfung: Zustand der Rastenden, der Keil, Zähler. */
  info() {
    return {
      day: this.day,
      count: this.count,
      resting: this.resting.filter((c) => c.id < this.count).map((c) => ({ id: c.id, state: c.state, x: +c.pos.x.toFixed(2), y: +c.pos.y.toFixed(2), z: +c.pos.z.toFixed(2), visible: c.root.visible, spot: c.spot })),
      flock: this.flock ? { n: this.flock.n, x: +this.flock.pos.x.toFixed(2), y: +this.flock.pos.y.toFixed(2), z: +this.flock.pos.z.toFixed(2), over: this.flock.over } : null,
      flocksToday: this.flocksToday,
      plan: this.plan.map((h) => +h.toFixed(2)),
      calls: this.calls,
      dances: this.dances,
      takeoffs: this.takeoffs,
    };
  }
}
