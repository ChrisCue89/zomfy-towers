// Die Spielschleife. Besitzt alle Systeme und schaltet zwischen den Modi
// play (spielen), dialog, menu, craft (Werkbank) und sleep (Schlafen,
// Ausruhen, Werkeln mit Abblende) um.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Events } from './events.js';
import { Input } from './input.js';
import { SaveStore } from './save.js';
import { createNewState, hoursOf, clockText, DAY_MINUTES } from './state.js';
import { canAfford, pay, gain } from './inventory.js';
import { Builder } from './builder.js';
import { Gathering } from './gathering.js';
import { PixelRenderer } from '../render/pixelRenderer.js';
import { CameraRig } from '../render/cameraRig.js';
import { sharedUniforms } from '../render/materials.js';
import { renderPortraits } from '../render/portrait.js';
import { World } from '../world/world.js';
import { Effects } from '../world/effects.js';
import { LAYOUT } from '../world/layout.js';
import { Player } from '../entities/player.js';
import { UICanvas, COLORS } from '../ui/ui.js';
import { Hud } from '../ui/hud.js';
import { DialogBox } from '../ui/dialog.js';
import { Menu } from '../ui/menu.js';
import { BuildBar } from '../ui/buildbar.js';
import { CraftingMenu } from '../ui/crafting.js';
import { drawText, measure, GLYPH_ROWS } from '../ui/font.js';
import { iconCanvas } from '../ui/icons.js';
import { T } from '../data/texts.js';
import { DIALOGE } from '../data/dialogs.js';
import { HOTBAR_SIZE, ITEMS } from '../data/items.js';
import { BUILDINGS } from '../data/buildings.js';
import { GOALS } from '../data/goals.js';

/** Flags, die nach einem Dialog gesetzt werden. */
const FLAG_AFTER_DIALOG = {
  radio: 'radioGehoert',
  briefkasten: 'briefkastenGesehen',
  sessel: 'sesselProbiert',
};

/** Ausruhen: Zieluhrzeit je Aktion. */
const REST_TARGET = { wartenAbend: 18.5, wartenNacht: 21.5 };

const SLEEP = { fadeOut: 1.0, black: 1.2, fadeIn: 0.9 };
const REST = { fadeOut: 0.7, black: 0.8, fadeIn: 0.8 };

export class Game {
  constructor() {
    this.mode = 'play';
    this.frame = 0;
    this.ready = false;
    this.frameTimes = [];
    this.showDebug = CONFIG.debug;
    this.currentInteraction = null;
    this.suppressed = null; // { id, until } – Interaktion ruht bis zum Weggehen oder bis `until`
    this.clock = 0; // Sekunden seit dem Start (für kurze Sperren)
    this.sleep = null;
    this.goal = null; // { id, text }
    this.frameWaiters = [];
    this._tmp = new THREE.Vector3();
    this.intro = { t: 0, duration: 1.9 };
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
    this.effects = new Effects(this.world.particles);
    this.player = new Player({ world: this.world, config: CONFIG.player });
    this.scene.add(this.player.object);
    this.world.attachPlayerLantern(this.player.character.lantern.glow);

    this.rig = new CameraRig(CONFIG.render, CONFIG.camera);
    this.rig.bounds = LAYOUT.cameraBounds;

    this.hud = new Hud(this);
    this.dialog = new DialogBox(this);
    this.menu = new Menu(this);
    this.builder = new Builder(this);
    this.gathering = new Gathering(this);
    this.buildbar = new BuildBar(this);
    this.crafting = new CraftingMenu(this);
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
    // Einführung auch nach einem Neuladen mitten im Intro noch einmal zeigen
    const introOpen = this.isNewGame || !this.state.flags.introGesehen;
    if (introOpen && !CONFIG.skipIntro) this.pendingIntro = true;
    else if (introOpen) this.hud.showHint(T.meldungen.hinweisStart, 14);
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

  /** Spielzustand auf Welt und Figur übertragen (Laden, neues Spiel). */
  applyState() {
    const st = this.state;
    this.builder.cancel();
    this.world.setHouseLevel(st.world.houseLevel);
    this.world.buildings.load(st.world.buildings);
    st.world.buildings = this.world.buildings.toState();
    this.world.resources.apply(st.world, st.time.day);
    const axe = this.world.props.axe;
    axe.object.visible = !st.tools.axt;
    Object.assign(axe.interaction, st.tools.axt ? { prompt: 'ansehen', action: null, dialog: 'hackklotz' } : { prompt: 'axtNehmen', action: 'takeAxe', dialog: null });
    this.world.refreshInteractions();

    const p = st.player;
    this.player.place(p.x, p.z, p.facing);
    this.pushPlayerOut();
    this.player.holdingLantern = p.lantern;
    this.player.lanternLit = p.lantern;
    this.rig.jumpTo(this.player.position.x, this.player.position.z);
    this.updateHeldItem(false);
    this.updateGoals(true);
  }

  quietSave() {
    if (!this.ready) return;
    this.saves.save(this.state);
  }

  newGame() {
    this.saves.clear();
    this.state = createNewState(CONFIG);
    this.isNewGame = true;
    this.applyState();
    this.menu.close();
    this.mode = 'play';
    this.intro.t = 0;
    this.pendingIntro = true;
  }

  /** Figur aus Hindernissen schieben (nach Umbau oder Laden). */
  pushPlayerOut() {
    const p = this.player.position;
    this.world.colliders.resolve(p, CONFIG.player.radius);
    p.y = this.world.heightAt(p.x, p.z);
    this.player.syncObject();
    Object.assign(this.state.player, { x: p.x, z: p.z });
  }

  // --- Schnellleiste, Werkzeuge und Laterne -----------------------------------

  selectSlot(index, announce = true) {
    const hb = this.state.hotbar;
    if (index === hb.selected || index < 0 || index >= HOTBAR_SIZE) return;
    hb.selected = index;
    this.updateHeldItem(announce);
  }

  updateHeldItem(announce) {
    const hb = this.state.hotbar;
    const item = hb.slots[hb.selected];
    this.player.heldTool = item && ITEMS[item]?.tool ? item : null;
    if (announce) this.hud.showItemLabel(item ? T.gegenstaende[item] : T.gegenstaende.leer);
  }

  /** Neues Werkzeug in den ersten freien Platz legen und in die Hand nehmen. */
  addToHotbar(item) {
    const hb = this.state.hotbar;
    let slot = hb.slots.indexOf(item);
    if (slot < 0) {
      slot = hb.slots.indexOf(null);
      if (slot < 0) return;
      hb.slots[slot] = item;
    }
    hb.selected = slot;
    this.updateHeldItem(false);
  }

  toggleLantern() {
    const on = !this.player.holdingLantern;
    this.player.holdingLantern = on;
    this.player.lanternLit = on;
    this.state.player.lantern = on;
    this.hud.showItemLabel(on ? T.meldungen.laterneAn : T.meldungen.laterneAus);
  }

  // --- Ziele -------------------------------------------------------------------

  /** Erstes offenes Ziel bestimmen; erreichte Ziele melden. */
  updateGoals(silent = false) {
    const flags = this.state.flags;
    let current = null;
    for (const goal of GOALS) {
      const key = `ziel_${goal.id}`;
      if (flags[key]) continue;
      if (goal.done(this)) {
        flags[key] = true;
        if (!silent) {
          this.hud.toast(T.meldungen.zielErreicht, 'ziel', 2.6);
          this.hud.goalFlash = 1.2;
        }
        continue;
      }
      current = goal;
      break;
    }
    if (current?.id !== this.goal?.id) this.goal = current ? { id: current.id, text: T.ziele[current.id] } : null;
    if (this.goal) {
      const p = current.progress ? current.progress(this) : null;
      this.goal.progress = p ? `(${Math.min(p[0], p[1])}/${p[1]})` : null;
    }
  }

  // --- Dialoge, Menü, Schlafen ------------------------------------------------

  startDialog(id, onDone = null) {
    const entry = DIALOGE[id];
    if (!entry) return;
    const lines = typeof entry === 'function' ? entry(this.state) : entry;
    this.mode = 'dialog';
    this.gathering.repeat = null;
    const source = this.lastInteraction;
    this.lastInteraction = null;
    this.dialog.open(lines, (aktion) => {
      this.mode = 'play';
      // Dasselbe Ding nicht sofort wieder öffnen, wenn man E weiterdrückt
      if (source) this.suppressed = { id: source, until: this.clock + 1.0 };
      if (FLAG_AFTER_DIALOG[id]) this.state.flags[FLAG_AFTER_DIALOG[id]] = true;
      if (aktion === 'schlafen') this.startSleep();
      else if (REST_TARGET[aktion]) this.startRest(REST_TARGET[aktion]);
      if (onDone) onDone(aktion);
    });
  }

  interact(it) {
    this.lastInteraction = it.id;
    if (it.action === 'sleep') this.requestSleep();
    else if (it.action === 'takeAxe') this.takeAxe();
    else if (it.use === 'werkbank') this.openCrafting();
    else if (it.use === 'bank') this.startDialog('bank');
    else if (it.use === 'ernten') this.harvest(it.building);
    else if (it.select) this.builder.select(it.select);
    else if (this.gathering.interact(it)) return;
    else if (it.dialog) this.startDialog(it.dialog);
  }

  takeAxe() {
    const st = this.state;
    if (st.tools.axt) return;
    st.tools.axt = true;
    const axe = this.world.props.axe;
    axe.object.visible = false;
    Object.assign(axe.interaction, { prompt: 'ansehen', action: null, dialog: 'hackklotz' });
    this.addToHotbar('axt');
    this.effects.chips(axe.interaction.x, 0.5, axe.interaction.z, 'holz', 6);
    this.hud.toast(T.meldungen.axtGenommen, 'axt', 2.4);
    this.startDialog('axtFund');
  }

  /** Flachsbeet: einmal am Tag ernten. */
  harvest(buildingId) {
    const b = this.world.buildings.get(buildingId);
    if (!b) return;
    const day = this.state.time.day;
    if (b.day === day) {
      this.hud.toast(T.meldungen.geerntet, 'beet', 2.2);
      return;
    }
    const c = this.world.buildings.bounds(b);
    this.player.startAction('search', {
      duration: 0.8,
      face: c,
      onDone: () => {
        b.day = day;
        this.state.world.buildings = this.world.buildings.toState();
        this.effects.chips(c.x, 0.3, c.z, 'gras', 8);
        this.gathering.give(BUILDINGS[b.type].harvest, c.x, 0.9, c.z);
      },
    });
  }

  openCrafting() {
    this.builder.cancel();
    this.mode = 'craft';
    this.crafting.open();
  }

  closeCrafting() {
    this.crafting.close();
    this.mode = 'play';
  }

  craft(recipe) {
    const st = this.state;
    if (recipe.owned) {
      this.hud.toast(T.werkbank.vorhanden, recipe.icon, 1.8);
      return false;
    }
    if (!canAfford(st.inventory, recipe.cost)) {
      this.hud.toast(T.meldungen.zuTeuer, null, 1.8);
      return false;
    }
    pay(st.inventory, recipe.cost);
    if (recipe.gives.tool) {
      st.tools[recipe.gives.tool] = true;
      this.addToHotbar(recipe.gives.tool);
    }
    if (recipe.gives.inventory) gain(st.inventory, recipe.gives.inventory);
    const gives = recipe.gives.inventory ? Object.entries(recipe.gives.inventory)[0] : null;
    this.hud.toast(gives ? T.meldungen.verwertet(gives[1], T.ressourcen[gives[0]]) : T.meldungen.hergestellt(T.rezepte[recipe.id]), recipe.icon, 2);
    this.quietSave();
    return true;
  }

  requestSleep() {
    const hours = hoursOf(this.state.time.minute);
    if (hours >= 6 && hours < 18) this.startDialog('bettFrueh');
    else this.startSleep();
  }

  startSleep() {
    this.builder.cancel();
    this.mode = 'sleep';
    this.sleep = { t: 0, advanced: false, kind: 'sleep' };
  }

  /** Ausruhen: kurze Abblende, dann springt die Uhr zur Zielzeit (gleicher Tag). */
  startRest(targetHour) {
    this.builder.cancel();
    this.mode = 'sleep';
    this.sleep = { t: 0, advanced: false, kind: 'rest', targetHour };
  }

  /** Werkeln (z. B. Hausausbau): Abblende, Uhr läuft `hours` weiter, dann onBlack/onDone. */
  startWork(text, hours, onBlack, onDone) {
    this.builder.cancel();
    this.mode = 'sleep';
    this.sleep = { t: 0, advanced: false, kind: 'work', text, hours, onBlack, onDone };
  }

  updateSleep(dt) {
    const s = this.sleep;
    const timing = s.kind === 'sleep' ? SLEEP : REST;
    s.t += dt;
    // Die schwarze Tageskarte lässt sich mit E, Leertaste oder Klick überspringen.
    if (s.advanced && s.t < timing.fadeOut + timing.black && (this.input.pressed('confirm') || this.input.mouse.clicked)) s.t = timing.fadeOut + timing.black;
    if (!s.advanced && s.t >= timing.fadeOut) {
      s.advanced = true;
      if (s.kind === 'rest') {
        const minute = (s.targetHour - 6) * 60;
        if (minute > this.state.time.minute) this.state.time.minute = minute;
      } else if (s.kind === 'work') {
        this.state.time.minute = Math.min(DAY_MINUTES - 1, this.state.time.minute + s.hours * 60);
        if (s.onBlack) s.onBlack();
      } else {
        this.advanceToMorning();
      }
    }
    if (s.t >= timing.fadeOut + timing.black + timing.fadeIn) {
      this.sleep = null;
      this.mode = 'play';
      if (s.kind === 'sleep') {
        // Aufwachen: ein Gedanke statt eines Dialogs – man kann sofort loslaufen.
        this.suppressed = { id: 'bett', until: Infinity };
        this.hud.say(DIALOGE.morgen(this.state)[0].t, 4.5);
      } else if (s.kind === 'work' && s.onDone) {
        s.onDone();
      }
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
    this.onNewDay();
    this.player.place(w.x, w.z, w.facing);
    this.rig.jumpTo(w.x, w.z);
    this.world.fadeValue = 1; // im Haus aufwachen: Dach bleibt ausgeblendet
    const ok = this.saves.save(st);
    const message = ok ? T.meldungen.gespeichert : this.saves.disabled ? T.meldungen.speichernAus : T.meldungen.speichernFehler;
    this.hud.toast(message, 'haus', 4.5);
  }

  /** Alles, was ein neuer Tag mit sich bringt (Nachwachsen …). */
  onNewDay() {
    this.world.resources.apply(this.state.world, this.state.time.day);
    this.events.emit('newDay', this.state.time.day);
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
    this.clock += dt;
    if (input.pressed('debug')) this.showDebug = !this.showDebug;
    if (this.intro.t < this.intro.duration) {
      this.intro.t += dt;
      if (this.pendingIntro && this.intro.t > this.intro.duration * 0.7 && this.mode === 'play') {
        this.pendingIntro = false;
        this.startDialog('intro', () => {
          this.state.flags.introGesehen = true;
          this.hud.showHint(T.meldungen.hinweisStart, 14);
        });
      }
    }

    switch (this.mode) {
      case 'play':
        this.updatePlay(dt);
        break;
      case 'dialog':
        // Esc öffnet auch mitten im Dialog das Menü (danach geht der Dialog weiter)
        if (input.pressed('menu')) this.openMenu();
        else this.dialog.update(dt, input);
        this.player.idle(dt);
        break;
      case 'menu':
        this.menu.update(input, dt);
        this.player.idle(dt);
        break;
      case 'craft':
        this.crafting.update(input);
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
    this.updateGoals();
    this.hud.update(dt);
  }

  updatePlay(dt) {
    const input = this.input;
    const ui = this.ui;
    // Bis das Intro spricht, steht Mika still (sonst reißt der Dialog sie aus dem Laufen).
    if (this.pendingIntro) {
      this.player.idle(dt);
      return;
    }

    // Oberfläche zuerst: Bauleiste, Schnellleiste – dann Abbrechen, dann Menü
    this.buildbar.update(dt, input);
    if (input.mouse.clicked) {
      const i = this.hud.slotAt(ui);
      if (i === -2) this.toggleLantern();
      else if (i >= 0) this.selectSlot(i);
      if (i !== -1) input.consumeClick();
    }
    const escUsed = this.builder.handleCancel(input);
    if (!escUsed && input.pressed('menu')) {
      this.openMenu();
      return;
    }
    if (this.mode !== 'play') return; // die Bauleiste kann einen Dialog öffnen

    const slot = input.slotPressed();
    if (slot >= 0) this.selectSlot(slot);
    if (!this.builder.placement) {
      const wheel = input.consumeWheel();
      if (wheel) this.selectSlot((this.state.hotbar.selected + wheel + HOTBAR_SIZE) % HOTBAR_SIZE);
    }
    if (input.pressed('lantern')) this.toggleLantern();

    this.player.update(dt, this.world.doorAssist(this.player.position, input.moveVector()), input.isDown('run'));
    const p = this.player.position;
    const sp = this.state.player;
    sp.x = p.x;
    sp.z = p.z;
    sp.facing = this.player.facing;

    const pointerFree = !this.buildbar.contains(ui) && !this.hud.containsHotbar(ui);
    this.builder.update(dt, input, pointerFree);
    if (this.mode !== 'play') return;

    // Beim Platzieren setzt E den Bau – dann keine Interaktion.
    let it = null;
    if (!this.builder.placement && !this.player.busy) {
      it = this.world.findInteraction(p.x, p.z, this.player.facing);
      // Gesperrt bis zum Weggehen (Bett nach dem Aufwachen) oder kurz nach einem Dialog
      const sup = this.suppressed;
      if (sup) {
        const near = this.world.interactions.some((i) => i.id === sup.id && Math.hypot(i.x - p.x, i.z - p.z) <= i.radius);
        if (!near || this.clock > sup.until) this.suppressed = null;
        else if (it && it.id === sup.id) it = null;
      }
    }
    // Kurz über die Reichweite hinausgerutscht? E trifft trotzdem, was eben noch angezeigt war.
    if (!it && input.pressed('use') && !this.builder.placement && !this.player.busy) {
      it = this.world.findInteraction(p.x, p.z, this.player.facing, 0.45);
      if (it && this.suppressed && it.id === this.suppressed.id) it = null;
    }
    this.currentInteraction = it;
    if (it && input.pressed('use')) {
      this.interact(it);
      if (this.mode !== 'play') return;
    }
    this.gathering.update(input, this.player.busy ? this.gathering.repeat : it);
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
      this.onNewDay();
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

  /** Boden unter dem Mauszeiger (oder null, wenn die Maus nicht im Fenster ist). */
  pointerGround(out = new THREE.Vector3()) {
    const m = this.input.mouse;
    if (!m.inside) return null;
    return this.rig.unproject(m.x + 1.5, this.pixel.height - m.y - 0.5, 0, out);
  }

  /**
   * Kann man hier gerade nichts holen? Dann zeigt der Hinweis das (gedimmt),
   * statt erst beim Drücken zu scheitern.
   */
  interactionStatus(it) {
    const st = this.state;
    if (it.node) {
      const node = this.world.resources.byId.get(it.node);
      if (!node) return null;
      if (node.rules.tool && !st.tools[node.rules.tool]) return T.aktionen.brauchtWerkzeug(T.gegenstaende[node.rules.tool]);
      if (node.rules.search && st.world.searched[node.id] === st.time.day) return T.aktionen.heuteLeer;
    }
    if (it.search && st.world.searched[it.id] === st.time.day) return T.aktionen.heuteLeer;
    if (it.use === 'ernten') {
      const b = this.world.buildings.get(it.building);
      if (b && b.day === st.time.day) return T.aktionen.heuteLeer;
    }
    return null;
  }

  render() {
    sharedUniforms.uDitherOffset.value.copy(this.rig.ditherOffset);
    this.pixel.render(this.scene, this.rig, this.world.dayNight.look);

    const ui = this.ui;
    ui.begin(this.input.mouse);
    const it = this.mode === 'play' ? this.currentInteraction : null;
    if (it) {
      const ground = this.world.heightAt(it.x, it.z);
      const pos = this.worldToUi(it.x, ground + 1.3, it.z);
      const status = this.interactionStatus(it);
      this.hud.prompt = { text: status || T.aktionen[it.prompt], dim: Boolean(status), x: pos.x, y: pos.y, target: this.worldToUi(it.x, ground, it.z) };
    } else {
      this.hud.prompt = null;
    }
    this.hud.debugLines = this.showDebug ? this.debugLines() : null;
    const playing = this.mode === 'play';
    if (playing) this.builder.drawOverlay(ui);
    this.hud.draw(ui, { hotbar: playing || this.mode === 'craft', prompt: playing });
    if (playing) this.buildbar.draw(ui);
    this.crafting.draw(ui);
    this.hud.drawToasts(ui); // Meldungen liegen über der Werkbank
    this.dialog.draw(ui);
    this.menu.draw(ui);
    if (this.sleep) this.drawSleep(ui);
    if (this.intro.t < this.intro.duration) this.drawIntro(ui);
  }

  /** Einblenden beim Start: Titelkarte, dann löst sich das Schwarz gerastert auf. */
  drawIntro(ui) {
    const t = this.intro.t / this.intro.duration;
    ui.ditherFill(Math.min(1, (1 - t) * 1.6));
    if (t < 0.55) {
      this.drawBigText(ui, T.spielName, ui.width / 2, ui.height / 2 - 26, 3, COLORS.gold);
      ui.textCentered(`${T.tag} ${this.state.time.day}`, ui.width / 2, ui.height / 2 + 14, COLORS.textWarm, { outline: COLORS.outline });
    }
  }

  drawSleep(ui) {
    const s = this.sleep;
    const timing = s.kind === 'sleep' ? SLEEP : REST;
    const t = s.t;
    let fade;
    if (t < timing.fadeOut) fade = t / timing.fadeOut;
    else if (t < timing.fadeOut + timing.black) fade = 1;
    else fade = 1 - (t - timing.fadeOut - timing.black) / timing.fadeIn;
    ui.ditherFill(Math.max(0, Math.min(1, fade)), s.kind === 'sleep' ? COLORS.night : COLORS.inset);
    if (s.kind !== 'sleep') {
      const text = s.kind === 'work' ? s.text : T.schlaf.warten;
      if (t > timing.fadeOut * 0.5 && t < timing.fadeOut + timing.black) ui.textCentered(text, ui.width / 2, ui.height / 2 - 6, COLORS.textWarm, { outline: COLORS.outline });
    } else if (t < timing.fadeOut * 0.9) {
      ui.textCentered(T.schlaf.gutenacht, ui.width / 2, ui.height / 2 - 6, COLORS.textWarm, { outline: COLORS.outline });
    } else if (t < timing.fadeOut + timing.black + 0.3) {
      this.drawBigText(ui, T.schlaf.tagKarte(this.state.time.day), ui.width / 2, ui.height / 2 - 12, 2, COLORS.gold);
    }
  }

  /** Text in mehrfacher Pixelgröße (Titel, Tageskarte). */
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
    const costText = (cost) =>
      Object.entries(cost || {})
        .filter(([, v]) => v > 0)
        .map(([res, v]) => `${v} ${T.ressourcen[res]}`)
        .join(', ');
    const L = this.mode === 'play' ? this.buildbar.layout(this.ui) : null;
    return {
      tag: st.time.day,
      uhrzeit: clockText(st.time.minute),
      modus: this.mode,
      ziel: this.goal ? this.goal.text : null,
      vorrat: Object.fromEntries(this.hud.visibleResources().map((r) => [r, st.inventory[r]])),
      laterne: this.player.holdingLantern ? 'an' : 'aus',
      schnellleiste: { gewaehlt: st.hotbar.selected + 1, plaetze: st.hotbar.slots.map((s) => s || '-') },
      hinweis: it ? T.aktionen[it.prompt] : null,
      bauleiste: L
        ? {
            titel: L.title,
            optionen: L.tiles.map((t) => ({
              taste: t.key,
              name: t.option.name,
              preis: costText(t.option.cost),
              bezahlbar: Boolean(t.option.affordable && !t.option.disabled),
              ...(t.option.disabled ? { gesperrt: t.option.disabledText } : {}),
            })),
          }
        : null,
      platzieren: this.builder.placement ? { bau: this.builder.placement.name, passt: this.builder.placement.ok } : null,
      werkbank:
        this.mode === 'craft'
          ? this.crafting.recipes().map((r, i) => `${i === this.crafting.focus ? '> ' : ''}${T.rezepte[r.id]} (${r.owned ? T.werkbank.vorhanden : costText(r.cost)})`)
          : null,
      dialog: line
        ? {
            sprecher: line.s,
            text: line.t.slice(0, Math.floor(this.dialog.shown)),
            fertigGetippt: this.dialog.complete,
            antworten: this.dialog.complete ? (line.antworten || []).map((a, i) => (i === this.dialog.choice ? `> ${a.t}` : a.t)) : [],
          }
        : null,
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
        game.player.place(x, z, facing);
        game.rig.jumpTo(x, z);
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
      give(gains) {
        gain(game.state.inventory, gains);
      },
      /** Bau wie über die Bauleiste setzen (mit Kosten). */
      build(type, i, j, turns = 0) {
        game.builder.startPlacement(type);
        const pl = game.builder.placement;
        const check = game.world.buildings.check(type, i, j, turns);
        if (!check.ok || !canAfford(game.state.inventory, pl.cost)) {
          game.builder.cancel();
          return check.ok ? 'teuer' : check.reason;
        }
        Object.assign(pl, { i, j, turns, ok: true, reason: null });
        game.builder.tryPlace();
        game.builder.cancel();
        return 'ok';
      },
      buildings: () => game.world.buildings.toState(),
      demolish: (id) => game.builder.demolish(id),
      /** Kacheln der Bauleiste in CSS-Pixeln (Mittelpunkt). */
      buildbarLayout() {
        const L = game.buildbar.layout(game.ui);
        const f = game.pixel.scale / (window.devicePixelRatio || 1);
        return { tiles: L.tiles.map((t) => ({ id: t.option.id, x: (t.rect.x + t.rect.w / 2) * f, y: (t.rect.y + t.rect.h / 2) * f })) };
      },
      /** Bildschirmposition (CSS-Pixel) eines Weltpunkts – für echte Mausklicks im Test. */
      screenOf(x, y, z) {
        const p = game.worldToUi(x, y, z);
        const f = game.pixel.scale / (window.devicePixelRatio || 1);
        return { x: (p.x + 0.5) * f, y: (p.y + 0.5) * f };
      },
      get placement() {
        return game.builder.placement ? { type: game.builder.placement.type, i: game.builder.placement.i, j: game.builder.placement.j, ok: game.builder.placement.ok } : null;
      },
      craft(id) {
        const recipe = game.crafting.recipes().find((r) => r.id === id);
        return recipe ? game.craft(recipe) : false;
      },
      upgradeHouse: () => game.builder.upgradeHouse(),
      buildOptions: () => game.builder.options('zuhause').map(({ id, affordable, disabled, progress }) => ({ id, affordable, disabled, progress })),
      startPlacement: (type) => game.builder.startPlacement(type),
      cancelBuild: () => game.builder.cancel(),
      sleepNow: () => game.startSleep(),
      finishDialog() {
        let guard = 50;
        while (game.dialog.active && guard-- > 0) game.dialog.advance();
      },
      /** Antwort i der aktuellen Frage wählen (Text wird dafür fertig getippt). */
      answer(i) {
        const d = game.dialog;
        let guard = 20;
        while (d.active && !d.hasAnswers && guard-- > 0) d.advance();
        if (!d.active) return false;
        d.shown = d.line.t.length;
        d.choice = i;
        d.advance();
        return true;
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
