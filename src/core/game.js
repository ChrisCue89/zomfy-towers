// Die Spielschleife. Besitzt alle Systeme und schaltet zwischen den Modi
// play (spielen), dialog, menu und sleep (Schlafen/Tageswechsel) um.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Events } from './events.js';
import { Input } from './input.js';
import { SaveStore } from './save.js';
import { createNewState, hoursOf, clockText, DAY_MINUTES } from './state.js';
import { PixelRenderer } from '../render/pixelRenderer.js';
import { CameraRig } from '../render/cameraRig.js';
import { sharedUniforms } from '../render/materials.js';
import { renderPortraits } from '../render/portrait.js';
import { World } from '../world/world.js';
import { LAYOUT } from '../world/layout.js';
import { Player } from '../entities/player.js';
import { UICanvas, COLORS } from '../ui/ui.js';
import { Hud } from '../ui/hud.js';
import { DialogBox } from '../ui/dialog.js';
import { Menu } from '../ui/menu.js';
import { drawText, measure, GLYPH_ROWS } from '../ui/font.js';
import { iconCanvas } from '../ui/icons.js';
import { T } from '../data/texts.js';
import { DIALOGE } from '../data/dialogs.js';
import { HOTBAR_SIZE } from '../data/items.js';

/** Flags, die nach einem Dialog gesetzt werden. */
const FLAG_AFTER_DIALOG = {
  radio: 'radioGehoert',
  briefkasten: 'briefkastenGesehen',
  sessel: 'sesselProbiert',
};

/** Ausruhen: Zieluhrzeit je Aktion. */
const REST_TARGET = { wartenAbend: 18.5, wartenNacht: 21.5 };

const SLEEP = { fadeOut: 1.0, black: 1.7, fadeIn: 0.9 };
const REST = { fadeOut: 0.7, black: 0.8, fadeIn: 0.8 };

export class Game {
  constructor() {
    this.mode = 'play';
    this.frame = 0;
    this.ready = false;
    this.frameTimes = [];
    this.showDebug = CONFIG.debug;
    this.currentInteraction = null;
    this.previousSlot = 1;
    this.sleep = null;
    this.frameWaiters = [];
    this._tmp = new THREE.Vector3();
    this.intro = { t: 0, duration: 1.4 };
  }

  init() {
    const sceneCanvas = document.getElementById('scene');
    const uiCanvas = document.getElementById('ui');
    this.pixel = new PixelRenderer(sceneCanvas, CONFIG.render);
    this.ui = new UICanvas(uiCanvas);
    this.input = new Input(uiCanvas, (x, y) => this.pixel.clientToGame(x, y));
    this.events = new Events();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0b18);
    this.world = new World({ scene: this.scene, seed: CONFIG.world.seed, renderConfig: CONFIG.render });
    this.player = new Player({ world: this.world, config: CONFIG.player });
    this.scene.add(this.player.object);
    this.world.attachPlayerLantern(this.player.character.lantern.glow);

    this.rig = new CameraRig(CONFIG.render, CONFIG.camera);
    this.rig.bounds = LAYOUT.cameraBounds;

    this.hud = new Hud(this);
    this.dialog = new DialogBox(this);
    this.menu = new Menu(this);
    this.portraits = renderPortraits();

    this.saves = new SaveStore({ disabled: CONFIG.noSave, config: CONFIG });
    const loaded = this.saves.load();
    this.state = loaded.state || createNewState(CONFIG);
    this.isNewGame = loaded.status !== 'ok';
    if (CONFIG.startMinute !== null) this.state.time.minute = CONFIG.startMinute;
    if (CONFIG.spawn === 'inside') {
      const w = this.world.shelter.wakeSpot;
      Object.assign(this.state.player, { x: w.x, z: w.z, facing: w.facing });
    }

    this.resize();
    this.applyState();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.quietSave();
    });
    window.addEventListener('pagehide', () => this.quietSave());

    if (loaded.status === 'corrupt') this.hud.toast(T.meldungen.defekt, null, 6);
    if (loaded.status === 'ok') this.hud.toast(T.meldungen.willkommen, 'haus');
    if (this.isNewGame && !CONFIG.skipIntro) this.pendingIntro = true;
    else if (this.isNewGame) this.hud.showHint(T.meldungen.hinweisStart, 14);
    if (CONFIG.test) this.intro.t = this.intro.duration;

    this.setFavicon();
    if (CONFIG.test || CONFIG.debug) this.exposeTestApi();
    if (CONFIG.test || CONFIG.debug || CONFIG.playtest) window.zomfyView = () => this.observe();
  }

  start() {
    this.last = performance.now();
    const loop = (now) => {
      // Playtest-Brücke: das Spiel wird von außen in festen Schritten bewegt.
      if (window.__zomfyHold) {
        this.last = now;
        requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      this.frameTimes.push(dt);
      if (this.frameTimes.length > 120) this.frameTimes.shift();
      this.step(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (CONFIG.playtest) {
      // Genau `ms` Spielzeit in 1/30-s-Schritten simulieren, dann einmal zeichnen.
      window.__zomfyStep = (ms) => {
        const steps = Math.max(1, Math.round(ms / (1000 / 30)));
        for (let i = 0; i < steps; i++) this.step(1 / 30);
        this.render();
        return this.frame;
      };
    }
  }

  /** Ein Simulationsschritt inklusive Eingabe-Abschluss. */
  step(dt) {
    this.update(dt);
    this.input.endFrame();
    this.frame++;
    if (this.frame === 3) this.ready = true;
    if (this.frameWaiters.length) {
      this.frameWaiters = this.frameWaiters.filter((w) => {
        if (this.frame >= w.frame) {
          w.resolve();
          return false;
        }
        return true;
      });
    }
  }

  // --- Zustand ---------------------------------------------------------------

  /** Spielzustand auf Welt und Figur übertragen. */
  applyState() {
    const p = this.state.player;
    this.player.place(p.x, p.z, p.facing);
    this.rig.jumpTo(p.x, p.z);
    this.updateHeldItem(false);
  }

  quietSave() {
    if (!this.ready || this.mode === 'sleep') return;
    this.saves.save(this.state);
  }

  newGame() {
    this.saves.clear();
    this.state = createNewState(CONFIG);
    this.isNewGame = true;
    this.previousSlot = 1;
    this.applyState();
    this.menu.close();
    this.mode = 'play';
    this.intro.t = 0;
    this.pendingIntro = true;
  }

  // --- Schnellleiste und Laterne --------------------------------------------

  selectSlot(index, announce = true) {
    const hb = this.state.hotbar;
    if (index === hb.selected || index < 0 || index >= HOTBAR_SIZE) return;
    hb.selected = index;
    this.updateHeldItem(announce);
  }

  updateHeldItem(announce) {
    const hb = this.state.hotbar;
    const item = hb.slots[hb.selected];
    const holding = item === 'laterne';
    this.player.holdingLantern = holding;
    this.player.lanternLit = holding;
    this.state.player.lantern = holding;
    if (!holding) this.previousSlot = hb.selected;
    if (announce) this.hud.showItemLabel(item ? T.gegenstaende[item] : T.gegenstaende.leer);
  }

  toggleLantern() {
    const hb = this.state.hotbar;
    const slot = hb.slots.indexOf('laterne');
    if (slot < 0) return;
    if (hb.selected === slot) {
      hb.selected = this.previousSlot !== slot ? this.previousSlot : (slot + 1) % HOTBAR_SIZE;
      this.updateHeldItem(false);
      this.hud.showItemLabel(T.meldungen.laterneAus);
    } else {
      this.previousSlot = hb.selected;
      hb.selected = slot;
      this.updateHeldItem(false);
      this.hud.showItemLabel(T.meldungen.laterneAn);
    }
  }

  // --- Dialoge, Menü, Schlafen ------------------------------------------------

  startDialog(id, onDone = null) {
    const entry = DIALOGE[id];
    if (!entry) return;
    const lines = typeof entry === 'function' ? entry(this.state) : entry;
    this.mode = 'dialog';
    this.dialog.open(lines, (aktion) => {
      this.mode = 'play';
      if (FLAG_AFTER_DIALOG[id]) this.state.flags[FLAG_AFTER_DIALOG[id]] = true;
      if (aktion === 'schlafen') this.startSleep();
      else if (REST_TARGET[aktion]) this.startRest(REST_TARGET[aktion]);
      if (onDone) onDone(aktion);
    });
  }

  interact(interaction) {
    if (interaction.action === 'sleep') this.requestSleep();
    else if (interaction.dialog) this.startDialog(interaction.dialog);
  }

  requestSleep() {
    const hours = hoursOf(this.state.time.minute);
    if (hours >= 6 && hours < 18) this.startDialog('bettFrueh');
    else this.startSleep();
  }

  startSleep() {
    this.mode = 'sleep';
    this.sleep = { t: 0, advanced: false, kind: 'sleep' };
  }

  /** Ausruhen: kurze Abblende, dann springt die Uhr zur Zielzeit (gleicher Tag). */
  startRest(targetHour) {
    this.mode = 'sleep';
    this.sleep = { t: 0, advanced: false, kind: 'rest', targetHour };
  }

  updateSleep(dt) {
    const s = this.sleep;
    const timing = s.kind === 'rest' ? REST : SLEEP;
    s.t += dt;
    if (!s.advanced && s.t >= timing.fadeOut) {
      s.advanced = true;
      if (s.kind === 'rest') {
        const minute = (s.targetHour - 6) * 60;
        if (minute > this.state.time.minute) this.state.time.minute = minute;
      } else {
        this.advanceToMorning();
      }
    }
    if (s.t >= timing.fadeOut + timing.black + timing.fadeIn) {
      this.sleep = null;
      this.mode = 'play';
      if (s.kind === 'sleep') this.startDialog('morgen');
    }
  }

  /** Neuer Tag: Uhr auf den Morgen, Figur neben das Bett, speichern. */
  advanceToMorning() {
    const st = this.state;
    st.time.day += 1;
    st.time.minute = CONFIG.time.wakeMinute;
    st.stats.nightsSlept += 1;
    const w = this.world.shelter.wakeSpot;
    Object.assign(st.player, { x: w.x, z: w.z, facing: w.facing });
    if (st.hotbar.slots[st.hotbar.selected] === 'laterne') st.hotbar.selected = this.previousSlot;
    this.applyState();
    this.world.fadeValue = 1; // im Haus aufwachen: Dach bleibt ausgeblendet
    const ok = this.saves.save(st);
    const message = ok ? T.meldungen.gespeichert : this.saves.disabled ? T.meldungen.speichernAus : T.meldungen.speichernFehler;
    this.hud.toast(message, 'haus', 4.5);
    this.events.emit('newDay', st.time.day);
  }

  openMenu() {
    this.mode = 'menu';
    this.menu.open();
  }

  closeMenu() {
    this.menu.close();
    this.mode = this.dialog.active ? 'dialog' : 'play';
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // --- Aktualisieren -----------------------------------------------------------

  update(dt) {
    const input = this.input;
    if (input.pressed('debug')) this.showDebug = !this.showDebug;
    if (this.intro.t < this.intro.duration) {
      this.intro.t += dt;
      if (this.pendingIntro && this.intro.t > this.intro.duration * 0.7 && this.mode === 'play') {
        this.pendingIntro = false;
        this.startDialog('intro', () => this.hud.showHint(T.meldungen.hinweisStart, 14));
      }
    }

    switch (this.mode) {
      case 'play':
        this.updatePlay(dt);
        break;
      case 'dialog':
        this.dialog.update(dt, input);
        this.player.idle(dt);
        break;
      case 'menu':
        this.menu.update(input);
        this.player.idle(dt);
        break;
      case 'sleep':
        this.updateSleep(dt);
        this.player.idle(dt);
        break;
      default:
        break;
    }

    const hours = hoursOf(this.state.time.minute);
    this.world.update(dt, { hours, focus: this.rig.focus, player: this.player });
    this.rig.update(dt, this.player.position, this.player.velocity);
    this.updateCutout();
    this.hud.update(dt);
  }

  updatePlay(dt) {
    const input = this.input;
    if (input.pressed('menu')) {
      this.openMenu();
      return;
    }
    const slot = input.slotPressed();
    if (slot >= 0) this.selectSlot(slot);
    const wheel = input.consumeWheel();
    if (wheel) this.selectSlot((this.state.hotbar.selected + wheel + HOTBAR_SIZE) % HOTBAR_SIZE);
    if (input.mouse.clicked) {
      const i = this.hud.slotAt(this.ui);
      if (i >= 0) {
        this.selectSlot(i);
        input.consumeClick();
      }
    }
    if (input.pressed('lantern')) this.toggleLantern();

    this.player.update(dt, input.moveVector(), input.isDown('run'));
    const p = this.player.position;
    const sp = this.state.player;
    sp.x = p.x;
    sp.z = p.z;
    sp.facing = this.player.facing;

    this.currentInteraction = this.world.findInteraction(p.x, p.z, this.player.facing);
    if (this.currentInteraction && input.pressed('use')) {
      this.interact(this.currentInteraction);
      return;
    }
    this.advanceTime(dt);
  }

  advanceTime(dt) {
    const time = this.state.time;
    time.minute += dt / CONFIG.time.secondsPerGameMinute;
    if (time.minute >= DAY_MINUTES) {
      // Die ganze Nacht wach geblieben: um 06:00 beginnt der nächste Tag.
      time.minute -= DAY_MINUTES;
      time.day += 1;
      this.hud.toast(T.meldungen.neuerTag(time.day));
      this.events.emit('newDay', time.day);
    }
    const h = hoursOf(time.minute);
    const flags = this.state.flags;
    if (!flags.abendHinweis && h >= 20.25 && h < 23 && !this.player.holdingLantern) {
      flags.abendHinweis = true;
      this.startDialog('abendHinweis');
    } else if (!flags.spaetHinweis && (h >= 23.5 || h < 4)) {
      flags.spaetHinweis = true;
      this.startDialog('spaetHinweis');
    }
  }

  /** Durchsicht-Loch rund um die Spielfigur für Objekte davor. */
  updateCutout() {
    const p = this.player.position;
    const proj = this.rig.project(this._tmp.set(p.x, p.y + 0.85, p.z));
    sharedUniforms.uCutCenter.value.set(proj.x, proj.y);
    sharedUniforms.uCutDepth.value = proj.depth;
    sharedUniforms.uCutStrength.value = 1;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    if (this.pixel.resize(window.innerWidth, window.innerHeight, dpr)) {
      this.rig.setViewport(this.pixel.rtWidth, this.pixel.rtHeight);
      this.rig.place();
      this.ui.resize(this.pixel.width, this.pixel.height, this.pixel.scale, dpr);
    }
  }

  // --- Zeichnen ------------------------------------------------------------------

  /** Weltpunkt -> Oberflächenpixel (Ursprung oben links). */
  worldToUi(x, y, z) {
    const p = this.rig.project(this._tmp.set(x, y, z));
    return { x: p.x - 1, y: this.pixel.height - p.y };
  }

  render() {
    sharedUniforms.uDitherOffset.value.copy(this.rig.ditherOffset);
    this.pixel.render(this.scene, this.rig, this.world.dayNight.look);

    const ui = this.ui;
    ui.begin(this.input.mouse);
    const it = this.mode === 'play' ? this.currentInteraction : null;
    if (it) {
      const pos = this.worldToUi(it.x, this.world.heightAt(it.x, it.z) + 1.3, it.z);
      this.hud.prompt = { text: T.aktionen[it.prompt], x: pos.x, y: pos.y };
    } else {
      this.hud.prompt = null;
    }
    this.hud.debugLines = this.showDebug ? this.debugLines() : null;
    this.hud.draw(ui, { hotbar: this.mode !== 'dialog', prompt: this.mode === 'play' });
    this.dialog.draw(ui);
    this.menu.draw(ui);
    if (this.sleep) this.drawSleep(ui);
    if (this.intro.t < this.intro.duration) ui.ditherFill(1 - this.intro.t / this.intro.duration);
  }

  drawSleep(ui) {
    const s = this.sleep;
    const timing = s.kind === 'rest' ? REST : SLEEP;
    const t = s.t;
    let fade;
    if (t < timing.fadeOut) fade = t / timing.fadeOut;
    else if (t < timing.fadeOut + timing.black) fade = 1;
    else fade = 1 - (t - timing.fadeOut - timing.black) / timing.fadeIn;
    ui.ditherFill(Math.max(0, Math.min(1, fade)), s.kind === 'rest' ? COLORS.inset : COLORS.night);
    if (s.kind === 'rest') {
      if (t > timing.fadeOut * 0.5 && t < timing.fadeOut + timing.black) ui.textCentered(T.schlaf.warten, ui.width / 2, ui.height / 2 - 6, COLORS.textWarm, { outline: COLORS.outline });
    } else if (t < timing.fadeOut * 0.9) {
      ui.textCentered(T.schlaf.gutenacht, ui.width / 2, ui.height / 2 - 6, COLORS.textWarm, { outline: COLORS.outline });
    } else if (t < timing.fadeOut + timing.black + 0.3) {
      this.drawBigText(ui, T.schlaf.tagKarte(this.state.time.day), ui.width / 2, ui.height / 2 - 12, 2, COLORS.gold);
    }
  }

  /** Text in doppelter Pixelgröße (für die Tageskarte). */
  drawBigText(ui, text, cx, y, factor, color) {
    const w = measure(text);
    const tmp = document.createElement('canvas');
    tmp.width = w + 2;
    tmp.height = GLYPH_ROWS + 2;
    const c = tmp.getContext('2d');
    drawText(c, text, 1, 1, color, { shadow: COLORS.shadow });
    ui.ctx.drawImage(tmp, Math.round(cx - (tmp.width * factor) / 2), Math.round(y), tmp.width * factor, tmp.height * factor);
  }

  debugLines() {
    const info = this.pixel.renderer.info.render;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.frameTimes.length);
    const p = this.player.position;
    return [
      T.debug.titel,
      `${Math.round(1 / Math.max(avg, 0.001))} fps · ${(avg * 1000).toFixed(1)} ms`,
      `${info.calls} Aufrufe · ${Math.round(info.triangles / 1000)}k Dreiecke`,
      `${this.pixel.width}×${this.pixel.height} · ${this.pixel.scale}x`,
      `x ${p.x.toFixed(2)} z ${p.z.toFixed(2)}`,
      `${clockText(this.state.time.minute)} · ${this.mode}`,
    ];
  }

  setFavicon() {
    const icon = iconCanvas('haus');
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(icon, 1, 1, 30, 30);
    const link = document.querySelector('link[rel="icon"]');
    if (link) link.href = c.toDataURL('image/png');
  }

  /**
   * Nur lesen, was auch auf dem Bildschirm steht – für Testspieler, die
   * Screenshots nicht Pixel für Pixel entziffern sollen.
   */
  observe() {
    const st = this.state;
    const it = this.mode === 'play' ? this.currentInteraction : null;
    const line = this.dialog.active ? this.dialog.line : null;
    return {
      tag: st.time.day,
      uhrzeit: clockText(st.time.minute),
      modus: this.mode,
      vorrat: { ...st.inventory },
      schnellleiste: { gewaehlt: st.hotbar.selected + 1, plaetze: st.hotbar.slots.map((s) => s || '-') },
      hinweis: it ? T.aktionen[it.prompt] : null,
      dialog: line ? { sprecher: line.s, text: line.t, antworten: (line.antworten || []).map((a) => a.t) } : null,
      menue: this.menu.isOpen ? this.menu.screen : null,
      meldungen: this.hud.toasts.map((t) => t.text),
      figur: { x: Number(this.player.position.x.toFixed(2)), z: Number(this.player.position.z.toFixed(2)), imHaus: this.world.playerInside },
    };
  }

  // --- Test-Schnittstelle (nur mit ?test oder ?debug) --------------------------

  exposeTestApi() {
    const game = this;
    window.zomfy = {
      get ready() {
        return game.ready;
      },
      get frame() {
        return game.frame;
      },
      get mode() {
        return game.mode;
      },
      state: () => JSON.parse(JSON.stringify(game.state)),
      setTime(hours, minutes = 0) {
        game.state.time.minute = (((hours - 6) * 60 + minutes) % DAY_MINUTES + DAY_MINUTES) % DAY_MINUTES;
      },
      teleport(x, z, facing = 0) {
        Object.assign(game.state.player, { x, z, facing });
        game.applyState();
      },
      selectSlot: (i) => game.selectSlot(i),
      setFlag(name, value = true) {
        game.state.flags[name] = value;
      },
      toggleLantern: () => game.toggleLantern(),
      interact(id) {
        const it = game.world.interactions.find((i) => i.id === id);
        if (it) game.interact(it);
        return Boolean(it);
      },
      sleepNow: () => game.startSleep(),
      finishDialog() {
        let guard = 50;
        while (game.dialog.active && guard-- > 0) game.dialog.advance();
      },
      openMenu: () => game.openMenu(),
      closeMenu: () => game.closeMenu(),
      setDebug(on) {
        game.showDebug = on;
      },
      waitFrames(n = 1) {
        return new Promise((resolve) => game.frameWaiters.push({ frame: game.frame + n, resolve }));
      },
      stats() {
        const info = game.pixel.renderer.info.render;
        const avg = game.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, game.frameTimes.length);
        return {
          frameMs: avg * 1000,
          calls: info.calls,
          triangles: info.triangles,
          width: game.pixel.width,
          height: game.pixel.height,
          scale: game.pixel.scale,
          instances: game.world.stats,
        };
      },
    };
  }
}
