// Nebenaufträge (M23, DESIGN 8): Morgens bittet jemand um etwas – Hilde um ihr
// Garn aus dem Wrack, Juna um Antennenteile an den Wegen, Bert um seinen
// Werkzeugkasten, Dr. Yusuf um Proben von Champions, Balduin um einen
// Moderkern und Zombieteile. Immer nur ein Auftrag auf einmal; Fundstücke
// liegen an festen Stellen (aus dem Startwert der Karte), funkeln und werden
// mit E aufgesammelt. Belohnung: Baupläne und Turmteile (data/quests.js).

import * as THREE from 'three';
import { T } from '../data/texts.js';
import { QUESTS, QUEST_ORDER, QUEST_ITEM_MIN_X } from '../data/quests.js';
import { partsOfRarity, TOWER_PARTS } from '../data/towers.js';
import { canAfford } from './inventory.js';
import { Rng } from './rng.js';
import { LAYOUT } from '../world/layout.js';
import { pathNodes } from '../world/resources.js';
import { FINE32 } from '../world/voxelKit.js';
import { QUEST_ITEM_MODELS, questGlintModel } from '../world/questModels.js';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { createWorldMaterial } from '../render/materials.js';

const GLINT_EVERY = 1.4; // Sekunden zwischen zwei Funkeln
const GLINT_TIME = 0.26;
const PICK_RADIUS = 1.3;

/** Symbol für die Person, die bittet (Balduin: sein Boot). */
export function questIcon(from) {
  return from === 'balduin' ? 'boot' : from;
}

const snap8 = (v) => Math.round(v * 8) / 8;

/**
 * Feste Fundstellen neben den Wegen, reihum über die Wege verteilt, weit genug
 * weg von der Bucht (`QUEST_ITEM_MIN_X`), auf dem offenen Streifen neben dem Weg
 * und nicht auf einer Quelle.
 * @param {import('../world/map.js').GameMap} map
 */
export function questSpots(map, id, count) {
  let salt = 0;
  for (const ch of id) salt = (salt * 31 + ch.charCodeAt(0)) >>> 0;
  const rng = new Rng((map.seed * 977 + salt) >>> 0);
  const nodes = pathNodes(map);
  const paths = map.paths.filter((p) => p.points.some((q) => q.x <= QUEST_ITEM_MIN_X));
  const out = [];
  for (let tries = 0; out.length < count && tries < 400 && paths.length; tries++) {
    const path = paths[(out.length + tries) % paths.length];
    const pts = path.points;
    const k = rng.int(2, pts.length - 3);
    const a = pts[k];
    const b = pts[k + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const off = path.width / 2 + rng.range(1.1, 2.1);
    const side = rng.chance(0.5) ? 1 : -1;
    const x = snap8(a.x - ((b.z - a.z) / len) * off * side);
    const z = snap8(a.z + ((b.x - a.x) / len) * off * side);
    if (x > QUEST_ITEM_MIN_X) continue;
    if (map.edgeDistance(x, z) > -0.8 || map.pathDistance(x, z) < 1.0 || map.inBay(x, z, -2)) continue;
    if (nodes.some((n) => (n.x - x) ** 2 + (n.z - z) ** 2 < 2.6)) continue;
    if (out.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 64)) continue;
    out.push({ x, z });
  }
  return out;
}

export class Quests {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'Fundstücke';
    game.scene.add(this.group);
    this.material = createWorldMaterial({ selfLight: 0.55 }); // glimmen nachts ein wenig wie die Beute
    this.glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.glintGeometry = questGlintModel().toGeometry({ jitter: 0, ao: false, size: 1 / 16 });
    this.items = []; // { index, x, z, object, glint, phase }
    this.interactions = [];
    this.time = 0;
  }

  get st() {
    return this.game.state.quests;
  }

  /** Nach dem Laden oder einem neuen Spiel: fällig? anbieten; Fundstücke hinlegen. */
  apply() {
    if (!this.st.active) {
      const line = this.offer();
      if (line) this.game.hud.toast(line, questIcon(QUESTS[this.st.active.id].from), 5);
    }
    this.placeItems();
  }

  /** Der nächste Auftrag, der heute dran ist: Tag erreicht, die Person wohnt hier. */
  due() {
    const g = this.game;
    for (const id of QUEST_ORDER) {
      if (this.st.done.includes(id)) continue;
      const q = QUESTS[id];
      if (g.state.time.day < q.day) continue;
      if (q.from !== 'balduin' && !g.survivors.resident(q.from)) continue;
      return id;
    }
    return null;
  }

  /** Morgens (oder nach dem Laden): einen neuen Auftrag annehmen. Gibt die Bitte zurück. */
  offer() {
    if (this.st.active) return null;
    const id = this.due();
    if (!id) return null;
    this.st.active = { id, got: [], n: 0 };
    this.placeItems();
    return T.nebenauftraege[id].bitte;
  }

  /** Wo die Fundstücke des laufenden Auftrags liegen (auch schon aufgesammelte). */
  spots() {
    const a = this.st.active;
    const q = a && QUESTS[a.id];
    if (!q || q.kind !== 'fund') return [];
    if (q.where === 'wrack') return [this.wreckSpot()];
    return questSpots(this.game.world.map, a.id, q.count);
  }

  /** Neben dem Bootswrack am Strand: die erste freie Stelle. */
  wreckSpot() {
    const w = LAYOUT.wreck;
    const map = this.game.world.map;
    const colliders = this.game.world.colliders;
    for (const [dx, dz] of [[-1.5, 0.5], [1.5, 0.5], [0, 1.5], [-1.5, -0.75], [1.5, -0.75], [0, -1.5]]) {
      const x = snap8(w.x + dx);
      const z = snap8(w.z + dz);
      if (map.walkableRaw(x, z) && !colliders.blocks(x, z, 0.3)) return { x, z };
    }
    return { x: snap8(w.x - 1.5), z: snap8(w.z + 0.5) };
  }

  clearItems() {
    for (const it of this.items) {
      this.group.remove(it.object);
      this.group.remove(it.glint);
      it.object.traverse((o) => o.geometry?.dispose());
    }
    this.items = [];
  }

  /** Fundstücke hinlegen, die noch nicht aufgesammelt sind. */
  placeItems() {
    this.clearItems();
    const a = this.st.active;
    const q = a && QUESTS[a.id];
    if (q?.kind === 'fund') {
      const build = QUEST_ITEM_MODELS[q.item];
      this.spots().forEach((p, index) => {
        if (a.got.includes(index)) return;
        const object = createStaticVoxelObject(build(), this.material, { turns: index % 4, seed: 7 + index, shadow: 'coarse4', size: FINE32 });
        const y = this.game.world.heightAt(p.x, p.z);
        object.position.set(p.x, y, p.z);
        const glint = new THREE.Mesh(this.glintGeometry, this.glowMaterial);
        glint.position.set(p.x + 0.12, y + 0.62, p.z);
        glint.visible = false;
        this.group.add(object, glint);
        this.items.push({ index, x: p.x, z: p.z, object, glint, phase: index * 0.53 });
      });
    }
    this.refresh();
  }

  /** Einblendungen (E: Aufsammeln) an die Welt geben. */
  refresh() {
    // Vorrang vor Wrack, Quellen und Bauten ringsum: Man sucht es ja
    this.interactions = this.items.map((it) => ({ id: `fund-${it.index}`, x: it.x, z: it.z, radius: PICK_RADIUS, prompt: 'aufsammeln', questItem: it.index, priority: true, enabled: true }));
    this.game.world.questInteractions = this.interactions;
    this.game.world.refreshInteractions();
  }

  update(dt) {
    this.time += dt;
    for (const it of this.items) {
      const phase = (this.time + it.phase) % GLINT_EVERY;
      it.glint.visible = phase < GLINT_TIME;
      if (it.glint.visible) {
        const s = Math.max(0.2, Math.sin((phase / GLINT_TIME) * Math.PI));
        it.glint.scale.set(s, s, 1);
      }
    }
  }

  /** E an einem Fundstück. */
  pick(index) {
    const g = this.game;
    const a = this.st.active;
    const it = this.items.find((o) => o.index === index);
    if (!a || !it) return false;
    const q = QUESTS[a.id];
    a.got.push(index);
    this.group.remove(it.object, it.glint);
    it.object.traverse((o) => o.geometry?.dispose());
    this.items = this.items.filter((o) => o !== it);
    g.sound.play('aufheben');
    g.effects.splat(it.x, 0.4, it.z, 'licht', 10, 0.7);
    g.player.express('froh', 1.2);
    const left = q.count - a.got.length;
    if (left > 0) g.hud.toast(`${T.nebenauftraege[a.id].gefunden} ${T.nebenauftraege.noch(left)}`, q.item, 3.2);
    else {
      g.hud.toast(T.nebenauftraege[a.id].gefunden, q.item, 3);
      this.complete();
    }
    this.refresh();
    g.quietSave();
    return true;
  }

  /** Ein Champion ist gefallen (Proben für Dr. Yusuf). */
  onChampion() {
    const a = this.st.active;
    const q = a && QUESTS[a.id];
    if (q?.kind !== 'champion') return;
    a.n += 1;
    if (a.n >= q.count) this.complete();
    else this.game.hud.toast(`${T.nebenauftraege[a.id].gefunden} ${T.nebenauftraege.noch(q.count - a.n)}`, 'champion', 3);
  }

  /** Zeile im Handelsfenster, solange Balduins Bitte läuft (M23). */
  tradeRow() {
    const a = this.st.active;
    const q = a && QUESTS[a.id];
    if (q?.kind !== 'bring') return null;
    const [name, info] = T.nebenauftraege[a.id].zeile;
    return { id: `bitte-${a.id}`, key: `bitte-${a.id}`, icon: 'moderkerne', name, info, cost: q.give, gives: { quest: a.id }, affordable: canAfford(this.game.state.inventory, q.give) };
  }

  /** Auftrag erfüllt: Dank und Belohnung (Turmteil einer Seltenheit, Bauplan zur Wahl). */
  complete() {
    const g = this.game;
    const st = g.state;
    const a = this.st.active;
    if (!a) return;
    const q = QUESTS[a.id];
    this.st.done.push(a.id);
    this.st.active = null;
    this.clearItems();
    this.refresh();
    g.hud.toast(T.nebenauftraege[a.id].dank, questIcon(q.from), 5);
    if (q.reward.rarity) {
      const id = g.loot.rng.pick(partsOfRarity(q.reward.rarity));
      g.gainPart(id);
      g.hud.toast(T.nebenauftraege.teil(T.turmteile[id][0], T.turmteile.seltenheit[TOWER_PARTS[id].rarity]), id, 4.5);
    }
    if (q.reward.blueprint && g.offerBlueprint('auftrag')) g.hud.toast(T.bauplaene.wartet, 'bauplan', 3, 'chronik');
    g.sound.play('stufe');
    st.stats.quests = (st.stats.quests || 0) + 1;
    g.quietSave();
  }

  /** Zweite Zeile im Zielkasten: der laufende Auftrag. */
  goal() {
    const a = this.st.active;
    const q = a && QUESTS[a.id];
    if (!q) return null;
    let progress = null;
    if (q.kind === 'fund' && q.count > 1) progress = `(${a.got.length}/${q.count})`;
    else if (q.kind === 'champion') progress = `(${a.n}/${q.count})`;
    else if (q.kind === 'bring') {
      const have = this.game.state.inventory.teile || 0;
      progress = `(${Math.min(have, q.give.teile)}/${q.give.teile})`;
    }
    return { icon: questIcon(q.from), text: T.nebenauftraege[a.id].ziel, progress };
  }

  /** Für die Prüfung und die Übersichtskarte: wo noch etwas liegt. */
  view() {
    const a = this.st.active;
    return { active: a ? { ...a, got: [...a.got] } : null, done: [...this.st.done], items: this.items.map((it) => ({ index: it.index, x: it.x, z: it.z })) };
  }
}
