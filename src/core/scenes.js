// Geteilte Szenen (M29, OFFENE-FRAGEN 162): Morgens reden zwei Bewohner über die
// Nacht, abends am Feuer über Gott und die Welt. Rollen nach Temperament, Texte
// in data/scenes.js. Die beiden gehen zum Lagerfeuer (survivors.standSpot fragt
// `spotOf`) und reden dort als Sprechblasen (hud.bubble), sobald Mika in der Nähe
// ist – nie als Dialog. Ein Gedächtnis (state.scenes.seen) verhindert
// Wiederholungen, solange es andere passende Szenen gibt.

import { SCENES, CORE_TEMPERS } from '../data/scenes.js';
import { WANDERERS } from '../data/wanderers.js';
import { PEOPLE, personOf } from './survivors.js';
import { hoursOf } from './state.js';
import { LAYOUT } from '../world/layout.js';

/** Abstand Mikas zum Feuer, ab dem die Szene losgeht (m), und Zeit je Zeile (s, plus je Zeichen). */
const NEAR = 7;
const LINE_TIME = 1.6;
const PER_CHAR = 0.045;
/** Zeitfenster (Uhrzeit): morgens nach dem Bericht bis 13 Uhr, abends 17 bis 19 Uhr, dann verfällt es. */
const WINDOW = { morgen: [6, 13], abend: [17, 19.5] };

export class Scenes {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.pending = null; // { scene, cast: [idA, idB], fresh, need } – die beiden gehen zum Feuer
    this.running = null; // dazu { k, t } – gerade im Gespräch
    this.events = []; // Anlässe der letzten Nacht
    this.eventsDay = -1; // Tag, an dem der Morgenbericht gelesen wurde
    this.done = { morgen: -1, abend: -1 }; // Tag, an dem die Szene dieses Fensters gewählt wurde
    this.retry = 0;
  }

  get data() {
    return this.game.state.scenes;
  }

  tempers(id) {
    return WANDERERS[id]?.temper || CORE_TEMPERS[id] || [];
  }

  /** Wer kann eine Rolle übernehmen? Eingezogen, draußen, nicht auf dem Posten, nicht am Kartentisch (Knopf bellt nur). */
  cast() {
    const g = this.game;
    const s = g.survivors;
    return PEOPLE.filter((id) => id !== 'knopf' && s.resident(id) && s.npcs.list.get(id)?.model.root.visible && !g.posts?.onDuty(id) && s.seat?.id !== id);
  }

  /** Anlässe der letzten Nacht aus dem Morgenbericht. */
  eventsOf(rep) {
    if (!rep) return [];
    const g = this.game;
    const ev = [];
    if (!rep.won) ev.push('verloren');
    if (rep.lager && !rep.lager.held) ev.push('durchbruch');
    if (rep.risk?.flawless) ev.push('makellos');
    const waves = g.nights?.plan?.waves || [];
    if (waves.some((w) => w.boss)) ev.push('boss');
    if (waves.some((w) => w.trait === 'nebel')) ev.push('nebel');
    const kind = g.world.weather.forecast?.(rep.n);
    if (kind === 'regen' || kind === 'sturm') ev.push('regen');
    return ev;
  }

  /** Eine passende Szene samt Besetzung wählen (oder null). */
  choose(when, events) {
    const people = this.cast();
    if (people.length < 2) return null;
    const seen = new Set(this.data.seen);
    const options = [];
    for (const sc of SCENES) {
      if (sc.when !== when) continue;
      if (sc.need && !events.includes(sc.need)) continue;
      const a = people.filter((id) => sc.roles[0].some((t) => this.tempers(id).includes(t)));
      for (const ida of a) {
        const b = people.filter((id) => id !== ida && sc.roles[1].some((t) => this.tempers(id).includes(t)));
        if (b.length) options.push({ scene: sc, cast: [ida, b[(this.game.state.time.day + ida.length) % b.length]], fresh: !seen.has(sc.id), need: Boolean(sc.need) });
      }
    }
    if (!options.length) return null;
    // Anlass vor »einfach so«, Neues vor Bekanntem
    options.sort((p, q) => Number(q.fresh) - Number(p.fresh) || Number(q.need) - Number(p.need));
    const best = options.filter((o) => o.fresh === options[0].fresh && o.need === options[0].need);
    return best[(this.game.state.time.day * 7) % best.length];
  }

  /** Morgenbericht ist durch: Anlässe merken, die Szene des Morgens wird gewählt, sobald zwei draußen sind. */
  morning(events) {
    this.events = events;
    this.eventsDay = this.game.state.time.day;
    this.drop();
  }

  /** Platz einer Figur, solange ihre Szene wartet oder läuft: zu zweit am Feuer, einander zugewandt. */
  spotOf(id) {
    const r = this.running || this.pending;
    const k = r ? r.cast.indexOf(id) : -1;
    if (k < 0) return null;
    const c = LAYOUT.campfire;
    const x = c.x + (k ? 1.5 : -1.5);
    return { x, z: c.z + 0.5, facing: k ? -Math.PI / 2 : Math.PI / 2 };
  }

  /** Szene aufgeben (Fenster vorbei, Nacht, Kartenabend): die beiden gehen an ihre Plätze zurück. */
  drop() {
    const cur = this.running || this.pending;
    if (!cur) return;
    this.talking(cur.cast, false);
    this.pending = null;
    this.running = null;
    this.game.survivors.placeAll(false);
  }

  /** Im Gespräch schauen die beiden einander an statt zu Mika. */
  talking(cast, on) {
    for (const id of cast) {
      const n = this.game.survivors.npcs.list.get(id);
      if (n) n.talking = on;
    }
  }

  update(dt) {
    const g = this.game;
    if (g.mode !== 'play') return;
    const day = g.state.time.day;
    const h = hoursOf(g.state.time.minute);
    const open = (w) => h >= WINDOW[w][0] && h < WINDOW[w][1];
    if (g.cardNight?.match) return this.drop();
    const cur = this.running || this.pending;
    if (cur && !open(cur.scene.when)) return this.drop();
    // Wählen, sobald zwei draußen sind (alle zwei Sekunden neu schauen)
    if (!cur && (this.retry -= dt) <= 0) {
      this.retry = 2;
      const when = this.eventsDay === day && this.done.morgen !== day && open('morgen') ? 'morgen' : this.done.abend !== day && open('abend') ? 'abend' : null;
      if (when) this.pending = this.choose(when, when === 'morgen' ? this.events : []);
      if (this.pending) {
        this.done[when] = day;
        this.talking(this.pending.cast, true);
        g.survivors.placeAll(false); // zum Feuer gehen
      }
    }
    if (this.pending) this.tryStart();
    const r = this.running;
    if (!r) return;
    r.t -= dt;
    if (r.t > 0) return;
    r.k++;
    if (r.k >= r.scene.lines.length) {
      this.data.seen = [...this.data.seen.filter((id) => id !== r.scene.id), r.scene.id].slice(-40);
      this.drop();
      return;
    }
    this.say();
  }

  /** Beide stehen am Feuer, Mika ist in der Nähe: los geht's. */
  tryStart() {
    const g = this.game;
    const p = this.pending;
    const m = g.player.position;
    let there = true;
    for (const id of p.cast) {
      const n = g.survivors.npcs.list.get(id);
      if (!n || !n.model.root.visible) return;
      const s = g.survivors.standSpot(id); // mit Ausweichen, falls dort etwas gebaut ist
      if (Math.hypot(n.x - s.x, n.z - s.z) <= 0.6) continue;
      there = false;
      // unterwegs hängen geblieben (ein Bau im Weg): wo Mika es nicht sieht, einfach dort sein
      if (!n.target && Math.hypot(n.x - m.x, n.z - m.z) > NEAR + 4) g.survivors.npcs.place(n, s.x, s.z, s.facing ?? 0);
    }
    const c = LAYOUT.campfire;
    if (!there || Math.hypot(m.x - c.x, m.z - c.z) > NEAR || g.viewInside) return;
    this.running = { ...p, k: 0, t: 0 };
    this.pending = null;
    this.say();
  }

  /** Aktuelle Zeile als Sprechblase über der Figur. */
  say() {
    const g = this.game;
    const r = this.running;
    const [role, text] = r.scene.lines[r.k];
    const n = g.survivors.npcs.list.get(r.cast[role]);
    const name = (i) => personOf(r.cast[i])?.name || r.cast[i];
    const line = text.replace('{a}', name(0)).replace('{b}', name(1));
    r.t = LINE_TIME + line.length * PER_CHAR;
    if (n) g.hud.bubble(n, line, r.t + 0.6);
  }
}

export function newScenes() {
  return { seen: [] };
}

export function sanitizeScenes(raw) {
  const ids = new Set(SCENES.map((s) => s.id));
  return { seen: Array.isArray(raw?.seen) ? raw.seen.filter((id) => ids.has(id)).slice(-40) : [] };
}
