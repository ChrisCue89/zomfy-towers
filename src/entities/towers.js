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
// Mischtürme (M20, mixes.js) stehen auf zwei Feldern und kämpfen auf eigene Art:
//   Kürbisballiste     schwerer Bolzen durchschlägt eine Reihe, platzt am Ende
//   Eiszapfenschleuder Eiszapfen machen frostig, ein Eisblock zerspringt dreifach
//   Leuchtpfeil        markiert sein Ziel (alle Türme treffen härter), blendet
//   Matschkessel       Matsch im Bogen: matschig, der Boden klebt
//   Feuerwerk          Rakete, dann Kettenexplosionen – brennt und blendet
//   Nebelleuchte       leuchtender Nebel: nass, geblendet, ein Stück zurück
//   Glühschwarm        Bienen, die stechen und blenden
//   Wetterhahn         Sprühstoß im Wind: nass und zurückgeschoben
//
// Kaputte Türme (Haltbarkeit 0) tun nichts, bis sie repariert sind.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { towerStatsOf, hasPart, TOWER_PARTS } from '../data/towers.js';
import { BUILDINGS } from '../data/buildings.js';
import { REACTIONS, WEATHER_EFFECTS } from '../data/reactions.js';
import { dampAngle } from '../core/math.js';

const MAX_PROJECTILES = 120;
const HEAD_Y = {
  bolzen: 1.2,
  katapult: 0.9,
  sprenger: 1.3,
  laternenturm: 2.2,
  glockenturm: 1.75,
  windrad: 2.05,
  bienenkorb: 1.0,
  vogelscheuche: 1.35,
  // M20: Mischtürme
  kuerbisballiste: 1.15,
  eiszapfen: 1.2,
  leuchtpfeil: 1.35,
  matschkessel: 1.0,
  feuerwerk: 1.15,
  nebelleuchte: 1.7,
  gluehschwarm: 1.05,
  wetterhahn: 2.1,
};
/** Mischtürme (M20): Geschosse im Bild (Pools) und ihr Tempo. */
const PROJECTILE_POOL = { bolt: 'bolt', pumpkin: 'pumpkin', mini: 'mini', spear: 'spear', icicle: 'icicle', glow: 'glow', mud: 'mud', rocket: 'rocket' };
const STRAIGHT = new Set(['bolt', 'spear', 'icicle', 'glow']);
/** Mischtürme mit Laterne: Nebel kürzt ihre Reichweite nicht. */
const LIT_MIX = new Set(['leuchtpfeil', 'feuerwerk', 'nebelleuchte', 'gluehschwarm']);
/** Kürbisballiste: so nah (m) an der Flugbahn trifft der schwere Bolzen. */
const SPEAR_REACH = 0.5;
/** Feuerwerk: so weit (m) springt die nächste Explosion, so lange (s) dauert es bis dahin. */
const CHAIN_REACH = 2.6;
const CHAIN_DELAY = 0.2;
/** Bienen (M19): je Schwarm so viele, höchstens so viele im Bild; Flugtempo (m/s). */
const BEES_PER_SWARM = 9;
const MAX_BEES = 270;
const BEE_SPEED = 4.2;
/** So nah (m) sticht der Schwarm. */
const BEE_REACH = 0.4;

const FINE = 1 / 16; // Geschosse im feinen Maß (M12)

function boltModel() {
  const m = new VoxelModel();
  m.box(0, 0, -4, 0, 0, 3, P.e8); // Schaft
  m.set(0, 0, 4, P.s8).set(0, 0, 5, P.s9); // Spitze
  for (const z of [-4, -3]) m.set(-1, 0, z, P.a4).set(1, 0, z, P.a4); // Federn
  // Leuchtspur dahinter, zwei Voxel breit: auch nachts sieht man, wohin der Turm schießt (m3-r1)
  m.box(0, 0, -12, 1, 0, -5, (x, y, z) => (z >= -8 ? 0xfff0c8 : 0xffd98a));
  return m;
}

/** Kürbislaterne: gerippt, mit Stiel und leuchtendem Gesicht – auch nachts gut zu sehen. */
function pumpkinModel(size) {
  const m = new VoxelModel();
  const r = size * 2;
  m.ellipsoid(0, r, 0, r + 0.4, r * 0.85 + 0.3, r + 0.4, (x) => (((x % 2) + 2) % 2 ? P.f4 : P.f5));
  // Gesicht nach vorn: Augen und Mund leuchten
  const face = size > 1 ? [[-2, r + 1], [1, r + 1], [-2, r - 1], [-1, r - 1], [0, r - 1], [1, r - 1]] : [[-1, r], [0, r]];
  for (const [x, y] of face) {
    let z = r + 2;
    while (z > -r - 2 && !m.has(x, y, z)) z--;
    m.set(x, y, z, 0xfff2a0);
  }
  let top = r;
  while (m.has(0, top + 1, 0)) top++;
  m.set(0, top + 1, 0, P.g6).set(0, top + 2, 0, P.g5); // Stiel
  return m;
}

/** Kürbisballiste (M20): langer, dicker Schaft mit kleinem Kürbis als Spitze. */
function spearModel() {
  const m = new VoxelModel();
  m.box(0, 0, -7, 0, 1, 4, P.e6); // Schaft
  m.box(-1, 0, 5, 1, 1, 7, P.f4).set(0, 2, 6, P.g5); // Kürbisspitze mit Stiel
  for (const z of [-7, -6]) m.set(-1, 0, z, P.r3).set(1, 0, z, P.r3); // Federn
  m.box(0, 0, -14, 1, 0, -8, (x, y, z) => (z >= -10 ? 0xfff0c8 : P.f6)); // Leuchtspur
  return m;
}

/** Eiszapfen (M20): hellblauer Zapfen, vorn spitz. */
function icicleModel() {
  const m = new VoxelModel();
  m.box(-1, 0, -3, 1, 1, 1, (x, y, z) => (z === -3 ? 0xe8f8ff : 0xa8dcff));
  m.box(0, 0, 2, 0, 1, 4, 0xe8f8ff).set(0, 0, 5, 0xffffff);
  m.box(0, 0, -9, 0, 0, -4, 0xd8f0ff); // Frosthauch
  return m;
}

/** Leuchtpfeil (M20): Bolzen mit glühender Spitze und langer Lichtspur. */
function glowModel() {
  const m = boltModel();
  m.set(0, 0, 4, 0xfff6d8).set(0, 0, 5, 0xffffff).set(-1, 0, 4, P.f8).set(1, 0, 4, P.f8);
  m.box(0, 0, -18, 0, 0, -13, P.f8);
  return m;
}

/** Matschklumpen (M20): braune Kugel mit Spritzern. */
function mudModel() {
  const m = new VoxelModel();
  m.ellipsoid(0, 3, 0, 3.4, 2.9, 3.4, (x, y, z) => ((x + y + z) % 3 === 0 ? P.e2 : P.e3));
  m.set(0, 6, 0, P.e4).set(2, 5, 1, P.e4);
  return m;
}

/** Rakete (M20): roter Leib, goldene Spitze, Funkenschweif. */
function rocketModel() {
  const m = new VoxelModel();
  m.box(-1, -1, -3, 1, 1, 3, (x, y, z) => (z === 0 ? P.f7 : P.r3));
  m.set(0, 0, 4, P.f7).set(0, 0, 5, P.f8);
  m.box(0, 0, -8, 0, 0, -4, (x, y, z) => (z >= -5 ? 0xfff6d8 : P.f6));
  return m;
}

/** Biene (M19): gelb-schwarzer Leib und helle Flügel – im Maß 1/32 ein paar Pixel groß. */
function beeModel() {
  const m = new VoxelModel();
  m.set(0, 0, 1, P.f6).set(0, 0, 0, P.n1).set(0, 0, -1, P.f6).set(0, 0, 2, P.n1);
  m.set(-1, 1, 0, P.s9).set(1, 1, 0, P.s9);
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
    this.stickies = []; // klebrige Flächen (Klebekürbis, M18)
    this.swarms = []; // Bienenschwärme (M19): { tower, x, y, z, target, acc }
    this.bursts = []; // Feuerwerk (M20): Kettenexplosionen, die noch kommen
    this.maxPierce = 0; // Kürbisballiste (M20, Prüfung): die meisten Treffer eines Bolzens
    this.lured = 0; // wie viele Schlurfer gerade eine Vogelscheuche anlocken (M19, Prüfung)
    this.boost = 1; // Schaden aller Türme mal so viel (M23: nach dem Fest am Feuer; setzt das Spiel)
    this.time = 0;
    const basic = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.meshes = {
      bolt: new THREE.InstancedMesh(boltModel().toGeometry({ jitter: 0, ao: false, size: FINE }), basic, MAX_PROJECTILES),
      pumpkin: new THREE.InstancedMesh(pumpkinModel(2).toGeometry({ jitter: 0, ao: false, size: FINE }), basic, MAX_PROJECTILES),
      mini: new THREE.InstancedMesh(pumpkinModel(1).toGeometry({ jitter: 0, ao: false, size: FINE }), basic, MAX_PROJECTILES),
      bee: new THREE.InstancedMesh(beeModel().toGeometry({ jitter: 0, ao: false, size: FINE / 2 }), basic, MAX_BEES),
      // M20: Geschosse der Mischtürme
      spear: new THREE.InstancedMesh(spearModel().toGeometry({ jitter: 0, ao: false, size: FINE }), basic, MAX_PROJECTILES),
      icicle: new THREE.InstancedMesh(icicleModel().toGeometry({ jitter: 0, ao: false, size: FINE }), basic, MAX_PROJECTILES),
      glow: new THREE.InstancedMesh(glowModel().toGeometry({ jitter: 0, ao: false, size: FINE }), basic, MAX_PROJECTILES),
      mud: new THREE.InstancedMesh(mudModel().toGeometry({ jitter: 0, ao: false, size: FINE }), basic, MAX_PROJECTILES),
      rocket: new THREE.InstancedMesh(rocketModel().toGeometry({ jitter: 0, ao: false, size: FINE }), basic, MAX_PROJECTILES),
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
    this.stickies.length = 0;
    this.swarms.length = 0;
    this.bursts.length = 0;
  }

  /** Mittelpunkt und Kopfhöhe eines Turms (Mischtürme: Mitte beider Felder, M20). */
  origin(t) {
    if (BUILDINGS[t.type]?.w === 2) {
      const across = (t.turns || 0) % 2 === 0;
      return { x: t.i + (across ? 1 : 0.5), y: HEAD_Y[t.type], z: t.j + (across ? 0.5 : 1) };
    }
    return { x: t.i + 0.5, y: HEAD_Y[t.type], z: t.j + 0.5 };
  }

  /** Stärke der Laternen-Aura an jedem Turm (größter Bonus zählt). */
  updateAuras(towers) {
    for (const t of towers) t.aura = 0;
    for (const L of towers) {
      if (L.type !== 'laternenturm' || L.hp <= 0) continue;
      const s = towerStatsOf(L);
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
      const s = towerStatsOf(L);
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
      const s = towerStatsOf(L);
      if ((x - L.i - 0.5) ** 2 + (z - L.j - 0.5) ** 2 <= s.range * s.range) best = Math.max(best, s.luck);
    }
    return best;
  }

  /**
   * Wetter (M18): Nebel kürzt die Reichweite – außer der Turm steht im Schein
   * einer Laterne oder eines Laternenturms –, Wind trägt Kürbisse weiter.
   */
  weatherRange(t) {
    const kind = this.world.weather.kind;
    if (kind === 'nebel') {
      if (LIT_MIX.has(t.type)) return 1; // M20: Mischtürme mit Laterne leuchten sich selbst den Weg
      const o = this.origin(t);
      const lit = this.lightSlow(o.x, o.z) > 0 || this.world.buildings.gearSlow(o.x, o.z) > 0 || this.windAt(o.x, o.z); // M19: das Windrad verweht den Nebel
      return lit ? 1 : WEATHER_EFFECTS.nebel.range;
    }
    if (kind === 'wind' && t.type === 'katapult') return WEATHER_EFFECTS.wind.catapult;
    return 1;
  }

  /** Weht hier ein Windrad (M19)? Dann verweht es den Nebel. */
  windAt(x, z) {
    for (const W of this.world.buildings.list) {
      if (W.type !== 'windrad' || W.hp <= 0) continue;
      const r = towerStatsOf(W).range;
      if ((x - W.i - 0.5) ** 2 + (z - W.j - 0.5) ** 2 <= r * r) return true;
    }
    return false;
  }

  /** Ziele im Umkreis, sortiert nach Priorität. */
  targets(t, range, n, strongest, minRange = 0) {
    range *= this.weatherRange(t);
    const o = this.origin(t);
    const pathing = this.world.pathing;
    const list = [];
    for (const z of this.horde.list) {
      if (z.state === 'dying' || z.state === 'enter' || this.horde.isHidden(z)) continue; // M22: im Nebel nur im Licht
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
      // Angefeuert (M16): Die Abklingzeit läuft schneller ab
      const haste = t.hasteT > 0 ? 1 + (t.haste || 0) : 1;
      if (t.hasteT > 0) {
        t.hasteT -= dt;
        t.cheerAcc = (t.cheerAcc || 0) + dt;
        if (t.cheerAcc > 0.35) {
          t.cheerAcc = 0;
          const o = this.origin(t);
          this.effects.splat(o.x, o.y + 0.5, o.z, 'licht', 2, 0.35);
        }
      }
      t.cool = Math.max(0, (t.cool ?? 0.5) - dt * haste);
      t.kick = Math.max(0, (t.kick || 0) - dt * 4);
      // Die Vogelscheuche fällt um, wenn sie nichts mehr aushält (M19) – bis Mika sie flickt
      if (t.type === 'vogelscheuche' && t.object) t.object.rotation.x = t.hp <= 0 ? -Math.PI / 2 : 0;
      if (t.hp <= 0) continue;
      const s = towerStatsOf(t);
      const mult = (1 + (t.aura || 0)) * this.boost; // boost: nach dem Fest am Feuer (M23)
      const coolBefore = t.cool;
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
        // M19: Familien aus den Bauplänen
        case 'glockenturm':
          this.runBell(t, s, mult, dt);
          break;
        case 'windrad':
          this.runWindmill(t, s, dt);
          break;
        case 'bienenkorb':
          this.runHive(t, s, dt);
          break;
        case 'vogelscheuche':
          this.runScarecrow(t, s, mult, dt);
          break;
        // M20: Mischtürme
        case 'kuerbisballiste':
          this.runSpear(t, s, mult, dt);
          break;
        case 'eiszapfen':
        case 'leuchtpfeil':
          this.runHoming(t, s, mult, dt, t.type === 'eiszapfen' ? 'icicle' : 'glow');
          break;
        case 'matschkessel':
        case 'feuerwerk':
          this.runLob(t, s, mult, dt, t.type === 'matschkessel' ? 'mud' : 'rocket');
          break;
        case 'nebelleuchte':
          this.runFogLamp(t, s, mult, dt);
          break;
        case 'gluehschwarm':
          this.runHive(t, s, dt);
          break;
        case 'wetterhahn':
          this.runVane(t, s, mult, dt);
          break;
        default:
          break;
      }
      // Uhrwerk (M21): jeder vierte Schuss kommt gleich noch einmal
      if (t.cool > coolBefore && hasPart(t, 'uhrwerk')) {
        t.shots = (t.shots || 0) + 1;
        if (t.shots % TOWER_PARTS.uhrwerk.double === 0) t.cool = Math.min(t.cool, 0.12);
      }
      if (t.head) this.poseHead(t, dt);
    }
    this.updateProjectiles(dt);
    this.updateFires(dt);
    this.updateStickies(dt);
    this.updateSwarms(dt);
    this.updateBursts(dt);
  }

  /** Kopf eines Turms bewegen: zielen und Rückstoß; Glocke schwingt, Windrad dreht sich (M19). */
  poseHead(t, dt) {
    const a = t.headAngle || 0;
    if (t.type === 'glockenturm') {
      // Die Glocke schwingt nach dem Schlag seitlich aus
      const sw = t.swing || 0;
      t.head.rotation.set(0, 0, Math.sin((1 - sw) * 16) * 0.45 * sw);
      return;
    }
    if (t.type === 'windrad') {
      t.spin = (t.spin || 0) + dt * (1.4 + (t.gust || 0) * 9);
      t.head.rotation.set(0, 0, t.spin);
      return;
    }
    if (t.type === 'vogelscheuche') {
      // Der Kürbiskopf schaut, wen er lockt, und wackelt bei jedem Schlag
      t.head.rotation.set(0, a, Math.sin(this.time * 30) * 0.12 * (t.shake || 0));
      t.shake = Math.max(0, (t.shake || 0) - dt * 3);
      return;
    }
    if (t.type === 'wetterhahn') {
      // Wetterhahn (M20): dreht sich zum Ziel, die Flügel laufen, beim Stoß schneller
      t.spin = (t.spin || 0) + dt * (1.2 + (t.gust || 0) * 8);
      t.head.rotation.set(0, a, t.spin);
      return;
    }
    // Rückstoß entgegen der Schussrichtung; beim Katapult (und Matschkessel) schnellt der Wurfarm vor
    t.head.rotation.y = a;
    const lob = t.type === 'katapult' || t.type === 'matschkessel';
    const back = lob ? 0.02 : 0.07;
    t.head.position.x = -Math.sin(a) * t.kick * back;
    t.head.position.z = -Math.cos(a) * t.kick * back;
    t.head.rotation.x = lob ? Math.sin(Math.min(1, t.kick) * Math.PI) * 0.55 : 0;
  }

  /**
   * Glockenturm (M19): Ist jemand in Reichweite, schlägt die Glocke – alle ringsum
   * nehmen Schaden und stehen kurz betäubt. Die Friedensglocke flickt dabei
   * Barrikaden, Tor und Wall im Umkreis.
   */
  runBell(t, s, mult, dt) {
    t.swing = Math.max(0, (t.swing || 0) - dt * 0.9);
    if (t.cool > 0) return;
    const o = this.origin(t);
    const range = s.range * this.weatherRange(t);
    const list = this.horde.inRange(o.x, o.z, range);
    if (!list.some((z) => z.state !== 'enter')) return;
    t.cool = 1 / s.rate;
    t.swing = 1;
    for (const z of list) {
      if (z.state === 'enter') continue;
      if (this.horde.damage(z, s.damage * mult, { source: 'turm', lucky: hasPart(t, 'gluecksmuenze'), by: t.id, kind: 'glocke' })) continue;
      this.horde.stun(z, s.stun);
    }
    const healed = s.heal ? this.world.buildings.healAround(o.x, o.z, range, s.heal) : 0;
    this.cb.onBell?.(t, o, range, healed);
  }

  /**
   * Windrad (M19): Ein Windstoß schiebt alle in Reichweite ein Stück den Weg
   * zurück (gegen das Flussfeld) und bremst sie kurz.
   */
  runWindmill(t, s, dt) {
    t.gust = Math.max(0, (t.gust || 0) - dt * 1.2);
    if (t.cool > 0) return;
    const o = this.origin(t);
    const list = this.horde.inRange(o.x, o.z, s.range * this.weatherRange(t));
    if (!list.some((z) => z.state !== 'enter')) return;
    t.cool = 1 / s.rate;
    t.gust = 1;
    for (const z of list) {
      if (z.state === 'enter') continue;
      this.horde.blowBack(z, s.push);
      this.horde.slow(z, s.slow, s.slowTime);
      this.effects.splat(z.x, 0.6, z.z, 'wasser', 2, 0.4);
    }
    this.cb.onGust?.(t, o);
  }

  /**
   * Bienenkorb (M19): Er schickt so viele Schwärme aus, wie seine Stufe zählt –
   * jeder zu einem eigenen Ziel. Die Schwärme selbst fliegen in updateSwarms.
   */
  runHive(t, s, dt) {
    let active = 0;
    for (const sw of this.swarms) if (sw.tower === t.id) active++;
    if (active >= s.swarms || t.cool > 0) return;
    const target = this.beeTarget(t, s, null);
    if (!target) return;
    const o = this.origin(t);
    this.swarms.push({ tower: t.id, x: o.x, y: o.y, z: o.z, target, acc: 0, phase: Math.random() * 6.28 });
    t.cool = 0.5;
    this.cb.onSwarm?.(t, o);
  }

  /** Nächstes Ziel eines Schwarms: in Reichweite des Korbs, möglichst eines, das noch kein Schwarm dieses Korbs hat. */
  beeTarget(t, s, current) {
    const list = this.targets(t, s.range, 6, false); // targets() rechnet das Wetter selbst ein
    for (const z of list) {
      if (z === current) continue;
      let taken = false;
      for (const sw of this.swarms) if (sw.tower === t.id && sw.target === z) taken = true;
      if (!taken) return z;
    }
    return list[0] || null;
  }

  updateSwarms(dt) {
    for (let i = this.swarms.length - 1; i >= 0; i--) {
      const sw = this.swarms[i];
      const t = this.world.buildings.get(sw.tower);
      if (!t || t.hp <= 0) {
        this.swarms.splice(i, 1);
        continue;
      }
      const s = towerStatsOf(t);
      const o = this.origin(t);
      const z = sw.target;
      const range = s.range * this.weatherRange(t);
      if (!z || z.state === 'dying' || (z.x - o.x) ** 2 + (z.z - o.z) ** 2 > (range + 1) ** 2) sw.target = this.beeTarget(t, s, z);
      const goal = sw.target;
      const gx = goal ? goal.x : o.x;
      const gy = goal ? 1.1 * goal.def.scale : o.y;
      const gz = goal ? goal.z : o.z;
      const dx = gx - sw.x;
      const dy = gy - sw.y;
      const dz = gz - sw.z;
      const d = Math.hypot(dx, dy, dz);
      const step = BEE_SPEED * dt;
      if (d > step) {
        sw.x += (dx / d) * step;
        sw.y += (dy / d) * step;
        sw.z += (dz / d) * step;
      } else {
        sw.x = gx;
        sw.y = gy;
        sw.z = gz;
      }
      if (!goal) {
        if (d < 0.2) this.swarms.splice(i, 1); // zurück im Korb
        continue;
      }
      if (d > BEE_REACH) continue;
      // Stechen: Schaden je Sekunde, in ganzen Punkten (wie ein Brand), durch jede Panzerung
      sw.acc += s.damage * (1 + (t.aura || 0)) * dt;
      if (sw.acc >= 1) {
        const n = Math.floor(sw.acc);
        sw.acc -= n;
        const dead = this.horde.damage(goal, n, { pierce: true, source: 'turm', lucky: hasPart(t, 'gluecksmuenze'), by: t.id, kind: 'bienen' });
        if (!dead && s.blind) {
          // Glühschwarm (M20): leuchtende Bienen blenden – ein Bolzen trifft danach die Schwachstelle
          this.horde.status(goal, 'geblendet', s.blind);
          if (Math.random() < 0.3) this.effects.splat(goal.x, 1.1, goal.z, 'licht', 2, 0.3);
        }
        if (!dead && s.slow) {
          this.horde.slow(goal, s.slow, s.slowTime);
          if (Math.random() < 0.3) this.effects.splat(goal.x, 0.9, goal.z, 'honig', 2, 0.3);
        }
      }
    }
  }

  /**
   * Vogelscheuche (M19): Solange sie steht, lockt sie Schlurfer in Reichweite
   * vom Weg auf sich (höchstens `lure` zugleich, je `lureTime` Sekunden); die
   * schlagen auf sie ein, bis sie umfällt oder die Zeit um ist. Die
   * Krähenscheuche lässt Krähen nach den Gelockten picken.
   */
  runScarecrow(t, s, mult, dt) {
    const o = this.origin(t);
    let lured = 0;
    let first = null;
    for (const z of this.horde.list) {
      if (z.state === 'raid' && z.lureBy === t.id) {
        lured++;
        first = first || z;
        if (s.damage) {
          z.peckAcc = (z.peckAcc || 0) + s.damage * mult * dt;
          if (z.peckAcc >= 1) {
            const n = Math.floor(z.peckAcc);
            z.peckAcc -= n;
            if (Math.random() < 0.25) this.effects.splat(z.x, 1.4 * z.def.scale, z.z, 'federn', 2, 0.4);
            this.horde.damage(z, n, { source: 'turm', lucky: hasPart(t, 'gluecksmuenze'), by: t.id, kind: 'kraehen' });
          }
        }
      }
    }
    this.lured = Math.max(this.lured, lured);
    if (first) t.headAngle = dampAngle(t.headAngle || 0, Math.atan2(first.x - o.x, first.z - o.z), 3, dt);
    if (lured >= s.lure || t.cool > 0) return;
    t.cool = 0.4;
    // Wer auf dem Weg an ihr vorbeikommt (nicht schon gelockt, nicht auf der Jagd nach Mika)
    for (const z of this.targets(t, s.range, s.lure - lured, false)) {
      if (z.state !== 'walk' || z.lureBy || z.lureAgain > this.horde.time) continue;
      this.horde.lureTo(z, t, s.lureTime);
      this.cb.onLure?.(t, z);
    }
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
      this.projectiles.push({ kind: 'bolt', x: o.x, y: o.y, z: o.z, target: z, tx: z.x, tz: z.z, speed: 13, damage: s.damage * mult, pierce: Boolean(s.pierce), angle: 0, lucky: hasPart(t, 'gluecksmuenze'), by: t.id });
    }
    this.cb.onShot?.('bolzen', o.x, o.z);
  }

  /** Ziel im Bogen: das mit den meisten Nachbarn im Splash-Radius (gegen Gruppen), sonst null. */
  groupTarget(t, s) {
    const candidates = this.targets(t, s.range, 12, false, 1.2);
    if (!candidates.length) return null;
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
    return best;
  }

  runCatapult(t, s, mult, dt) {
    const best = this.groupTarget(t, s);
    if (!best) {
      this.scan(t, dt);
      return;
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
    this.projectiles.push({ kind: 'pumpkin', x0: o.x, y0: o.y + 0.4, z0: o.z, x1: tx, z1: tz, t: 0, T: 0.75 + dist * 0.05, h: 1.4 + dist * 0.15, damage: s.damage * mult, splash: s.splash, burn: s.burn || 0, split: s.split || 0, x: o.x, y: o.y, z: o.z, lucky: hasPart(t, 'gluecksmuenze'), by: t.id });
    this.cb.onShot?.('katapult', o.x, o.z);
  }

  runSprinkler(t, s, mult, dt) {
    const o = this.origin(t);
    const inRange = this.horde.inRange(o.x, o.z, s.range * this.weatherRange(t));
    const kind = t.spec === 'A' ? 'frost' : t.spec === 'B' ? 'schlamm' : 'wasser';
    // Zustand (M18): Wasser macht nass, Frostnebel frostig, Schlamm matschig
    const status = t.spec === 'A' ? 'frostig' : t.spec === 'B' ? 'matschig' : 'nass';
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
      if (this.horde.damage(z, s.damage * mult, { push: s.push || 0, fromX: o.x, fromZ: o.z, source: 'turm', lucky: hasPart(t, 'gluecksmuenze'), by: t.id, kind: 'spray' })) continue;
      this.horde.slow(z, s.slow, s.slowTime);
      this.horde.status(z, status);
      if (freezeNow) {
        this.horde.freeze(z, s.freeze);
        this.effects.splat(z.x, 0.6, z.z, 'frost', 6, 0.6);
      }
    }
  }

  // --- M20: Mischtürme ---------------------------------------------------------------

  /**
   * Kürbisballiste: Ein schwerer Bolzen fliegt gerade durch die Reihe – er trifft
   * bis zu `pierce` Schlurfer auf seiner Bahn (durch jede Panzerung) und platzt
   * am Ende wie ein Kürbis.
   */
  runSpear(t, s, mult, dt) {
    const list = this.targets(t, s.range, 1, false);
    if (!list.length) {
      this.scan(t, dt);
      return;
    }
    const off = this.aim(t, list[0], dt, 5);
    if (t.cool > 0 || off > 0.2) return;
    t.cool = 1 / s.rate;
    t.kick = 1;
    const o = this.origin(t);
    const dx = list[0].x - o.x;
    const dz = list[0].z - o.z;
    const d = Math.hypot(dx, dz) || 1;
    const reach = s.range * this.weatherRange(t) + 1.5;
    this.projectiles.push({ kind: 'spear', x: o.x, y: o.y, z: o.z, dx: dx / d, dz: dz / d, left: reach, speed: 15, angle: Math.atan2(dx, dz), damage: s.damage * mult, pierce: s.pierce, burst: s.burst * mult, splash: s.splash, hit: [], lucky: hasPart(t, 'gluecksmuenze'), by: t.id });
    this.cb.onShot?.('ballista', o.x, o.z);
  }

  /** Eiszapfenschleuder und Leuchtpfeil: zielsuchende Geschosse wie der Bolzen, mit eigener Wirkung. */
  runHoming(t, s, mult, dt, kind) {
    const list = this.targets(t, s.range, 1, Boolean(s.strongest));
    if (!list.length) {
      this.scan(t, dt);
      return;
    }
    const off = this.aim(t, list[0], dt, 10);
    if (t.cool > 0 || off > 0.4) return;
    t.cool = 1 / s.rate;
    t.kick = 1;
    const o = this.origin(t);
    const z = list[0];
    this.projectiles.push({ kind, x: o.x, y: o.y, z: o.z, target: z, tx: z.x, tz: z.z, speed: kind === 'icicle' ? 12 : 16, damage: s.damage * mult, angle: 0, lucky: hasPart(t, 'gluecksmuenze'), by: t.id, frost: s.frost || 0, slow: s.slow || 0, slowTime: s.slowTime || 0, shatter: s.shatter || 1, mark: s.mark || 0, markBonus: s.markBonus || 0, blind: s.blind || 0 });
    this.cb.onShot?.('bolzen', o.x, o.z);
  }

  /** Matschkessel und Feuerwerk: im Bogen auf die dichteste Gruppe, wie das Katapult. */
  runLob(t, s, mult, dt, kind) {
    const best = this.groupTarget(t, s);
    if (!best) {
      this.scan(t, dt);
      return;
    }
    const off = this.aim(t, best, dt, 6);
    if (t.cool > 0 || off > 0.3) return;
    t.cool = 1 / s.rate;
    t.kick = 1;
    const o = this.origin(t);
    const lead = 0.5 * best.speed * (1 - best.slow);
    const tx = best.x + Math.sin(best.facing) * lead;
    const tz = best.z + Math.cos(best.facing) * lead;
    const dist = Math.hypot(tx - o.x, tz - o.z);
    const rocket = kind === 'rocket';
    this.projectiles.push({
      kind,
      x0: o.x,
      y0: o.y + 0.3,
      z0: o.z,
      x1: tx,
      z1: tz,
      t: 0,
      T: rocket ? 0.5 + dist * 0.035 : 0.75 + dist * 0.05,
      h: rocket ? 2 + dist * 0.2 : 1.3 + dist * 0.15,
      damage: s.damage * mult,
      splash: s.splash,
      burn: s.burn || 0,
      split: 0,
      x: o.x,
      y: o.y,
      z: o.z,
      lucky: hasPart(t, 'gluecksmuenze'),
      by: t.id,
      // Matschkessel
      mud: s.mud || 0,
      slow: s.slow || 0,
      slowTime: s.slowTime || 0,
      sticky: s.sticky || 0,
      stickySlow: s.stickySlow || 0,
      // Feuerwerk
      firework: rocket,
      chain: s.chain || 0,
      blind: s.blind || 0,
    });
    this.cb.onShot?.(rocket ? 'rakete' : 'katapult', o.x, o.z);
  }

  /**
   * Nebelleuchte: Ein leuchtender Nebelstoß rundum – nass, geblendet, gebremst
   * und ein Stück den Weg zurück (die Horde verliert die Richtung).
   */
  runFogLamp(t, s, mult, dt) {
    const o = this.origin(t);
    t.headAngle = (t.headAngle || 0) + dt * 0.6; // die Linse dreht sich langsam
    const range = s.range * this.weatherRange(t);
    if (t.cool > 0) return;
    const list = this.horde.inRange(o.x, o.z, range);
    if (!list.length) return;
    t.cool = 1 / s.rate;
    t.kick = 1;
    for (let k = 0; k < 14; k++) this.effects.spray(o.x, o.y - 0.5, o.z, (k / 14) * Math.PI * 2, range * 0.8, 'nebel');
    this.effects.splat(o.x, o.y, o.z, 'licht', 8, 0.8);
    for (const z of list) {
      if (this.horde.damage(z, s.damage * mult, { source: 'turm', lucky: hasPart(t, 'gluecksmuenze'), by: t.id, kind: 'spray' })) continue;
      this.horde.status(z, 'nass', s.wet);
      this.horde.status(z, 'geblendet', s.blind);
      this.horde.slow(z, s.slow, s.slowTime);
      this.horde.blowBack(z, s.push);
    }
    this.cb.onShot?.('nebel', o.x, o.z);
  }

  /** Wetterhahn: ein Sprühstoß im Wind, als Kegel zum Ziel – nass, gebremst, zurückgeschoben. */
  runVane(t, s, mult, dt) {
    t.gust = Math.max(0, (t.gust || 0) - dt * 1.2);
    const list = this.targets(t, s.range, 1, false);
    if (!list.length) {
      this.scan(t, dt);
      return;
    }
    const off = this.aim(t, list[0], dt, 4);
    if (t.cool > 0 || off > 0.35) return;
    t.cool = 1 / s.rate;
    t.gust = 1;
    const o = this.origin(t);
    const a = t.headAngle || 0;
    const range = s.range * this.weatherRange(t);
    for (let k = 0; k < 16; k++) this.effects.spray(o.x, o.y - 0.7, o.z, a + (k / 15 - 0.5) * 2 * s.cone, range * 0.6, 'wasser');
    for (const z of this.horde.inRange(o.x, o.z, range)) {
      let diff = Math.abs(Math.atan2(z.x - o.x, z.z - o.z) - a) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff > s.cone) continue;
      if (this.horde.damage(z, s.damage * mult, { source: 'turm', lucky: hasPart(t, 'gluecksmuenze'), by: t.id, kind: 'spray' })) continue;
      this.horde.status(z, 'nass', s.wet);
      this.horde.slow(z, s.slow, s.slowTime);
      this.horde.blowBack(z, s.push);
    }
    this.cb.onGust?.(t, o);
  }

  /** Feuerwerk (M20): Kettenexplosionen – jede springt zu einem Schlurfer in der Nähe. */
  updateBursts(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t -= dt;
      if (b.t > 0) continue;
      this.bursts.splice(i, 1);
      let x = b.x + (Math.random() - 0.5) * CHAIN_REACH;
      let z = b.z + (Math.random() - 0.5) * CHAIN_REACH;
      const near = this.horde.inRange(b.x, b.z, CHAIN_REACH);
      if (near.length) {
        const pick = near[Math.floor(Math.random() * near.length)];
        x = pick.x;
        z = pick.z;
      }
      this.explode({ kind: 'rocket', firework: true, x, y: 0.5, z, splash: b.splash, damage: b.damage, burn: b.burn, blind: b.blind, split: 0, chain: b.left - 1, lucky: b.lucky, by: b.by });
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.kind === 'spear') {
        // Kürbisballiste (M20): gerade Bahn, trifft jeden auf ihr einmal, bis `pierce` voll ist
        const step = p.speed * dt;
        p.x += p.dx * step;
        p.z += p.dz * step;
        p.y = Math.max(0.75, p.y - dt * 0.6);
        p.left -= step;
        for (const z of this.horde.list) {
          if (p.hit.length >= p.pierce) break;
          if (z.state === 'dying' || z.state === 'enter' || p.hit.includes(z.id)) continue;
          const r = SPEAR_REACH + z.def.radius * 0.5;
          if ((z.x - p.x) ** 2 + (z.z - p.z) ** 2 > r * r) continue;
          p.hit.push(z.id);
          this.horde.damage(z, p.damage, { pierce: true, push: 0.2, fromX: p.x - p.dx, fromZ: p.z - p.dz, source: 'turm', lucky: p.lucky, by: p.by, kind: 'ballista' });
          this.effects.splat(z.x, 0.8, z.z, 'funken', 5, 0.6);
        }
        if (p.hit.length >= p.pierce || p.left <= 0) {
          this.maxPierce = Math.max(this.maxPierce, p.hit.length);
          this.projectiles.splice(i, 1);
          this.explode({ kind: 'spear', x: p.x, y: 0.4, z: p.z, splash: p.splash, damage: p.burst, burn: 0, split: 0, lucky: p.lucky, by: p.by });
        }
        continue;
      }
      if (p.kind === 'bolt' || p.kind === 'icicle' || p.kind === 'glow') {
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
          if (p.target && p.target.state !== 'dying') this.hitHoming(p, p.target);
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

  /** Kürbis aus Mikas Hand (Fähigkeit Kürbiswurf, M16): fliegt im Bogen wie vom Katapult. */
  throwPumpkin({ x0, y0, z0, x1, z1, damage, splash, burn = 0, burnTime = 3, source = 'wurf' }) {
    const dist = Math.hypot(x1 - x0, z1 - z0);
    this.projectiles.push({ kind: 'pumpkin', x0, y0, z0, x1, z1, t: 0, T: 0.45 + dist * 0.05, h: 1.1 + dist * 0.12, damage, splash, burn, burnTime, split: 0, x: x0, y: y0, z: z0, lucky: false, source });
  }

  /** Treffer eines zielsuchenden Geschosses: Bolzen, Eiszapfen, Leuchtpfeil (M20). */
  hitHoming(p, z) {
    if (p.kind === 'icicle') {
      // Ein Eisblock zerspringt am Eiszapfen noch heftiger (horde.damage verdoppelt ohnehin)
      const dead = this.horde.damage(z, p.damage * (z.iceT > 0 ? p.shatter : 1), { push: 0.1, fromX: p.x, fromZ: p.z, source: 'turm', lucky: p.lucky, by: p.by ?? null, kind: 'eiszapfen' });
      if (!dead) {
        this.horde.status(z, 'frostig', p.frost);
        this.horde.slow(z, p.slow, p.slowTime);
      }
      this.effects.splat(p.tx, 0.8, p.tz, 'frost', 6, 0.6);
      return;
    }
    // Bolzen und Leuchtpfeil (zählt als Bolzen: ein Geblendeter zeigt die Schwachstelle)
    const dead = this.horde.damage(z, p.damage, { pierce: p.pierce, push: 0.15, fromX: p.x, fromZ: p.z, source: 'turm', lucky: p.lucky, by: p.by ?? null, kind: 'bolzen' });
    if (p.kind === 'glow') {
      if (!dead) {
        this.horde.mark(z, p.mark, p.markBonus);
        this.horde.status(z, 'geblendet', p.blind);
      }
      this.effects.splat(p.tx, 0.9, p.tz, 'licht', 6, 0.6);
      return;
    }
    this.effects.splat(p.tx, 0.7, p.tz, 'funken', 4, 0.5);
  }

  explode(p) {
    const r = p.splash;
    const burnTime = p.burnTime || 3;
    this.cb.onImpact?.(p.x, p.z, p.firework ? 'knall' : 'platsch');
    let frosty = null;
    let muddy = null;
    for (const z of this.horde.inRange(p.x, p.z, r)) {
      // Reaktionen (M18): Streukürbis auf Frostige, Kürbis auf Matschige
      if (z.frostT > 0 && p.split) frosty = frosty || z;
      if (z.mudT > 0 && (p.kind === 'pumpkin' || p.kind === 'spear')) muddy = muddy || z;
      if (this.horde.damage(z, p.damage, { push: 0.25, fromX: p.x, fromZ: p.z, source: p.source || 'turm', lucky: p.lucky, by: p.by ?? null })) continue;
      if (p.burn) this.horde.ignite(z, p.burn, burnTime, p.by ?? null);
      // M20: Matschkessel macht matschig, Feuerwerk blendet
      if (p.mud) {
        this.horde.status(z, 'matschig', p.mud);
        this.horde.slow(z, p.slow, p.slowTime);
      }
      if (p.blind) this.horde.status(z, 'geblendet', p.blind);
    }
    if (frosty) this.splinter(p, frosty);
    if (muddy) this.sticky(p, muddy);
    const look = p.mud ? 'schlamm' : p.firework ? 'feuerwerk' : p.burn ? 'feuer' : 'kuerbis';
    this.effects.splat(p.x, p.firework ? 0.9 : 0.3, p.z, look, p.kind === 'mini' ? 8 : p.firework ? 22 : 16, p.kind === 'mini' ? 0.7 : p.firework ? 1.4 : 1);
    if (p.firework) this.effects.splat(p.x, 1.2, p.z, 'licht', 6, 1);
    // Matsch (M20): Der Boden klebt eine Weile
    if (p.mud && p.sticky) this.stickies.push({ x: p.x, z: p.z, r: r * 0.8, slow: p.stickySlow, t: p.sticky });
    // Feuerwerk (M20): die nächste Explosion der Kette
    if (p.chain > 0) this.bursts.push({ x: p.x, z: p.z, t: CHAIN_DELAY, left: p.chain, damage: p.damage * 0.8, splash: p.splash, burn: p.burn, blind: p.blind, lucky: p.lucky, by: p.by ?? null });
    if (p.burn && !p.firework) this.fires.push({ x: p.x, z: p.z, r, dps: p.burn, t: burnTime, by: p.by ?? null });
    if (p.split) {
      for (let k = 0; k < p.split; k++) {
        const a = (k / p.split) * Math.PI * 2 + this.time;
        const reach = 1.3 * (this.world.weather.kind === 'wind' ? WEATHER_EFFECTS.wind.split : 1); // Wind trägt sie weiter (M18)
        const tx = p.x + Math.cos(a) * reach;
        const tz = p.z + Math.sin(a) * reach;
        this.projectiles.push({ kind: 'mini', x0: p.x, y0: 0.3, z0: p.z, x1: tx, z1: tz, t: 0, T: 0.45, h: 0.8, damage: p.damage * 0.55, splash: r * 0.7, burn: 0, split: 0, x: p.x, y: 0.3, z: p.z, lucky: p.lucky, by: p.by ?? null });
      }
    }
  }

  /** Splitter (M18): Ein Streukürbis trifft einen Frostigen – Eissplitter springen auf alle ringsum. */
  splinter(p, z) {
    const r = REACTIONS.splitter;
    for (const o of this.horde.inRange(z.x, z.z, r.radius)) {
      if (o === z) continue;
      this.horde.damage(o, p.damage * r.damage, { fromX: z.x, fromZ: z.z, push: 0.2, source: 'turm', by: p.by ?? null });
    }
    this.effects.splat(z.x, 0.7, z.z, 'frost', 18, 1.2);
    this.horde.reaction(z, 'splitter', 1.5);
  }

  /** Klebekürbis (M18): Ein Kürbis trifft einen Matschigen – eine klebrige Fläche bremst eine Weile. */
  sticky(p, z) {
    const r = REACTIONS.klebekuerbis;
    this.stickies.push({ x: p.x, z: p.z, r: r.radius, slow: r.slow, t: r.time });
    this.effects.splat(p.x, 0.2, p.z, 'schlamm', 18, 1.3);
    this.horde.reaction(z, 'klebekuerbis', 2);
  }

  updateStickies(dt) {
    for (let i = this.stickies.length - 1; i >= 0; i--) {
      const s = this.stickies[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.stickies.splice(i, 1);
        continue;
      }
      if (Math.random() < dt * 6) this.effects.splat(s.x + (Math.random() - 0.5) * s.r, 0.1, s.z + (Math.random() - 0.5) * s.r, 'schlamm', 2, 0.3);
      for (const z of this.horde.inRange(s.x, s.z, s.r)) if (!z.def.flying) this.horde.slow(z, s.slow, 0.3); // M22: nicht in der Luft
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
      for (const z of this.horde.inRange(f.x, f.z, f.r)) if (!z.def.flying) this.horde.ignite(z, f.dps, 1, f.by ?? null); // M22: nicht in der Luft
    }
  }

  render() {
    const counts = { bolt: 0, pumpkin: 0, mini: 0, bee: 0, spear: 0, icicle: 0, glow: 0, mud: 0, rocket: 0 };
    const d = this.dummy;
    for (const p of this.projectiles) {
      const key = PROJECTILE_POOL[p.kind] || 'pumpkin';
      const mesh = this.meshes[key];
      const k = counts[key]++;
      if (k >= MAX_PROJECTILES) continue;
      d.position.set(p.x, p.y, p.z);
      if (p.kind === 'rocket') {
        // Rakete (M20): Nase in Flugrichtung, im Bogen erst steigend, dann fallend
        const q = Math.min(1, p.t / p.T);
        const vh = Math.hypot(p.x1 - p.x0, p.z1 - p.z0) / p.T;
        const vy = (-p.y0 + 4 * p.h * (1 - 2 * q)) / p.T;
        d.rotation.set(-Math.atan2(vy, vh), Math.atan2(p.x1 - p.x0, p.z1 - p.z0), 0, 'YXZ');
      } else d.rotation.set(0, STRAIGHT.has(p.kind) ? p.angle : this.time * 6, 0, 'XYZ');
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      mesh.setMatrixAt(k, d.matrix);
    }
    // Bienen (M19): jeder Schwarm eine kleine, summende Wolke um seinen Mittelpunkt
    const bees = this.meshes.bee;
    for (const sw of this.swarms) {
      for (let b = 0; b < BEES_PER_SWARM && counts.bee < MAX_BEES; b++) {
        const a = this.time * (5 + b * 0.7) + sw.phase + b * 2.1;
        const r = 0.12 + (b % 3) * 0.07;
        d.position.set(sw.x + Math.cos(a) * r, sw.y + Math.sin(a * 1.7 + b) * 0.1, sw.z + Math.sin(a) * r);
        d.rotation.set(0, -a, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        bees.setMatrixAt(counts.bee++, d.matrix);
      }
    }
    for (const [key, mesh] of Object.entries(this.meshes)) {
      mesh.count = Math.min(key === 'bee' ? MAX_BEES : MAX_PROJECTILES, counts[key]);
      mesh.visible = mesh.count > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
