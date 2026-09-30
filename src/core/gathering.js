// Sammeln: Bäume fällen, Felsen abbauen, Kiesel, Gras und Äste auflesen,
// Schrotthaufen und das Autowrack durchsuchen. Hält man E gedrückt, wird
// weitergesammelt, bis die Quelle erschöpft ist.

import { T } from '../data/texts.js';
import { SEARCH_LOOT, SEARCH_REGROW_DAYS } from '../world/resources.js';
import { gain } from './inventory.js';
import { ABILITIES } from '../data/wanderers.js';

const SWING = { duration: 0.55, hitAt: 0.3 };
const PICK = { duration: 0.6, hitAt: 0.42 };
const SEARCH = { duration: 1.0, progress: true };
const CHIP_KIND = { baum: 'holz', felsen: 'stein', kiesel: 'stein', gras: 'gras', aeste: 'holz', schrott: 'schrott' };


/** Klang je Quelle beim Sammeln. */
const GATHER_SOUND = { baum: 'hacken', felsen: 'stein', gras: 'rupfen', kiesel: 'aufheben', aeste: 'aufheben' };
export class Gathering {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.repeat = null; // Interaktion, die bei gedrücktem E wiederholt wird
    this.lockUntil = 0; // kurz nach dem Fällen verpuffen weitere E (kein Sprung zum Nachbarn)
    this.queued = false; // E getippt, während Mika noch ausholt: nächster Schlag folgt
  }

  /** Behandelt die Interaktion, wenn sie zum Sammeln gehört. */
  interact(it) {
    if (it.node) return this.gather(it);
    if (it.search) return this.search(it.id, it.search, it);
    return false;
  }

  gather(it) {
    const g = this.game;
    this.queued = false;
    const node = g.world.resources.byId.get(it.node);
    if (!node || g.clock < this.lockUntil) return true;
    if (node.depleted) {
      // Baumstumpf: sagen, wann hier wieder etwas wächst
      if (!node.fall) g.hud.toast(T.aktionen.waechst(g.world.resources.daysLeft(node)), 'holz', 2);
      this.repeat = null;
      return true;
    }
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
      cancelable: false, // kurzes Aufsammeln läuft zu Ende, auch wenn man gleich weiterläuft (m3-r1)
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
    g.sound.play(GATHER_SOUND[node.kind] || 'aufheben', { x: node.x, z: node.z });
    g.effects.chips(node.x, y, node.z, CHIP_KIND[node.kind], last ? 12 : 7);
    this.give(gains, node.x, y + 0.6, node.z);
    if (last) {
      if (node.kind === 'baum') g.effects.leaves(node.x, node.z, node.model.startsWith('jung') ? 1.8 : 3, 40);
      g.effects.dust(node.x, node.z, node.kind === 'baum' ? 1.4 : 0.9, 16);
      this.deplete(node);
    }
  }

  deplete(node) {
    const g = this.game;
    // M29: Mit Ida (Försterin) wachsen gefällte Bäume schneller nach – mindestens ein Tag bleibt
    const faster = node.kind === 'baum' ? Math.floor(ABILITIES.wald.faster * (g.survivors?.ability('wald') || 0)) : 0; // M31: verletzt nicht
    const until = g.state.time.day + Math.max(1, node.rules.regrowDays - faster);
    g.world.resources.startFall(node, until);
    g.state.world.nodes[node.id] = { until };
    this.repeat = null;
    this.queued = false;
    this.lockUntil = g.clock + 0.4;
  }

  /**
   * Ist diese Stelle gerade leer? Das Bootswrack gibt nur einmal etwas her,
   * Schrotthaufen füllen sich alle zwei Tage wieder (Meilenstein 8).
   */
  searchEmpty(id) {
    const st = this.game.state;
    if (id === 'wrack') return Boolean(st.flags.wrackLeer);
    const last = st.world.searched[id];
    return last !== undefined && st.time.day - last < SEARCH_REGROW_DAYS;
  }

  /** Durchsuchen: der Schrotthaufen alle zwei Tage, das Bootswrack nur einmal. */
  search(id, lootKey, pos) {
    const g = this.game;
    const st = g.state;
    if (this.searchEmpty(id)) {
      g.hud.toast(id === 'wrack' ? T.meldungen.wrackLeer : T.meldungen.schonDurchsucht, null, 2.4);
      this.repeat = null;
      return true;
    }
    if (id === 'wrack' && !st.flags.wrackGesehen) {
      // Beim ersten Mal ein Gedanke statt eines Dialogs – durchsucht wird sofort
      st.flags.wrackGesehen = true;
      g.hud.say(T.meldungen.wrackErstmals, 3);
    }
    g.sound.play('suchen');
    g.player.startAction('search', {
      ...SEARCH,
      face: pos,
      onCancel: () => g.hud.toast(T.meldungen.abgebrochen, null, 2.2),
      onDone: () => {
        st.world.searched[id] = st.time.day;
        if (id === 'wrack') {
          st.flags.wrackLeer = true;
          if (g.offerBlueprint('wrack')) g.hud.toast(T.bauplaene.wartet, 'bauplan', 3, 'chronik'); // M19: alte Baupläne im Wrack
        }
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
    // Getippt, während Mika noch ausholt: nichts verpufft, der nächste Schlag folgt
    if (input.pressed('use') && this.game.player.busy) this.queued = true;
    if (!(input.isDown('use') || this.queued) || current !== this.repeat) {
      if (!this.game.player.busy) {
        this.repeat = null;
        this.queued = false;
      }
      return;
    }
    if (!this.game.player.busy) this.gather(this.repeat);
  }
}
