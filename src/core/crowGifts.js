// A3: Krähengaben – Ablauf. Das Futterbrett (Bau) ist ein Platz der Krähen; E streut einmal am
// Tag Krümel (eine Krähe kommt und pickt sie auf). Jeden Morgen wächst danach das Vertrauen, und
// manchmal liegt eine Gabe auf dem Brett: E nimmt sie (Karte), Glänzendes kommt ins Krähenglas auf
// der Fensterbank, Kleinkram der Leute trägt Mika, bis sie ihn zurückgeben kann, der Schlüssel
// führt zu Jakobs Schatulle unter der Diele vor dem Kamin. Werte und Reihenfolge: data/crows.js.

import { T } from '../data/texts.js';
import { CROW_FEED, CROW_TRUST, giftOf, nextGift, giftChance } from '../data/crows.js';
import { gain } from './inventory.js';
import { Rng, hash3 } from './rng.js';
import { hoursOf } from './state.js';
import { FEEDER_TOP, FEEDER_SPOTS } from '../world/crowModels.js';

const U = 1 / 32;

/** Versatz auf dem Brett (1/32 m) mit der Drehung des Baus – wie VoxelModel.rotated. */
export function feederOffset(spot, turns = 0) {
  let x = spot.x;
  let z = spot.z;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) [x, z] = [z, -x - 1];
  return { x: x * U, z: z * U };
}

export class CrowGifts {
  constructor(game) {
    this.game = game;
    this.board = null; // { id, x, z, perch } – das Futterbrett, das gerade steht
    this.syncT = 0;
    this.glintT = 0;
    this.pendingFunk = null; // Eddas Zeile, sobald die Karte zu ist
    this.fresh = false; // heute früh kam eine Gabe (Zeile im Morgenbericht oder Meldung)
    this.stats = { fed: 0, taken: 0, returned: 0, eaten: 0 };
  }

  get data() {
    return this.game.state.crows;
  }

  /** Sind die Krähen gerade in der Bucht (nicht abends, nicht nachts)? */
  daytime() {
    const h = hoursOf(this.game.state.time.minute);
    return h >= CROW_FEED.from && h <= CROW_FEED.until;
  }

  /** Das Futterbrett suchen und den Platz der Krähen, Krümel und Gabe daran ausrichten. */
  sync() {
    const g = this.game;
    const w = g.world;
    const b = w.buildings.list.find((x) => x.type === 'futterbrett' && !x.broken) || null;
    if (this.board && (!b || b.id !== this.board.id)) {
      w.crows.removePerch(this.board.perch);
      this.board = null;
    }
    if (b && !this.board) {
      const x = b.i + 0.5; // ein Feld: die Mitte der Zelle
      const z = b.j + 0.5;
      const turns = b.turns || 0;
      const at = feederOffset(FEEDER_SPOTS.crow, turns);
      const perch = w.crows.addPerch({ x: x + at.x, y: FEEDER_TOP * U, z: z + at.z, board: true });
      const gift = feederOffset(FEEDER_SPOTS.gift, turns);
      this.board = { id: b.id, x, z, turns, perch, gift: { x: x + gift.x, z: z + gift.z } };
      w.crows.onCrumbs = () => this.eaten();
    }
    w.crows.tame = this.data.trust >= CROW_TRUST.tame;
    w.setFeeder?.(this.board ? { x: this.board.x, z: this.board.z, turns: this.board.turns, crumbs: Boolean(w.crows.crumbs), gift: this.data.gift } : null);
  }

  update(dt) {
    const g = this.game;
    this.syncT -= dt;
    if (this.syncT <= 0) {
      this.syncT = 0.5;
      this.sync();
    }
    if (g.mode !== 'play') return;
    // Eddas Zeile nach der Karte (der Schlüssel, der Brief)
    if (this.pendingFunk) {
      g.funk.say(this.pendingFunk);
      this.pendingFunk = null;
    }
    // Kam die Gabe ohne Morgenbericht (wach durch die Nacht), sagt es eine Meldung, sobald es hell ist
    if (this.fresh && this.daytime()) {
      this.fresh = false;
      g.hud.toast(T.kraehen.glaenzt, 'futterbrett', 4);
    }
    const p = g.player.position;
    // Die Gabe glänzt, solange Mika sie sehen kann
    if (this.board && this.data.gift) {
      this.glintT -= dt;
      if (this.glintT <= 0) {
        this.glintT = 1.6;
        const { x: gx, z: gz } = this.board.gift;
        if (Math.hypot(p.x - gx, p.z - gz) < 16) {
          g.world.particles.spawn({ x: gx, y: FEEDER_TOP * U + 0.08, z: gz, vx: 0, vy: 0.35, vz: 0, life: 0.5, size0: 2, size1: 1, color0: 0xfff2c4, alpha0: 1, alpha1: 0.4, drag: 0, lift: 0, windFactor: 0 });
        }
      }
    }
    // Der Moment, in dem Mika merkt, dass sie bleiben (einmal)
    const f = g.state.flags;
    if (f.kraehenZahm && !f.kraehenZahmGesagt && !g.hud.speech) {
      const near = g.world.crows.list.some((c) => c.state === 'sitzt' && Math.hypot(c.pos.x - p.x, c.pos.z - p.z) < 2.2);
      if (near) {
        f.kraehenZahmGesagt = true;
        g.hud.say(T.kraehen.zahm, 4);
      }
    }
  }

  /** Text der Einblendung am Futterbrett. */
  prompt() {
    return this.data.gift ? T.aktionen.gabeNehmen : T.aktionen.fuettern;
  }

  /** Warum gerade nicht (grau unter der Einblendung), sonst null. */
  blocked() {
    if (this.data.gift) return null;
    if (!this.daytime()) return T.kraehen.abends;
    if (this.data.fed === this.game.state.time.day) return T.kraehen.schonGefuettert;
    return null;
  }

  /** E am Futterbrett: eine wartende Gabe nehmen, sonst Krümel streuen. */
  use() {
    const g = this.game;
    if (this.data.gift) return this.take();
    const why = this.blocked();
    if (why) {
      g.hud.say(why, 2.6);
      return false;
    }
    this.sync();
    if (!this.board) return false;
    this.data.fed = g.state.time.day;
    this.stats.fed++;
    g.world.crows.feed(this.board.perch);
    g.sound.play('rupfen', { x: this.board.x, z: this.board.z });
    g.effects.chips(this.board.x, FEEDER_TOP * U + 0.05, this.board.z, 'kruemel', 4);
    if (!g.state.flags.kraehenGefuettert) {
      g.state.flags.kraehenGefuettert = true;
      g.hud.say(T.kraehen.erstesMal, 3);
      g.funk.once('kraehenEdda', T.kraehen.eddaErst);
    }
    this.sync();
    g.quietSave();
    return true;
  }

  /** Die Krümel sind aufgepickt (die Krähe krächzt zufrieden). */
  eaten() {
    this.stats.eaten++;
    if (this.board) this.game.sound.play('kraehe', { x: this.board.x, z: this.board.z, volume: 0.6 });
    this.sync();
  }

  /**
   * Am Morgen (onNewDay): Krümel von gestern sind weg; Vertrauen wächst nach einem Tag mit
   * Krümeln und sinkt nach einem ohne; danach liegt vielleicht eine Gabe auf dem Brett.
   */
  morning() {
    const g = this.game;
    const st = g.state;
    const c = this.data;
    const day = st.time.day;
    g.world.crows.crumbs = null;
    this.sync();
    if (!this.board && !c.fed) return;
    const before = c.trust;
    const fedYesterday = c.fed === day - 1;
    if (fedYesterday) c.trust = Math.min(CROW_TRUST.max, c.trust + 1);
    else if (c.fed < day - 1) c.trust = Math.max(0, c.trust - CROW_TRUST.decay);
    if (before < CROW_TRUST.tame && c.trust >= CROW_TRUST.tame) st.flags.kraehenZahm = true;
    if (!fedYesterday || c.gift || c.trust < CROW_TRUST.gift || !this.board) return;
    const rng = new Rng(Math.floor(hash3(st.world.mapSeed >>> 0, day, 77, 3) * 1e9));
    if (!rng.chance(giftChance(c.trust))) return;
    const id = nextGift(st);
    if (!id) return;
    c.gift = id;
    this.fresh = true;
    this.sync();
  }

  /** Zeile für den Morgenbericht (einmal). */
  news() {
    if (!this.fresh) return [];
    this.fresh = false;
    return [{ text: T.kraehen.glaenzt }];
  }

  /** Die Gabe vom Brett nehmen: Karte, dann wohin sie gehört. */
  take() {
    const g = this.game;
    const st = g.state;
    const c = this.data;
    const id = c.gift;
    const def = giftOf(id);
    if (!def) return false;
    c.gift = null;
    c.got.push(id);
    this.stats.taken++;
    let line;
    if (def.jar) {
      if (!c.jar.includes(id)) c.jar.push(id);
      g.world.refreshCrowJar?.(c.jar, c.chest >= 2);
      line = T.kraehen.glas;
    } else if (def.owner) {
      if (!c.carry.includes(id)) c.carry.push(id);
      line = T.kraehen.gehoert[def.owner];
    } else if (def.res) {
      gain(st.inventory, def.res);
      line = T.kraehen.vorrat(Object.entries(def.res).map(([r, n]) => T.menge(n, r)).join(', '));
    } else if (def.part) {
      g.gainPart(def.part);
      line = T.kraehen.teil(T.turmteile[def.part]?.[0] || def.part);
    } else if (def.key) {
      c.chest = Math.max(c.chest, 1);
      g.world.setLooseBoard?.(true);
      line = T.kraehen.schluessel;
      this.pendingFunk = T.kraehen.eddaSchluessel;
    }
    g.sound.play('aufheben');
    g.player.express?.('froh', 1.2);
    g.deliveryCard.open([{ crow: id, line }]);
    g.mode = 'lieferung';
    this.sync();
    g.book.check?.();
    g.quietSave();
    return true;
  }

  /** Antwort im Gespräch: das Stück zurückgeben (Sprechblase der Person). */
  giveBack(owner) {
    const g = this.game;
    const c = this.data;
    const id = c.carry.find((x) => giftOf(x)?.owner === owner);
    if (!id) return false;
    c.carry = c.carry.filter((x) => x !== id);
    c.back.push(id);
    this.stats.returned++;
    const n = g.survivors.npcs.list.get(owner);
    if (n) g.hud.bubble(n, T.kraehen.dank[owner].replace('{name}', g.bonds?.callName(owner) || 'Mika'), 4.2);
    g.sound.play('aufheben');
    g.quietSave();
    return true;
  }

  /** E an der losen Diele: Jakobs Schatulle – der Brief, dann der Kompass auf der Fensterbank. */
  openChest() {
    const g = this.game;
    const c = this.data;
    if (c.chest !== 1) return false;
    c.chest = 2;
    g.world.setLooseBoard?.(false);
    g.world.refreshCrowJar?.(c.jar, true);
    g.sound.play('kiste');
    g.deliveryCard.open([
      { letter: 'jakob', kind: 'schatulle', name: T.kraehen.schatulle, place: null, day: g.state.time.day, text: T.kraehen.brief, from: T.kraehen.briefOrt },
      { crow: 'kompass', line: T.kraehen.kompass },
    ]);
    g.mode = 'lieferung';
    this.pendingFunk = T.kraehen.eddaBrief;
    g.quietSave();
    return true;
  }

  /** Prüfung: Zustand, Brett, Krähen. */
  info() {
    const c = this.data;
    const w = this.game.world;
    return {
      ...JSON.parse(JSON.stringify(c)),
      board: this.board ? { id: this.board.id, x: this.board.x, z: this.board.z, crow: this.board.perch.crow ? this.board.perch.crow.id : null } : null,
      tame: w.crows.tame,
      crumbs: w.crows.crumbs ? w.crows.crumbs.left : 0,
      pecks: w.crows.pecks,
      stats: { ...this.stats },
    };
  }
}
