// Balance-Durchlauf (M24, »die große Balance«): spielt im Headless-Browser
// Nacht für Nacht mit einer einfachen, vernünftigen Strategie – statt
// Testspielern. Tagsüber sammelt die Figur, was die Karte hergibt (fest
// angesetzt, an den Quellen der Karte geeicht: Äste, Bäume, Kiesel, Felsen,
// Faserbüsche, zwei Schrotthaufen, am ersten Tag das Wrack), sammelt die Beute
// der Nacht ein, tauscht ab Tag 2 Zombieteile bei Balduin gegen Schrott, flickt,
// baut Türme an die Wege (zuerst dort, wo sie am meisten Weg abdecken – der
// zweite und vierte decken die Barrikaden am letzten Abschnitt, B1), wertet sie
// auf, hält Barrikadenreihen auf dem letzten Abschnitt und stärkt das Tor; kündigt
// der Nachtplan eine Nebelwelle an, stellt sie Laternen an den Weg (wie Edda rät),
// nach einem Durchbruch baut sie Wall und Tor zuerst wieder auf; was dann noch
// übrig ist (über einem Rest fürs Flicken), wird zu weiteren Türmen. Nachts steht
// sie hinter der ersten Barrikadenreihe und schlägt mit der Axt zu (die echte
// Schlag-Funktion des Spiels), wenn einer in Reichweite kommt.
// Balanciert wird in src/data/ – hier stehen nur die Annahmen über den Spieler.
//
//   node tools/balance.mjs [--naechte=12] [--schwierigkeit=gemuetlich,ausgewogen,wild]
//                          [--einkommen=1] [--karte=3] [--mika=an|aus]
//                          [--sichern=4,8,12 --ordner=pfad]   Spielstand vor diesen Nächten ablegen
//   node tools/balance.mjs --nacht=pfad/ausgewogen-8.json --hp=1,2,4
//                          eine abgelegte Nacht mit mehr Leben je Schlurfer nachspielen
//   --zaeh=2,0.55,0.025[,0.4]   Zähigkeit zum Ausprobieren (TOUGHNESS: from, per, grow,
//                          bossNight), ohne src/data/waves.js zu ändern (B1)
//   --boss=3               Bosse mit so viel mehr Leben (zum Ausprobieren, B1)
//   --herz=ziel,heil:0.5   Moderherz zum Ausprobieren: Scharfschützen zielen zuerst aufs Herz
//                          (ziel), seine Sporen heilen es nur zu diesem Teil (heil)
//
// Ausgabe: je Nacht gehalten/verloren, Zuhause, Durchbruch, besiegte Schlurfer,
// Türme (Stufen), Barrikaden, Vorrat, dazu der Druck auch in gehaltenen Nächten
// (wie weit die Horde nach Osten kam – das Tor steht bei x = −8 –, wie viel die
// Barrikaden und das Tor abbekamen, Mikas niedrigstes Leben, wer am weitesten kam,
// wie viele aus welcher Welle bis an die Barrikaden kamen, wie weit der Boss kam) – und
// eine Zusammenfassung.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from './serve.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const NIGHTS = Number(arg('naechte', 12));
const LEVELS = arg('schwierigkeit', 'gemuetlich,ausgewogen,wild').split(',');
const INCOME = Number(arg('einkommen', 1));
const MAP = Number(arg('karte', 3));
const MIKA = arg('mika', 'an') !== 'aus';
const SAVE_DAYS = arg('sichern', '').split(',').filter(Boolean).map(Number);
const SAVE_DIR = arg('ordner', '.');
const REPLAY = arg('nacht', null);
const HP_MULS = arg('hp', '1').split(',').map(Number);
const TOUGH = arg('zaeh', null)
  ?.split(',')
  .map(Number)
  .reduce((o, v, k) => ({ ...o, [['from', 'per', 'grow', 'bossNight'][k]]: v }), {});

const BOSS_MUL = Number(arg('boss', 1));
const HEART = arg('herz', null)
  ?.split(',')
  .reduce((o, w) => {
    const [k, v] = w.split(':');
    return { ...o, [k]: v === undefined ? true : Number(v) };
  }, {});

/**
 * Zähigkeit zum Ausprobieren in das Modul im Browser schreiben (dasselbe Objekt, das der Wellenplan
 * liest); Bosse mit mehr Leben über den Plan der Nacht (ihr `hp` ist ein eigener Faktor).
 */
async function applyTough(page) {
  if (TOUGH) await page.evaluate(async (t) => Object.assign((await import('./src/data/waves.js')).TOUGHNESS, t), TOUGH);
  if (HEART) {
    await page.evaluate((h) => {
      const g = window.zomfy.game;
      if (h.ziel) {
        // Scharfschützen (strongest) nehmen das Herz vor jedem anderen Ziel in Reichweite
        const targets = g.towers.targets.bind(g.towers);
        g.towers.targets = (t, range, n, strongest, minRange) => {
          const list = targets(t, range, 999, strongest, minRange);
          const k = strongest ? list.findIndex((z) => z.def.heart) : -1;
          if (k > 0) list.unshift(list.splice(k, 1)[0]);
          return list.slice(0, n);
        };
      }
      if (h.heil !== undefined) {
        // Die Sporen des Herzens heilen es selbst nur zu diesem Teil
        const attack = g.onBossAttack.bind(g);
        g.onBossAttack = (z, kind) => {
          const before = z.hp;
          attack(z, kind);
          if (z.def.heart && kind === 'sporen' && z.hp > before) z.hp = before + (z.hp - before) * h.heil;
        };
      }
    }, HEART);
  }
  if (BOSS_MUL === 1) return;
  await page.evaluate((k) => {
    const nights = window.zomfy.game.nights;
    const plan = nights.planFor.bind(nights);
    nights.planFor = (day) => {
      const p = plan(day);
      for (const w of p.waves) for (const sp of w.spawns) if (sp.hp) sp.hp *= k;
      return p;
    };
  }, BOSS_MUL);
}

/**
 * Was ein fleißiger Spieler an einem Tag an den Quellen der Karte sammelt (Karte 3:
 * 7 Bäume, 5 Äste, 3 Felsen, 2 Kiesel, 2 Faserbüsche, 2 Schrotthaufen – Bäume und
 * Felsen wachsen in zwei Tagen nach, Schrott alle zwei Tage).
 */
const DAILY = { holz: 16, stein: 6, fasern: 4, stoff: 0.5, schrott: 2.5 };
/** Am ersten Tag dazu das Bootswrack (einmal). */
const FIRST_DAY = { schrott: 5.5, stoff: 1.5 };
/** Diese Zombieteile behält die Figur (für Balduins Sonderangebote); der Rest wird Schrott (3 → 2). */
const KEEP_PARTS = 6;
/** So viel Schrott bleibt für das Flicken liegen; was darüber liegt, wird zu weiteren Türmen. */
const RESERVE = 12;

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    return require(join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}

/** Im Spiel: ein Tag – Beute einsammeln, tauschen, flicken, bauen, aufwerten. */
function dayTurn({ day, income, keep, reserve }) {
  const Z = window.zomfy;
  const g = Z.game;
  const st = g.state;
  const bs = g.world.buildings;
  const resolveChoices = () => {
    if (Array.isArray(st.perkChoice) && st.perkChoice.length) Z.choosePerk(st.perkChoice[0]);
    if (st.skillChoice?.options?.length) Z.chooseSkill(st.skillChoice.options[0]);
    for (let k = 0; k < 4 && st.blueprintChoice; k++) g.chooseBlueprint(st.blueprintChoice.options[0]);
    if (g.perkChoice.isOpen) g.perkChoice.close();
    if (g.report.isOpen) g.report.report = null;
    st.report = null;
    if (g.dialog?.isOpen) g.finishDialog?.();
    g.mode = 'play';
  };
  resolveChoices();
  Z.setTime(8, 0);
  // Gesammeltes und die Beute der Nacht (die Figur hat alles aufgelesen; Fundkisten geöffnet)
  Z.give(Object.fromEntries(Object.entries(income).map(([r, n]) => [r, Math.round(n)])));
  let looted = 0;
  for (const it of [...g.loot.items]) {
    if (it.res === 'kiste') g.openChest(it.x, it.z);
    else Z.give({ [it.res]: 1 });
    looted++;
  }
  g.loot.items.length = 0;
  // Balduin (ab Tag 2): Zombieteile gegen Schrott
  let traded = 0;
  if (day >= 2) {
    while ((st.inventory.teile || 0) >= keep + 3) {
      st.inventory.teile -= 3;
      st.inventory.schrott = (st.inventory.schrott || 0) + 2;
      traded += 2;
    }
  }
  // Flicken: zuerst eingeschlagene Wall- und Torstücke einzeln (nach einem Durchbruch reicht der
  // Vorrat oft nicht für alles – ein offenes Lager wäre die nächste verlorene Nacht), dann Zuhause,
  // Tor, Wall, Türme; Barrikaden-Trümmer neu aufbauen
  for (const b of bs.list.filter((q) => q.broken && (q.type === 'tor' || q.type.startsWith('wall')))) g.builder.repairBuilding(b);
  g.builder.repairAll();
  for (const b of bs.list.filter((q) => q.type === 'barrikade' && q.broken)) Z.rebuildBarricade(b.id);
  const option = (b, test) => {
    g.builder.selection = b.id;
    const o = g.builder.selectionOptions(b).find((q) => test(q.id) && q.affordable && !q.disabled);
    g.builder.selection = null;
    if (!o) return false;
    o.action();
    return true;
  };
  // Türme zuerst (neue an die besten freien Stellen), dann Tor, Barrikaden, Aufwertungen
  const spots = window.__balanceSpots;
  const kill = window.__balanceKill; // B1: Plätze neben dem letzten Abschnitt, die die Barrikaden decken
  const towers = () => bs.list.filter((q) => q.type === 'bolzen' || q.type === 'katapult' || q.type === 'sprenger' || q.type === 'laternenturm');
  const want = Math.min(spots.length, 2 + day);
  const kinds = ['bolzen', 'bolzen', 'katapult', 'bolzen', 'sprenger', 'katapult', 'bolzen', 'laternenturm', 'katapult'];
  const free = (type, list) => list.find((s) => !s.used && Z.placeCheck(type, s.i, s.j).ok);
  for (let guard = 0; towers().length < want && guard < 20; guard++) {
    const k = towers().length;
    const type = kinds[k % kinds.length];
    // Der zweite und der vierte Turm decken die Barrikaden (wie man es vom Hof aus täte)
    const spot = ((k === 1 || k === 3) && free(type, kill)) || free(type, spots);
    if (!spot || Z.build(type, spot.i, spot.j) !== 'ok') break;
    spot.used = true;
  }
  // Nebelwelle im Nachtplan (M22): Laternen an den Weg – bei den Türmen, wo der meiste Weg ist
  if (g.nights.planFor(day).waves.some((w) => w.trait === 'nebel')) {
    const lamps = () => bs.list.filter((q) => q.type === 'laternenpfahl').length;
    for (let guard = 0; guard < 12 && lamps() < Math.min(6, 2 + Math.floor(day / 3)); guard++) {
      const spot = free('laternenpfahl', spots);
      if (!spot || Z.build('laternenpfahl', spot.i, spot.j) !== 'ok') break;
      spot.used = true;
    }
  }
  const gate = bs.list.find((q) => q.type === 'tor');
  if (gate && ((day >= 4 && gate.level < 2) || (day >= 8 && gate.level < 3))) option(gate, (id) => id.startsWith('stufe'));
  const rows = day >= 5 ? [-11, -14] : [-11];
  for (const x of rows) for (const j of Z.pathColumn(x)) if (!bs.list.some((q) => q.type === 'barrikade' && q.i === x && q.j === j)) Z.build('barrikade', x, j);
  for (const b of bs.list.filter((q) => q.type === 'barrikade' && !q.broken)) if ((day >= 3 && b.level < 2) || (day >= 7 && b.level < 3)) option(b, (id) => id.startsWith('stufe'));
  for (let round = 0; round < 6; round++) {
    let any = false;
    for (const t of towers().sort((a, b) => a.id - b.id)) {
      if (t.level >= Math.min(5, 2 + Math.floor(day / 2))) continue;
      if (option(t, (id) => id === 'stufe2' || id === 'specA' || /^stufe[3-5]$/.test(id))) any = true;
    }
    if (!any) break;
  }
  // Was dann noch übrig ist (über dem Rest fürs Flicken), wird zu weiteren Türmen auf Stufe 2
  for (let guard = 0; guard < 40 && (st.inventory.schrott || 0) >= reserve + 10; guard++) {
    const type = kinds[towers().length % kinds.length];
    const spot = spots.find((s) => !s.used && Z.placeCheck(type, s.i, s.j).ok);
    if (!spot || Z.build(type, spot.i, spot.j) !== 'ok') break;
    spot.used = true;
    const t = bs.list.find((q) => q.type === type && q.i === spot.i && q.j === spot.j);
    if (t && (st.inventory.schrott || 0) >= reserve + 10) option(t, (id) => id === 'stufe2');
  }
  resolveChoices();
  return { looted, traded, vorrat: { ...st.inventory }, tuerme: towers().map((t) => t.level).join(''), barrikaden: bs.list.filter((q) => q.type === 'barrikade').length };
}

/** Im Spiel: Mika kämpft hinter der ersten Barrikadenreihe mit (jeder Spielschritt). */
function armMika(on) {
  const Z = window.zomfy;
  const g = Z.game;
  const st = g.state;
  if (!st.tools.axt) {
    st.tools.axt = true;
    g.addToHotbar('axt');
  }
  const slot = st.hotbar.slots.indexOf('axt');
  if (slot >= 0) g.selectSlot(slot, false);
  const col = Z.pathColumn(-9);
  const post = { x: -8.6, z: col[Math.floor(col.length / 2)] + 0.5 };
  window.__balancePost = post;
  if (g.__balanceWrapped) return;
  g.__balanceWrapped = true;
  const update = g.update.bind(g);
  g.update = (dt) => {
    update(dt);
    if (g.mode !== 'play' || !g.nights.active) return;
    // Druck messen: wie weit kam die Horde nach Osten (Tor bei x = −8), wie tief sank Mikas Leben?
    const m = window.__balanceMeter;
    if (m) {
      for (const z of g.horde.list) {
        if (z.state === 'dying') continue;
        if (!m.wave.has(z.id)) m.wave.set(z.id, st.night.wave); // aus welcher Welle (die zuletzt losgelassene)
        if (z.x > m.maxX) {
          m.maxX = z.x;
          m.who = `${z.type}${z.champion ? ', Champion' : ''}${z.trait ? `, ${z.trait}` : ''}, W${m.wave.get(z.id)}`;
        }
        if (z.x > -15.5) m.reached.add(z.id); // bis an die Barrikaden (Reihen bei x = −11 und −14)
        if (z.def.boss && !z.def.heart) m.bossX = Math.max(m.bossX ?? -Infinity, z.x); // B1: wie weit kam der Boss?
      }
      m.minHp = Math.min(m.minHp, st.player.hp);
      const heart = g.autumn?.heart; // M25: die Frostnacht – wie weit kam das Moderherz?
      if (heart && heart.state !== 'dying') {
        m.phase = Math.max(m.phase || 0, heart.boss?.phase || 0);
        m.heartX = Math.max(m.heartX ?? -Infinity, heart.x);
        m.heartHp = heart.hp / heart.maxHp;
      }
    }
    if (!on || !window.__balanceFight || st.player.hp <= 0) return;
    const p = g.player.position;
    let best = null;
    let bd = 5.5 * 5.5;
    for (const z of g.horde.list) {
      if (z.state === 'dying' || z.y < -0.3 || z.def.flying) continue;
      const d = (z.x - post.x) ** 2 + (z.z - post.z) ** 2;
      if (d < bd) {
        bd = d;
        best = z;
      }
    }
    if (best && g.combat.canReach(best)) {
      if (!g.player.action) g.combat.attack(best.x - p.x, best.z - p.z);
      return;
    }
    const goal = best && st.player.hp > 35 ? best : post;
    const dx = goal.x - p.x;
    const dz = goal.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.4 && !g.player.action) g.player.update(dt, { x: dx / d, z: dz / d }, false);
  };
}

/** Zeile zur Frostnacht (M25): »Herz gefallen (Phase 3, bis x −20)« oder »Herz erstarrt (Phase 2, 40 % Leben, bis x −31)«. */
function finaleText(f) {
  if (!f) return '';
  return ` · Herz ${f.fell ? 'gefallen' : `erstarrt (${f.hp} % Leben)`}, Phase ${f.phase}, bis x ${f.x}`;
}

/** Im Spiel: die Nacht laufen lassen (Zeitraffer an). */
async function nightTurn(page, day) {
  await page.evaluate((mika) => {
    const Z = window.zomfy;
    Z.setTime(20, 20);
    const post = window.__balancePost;
    if (mika) Z.teleport(post.x, post.z, -Math.PI / 2);
    else Z.teleport(19.5, -1.2, 0);
    window.__balanceFight = mika;
    const bs = Z.game.world.buildings.list;
    window.__balanceMeter = {
      maxX: -Infinity,
      who: null,
      reached: new Set(),
      wave: new Map(),
      minHp: Z.game.state.player.hp,
      bar: bs.filter((q) => q.type === 'barrikade' && !q.broken).reduce((a, q) => a + q.hp, 0),
      gate: bs.find((q) => q.type === 'tor')?.hp ?? 0,
    };
    Z.game.fast = true;
  }, MIKA);
  for (let k = 0; k < 400; k++) {
    const r = await page.evaluate((d) => {
      window.__zomfyStep(8000);
      const g = window.zomfy.game;
      const st = g.state;
      if (Array.isArray(st.perkChoice) && st.perkChoice.length) window.zomfy.choosePerk(st.perkChoice[0]);
      if (st.skillChoice?.options?.length) window.zomfy.chooseSkill(st.skillChoice.options[0]);
      if (g.perkChoice.isOpen) {
        g.perkChoice.close();
        g.mode = 'play';
      }
      return st.night.n === d && st.night.done ? { done: true } : { done: false, minute: st.time.minute, mode: g.mode };
    }, day);
    if (r.done) break;
  }
  return page.evaluate(() => {
    const g = window.zomfy.game;
    const st = g.state;
    const n = st.night;
    const r = st.report || {};
    g.fast = false;
    window.__balanceFight = false;
    const m = window.__balanceMeter;
    const bs = g.world.buildings.list;
    const barNow = bs.filter((q) => q.type === 'barrikade' && !q.broken).reduce((a, q) => a + q.hp, 0);
    const gateNow = bs.find((q) => q.type === 'tor')?.hp ?? 0;
    // Wer an die Barrikaden kam, nach Wellen: »W3 9, W4 4«
    const perWave = {};
    for (const id of m.reached) perWave[m.wave.get(id)] = (perWave[m.wave.get(id)] || 0) + 1;
    const waves = Object.entries(perWave).map(([w, k]) => `W${w} ${k}`).join(', ');
    const pressure = { maxX: Number.isFinite(m.maxX) ? Math.round(m.maxX * 10) / 10 : null, who: m.who, reached: m.reached.size, waves, bossX: m.bossX === undefined ? null : Math.round(m.bossX * 10) / 10, minHp: Math.round(m.minHp), barLost: Math.max(0, Math.round(m.bar - barNow)), gateLost: Math.max(0, Math.round(m.gate - gateNow)) };
    // M25: Frostnacht – fiel das Herz, oder erstarrte es im Morgengrauen (Phase, wie weit, wie viel Leben übrig)?
    const finale = m.phase ? { fell: Boolean(r.finale?.heart), phase: m.phase, x: Math.round(m.heartX * 10) / 10, hp: Math.round((r.finale?.heart ? 0 : m.heartHp) * 100) } : null;
    return { won: n.won, kills: n.kills, homeLost: r.homeLost ?? null, homeNow: r.homeNow ?? Math.round(st.world.homeHp), homeMax: r.homeMax ?? null, breach: Boolean(n.breach), inCamp: n.inCamp || 0, broken: n.broken || 0, level: st.player.level, pressure, finale };
  });
}

async function runLevel(browser, url, level) {
  const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`${url}index.html?test&playtest&nosave&map=${MAP}`);
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await applyTough(page);
  await page.evaluate((lv) => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    const g = Z.game;
    g.state.difficulty = lv;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut', 'championHinweis', 'turmteilHinweis', 'lockeHinweis']) Z.setFlag(f);
    Z.setWeather(null, true);
    // Turmplätze: neben dem Weg, nach abgedecktem Weg (4 m) sortiert, mindestens 2,5 m auseinander
    const grid = g.world.grid;
    const path = [];
    for (let i = grid.minX; i < grid.minX + grid.width; i++) for (let j = grid.minZ; j < grid.minZ + grid.height; j++) if (grid.isPath(i, j)) path.push([i + 0.5, j + 0.5]);
    const cand = new Map();
    for (const [x, z] of path) {
      for (const [dx, dz] of [[0, 2], [0, -2], [2, 0], [-2, 0], [2, 2], [-2, 2], [2, -2], [-2, -2], [0, 3], [0, -3]]) {
        const i = Math.floor(x + dx);
        const j = Math.floor(z + dz);
        const key = `${i}|${j}`;
        if (cand.has(key) || i < -46 || !Z.placeCheck('bolzen', i, j).ok) continue;
        const cover = path.filter(([px, pz]) => (px - i - 0.5) ** 2 + (pz - j - 0.5) ** 2 < 16).length;
        cand.set(key, { i, j, cover, home: g.world.pathing.distanceToHome(i + 0.5, j + 0.5) });
      }
    }
    const sorted = [...cand.values()].sort((a, b) => b.cover - a.cover || a.home - b.home);
    const spots = [];
    for (const s of sorted) if (!spots.some((o) => (o.i - s.i) ** 2 + (o.j - s.j) ** 2 < 6.25)) spots.push(s);
    window.__balanceSpots = spots.slice(0, 70);
    // B1: Plätze neben dem letzten Abschnitt zwischen den Barrikadenreihen und dem Tor (x −17 … −10)
    window.__balanceKill = sorted.filter((s) => s.i >= -17 && s.i <= -10).slice(0, 6);
  }, level);
  await page.evaluate(armMika, MIKA);
  const rows = [];
  for (let day = 1; day <= NIGHTS; day++) {
    const scale = INCOME * (1 + (day - 1) * 0.05);
    const income = Object.fromEntries(Object.entries(DAILY).map(([r, n]) => [r, n * scale + (day === 1 ? FIRST_DAY[r] || 0 : 0)]));
    if (day >= 2) income.stein += 4; // mit der Spitzhacke auch die Felsen
    const tag = await page.evaluate(dayTurn, { day, income, keep: KEEP_PARTS, reserve: RESERVE });
    if (SAVE_DAYS.includes(day)) {
      const data = await page.evaluate(() => {
        const g = window.zomfy.game;
        g.snapshot();
        return JSON.stringify(g.state);
      });
      writeFileSync(join(SAVE_DIR, `${level}-${day}.json`), data);
    }
    const nacht = await nightTurn(page, day);
    rows.push({ day, ...nacht, ...tag });
    const home = nacht.homeMax ? `${nacht.homeNow}/${nacht.homeMax}` : `${nacht.homeNow}`;
    console.log(`${level.padEnd(10)} Nacht ${String(day).padStart(2)} · ${nacht.won ? 'gehalten' : 'VERLOREN'} · Zuhause ${home} (−${nacht.homeLost ?? '?'}) · ${nacht.breach ? `Durchbruch (${nacht.inCamp} im Lager)` : 'Tor hält'} · besiegt ${nacht.kills} · Türme ${tag.tuerme || '–'} · Barrikaden ${tag.barrikaden} (${nacht.broken} zerschlagen) · Schrott ${tag.vorrat.schrott} (getauscht ${tag.traded}), Teile ${tag.vorrat.teile} · Stufe ${nacht.level} · Druck: bis x ${nacht.pressure.maxX ?? '–'}${nacht.pressure.who ? ` (${nacht.pressure.who})` : ''}, an den Barrikaden ${nacht.pressure.reached}${nacht.pressure.waves ? ` (${nacht.pressure.waves})` : ''}, Barrikaden −${nacht.pressure.barLost}, Tor −${nacht.pressure.gateLost}, Mika ≥ ${nacht.pressure.minHp}${nacht.pressure.bossX !== null ? ` · Boss bis x ${nacht.pressure.bossX}` : ''}${finaleText(nacht.finale)}`);
    await page.evaluate(() => window.zomfy.game.advanceToMorning());
  }
  if (errors.length) console.log(`  Fehler im Spiel: ${errors.slice(0, 5).join(' | ')}`);
  await context.close();
  return rows;
}

/** Eine abgelegte Nacht nachspielen – je Faktor mit mehr Leben je Schlurfer. */
async function replayNight(browser, url) {
  const data = readFileSync(REPLAY, 'utf8');
  const day = JSON.parse(data).time.day;
  for (const mul of HP_MULS) {
    const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
    await context.addInitScript((d) => localStorage.setItem('zomfy-towers.spielstand', d), data);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${url}index.html?test&playtest&map=${MAP}`);
    await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
    await applyTough(page);
    await page.evaluate((m) => {
      window.__zomfyHold = true;
      const g = window.zomfy.game;
      g.holdSave = true; // den abgelegten Stand nicht überschreiben
      g.nights.hpMul = m;
    }, mul);
    await page.evaluate(armMika, MIKA);
    const n = await nightTurn(page, day);
    const p = n.pressure;
    console.log(`Nacht ${day} · Leben ×${mul} · ${n.won ? 'gehalten' : 'VERLOREN'} · Zuhause ${n.homeNow}/${n.homeMax ?? '?'} · ${n.breach ? `Durchbruch (${n.inCamp} im Lager)` : 'Tor hält'} · besiegt ${n.kills} · zerschlagen ${n.broken} · bis x ${p.maxX ?? '–'}${p.who ? ` (${p.who})` : ''}, an den Barrikaden ${p.reached}${p.waves ? ` (${p.waves})` : ''}, Barrikaden −${p.barLost}, Tor −${p.gateLost}, Mika ≥ ${p.minHp}${p.bossX !== null ? ` · Boss bis x ${p.bossX}` : ''}${finaleText(n.finale)}${errors.length ? ` · Fehler: ${errors[0]}` : ''}`);
    await context.close();
  }
}

const { chromium } = loadPlaywright();
const launchArgs = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ args: launchArgs }).catch(() => (existsSync('/opt/pw-browsers/chromium') ? chromium.launch({ args: launchArgs, executablePath: '/opt/pw-browsers/chromium' }) : null));
const { server, url } = await start(0, ROOT);
if (REPLAY) {
  await replayNight(browser, url);
  await browser.close();
  server.close();
  process.exit(0);
}
const summary = [];
for (const level of LEVELS) {
  const rows = await runLevel(browser, url, level);
  const lost = rows.filter((r) => !r.won).map((r) => r.day);
  const breaches = rows.filter((r) => r.breach).map((r) => r.day);
  const homeLoss = rows.reduce((a, r) => a + (r.homeLost || 0), 0);
  const tense = rows.filter((r) => r.won && !r.breach && (r.broken > 0 || r.pressure.gateLost > 0)).map((r) => r.day);
  const contact = rows.filter((r) => r.pressure.reached > 0).map((r) => r.day); // B1: bis an die Barrikaden
  summary.push(`${level}: ${rows.length - lost.length}/${rows.length} gehalten${lost.length ? ` (verloren: ${lost.join(', ')})` : ''} · Durchbrüche: ${breaches.length ? breaches.join(', ') : 'keine'} · an den Barrikaden: ${contact.length ? contact.join(', ') : 'keine'} · knapp (Barrikaden zerschlagen oder Tor getroffen): ${tense.length ? tense.join(', ') : 'keine'} · Zuhause verlor zusammen ${homeLoss}`);
}
console.log('');
if (TOUGH) console.log(`Zähigkeit zum Ausprobieren: ${JSON.stringify(TOUGH)}`);
if (BOSS_MUL !== 1) console.log(`Bosse mit ×${BOSS_MUL} Leben`);
if (HEART) console.log(`Moderherz zum Ausprobieren: ${JSON.stringify(HEART)}`);
for (const line of summary) console.log(line);
await browser.close();
server.close();
