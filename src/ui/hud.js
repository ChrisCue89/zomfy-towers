// HUD: Tag und Uhrzeit, aktuelles Ziel, Vorrat, Schnellleiste mit Laterne,
// Kontexthinweise, schwebende »+n« beim Sammeln und Meldungen.
// Unten links die Schnellleiste, unten rechts die Bauleiste (eigene Datei).

import { T } from '../data/texts.js';
import { RESOURCES, RARE_RESOURCES, QUEST_ITEMS, ITEMS, HOTBAR_SIZE } from '../data/items.js';
import { HOUSE_LEVELS, maxHpOf } from '../data/buildings.js';
import { clockText, hoursOf } from '../core/state.js';
import { COLORS } from './ui.js';
import { measure, LINE_HEIGHT, drawTiny, wrap } from './font.js';
import { drawIcon, iconSize } from './icons.js';
import { xpForLevel } from '../data/perks.js';
import { SKILLS } from '../data/skills.js';
import { calendarOf } from '../data/autumn.js';
import { P, hexToCss } from '../render/palette.js';

/** So breit wird eine Sprechblase höchstens, dann bricht sie um (M25). */
const SPEECH_MAX_W = 380;

/**
 * Zeichen der Zustände über dem Kopf (M18): 5 × 5 Pixel auf dunklem Grund –
 * Eisblock, Brand, nass, frostig, matschig, geblendet (höchstens drei je Kopf).
 */
const STATUS_PIX = [
  ['iceT', 0xa8dcff, ['#####', '#.#.#', '##.##', '#.#.#', '#####']],
  ['burnT', P.f5, ['..#..', '.##..', '.###.', '#####', '.###.']],
  ['wetT', P.b4, ['..#..', '.###.', '#####', '#####', '.###.']],
  ['frostT', 0xe8f8ff, ['#.#.#', '.###.', '##.##', '.###.', '#.#.#']],
  ['mudT', P.e5, ['.....', '.###.', '#####', '#####', '#.#.#']],
  ['blindT', P.f7, ['..#..', '#.#.#', '.###.', '#.#.#', '..#..']],
  ['markT', P.a4, ['.###.', '#...#', '#.#.#', '#...#', '.###.']], // markiert (M20, Leuchtpfeil)
].map(([key, color, rows]) => ({ key, color: hexToCss(color), px: rows.flatMap((r, y) => [...r].map((c, x) => (c === '#' ? [x, y] : null)).filter(Boolean)) }));

const SWOOSH_TIME = 0.16;
const RING_TIME = 0.42; // Ringe der Fähigkeiten auf dem Boden (M16)
const RING_COLORS = {
  licht: [hexToCss(P.f8), hexToCss(P.f6)],
  pfiff: [hexToCss(P.a4), hexToCss(P.s7)],
  jubel: [hexToCss(P.f6), hexToCss(P.f4)],
  wirbel: [hexToCss(P.s9), hexToCss(P.s6)],
  // M19: Glockenturm (Sturm- und Friedensglocke)
  glocke: [hexToCss(P.f7), hexToCss(P.e7)],
  frieden: [hexToCss(P.g8), hexToCss(P.f7)],
};
const COOL_STEPS = 24;
const coolCache = new Map();

/**
 * Abklingzeit als Uhrzeiger-Raster (M16): Was noch wartet, liegt dunkel
 * gerastert über der Kachel und gibt sie im Uhrzeigersinn frei.
 */
function cooldownCanvas(fraction) {
  const step = Math.max(1, Math.min(COOL_STEPS, Math.ceil(fraction * COOL_STEPS)));
  let c = coolCache.get(step);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = SLOT_SIZE;
  c.height = SLOT_SIZE;
  const ctx = c.getContext('2d');
  ctx.fillStyle = hexToCss(P.n0);
  const f = step / COOL_STEPS;
  for (let y = 1; y < SLOT_SIZE - 1; y++) {
    for (let x = 1; x < SLOT_SIZE - 1; x++) {
      if (x % 2 === 0 && y % 2 === 0) continue; // drei Viertel dunkel: das Symbol schimmert durch
      const a = Math.atan2(x + 0.5 - SLOT_SIZE / 2, -(y + 0.5 - SLOT_SIZE / 2)); // 0 oben, im Uhrzeigersinn
      const turn = (a < 0 ? a + Math.PI * 2 : a) / (Math.PI * 2);
      if (turn >= 1 - f) ctx.fillRect(x, y, 1, 1);
    }
  }
  coolCache.set(step, c);
  return c;
}
export const LOW_HP = 0.35; // darunter pulsiert der Bildrand und das Herz schlägt (m12-r1)
const LOW_HP_RED = hexToCss(P.f1);

const SLOT = 20;
const SLOT_SIZE = SLOT;
const SLOT_GAP = 2;
const FLOAT_TIME = 1.2;

/** Anzeigename der Tageszeit, z. B. „Vormittag“. */
export function dayPartLabel(hours) {
  const h = ((hours % 24) + 24) % 24;
  let label = T.tageszeiten[T.tageszeiten.length - 1][1];
  for (const [from, name] of T.tageszeiten) if (h >= from) label = name;
  return label;
}

export class Hud {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.toasts = [];
    this.floaters = [];
    this.itemLabel = { text: '', time: 0 };
    this.hint = { text: '', time: 0 };
    this.goalFlash = 0;
    this.time = 0;
    this.homeFlash = 0;
    this.homeAlarm = 0; // Sekunden, die die Haus-Marke am Rand noch steht
    this.gateAlarm = 0; // … und die Tor-Marke, wenn Tor oder Wall angegriffen werden (M17)
    this.gateSpot = null; // wo (Mitte des getroffenen Abschnitts)
    this.speech = null; // { text, time, duration }
    this.bubbles = []; // M29: Sprechblasen der Bewohner { n, text, time, duration }
    this.banner = null; // { text, time }
    this.bannerBottom = null; // Unterkante des Banners (für die Meldungen)
    this.goalBox = { on: false, x: 0, y: 0, w: 0, h: 17 }; // Rahmen der Zielzeile (dieses Bild)
    this.numbers = []; // Schadenszahlen
    this.words = []; // Worte der Reaktionen über dem Kopf (M18)
    this.swooshes = []; // Schwung-Bögen im Nahkampf
    this.rings = []; // Ringe der Fähigkeiten (M16)
    this.warns = []; // Warnkreise der Bosse (M22)
    this.skillTiles = [];
    this.skillPanel = null;
    this.prompt = null; // { text, x, y }
    this.debugLines = null;
    this.slotRects = [];
    this.lanternRect = null;
    this.alarm = null; // H2: { text, time, duration } – die rote Zeile der Nachtleiste
    this.chronicle = { n: 0, text: '', icon: null, t: 99 }; // H2: Neues im Buch (Lesezeichen an der Uhr)
    this.barRect = null; // H2: die Nachtleiste in diesem Bild
    this.clockRect = null;
  }

  /**
   * Meldung. H2 (recherche/hud-baumenue.md 4.6): `kind` sagt, wohin sie gehört – 'alarm' in die
   * rote Zeile der Nachtleiste, 'chronik' als Lesezeichen an die Uhr (Neues im Herbst-, Notiz-
   * oder Werkstattbuch, wartende Baupläne), sonst rechts unter den Vorrat, höchstens zwei auf
   * einmal (die neuesten). `toasts` behält alle – die Prüfung liest sie.
   */
  toast(text, icon = null, duration = 2.8, kind = null) {
    // Gleiche Meldung nicht stapeln, sondern auffrischen
    const same = this.toasts.find((t) => t.text === text);
    if (same) {
      same.time = Math.min(same.time, 0.2);
      same.duration = Math.max(same.duration, duration);
      if (kind === 'alarm' && this.alarm?.text === text) this.alarm.time = Math.min(this.alarm.time, 0.2);
      return;
    }
    this.toasts.push({ text, icon, time: 0, duration, kind });
    if (this.toasts.length > 6) this.toasts.shift();
    if (kind === 'alarm') this.alarm = { text, icon, time: 0, duration: Math.max(4, duration) };
    if (kind === 'chronik') {
      const c = this.chronicle;
      c.n++;
      c.text = text;
      c.icon = icon;
      c.t = 0;
    }
  }

  /** H2: Welche Meldungen rechts stehen – die zwei neuesten gewöhnlichen (Alarme ohne Nachtleiste auch). */
  visibleToasts() {
    const out = [];
    for (let k = this.toasts.length - 1; k >= 0 && out.length < 2; k--) {
      const t = this.toasts[k];
      if (t.kind === 'chronik' || (t.kind === 'alarm' && this.barRect)) continue;
      out.unshift(t);
    }
    return out;
  }

  /** H2: Das Buch ist gesehen (Pausenmenü offen) – das Lesezeichen an der Uhr verschwindet. */
  clearChronicle() {
    this.chronicle.n = 0;
  }

  /**
   * Schwebendes »+n« mit Symbol an einer Weltposition. merge: kurz
   * hintereinander eingesammeltes Loot zählt in einer Zahl hoch.
   */
  floater(x, y, z, text, icon, stack = 0, merge = false) {
    if (merge) {
      const same = this.floaters.find((f) => f.merge && f.icon === icon && f.t < 0.6);
      if (same) {
        same.count += 1;
        same.text = `+${same.count}`;
        same.t = Math.min(same.t, 0.2);
        same.x = x;
        same.y = y;
        same.z = z;
        return;
      }
    }
    this.floaters.push({ x, y, z, text, icon, t: -stack * 0.12, stack, merge, count: 1 });
    if (this.floaters.length > 12) this.floaters.shift();
  }

  /** Großer kurzer Schriftzug oben in der Mitte (»Welle 2/4«). */
  showBanner(text) {
    this.banner = { text, time: 0 };
  }

  /** Schadenszahl an einer Weltposition (rot, wenn Mika getroffen wurde). */
  /** Schwung-Bogen vor Mika: eine helle Sichel läuft einmal durch den Schlagbereich. */
  swoosh(x, z, angle, reach, arc) {
    this.swooshes.push({ x, z, angle, reach, arc, t: 0 });
  }

  drawSwooshes(ui) {
    for (const w of this.swooshes) {
      const q = w.t / SWOOSH_TIME;
      const n = 11;
      for (let k = 0; k < n; k++) {
        const f = k / (n - 1);
        if (f > q + 0.2 || f < q - 0.5) continue; // nur der vordere Teil der Sichel
        const a = w.angle - w.arc + 2 * w.arc * f;
        const p = this.game.worldToUi(w.x + Math.sin(a) * w.reach, 0.85, w.z + Math.cos(a) * w.reach);
        ui.rect(Math.round(p.x), Math.round(p.y), 2, 2, f > q - 0.15 ? COLORS.text : COLORS.textDim);
      }
    }
  }

  /**
   * Warnkreis am Boden (M22): Hier schlägt gleich ein Boss zu. Der Rand blinkt,
   * ein innerer Ring wächst bis zum Rand – dann kommt der Schlag.
   */
  warn(x, z, radius, time) {
    this.warns.push({ x, z, r: radius, t: 0, time });
  }

  drawWarns(ui) {
    const g = this.game;
    const outer = hexToCss(P.r4);
    const inner = hexToCss(P.f6);
    for (const w of this.warns) {
      const q = Math.min(1, w.t / w.time);
      const blink = Math.floor(w.t * 8) % 2 === 0;
      for (const [r, color, gap] of [[w.r, outer, blink ? 1 : 2], [w.r * q, inner, 1]]) {
        if (r < 0.2) continue;
        const c = g.worldToUi(w.x, 0.08, w.z);
        const e = g.worldToUi(w.x + r, 0.08, w.z);
        const n = Math.max(16, Math.round((Math.PI * 2 * Math.abs(e.x - c.x)) / 3));
        for (let k = 0; k < n; k += gap) {
          const a = (k / n) * Math.PI * 2;
          const p = g.worldToUi(w.x + Math.sin(a) * r, 0.08, w.z + Math.cos(a) * r);
          ui.rect(Math.round(p.x), Math.round(p.y), 2, 2, color);
        }
      }
    }
  }

  /** Ring auf dem Boden, der sich ausbreitet (Fähigkeiten, M16). */
  ring(x, z, radius, kind = 'licht') {
    this.rings.push({ x, z, r: radius, kind, t: 0 });
  }

  drawRings(ui) {
    const g = this.game;
    for (const ring of this.rings) {
      const q = ring.t / RING_TIME;
      const r = ring.r * (0.35 + 0.65 * (1 - (1 - q) * (1 - q)));
      const c = g.worldToUi(ring.x, 0.08, ring.z);
      const e = g.worldToUi(ring.x + r, 0.08, ring.z);
      const n = Math.max(16, Math.round((Math.PI * 2 * Math.abs(e.x - c.x)) / 3));
      const [bright, dim] = RING_COLORS[ring.kind] || RING_COLORS.licht;
      const skip = Math.floor(q * 12);
      for (let k = 0; k < n; k++) {
        if (q > 0.55 && (k + skip) % 2) continue; // gegen Ende gerastert ausblenden
        const a = (k / n) * Math.PI * 2;
        const p = g.worldToUi(ring.x + Math.sin(a) * r, 0.08, ring.z + Math.cos(a) * r);
        ui.rect(Math.round(p.x), Math.round(p.y), 2, 2, q < 0.5 ? bright : dim);
      }
    }
  }

  /** Grüne »+n« über einem geflickten Bau (Notbrett, M16). */
  healNumber(x, y, z, amount) {
    if (amount <= 0) return;
    this.numbers.push({ x, y, z, text: `+${amount}`, heal: true, t: 0 });
    if (this.numbers.length > 24) this.numbers.shift();
  }

  /** Ein Wort über dem Kopf (Reaktion, M18): steigt auf, bleibt etwas länger als eine Zahl. */
  popWord(x, y, z, text, color) {
    this.words.push({ x, y, z, text, color, t: 0 });
    if (this.words.length > 12) this.words.shift();
  }

  damageNumber(x, y, z, amount, hurt = false) {
    this.numbers.push({ x: x + (Math.random() - 0.5) * 0.3, y, z, text: String(amount), hurt, t: 0 });
    if (this.numbers.length > 24) this.numbers.shift();
  }

  /**
   * Gedanke der Figur als Sprechblase über dem Kopf (hält das Spiel nicht an).
   * @param {{x:number, y:number, z:number}|null} [who] Weltpunkt über dem Kopf eines
   *   anderen (z. B. Balduins Abschied); sonst spricht Mika
   */
  say(text, duration = 4, who = null) {
    this.speech = { text, time: 0, duration, who };
  }

  showItemLabel(text) {
    this.itemLabel = { text, time: 1.8 };
  }

  /** N4: Hinweise gehen über Funk (Edda unten rechts), nicht mehr mitten ins Bild. */
  showHint(text) {
    this.game.funk?.say(text);
  }

  update(dt) {
    this.time += dt;
    for (const b of this.bubbles) b.time += dt;
    this.bubbles = this.bubbles.filter((b) => b.time < b.duration && b.n.model.root.visible);
    for (const t of this.toasts) t.time += dt;
    this.toasts = this.toasts.filter((t) => t.time < t.duration);
    if (this.alarm) {
      this.alarm.time += dt;
      if (this.alarm.time >= this.alarm.duration) this.alarm = null;
    }
    this.chronicle.t += dt;
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < FLOAT_TIME);
    this.itemLabel.time = Math.max(0, this.itemLabel.time - dt);
    this.hint.time = Math.max(0, this.hint.time - dt);
    this.goalFlash = Math.max(0, this.goalFlash - dt);
    this.homeFlash = Math.max(0, this.homeFlash - dt);
    this.homeAlarm = Math.max(0, this.homeAlarm - dt);
    this.gateAlarm = Math.max(0, this.gateAlarm - dt);
    for (const n of this.numbers) n.t += dt;
    this.numbers = this.numbers.filter((n) => n.t < 0.7);
    for (const w of this.words) w.t += dt;
    this.words = this.words.filter((w) => w.t < 1.3);
    for (const w of this.swooshes) w.t += dt;
    this.swooshes = this.swooshes.filter((w) => w.t < SWOOSH_TIME);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < RING_TIME);
    for (const w of this.warns) w.t += dt;
    this.warns = this.warns.filter((w) => w.t < w.time);
    if (this.banner) {
      this.banner.time += dt;
      if (this.banner.time > 2.4) this.banner = null;
    }
    if (this.speech) {
      this.speech.time += dt;
      if (this.speech.time >= this.speech.duration) this.speech = null;
    }
  }

  /**
   * @param {import('./ui.js').UICanvas} ui
   * @param {{hotbar: boolean, prompt: boolean}} show
   */
  draw(ui, show) {
    if (show.prompt) this.drawLowHealth(ui);
    if (show.prompt) {
      this.drawZombieBars(ui);
      this.drawStatus(ui);
      this.drawChampions(ui);
      this.drawRings(ui);
      this.drawWarns(ui);
      this.drawSwooshes(ui);
      this.drawNumbers(ui);
      this.drawWords(ui);
    }
    this.drawClock(ui);
    this.drawChronicle(ui);
    // Vorrat und Nachtleiste vor dem Ziel: Die Zielzeile endet vor der Leiste dieses Bilds
    // (vorher sah sie im ersten Bild des Abends noch die Leiste des letzten – also keine)
    this.drawResources(ui);
    this.drawNightBar(ui);
    this.drawGoal(ui);
    this.drawBossBar(ui);
    // Randpfeile über den Tafeln: in den Ecken lägen sie sonst darunter
    if (show.prompt) this.drawEdgeMarkers(ui);
    if (show.prompt && !this.game.viewInside) this.drawGoalMarker(ui);
    if (show.prompt) this.drawTargetMark(ui);
    this.drawFloaters(ui);
    if (show.hotbar) this.drawPlayerHp(ui);
    if (show.hotbar) this.drawXp(ui);
    if (show.prompt) this.drawActionProgress(ui);
    if (show.prompt) this.drawBondMarks(ui); // M29: »möchte reden«
    if (show.prompt) this.drawBubbles(ui); // M29: Grüße und Szenen der Bewohner
    if (show.prompt) this.drawSpeech(ui);
    if (show.hotbar) this.drawHotbar(ui);
    if (show.prompt) this.drawSkills(ui);
    else this.skillPanel = null;
    if (show.prompt && this.prompt) this.drawPrompt(ui, this.prompt);
    if (show.hotbar) this.drawLabels(ui);
    if (this.debugLines) this.drawDebug(ui);
  }

  drawClock(ui) {
    const state = this.game.state;
    const hours = hoursOf(state.time.minute);
    const weather = this.game.world.weather.kind; // M12: Wetter des Tages neben dem Tag
    const day = hours >= 7.5 && hours < 18.5;
    let icon = (hours >= 5 && hours < 7.5) || (hours >= 18.5 && hours < 20.5) ? 'daemmerung' : day ? 'sonne' : 'mond';
    if (weather === 'regen' || (day && weather !== 'klar')) icon = weather;
    const tag = this.game.autumn ? this.game.autumn.dayLabel(state.time.day) : `${T.tag} ${state.time.day}`; // M25: »Tag 12 von 30«
    const line1 = weather === 'klar' ? tag : `${tag} · ${T.wetter.name[weather]}`;
    const [d, m] = calendarOf(state.time.day); // G4: Tag n ist der n. Oktober
    const line2 = `${clockText(state.time.minute)} · ${T.kalender.datum(d, T.kalender.monate[m])}`;
    const w = Math.max(measure(line1), measure(line2)) + 32;
    const x = 4;
    const y = 4;
    this.clockRect = { x, y, w, h: 34 };
    ui.panel(x, y, w, 34);
    ui.inset(x + 5, y + 6, 16, 16, { fill: COLORS.inset });
    drawIcon(ui.ctx, icon, x + 7, y + 8);
    ui.text(line1, x + 26, y + 2, COLORS.gold);
    ui.text(line2, x + 26, y + 14, COLORS.text);
    // Tagesfortschritt (Tag beginnt um 06:00) als dünner Balken
    const progress = state.time.minute / 1440;
    ui.rect(x + 5, y + 27, w - 10, 2, COLORS.inset);
    ui.rect(x + 5, y + 27, Math.max(1, Math.round((w - 10) * progress)), 2, COLORS.goldDark);
  }

  /**
   * H2: Neues im Buch als Lesezeichen rechts an der Uhr – ein paar Sekunden mit dem Text, danach
   * nur das Buch und wie viel Neues wartet. Das Pausenmenü räumt es ab.
   */
  drawChronicle(ui) {
    const c = this.chronicle;
    this.chronicleRect = null;
    if (!c.n || !this.clockRect) return;
    const r = this.clockRect;
    const x = r.x + r.w + 3;
    const limit = this.barRect ? this.barRect.x - 4 : ui.width - 8;
    const count = `+${c.n}`;
    let text = c.t < 4 ? c.text : count;
    if (x + measure(text) + 22 > limit) text = count;
    const w = measure(text) + 22;
    const h = 16;
    const y = r.y + 1;
    const fresh = c.t < 2 && Math.floor(c.t * 6) % 2 === 0;
    ui.panel(x, y, w, h, { frame: fresh ? COLORS.gold : COLORS.frame });
    drawIcon(ui.ctx, 'buch', x + 5, y + 3);
    ui.text(text, x + 17, y + 2, c.t < 4 ? COLORS.textWarm : COLORS.gold);
    this.chronicleRect = { x, y, w, h };
  }

  /** Aktuelles Ziel unter der Uhr (Einstieg in die ersten Schritte). */
  drawGoal(ui) {
    const box = this.goalBox;
    box.on = false;
    box.h = 17;
    const goal = this.game.goal;
    const quest = this.game.quests?.goal(); // M23: der laufende Auftrag als zweite Zeile
    if (!goal && !quest) return;
    const rows = [];
    const x = 4;
    const y = 41;
    // H2: Die Zeile reicht nie unter die Nachtleiste – lange Ziele brechen um
    const bar = this.barRect;
    const maxText = bar && bar.y < y + 30 ? Math.max(80, bar.x - 8 - x - 24) : ui.width;
    const add = (icon, text, main) => wrap(text, maxText).forEach((line, k) => rows.push({ icon: k ? null : icon, text: line, main }));
    if (goal) add('ziel', goal.progress ? `${goal.text} ${goal.progress}` : goal.text, true);
    if (quest) add(quest.icon, quest.progress ? `${quest.text} ${quest.progress}` : quest.text, false);
    const w = Math.max(...rows.map((r) => measure(r.text))) + 24;
    const h = 4 + rows.length * 13;
    // Das Banner weicht ihr aus (m12-r1)
    box.on = true;
    box.x = x;
    box.y = y;
    box.w = w;
    box.h = h;
    const flash = this.goalFlash > 0 && Math.floor(this.goalFlash * 8) % 2 === 0;
    ui.panel(x, y, w, h, { frame: flash ? COLORS.gold : COLORS.frame });
    rows.forEach((r, k) => {
      const ry = y + k * 13;
      if (r.icon) {
        const size = iconSize(r.icon);
        drawIcon(ui.ctx, r.icon, x + 5 + Math.floor((10 - size.w) / 2), ry + 3 + Math.max(0, Math.floor((11 - size.h) / 2)));
      }
      ui.text(r.text, x + 17, ry + 2, r.main ? (flash ? COLORS.gold : COLORS.textWarm) : COLORS.text);
    });
  }

  visibleResources() {
    const st = this.game.state;
    const list = RESOURCES.filter((id) => {
      if (id === 'zahnraeder') return st.inventory.zahnraeder > 0 || st.flags.fundZahnrad;
      if (id === 'teile') return st.inventory.teile > 0 || st.flags.fundTeile;
      if (RARE_RESOURCES.includes(id)) return st.inventory[id] > 0 || st.flags.fundModerkern;
      return true;
    });
    return [...list, ...QUEST_ITEMS.filter((id) => st.inventory[id] > 0)]; // N7: Nägel und Zucker für Marthe
  }

  drawResources(ui) {
    const inv = this.game.state.inventory;
    const entries = this.visibleResources().map((id) => ({ id, value: String(inv[id] ?? 0) }));
    const widths = entries.map((e) => 10 + 3 + measure(e.value));
    const total = widths.reduce((a, b) => a + b, 0) + (entries.length - 1) * 7 + 12;
    const x0 = ui.width - total - 4;
    // Schmales Fenster: Vorrat unter Uhr und Ziel statt daneben
    const y = x0 < 130 ? (this.goalBox.on ? this.goalBox.y + this.goalBox.h + 4 : 42) : 4;
    this.resRect = { x: x0, y, w: total, h: 20 }; // N4: darunter hängen Nachtplan und Meldungen
    ui.panel(x0, y, total, 20);
    let x = x0 + 6;
    const hovered = [];
    entries.forEach((e, i) => {
      drawIcon(ui.ctx, e.id, x, y + 5);
      ui.text(e.value, x + 13, y + 3, COLORS.text);
      if (ui.hover(x, y, widths[i], 20)) hovered.push(e.id);
      x += widths[i] + 7;
    });
    if (hovered.length) {
      const name = T.ressourcen[hovered[0]];
      const w = measure(name) + 10;
      const mx = Math.min(ui.width - w - 2, Math.max(2, ui.mouse.x - w / 2));
      ui.panel(mx, y + 23, w, 16);
      ui.text(name, mx + 5, y + 25, COLORS.textWarm);
    }
  }

  drawFloaters(ui) {
    for (const f of this.floaters) {
      if (f.t < 0) continue;
      const q = f.t / FLOAT_TIME;
      if (q > 0.8 && Math.floor(f.t * 14) % 2 === 0) continue;
      const p = this.game.worldToUi(f.x, f.y, f.z);
      const rise = Math.round((1 - (1 - q) * (1 - q)) * 16);
      const w = measure(f.text) + (f.icon ? 12 : 0);
      const x = Math.round(p.x - w / 2);
      const y = Math.round(p.y - 14 - rise - f.stack * 12);
      ui.text(f.text, x, y, COLORS.textWarm, { outline: COLORS.outline });
      if (f.icon) drawIcon(ui.ctx, f.icon, x + measure(f.text) + 2, y + 2);
    }
  }

  /** Oben Mitte: Nacht, Welle und Standfestigkeit des Zuhauses. */
  /**
   * Boss (M22): Name und breiter Lebensbalken unter der Nachtleiste – solange er
   * lebt, auch wenn er gerade nicht im Bild ist. Holt er aus, blinkt die Warnung.
   */
  drawBossBar(ui) {
    const g = this.game;
    this.bossShown = null;
    let boss = null;
    let hp = 0;
    let max = 0;
    for (const z of g.horde.list) {
      if (!z.def.boss || z.state === 'dying') continue;
      if (!boss) boss = z;
      hp += z.hp; // der zerfallene Moosriese: alle drei zusammen
      max += z.maxHp;
    }
    if (!boss) return;
    const B = T.bosse[boss.type];
    const w = 220;
    const x = Math.round(ui.width / 2 - w / 2);
    const y = this.nightBarBottom + 3;
    ui.panel(x, y, w, 24, { frame: COLORS.gold });
    ui.textCentered(B.titel, ui.width / 2, y + 2, COLORS.gold);
    const q = Math.max(0, Math.min(1, hp / Math.max(1, max)));
    ui.rect(x + 6, y + 15, w - 12, 5, COLORS.outline);
    ui.rect(x + 7, y + 16, Math.max(0, Math.round((w - 14) * q)), 3, COLORS.buildBad);
    if (boss.boss?.windup > 0 && Math.floor(g.clock * 6) % 2 === 0) ui.text(B.warnung, x + w - 6 - measure(B.warnung), y + 2, COLORS.red);
    this.bossShown = { name: B.titel, hp: Math.round(hp), max: Math.round(max) };
    this.nightBarBottom = y + 24;
  }

  /**
   * Die Nachtleiste (H2, recherche/hud-baumenue.md 4.4): oben in der Mitte steht alles über die
   * Nacht an einer Stelle. Abends: wie viele Wellen, die erste mit Uhrzeit und Weg, »N: Ich bin
   * bereit«. Nachts: Welle, Haus, Tor, woher die Horde kommt, in der Pause die nächste Welle.
   * Ganz unten die Alarmzeile in Rot. Den ganzen Plan zeigt die Karte (M).
   */
  drawNightBar(ui) {
    const g = this.game;
    const st = g.state;
    const max = HOUSE_LEVELS[st.world.houseLevel].hp;
    const active = g.nights.active;
    // Das Tor (M17) steht mit in der Leiste, sobald es angeschlagen ist oder die Nacht läuft
    const gate = g.world.buildings.gate;
    const gateMax = gate ? maxHpOf(gate) : 0;
    const gateHurt = Boolean(gate && (gate.broken || gate.hp < gateMax - 0.5));
    const damaged = st.world.homeHp < max - 0.5 || gateHurt;
    const view = g.nights.planView();
    const alarm = this.alarm;
    this.nightBarBottom = 4;
    this.bannerBottom = null;
    this.barRect = null;
    this.planRect = null;
    this.planBottom = null;
    const cx = Math.round(ui.width / 2);
    let bottom = 34;
    if (active || damaged || view || alarm) {
      const plan = g.nights.plan;
      const bars = active || damaged;
      const gateRow = bars && gate && (active || gateHurt);
      // Kopfzeile: Nacht und Welle (Zeitraffer als »»), abends die Zahl der Wellen
      const title = active && plan ? `${T.horde.nacht(st.night.n)} · ${T.horde.welleKurz(Math.max(1, st.night.wave), plan.waves.length)}` : view?.evening ? T.nacht.planAbend(view.total) : T.horde.zuhause;
      const fast = active && g.fast ? ' »»' : '';
      // Textzeilen unter den Balken: [Text, Farbe]
      const lines = [];
      if (view && view.rows.length) {
        const r = view.rows[0];
        const wege = r.entries.map((e) => T.horde.richtungKurz[e]).join(' + ');
        const merkmal = `${r.trait ? ` · ${T.wellen.merkmale[r.trait][0]}` : ''}${r.boss ? ` · ${T.bosse.plan(T.bosse[r.boss].titel)}` : ''}`; // M22: immer angekündigt
        const schwer = r.heavy.length ? ` · ${T.nacht.mit(r.heavy.map((t) => T.horde.arten[t][1]).join(', '))}` : '';
        lines.push([`${T.horde.welleKurz(r.n, view.total)} · ${clockText(r.at)} · ${wege}${merkmal}${schwer}`, view.evening ? COLORS.text : COLORS.textWarm]);
        if (view.lure) lines.push([T.wagnis.planLocke(T.horde.richtungKurz[view.lure]), COLORS.text]); // M24
        if (view.canCall) lines.push([view.evening ? T.nacht.rufenAbend : T.nacht.rufenHinweis, COLORS.textWarm]);
        else if (view.evening && !view.juna) lines.push([T.nacht.planOhneJuna, COLORS.textDim]);
        if (view.rows.length > 1 || view.more) lines.push([T.nacht.planKarte, COLORS.textDim]);
      } else if (active && plan) {
        // Woher kommt die Welle – und zwischen den Wellen: woher kommt die nächste? (m3-r1)
        const from = g.nights.directionText();
        if (from) lines.push([from, COLORS.gold]);
      }
      // Zwischen Uhr (samt Lesezeichen) und Vorrat: mittig, wenn Platz ist – lange Zeilen brechen um
      const left = Math.max(this.clockRect ? this.clockRect.x + this.clockRect.w + 4 : 4, this.chronicleRect ? this.chronicleRect.x + this.chronicleRect.w + 4 : 0);
      const right = this.resRect && this.resRect.y < 30 ? this.resRect.x - 4 : ui.width - 4;
      const maxW = Math.max(150, right - left);
      const rows = [];
      for (const [text, color] of lines) for (const part of wrap(text, maxW - 14)) rows.push([part, color]);
      const alarmRows = alarm ? wrap(alarm.text, maxW - 14) : [];
      const textW = Math.max(measure(title + fast), ...rows.map(([t]) => measure(t)), ...alarmRows.map((t) => measure(t)));
      const w = Math.min(maxW, Math.max(bars ? 150 : 124, textW + 14));
      const x = Math.round(Math.max(left, Math.min(right - w, cx - w / 2)));
      const y = 4;
      const h = 15 + (bars ? 13 : 0) + (gateRow ? 13 : 0) + rows.length * 11 + alarmRows.length * 11 + (alarmRows.length ? 1 : 0) + 3;
      const mid = x + w / 2;
      ui.panel(x, y, w, h, { frame: alarm && alarm.time < 1.5 && Math.floor(alarm.time * 6) % 2 === 0 ? COLORS.red : COLORS.frame });
      const titleColor = active ? COLORS.textWarm : view?.evening ? COLORS.gold : COLORS.text;
      ui.textCentered(title + fast, mid, y + 2, titleColor);
      let ry = y + 15;
      if (bars) {
        const q = Math.max(0, Math.min(1, st.world.homeHp / max));
        const hit = this.homeFlash > 0 && Math.floor(this.homeFlash * 12) % 2 === 0;
        this.drawBar(ui, x, ry, w, 'haus', q, `${Math.round(st.world.homeHp)}/${max}`, hit, false);
        ry += 13;
      }
      if (gateRow) {
        // Tor: eigener Balken unter dem Zuhause; eingestürzt blinkt die Zeile
        const gq = gate.broken ? 0 : Math.max(0, Math.min(1, gate.hp / gateMax));
        const blink = gate.broken && Math.floor(g.clock * 3) % 2 === 0;
        this.drawBar(ui, x, ry, w, 'tor', gq, gate.broken ? T.lager.offen : `${Math.ceil(gate.hp)}/${gateMax}`, false, blink);
        ry += 13;
      }
      for (const [text, color] of rows) {
        ui.textCentered(text, mid, ry, color);
        ry += 11;
      }
      if (alarmRows.length) {
        // Die Alarmzeile (H2): Schlurfer im Lager, das Tor, Umgeworfenes – rot, erst blinkend
        const on = alarm.time > 1 || Math.floor(alarm.time * 8) % 2 === 0;
        for (const text of alarmRows) {
          if (on) ui.textCentered(text, mid, ry + 1, COLORS.red);
          ry += 11;
        }
      }
      bottom = y + h;
      this.nightBarBottom = bottom;
      this.barRect = { x, y, w, h };
      if (view) {
        this.planRect = this.barRect; // die Prüfung fragt, ob der Plan zu sehen ist (M16, M22)
        this.planBottom = bottom;
      }
    }
    this.bannerBottom = null;
    if (this.banner) {
      const b = this.banner;
      let by = Math.max(40, bottom + 6);
      // m12-r1: Ein langes Ziel lag unter »Nacht geschafft!« – dann rückt das Banner darunter
      const gb = this.goalBox;
      if (gb.on && cx - measure(b.text) - 2 < gb.x + gb.w + 4 && by < gb.y + gb.h + 2) by = gb.y + gb.h + 4;
      if (b.time < 2 || Math.floor(b.time * 10) % 2 === 0) this.game.drawBigText(ui, b.text, cx, by, 2, COLORS.gold);
      this.bannerBottom = by + 20; // Meldungen erscheinen darunter (m3-r2: sie verdeckten das Banner)
    }
  }

  /** Ein Balken der Nachtleiste (Haus, Tor): Zeichen, Balken und die Zahl in der Hauptschrift (H2). */
  drawBar(ui, x, y, w, icon, q, text, hit, blink) {
    const tw = measure(text);
    const barW = w - 26 - tw - 4;
    drawIcon(ui.ctx, icon, x + 5, y);
    ui.rect(x + 20, y + 4, barW, 5, COLORS.outline);
    ui.rect(x + 21, y + 5, Math.max(0, Math.round((barW - 2) * q)), 3, hit ? COLORS.text : q > 0.5 ? COLORS.buildOk : q > 0.25 ? COLORS.gold : COLORS.buildBad);
    ui.text(text, x + w - 6 - tw, y + 1, hit ? COLORS.text : blink ? COLORS.buildBad : COLORS.textWarm);
  }

  /** Balken über Mikas Kopf beim Durchsuchen und Ernten: hier stehen bleiben. */
  drawActionProgress(ui) {
    const a = this.game.player.action;
    if (!a || !a.progress) return;
    const p = this.game.player.position;
    const pos = this.game.worldToUi(p.x, p.y + 2.05, p.z);
    const w = 22;
    const x = Math.round(pos.x - w / 2);
    const y = Math.round(pos.y);
    ui.rect(x - 1, y - 1, w + 2, 5, COLORS.outline);
    ui.rect(x, y, w, 3, COLORS.inset);
    ui.rect(x, y, Math.max(1, Math.round(w * Math.min(1, a.t / a.duration))), 3, COLORS.gold);
  }

  /** Wenig Leben (m12-r1: die Ohnmacht kam ohne Vorwarnung): Der Bildrand pulsiert rot. */
  drawLowHealth(ui) {
    const g = this.game;
    const q = g.state.player.hp / g.combat.maxHp;
    if (q >= LOW_HP || q <= 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5.5);
    const a = (0.35 + 0.4 * (1 - q / LOW_HP)) * (0.5 + 0.5 * pulse);
    const w = ui.width;
    const h = ui.height;
    // Tiefes Rot, innen lockerer: hebt sich vom herbstlich-orangen Laub ab
    for (const [t, k] of [[22, 0.45], [12, 0.8], [5, 1.2]]) {
      const amount = Math.min(0.95, a * k);
      ui.ditherRect(0, 0, w, t, amount, LOW_HP_RED);
      ui.ditherRect(0, h - t, w, t, amount, LOW_HP_RED);
      ui.ditherRect(0, t, t, h - 2 * t, amount, LOW_HP_RED);
      ui.ditherRect(w - t, t, t, h - 2 * t, amount, LOW_HP_RED);
    }
  }

  /** Mikas Lebensbalken über der Schnellleiste. */
  drawPlayerHp(ui) {
    const g = this.game;
    const max = g.combat.maxHp;
    const hp = g.state.player.hp;
    if (hp >= max - 0.5 && !g.nights.active) return;
    const r = this.hotbarRect(ui);
    const y = r.y - 11;
    const w = r.w - 8;
    ui.rect(r.x + 4, y, w, 5, COLORS.outline);
    const q = Math.max(0, Math.min(1, hp / max));
    const flash = g.combat.hurtFlash > 0 && Math.floor(g.combat.hurtFlash * 16) % 2 === 0;
    ui.rect(r.x + 5, y + 1, Math.max(0, Math.round((w - 2) * q)), 3, flash ? COLORS.text : q > 0.3 ? COLORS.red : COLORS.buildBad);
    drawIcon(ui.ctx, 'herz', r.x + w - 2, y - 2);
  }

  /** Erfahrung: schmaler goldener Balken direkt über der Schnellleiste, links die Stufe. */
  drawXp(ui) {
    const pl = this.game.state.player;
    if (pl.level <= 1 && pl.xp <= 0) return;
    const r = this.hotbarRect(ui);
    const y = r.y - 3;
    const label = String(pl.level);
    const lw = label.length * 4 + 3;
    ui.rect(r.x + 4, y - 3, lw + 1, 7, COLORS.outline);
    drawTiny(ui.ctx, label, r.x + 6, y - 2, COLORS.gold);
    const x = r.x + 5 + lw;
    const w = r.w - 9 - lw;
    ui.rect(x, y, w, 3, COLORS.outline);
    const q = Math.max(0, Math.min(1, pl.xp / xpForLevel(pl.level)));
    if (q > 0) ui.rect(x + 1, y + 1, Math.max(1, Math.round((w - 2) * q)), 1, COLORS.gold);
    // Neue Stufe im Getümmel: Die Wahl kommt, sobald es ruhig ist
    if ((this.game.state.perkChoice || this.game.state.skillChoice) && !this.game.perkChoice.isOpen) {
      const text = this.game.state.skillChoice ? T.faehigkeiten.wartet : T.perks.wartet;
      const tw = measure(text) + 10;
      const pulse = Math.floor(this.game.clock * 3) % 2 === 0;
      ui.panel(r.x + 4, y - 31, tw, 15, { frame: pulse ? COLORS.gold : COLORS.frame }); // über dem Lebensbalken
      ui.text(text, r.x + 9, y - 29, COLORS.gold);
    }
  }

  /**
   * Champions (M21): goldener Name über dem Kopf, darunter die Merkmale, dazu ein
   * breiter Lebensbalken (der Schild als heller Streifen darüber).
   */
  drawChampions(ui) {
    const g = this.game;
    this.championsShown = 0;
    for (const z of g.horde.list) {
      if (!z.champion || z.state === 'dying' || g.horde.isHidden(z)) continue;
      const p = g.worldToUi(z.x, 2.05 * z.def.scale * (z.size || 1), z.z);
      if (p.x < -40 || p.y < -30 || p.x > ui.width + 40 || p.y > ui.height + 30) continue;
      this.championsShown++;
      const name = T.champions.namen[z.champion.name];
      const traits = z.champion.traits.map((t) => T.champions.merkmale[t]).join(', ');
      const y = Math.round(p.y) - 12; // über den Zeichen der Zustände
      ui.text(traits, Math.round(p.x - measure(traits) / 2), y - LINE_HEIGHT, COLORS.textWarm, { outline: COLORS.outline });
      ui.text(name, Math.round(p.x - measure(name) / 2), y - LINE_HEIGHT * 2, COLORS.gold, { outline: COLORS.outline });
      const w = 26;
      const x = Math.round(p.x - w / 2);
      const by = Math.round(p.y);
      ui.rect(x - 1, by - 1, w + 2, 5, COLORS.gold);
      ui.rect(x, by, w, 3, COLORS.outline);
      ui.rect(x + 1, by + 1, Math.max(1, Math.round((w - 2) * (z.hp / z.maxHp))), 1, COLORS.buildBad);
      if (z.shield > 0) ui.rect(x + 1, by + 2, Math.max(1, Math.round((w - 2) * (z.shield / z.shieldMax))), 1, COLORS.text);
    }
  }

  /** Kleine Lebensbalken über verletzten Schlurfern. */
  drawZombieBars(ui) {
    const g = this.game;
    for (const z of g.horde.list) {
      if (z.state === 'dying' || z.hp >= z.maxHp || z.champion || z.def.boss || g.horde.isHidden(z)) continue; // Champions und Bosse: eigener Balken (M21, M22); im Nebel nichts
      const p = g.worldToUi(z.x, 2.05 * z.def.scale, z.z);
      const w = z.type === 'anfuehrer' ? 30 : z.type === 'brummer' ? 20 : 12;
      const x = Math.round(p.x - w / 2);
      const y = Math.round(p.y);
      ui.rect(x, y, w, 3, COLORS.outline);
      ui.rect(x + 1, y + 1, Math.max(1, Math.round((w - 2) * (z.hp / z.maxHp))), 1, z.freezeT > 0 ? COLORS.green : COLORS.buildBad);
    }
  }

  /** Zustände als kleine Zeichen über dem Kopf (M18), höchstens drei je Schlurfer. */
  drawStatus(ui) {
    const g = this.game;
    this.statusShown = 0;
    for (const z of g.horde.list) {
      if (z.state === 'dying' || g.horde.isHidden(z)) continue;
      const shown = [];
      for (const s of STATUS_PIX) {
        if (z[s.key] > 0) shown.push(s);
        if (shown.length === 3) break;
      }
      if (!shown.length) continue;
      const p = g.worldToUi(z.x, 2.05 * z.def.scale, z.z);
      if (p.x < -10 || p.y < -10 || p.x > ui.width + 10 || p.y > ui.height + 10) continue;
      this.statusShown++;
      const w = shown.length * 7 - 1;
      let x = Math.round(p.x - w / 2);
      const y = Math.round(p.y) - 8;
      for (const s of shown) {
        ui.rect(x - 1, y - 1, 7, 7, COLORS.outline);
        for (const [px, py] of s.px) ui.rect(x + px, y + py, 1, 1, s.color);
        x += 7;
      }
    }
  }

  /** Worte der Reaktionen (M18): farbig, mit Umriss, steigen auf. */
  drawWords(ui) {
    for (const w of this.words) {
      const p = this.game.worldToUi(w.x, w.y, w.z);
      const rise = Math.round(Math.min(1, w.t / 0.5) * 12 + w.t * 6);
      if (w.t > 1.05 && Math.floor(w.t * 20) % 2) continue; // blinkt aus
      ui.text(w.text, Math.round(p.x - measure(w.text) / 2), Math.round(p.y - 22 - rise), w.color, { outline: COLORS.outline });
    }
  }

  drawNumbers(ui) {
    for (const n of this.numbers) {
      const p = this.game.worldToUi(n.x, n.y, n.z);
      const rise = Math.round(n.t * 22);
      ui.text(n.text, Math.round(p.x - measure(n.text) / 2), Math.round(p.y - 10 - rise), n.heal ? COLORS.green : n.hurt ? COLORS.buildBad : COLORS.text, { outline: COLORS.outline });
    }
  }

  /** Pfeile am Bildrand zu Schlurfern außerhalb des Bildes. */
  /**
   * Pfeile am Bildrand zu Schlurfern außerhalb des Bildes: je Richtung einer,
   * mit Anzahl, blinkend (der Anführer in Gold).
   */
  /**
   * Hat das Ziel einen festen Ort (die Axt am Hackklotz), zeigt ein kleiner
   * goldener Pfeil dorthin: über dem Ort wippend, außerhalb des Bildes am Rand.
   */
  drawGoalMarker(ui) {
    const g = this.game;
    this.goalMark = null;
    const t = g.goalTarget();
    if (!t) return;
    const p = g.worldToUi(t.x, t.y, t.z);
    // Für die Textansicht der Playtest-Brücke: wo der Pfeil steht (m6-r1)
    const ux = p.x - ui.width / 2;
    const uy = p.y - ui.height / 2;
    const ul = Math.hypot(ux, uy) || 1;
    const side = [ux / ul < -0.38 ? 'links' : ux / ul > 0.38 ? 'rechts' : '', uy / ul < -0.38 ? 'oben' : uy / ul > 0.38 ? 'unten' : ''].filter(Boolean).join(' ') || 'mitte';
    const tri = (x, y, dx, dy) => {
      // Dreieck mit Spitze in Richtung (dx, dy), Umriss dunkel
      const px = -dy;
      const py = dx;
      for (let k = 0; k <= 6; k++) {
        const w = 6 - k;
        for (let s = -w; s <= w; s++) ui.rect(Math.round(x + dx * k + px * s), Math.round(y + dy * k + py * s), 1, 1, s === -w || s === w || k === 0 ? COLORS.outline : COLORS.gold);
      }
    };
    if (p.x >= 8 && p.x < ui.width - 8 && p.y >= 24 && p.y < ui.height - 40) {
      tri(p.x, p.y - 14 + Math.round(Math.sin(g.clock * 4) * 2), 0, 1);
      this.goalMark = { imBild: true, richtung: side };
      return;
    }
    this.goalMark = { imBild: false, richtung: side };
    const cx = ui.width / 2;
    const cy = ui.height / 2;
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    // Unten über der Hinweiszeile (m12-r1: der Pfeil steckte mitten im Text)
    const limitY = dy > 0 ? ui.height / 2 - 96 : ui.height / 2 - 70;
    const k = Math.min((ui.width / 2 - 22) / Math.abs(dx || 1e-3), limitY / Math.abs(dy || 1e-3));
    tri(cx + dx * k - (dx / len) * 6, cy + dy * k - (dy / len) * 6, dx / len, dy / len);
  }

  /**
   * Schlurfer unter dem Zeiger: kleine Ecken um ihn – golden, wenn ein Klick ihn
   * erreicht, sonst blass (m7-r1: hinter Dach oder Krone wusste man nicht, wo
   * man hinklicken muss und ob er nah genug ist).
   */
  drawTargetMark(ui) {
    const g = this.game;
    const z = g.mode === 'play' && !g.builder.placement ? g.builder.pointerZombie : null;
    if (!z || z.state === 'dying') return;
    const r = z.def.radius + 0.15;
    const a = g.worldToUi(z.x - r, 1.7 * (z.def.scale || 1), z.z - r);
    const c = g.worldToUi(z.x + r, 0, z.z + r);
    const x0 = Math.round(Math.min(a.x, c.x)) - 2;
    const y0 = Math.round(Math.min(a.y, c.y)) - 2;
    const x1 = Math.round(Math.max(a.x, c.x)) + 2;
    const y1 = Math.round(Math.max(a.y, c.y)) + 2;
    const color = g.combat.canReach(z) ? COLORS.gold : COLORS.textDim;
    const L = 4;
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      ui.rect(Math.min(x, x + dx * (L - 1)), y, L, 1, color);
      ui.rect(x, Math.min(y, y + dy * (L - 1)), 1, L, color);
    }
  }

  drawEdgeMarkers(ui) {
    const g = this.game;
    const cx = ui.width / 2;
    const cy = ui.height / 2;
    // Pfeile liegen in einem Rahmen ohne die HUD-Tafeln (oben Uhr/Ziel/Vorrat, unten Leisten)
    const safe = { x0: 14, x1: ui.width - 14, y0: 86, y1: ui.height - 60 };
    const sx = (safe.x0 + safe.x1) / 2;
    const sy = (safe.y0 + safe.y1) / 2;
    const edge = (ux, uy) => {
      const k = Math.min((safe.x1 - sx) / Math.abs(ux || 1e-3), (safe.y1 - sy) / Math.abs(uy || 1e-3));
      return { x: Math.round(sx + ux * k), y: Math.round(sy + uy * k) };
    };
    const sectors = new Map();
    this.edgeCount = 0;
    this.edgeMarks = [];
    if (g.viewInside) {
      // Drinnen (M11): keine Pfeile zu Schlurfern und Beute draußen. Wird das Haus
      // angegriffen, blinkt unten das Haus – dort geht es durch die Tür hinaus.
      if (this.homeAlarm > 0) {
        const blinkIn = Math.floor(g.clock * 3) % 2 === 0;
        const x = Math.round(cx);
        const y = safe.y1 - 10;
        ui.rect(x - 9, y - 9, 18, 18, COLORS.outline);
        ui.rect(x - 8, y - 8, 16, 16, blinkIn ? COLORS.buildBad : COLORS.fill);
        drawIcon(ui.ctx, 'haus', x - 6, y - 6);
        this.edgeMarks.push({ art: 'zuhause', richtung: 'unten', anzahl: 1 });
      }
      return;
    }
    const where = (ux, uy) => {
      const h = ux < -0.38 ? 'links' : ux > 0.38 ? 'rechts' : '';
      const v = uy < -0.38 ? 'oben' : uy > 0.38 ? 'unten' : '';
      return [h, v].filter(Boolean).join(' ') || 'mitte';
    };
    // Liegengebliebene Beute außerhalb des Bildes: kleine goldene Rauten
    // (m3-r1: »Wo liegt die Beute?«) – unter den Pfeilen der Schlurfer
    const lootSectors = new Map();
    // Nachts steht über liegender Beute im Bild eine kleine funkelnde Raute
    // (m3-r2: »im Dunkeln nichts gefunden«)
    const dark = g.world.dayNight.night > 0.45;
    for (const it of g.loot.items) {
      if (it.flying) continue;
      const p = g.worldToUi(it.x, 0.2, it.z);
      if (p.x >= 0 && p.x < ui.width && p.y >= 0 && p.y < ui.height) {
        if (dark) {
          const x = Math.round(p.x);
          const y = Math.round(p.y - 12 + Math.sin(g.clock * 3 + it.x * 1.7) * 1.5);
          const bright = Math.floor(g.clock * 2 + it.z) % 2 === 0;
          for (let k = -3; k <= 3; k++) ui.rect(x - (3 - Math.abs(k)), y + k, 2 * (3 - Math.abs(k)) + 1, 1, COLORS.outline);
          for (let k = -2; k <= 2; k++) ui.rect(x - (2 - Math.abs(k)), y + k, 2 * (2 - Math.abs(k)) + 1, 1, bright ? COLORS.text : COLORS.gold);
        }
        continue;
      }
      const a = Math.atan2(p.y - cy, p.x - cx);
      const key = Math.round(a / (Math.PI / 4)); // gröber als bei Schlurfern: ein Haufen, eine Raute
      const s = lootSectors.get(key) || { dx: 0, dy: 0, n: 0 };
      s.dx += p.x - cx;
      s.dy += p.y - cy;
      s.n++;
      lootSectors.set(key, s);
    }
    for (const s of lootSectors.values()) {
      const len = Math.hypot(s.dx, s.dy) || 1;
      const ux = s.dx / len;
      const uy = s.dy / len;
      const at = edge(ux, uy);
      const x = Math.round(at.x - ux * 16);
      const y = Math.round(at.y - uy * 16);
      for (let k = -5; k <= 5; k++) ui.rect(x - (5 - Math.abs(k)), y + k, 2 * (5 - Math.abs(k)) + 1, 1, COLORS.outline);
      for (let k = -4; k <= 4; k++) ui.rect(x - (4 - Math.abs(k)), y + k, 2 * (4 - Math.abs(k)) + 1, 1, COLORS.gold);
      for (let k = -1; k <= 1; k++) ui.rect(x - (1 - Math.abs(k)), y + k - 1, 2 * (1 - Math.abs(k)) + 1, 1, COLORS.text);
      if (s.n > 1) {
        const label = String(s.n);
        const tx = Math.round(x - ux * 11 - (label.length * 4) / 2);
        const ty = Math.round(y - uy * 11 - 2);
        ui.rect(tx - 1, ty - 1, label.length * 4 + 1, 7, COLORS.outline);
        drawTiny(ui.ctx, label, tx, ty, COLORS.gold);
      }
      this.edgeMarks.push({ art: 'beute', richtung: where(ux, uy), anzahl: s.n });
    }
    for (const z of g.horde.list) {
      if (z.state === 'dying' || g.horde.isHidden(z)) continue; // im Nebel verborgen (M22)
      const p = g.worldToUi(z.x, 0.8, z.z);
      if (p.x >= 0 && p.x < ui.width && p.y >= 0 && p.y < ui.height) continue;
      this.edgeCount++;
      const a = Math.atan2(p.y - cy, p.x - cx);
      const key = Math.round(a / (Math.PI / 6));
      const s = sectors.get(key) || { dx: 0, dy: 0, n: 0, leader: false };
      s.dx += p.x - cx;
      s.dy += p.y - cy;
      s.n++;
      s.leader = s.leader || z.type === 'anfuehrer' || Boolean(z.def.boss);
      sectors.set(key, s);
    }
    const blink = Math.floor(this.game.clock * 3) % 2 === 0;
    // Wird das Zuhause außerhalb des Bildes angegriffen? Dann zeigt eine Haus-Marke dorthin.
    if (this.homeAlarm > 0) {
      const home = g.world.pathing.home;
      const hp = g.worldToUi((home.minX + home.maxX) / 2, 1, (home.minZ + home.maxZ) / 2);
      if (hp.x < 0 || hp.x >= ui.width || hp.y < 0 || hp.y >= ui.height) {
        const len = Math.hypot(hp.x - sx, hp.y - sy) || 1;
        const at = edge((hp.x - sx) / len, (hp.y - sy) / len);
        ui.rect(at.x - 9, at.y - 9, 18, 18, COLORS.outline);
        ui.rect(at.x - 8, at.y - 8, 16, 16, blink ? COLORS.buildBad : COLORS.fill);
        drawIcon(ui.ctx, 'haus', at.x - 6, at.y - 6);
        this.edgeMarks.push({ art: 'zuhause', richtung: where((hp.x - sx) / len, (hp.y - sy) / len), anzahl: 1 });
      }
    }
    // Tor oder Wall unter Beschuss (M17) und nicht im Bild: eine Tor-Marke am Rand
    if (this.gateAlarm > 0 && this.gateSpot) {
      const gp = g.worldToUi(this.gateSpot.x, 1, this.gateSpot.z);
      if (gp.x < 0 || gp.x >= ui.width || gp.y < 0 || gp.y >= ui.height) {
        const len = Math.hypot(gp.x - sx, gp.y - sy) || 1;
        const at = edge((gp.x - sx) / len, (gp.y - sy) / len);
        ui.rect(at.x - 9, at.y - 9, 18, 18, COLORS.outline);
        ui.rect(at.x - 8, at.y - 8, 16, 16, blink ? COLORS.buildBad : COLORS.fill);
        drawIcon(ui.ctx, 'tor', at.x - 6, at.y - 5);
        this.edgeMarks.push({ art: 'tor', richtung: where((gp.x - sx) / len, (gp.y - sy) / len), anzahl: 1 });
      }
    }
    // Nachtplan (M16): Woher kommt die nächste Welle? Hohle Pfeile mit der Nummer der
    // Welle am Rand, im Bild ein kleines Wellenzeichen über dem Waldrand
    const next = g.nights.nextEntries();
    if (next) {
      for (const name of next.entries) {
        const e = g.world.pathing.entries[name];
        if (!e) continue;
        const p = g.worldToUi(e.x, 1.2, e.z);
        const label = String(next.n);
        if (p.x >= 8 && p.x < ui.width - 8 && p.y >= 8 && p.y < ui.height - 8) {
          const bob = Math.round(Math.sin(g.clock * 3) * 1.5);
          const x = Math.round(p.x);
          const y = Math.round(p.y) + bob;
          ui.rect(x - 6, y - 6, 13, 13, COLORS.outline);
          ui.rect(x - 5, y - 5, 11, 11, blink ? COLORS.fillHover : COLORS.fill);
          drawTiny(ui.ctx, label, x - label.length * 2 + 1, y - 2, COLORS.gold);
          this.edgeMarks.push({ art: 'welle', richtung: 'im Bild', anzahl: next.n });
          continue;
        }
        const len = Math.hypot(p.x - sx, p.y - sy) || 1;
        const ux = (p.x - sx) / len;
        const uy = (p.y - sy) / len;
        const { x: bx, y: by } = edge(ux, uy);
        this.drawArrow(ui, bx, by, ux, uy, 9, COLORS.outline);
        this.drawArrow(ui, bx, by, ux, uy, 6.5, blink ? COLORS.gold : COLORS.goldDark);
        this.drawArrow(ui, bx, by, ux, uy, 3.5, COLORS.outline); // hohl: die Welle kommt erst noch
        const tx = Math.round(bx - ux * 13 - (label.length * 4) / 2);
        const ty = Math.round(by - uy * 13 - 2);
        ui.rect(tx - 1, ty - 1, label.length * 4 + 1, 7, COLORS.outline);
        drawTiny(ui.ctx, label, tx, ty, COLORS.gold);
        this.edgeMarks.push({ art: 'welle', richtung: where(ux, uy), anzahl: next.n });
      }
    }
    for (const s of sectors.values()) {
      const len = Math.hypot(s.dx, s.dy) || 1;
      const ux = s.dx / len;
      const uy = s.dy / len;
      const { x: bx, y: by } = edge(ux, uy);
      const color = s.leader ? COLORS.gold : blink ? COLORS.buildBad : COLORS.goldDark;
      this.drawArrow(ui, bx, by, ux, uy, 9, COLORS.outline);
      this.drawArrow(ui, bx, by, ux, uy, 6.5, color);
      this.edgeMarks.push({ art: s.leader ? 'anfuehrer' : 'schlurfer', richtung: where(ux, uy), anzahl: s.n });
      if (s.n > 1) {
        const label = String(s.n);
        const tx = Math.round(bx - ux * 12 - (label.length * 4) / 2);
        const ty = Math.round(by - uy * 12 - 2);
        ui.rect(tx - 1, ty - 1, label.length * 4 + 1, 7, COLORS.outline);
        drawTiny(ui.ctx, label, tx, ty, COLORS.text);
      }
    }
  }

  /** Gefülltes Dreieck (Pfeilspitze) in Richtung (ux, uy), Pixel für Pixel. */
  drawArrow(ui, x, y, ux, uy, size, color) {
    const px = -uy;
    const py = ux;
    // Spitz und schmal, damit die Richtung eindeutig ist (fast gleichseitig liest sich falsch)
    const tip = [x + ux * size * 1.2, y + uy * size * 1.2];
    const a = [x - ux * size * 0.5 + px * size * 0.6, y - uy * size * 0.5 + py * size * 0.6];
    const b = [x - ux * size * 0.5 - px * size * 0.6, y - uy * size * 0.5 - py * size * 0.6];
    const minX = Math.floor(Math.min(tip[0], a[0], b[0]));
    const maxX = Math.ceil(Math.max(tip[0], a[0], b[0]));
    const minY = Math.floor(Math.min(tip[1], a[1], b[1]));
    const maxY = Math.ceil(Math.max(tip[1], a[1], b[1]));
    const side = (p, q, rx, ry) => (q[0] - p[0]) * (ry - p[1]) - (q[1] - p[1]) * (rx - p[0]);
    ui.ctx.fillStyle = color;
    for (let yy = minY; yy <= maxY; yy++) {
      for (let xx = minX; xx <= maxX; xx++) {
        const d1 = side(tip, a, xx + 0.5, yy + 0.5);
        const d2 = side(a, b, xx + 0.5, yy + 0.5);
        const d3 = side(b, tip, xx + 0.5, yy + 0.5);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) ui.ctx.fillRect(xx, yy, 1, 1);
      }
    }
  }

  /** Lage der Sprechblase über Mika (oder über `who`) – null, wenn keine da ist. */
  speechLayout(ui) {
    const s = this.speech;
    if (!s) return null;
    const p = s.who || this.game.player.position;
    const at = this.game.worldToUi(p.x, p.y + (s.who ? 0 : 2.1), p.z);
    // Lange Gedanken brechen um (M25: »…über den Nordweg, den Mittelweg und den Südweg…« lief über den Rand)
    const maxW = Math.min(ui.width - 8, SPEECH_MAX_W);
    const lines = measure(s.text) + 12 > maxW ? wrap(s.text, maxW - 12) : [s.text];
    const w = Math.max(...lines.map((l) => measure(l))) + 12;
    const h = 5 + lines.length * LINE_HEIGHT;
    const x = Math.round(Math.min(ui.width - w - 4, Math.max(4, at.x - w / 2)));
    const y = Math.round(Math.max(62, at.y - h - 1)); // nie über Uhr und Ziel
    // Liegt dort die Tafel des Nachtplans (gleiches Bild, schon gezeichnet) oder eine Meldung,
    // steht der Gedanke unter den Füßen – sonst verdeckten sie sich (M25, Frostnacht; M27:
    // »Schlafhütte gebaut« lag auf »Hannes könnte ins freie Zelt ziehen«). Einmal unten,
    // bleibt er dort, bis er verklingt – er springt nicht mitten im Lesen.
    const hit = (r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h + 2 > r.y;
    const pr = this.planRect;
    if (s.below || (pr && hit(pr)) || this.toastRects(ui).some(hit)) {
      s.below = true;
      const foot = this.game.worldToUi(p.x, p.y - (s.who ? 1.6 : 0), p.z);
      return { x, y: Math.round(Math.min(ui.height - h - 60, foot.y + 6)), w, h, lines, at: foot, below: true };
    }
    return { x, y, w, h, lines, at, below: false };
  }

  /** Sprechblase über einer Figur (M29): `n` ist der NPC (x, y, z), `duration` in s. */
  bubble(n, text, duration = 3) {
    const same = this.bubbles.find((b) => b.n === n);
    if (same) {
      same.text = text;
      same.time = 0;
      same.duration = duration;
      return;
    }
    this.bubbles.push({ n, text, time: 0, duration });
    if (this.bubbles.length > 4) this.bubbles.shift();
  }

  /** Sprechblasen der Bewohner: klein, über dem Kopf, sie weichen einander nach oben aus. */
  drawBubbles(ui) {
    const placed = [];
    for (const b of this.bubbles) {
      if (b.duration - b.time < 0.3 && Math.floor(b.time * 12) % 2 === 0) continue;
      const n = b.n;
      const at = this.game.worldToUi(n.x, (n.y || 0) + (n.dog ? 0.9 : 2.0), n.z);
      if (at.x < -8 || at.x > ui.width + 8 || at.y < 8 || at.y > ui.height) continue; // Figur nicht im Bild (drinnen, am Rand)
      const maxW = Math.min(ui.width - 8, 150);
      const lines = measure(b.text) + 12 > maxW ? wrap(b.text, maxW - 12) : [b.text];
      const w = Math.max(...lines.map((l) => measure(l))) + 10;
      const h = 4 + lines.length * LINE_HEIGHT;
      const x = Math.round(Math.min(ui.width - w - 4, Math.max(4, at.x - w / 2)));
      let y = Math.round(at.y - h - 3);
      for (const r of placed) if (x < r.x + r.w && x + w > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y) y = r.y - h - 3;
      y = Math.max(62, y);
      // Wie Mikas Gedanken: liegt dort der Nachtplan oder eine Meldung, steht die Blase unter den Füßen
      const hit = (r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h + 2 > r.y;
      const below = (this.planRect && hit(this.planRect)) || this.toastRects(ui).some(hit);
      if (below) y = Math.round(Math.min(ui.height - h - 60, this.game.worldToUi(n.x, n.y || 0, n.z).y + 5));
      placed.push({ x, y, w, h });
      ui.panel(x, y, w, h, { fill: COLORS.fillLight });
      lines.forEach((l, k) => ui.text(l, x + 5, y + 1 + k * LINE_HEIGHT, COLORS.text));
      const tx = Math.round(Math.min(x + w - 6, Math.max(x + 5, at.x)));
      ui.rect(tx - 1, below ? y : y + h - 1, 3, 1, COLORS.outline);
      ui.rect(tx, below ? y - 1 : y + h, 1, 1, COLORS.outline);
    }
  }

  /** Über wem ein Bindungsmoment wartet (M29): eine kleine Sprechblase mit Herz, sanft wippend. */
  drawBondMarks(ui) {
    const g = this.game;
    if (!g.bonds || g.viewInside) return;
    for (const [id, n] of g.survivors.npcs.list) {
      if (!n.model.root.visible || !g.bonds.wantsTalk(id) || g.posts?.onDuty(id)) continue;
      if (this.bubbles.some((b) => b.n === n)) continue;
      const at = g.worldToUi(n.x, (n.y || 0) + (n.dog ? 1.0 : 2.05), n.z);
      if (at.x < -8 || at.x > ui.width + 8 || at.y < 8 || at.y > ui.height) continue;
      const bob = Math.round(Math.sin(this.time * 3 + n.x) * 1.5);
      drawIcon(ui.ctx, 'reden', Math.round(at.x - 4), Math.round(at.y - 10 + bob));
    }
  }

  drawSpeech(ui) {
    this.speechRect = null;
    const s = this.speech;
    const L = this.speechLayout(ui);
    if (!L) return;
    if (s.duration - s.time < 0.4 && Math.floor(s.time * 12) % 2 === 0) return;
    const { x, y, w, h, lines, at, below } = L;
    this.speechRect = { x, y: below ? y - 2 : y, w, h: h + 2 }; // m16-r1: der E-Hinweis weicht der Sprechblase aus
    ui.panel(x, y, w, h, { fill: COLORS.fillLight });
    lines.forEach((l, k) => ui.text(l, x + 6, y + 2 + k * LINE_HEIGHT, COLORS.text));
    // Zipfel der Sprechblase (unter den Füßen zeigt er nach oben)
    const tx = Math.round(Math.min(x + w - 8, Math.max(x + 6, at.x)));
    const edge = below ? y : y + h - 1;
    const dir = below ? -1 : 1;
    ui.rect(tx - 2, edge, 5, 1, COLORS.outline);
    ui.rect(tx - 1, edge + dir, 3, 1, COLORS.outline);
    ui.rect(tx, edge + 2 * dir, 1, 1, COLORS.outline);
  }

  /**
   * H1: Oberkante von Mikas Gruppe unten links (Schnellleiste, Leben, Erfahrung, wartende
   * Wahl) – darüber spricht Edda über Funk.
   */
  groupTop(ui) {
    const r = this.hotbarRect(ui);
    const g = this.game;
    let top = r.y;
    if (g.state.player.hp < g.combat.maxHp - 0.5 || g.nights.active) top = r.y - 13; // Lebensbalken
    else if (g.state.player.level > 1 || g.state.player.xp > 0) top = r.y - 7; // Erfahrung
    if ((g.state.perkChoice || g.state.skillChoice) && !g.perkChoice.isOpen) top = r.y - 35; // »Wahl wartet«
    return top;
  }

  hotbarRect(ui) {
    const width = (HOTBAR_SIZE + 1) * SLOT + HOTBAR_SIZE * SLOT_GAP + 5 + 8;
    return { x: 4, y: ui.height - SLOT - 12, w: width, h: SLOT + 8 };
  }

  drawHotbar(ui) {
    const { slots, selected } = this.game.state.hotbar;
    const r = this.hotbarRect(ui);
    ui.panel(r.x, r.y, r.w, r.h);
    // Laterne in der linken Hand (Taste F)
    const lx = r.x + 4;
    const ly = r.y + 4;
    const lit = this.game.player.holdingLantern;
    ui.inset(lx, ly, SLOT, SLOT, { fill: lit ? COLORS.fillHover : COLORS.inset, border: lit ? COLORS.gold : COLORS.frameDark });
    const lIcon = lit ? 'laterne' : 'laterneAus';
    const ls = iconSize(lIcon);
    drawIcon(ui.ctx, lIcon, lx + Math.floor((SLOT - ls.w) / 2), ly + Math.floor((SLOT - ls.h) / 2));
    drawTiny(ui.ctx, 'F', lx + 2, ly + 2, lit ? COLORS.gold : COLORS.textDim);
    this.lanternRect = { x: lx, y: ly, w: SLOT, h: SLOT };
    ui.rect(lx + SLOT + 3, ly + 2, 1, SLOT - 4, COLORS.frameDark);

    this.slotRects = [];
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const sx = lx + SLOT + 7 + i * (SLOT + SLOT_GAP);
      const sy = ly;
      const isSelected = i === selected;
      const hovered = ui.hover(sx, sy, SLOT, SLOT);
      ui.inset(sx, sy, SLOT, SLOT, {
        fill: isSelected ? COLORS.fillHover : hovered ? COLORS.fillLight : COLORS.inset,
        border: isSelected ? COLORS.gold : COLORS.frameDark,
      });
      const item = slots[i];
      if (item && ITEMS[item]) {
        const icon = ITEMS[item].icon;
        const size = iconSize(icon);
        drawIcon(ui.ctx, icon, sx + Math.floor((SLOT - size.w) / 2), sy + Math.floor((SLOT - size.h) / 2));
        // M30: Schusswaffe – Schuss im Magazin (unten links), leer rot
        if (ITEMS[item].gun) {
          const arms = this.game.arms;
          const mag = arms.mag(item);
          const reserve = arms.reserve(item);
          const text = arms.reload?.id === item ? '-' : String(mag); // beim Nachladen ein Strich
          drawTiny(ui.ctx, text, sx + 2, sy + SLOT - 7, mag > 0 ? COLORS.text : reserve > 0 ? COLORS.gold : COLORS.red);
          drawTiny(ui.ctx, reserve, sx + SLOT - 2 - 4 * String(reserve).length, sy + SLOT - 7, COLORS.textDim);
        }
      }
      drawTiny(ui.ctx, i + 1, sx + 2, sy + 2, isSelected ? COLORS.gold : COLORS.textDim);
      this.slotRects.push({ x: sx, y: sy, w: SLOT, h: SLOT });
    }
  }

  /** Zwei Kacheln rechts neben der Schnellleiste: Mikas Fähigkeiten (M16). */
  skillLayout(ui) {
    const r = this.hotbarRect(ui);
    const x = r.x + r.w + 3;
    const panel = { x, y: r.y, w: 2 * SLOT + SLOT_GAP + 8, h: r.h };
    const tiles = [0, 1].map((k) => ({ x: x + 4 + k * (SLOT + SLOT_GAP), y: r.y + 4, w: SLOT, h: SLOT }));
    return { panel, tiles };
  }

  drawSkills(ui) {
    const sk = this.game.skills;
    const L = this.skillLayout(ui);
    this.skillPanel = L.panel;
    this.skillTiles = L.tiles;
    ui.panel(L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    let hoverK = -1;
    L.tiles.forEach((t, k) => {
      const id = sk.slot(k);
      const cool = sk.coolFraction(k);
      const flash = sk.readyFlash[k] > 0 && Math.floor(sk.readyFlash[k] * 10) % 2 === 0;
      const shake = sk.denied[k] > 0 ? Math.round(Math.sin(sk.denied[k] * 70)) : 0;
      const hovered = ui.hover(t.x, t.y, t.w, t.h);
      if (hovered) hoverK = k;
      const x = t.x + shake;
      ui.inset(x, t.y, t.w, t.h, { fill: hovered && id ? COLORS.fillLight : COLORS.inset, border: flash ? COLORS.gold : sk.denied[k] > 0 ? COLORS.buildBad : COLORS.frameDark });
      if (id) {
        const icon = SKILLS[id].icon;
        const size = iconSize(icon);
        drawIcon(ui.ctx, icon, x + Math.floor((SLOT - size.w) / 2), t.y + Math.floor((SLOT - size.h) / 2) + 1);
        if (cool > 0) {
          ui.ctx.drawImage(cooldownCanvas(cool), x, t.y);
          const secs = String(Math.ceil(sk.cool[k]));
          const w = secs.length * 4 + 1;
          ui.rect(x + SLOT - w - 1, t.y + SLOT - 8, w + 1, 7, COLORS.outline);
          drawTiny(ui.ctx, secs, x + SLOT - w, t.y + SLOT - 7, COLORS.text);
        }
        // Rang über 1: goldene Punkte oben rechts
        for (let n = 1; n < sk.rankOf(id); n++) ui.rect(x + SLOT - 4 - (n - 1) * 3, t.y + 2, 2, 2, COLORS.gold);
      } else {
        drawTiny(ui.ctx, '3', x + 9, t.y + 8, COLORS.frameDark); // kommt auf Stufe 3
      }
      // Taste oben links: rechte Maustaste bzw. X
      if (k === 0) drawIcon(ui.ctx, 'maus', x + 1, t.y + 1);
      else drawTiny(ui.ctx, 'X', x + 2, t.y + 2, COLORS.textDim);
    });
    // M23: Juna auf dem Hochsitz – das Leuchtfeuer liegt auf J
    const juna = this.game.posts?.junaView();
    if (juna) {
      const text = juna.wartet > 0 ? T.posten.hudWartet(Math.ceil(juna.wartet)) : T.posten.hudBereit;
      const w = measure(text) + 22;
      const jx = L.panel.x + L.panel.w - w;
      const jy = L.panel.y - 17;
      ui.panel(jx, jy, w, 15);
      drawIcon(ui.ctx, 'juna', jx + 4, jy + 2);
      ui.text(text, jx + 17, jy + 1, juna.wartet > 0 ? COLORS.textDim : COLORS.gold);
    }
    // Name und Taste über den Kacheln, solange die Maus darauf zeigt
    if (hoverK >= 0) {
      const id = sk.slot(hoverK);
      const text = id ? `${T.faehigkeiten[id][0]} · ${T.faehigkeiten.taste[hoverK]}` : T.faehigkeiten.leer;
      const tw = measure(text);
      const tx = Math.max(4, Math.min(ui.width - tw - 4, Math.round(L.panel.x + L.panel.w / 2 - tw / 2)));
      ui.text(text, tx, L.panel.y - 13, COLORS.gold, { outline: COLORS.outline });
    }
  }

  /** Kachel der Fähigkeit unter der Maus (0, 1) oder -1. */
  skillAt(ui) {
    if (!this.skillPanel) return -1;
    return this.skillTiles.findIndex((t) => ui.hover(t.x, t.y, t.w, t.h));
  }

  /** Liegt die Maus über den Fähigkeiten? */
  containsSkills(ui) {
    const r = this.skillPanel;
    return Boolean(r && ui.hover(r.x, r.y, r.w, r.h));
  }

  /** Index des Platzes unter der Maus, -2 für die Laterne, sonst -1. */
  slotAt(ui) {
    if (this.lanternRect && ui.hover(this.lanternRect.x, this.lanternRect.y, SLOT, SLOT)) return -2;
    return this.slotRects.findIndex((s) => ui.hover(s.x, s.y, s.w, s.h));
  }

  /** Liegt die Maus über der Schnellleiste? */
  containsHotbar(ui) {
    const r = this.hotbarRect(ui);
    return ui.hover(r.x, r.y, r.w, r.h);
  }

  drawLabels(ui) {
    // Die Hinweis-Tafel der Bauleiste hat Vorrang (sie steht an derselben Stelle).
    if (this.game.buildbar.showsTip) return;
    const y = ui.height - 78;
    if (this.itemLabel.time > 0 && this.itemLabel.text) {
      ui.textCentered(this.itemLabel.text, ui.width / 2, y, COLORS.gold, { outline: COLORS.outline });
    } else if (this.hint.time > 0 && this.hint.text) {
      const blinkOut = this.hint.time < 1 && Math.floor(this.hint.time * 8) % 2 === 0;
      if (!blinkOut) ui.textCentered(this.hint.text, ui.width / 2, y, COLORS.textWarm, { outline: COLORS.outline });
    }
  }

  drawPrompt(ui, prompt) {
    const label = prompt.text;
    const w = measure(label) + 24;
    const h = 17;
    // Ziel am Boden markieren: vier kleine Ecken, damit man sieht, worauf E wirkt
    if (prompt.target) {
      const tx = Math.round(prompt.target.x);
      const ty = Math.round(prompt.target.y);
      const color = prompt.dim ? COLORS.textDim : COLORS.textWarm;
      for (const [dx, dy, ex, ey] of [[-9, -5, 1, 1], [8, -5, -1, 1], [-9, 5, 1, -1], [8, 5, -1, -1]]) {
        ui.rect(tx + dx, ty + dy, 2, 1, color);
        ui.rect(tx + dx + (ex < 0 ? 1 : 0), ty + dy + ey, 1, 1, color);
      }
    }
    const x = Math.round(Math.min(ui.width - w - 2, Math.max(2, prompt.x - w / 2)));
    let y = Math.round(Math.min(ui.height - 60, Math.max(40, prompt.y - h)));
    // M28: Auch der Nachtplan am Abend bleibt lesbar – der Hinweis rückt unter die Tafel
    const pr = this.planRect;
    if (pr && x < pr.x + pr.w && x + w > pr.x && y < pr.y + pr.h && y + h > pr.y) y = pr.y + pr.h + 2;
    // m16-r1: Lag der Hinweis auf Mikas Gedanken, war der nicht zu lesen – dann darunter
    const sr = this.speechRect;
    if (sr && x < sr.x + sr.w && x + w > sr.x && y < sr.y + sr.h && y + h > sr.y) y = sr.y + sr.h + 2;
    this.promptRect = { x, y, w, h };
    ui.panel(x, y, w, h);
    // Tastenkappe
    ui.inset(x + 4, y + 3, 11, 11, { fill: prompt.dim ? COLORS.textDim : COLORS.textWarm, border: COLORS.outline });
    ui.text(T.tasten.benutzen, x + 7, y + 1, COLORS.outline);
    ui.text(label, x + 19, y + 2, prompt.dim ? COLORS.textDim : COLORS.text);
  }

  /** Oberkante der Meldungen im Spiel: unter dem Ziel, dem Banner und dem Nachtplan. */
  /** N4: Meldungen stehen rechts unter Vorrat und Nachtplan, nicht mehr mitten im Bild. */
  toastTop() {
    const r = this.resRect;
    return r ? r.y + r.h + 4 : 28;
  }

  /** H2: Eine Meldung rechts, die in die Nachtleiste reichen würde, rückt unter sie. */
  toastStart(ui, y, w) {
    const bar = this.barRect;
    if (bar && ui.width - w - 4 < bar.x + bar.w + 4 && y < bar.y + bar.h + 3) return bar.y + bar.h + 3;
    return y;
  }

  /** Wo die Meldungen im Spiel liegen (wie `drawToasts` sie legt) – für die Sprechblase (M27). */
  toastRects(ui, y = this.toastTop()) {
    return this.visibleToasts().map((t) => {
      const w = measure(t.text) + (t.icon ? 26 : 12);
      y = this.toastStart(ui, y, w);
      const r = { x: ui.width - w - 4, y, w, h: 18 };
      y += 21;
      return r;
    });
  }

  /** Meldungen untereinander, ab Höhe `y` (Standard: unter dem Ziel) – höchstens zwei (H2). */
  drawToasts(ui, y = 64) {
    this.shown = this.visibleToasts();
    for (const t of this.shown) {
      const w = measure(t.text) + (t.icon ? 26 : 12);
      y = this.toastStart(ui, y, w);
      const slide = Math.min(1, t.time / 0.18);
      const out = t.duration - t.time < 0.35 && Math.floor(t.time * 12) % 2 === 0;
      if (!out) {
        const x = ui.width - w - 4 + Math.round((1 - slide) * 8); // N4: rechts, gleitet von rechts herein
        const yy = y;
        ui.panel(x, yy, w, 18);
        let tx = x + 6;
        if (t.icon) {
          const size = iconSize(t.icon);
          drawIcon(ui.ctx, t.icon, x + 5 + Math.floor((12 - size.w) / 2), yy + Math.floor((18 - size.h) / 2));
          tx = x + 20;
        }
        ui.text(t.text, tx, yy + 3, COLORS.textWarm);
      }
      y += 21;
    }
  }

  drawDebug(ui) {
    const lines = this.debugLines;
    const w = Math.max(...lines.map((l) => measure(l))) + 10;
    const x = 4;
    const y = 62;
    ui.panel(x, y, w, lines.length * LINE_HEIGHT + 6, { fill: COLORS.inset });
    lines.forEach((l, i) => ui.text(l, x + 5, y + 2 + i * LINE_HEIGHT, i === 0 ? COLORS.gold : COLORS.text));
  }
}
