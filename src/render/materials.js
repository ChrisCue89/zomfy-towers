// Materialien der Welt. Alle beleuchteten Flächen sind Lambert mit Vertexfarben.
// Zusätze per onBeforeCompile:
//  - OCCLUDER: gerasterte Durchsicht rund um die Spielfigur, wenn das Objekt davor steht.
//  - FADE:     gerastertes Ausblenden (Dach und Vorderwand beim Betreten des Hauses).
// Beides arbeitet mit discard, damit Tiefenpuffer und Umrisse stimmen.
//  - SNOW:     Schnee auf allen Flächen, die nach oben schauen (M25, nach der
//    Frostnacht) – fleckig im Maß 1/16 m, dichter, je stärker `uSnow`.
//  - SELF_LIGHT: nachts ein Hauch Eigenlicht in der eigenen Farbe – für alles,
//    worum es im Kampf geht (Schlurfer, Bauten, Beute). Lesbarkeit vor Stimmung:
//    Die Welt bleibt dunkel, die Spielfiguren bleiben erkennbar (m3-r1).

import * as THREE from 'three';
import { BAYER_GLSL } from './shaders.js';

/** Gemeinsame Uniforms, jedes Bild vom Spiel aktualisiert. */
export const sharedUniforms = {
  uDitherOffset: { value: new THREE.Vector2() },
  uCutCenter: { value: new THREE.Vector2(-1e4, -1e4) },
  uCutRadius: { value: new THREE.Vector2(26, 40) }, // bei 40 px/m; das Spiel skaliert mit
  uPointScale: { value: 1 }, // Punktgröße der Partikel (pxPerMeter / 40)
  uCutDepth: { value: 0 },
  uCutStrength: { value: 0 },
  uNight: { value: 0 }, // 0 = Tag, 1 = tiefe Nacht (world.js)
  uTime: { value: 0 }, // Sekunden, für Wind in Gras und Blumen
  uWind: { value: 1 }, // Windstärke des Tages (Wetter, M12): 1 = normal
  uSnow: { value: 0 }, // Schneedecke draußen (M25): 0 = keine, 1 = überall, wo Schnee liegen bleibt
};

const DECLARATIONS = /* glsl */ `
uniform ivec2 uDitherOffset;
#ifdef OCCLUDER
uniform vec2 uCutCenter;
uniform vec2 uCutRadius;
uniform float uCutDepth;
uniform float uCutStrength;
#endif
#ifdef FADE
uniform float uFade;
#endif
#ifdef SELF_LIGHT
uniform float uNight;
uniform float uSelfLight;
#endif
#ifdef SNOW
uniform float uSnow;
uniform float uSnowAmount;
float snowHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float snowNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(snowHash(i), snowHash(i + vec2(1.0, 0.0)), f.x), mix(snowHash(i + vec2(0.0, 1.0)), snowHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
#endif
${BAYER_GLSL}
`;

const SNOW = /* glsl */ `
#ifdef SNOW
if (uSnow > 0.0) {
  // Weltlage und -normale aus der Ansicht (die Kamera dreht nie – günstig genug)
  vec3 snowN = inverseTransformDirection(normal, viewMatrix);
  vec3 snowP = (vec4(-vViewPosition, 0.0) * viewMatrix).xyz + cameraPosition;
  // Flecken statt Gries: weiches Rauschen (etwa 0,6 m), Kanten auf dem 1/16-m-Raster
  vec2 snowQ = floor(snowP.xz * 16.0) / 16.0;
  float snowH = snowNoise(snowQ * 1.6) * 0.75 + snowNoise(snowQ * 5.0 + 3.7) * 0.25;
  float snowCover = smoothstep(0.55, 0.85, snowN.y) * step(1.02 - uSnow * uSnowAmount, snowH);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.97), snowCover);
}
#endif
`;

const SELF_LIGHT = /* glsl */ `
#ifdef SELF_LIGHT
totalEmissiveRadiance += diffuseColor.rgb * uSelfLight * uNight;
#endif
`;

const DISCARD = /* glsl */ `
{
  float ditherThreshold = bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset);
  #ifdef FADE
  if (ditherThreshold < uFade) discard;
  #endif
  #ifdef OCCLUDER
  vec2 cutDelta = (gl_FragCoord.xy - uCutCenter) / uCutRadius;
  float cutDist = length(cutDelta);
  if (cutDist < 1.0 && vViewPosition.z < uCutDepth - 0.35) {
    float cutAmount = uCutStrength * smoothstep(1.0, 0.5, cutDist) * 0.92;
    if (ditherThreshold < cutAmount) discard;
  }
  #endif
}
`;

const WIND_VERTEX = /* glsl */ `
#include <begin_vertex>
#ifdef WIND
{
  // Wind: oben mehr als unten, Phase nach Ort – Gras und Blumen wiegen sich
  vec3 base = vec3(0.0);
  #ifdef USE_INSTANCING
  base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #endif
  float h = max(0.0, position.y);
  float gust = 0.6 + 0.4 * sin(uTime * 0.35 + base.x * 0.07);
  transformed.x += (sin(uTime * 1.7 + base.x * 0.9 + base.z * 0.6) * 0.1 + sin(uTime * 3.3 + base.z * 1.3) * 0.035) * h * gust * uWind;
}
#endif
#ifdef WIND_HANG
{
  // Wäsche: hängt an der Leine (Ursprung oben) – je tiefer, desto mehr weht sie
  vec3 base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float h = max(0.0, -position.y);
  float gust = 0.55 + 0.45 * sin(uTime * 0.4 + base.x * 0.3);
  transformed.z += (sin(uTime * 2.3 + base.x * 1.7) * 0.22 + sin(uTime * 5.1 + base.x * 2.9) * 0.06) * h * gust * min(uWind, 1.6);
  transformed.x += sin(uTime * 1.4 + base.x) * 0.05 * h;
}
#endif
`;

function patch(material, extraUniforms = {}) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms, extraUniforms);
    if (material.defines?.WIND !== undefined || material.defines?.WIND_HANG !== undefined) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
        .replace('#include <begin_vertex>', WIND_VERTEX);
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DECLARATIONS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${DISCARD}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SNOW}\n${SELF_LIGHT}`);
  };
  return material;
}

/**
 * Beleuchtetes Voxel-Material.
 * @param {{occluder?: boolean, fade?: boolean, map?: THREE.Texture, vertexColors?: boolean, selfLight?: number, wind?: boolean|'hang', snow?: boolean|number}} options
 *   snow: Schneedecke nach dem Frost (M25) – true = voll, eine Zahl = so viel davon (der Boden nur bestäubt)
 */
export function createWorldMaterial(options = {}) {
  const { occluder = false, fade = false, map = null, vertexColors = true, selfLight = 0, wind = false, snow = false } = options;
  const material = new THREE.MeshLambertMaterial({ vertexColors, map });
  material.defines = {};
  if (snow) material.defines.SNOW = ''; // M25: Schneedecke (nur Feststehendes draußen)
  if (occluder) material.defines.OCCLUDER = '';
  if (fade) material.defines.FADE = '';
  if (selfLight > 0) material.defines.SELF_LIGHT = '';
  if (wind === 'hang') material.defines.WIND_HANG = '';
  else if (wind) material.defines.WIND = '';
  const extra = {};
  if (fade) {
    extra.uFade = { value: 0 };
    material.userData.fade = extra.uFade;
  }
  if (selfLight > 0) {
    extra.uSelfLight = { value: selfLight };
    material.userData.selfLight = extra.uSelfLight;
  }
  if (snow) extra.uSnowAmount = { value: snow === true ? 1 : snow };
  return patch(material, extra);
}

/**
 * Selbstleuchtendes Material (Fenster, Flammen, Lampenglas). Die Farbe wird
 * vom Lichtsystem je nach Tageszeit gesetzt.
 */
export function createGlowMaterial(color = 0xffffff, options = {}) {
  const material = new THREE.MeshBasicMaterial({ color, vertexColors: options.vertexColors ?? false });
  material.defines = {};
  if (options.occluder) material.defines.OCCLUDER = '';
  if (options.fade) material.defines.FADE = '';
  const extra = {};
  if (options.fade) {
    extra.uFade = options.fadeUniform || { value: 0 };
    material.userData.fade = extra.uFade;
  }
  // MeshBasicMaterial hat kein vViewPosition – für OCCLUDER nachrüsten.
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms, extra);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vViewPosition;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvViewPosition = -mvPosition.xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vViewPosition;\n${DECLARATIONS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${DISCARD}`);
  };
  material.customProgramCacheKey = () => 'zt-glow';
  return material;
}

/**
 * Umriss hinter Verdeckungen: flache Farbe, gerastert, nur dort, wo etwas
 * davor steht (Tiefentest GREATER, schreibt keine Tiefe). Wird VOR dem
 * eigenen Modell gezeichnet – so verdeckt es sich nicht selbst, und wo es
 * sichtbar ist, übermalt es den Umriss. Reihenfolge (renderOrder): Umrisse
 * der Schlurfer und Türme 1, Türme 1.2, Umriss von Mika 1.75, Schlurfer 1.8,
 * Mika 2 – so scheint Mika durch einen Turm oder Bau vor ihr durch (m3-r2),
 * aber nicht durch Schlurfer: im Getümmel wurde das ein gelbes Knäuel (m16-r1).
 */
export function createSilhouetteMaterial(color, density = 0.5) {
  const material = new THREE.MeshBasicMaterial({ color });
  material.depthFunc = THREE.GreaterDepth;
  material.depthWrite = false;
  const extra = { uDensity: { value: density } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms, extra);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform ivec2 uDitherOffset;\nuniform float uDensity;\n${BAYER_GLSL}`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset) >= uDensity) discard;');
  };
  material.customProgramCacheKey = () => `zt-silhouette-${density}`;
  return material;
}
