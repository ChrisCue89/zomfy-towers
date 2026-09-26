// Pixel-Partikel: Rauch, Funken und Glühwürmchen als Punkte in Spielpixel-
// größe. Transparenz entsteht durch geordnetes Dithering (discard), nicht
// durch Blending – so bleiben die Pixel hart.

import * as THREE from 'three';
import { BAYER_GLSL } from '../render/shaders.js';
import { sharedUniforms } from '../render/materials.js';
import { Rng, valueNoise } from '../core/rng.js';

const VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute float aRound;
varying vec3 vColor;
varying float vAlpha;
varying float vRound;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize;
  vColor = aColor;
  vAlpha = aAlpha;
  vRound = aRound;
}
`;

const FRAG = /* glsl */ `
uniform ivec2 uDitherOffset;
varying vec3 vColor;
varying float vAlpha;
varying float vRound;
${BAYER_GLSL}
void main() {
  if (vAlpha <= 0.001) discard;
  if (vRound > 0.5) {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.24) discard;
  }
  if (bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset) > vAlpha) discard;
  gl_FragColor = vec4(vColor, 1.0);
}
`;

function createPointsMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uDitherOffset: sharedUniforms.uDitherOffset },
    depthWrite: false,
    depthTest: true,
  });
}

class PointBuffer {
  constructor(max) {
    this.max = max;
    const g = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.color = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.size = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    this.alpha = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    this.round = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.position);
    g.setAttribute('aColor', this.color);
    g.setAttribute('aSize', this.size);
    g.setAttribute('aAlpha', this.alpha);
    g.setAttribute('aRound', this.round);
    g.setDrawRange(0, 0);
    this.geometry = g;
    this.points = new THREE.Points(g, createPointsMaterial());
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  commit(count) {
    this.geometry.setDrawRange(0, count);
    this.position.needsUpdate = true;
    this.color.needsUpdate = true;
    this.size.needsUpdate = true;
    this.alpha.needsUpdate = true;
    this.round.needsUpdate = true;
  }
}

/** Kurzlebige Partikel (Rauch, Funken). */
export class Particles {
  constructor(max = 700, seed = 1) {
    this.buffer = new PointBuffer(max);
    this.object = this.buffer.points;
    this.items = [];
    this.max = max;
    this.rng = new Rng(seed);
    this.wind = new THREE.Vector3(0.18, 0, -0.05);
  }

  /**
   * @param {object} p x,y,z, vx,vy,vz, life, size0, size1, color0, color1 (THREE.Color), alpha0, alpha1, drag, lift, round
   */
  spawn(p) {
    if (this.items.length >= this.max) return;
    this.items.push({ age: 0, ...p });
  }

  update(dt) {
    const items = this.items;
    const b = this.buffer;
    let n = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i];
      p.age += dt;
      if (p.age >= p.life) {
        items[i] = items[items.length - 1];
        items.pop();
      }
    }
    for (const p of items) {
      const t = p.age / p.life;
      const drag = Math.exp(-(p.drag ?? 0.6) * dt);
      p.vx = p.vx * drag + this.wind.x * (p.windFactor ?? 1) * dt;
      p.vz = p.vz * drag + this.wind.z * (p.windFactor ?? 1) * dt;
      p.vy = p.vy * drag + (p.lift ?? 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      b.position.array[n * 3] = p.x;
      b.position.array[n * 3 + 1] = p.y;
      b.position.array[n * 3 + 2] = p.z;
      const c0 = p.color0;
      const c1 = p.color1 || c0;
      b.color.array[n * 3] = c0.r + (c1.r - c0.r) * t;
      b.color.array[n * 3 + 1] = c0.g + (c1.g - c0.g) * t;
      b.color.array[n * 3 + 2] = c0.b + (c1.b - c0.b) * t;
      b.size.array[n] = Math.max(1, Math.round(p.size0 + (p.size1 - p.size0) * t));
      const fadeIn = Math.min(1, p.age / 0.25);
      b.alpha.array[n] = (p.alpha0 + (p.alpha1 - p.alpha0) * t) * fadeIn;
      b.round.array[n] = p.round ? 1 : 0;
      n++;
    }
    b.commit(n);
  }
}

/** Rauchfahne an einer festen Stelle. */
export class SmokeEmitter {
  constructor(particles, position, { rate = 1.5, size = [3, 7], life = [4, 6], rise = 0.35 } = {}) {
    this.particles = particles;
    this.position = position.clone();
    this.rate = rate;
    this.size = size;
    this.life = life;
    this.rise = rise;
    this.acc = 0;
    this.color0 = new THREE.Color();
    this.color1 = new THREE.Color();
  }

  update(dt, colorNear, colorFar) {
    this.acc += dt * this.rate;
    const rng = this.particles.rng;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.particles.spawn({
        x: this.position.x + rng.range(-0.05, 0.05),
        y: this.position.y,
        z: this.position.z + rng.range(-0.05, 0.05),
        vx: rng.range(-0.05, 0.05),
        vy: this.rise * rng.range(0.8, 1.2),
        vz: rng.range(-0.05, 0.05),
        life: rng.range(this.life[0], this.life[1]),
        size0: this.size[0],
        size1: this.size[1] + rng.int(0, 1),
        color0: colorNear.clone(),
        color1: colorFar.clone(),
        alpha0: 0.75,
        alpha1: 0.0,
        drag: 0.25,
        lift: 0.02,
        round: true,
        windFactor: 1.4,
      });
    }
  }
}

/** Funkenflug über dem Lagerfeuer. */
export class EmberEmitter {
  constructor(particles, position, rate = 5) {
    this.particles = particles;
    this.position = position.clone();
    this.rate = rate;
    this.acc = 0;
    this.hot = new THREE.Color(0xfde08e);
    this.cool = new THREE.Color(0xb03e25);
  }

  update(dt, strength = 1) {
    this.acc += dt * this.rate * strength;
    const rng = this.particles.rng;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.particles.spawn({
        x: this.position.x + rng.range(-0.18, 0.18),
        y: this.position.y + rng.range(0, 0.2),
        z: this.position.z + rng.range(-0.18, 0.18),
        vx: rng.range(-0.25, 0.25),
        vy: rng.range(0.8, 1.5),
        vz: rng.range(-0.25, 0.25),
        life: rng.range(0.6, 1.5),
        size0: 1,
        size1: 1,
        color0: this.hot,
        color1: this.cool,
        alpha0: 1,
        alpha1: 0.2,
        drag: 1.1,
        lift: 0.4,
        round: false,
        windFactor: 0.6,
      });
    }
  }
}

/** Glühwürmchen: schweben nachts über Wiese und Waldrand. */
export class Fireflies {
  constructor(count, seed, spots) {
    this.buffer = new PointBuffer(count);
    this.object = this.buffer.points;
    const rng = new Rng(seed);
    this.flies = [];
    for (let i = 0; i < count; i++) {
      const [sx, sz, radius] = rng.pick(spots);
      this.flies.push({
        hx: sx + rng.range(-radius, radius),
        hz: sz + rng.range(-radius, radius),
        hy: rng.range(0.3, 1.6),
        phase: rng.range(0, 100),
        speed: rng.range(0.15, 0.35),
        blink: rng.range(0.6, 1.6),
      });
    }
    this.time = 0;
    this.color = new THREE.Color(0xe8f59a).multiplyScalar(1.6);
  }

  update(dt, visibility) {
    this.time += dt;
    const b = this.buffer;
    let n = 0;
    if (visibility > 0.01) {
      for (const f of this.flies) {
        const t = this.time * f.speed + f.phase;
        const x = f.hx + (valueNoise(t, f.phase, 3) - 0.5) * 3.0;
        const z = f.hz + (valueNoise(t, f.phase + 50, 4) - 0.5) * 3.0;
        const y = f.hy + Math.sin(t * 2.1) * 0.25;
        const pulse = Math.max(0, Math.sin(this.time * f.blink + f.phase));
        const alpha = pulse * pulse * visibility;
        if (alpha < 0.05) continue;
        b.position.array[n * 3] = x;
        b.position.array[n * 3 + 1] = y;
        b.position.array[n * 3 + 2] = z;
        b.color.array[n * 3] = this.color.r;
        b.color.array[n * 3 + 1] = this.color.g;
        b.color.array[n * 3 + 2] = this.color.b;
        b.size.array[n] = alpha > 0.7 ? 2 : 1;
        b.alpha.array[n] = Math.min(1, alpha * 1.3);
        b.round.array[n] = 0;
        n++;
      }
    }
    b.commit(n);
  }
}
