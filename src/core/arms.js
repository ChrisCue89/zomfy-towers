// Der Waffenschrank und die Schusswaffen (M30, OFFENE-FRAGEN 168). Im Schrank in der
// Stube liegen sieben Waffen; nach der ersten gehaltenen Nacht sagt Edda, wo der
// Schlüssel liegt. Mika nimmt sich eine (oder mehrere) in die Schnellleiste, jede
// Person bekommt eine für den Notfall (M31: die Lagerglocke). Die Munition gehört
// allen und liegt im Vorrat.
//
// Ein Schuss: Mündungsfeuer über zwei Bilder, Rauch, eine Hülse, die bis zum Morgen
// liegen bleibt, Rückstoß, Trefferstopp, ein tiefer Knall mit Hall über dem See, die
// Krähen fliegen auf, Knopf bellt – und die Horde im Umkreis hört es. Treffer sprühen
// violette Sporen und Laub. Ein leeres Magazin klickt komisch.

import * as THREE from 'three';
import { T } from '../data/texts.js';
import { GUNS, ARMS_ORDER, AMMO_START, ARMS_UNLOCK_NIGHTS, CASINGS_MAX } from '../data/arms.js';
import { WEAPONS } from '../data/weapons.js';
import { P, hexToCss } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';

const SHOT_TIME = 0.26; // so lange hält Mika die Waffe im Anschlag (Pose)
const MUZZLE = { ahead: 0.62, height: 0.78 }; // Mündung: so weit vor Mika, so hoch
const TRACER_TIME = 0.07; // die Leuchtspur steht zwei, drei Bilder lang
const FLARE_FLIGHT = 0.45; // so lange fliegt die Leuchtkugel

/** Kleine Hülse (Maß 1/32): Messing für Patronen, rot für Schrot. */
function casingModel(color, cap) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 1, 0, 0, color).set(2, 0, 0, cap);
  return m;
}

export class Arms {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.cooldown = 0; // bis zum nächsten Schuss (s)
    this.reload = null; // { id, t } – lädt gerade nach
    this.tracers = []; // { x0, y0, z0, x1, y1, z1, t }
    this.flares = []; // { x, z, t, fly, from, pool }
    this.shots = 0; // für die Prüfung: so oft hat Mika geschossen
    this.lastNoise = null; // für die Prüfung: { x, z, r, n } – wer den letzten Knall gehört hat
    // Hülsen: zwei Instanz-Netze (Messing, Schrot), jede Hülse fliegt kurz und bleibt liegen
    const world = game.world;
    const make = (color, cap) => {
      const geo = casingModel(color, cap).toGeometry({ jitter: 0, seed: 7, size: 1 / 32 });
      const mesh = new THREE.InstancedMesh(geo, world.materials.world, CASINGS_MAX);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.name = 'Hülsen';
      game.scene.add(mesh);
      return mesh;
    };
    this.casingMesh = { patronen: make(P.f5, P.f6), schrot: make(P.r3, P.f5), leuchtkugeln: make(P.r2, P.s6) };
    this.casings = []; // { kind, x, y, z, vx, vy, vz, spin, rot, t, rest }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3(1, 1, 1);
    this._p = new THREE.Vector3();
  }

  get data() {
    return this.game.state.arms;
  }

  /** Kann gerade geschossen werden (Takt der Waffe, nicht beim Nachladen)? */
  get ready() {
    return this.cooldown <= 0 && !this.reload;
  }

  /** Schuss im Magazin einer Waffe. */
  mag(id) {
    return this.data.mag[id] || 0;
  }

  /** Munition im Vorrat für eine Schusswaffe. */
  reserve(id) {
    const gun = GUNS[id];
    return gun ? this.game.state.inventory[gun.ammo] || 0 : 0;
  }

  // --- Schrank ----------------------------------------------------------------------

  /** Nach der ersten gehaltenen Nacht: Edda sagt, wo der Schlüssel liegt (ihre Geschichte, immer). */
  checkUnlock() {
    const st = this.game.state;
    if (this.data.unlocked || st.stats.nightsWon < ARMS_UNLOCK_NIGHTS || this.game.nights.active) return false;
    this.data.unlocked = true;
    for (const [res, n] of Object.entries(AMMO_START)) st.inventory[res] = (st.inventory[res] || 0) + n;
    this.game.funk.say(T.waffen.schluessel);
    return true;
  }

  /** Ist die Waffe gerade bei Mika (Schnellleiste)? */
  taken(id) {
    return this.data.taken.includes(id);
  }

  /** Mika nimmt eine Waffe aus dem Schrank (in die Schnellleiste) oder legt sie zurück. */
  toggleTake(id) {
    const g = this.game;
    const st = g.state;
    if (!ARMS_ORDER.includes(id)) return false;
    if (this.taken(id)) {
      this.data.taken = this.data.taken.filter((w) => w !== id);
      const slot = st.hotbar.slots.indexOf(id);
      if (slot >= 0) st.hotbar.slots[slot] = null;
      g.updateHeldItem(false);
      g.world.refreshCabinet(this.data.taken);
      g.sound.play('aufheben', { rate: 0.8 });
      return true;
    }
    if (!st.hotbar.slots.includes(null)) {
      g.hud.toast(T.waffen.leisteVoll, 'pistole', 2.4);
      return false;
    }
    this.data.taken.push(id);
    g.addToHotbar(id);
    g.world.refreshCabinet(this.data.taken);
    g.sound.play('aufheben');
    if (GUNS[id]) g.tutorial.teach('schiessen', T.waffen.hinweisSchiessen);
    return true;
  }

  /** Wer bekommt die Waffe im Notfall? Der Reihe nach: die Bewohner, dann niemand. */
  cycleOwner(id, people) {
    const d = this.data.notfall;
    const current = people.find((p) => d[p] === id) || null;
    const order = [...people, null];
    const next = order[(order.indexOf(current) + 1) % order.length];
    if (current) d[current] = null;
    if (next) d[next] = id;
    this.game.sound.play('klick');
    return next;
  }

  // --- Schießen ---------------------------------------------------------------------

  /** Linksklick mit Schusswaffe in der Hand: Schuss in Richtung (dx, dz). */
  shoot(dx, dz) {
    const g = this.game;
    const id = g.player.heldTool;
    const gun = GUNS[id];
    if (!gun || !this.ready || g.player.action) return false;
    const st = g.state;
    if (this.mag(id) <= 0) {
      if (this.reserve(id) > 0) return this.startReload(id);
      // Leer: klickt komisch, ein Gedanke – und nichts passiert
      g.sound.play('leer');
      g.hud.showItemLabel(T.waffen.leer);
      this.cooldown = 0.45;
      return false;
    }
    const len = Math.hypot(dx, dz);
    const nx = len > 0.01 ? dx / len : Math.sin(g.player.facing);
    const nz = len > 0.01 ? dz / len : Math.cos(g.player.facing);
    const p = g.player.position;
    const started = g.player.startAction('shoot', { duration: SHOT_TIME, hitAt: 0.01, tool: id, face: { x: p.x + nx, z: p.z + nz }, long: gun.mag <= 2 && id !== 'signalpistole' });
    if (!started) return false;
    st.arms.mag[id] = this.mag(id) - 1;
    this.cooldown = 1 / gun.rate;
    this.shots++;
    const mx = p.x + nx * MUZZLE.ahead;
    const mz = p.z + nz * MUZZLE.ahead;
    const my = p.y + MUZZLE.height;
    // Wucht: Mündungsfeuer, Rauch, Hülse, Knall, Krähen, Knopf, Lärm
    g.effects.muzzle(mx, my, mz, nx, nz, gun.flare ? 'leucht' : 'feuer');
    g.sound.play(gun.flare ? 'leuchtschuss' : gun.pellets > 1 ? 'schrot' : 'schuss', { x: mx, z: mz });
    this.ejectCasing(gun.ammo, p.x, p.y + 0.72, p.z, nx, nz);
    g.world.crows?.startle?.(p.x, p.z, 20);
    this.barkKnopf();
    this.noise(p.x, p.z, gun.noise);
    // Leuchtkugel: fliegt ans Ziel und brennt dort
    if (gun.flare) {
      const reach = Math.min(gun.range, len > 0.3 ? len : gun.range);
      this.launchFlare(mx, mz, p.x + nx * reach, p.z + nz * reach, gun);
      g.feel(gun.kick, { dx: -nx, dz: -nz });
      return true;
    }
    // Kugeln: Strahlen durch die Horde
    let hits = 0;
    let killed = false;
    for (let k = 0; k < gun.pellets; k++) {
      const spread = gun.spread ? (g.effects.rng.range(-1, 1) * gun.spread * Math.PI) / 180 : 0;
      const c = Math.cos(spread);
      const s = Math.sin(spread);
      const ux = nx * c - nz * s;
      const uz = nx * s + nz * c;
      const r = this.ray(mx, mz, ux, uz, gun, id);
      hits += r.hits;
      killed ||= r.killed;
      this.tracers.push({ x0: mx, y0: my, z0: mz, x1: mx + ux * r.dist, y1: my - 0.1, z1: mz + uz * r.dist, t: TRACER_TIME });
    }
    g.feel(hits ? `${gun.kick}Treffer` : gun.kick, { dx: -nx, dz: -nz });
    if (killed) g.sound.play('treffer', { x: p.x + nx * 2, z: p.z + nz * 2, rate: 0.85 });
    return true;
  }

  /** Ein Strahl: trifft die ersten Schlurfer (1 + pierce) bis zur Reichweite. Gibt Treffer und Länge zurück. */
  ray(x0, z0, ux, uz, gun, id) {
    const g = this.game;
    const found = [];
    for (const z of g.horde.list) {
      if (z.state === 'dying' || z.y < -0.5) continue; // der Gräber unter der Erde nicht
      const dx = z.x - x0;
      const dz = z.z - z0;
      const along = dx * ux + dz * uz;
      if (along < -0.2 || along > gun.range) continue;
      const side = Math.abs(dx * uz - dz * ux);
      if (side > z.def.radius + 0.12) continue;
      found.push({ z, along });
    }
    found.sort((a, b) => a.along - b.along);
    const struck = found.slice(0, 1 + (gun.pierce || 0));
    let killed = false;
    for (const { z, along } of struck) {
      // Schrot verliert auf die Weite an Wucht (ab der halben Reichweite bis auf die Hälfte)
      const fall = gun.pellets > 1 ? 1 - 0.5 * Math.max(0, (along - gun.range * 0.5) / (gun.range * 0.5)) : 1;
      const dead = g.horde.damage(z, gun.damage * fall, { push: gun.push, fromX: x0 - ux, fromZ: z0 - uz, source: 'spieler', kind: 'kugel', by: id });
      if (dead) killed = true;
      g.effects.splat(z.x, 0.8, z.z, 'sporen', 7, 0.8);
    }
    const dist = struck.length ? struck[struck.length - 1].along : gun.range;
    return { hits: struck.length, killed, dist: Math.max(0.3, dist) };
  }

  startReload(id) {
    const g = this.game;
    if (this.reload) return false;
    this.reload = { id, t: GUNS[id].reload };
    g.sound.play('nachladen');
    g.hud.showItemLabel(T.waffen.nachladen);
    return true;
  }

  /** Lärm: Schlurfer im Umkreis hören den Knall und kommen – außer Wall und Tor stehen dazwischen. */
  noise(x, z, r) {
    const n = this.game.horde.noise?.(x, z, r) || 0;
    this.lastNoise = { x, z, r, n };
    return n;
  }

  barkKnopf() {
    const g = this.game;
    const n = g.survivors?.npcs?.list?.get('knopf');
    if (!n || !n.model.root.visible || !g.survivors.resident?.('knopf')) return;
    n.bark = 0.8;
    g.sound.play('bellen', { x: n.x, z: n.z, volume: 0.6 });
  }

  // --- Leuchtkugel ------------------------------------------------------------------

  launchFlare(x0, z0, x1, z1, gun) {
    this.flares.push({ x: x1, z: z1, from: { x: x0, z: z0 }, fly: FLARE_FLIGHT, t: gun.flare.time, radius: gun.flare.radius, blind: gun.flare.blind, pool: null, spark: 0, tick: 0 });
  }

  updateFlares(dt) {
    const g = this.game;
    for (const f of this.flares) {
      if (f.fly > 0) {
        f.fly -= dt;
        // Flugbahn: ein Bogen, eine Spur aus Funken
        const u = 1 - Math.max(0, f.fly) / FLARE_FLIGHT;
        const x = f.from.x + (f.x - f.from.x) * u;
        const z = f.from.z + (f.z - f.from.z) * u;
        const y = 0.8 + Math.sin(u * Math.PI) * 1.6;
        g.effects.splat(x, y, z, 'leucht', 1, 0.15);
        if (f.fly <= 0) {
          f.pool = g.world.lightPools.add(f.x, f.z, f.radius);
          g.sound.play('knall', { x: f.x, z: f.z, volume: 0.4 });
          f.tick = 0;
        }
        continue;
      }
      f.t -= dt;
      f.spark -= dt;
      f.tick -= dt;
      if (f.spark <= 0) {
        f.spark = 0.12;
        g.effects.splat(f.x, 0.15, f.z, 'leucht', 2, 0.35);
      }
      // Wer im Licht steht, ist geblendet (und aus dem Nebel geholt: das Licht zählt für litAt)
      if (f.tick <= 0) {
        f.tick = 1;
        for (const z of g.horde.list) {
          if (z.state === 'dying') continue;
          if (Math.hypot(z.x - f.x, z.z - f.z) <= f.radius + z.def.radius) g.horde.status(z, 'geblendet', f.blind);
        }
      }
    }
    for (const f of this.flares) if (f.t <= 0 && f.pool) g.world.lightPools.remove(f.pool);
    this.flares = this.flares.filter((f) => f.t > 0);
  }

  // --- Hülsen -----------------------------------------------------------------------

  /** Eine Hülse fliegt rechts heraus und bleibt liegen – bis zum Morgen. */
  ejectCasing(kind, x, y, z, nx, nz) {
    const list = this.casings;
    if (list.length >= CASINGS_MAX) {
      const i = list.findIndex((c) => c.kind === kind);
      if (i >= 0) list.splice(i, 1);
    }
    const r = this.game.effects.rng;
    const side = { x: -nz, z: nx }; // rechts von der Schussrichtung
    list.push({ kind, x, y, z, vx: side.x * r.range(0.9, 1.5) - nx * 0.3, vy: r.range(1.6, 2.3), vz: side.z * r.range(0.9, 1.5) - nz * 0.3, spin: r.range(8, 14), rot: r.range(0, 6), t: 0, rest: false, yaw: r.range(0, Math.PI) });
    this.refreshCasings();
  }

  updateCasings(dt) {
    let moving = false;
    for (const c of this.casings) {
      if (c.rest) continue;
      moving = true;
      c.t += dt;
      c.vy -= 9.8 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.z += c.vz * dt;
      c.rot += c.spin * dt;
      const ground = this.game.world.heightAt(c.x, c.z) + 0.015;
      if (c.y <= ground) {
        c.y = ground;
        if (Math.abs(c.vy) > 1.2) {
          c.vy = -c.vy * 0.3; // ein kleiner Hüpfer
          c.vx *= 0.5;
          c.vz *= 0.5;
          this.game.sound.play('klick', { x: c.x, z: c.z, volume: 0.4, rate: 1.4 });
        } else {
          c.rest = true;
          c.rot = Math.round(c.rot / (Math.PI / 2)) * (Math.PI / 2); // liegt flach
        }
      }
    }
    if (moving) this.refreshCasings();
  }

  refreshCasings() {
    const counts = {};
    for (const mesh of Object.values(this.casingMesh)) mesh.count = 0;
    for (const c of this.casings) {
      const mesh = this.casingMesh[c.kind];
      if (!mesh) continue;
      const i = (counts[c.kind] = (counts[c.kind] || 0) + 1) - 1;
      this._e.set(0, c.yaw, c.rest ? 0 : c.rot);
      this._q.setFromEuler(this._e);
      this._p.set(c.x, c.y, c.z);
      mesh.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
      mesh.count = i + 1;
    }
    for (const mesh of Object.values(this.casingMesh)) mesh.instanceMatrix.needsUpdate = true;
  }

  /** Neuer Morgen: Die Hülsen der Nacht sind aufgesammelt. */
  morning() {
    this.casings = [];
    this.refreshCasings();
  }

  // --- Takt -------------------------------------------------------------------------

  update(dt) {
    const g = this.game;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reload) {
      this.reload.t -= dt;
      if (this.reload.t <= 0) {
        const id = this.reload.id;
        const gun = GUNS[id];
        const st = g.state;
        const need = gun.mag - this.mag(id);
        const got = Math.min(need, st.inventory[gun.ammo] || 0);
        st.inventory[gun.ammo] -= got;
        st.arms.mag[id] = this.mag(id) + got;
        this.reload = null;
        g.sound.play('klick', { rate: 0.7 });
      }
    }
    for (const t of this.tracers) t.t -= dt;
    this.tracers = this.tracers.filter((t) => t.t > 0);
    this.updateFlares(dt);
    this.updateCasings(dt);
    if (g.mode === 'play') this.checkUnlock();
  }

  /** Leuchtspuren: eine helle Linie von der Mündung zum Treffer (ganze Pixel). */
  draw(ui) {
    if (!this.tracers.length) return;
    const g = this.game;
    const ctx = ui.ctx;
    for (const t of this.tracers) {
      const a = g.worldToUi(t.x0, t.y0, t.z0);
      const b = g.worldToUi(t.x1, t.y1, t.z1);
      if (!a || !b) continue;
      const steps = Math.max(1, Math.round(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))));
      ctx.fillStyle = TRACER_CORE;
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        if (u > 0.85 && k % 2) continue; // das Ende franst aus
        ctx.fillRect(Math.round(a.x + (b.x - a.x) * u), Math.round(a.y + (b.y - a.y) * u), 1, 1);
      }
    }
  }

  /** Für die Prüfung: was gerade los ist. */
  info() {
    const st = this.game.state;
    return {
      unlocked: this.data.unlocked,
      taken: [...this.data.taken],
      notfall: { ...this.data.notfall },
      mag: { ...this.data.mag },
      ammo: { patronen: st.inventory.patronen || 0, schrot: st.inventory.schrot || 0, leuchtkugeln: st.inventory.leuchtkugeln || 0 },
      reload: this.reload ? { ...this.reload } : null,
      cooldown: this.cooldown,
      shots: this.shots,
      casings: this.casings.length,
      casingsResting: this.casings.filter((c) => c.rest).length,
      flares: this.flares.map((f) => ({ x: f.x, z: f.z, t: f.t, lit: Boolean(f.pool) })),
      tracers: this.tracers.length,
      noise: this.lastNoise ? { ...this.lastNoise } : null,
      weapons: ARMS_ORDER.map((id) => ({ id, gun: Boolean(GUNS[id]), melee: Boolean(WEAPONS[id]), taken: this.taken(id) })),
    };
  }
}

const TRACER_CORE = hexToCss(P.f8);
