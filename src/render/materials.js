// Materialien der Welt. Alle beleuchteten Flächen sind Lambert mit Vertexfarben.
// Zusätze per onBeforeCompile:
//  - OCCLUDER: gerasterte Durchsicht rund um die Spielfigur, wenn das Objekt davor steht.
//  - FADE:     gerastertes Ausblenden (Dach und Vorderwand beim Betreten des Hauses).
// Beides arbeitet mit discard, damit Tiefenpuffer und Umrisse stimmen.
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
${BAYER_GLSL}
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
  transformed.x += (sin(uTime * 1.7 + base.x * 0.9 + base.z * 0.6) * 0.1 + sin(uTime * 3.3 + base.z * 1.3) * 0.035) * h * gust;
}
#endif
`;

function patch(material, extraUniforms = {}) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms, extraUniforms);
    if (material.defines?.WIND !== undefined) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', WIND_VERTEX);
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DECLARATIONS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${DISCARD}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SELF_LIGHT}`);
  };
  return material;
}

/**
 * Beleuchtetes Voxel-Material.
 * @param {{occluder?: boolean, fade?: boolean, map?: THREE.Texture, vertexColors?: boolean, selfLight?: number, wind?: boolean}} options
 */
export function createWorldMaterial(options = {}) {
  const { occluder = false, fade = false, map = null, vertexColors = true, selfLight = 0, wind = false } = options;
  const material = new THREE.MeshLambertMaterial({ vertexColors, map });
  material.defines = {};
  if (occluder) material.defines.OCCLUDER = '';
  if (fade) material.defines.FADE = '';
  if (selfLight > 0) material.defines.SELF_LIGHT = '';
  if (wind) material.defines.WIND = '';
  const extra = {};
  if (fade) {
    extra.uFade = { value: 0 };
    material.userData.fade = extra.uFade;
  }
  if (selfLight > 0) {
    extra.uSelfLight = { value: selfLight };
    material.userData.selfLight = extra.uSelfLight;
  }
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
 * davor steht (Tiefentest GREATER, schreibt keine Tiefe). Wird VOR der Figur
 * gezeichnet (renderOrder 1, Figur 2) – so verdeckt sie sich nicht selbst,
 * und wo sie sichtbar ist, übermalt sie den Umriss.
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
