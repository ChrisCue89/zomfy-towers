// A5: Gemeinsam kochen – der Ablauf (data/cooking.js, OFFENE-FRAGEN 234), die dritte Abendaktivität
// nach Karten und Angeln. Abends lädt Mika im Gespräch jemanden ein. Bei gutem Wetter sitzen sie am
// Lagerfeuer (das Gegenüber auf dem Stamm im Norden, Mika im Sessel, dazwischen der Kessel am
// Dreibein), bei Regen und Schnee in der Stube am Kamin (der Topf auf dem Dreifuß). Die Uhr steht
// (Modus 'kochen'):
//
//   wahl (A/D: ein Gericht aus dem Vorrat, E nimmt es) → schnippeln (das Messer wandert übers
//   Brett, E schneidet – in der Marke sauber) → wuerzen (das Gegenüber sagt vorher, wie es das mag;
//   A/D, E) → koecheln (der Kessel blubbert, E nimmt ihn vom Feuer – golden im Fenster) → essen
//   (die Karte mit Schüssel, Löffeln, dem Satz des Gegenübers und der Wirkung; E steht auf).
//
// Esc geht nur bei der Wahl (danach ist schon geschnippelt). Das Bild macht ui/cookingView.js.

import { COOKING, DISHES, DISH_ORDER, SPICES, SCORE, tasteOf, missingFor, eveningTaken, mealEffect } from '../data/cooking.js';
import { WEATHER } from '../data/weather.js';
import { T } from '../data/texts.js';
import { pay } from './inventory.js';
import { Rng } from './rng.js';

export class Cooking {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.session = null;
    this.stats = { cuts: 0, clean: 0, meals: 0 }; // für die Prüfung
  }

  get data() {
    return this.game.state.cooking;
  }

  /** Warum Mika jetzt nicht mit `friend` kochen kann – null heißt: Es geht. */
  blocked(friend = null) {
    const g = this.game;
    const st = g.state;
    if (g.nights?.active) return 'nacht';
    if (eveningTaken(st)) return 'heute'; // ein Abend, eine Aktivität
    const m = st.time.minute;
    if (m < COOKING.from || m > COOKING.until) return 'zeit';
    if (friend && !g.survivors.resident(friend)) return 'niemand';
    if (!DISH_ORDER.some((id) => !Object.keys(missingFor(st, id)).length)) return 'vorrat';
    return null;
  }

  /** Drinnen am Kamin (Regen, Schnee) oder draußen am Lagerfeuer? Plätze und Blick. */
  spot() {
    const w = this.game.world;
    const wx = WEATHER[w.weather.kind] || WEATHER.klar;
    return w.cookSpot(wx.rain > 0 || wx.snow > 0 ? 'kamin' : 'feuer');
  }

  /** Einladung angenommen: hinsetzen, der Kessel hängt über dem Feuer, die Wahl der Gerichte. */
  begin(friend) {
    const g = this.game;
    if (this.blocked(friend)) return false;
    const st = g.state;
    const d = this.data;
    const spot = this.spot();
    const taste = tasteOf(friend);
    const seed = ((st.world.mapSeed || 1) * 7919 + st.time.day * 104729 + d.evenings * 37 + 5) >>> 0;
    // Vorgewählt: das Lieblingsgericht, wenn es geht – sonst das erste, das geht
    const possible = DISH_ORDER.filter((id) => !Object.keys(missingFor(st, id)).length);
    const first = possible.includes(taste.dish) ? taste.dish : possible[0];
    this.session = {
      friend,
      spot,
      taste,
      phase: 'wahl',
      t: 0,
      choice: DISH_ORDER.indexOf(first),
      dish: null,
      rng: new Rng(seed),
      knife: 0,
      knifeDir: 1,
      mark: 0.5,
      cuts: [],
      spice: SPICES.indexOf('kraeuter'),
      spiceOk: false,
      boil: 0,
      timing: null,
      card: null,
      message: null,
    };
    d.evenings++;
    d.lastDay = st.time.day;
    g.builder?.cancel?.();
    g.world.cookLook = spot.look; // die Kamera rückt an den Kessel (lookSpot »kochen«)
    g.world.showKettle(spot, null);
    g.survivors.seatAt(friend, spot.friend);
    g.player.seat(spot.mika);
    g.applyView(g.world.isInside(spot.mika.x, spot.mika.z)); // nah heran (160 px/m)
    g.sound.play('aufheben', { volume: 0.5 });
    g.mode = 'kochen';
    g.cookingView?.open(this.session);
    this.say(T.kochen.einladung[this.pick(T.kochen.einladung.length)]);
    g.useLockUntil = g.clock + 0.3; // das E der Einladung wählt noch nichts
    return true;
  }

  /** Das Gegenüber sagt etwas (Sprechblase über dem Kopf). */
  say(text, seconds = 3.2) {
    const s = this.session;
    const g = this.game;
    const n = s && g.survivors.npcs.list.get(s.friend);
    if (n) g.hud.bubble(n, text.replace('{name}', g.bonds?.callName(s.friend) || 'Mika'), seconds);
  }

  /** Fester Zufall aus dem Abend (für Sätze). */
  pick(n) {
    return this.session.rng.int(0, n - 1);
  }

  /** Jeder Schritt im Modus 'kochen' (die Uhr steht). */
  update(dt, input) {
    const s = this.session;
    if (!s) return;
    const g = this.game;
    s.t += dt;
    if (s.message) {
      s.message.t -= dt;
      if (s.message.t <= 0) s.message = null;
    }
    const ready = g.clock >= (g.useLockUntil || 0);
    switch (s.phase) {
      case 'wahl': {
        if (input.pressed('menu')) {
          this.end(false);
          return;
        }
        if (input.pressed('left')) s.choice = (s.choice + DISH_ORDER.length - 1) % DISH_ORDER.length;
        if (input.pressed('right')) s.choice = (s.choice + 1) % DISH_ORDER.length;
        if (input.pressed('use') && ready) this.choose(DISH_ORDER[s.choice]);
        break;
      }
      case 'schnippeln': {
        s.knife += (dt / (COOKING.knife / 2)) * s.knifeDir;
        if (s.knife >= 1) {
          s.knife = 1;
          s.knifeDir = -1;
        } else if (s.knife <= 0) {
          s.knife = 0;
          s.knifeDir = 1;
        }
        if (input.pressed('use') && ready) this.cut();
        break;
      }
      case 'wuerzen': {
        if (input.pressed('left')) s.spice = (s.spice + SPICES.length - 1) % SPICES.length;
        if (input.pressed('right')) s.spice = (s.spice + 1) % SPICES.length;
        if (input.pressed('use') && ready) this.season(SPICES[s.spice]);
        break;
      }
      case 'koecheln': {
        s.boil += dt / COOKING.simmer;
        if (input.pressed('use') && ready) this.takeOff();
        else if (s.boil >= 1) this.takeOff();
        break;
      }
      case 'essen':
        if ((input.pressed('use') || input.pressed('menu')) && ready && s.t > 0.4) this.end(true);
        break;
      default:
        break;
    }
  }

  setPhase(phase) {
    this.session.phase = phase;
    this.session.t = 0;
  }

  /** Ein Gericht wählen: geht es, wandert es in den Kessel (die Zutaten sind dann verbraucht). */
  choose(id) {
    const g = this.game;
    const s = this.session;
    const st = g.state;
    const missing = missingFor(st, id);
    if (Object.keys(missing).length) {
      g.sound.play('leer');
      s.message = { text: T.kochen.fehlt(Object.entries(missing).map(([r, n]) => T.kochen.zutat(n, r)).join(', ')), t: 2.2 };
      return false;
    }
    const need = { ...DISHES[id].need };
    if (need.fisch) {
      st.fishing.basket = Math.max(0, (st.fishing.basket || 0) - need.fisch);
      delete need.fisch;
    }
    pay(st.inventory, need);
    s.dish = id;
    s.mark = 0.3 + s.rng.next() * 0.4;
    g.world.showKettle(s.spot, id);
    g.sound.play('aufheben');
    this.setPhase('schnippeln');
    this.say(T.kochen.gewaehlt[id]);
    return true;
  }

  /** Ein Schnitt: in der Marke sauber, daneben ungleich – dann wandert die Marke weiter. */
  cut() {
    const g = this.game;
    const s = this.session;
    const clean = Math.abs(s.knife - s.mark) <= COOKING.zone / 2;
    s.cuts.push(clean);
    this.stats.cuts++;
    if (clean) this.stats.clean++;
    g.sound.play('tipp', { rate: clean ? 1.25 : 0.8 });
    if (s.cuts.length >= COOKING.cuts) {
      this.setPhase('wuerzen');
      const tips = T.kochen.wuerzeHinweis[s.taste.spice];
      this.say(tips[s.friend] || tips.allgemein, 4);
      return;
    }
    // die nächste Marke: ein Stück weiter, nie am Rand
    let next = 0.15 + s.rng.next() * 0.7;
    if (Math.abs(next - s.mark) < 0.2) next = next > 0.5 ? next - 0.3 : next + 0.3;
    s.mark = next;
  }

  /** Würzen: richtig ist, was das Gegenüber mag. */
  season(spice) {
    const g = this.game;
    const s = this.session;
    s.spiceOk = spice === s.taste.spice;
    s.spiceUsed = spice;
    g.sound.play('rupfen', { volume: 0.7 });
    this.setPhase('koecheln');
    s.boil = 0;
  }

  /** Vom Feuer nehmen: roh, golden oder angebrannt – dann wird gegessen. */
  takeOff() {
    const g = this.game;
    const s = this.session;
    const [a, b] = COOKING.window;
    s.timing = s.boil < a ? 'roh' : s.boil <= b ? 'gold' : 'angebrannt';
    const clean = s.cuts.filter(Boolean).length;
    const favorite = s.dish === s.taste.dish;
    let points = (clean >= SCORE.cuts[1] ? 2 : clean >= SCORE.cuts[0] ? 1 : 0) + (s.spiceOk ? 1 : 0) + (s.timing === 'gold' ? 1 : 0) + (favorite ? 1 : 0) + (s.taste.chef ? 1 : 0);
    if (s.timing === 'angebrannt') points = Math.max(0, points - 1);
    const spoons = points >= SCORE.spoons[2] ? 3 : points >= SCORE.spoons[1] ? 2 : 1;
    const st = g.state;
    const d = this.data;
    d.meal = { id: s.dish, day: st.time.day, q: spoons };
    d.cooked[s.dish] = (d.cooked[s.dish] || 0) + 1;
    d.best[s.dish] = Math.max(d.best[s.dish] || 0, spoons);
    if (!d.tastes.includes(s.friend)) d.tastes.push(s.friend);
    this.stats.meals++;
    // Satt und warm: volle Lebenspunkte (mit dem Mehr des Gerichts)
    st.player.hp = g.combat.maxHp;
    const e = mealEffect(st);
    const own = T.kochen.urteilEigen[s.friend];
    const line = favorite && spoons === 3 && own ? own : favorite ? T.kochen.lieblings[spoons - 1] : T.kochen.urteil[spoons - 1][this.pick(T.kochen.urteil[spoons - 1].length)];
    s.card = {
      dish: s.dish,
      spoons,
      favorite,
      timing: s.timing,
      clean,
      spiceOk: s.spiceOk,
      line: line.replace('{name}', g.bonds?.callName(s.friend) || 'Mika'),
      effect: T.kochen.wirkung(e),
    };
    g.sound.play(spoons === 3 ? 'aufwertung' : 'aufheben');
    g.world.showKettle(s.spot, null); // der Kessel ist leer gegessen
    this.setPhase('essen');
    g.book?.check?.();
  }

  /** Aufstehen: das Gegenüber geht wieder, der Abend ist weiter, gemeinsame Zeit (wenn gekocht). */
  end(cooked) {
    const g = this.game;
    const s = this.session;
    if (!s) return;
    this.session = null;
    g.player.seat(null);
    g.survivors.seatAt(s.friend, null);
    if (cooked) g.bonds?.add(s.friend, 'kochen'); // gemeinsame Zeit am Kessel (M29)
    g.world.hideKettle();
    g.world.cookLook = null;
    g.cookingView?.close();
    g.applyView(g.world.isInside(g.player.position.x, g.player.position.z));
    g.state.time.minute += cooked ? COOKING.minutes : 10; // die Uhr stand – jetzt ist der Abend weiter
    g.mode = 'play';
    g.useLockUntil = g.clock + 0.4;
    if (cooked) g.hud.toast(T.kochen.satt(T.kochen.namen[s.dish]), 'herz', 4);
    g.quietSave();
  }

  /** Für die Prüfung. */
  info() {
    const s = this.session;
    return {
      ...JSON.parse(JSON.stringify(this.data)),
      blocked: this.blocked(),
      effect: mealEffect(this.game.state),
      session: s
        ? { friend: s.friend, phase: s.phase, choice: DISH_ORDER[s.choice], dish: s.dish, knife: +s.knife.toFixed(2), mark: +s.mark.toFixed(2), cuts: s.cuts.slice(), spice: SPICES[s.spice], hint: s.taste.spice, boil: +s.boil.toFixed(2), timing: s.timing, card: s.card ? { ...s.card } : null, inside: Boolean(s.spot.inside), message: s.message?.text || null }
        : null,
      stats: { ...this.stats },
    };
  }
}
