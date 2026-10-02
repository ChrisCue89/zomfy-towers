// A1: Die Bucht lebt (data/chores.js) – das Tagwerk der Bewohner. Wer eingezogen ist, geht tagsüber
// an seinen Arbeitsplatz (survivors.standSpot fragt `spotOf`), setzt sich, wenn die Arbeit einen
// Sitz hat, und arbeitet im Takt; kommt Mika heran, hält er inne. Die Figuren zeigen es über
// `n.chore` ({ act, anim, k, still }): peopleView wählt danach das Bild, npcs.poseHuman die
// Voxel-Haltung. Nichts davon wird gespeichert – es folgt allein aus Uhrzeit und Bewohnern.

import { CHORE, CHORES, ACTS } from '../data/chores.js';
import { T } from '../data/texts.js';
import { personOf } from './survivors.js';
import { hoursOf } from './state.js';
import { CONFIG } from '../config.js';

export class Chores {
  constructor(game) {
    this.game = game;
    this.enabled = CONFIG.chores; // in der Prüfung aus (?alltag oder setChores schaltet es ein)
    /** id → { key, spot, phase: gehen | setzen | arbeiten | aufstehen, step, t, wait, tool } */
    this.runs = new Map();
    this.check = 0;
    this.hits = 0; // Prüfung: wie oft ein Arbeitsgeräusch erklang
    this.spoke = new Set(); // wer heute schon ein Wort bei der Arbeit gesagt hat
    this.spokeDay = -1;
  }

  /** Arbeitsplatz von `id` jetzt – oder null (keine Arbeit, falsche Zeit, Nacht, verletzt, Regen). */
  spotOf(id) {
    const def = CHORES[id];
    const g = this.game;
    if (!this.enabled || !def || !g.survivors?.resident(id)) return null;
    const h = hoursOf(g.state.time.minute);
    if (h < (def.from ?? CHORE.from) || h >= (def.until ?? CHORE.until)) return null;
    if (g.nights?.active) return null;
    const person = personOf(id);
    // Verletzte ruhen (M31), wer übt, steht auf dem Übungsplatz (M30)
    if (!person.dog && g.survivors.strength(id) < 1) return null;
    const act = ACTS[def.act];
    if (act.dry && g.world.weather?.kind === 'regen') return null;
    const at = def.at || person.spot;
    return { x: at.x, z: at.z, facing: def.facing ?? 0, seat: def.seat || null, act: def.act };
  }

  /** Sitzt `id` gerade auf dem Sitz seiner Arbeit? */
  seated(id) {
    const run = this.runs.get(id);
    return Boolean(run?.spot.seat && (run.phase === 'arbeiten' || run.phase === 'setzen'));
  }

  /**
   * survivors.placeOne: an einen Arbeitsplatz mit Sitz. Beim Springen gleich hinsetzen, sonst zum
   * Platz neben dem Sitz gehen (das Hinsetzen übernimmt `update`). Wer schon dort sitzt, bleibt.
   */
  place(id, n, spot, jump) {
    n.restFacing = spot.facing;
    const run = this.runs.get(id);
    if (run && run.key === keyOf(spot) && (run.phase === 'arbeiten' || run.phase === 'setzen')) return;
    if (jump) {
      this.sit(n, spot);
      this.runs.set(id, this.newRun(spot, 'arbeiten'));
      return;
    }
    this.game.survivors.npcs.walkTo(n, spot.x, spot.z);
    this.runs.set(id, this.newRun(spot, 'gehen'));
  }

  newRun(spot, phase) {
    return { key: keyOf(spot), spot, phase, step: 0, t: 0, wait: 0 };
  }

  sit(n, spot) {
    const npcs = this.game.survivors.npcs;
    npcs.place(n, spot.seat.x, spot.seat.z, spot.facing);
    n.seatY = spot.seat.y;
    n.sitTarget = 1;
    n.sit = 1;
  }

  /**
   * Vom Sitz aufstehen, weil anderswo gebraucht (Szene, Fest, Nacht …): sofort, ohne Gang – die
   * Figur steht am Platz neben dem Sitz und geht von dort weiter.
   */
  release(id, n) {
    const run = this.runs.get(id);
    if (this.end(id, n)) this.game.survivors.npcs.place(n, run.spot.x, run.spot.z, n.facing);
  }

  /**
   * Die Arbeit endet: das Bild der Arbeit weg, das Werkzeug zurück (wenn es noch das eigene ist),
   * vom Sitz auf (gibt true zurück, wenn die Figur dort saß).
   */
  end(id, n) {
    const run = this.runs.get(id);
    this.runs.delete(id);
    if (!n) return false;
    n.chore = null;
    const tool = ACTS[CHORES[id].act].tool;
    const held = n.model.parts?.held;
    if (run?.tool && tool && held?.[tool]?.visible) this.game.survivors.npcs.hold(n, null);
    if (!run?.spot.seat || n.seatY !== run.spot.seat.y) return false;
    n.sit = 0;
    n.sitTarget = 0;
    n.seatY = null;
    return true;
  }

  /** Jeden Spielschritt: Plätze prüfen (zweimal je Sekunde), dann die Arbeit im Takt. */
  update(dt) {
    const g = this.game;
    const sv = g.survivors;
    if (!sv) return;
    this.check -= dt;
    if (this.check <= 0) {
      this.check = 0.5;
      this.refresh();
    }
    const p = g.player.position;
    for (const [id, run] of this.runs) {
      const n = sv.npcs.list.get(id);
      if (!n || !n.model.root.visible) {
        this.end(id, n);
        continue;
      }
      const spot = run.spot;
      // Hat jemand anderes die Figur fortgeschickt (Pfiff, Szene), wartet die Arbeit, bis sie zurück ist
      if (run.phase === 'arbeiten' && (n.target || (spot.seat && n.seatY !== spot.seat.y))) {
        n.chore = null;
        run.phase = 'gehen';
        if (!n.target) sv.npcs.walkTo(n, spot.x, spot.z);
        continue;
      }
      if (run.phase === 'gehen') {
        n.chore = null;
        const d = Math.hypot(n.x - spot.x, n.z - spot.z);
        // Kurz vor dem Ziel an einer Kante hängen geblieben: das genügt
        if (n.target && !n.target.free && d < 0.4 && n.moving < 0.05) n.target = null;
        if (n.target || d > 0.4) continue;
        if (spot.seat) {
          // Neben dem Sitz angekommen: die letzten Schritte auf die Bank (ohne Kollision)
          sv.npcs.walkTo(n, spot.seat.x, spot.seat.z, true);
          run.phase = 'setzen';
          continue;
        }
        run.phase = 'arbeiten';
        n.restFacing = spot.facing;
      }
      const act = ACTS[CHORES[id].act];
      if (run.phase === 'arbeiten' && act.tool && !run.tool) {
        run.tool = act.tool; // Bert nimmt die Spaltaxt
        sv.npcs.hold(n, act.tool);
      }
      if (run.phase === 'setzen') {
        if (n.target) continue;
        this.sit(n, spot);
        n.sit = 0.4; // setzt sich (die Voxel-Figur sinkt weich)
        run.phase = 'arbeiten';
      }
      if (run.phase === 'aufstehen') {
        n.chore = null;
        if (n.target) continue;
        this.end(id, n);
        sv.placeOne(id, sv.isOutsideTime(), false);
        continue;
      }
      // Arbeiten: kommt Mika heran, hält die Figur inne (und schaut auf, wenn sie steht)
      const near = Math.hypot(p.x - n.x, p.z - n.z) < CHORE.near && !g.world.isInside(p.x, p.z);
      if (near && run.wait <= 0) this.say(id, n);
      if (near) run.wait = CHORE.again;
      else run.wait = Math.max(0, run.wait - dt);
      const dog = Boolean(personOf(id).dog);
      if (run.wait > 0) {
        // Innehalten: das erste Bild der Arbeit (Dinge bleiben in der Hand); wer steht, dreht sich zu
        // Mika. Knopf wacht auf und steht auf
        if (dog) {
          n.chore = null;
          n.sitTarget = 0;
          n.restFacing = null;
          continue;
        }
        n.chore = { act: CHORES[id].act, anim: act.anim, k: 0, still: true, paused: true, sit: Boolean(spot.seat) };
        if (!act.still && !spot.seat) n.restFacing = null;
        continue;
      }
      n.restFacing = spot.facing;
      if (dog) n.sitTarget = 1; // die Voxel-Figur legt sich (sitzend) hin
      run.t += dt;
      let [k, s] = act.beat[run.step % act.beat.length];
      while (run.t >= s) {
        run.t -= s;
        run.step = (run.step + 1) % act.beat.length;
        [k, s] = act.beat[run.step];
        if (act.hit !== undefined && k === act.hit) this.hit(n, act);
      }
      n.chore = k < 0 ? { act: CHORES[id].act, anim: null, k: 0, still: Boolean(act.still), sit: Boolean(spot.seat) } : { act: CHORES[id].act, anim: act.anim, k, still: Boolean(act.still), sit: Boolean(spot.seat) };
    }
  }

  /** Wer soll jetzt wo arbeiten? Bei einem Wechsel gehen die Figuren hin bzw. stehen auf. */
  refresh() {
    const g = this.game;
    const sv = g.survivors;
    const out = sv.isOutsideTime();
    for (const id of Object.keys(CHORES)) {
      const n = sv.npcs.list.get(id);
      if (!n) continue;
      const want = out ? sv.standSpot(id) : null;
      const spot = want?.chore ? want.chore : null;
      const run = this.runs.get(id);
      if (spot && run && run.key === keyOf(spot)) continue;
      if (!spot && !run) continue;
      if (run && run.spot.seat && (run.phase === 'arbeiten' || run.phase === 'setzen') && n.seatY === run.spot.seat.y) {
        // Aufstehen und von der Bank steigen, danach an den neuen Platz
        n.sit = 0;
        n.sitTarget = 0;
        n.seatY = null;
        n.chore = null;
        sv.npcs.walkTo(n, run.spot.x, run.spot.z, true);
        run.phase = 'aufstehen';
        continue;
      }
      if (run?.phase === 'aufstehen') continue;
      if (this.end(id, n)) sv.npcs.place(n, run.spot.x, run.spot.z, n.facing);
      if (n.model.root.visible && !g.defense?.controls(id) && sv.seat?.id !== id) sv.placeOne(id, out, false);
      if (spot && !spot.seat && !this.runs.has(id)) this.runs.set(id, this.newRun(spot, 'gehen'));
    }
  }

  /**
   * Ein Wort bei der Arbeit: Kommt Mika zum ersten Mal am Tag heran, sagt die Figur etwas über
   * ihre Arbeit (Sprechblase, kein Dialog – das Spiel läuft weiter). Steht schon eine Blase über
   * ihr (der Morgengruß), wartet das Wort bis zum nächsten Mal.
   */
  say(id, n) {
    const g = this.game;
    const day = g.state.time.day;
    if (day !== this.spokeDay) {
      this.spokeDay = day;
      this.spoke.clear();
    }
    const lines = T.alltag[id];
    if (!lines || this.spoke.has(id) || g.mode !== 'play' || g.hud.bubbles.some((b) => b.n === n)) return;
    this.spoke.add(id);
    const name = g.bonds?.callName(id) || 'Mika';
    g.hud.bubble(n, lines[(day + id.length) % lines.length].replace('{name}', name), 2.8);
  }

  /** Ein Arbeitsgeräusch (Axt, Hammer) – leise, und nur, wenn Mika es hören kann. */
  hit(n, act) {
    if (!act.sound) return;
    this.hits++;
    this.game.sound.play(act.sound, { x: n.x, z: n.z, volume: CHORE.volume });
    // Späne fliegen vom Hackklotz vor der Figur
    if (act.sound === 'hacken') this.game.effects?.chips(n.x + Math.sin(n.facing) * 0.72, 0.42, n.z + Math.cos(n.facing) * 0.72, 'holz', 5);
  }

  /** Prüfung: wer gerade wo was tut. */
  info() {
    const out = {};
    for (const [id, run] of this.runs) {
      const n = this.game.survivors.npcs.list.get(id);
      out[id] = { act: CHORES[id].act, phase: run.phase, x: n ? +n.x.toFixed(2) : null, z: n ? +n.z.toFixed(2) : null, chore: n?.chore ? { ...n.chore } : null, sitting: Boolean(n && n.sitTarget === 1 && n.seatY !== null && n.seatY !== undefined) };
    }
    return { runs: out, hits: this.hits, spoke: [...this.spoke] };
  }
}

/** Schlüssel eines Arbeitsplatzes (wechselt er, geht die Figur neu hin). */
function keyOf(spot) {
  return `${spot.act}:${spot.x.toFixed(2)}:${spot.z.toFixed(2)}`;
}
