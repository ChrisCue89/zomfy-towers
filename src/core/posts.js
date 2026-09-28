// Posten (M23, DESIGN 8): Eingezogene Überlebende beziehen abends einen
// Hochsitz neben dem Weg (Auswahl des Hochsitzes: »Bert auf den Posten«) und
// helfen dort nachts auf ihre Art (data/posts.js). Knopf hütet ohne Posten den
// Hof. Niemand wird besiegt: Rütteln die Schlurfer zu lange am Hochsitz, zieht
// sich die Person ins Haus zurück. Morgens erzählen sie im Bericht, was sie
// getan haben; nach einer gehaltenen Bossnacht gibt es ein Fest am Feuer.

import { T } from '../data/texts.js';
import { POST_ROLES, POST_ORDER, POST_NERVE, POST_REACH, POST_HEIGHT, KNOPF_GUARD, FEAST } from '../data/posts.js';
import { SURVIVORS } from '../data/survivors.js';
import { BUILDINGS, maxHpOf } from '../data/buildings.js';
import { isLeaderNight } from '../data/waves.js';
import { LAYOUT } from '../world/layout.js';
import { hoursOf } from './state.js';

export class Posts {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.timers = {}; // Sekunden bis zur nächsten Tat je Person
    this.nerve = {}; // wie viel sie diese Nacht noch aushalten
    this.retreated = new Set(); // diese Nacht ins Haus zurückgezogen
    this.onShift = null; // stehen sie gerade auf den Posten?
    this.feasting = null; // feiern sie gerade am Feuer?
    this.junaCd = 0; // Pause des Leuchtfeuers (s)
    this.guardT = 0;
    this.lastFlash = 0;
  }

  /** Nach dem Laden: Wer sich in dieser Nacht schon zurückgezogen hat, bleibt drinnen. */
  apply() {
    const st = this.game.state;
    this.retreated = new Set(this.game.nights.active ? st.night.posts?.rueckzug || [] : []);
    this.onShift = null;
    this.feasting = null;
  }

  /** Hochsitz, auf dem diese Person steht (oder null). */
  postOf(id) {
    return this.game.world.buildings.list.find((b) => b.type === 'hochsitz' && b.post === id && !b.broken) || null;
  }

  /** Wer kann auf einen Posten? Eingezogene Menschen (Knopf hütet den Hof). */
  candidates() {
    return POST_ORDER.filter((id) => this.game.survivors.resident(id));
  }

  /** Jemanden auf diesen Hochsitz stellen – ein anderer Posten dieser Person wird frei. */
  assign(b, id) {
    const g = this.game;
    for (const o of g.world.buildings.list) if (o.type === 'hochsitz' && o.post === id) o.post = null;
    b.post = id;
    g.state.world.buildings = g.world.buildings.toState();
    g.hud.toast(T.posten.bezogen(SURVIVORS[id].name), id, 3);
    g.sound.play('bau', { volume: 0.5 });
    this.replace();
    g.quietSave();
  }

  /** Posten räumen. */
  free(b) {
    const g = this.game;
    if (!b.post) return;
    const id = b.post;
    b.post = null;
    g.state.world.buildings = g.world.buildings.toState();
    g.hud.toast(T.posten.geraeumt(SURVIVORS[id].name), id, 2.5);
    this.replace();
    g.quietSave();
  }

  /** Alle an ihre Stelle (Posten, Zelt, Feuer) und die Einblendungen neu. */
  replace() {
    this.game.survivors.placeAll(true);
    this.game.survivors.refreshInteractions();
  }

  /** Dienstzeit: von der Dämmerung (die anderen gehen schlafen) bis zum Morgen – und solange die Nacht läuft. */
  shift() {
    return this.game.nights.active || !this.game.survivors.isOutsideTime();
  }

  /** Steht diese Person gerade auf ihrem Hochsitz? */
  onDuty(id) {
    return this.onShift === true && !this.retreated.has(id) && this.game.survivors.resident(id) && Boolean(this.postOf(id));
  }

  /** Oben auf dem Hochsitz. */
  spotOf(b) {
    const c = this.game.world.buildings.bounds(b);
    return { x: c.x, z: c.z - 0.05, y: POST_HEIGHT };
  }

  /** Statistik der laufenden Nacht (außerhalb der Nacht: eine Wegwerf-Tafel). */
  stats() {
    const g = this.game;
    if (!g.nights.active) return {};
    return (g.state.night.posts = g.state.night.posts || {});
  }

  update(dt) {
    const g = this.game;
    this.junaCd = Math.max(0, this.junaCd - dt);
    const shift = this.shift();
    if (shift !== this.onShift) {
      // Abends auf die Posten, morgens wieder ins Zelt (neue Nerven für die nächste Nacht)
      if (this.onShift !== null) {
        this.retreated.clear();
        this.nerve = {};
        this.timers = {};
      }
      this.onShift = shift;
      this.replace();
    }
    const feast = this.feastNow();
    if (feast !== this.feasting) {
      // Festmorgen: alle kommen ans Feuer (nach dem Laden sofort), mittags gehen sie an ihre Plätze
      const first = this.feasting === null;
      this.feasting = feast;
      this.game.survivors.placeAll(first);
      if (feast && !first) g.sound.play('jubel');
    }
    if (this.feasting) this.cheer(dt);
    if (!shift) return;
    const stats = this.stats();
    for (const id of POST_ORDER) {
      if (!this.onDuty(id)) continue;
      const b = this.postOf(id);
      const c = g.world.buildings.bounds(b);
      // Schlurfer am Hochsitz rütteln an den Nerven – dann geht es ins Haus
      let press = 0;
      for (const z of g.horde.inRange(c.x, c.z, POST_REACH)) if (!z.def.flying && z.state !== 'dying') press += z.def.bite;
      if (press) {
        this.nerve[id] = (this.nerve[id] ?? POST_NERVE) - press * dt * 0.6;
        if (this.nerve[id] <= 0) {
          this.retreat(id);
          continue;
        }
      }
      this.timers[id] = (this.timers[id] ?? 0) - dt;
      this.act(id, POST_ROLES[id], c, dt, stats);
    }
    if (g.nights.active && g.survivors.resident('knopf')) this.guard(dt, stats);
  }

  /** Was jemand auf dem Posten tut. */
  act(id, role, c, dt, stats) {
    const g = this.game;
    const n = g.survivors.npcs.list.get(id);
    if (role.kind === 'flicken') {
      // Bert: Barrikaden, Wall und Tor in der Nähe flicken
      let healed = 0;
      for (const b of g.world.buildings.list) {
        if (b.broken || !(b.type === 'barrikade' || BUILDINGS[b.type].camp)) continue;
        const max = maxHpOf(b);
        if (!(b.hp < max)) continue;
        const bc = g.world.buildings.bounds(b);
        if (Math.hypot(bc.x - c.x, bc.z - c.z) > role.radius + Math.max(bc.w, bc.d) / 2) continue;
        const add = Math.min(max - b.hp, role.heal * dt);
        b.hp += add;
        healed += add;
      }
      if (healed > 0) {
        stats.bert = (stats.bert || 0) + healed;
        if (this.timers[id] <= 0) {
          this.timers[id] = 1.2;
          g.sound.play('bau', { x: c.x, z: c.z, volume: 0.35 });
          if (n) n.wave = 0.4;
        }
      }
      return;
    }
    if (role.kind === 'glas') {
      // Hilde: ein Einmachglas auf den nächsten Schlurfer im Umkreis
      if (this.timers[id] > 0) return;
      const target = this.nearest(c, role.radius);
      if (!target) return;
      this.timers[id] = role.every;
      g.horde.damage(target, role.damage, { source: 'turm', kind: 'glas' });
      g.horde.slow(target, role.slow, role.slowTime);
      g.effects.splat(target.x, 0.9, target.z, 'honig', 10, 0.8);
      g.sound.play('klirr', { x: target.x, z: target.z, volume: 0.6 });
      if (n) n.wave = 0.5;
      stats.hilde = (stats.hilde || 0) + 1;
      return;
    }
    if (role.kind === 'arzt') {
      // Dr. Yusuf: Mika und die Türme in der Nähe verarzten
      const p = g.player.position;
      const st = g.state;
      if (!g.viewInside && Math.hypot(p.x - c.x, p.z - c.z) <= role.radius && st.player.hp < g.combat.maxHp && st.player.hp > 0) {
        const add = Math.min(g.combat.maxHp - st.player.hp, role.heal * dt);
        st.player.hp += add;
        stats.yusuf = (stats.yusuf || 0) + add;
      }
      for (const t of g.world.buildings.towers) {
        const max = maxHpOf(t);
        if (!(t.hp > 0 && t.hp < max)) continue;
        const tc = g.world.buildings.bounds(t);
        if (Math.hypot(tc.x - c.x, tc.z - c.z) <= role.radius) t.hp = Math.min(max, t.hp + role.towerHeal * dt);
      }
    }
    // Juna: Das Leuchtfeuer wartet auf die Taste J (junaFlash)
  }

  /** Nächster sichtbarer Schlurfer im Umkreis (nicht in der Luft, nicht unter der Erde). */
  nearest(c, r) {
    let best = null;
    let bd = r * r;
    for (const z of this.game.horde.inRange(c.x, c.z, r)) {
      if (z.state === 'dying' || z.y < -0.3 || this.game.horde.isHidden(z) || z.def.flying) continue; // Gräber unter der Erde nicht
      const d = (z.x - c.x) ** 2 + (z.z - c.z) ** 2;
      if (d < bd) {
        bd = d;
        best = z;
      }
    }
    return best;
  }

  /** Juna zündet das Leuchtfeuer (Taste J): betäubt, blendet und holt aus dem Nebel. */
  junaFlash() {
    const g = this.game;
    if (!this.onDuty('juna')) {
      if (g.survivors.resident('juna') && g.nights.active) g.hud.toast(T.posten.junaKeinPosten, 'juna', 2.5);
      return false;
    }
    if (this.junaCd > 0) {
      g.hud.toast(T.posten.junaWartet(Math.ceil(this.junaCd)), 'juna', 1.8);
      return false;
    }
    const role = POST_ROLES.juna;
    const c = g.world.buildings.bounds(this.postOf('juna'));
    this.junaCd = role.cooldown;
    let hit = 0;
    for (const z of g.horde.inRange(c.x, c.z, role.radius)) {
      if (z.state === 'dying') continue;
      g.horde.stun(z, role.stun, true);
      g.horde.status(z, 'geblendet', role.blind);
      g.horde.reveal(z, role.blind);
      hit++;
    }
    g.effects.splat(c.x, POST_HEIGHT + 0.8, c.z, 'licht', 30, 1.6);
    g.hud.ring(c.x, c.z, role.radius, 'licht');
    g.hud.popWord(c.x, POST_HEIGHT + 1.4, c.z, T.posten.wort, '#fff6d8');
    g.sound.play('blitz', { x: c.x, z: c.z });
    const n = g.survivors.npcs.list.get('juna');
    if (n) n.wave = 0.8;
    const stats = this.stats();
    stats.juna = (stats.juna || 0) + 1;
    this.lastFlash = hit; // für die Prüfung
    return true;
  }

  /** Knopf hütet den Hof: einzelne Schwärmer jagt er davon. */
  guard(dt, stats) {
    const g = this.game;
    if ((this.guardT -= dt) > 0) return;
    const G = KNOPF_GUARD;
    for (const z of g.horde.list) {
      if (z.type !== 'schwaermer' || z.state === 'dying' || g.horde.isHidden(z)) continue;
      if (g.world.pathing.distanceToHome(z.x, z.z) > G.radius) continue;
      this.guardT = G.every;
      const home = g.world.pathing.attackPoint(z.x, z.z);
      g.horde.damage(z, G.damage, { push: G.push, fromX: home.x, fromZ: home.z, source: 'turm', kind: 'knopf' });
      const dog = g.survivors.npcs.list.get('knopf');
      if (dog) dog.bark = 0.6;
      g.sound.play('bellen', { x: z.x, z: z.z, volume: 0.8 });
      stats.knopf = (stats.knopf || 0) + 1;
      return;
    }
    this.guardT = 0.3;
  }

  /** Zu viel abbekommen: ab ins Haus – niemand wird besiegt. */
  retreat(id) {
    this.retreated.add(id);
    const stats = this.stats();
    stats.rueckzug = [...new Set([...(stats.rueckzug || []), id])];
    this.game.hud.toast(T.posten.rueckzug(SURVIVORS[id].name), id, 4);
    this.replace();
  }

  /** Nach der Nacht: Fest nach einer gehaltenen Bossnacht (am Morgen darauf). */
  onNightEnd(won) {
    const st = this.game.state;
    if (won && isLeaderNight(st.night.n)) st.feast = st.night.n + 1;
  }

  /** Feiern sie heute? (Morgens am Feuer, nachts treffen die Türme härter.) */
  feastToday() {
    const st = this.game.state;
    return st.feast > 0 && st.feast === st.time.day;
  }

  /** Stehen sie gerade am Feuer (Festtag bis Mittag)? */
  feastNow() {
    if (!this.feastToday() || !this.game.survivors.isOutsideTime()) return false;
    return hoursOf(this.game.state.time.minute) < FEAST.until;
  }

  /** Am Feuer wird gefeiert: reihum winkt jemand, Knopf bellt ab und zu mit. */
  cheer(dt) {
    if ((this.cheerT = (this.cheerT ?? 1) - dt) > 0) return;
    this.cheerT = 1.6;
    const g = this.game;
    this.cheerK = ((this.cheerK ?? -1) + 1) % (POST_ORDER.length + 1);
    const id = this.cheerK < POST_ORDER.length ? POST_ORDER[this.cheerK] : 'knopf';
    const n = g.survivors.npcs.list.get(id);
    if (!n || !n.model.root.visible || !g.survivors.resident(id)) return;
    if (n.dog) n.bark = 0.5;
    else n.wave = 1.2;
  }

  /** Platz im Kreis ums Lagerfeuer (Blick zum Feuer) – für die Überlebenden am Festmorgen. */
  feastSpot(id) {
    if (!this.feasting) return null;
    const k = POST_ORDER.indexOf(id);
    if (k < 0) return null;
    const c = LAYOUT.campfire;
    const a = Math.PI * 0.15 + (k / POST_ORDER.length) * Math.PI * 2;
    const x = c.x + Math.cos(a) * FEAST.radius;
    const z = c.z + Math.sin(a) * FEAST.radius;
    return { x, z, facing: Math.atan2(c.x - x, c.z - z) };
  }

  /** Schaden der Türme in dieser Nacht (nach dem Fest: mehr). */
  towerDamage() {
    return this.feastToday() ? FEAST.damage : 1;
  }

  /** Zeilen im Morgenbericht: Wer hat nachts was getan? Dazu das Fest. */
  morning() {
    const st = this.game.state;
    const lines = [];
    const p = st.night.n === st.time.day - 1 ? st.night.posts || {} : {};
    const b = T.posten.bericht;
    const parts = [];
    if (p.bert >= 1) parts.push(b.bert(Math.round(p.bert)));
    if (p.hilde) parts.push(b.hilde(p.hilde));
    if (p.juna) parts.push(b.juna(p.juna));
    if (p.yusuf >= 1) parts.push(b.yusuf(Math.round(p.yusuf)));
    if (p.knopf) parts.push(b.knopf(p.knopf));
    // Eine Zeile (der Bericht bricht sie um): »Auf den Posten: Bert flickte 120, Hilde warf 14 Gläser …«
    if (parts.length) lines.push({ text: `${b.titel} ${parts.join(', ')}.` });
    for (const id of p.rueckzug || []) lines.push({ text: b.rueckzug(SURVIVORS[id].name), bad: true });
    if (this.feastToday()) lines.push({ text: T.posten.fest });
    return lines;
  }

  /** Anzeige unten (Juna auf Posten): Taste J und wie lange das Leuchtfeuer noch wartet. */
  junaView() {
    if (!this.onDuty('juna')) return null;
    return { wartet: this.junaCd };
  }

  /** Für die Prüfung: wer wo steht, Nerven, Pause des Leuchtfeuers, Fest. */
  view() {
    return {
      onShift: this.onShift,
      posts: this.game.world.buildings.list.filter((b) => b.type === 'hochsitz').map((b) => ({ id: b.id, post: b.post || null })),
      duty: POST_ORDER.filter((id) => this.onDuty(id)),
      retreated: [...this.retreated],
      nerve: { ...this.nerve },
      junaCd: this.junaCd,
      feast: this.game.state.feast || 0,
      feastToday: this.feastToday(),
      feasting: this.feasting,
      boost: this.towerDamage(),
      stats: { ...(this.game.state.night.posts || {}) },
      lastFlash: this.lastFlash,
    };
  }
}
