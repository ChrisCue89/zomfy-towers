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

import { T } from '../data/texts.js';
import { SURVIVORS, SURVIVOR_ORDER, TOWER_STAGES, BEACON, TRADES, MORNING_GIFTS, BERT_REPAIR, YUSUF_TEA, ERRANDS } from '../data/survivors.js';
import { Npcs } from '../entities/npcs.js';
import { hoursOf } from './state.js';
import { canAfford, pay, gain } from './inventory.js';
import { planNight } from '../data/waves.js';
import { ENTRY_NAMES } from '../world/pathing.js';
import { BUILDINGS } from '../data/buildings.js';

const OUT_FROM = 6.5; // ab dann sind die Menschen draußen
const OUT_UNTIL = 20.25; // bis dann (kurz vor der ersten Welle)
const BARK_AHEAD = 12; // Spielminuten vor einer Welle bellt Knopf

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
    if (any) this.refreshInteractions();
    return any;
  }

  // --- Stellen und Sichtbarkeit -----------------------------------------------------

  /** Wo steht jemand gerade (Ankunftsort oder fester Platz, frei von Bauten)? */
  standSpot(id) {
    const def = SURVIVORS[id];
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
    for (const id of SURVIVOR_ORDER) this.placeOne(id, out, jump);
  }

  placeOne(id, out, jump) {
    const def = SURVIVORS[id];
    if (this.stage(id) === 0) {
      this.npcs.setVisible(id, false);
      return;
    }
    const n = this.npcs.get(id, def.dog);
    // Menschen gehen nachts schlafen (Gäste am Feuer, Eingezogene ins Zelt)
    const visible = def.dog || out;
    n.model.root.visible = visible;
    n.sitTarget = def.dog && !out ? 1 : 0;
    if (!visible) return;
    const p = this.standSpot(id);
    if (jump) this.npcs.place(n, p.x, p.z, 0);
    else this.npcs.walkTo(n, p.x, p.z);
  }

  refreshInteractions() {
    const list = [];
    for (const id of SURVIVOR_ORDER) {
      if (this.stage(id) === 0) continue;
      const n = this.npcs.list.get(id);
      if (!n) continue;
      list.push({ id: `npc-${id}`, x: n.x, z: n.z, radius: 1.35, prompt: SURVIVORS[id].prompt, npc: id, enabled: n.model.root.visible });
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
      it.enabled = n.model.root.visible;
    }
    // Neu angekommen: winkt, sobald Mika in der Nähe ist
    const p = g.player.position;
    for (const id of SURVIVOR_ORDER) {
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
    if ((this.errandCheck -= dt) <= 0) {
      this.errandCheck = 1;
      this.checkLightErrands();
    }
    this.npcs.update(dt, p);
  }

  /** Knopf bellt kurz vor jeder Welle in ihre Richtung – auch vor der ersten. */
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
      if (!this.upcoming || this.upcoming.night !== day) this.upcoming = planNight(day, g.world.seed, ENTRY_NAMES);
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
    const woher = wave.entries.map((e) => T.horde.richtung[e]).join(T.horde.und);
    g.hud.toast(T.ueberlebende.bellt(woher), 'pfote', 3.5);
  }

  // --- Gespräche ------------------------------------------------------------------

  talk(id) {
    const g = this.game;
    const stage = this.stage(id);
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
    if (aktion === 'einziehen') {
      // Kaum eingezogen, gleich eine Bitte (der Auftrag steht dann im Ziel-Feld)
      if (this.moveIn(id) && ERRANDS[id] && !this.st[id].errand) {
        this.st[id].errand = 1;
        g.startDialog(`${id}Auftrag`);
        g.updateGoals(true);
      }
    } else if (aktion === 'tauschen') this.trade();
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

  /** Für das Ziel-Feld: laufender Auftrag, sonst der nächste Schritt am Funkturm. */
  errandGoal() {
    const st = this.game.state;
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
    this.game.hud.say(this.freeTent() ? T.ueberlebende.zeltFrei(SURVIVORS[id].name) : T.ueberlebende.zeltBauen, 5);
  }

  // --- Zelte und Einzug -------------------------------------------------------------

  tents() {
    return this.game.world.buildings.list.filter((b) => b.type === 'zelt');
  }

  /** Ein Zelt, das noch niemandem gehört (oder null). */
  freeTent() {
    const used = new Set(SURVIVOR_ORDER.map((id) => this.st[id].tent).filter((t) => t !== null && t !== undefined));
    return this.tents().find((b) => !used.has(b.id)) || null;
  }

  moveIn(id) {
    const g = this.game;
    const s = this.st[id];
    if (SURVIVORS[id].tent) {
      const tent = this.freeTent();
      if (!tent) {
        g.hud.say(T.ueberlebende.zeltBauen, 4);
        return false;
      }
      s.tent = tent.id;
    }
    s.stage = 3;
    g.hud.toast(T.ueberlebende.eingezogen(SURVIVORS[id].name), SURVIVORS[id].dog ? 'pfote' : 'zelt', 3.5);
    g.sound.play('glocke');
    this.placeAll(false);
    return true;
  }

  /** Zelte, die es nicht mehr gibt (abgerissen): Bewohner werden wieder Gäste. */
  checkTents() {
    const ids = new Set(this.tents().map((b) => b.id));
    for (const id of SURVIVOR_ORDER) {
      const s = this.st[id];
      if (s.tent === null || s.tent === undefined || ids.has(s.tent)) continue;
      s.tent = null;
      if (s.stage === 3) {
        s.stage = 2;
        this.game.hud.say(T.ueberlebende.ohneZelt(SURVIVORS[id].name), 4);
      }
    }
  }

  /** Wird ein Gast gerade ein Zelt beziehen können? (Hinweis nach dem Bauen) */
  onBuilt(type) {
    if (type !== 'zelt') return;
    const guest = SURVIVOR_ORDER.find((id) => SURVIVORS[id].tent && this.stage(id) === 2);
    if (guest) this.game.hud.say(T.ueberlebende.zeltFrei(SURVIVORS[guest].name), 5);
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
      gain(st.inventory, gift);
      lines.push({ text: T.ueberlebende.gabe[id], res: gift });
    }
    if (this.resident('yusuf')) {
      st.player.hp = g.combat.maxHp;
      st.player.tea = st.time.day;
      lines.push({ text: T.ueberlebende.tee });
    }
    if (this.resident('juna')) {
      const plan = planNight(st.time.day, g.world.seed, ENTRY_NAMES);
      const first = plan.waves[0].entries.map((e) => T.horde.richtung[e]).join(T.horde.und);
      lines.push({ text: T.ueberlebende.funk(first) });
    }
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

  /** Bert: Reparieren kostet weniger. */
  repairFactor() {
    return this.resident('bert') ? BERT_REPAIR.costFactor : 1;
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
    const t = this.game.world.props.towerPos;
    return Math.hypot(x - t.x, z - t.z) < BEACON.range ? BEACON.slow : 0;
  }
}
