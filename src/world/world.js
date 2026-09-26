// Die Welt: setzt Boden, Natur, Zuhause, Requisiten, Ressourcenquellen und
// Bauten zusammen und betreibt alles, was sich in ihr bewegt oder leuchtet.

import * as THREE from 'three';
import { createWorldMaterial, createGlowMaterial } from '../render/materials.js';
import { damp } from '../core/math.js';
import { Colliders } from './colliders.js';
import { createTerrain } from './terrain.js';
import { createNature } from './nature.js';
import { createShelter, createShelterMaterials, shelterFootprint } from './shelter.js';
import { createProps } from './props.js';
import { BuildGrid } from './grid.js';
import { ResourceNodes } from './resources.js';
import { Buildings } from './buildings.js';
import { LightPools } from './lightPools.js';
import { DayNight } from './daynight.js';
import { WarmLights } from './lights.js';
import { Particles, SmokeEmitter, EmberEmitter, Fireflies } from './particles.js';
import { LAYOUT } from './layout.js';

const SMOKE_DAY = [new THREE.Color(0xd0c9bc), new THREE.Color(0x999490)];
const SMOKE_NIGHT = [new THREE.Color(0x58719e), new THREE.Color(0x353f69)];

export class World {
  /**
   * @param {object} options
   * @param {THREE.Scene} options.scene
   * @param {number} options.seed
   * @param {object} options.renderConfig
   */
  constructor({ scene, seed, renderConfig }) {
    this.scene = scene;
    this.seed = seed;
    this.colliders = new Colliders();
    const c = LAYOUT.clearing;
    this.colliders.setBounds(c.cx, c.cz, c.rx, c.rz, c.power);

    this.materials = {
      world: createWorldMaterial(),
      occluder: createWorldMaterial({ occluder: true }),
      flame: createGlowMaterial(0xffffff, { vertexColors: true }),
    };

    const terrain = createTerrain(seed);
    scene.add(terrain.group);

    this.shelterMaterials = createShelterMaterials();
    this.shelter = createShelter({ seed, colliders: this.colliders, level: 1, materials: this.shelterMaterials });
    scene.add(this.shelter.group);

    this.props = createProps({ seed, materials: this.materials, colliders: this.colliders });
    scene.add(this.props.group);

    this.resources = new ResourceNodes({ scene, colliders: this.colliders, materials: this.materials, seed });

    const nature = createNature({ seed, materials: this.materials, colliders: this.colliders, blockers: this.props.blockers });
    scene.add(nature.group);
    this.stats = nature.stats;

    // Bauraster: alles, was jetzt schon im Weg steht, ist blockiert – dazu
    // die Grundfläche aller Ausbaustufen des Zuhauses (die Hütte wächst dorthin).
    this.grid = new BuildGrid({ minX: -16, maxX: 16, minZ: -12, maxZ: 13 });
    this.grid.markStatic(this.colliders);
    for (const level of [1, 2]) for (const r of shelterFootprint(level)) this.grid.blockRect(r.minX, r.minZ, r.maxX, r.maxZ);

    this.dayNight = new DayNight(scene, renderConfig);
    this.setupLights();
    this.lightPools = new LightPools(scene);
    this.buildings = new Buildings({
      scene,
      grid: this.grid,
      colliders: this.colliders,
      materials: this.materials,
      lightPools: this.lightPools,
      lights: this.lights,
      seed,
    });

    this.particles = new Particles(800, seed);
    scene.add(this.particles.object);
    this.chimneySmoke = new SmokeEmitter(this.particles, this.shelter.chimney, { rate: 1.3, size: [3, 8], life: [4.5, 6.5], rise: 0.4 });
    this.fireSmoke = new SmokeEmitter(this.particles, this.props.fire.smoke, { rate: 0.9, size: [2, 5], life: [2.5, 4], rise: 0.45 });
    this.embers = new EmberEmitter(this.particles, this.props.fire.embers, 5);
    this.fireflies = new Fireflies(46, seed + 5, [
      [-11, 3, 4],
      [8.5, 0.5, 5],
      [-6.5, -1.5, 4],
      [3.5, 5.5, 5],
      [12, -5, 3],
      [-12, -6.5, 3],
      [0.5, 9.5, 6],
      [-9.5, 8.5, 3],
    ]);
    scene.add(this.fireflies.object);

    this.interactions = [];
    this.refreshInteractions();
    this.heightZones = this.shelter.heightZones;

    this.fadeValue = 0;
    this.flameTimer = 0;
    this.flameIndex = 0;
    this.time = 0;
    this.playerInside = false;
    this._smoke0 = new THREE.Color();
    this._smoke1 = new THREE.Color();
  }

  setupLights() {
    const L = new WarmLights(this.scene);
    const s = this.shelter;
    this.lights = L;
    this.fireLight = L.addLight({ position: this.props.fire.light, color: 0xff9448, intensity: 11, distance: 10, mode: 'always', dayFactor: 0.35, flickerSpeed: 9, flickerAmount: 0.22 });
    this.porchLight = L.addLight({ position: s.lights.porch, color: 0xffc070, intensity: 3.6, distance: 6.5, mode: 'lamp', flickerSpeed: 3, flickerAmount: 0.05 });
    this.tableLight = L.addLight({ position: s.lights.table, color: 0xffb865, intensity: 5.6, distance: 8, mode: 'lamp', flickerSpeed: 2.5, flickerAmount: 0.04 });
    this.stoveLight = L.addLight({ position: s.lights.stove, color: 0xff7a3a, intensity: 1.8, distance: 3.5, mode: 'always', dayFactor: 0.5, flickerSpeed: 6, flickerAmount: 0.18 });
    this.lanternLight = L.addLight({ position: new THREE.Vector3(), color: 0xff9a4a, intensity: 3.2, distance: 7, mode: 'manual', flickerSpeed: 3.5, flickerAmount: 0.05 });
    this.lanternLight.on = false;

    L.addGlow(s.glow.window, { dim: 0x2c3a58, bright: 0xffd27a, boost: 1.35, mode: 'lamp' });
    L.addGlow(s.glow.lantern, { dim: 0x6a6f80, bright: 0xffc86a, boost: 1.1, entry: this.porchLight });
    L.addGlow(s.glow.lamp, { dim: 0x8a8070, bright: 0xfff0b0, boost: 1.5, entry: this.tableLight });
    L.addGlow(s.glow.stove, { dim: 0xb03e25, bright: 0xff9a3a, boost: 1.4, entry: this.stoveLight });
    L.addGlow(s.glow.candle, { dim: 0x6a5a40, bright: 0xffe8a0, boost: 1.3, mode: 'lamp' });
    L.addGlow(s.glow.fairy, { dim: 0x555555, bright: 0xffffff, boost: 1.6, mode: 'lamp', twinkle: true });
    L.addGlow(this.materials.flame, { dim: 0xffffff, bright: 0xffffff, boost: 1.0, entry: this.fireLight });
  }

  /** Liste aller Interaktionen neu zusammenstellen (nach Bauen, Abreißen, Ausbau). */
  refreshInteractions() {
    this.interactions = [...this.shelter.interactions, ...this.props.interactions, ...this.resources.interactions, ...this.buildings.interactions];
  }

  /** Das Zuhause auf eine Ausbaustufe bringen (neu aufbauen). */
  setHouseLevel(level) {
    if (this.shelter.level === level) return;
    const old = this.shelter;
    this.scene.remove(old.group);
    old.group.traverse((o) => o.geometry?.dispose());
    for (const c of old.colliders) this.colliders.remove(c);
    this.shelter = createShelter({ seed: this.seed, colliders: this.colliders, level, materials: this.shelterMaterials });
    this.scene.add(this.shelter.group);
    this.heightZones = this.shelter.heightZones;
    this.refreshInteractions();
  }

  /** Laterne der Spielfigur anbinden (Glas-Material + Licht). */
  attachPlayerLantern(glowMaterial) {
    this.lights.addGlow(glowMaterial, { dim: 0x70748a, bright: 0xffc060, boost: 1.05, entry: this.lanternLight });
  }

  /** Bodenhöhe an einer Stelle (Hausboden, Stufe, sonst 0). */
  heightAt(x, z) {
    for (const zone of this.heightZones) {
      if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) return zone.y;
    }
    return 0;
  }

  isInside(x, z) {
    for (const r of this.shelter.interiors) if (x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ) return true;
    return false;
  }

  /**
   * Einlaufhilfe an der Haustür: Wer vor oder hinter der Tür auf sie zu läuft,
   * wird sanft zur Türmitte gelenkt (die Öffnung ist nur knapp breiter als Mika).
   * @param {{x:number, z:number}} pos
   * @param {{x:number, z:number}} move Eingaberichtung
   */
  doorAssist(pos, move) {
    const door = this.shelter.door.center;
    const dx = door.x - pos.x;
    const dz = pos.z - door.z; // > 0: draußen (südlich der Wand)
    if (Math.abs(dx) > 0.7 || Math.abs(dz) > 1.3 || move.z === 0) return move;
    const towardDoor = (dz > 0 && move.z < 0) || (dz < 0 && move.z > 0);
    if (!towardDoor || Math.abs(move.x) > 0) return move;
    return { x: Math.max(-0.8, Math.min(0.8, dx * 3)), z: move.z };
  }

  /** Nächste benutzbare Stelle in Reichweite, bevorzugt in Blickrichtung. */
  findInteraction(x, z, facing, grace = 0) {
    const fx = Math.sin(facing);
    const fz = Math.cos(facing);
    let best = null;
    let bestScore = Infinity;
    const inside = this.isInside(x, z);
    for (const it of this.interactions) {
      if (it.enabled === false) continue;
      // Drinnen-Dinge nur von drinnen, nicht durch die Wand
      if (it.inside !== undefined && it.inside !== inside) continue;
      const dx = it.x - x;
      const dz = it.z - z;
      const d = Math.hypot(dx, dz);
      if (d > it.radius + grace) continue;
      const facingDot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
      const score = d - facingDot * 0.5;
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }

  /**
   * @param {number} dt
   * @param {object} ctx { hours, focus (Vector3), player }
   */
  update(dt, { hours, focus, player }) {
    this.time += dt;
    const dn = this.dayNight;
    dn.update(hours, focus);

    // Laterne der Spielfigur
    if (player) {
      const lit = player.holdingLantern && player.lanternLit;
      this.lanternLight.on = lit;
      if (player.holdingLantern) this.lanternLight.light.position.copy(player.lanternPosition());
    }
    this.lights.update(dt, dn.lampLevel);
    this.lightPools.update(dn.lampLevel);
    this.resources.update(dt);

    // Flammen: zufällig zwischen Einzelbildern wechseln
    this.flameTimer -= dt;
    if (this.flameTimer <= 0) {
      const frames = this.props.fire.frames;
      frames[this.flameIndex].visible = false;
      let next = Math.floor(Math.random() * frames.length);
      if (next === this.flameIndex) next = (next + 1) % frames.length;
      this.flameIndex = next;
      frames[next].visible = true;
      this.flameTimer = 0.08 + Math.random() * 0.07;
    }

    // Rauch, Funken, Glühwürmchen
    const night = dn.night;
    this._smoke0.copy(SMOKE_DAY[0]).lerp(SMOKE_NIGHT[0], night);
    this._smoke1.copy(SMOKE_DAY[1]).lerp(SMOKE_NIGHT[1], night);
    this.chimneySmoke.update(dt, this._smoke0, this._smoke1);
    this.fireSmoke.update(dt, this._smoke0, this._smoke1);
    this.embers.update(dt, 0.6 + night * 0.6);
    this.particles.update(dt);
    this.fireflies.update(dt, Math.max(0, (night - 0.55) / 0.45));

    // Haus betreten: Dach und Vorderwand gerastert ausblenden
    if (player) {
      this.playerInside = this.isInside(player.position.x, player.position.z);
      this.fadeValue = damp(this.fadeValue, this.playerInside ? 1.05 : 0, 7, dt);
      this.shelter.fade.value = this.fadeValue < 0.01 ? 0 : this.fadeValue;

      // Tür öffnet sich, wenn man davorsteht
      const door = this.shelter.door;
      const dd = Math.hypot(player.position.x - door.center.x, player.position.z - door.center.z);
      const target = dd < 1.35 ? -1.45 : 0;
      door.angle = damp(door.angle, target, 8, dt);
      door.pivot.rotation.y = door.angle;
    }
  }
}

