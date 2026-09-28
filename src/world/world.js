// Die Welt: setzt Karte, Boden, See, Natur, Zuhause, Requisiten,
// Ressourcenquellen und Bauten zusammen und betreibt alles, was sich in ihr
// bewegt oder leuchtet. Die Bucht ist immer gleich, das Wegenetz entsteht aus
// dem Startwert der Karte (`mapSeed`, liegt im Spielstand).

import * as THREE from 'three';
import { createWorldMaterial, createGlowMaterial, sharedUniforms } from '../render/materials.js';
import { damp } from '../core/math.js';
import { Colliders } from './colliders.js';
import { createTerrain } from './terrain.js';
import { createWater } from './water.js';
import { GameMap } from './map.js';
import { createNature } from './nature.js';
import { createShelter, createShelterMaterials, shelterFootprint } from './shelter.js';
import { createInterior } from './interior.js';
import { createProps } from './props.js';
import { BuildGrid } from './grid.js';
import { ResourceNodes } from './resources.js';
import { Buildings } from './buildings.js';
import { LightPools } from './lightPools.js';
import { Pathing, homeRect } from './pathing.js';
import { DayNight } from './daynight.js';
import { WarmLights } from './lights.js';
import { Particles, SmokeEmitter, EmberEmitter, Fireflies } from './particles.js';
import { Weather } from './weather.js';
import { P } from '../render/palette.js';
import { Crows } from '../entities/crows.js';

const SMOKE_DAY = [new THREE.Color(0xd0c9bc), new THREE.Color(0x999490)];
const KICK_COLORS = [P.f3, P.f4, P.f5, P.r3, P.e5].map((c) => new THREE.Color(c)); // aufstiebendes Laub (M12)
const PATH_GLOW = 0.32; // Eigenlicht der Wege in tiefer Nacht (DESIGN 3.6)
const SMOKE_NIGHT = [new THREE.Color(0x58719e), new THREE.Color(0x353f69)];

export class World {
  /**
   * @param {object} options
   * @param {THREE.Scene} options.scene
   * @param {number} options.seed Startwert für Modelle und Zufall
   * @param {number} options.mapSeed Startwert des Wegenetzes (je Spiel)
   * @param {object} options.renderConfig
   */
  constructor({ scene, seed, mapSeed, renderConfig }) {
    this.scene = scene;
    this.seed = seed;
    this.mapSeed = mapSeed >>> 0;
    this.map = new GameMap(this.mapSeed);
    this.colliders = new Colliders();
    this.colliders.setBoundsFn((pos, radius, horde) => this.map.pushInside(pos, radius, horde));

    this.materials = {
      world: createWorldMaterial(),
      windy: createWorldMaterial({ wind: true }), // Gras und Blumen im Wind
      laundry: createWorldMaterial({ wind: 'hang', occluder: true }), // Wäsche flattert an der Leine
      occluder: createWorldMaterial({ occluder: true }),
      // Gebautes (Türme, Barrikaden, Werkbank …): nachts mit etwas Eigenlicht
      building: createWorldMaterial({ occluder: true, selfLight: 0.12 }),
      flame: createGlowMaterial(0xffffff, { vertexColors: true }),
      beacon: createGlowMaterial(0xffffff), // Leuchtfeuer auf dem Leuchtmast (Meilenstein 6)
      spawnGlow: createGlowMaterial(0xffffff), // fahle Laternen an den Spawns (Meilenstein 9)
      pumpkinGlow: createGlowMaterial(0xffffff), // Gesichter der Kürbislaternen (M12)
      torchGlow: createGlowMaterial(0xffffff), // Fackeln an den Wegen (m12-r1)
    };
    this.npcInteractions = []; // Überlebende (core/survivors.js)
    this.traderInteractions = []; // Balduin, der Händler (core/trader.js)
    this.beaconPool = null;

    const terrain = createTerrain(seed, this.map);
    scene.add(terrain.group);
    this.groundMaterial = terrain.material;
    this.water = createWater(this.map, seed);
    scene.add(this.water.group);

    this.shelterMaterials = createShelterMaterials();
    this.shelter = createShelter({ seed, colliders: this.colliders, level: 1, materials: this.shelterMaterials });
    scene.add(this.shelter.group);
    // Das Innere ist ein eigenes Bild weit östlich der Karte (Meilenstein 11)
    this.interiorMaterials = {
      room: createWorldMaterial(),
      sky: createGlowMaterial(0xffffff), // Himmel in den Fenstern: tagsüber hell, nachts dunkel
      flame: createGlowMaterial(0xffffff, { vertexColors: true }),
      candle: createGlowMaterial(0xffffff),
      lamp: createGlowMaterial(0xffffff), // Pendelleuchte über dem Tisch
    };
    this.interior = createInterior({ seed, colliders: this.colliders, level: 1, materials: this.interiorMaterials });
    scene.add(this.interior.group);

    this.props = createProps({ seed, materials: this.materials, colliders: this.colliders, map: this.map });
    scene.add(this.props.group);

    this.resources = new ResourceNodes({ scene, colliders: this.colliders, materials: this.materials, seed, map: this.map });

    const nature = createNature({ seed, materials: this.materials, colliders: this.colliders, blockers: this.props.blockers, map: this.map, nodes: this.resources.nodes });
    scene.add(nature.group);
    this.stats = nature.stats;

    // Bauraster: alles, was jetzt schon im Weg steht, ist blockiert – dazu
    // die Grundfläche aller Ausbaustufen des Zuhauses (die Hütte wächst dorthin).
    this.grid = new BuildGrid(this.map);
    this.grid.markStatic(this.colliders);
    for (const level of [1, 2]) for (const r of shelterFootprint(level)) this.grid.blockRect(r.minX, r.minZ, r.maxX, r.maxZ, level);
    // Kleine Quellen (Kiesel, Gras, Äste) sind begehbar, aber nicht bebaubar –
    // sonst wächst ein Faserbusch mitten in ein Beet hinein.
    for (const node of this.resources.nodes) this.grid.reserve(node.x, node.z);
    for (const spot of this.props.reserved) this.grid.reserve(spot.x, spot.z); // Laubhaufen, Treibholz (M12)

    this.dayNight = new DayNight(scene, renderConfig);
    this.setupLights();
    this.lightPools = new LightPools(scene);
    this.interiorPools = [];
    this.addInteriorPools();
    for (const l of this.props.lanterns) this.lightPools.add(l.x, l.z + 0.25, 1.2); // Kürbislaternen (M12)
    if (this.props.torches.length) this.lightPools.addMany(this.props.torches, 2.4); // Fackeln an den Wegen
    this.buildings = new Buildings({
      scene,
      grid: this.grid,
      colliders: this.colliders,
      materials: this.materials,
      lightPools: this.lightPools,
      lights: this.lights,
      seed,
    });
    this.pathing = new Pathing(this.grid, (id) => this.buildings.get(id), this.map);
    this.pathing.setHome(homeRect(1));
    this.buildings.pathing = this.pathing;
    // Krähen (M12): auf Pfosten und im Gras; ein Platz im Gras ist frei, solange dort nichts gebaut ist
    this.crows = new Crows({
      scene,
      perches: this.props.perches,
      seed,
      isFree: (p) => {
        if (!p.ground) return true;
        const c = this.grid.cellAt(p.x, p.z);
        return !this.grid.occupantAt(c.i, c.j);
      },
    });

    this.particles = new Particles(800, seed);
    scene.add(this.particles.object);
    this.weather = new Weather({ scene, particles: this.particles, seed }); // M12: Tageswetter
    this.leafKicks = 0; // wie oft Laub aus einem Haufen aufgestoben ist (Prüfung)
    this.chimneySmoke = new SmokeEmitter(this.particles, this.shelter.chimney, { rate: 1.3, size: [3, 8], life: [4.5, 6.5], rise: 0.4 });
    this.fireSmoke = new SmokeEmitter(this.particles, this.props.fire.smoke, { rate: 0.9, size: [2, 5], life: [2.5, 4], rise: 0.45 });
    this.embers = new EmberEmitter(this.particles, this.props.fire.embers, 5);
    // Glühwürmchen: in der Bucht, am Ufer und über den offenen Streifen an den Wegen
    const swarms = [
      [-3, 6, 4],
      [8, -2, 4],
      [-5, -8, 3],
      [5, 9, 4],
      [11.5, -9, 3],
    ];
    for (const path of this.map.paths) {
      const p = path.points[Math.floor(path.points.length * 0.45)];
      swarms.push([p.x, p.z - 3.5, 4]);
    }
    this.fireflies = new Fireflies(64, seed + 5, swarms);
    scene.add(this.fireflies.object);

    this.interactions = [];
    this.refreshInteractions();
    this.heightZones = [...this.shelter.heightZones, ...this.props.heightZones];

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
    // Drinnen (M11): Kamin und Tischlampe – die beiden Lichter stehen fest im Innenraum
    const inside = this.interior.lights;
    this.lampLight = L.addLight({ position: inside.lampe, color: 0xffb865, intensity: 2.6, distance: 6, mode: 'lamp', flickerSpeed: 2.5, flickerAmount: 0.04 });
    this.kaminLight = L.addLight({ position: inside.kamin, color: 0xff8a3a, intensity: 7, distance: 7.5, mode: 'always', dayFactor: 0.55, flickerSpeed: 6, flickerAmount: 0.2 });
    this.lanternLight = L.addLight({ position: new THREE.Vector3(), color: 0xff9a4a, intensity: 3.2, distance: 7, mode: 'manual', flickerSpeed: 3.5, flickerAmount: 0.05 });
    this.lanternLight.on = false;

    L.addGlow(s.glow.window, { dim: 0x2c3a58, bright: 0xffd27a, boost: 1.35, mode: 'lamp' });
    L.addGlow(s.glow.lantern, { dim: 0x6a6f80, bright: 0xffc86a, boost: 1.1, entry: this.porchLight });
    const im = this.interiorMaterials;
    L.addGlow(im.sky, { dim: 0x2a3560, bright: 0xbfd8f0, boost: 1.15, mode: 'sky' });
    L.addGlow(im.flame, { dim: 0xffffff, bright: 0xffffff, boost: 1.0, entry: this.kaminLight });
    L.addGlow(im.candle, { dim: 0x6a5a40, bright: 0xffe8a0, boost: 1.3, mode: 'lamp' });
    L.addGlow(im.lamp, { dim: 0x8a8070, bright: 0xfff0b0, boost: 1.5, entry: this.lampLight });
    L.addGlow(s.glow.fairy, { dim: 0x555555, bright: 0xffffff, boost: 1.6, mode: 'lamp', twinkle: true });
    L.addGlow(this.materials.flame, { dim: 0xffffff, bright: 0xffffff, boost: 1.0, entry: this.fireLight });
    L.addGlow(this.materials.beacon, { dim: 0xc8b070, bright: 0xfff2c4, boost: 1.8, mode: 'lamp' });
    L.addGlow(this.materials.spawnGlow, { dim: 0x3b4a44, bright: 0x6cc0ae, boost: 1.05, mode: 'lamp' });
    // Kürbislaternen: tagsüber dunkle Löcher, nachts ein flackerndes Kerzenlicht (M12)
    L.addGlow(this.materials.pumpkinGlow, { dim: 0x3a1a10, bright: 0xffa94d, boost: 1.45, mode: 'lamp', twinkle: true });
    // Fackeln: tagsüber aus (dunkler Kopf), nachts helles Feuer
    L.addGlow(this.materials.torchGlow, { dim: 0x2e1f17, bright: 0xffb347, boost: 1.6, mode: 'lamp', twinkle: true });
  }

  /** Leuchtmast am Steg (früher Funkturm) zeigen; ab Stufe 3 wirft das Leuchtfeuer eine große Lichtinsel. */
  setTowerStage(stage, beaconRange = 9) {
    this.props.setTowerStage(stage);
    if (stage >= 3 && !this.beaconPool) {
      const t = this.props.beaconPos;
      this.beaconPool = this.lightPools.add(t.x, t.z, beaconRange);
    } else if (stage < 3 && this.beaconPool) {
      this.lightPools.remove(this.beaconPool);
      this.beaconPool = null;
    }
  }

  /** Liste aller Interaktionen neu zusammenstellen (nach Bauen, Abreißen, Ausbau). */
  refreshInteractions() {
    this.interactions = [...this.shelter.interactions, ...this.interior.interactions, ...this.props.interactions, ...this.resources.interactions, ...this.buildings.interactions, ...this.npcInteractions, ...this.traderInteractions];
  }

  /** Das Zuhause auf eine Ausbaustufe bringen (außen und innen neu aufbauen). */
  setHouseLevel(level) {
    this.grid.houseLevel = level; // für »Kein Platz«: steht das Zuhause hier schon?
    if (this.interior.level !== level) {
      const old = this.interior;
      this.scene.remove(old.group);
      old.group.traverse((o) => o.geometry?.dispose());
      for (const c of old.colliders) this.colliders.remove(c);
      this.interior = createInterior({ seed: this.seed, colliders: this.colliders, level, materials: this.interiorMaterials });
      this.scene.add(this.interior.group);
      this.addInteriorPools();
      this.refreshInteractions();
    }
    // Außen zwei Gestalten – die Notunterkunft und ab Stufe 2 die Hütte mit Anbau –,
    // dazu ab Stufe 3 Dachfenster, Werkzeugbrett und Kisten auf der Veranda
    const outer = Math.min(level, 2);
    if (this.shelter.stage === level) return;
    const old = this.shelter;
    this.scene.remove(old.group);
    old.group.traverse((o) => o.geometry?.dispose());
    for (const c of old.colliders) this.colliders.remove(c);
    this.shelter = createShelter({ seed: this.seed, colliders: this.colliders, level: outer, stage: level, materials: this.shelterMaterials });
    this.scene.add(this.shelter.group);
    this.props.setHouseLevel(outer);
    this.heightZones = [...this.shelter.heightZones, ...this.props.heightZones];
    this.pathing.setHome(homeRect(outer));
    this.refreshInteractions();
  }

  /** Lichtinseln der Lampen im Innenraum (Herd, Nachttisch, Werkstatt, Lager). */
  addInteriorPools() {
    for (const pool of this.interiorPools) this.lightPools.remove(pool);
    this.interiorPools = this.interior.pools.map((p) => this.lightPools.add(p.x, p.z, p.radius));
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

  /** Liegt der Punkt im Innenraum (dem eigenen Bild östlich der Karte)? */
  isInside(x, z) {
    const a = this.interior.area;
    return x > a.minX && x < a.maxX && z > a.minZ && z < a.maxZ;
  }

  /**
   * Durch die Tür? Draußen: Wer in die Haustür drückt, geht hinein ('innen').
   * Drinnen: Wer in die Türöffnung der Vorderwand läuft, geht hinaus ('aussen').
   */
  passageAt(x, z) {
    if (this.isInside(x, z)) {
      const e = this.interior.exit;
      return x > e.minX && x < e.maxX && z > e.minZ ? 'aussen' : null;
    }
    const door = this.shelter.door.center;
    return Math.abs(x - door.x) < 0.36 && z < door.z + 0.2 && z > door.z - 0.6 ? 'innen' : null;
  }

  /** Wo man vor der Haustür steht (nach dem Hinausgehen). */
  outsideDoorSpot() {
    const door = this.shelter.door.center;
    return { x: door.x, z: door.z + 0.75, facing: 0 };
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
    if (Math.abs(dx) > 0.95 || Math.abs(dz) > 1.4 || move.z === 0) return move; // m3-r2: etwas breiter
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
    let bestNpc = null;
    let bestNpcScore = Infinity;
    const inside = this.isInside(x, z);
    for (const it of this.interactions) {
      if (it.enabled === false) continue;
      // Drinnen-Dinge nur von drinnen, nicht durch die Wand
      if (it.inside !== undefined && it.inside !== inside) continue;
      // Bäume: Die Krone liegt im Bild nördlich vom Stamm – wer »am Baum« steht,
      // steht oft unter der Krone. Die Reichweite gilt deshalb bis `north` Meter nördlich.
      const tz = it.north ? Math.max(it.z - it.north, Math.min(z, it.z)) : it.z;
      const dx = it.x - x;
      const dz = tz - z;
      const d = it.hw ? Math.hypot(Math.max(0, Math.abs(dx) - it.hw), Math.max(0, Math.abs(dz) - it.hd)) : Math.hypot(dx, dz);
      if (d > it.radius + grace) continue;
      const dc = Math.hypot(dx, dz);
      const facingDot = dc > 0.01 ? (dx * fx + dz * fz) / dc : 1;
      // Nur-Anschauen (Wäscheleine, Schild …) tritt hinter Bauten und Quellen zurück
      // Menschen (und Knopf) gehen vor – mit jemandem reden will man lieber als Gras rupfen;
      // ebenso der Hackklotz, solange die Axt dort steckt (m5-r1)
      const flavor = it.prompt === 'ansehen' || it.flavor;
      // Sitzplätze (Sessel, Feuer, Bank) treten hinter Bauten zurück, die man benutzt –
      // m12-r1: E an der Werkbank neben dem Sessel setzte Mika hin
      const rest = it.prompt === 'hinsetzen' || it.prompt === 'feuer' || it.use === 'bank';
      const score = d - facingDot * 0.5 + (flavor ? 0.6 : 0) + (rest ? 0.35 : 0) - (it.npc ? 1.0 : 0) - (it.priority ? 0.6 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
      if (it.npc && score < bestNpcScore) {
        bestNpcScore = score;
        bestNpc = it;
      }
    }
    // Wer in Reichweite ist, geht stummen Dingen (Laterne, Hackklotz ohne Axt …) immer vor (m6-r1)
    if (bestNpc && best && (best.prompt === 'ansehen' || best.flavor)) return bestNpc;
    return best;
  }

  /**
   * @param {number} dt
   * @param {object} ctx { hours, focus (Vector3), player }
   */
  update(dt, { hours, focus, player, day = 1 }) {
    this.time += dt;
    const dn = this.dayNight;
    dn.update(hours, focus);
    // Wetter färbt Licht und Wind (M12)
    const inside = player ? this.isInside(player.position.x, player.position.z) : false;
    this.weather.update(dt, { day, hours, focus, inside, player, dayNight: dn });

    // Laterne der Spielfigur
    if (player) {
      const lit = player.holdingLantern && player.lanternLit;
      this.lanternLight.on = lit;
      if (player.holdingLantern) this.lanternLight.light.position.copy(player.lanternPosition());
    }
    this.lights.update(dt, dn.lampLevel);
    this.lightPools.update(dn.lampLevel);
    this.resources.update(dt);
    this.water.update(dt, focus);

    // Flammen: zufällig zwischen Einzelbildern wechseln
    this.flameTimer -= dt;
    if (this.flameTimer <= 0) {
      const frames = this.props.fire.frames;
      frames[this.flameIndex].visible = false;
      let next = Math.floor(Math.random() * frames.length);
      if (next === this.flameIndex) next = (next + 1) % frames.length;
      this.flameIndex = next;
      frames[next].visible = true;
      const kamin = this.interior.flames;
      for (let k = 0; k < kamin.length; k++) kamin[k].visible = k === next % kamin.length;
      this.flameTimer = 0.08 + Math.random() * 0.07;
    }

    // Rauch, Funken, Glühwürmchen
    const night = dn.night;
    // Wege nachts mit einem Hauch Eigenlicht, Fackeln brennen nur im Dunkeln (m12-r1)
    this.groundMaterial.emissiveIntensity = PATH_GLOW * night;
    if (this.props.torchFlames) this.props.torchFlames.visible = dn.lampLevel > 0.05;
    sharedUniforms.uNight.value = night;
    sharedUniforms.uTime.value = this.time;
    this._smoke0.copy(SMOKE_DAY[0]).lerp(SMOKE_NIGHT[0], night);
    this._smoke1.copy(SMOKE_DAY[1]).lerp(SMOKE_NIGHT[1], night);
    this.chimneySmoke.update(dt, this._smoke0, this._smoke1);
    this.fireSmoke.update(dt, this._smoke0, this._smoke1);
    this.embers.update(dt, 0.6 + night * 0.6);
    this.particles.update(dt);
    this.fireflies.update(dt, Math.max(0, (night - 0.55) / 0.45));

    // Drinnen oder draußen? (Drinnen ist ein eigenes Bild, siehe interior.js)
    if (player) {
      this.playerInside = this.isInside(player.position.x, player.position.z);

      // Tür öffnet sich, wenn man davorsteht
      const door = this.shelter.door;
      const dd = Math.hypot(player.position.x - door.center.x, player.position.z - door.center.z);
      const target = dd < 1.35 ? -1.45 : 0;
      door.angle = damp(door.angle, target, 8, dt);
      door.pivot.rotation.y = door.angle;

      // Laubhaufen (M12): Wer hindurchläuft, lässt das Laub aufstieben
      this.kickLeaves(dt, player);
    }
  }

  kickLeaves(dt, player) {
    const p = player.position;
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    for (const pile of this.props.leafPiles) {
      pile.cooldown -= dt;
      if (speed < 0.5 || pile.cooldown > 0) continue;
      if (Math.hypot(p.x - pile.x, p.z - pile.z) > pile.radius + 0.25) continue;
      pile.cooldown = 0.1;
      this.leafKicks++;
      const r = this.particles.rng;
      for (let i = 0; i < 3; i++) {
        const c = KICK_COLORS[r.int(0, KICK_COLORS.length - 1)];
        this.particles.spawn({
          x: p.x + r.range(-0.3, 0.3),
          y: 0.15,
          z: p.z + r.range(-0.2, 0.3),
          vx: player.velocity.x * 0.4 + r.range(-0.6, 0.6),
          vy: r.range(1.2, 2.2),
          vz: player.velocity.z * 0.4 + r.range(-0.5, 0.5),
          life: 6,
          size0: 4,
          size1: 4,
          color0: c,
          color1: c,
          alpha0: 1,
          alpha1: 1,
          drag: 1.6,
          lift: -1.2,
          round: 0,
          windFactor: 1.5,
          flutter: r.range(4, 7),
          phase: r.range(0, 6.28),
          sway: 0.3,
          floor: 0.03,
          rest: r.range(0.8, 1.6),
        });
      }
    }
  }
}

