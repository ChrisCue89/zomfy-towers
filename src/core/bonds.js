// Bindung (M29, OFFENE-FRAGEN 171): gemeinsame Zeit mit den Bewohnern, vier
// stille Stufen (fremd, vertraut, befreundet, eng), ohne Verfall und ohne Zahl im
// Bild. Werte in data/bonds.js, Momente in dialogs.js (`${id}Moment1..3`).
//
// Wo gemeinsame Zeit entsteht (add):
//   karten  cardNight.settle (M28)          reden   erstes Gespräch des Tages
//   kochen  M29 (später)                    nacht   auf dem Posten, Nacht gehalten
//   feuer   abends zusammen ins Feuer geschaut (Ausruhen am Lagerfeuer)
// Was man sieht: ab »vertraut« ein Gruß am Morgen (Winken, Sprechblase), ab
// »befreundet« ein Spitzname und ein Platz neben Mika am Feuer, ab »eng« das
// Erinnerungsstück im Regal der Stube. Jeder Aufstieg bringt einen Moment:
// Über dem Kopf steht dann ein warmes Zeichen, beim nächsten Ansprechen
// erzählt die Figur statt des gewohnten Dialogs.

import { BOND_STAGES, BOND_KINDS, NICKNAMES, KEEPSAKES, GREET, FIRE_FRIENDS, emptyBond } from '../data/bonds.js';
import { DIALOGE } from '../data/dialogs.js';
import { T } from '../data/texts.js';
import { PEOPLE, personOf } from './survivors.js';
import { hoursOf } from './state.js';
import { LAYOUT } from '../world/layout.js';

export class Bonds {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.greeted = new Set(); // wer heute schon gegrüßt hat
    this.fire = null; // { day, ids } – wer sich heute Abend zu Mika ans Feuer gesetzt hat
  }

  get data() {
    return this.game.state.bonds;
  }

  entry(id) {
    return (this.data[id] ||= emptyBond());
  }

  /** 0 fremd · 1 vertraut · 2 befreundet · 3 eng */
  stage(id) {
    const pts = this.data[id]?.pts || 0;
    let s = 0;
    for (let k = 1; k < BOND_STAGES.length; k++) if (pts >= BOND_STAGES[k] - 1e-6) s = k;
    return s;
  }

  /** Kann `id` eine Bindung haben? (Bewohner: eingezogen; Knopf zählt mit) */
  able(id) {
    return this.game.survivors.resident(id);
  }

  /**
   * Gemeinsame Zeit der Art `kind`. Die erste ihrer Art zählt voll, jede weitere
   * weniger, höchstens einmal am Tag. Gibt zurück, ob es gezählt hat.
   */
  add(id, kind) {
    const def = BOND_KINDS[kind];
    if (!def || !this.able(id)) return false;
    const b = this.entry(id);
    const day = this.game.state.time.day;
    if (def.daily && b.last[kind] === day) return false;
    const n = b.kinds[kind] || 0;
    b.pts = Math.round((b.pts + (n ? def.again : def.first)) * 100) / 100;
    b.kinds[kind] = n + 1;
    b.last[kind] = day;
    return true;
  }

  /** Wartet ein Moment? (Stufe erreicht, noch nicht erzählt; Dialog vorhanden) */
  wantsTalk(id) {
    if (!this.able(id)) return false;
    const b = this.entry(id);
    const next = b.moment + 1;
    return next <= this.stage(id) && Boolean(DIALOGE[`${id}Moment${next}`]);
  }

  /** Beim Ansprechen: den wartenden Moment erzählen (statt des gewohnten Dialogs). */
  talk(id) {
    if (!this.wantsTalk(id)) return false;
    const g = this.game;
    const b = this.entry(id);
    const n = b.moment + 1;
    g.startDialog(`${id}Moment${n}`, () => {
      b.moment = Math.max(b.moment, n);
      if (n === 3) this.giveKeepsake(id);
      g.quietSave();
    });
    return true;
  }

  /**
   * Das Erinnerungsstück steht jetzt im Regal der Stube. Eine Karte zeigt es groß wie
   * im Katalog (N4-Wunsch: »auch was sie uns bringen«), sobald es ruhig ist.
   */
  giveKeepsake(id) {
    const k = KEEPSAKES[id];
    if (!k) return;
    const g = this.game;
    g.sound.play('stufe');
    g.world.refreshKeepsakes(this.keepsakes());
    g.pendingDelivery = [...(g.pendingDelivery || []), { gift: k.item, from: id, name: personOf(id).name }];
  }

  /** Die Stücke im Regal (in fester Reihenfolge). */
  keepsakes() {
    return Object.keys(KEEPSAKES).filter((id) => (this.data[id]?.moment || 0) >= 3);
  }

  /** Wie ruft `id` Mika? Ab »befreundet« beim Spitznamen. */
  callName(id) {
    return this.stage(id) >= 2 && NICKNAMES[id] ? NICKNAMES[id] : 'Mika';
  }

  /** Erstes Gespräch des Tages zählt als gemeinsame Zeit (survivors.talk ruft es). */
  onTalk(id) {
    this.add(id, 'reden');
  }

  /**
   * Jeder Spielschritt: morgens grüßen die Vertrauten, wenn Mika vorbeikommt
   * (einmal am Tag, winken, eine Sprechblase über dem Kopf).
   */
  update() {
    const g = this.game;
    const m = g.state.time.minute;
    if (m < GREET.from || m > GREET.until || g.mode !== 'play') return;
    const p = g.player.position;
    for (const id of PEOPLE) {
      if (this.greeted.has(id) || this.stage(id) < 1) continue;
      const n = g.survivors.npcs.list.get(id);
      if (!n || !n.model.root.visible || n.talking || Math.hypot(n.x - p.x, n.z - p.z) > GREET.radius) continue; // im Gespräch am Feuer: später
      this.greeted.add(id);
      if (n.dog) {
        n.bark = 0.8;
        g.sound.play('bellen', { x: n.x, z: n.z, volume: 0.5 });
        continue;
      }
      n.wave = 1.4;
      const lines = T.bindung.gruss[id] || T.bindung.grussAlle;
      const line = lines[(g.state.time.day + id.length) % lines.length];
      g.hud.bubble(n, line.replace('{name}', this.callName(id)), 3.2);
    }
  }

  /**
   * Mika ruht sich abends am Lagerfeuer aus: Bis zu zwei Freunde (ab »befreundet«)
   * setzen sich dazu, und wer am Feuer ist, verbringt die Zeit mit ihr.
   */
  atFire() {
    const g = this.game;
    const h = hoursOf(g.state.time.minute);
    if (h < 17 || h >= 20.5) return [];
    const friends = PEOPLE.filter((id) => !personOf(id)?.dog && this.able(id) && this.stage(id) >= 2)
      .sort((a, b) => (this.data[b]?.pts || 0) - (this.data[a]?.pts || 0))
      .slice(0, FIRE_FRIENDS);
    this.fire = { day: g.state.time.day, ids: friends };
    const c = LAYOUT.campfire;
    const shared = [];
    for (const id of PEOPLE) {
      if (!this.able(id)) continue;
      const n = g.survivors.npcs.list.get(id);
      const near = n && n.model.root.visible && Math.hypot(n.x - c.x, n.z - c.z) < 4.5;
      if ((near || friends.includes(id)) && this.add(id, 'feuer')) shared.push(id);
    }
    g.survivors.placeAll(true);
    return shared;
  }

  /** Platz eines Freundes am Feuer (heute Abend) – südlich im Halbkreis, dem Feuer zugewandt. */
  fireSpot(id) {
    const f = this.fire;
    if (!f || f.day !== this.game.state.time.day || !f.ids.includes(id)) return null;
    if (hoursOf(this.game.state.time.minute) >= 20.5) return null;
    const k = f.ids.indexOf(id);
    const c = LAYOUT.campfire;
    const a = Math.PI * (k ? 0.3 : 0.7); // Südost bzw. Südwest
    const x = c.x + Math.cos(a) * 1.7;
    const z = c.z + Math.sin(a) * 1.7;
    return { x, z, facing: Math.atan2(c.x - x, c.z - z) };
  }

  /** Nach einer gehaltenen Nacht: Wer auf einem Hochsitz stand, hat sie Seite an Seite mit Mika gehalten. */
  onNightWon() {
    const posts = this.game.posts;
    if (!posts) return;
    for (const id of PEOPLE) if (posts.postOf?.(id)) this.add(id, 'nacht');
  }

  /** Neuer Morgen: wieder grüßen. */
  morning() {
    this.greeted.clear();
    return [];
  }

  /** Herbstbuch, Seite »Menschenkunde«: die Stufe als Wort (keine Zahl). */
  stageWord(id) {
    return T.bindung.stufen[this.stage(id)];
  }
}
