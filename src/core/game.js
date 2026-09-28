// Die Spielschleife. Besitzt alle Systeme und schaltet zwischen den Modi
// play (spielen), dialog, menu, craft (Werkbank), report (Morgenbericht) und
// sleep (Schlafen, Ausruhen, Werkeln, verlorene Nacht, Ohnmacht – jeweils mit
// Abblende) um.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Events } from './events.js';
import { Input } from './input.js';
import { SaveStore, randomMapSeed } from './save.js';
import { createNewState, hoursOf, clockText, DAY_MINUTES, absoluteMinute } from './state.js';
import { canAfford, pay, gain } from './inventory.js';
import { Builder } from './builder.js';
import { Gathering } from './gathering.js';
import { Nights } from './nights.js';
import { Combat } from './combat.js';
import { Rng } from './rng.js';
import { PixelRenderer } from '../render/pixelRenderer.js';
import { CameraRig } from '../render/cameraRig.js';
import { sharedUniforms } from '../render/materials.js';
import { renderPortraits, mikaPortrait } from '../render/portrait.js';
import { TitleScreen } from '../ui/title.js';
import { MIKA } from '../entities/characters.js';
import { lookSpec } from '../data/looks.js';
import { Survivors } from './survivors.js';
import { Trader } from './trader.js';
import { SURVIVORS, SURVIVOR_ORDER, BEACON } from '../data/survivors.js';
import { Furnishing } from './furnishing.js';
import { World } from '../world/world.js';
import { Effects } from '../world/effects.js';
import { LAYOUT } from '../world/layout.js';
import { AREA as TERRAIN_AREA } from '../world/terrain.js';
import { Player } from '../entities/player.js';
import { Horde } from '../entities/horde.js';
import { TowerSystem } from '../entities/towers.js';
import { Loot } from '../entities/loot.js';
import { UICanvas, COLORS } from '../ui/ui.js';
import { Hud, LOW_HP } from '../ui/hud.js';
import { DialogBox } from '../ui/dialog.js';
import { Menu } from '../ui/menu.js';
import { BuildBar } from '../ui/buildbar.js';
import { CraftingMenu } from '../ui/crafting.js';
import { ReportPanel } from '../ui/report.js';
import { PerkChoice } from '../ui/perkChoice.js';
import { MapView } from '../ui/mapView.js';
import { perkValue, PERKS, xpForLevel } from '../data/perks.js';
import { drawText, measure, GLYPH_ROWS, setPlayerName } from '../ui/font.js';
import { iconCanvas } from '../ui/icons.js';
import { T } from '../data/texts.js';
import { Sound } from '../audio/sound.js';
import { renderMusic } from '../audio/music.js';
import { loadSettings, saveSettings, volumesOf, PIXEL_SIZES, TEXT_SPEEDS } from './settings.js';
import { DIALOGE, REST_TARGET, canRest } from '../data/dialogs.js';
import { HOTBAR_SIZE, ITEMS } from '../data/items.js';
import { WEAPONS } from '../data/weapons.js';
import { BUILDINGS, HOUSE_LEVELS, TOWER_LOSS_FLOOR, SOUP, barricadeLevel, houseLossFactor, maxHpOf } from '../data/buildings.js';
import { GOALS } from '../data/goals.js';
import { RECIPES } from '../data/recipes.js';
import { upgradeValue } from '../data/upgrades.js';
import { RESOURCES, RARE_RESOURCES } from '../data/items.js';
import { MAX_COZY } from '../data/furniture.js';
import { HOUSE_DAMAGE, PARTS_FROM_TOWERS } from '../data/zombies.js';

/** Flags, die nach einem Dialog gesetzt werden. */
const FLAG_AFTER_DIALOG = {
  radio: 'radioGehoert',
  briefkasten: 'briefkastenGesehen',
  sessel: 'sesselProbiert',
};

/** Ausruhen: Zieluhrzeit je Aktion. */

const SLEEP = { fadeOut: 1.0, black: 1.2, fadeIn: 0.9 };
const REST = { fadeOut: 0.7, black: 0.8, fadeIn: 0.8 };
const PASSAGE_TIME = 0.45; // Sekunden für den Weg durch die Haustür (abblenden, umsetzen, aufblenden)
const ZERO = new THREE.Vector3();
const TITLE_HOURS = 18.4; // Titelbild: goldenes Abendlicht, egal wie spät es im Spielstand ist
// Kamerafahrt der Einleitung (M15): Die Fahrt selbst ist weich geführt, die Kamera folgt ihr straff
const TOUR = { sharpness: 30, minTime: 0.9, maxTime: 3.2, metersPerSecond: 18 };
/** Tonhöhe des Einsammel-Klangs je Beute (seltenes klingt heller). */
const LOOT_PITCH = { schrott: 700, teile: 560, holz: 620, stein: 660, fasern: 740, stoff: 780, zahnraeder: 990, moderkerne: 1180 };
// Perk-Wahl erst, wenn es ruhig ist: kein Schlurfer so nah, kein Schwung, keine Rolle
const PERK_NEAR = 6;
/** Reifenschaukel (m12-r1): so lange, so schnell und so weit schwingt sie. */
const SWING = { duration: 4.2, period: 1.7, amp: 0.42 };
const PERK_CALM = 0.8; // so lange (s) muss es ruhig sein
const DAY_FLOOR = 0.75; // so weit nagen Streuner das Zuhause tagsüber höchstens herunter
const FRESH_KEY = 'zomfy-towers.neues-spiel';

/** Neues Spiel über ein Neuladen hinweg merken (Name und Aussehen). false = geht nicht. */
function stashFreshStart(data) {
  try {
    globalThis.sessionStorage.setItem(FRESH_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Gemerktes neues Spiel abholen (nur einmal). */
function takeFreshStart() {
  try {
    const raw = globalThis.sessionStorage.getItem(FRESH_KEY);
    if (!raw) return null;
    globalThis.sessionStorage.removeItem(FRESH_KEY);
    const data = JSON.parse(raw);
    return data && typeof data.name === 'string' ? data : null;
  } catch {
    return null;
  }
}

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
    this.hitstop = 0; // Trefferstopp: Simulation hält kurz an
    this.benchReady = 0; // ab wann die Bank wieder heilt (this.clock)
    this.treeHintUntil = 0; // Absage am Waldbaum nicht bei jedem Tastendruck
    this.attackHeld = false; // Maustaste nach einem Schlag in die Welt gehalten
    this.attackQueued = false; // Klick mitten im Schwung: gleich noch einmal
    this.perkCalm = 0; // wie lange es schon ruhig ist (für die Perk-Wahl)
    this.homeWarned = -99;
    this.useLockUntil = 0; // kurz nach einem Dialog öffnet E nichts Neues (m12-r1)
    this.useHeldInLock = false; // E in der Sperre gedrückt – noch gehalten, gilt es danach als Druck
    this.homeMark = { night: 0, level: 0 }; // welche Warnschwelle des Zuhauses schon kam (m12-r1)
    this.heartT = 0; // Herzschlag bei wenig Leben
    this.dizzy = false; // Gedanke »mir wird schwindelig« schon gekommen?
    this.frameWaiters = [];
    this._tmp = new THREE.Vector3();
    this.intro = { t: 0, duration: 1.9 };
    this.tour = null; // Kamerafahrt der Einleitung (M15)
    this.introRunning = false; // Einleitung läuft: keine Anzeigen außer dem Dialog
    this.forestPush = 0; // wie lange Mika schon gegen den Wald läuft (M15)
  }

  init() {
    const sceneCanvas = document.getElementById('scene');
    const uiCanvas = document.getElementById('ui');
    this.settings = loadSettings();
    this.pixel = new PixelRenderer(sceneCanvas, CONFIG.render);
    this.pixel.scaleShift = PIXEL_SIZES[this.settings.pixel];
    // Ansicht draußen (M13): weit (80 px/m, Standard) oder nah (160 px/m, Taste Z); ?zoom erzwingt sie
    this.view = CONFIG.view || this.settings.view;
    this.sound = new Sound(volumesOf(this.settings));
    // Alles, was in Szenenpixeln gemessen ist, wächst mit der Pixeldichte mit
    const density = CONFIG.render.pxPerMeter / 40;
    sharedUniforms.uCutRadius.value.multiplyScalar(density);
    sharedUniforms.uPointScale.value = density;
    this.ui = new UICanvas(uiCanvas);
    this.input = new Input(uiCanvas, (x, y) => this.pixel.clientToGame(x, y));
    this.input.onGesture = () => this.sound.unlock(); // Klang erst nach der ersten echten Eingabe
    this.events = new Events();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0b18);
    // Erst den Spielstand lesen: Das Wegenetz entsteht aus seinem Startwert (Meilenstein 9).
    // Ohne Spielstand bekommt das neue Spiel gleich einen frischen.
    this.saves = new SaveStore({ disabled: CONFIG.noSave, config: CONFIG });
    const loaded = this.saves.load();
    const mapSeed = loaded.state?.world.mapSeed ?? CONFIG.world.mapSeed ?? randomMapSeed();
    this.worldFromSave = loaded.status === 'ok'; // gehört die Karte zu einem Spielstand?
    this.world = new World({ scene: this.scene, seed: CONFIG.world.seed, mapSeed, renderConfig: CONFIG.render });
    this.world.crows.onCaw = (x, z) => this.sound.play('kraehe', { x, z }); // Krähen fliegen krächzend auf (M12)
    this.effects = new Effects(this.world.particles);
    this.player = new Player({ world: this.world, config: CONFIG.player });
    this.scene.add(this.player.object);
    this.world.attachPlayerLantern(this.player.character.lantern.glow);

    this.rig = new CameraRig(CONFIG.render, CONFIG.camera);
    this.rig.bounds = LAYOUT.cameraBounds;
    this.rig.limits = TERRAIN_AREA;
    this.viewInside = null; // drinnen: eigenes Bild im doppelten Maßstab (M11); null = noch nicht gesetzt
    this.passage = null; // gerade durch die Haustür unterwegs
    this.ride = null; // gerade auf der Reifenschaukel

    this.hud = new Hud(this);
    this.dialog = new DialogBox(this);
    this.dialog.speed = TEXT_SPEEDS[this.settings.text];
    this.menu = new Menu(this);
    this.builder = new Builder(this);
    this.gathering = new Gathering(this);
    this.buildbar = new BuildBar(this);
    this.crafting = new CraftingMenu(this);
    this.report = new ReportPanel(this);
    this.perkChoice = new PerkChoice(this);
    this.mapView = new MapView(this);
    this.title = new TitleScreen(this);
    const rng = new Rng(CONFIG.world.seed + 99);
    this.horde = new Horde({ scene: this.scene, world: this.world, rng }, {
      onKill: (z, source, lucky) => this.onZombieKilled(z, source, lucky),
      onHouseHit: (dmg, z) => this.onHouseHit(dmg, z),
      onPlayerHit: (dmg, z) => this.combat.hurt(dmg, z),
      onBarricadeHit: (b, dmg, z) => this.onBarricadeHit(b, dmg, z),
      onDamage: (z, amount, source) => {
        if (source === 'spieler') this.hud.damageNumber(z.x, 1.7 * z.def.scale, z.z, amount);
      },
    });
    this.towers = new TowerSystem(
      { scene: this.scene, world: this.world, horde: this.horde, effects: this.effects },
      {
        onShot: (kind, x, z) => this.sound.play(kind, { x, z, volume: kind === 'sprenger' ? 0.6 : 1 }),
        onImpact: (x, z) => this.sound.play('platsch', { x, z }),
      }
    );
    this.loot = new Loot(this.scene, rng);
    this.nights = new Nights(this);
    this.combat = new Combat(this);
    this.survivors = new Survivors(this);
    this.trader = new Trader(this);
    this.furnishing = new Furnishing(this);
    this.portraits = renderPortraits();

    this.state = loaded.state || createNewState(CONFIG, this.world.mapSeed);
    this.isNewGame = loaded.status !== 'ok';
    if (CONFIG.startMinute !== null) this.state.time.minute = CONFIG.startMinute;
    if (CONFIG.spawn === 'inside') {
      const w = this.world.interior.wakeSpot;
      Object.assign(this.state.player, { x: w.x, z: w.z, facing: w.facing });
    }

    this.resize();
    this.applyState();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.quietSave();
      this.sound.pause(document.visibilityState === 'hidden');
    });
    window.addEventListener('pagehide', () => this.quietSave());

    if (loaded.status === 'corrupt') this.hud.toast(T.meldungen.defekt, null, 6);
    if (loaded.status === 'ok') this.hud.toast(T.meldungen.willkommen, 'haus');
    // Alter Spielstand auf der neuen Karte: einmal erklären, was passiert ist
    if (loaded.status === 'ok' && this.state.flags.umgezogen) {
      delete this.state.flags.umgezogen;
      this.hud.toast(T.meldungen.umgezogen, 'haus', 9);
    }
    // Einführung auch nach einem Neuladen mitten im Intro noch einmal zeigen
    const introOpen = this.isNewGame || !this.state.flags.introGesehen;
    if (introOpen && !CONFIG.skipIntro) this.pendingIntro = true;
    else if (introOpen) this.hud.showHint(T.meldungen.hinweisStart, 14);
    if (CONFIG.test) this.intro.t = this.intro.duration;
    // Neues Spiel nach dem Neuladen (frische Karte): gleich mit Name und Aussehen los
    const fresh = takeFreshStart();
    if (fresh && !this.worldFromSave) {
      this.startNewFromTitle(fresh.name, fresh.look);
    } else if (CONFIG.showTitle) {
      // Titelbild (Meilenstein 7): das Intro kommt erst, wenn man losspielt
      this.titleIntro = this.pendingIntro;
      this.pendingIntro = false;
      this.mode = 'title';
      this.title.open(loaded.status === 'ok');
      // Ohne Spielstand wird erst gespeichert, wenn wirklich ein Spiel beginnt:
      // Sonst legte schon das Verlassen der Seite in der Figurwahl einen leeren
      // Stand an, und das Titelbild böte »Weiterspielen« als Mika an (m7-r1)
      this.holdSave = loaded.status !== 'ok';
    }

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
    // Im Trefferstopp bleiben Tastendrücke liegen (sonst verpufft ein Druck genau dann)
    if (!this.frozenFrame) this.input.endFrame();
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
    if (st.world.relocate) this.relocateOldBuildings();
    else this.world.buildings.load(st.world.buildings);
    st.world.buildings = this.world.buildings.toState();
    this.world.setTowerStage(st.world.tower, BEACON.glow);
    this.world.weather.snap(st.time.day);
    this.world.crows.settle(hoursOf(st.time.minute), this.player.position); // Krähen sitzen schon (M12)
    this.furnishing.apply();
    this.survivors.apply();
    this.trader.apply();
    this.world.resources.apply(st.world, st.time.day);
    const axe = this.world.props.axe;
    axe.object.visible = !st.tools.axt;
    // Solange die Axt dort steckt, geht der Hackklotz anderen Einblendungen vor; danach
    // ist er nur noch zum Anschauen und drängt sich nicht vor die Werkbank (m5-r1)
    Object.assign(axe.interaction, st.tools.axt ? { prompt: 'ansehen', action: null, dialog: 'hackklotz', priority: false, radius: 0.9 } : { prompt: 'axtNehmen', action: 'takeAxe', dialog: null, priority: true, radius: 1.5 });
    this.world.refreshInteractions();

    const p = st.player;
    this.player.place(p.x, p.z, p.facing);
    this.pushPlayerOut();
    this.player.holdingLantern = p.lantern;
    this.player.lanternLit = p.lantern;
    this.rig.jumpTo(this.player.position.x, this.player.position.z);
    this.updateHeldItem(false);
    this.horde.load(st.horde);
    this.loot.load(st.loot, absoluteMinute(st.time));
    this.towers.clear();
    this.nights.reset();
    this.nights.load(st.hordeQueue);
    this.nights.ensurePlans(); // Nachtleiste sofort, auch wenn gleich die Perk-Wahl offen ist
    this.perkCalm = 0;
    st.player.hp = Math.min(Math.max(1, st.player.hp), this.combat.maxHp);
    this.updateGoals(true);
    this.applyLook();
    if (st.report) this.showReport();
  }

  /**
   * Alter Spielstand auf der neuen Karte (Meilenstein 9, Migration v7 → v8):
   * Werkbank, Beete, Bänke, Laternen und Zelte bekommen in der Bucht einen
   * neuen Platz nahe einem passenden Ort; wo keiner frei ist, gibt es das
   * Material zurück. Türme und Barrikaden hat die Migration schon erstattet.
   */
  relocateOldBuildings() {
    const st = this.state;
    const buildings = this.world.buildings;
    const anchors = { werkbank: [-1.5, -4], beet: [-4.5, -8.5], bank: [-1.5, 1.5], laternenpfahl: [2.5, -3.5], zelt: [-2, 8.5] };
    const old = Array.isArray(st.world.buildings) ? st.world.buildings : [];
    buildings.load([]);
    const refund = {};
    for (const e of old) {
      const def = BUILDINGS[e.type];
      if (!def || def.tower || def.defense) continue;
      const [ax, az] = anchors[e.type] || [0, 7];
      const turns = e.turns || 0;
      let spot = null;
      for (let r = 0; r <= 12 && !spot; r++) {
        for (let dj = -r; dj <= r && !spot; dj++) {
          for (let di = -r; di <= r && !spot; di++) {
            if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
            const i = Math.floor(ax) + di;
            const j = Math.floor(az) + dj;
            if (buildings.check(e.type, i, j, turns).ok) spot = { i, j };
          }
        }
      }
      if (spot) {
        const b = buildings.place(e.type, spot.i, spot.j, turns, e.id, e);
        if (e.day) b.day = e.day;
      } else {
        gain(refund, def.cost);
      }
    }
    gain(st.inventory, refund);
    st.world.relocate = false;
  }

  /** Bewegliches (Horde, Loot, Haltbarkeit) in den Zustand übernehmen. */
  snapshot() {
    const st = this.state;
    st.horde = this.horde.toState();
    st.hordeQueue = this.nights.toState();
    st.loot = this.loot.toState();
    st.world.buildings = this.world.buildings.toState();
  }

  /** Kampf in der Nähe: ein Schlurfer bis PERK_NEAR, ein Schwung oder eine Rolle. */
  inFight() {
    if (this.player.action) return true;
    const p = this.player.position;
    return this.horde.list.some((z) => z.state !== 'dying' && (z.x - p.x) ** 2 + (z.z - p.z) ** 2 < PERK_NEAR * PERK_NEAR);
  }

  quietSave() {
    if (!this.ready || this.holdSave) return;
    this.snapshot();
    this.saves.save(this.state);
  }

  newGame() {
    this.saves.clear();
    this.state = createNewState(CONFIG, this.world.mapSeed);
    this.worldFromSave = true;
    this.isNewGame = true;
    this.applyState();
    this.menu.close();
    this.mode = 'play';
    this.intro.t = 0;
    this.pendingIntro = true;
  }

  /** Wohin das aktuelle Ziel zeigt, wenn es einen festen Ort hat (m5-r1: die Axt fand keiner). */
  goalTarget() {
    const st = this.state;
    const id = this.goal?.id;
    if (id === 'haendler') return this.trader.target();
    if (id === 'axt' && !st.tools.axt) {
      const cb = LAYOUT.choppingBlock;
      return { x: cb.x, y: 1.0, z: cb.z };
    }
    // Werkbank oder Spitzhacke, aber zu wenig Stein: zu den nächsten Kieseln (m12-r1)
    if (this.stoneNeeded() > (st.inventory.stein || 0)) {
      const p = this.player.position;
      let best = null;
      let bestD = Infinity;
      for (const node of this.world.resources.nodes) {
        if (node.kind !== 'kiesel' || node.depleted) continue;
        const d = Math.hypot(node.x - p.x, node.z - p.z);
        if (d < bestD) {
          bestD = d;
          best = { x: node.x, y: 0.6, z: node.z };
        }
      }
      if (best) return best;
    }
    // Erster Turm, aber zu wenig Schrott: zur nächsten Schrottstelle, die heute noch nicht durchsucht ist
    if (id === 'turm' && (st.inventory.schrott || 0) < BUILDINGS.bolzen.cost.schrott) {
      const p = this.player.position;
      let best = null;
      let bestD = Infinity;
      const consider = (key, x, z) => {
        if (this.gathering.searchEmpty(key)) return;
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < bestD) {
          bestD = d;
          best = { x, y: 1.0, z };
        }
      };
      consider('wrack', LAYOUT.wreck.x, LAYOUT.wreck.z);
      for (const node of this.world.resources.byId.values()) if (node.rules.search && !node.depleted) consider(node.id, node.x, node.z);
      return best;
    }
    return null;
  }

  /** Figur an eine Stelle im Haus (Aufwachen, Rettung, Ohnmacht): gleich mit der Kamera von drinnen. */
  placeInside(w) {
    Object.assign(this.state.player, { x: w.x, z: w.z, facing: w.facing });
    this.player.place(w.x, w.z, w.facing);
    this.applyView(true);
  }

  /**
   * Kamera für drinnen (eigenes Bild im doppelten Maßstab) oder draußen (M11).
   * Wird jedes Bild geprüft – so passt die Sicht auch nach Laden und Teleport.
   */
  applyView(inside) {
    this.viewInside = inside;
    const r = CONFIG.render;
    const ppm = inside ? r.interiorPxPerMeter : this.view === 'weit' ? r.pxPerMeter : r.nearPxPerMeter;
    this.rig.setPxPerMeter(ppm);
    sharedUniforms.uPointScale.value = ppm / 40;
    sharedUniforms.uCutRadius.value.set(26, 40).multiplyScalar(ppm / 40); // Durchsicht wächst mit dem Maßstab
    this.updateViewBounds();
    const p = this.player.position;
    this.rig.jumpTo(p.x, p.z);
  }

  /** Grenzen der Kamera: draußen die Karte, drinnen der Innenraum (möglichst ganz im Bild). */
  updateViewBounds() {
    const rig = this.rig;
    if (!this.viewInside) {
      rig.bounds = LAYOUT.cameraBounds;
      rig.limits = TERRAIN_AREA;
      return;
    }
    const inner = this.world.interior;
    const b = inner.bounds;
    const half = (rig.rtHeight * rig.px) / 2;
    const s = rig.sin;
    const c = rig.cos;
    // Blickpunkt am Boden (z): oben die Rückwand samt Oberkante, unten die Vorderkante
    const zMax = (half - c * inner.wallTop + s * b.minZ) / s;
    const zMin = (s * b.maxZ - half) / s;
    const lo = Math.min(zMin, zMax);
    const hi = Math.max(zMin, zMax);
    const mid = (zMin + zMax) / 2;
    rig.bounds = zMin <= zMax ? { minX: b.minX, maxX: b.maxX, minZ: mid, maxZ: mid } : { minX: b.minX, maxX: b.maxX, minZ: lo, maxZ: hi };
    rig.limits = { x0: b.minX - 0.25, x1: b.maxX + 0.25 };
  }

  // --- Durch die Haustür (M11) ------------------------------------------------------

  /** Hinein oder hinaus: kurz abblenden, dann auf der anderen Seite weiter. */
  startPassage(to) {
    this.builder.cancel();
    this.passage = { to, t: 0, done: false };
    this.sound.play('tuer');
  }

  updatePassage(dt) {
    const ps = this.passage;
    ps.t += dt;
    if (!ps.done && ps.t >= PASSAGE_TIME / 2) {
      ps.done = true;
      const spot = ps.to === 'innen' ? this.world.interior.entry : this.world.outsideDoorSpot();
      this.player.place(spot.x, spot.z, spot.facing);
      this.pushPlayerOut();
      this.applyView(ps.to === 'innen');
    }
    if (ps.t >= PASSAGE_TIME) this.passage = null;
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
    // Ein laufender Auftrag der Überlebenden geht vor (Meilenstein 6)
    const errand = this.survivors?.errandGoal();
    if (errand) {
      if (this.goal?.id !== errand.id) this.goal = errand;
      else this.goal.progress = errand.progress;
      return;
    }
    if (current?.id !== this.goal?.id) this.goal = current ? { id: current.id, text: T.ziele[current.id] } : null;
    if (this.goal) {
      const p = current.progress ? current.progress(this) : null;
      this.goal.progress = p ? `(${Math.min(p[0], p[1])}/${p[1]})` : null;
      // Fehlt Stein für Werkbank oder Spitzhacke, zeigt das Ziel zu den Kieseln (m12-r1)
      const need = this.stoneNeeded();
      const stone = this.state.inventory.stein || 0;
      this.goal.text = need > stone ? T.ziele.kiesel : T.ziele[current.id];
      if (need > stone) this.goal.progress = `(${stone}/${need})`;
    }
  }

  /** Der Satz zum Wetter eines Tages (M12). */
  weatherLine(day) {
    const lines = T.wetter.bericht[this.world.weather.forecast(day)];
    return lines[day % lines.length];
  }

  /** Wie viel Stein braucht das aktuelle Ziel (Werkbank, Spitzhacke)? */
  stoneNeeded() {
    const id = this.goal?.id;
    if (id === 'werkbank') return BUILDINGS.werkbank.cost.stein || 0;
    if (id === 'spitzhacke') return RECIPES.find((r) => r.id === 'spitzhacke').cost.stein || 0;
    return 0;
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
      if (source) this.suppressed = { id: source, until: this.clock + 0.5 }; // Durchdrücken öffnet nicht gleich wieder (m3-r2), ein bewusstes zweites E schon (m6-r1: 0,8 s wirkte wie ein verschluckter Druck)
      this.useLockUntil = this.clock + 0.3; // und auch nichts anderes daneben (m12-r1: E-Durchdrücken öffnete den Hackklotz)
      this.useHeldInLock = false;
      if (FLAG_AFTER_DIALOG[id]) this.state.flags[FLAG_AFTER_DIALOG[id]] = true;
      if (aktion === 'schlafen') this.startSleep();
      else if (aktion === 'suppe') this.cookSoup();
      else if (REST_TARGET[aktion]) this.startRest(REST_TARGET[aktion]);
      if (onDone) onDone(aktion);
    });
  }

  interact(it) {
    this.lastInteraction = it.id;
    if (it.action === 'sleep') this.requestSleep();
    else if (it.action === 'takeAxe') this.takeAxe();
    else if (it.action === 'enterHouse') this.startPassage('innen');
    else if (it.action === 'swing') this.startSwing();
    else if (it.use === 'werkbank') this.openCrafting();
    else if (it.use === 'bank') this.useBench();
    else if (it.use === 'ernten') this.harvest(it.building);
    else if (it.select) this.builder.select(it.select);
    else if (it.trader) this.trader.talk();
    else if (it.npc) this.survivors.talk(it.npc);
    else if (this.gathering.interact(it)) return;
    else if (it.thought) this.hud.say(T.geschichte[it.thought], 5); // M15: Gedanke statt Dialog
    else if (it.dialog) this.startDialog(it.dialog);
  }

  /** Auf die Reifenschaukel: ein paar Schwünge, Mika steht auf dem Reifen (m12-r1). */
  startSwing() {
    if (this.ride || !this.world.props.swing) return;
    this.ride = { t: 0 };
    this.player.action = null;
    this.player.express('froh', SWING.duration);
    this.hud.say(T.schaukel.los, 2.4);
  }

  updateRide(dt, input) {
    const r = this.ride;
    const sw = this.world.props.swing;
    // Woanders hingesetzt (Ohnmacht, Neuladen, Prüfung): Die Schaukel lässt sie los
    const pp = this.player.position;
    if (r.last && Math.hypot(pp.x - r.last.x, pp.z - r.last.z) > 0.8) {
      sw.pivot.rotation.z = 0;
      this.player.riding = null;
      this.ride = null;
      return;
    }
    r.t += dt;
    // Loslaufen (nach dem ersten Schwung) oder ausgeschaukelt: absteigen
    const m = input.moveVector();
    if (r.t >= SWING.duration || (r.t > 0.6 && Math.hypot(m.x, m.z) > 0.1)) {
      this.endRide();
      return;
    }
    const swell = Math.min(1, r.t / 0.9) * Math.min(1, (SWING.duration - r.t) / 1.2);
    const angle = Math.sin((r.t / SWING.period) * Math.PI * 2) * SWING.amp * swell;
    sw.pivot.rotation.z = angle;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const pv = sw.pivot.position;
    this.player.ride(dt, pv.x + sw.seat.x * c - sw.seat.y * s, pv.y + sw.seat.x * s + sw.seat.y * c, pv.z + sw.seat.z, angle);
    r.last = r.last || { x: 0, z: 0 };
    r.last.x = pp.x;
    r.last.z = pp.z;
  }

  endRide() {
    const sw = this.world.props.swing;
    sw.pivot.rotation.z = 0;
    this.player.riding = null;
    this.player.place(sw.stand.x, sw.stand.z, 0);
    this.ride = null;
    this.hud.say(T.schaukel.danach, 3.2);
  }

  /** Küche (M11): einmal am Tag Suppe – volle Lebenspunkte und mehr davon bis zum Morgen. */
  cookSoup() {
    const st = this.state;
    if (st.player.soup === st.time.day) {
      this.hud.toast(T.meldungen.suppeSchon, null, 2.6);
      return;
    }
    if (!pay(st.inventory, SOUP.cost)) {
      this.hud.toast(T.meldungen.zuTeuer, null, 2.4);
      return;
    }
    st.player.soup = st.time.day;
    st.player.hp = this.combat.maxHp;
    this.sound.play('aufwertung');
    this.hud.toast(T.meldungen.suppe(SOUP.maxHp), 'herz', 3.2);
    this.quietSave();
  }

  takeAxe() {
    const st = this.state;
    if (st.tools.axt) return;
    st.tools.axt = true;
    const axe = this.world.props.axe;
    axe.object.visible = false;
    Object.assign(axe.interaction, { prompt: 'ansehen', action: null, dialog: 'hackklotz', priority: false, radius: 0.9 });
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
      this.hud.toast(T.meldungen.geerntet, BUILDINGS[b.type].icon, 2.2);
      return;
    }
    const c = this.world.buildings.bounds(b);
    this.player.startAction('search', {
      duration: 0.8,
      progress: true,
      face: c,
      onCancel: () => this.hud.toast(T.meldungen.abgebrochen, null, 2.2),
      onDone: () => {
        b.day = day;
        this.state.world.buildings = this.world.buildings.toState();
        this.effects.chips(c.x, 0.3, c.z, b.type === 'holzlager' ? 'holz' : 'gras', 8);
        this.gathering.give(BUILDINGS[b.type].harvest, c.x, 0.9, c.z);
      },
    });
  }

  /** Loot ist bei Mika angekommen. */
  collectLoot(res, x, y, z) {
    const st = this.state;
    st.inventory[res] = (st.inventory[res] || 0) + 1;
    if (this.nights.active || (st.night.n === st.time.day && !st.report)) st.night.loot[res] = (st.night.loot[res] || 0) + 1;
    // Nach »Nacht geschafft« Aufgesammeltes zählt noch zur Nacht (m3-r1: Bericht zählte zu wenig)
    else if (st.report && st.report.n === st.night.n && st.night.n === st.time.day) st.report.loot[res] = (st.report.loot[res] || 0) + 1;
    this.hud.floater(x, y + 0.6, z, '+1', res, 0, true);
    this.player.express('froh', 0.6);
    this.sound.play('loot', { pitch: LOOT_PITCH[res] || 880 });
    if (res === 'teile' && !st.flags.fundTeile) {
      st.flags.fundTeile = true;
      this.hud.toast(T.meldungen.ersteTeile, res, 4);
    }
    if (res === 'zahnraeder' && !st.flags.fundZahnrad) {
      st.flags.fundZahnrad = true;
      this.hud.toast(T.meldungen.ersterFund(T.ressourcen.zahnraeder), res, 3);
    }
    if (res === 'moderkerne' && !st.flags.fundModerkern) {
      st.flags.fundModerkern = true;
      this.hud.toast(T.meldungen.ersterFund(T.ressourcen.moderkerne), res, 3);
    }
  }

  /** @param {'werkbank'|'haendler'} [source] Werkbank oder Balduins Handel am Boot */
  openCrafting(source = 'werkbank') {
    this.builder.cancel();
    this.mode = 'craft';
    this.crafting.open(source);
  }

  closeCrafting() {
    const shop = this.crafting.shop;
    this.crafting.close();
    this.mode = 'play';
    if (shop) this.trader.closed(); // M9.1: nach dem Handel sagt Balduin Tschüss und legt ab
  }

  craft(recipe) {
    const st = this.state;
    if (recipe.owned) {
      this.hud.toast(recipe.ownedText || T.werkbank.vorhanden, recipe.icon, 1.8);
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
    if (recipe.gives.weapon) {
      st.weapons[recipe.gives.weapon] = 1;
      this.addToHotbar(recipe.gives.weapon);
    }
    if (recipe.gives.inventory) gain(st.inventory, recipe.gives.inventory);
    const gives = recipe.gives.inventory ? Object.entries(recipe.gives.inventory)[0] : null;
    if (recipe.gives.part) {
      // Besonderes Turmteil von Balduin (M10): kommt in den Vorrat, eingebaut wird über die Turm-Auswahl
      const id = recipe.gives.part;
      st.towerParts[id] = (st.towerParts[id] || 0) + 1;
      this.trader.sold(recipe);
      this.hud.toast(T.turmteile.gekauft(T.turmteile[id][0]), id, 3.2);
      if (!st.flags.turmteilHinweis) {
        st.flags.turmteilHinweis = true;
        this.hud.showHint(T.turmteile.hinweis, 9);
      }
      this.sound.play('aufwertung');
      this.quietSave();
      return true;
    }
    if (recipe.trade) {
      // Balduins Handel (Meilenstein 8, seit M9 am Boot)
      this.trader.sold(recipe);
      this.hud.toast(T.ueberlebende.getauscht(T.menge(gives[1], gives[0])), recipe.icon, 2);
      this.sound.play('loot', { pitch: LOOT_PITCH[gives[0]] || 880 });
      this.updateGoals();
      this.quietSave();
      return true;
    }
    if (gives) this.hud.toast(T.meldungen.verwertet(T.menge(gives[1], gives[0])), recipe.icon, 2);
    else if (recipe.gives.weapon) this.hud.toast(T.meldungen.waffeGebaut(T.rezepte[recipe.id], ITEMS[recipe.gives.weapon]?.plural), recipe.icon, 2.6);
    else this.hud.toast(T.meldungen.hergestellt(T.rezepte[recipe.id]), recipe.icon, 2);
    if (recipe.gives.weapon && !st.flags.ersteWaffe) {
      st.flags.ersteWaffe = true;
      this.hud.showHint(T.meldungen.ausweichen, 8);
    }
    this.sound.play(gives ? 'aufheben' : 'aufwertung');
    this.quietSave();
    return true;
  }

  /** E vor einem Waldbaum ohne Band oder vor Gestrüpp: kurze Absage statt Stille. */
  tellAboutForestTree(p) {
    if (this.clock < this.treeHintUntil) return;
    const fx = Math.sin(this.player.facing);
    const fz = Math.cos(this.player.facing);
    for (const c of this.world.colliders.near(p.x, p.z, 1.9)) {
      if (c.tag !== 'waldbaum' && c.tag !== 'busch') continue;
      const dx = c.x - p.x;
      const dz = c.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 1.9 && (dx * fx + dz * fz) / d > 0.4) {
        this.treeHintUntil = this.clock + 3;
        this.hud.say(c.tag === 'busch' ? T.meldungen.gestruepp : T.meldungen.waldbaum, 3);
        return;
      }
    }
  }

  /**
   * Läuft Mika gegen den Wald (M15), denkt sie einmal am Tag laut darüber nach,
   * warum dort niemand durchkommt – nicht am Wasser, nicht drinnen und nicht,
   * solange die Horde unterwegs ist. Es zählt nur echtes Dagegenlaufen, nicht
   * das Entlangstreifen am Waldsaum.
   */
  checkForestEdge(dt, move) {
    const st = this.state;
    const len = Math.hypot(move.x, move.z);
    if (len < 0.5 || this.viewInside || this.hud.speech || this.nights.active || st.flags.waldrandTag === st.time.day) {
      this.forestPush = 0;
      return;
    }
    const m = this.world.map;
    const p = this.player.position;
    const ax = p.x + (move.x / len) * 0.7;
    const az = p.z + (move.z / len) * 0.7;
    const forest = m.edgeDistance(p.x, p.z) > -0.5 && m.edgeDistance(ax, az) > 0.1 && !m.isWater(ax, az) && !m.onIsland(ax, az) && !m.inBay(ax, az);
    const stuck = Math.hypot(this.player.velocity.x, this.player.velocity.z) < 1.2;
    this.forestPush = forest && stuck ? this.forestPush + dt : 0;
    if (this.forestPush < 0.6) return;
    this.forestPush = 0;
    st.flags.waldrandTag = st.time.day;
    const lines = T.geschichte.waldrand;
    this.hud.say(lines[(st.time.day - 1) % lines.length], 5);
  }

  /** Bank: Hinsetzen heilt Mika (alle 30 s); nachts ohne Dialog, das hält nicht auf. */
  useBench() {
    const st = this.state;
    const hurt = st.player.hp < this.combat.maxHp - 0.5;
    if (hurt && this.clock >= this.benchReady) {
      st.player.hp = this.combat.maxHp;
      this.benchReady = this.clock + 30;
      this.hud.toast(T.meldungen.verschnauft, 'herz', 2.2);
    } else if (hurt) {
      this.hud.say(T.meldungen.ausserPuste, 2.5);
    }
    if (!this.nights.active) this.startDialog('bank');
    else if (!hurt) this.hud.say(T.meldungen.keineZeit, 2.5);
  }

  requestSleep() {
    // Erst schlafen, wenn die Nacht dieses Tages vorbei ist (DESIGN.md 5)
    if (!this.nights.canSleep()) this.startDialog('bettHorde');
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
    const timing = s.kind === 'sleep' || s.kind === 'lost' || s.kind === 'faint' ? SLEEP : REST;
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
      } else if (s.kind === 'lost') {
        this.applyLoss();
        this.advanceToMorning();
      } else if (s.kind === 'faint') {
        this.applyFaint();
      } else if (s.kind === 'rescue') {
        this.applyRescue();
      } else {
        this.advanceToMorning();
      }
    }
    if (s.t >= timing.fadeOut + timing.black + timing.fadeIn) {
      this.sleep = null;
      this.mode = 'play';
      if (s.kind === 'sleep' || s.kind === 'lost' || s.kind === 'faint') {
        // Aufwachen: ein Gedanke statt eines Dialogs – man kann sofort loslaufen.
        this.suppressed = { id: 'bett', until: Infinity };
        if (s.kind !== 'faint') this.hud.say(DIALOGE.morgen(this.state)[0].t, 4.5);
        if (this.state.report) this.showReport();
      } else if (s.kind === 'work' && s.onDone) {
        s.onDone();
      } else if (s.kind === 'rescue') {
        this.hud.toast(T.horde.gerettet, 'haus', 3.5);
      }
    }
  }

  /** Neuer Tag: Uhr auf den Morgen, Figur neben das Bett, speichern. */
  advanceToMorning() {
    const st = this.state;
    st.time.day += 1;
    st.time.minute = CONFIG.time.wakeMinute;
    st.stats.nightsSlept += 1;
    st.player.hp = this.combat.maxHp; // ausgeschlafen
    this.horde.list = this.horde.list.filter((z) => z.state !== 'dying');
    const w = this.world.interior.wakeSpot;
    Object.assign(st.player, { x: w.x, z: w.z, facing: w.facing });
    this.onNewDay();
    // Was die Überlebenden und ein gemütliches Zuhause am Morgen bringen (Meilenstein 6)
    this.world.weather.snap(st.time.day); // neues Wetter gleich beim Aufwachen (M12)
    this.world.crows.settle(hoursOf(st.time.minute), w); // und die Krähen sitzen wieder auf ihren Pfosten
    const extra = [{ text: this.weatherLine(st.time.day) }, ...this.survivors.morning(), ...this.furnishing.morning(), ...this.trader.morning()];
    if (st.report) st.report.extra = extra;
    else for (const line of extra) this.hud.toast(line.text, null, 4);
    this.placeInside(w);
    const ok = this.saves.save(st);
    const message = ok ? T.meldungen.gespeichert : this.saves.disabled ? T.meldungen.speichernAus : T.meldungen.speichernFehler;
    this.hud.toast(message, 'haus', 4.5);
  }

  /** Alles, was ein neuer Tag mit sich bringt (Nachwachsen …). */
  onNewDay() {
    this.world.resources.apply(this.state.world, this.state.time.day);
    this.survivors.arrive(true);
    this.events.emit('newDay', this.state.time.day);
  }

  showReport() {
    const st = this.state;
    if (!st.report) return;
    st.report.lootLeft = this.loot.items.filter((it) => !it.flying).length; // liegt noch was draußen?
    // Nach der Nacht schon geflickt? Dann zeigt der Bericht den Stand jetzt (m3-r2)
    if (!st.report.fell) st.report.homeNow = Math.round(st.world.homeHp);
    this.report.open(st.report);
    this.mode = 'report';
    this.sound.play('morgen');
  }

  // --- Horde: Treffer, Tod, Loot, verlorene Nacht --------------------------------

  /** @param {boolean} [lucky] ein Turm mit Glücksmünze hat getroffen (M10: sicher Teile) */
  onZombieKilled(z, source, lucky = false) {
    const st = this.state;
    st.stats.kills = (st.stats.kills || 0) + 1;
    if (this.nights.active) st.night.kills += 1;
    const factor = z.lootFactor * (1 + this.towers.luckAt(z.x, z.z));
    // Zombieteile (M9.1): selbst erschlagen – sicher welche; durch Türme nur mit Glück
    const melee = source === 'spieler';
    const table = { ...z.def.loot };
    if (!melee && !lucky && !z.def.partsAlways && table.teile && !this.loot.rng.chance(this.partsFromTowers ?? PARTS_FROM_TOWERS)) delete table.teile;
    const dropped = this.loot.drop(z.x, z.z, table, factor);
    if (melee && table.teile && !(dropped.teile > 0)) this.loot.spawn('teile', z.x, z.z);
    // Perk »Glückspilz«: manchmal ein Stück Schrott mehr
    if (this.world.particles.rng.next() < perkValue(st, 'glueckspilz')) this.loot.drop(z.x, z.z, { schrott: [1, 1] }, 1);
    this.effects.splat(z.x, 0.6, z.z, 'moos', 12, 0.9);
    this.sound.play('tod', { x: z.x, z: z.z });
    // Erfahrung: im Nahkampf doppelt, Tagesschlurfer halb
    this.combat.gainXp(z.def.xp * (source === 'spieler' ? 2 : 1) * (z.day ? 0.5 : 1));
  }

  onHouseHit(dmg, z) {
    const st = this.state;
    dmg *= HOUSE_DAMAGE;
    this.sound.play('zuhause', { x: z.x, z: z.z, volume: 0.7 });
    const max = HOUSE_LEVELS[st.world.houseLevel].hp;
    // Tagsüber bricht nichts durch: Streuner nagen langsam und bringen das
    // Zuhause höchstens auf drei Viertel (m3-r1: die Vorhut fraß es sonst am
    // Abend auf; m5-r1: bis zur Hälfte war zu viel – Theo verlor so jede Nacht)
    const day = !this.nights.active;
    if (day) {
      const floor = Math.round(max * DAY_FLOOR);
      if (st.world.homeHp <= floor) return;
      dmg = Math.min(dmg * (z.day ? 0.3 : 1), st.world.homeHp - floor);
      const de = st.world.dayEvents;
      if (de && de.day === st.time.day) de.lost = (de.lost || 0) + dmg;
    }
    st.world.homeHp = Math.max(0, st.world.homeHp - dmg); // nie unter null (m6-r1: »-3/300«)
    this.hud.homeFlash = 0.3;
    this.hud.homeAlarm = 4;
    const p = this.world.pathing.attackPoint(z.x, z.z);
    this.effects.chips(p.x, 0.8, p.z, 'holz', 4);
    // Nachts öfter warnen, drinnen auch als Gedanke (m12-r1: das Zuhause fiel unbemerkt)
    if (this.clock - this.homeWarned > (day ? 25 : 12)) {
      this.homeWarned = this.clock;
      // Welche Seite? Groß und mit Richtung – sonst merkt man es am Feuer nicht
      const r = this.world.pathing.home;
      const side = z.z < r.minZ ? 'nord' : z.z > r.maxZ ? 'sued' : z.x > r.maxX ? 'ost' : 'west';
      this.hud.toast(T.horde.zuhauseTreffer(T.horde.seite[side]), 'warnung', 3);
      if (day) this.hud.showBanner(T.horde.zuhauseKurz);
      if (this.viewInside) this.hud.say(T.horde.drinnenHaemmern, 3);
    }
    // Die Hälfte, ein Viertel: groß im Bild, einmal je Nacht und Schwelle
    if (!day) {
      const q = st.world.homeHp / max;
      const mark = q < 0.25 ? 2 : q < 0.5 ? 1 : 0;
      if (this.homeMark.night !== st.night.n) Object.assign(this.homeMark, { night: st.night.n, level: 0 });
      if (mark > this.homeMark.level) {
        this.homeMark.level = mark;
        this.hud.showBanner(mark === 2 ? T.horde.zuhauseKnapp : T.horde.zuhauseHalb);
        this.sound.play('zuhause', { volume: 1 });
      }
    }
    if (st.world.homeHp <= 0 && this.nights.active) this.loseNight();
  }

  /** Ein Schlurfer schlägt auf eine Barrikade ein (Metall fängt einen Teil ab). */
  onBarricadeHit(b, dmg, z) {
    if (b.broken) return;
    const block = barricadeLevel(b.level).block || 0;
    b.hp -= dmg * (z?.def.smash || 1) * (1 - block);
    const c = this.world.buildings.bounds(b);
    this.effects.chips(c.x, 0.6, c.z, b.level >= 3 ? 'schrott' : 'holz', 5);
    if (b.hp > 0) {
      this.world.buildings.refreshLook(b);
      return;
    }
    this.world.buildings.breakBarricade(b);
    this.effects.dust(c.x, c.z, 1.2);
    this.sound.play('abriss', { x: c.x, z: c.z });
    this.hud.toast(T.horde.barrikadeWeg, 'barrikade', 2.4);
    if (this.nights.active) this.state.night.broken = (this.state.night.broken || 0) + 1;
  }

  /** Mika geht zu Boden: nachts verliert man die Nacht, tagsüber nur Zeit. */
  /**
   * Mika geht zu Boden. Tagsüber: Ohnmacht, zwei Stunden später im Bett. Nachts:
   * Sie rettet sich ins Haus – die Nacht geht weiter, verloren ist sie erst,
   * wenn das Zuhause fällt (OFFENE-FRAGEN.md Nr. 11).
   */
  knockedOut() {
    if (this.mode === 'sleep') return;
    // Dr. Yusuf verarztet Mika einmal je Nacht, bevor sie ins Haus flüchten muss
    if (this.nights.active && this.survivors.rescue()) return;
    this.builder.cancel();
    this.mode = 'sleep';
    this.sleep = { t: 0, advanced: false, kind: this.nights.active ? 'rescue' : 'faint' };
  }

  /** Nachts gerettet: im Haus, angeschlagen, die Schlurfer verlieren sie aus den Augen. */
  applyRescue() {
    const st = this.state;
    this.placeInside(this.world.interior.wakeSpot);
    st.player.hp = Math.round(this.combat.maxHp * 0.4);
    for (const z of this.horde.list) if (z.state === 'chase') this.horde.endChase(z);
  }

  loseNight() {
    if (this.mode === 'sleep' && this.sleep?.kind === 'lost') return;
    this.builder.cancel();
    this.dialog.active = false;
    this.crafting.close();
    this.menu.close();
    this.mode = 'sleep';
    this.sleep = { t: 0, advanced: false, kind: 'lost' };
  }

  /** Folgen einer verlorenen Nacht (OFFENE-FRAGEN.md Nr. 4). Nie Spielende. */
  applyLoss() {
    const st = this.state;
    const losses = {};
    for (const res of RESOURCES) {
      if (RARE_RESOURCES.includes(res) || res === 'zahnraeder') continue;
      // Das Lager (M11) schützt die Hälfte
      const share = (res === 'schrott' || res === 'teile' ? 0.25 : 0.1) * houseLossFactor(st.world.houseLevel);
      const n = Math.floor((st.inventory[res] || 0) * share);
      if (n > 0) {
        st.inventory[res] -= n;
        losses[res] = n;
      }
    }
    // Bauten nehmen ein Drittel Schaden; der Bericht sagt, was es getroffen hat (m3-r2)
    const damaged = { towers: 0, barricades: 0 };
    for (const b of this.world.buildings.list) {
      const def = BUILDINGS[b.type];
      if (!def.hp || b.broken) continue;
      const max = maxHpOf(b);
      // Türme nie unter ein Drittel: Sie schießen auch nach einer Pechsträhne weiter
      const floor = def.tower ? max * TOWER_LOSS_FLOOR : 0;
      b.hp = Math.max(Math.min(b.hp, floor), b.hp - max / 3);
      if (def.tower) damaged.towers += 1;
      else {
        damaged.barricades += 1;
        if (b.hp <= 0) this.world.buildings.breakBarricade(b);
        else this.world.buildings.refreshLook(b);
      }
    }
    // Notdürftig geflickt: ein Viertel – aber nie besser als zu Beginn der Nacht
    const max = HOUSE_LEVELS[st.world.houseLevel].hp;
    st.world.homeHp = Math.max(1, Math.min(Math.round(max * 0.25), st.night.homeStart));
    st.night.fell = true;
    this.horde.clear();
    this.towers.clear(); // Überreste bleiben liegen (M9): Morgens sieht man die Folgen
    st.night.losses = losses;
    st.night.damaged = damaged;
    this.nights.finishNight(false);
  }

  /** Ohnmacht am Tag: zwei Stunden später im Bett, ohne Verluste. */
  applyFaint() {
    const st = this.state;
    st.time.minute = Math.min(st.time.minute + 120, DAY_MINUTES - 1);
    this.placeInside(this.world.interior.wakeSpot);
    st.player.hp = this.combat.maxHp * 0.5;
    this.horde.list = this.horde.list.filter((z) => !z.day);
  }

  openMenu() {
    this.mode = 'menu';
    this.menu.open();
  }

  closeMenu() {
    this.menu.close();
    if (this.menu.fromTitle) {
      this.menu.fromTitle = false;
      this.mode = 'title';
      return;
    }
    this.mode = this.dialog.active ? 'dialog' : 'play';
  }

  // --- Titelbild (Meilenstein 7) ------------------------------------------------------

  /** Kamera auf dem Titelbild: langsam über die Bucht; bei der Figur neben Mika. */
  titleFocus(dt) {
    const f = this._titleFocus || (this._titleFocus = new THREE.Vector3());
    this.titleT = (this.titleT || 0) + dt;
    // Steht Mika im Spielstand drinnen, zeigt das Titelbild sie vor der Haustür
    const p = this.world.isInside(this.player.position.x, this.player.position.z) ? this.world.outsideDoorSpot() : this.player.position;
    if (this.title.screen === 'figur') f.set(p.x + 3.2, 0, p.z - 0.4); // Mika links neben der Tafel
    else f.set(6.5 + Math.sin(this.titleT * 0.07) * 3, 0, -2.5 + Math.sin(this.titleT * 0.05) * 1.0); // Haus, Steg und See
    return f;
  }

  /**
   * Blickpunkt der Einleitung (M15): Schon beim Einblenden steht die Kamera am
   * Waldrand; danach zeigt jede Zeile mit `blick` auf ihren Ort. Drinnen gibt
   * es keine Fahrt (eigenes Bild mit eigenen Grenzen).
   */
  introLook() {
    if (this.viewInside) return null;
    if (this.pendingIntro && this.mode === 'play') return 'wald';
    return this.mode === 'dialog' && this.dialog.active ? this.dialog.line?.blick || null : null;
  }

  /**
   * Die Kamera gleitet weich an- und auslaufend zum Blickpunkt – je weiter,
   * desto länger (höchstens gut drei Sekunden). Vor dem Intro springt sie.
   */
  tourFocus(dt, key) {
    const tour = this.tour || (this.tour = { key: null, from: new THREE.Vector3(), to: new THREE.Vector3(), point: new THREE.Vector3(), t: 0, time: 1 });
    const spot = key === 'mika' ? this.player.position : null;
    if (tour.key !== key) {
      const at = spot || this.world.lookSpot(key);
      tour.from.set(this.rig.focus.x, 0, this.rig.focus.z - (CONFIG.camera.focusOffsetZ || 0));
      tour.to.set(at.x, 0, at.z);
      tour.key = key;
      tour.t = 0;
      tour.time = Math.min(TOUR.maxTime, TOUR.minTime + tour.from.distanceTo(tour.to) / TOUR.metersPerSecond);
      if (this.pendingIntro) {
        tour.t = tour.time;
        this.rig.jumpTo(at.x, at.z);
      }
    }
    if (spot) tour.to.set(spot.x, 0, spot.z);
    tour.t = Math.min(tour.time, tour.t + dt);
    const u = tour.t / tour.time;
    return tour.point.lerpVectors(tour.from, tour.to, u * u * (3 - 2 * u));
  }

  /** Aussehen auf dem Titelbild ausprobieren (noch nicht im Spielstand). */
  previewLook(look) {
    this.player.setLook(lookSpec(MIKA, look));
  }

  /** Name und Aussehen aus dem Spielstand anwenden (Figur, Porträt, Texte). */
  applyLook() {
    const pl = this.state.player;
    const key = JSON.stringify(pl.look);
    setPlayerName(pl.name);
    if (key === this.appliedLook) return;
    this.appliedLook = key;
    const spec = lookSpec(MIKA, pl.look);
    this.player.setLook(spec);
    this.portraits.mika = mikaPortrait(spec);
  }

  openMenuFromTitle(screen) {
    this.menu.open();
    this.menu.fromTitle = true;
    this.menu.go(screen);
    this.mode = 'menu';
  }

  /** Weiterspielen: Einblenden, dann (falls noch nicht gesehen) das Intro. */
  startFromTitle() {
    this.title.close();
    this.mode = 'play';
    // Ungelesener Morgenbericht (Neuladen bei offenem Bericht): jetzt wieder zeigen (m12-r1: er klebte im Bild)
    if (this.state.report) this.showReport();
    this.intro.t = 0;
    this.pendingIntro = Boolean(this.titleIntro);
    this.appliedLook = null; // falls auf dem Titelbild herumprobiert wurde
    this.applyLook();
  }

  /** Pausenmenü »Neues Spiel« (bestätigt): zur Figur auf dem Titelbild, sonst gleich los. */
  newGameFromMenu() {
    if (!CONFIG.showTitle) {
      this.newGame();
      return;
    }
    this.menu.close();
    this.menu.fromTitle = false;
    this.mode = 'title';
    this.title.open(true);
    this.title.go('figur');
  }

  /** Neues Spiel mit Name und Aussehen. */
  startNewFromTitle(name, look) {
    // Die Karte gehört noch zum alten Spielstand: einmal neu laden, dann entsteht
    // ein neues Wegenetz und es geht gleich mit diesem Namen weiter
    if (this.worldFromSave && !CONFIG.test && !CONFIG.playtest && stashFreshStart({ name, look })) {
      this.saves.clear();
      this.holdSave = true;
      location.reload();
      return;
    }
    this.title.close();
    this.holdSave = false;
    this.newGame();
    Object.assign(this.state.player, { name, look });
    this.appliedLook = null;
    this.applyLook();
    this.quietSave();
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
    this.frozenFrame = this.hitstop > 0;
    if (this.frozenFrame) {
      // Trefferstopp: ein, zwei Bilder lang steht alles still
      this.hitstop -= dt;
      this.hud.update(dt);
      return;
    }
    if (this.intro.t < this.intro.duration) {
      this.intro.t += dt;
      if (this.pendingIntro && this.intro.t > this.intro.duration * 0.7 && this.mode === 'play') {
        this.pendingIntro = false;
        this.introRunning = true; // M15: Kamerafahrt, nur Bild und Dialog
        this.startDialog('intro', () => {
          this.introRunning = false;
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
        // Esc schließt den Dialog wie die harmlose Antwort (m3-r2: nicht das Menü darüber)
        if (input.pressed('menu')) this.dialog.finish(null);
        else this.dialog.update(dt, input);
        this.player.idle(dt);
        break;
      case 'menu':
        this.menu.update(input, dt);
        this.player.idle(dt);
        break;
      case 'title':
        this.title.update(input, dt);
        this.player.idle(dt);
        break;
      case 'craft':
        this.crafting.update(input, dt);
        this.player.idle(dt);
        break;
      case 'report':
        if (this.report.update(dt, input)) {
          // Erst jetzt gelesen: Neuladen bei offenem Bericht zeigt ihn wieder
          this.state.report = null;
          this.mode = 'play';
        }
        this.player.idle(dt);
        break;
      case 'perk': {
        const chosen = this.perkChoice.update(input, dt);
        if (chosen && this.combat.choosePerk(chosen)) {
          this.perkChoice.close();
          this.mode = 'play';
          this.hud.toast(T.perks.gewaehlt(T.perks[chosen][0]), PERKS[chosen].icon, 2.4);
          this.sound.play('glocke');
          this.quietSave();
        }
        this.player.idle(dt);
        break;
      }
      case 'sleep':
        this.updateSleep(dt);
        this.player.idle(dt);
        break;
      case 'karte':
        if (this.mapView.update(input, dt)) this.mode = 'play';
        this.player.idle(dt);
        break;
      default:
        break;
    }

    const titled = this.mode === 'title' || (this.mode === 'menu' && this.menu.fromTitle);
    const hours = titled ? TITLE_HOURS : hoursOf(this.state.time.minute);
    this.world.update(dt, { hours, focus: this.rig.focus, player: this.player, day: this.state.time.day });
    this.world.crows.update(this.mode === 'play' ? dt : 0, { hours, player: this.player, zombies: this.horde.list, inside: Boolean(this.viewInside) });
    this.updateMood();
    this.updateHeartbeat(this.mode === 'play' ? dt : 0);
    this.trader.update(this.mode === 'play' ? dt : 0);
    this.survivors.update(this.mode === 'play' ? dt : dt * 0.5);
    this.updateSound(dt);
    const radius = upgradeValue(this.state, 'radius') * perkValue(this.state, 'sammler');
    this.loot.update(this.mode === 'play' ? dt : 0, this.player.position, radius, (res, x, y, z) => this.collectLoot(res, x, y, z), absoluteMinute(this.state.time));
    // Drinnen ist ein eigenes Bild (M11): Kamera umstellen, sobald Mika drinnen oder draußen ist
    const inside = !titled && this.world.isInside(this.player.position.x, this.player.position.z);
    if (this.viewInside === null || inside !== this.viewInside) this.applyView(inside);
    const look = titled ? null : this.introLook();
    if (titled) this.rig.update(dt, this.titleFocus(dt), ZERO);
    else if (look) this.rig.update(dt, this.tourFocus(dt, look), ZERO, TOUR.sharpness);
    else {
      this.tour = null;
      this.rig.update(dt, this.player.position, this.player.velocity);
    }
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
    // Übersichtskarte (Meilenstein 9): Das Spiel steht still, solange sie offen ist
    if (input.pressed('map')) {
      this.builder.cancel();
      this.mapView.open();
      this.mode = 'karte';
      return;
    }
    // Ansicht nah/weit (M13): draußen jederzeit, drinnen gilt immer der Maßstab des Innenraums
    if (input.pressed('zoom') && !this.viewInside) {
      const next = this.view === 'weit' ? 'nah' : 'weit';
      this.applySettings({ view: next });
      this.hud.toast(T.meldungen.ansicht[next], null, 2.2);
    }

    const slot = input.slotPressed();
    if (slot >= 0) this.selectSlot(slot);
    if (!this.builder.placement) {
      const wheel = input.consumeWheel();
      if (wheel) this.selectSlot((this.state.hotbar.selected + wheel + HOTBAR_SIZE) % HOTBAR_SIZE);
    }
    if (input.pressed('lantern')) this.toggleLantern();

    this.player.speedFactor = upgradeValue(this.state, 'tempo') * this.furnishing.speedFactor();
    if (input.pressed('dodge')) {
      const m = input.moveVector();
      this.combat.roll(m.x, m.z);
    }
    if (this.passage) {
      this.updatePassage(dt);
      this.player.idle(dt);
    } else if (this.ride) {
      this.updateRide(dt, input);
    } else {
      this.player.update(dt, this.world.doorAssist(this.player.position, input.moveVector()), input.isDown('run'));
      const through = this.world.passageAt(this.player.position.x, this.player.position.z);
      if (through) this.startPassage(through);
      else this.checkForestEdge(dt, input.moveVector());
    }
    const p = this.player.position;
    const sp = this.state.player;
    sp.x = p.x;
    sp.z = p.z;
    sp.facing = this.player.facing;

    const pointerFree = !this.buildbar.contains(ui) && !this.hud.containsHotbar(ui);
    const rest = this.builder.update(dt, input, pointerFree);
    if (this.mode !== 'play') return;
    // Übrig gebliebener Klick in die Welt: zuschlagen – auf den Schlurfer unter
    // dem Zeiger, sonst in Richtung Mauszeiger. Gedrückt halten schlägt weiter;
    // ein Klick mitten im Schwung wird vorgemerkt.
    if (rest === 'click') this.attackHeld = true;
    else if (!input.mouse.down) this.attackHeld = false;
    const wantsAttack = rest === 'click' || (this.attackHeld && input.mouse.down) || this.attackQueued;
    if (wantsAttack && !this.builder.placement) {
      const act = this.player.action;
      if (!act && !this.player.swingReady) {
        if (rest === 'click') this.attackQueued = true; // Takt der Waffe: gleich danach
      } else if (!act) {
        this.attackQueued = false;
        const ground = this.pointerGround(this._ground || (this._ground = new THREE.Vector3()));
        const pp = this.player.position;
        const target = this.builder.pointerZombie;
        if (target) this.combat.attack(target.x - pp.x, target.z - pp.z);
        else if (ground && this.input.mouse.inside) this.combat.attack(ground.x - pp.x, ground.z - pp.z);
        else this.combat.attack(Math.sin(this.player.facing), Math.cos(this.player.facing));
      } else if (rest === 'click' && act.kind === 'swing') this.attackQueued = true;
    }
    // Neue Stufe: Perk-Wahl öffnen (das Spiel hält an) – nicht mitten im
    // Getümmel, sonst wählt ein Schlag- oder Ausweich-Druck ungesehen eine Karte
    // Nachts erst, wenn keine Welle mehr unterwegs ist (m12-r1: die Wahl ging mitten in Welle 3 auf)
    if (this.state.perkChoice && !this.perkChoice.isOpen) {
      const busy = this.inFight() || (this.nights.active && this.horde.alive > 0);
      this.perkCalm = busy ? 0 : this.perkCalm + dt;
      if (this.perkCalm >= PERK_CALM) {
        this.perkCalm = 0;
        this.perkChoice.open(this.state.perkChoice, this.state.player.level);
        this.mode = 'perk';
        return;
      }
    }

    // Die Welt lebt: Horde, Türme, Nacht
    this.nights.update(dt);
    if (this.mode !== 'play') return;
    const inside = this.world.playerInside;
    this.horde.update(dt, {
      player: { x: p.x, z: p.z, inside, alive: this.state.player.hp > 0 },
      lightSlow: (x, z) => Math.max(this.towers.lightSlow(x, z), this.survivors.beaconSlow(x, z)),
    });
    this.towers.update(dt);
    this.combat.update(dt);
    if (this.mode !== 'play') return;

    // Kurz nach einem Dialog nimmt E nichts Neues an (Durchdrücken). Wer E über die
    // Sperre hinaus gedrückt hält, meint es: Dann zählt es als Druck (Baum fällen).
    let usePress = input.pressed('use');
    if (this.clock < this.useLockUntil) {
      if (usePress) this.useHeldInLock = true;
      usePress = false;
    } else if (this.useHeldInLock) {
      this.useHeldInLock = false;
      if (input.isDown('use')) usePress = true;
    }

    // Beim Platzieren setzt E den Bau – dann keine Interaktion.
    let it = null;
    if (!this.builder.placement && !this.player.busy && !this.passage && !this.ride) {
      // Etwas Spielraum: Wo die Einblendung steht, wirkt auch E (und umgekehrt)
      it = this.world.findInteraction(p.x, p.z, this.player.facing, 0.4);
      // Gesperrt bis zum Weggehen (Bett nach dem Aufwachen) oder kurz nach einem Dialog
      const sup = this.suppressed;
      if (sup) {
        const near = this.world.interactions.some((i) => i.id === sup.id && Math.hypot(i.x - p.x, i.z - p.z) <= i.radius);
        if (!near || this.clock > sup.until) this.suppressed = null;
        else if (it && it.id === sup.id) it = null;
      }
    }
    // Kurz über die Reichweite hinausgerutscht? E trifft trotzdem, was eben noch angezeigt war.
    if (!it && usePress && !this.builder.placement && !this.player.busy) {
      it = this.world.findInteraction(p.x, p.z, this.player.facing, 0.55);
      if (it && this.suppressed && it.id === this.suppressed.id) it = null;
    }
    if (!it && usePress && !this.builder.placement && !this.player.busy) this.tellAboutForestTree(p);
    this.currentInteraction = it;
    if (it && usePress) {
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
      this.hud.toast(this.weatherLine(time.day), null, 4); // M12
      this.onNewDay();
      // Wach geblieben: Der Morgenbericht kommt trotzdem (m12-r1: er kam nur nach dem Schlafen)
      if (this.state.report && this.mode === 'play') this.showReport();
    }
    const h = hoursOf(time.minute);
    const flags = this.state.flags;
    const before = hoursOf(time.minute - dt / CONFIG.time.secondsPerGameMinute);
    if (before < 20 && h >= 20 && h < 20.5) this.hud.toast(T.horde.bald, 'warnung', 4);
    if (!flags.abendHorde && h >= 19 && h < 20.5 && !this.world.buildings.towers.length) {
      flags.abendHorde = true;
      this.startDialog('abendHorde');
    } else if (!flags.abendHinweis && h >= 20.1 && h < 23 && !this.player.holdingLantern) {
      // Gedanken statt Dialog: halten das Spiel nie an (m3-r1)
      flags.abendHinweis = true;
      this.hud.say(T.meldungen.abendLaterne, 5);
    } else if (!flags.spaetHinweis && (h >= 23.5 || h < 4) && !this.nights.active && this.horde.alive === 0 && this.clock - this.nights.finishedAt > 8) {
      flags.spaetHinweis = true;
      this.hud.say(T.meldungen.spaet, 4);
    } else if (!flags.ruheHinweis && h >= 12.5 && h < 16.5 && this.horde.alive === 0) {
      // Langer Nachmittag: einmal daran erinnern, dass man die Zeit vorspulen kann (m3-r2)
      flags.ruheHinweis = true;
      this.hud.say(T.meldungen.ruheHinweis, 6);
    }
  }

  /** Durchsicht-Loch rund um die Spielfigur für Objekte davor. */
  updateCutout() {
    const p = this.player.position;
    const proj = this.rig.project(this._tmp.set(p.x, p.y + 0.85, p.z));
    sharedUniforms.uCutCenter.value.set(proj.x, proj.y);
    sharedUniforms.uCutDepth.value = proj.depth;
    sharedUniforms.uCutStrength.value = this.viewInside ? 0 : 1; // drinnen verdeckt nichts die Figur
  }

  /**
   * Grundstimmung in Mikas Gesicht (M12): müde beim Schlafen und spät in der
   * Nacht, besorgt mit wenig Leben, entschlossen mit Schlurfern in der Nähe,
   * froh im Gespräch und am Werkbank- oder Handelsfenster.
   */
  updateMood() {
    const st = this.state;
    const h = hoursOf(st.time.minute);
    const p = this.player.position;
    let near = false;
    for (const z of this.horde.list) {
      if (z.state !== 'dying' && z.state !== 'enter' && (z.x - p.x) ** 2 + (z.z - p.z) ** 2 < 25) {
        near = true;
        break;
      }
    }
    let mood = 'normal';
    if (this.mode === 'sleep') mood = 'muede';
    else if (st.player.hp < this.combat.maxHp * 0.35) mood = 'besorgt';
    else if (near && !this.viewInside) mood = 'entschlossen';
    else if (this.mode === 'dialog' || this.mode === 'craft') mood = 'froh';
    else if (h >= 23 || h < 5) mood = 'muede';
    this.player.mood = mood;
  }

  /** Wenig Leben (m12-r1): das Herz schlägt hörbar, schneller, je knapper es wird; einmal ein Gedanke. */
  updateHeartbeat(dt) {
    const st = this.state;
    const q = st.player.hp / this.combat.maxHp;
    if (q >= LOW_HP || q <= 0) {
      if (q > 0.5) this.dizzy = false;
      return;
    }
    this.heartT -= dt;
    if (this.heartT <= 0) {
      this.heartT = 0.55 + 1.6 * (q / LOW_HP);
      this.sound.play('herzschlag');
    }
    if (!this.dizzy && dt > 0) {
      this.dizzy = true;
      this.hud.say(T.horde.schwindelig, 3.5);
    }
  }

  /** Umgebung, Musik und Schritte (jedes Bild). */
  updateSound(dt) {
    const inside = this.viewInside;
    const p = inside ? this.world.shelter.door.center : this.player.position;
    const fire = inside ? this.world.interior.lights.kamin : LAYOUT.campfire;
    const me = this.player.position;
    let near = 0;
    let atHome = 0;
    let smash = 0;
    for (const z of this.horde.list) {
      if (z.state === 'dying') continue;
      if (!inside && (z.x - p.x) ** 2 + (z.z - p.z) ** 2 < 64) near++;
      if (z.state === 'approach' || z.state === 'attack' || z.state === 'chase') atHome++;
      else if (z.state === 'smash') smash++;
    }
    const info = this._soundInfo || (this._soundInfo = {});
    info.x = p.x;
    info.z = p.z;
    info.hours = hoursOf(this.state.time.minute);
    info.inside = this.world.playerInside;
    info.fireDist = Math.hypot(fire.x - me.x, fire.z - me.z);
    info.fight = this.nights.active && (this.horde.alive > 0 || this.nights.queue.length > 0);
    info.zombiesNear = near;
    info.quiet = this.mode === 'sleep';
    info.title = this.mode === 'title' || (this.mode === 'menu' && this.menu.fromTitle);
    info.rain = this.world.weather.rain; // Wetter (M12): Regen trommelt, Wind weht stärker
    info.wind = this.world.weather.mix.wind;
    // Stufe der Nachtmusik (M10d): 2 = am Haus oder hinter Mika her, 1 = viele unterwegs oder an Barrikaden
    info.threat = atHome > 0 || near >= 3 ? 2 : smash > 0 || near > 0 || this.horde.alive >= 8 ? 1 : 0;
    this.sound.update(dt, info);
    // Schritte: bei jedem halben Laufzyklus, drinnen auf Holz
    const stepIndex = Math.floor(this.player.phase / Math.PI);
    if (stepIndex !== this.lastStep) {
      this.lastStep = stepIndex;
      if (this.mode === 'play' && this.player.moveAmount > 0.25) this.sound.play(this.world.playerInside ? 'schrittHolz' : 'schritt', { volume: 0.55 + 0.3 * Math.min(1, this.player.moveAmount) });
    }
  }

  /** Einstellungen übernehmen und merken (Menü). */
  applySettings(changes) {
    Object.assign(this.settings, changes);
    saveSettings(this.settings);
    if (changes.view && changes.view !== this.view) {
      this.view = changes.view;
      if (!this.viewInside) this.applyView(false);
    }
    this.sound.setVolumes(volumesOf(this.settings));
    this.dialog.speed = TEXT_SPEEDS[this.settings.text];
    const shift = PIXEL_SIZES[this.settings.pixel];
    if (this.pixel.scaleShift !== shift) {
      this.pixel.scaleShift = shift;
      this.pixel.width = 0; // neues Maß erzwingen
      this.resize();
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    if (this.pixel.resize(window.innerWidth, window.innerHeight, dpr)) {
      this.rig.setViewport(this.pixel.rtWidth, this.pixel.rtHeight);
      this.updateViewBounds();
      this.rig.place();
      this.ui.resize(this.pixel.uiWidth, this.pixel.uiHeight, this.pixel.uiScale, dpr);
    }
  }

  // --- Zeichnen ------------------------------------------------------------------

  /** Weltpunkt -> Oberflächenpixel (Ursprung oben links; die Oberfläche ist gröber als die Szene). */
  worldToUi(x, y, z) {
    const p = this.rig.project(this._tmp.set(x, y, z));
    const k = this.pixel.uiToScene;
    return { x: (p.x - 1) / k, y: (this.pixel.height - p.y) / k };
  }

  /** Boden unter dem Mauszeiger (oder null, wenn die Maus nicht im Fenster ist). */
  pointerGround(out = new THREE.Vector3()) {
    const m = this.input.mouse;
    if (!m.inside) return null;
    const k = this.pixel.uiToScene;
    return this.rig.unproject((m.x + 0.5) * k + 1, this.pixel.height - (m.y + 0.5) * k, 0, out);
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
      if (node.depleted) return T.aktionen.waechst(this.world.resources.daysLeft(node));
      if (node.rules.tool && !st.tools[node.rules.tool]) return T.aktionen.brauchtWerkzeug(T.gegenstaende[node.rules.tool]);
      if (node.rules.search && this.gathering.searchEmpty(node.id)) return T.aktionen.leerBald;
    }
    if (it.search && this.gathering.searchEmpty(it.id)) return it.id === 'wrack' ? T.aktionen.ausgeraeumt : T.aktionen.leerBald;
    if (it.use === 'ernten') {
      const b = this.world.buildings.get(it.building);
      if (b && b.day === st.time.day) return T.aktionen.heuteLeer;
    }
    return null;
  }

  /** Text der Einblendung. Sessel und Bank sagen tagsüber gleich, dass man dort ausruhen kann (m3-r2). */
  promptText(it) {
    if ((it.id === 'sessel' || it.use === 'bank') && !this.nights.active && canRest(this.state)) return T.aktionen.ausruhen;
    return T.aktionen[it.prompt];
  }

  render() {
    this.horde.render();
    this.towers.render();
    this.loot.render();
    sharedUniforms.uDitherOffset.value.copy(this.rig.ditherOffset);
    const dn = this.world.dayNight;
    this.pixel.render(this.scene, this.rig, this.viewInside ? dn.lookInside : dn.look);

    const ui = this.ui;
    ui.begin(this.input.mouse);
    const it = this.shownInteraction();
    if (it) {
      const ground = this.world.heightAt(it.x, it.z);
      const pos = this.worldToUi(it.x, ground + 1.3, it.z);
      const status = this.interactionStatus(it);
      this.hud.prompt = { text: status || this.promptText(it), dim: Boolean(status), x: pos.x, y: pos.y, target: this.worldToUi(it.x, ground, it.z) };
    } else {
      this.hud.prompt = null;
    }
    this.hud.debugLines = this.showDebug ? this.debugLines() : null;
    // Titelbild: nur Schriftzug und Knöpfe über der Lichtung (Menü darüber, wenn offen)
    if (this.mode === 'title' || (this.mode === 'menu' && this.menu.fromTitle)) {
      if (this.mode === 'title') this.title.draw(ui);
      this.menu.draw(ui);
      if (this.intro.t < this.intro.duration) ui.ditherFill(Math.min(1, (1 - this.intro.t / this.intro.duration) * 1.6));
      return;
    }
    const playing = this.mode === 'play';
    // Nieselregen (M12): pixelige Striche über dem Bild, unter den Tafeln
    const now = performance.now();
    const frame = Math.min(0.1, (now - (this._lastRain || now)) / 1000);
    this._lastRain = now;
    this.world.weather.drawRain(ui, frame, dn.night, this.viewInside);
    if (playing) this.builder.drawOverlay(ui);
    // Einleitung (M15): wie im Kino nur das Bild und Mikas Worte
    const cinematic = this.pendingIntro || this.introRunning;
    if (!cinematic) this.hud.draw(ui, { hotbar: playing || this.mode === 'craft', prompt: playing });
    if (playing) this.buildbar.draw(ui);
    this.crafting.draw(ui);
    if (this.mode === 'report') this.report.draw(ui);
    this.perkChoice.draw(ui);
    this.mapView.draw(ui);
    // Meldungen unter Werkbank, Perk-Wahl und Morgenbericht (m12-r1: »gespeichert« lag auf der Überschrift)
    const toastY = this.crafting.isOpen
      ? this.crafting.bottom(ui)
      : this.perkChoice.isOpen
        ? this.perkChoice.bottom(ui)
        : this.mode === 'report' && this.report.isOpen
          ? this.report.bottom(ui)
          : Math.max(64, (this.hud.bannerBottom || 0) + 4);
    if (!cinematic) this.hud.drawToasts(ui, toastY);
    // Zeilen mit `karte` zeigen die Karte der Wege über dem Dialog (M15)
    if (this.mode === 'dialog' && this.dialog.active && this.dialog.line?.karte) this.mapView.drawInset(ui, this.dialog.top(ui));
    this.dialog.draw(ui);
    this.menu.draw(ui);
    if (this.sleep) this.drawSleep(ui);
    if (this.passage) {
      // Durch die Haustür: kurz gerastert ab- und wieder aufblenden
      const k = this.passage.t / (PASSAGE_TIME / 2);
      ui.ditherFill(Math.max(0, Math.min(1, k < 1 ? k : 2 - k)), COLORS.night);
    }
    if (this.intro.t < this.intro.duration) this.drawIntro(ui);
    if (this.input.lostFocus) this.drawFocusHint(ui);
  }

  /** Die Seite ringsum hat den Tastaturfokus (M9.1): sagen, wie es weitergeht. */
  drawFocusHint(ui) {
    const text = T.meldungen.fokus;
    const w = measure(text) + 16;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round(ui.height * 0.3);
    ui.panel(x, y, w, 19, { frame: COLORS.gold });
    ui.text(text, x + 8, y + 3, COLORS.gold);
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
    const long = s.kind === 'sleep' || s.kind === 'lost' || s.kind === 'faint';
    const timing = long ? SLEEP : REST;
    const t = s.t;
    let fade;
    if (t < timing.fadeOut) fade = t / timing.fadeOut;
    else if (t < timing.fadeOut + timing.black) fade = 1;
    else fade = 1 - (t - timing.fadeOut - timing.black) / timing.fadeIn;
    ui.ditherFill(Math.max(0, Math.min(1, fade)), long ? COLORS.night : COLORS.inset);
    if (s.kind === 'lost' || s.kind === 'faint' || s.kind === 'rescue') {
      const text = s.kind === 'lost' ? (t < timing.fadeOut ? T.horde.verloren : T.horde.keller) : T.horde.ohnmacht;
      if (t < timing.fadeOut + timing.black) ui.textCentered(text, ui.width / 2, ui.height / 2 - 6, s.kind === 'lost' ? COLORS.buildBad : COLORS.textWarm, { outline: COLORS.outline });
    } else if (s.kind !== 'sleep') {
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
   * Die Einblendung (»E Fasern rupfen«) über dem, was Mika gerade benutzen kann.
   * Im Getümmel bleibt sie weg – dann zählen die Schlurfer (m3-r1), nachts
   * schon auf größere Entfernung (m3-r2); E wirkt trotzdem.
   */
  shownInteraction() {
    const it = this.currentInteraction;
    if (this.mode !== 'play' || !it) return null;
    const p = this.player.position;
    // Sammeln (»E Holz hacken«) tritt nachts schon weiter weg zurück (m4-r1)
    const near = this.nights.active ? (it.node ? 12 : 6) : 3.5;
    const close = this.horde.list.some((z) => z.state !== 'dying' && Math.hypot(z.x - p.x, z.z - p.z) < near);
    return close ? null : it;
  }

  /**
   * Nur lesen, was auch auf dem Bildschirm steht – für Testspieler, die
   * Screenshots nicht Pixel für Pixel entziffern sollen.
   */
  observe() {
    const st = this.state;
    const it = this.shownInteraction();
    const line = this.dialog.active ? this.dialog.line : null;
    const costText = (cost) =>
      Object.entries(cost || {})
        .filter(([, v]) => v > 0)
        .map(([res, v]) => T.menge(v, res))
        .join(', ');
    const L = this.mode === 'play' ? this.buildbar.layout(this.ui) : null;
    return {
      tag: st.time.day,
      uhrzeit: clockText(st.time.minute),
      modus: this.mode,
      ziel: this.goal ? this.goal.text : null,
      zielPfeil: this.hud.goalMark ? `${this.hud.goalMark.imBild ? 'goldener Pfeil im Bild' : 'goldener Pfeil am Rand'}, ${this.hud.goalMark.richtung}` : null,
      vorrat: Object.fromEntries(this.hud.visibleResources().map((r) => [r, st.inventory[r]])),
      laterne: this.player.holdingLantern ? 'an' : 'aus',
      schnellleiste: { gewaehlt: st.hotbar.selected + 1, plaetze: st.hotbar.slots.map((s) => s || '-') },
      hinweis: it ? this.interactionStatus(it) || this.promptText(it) : null,
      bauleiste: L
        ? {
            titel: L.title,
            optionen: L.tiles.map((t) => ({
              taste: t.key,
              name: t.option.name,
              preis: costText(t.option.cost),
              bezahlbar: Boolean(t.option.affordable && !t.option.disabled),
              ...(t.option.disabled ? { gesperrt: t.option.disabledText } : {}),
              ...(t.option.hint ? { hinweis: t.option.hint } : {}),
            })),
          }
        : null,
      platzieren: this.builder.placement
        ? { bau: this.builder.placement.name, passt: this.builder.placement.ok, grund: this.builder.placement.ok ? null : T.bauleiste.grund[this.builder.placement.reason] || null }
        : null,
      werkbank:
        this.mode === 'craft'
          ? this.crafting.recipes().map((r, i) => {
              const w = r.gives.weapon ? WEAPONS[r.gives.weapon] : null;
              const werte = w ? ` – ${T.werkbank.werte(w.damage, String(w.rate).replace('.', ','), String(w.reach).replace('.', ','), w.targets || 1)}` : '';
              return `${i === this.crafting.focus ? '> ' : ''}${r.name ?? T.rezepte[r.id]} (${r.owned ? r.ownedText ?? T.werkbank.vorhanden : costText(r.cost)})${werte}`;
            })
          : null,
      handelsfenster: this.mode === 'craft' && this.crafting.shop ? { titel: T.haendler.titel, spruch: this.trader.quote() } : null,
      dialog: line
        ? {
            sprecher: line.s,
            text: line.t.slice(0, Math.floor(this.dialog.shown)),
            fertigGetippt: this.dialog.complete,
            antworten: this.dialog.complete ? (line.antworten || []).map((a, i) => (i === this.dialog.choice ? `> ${a.t}` : a.t)) : [],
          }
        : null,
      menue: this.menu.isOpen ? this.menu.screen : null,
      titel: this.mode === 'title' ? { seite: this.title.screen, knoepfe: this.title.rows().map((r, i) => `${i === this.title.focus ? '> ' : ''}${r.label}`) } : null,
      leben: `${Math.round(st.player.hp)}/${this.combat.maxHp}`,
      zuhause: `${Math.round(st.world.homeHp)}/${HOUSE_LEVELS[st.world.houseLevel].hp}`,
      nacht: this.nights.active && this.nights.plan ? { nacht: st.night.n, welle: `${st.night.wave}/${this.nights.plan.waves.length}`, richtung: this.nights.directionText() } : null,
      schlurferImBild: this.horde.list.filter((z) => {
        if (z.state === 'dying') return false;
        const q = this.worldToUi(z.x, 0.8, z.z);
        return q.x >= 0 && q.x < this.ui.width && q.y >= 0 && q.y < this.ui.height;
      }).length,
      schlurferAusserhalb: this.hud.edgeCount || 0,
      // Die Zahl am Pfeil ist die Anzahl (m12-r1: Theo las sie als Entfernung)
      randMarken: (this.hud.edgeMarks || []).map((m) => `${m.art} ${m.richtung}${m.anzahl > 1 ? ` (${m.anzahl} Stück)` : ''}`),
      lootAmBoden: this.loot.items.length,
      // Mengen stehen im Bild als Symbole – für die Textansicht als Wörter (m7-r1: »Knopf hat etwas ausgebuddelt:« wirkte leer)
      bericht: this.report.isOpen
        ? this.report.lines().map((l) => {
            if (!l.res) return l.text;
            const parts = Object.entries(l.res).filter(([, n]) => n > 0).map(([r, n]) => T.menge(n, r));
            return `${l.text} ${parts.join(', ') || l.empty || ''}`.trim();
          })
        : null,
      banner: this.hud.banner ? this.hud.banner.text : null,
      meldungen: this.hud.toasts.map((t) => t.text),
      gedanke: this.hud.speech && this.hud.speech.time < this.hud.speech.duration ? this.hud.speech.text : null,
      stufe: st.player.level,
      erfahrung: `${Math.floor(st.player.xp)}/${xpForLevel(st.player.level)}`,
      inDerHand: T.gegenstaende[this.player.heldTool] || T.gegenstaende.leer,
      perkWartet: st.perkChoice && !this.perkChoice.isOpen ? T.perks.wartet : null,
      perkWahl: this.perkChoice.isOpen ? this.perkChoice.options.map((id, k) => `${k + 1}: ${T.perks[id][0]} – ${T.perks[id][1]}`) : null,
      perks: Object.entries(st.perks).map(([id, n]) => `${T.perks[id][0]} ${n}`),
      figur: { x: Number(this.player.position.x.toFixed(2)), z: Number(this.player.position.z.toFixed(2)), imHaus: this.world.playerInside },
      wetter: T.wetter.name[this.world.weather.kind], // M12
      // Meilenstein 6: wer ist im Bild, und wie gemütlich ist das Zuhause?
      ueberlebende: SURVIVOR_ORDER.filter((id) => {
        const n = this.survivors.npcs.list.get(id);
        if (!n || !n.model.root.visible) return false;
        const q = this.worldToUi(n.x, 1, n.z);
        return q.x >= 0 && q.x < this.ui.width && q.y >= 0 && q.y < this.ui.height;
      }).map((id) => SURVIVORS[id].name),
      haendler: this.trader.phase !== 'weg' ? { da: this.trader.phase, x: Number(this.trader.npc.x.toFixed(1)), z: Number(this.trader.npc.z.toFixed(1)) } : null,
      gemuetlichkeit: `${this.furnishing.cozy}/${MAX_COZY} (nur Möbel aus dem Reiter »Einrichten« zählen)`,
    };
  }

  // --- Test-Schnittstelle (nur mit ?test oder ?debug) --------------------------

  exposeTestApi() {
    const game = this;
    window.zomfy = {
      get ready() {
        return game.ready;
      },
      /** Das ganze Spiel (nur für Prüfung und Fehlersuche). */
      get game() {
        return game;
      },
      get frame() {
        return game.frame;
      },
      get mode() {
        return game.mode;
      },
      state: () => JSON.parse(JSON.stringify(game.state)),
      sound: () => ({ ready: game.sound.ready, state: game.sound.ctx?.state || null, voices: game.sound.voices, music: game.sound.music?.mode ?? null }),
      /** Ein Musikstück ohne Lautsprecher berechnen: Spitzen- und Mittelpegel (M10d). */
      renderMusic: async (id, seconds = 8, threat = 0) => {
        const r = await renderMusic(Sound, id, seconds, { threat });
        return { peak: r.peak, rms: r.rms, bad: r.bad };
      },
      save: () => game.quietSave(),
      /** Kamera (M15): Blickpunkt am Boden, laufende Fahrt der Einleitung, Zeile im Dialog. */
      camera: () => ({ x: game.rig.focus.x, z: game.rig.focus.z, look: game.tour?.key || null, line: game.dialog.active ? game.dialog.index : null }),
      lookSpot: (key) => game.world.lookSpot(key),
      wakeSpot: () => ({ ...game.world.interior.wakeSpot }),
      /** Krähen (M12): Zustand, Sitzplatz; wie oft sie krächzend aufgeflogen sind. */
      crows: () => ({ list: game.world.crows.info(), caws: game.world.crows.caws, perches: game.world.crows.perches.map((p) => ({ x: p.x, y: p.y, z: p.z, ground: Boolean(p.ground) })) }),
      settleCrows: () => game.world.crows.settle(hoursOf(game.state.time.minute), game.player.position),
      /** Wetter (M12): Art, Regenstärke, Windstärke; setWeather erzwingt eines (null = wie der Tag). */
      weather: () => ({ kind: game.world.weather.kind, rain: game.world.weather.rain, wind: game.world.weather.mix.wind, drops: game.world.weather.drops.length, fog: game.world.weather.fog.group.visible }),
      setWeather(kind, instant = true) {
        game.world.weather.forced = kind;
        if (instant) game.world.weather.snap(game.state.time.day);
      },
      /**
       * Detailgrad (M13g): kleinste Kantenlänge in der sichtbaren Geometrie je
       * Modellfamilie, als »Voxel je Meter« (32 = doppelt fein, 16 = fein).
       * Schatten-Stellvertreter zählen nicht; fehlt etwas im Bild, steht null da.
       */
      detail: () => {
        const step = (...objects) => {
          let best = Infinity;
          for (const obj of objects) {
            obj?.traverse((o) => {
              if (!o.isMesh || !o.geometry || o.layers.mask === 2) return;
              const p = o.geometry.attributes.position.array;
              const xs = new Set();
              for (let i = 0; i < Math.min(p.length, 60000); i += 3) xs.add(Math.round(p[i] * 1e5));
              const v = [...xs].sort((a, b) => a - b);
              for (let i = 1; i < v.length; i++) if (v[i] > v[i - 1]) best = Math.min(best, v[i] - v[i - 1]);
            });
          }
          return best === Infinity ? null : Math.round(1e5 / best);
        };
        const w = game.world;
        return {
          mika: step(game.player.character.root),
          haus: step(w.shelter.group),
          hof: step(w.props.group),
          quellen: step(w.resources.group),
          bauten: step(w.buildings.group),
          horde: step(game.horde.group),
          leute: step(game.survivors.npcs.group),
          kraehen: step(w.crows.group),
          beute: step(...Object.values(game.loot.meshes)),
          boot: step(game.trader.boat.root),
        };
      },
      /** Innenraum (M11): Eingang, Tür nach draußen, Grenzen, Räume; drinnen? */
      interior: () => {
        const i = game.world.interior;
        return { level: i.level, entry: { ...i.entry }, exit: { ...i.exit }, bounds: { ...i.bounds }, rooms: i.rooms.map((r) => ({ ...r })), inside: game.viewInside, zoom: Math.round(1 / game.rig.px), outsideDoor: game.world.outsideDoorSpot() };
      },
      /** Prüfhilfe: Figur an (x, z) setzen und n Schritte in Richtung (dx, dz) laufen lassen, ohne zu zeichnen. */
      probeMove(x, z, dx, dz, n = 10) {
        if (game.world.colliders.blocks(x, z, CONFIG.player.radius)) return null;
        game.player.place(x, z, 0);
        for (let k = 0; k < n; k++) game.player.update(1 / 30, { x: dx, z: dz }, false);
        const p = game.player.position;
        return Math.hypot(p.x - x, p.z - z);
      },
      /** Wie probeMove, gibt aber die Endstelle zurück (oder null, wenn der Start belegt ist). */
      probeWalk(x, z, dx, dz, n = 10) {
        if (game.world.colliders.blocks(x, z, CONFIG.player.radius)) return null;
        game.player.place(x, z, 0);
        for (let k = 0; k < n; k++) game.player.update(1 / 30, { x: dx, z: dz }, false);
        const p = game.player.position;
        return { x: p.x, z: p.z };
      },
      setHouseLevel(level) {
        game.state.world.houseLevel = level;
        game.world.setHouseLevel(level);
      },
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
      /** Passt ein Bau hierher? (ohne ihn zu setzen) – mit Grund, z. B. »stand« */
      placeCheck(type, i, j, turns = 0) {
        const c = game.world.buildings.check(type, i, j, turns);
        return { ok: c.ok, reason: c.reason || null, why: c.why || null };
      },
      buildings: () => game.world.buildings.toState(),
      spawnZombie(type, x, z) {
        const zo = game.horde.spawn(type, { x, z });
        zo.state = 'walk';
        return zo.id;
      },
      zombies: () => game.horde.list.map((z) => ({ id: z.id, type: z.type, x: z.x, z: z.z, hp: z.hp, state: z.state, stun: z.stunT })),
      killAllZombies() {
        for (const z of [...game.horde.list]) if (z.state !== 'dying') game.horde.kill(z, 'test');
      },
      /** Einen Schlurfer erledigen, als hätte ihn `source` getroffen ('turm', 'spieler' …). */
      killZombie(id, source = 'test') {
        const z = game.horde.list.find((q) => q.id === id);
        if (z && z.state !== 'dying') game.horde.kill(z, source);
      },
      /** Chance auf Zombieteile bei Turm-Abschüssen (null = Wert aus zombies.js). */
      setPartsChance(p) {
        game.partsFromTowers = p;
      },
      lootItems: () => game.loot.items.map((l) => ({ res: l.res, x: l.x, z: l.z })),
      setHomeHp(v) {
        game.state.world.homeHp = v;
      },
      towerDebug: () => game.world.buildings.towers.map((t) => ({ id: t.id, cool: t.cool, angle: t.headAngle, hp: t.hp, proj: game.towers.projectiles.length })),
      /** Horde an/aus (nur für ruhige Prüf-Bilder); aus räumt auch die Lichtung. */
      setHorde(on) {
        game.nights.enabled = on;
        if (!on) game.horde.clear();
      },
      setDay(n) {
        game.state.time.day = n;
      },
      /** Erfahrung geben (wie besiegte Schlurfer). */
      giveXp: (n) => game.combat.gainXp(n),
      choosePerk(id) {
        const ok = game.combat.choosePerk(id);
        if (ok && game.mode === 'perk') {
          game.perkChoice.close();
          game.mode = 'play';
        }
        return ok;
      },
      giveWeapon(id, level = 1) {
        game.state.weapons[id] = level;
        game.addToHotbar(id);
      },
      // Meilenstein 6
      survivors: () => JSON.parse(JSON.stringify(game.state.survivors)),
      setSurvivor(id, stage) {
        game.state.survivors[id].stage = stage;
        game.survivors.placeAll(true);
        game.survivors.refreshInteractions();
      },
      talkTo: (id) => game.survivors.talk(id),
      /** Wie die Antwort »Das Zelt dort ist für dich« (mit Auftrag). */
      moveIn: (id) => game.survivors.onAnswer(id, 'einziehen'),
      maxHp: () => game.combat.maxHp,
      npcPos(id) {
        const n = game.survivors.npcs.list.get(id);
        return n ? { x: n.x, z: n.z, visible: n.model.root.visible } : null;
      },
      buyFurniture: (id) => game.furnishing.buy(id),
      cozy: () => game.furnishing.cozy,
      setTowerStage(n) {
        game.state.world.tower = n;
        game.world.setTowerStage(n, BEACON.glow);
      },
      beaconSlow: (x, z) => game.survivors.beaconSlow(x, z),
      arrive: () => game.survivors.arrive(true),
      morning: () => [...game.survivors.morning(), ...game.furnishing.morning(), ...game.trader.morning()].map((l) => l.text),
      // Meilenstein 8: Balduin, der Händler
      trader: () => {
        const n = game.trader.npc;
        const tr = game.trader;
        return { phase: tr.phase, x: n.x, z: n.z, visible: n.model.root.visible, boat: tr.boat.root.position.x, boatZ: tr.boat.root.position.z, rope: tr.rope.mesh.count, gestures: n.gestures.map((q) => q.kind), offers: tr.offers().map((o) => o.key), prompt: tr.interaction.enabled, fanfares: tr.fanfares, leaving: tr.leaving };
      },
      /** Ein Angebot des Tages tauschen (wie ein Druck auf E im Handelsfenster). */
      trade(key) {
        const offer = game.trader.offers().find((o) => o.key === key);
        return offer ? game.craft(offer) : false;
      },
      buildTowerStage: () => game.survivors.buildTowerStage(),
      combatInfo: () => ({ weapon: game.combat.weaponId, invulnerable: game.combat.invulnerable, rollCooldown: game.combat.rollCooldown, action: game.player.action?.kind || null }),
      /** Nacht des laufenden Tages sofort beenden (gewonnen oder verloren). */
      endNight(won = true) {
        const day = game.state.time.day;
        if (game.state.night.n !== day) game.nights.beginNight(day);
        game.nights.queue.length = 0;
        game.horde.clear();
        game.nights.finishNight(won);
      },
      setPlayerHp(v) {
        game.state.player.hp = v;
      },
      nightState: () => JSON.parse(JSON.stringify({ night: game.state.night, active: game.nights.active, queue: game.nights.queue.length, alive: game.horde.alive })),
      upgradeTower(id, level, spec) {
        const b = game.world.buildings.get(id);
        if (!b) return false;
        game.builder.upgradeTower(b, level, spec);
        return true;
      },
      pathBlocked: (cells) => game.world.pathing.wouldBlock(cells),
      /** Meilenstein 9: Wegfelder einer Spalte (j-Werte), Karte, Wege der Horde. */
      pathColumn(i) {
        const g = game.world.grid;
        const out = [];
        for (let j = g.minZ; j < g.minZ + g.height; j++) if (g.isPath(i, j)) out.push(j);
        return out;
      },
      mapInfo: () => {
        const m = game.world.map;
        return { seed: m.seed, topology: m.topology, spawns: m.spawns.map((s) => ({ ...s })), merge: { ...m.merge }, paths: m.paths.map((p) => p.id) };
      },
      traces: () => Object.keys(game.world.pathing.entries).map((name) => {
        const pts = game.world.pathing.trace(name);
        const last = pts[pts.length - 1];
        return { name, n: pts.length, x: last.x, z: last.z, reach: game.world.pathing.brute[game.world.pathing.entries[name].k] };
      }),
      spawnAtEntry: (type, entry, count = 1) => game.nights.spawnGroup(type, entry, count, {}),
      onPathOrYard: (x, z) => game.world.pathing.onPathOrYard(x, z),
      lootDetails: () => game.loot.items.map((l) => ({ res: l.res, x: l.x, z: l.z, until: l.until })),
      dropLoot: (x, z, n = 3) => {
        for (let k = 0; k < n; k++) game.loot.spawn('teile', x, z);
      },
      rebuildBarricade: (id) => game.builder.repairBuilding(game.world.buildings.get(id)),
      upgradeBarricade: (id) => game.builder.upgradeBarricade(game.world.buildings.get(id)),
      hitBarricade(id, dmg) {
        const b = game.world.buildings.get(id);
        if (b) game.onBarricadeHit(b, dmg, null);
        return b ? { hp: b.hp, broken: Boolean(b.broken), look: b.look } : null;
      },
      /** Waldbäume am Rand der Lichtung (nicht fällbar) im Umkreis. */
      forestTrees: (x, z, r) => game.world.colliders.near(x, z, r).filter((c) => c.tag === 'waldbaum').map((c) => ({ x: c.x, z: c.z })),
      debugPath() {
        const pa = game.world.pathing;
        return {
          targets: pa.targets.length,
          home: pa.home,
          entries: Object.values(pa.entries).map((e) => ({ name: e.name, x: e.x, z: e.z, walk: pa.walk[e.k], brute: pa.brute[e.k] })),
          reachable: Array.from(pa.brute).filter((v) => v < 1e8).length,
          // Textkarte: = Weg, , Hof, o Ziel am Haus, B Bau, # Hindernis, . sonst begehbar
          map: (() => {
            const g = game.world.grid;
            const rows = [];
            for (let j = 0; j < g.height; j++) {
              let row = '';
              for (let i = 0; i < g.width; i++) {
                const k = j * g.width + i;
                if (!g.inside[k] && !g.path[k]) row += ' ';
                else if (g.blocked[k]) row += '#';
                else if (g.occupant[k] !== null) row += 'B';
                else if (pa.brute[k] === 0) row += 'o';
                else if (g.path[k]) row += '=';
                else if (g.yard[k]) row += ',';
                else row += '.';
              }
              rows.push(`${String(g.minZ + j).padStart(3)} ${row}`);
            }
            return rows;
          })(),
        };
      },
      selectBuilding: (id) => game.builder.select(id),
      demolish: (id) => game.builder.demolish(id),
      /** Kacheln der Bauleiste in CSS-Pixeln (Mittelpunkt). */
      buildbarLayout() {
        const L = game.buildbar.layout(game.ui);
        const f = game.pixel.uiScale / (window.devicePixelRatio || 1);
        return { tiles: L.tiles.map((t) => ({ id: t.option.id, x: (t.rect.x + t.rect.w / 2) * f, y: (t.rect.y + t.rect.h / 2) * f })) };
      },
      /** Bildschirmposition (CSS-Pixel) eines Weltpunkts – für echte Mausklicks im Test. */
      screenOf(x, y, z) {
        const p = game.worldToUi(x, y, z);
        const f = game.pixel.uiScale / (window.devicePixelRatio || 1);
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
      repairAll: () => game.builder.repairAll(),
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
