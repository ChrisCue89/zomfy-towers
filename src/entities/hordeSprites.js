// Die Horde als Sprites (F1, Prototyp): Richtung, Zustand und Bild je Schlurfer, Instanzdaten
// für einen InstancedMesh aufrechter Quads. Die Horde-Logik bleibt unverändert; horde.render
// gibt Schlurfer einer Art mit Sprites hierher ab. Gebacken wird im Hintergrund (einige Bilder
// je Schritt), bis dahin zeichnet die Horde weiter Voxel.

import * as THREE from 'three';
import { SpriteAtlas } from '../render/spriteAtlas.js';
import { createSpriteMaterial, createSpriteSilhouetteMaterial } from '../render/spriteMaterial.js';
import { bakeFrame, ANIMS, DIRS } from './zombieSprites.js';

const MAX = 400;
/** F1: Nur der Schlurfer hat schon Sprites (die übrigen Arten folgen mit F2). */
export const SPRITE_KINDS = new Set(['schlurfer']);
const SECTOR = Math.PI / 4;
const HYST = (10 * Math.PI) / 180; // erst 10° über der Sektorgrenze wechseln …
const HOLD = 0.15; // … und frühestens nach 0,15 s
const DEPTH_BIAS = 0.3;
const WALK_FRAMES = ANIMS.gehen;

/** Richtung 0–7 → gezeichnete Richtung 0–4 und gespiegelt? (W, NW, SW sind Spiegel von O, NO, SO) */
function drawn(dir) {
  return dir <= 4 ? { d: dir, flip: 1 } : { d: 8 - dir, flip: -1 };
}

function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export class HordeSprites {
  /** @param {THREE.Group} group die Gruppe der Horde */
  constructor(group) {
    this.atlas = new SpriteAtlas(1024);
    this.material = createSpriteMaterial(this.atlas, { selfLight: 0.2 });
    this.silhouetteMaterial = createSpriteSilhouetteMaterial(this.atlas, 0xa88fd0, 0.38);
    const geometry = new THREE.PlaneGeometry(1, 1);
    const attr = (n) => new THREE.InstancedBufferAttribute(new Float32Array(MAX * n), n).setUsage(THREE.DynamicDrawUsage);
    this.aRect = attr(4);
    this.aPivot = attr(4);
    this.aTint = attr(4);
    geometry.setAttribute('aRect', this.aRect);
    geometry.setAttribute('aPivot', this.aPivot);
    geometry.setAttribute('aTint', this.aTint);
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
    this.queue = [];
    for (const kind of SPRITE_KINDS) {
      for (let d = 0; d < DIRS; d++) {
        for (const [anim, n] of Object.entries(ANIMS)) for (let k = 0; k < n; k++) this.queue.push({ kind, d, anim, k });
      }
    }
    this.total = this.queue.length;
    this.baked = 0;
    this.bakeMs = 0;
    this._m = new THREE.Matrix4();
    this.n = 0;
    this.living = 0;
  }

  get ready() {
    return this.queue.length === 0;
  }

  has(type) {
    return SPRITE_KINDS.has(type);
  }

  /** Einige Bilder backen, höchstens `ms` Millisekunden (mindestens eins). */
  bake(ms = 6) {
    const t0 = performance.now();
    while (this.queue.length) {
      const q = this.queue.shift();
      this.atlas.add(`${q.kind}:${q.d}:${q.anim}:${q.k}`, bakeFrame(q.d, q.anim, q.k));
      this.baked++;
      if (performance.now() - t0 >= ms) break;
    }
    this.bakeMs += performance.now() - t0;
    if (!this.queue.length) this.atlas.upload(); // einmal hochladen, sobald alles da ist
  }

  bakeAll() {
    while (this.queue.length) this.bake(1e9);
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
    if (target === z.spriteDir || z.attackAnim > 0 || z.windup > 0) return z.spriteDir;
    const off = Math.abs(wrapAngle(z.facing - z.spriteDir * SECTOR));
    if (off >= Math.PI / 2 - 1e-3 || (off > SECTOR / 2 + HYST && z.spriteHold >= HOLD)) {
      z.spriteDir = target;
      z.spriteHold = 0;
    }
    return z.spriteDir;
  }

  /** Zustand und Bild aus dem Schlurfer (dieselben Größen wie die Voxel-Pose). */
  frameOf(z, time, moving) {
    if (z.state === 'dying') return ['fallen', Math.min(ANIMS.fallen - 1, Math.floor((z.deathT / 0.45) * ANIMS.fallen))];
    if (z.recoil > 0) return ['treffer', 0];
    if (moving && !(z.freezeT > 0 || z.stunT > 0)) {
      const q = (((z.phase / (Math.PI * 2)) % 1) + 1) % 1;
      return ['gehen', Math.floor(q * WALK_FRAMES) % WALK_FRAMES];
    }
    return ['stehen', Math.floor(time * 2 + z.id * 0.37) % 2];
  }

  begin() {
    this.n = 0;
    this.living = 0;
  }

  /**
   * Einen Schlurfer eintragen. `tint` wie bei den Voxeln, `glowOnly` in der Nebelwelle (nur die
   * Augen), `sink` Meter im Boden beim Sterben, `shiver` 1-px-Zittern nach einem Treffer,
   * `scale` die Größe (Champions).
   */
  put(z, { tint, glowOnly, sink, shiver, moving, time, dt, scale = 1 }) {
    if (this.n >= MAX) return;
    const i = this.n++;
    if (z.state !== 'dying') this.living = i + 1; // die Lebenden kommen zuerst (horde.render sortiert)
    const dir = this.direction(z, dt);
    const { d, flip } = drawn(dir);
    const [anim, k] = this.frameOf(z, time, moving);
    const f = this.atlas.frames.get(`${z.type}:${d}:${anim}:${k}`);
    this._m.makeScale(scale, scale, scale).setPosition(z.x + shiver, z.y - sink, z.z);
    this.mesh.setMatrixAt(i, this._m);
    this.aRect.setXYZW(i, f.x, f.y, f.w, f.h);
    // Je Schlurfer ein paar Millimeter mehr Tiefenversatz: nie Flimmern bei gleicher Stelle
    this.aPivot.setXYZW(i, f.px, f.py, flip, DEPTH_BIAS + (z.id % 16) * 0.002);
    const fade = z.state === 'dying' ? Math.max(0, Math.min(1, (z.deathT - 0.55) * 1.5)) : 0;
    this.aTint.setXYZW(i, tint.r, tint.g, tint.b, glowOnly ? -1 : fade);
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
  }

  hide() {
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.silhouette.count = 0;
    this.silhouette.visible = false;
  }

  /** Prüfung: Stand des Backens und der Instanzen. */
  info() {
    return { ready: this.ready, baked: this.baked, total: this.total, frames: this.atlas.frames.size, bakeMs: Math.round(this.bakeMs), drawn: this.mesh.count, living: this.living };
  }
}
