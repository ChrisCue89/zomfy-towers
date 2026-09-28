// Warme Lichtquellen: Punktlichter mit Flackern und die dazugehörigen
// leuchtenden Materialien (Fensterglas, Lampen, Flammen). Alle Lichter werden
// beim Start angelegt; ein- und ausgeschaltet wird nur über die Intensität.

import * as THREE from 'three';
import { valueNoise } from '../core/rng.js';

const tmpColor = new THREE.Color();

/**
 * @typedef {object} WarmLightOptions
 * @property {THREE.Vector3} position
 * @property {number} color
 * @property {number} intensity Grundhelligkeit (Candela)
 * @property {number} distance Reichweite in Metern
 * @property {'lamp'|'always'|'manual'} mode lamp = folgt der Dämmerung
 * @property {number} [dayFactor] Anteil der Helligkeit am Tag (mode 'always')
 * @property {number} [flickerSpeed]
 * @property {number} [flickerAmount]
 */

export class WarmLights {
  constructor(scene) {
    this.scene = scene;
    this.entries = [];
    this.glows = [];
    this.time = 0;
  }

  /** @param {WarmLightOptions} options */
  addLight(options) {
    const light = new THREE.PointLight(options.color, 0, options.distance, 2);
    light.position.copy(options.position);
    light.castShadow = false;
    this.scene.add(light);
    const entry = {
      light,
      base: options.intensity,
      mode: options.mode || 'lamp',
      dayFactor: options.dayFactor ?? 0.35,
      dimByDay: Boolean(options.dimByDay), // von Hand geschaltet, aber am Tag gedämpft (Mikas Laterne, m16-r1)
      speed: options.flickerSpeed ?? 3,
      amount: options.flickerAmount ?? 0.05,
      seed: this.entries.length * 17.3,
      on: true,
      level: 0,
    };
    this.entries.push(entry);
    return entry;
  }

  /**
   * Leuchtendes Material an einen Helligkeitswert koppeln.
   * @param {THREE.Material} material
   * @param {{dim:number, bright:number, boost?:number, mode?:string, entry?:object, twinkle?:boolean}} options
   *   mode 'lamp' = hell in der Nacht, 'always' = immer, 'sky' = hell am Tag (Fensterglas von innen, M11)
   */
  addGlow(material, options) {
    const glow = {
      material,
      dim: new THREE.Color(options.dim),
      bright: new THREE.Color(options.bright),
      boost: options.boost ?? 1,
      mode: options.mode || 'lamp',
      entry: options.entry || null,
      twinkle: options.twinkle || false,
      seed: this.glows.length * 7.1,
      on: true,
      scale: 1, // M25: dämpfen, ohne auszuschalten (der schlafende Moder)
    };
    this.glows.push(glow);
    return glow;
  }

  flicker(seed, speed, amount) {
    const n = valueNoise(this.time * speed + seed, seed * 0.37, 11) - 0.5;
    const n2 = valueNoise(this.time * speed * 2.7 + seed, seed * 0.91, 12) - 0.5;
    return 1 + (n * 1.4 + n2 * 0.6) * amount;
  }

  /**
   * @param {number} dt
   * @param {number} lampLevel 0 (Tag) .. 1 (Nacht) aus dem Tag-Nacht-System
   */
  update(dt, lampLevel) {
    this.time += dt;
    for (const e of this.entries) {
      let level;
      if (e.mode === 'always') level = e.dayFactor + (1 - e.dayFactor) * lampLevel;
      else if (e.mode === 'manual') level = e.on ? 1 : 0;
      else level = lampLevel;
      // Am Tag gedämpft, ein Aufflammen (boost, Laternenblitz) aber in voller Stärke:
      // bis boost 2 ganz hell, darunter gleitet es stetig zurück auf den Schimmer
      if (e.dimByDay && level > 0) level = Math.max(e.dayFactor + (1 - e.dayFactor) * lampLevel, Math.min(1, (e.boost || 1) - 1));
      if (!e.on) level = 0;
      e.level = level;
      e.light.intensity = e.base * level * this.flicker(e.seed, e.speed, e.amount) * (e.boost || 1);
    }
    for (const g of this.glows) {
      let level = g.entry ? g.entry.level : g.mode === 'always' ? 1 : g.mode === 'sky' ? 1 - lampLevel * 0.85 : lampLevel;
      if (!g.on) level = 0;
      level *= g.scale;
      let f = g.entry ? this.flicker(g.entry.seed, g.entry.speed, g.entry.amount) : 1;
      if (g.twinkle) f *= 0.85 + 0.15 * Math.sin(this.time * 2.3 + g.seed);
      tmpColor.copy(g.dim).lerp(g.bright, Math.min(1, level));
      g.material.color.copy(tmpColor).multiplyScalar(level > 0 ? 1 + (g.boost - 1) * level * f : 1);
    }
  }
}
