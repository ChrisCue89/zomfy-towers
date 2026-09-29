// Die Welt: setzt Karte, Boden, See, Natur, Zuhause, Requisiten,
// Ressourcenquellen und Bauten zusammen und betreibt alles, was sich in ihr
// bewegt oder leuchtet. Die Bucht ist immer gleich, das Wegenetz entsteht aus
// dem Startwert der Karte (`mapSeed`, liegt im Spielstand).

import * as THREE from 'three';
import { ARRIVAL } from '../data/arrival.js';
import { createWorldMaterial, createGlowMaterial, sharedUniforms } from '../render/materials.js';
import { damp } from '../core/math.js';
import { Colliders } from './colliders.js';
import { createTerrain } from './terrain.js';
import { createWater } from './water.js';
import { GameMap } from './map.js';
import { LAYOUT } from './layout.js';
import { createNature } from './nature.js';
import { createShelter, createShelterMaterials, shelterFootprint } from './shelter.js';
import { createInterior, INTERIOR_FLOOR, WOHN } from './interior.js';
import { armsModel } from '../entities/characters.js';
import { VoxelModel } from '../render/voxel.js';
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
import { FLASH_TIME } from '../data/skills.js';
import { buildCardTable, buildStump, buildStake, buildCandleFlame, TABLE_TOP } from './cardModels.js';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { STAKES } from '../data/cards.js';
import { KEEPSAKES, KEEPSAKE_SPOTS, KEEPSAKE_BOARDS } from '../data/bonds.js';
import { buildKeepsake } from './keepsakeModels.js';

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
      world: createWorldMaterial({ snow: true }),
      windy: createWorldMaterial({ wind: true, snow: true }), // Gras und Blumen im Wind
      laundry: createWorldMaterial({ wind: 'hang', occluder: true }), // Wäsche flattert an der Leine
      occluder: createWorldMaterial({ occluder: true, snow: true }),
      // Gebautes (Türme, Barrikaden, Werkbank …): nachts mit etwas Eigenlicht
      building: createWorldMaterial({ occluder: true, selfLight: 0.12, snow: true }),
      flame: createGlowMaterial(0xffffff, { vertexColors: true }),
      beacon: createGlowMaterial(0xffffff), // Leuchtfeuer auf dem Leuchtmast (Meilenstein 6)
      spawnGlow: createGlowMaterial(0xffffff), // fahle Laternen an den Spawns (Meilenstein 9)
      pumpkinGlow: createGlowMaterial(0xffffff), // Gesichter der Kürbislaternen (M12)
      torchGlow: createGlowMaterial(0xffffff), // Fackeln an den Wegen (m12-r1)
      moderGlow: createGlowMaterial(0xffffff), // Kuppen der Moderpilze im Unterholz (M15)
    };
    this.npcInteractions = []; // Überlebende (core/survivors.js)
    this.traderInteractions = []; // Balduin, der Händler (core/trader.js)
    this.questInteractions = []; // Fundstücke der Nebenaufträge (core/quests.js, M23)
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
    if (this.props.torches.length) this.lightPools.addMany(this.props.torches, 2.4, this.props.torchFlames); // Fackeln an den Wegen
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
    this.moderFactor = 1; // M25: wie stark der Moder glimmt (nach dem Frost weniger, im Schnee gar nicht)
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
    // m16-r1: am hellen Tag nur ein Schimmer (Knopf leuchtete sonst wie ein glühender Fuchs); der Blitz hebt es an
    this.lanternLight = L.addLight({ position: new THREE.Vector3(), color: 0xff9a4a, intensity: 3.2, distance: 7, mode: 'manual', dimByDay: true, dayFactor: 0.2, flickerSpeed: 3.5, flickerAmount: 0.05 });
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
    // Moder (M15): tagsüber blasses Lila, nachts ein kühles Glimmen im Unterholz
    this.moderGlowEntry = L.addGlow(this.materials.moderGlow, { dim: 0xa88fd0, bright: 0xc0a0ff, boost: 1.2, mode: 'lamp', twinkle: true });
  }

  /** Leuchtmast am Steg (früher Funkturm) zeigen; ab Stufe 3 wirft das Leuchtfeuer eine große Lichtinsel. */
  /**
   * M31: Das Erinnerungsbrett am Steg zeigt so viele Fotos, wie Menschen gefallen sind; die
   * Laterne davor brennt an dem Abend, an dem Mika sie angezündet hat (mit Lichtinsel).
   */
  setMemorial(fallen, day) {
    const lit = fallen.length > 0 && fallen.some((f) => f.lit === day);
    this.props.setMemorial(fallen.length, lit);
    if (lit && !this.memorialPool) {
      const p = this.props.memorialPos;
      this.memorialPool = this.lightPools.add(p.x + 0.3, p.z + 0.35, 1.8);
    } else if (!lit && this.memorialPool) {
      this.lightPools.remove(this.memorialPool);
      this.memorialPool = null;
    }
    this.refreshInteractions();
  }

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
    this.interactions = [...this.shelter.interactions, ...this.interior.interactions, ...this.props.interactions, ...this.resources.interactions, ...this.buildings.interactions, ...this.npcInteractions, ...this.traderInteractions, ...this.questInteractions];
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

  // --- Kartenabend (M28) ----------------------------------------------------------------

  /**
   * Wo der Kartentisch steht: am Feuer (Klapptisch zwischen zwei Hackklötzen, das
   * Feuer im Rücken des Gegenübers), am Kamin (der Stubentisch mit seinen Stühlen)
   * oder am Steg (Balduin). Sitze mit der Höhe der Sitzfläche, Blickpunkt der Kamera.
   */
  cardSpot(kind) {
    const V32 = 1 / 32;
    if (kind === 'steg') {
      const t = { x: 16.5, z: -1.0 };
      const y = this.heightAt(t.x, t.z);
      return {
        kind,
        table: t,
        y,
        top: y + (TABLE_TOP + 1) * V32,
        opp: { x: t.x - 0.125, z: t.z - 0.5, facing: 0, seatY: 9 * V32 }, // Sitzhöhe über dem Steg
        mika: { x: t.x + 0.875, z: t.z, facing: -Math.PI / 2, seatY: 9 * V32 }, // über Eck (s. unten)
        look: { x: t.x + 0.375, z: t.z + 1.5 - y * 1.33 }, // wie am Feuer; der Steg liegt höher
        inside: false,
        own: true,
      };
    }
    // Am Feuer steht der Tisch südlich der Feuerstelle, am Kamin auf dem Teppich davor –
    // beide Male mit dem Feuer im Rücken des Gegenübers
    const inside = kind === 'kamin';
    const f = LAYOUT.campfire;
    const t = inside ? { ...this.interior.cardAnchor } : { x: f.x, z: f.z + 1.875 };
    return {
      kind: inside ? 'kamin' : 'feuer',
      table: t,
      y: 0,
      top: (TABLE_TOP + 1) * V32,
      opp: { x: t.x - 0.125, z: t.z - 0.625, facing: 0, seatY: 9 * V32 },
      // Mika sitzt über Eck an der Ostseite: Säße sie südlich, verdeckte ihr Kopf (von hinten
      // gesehen) Tisch und Gegenüber – die Kamera blickt ja über ihre Schulter nach Norden
      mika: { x: t.x + 0.875, z: t.z, facing: -Math.PI / 2, seatY: 9 * V32 },
      look: { x: t.x + 0.375, z: t.z + 1.5 }, // die Kamera schaut 1 m voraus: Tisch im oberen Drittel
      inside,
      own: true,
    };
  }

  /** Tisch aufstellen (draußen) und den Einsatz des Gegenübers darauflegen. */
  showCardTable(spot, id, stake) {
    if (!this.cardProps) {
      const g = new THREE.Group();
      g.name = 'Kartentisch';
      const size = 1 / 32;
      const opts = { size, shadow: 'coarse4', seed: this.seed };
      this.cardTableObj = createStaticVoxelObject(buildCardTable(this.seed + 51), this.materials.world, opts);
      this.cardStumps = [0, 1].map((k) => createStaticVoxelObject(buildStump(this.seed + 52 + k), this.materials.world, opts));
      this.cardFlame = new THREE.Mesh(buildCandleFlame().toGeometry({ jitter: 0, ao: false, visibleOnly: true, size }), createGlowMaterial(0xffffff, { vertexColors: true }));
      g.add(this.cardTableObj, ...this.cardStumps, this.cardFlame);
      this.scene.add(g);
      this.cardProps = g;
      this.cardStakes = {};
    }
    const own = spot.own;
    const y = spot.y || 0;
    this.cardTableObj.visible = own;
    this.cardFlame.visible = own;
    this.cardStumps.forEach((s, k) => {
      const seat = k ? spot.mika : spot.opp;
      s.visible = own;
      s.position.set(seat.x, y, seat.z);
    });
    this.cardTableObj.position.set(spot.table.x, y, spot.table.z);
    this.cardFlame.position.set(spot.table.x + 9 / 32, y + 22 / 32, spot.table.z - 5 / 32);
    for (const o of Object.values(this.cardStakes)) o.visible = false;
    if (stake) {
      const o = (this.cardStakes[stake] ||= this.stakeObject(stake, this.cardProps));
      o.position.set(spot.table.x - 0.25, spot.top, spot.table.z - 0.12);
      o.visible = true;
    }
    this.cardProps.visible = true;
  }

  hideCardTable() {
    if (this.cardProps) this.cardProps.visible = false;
  }

  /** Einsatz-Modell (1/32) als statisches Objekt in einer Gruppe. */
  stakeObject(id, parent) {
    const o = createStaticVoxelObject(buildStake(id), this.materials.world, { size: 1 / 32, shadow: 'none', seed: this.seed });
    parent.add(o);
    return o;
  }

  /** Gewonnene Einsätze auf dem Kaminsims (M28): vorn an der Kante, in fester Reihenfolge. */
  refreshStakes(list) {
    if (!this.stakeShelf) {
      this.stakeShelf = new THREE.Group();
      this.stakeShelf.name = 'Kaminsims';
      this.scene.add(this.stakeShelf);
      this.shelfItems = {};
    }
    const m = this.interior.mantel;
    const ids = Object.keys(STAKES);
    ids.forEach((id) => {
      const won = list.includes(id);
      if (!won && !this.shelfItems[id]) return;
      const o = (this.shelfItems[id] ||= this.stakeObject(id, this.stakeShelf));
      const k = STAKES[id].shelf;
      o.position.set(m.x0 + ((k + 0.5) / ids.length) * (m.x1 - m.x0), m.y, m.z);
      o.visible = won;
    });
  }

  /**
   * M30: Die langen Waffen im Waffenschrank der Stube, aufrecht im Gestell (Kolben unten,
   * Mündung oben, die Seite zu uns) – was Mika mitgenommen hat, fehlt. Die Pistolen liegen
   * in der Schublade. Plätze in 1/16 m des Innenraums: hinten drei, vorn zwei.
   */
  refreshCabinet(taken) {
    const U16 = 1 / 16;
    const { x: ox, z: oz } = LAYOUT.interior;
    if (!this.cabinetGroup) {
      this.cabinetGroup = new THREE.Group();
      this.cabinetGroup.name = 'Waffenschrank';
      this.scene.add(this.cabinetGroup);
      this.cabinetItems = {};
      const s = WOHN.schrank;
      const rack = { mistgabel: [s + 3, 6], jagdgewehr: [s + 8, 6], schlaeger: [s + 13, 6], doppelflinte: [s + 5.5, 8.5], spaltaxt: [s + 10.5, 8.5] };
      for (const [id, [x, z]] of Object.entries(rack)) {
        // Aufrecht: Kolben (+y) nach unten, Mündung (−y) nach oben, die Oberseite (+z) zur Seite
        const src = armsModel(id);
        const m = new VoxelModel();
        src.forEach((vx, vy, vz, c) => m.set(vz, -vy, vx, c));
        let x0 = Infinity;
        let x1 = -Infinity;
        let y0 = Infinity;
        let z0 = Infinity;
        let z1 = -Infinity;
        m.forEach((vx, vy, vz) => {
          x0 = Math.min(x0, vx);
          x1 = Math.max(x1, vx);
          y0 = Math.min(y0, vy);
          z0 = Math.min(z0, vz);
          z1 = Math.max(z1, vz);
        });
        const o = createStaticVoxelObject(m, this.materials.world, { size: 1 / 32, shadow: 'none', seed: this.seed });
        // Unterkante auf dem Boden des Gestells (Voxel FLOOR + 9 im 1/16-Maß), mittig auf dem Platz
        o.position.set(ox + x * U16 - ((x0 + x1 + 1) / 2) / 32, (INTERIOR_FLOOR + 9 - INTERIOR_FLOOR) * U16 - y0 / 32, oz + z * U16 - ((z0 + z1 + 1) / 2) / 32);
        this.cabinetGroup.add(o);
        this.cabinetItems[id] = o;
      }
    }
    for (const [id, o] of Object.entries(this.cabinetItems)) o.visible = !taken.includes(id);
  }

  /**
   * Erinnerungsstücke in der Stube (M29): Wer mit Mika eng geworden ist, hat ihr sein Stück
   * geschenkt. Das Bord über der Kommode erscheint mit dem ersten Stück.
   */
  refreshKeepsakes(list) {
    const U16 = 1 / 16;
    const { x: ox, z: oz } = LAYOUT.interior;
    const at = (o, s) => o.position.set(ox + s.x * U16, (s.y - INTERIOR_FLOOR) * U16, oz + s.z * U16);
    if (!this.keepsakeGroup) {
      this.keepsakeGroup = new THREE.Group();
      this.keepsakeGroup.name = 'Erinnerungsbord';
      this.scene.add(this.keepsakeGroup);
      this.keepsakeItems = {};
      // Das Erinnerungsregal: vier Bretter mit Winkeln, im Maß des Innenraums (N4: größere Stube)
      const m = new VoxelModel();
      for (const b of KEEPSAKE_BOARDS) {
        m.box(b.x0, b.y - 1, 4, b.x1, b.y - 1, 8, (x, y, z) => (z === 8 ? P.e4 : x % 5 === 0 ? P.e4 : P.e5));
        for (const bx of [b.x0 + 2, b.x1 - 2]) m.box(bx, b.y - 4, 4, bx, b.y - 2, 4, P.e3).box(bx, b.y - 2, 5, bx, b.y - 2, 7, P.e3);
      }
      this.keepsakeBoards = createStaticVoxelObject(m, this.materials.world, { size: U16, shadow: 'none', seed: this.seed });
      this.keepsakeBoards.position.set(ox, -INTERIOR_FLOOR * U16, oz);
      this.keepsakeGroup.add(this.keepsakeBoards);
      // Die Schnur der Papierlaterne
      const cord = new VoxelModel();
      const lan = KEEPSAKE_SPOTS.papierlaterne;
      cord.box(Math.round(lan.x), Math.round(lan.y + 5), Math.round(lan.z), Math.round(lan.x), lan.hang, Math.round(lan.z), P.s2);
      this.keepsakeCord = createStaticVoxelObject(cord, this.materials.world, { size: U16, shadow: 'none', seed: this.seed });
      this.keepsakeCord.position.set(ox, -INTERIOR_FLOOR * U16, oz);
      this.keepsakeGroup.add(this.keepsakeCord);
    }
    let onBoard = 0;
    for (const id of Object.keys(KEEPSAKES)) {
      const item = KEEPSAKES[id].item;
      const has = list.includes(id);
      if (!has && !this.keepsakeItems[item]) continue;
      const o = (this.keepsakeItems[item] ||= this.keepsakeObject(item));
      at(o, KEEPSAKE_SPOTS[item]);
      o.visible = has;
      if (has && KEEPSAKE_SPOTS[item].board) onBoard++;
    }
    this.keepsakeBoards.visible = onBoard > 0;
    this.keepsakeCord.visible = list.includes('lotte');
  }

  keepsakeObject(item) {
    const o = createStaticVoxelObject(buildKeepsake(item), this.materials.world, { size: 1 / 32, shadow: 'none', seed: this.seed });
    this.keepsakeGroup.add(o);
    return o;
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

  /**
   * Blickpunkte der Einleitung (M15): der Waldrand am mittleren Spawn, das
   * Unterholz neben einer Zuführung (dort sieht man den Moder), der
   * Zusammenfluss der Wege vor der Bucht und das Haus am See.
   * @param {'wald'|'unterholz'|'zusammen'|'haus'} key
   */
  lookSpot(key) {
    const m = this.map;
    if (key === 'wald') {
      const s = m.spawns.find((sp) => sp.name === 'mitte') || m.spawns[0];
      return { x: s.x + 7, z: s.z };
    }
    if (key === 'unterholz') return this.forestSpot || (this.forestSpot = this.findForestSpot());
    if (key === 'zusammen') return { x: m.merge.x - 1, z: m.merge.z };
    if (key === 'karten' && this.cardLook) return this.cardLook; // M28: der Kartentisch
    if (key === 'ankunft') return { x: ARRIVAL.route[0][0], z: ARRIVAL.route[0][1] }; // N5: dort kommt das Boot her
    // Haus, Hof und rechts der See
    const sh = LAYOUT.shelter;
    return { x: sh.x + 4, z: sh.z + 4.5 };
  }

  /**
   * Wo neben einer Zuführung am meisten Waldboden ins Bild passt: Der Weg
   * liegt unten (über dem Dialog), darüber das Unterholz mit dem Moder.
   */
  findForestSpot() {
    const m = this.map;
    let best = null;
    for (const path of m.paths) {
      if (path.id === 'letzter') continue;
      for (let k = 0; k < path.points.length; k += 2) {
        const p = path.points[k];
        if (p.x < -42 || p.x > -22) continue; // nicht wieder am Spawn (den zeigt schon »wald«)
        const cz = p.z - 4;
        let forest = 0;
        for (let sx = -7; sx <= 7; sx++) for (let sz = -6; sz <= 1; sz++) if (m.edgeDistance(p.x + sx, cz + sz) > 0.8) forest++;
        if (!best || forest > best.forest) best = { x: p.x, z: cz, forest };
      }
    }
    return best ? { x: best.x, z: best.z } : { x: -36, z: 0 };
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
    move = this.wicketAssist(pos, move);
    const door = this.shelter.door.center;
    const dx = door.x - pos.x;
    const dz = pos.z - door.z; // > 0: draußen (südlich der Wand)
    if (Math.abs(dx) > 0.95 || Math.abs(dz) > 1.4 || move.z === 0) return move; // m3-r2: etwas breiter
    const towardDoor = (dz > 0 && move.z < 0) || (dz < 0 && move.z > 0);
    if (!towardDoor || Math.abs(move.x) > 0) return move;
    return { x: Math.max(-0.8, Math.min(0.8, dx * 3)), z: move.z };
  }

  /**
   * Schlupftür im Tor (M17): Wer quer aufs Tor zuläuft, wird sanft zur Tür
   * in der Mitte gelenkt – sonst stand man vor einem Flügel und dachte, das
   * Tor sei zu.
   */
  wicketAssist(pos, move) {
    const gate = this.buildings.gate;
    if (!gate || gate.broken || move.x === 0) return move;
    const c = this.buildings.bounds(gate);
    const dx = c.x - pos.x; // > 0: Mika steht westlich (draußen)
    const dz = c.z - pos.z;
    if (Math.abs(dx) > 1.3 || Math.abs(dz) > 2.3 || Math.abs(dz) < 0.12) return move;
    const toward = (dx > 0 && move.x > 0) || (dx < 0 && move.x < 0);
    if (!toward || Math.abs(move.z) > Math.abs(move.x) * 0.5) return move;
    return { x: move.x, z: Math.max(-0.8, Math.min(0.8, dz * 2.5)) };
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
      // Wall und Tor (M17) treten hinter Quellen, Bauten und Menschen zurück: Ihr Bereich
      // reicht weit ins Lager – der junge Baum am Wall wurde sonst zum »Auswählen«
      const camp = it.camp ? 1.0 : 0;
      const score = d - facingDot * 0.5 + (flavor ? 0.6 : 0) + (rest ? 0.35 : 0) + camp - (it.npc ? 1.0 : 0) - (it.priority ? 0.6 : 0);
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
      const flash = player.flashT > 0; // Laternenblitz (M16): flammt auch am Tag und ohne Laterne in der Hand auf
      const lit = (player.holdingLantern && player.lanternLit) || flash;
      this.lanternLight.on = lit;
      this.lanternLight.boost = flash ? 1 + (this.flashLevel ?? 5) * (player.flashT / FLASH_TIME) : 1; // M26: Einstellung »Blitze«
      if (player.holdingLantern || flash) this.lanternLight.light.position.copy(player.lanternPosition());
    }
    this.lights.update(dt, dn.lampLevel);
    this.lightPools.update(dn.lampLevel);
    this.resources.update(dt);
    this.buildings.update(dt); // M26: Bauen mit Schwung
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
    // M25: Nach dem Frost schläft der Moder – sein Glimmen im Boden und in den Pilzen erlischt
    this.groundMaterial.emissiveIntensity = PATH_GLOW * night * (0.4 + 0.6 * this.moderFactor);
    if (this.moderGlowEntry) this.moderGlowEntry.scale = this.moderFactor;
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

