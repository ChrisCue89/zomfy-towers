// Aufnahme-Bibliothek: Zomfy Towers headless starten, in festen 1/30-s-Schritten
// bewegen und je Bild die Ebenen (Welt, Oberfläche) als PNG ablegen.
//
//   const rec = await Rec.open({ ui: 'world' });
//   await rec.sim(4);                          // 4 s Spielzeit ohne Bild
//   await rec.clip('haus-morgen', { frames: 90, cam: { keys: [[0, 5, -3], [89, 9, -3]] } });
//   await rec.close();
//
// Jedes Bild kostet im Software-Renderer rund 1,3 s. Ein Clip besteht aus
//   frames/<name>/0000.png (Welt, 1920×1080), 0000.ui.png (Oberfläche, 640×360, transparent),
//   meta.json (Bildzahl, Beschreibung) und events.json (Klangereignisse des Spiels je Bild).

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { start } from '../game-server.mjs';
import { GAME_DIR, FRAMES, FPS, WIDTH, HEIGHT } from '../config.mjs';

const require = createRequire(import.meta.url);

/** Oberflächen-Modi: welche Teile der Bedienoberfläche mitgezeichnet werden. */
const HUD_STATIC = ['drawClock', 'drawGoal', 'drawResources', 'drawNightBar', 'drawPlayerHp', 'drawXp', 'drawHotbar', 'drawSkills', 'drawLabels', 'drawEdgeMarkers', 'drawGoalMarker', 'drawNightPlan', 'drawPrompt', 'drawSpeech', 'drawActionProgress', 'drawLowHealth', 'drawTargetMark'];
const HUD_WORLD = ['drawZombieBars', 'drawStatus', 'drawChampions', 'drawRings', 'drawWarns', 'drawSwooshes', 'drawNumbers', 'drawWords', 'drawFloaters', 'drawBossBar'];

export class Rec {
  static async open({ query = 'test&playtest', width = WIDTH, height = HEIGHT, ui = 'world' } = {}) {
    const { chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'));
    const srv = await start(0, GAME_DIR);
    const browser = await chromium.launch({
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
      executablePath: '/opt/pw-browsers/chromium',
    });
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const rec = new Rec(page, browser, srv);
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) rec.problems.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => rec.problems.push(`pageerror: ${e.message}`));
    // Virtuelle Uhr: Wetter, Laub und Anzeigen laufen in Spielzeit, nicht in Wandzeit
    await page.addInitScript(() => {
      let vt = 1000;
      performance.now = () => vt;
      window.__advance = (ms) => { vt += ms; };
    });
    await page.goto(`${srv.url}?${query}`);
    await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 240000 });
    await page.evaluate(installHooks, { hudStatic: HUD_STATIC, hudWorld: HUD_WORLD });
    await rec.setUi(ui);
    return rec;
  }

  constructor(page, browser, srv) {
    this.page = page;
    this.browser = browser;
    this.srv = srv;
    this.problems = [];
  }

  /** Beliebigen Code im Spiel ausführen (window.zomfy steht bereit). */
  eval(fn, arg) {
    return this.page.evaluate(fn, arg);
  }

  /** Oberfläche: 'full' (alles), 'world' (nur Rückmeldungen in der Welt), 'none'. */
  setUi(mode) {
    return this.page.evaluate((m) => window.__setUi(m), mode);
  }

  /**
   * Kamera: null = folgt Mika wie im Spiel; sonst Blickpunkte am Boden als
   * Schlüsselbilder [[bild, x, z], …] (weich verbunden, Bilder ab dem Clip-Beginn).
   * { keys, ease: 'smooth'|'linear' }
   */
  cam(spec) {
    return this.page.evaluate((s) => window.__setCam(s), spec);
  }

  /** Spielzeit ohne Bilder voranbringen (schnell). */
  sim(seconds) {
    return this.page.evaluate((n) => window.__sim(n), Math.round(seconds * FPS));
  }

  /**
   * Einen Clip aufnehmen. `each(i, u)` läuft vor jedem Bild im Spiel (i = Bildnummer, u = 0..1),
   * `ui`: 'full' | 'world' | 'none' nur für diesen Clip, `uiLayer: false` spart die Oberflächen-Datei.
   */
  async clip(name, { frames, each = null, ui = null, uiLayer = true, description = '', cam = undefined, first = 0, quiet = false } = {}) {
    const dir = join(FRAMES, name);
    mkdirSync(dir, { recursive: true });
    if (ui) await this.setUi(ui);
    if (cam !== undefined) await this.cam(cam);
    await this.page.evaluate(() => window.__clipStart());
    const t0 = Date.now();
    for (let i = 0; i < frames; i++) {
      const g = await this.page.evaluate(async ([fnSrc, i, n, wantUi]) => {
        if (fnSrc) new Function('i', 'u', `return (${fnSrc})(i, u)`)(i, i / Math.max(1, n - 1));
        return window.__frame(wantUi);
      }, [each ? each.toString() : null, i, frames, uiLayer]);
      const id = String(first + i).padStart(4, '0');
      writeFileSync(join(dir, `${id}.png`), Buffer.from(g.scene, 'base64'));
      if (g.ui) writeFileSync(join(dir, `${id}.ui.png`), Buffer.from(g.ui, 'base64'));
      if (!quiet && i % 30 === 29) console.log(`  ${name}: ${i + 1}/${frames} (${((Date.now() - t0) / (i + 1)).toFixed(0)} ms/Bild)`);
    }
    const events = await this.page.evaluate(() => window.__clipEvents());
    writeFileSync(join(dir, 'events.json'), JSON.stringify(events));
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ name, fps: FPS, frames: first + frames, width: WIDTH, height: HEIGHT, description }, null, 1));
    return { dir, frames, problems: this.problems.slice() };
  }

  /** Ein einzelnes Bild (Standbild). */
  still(name, opts = {}) {
    return this.clip(name, { frames: 1, ...opts });
  }

  async close() {
    await this.browser.close();
    this.srv.server.close();
  }
}

/** Läuft im Spiel: Haken für virtuelle Uhr, Schritte, Oberfläche, Kamera, Klangprotokoll. */
function installHooks({ hudStatic, hudWorld }) {
  const game = window.zomfy.game;
  window.__zomfyHold = true;

  // --- Schritte ohne und mit Bild
  window.__sim = (n) => {
    for (let i = 0; i < n; i++) {
      window.__advance(1000 / 30);
      game.step(1 / 30);
    }
  };
  const copy = (cv) => {
    const c = document.createElement('canvas');
    c.width = cv.width;
    c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    return c;
  };
  const b64 = async (c) => {
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  };
  // Schritt, Zeichnen und Auslesen in EINER Aufgabe (sonst ist der Zeichenpuffer verworfen)
  window.__frame = async (wantUi) => {
    window.__advance(1000 / 30);
    window.__zomfyStep(1000 / 30);
    const sc = copy(document.getElementById('scene'));
    const ui = wantUi ? copy(document.getElementById('ui')) : null;
    return { scene: await b64(sc), ui: ui ? await b64(ui) : null };
  };

  // --- Oberfläche
  const hud = game.hud;
  const saved = {};
  for (const k of [...hudStatic, ...hudWorld]) saved[k] = hud[k];
  const savedToasts = hud.drawToasts;
  const savedBuildbar = game.buildbar.draw;
  const savedGhost = game.builder.drawGhostLabel;
  const noop = () => {};
  window.__setUi = (mode) => {
    for (const k of hudStatic) hud[k] = mode === 'full' ? saved[k] : noop;
    for (const k of hudWorld) hud[k] = mode === 'none' ? noop : saved[k];
    hud.drawToasts = mode === 'full' ? savedToasts : noop;
    game.buildbar.draw = mode === 'full' ? savedBuildbar : noop;
    game.builder.drawGhostLabel = mode === 'none' ? noop : savedGhost;
    window.__uiMode = mode;
  };

  // --- Kamera
  const rig = game.rig;
  const origUpdate = rig.update.bind(rig);
  let cam = null;
  window.__setCam = (spec) => {
    cam = spec ? { ...spec, f0: game.frame } : null;
  };
  rig.update = (dt, target, velocity, sharpness) => {
    if (!cam) return origUpdate(dt, target, velocity, sharpness);
    const f = game.frame - cam.f0;
    const k = cam.keys;
    let x = k[0][1];
    let z = k[0][2];
    if (f >= k[k.length - 1][0]) {
      x = k[k.length - 1][1];
      z = k[k.length - 1][2];
    } else if (f > k[0][0]) {
      let j = 0;
      while (k[j + 1][0] <= f) j++;
      let u = (f - k[j][0]) / (k[j + 1][0] - k[j][0]);
      if (cam.ease !== 'linear') u = u * u * (3 - 2 * u);
      x = k[j][1] + (k[j + 1][1] - k[j][1]) * u;
      z = k[j][2] + (k[j + 1][2] - k[j][2]) * u;
    }
    rig.focus.set(x, 0, z);
    rig.tickShake(dt);
    rig.applyBounds();
    rig.place();
  };

  // --- Klangprotokoll: was das Spiel spielen würde, mit Bildnummer und Hörerort
  let log = [];
  let start = 0;
  window.__clipStart = () => { log = []; start = game.frame; };
  window.__clipEvents = () => log;
  const sound = game.sound;
  const play = sound.play.bind(sound);
  sound.play = (name, opt = {}) => {
    const p = game.player.position;
    log.push({ f: game.frame - start, name, x: opt.x, z: opt.z, volume: opt.volume, pitch: opt.pitch, rate: opt.rate, lx: +p.x.toFixed(2), lz: +p.z.toFixed(2) });
    return play(name, opt);
  };
  for (const k of ['caw', 'bird', 'cricket']) {
    if (typeof sound[k] !== 'function') continue;
    const orig = sound[k].bind(sound);
    sound[k] = (...a) => { log.push({ f: game.frame - start, name: `@${k}` }); return orig(...a); };
  }
}
