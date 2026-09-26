// Sammeln: Bäume fällen, Felsen abbauen, Kiesel, Gras und Äste auflesen,
// Schrotthaufen und das Autowrack durchsuchen. Hält man E gedrückt, wird
// weitergesammelt, bis die Quelle erschöpft ist.

import { T } from '../data/texts.js';
import { SEARCH_LOOT } from '../world/resources.js';
import { gain } from './inventory.js';

const SWING = { duration: 0.55, hitAt: 0.3 };
const PICK = { duration: 0.6, hitAt: 0.42 };
const SEARCH = { duration: 1.2 };
const CHIP_KIND = { baum: 'holz', felsen: 'stein', kiesel: 'stein', gras: 'gras', aeste: 'holz', schrott: 'schrott' };

export class Gathering {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.repeat = null; // Interaktion, die bei gedrücktem E wiederholt wird
  }

  /** Behandelt die Interaktion, wenn sie zum Sammeln gehört. */
  interact(it) {
    if (it.node) return this.gather(it);
    if (it.search) return this.search(it.id, it.search, it);
    return false;
  }

  gather(it) {
    const g = this.game;
    const node = g.world.resources.byId.get(it.node);
    if (!node || node.depleted) return true;
    const rules = node.rules;
    if (rules.search) return this.search(node.id, 'schrott', node);
    if (rules.tool && !g.state.tools[rules.tool]) {
      g.hud.toast(T.meldungen.brauchtWerkzeug(T.gegenstaende[rules.tool]), rules.tool, 2.4);
      this.repeat = null;
      return true;
    }
    const timing = rules.tool ? SWING : PICK;
    const started = g.player.startAction(rules.tool ? 'swing' : 'search', {
      ...timing,
      tool: rules.tool,
      face: node,
      onHit: () => this.hit(node),
    });
    if (started) this.repeat = it;
    return true;
  }

  hit(node) {
    const g = this.game;
    const rules = node.rules;
    node.hitsLeft -= 1;
    node.shake = 1;
    const last = node.hitsLeft <= 0;
    const gains = { ...rules.yield };
    if (last) for (const [res, n] of Object.entries(rules.bonus || {})) gains[res] = (gains[res] || 0) + n;
    const y = node.kind === 'baum' ? 0.9 : 0.25;
    g.effects.chips(node.x, y, node.z, CHIP_KIND[node.kind], last ? 12 : 7);
    this.give(gains, node.x, y + 0.6, node.z);
    if (last) {
      if (node.kind === 'baum') g.effects.leaves(node.x, node.z, node.model.startsWith('jung') ? 1.8 : 3);
      this.deplete(node);
    }
  }

  deplete(node) {
    const g = this.game;
    g.world.resources.setDepleted(node, true);
    g.state.world.nodes[node.id] = { until: g.state.time.day + node.rules.regrowDays };
    this.repeat = null;
  }

  /** Durchsuchen: einmal pro Tag und Stelle. */
  search(id, lootKey, pos) {
    const g = this.game;
    const st = g.state;
    if (st.world.searched[id] === st.time.day) {
      g.hud.toast(T.meldungen.schonDurchsucht, null, 2.2);
      this.repeat = null;
      return true;
    }
    if (id === 'auto' && !st.flags.autoGesehen) {
      st.flags.autoGesehen = true;
      g.startDialog('autoErstmals', () => this.search(id, lootKey, pos));
      return true;
    }
    g.player.startAction('search', {
      ...SEARCH,
      face: pos,
      onDone: () => {
        st.world.searched[id] = st.time.day;
        const loot = this.roll(SEARCH_LOOT[lootKey]);
        g.effects.chips(pos.x, 0.4, pos.z, 'schrott', 8);
        if (Object.keys(loot).length) this.give(loot, pos.x, 1.0, pos.z);
        else g.hud.toast(T.meldungen.nichtsGefunden, null, 2.2);
      },
    });
    this.repeat = null;
    return true;
  }

  /** Beute würfeln: [min, max] oder Wahrscheinlichkeit für ein Stück. */
  roll(table) {
    const rng = this.game.world.particles.rng;
    const out = {};
    for (const [res, spec] of Object.entries(table)) {
      const n = Array.isArray(spec) ? rng.int(spec[0], spec[1]) : rng.chance(spec) ? 1 : 0;
      if (n > 0) out[res] = n;
    }
    return out;
  }

  /** Gutschreiben mit schwebendem »+n« über der Quelle. */
  give(gains, x, y, z) {
    const g = this.game;
    const st = g.state;
    gain(st.inventory, gains);
    let k = 0;
    for (const [res, n] of Object.entries(gains)) {
      if (n <= 0) continue;
      g.hud.floater(x, y, z, `+${n}`, res, k++);
      st.stats.gathered += n;
      if (res === 'zahnraeder' && !st.flags.fundZahnrad) {
        st.flags.fundZahnrad = true;
        g.hud.toast(T.meldungen.ersterFund(T.ressourcen.zahnraeder), res, 3);
      }
    }
  }

  /**
   * Nach der Bewegung: bei gedrücktem E dieselbe Quelle weiter bearbeiten.
   * @param {object|null} current aktuelle Interaktion vor der Figur
   */
  update(input, current) {
    if (!this.repeat) return;
    if (!input.isDown('use') || current !== this.repeat) {
      if (!this.game.player.busy) this.repeat = null;
      return;
    }
    if (!this.game.player.busy) this.gather(this.repeat);
  }
}
