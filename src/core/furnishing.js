// Einrichten (Meilenstein 6): Möbel machen das Zuhause gemütlich. Gekaufte
// Stücke stehen an festen Plätzen im Wohnraum des Innenraums
// (world/furnitureModels.js, seit Meilenstein 11), die Summe ihrer
// Gemütlichkeit bringt jeden Morgen Erfahrung und – ab 5 – »ausgeschlafen«
// (schneller unterwegs bis Mittag). Die Bauleiste bietet immer das nächste
// fehlende Stück an (Reiter »Einrichten«).

import { T } from '../data/texts.js';
import { FURNITURE, FURNITURE_ORDER, COZY, coziness, MAX_COZY } from '../data/furniture.js';
import { FURNITURE_MODELS } from '../world/furnitureModels.js';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { createGlowMaterial, createWorldMaterial } from '../render/materials.js';
import { LAYOUT } from '../world/layout.js';
import { U, INTERIOR_FLOOR } from '../world/interior.js';
import { pay } from './inventory.js';
import { hoursOf } from './state.js';
import { houseCozy } from '../data/buildings.js';

export class Furnishing {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.objects = new Map(); // id -> { object, collider }
    this.material = createWorldMaterial();
    this.glow = createGlowMaterial(0xffffff);
    game.world.lights.addGlow(this.glow, { dim: 0x7a6a58, bright: 0xffc86a, boost: 1.15, mode: 'lamp' });
  }

  get owned() {
    return this.game.state.world.furniture;
  }

  get cozy() {
    return coziness(this.owned) + houseCozy(this.game.state.world.houseLevel); // Schlafzimmer (M11)
  }

  /** Nach dem Laden: alles Gekaufte aufstellen. */
  apply() {
    for (const id of [...this.objects.keys()]) this.detach(id);
    for (const id of this.owned) this.attach(id);
  }

  attach(id) {
    const g = this.game;
    const spec = FURNITURE_MODELS[id]?.();
    if (!spec || this.objects.has(id)) return;
    // Im feinen Maß, mit Schatten (die Sonne fällt durch die Fenster herein)
    const object = createStaticVoxelObject(spec.model, this.material, { seed: 5, size: U, jitter: 0.04 });
    if (spec.glow) object.add(createStaticVoxelObject(spec.glow, this.glow, { shadow: 'none', jitter: 0, size: U }));
    const { x: ox, z: oz } = LAYOUT.interior;
    object.position.set(ox, -INTERIOR_FLOOR * U, oz);
    const c = spec.collider;
    const collider = c ? g.world.colliders.addBox(ox + c.x0 * U, oz + c.z0 * U, ox + c.x1 * U, oz + c.z1 * U, 'moebel') : null;
    g.scene.add(object);
    this.objects.set(id, { object, collider });
  }

  detach(id) {
    const entry = this.objects.get(id);
    if (!entry) return;
    this.game.scene.remove(entry.object);
    entry.object.traverse((o) => o.geometry?.dispose());
    if (entry.collider) this.game.world.colliders.remove(entry.collider);
    this.objects.delete(id);
  }

  /** Nächstes fehlendes Stück in der Reihenfolge (oder null). */
  nextPiece() {
    return FURNITURE_ORDER.find((id) => !this.owned.includes(id)) || null;
  }

  /** Optionen für den Reiter »Einrichten«. */
  options() {
    const out = [];
    const next = this.nextPiece();
    if (next) {
      out.push({ id: `moebel-${next}`, icon: 'moebel', name: T.moebel[next][0], info: `${T.moebel[next][1]} ${T.moebel.gemuetlich(FURNITURE[next].cozy)}`, cost: FURNITURE[next].cost, action: () => this.buy(next) });
    } else {
      out.push({ id: 'moebel-fertig', icon: 'moebel', name: T.moebel.alles, info: T.moebel.allesInfo, cost: {}, disabled: true, disabledText: T.moebel.alles });
    }
    const knopf = this.game.survivors.resident('knopf');
    if (knopf && !this.owned.includes('koerbchen')) {
      out.push({ id: 'moebel-koerbchen', icon: 'koerbchen', name: T.moebel.koerbchen[0], info: `${T.moebel.koerbchen[1]} ${T.moebel.gemuetlich(1)}`, cost: FURNITURE.koerbchen.cost, action: () => this.buy('koerbchen') });
    }
    return out;
  }

  buy(id) {
    const g = this.game;
    const st = g.state;
    if (this.owned.includes(id) || !pay(st.inventory, FURNITURE[id].cost)) return;
    this.owned.push(id);
    this.attach(id);
    g.hud.toast(T.moebel.aufgestellt(T.moebel[id][0], this.cozy, MAX_COZY), id === 'koerbchen' ? 'koerbchen' : 'moebel', 3);
    g.sound.play('bau');
    g.quietSave();
  }

  /**
   * Morgen: Erfahrung je Gemütlichkeit, ab COZY.rested ausgeschlafen.
   * @returns {Array<{text:string}>} Zeilen für den Morgenbericht
   */
  morning() {
    const g = this.game;
    const st = g.state;
    const cozy = this.cozy;
    if (cozy <= 0) return [];
    g.combat.gainXp(cozy);
    const rested = cozy >= COZY.rested;
    if (rested) st.player.rested = st.time.day;
    return [{ text: rested ? T.moebel.morgenAusgeschlafen(cozy) : T.moebel.morgen(cozy) }];
  }

  /** Ausgeschlafen: schneller unterwegs bis Mittag. */
  speedFactor() {
    const st = this.game.state;
    return st.player.rested === st.time.day && hoursOf(st.time.minute) < COZY.restedUntilHour ? COZY.restedSpeed : 1;
  }
}
