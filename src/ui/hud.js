// HUD: Tag und Uhrzeit, aktuelles Ziel, Vorrat, Schnellleiste mit Laterne,
// Kontexthinweise, schwebende »+n« beim Sammeln und Meldungen.
// Unten links die Schnellleiste, unten rechts die Bauleiste (eigene Datei).

import { T } from '../data/texts.js';
import { RESOURCES, RARE_RESOURCES, ITEMS, HOTBAR_SIZE } from '../data/items.js';
import { HOUSE_LEVELS } from '../data/buildings.js';
import { clockText, hoursOf } from '../core/state.js';
import { COLORS } from './ui.js';
import { measure, LINE_HEIGHT, drawTiny } from './font.js';
import { drawIcon, iconSize } from './icons.js';
import { xpForLevel } from '../data/perks.js';

const SWOOSH_TIME = 0.16;

const SLOT = 20;
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
    this.homeFlash = 0;
    this.homeAlarm = 0; // Sekunden, die die Haus-Marke am Rand noch steht
    this.speech = null; // { text, time, duration }
    this.banner = null; // { text, time }
    this.bannerBottom = null; // Unterkante des Banners (für die Meldungen)
    this.numbers = []; // Schadenszahlen
    this.swooshes = []; // Schwung-Bögen im Nahkampf
    this.prompt = null; // { text, x, y }
    this.debugLines = null;
    this.slotRects = [];
    this.lanternRect = null;
  }

  toast(text, icon = null, duration = 2.8) {
    // Gleiche Meldung nicht stapeln, sondern auffrischen
    const same = this.toasts.find((t) => t.text === text);
    if (same) {
      same.time = Math.min(same.time, 0.2);
      same.duration = Math.max(same.duration, duration);
      return;
    }
    this.toasts.push({ text, icon, time: 0, duration });
    if (this.toasts.length > 4) this.toasts.shift();
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

  damageNumber(x, y, z, amount, hurt = false) {
    this.numbers.push({ x: x + (Math.random() - 0.5) * 0.3, y, z, text: String(amount), hurt, t: 0 });
    if (this.numbers.length > 24) this.numbers.shift();
  }

  /** Gedanke der Figur als Sprechblase über dem Kopf (hält das Spiel nicht an). */
  say(text, duration = 4) {
    this.speech = { text, time: 0, duration };
  }

  showItemLabel(text) {
    this.itemLabel = { text, time: 1.8 };
  }

  showHint(text, duration = 12) {
    this.hint = { text, time: duration };
  }

  update(dt) {
    for (const t of this.toasts) t.time += dt;
    this.toasts = this.toasts.filter((t) => t.time < t.duration);
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < FLOAT_TIME);
    this.itemLabel.time = Math.max(0, this.itemLabel.time - dt);
    this.hint.time = Math.max(0, this.hint.time - dt);
    this.goalFlash = Math.max(0, this.goalFlash - dt);
    this.homeFlash = Math.max(0, this.homeFlash - dt);
    this.homeAlarm = Math.max(0, this.homeAlarm - dt);
    for (const n of this.numbers) n.t += dt;
    this.numbers = this.numbers.filter((n) => n.t < 0.7);
    for (const w of this.swooshes) w.t += dt;
    this.swooshes = this.swooshes.filter((w) => w.t < SWOOSH_TIME);
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
    if (show.prompt) {
      this.drawZombieBars(ui);
      this.drawSwooshes(ui);
      this.drawNumbers(ui);
    }
    this.drawClock(ui);
    this.drawGoal(ui);
    this.drawResources(ui);
    this.drawNightBar(ui);
    // Randpfeile über den Tafeln: in den Ecken lägen sie sonst darunter
    if (show.prompt) this.drawEdgeMarkers(ui);
    this.drawFloaters(ui);
    if (show.hotbar) this.drawPlayerHp(ui);
    if (show.hotbar) this.drawXp(ui);
    if (show.prompt) this.drawActionProgress(ui);
    if (show.prompt) this.drawSpeech(ui);
    if (show.hotbar) this.drawHotbar(ui);
    if (show.prompt && this.prompt) this.drawPrompt(ui, this.prompt);
    if (show.hotbar) this.drawLabels(ui);
    if (this.debugLines) this.drawDebug(ui);
  }

  drawClock(ui) {
    const state = this.game.state;
    const hours = hoursOf(state.time.minute);
    const icon = (hours >= 5 && hours < 7.5) || (hours >= 18.5 && hours < 20.5) ? 'daemmerung' : hours >= 7.5 && hours < 18.5 ? 'sonne' : 'mond';
    const line1 = `${T.tag} ${state.time.day}`;
    const line2 = `${clockText(state.time.minute)} · ${dayPartLabel(hours)}`;
    const w = Math.max(measure(line1), measure(line2)) + 32;
    const x = 4;
    const y = 4;
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

  /** Aktuelles Ziel unter der Uhr (Einstieg in die ersten Schritte). */
  drawGoal(ui) {
    const goal = this.game.goal;
    if (!goal) return;
    const x = 4;
    const y = 41;
    const text = goal.progress ? `${goal.text} ${goal.progress}` : goal.text;
    const w = measure(text) + 24;
    const flash = this.goalFlash > 0 && Math.floor(this.goalFlash * 8) % 2 === 0;
    ui.panel(x, y, w, 17, { frame: flash ? COLORS.gold : COLORS.frame });
    drawIcon(ui.ctx, 'ziel', x + 5, y + 3);
    ui.text(text, x + 17, y + 2, flash ? COLORS.gold : COLORS.textWarm);
  }

  visibleResources() {
    const st = this.game.state;
    return RESOURCES.filter((id) => {
      if (id === 'zahnraeder') return st.inventory.zahnraeder > 0 || st.flags.fundZahnrad;
      if (RARE_RESOURCES.includes(id)) return st.inventory[id] > 0 || st.flags.fundModerkern;
      return true;
    });
  }

  drawResources(ui) {
    const inv = this.game.state.inventory;
    const entries = this.visibleResources().map((id) => ({ id, value: String(inv[id] ?? 0) }));
    const widths = entries.map((e) => 10 + 3 + measure(e.value));
    const total = widths.reduce((a, b) => a + b, 0) + (entries.length - 1) * 7 + 12;
    const x0 = ui.width - total - 4;
    // Schmales Fenster: Vorrat unter Uhr und Ziel statt daneben
    const y = x0 < 130 ? (this.game.goal ? 62 : 42) : 4;
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
  drawNightBar(ui) {
    const g = this.game;
    const st = g.state;
    const max = HOUSE_LEVELS[st.world.houseLevel].hp;
    const active = g.nights.active;
    const damaged = st.world.homeHp < max - 0.5;
    if (!active && !damaged && !this.banner) return;
    const cx = Math.round(ui.width / 2);
    let bottom = 34;
    if (active || damaged) {
      const plan = g.nights.plan;
      // Woher kommt die Welle – und zwischen den Wellen: woher kommt die nächste? (m3-r1)
      const from = active && plan ? g.nights.directionText() : null;
      const w = Math.max(124, from ? measure(from) + 12 : 0);
      const x = Math.round(cx - w / 2);
      const y = 4;
      ui.panel(x, y, w, from ? 42 : 30);
      bottom = y + (from ? 42 : 30);
      const label = active && plan ? `${T.horde.nacht(st.night.n)} · ${T.horde.welleKurz(Math.max(1, st.night.wave), plan.waves.length)}` : T.horde.zuhause;
      ui.textCentered(label, cx, y + 2, active ? COLORS.textWarm : COLORS.text);
      if (from) ui.textCentered(from, cx, y + 28, COLORS.gold);
      const q = Math.max(0, Math.min(1, st.world.homeHp / max));
      drawIcon(ui.ctx, 'haus', x + 5, y + 15);
      // Standfestigkeit auch als Zahl (m3-r2: »nur ein Balken ohne Zahl«)
      const hpText = `${Math.round(st.world.homeHp)}/${max}`;
      const barW = w - 26 - hpText.length * 4 - 3;
      ui.rect(x + 20, y + 19, barW, 5, COLORS.outline);
      const hit = this.homeFlash > 0 && Math.floor(this.homeFlash * 12) % 2 === 0;
      ui.rect(x + 21, y + 20, Math.max(0, Math.round((barW - 2) * q)), 3, hit ? COLORS.text : q > 0.5 ? COLORS.buildOk : q > 0.25 ? COLORS.gold : COLORS.buildBad);
      drawTiny(ui.ctx, hpText, x + 20 + barW + 3, y + 19, hit ? COLORS.text : COLORS.textWarm);
    }
    this.bannerBottom = null;
    if (this.banner) {
      const b = this.banner;
      const by = Math.max(40, bottom + 6);
      if (b.time < 2 || Math.floor(b.time * 10) % 2 === 0) this.game.drawBigText(ui, b.text, cx, by, 2, COLORS.gold);
      this.bannerBottom = by + 20; // Meldungen erscheinen darunter (m3-r2: sie verdeckten das Banner)
    }
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
    if (this.game.state.perkChoice && !this.game.perkChoice.isOpen) {
      const text = T.perks.wartet;
      const tw = measure(text) + 10;
      const pulse = Math.floor(this.game.clock * 3) % 2 === 0;
      ui.panel(r.x + 4, y - 31, tw, 15, { frame: pulse ? COLORS.gold : COLORS.frame }); // über dem Lebensbalken
      ui.text(text, r.x + 9, y - 29, COLORS.gold);
    }
  }

  /** Kleine Lebensbalken über verletzten Schlurfern. */
  drawZombieBars(ui) {
    const g = this.game;
    for (const z of g.horde.list) {
      if (z.state === 'dying' || z.hp >= z.maxHp) continue;
      const p = g.worldToUi(z.x, 2.05 * z.def.scale, z.z);
      const w = z.type === 'anfuehrer' ? 30 : z.type === 'brummer' ? 20 : 12;
      const x = Math.round(p.x - w / 2);
      const y = Math.round(p.y);
      ui.rect(x, y, w, 3, COLORS.outline);
      ui.rect(x + 1, y + 1, Math.max(1, Math.round((w - 2) * (z.hp / z.maxHp))), 1, z.freezeT > 0 ? COLORS.green : COLORS.buildBad);
    }
  }

  drawNumbers(ui) {
    for (const n of this.numbers) {
      const p = this.game.worldToUi(n.x, n.y, n.z);
      const rise = Math.round(n.t * 22);
      ui.text(n.text, Math.round(p.x - measure(n.text) / 2), Math.round(p.y - 10 - rise), n.hurt ? COLORS.buildBad : COLORS.text, { outline: COLORS.outline });
    }
  }

  /** Pfeile am Bildrand zu Schlurfern außerhalb des Bildes. */
  /**
   * Pfeile am Bildrand zu Schlurfern außerhalb des Bildes: je Richtung einer,
   * mit Anzahl, blinkend (der Anführer in Gold).
   */
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
      if (z.state === 'dying') continue;
      const p = g.worldToUi(z.x, 0.8, z.z);
      if (p.x >= 0 && p.x < ui.width && p.y >= 0 && p.y < ui.height) continue;
      this.edgeCount++;
      const a = Math.atan2(p.y - cy, p.x - cx);
      const key = Math.round(a / (Math.PI / 6));
      const s = sectors.get(key) || { dx: 0, dy: 0, n: 0, leader: false };
      s.dx += p.x - cx;
      s.dy += p.y - cy;
      s.n++;
      s.leader = s.leader || z.type === 'anfuehrer';
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

  drawSpeech(ui) {
    const s = this.speech;
    if (!s) return;
    if (s.duration - s.time < 0.4 && Math.floor(s.time * 12) % 2 === 0) return;
    const p = this.game.player.position;
    const at = this.game.worldToUi(p.x, p.y + 2.1, p.z);
    const w = measure(s.text) + 12;
    const x = Math.round(Math.min(ui.width - w - 4, Math.max(4, at.x - w / 2)));
    const y = Math.round(Math.max(62, at.y - 18)); // nie über Uhr und Ziel
    ui.panel(x, y, w, 17, { fill: COLORS.fillLight });
    ui.text(s.text, x + 6, y + 2, COLORS.text);
    // Zipfel der Sprechblase
    const tx = Math.round(Math.min(x + w - 8, Math.max(x + 6, at.x)));
    ui.rect(tx - 2, y + 16, 5, 1, COLORS.outline);
    ui.rect(tx - 1, y + 17, 3, 1, COLORS.outline);
    ui.rect(tx, y + 18, 1, 1, COLORS.outline);
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
      }
      drawTiny(ui.ctx, i + 1, sx + 2, sy + 2, isSelected ? COLORS.gold : COLORS.textDim);
      this.slotRects.push({ x: sx, y: sy, w: SLOT, h: SLOT });
    }
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
    const y = Math.round(Math.min(ui.height - 60, Math.max(40, prompt.y - h)));
    ui.panel(x, y, w, h);
    // Tastenkappe
    ui.inset(x + 4, y + 3, 11, 11, { fill: prompt.dim ? COLORS.textDim : COLORS.textWarm, border: COLORS.outline });
    ui.text(T.tasten.benutzen, x + 7, y + 1, COLORS.outline);
    ui.text(label, x + 19, y + 2, prompt.dim ? COLORS.textDim : COLORS.text);
  }

  /** Meldungen untereinander, ab Höhe `y` (Standard: unter dem Ziel). */
  drawToasts(ui, y = 64) {
    for (const t of this.toasts) {
      const w = measure(t.text) + (t.icon ? 26 : 12);
      const slide = Math.min(1, t.time / 0.18);
      const out = t.duration - t.time < 0.35 && Math.floor(t.time * 12) % 2 === 0;
      if (!out) {
        const x = Math.round((ui.width - w) / 2);
        const yy = Math.round(y - (1 - slide) * 6);
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
