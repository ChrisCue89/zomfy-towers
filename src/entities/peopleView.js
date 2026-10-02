// Menschen als Sprites im Spiel (F4): Fassungen backen (Worker, sonst im Spiel), in einen eigenen
// Atlas legen und je Bild für Mika und die Leute das passende Bild zeigen – samt Gesicht (Flicken je
// Ausdruck) und Werkzeug (eigenes Bild vor oder hinter der Figur). Die Voxel-Figuren laufen weiter
// unsichtbar mit: Ihre Animation liefert Zustand, Laternenlicht und Anker; gezeigt wird das Sprite.
// Seit F7 auch am Kartentisch, beim Angeln, Schießen, Pfeifen, im Wirbel und mit dem Drachen; Voxel
// bleibt, was (noch) keine Fassung hat, die Schaukel und wer nach der Lagerglocke am Boden liegt.

import * as THREE from 'three';
import { SpriteAtlas } from '../render/spriteAtlas.js';
import { createSpriteMaterial, createSpriteSilhouetteMaterial } from '../render/spriteMaterial.js';
import { bakePerson, bakeTool, encodeBake, partFrames, toolFrames, animsOf, PEOPLE_DIRS } from './peopleSprites.js';
import { TEXEL } from '../render/spriteBaker.js';
import { PEOPLE, MIKA_BASE, TOOLS } from './peopleKinds.js';
import { darkerColor, SWING_TILT } from './peopleFigure.js';
import { LIE_LIFT } from './peopleSprites.js';
import { lookSpec } from '../data/looks.js';

const MAX_MIKA = 6;
const MAX_OTHERS = 96;
const DEPTH_BIAS = 0.3; // wie bei der Horde: der vordere Fuß versinkt nicht im Boden
const TABLE_BIAS = 0.05; // F7: am Kartentisch – die Tischplatte davor verdeckt den Schoß wie bei den Voxeln
const FACE_BIAS = 0.012; // das Gesicht liegt eine Spur vor dem Bild
const TOOL_BIAS = 0.06; // das Werkzeug vor oder hinter der Figur
const SECTOR = Math.PI / 4;
const HYST = (10 * Math.PI) / 180;
const HOLD = 0.12;
const IN_FLIGHT = 2;
const SIT_HIP = 0.23; // Hüfthöhe der Pose »sitzen« (peopleFigure.posePerson)
/** Seltene Gesten, die nur Balduin als Bild hat (die übrigen bleiben Voxel). */
const GESTURES = new Set(['muetze', 'reiben', 'daumen', 'schulter', 'bart', 'winken']);
/** F7: Lange Waffen liegen im Anschlag an der Schulter, die übrigen schießen mit gestrecktem Arm. */
const LONG_GUNS = new Set(['jagdgewehr', 'doppelflinte']);

function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** F6f: Wie stark die Lampen der Welt der gebackenen Normale der Menschen folgen (die Horde: 0,75). */
const PEOPLE_NORMAL = 0.4;
/**
 * F6f: nachts – Eigenlicht (vorher 0,3), wie viel Farbe Mond und Himmel auf den Menschen verlieren und
 * wie weit sie in ihrer Rampe abdunkeln (1 = eine Stufe in tiefer Nacht).
 */
const PEOPLE_NIGHT = { self: 0.5, neutral: 0.8, ramp: 1 };
/** G7: In welcher Reihenfolge Mikas Teile gebacken werden, solange sie nicht im Bild sind (0 ist jetzt). */
const MIKA_PRIO = { laterne: 0.5, base: 0.55, waffe: 1.2, sitz: 1.3, laterneWaffe: 1.4, schaukel: 1.5 };
/** Ersatz, solange ein Teil noch fehlt: mit Laterne → ohne. */
const FALLBACK = { laterne: 'base', laterneAktion: 'aktion', laterneWaffe: 'waffe' };

export class PeopleSprites {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.atlas = new SpriteAtlas(1024, 12);
    // Wie die Voxel-Figuren: nachts nie ein dunkler Klumpen. F6f: Licht je Texel, ohne Raster im
    // Post-Pass, und die Lampen der Welt folgen der gebackenen Normale nur halb – das Licht ist schon
    // gemalt (sonst lag es doppelt: gemalt von links oben, dazu die Sonne von rechts). Nachts verlieren
    // Mond und Himmel auf der Haut den größten Teil ihres Blaus, und ein wenig mehr Eigenlicht hält die
    // Gesichter warm – vorher waren sie im Laternenlicht grau wie die Schlurfer.
    this.atlas.setDarker(darkerColor);
    this.material = createSpriteMaterial(this.atlas, { selfLight: PEOPLE_NIGHT.self, clean: true, normalAmount: PEOPLE_NORMAL, lightNeutral: PEOPLE_NIGHT.neutral, rampShift: PEOPLE_NIGHT.ramp });
    const geometry = () => {
      const g = new THREE.PlaneGeometry(1, 1, 1, 2);
      return g;
    };
    this.layers = {};
    for (const [name, max, order] of [['mika', MAX_MIKA, 2], ['leute', MAX_OTHERS, 1.6]]) {
      const g = geometry();
      const attr = (n) => new THREE.InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
      const L = { max, n: 0, aRect: attr(4), aPivot: attr(4), aTint: attr(4), aInfo: attr(2), shown: [] };
      g.setAttribute('aRect', L.aRect);
      g.setAttribute('aPivot', L.aPivot);
      g.setAttribute('aTint', L.aTint);
      g.setAttribute('aInfo', L.aInfo);
      L.mesh = new THREE.InstancedMesh(g, this.material, max);
      L.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      L.mesh.frustumCulled = false;
      L.mesh.count = 0;
      L.mesh.visible = false;
      L.mesh.renderOrder = order; // wie die Voxel-Figuren (Mika 2, die Leute 1,6)
      L.mesh.receiveShadow = true;
      L.mesh.name = `Sprites-${name}`;
      scene.add(L.mesh);
      this.layers[name] = L;
    }
    // Mikas Umriss hinter Verdeckungen (wie bei der Voxel-Figur: warm, halb gerastert)
    const M = this.layers.mika;
    this.silhouette = new THREE.InstancedMesh(M.mesh.geometry, createSpriteSilhouetteMaterial(this.atlas, 0xffc86a, 0.5), MAX_MIKA);
    this.silhouette.instanceMatrix = M.mesh.instanceMatrix;
    this.silhouette.frustumCulled = false;
    this.silhouette.count = 0;
    this.silhouette.visible = false;
    this.silhouette.renderOrder = 1.75;
    scene.add(this.silhouette);
    this.variants = new Map(); // Schlüssel -> Fassung (ein Teil einer Figur in einem Stand, oder ein Werkzeug)
    this.jobs = new Map();
    this.jobId = 0;
    this.workers = null;
    this.retry = [];
    this.baked = 0;
    this.bakeMs = 0;
    this.started = 0;
    this.active = false;
    this.voxel = new Map(); // Figur -> zuletzt gesetzte Sichtbarkeit ihrer Voxel
    this.dirs = new WeakMap(); // Figur -> { dir, hold }
    this._m = new THREE.Matrix4();
    this.lastMika = null; // Prüfung: was Mika zuletzt zeigte
    this.lastPeople = {};
  }

  // --- Backen --------------------------------------------------------------------------------

  /** Eine Fassung anfordern (prio 0: jetzt im Bild, 1: bald, 2: Hintergrund). */
  request(key, make, prio) {
    let v = this.variants.get(key);
    if (!v) {
      v = { key, prio, next: 0, done: 0, entries: [], table: null, ready: false, failed: false, ms: 0, ...make() };
      this.variants.set(key, v);
    } else if (prio < v.prio) v.prio = prio;
    if (this.active && !v.ready) this.kick();
    return v;
  }

  /** Ein Teil einer Figur in einem Stand (Mika: ihr Aussehen). */
  person(id, spec, specKey, part, prio) {
    return this.request(`${id}|${specKey}|${part}`, () => ({ family: 'person', id, spec, part, frames: partFrames(id, part) }), prio);
  }

  /** Ein Werkzeug in allen Richtungen und Winkelstufen. */
  tool(id, prio) {
    return this.request(`werkzeug|${id}`, () => ({ family: 'tool', id, frames: toolFrames(id) }), prio);
  }

  bestVariant() {
    let best = null;
    for (const v of this.variants.values()) {
      if (v.ready || v.failed || v.next >= v.frames.length) continue;
      if (!best || v.prio < best.prio || (v.prio === best.prio && v.next > best.next)) best = v;
    }
    return best;
  }

  nextJob() {
    if (this.retry.length) return this.retry.shift();
    const v = this.bestVariant();
    if (!v) return null;
    const index = v.next++;
    return { id: ++this.jobId, v, index, fr: v.frames[index] };
  }

  message(job) {
    const { v, fr } = job;
    if (v.family === 'tool') return { id: job.id, family: 'tool', tool: v.id, d: fr.d, bucket: fr.bucket };
    return { id: job.id, family: 'person', person: v.id, spec: v.spec, part: v.part, d: fr.d, anim: fr.anim, k: fr.k };
  }

  bakeHere(job) {
    const { v, fr } = job;
    const f = v.family === 'tool' ? bakeTool(v.id, fr.d, fr.bucket) : bakePerson(v.id, v.spec, v.part, fr.d, fr.anim, fr.k);
    return encodeBake(f);
  }

  setActive(on) {
    this.active = on;
    if (on) this.kick();
  }

  kick() {
    if (!this.active) return;
    if (this.workers === null) this.startWorkers();
    for (const w of this.workers) this.feed(w);
  }

  startWorkers() {
    this.workers = [];
    this.started = performance.now();
    if (typeof Worker === 'undefined') return;
    try {
      const worker = new Worker(new URL('./spriteWorker.js', import.meta.url), { type: 'module' });
      const w = { worker, busy: new Set(), dead: false };
      worker.onmessage = (e) => this.receive(w, e.data);
      worker.onerror = (e) => {
        e.preventDefault?.();
        this.fail(w);
      };
      this.workers.push(w);
    } catch {
      this.workers = [];
    }
  }

  feed(w) {
    while (this.active && !w.dead && w.busy.size < IN_FLIGHT) {
      const job = this.nextJob();
      if (!job) return;
      w.busy.add(job.id);
      this.jobs.set(job.id, job);
      w.worker.postMessage(this.message(job));
    }
  }

  fail(w) {
    if (w.dead) return;
    w.dead = true;
    w.worker.terminate();
    for (const id of w.busy) {
      const job = this.jobs.get(id);
      this.jobs.delete(id);
      if (job) this.retry.push(job);
    }
    w.busy.clear();
    this.workers = this.workers.filter((o) => o !== w);
  }

  receive(w, msg) {
    const job = this.jobs.get(msg.id);
    this.jobs.delete(msg.id);
    w.busy.delete(msg.id);
    if (job) {
      if (msg.error) job.v.failed = true;
      else this.store(job, msg.enc, msg.ms);
    }
    this.feed(w);
  }

  /** Ein kodiertes Bild ablegen; ist die Fassung komplett, kommt sie in den Atlas. */
  store(job, enc, ms) {
    const v = job.v;
    if (v.failed || !v.entries) return;
    v.entries[job.index] = enc;
    v.done++;
    v.ms += ms;
    this.baked++;
    this.bakeMs += ms;
    if (v.done < v.frames.length) return;
    const list = [];
    const keyOf = (fr) => (v.family === 'tool' ? `${v.key}:${fr.d}:${fr.bucket}` : `${v.key}:${fr.d}:${fr.anim}:${fr.k}`);
    v.entries.forEach((e, i) => {
      const key = keyOf(v.frames[i]);
      list.push([key, e.body]);
      for (const [expr, p] of Object.entries(e.patches || {})) if (p.w) list.push([`${key}:${expr}`, p]);
    });
    try {
      this.atlas.addAll(list);
    } catch {
      v.failed = true; // Atlas voll: diese Fassung bleibt Voxel
      v.entries = null;
      return;
    }
    v.table = new Map();
    v.entries.forEach((e, i) => {
      const key = keyOf(v.frames[i]);
      const body = this.atlas.frames.get(key);
      body.key = key;
      const patches = {};
      for (const expr of Object.keys(e.patches || {})) {
        const p = this.atlas.frames.get(`${key}:${expr}`);
        if (p) patches[expr] = p;
      }
      const fr = v.frames[i];
      v.table.set(v.family === 'tool' ? `${fr.d}:${fr.bucket}` : `${fr.d}:${fr.anim}:${fr.k}`, { body, patches, anchors: e.anchors });
    });
    v.entries = null;
    v.ready = true;
    v.readyAt = performance.now() - this.started;
  }

  /** Ohne Worker backt das Spiel selbst – höchstens ein Bild je Bild im Spiel. */
  pump() {
    if (!this.active) return;
    if (this.workers === null) this.kick();
    if (this.workers.length && !this.retry.length) return;
    const job = this.nextJob();
    if (!job) return;
    const t1 = performance.now();
    this.store(job, this.bakeHere(job), performance.now() - t1);
  }

  /**
   * Prüfung: Fassungen sofort hier backen – auch die Bilder, die gerade beim Worker sind (deren
   * Antwort kommt dann zu spät und wird verworfen).
   */
  bakeNow(variants) {
    for (const v of variants) {
      if (!v || v.ready || v.failed) continue;
      v.next = v.frames.length;
      for (let index = 0; index < v.frames.length && !v.ready && !v.failed; index++) {
        if (v.entries[index]) continue;
        const job = { v, index, fr: v.frames[index] };
        this.store(job, this.bakeHere(job), 0);
      }
    }
  }

  /** Prüfung: die Teile einer Figur und ihr fester Stand. */
  static parts(id) {
    return PEOPLE[id]?.parts || {};
  }

  static specOf(id) {
    return PEOPLE[id]?.spec || {};
  }

  // --- Was zeigt eine Figur? -----------------------------------------------------------------

  /** Mikas Stand (Aussehen) als Schlüssel und Beschreibung. */
  mikaSpec(look) {
    const key = look ? `${look.body}-${look.hat}-${look.jacket}-${look.hair}-${look.skin}` : 'standard';
    if (this._specKey !== key) {
      this._specKey = key;
      this._spec = lookSpec(MIKA_BASE, look);
    }
    return { spec: this._spec, specKey: key };
  }

  /**
   * Zustand, Bild und Ausdruck Mikas aus der Spielfigur – oder null (seltene Pose: Voxel).
   * @returns {{part:string, anim:string, k:number, expr:string, tool:object|null}|null}
   */
  poseOfPlayer(p) {
    const a = p.action;
    // N12: im Ruderboot (die Sitze der Boote tragen `rowing`) – rudern im Takt der Riemen
    if (p.seated && p.seated.rowing !== undefined && !p.fishingPose && !p.kitePose) {
      const n = animsOf('mika').rudern;
      const q = p.seated.rowing ? (((p.seated.phase ?? p.time * p.seated.rowing) / (Math.PI * 2)) % 1 + 1) % 1 : 0;
      let expr = p.faceShown || 'normal';
      if (p.character.parts.eyelids?.visible) expr = 'blinzeln';
      return { part: 'boot', anim: 'rudern', k: Math.round(q * n) % n, expr, tool: null, seatY: p.seated.seatY ?? 0.28 };
    }
    let expr = p.faceShown || 'normal';
    if (p.character.parts.eyelids?.visible) expr = 'blinzeln';
    // F7e: auf der Reifenschaukel – das Bild der nächsten Neigung (gebacken in sieben Stufen)
    if (p.riding !== null) {
      const n = animsOf('mika').schaukeln;
      const k = Math.round(((Math.max(-1, Math.min(1, p.riding / SWING_TILT)) + 1) / 2) * (n - 1));
      return { part: 'schaukel', anim: 'schaukeln', k, expr, tool: null, spin: 0 };
    }
    // F7: an der Stegkante angeln – die Hüfte auf der Kante, die Beine hängen darunter (`ledge`)
    const fp = p.fishingPose;
    if (fp) {
      let k = 0;
      if (fp.phase === 'laden') k = (fp.power || 0) > 0.4 ? 1 : 0;
      else if (fp.phase === 'wurf') k = (fp.t || 0) < 0.25 ? 2 : 0;
      else if (fp.phase === 'biss' || fp.phase === 'drill' || fp.phase === 'fang') k = 3;
      return { part: 'sitz', anim: 'angeln', k, expr, tool: { id: 'angel', hand: true }, seatY: p.seated?.seatY ?? 0, ledge: true };
    }
    // F7: Pims Drachen halten – beim Zupfen ruckt die Spule zur Brust
    if (p.kitePose) return { part: 'waffe', anim: 'drachen', k: (p.kitePose.pull || 0) > 0.3 ? 1 : 0, expr, tool: { id: 'spule', hand: true } };
    // F7: am Kartentisch (die übrigen Sitze tragen keine Karten: nur das Boot hat `rowing`)
    if (p.seated) return { part: 'sitz', anim: 'karten', k: Math.floor(p.time * 0.7) % 2, expr, tool: null, seatY: p.seated.seatY ?? 0.28, bias: TABLE_BIAS };
    const anims = animsOf('mika');
    let lantern = p.holdingLantern;
    let anim = 'stehen';
    let k = Math.floor(p.time * 1.3) % 2;
    let spin = null;
    if (a?.kind === 'shoot') {
      // F7: Schuss – im ersten Augenblick ruckt der Arm hoch (Rückstoß, wie bei der Voxel-Figur)
      anim = a.long || LONG_GUNS.has(a.tool) ? 'anschlag' : 'schiessen';
      k = a.t < 0.09 ? 1 : 0;
    } else if (a?.kind === 'pfiff') {
      anim = 'pfiff';
      k = 0;
    } else if (a?.kind === 'wirbel') {
      // F7: einmal ganz herum – die Richtung des Bildes folgt der Drehung
      anim = 'wirbel';
      k = 0;
      spin = p.facing + (p.spinAngle || 0);
    } else if (a?.kind === 'roll') {
      const q = a.t / a.duration;
      anim = 'rolle';
      k = q < 0.3 ? 0 : q < 0.72 ? 1 : 2;
      lantern = false;
    } else if (a?.kind === 'blitz') {
      anim = 'blitz';
      k = a.t >= a.hitAt * 0.6 && a.t < a.duration * 0.8 ? 1 : 0;
      lantern = false; // der Blitz hat seine Laterne selbst (hoch über dem Kopf)
    } else if (p.flinch > 0) {
      anim = 'treffer';
      k = 0;
    } else if (a?.kind === 'swing') {
      const q = a.t / a.duration;
      const hit = a.hitAt / a.duration;
      anim = 'schwung';
      k = q < hit * 0.8 ? 0 : q < hit ? 1 : q < hit + 0.25 * (1 - hit) ? 2 : 3;
    } else if (a?.kind === 'search') {
      anim = 'suchen';
      k = Math.floor(a.t * 7) % 2;
    } else if (a?.kind === 'wurf') {
      anim = 'wurf';
      k = a.t < a.hitAt ? 0 : 1;
    } else if (a?.kind === 'jubel') {
      anim = 'jubel';
      k = Math.floor((a.t / a.duration) * 8) % 2;
      lantern = false;
    } else if (p.moveAmount > 1.08) {
      anim = 'rennen';
      k = this.walkFrame(p.phase, anims.rennen);
    } else if (p.moveAmount > 0.12) {
      anim = 'gehen';
      k = this.walkFrame(p.phase, anims.gehen);
    }
    const parts = PEOPLE.mika.parts;
    let part = null;
    for (const [name, spec] of Object.entries(parts)) if (spec.anims.includes(anim) && Boolean(spec.lantern) === Boolean(lantern)) part = name;
    if (!part) for (const [name, spec] of Object.entries(parts)) if (spec.anims.includes(anim) && !spec.lantern) part = name;
    if (!part) return null;
    const toolId = p.shownTool && TOOLS[p.shownTool] ? p.shownTool : null;
    const backId = !toolId && p.backTool && TOOLS[p.backTool] ? p.backTool : null;
    const tool = toolId ? { id: toolId, hand: true } : backId ? { id: backId, hand: false } : null;
    return { part, anim, k, expr, tool, spin };
  }

  /** Gangbild aus der Phase (ein Schritt je Bein = einmal um den Kreis). */
  walkFrame(phase, n) {
    const q = (((phase / (Math.PI * 2)) % 1) + 1) % 1;
    return Math.floor(q * n) % n;
  }

  /** Zustand einer Figur der Leute (oder null: Voxel). */
  poseOfNpc(n, time) {
    const kind = PEOPLE[n.id];
    if (!kind) return null;
    if (n.dog) {
      if (n.bark > 0) return { part: 'base', anim: 'bellen', k: Math.floor(n.bark * 9) % 2, expr: 'normal' };
      if (n.chore?.anim && n.moving <= 0.15) return { part: 'alltag', anim: n.chore.anim, k: n.chore.k, expr: 'normal' }; // A1: Mittagsschlaf
      if (n.moving > 0.15) return { part: 'base', anim: 'traben', k: this.walkFrame(n.phase, animsOf(n.id).traben), expr: 'normal' };
      if (n.sit > 0.5) return { part: 'base', anim: 'sitzen', k: Math.floor(time * 5) % 2, expr: 'normal' };
      return { part: 'base', anim: 'stehen', k: Math.floor(time * (n.target ? 4 : 6)) % 2, expr: 'normal' };
    }
    const p = n.model.parts;
    // F7: was die Figur in der rechten Hand hält (Angel, Spule, Waffe) – als eigenes Bild
    const heldId = p.held ? Object.keys(p.held).find((key) => p.held[key].visible) : null;
    if (heldId && !TOOLS[heldId]) return null;
    const tool = heldId ? { id: heldId, hand: true } : null;
    const anims = animsOf(n.id);
    let anim = 'stehen';
    let k = Math.floor(time * 1.1 + n.x) % 2;
    const g = n.gestures[0];
    if (n.lying) {
      // F7e: nach der Lagerglocke am Boden (ohne Waffe – die liegt im Laub)
      const kind_ = PEOPLE[n.id];
      if (!Object.values(kind_.parts).some((s) => s.anims.includes('liegen'))) return null;
      return { part: Object.entries(kind_.parts).find(([, s]) => s.anims.includes('liegen'))[0], anim: 'liegen', k: 0, expr: kind_.expressions?.includes('blinzeln') ? 'blinzeln' : kind_.expressions?.[0] || 'normal', tool: null, lift: LIE_LIFT };
    } else if (n.fishing) {
      // F7: an der Stegkante mit der Angel (wartet still)
      anim = 'angeln';
      k = 0;
    } else if (n.kite) {
      anim = 'drachen';
      k = (n.kite.pull || 0) > 0.3 ? 1 : 0;
    } else if (n.practice) {
      // F7: Übungsplatz und Lagerglocke – im Anschlag (Rückstoß beim Schuss) oder ein Hieb
      const q = n.practice.t;
      if (n.practice.kind === 'schuss') {
        anim = LONG_GUNS.has(heldId) ? 'anschlag' : 'schiessen';
        k = q < 0.1 ? 1 : 0;
      } else {
        anim = 'schwung';
        k = q < 0.12 ? 0 : q < 0.2 ? 1 : q < 0.3 ? 2 : 3;
      }
    } else if (n.cards && n.sit > 0.5) {
      // F7: am Kartentisch die Karten in der Hand; der eigene Tick verrät das Blatt (Menschenkunde)
      anim = g && g.kind === PEOPLE[n.id].tell ? 'tick' : 'karten';
      k = anim === 'tick' ? Math.floor(g.t * 6) % 2 : Math.floor(time * 0.7 + n.x) % 2;
    } else if (n.skyward) {
      anim = 'gucken';
      k = Math.floor(time * 1.1 + n.x) % 2;
    } else if (g) {
      if (!GESTURES.has(g.kind)) return null;
      anim = g.kind;
      k = Math.floor(g.t * 6) % (anims[anim] || 1);
    } else if (n.wave > 0) {
      anim = 'winken';
      k = Math.floor(n.wave * 7) % 2;
    } else if (n.chore?.anim && n.moving <= 0.15 && (!n.chore.sit || n.sit > 0.5)) {
      // A1: das Tagwerk (core/chores.js) – im Takt der Arbeit, beim Innehalten das erste Bild
      anim = n.chore.anim;
      k = n.chore.k;
    } else if (n.sit > 0.5) {
      anim = 'sitzen';
      k = Math.floor(time * 0.9 + n.x) % 2;
    } else if (n.moving > 0.15) {
      anim = 'gehen';
      k = this.walkFrame(n.phase, anims.gehen);
    }
    const part = Object.entries(kind.parts).find(([, s]) => s.anims.includes(anim))?.[0];
    if (!part) return null;
    const happy = n.wave > 0 || n.near || n.gestures.length > 0;
    let expr = happy && kind.expressions?.includes('froh') ? 'froh' : 'normal';
    if (p.eyelids?.visible && kind.expressions?.includes('blinzeln')) expr = 'blinzeln';
    return { part, anim, k, expr, tool, ledge: anim === 'angeln', bias: anim === 'karten' || anim === 'tick' ? TABLE_BIAS : undefined };
  }

  /** F7: Richtung sofort setzen (Wirbel) – die Hysterese merkt sie sich für danach. */
  turnTo(obj, facing) {
    const dir = ((Math.round(facing / SECTOR) % 8) + 8) % 8;
    this.dirs.set(obj, { dir, hold: 0 });
    return dir;
  }

  /** Richtung 0–7 mit Hysterese (wie die Horde): erst 10° über der Grenze und nach 0,12 s. */
  direction(obj, facing, dt) {
    const target = ((Math.round(facing / SECTOR) % 8) + 8) % 8;
    let s = this.dirs.get(obj);
    if (!s) {
      s = { dir: target, hold: 0 };
      this.dirs.set(obj, s);
      return target;
    }
    s.hold += dt;
    if (target === s.dir) return s.dir;
    const off = Math.abs(wrapAngle(facing - s.dir * SECTOR));
    if (off >= Math.PI / 2 - 1e-3 || (off > SECTOR / 2 + HYST && s.hold >= HOLD)) {
      s.dir = target;
      s.hold = 0;
    }
    return s.dir;
  }

  // --- Zeichnen ------------------------------------------------------------------------------

  /** Voxel einer Figur zeigen oder verstecken (die Kinder ihres Wurzelknotens – der Knoten selbst sagt, ob sie da ist). */
  setVoxel(root, on) {
    if (this.voxel.get(root) === on) return;
    this.voxel.set(root, on);
    for (const c of root.children) c.visible = on;
  }

  /** Ein Bild als Instanz eintragen (Fußpunkt x, y, z; Tiefenversatz). */
  put(L, f, x, y, z, bias) {
    if (!f || !f.w || L.n >= L.max) return;
    const i = L.n++;
    this._m.makeTranslation(x, y, z);
    L.mesh.setMatrixAt(i, this._m);
    L.aRect.setXYZW(i, f.x, f.y, f.w, f.h);
    L.aPivot.setXYZW(i, f.px, f.py, 1, bias);
    L.aTint.setXYZW(i, 1, 1, 1, 0);
    L.aInfo.setXY(i, f.page, 0);
    L.shown[i] = f;
  }

  /** Werkzeug an seinem Anker: Griff auf die Hand (bzw. Mitte auf den Rücken). */
  putTool(L, t, anchor, x, y, z, bias = DEPTH_BIAS) {
    if (!t || !t.w || L.n >= L.max) return;
    const i = L.n++;
    this._m.makeTranslation(x, y, z);
    L.mesh.setMatrixAt(i, this._m);
    L.aRect.setXYZW(i, t.x, t.y, t.w, t.h);
    L.aPivot.setXYZW(i, t.px - Math.round(anchor[0]), t.py - Math.round(anchor[1]), 1, bias + (anchor[3] ? TOOL_BIAS : -TOOL_BIAS));
    L.aTint.setXYZW(i, 1, 1, 1, 0);
    L.aInfo.setXY(i, t.page, 0);
    L.shown[i] = t;
  }

  /**
   * Eine Figur zeichnen, wenn ihre Fassung fertig ist (sonst angefordert): Bild, Gesicht und
   * Werkzeug. Gibt zurück, was gezeigt wird (oder null).
   */
  drawFigure(L, id, spec, specKey, st, dir, x, y, z, prio) {
    let v = this.person(id, spec, specKey, st.part, prio);
    // G7: Ist der Teil mit Laterne noch nicht gebacken, aber derselbe ohne, zeigt Mika ihn (die Laterne
    // fehlt dann kurz) – lieber das als die Voxel-Figur im Intro
    if (!v.ready && FALLBACK[st.part]) {
      const alt = this.person(id, spec, specKey, FALLBACK[st.part], prio + 0.1);
      if (alt.ready) v = alt;
    }
    if (!v.ready) return null;
    const entry = v.table.get(`${dir}:${st.anim}:${st.k}`);
    if (!entry) return null;
    let tool = null;
    if (st.tool) {
      const tv = this.tool(st.tool.id, prio);
      const anchor = st.tool.hand ? entry.anchors?.hand : entry.anchors?.back;
      // F7: `anchor[4]` dreht das Werkzeug um Achtel zur rechten Seite (Wirbel, Angel)
      const te = tv.ready && anchor ? tv.table.get(`${(dir + (anchor[4] || 0)) & 7}:${anchor[2]}`) : null;
      if (te) tool = { frame: te.body, anchor, tip: te.anchors?.tip || null };
    }
    // Wo eine Angel oder Spule gerade endet (Weltpunkt in der Bildebene): dort hängt die Schnur
    const tip = tool?.tip ? [x + (tool.anchor[0] + tool.tip[0]) * TEXEL, y + Math.max(0, tool.anchor[1] + tool.tip[1]) * (TEXEL / 0.8), z] : null;
    const bias = st.bias ?? DEPTH_BIAS;
    if (tool && !tool.anchor[3]) this.putTool(L, tool.frame, tool.anchor, x, y, z, bias);
    this.put(L, entry.body, x, y, z, bias);
    const patch = st.expr && st.expr !== PEOPLE[id].expressions?.[0] ? entry.patches[st.expr] : null;
    if (patch) this.put(L, patch, x, y, z, bias + FACE_BIAS);
    if (tool && tool.anchor[3]) this.putTool(L, tool.frame, tool.anchor, x, y, z, bias);
    return { key: entry.body.key, expr: patch ? st.expr : PEOPLE[id].expressions?.[0] || null, tool: tool ? `${st.tool.id}:${st.tool.hand ? 'hand' : 'ruecken'}:${tool.anchor[2]}:${tool.anchor[3] ? 'vorn' : 'hinten'}` : null, tip };
  }

  /**
   * F7: Die Spitze der Angel bzw. der Spule im Bild einer Figur (`'mika'` oder die ID der Leute) –
   * oder null, solange sie als Voxel gezeigt wird (dann gilt die Spitze der Voxel-Figur).
   */
  toolTip(who, out) {
    const shown = who === 'mika' ? this.lastMika : this.lastPeople[who];
    if (!shown?.tip) return null;
    return out.set(shown.tip[0], shown.tip[1], shown.tip[2]);
  }

  /**
   * Alle Menschen eintragen. `enabled` false (Startbild, Titel) oder 3D: alle Voxel sichtbar.
   * @param {{player:object, npcs:object, look:object, enabled:boolean, dt:number, time:number}} o
   */
  render({ player, npcs, look, enabled, dt = 1 / 60, time = 0 }) {
    for (const L of Object.values(this.layers)) L.n = 0;
    const on = this.active && enabled;
    this.lastMika = null;
    this.lastPeople = {};
    // Mika
    if (player) {
      let shown = null;
      if (on) {
        const st = this.poseOfPlayer(player);
        // F7: im Wirbel folgt das Bild der Drehung ohne Verzögerung
        const dir = st?.spin != null ? this.turnTo(player, st.spin) : this.direction(player, player.facing, dt);
        const { spec, specKey } = this.mikaSpec(look);
        if (st) {
          const pos = player.position;
          // Im Boot steht das Bild auf dem Bootsboden: die Hüfte sitzt auf der Bank (wie die Voxel-Figur);
          // an der Stegkante liegt die Hüfte des Bildes auf seinem Fußpunkt (F7, `ledge`)
          const y = st.ledge ? pos.y + st.seatY : st.seatY !== undefined ? pos.y + Math.max(0, st.seatY - SIT_HIP) : pos.y;
          shown = this.drawFigure(this.layers.mika, 'mika', spec, specKey, st, dir, pos.x, y, pos.z, 0);
        }
        // Alle Teile vorbereiten, auch solange Mika noch Voxel ist (N12: die Ankunft beginnt im Boot –
        // bis Mika auf dem Steg steht, ist das Gehen gebacken). G7: Auf dem Steg trägt Mika die Laterne
        // vom Bug, bis halb acht – darum kommt die Laterne vor dem Gehen ohne sie
        for (const part of Object.keys(PEOPLE.mika.parts)) this.person('mika', spec, specKey, part, MIKA_PRIO[part] ?? 1);
        if (shown) this.lastMika = { ...st, dir, ...shown };
      }
      this.setVoxel(player.character.root, !shown);
    }
    const mikaCount = this.layers.mika.n;
    // Die Leute (nur, wer da ist)
    if (npcs) {
      for (const n of npcs.list.values()) {
        const root = n.model.root;
        if (!root.visible) continue;
        let shown = null;
        if (on && PEOPLE[n.id]) {
          const st = this.poseOfNpc(n, time);
          if (st) {
            const dir = this.direction(n, n.facing, dt);
            // Der Boden unter der Figur (die Voxel heben Sitzende auf die Sitzhöhe); sitzend steht das
            // Sprite auf dem Boden, höchstens so weit gehoben, wie der Sitz höher als seine Hüfte ist
            const seated = !n.dog && n.seatY !== null && n.seatY !== undefined;
            const ground = root.position.y - (seated ? (n.seatY - n.model.hip) * n.sit : 0);
            // F7: an der Stegkante liegt die Hüfte des Bildes auf seinem Fußpunkt
            // F7e: Liegende hebt die Voxel-Figur 12 cm an – das Bild trägt die Höhe selbst
            const y = ground + (seated ? (st.ledge ? n.seatY * n.sit : Math.max(0, (n.seatY - SIT_HIP) * n.sit)) : 0) - (st.lift || 0);
            shown = this.drawFigure(this.layers.leute, n.id, PEOPLE[n.id].spec || {}, 'fest', st, dir, n.x, y, n.z, 0);
            if (shown) this.lastPeople[n.id] = { ...st, dir, ...shown };
          }
        }
        this.setVoxel(root, !shown);
      }
    }
    for (const [name, L] of Object.entries(this.layers)) {
      L.mesh.count = L.n;
      L.mesh.visible = L.n > 0;
      L.mesh.instanceMatrix.needsUpdate = true;
      L.aRect.needsUpdate = true;
      L.aPivot.needsUpdate = true;
      L.aTint.needsUpdate = true;
      L.aInfo.needsUpdate = true;
      if (name === 'mika') {
        this.silhouette.count = mikaCount;
        this.silhouette.visible = mikaCount > 0;
      }
    }
    if (on) this.pump();
  }

  /** Prüfung: Stand des Backens und was gezeigt wird. */
  info() {
    const ready = [];
    const waiting = [];
    for (const v of this.variants.values()) {
      if (v.ready) ready.push(v.key);
      else if (!v.failed) waiting.push({ key: v.key, prio: v.prio, done: v.done, of: v.frames.length });
    }
    return {
      active: this.active,
      workers: this.workers ? this.workers.length : null,
      ready,
      waiting,
      failed: [...this.variants.values()].filter((v) => v.failed).map((v) => v.key),
      baked: this.baked,
      bakeMs: Math.round(this.bakeMs),
      atlas: this.atlas.info(),
      drawn: { mika: this.layers.mika.n, leute: this.layers.leute.n },
      mika: this.lastMika,
      leute: this.lastPeople,
      dirs: PEOPLE_DIRS,
    };
  }
}
