// Der Übungsplatz (M30, OFFENE-FRAGEN 169): Jeden Tag darf eine Person üben – zwei
// Spielstunden lang, ihre Fähigkeit ruht solange. Wer eine Schusswaffe für den Notfall
// hat, schießt auf die Blechdosen (drei Patronen, sonst übt sie an der Strohpuppe), die
// anderen schlagen auf die Puppe ein. Nach 2/3/4 Übungen steigt die Stufe (0–3): mehr
// Leben, sicherer, weniger Schreck (wirkt, wenn die Lagerglocke läutet, M31). Bleibt
// Mika dabei, ist es gemeinsame Zeit (Bindung »ueben«).

import { T } from '../data/texts.js';
import { TRAINING, GUNS, stepsLeft } from '../data/arms.js';
import { absoluteMinute, hoursOf } from './state.js';
import { PEOPLE, personOf } from './survivors.js';

/** Wie oft während der Übung etwas passiert (s) und wie nah Mika sein muss, um mitzuüben (m). */
const BEAT = 1.6;
const NEAR = 5;
const WITH_MIKA = 0.4; // Anteil der Übung, den Mika dabei sein muss

export class Training {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.session = null; // { id, until, total, near, beat, gun }
  }

  get data() {
    return this.game.state.training;
  }

  entry(id) {
    return (this.data[id] ||= { level: 0, done: 0, day: 0 });
  }

  level(id) {
    return this.data[id]?.level || 0;
  }

  /** Der Übungsplatz (einer im Lager), falls er steht. */
  ground() {
    return this.game.world.buildings.list.find((b) => b.type === 'uebungsplatz' && !b.broken) || null;
  }

  /** Wer heute noch üben kann: eingezogene Menschen, die heute nicht geübt haben und nicht ganz geübt sind. */
  candidates() {
    const g = this.game;
    const day = g.state.time.day;
    return PEOPLE.filter((id) => g.survivors.resident(id) && !personOf(id)?.dog && this.entry(id).day !== day && stepsLeft(this.data[id]) !== null);
  }

  /** E am Übungsplatz: Wer übt heute? (Dialog `uebungsplatz` fragt, die Antwort startet die Übung.) */
  offer() {
    const g = this.game;
    const h = hoursOf(g.state.time.minute);
    if (this.session) {
      g.hud.say(T.waffen.uebenLaeuft(personOf(this.session.id).name), 3);
      return;
    }
    if (h < TRAINING.from || h + TRAINING.hours > TRAINING.until || g.nights.active) {
      g.hud.say(T.waffen.uebenZuSpaet, 3.5);
      return;
    }
    if (!this.candidates().length) {
      g.hud.say(T.waffen.uebenKeiner, 3.5);
      return;
    }
    g.startDialog('uebungsplatz', (aktion) => {
      if (typeof aktion === 'string' && aktion.startsWith('ueben:')) this.start(aktion.slice(6));
    });
  }

  /** Die Übung beginnt: Die Person geht zum Platz, die Uhr läuft zwei Spielstunden. */
  start(id) {
    const g = this.game;
    const st = g.state;
    if (!this.ground() || !this.candidates().includes(id)) return false;
    const weapon = st.arms.notfall[id];
    const gun = GUNS[weapon] ? weapon : null;
    // Schießen kostet Patronen (aus dem gemeinsamen Vorrat); ohne übt sie an der Puppe
    const ammo = gun ? GUNS[gun].ammo : null;
    const shoot = Boolean(gun && (st.inventory[ammo] || 0) >= TRAINING.ammo);
    if (shoot) st.inventory[ammo] -= TRAINING.ammo;
    const total = TRAINING.hours * 60;
    this.session = { id, until: absoluteMinute(st.time) + total, total, near: 0, seen: 0, beat: BEAT, gun: shoot ? gun : null };
    g.hud.toast(T.waffen.uebenLos(personOf(id).name), 'uebungsplatz', 2.6);
    if (shoot) g.hud.toast(T.waffen.uebenPatronen, 'patronen', 2.2);
    g.survivors.placeAll(false);
    g.quietSave();
    return true;
  }

  /** Steht `id` gerade auf dem Übungsplatz? Dann dort (survivors.standSpot fragt). */
  spotOf(id) {
    const s = this.session;
    if (!s || s.id !== id) return null;
    const b = this.ground();
    if (!b) return null;
    const c = this.game.world.buildings.bounds(b);
    // Vor der Puppe bzw. vor den Dosen, mit dem Gesicht zu ihnen (Norden)
    return { x: c.x + (s.gun ? -0.4 : 0.9), z: c.z + 1.4, facing: Math.PI };
  }

  /** Ruht die Fähigkeit von `id` gerade (übt)? */
  busy(id) {
    return this.session?.id === id;
  }

  update(dt) {
    const g = this.game;
    const s = this.session;
    if (!s) return;
    const st = g.state;
    const b = this.ground();
    const now = absoluteMinute(st.time);
    const n = g.survivors.npcs?.list?.get(s.id);
    // Mika ist dabei? (in Spielminuten gezählt, damit Ausruhen nicht zählt)
    if (b && g.mode === 'play') {
      const c = g.world.buildings.bounds(b);
      const p = g.player.position;
      s.seen += dt;
      if (Math.hypot(p.x - c.x, p.z - c.z) <= NEAR) s.near += dt;
      // Der Takt: ein Schuss auf die Dosen oder ein Hieb auf die Puppe
      s.beat -= dt;
      if (s.beat <= 0 && n && n.model.root.visible && !n.target) {
        s.beat = BEAT;
        n.practice = { kind: s.gun ? 'schuss' : 'hieb', t: 0 };
        if (s.gun) {
          g.effects.muzzle(n.x, 0.78, n.z - 0.5, 0, -1, 'feuer');
          g.sound.play('schuss', { x: n.x, z: n.z, volume: 0.45 });
          g.effects.splat(c.x - 0.7 + (Math.random() - 0.5) * 1.4, 0.85, c.z - 0.95, 'funken', 5, 0.6); // eine Dose fliegt
        } else {
          g.sound.play('treffer', { x: n.x, z: n.z, volume: 0.5 });
          g.effects.splat(c.x + 0.8, 0.95, c.z - 0.05, 'stroh', 6, 0.7);
        }
      }
    }
    if (n?.practice) n.practice.t += dt;
    if (now < s.until && b && !g.nights.active) return;
    // Fertig (oder der Platz ist umgeworfen, oder die Nacht beginnt): zählen, Stufe prüfen
    if (n) n.practice = null;
    this.session = null;
    if (!b) {
      g.survivors.placeAll(false);
      return;
    }
    const e = this.entry(s.id);
    e.day = st.time.day; // heute hat sie geübt
    e.done += 1;
    const name = personOf(s.id).name;
    const need = TRAINING.steps[e.level];
    if (need !== undefined && e.done >= need) {
      e.level += 1;
      e.done = 0;
      g.hud.toast(T.waffen.uebenStufe(name, e.level), 'uebungsplatz', 3.4);
      g.sound.play('stufe');
    } else {
      g.hud.toast(T.waffen.uebenFertig(name, T.waffen.stufe(e.level, stepsLeft(e))), 'uebungsplatz', 3);
    }
    // Mika hat mitgeübt: gemeinsame Zeit
    if (s.seen > 0 && s.near / s.seen >= WITH_MIKA) g.bonds?.add(s.id, 'ueben');
    g.survivors.placeAll(false);
    g.quietSave();
  }

  /** Für die Prüfung. */
  info() {
    const s = this.session;
    return {
      session: s ? { id: s.id, gun: s.gun, left: Math.max(0, s.until - absoluteMinute(this.game.state.time)), near: s.near, seen: s.seen } : null,
      ground: Boolean(this.ground()),
      candidates: this.candidates(),
      data: JSON.parse(JSON.stringify(this.data)),
    };
  }
}
