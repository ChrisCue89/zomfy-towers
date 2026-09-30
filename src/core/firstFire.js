// Das erste Feuer (N10, Rückmeldung 30.09.: »Bei der Ankunft ist das Feuer am laufen. Das
// könnte eine erste Quest sein das Feuer zu machen. Dafür brauchen wir vielleicht etwas aus
// dem Haus«). Drei Herbste stand die Holzlände leer: In einem neuen Spiel mit Ankunft sind
// Feuerstelle und Kamin kalt (Flags `feuerKalt`, `kaminKalt` – alte Stände brennen weiter).
// Mika holt die Blechdose mit den Streichhölzern vom Kaminsims (`streichhoelzer`), zündet den
// Kamin an und dann draußen das Lagerfeuer (zwei Scheite). Edda sieht den Rauch.
// Ziele in data/goals.js, Werte in data/arrival.js (FIRST_FIRE), Texte in T.feuer.

import { FIRST_FIRE } from '../data/arrival.js';
import { LAYOUT } from '../world/layout.js';
import { T } from '../data/texts.js';
import { pay } from './inventory.js';

/** Die Ziele des ersten Feuers (goals.js), in dieser Reihenfolge. */
const GOAL_IDS = ['streichhoelzer', 'kamin', 'feuer'];

export class FirstFire {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.stats = { matches: 0, kamin: 0, camp: 0, refused: 0 }; // für die Prüfung
  }

  get flags() {
    return this.game.state.flags;
  }

  get campCold() {
    return Boolean(this.flags.feuerKalt);
  }

  get kaminCold() {
    return Boolean(this.flags.kaminKalt);
  }

  get hasMatches() {
    return Boolean(this.flags.streichhoelzer);
  }

  /** Fehlt Holz für das Lagerfeuer? */
  needWood() {
    return (this.game.state.inventory.holz || 0) < FIRST_FIRE.campCost.holz;
  }

  /** Ein neues Spiel mit Ankunft: alles kalt, die Dose steht auf dem Sims. */
  coldStart() {
    const f = this.flags;
    f.feuerKalt = true;
    f.kaminKalt = true;
    delete f.streichhoelzer;
    delete f.funk_feuerBrennt;
    for (const id of GOAL_IDS) delete f[`ziel_${id}`];
    this.apply();
    this.game.updateGoals(true);
  }

  /** Den Zustand in die Welt übertragen (Laden, neues Spiel, nach jedem Schritt). */
  apply() {
    this.game.world.setFires({ camp: !this.campCold, kamin: !this.kaminCold, matches: this.kaminCold && !this.hasMatches });
  }

  /** Text der Einblendung an Kamin und Feuerstelle, solange sie kalt sind (sonst null). */
  prompt(it) {
    if (it.id === 'kamin' && this.kaminCold) return this.hasMatches ? T.aktionen.kaminAnzuenden : T.aktionen.streichhoelzer;
    if (it.id === 'feuer' && this.campCold) return this.hasMatches ? T.aktionen.feuerAnzuenden : T.aktionen.ansehen;
    return null;
  }

  /** E an Kamin oder Feuerstelle, solange sie kalt sind: true heißt erledigt (kein Dialog). */
  use(it) {
    if (it.id === 'kamin' && this.kaminCold) {
      if (this.hasMatches) this.lightKamin();
      else this.takeMatches();
      return true;
    }
    if (it.id === 'feuer' && this.campCold) {
      this.lightCamp();
      return true;
    }
    return false;
  }

  /** Die Dose vom Sims nehmen. */
  takeMatches() {
    const g = this.game;
    this.flags.streichhoelzer = true;
    this.stats.matches++;
    this.apply();
    g.sound.play('aufheben');
    g.hud.toast(T.feuer.genommen, 'streichholz', 2.6);
    g.hud.say(T.feuer.dose, 4);
    g.updateGoals();
    g.quietSave();
  }

  /** Den Kamin anzünden: Das Holz darin hat Edda noch selbst aufgeschichtet. */
  lightKamin() {
    const g = this.game;
    delete this.flags.kaminKalt;
    this.stats.kamin++;
    this.apply();
    g.sound.play('zuenden');
    const k = g.world.interior.lights.kamin;
    g.effects.splat(k.x, 0.3, k.z, 'funken', 8, 0.4);
    g.player.express('froh', 2.5);
    g.hud.say(T.feuer.kaminAn, 4);
    g.updateGoals();
    g.quietSave();
  }

  /** Das Lagerfeuer anzünden – mit Streichhölzern und zwei Scheiten. Edda sieht den Rauch. */
  lightCamp() {
    const g = this.game;
    if (!this.hasMatches || !pay(g.state.inventory, FIRST_FIRE.campCost)) {
      this.stats.refused++;
      g.hud.say(this.hasMatches ? T.feuer.zuWenigHolz : T.feuer.ohne, 4.5);
      return;
    }
    delete this.flags.feuerKalt;
    this.stats.camp++;
    this.apply();
    g.sound.play('zuenden');
    const f = LAYOUT.campfire;
    g.effects.splat(f.x, 0.4, f.z, 'funken', 12, 0.6);
    g.player.express('froh', 3);
    g.hud.say(T.feuer.an, 4.5);
    g.funk.once('feuerBrennt', T.funk.feuerBrennt(g.state.player.name || 'Mika'));
    g.updateGoals();
    g.quietSave();
  }

  /** Wohin der Zielpfeil bei den Zielen des ersten Feuers zeigt (sonst null). */
  target(id) {
    if (!GOAL_IDS.includes(id)) return null;
    const g = this.game;
    const w = g.world;
    const inside = g.viewInside;
    if (id === 'feuer') {
      if (inside) return { x: w.interior.entry.x, y: 1.0, z: w.interior.entry.z };
      if (this.needWood()) return this.nearestBranches();
      return { x: LAYOUT.campfire.x, y: 0.9, z: LAYOUT.campfire.z };
    }
    // Streichhölzer und Kamin: draußen zur Haustür, drinnen zur Dose bzw. zum Kamin
    if (!inside) {
      const d = w.shelter.door.center;
      return { x: d.x, y: 1.4, z: d.z };
    }
    if (id === 'streichhoelzer') return { x: w.interior.matches.x, y: w.interior.matches.y, z: w.interior.matches.z };
    const k = w.interior.lights.kamin;
    return { x: k.x, y: 0.9, z: k.z };
  }

  /** Die nächsten Äste, die heute noch daliegen (für zwei Scheite fehlt Holz). */
  nearestBranches() {
    const p = this.game.player.position;
    let best = null;
    let bestD = Infinity;
    for (const node of this.game.world.resources.nodes) {
      if (node.kind !== 'aeste' || node.depleted) continue;
      const d = Math.hypot(node.x - p.x, node.z - p.z);
      if (d < bestD) {
        bestD = d;
        best = { x: node.x, y: 0.6, z: node.z };
      }
    }
    return best;
  }

  /** Für die Prüfung. */
  info() {
    const w = this.game.world;
    const fire = w.props.fire;
    return {
      campCold: this.campCold,
      kaminCold: this.kaminCold,
      matches: this.hasMatches,
      light: { camp: w.fireLight.on, kamin: w.kaminLight.on },
      flames: { camp: fire.frames.some((o) => o.visible), kamin: w.interior.flames.some((o) => o.visible) },
      models: { warm: fire.warm.visible, cold: fire.cold.visible, embers: w.interior.embers.visible, tin: w.interior.matches.object.visible },
      grow: { ...w.fireGrow, scale: fire.group.scale.y },
      stats: { ...this.stats },
    };
  }
}
