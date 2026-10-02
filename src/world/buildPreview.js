// Bauvorschau in der Szene: ein gerastert halbdurchsichtiges „Geistermodell“
// am Zielort und darunter getönte Felder (grün = passt, rot = geht nicht,
// gold = ausgewählt). Die scharfen Umrisse und Rastermarken zeichnet der
// Builder auf der Oberfläche (drawOverlay).

import * as THREE from 'three';
import { createWorldMaterial } from '../render/materials.js';
import { footprint } from '../data/buildings.js';

const COLOR_OK = new THREE.Color(0x6cc06a);
const COLOR_BAD = new THREE.Color(0xd8483a);
const COLOR_SELECT = new THREE.Color(0xfac665);
const GHOST_OK = 0xeaffe4;
const GHOST_BAD = 0xff9080;
const GLOW_OK = 0x24361c;
const GLOW_BAD = 0x3a1008;

export class BuildPreview {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./buildings.js').Buildings} buildings
   * @param {import('./grid.js').BuildGrid} grid
   */
  constructor(scene, buildings, grid) {
    this.buildings = buildings;
    this.grid = grid;
    this.group = new THREE.Group();
    this.group.name = 'Bauvorschau';
    scene.add(this.group);

    const plane = new THREE.PlaneGeometry(0.88, 0.88).rotateX(-Math.PI / 2);
    this.cells = new THREE.InstancedMesh(plane, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false }), 32);
    this.cells.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(32 * 3), 3);
    this.cells.frustumCulled = false;
    this.cells.renderOrder = 3;
    this.group.add(this.cells);

    // Geister: beleuchtet, gerastert zu gut der Hälfte ausgeblendet, eingefärbt
    this.ghostMaterial = createWorldMaterial({ fade: true, selfLight: 0.9 }); // nachts nicht nur ein Rahmen
    this.ghostMaterial.userData.fade.value = 0.35;
    this.ghosts = new Map();
    this.ghost = null;
    this._m = new THREE.Matrix4();
    this.hide();
  }

  hide() {
    this.group.visible = false;
  }

  ghostFor(type, turns) {
    const key = `${type}|${turns}`;
    if (!this.ghosts.has(key)) {
      const object = this.buildings.object(type, turns, { material: this.ghostMaterial, glowMaterial: this.ghostMaterial, shadow: 'none' });
      object.visible = false;
      this.group.add(object);
      this.ghosts.set(key, object);
    }
    return this.ghosts.get(key);
  }

  /** Platzierungsvorschau zeigen. */
  showPlacement(type, turns, i, j, ok) {
    const { w, d } = footprint(type, turns);
    const ghost = this.ghostFor(type, turns);
    if (this.ghost && this.ghost !== ghost) this.ghost.visible = false;
    this.ghost = ghost;
    ghost.visible = true;
    ghost.position.set(i + w / 2, 0, j + d / 2);
    this.ghostMaterial.color.set(ok ? GHOST_OK : GHOST_BAD);
    this.ghostMaterial.emissive.set(ok ? GLOW_OK : GLOW_BAD);

    let n = 0;
    for (let dj = 0; dj < d; dj++) {
      for (let di = 0; di < w; di++) {
        const free = this.grid.isFree(i + di, j + dj);
        this._m.makeTranslation(i + di + 0.5, 0.03, j + dj + 0.5);
        this.cells.setMatrixAt(n, this._m);
        this.cells.setColorAt(n, ok && free ? COLOR_OK : COLOR_BAD);
        n++;
      }
    }
    this.finishCells(n);
    this.group.visible = true;
  }

  /** Ausgewählten Bau markieren. */
  showSelection(building) {
    if (this.ghost) this.ghost.visible = false;
    const { i, j, w, d } = this.buildings.bounds(building);
    let n = 0;
    for (let dj = 0; dj < d; dj++) {
      for (let di = 0; di < w; di++) {
        this._m.makeTranslation(i + di + 0.5, 0.03, j + dj + 0.5);
        this.cells.setMatrixAt(n, this._m);
        this.cells.setColorAt(n, COLOR_SELECT);
        n++;
      }
    }
    this.finishCells(n);
    this.group.visible = true;
  }

  finishCells(n) {
    this.cells.count = n;
    this.cells.instanceMatrix.needsUpdate = true;
    this.cells.instanceColor.needsUpdate = true;
  }
}
