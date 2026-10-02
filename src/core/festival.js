// A6: Das Kürbisfest mit Laternenumzug – der Ablauf (data/festival.js, OFFENE-FRAGEN 235). Am ersten
// trockenen Tag ab dem 18. Oktober steht am Feuer die Kürbisbank: ein Kürbis für jeden in der Bucht.
// Die Leute schnitzen ihren über den Tag (jede Person zu ihrer Stunde an der Bank), Mika schnitzt
// ihren mit E (Modus 'schnitzen': Augen, Nase und Mund aus je ein paar Formen, ui/carveView.js).
// Ab sechs sammeln sich alle mit Lampions im Kreis ums Feuer; sobald Mika dazukommt, geht der Zug
// los – die Uhr steht dabei:
//
//   sammeln (zum Kreis) → aufstellen (genau auf den Platz) → zug (ein Stück ums Feuer, dann über den
//   Hof bis ans Ende des Stegs, alle auf einer Linie im Abstand) → halt (aufrücken, Lampions hoch,
//   Edda funkt; wohnt jemand am Sturmhuk, blinkt es zurück) → zurueck (dieselbe Linie zurück in den
//   Kreis) → jubel (die Kürbisse gehen nacheinander an) → vorbei.
//
// Kommt Mika bis halb acht nicht, brennen die Kürbisse ohne Umzug. Die Kürbisreihe bleibt danach bis
// `keepUntil` stehen; ihre Zellen im Bauraster sind so lange belegt.

import { FESTIVAL, festivalDay, faceOfPerson, faceOfChoice, faceGrid, carveHour, EYE_ORDER, NOSE_ORDER, MOUTH_ORDER } from '../data/festival.js';
import { FOG_PEOPLE } from '../data/fogIsle.js';
import { keeperAtSturmhuk } from '../data/wonders.js';
import { BENCH } from '../world/festModels.js';
import { LAYOUT } from '../world/layout.js';
import { BAY } from '../world/map.js';
import { T } from '../data/texts.js';
import { hoursOf } from './state.js';
import { PEOPLE, personOf } from './survivors.js';

/** Wer vorn geht (die Kinder zuerst), danach die übrigen in der Reihenfolge der Bucht. */
const LEAD = ['pim', 'lu', 'juna', 'hilde', 'bert', 'yusuf', 'marthe'];
/** Abschnitte, in denen die Uhr steht (und niemand die Nacht rufen kann). */
const MARCH = ['aufstellen', 'zug', 'halt', 'zurueck', 'jubel'];
/** Zelle im Bauraster, die die Kürbisbank belegt (grid.reserved, nicht bebaubar). */
const FEST_CELL = 3;
const FIRE = LAYOUT.campfire;

/**
 * Plätze auf der Bank: hinten bis zu sieben (mittig), wer dann noch kommt und Mika vorn (mittig,
 * Mika ganz rechts). Gibt [{ id, slot }] zurück ('mika' für Mika).
 */
export function benchLayout(people) {
  const n = BENCH.slots;
  const back = people.slice(0, n);
  const front = [...people.slice(n, FESTIVAL.people), 'mika'];
  const out = [];
  const b0 = Math.floor((n - back.length) / 2);
  back.forEach((id, i) => out.push({ id, slot: b0 + i }));
  const f0 = Math.floor((n - front.length) / 2);
  front.forEach((id, i) => out.push({ id, slot: n + f0 + i }));
  return out;
}

/** Ein Linienzug mit Bogenlänge (Punkte { x, z }). */
function polyline(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return { points, cum, length: cum[cum.length - 1] };
}

/** Punkt und Richtung bei Bogenlänge `s`. */
function pointAt(line, s, out = {}) {
  const { points, cum } = line;
  const v = Math.max(0, Math.min(line.length, s));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < v) i++;
  const a = points[i - 1];
  const b = points[i];
  const seg = cum[i] - cum[i - 1] || 1;
  const u = (v - cum[i - 1]) / seg;
  out.x = a.x + (b.x - a.x) * u;
  out.z = a.z + (b.z - a.z) * u;
  out.dx = (b.x - a.x) / seg;
  out.dz = (b.z - a.z) / seg;
  return out;
}

/** Richtung (0 Norden … π/2 Osten) → Punkt auf dem Kreis ums Feuer. */
function onRing(r, a) {
  return { x: FIRE.x + r * Math.sin(a), z: FIRE.z - r * Math.cos(a) };
}

export class Festival {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.phase = null; // null, 'sammeln', 'aufstellen', 'zug', 'halt', 'zurueck', 'jubel'
    this.t = 0;
    this.train = null; // der Zug: Mitglieder, Linie, Stand
    this.carvers = new Map(); // wer gerade an der Bank schnitzt: id -> { t, at, arrived }
    this.carving = null; // Mikas Schnitzen (Modus 'schnitzen')
    this.lit = 0; // so viele Kürbisse brennen
    this.lighting = 0; // Takt, in dem sie nacheinander angehen
    this.reserved = []; // belegte Zellen im Bauraster
    this.looks = 0;
    this.stats = { carved: 0, gathered: 0, marches: 0, cancelled: 0, verses: 0, edda: 0, blink: 0 }; // für die Prüfung
  }

  get data() {
    return this.game.state?.festival;
  }

  get today() {
    const f = this.data;
    return Boolean(f?.day) && f.day === this.game.state.time.day;
  }

  /** Läuft der Umzug (die Uhr steht, kein Rufen der Nacht)? */
  marching() {
    return MARCH.includes(this.phase);
  }

  holdsClock() {
    return this.marching();
  }

  /** Spielt das Lied des Umzugs? */
  singing() {
    return this.phase === 'zug' || this.phase === 'halt' || this.phase === 'zurueck' || this.phase === 'jubel';
  }

  /** Lenkt das Fest gerade diese Person (Schnitzen, Kreis, Zug)? */
  controls(id) {
    return this.carvers.has(id) || Boolean(this.train?.ids.has(id));
  }

  /** Wo steht `id` fürs Fest (für survivors.standSpot – das Tagwerk hält dann inne)? */
  spotOf(id) {
    const run = this.carvers.get(id);
    if (run) return { x: run.at.x, z: run.at.z, facing: 0 };
    const m = this.train?.members.find((k) => k.id === id);
    return m ? { x: m.homeAt.x, z: m.homeAt.z, facing: m.face } : null;
  }

  // --- Tag und Bank ----------------------------------------------------------------------

  /** Den Festtag bestimmen (am Morgen vor dem ersten möglichen Tag, nach dem Laden). */
  settle() {
    const g = this.game;
    const st = g.state;
    const f = this.data;
    const day = st.time.day;
    if (f.day || day < FESTIVAL.from - 1 || day > FESTIVAL.until) return;
    // Heute noch, wenn Zeit zum Schnitzen bleibt – sonst ab morgen
    const first = hoursOf(st.time.minute) < 12 ? day : day + 1;
    f.day = festivalDay(st, (d) => g.world.weather.forecast(d), first);
  }

  /** Wer bekommt einen Kürbis (und geht mit)? Bewohner, dazu Marthe und die Kinder in der Bucht. */
  participants() {
    const g = this.game;
    const sv = g.survivors;
    const ids = PEOPLE.filter((id) => !personOf(id).dog && sv.stage(id) === 3);
    if (g.state.isles?.fog?.stage === 4) ids.push(...FOG_PEOPLE);
    const base = [...ids];
    const rank = (id) => (LEAD.includes(id) ? LEAD.indexOf(id) : LEAD.length + base.indexOf(id));
    return ids.sort((a, b) => rank(a) - rank(b)).slice(0, FESTIVAL.people);
  }

  /** Der Festmorgen: Kürbisse für alle (einmal); die Bilder mit Lampion backen schon im Hintergrund. */
  setupDay() {
    const f = this.data;
    if (!f.people.length && !f.done) {
      f.people = this.participants();
      f.carved = [];
      f.face = null;
      f.walked = false;
    }
    if (!f.done) this.game.people?.prepare?.(f.people, 'laterne');
  }

  /** Steht die Kürbisbank (vom Festtag bis `keepUntil`)? */
  benchUp() {
    const f = this.data;
    const day = this.game.state.time.day;
    return Boolean(f?.day) && day >= f.day && day <= FESTIVAL.keepUntil;
  }

  /**
   * Ein Platz für die Bank: frei, im Hof, nicht auf dem Weg, weit genug vom Feuer (der Kreis des
   * Umzugs bleibt frei) – zuerst südöstlich vom Feuer, sonst in Ringen drumherum.
   */
  findSpot() {
    const w = this.game.world;
    const grid = w.grid;
    const outer = FESTIVAL.ring[0] + 1.2;
    const ok = (ci, cj) => {
      for (let dj = 0; dj < BENCH.d; dj++) {
        for (let di = 0; di < BENCH.w; di++) {
          const i = ci + di;
          const j = cj + dj;
          if (!grid.isFree(i, j) || grid.isPath(i, j) || !grid.isYard(i, j)) return false;
          if (w.colliders.blocks(i + 0.5, j + 0.5, 0.3)) return false;
        }
      }
      // der nächste Punkt der Bank bleibt außerhalb des Kreises ums Feuer
      const nx = Math.max(ci, Math.min(ci + BENCH.w, FIRE.x));
      const nz = Math.max(cj, Math.min(cj + BENCH.d, FIRE.z));
      return Math.hypot(nx - FIRE.x, nz - FIRE.z) >= outer;
    };
    const at = (ci, cj) => ({ x: ci + BENCH.w / 2, z: cj + BENCH.d / 2 });
    for (const [ci, cj] of [[3, 2], [2, 3], [-3, 3], [4, 4]]) if (ok(ci, cj)) return at(ci, cj);
    const fi = Math.floor(FIRE.x);
    const fj = Math.floor(FIRE.z);
    for (let r = 2; r <= 14; r++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          if (ok(fi + di, fj + dj)) return at(fi + di, fj + dj);
        }
      }
    }
    return null;
  }

  /** Zellen der Bank im Bauraster belegen bzw. freigeben. */
  reserve(spot) {
    const grid = this.game.world.grid;
    for (const k of this.reserved) if (grid.reserved[k] === FEST_CELL) grid.reserved[k] = 0;
    this.reserved = [];
    if (!spot) return;
    const ci = Math.round(spot.x - BENCH.w / 2);
    const cj = Math.round(spot.z - BENCH.d / 2);
    for (let dj = 0; dj < BENCH.d; dj++) {
      for (let di = 0; di < BENCH.w; di++) {
        const k = grid.index(ci + di, cj + dj);
        if (k < 0 || grid.reserved[k]) continue;
        grid.reserved[k] = FEST_CELL;
        this.reserved.push(k);
      }
    }
  }

  /** Die Bank in der Welt: Kürbisse (ganz oder geschnitzt), wie viele brennen, die Einblendung. */
  refreshBench() {
    const g = this.game;
    const f = this.data;
    const w = g.world;
    if (!f || !this.benchUp()) {
      this.reserve(null);
      w.setFestBench({});
      return;
    }
    if (!f.spot) f.spot = this.findSpot();
    this.reserve(f.spot);
    if (!f.spot) {
      w.setFestBench({});
      return;
    }
    const pumpkins = benchLayout(f.people).map(({ id, slot }) => {
      let face = null;
      if (id === 'mika') face = f.face ? faceGrid(faceOfChoice(f.face)) : null;
      else if (f.carved.includes(id)) face = faceGrid(faceOfPerson(id));
      return { slot, face };
    });
    w.setFestBench({ spot: f.spot, pumpkins, lit: this.lit, interaction: this.interaction() });
  }

  /** Die Einblendung an der Bank: am Festtag schnitzen (solange Mikas Kürbis noch ganz ist), sonst ansehen. */
  interaction() {
    const f = this.data;
    if (!f.spot) return null;
    const carve = this.today && !f.done && !f.face && !this.marching() && hoursOf(this.game.state.time.minute) < FESTIVAL.lastStart;
    return { id: 'kuerbisbank', x: f.spot.x, z: f.spot.z + 0.9, radius: 2.6, prompt: carve ? 'schnitzen' : 'ansehen', festBench: true };
  }

  // --- Jeden Morgen, nach dem Laden ---------------------------------------------------------

  /** Ein neuer Tag (game.onNewDay). */
  newDay() {
    if (this.phase) this.cancel(true);
    this.carvers.clear();
    this.settle();
    if (this.today) this.setupDay();
    this.lit = this.data.done ? 99 : 0;
    this.refreshBench();
  }

  /** Nach dem Laden oder einem neuen Spiel. */
  apply() {
    this.phase = null;
    this.train = null;
    this.carvers.clear();
    this.carving = null;
    this.settle();
    if (this.today) this.setupDay();
    this.lit = this.data.done ? 99 : 0;
    this.refreshBench();
  }

  /** Zeilen für den Morgenbericht. */
  morning() {
    const f = this.data;
    const day = this.game.state.time.day;
    if (!f?.day) return [];
    if (day === f.day - 1) return [{ text: T.fest.morgenVorher }];
    if (day === f.day && !f.done) return [{ text: T.fest.heute }];
    if (day === f.day + 1 && f.walked) return [{ text: T.fest.danach }];
    return [];
  }

  // --- Jeder Schritt ----------------------------------------------------------------------

  /** Jeder Spielschritt im Modus 'play' (sonst dt = 0). */
  update(dt) {
    const g = this.game;
    const f = this.data;
    if (!f) return;
    this.lightUp(dt);
    if (!this.today) return;
    const h = hoursOf(g.state.time.minute);
    // Die Nacht hat begonnen (früh gerufen): kein Umzug mehr – am Morgen läuft die Nacht davor
    // vielleicht noch, das zählt nicht
    if (g.nights?.active) {
      if (this.phase || (!f.done && h >= FESTIVAL.gather)) this.cancel(true);
      return;
    }
    if (!f.done && !this.phase) {
      if (h < FESTIVAL.gather) this.updateCarvers(dt, h);
      else if (h < FESTIVAL.lastStart) this.gather();
      else this.cancel(false);
    }
    if (this.phase && dt > 0) this.step(dt, h);
  }

  /** Die Leute schnitzen zu ihrer Stunde an der Bank (einer nach dem anderen, wie es kommt). */
  updateCarvers(dt, h) {
    const g = this.game;
    const f = this.data;
    if (!f.spot || h < FESTIVAL.carveFrom) return;
    const sv = g.survivors;
    const day = g.state.time.day;
    for (const id of f.people) {
      if (f.carved.includes(id)) continue;
      const n = sv.npcs.list.get(id);
      const run = this.carvers.get(id);
      if (!run) {
        const due = carveHour(id, day);
        if (h < due) continue;
        // Wer nicht da ist (Übungsplatz, Kartentisch, Drachen …), schnitzt später – zur Not still
        const busy = !n?.model.root.visible || g.training?.spotOf?.(id) || sv.seat?.id === id || g.kite?.controls(id) || g.defense?.controls(id) || n.lying;
        if (busy) {
          if (h > due + 1.5) this.carveDone(id, false);
          continue;
        }
        const at = this.carveSpot(id);
        this.carvers.set(id, { t: 0, at, arrived: false });
        this.take(id, n, false);
        sv.npcs.walkTo(n, at.x, at.z);
        n.rush = 1;
        continue;
      }
      run.t += dt;
      if (!run.arrived && (!n.target || run.t > 14)) {
        run.arrived = true;
        run.t = 0;
        n.target = null;
        n.restFacing = 0; // zur Kamera, den Kürbis vor sich auf der Bank
      }
      if (run.arrived && run.t >= FESTIVAL.carveTime) this.carveDone(id, true);
    }
  }

  /** Wo `id` schnitzt: hinter der Bank an seinem Platz, mit dem Gesicht zur Kamera. */
  carveSpot(id) {
    const f = this.data;
    const slot = benchLayout(f.people).find((k) => k.id === id)?.slot ?? 0;
    const i = slot % BENCH.slots;
    const x = f.spot.x + (i - (BENCH.slots - 1) / 2) * BENCH.step;
    return this.game.survivors.freeSpot(x, f.spot.z - 1.25, 0.26);
  }

  /** Fertig geschnitzt: der Kürbis zeigt sein Gesicht, die Person geht zurück an ihre Arbeit. */
  carveDone(id, visible) {
    const g = this.game;
    const f = this.data;
    const had = this.carvers.has(id);
    this.carvers.delete(id);
    if (!f.carved.includes(id)) f.carved.push(id);
    this.stats.carved++;
    this.refreshBench();
    if (visible) {
      const n = g.survivors.npcs.list.get(id);
      const p = g.player.position;
      if (n && Math.hypot(n.x - p.x, n.z - p.z) < 9) {
        g.sound.play('tipp', { x: n.x, z: n.z, rate: 0.9 });
        g.hud.bubble(n, (T.fest.schnitzt[id] || T.fest.schnitzt.allgemein).replace('{name}', g.bonds?.callName(id) || 'Mika'), 3.4);
      }
    }
    if (had) this.release(id);
  }

  // --- Personen übernehmen und freigeben ------------------------------------------------------

  /** Das Fest übernimmt `id`: weg von Arbeit und Sitz, mit Lampion (Kreis und Zug) oder ohne (Schnitzen). */
  take(id, n, lampion) {
    const g = this.game;
    if (g.chores?.runs?.has(id)) g.chores.release(id, n); // A1: Arbeit und Sitz verlassen
    n.chore = null;
    n.sitTarget = 0;
    n.sit = 0;
    n.seatY = null;
    n.y = null;
    n.wave = 0;
    n.drive = null;
    if (!n.dog) g.survivors.npcs.lampion(n, lampion);
  }

  /** Wieder frei: an den eigenen Platz (Bewohner über survivors, Marthe und die Kinder über fogIsle). */
  release(id) {
    const g = this.game;
    const sv = g.survivors;
    const n = sv.npcs.list.get(id);
    if (n) {
      n.drive = null;
      n.target = null;
      n.restFacing = null;
      if (!n.dog) sv.npcs.lampion(n, false);
    }
    if (FOG_PEOPLE.includes(id)) g.fogIsle?.placePeople(false);
    else sv.placeOne(id, sv.isOutsideTime(), false);
  }

  // --- Der Umzug ----------------------------------------------------------------------------

  /** Wer mitgeht: wer einen Kürbis hat und gerade da ist, Knopf läuft hinterher. */
  members() {
    const g = this.game;
    const sv = g.survivors;
    const list = [];
    for (const id of this.data.people) {
      const n = sv.npcs.list.get(id);
      if (!n?.model.root.visible || n.dog || n.lying) continue;
      if (g.kite?.controls(id) || g.defense?.controls(id) || sv.seat?.id === id || g.training?.spotOf?.(id)) continue;
      list.push({ id, n, dog: false });
    }
    const dog = sv.resident('knopf') ? sv.npcs.list.get('knopf') : null;
    if (dog?.model.root.visible && list.length) list.push({ id: 'knopf', n: dog, dog: true });
    return list;
  }

  /**
   * Der Kreis ums Feuer: der erste Halbmesser, auf dem alle Plätze frei sind. Die Spitze steht kurz
   * vor dem Ausgang, die anderen dahinter im Abstand `spacing`.
   */
  ring(count) {
    const w = this.game.world;
    let best = null;
    for (const r of FESTIVAL.ring) {
      const step = FESTIVAL.spacing / r;
      const lead = FESTIVAL.exit - FESTIVAL.lead;
      const a0 = lead - (count - 1) * step;
      let blocked = 0;
      for (let a = a0; a <= FESTIVAL.exit + 1e-6; a += 0.1) {
        const p = onRing(r, a);
        if (!w.map.walkableRaw(p.x, p.z) || w.colliders.blocks(p.x, p.z, 0.25)) blocked++;
      }
      if (!best || blocked < best.blocked) best = { r, step, lead, a0, blocked };
      if (!blocked) break;
    }
    return best;
  }

  /**
   * Der Weg vom Ausgang des Kreises zum Steg: Breitensuche über halbe Meter (Bauten und Bäume im
   * Weg), danach gestrafft (die längsten geraden Stücke, die frei sind), zuletzt über den Steg bis
   * ans Ende.
   */
  route(from) {
    const w = this.game.world;
    const goal = { x: BAY.dock.x0 - 0.4, z: FESTIVAL.dockZ };
    const free = (x, z) => w.map.walkableRaw(x, z) && !w.colliders.blocks(x, z, 0.24);
    const C = 0.5;
    const x0 = -8;
    const z0 = -7;
    const W = Math.ceil((BAY.dock.x0 + 1 - x0) / C);
    const H = Math.ceil((9 - z0) / C);
    const cell = (x, z) => [Math.floor((x - x0) / C), Math.floor((z - z0) / C)];
    const mid = (i, j) => ({ x: x0 + (i + 0.5) * C, z: z0 + (j + 0.5) * C });
    const [si, sj] = cell(from.x, from.z);
    const [gi, gj] = cell(goal.x, goal.z);
    const prev = new Int32Array(W * H).fill(-2);
    const queue = [sj * W + si];
    prev[sj * W + si] = -1;
    let found = -1;
    for (let q = 0; q < queue.length && found < 0; q++) {
      const k = queue[q];
      const i = k % W;
      const j = (k - i) / W;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const nk = nj * W + ni;
        if (prev[nk] !== -2) continue;
        const c = mid(ni, nj);
        if (!free(c.x, c.z)) continue;
        if (di && dj && (!free(mid(i + di, j).x, mid(i + di, j).z) || !free(mid(i, j + dj).x, mid(i, j + dj).z))) continue;
        prev[nk] = k;
        if (Math.abs(ni - gi) <= 1 && Math.abs(nj - gj) <= 1) {
          found = nk;
          break;
        }
        queue.push(nk);
      }
    }
    const dock = [{ x: BAY.dock.x0 + 0.6, z: FESTIVAL.dockZ }, { x: FESTIVAL.dockEnd, z: FESTIVAL.dockZ }];
    if (found < 0) return [from, goal, ...dock]; // nichts gefunden: geradeaus (sollte nie sein)
    const cells = [];
    for (let k = found; k >= 0; k = prev[k]) cells.unshift(mid(k % W, Math.floor(k / W)));
    cells.push(goal);
    // Straffen: von jedem Punkt aus der weiteste, der gerade erreichbar ist
    const clear = (a, b) => {
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      const n = Math.ceil(d / 0.2);
      for (let s = 1; s < n; s++) if (!free(a.x + ((b.x - a.x) * s) / n, a.z + ((b.z - a.z) * s) / n)) return false;
      return true;
    };
    const out = [from];
    let cur = from;
    let k = 0;
    while (k < cells.length - 1) {
      let next = k + 1;
      for (let j = cells.length - 1; j > k + 1; j--) {
        if (clear(cur, cells[j])) {
          next = j;
          break;
        }
      }
      cur = cells[next];
      out.push(cur);
      k = next;
    }
    return [...out, ...dock];
  }

  /** Ab sechs: Lampions an, alle in den Kreis ums Feuer (wer noch nicht geschnitzt hat, war schnell). */
  gather() {
    const g = this.game;
    const f = this.data;
    for (const id of [...this.carvers.keys()]) this.carveDone(id, false);
    for (const id of f.people) if (!f.carved.includes(id)) this.carveDone(id, false);
    const members = this.members();
    if (!members.some((m) => !m.dog)) {
      this.cancel(false);
      return;
    }
    const ring = this.ring(members.length);
    // Linie: der Kreis vom letzten Platz bis zum Ausgang (in Schritten von 0,1 Bogenmaß)
    const a0 = ring.a0 - 0.02;
    const steps = Math.max(2, Math.ceil((FESTIVAL.exit - a0) / 0.1));
    const arc = [];
    for (let s = 0; s <= steps; s++) arc.push(onRing(ring.r, a0 + ((FESTIVAL.exit - a0) * s) / steps));
    const arcLine = polyline(arc);
    const along = (a) => ((a - a0) / (FESTIVAL.exit - a0)) * arcLine.length;
    this.train = { members, ids: new Set(members.map((m) => m.id)), ring, arc, along, line: null, s: 0, t: 0, walked: false, verse: 0, songT: 1.2, cheerT: 0 };
    members.forEach((m, i) => {
      const a = ring.lead - i * ring.step;
      m.home = along(a);
      m.homeAt = onRing(ring.r, a);
      m.face = Math.atan2(FIRE.x - m.homeAt.x, FIRE.z - m.homeAt.z); // zum Feuer
      m.a = m.home;
      this.take(m.id, m.n, !m.dog);
      m.n.restFacing = m.face;
      m.n.rush = 1;
      g.survivors.npcs.walkTo(m.n, m.homeAt.x, m.homeAt.z);
    });
    this.phase = 'sammeln';
    this.t = 0;
    this.stats.gathered++;
    g.hud.toast(T.fest.sammeln, 'kuerbis', 5);
    g.funk?.once('kuerbisfest', T.funk.kuerbisfest);
  }

  /** Der Ablauf, Abschnitt für Abschnitt. */
  step(dt, h) {
    const g = this.game;
    const tr = this.train;
    this.t += dt;
    switch (this.phase) {
      case 'sammeln': {
        if (h >= FESTIVAL.lastStart) {
          this.cancel(false);
          return;
        }
        // Wer hängen blieb, geht die letzten Schritte ohne Kollision
        if (this.t > 6) for (const m of tr.members) if (!m.n.target && Math.hypot(m.n.x - m.homeAt.x, m.n.z - m.homeAt.z) > 0.4) g.survivors.npcs.walkTo(m.n, m.homeAt.x, m.homeAt.z, true);
        // Los geht es, wenn Mika da ist und alle im Kreis stehen (wer weit weg hängt, dem wird nicht gewartet)
        const ready = tr.members.every((m) => Math.hypot(m.n.x - m.homeAt.x, m.n.z - m.homeAt.z) < 0.7) || this.t > 14;
        if (this.t > 1.5 && ready && this.mikaNear()) this.lineUp();
        break;
      }
      case 'aufstellen':
        if (this.t > 6 || tr.members.every((m) => !m.n.target)) this.start();
        break;
      case 'zug': {
        tr.s += FESTIVAL.speed * dt;
        for (const m of tr.members) {
          m.a = Math.max(m.home, tr.s - (tr.members[0].home - m.home));
          this.put(m, false);
        }
        this.sing(dt);
        if (tr.members[0].a >= tr.line.length - 0.01) this.halt();
        break;
      }
      case 'halt': {
        let all = true;
        tr.members.forEach((m, i) => {
          const want = tr.line.length - i * FESTIVAL.close;
          if (m.a < want - 1e-3) {
            m.a = Math.min(want, m.a + FESTIVAL.speed * dt);
            all = false;
            this.put(m, false);
          } else {
            m.n.drive = 0;
            m.n.facing = this.damp(m.n.facing, m.dock ?? Math.PI / 2, dt);
            if (m.n.lampion && this.t > 1.2) m.n.lampion.raise = Math.min(1, m.n.lampion.raise + dt * 2);
          }
        });
        if (this.mikaWith()) tr.walked = true;
        if (all && !tr.greeted) this.greet();
        if (this.t > FESTIVAL.pause + 2.5) this.back();
        break;
      }
      case 'zurueck': {
        let all = true;
        for (const m of tr.members) {
          if (m.a > m.home + 1e-4) {
            m.a = Math.max(m.home, m.a - FESTIVAL.speed * dt);
            this.put(m, true);
            all = false;
          } else {
            m.n.drive = 0;
            m.n.facing = this.damp(m.n.facing, m.face, dt);
          }
        }
        this.sing(dt);
        if (all) this.cheer();
        break;
      }
      case 'jubel': {
        for (const m of tr.members) {
          m.n.facing = this.damp(m.n.facing, m.face, dt);
          if (m.n.lampion) m.n.lampion.raise = this.t > 0.6 && this.t < 3.4 ? Math.min(1, m.n.lampion.raise + dt * 3) : Math.max(0, m.n.lampion.raise - dt * 2);
        }
        if (this.t > FESTIVAL.cheer) this.finish();
        break;
      }
      default:
        break;
    }
  }

  /** Eine Person auf ihre Stelle der Linie setzen (vorwärts oder auf dem Rückweg). */
  put(m, back) {
    const p = pointAt(this.train.line, m.a, this._p || (this._p = {}));
    const n = m.n;
    n.x = p.x;
    n.z = p.z;
    n.target = null;
    n.drive = FESTIVAL.speed;
    n.facing = Math.atan2(back ? -p.dx : p.dx, back ? -p.dz : p.dz);
  }

  /** Winkel weich nachführen. */
  damp(a, b, dt) {
    const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    return a + d * Math.min(1, dt * 5);
  }

  /** Ist Mika draußen am Feuer (dann geht es los)? */
  mikaNear() {
    const g = this.game;
    if (g.mode !== 'play' || g.viewInside) return false;
    const p = g.player.position;
    return Math.hypot(p.x - FIRE.x, p.z - FIRE.z) <= FESTIVAL.startNear;
  }

  /** Ist Mika beim Zug am Stegende (nah an seiner Spitze)? */
  mikaWith() {
    const g = this.game;
    const lead = this.train?.members[0]?.n;
    if (!lead || g.viewInside) return false;
    const p = g.player.position;
    return Math.hypot(p.x - lead.x, p.z - lead.z) <= FESTIVAL.with;
  }

  /** Mika ist da: alle genau auf ihren Platz im Kreis, der Weg zum Steg wird gesucht. */
  lineUp() {
    const g = this.game;
    const tr = this.train;
    const route = this.route(tr.arc[tr.arc.length - 1]);
    tr.line = polyline([...tr.arc, ...route.slice(1)]);
    for (const m of tr.members) g.survivors.npcs.walkTo(m.n, m.homeAt.x, m.homeAt.z, true);
    g.builder?.cancel?.();
    if (!g.player.holdingLantern) g.toggleLantern(); // Mikas Sturmlaterne geht mit
    const lead = tr.members[0];
    g.hud.bubble(lead.n, T.fest.los[(g.state.time.day + tr.members.length) % T.fest.los.length], 2.6);
    this.phase = 'aufstellen';
    this.t = 0;
    this.refreshBench(); // an der Bank wird jetzt nicht mehr geschnitzt
  }

  /** Los: alle gehen zugleich, jeder auf seiner Stelle der Linie. */
  start() {
    const g = this.game;
    const tr = this.train;
    for (const m of tr.members) {
      g.survivors.npcs.place(m.n, m.homeAt.x, m.homeAt.z, m.n.facing);
      m.a = m.home;
    }
    tr.s = tr.members[0].home;
    this.phase = 'zug';
    this.t = 0;
    this.stats.marches++;
    if (tr.members.some((m) => m.dog)) {
      const dog = tr.members.find((m) => m.dog).n;
      dog.bark = 0.6;
      g.sound.play('bellen', { x: dog.x, z: dog.z, volume: 0.5 });
    }
  }

  /** Am Stegende: aufrücken, die Lampions hoch. */
  halt() {
    const tr = this.train;
    tr.members.forEach((m, i) => {
      m.dock = Math.PI / 2 + (i % 3 === 1 ? 0.5 : i % 3 === 2 ? -0.35 : 0); // übers Wasser, nicht alle gleich
    });
    this.phase = 'halt';
    this.t = 0;
  }

  /** Alle stehen am Stegende: Edda funkt; wohnt jemand am Sturmhuk, blinkt es zurück. */
  greet() {
    const g = this.game;
    const tr = this.train;
    tr.greeted = true;
    const lights = tr.members.filter((m) => !m.dog).length + (g.player.holdingLantern ? 1 : 0);
    const st = g.state;
    if (keeperAtSturmhuk(st)) {
      g.wonders.blinkT = 0;
      this.stats.blink++;
      g.funk?.say(T.fest.eddaBlink(lights));
    } else g.funk?.say(tr.members[0].id === 'pim' ? T.fest.eddaPim(lights) : T.fest.edda(lights));
    this.stats.edda++;
    const near = tr.members.find((m) => !m.dog && m.id !== tr.members[0].id) || tr.members[0];
    g.hud.bubble(near.n, T.fest.stegende[(st.time.day + 1) % T.fest.stegende.length], 3.4);
  }

  /** Zurück: dieselbe Linie in den Kreis, die Lampions wieder vor sich. */
  back() {
    for (const m of this.train.members) if (m.n.lampion) m.n.lampion.raise = 0;
    this.phase = 'zurueck';
    this.t = 0;
  }

  /** Wieder am Feuer: Jubel, die Kürbisse gehen nacheinander an. */
  cheer() {
    const g = this.game;
    const tr = this.train;
    this.phase = 'jubel';
    this.t = 0;
    this.lit = 0;
    this.lighting = 0.4;
    g.sound.play('jubel');
    const people = tr.members.filter((m) => !m.dog);
    people.slice(0, 3).forEach((m, k) => g.hud.bubble(m.n, T.fest.jubel[(k + g.state.time.day) % T.fest.jubel.length], 2.6 + k * 0.4));
    const dog = tr.members.find((m) => m.dog);
    if (dog) {
      dog.n.bark = 1.2;
      g.sound.play('bellen', { x: dog.n.x, z: dog.n.z, volume: 0.6 });
    }
  }

  /** Vorbei: alle frei, gemeinsame Zeit (wenn Mika mitging), die Uhr geht weiter. */
  finish() {
    const g = this.game;
    const f = this.data;
    const tr = this.train;
    f.done = true;
    f.walked = Boolean(tr.walked);
    this.phase = null;
    this.train = null;
    for (const m of tr.members) this.release(m.id);
    if (f.walked) for (const m of tr.members) g.bonds?.add(m.id, 'umzug');
    this.lighting = this.lighting || 0.1;
    g.state.time.minute += FESTIVAL.minutes;
    g.hud.toast(f.walked ? T.fest.vorbei : T.fest.vorbeiOhne, 'kuerbis', 5);
    this.refreshBench();
    g.book?.check?.();
    g.quietSave();
  }

  /** Kein Umzug (Mika kam nicht, die Nacht begann): die Kürbisse brennen trotzdem. */
  cancel(quiet) {
    const g = this.game;
    const f = this.data;
    const tr = this.train;
    this.phase = null;
    this.train = null;
    if (tr) for (const m of tr.members) this.release(m.id);
    for (const id of [...this.carvers.keys()]) this.carveDone(id, false);
    if (this.today && !f.done) {
      for (const id of f.people) if (!f.carved.includes(id)) f.carved.push(id);
      f.done = true;
      f.walked = false;
      this.lighting = 0.1;
      this.stats.cancelled++;
      if (!quiet && f.people.length) g.hud.toast(T.fest.ohne, 'kuerbis', 6);
    }
    this.refreshBench();
  }

  /** Die Kürbisse gehen nacheinander an (nach dem Jubel oder ohne Umzug). */
  lightUp(dt) {
    if (!this.lighting) return;
    this.lighting -= dt;
    if (this.lighting > 0) return;
    const total = benchLayout(this.data.people).length;
    if (this.lit >= total) {
      this.lighting = 0;
      this.lit = 99;
      return;
    }
    this.lit++;
    this.lighting = 0.28;
    this.game.sound.play('tipp', { rate: 0.6 + this.lit * 0.04, volume: 0.4 });
    this.refreshBench();
  }

  /** Eine Liedzeile über dem Kopf von jemandem in Mikas Nähe. */
  sing(dt) {
    const g = this.game;
    const tr = this.train;
    tr.songT -= dt;
    if (tr.songT > 0) return;
    tr.songT = 3.4;
    const p = g.player.position;
    let best = null;
    let bd = 14;
    for (const m of tr.members) {
      if (m.dog) continue;
      const d = Math.hypot(m.n.x - p.x, m.n.z - p.z);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    if (!best) return;
    g.hud.bubble(best.n, `♪ ${T.fest.lied[tr.verse % T.fest.lied.length]}`, 3.2);
    tr.verse++;
    this.stats.verses++;
  }

  // --- Mika schnitzt ----------------------------------------------------------------------

  /** E an der Kürbisbank: schnitzen oder ansehen. */
  use() {
    const g = this.game;
    if (this.interaction()?.prompt === 'schnitzen') {
      this.openCarve();
      return;
    }
    const lines = T.fest.reihe;
    g.hud.say(lines[(g.state.time.day + this.looks++) % lines.length], 4);
  }

  /** Das Schnitzfenster öffnen (Modus 'schnitzen', die Uhr steht). */
  openCarve() {
    const g = this.game;
    const f = this.data;
    this.carving = { row: 0, choice: [0, 0, 0], t: 0 };
    g.builder?.cancel?.();
    g.player.facing = Math.PI; // zur Bank
    g.world.carveLook = { x: f.spot.x, z: f.spot.z + 0.6 };
    g.mode = 'schnitzen';
    g.applyView(false);
    g.sound.play('aufheben', { volume: 0.5 });
    g.useLockUntil = g.clock + 0.3;
  }

  /** Jeder Schritt im Modus 'schnitzen': W/S Zeile, A/D Form, E schnitzen, Esc später. */
  updateCarve(dt, input) {
    const c = this.carving;
    if (!c) return;
    const g = this.game;
    c.t += dt;
    if (input.pressed('menu')) {
      input.consume?.('menu');
      this.closeCarve(false);
      return;
    }
    if (input.pressed('up')) c.row = (c.row + 2) % 3;
    if (input.pressed('down')) c.row = (c.row + 1) % 3;
    const n = [EYE_ORDER, NOSE_ORDER, MOUTH_ORDER][c.row].length;
    if (input.pressed('left')) {
      c.choice[c.row] = (c.choice[c.row] + n - 1) % n;
      g.sound.play('tipp', { rate: 1.1 });
    }
    if (input.pressed('right')) {
      c.choice[c.row] = (c.choice[c.row] + 1) % n;
      g.sound.play('tipp', { rate: 1.1 });
    }
    if (input.pressed('use') && c.t > 0.3 && g.clock >= (g.useLockUntil || 0)) this.closeCarve(true);
  }

  /** Fertig (oder später): Mikas Kürbis bekommt sein Gesicht, die Zeit geht weiter. */
  closeCarve(done) {
    const g = this.game;
    const f = this.data;
    const c = this.carving;
    this.carving = null;
    g.world.carveLook = null;
    g.mode = 'play';
    g.useLockUntil = g.clock + 0.4;
    g.applyView(g.world.isInside(g.player.position.x, g.player.position.z));
    if (!done || !c) return;
    f.face = c.choice.slice();
    g.state.time.minute += FESTIVAL.mikaCarve;
    this.refreshBench();
    g.sound.play('aufwertung');
    g.hud.toast(T.fest.geschnitzt, 'kuerbis', 4);
    // Wer daneben steht, sagt etwas dazu
    const p = g.player.position;
    for (const id of f.people) {
      const n = g.survivors.npcs.list.get(id);
      if (!n?.model.root.visible || Math.hypot(n.x - p.x, n.z - p.z) > 6) continue;
      g.hud.bubble(n, T.fest.lob[(g.state.time.day + id.length) % T.fest.lob.length].replace('{name}', g.bonds?.callName(id) || 'Mika'), 3);
      break;
    }
    g.quietSave();
  }

  // --- Prüfung -----------------------------------------------------------------------------

  info() {
    const f = this.data;
    const tr = this.train;
    const g = this.game;
    return {
      ...JSON.parse(JSON.stringify(f)),
      today: this.today,
      phase: this.phase,
      clockHeld: this.holdsClock(),
      lit: this.lit,
      layout: benchLayout(f.people),
      carvers: [...this.carvers.entries()].map(([id, r]) => ({ id, arrived: r.arrived, at: r.at })),
      carving: this.carving ? { row: this.carving.row, choice: this.carving.choice.slice(), face: faceOfChoice(this.carving.choice) } : null,
      interaction: this.interaction(),
      reserved: this.reserved.length,
      train: tr
        ? {
            r: tr.ring.r,
            blocked: tr.ring.blocked,
            length: tr.line ? +tr.line.length.toFixed(2) : null,
            line: tr.line ? tr.line.points.map((p) => [+p.x.toFixed(2), +p.z.toFixed(2)]) : null,
            s: +tr.s.toFixed(2),
            walked: tr.walked,
            members: tr.members.map((m) => ({ id: m.id, dog: m.dog, a: +m.a.toFixed(2), home: +m.home.toFixed(2), x: +m.n.x.toFixed(2), z: +m.n.z.toFixed(2), lampion: Boolean(m.n.lampion), raise: m.n.lampion?.raise || 0 })),
          }
        : null,
      stats: { ...this.stats },
      cozy: g.furnishing?.cozy ?? null,
    };
  }
}
