// Die Lagerglocke (M31, OFFENE-FRAGEN 165–167): Nachts, wenn die Horde durchgebrochen
// ist, kann Mika einmal die Glocke am Feuer läuten – E halten. Dann greifen die Bewohner
// zu ihren Notfallwaffen (Waffenschrank, M30) und kämpfen innerhalb des Walls: Schüsse
// aus dem gemeinsamen Vorrat, Hiebe mit Spaltaxt, Mistgabel, Schläger. Wer zu viel
// abbekommt, zieht sich ins Haus zurück – oder geht zu Boden, wenn er eingekesselt ist.
// Dann läuft ein Rettungsfenster: Mika rettet mit E, Dr. Yusuf stabilisiert, und ist das
// Lager frei, sind alle gerettet. Nur wenn das Fenster abläuft und »Verluste« an ist,
// stirbt jemand – angedeutet, nie gezeigt. Knopf stirbt nie (er kämpft nicht).
//
// Ablauf: seil (die Glocke schwingt) → stille (ein Schlag Stille) → fenster (die Fenster
// gehen nacheinander an, die Bewohner treten heraus) → kampf → entwarnung (drei Schläge,
// 20 s nachdem das Lager frei ist, spätestens im Morgengrauen).

import { T } from '../data/texts.js';
import { BELL, DEFENSE, WOUNDS } from '../data/bell.js';
import { GUNS, armsSkill } from '../data/arms.js';
import { WEAPONS } from '../data/weapons.js';
import { PEOPLE, personOf } from './survivors.js';
import { hoursOf } from './state.js';
import { LAYOUT } from '../world/layout.js';
import { COLORS } from '../ui/ui.js';
import { measure, drawText, LINE_HEIGHT } from '../ui/font.js';
import { drawIcon } from '../ui/icons.js';

const HOUSE_DOOR = { x: 7.0, z: -5.0 }; // vor der Haustür: hierhin ziehen sie sich zurück
const MEDIC = 'yusuf'; // Dr. Yusuf nimmt keine Waffe – er verarztet (Nr. 168)
const FIST = { damage: 7, rate: 1.4, reach: 1.1, push: 0.3, stun: 0 }; // ohne Waffe (oder ohne Munition)

export class Defense {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.phase = null; // seil · stille · fenster · kampf · entwarnung
    this.t = 0;
    this.hold = 0; // wie lange Mika schon am Seil zieht (E gehalten)
    this.people = []; // wer kämpft: { id, hp, max, weapon, state, cd, frightT, frightDone, rescueT, stable, saveT, kills, shots, down }
    this.clearT = 0;
    this.rings = 0; // Schläge der Entwarnung
    this.ringT = 0;
    this.rescue = null; // { id, t } – Mika hält E an einem Liegenden
    this.log = null; // was in dieser Nacht geschah (für den Morgenbericht)
  }

  get data() {
    return this.game.state.bell;
  }

  /** Die Glocke im Hof (Bau `lagerglocke`), falls sie steht. */
  get bell() {
    return this.game.world.buildings.list.find((b) => b.type === 'lagerglocke' && !b.broken) || null;
  }

  bellSpot() {
    const b = this.bell;
    return b ? this.game.world.buildings.bounds(b) : null;
  }

  /** Läuft gerade der Kampf der Bewohner (für Zeitraffer, Rufen, Musik)? */
  get active() {
    return this.phase !== null;
  }

  /** Kämpfen die Bewohner gerade (Musik auf voller Stufe)? */
  get fighting() {
    return this.phase === 'fenster' || this.phase === 'kampf';
  }

  /** Neues Spiel oder Laden: kein Kampf läuft (ein halber Kampf wird nicht gespeichert). */
  reset() {
    for (const p of this.people) {
      const n = this.game.survivors.npcs.list.get(p.id);
      if (!n) continue;
      n.lying = false;
      n.practice = null;
      this.game.survivors.npcs.hold(n, null);
    }
    this.phase = null;
    this.people = [];
    this.rescue = null;
    this.hold = 0;
  }

  /** E an der Glocke (ein Druck): Warum es gerade nicht geht, sagt Mika – halten läutet (update). */
  press() {
    const why = this.blocked();
    if (why && why !== 'keineGlocke' && !this.active) this.game.hud.say(T.glocke.nicht[why], 3);
  }

  /** Für die Horde (M31): der nächste Bewohner im Kampf um (x, z) – Liegende lassen sie in Ruhe. */
  defenderNear(x, z, r) {
    if (!this.active) return null;
    let best = null;
    let bd = r;
    for (const p of this.people) {
      if (p.state !== 'kampf') continue;
      const n = this.game.survivors.npcs.list.get(p.id);
      if (!n) continue;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d <= bd) {
        bd = d;
        best = { id: p.id, x: n.x, z: n.z };
      }
    }
    return best;
  }

  /** Wo steht `id` – solange sie kämpft (sonst null: Die Horde lässt ab). */
  defenderAt(id) {
    const p = this.active && this.people.find((q) => q.id === id);
    if (!p || p.state !== 'kampf') return null;
    const n = this.game.survivors.npcs.list.get(id);
    return n ? { x: n.x, z: n.z } : null;
  }

  /** Liegt jemand in Mikas Reichweite am Boden? (Einblendung »Aufhelfen«) */
  downNear(x, z) {
    if (!this.active) return null;
    for (const p of this.people) {
      if (p.state !== 'unten') continue;
      const n = this.game.survivors.npcs.list.get(p.id);
      if (n && Math.hypot(n.x - x, n.z - z) <= DEFENSE.rescueReach) return { id: p.id, x: n.x, z: n.z };
    }
    return null;
  }

  /** Steuert die Glocke gerade diese Figur? (survivors.placeOne lässt sie dann in Ruhe) */
  controls(id) {
    return this.active && this.people.some((p) => p.id === id && p.state !== 'safe');
  }

  /** Warum man gerade nicht läuten kann – oder null. */
  blocked() {
    const g = this.game;
    const st = g.state;
    if (!this.bell) return 'keineGlocke';
    if (!g.nights.active) return 'tag';
    if (this.data.night === st.night.n) return 'schonGelaeutet';
    if (!(st.night.breach || st.night.inCamp)) return 'keinDurchbruch';
    if (!this.candidates().length) return 'niemand';
    return null;
  }

  /** Wer der Glocke folgt: eingezogene Menschen, nicht verletzt (Dr. Yusuf kommt zum Verarzten). */
  candidates() {
    const g = this.game;
    return PEOPLE.filter((id) => g.survivors.resident(id) && !personOf(id)?.dog && !['verletzt', 'schwer'].includes(this.wound(id)));
  }

  /** Die Wunde von `id`, solange sie gilt: 'erschoepft', 'verletzt', 'schwer' – oder null. */
  wound(id) {
    const st = this.game.state;
    const w = st.wounds?.[id];
    if (!w) return null;
    const day = st.time.day;
    if (w.kind === 'erschoepft') return w.until > day || (w.until === day && hoursOf(st.time.minute) < (w.hour ?? WOUNDS.tiredUntil)) ? 'erschoepft' : null;
    return w.until > day ? w.kind : null;
  }

  /** Wie sehr hilft `id` (survivors.strength): verletzt halb, schwer verletzt und erschöpft gar nicht. */
  strength(id) {
    const w = this.wound(id);
    const st = this.game.state;
    if (w === 'erschoepft') return st.wounds[id].until === st.time.day ? 0 : 1; // erschöpft erst ab dem Morgen nach dem Kampf
    return w === 'schwer' ? 0 : w === 'verletzt' ? 0.5 : 1;
  }

  /** Können Bewohner fallen? Nur mit »Verluste« und nie auf »Gemütlich« (Nr. 166). */
  get losses() {
    const st = this.game.state;
    return st.losses === true && st.difficulty !== 'gemuetlich';
  }

  /** Was die Tafel »Wer kommt?« zeigt. */
  roster() {
    const g = this.game;
    const st = g.state;
    return this.candidates().map((id) => {
      const level = st.training?.[id]?.level || 0;
      // Die Notfallwaffe – außer Mika trägt sie gerade oder sie liegt im Laub (dann die Fäuste)
      const want = st.arms?.notfall?.[id] ?? null;
      const weapon = want && !st.arms.taken.includes(want) && !st.arms.lost?.includes(want) ? want : null;
      const gun = GUNS[weapon];
      return { id, name: personOf(id).name, hp: DEFENSE.hpBase + DEFENSE.hpPerLevel * level, weapon, medic: id === MEDIC, ammo: gun ? st.inventory[gun.ammo] || 0 : null, ammoKind: gun?.ammo || null };
    });
  }

  // --- Läuten -----------------------------------------------------------------------

  /** Mika hält E an der Glocke (game ruft es jeden Schritt, solange die Einblendung offen ist). */
  pull(dt, holding) {
    if (!holding || this.blocked() || this.active) {
      this.hold = 0;
      return false;
    }
    this.hold += dt;
    if (this.hold >= BELL.hold) {
      this.hold = 0;
      this.ring();
      return true;
    }
    return false;
  }

  ring() {
    const g = this.game;
    const st = g.state;
    this.data.night = st.night.n;
    this.data.day = st.time.day; // der Morgen danach ist day + 1 (Wunden, Bericht)
    this.phase = 'seil';
    this.t = 0;
    this.clearT = 0;
    this.rings = 0;
    const diff = st.difficulty;
    this.people = this.roster().map((r, k) => ({
      id: r.id,
      hp: r.hp,
      max: r.hp,
      weapon: r.weapon,
      medic: r.medic,
      state: 'wartet', // tritt heraus, wenn ihr Fenster angeht
      delay: BELL.pull + BELL.silence + k * BELL.window,
      cd: 0,
      frightT: 0,
      frightDone: false,
      rescueT: DEFENSE.rescue[diff] ?? DEFENSE.rescue.ausgewogen,
      stable: false,
      saveT: 0,
      yusufT: 0,
      kills: 0,
      shots: 0,
      down: false,
      skill: armsSkill(r.id, st.training?.[r.id]?.level || 0),
    }));
    this.log = { people: this.people.map((p) => p.id), fallen: [], down: [], kills: {} };
    g.sound.play('lagerglocke');
    g.feel('lagerglocke');
    g.sound.music?.duck?.(BELL.silence + BELL.pull); // ein Schlag Stille – danach setzt die Nachtmusik mit voller Stufe ein (game.musicThreat)
    g.hud.toast(T.glocke.gelaeutet, 'lagerglocke', 3);
    g.quietSave();
  }

  // --- Takt -------------------------------------------------------------------------

  update(dt, input) {
    const g = this.game;
    if (!this.active) {
      // Einblendung an der Glocke: E halten
      const it = g.currentInteraction;
      const atBell = it && it.use === 'glocke';
      this.pull(dt, atBell && g.mode === 'play' && input.isDown('use'));
      return;
    }
    this.t += dt;
    if (this.phase === 'seil' && this.t >= BELL.pull) this.next('stille');
    else if (this.phase === 'stille' && this.t >= BELL.silence) this.next('fenster');
    // Die Fenster gehen nacheinander an: wer dran ist, tritt aus Zelt oder Haus
    const since = this.phaseStart();
    for (const p of this.people) {
      if (p.state === 'wartet' && since >= p.delay) this.enter(p);
    }
    if (this.phase === 'fenster' && this.people.every((p) => p.state !== 'wartet')) this.next('kampf');
    // Kämpfen, liegen, retten
    const inCamp = g.horde.list.filter((z) => z.inCamp && z.state !== 'dying' && !(z.y < -0.5));
    for (const p of this.people) this.updatePerson(p, dt, inCamp, input);
    // Entwarnung: 20 s nachdem das Lager frei ist – spätestens im Morgengrauen
    if (this.phase === 'kampf') {
      this.clearT = inCamp.length ? 0 : this.clearT + dt;
      if (!inCamp.length) this.people.filter((p) => p.state === 'unten').forEach((p) => this.saved(p, 'frei'));
      if (this.clearT >= BELL.allClear || !g.nights.active) this.next('entwarnung');
    } else if (this.phase === 'entwarnung') {
      this.ringT -= dt;
      if (this.ringT <= 0 && this.rings < BELL.allClearRings) {
        this.rings++;
        this.ringT = 0.9;
        g.sound.play('lagerglocke', { volume: 0.55 });
      }
      if (this.rings >= BELL.allClearRings && this.ringT <= 0) this.finish();
    }
  }

  phaseStart() {
    return { seil: 0, stille: BELL.pull, fenster: BELL.pull + BELL.silence, kampf: 99, entwarnung: 99 }[this.phase] + this.t;
  }

  next(phase) {
    this.phase = phase;
    this.t = 0;
    if (phase === 'entwarnung') this.ringT = 0;
  }

  /** Eine Figur tritt heraus: aus ihrem Zelt (oder der Haustür), mit eigener Geste. */
  enter(p) {
    const g = this.game;
    const n = g.survivors.npcs.get(p.id, false);
    const home = g.survivors.homeSpot?.(p.id) || HOUSE_DOOR;
    n.model.root.visible = true;
    n.sitTarget = 0;
    n.y = null;
    g.survivors.npcs.place(n, home.x, home.z, Math.PI);
    g.survivors.npcs.gesture(n, 'daumen', 0.6); // bereit
    g.survivors.npcs.hold(n, p.medic ? null : p.weapon); // die Notfallwaffe in der Hand
    g.effects.dust(home.x, home.z, 0.5, 6);
    p.state = p.medic ? 'arzt' : 'kampf';
    g.sound.play('schritt', { x: home.x, z: home.z });
  }

  updatePerson(p, dt, inCamp, input) {
    const g = this.game;
    const n = g.survivors.npcs.list.get(p.id);
    if (!n || p.state === 'wartet' || p.state === 'safe' || p.state === 'tot') return;
    p.cd = Math.max(0, p.cd - dt);
    n.practice = null;
    if (p.state === 'unten') return this.updateDown(p, n, dt, inCamp, input);
    if (p.state === 'rueckzug') {
      const d = Math.hypot(HOUSE_DOOR.x - n.x, HOUSE_DOOR.z - n.z);
      if (d < 0.5) {
        p.state = 'safe';
        n.model.root.visible = false;
      } else g.survivors.npcs.walkTo(n, HOUSE_DOOR.x, HOUSE_DOOR.z);
      return;
    }
    if (p.state === 'arzt') return this.updateMedic(p, n, dt);
    if (this.phase === 'entwarnung') {
      p.state = 'safe';
      return;
    }
    // Schreck: kommt einer auf 2 m heran, zögert sie einmal (so oft wie ihr Schreck)
    const near = nearest(inCamp, n.x, n.z);
    if (p.frightT > 0) {
      p.frightT -= dt;
      n.target = null;
      return;
    }
    if (near && near.d < DEFENSE.fright.near && !p.frightDone) {
      p.frightDone = true;
      if (Math.random() * 100 < p.skill.fright) {
        p.frightT = DEFENSE.fright.time;
        g.hud.bubble(n, T.glocke.schreck, 1.2);
        return;
      }
    }
    if (near && near.d > DEFENSE.fright.near + 1) p.frightDone = false;
    const target = near && near.d <= DEFENSE.seek ? near.z : null;
    if (!target) {
      // Niemand im Lager in der Nähe: am Feuer Stellung halten
      const c = this.bellSpot() || LAYOUT.campfire;
      if (Math.hypot(c.x - n.x, c.z - n.z) > 2) g.survivors.npcs.walkTo(n, c.x + (Math.random() - 0.5), c.z + 1.2);
      return;
    }
    const gun = GUNS[p.weapon];
    const ammo = gun ? g.state.inventory[gun.ammo] || 0 : 0;
    if (gun && ammo > 0) {
      // Schießen: stehen bleiben, zielen, treffen nach Treffsicherheit
      if (near.d > gun.range * 0.8) {
        g.survivors.npcs.walkTo(n, target.x, target.z);
        return;
      }
      n.target = null;
      n.facing = Math.atan2(target.x - n.x, target.z - n.z);
      n.practice = { kind: 'schuss', t: 1 - p.cd };
      if (p.cd > 0) return;
      p.cd = 1 / DEFENSE.shotRate;
      g.state.inventory[gun.ammo] = ammo - 1;
      p.shots++;
      n.practice.t = 0;
      const dx = target.x - n.x;
      const dz = target.z - n.z;
      const d = Math.hypot(dx, dz) || 1;
      g.effects.muzzle(n.x + (dx / d) * 0.5, 0.78, n.z + (dz / d) * 0.5, dx / d, dz / d, gun.flare ? 'leucht' : 'feuer');
      g.sound.play(gun.flare ? 'leuchtschuss' : gun.pellets > 1 ? 'schrot' : 'schuss', { x: n.x, z: n.z, volume: 0.8 });
      g.arms?.tracers.push({ x0: n.x, y0: 0.78, z0: n.z, x1: target.x, y1: 0.7, z1: target.z, t: 0.07 });
      if (Math.random() * 100 < p.skill.aim) {
        const dealt = gun.damage * (gun.pellets > 1 ? 3 : 1);
        const dead = g.horde.damage(target, dealt, { push: gun.push, fromX: n.x, fromZ: n.z, source: 'bewohner', by: p.id });
        g.effects.splat(target.x, 0.8, target.z, 'sporen', 6, 0.7);
        if (dead) this.credit(p);
      }
      return;
    }
    // Nahkampf (oder Fäuste, wenn die Munition aus ist)
    const w = WEAPONS[p.weapon] && !gun ? WEAPONS[p.weapon] : FIST;
    const reach = w.reach + target.def.radius - 0.2;
    if (near.d > reach) {
      g.survivors.npcs.walkTo(n, target.x, target.z);
      return;
    }
    n.target = null;
    n.facing = Math.atan2(target.x - n.x, target.z - n.z);
    n.practice = { kind: 'hieb', t: 1 / w.rate - p.cd };
    if (p.cd > 0) return;
    p.cd = 1 / w.rate;
    n.practice.t = 0;
    g.sound.play('treffer', { x: target.x, z: target.z, volume: 0.7 });
    const dead = g.horde.damage(target, w.damage, { push: w.push, fromX: n.x, fromZ: n.z, source: 'bewohner', by: p.id });
    if (w.stun && !dead) g.horde.stun(target, w.stun);
    g.effects.splat(target.x, 0.8, target.z, 'sporen', 5, 0.6);
    if (dead) this.credit(p);
  }

  credit(p) {
    p.kills++;
    this.log.kills[p.id] = (this.log.kills[p.id] || 0) + 1;
  }

  /** Dr. Yusuf: zu den Liegenden, stabilisieren (4 s daneben), sonst am Haus warten. */
  updateMedic(p, n, dt) {
    const g = this.game;
    const down = this.people.filter((q) => q.state === 'unten' && !q.stable);
    let best = null;
    for (const q of down) {
      const m = g.survivors.npcs.list.get(q.id);
      if (!m) continue;
      const d = Math.hypot(m.x - n.x, m.z - n.z);
      if (!best || d < best.d) best = { q, m, d };
    }
    if (!best) {
      if (Math.hypot(HOUSE_DOOR.x - n.x, HOUSE_DOOR.z - n.z) > 1.5) g.survivors.npcs.walkTo(n, HOUSE_DOOR.x - 1, HOUSE_DOOR.z + 1);
      return;
    }
    if (best.d > 1.2) {
      g.survivors.npcs.walkTo(n, best.m.x, best.m.z + 0.8);
      return;
    }
    n.target = null;
    for (const q of down) {
      const m = g.survivors.npcs.list.get(q.id);
      if (m && Math.hypot(m.x - n.x, m.z - n.z) <= DEFENSE.yusuf.radius) q.yusufT += dt;
      if (q.yusufT >= DEFENSE.yusuf.time && !q.stable) {
        q.stable = true;
        g.hud.bubble(n, T.glocke.stabil(personOf(q.id).name), 2.4);
      }
    }
  }

  /** Liegend: die Zeit läuft (doppelt mit einem Schlurfer daneben), Mika rettet mit E. */
  updateDown(p, n, dt, inCamp, input) {
    const g = this.game;
    n.lying = true;
    n.target = null;
    const zNear = inCamp.some((z) => Math.hypot(z.x - n.x, z.z - n.z) <= DEFENSE.rescueFastNear);
    if (!p.stable) p.rescueT -= dt * (zNear ? 2 : 1);
    // Mika hält E daneben
    const pl = g.player.position;
    const close = Math.hypot(pl.x - n.x, pl.z - n.z) <= DEFENSE.rescueReach;
    if (close && g.mode === 'play' && input.isDown('use')) {
      p.saveT += dt;
      this.rescue = { id: p.id, t: p.saveT };
      if (p.saveT >= DEFENSE.rescueHold) this.saved(p, 'mika');
    } else if (this.rescue?.id === p.id) {
      p.saveT = 0;
      this.rescue = null;
    }
    if (p.state === 'unten' && p.rescueT <= 0) this.fall(p);
  }

  /** Treffer eines Schlurfers (horde ruft es über onHitPerson). */
  hit(id, dmg) {
    const g = this.game;
    const p = this.people.find((q) => q.id === id);
    if (!p || p.state !== 'kampf') return;
    const cap = (DEFENSE.maxHit[g.state.difficulty] ?? DEFENSE.maxHit.ausgewogen) * p.max;
    p.hp = Math.max(0, p.hp - Math.min(dmg * DEFENSE.biteFactor, cap)); // Schlurfer schlagen Menschen härter als Holz
    const n = g.survivors.npcs.list.get(id);
    if (n) g.effects.splat(n.x, 0.9, n.z, 'sporen', 4, 0.5);
    g.sound.play('autsch', { x: n?.x, z: n?.z, volume: 0.6 });
    if (p.hp > p.max * DEFENSE.retreatAt) return;
    // Rückzug, wenn der Weg frei ist – sonst zu Boden
    const free = n && !g.horde.list.some((z) => z.state !== 'dying' && Math.hypot(z.x - n.x, z.z - n.z) < 2.2);
    if (free) {
      p.state = 'rueckzug';
      if (n) g.hud.bubble(n, T.glocke.rueckzug, 1.6);
    } else {
      p.state = 'unten';
      p.down = true;
      this.log.down.push(id);
      if (n) {
        g.hud.bubble(n, T.glocke.hilfe, 2.2);
        g.survivors.npcs.hold(n, null);
      }
      g.hud.toast(T.glocke.liegt(personOf(id).name), 'herz', 3, 'alarm');
      g.sound.play('herzschlag');
    }
  }

  /** Gerettet: steht auf und geht ins Haus. */
  saved(p, by) {
    const g = this.game;
    const n = g.survivors.npcs.list.get(p.id);
    p.state = 'rueckzug';
    p.saveT = 0;
    if (this.rescue?.id === p.id) this.rescue = null;
    if (n) {
      n.lying = false;
      if (by === 'mika') g.hud.bubble(n, T.glocke.danke, 2);
    }
    g.sound.play('stufe', { volume: 0.5 });
  }

  /** Das Fenster ist abgelaufen: Mit »Verluste« fällt sie, sonst verliert sie nur ihre Waffe. */
  fall(p) {
    const g = this.game;
    const st = g.state;
    const n = g.survivors.npcs.list.get(p.id);
    if (!this.losses || personOf(p.id)?.dog) {
      // Ohne Verluste: sie verliert nur ihre Waffe (sie liegt irgendwo im Laub) – und ist schwer verletzt
      if (p.weapon) {
        st.arms.notfall[p.id] = null;
        if (!st.arms.lost.includes(p.weapon)) st.arms.lost.push(p.weapon);
        st.arms.taken = st.arms.taken.filter((w) => w !== p.weapon);
        p.lostWeapon = p.weapon;
      }
      this.saved(p, 'glueck');
      return;
    }
    p.state = 'tot';
    this.log.fallen.push(p.id);
    if (n) {
      n.lying = false;
      g.effects.splat(n.x, 0.3, n.z, 'laub', 14, 0.9); // nur Laub, das aufwirbelt
      n.model.root.visible = false; // angedeutet, nie gezeigt: sie ist einfach nicht mehr da
    }
    g.hud.say(T.glocke.still(personOf(p.id).name), 5);
    g.survivors.fall(p.id);
    g.sound.play('bimmel', { volume: 0.4 });
    g.quietSave(); // sofort gespeichert (Nr. 166): kein Neuladen, das es ungeschehen macht
  }

  finish() {
    const g = this.game;
    for (const p of this.people) {
      const n = g.survivors.npcs.list.get(p.id);
      if (n) {
        n.lying = false;
        n.practice = null;
        g.survivors.npcs.hold(n, null);
      }
    }
    this.settle(this.people);
    this.phase = null;
    this.people = [];
    this.rescue = null;
    g.survivors.placeAll(false);
    g.survivors.refreshInteractions();
    g.survivors.onAbilitiesChanged();
    g.hud.toast(T.glocke.entwarnung, 'lagerglocke', 3);
    g.quietSave();
  }

  /**
   * Nach dem Kampf: Wunden verteilen (sie gelten ab dem Morgen danach) und festhalten,
   * was der Morgenbericht erzählt – beides im Spielstand, auch wenn Mika nicht schläft.
   */
  settle(fought) {
    const g = this.game;
    const st = g.state;
    if (!fought.length) return;
    const morning = (this.data.day ?? st.time.day) + 1;
    const [hurt, bad] = WOUNDS.days[st.difficulty] || WOUNDS.days.ausgewogen;
    const lines = [];
    const names = fought.filter((p) => p.state !== 'tot').map((p) => personOf(p.id).name);
    const kills = fought.reduce((sum, p) => sum + p.kills, 0);
    if (names.length) lines.push(T.glocke.bericht(names, kills));
    const yusuf = g.survivors.resident('yusuf') && !fought.some((p) => p.id === 'yusuf' && p.state === 'tot');
    const bed = (st.world.houseLevel || 1) >= 3; // ein Bett im Haus
    for (const p of fought) {
      const name = personOf(p.id).name;
      if (p.state === 'tot') {
        lines.push(T.glocke.zumSteg(name));
        continue;
      }
      if (p.down) {
        const days = Math.max(1, bad - (yusuf ? 1 : 0) - (bed ? 1 : 0));
        st.wounds[p.id] = { kind: 'schwer', until: morning + days };
        lines.push(T.glocke.schwer(name, days));
      } else if (p.hp <= p.max * 0.5) {
        st.wounds[p.id] = { kind: 'verletzt', until: morning + hurt };
        lines.push(T.glocke.verletzt(name, hurt));
      } else if (!p.medic) st.wounds[p.id] = { kind: 'erschoepft', until: morning, hour: WOUNDS.tiredUntil }; // wer gekämpft hat (nicht der Arzt)
      if (p.lostWeapon) lines.push(T.glocke.waffeWeg(name, T.gegenstaende[p.lostWeapon]));
    }
    this.data.report = { day: morning, lines };
  }

  /** Neuer Tag (auch wach geblieben): abgelaufene Wunden heilen, aus »schwer verletzt« wird eine Narbe. */
  heal() {
    const st = this.game.state;
    const day = st.time.day;
    let changed = false;
    for (const [id, w] of Object.entries(st.wounds || {})) {
      if (w.kind === 'erschoepft' ? w.until >= day : w.until > day) continue;
      if (w.kind === 'schwer') st.scars[id] = day;
      delete st.wounds[id];
      changed = true;
    }
    if (changed) this.game.survivors.onAbilitiesChanged();
  }

  /**
   * Zeilen für den Morgenbericht: wer der Glocke gefolgt ist und wie es ihnen geht – und an
   * den Tagen danach eine stille Zeile über die, die nicht mehr da sind (Nr. 170).
   */
  morning() {
    const g = this.game;
    const st = g.state;
    const day = st.time.day;
    const out = [];
    const rep = this.data.report;
    if (rep && rep.day <= day) {
      for (const text of rep.lines) out.push({ text });
      this.data.report = null;
    }
    // Die anderen sprechen noch ein paar Tage von ihr
    const talking = PEOPLE.filter((id) => g.survivors.resident(id) && !personOf(id)?.dog);
    for (const f of st.fallen || []) {
      const since = day - f.to;
      if (since < 1 || since > 3 || !talking.length) continue;
      const who = talking[(day + f.id.length) % talking.length];
      out.push({ text: T.glocke.erinnern(personOf(who).name, personOf(f.id).name, since) });
    }
    return out;
  }

  /** Ruht die Fähigkeit von `id` gerade (schwer verletzt, erschöpft bis mittags)? */
  resting(id) {
    return this.strength(id) === 0;
  }

  // --- Oberfläche -------------------------------------------------------------------

  /** Die Tafel »Wer kommt?« beim Ziehen am Seil, Lebensbalken über den Kämpfenden, Ringe um Liegende. */
  draw(ui) {
    const g = this.game;
    const ctx = ui.ctx;
    if (this.hold > 0 && !this.active) {
      const rows = this.roster();
      const w = 170;
      const x = 10;
      const y = 64;
      const h = 22 + rows.length * 13 + 8;
      ui.panel(x, y, w, h, { frame: COLORS.gold });
      drawText(ctx, T.glocke.werKommt, x + 8, y + 5, COLORS.gold);
      rows.forEach((r, k) => {
        const ry = y + 20 + k * 13;
        drawIcon(ctx, r.medic ? 'herz' : r.weapon || 'faust', x + 6, ry - 1);
        drawText(ctx, r.name, x + 22, ry, COLORS.text);
        const right = r.medic ? T.glocke.verarztet : r.ammo === null ? `${r.hp}` : `${r.hp} · ${r.ammo}`;
        drawText(ctx, right, x + w - 8 - measure(right), ry, COLORS.textDim);
      });
      // Balken am Seil
      const bw = Math.round((w - 16) * Math.min(1, this.hold / BELL.hold));
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(x + 8, y + h - 5, bw, 2);
    }
    if (!this.active) return;
    for (const p of this.people) {
      if (p.state === 'wartet' || p.state === 'safe' || p.state === 'tot') continue;
      const n = g.survivors.npcs.list.get(p.id);
      if (!n) continue;
      const s = g.worldToUi(n.x, 1.35, n.z);
      if (p.state === 'unten') {
        // Ring mit der verbleibenden Zeit, darüber der Name
        const total = DEFENSE.rescue[g.state.difficulty] ?? DEFENSE.rescue.ausgewogen;
        const k = Math.max(0, p.rescueT / total);
        const r = 9;
        const steps = 28;
        ctx.fillStyle = p.stable ? COLORS.textWarm : COLORS.red;
        for (let i = 0; i < steps * k; i++) {
          const a = -Math.PI / 2 + (i / steps) * Math.PI * 2;
          ctx.fillRect(Math.round(s.x + Math.cos(a) * r), Math.round(s.y + 8 + Math.sin(a) * r * 0.6), 1, 1);
        }
        const label = p.stable ? T.glocke.stabilKurz : personOf(p.id).name;
        drawText(ctx, label, Math.round(s.x - measure(label) / 2), Math.round(s.y - LINE_HEIGHT - 4), p.stable ? COLORS.textWarm : COLORS.red, { outline: COLORS.outline });
        if (this.rescue?.id === p.id) {
          ctx.fillStyle = COLORS.gold;
          ctx.fillRect(Math.round(s.x - 10), Math.round(s.y + 16), Math.round(20 * Math.min(1, this.rescue.t / DEFENSE.rescueHold)), 2);
        }
        continue;
      }
      // Lebensbalken
      const bw = 14;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(Math.round(s.x - bw / 2) - 1, Math.round(s.y) - 1, bw + 2, 4);
      ctx.fillStyle = p.hp / p.max > 0.5 ? COLORS.textWarm : COLORS.red;
      ctx.fillRect(Math.round(s.x - bw / 2), Math.round(s.y), Math.max(1, Math.round((bw * p.hp) / p.max)), 2);
    }
  }

  /** Für die Prüfung. */
  info() {
    return {
      phase: this.phase,
      night: this.data.night,
      blocked: this.blocked(),
      hold: this.hold,
      people: this.people.map((p) => ({ id: p.id, hp: Math.round(p.hp), max: p.max, weapon: p.weapon, state: p.state, rescueT: Math.round(p.rescueT * 10) / 10, stable: p.stable, kills: p.kills, shots: p.shots })),
      roster: this.roster(),
      rings: this.rings,
      rescue: this.rescue ? { ...this.rescue } : null,
      log: this.log ? JSON.parse(JSON.stringify(this.log)) : null,
    };
  }
}

/** Nächster Schlurfer in der Liste zu (x, z). */
function nearest(list, x, z) {
  let best = null;
  for (const q of list) {
    const d = Math.hypot(q.x - x, q.z - z);
    if (!best || d < best.d) best = { z: q, d };
  }
  return best;
}
