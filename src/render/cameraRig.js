// Orthografische Dreiviertel-Kamera, die auf das Pixelraster einrastet.
//
// Blickrichtung (0, -sin, -cos) mit sin = 0,6 und cos = 0,8. Ein Weltpunkt
// (x, y, z) landet im Kamerabild bei (x, 0,8·y − 0,6·z). Mit 40 px pro Meter
// und Voxeln von 1/8 m ergibt das exakt 5 px Breite, 4 px Wandhöhe und
// 3 px Bodentiefe pro Voxel.

import * as THREE from 'three';
import { damp } from '../core/math.js';
import { SHAKE } from '../data/feel.js';

/** Glattes Rauschen in [−1, 1] (Wertrauschen mit weicher Überblendung) – fürs Wackeln. */
function noise1(t, seed) {
  const i = Math.floor(t);
  const f = t - i;
  const h = (n) => {
    const x = Math.sin((n + seed * 57.13) * 127.1) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

export class CameraRig {
  constructor(renderConfig, cameraConfig) {
    this.cfg = cameraConfig;
    this.sin = renderConfig.pitchSin;
    this.cos = renderConfig.pitchCos;
    this.px = 1 / renderConfig.pxPerMeter;
    this.distance = 60;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 140);
    this.camera.rotation.set(-Math.asin(this.sin), 0, 0);

    this.focus = new THREE.Vector3(); // weich geführter Blickpunkt am Boden
    this.bounds = null; // { minX, maxX, minZ, maxZ }
    this.limits = null; // { x0, x1 } – so weit reicht das Gelände (breite Bildschirme)
    this.residual = new THREE.Vector2(); // Rest in Spielpixeln nach dem Einrasten
    this.ditherOffset = new THREE.Vector2(); // Weltverankerung des Ditherings
    this.rtWidth = 2;
    this.rtHeight = 2;
    this._up = new THREE.Vector3(0, this.cos, -this.sin);
    this._ideal = new THREE.Vector3();
    this._projected = new THREE.Vector3();
    // Wackeln nach dem Trauma-Modell (M26): Stöße addieren sich, der Ausschlag
    // wächst mit dem Quadrat und klingt linear ab; dazu ein gerichteter Stoß.
    this.trauma = 0;
    this.kick = new THREE.Vector2(); // Pixel, klingt schnell ab
    this.shakeTime = 0;
    this.shakeScale = 1; // Einstellung »Wackeln« (aus/halb/voll)
    this.shakeOffset = new THREE.Vector2(); // zuletzt benutzter Versatz (ganze Pixel)
  }

  /**
   * Die Kamera bekommt einen Stoß.
   * @param {number} amount Trauma (0..1), addiert sich bis 1
   * @param {number} [dx] Richtung in der Welt (x), in die die Welt rucken soll
   * @param {number} [dz] Richtung in der Welt (z)
   * @param {number} [kick] Pixel des gerichteten Stoßes
   */
  addTrauma(amount, dx = 0, dz = 0, kick = 0) {
    this.trauma = Math.min(1, this.trauma + amount);
    const len = Math.hypot(dx, dz);
    if (kick > 0 && len > 1e-6) {
      // Die Welt ruckt in Schlagrichtung: Die Kamera geht dafür ein Stück dagegen.
      // Nach Norden (−z) ist im Bild oben.
      this.kick.x -= (dx / len) * kick;
      this.kick.y += (dz / len) * kick;
    }
  }

  /** Wackeln fortschreiben – auch im Trefferstopp, dann zittert das stehende Bild. */
  tickShake(dt) {
    this.trauma = Math.max(0, this.trauma - SHAKE.decay * dt);
    this.shakeTime += dt;
    const k = Math.exp(-SHAKE.kickDecay * dt);
    this.kick.multiplyScalar(k);
    if (Math.abs(this.kick.x) < 0.05) this.kick.x = 0;
    if (Math.abs(this.kick.y) < 0.05) this.kick.y = 0;
  }

  /** Versatz in ganzen Pixeln (nie gedrehte Pixel, nie halbe). */
  shakePixels() {
    const s = this.shakeScale;
    if (s <= 0 || (this.trauma <= 0 && this.kick.x === 0 && this.kick.y === 0)) return this.shakeOffset.set(0, 0);
    const amp = SHAKE.maxPx * this.trauma * this.trauma * s;
    const t = this.shakeTime * SHAKE.freq;
    return this.shakeOffset.set(Math.round(noise1(t, 1) * amp + this.kick.x * s), Math.round(noise1(t, 2) * amp + this.kick.y * s));
  }

  setViewport(rtWidth, rtHeight) {
    this.rtWidth = rtWidth;
    this.rtHeight = rtHeight;
    const halfW = (rtWidth / 2) * this.px;
    const halfH = (rtHeight / 2) * this.px;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Maßstab wechseln (M11: drinnen doppelt so groß). Vielfache von 80 px/m
   * halten alle Voxelkanten auf dem Pixelraster.
   */
  setPxPerMeter(pxPerMeter) {
    this.px = 1 / pxPerMeter;
    this.setViewport(this.rtWidth, this.rtHeight);
  }

  /** Sofort auf einen Punkt springen (z. B. nach dem Laden). */
  jumpTo(x, z) {
    this.focus.set(x, 0, z + (this.cfg.focusOffsetZ || 0));
    this.applyBounds();
    this.place();
  }

  applyBounds() {
    this.clampFocus(this.focus);
  }

  /** Einen Blickpunkt in die Grenzen holen (der eigene oder, K1, der des Fotomodus). */
  clampFocus(p) {
    const b = this.bounds;
    if (!b) return;
    p.x = Math.min(b.maxX, Math.max(b.minX, p.x));
    p.z = Math.min(b.maxZ, Math.max(b.minZ, p.z));
    // Breite Sicht: nie über den Rand des Geländes hinaus zeigen
    const L = this.limits;
    if (L) {
      const halfW = (this.rtWidth / 2) * this.px + 0.5;
      const lo = L.x0 + halfW;
      const hi = L.x1 - halfW;
      p.x = lo <= hi ? Math.min(hi, Math.max(lo, p.x)) : (L.x0 + L.x1) / 2;
    }
  }

  /**
   * @param {number} dt
   * @param {{x:number, z:number}} target Position der Spielfigur
   * @param {{x:number, z:number}} velocity für leichtes Vorausschauen
   * @param {number} [sharpness] wie straff die Kamera folgt (Kamerafahrt: straffer,
   *   weil der Blickpunkt dort schon weich geführt ist)
   */
  update(dt, target, velocity, sharpness = this.cfg.followSharpness) {
    const ahead = this.cfg.lookAhead;
    const tx = target.x + (velocity ? velocity.x * ahead * 0.25 : 0);
    const tz = target.z + (this.cfg.focusOffsetZ || 0) + (velocity ? velocity.z * ahead * 0.25 : 0);
    this.focus.x = damp(this.focus.x, tx, sharpness, dt);
    this.focus.z = damp(this.focus.z, tz, sharpness, dt);
    this.tickShake(dt);
    this.applyBounds();
    this.place();
  }

  place() {
    const cam = this.camera;
    const px = this.px;
    // Ideale Kameraposition: Blickpunkt minus Blickrichtung mal Abstand.
    const ideal = this._ideal.set(this.focus.x, this.focus.y + this.sin * this.distance, this.focus.z + this.cos * this.distance);
    // Koordinaten in der Bildebene
    const cx = ideal.x;
    const cy = this.cos * ideal.y - this.sin * ideal.z;
    const sx = Math.round(cx / px) * px;
    const sy = Math.round(cy / px) * px;
    this.residual.set((cx - sx) / px, (cy - sy) / px);
    // Wackeln (M26): ganze Pixel, nach dem Rest – sonst glättet es sich weg
    const { x: jx, y: jy } = this.shakePixels();
    cam.position.copy(ideal);
    cam.position.x += sx - cx + jx * px;
    cam.position.addScaledVector(this._up, sy - cy + jy * px);
    cam.updateMatrixWorld(true);
    // Pixelindex des linken unteren Render-Target-Pixels in Weltpixeln.
    this.ditherOffset.set(Math.round(sx / px - this.rtWidth / 2) + jx, Math.round(sy / px - this.rtHeight / 2) + jy);
  }

  /**
   * Pixel im Render-Target (Ursprung unten links) -> Punkt auf der waagrechten
   * Ebene y = planeY (z. B. der Boden unter dem Mauszeiger).
   */
  unproject(px, py, planeY = 0, out = new THREE.Vector3()) {
    out.set((px - this.rtWidth / 2) * this.px, (py - this.rtHeight / 2) * this.px, 0).applyMatrix4(this.camera.matrixWorld);
    // Entlang der Blickrichtung (0, −sin, −cos) bis zur Ebene
    const t = (out.y - planeY) / this.sin;
    out.y = planeY;
    out.z -= this.cos * t;
    return out;
  }

  /**
   * Weltpunkt -> Pixel im Render-Target (Ursprung unten links) und Tiefe.
   * @returns {{x:number, y:number, depth:number}}
   */
  project(point, out = { x: 0, y: 0, depth: 0 }) {
    const v = this._projected.copy(point).applyMatrix4(this.camera.matrixWorldInverse);
    out.x = v.x / this.px + this.rtWidth / 2;
    out.y = v.y / this.px + this.rtHeight / 2;
    out.depth = -v.z;
    return out;
  }
}
