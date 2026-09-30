// Die Horde als Sprites (F1, seit F2 alle Arten): Richtung, Zustand und Bild je Schlurfer,
// Instanzdaten für einen InstancedMesh aufrechter Quads. Die Horde-Logik bleibt unverändert;
// horde.render gibt jeden Schlurfer, dessen Fassung fertig gebacken ist, hierher ab – die übrigen
// zeichnet sie weiter als Voxel.
//
// Gebacken wird im Hintergrund (Worker, sonst ein paar Bilder je Bild im Spiel): zuerst, was im
// Bild steht, dann die Arten der kommenden Nacht (horde.planned), dann der Reihe nach die Arten,
// die in den Nächten auftauchen. Bosse nur, wenn sie kommen. Eine Fassung ist eine Art in einer
// Größe (Champions ×1,15, die Teile des Moosriesen ×0,55) und fertig, wenn alle 85 Bilder da sind.

import * as THREE from 'three';
import { SpriteAtlas } from '../render/spriteAtlas.js';
import { encodeFrame } from '../render/spriteCode.js';
import { createSpriteMaterial, createSpriteSilhouetteMaterial } from '../render/spriteMaterial.js';
import { bakeFrame, ANIMS, DIRS, SPRITE_TYPES } from './zombieSprites.js';

const MAX = 1024;
const SECTOR = Math.PI / 4;
const HYST = (10 * Math.PI) / 180; // erst 10° über der Sektorgrenze wechseln …
const HOLD = 0.15; // … und frühestens nach 0,15 s
const DEPTH_BIAS = 0.3;
const WALK_FRAMES = ANIMS.gehen;
const IN_FLIGHT = 2; // so viele Bilder wartet jeder Worker vor (dann steht er nie still)

/** Arten, die im Hintergrund der Reihe nach backen – so, wie sie in den Nächten auftauchen. */
export const BACKGROUND = ['schlurfer', 'flitzer', 'brummer', 'schwaermer', 'leuchtpilz', 'moderfalter', 'graeber', 'schildtraeger', 'schildtraegerOhne', 'lichtfresser', 'brueter', 'anfuehrer'];

/** Bild je Richtung: Versatz jedes Zustands in der Reihe (gehen 0–5, stehen 6–7, …, fallen 13–16). */
const OFFSET = {};
let perDir = 0;
for (const [anim, n] of Object.entries(ANIMS)) {
  OFFSET[anim] = perDir;
  perDir += n;
}
const PER_DIR = perDir;
const PER_VARIANT = PER_DIR * DIRS; // 85
const FRAMES = [];
for (let d = 0; d < DIRS; d++) for (const [anim, n] of Object.entries(ANIMS)) for (let k = 0; k < n; k++) FRAMES.push({ d, anim, k });

/** Schlüssel einer Fassung: Art und Faktor auf ihre Größe. */
export function variantKey(type, f = 1) {
  return f === 1 ? type : `${type}@${+f.toFixed(3)}`;
}

/** Richtung 0–7 → gezeichnete Richtung 0–4 und gespiegelt? (W, NW, SW sind Spiegel von O, NO, SO) */
function drawnDir(dir) {
  return dir <= 4 ? dir : 8 - dir;
}

function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export class HordeSprites {
  /** @param {THREE.Group} group die Gruppe der Horde */
  constructor(group) {
    this.atlas = new SpriteAtlas(1024, 16);
    this.material = createSpriteMaterial(this.atlas, { selfLight: 0.2 });
    this.silhouetteMaterial = createSpriteSilhouetteMaterial(this.atlas, 0xa88fd0, 0.38);
    const geometry = new THREE.PlaneGeometry(1, 1, 1, 2); // drei Zeilen: unten, Fußlinie, oben
    const attr = (n) => new THREE.InstancedBufferAttribute(new Float32Array(MAX * n), n).setUsage(THREE.DynamicDrawUsage);
    this.aRect = attr(4);
    this.aPivot = attr(4);
    this.aTint = attr(4);
    this.aPage = attr(1);
    geometry.setAttribute('aRect', this.aRect);
    geometry.setAttribute('aPivot', this.aPivot);
    geometry.setAttribute('aTint', this.aTint);
    geometry.setAttribute('aPage', this.aPage);
    this.mesh = new THREE.InstancedMesh(geometry, this.material, MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.mesh.renderOrder = 1.8; // wie die Voxel-Horde (materials.js)
    this.mesh.receiveShadow = true; // im Schatten von Haus und Bäumen dunkler, wie die Voxel
    this.mesh.name = 'Horde-Sprites';
    group.add(this.mesh);
    this.silhouette = new THREE.InstancedMesh(geometry, this.silhouetteMaterial, MAX);
    this.silhouette.instanceMatrix = this.mesh.instanceMatrix; // dieselben Fußpunkte
    this.silhouette.frustumCulled = false;
    this.silhouette.count = 0;
    this.silhouette.visible = false;
    this.silhouette.renderOrder = 1;
    group.add(this.silhouette);
    this.variants = new Map(); // Schlüssel -> Fassung
    this.byType = new Map(); // Art -> (Faktor -> Fassung), ohne Zeichenketten je Bild
    this.jobs = new Map(); // laufende Aufträge (id -> Auftrag)
    this.jobId = 0;
    this.workers = null; // erst beim ersten Backen (null: noch nicht versucht, []: keiner)
    this.retry = []; // Aufträge eines ausgefallenen Workers (backt dann das Spiel selbst)
    this.baked = 0;
    this.bakeMs = 0;
    this.started = 0;
    this.active = false; // backen nur, solange der 2D-Look an ist
    this._m = new THREE.Matrix4();
    this.n = 0;
    this.living = 0;
    this.shown = []; // Bild je Instanz (Prüfung)
    this.shownBy = []; // Schlurfer je Instanz (Prüfung)
    BACKGROUND.forEach((type, i) => this.request(type, 1, 2 + i * 0.01));
  }

  // --- Backen --------------------------------------------------------------------------------

  /**
   * Eine Fassung anfordern: `prio` 0 (steht im Bild), 1 (kommt heute Nacht), 2 (Hintergrund);
   * eine frühere Anforderung behält die bessere Stufe.
   */
  request(type, f = 1, prio = 0) {
    if (!SPRITE_TYPES.includes(type)) return null;
    let byF = this.byType.get(type);
    if (!byF) this.byType.set(type, (byF = new Map()));
    let v = byF.get(f);
    if (!v) {
      v = { key: variantKey(type, f), type, f, prio, next: 0, done: 0, entries: [], table: null, ready: false, failed: false, ms: 0 };
      byF.set(f, v);
      this.variants.set(v.key, v);
    } else if (prio < v.prio) v.prio = prio;
    if (this.active && !v.ready) this.kick();
    return v;
  }

  /** Die Fassungen der kommenden Nacht vorziehen (Liste aus {type, f}). */
  plan(list) {
    for (const { type, f } of list) this.request(type, f || 1, 1);
  }

  /** Die wichtigste unfertige Fassung mit offenen Bildern (bei gleicher Stufe die weiter gebackene). */
  bestVariant() {
    let best = null;
    for (const v of this.variants.values()) {
      if (v.ready || v.failed || v.next >= PER_VARIANT) continue;
      if (!best || v.prio < best.prio || (v.prio === best.prio && v.next > best.next)) best = v;
    }
    return best;
  }

  /** Nächstes Bild: erst Liegengebliebenes, dann die wichtigste Fassung. */
  nextJob() {
    if (this.retry.length) return this.retry.shift();
    const best = this.bestVariant();
    return best ? this.jobOf(best) : null;
  }

  /** Das nächste Bild einer Fassung als Auftrag. */
  jobOf(v) {
    const index = v.next++;
    const fr = FRAMES[index];
    return { id: ++this.jobId, v, index, d: fr.d, anim: fr.anim, k: fr.k };
  }

  /** Backen einschalten (mit dem 2D-Look) oder anhalten (laufende Bilder kommen noch an). */
  setActive(on) {
    this.active = on;
    if (on) this.kick();
  }

  /** Worker anlegen und mit Aufträgen versorgen (ohne Worker backt pump() im Spiel). */
  kick() {
    if (!this.active) return;
    if (this.workers === null) this.startWorkers();
    for (const w of this.workers) this.feed(w);
  }

  startWorkers() {
    this.workers = [];
    this.started = performance.now();
    if (typeof Worker === 'undefined') return;
    const n = Math.max(1, Math.min(2, (globalThis.navigator?.hardwareConcurrency || 2) - 1));
    try {
      for (let i = 0; i < n; i++) {
        const worker = new Worker(new URL('./spriteWorker.js', import.meta.url), { type: 'module' });
        const w = { worker, busy: new Set(), dead: false };
        worker.onmessage = (e) => this.receive(w, e.data);
        worker.onerror = (e) => {
          e.preventDefault?.();
          this.fail(w);
        };
        this.workers.push(w);
      }
    } catch {
      for (const w of this.workers) w.worker.terminate();
      this.workers = []; // kein Worker (gesperrt): das Spiel backt selbst
    }
  }

  feed(w) {
    while (this.active && !w.dead && w.busy.size < IN_FLIGHT) {
      const job = this.nextJob();
      if (!job) return;
      w.busy.add(job.id);
      this.jobs.set(job.id, job);
      w.worker.postMessage({ id: job.id, type: job.v.type, f: job.v.f, d: job.d, anim: job.anim, k: job.k });
    }
  }

  /** Ein Worker fällt aus: seine Aufträge backt das Spiel selbst, ohne Worker geht es weiter. */
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
    if (v.failed || !v.entries) return; // aufgegeben (Fehler im Worker, Atlas voll)
    v.entries[job.index] = enc;
    v.done++;
    v.ms += ms;
    this.baked++;
    this.bakeMs += ms;
    if (v.done < PER_VARIANT) return;
    const list = v.entries.map((e, i) => {
      const fr = FRAMES[i];
      return [`${v.key}:${fr.d}:${fr.anim}:${fr.k}`, e];
    });
    try {
      this.atlas.addAll(list);
    } catch {
      v.failed = true; // Atlas voll: diese Fassung bleibt Voxel (bzw. die Grundform)
      v.entries = null;
      return;
    }
    v.table = list.map(([key]) => {
      const f = this.atlas.frames.get(key);
      f.key = key;
      return f;
    });
    v.entries = null;
    v.ready = true;
    v.readyAt = performance.now() - this.started;
  }

  /**
   * Ohne Worker (gesperrt oder ausgefallen) backt das Spiel selbst: ein Bild kostet 30–130 ms,
   * also höchstens eins je Bild im Spiel – für Schlurfer im Bild sofort, sonst nur jedes achte
   * Bild (bis dahin sind es Voxel, nichts wartet darauf).
   */
  pump() {
    if (!this.active) return;
    if (this.workers === null) this.kick();
    if (this.workers.length && !this.retry.length) return;
    this.pumpTick = (this.pumpTick || 0) + 1;
    const best = this.bestVariant();
    if (!this.retry.length && (!best || (best.prio > 0 && this.pumpTick % 8))) return;
    const job = this.nextJob();
    const t1 = performance.now();
    const enc = encodeFrame(bakeFrame(job.d, job.anim, job.k, job.v.type, job.v.f));
    this.store(job, enc, performance.now() - t1);
  }

  /** Prüfung: Fassungen sofort hier backen (Liste von Arten oder {type, f}; ohne Liste alle im Hintergrund). */
  bakeNow(list = BACKGROUND) {
    for (const item of list) {
      const { type, f } = typeof item === 'string' ? { type: item, f: 1 } : item;
      const v = this.request(type, f || 1, -1);
      // (Bilder, die schon beim Worker sind, kommen später an)
      while (v && !v.ready && !v.failed && v.next < PER_VARIANT) {
        const job = this.jobOf(v);
        this.store(job, encodeFrame(bakeFrame(job.d, job.anim, job.k, v.type, v.f)), 0);
      }
    }
  }

  // --- Zeichnen ------------------------------------------------------------------------------

  /**
   * Die Fassung eines Schlurfers, falls fertig (sonst angefordert): Schildträger ohne Tür haben
   * ihre eigene Form, Champions und die Teile des Moosriesen ihre Größe. Bis ihre Fassung fertig
   * ist, nehmen sie die Grundform vergrößert. Setzt z.spriteVar und z.spriteScale.
   */
  pick(z) {
    const type = z.type === 'schildtraeger' && !(z.doorHp > 0) ? 'schildtraegerOhne' : z.type;
    const f = z.size || 1;
    const v = this.byType.get(type)?.get(f) || this.request(type, f, 0);
    if (v?.ready) {
      z.spriteVar = v;
      z.spriteScale = 1;
      return true;
    }
    if (v && !v.failed && v.prio > 0) {
      v.prio = 0;
      this.kick();
    }
    if (f !== 1) {
      const base = this.byType.get(type)?.get(1) || this.request(type, 1, 0);
      if (base?.ready) {
        z.spriteVar = base;
        z.spriteScale = f;
        return true;
      }
    }
    return false;
  }

  /**
   * Richtung mit Hysterese (recherche 3): Den Sektor erst wechseln, wenn der Winkel 10° über
   * die Grenze hinaus ist und die alte Richtung 0,15 s stand; eine Wendung um 90° gilt sofort.
   * Beim Schlag und Ausholen bleibt die Richtung stehen.
   */
  direction(z, dt) {
    const target = ((Math.round(z.facing / SECTOR) % 8) + 8) % 8;
    if (z.spriteDir === undefined) {
      z.spriteDir = target;
      z.spriteHold = 0;
      return target;
    }
    z.spriteHold += dt;
    if (target === z.spriteDir || z.attackAnim > 0 || z.windup > 0 || z.boss?.windup > 0) return z.spriteDir;
    const off = Math.abs(wrapAngle(z.facing - z.spriteDir * SECTOR));
    if (off >= Math.PI / 2 - 1e-3 || (off > SECTOR / 2 + HYST && z.spriteHold >= HOLD)) {
      z.spriteDir = target;
      z.spriteHold = 0;
    }
    return z.spriteDir;
  }

  /**
   * Bild in der Reihe einer Richtung aus dem Zustand (dieselben Größen wie die Voxel-Pose):
   * Sterben fällt in vier Bildern, getroffen taumelt er, beim Schlag drei Bilder über 0,45 s,
   * beim Ausholen (auch ein Boss vor seinem Angriff) die Arme hoch, sonst gehen oder stehen.
   */
  frameOf(z, time, moving) {
    if (z.state === 'dying') return OFFSET.fallen + Math.min(ANIMS.fallen - 1, Math.floor((z.deathT / 0.45) * ANIMS.fallen));
    if (z.recoil > 0) return OFFSET.treffer;
    if (z.attackAnim > 0) return OFFSET.schlag + Math.max(0, Math.min(ANIMS.schlag - 1, Math.floor((1 - z.attackAnim / 0.45) * ANIMS.schlag)));
    if (z.windup > 0 || z.boss?.windup > 0) return OFFSET.ausholen;
    if (z.freezeT > 0) return OFFSET.stehen; // im Eisblock steht alles still
    if (moving && !(z.stunT > 0)) {
      const q = (((z.phase / (Math.PI * 2)) % 1) + 1) % 1;
      return OFFSET.gehen + (Math.floor(q * WALK_FRAMES) % WALK_FRAMES);
    }
    return OFFSET.stehen + (Math.floor(time * 2 + z.id * 0.37) % ANIMS.stehen);
  }

  begin() {
    this.n = 0;
    this.living = 0;
  }

  /**
   * Einen Schlurfer eintragen (vorher pick). `tint` wie bei den Voxeln, `glowOnly` in der
   * Nebelwelle (nur die Augen), `y` die Höhe des Fußpunkts, `shiver` 1-px-Zittern, `fade` Anteil
   * gerastert ausgeblendet (Sterben, Graben).
   */
  put(z, tint, glowOnly, y, shiver, moving, time, dt, fade) {
    if (this.n >= MAX) return;
    const i = this.n++;
    if (z.state !== 'dying') this.living = i + 1; // die Lebenden kommen zuerst (horde.render sortiert)
    const dir = this.direction(z, dt);
    const d = drawnDir(dir);
    const f = z.spriteVar.table[d * PER_DIR + this.frameOf(z, time, moving)];
    this.shown[i] = f;
    this.shownBy[i] = z;
    const s = z.spriteScale;
    this._m.makeScale(s, s, s).setPosition(z.x + shiver, y, z.z);
    this.mesh.setMatrixAt(i, this._m);
    this.aRect.setXYZW(i, f.x, f.y, f.w, f.h);
    // Je Schlurfer ein paar Millimeter mehr Tiefenversatz: nie Flimmern bei gleicher Stelle
    this.aPivot.setXYZW(i, f.px, f.py, dir <= 4 ? 1 : -1, DEPTH_BIAS + (z.id % 16) * 0.002);
    this.aTint.setXYZW(i, tint.r, tint.g, tint.b, glowOnly ? -1 : fade);
    this.aPage.setX(i, f.page);
  }

  end() {
    const n = this.n;
    this.mesh.count = n;
    this.mesh.visible = n > 0;
    this.silhouette.count = this.living;
    this.silhouette.visible = this.living > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.aRect.needsUpdate = true;
    this.aPivot.needsUpdate = true;
    this.aTint.needsUpdate = true;
    this.aPage.needsUpdate = true;
  }

  hide() {
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.silhouette.count = 0;
    this.silhouette.visible = false;
  }

  /** Prüfung: Stand des Backens und der Instanzen. */
  info() {
    const ready = [];
    const waiting = [];
    for (const v of this.variants.values()) {
      if (v.ready) ready.push(v.key);
      else if (!v.failed) waiting.push({ key: v.key, prio: v.prio, done: v.done });
    }
    waiting.sort((a, b) => a.prio - b.prio);
    const order = [...this.variants.values()].filter((v) => v.ready).sort((a, b) => a.readyAt - b.readyAt).map((v) => v.key);
    return {
      active: this.active,
      workers: this.workers ? this.workers.length : null,
      ready,
      order,
      waiting,
      failed: [...this.variants.values()].filter((v) => v.failed).map((v) => v.key),
      baked: this.baked,
      bakeMs: Math.round(this.bakeMs),
      perVariant: PER_VARIANT,
      atlas: this.atlas.info(),
      drawn: this.mesh.count,
      living: this.living,
    };
  }

  /** Prüfung: das Bild einer Instanz (Schlüssel »art:richtung:zustand:nummer«). */
  keyOf(i) {
    return i >= 0 && i < this.n ? this.shown[i]?.key || null : null;
  }

  /** Prüfung: die Instanz eines Schlurfers im letzten Bild (−1: nicht als Sprite gezeichnet). */
  indexOf(z) {
    for (let i = 0; i < this.n; i++) if (this.shownBy[i] === z) return i;
    return -1;
  }
}
