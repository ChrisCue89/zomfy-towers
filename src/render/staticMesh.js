// Statische Voxel-Objekte, optimiert für die feste Kamera:
// - Darstellung nur mit Flächen, die die Kamera sehen kann (oben, Süden),
//   Drehung in die Geometrie eingebacken.
// - Schatten über einen Stellvertreter auf SHADOW_LAYER (alle Flächen, auf
//   Wunsch vergröbert). Die Hauptkamera sieht diese Ebene nie; der
//   Schattenpass im PixelRenderer schon.

import * as THREE from 'three';

export const SHADOW_LAYER = 1;

/** Wird nie sichtbar gezeichnet – nur für den Schattenpass. */
export const SHADOW_PROXY_MATERIAL = new THREE.MeshBasicMaterial({ color: 0x000000 });

const V = 1 / 8;

/**
 * @param {import('./voxel.js').VoxelModel} model
 * @param {THREE.Material} material
 * @param {object} [options]
 * @param {number} [options.turns] 90°-Drehungen um y
 * @param {'full'|'coarse'|'none'} [options.shadow]
 * @param {number} [options.jitter]
 * @param {number} [options.seed]
 * @param {boolean} [options.skipBottom]
 */
export function createStaticVoxelObject(model, material, options = {}) {
  const { turns = 0, shadow = 'full', jitter = 0.05, seed = 7 } = options;
  const rotated = turns ? model.rotated(turns) : model;
  const group = new THREE.Group();
  const visual = new THREE.Mesh(rotated.toGeometry({ jitter, seed, visibleOnly: true }), material);
  visual.castShadow = false;
  visual.receiveShadow = true;
  group.add(visual);
  if (shadow !== 'none') {
    const proxy = new THREE.Mesh(shadowGeometry(rotated, shadow), SHADOW_PROXY_MATERIAL);
    proxy.castShadow = true;
    proxy.receiveShadow = false;
    proxy.layers.set(SHADOW_LAYER);
    group.add(proxy);
  }
  group.userData.visual = visual;
  return group;
}

/** Geometrie für einen Schatten-Stellvertreter. */
export function shadowGeometry(model, mode = 'full') {
  if (mode === 'coarse') return model.downsampled(2, 2).toGeometry({ size: V * 2, jitter: 0, ao: false });
  return model.toGeometry({ jitter: 0, ao: false });
}
