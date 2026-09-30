// Sprite-Material (F1, recherche/schlurfer-sprites.md 7): ein aufrechter Quad je Figur, im
// Vertex-Shader aus dem Fußpunkt (instanceMatrix) und dem Bild im Atlas gebaut (seit F2 eine
// Array-Textur mit Seiten, Farben über eine Farbtafel, Normale in der Bildebene). Aufrecht
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
attribute float aPage;  // Seite im Atlas (F2)
varying vec2 vTexel;
varying vec4 vTint;
varying float vFlip;
flat varying int vPage;
uniform float uPx;
`;

// Statt <begin_vertex>: der Quad in Weltmetern ab dem Fußpunkt (instanceMatrix trägt ihn und
// die Größe – Champions sind etwas größer; Einrasten und Tiefenversatz gelten ungeschrumpft).
// Drei Zeilen Ecken: unten, auf der Fußlinie, oben (F2). Über der Fußlinie steht das Bild
// aufrecht, darunter liegt es auf dem Boden – was im Bild unter den Füßen liegt (der vordere
// Fuß, Laub, eine hingesunkene Figur), liegt dort wirklich vor ihnen und versinkt nicht im Boden.
const VERTEX_BODY = /* glsl */ `
float spriteScale = length(instanceMatrix[0].xyz);
vec2 corner = position.xy + 0.5;
vec2 texel = vec2(corner.x * aRect.z, corner.y < 0.25 ? 0.0 : corner.y < 0.75 ? aPivot.y : aRect.w);
float flip = aPivot.z;
float pivotX = flip > 0.0 ? aPivot.x : aRect.z - aPivot.x;
vTexel = aRect.xy + vec2(flip > 0.0 ? texel.x : aRect.z - texel.x, texel.y);
vTint = aTint;
vFlip = flip;
vPage = int(aPage + 0.5);
// Texel ab dem Fußpunkt in der Bildebene; aufrecht ist 1 m Höhe im Bild 0,8 m hoch, auf dem
// Boden 1 m Tiefe 0,6 m
vec2 off = vec2(texel.x - pivotX, texel.y - aPivot.y) * ${TEXEL.toFixed(6)};
vec3 transformed = off.y >= 0.0 ? vec3(off.x, off.y / 0.8, 0.0) : vec3(off.x, 0.0, -off.y / 0.6);
// Fußpunkt auf ganze Bildpunkte rasten (die Kamera ist es schon)
vec3 footW = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
vec2 img = vec2(footW.x, dot(footW, vec3(0.0, 0.8, -0.6)));
vec2 snap = floor(img / uPx + 0.5) * uPx - img;
transformed += vec3(snap.x, 0.8 * snap.y, -0.6 * snap.y) / spriteScale;
// Tiefenversatz zur Kamera: das Bild bleibt gleich, der vordere Fuß versinkt nicht im Boden
transformed += vec3(0.0, 0.6, 0.8) * aPivot.w / spriteScale;
`;

const FRAGMENT_DECL = /* glsl */ `
uniform highp sampler2DArray uAtlas;
uniform sampler2D uPalette;
uniform float uNormalAmount;
uniform ivec2 uDitherOffset;
uniform float uNight;
uniform float uSelfLight;
varying vec2 vTexel;
varying vec4 vTint;
varying float vFlip;
flat varying int vPage;
${BAYER_GLSL}
vec3 spriteLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
`;

// Statt <map_fragment>: ein Texel aus dem Atlas (Farbindex, Art, Normale in der Bildebene);
// leer → weg, Ausblenden gerastert. Der Schatten ist ein Schachbrett im Raster der Texel – es
// wandert mit der Figur, statt unter ihr zu krabbeln. vTint.w < 0: Nebelwelle (M22), nur die
// glühenden Augen.
const FRAGMENT_MAP = /* glsl */ `
ivec2 spriteT = ivec2(vTexel);
uvec4 spriteB = uvec4(texelFetch(uAtlas, ivec3(spriteT, vPage), 0) * 255.0 + 0.5);
if (spriteB.g == 0u) discard;
bool spriteShadow = spriteB.g == 1u;
bool spriteGlow = spriteB.g == 3u;
if (vTint.w < -0.5 && !spriteGlow) discard;
if (vTint.w > 0.0 && bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset) < vTint.w) discard;
if (spriteShadow && ((spriteT.x + spriteT.y) & 1) == 0) discard;
vec3 spriteC = spriteShadow ? vec3(0.0) : texelFetch(uPalette, ivec2(int(spriteB.r), 0), 0).rgb;
diffuseColor.rgb = spriteShadow || spriteGlow ? vec3(0.0) : spriteLinear(spriteC) * vTint.rgb;
`;

// Statt <normal_fragment_maps>: die Normale aus der Bildebene zurück in die Welt (beim Spiegeln
// x umgedreht); die dritte Achse zeigt zur Kamera
const FRAGMENT_NORMAL = /* glsl */ `
{
  vec2 nI = vec2(spriteB.ba) / 255.0 * 2.0 - 1.0;
  float nZ = sqrt(max(0.0, 1.0 - dot(nI, nI)));
  vec3 nW = vec3(nI.x * vFlip, 0.8 * nI.y + 0.6 * nZ, -0.6 * nI.y + 0.8 * nZ);
  normal = normalize((viewMatrix * vec4(normalize(mix(vec3(0.0, 0.6, 0.8), nW, uNormalAmount)), 0.0)).xyz);
}
`;

// Nach <emissivemap_fragment>: Glühen und nachts ein Hauch Eigenlicht (wie die Voxel-Horde)
const FRAGMENT_EMISSIVE = /* glsl */ `
if (spriteGlow) totalEmissiveRadiance += spriteLinear(spriteC);
totalEmissiveRadiance += diffuseColor.rgb * uSelfLight * uNight;
`;

/** Beleuchtetes Sprite-Material über dem Atlas. */
export function createSpriteMaterial(atlas, { selfLight = 0.2 } = {}) {
  const material = new THREE.MeshLambertMaterial();
  const extra = {
    uAtlas: atlas.uniform, // wächst der Atlas, zeigt die Uniform auf die neue Textur
    uPalette: { value: atlas.paletteTexture },
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
  const extra = { uAtlas: atlas.uniform, uDensity: { value: density } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms, spriteUniforms, extra);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_DECL}`)
      .replace('#include <begin_vertex>', VERTEX_BODY);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform highp sampler2DArray uAtlas;\nuniform ivec2 uDitherOffset;\nuniform float uDensity;\nvarying vec2 vTexel;\nvarying vec4 vTint;\nvarying float vFlip;\nflat varying int vPage;\n${BAYER_GLSL}`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
float spriteG = texelFetch(uAtlas, ivec3(ivec2(vTexel), vPage), 0).g * 255.0;
if (spriteG < 1.5 || vTint.w < -0.5) discard; // leer, Schatten oder im Nebel verborgen
if (bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset) >= uDensity) discard;`
      );
  };
  material.customProgramCacheKey = () => `zt-sprite-silhouette-${density}`;
  return material;
}
