// Gebaute Dinge auf dem Raster: anlegen, laden, ausbauen, abreißen. Jeder Bau
// belegt Rasterzellen, bekommt eine Kollision und eine Interaktion (benutzen
// oder mit E auswählen). Türme haben Stufe, Spezialisierung, Haltbarkeit und
// einen Kopf, der sich zum Ziel dreht. Barrikaden (nur auf Wegfeldern) haben
// Stufen, zeigen ihren Schaden und bleiben zerstört als Trümmer liegen, bis
// man sie wieder aufbaut oder abräumt. Nach jeder Änderung rechnet die Horde
// ihre Wege neu (pathing.rebuild).

import * as THREE from 'three';
import { createStaticVoxelObject, shadowGeometry, SHADOW_LAYER, SHADOW_PROXY_MATERIAL } from '../render/staticMesh.js';
import { createGlowMaterial, createSilhouetteMaterial } from '../render/materials.js';
import { P } from '../render/palette.js';
import { BUILDINGS, footprint, maxHpOf } from '../data/buildings.js';
import { towerStatsOf, towerRank } from '../data/towers.js';
import { VoxelModel } from '../render/voxel.js';
import { BUILDING_MODELS, buildBarricade, buildRubble, BUILDING_UNIT } from './buildingModels.js';
import { fineTowerModels, towerPartModel } from './towerModels.js';
import { V } from './layout.js';
import { edgeLight } from './voxelKit.js';

export class Buildings {
  /**
   * @param {object} deps scene, grid, colliders, materials, lightPools, lights (WarmLights), seed
   */
  constructor({ scene, grid, colliders, materials, lightPools, lights, seed }) {
    this.grid = grid;
    this.colliders = colliders;
    this.materials = materials;
    this.lightPools = lightPools;
    this.lights = lights;
    this.seed = seed;
    this.pathing = null; // wird von der Welt gesetzt
    this.group = new THREE.Group();
    this.group.name = 'Bauten';
    scene.add(this.group);
    this.list = [];
    this.nextId = 1;
    this.glowMaterial = createGlowMaterial(0xffffff);
    // Türme hinter Dach und Baumkronen: heller Rasterumriss (m3-r2), neben Mika (gold) und Schlurfern (lavendel)
    this.towerSilhouette = createSilhouetteMaterial(P.s8, 0.4);
    lights.addGlow(this.glowMaterial, { dim: 0x6a6f80, bright: 0xffc86a, boost: 1.1, mode: 'lamp' });
    this.models = new Map();
    this.checkCache = { key: '', result: null };
  }

  count(type) {
    let n = 0;
    for (const b of this.list) if (b.type === type) n++;
    return n;
  }

  get(id) {
    return this.list.find((b) => b.id === id) || null;
  }

  atCell(i, j) {
    const id = this.grid.occupantAt(i, j);
    return id === null ? null : this.get(id);
  }

  get towers() {
    return this.list.filter((b) => BUILDINGS[b.type].tower);
  }

  /**
   * Prüft, ob ein Bau an (i, j) passt: Barrikaden nur auf Wegfeldern, alles
   * andere nie auf einem Weg (Meilenstein 9) – und ob er der Horde den letzten
   * Weg zum Zuhause abschneiden würde (Ergebnis zwischengespeichert).
   * @returns {{ok:boolean, reason?:string}}
   */
  check(type, i, j, turns, blockers = []) {
    const def = BUILDINGS[type];
    if (def.max && this.count(type) >= def.max) return { ok: false, reason: 'max' };
    const { w, d } = footprint(type, turns);
    const cells = this.grid.cells(i, j, w, d);
    const onPath = cells.map(([ci, cj]) => this.grid.isPath(ci, cj));
    if (def.onPath && onPath.some((p) => !p)) return { ok: false, reason: 'nurWeg' };
    if (!def.onPath && onPath.some(Boolean)) return { ok: false, reason: 'aufWeg' };
    if (!this.grid.canPlace(i, j, w, d)) {
      const why = cells.map(([ci, cj]) => this.grid.blockReason(ci, cj)).find(Boolean) || null;
      return { ok: false, reason: 'belegt', why };
    }
    for (const b of blockers) {
      if (b.x + b.r > i && b.x - b.r < i + w && b.z + b.r > j && b.z - b.r < j + d) return { ok: false, reason: 'figur' };
    }
    // Barrikaden sperren nie ab: Die Horde schlägt sich durch
    if (this.pathing && !def.onPath) {
      const key = `${i}|${j}|${w}|${d}|${this.pathing.version}`;
      if (this.checkCache.key !== key) {
        this.checkCache = { key, result: this.pathing.wouldBlock(this.grid.cells(i, j, w, d)) };
      }
      if (this.checkCache.result) return { ok: false, reason: 'weg' };
    }
    return { ok: true };
  }

  /**
   * Darstellung eines Baus (Modelle zwischengespeichert). Türme bekommen einen
   * drehbaren Kopf (`userData.head`).
   * @param {{material?: THREE.Material, glowMaterial?: THREE.Material, shadow?: string, level?: number, spec?: string|null}} [options]
   */
  object(type, turns, options = {}) {
    const { material = this.materials.building || this.materials.occluder, glowMaterial = this.glowMaterial, shadow = 'full', level = 1, spec = null, look = 'ganz' } = options;
    if (BUILDINGS[type].tower) return this.towerObject(type, level, spec, material, glowMaterial, shadow);
    const key = type === 'barrikade' ? `${type}|${level}|${look}` : type;
    if (!this.models.has(key)) {
      const s = BUILDING_MODELS[type];
      let model;
      if (type === 'barrikade') model = look === 'truemmer' ? buildRubble(this.seed, level) : buildBarricade(this.seed, level, look === 'kaputt' ? 0.55 : 0);
      else model = s.model(this.seed);
      this.models.set(key, { model, glow: s.glow ? s.glow() : null });
    }
    const { model, glow } = this.models.get(key);
    // Alle Bauten doppelt fein (M13g, 1/32 m), Schatten grob wie im Maß 1/8
    const size = BUILDING_UNIT;
    const group = createStaticVoxelObject(model, material, { turns, seed: this.seed, shadow: shadow === 'full' ? 'coarse4' : shadow, size });
    if (glow) group.add(createStaticVoxelObject(glow, glowMaterial, { turns, shadow: 'none', jitter: 0, size }));
    return group;
  }

  towerObject(type, level, spec, material, glowMaterial, shadow) {
    const key = `${type}|${level}|${spec}`;
    if (!this.models.has(key)) this.models.set(key, fineTowerModels(type, level, spec, this.seed));
    const m = this.models.get(key);
    const U = m.unit || V;
    if (!m.geo) {
      // Geometrien einmal je Art, Stufe und Spezialisierung – alle Türme teilen sie
      // (M13g: im Maß 1/32 wäre das Bauen sonst spürbar langsamer). Der Umriss hinter
      // Verdeckungen nimmt eine gröbere Fassung (1/16 m): Er ist nur ein Schattenriss.
      const shared = (g) => {
        g.userData.shared = true;
        return g;
      };
      m.geo = {
        base: shared(m.base.toGeometry({ jitter: 0.05, seed: this.seed, visibleOnly: true, size: U })),
        baseShadow: shared(shadowGeometry(m.base, U < 1 / 16 ? 'coarse' : 'full', U)),
        baseOutline: shared(m.base.downsampled(2, 1).toGeometry({ jitter: 0, ao: false, visibleOnly: true, size: U * 2 })),
        head: shared(m.head.toGeometry({ jitter: 0.03, seed: this.seed, size: U })),
        headOutline: shared(m.head.downsampled(2, 1).toGeometry({ jitter: 0, ao: false, size: U * 2 })),
        glow: m.glow ? shared(m.glow.toGeometry({ jitter: 0, ao: false, size: U })) : null,
      };
      // Oberkante des Kopfs (für das Fernrohr, M10)
      let top = 0;
      m.head.forEach((x, y) => {
        top = Math.max(top, y + 1);
      });
      m.headTop = top * U;
    }
    const group = new THREE.Group();
    const visual = new THREE.Mesh(m.geo.base, material);
    visual.receiveShadow = true;
    visual.userData.outlineGeometry = m.geo.baseOutline;
    group.add(visual);
    group.userData.visual = visual;
    if (shadow !== 'none') {
      const proxy = new THREE.Mesh(m.geo.baseShadow, SHADOW_PROXY_MATERIAL);
      proxy.castShadow = true;
      proxy.layers.set(SHADOW_LAYER);
      group.add(proxy);
    }
    const head = new THREE.Group();
    head.rotation.order = 'YXZ'; // erst zielen (y), dann nicken (Wurfarm)
    head.position.y = m.headY * U;
    const headMesh = new THREE.Mesh(m.geo.head, material);
    headMesh.userData.outlineGeometry = m.geo.headOutline;
    group.userData.headTop = m.headTop;
    headMesh.castShadow = shadow !== 'none';
    headMesh.receiveShadow = true;
    head.add(headMesh);
    group.add(head);
    if (m.geo.glow) {
      const glow = new THREE.Mesh(m.geo.glow, glowMaterial);
      if (m.glowOnHead) head.add(glow);
      else group.add(glow);
    }
    group.userData.head = head;
    return group;
  }

  /** Bau anlegen. Kosten werden hier nicht abgezogen (macht das Spiel). */
  place(type, i, j, turns = 0, id = null, extra = {}) {
    const def = BUILDINGS[type];
    const { w, d } = footprint(type, turns);
    const building = { id: id ?? this.nextId++, type, i, j, turns };
    this.nextId = Math.max(this.nextId, building.id + 1);
    if (def.tower) {
      building.level = extra.level || 1;
      building.spec = extra.spec || null;
      building.part = extra.part || null; // besonderes Turmteil (M10)
      // Geschichte des Turms (M16): Erfahrung, Abschüsse, Name (Index in T.turmnamen)
      building.xp = extra.xp || 0;
      building.kills = extra.kills || 0;
      building.name = Number.isInteger(extra.name) ? extra.name : null;
    }
    if (type === 'barrikade') {
      building.level = Math.max(1, Math.min(3, extra.level || 1));
      building.broken = Boolean(extra.broken);
    }
    if (def.hp) building.hp = building.broken ? 0 : Math.min(maxHpOf(building), extra.hp ?? maxHpOf(building));
    const cx = i + w / 2;
    const cz = j + d / 2;
    this.attachObject(building);
    // Türme sind rund: schräg zwischen zwei Türmen bleibt ein Durchschlupf (m3-r1: Engstellen)
    building.collider =
      def.tower && w === 1 && d === 1
        ? this.colliders.addCircle(cx, cz, 0.36, `bau-${building.id}`)
        : this.colliders.addBox(i + 0.08, j + 0.08, i + w - 0.08, j + d - 0.08, `bau-${building.id}`);
    if (building.broken) building.collider.enabled = false; // Trümmer: begehbar
    if (type === 'barrikade') building.collider.climb = true; // Mika klettert drüber, die Horde nicht (m12-r1)
    this.grid.occupy(building.id, i, j, w, d);
    const radius = 1.1 + Math.max(w, d) * 0.3;
    // Werkbank, Bank, Beet: benutzen. Alles andere (auch Türme): mit E auswählen.
    building.interaction = def.use
      ? { id: `bau-${building.id}`, x: cx, z: cz, radius, prompt: def.prompt || def.use, use: def.use, building: building.id }
      : { id: `bau-${building.id}`, x: cx, z: cz, radius: radius - 0.2, prompt: 'auswaehlen', select: building.id };
    // Breite Bauten zum Benutzen (Werkbank, Bank, Beet): Der Abstand zählt zur Grundfläche,
    // nicht zur Mitte – vor ihrem Ende stehend war man sonst »zu weit weg« (m12-r1)
    if (def.use && Math.max(w, d) > 1) Object.assign(building.interaction, { hw: w / 2, hd: d / 2, radius: 1.25 });
    this.list.push(building);
    this.pathing?.rebuild();
    return building;
  }

  /** Darstellung (neu) anlegen – nach Bau oder Ausbau. */
  attachObject(b) {
    const { w, d } = footprint(b.type, b.turns);
    const cx = b.i + w / 2;
    const cz = b.j + d / 2;
    if (b.object) {
      this.group.remove(b.object);
      b.object.traverse((o) => o.geometry && !o.geometry.userData.shared && o.geometry.dispose());
    }
    if (b.pool) {
      this.lightPools.remove(b.pool);
      b.pool = null;
    }
    b.look = this.lookOf(b);
    b.object = this.object(b.type, b.turns, { level: b.level, spec: b.spec, look: b.look });
    if (b.part) this.addPart(b);
    if (BUILDINGS[b.type].tower) {
      b.rank = towerRank(b.xp);
      if (b.rank > 1) this.addPennants(b);
      this.addOutline(b.object);
    }
    b.object.position.set(cx, 0, cz);
    b.head = b.object.userData.head || null;
    if (b.head && b.headAngle !== undefined) b.head.rotation.y = b.headAngle;
    this.group.add(b.object);
    const spec = BUILDING_MODELS[b.type];
    if (spec?.pool) b.pool = this.lightPools.add(cx, cz + 0.3, spec.pool.radius);
    if (b.type === 'laternenturm') b.pool = this.lightPools.add(cx, cz, towerStatsOf(b).range);
  }

  /** Das Turmteil sichtbar am Turm (M10): Fernrohr auf dem Kopf, Ölkanne am Fuß, Münze vorn. */
  addPart(b) {
    const F = 1 / 16; // Turmteile sind im Maß 1/16 gebaut (Lage und Mitte in diesem Maß) …
    const model = edgeLight(towerPartModel(b.part).upsampled(2)); // … und werden wie die Türme doppelt fein gezeichnet (M13g)
    const mesh = new THREE.Mesh(model.toGeometry({ jitter: 0.03, seed: this.seed, size: F / 2 }), this.materials.building || this.materials.occluder);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = b.part;
    const head = b.object.userData.head;
    if (b.part === 'fernrohr' && head) {
      mesh.position.set(F / 2, b.object.userData.headTop + F, -F / 2);
      head.add(mesh);
      return;
    }
    if (b.part === 'schmierfett') mesh.position.set(0.18, 0, 0.18);
    else mesh.position.set(-F / 2, 0.55, 0.44);
    b.object.add(mesh);
  }

  /**
   * Wimpel für den Rang (M16): ein dünner Mast an der hinteren Ecke, darüber
   * ein Querholz mit einem bis drei Wimpeln, die im Wind wehen (Vertex-Shader,
   * wind: 'hang'). Rang IV hat einen goldenen in der Mitte.
   */
  addPennants(b) {
    const U = 1 / 32;
    const head = b.object.userData.head;
    const towerTop = head ? head.position.y + (b.object.userData.headTop || 0) : 1.2;
    const H = Math.round((towerTop + 0.35) / U); // Mast vom Boden bis knapp über den Kopf
    const key = `wimpel|${H}`;
    if (!this.models.has(key)) {
      const shared = (g) => {
        g.userData.shared = true;
        return g;
      };
      const pole = new VoxelModel();
      pole.box(0, 0, 0, 0, H, 0, P.e3);
      pole.box(-10, H, 0, 10, H, 0, P.e4); // Querholz: daran hängen die Wimpel wie eine kleine Kette
      pole.set(0, H + 1, 0, P.f6); // Knauf
      if (!this.models.has('wimpel|flags')) {
        const flag = (c1, c2) => {
          const m = new VoxelModel();
          // Dreieck mit der Spitze nach unten; der Ursprung liegt oben (dort hängt er)
          for (let y = 0; y < 9; y++) {
            const half = Math.max(0, Math.round((8 - y) * 0.4));
            m.box(-half, -y - 1, 0, half, -y - 1, 0, y === 2 ? c2 : c1);
          }
          return shared(m.toGeometry({ jitter: 0, ao: false, size: U }));
        };
        this.models.set('wimpel|flags', [flag(P.f3, P.f5), flag(P.b3, P.b5), flag(P.f6, P.f8)]);
      }
      this.models.set(key, { pole: shared(pole.toGeometry({ jitter: 0, ao: false, size: U })), top: (H + 0.5) * U });
    }
    const w = this.models.get(key);
    const flags = this.models.get('wimpel|flags');
    const mast = new THREE.Group();
    mast.name = 'wimpel';
    mast.position.set(-0.4, 0, -0.4); // hintere linke Ecke der Zelle: der Kopf dreht sich frei
    mast.add(new THREE.Mesh(w.pole, this.materials.building || this.materials.occluder));
    // Rang II: ein roter, III: rot und blau, IV: rot, gold, blau
    const colors = b.rank >= 4 ? [0, 2, 1] : b.rank === 3 ? [0, 1] : [0];
    const xs = colors.length === 1 ? [0] : colors.length === 2 ? [-4, 4] : [-7, 0, 7];
    colors.forEach((c, k) => {
      const flag = new THREE.Mesh(flags[c], this.materials.laundry || this.materials.building);
      flag.position.set(xs[k] * U, w.top, 0);
      mast.add(flag);
    });
    b.object.add(mast);
  }

  /**
   * Umriss hinter Verdeckungen: Jedes sichtbare Teil bekommt eine Kopie mit
   * dem Umriss-Material, die vorher gezeichnet wird (renderOrder 1 vor 1.2,
   * siehe materials.js) – der Kopf dreht sich mit, weil die Kopie sein Kind ist.
   */
  addOutline(object) {
    const parts = [];
    object.traverse((o) => {
      if (o.isMesh && o.material !== SHADOW_PROXY_MATERIAL && o.material !== this.glowMaterial) parts.push(o);
    });
    for (const mesh of parts) {
      mesh.renderOrder = 1.2;
      const outline = new THREE.Mesh(mesh.userData.outlineGeometry || mesh.geometry, this.towerSilhouette);
      outline.renderOrder = 1;
      mesh.add(outline);
    }
  }

  /** Aussehen einer Barrikade: ganz, kaputt (unter halber Haltbarkeit) oder Trümmer. */
  lookOf(b) {
    if (b.type !== 'barrikade') return 'ganz';
    if (b.broken) return 'truemmer';
    return b.hp < maxHpOf(b) * 0.5 ? 'kaputt' : 'ganz';
  }

  /** Nach Schaden oder Flicken: Aussehen der Barrikade nachziehen. */
  refreshLook(b) {
    if (this.lookOf(b) !== b.look) this.attachObject(b);
  }

  /** Barrikade zerbricht: Trümmer bleiben liegen, die Horde läuft darüber. */
  breakBarricade(b) {
    b.broken = true;
    b.hp = 0;
    b.collider.enabled = false;
    this.attachObject(b);
    this.pathing?.rebuild();
  }

  /** Barrikade aus Trümmern wieder aufbauen (volle Haltbarkeit). */
  rebuildBarricade(b) {
    b.broken = false;
    b.hp = maxHpOf(b);
    b.collider.enabled = true;
    this.attachObject(b);
    this.pathing?.rebuild();
  }

  /** Barrikade eine Stufe höher: der Schaden bleibt anteilig erhalten. */
  upgradeBarricade(b) {
    const share = b.hp / maxHpOf(b);
    b.level = Math.min(3, b.level + 1);
    b.hp = maxHpOf(b) * share;
    this.attachObject(b);
  }

  /** Turm auf eine neue Stufe/Spezialisierung bringen. */
  upgrade(b, level, spec) {
    b.level = level;
    if (spec) b.spec = spec;
    this.attachObject(b);
  }

  remove(id) {
    const index = this.list.findIndex((b) => b.id === id);
    if (index < 0) return null;
    const [building] = this.list.splice(index, 1);
    this.group.remove(building.object);
    building.object.traverse((o) => o.geometry && !o.geometry.userData.shared && o.geometry.dispose());
    this.colliders.remove(building.collider);
    this.grid.release(building.id);
    if (building.pool) this.lightPools.remove(building.pool);
    this.pathing?.rebuild();
    return building;
  }

  get interactions() {
    return this.list.map((b) => b.interaction);
  }

  /** Mittelpunkt und Grundriss eines Baus in Weltkoordinaten. */
  bounds(building) {
    const { w, d } = footprint(building.type, building.turns);
    return { i: building.i, j: building.j, w, d, x: building.i + w / 2, z: building.j + d / 2 };
  }

  toState() {
    return this.list.map((b) => {
      const e = { id: b.id, type: b.type, i: b.i, j: b.j, turns: b.turns };
      if (b.day) e.day = b.day;
      if (b.level) e.level = b.level;
      if (b.spec) e.spec = b.spec;
      if (b.part) e.part = b.part;
      if (b.xp) e.xp = Math.round(b.xp);
      if (b.kills) e.kills = b.kills;
      if (b.name !== null && b.name !== undefined) e.name = b.name;
      if (b.broken) e.broken = true;
      if (b.hp !== undefined && b.hp < maxHpOf(b)) e.hp = Math.round(b.hp);
      return e;
    });
  }

  load(entries) {
    const pathing = this.pathing;
    this.pathing = null; // erst am Ende einmal neu rechnen
    for (const b of [...this.list]) this.remove(b.id);
    for (const e of entries) {
      if (!BUILDINGS[e.type]) continue;
      const { w, d } = footprint(e.type, e.turns);
      // Ältere Stände dürfen auf heutigen Rohstoff-Zellen stehen (nicht strikt)
      if (!this.grid.canPlace(e.i, e.j, w, d, false)) continue;
      const b = this.place(e.type, e.i, e.j, e.turns, e.id, e);
      if (e.day) b.day = e.day;
    }
    this.pathing = pathing;
    this.pathing?.rebuild();
  }
}
