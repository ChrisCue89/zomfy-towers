// Das Wetter in der Welt (Meilenstein 12, DESIGN.md 3.2 und 6.1): Es färbt das
// Licht (Sonne, Himmel, Post-Pass), lässt Gras und Laub stärker wehen, Blätter
// fallen, Nebelbänke über den See ziehen, in kalten Nächten Atemwölkchen
// aufsteigen – und bei Nieselregen fällt pixeliger Regen über das Bild.
// Welches Wetter ein Tag hat, steht in data/weather.js.
//
// Transparenz nur als gerasterte Durchsicht (CLAUDE.md): Die Nebelbänke werfen
// Pixel nach einem Bayer-Muster weg, statt halbdurchsichtig zu sein.

import * as THREE from 'three';
import { WEATHER, weatherOf, MORNING_FOG } from '../data/weather.js';
import { sharedUniforms } from '../render/materials.js';
import { BAYER_GLSL } from '../render/shaders.js';
import { P, hexToCss } from '../render/palette.js';
import { valueNoise, Rng } from '../core/rng.js';
import { smoothstep } from '../core/math.js';

const LEAF_COLORS = [P.f5, P.f6, P.r4, P.f4, P.f7, P.a0].map((c) => new THREE.Color(c));
const WHITE = new THREE.Color(1, 1, 1);
const BREATH = new THREE.Color(P.s9);
const RAIN_DAY = hexToCss(P.n8);
const RAIN_NIGHT = hexToCss(P.n6);
const MIX_KEYS = ['sun', 'hemi', 'shadow', 'exposure', 'saturation', 'wind', 'rain', 'leaves', 'fog', 'snow'];
const SNOW_DAY = hexToCss(P.s9);
const SNOW_NIGHT = hexToCss(P.n8);

const FOG_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FOG_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAmount;
uniform vec3 uColor;
uniform ivec2 uDitherOffset;
varying vec3 vWorld;
varying vec2 vUv;
${BAYER_GLSL}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  // N4 (Probespiel: »der Nebel flackert, wenn wir gehen«): Das Muster steht fest in der
  // Welt, nur die Bänke treiben (langsam). Vorher floss das Muster zusätzlich mit der Zeit
  // durch das weltfeste Raster – dabei sprangen je Bild Hunderte Pixel an und aus.
  vec2 p = vWorld.xz * 0.35;
  float n = noise(p) * 0.6 + noise(p * 2.3 + 7.0) * 0.4;
  // Ränder der Bank weich auslaufen lassen
  vec2 e = min(vUv, 1.0 - vUv) * 2.0;
  float edge = smoothstep(0.0, 0.6, min(e.x, e.y));
  float d = uAmount * edge * smoothstep(0.25, 0.85, n) * 0.85;
  if (bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset) >= d) discard;
  gl_FragColor = vec4(uColor, 1.0);
}
`;

/**
 * Nebelbänke: flache Tafeln knapp über dem Wasser (und an Nebeltagen über der
 * Bucht) – je Art ein InstancedMesh, damit der Morgennebel nur zwei
 * Zeichenaufrufe kostet.
 */
class FogBanks {
  constructor(scene, seed) {
    this.uniforms = {
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uColor: { value: new THREE.Color(0xdde2e8) },
      uDitherOffset: sharedUniforms.uDitherOffset,
    };
    const material = new THREE.ShaderMaterial({ vertexShader: FOG_VERT, fragmentShader: FOG_FRAG, uniforms: this.uniforms, depthWrite: false });
    this.landUniforms = { ...this.uniforms, uAmount: { value: 0 } };
    const landMaterial = new THREE.ShaderMaterial({ vertexShader: FOG_VERT, fragmentShader: FOG_FRAG, uniforms: this.landUniforms, depthWrite: false });
    this.waveUniforms = { ...this.uniforms, uAmount: { value: 0 } };
    const waveMaterial = new THREE.ShaderMaterial({ vertexShader: FOG_VERT, fragmentShader: FOG_FRAG, uniforms: this.waveUniforms, depthWrite: false });
    const rng = new Rng(seed + 31);
    this.group = new THREE.Group();
    this.group.name = 'Nebel';
    const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const layer = (material, count, place) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // N4 (Probespiel: »der Nebel flackert, wenn wir gehen«): nach Boden und Bauten (bis 1,2),
      // aber vor Figuren und Schlurfern (ab 1,75). Vorher lag der Nebel über den Beinen – wer
      // durch eine Nebelbank lief, schwang die Beine durch die Ebene, und die Nebelpixel
      // an den Beinen gingen bei jedem Schritt an und aus.
      mesh.renderOrder = 1.5;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      const banks = [];
      for (let k = 0; k < count; k++) banks.push(place(k));
      return { mesh, banks };
    };
    // Über dem See: in Reihen von der Uferlinie bis zum Horizont
    this.water = layer(material, 20, (k) => ({
      x: 12 + (k % 2) * 12 + rng.range(-2, 2),
      y: rng.range(0.25, 0.8),
      z: -25 + Math.floor(k / 2) * 5 + rng.range(-1.2, 1.2),
      w: rng.range(8, 12),
      d: rng.range(4, 6),
      speed: rng.range(0.04, 0.08),
      x0: 10,
      x1: 38,
    }));
    // Über der Bucht (nur an Nebeltagen dicht): tiefer und lichter
    this.land = layer(landMaterial, 5, (k) => ({
      x: rng.range(-8, 12),
      y: rng.range(0.15, 0.4),
      z: -8 + k * 4.5 + rng.range(-1, 1),
      w: rng.range(6, 9),
      d: rng.range(3, 5),
      speed: rng.range(0.025, 0.05),
      x0: -12,
      x1: 14,
    }));
    // Nebelwelle (M22): über den Wegen im Westen, nur solange die Horde im Nebel kommt
    this.wave = layer(waveMaterial, 14, () => ({
      x: rng.range(-58, -6),
      y: rng.range(0.3, 0.9),
      z: rng.range(-22, 16),
      w: rng.range(7, 11),
      d: rng.range(3.5, 5.5),
      speed: rng.range(0.03, 0.06),
      x0: -62,
      x1: -4,
    }));
    this._m = new THREE.Matrix4();
    this.move(0);
    scene.add(this.group);
  }

  /** Bänke treiben lassen und die Instanzen nachführen. */
  move(dt) {
    this.moveLayer(this.water, dt);
    this.moveLayer(this.land, dt);
    this.moveLayer(this.wave, dt);
  }

  moveLayer({ mesh, banks }, dt) {
    const m = this._m;
    for (let i = 0; i < banks.length; i++) {
      const b = banks[i];
      b.x += b.speed * dt;
      if (b.x > b.x1) b.x = b.x0;
      m.makeScale(b.w, 1, b.d).setPosition(b.x, b.y, b.z);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  update(dt, water, land, night, time, sky, wave = 0) {
    this.uniforms.uTime.value = time;
    this.uniforms.uAmount.value = water;
    this.landUniforms.uAmount.value = land;
    this.waveUniforms.uAmount.value = wave;
    this.group.visible = water > 0.01 || land > 0.01 || wave > 0.01;
    this.water.mesh.visible = water > 0.01;
    this.land.mesh.visible = land > 0.01;
    this.wave.mesh.visible = wave > 0.01;
    // Im Licht des Himmels: morgens rosig, mittags hell, nachts blaugrau
    this.uniforms.uColor.value.copy(sky).lerp(WHITE, 0.62).multiplyScalar(0.95 - 0.4 * night);
    if (this.group.visible) this.move(dt);
  }
}

export class Weather {
  /**
   * @param {{scene: THREE.Scene, particles: import('./particles.js').Particles, seed: number}} options
   */
  constructor({ scene, particles, seed }) {
    this.seed = seed;
    this.particles = particles;
    this.rng = new Rng(seed + 77);
    this.kind = 'klar';
    this.forced = null; // Prüfung: ein Wetter erzwingen
    this.snowNow = false; // M25: nach dem Frost (vom Spiel gesetzt) – dann schneit es
    this.flakes = []; // Schneeflocken im Bild (Oberflächenpixel)
    this.waveFog = 0; // Nebelwelle unterwegs (M22, vom Spiel gesetzt) …
    this.waveFogMix = 0; // … und wie dicht ihr Nebel gerade ist
    const base = WEATHER.klar;
    this.mix = { ...base, tint: new THREE.Vector3(...base.tint) };
    this.fog = new FogBanks(scene, seed);
    this.time = 0;
    this.rain = 0; // tatsächliche Regenstärke 0..1 (mit Schauern)
    this.leafT = 0;
    this.breathT = 1;
    this.drops = []; // Regentropfen im Bild (Oberflächenpixel)
    this.splashes = [];
    this._tint = new THREE.Vector3();
  }

  /** Wetter eines Tages (auch für die Ansage am Morgen). */
  forecast(day) {
    if (this.forced) return this.forced;
    return this.snowNow ? 'schnee' : weatherOf(day, this.seed);
  }

  /** Wetter sofort übernehmen (nach dem Laden, beim neuen Tag im Dunkeln). */
  snap(day) {
    this.kind = this.forecast(day);
    const target = WEATHER[this.kind];
    for (const k of MIX_KEYS) this.mix[k] = target[k];
    this.mix.tint.set(...target.tint);
  }

  /**
   * Jedes Bild, nach dem Tag-Nacht-System: Licht färben, Wind, Laub, Nebel, Atem.
   * @param {{day:number, hours:number, focus:THREE.Vector3, inside:boolean, player:object, dayNight:object}} ctx
   */
  update(dt, { day, hours, focus, inside, player, dayNight }) {
    this.time += dt;
    this.kind = this.forecast(day);
    const target = WEATHER[this.kind];
    const k = 1 - Math.exp(-dt * 0.4); // sanft überblenden (ein paar Sekunden)
    for (const key of MIX_KEYS) this.mix[key] += (target[key] - this.mix[key]) * k;
    this.mix.tint.lerp(this._tint.set(...target.tint), k);
    const m = this.mix;

    // Nieselregen in Schauern
    this.rain = m.rain * (0.5 + 0.5 * valueNoise(this.time * 0.04, 3.1, this.seed));

    // Licht und Farbe des Tages
    const dn = dayNight;
    dn.sun.intensity *= m.sun;
    dn.sun.shadow.intensity *= m.shadow;
    dn.hemi.intensity *= m.hemi;
    const look = dn.look;
    look.exposure *= m.exposure;
    look.saturation *= m.saturation;
    look.tint.multiply(m.tint);
    dn.lookInside.exposure *= 1 - m.rain * 0.05; // drinnen trüber, aber warm

    // Wind in Gras und Blumen, Rauch und Partikel
    sharedUniforms.uWind.value = m.wind;
    sharedUniforms.uSnow.value = m.snow; // M25: die Schneedecke wächst langsam mit
    this.particles.wind.set(0.18 * m.wind, 0, -0.05 * m.wind);

    // Nebel: jeden Morgen über dem Wasser, an Nebeltagen dichter, länger und auch über der Bucht
    const F = MORNING_FOG;
    const fogDay = m.fog;
    const until = F.until + (F.fogDayUntil - F.until) * fogDay;
    const morning = smoothstep(F.from, F.full, hours) * (1 - smoothstep(until - 1.5, until, hours));
    const water = morning * (F.water + (F.waterFogDay - F.water) * fogDay) + fogDay * 0.25 * dn.night;
    const land = morning * fogDay * 0.4;
    this.waveFogMix += (this.waveFog - this.waveFogMix) * (1 - Math.exp(-dt * 0.5));
    this.fog.update(dt, inside ? 0 : water, inside ? 0 : land, dn.night, this.time, dn.hemi.color, inside ? 0 : this.waveFogMix * 0.55);

    if (inside || !player) return;
    // Fallendes Laub rund um den Blickpunkt: trudelt, pendelt, bleibt kurz liegen
    this.leafT -= dt * m.leaves * 8;
    while (this.leafT <= 0) {
      this.leafT += 1;
      const r = this.rng;
      const c = LEAF_COLORS[r.int(0, LEAF_COLORS.length - 1)];
      this.particles.spawn({
        x: focus.x + r.range(-12, 10),
        y: r.range(1.2, 4),
        z: focus.z + r.range(-8, 5),
        vx: r.range(-0.2, 0.3) + 0.25 * m.wind,
        vy: r.range(-0.4, -0.2),
        vz: r.range(-0.15, 0.15),
        life: 16,
        size0: 4,
        size1: 4,
        color0: c,
        color1: c,
        alpha0: 1,
        alpha1: 1,
        drag: 0.9,
        lift: -0.3,
        round: 0,
        windFactor: 3,
        flutter: r.range(3, 6),
        phase: r.range(0, 6.28),
        sway: r.range(0.2, 0.45),
        floor: 0.03,
        rest: r.range(1.5, 3.5),
      });
    }
    // Kalte Nächte: Atemwölkchen vor Mikas Mund (Mund bei 15/16 m, vorn am Gesicht)
    if (dn.night > 0.55) {
      this.breathT -= dt;
      if (this.breathT <= 0) {
        this.breathT = 1.6 + this.rng.range(0, 0.7);
        const p = player.position;
        const f = player.facing;
        const sx = Math.sin(f);
        const sz = Math.cos(f);
        for (let i = 0; i < 4; i++) {
          this.particles.spawn({
            x: p.x + sx * (0.3 + i * 0.05),
            y: p.y + 0.95 + i * 0.03,
            z: p.z + sz * (0.3 + i * 0.05),
            vx: sx * 0.3 + this.rng.range(-0.05, 0.05),
            vy: 0.1 + i * 0.03,
            vz: sz * 0.3 + this.rng.range(-0.05, 0.05),
            life: 1.1 + i * 0.15,
            size0: 3,
            size1: 7,
            color0: BREATH,
            color1: BREATH,
            alpha0: 0.85,
            alpha1: 0,
            drag: 1.4,
            lift: 0.06,
            round: 1,
          });
        }
      }
    }
  }

  /**
   * Schnee im Bild (M25): einzelne Flocken, die langsam fallen und hin und her
   * pendeln. Drinnen schneit es nicht.
   * @param {import('../ui/ui.js').UICanvas} ui
   */
  drawSnow(ui, dt, night, inside) {
    const want = inside ? 0 : Math.round(this.mix.snow * 140);
    const flakes = this.flakes;
    const r = this.rng;
    while (flakes.length < want) flakes.push({ x: r.range(0, ui.width), y: r.range(-10, ui.height), v: r.range(14, 30), ph: r.range(0, 6.28), big: r.next() < 0.25 });
    if (flakes.length > want) flakes.length = want;
    if (!flakes.length) return;
    const ctx = ui.ctx;
    ctx.fillStyle = night > 0.5 ? SNOW_NIGHT : SNOW_DAY;
    for (const f of flakes) {
      f.y += f.v * dt;
      f.x += (Math.sin(this.time * 1.3 + f.ph) * 8 + 4 * this.mix.wind) * dt;
      if (f.y > ui.height) {
        f.y = r.range(-12, -2);
        f.x = r.range(-10, ui.width);
      }
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      ctx.fillRect(x, y, f.big ? 2 : 1, f.big ? 2 : 1);
    }
  }

  /**
   * Nieselregen im Bild: kurze schräge Striche in Oberflächenpixeln, dazu kleine
   * Spritzer am Boden. Drinnen regnet es nicht (man hört ihn aufs Dach trommeln).
   * @param {import('../ui/ui.js').UICanvas} ui
   */
  drawRain(ui, dt, night, inside) {
    const want = inside ? 0 : Math.round(this.rain * 220);
    const drops = this.drops;
    const r = this.rng;
    // Neue Tropfen gleich übers ganze Bild verteilt (sonst regnet es erst oben)
    while (drops.length < want) drops.push({ x: r.range(-20, ui.width), y: r.range(-10, ui.height), v: r.range(260, 360), len: r.int(4, 7) });
    if (drops.length > want) drops.length = want;
    if (!drops.length && !this.splashes.length) return;
    const ctx = ui.ctx;
    const slant = 0.25 + 0.1 * this.mix.wind;
    ctx.fillStyle = night > 0.5 ? RAIN_NIGHT : RAIN_DAY;
    for (const d of drops) {
      d.y += d.v * dt;
      d.x += d.v * slant * dt;
      if (d.y > ui.height || d.x > ui.width + 10) {
        // Unten angekommen: manchmal ein Spritzer, dann oben neu
        if (d.y > ui.height * 0.3 && r.next() < 0.3) this.splashes.push({ x: Math.round(d.x), y: Math.round(r.range(ui.height * 0.35, ui.height - 8)), t: 0.12 });
        d.y = r.range(-40, 0);
        d.x = r.range(-40, ui.width);
      }
      const x = Math.round(d.x);
      const y = Math.round(d.y);
      for (let i = 0; i < d.len; i++) ctx.fillRect(x - Math.round(i * slant), y - i, 1, 1);
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.splashes[i] = this.splashes[this.splashes.length - 1];
        this.splashes.pop();
        continue;
      }
      ctx.fillRect(s.x - 1, s.y, 1, 1);
      ctx.fillRect(s.x + 1, s.y, 1, 1);
      ctx.fillRect(s.x, s.y - 1, 1, 1);
    }
  }
}
