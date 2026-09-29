// Die Überlebenden und die Geschichte um den Funkturm (Meilenstein 6,
// DESIGN.md 4.4, 4.5, 6.14). Wer an welchem Tag ankommt, wo er steht, was er
// sagt und kann, steht in data/survivors.js; hier läuft der Ablauf:
//   Ankunft am Morgen → ansprechen (Gast) → Zelt anbieten (eingezogen) →
//   Fähigkeit: Knopf bellt vor jeder Welle und buddelt Schrott aus, Hilde
//   tauscht und bringt Morgengaben, Juna baut mit Mika den Funkturm zum
//   Leuchtfeuer aus und hört die Horde am Funk, Bert flickt billiger und
//   nachts die Türme, Dr. Yusuf kocht Kräutertee und verarztet Mika einmal
//   je Nacht, bevor sie zu Boden geht.
// Menschen sind tagsüber draußen (06:30–20:15), nachts im Zelt; Knopf liegt
// nachts am Feuer.
//
// M27: Dazu kommen die Wanderer (data/wanderers.js) an den Tagen aus dem
// Startwert der Karte: ankommen (1) → ansprechen: Gast am Feuer (2, eine Nacht
// am Gästeplatz) → am Morgen die Entscheidung: bleiben (3, braucht einen freien
// Schlafplatz – Zelt, Hütte, Gästezimmer), weiterbringen (4, zwei, drei Tage
// später kommt ein Brief) oder einmal »noch einen Tag«. Ist alles voll, bietet
// ein Wanderer unter den Bewohnern an, Platz zu machen. Niemand wird
// weggeschickt: Wer sich nicht entscheiden lassen will, zieht nach dem zweiten
// Morgen von selbst weiter.

import { T } from '../data/texts.js';
import { SURVIVORS, SURVIVOR_ORDER, TOWER_STAGES, BEACON, TRADES, MORNING_GIFTS, BERT_REPAIR, YUSUF_TEA, ERRANDS } from '../data/survivors.js';
import { Npcs } from '../entities/npcs.js';
import { hoursOf } from './state.js';
import { canAfford, pay, gain } from './inventory.js';
import { BUILDINGS, maxHpOf } from '../data/buildings.js';
import { WANDERERS, WANDERER_ORDER, ABILITIES, ARRIVE_SPOTS, GUEST_SPOTS, EXIT_ROUTES, PLACES, GUEST_ROOM_LEVEL, LETTER_DELAY } from '../data/wanderers.js';

const OUT_FROM = 6.5; // ab dann sind die Menschen draußen
const OUT_UNTIL = 20.25; // bis dann (kurz vor der ersten Welle)
const BARK_AHEAD = 12; // Spielminuten vor einer Welle bellt Knopf
const POST_FACING = -Math.PI / 4; // auf dem Hochsitz: Blick nach Südwesten (zu Weg und Wald, halb zur Kamera, M23)
/** Alle Menschen der Bucht: die Stammbesetzung, dann die Wanderer (M27). */
export const PEOPLE = [...SURVIVOR_ORDER, ...WANDERER_ORDER];
const isWanderer = (id) => Boolean(WANDERERS[id]);

/** Stammdaten einer Figur – für Wanderer aus data/wanderers.js zusammengesetzt. */
export function personOf(id) {
  if (SURVIVORS[id]) return SURVIVORS[id];
  const w = WANDERERS[id];
  return w ? { name: w.name, tent: true, prompt: 'ansprechen', arrive: ARRIVE_SPOTS[w.route], spot: w.spot, wanderer: true } : null;
}

/** »Schlurfer, Flitzer und ein Brummer« – was in einer Nacht kommt (für Junas Funkspruch). */
export function nightMix(plan) {
  const counts = {};
  for (const wave of plan.waves) for (const s of wave.spawns) counts[s.type] = (counts[s.type] || 0) + (s.type === 'schwaermer' ? 0.25 : 1);
  const order = ['schlurfer', 'flitzer', 'schwaermer', 'leuchtpilz', 'brummer', 'moderfalter', 'graeber', 'schildtraeger', 'lichtfresser', 'brueter', 'anfuehrer', 'holzfaeller', 'pilzmutter', 'laternenhexe', 'moosriese'];
  const parts = order.filter((t) => counts[t]).map((t) => (counts[t] <= 1 ? T.horde.arten[t][0] : T.horde.arten[t][1]));
  if (parts.length <= 1) return parts[0] || T.horde.arten.schlurfer[1];
  return `${parts.slice(0, -1).join(', ')}${T.horde.und}${parts[parts.length - 1]}`;
}

export class Survivors {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.npcs = new Npcs(game.scene, game.world);
    this.interactions = []; // stehen in world.npcInteractions
    this.barked = null; // »Tag|Welle«, vor der Knopf schon gebellt hat
    this.upcoming = null; // Plan der kommenden Nacht (für das Bellen vor Welle 1)
    this.errandCheck = 0; // Sekunden bis zur nächsten Prüfung der Licht-Aufträge
    this.greeted = new Set(); // wer Mika bei der Ankunft schon zugewinkt hat
    this.outside = null; // sind die Menschen gerade draußen?
    this.whistled = null; // Pfiff (M16): { t, back } – Knopf rennt hin, bellt, trabt zurück
    this.leaving = new Map(); // M27: wer gerade fortgeht – id -> noch zu gehende Wegpunkte
  }

  get st() {
    return this.game.state.survivors;
  }

  stage(id) {
    return this.st[id]?.stage || 0;
  }

  /** Eingezogen (Knopf: gestreichelt) – dann wirkt die Fähigkeit. */
  resident(id) {
    return this.stage(id) >= 3;
  }

  /** Nach dem Laden oder einem neuen Spiel. */
  apply() {
    this.checkTents();
    this.arrive(false);
    this.outside = null;
    this.placeAll(true);
    this.refreshInteractions();
    this.onAbilitiesChanged(); // M27: Lottes Licht nach dem Laden
  }

  // --- Ankunft ----------------------------------------------------------------------

  /** Wer an diesem Tag fällig ist, kommt an (am Morgen oder nach dem Laden). */
  arrive(announce = true) {
    const day = this.game.state.time.day;
    const start = this.game.state.world.survivorsStart || 0; // alte Spielstände: ab dem Umstieg
    let any = false;
    const out = this.isOutsideTime();
    for (const id of SURVIVOR_ORDER) {
      const s = this.st[id];
      if (s.stage !== 0 || day < SURVIVORS[id].day + start) continue;
      s.stage = 1;
      s.day = day;
      any = true;
      this.placeOne(id, out, true);
      if (announce) this.game.hud.say(T.ueberlebende.ankunft[id], 5);
    }
    // M27: Wanderer nach dem Plan aus dem Startwert
    for (const { id, day: due } of this.guests.plan || []) {
      const s = this.st[id];
      if (!s || s.stage !== 0 || day < due) continue;
      s.stage = 1;
      s.day = day;
      any = true;
      this.placeOne(id, out, true);
      const w = WANDERERS[id];
      if (announce) this.game.hud.say(T.wanderer.ankunft[w.route](w.name, T.wanderer.berufe[w.job]), 6);
    }
    if (any) this.refreshInteractions();
    return any;
  }

  /** Gäste, Weitergezogene und der Plan der Ankünfte (M27). */
  get guests() {
    return this.game.state.guests;
  }

  // --- Stellen und Sichtbarkeit -----------------------------------------------------

  /** Wo steht jemand gerade (Ankunftsort, fester Platz, am Festmorgen am Feuer – frei von Bauten)? */
  standSpot(id) {
    const def = personOf(id);
    const feast = this.resident(id) ? this.game.posts?.feastSpot(id) : null; // M23: Fest am Feuer
    if (feast) return { ...this.freeSpot(feast.x, feast.z, 0.28), facing: feast.facing };
    // M27: Gäste sitzen am Gästeplatz beim Feuer
    if (def.wanderer && this.stage(id) === 2) {
      const g = GUEST_SPOTS[this.st[id].guest || 0];
      return { ...this.freeSpot(g.x, g.z, 0.28), facing: g.facing };
    }
    const want = this.stage(id) === 1 ? def.arrive : def.spot;
    return this.freeSpot(want.x, want.z, def.dog ? 0.2 : 0.28);
  }

  /** Nächste freie Stelle um (x, z) – falls dort inzwischen etwas gebaut wurde. */
  freeSpot(x, z, r) {
    const colliders = this.game.world.colliders;
    if (!colliders.blocks(x, z, r)) return { x, z };
    for (let ring = 1; ring <= 6; ring++) {
      for (let k = 0; k < 8 * ring; k++) {
        const a = (k / (8 * ring)) * Math.PI * 2;
        const px = x + Math.cos(a) * ring * 0.35;
        const pz = z + Math.sin(a) * ring * 0.35;
        if (!colliders.blocks(px, pz, r)) return { x: px, z: pz };
      }
    }
    return { x, z };
  }

  isOutsideTime() {
    const h = hoursOf(this.game.state.time.minute);
    return h >= OUT_FROM && h < OUT_UNTIL;
  }

  /** Alle Figuren an ihre Stelle setzen (jump) bzw. dorthin laufen lassen. */
  placeAll(jump) {
    const out = this.isOutsideTime();
    for (const id of PEOPLE) this.placeOne(id, out, jump);
    this.updateBedrolls();
  }

  /** Kartenabend (M28): `id` sitzt am Tisch (spot mit seatY) – oder steht wieder auf (null). */
  seatAt(id, spot) {
    const n = this.npcs.get(id, false);
    if (spot) {
      this.seat = { id, ...spot };
      n.model.root.visible = true;
      n.gestures.length = 0;
      n.sit = 1;
      n.sitTarget = 1;
      n.seatY = spot.seatY;
      n.y = null;
      n.restFacing = spot.facing;
      this.npcs.place(n, spot.x, spot.z, spot.facing);
    } else {
      this.seat = null;
      n.sit = 0;
      n.sitTarget = 0;
      n.seatY = null;
      if (id === 'balduin') this.game.trader.enter('steht', 'steht');
      else this.placeAll(true);
    }
    this.refreshInteractions();
  }

  /** Geste am Kartentisch (der Tick, ein Achselzucken, Daumen hoch). */
  cardGesture(id, kind) {
    const n = this.npcs.list.get(id);
    if (!n || !kind) return;
    n.gestures.length = 0;
    this.npcs.gesture(n, kind, 1.1);
  }

  placeOne(id, out, jump) {
    if (this.seat?.id === id) return; // M28: sitzt gerade am Kartentisch
    const def = personOf(id);
    const stage = this.stage(id);
    // M27: Weitergezogene gehen noch bis zum Tor bzw. zum Strand, dann sind sie fort
    if (stage === 0 || (stage === 4 && !this.leaving.has(id))) {
      this.npcs.setVisible(id, false);
      return;
    }
    if (stage === 4) return; // läuft gerade fort (update)
    const n = this.npcs.get(id, def.dog);
    // M23: Auf dem Hochsitz (abends bis morgens) – oben auf der Plattform, Blick zum Weg
    const post = !def.dog && this.game.posts?.onDuty(id) ? this.game.posts.postOf(id) : null;
    if (post) {
      const s = this.game.posts.spotOf(post);
      n.model.root.visible = true;
      n.sitTarget = 0;
      n.y = this.game.world.heightAt(s.x, s.z) + s.y;
      n.restFacing = POST_FACING;
      this.npcs.place(n, s.x, s.z, POST_FACING);
      return;
    }
    if (!def.dog) n.y = null;
    // Menschen gehen nachts schlafen (Gäste am Feuer, Eingezogene ins Zelt)
    const visible = def.dog || out;
    n.model.root.visible = visible;
    n.sitTarget = def.dog && !out ? 1 : 0;
    if (!visible) return;
    const p = this.standSpot(id);
    if (!def.dog) n.restFacing = p.facing ?? null; // am Festmorgen zum Feuer schauen
    if (jump) this.npcs.place(n, p.x, p.z, p.facing ?? 0);
    else this.npcs.walkTo(n, p.x, p.z);
  }

  /** Steht jemand gerade auf dem Posten (dann kein Gespräch, M23)? */
  onPost(id) {
    return Boolean(this.game.posts?.onDuty(id));
  }

  refreshInteractions() {
    const list = [];
    for (const id of PEOPLE) {
      const stage = this.stage(id);
      if (stage === 0 || stage === 4) continue;
      const n = this.npcs.list.get(id);
      if (!n) continue;
      list.push({ id: `npc-${id}`, x: n.x, z: n.z, radius: 1.35, prompt: personOf(id).prompt, npc: id, enabled: n.model.root.visible && !this.onPost(id) });
    }
    this.interactions = list;
    this.game.world.npcInteractions = list;
    this.game.world.refreshInteractions();
  }

  // --- Jeder Spielschritt ---------------------------------------------------------------

  update(dt) {
    const g = this.game;
    const out = this.isOutsideTime();
    if (out !== this.outside) {
      // Morgens erscheinen sie an ihrem Platz, abends gehen sie schlafen
      this.outside = out;
      this.placeAll(true);
      this.refreshInteractions();
    }
    // Einblendung wandert mit der Figur
    for (const it of this.interactions) {
      const n = this.npcs.list.get(it.npc);
      if (!n) continue;
      it.x = n.x;
      it.z = n.z;
      it.enabled = n.model.root.visible && !this.onPost(it.npc);
    }
    // Neu angekommen: winkt, sobald Mika in der Nähe ist
    const p = g.player.position;
    this.updateLeaving();
    for (const id of PEOPLE) {
      if (this.stage(id) !== 1 || this.greeted.has(id)) continue;
      const n = this.npcs.list.get(id);
      if (!n || !n.model.root.visible || Math.hypot(n.x - p.x, n.z - p.z) > 6) continue;
      this.greeted.add(id);
      if (n.dog) {
        n.bark = 0.8;
        g.sound.play('bellen', { x: n.x, z: n.z, volume: 0.7 });
      }
      else n.wave = 1.6;
    }
    this.barkBeforeWave();
    this.updateWhistle(dt);
    // Nach dem Pfiff wieder daheim: normal laufen, nachts hinlegen
    if (this.returning) {
      const dog = this.npcs.list.get('knopf');
      if (!dog || !dog.target) {
        this.returning = false;
        if (dog) {
          dog.rush = 1;
          this.placeOne('knopf', this.isOutsideTime(), false);
        }
      }
    }
    if ((this.errandCheck -= dt) <= 0) {
      this.errandCheck = 1;
      this.checkLightErrands();
    }
    this.npcs.update(dt, p);
  }

  /**
   * Pfiff (Fähigkeit, M16): Knopf rennt zur Stelle und bellt dort `time`
   * Sekunden lang, dann trabt er zurück an seinen Platz. Bauten halten ihn
   * auf – dann bellt er eben über die Barrikade hinweg.
   */
  whistle(x, z, time) {
    const dog = this.npcs.list.get('knopf');
    if (!dog) return false;
    dog.model.root.visible = true;
    dog.sitTarget = 0;
    dog.rush = 4.2;
    this.npcs.walkTo(dog, x, z);
    this.whistled = { t: time, next: 0 };
    return true;
  }

  updateWhistle(dt) {
    const w = this.whistled;
    if (!w) return;
    const g = this.game;
    const dog = this.npcs.list.get('knopf');
    if (!dog) {
      this.whistled = null;
      return;
    }
    w.t -= dt;
    if (w.t > 0) {
      // Angekommen (oder aufgehalten): bellen, in kurzen Stößen
      if (!dog.target) {
        w.next -= dt;
        if (w.next <= 0) {
          w.next = 0.7;
          dog.bark = 0.5;
          g.sound.play('bellen', { x: dog.x, z: dog.z, volume: 0.8 });
        }
      }
      return;
    }
    // Vorbei: zurück an den Platz (nachts ins Körbchen am Feuer)
    this.whistled = null;
    dog.rush = 1.6;
    const home = this.standSpot('knopf');
    this.npcs.walkTo(dog, home.x, home.z);
    this.returning = true;
  }

  /** Knopf bellt kurz vor jeder Welle – auch vor der ersten (M9: ohne feste Richtung, OFFENE-FRAGEN Nr. 74). */
  barkBeforeWave() {
    if (!this.resident('knopf')) return;
    const g = this.game;
    const nights = g.nights;
    const day = g.state.time.day;
    const night = g.state.night;
    let plan = nights.active ? nights.plan : null;
    let n = 0; // nächste Welle
    if (plan) n = night.wave;
    else if (night.n !== day) {
      // Die Nacht hat noch nicht begonnen (sie beginnt mit Welle 1): ihr Plan steht schon fest
      if (!this.upcoming || this.upcoming.night !== day) this.upcoming = g.nights.planFor(day);
      plan = this.upcoming;
    }
    if (!plan || n >= plan.waves.length) return;
    const wave = plan.waves[n];
    const key = `${day}|${n}`;
    const ahead = wave.at - g.state.time.minute;
    if (ahead <= 0 || ahead > BARK_AHEAD || this.barked === key) return;
    this.barked = key;
    const dog = this.npcs.list.get('knopf');
    if (dog) {
      dog.bark = 1.2;
      g.sound.play('bellen', { x: dog.x, z: dog.z });
    }
    // m16-r1: mitten in der Nacht ist es nicht »die Horde«, sondern die nächste Welle
    g.hud.toast(n > 0 ? T.ueberlebende.belltWelle : T.ueberlebende.bellt, 'pfote', 3.5);
  }

  /** Die Alarmglocke läutet (M17e): Knopf bellt, wo er gerade ist. */
  alarmBark() {
    if (!this.resident('knopf')) return;
    const dog = this.npcs.list.get('knopf');
    if (!dog) return;
    dog.bark = 1.4;
    this.game.sound.play('bellen', { x: dog.x, z: dog.z });
  }

  // --- Gespräche ------------------------------------------------------------------

  talk(id) {
    const g = this.game;
    const stage = this.stage(id);
    if (isWanderer(id)) {
      this.talkWanderer(id);
      return;
    }
    if (stage === 1) {
      g.startDialog(`${id}Treffen`, (aktion) => {
        const s = this.st[id];
        if (id === 'knopf') {
          if (aktion === 'streicheln') this.moveIn(id);
        } else if (s.stage === 1) {
          s.stage = 2;
          this.placeAll(false);
          this.tentHint(id);
        }
        g.quietSave();
      });
      return;
    }
    g.startDialog(id, (aktion) => this.onAnswer(id, aktion));
  }

  onAnswer(id, aktion) {
    const g = this.game;
    if (isWanderer(id)) {
      this.decide(id, aktion);
      g.quietSave();
      return;
    }
    if (aktion === 'einziehen') {
      // Kaum eingezogen, gleich eine Bitte (der Auftrag steht dann im Ziel-Feld)
      if (this.moveIn(id) && ERRANDS[id] && !this.st[id].errand) {
        this.st[id].errand = 1;
        g.startDialog(`${id}Auftrag`);
        g.updateGoals(true);
      }
    } else if (aktion === 'tauschen') this.trade();
    else if (aktion === 'karten') {
      // M28: Kartenabend – wer nicht kann, sagt warum
      const why = g.cardNight.blocked(id);
      if (why) g.hud.toast(T.karten.gruende[why] || T.karten.gruende.heute, 'buch', 2.6);
      else g.cardNight.begin(id);
      return;
    }
    else if (aktion === 'auftrag') this.completeErrand(id);
    g.quietSave();
  }

  // --- Aufträge ----------------------------------------------------------------------

  /** Auftrag erledigen: abgeben (bring) bzw. von checkLightErrands ausgelöst. */
  completeErrand(id) {
    const g = this.game;
    const st = g.state;
    const def = ERRANDS[id];
    if (!def || this.st[id].errand !== 1) return false;
    if (def.kind === 'bring' && !pay(st.inventory, def.give)) return false;
    this.st[id].errand = 2;
    const r = def.reward;
    const res = Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'maxHp' && k !== 'tea'));
    if (Object.keys(res).length) gain(st.inventory, res);
    if (r.maxHp) st.player.hp = Math.min(g.combat.maxHp, st.player.hp + r.maxHp);
    if (r.tea) st.player.hp = g.combat.maxHp; // Yusuf verarztet gleich mit
    g.hud.toast(T.auftraege[id].fertig, SURVIVORS[id].dog ? 'pfote' : 'ziel', 4);
    g.sound.play('stufe');
    g.hud.goalFlash = 1.2;
    g.updateGoals(true);
    g.quietSave();
    return true;
  }

  /** Bert: Steht eine Laterne nah genug an seinem Zelt? */
  checkLightErrands() {
    for (const id of SURVIVOR_ORDER) {
      const def = ERRANDS[id];
      if (!def || def.kind !== 'licht' || this.st[id].errand !== 1) continue;
      const tent = this.game.world.buildings.list.find((b) => b.id === this.st[id].tent);
      if (!tent) continue;
      const c = this.game.world.buildings.bounds(tent);
      const lit = this.game.world.buildings.list.some((b) => {
        if (b.type !== 'laternenpfahl' && b.type !== 'laternenturm') return false; // Laterne oder Laternenturm
        const l = this.game.world.buildings.bounds(b);
        return Math.hypot(l.x - c.x, l.z - c.z) <= def.radius;
      });
      if (lit) this.completeErrand(id);
    }
  }

  /** Für das Ziel-Feld: ein Gast wartet auf Antwort (M27), laufender Auftrag, sonst der nächste Schritt am Funkturm. */
  errandGoal() {
    const st = this.game.state;
    const waiting = WANDERER_ORDER.find((id) => this.decisionDue(id));
    if (waiting) return { id: `gast-${waiting}`, text: T.wanderer.wartet(WANDERERS[waiting].name), progress: null };
    for (const id of SURVIVOR_ORDER) {
      const def = ERRANDS[id];
      if (!def || this.st[id].errand !== 1) continue;
      const give = def.give ? Object.entries(def.give) : [];
      const progress = give.length === 1 ? `(${Math.min(st.inventory[give[0][0]] || 0, give[0][1])}/${give[0][1]})` : null;
      return { id: `auftrag-${id}`, text: T.auftraege[id].ziel, progress };
    }
    const stage = st.world.tower || 0;
    if (this.resident('juna') && stage < 3) return { id: `funkturm-${stage + 1}`, text: T.auftraege.funkturm(stage + 1), progress: null };
    return null;
  }

  /** Hildes Schal: mehr Lebenspunkte. */
  maxHpBonus() {
    return this.st.hilde?.errand === 2 ? ERRANDS.hilde.reward.maxHp : 0;
  }

  /** Nach dem Kennenlernen: Wo schläft der Gast? */
  tentHint(id) {
    if (!SURVIVORS[id].tent) return;
    this.game.hud.say(this.freePlace() ? T.ueberlebende.zeltFrei(SURVIVORS[id].name) : T.ueberlebende.zeltBauen, 5);
  }

  // --- Schlafplätze und Einzug (M27: Zelte, die Hütte, das Gästezimmer) -----------------

  tents() {
    return this.game.world.buildings.list.filter((b) => b.type === 'zelt');
  }

  /**
   * Alle Schlafplätze: je Zelt einer, je Hütte zwei, das Gästezimmer ab
   * Zuhause-Stufe 5 einer. `id` ist der Bau (oder 'zimmer'), `slot` der Platz darin.
   */
  places() {
    const list = [];
    for (const b of this.game.world.buildings.list) {
      const n = PLACES[b.type];
      if (!n) continue;
      for (let slot = 0; slot < n; slot++) list.push({ id: b.id, slot, broken: Boolean(b.broken), type: b.type });
    }
    if ((this.game.state.world.houseLevel || 1) >= GUEST_ROOM_LEVEL) list.push({ id: 'zimmer', slot: 0, broken: false, type: 'zimmer' });
    return list;
  }

  /** Wer schläft hier? (erste id oder null – bei der Hütte ggf. zwei, siehe occupants) */
  occupant(placeId) {
    return this.occupants(placeId)[0] || null;
  }

  occupants(placeId) {
    return PEOPLE.filter((id) => this.st[id]?.tent === placeId && this.stage(id) === 3);
  }

  /** Ein Schlafplatz, der noch niemandem gehört und steht (oder null; umgeworfen zählt nicht, M17d). */
  freePlace() {
    const used = new Set(PEOPLE.filter((id) => this.st[id] && this.st[id].tent !== null && this.st[id].tent !== undefined).map((id) => `${this.st[id].tent}|${this.st[id].slot || 0}`));
    return this.places().find((p) => !p.broken && !used.has(`${p.id}|${p.slot}`)) || null;
  }

  /** Alt (M6): ein freies Zelt – heißt jetzt: ein freier Schlafplatz. */
  freeTent() {
    return this.freePlace();
  }

  /** Liegt das Zelt (die Hütte) dieses Bewohners umgeworfen da (M17d)? Dann bringt er morgens nichts. */
  tentDown(id) {
    const tent = this.st[id].tent;
    if (tent === null || tent === undefined || tent === 'zimmer') return false;
    return Boolean(this.game.world.buildings.get(tent)?.broken);
  }

  moveIn(id) {
    const g = this.game;
    const s = this.st[id];
    const def = personOf(id);
    if (def.tent) {
      const place = this.freePlace();
      if (!place) {
        g.hud.say(isWanderer(id) ? T.wanderer.keinPlatz : T.ueberlebende.zeltBauen, 4);
        return false;
      }
      s.tent = place.id;
      s.slot = place.slot;
    }
    s.stage = 3;
    s.guest = null;
    g.hud.toast(T.ueberlebende.eingezogen(def.name), def.dog ? 'pfote' : 'zelt', 3.5);
    if (def.dog) g.hud.say(T.ueberlebende.knopfHilft, 5); // wie er hilft, stand nirgends (m6-r1)
    if (isWanderer(id)) g.hud.say(T.wanderer.bleibt(def.name, T.wanderer.faehigkeit[WANDERERS[id].ability]), 6);
    g.sound.play('glocke');
    this.onAbilitiesChanged();
    this.placeAll(false);
    return true;
  }

  /** Schlafplätze, die es nicht mehr gibt (abgerissen): Bewohner werden wieder Gäste. */
  checkTents() {
    const exists = new Set(this.places().map((p) => `${p.id}|${p.slot}`));
    for (const id of PEOPLE) {
      const s = this.st[id];
      if (!s || s.tent === null || s.tent === undefined || exists.has(`${s.tent}|${s.slot || 0}`)) continue;
      s.tent = null;
      s.slot = 0;
      if (s.stage === 3) {
        s.stage = 2;
        if (isWanderer(id)) s.guest = this.freeGuestSpot();
        this.game.hud.say(T.ueberlebende.ohneZelt(personOf(id).name), 4);
        this.onAbilitiesChanged();
      }
    }
  }

  /** Wird ein Gast gerade einen Platz beziehen können? (Hinweis nach dem Bauen) */
  onBuilt(type) {
    if (!PLACES[type]) return;
    const guest = PEOPLE.find((id) => personOf(id)?.tent && this.stage(id) === 2);
    if (guest) this.game.hud.say(T.ueberlebende.zeltFrei(personOf(guest).name), 5);
  }

  // --- Wanderer (M27) ---------------------------------------------------------------

  /** Ist die Entscheidung fällig? (am Morgen nach der Nacht am Feuer) */
  decisionDue(id) {
    const s = this.st[id];
    return this.stage(id) === 2 && this.game.state.time.day > (s.due ?? s.day ?? 0);
  }

  /** Freier Gästeplatz am Feuer (0 oder 1). */
  freeGuestSpot() {
    const used = new Set(WANDERER_ORDER.filter((id) => this.stage(id) === 2).map((id) => this.st[id].guest));
    return used.has(0) ? 1 : 0;
  }

  talkWanderer(id) {
    const g = this.game;
    const s = this.st[id];
    const stage = this.stage(id);
    if (stage === 1) {
      g.startDialog(`${id}Treffen`, () => {
        if (s.stage !== 1) return;
        s.stage = 2;
        s.guest = this.freeGuestSpot();
        s.due = g.state.time.day; // am nächsten Morgen fällig
        this.placeAll(false);
        this.refreshInteractions();
        g.hud.say(T.wanderer.amFeuer(WANDERERS[id].name), 5);
        g.quietSave();
      });
      return;
    }
    if (this.decisionDue(id)) {
      g.startDialog(`${id}Entscheidung`, (aktion) => this.onAnswer(id, aktion));
      return;
    }
    g.startDialog(id, (aktion) => this.onAnswer(id, aktion));
  }

  /** Wer unter den Bewohnern würde für einen Gast Platz machen? (der Wanderer, der am längsten da ist) */
  wouldLeave(guestId) {
    const list = WANDERER_ORDER.filter((id) => id !== guestId && this.stage(id) === 3);
    list.sort((a, b) => (this.st[a].day || 0) - (this.st[b].day || 0));
    return list[0] || null;
  }

  /** Antwort in der Entscheidung. */
  decide(id, aktion) {
    const g = this.game;
    const s = this.st[id];
    const w = WANDERERS[id];
    if (aktion === 'bleiben') this.moveIn(id);
    else if (aktion === 'weiterbringen') this.forward(id);
    else if (aktion === 'nochEinTag') {
      s.extra = true;
      s.due = g.state.time.day;
      g.hud.say(T.wanderer.nochEinTag(w.name), 5);
    } else if (aktion === 'platzMachen') {
      const other = this.wouldLeave(id);
      if (!other) return;
      const place = { tent: this.st[other].tent, slot: this.st[other].slot || 0 };
      this.forward(other, 'platz');
      s.tent = place.tent;
      s.slot = place.slot;
      s.stage = 3;
      s.guest = null;
      g.hud.say(T.wanderer.platzGemacht(WANDERERS[other].name, T.wanderer.zumOrt[WANDERERS[other].place], w.name), 7);
      g.sound.play('glocke');
      this.onAbilitiesChanged();
      this.placeAll(false);
    }
    this.refreshInteractions();
  }

  /**
   * Weiterbringen: Proviant und eine Laterne, dann geht die Figur zum Tor bzw.
   * zum Strand. Zwei, drei Tage später kommt ein Brief (Netzwerk, M32 baut es aus).
   * @param {'mika'|'selbst'|'platz'} [why]
   */
  forward(id, why = 'mika') {
    const g = this.game;
    const s = this.st[id];
    const w = WANDERERS[id];
    const day = g.state.time.day;
    s.stage = 4;
    s.tent = null;
    s.slot = 0;
    s.guest = null;
    s.gone = day;
    s.letter = day + LETTER_DELAY[(id.length + day) % LETTER_DELAY.length];
    s.read = false;
    if (why === 'mika') g.hud.say(T.wanderer.weiter(w.name, T.wanderer.zumOrt[w.place]), 6);
    this.onAbilitiesChanged();
    // Die Figur geht noch bis zum Tor bzw. zum Strand
    const n = this.npcs.list.get(id);
    if (n && n.model.root.visible) {
      this.leaving.set(id, EXIT_ROUTES[w.route].map((p) => ({ ...p })));
      n.wave = 1.4;
    } else this.npcs.setVisible(id, false);
    this.refreshInteractions();
  }

  /** Wer fortgeht, geht seine Wegpunkte ab (durch die Schlupftür, am Strand entlang) und ist dann fort. */
  updateLeaving() {
    for (const [id, route] of this.leaving) {
      const n = this.npcs.list.get(id);
      if (n && n.target) continue;
      if (n && n.wave <= 0 && route.length) {
        const p = route.shift();
        this.npcs.walkTo(n, p.x, p.z);
        continue;
      }
      if (n && n.wave > 0) continue; // erst zu Ende winken
      this.leaving.delete(id);
      this.npcs.setVisible(id, false);
    }
  }

  /** Die Schlafsäcke am Feuer: sichtbar, solange dort ein Gast übernachtet. */
  updateBedrolls() {
    const used = new Set(WANDERER_ORDER.filter((id) => this.stage(id) === 2).map((id) => this.st[id].guest || 0));
    this.npcs.setBedrolls(GUEST_SPOTS, used);
  }

  /** Hat ein Bewohner diese Fähigkeit? (M27) */
  ability(kind) {
    return WANDERER_ORDER.some((id) => WANDERERS[id].ability === kind && this.resident(id));
  }

  /** Fähigkeiten, die dauerhaft wirken (Lottes Licht), neu setzen. */
  onAbilitiesChanged() {
    this.game.world.lightPools.setScale?.(this.ability('licht') ? ABILITIES.licht.radius : 1);
  }

  /** Morgens: Briefe, Hannes flickt, Greta stellt Fallen, Unentschlossene ziehen weiter. */
  wandererMorning(lines) {
    const g = this.game;
    const st = g.state;
    const day = st.time.day;
    for (const id of WANDERER_ORDER) {
      const s = this.st[id];
      const w = WANDERERS[id];
      // Briefe von Weitergezogenen
      if (s.stage === 4 && !s.read && day >= (s.letter || 0)) {
        s.read = true;
        lines.push({ text: `${T.wanderer.brief(w.name, T.wanderer.vomOrt[w.place])} ${T.wanderer.briefe[id]}` });
      }
      // Wer gestern ankam und nicht angesprochen wurde, hat sich selbst ans Feuer gesetzt
      if (s.stage === 1 && day > (s.day || 0)) {
        s.stage = 2;
        s.guest = this.freeGuestSpot();
        s.due = s.day;
        lines.push({ text: T.wanderer.selbstAmFeuer(w.name) });
      }
      // Wer einen ganzen Tag nach der fälligen Entscheidung noch am Feuer sitzt, zieht von selbst weiter
      if (s.stage === 2 && day > (s.due ?? s.day ?? 0) + 1) {
        this.forward(id, 'selbst');
        lines.push({ text: T.wanderer.selbstWeiter(w.name, T.wanderer.zumOrt[w.place]) });
      }
    }
    // Hannes: Holzbarrikaden flicken (die Hälfte der Schäden)
    if (this.ability('flicken')) {
      let n = 0;
      for (const b of g.world.buildings.list) {
        if (b.type !== 'barrikade' || b.broken || (b.level || 1) > 2) continue;
        const max = maxHpOf(b);
        if (b.hp >= max - 0.5) continue;
        b.hp = Math.min(max, b.hp + (max - b.hp) * ABILITIES.flicken.share);
        g.world.buildings.refreshLook(b);
        n++;
      }
      if (n) lines.push({ text: T.wanderer.geflickt(n) });
    }
    // Greta: verbrauchte Fallen neu stellen
    if (this.ability('fallen')) {
      let n = 0;
      for (const b of g.world.buildings.list) {
        if (!BUILDINGS[b.type].trap || !b.broken) continue;
        g.world.buildings.rebuildBarricade(b);
        n++;
      }
      if (n) lines.push({ text: T.wanderer.fallenNeu(n) });
    }
    st.world.buildings = g.world.buildings.toState();
  }

  // --- Oma Hilde: Tauschen ------------------------------------------------------------

  tradeOffer() {
    const day = this.game.state.time.day;
    return TRADES[(day - 1) % TRADES.length];
  }

  canTrade() {
    const st = this.game.state;
    return this.stage('hilde') >= 2 && st.world.tradeDay !== st.time.day && canAfford(st.inventory, this.tradeOffer().give);
  }

  trade() {
    const g = this.game;
    const st = g.state;
    const offer = this.tradeOffer();
    if (st.world.tradeDay === st.time.day || !pay(st.inventory, offer.give)) return;
    gain(st.inventory, offer.get);
    st.world.tradeDay = st.time.day;
    const [res, n] = Object.entries(offer.get)[0];
    g.hud.toast(T.ueberlebende.getauscht(T.menge(n, res)), res, 2.5);
    g.sound.play('loot', { pitch: 880 });
  }

  // --- Morgen und Nacht -----------------------------------------------------------

  /**
   * Am Morgen: Ankünfte, Gaben der Eingezogenen, Tee, Junas Funkspruch.
   * @returns {Array<{text:string, res?:object}>} Zeilen für den Morgenbericht
   */
  morning() {
    const g = this.game;
    const st = g.state;
    const lines = [];
    this.checkTents();
    for (const [id, gift] of Object.entries(MORNING_GIFTS)) {
      if (!this.resident(id)) continue;
      if (this.tentDown(id)) {
        lines.push({ text: T.ueberlebende.zeltUmgeworfen(SURVIVORS[id].name), bad: true });
        continue;
      }
      gain(st.inventory, gift);
      lines.push({ text: T.ueberlebende.gabe[id], res: gift });
    }
    if (this.resident('yusuf')) {
      st.player.hp = g.combat.maxHp;
      st.player.tea = st.time.day;
      lines.push({ text: T.ueberlebende.tee });
    }
    if (this.resident('juna')) {
      // Juna meldet, was heute Nacht kommt (M9: Arten statt Richtung, OFFENE-FRAGEN Nr. 74)
      const plan = g.nights.planFor(st.time.day);
      lines.push({ text: T.ueberlebende.funk(plan.waves.length, nightMix(plan)) });
    }
    this.wandererMorning(lines); // M27
    this.arrive(true);
    this.greeted.clear();
    this.outside = null;
    this.placeAll(true);
    this.refreshInteractions();
    return lines;
  }

  /** Nacht geschafft: Bert flickt die Türme. */
  onNightEnd() {
    if (!this.resident('bert')) return;
    for (const b of this.game.world.buildings.list) {
      const def = BUILDINGS[b.type];
      if (!def.tower || b.hp === undefined) continue;
      b.hp = Math.min(def.hp, b.hp + def.hp * BERT_REPAIR.nightlyTower);
    }
    this.game.state.world.buildings = this.game.world.buildings.toState();
  }

  /** Bert: Reparieren kostet weniger (Clara flickt Türme noch billiger, siehe towerRepairFactor). */
  repairFactor() {
    return this.resident('bert') ? BERT_REPAIR.costFactor : 1;
  }

  /** Clara (M27): Türme flicken kostet ein Viertel weniger. */
  towerRepairFactor() {
    return this.ability('schrauben') ? ABILITIES.schrauben.repair : 1;
  }

  /** Basteln (M21): Mit Clara braucht es ein Teil weniger. */
  tinkerDiscount() {
    return this.ability('schrauben') ? ABILITIES.schrauben.tinker : 0;
  }

  /** Dr. Yusufs Tee: schnelleres Heilen am selben Tag. */
  regenFactor() {
    const st = this.game.state;
    if (!this.resident('yusuf') || st.player.tea !== st.time.day) return 1;
    return this.st.yusuf.errand === 2 ? ERRANDS.yusuf.reward.tea : YUSUF_TEA.regen; // mit Kamille stärker
  }

  /**
   * Mika würde nachts zu Boden gehen: Dr. Yusuf verarztet sie einmal je Nacht
   * (statt der Flucht ins Haus). true = gerettet.
   */
  rescue() {
    const g = this.game;
    const st = g.state;
    if (!this.resident('yusuf') || st.world.yusufNight === st.night.n) return false;
    st.world.yusufNight = st.night.n;
    st.player.hp = g.combat.maxHp * 0.6;
    g.hud.toast(T.ueberlebende.verarztet, 'herz', 3.5);
    return true;
  }

  // --- Funkturm und Leuchtfeuer (Juna) ---------------------------------------------

  towerStage() {
    return this.game.state.world.tower || 0;
  }

  /** Bauleisten-Option für die nächste Stufe (oder null). */
  towerOption() {
    if (this.stage('juna') < 2) return null;
    const stage = this.towerStage();
    const next = TOWER_STAGES[stage + 1];
    if (!next) return { id: 'funkturm', icon: 'funkturm', name: T.funkturm.fertig, info: T.funkturm.infoFertig, cost: {}, disabled: true, disabledText: T.funkturm.fertig };
    return { id: 'funkturm', icon: 'funkturm', name: T.funkturm.stufe[stage + 1], info: T.funkturm.info[stage + 1], cost: next.cost, badge: String(stage + 1), buy: true, action: () => this.buildTowerStage() };
  }

  buildTowerStage() {
    const g = this.game;
    const st = g.state;
    const stage = this.towerStage() + 1;
    const next = TOWER_STAGES[stage];
    if (!next || g.nights.active) {
      if (g.nights.active) g.hud.say(T.funkturm.nachts, 3);
      return;
    }
    if (!pay(st.inventory, next.cost)) return;
    g.startWork(T.funkturm.werkeln, next.hours, () => {
      st.world.tower = stage;
      g.world.setTowerStage(stage, BEACON.glow);
      g.sound.play(stage === 3 ? 'morgen' : 'aufwertung');
      g.quietSave();
    }, () => g.startDialog(`funkturm${stage}`));
  }

  /** Leuchtfeuer: Schlurfer in seinem Licht sind langsamer (0 = nicht). */
  beaconSlow(x, z) {
    if (this.towerStage() < 3) return 0;
    const t = this.game.world.props.beaconPos;
    return Math.hypot(x - t.x, z - t.z) < BEACON.range ? BEACON.slow : 0;
  }
}
