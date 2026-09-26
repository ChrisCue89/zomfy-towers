// Materialien der Welt. Alle beleuchteten Flächen sind Lambert mit Vertexfarben.
// Zusätze per onBeforeCompile:
//  - OCCLUDER: gerasterte Durchsicht rund um die Spielfigur, wenn das Objekt davor steht.
//  - FADE:     gerastertes Ausblenden (Dach und Vorderwand beim Betreten des Hauses).
// Beides arbeitet mit discard, damit Tiefenpuffer und Umrisse stimmen.

import * as THREE from 'three';
import { BAYER_GLSL } from './shaders.js';

/** Gemeinsame Uniforms, jedes Bild vom Spiel aktualisiert. */
export const sharedUniforms = {
  uDitherOffset: { value: new THREE.Vector2() },
  uCutCenter: { value: new THREE.Vector2(-1e4, -1e4) },
  uCutRadius: { value: new THREE.Vector2(26, 40) },
  uCutDepth: { value: 0 },
  uCutStrength: { value: 0 },
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
${BAYER_GLSL}
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
    float cutAmount = uCutStrength * smoothstep(1.0, 0.55, cutDist) * 0.8;
    if (ditherThreshold < cutAmount) discard;
  }
  #endif
}
`;

function patch(material, extraUniforms = {}) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms, extraUniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DECLARATIONS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${DISCARD}`);
  };
  return material;
}

/**
 * Beleuchtetes Voxel-Material.
 * @param {{occluder?: boolean, fade?: boolean, map?: THREE.Texture, vertexColors?: boolean}} options
 */
export function createWorldMaterial(options = {}) {
  const { occluder = false, fade = false, map = null, vertexColors = true } = options;
  const material = new THREE.MeshLambertMaterial({ vertexColors, map });
  material.defines = {};
  if (occluder) material.defines.OCCLUDER = '';
  if (fade) material.defines.FADE = '';
  const extra = {};
  if (fade) {
    extra.uFade = { value: 0 };
    material.userData.fade = extra.uFade;
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
