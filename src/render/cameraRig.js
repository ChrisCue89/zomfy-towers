// Orthografische Dreiviertel-Kamera, die auf das Pixelraster einrastet.
//
// Blickrichtung (0, -sin, -cos) mit sin = 0,6 und cos = 0,8. Ein Weltpunkt
// (x, y, z) landet im Kamerabild bei (x, 0,8·y − 0,6·z). Mit 40 px pro Meter
// und Voxeln von 1/8 m ergibt das exakt 5 px Breite, 4 px Wandhöhe und
// 3 px Bodentiefe pro Voxel.

import * as THREE from 'three';
import { damp } from '../core/math.js';

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
    this.residual = new THREE.Vector2(); // Rest in Spielpixeln nach dem Einrasten
    this.ditherOffset = new THREE.Vector2(); // Weltverankerung des Ditherings
    this.rtWidth = 2;
    this.rtHeight = 2;
    this._up = new THREE.Vector3(0, this.cos, -this.sin);
    this._ideal = new THREE.Vector3();
    this._projected = new THREE.Vector3();
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

  /** Sofort auf einen Punkt springen (z. B. nach dem Laden). */
  jumpTo(x, z) {
    this.focus.set(x, 0, z + (this.cfg.focusOffsetZ || 0));
    this.applyBounds();
    this.place();
  }

  applyBounds() {
    const b = this.bounds;
    if (!b) return;
    this.focus.x = Math.min(b.maxX, Math.max(b.minX, this.focus.x));
    this.focus.z = Math.min(b.maxZ, Math.max(b.minZ, this.focus.z));
  }

  /**
   * @param {number} dt
   * @param {{x:number, z:number}} target Position der Spielfigur
   * @param {{x:number, z:number}} velocity für leichtes Vorausschauen
   */
  update(dt, target, velocity) {
    const ahead = this.cfg.lookAhead;
    const tx = target.x + (velocity ? velocity.x * ahead * 0.25 : 0);
    const tz = target.z + (this.cfg.focusOffsetZ || 0) + (velocity ? velocity.z * ahead * 0.25 : 0);
    this.focus.x = damp(this.focus.x, tx, this.cfg.followSharpness, dt);
    this.focus.z = damp(this.focus.z, tz, this.cfg.followSharpness, dt);
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
    cam.position.copy(ideal);
    cam.position.x += sx - cx;
    cam.position.addScaledVector(this._up, sy - cy);
    cam.updateMatrixWorld(true);
    // Pixelindex des linken unteren Render-Target-Pixels in Weltpixeln.
    this.ditherOffset.set(Math.round(sx / px - this.rtWidth / 2), Math.round(sy / px - this.rtHeight / 2));
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
