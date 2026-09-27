// Tag-Nacht-Zyklus: aus der Uhrzeit werden Sonnen-/Mondstand, Lichtfarben,
// Umgebungslicht, Lampenhelligkeit und die Farbgebung des Post-Pass berechnet.
// Ein einziges gerichtetes Licht wechselt bei Sonnenauf- und -untergang
// (Helligkeit 0) zwischen Sonne und Mond – so gibt es immer genau eine
// Schattenkarte.

import * as THREE from 'three';
import { clamp, smoothstep } from '../core/math.js';

const col = (hex) => new THREE.Color(hex);
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

// Schlüsselbilder über 24 Stunden. Farben in sRGB-Hex.
const KEYS = [
  { h: 0.0, sun: col(0x8ea3e0), sunI: 0.5, sky: col(0x3a4686), ground: col(0x1e1c38), hemiI: 2.3, lamp: 1, exp: 1.12, tint: vec(0.86, 0.93, 1.2), sat: 0.62, vig: 0.55, vigC: vec(0.3, 0.26, 0.5), shadow: 0.6 },
  { h: 4.6, sun: col(0x8ea3e0), sunI: 0.42, sky: col(0x3a4686), ground: col(0x1e1c38), hemiI: 2.3, lamp: 1, exp: 1.12, tint: vec(0.86, 0.93, 1.2), sat: 0.62, vig: 0.55, vigC: vec(0.3, 0.26, 0.5), shadow: 0.6 },
  { h: 5.5, sun: col(0xa89ad0), sunI: 0.0, sky: col(0x6a5ca0), ground: col(0x2e2640), hemiI: 2.3, lamp: 0.9, exp: 1.08, tint: vec(0.94, 0.94, 1.1), sat: 0.8, vig: 0.46, vigC: vec(0.38, 0.28, 0.52), shadow: 0.6 },
  { h: 6.3, sun: col(0xffb48c), sunI: 1.7, sky: col(0xb4a6dc), ground: col(0x5a4a58), hemiI: 1.8, lamp: 0.45, exp: 1.04, tint: vec(0.98, 0.97, 1.04), sat: 1.0, vig: 0.3, vigC: vec(0.5, 0.36, 0.55), shadow: 0.75 },
  { h: 7.6, sun: col(0xffdcb2), sunI: 2.45, sky: col(0xaac4e6), ground: col(0x6e5f48), hemiI: 1.45, lamp: 0, exp: 1.0, tint: vec(1.0, 1.0, 1.0), sat: 1.05, vig: 0.22, vigC: vec(0.45, 0.4, 0.55), shadow: 0.85 },
  { h: 12.0, sun: col(0xfff1dc), sunI: 2.75, sky: col(0xb4d0f0), ground: col(0x7a6d50), hemiI: 1.4, lamp: 0, exp: 1.0, tint: vec(1.0, 1.0, 1.0), sat: 1.0, vig: 0.2, vigC: vec(0.45, 0.42, 0.55), shadow: 0.85 },
  { h: 16.8, sun: col(0xffe0b4), sunI: 2.65, sky: col(0xb0c4e4), ground: col(0x7a6448), hemiI: 1.38, lamp: 0, exp: 1.0, tint: vec(1.0, 1.0, 1.0), sat: 1.03, vig: 0.22, vigC: vec(0.45, 0.4, 0.5), shadow: 0.85 },
  { h: 18.7, sun: col(0xffb866), sunI: 2.7, sky: col(0xa89ccc), ground: col(0x5e4a50), hemiI: 1.5, lamp: 0.3, exp: 1.02, tint: vec(0.98, 0.96, 1.04), sat: 1.08, vig: 0.28, vigC: vec(0.5, 0.34, 0.5), shadow: 0.8 },
  { h: 19.7, sun: col(0xff9458), sunI: 1.9, sky: col(0x8474b8), ground: col(0x3e3452), hemiI: 1.9, lamp: 0.85, exp: 1.04, tint: vec(0.94, 0.94, 1.1), sat: 0.95, vig: 0.38, vigC: vec(0.4, 0.3, 0.55), shadow: 0.7 },
  { h: 20.5, sun: col(0xa89ad0), sunI: 0.0, sky: col(0x55509a), ground: col(0x262244), hemiI: 2.3, lamp: 1, exp: 1.08, tint: vec(0.9, 0.93, 1.14), sat: 0.75, vig: 0.48, vigC: vec(0.33, 0.26, 0.5), shadow: 0.6 },
  { h: 21.3, sun: col(0x8ea3e0), sunI: 0.45, sky: col(0x3a4686), ground: col(0x1e1c38), hemiI: 2.3, lamp: 1, exp: 1.12, tint: vec(0.86, 0.93, 1.2), sat: 0.62, vig: 0.55, vigC: vec(0.3, 0.26, 0.5), shadow: 0.6 },
];

const UP = new THREE.Vector3(0, 1, 0);
const SUNRISE = 5.5;
const SUNSET = 20.5;

function keyPair(hours) {
  const h = ((hours % 24) + 24) % 24;
  for (let i = 0; i < KEYS.length; i++) {
    const a = KEYS[i];
    const b = KEYS[(i + 1) % KEYS.length];
    const end = b.h > a.h ? b.h : b.h + 24;
    if (h >= a.h && h < end) return [a, b, smoothstep(0, 1, (h - a.h) / (end - a.h))];
    if (i === KEYS.length - 1) return [a, b, smoothstep(0, 1, (h - a.h) / (end - a.h))];
  }
  return [KEYS[0], KEYS[1], 0];
}

/** Phase des Tages für Anzeige und Spiellogik. */
export function phaseOfHour(hours) {
  const h = ((hours % 24) + 24) % 24;
  if (h >= 6 && h < 8) return 'morgen';
  if (h >= 8 && h < 17) return 'tag';
  if (h >= 17 && h < 20) return 'abend';
  return 'nacht';
}

export class DayNight {
  constructor(scene, renderConfig) {
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(renderConfig.shadowMapSize, renderConfig.shadowMapSize);
    const range = renderConfig.shadowRange;
    const cam = sun.shadow.camera;
    cam.left = -range;
    cam.right = range;
    cam.top = range;
    cam.bottom = -range;
    cam.near = 1;
    cam.far = 90;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 2;
    scene.add(sun, sun.target);
    this.sun = sun;
    this.range = range;
    this.mapSize = renderConfig.shadowMapSize;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    scene.add(this.hemi);

    this.look = {
      exposure: 1,
      tint: new THREE.Vector3(1, 1, 1),
      saturation: 1,
      vignette: 0.2,
      vignetteColor: new THREE.Vector3(0.4, 0.4, 0.5),
      outlineTint: new THREE.Vector3(0.9, 0.82, 1.0),
    };
    // Drinnen (M11): warm und gemütlich, nachts kaum kühle Tönung – das Licht kommt vom Kamin
    this.lookInside = {
      exposure: 1,
      tint: new THREE.Vector3(1, 1, 1),
      saturation: 1,
      vignette: 0.25,
      vignetteColor: new THREE.Vector3(0.3, 0.2, 0.18),
      outlineTint: new THREE.Vector3(0.9, 0.8, 0.9),
    };
    this.lampLevel = 0;
    this.night = 0; // 0 = heller Tag, 1 = tiefe Nacht
    this.isSun = true;
    this.direction = new THREE.Vector3(0, 1, 0);
    this._tmp = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._snapped = new THREE.Vector3();
  }

  /** Richtung zum Himmelskörper (normiert). */
  static celestialDirection(hours, out = new THREE.Vector3()) {
    const h = ((hours % 24) + 24) % 24;
    const isSun = h >= SUNRISE && h < SUNSET;
    let t;
    let maxElev;
    let minElev;
    if (isSun) {
      t = (h - SUNRISE) / (SUNSET - SUNRISE);
      maxElev = THREE.MathUtils.degToRad(62);
      minElev = THREE.MathUtils.degToRad(9);
    } else {
      const since = (h - SUNSET + 24) % 24;
      t = since / (24 - (SUNSET - SUNRISE));
      maxElev = THREE.MathUtils.degToRad(48);
      minElev = THREE.MathUtils.degToRad(12);
    }
    const az = t * Math.PI; // Osten -> Süden -> Westen
    const elev = Math.max(minElev, Math.sin(t * Math.PI) * maxElev);
    out.set(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev) * (isSun ? 1 : 0.8) + (isSun ? 0 : 0.25));
    return { direction: out.normalize(), isSun };
  }

  /**
   * @param {number} hours Uhrzeit 0..24
   * @param {THREE.Vector3} focus Mittelpunkt des sichtbaren Bereichs
   */
  update(hours, focus) {
    const [a, b, t] = keyPair(hours);
    const sun = this.sun;
    sun.color.copy(a.sun).lerp(b.sun, t);
    sun.intensity = a.sunI + (b.sunI - a.sunI) * t;
    sun.shadow.intensity = a.shadow + (b.shadow - a.shadow) * t;
    this.hemi.color.copy(a.sky).lerp(b.sky, t);
    this.hemi.groundColor.copy(a.ground).lerp(b.ground, t);
    this.hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * t;
    this.lampLevel = a.lamp + (b.lamp - a.lamp) * t;

    const look = this.look;
    look.exposure = a.exp + (b.exp - a.exp) * t;
    look.tint.copy(a.tint).lerp(b.tint, t);
    look.saturation = a.sat + (b.sat - a.sat) * t;
    look.vignette = a.vig + (b.vig - a.vig) * t;
    look.vignetteColor.copy(a.vigC).lerp(b.vigC, t);

    const h = ((hours % 24) + 24) % 24;
    // Nachtfaktor: weich um Sonnenauf- und -untergang
    const dayness = smoothstep(5.2, 7.0, h) * (1 - smoothstep(19.2, 21.0, h));
    this.night = clamp(1 - dayness, 0, 1);
    const n = this.night;
    const inside = this.lookInside;
    inside.exposure = 1.04 + 0.1 * n;
    inside.tint.set(1.02 + 0.02 * n, 0.99 - 0.01 * n, 0.95 - 0.03 * n);
    inside.saturation = 1.02 - 0.08 * n;
    inside.vignette = 0.22 + 0.18 * n;

    const { direction, isSun } = DayNight.celestialDirection(hours, this.direction);
    this.isSun = isSun;
    this.placeShadowCamera(direction, focus);
  }

  placeShadowCamera(direction, focus) {
    const sun = this.sun;
    // Lichtraum-Basis für das Einrasten auf Schattentexel
    const forward = this._tmp.copy(direction).negate();
    const right = this._right.crossVectors(forward, UP);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = this._up.crossVectors(right, forward).normalize();
    const texel = (this.range * 2) / this.mapSize;
    const fr = focus.dot(right);
    const fu = focus.dot(up);
    const snapped = this._snapped
      .copy(focus)
      .addScaledVector(right, Math.round(fr / texel) * texel - fr)
      .addScaledVector(up, Math.round(fu / texel) * texel - fu);
    sun.target.position.copy(snapped);
    sun.position.copy(snapped).addScaledVector(direction, 45);
    sun.target.updateMatrixWorld();
    sun.updateMatrixWorld();
  }
}
