// Einrichten (Meilenstein 6): Möbel machen das Zuhause gemütlich. Gekaufte
// Stücke stehen an festen Plätzen in ihren Räumen des Innenraums
// (world/furnitureModels.js, seit Meilenstein 11), die Summe ihrer
// Gemütlichkeit bringt jeden Morgen Erfahrung und – ab 5 – »ausgeschlafen«
// (schneller unterwegs bis Mittag). Seit N4 bestellt Mika sie über das
// Funkgerät aus Balduins Katalog (ui/catalog.js); er bringt sie am nächsten
// Morgen mit dem Boot (`orders`, `deliver`).

import { T } from '../data/texts.js';
import { CAT } from '../data/isles.js';
import { FURNITURE, COZY, coziness, MAX_COZY, ROOM_LEVEL, ORDER_MAX } from '../data/furniture.js';
import { FURNITURE_MODELS } from '../world/furnitureModels.js';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { createGlowMaterial, createWorldMaterial } from '../render/materials.js';
import { LAYOUT } from '../world/layout.js';
import { U, INTERIOR_FLOOR } from '../world/interior.js';
import { pay, canAfford } from './inventory.js';
import { hoursOf } from './state.js';
import { houseCozy } from '../data/buildings.js';
import { ABILITIES } from '../data/wanderers.js';

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
    return coziness(this.owned) + houseCozy(this.game.state.world.houseLevel) + (this.game.state.isles?.cat ? CAT.cozy : 0); // Schlafzimmer (M11), N6: die Katze
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

  /** N4: Bestellungen bei Balduin (unterwegs bis zum nächsten Morgen). */
  get orders() {
    return (this.game.state.world.orders ||= []);
  }

  /** Der Reiter »Einrichten« zeigt seit N4 keine Möbel mehr – die kommen aus Balduins Katalog. */
  options() {
    return [];
  }

  /**
   * N4: Kann Mika dieses Stück bestellen? 'ok' oder der Grund:
   * imHaus · bestellt · raum (Zimmer noch nicht gebaut) · braucht (Knopf fehlt) · voll · teuer
   */
  orderState(id) {
    const def = FURNITURE[id];
    const st = this.game.state;
    if (this.owned.includes(id)) return 'imHaus';
    if (this.orders.some((o) => o.id === id)) return 'bestellt';
    if ((st.world.houseLevel || 1) < ROOM_LEVEL[def.room]) return 'raum';
    if (def.needs && !this.game.survivors.resident(def.needs)) return 'braucht';
    if (this.orders.length >= ORDER_MAX) return 'voll';
    if (!canAfford(st.inventory, def.cost)) return 'teuer';
    return 'ok';
  }

  /** N4: Bestellen – bezahlt wird gleich, Balduin bringt es am nächsten Morgen. */
  order(id) {
    const why = this.orderState(id);
    if (why !== 'ok') {
      this.game.sound.play('klick');
      return why;
    }
    const g = this.game;
    pay(g.state.inventory, FURNITURE[id].cost);
    this.orders.push({ id, day: g.state.time.day });
    g.hud.toast(T.katalog.bestelltToast(T.moebel[id][0]), 'moebel', 3);
    g.sound.play('funk');
    g.quietSave();
    return 'ok';
  }

  /**
   * N4: Balduin legt an – was gestern oder früher bestellt wurde, trägt er hinein.
   * Gibt die gelieferten Stücke zurück (für die Lieferkarte).
   */
  deliver() {
    const g = this.game;
    const day = g.state.time.day;
    const due = this.orders.filter((o) => o.day < day).map((o) => o.id);
    if (!due.length) return [];
    g.state.world.orders = this.orders.filter((o) => o.day >= day);
    for (const id of due) {
      if (this.owned.includes(id)) continue;
      this.owned.push(id);
      this.attach(id);
    }
    g.hud.toast(T.katalog.geliefert(due.map((id) => T.moebel[id][0]).join(', ')), 'moebel', 5);
    g.quietSave();
    return due;
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
    // M29: Hat Anton abends am Feuer gespielt, schlafen alle gemütlicher
    const cozy = this.cozy + Math.floor(ABILITIES.musik.cozy * (g.survivors?.ability('musik') || 0)); // M31: verletzt halb
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
