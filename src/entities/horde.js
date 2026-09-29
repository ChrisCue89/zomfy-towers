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
import { STATUS, REACTIONS, WEATHER_EFFECTS, STUN } from '../data/reactions.js';
import { CHAMPION, TRAITS, cleanChampion } from '../data/champions.js';
import { WAVE_TRAITS, FOG_SEEN } from '../data/waves.js';
import { BOSS_ATTACKS } from '../data/bosses.js';
import { zombieParts, ZOMBIE_TYPES, podModel } from './zombieModels.js';
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

const MAX_PER_TYPE = 180; // M25: späte Nächte (Schwärmer aus Brütern, Pilzmutter, Moderflut) – vorher 110
const RECOIL = 0.22; // so lange taumelt ein Schlurfer nach einem Treffer zurück
const WINDUP = 0.38; // so lange holt ein Schlurfer aus, bevor er beißt
const BITE_LUNGE = 0.45; // M16: so weit reicht der Biss über die Reichweite hinaus (Ausfallschritt)
const HORDE_MOVE = { bounds: true, horde: true }; // durch Balduins Wagen hindurch (steht nicht im Flussfeld)
const FLY_MOVE = { bounds: true, horde: true, climb: true }; // M22: Moderfalter fliegen über Barrikaden
/** Flughöhe der Moderfalter (m) und wie lange ein Gräber braucht, um abzutauchen bzw. aufzutauchen (s). */
const FLY_HEIGHT = 1.05;
const DIG_DOWN = 0.6;
const DIG_UP = 0.45;
const DIG_DEPTH = 1.2;
/** Zustände (M18) und ihre Uhren am Schlurfer. */
const STATUS_KEY = { nass: 'wetT', frostig: 'frostT', matschig: 'mudT', geblendet: 'blindT' };
/** Nach einer Reaktion kann derselbe Schlurfer sie so lange nicht noch einmal auslösen (s). */
const REACT_AGAIN = 6;
/** So breit ist Mika für die Schlurfer: näher kommt keiner (m16-r1). */
const PLAYER_R = 0.3;
const TINT = {
  normal: new THREE.Color(1, 1, 1),
  flash: new THREE.Color(4, 4, 4),
  frozen: new THREE.Color(0.75, 0.95, 1.5),
  burning: new THREE.Color(1.5, 0.95, 0.6),
  slowed: new THREE.Color(0.85, 0.97, 1.2),
  stunned: new THREE.Color(1.35, 1.25, 0.75),
  // Champions (M21): goldener Schimmer, der langsam pulsiert (zwischen den beiden Tönen)
  champion: new THREE.Color(1.55, 1.22, 0.42),
  championDim: new THREE.Color(1.25, 1.05, 0.55),
};
const championTint = new THREE.Color();
/** Nebelwelle (M22): Wer nicht im Licht steht, von dem sieht man nur die Augen. */
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
/**
 * Gezeichnet wird nur, wer im Bild steht – mit so viel Rand (m) für Schatten, Umriss
 * und das Einrasten der Kamera (M25c: in späten Nächten zeichnete das Bild sonst jeden
 * Schlurfer der Karte, über 25 Mio. Dreiecke bei 560 Schlurfern).
 */
const VIEW_MARGIN = 2.5;
// Abstandhalten über ein Raster (M26): Zellen von SEP_CELL m, gefunden werden alle
// Paare bis SEP_CELL Abstand. Wer größer ist als SEP_BIG (Anführer, Bosse), prüft
// gegen alle – das sind nur wenige.
const SEP_CELL = 0.9;
const SEP_BIG = 0.42;
const SEP_HASH = 256; // Zellen je Achse (umlaufend – entfernte Zellen teilen sich einen Eimer, geprüft wird der echte Abstand)
const HIT_JITTER = 1 / 80; // M26: Getroffene zittern einen Pixel (bei 80 px/m)
const _frustum = new THREE.Frustum();
const _viewProj = new THREE.Matrix4();
const _sphere = new THREE.Sphere();

/** Unsichtbares Gerüst einer Art: Gelenke als Object3D, Teile als Anker. */
class Rig {
  constructor(parts) {
    this.root = new THREE.Object3D();
    this.body = new THREE.Object3D();
    this.root.add(this.body);
    this.pivots = {};
    this.anchors = {};
    // Teile an einem anderen Teil (Kopf, Arm – M22: die Laterne der Hexe) hängen an dessen Gelenk
    const attached = (p) => p.parent !== 'root' && p.parent !== 'body';
    for (const p of parts) {
      if (attached(p)) continue;
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
      if (!attached(p)) continue;
      const anchor = new THREE.Object3D();
      const U = p.unit || V;
      const joint = parts.find((q) => q.name === p.parent).joint;
      anchor.position.set((p.offset[0] - joint[0]) * U, (p.offset[1] - joint[1]) * U, (p.offset[2] - joint[2]) * U);
      this.pivots[p.parent].add(anchor);
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
    this.pods = []; // Sporenkapseln der Brüter (M22)
    this.nextPod = 1;
    this.livingCount = {}; // Lebende je Art (M25c: `room`)
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
        // Nach dem eigenen Umriss (1) und nach Mikas Umriss (1.75) – siehe materials.js.
        // m16-r1: Stand ein Schlurfer vor Mika, schien ihr Umriss gelb gerastert über ihn –
        // im Getümmel wurde daraus ein Knäuel; jetzt leuchtet er nur hinter Bauten auf.
        mesh.renderOrder = 1.8;
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
      this.kinds[type] = { rig: new Rig(parts), meshes, parts: parts.map((p) => p.name), glow: new Set(parts.filter((p) => p.glow).map((p) => p.name)) };
    }
    // Sporenkapseln (M22): glimmen violett, pulsieren, bis Schwärmer schlüpfen
    this.podMesh = new THREE.InstancedMesh(podModel().toGeometry({ jitter: 0, ao: false, size: 1 / 32 }), this.glowMaterial, 64);
    this.podMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.podMesh.frustumCulled = false;
    this.podMesh.count = 0;
    this.podMesh.visible = false;
    this.group.add(this.podMesh);
    this._podDummy = new THREE.Object3D();
    this._dir = { x: 0, z: 0 };
    this._pt = { x: 0, z: 0 };
    this._pos = new THREE.Vector3();
  }

  get alive() {
    let n = 0;
    for (const z of this.list) if (z.state !== 'dying') n++;
    return n;
  }

  /** Lebende je Art neu zählen (jeder Schritt; `spawn` zählt dazwischen mit). */
  recount() {
    const c = this.livingCount;
    for (const type in c) c[type] = 0;
    for (const z of this.list) if (z.state !== 'dying') c[z.type] = (c[z.type] || 0) + 1;
  }

  /**
   * Wie viele dieser Art noch dazukommen dürfen (M25c). Mehr als MAX_PER_TYPE
   * zeichnet das Bild nicht – wer darüber läge, liefe unsichtbar mit. Die
   * Warteschlange der Nacht wartet dann, Kapseln und Rufe bleiben aus.
   */
  room(type) {
    return Math.max(0, MAX_PER_TYPE - (this.livingCount[type] || 0));
  }

  /**
   * Schlurfer anlegen.
   * @param {string} type
   * @param {{from?:{x,z}, entry?:{x,z}, x?:number, z?:number, hpFactor?:number, day?:boolean, champion?:{name:number, traits:string[]}|null, trait?:string|null}} o
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
      // Zustände (M18): nass, frostig, matschig, geblendet (Sekunden); Eisblock; Glut
      wetT: 0,
      frostT: 0,
      mudT: 0,
      blindT: 0,
      iceT: 0,
      markT: 0, // markiert vom Leuchtpfeil (M20): alle Türme treffen härter
      markBonus: 0,
      glut: false,
      reacted: {}, // Reaktion → Zeitpunkt (Horde-Uhr), ab dem sie wieder geht
      lureBy: 0, // von dieser Vogelscheuche gelockt (M19, Bau-ID)
      lureUntil: 0,
      lureAgain: 0, // erst ab dann lässt er sich wieder locken
      inCamp: false, // schon einmal hinter Wall und Tor gewesen (M17d)
      raidScan: 0,
      raidT: 0,
      raidIgnore: null, // an diesen Bau kam er nicht heran
      deathT: 0,
      aggro: day ? DAY_ZOMBIE.aggro : def.aggro ?? NIGHT_AGGRO,
      lootFactor: day ? 0.5 : o.lootFactor || 1, // M16: Schwierigkeit und Mutbonus
    };
    if (o.entry) z.facing = Math.atan2(o.entry.x - start.x, o.entry.z - start.z);
    if (o.champion && !day) this.makeChampion(z, o.champion);
    if (o.trait && !day) this.applyTrait(z, o.trait);
    // Boss (M22): angekündigte Angriffe; lichtfressend wie die Hexe
    if (def.boss) z.boss = { kind: null, next: BOSS_ATTACKS[def.attacks[0]].first, windup: 0, charge: 0, wait: 0 };
    if (def.lightproof) z.lightproof = true;
    // Neue Arten (M22)
    if (def.flying) z.y = FLY_HEIGHT;
    if (def.door) z.doorHp = def.door.hp;
    if (def.brood) z.broodT = def.brood.every * (0.5 + this.rng.next() * 0.5);
    if (def.snuff) z.snuffT = 0;
    this.list.push(z);
    this.livingCount[type] = (this.livingCount[type] || 0) + 1;
    return z;
  }

  /** Wellenmerkmal (M22, data/waves.js): flink, gepanzert, im Nebel, heilend (Moderflut steckt im Plan). */
  applyTrait(z, trait) {
    const t = WAVE_TRAITS[trait];
    if (!t) return;
    z.trait = trait;
    if (t.speed) z.speed *= t.speed;
    if (t.armor) z.armor = (z.armor ?? z.def.armor) + t.armor;
    if (t.fog) {
      z.fog = true;
      z.seenT = 0;
    }
    if (t.regen && !(z.regen >= t.regen)) {
      z.regen = t.regen;
      z.calm = t.calm;
      z.calmT = 0;
    }
  }

  /** Nebelwelle (M22): außerhalb von Licht unsichtbar – Türme treffen ihn nicht, man sieht nur die Augen. */
  isHidden(z) {
    return (Boolean(z.fog) && !(z.seenT > 0)) || z.y < -0.5; // M22: auch der Gräber unter der Erde
  }

  /** Ins Licht geholt (Laternenblitz): eine Weile sichtbar, auch im Nebel. */
  reveal(z, time) {
    if (z.fog) z.seenT = Math.max(z.seenT || 0, time);
  }

  /**
   * Champion (M21): mehr Leben, etwas größer, goldener Schimmer, ein Name und
   * Merkmale (data/champions.js).
   */
  makeChampion(z, spec) {
    const c = cleanChampion(spec);
    if (!c) return;
    z.champion = c;
    z.size = CHAMPION.scale;
    z.maxHp = z.hp = Math.round(z.maxHp * CHAMPION.hp);
    z.calmT = 0; // seit wann ihn nichts getroffen hat (moosig)
    z.calm = TRAITS.moosig.calm;
    for (const t of c.traits) {
      const tr = TRAITS[t];
      if (tr.armor) z.armor = (z.def.armor || 0) + tr.armor;
      if (tr.speed) z.speed *= tr.speed;
      if (tr.shield) z.shield = z.shieldMax = Math.round(z.maxHp * tr.shield);
      if (tr.regen) z.regen = tr.regen;
      if (tr.split) z.split = tr.split;
      if (tr.lightproof) z.lightproof = true;
    }
  }

  clear() {
    this.list.length = 0;
    this.pods.length = 0;
    this.recount();
  }

  /** Sporenkapseln (M22): reifen, bis Schwärmer schlüpfen. */
  updatePods(dt) {
    for (let i = this.pods.length - 1; i >= 0; i--) {
      const p = this.pods[i];
      p.t -= dt;
      if (p.t > 0) continue;
      this.pods.splice(i, 1);
      const n = Math.min(p.count, this.room('schwaermer')); // M25c: nie unsichtbar
      for (let k = 0; k < n; k++) {
        const a = (k / p.count) * Math.PI * 2;
        const o = this.spawn('schwaermer', { x: p.x + Math.cos(a) * 0.4, z: p.z + Math.sin(a) * 0.4, hpFactor: p.hpFactor });
        o.state = 'walk';
      }
      this.cb.onHatch?.(p);
    }
  }

  /** Eine Sporenkapsel zertreten oder zerschlagen (Mika, Laternenblitz). */
  hitPod(p, amount) {
    p.hp -= amount;
    if (p.hp > 0) return false;
    const i = this.pods.indexOf(p);
    if (i >= 0) this.pods.splice(i, 1);
    this.cb.onPodBurst?.(p);
    return true;
  }

  /** Kapseln im Umkreis. */
  podsNear(x, z, r) {
    return this.pods.filter((p) => (p.x - x) ** 2 + (p.z - z) ** 2 <= r * r);
  }

  /** Schaden austeilen. Gibt true zurück, wenn der Schlurfer daran stirbt. */
  /** @param {{by?: number|null}} [opts] by: Turm, dem Schaden und Abschuss gutgeschrieben werden (M16) */
  damage(z, amount, { pierce = false, push = 0, fromX = null, fromZ = null, source = null, lucky = false, by = null, kind = null } = {}) {
    if (z.state === 'dying') return false;
    // Reaktionen am Treffer (M18): Eisblock zerspringt (nicht am Sprühnebel selbst),
    // Bolzen in die Schwachstelle
    if (z.iceT > 0 && kind !== 'spray') {
      amount *= REACTIONS.eisblock.shatter;
      z.iceT = 0;
      z.freezeT = 0;
      this.cb.onShatter?.(z);
    }
    if (kind === 'bolzen' && z.blindT > 0) {
      amount *= REACTIONS.schwachstelle.damage;
      this.reaction(z, 'schwachstelle', 1.2);
    }
    // Markiert (M20, Leuchtpfeil): Türme treffen härter
    if (z.markT > 0 && source === 'turm') amount *= 1 + z.markBonus;
    z.calmT = 0;
    // Schildträger (M22): Die Tür fängt von vorn drei Viertel ab, bis sie bricht (Brand und Fallen kommen von unten)
    if (z.doorHp > 0 && source !== 'feuer' && kind !== 'falle') {
      const from = fromX !== null ? { x: fromX, z: fromZ } : this.cb.sourceOf?.(source, by) || null;
      if (from) {
        const dx = from.x - z.x;
        const dz = from.z - z.z;
        const d = Math.hypot(dx, dz) || 1;
        if ((Math.sin(z.facing) * dx + Math.cos(z.facing) * dz) / d > Math.cos((z.def.door.angle * Math.PI) / 180)) {
          const caught = amount * (1 - z.def.door.front);
          z.doorHp -= caught;
          amount -= caught;
          z.flash = 0.1;
          if (z.doorHp <= 0) this.cb.onDoorBreak?.(z);
        }
      }
    }
    // Schild eines Champions (M21): fängt zuerst ab, dann bricht er
    if (z.shield > 0) {
      const caught = Math.min(z.shield, amount);
      z.shield -= caught;
      amount -= caught;
      z.flash = 0.1;
      if (z.shield <= 0) this.cb.onShieldBreak?.(z);
      if (amount <= 0) return false;
    }
    const dealt = Math.max(1, Math.round(pierce ? amount : amount - (z.armor ?? z.def.armor)));
    z.hp -= dealt;
    z.flash = 0.1;
    z.recoil = RECOIL;
    if (push && fromX !== null && !z.def.steadfast) {
      const dx = z.x - fromX;
      const dz = z.z - fromZ;
      const d = Math.hypot(dx, dz) || 1;
      const resist = z.def.heavy ? 0.35 : 1;
      z.kx += (dx / d) * push * 6 * resist;
      z.kz += (dz / d) * push * 6 * resist;
    }
    this.cb.onDamage?.(z, dealt, source, by, kind);
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
    z.freezeT = Math.max(z.freezeT, time * (z.def.heavy ? 0.5 : 1));
    z.windup = 0;
  }

  /**
   * Betäuben (Nahkampf, Laternenblitz): steht still, schlägt nicht, holt neu aus. Zähe nur halb so lange.
   * @param {boolean} [light] vom Licht (Laternenblitz) – ein lichtfressender Champion merkt das nicht (M21)
   */
  stun(z, time, light = false) {
    if (z.state === 'dying' || (light && z.lightproof) || z.def.steadfast) return;
    // M25c: am Stück höchstens STUN.chain s, danach schüttelt er sich STUN.free s lang frei
    const now = this.time;
    if (!(z.stunT > 0)) {
      if (now < (z.stunFree || 0)) return;
      z.stunFrom = now;
    }
    const t = Math.min(time * (z.def.heavy ? 0.5 : 1), (z.stunFrom ?? now) + STUN.chain - now);
    if (!(t > z.stunT)) return;
    z.stunT = t;
    z.stunFree = now + t + STUN.free;
    z.windup = 0;
  }

  /** Ablenken (Pfiff, M16): bleibt stehen und starrt auf (x, zz). Zähe nur halb so lange. */
  lure(z, x, zz, time) {
    if (z.state === 'dying' || z.state === 'enter' || z.def.steadfast) return;
    z.lureT = Math.max(z.lureT, time * (z.def.heavy ? 0.5 : 1));
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

  /**
   * Zustand setzen (M18): nass, frostig, matschig oder geblendet für `time`
   * Sekunden (ein neuer Treffer frischt auf) – danach prüfen, ob sich zwei
   * Zustände zu einer Reaktion treffen.
   */
  status(z, kind, time = STATUS[kind].time) {
    if (z.state === 'dying' || (kind === 'geblendet' && z.lightproof)) return; // lichtfressend (M21)
    const key = STATUS_KEY[kind];
    z[key] = Math.max(z[key], time);
    this.react(z);
  }

  /** Eine Reaktion melden (Wort über dem Kopf, Notizbuch) – je Schlurfer nicht zu oft. */
  reaction(z, kind, again = REACT_AGAIN) {
    if ((z.reacted[kind] || 0) > this.time) return false;
    z.reacted[kind] = this.time + again;
    this.cb.onReaction?.(kind, z);
    return true;
  }

  /** Zwei passende Zustände treffen sich (M18): Eisblock, Dampf, Glut. */
  react(z) {
    if (z.state === 'dying') return;
    if (z.wetT > 0 && z.frostT > 0 && !(z.iceT > 0) && (z.reacted.eisblock || 0) <= this.time) {
      const r = REACTIONS.eisblock;
      z.wetT = 0;
      z.frostT = 0;
      z.iceT = r.freeze;
      this.freeze(z, r.freeze);
      this.reaction(z, 'eisblock', 4);
    }
    if (z.wetT > 0 && z.burnT > 0 && (z.reacted.dampf || 0) <= this.time) {
      const r = REACTIONS.dampf;
      z.wetT = 0;
      z.burnT = 0;
      z.burn = 0;
      for (const o of this.inRange(z.x, z.z, r.radius)) this.stun(o, r.confuse);
      this.reaction(z, 'dampf');
    }
    if (z.burnT > 0 && z.mudT > 0 && !z.glut) {
      const r = REACTIONS.glut;
      z.mudT = 0;
      z.glut = true;
      z.burnT *= r.burnTime;
      z.burn *= r.burnDps;
      this.reaction(z, 'glut', 1);
    }
  }

  /**
   * Vogelscheuche (M19): Der Schlurfer verlässt den Weg und schlägt auf sie ein –
   * `time` Sekunden lang (Zähe halb so lang), dann kehrt er an seine Stelle auf
   * dem Weg zurück (wie nach einer Jagd).
   */
  lureTo(z, b, time) {
    if (z.state === 'dying' || z.state === 'enter') return;
    z.state = 'raid';
    z.target = b.id;
    z.raidT = 0;
    z.lureBy = b.id;
    z.lureUntil = this.time + time * (z.def.heavy ? 0.5 : 1);
  }

  /** Genug gelockt: zurück auf den Weg, eine Weile lässt er sich nicht wieder locken. */
  endLure(z) {
    z.lureBy = 0;
    z.lureAgain = this.time + 4;
    this.endChase(z);
  }

  /** Windrad (M19): ein Stück den Weg zurück, gegen das Flussfeld. Zähe nur knapp halb so weit. */
  blowBack(z, dist) {
    if (z.state === 'dying' || z.state === 'enter' || z.def.steadfast) return;
    const dir = this.world.pathing.direction(z.x, z.z, true, this._dir);
    if (!dir) return;
    const resist = z.def.heavy ? 0.4 : 1;
    z.kx -= dir.x * dist * 6 * resist;
    z.kz -= dir.z * dist * 6 * resist;
  }

  /** Markieren (M20, Leuchtpfeil): `time` Sekunden treffen alle Türme um `bonus` härter. */
  mark(z, time, bonus) {
    if (z.state === 'dying') return;
    z.markT = Math.max(z.markT, time);
    z.markBonus = Math.max(z.markT > time ? z.markBonus : 0, bonus);
  }

  /** Alle Lebenden im Umkreis (neue Liste). */
  /**
   * Boss (M22): Angriffe mit Ankündigung. Ist einer fällig und lohnt er sich
   * (`cb.bossReady`), steht der Boss `telegraph` Sekunden still und holt aus
   * (`onBossTelegraph`: Ring und Wort), dann folgt der Schlag (`onBossAttack`).
   */
  bossStep(z, dt, ctx) {
    const b = z.boss;
    if (b.charge > 0) b.charge -= dt;
    if (b.windup > 0) {
      b.windup -= dt;
      if (b.windup > 0) return;
      const a = BOSS_ATTACKS[b.kind];
      this.cb.onBossAttack?.(z, b.kind);
      if (a.charge) b.charge = a.charge;
      b.next = a.every;
      b.kind = null;
      return;
    }
    b.next -= dt;
    if (b.next > 0 || z.freezeT > 0 || z.stunT > 0) return;
    // Mehrere Angriffe (M25, Moderherz: je Phase andere) kommen reihum
    const list = b.attacks || z.def.attacks;
    const kind = list[(b.round || 0) % list.length];
    // Lohnt es sich gerade nicht, wartet er – aber nie ewig (sonst sähe man es nie)
    b.wait += 1;
    if (!(this.cb.bossReady?.(z, kind) ?? true) && b.wait < 12) {
      b.next = 1;
      return;
    }
    b.wait = 0;
    b.round = (b.round || 0) + 1;
    b.kind = kind;
    b.windup = BOSS_ATTACKS[kind].telegraph;
    z.windup = 0;
    this.cb.onBossTelegraph?.(z, kind);
  }

  inRange(x, z, r) {
    const out = [];
    for (const zo of this.list) if (zo.state !== 'dying' && zo.state !== 'enter' && !(zo.y < -0.5) && (zo.x - x) ** 2 + (zo.z - z) ** 2 <= r * r) out.push(zo); // M22: nicht unter der Erde
    return out;
  }

  /**
   * @param {number} dt
   * @param {{player:{x:number,z:number,inside:boolean,alive:boolean}, lightSlow:(x,z)=>number}} ctx
   */
  update(dt, ctx) {
    this.time += dt;
    this.recount();
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
        if (z.y > 0) z.y = Math.max(0, z.y - dt * 3); // M22: der Moderfalter fällt herunter
        if (z.y < 0) z.y = Math.min(0, z.y + dt * 3); // … der Gräber kommt noch einmal hoch
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
      // Zustände (M18): Regen macht nass, Licht blendet; dann laufen die Uhren
      z.wetT = Math.max(ctx.wet ? 0.3 : 0, z.wetT - dt);
      z.frostT = Math.max(0, z.frostT - dt);
      z.mudT = Math.max(0, z.mudT - dt);
      z.blindT = Math.max(0, z.blindT - dt);
      z.iceT = Math.max(0, z.iceT - dt);
      z.markT = Math.max(0, z.markT - dt);
      if (z.noChase > 0) z.noChase -= dt;
      if (z.burnT > 0) {
        z.burnT -= dt;
        if (z.burnT <= 0) z.glut = false;
        z.burnAcc = (z.burnAcc || 0) + z.burn * dt * (ctx.burnFactor ?? 1); // Regen dämpft den Brand (M18)
        if (z.burnAcc >= 1) {
          const n = Math.floor(z.burnAcc);
          z.burnAcc -= n;
          if (this.damage(z, n, { pierce: true, source: 'feuer', by: z.burnBy ?? null })) continue;
        }
      }
      // Nebelwelle (M22): im Licht sichtbar, danach noch einen Moment; ringsum zieht Nebel
      if (z.fog) {
        if (ctx.lit && ctx.lit(z.x, z.z)) z.seenT = FOG_SEEN;
        else z.seenT = Math.max(0, (z.seenT || 0) - dt);
        z.mistT = (z.mistT || 0) - dt;
        if (z.mistT <= 0) {
          z.mistT = 0.5;
          this.cb.onMist?.(z);
        }
      }
      // Champions (M21): goldenes Glitzern ringsum
      if (z.champion) {
        z.sparkT = (z.sparkT || 0) - dt;
        if (z.sparkT <= 0) {
          z.sparkT = 0.4;
          this.cb.onSparkle?.(z);
        }
      }
      // Moosig (M21): Wen eine Weile nichts trifft, der wächst wieder zu
      if (z.regen) {
        z.calmT += dt;
        if (z.calmT >= (z.calm ?? TRAITS.moosig.calm) && z.hp < z.maxHp) z.hp = Math.min(z.maxHp, z.hp + z.maxHp * z.regen * dt);
      }
      if (z.boss && z.state !== 'enter') this.bossStep(z, dt, ctx);
      // Neue Arten (M22): Flughöhe, Lichter löschen, Sporenkapseln legen
      if (z.def.flying) z.y = FLY_HEIGHT + Math.sin(this.time * 3 + z.id) * 0.12;
      if (z.def.snuff && z.state !== 'enter' && (z.snuffT -= dt) <= 0) {
        z.snuffT = 0.4;
        this.cb.onSnuff?.(z);
      }
      if (z.def.brood && z.state !== 'enter' && z.state !== 'dig' && (z.broodT -= dt) <= 0) {
        z.broodT = z.def.brood.every;
        // M25c: nur so viele Kapseln, wie er trägt (`max`) – sonst legte ein zäher Brüter in
        // späten Nächten ohne Ende, und über tausend Schwärmer verstopften die Wege
        if ((z.laid || 0) < z.def.brood.max && this.room('schwaermer') > 0) {
          z.laid = (z.laid || 0) + 1;
          this.pods.push({ x: z.x, z: z.z, t: z.def.brood.hatch, hp: z.def.brood.hp, count: z.def.brood.count, hpFactor: z.maxHp / z.def.hp, id: this.nextPod++ });
          this.cb.onPod?.(z);
        }
      }
      if (z.def.summon && z.state !== 'enter') {
        z.summonT -= dt;
        if (z.summonT <= 0) {
          z.summonT = z.def.summon.every;
          const n = Math.min(z.def.summon.count, this.room(z.def.summon.type)); // M25c: nie unsichtbar
          for (let k = 0; k < n; k++) {
            const a = (k / z.def.summon.count) * Math.PI * 2;
            const s = this.spawn(z.def.summon.type, { x: z.x + Math.cos(a) * 0.9, z: z.z + Math.sin(a) * 0.9, hpFactor: z.maxHp / z.def.hp });
            s.state = 'walk';
            this.cb.onSummon?.(s);
          }
        }
      }

      const lured = z.lureT > 0;
      const frozen = z.freezeT > 0 || z.stunT > 0 || lured || z.boss?.windup > 0; // M22: der Boss holt aus
      const light = ctx.lightSlow && !z.lightproof ? ctx.lightSlow(z.x, z.z) : 0; // Licht macht den Moder müde (nicht den lichtfressenden Champion, M21)
      if (light > 0) z.blindT = Math.max(z.blindT, STATUS.geblendet.light); // … und blendet (M18)
      this.react(z);
      let speed = z.speed * (1 - z.slow) * (z.hasted ? 1 + 0.15 : 1) * (1 - light);
      if (z.boss?.charge > 0) speed = z.speed * BOSS_ATTACKS.hieb.chargeSpeed; // M22: der Holzfäller stürmt
      if (frozen) speed = 0;
      z.cooldown = Math.max(0, z.cooldown - dt);
      z.attackAnim = Math.max(0, z.attackAnim - dt);

      let vx = 0;
      let vz = 0;
      const reach = z.def.radius + 0.5;
      const pd = Math.hypot(player.x - z.x, player.z - z.z);

      // Letzte Stelle auf Weg oder Hof merken: Dorthin kehrt ein Jäger zurück (m12-r1)
      if (z.state !== 'chase' && z.state !== 'rejoin' && z.state !== 'enter' && !z.lureBy && pathing.onPathOrYard(z.x, z.z)) {
        z.ax = z.x;
        z.az = z.z;
        z.anchored = true;
      }

      // Mika in der Nähe? (Nicht, wenn sie im Haus ist – und nicht, solange Wall und Tor
      // dazwischen stehen, M17: dann geht er weiter zum Tor und schlägt es ein. In der
      // Schlupftür steht sie beiden Seiten offen.)
      const walled = campShut && (z.x < campX - 1.05 ? player.x > campX : z.x > campX && player.x < campX - 1.05);
      if (z.state !== 'enter' && !(z.noChase > 0) && player.alive && !player.inside && pd < z.aggro && !walled) {
        z.state = 'chase';
        z.lureBy = 0; // Mika geht vor der Vogelscheuche (M19)
      }
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
          const dir = pathing.direction(z.x, z.z, z.def.flying ? 'free' : true, this._dir); // M22: Flieger über Barrikaden
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
            const camp = BUILDINGS[ahead.type].camp;
            if (z.def.flying && !camp) break; // M22: der Moderfalter fliegt drüber
            if (z.def.digger && !camp) {
              // M22: der Gräber buddelt sich drunter durch
              z.state = 'dig';
              z.digT = 0;
              z.digPhase = 'down';
              z.digUnder = false; // schon unter der Barrikade gewesen?
              this.cb.onDig?.(z, true);
              break;
            }
            z.state = 'smash';
            z.target = ahead.id;
            vx = 0;
            vz = 0;
          }
          break;
        }
        case 'dig': {
          // M22: abtauchen, unter der Barrikade durch (freies Feld), wieder auftauchen
          z.digT += dt;
          if (z.digPhase === 'down') {
            z.y = -Math.min(1, z.digT / DIG_DOWN) * DIG_DEPTH;
            if (z.digT >= DIG_DOWN) z.digPhase = 'tunnel';
            break;
          }
          if (z.digPhase === 'tunnel') {
            const under = world.buildings.atCell(Math.floor(z.x), Math.floor(z.z));
            const blocked = Boolean(under && BUILDINGS[under.type].smash && !under.broken);
            if (blocked) z.digUnder = true;
            // Unter der Erde weiter, bis er unter der Barrikade durch ist (höchstens 8 s)
            if ((blocked || !z.digUnder) && z.digT < 8) {
              const dir = pathing.direction(z.x, z.z, 'free', this._dir);
              if (dir) {
                vx = dir.x * speed * 0.9;
                vz = dir.z * speed * 0.9;
              }
              break;
            }
            z.digPhase = 'up';
          }
          z.y = Math.min(0, z.y + (dt / DIG_UP) * DIG_DEPTH);
          if (z.y >= 0) {
            z.state = 'walk';
            z.digPhase = null;
            this.cb.onDig?.(z, false);
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
          // Im Lager (M17d): an die nächste Kante des Baus und draufschlagen –
          // oder gelockt von einer Vogelscheuche (M19), bis sie umfällt oder die Zeit um ist
          const b = world.buildings.get(z.target);
          if (z.lureBy && (!b || b.hp <= 0 || this.time > z.lureUntil)) {
            this.endLure(z);
            break;
          }
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
            if (z.raidT > RAID.giveUp * (z.lureBy ? 2 : 1)) {
              if (z.lureBy) {
                this.endLure(z); // kommt nicht an die Vogelscheuche heran
                break;
              }
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
              if (z.lureBy) this.cb.onLureHit?.(b, z.def.hit, z);
              else this.cb.onRaidHit?.(b, z.def.hit, z);
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
        if (z.state === 'enter' || z.state === 'dig') {
          z.x += vx * dt;
          z.z += vz * dt;
        } else {
          this._pos.set(z.x, 0, z.z);
          world.colliders.move(this._pos, vx * dt, vz * dt, z.def.radius * 0.9, z.def.flying ? FLY_MOVE : HORDE_MOVE);
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

    this.updatePods(dt);
    this.separate(dt);
    if (player.alive && !player.inside) this.keepOffPlayer(player, dt);
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

  /**
   * Niemand steht in Mika (m16-r1: ein Brummer stand deckungsgleich auf ihr, Zielen
   * wurde Raten): Wer ihr zu nah kommt, wird sanft zurückgeschoben – Mika selbst nicht.
   */
  keepOffPlayer(player, dt) {
    for (const z of this.list) {
      if (z.state === 'dying' || z.state === 'enter') continue;
      const dx = z.x - player.x;
      const dz = z.z - player.z;
      const min = z.def.radius + PLAYER_R;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.01;
      const k = ((min - d) / d) * Math.min(1, dt * 10);
      z.x += (d2 < 1e-6 ? 0.01 : dx) * k;
      z.z += (d2 < 1e-6 ? 0 : dz) * k;
    }
  }

  /**
   * Schlurfer schieben sich nicht ineinander. M26: über ein Raster statt jeder
   * gegen jeden – bei 560 Schlurfern war das gut die Hälfte der Rechenzeit.
   */
  separate(dt) {
    const list = this.list;
    const n = list.length;
    if (!this._sepHead) {
      this._sepHead = new Int32Array(SEP_HASH * SEP_HASH);
      this._sepNext = new Int32Array(256);
      this._sepCell = new Int32Array(256);
      this._sepBig = [];
    }
    if (this._sepNext.length < n) {
      this._sepNext = new Int32Array(n * 2);
      this._sepCell = new Int32Array(n * 2);
    }
    const head = this._sepHead.fill(-1);
    const next = this._sepNext;
    const cellOf = this._sepCell;
    const big = this._sepBig;
    big.length = 0;
    const k = Math.min(1, dt * 12);
    for (let a = 0; a < n; a++) {
      const A = list[a];
      cellOf[a] = -1;
      if (A.state === 'dying' || A.state === 'enter') continue;
      if (A.def.radius > SEP_BIG) {
        big.push(a);
        continue;
      }
      const cx = Math.floor(A.x / SEP_CELL) & (SEP_HASH - 1);
      const cz = Math.floor(A.z / SEP_CELL) & (SEP_HASH - 1);
      const c = cz * SEP_HASH + cx;
      cellOf[a] = c;
      next[a] = head[c];
      head[c] = a;
    }
    // Kleine gegen kleine: je Paar einmal (der mit dem kleineren Index schiebt)
    for (let a = 0; a < n; a++) {
      const c = cellOf[a];
      if (c < 0) continue;
      const A = list[a];
      const cx = c % SEP_HASH;
      const cz = (c - cx) / SEP_HASH;
      for (let oz = -1; oz <= 1; oz++) {
        const rz = ((cz + oz) & (SEP_HASH - 1)) * SEP_HASH;
        for (let ox = -1; ox <= 1; ox++) {
          for (let b = head[rz + ((cx + ox) & (SEP_HASH - 1))]; b >= 0; b = next[b]) {
            if (b > a) this.separatePair(A, list[b], k);
          }
        }
      }
    }
    // Große gegen alle (Anführer, Bosse; Große untereinander nur einmal)
    for (const a of big) {
      const A = list[a];
      for (let b = 0; b < n; b++) {
        if (b === a) continue;
        const B = list[b];
        if (B.state === 'dying' || B.state === 'enter') continue;
        if (B.def.radius > SEP_BIG && b < a) continue;
        this.separatePair(A, B, k);
      }
    }
  }

  /** Zwei Schlurfer auseinanderschieben, wenn sie sich überlappen. */
  separatePair(A, B, k) {
    const dx = B.x - A.x;
    const dz = B.z - A.z;
    const min = (A.def.radius + B.def.radius) * 0.9;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min || d2 < 1e-6) return;
    const d = Math.sqrt(d2);
    const push = ((min - d) / d) * 0.5 * k;
    // Schwere weichen weniger aus, das Moderherz gar nicht – es schiebt sich durch die eigene Horde (M25)
    const wa = A.def.steadfast ? 0 : A.def.heavy ? 0.25 : 1;
    const wb = B.def.steadfast ? 0 : B.def.heavy ? 0.25 : 1;
    A.x -= dx * push * wa;
    A.z -= dz * push * wa;
    B.x += dx * push * wb;
    B.z += dz * push * wb;
  }

  /**
   * Haltung berechnen und in die Instanzen schreiben.
   * @param {THREE.Camera} [camera] nur zeichnen, was sie sieht (M25c; ohne Kamera: alle)
   */
  render(camera = null) {
    this._tick = (this._tick || 0) + 1; // M26: Zittern der Getroffenen (je Bild)
    const counts = {};
    const living = {};
    for (const type of ZOMBIE_TYPES) counts[type] = 0;
    const frustum = camera ? _frustum.setFromProjectionMatrix(_viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)) : null;
    // Erst die Lebenden, dann die Sterbenden: Umrisse zeigen nur die Lebenden
    // (wer im Boden versinkt, soll nicht als Umriss durch die Erde schimmern).
    const order = this._order || (this._order = []);
    order.length = 0;
    for (const z of this.list) if (z.state !== 'dying') order.push(z);
    for (const type of ZOMBIE_TYPES) living[type] = 0;
    for (const z of this.list) if (z.state === 'dying') order.push(z);
    for (const z of order) {
      const kind = this.kinds[z.type];
      const k = counts[z.type];
      if (k >= MAX_PER_TYPE) continue;
      if (frustum) {
        const s = z.def.scale * (z.size || 1);
        _sphere.center.set(z.x, z.y + s, z.z);
        _sphere.radius = 1.2 * s + VIEW_MARGIN;
        if (!frustum.intersectsSphere(_sphere)) continue;
      }
      counts[z.type]++;
      if (z.state !== 'dying') living[z.type]++; // die Lebenden kommen zuerst: nur sie bekommen einen Umriss
      this.pose(kind.rig, z);
      kind.rig.root.updateMatrixWorld(true);
      let tint = z.flash > 0 ? TINT.flash : z.stunT > 0 ? TINT.stunned : z.freezeT > 0 ? TINT.frozen : z.burnT > 0 ? TINT.burning : z.slowT > 0 ? TINT.slowed : TINT.normal;
      if (z.champion && tint === TINT.normal) tint = championTint.copy(TINT.championDim).lerp(TINT.champion, 0.5 + 0.5 * Math.sin(this.time * 3 + z.id)); // M21
      const hidden = this.isHidden(z) && z.state !== 'dying'; // Nebelwelle (M22): nur die Augen
      const buried = z.y < -0.5; // Gräber unter der Erde: gar nichts
      for (const name of kind.parts) {
        const mesh = kind.meshes[name];
        const gone = buried || (hidden && !kind.glow.has(name)) || (name === 'door' && !(z.doorHp > 0));
        mesh.setMatrixAt(k, gone ? HIDDEN : kind.rig.anchors[name].matrixWorld);
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
    // Sporenkapseln (M22): pulsieren schneller, je näher das Schlüpfen
    const d = this._podDummy;
    let n = 0;
    for (const p of this.pods) {
      if (n >= 64) break;
      const pulse = 1 + Math.sin(this.time * (4 + (5 - Math.max(0, p.t)) * 2) + p.id) * 0.12;
      d.position.set(p.x, 0, p.z);
      d.scale.set(pulse, pulse, pulse);
      d.updateMatrix();
      this.podMesh.setMatrixAt(n++, d.matrix);
    }
    this.podMesh.count = n;
    this.podMesh.visible = n > 0;
    this.podMesh.instanceMatrix.needsUpdate = true;
  }

  pose(rig, z) {
    const s = z.def.scale * (z.size || 1); // Champions (M21) sind etwas größer
    const t = this.time;
    const p = rig.pivots;
    const walk = Math.sin(z.phase);
    const moving = z.state === 'walk' || z.state === 'enter' || z.state === 'approach' || z.state === 'rejoin' || (z.state === 'chase' && z.windup <= 0) || (z.state === 'raid' && z.raidMoving);
    const amt = z.freezeT > 0 || z.stunT > 0 ? 0 : moving ? 1 : 0.15;
    const run = z.type === 'flitzer';
    const heavy = z.def.heavy;
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
    // M26: Wer gerade getroffen wurde, zittert einen Pixel hin und her
    const shiver = z.flash > 0 && z.state !== 'dying' ? (this._tick & 1 ? HIT_JITTER : -HIT_JITTER) : 0;
    rig.root.position.set(z.x + shiver, z.y - sink, z.z);
    rig.root.rotation.set(0, z.facing, 0);
    rig.root.scale.set(s, s, s);
    if (z.def.flying) {
      // Moderfalter (M22): Flügel schlagen, die Beinchen hängen, der Leib wiegt sich
      const flap = z.state === 'dying' ? 0.2 : Math.sin(t * 17 + z.id) * 0.75;
      p.armL.rotation.set(0, 0, -flap - 0.15);
      p.armR.rotation.set(0, 0, flap + 0.15);
      p.legL.rotation.set(0.5, 0, 0);
      p.legR.rotation.set(0.5, 0, 0);
      p.head.rotation.set(Math.sin(t * 2 + z.id) * 0.1, 0, 0);
      rig.body.position.y = 0;
      rig.body.rotation.set(0.12 - hit * 0.3, 0, Math.sin(t * 2.3 + z.id) * 0.1);
      if (fall) rig.root.rotation.set(-fall, z.facing, 0, 'YXZ');
      return;
    }
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
    } else if (z.boss?.windup > 0) {
      arm = -2.9 + Math.sin(t * 20) * 0.05; // M22: der Boss holt weit aus (zittert vor Kraft)
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
    return this.list
      .filter((z) => z.state !== 'dying')
      .map((z) => ({ type: z.type, x: +z.x.toFixed(2), z: +z.z.toFixed(2), hp: Math.round(z.hp), max: z.maxHp, day: z.day || undefined, champion: z.champion || undefined, shield: z.shield > 0 ? Math.round(z.shield) : undefined, trait: z.trait || undefined }));
  }

  load(entries) {
    this.clear();
    for (const e of entries || []) {
      if (!ZOMBIES[e.type]) continue;
      const z = this.spawn(e.type, { x: e.x, z: e.z, day: e.day, champion: e.champion || null, trait: typeof e.trait === 'string' ? e.trait : null });
      z.maxHp = e.max || z.maxHp;
      z.hp = Math.min(z.maxHp, e.hp || z.maxHp);
      if (z.shieldMax) z.shield = Math.max(0, Math.min(z.shieldMax, Number.isFinite(e.shield) ? e.shield : 0)); // Schild eines Champions (M21)
      z.state = 'walk';
    }
  }
}
