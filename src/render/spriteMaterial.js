// Sprite-Material (F1, recherche/schlurfer-sprites.md 7): ein aufrechter Quad je Figur, im
// Vertex-Shader aus dem Fußpunkt (instanceMatrix) und dem Bild im Atlas gebaut. Aufrecht
// statt zur Kamera gekippt – im Bild genau gleich, aber mit der Tiefe einer stehenden Figur.
// Der Fußpunkt rastet auf ganze Bildpunkte, Texel sind dann 2 × 2 Pixel groß.
// Licht wie bei den Voxeln (Lambert, dieselben Lampen), die Normale kommt aus dem Atlas;
// Glühtexel leuchten selbst, Schattentexel sind gerastert dunkel. Nur `discard`, kein
// Blending – Tiefenpuffer und Umrisse stimmen.

import * as THREE from 'three';
import { sharedUniforms } from './materials.js';
import { BAYER_GLSL } from './shaders.js';
import { TEXEL } from './spriteBaker.js';

/** Gemeinsame Uniforms der Sprite-Materialien (px vom Spiel: Meter je Bildpunkt). */
export const spriteUniforms = {
  uPx: { value: 1 / 80 },
  uNormalAmount: { value: 0.75 }, // 0: flach wie gemalt, 1: volle Normale
};

const VERTEX_DECL = /* glsl */ `
attribute vec4 aRect;   // Bild im Atlas: x, y, w, h (Texel, y von unten)
attribute vec4 aPivot;  // Fußpunkt im Bild (Texel), Spiegeln (1 oder -1), Tiefenversatz (m)
attribute vec4 aTint;   // Tönung (rgb) und gerastertes Ausblenden (w)
varying vec2 vTexel;
varying vec4 vTint;
varying float vFlip;
uniform float uPx;
`;

// Statt <begin_vertex>: der Quad in Weltmetern ab dem Fußpunkt (instanceMatrix trägt ihn und
// die Größe – Champions sind etwas größer; Einrasten und Tiefenversatz gelten ungeschrumpft)
const VERTEX_BODY = /* glsl */ `
float spriteScale = length(instanceMatrix[0].xyz);
vec2 corner = position.xy + 0.5;
vec2 texel = corner * aRect.zw;
float flip = aPivot.z;
float pivotX = flip > 0.0 ? aPivot.x : aRect.z - aPivot.x;
vTexel = aRect.xy + vec2(flip > 0.0 ? texel.x : aRect.z - texel.x, texel.y);
vTint = aTint;
vFlip = flip;
// Texel ab dem Fußpunkt in der Bildebene; aufrecht ist 1 m Höhe im Bild 0,8 m hoch
vec2 off = vec2(texel.x - pivotX, texel.y - aPivot.y) * ${TEXEL.toFixed(6)};
vec3 transformed = vec3(off.x, off.y / 0.8, 0.0);
// Fußpunkt auf ganze Bildpunkte rasten (die Kamera ist es schon)
vec3 footW = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
vec2 img = vec2(footW.x, dot(footW, vec3(0.0, 0.8, -0.6)));
vec2 snap = floor(img / uPx + 0.5) * uPx - img;
transformed += vec3(snap.x, 0.8 * snap.y, -0.6 * snap.y) / spriteScale;
// Tiefenversatz zur Kamera: das Bild bleibt gleich, der vordere Fuß versinkt nicht im Boden
transformed += vec3(0.0, 0.6, 0.8) * aPivot.w / spriteScale;
`;

const FRAGMENT_DECL = /* glsl */ `
uniform sampler2D uAtlas;
uniform sampler2D uAtlasN;
uniform float uNormalAmount;
uniform ivec2 uDitherOffset;
uniform float uNight;
uniform float uSelfLight;
varying vec2 vTexel;
varying vec4 vTint;
varying float vFlip;
${BAYER_GLSL}
vec3 spriteLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
`;

// Statt <map_fragment>: Farbe aus dem Atlas; leer → weg, Ausblenden gerastert. Der Schatten ist
// ein Schachbrett im Raster der Texel – es wandert mit der Figur, statt unter ihr zu krabbeln.
// vTint.w < 0: Nebelwelle (M22), nur die glühenden Augen.
const FRAGMENT_MAP = /* glsl */ `
ivec2 spriteT = ivec2(vTexel);
vec4 spriteC = texelFetch(uAtlas, spriteT, 0);
if (spriteC.a < 0.1) discard;
bool spriteShadow = spriteC.a < 0.35;
bool spriteGlow = !spriteShadow && spriteC.a < 0.75;
if (vTint.w < -0.5 && !spriteGlow) discard;
if (vTint.w > 0.0 && bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset) < vTint.w) discard;
if (spriteShadow && ((spriteT.x + spriteT.y) & 1) == 0) discard;
diffuseColor.rgb = spriteShadow || spriteGlow ? vec3(0.0) : spriteLinear(spriteC.rgb) * vTint.rgb;
`;

// Statt <normal_fragment_maps>: die Weltnormale aus dem Atlas (beim Spiegeln x umgedreht)
const FRAGMENT_NORMAL = /* glsl */ `
{
  vec3 nW = texelFetch(uAtlasN, ivec2(vTexel), 0).xyz * 2.0 - 1.0;
  nW.x *= vFlip;
  normal = normalize((viewMatrix * vec4(normalize(mix(vec3(0.0, 0.6, 0.8), nW, uNormalAmount)), 0.0)).xyz);
}
`;

// Nach <emissivemap_fragment>: Glühen und nachts ein Hauch Eigenlicht (wie die Voxel-Horde)
const FRAGMENT_EMISSIVE = /* glsl */ `
if (spriteGlow) totalEmissiveRadiance += spriteLinear(spriteC.rgb);
totalEmissiveRadiance += diffuseColor.rgb * uSelfLight * uNight;
`;

/** Beleuchtetes Sprite-Material über dem Atlas. */
export function createSpriteMaterial(atlas, { selfLight = 0.2 } = {}) {
  const material = new THREE.MeshLambertMaterial();
  const extra = {
    uAtlas: { value: atlas.colorTexture },
    uAtlasN: { value: atlas.normalTexture },
    uSelfLight: { value: selfLight },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms, spriteUniforms, extra);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_DECL}`)
      .replace('#include <begin_vertex>', VERTEX_BODY);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_DECL}`)
      .replace('#include <map_fragment>', FRAGMENT_MAP)
      .replace('#include <normal_fragment_maps>', FRAGMENT_NORMAL)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${FRAGMENT_EMISSIVE}`);
  };
  material.customProgramCacheKey = () => 'zt-sprite';
  return material;
}

/**
 * Umriss hinter Verdeckungen (wie createSilhouetteMaterial): flache Farbe, gerastert, nur wo
 * etwas davor steht – mit der Form des Sprites statt eines groben Nachbaus.
 */
export function createSpriteSilhouetteMaterial(atlas, color, density = 0.38) {
  const material = new THREE.MeshBasicMaterial({ color });
  material.depthFunc = THREE.GreaterDepth;
  material.depthWrite = false;
  const extra = { uAtlas: { value: atlas.colorTexture }, uDensity: { value: density } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms, spriteUniforms, extra);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_DECL}`)
      .replace('#include <begin_vertex>', VERTEX_BODY);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform sampler2D uAtlas;\nuniform ivec2 uDitherOffset;\nuniform float uDensity;\nvarying vec2 vTexel;\nvarying vec4 vTint;\nvarying float vFlip;\n${BAYER_GLSL}`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
vec4 spriteC = texelFetch(uAtlas, ivec2(vTexel), 0);
if (spriteC.a < 0.35 || vTint.w < -0.5) discard; // leer, Schatten oder im Nebel verborgen
if (bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset) >= uDensity) discard;`
      );
  };
  material.customProgramCacheKey = () => `zt-sprite-silhouette-${density}`;
  return material;
}
