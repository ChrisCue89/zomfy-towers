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
//
// M31: Stufe 5 heißt gefallen – nur nach der Lagerglocke, mit »Verluste« und nie
// auf »Gemütlich«. Der Platz wird frei, am Steg hängt das Erinnerungsbrett.
// Verwundete helfen weniger (`strength`): verletzt halb, schwer verletzt und
// erschöpft (bis mittags) gar nicht.

import { T } from '../data/texts.js';
import { knotFor } from '../data/knots.js';
import { SURVIVORS, SURVIVOR_ORDER, TOWER_STAGES, BEACON, TRADES, MORNING_GIFTS, BERT_REPAIR, YUSUF_TEA, ERRANDS } from '../data/survivors.js';
import { Npcs } from '../entities/npcs.js';
import { hoursOf } from './state.js';
import { canAfford, pay, gain } from './inventory.js';
import { BUILDINGS, maxHpOf } from '../data/buildings.js';
import { WANDERERS, WANDERER_ORDER, ABILITIES, ARRIVE_SPOTS, GUEST_SPOTS, EXIT_ROUTES, PLACES, GUEST_ROOM_LEVEL, LETTER_DELAY } from '../data/wanderers.js';
import { KEEPSAKES } from '../data/bonds.js';
import { FOG_PEOPLE } from '../data/fogIsle.js';

const OUT_FROM = 6.5; // ab dann sind die Menschen draußen
const OUT_UNTIL = 20.25; // bis dann (kurz vor der ersten Welle)
const BARK_AHEAD = 12; // Spielminuten vor einer Welle bellt Knopf
const POST_FACING = -Math.PI / 4; // auf dem Hochsitz: Blick nach Südwesten (zu Weg und Wald, halb zur Kamera, M23)
const VISIT_SPOT = { x: 2.1, z: -0.6, facing: -2.2 }; // M32: Besuch sitzt südöstlich am Feuer, dem Feuer zugewandt
const EDDA_SPOT = { x: 21.25, z: -0.5, facing: Math.PI / 2 }; // M32: Edda an der Südecke des Stegendes beim alten Funkturm (Juna steht am Mast weiter nördlich), Blick übers Wasser
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

  /** Eingezogen (Knopf: gestreichelt) – dann wirkt die Fähigkeit. (Weitergezogene und Gefallene nicht mehr, M31) */
  resident(id) {
    return this.stage(id) === 3;
  }

  /**
   * Wie sehr hilft `id` gerade (M31)? 1 = ganz, 0,5 = verletzt, 0 = gar nicht (nicht eingezogen,
   * übt gerade, schwer verletzt oder erschöpft bis mittags).
   */
  strength(id) {
    if (!this.resident(id) || this.game.training?.busy(id)) return 0;
    return this.game.defense?.strength(id) ?? 1;
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
    // M32: Eine Eingeladene kommt zurück – als Gast am Feuer, die Entscheidung ist gleich fällig
    const back = this.game.post?.arrivals();
    if (back) {
      const s = this.st[back];
      s.stage = 2;
      s.guest = this.freeGuestSpot();
      s.due = day - 1;
      s.extra = false;
      s.day = day;
      any = true;
      this.leaving.delete(back);
      this.placeOne(back, out, true);
      if (announce) {
        this.game.hud.say(T.netz.wiederDa(WANDERERS[back].name), 6);
        this.game.sound.memorial(back); // ihr Motiv
      }
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
    const drill = this.resident(id) ? this.game.training?.spotOf(id) : null; // M30: auf dem Übungsplatz
    if (drill) return { ...this.freeSpot(drill.x, drill.z, 0.28), facing: drill.facing };
    const scene = this.resident(id) ? this.game.scenes?.spotOf(id) : null; // M29: zu zweit am Feuer im Gespräch
    if (scene) return { ...this.freeSpot(scene.x, scene.z, 0.28), facing: scene.facing };
    const fire = this.resident(id) ? this.game.bonds?.fireSpot(id) : null; // M29: abends zu Mika ans Feuer
    if (fire) return { ...this.freeSpot(fire.x, fire.z, 0.28), facing: fire.facing };
    // A1: tagsüber an der Arbeit (core/chores.js) – mit Sitz bleibt der Platz daneben, wie er ist
    const chore = this.resident(id) ? this.game.chores?.spotOf(id) : null;
    if (chore) {
      const at = chore.seat ? { x: chore.x, z: chore.z } : this.freeSpot(chore.x, chore.z, def.dog ? 0.2 : 0.28);
      return { ...at, facing: chore.facing, seat: chore.seat, chore: { ...chore, ...at } };
    }
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
    this.placeEdda(out, jump);
    this.game.fogIsle?.placePeople(jump); // N7: Marthe und die Kinder (tagsüber in der Bucht)
    this.updateBedrolls();
  }

  /** M32: Ist Edda zu Hause? (am Morgen nach dem Herbst, `state.edda.home`) */
  eddaHome() {
    const e = this.game.state.edda;
    return Boolean(e?.home) && this.game.state.time.day >= e.home;
  }

  /** M32: Edda steht tagsüber am Ende des Stegs beim alten Funkturm und schaut übers Wasser. */
  placeEdda(out, jump) {
    if (!this.eddaHome()) {
      if (this.npcs.list.has('edda')) this.npcs.setVisible('edda', false);
      return;
    }
    const n = this.npcs.get('edda', false);
    n.model.root.visible = out;
    n.sitTarget = 0;
    n.y = null;
    if (!out) return;
    n.restFacing = EDDA_SPOT.facing;
    if (jump) this.npcs.place(n, EDDA_SPOT.x, EDDA_SPOT.z, EDDA_SPOT.facing);
    else this.npcs.walkTo(n, EDDA_SPOT.x, EDDA_SPOT.z);
  }

  /** M32: Mit Edda reden – beim ersten Mal ihre Heimkehr, danach je Tag etwas anderes. */
  talkEdda() {
    const g = this.game;
    const e = g.state.edda;
    if (!e.met) {
      e.met = true;
      g.sound.memorial('edda'); // die Spieluhr spielt ihr Motiv
      g.startDialog('eddaHeimkehr', () => g.quietSave());
      return;
    }
    if (this.knot('edda')) return; // G2
    g.startDialog('eddaDa');
  }

  /** G2: Einen wartenden Knoten der Geschichte erzählen (data/knots.js) – einmal, dann ist er erledigt. */
  knot(id) {
    const g = this.game;
    const k = knotFor(g.state, id);
    if (!k) return false;
    g.state.flags[k.flag] = true;
    g.startDialog(k.dialog, () => g.quietSave());
    return true;
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
      n.cards = false; // F7
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
    if (this.game.defense?.controls(id)) return; // M31: kämpft gerade nach der Lagerglocke
    const def = personOf(id);
    const stage = this.stage(id);
    // M32: Wer von früher zu Besuch ist, sitzt tagsüber am Feuer
    if (stage === 4 && !this.leaving.has(id) && this.game.post?.visitorToday() === id) {
      const n = this.npcs.get(id, false);
      n.model.root.visible = out;
      n.sitTarget = 0;
      n.y = null;
      if (!out) return;
      const c = { ...this.freeSpot(VISIT_SPOT.x, VISIT_SPOT.z, 0.28), facing: VISIT_SPOT.facing };
      n.restFacing = c.facing;
      if (jump) this.npcs.place(n, c.x, c.z, c.facing);
      else this.npcs.walkTo(n, c.x, c.z);
      return;
    }
    // M27: Weitergezogene gehen noch bis zum Tor bzw. zum Strand, dann sind sie fort (M31: Gefallene sind nicht mehr da)
    if (stage === 0 || stage === 5 || (stage === 4 && !this.leaving.has(id))) {
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
    const p = visible ? this.standSpot(id) : null;
    // A1: Arbeit im Sitzen (Hilde strickt auf der Bank) – hinsetzen übernimmt core/chores.js
    if (p?.seat) {
      this.game.chores.place(id, n, p.chore, jump);
      return;
    }
    if (this.game.chores?.seated(id)) this.game.chores.release(id, n); // anderswo gebraucht: aufstehen
    n.sitTarget = def.dog && !out ? 1 : 0;
    if (!visible) return;
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
    const visitor = this.game.post?.visitorToday() || null; // M32: Besuch am Festtag
    for (const id of PEOPLE) {
      const stage = this.stage(id);
      if (stage === 0 || (stage >= 4 && id !== visitor)) continue;
      const n = this.npcs.list.get(id);
      if (!n) continue;
      // M32: Knopf nur aus der Nähe – er streunt umher und nahm sonst Briefkasten und Gästen das E weg
      const dog = Boolean(personOf(id).dog);
      list.push({ id: `npc-${id}`, x: n.x, z: n.z, radius: dog ? 0.9 : 1.35, prompt: personOf(id).prompt, npc: id, dog, enabled: n.model.root.visible && !this.onPost(id) && !this.game.defense?.controls(id) });
    }
    const edda = this.eddaHome() ? this.npcs.list.get('edda') : null; // M32: Edda ist zu Hause
    if (edda) list.push({ id: 'npc-edda', x: edda.x, z: edda.z, radius: 1.35, prompt: 'ansprechen', npc: 'edda', enabled: edda.model.root.visible });
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
    if (id === 'edda') return this.talkEdda(); // M32
    if (FOG_PEOPLE.includes(id)) return g.fogIsle.talk(id); // N7: Marthe und die Kinder
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
    // N7: Hilde hat Zucker für Marthes Kinder (einmal, solange Marthe darauf wartet)
    if (id === 'hilde' && this.resident(id) && g.fogIsle.hildeSugar()) return;
    // M29: Wartet ein Bindungsmoment, erzählt die Figur ihn statt des gewohnten Gesprächs
    if (this.resident(id) && g.bonds.talk(id)) return;
    g.bonds.onTalk(id);
    // G2: Wartet ein Knoten der Geschichte, erzählt die Figur ihn statt des gewohnten Gesprächs (einmal)
    if (this.resident(id) && this.knot(id)) return;
    g.startDialog(id, (aktion) => this.onAnswer(id, aktion));
  }

  onAnswer(id, aktion) {
    const g = this.game;
    if (aktion === 'anpacken') {
      g.chores.help(id); // A2: Mika packt bei der Arbeit mit an
      return;
    }
    if (aktion === 'kraehenfund') {
      g.crowGifts.giveBack(id); // A3: was die Krähen gebracht haben, geht zurück
      return;
    }
    // M33: Angeln – Fiete bringt es bei, abends kommt jemand mit an den Steg
    if (aktion === 'angelnLernen') {
      g.startDialog('fieteAngeln', () => {
        const f = g.state.fishing;
        f.rod = true;
        f.taught = true;
        g.world.refreshFishingSpot?.(true);
        g.hud.toast(T.angeln.gelernt, 'angel', 4.5);
        g.quietSave();
      });
      return;
    }
    if (aktion === 'angeln') {
      const why = g.fishing.blocked(id);
      if (why) g.hud.toast(T.angeln.gruende[why], 'angel', 2.6);
      else g.fishing.begin(id);
      return;
    }
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

  /** Wo jemand herauskommt, wenn die Lagerglocke läutet (M31): vor dem Zelt bzw. der Hütte – sonst null (Haustür). */
  homeSpot(id) {
    const tent = this.st[id]?.tent;
    if (tent === null || tent === undefined || tent === 'zimmer') return null;
    const b = this.game.world.buildings.get(tent);
    if (!b || b.broken) return null;
    const c = this.game.world.buildings.bounds(b);
    return this.freeSpot(c.x + ((this.st[id].slot || 0) ? 0.5 : 0), c.z + c.d / 2 + 0.45, 0.28);
  }

  /**
   * Gefallen (M31): nur nach der Lagerglocke, mit »Verluste«, nie Knopf. Stufe 5, der Platz
   * wird frei, das Erinnerungsbrett am Steg bekommt Foto, Namen, Tage und das Erinnerungsstück.
   */
  fall(id) {
    const g = this.game;
    const s = this.st[id];
    if (!s || personOf(id)?.dog || s.stage === 5) return;
    const day = g.state.time.day;
    const item = (g.state.bonds?.[id]?.moment || 0) >= 3 ? KEEPSAKES[id]?.item || null : null; // das Erinnerungsstück, falls sie es Mika schon geschenkt hat (M29)
    g.state.fallen.push({ id, from: s.day || 1, to: day, item, lit: 0 });
    s.stage = 5;
    s.tent = null;
    s.slot = 0;
    s.guest = null;
    s.gone = day;
    this.leaving.delete(id);
    this.npcs.setVisible(id, false);
    this.onAbilitiesChanged();
    this.refreshInteractions();
    this.updateBedrolls();
    g.world.setMemorial(g.state.fallen, day);
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
    if (stage === 4) {
      g.startDialog('besuch'); // M32: zu Besuch am Festtag
      return;
    }
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
    if (this.resident(id) && g.bonds.talk(id)) return; // M29: ein Bindungsmoment wartet
    g.bonds.onTalk(id);
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

  /**
   * Hat ein Bewohner diese Fähigkeit? (M27) – wer gerade übt, dessen Fähigkeit ruht (M30).
   * M31: die Stärke (0 = nein, 0,5 = verletzt: halbe Wirkung, 1 = ganz) – als Wahrheitswert nutzbar.
   */
  ability(kind) {
    let best = 0;
    for (const id of WANDERER_ORDER) if (WANDERERS[id].ability === kind) best = Math.max(best, this.strength(id));
    return best;
  }

  /** Fähigkeiten, die dauerhaft wirken (Lottes Licht), neu setzen. */
  onAbilitiesChanged() {
    this.game.world.lightPools.setScale?.(1 + (ABILITIES.licht.radius - 1) * this.ability('licht')); // M31: verletzt halb so viel
  }

  /** Morgens: Briefe, Hannes flickt, Greta stellt Fallen, Unentschlossene ziehen weiter. */
  wandererMorning(lines) {
    const g = this.game;
    const st = g.state;
    const day = st.time.day;
    for (const id of WANDERER_ORDER) {
      const s = this.st[id];
      const w = WANDERERS[id];
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
    // Hannes: Holzbarrikaden flicken (die Hälfte der Schäden; verletzt die Hälfte davon, M31)
    const mend = this.ability('flicken');
    if (mend) {
      let n = 0;
      for (const b of g.world.buildings.list) {
        if (b.type !== 'barrikade' || b.broken || (b.level || 1) > 2) continue;
        const max = maxHpOf(b);
        if (b.hp >= max - 0.5) continue;
        b.hp = Math.min(max, b.hp + (max - b.hp) * ABILITIES.flicken.share * mend);
        g.world.buildings.refreshLook(b);
        n++;
      }
      if (n) lines.push({ text: T.wanderer.geflickt(n) });
    }
    // Greta: verbrauchte Fallen neu stellen (verletzt nur jede zweite, M31)
    const traps = this.ability('fallen');
    if (traps) {
      let n = 0;
      let k = 0;
      for (const b of g.world.buildings.list) {
        if (!BUILDINGS[b.type].trap || !b.broken) continue;
        if (traps < 1 && k++ % 2) continue;
        g.world.buildings.rebuildBarricade(b);
        n++;
      }
      if (n) lines.push({ text: T.wanderer.fallenNeu(n) });
    }
    // M29: Anton hat abends gespielt (die Gemütlichkeit rechnet furnishing.morning)
    if (this.ability('musik')) lines.push({ text: T.wanderer.musik });
    // M29: Mara ist die Wege abgelaufen – woher kommt die Horde heute Nacht?
    if (this.ability('spaehen')) {
      const plan = g.nights.planFor(day);
      const all = [];
      for (const w of plan.waves) for (const e of w.entries) if (!all.includes(e)) all.push(e);
      if (all.length && plan.waves[0]) lines.push({ text: T.wanderer.spaeht(T.horde.kurzListe(['nord', 'mitte', 'sued'].filter((e) => all.includes(e))), T.horde.kurzListe(plan.waves[0].entries)) });
    }
    st.world.buildings = g.world.buildings.toState();
  }

  /** Paula (M29): Was die Horde im Lager umgeworfen hat, steht morgens wieder (vor den Zelten und Gaben). */
  raiseFallen(lines) {
    if (!this.ability('naehen')) return;
    const g = this.game;
    let n = 0;
    for (const b of g.world.buildings.list) {
      if (!BUILDINGS[b.type].raid || !b.broken) continue;
      g.world.buildings.rebuildBarricade(b);
      n++;
    }
    if (!n) return;
    g.state.world.buildings = g.world.buildings.toState();
    g.world.refreshInteractions();
    lines.push({ text: T.wanderer.aufgestellt(n) });
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
    this.raiseFallen(lines); // M29: Paula stellt Umgeworfenes wieder auf
    this.checkTents();
    for (const [id, base] of Object.entries(MORNING_GIFTS)) {
      const k = this.strength(id); // M31: verletzt die Hälfte, schwer verletzt nichts
      if (!k) continue;
      if (this.tentDown(id)) {
        lines.push({ text: T.ueberlebende.zeltUmgeworfen(SURVIVORS[id].name), bad: true });
        continue;
      }
      const gift = k < 1 ? Object.fromEntries(Object.entries(base).map(([r, n]) => [r, Math.max(1, Math.floor(n * k))])) : base;
      gain(st.inventory, gift);
      lines.push({ text: T.ueberlebende.gabe[id], res: gift });
    }
    if (this.strength('yusuf')) {
      st.player.hp = g.combat.maxHp;
      st.player.tea = st.time.day;
      lines.push({ text: T.ueberlebende.tee });
    }
    if (this.strength('juna')) {
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

  /** Nacht geschafft: Bert flickt die Türme (verletzt halb so viel, M31). */
  onNightEnd() {
    const k = this.strength('bert');
    if (!k) return;
    for (const b of this.game.world.buildings.list) {
      const def = BUILDINGS[b.type];
      if (!def.tower || b.hp === undefined) continue;
      b.hp = Math.min(def.hp, b.hp + def.hp * BERT_REPAIR.nightlyTower * k);
    }
    this.game.state.world.buildings = this.game.world.buildings.toState();
  }

  /** Bert: Reparieren kostet weniger (Clara flickt Türme noch billiger, siehe towerRepairFactor). */
  repairFactor() {
    return 1 - (1 - BERT_REPAIR.costFactor) * this.strength('bert');
  }

  /** Clara (M27): Türme flicken kostet ein Viertel weniger. */
  towerRepairFactor() {
    return 1 - (1 - ABILITIES.schrauben.repair) * this.ability('schrauben');
  }

  /** Basteln (M21): Mit Clara braucht es ein Teil weniger. */
  tinkerDiscount() {
    return this.ability('schrauben') >= 1 ? ABILITIES.schrauben.tinker : 0;
  }

  /** Dr. Yusufs Tee: schnelleres Heilen am selben Tag. */
  regenFactor() {
    const st = this.game.state;
    if (!this.strength('yusuf') || st.player.tea !== st.time.day) return 1;
    return this.st.yusuf.errand === 2 ? ERRANDS.yusuf.reward.tea : YUSUF_TEA.regen; // mit Kamille stärker
  }

  /**
   * Mika würde nachts zu Boden gehen: Dr. Yusuf verarztet sie einmal je Nacht
   * (statt der Flucht ins Haus). true = gerettet.
   */
  rescue() {
    const g = this.game;
    const st = g.state;
    if (!this.strength('yusuf') || st.world.yusufNight === st.night.n) return false;
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
