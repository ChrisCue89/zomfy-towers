// Prüfablauf für Zomfy Towers (siehe CLAUDE.md).
//
//   node tools/check.mjs            volle Prüfung im Headless-Browser
//   node tools/check.mjs --syntax   nur Syntax aller Module
//   node tools/check.mjs --nur=nahkampf,naechte
//                                   nur einzelne Abschnitte (rundgang, speichern,
//                                   bauen, wege, naechte, nahkampf, ueberlebende,
//                                   haendler, herbst, nachbesserung, ansicht,
//                                   geschichte, figuren, nacht16, nachbesserung16,
//                                   lager, reaktionen, spielzeug, misch, glanz,
//                                   fragen, gemeinsam, wagnis, finale, buch, hd)
//
// Die volle Prüfung startet einen lokalen Server, öffnet das Spiel in
// Headless-Chromium, sammelt alle Konsolenmeldungen, macht Screenshots nach
// screenshots/, prüft Speichern/Laden, Sammeln und Bauen, die Wege an der Bucht
// (Meilenstein 9), Türme, Barrikaden, Horde und Nächte und misst Bildzeiten.
// Mit ?test spielt jede Prüfung auf derselben Karte (Startwert 3).

import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { start } from './serve.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS = join(ROOT, 'screenshots');
const args = new Set(process.argv.slice(2));
const only = [...args].find((a) => a.startsWith('--nur='))?.slice(6).split(',') || null;
/** Soll dieser Abschnitt laufen? (ohne --nur: alle) */
const want = (part) => !only || only.includes(part);

function listSources(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...listSources(path));
    else if (/\.(m?js)$/.test(name)) out.push(path);
  }
  return out;
}

function checkSyntax() {
  const files = [...listSources(join(ROOT, 'src')), ...listSources(join(ROOT, 'tools'))];
  let failed = 0;
  for (const file of files) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (error) {
      failed++;
      console.error(`✗ ${relative(ROOT, file)}\n${error.stderr?.toString() || error.message}`);
    }
  }
  console.log(failed ? `Syntax: ${failed} Datei(en) fehlerhaft` : `Syntax: ${files.length} Dateien in Ordnung`);
  return failed === 0;
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return require(join(globalRoot, 'playwright'));
  }
}

async function launchBrowser(chromium) {
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  try {
    return await chromium.launch({ args });
  } catch (error) {
    const fallback = '/opt/pw-browsers/chromium';
    if (existsSync(fallback)) return chromium.launch({ args, executablePath: fallback });
    throw error;
  }
}

const problems = [];
const report = [];

function note(line) {
  report.push(line);
  console.log(line);
}

function fail(line) {
  problems.push(line);
  console.log(`✗ ${line}`);
}

/** Seite öffnen und Konsole mitschneiden. */
async function openGame(browser, url, label, { viewport = { width: 1280, height: 720 }, init = null } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const messages = [];
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') messages.push(`${type}: ${msg.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => messages.push(`requestfailed: ${request.url()}`));
  page.on('response', (response) => {
    if (response.status() >= 400) messages.push(`http ${response.status()}: ${response.url()}`);
  });
  if (init) await page.addInitScript(init);
  await page.goto(url);
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  return { context, page, messages, label };
}

function checkMessages(session) {
  if (session.messages.length) fail(`${session.label}: ${session.messages.length} Konsolenmeldung(en):\n  ${session.messages.join('\n  ')}`);
  else note(`✓ ${session.label}: Konsole sauber`);
}

async function settle(page, frames = 40) {
  await page.evaluate((n) => window.zomfy.waitFrames(n), frames);
}

async function shot(page, name, setup) {
  await page.evaluate(setup);
  await settle(page, 45);
  await page.screenshot({ path: join(SHOTS, `${name}.png`), timeout: 180000 }); // unter Last braucht der Software-Renderer lange
  note(`  Screenshot: screenshots/${name}.png`);
}

/**
 * Startbild (N2): auf »Tales of Cue präsentiert« warten, eine echte Taste drücken
 * (erst dann darf Klang entstehen), dann ist das Titelbild da.
 */
async function passSplash(page) {
  await page.waitForFunction(() => window.zomfy.mode === 'splash', null, { timeout: 180000 });
  await settle(page, 20);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.zomfy.mode === 'title', null, { timeout: 180000 });
}

async function runBrowserChecks() {
  const { chromium } = loadPlaywright();
  mkdirSync(SHOTS, { recursive: true });
  const { server, url } = await start(0);
  const browser = await launchBrowser(chromium);
  let dayStats = null;
  let nightStats = null;
  try {
    if (want('rundgang')) ({ dayStats, nightStats } = await runTour(browser, url));
    if (want('speichern')) await runSaveChecks(browser, url);

    // --- 3. Meilenstein 2: Sammeln, Bauen, Werkbank, Hütte ---------------------------
    if (want('bauen')) await runBuildChecks(browser, url);

    // --- 3b. Meilenstein 9: Bucht, Wege, Barrikaden, Überreste, Karte, Migration v8 ------
    if (want('wege')) await runPathChecks(browser, url);

    // --- 4. Meilenstein 3: Türme, Horde, Loot, Nächte ---------------------------------
    if (want('naechte')) await runNightChecks(browser, url);

    // --- 5. Meilenstein 4: Nahkampf, Waffen, Ausweichen, Perks -------------------------
    if (want('nahkampf')) await runCombatChecks(browser, url);

    // --- 6. Meilenstein 6: Überlebende, Zelte, Einrichten, Funkturm ---------------------
    if (want('ueberlebende')) await runSurvivorChecks(browser, url);

    // --- 6b. Meilenstein 8: Zombieteile, Balduin (seit M9 mit dem Boot), Wrack nur einmal ------
    if (want('haendler')) await runTraderChecks(browser, url);

    // --- 6c. Meilenstein 12: Wetter, Herbstschmuck, Krähen, Gesichter -------------------
    if (want('herbst')) await runAutumnChecks(browser, url);

    // --- 6d. Nachbesserung nach der Testrunde m12-r1 ------------------------------------
    if (want('nachbesserung')) await runFixChecks(browser, url);

    // --- 6e. Meilenstein 13: nahe Ansicht, Z schaltet auf die Übersicht --------------------
    if (want('ansicht')) await runViewChecks(browser, url);

    // --- 6f. Meilenstein 15: Moder im Wald, Gedanke am Waldrand, Warnpfahl -----------------
    if (want('geschichte')) await runStoryChecks(browser, url);

    // --- 6g. N1: Figuren aus Formen statt Kästen, Knie und Ellbogen ------------------------
    if (want('figuren')) await runFigureChecks(browser, url);

    // --- 6h. M16: Die Nacht in der Hand (Nachtplan, Welle rufen, Fähigkeiten, Türme mit Geschichte)
    if (want('nacht16')) await runNight16Checks(browser, url);

    // --- 6h'. Nachbesserung nach der Testrunde m16-r1 (Warten, Welle rufen, Wahl nachts, Reparieren)
    if (want('nachbesserung16')) await runPlaytest16Checks(browser, url);

    // --- 6i. M17: Tor und Wall (Lager, Schlupftür, Durchbruch, Überfall, Zubehör, Glocke)
    if (want('lager')) await runCampChecks(browser, url);

    // --- 6j. M18: Zusammenspiel (Zustände, Reaktionen, Wetter, Notizbuch) -----------------
    if (want('reaktionen')) await runReactionChecks(browser, url);
    // --- 6k. M19: Baupläne, neue Türme, Fallen -------------------------------------------
    if (want('spielzeug')) await runToyChecks(browser, url);
    // --- 6l. M20: Mischtürme und Werkstattbuch --------------------------------------------
    if (want('misch')) await runMixChecks(browser, url);
    // --- 6m. M21: Turmteile mit Seltenheit, Champions, Fundkiste, Basteln, Wundertüte ------
    if (want('glanz')) await runShineChecks(browser, url);
    // --- 6n. M22: Wellenmerkmale, neue Arten, Bosse -----------------------------------
    if (want('fragen')) await runQuestionChecks(browser, url);
    // --- 6o. M23: Posten auf den Hochsitzen, Fest am Feuer, Nebenaufträge -------------------
    if (want('gemeinsam')) await runTogetherChecks(browser, url);
    // --- 6p. M24: Moderlocke, makellose Nacht, Vorratskammer ------------------------------
    if (want('wagnis')) await runRiskChecks(browser, url);
    // --- 6t. M25: Ein Herbst mit Ende (Frostnacht, Abspann, danach) -------------------
    if (want('finale')) await runFinaleChecks(browser, url);
    // --- 6u. M25, Teil 2: Herbstbuch (Sterne, Taten, Schmuck, Schlurferkunde, Turmalbum) -----
    if (want('buch')) await runBookChecks(browser, url);
    // --- 6v. M26: Wucht und Schliff (Trefferstopp, Wackeln, Federn, Raster, Klang, Bildzeiten) ---
    if (want('wucht')) await runFeelChecks(browser, url);
    // --- 6w. M27: Gäste und Plätze (Wanderer, Gästeplatz, Entscheidung, Schlafhütte, Briefe) ---
    if (want('gaeste')) await runGuestChecks(browser, url);
    if (want('karten')) await runCardChecks(browser, url);
    if (want('bindung')) await runBondChecks(browser, url);
    if (want('waffen')) await runArmsChecks(browser, url);
    if (want('glocke')) await runBellChecks(browser, url);
    if (want('netzwerk')) await runNetworkChecks(browser, url);
    if (want('angeln')) await runFishingChecks(browser, url);
    if (want('inseln')) await runIsleChecks(browser, url);
    if (want('probespiel')) await runPlaytestFixChecks(browser, url);
    if (want('ankunft')) await runArrivalChecks(browser, url);

    // --- 7. Große Auflösung (Full HD) --------------------------------------------------
    if (want('hd')) {
      const hd = await openGame(browser, `${url}index.html?test&nosave&time=21:15`, 'Full HD', { viewport: { width: 1920, height: 1080 } });
      await shot(hd.page, 'nacht-fullhd', () => {
        window.zomfy.setHorde(false);
        window.zomfy.setFlag('abendHinweis');
        window.zomfy.finishDialog();
        window.zomfy.teleport(3.25, -2.75, 0.5);
        window.zomfy.toggleLantern();
      });
      checkMessages(hd);
      await hd.context.close();
    }

    if (dayStats && nightStats) {
      note('');
      note('Leistung (Headless-Chromium mit Software-WebGL – echte GPUs sind um ein Vielfaches schneller):');
      note(`  Tag:   ${dayStats.frameMs.toFixed(1)} ms/Bild, ${dayStats.calls} Draw-Calls, ${Math.round(dayStats.triangles / 1000)}k Dreiecke, ${dayStats.width}×${dayStats.height} @${dayStats.scale}x`);
      note(`  Nacht: ${nightStats.frameMs.toFixed(1)} ms/Bild, ${nightStats.calls} Draw-Calls, ${Math.round(nightStats.triangles / 1000)}k Dreiecke`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

/**
 * Meilenstein 13: Draußen bleibt die Übersicht mit 80 px/m Standard (Größe
 * wie immer, Wunsch des Auftraggebers), Z (auf deutschen Tastaturen KeyY)
 * geht nah heran (160 px/m) und zurück; die Wahl wird gespeichert; drinnen
 * gilt der Maßstab des Innenraums.
 */
async function runViewChecks(browser, url) {
  // Ohne ?test und ohne ?zoom: weit ist Standard
  const plain = await openGame(browser, `${url}index.html?debug&nosave&nointro`, 'Ansicht (Standard)');
  const p1 = plain.page;
  await settle(p1, 30);
  const ppm = (page) => page.evaluate(() => Math.round(1 / window.zomfy.game.rig.px));
  const start = await ppm(p1);
  await p1.keyboard.press('KeyZ');
  await settle(p1, 3);
  const nah = await ppm(p1);
  const gespeichert = await p1.evaluate(() => JSON.parse(localStorage.getItem('zomfy-towers.einstellungen') || '{}').view);
  await p1.keyboard.press('KeyY'); // deutsche Tastatur: dort liegt das Z
  await settle(p1, 3);
  const wieder = await ppm(p1);
  if (start === 80 && nah === 160 && gespeichert === 'nah' && wieder === 80) note('✓ Ansicht: draußen weit (80 px/m) wie immer, Z geht nah heran (160 px/m) und zurück, die Wahl bleibt gespeichert');
  else fail(`Ansicht: Start ${start}, nach Z ${nah} (gespeichert ${gespeichert}), zurück ${wieder}`);
  checkMessages(plain);
  await plain.context.close();

  // Mit ?test bleibt die Prüfung in der Übersicht, ?zoom=nah erzwingt nah
  const session = await openGame(browser, `${url}index.html?test&nosave&zoom=nah`, 'Ansicht nah (Prüfung)');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  await z(() => {
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setWeather('klar');
    window.zomfy.setTime(11, 0);
  });
  await settle(page, 10);
  const nahTest = await ppm(page);
  // Drinnen: Z ändert nichts, der Innenraum hat seinen eigenen Maßstab
  await z(() => {
    const d = window.zomfy.interior().outsideDoor;
    window.zomfy.teleport(d.x, d.z + 0.1, Math.PI);
  });
  await settle(page, 5);
  await page.keyboard.press('KeyE');
  await settle(page, 40);
  await page.keyboard.press('KeyZ');
  await settle(page, 3);
  const drinnen = await z(() => ({ inside: window.zomfy.interior().inside, ppm: Math.round(1 / window.zomfy.game.rig.px), view: window.zomfy.game.view }));
  if (nahTest === 160 && drinnen.inside && drinnen.ppm === 160 && drinnen.view === 'nah') note('✓ Ansicht: ?zoom=nah erzwingt die nahe Ansicht, drinnen ändert Z nichts');
  else fail(`Ansicht mit ?zoom=nah: draußen ${nahTest}, drinnen ${JSON.stringify(drinnen)}`);

  // Platzieren mit der Maus in der nahen Ansicht: der Turm landet auf dem angeklickten Feld
  await z(() => {
    window.zomfy.teleport(1.5, 4.5, 0);
    window.zomfy.give({ schrott: 40 });
  });
  await settle(page, 20);
  const ziel = await z(() => {
    for (const [i, j] of [[2, 3], [3, 3], [1, 3], [2, 2], [3, 5]]) if (window.zomfy.placeCheck('bolzen', i, j).ok) return { i, j };
    return null;
  });
  const tile = await z(() => window.zomfy.buildbarLayout().tiles.find((t) => t.id === 'bolzen'));
  let perMaus = null;
  if (ziel && tile) {
    await page.mouse.click(tile.x, tile.y);
    await settle(page, 3);
    const pos = await z(({ i, j }) => window.zomfy.screenOf(i + 0.5, 0, j + 0.5), ziel);
    await page.mouse.move(pos.x, pos.y);
    await settle(page, 3);
    await page.mouse.click(pos.x, pos.y);
    await settle(page, 3);
    perMaus = (await z(() => window.zomfy.buildings())).find((b) => b.type === 'bolzen');
    await page.mouse.click(pos.x, pos.y, { button: 'right' });
    await settle(page, 3);
  }
  if (ziel && perMaus && perMaus.i === ziel.i && perMaus.j === ziel.j) note(`✓ Ansicht nah: Bolzenwerfer landet mit der Maus genau auf dem angeklickten Feld (${ziel.i}, ${ziel.j})`);
  else fail(`Ansicht nah, Platzieren mit der Maus: Ziel ${JSON.stringify(ziel)}, gebaut ${JSON.stringify(perMaus)}`);

  // Bilder in der nahen Ansicht
  await shot(page, 'nah-tag', () => {
    window.zomfy.setTime(11, 0);
    window.zomfy.teleport(2.0, -2.5, 0);
  });
  await shot(page, 'nah-haus', () => {
    window.zomfy.setHouseLevel(5);
    window.zomfy.teleport(8.0, -3.0, 0);
  });
  await shot(page, 'nah-nacht', () => {
    window.zomfy.setTime(22, 0);
    window.zomfy.teleport(2.0, -2.5, 0);
  });

  // Detailgrad (M13g): alle Modellfamilien draußen doppelt fein (1/32 m) – gemessen an der Geometrie
  const detail = await z(() => {
    for (const id of ['juna', 'bert', 'hilde', 'yusuf', 'knopf']) window.zomfy.setSurvivor(id, 2);
    window.zomfy.game.survivors.npcs.get('balduin');
    window.zomfy.game.loot.spawn('teile', 3, 6);
    return window.zomfy.detail();
  });
  const grob = Object.entries(detail).filter(([, v]) => v !== 32);
  if (!grob.length) note(`✓ Detailgrad: ${Object.keys(detail).join(', ')} im Maß 1/32 (gut 2 px je Voxel bei 80 px/m)`);
  else fail(`Detailgrad: nicht im Maß 1/32 – ${JSON.stringify(Object.fromEntries(grob))}`);
  // … und die Bildlast bleibt im Rahmen (weite Ansicht, Hof am Mittag)
  await z(() => {
    window.zomfy.game.applySettings({ view: 'weit' });
    window.zomfy.setTime(11, 0);
    window.zomfy.teleport(2.0, -2.5, 0);
  });
  await settle(page, 10);
  const last = await z(() => window.zomfy.stats());
  if (last.triangles > 0 && last.triangles < 1500000) note(`✓ Bildlast im Maß 1/32: Hof mit ${Math.round(last.triangles / 1000)}k Dreiecken in ${last.calls} Zeichenaufrufen`);
  else fail(`Bildlast im Hof: ${last.triangles} Dreiecke`);
  checkMessages(session);
  await session.context.close();
}

/**
 * M16 – Die Nacht in der Hand: Nachtplan und Randmarken am Abend, Wellen über
 * mehrere Wege, Schwierigkeit (Budget), Welle rufen (N) mit Mutbonus,
 * Zeitraffer (B), Mikas Fähigkeiten (Rechtsklick, X; Wahl auf Stufe 3),
 * Ausholen mit Risiko, Türme mit Erfahrung, Rang, Wimpel und Namen, Turm der
 * Nacht im Morgenbericht, Schwierigkeit im Pausenmenü, Speichern v30 und
 * Migration v10 → v30 – alles mit echten Tasten und Mausklicks.
 */
async function runNight16Checks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Nacht in der Hand (M16)');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(60); // jeder Druck in einem eigenen Schritt
  };
  // Offene Wahlen (Perk, Fähigkeit) für ruhige Bilder erledigen – die Wahl selbst prüft ein eigener Punkt
  const wahlenWeg = () =>
    z(() => {
      const g = window.zomfy.game;
      for (let k = 0; k < 12 && (g.state.perkChoice || g.state.skillChoice); k++) {
        if (g.state.skillChoice) g.skills.choose(g.state.skillChoice.options[0]);
        else g.combat.choosePerk(g.state.perkChoice[0]);
      }
      if (g.mode === 'perk') {
        g.perkChoice.close();
        g.mode = 'play';
      }
    });
  const perkWeg = async () => {
    await z(() => {
      const g = window.zomfy.game;
      if (window.zomfy.mode !== 'perk') return;
      const id = g.perkChoice.options[0];
      if (g.perkChoice.kind === 'perk') window.zomfy.choosePerk(id);
      else if (g.perkChoice.kind === 'bauplan') window.zomfy.chooseBlueprint(id); // M19
      else window.zomfy.chooseSkill(id);
    });
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setWeather('klar');
    window.zomfy.setHorde(false);
    window.zomfy.give({ holz: 60, stein: 20, schrott: 90, zahnraeder: 4 });
  });

  // Wellenplan: Nacht 1 über einen Weg, ab Nacht 2 auch über zwei; die Schwierigkeit ändert das Budget
  const plan = await z(() => {
    const g = window.zomfy.game;
    const out = { wege: [1, 2, 3, 4, 5, 6].map((n) => g.nights.planFor(n).waves.map((w) => w.entries.length)) };
    for (const d of ['gemuetlich', 'ausgewogen', 'wild']) {
      g.state.difficulty = d;
      out[d] = [2, 6].map((n) => g.nights.planFor(n).waves.reduce((a, w) => a + w.spawns.length, 0));
    }
    g.state.difficulty = 'ausgewogen';
    return out;
  });
  const mehrWege = plan.wege.slice(1).filter((n) => n.some((k) => k >= 2)).length;
  if (plan.wege[0].every((k) => k === 1) && mehrWege >= 3 && plan.gemuetlich[1] < plan.ausgewogen[1] && plan.ausgewogen[1] < plan.wild[1]) note(`✓ Wellenplan (M16): Nacht 1 über je einen Weg, ${mehrWege} der Nächte 2–6 auch über zwei oder drei; Nacht 6 mit ${plan.gemuetlich[1]}/${plan.ausgewogen[1]}/${plan.wild[1]} Schlurfern (gemütlich/ausgewogen/wild)`);
  else fail(`Wellenplan: ${JSON.stringify(plan)}`);

  // Zwei Türme und eine Barrikade am Weg
  const setup = await z(() => {
    const col = window.zomfy.pathColumn(-9);
    const j = col[Math.floor(col.length / 2)];
    window.zomfy.build('barrikade', -9, j, 1);
    const out = [];
    for (const [type, i, jj] of [['bolzen', -7, -4], ['katapult', -8, j - 3], ['katapult', -8, j + 3], ['bolzen', -10, j - 3], ['bolzen', -10, j + 3]]) {
      if (out.length >= 2) break;
      if (window.zomfy.placeCheck(type, i, jj).ok && window.zomfy.build(type, i, jj) === 'ok') out.push({ type, i, j: jj });
    }
    const list = window.zomfy.buildings();
    return { j, out, bar: list.find((b) => b.type === 'barrikade'), towers: window.zomfy.towerRanks() };
  });

  // Abend (Tag 2, 19:50): Nachtplan-Tafel und Randmarke zur ersten Welle
  await z(() => {
    window.zomfy.setDay(2);
    window.zomfy.setTime(19, 50);
    window.zomfy.teleport(2, 3, 0);
    window.zomfy.setHorde(true);
  });
  await step(400);
  const abend = await z(() => ({ view: window.zomfy.game.nights.planView(), marken: window.zomfy.game.hud.edgeMarks.filter((m) => m.art === 'welle'), next: window.zomfy.game.nights.nextEntries() }));
  await step(680); // gehalten: gezeichnet wird nur im Schritt
  await page.screenshot({ path: join(SHOTS, 'nachtplan.png') });
  note('  Screenshot: screenshots/nachtplan.png');
  if (abend.view && abend.view.rows.length >= 2 && abend.marken.length === abend.next.entries.length && abend.marken.length >= 1) note(`✓ Nachtplan (M16): am Abend ${abend.view.total} Wellen (${abend.view.rows.map((r) => r.entries.join('+')).join(', ')}), Randmarke zur ersten Welle`);
  else fail(`Nachtplan am Abend: ${JSON.stringify(abend)}`);

  // Nacht: Welle 1 abwarten und erledigen, dann N (echte Taste) ruft die nächste
  await z(() => window.zomfy.setTime(20, 29));
  await step(2500);
  for (let k = 0; k < 40; k++) {
    await z(() => { for (const zb of window.zomfy.zombies()) if (zb.state !== 'dying') window.zomfy.killZombie(zb.id, 'turm'); });
    await step(800);
    await perkWeg();
    if (await z(() => window.zomfy.game.nights.canCall())) break;
  }
  const vorRuf = await z(() => ({ wave: window.zomfy.state().night.wave, at: window.zomfy.game.nights.plan.waves[window.zomfy.state().night.wave]?.at, minute: window.zomfy.state().time.minute }));
  await tap('KeyN');
  await step(200);
  const gerufen = await z(() => ({ wave: window.zomfy.state().night.wave, called: window.zomfy.state().night.called, bonus: window.zomfy.game.nights.queue.some((s) => s.bonus), queue: window.zomfy.game.nights.queue.length }));
  if (gerufen.wave === vorRuf.wave + 1 && gerufen.called === 1 && gerufen.bonus) note(`✓ Welle rufen (M16): N holt Welle ${gerufen.wave} ${Math.round(vorRuf.at - vorRuf.minute)} Spielminuten früher – mit Mutbonus`);
  else fail(`Welle rufen: ${JSON.stringify({ vorRuf, gerufen })}`);
  // B: Zeitraffer – doppelt so viele Spielminuten je Sekunde
  const t0 = await z(() => window.zomfy.state().time.minute);
  await step(1000);
  const t1 = await z(() => window.zomfy.state().time.minute);
  await tap('KeyB');
  const t2 = await z(() => window.zomfy.state().time.minute);
  await step(1000);
  const t3 = await z(() => window.zomfy.state().time.minute);
  const raffer = { normal: +(t1 - t0).toFixed(2), schnell: +(t3 - t2).toFixed(2), an: await z(() => window.zomfy.game.fast) };
  await tap('KeyB');
  if (raffer.an && raffer.schnell > raffer.normal * 1.7) note(`✓ Zeitraffer (M16): B verdoppelt nachts das Tempo (${raffer.normal} → ${raffer.schnell} Spielminuten je Sekunde)`);
  else fail(`Zeitraffer: ${JSON.stringify(raffer)}`);
  await z(() => {
    window.zomfy.setHorde(false);
    window.zomfy.game.nights.queue.length = 0;
  });
  await perkWeg();

  // Laternenblitz mit echtem Rechtsklick: lähmt und bremst ringsum; ein zweiter Klick wartet noch
  const bx = setup.bar.i + 0.5;
  const bz = setup.bar.j + 0.5;
  await z((p) => window.zomfy.teleport(p.x + 1.4, p.z, -Math.PI / 2), { x: bx, z: bz });
  await step(200);
  const nah = await z(() => {
    const p = window.zomfy.game.player.position;
    return [[1.6, 0.8], [-1.2, 1.5], [0.5, -2.0], [6, 0]].map(([dx, dz]) => window.zomfy.spawnZombie('schlurfer', p.x + dx, p.z + dz));
  });
  const ziel = await z((p) => window.zomfy.screenOf(p.x - 2, 0, p.z), { x: bx, z: bz });
  await page.mouse.move(ziel.x, ziel.y);
  await step(40);
  await page.mouse.click(ziel.x, ziel.y, { button: 'right' });
  await step(220);
  const blitz = await z((ids) => {
    const g = window.zomfy.game;
    const q = ids.map((id) => g.horde.list.find((o) => o.id === id));
    return { stun: q.map((o) => (o ? +o.stunT.toFixed(2) : null)), slow: q.map((o) => (o ? o.slow : null)), cool: window.zomfy.skills().cool[0], licht: +(g.world.lanternLight.boost || 1).toFixed(1) };
  }, nah);
  await step(136); // gehalten: gezeichnet wird nur im Schritt
  await page.screenshot({ path: join(SHOTS, 'faehigkeiten.png') });
  note('  Screenshot: screenshots/faehigkeiten.png');
  await page.mouse.click(ziel.x, ziel.y, { button: 'right' });
  await step(100);
  const nochmal = await z(() => window.zomfy.skills().used.laternenblitz);
  if (blitz.stun.slice(0, 3).every((s) => s > 0.5) && blitz.stun[3] === 0 && blitz.slow.slice(0, 3).every((s) => s > 0) && blitz.cool > 10 && blitz.licht > 2 && nochmal === 1) note(`✓ Laternenblitz (M16): Rechtsklick lähmt drei Schlurfer im Umkreis (der vierte, 6 m weg, bleibt frei), die Laterne flammt auf; ${Math.round(blitz.cool)} s Abklingzeit – ein zweiter Klick wartet`);
  else fail(`Laternenblitz: ${JSON.stringify({ blitz, nochmal })}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1500);

  // Stufe 3: Fähigkeiten-Wahl mit echter Taste – der Reihe nach: erst der Perk von Stufe 2
  await z(() => window.zomfy.giveXp(40));
  let wahl = null;
  const reihe = [];
  for (let k = 0; k < 40 && !wahl; k++) {
    await step(300);
    const offen = await z(() => (window.zomfy.mode === 'perk' ? { kind: window.zomfy.game.perkChoice.kind, level: window.zomfy.game.perkChoice.level, options: [...window.zomfy.game.perkChoice.options] } : null));
    if (!offen) continue;
    reihe.push(`${offen.kind} ${offen.level}`);
    if (offen.kind === 'lernen') wahl = offen;
    else {
      await step(600);
      await tap('Digit1'); // Perk der Stufe davor
    }
  }
  await step(700);
  await step(136); // gehalten: gezeichnet wird nur im Schritt
  await page.screenshot({ path: join(SHOTS, 'faehigkeit-wahl.png') });
  note('  Screenshot: screenshots/faehigkeit-wahl.png');
  await tap('Digit1');
  const gelernt = await z(() => window.zomfy.skills().slots);
  for (let k = 0; k < 12; k++) {
    await step(300);
    if ((await z(() => window.zomfy.mode)) === 'perk') {
      await step(600);
      await tap('Digit1');
    }
  }
  // Der Reihe nach: Stufen aufsteigend, auf Stufe 3 die Fähigkeit vor dem Perk
  const stufen = reihe.map((r) => Number(r.split(' ')[1]));
  const geordnet = stufen.every((l, i) => i === 0 || l >= stufen[i - 1]) && !reihe.includes('perk 3');
  if (wahl?.kind === 'lernen' && wahl.level === 3 && geordnet && wahl.options.length === 3 && gelernt[1] === wahl.options[0]) note(`✓ Fähigkeiten-Wahl (M16): der Reihe nach (${reihe.join(' → ')}), Stufe 3 bietet drei Fähigkeiten (${wahl.options.join(', ')}), Taste 1 legt ${gelernt[1]} auf X`);
  else fail(`Fähigkeiten-Wahl: ${JSON.stringify({ reihe, wahl, gelernt })}`);

  // X: Kürbiswurf an den Zeiger (Fläche, Brand)
  await z(() => {
    window.zomfy.learnSkill('kuerbiswurf');
    window.zomfy.readySkills();
  });
  // Die drei stehen still (betäubt) und halten etwas aus – sonst läuft der vorderste während
  // des Flugs aus dem Kreis, oder die Türme ringsum erledigen sie vor dem Aufprall
  const wurfZ = await z((p) => [[0, 0], [0.5, 0.3], [-0.4, 0.4]].map(([dx, dz]) => {
    const id = window.zomfy.spawnZombie('schlurfer', p.x - 3 + dx, p.z + dz);
    const q = window.zomfy.game.horde.list.find((o) => o.id === id);
    q.stunT = 999;
    q.maxHp = q.hp = 400; // die Türme ringsum räumen sie sonst vor dem Aufprall ab
    return id;
  }), { x: bx, z: bz });
  const wurfZiel = await z((p) => window.zomfy.screenOf(p.x - 3, 0, p.z + 0.2), { x: bx, z: bz });
  await page.mouse.move(wurfZiel.x, wurfZiel.y);
  await step(40);
  await tap('KeyX');
  await step(1100);
  const wurf = await z((ids) => ids.map((id) => {
    const q = window.zomfy.game.horde.list.find((o) => o.id === id);
    return q ? { hp: q.hp, max: q.maxHp, burn: q.burnT > 0 } : null;
  }), wurfZ);
  if (wurf.every((q) => q && q.hp < q.max && q.burn)) note('✓ Kürbiswurf (M16): X wirft an den Zeiger – alle drei getroffen, sie brennen');
  else fail(`Kürbiswurf: ${JSON.stringify(wurf)}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1200);

  // Ausholen mit Risiko: Rückstoß mitten im Ausholen – der Biss sitzt trotzdem
  await z(() => (window.zomfy.game.state.player.hp = 100));
  const jaeger = await z(() => {
    const g = window.zomfy.game;
    const p = g.player.position;
    const id = window.zomfy.spawnZombie('schlurfer', p.x + 0.9, p.z);
    const q = g.horde.list.find((o) => o.id === id);
    Object.assign(q, { state: 'chase', cooldown: 0, aggro: 20 });
    return id;
  });
  let holt = false;
  for (let k = 0; k < 40 && !holt; k++) {
    await step(20);
    holt = await z((id) => (window.zomfy.game.horde.list.find((o) => o.id === id)?.windup || 0) > 0, jaeger);
  }
  await z((id) => {
    const g = window.zomfy.game;
    const q = g.horde.list.find((o) => o.id === id);
    const p = g.player.position;
    g.horde.damage(q, 1, { push: 0.55, fromX: p.x, fromZ: p.z, source: 'test' });
  }, jaeger);
  await step(600);
  const biss = await z(() => window.zomfy.game.state.player.hp);
  if (holt && biss < 100) note(`✓ Nahkampf mit Risiko (M16): Ein Rückstoß bricht das Ausholen nicht mehr ab – der Biss sitzt (Leben ${Math.round(biss)}/100)`);
  else fail(`Ausholen: ${JSON.stringify({ holt, biss })}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1200);

  // Türme mit Geschichte: echter Beschuss, Erfahrung, Rang II mit Wimpel, Name in der Auswahl
  const tp = setup.out[0];
  await z((t) => window.zomfy.teleport(t.i + 2.5, t.j + 0.5, 0), tp);
  await z((t) => {
    const col = window.zomfy.pathColumn(t.i - 1);
    const jj = col.length ? col[Math.floor(col.length / 2)] : t.j;
    for (let k = 0; k < 6; k++) window.zomfy.spawnZombie('schlurfer', t.i - 1 + (k % 3) * 0.3, jj + 0.5 + Math.floor(k / 3) * 0.4);
  }, tp);
  for (let k = 0; k < 24; k++) {
    await step(500);
    if (!(await z(() => window.zomfy.game.horde.alive))) break;
  }
  await wahlenWeg();
  const beschuss = await z(() => window.zomfy.towerRanks());
  const bester = [...beschuss].sort((a, b) => b.xp - a.xp)[0];
  const aufstieg = await z((id) => window.zomfy.giveTowerXp(id, Math.max(0, 160 - window.zomfy.towerRanks().find((t) => t.id === id).xp)), bester.id);
  const toast = await z(() => window.zomfy.game.hud.toasts.map((t) => t.text).filter((t) => t.includes('steigt auf')));
  await z((id) => window.zomfy.selectBuilding(id), bester.id);
  await step(200);
  const titel = await z(() => ({ title: window.zomfy.game.builder.selectionTitle(), record: window.zomfy.game.builder.selectionRecord() }));
  await z(() => window.zomfy.game.applySettings({ view: 'nah' }));
  await step(680); // gehalten: gezeichnet wird nur im Schritt
  await page.screenshot({ path: join(SHOTS, 'turm-rang.png') });
  note('  Screenshot: screenshots/turm-rang.png');
  await z(() => {
    window.zomfy.game.applySettings({ view: 'weit' });
    window.zomfy.game.builder.cancel();
  });
  const gespeichert = await z(() => window.zomfy.game.world.buildings.toState().find((b) => b.xp > 0));
  if (bester.xp > 20 && bester.kills >= 1 && aufstieg.rang === 2 && aufstieg.wimpel === 1 && toast.length && titel.title.startsWith(`${aufstieg.name}, `) && titel.record.startsWith('Rang II') && gespeichert?.name !== undefined && gespeichert.kills >= 1) note(`✓ Türme mit Geschichte (M16): ${bester.name} sammelt im Beschuss ${bester.xp} Erfahrung und ${bester.kills} Abschüsse, steigt auf Rang II (Wimpel am Mast) – Auswahl »${titel.title}«, »${titel.record}«; Name, Erfahrung und Abschüsse im Spielstand`);
  else fail(`Türme mit Geschichte: ${JSON.stringify({ beschuss, aufstieg, toast, titel, gespeichert })}`);

  // Turm der Nacht im Morgenbericht
  await wahlenWeg();
  await z((id) => {
    const g = window.zomfy.game;
    g.state.night.towers = { [id]: 7 };
    window.zomfy.endNight(true);
    g.showReport();
  }, bester.id);
  await step(300);
  await step(340); // gehalten: gezeichnet wird nur im Schritt
  const bericht = await z(() => ({ turm: window.zomfy.state().report?.turm, zeilen: window.zomfy.game.report.isOpen ? window.zomfy.game.report.lines().map((l) => l.text) : [] }));
  await page.screenshot({ path: join(SHOTS, 'turm-der-nacht.png') });
  note('  Screenshot: screenshots/turm-der-nacht.png');
  if (bericht.turm?.kills === 7 && bericht.zeilen.some((l) => l.startsWith('Turm der Nacht:') && l.includes(bericht.turm.name))) note(`✓ Turm der Nacht (M16): »${bericht.zeilen.find((l) => l.startsWith('Turm der Nacht'))}«`);
  else fail(`Turm der Nacht: ${JSON.stringify(bericht)}`);
  await tap('KeyE');
  await step(200);

  // Schwierigkeit im Pausenmenü: Esc, Einstellungen, S bis zur Zeile, D
  await tap('Escape');
  const mainRows = await z(() => window.zomfy.game.menu.buttons().map((b) => b.label));
  for (let k = 0; k < mainRows.indexOf('Einstellungen'); k++) await tap('KeyS');
  await tap('KeyE');
  await step(400);
  const rows = await z(() => window.zomfy.game.menu.buttons().map((b) => b.label));
  const idx = rows.findIndex((r) => r.startsWith('Schwierigkeit'));
  for (let k = 0; k < idx; k++) await tap('KeyS');
  await tap('KeyD');
  const schwer = await z(() => window.zomfy.state().difficulty);
  await tap('KeyA');
  const zurueck = await z(() => window.zomfy.state().difficulty);
  await tap('Escape');
  await tap('Escape');
  if (idx >= 0 && schwer === 'wild' && zurueck === 'ausgewogen') note('✓ Schwierigkeit (M16): im Pausenmenü mit A/D umstellbar (Ausgewogen → Wild → Ausgewogen)');
  else fail(`Schwierigkeit im Menü: ${JSON.stringify({ rows, idx, schwer, zurueck })}`);
  checkMessages(session);
  await session.context.close();

  // Migration v10 → v30: Schwierigkeit »ausgewogen«, Laternenblitz auf Platz 1; Türme ohne Geschichte laden
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v10 → v30', {
    init: () => {
      if (sessionStorage.getItem('zomfy-v10')) return;
      localStorage.setItem(
        'zomfy-towers.spielstand',
        JSON.stringify({
          version: 10,
          time: { day: 4, minute: 600 },
          player: { x: 2, z: 3, facing: 0, lantern: false, hp: 90, xp: 5, level: 4, name: 'Kira', look: { hat: 'rot', jacket: 'gruen', hair: 'braun', skin: 'mittel' } },
          inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
          perks: { flink: 1, sammler: 1, konter: 1 },
          world: { mapSeed: 3, houseLevel: 1, homeHp: 300, buildings: [{ id: 1, type: 'bolzen', i: -7, j: -4, turns: 0, level: 1 }], nodes: {} },
          flags: { introGesehen: true },
        })
      );
      sessionStorage.setItem('zomfy-v10', '1');
    },
  });
  const m = await alt.page.evaluate(() => ({ st: window.zomfy.state(), turm: window.zomfy.towerRanks()[0] || null }));
  if (m.st.version === 30 && m.st.difficulty === 'ausgewogen' && m.st.skills.slots[0] === 'laternenblitz' && m.st.skills.slots[1] === null && m.st.skillChoice?.mode === 'lernen' && m.turm?.xp === 0 && m.turm.rang === 1) note(`✓ Migration: Spielstand v10 wird zu v30 (Schwierigkeit ausgewogen, Laternenblitz auf Platz 1, auf Stufe 4 wartet die Fähigkeiten-Wahl; ${m.turm.name} ist ein neuer Turm)`);
  else fail(`Migration v10 → v30: ${JSON.stringify({ v: m.st.version, d: m.st.difficulty, skills: m.st.skills, choice: m.st.skillChoice, turm: m.turm })}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * Nachbesserung nach der Testrunde m16-r1 (Abschnitt `nachbesserung16`): N sagt
 * abends vor der Tafel, ab wann es geht, und ruft ab 19:30 die Nacht (»Ich bin
 * bereit«); nachts ruft N die nächste Welle, sobald die laufende ganz unterwegs
 * ist, auch wenn noch Schlurfer leben; eine Wahl geht nachts auf, sobald keine
 * Horde in der Nähe ist; eine Ziffer in der Sperre wählt nur vor, ein schnelles E
 * nach der Wahl geht nicht in die Welt; Schlurfer stehen nie in Mika und liegen
 * über ihrem Umriss; Mika geht mit Banner zu Boden; Teilreparatur erst nach einem
 * zweiten Druck; Zähe Natur heilt je Schlag, Turm-Erfahrung ¼ je Schadenspunkt;
 * Mikas Laterne am Tag nur ein Schimmer, der Blitz hell; Barrikaden außerhalb
 * jedes Turmkreises werden genannt – mit echten Tasten, wo es um Tasten geht
 * (Bild: bereit).
 */
async function runPlaytest16Checks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Nachbesserung m16-r1');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(60); // jeder Druck in einem eigenen Schritt
  };
  const toasts = () => z(() => window.zomfy.game.hud.toasts.map((t) => t.text));
  const TX = await z(async () => {
    const { T } = await import('/src/data/texts.js');
    return { gerufenAbend: T.nacht.gerufenAbend, bald: T.horde.bald, zuBoden: T.horde.zuBoden, rufenAbend: T.nacht.rufenAbend, keinTurm: T.bauleiste.keinTurm };
  });
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setWeather('klar');
    window.zomfy.setHorde(false);
    window.zomfy.give({ holz: 60, stein: 20, schrott: 90 });
  });
  // Zwei Türme am Weg (wie in `nacht16`)
  const setup = await z(() => {
    const col = window.zomfy.pathColumn(-9);
    const j = col[Math.floor(col.length / 2)];
    const out = [];
    for (const [type, i, jj] of [['bolzen', -7, -4], ['katapult', -8, j - 3], ['katapult', -8, j + 3], ['bolzen', -10, j - 3], ['bolzen', -10, j + 3]]) {
      if (out.length >= 2) break;
      if (window.zomfy.placeCheck(type, i, jj).ok && window.zomfy.build(type, i, jj) === 'ok') out.push({ type, i, j: jj });
    }
    const towers = window.zomfy.buildings().filter((b) => out.some((o) => o.i === b.i && o.j === b.j));
    return { j, towers };
  });

  // S1: Vor der Tafel sagt N, ab wann es geht; ab 19:30 ruft N die Horde – »Ich bin bereit«
  await z(() => {
    window.zomfy.setDay(2);
    window.zomfy.setTime(19, 0);
    window.zomfy.teleport(2, 3, 0);
    window.zomfy.setHorde(true);
  });
  await step(300);
  await tap('KeyN');
  const frueh = { active: await z(() => window.zomfy.game.nights.active), toasts: await toasts() };
  await z(() => window.zomfy.setTime(19, 40));
  await step(400);
  const tafel = await z(() => {
    const h = window.zomfy.game.hud;
    return { view: window.zomfy.game.nights.planView(), plan: h.planRect, goal: { ...h.goalBox } };
  });
  await step(680); // gehalten: gezeichnet wird nur im Schritt
  await page.screenshot({ path: join(SHOTS, 'bereit.png') });
  note('  Screenshot: screenshots/bereit.png');
  // Gerufen wird um 19:58 – so prüft das Überschreiten von 20:00 gleich die Meldung (F6)
  await z(() => window.zomfy.setTime(19, 58));
  await step(100);
  const erste = await z(() => window.zomfy.game.nights.planFor(2).waves[0].at - window.zomfy.state().time.minute);
  await tap('KeyN');
  const bereit = await z(() => ({ ...window.zomfy.nightState(), queued: window.zomfy.game.nights.queue.some((s) => s.bonus) }));
  const bereitToasts = await toasts();
  if (!frueh.active && frueh.toasts.some((t) => t.includes('19:30'))) note('✓ Welle rufen (m16-r1): vor der Tafel sagt N, ab wann es geht (19:30)');
  else fail(`Welle rufen vor der Tafel: ${JSON.stringify(frueh)}`);
  const unterZiel = tafel.plan && (!tafel.goal.on || tafel.plan.x >= tafel.goal.x + tafel.goal.w + 4 || tafel.plan.y >= tafel.goal.y + tafel.goal.h + 2);
  if (tafel.view?.evening && tafel.view.canCall && unterZiel) note(`✓ Tafel am Abend (m16-r1): zeigt »${TX.rufenAbend}« und liegt nicht über der Zielzeile`);
  else fail(`Tafel am Abend: ${JSON.stringify(tafel)}`);
  if (bereit.active && bereit.night.n === 2 && bereit.night.called === 1 && bereit.night.wave >= 1 && bereit.queued && bereitToasts.includes(TX.gerufenAbend)) note(`✓ Ich bin bereit (m16-r1): N um 19:58 ruft die Nacht – Welle 1 kommt ${Math.round(erste)} Spielminuten früher, mit Mutbonus`);
  else fail(`Ich bin bereit: ${JSON.stringify({ bereit, bereitToasts, erste })}`);

  // F6: »Bald kommt die Horde« kommt nicht mehr, wenn die Nacht schon gerufen ist
  await step(2500);
  const nachZwanzig = await z(() => window.zomfy.state().time.minute);
  const bald = (await toasts()).includes(TX.bald);
  if (!bald && nachZwanzig >= 840) note('✓ Meldung (m16-r1): »Bald kommt die Horde« bleibt um 20:00 aus, wenn die Horde schon gerufen ist');
  else fail(`Meldung: »Bald kommt die Horde« trotz gerufener Nacht (${bald}, Minute ${nachZwanzig})`);

  // S2: Die nächste Welle, sobald die laufende ganz unterwegs ist – auch wenn noch Schlurfer leben
  let unterwegs = null;
  for (let k = 0; k < 40; k++) {
    unterwegs = await z(() => window.zomfy.nightState());
    if (unterwegs.queue === 0 && unterwegs.alive > 0) break;
    await step(500);
  }
  await tap('KeyN');
  const naechste = await z(() => window.zomfy.nightState());
  if (unterwegs.queue === 0 && unterwegs.alive > 0 && naechste.night.wave === unterwegs.night.wave + 1 && naechste.night.called === 2) note(`✓ Welle rufen (m16-r1): N holt Welle ${naechste.night.wave}, während ${unterwegs.alive} Schlurfer der Welle davor noch unterwegs sind`);
  else fail(`Welle rufen mit lebenden Schlurfern: ${JSON.stringify({ unterwegs, naechste })}`);

  // S3: Stufenaufstieg nachts – mit einem Schlurfer in der Nähe wartet die Wahl, ohne geht sie auf
  const door = await z(() => {
    const d = window.zomfy.interior().outsideDoor;
    window.zomfy.teleport(d.x, d.z + 0.1, Math.PI);
    return d;
  });
  const nahId = await z(async (d) => {
    const { xpForLevel } = await import('/src/data/perks.js');
    const g = window.zomfy.game;
    const pl = g.state.player;
    g.combat.gainXp(xpForLevel(pl.level) - pl.xp); // genau eine Stufe
    return window.zomfy.spawnZombie('schlurfer', d.x - 6, d.z + 3);
  }, door);
  await z((id) => window.zomfy.game.horde.stun(window.zomfy.game.horde.list.find((zb) => zb.id === id), 3), nahId);
  await step(1500);
  const mitHorde = await z(() => ({ mode: window.zomfy.mode, wartet: Boolean(window.zomfy.state().perkChoice || window.zomfy.state().skillChoice) }));
  await z((id) => window.zomfy.killZombie(id, 'test'), nahId);
  let offen = null;
  for (let k = 0; k < 20; k++) {
    await step(100);
    offen = await z(() => ({ mode: window.zomfy.mode, alive: window.zomfy.nightState().alive, t: window.zomfy.game.perkChoice.t }));
    if (offen.mode === 'perk') break;
  }
  if (mitHorde.wartet && mitHorde.mode === 'play' && offen.mode === 'perk' && offen.alive > 0) note(`✓ Wahl nachts (m16-r1): wartet, solange ein Schlurfer näher als 10 m ist, und geht dann auf – obwohl noch ${offen.alive} unterwegs sind`);
  else fail(`Wahl nachts: ${JSON.stringify({ mitHorde, offen })}`);

  // S7: Eine Ziffer in der Sperre wählt sichtbar vor (ohne zu bestätigen), E nimmt dann diese Karte;
  // ein schnelles E danach geht nicht durch die Haustür, ein bewusstes schon
  await tap('Digit2');
  const vorgewaehlt = await z(() => ({ mode: window.zomfy.mode, focus: window.zomfy.game.perkChoice.focus, gesperrt: window.zomfy.game.perkChoice.t < 0.5, option: window.zomfy.game.perkChoice.options[1], kind: window.zomfy.game.perkChoice.kind }));
  await step(600);
  await tap('KeyE');
  const gewaehlt = await z((o) => {
    const st = window.zomfy.state();
    return { mode: window.zomfy.mode, perk: st.perks?.[o] || 0, slots: [...st.skills.slots], ranks: { ...st.skills.ranks } };
  }, vorgewaehlt.option);
  await tap('KeyE');
  const schnell = await z(() => window.zomfy.interior().inside);
  await step(500);
  await tap('KeyE');
  await step(800);
  const bewusst = await z(() => window.zomfy.interior().inside);
  const genommen = vorgewaehlt.kind === 'perk' ? gewaehlt.perk > 0 : gewaehlt.slots.includes(vorgewaehlt.option) || gewaehlt.ranks[vorgewaehlt.option] > 0;
  if (vorgewaehlt.mode === 'perk' && vorgewaehlt.gesperrt && vorgewaehlt.focus === 1 && gewaehlt.mode === 'play' && genommen && !schnell && bewusst) note(`✓ Wahl (m16-r1): 2 in der Sperre wählt Karte 2 vor, E nimmt sie (${vorgewaehlt.option}); ein schnelles E danach geht nicht durch die Tür, ein bewusstes schon`);
  else fail(`Wahl mit Sperre: ${JSON.stringify({ vorgewaehlt, gewaehlt, schnell, bewusst })}`);

  // Wieder hinaus in den Hof
  await z(() => {
    window.zomfy.teleport(3.25, -1.5, 0);
    window.zomfy.setPlayerHp(100);
  });
  await step(300);

  // S5 und S4: Ein Brummer auf Mika wird sanft von ihr weggeschoben; Schlurfer liegen über Mikas Umriss
  const nah = await z(() => {
    const g = window.zomfy.game;
    const p = g.player.position;
    const id = window.zomfy.spawnZombie('brummer', p.x, p.z);
    const zb = g.horde.list.find((q) => q.id === id);
    zb.x = p.x + 0.02; // genau auf Mika – das Erscheinen rückt sonst auf Weg oder Hof
    zb.z = p.z;
    g.horde.stun(zb, 2);
    return { id, start: Math.hypot(zb.x - p.x, zb.z - p.z) };
  });
  await step(300);
  const abstand = await z((id) => {
    const g = window.zomfy.game;
    const zb = g.horde.list.find((q) => q.id === id);
    const p = g.player.position;
    let mika = null;
    g.player.object.traverse((o) => {
      if (o.userData.outline) mika = o.renderOrder;
    });
    const bodies = [];
    g.horde.group.traverse((o) => {
      if (o.isInstancedMesh) bodies.push(o.renderOrder);
    });
    return { d: Math.hypot(zb.x - p.x, zb.z - p.z), min: zb.def.radius + 0.3, mika, schlurfer: Math.max(...bodies) };
  }, nah.id);
  await z((id) => window.zomfy.killZombie(id, 'test'), nah.id);
  if (nah.start < 0.05 && abstand.d >= abstand.min - 0.05 && abstand.d < abstand.min + 0.5) note(`✓ Abstand (m16-r1): Ein Brummer genau auf Mika steht nach 0,3 s ${abstand.d.toFixed(2)} m neben ihr – Zielen ist kein Raten mehr`);
  else fail(`Abstand zu Mika: ${JSON.stringify({ ...abstand, start: nah.start })}`);
  if (abstand.mika === 1.75 && abstand.schlurfer > abstand.mika) note(`✓ Umriss (m16-r1): Schlurfer (${abstand.schlurfer}) werden nach Mikas Umriss (${abstand.mika}) gezeichnet – kein gelbes Knäuel`);
  else fail(`Umriss: ${JSON.stringify(abstand)}`);

  // S9: Mika geht nachts zu Boden – mit Banner, dann im Haus
  await z(() => window.zomfy.game.knockedOut());
  await step(100);
  const boden = await z(() => ({ mode: window.zomfy.mode, banner: window.zomfy.game.hud.banner?.text || null }));
  for (let k = 0; k < 20 && (await z(() => window.zomfy.mode)) === 'sleep'; k++) await step(500);
  const gerettet = await z(() => ({ mode: window.zomfy.mode, inside: window.zomfy.interior().inside }));
  if (boden.mode === 'sleep' && boden.banner === TX.zuBoden && gerettet.mode === 'play' && gerettet.inside) note(`✓ Zu Boden (m16-r1): Banner »${TX.zuBoden}«, dann rettet sie sich ins Haus`);
  else fail(`Zu Boden: ${JSON.stringify({ boden, gerettet })}`);

  // Die Nacht beenden, ein ruhiger Tag
  await z(() => {
    window.zomfy.endNight(true);
    window.zomfy.setHorde(false);
    window.zomfy.killAllZombies();
    window.zomfy.setDay(3);
    window.zomfy.setTime(12, 0);
    const d = window.zomfy.interior().outsideDoor;
    window.zomfy.teleport(d.x, d.z + 2.5, 0);
  });
  await step(800);
  for (let k = 0; k < 3 && (await z(() => window.zomfy.mode)) === 'report'; k++) await tap('Enter');
  // M19: Nach der gewonnenen Nacht wartet ein Bauplan – die Wahl selbst prüft `spielzeug`
  await z(() => {
    const g = window.zomfy.game;
    const c = g.state.blueprintChoice;
    if (c) window.zomfy.chooseBlueprint(c.options[0]);
    if (g.mode === 'perk') {
      g.perkChoice.close();
      g.mode = 'play';
    }
  });
  await step(200);

  // S8: Reparieren mit zu wenig Vorrat – der erste Druck nennt die Kosten, erst der zweite flickt
  const vorRep = await z(() => {
    const s = window.zomfy.state();
    window.zomfy.setHomeHp(100);
    window.zomfy.give({ holz: 2 - (s.inventory.holz || 0), schrott: 10 - (s.inventory.schrott || 0) });
    return window.zomfy.state().world.homeHp;
  });
  for (let k = 0; k < 4 && (await z(() => window.zomfy.game.buildbar.tab)) !== 'zuhause'; k++) await tap('Tab');
  const repKey = await z(() => {
    const g = window.zomfy.game;
    const tile = g.buildbar.layout(g.ui).tiles.find((t) => t.option.id === 'reparieren');
    return tile ? ['KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyC', 'KeyV'][tile.keyIndex] : null;
  });
  if (repKey) await tap(repKey);
  const einmal = await z(() => ({ hp: window.zomfy.state().world.homeHp, holz: window.zomfy.state().inventory.holz, toasts: window.zomfy.game.hud.toasts.map((t) => t.text) }));
  if (repKey) await tap(repKey);
  const zweimal = await z(() => ({ hp: window.zomfy.state().world.homeHp, holz: window.zomfy.state().inventory.holz }));
  const nachfrage = einmal.toasts.find((t) => t.includes('nochmal drücken'));
  if (repKey && einmal.hp === vorRep && einmal.holz === 2 && nachfrage && zweimal.hp > vorRep && zweimal.holz === 0) note(`✓ Reparieren (m16-r1): Vorrat reicht nur teilweise – der erste Druck fragt (»${nachfrage}«), der zweite flickt (${vorRep} → ${Math.round(zweimal.hp)})`);
  else fail(`Teilreparatur mit Rückfrage: ${JSON.stringify({ repKey, vorRep, einmal, zweimal })}`);
  await z(() => window.zomfy.setHomeHp(300));

  // F4: Mikas Laterne am Tag nur ein Schimmer, der Blitz flammt hell auf
  await z(() => {
    const g = window.zomfy.game;
    if (!g.player.lanternLit) g.toggleLantern();
  });
  await step(300);
  const schimmer = await z(() => +window.zomfy.game.world.lanternLight.level.toFixed(2));
  await z(() => {
    window.zomfy.readySkills();
    window.zomfy.useSkill(0);
  });
  await step(220); // der Blitz flammt nach 0,14 s auf (Ausholen)
  const blitzHell = await z(() => +window.zomfy.game.world.lanternLight.level.toFixed(2));
  await z(() => window.zomfy.game.toggleLantern());
  if (schimmer > 0.1 && schimmer < 0.35 && blitzHell >= 0.99) note(`✓ Laterne (m16-r1): am Tag nur ein Schimmer (${schimmer}), der Laternenblitz flammt hell auf (${blitzHell})`);
  else fail(`Laterne am Tag: Schimmer ${schimmer}, Blitz ${blitzHell}`);

  // S6: Zähe Natur heilt je Schlag – das erste Ziel voll, jedes weitere ein Fünftel
  const heil = await z(() => {
    const g = window.zomfy.game;
    g.state.perks = { ...(g.state.perks || {}), lebensraub: 3 };
    window.zomfy.setPlayerHp(50);
    g.combat.lifesteal(5);
    const fuenf = g.state.player.hp - 50;
    window.zomfy.setPlayerHp(50);
    g.combat.lifesteal(1);
    const eins = g.state.player.hp - 50;
    delete g.state.perks.lebensraub;
    window.zomfy.setPlayerHp(100);
    return { eins: +eins.toFixed(2), fuenf: +fuenf.toFixed(2) };
  });
  if (heil.eins === 3 && heil.fuenf === 5.4) note(`✓ Zähe Natur (m16-r1): Stufe 3 heilt je Schlag ${heil.eins}, mit fünf Zielen ${heil.fuenf} (vorher 22,5)`);
  else fail(`Zähe Natur: ${JSON.stringify(heil)}`);

  // F11: Türme lernen je Schadenspunkt ein Viertel
  const rang = await z((id) => {
    const g = window.zomfy.game;
    const b = g.world.buildings.get(id);
    const vor = b.xp || 0;
    g.towerRanks.onDamage(id, 100);
    return { vor, nach: b.xp || 0 };
  }, setup.towers[0]?.id);
  if (rang.nach - rang.vor === 25) note('✓ Turm-Erfahrung (m16-r1): 100 Schaden bringen 25 Erfahrung (vorher 100)');
  else fail(`Turm-Erfahrung: ${JSON.stringify(rang)}`);

  // F13: Eine Barrikade außerhalb jedes Turmkreises wird beim Setzen genannt
  const reicht = await z((t) => {
    const g = window.zomfy.game;
    const col = window.zomfy.pathColumn(-40);
    const far = col.length ? g.builder.towerReaches(-40 + 0.5, col[0] + 0.5) : null;
    const b = g.world.buildings.get(t.id);
    const c = g.world.buildings.bounds(b);
    return { weit: far, nah: g.builder.towerReaches(c.x + 1, c.z) };
  }, setup.towers[0]);
  if (reicht.weit === false && reicht.nah === true) note(`✓ Barrikade (m16-r1): weit draußen reicht kein Turm hin – der Hinweis »${TX.keinTurm}« erscheint beim Setzen`);
  else fail(`Barrikade außer Reichweite: ${JSON.stringify(reicht)}`);

  checkMessages(session);
  await session.context.close();
}

/**
 * M17 – Tor und Wall (Abschnitt `lager`): Das Lager steht von Anfang an (Wall
 * und Tor am Westrand, der letzte Weg läuft durchs Tor); Mika geht mit echter
 * Taste durch die Schlupftür; tagsüber nagt ein Streuner das Tor nur bis drei
 * Viertel an; nachts fällt es mit Banner, die Horde wirft im Lager die
 * Werkbank um, der Morgenbericht nennt Durchbruch und Schaden; Tor und
 * Werkbank tagsüber mit echten Tasten wieder aufbauen, das Tor zur Palisade
 * ausbauen; Zubehör an einer Barrikadenreihe mit echten Tasten (Dornen,
 * Laterne, Pechkessel), das im Kampf wirkt; die Alarmglocke läutet, Bert
 * flickt; Speichern v30 und Migration v11 → v30 (Bilder: lager, lager-nacht,
 * zubehoer).
 */
async function runCampChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Tor und Wall (M17)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m17')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m17', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const KEYS = ['KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyC'];
  const ruhig = () =>
    z(() => {
      window.__zomfyHold = true;
      for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut']) window.zomfy.setFlag(f);
      window.zomfy.setWeather('klar');
      window.zomfy.setHorde(false);
    });
  await ruhig();
  await z(() => {
    window.zomfy.setDay(2);
    window.zomfy.setTime(10, 0);
    window.zomfy.give({ holz: 120, stein: 60, schrott: 120, zahnraeder: 6, stoff: 12, fasern: 20 });
  });
  // Knopf eine Taste in einer Leiste: welche Kachel trägt diese Option? (Kaufen braucht zwei Drücke)
  const option = async (id, zweimal) => {
    const idx = await z((oid) => window.zomfy.game.builder.options('tuerme').findIndex((o) => o.id === oid), id);
    if (idx < 0) return false;
    await page.keyboard.press(KEYS[idx]);
    await step(150);
    if (zweimal) {
      await page.keyboard.press(KEYS[idx]);
      await step(150);
    }
    await step(500);
    return true;
  };

  // 1) Das Lager steht: Tor über dem letzten Weg, Wall von Ufer zu Ufer
  const lager = await z(() => ({ camp: window.zomfy.camp(), x: window.zomfy.lager().campX, weg: window.zomfy.pathColumn(-8) }));
  const tor = lager.camp.find((b) => b.type === 'tor');
  const meter = lager.camp.reduce((n, b) => n + (b.type === 'wall4' ? 4 : b.type === 'tor' ? 5 : 3), 0);
  if (tor && tor.level === 1 && tor.hp === tor.max && meter === 24 && lager.x === -7 && lager.weg.length && lager.weg.every((j) => j >= tor.j && j < tor.j + 5)) {
    note(`✓ Lager (M17): Weidenzaun mit Tor von Anfang an – ${lager.camp.length - 1} Wall-Abschnitte und das Tor (${tor.max}), 24 m von Ufer zu Ufer, der letzte Weg läuft durchs Tor`);
  } else fail(`Lager: ${JSON.stringify(lager)}`);

  // 2) Schlupftür: A führt Mika hinaus (die Laufhilfe lenkt von der Seite zur Tür), D wieder herein
  await z((t) => window.zomfy.teleport(t.i + 3.5, t.j + 3.9, -Math.PI / 2), tor);
  await step(300);
  const gehen = async (key) => {
    let offen = 0;
    await page.keyboard.down(key);
    for (let k = 0; k < 36; k++) {
      await step(100);
      offen = Math.max(offen, await z(() => window.zomfy.camp().find((b) => b.type === 'tor').wicket));
    }
    await page.keyboard.up(key);
    await step(100);
    return { x: await z(() => window.zomfy.game.player.position.x), offen };
  };
  const hinaus = await gehen('KeyA');
  const herein = await gehen('KeyD');
  if (hinaus.x < tor.i - 1.5 && hinaus.offen > 0.8 && herein.x > tor.i + 2) note(`✓ Schlupftür: A führt Mika hinaus (x ${hinaus.x.toFixed(1)}, die Tür schwingt auf), D wieder herein`);
  else fail(`Schlupftür: ${JSON.stringify({ hinaus, herein, tor: tor.i })}`);

  // 3) Tagsüber: ein Streuner kommt nicht durch und nagt das Tor nur bis drei Viertel an
  await z((t) => window.zomfy.spawnZombie('schlurfer', t.i - 2.5, t.j + 2.5), tor);
  await z((t) => window.zomfy.teleport(t.i + 2.6, t.j + 3.2, 0), tor);
  for (let k = 0; k < 24; k++) await step(1000);
  await page.screenshot({ path: join(SHOTS, 'lager.png') });
  note('  Screenshot: screenshots/lager.png');
  const tag = await z(() => ({ tor: window.zomfy.camp().find((b) => b.type === 'tor'), zs: window.zomfy.zombies().map((q) => ({ x: q.x, s: q.state })) }));
  if (tag.tor.hp >= tag.tor.max * 0.75 - 1 && tag.tor.hp < tag.tor.max && tag.zs.length === 1 && tag.zs[0].x < tor.i && tag.zs[0].s === 'smash') note(`✓ Tor am Tag: Ein Streuner schlägt davor, kommt nicht durch und nagt es nur bis drei Viertel an (${tag.tor.hp}/${tag.tor.max})`);
  else fail(`Tor am Tag: ${JSON.stringify(tag)}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1500);

  // 4) Nacht: Werkbank im Hof, ein Trupp vor dem Tor – es fällt, die Horde wirft die Werkbank um
  const bank = await z((t) => {
    const Z = window.zomfy;
    for (const [i, j] of [[t.i + 3, t.j - 2], [t.i + 3, t.j + 6], [t.i + 4, t.j - 3], [t.i + 5, t.j + 7], [t.i + 2, t.j - 4]]) if (Z.placeCheck('werkbank', i, j).ok && Z.build('werkbank', i, j) === 'ok') return Z.buildings().find((b) => b.type === 'werkbank');
    return null;
  }, tor);
  await z((t) => {
    const Z = window.zomfy;
    Z.setTime(21, 0);
    Z.game.nights.beginNight(2);
    Z.game.nights.queue.length = 0;
    Z.teleport(t.i + 12, t.j + 9, 0);
    for (let k = 0; k < 6; k++) Z.spawnZombie(k === 0 ? 'brummer' : 'schlurfer', t.i - 2 - (k % 3) * 0.6, t.j + 1.5 + Math.floor(k / 3) * 1.2);
  }, tor);
  let banner = null;
  let fiel = null;
  let umgeworfen = null;
  for (let k = 0; k < 90 && !umgeworfen; k++) {
    await step(1000);
    const s = await z(() => ({ tor: window.zomfy.camp().find((b) => b.type === 'tor'), l: window.zomfy.lager(), banner: window.zomfy.game.hud.banner?.text || null }));
    if (s.tor.broken && fiel === null) {
      fiel = k + 1;
      banner = s.banner;
    }
    if (s.l.umgeworfen.length) umgeworfen = s.l;
  }
  // Bild: Mika stellt sich im Hof dem Trupp
  await z((b) => window.zomfy.teleport(b.i + 1, b.j + 2.6, Math.PI), bank);
  await step(1200);
  await page.screenshot({ path: join(SHOTS, 'lager-nacht.png') });
  note('  Screenshot: screenshots/lager-nacht.png');
  const wb = umgeworfen?.umgeworfen.find((b) => b.type === 'werkbank');
  if (bank && fiel !== null && banner === 'Das Tor ist gefallen!' && wb && wb.prompt === 'auswaehlen' && umgeworfen.nacht.breach?.gate && umgeworfen.nacht.inCamp >= 3) {
    note(`✓ Durchbruch: Das Tor fällt nach ${fiel} s (Banner „${banner}“), ${umgeworfen.nacht.inCamp} Schlurfer im Lager werfen die Werkbank um – E wählt sie danach nur noch aus`);
  } else fail(`Durchbruch: ${JSON.stringify({ bank, fiel, banner, umgeworfen })}`);

  // 5) Morgenbericht: wann das Tor fiel, wie viele kamen, was umgeworfen wurde
  await z(() => {
    window.zomfy.killAllZombies();
  });
  await step(1500);
  await z(() => {
    window.zomfy.endNight(true);
    window.zomfy.game.showReport();
  });
  await step(400);
  const bericht = await z(() => (window.zomfy.game.report.isOpen ? window.zomfy.game.report.lines().map((l) => l.text) : []));
  const fielZeile = bericht.find((l) => l.includes('fiel das Tor')) || '';
  const kamen = bericht.find((l) => l.includes('ins Lager')) || '';
  const um = bericht.find((l) => l.startsWith('Umgeworfen:')) || '';
  if (fielZeile && kamen && um.includes('Werkbank')) note(`✓ Morgenbericht: „${fielZeile}“ – „${kamen}“ – „${um}“`);
  else fail(`Morgenbericht nach dem Durchbruch: ${JSON.stringify(bericht)}`);
  await page.keyboard.press('KeyE');
  await step(300);

  // 6) Am Tag: Tor wieder aufbauen und zur Palisade ausbauen, Werkbank wieder aufstellen – mit echten Tasten
  await ruhig();
  await z((t) => {
    window.zomfy.setTime(9, 0);
    window.zomfy.teleport(t.i + 1.6, t.j + 2.5, -Math.PI / 2);
  }, tor);
  await step(300);
  await page.keyboard.press('KeyE');
  await step(300);
  const torAuswahl = await z(() => window.zomfy.game.builder.selection);
  const holz0 = await z(() => window.zomfy.state().inventory.holz);
  const aufgebaut = (await option(`rep-${tor.id}`, false)) && (await z(() => !window.zomfy.camp().find((b) => b.type === 'tor').broken));
  const holz1 = await z(() => window.zomfy.state().inventory.holz);
  const palisade = (await option('stufe2', true)) && (await z(() => window.zomfy.camp().find((b) => b.type === 'tor')));
  await page.keyboard.press('Escape');
  await step(200);
  await z((b) => window.zomfy.teleport(b.i + 1, b.j + 1.8, Math.PI), bank);
  await step(300);
  await page.keyboard.press('KeyE');
  await step(300);
  const bankAuswahl = await z(() => window.zomfy.game.builder.selection);
  await option(`rep-${bank.id}`, false);
  const bankDanach = await z((id) => {
    const b = window.zomfy.game.world.buildings.get(id);
    return { broken: Boolean(b.broken), prompt: b.interaction.prompt };
  }, bank.id);
  await page.keyboard.press('Escape');
  await step(200);
  if (torAuswahl === tor.id && aufgebaut && holz0 - holz1 === 3 && palisade?.level === 2 && palisade.max === 350 && bankAuswahl === bank.id && !bankDanach.broken && bankDanach.prompt !== 'auswaehlen') {
    note(`✓ Wiederaufbau: E und Q bauen das Tor wieder auf (${holz0 - holz1} Holz), Q Q machen es zur Palisade (${palisade.max}); die Werkbank steht nach E und Q wieder und lässt sich benutzen`);
  } else fail(`Wiederaufbau: ${JSON.stringify({ torAuswahl, aufgebaut, holz: [holz0, holz1], palisade, bankAuswahl, bankDanach })}`);

  // 7) Zubehör an einer Barrikadenreihe mit echten Tasten: Dornen, Laterne, Pechkessel – und im Kampf
  const reihe = await z(() => {
    const Z = window.zomfy;
    const col = Z.pathColumn(-11);
    const j = col[Math.floor(col.length / 2)];
    for (const jj of col) Z.build('barrikade', -11, jj, 1);
    Z.teleport(-11 + 0.5 + 1.2, j + 0.5, -Math.PI / 2);
    return { col, bar: Z.buildings().find((q) => q.type === 'barrikade' && q.j === j) };
  });
  await step(300);
  await page.keyboard.press('KeyE');
  await step(300);
  const dornenDa = await option('zubehoer-dornen', true);
  const nachDornen = await z((id) => ({ gear: [...window.zomfy.game.world.buildings.get(id).gear], voll: window.zomfy.game.builder.options('tuerme').filter((o) => o.id.startsWith('zubehoer-')).every((o) => o.disabled) }), reihe.bar.id);
  await z((id) => {
    window.zomfy.upgradeBarricade(id);
    window.zomfy.upgradeBarricade(id);
  }, reihe.bar.id);
  await step(100);
  await option('zubehoer-laterne', true);
  await option('zubehoer-pech', true);
  const gear = await z((id) => [...window.zomfy.game.world.buildings.get(id).gear], reihe.bar.id);
  await page.keyboard.press('Escape');
  await step(200);
  // Die übrigen der Reihe genauso (die Horde nimmt irgendeine), dann ein Trupp in der Nacht
  await z((id) => {
    const Z = window.zomfy;
    for (const b of Z.game.world.buildings.list.filter((q) => q.type === 'barrikade' && q.id !== id)) {
      Z.upgradeBarricade(b.id);
      Z.upgradeBarricade(b.id);
      for (const g of ['dornen', 'laterne', 'pech']) Z.addGear(b.id, g);
    }
    Z.setTime(21, 30);
    Z.game.nights.beginNight(2);
    Z.game.nights.queue.length = 0;
  }, reihe.bar.id);
  await z(() => window.zomfy.game.applySettings({ view: 'nah' }));
  await step(2500); // Meldungen verblassen
  await page.screenshot({ path: join(SHOTS, 'zubehoer.png') });
  note('  Screenshot: screenshots/zubehoer.png');
  await z(() => window.zomfy.game.applySettings({ view: 'weit' }));
  const trupp = await z((b) => {
    const Z = window.zomfy;
    Z.teleport(b.i + 9, b.j + 4, 0);
    return [0, 1, 2].map((k) => Z.spawnZombie('schlurfer', b.i - 1.6 - k * 0.5, b.j + 0.35 + k * 0.15));
  }, reihe.bar);
  let brand = false;
  let blende = 0;
  for (let k = 0; k < 16; k++) {
    await step(500);
    const s = await z((ids) => ids.map((id) => {
      const q = window.zomfy.game.horde.list.find((o) => o.id === id);
      return q ? { burn: q.burnT, blind: window.zomfy.game.world.buildings.gearSlow(q.x, q.z) } : null;
    }), trupp);
    brand = brand || s.some((q) => q && q.burn > 0);
    blende = Math.max(blende, ...s.map((q) => (q ? q.blind : 0)));
  }
  const kampf = await z((ids) => ({
    hp: ids.map((id) => window.zomfy.game.horde.list.find((q) => q.id === id)?.hp ?? 0),
    pech: window.zomfy.game.world.buildings.list.filter((b) => b.type === 'barrikade' && b.pechNight === window.zomfy.state().night.n).length,
  }), trupp);
  if (dornenDa && nachDornen.gear.join() === 'dornen' && nachDornen.voll && gear.join() === 'dornen,laterne,pech' && brand && blende > 0 && kampf.pech >= 1 && kampf.hp.every((hp) => hp < 30)) {
    note(`✓ Zubehör: R R bringt Dornen an (danach ist die Holzbarriere voll), das Metallkreuz trägt dazu Laterne und Pechkessel; im Kampf stechen die Dornen, der Kessel kippt einmal und setzt den Trupp in Brand, die Laterne bremst um ${Math.round(blende * 100)} % (Leben ${kampf.hp.join('/')} von 30)`);
  } else fail(`Zubehör: ${JSON.stringify({ dornenDa, nachDornen, gear, brand, blende, kampf })}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1500);

  // 8) Alarmglocke am Tor: läutet beim ersten Schlag der Nacht, Bert flickt
  const glocke = await z((t) => {
    const Z = window.zomfy;
    Z.setSurvivor('bert', 3);
    Z.setSurvivor('knopf', 3);
    Z.addGear(t.id, 'glocke');
    Z.setTime(22, 0);
    Z.game.nights.beginNight(2);
    Z.game.nights.queue.length = 0;
    Z.hitCamp(t.id, 200);
    Z.teleport(t.i + 12, t.j + 6, 0);
    Z.spawnZombie('schlurfer', t.i - 0.8, t.j + 1.2);
    return Z.camp().find((b) => b.type === 'tor').hp;
  }, tor);
  let laeutet = null;
  let geflickt = 0;
  let vorher = glocke;
  for (let k = 0; k < 16; k++) {
    await step(500);
    laeutet = laeutet || (await z(() => window.zomfy.game.hud.banner?.text || null));
    const hp = await z(() => window.zomfy.camp().find((b) => b.type === 'tor').hp);
    if (hp > vorher) geflickt = hp - vorher;
    vorher = hp;
  }
  if (laeutet === 'Die Glocke läutet – sie sind am Tor!' && geflickt >= 60) note(`✓ Alarmglocke: läutet beim ersten Schlag der Nacht („${laeutet}“), Bert flickt das Tor um ${geflickt}`);
  else fail(`Alarmglocke: ${JSON.stringify({ laeutet, geflickt, glocke })}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1500);

  // 9) Speichern v30: Stufe, Zubehör und Umgeworfenes bleiben nach dem Neuladen
  await z((b) => {
    const Z = window.zomfy;
    Z.setTime(10, 0);
    Z.raidHit(b.id, 999);
    Z.save();
  }, bank);
  await page.reload({ timeout: 120000 });
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await ruhig();
  const geladen = await z(() => ({ v: window.zomfy.state().version, camp: window.zomfy.camp(), bs: window.zomfy.buildings() }));
  const gTor = geladen.camp.find((b) => b.type === 'tor');
  const gBank = geladen.bs.find((b) => b.type === 'werkbank');
  const gBar = geladen.bs.find((b) => b.id === reihe.bar.id);
  if (geladen.v === 30 && gTor.level === 2 && gTor.gear.join() === 'glocke' && gBank?.broken && gBar?.gear?.join() === 'dornen,laterne,pech' && gBar.level === 3) note('✓ Speichern v30: Palisade, Zubehör und die umgeworfene Werkbank bleiben nach dem Neuladen');
  else fail(`Speichern v30 (Lager): ${JSON.stringify({ v: geladen.v, tor: gTor, bank: gBank, bar: gBar })}`);
  checkMessages(session);
  await session.context.close();

  // Migration v11 → v30: Ein alter Stand bekommt den Weidenzaun mit Tor; ein Turm auf der Linie kommt in den Vorrat
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v11 → v30', {
    init: () => {
      if (sessionStorage.getItem('zomfy-v11')) return;
      localStorage.setItem(
        'zomfy-towers.spielstand',
        JSON.stringify({
          version: 11,
          time: { day: 5, minute: 300 },
          player: { x: 2, z: 3, facing: 0, lantern: false, hp: 90, xp: 5, level: 3, name: 'Kira', look: { hat: 'rot', jacket: 'gruen', hair: 'braun', skin: 'mittel' } },
          inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
          world: { mapSeed: 3, houseLevel: 1, homeHp: 300, buildings: [{ id: 1, type: 'bolzen', i: -8, j: -7, turns: 0, level: 1 }, { id: 2, type: 'bolzen', i: -6, j: -6, turns: 0, level: 1 }], nodes: {} },
          flags: { introGesehen: true },
          difficulty: 'ausgewogen',
        })
      );
      sessionStorage.setItem('zomfy-v11', '1');
    },
  });
  const m = await alt.page.evaluate(() => ({ st: window.zomfy.state(), camp: window.zomfy.camp(), meldungen: window.zomfy.game.hud.toasts.map((t) => t.text) }));
  const tuerme = m.st.world.buildings.filter((b) => b.type === 'bolzen');
  if (m.st.version === 30 && m.camp.length === 7 && m.camp.every((b) => b.level === 1) && tuerme.length === 1 && tuerme[0].i === -6 && m.st.inventory.schrott > 7 && m.meldungen.some((t) => t.startsWith('Mika hat einen Weidenzaun'))) {
    note(`✓ Migration: Spielstand v11 wird zu v30 – der Weidenzaun mit Tor steht, der Turm auf der Linie liegt wieder im Vorrat (Schrott 7 → ${m.st.inventory.schrott}), der daneben bleibt`);
  } else fail(`Migration v11 → v30: ${JSON.stringify({ v: m.st.version, camp: m.camp.length, tuerme, inv: m.st.inventory, meldungen: m.meldungen })}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M18 – Zusammenspiel (Abschnitt `reaktionen`): Türme hinterlassen Zustände an
 * den Schlurfern (Zeichen über dem Kopf), zwei passende treffen sich zu einer
 * Reaktion mit Wort und Wirkung – Eisblock (nass + frostig, zerspringt beim
 * nächsten Treffer), Dampf (nass + Brand), Glut (Brand + matschig),
 * Schwachstelle (geblendet + Bolzen), Splitter (frostig + Streukürbis),
 * Klebekürbis (matschig + Kürbis) –, jede mit echten Türmen am Weg; jede
 * Entdeckung steht im Notizbuch (Pausenmenü, echte Tasten); Regen macht alle
 * nass, Nebel kürzt die Reichweite; Speichern v30 und Migration v12 → v30
 * (Bilder: reaktionen, notizbuch).
 */
async function runReactionChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Zusammenspiel (M18)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m18')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m18', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(60);
  };
  await z(() => {
    window.__zomfyHold = true;
    window.zomfy.quietChoices(); // Stufen vom Aufräumen: Perk und Fähigkeit still wählen (sonst hält die Wahl alles an)
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut']) window.zomfy.setFlag(f);
    window.zomfy.setWeather('klar', true);
    window.zomfy.setHorde(false);
    window.zomfy.setDay(4);
    window.zomfy.setTime(11, 0);
    window.zomfy.give({ holz: 300, stein: 100, schrott: 500, zahnraeder: 30, stoff: 20, moderkerne: 8 });
  });

  // Zwei Türme an einer Wegspalte: der Zustands-Turm stromauf, der zweite dahinter; ein Trupp läuft vorbei
  let bild = false;
  const versuch = async (i, typen) => {
    const setup = await z(({ i, typen }) => {
      const Z = window.zomfy;
      for (const b of Z.game.world.buildings.list.filter((q) => ['bolzen', 'katapult', 'sprenger', 'laternenturm'].includes(q.type))) Z.game.world.buildings.remove(b.id);
      Z.game.world.pathing.rebuild();
      const col = Z.pathColumn(i);
      const top = Math.min(...col);
      const bot = Math.max(...col);
      const spotsFor = (k) => (k === 0 ? [[i - 2, top - 1], [i - 2, bot + 1], [i - 3, top - 1], [i - 3, bot + 1]] : k === 1 ? [[i + 1, bot + 1], [i + 1, top - 1], [i + 2, bot + 1], [i + 2, top - 1]] : [[i + 3, top - 1], [i + 3, bot + 1], [i + 4, top - 1], [i + 4, bot + 1]]);
      const out = [];
      typen.forEach(([type, level, spec], k) => {
        for (const [a, b] of spotsFor(k)) {
          if (Z.placeCheck(type, a, b).ok && Z.build(type, a, b) === 'ok') {
            const t = Z.buildings().find((q) => q.type === type && q.i === a && q.j === b);
            if (level >= 2) Z.upgradeTower(t.id, 2, null);
            if (level >= 3) Z.upgradeTower(t.id, 3, spec);
            out.push(`${type}${level}${spec || ''}`);
            break;
          }
        }
      });
      Z.teleport(i + 5, bot + 3.5, 0);
      const jj = col[Math.floor(col.length / 2)] + 0.5;
      for (let k = 0; k < 4; k++) Z.spawnZombie(k % 2 ? 'schlurfer' : 'brummer', i - 9 - k * 0.8, jj + (k % 2) * 0.4);
      return out;
    }, { i, typen });
    const worte = new Set();
    let zeichen = 0;
    for (let k = 0; k < 44; k++) {
      await step(500);
      for (const w of await z(() => window.zomfy.words())) worte.add(w);
      zeichen = Math.max(zeichen, await z(() => window.zomfy.game.hud.statusShown || 0));
      if (!bild && worte.size && zeichen) {
        bild = true;
        await page.screenshot({ path: join(SHOTS, 'reaktionen.png') });
        note('  Screenshot: screenshots/reaktionen.png');
      }
    }
    await z(() => window.zomfy.killAllZombies());
    await step(1200);
    return { setup, worte: [...worte], zeichen };
  };
  const plan = {
    eisblock: [-12, [['sprenger', 2], ['sprenger', 3, 'A'], ['bolzen', 2]]], // der Bolzen lässt ihn zerspringen (bei −8 steht der Wall)
    dampf: [-14, [['sprenger', 2], ['katapult', 3, 'A']]],
    glut: [-17, [['sprenger', 3, 'B'], ['katapult', 3, 'A']]],
    schwachstelle: [-20, [['laternenturm', 1], ['bolzen', 2]]],
    splitter: [-13, [['sprenger', 3, 'A'], ['katapult', 3, 'B']]],
    klebekuerbis: [-16, [['sprenger', 3, 'B'], ['katapult', 2]]],
  };
  const ergebnis = {};
  for (const [name, [i, typen]] of Object.entries(plan)) ergebnis[name] = await versuch(i, typen);
  const notes = await z(() => window.zomfy.notes());
  const gefunden = Object.keys(plan).filter((k) => notes[k]);
  const mitWort = Object.entries(ergebnis).filter(([k, r]) => r.worte.some((w) => w.startsWith(k === 'klebekuerbis' ? 'Klebekürbis' : k.charAt(0).toUpperCase() + k.slice(1)))).map(([k]) => k);
  if (gefunden.length === 6 && mitWort.length === 6 && ergebnis.eisblock.worte.includes('Klirr!') && Object.values(ergebnis).every((r) => r.zeichen > 0)) {
    note(`✓ Reaktionen (M18): alle sechs mit echten Türmen am Weg – ${Object.entries(ergebnis).map(([k, r]) => `${k} (${r.setup.join(' + ')})`).join(', ')}; Zeichen über den Köpfen, das Wort poppt auf, der Eisblock zerspringt („Klirr!“)`);
  } else fail(`Reaktionen: ${JSON.stringify({ gefunden, mitWort, ergebnis })}`);

  // Wetter: Regen macht nass, Nebel kürzt die Reichweite (außer im Schein einer Laterne)
  const wetter = await z(() => {
    const Z = window.zomfy;
    Z.setWeather('regen', true);
    return Z.spawnZombie('schlurfer', -20, 1.5);
  });
  await step(600);
  const nass = await z((id) => window.zomfy.statuses().find((q) => q.id === id)?.nass || 0, wetter);
  const reichweite = {};
  for (const w of ['nebel', 'klar']) {
    await z((w) => window.zomfy.setWeather(w, true), w);
    await step(200);
    reichweite[w] = await z(() => {
      const t = window.zomfy.game.world.buildings.list.find((q) => q.type === 'katapult');
      return window.zomfy.towerReach(t.id);
    });
  }
  await z(() => window.zomfy.killAllZombies());
  await step(800);
  if (nass > 0 && reichweite.nebel < reichweite.klar * 0.85) note(`✓ Wetter wirkt (M18): im Regen ist der Schlurfer nass, im Nebel reicht der Katapult ${reichweite.nebel} statt ${reichweite.klar} m`);
  else fail(`Wetter: ${JSON.stringify({ nass, reichweite })}`);

  // Notizbuch mit echten Tasten: Esc, mit S zur Zeile »Notizbuch«, E
  await tap('Escape');
  const zeilen = await z(() => window.zomfy.game.menu.buttons().map((b) => b.label));
  for (let k = 0; k < zeilen.indexOf('Notizbuch'); k++) await tap('KeyS');
  await tap('KeyE');
  await step(300);
  // mit S zur dritten Zeile (Glut): darunter stehen, was geschieht, und Yusufs Notiz
  await tap('KeyS');
  await tap('KeyS');
  await step(200);
  const buch = await z(() => {
    const m = window.zomfy.game.menu;
    const L = m.layout(window.zomfy.game.ui);
    return { screen: m.screen, lines: m.noteLines().map((l) => l.text), shown: L.notes?.shown, detail: (L.notes?.detail || []).map((l) => l.text), h: L.h };
  });
  await page.screenshot({ path: join(SHOTS, 'notizbuch.png') });
  note('  Screenshot: screenshots/notizbuch.png');
  await tap('Escape');
  await tap('Escape');
  // 270 Zeilen: die kleinste Höhe der Oberfläche (z. B. 540 Pixel hohe Fenster)
  if (buch.screen === 'notes' && buch.lines[0] === '6 von 6 entdeckt' && buch.lines.some((l) => l.startsWith('Eisblock · entdeckt an Tag 4')) && buch.shown === 'glut' && buch.detail.some((l) => l.startsWith('Dr. Yusuf:')) && buch.h <= 270)
    note(`✓ Notizbuch: Esc, S, E öffnen es – „${buch.lines[0]}“, je Reaktion Name und Tag; S wählt Glut, darunter was geschieht und Yusufs Notiz (${buch.h} Zeilen hoch)`);
  else fail(`Notizbuch: ${JSON.stringify(buch)}`);

  // Speichern v30: das Notizbuch bleibt
  await z(() => window.zomfy.save());
  await page.reload({ timeout: 120000 });
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z(() => ({ v: window.zomfy.state().version, notes: window.zomfy.notes() }));
  if (geladen.v === 30 && Object.keys(geladen.notes).length === 6) note('✓ Speichern v30: Das Notizbuch bleibt nach dem Neuladen');
  else fail(`Speichern v30 (Notizbuch): ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // Migration v12 → v30: Das Notizbuch beginnt leer
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v12 → v30', {
    init: () => {
      if (sessionStorage.getItem('zomfy-v12')) return;
      localStorage.setItem(
        'zomfy-towers.spielstand',
        JSON.stringify({
          version: 12,
          time: { day: 6, minute: 300 },
          player: { x: 2, z: 3, facing: 0, lantern: false, hp: 90, xp: 5, level: 3, name: 'Kira', look: { hat: 'rot', jacket: 'gruen', hair: 'braun', skin: 'mittel' } },
          inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
          world: { mapSeed: 3, houseLevel: 1, homeHp: 300, buildings: [], nodes: {} },
          flags: { introGesehen: true },
          difficulty: 'ausgewogen',
        })
      );
      sessionStorage.setItem('zomfy-v12', '1');
    },
  });
  const m = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, notes: window.zomfy.notes(), camp: window.zomfy.camp().length }));
  if (m.v === 30 && Object.keys(m.notes).length === 0 && m.camp === 7) note('✓ Migration: Spielstand v12 wird zu v30 – das Notizbuch beginnt leer, das Lager steht');
  else fail(`Migration v12 → v30: ${JSON.stringify(m)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M19: Baupläne mit echten Tasten (erst der Morgenbericht, dann drei Karten,
 * Taste 1), die Reiter »Türme 2« und »Fallen« (Tab), die vier neuen Familien
 * am Weg – die Glocke betäubt, die Friedensglocke flickt, das Windrad schiebt
 * zurück, Bienen stechen durch Panzer, die Vogelscheuche lockt, fällt um und
 * wird geflickt –, fünf Fallen (sperren den Weg nie; Stachelbrett, Leim,
 * Kletten, Knallerbsen, Ölspur mit Feuer), neu richten, die Mühle mahlt,
 * Balduins Bauplan, Speichern v30 und Migration v13 → v30 (Bilder: bauplan,
 * spielzeug, fallen).
 */
async function runToyChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Spielzeug (M19)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m19')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m19', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(60);
  };
  await z(() => {
    window.__zomfyHold = true;
    window.zomfy.quietChoices(); // Stufen vom Aufräumen: Perk und Fähigkeit still wählen (sonst hält die Wahl alles an)
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut']) window.zomfy.setFlag(f);
    window.zomfy.setWeather('klar', true);
    window.zomfy.setHorde(false);
    window.zomfy.setDay(3);
    window.zomfy.setTime(21, 0);
    window.zomfy.give({ holz: 400, stein: 100, schrott: 800, fasern: 80, zahnraeder: 30, stoff: 20, moderkerne: 8, teile: 40 });
  });

  // 1) Bauplan nach einer gewonnenen Nacht: erst der Morgenbericht, dann drei Karten – Taste 1
  const vorher = await z(() => window.zomfy.blueprints());
  await z(() => window.zomfy.endNight(true));
  await step(1500);
  const wartet = await z(() => ({ b: window.zomfy.blueprints(), mode: window.zomfy.game.mode }));
  await z(() => window.zomfy.game.showReport());
  await step(700);
  const bericht = await z(() => window.zomfy.game.report.lines().map((l) => l.text));
  await tap('KeyE');
  await step(1500);
  const offen = await z(() => ({ b: window.zomfy.blueprints(), mode: window.zomfy.game.mode }));
  await step(500);
  await page.screenshot({ path: join(SHOTS, 'bauplan.png') });
  note('  Screenshot: screenshots/bauplan.png');
  await tap('Digit1');
  await step(300);
  const gewaehlt = await z(() => ({ b: window.zomfy.blueprints(), mode: window.zomfy.game.mode, tab: window.zomfy.game.buildbar.tabId, meldungen: window.zomfy.game.hud.toasts.map((t) => t.text) }));
  if (
    vorher.known.length === 0 &&
    vorher.tabs.join() === 'tuerme,figur,zuhause' &&
    wartet.b.choice?.options.length === 3 &&
    !wartet.b.open &&
    offen.b.open &&
    offen.mode === 'perk' &&
    gewaehlt.b.known.length === 1 &&
    gewaehlt.b.known[0] === offen.b.choice.options[0] &&
    !gewaehlt.b.choice &&
    gewaehlt.mode === 'play' &&
    gewaehlt.meldungen.some((t) => t.startsWith('Neuer Bauplan:'))
  ) {
    note(`✓ Baupläne (M19): nach der gewonnenen Nacht wartet eine Wahl (${offen.b.choice.options.join(', ')}), sie öffnet sich erst nach dem Morgenbericht; Taste 1 nimmt „${gewaehlt.b.known[0]}“ – Reiter „${gewaehlt.tab}“`);
  } else fail(`Baupläne: ${JSON.stringify({ vorher, wartet, bericht, offen, gewaehlt })}`);

  // 2) Alle Baupläne: zweite Türme-Seite und Reiter »Fallen«, Tab geht alle durch; die erste Seite bleibt Q R T G C
  const reiter = await z(() => {
    const Z = window.zomfy;
    for (const id of ['glockenturm', 'windrad', 'bienenkorb', 'vogelscheuche', 'stachelbrett', 'leimtopf', 'klettenteppich', 'knallerbsen', 'oelspur']) Z.giveBlueprint(id);
    Z.game.buildbar.tabId = 'tuerme';
    const b = Z.game.builder;
    return { tabs: b.tabs(), eins: b.options('tuerme').map((o) => o.id), zwei: b.options('tuerme2').map((o) => o.id), fallen: b.options('fallen').map((o) => o.id) };
  });
  const gesehen = [];
  for (let k = 0; k < reiter.tabs.length; k++) {
    gesehen.push(await z(() => window.zomfy.game.buildbar.tab));
    await tap('Tab');
  }
  if (reiter.tabs.join() === 'tuerme,tuerme2,fallen,figur,zuhause' && reiter.eins.join() === 'bolzen,katapult,sprenger,laternenturm,barrikade' && reiter.zwei.join() === 'glockenturm,windrad,bienenkorb,vogelscheuche' && reiter.fallen.length === 5 && gesehen.join() === reiter.tabs.join()) {
    note(`✓ Bauleiste (M19): Q R T G C bleiben, „Türme 2“ trägt ${reiter.zwei.join(', ')}, „Fallen“ ${reiter.fallen.join(', ')}; Tab geht alle Reiter durch`);
  } else fail(`Bauleiste mit Bauplänen: ${JSON.stringify({ reiter, gesehen })}`);

  // 3) Die Familien am Weg: je eine Wegspalte, der Turm daneben, ein Trupp läuft vorbei
  await z(() => {
    window.zomfy.setDay(4);
    window.zomfy.setTime(17, 30);
  });
  const aufstellen = (i, type, level = 1, spec = null, spawn = [['schlurfer', 3]]) =>
    z(
      ({ i, type, level, spec, spawn }) => {
        const Z = window.zomfy;
        for (const b of Z.game.world.buildings.list.filter((q) => !['wall3', 'wall4', 'tor'].includes(q.type))) Z.game.world.buildings.remove(b.id);
        Z.game.world.pathing.rebuild();
        Z.killAllZombies();
        const col = Z.pathColumn(i);
        const top = Math.min(...col);
        const bot = Math.max(...col);
        let t = null;
        for (const [a, b] of [[i, top - 1], [i, bot + 1], [i + 1, top - 1], [i + 1, bot + 1], [i - 1, top - 1]]) {
          if (Z.placeCheck(type, a, b).ok && Z.build(type, a, b) === 'ok') {
            t = Z.game.world.buildings.list.find((q) => q.type === type && q.i === a && q.j === b);
            break;
          }
        }
        if (!t) return null;
        if (level >= 2) Z.upgradeTower(t.id, 2, null);
        if (level >= 3) Z.upgradeTower(t.id, 3, spec);
        Z.teleport(i + 4, bot + 3.5, 0);
        const up = Z.pathColumn(i - 6); // stromauf: dort, wo der Weg in jener Spalte liegt
        const jj = (up.length ? up : col)[Math.floor((up.length ? up : col).length / 2)] + 0.5;
        const ids = [];
        let k = 0;
        for (const [kind, n] of spawn) for (let q = 0; q < n; q++, k++) ids.push(Z.spawnZombie(kind, i - 6 - k * 0.7, jj + (k % 2) * 0.4));
        return { id: t.id, i: t.i, j: t.j, ids, jj };
      },
      { i, type, level, spec, spawn }
    );

  // 3a) Glocke: Schlag, betäubt alle ringsum
  const glocke = await aufstellen(-12, 'glockenturm');
  let betaeubt = 0;
  for (let k = 0; k < 30 && !betaeubt; k++) {
    await step(200);
    betaeubt = await z(() => window.zomfy.statuses().filter((q) => q.betaeubt > 0).length);
  }
  const schlaege = await z(() => window.zomfy.bells());
  if (glocke && betaeubt > 0 && schlaege.rings > 0) note(`✓ Glockenturm (M19): Die Glocke schlägt, ${betaeubt} Schlurfer stehen betäubt`);
  else fail(`Glockenturm: ${JSON.stringify({ glocke, betaeubt, schlaege })}`);

  // 3b) Friedensglocke flickt eine angeschlagene Barrikade
  const frieden = await aufstellen(-15, 'glockenturm', 3, 'B', [['schlurfer', 1]]);
  const flick = await z((f) => {
    const Z = window.zomfy;
    const col = Z.pathColumn(f.i + 3);
    const j = col[0];
    Z.build('barrikade', f.i + 3, j);
    const bar = Z.game.world.buildings.list.find((q) => q.type === 'barrikade' && q.i === f.i + 3 && q.j === j);
    Z.hitBarricade(bar.id, 12);
    return { id: bar.id, hp: bar.hp };
  }, frieden);
  const vorFlick = (await z(() => window.zomfy.bells())).healed;
  for (let k = 0; k < 40; k++) {
    await step(200);
    if ((await z(() => window.zomfy.bells())).healed > vorFlick) break;
  }
  const nachFlick = await z((id) => ({ hp: window.zomfy.game.world.buildings.get(id)?.hp, healed: window.zomfy.bells().healed }), flick.id);
  if (nachFlick.healed > vorFlick && nachFlick.hp > flick.hp) note(`✓ Friedensglocke: Beim Schlag flickt sie die Barrikade daneben (${flick.hp} → ${Math.round(nachFlick.hp)})`);
  else fail(`Friedensglocke: ${JSON.stringify({ flick, vorFlick, nachFlick })}`);

  // 3c) Windrad: ein Stoß schiebt den Schlurfer den Weg zurück – gemessen an x (der Weg führt
  // hier nach Osten; die Restlänge des Flussfelds zählt nur ganze Felder und verschluckt kurze Stöße)
  const wind = await aufstellen(-18, 'windrad', 1, null, [['schlurfer', 1]]);
  let zurueck = 0;
  let weitest = null;
  for (let k = 0; k < 100 && zurueck <= 0.15; k++) {
    await step(100);
    const x = await z((id) => {
      const q = window.zomfy.game.horde.list.find((o) => o.id === id);
      return q && q.state !== 'dying' ? q.x : null;
    }, wind?.ids[0]);
    if (x === null) continue;
    weitest = weitest === null ? x : Math.max(weitest, x);
    zurueck = Math.max(zurueck, weitest - x);
  }
  if (wind && zurueck > 0.15) note(`✓ Windrad (M19): Ein Windstoß schiebt den Schlurfer ${zurueck.toFixed(2)} m den Weg zurück`);
  else fail(`Windrad: ${JSON.stringify({ wind, zurueck })}`);

  // 3d) Bienenkorb: ein Schwarm folgt einem Brummer und sticht durch die Panzerung
  const korb = await aufstellen(-13, 'bienenkorb', 3, 'A', [['brummer', 2]]);
  let schwaerme = 0;
  let hp0 = null;
  for (let k = 0; k < 40; k++) {
    await step(200);
    const s = await z(() => ({ sw: window.zomfy.swarms().length, hp: window.zomfy.statuses().reduce((a, q) => a + q.hp, 0) }));
    schwaerme = Math.max(schwaerme, s.sw);
    if (hp0 === null) hp0 = s.hp;
    if (k === 20) {
      await page.screenshot({ path: join(SHOTS, 'spielzeug.png') });
      note('  Screenshot: screenshots/spielzeug.png');
    }
  }
  const hp1 = await z(() => window.zomfy.statuses().reduce((a, q) => a + q.hp, 0));
  if (korb && schwaerme >= 2 && hp1 < hp0 - 20) note(`✓ Bienenkorb (M19): Die Königin schickt ${schwaerme} Schwärme, sie stechen die Brummer (Leben ${hp0} → ${hp1})`);
  else fail(`Bienenkorb: ${JSON.stringify({ korb, schwaerme, hp0, hp1 })}`);

  // 3e) Vogelscheuche: lockt vom Weg, wird zerschlagen, fällt um – und wird geflickt
  const scheuche = await aufstellen(-16, 'vogelscheuche', 1, null, [['schlurfer', 6]]);
  await z((id) => {
    window.zomfy.game.world.buildings.get(id).hp = 14; // schon angeschlagen: fällt bald um
  }, scheuche?.id);
  let gelockt = 0;
  let umgefallen = false;
  for (let k = 0; k < 120 && !umgefallen; k++) {
    await step(250);
    gelockt = Math.max(gelockt, await z(() => window.zomfy.lured().length));
    umgefallen = await z((id) => {
      const b = window.zomfy.game.world.buildings.get(id);
      return Boolean(b && b.hp <= 0 && Math.abs(b.object.rotation.x + Math.PI / 2) < 0.01);
    }, scheuche?.id);
  }
  await z(() => window.zomfy.killAllZombies());
  await step(400);
  const geflickt = await z((id) => {
    const Z = window.zomfy;
    const b = Z.game.world.buildings.get(id);
    Z.game.builder.repairBuilding(b);
    Z.game.towers.update(0);
    return { hp: b.hp, rot: b.object.rotation.x };
  }, scheuche?.id);
  if (scheuche && gelockt > 0 && umgefallen && geflickt.hp > 0 && geflickt.rot === 0) note(`✓ Vogelscheuche (M19): lockt ${gelockt} Schlurfer vom Weg, fällt unter den Schlägen um und steht nach dem Flicken wieder`);
  else fail(`Vogelscheuche: ${JSON.stringify({ scheuche, gelockt, umgefallen, geflickt })}`);

  // 4) Fallen: begehbar (sperren nie), jede wirkt, wenn ein Trupp darüberläuft
  await z(() => window.zomfy.setTime(15, 0));
  const fallen = await z(() => {
    const Z = window.zomfy;
    for (const b of Z.game.world.buildings.list.filter((q) => !['wall3', 'wall4', 'tor'].includes(q.type))) Z.game.world.buildings.remove(b.id);
    Z.game.world.pathing.rebuild();
    Z.killAllZombies();
    // Eine ganze Spalte voller Stachelbretter sperrt den Weg nicht (gebaut, dann gefragt:
    // kommt die Horde von jedem Eingang noch nach Hause? – vorher fragte der Test mit den
    // Feldern selbst als Sperre, das war immer »gesperrt«)
    const col = Z.pathColumn(-12);
    for (const j of col) Z.build('stachelbrett', -12, j);
    const sperrt = Z.pathBlocked([]);
    const out = { sperrt, gesetzt: {} };
    // M26: die Ölspur zuerst (der brennende Schlurfer zündet sie gleich an), dann die Stachelbretter –
    // hinter dem Leimtopf kam in allen Läufen höchstens einer bei ihnen an; der Leimtopf hält als letzter fest
    const plan = { oelspur: -21, stachelbrett: -19, knallerbsen: -17, klettenteppich: -15, leimtopf: -13 };
    for (const [type, i] of Object.entries(plan)) {
      const c = Z.pathColumn(i);
      let n = 0;
      for (const j of c) if (Z.build(type, i, j) === 'ok') n++;
      out.gesetzt[type] = n;
    }
    out.aufWiese = Z.placeCheck('leimtopf', -12, Math.min(...col) - 2).reason;
    Z.teleport(-10, Math.max(...col) + 4, 0);
    const up = Z.pathColumn(-25);
    const jj = up[Math.floor(up.length / 2)] + 0.5;
    const ids = [];
    for (let k = 0; k < 6; k++) ids.push(Z.spawnZombie(k % 3 ? 'schlurfer' : 'brummer', -25 - k * 0.8, jj + (k % 2) * 0.4));
    // einer brennt: Die Ölspur fängt Feuer
    const brenner = Z.game.horde.list.find((q) => q.id === ids[1]);
    Z.game.horde.ignite(brenner, 1, 60);
    return { ...out, ids };
  });
  let fallenBild = false;
  for (let k = 0; k < 90; k++) {
    await step(250);
    if (!fallenBild && k === 30) {
      fallenBild = true;
      await page.screenshot({ path: join(SHOTS, 'fallen.png') });
      note('  Screenshot: screenshots/fallen.png');
    }
  }
  const wirkung = await z(() => window.zomfy.traps());
  const s = wirkung.stats;
  const knall = wirkung.list.filter((t) => t.type === 'knallerbsen');
  const oel = wirkung.list.filter((t) => t.type === 'oelspur');
  if (!fallen.sperrt && fallen.aufWiese === 'nurWeg' && Object.values(fallen.gesetzt).every((n) => n > 0) && s.spikes > 0 && s.glued > 0 && s.burrs > 0 && s.pops > 0 && knall.some((t) => t.broken) && s.flames > 0 && oel.some((t) => t.broken)) {
    note(`✓ Fallen (M19): nur auf den Weg, sperren nie – Stiche ${s.spikes}, festgeklebt ${s.glued}, Kletten ${s.burrs}, Knall ${s.pops}, Flammenwand ${s.flames}; Knallerbsen und Ölspur danach verbraucht`);
  } else fail(`Fallen: ${JSON.stringify({ fallen, s, knall, oel })}`);
  // neu richten (tagsüber, kostet die Hälfte)
  const richten = await z(() => {
    const Z = window.zomfy;
    Z.killAllZombies();
    const b = Z.game.world.buildings.list.find((q) => q.type === 'knallerbsen' && q.broken);
    if (!b) return null;
    const vor = Z.state().inventory.schrott;
    Z.game.builder.repairBuilding(b);
    return { broken: Boolean(b.broken), schrott: vor - Z.state().inventory.schrott };
  });
  if (richten && !richten.broken && richten.schrott > 0) note(`✓ Fallen neu richten: Die Knallerbsen sind wieder scharf (${richten.schrott} Schrott)`);
  else fail(`Fallen neu richten: ${JSON.stringify(richten)}`);

  // 5) Mühle mahlt Schrott; Balduin verkauft an ungeraden Tagen einen Bauplan
  const muehle = await z(() => {
    const Z = window.zomfy;
    const col = Z.pathColumn(-14);
    Z.build('windrad', -14, Math.min(...col) - 1);
    const w = Z.game.world.buildings.list.find((q) => q.type === 'windrad');
    Z.upgradeTower(w.id, 2, null);
    Z.upgradeTower(w.id, 3, 'B');
    const vor = Z.state().inventory.schrott;
    const n = Z.grindMills();
    return { n, dazu: Z.state().inventory.schrott - vor };
  });
  if (muehle.n === 3 && muehle.dazu === 3) note('✓ Mühle (M19): Das Windrad mit Richtung Mühle mahlt 3 Schrott am Tag');
  else fail(`Mühle: ${JSON.stringify(muehle)}`);

  // 6) Speichern v30: Baupläne bleiben
  await z(() => window.zomfy.save());
  await page.reload({ timeout: 120000 });
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z(() => ({ v: window.zomfy.state().version, b: window.zomfy.blueprints(), fallen: window.zomfy.traps().list.length }));
  if (geladen.v === 30 && geladen.b.known.length === 9 && geladen.b.tabs.includes('fallen') && geladen.fallen > 0) note(`✓ Speichern v30: ${geladen.b.known.length} Baupläne und ${geladen.fallen} Fallen bleiben nach dem Neuladen`);
  else fail(`Speichern v30: ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // Balduin: an ungeraden Tagen ab Tag 3 ein Bauplan (Wahl aus drei), gerade Tage nicht
  const markt = await openGame(browser, `${url}index.html?test&playtest`, 'Balduins Bauplan', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m19b')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m19b', '1');
      }
    },
  });
  const handel = await markt.page.evaluate(() => {
    const Z = window.zomfy;
    Z.setDay(4);
    const gerade = Z.game.trader.offers().some((o) => o.key === 'bauplan');
    Z.setDay(5);
    Z.give({ teile: 20 });
    const ungerade = Z.game.trader.offers().some((o) => o.key === 'bauplan');
    const ok = Z.trade('bauplan');
    return { gerade, ungerade, ok, choice: Z.blueprints().choice };
  });
  if (!handel.gerade && handel.ungerade && handel.ok && handel.choice?.from === 'balduin' && handel.choice.options.length === 3) note(`✓ Balduin (M19): an Tag 5 ein Bauplan für Zombieteile – drei zur Wahl (${handel.choice.options.join(', ')})`);
  else fail(`Balduins Bauplan: ${JSON.stringify(handel)}`);
  checkMessages(markt);
  await markt.context.close();

  // Migration v13 → v30: Wer schon Nächte gewonnen hat, darf gleich wählen
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v13 → v30', {
    init: () => {
      if (sessionStorage.getItem('zomfy-v13')) return;
      localStorage.setItem(
        'zomfy-towers.spielstand',
        JSON.stringify({
          version: 13,
          time: { day: 6, minute: 300 },
          player: { x: 2, z: 3, facing: 0, lantern: false, hp: 90, xp: 5, level: 3, name: 'Kira', look: { hat: 'rot', jacket: 'gruen', hair: 'braun', skin: 'mittel' } },
          inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
          world: { mapSeed: 3, houseLevel: 1, homeHp: 300, buildings: [], nodes: {} },
          stats: { nightsWon: 3 },
          notes: { eisblock: 4 },
          flags: { introGesehen: true },
          difficulty: 'ausgewogen',
        })
      );
      sessionStorage.setItem('zomfy-v13', '1');
    },
  });
  const m = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, b: window.zomfy.blueprints(), notes: window.zomfy.notes() }));
  if (m.v === 30 && m.b.known.length === 0 && m.b.choice?.options.length === 3 && m.notes.eisblock === 4) note(`✓ Migration: Spielstand v13 wird zu v30 – nach drei gewonnenen Nächten wartet gleich ein Bauplan (${m.b.choice.options.join(', ')}), das Notizbuch bleibt`);
  else fail(`Migration v13 → v30: ${JSON.stringify(m)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M20 – Mischtürme (Abschnitt `misch`), nur der Kern: Zwei Türme ab Stufe 3
 * nebeneinander, die Auswahl zeigt »Verbinden: ???«, zwei echte Tastendrücke
 * machen daraus die Kürbisballiste auf beiden Feldern (Moderkern weg, Rezept
 * im Werkstattbuch, Banner); ihr Bolzen durchschlägt eine Reihe; übereinander
 * entsteht die Nebelleuchte (nass, geblendet); das Werkstattbuch mit Esc, S, E;
 * Speichern v30 und Migration v14 → v30 (Bilder: mischturm, werkstattbuch).
 */
async function runMixChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Mischtürme (M20)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m20')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m20', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(60);
  };
  await z(() => {
    window.__zomfyHold = true;
    window.zomfy.quietChoices(); // Stufen vom Aufräumen: Perk und Fähigkeit still wählen (sonst hält die Wahl alles an)
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut']) window.zomfy.setFlag(f);
    window.zomfy.setWeather('klar', true);
    window.zomfy.setHorde(false);
    window.zomfy.setDay(4);
    window.zomfy.setTime(16, 0);
    window.zomfy.give({ holz: 200, stein: 60, schrott: 600, zahnraeder: 30, moderkerne: 4, fasern: 20, stoff: 10 });
  });

  // Zwei Türme nebeneinander am Weg, beide auf Stufe 3 – eine Stelle, an der beide passen
  const paar = await z(() => {
    const Z = window.zomfy;
    for (const i of [-12, -14, -16, -10, -18]) {
      const col = Z.pathColumn(i);
      if (!col.length) continue;
      for (const j of [Math.min(...col) - 1, Math.max(...col) + 1]) {
        if (!Z.placeCheck('bolzen', i, j).ok || !Z.placeCheck('katapult', i + 1, j).ok) continue;
        if (Z.build('bolzen', i, j) !== 'ok' || Z.build('katapult', i + 1, j) !== 'ok') continue;
        const list = Z.buildings();
        const a = list.find((b) => b.type === 'bolzen' && b.i === i && b.j === j);
        const c = list.find((b) => b.type === 'katapult' && b.i === i + 1 && b.j === j);
        for (const t of [a, c]) {
          Z.upgradeTower(t.id, 2, null);
          Z.upgradeTower(t.id, 3, 'A');
        }
        return { a: a.id, c: c.id, i, j, col };
      }
    }
    return null;
  });
  // Auswahl: die Kachel »Verbinden: ???« – zwei echte Drücke auf ihre Taste
  const vorher = await z((p) => {
    // Die Auswahl gilt nur in Mikas Nähe (14 m) – sie steht neben den beiden Türmen
    window.zomfy.teleport(p.i + 1, p.j + (p.col[0] > p.j ? -2.5 : 2.5), 0);
    window.zomfy.selectBuilding(p.a);
    return { kerne: window.zomfy.state().inventory.moderkerne, partner: window.zomfy.mixPartners(p.a) };
  }, paar);
  await step(100);
  const kachel = await z(() => {
    const g = window.zomfy.game;
    const tile = g.buildbar.layout(g.ui).tiles.find((t) => t.option.id.startsWith('misch-'));
    return tile ? { key: ['KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyC', 'KeyV'][tile.keyIndex], name: tile.option.name } : null;
  });
  if (kachel) await tap(kachel.key);
  const einmal = await z(() => window.zomfy.buildings().filter((b) => b.type === 'kuerbisballiste').length);
  if (kachel) await tap(kachel.key);
  await step(300);
  const misch = await z(() => {
    const Z = window.zomfy;
    const list = Z.buildings();
    const m = list.find((b) => b.type === 'kuerbisballiste');
    return { m, alt: list.filter((b) => b.type === 'bolzen' || b.type === 'katapult').length, kerne: Z.state().inventory.moderkerne, rezepte: Z.recipes(), banner: Z.game.hud.banner?.text || null, zellen: m ? [Z.game.world.buildings.atCell(m.i, m.j)?.id, Z.game.world.buildings.atCell(m.i + 1, m.j)?.id] : [] };
  });
  if (paar && kachel?.name === 'Verbinden: ???' && vorher.partner.includes(paar.c) && einmal === 0 && misch.m && misch.m.level === 3 && misch.m.turns === 0 && misch.zellen.every((id) => id === misch.m.id) && misch.alt === 0 && misch.kerne === vorher.kerne - 1 && misch.rezepte.kuerbisballiste === 4 && misch.banner === 'Neues Rezept: Kürbisballiste!') {
    note(`✓ Mischturm (M20): Bolzenwerfer und Katapult (Stufe 3) nebeneinander – „${kachel.name}“, zwei Drücke auf ${kachel.key.slice(3)} machen daraus die Kürbisballiste auf beiden Feldern (ein Moderkern, Banner, Werkstattbuch)`);
  } else fail(`Mischturm: ${JSON.stringify({ paar, kachel, vorher, einmal, misch })}`);

  // Der schwere Bolzen durchschlägt eine Reihe: vier Schlurfer hintereinander zum Weg hin,
  // kurz betäubt, damit die Reihe steht
  await z((p) => {
    const Z = window.zomfy;
    Z.game.builder.selection = null;
    const m = Z.game.world.buildings.list.find((b) => b.type === 'kuerbisballiste');
    if (!m) return; // Verbinden scheiterte – steht schon oben als Fehler
    const c = Z.game.world.buildings.bounds(m);
    const dir = Math.sign(p.col[0] + 0.5 - c.z) || 1;
    for (let k = 0; k < 4; k++) {
      const id = Z.spawnZombie('schlurfer', c.x, c.z + dir * (2 + k * 0.7));
      Z.game.horde.list.find((q) => q.id === id).stunT = 4; // festhalten (eine Betäubung hielte am Stück nur 3 s, M25c)
    }
    Z.game.towers.maxPierce = 0;
    Z.teleport(c.x + 3, c.z - dir * 2.5, 0);
    Z.setHorde(true);
  }, paar);
  let durch = 0;
  for (let k = 0; k < 16 && durch < 2; k++) {
    await step(250);
    durch = await z(() => window.zomfy.game.towers.maxPierce);
  }
  await page.screenshot({ path: join(SHOTS, 'mischturm.png') });
  note('  Screenshot: screenshots/mischturm.png');
  if (durch >= 2) note(`✓ Kürbisballiste (M20): ein schwerer Bolzen durchschlägt ${durch} Schlurfer in einer Reihe und platzt am Ende`);
  else fail(`Kürbisballiste: ein Bolzen traf höchstens ${durch}`);
  await z(() => {
    window.zomfy.setHorde(false);
    window.zomfy.killAllZombies();
  });

  // Übereinander: Sprenger und Laternenturm werden die Nebelleuchte – nass und geblendet
  const nebel = await z((p) => {
    const Z = window.zomfy;
    for (const i of [-20, -22, -24, -8, -26]) {
      const col = Z.pathColumn(i);
      if (!col.length) continue;
      for (const j of [Math.min(...col) - 2, Math.max(...col) + 1]) {
        if (!Z.placeCheck('sprenger', i, j).ok || !Z.placeCheck('laternenturm', i, j + 1).ok) continue;
        if (Z.build('sprenger', i, j) !== 'ok' || Z.build('laternenturm', i, j + 1) !== 'ok') continue;
        const list = Z.buildings();
        const a = list.find((b) => b.type === 'sprenger' && b.i === i && b.j === j);
        const c = list.find((b) => b.type === 'laternenturm' && b.i === i && b.j === j + 1);
        for (const t of [a, c]) {
          Z.upgradeTower(t.id, 2, null);
          Z.upgradeTower(t.id, 3, 'A');
        }
        const id = Z.mergeTowers(a.id, c.id);
        const m = Z.buildings().find((b) => b.id === id);
        const jj = col[Math.floor(col.length / 2)] + 0.5;
        const zid = Z.spawnZombie('schlurfer', i + 0.5, jj);
        Z.setHorde(true);
        return { m, zid, rezepte: Z.recipes() };
      }
    }
    return null;
  }, paar);
  let zustand = null;
  for (let k = 0; k < 16; k++) {
    await step(250);
    zustand = await z((id) => window.zomfy.statuses().find((q) => q.id === id) || null, nebel?.zid);
    if (zustand && zustand.nass > 0 && zustand.geblendet > 0) break;
  }
  await z(() => {
    window.zomfy.setHorde(false);
    window.zomfy.killAllZombies();
  });
  if (nebel?.m?.type === 'nebelleuchte' && nebel.m.turns === 1 && nebel.rezepte.nebelleuchte === 4 && zustand?.nass > 0 && zustand.geblendet > 0) note('✓ Nebelleuchte (M20): Sprenger und Laternenturm übereinander – der Nebelstoß macht nass und blendet');
  else fail(`Nebelleuchte: ${JSON.stringify({ nebel, zustand })}`);

  // Werkstattbuch mit echten Tasten: Esc, mit S zur Zeile »Werkstattbuch«, E
  const vorBuch = await z(() => {
    const g = window.zomfy.game;
    g.builder.cancel(); // Esc bräche sonst erst die Auswahl des neuen Turms ab
    return { mode: g.mode, perk: Boolean(g.state.perkChoice), skill: Boolean(g.state.skillChoice), plan: Boolean(g.state.blueprintChoice) };
  });
  await step(2100); // Esc gleich nach dem letzten Bauen hieße »fertig«, nicht »Menü«
  await tap('Escape');
  const zeilen = await z(() => window.zomfy.game.menu.buttons().map((b) => b.label));
  for (let k = 0; k < zeilen.indexOf('Werkstattbuch'); k++) await tap('KeyS');
  await tap('KeyE');
  await step(300);
  const buch = await z(() => {
    const m = window.zomfy.game.menu;
    const L = m.layout(window.zomfy.game.ui);
    return { screen: m.screen, lines: m.buttons().map((b) => b.label), count: m.noteLines()[0].text, detail: (L.notes?.detail || []).map((l) => l.text), h: L.h };
  });
  await page.screenshot({ path: join(SHOTS, 'werkstattbuch.png') });
  note('  Screenshot: screenshots/werkstattbuch.png');
  await tap('Escape');
  await tap('Escape');
  if (buch.screen === 'recipes' && buch.count === '2 von 8 Rezepten' && buch.lines[0] === 'Kürbisballiste · gebaut an Tag 4' && buch.lines[1] === '???' && buch.detail.some((l) => l.includes('Bolzenwerfer + Kürbiskatapult')) && buch.h <= 270) note(`✓ Werkstattbuch (M20): Esc, S, E – „${buch.count}“, je Rezept Name und Tag, unentdeckte als „???“ (${buch.h} Zeilen hoch)`);
  else fail(`Werkstattbuch: ${JSON.stringify({ ...buch, vorBuch })}`);

  // Speichern v30: Mischtürme und Werkstattbuch bleiben
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z(() => {
    const Z = window.zomfy;
    const list = Z.buildings();
    return { v: Z.state().version, mix: list.filter((b) => b.type === 'kuerbisballiste' || b.type === 'nebelleuchte').map((b) => ({ type: b.type, turns: b.turns, level: b.level, from: (b.from || []).map((f) => f.t).join('+') })), rezepte: Z.recipes() };
  });
  if (geladen.v === 30 && geladen.mix.length === 2 && geladen.mix.some((m) => m.type === 'nebelleuchte' && m.turns === 1) && geladen.mix.every((m) => m.from.includes('+')) && Object.keys(geladen.rezepte).length === 2) note('✓ Speichern v30: Mischtürme (samt Herkunft) und Werkstattbuch bleiben nach dem Neuladen');
  else fail(`Speichern v30 (Mischtürme): ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // Migration v14 → v30: Das Werkstattbuch beginnt leer
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v14 → v30', {
    init: () => {
      const s = {
        version: 14,
        time: { day: 5, minute: 300 },
        player: { x: 2, z: 3, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [] },
        blueprints: ['glockenturm'],
        notes: { eisblock: 3 },
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const m = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, rezepte: window.zomfy.recipes(), plans: window.zomfy.state().blueprints, notes: window.zomfy.notes() }));
  if (m.v === 30 && Object.keys(m.rezepte).length === 0 && m.plans.includes('glockenturm') && m.notes.eisblock === 3) note('✓ Migration: Spielstand v14 wird zu v30 – das Werkstattbuch beginnt leer, Baupläne und Notizbuch bleiben');
  else fail(`Migration v14 → v30: ${JSON.stringify(m)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M21 (nur der Kern, CLAUDE.md »Keine Testspieler-Agenten mehr«): Ein Turm auf
 * Stufe 4 nimmt zwei Turmteile über die Tasten der Auswahl, ein drittes passt
 * nicht; das Brennglas setzt in Brand. Nacht 3 hat einen Champion im Plan, die
 * ersten beiden keinen. Ein Champion mit Schild trägt Namen und Merkmale über
 * dem Kopf, fällt und lässt eine Fundkiste liegen; mit echter Taste läuft Mika
 * hin, die Kiste platzt auf (Turmteil und Beute). Drei gleiche Teile ergeben an
 * der Werkbank eines der nächsten Seltenheit, Balduin verkauft eine Wundertüte.
 * Speichern v30 (auch ein lebender Champion) und Migration v15 → v30
 * (Bilder: champion, fundkiste).
 */
async function runShineChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Beute mit Glanz (M21)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m21')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m21', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(60);
  };
  await z(() => {
    window.__zomfyHold = true;
    window.zomfy.quietChoices(); // Stufen vom Aufräumen: Perk und Fähigkeit still wählen (sonst hält die Wahl alles an)
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut', 'turmteilHinweis']) window.zomfy.setFlag(f);
    window.zomfy.setWeather('klar', true);
    window.zomfy.setHorde(false);
    window.zomfy.setDay(4);
    window.zomfy.setTime(21, 30);
    window.zomfy.give({ holz: 200, stein: 60, schrott: 600, zahnraeder: 30, moderkerne: 4, teile: 40 });
  });

  // 1) Zwei Fächer ab Stufe 4: Kupferspule und Brennglas über die Tasten der Auswahl
  const turm = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    for (const i of [-12, -14, -10, -16]) {
      const col = Z.pathColumn(i);
      if (!col.length) continue;
      const j = Math.min(...col) - 1;
      if (Z.build('bolzen', i, j) !== 'ok') continue;
      const b = Z.buildings().find((q) => q.type === 'bolzen' && q.i === i && q.j === j);
      Z.upgradeTower(b.id, 2, null);
      Z.upgradeTower(b.id, 3, 'A');
      Z.upgradeTower(b.id, 4, 'A');
      for (const p of ['kupferspule', 'brennglas', 'uhrwerk']) g.state.towerParts[p] = 1;
      Z.teleport(i + 0.5, j - 2.5, 0);
      Z.selectBuilding(b.id);
      return { id: b.id, i, j, col };
    }
    return null;
  });
  const keyOf = (id) =>
    z((id) => {
      const g = window.zomfy.game;
      const tile = g.buildbar.layout(g.ui).tiles.find((t) => t.option.id === id);
      return tile ? ['KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyC', 'KeyV'][tile.keyIndex] : null;
    }, id);
  await step(100);
  const k1 = await keyOf('teil-kupferspule');
  if (k1) await tap(k1);
  await z((id) => window.zomfy.selectBuilding(id), turm?.id);
  await step(100);
  const k2 = await keyOf('teil-brennglas');
  if (k2) await tap(k2);
  await z((id) => window.zomfy.selectBuilding(id), turm?.id);
  await step(100);
  const k3 = await keyOf('teil-uhrwerk');
  const faecher = await z((id) => {
    const g = window.zomfy.game;
    const b = g.world.buildings.get(id);
    return { parts: [...(b?.parts || [])], title: g.builder.selectionTitle() || '', stock: { ...g.state.towerParts } };
  }, turm?.id);
  if (turm && k1 && k2 && !k3 && faecher.parts.join() === 'kupferspule,brennglas' && faecher.stock.uhrwerk === 1 && faecher.title.includes('Kupferspule, Brennglas')) {
    note(`✓ Turmteile (M21): Stufe 4 hat zwei Fächer – ${k1.slice(3)} baut die Kupferspule ein, ${k2.slice(3)} das Brennglas, fürs Uhrwerk ist kein Platz mehr (»${faecher.title}«)`);
  } else fail(`Turmteile, zwei Fächer: ${JSON.stringify({ turm, k1, k2, k3, faecher })}`);

  // 2) Champions im Plan: Nacht 1 und 2 keiner, Nacht 3 einer
  const plan = await z(() => [1, 2, 3].map((n) => window.zomfy.championPlan(n).length));
  // M25c: Auf »Wild« kommen Champions eine Nacht früher
  const wild = await z(() => {
    const st = window.zomfy.game.state;
    const vorher = st.difficulty;
    st.difficulty = 'wild';
    const r = [1, 2, 5].map((n) => window.zomfy.championPlan(n).length);
    st.difficulty = vorher;
    return r;
  });
  if (plan.join() === '0,0,1' && wild.join() === '0,1,1') note('✓ Champions (M21): Nacht 1 und 2 ohne, in Nacht 3 läuft einer mit; auf »Wild« schon in Nacht 2 (M25c)');
  else fail(`Champions im Plan: ${JSON.stringify({ plan, wild })}`);

  // 3) Ein Champion mit Schild: Name und Merkmale über dem Kopf; der Turm holt ihn, das Brennglas brennt
  const champ = await z((t) => {
    const Z = window.zomfy;
    Z.game.builder.selection = null;
    const x = t.i - 5;
    const col = Z.pathColumn(Math.floor(x));
    const id = Z.spawnZombie('schlurfer', x, col[Math.floor(col.length / 2)] + 0.5, { name: 3, traits: ['schildtragend', 'moosig'] });
    const mc = Z.pathColumn(t.i - 1);
    Z.teleport(t.i - 0.5, mc[Math.floor(mc.length / 2)] + 0.5, 0); // auf dem Weg neben ihm: der Champion mitten im Bild
    return { id, list: Z.champions() };
  }, turm);
  await step(900);
  const sichtbar = await z(() => window.zomfy.champions()[0] || null);
  await page.screenshot({ path: join(SHOTS, 'champion.png') });
  note('  Screenshot: screenshots/champion.png');
  let brannte = false;
  let schild = sichtbar?.shield || 0;
  for (let k = 0; k < 60; k++) {
    await step(250);
    const s = await z((id) => {
      const q = window.zomfy.game.horde.list.find((o) => o.id === id);
      return q ? { burn: q.burnT, shield: q.shield || 0, dying: q.state === 'dying' } : null;
    }, champ.id);
    if (s?.burn > 0) brannte = true;
    if (s) schild = Math.min(schild, s.shield);
    if (!s || s.dying) break;
  }
  const kiste = await z(() => ({ loot: window.zomfy.lootItems().filter((l) => l.res === 'kiste'), stats: window.zomfy.state().stats, alive: window.zomfy.champions().length }));
  const c0 = champ.list[0];
  if (c0 && c0.name === 'Knorz' && c0.shield > 0 && c0.maxHp >= 3 * 30 && sichtbar?.shown >= 1 && brannte && schild === 0 && kiste.alive === 0 && kiste.loot.length === 1 && kiste.stats.champions === 1) {
    note(`✓ Champion (M21): „${c0.name}“ (${c0.traits.join(', ')}) mit ${c0.maxHp} Leben und Schild, Name über dem Kopf – das Brennglas setzt ihn in Brand, der Schild bricht, er fällt und lässt eine Fundkiste liegen`);
  } else fail(`Champion: ${JSON.stringify({ champ, sichtbar, brannte, schild, kiste })}`);

  // 4) Fundkiste: Mika geht mit echter Taste hin, sie platzt auf
  const vorKiste = await z(() => ({ teile: Object.values(window.zomfy.state().towerParts).reduce((a, b) => a + b, 0), schrott: window.zomfy.state().inventory.schrott }));
  const k = kiste.loot[0];
  if (k) {
    await z(() => window.zomfy.killAllZombies());
    await step(1600); // wer noch fällt, ist im Boden versunken
    await z((k) => window.zomfy.teleport(k.x + 1.5, k.z, 0), k);
    await step(300);
    await page.screenshot({ path: join(SHOTS, 'fundkiste.png') });
    note('  Screenshot: screenshots/fundkiste.png');
    await page.keyboard.down('KeyA');
    for (let n = 0; n < 12; n++) {
      await step(120);
      if (await z(() => window.zomfy.lastChest())) break;
    }
    await page.keyboard.up('KeyA');
    await step(1500);
  }
  const auf = await z(() => ({ last: window.zomfy.lastChest(), teile: Object.values(window.zomfy.state().towerParts).reduce((a, b) => a + b, 0), schrott: window.zomfy.state().inventory.schrott, chests: window.zomfy.state().stats.chests, liegt: window.zomfy.lootItems().filter((l) => l.res === 'kiste').length }));
  if (auf.last && auf.teile === vorKiste.teile + 1 && auf.schrott > vorKiste.schrott && auf.chests === 1 && auf.liegt === 0) note(`✓ Fundkiste (M21): Mika läuft mit A hin, die Kiste platzt auf – ein Turmteil (${auf.last}) und ${auf.schrott - vorKiste.schrott} Schrott`);
  else fail(`Fundkiste: ${JSON.stringify({ vorKiste, auf })}`);

  // 5) Basteln an der Werkbank: drei gleiche Hufeisen ergeben ein seltenes Teil
  const basteln = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    for (const id of Object.keys(g.state.towerParts)) g.state.towerParts[id] = 0;
    g.state.towerParts.hufeisen = 3;
    const rows = Z.tinkerRows();
    const ok = Z.tinker('hufeisen');
    const parts = Object.entries(g.state.towerParts).filter(([, n]) => n > 0);
    return { rows, ok, parts };
  });
  const selten = ['fernrohr', 'schmierfett', 'kupferspule'];
  if (basteln.rows.join() === 'basteln-hufeisen' && basteln.ok && basteln.parts.length === 1 && basteln.parts[0][1] === 1 && selten.includes(basteln.parts[0][0])) note(`✓ Basteln (M21): Drei Hufeisen werden an der Werkbank zu einem seltenen Teil (${basteln.parts[0][0]})`);
  else fail(`Basteln: ${JSON.stringify(basteln)}`);

  // 6) Balduins Wundertüte
  const tuete = await z(() => {
    const Z = window.zomfy;
    Z.setDay(5);
    Z.setTime(9, 0);
    const offers = Z.trader().offers;
    const vorher = Object.values(Z.state().towerParts).reduce((a, b) => a + b, 0);
    const ok = Z.trade('wundertuete');
    const nochmal = Z.trade('wundertuete');
    return { offers, ok, nochmal, plus: Object.values(Z.state().towerParts).reduce((a, b) => a + b, 0) - vorher };
  });
  if (tuete.offers.includes('wundertuete') && tuete.ok && !tuete.nochmal && tuete.plus === 1) note('✓ Wundertüte (M21): Balduin verkauft eine am Tag – darin ein zufälliges Turmteil');
  else fail(`Wundertüte: ${JSON.stringify(tuete)}`);

  // 7) Speichern v30: Teile am Turm und ein lebender Champion bleiben
  await z(() => {
    const Z = window.zomfy;
    const col = Z.pathColumn(-40);
    Z.spawnZombie('flitzer', -40, col[Math.floor(col.length / 2)] + 0.5, { name: 9, traits: ['flink', 'gepanzert'] });
    Z.save();
  });
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z((id) => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    return { v: Z.state().version, parts: Z.buildings().find((b) => b.id === id)?.parts, champs: Z.champions().map((c) => ({ name: c.name, traits: c.traits, armor: c.armor })) };
  }, turm?.id);
  if (geladen.v === 30 && geladen.parts?.join() === 'kupferspule,brennglas' && geladen.champs.length === 1 && geladen.champs[0].name === 'Rostige Rita' && geladen.champs[0].traits.join() === 'flink,gepanzert' && geladen.champs[0].armor >= 6) note('✓ Speichern v30: zwei Turmteile am Turm und ein lebender Champion (Name, Merkmale) bleiben nach dem Neuladen');
  else fail(`Speichern v30 (Glanz): ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // Migration v15 → v30: aus dem einen Turmteil wird die Liste
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v15 → v30', {
    init: () => {
      const s = {
        version: 15,
        time: { day: 5, minute: 300 },
        player: { x: 2, z: 3, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [{ id: 50, type: 'bolzen', i: -12, j: -2, turns: 0, level: 2, part: 'fernrohr' }] },
        towerParts: { gluecksmuenze: 1 },
        recipes: {},
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const m = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, turm: window.zomfy.buildings().find((b) => b.type === 'bolzen'), muenze: window.zomfy.state().towerParts.gluecksmuenze }));
  if (m.v === 30 && m.turm?.parts?.join() === 'fernrohr' && m.turm.part === undefined && m.muenze === 1) note('✓ Migration: Spielstand v15 wird zu v30 – das Fernrohr steckt jetzt im ersten Fach, die Glücksmünze liegt im Vorrat');
  else fail(`Migration v15 → v30: ${JSON.stringify(m)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M22 (nur der Kern, CLAUDE.md »Keine Testspieler-Agenten mehr«): Der Nachtplan
 * kündigt in Nacht 4 eine Nebelwelle an, in Nacht 5 kommt der Holzfäller. Ein
 * Schlurfer der Nebelwelle ist im Dunkeln unsichtbar und der Turm schießt nicht –
 * Mikas Laterne holt ihn ins Licht, dann trifft der Turm. Der Holzfäller holt vor
 * einer Barrikade aus (Warnkreis, Balken oben) und zerschlägt sie. Der Moderfalter
 * fliegt über eine Barrikade, der Gräber buddelt sich darunter durch; die Tür des
 * Schildträgers fängt von vorn ab; der Lichtfresser löscht eine Fackel; aus der
 * Kapsel des Brüters schlüpfen Schwärmer (höchstens vier Kapseln je Brüter; ist
 * eine Art im Bild voll, wartet die Warteschlange, M25c); der Moosriese zerfällt in drei. Eine
 * Nebelwelle bleibt nach dem Neuladen eine (Bilder: nebelwelle, boss).
 */
async function runQuestionChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Die Horde stellt Fragen (M22)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m22')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m22', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  await z(() => {
    window.__zomfyHold = true;
    const flags = ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut', 'championHinweis', 'turmteilHinweis'];
    for (const f of flags) window.zomfy.setFlag(f);
    for (const t of ['moderfalter', 'graeber', 'schildtraeger', 'lichtfresser', 'brueter']) window.zomfy.setFlag(`art-${t}`);
    window.zomfy.setWeather('klar', true);
    window.zomfy.setHorde(false);
    window.zomfy.setDay(4);
    window.zomfy.setTime(19, 50);
    window.zomfy.give({ holz: 300, stein: 80, schrott: 600, zahnraeder: 30 });
  });

  // 1) Nachtplan: Nacht 4 mit Nebelwelle, Nacht 5 mit dem Holzfäller, Nacht 3 ohne Merkmal
  await step(200);
  const plan = await z(() => {
    const Z = window.zomfy;
    const view = Z.planView();
    const tafel = Z.game.hud.planRect ? true : false;
    return { n3: Z.waveTraits(3).filter((w) => w.trait).length, n4: Z.waveTraits(4).filter((w) => w.trait).map((w) => w.trait), row: view?.rows.find((r) => r.trait) || null, n5boss: Z.game.nights.planFor(5).waves.at(-1).spawns.some((s) => s.type === 'holzfaeller'), tafel };
  });
  if (plan.n3 === 0 && plan.n4.join() === 'nebel' && plan.row?.trait === 'nebel' && plan.n5boss && plan.tafel) note(`✓ Nachtplan (M22): Nacht 4 kündigt eine Nebelwelle an (Welle ${plan.row.n}), in Nacht 5 führt der Holzfäller die letzte Welle an`);
  else fail(`Nachtplan M22: ${JSON.stringify(plan)}`);

  // 2) Nebelwelle: im Dunkeln unsichtbar, der Turm schießt nicht – Mikas Laterne holt ihn ins Licht
  const nebel = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.setTime(21, 30);
    // eine dunkle Stelle am Weg (weit weg von jeder Fackel) mit Platz für einen Turm
    for (let i = -30; i <= -8; i++) {
      const col = Z.pathColumn(i);
      if (!col.length) continue;
      const zc = col[Math.floor(col.length / 2)] + 0.5;
      if (Z.litAt(i + 0.5, zc) || Z.litAt(i - 2, zc) || Z.litAt(i + 3, zc)) continue;
      const j = Math.min(...col) - 1;
      if (!Z.placeCheck('bolzen', i, j).ok || Z.build('bolzen', i, j) !== 'ok') continue;
      const id = Z.spawnZombie('schlurfer', i + 0.5, zc, null, 'nebel');
      const q = g.horde.list.find((o) => o.id === id);
      q.stunT = 999; // steht still vor dem Turm
      Z.teleport(i + 6, zc, 0);
      if (g.state.player.lantern) Z.toggleLantern();
      return { id, i, zc, hp: q.hp };
    }
    return null;
  });
  await step(2500);
  const dunkel = await z((id) => {
    const Z = window.zomfy;
    const q = Z.game.horde.list.find((o) => o.id === id);
    return q ? { hp: q.hp, hidden: Z.game.horde.isHidden(q) } : null;
  }, nebel?.id);
  await page.screenshot({ path: join(SHOTS, 'nebelwelle.png') });
  note('  Screenshot: screenshots/nebelwelle.png');
  await z((n) => {
    const Z = window.zomfy;
    Z.teleport(n.i + 2, n.zc, 0);
    if (!Z.game.state.player.lantern) Z.toggleLantern();
  }, nebel);
  await step(2500);
  const hell = await z((id) => {
    const Z = window.zomfy;
    const q = Z.game.horde.list.find((o) => o.id === id);
    return q ? { hp: q.hp, hidden: Z.game.horde.isHidden(q), dying: q.state === 'dying' } : { hp: 0, hidden: false, dying: true };
  }, nebel?.id);
  if (nebel && dunkel?.hidden && dunkel.hp === nebel.hp && !hell.hidden && hell.hp < nebel.hp) note(`✓ Nebelwelle (M22): im Dunkeln nur die Augen, der Bolzenwerfer schießt nicht – Mikas Laterne holt den Schlurfer ins Licht, dann trifft er (Leben ${nebel.hp} → ${Math.max(0, Math.round(hell.hp))})`);
  else fail(`Nebelwelle: ${JSON.stringify({ nebel, dunkel, hell })}`);
  // Wegräumen ohne Erfahrung (sonst öffnet ein Stufenaufstieg die Perk-Wahl und alles steht)
  await z(() => {
    window.zomfy.game.horde.clear();
    if (window.zomfy.game.state.player.lantern) window.zomfy.toggleLantern();
  });
  await step(1500);

  // Eine Barrikadenreihe quer über den Weg (für Boss, Flieger und Gräber)
  const reihe = async (x) =>
    z((x) => {
      const Z = window.zomfy;
      const col = Z.pathColumn(x);
      const ids = [];
      for (const j of col) {
        if (Z.build('barrikade', x, j) !== 'ok') continue;
        ids.push(Z.buildings().find((b) => b.type === 'barrikade' && b.i === x && b.j === j)?.id);
      }
      return { x, col, ids };
    }, x);

  // 3) Der Holzfäller: holt vor der Barrikade aus (Warnkreis, Balken oben) und zerschlägt sie
  const r1 = await reihe(-14);
  await z((r) => {
    const Z = window.zomfy;
    const id = Z.spawnZombie('holzfaeller', r.x - 1.6, r.col[Math.floor(r.col.length / 2)] + 0.5);
    const q = Z.game.horde.list.find((o) => o.id === id);
    q.boss.next = 0.3;
    Z.teleport(r.x + 3.4, r.col[Math.floor(r.col.length / 2)] + 1.5, 0); // nah genug fürs Bild, außer Reichweite des Hiebs
  }, r1);
  let boss = null;
  let bild = false;
  for (let k = 0; k < 40; k++) {
    await step(150);
    boss = await z((r) => {
      const g = window.zomfy.game;
      const q = g.horde.list.find((o) => o.type === 'holzfaeller');
      return { stats: { ...g.bossStats }, bar: g.hud.bossShown, windup: q?.boss?.windup || 0, broken: r.ids.filter((id) => g.world.buildings.get(id)?.broken).length, warns: g.hud.warns.length };
    }, r1);
    if (!bild && boss.windup > 0) {
      await page.screenshot({ path: join(SHOTS, 'boss.png') });
      note('  Screenshot: screenshots/boss.png');
      bild = true;
    }
    if (boss.stats.attacks > 0 && boss.broken > 0) break;
  }
  if (bild && boss.stats.telegraphs >= 1 && boss.stats.attacks >= 1 && boss.broken >= 1 && boss.bar?.name === 'Der Holzfäller') note(`✓ Boss (M22): Der Holzfäller holt vor der Barrikade aus (Warnkreis, Balken »${boss.bar.name}« oben) und zerschlägt ${boss.broken} Barrikade(n) mit einem Hieb`);
  else fail(`Holzfäller: ${JSON.stringify({ bild, boss })}`);
  await z(() => window.zomfy.game.horde.clear());
  await step(300);

  // 4) Moderfalter und Gräber: über bzw. unter einer frischen Barrikadenreihe durch
  const r2 = await reihe(-20);
  const start = await z((r) => {
    const Z = window.zomfy;
    const mid = r.col[Math.floor(r.col.length / 2)] + 0.5;
    const falter = Z.spawnZombie('moderfalter', r.x - 2.5, mid);
    const graeber = Z.spawnZombie('graeber', r.x - 2.5, mid - 0.4);
    Z.teleport(r.x + 14, r.col[0] - 4, 0);
    return { falter, graeber };
  }, r2);
  let durch = null;
  for (let k = 0; k < 60; k++) {
    await step(250);
    durch = await z(([r, s]) => {
      const g = window.zomfy.game;
      const f = g.horde.list.find((o) => o.id === s.falter);
      const gr = g.horde.list.find((o) => o.id === s.graeber);
      return { falter: f ? f.x : null, graeber: gr ? gr.x : null, flying: f ? f.y : 0, digs: g.bossStats.digs, heil: r.ids.every((id) => !g.world.buildings.get(id)?.broken) };
    }, [r2, start]);
    if (durch.falter > r2.x + 1.5 && durch.graeber > r2.x + 1.5) break;
  }
  if (durch.falter > r2.x + 1.5 && durch.flying > 0.8 && durch.graeber > r2.x + 1.5 && durch.digs >= 1 && durch.heil) note('✓ Neue Arten (M22): Der Moderfalter fliegt über die Barrikadenreihe, der Gräber buddelt sich darunter durch – die Reihe bleibt heil');
  else fail(`Falter/Gräber: ${JSON.stringify({ r2: r2.x, durch })}`);
  await z(() => window.zomfy.game.horde.clear());
  await step(300);

  // 5) Schildträger, Lichtfresser, Brüter, Moosriese
  const rest = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const h = g.horde;
    // Schildträger: derselbe Treffer von vorn und von hinten
    const col = Z.pathColumn(-26);
    const mid = col[Math.floor(col.length / 2)] + 0.5;
    const sid = Z.spawnZombie('schildtraeger', -26, mid);
    const s = h.list.find((o) => o.id === sid);
    s.stunT = 999;
    const f = s.facing;
    const hp0 = s.hp;
    h.damage(s, 40, { fromX: s.x + Math.sin(f) * 3, fromZ: s.z + Math.cos(f) * 3, source: 'turm' });
    const vorn = hp0 - s.hp;
    const hp1 = s.hp;
    h.damage(s, 40, { fromX: s.x - Math.sin(f) * 3, fromZ: s.z - Math.cos(f) * 3, source: 'turm' });
    const hinten = hp1 - s.hp;
    // Lichtfresser an einer Fackel
    const t = g.world.props.torches.find((q) => q.x < -8 && q.x > -40);
    const vorher = Z.litAt(t.x, t.z);
    const lid = Z.spawnZombie('lichtfresser', t.x, t.z);
    const lf = h.list.find((o) => o.id === lid);
    lf.stunT = 999;
    // Brüter: die nächste Kapsel gleich
    const bid = Z.spawnZombie('brueter', -28, mid);
    const b = h.list.find((o) => o.id === bid);
    b.stunT = 999;
    b.broodT = 0.1;
    return { vorn, hinten, torch: t, vorher };
  });
  await step(800);
  const nach = await z((t) => {
    const g = window.zomfy.game;
    return { hell: window.zomfy.litAt(t.x, t.z), snuffed: g.bossStats.snuffed, pods: g.horde.pods.length };
  }, rest.torch);
  const vorSchwarm = await z(() => window.zomfy.zombies().filter((q) => q.type === 'schwaermer').length);
  await z(() => {
    for (const p of window.zomfy.game.horde.pods) p.t = 0.05;
  });
  await step(300);
  const schwarm = await z(() => window.zomfy.zombies().filter((q) => q.type === 'schwaermer' && q.state !== 'dying').length);
  // M25c: Ein Brüter legt höchstens `max` Kapseln. Ist eine Art im Bild voll, wartet die
  // Warteschlange der Nacht, und aus Kapseln schlüpft nichts – nie ein unsichtbarer Schlurfer.
  const grenze = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const h = g.horde;
    const b = h.list.find((o) => o.type === 'brueter' && o.state !== 'dying');
    for (let k = 0; k < 10; k++) {
      b.broodT = 0;
      window.__zomfyStep(40);
    }
    const kapseln = b.laid;
    const max = b.def.brood.max;
    // Das Bild voller Schwärmer (sie stehen still), dann soll noch einer aus der Warteschlange kommen
    h.clear();
    const col = Z.pathColumn(-44);
    const mid = col[Math.floor(col.length / 2)] + 0.5;
    const cap = h.room('schwaermer');
    const ids = [];
    for (let k = 0; k < cap; k++) {
      const id = Z.spawnZombie('schwaermer', -46 + (k % 12) * 0.4, mid + (Math.floor(k / 12) % 3) * 0.3);
      h.list.find((o) => o.id === id).stunT = 999;
      ids.push(id);
    }
    const lebend = () => h.list.filter((o) => o.type === 'schwaermer' && o.state !== 'dying').length;
    const m0 = g.state.time.minute;
    const was = g.nights.enabled;
    g.state.time.minute = 6 * 60; // mittags: dabei beginnt keine Nacht
    g.nights.queue.push({ type: 'schwaermer', entry: Object.keys(g.world.pathing.entries)[0], delay: 0 });
    g.nights.enabled = true;
    g.nights.update(0.05);
    const voll = { wartet: g.nights.queue.length, lebend: lebend(), platz: h.room('schwaermer') };
    Z.killZombie(ids[0], 'turm');
    h.recount();
    g.nights.update(0.05);
    const frei = { wartet: g.nights.queue.length, lebend: lebend() };
    g.nights.enabled = was;
    g.state.time.minute = m0;
    // Eine reife Kapsel bei vollem Bild: Es schlüpft nichts
    h.pods.push({ x: -40, z: mid, t: 0, hp: 12, count: 3, hpFactor: 1, id: 999 });
    h.updatePods(0.05);
    const kapselVoll = lebend();
    h.clear();
    return { kapseln, max, cap, voll, frei, kapselVoll };
  });
  // Moosriese: zerfällt in drei
  const riese = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    g.horde.clear();
    const col = Z.pathColumn(-30);
    const id = Z.spawnZombie('moosriese', -30, col[Math.floor(col.length / 2)] + 0.5);
    Z.killZombie(id, 'turm');
    return g.horde.list.filter((o) => o.type === 'moosriese' && o.state !== 'dying').map((o) => ({ size: o.size, hp: o.maxHp }));
  });
  if (rest.vorn <= 12 && rest.hinten >= 38 && rest.vorher && !nach.hell && nach.snuffed >= 1 && nach.pods >= 1 && schwarm >= vorSchwarm + 3 && riese.length === 3 && riese.every((r) => r.size < 1)) {
    note(`✓ Neue Arten (M22): Die Tür fängt von vorn ab (${rest.vorn} statt ${rest.hinten} Schaden), der Lichtfresser löscht die Fackel, aus der Kapsel des Brüters schlüpfen Schwärmer, der Moosriese zerfällt in drei`);
  } else fail(`Arten M22: ${JSON.stringify({ rest, nach, vorSchwarm, schwarm, riese })}`);
  if (grenze.kapseln === grenze.max && grenze.cap > 0 && grenze.voll.wartet === 1 && grenze.voll.lebend === grenze.cap && grenze.voll.platz === 0 && grenze.frei.wartet === 0 && grenze.frei.lebend === grenze.cap && grenze.kapselVoll === grenze.cap) {
    note(`✓ Grenzen (M25c): Ein Brüter legt höchstens ${grenze.max} Kapseln; mit ${grenze.cap} Schwärmern im Bild wartet die Warteschlange, bis einer fällt, und aus einer Kapsel schlüpft nichts – kein Schlurfer läuft unsichtbar mit`);
  } else fail(`Grenzen M25c: ${JSON.stringify(grenze)}`);

  // 6) Speichern: ein Schlurfer der Nebelwelle bleibt einer
  await z(() => {
    const Z = window.zomfy;
    Z.game.horde.clear();
    const col = Z.pathColumn(-40);
    Z.spawnZombie('schlurfer', -40, col[Math.floor(col.length / 2)] + 0.5, null, 'nebel');
    Z.save();
  });
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z(() => {
    window.__zomfyHold = true;
    return { v: window.zomfy.state().version, fog: window.zomfy.fogged().length };
  });
  if (geladen.fog === 1) note(`✓ Speichern v${geladen.v}: Ein Schlurfer der Nebelwelle bleibt nach dem Neuladen im Nebel`);
  else fail(`Speichern (Nebel): ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();
}

/**
 * M15: Der Moder wächst im Unterholz (Boden, Pilze, Glühen), Mika denkt einmal
 * am Tag am Waldrand darüber nach (echte Taste), der Warnpfahl gibt einen
 * Gedanken statt eines Dialogs (echtes E), nachts glimmt der Wald.
 */
async function runStoryChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Geschichte (M15)');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setWeather('klar');
    window.zomfy.setTime(10, 0);
  });
  await step(100);

  // Moder: violette Fäden und Matten im Waldboden (Eigenlicht), Pilze im Unterholz – nie im Begehbaren
  const moder = await z(() => {
    const w = window.zomfy.game.world;
    const glow = w.groundMaterial.emissiveMap.image.data;
    let violet = 0;
    for (let k = 0; k < glow.length; k += 4) if (glow[k + 2] > glow[k + 1] + 20 && glow[k + 2] >= glow[k]) violet++;
    const pilze = [];
    w.scene.traverse((o) => {
      if (!o.isInstancedMesh || !/^moder\d/.test(o.name)) return;
      const m = new o.matrixWorld.constructor();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        pilze.push(w.map.edgeDistance(m.elements[12], m.elements[14]));
      }
    });
    return { violet, pilze: pilze.length, imBegehbaren: pilze.filter((d) => d < 0.2).length, stats: w.stats.moder };
  });
  if (moder.violet > 2000 && moder.pilze > 30 && moder.imBegehbaren === 0) note(`✓ Moder (M15): ${moder.violet} glimmende Bodentexel im Unterholz, ${moder.pilze} Pilzgruppen – keine im Begehbaren`);
  else fail(`Moder: ${JSON.stringify(moder)}`);

  // Gedanke am Waldrand: echte Taste W gegen den Wald, einmal am Tag
  const rand = await z(() => {
    const m = window.zomfy.game.world.map;
    const c = window.zomfy.game.world.colliders;
    for (let x = -12; x > -46; x -= 0.5) {
      for (let zz = -2; zz > -26; zz -= 0.25) {
        const e = m.edgeDistance(x, zz);
        if (e < -0.9 || e > -0.6 || m.pathDistance(x, zz) < 1.5) continue;
        if (m.edgeDistance(x, zz - 1.3) < 0.5 || m.isWater(x, zz - 1.3) || m.inBay(x, zz - 1.3)) continue;
        if (c.near(x, zz, 1.2).length) continue;
        return { x, z: zz };
      }
    }
    return null;
  });
  const gegenWald = async () => {
    await z((r) => window.zomfy.teleport(r.x, r.z, Math.PI), rand);
    await step(100);
    await page.keyboard.down('KeyW');
    await step(2500);
    await page.keyboard.up('KeyW');
    await step(100);
    return { gedanke: (await view()).gedanke, tag: (await z(() => window.zomfy.state().flags.waldrandTag)) ?? null };
  };
  const erst = rand ? await gegenWald() : null;
  await step(6000); // Blase ausklingen lassen
  const nochmal = rand ? await gegenWald() : null;
  await z(() => window.zomfy.setDay(2));
  await step(6000);
  const morgen = rand ? await gegenWald() : null;
  if (rand && erst.gedanke && /Moder|Wald|Geflecht|Wegen/.test(erst.gedanke) && erst.tag === 1 && !nochmal.gedanke && morgen.gedanke && morgen.gedanke !== erst.gedanke && morgen.tag === 2) {
    note(`✓ Waldrand (M15): W gegen den Wald – »${erst.gedanke}«; am selben Tag nicht noch einmal, am nächsten ein anderer Satz`);
  } else fail(`Gedanke am Waldrand: ${JSON.stringify({ rand, erst, nochmal, morgen })}`);

  // Warnpfahl: E gibt einen Gedanken, kein Dialog (dort kommt nachts die Horde)
  const pfahl = await z(() => {
    const it = window.zomfy.game.world.interactions.find((i) => i.id.startsWith('warnpfahl-'));
    window.zomfy.teleport(it.x + 0.9, it.z, -Math.PI / 2);
    return { x: it.x, z: it.z };
  });
  await step(300);
  const pfahlHinweis = (await view()).hinweis;
  await page.keyboard.press('KeyE');
  await step(200);
  const pfahlDanach = await view();
  const pfahlModus = await z(() => window.zomfy.mode);
  if (/Ansehen/.test(pfahlHinweis || '') && pfahlModus === 'play' && /rotes Kreuz/.test(pfahlDanach.gedanke || '')) note(`✓ Warnpfahl (M15): »${pfahlHinweis}«, E – »${pfahlDanach.gedanke}« (Gedanke, kein Dialog)`);
  else fail(`Warnpfahl: ${JSON.stringify({ pfahl, pfahlHinweis, pfahlModus, gedanke: pfahlDanach.gedanke })}`);

  // Nachts glimmt der Moder im Unterholz
  await z(() => {
    const s = window.zomfy.lookSpot('unterholz');
    window.zomfy.game.hud.speech = null; // der Gedanke vom Warnpfahl gehört nicht ins Bild
    window.zomfy.setTime(22, 30);
    window.zomfy.teleport(s.x, s.z + 4, Math.PI);
  });
  await step(1500);
  await page.screenshot({ path: join(SHOTS, 'moder-nacht.png') });
  note('  Screenshot: screenshots/moder-nacht.png');
  checkMessages(session);
  await session.context.close();
}

/**
 * N1: Figuren aus Formen statt Kästen. Die Vorderseiten von Kopf und Rumpf
 * sind bei Mika, allen Schlurfer-Arten, den Überlebenden, Balduin und Knopf
 * gewölbt: Je Spalte (x, y) liegt die vorderste Fläche höchstens zur Hälfte
 * in derselben Ebene (Kästen: 70–100 %, geformt: 20–50 %). Mika beugt beim
 * Gehen (echte Taste) die Knie und hält die Laterne (echte Taste F) mit
 * angewinkeltem Arm. Bild: alle nebeneinander.
 */
async function runFigureChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Figuren (N1)', { viewport: { width: 1920, height: 1080 } });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const PEOPLE = ['hilde', 'bert', 'juna', 'yusuf', 'balduin'];
  await z((people) => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setWeather('klar');
    window.zomfy.setTime(11, 0);
    window.zomfy.game.applySettings({ view: 'nah' });
    for (const id of ['knopf', ...people.filter((p) => p !== 'balduin')]) window.zomfy.setSurvivor(id, 2);
  }, PEOPLE);
  await page.waitForTimeout(500);
  await step(300);

  // Gewölbte Vorderseiten: Anteil der vordersten Flächen, die in einer Ebene liegen
  const flat = await z((people) => {
    const g = window.zomfy.game;
    const share = (geo) => {
      const p = geo.attributes.position;
      const n = geo.attributes.normal;
      const front = new Map();
      for (let i = 0; i < p.count; i += 4) {
        if (n.getZ(i) < 0.9) continue;
        let x = Infinity;
        let y = Infinity;
        for (let k = 0; k < 4; k++) {
          x = Math.min(x, p.getX(i + k));
          y = Math.min(y, p.getY(i + k));
        }
        const key = Math.round(x * 32) * 1000 + Math.round(y * 32);
        const zz = Math.round(p.getZ(i) * 32);
        if (!front.has(key) || front.get(key) < zz) front.set(key, zz);
      }
      const count = new Map();
      for (const v of front.values()) count.set(v, (count.get(v) || 0) + 1);
      return Math.round((Math.max(...count.values()) / front.size) * 100);
    };
    const main = (part) => {
      let best = null;
      part.traverse((o) => {
        if (o.isMesh && !o.userData.outline && (!best || o.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = o;
      });
      return best.geometry;
    };
    const out = {};
    const add = (name, head, body) => (out[name] = [share(head), share(body)]);
    const mika = g.player.character.parts;
    add('mika', main(mika.head), main(mika.torso));
    for (const [type, kind] of Object.entries(g.horde.kinds)) add(type, kind.meshes.head.geometry, kind.meshes.torso.geometry);
    const npcs = g.survivors.npcs;
    for (const id of people) {
      const parts = npcs.get(id).model.parts;
      add(id, main(parts.head), main(parts.torso));
    }
    const dog = npcs.get('knopf', true).model.parts;
    add('knopf', main(dog.head), main(dog.body));
    return out;
  }, PEOPLE);
  const flach = Object.entries(flat).filter(([, [k, r]]) => k > 50 || r > 55);
  const worst = Math.max(...Object.values(flat).flat());
  if (Object.keys(flat).length >= 13 && !flach.length) note(`✓ Figuren (N1): ${Object.keys(flat).length} Figuren mit gewölbten Köpfen und Rümpfen (höchstens ${worst} % einer Vorderseite in einer Ebene; Kästen hatten bis 100 %)`);
  else fail(`Figuren: zu flache Vorderseiten ${JSON.stringify(flat)}`);

  // Knie beim Gehen (echte Taste), angewinkelter Arm mit der Laterne (echte Taste F)
  await z(() => window.zomfy.teleport(0.5, 8.5, 0));
  await step(200);
  let knee = 0;
  let hip = 0;
  await page.keyboard.down('KeyD');
  for (let k = 0; k < 10; k++) {
    await step(60);
    const j = await z(() => {
      const p = window.zomfy.game.player.character.parts;
      return { knee: Math.max(p.kneeL.rotation.x, p.kneeR.rotation.x), hip: Math.max(Math.abs(p.legL.rotation.x), Math.abs(p.legR.rotation.x)) };
    });
    knee = Math.max(knee, j.knee);
    hip = Math.max(hip, j.hip);
  }
  await page.keyboard.up('KeyD');
  await step(600);
  await z(() => window.zomfy.setTime(21, 30));
  await step(100);
  await page.keyboard.press('KeyF');
  await step(400);
  const arm = await z(() => {
    const p = window.zomfy.game.player.character.parts;
    return { an: window.zomfy.game.player.lanternLit, upper: p.armL.rotation.x, fore: p.elbowL.rotation.x };
  });
  if (knee > 0.25 && hip > 0.3 && arm.an && arm.fore < -0.5) note(`✓ Gelenke (N1): beim Gehen beugt Mika die Knie (bis ${knee.toFixed(2)} rad), die Laterne hält der angewinkelte Arm (Ellbogen ${arm.fore.toFixed(2)} rad)`);
  else fail(`Gelenke: ${JSON.stringify({ knee, hip, arm })}`);
  await page.keyboard.press('KeyF');
  await z(() => window.zomfy.setTime(11, 0));
  await step(200);

  // Bild: vorn Überlebende, Mika, Balduin und Knopf, dahinter alle Schlurfer-Arten
  await z((people) => {
    const zo = window.zomfy;
    const g = zo.game;
    document.querySelector('#ui').style.visibility = 'hidden';
    zo.teleport(0.5, 6.0, 0);
    const npcs = g.survivors.npcs;
    const row = [...people.slice(0, 3), null, ...people.slice(3), 'knopf'];
    row.forEach((id, i) => {
      if (!id) return;
      const n = npcs.get(id, id === 'knopf');
      npcs.place(n, -3.4 + i * 1.3, 6.0, 0);
      n.restFacing = 0;
      n.model.root.visible = true;
    });
    ['schlurfer', 'flitzer', 'schwaermer', 'brummer', 'leuchtpilz', 'anfuehrer'].forEach((t, i) => {
      const zb = g.horde.spawn(t, { x: -3.6 + i * 1.6, z: 3.4 });
      zb.state = 'idle';
      zb.facing = 0;
    });
  }, PEOPLE);
  await page.waitForTimeout(400);
  await step(300);
  await z(() => {
    const npcs = window.zomfy.game.survivors.npcs;
    for (const n of npcs.list.values()) {
      n.facing = 0;
      npcs.sync(n);
    }
  });
  await step(16);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(SHOTS, 'figuren.png') });
  note('  Screenshot: screenshots/figuren.png');
  checkMessages(session);
  await session.context.close();
}

/** Abschnitte 0 und 1: Spielstart mit Intro, Rundgang mit Bildern, Laufen, Laterne, Ausruhen, Schrift. */
async function runTour(browser, url) {
  {
    // --- 0. Erster Eindruck: neues Spiel mit Einblenden und Intro -----------------
    const intro = await openGame(browser, `${url}index.html?debug&nosave`, 'Spielstart');
    await intro.page.evaluate(() => window.zomfy.setDebug(false));
    // Startbild (N2): »Tales of Cue präsentiert«, vor dem ersten Druck kein Klang; die
    // echte Taste startet die Spieluhr, danach blendet das Titelbild mit seiner Musik ein
    await intro.page.waitForFunction(() => window.zomfy.mode === 'splash', null, { timeout: 180000 });
    await intro.page.waitForFunction(() => window.zomfy.game.splash.t > 1.6, null, { timeout: 180000 });
    await settle(intro.page, 4);
    const vorDruck = await intro.page.evaluate(() => ({ bild: window.zomfyView().startbild, klang: window.zomfy.sound() }));
    await intro.page.screenshot({ path: join(SHOTS, 'startbild.png') });
    note('  Screenshot: screenshots/startbild.png');
    await intro.page.keyboard.press('Space');
    await settle(intro.page, 6);
    const nachDruck = await intro.page.evaluate(() => ({ bild: window.zomfyView().startbild, klang: window.zomfy.sound() }));
    await intro.page.waitForFunction(() => window.zomfy.mode === 'title', null, { timeout: 180000 });
    await intro.page.waitForFunction(() => window.zomfy.sound().music === 'titel', null, { timeout: 180000 }).catch(() => {});
    const titelMusik = await intro.page.evaluate(() => window.zomfy.sound());
    const texte = vorDruck.bild?.texte || [];
    if (texte.includes('Tales of Cue') && texte.includes('präsentiert') && texte.includes('Taste drücken') && vorDruck.klang.state === null && nachDruck.klang.jingles === 1 && nachDruck.bild?.spieluhr && titelMusik.music === 'titel') {
      note('✓ Startbild (N2): »Tales of Cue präsentiert«, vor dem Tastendruck kein Klang – die echte Taste startet die Spieluhr, dann das Titelbild mit »Herbstlied am Stillsee«');
    } else fail(`Startbild (N2): ${JSON.stringify({ vorDruck, nachDruck, titelMusik })}`);
    // Titelbild (Meilenstein 7): ohne Spielstand ist »Neues Spiel« vorgewählt
    await intro.page.waitForFunction(() => window.zomfy.mode === 'title', null, { timeout: 180000 });
    await settle(intro.page, 60);
    await intro.page.screenshot({ path: join(SHOTS, 'titel.png') });
    note('  Screenshot: screenshots/titel.png');
    const titel = await intro.page.evaluate(() => window.zomfyView().titel);
    await intro.page.keyboard.press('Enter');
    await settle(intro.page, 20);
    // Figur: Mütze mit D weiterschalten, Namen tippen (E am Namen, Enter beendet), dann »Los geht’s!«
    const figurSeite = await intro.page.evaluate(() => window.zomfyView().titel?.seite);
    // Jeder Druck in einem eigenen Bild (gleiche Tasten im selben Bild zählen einmal)
    const tap = async (key) => {
      await intro.page.keyboard.press(key);
      await settle(intro.page, 2);
    };
    for (let k = 0; k < 7; k++) await tap('KeyW'); // M16/N5/M31: über Einführung, Verluste und Schwierigkeit hinweg zur Mütze
    await tap('KeyD');
    await tap('KeyW');
    await tap('KeyW'); // N5: über »Figur« zum Namen
    await tap('KeyE');
    for (let k = 0; k < 4; k++) await tap('Backspace');
    await intro.page.keyboard.type('Kira');
    await tap('Enter');
    await settle(intro.page, 30);
    await intro.page.screenshot({ path: join(SHOTS, 'figur.png') });
    note('  Screenshot: screenshots/figur.png');
    const knoepfe = await intro.page.evaluate(() => window.zomfyView().titel?.knoepfe || []);
    for (let k = 0; k < 9; k++) await tap('KeyS'); // N5/M31: drei Zeilen mehr (Figur, Einführung, Verluste)
    await intro.page.waitForFunction(() => window.zomfyView().titel?.bereit, null, { timeout: 60000 }); // m16-r1: »Los geht’s!« erst nach einem Moment
    await tap('Enter');
    // N5: Die Ankunft beginnt – gehaltenes Esc überspringt sie (die Szene selbst prüft Abschnitt »ankunft«)
    await intro.page.waitForFunction(() => window.zomfy.mode === 'ankunft', null, { timeout: 180000 });
    await intro.page.keyboard.down('Escape');
    await intro.page.waitForFunction(() => window.zomfy.mode === 'dialog', null, { timeout: 180000 });
    await intro.page.keyboard.up('Escape');
    const neu = await intro.page.evaluate(() => window.zomfy.state().player);
    const erst = await intro.page.evaluate(() => window.zomfyView().dialog?.sprecher);
    if (titel?.knoepfe?.[0]?.includes('Neues Spiel') && figurSeite === 'figur' && knoepfe[0]?.includes('Kira') && neu.name === 'Kira' && neu.look.hat === 'rot' && erst === 'edda') note('✓ Titelbild: Neues Spiel, Name »Kira« getippt, Mütze rot – dann die Ankunft (Esc gehalten überspringt sie), und Edda meldet sich');
    else fail(`Titelbild: ${JSON.stringify({ titel, figurSeite, knoepfe, name: neu.name, look: neu.look, erst })}`);
    await settle(intro.page, 70);
    await intro.page.screenshot({ path: join(SHOTS, 'start.png') });
    note('  Screenshot: screenshots/start.png');
    // M15/N5: Edda zeigt die Wege – die Kamera fährt vom Waldrand über die Wege zum Haus und
    // zurück zu Mika, mit echten Tasten (E zeigt die Zeile ganz, E geht weiter)
    const blick = async () => intro.page.evaluate(() => ({ ...window.zomfy.camera(), mode: window.zomfy.mode }));
    const fahrt = [await blick()];
    const orte = await intro.page.evaluate(() => Object.fromEntries(['wald', 'unterholz', 'zusammen', 'haus'].map((k) => [k, window.zomfy.lookSpot(k)])));
    for (let k = 0; k < 14 && fahrt[fahrt.length - 1].mode === 'dialog'; k++) {
      await intro.page.keyboard.press('KeyE');
      await settle(intro.page, 3);
      if ((await blick()).mode === 'dialog') {
        await intro.page.keyboard.press('KeyE');
        await settle(intro.page, 3);
      }
      await settle(intro.page, 60);
      fahrt.push(await blick());
      if (fahrt[fahrt.length - 1].look === 'zusammen' && !fahrt.some((f) => f.shot)) {
        await intro.page.screenshot({ path: join(SHOTS, 'intro-wege.png') });
        note('  Screenshot: screenshots/intro-wege.png');
        fahrt[fahrt.length - 1].shot = true;
      }
    }
    const mika = await intro.page.evaluate(() => window.zomfy.state().player);
    const musikImSpiel = await intro.page.evaluate(() => window.zomfy.sound().music);
    if (musikImSpiel !== 'titel') note(`✓ Musik (N2): im Spiel ist die Titelmusik aus (jetzt: ${musikImSpiel ? `»${musikImSpiel}«` : 'Ruhe'})`);
    else fail('Musik (N2): nach »Los geht’s!« läuft noch die Titelmusik');
    const bei = (f, o) => f && Math.abs(f.x - o.x) < 2.5 && Math.abs(f.z - (o.z - 1)) < 2.5;
    const nach = (key) => fahrt.find((f) => f.look === key);
    const ende = fahrt[fahrt.length - 1];
    const wald = nach('wald');
    if (wald && wald.x < -30 && bei(nach('unterholz'), orte.unterholz) && bei(nach('zusammen'), orte.zusammen) && bei(nach('haus'), orte.haus) && nach('mika') && ende.mode === 'play' && Math.abs(ende.x - mika.x) < 2 && !ende.look) {
      note(`✓ Einleitung (M15/N5): Edda zeigt die Wege – vom Waldrand (x ${wald.x.toFixed(0)}) über Unterholz, Zusammenfluss (x ${nach('zusammen').x.toFixed(0)}) und Haus zurück zu Mika, ${fahrt.length - 1} Tastendrücke, danach folgt die Kamera wieder der Figur`);
    } else fail(`Einleitung (M15/N5): ${JSON.stringify({ fahrt, orte, mika: { x: mika.x, z: mika.z } })}`);
    checkMessages(intro);
    await intro.context.close();

    // --- 1. Rundgang mit Screenshots (ohne Speichern) ---------------------------
    const tour = await openGame(browser, `${url}index.html?test&nosave`, 'Rundgang');
    const { page } = tour;
    // Einmalige Hinweis-Dialoge würden die Bilder verdecken; die Horde bleibt
    // für diese ruhigen Bilder im Wald (Nächte prüft Abschnitt 4).
    await page.evaluate(() => {
      window.zomfy.setFlag('abendHinweis');
      window.zomfy.setFlag('spaetHinweis');
      window.zomfy.setFlag('abendHorde');
      window.zomfy.setFlag('ruheHinweis');
      window.zomfy.setHorde(false);
    });

    await shot(page, 'morgen', () => {
      window.zomfy.setTime(6, 40);
      window.zomfy.teleport(3.5, -1.5, 0.4);
    });
    await shot(page, 'tag', () => {
      window.zomfy.setTime(12, 0);
      window.zomfy.teleport(-3.0, -4.5, 1.4);
    });
    // Bildzeit bei Tag messen
    await settle(page, 120);
    const dayStats = await page.evaluate(() => window.zomfy.stats());
    await shot(page, 'abend', () => {
      window.zomfy.setTime(19, 35);
      window.zomfy.teleport(5.0, -1.0, 1.2);
    });
    await shot(page, 'nacht', () => {
      window.zomfy.setTime(22, 30);
      window.zomfy.teleport(2.5, -2.5, 0.6);
      window.zomfy.toggleLantern();
    });
    const nightStats = await page.evaluate(() => window.zomfy.stats());
    await shot(page, 'innen-nacht', () => {
      window.zomfy.setTime(22, 45);
      window.zomfy.toggleLantern();
      const e = window.zomfy.interior().entry; // drinnen ist ein eigenes Bild (M11)
      window.zomfy.teleport(e.x - 0.6, e.z - 2.2, 3.1);
    });
    await shot(page, 'waldrand', () => {
      window.zomfy.setTime(20, 5);
      window.zomfy.teleport(-10.0, 1.5, -0.6);
    });
    await shot(page, 'dialog', () => {
      window.zomfy.setTime(9, 30);
      const r = window.zomfy.game.world.interactions.find((i) => i.id === 'radio');
      window.zomfy.teleport(r.x + 0.3, r.z + 0.9, 3.1);
      window.zomfy.interact('radio');
    });
    await settle(page, 90);
    await page.screenshot({ path: join(SHOTS, 'dialog.png') });
    await page.evaluate(() => window.zomfy.finishDialog());
    await shot(page, 'menue', () => {
      window.zomfy.setTime(16, 0);
      window.zomfy.teleport(-2.0, 0.5, 0.8);
      window.zomfy.openMenu();
    });
    await page.evaluate(() => window.zomfy.closeMenu());

    // Laufen mit echter Tastatur: Figur muss sich bewegen und darf nicht durch Wände.
    await page.evaluate(() => {
      window.zomfy.setTime(10, 0);
      window.zomfy.teleport(8.0, -2.0, 0); // vor dem Fenster – vor der Tür führt die Türhilfe ins Haus
    });
    const before = await page.evaluate(() => window.zomfy.state().player);
    // In Bildern statt in Millisekunden – unter Last (langsame Bilder) sonst zu kurz
    await page.keyboard.down('KeyW');
    await settle(page, 45);
    await page.keyboard.up('KeyW');
    await settle(page, 5);
    const after = await page.evaluate(() => window.zomfy.state().player);
    if (after.z < before.z - 0.5) note(`✓ Laufen: Figur von z=${before.z.toFixed(2)} nach z=${after.z.toFixed(2)} bewegt`);
    else fail(`Laufen: Figur hat sich kaum bewegt (${before.z.toFixed(2)} -> ${after.z.toFixed(2)})`);
    if (after.z > -5.45) note('✓ Kollision: Figur bleibt vor der Hauswand');
    else fail(`Kollision: Figur steht bei z=${after.z.toFixed(2)} in der Hauswand`);

    // Laterne mit der Taste F an und wieder aus
    await page.keyboard.press('KeyF');
    await settle(page, 3);
    const lanternOn = await page.evaluate(() => window.zomfy.state().player.lantern);
    await page.keyboard.press('KeyF');
    await settle(page, 3);
    const lanternOff = await page.evaluate(() => window.zomfy.state().player.lantern);
    if (lanternOn && !lanternOff) note('✓ Laterne: Taste F schaltet an und aus');
    else fail(`Laterne: Taste F wirkt nicht wie erwartet (an=${lanternOn}, aus=${!lanternOff})`);

    // Am Feuer ausruhen: Uhr springt auf den Abend
    await page.evaluate(() => {
      window.zomfy.setTime(10, 0);
      window.zomfy.teleport(0.5, -0.25, 3.14);
      window.zomfy.interact('feuer');
      window.zomfy.answer(0); // „Bis zum Abend ausruhen“ (vorgewählt ist „Weitermachen“)
    });
    await page.waitForFunction(() => window.zomfy.mode === 'play', null, { timeout: 180000 });
    const restMinute = await page.evaluate(() => window.zomfy.state().time.minute);
    if (Math.abs(restMinute - 810) < 10) note('✓ Ausruhen: Am Feuer vergeht die Zeit bis zur Abendtafel (19:30)');
    else fail(`Ausruhen: Uhr steht bei Minute ${restMinute} statt 810`);

    // Schriftabdeckung aller Texte
    const missing = await page.evaluate(async () => {
      const { missingGlyphs } = await import('/src/ui/font.js');
      const { T } = await import('/src/data/texts.js');
      const { DIALOGE, SPRECHER } = await import('/src/data/dialogs.js');
      const texts = [];
      const collect = (v) => {
        if (typeof v === 'string') texts.push(v.replaceAll('{name}', 'Mika')); // M29: {name} ist ein Platzhalter (bonds.callName)
        else if (typeof v === 'function') {
          try {
            collect(v(3));
          } catch {
            /* keine Textfunktion */
          }
        } else if (Array.isArray(v)) v.forEach(collect);
        else if (v && typeof v === 'object') Object.values(v).forEach(collect);
      };
      collect(T);
      collect(SPRECHER);
      for (const d of Object.values(DIALOGE)) {
        if (typeof d === 'function') {
          // M15: auch eingezogene Überlebende (ihre Tagessätze) und fünf Tage (Listen mit fünf Sätzen)
          const resident = { stage: 3, errand: 2 };
          for (const flags of [{}, { radioGehoert: true, briefkastenGesehen: true, sesselProbiert: true }]) {
            for (let day = 1; day <= 5; day++) {
              for (const minute of [60, 720, 900]) {
                for (const schrott of [0, 99]) {
                  // Ausbaustufen und Suppe (M11) mit abdecken
                  for (let houseLevel = 1; houseLevel <= 4; houseLevel++) {
                    for (const survivors of [undefined, { hilde: resident, juna: resident, bert: resident, yusuf: resident, knopf: resident }]) {
                      const world = { houseLevel };
                      const player = { soup: houseLevel % 2 ? day : 0 };
                      collect(d({ flags, time: { day, minute }, inventory: { schrott }, world, player, survivors }));
                    }
                  }
                }
              }
            }
          }
        } else collect(d);
      }
      return missingGlyphs(texts.join(''));
    });
    if (missing.length) fail(`Schrift: Zeichen fehlen: ${missing.join(' ')}`);
    else note('✓ Schrift: alle Zeichen aller Texte vorhanden');

    checkMessages(tour);
    await tour.context.close();
    return { dayStats, nightStats };
  }
}

/** Abschnitt 2: Bett, Schlafen, Speichern und Laden, kaputter Spielstand. */
async function runSaveChecks(browser, url) {
  {
    // --- 2a. Titelbild ohne Spielstand: erst »Los geht’s!« legt einen an (m7-r1) ------
    const t = await openGame(browser, `${url}index.html?debug`, 'Titelbild ohne Stand', { init: () => localStorage.clear() });
    await t.page.evaluate(() => window.zomfy.setDebug(false));
    await passSplash(t.page);
    await settle(t.page, 60); // das Titelbild nimmt erst nach dem Einblenden Tasten an
    await t.page.keyboard.press('Enter'); // Neues Spiel → Figur
    // m16-r1: Tastenspam übersprang Name und Schwierigkeit – ein Enter kurz nach dem
    // Seitenwechsel startet noch nicht (Kira)
    await t.page.waitForFunction(() => window.zomfyView().titel?.seite === 'figur' && window.zomfyView().titel?.tasten, null, { timeout: 60000 });
    const spam = await t.page.evaluate(() => window.zomfyView().titel?.bereit);
    await t.page.keyboard.press('Enter');
    await settle(t.page, 2);
    const nachSpam = await t.page.evaluate(() => ({ mode: window.zomfy.mode, seite: window.zomfyView().titel?.seite }));
    await settle(t.page, 18);
    // Verlassen der Seite in der Figurwahl (wie beim Neuladen): nichts speichern
    const inFigur = await t.page.evaluate(() => {
      window.zomfy.save();
      return { seite: window.zomfyView().titel?.seite, stand: localStorage.getItem('zomfy-towers.spielstand') };
    });
    await t.page.waitForFunction(() => window.zomfyView().titel?.bereit, null, { timeout: 60000 });
    await t.page.keyboard.press('Enter'); // »Los geht’s!« ist vorgewählt
    // N5: Erst kommt die Ankunft übers Wasser – gehaltenes Esc überspringt sie
    await t.page.waitForFunction(() => window.zomfy.mode === 'ankunft', null, { timeout: 180000 });
    await t.page.keyboard.down('Escape');
    await t.page.waitForFunction(() => window.zomfy.mode === 'dialog', null, { timeout: 180000 });
    await t.page.keyboard.up('Escape');
    const gestartet = await t.page.evaluate(() => Boolean(localStorage.getItem('zomfy-towers.spielstand')));
    if (inFigur.seite === 'figur' && inFigur.stand === null && gestartet) note('✓ Titelbild: in der Figurwahl entsteht kein Spielstand, erst »Los geht’s!« legt ihn an');
    else fail(`Titelbild ohne Stand: ${JSON.stringify({ ...inFigur, gestartet })}`);
    if (spam === false && nachSpam.mode === 'title' && nachSpam.seite === 'figur') note('✓ Titelbild (m16-r1): ein Enter gleich nach »Neues Spiel« überspringt die Figur nicht – »Los geht’s!« wartet einen Moment');
    else fail(`Titelbild, Tastenspam: ${JSON.stringify({ spam, nachSpam })}`);
    checkMessages(t);
    await t.context.close();
  }
  {
    // --- 2. Speichern und Laden -----------------------------------------------------
    const saveUrl = `${url}index.html?test`;
    const first = await openGame(browser, saveUrl, 'Speichern', { init: () => {
      if (!sessionStorage.getItem('zomfy-check-cleared')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-check-cleared', '1');
      }
    } });
    // Meilenstein 11: Drinnen ist ein eigenes Bild. Vor der Haustür führt W hinein
    // (kurz abblenden, doppelter Maßstab), S durch die Türöffnung wieder hinaus.
    await first.page.evaluate(() => {
      window.zomfy.setHorde(false);
      window.zomfy.setTime(15, 30);
      const d = window.zomfy.interior().outsideDoor;
      window.zomfy.teleport(d.x, d.z + 0.2, Math.PI);
    });
    await settle(first.page, 10);
    // Taste halten, bis Mika auf der anderen Seite der Tür ist (dann loslassen)
    const walkThrough = async (key, wantInside) => {
      await first.page.keyboard.down(key);
      for (let k = 0; k < 40; k++) {
        await settle(first.page, 4);
        if ((await first.page.evaluate(() => window.zomfy.interior().inside)) === wantInside) break;
      }
      await first.page.keyboard.up(key);
      await settle(first.page, 30);
    };
    await walkThrough('KeyW', true);
    const drinnen = await first.page.evaluate(() => ({ ...window.zomfy.interior(), figur: window.zomfyView().figur }));
    await first.page.screenshot({ path: join(SHOTS, 'innen.png') });
    note('  Screenshot: screenshots/innen.png');
    await walkThrough('KeyS', false);
    const draussen = await first.page.evaluate(() => ({ ...window.zomfy.interior(), figur: window.zomfyView().figur }));
    if (drinnen.inside && drinnen.zoom === 160 && drinnen.figur.imHaus && !draussen.inside && draussen.zoom === 80 && !draussen.figur.imHaus && Math.hypot(draussen.figur.x - draussen.outsideDoor.x, draussen.figur.z - draussen.outsideDoor.z) < 2) {
      note(`✓ Haustür: W führt hinein (eigenes Bild, ${drinnen.zoom} px/m), S durch die Türöffnung wieder hinaus vor die Tür (${draussen.zoom} px/m)`);
    } else fail(`Haustür: ${JSON.stringify({ drinnen: { inside: drinnen.inside, zoom: drinnen.zoom, figur: drinnen.figur }, draussen: { inside: draussen.inside, zoom: draussen.zoom, figur: draussen.figur } })}`);
    await first.page.evaluate(() => {
      const b = window.zomfy.game.world.interactions.find((i) => i.id === 'bett');
      window.zomfy.teleport(b.x - 0.4, b.z + 0.4, Math.PI / 2);
      window.zomfy.interact('bett'); // vor der Nacht: »Erst muss die Nacht vorbei sein.«
    });
    const vorNacht = await first.page.evaluate(() => ({ mode: window.zomfy.mode, day: window.zomfy.state().time.day }));
    await first.page.evaluate(() => {
      window.zomfy.finishDialog();
      window.zomfy.endNight(true);
      window.zomfy.interact('bett');
    });
    const asleep = await first.page.evaluate(() => window.zomfy.mode);
    if (vorNacht.mode === 'dialog' && asleep === 'sleep') note('✓ Bett: vor der Nacht gesperrt, nach der Nacht schläft Mika');
    else fail(`Bett: vor der Nacht Modus „${vorNacht.mode}“, nach der Nacht „${asleep}“`);
    await first.page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 240000 });
    const saved = await first.page.evaluate(() => JSON.parse(localStorage.getItem('zomfy-towers.spielstand') || 'null'));
    if (saved && saved.time.day === 2 && saved.version === 30 && Number.isFinite(saved.world.mapSeed)) note(`✓ Schlafen: Tag 2 begonnen und gespeichert (v30, Karte ${saved.world.mapSeed})`);
    else fail(`Schlafen: kein gültiger Spielstand nach dem Schlafen (${JSON.stringify(saved)})`);
    const bericht = await first.page.evaluate(() => window.zomfy.mode);
    if (bericht === 'report') note('✓ Morgenbericht: nach dem Aufwachen zeigt er die Nacht');
    else fail(`Morgenbericht: Modus „${bericht}“ statt „report“`);
    await first.page.screenshot({ path: join(SHOTS, 'aufwachen.png') });
    note('  Screenshot: screenshots/aufwachen.png');
    await first.page.reload();
    await first.page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
    const reloaded = await first.page.evaluate(() => window.zomfy.state());
    await settle(first.page, 10);
    const drinnenGeladen = await first.page.evaluate(() => window.zomfy.interior().inside);
    if (reloaded.time.day === 2 && Math.abs(reloaded.time.minute - 30) < 5 && drinnenGeladen) note('✓ Laden: Spielstand nach Neuladen wiederhergestellt (Tag 2, 06:30, Mika drinnen am Bett)');
    else fail(`Laden: falscher Zustand nach Neuladen (Tag ${reloaded.time.day}, Minute ${reloaded.time.minute}, drinnen ${drinnenGeladen})`);
    // Migration v9 → v30: Wer im alten Haus stand, steht jetzt im Innenraum hinter der Tür
    await first.page.evaluate(() => {
      window.zomfy.game.quietSave = () => {}; // beim Neuladen nicht über den alten Stand speichern
      const st = window.zomfy.state();
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify({ ...st, version: 9, player: { ...st.player, x: 6.5, z: -7.0 } }));
    });
    await first.page.reload();
    await first.page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
    await settle(first.page, 10);
    const v9 = await first.page.evaluate(() => ({ v: window.zomfy.state().version, p: window.zomfy.state().player, i: window.zomfy.interior() }));
    if (v9.v === 30 && v9.i.inside && Math.hypot(v9.p.x - v9.i.entry.x, v9.p.z - v9.i.entry.z) < 0.5) note('✓ Migration: Spielstand v9 wird zu v30 – wer im alten Haus stand, steht jetzt drinnen hinter der Tür');
    else fail(`Migration v9 → v30: ${JSON.stringify(v9)}`);
    checkMessages(first);
    await first.context.close();

    // Beschädigter Spielstand darf nichts kaputt machen.
    const broken = await openGame(browser, saveUrl, 'Kaputter Spielstand', {
      init: () => {
        if (!sessionStorage.getItem('zomfy-broken')) {
          localStorage.setItem('zomfy-towers.spielstand', '{kaputt');
          sessionStorage.setItem('zomfy-broken', '1');
        }
      },
    });
    const brokenState = await broken.page.evaluate(() => ({
      day: window.zomfy.state().time.day,
      backup: localStorage.getItem('zomfy-towers.spielstand.defekt'),
    }));
    if (brokenState.day === 1 && brokenState.backup === '{kaputt') note('✓ Kaputter Spielstand: beiseitegelegt, neues Spiel gestartet');
    else fail(`Kaputter Spielstand falsch behandelt: ${JSON.stringify(brokenState)}`);
    checkMessages(broken);
    await broken.context.close();
  }
}

/** Meilenstein 2: echte Eingaben (Tasten, Mausklicks) und die Spiellogik dahinter. */
async function runBuildChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave`, 'Sammeln und Bauen');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const state = () => z(() => window.zomfy.state());
  await z(() => {
    window.zomfy.setFlag('abendHinweis');
    window.zomfy.setFlag('spaetHinweis');
    window.zomfy.setFlag('abendHorde');
    window.zomfy.setFlag('ruheHinweis');
    window.zomfy.setHorde(false);
    window.zomfy.setTime(9, 0);
  });

  // Axt vom Hackklotz – mit der Taste E
  await z(() => window.zomfy.teleport(1.75, -5.2, Math.PI));
  await settle(page, 3);
  await page.keyboard.press('KeyE');
  await settle(page, 3);
  await z(() => window.zomfy.finishDialog());
  let st = await state();
  if (st.tools.axt && st.hotbar.slots[0] === 'axt') note('✓ Axt: mit E vom Hackklotz genommen, liegt in der Schnellleiste');
  else fail(`Axt: nicht genommen (${JSON.stringify(st.tools)}, ${JSON.stringify(st.hotbar)})`);

  // Baum fällen: E gedrückt halten, bis er fällt
  await z(() => window.zomfy.teleport(-5.65, 9.5, -Math.PI / 2));
  await settle(page, 3);
  const holzVorher = st.inventory.holz;
  await page.keyboard.down('KeyE');
  await page.waitForFunction(() => window.zomfy.state().world.nodes['jung-1'], null, { timeout: 180000 }).catch(() => {});
  await page.keyboard.up('KeyE');
  st = await state();
  if (st.world.nodes['jung-1'] && st.inventory.holz === holzVorher + 6) note(`✓ Sammeln: E halten fällt den Baum (+6 Holz, wächst bis Tag ${st.world.nodes['jung-1'].until} nach)`);
  else fail(`Sammeln: Baum nicht gefällt oder falscher Ertrag (Holz ${holzVorher} -> ${st.inventory.holz})`);

  // Felsen ohne Spitzhacke: nichts passiert
  await z(() => window.zomfy.teleport(-6.25, -11.1, Math.PI));
  await settle(page, 3);
  const steinVorher = st.inventory.stein;
  await z(() => window.zomfy.interact('felsen-1'));
  await settle(page, 30);
  st = await state();
  if (st.inventory.stein === steinVorher) note('✓ Werkzeug: ohne Spitzhacke gibt der Felsen nichts her');
  else fail('Werkzeug: Felsen ließ sich ohne Spitzhacke abbauen');

  // Schrott durchsuchen: einmal am Tag
  await z(() => window.zomfy.teleport(5.75, 9.75, -Math.PI / 2));
  await settle(page, 3);
  const schrottVorher = st.inventory.schrott;
  await z(() => window.zomfy.interact('schrott-1'));
  await settle(page, 45);
  st = await state();
  const erste = st.inventory.schrott - schrottVorher;
  await z(() => window.zomfy.interact('schrott-1'));
  await settle(page, 45);
  const st2 = await state();
  if (erste >= 2 && st2.inventory.schrott === st.inventory.schrott) note(`✓ Durchsuchen: +${erste} Schrott, zweites Mal am selben Tag leer`);
  else fail(`Durchsuchen: Ertrag ${erste}, danach ${st2.inventory.schrott - st.inventory.schrott}`);

  // Werkbank über die Bauleiste: Tab zweimal (Türme → Figur → Zuhause), Q, dann E setzt vor der Figur
  await z(() => {
    window.zomfy.give({ holz: 20, stein: 10 });
    window.zomfy.teleport(3.5, 2.5, 0);
  });
  await settle(page, 3);
  await page.keyboard.press('Tab');
  await settle(page, 2);
  await page.keyboard.press('Tab');
  await settle(page, 2);
  await page.keyboard.press('KeyQ');
  await settle(page, 3);
  const plan = await z(() => window.zomfy.placement);
  await page.keyboard.press('KeyE');
  await settle(page, 3);
  await z(() => window.zomfy.finishDialog());
  const bauten = await z(() => window.zomfy.buildings());
  if (plan && plan.type === 'werkbank' && bauten.some((b) => b.type === 'werkbank')) note('✓ Bauleiste: Tab wechselt zum Reiter Zuhause, Q wählt die Werkbank, E setzt sie');
  else fail(`Bauleiste: Werkbank nicht gebaut (Plan ${JSON.stringify(plan)}, Bauten ${JSON.stringify(bauten)})`);
  const zweite = await z(() => window.zomfy.build('werkbank', -6, 4));
  if (zweite === 'max') note('✓ Bauleiste: nur eine Werkbank möglich');
  else fail(`Bauleiste: zweite Werkbank ergab „${zweite}“`);

  // Esc bricht das Platzieren ab, ohne das Menü zu öffnen (Tab: zurück zu den Türmen, C = Barrikade)
  await page.keyboard.press('Tab');
  await settle(page, 2);
  await page.keyboard.press('KeyC');
  await settle(page, 3);
  await page.keyboard.press('Escape');
  await settle(page, 3);
  const nachEsc = await z(() => ({ mode: window.zomfy.mode, placement: window.zomfy.placement }));
  if (nachEsc.mode === 'play' && !nachEsc.placement) note('✓ Platzieren: Esc bricht ab, Menü bleibt zu');
  else fail(`Platzieren: nach Esc ${JSON.stringify(nachEsc)}`);

  // Barrikade mit der Maus: Kachel anklicken, dann auf ein Wegfeld klicken (M9: Barrikaden nur auf Wege)
  const spalte = await z(() => window.zomfy.pathColumn(-10));
  const wegJ = spalte[Math.floor(spalte.length / 2)];
  await z((j) => window.zomfy.teleport(-8.5, j - 3.5, 0), wegJ);
  await settle(page, 20);
  const tile = await z(() => {
    const L = window.zomfy.buildbarLayout();
    const t = L.tiles.find((x) => x.id === 'barrikade');
    return t;
  });
  await page.mouse.click(tile.x, tile.y);
  await settle(page, 3);
  const target = await z((j) => window.zomfy.screenOf(-9.5, 0, j + 0.5), wegJ);
  await page.mouse.move(target.x, target.y);
  await settle(page, 3);
  await page.mouse.click(target.x, target.y);
  await settle(page, 3);
  const perMaus = (await z(() => window.zomfy.buildings())).find((b) => b.type === 'barrikade');
  if (perMaus && perMaus.i === -10 && perMaus.j === wegJ) note(`✓ Platzieren mit der Maus: Barrikade landet genau auf dem angeklickten Wegfeld (quer zum Weg, Drehung ${perMaus.turns})`);
  else fail(`Platzieren mit der Maus: ${JSON.stringify(perMaus)} statt Feld (-10, ${wegJ})`);
  await page.mouse.click(target.x, target.y, { button: 'right' });
  await settle(page, 3);

  // Belegte Felder, Wege: Auf den Weg nur Barrikaden, daneben alles andere (M9)
  const aufsHaus = await z(() => window.zomfy.build('laternenpfahl', 6, -7));
  if (aufsHaus === 'belegt') note('✓ Raster: Haus und Hindernisse sind nicht bebaubar');
  else fail(`Raster: Bau auf dem Haus ergab „${aufsHaus}“`);
  const regeln = await z((j) => ({ turm: window.zomfy.placeCheck('bolzen', -11, j).reason, laterne: window.zomfy.placeCheck('laternenpfahl', -11, j).reason, barrikade: window.zomfy.placeCheck('barrikade', 2, 5).reason }), wegJ);
  if (regeln.turm === 'aufWeg' && regeln.laterne === 'aufWeg' && regeln.barrikade === 'nurWeg') note('✓ Wege: Türme und andere Bauten nie auf einem Wegfeld, Barrikaden nur dort');
  else fail(`Wegregeln: ${JSON.stringify(regeln)}`);
  // Abreißen: Barrikaden sind Verteidigung und geben 70 % zurück, gerundet (M9.1: 1 von 1 Holz)
  const holzVorAbriss = (await state()).inventory.holz;
  await z((id) => window.zomfy.demolish(id), perMaus?.id);
  const holzNachAbriss = (await state()).inventory.holz;
  if (holzNachAbriss === holzVorAbriss + 1) note('✓ Abreißen: Barrikade gibt 70 % zurück, gerundet (1 von 1 Holz)');
  else fail(`Abreißen: Holz ${holzVorAbriss} -> ${holzNachAbriss}`);

  // Spitzhacke an der Werkbank (m16-r1: 4 Holz, 3 Schrott, kein Stein), dann Felsen abbauen
  const steinVorHacke = (await state()).inventory.stein;
  await z(() => window.zomfy.give({ holz: 1, schrott: 3 }));
  const hacke = await z(() => window.zomfy.craft('spitzhacke'));
  st = await state();
  if (hacke && st.tools.spitzhacke && st.hotbar.slots.includes('spitzhacke') && st.inventory.stein === steinVorHacke) note('✓ Werkbank: Spitzhacke hergestellt – ohne Stein (m16-r1)');
  else fail(`Werkbank: Spitzhacke nicht hergestellt (${hacke}) oder Stein ${steinVorHacke} -> ${st.inventory.stein}`);
  await z(() => window.zomfy.teleport(-6.25, -11.1, Math.PI));
  await settle(page, 3);
  const steinVorFelsen = st.inventory.stein;
  await z(() => window.zomfy.interact('felsen-1'));
  await settle(page, 25);
  st = await state();
  if (st.inventory.stein === steinVorFelsen + 1) note('✓ Werkzeug: mit Spitzhacke gibt der Felsen Stein');
  else fail(`Werkzeug: Felsen gab ${st.inventory.stein - steinVorFelsen} Stein`);

  // Werkbank-Menü: ein kurzer Druck verwertet einmal, gehaltenes E macht gemächlich weiter
  await z(() => {
    window.zomfy.give({ stein: 9 });
    const bank = window.zomfy.buildings().find((b) => b.type === 'werkbank');
    window.zomfy.teleport(bank.i + 1, bank.j + 1.8, Math.PI);
    window.zomfy.interact(`bau-${bank.id}`);
  });
  await settle(page, 45); // gleich nach dem Öffnen stellt E nichts her (OPEN_LOCK)
  const steinVorVerwerten = (await state()).inventory.stein;
  // Mit S bis »Stein zu Schrott verwerten« (die Liste wächst mit den Meilensteinen), dann einmal kurz E
  for (let k = 0; k < 12; k++) {
    const zeilen = (await z(() => window.zomfyView().werkbank)) || [];
    if (zeilen.some((l) => l.startsWith('> Stein zu Schrott'))) break;
    await page.keyboard.press('KeyS');
    await settle(page, 2);
  }
  await page.keyboard.press('KeyE');
  await settle(page, 3);
  const nachTippen = (await state()).inventory.stein;
  await page.keyboard.down('KeyE');
  await settle(page, 60);
  await page.keyboard.up('KeyE');
  await settle(page, 3);
  const nachHalten = (await state()).inventory.stein;
  const verwertet = nachTippen - nachHalten;
  if (steinVorVerwerten - nachTippen === 2 && verwertet >= 2 && verwertet % 2 === 0) note(`✓ Werkbank: kurzer Druck verwertet einmal (2 Stein), gehaltenes E macht weiter (${verwertet} Stein)`);
  else fail(`Werkbank: Stein ${steinVorVerwerten} -> nach kurzem E ${nachTippen} -> nach gehaltenem E ${nachHalten}`);
  await settle(page, 25);
  await page.screenshot({ path: join(SHOTS, 'werkbank.png') });
  note('  Screenshot: screenshots/werkbank.png');
  await page.keyboard.press('Escape');
  await settle(page, 3);

  // Bauvorschau als Bild
  await shot(page, 'bauen', () => {
    const col = window.zomfy.pathColumn(-9);
    window.zomfy.give({ holz: 3 * col.length + 6, schrott: 4, stoff: 2 });
    for (const j of col) window.zomfy.build('barrikade', -9, j, 1);
    window.zomfy.build('laternenpfahl', -8, col[0] - 2);
    window.zomfy.teleport(-6.0, col[0] - 1.5, 0.4);
    window.zomfy.give({ holz: 3 });
    window.zomfy.startPlacement('barrikade');
  });
  await z(() => window.zomfy.cancelBuild());

  // Hausausbau zur Hütte
  await z(() => {
    window.zomfy.give({ holz: 30, stein: 16, stoff: 6, schrott: 8 });
    window.zomfy.upgradeHouse();
  });
  await page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 240000 });
  await z(() => window.zomfy.finishDialog());
  st = await state();
  if (st.world.houseLevel === 2 && st.world.homeHp === 450) note('✓ Zuhause: zur Hütte ausgebaut, Standfestigkeit 450');
  else fail(`Zuhause: Stufe ${st.world.houseLevel}, Standfestigkeit ${st.world.homeHp}`);
  // Laufen gegen die neue Veranda (von Süden her nach Norden)
  await z(() => window.zomfy.teleport(10.75, -2.5, Math.PI));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyW');
  await settle(page, 3);
  st = await state();
  if (st.player.z > -4.9) note('✓ Kollision: Anbau der Hütte ist fest');
  else fail(`Kollision: Figur ist bei z=${st.player.z.toFixed(2)} in den Anbau gelaufen`);
  await shot(page, 'huette', () => {
    window.zomfy.setTime(17, 10);
    window.zomfy.teleport(6.5, -2.0, 0.3);
  });
  await shot(page, 'huette-nacht', () => {
    window.zomfy.setTime(22, 40);
    window.zomfy.teleport(7.0, -1.5, 0.8);
    window.zomfy.toggleLantern();
  });

  // Meilenstein 11: jede Ausbaustufe ein Raum – Küche (Suppe), Schlafzimmer (Bett zieht um,
  // Gemütlichkeit +2), Werkstatt (Werkbank drinnen), Lager; dazu das Holzlager draußen
  await z(() => {
    window.zomfy.toggleLantern();
    window.zomfy.setTime(10, 0);
    window.zomfy.give({ holz: 160, stein: 70, stoff: 20, schrott: 60, zahnraeder: 6, fasern: 6 });
  });
  const stufen = [];
  for (let k = 0; k < 3; k++) {
    await z(() => window.zomfy.upgradeHouse());
    await page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 240000 });
    await z(() => window.zomfy.finishDialog());
    stufen.push(await z(() => ({ stufe: window.zomfy.state().world.houseLevel, hp: window.zomfy.state().world.homeHp, raeume: window.zomfy.interior().rooms.map((r) => r.id).join(',') })));
  }
  const raeume = await z(() => {
    const find = (id) => window.zomfy.game.world.interactions.find((i) => i.id === id);
    const bett = find('bett');
    const zimmer = window.zomfy.interior().rooms.find((r) => r.id === 'schlafzimmer');
    return { bettImSchlafzimmer: Boolean(bett && zimmer && bett.x > zimmer.minX - 1 && bett.x < zimmer.maxX), herd: Boolean(find('herd')), werkbank: Boolean(find('werkbank-innen')), lager: Boolean(find('lager')), cozy: window.zomfy.cozy() };
  });
  // Suppe am Herd: E, Antwort »Suppe kochen«
  await z(() => {
    const h = window.zomfy.game.world.interactions.find((i) => i.id === 'herd');
    window.zomfy.teleport(h.x, h.z + 0.5, Math.PI);
  });
  await settle(page, 20);
  const vorSuppe = await z(() => window.zomfy.game.combat.maxHp);
  await page.keyboard.press('KeyE');
  await settle(page, 20);
  await z(() => window.zomfy.answer(0));
  await settle(page, 10);
  const nachSuppe = await z(() => ({ max: window.zomfy.game.combat.maxHp, hp: window.zomfy.state().player.hp, soup: window.zomfy.state().player.soup, day: window.zomfy.state().time.day }));
  await page.screenshot({ path: join(SHOTS, 'kueche.png') });
  note('  Screenshot: screenshots/kueche.png');
  // Werkbank in der Werkstatt öffnet das Werkbank-Fenster
  await z(() => {
    const w = window.zomfy.game.world.interactions.find((i) => i.id === 'werkbank-innen');
    window.zomfy.teleport(w.x, w.z + 0.6, Math.PI);
  });
  await settle(page, 20);
  await page.keyboard.press('KeyE');
  await settle(page, 10);
  const werkbankModus = await z(() => window.zomfy.mode);
  await page.keyboard.press('Escape');
  await settle(page, 10);
  const stufenOk = stufen.map((x) => x.stufe).join() === '3,4,5' && stufen[2].hp === 900 && stufen[2].raeume === 'werkstatt,kueche,wohnraum,schlafzimmer,lager';
  if (stufenOk && raeume.bettImSchlafzimmer && raeume.herd && raeume.werkbank && raeume.lager && raeume.cozy === 2 && nachSuppe.max === vorSuppe + 25 && nachSuppe.hp === nachSuppe.max && nachSuppe.soup === nachSuppe.day && werkbankModus === 'craft') {
    note(`✓ Zuhause: Stufen 3–5 mit Schlafzimmer, Werkstatt und Lager (Standfestigkeit ${stufen[2].hp}); Suppe am Herd (+25 Leben), Werkbank drinnen, das Bett steht im Schlafzimmer (Gemütlichkeit +2)`);
  } else fail(`Zuhause Stufen 3–5: ${JSON.stringify({ stufen, raeume, vorSuppe, nachSuppe, werkbankModus })}`);
  await shot(page, 'schlafzimmer', () => {
    window.zomfy.setTime(21, 30);
    const r = window.zomfy.interior().rooms.find((q) => q.id === 'schlafzimmer');
    window.zomfy.teleport((r.minX + r.maxX) / 2, 3.2, Math.PI);
  });
  // Holzlager draußen: am nächsten Tag 3 Holz zum Mitnehmen (M24: vorher 2)
  const holzlager = await z(() => {
    window.zomfy.setTime(10, 0);
    window.zomfy.give({ holz: 6, stein: 2 });
    for (const [i, j] of [[1, 1], [-3, 3], [2, 5], [-4, 1], [4, 6], [-2, 6]]) {
      if (window.zomfy.placeCheck('holzlager', i, j).ok) return window.zomfy.build('holzlager', i, j);
    }
    return 'kein Platz';
  });
  await z(() => {
    window.zomfy.setDay(window.zomfy.state().time.day + 1);
    const it = window.zomfy.game.world.interactions.find((i) => i.use === 'ernten' && window.zomfy.buildings().find((b) => b.id === i.building)?.type === 'holzlager');
    window.zomfy.teleport(it.x, it.z + 1.0, Math.PI);
  });
  await settle(page, 20);
  const holzVor = (await state()).inventory.holz;
  await page.keyboard.press('KeyE');
  // Die Scheite fliegen erst zu Mika – warten, bis sie da sind (langsame Bilder im Headless)
  let holzNach = holzVor;
  for (let k = 0; k < 40 && holzNach < holzVor + 2; k++) {
    await settle(page, 8);
    holzNach = (await state()).inventory.holz;
  }
  if (holzlager === 'ok' && holzNach === holzVor + 3) note(`✓ Holzlager: gebaut, am nächsten Tag gibt E 3 Holz (${holzVor} → ${holzNach})`);
  else fail(`Holzlager: ${JSON.stringify({ holzlager, holzVor, holzNach })}`);
  checkMessages(session);
  await session.context.close();

  // Speichern und Laden der Bauten, Migration eines alten Spielstands
  const saveUrl = `${url}index.html?test`;
  const one = await openGame(browser, saveUrl, 'Bauten speichern', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m2')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m2', '1');
      }
    },
  });
  await one.page.evaluate(() => {
    window.zomfy.setHorde(false);
    window.zomfy.give({ holz: 20, stein: 5, schrott: 45, zahnraeder: 1 });
    window.zomfy.build('werkbank', 3, 5);
    const col = window.zomfy.pathColumn(-11);
    window.zomfy.build('barrikade', -11, col[1], 1);
    window.zomfy.build('bolzen', -7, -4);
    window.zomfy.finishDialog();
    const turm = window.zomfy.buildings().find((b) => b.type === 'bolzen');
    window.zomfy.upgradeTower(turm.id, 2);
    window.zomfy.upgradeTower(turm.id, 3, 'B');
    window.zomfy.teleport(4.5, 2.0, 0);
  });
  await one.page.reload();
  await one.page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await one.page.evaluate(() => window.zomfy.buildings());
  const turmGeladen = geladen.find((b) => b.type === 'bolzen');
  // M17: Tor und Wall stehen in jedem Spiel – alle sieben Teile auch nach dem Neuladen
  const lager = geladen.filter((b) => ['tor', 'wall3', 'wall4'].includes(b.type));
  const eigene = geladen.filter((b) => !['tor', 'wall3', 'wall4'].includes(b.type));
  if (eigene.length === 3 && lager.length === 7 && geladen.some((b) => b.type === 'werkbank' && b.i === 3 && b.j === 5) && turmGeladen?.level === 3 && turmGeladen?.spec === 'B') note('✓ Laden: Bauten, Turm (Stufe 3, Spezialisierung B) und alle sieben Teile von Tor und Wall stehen nach dem Neuladen wieder da');
  else fail(`Laden: Bauten nach dem Neuladen ${JSON.stringify(geladen)}`);
  checkMessages(one);
  await one.context.close();

  const old = await openGame(browser, saveUrl, 'Alter Spielstand (v1)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v1')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({
            version: 1,
            time: { day: 3, minute: 200 },
            player: { x: 1, z: 2, facing: 0, lantern: true },
            inventory: { holz: 7, stein: 2, fasern: 3, schrott: 1, stoff: 1, technik: 2 },
            hotbar: { slots: ['laterne', null, null, null, null, null, null, null], selected: 0 },
            flags: { radioGehoert: true },
            stats: { nightsSlept: 2 },
          })
        );
        sessionStorage.setItem('zomfy-v1', '1');
      }
    },
  });
  const migriert = await old.page.evaluate(() => window.zomfy.state());
  if (migriert.version === 30 && migriert.time.day === 3 && migriert.inventory.zahnraeder === 2 && !migriert.hotbar.slots.includes('laterne') && migriert.world.houseLevel === 1 && migriert.world.homeHp === 300) {
    note('✓ Migration: Spielstand v1 wird zu v30 (Technik -> Zahnräder, Laterne auf F, Zuhause 300)');
  } else fail(`Migration: ${JSON.stringify(migriert)}`);
  checkMessages(old);
  await old.context.close();

  const v2 = await openGame(browser, saveUrl, 'Alter Spielstand (v2)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v2')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({
            version: 2,
            time: { day: 4, minute: 300 },
            player: { x: 2, z: 3, facing: 0, lantern: false },
            inventory: { holz: 12, stein: 4, fasern: 2, schrott: 9, stoff: 1, zahnraeder: 1 },
            tools: { axt: true, spitzhacke: false },
            hotbar: { slots: ['axt', null, null, null, null, null, null, null], selected: 0 },
            world: { houseLevel: 1, buildings: [{ id: 1, type: 'barrikade', i: 6, j: 2, turns: 0 }], nodes: {} },
            flags: { introGesehen: true },
            stats: { nightsSlept: 3 },
          })
        );
        sessionStorage.setItem('zomfy-v2', '1');
      }
    },
  });
  const v3 = await v2.page.evaluate(() => window.zomfy.state());
  const nurLager = v3.world.buildings.length === 7 && v3.world.buildings.every((b) => ['tor', 'wall3', 'wall4'].includes(b.type));
  if (v3.version === 30 && v3.time.day === 4 && v3.player.hp === 100 && v3.player.level === 1 && v3.world.homeHp === 300 && nurLager && v3.inventory.holz === 15 && v3.inventory.schrott === 9) {
    note('✓ Migration: Spielstand v2 wird zu v30 (Leben, Zuhause, Stufe 1; die alte Barrikade gibt es als Holz zurück, Tor und Wall stehen)');
  } else fail(`Migration v2: ${JSON.stringify(v3)}`);
  checkMessages(v2);
  await v2.context.close();
}

/**
 * Meilenstein 9: die Bucht und die Wege. Drei Spawns am linken Rand, deren
 * Wege vor dem Hof zusammenlaufen; die Horde bleibt auf den Wegen; Barrikaden
 * quer über den Weg halten sie auf und zerbrechen zu Trümmern, die sich
 * tagsüber wieder aufbauen und ausbauen lassen; Überreste halten drei Tage;
 * tagsüber nur einzelne Schlurfer; die Übersichtskarte (M); Speichern v30 mit
 * dem Startwert der Karte und Migration v7 → v8. Feste Simulationsschritte.
 */
async function runPathChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Bucht und Wege');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  const state = () => z(() => window.zomfy.state());
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(9, 0);
    window.zomfy.give({ holz: 80, schrott: 40 });
  });
  await step(100);

  // Karte: drei Spawns am linken Rand, jeder Weg führt bis ans Zuhause
  const karte = await z(() => ({ info: window.zomfy.mapInfo(), traces: window.zomfy.traces() }));
  const spawnsLinks = karte.info.spawns.length === 3 && karte.info.spawns.every((s) => s.x < -50);
  const alleAmHaus = karte.traces.length === 3 && karte.traces.every((t) => t.reach < 1e8 && t.x > 3);
  if (spawnsLinks && alleAmHaus) note(`✓ Karte: Startwert ${karte.info.seed} (${karte.info.topology}), drei Spawns links, Wege ${karte.info.paths.join(', ')} – alle laufen bis ans Zuhause`);
  else fail(`Karte: ${JSON.stringify(karte)}`);
  await z(() => window.zomfy.teleport(-21, 1.0, 0.3));
  await step(900);
  await page.screenshot({ path: join(SHOTS, 'wege.png'), timeout: 180000 });
  note('  Screenshot: screenshots/wege.png');

  // Die Horde bleibt auf den Wegen (Mika steht weit weg auf dem Steg)
  await z(() => {
    window.zomfy.teleport(15, -1, 0);
    window.zomfy.spawnAtEntry('schlurfer', 'mitte', 2);
    window.zomfy.spawnAtEntry('flitzer', 'nord', 1);
    window.zomfy.spawnAtEntry('schlurfer', 'sued', 1);
  });
  let abseits = 0;
  let naechster = 99;
  for (let k = 0; k < 30; k++) {
    await step(1000);
    const r = await z(() => {
      const zs = window.zomfy.zombies().filter((q) => q.state === 'walk');
      return { off: zs.filter((q) => !window.zomfy.onPathOrYard(q.x, q.z)).length, x: Math.max(-99, ...zs.map((q) => q.x)) };
    });
    abseits += r.off;
    naechster = Math.max(-99, r.x);
  }
  if (abseits === 0 && naechster > -40) note(`✓ Horde: bleibt auf den Wegen (nach 30 s vorn bei x ${naechster.toFixed(1)}, kein Schritt abseits)`);
  else fail(`Horde abseits: ${abseits} Schritte abseits, vorderster bei x ${naechster}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1500);

  // Barrikaden quer über den letzten Abschnitt: Die Horde bleibt hängen und schlägt ein
  const reihe = await z(() => {
    const col = window.zomfy.pathColumn(-14);
    const ids = [];
    for (const j of col) {
      if (window.zomfy.build('barrikade', -14, j, 1) === 'ok') ids.push(window.zomfy.buildings().find((b) => b.i === -14 && b.j === j).id);
    }
    const mid = window.zomfy.pathColumn(-19);
    return { col, ids, traces: window.zomfy.traces(), start: mid[Math.floor(mid.length / 2)] };
  });
  const durch = reihe.traces.every((t) => t.reach < 1e8);
  await z((j) => {
    window.zomfy.teleport(-11, j + 5.5, 3.1); // weit genug weg, dass niemand Mika jagt
    window.zomfy.spawnZombie('brummer', -19, j + 0.5);
    window.zomfy.spawnZombie('schlurfer', -20, j - 0.5);
  }, reihe.start);
  let schlaegt = false;
  let bild = false;
  let zerbrochen = null;
  for (let k = 0; k < 40 && !zerbrochen; k++) {
    await step(1000);
    const r = await z(() => ({ zs: window.zomfy.zombies(), bs: window.zomfy.buildings().filter((b) => b.type === 'barrikade') }));
    if (r.zs.some((q) => q.state === 'smash')) schlaegt = true;
    if (schlaegt && !bild) {
      bild = true;
      await step(400);
      await page.screenshot({ path: join(SHOTS, 'barrikaden.png'), timeout: 180000 });
      note('  Screenshot: screenshots/barrikaden.png');
    }
    zerbrochen = r.bs.find((b) => b.broken) || null;
  }
  await step(4000);
  const danach = await z(() => window.zomfy.zombies().map((q) => ({ x: q.x, state: q.state })));
  if (reihe.ids.length >= 3 && durch && schlaegt && zerbrochen && danach.some((q) => q.x > -13.5)) note(`✓ Barrikaden: ${reihe.ids.length} quer über den Weg – die Horde schlägt ein, eine zerbricht zu Trümmern, die Schlurfer ziehen weiter`);
  else fail(`Barrikaden: ${JSON.stringify({ ids: reihe.ids, durch, schlaegt, zerbrochen, danach })}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1500);

  // Tagsüber: Trümmer wieder aufbauen, ausbauen bis Metall, Schaden sichtbar, flicken
  const aufbau = await z((id) => {
    const holz = window.zomfy.state().inventory.holz;
    window.zomfy.rebuildBarricade(id);
    const b1 = window.zomfy.buildings().find((b) => b.id === id);
    const kosten = holz - window.zomfy.state().inventory.holz;
    window.zomfy.give({ holz: 20, schrott: 20 });
    window.zomfy.upgradeBarricade(id);
    window.zomfy.upgradeBarricade(id);
    const b3 = window.zomfy.buildings().find((b) => b.id === id);
    const treffer = window.zomfy.hitBarricade(id, 100);
    window.zomfy.rebuildBarricade(id);
    const geflickt = window.zomfy.buildings().find((b) => b.id === id);
    return { kosten, b1, b3, treffer, geflickt };
  }, zerbrochen?.id);
  if (aufbau.kosten === 1 && !aufbau.b1?.broken && aufbau.b3?.level === 3 && aufbau.treffer?.look === 'kaputt' && Math.round(aufbau.treffer.hp) === 65 && aufbau.geflickt?.hp === undefined) {
    note('✓ Barrikaden: Trümmer für 1 Holz wieder aufgebaut, ausgebaut bis zum Metallkreuz (fängt ein Viertel ab), Schaden sichtbar, geflickt');
  } else fail(`Barrikaden am Tag: ${JSON.stringify(aufbau)}`);

  // Überreste halten drei Tage (auch über das Schlafen hinweg)
  const liegen = await z(() => {
    window.zomfy.dropLoot(-2, 6, 3);
    window.zomfy.teleport(15, -1, 0);
    return window.zomfy.state().time.day;
  });
  await step(1500);
  const vorher = (await z(() => window.zomfy.lootDetails())).length;
  await z((d) => window.zomfy.setDay(d + 2), liegen);
  await step(300);
  const nachZwei = (await z(() => window.zomfy.lootDetails())).length;
  await z((d) => {
    window.zomfy.setDay(d + 3);
    window.zomfy.setTime(23, 0); // später als beim Fallenlassen: drei volle Tage vorbei
  }, liegen);
  await step(300);
  const nachDrei = (await z(() => window.zomfy.lootDetails())).length;
  if (vorher >= 3 && nachZwei === vorher && nachDrei === 0) note(`✓ Überreste: ${vorher} Zombieteile liegen nach zwei Tagen noch, nach drei Tagen sind sie verrottet`);
  else fail(`Überreste: ${JSON.stringify({ vorher, nachZwei, nachDrei })}`);

  // Zombieteile (M9.1): selbst erschlagen – immer; durch Türme etwa jedes zweite Mal; der Anführer immer
  const beute = await z(() => {
    window.zomfy.teleport(15, -1, 0); // Mika auf dem Steg, weit weg vom Magneten
    // Die Abschüsse bringen Erfahrung – danach wie vorher (sonst öffnet sich mittendrin eine Perk-Wahl)
    const st = window.zomfy.game.state;
    const vorher = { xp: st.player.xp, level: st.player.level, choice: st.perkChoice, kills: st.stats.kills };
    const run = (type, source, n) => {
      let mit = 0;
      for (let k = 0; k < n; k++) {
        window.zomfy.game.loot.clear();
        const id = window.zomfy.spawnZombie(type, -20, 0.5);
        window.zomfy.killZombie(id, source);
        if (window.zomfy.lootItems().some((l) => l.res === 'teile')) mit++;
      }
      window.zomfy.game.loot.clear();
      return mit;
    };
    const out = { hand: run('schlurfer', 'spieler', 12), turm: run('schlurfer', 'turm', 40), anfuehrer: run('anfuehrer', 'turm', 3) };
    Object.assign(st.player, { xp: vorher.xp, level: vorher.level });
    st.perkChoice = vorher.choice;
    st.stats.kills = vorher.kills;
    return out;
  });
  await z(() => window.zomfy.killAllZombies());
  await step(500);
  if (beute.hand === 12 && beute.turm >= 10 && beute.turm <= 30 && beute.anfuehrer === 3) note(`✓ Zombieteile: selbst erschlagen 12 von 12, durch Türme ${beute.turm} von 40, Anführer 3 von 3`);
  else fail(`Zombieteile: ${JSON.stringify(beute)}`);

  // Tagsüber nur einzelne Schlurfer – keine Trupps
  const tage = await z(async () => {
    const { planDay } = await import('/src/data/waves.js');
    const out = [];
    for (let d = 1; d <= 10; d++) out.push(planDay(d, 1234, ['nord', 'mitte', 'sued']).map((e) => e.count));
    return out;
  });
  if (tage.every((d) => d.length <= 3 && d.every((n) => n === 1))) note(`✓ Tag: nur einzelne Schlurfer (${tage.map((d) => d.length).join(', ')} je Tag)`);
  else fail(`Tagesschlurfer: ${JSON.stringify(tage)}`);

  // Übersichtskarte mit M: öffnet, zeigt die Wege, M schließt
  await page.keyboard.press('KeyM');
  await step(300);
  const offen = await z(() => window.zomfy.mode);
  await page.screenshot({ path: join(SHOTS, 'karte.png'), timeout: 180000 });
  note('  Screenshot: screenshots/karte.png');
  await page.keyboard.press('KeyM');
  await step(300);
  const zu = await z(() => window.zomfy.mode);
  if (offen === 'karte' && zu === 'play') note('✓ Karte: M öffnet die Übersicht der Wege, M schließt sie');
  else fail(`Karte: offen ${offen}, danach ${zu}`);
  checkMessages(session);
  await session.context.close();

  // Speichern v30: Der Startwert der Karte liegt im Spielstand und gilt nach dem Laden
  const eins = await openGame(browser, `${url}index.html?test&map=123`, 'Karte speichern', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m9')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m9', '1');
      }
    },
  });
  const vorLaden = await eins.page.evaluate(() => {
    window.zomfy.save();
    return window.zomfy.mapInfo();
  });
  checkMessages(eins);
  await eins.page.close(); // die zweite Seite lädt sonst neben der ersten sehr langsam
  const zwei = await eins.context.newPage();
  const meldungen = [];
  zwei.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && meldungen.push(m.text()));
  zwei.on('pageerror', (e) => meldungen.push(e.message));
  await zwei.goto(`${url}index.html?test`, { timeout: 180000 });
  await zwei.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const nachLaden = await zwei.evaluate(() => ({ info: window.zomfy.mapInfo(), v: window.zomfy.state().version, seed: window.zomfy.state().world.mapSeed }));
  if (vorLaden.seed === 123 && nachLaden.seed === 123 && nachLaden.info.seed === 123 && nachLaden.v === 30 && JSON.stringify(nachLaden.info.merge) === JSON.stringify(vorLaden.merge)) note('✓ Speichern v30: Startwert der Karte im Spielstand – nach dem Laden dasselbe Wegenetz');
  else fail(`Speichern v30: ${JSON.stringify({ vorLaden, nachLaden })}`);
  if (meldungen.length) fail(`Karte laden: Konsolenmeldungen ${meldungen.join(' | ')}`);
  await eins.context.close();

  // Migration v7 -> v8: Türme und Barrikaden gibt es zurück, Werkbank und Zelt ziehen in die Bucht
  const alt = await openGame(browser, `${url}index.html?test`, 'Alter Spielstand (v7)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v7')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({
            version: 7,
            time: { day: 5, minute: 200 },
            player: { x: 1, z: 2, hp: 90, name: 'Kira' },
            inventory: { holz: 5, schrott: 12, teile: 7 },
            world: {
              houseLevel: 1,
              homeHp: 300,
              buildings: [
                { id: 1, type: 'bolzen', i: 3, j: 4, turns: 0, level: 2 },
                { id: 2, type: 'barrikade', i: 0, j: 5, turns: 0 },
                { id: 3, type: 'werkbank', i: -3, j: -3, turns: 0 },
                { id: 4, type: 'zelt', i: 5, j: 5, turns: 0 },
              ],
              searched: { auto: 2 },
              trader: { day: 0, sold: {} },
              tower: 1,
            },
            survivors: { hilde: { stage: 3, day: 3, tent: 4, errand: 2 } },
            flags: { introGesehen: true, autoLeer: true },
          })
        );
        sessionStorage.setItem('zomfy-v7', '1');
      }
    },
  });
  const m = await alt.page.evaluate(() => ({ st: window.zomfy.state(), meldungen: window.zomfyView().meldungen || [] }));
  // M17: Tor und Wall kommen in jedem Stand dazu – hier zählen die eigenen Bauten
  const typen = m.st.world.buildings.filter((b) => !['tor', 'wall3', 'wall4'].includes(b.type)).map((b) => b.type).sort().join(',');
  const zelt = m.st.world.buildings.find((b) => b.type === 'zelt');
  if (m.st.version === 30 && Number.isFinite(m.st.world.mapSeed) && typen === 'werkbank,zelt' && zelt?.id === 4 && m.st.survivors.hilde.tent === 4 && m.st.inventory.holz >= 8 && m.st.inventory.schrott > 12 && m.st.inventory.teile === 7 && m.st.flags.wrackLeer && Math.hypot(m.st.player.x - 5.5, m.st.player.z + 3) < 1 && m.meldungen.some((t) => t.startsWith('Neue Karte'))) {
    note(`✓ Migration: v7 wird zu v30 – neue Karte (${m.st.world.mapSeed}), Turm und Barrikade erstattet (Holz ${m.st.inventory.holz}, Schrott ${m.st.inventory.schrott}), Werkbank und Hildes Zelt in der Bucht neu aufgestellt`);
  } else fail(`Migration v7: ${JSON.stringify({ v: m.st.version, seed: m.st.world.mapSeed, typen, zelt, hilde: m.st.survivors.hilde, inv: m.st.inventory, flags: m.st.flags, p: m.st.player, meldungen: m.meldungen })}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * Meilenstein 3: Türme, Horde, Loot, Nacht und Morgenbericht. Läuft in festen
 * Simulationsschritten (Playtest-Brücke), damit das Ergebnis nicht von der
 * Rechengeschwindigkeit abhängt.
 */
async function runNightChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Nächte und Türme');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const state = () => z(() => window.zomfy.state());
  // Stufenaufstiege (Meilenstein 4) öffnen die Perk-Wahl und halten das Spiel an:
  // unterwegs einfach die erste Karte nehmen
  const step = async (ms) => {
    await z((t) => window.__zomfyStep(t), ms);
    await z(() => {
      const choice = window.zomfy.state().perkChoice;
      if (window.zomfy.mode === 'perk' && choice) window.zomfy.choosePerk(choice[0]);
    });
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis']) window.zomfy.setFlag(f);
    window.zomfy.setTime(9, 0);
    window.zomfy.teleport(0, 1.5, 0);
    window.zomfy.give({ schrott: 60, zahnraeder: 2, holz: 10 });
  });
  await step(100);

  // Tagsüber nagen Schlurfer das Zuhause höchstens bis auf drei Viertel an (m5-r1)
  await z(() => {
    window.zomfy.setHomeHp(235);
    window.zomfy.spawnZombie('brummer', 6.0, -4.2);
  });
  await step(8000);
  const tagHp = (await state()).world.homeHp;
  await z(() => {
    window.zomfy.setHorde(false); // räumt ohne Abschuss und Loot ab
    window.zomfy.setHorde(true);
    window.zomfy.setHomeHp(300);
    window.zomfy.teleport(0, 1.5, 0);
  });
  await step(1500);
  if (tagHp >= 225 && tagHp < 235) note(`✓ Tagsüber: Schlurfer nagen das Zuhause höchstens bis auf drei Viertel an (${Math.round(tagHp)}/300)`);
  else fail(`Tagsüber: Zuhause ${tagHp}/300 (erwartet 225 bis 234)`);

  // Eine Stunde vor der Horde: Steht am Weg der ersten Welle kein Turm, sagt es Mika (m7-r1)
  await z(() => window.zomfy.setTime(19, 45));
  await step(600);
  const warnung = (await z(() => window.zomfyView())).gedanke || '';
  await z(() => window.zomfy.setTime(9, 0));
  await step(100);
  if (warnung.includes('kein Turm')) note(`✓ Abends: Warnung vor dem Weg ohne Turm („${warnung}“)`);
  else fail(`Abends: keine Warnung vor dem Weg ohne Turm (Gedanke: ${warnung || '–'})`);

  // Turm mit der Tastatur: Q wählt den Bolzenwerfer, E setzt ihn vor die Figur
  await page.keyboard.press('KeyQ');
  await step(100);
  const plan = await z(() => window.zomfy.placement);
  await page.keyboard.press('KeyE');
  await step(100);
  await z(() => window.zomfy.finishDialog());
  const turm = (await z(() => window.zomfy.buildings())).find((b) => b.type === 'bolzen');
  if (plan?.type === 'bolzen' && turm) note(`✓ Türme: Q wählt den Bolzenwerfer, E setzt ihn (Feld ${turm.i}, ${turm.j})`);
  else fail(`Türme: kein Bolzenwerfer gebaut (Plan ${JSON.stringify(plan)})`);
  const musikTag = await z(() => window.zomfy.sound()); // M10d: nach der ersten Taste läuft tagsüber das ruhige Stück

  // Ein Bau, der der Horde den letzten Weg zum Haus abschneidet, wird abgelehnt
  // (M9: nur noch im Hof möglich – Barrikaden schneiden nie ab, die Horde schlägt sich durch)
  const weg = await z(() => {
    const cells = [];
    for (let j = -7; j < 9; j++) cells.push([-6, j]);
    return window.zomfy.pathBlocked(cells);
  });
  if (weg === true) note('✓ Wege: Ein Bau, der den Hof vom Weg abschneiden würde, wird abgelehnt');
  else fail(`Wege: Querriegel im Hof ergab ${weg} statt true`);

  // Der Turm erledigt einen Schlurfer, der Loot fallen lässt
  if (turm) {
    // Mika geht aus dem Sammelradius, sonst fliegt das Loot sofort heran.
    // Turm-Abschüsse lassen nur jedes zweite Mal Teile (M9.1) – hier sicher, die Regel prüft `wege`
    await z((t) => {
      window.zomfy.setPartsChance(1);
      window.zomfy.teleport(t.i + 4, t.j + 0.5, 0);
      window.zomfy.spawnZombie('schlurfer', t.i - 3.5, t.j + 0.5);
    }, turm);
    let kills = 0;
    for (let k = 0; k < 24 && !kills; k++) {
      await step(500);
      kills = (await state()).stats.kills || 0;
    }
    const loot = await z(() => window.zomfy.lootItems());
    await z(() => window.zomfy.setPartsChance(null));
    if (kills === 1 && loot.length) note(`✓ Türme: Bolzenwerfer erledigt einen Schlurfer, Loot liegt am Boden (${loot.map((l) => l.res).join(', ')})`);
    else fail(`Türme: ${kills} Abschüsse, ${loot.length} Loot`);

    // Liegt die Beute außerhalb des Bildes, zeigt eine Raute am Rand hin
    await z((l) => window.zomfy.teleport(l.x + 13, l.z, 0), loot[0] || { x: 0, z: 0 });
    await step(300);
    const marken = (await z(() => window.zomfyView())).randMarken || [];
    if (marken.some((m) => m.startsWith('beute'))) note(`✓ Loot: außerhalb des Bildes zeigt eine Randmarke hin (${marken.join(', ')})`);
    else fail(`Loot: keine Randmarke (${JSON.stringify(marken)})`);

    // Einsammeln: hinlaufen reicht, der Magnet zieht es heran
    // Meilenstein 8: Schlurfer lassen Zombieteile fallen (Schrott gibt es bei Balduin)
    const vorher = (await state()).inventory.teile || 0;
    if (loot.length) await z((l) => window.zomfy.teleport(l.x + 0.8, l.z, 0), loot[0]);
    await step(2000);
    const nachher = (await state()).inventory.teile || 0;
    const liegt = (await z(() => window.zomfy.lootItems())).length;
    if (nachher > vorher && liegt < loot.length) note(`✓ Loot: Zombieteile im Sammelradius eingesammelt (${vorher} → ${nachher})`);
    else fail(`Loot: nicht eingesammelt (Zombieteile ${vorher} → ${nachher}, liegt noch ${liegt})`);

    // Ausbauen über die Auswahl: Q fragt nach, zweites Q kauft Stufe 2 – dann dasselbe für Spezialisierung A
    await z((id) => window.zomfy.selectBuilding(id), turm.id);
    await step(100);
    await page.keyboard.press('KeyQ');
    await step(100);
    const nachEinemQ = (await z(() => window.zomfy.buildings())).find((b) => b.id === turm.id)?.level;
    await page.keyboard.press('KeyQ');
    await step(600);
    await page.keyboard.press('KeyQ');
    await step(100);
    await page.keyboard.press('KeyQ');
    await step(100);
    const aus = (await z(() => window.zomfy.buildings())).find((b) => b.id === turm.id);
    if (nachEinemQ === 1 && aus?.level === 3 && aus?.spec === 'A') note('✓ Ausbau: ein Q fragt nach, zweimal Q kauft – Stufe 2, dann Spezialisierung A');
    else fail(`Ausbau: nach einem Q Stufe ${nachEinemQ}, danach ${JSON.stringify(aus)}`);

    // Abreißen liegt auf V: ein gewohntes R (sonst Katapult) reißt nie einen Turm ab
    for (const key of ['KeyR', 'KeyR', 'KeyV']) {
      await page.keyboard.press(key);
      await step(100);
    }
    const stehtNoch = (await z(() => window.zomfy.buildings())).some((b) => b.id === turm.id);
    const rueckfrage = ((await z(() => window.zomfyView())).meldungen || []).some((m) => m.startsWith('Nochmal'));
    if (stehtNoch && rueckfrage) note('✓ Auswahl: R reißt nichts ab, Abreißen liegt auf V (mit Rückfrage)');
    else fail(`Auswahl: Turm steht noch ${stehtNoch}, Rückfrage ${rueckfrage}`);
    await page.keyboard.press('Escape');
    await step(100);
  }

  // Wegvorschau beim Turmbau als Bild
  await z(() => window.zomfy.teleport(-3.0, -2.5, 0));
  await page.keyboard.press('KeyQ');
  await step(600);
  await page.screenshot({ path: join(SHOTS, 'turm-bauen.png') });
  note('  Screenshot: screenshots/turm-bauen.png');
  await page.keyboard.press('Escape');
  await step(100);

  // Nacht 1: drei Türme ums Haus, die Horde kommt um 20:30 in Wellen
  const staffel = await z(() => {
    const vor = window.zomfy.state().inventory.schrott;
    window.zomfy.build('bolzen', 3, -5);
    const zweiter = vor - window.zomfy.state().inventory.schrott;
    window.zomfy.build('bolzen', 10, -4);
    window.zomfy.teleport(0.5, 1.0, 0);
    window.zomfy.setTime(20, 25);
    return zweiter;
  });
  if (staffel === 10) note('✓ Staffelpreis: der zweite Bolzenwerfer kostet 10 statt 8 Schrott');
  else fail(`Staffelpreis: zweiter Bolzenwerfer kostete ${staffel}`);
  await step(6000);
  const n1 = await z(() => window.zomfy.nightState());
  if (n1.night.n === 1 && n1.night.wave >= 1 && n1.alive + n1.queue > 0) note(`✓ Nacht: um 20:30 kommt Welle 1 (${n1.alive + n1.queue} Schlurfer)`);
  else fail(`Nacht: Welle 1 kam nicht (${JSON.stringify(n1)})`);
  const richtung = (await z(() => window.zomfyView())).nacht?.richtung || '';
  if (richtung.startsWith('Aus: ')) note(`✓ Nachtleiste: zeigt, woher die Welle kommt („${richtung}“)`);
  else fail(`Nachtleiste: keine Richtung („${richtung}“)`);
  const repWelle = await z(() => {
    const hp = window.zomfy.state().world.homeHp;
    window.zomfy.setHomeHp(250);
    const o = window.zomfy.buildOptions().find((x) => x.id === 'reparieren');
    window.zomfy.repairAll();
    const nach = window.zomfy.state().world.homeHp;
    window.zomfy.setHomeHp(hp);
    return { disabled: o?.disabled, nach };
  });
  if (repWelle.disabled && repWelle.nach === 250) note('✓ Reparieren: mitten in der Welle gesperrt');
  else fail(`Reparieren in der Welle: ${JSON.stringify(repWelle)}`);
  // Bild: ein Trupp kommt den letzten Wegabschnitt herauf in den Hof, den Türmen vor die Bolzen
  await z(() => {
    for (let k = 0; k < 5; k++) window.zomfy.spawnZombie(k === 2 ? 'brummer' : 'schlurfer', -7.5 + k * 1.1, 0.8 + (k % 2) * 1.0);
  });
  await step(2200);
  await page.screenshot({ path: join(SHOTS, 'horde.png') });
  note('  Screenshot: screenshots/horde.png');
  let nacht = n1;
  for (let k = 0; k < 90 && !nacht.night.done; k++) {
    await step(5000);
    // m16-r1: Eine Wahl (Perk, Fähigkeit, Bauplan) geht auch nachts in Ruhe auf und hält das
    // Spiel an – hier nicht Thema: die erste Karte nehmen
    await z(() => {
      const g = window.zomfy.game;
      if (window.zomfy.mode !== 'perk') return;
      const id = g.perkChoice.options[0];
      if (g.perkChoice.kind === 'perk') window.zomfy.choosePerk(id);
      else if (g.perkChoice.kind === 'bauplan') window.zomfy.chooseBlueprint(id);
      else window.zomfy.chooseSkill(id);
    });
    nacht = await z(() => window.zomfy.nightState());
  }
  const home = (await state()).world.homeHp;
  if (nacht.night.done && nacht.night.won) note(`✓ Nacht 1 überstanden: ${nacht.night.kills} Schlurfer besiegt, Zuhause ${home}/300`);
  else {
    const rest = await z(() => {
      const g = window.zomfy.game;
      return g.horde.list.filter((q) => q.state !== 'dying').slice(0, 4).map((q) => {
        const dir = g.world.pathing.direction(q.x, q.z, true);
        const ahead = dir ? g.world.buildings.atCell(Math.floor(q.x + dir.x * 0.55), Math.floor(q.z + dir.z * 0.55)) : null;
        return { t: q.type, x: +q.x.toFixed(2), z: +q.z.toFixed(2), s: q.state, speed: +q.speed.toFixed(2), slow: q.slow, frz: q.freezeT, stun: q.stunT, lure: q.lureT, dir: dir ? [+dir.x.toFixed(2), +dir.z.toFixed(2)] : null, ahead: ahead ? `${ahead.type}@${ahead.i},${ahead.j}` : null, kx: +q.kx.toFixed(2) };
      });
    });
    await z(() => window.zomfy.teleport(-13, 1.5, 0));
    await step(300);
    await page.screenshot({ path: join(SHOTS, 'nacht1-fehler.png') });
    fail(`Nacht 1: nicht geschafft (${JSON.stringify(nacht)}, Zuhause ${home}, übrig ${JSON.stringify(rest)})`);
  }

  // Nach der Nacht: Reparieren geht wieder – reicht der Vorrat nicht, dann anteilig
  const teil = await z(() => {
    const s = window.zomfy.state();
    window.zomfy.setHomeHp(100);
    window.zomfy.give({ holz: 2 - (s.inventory.holz || 0), schrott: 10 - (s.inventory.schrott || 0) });
    window.zomfy.repairAll();
    const n = window.zomfy.state();
    return { hp: n.world.homeHp, holz: n.inventory.holz };
  });
  if (teil.hp > 100 && teil.hp < 300 && teil.holz === 0) note(`✓ Reparieren: Vorrat reicht nur teilweise – Zuhause 100 → ${Math.round(teil.hp)}`);
  else fail(`Teilreparatur: ${JSON.stringify(teil)}`);

  // Schlafen, Morgenbericht, weiter mit E
  await z(() => window.zomfy.interact('bett'));
  for (let k = 0; k < 20 && (await z(() => window.zomfy.mode)) === 'sleep'; k++) await step(1000);
  const view = await z(() => window.zomfyView());
  if (view.modus === 'report' && view.bericht?.length) note(`✓ Morgenbericht: ${view.bericht.find((l) => !l.startsWith('Sterne:')) || view.bericht[0]}`); // ohne die Sternenzeile (M25)
  else fail(`Morgenbericht fehlt (Modus ${view.modus})`);
  await step(600);
  await page.screenshot({ path: join(SHOTS, 'bericht.png') });
  note('  Screenshot: screenshots/bericht.png');
  await page.keyboard.press('KeyE');
  await step(200);
  if ((await z(() => window.zomfy.mode)) === 'play') note('✓ Morgenbericht: E schließt ihn');
  else fail('Morgenbericht: E schließt ihn nicht');

  // Nacht 2 verloren: kostet Material, nie den Spielstand
  await z(() => {
    window.zomfy.setTime(20, 28);
    window.zomfy.teleport(6, 4, 0);
  });
  // In kleinen Schritten: Eine offene Perk-Wahl geht erst in Ruhe auf (m12-r1) und hält das Spiel
  // an (seit m16-r1 auch nachts) – hier nicht Thema: die erste Karte nehmen
  for (let k = 0; k < 8; k++) {
    await step(500);
    await z(() => {
      const g = window.zomfy.game;
      if (window.zomfy.mode !== 'perk') return;
      const id = g.perkChoice.options[0];
      if (g.perkChoice.kind === 'perk') window.zomfy.choosePerk(id);
      else if (g.perkChoice.kind === 'bauplan') window.zomfy.chooseBlueprint(id);
      else window.zomfy.chooseSkill(id);
    });
  }
  const musikNacht = await z(() => window.zomfy.sound()); // M10d: während der Welle das treibende Stück
  await z(() => {
    window.zomfy.setHomeHp(3);
    window.zomfy.spawnZombie('brummer', 5.5, -4.3);
    window.zomfy.spawnZombie('brummer', 8.5, -4.3);
  });
  for (let k = 0; k < 30; k++) {
    await step(1000);
    const m = await z(() => window.zomfy.mode);
    if (m === 'report') break;
    // M16: Eine Wahl (Perk oder Fähigkeit), die in Ruhe aufgeht, hält das Spiel an – hier nicht Thema
    if (m === 'perk') {
      await z(() => {
        const g = window.zomfy.game;
        const id = g.perkChoice.options[0];
        if (g.perkChoice.kind === 'perk') window.zomfy.choosePerk(id);
        else if (g.perkChoice.kind === 'bauplan') window.zomfy.chooseBlueprint(id); // M19
        else window.zomfy.chooseSkill(id);
      });
    }
  }
  const verloren = await state();
  const bericht2 = (await z(() => window.zomfyView())).bericht || [];
  // Was die Niederlage kostet, steht im Bericht (der Vorrat selbst kann durch Loot derselben Nacht wachsen)
  const verlustZeile = bericht2.find((l) => l.startsWith('Verloren:')) || '';
  if (verloren.stats.nightsLost === 1 && verloren.time.day === 3 && /Schrott/.test(verlustZeile) && verloren.world.homeHp > 0) {
    note(`✓ Verlorene Nacht: ${verlustZeile.replace('Verloren: ', '')} weg, Zuhause wieder ${verloren.world.homeHp}, Tag 3 beginnt (${bericht2[0]})`);
  } else fail(`Verlorene Nacht: ${JSON.stringify({ lost: verloren.stats.nightsLost, day: verloren.time.day, home: verloren.world.homeHp, bericht2 })}`);

  // Soundtrack (M10d): tagsüber gemütlich, bei der Welle treibend; jedes Stück ohne
  // Lautsprecher berechnet – keine Übersteuerung, keine kaputten Samples, nicht stumm
  const pegel = {};
  for (const [id, threat] of [['tag', 0], ['abend', 0], ['nacht', 2], ['boss', 2], ['titel', 0], ['jingle', 0]]) pegel[id] = await z(([id, threat]) => window.zomfy.renderMusic(id, 8, threat), [id, threat]);
  const pegelOk = Object.values(pegel).every((p) => p.bad === 0 && p.peak < 0.95 && p.rms > 0.01);
  if (musikTag.music === 'tag' && musikNacht.music === 'nacht' && pegelOk) {
    note(`✓ Musik: tagsüber »Morgen am See«, während der Welle »Die Horde kommt«, dazu Titelstück und Spieluhr (N2); Spitzen ${Object.entries(pegel).map(([id, p]) => `${id} ${p.peak.toFixed(2)}`).join(', ')}`);
  } else fail(`Musik: ${JSON.stringify({ tag: musikTag, nacht: musikNacht, pegel })}`);
  checkMessages(session);
  await session.context.close();
}

/**
 * Meilenstein 4: Waffen, Treffer, Betäubung, Ausweichrolle, Erfahrung,
 * Perk-Wahl, Waffen-Aufwertung und Speichern (feste Simulationsschritte).
 */
/**
 * Meilenstein 6: Ankunft, Kennenlernen mit echten Tasten, Zelt und Einzug,
 * Tauschen, Morgengaben, Einrichten mit Gemütlichkeit, Funkturm bis zum
 * Leuchtfeuer, Knopf bellt vor der Welle, Speichern/Laden und Migration v4 → v5.
 */
async function runSurvivorChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Überlebende', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m6')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m6', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  const press = async (key, ms = 60) => {
    await page.keyboard.press(key);
    await step(ms);
  };
  /** Dialog mit E durchblättern, bis Antworten stehen (oder er zu ist). */
  const toAnswers = async () => {
    for (let k = 0; k < 12; k++) {
      const d = (await view()).dialog;
      if (!d) return null;
      if (d.fertigGetippt && d.antworten.length) return d.antworten;
      await press('KeyE', 350);
    }
    return null;
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(10, 0);
    window.zomfy.give({ holz: 40, stein: 10, schrott: 40, fasern: 20, stoff: 20 });
  });
  await step(100);

  // Tag 1: noch niemand da, kein Reiter »Einrichten«
  const tag1 = await z(() => window.zomfy.survivors());
  if (Object.values(tag1).every((s) => s.stage === 0)) note('✓ Überlebende: an Tag 1 ist noch niemand da');
  else fail(`Überlebende an Tag 1: ${JSON.stringify(tag1)}`);

  // Tag 2: Knopf sitzt am Briefkasten
  await z(() => {
    window.zomfy.setDay(2);
    window.zomfy.arrive();
  });
  await step(200);
  const knopf = await z(() => window.zomfy.npcPos('knopf'));
  if (knopf && knopf.visible && Math.hypot(knopf.x + 5.5, knopf.z - 6.0) < 1) note('✓ Ankunft: an Tag 2 sitzt Knopf am Briefkasten');
  else fail(`Ankunft Knopf: ${JSON.stringify(knopf)}`);

  // Kennenlernen mit echten Tasten: hingehen, E, Antwort »Komm her, Knopf!«
  await z(([x, zz]) => window.zomfy.teleport(x, zz + 1.1, Math.PI), [knopf.x, knopf.z]);
  await step(200);
  const hinweis = (await view()).hinweis;
  await press('KeyE', 300);
  const antworten = await toAnswers();
  await press('KeyE', 300); // m16-r1: »Komm her, Knopf!« ist vorgewählt
  const knopfStufe = (await z(() => window.zomfy.survivors())).knopf.stage;
  if (hinweis === 'Streicheln' && antworten && antworten[0].includes('Komm her') && knopfStufe === 3) note('✓ Knopf: »E Streicheln«, »Komm her, Knopf!« ist vorgewählt – E, und er bleibt');
  else fail(`Knopf: Hinweis ${hinweis}, Antworten ${JSON.stringify(antworten)}, Stufe ${knopfStufe}`);

  // Tag 3: Oma Hilde – ansprechen (Gast), Zelt bauen, einziehen, tauschen
  await z(() => {
    window.zomfy.setDay(3);
    window.zomfy.arrive();
    window.zomfy.talkTo('hilde');
    window.zomfy.finishDialog();
  });
  await step(900);
  const gast = (await z(() => window.zomfy.survivors())).hilde.stage;
  const zelt = await z(() => window.zomfy.build('zelt', -4, 6));
  await z(() => window.zomfy.talkTo('hilde'));
  await step(300);
  const hildeAntworten = await toAnswers();
  const einziehen = (hildeAntworten || []).findIndex((a) => a.includes('Zelt'));
  await z((i) => window.zomfy.answer(i), einziehen);
  await step(200);
  // Kaum eingezogen, bittet Hilde um etwas: Der Auftrag steht im Ziel-Feld
  const bitte = (await view()).dialog?.sprecher || null;
  await z(() => window.zomfy.finishDialog());
  await step(100);
  const hildeZiel = (await view()).ziel || '';
  const hilde = (await z(() => window.zomfy.survivors())).hilde;
  const zeltId = (await z(() => window.zomfy.buildings())).find((b) => b.type === 'zelt')?.id;
  if (gast === 2 && zelt === 'ok' && hilde.stage === 3 && hilde.tent === zeltId) note('✓ Einzug: Hilde ist Gast, nach dem Zeltbau zieht sie ein (Zelt gehört ihr)');
  else fail(`Einzug Hilde: Gast ${gast}, Zelt ${zelt}, jetzt ${JSON.stringify(hilde)} (Zelt ${zeltId})`);
  const vorher = (await z(() => window.zomfy.state())).inventory;
  await z(() => window.zomfy.talkTo('hilde'));
  await step(300);
  const tausch = await toAnswers();
  const tauschIndex = (tausch || []).findIndex((a) => a.includes('Tauschen'));
  await z((i) => window.zomfy.answer(i), tauschIndex);
  await step(200);
  const nachher = (await z(() => window.zomfy.state())).inventory;
  // Tag 3: drittes Angebot der Liste (5 Fasern gegen 1 Stoff)
  if (tauschIndex >= 0 && nachher.fasern === vorher.fasern - 5 && nachher.stoff === vorher.stoff + 1) note('✓ Tauschen: Hildes Angebot des Tages (5 Fasern gegen 1 Stoff)');
  else fail(`Tauschen: Antworten ${JSON.stringify(tausch)}, Fasern ${vorher.fasern} -> ${nachher.fasern}, Stoff ${vorher.stoff} -> ${nachher.stoff}`);

  // Aufträge: Hilde will 8 Fasern für einen Schal (+15 Lebenspunkte)
  const lebenVorher = await z(() => window.zomfy.maxHp());
  await z(() => window.zomfy.give({ fasern: 10 }));
  await z(() => window.zomfy.talkTo('hilde'));
  await step(300);
  const abgabe = await toAnswers();
  const abgabeIndex = (abgabe || []).findIndex((a) => a.includes('Hier, bitte'));
  await z((i) => window.zomfy.answer(i), abgabeIndex);
  await step(200);
  const schal = { auftrag: (await z(() => window.zomfy.survivors())).hilde.errand, leben: await z(() => window.zomfy.maxHp()), ziel: (await view()).ziel || '' };
  if (bitte === 'hilde' && hildeZiel.startsWith('Hilde:') && abgabeIndex >= 0 && schal.auftrag === 2 && schal.leben === lebenVorher + 15 && !schal.ziel.startsWith('Hilde:')) note(`✓ Auftrag: Hilde bittet beim Einzug um 8 Fasern (Ziel-Feld), Abgeben im Gespräch – Schal, ${schal.leben} Lebenspunkte`);
  else fail(`Auftrag Hilde: Sprecher ${bitte}, Ziel „${hildeZiel}“, Antworten ${JSON.stringify(abgabe)}, danach ${JSON.stringify(schal)} (vorher ${lebenVorher})`);

  // Bert: eine Laterne neben seinem Zelt
  await z(() => {
    window.zomfy.setSurvivor('bert', 2);
    window.zomfy.give({ holz: 20, stoff: 6, schrott: 10 });
  });
  let bertZelt = 'kein Platz';
  for (const [i, j] of [[0, 6], [2, 6], [-1, 9], [3, 8]]) {
    bertZelt = await z(([a, b]) => window.zomfy.build('zelt', a, b), [i, j]);
    if (bertZelt === 'ok') break;
  }
  await z(() => window.zomfy.moveIn('bert'));
  await step(200);
  await z(() => window.zomfy.finishDialog());
  const bertVorher = await z(() => ({ e: window.zomfy.survivors().bert.errand, zr: window.zomfy.state().inventory.zahnraeder || 0 }));
  const tent = await z(() => {
    const id = window.zomfy.survivors().bert.tent;
    return window.zomfy.buildings().find((b) => b.id === id) || null;
  });
  let laterne = 'kein Zelt';
  if (tent) {
    for (const [di, dj] of [[2, 0], [-1, 0], [0, 2], [0, -1], [2, 1], [-1, 1]]) {
      laterne = await z(([a, b]) => window.zomfy.build('laternenpfahl', a, b), [tent.i + di, tent.j + dj]);
      if (laterne === 'ok') break;
    }
  }
  await step(1500);
  const bertNachher = await z(() => ({ e: window.zomfy.survivors().bert.errand, zr: window.zomfy.state().inventory.zahnraeder || 0 }));
  if (bertZelt === 'ok' && bertVorher.e === 1 && laterne === 'ok' && bertNachher.e === 2 && bertNachher.zr === bertVorher.zr + 2) note('✓ Auftrag: Bert will Licht am Zelt – Laterne daneben, 2 Zahnräder');
  else fail(`Auftrag Bert: Zelt ${bertZelt}, Laterne ${laterne}, vorher ${JSON.stringify(bertVorher)}, nachher ${JSON.stringify(bertNachher)}`);

  // Einrichten: Reiter mit Tab, Möbel kaufen, Gemütlichkeit
  let titel = null;
  for (let k = 0; k < 4; k++) {
    titel = (await view()).bauleiste?.titel;
    if (titel === 'Einrichten') break;
    await press('Tab', 60);
  }
  const optionen = ((await view()).bauleiste?.optionen || []).map((o) => o.name);
  // Seit N4 kosten Möbel Zombieteile (Balduins Katalog) – hier direkt gekauft, genau passend
  await z(() => window.zomfy.give({ teile: 54 }));
  for (const id of ['bild', 'teekanne', 'wimpel', 'lichterkette', 'stehlampe', 'koerbchen']) await z((i) => window.zomfy.buyFurniture(i), id);
  const cozy = await z(() => window.zomfy.cozy());
  if (titel === 'Einrichten' && optionen.includes('Schlafzelt') && cozy === 8) note(`✓ Einrichten: Reiter mit ${optionen.join(', ')} – Gemütlichkeit ${cozy}`);
  else fail(`Einrichten: Titel ${titel}, Optionen ${JSON.stringify(optionen)}, Gemütlichkeit ${cozy}`);

  // Morgen: Gaben der Eingezogenen und Bonus für Gemütlichkeit
  const xpVorher = (await z(() => window.zomfy.state())).player.xp;
  const morgen = await z(() => window.zomfy.morning());
  const nachMorgen = await z(() => window.zomfy.state());
  const gaben = morgen.some((t) => t.startsWith('Knopf')) && morgen.some((t) => t.startsWith('Oma Hilde')) && morgen.some((t) => t.includes('Ausgeschlafen'));
  if (gaben && nachMorgen.player.xp >= xpVorher + 8 && nachMorgen.player.rested === nachMorgen.time.day) note('✓ Morgen: Knopf und Hilde bringen etwas, Gemütlichkeit gibt Erfahrung und »ausgeschlafen«');
  else fail(`Morgen: ${JSON.stringify(morgen)}, Erfahrung ${xpVorher} -> ${nachMorgen.player.xp}`);

  // Funkturm: Juna, erste Stufe mit Abblende, dann das Leuchtfeuer bremst
  await z(() => {
    window.zomfy.setSurvivor('juna', 2);
    window.zomfy.give({ schrott: 30, holz: 20 });
    window.zomfy.buildTowerStage();
  });
  for (let k = 0; k < 40 && (await z(() => window.zomfy.mode)) === 'sleep'; k++) await step(250);
  await step(300);
  const turm = (await z(() => window.zomfy.state())).world.tower;
  const turmDialog = (await view()).dialog?.sprecher;
  await z(() => {
    window.zomfy.finishDialog();
    window.zomfy.setTowerStage(3);
  });
  const bremse = await z(() => window.zomfy.beaconSlow(9.5, -5));
  if (turm === 1 && turmDialog === 'juna' && bremse > 0) note(`✓ Funkturm: Stufe 1 gebaut (Juna freut sich), Leuchtfeuer bremst Schlurfer um ${Math.round(bremse * 100)} %`);
  else fail(`Funkturm: Stufe ${turm}, Dialog ${turmDialog}, Bremse ${bremse}`);

  // Bilder (das Spiel läuft hier nur in festen Schritten – shot() würde auf Bilder warten)
  const snap = async (name, setup) => {
    await z(setup);
    await step(900);
    await page.screenshot({ path: join(SHOTS, `${name}.png`), timeout: 180000 }); // unter Last braucht der Software-Renderer lange
    note(`  Screenshot: screenshots/${name}.png`);
  };
  await snap('ueberlebende', () => {
    window.zomfy.setSurvivor('bert', 2);
    window.zomfy.setSurvivor('yusuf', 2);
    window.zomfy.setTime(11, 0);
    window.zomfy.teleport(1.0, 2.5, 0);
  });
  await snap('einrichten', () => {
    window.zomfy.setTime(21, 30);
    const e = window.zomfy.interior().entry; // die Möbel stehen im Wohnraum (M11)
    window.zomfy.teleport(e.x - 0.6, e.z - 2.4, 0);
  });

  // Knopf bellt vor der Welle
  await z(() => {
    window.zomfy.setHorde(true);
    window.zomfy.setTime(20, 10);
    window.zomfy.teleport(0.5, 2.5, 0);
  });
  let bellt = false;
  let bellText = '';
  for (let k = 0; k < 30 && !bellt; k++) {
    await step(500);
    bellText = ((await view()).meldungen || []).find((m) => m.startsWith('Knopf bellt')) || '';
    bellt = Boolean(bellText);
  }
  // M9 (OFFENE-FRAGEN Nr. 74): Knopf warnt ohne feste Richtung, Juna meldet die Arten der Nacht
  // Den Funkspruch gibt es, sobald Juna eingezogen ist (hier ist sie Gast: kurz Stufe 3)
  const funk =
    (
      await z(() => {
        window.zomfy.setSurvivor('juna', 3);
        const lines = window.zomfy.morning();
        window.zomfy.setSurvivor('juna', 2);
        return lines;
      })
    ).find((t) => t.startsWith('Juna hat am Funk')) || '';
  if (bellt && !/weg/.test(bellText) && /Wellen – /.test(funk)) note(`✓ Knopf bellt kurz vor der ersten Welle („${bellText}“), Juna meldet: „${funk}“`);
  else fail(`Knopf/Juna: Bellen ${bellt} „${bellText}“, Funk „${funk}“`);
  await z(() => window.zomfy.setHorde(false));

  // Speichern und Laden
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  const geladen = await z(() => window.zomfy.state());
  if (geladen.version === 30 && geladen.survivors.hilde.stage === 3 && geladen.world.furniture.length === 6 && geladen.world.tower === 3) note('✓ Speichern v30: Überlebende, Möbel und Leuchtmast bleiben nach dem Neuladen');
  else fail(`Speichern v30: ${JSON.stringify({ v: geladen.version, s: geladen.survivors, f: geladen.world.furniture, t: geladen.world.tower })}`);
  checkMessages(session);
  await session.context.close();

  // Migration v4 -> v5: Überlebende kommen erst ab dem nächsten Tag
  const saveUrl = `${url}index.html?test`;
  const v4 = await openGame(browser, saveUrl, 'Alter Spielstand (v4)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v4')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({ version: 4, time: { day: 7, minute: 60 }, player: { x: 0.5, z: 2, hp: 80, xp: 3, level: 2 }, inventory: { holz: 5, schrott: 12 }, world: { houseLevel: 2, homeHp: 400, buildings: [] }, weapons: { pfanne: 1 }, perks: {} })
        );
        sessionStorage.setItem('zomfy-v4', '1');
      }
    },
  });
  const m = await v4.page.evaluate(() => ({ state: window.zomfy.state(), tabs: window.zomfyView().bauleiste }));
  if (m.state.version === 30 && m.state.world.survivorsStart === 6 && Object.values(m.state.survivors).every((s) => s.stage === 0) && m.state.weapons.pfanne === 1 && m.state.player.name === 'Mika' && m.state.player.look.hat === 'orange') {
    note('✓ Migration: Spielstand v4 wird zu v30 (Überlebende kommen ab dem nächsten Tag, Waffen bleiben)');
  } else fail(`Migration v4: ${JSON.stringify(m.state)}`);
  checkMessages(v4);
  await v4.context.close();
}

/**
 * Meilenstein 8 (seit M9 an der Bucht): Das Bootswrack gibt nur einmal etwas
 * her, Schrotthaufen alle zwei Tage. Balduin kommt ab Tag 2 morgens mit dem Boot
 * an den Steg, handelt bis Mittag Zombieteile gegen Rohstoffe (echte Tasten im
 * Handelsfenster), Vorrat je Tag, Speichern v30 und Migration v6 → v8.
 */
async function runTraderChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Händler', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m8')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m8', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  const state = () => z(() => window.zomfy.state());
  const press = async (key, ms = 60) => {
    await page.keyboard.press(key);
    await step(ms);
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(9, 0);
  });
  await step(100);

  // Bootswrack: einmal Schrott, danach für immer ausgeräumt
  await z(() => window.zomfy.teleport(10.25, 7.9, 0));
  let st = await state();
  await z(() => window.zomfy.interact('wrack'));
  await step(2500);
  // M19: Im Wrack lagen alte Baupläne – die Wahl (sie hält das Spiel an) prüft `spielzeug`
  await z(() => {
    const bc = window.zomfy.game.state.blueprintChoice;
    if (bc) window.zomfy.chooseBlueprint(bc.options[0]);
  });
  await step(100);
  const nachAuto = await state();
  const ausAuto = nachAuto.inventory.schrott - st.inventory.schrott;
  await z(() => window.zomfy.setDay(5));
  await step(100);
  const hinweisAuto = (await view()).hinweis;
  await z(() => window.zomfy.interact('wrack'));
  await step(2500);
  const nochmal = (await state()).inventory.schrott - nachAuto.inventory.schrott;
  if (ausAuto >= 5 && nochmal === 0 && nachAuto.flags.wrackLeer && /Ausgeräumt/.test(hinweisAuto || '')) note(`✓ Bootswrack: einmal +${ausAuto} Schrott, Tage später „${hinweisAuto}“`);
  else fail(`Bootswrack: ${JSON.stringify({ ausAuto, nochmal, leer: nachAuto.flags.wrackLeer, hinweisAuto })}`);

  // Schrotthaufen: leer bis übermorgen, dann wieder voll
  await z(() => window.zomfy.teleport(5.75, 9.75, -Math.PI / 2));
  st = await state();
  await z(() => window.zomfy.interact('schrott-1'));
  await step(2500);
  const h1 = (await state()).inventory.schrott - st.inventory.schrott;
  await z(() => window.zomfy.setDay(6));
  await step(100);
  const morgen = (await view()).hinweis;
  await z(() => window.zomfy.setDay(7));
  await step(100);
  const uebermorgen = (await view()).hinweis;
  if (h1 >= 2 && /Leer/.test(morgen || '') && uebermorgen === 'Durchsuchen') note(`✓ Schrotthaufen: +${h1} Schrott, am nächsten Tag „${morgen}“, am übernächsten wieder voll`);
  else fail(`Schrotthaufen: ${JSON.stringify({ h1, morgen, uebermorgen })}`);

  // Tag 1: kein Balduin. Tag 2: um 06:40 taucht sein Boot im Osten auf und legt am Steg an
  await z(() => {
    window.zomfy.setDay(1);
    window.zomfy.setTime(10, 0);
  });
  await step(100);
  const tag1 = await z(() => window.zomfy.trader());
  await z(() => {
    window.zomfy.setDay(2);
    window.zomfy.setTime(6, 38);
    window.zomfy.teleport(12.5, -1.0, 0);
  });
  await step(100);
  const frueh = await z(() => window.zomfy.trader());
  await step(3000); // rund 06:46
  const kommt = await z(() => window.zomfy.trader());
  await step(9000); // rund 07:08
  const steht = await z(() => window.zomfy.trader());
  if (tag1.phase === 'weg' && frueh.phase === 'weg' && kommt.phase === 'kommt' && kommt.boat > steht.boat + 3 && steht.phase === 'steht' && steht.prompt && steht.x < steht.boat && kommt.fanfares === frueh.fanfares + 1 && steht.fanfares === kommt.fanfares) {
    note(`✓ Balduin: nicht an Tag 1, an Tag 2 ab 06:40 mit dem Boot unterwegs (x ${kommt.boat.toFixed(1)}) – mit Fanfare –, dann am Steg (Boot bei ${steht.boat.toFixed(1)}, er auf dem Steg)`);
  } else fail(`Balduin kommt: ${JSON.stringify({ tag1: tag1.phase, frueh: frueh.phase, kommt, steht })}`);

  // Ziel nach der ersten Nacht: bei Balduin tauschen
  await z(() => {
    for (const f of ['ziel_axt', 'ziel_turm', 'ziel_nacht']) window.zomfy.setFlag(f);
  });
  await step(100);
  const ziel = (await view()).ziel || '';

  // Hingehen, E: erstes Treffen (Dialog), »Zeig mal her!« öffnet Balduins Boot
  await z(() => window.zomfy.give({ teile: 20 }));
  await z((p) => window.zomfy.teleport(p.x - 1.0, p.z, Math.PI / 2), steht);
  await step(200);
  const hinweis = (await view()).hinweis;
  const gruss = (await z(() => window.zomfy.trader())).gestures; // M10: Mütze lüften, wenn Mika herankommt
  await press('KeyE', 300);
  let antworten = null;
  for (let k = 0; k < 12 && !antworten; k++) {
    const d = (await view()).dialog;
    if (!d) break;
    if (d.fertigGetippt && d.antworten.length) antworten = d.antworten;
    else await press('KeyE', 350);
  }
  await press('KeyW', 100);
  await press('KeyE', 300);
  const fenster = await view();
  const offen = await z(() => window.zomfy.mode);
  if (hinweis === 'Ansprechen' && antworten?.includes('> Später.') && offen === 'craft' && fenster.handelsfenster?.titel === 'Balduins Boot' && /Tausche Zombieteile/.test(ziel)) {
    note(`✓ Balduin: Ziel „${ziel}“, E spricht ihn an, harmlose Antwort vorgewählt, »Zeig mal her!« öffnet den Handel am Boot`);
  } else fail(`Balduin ansprechen: ${JSON.stringify({ hinweis, antworten, offen, fenster: fenster.handelsfenster, ziel })}`);

  // E tauscht einmal, gehaltenes E tauscht weiter
  await step(700); // gleich nach dem Öffnen nimmt E noch nichts (OPEN_LOCK)
  st = await state();
  await press('KeyE', 100);
  const einmal = await state();
  await page.keyboard.down('KeyE');
  await step(2600);
  await page.keyboard.up('KeyE');
  await step(100);
  const gehalten = await state();
  const zeilen = (await view()).werkbank || [];
  await page.screenshot({ path: join(SHOTS, 'handel.png'), timeout: 180000 });
  note('  Screenshot: screenshots/handel.png');
  if (st.inventory.teile - einmal.inventory.teile === 3 && einmal.inventory.schrott - st.inventory.schrott === 2 && gehalten.inventory.teile < einmal.inventory.teile && gehalten.flags.gehandelt && zeilen[0]?.startsWith('> 2 Schrott')) {
    note(`✓ Handel: E tauscht 3 Zombieteile gegen 2 Schrott, gehalten weiter (Teile ${st.inventory.teile} → ${gehalten.inventory.teile})`);
  } else fail(`Handel: ${JSON.stringify({ vorher: st.inventory, einmal: einmal.inventory, gehalten: gehalten.inventory, zeilen })}`);
  // »Tschüss, Balduin!« (letzte Zeile – W springt von oben dorthin) schließt das Fenster;
  // wer gehandelt hat, dem sagt er Tschüss, und er legt gleich ab (M9.1)
  await press('KeyW', 100);
  const tschuess = ((await view()).werkbank || []).find((l) => l.startsWith('> ')) || '';
  await press('KeyE', 200);
  const zu = await z(() => window.zomfy.mode);
  const zielDanach = (await view()).ziel || '';
  const blase = (await view()).gedanke || '';
  const ankunft = await z(() => window.zomfy.trader());
  await step(3000);
  const legtAb = await z(() => window.zomfy.trader());
  await step(10000);
  const fort = await z(() => window.zomfy.trader());
  if (zu === 'play' && tschuess.includes('Tschüss, Balduin!') && !/Tausche Zombieteile/.test(zielDanach) && blase.startsWith('„') && ankunft.leaving && legtAb.phase === 'geht' && !legtAb.prompt && fort.phase === 'weg') {
    note(`✓ Handel: »Tschüss, Balduin!« schließt das Fenster, das Ziel ist erreicht – er sagt ${blase}, legt ab und ist fort`);
  } else fail(`Handel schließen: ${JSON.stringify({ zu, tschuess, zielDanach, blase, ankunft, legtAb: legtAb.phase, fort: fort.phase })}`);
  // Meilenstein 10: Einfahrt zwischen den Inseln, Leine über den Poller, Gesten
  if (kommt.boatZ < -3 && steht.rope > 0 && gruss.includes('muetze') && ankunft.gestures.join() === 'daumen,winken' && fort.rope === 0) {
    note(`✓ Balduin (M10): Einfahrt von Nordosten zwischen den Inseln (z ${kommt.boatZ.toFixed(1)}), die Leine liegt über dem Poller, er lüftet die Mütze, nach dem Handel Daumen hoch und Winken, abgelegt ist die Leine wieder an Bord`);
  } else fail(`Balduin M10: ${JSON.stringify({ boatZ: kommt.boatZ, rope: steht.rope, gruss, abschied: ankunft.gestures, ropeFort: fort.rope })}`);

  // Nächster Morgen: andere Sonderangebote, Zahnräder nur zweimal am Tag
  await z(() => {
    window.zomfy.setDay(3);
    window.zomfy.setTime(9, 0);
    window.zomfy.give({ teile: 30 });
  });
  await step(100);
  const angebote = (await z(() => window.zomfy.trader())).offers;
  const zahn = await z(() => [window.zomfy.trade('zahnrad'), window.zomfy.trade('zahnrad'), window.zomfy.trade('zahnrad')]);
  if (angebote.join() === 'schrott,stein,zahnrad,bauplan,wundertuete' && zahn.join() === 'true,true,false') note(`✓ Balduin: Tag 3 bietet ${angebote.join(', ')} – Zahnräder nur zweimal am Tag`);
  else fail(`Angebote/Vorrat: ${JSON.stringify({ angebote, zahn })}`);
  const bericht = await z(() => window.zomfy.morning());
  if (bericht.some((l) => l.startsWith('Balduin liegt bis 12 Uhr am Steg'))) note('✓ Morgenbericht: Balduin liegt bis 12 Uhr am Steg');
  else fail(`Morgenbericht ohne Balduin: ${JSON.stringify(bericht)}`);

  // Bild vom Boot am Steg am Vormittag
  await z(() => window.zomfy.teleport(14.5, -1.0, 1.2));
  await step(1500);
  await page.screenshot({ path: join(SHOTS, 'haendler.png'), timeout: 180000 });
  note('  Screenshot: screenshots/haendler.png');

  // Um 12 Uhr legt er ab und fährt nach Osten davon
  await z(() => window.zomfy.setTime(11, 58));
  await step(1500);
  const geht = await z(() => window.zomfy.trader());
  await step(10000);
  const weg = await z(() => window.zomfy.trader());
  if (geht.phase === 'geht' && weg.phase === 'weg' && !weg.visible) note('✓ Balduin: um 12 Uhr legt er ab, nachmittags ist er fort');
  else fail(`Balduin geht: ${JSON.stringify({ geht: geht.phase, weg })}`);

  // Speichern v30: Vorrat des Tages und Flags bleiben
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  const geladen = await state();
  if (geladen.version === 30 && geladen.world.trader.day === 3 && geladen.world.trader.sold.zahnrad === 2 && geladen.flags.wrackLeer && geladen.flags.balduinGetroffen) note('✓ Speichern v30: Balduins Vorrat, Bootswrack und Bekanntschaft bleiben nach dem Neuladen');
  else fail(`Speichern v30: ${JSON.stringify({ v: geladen.version, trader: geladen.world.trader, flags: geladen.flags })}`);

  // Meilenstein 10: besondere Turmteile. An Tag 4 bietet Balduin eine Glücksmünze an;
  // eingebaut über die Turm-Auswahl (Taste der Kachel). Abschüsse dieses Turms lassen
  // sicher Zombieteile fallen, und nach dem Neuladen steckt die Münze noch am Turm.
  const kauf = await z(() => {
    window.zomfy.setHorde(false);
    window.zomfy.setHorde(true);
    window.zomfy.setFlag('ersterTurm'); // sonst hält Mikas Satz zum ersten Turm das Spiel an
    window.zomfy.setDay(4);
    window.zomfy.setTime(9, 0);
    window.zomfy.give({ teile: 20, schrott: 30 });
    return { angebote: window.zomfy.trader().offers, gekauft: window.zomfy.trade('gluecksmuenze'), vorrat: window.zomfy.state().towerParts.gluecksmuenze };
  });
  const turmTeil = await z(() => {
    const col = window.zomfy.pathColumn(-12);
    const j = col[0] - 1;
    const res = window.zomfy.build('bolzen', -12, j);
    const b = window.zomfy.buildings().find((q) => q.i === -12 && q.j === j);
    window.zomfy.teleport(-12.5, j - 5, 0); // Mika weit genug weg: kein Schlurfer jagt sie, nichts fliegt ihr zu
    window.zomfy.selectBuilding(b?.id);
    return { res, id: b?.id };
  });
  await step(150);
  const kachel = await z(() => window.zomfy.buildbarLayout().tiles.findIndex((t) => t.id === 'teil-gluecksmuenze'));
  if (kachel >= 0) await press(['KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyC', 'KeyV'][kachel], 150);
  const eingebaut = await z((id) => ({ teil: window.zomfy.buildings().find((b) => b.id === id)?.parts?.[0], vorrat: window.zomfy.state().towerParts.gluecksmuenze }), turmTeil.id);
  // Drei Schlurfer laufen am Münzturm vorbei; jeder, den er erwischt, lässt Teile fallen
  // (gezählt werden nur diese drei – ein Tagesschlurfer kann nebenher unterwegs sein)
  const trio = await z(() => {
    window.zomfy.game.builder.selection = null;
    window.zomfy.game.loot.clear();
    const ids = [];
    for (let k = 0; k < 3; k++) {
      const x = -17 - k * 1.6;
      const col = window.zomfy.pathColumn(Math.floor(x));
      ids.push(window.zomfy.spawnZombie('schlurfer', x, col[Math.floor(col.length / 2)] + 0.5));
    }
    return ids;
  });
  const trioAlive = () => z((ids) => window.zomfy.zombies().filter((q) => ids.includes(q.id) && q.state !== 'dying').length, trio);
  for (let k = 0; k < 50; k++) {
    await step(500);
    if ((await trioAlive()) === 0) break;
  }
  const muenze = await z(() => ({ kills: window.zomfy.state().stats.kills, teile: window.zomfy.lootItems().filter((l) => l.res === 'teile').length }));
  muenze.lebend = await trioAlive();
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  const nachLaden = await z((id) => ({ v: window.zomfy.state().version, teil: window.zomfy.buildings().find((b) => b.id === id)?.parts?.[0] }), turmTeil.id);
  // Die Glücksmünze passt nicht in den Laternenturm (er schießt nicht), das Fernrohr schon
  const laterne = await z(() => {
    const g = window.zomfy.game;
    g.state.towerParts.gluecksmuenze = 1;
    g.state.towerParts.fernrohr = 1;
    window.zomfy.give({ schrott: 40, holz: 20, stein: 20, zahnraeder: 4 });
    // (bei x = -8 steht seit M17 der Wall – der Laternenturm kommt weiter westlich an den Weg)
    const col = window.zomfy.pathColumn(-14);
    const j = col[0] - 1;
    const res = window.zomfy.build('laternenturm', -14, j);
    const b = window.zomfy.buildings().find((q) => q.i === -14 && q.j === j);
    window.zomfy.selectBuilding(b?.id);
    return { res, id: b?.id };
  });
  await step(100);
  const laterneKacheln = await z(() => window.zomfy.buildbarLayout().tiles.map((t) => t.id));
  if (kauf.angebote.includes('gluecksmuenze') && kauf.gekauft && kauf.vorrat === 1 && turmTeil.res === 'ok' && eingebaut.teil === 'gluecksmuenze' && eingebaut.vorrat === 0 && muenze.lebend === 0 && muenze.teile >= 3 && nachLaden.v === 30 && nachLaden.teil === 'gluecksmuenze' && laterne.res === 'ok' && laterneKacheln.includes('teil-fernrohr') && !laterneKacheln.includes('teil-gluecksmuenze')) {
    note(`✓ Turmteile: Balduin bietet an Tag 4 eine Glücksmünze an, eine Taste baut sie in den Bolzenwerfer ein – ${muenze.teile} Zombieteile von drei Schlurfern, nach dem Neuladen steckt sie noch (v30); der Laternenturm nimmt ein Fernrohr, aber keine Münze`);
  } else fail(`Turmteile: ${JSON.stringify({ kauf, turmTeil: { res: turmTeil.res, id: turmTeil.id }, kachel, eingebaut, muenze, nachLaden, laterne, laterneKacheln })}`);
  checkMessages(session);
  await session.context.close();

  // Migration v6 -> v8: Wer das Autowrack schon durchsucht hat, findet im Bootswrack nichts mehr
  const v6 = await openGame(browser, `${url}index.html?test`, 'Alter Spielstand (v6)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v6')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({ version: 6, time: { day: 4, minute: 120 }, player: { x: 0.5, z: 2, hp: 90, name: 'Kira' }, inventory: { holz: 5, schrott: 12 }, world: { houseLevel: 1, homeHp: 300, buildings: [], searched: { auto: 2, 'schrott-1': 3 } }, flags: { introGesehen: true } })
        );
        sessionStorage.setItem('zomfy-v6', '1');
      }
    },
  });
  const m = await v6.page.evaluate(() => window.zomfy.state());
  if (m.version === 30 && m.flags.wrackLeer && m.inventory.teile === 0 && m.inventory.schrott === 12 && m.world.trader.day === 0 && m.player.name === 'Kira') note('✓ Migration: Spielstand v6 wird zu v30 (Wrack schon ausgeräumt, Zombieteile bei null)');
  else fail(`Migration v6: ${JSON.stringify({ v: m.version, flags: m.flags, inv: m.inventory, trader: m.world.trader })}`);
  checkMessages(v6);
  await v6.context.close();
}

async function runCombatChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Nahkampf und Perks', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m4')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m4', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const state = () => z(() => window.zomfy.state());
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const click = async (x, y, zz) => {
    const t = await z(([a, b, c]) => window.zomfy.screenOf(a, b, c), [x, y, zz]);
    await page.mouse.move(t.x, t.y);
    await step(34);
    await page.mouse.down();
    await step(34);
    await page.mouse.up();
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(10, 0);
    window.zomfy.give({ holz: 30, stein: 20, schrott: 60, fasern: 20, stoff: 10, zahnraeder: 2 });
    window.zomfy.teleport(0.5, 2.5, 0);
  });
  await step(100);

  // Waffe an der Werkbank bauen: landet in der Schnellleiste und in der Hand
  const gebaut = await z(() => window.zomfy.craft('schaufel'));
  const hand = await z(() => window.zomfy.combatInfo().weapon);
  if (gebaut && hand === 'schaufel') note('✓ Waffen: Schaufel gebaut, liegt in der Schnellleiste und in der Hand');
  else fail(`Waffen: Schaufel ${gebaut ? 'gebaut' : 'nicht gebaut'}, in der Hand: ${hand}`);

  // Klick in Richtung eines Schlurfers: Schaufel trifft mit 16
  await z(() => window.zomfy.spawnZombie('schlurfer', 0.5, 3.7));
  await click(0.5, 0, 3.7);
  await step(400);
  const getroffen = (await z(() => window.zomfy.zombies()))[0];
  if (getroffen && Math.round(getroffen.hp) === 14) note('✓ Nahkampf: Klick schlägt in Richtung Maus, Schaufel trifft mit 16');
  else fail(`Nahkampf: Schlurfer nach dem Schlag ${JSON.stringify(getroffen)}`);
  await z(() => window.zomfy.killAllZombies());
  await step(900);

  // Bratpfanne betäubt
  await z(() => window.zomfy.craft('pfanne'));
  await z(() => window.zomfy.spawnZombie('brummer', 0.5, 3.8));
  await click(0.5, 0, 3.8);
  await step(450);
  const betaeubt = (await z(() => window.zomfy.zombies()))[0];
  await page.screenshot({ path: join(SHOTS, 'nahkampf.png') });
  note('  Screenshot: screenshots/nahkampf.png');
  if (betaeubt && betaeubt.stun > 0 && betaeubt.hp < 150) note(`✓ Nahkampf: Bratpfanne trifft (${150 - Math.round(betaeubt.hp)} durch die Panzerung) und betäubt`);
  else fail(`Nahkampf: Brummer nach der Pfanne ${JSON.stringify(betaeubt)}`);
  await z(() => window.zomfy.killAllZombies());
  await step(900);

  // Ausweichrolle: Leertaste, kurz unverwundbar, ein gutes Stück weiter
  const vorRolle = await state();
  await page.keyboard.down('KeyD');
  await step(34);
  await page.keyboard.press('Space');
  await step(34);
  const rolle = await z(() => window.zomfy.combatInfo());
  await step(300);
  await page.keyboard.up('KeyD');
  await step(50);
  const nachRolle = await state();
  const weg = nachRolle.player.x - vorRolle.player.x;
  if (rolle.action === 'roll' && rolle.invulnerable > 0 && weg > 1.2) note(`✓ Ausweichen: Leertaste rollt ${weg.toFixed(1)} m, dabei unverwundbar`);
  else fail(`Ausweichen: ${JSON.stringify(rolle)}, Weg ${weg.toFixed(2)} m`);

  // Erfahrung: Nahkampf-Abschuss zählt doppelt; Stufenaufstieg öffnet die Perk-Wahl
  const xpVorher = (await state()).player.xp;
  await z((pl) => window.zomfy.spawnZombie('schwaermer', pl.x, pl.z + 1.1), nachRolle.player);
  await click(nachRolle.player.x, 0, nachRolle.player.z + 1.1);
  await step(700);
  const xpNachher = (await state()).player.xp;
  if (xpNachher - xpVorher >= 1) note(`✓ Erfahrung: Abschuss im Nahkampf gibt ${xpNachher - xpVorher} Erfahrung`);
  else fail(`Erfahrung: ${xpVorher} -> ${xpNachher}`);
  // Neue Stufe mitten im Getümmel: Die Wahl wartet, bis es ruhig ist (m4-r1)
  await z((pl) => window.zomfy.spawnZombie('brummer', pl.x + 2.2, pl.z + 0.5), nachRolle.player);
  await z(() => window.zomfy.giveXp(30));
  await step(1200);
  const imKampf = await z(() => ({ mode: window.zomfy.mode, wartet: window.zomfyView().perkWartet }));
  await z(() => window.zomfy.killAllZombies());
  await step(1500);
  const wahl = await z(() => ({ mode: window.zomfy.mode, view: window.zomfyView().perkWahl }));
  if (imKampf.mode === 'play' && imKampf.wartet && wahl.mode === 'perk') note('✓ Perks: im Getümmel wartet die Wahl (Hinweis), danach öffnet sie');
  else fail(`Perks im Getümmel: ${JSON.stringify(imKampf)}, danach ${wahl.mode}`);
  await page.screenshot({ path: join(SHOTS, 'perks.png') });
  note('  Screenshot: screenshots/perks.png');
  await page.keyboard.press('Digit1');
  await step(100);
  const nachWahl = await state();
  if (wahl.mode === 'perk' && wahl.view?.length === 3 && Object.keys(nachWahl.perks).length === 1) note(`✓ Perks: Stufe ${nachWahl.player.level}, drei Karten, Taste 1 wählt (${Object.keys(nachWahl.perks)[0]})`);
  else fail(`Perks: Wahl ${JSON.stringify(wahl)}, danach ${JSON.stringify(nachWahl.perks)}`);
  // Weitere offene Wahl (mehrere Stufen auf einmal) gleich mit erledigen
  for (let k = 0; k < 4; k++) {
    await step(1200); // die nächste Wahl kommt nach einem ruhigen Augenblick
    if ((await z(() => window.zomfy.mode)) !== 'perk') break;
    await page.keyboard.press('Digit2');
    await step(100);
  }

  // Waffen-Aufwertung über den Reiter »Figur« (C = Waffe in der Hand)
  await page.keyboard.press('Tab');
  await step(100);
  await page.keyboard.press('KeyC');
  await step(100);
  await page.keyboard.press('KeyC'); // Kaufen per Taste braucht einen zweiten Druck
  await step(100);
  const aufgewertet = (await state()).weapons.pfanne;
  if (aufgewertet === 2) note('✓ Waffen: Bratpfanne über die Bauleiste (Figur, C) auf Stufe 2');
  else fail(`Waffen: Bratpfanne auf Stufe ${aufgewertet}`);

  // Ein Schlurfer jagt Mika, eine Werkbank steht dazwischen: Er bleibt nicht ewig
  // davor stehen, sondern gibt die Jagd auf und kommt außen herum (m7-r1)
  const bank = await z(() => {
    window.zomfy.give({ holz: 10, stein: 4 });
    return window.zomfy.build('werkbank', 6, 2);
  });
  await z(() => window.zomfy.finishDialog());
  const jaeger = await z(() => {
    window.zomfy.killAllZombies();
    window.zomfy.teleport(7.0, 3.7, Math.PI);
    return window.zomfy.spawnZombie('schlurfer', 7.0, 1.3);
  });
  let jagdNah = 99;
  for (let k = 0; k < 8; k++) {
    await step(2000);
    const d = await z((id) => {
      const zo = window.zomfy.zombies().find((q) => q.id === id);
      const p = window.zomfyView().figur;
      return zo ? Math.hypot(zo.x - p.x, zo.z - p.z) : 99;
    }, jaeger);
    jagdNah = Math.min(jagdNah, d);
  }
  await z(() => window.zomfy.killAllZombies());
  await step(100);
  if (bank === 'ok' && jagdNah < 1.2) note(`✓ Horde: Ein Schlurfer hinter der Werkbank kommt außen herum zu Mika (${jagdNah.toFixed(2)} m)`);
  else fail(`Horde: Schlurfer hängt hinter der Werkbank fest (Bau ${bank}, nächster Abstand ${jagdNah.toFixed(2)} m)`);

  // Speichern und Laden: Waffen, Stufe und Perks bleiben
  await z(() => window.zomfy.sleepNow());
  await page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 240000 }).catch(() => {});
  for (let k = 0; k < 30 && (await z(() => window.zomfy.mode)) === 'sleep'; k++) await step(1000);
  const gespeichert = await state();
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await state();
  if (geladen.version === 30 && geladen.weapons.pfanne === 2 && geladen.player.level === gespeichert.player.level && Object.keys(geladen.perks).length >= 1) {
    note(`✓ Speichern v30: Waffen, Stufe ${geladen.player.level} und Perks bleiben nach dem Neuladen`);
  } else fail(`Speichern v4: vorher ${JSON.stringify({ w: gespeichert.weapons, l: gespeichert.player.level, p: gespeichert.perks })}, nachher ${JSON.stringify({ v: geladen.version, w: geladen.weapons, l: geladen.player.level, p: geladen.perks })}`);
  checkMessages(session);
  await session.context.close();
}

/**
 * Meilenstein 12: Wetter je Tag (die ersten beiden Tage klar, alle vier Arten
 * kommen vor, fest aus Startwert und Tag), Nieselregen im Bild (drinnen nicht),
 * Nebel am Morgen, das Wetter in Uhr und Morgenbericht; Herbstschmuck (Schilf,
 * Kürbislaternen leuchten nachts, Laub stiebt auf, wenn man hindurchläuft);
 * Krähen fliegen vor Mika und vor Schlurfern auf, kommen wieder und ziehen
 * abends in den Wald; Mikas Gesicht (Aua, froh, müde) und das Lächeln der
 * Überlebenden (Bilder: wetter-regen, wetter-nebel, herbst, laternen).
 */
async function runAutumnChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Herbst');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  const picture = async (name) => {
    await page.screenshot({ path: join(SHOTS, `${name}.png`), timeout: 180000 });
    note(`  Screenshot: screenshots/${name}.png`);
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(10, 0);
  });
  await step(100);

  // Wetter je Tag: fest aus Startwert und Tag, die ersten beiden Tage klar, alle Arten kommen vor
  const plan = await z(() => {
    const w = window.zomfy.game.world.weather;
    const a = [];
    const b = [];
    for (let d = 1; d <= 40; d++) a.push(w.forecast(d));
    for (let d = 1; d <= 40; d++) b.push(w.forecast(d));
    return { a, same: a.join() === b.join() };
  });
  const zaehl = {};
  for (const k of plan.a) zaehl[k] = (zaehl[k] || 0) + 1;
  if (plan.a[0] === 'klar' && plan.a[1] === 'klar' && ['klar', 'wind', 'regen', 'nebel'].every((k) => zaehl[k] > 0) && plan.same) {
    note(`✓ Wetter: Tag 1 und 2 klar, in 40 Tagen ${Object.entries(zaehl).map(([k, n]) => `${n}× ${k}`).join(', ')} – fest je Tag`);
  } else fail(`Wetter: ${JSON.stringify({ tage: plan.a.slice(0, 8), zaehl, gleich: plan.same })}`);

  // Nieselregen: Striche im Bild und das Wetter in der Uhr; drinnen regnet es nicht
  await z(() => {
    window.zomfy.setWeather('regen');
    window.zomfy.setTime(14, 0);
    window.zomfy.teleport(2.5, 3.0, 0);
  });
  await step(600);
  const regen = await z(() => window.zomfy.weather());
  const uhr = (await view()).wetter;
  await picture('wetter-regen');
  await z(() => {
    const e = window.zomfy.interior().entry;
    window.zomfy.teleport(e.x, e.z - 1.5, Math.PI);
  });
  await step(600);
  const drinnen = await z(() => window.zomfy.weather());
  if (regen.kind === 'regen' && regen.drops > 40 && drinnen.drops === 0 && uhr === 'Nieselregen') note(`✓ Regen: ${regen.drops} Tropfen im Bild, drinnen keine, die Uhr sagt „${uhr}“`);
  else fail(`Regen: ${JSON.stringify({ regen, drinnen, uhr })}`);

  // Nebel: an Nebeltagen morgens über See und Bucht, an klaren Nachmittagen nicht
  await z(() => {
    window.zomfy.setWeather('nebel');
    window.zomfy.setTime(7, 0);
    window.zomfy.teleport(10.5, 0.5, 0);
  });
  await step(800);
  const nebel = await z(() => window.zomfy.weather());
  await picture('wetter-nebel');
  await z(() => {
    window.zomfy.setWeather('klar');
    window.zomfy.setTime(14, 0);
  });
  await step(800);
  const klar = await z(() => window.zomfy.weather());
  if (nebel.fog && !klar.fog) note('✓ Nebel: am Nebelmorgen über dem Wasser, am klaren Nachmittag weg');
  else fail(`Nebel: morgens ${nebel.fog}, nachmittags ${klar.fog}`);

  // Morgenbericht: das Wetter des neuen Tages steht darin (ohne Nacht als Meldung)
  await z(() => {
    window.zomfy.setWeather('regen', false);
    window.zomfy.game.advanceToMorning();
  });
  await step(100);
  const morgen = (await view()).meldungen || [];
  const satz = await z(() => window.zomfy.game.weatherLine(window.zomfy.state().time.day));
  await z(() => window.zomfy.setWeather(null));
  if (morgen.includes(satz) && /Regen|nieselt|nass/.test(satz)) note(`✓ Wetter am Morgen: „${satz}“`);
  else fail(`Wetter am Morgen fehlt: ${JSON.stringify({ morgen, satz })}`);

  // Herbstschmuck: Schilf am Ufer, Kürbislaternen leuchten nachts, Laub stiebt auf
  const schilf = await z(() => window.zomfy.game.world.stats.reeds);
  const glut = async (h) => {
    await z((hh) => window.zomfy.setTime(hh, 0), h);
    await step(300);
    return z(() => {
      const c = window.zomfy.game.world.materials.pumpkinGlow.color;
      return c.r + c.g + c.b;
    });
  };
  const glutTag = await glut(12);
  const glutNacht = await glut(22);
  await z(() => window.zomfy.teleport(6.0, -2.25, 0));
  await step(400);
  await picture('laternen');
  await z(() => {
    window.zomfy.setTime(10, 0);
    window.zomfy.teleport(-5.25, -12.0, Math.PI / 2);
  });
  await step(200);
  const vorher = await z(() => window.zomfy.game.world.leafKicks);
  await page.keyboard.down('KeyD');
  await step(900);
  await page.keyboard.up('KeyD');
  await step(100);
  const kicks = (await z(() => window.zomfy.game.world.leafKicks)) - vorher;
  if (schilf >= 20 && glutNacht > glutTag * 1.5 && kicks > 0) note(`✓ Herbst: ${schilf} Schilfbüschel am Ufer, Kürbislaternen nachts hell (${glutTag.toFixed(2)} → ${glutNacht.toFixed(2)}), Laub stiebt ${kicks}× auf`);
  else fail(`Herbst: ${JSON.stringify({ schilf, glutTag, glutNacht, kicks })}`);

  // Krähen: sitzen tagsüber, fliegen vor Mika krächzend auf und kommen wieder
  await z(() => {
    window.zomfy.teleport(12.0, 6.5, 0);
    window.zomfy.settleCrows();
  });
  await step(300);
  const k0 = await z(() => window.zomfy.crows());
  const sitzend = k0.list.filter((c) => c.state === 'sitzt');
  const ziel = sitzend.find((c) => c.x > -8 && c.x < 12) || sitzend[0];
  await z(([x, zz]) => window.zomfy.teleport(x + 1.0, zz + 1.0, 0), [ziel.x, ziel.z]);
  await step(300);
  const k1 = await z(() => window.zomfy.crows());
  const aufgeflogen = k1.list.find((c) => c.id === ziel.id).state;
  await z(() => window.zomfy.teleport(12.0, 6.5, 0));
  for (let k = 0; k < 12; k++) await step(10000);
  const k2 = await z(() => window.zomfy.crows());
  const wieder = k2.list.filter((c) => c.state === 'sitzt').length;
  if (sitzend.length >= 3 && aufgeflogen === 'fliegt' && k1.caws > k0.caws && wieder >= 3) note(`✓ Krähen: ${sitzend.length} sitzen, eine fliegt vor Mika krächzend auf, zwei Minuten später sitzen wieder ${wieder}`);
  else fail(`Krähen: ${JSON.stringify({ sitzend: sitzend.length, aufgeflogen, caws: [k0.caws, k1.caws], wieder })}`);

  // … auch vor einem Schlurfer; abends ziehen alle in den Wald
  const k3 = await z(() => window.zomfy.crows());
  const opfer = k3.list.find((c) => c.state === 'sitzt' && Math.hypot(c.x - 12.0, c.z - 6.5) > 4);
  let vorSchlurfer = 'keine Krähe';
  if (opfer) {
    await z(([x, zz]) => {
      window.zomfy.setHorde(true);
      window.zomfy.spawnZombie('schlurfer', x + 1.2, zz + 0.4);
    }, [opfer.x, opfer.z]);
    await step(300);
    vorSchlurfer = (await z(() => window.zomfy.crows())).list.find((c) => c.id === opfer.id).state;
  }
  await z(() => {
    window.zomfy.killAllZombies();
    window.zomfy.setHorde(false);
    window.zomfy.setTime(19, 0);
  });
  await step(8000);
  const abends = (await z(() => window.zomfy.crows())).list.map((c) => c.state);
  if (vorSchlurfer === 'fliegt' && abends.every((s) => s === 'weg')) note('✓ Krähen: fliegen auch vor Schlurfern auf, abends sind alle im Wald');
  else fail(`Krähen: vor dem Schlurfer ${vorSchlurfer}, abends ${abends.join(', ')}`);

  // Bild: Bucht am Vormittag mit Krähen, Pilzen, Kürbissen und Schilf
  await z(() => {
    window.zomfy.setTime(10, 30);
    window.zomfy.teleport(-3.5, 6.5, Math.PI);
    const cr = window.zomfy.game.world.crows;
    for (const c of cr.list) cr.leave(c, true);
    const at = (x, zz) => cr.perches.find((p) => Math.abs(p.x - x) < 0.3 && Math.abs(p.z - zz) < 0.3);
    cr.sit(cr.list[0], at(-6.19, 5.25));
    cr.sit(cr.list[1], at(-2.5, 3.5));
    cr.sit(cr.list[2], at(-0.75, 6.5));
  });
  await step(300);
  await picture('herbst');

  // Gesichter: Aua bei einem Treffer, froh nach einem Fund, müde spät in der Nacht
  const gesicht = () => z(() => window.zomfy.game.player.faceShown);
  await z(() => window.zomfy.game.combat.hurt(1));
  await step(60);
  const aua = await gesicht();
  await step(3000);
  await z(() => {
    const p = window.zomfy.game.player.position;
    window.zomfy.game.collectLoot('holz', p.x, 0.2, p.z);
  });
  await step(60);
  const froh = await gesicht();
  await z(() => window.zomfy.setTime(23, 30));
  await step(2500);
  const muede = await gesicht();
  await z(() => window.zomfy.setTime(10, 0));
  await step(200);
  if (aua === 'aua' && froh === 'froh' && muede === 'muede') note('✓ Gesicht: Aua bei einem Treffer, froh nach einem Fund, müde spät in der Nacht');
  else fail(`Gesicht: ${JSON.stringify({ aua, froh, muede })}`);

  // Überlebende lächeln, wenn Mika bei ihnen steht
  await z(() => window.zomfy.setSurvivor('bert', 2));
  await step(300);
  const bert = await z(() => window.zomfy.npcPos('bert'));
  const lacht = async (dz) => {
    await z(([x, zz]) => window.zomfy.teleport(x + 0.3, zz, Math.PI), [bert.x, bert.z + dz]);
    await step(800);
    return z(() => window.zomfy.game.survivors.npcs.list.get('bert').model.parts.faces.froh.visible);
  };
  const nah = await lacht(2.0);
  const weit = await lacht(6.0);
  if (nah && !weit) note('✓ Überlebende: Bert lächelt, wenn Mika bei ihm steht, sonst nicht');
  else fail(`Überlebende lächeln nicht richtig: nah ${nah}, weit ${weit}`);

  checkMessages(session);
  await session.context.close();
}

/**
 * Nachbesserung nach der Testrunde m12-r1: Ein ungelesener Morgenbericht kommt
 * nach dem Neuladen wieder (und klebt nicht), die Haustür zeigt »Hineingehen«
 * und E geht hinein, fehlt Stein, zeigt das Ziel zu den Kieseln, der erste
 * Turm zählt nur am Weg der Horde, wenig Leben warnt (Herzschlag, Gedanke),
 * das Zuhause warnt nachts groß, die Perk-Wahl wartet auf das Ende der Welle
 * und nimmt keinen Kampf-Klick, die Wege haben Fackeln und leuchten nachts.
 */
async function runFixChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Nachbesserung m12-r1');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(10, 0);
  });
  await step(100);

  // Morgenbericht: nach dem Neuladen und »Weiterspielen« wieder offen, nicht nur gezeichnet
  const bericht = await z(() => {
    const g = window.zomfy.game;
    g.state.report = { n: 1, won: true, kills: 3, loot: {}, homeLost: 0, fell: false, homeNow: 300, homeMax: 300, preLoss: 0, losses: null, damaged: null, broken: 0 };
    g.mode = 'title';
    g.title.open(true);
    g.startFromTitle();
    return { mode: g.mode, offen: g.report.isOpen };
  });
  await page.keyboard.press('Enter');
  await step(600);
  await page.keyboard.press('Enter');
  await step(100);
  const nachBericht = await z(() => ({ mode: window.zomfy.mode, offen: window.zomfy.game.report.isOpen, bericht: window.zomfy.state().report }));
  if (bericht.mode === 'report' && bericht.offen && nachBericht.mode === 'play' && !nachBericht.offen && !nachBericht.bericht) note('✓ Morgenbericht: nach dem Neuladen wieder offen, Enter schließt ihn');
  else fail(`Morgenbericht nach dem Neuladen: ${JSON.stringify({ bericht, nachBericht })}`);

  // Haustür: Hinweis und E geht hinein
  await z(() => {
    const d = window.zomfy.interior().outsideDoor;
    window.zomfy.teleport(d.x, d.z + 0.1, Math.PI);
  });
  await step(200);
  const tuer = (await view()).hinweis;
  await page.keyboard.press('KeyE');
  await step(800);
  const drin = await z(() => window.zomfy.interior().inside);
  if (tuer === 'Hineingehen' && drin) note('✓ Haustür: „Hineingehen“ steht dran, E geht hinein');
  else fail(`Haustür: Hinweis „${tuer}“, drinnen ${drin}`);

  // Kein Stein für die Werkbank: Das Ziel zeigt zu den Kieseln
  await z(() => {
    const d = window.zomfy.interior().outsideDoor;
    window.zomfy.teleport(d.x, d.z + 1.5, 0);
    for (const f of ['ziel_axt', 'ziel_turm', 'ziel_nacht', 'ziel_haendler']) window.zomfy.setFlag(f);
    window.zomfy.game.state.inventory.stein = 0;
  });
  await step(300);
  const zielKiesel = await z(() => ({ text: window.zomfy.game.goal?.text, hin: window.zomfy.game.goalTarget(), kiesel: window.zomfy.game.world.resources.nodes.filter((n) => n.kind === 'kiesel').map((n) => [n.x, n.z]) }));
  const zeigtAufKiesel = zielKiesel.hin && zielKiesel.kiesel.some(([x, zz]) => x === zielKiesel.hin.x && zz === zielKiesel.hin.z);
  if (/Kiesel/.test(zielKiesel.text || '') && zeigtAufKiesel) note(`✓ Ziel: ohne Stein „${zielKiesel.text}“, der Pfeil zeigt auf Kiesel`);
  else fail(`Kiesel-Ziel: ${JSON.stringify(zielKiesel)}`);

  // Erster Turm: zählt nur, wenn sein Kreis den Weg der Horde erreicht
  const turmZiel = await z(() => {
    const g = window.zomfy.game;
    delete g.state.flags.ziel_turm;
    window.zomfy.give({ schrott: 40 });
    const weit = window.zomfy.build('bolzen', 11, -2);
    g.updateGoals(true);
    const nachWeit = Boolean(g.state.flags.ziel_turm);
    // Ein freies Feld neben dem letzten Wegstück, von dem aus der Turm die Horde erreicht
    let nah = 'kein Feld';
    for (let i = -12; i <= -2 && nah !== 'ok'; i++) {
      for (let j = -4; j <= 6 && nah !== 'ok'; j++) {
        if (window.zomfy.placeCheck('bolzen', i, j).ok && g.world.pathing.covers(i + 0.5, j + 0.5, 5.5)) nah = window.zomfy.build('bolzen', i, j);
      }
    }
    g.updateGoals(true);
    return { weit, nachWeit, nah, nachNah: Boolean(g.state.flags.ziel_turm) };
  });
  if (turmZiel.weit === 'ok' && !turmZiel.nachWeit && turmZiel.nah === 'ok' && turmZiel.nachNah) note('✓ Turm-Ziel: ein Turm fern der Horde zählt nicht, einer am Weg schon');
  else fail(`Turm-Ziel: ${JSON.stringify(turmZiel)}`);

  // Wenig Leben: Herzschlag und ein Gedanke
  await z(() => {
    window.zomfy.game.state.player.hp = Math.round(window.zomfy.maxHp() * 0.2);
    window.zomfy.game.dizzy = false;
  });
  await step(500);
  const schwach = await z(() => ({ gedanke: window.zomfyView().gedanke, herz: window.zomfy.game.heartT }));
  await z(() => {
    window.zomfy.game.state.player.hp = window.zomfy.maxHp();
  });
  if (/schwindelig/.test(schwach.gedanke || '') && schwach.herz > 0) note('✓ Wenig Leben: Herzschlag und „Mir wird schwindelig …“');
  else fail(`Wenig Leben: ${JSON.stringify(schwach)}`);

  // Zuhause nachts unter der Hälfte: großes Banner
  await z(() => window.zomfy.setTime(21, 0));
  await step(200);
  const banner = await z(() => {
    const g = window.zomfy.game;
    // Die Nacht als laufend markieren (die Horde bleibt aus)
    Object.assign(g.state.night, { n: g.state.time.day, done: false });
    const max = g.state.world.homeHp;
    g.state.world.homeHp = max * 0.45;
    g.onHouseHit(1, { x: -2, z: -4, day: false });
    return { banner: window.zomfyView().banner, aktiv: g.nights.active };
  });
  await z(() => {
    window.zomfy.game.state.night.done = true;
    window.zomfy.setHomeHp(300);
  });
  if (banner.aktiv && /wankt/.test(banner.banner || '')) note(`✓ Zuhause: nachts unter der Hälfte das Banner „${banner.banner}“`);
  else fail(`Zuhause-Warnung: ${JSON.stringify(banner)}`);

  // Fackeln an den Wegen, nachts mit Eigenlicht
  const wege = await z(() => ({ fackeln: window.zomfy.game.world.props.torches.length, glut: window.zomfy.game.world.groundMaterial.emissiveIntensity }));
  if (wege.fackeln >= 4 && wege.glut > 0.1) note(`✓ Wege: ${wege.fackeln} Fackeln, nachts leuchtet der Weg (${wege.glut.toFixed(2)})`);
  else fail(`Wege nachts: ${JSON.stringify(wege)}`);

  // Jäger um eine Barrikadenreihe (Kira): Wer Mika um das Ende der Reihe gejagt hat,
  // kehrt danach vor die Reihe zurück – vorher stand er dahinter auf dem Weg zum Haus
  const umweg = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    for (const t of [...g.world.buildings.towers]) g.builder.demolish(t.id); // Türme schössen die Jäger ab
    Z.setTime(12, 0);
    Z.give({ holz: 30 });
    const col = Z.pathColumn(-14);
    let reihe = 0;
    for (const j of col) if (Z.build('barrikade', -14, j, 1) === 'ok') reihe++;
    // Die Reihe hält während der Prüfung (sonst zählt ein Durchbruch als Umweg)
    for (const b of g.world.buildings.list) if (b.type === 'barrikade') b.hp = 5000;
    const mid = Z.pathColumn(-19);
    return { col, reihe, start: mid[Math.floor(mid.length / 2)] };
  });
  const amEnde = { x: -12.5, z: Math.min(...umweg.col) - 1.2 }; // neben dem Ende der Reihe, auf der Hausseite
  await z((a) => {
    window.zomfy.teleport(a.m.x, a.m.z, -Math.PI / 2);
    for (let k = 0; k < 3; k++) window.zomfy.spawnZombie('schlurfer', -19 - k * 0.6, a.j + 0.5 + (k % 2) * 0.6);
  }, { m: amEnde, j: umweg.start });
  let herum = 0;
  for (let t = 0; t < 10; t++) {
    await z((m) => {
      window.zomfy.setPlayerHp(window.zomfy.maxHp());
      window.zomfy.teleport(m.x, m.z, -Math.PI / 2);
    }, amEnde);
    await step(1000);
    herum = Math.max(herum, await z(() => window.zomfy.zombies().filter((q) => q.x > -13.5).length));
  }
  await z(() => window.zomfy.teleport(5.5, -3, 0)); // Mika geht weg: Die Jagd endet
  let zurueck = 0;
  let weiter = 0; // Richtung Haus an der Reihe vorbei
  let r = null;
  for (let t = 0; t < 16; t++) {
    await step(500);
    r = await z(() => ({ zs: window.zomfy.zombies(), broken: window.zomfy.buildings().filter((b) => b.type === 'barrikade' && b.broken).length }));
    zurueck += r.zs.filter((q) => q.state === 'rejoin').length;
    weiter = Math.max(weiter, r.zs.filter((q) => q.x > -11.5).length);
  }
  const vorn = r.zs.length > 0 && r.zs.every((q) => q.x < -13.2);
  await z(() => window.zomfy.killAllZombies());
  if (umweg.reihe === umweg.col.length && herum > 0 && zurueck > 0 && weiter === 0 && vorn && r.broken === 0) note(`✓ Horde: Jäger laufen um die Barrikadenreihe zu Mika, danach zurück vor die Reihe – keiner zieht dahinter zum Haus weiter`);
  else fail(`Jäger um die Reihe: ${JSON.stringify({ umweg, herum, zurueck, weiter, vorn, danach: r })}`);

  // E-Durchdrücken (Jonas, Kira): Direkt nach einem Dialog öffnet ein schneller Druck
  // nichts Neues – ein bewusster Druck etwas später schon
  await z(() => window.zomfy.teleport(1.75, -5.2, Math.PI)); // am Hackklotz
  await step(300);
  await page.keyboard.press('KeyE');
  await step(100);
  const dialogAuf = await z(() => window.zomfy.mode);
  for (let k = 0; k < 20 && (await z(() => window.zomfy.mode)) === 'dialog'; k++) {
    await page.keyboard.press('KeyE');
    await step(60);
  }
  await page.keyboard.press('KeyE'); // gleich hinterher gehämmert
  await step(60);
  const gehaemmert = await z(() => window.zomfy.mode);
  await step(800);
  await page.keyboard.press('KeyE');
  await step(100);
  const bewusst = await z(() => window.zomfy.mode);
  await z(() => window.zomfy.finishDialog());
  await step(100);
  if (dialogAuf === 'dialog' && gehaemmert === 'play' && bewusst === 'dialog') note('✓ E: nach einem Dialog öffnet schnelles Weiterdrücken nichts, ein bewusster Druck schon');
  else fail(`E nach dem Dialog: ${JSON.stringify({ dialogAuf, gehaemmert, bewusst })}`);

  // Über die eigene Barrikadenreihe klettert Mika (Mira: sie blieb nachts darin hängen),
  // die Horde bleibt weiter davor (siehe oben)
  const klettern = await z((col) => {
    const Z = window.zomfy;
    const j = col[Math.floor(col.length / 2)] + 0.5;
    const ende = Z.probeWalk(-15.5, j, 1, 0, 60);
    const g = Z.game;
    g.player.place(-14.5, j, 0);
    let hoch = 0;
    for (let k = 0; k < 12; k++) {
      g.player.update(1 / 30, { x: 1, z: 0 }, false);
      hoch = Math.max(hoch, g.player.position.y);
    }
    return { x: ende && ende.x, hoch };
  }, umweg.col);
  if (klettern.x > -12.8 && klettern.hoch > 0.15) note(`✓ Barrikaden: Mika klettert über die eigene Reihe (bis x ${klettern.x.toFixed(1)}, ${klettern.hoch.toFixed(2)} m hoch)`);
  else fail(`Klettern: ${JSON.stringify(klettern)}`);

  // Drinnen steckt Mika das Werkzeug weg (Mira: die Axt ragte durch die Wand). N4: Draußen
  // hängt es auf dem Rücken, beim Schlag ist es in der Hand, danach wandert es zurück
  const werkzeug = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const p = g.player;
    p.heldTool = 'axt';
    p.drawnT = 0;
    const vis = (set) => Object.entries(set).filter(([, m]) => m.visible).map(([n]) => n);
    p.update(1 / 30, { x: 0, z: 0 }, false);
    const ruecken = vis(p.character.backTools);
    const hand = vis(p.character.tools);
    p.startAction('swing', { tool: 'axt', duration: 0.5, hitAt: 0.3 });
    p.update(1 / 30, { x: 0, z: 0 }, false);
    const schlag = vis(p.character.tools);
    const schlagRuecken = vis(p.character.backTools);
    for (let k = 0; k < 150; k++) p.update(1 / 30, { x: 0, z: 0 }, false); // fünf Sekunden später
    const danach = vis(p.character.backTools);
    const w = Z.wakeSpot();
    Z.teleport(w.x, w.z, 0);
    p.update(1 / 30, { x: 0, z: 0 }, false);
    const drinnen = [...vis(p.character.tools), ...vis(p.character.backTools)];
    const d = Z.interior().outsideDoor;
    Z.teleport(d.x, d.z + 1.2, 0);
    return { ruecken, hand, schlag, schlagRuecken, danach, drinnen };
  });
  await step(100);
  if (werkzeug.ruecken.includes('axt') && !werkzeug.hand.length && werkzeug.schlag.includes('axt') && !werkzeug.schlagRuecken.length && werkzeug.danach.includes('axt') && werkzeug.drinnen.length === 0) note('✓ Werkzeug (N4): draußen auf dem Rücken, beim Schlag in der Hand, danach wieder weggesteckt – drinnen gar nicht zu sehen');
  else fail(`Werkzeug: ${JSON.stringify(werkzeug)}`);

  // Dichte Barrikadenreihe (Theo): Der Zeiger auf einer Barrikade wählt genau diese,
  // nicht die Nachbarin davor
  const reiheKlick = await z(() => {
    const Z = window.zomfy;
    Z.give({ holz: 20 });
    Z.setHorde(false); // kein Streuner neben Mika: dann hätte Zuschlagen Vorrang vor dem Auswählen
    const col = Z.pathColumn(-10);
    for (const j of col) Z.build('barrikade', -10, j, 1);
    // Die Reihe steht im oberen Teil des Bildes: unten liegen Schnellleiste und Fähigkeiten (M16)
    Z.teleport(-7.5, col[0] - 1, 0);
    return col.slice(0, -1);
  });
  await step(300);
  const getroffen = [];
  for (const j of reiheKlick) {
    const s = await z((jj) => window.zomfy.screenOf(-9.5, 0.45, jj + 0.5), j);
    await page.mouse.move(s.x, s.y);
    await step(50);
    getroffen.push(await z(() => window.zomfy.game.builder.hovered?.j ?? null));
  }
  const zeigerLage = await z(() => ({ kampf: window.zomfy.game.builder.fighting(), modus: window.zomfy.mode }));
  await z(() => window.zomfy.setHorde(true));
  if (getroffen.length >= 3 && getroffen.every((j, k) => j === reiheKlick[k])) note(`✓ Auswahl: In einer dichten Barrikadenreihe trifft der Zeiger die Barrikade darunter (${getroffen.length} von ${reiheKlick.length})`);
  else fail(`Barrikade unter dem Zeiger: ${JSON.stringify({ reiheKlick, getroffen, zeigerLage })}`);

  // E neben Werkbank und Sessel (Theo): Die Werkbank geht vor
  const sitz = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const sessel = g.world.interactions.find((i) => i.id === 'sessel');
    Z.give({ holz: 20, stein: 10 });
    let bank = null;
    for (const [di, dj] of [[1, 0], [1, -1], [-2, 0], [1, 1], [-2, -1]]) {
      const i = Math.floor(sessel.x) + di;
      const j = Math.floor(sessel.z) + dj;
      if (g.world.buildings.list.some((b) => b.type === 'werkbank')) break;
      if (Z.placeCheck('werkbank', i, j).ok && Z.build('werkbank', i, j) === 'ok') bank = { i, j };
    }
    const wb = g.world.buildings.list.find((b) => b.type === 'werkbank');
    if (!wb) return { bank: null };
    // Wie bei Theo: nördlich vor dem Sessel, die Werkbank rechts daneben, Blick nach Süden
    const it = g.world.findInteraction(sessel.x + 0.25, sessel.z - 1.0, 0);
    return { bank, gewaehlt: it?.id || null, prompt: it?.prompt || null };
  });
  if (sitz.gewaehlt && sitz.gewaehlt.startsWith('bau-')) note(`✓ E: Neben dem Sessel geht die Werkbank vor („${sitz.prompt}“)`);
  else fail(`Werkbank neben dem Sessel: ${JSON.stringify(sitz)}`);

  // Drinnen kommt man zu Fuß in jeden Raum (Theo: der Stubentisch versperrte die Küche) –
  // auf Stufe 5 von Raummitte zu Raummitte, auf Höhe der Durchgänge
  const raeume = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.setHouseLevel(5);
    const rooms = Z.interior().rooms;
    const walk = (x0, z0, x1, z1) => {
      g.player.place(x0, z0, 0);
      for (let k = 0; k < 240; k++) {
        const p = g.player.position;
        const d = Math.hypot(x1 - p.x, z1 - p.z);
        if (d < 0.2) break;
        g.player.update(1 / 30, { x: (x1 - p.x) / d, z: (z1 - p.z) / d }, false);
      }
      return Math.hypot(x1 - g.player.position.x, z1 - g.player.position.z);
    };
    const out = [];
    for (let i = 0; i + 1 < rooms.length; i++) {
      const a = (rooms[i].minX + rooms[i].maxX) / 2;
      const b = (rooms[i + 1].minX + rooms[i + 1].maxX) / 2;
      // auf Höhe der Durchgänge (N4: Zeilen 48–79, also 3,0 bis 5,0 m von der Rückwand)
      out.push({ weg: `${rooms[i].id}–${rooms[i + 1].id}`, rest: Math.max(walk(a, 4.0, b, 4.0), walk(b, 4.0, a, 4.0)) });
    }
    Z.setHouseLevel(1);
    const d = Z.interior().outsideDoor;
    Z.teleport(d.x, d.z + 1.2, 0);
    return out;
  });
  await step(100);
  // Raummitten können in Möbeln liegen – wer bis auf gut einen halben Meter herankommt, ist drin
  if (raeume.length === 4 && raeume.every((r) => r.rest < 0.6)) note(`✓ Drinnen: Alle Räume sind zu Fuß erreichbar (${raeume.map((r) => r.weg).join(', ')})`);
  else fail(`Räume zu Fuß: ${JSON.stringify(raeume)}`);

  // Reifenschaukel (Kira): E, und Mika schaukelt wirklich – danach steht sie wieder davor
  await step(100);
  await z(() => window.zomfy.finishDialog()); // »Eine richtige Werkbank!« vom Punkt davor
  await step(400);
  await z(() => {
    const i = window.zomfy.game.world.interactions.find((q) => q.id === 'schaukel');
    window.zomfy.teleport(i.x, i.z + 0.3, Math.PI);
  });
  await step(300);
  const schaukelHinweis = (await view()).hinweis;
  await page.keyboard.press('KeyE');
  let hoch = 0;
  let weite = 0;
  for (let k = 0; k < 8; k++) {
    await step(250);
    const r = await z(() => ({ y: window.zomfy.game.player.position.y, rot: Math.abs(window.zomfy.game.world.props.swing.pivot.rotation.z) }));
    hoch = Math.max(hoch, r.y);
    weite = Math.max(weite, r.rot);
  }
  await step(3000);
  const nachher = await z(() => ({ ride: Boolean(window.zomfy.game.ride), y: window.zomfy.game.player.position.y, gedanke: window.zomfyView().gedanke || '' }));
  if (schaukelHinweis === 'Schaukeln' && hoch > 0.3 && weite > 0.25 && !nachher.ride && nachher.y < 0.1 && /erwachsen/.test(nachher.gedanke)) note(`✓ Schaukel: E, Mika schaukelt (bis ${weite.toFixed(2)} rad, ${hoch.toFixed(2)} m hoch) und steht danach wieder davor`);
  else fail(`Schaukel: ${JSON.stringify({ schaukelHinweis, hoch, weite, nachher })}`);

  checkMessages(session);
  await session.context.close();
}

/**
 * M23 (nur der Kern): Ein Hochsitz steht neben dem Weg, nie darauf; über die
 * Auswahl bezieht Juna ihn mit echter Taste – abends steht sie oben (ohne
 * Gesprächs-Einblendung), mittags an ihrem Platz. J zündet ihr Leuchtfeuer
 * (blendet ringsum, betäubt seit M29 nicht mehr, danach Pause), Hilde wirft
 * Leimgläser (klebrig, kein Schaden – M29: Posten helfen nur), Bert flickt nachts
 * eine Barrikade, Knopf jagt einen Schwärmer aus dem Hof; wer zu viel abbekommt,
 * zieht sich ins Haus zurück. Nach der gehaltenen Bossnacht 5 feiern alle am
 * Morgen am Feuer, die Türme treffen nachts härter, der Bericht erzählt von den
 * Posten. Morgens bittet Hilde um ihr Garn: E am Wrack erledigt den Auftrag
 * (Bauplan zur Wahl); Junas Antennenteile liegen neben den Wegen; Balduins
 * Bitte steht im Handelsfenster. Speichern v30 und Migration v16 → v30
 * (Bilder: posten, fest, auftrag).
 */
async function runTogetherChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Gemeinsam durch die Nacht (M23)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m23')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m23', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(60);
  };
  const quiet = () => z(() => (window.zomfy.game.hud.toasts.length = 0));
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut', 'championHinweis', 'turmteilHinweis']) Z.setFlag(f);
    Z.setWeather('klar', true);
    Z.setHorde(false);
    Z.setDay(5);
    Z.setTime(12, 0);
    Z.give({ holz: 300, stein: 60, schrott: 600, zahnraeder: 30, moderkerne: 4, teile: 40, stoff: 5 });
    for (const id of ['knopf', 'hilde', 'juna', 'bert', 'yusuf']) Z.setSurvivor(id, 3);
  });

  // 1) Drei Hochsitze neben den Wegen (auf dem Weg: abgelehnt); Juna über die Auswahl
  const bau = await z(() => {
    const Z = window.zomfy;
    const out = { spots: [], aufWeg: null };
    for (const i of [-12, -17, -22, -9, -26, -30]) {
      const col = Z.pathColumn(i);
      if (col.length < 2) continue;
      if (!out.aufWeg) out.aufWeg = Z.placeCheck('hochsitz', i, col[Math.floor(col.length / 2)]).reason;
      for (const j of [Math.max(...col) + 2, Math.min(...col) - 2, Math.max(...col) + 3, Math.min(...col) - 3]) {
        if (!Z.placeCheck('hochsitz', i, j).ok || Z.build('hochsitz', i, j) !== 'ok') continue;
        const b = Z.buildings().find((q) => q.type === 'hochsitz' && q.i === i && q.j === j);
        out.spots.push({ id: b.id, i, j, x: i + 0.5, z: j + 0.5, pz: col[Math.floor(col.length / 2)] + 0.5 });
        break;
      }
      if (out.spots.length >= 3) break;
    }
    const s = out.spots[0];
    if (s) {
      Z.teleport(s.x + 1.5, s.z - 1.5, 0);
      Z.selectBuilding(s.id);
    }
    return out;
  });
  await step(100);
  const junaKey = await z(() => {
    const g = window.zomfy.game;
    const tile = g.buildbar.layout(g.ui).tiles.find((t) => t.option.id === 'posten-juna');
    return tile ? ['KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyC', 'KeyV'][tile.keyIndex] : null;
  });
  if (junaKey) await tap(junaKey);
  await step(200);
  const mittag = await z(() => ({ posts: window.zomfy.posts().posts, juna: window.zomfy.postNpc('juna') }));
  const [sJ, sH, sB] = bau.spots;
  if (bau.spots.length === 3 && bau.aufWeg === 'aufWeg' && junaKey && mittag.posts.find((p) => p.id === sJ.id)?.post === 'juna' && mittag.juna.y < 0.6) {
    note(`✓ Hochsitz (M23): neben dem Weg ja, darauf nein (»${bau.aufWeg}«) – ${junaKey.slice(3)} in der Auswahl stellt Juna auf den Posten; mittags steht sie an ihrem Platz`);
  } else fail(`Hochsitz: ${JSON.stringify({ bau, junaKey, mittag })}`);
  await z((ids) => {
    window.zomfy.assignPost(ids[0], 'hilde');
    window.zomfy.assignPost(ids[1], 'bert');
  }, [sH?.id, sB?.id]);

  // 2) Abends: Juna oben auf dem Hochsitz, ohne »Ansprechen«
  await z(() => window.zomfy.setTime(20, 20));
  await step(500);
  const abend = await z(() => ({ juna: window.zomfy.postNpc('juna'), duty: window.zomfy.posts().duty }));
  if (abend.juna && abend.juna.visible && abend.juna.y > 1.2 && Math.abs(abend.juna.x - sJ.x) < 0.6 && abend.juna.prompt === false && abend.duty.join() === 'bert,hilde,juna') note(`✓ Posten (M23): Abends stehen Bert, Hilde und Juna oben auf ihren Hochsitzen (${abend.juna.y.toFixed(2)} m), ansprechen lassen sie sich dort nicht`);
  else fail(`Posten am Abend: ${JSON.stringify(abend)}`);

  // 3) J: Junas Leuchtfeuer blendet ringsum (betäubt nicht, M29), ein zweites J wartet
  const nacht = await z((s) => {
    const Z = window.zomfy;
    Z.game.nights.beginNight(5);
    const ids = [Z.spawnZombie('schlurfer', s.x - 1.5, s.pz), Z.spawnZombie('schlurfer', s.x + 1, s.pz), Z.spawnZombie('flitzer', s.x, s.pz)];
    if (!Z.game.state.player.lantern) Z.toggleLantern();
    return ids;
  }, sJ);
  await step(150);
  await quiet();
  await tap('KeyJ');
  const blitz = await z((ids) => {
    const g = window.zomfy.game;
    const mine = g.horde.list.filter((q) => ids.includes(q.id));
    return { blind: mine.filter((q) => q.blindT > 3).length, stunned: mine.filter((q) => q.stunT > 0.05).length, cd: window.zomfy.posts().junaCd };
  }, nacht);
  await step(200);
  await page.screenshot({ path: join(SHOTS, 'posten.png') });
  note('  Screenshot: screenshots/posten.png');
  await tap('KeyJ');
  const wieder = await z(() => ({ cd: window.zomfy.posts().junaCd, toasts: window.zomfy.game.hud.toasts.map((t) => t.text) }));
  if (blitz.blind === 3 && blitz.stunned === 0 && blitz.cd > 25 && wieder.toasts.some((t) => t.includes('glüht noch nach'))) note(`✓ Leuchtfeuer (M23, M29): J – Juna blendet alle drei Schlurfer unter ihrem Hochsitz, betäubt aber keinen; ein zweites J wartet (noch ${Math.ceil(wieder.cd)} s)`);
  else fail(`Leuchtfeuer: ${JSON.stringify({ blitz, wieder })}`);
  await z(() => window.zomfy.game.horde.clear());

  // 4) Hilde wirft Leimgläser, 5) Bert flickt die Barrikade, 6) Knopf jagt einen Schwärmer aus dem Hof
  const vorher = await z(([h, b]) => {
    const Z = window.zomfy;
    const g = Z.game;
    const id = Z.spawnZombie('schlurfer', h.x + 1, h.pz);
    const q = g.horde.list.find((o) => o.id === id);
    q.stunT = 999;
    Z.build('barrikade', b.i, Math.floor(b.pz));
    const bar = Z.buildings().find((o) => o.type === 'barrikade' && o.i === b.i && o.j === Math.floor(b.pz));
    const hit = bar ? Z.hitBarricade(bar.id, 10) : null;
    const home = g.world.pathing.attackPoint(3, -3);
    const sw = Z.spawnZombie('schwaermer', home.x - 1.5, home.z + 1);
    return { id, hp: q.hp, bar: bar?.id ?? null, hit, sw };
  }, [sH, sB]);
  await step(3000);
  const helfer = await z((v) => {
    const g = window.zomfy.game;
    const q = g.horde.list.find((o) => o.id === v.id);
    const bar = g.world.buildings.get(v.bar);
    return { hp: q?.hp ?? 0, slow: q?.slowT ?? 0, bar: bar?.hp ?? null, stats: window.zomfy.posts().stats };
  }, vorher);
  if (helfer.hp === vorher.hp && helfer.slow > 1 && helfer.stats.hilde >= 1 && vorher.hit?.hp === 10 && helfer.bar >= 19 && helfer.stats.bert > 8 && helfer.stats.knopf >= 1) {
    note(`✓ Helfer (M23, M29): Hilde wirft ${helfer.stats.hilde} Leimgläser (klebrig, die Leben bleiben bei ${Math.round(helfer.hp)}), Bert flickt die Barrikade (10 → ${Math.round(helfer.bar)}), Knopf jagt ${helfer.stats.knopf}× einen Schwärmer aus dem Hof`);
  } else fail(`Helfer: ${JSON.stringify({ vorher, helfer })}`);

  // 7) Zu viel abbekommen: Hilde zieht sich ins Haus zurück
  await z((h) => {
    const Z = window.zomfy;
    Z.game.horde.clear();
    Z.game.posts.nerve.hilde = 0.3;
    Z.spawnZombie('schlurfer', h.x + 0.8, h.z - 0.6);
  }, sH);
  await step(300);
  const rueck = await z(() => ({ p: window.zomfy.posts(), hilde: window.zomfy.postNpc('hilde') }));
  if (rueck.p.retreated.includes('hilde') && rueck.hilde && !rueck.hilde.visible && rueck.p.duty.join() === 'bert,juna') note('✓ Rückzug (M23): Rütteln die Schlurfer zu lange am Hochsitz, zieht sich Hilde ins Haus zurück – niemand wird besiegt');
  else fail(`Rückzug: ${JSON.stringify(rueck)}`);

  // 8) Bossnacht 5 gehalten: Fest am Feuer, Bericht mit den Posten, Türme treffen nachts härter
  const morgen = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.endNight(true);
    g.advanceToMorning();
    const extra = (g.state.report?.extra || []).map((l) => l.text);
    g.report.report = null;
    g.state.report = null;
    const bc = g.state.blueprintChoice;
    if (bc) g.chooseBlueprint(bc.options[0]);
    g.mode = 'play';
    Z.teleport(2.5, 1.0, 0);
    return { feast: g.state.feast, day: g.state.time.day, extra };
  });
  await step(6000);
  await quiet();
  await step(100);
  await page.screenshot({ path: join(SHOTS, 'fest.png') });
  note('  Screenshot: screenshots/fest.png');
  const fest = await z(() => {
    const Z = window.zomfy;
    const c = { x: 0.5, z: -1.75 }; // Lagerfeuer
    const d = ['bert', 'hilde', 'juna', 'yusuf'].map((id) => {
      const n = Z.postNpc(id);
      return n ? Math.hypot(n.x - c.x, n.z - c.z) : 99;
    });
    // Einen Augenblick »Nacht« (ohne Horde): Das Spiel gibt den Türmen den Festbonus
    const g = Z.game;
    const night = g.state.night;
    g.state.night = { ...night, n: g.state.time.day, done: false };
    window.__zomfyStep(50);
    const boost = g.towers.boost;
    g.state.night = night;
    window.__zomfyStep(50);
    return { d, boost: +Z.posts().boost.toFixed(2), live: +boost.toFixed(2), after: g.towers.boost };
  });
  const posten = morgen.extra.find((t) => t.startsWith('Auf den Posten:')) || '';
  if (morgen.feast === 6 && morgen.day === 6 && morgen.extra.some((t) => t.startsWith('Fest am Feuer')) && /Juna zündete/.test(posten) && /Bert flickte/.test(posten) && morgen.extra.some((t) => t.includes('musste vom Hochsitz ins Haus')) && fest.d.every((d) => d < 2.8) && fest.live === 1.1) {
    note(`✓ Fest (M23): Nach der gehaltenen Bossnacht stehen alle ums Feuer, nachts treffen die Türme ×${fest.live} – im Bericht: »${posten}«`);
  } else fail(`Fest: ${JSON.stringify({ morgen, fest })}`);

  // 9) Nebenauftrag: Hilde bittet morgens um ihr Garn – E am Wrack erledigt ihn, ein Bauplan zur Wahl
  const garn = await z(() => {
    const Z = window.zomfy;
    const q = Z.quests();
    const it = q.items[0];
    if (it) Z.teleport(it.x + 0.9, it.z + 0.4, -Math.PI / 2);
    return { q, goal: Z.questGoal(), bitte: null };
  });
  await step(400);
  await quiet();
  await step(100);
  await page.screenshot({ path: join(SHOTS, 'auftrag.png') });
  note('  Screenshot: screenshots/auftrag.png');
  const hinweis = await z(() => window.zomfyView().hinweis);
  await tap('KeyE');
  await step(200);
  const garnDanach = await z(() => ({ q: window.zomfy.quests(), bc: window.zomfy.game.state.blueprintChoice, wahl: window.zomfyView().perkWahl || null }));
  if (morgen.extra.includes('Oma Hilde bittet: Hol ihre Garnrollen aus dem Bootswrack.') && garn.q.active?.id === 'garn' && garn.goal?.icon === 'hilde' && hinweis === 'Aufsammeln' && garnDanach.q.done.includes('garn') && !garnDanach.q.active && garnDanach.bc?.from === 'auftrag') {
    note('✓ Nebenauftrag (M23): Morgens bittet Hilde um ihr Garn (zweite Zeile im Zielkasten), E am Wrack sammelt es auf – Dank und ein Bauplan zur Wahl');
  } else fail(`Nebenauftrag Garn: ${JSON.stringify({ garn, hinweis, garnDanach, extra: morgen.extra })}`);

  // 10) Balduins Bitte im Handelsfenster: Moderkern und Teile gegen ein einzigartiges Turmteil
  const balduin = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const bc = g.state.blueprintChoice;
    if (bc) g.chooseBlueprint(bc.options[0]);
    g.state.quests.active = { id: 'balduin', got: [], n: 0 };
    const rows = Z.tradeRows();
    const unique = () => ['stricknadel', 'mondstein'].reduce((a, id) => a + (g.state.towerParts[id] || 0), 0);
    const before = { u: unique(), teile: g.state.inventory.teile, kerne: g.state.inventory.moderkerne };
    g.craft(g.quests.tradeRow());
    return { rows, before, after: { u: unique(), teile: g.state.inventory.teile, kerne: g.state.inventory.moderkerne }, q: Z.quests() };
  });
  if (balduin.rows.includes('bitte-balduin') && balduin.after.u === balduin.before.u + 1 && balduin.after.teile === balduin.before.teile - 15 && balduin.after.kerne === balduin.before.kerne - 1 && balduin.q.done.includes('balduin')) note('✓ Balduins Bitte (M23): steht im Handelsfenster – 1 Moderkern und 15 Zombieteile gegen ein einzigartiges Turmteil');
  else fail(`Balduins Bitte: ${JSON.stringify(balduin)}`);

  // 11) Junas Antennenteile: drei Stück neben den Wegen, weit weg von der Bucht
  const antenne = await z(() => {
    const Z = window.zomfy;
    const map = Z.game.world.map;
    const bitte = Z.offerQuest();
    const items = Z.quests().items.map((it) => ({ x: it.x, z: it.z, walk: map.walkableRaw(it.x, it.z), weg: +map.pathDistance(it.x, it.z).toFixed(2) }));
    Z.game.quests.pick(Z.quests().items[0].index);
    return { bitte, items, goal: Z.questGoal(), q: Z.quests() };
  });
  if (antenne.bitte?.startsWith('Juna bittet') && antenne.items.length === 3 && antenne.items.every((it) => it.walk && it.x <= -14 && it.weg >= 1) && antenne.goal?.progress === '(1/3)') note(`✓ Antennenteile (M23): drei liegen neben den Wegen (x ${antenne.items.map((it) => Math.round(it.x)).join(', ')}), eins aufgesammelt – Ziel (1/3)`);
  else fail(`Antennenteile: ${JSON.stringify(antenne)}`);

  // 12) Speichern v30: Posten, laufender Auftrag und Fest bleiben nach dem Neuladen
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z((id) => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    return { v: Z.state().version, post: Z.buildings().find((b) => b.id === id)?.post ?? null, q: Z.quests(), feast: Z.state().feast };
  }, sJ?.id);
  if (geladen.v === 30 && geladen.post === 'juna' && geladen.q.active?.id === 'antenne' && geladen.q.active.got.length === 1 && geladen.q.items.length === 2 && geladen.q.done.join() === 'garn,balduin' && geladen.feast === 6) note('✓ Speichern v30: Junas Hochsitz, der laufende Auftrag (ein Antennenteil gefunden) und das Fest bleiben nach dem Neuladen');
  else fail(`Speichern v30 (Gemeinsam): ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // Migration v16 → v30: noch kein Auftrag, kein Fest
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v16 → v30', {
    init: () => {
      const s = {
        version: 16,
        time: { day: 3, minute: 300 },
        player: { x: 2, z: 3, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [{ id: 50, type: 'bolzen', i: -12, j: -2, turns: 0, level: 2, parts: ['fernrohr'] }] },
        recipes: {},
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const m = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, q: window.zomfy.state().quests, feast: window.zomfy.state().feast, turm: window.zomfy.buildings().find((b) => b.type === 'bolzen') }));
  if (m.v === 30 && m.q && m.q.active === null && m.q.done.length === 0 && m.feast === 0 && m.turm?.parts?.join() === 'fernrohr') note('✓ Migration: Spielstand v16 wird zu v30 – noch kein Nebenauftrag, kein Fest, der Turm behält sein Fernrohr');
  else fail(`Migration v16 → v30: ${JSON.stringify(m)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M24 (nur der Kern): Nach zwei gewonnenen Nächten liegt die Moderlocke im
 * Reiter »Fallen«; sie passt nur auf einen Zulauf am Waldrand. In der Nacht
 * darauf kommt in jeder Welle mehr Horde über diesen Spawn (auch im Nachtplan),
 * die mehr Beute trägt; hält die Nacht, wird die Locke zur Fundkiste. Eine
 * makellose Nacht bringt einen Bonus, nach drei in Folge hat Balduin einen
 * Schatz dabei; ein Treffer am Zuhause bricht die Serie. Gespartes Schrott
 * wächst über Nacht – nach einem Durchbruch nicht. Speichern v30 und Migration
 * v17 → v30 (Bilder: moderlocke, bericht-wagnis).
 */
async function runRiskChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Wagnis und Vorrat (M24)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m24')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m24', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const quiet = () => z(() => (window.zomfy.game.hud.toasts.length = 0));
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut', 'championHinweis', 'turmteilHinweis', 'lockeHinweis']) Z.setFlag(f);
    Z.setWeather('klar', true);
    Z.setHorde(false);
    Z.setDay(3);
    Z.setTime(19, 50);
    Z.give({ holz: 200, stein: 40, schrott: 400, zahnraeder: 20, teile: 60, fasern: 20 });
  });

  // 1) Die Locke kommt nach zwei gewonnenen Nächten; sie passt nur auf einen Zulauf am Waldrand
  const locke = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const vorher = g.builder.tabs().includes('fallen') ? g.builder.options('fallen').map((o) => o.id) : [];
    g.state.stats.nightsWon = 2;
    const nachher = g.builder.options('fallen').map((o) => o.id);
    const col = Z.pathColumn(-44);
    const j = col.find((jj) => Z.lureEntryAt(-43.5, jj + 0.5) === 'mitte' && Z.placeCheck('moderlocke', -44, jj).ok);
    const hinten = Z.placeCheck('moderlocke', -12, Z.pathColumn(-12)[1]).reason;
    const neben = Z.placeCheck('moderlocke', -44, Math.min(...col) - 2).reason;
    const bau = j !== undefined ? Z.build('moderlocke', -44, j) : 'kein Feld';
    Z.teleport(-42.5, (j ?? 0) + 2, 0);
    g.buildbar.tabId = 'fallen'; // die Kachel wird gezeichnet (Kosten in Zombieteilen)
    return { vorher, nachher, j, hinten, neben, bau, lure: Z.risk().lure };
  });
  await step(200);
  const plan = await z(() => {
    const g = window.zomfy.game;
    const p = g.nights.planFor(g.state.time.day);
    return { lure: p.lure, extra: p.waves.map((w) => w.spawns.filter((s) => s.lure && s.entry === 'mitte').length), view: g.nights.planView()?.lure || null };
  });
  await quiet();
  await step(100);
  await page.screenshot({ path: join(SHOTS, 'moderlocke.png') });
  note('  Screenshot: screenshots/moderlocke.png');
  if (!locke.vorher.includes('moderlocke') && locke.nachher[0] === 'moderlocke' && locke.bau === 'ok' && locke.hinten === 'locke' && locke.neben === 'nurWeg' && locke.lure === 'mitte' && plan.lure === 'mitte' && plan.extra.every((n) => n >= 2) && plan.view === 'mitte') {
    note(`✓ Moderlocke (M24): nach zwei gewonnenen Nächten im Reiter »Fallen«, nur auf einem Zulauf am Waldrand (hinter dem Zusammenfluss: »${locke.hinten}«) – jede Welle bringt mehr über den Mittelweg (${plan.extra.join(', ')}), der Nachtplan sagt es an`);
  } else fail(`Moderlocke: ${JSON.stringify({ locke, plan })}`);

  // 2) In der Nacht: Wer über den gelockten Weg kommt, trägt mehr Beute; gehalten → Fundkiste
  const nacht = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.setTime(20, 30);
    g.nights.enabled = true;
    return g.state.inventory.schrott;
  });
  let gelockt = null;
  for (let k = 0; k < 40 && !gelockt; k++) {
    await step(500);
    gelockt = await z(() => {
      const g = window.zomfy.game;
      const plain = g.horde.list.find((q) => q.entry?.name === 'sued' || q.entry?.name === 'nord');
      const lured = g.horde.list.find((q) => q.entry?.name === 'mitte');
      return lured ? { lured: +lured.lootFactor.toFixed(2), plain: plain ? +plain.lootFactor.toFixed(2) : null } : null;
    });
  }
  const kiste = await z((j) => {
    const Z = window.zomfy;
    const g = Z.game;
    g.nights.enabled = false;
    g.state.inventory.schrott = 200;
    Z.endNight(true);
    const k = g.loot.items.filter((it) => it.res === 'kiste' && Math.abs(it.x + 43.5) < 1 && Math.abs(it.z - (j + 0.5)) < 1).length;
    return { k, lockeDa: Z.buildings().some((b) => b.type === 'moderlocke'), report: g.state.report?.risk || null, schrott: g.state.inventory.schrott, streak: g.state.risk.streak };
  }, locke.j);
  if (gelockt && gelockt.lured > (gelockt.plain ?? 1) * 1.5 - 0.01 && kiste.k === 1 && !kiste.lockeDa && kiste.report?.lure?.chest && kiste.report.lure.entry === 'mitte') note(`✓ Moderlocke (M24): Über den Mittelweg trägt die Horde ×${gelockt.lured} Beute (sonst ×${gelockt.plain ?? 1}); die Nacht gehalten – aus der Locke wird eine Fundkiste`);
  else fail(`Moderlocke in der Nacht: ${JSON.stringify({ gelockt, kiste })}`);

  // 3) Makellose Nacht und Vorratskammer: +Bonus, Serie 1, 6 % Zinsen (höchstens 12)
  if (kiste.report?.flawless && kiste.report.streak === 1 && kiste.streak === 1 && kiste.report.interest === 12 && kiste.schrott === 200 + 12 + 12) note('✓ Makellose Nacht (M24): niemand im Lager, das Zuhause heil – 12 Schrott und 4 Zombieteile, Serie 1; die Vorratskammer legt 12 Schrott dazu');
  else fail(`Makellose Nacht und Zinsen: ${JSON.stringify(kiste)}`);
  await z(() => window.zomfy.game.showReport());
  await step(600);
  await page.screenshot({ path: join(SHOTS, 'bericht-wagnis.png') });
  note('  Screenshot: screenshots/bericht-wagnis.png');
  await z(() => {
    const g = window.zomfy.game;
    g.report.report = null;
    g.state.report = null;
    const bc = g.state.blueprintChoice;
    if (bc) g.chooseBlueprint(bc.options[0]);
    g.mode = 'play';
  });

  // 4) Serie: zwei weitere makellose Nächte – Balduins Schatz; ein Treffer am Zuhause bricht die Serie
  const schatz = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const out = {};
    for (const d of [4, 5]) {
      Z.setDay(d);
      Z.endNight(true);
    }
    out.treasure = g.state.risk.treasure;
    out.streak = g.state.risk.streak;
    Z.setDay(6);
    Z.setTime(9, 0);
    out.offers = Z.trader().offers;
    const teile = g.state.inventory.teile;
    const unique = () => ['stricknadel', 'mondstein'].reduce((a, id) => a + (g.state.towerParts[id] || 0), 0);
    const u0 = unique();
    out.ok = Z.trade('schatz');
    out.teile = teile - g.state.inventory.teile;
    out.plus = unique() - u0;
    out.after = g.state.risk.treasure;
    // Treffer am Zuhause in Nacht 6: keine makellose Nacht, Serie auf 0
    g.nights.beginNight(6);
    g.state.risk.streak = 2;
    g.onHouseHit(5, { x: 5, z: -4, day: false });
    Z.endNight(true);
    out.nachTreffer = { streak: g.state.risk.streak, flawless: g.state.report?.risk?.flawless };
    // Durchbruch in Nacht 7: keine Zinsen
    Z.setDay(7);
    g.nights.beginNight(7);
    g.state.night.breach = { at: 100, gate: true };
    g.state.inventory.schrott = 200;
    Z.endNight(true);
    out.durchbruch = { interest: g.state.report?.risk?.interest, schrott: g.state.inventory.schrott };
    return out;
  });
  if (schatz.treasure && schatz.streak === 0 && schatz.offers.includes('schatz') && schatz.ok && schatz.teile === 14 && schatz.plus === 1 && !schatz.after && schatz.nachTreffer.streak === 0 && !schatz.nachTreffer.flawless && schatz.durchbruch.interest === 0 && schatz.durchbruch.schrott === 200) {
    note('✓ Serie (M24): drei makellose Nächte – Balduins Schatz (14 Zombieteile, ein einzigartiges Turmteil); ein Treffer am Zuhause bricht die Serie, nach einem Durchbruch wächst kein Schrott');
  } else fail(`Serie, Schatz, Durchbruch: ${JSON.stringify(schatz)}`);

  // 5) Tote Optionen belebt (M24): Pfanne durchschlägt Panzer, Bank gibt Schlagkraft, Holzlager baut morgens auf
  const optionen = await z(async () => {
    const { weaponStats } = await import('./src/data/weapons.js');
    const Z = window.zomfy;
    const g = Z.game;
    g.horde.clear();
    Z.setTime(22, 0);
    g.nights.beginNight(g.state.time.day);
    const p = g.player.position;
    const hit = (weapon) => {
      Z.giveWeapon(weapon);
      g.selectSlot(g.state.hotbar.slots.indexOf(weapon), false);
      const id = Z.spawnZombie('brummer', p.x + 1.0, p.z);
      const q = g.horde.list.find((o) => o.id === id);
      q.stunT = 99;
      const before = q.hp;
      g.player.facing = Math.PI / 2;
      g.combat.hit(weapon, weaponStats(weapon, g.state));
      const dealt = before - q.hp;
      g.horde.clear();
      return dealt;
    };
    const out = {};
    out.pfanne = hit('pfanne');
    out.schaufel = hit('schaufel');
    g.benchReady = 0;
    g.useBench();
    out.schaufelBank = hit('schaufel');
    out.buff = g.benchBuff > g.clock;
    Z.endNight(true);
    // Holzlager: eine zerschlagene Barrikade steht am nächsten Morgen wieder
    let lager = 'kein Platz';
    for (const [i, j] of [[6, 5], [8, 5], [6, 7], [2, 7]]) {
      if (Z.placeCheck('holzlager', i, j).ok) {
        lager = Z.build('holzlager', i, j);
        break;
      }
    }
    const col = Z.pathColumn(-12);
    Z.build('barrikade', -12, col[1]);
    const bar = Z.buildings().find((b) => b.type === 'barrikade' && b.i === -12 && b.j === col[1]);
    Z.hitBarricade(bar.id, 999);
    g.advanceToMorning();
    const nachher = g.world.buildings.get(bar.id);
    out.lager = lager;
    out.wieder = nachher ? !nachher.broken : false;
    out.zeile = (g.state.report?.extra || []).map((l) => l.text).find((t) => t.startsWith('Aus dem Holzlager')) || null;
    g.report.report = null;
    g.state.report = null;
    const bc = g.state.blueprintChoice;
    if (bc) g.chooseBlueprint(bc.options[0]);
    g.mode = 'play';
    return out;
  });
  if (optionen.pfanne >= 30 && optionen.schaufel < 16 && optionen.schaufelBank > optionen.schaufel && optionen.buff && optionen.lager === 'ok' && optionen.wieder && optionen.zeile) {
    note(`✓ Tote Optionen (M24): Die Pfanne durchschlägt den Panzer des Brummers (${optionen.pfanne} statt ${optionen.schaufel} mit der Schaufel), nach der Bank schlägt Mika fester (${optionen.schaufelBank}); das Holzlager baut morgens eine Barrikade wieder auf – »${optionen.zeile}«`);
  } else fail(`Tote Optionen: ${JSON.stringify(optionen)}`);

  // 6) Speichern v30: Serie und Schatz bleiben
  await z(() => {
    const Z = window.zomfy;
    Z.game.state.risk = { streak: 2, treasure: true };
    Z.save();
  });
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z(() => {
    window.__zomfyHold = true;
    const s = window.zomfy.state();
    return { v: s.version, risk: s.risk };
  });
  if (geladen.v === 30 && geladen.risk?.streak === 2 && geladen.risk.treasure === true) note('✓ Speichern v30: die Serie makelloser Nächte und Balduins Schatz bleiben nach dem Neuladen');
  else fail(`Speichern v30 (Wagnis): ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // Migration v17 → v30: keine Serie, kein Schatz
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v17 → v30', {
    init: () => {
      const s = {
        version: 17,
        time: { day: 3, minute: 300 },
        player: { x: 2, z: 3, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [] },
        quests: { active: null, done: ['garn'] },
        feast: 0,
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const m = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, risk: window.zomfy.state().risk, quests: window.zomfy.state().quests }));
  if (m.v === 30 && m.risk?.streak === 0 && m.risk.treasure === false && m.quests.done.join() === 'garn') note('✓ Migration: Spielstand v17 wird zu v30 – noch keine Serie, kein Schatz, erledigte Aufträge bleiben');
  else fail(`Migration v17 → v30: ${JSON.stringify(m)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M25 (nur der Kern): Ein Herbst hat 30 Tage – die Uhr zählt mit, die letzten
 * Tage zählen herunter. In der Frostnacht (Nacht 30) kommt jede Welle über alle
 * Wege, das Moderherz führt schon die zweite an; unter zwei Dritteln ruft es die Horde
 * über alle Wege, unter einem Drittel kommt der Frost (Schnee fällt). Fällt das
 * Herz, zerfällt die Horde, die Nacht ist gehalten, der erste Frost ist da:
 * Schnee am Morgen, der Moder glimmt nicht mehr. Nach dem Morgenbericht (echte
 * Taste) läuft der Abspann, danach die Wahl (echte Tasten): weiterspielen –
 * Nacht 31 würfelt sich neu. Speichern v30, neue Runde, Migration v18 → v30
 * (Bilder: finale, abspann, schnee).
 */
async function runFinaleChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Ein Herbst mit Ende (M25)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m25')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m25', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(60);
  };
  const quiet = () => z(() => (window.zomfy.game.hud.toasts.length = 0));
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut', 'championHinweis', 'turmteilHinweis', 'lockeHinweis']) Z.setFlag(f);
    Z.setWeather(null, true);
    Z.setHorde(false);
    Z.give({ holz: 200, stein: 40, schrott: 300, zahnraeder: 10, teile: 40 });
  });

  // 1) Kalender: »Tag 12 von 30«, ab Tag 25 zählen die Nächte herunter; die Frostnacht im Plan
  const kalender = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.setDay(12);
    const p30 = g.nights.planFor(30);
    const spawns = p30.waves.flatMap((w) => w.spawns);
    return {
      label: g.autumn.dayLabel(12),
      count: g.autumn.morningLine(27),
      finale: p30.finale,
      alle: p30.waves.every((w) => w.entries.length === 3),
      herz: spawns.filter((s) => s.type === 'moderherz').length,
      zweite: p30.waves[1].spawns.some((s) => s.type === 'moderherz'), // es ist langsam: aus der letzten Welle käme es nie an
      vorher: g.nights.planFor(29).finale,
    };
  });
  if (kalender.label === 'Tag 12 von 30' && kalender.count === 'Noch 3 Nächte bis zum ersten Frost.' && kalender.finale && kalender.alle && kalender.herz === 1 && kalender.zweite && !kalender.vorher) {
    note(`✓ Herbst (M25): Die Uhr zeigt »${kalender.label}«, ab Tag 25 zählen die Nächte herunter (»${kalender.count}«); in der Frostnacht kommt jede Welle über alle drei Wege, das Moderherz führt schon die zweite an`);
  } else fail(`Kalender und Frostnacht: ${JSON.stringify(kalender)}`);

  // 2) Frostnacht: Das Herz ruft die Horde über alle Wege, dann kommt der Frost; fällt es, zerfällt die Horde
  await z(() => {
    const Z = window.zomfy;
    Z.setDay(30);
    Z.setTime(20, 29);
    Z.game.nights.enabled = true;
  });
  await step(1500);
  const herz = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    g.nights.enabled = false; // die Wellen warten, solange geprüft wird
    g.horde.clear();
    g.nights.queue.length = 0;
    const col = Z.pathColumn(-14);
    const id = Z.spawnHeart(-15, col[Math.floor(col.length / 2)] + 0.5);
    g.horde.list.find((q) => q.id === id).speed = 0;
    Z.teleport(-9.5, 4, 0);
    return { id, n: g.state.night.n, finale: Boolean(g.nights.plan?.finale), view: Z.autumn() };
  });
  await step(300);
  const phasen = await z((id) => {
    const Z = window.zomfy;
    const g = Z.game;
    const h = g.horde.list.find((q) => q.id === id);
    h.hp = h.maxHp * 0.6;
    return true;
  }, herz.id);
  await step(300);
  const ruf = await z(() => {
    const g = window.zomfy.game;
    return { phase: window.zomfy.autumn().heart?.phase, wege: [...new Set(g.horde.list.filter((q) => q.type === 'schwaermer' && q.state !== 'dying').map((q) => q.entry?.name))].sort() };
  });
  await z((id) => {
    const h = window.zomfy.game.horde.list.find((q) => q.id === id);
    h.hp = h.maxHp * 0.3;
  }, herz.id);
  await step(3000);
  const frost = await z(() => ({ phase: window.zomfy.autumn().heart?.phase, frostNow: window.zomfy.autumn().frostNow, wetter: window.zomfy.game.world.weather.kind, bar: window.zomfy.game.hud.bossShown?.name || null }));
  await quiet();
  await step(100);
  await page.screenshot({ path: join(SHOTS, 'finale.png') });
  note('  Screenshot: screenshots/finale.png');
  await z((id) => {
    const Z = window.zomfy;
    Z.game.nights.enabled = true;
    Z.killZombie(id, 'turm');
  }, herz.id);
  await step(1500);
  const gefallen = await z(() => {
    const g = window.zomfy.game;
    return { alive: g.horde.list.filter((q) => q.state !== 'dying').length, done: g.state.night.done, won: g.state.night.won, finale: g.state.report?.finale || null, frost: g.state.autumn.frost };
  });
  if (herz.n === 30 && herz.finale && ruf.phase === 2 && ruf.wege.join() === 'mitte,nord,sued' && frost.phase === 3 && frost.frostNow && frost.wetter === 'schnee' && frost.bar === 'Das Moderherz' && gefallen.alive === 0 && gefallen.done && gefallen.won && gefallen.finale?.heart && gefallen.frost === 30) {
    note('✓ Frostnacht (M25): Unter zwei Dritteln ruft das Moderherz die Horde über alle drei Wege, unter einem Drittel kommt der Frost (es schneit); fällt es, zerfällt die Horde – die Nacht ist gehalten, der erste Frost ist da');
  } else fail(`Frostnacht: ${JSON.stringify({ herz, ruf, frost, gefallen })}`);

  // 3) Der Morgen danach: Schnee, der Moder schläft; der Bericht (echte Taste), dann der Abspann
  await z(() => {
    const g = window.zomfy.game;
    g.advanceToMorning();
    window.zomfy.setTime(9, 0);
    g.showReport();
  });
  await step(800);
  const morgen = await z(() => {
    const g = window.zomfy.game;
    return { mode: g.mode, zeilen: g.report.isOpen ? g.report.lines().map((l) => l.text).filter(Boolean) : [], wetter: g.world.weather.kind, moder: g.world.moderFactor }; // ohne die Sternenzeile (M25, Teil 2)
  });
  await tap('Enter');
  await step(3000);
  const abspann = await z(() => ({ mode: window.zomfy.game.mode, lines: window.zomfy.autumn().abspann?.lines || [] }));
  await page.screenshot({ path: join(SHOTS, 'abspann.png') });
  note('  Screenshot: screenshots/abspann.png');
  await tap('Escape');
  await step(300);
  const dialog = await z(() => ({ mode: window.zomfy.game.mode, credits: window.zomfy.autumn().credits }));
  for (let k = 0; k < 16; k++) {
    if ((await z(() => window.zomfy.game.mode)) !== 'dialog') break;
    await tap('Enter');
    await step(400);
  }
  const wahl = await z(() => ({ mode: window.zomfy.game.mode, autumn: window.zomfy.autumn() }));
  if (morgen.mode === 'report' && morgen.zeilen[0]?.startsWith('Das Moderherz ist gefallen') && morgen.wetter === 'schnee' && morgen.moder === 0 && abspann.mode === 'abspann' && abspann.lines.includes('Danke fürs Spielen!') && dialog.mode === 'dialog' && dialog.credits && wahl.mode === 'play' && wahl.autumn.mode === 'weiter') {
    note(`✓ Nach dem Frost (M25): Schnee am Morgen, der Moder glimmt nicht mehr; der Bericht beginnt mit »${morgen.zeilen[0]}«, nach Enter läuft der Abspann (${abspann.lines.length} Zeilen), Esc führt zur Wahl – Enter nimmt »Hierbleiben«`);
  } else fail(`Nach dem Frost: ${JSON.stringify({ morgen, abspann, dialog, wahl })}`);

  // Die verschneite Bucht am Vormittag (ohne die Bauplan-Wahl der gewonnenen Nacht davor)
  await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    for (let k = 0; k < 4 && g.state.blueprintChoice; k++) g.chooseBlueprint(g.state.blueprintChoice.options[0]);
    g.mode = 'play';
    Z.setTime(10, 0);
    Z.teleport(-2, 3, 0);
  });
  await step(4000);
  await quiet();
  await step(100);
  await page.screenshot({ path: join(SHOTS, 'schnee.png') });
  note('  Screenshot: screenshots/schnee.png');

  // 4) Weiterspielen: Nacht 31 würfelt sich neu (kein Herz, neue Arten und Wege)
  const weiter = await z(() => {
    const g = window.zomfy.game;
    const p = g.nights.planFor(31);
    const spawns = p.waves.flatMap((w) => w.spawns);
    return { rogue: p.rogue, finale: p.finale, herz: spawns.some((s) => s.type === 'moderherz'), wege: p.waves.map((w) => w.entries.length), arten: [...new Set(spawns.map((s) => s.type))].length, label: g.autumn.dayLabel(31) };
  });
  if (weiter.rogue && !weiter.finale && !weiter.herz && weiter.arten >= 5 && weiter.label === 'Tag 31') note(`✓ Weiterspielen (M25): Nacht 31 würfelt sich neu – ${weiter.arten} Arten, Wege je Welle ${weiter.wege.join('/')}; die Uhr zeigt nur noch »${weiter.label}«`);
  else fail(`Weiterspielen: ${JSON.stringify(weiter)}`);

  // 5) Speichern v30: Frost, Wahl und Abspann bleiben; eine neue Runde beginnt wieder bei Tag 1
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z(() => {
    window.__zomfyHold = true;
    const s = window.zomfy.state();
    return { v: s.version, autumn: s.autumn };
  });
  const runde = await z(() => {
    const g = window.zomfy.game;
    const name = g.state.player.name;
    g.autumn.choose('neu');
    return { day: g.state.time.day, frost: g.state.autumn.frost, name: g.state.player.name === name };
  });
  if (geladen.v === 30 && geladen.autumn?.frost === 30 && geladen.autumn.mode === 'weiter' && geladen.autumn.credits && runde.day === 1 && runde.frost === null && runde.name) note('✓ Speichern v30: der erste Frost, »weiterspielen« und der gesehene Abspann bleiben; eine neue Runde beginnt wieder bei Tag 1 (der Name bleibt)');
  else fail(`Speichern v30 und neue Runde: ${JSON.stringify({ geladen, runde })}`);
  checkMessages(session);
  await session.context.close();

  // Migration v18 → v30: noch kein Frost – auch nach Tag 30 kommt die Frostnacht noch
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v18 → v30', {
    init: () => {
      const s = {
        version: 18,
        time: { day: 33, minute: 300 },
        player: { x: 2, z: 3, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [] },
        risk: { streak: 1, treasure: false },
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const m = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, autumn: window.zomfy.state().autumn, risk: window.zomfy.state().risk, finale: window.zomfy.game.nights.planFor(33).finale }));
  if (m.v === 30 && m.autumn?.frost === null && m.autumn.mode === 'herbst' && m.risk.streak === 1 && m.finale) note('✓ Migration: Spielstand v18 wird zu v30 – noch kein Frost; wer schon über Tag 30 ist, bekommt die Frostnacht in der nächsten Nacht');
  else fail(`Migration v18 → v30: ${JSON.stringify(m)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * Herbstbuch (M25, Teil 2): Sterne im Morgenbericht (N ruft abends die erste
 * Welle – mutig; niemand im Lager, das Zuhause heil – makellos), gelungene
 * Taten mit Meldung, nach drei Taten der erste Herbstschmuck im Reiter
 * »Schmuck« (Tab, Q, Mausklick), das Herbstbuch im Pausenmenü mit echten
 * Tasten (Esc, S, E, D/A blättern): Taten, Schlurferkunde mit Dr. Yusufs
 * Notiz, Turmalbum mit dem Turm der Nacht; Speichern v30 und Migration
 * v19 → v30 (Bilder: sterne, herbstbuch, schlurferkunde, schmuck).
 */
async function runBookChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Herbstbuch (M25, Teil 2)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m25b')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m25b', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(60);
  };
  const quiet = () => z(() => (window.zomfy.game.hud.toasts.length = 0));
  const turmId = await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut', 'championHinweis', 'turmteilHinweis', 'lockeHinweis']) Z.setFlag(f);
    Z.setWeather('klar', true);
    Z.setHorde(false);
    Z.setDay(2);
    Z.setTime(19, 50);
    Z.give({ holz: 200, stein: 40, schrott: 300, zahnraeder: 10, teile: 40, fasern: 30 });
    for (const [i, j] of [[2, 3], [3, 3], [1, 3], [2, 2], [3, 5]]) if (Z.placeCheck('bolzen', i, j).ok && Z.build('bolzen', i, j) === 'ok') break;
    return Z.buildings().find((b) => b.type === 'bolzen')?.id ?? null;
  });

  // 1) Sterne: N ruft abends die erste Welle (mutig), die Nacht bleibt makellos – drei Sterne im Bericht
  await z(() => {
    window.zomfy.game.nights.enabled = true;
    window.zomfy.teleport(1.5, 5.5, 0);
  });
  await step(200);
  await tap('KeyN');
  const nacht = await z((id) => {
    const Z = window.zomfy;
    const g = Z.game;
    g.nights.enabled = false;
    const called = g.state.night.called || 0;
    // ein Schlurfer von Hand (Schlurferkunde), der Bolzenwerfer ist Turm der Nacht (Turmalbum)
    const zid = Z.spawnZombie('schlurfer', 1.5, 7, null);
    Z.killZombie(zid, 'spieler');
    const b = g.world.buildings.get(id);
    if (b) b.kills = 5;
    g.state.night.towers = { [id]: 5 };
    Z.endNight(true);
    g.showReport();
    return { called, n: g.state.report?.n, stars: g.state.report?.stars || null };
  }, turmId);
  await step(600);
  await page.screenshot({ path: join(SHOTS, 'sterne.png') });
  note('  Screenshot: screenshots/sterne.png');
  const bericht = await z(() => ({ zeile: window.zomfyView().bericht?.[0] || '', book: window.zomfy.book(), meldungen: window.zomfy.game.hud.toasts.map((t) => t.text) }));
  if (nacht.called === 1 && nacht.stars?.every(Boolean) && bericht.zeile === 'Sterne: Gehalten, Makellos, Mutig' && bericht.book.stars[nacht.n] === 3 && bericht.book.done === 2 && bericht.meldungen.some((t) => t.includes('„Drei Sterne“ geschafft'))) {
    note(`✓ Sterne (M25): N ruft abends die erste Welle, niemand kommt ins Lager – der Bericht beginnt mit »${bericht.zeile}«; das Herbstbuch trägt „Die erste Nacht“ und „Drei Sterne“ ein`);
  } else fail(`Sterne im Bericht: ${JSON.stringify({ nacht, bericht })}`);
  await tap('KeyE');
  await step(300);
  await z(() => {
    const g = window.zomfy.game;
    const bc = g.state.blueprintChoice;
    if (bc) g.chooseBlueprint(bc.options[0]);
    g.mode = 'play';
  });

  // 2) Die dritte Tat bringt den ersten Herbstschmuck: der Reiter »Schmuck« erscheint
  await quiet();
  const tat = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const vorher = g.builder.tabs().includes('schmuck');
    g.state.book.called = 10;
    const neu = Z.bookCheck();
    return { vorher, neu, tabs: g.builder.tabs(), deco: Z.book().deco, meldungen: g.hud.toasts.map((t) => t.text) };
  });
  if (!tat.vorher && tat.neu.join() === 'mutig' && tat.tabs.includes('schmuck') && tat.deco.join() === 'kuerbis' && tat.meldungen.some((t) => t.startsWith('Neuer Herbstschmuck: Kürbis'))) {
    note(`✓ Taten (M25): „Wer wagt …“ (zehn Wellen früh gerufen) ist die dritte Tat – »${tat.meldungen.find((t) => t.startsWith('Neuer'))}«`);
  } else fail(`Dritte Tat und Herbstschmuck: ${JSON.stringify(tat)}`);

  // 3) Kürbis aufstellen mit echten Tasten: Tab bis »Schmuck«, Q, Mausklick aufs Feld
  await z(() => {
    const Z = window.zomfy;
    Z.setTime(10, 0);
    Z.teleport(1.5, 5.5, 0);
    Z.game.funk.clear(); // N4: Eddas Funk-Feld (unten rechts) läge sonst über dem Feld – der Klick schlösse nur ihre Meldung
  });
  await step(300);
  for (let k = 0; k < 8 && (await z(() => window.zomfy.game.buildbar.tab)) !== 'schmuck'; k++) await tap('Tab');
  const reiter = await z(() => ({ tab: window.zomfy.game.buildbar.tab, kacheln: window.zomfy.buildbarLayout().tiles.map((t) => t.id) }));
  await tap('KeyQ');
  const feld = await z(() => {
    for (const [i, j] of [[3, 6], [2, 6], [4, 6], [0, 6], [4, 4]]) if (window.zomfy.placeCheck('kuerbis', i, j).ok) return { i, j };
    return null;
  });
  let gesetzt = null;
  if (feld) {
    const pos = await z(({ i, j }) => window.zomfy.screenOf(i + 0.5, 0, j + 0.5), feld);
    await page.mouse.move(pos.x, pos.y);
    await step(100);
    await z(() => window.zomfy.game.funk.clear()); // N4: eine neue Funk-Zeile (Ziel, Tipp) läge sonst wieder über dem Feld
    await page.mouse.move(pos.x + 1, pos.y);
    await step(50);
    await page.mouse.click(pos.x, pos.y);
    await step(200);
    gesetzt = (await z(() => window.zomfy.buildings())).find((b) => b.type === 'kuerbis') || null;
    await page.mouse.click(pos.x, pos.y, { button: 'right' });
    await step(100);
  }
  if (reiter.tab === 'schmuck' && reiter.kacheln.join() === 'kuerbis' && feld && gesetzt && gesetzt.i === feld.i && gesetzt.j === feld.j) note(`✓ Herbstschmuck (M25): Tab führt zum Reiter »Schmuck«, Q und ein Mausklick stellen den Kürbis aufs Feld (${feld.i}, ${feld.j})`);
  else fail(`Herbstschmuck aufstellen: ${JSON.stringify({ reiter, feld, gesetzt })}`);

  // Bild: der ganze Herbstschmuck in der Dämmerung, nah (die Kürbislaternen leuchten)
  const bild = await z((f) => {
    const Z = window.zomfy;
    const out = [];
    for (const [type, i, j] of [['kuerbislaterne', f.i + 1, f.j], ['regentonne', f.i - 1, f.j], ['laubhaufen', f.i - 1, f.j + 2], ['kuerbislaterne', f.i + 2, f.j + 1]]) out.push(Z.build(type, i, j));
    Z.setTime(19, 40);
    Z.teleport(f.i + 3.5, f.j + 2.5, 0);
    return out;
  }, feld || { i: 3, j: 6 });
  await tap('KeyZ'); // nah heran
  await step(1500);
  await quiet();
  await z(() => (window.zomfy.game.hud.speech = null));
  await step(100);
  await page.screenshot({ path: join(SHOTS, 'schmuck.png') });
  note(`  Screenshot: screenshots/schmuck.png (${bild.join(', ')})`);
  await tap('KeyZ'); // wieder weit

  // 4) Herbstbuch im Pausenmenü mit echten Tasten: Esc, S bis »Herbstbuch«, E; D und A blättern
  await z(() => {
    window.zomfy.setSurvivor('yusuf', 2); // Dr. Yusuf ist da und schreibt mit
    window.zomfy.setTime(11, 0);
  });
  await step(300);
  // Esc bricht erst eine Auswahl in der Bauleiste ab, dann öffnet es das Menü
  for (let k = 0; k < 3 && (await z(() => window.zomfy.game.mode)) !== 'menu'; k++) await tap('Escape');
  const zeilen = await z(() => window.zomfy.game.menu.buttons().map((b) => b.label));
  for (let k = 0; k < zeilen.indexOf('Herbstbuch'); k++) await tap('KeyS');
  await tap('KeyE');
  await step(200);
  const seite = () =>
    z(() => {
      const g = window.zomfy.game;
      const L = g.menu.layout(g.ui);
      return { screen: g.menu.screen, page: g.menu.page, count: L.book?.count || '', rows: L.buttons.filter((b) => b.row).map((b) => `${b.row.label}|${b.row.right}`), detail: (L.book?.detail || []).map((l) => l.text), h: L.h };
    });
  const taten = await seite();
  await page.screenshot({ path: join(SHOTS, 'herbstbuch.png') });
  note('  Screenshot: screenshots/herbstbuch.png');
  await tap('KeyD');
  await step(100);
  const kunde = await seite();
  await page.screenshot({ path: join(SHOTS, 'schlurferkunde.png') });
  note('  Screenshot: screenshots/schlurferkunde.png');
  await tap('KeyD');
  await step(100);
  const album = await seite();
  await tap('KeyA');
  await step(100);
  const zurueck = await seite();
  await tap('Escape');
  await tap('Escape');
  await step(100);
  const zu = await z(() => window.zomfy.game.mode);
  const ok =
    taten.screen === 'buch' &&
    taten.page === 'taten' &&
    taten.count === '3 von 12 Taten · 3 Sterne' &&
    taten.rows.length === 12 &&
    taten.rows[0].startsWith('Die erste Nacht|Tag ') &&
    taten.rows[3] === 'Volles Lager|0/3' &&
    taten.detail.some((l) => l.startsWith('Noch 3 Taten bis zum nächsten Herbstschmuck: Laubhaufen')) &&
    kunde.page === 'kunde' &&
    kunde.count === '1 von 16 Arten erledigt' &&
    kunde.rows[0] === 'Schlurfer|1' &&
    kunde.rows[1] === '???|' &&
    kunde.detail.some((l) => l.startsWith('Dr. Yusuf: „')) &&
    album.page === 'album' &&
    album.rows.length === 1 &&
    album.rows[0].endsWith('|5') &&
    album.detail.includes('einmal Turm der Nacht') &&
    zurueck.page === 'kunde' &&
    taten.h === kunde.h &&
    taten.h <= 330 &&
    zu === 'play';
  if (ok) note(`✓ Herbstbuch (M25): Esc, S, E öffnen es – „${taten.count}“; D blättert zur Schlurferkunde („${kunde.count}“, Dr. Yusufs Notiz) und zum Turmalbum (${album.rows[0].split('|')[0]}, einmal Turm der Nacht), A zurück (${taten.h} Zeilen hoch)`);
  else fail(`Herbstbuch: ${JSON.stringify({ taten, kunde, album, zurueck, zu })}`);

  // 5) Speichern v30: Sterne, Taten, Arten, gerufene Wellen, der Turm der Nacht und der Schmuck bleiben
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z(() => {
    window.__zomfyHold = true;
    const s = window.zomfy.state();
    const turm = s.world.buildings.find((b) => b.type === 'bolzen');
    return { v: s.version, book: s.book, best: turm?.best || 0, schmuck: s.world.buildings.filter((b) => ['kuerbis', 'kuerbislaterne', 'regentonne', 'laubhaufen'].includes(b.type)).length, tabs: window.zomfy.game.builder.tabs() };
  });
  if (geladen.v === 30 && geladen.book.stars[nacht.n] === 3 && Object.keys(geladen.book.deeds).length === 3 && geladen.book.kinds.schlurfer === 1 && geladen.book.called === 10 && geladen.best === 1 && geladen.schmuck >= 4 && geladen.tabs.includes('schmuck')) note(`✓ Speichern v30: Sterne, Taten, Schlurferkunde, gerufene Wellen, der Turm der Nacht und ${geladen.schmuck} Stück Herbstschmuck bleiben nach dem Neuladen`);
  else fail(`Speichern v30 (Herbstbuch): ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // Migration v19 → v30: Das Buch beginnt leer; was der Stand schon erfüllt, trägt es leise ein
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v19 → v30', {
    init: () => {
      const s = {
        version: 19,
        time: { day: 6, minute: 600 },
        player: { x: 2, z: 3, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [] },
        stats: { nightsWon: 4, kills: 80 },
        autumn: { frost: null, mode: 'herbst', credits: false },
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const m = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, book: window.zomfy.book(), meldungen: window.zomfy.game.hud.toasts.map((t) => t.text) }));
  if (m.v === 30 && m.book.total === 0 && m.book.done === 1 && m.book.deeds.ersteNacht === 6 && Object.keys(m.book.kinds).length === 0 && !m.meldungen.some((t) => t.startsWith('Herbstbuch'))) note('✓ Migration: Spielstand v19 wird zu v30 – das Herbstbuch beginnt ohne Sterne und Arten; „Die erste Nacht“ steht still schon drin');
  else fail(`Migration v19 → v30: ${JSON.stringify(m)}`);
  checkMessages(alt);
  await alt.context.close();
}

const syntaxOk = checkSyntax();
if (!syntaxOk) process.exit(1);
if (!args.has('--syntax')) {
  await runBrowserChecks();
  console.log('');
  if (problems.length) {
    console.log(`Prüfung fehlgeschlagen: ${problems.length} Problem(e).`);
    process.exit(1);
  }
  console.log('Prüfung bestanden.');
}

/**
 * M26: Wucht und Schliff – die Rückmeldungs-Tabelle ist gestaffelt, ein echter
 * Schlag stoppt kurz und stößt die Kamera, große Momente wackeln in ganzen
 * Pixeln und klingen ab, »Wackeln: aus« hält still, im Trefferstopp zittert das
 * Bild weiter, die Zeitlupe bremst die Welt; Bauten federn beim Aufsetzen und
 * stehen danach wieder genau; die Horde hält über das Raster Abstand; Treffer
 * klingen nie gleich; die Shader sind vorübersetzt; Bildzeiten mit vielen
 * Schlurfern (p95/p99). Bilder: einstellungen, baugeist.
 */
async function runFeelChecks(browser, url) {
  const { FEEL, SHAKE_LEVELS } = await import('../src/data/feel.js');
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Wucht und Schliff (M26)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m26')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m26', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);

  // 1) Die Tabelle: jedes Ereignis mit gültigen Werten, nach Wucht gestaffelt
  const events = Object.entries(FEEL);
  const valid = events.every(([, f]) => (f.stop ?? 0) >= 0 && (f.stop ?? 0) <= 0.3 && (f.trauma ?? 0) >= 0 && (f.trauma ?? 0) <= 1 && (f.slow ?? 0) <= 1);
  const graded = FEEL.schlag.stop < FEEL.schlagSchwer.stop && FEEL.schlagSchwer.stop < FEEL.herzFaellt.stop && FEEL.schlag.trauma < FEEL.schlagSchwer.trauma && FEEL.schlagSchwer.trauma < FEEL.bossSchlag.trauma && FEEL.bossSchlag.trauma < FEEL.durchbruch.trauma && FEEL.durchbruch.trauma <= FEEL.herzFaellt.trauma;
  if (valid && graded && SHAKE_LEVELS.aus === 0) note(`✓ Wucht: Rückmeldungs-Tabelle mit ${events.length} Ereignissen, gestaffelt (Stopp ${FEEL.schlag.stop * 1000}/${FEEL.schlagSchwer.stop * 1000}/${FEEL.herzFaellt.stop * 1000} ms)`);
  else fail(`Wucht: Tabelle ungültig oder nicht gestaffelt (${JSON.stringify(FEEL)})`);

  // 2) Vorübersetzte Shader
  const pre = await page
    .waitForFunction(() => window.zomfy.feel().precompiled, null, { timeout: 90000 })
    .then(() => z(() => window.zomfy.feel().precompileMs))
    .catch(() => null);
  if (pre !== null) note(`✓ Wucht: alle Shader beim Start vorübersetzt (${pre} ms)`);
  else fail('Wucht: Shader nicht vorübersetzt');

  // 3) Ein echter Schlag: Klick auf einen Schlurfer – Trefferstopp, Stoß, Rückmeldung
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'werkbankGebaut']) Z.setFlag(f);
    Z.quietChoices();
    Z.setHorde(false);
    Z.setWeather('klar', true);
    Z.setTime(10, 0);
    Z.give({ holz: 200, stein: 100, schrott: 400, fasern: 20, zahnraeder: 10 });
    Z.teleport(0.5, 2.5, 0);
  });
  await step(300);
  await z(() => window.zomfy.spawnZombie('brummer', 0.5, 3.7));
  const t = await z(() => window.zomfy.screenOf(0.5, 0, 3.7));
  await page.mouse.move(t.x, t.y);
  await step(34);
  await page.mouse.down();
  await step(34);
  await page.mouse.up();
  let hit = null;
  for (let k = 0; k < 20 && !hit; k++) {
    await step(34);
    const f = await z(() => window.zomfy.feel());
    if (f.log.some((e) => e === 'schlag' || e === 'abschuss' || e === 'schlagSchwer')) hit = f;
  }
  if (hit && hit.trauma > 0) note(`✓ Wucht: echter Klick trifft – Rückmeldung »${hit.log[hit.log.length - 1]}«, Trauma ${hit.trauma}, Stoß ${hit.kick.join('/')}`);
  else fail(`Wucht: Schlag ohne Rückmeldung (${JSON.stringify(hit)})`);
  await z(() => window.zomfy.killAllZombies());
  await step(1500);

  // 4) Großes Wackeln in ganzen Pixeln, klingt ab; »aus« hält still; »halb« halbiert
  const wobble = async (level) => {
    return z((lv) => {
      const Z = window.zomfy;
      Z.game.applySettings({ shake: lv });
      window.__zomfyStep(1500);
      Z.feelEvent('durchbruch');
      const offs = [];
      for (let k = 0; k < 45; k++) {
        window.__zomfyStep(34);
        offs.push(Z.feel().offset);
      }
      const max = Math.max(...offs.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))));
      const whole = offs.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y));
      const end = offs[offs.length - 1];
      return { max, whole, end: end.join(','), scale: Z.feel().shakeScale };
    }, level);
  };
  const voll = await wobble('voll');
  const aus = await wobble('aus');
  const halb = await wobble('halb');
  await z(() => window.zomfy.game.applySettings({ shake: 'voll' }));
  if (voll.max >= 3 && voll.max <= 12 && voll.whole && voll.end === '0,0') note(`✓ Wucht: Tor fällt – Wackeln bis ${voll.max} px in ganzen Pixeln, danach steht das Bild`);
  else fail(`Wucht: Wackeln ${JSON.stringify(voll)}`);
  if (aus.max === 0 && halb.scale === 0.5) note('✓ Wucht: Einstellung »Wackeln: aus« hält das Bild still, »halb« halbiert');
  else fail(`Wucht: Wackeln aus ${JSON.stringify(aus)}, halb ${JSON.stringify(halb)}`);
  const saved = await z(() => JSON.parse(localStorage.getItem('zomfy-towers.einstellungen') || '{}').shake);
  if (saved === 'voll') note('✓ Wucht: Wackeln steht in den Einstellungen (eigener Speicherplatz)');
  else fail(`Wucht: Einstellung Wackeln gespeichert als ${saved}`);

  // 5) Trefferstopp mit Zittern, dann Zeitlupe (das Herz fällt)
  const finale = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    window.__zomfyStep(1500);
    Z.feelEvent('herzFaellt');
    const offs = new Set();
    let frozen = 0;
    for (let k = 0; k < 6; k++) {
      window.__zomfyStep(34);
      const f = Z.feel();
      if (f.hitstop > 0) {
        frozen++;
        offs.add(f.offset.join(','));
      }
    }
    while (g.hitstop > 0) window.__zomfyStep(34);
    const h0 = g.horde.time;
    window.__zomfyStep(10 * 34);
    const slowRate = (g.horde.time - h0) / (10 / 30);
    window.__zomfyStep(1500);
    const h1 = g.horde.time;
    window.__zomfyStep(10 * 34);
    const normalRate = (g.horde.time - h1) / (10 / 30);
    return { frozen, offsets: offs.size, slowRate: +slowRate.toFixed(2), normalRate: +normalRate.toFixed(2) };
  });
  if (finale.frozen >= 4 && finale.offsets >= 2 && finale.slowRate < 0.5 && finale.normalRate > 0.9) note(`✓ Wucht: Das Herz fällt – ${finale.frozen} Bilder Trefferstopp mit Zittern, danach Zeitlupe (×${finale.slowRate})`);
  else fail(`Wucht: Trefferstopp/Zeitlupe ${JSON.stringify(finale)}`);

  // 6) Bauen mit Schwung: gestaucht, federt über, steht danach genau
  const pop = await z(() => {
    const Z = window.zomfy;
    for (const i of [-12, -14, -10, -16]) {
      const col = Z.pathColumn(i);
      if (!col.length) continue;
      const j = Math.min(...col) - 1;
      if (Z.build('bolzen', i, j) !== 'ok') continue;
      const b = Z.buildings().find((q) => q.type === 'bolzen' && q.i === i && q.j === j);
      const s0 = Z.buildScale(b.id);
      window.__zomfyStep(100);
      const s1 = Z.buildScale(b.id);
      window.__zomfyStep(700);
      const s2 = Z.buildScale(b.id);
      return { s0, s1, s2 };
    }
    return null;
  });
  if (pop && pop.s0.y < 0.9 && pop.s1.y > 1.02 && pop.s2.y === 1 && pop.s2.x === 1 && !pop.s2.popping) note(`✓ Wucht: Ein Turm setzt gestaucht auf (${pop.s0.y}), federt über (${pop.s1.y}) und steht dann genau`);
  else fail(`Wucht: Bauen mit Schwung ${JSON.stringify(pop)}`);

  // 7) Abstandhalten über das Raster: 80 auf einem Fleck laufen auseinander
  const sep = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    g.horde.clear();
    Z.setHorde(true);
    const col = Z.pathColumn(-20);
    const zc = col[Math.floor(col.length / 2)] + 0.5;
    for (let k = 0; k < 80; k++) {
      const id = Z.spawnZombie(k % 10 === 0 ? 'brummer' : 'schlurfer', -20.5 + (k % 3) * 0.01, zc + (k % 5) * 0.01);
      const q = g.horde.list.find((o) => o.id === id);
      q.stunT = 999;
    }
    const t0 = performance.now();
    for (let k = 0; k < 90; k++) g.horde.separate(1 / 30);
    const ms = (performance.now() - t0) / 90;
    const L = g.horde.list.filter((o) => o.state !== 'dying');
    let worst = 1;
    for (let a = 0; a < L.length; a++) {
      for (let b = a + 1; b < L.length; b++) {
        const d = Math.hypot(L[a].x - L[b].x, L[a].z - L[b].z);
        worst = Math.min(worst, d / ((L[a].def.radius + L[b].def.radius) * 0.9));
      }
    }
    g.horde.clear();
    Z.setHorde(false);
    return { n: L.length, worst: +worst.toFixed(2), ms: +ms.toFixed(3) };
  });
  if (sep.n === 80 && sep.worst >= 0.8) note(`✓ Wucht: Abstandhalten über das Raster – 80 Schlurfer auf einem Fleck laufen auseinander (enger als 80 % keiner, ${sep.ms} ms je Schritt)`);
  else fail(`Wucht: Abstandhalten ${JSON.stringify(sep)}`);

  // 8) Klang: kein Treffer wie der vorige (echte Taste weckt den Klang)
  await page.keyboard.press('ArrowLeft');
  await step(100);
  const rates = [];
  for (let k = 0; k < 6; k++) {
    rates.push(await z(() => {
      window.zomfy.game.sound.play('treffer');
      return window.zomfy.feel().sound?.rate ?? null;
    }));
    await page.waitForTimeout(60);
  }
  const klick = await z(() => {
    window.zomfy.game.sound.play('klick');
    return window.zomfy.feel().sound?.rate ?? null;
  });
  const distinct = new Set(rates.map((r) => r?.toFixed(4))).size;
  if (rates.every((r) => r !== null && r >= 0.95 && r <= 1.05) && distinct >= 4 && klick === 1) note(`✓ Wucht: Treffer klingen gestreut (${rates.map((r) => r.toFixed(3)).join(', ')}), der Klick immer gleich`);
  else fail(`Wucht: Klangstreuung ${JSON.stringify({ rates, klick })}`);

  // 9) Blitze sanft: der Laternenblitz flammt schwächer auf
  const blitz = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const boost = () => {
      g.player.flashT = 0.2;
      window.__zomfyStep(34);
      return g.world.lanternLight.boost;
    };
    const voll = boost();
    g.applySettings({ flashes: 'sanft' });
    const sanft = boost();
    g.applySettings({ flashes: 'voll' });
    return { voll: +voll.toFixed(2), sanft: +sanft.toFixed(2) };
  });
  if (blitz.sanft > 1 && blitz.sanft - 1 < (blitz.voll - 1) / 2) note(`✓ Wucht: »Blitze: sanft« – der Laternenblitz flammt schwächer auf (${blitz.sanft} statt ${blitz.voll})`);
  else fail(`Wucht: Blitze ${JSON.stringify(blitz)}`);

  // 10) Bilder: Baugeist mit ✗ auf dem Weg (echte Taste, Maus), Einstellungen
  await z(() => {
    const Z = window.zomfy;
    Z.teleport(-13, 2, 0);
  });
  await step(600);
  await page.keyboard.press('KeyQ');
  await step(200);
  const weg = await z(() => {
    const Z = window.zomfy;
    const col = Z.pathColumn(-13);
    return Z.screenOf(-12.5, 0, col[Math.floor(col.length / 2)] + 0.5);
  });
  await page.mouse.move(weg.x, weg.y);
  await step(200);
  const rot = await z(() => ({ ok: window.zomfy.game.builder.placement?.ok, reason: window.zomfy.game.builder.placement?.reason }));
  await page.screenshot({ path: join(SHOTS, 'baugeist.png') });
  note('  Screenshot: screenshots/baugeist.png');
  if (rot.ok === false && rot.reason === 'aufWeg') note('✓ Wucht: Baugeist auf dem Weg zeigt ✗ und den Grund');
  else fail(`Wucht: Baugeist auf dem Weg ${JSON.stringify(rot)}`);
  await page.keyboard.press('Escape');
  await step(100);
  await page.keyboard.press('Escape');
  await step(100);
  await z(() => window.zomfy.game.menu.go('settings'));
  await step(100);
  const rows = await z(() => window.zomfy.game.menu.buttons().map((b) => b.label));
  await page.screenshot({ path: join(SHOTS, 'einstellungen.png') });
  note('  Screenshot: screenshots/einstellungen.png');
  if (rows.some((r) => r.startsWith('Wackeln')) && rows.some((r) => r.startsWith('Blitze'))) note('✓ Wucht: Einstellungen zeigen Wackeln und Blitze');
  else fail(`Wucht: Einstellungen ${JSON.stringify(rows)}`);
  await page.keyboard.press('Escape');
  await step(100);

  // 11) Bildzeiten mit vielen Schlurfern (Headless mit Software-WebGL: nur grobe Anhaltspunkte)
  const perf = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.setHorde(true);
    Z.setTime(21, 0);
    for (const e of ['nord', 'mitte', 'sued']) {
      Z.spawnAtEntry('schlurfer', e, 70);
      Z.spawnAtEntry('flitzer', e, 20);
    }
    window.__zomfyStep(3000);
    const s = Z.perfSample(90, 3);
    g.horde.clear();
    Z.setHorde(false);
    return s;
  });
  note(`  Bildzeiten mit ${perf.alive} Schlurfern: Simulation p50 ${perf.sim.p50} / p95 ${perf.sim.p95} / p99 ${perf.sim.p99} ms, Zeichnen p50 ${perf.draw.p50} / p95 ${perf.draw.p95} ms (Software-WebGL)`);
  if (perf.alive >= 100 && perf.sim.p99 < 60) note('✓ Wucht: Simulation bleibt auch mit vielen Schlurfern unter 60 ms (p99)');
  else fail(`Wucht: Bildzeiten ${JSON.stringify(perf)}`);

  checkMessages(session);
  await session.context.close();
}

/**
 * M27: Gäste und Plätze – der Plan der Ankünfte steht im Spielstand (Tage 7–24,
 * nie Bossnacht oder Festmorgen), ein Wanderer kommt am Tag seines Plans an,
 * mit echter Taste angesprochen übernachtet er am Feuer (Schlafsack), am Morgen
 * danach fragt er: »Bleib bei uns« zieht in einen freien Platz, »Weiterbringen«
 * schickt ihn mit Proviant fort, zwei, drei Tage später kommt ein Brief; sind alle
 * Plätze belegt, bietet der Wanderer, der am längsten da ist, an zu gehen; die
 * Schlafhütte gibt zwei Plätze (erst ab Zuhause-Stufe 3); die Fähigkeiten wirken
 * (Hannes flickt, Greta stellt Fallen, Lotte vergrößert die Lichtinseln, Clara
 * flickt Türme billiger); Speichern v30 und Migration v20 → v30.
 * Bilder: gaeste, gast-dialog, schlafhuette.
 */
async function runGuestChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Gäste und Plätze (M27)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m27')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m27', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(80);
  };
  // Mit echter Taste ansprechen: neben die Figur stellen, E drücken
  const talk = async (id) => {
    const p = await z((i) => window.zomfy.npcPos(i), id);
    await z(([x, zz]) => window.zomfy.teleport(x, zz + 1.0, Math.PI), [p.x, p.z]);
    await step(300);
    await tap('KeyE');
    await step(100);
    return z(() => window.zomfy.dialogInfo().open);
  };
  // Dialog mit echten Tasten bis zu den Antworten durchklicken, dann die Antwort `pick` wählen
  const answer = async (pick) => {
    for (let k = 0; k < 12; k++) {
      const d = await z(() => window.zomfy.dialogInfo?.() || null);
      if (!d || !d.open) return false;
      if (d.answers?.length) {
        // Erst die Zeile fertig tippen lassen und die Sperre der Antworten abwarten – sonst
        // macht der erste Druck nur die Zeile ganz, und die Sperre schluckt das E
        for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
        await step(400);
        const c = await z(() => window.zomfy.dialogInfo());
        const i = c.answers.findIndex((a) => a.aktion === pick || a.t === pick);
        if (i < 0) return false;
        for (let s = 0; s < Math.abs(i - c.choice); s++) await tap(i > c.choice ? 'KeyS' : 'KeyW');
        await tap('KeyE');
        return true;
      }
      await tap('KeyE');
    }
    return false;
  };

  const start = await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'werkbankGebaut', 'blitzHinweis']) Z.setFlag(f);
    Z.setHorde(false);
    Z.setWeather('klar', true);
    return Z.guests();
  });
  const plan = start.plan;
  const days = plan.map((p) => p.day);
  const okDays = days.every((d, i) => d >= 7 && d <= 24 && d % 5 !== 0 && d % 5 !== 1 && (i === 0 || d > days[i - 1] + 1));
  if (plan.length >= 4 && okDays) note(`✓ Gäste: Ankünfte aus dem Startwert – ${plan.map((p) => `${p.name} (Tag ${p.day})`).join(', ')}`);
  else fail(`Gäste: Plan ${JSON.stringify(plan)}`);

  // 1) Der erste Wanderer kommt an seinem Tag an
  const first = plan[0];
  await z((d) => {
    const Z = window.zomfy;
    Z.setDay(d - 1);
    Z.setTime(22, 0);
    Z.give({ holz: 120, stein: 40, stoff: 20, schrott: 60, fasern: 20 });
  }, first.day);
  const arrived = await z((id) => {
    const Z = window.zomfy;
    Z.nextMorning();
    window.__zomfyStep(500);
    return Z.guests().people[id];
  }, first.id);
  if (arrived?.stage === 1) note(`✓ Gäste: ${first.name} kommt an Tag ${first.day} an`);
  else fail(`Gäste: Ankunft ${JSON.stringify(arrived)}`);

  // 2) Ansprechen mit echter Taste: Gast am Feuer, Schlafsack liegt dort
  const opened = await talk(first.id);
  for (let k = 0; k < 24 && (await z(() => window.zomfy.dialogInfo().open)); k++) await tap('KeyE'); // M29: längere Dialoge der Wanderer
  await step(1500);
  const guest = await z((id) => ({ p: window.zomfy.guests().people[id], bedrolls: window.zomfy.guests().bedrolls }), first.id);
  // Fürs Bild ans Feuer: der Gast auf seinem Platz, der Schlafsack dahinter
  const seat = await z((id) => {
    window.zomfy.game.survivors.placeAll(true); // nicht erst hinlaufen lassen
    return window.zomfy.npcPos(id);
  }, first.id);
  await z(([x, zz]) => window.zomfy.teleport(x + 1.4, zz + 1.6, Math.PI), [seat.x, seat.z]);
  await step(800);
  await page.screenshot({ path: join(SHOTS, 'gaeste.png') });
  note('  Screenshot: screenshots/gaeste.png');
  if (opened && guest.p?.stage === 2 && guest.bedrolls >= 1) note(`✓ Gäste: E spricht ${first.name} an – übernachtet am Feuer (Schlafsack liegt)`);
  else fail(`Gäste: Gast am Feuer ${JSON.stringify({ opened, guest })}`);

  // 3) Am nächsten Morgen: »Bleib bei uns« zieht ins freie Zelt
  const tent = await z(() => {
    const Z = window.zomfy;
    let at = null;
    for (const [i, j] of [[3, 5], [-4, 6], [5, 6], [-3, 7], [1, 7], [6, 3]]) {
      if (Z.placeCheck('zelt', i, j).ok && Z.build('zelt', i, j) === 'ok') {
        at = [i, j];
        break;
      }
    }
    Z.setTime(22, 0);
    Z.nextMorning();
    window.__zomfyStep(500);
    return at;
  });
  if (!tent) fail('Gäste: kein Platz für ein Zelt gefunden');
  await talk(first.id);
  for (let k = 0; k < 6; k++) {
    const d = await z(() => window.zomfy.dialogInfo());
    if (!d.open || d.answers.length) break;
    await tap('KeyE');
  }
  // Fürs Bild die Zeile samt Antworten ganz zeigen (die Wahl bleibt bei der harmlosen Antwort)
  for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
  await step(400);
  const dlg = await z(() => window.zomfy.dialogInfo());
  await page.screenshot({ path: join(SHOTS, 'gast-dialog.png') });
  note('  Screenshot: screenshots/gast-dialog.png');
  const stay = await answer('bleiben');
  const moved = await z((id) => window.zomfy.guests().people[id], first.id);
  if (stay && moved?.stage === 3 && moved.tent !== null) note(`✓ Gäste: am Morgen »Bleib bei uns« – ${first.name} zieht ins Zelt (vorgewählt war »${dlg?.answers?.[dlg.choice]?.t}«)`);
  else fail(`Gäste: Bleiben ${JSON.stringify({ stay, moved, dlg })}`);

  // 4) Der zweite: alle Plätze voll → Weiterbringen; zwei, drei Tage später ein Brief
  const second = plan[1];
  await z((d) => {
    const Z = window.zomfy;
    Z.setDay(d - 1);
    Z.setTime(22, 0);
    Z.nextMorning();
  }, second.day);
  await talk(second.id);
  for (let k = 0; k < 24 && (await z(() => window.zomfy.dialogInfo().open)); k++) await tap('KeyE'); // M29: längere Dialoge der Wanderer
  await step(800); // die Sperre nach dem Dialog (Durchdrücken öffnet nicht gleich wieder) verstreichen lassen
  await z(() => {
    const Z = window.zomfy;
    Z.setTime(22, 0);
    Z.nextMorning();
  });
  await talk(second.id);
  for (let k = 0; k < 6; k++) {
    const d = await z(() => window.zomfy.dialogInfo());
    if (!d.open || d.answers.length) break;
    await tap('KeyE');
  }
  const full = await z(() => window.zomfy.dialogInfo());
  const offer = full?.answers?.some((a) => a.aktion === 'platzMachen');
  const noStay = !full?.answers?.some((a) => a.aktion === 'bleiben');
  const fwd = await answer('weiterbringen');
  await step(3000);
  const gone = await z((id) => ({ p: window.zomfy.guests().people[id], visible: window.zomfy.guests().visible[id] }), second.id);
  if (fwd && noStay && offer && gone.p?.stage === 4) note(`✓ Gäste: alle Plätze belegt – kein »Bleib«, ${first.name} würde Platz machen; »Weiterbringen« schickt ${second.name} mit Proviant fort`);
  else fail(`Gäste: Weiterbringen ${JSON.stringify({ fwd, noStay, offer, gone, answers: full?.answers })}`);
  const letter = await z(() => {
    const Z = window.zomfy;
    const lines = [];
    for (let k = 0; k < 3; k++) {
      Z.setTime(22, 0);
      lines.push(...Z.nextMorning().map((l) => l.text));
    }
    return lines.filter((t) => t.includes('Brief von')); // M32: der Brief liegt im Briefkasten
  });
  if (letter.length === 1) note(`✓ Gäste: Ein Brief kommt – »${letter[0]}«`);
  else fail(`Gäste: Brief ${JSON.stringify(letter)}`);

  // 5) Schlafhütte: erst ab Zuhause-Stufe 3, dann zwei Plätze
  const hut = await z(() => {
    const Z = window.zomfy;
    const before = Z.buildOptionsFor('einrichten').find((o) => o.id === 'schlafhuette');
    Z.setHouseLevel(3);
    const after = Z.buildOptionsFor('einrichten').find((o) => o.id === 'schlafhuette');
    let built = null;
    for (const [i, j] of [[-4, 6], [-2, 7], [4, 7], [6, 5]]) if (Z.placeCheck('schlafhuette', i, j).ok && Z.build('schlafhuette', i, j) === 'ok') { built = [i, j]; break; }
    return { before: before?.disabled, after: after?.disabled, built, free: Z.guests().free };
  });
  if (hut.before === true && hut.after === false && hut.built && hut.free === 2) note('✓ Gäste: Schlafhütte erst ab Zuhause-Stufe 3, gebaut – zwei Plätze frei');
  else fail(`Gäste: Schlafhütte ${JSON.stringify(hut)}`);
  await z(() => {
    const Z = window.zomfy;
    const b = Z.buildings().find((q) => q.type === 'schlafhuette');
    Z.teleport(b.i + 3.4, b.j + 2.4, Math.PI); // seitlich, damit Mika die Hütte nicht verdeckt
    Z.setTime(21, 30);
    Z.game.hud.speech = null; // der Abschied von eben gehört nicht ins Bild
  });
  await step(600);
  await page.screenshot({ path: join(SHOTS, 'schlafhuette.png') });
  note('  Screenshot: screenshots/schlafhuette.png');

  // 6) Fähigkeiten: Hannes flickt, Greta stellt Fallen, Lotte macht Lichtinseln größer, Clara flickt Türme billiger
  const abil = await z(() => {
    const Z = window.zomfy;
    const out = {};
    for (const id of ['hannes', 'greta', 'lotte', 'clara']) Z.setSurvivor(id, 3);
    out.scale = Z.game.world.lightPools.scale;
    const col = Z.pathColumn(-12);
    Z.build('barrikade', -12, col[0]);
    const bar = Z.buildings().find((q) => q.type === 'barrikade');
    Z.hitBarricade(bar.id, 10);
    const hp0 = Z.buildings().find((q) => q.id === bar.id).hp;
    Z.setTime(22, 0);
    const lines = Z.nextMorning().map((l) => l.text);
    out.hp = [hp0, Z.buildings().find((q) => q.id === bar.id).hp];
    out.lines = lines.filter((t) => t.startsWith('Hannes') || t.startsWith('Greta'));
    return out;
  });
  if (abil.scale > 1.2 && abil.hp[1] > abil.hp[0] && abil.lines.some((t) => t.startsWith('Hannes'))) note(`✓ Gäste: Fähigkeiten wirken – Lichtinseln ×${abil.scale}, Hannes flickt die Barrikade (${abil.hp[0]} → ${abil.hp[1]})`);
  else fail(`Gäste: Fähigkeiten ${JSON.stringify(abil)}`);

  // 7) Speichern v30 und Laden
  const saved = await z(() => {
    window.zomfy.save();
    const raw = JSON.parse(localStorage.getItem('zomfy-towers.spielstand'));
    return { version: raw.version, plan: raw.guests?.plan?.length, hannes: raw.survivors?.hannes?.stage };
  });
  if (saved.version === 30 && saved.plan >= 4) note('✓ Gäste: Speichern v30 mit Ankunftsplan und Wanderern');
  else fail(`Gäste: Speichern ${JSON.stringify(saved)}`);
  checkMessages(session);
  await session.context.close();

  // 8) Migration v20 → v30: alter Stand an Tag 14 – Ankünfte erst ab Tag 15, alle Wanderer noch unterwegs
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Gäste: Migration v20 → v30', {
    init: () => {
      const s = {
        version: 20,
        time: { day: 14, minute: 600 },
        player: { x: 2, z: 3, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [] },
        stats: { nightsWon: 12, kills: 400 },
        book: { stars: {}, deeds: {}, kinds: {}, called: 0 },
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const mig = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, g: window.zomfy.guests() }));
  const migOk = mig.v === 30 && mig.g.plan.length >= 3 && mig.g.plan.every((p) => p.day >= 15) && ['hannes', 'clara', 'lotte', 'greta'].every((id) => mig.g.people[id]?.stage === 0);
  if (migOk) note(`✓ Gäste: Migration v20 → v30 – ein Stand an Tag 14 bekommt Ankünfte ab Tag 15 (${mig.g.plan.map((p) => p.day).join(', ')})`);
  else fail(`Gäste: Migration ${JSON.stringify(mig)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M28 (Abschnitt `karten`): Kartenabend »Letzte Runde«. Regeln im Simulator
 * (Startspieler, Farben, Remis, die KI sieht nur den Tisch), die Einladung bei Bert
 * mit echten Tasten, seine Erklärung, eine Karte offen (A/D, 2, E) und eine verdeckt
 * (3, Q), die KI zieht mit Bedenkzeit, der Abend endet mit dem Einsatz (Berts
 * Grinsekürbis auf dem Kaminsims) und einer Wettschuld am Morgen; Menschenkunde im
 * Herbstbuch; bei Regen am Kamin; Speichern v30 und Migration v21 → v30.
 * Bilder: kartenabend, kartentisch, kartensieg, kartenabend-kamin, menschenkunde.
 */
async function runCardChecks(browser, url) {
  const T_DUTY = { spuelen: 'spült ab', holz: 'hackt das Holz', fruehstueck: 'macht Frühstück', knopf: 'bürstet Knopf', tee: 'kocht den Tee' };
  // 1) Regeln und Fairness im Simulator (ohne Browser)
  const sim = await import(pathToFileURL(join(ROOT, 'tools/karten.mjs')).href);
  const t0 = Date.now();
  const lines = [];
  const fails = sim.runChecks(1200, (l) => lines.push(l));
  if (!fails.length) note(`✓ Karten: Regeln im Simulator fair – ${lines[0].replace(/^Stufe 1: /, 'Stufe 1 ')}; ${lines.find((l) => l.startsWith('Tischansicht'))} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  else fail(`Karten (Simulator): ${fails.join(' · ')}`);

  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Kartenabend (M28)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m28')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m28', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(80);
  };
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'werkbankGebaut', 'blitzHinweis']) Z.setFlag(f);
    Z.setHorde(false);
    Z.setWeather('klar', true);
    Z.setDay(3);
    Z.setSurvivor('bert', 3);
    Z.setTime(18, 30);
  });
  await step(300);

  // 2) Bert einladen – mit echten Tasten
  const b = await z(() => window.zomfy.npcPos('bert'));
  await z(([x, zz]) => window.zomfy.teleport(x, zz + 1.0, Math.PI), [b.x, b.z]);
  await step(300);
  await tap('KeyE');
  let offered = false;
  for (let k = 0; k < 8; k++) {
    const d = await z(() => window.zomfy.dialogInfo());
    if (!d.open) break;
    if (d.answers?.length) {
      // Erst fertig tippen lassen und die Sperre der Antworten abwarten (sonst schluckt sie das E)
      for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
      await step(400);
      const c = await z(() => window.zomfy.dialogInfo());
      const i = c.answers.findIndex((a) => a.aktion === 'karten');
      offered = i >= 0;
      if (offered) {
        for (let s = 0; s < Math.abs(i - c.choice); s++) await tap(i > c.choice ? 'KeyS' : 'KeyW');
        await tap('KeyE');
      }
      break;
    }
    await tap('KeyE');
  }
  // Bert erklärt das Spiel (sechs Zeilen), dann wird ausgeteilt
  const erklaert = await z(() => window.zomfy.dialogInfo()?.open && window.zomfy.game.dialog.lines.length);
  for (let k = 0; k < 14; k++) {
    const d = await z(() => window.zomfy.dialogInfo());
    if (!d.open) break;
    await tap('KeyE');
  }
  await step(2500);
  const start = await z(() => window.zomfy.cards());
  await page.screenshot({ path: join(SHOTS, 'kartenabend.png') });
  note('  Screenshot: screenshots/kartenabend.png');
  if (offered && erklaert >= 6 && start.mode === 'karten' && start.match?.id === 'bert' && start.match.spot === 'feuer' && start.view?.hand.length === 5) note(`✓ Karten: Bert bietet abends eine Runde an (echte Taste), erklärt das Spiel (${erklaert} Zeilen) – der Tisch steht am Feuer, fünf Karten auf der Hand`);
  else fail(`Karten: Einladung ${JSON.stringify({ offered, erklaert, mode: start.mode, match: start.match, hand: start.view?.hand?.length })}`);

  // 3) Eine Karte offen an den Kessel (A/D, 2, E), die KI antwortet mit Bedenkzeit
  const waitMine = async () => {
    for (let k = 0; k < 40; k++) {
      const c = await z(() => window.zomfy.cards().match);
      if (c?.myTurn) return true;
      await step(250);
    }
    return false;
  };
  const mine1 = await waitMine();
  await tap('KeyD');
  await tap('Digit2');
  await tap('KeyE');
  await step(600);
  const after1 = await z(() => window.zomfy.cards());
  const laid = after1.view?.places[1].mine.cards.length === 1 && after1.view.places[1].mine.cards[0].hidden === false;
  await step(3500);
  const opp = await z(() => window.zomfy.cards());
  const oppLaid = opp.view.places.reduce((a, p) => a + p.theirs.cards.length, 0);
  if (mine1 && laid && after1.view.hand.length === 5 && oppLaid >= 1) note(`✓ Karten: D, 2, E legen eine Karte offen an den Kessel (Hand wieder 5), Bert antwortet nach Bedenkzeit (${oppLaid} Karte drüben)`);
  else fail(`Karten: Zug ${JSON.stringify({ mine1, laid, hand: after1.view?.hand?.length, oppLaid, line: opp.line })}`);

  // 4) Eine Karte verdeckt an den Kürbis (3, Q)
  const mine2 = await waitMine();
  await tap('Digit3');
  await tap('KeyQ');
  await step(600);
  const after2 = await z(() => window.zomfy.cards());
  const hidden = after2.view?.places[2].mine.cards.some((c) => c.hidden);
  await step(2500);
  await page.screenshot({ path: join(SHOTS, 'kartentisch.png') });
  note('  Screenshot: screenshots/kartentisch.png');
  if (mine2 && hidden) note('✓ Karten: 3 und Q legen eine Karte verdeckt an den Kürbis – nur Mika sieht ihren Wert');
  else fail(`Karten: verdeckt ${JSON.stringify({ mine2, places: after2.view?.places })}`);

  // 5) Den Abend gewinnen: zwei Partien, dazwischen ein echtes E – Einsatz, Wettschuld
  const minute0 = await z(() => window.zomfy.state().time.minute);
  await z(() => window.zomfy.cardFinish(0));
  await step(3000);
  await tap('KeyE');
  await step(2500);
  const second = await z(() => window.zomfy.cards().match);
  await z(() => window.zomfy.cardFinish(0));
  await step(3000);
  const result = await z(() => window.zomfy.cards());
  await page.screenshot({ path: join(SHOTS, 'kartensieg.png') });
  note('  Screenshot: screenshots/kartensieg.png');
  await tap('KeyE');
  await step(800);
  const back = await z(() => ({ mode: window.zomfy.game.mode, minute: window.zomfy.state().time.minute, cards: window.zomfy.state().cards, shelf: Object.values(window.zomfy.game.world.shelfItems || {}).filter((o) => o.visible).length }));
  const won = result.match?.result?.won && result.match.result.reward.stake === 'grinsekuerbis';
  // Die Uhr stand am Tisch; danach sind 50 Minuten vergangen (plus die 0,8 s danach im Spiel)
  const elapsed = back.minute - minute0;
  if (second?.gameNo === 2 && won && back.mode === 'play' && elapsed >= 50 && elapsed < 56 && back.cards.stakes.includes('grinsekuerbis') && back.cards.duty?.who === 'bert' && back.shelf === 1) {
    note(`✓ Karten: Abend 2 : 0 gewonnen (E zwischen den Partien) – Berts Grinsekürbis steht auf dem Kaminsims, Bert ${T_DUTY[back.cards.duty.what] || back.cards.duty.what}, danach 50 Minuten später`);
  } else fail(`Karten: Abend ${JSON.stringify({ second, result: result.match?.result, elapsed, back })}`);

  // 6) Am Morgen: die Wettschuld im Bericht; nur ein Abend je Tag
  const heute = await z(() => window.zomfy.cards().blocked.bert);
  const morgen = await z(() => {
    const Z = window.zomfy;
    Z.setTime(22, 0);
    return Z.nextMorning().map((l) => l.text).filter((t) => t.startsWith('Wettschuld'));
  });
  if (heute === 'heute' && morgen.length === 1) note(`✓ Karten: nur ein Abend je Tag; am Morgen: »${morgen[0]}«`);
  else fail(`Karten: Morgen ${JSON.stringify({ heute, morgen })}`);

  // 7) Menschenkunde im Herbstbuch
  await z(() => {
    const g = window.zomfy.game;
    const p = g.state.cards.people.bert;
    p.tell = [3, 3];
    p.noted = true;
    g.menu.open?.();
    g.mode = 'menu';
    g.menu.go('buch');
    g.menu.page = 'menschen';
    g.menu.bookCache = null;
  });
  await step(300);
  const buch = await z(() => window.zomfy.game.menu.bookData().rows.map((r) => ({ label: r.label, right: r.right, detail: r.detail.map((d) => d.text).join(' ') })));
  await page.screenshot({ path: join(SHOTS, 'menschenkunde.png') });
  note('  Screenshot: screenshots/menschenkunde.png');
  await z(() => {
    const g = window.zomfy.game;
    g.menu.close?.();
    g.mode = 'play';
  });
  if (buch.length === 1 && buch[0].detail.includes('gewonnen 1') && buch[0].detail.includes('reibt sich die Hände')) note(`✓ Karten: Herbstbuch »Menschenkunde« – ${buch[0].label} (${buch[0].right}), ein Abend gewonnen, Verdacht notiert`);
  else fail(`Karten: Menschenkunde ${JSON.stringify(buch)}`);

  // 8) Bei Regen am Kamin
  const kamin = await z(() => {
    const Z = window.zomfy;
    Z.setWeather('regen', true);
    Z.setTime(18, 40);
    Z.game.state.cards.lastDay = -1;
    const ok = Z.cardBegin('bert');
    return { ok, spot: Z.cards().match?.spot };
  });
  for (let k = 0; k < 8; k++) {
    const d = await z(() => window.zomfy.dialogInfo());
    if (!d.open) break;
    await tap('KeyE');
  }
  await step(2500);
  const drinnen = await z(() => ({ inside: window.zomfy.game.viewInside, mode: window.zomfy.game.mode }));
  await page.screenshot({ path: join(SHOTS, 'kartenabend-kamin.png') });
  note('  Screenshot: screenshots/kartenabend-kamin.png');
  await z(() => window.zomfy.cardClose(true));
  await step(300);
  if (kamin.ok && kamin.spot === 'kamin' && drinnen.inside && drinnen.mode === 'karten') note('✓ Karten: bei Regen steht der Tisch drinnen am Kamin');
  else fail(`Karten: Kamin ${JSON.stringify({ kamin, drinnen })}`);

  // 9) Speichern v30
  const saved = await z(() => {
    window.zomfy.save();
    const raw = JSON.parse(localStorage.getItem('zomfy-towers.spielstand'));
    return { v: raw.version, stakes: raw.cards?.stakes, evenings: raw.cards?.evenings };
  });
  if (saved.v === 30 && saved.stakes?.includes('grinsekuerbis') && saved.evenings === 2) note('✓ Karten: Speichern v30 mit Einsätzen und Abenden');
  else fail(`Karten: Speichern ${JSON.stringify(saved)}`);
  checkMessages(session);
  await session.context.close();

  // 10) Migration v21 → v30
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Karten: Migration v21 → v30', {
    init: () => {
      const s = {
        version: 21,
        time: { day: 5, minute: 600 },
        player: { x: 2, z: 3, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [] },
        guests: { plan: [] },
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const mig = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, cards: window.zomfy.state().cards }));
  if (mig.v === 30 && mig.cards?.evenings === 0 && mig.cards.back === 'laub') note('✓ Karten: Migration v21 → v30 – noch kein Abend, Rückseite Herbstlaub');
  else fail(`Karten: Migration ${JSON.stringify(mig)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * N5 (Probespiel: »Das Intro muss liebevoll sein … am Anfang das Tutorial überspringen …
 * Texte nicht hellgrau unten«): Titelbild mit Figur (Frau/Mann) und Einführung, jede
 * Erklärung im Kasten an ihrer Zeile; die Ankunft mit dem Ruderboot in ihren Phasen, Esc
 * gehalten überspringt; Eddas erster Kontakt mit der Fahrt über die Wege; das Tutorial
 * (laufen, dann das erste Ziel); ohne Einführung nur die Geschichte; Speichern v30 und
 * Migration v23 → v30.
 * Bilder: figur-erklaerung, ankunft-karte, ankunft-see, ankunft-steg, edda-erstkontakt.
 */
async function runArrivalChecks(browser, url) {
  // 1) Titelbild mit echten Tasten
  const t = await openGame(browser, `${url}index.html?debug&nosave`, 'Ankunft: Titelbild');
  const tp = t.page;
  await tp.evaluate(() => window.zomfy.setDebug(false));
  await tp.waitForFunction(() => window.zomfy.mode === 'splash', null, { timeout: 180000 });
  await tp.waitForFunction(() => window.zomfy.game.splash.t > 1.6, null, { timeout: 180000 });
  await tp.keyboard.press('Space');
  await tp.waitForFunction(() => window.zomfy.mode === 'title', null, { timeout: 180000 });
  await settle(tp, 40);
  const press = async (key) => {
    await tp.keyboard.press(key);
    await settle(tp, 3);
  };
  await press('Enter'); // Neues Spiel → Figur
  await settle(tp, 30);
  const view = () => tp.evaluate(() => window.zomfyView().titel);
  const zeile = (v) => (v?.knoepfe || []).find((k) => k.startsWith('> ')) || '';
  const neben = (v) => {
    const e = v?.erklaerung;
    return Boolean(e && e.x + e.w <= e.row.x && Math.abs(e.y + e.h / 2 - (e.row.y + e.row.h / 2)) < 30);
  };
  await press('KeyW'); // von »Los geht’s!« zur Einführung
  const einf = await view();
  await press('KeyD');
  const einfAus = await view();
  await press('KeyD'); // wieder mit Edda
  await press('KeyW'); // M31: über »Verluste« …
  await press('KeyW'); // … zur Schwierigkeit
  const schw = await view();
  for (let k = 0; k < 5; k++) await press('KeyW'); // Haut, Haare, Jacke, Mütze, Figur
  const figur = await view();
  const verts = () =>
    tp.evaluate(() => {
      let n = 0;
      window.zomfy.game.player.character.parts.head.traverse((o) => {
        if (o.isMesh && !o.userData.outline) n += o.geometry.attributes.position.count;
      });
      return n;
    });
  const frau = await verts();
  await press('KeyD');
  await settle(tp, 10);
  const mannView = await view();
  const mann = await verts();
  await press('KeyA'); // wieder Frau fürs Bild
  await settle(tp, 20);
  await tp.screenshot({ path: join(SHOTS, 'figur-erklaerung.png') });
  note('  Screenshot: screenshots/figur-erklaerung.png');
  if (zeile(einf).includes('Einführung: mit Edda') && einf.erklaerung?.text.includes('Schritt für Schritt') && neben(einf) && zeile(einfAus).includes('Einführung: ohne') && einfAus.erklaerung?.text.includes('kennen') && zeile(schw).includes('Schwierigkeit') && schw.erklaerung?.text.includes('gedacht') && neben(schw)) {
    note(`✓ Titelbild (N5): Einführung mit Edda oder ohne (A/D), jede Erklärung im Kasten links an ihrer Zeile (x ${einf.erklaerung.x}–${einf.erklaerung.x + einf.erklaerung.w}, Zeile ab x ${einf.erklaerung.row.x}) – nicht mehr hellgrau am unteren Rand`);
  } else fail(`Titelbild N5: ${JSON.stringify({ einf, einfAus, schw })}`);
  if (zeile(figur).includes('Figur: Frau') && zeile(mannView).includes('Figur: Mann') && frau > mann) note(`✓ Figur (N5): Frau oder Mann mit A/D – die Frau trägt Zopf und längeres Haar (Kopf ${frau} statt ${mann} Ecken)`);
  else fail(`Figur N5: ${JSON.stringify({ figur: zeile(figur), mann: zeile(mannView), frau, mannVerts: mann })}`);
  checkMessages(t);
  await t.context.close();

  // 2) Die Ankunft in festen Schritten
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Ankunft (N5)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-n5')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-n5', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((ms2) => window.__zomfyStep(ms2), ms);
  const fresh = (on) =>
    z((tut) => {
      const Z = window.zomfy;
      const f = Z.game.state.flags; // der echte Stand – Z.state() ist eine Kopie
      for (const key of Object.keys(f)) if (key.startsWith('funk_')) delete f[key];
      Z.setTutorial(tut);
      Z.game.funk.clear();
      Z.setTime(6, 10);
    }, on);
  await z(() => {
    window.__zomfyHold = true;
    window.zomfy.setHorde(false);
    window.zomfy.setWeather('klar', true);
  });
  await fresh(true);
  await z(() => window.zomfy.startArrival());
  await step(300);
  const a0 = await z(() => window.zomfy.arrival());
  await step(3800);
  const karte = await z(() => window.zomfy.arrival());
  await page.screenshot({ path: join(SHOTS, 'ankunft-karte.png') });
  note('  Screenshot: screenshots/ankunft-karte.png');
  await step(4000);
  const see0 = await z(() => window.zomfy.arrival());
  await step(5200);
  const see1 = await z(() => window.zomfy.arrival());
  await page.screenshot({ path: join(SHOTS, 'ankunft-see.png') });
  note('  Screenshot: screenshots/ankunft-see.png');
  if (a0.phase === 'karte' && a0.mode === 'ankunft' && karte.lines.length === 2 && see0.phase === 'see' && see1.boat.x < see0.boat.x - 3 && see1.seated && see1.rowing > 0) {
    note(`✓ Ankunft (N5): erst die Titelkarte mit zwei Gedanken, dann rudert Mika über den See (Boot von x ${see0.boat.x.toFixed(1)} nach ${see1.boat.x.toFixed(1)}, sitzend, im Takt der Riemen)`);
  } else fail(`Ankunft See: ${JSON.stringify({ a0, karte, see0, see1 })}`);
  let steg = null;
  for (let k = 0; k < 30 && !steg; k++) {
    await step(300);
    const a = await z(() => window.zomfy.arrival());
    if (a.phase === 'steg') steg = a;
  }
  await step(2200);
  await page.screenshot({ path: join(SHOTS, 'ankunft-steg.png') });
  note('  Screenshot: screenshots/ankunft-steg.png');
  const unterwegs = await z(() => ({ ...window.zomfy.arrival(), p: window.zomfy.state().player }));
  for (let k = 0; k < 60 && (await z(() => window.zomfy.mode)) !== 'dialog'; k++) await step(300);
  const kontakt = await z(() => ({ d: window.zomfy.dialogInfo(), a: window.zomfy.arrival(), p: window.zomfy.state().player }));
  await step(1500);
  await page.screenshot({ path: join(SHOTS, 'edda-erstkontakt.png') });
  note('  Screenshot: screenshots/edda-erstkontakt.png');
  const moor = { x: 16.6, z: -2.7 };
  if (steg && !steg.seated && unterwegs.phase === 'steg' && kontakt.d.open && kontakt.d.speaker === 'edda' && !kontakt.a.active && Math.hypot(kontakt.a.boat.x - moor.x, kontakt.a.boat.z - moor.z) < 0.3 && kontakt.p.x < 8) {
    note(`✓ Ankunft (N5): Mika steigt auf den Steg und geht zum Haus (x ${kontakt.p.x.toFixed(1)}), das Funkgerät knistert – Edda meldet sich; das Boot liegt am Steg`);
  } else fail(`Ankunft Steg: ${JSON.stringify({ steg, unterwegs, kontakt })}`);
  // Eddas Dialog mit E durch (mit Einführung zeigt sie dabei die Wege)
  const looks = [];
  for (let k = 0; k < 24 && (await z(() => window.zomfy.mode)) === 'dialog'; k++) {
    await page.keyboard.press('KeyE');
    await step(400);
    const c = await z(() => window.zomfy.camera());
    if (c.look && !looks.includes(c.look)) looks.push(c.look);
  }
  await step(800);
  const tut0 = await z(() => ({ t: window.zomfy.tutorial(), f: window.zomfy.funk(), mode: window.zomfy.mode }));
  // Laufen mit echter Taste: dann lobt Edda und nennt das erste Ziel
  await page.keyboard.down('KeyA');
  await step(2500);
  await page.keyboard.up('KeyA');
  await step(600);
  const tut1 = await z(() => ({ t: window.zomfy.tutorial(), flags: Object.keys(window.zomfy.state().flags).filter((k) => k.startsWith('funk_')) }));
  const firstStep = tut0.f.current?.key === 'laufen' || tut0.f.queue.includes('laufen');
  if (tut0.mode === 'play' && looks.includes('wald') && looks.includes('zusammen') && firstStep && tut1.t.gut && tut1.flags.includes('funk_ziel_axt')) {
    note(`✓ Einführung (N5): Edda zeigt die Wege (${looks.join(' → ')}), dann »Lauf ein Stück« – nach ein paar Schritten lobt sie und nennt das erste Ziel (Axt)`);
  } else fail(`Einführung: ${JSON.stringify({ looks, tut0, tut1 })}`);

  // 3) Esc gehalten überspringt die Ankunft
  await fresh(true);
  await z(() => window.zomfy.startArrival());
  await step(2000);
  await page.keyboard.down('Escape');
  await step(900);
  await page.keyboard.up('Escape');
  await step(200);
  const skip = await z(() => ({ a: window.zomfy.arrival(), mode: window.zomfy.mode, p: window.zomfy.state().player, d: window.zomfy.dialogInfo() }));
  if (!skip.a.active && skip.mode === 'dialog' && skip.d.speaker === 'edda' && skip.p.x < 8) note('✓ Ankunft (N5): Esc gehalten überspringt sie – Mika steht vor dem Haus, Edda meldet sich');
  else fail(`Ankunft überspringen: ${JSON.stringify(skip)}`);
  await z(() => window.zomfy.finishDialog());
  await step(300);

  // 4) Ohne Einführung: Edda erzählt, erklärt aber nichts
  await fresh(false);
  await z(() => window.zomfy.startArrival());
  await step(1000);
  await page.keyboard.down('Escape');
  await step(900);
  await page.keyboard.up('Escape');
  const kurz = await z(() => window.zomfy.game.dialog.lines.length);
  await z(() => window.zomfy.finishDialog());
  await step(300);
  await page.keyboard.down('KeyD');
  await step(2500);
  await page.keyboard.up('KeyD');
  await step(1500);
  const ohne = await z(() => ({ flags: Object.keys(window.zomfy.state().flags).filter((k) => k.startsWith('funk_')), f: window.zomfy.funk() }));
  if (kurz === 5 && !ohne.flags.includes('funk_laufen') && !ohne.flags.includes('funk_ziel_axt') && !ohne.f.queue.length) note(`✓ Ohne Einführung (N5): Edda stellt sich vor (${kurz} Zeilen), danach keine Erklärungen und kein Ziel über Funk`);
  else fail(`Ohne Einführung: ${JSON.stringify({ kurz, ohne })}`);

  // 5) Speichern v30: Figur und Einführung bleiben
  await z(() => {
    const Z = window.zomfy;
    Z.game.state.player.look.body = 'mann'; // der echte Stand – Z.state() ist eine Kopie
    Z.setTutorial(true);
    Z.game.quietSave();
  });
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 180000 });
  const saved = await z(() => ({ v: window.zomfy.state().version, body: window.zomfy.state().player.look.body, tut: window.zomfy.state().tutorial }));
  if (saved.v === 30 && saved.body === 'mann' && saved.tut.on === true) note('✓ Ankunft (N5): Speichern v30 mit Figur und Einführung');
  else fail(`N5 Speichern: ${JSON.stringify(saved)}`);
  checkMessages(session);
  await session.context.close();

  // 6) Migration v23 → v30: alte Stände behalten ihre Figur (Mann) und brauchen keine Einführung
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Ankunft: Migration v23 → v30', {
    init: () => {
      const s = {
        version: 23,
        time: { day: 5, minute: 200 },
        player: { x: 2, z: 1, facing: 0, name: 'Mika', look: { hat: 'blau', jacket: 'gruen', hair: 'braun', skin: 'mittel' } },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [], furniture: [], orders: [], houseLevel: 1 },
        flags: { introGesehen: true },
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const mig = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, look: window.zomfy.state().player.look, tut: window.zomfy.state().tutorial, a: window.zomfy.arrival() }));
  if (mig.v === 30 && mig.look.body === 'mann' && mig.look.hat === 'blau' && mig.tut.on === false && !mig.a.active) note('✓ Ankunft (N5): Migration v23 → v30 – die Figur bleibt (Mann, blaue Mütze), keine Einführung, keine Ankunft');
  else fail(`N5 Migration: ${JSON.stringify(mig)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M32: Netzwerk und Wiedersehen – morgens Post im Briefkasten (Fahne, echte Taste, Briefkarte),
 * ein Paket von Balduin, Stimmen über Junas Funkgerät, Besuch zum Fest, eine Einladung bringt
 * jemanden zurück, Signalfeuer auf den Inseln in der Frostnacht (auch auf der Karte), Edda kommt
 * nach dem Herbst nach Hause (echte Taste), die Seite »Post« im Herbstbuch, Speichern v30,
 * Migration v27 → v30 (Bilder: brief, paket, signalfeuer, signalkarte, edda-daheim).
 */
async function runNetworkChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Netzwerk (M32)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m32')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m32', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(80);
  };
  const answer = async (pick) => {
    for (let k = 0; k < 12; k++) {
      const d = await z(() => window.zomfy.dialogInfo?.() || null);
      if (!d || !d.open) return false;
      if (d.answers?.length) {
        for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
        await step(400);
        const c = await z(() => window.zomfy.dialogInfo());
        const i = c.answers.findIndex((a) => a.aktion === pick || a.t === pick);
        if (i < 0) return false;
        for (let s = 0; s < Math.abs(i - c.choice); s++) await tap(i > c.choice ? 'KeyS' : 'KeyW');
        await tap('KeyE');
        return true;
      }
      await tap('KeyE');
    }
    return false;
  };
  const closeDialog = async () => {
    for (let k = 0; k < 24 && (await z(() => window.zomfy.dialogInfo().open)); k++) await tap('KeyE');
  };
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'werkbankGebaut', 'blitzHinweis']) Z.setFlag(f);
    Z.setHorde(false);
    Z.setWeather('klar', true);
    Z.setDay(10);
    for (const id of ['hilde', 'juna']) Z.setSurvivor(id, 3);
    // Hannes ist vor zwei Tagen ins Forsthaus weitergezogen, sein Brief ist für morgen fällig
    Object.assign(Z.game.state.survivors.hannes, { stage: 4, day: 3, gone: 8, letter: 11, read: false, tent: null, guest: null });
    Z.game.survivors.placeAll(true);
    Z.setTime(22, 0);
  });
  await step(300);

  // 1) Morgens liegt Post im Briefkasten – Hilde hat sie gebracht, die Fahne ist oben
  const morgen = await z(() => ({ lines: window.zomfy.nextMorning().map((l) => l.text), post: window.zomfy.post() }));
  const postZeile = morgen.lines.find((t) => t.includes('Brief von Hannes'));
  if (postZeile?.startsWith('Hilde hat die Post gebracht') && morgen.post.box.length === 1 && morgen.post.box[0].from === 'hannes' && morgen.post.flag) note(`✓ Netzwerk (M32): morgens liegt Post im Briefkasten, die Fahne ist oben (»${postZeile}«)`);
  else fail(`Netzwerk: Post am Morgen ${JSON.stringify({ lines: morgen.lines, box: morgen.post.box, flag: morgen.post.flag })}`);

  // 2) E am Briefkasten (echte Taste): die Briefkarte, danach ist die Fahne unten
  await z(() => {
    const Z = window.zomfy;
    Z.setTime(9, 0);
    const m = Z.game.world.interactions.find((q) => q.id === 'briefkasten');
    Z.teleport(m.x + 0.2, m.z + 0.8, Math.PI);
  });
  await step(500);
  await z(() => {
    window.zomfy.game.funk.clear();
    window.zomfy.game.hud.speech = null;
  });
  const vorE = await z(() => window.zomfy.game.currentInteraction?.id || null);
  await tap('KeyE');
  await step(400);
  const brief = await z(() => window.zomfy.post());
  await page.screenshot({ path: join(SHOTS, 'brief.png') });
  note('  Screenshot: screenshots/brief.png');
  await tap('KeyE');
  await step(300);
  const gelesen = await z(() => ({ post: window.zomfy.post(), seen: Boolean(window.zomfy.state().flags.briefkastenGesehen) }));
  if (vorE === 'briefkasten' && brief.mode === 'lieferung' && brief.card?.letter === 'hannes' && brief.card.kind === 'brief' && gelesen.post.mode === 'play' && !gelesen.post.flag && gelesen.post.box.length === 0 && gelesen.post.read.length === 1 && gelesen.seen) note('✓ Netzwerk: E am Briefkasten zeigt den Brief als Karte (Porträt, Ort, Tag), danach ist die Fahne unten');
  else fail(`Netzwerk: Briefkasten ${JSON.stringify({ vorE, brief: { mode: brief.mode, card: brief.card }, danach: { mode: gelesen.post.mode, flag: gelesen.post.flag, box: gelesen.post.box, read: gelesen.post.read } })}`);

  // 3) Ein Paket vom Ort: Balduin bringt es mit, die Lieferkarte zeigt, was darin war
  const paket = await z(() => {
    const Z = window.zomfy;
    Z.setDay(16);
    Z.setTime(9, 30);
    const before = { ...Z.game.state.inventory };
    const items = Z.game.deliverOrders();
    Z.game.showPendingDelivery();
    return { items, before, after: { ...Z.game.state.inventory }, post: Z.post() };
  });
  await step(300);
  await page.screenshot({ path: join(SHOTS, 'paket.png') });
  note('  Screenshot: screenshots/paket.png');
  await tap('KeyE');
  await step(300);
  const parcel = paket.items.find((it) => it && it.parcel === 'hannes');
  if (parcel && paket.after.holz === paket.before.holz + 14 && paket.after.fasern === paket.before.fasern + 4 && paket.post.mode === 'lieferung' && paket.post.card?.parcel === 'hannes' && paket.post.sent.includes('hannes:paket')) note('✓ Netzwerk: ein Paket aus dem Forsthaus kommt mit Balduin (14 Holz, 4 Fasern) – die Lieferkarte zeigt es');
  else fail(`Netzwerk: Paket ${JSON.stringify({ items: paket.items, holz: [paket.before.holz, paket.after.holz], fasern: [paket.before.fasern, paket.after.fasern], mode: paket.post.mode, card: paket.post.card, sent: paket.post.sent })}`);

  // 4) Stimmen: Mit Juna im Lager hat das Funkgerät die Wahl »Die anderen«
  await z(() => window.zomfy.game.startDialog('radio'));
  await step(200);
  const funk = await z(() => window.zomfy.dialogInfo());
  const gewaehlt = await answer('stimmen');
  await step(200);
  let stimme = null;
  for (let k = 0; k < 6 && !stimme; k++) {
    const d = await z(() => window.zomfy.dialogInfo());
    if (d.speaker === 'hannes') stimme = d.text;
    else await tap('KeyE');
  }
  await closeDialog();
  if (funk.answers.some((a) => a.aktion === 'stimmen') && gewaehlt && stimme?.includes('Hannes')) note(`✓ Netzwerk: mit Juna im Lager empfängt das Funkgerät »Die anderen« – ${stimme}`);
  else fail(`Netzwerk: Stimmen ${JSON.stringify({ answers: funk.answers, gewaehlt, stimme })}`);

  // 5) Besuch zum Fest: Hannes sitzt am Feuer, E spricht ihn an
  const fest = await z(() => {
    const Z = window.zomfy;
    Z.game.state.feast = Z.game.state.time.day + 1;
    const lines = Z.nextMorning().map((l) => l.text);
    Z.setTime(10, 0);
    Z.game.survivors.placeAll(true);
    Z.game.survivors.refreshInteractions();
    const n = Z.game.survivors.npcs.list.get('hannes');
    return { lines, visitor: Z.post().visitor, n: n ? { x: n.x, z: n.z, visible: n.model.root.visible } : null };
  });
  let besuch = null;
  if (fest.n) {
    await z(([x, zz]) => window.zomfy.teleport(x - 0.3, zz + 0.9, Math.PI), [fest.n.x, fest.n.z]);
    await step(500);
    const it = await z(() => window.zomfy.game.currentInteraction?.id || null);
    await tap('KeyE');
    await step(300);
    besuch = { it, d: await z(() => window.zomfy.dialogInfo()) };
    await closeDialog();
  }
  if (fest.visitor === 'hannes' && fest.lines.some((t) => t.startsWith('Zum Fest ist Hannes')) && fest.n?.visible && besuch?.it === 'npc-hannes' && besuch.d.speaker === 'hannes') note(`✓ Netzwerk: zum Fest kommt Hannes zu Besuch ans Feuer – »${besuch.d.text}«`);
  else fail(`Netzwerk: Besuch ${JSON.stringify({ fest, besuch })}`);

  // 6) Rückkehr: Ist ein Platz frei, nimmt Balduin eine Einladung mit – am Morgen ist Hannes wieder da
  const einladung = await z(() => {
    const Z = window.zomfy;
    Z.give({ holz: 30, stoff: 10, fasern: 10, teile: 10 });
    const zelt = Z.build('zelt', -4, 6);
    const rows = Z.tradeRows();
    const ok = Z.trade('einladung');
    const invite = Z.post().invite;
    const lines = Z.nextMorning().map((l) => l.text);
    const s = Z.state().survivors.hannes;
    return { zelt, rows: rows.filter((r) => r.includes('einladung')), ok, invite, lines, stage: s.stage, due: s.due, day: Z.state().time.day, speech: Z.game.hud.speech?.text || null };
  });
  if (einladung.rows.includes('tausch-einladung-hannes') && einladung.ok && einladung.invite?.id === 'hannes' && einladung.stage === 2 && einladung.due < einladung.day && einladung.speech?.includes('wieder da')) note(`✓ Netzwerk: Balduin nimmt eine Einladung mit (ein Platz ist frei) – am nächsten Morgen ist Hannes wieder da (»${einladung.speech}«), die Entscheidung ist gleich fällig`);
  else fail(`Netzwerk: Einladung ${JSON.stringify(einladung)}`);

  // 7) Frostnacht: Auf den Inseln brennen Signalfeuer – je Ort eines, jeder Ort schickt etwas
  const frost = await z(() => {
    const Z = window.zomfy;
    const s = Z.game.state.survivors;
    Object.assign(s.clara, { stage: 4, day: 5, gone: 25, letter: 27, read: true, tent: null, guest: null });
    Object.assign(s.greta, { stage: 4, day: 6, gone: 26, letter: 28, read: true, tent: null, guest: null });
    Z.game.survivors.placeAll(true);
    Z.setDay(30);
    Z.setTime(21, 30);
    const before = Z.game.state.inventory.leuchtkugeln || 0;
    Z.game.autumn.beginNight(30);
    return { post: Z.post(), places: Z.game.post.places().length, before, after: Z.game.state.inventory.leuchtkugeln || 0, toast: Z.game.hud.toasts.map((t) => t.text).find((t) => t.includes('Signalfeuer')) || null };
  });
  await z(() => {
    const Z = window.zomfy;
    Z.teleport(16.0, -1.25, Math.PI);
    Z.lookAt(19.5, -8.0); // die Nordinsel mit ihrem Feuer (vom Stegende aus verdeckt es der Leuchtmast)
    Z.game.funk.clear();
    Z.game.hud.speech = null;
  });
  await step(900);
  await z(() => {
    window.zomfy.game.hud.toasts.length = 0;
    window.zomfy.game.funk.clear();
  });
  await step(50);
  await page.screenshot({ path: join(SHOTS, 'signalfeuer.png') });
  note('  Screenshot: screenshots/signalfeuer.png');
  await z(() => window.zomfy.lookAt(null));
  await tap('KeyM');
  await step(300);
  const karte = await z(() => window.zomfy.game.mode);
  await page.screenshot({ path: join(SHOTS, 'signalkarte.png') });
  note('  Screenshot: screenshots/signalkarte.png');
  await tap('KeyM');
  await step(200);
  // Je Ort eines – auch für die, die unterwegs von selbst weitergezogen sind (M27: volle Plätze)
  if (frost.post.fires.includes('leuchtturm') && frost.post.fires.includes('nordinsel') && frost.post.fires.length === new Set(frost.post.fires).size && frost.post.fires.length === frost.places && frost.after === frost.before + 2 && frost.toast && karte === 'karte') note(`✓ Netzwerk: in der Frostnacht brennen auf den Inseln ${frost.post.fires.length} Signalfeuer (je Ort eines: ${frost.post.fires.join(', ')}), auch auf der Karte – »${frost.toast}«`);
  else fail(`Netzwerk: Signalfeuer ${JSON.stringify({ fires: frost.post.fires, places: frost.places, before: frost.before, after: frost.after, toast: frost.toast, karte })}`);

  // 8) Nach dem Herbst kommt Edda nach Hause: am Ende des Stegs, E spricht sie an (echte Taste)
  const heim = await z(() => {
    const Z = window.zomfy;
    const au = Z.game.state.autumn;
    au.frost = 30;
    au.credits = true;
    Z.game.autumn.choose('weiter');
    const home = Z.game.state.edda.home;
    const lines = Z.nextMorning().map((l) => l.text);
    Z.setTime(10, 0);
    Z.game.world.setSignalFires([]);
    Z.game.survivors.placeAll(true);
    Z.game.survivors.refreshInteractions();
    return { home, lines, post: Z.post() };
  });
  await z(([x, zz]) => {
    const Z = window.zomfy;
    Z.teleport(x - 0.7, zz, Math.PI / 2); // Juna steht am Mast weiter nördlich
    Z.game.funk.clear();
    Z.game.hud.speech = null;
    Z.game.hud.toasts.length = 0;
  }, [heim.post.edda.x ?? 20.5, heim.post.edda.z ?? -1]);
  await step(600);
  const eddaIt = await z(() => window.zomfy.game.currentInteraction?.id || null);
  await tap('KeyE');
  await step(900);
  const eddaDlg = await z(() => window.zomfy.dialogInfo());
  await z(() => window.zomfy.teleport(19.9, -0.55, Math.PI / 2)); // fürs Bild neben Edda, nicht vor ihr
  await step(100);
  await page.screenshot({ path: join(SHOTS, 'edda-daheim.png') });
  note('  Screenshot: screenshots/edda-daheim.png');
  await closeDialog();
  await z(() => window.zomfy.talkTo('edda'));
  await step(200);
  const eddaDa = await z(() => ({ d: window.zomfy.dialogInfo(), met: window.zomfy.state().edda.met }));
  await closeDialog();
  if (heim.home === 31 && heim.lines.some((t) => t.includes('Edda ist nach Hause gekommen')) && heim.post.edda.athome && heim.post.edda.visible && eddaIt === 'npc-edda' && eddaDlg.speaker === 'eddaHier' && eddaDa.met && eddaDa.d.speaker === 'eddaHier') note(`✓ Netzwerk: nach dem Herbst ist Edda am nächsten Morgen zu Hause – sie steht am Ende des Stegs, E: »${eddaDlg.text}«`);
  else fail(`Netzwerk: Edda ${JSON.stringify({ home: heim.home, lines: heim.lines, edda: heim.post.edda, eddaIt, eddaDlg, eddaDa })}`);

  // 9) Das Herbstbuch bekommt die Seite »Post«
  const buch = await z(() => {
    const menu = window.zomfy.game.menu;
    const pages = menu.bookPages();
    menu.page = 'post';
    menu.bookCache = null;
    const rows = menu.bookData().rows.map((r) => r.label);
    menu.page = 'taten';
    menu.bookCache = null;
    return { pages, rows };
  });
  if (buch.pages.includes('post') && buch.rows.includes('Hannes')) note('✓ Herbstbuch: die Seite »Post« – Briefe von unterwegs');
  else fail(`Herbstbuch: Post ${JSON.stringify(buch)}`);

  // 10) Speichern v30 und Neuladen
  await z(() => window.zomfy.game.quietSave());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.__zomfyStep, null, { timeout: 30000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  await step(300);
  const geladen = await z(() => ({ v: window.zomfy.state().version, post: window.zomfy.post() }));
  if (geladen.v === 30 && geladen.post.read.length === 1 && geladen.post.sent.includes('hannes:paket') && geladen.post.edda.athome && geladen.post.edda.met && geladen.post.edda.visible) note('✓ Netzwerk: Speichern v30 – Briefe, Pakete und Edda zu Hause bleiben nach dem Neuladen');
  else fail(`Netzwerk: Speichern ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // 11) Migration v27 → v30: der Brief von früher liegt im Herbstbuch, nach dem Herbst kommt Edda
  const alt = await openGame(browser, `${url}index.html?test&playtest`, 'Netzwerk: Migration', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m32-mig')) {
        localStorage.clear();
        localStorage.setItem('zomfy-towers.spielstand', JSON.stringify({ version: 27, difficulty: 'ausgewogen', time: { day: 33, minute: 180 }, player: { x: 4, z: 2, hp: 90, name: 'Kira' }, inventory: { holz: 5 }, world: { houseLevel: 1, homeHp: 300, buildings: [] }, stats: { nightsWon: 20 }, flags: { introGesehen: true }, autumn: { frost: 30, mode: 'weiter', credits: true }, survivors: { ida: { stage: 4, day: 9, gone: 14, letter: 16, read: true } } }));
        sessionStorage.setItem('zomfy-m32-mig', '1');
      }
    },
  });
  await alt.page.evaluate(() => window.__zomfyStep(300));
  const mig = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, post: window.zomfy.post() }));
  if (mig.v === 30 && mig.post.read.length === 1 && mig.post.read[0].from === 'ida' && mig.post.read[0].day === 16 && mig.post.box.length === 0 && mig.post.edda.home === 34 && !mig.post.edda.athome) note('✓ Netzwerk: Migration v27 → v30 – Idas Brief liegt im Herbstbuch, Edda kommt am nächsten Morgen');
  else fail(`Netzwerk: Migration ${JSON.stringify(mig)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M33: Angeln am Steg – Fiete bringt es bei (echte Tasten), tagsüber sagt der Angelplatz,
 * wann es geht, abends kommt Fiete mit: auswerfen mit gehaltenem E, zu früh anschlagen
 * verscheucht, der Biss mit E, der Drill mit echten Tasten, die Fangkarte, Esc steht auf
 * (die Uhr läuft weiter, gemeinsame Zeit mit Fiete, heute keine zweite Aktivität), Balduin
 * nimmt den Fisch, Speichern v30, Migration v28 → v30 (Bilder: angeln, drill, fang).
 */
async function runFishingChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Angeln (M33)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m33')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m33', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(80);
  };
  const answer = async (pick) => {
    for (let k = 0; k < 12; k++) {
      const d = await z(() => window.zomfy.dialogInfo?.() || null);
      if (!d || !d.open) return false;
      if (d.answers?.length) {
        for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
        await step(400);
        const c = await z(() => window.zomfy.dialogInfo());
        const i = c.answers.findIndex((a) => a.aktion === pick || a.t === pick);
        if (i < 0) return false;
        for (let s = 0; s < Math.abs(i - c.choice); s++) await tap(i > c.choice ? 'KeyS' : 'KeyW');
        await tap('KeyE');
        return true;
      }
      await tap('KeyE');
    }
    return false;
  };
  const closeDialog = async () => {
    for (let k = 0; k < 24 && (await z(() => window.zomfy.dialogInfo().open)); k++) await tap('KeyE');
  };
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'werkbankGebaut', 'blitzHinweis']) Z.setFlag(f);
    Z.setHorde(false);
    Z.setWeather('klar', true);
    Z.setDay(8);
    Z.setSurvivor('hilde', 3);
    // Fiete zieht ins neue Zelt ein
    Z.give({ holz: 40, stoff: 10, fasern: 10, schrott: 10 });
    Z.build('zelt', -4, 6);
    Object.assign(Z.game.state.survivors.fiete, { stage: 2, day: 4, guest: 0, due: 99 });
    Z.game.survivors.moveIn('fiete');
    Z.game.hud.speech = null;
    Z.game.survivors.placeAll(true);
    Z.game.survivors.refreshInteractions();
    Z.setTime(10, 0);
  });
  await step(400);
  await z(() => window.zomfy.game.funk.clear());

  // 1) Fiete bringt das Angeln bei (echte Tasten): danach gibt es die Angel und den Angelplatz
  const vorher = await z(() => ({ rod: window.zomfy.fishing().data.rod, spot: window.zomfy.fishing().spot?.enabled ?? null }));
  await z(() => window.zomfy.talkTo('fiete'));
  await step(200);
  const lern = await answer('angelnLernen');
  await step(200);
  await closeDialog();
  await step(200);
  const gelernt = await z(() => ({ ...window.zomfy.fishing(), toast: window.zomfy.game.hud.toasts.map((t) => t.text).find((t) => t.includes('Angel')) || null }));
  if (!vorher.rod && lern && gelernt.data.rod && gelernt.data.taught && gelernt.spot?.enabled && gelernt.toast) note(`✓ Angeln (M33): Fiete bringt es bei – »${gelernt.toast}«, der Angelplatz am Steg ist da`);
  else fail(`Angeln: Fiete ${JSON.stringify({ vorher, lern, data: gelernt.data, spot: gelernt.spot, toast: gelernt.toast })}`);

  // 2) Tagsüber sagt der Angelplatz, wann es geht (echte Taste)
  await z(() => {
    const Z = window.zomfy;
    const it = Z.game.world.interactions.find((q) => q.id === 'angelplatz');
    Z.teleport(it.x, it.z, Math.PI); // genau auf die Einblendung (Balduins Stand am Poller ist nah)
    Z.game.hud.speech = null;
  });
  await step(500);
  const tagIt = await z(() => window.zomfy.game.currentInteraction?.id || null);
  await tap('KeyE');
  await step(100);
  const tag = await z(() => ({ mode: window.zomfy.game.mode, g: window.zomfyView().gedanke, blocked: window.zomfy.fishing().blocked }));
  if (tagIt === 'angelplatz' && tag.mode === 'play' && tag.blocked === 'zeit' && String(tag.g || '').includes('abends')) note(`✓ Angeln: tagsüber sagt der Angelplatz »${tag.g}«`);
  else fail(`Angeln: tagsüber ${JSON.stringify({ tagIt, tag })}`);

  // 3) Abends kommt Fiete mit (echte Tasten): Mika und Fiete sitzen an der Stegkante, die Uhr steht
  await z(() => {
    const Z = window.zomfy;
    Z.setTime(18, 30);
    Z.game.survivors.placeAll(true);
    Z.game.survivors.refreshInteractions();
    Z.game.hud.speech = null;
  });
  await step(200);
  await z(() => window.zomfy.talkTo('fiete'));
  await step(200);
  const eingeladen = await answer('angeln');
  await step(600);
  const sitzen = await z(() => {
    const Z = window.zomfy;
    const n = Z.game.survivors.npcs.list.get('fiete');
    return { f: Z.fishing(), minute: Z.state().time.minute, seated: Boolean(Z.game.player.seated), fiete: n ? { sit: n.sit, fishing: Boolean(n.fishing), rod: Boolean(n.model.parts.held?.angel?.visible) } : null };
  });
  await step(900);
  const minuteSpaeter = await z(() => window.zomfy.state().time.minute);
  if (eingeladen && sitzen.f.mode === 'angeln' && sitzen.f.session?.friend === 'fiete' && sitzen.seated && sitzen.fiete?.fishing && sitzen.fiete.rod && minuteSpaeter === sitzen.minute) note('✓ Angeln: abends kommt Fiete mit – beide sitzen mit Angel an der Stegkante, die Uhr steht');
  else fail(`Angeln: Einladung ${JSON.stringify({ eingeladen, mode: sitzen.f.mode, session: sitzen.f.session, seated: sitzen.seated, fiete: sitzen.fiete, minute: [sitzen.minute, minuteSpaeter] })}`);

  // 4) Auswerfen mit gehaltenem E (echte Taste): die Kraft pendelt, losgelassen fliegt die Pose
  await page.keyboard.down('KeyE');
  await step(420);
  const laden = await z(() => window.zomfy.fishing().session);
  await page.keyboard.up('KeyE');
  await step(80);
  const wurf = await z(() => window.zomfy.fishing().session);
  await step(900);
  const wartet = await z(() => window.zomfy.fishing().session);
  await page.screenshot({ path: join(SHOTS, 'angeln.png') });
  note('  Screenshot: screenshots/angeln.png');
  if (laden?.phase === 'laden' && laden.power > 0.2 && wurf?.phase === 'wurf' && wartet?.phase === 'warten' && wartet.bob.z < -3) note(`✓ Angeln: E halten lädt (Kraft ${laden.power.toFixed(2)}), loslassen wirft – die Pose schwimmt ${(-1.625 - wartet.bob.z).toFixed(1)} m vor dem Steg`);
  else fail(`Angeln: Wurf ${JSON.stringify({ laden, wurf, wartet })}`);

  // 5) Zu früh angeschlagen verscheucht den Fisch; der echte Biss will ein E im Fenster
  await tap('KeyE');
  const frueh = await z(() => ({ s: window.zomfy.fishing().session, stats: window.zomfy.fishing().stats, g: window.zomfyView().gedanke }));
  await z(() => {
    const f = window.zomfy.game.fishing.session;
    f.wait = f.t + 0.05; // nicht länger warten als nötig
    f.nibbles = [];
  });
  await step(150);
  const biss = await z(() => window.zomfy.fishing().session);
  await tap('KeyE');
  const drill = await z(() => window.zomfy.fishing().session);
  if (frueh.stats.early === 1 && frueh.s.phase === 'warten' && String(frueh.g || '').includes('Zu früh') && biss?.phase === 'biss' && biss.fish && drill?.phase === 'drill' && drill.drill) note(`✓ Angeln: zu früh angeschlagen verscheucht den Fisch, beim echten Biss (${biss.fish}) greift E – der Drill beginnt`);
  else fail(`Angeln: Biss ${JSON.stringify({ frueh, biss, drill })}`);

  // 6) Der Drill mit echten Tasten: E halten, solange der Fisch rechts vom Kescher ist
  let ende = null;
  let shot = false;
  for (let k = 0; k < 900 && !ende; k++) {
    const d = await z(() => window.zomfy.fishing().session);
    if (!d || d.phase !== 'drill') {
      ende = d;
      break;
    }
    const want = d.drill.fx > d.drill.zx + d.drill.zone * 0.5;
    if (want) await page.keyboard.down('KeyE');
    else await page.keyboard.up('KeyE');
    await step(40);
    if (!shot && d.drill.progress > 0.55) {
      shot = true;
      await page.screenshot({ path: join(SHOTS, 'drill.png') });
      note('  Screenshot: screenshots/drill.png');
    }
  }
  await page.keyboard.up('KeyE');
  await step(800);
  const karte = await z(() => window.zomfy.fishing());
  if (karte.session?.card) {
    await page.screenshot({ path: join(SHOTS, 'fang.png') });
    note('  Screenshot: screenshots/fang.png');
  }
  const c = karte.session?.card;
  if (ende?.phase === 'fang' && c && karte.data.caught[c.id]?.n === 1 && c.first) note(`✓ Angeln: der Drill mit echten Tasten bringt den Fang – ${c.id}${c.size ? `, ${c.size} cm` : ''}, »Neu!« auf der Fangkarte`);
  else fail(`Angeln: Drill ${JSON.stringify({ ende: ende?.phase, card: c, caught: karte.data.caught })}`);
  await step(400); // die Fangkarte nimmt E erst nach einem Augenblick (sonst schlösse das Drill-E sie gleich)
  await tap('KeyE');
  await step(200);
  const weiter = await z(() => window.zomfy.fishing().session);

  // 7) Esc steht auf: die Uhr läuft weiter, gemeinsame Zeit mit Fiete, heute keine zweite Aktivität
  const vorEsc = await z(() => window.zomfy.state().time.minute);
  await tap('Escape');
  await step(300);
  const auf = await z(() => {
    const Z = window.zomfy;
    const st = Z.state();
    return { f: Z.fishing(), minute: st.time.minute, bond: st.bonds?.fiete?.kinds?.angeln || 0, seated: Boolean(Z.game.player.seated), cards: Z.game.cardNight.blocked('hilde'), rodShown: Boolean(Z.game.player.character.tools.angel?.visible) };
  });
  if (weiter?.phase === 'bereit' && auf.f.mode === 'play' && !auf.f.session && Math.abs(auf.minute - (vorEsc + 50)) < 2 && auf.bond > 0 && !auf.seated && auf.f.blocked === 'heute' && auf.cards === 'heute' && !auf.rodShown) note('✓ Angeln: Esc steht auf – 50 Minuten später, gemeinsame Zeit mit Fiete, heute Abend keine Karten mehr');
  else fail(`Angeln: Aufstehen ${JSON.stringify({ weiter: weiter?.phase, mode: auf.f.mode, minute: [vorEsc, auf.minute], bond: auf.bond, seated: auf.seated, blocked: auf.f.blocked, cards: auf.cards, rod: auf.rodShown })}`);

  // 8) Balduin nimmt den Fisch aus dem Korb (nur echte Fische, keine Stiefel)
  const handel = await z(() => {
    const Z = window.zomfy;
    const f = Z.game.state.fishing;
    f.basket = Math.max(f.basket, 1);
    const before = { basket: f.basket, teile: Z.game.state.inventory.teile || 0 };
    const rows = Z.tradeRows();
    const ok = Z.trade('fisch');
    return { rows: rows.filter((r) => r.includes('fisch') || r.includes('angel')), ok, before, after: { basket: f.basket, teile: Z.game.state.inventory.teile || 0 } };
  });
  if (handel.rows.includes('tausch-fisch') && !handel.rows.includes('tausch-angel') && handel.ok && handel.after.basket === handel.before.basket - 1 && handel.after.teile === handel.before.teile + 2) note('✓ Angeln: Balduin nimmt einen Fisch aus dem Korb für 2 Zombieteile (die Angel bietet er nicht mehr an)');
  else fail(`Angeln: Handel ${JSON.stringify(handel)}`);

  // 9) Speichern v30 und Neuladen
  await z(() => window.zomfy.game.quietSave());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.__zomfyStep, null, { timeout: 30000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  await step(300);
  const geladen = await z(() => ({ v: window.zomfy.state().version, f: window.zomfy.fishing() }));
  if (geladen.v === 30 && geladen.f.data.rod && geladen.f.data.evenings === 1 && Object.keys(geladen.f.data.caught).length === 1 && geladen.f.spot?.enabled) note('✓ Angeln: Speichern v30 – Angel, Abend und Fang bleiben nach dem Neuladen');
  else fail(`Angeln: Speichern ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // 10) Migration v28 → v30: noch keine Angel
  const alt = await openGame(browser, `${url}index.html?test&playtest`, 'Angeln: Migration', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m33-mig')) {
        localStorage.clear();
        localStorage.setItem('zomfy-towers.spielstand', JSON.stringify({ version: 28, difficulty: 'ausgewogen', time: { day: 9, minute: 180 }, player: { x: 4, z: 2, hp: 90, name: 'Kira' }, inventory: { holz: 5 }, world: { houseLevel: 1, homeHp: 300, buildings: [] }, stats: { nightsWon: 5 }, flags: { introGesehen: true } }));
        sessionStorage.setItem('zomfy-m33-mig', '1');
      }
    },
  });
  await alt.page.evaluate(() => window.__zomfyStep(300));
  const mig = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, f: window.zomfy.fishing() }));
  if (mig.v === 30 && !mig.f.data.rod && mig.f.data.evenings === 0 && !mig.f.spot?.enabled) note('✓ Angeln: Migration v28 → v30 – noch keine Angel, kein Angelplatz');
  else fail(`Angeln: Migration ${JSON.stringify(mig)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * N6 (Abschnitt `inseln`): Mit dem Ruderboot zu den Inseln. Erst dichtet Mika das lecke Boot
 * ab (echte Tasten, Holz und Fasern, vorgewählt »Später«), dann fragt E am Boot wohin –
 * vorgewählt ist »Doch lieber an Land« –, S und E nehmen die Insel im Norden, das
 * Boot rudert hin (Modus 'rudern', die Uhr steht, danach eine Viertelstunde später), Mika
 * geht an Land und bleibt auf der Insel (A gehalten: nicht ins Wasser); das Zelt gibt Eddas
 * Seite aus dem Funkbuch (Karte), das Netz Fasern, die Stange bleibt stehen; E am Boot
 * rudert zurück an den Steg. Die Katze der kleinen Insel kommt mit (Gemütlichkeit +1) und
 * sitzt vor der Tür, die wilden Kürbisse daneben; um halb sieben rudert Mika von selbst
 * heim; abends bleibt das Boot am Steg; Speichern v30 (wer auf einer Insel speichert, wacht
 * am Steg auf) und Migration v29 → v30 (Bilder: rudern, insel, katze-daheim).
 */
async function runIsleChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Inseln (N6)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-n6')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-n6', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(80);
  };
  const quiet = () =>
    z(() => {
      const g = window.zomfy.game;
      g.funk.clear();
      g.hud.toasts.length = 0;
      g.hud.speech = null;
    });
  const answer = async (pick) => {
    for (let k = 0; k < 12; k++) {
      const d = await z(() => window.zomfy.dialogInfo?.() || null);
      if (!d || !d.open) return false;
      if (d.answers?.length) {
        for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
        await step(400);
        const c = await z(() => window.zomfy.dialogInfo());
        const i = c.answers.findIndex((a) => a.aktion === pick || a.t === pick);
        if (i < 0) return false;
        for (let s = 0; s < Math.abs(i - c.choice); s++) await tap(i > c.choice ? 'KeyS' : 'KeyW');
        await tap('KeyE');
        return true;
      }
      await tap('KeyE');
    }
    return false;
  };
  const untilPlay = async () => {
    for (let k = 0; k < 60 && (await z(() => window.zomfy.game.mode)) === 'rudern'; k++) await step(250);
    await step(200);
  };
  const standAt = async (id, facing = Math.PI) => {
    await z(
      ([q, f]) => {
        const it = window.zomfy.isles().interactions.find((r) => r.id === q);
        window.zomfy.teleport(it.x, it.z, f);
      },
      [id, facing],
    );
    await step(400);
    return z(() => window.zomfy.game.currentInteraction?.id || null);
  };
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'werkbankGebaut', 'blitzHinweis']) Z.setFlag(f);
    Z.setHorde(false);
    Z.setWeather('klar', true);
    Z.setDay(5);
    Z.setTime(10, 0);
    Z.give({ holz: 10, fasern: 6 });
  });
  await step(300);
  const amBoot = await standAt('ruderboot');
  await quiet();

  // 0) Das Boot leckt: E (echte Taste) – vorgewählt »Später«, »Abdichten« kostet Holz und Fasern
  const leckPrompt = await z(() => window.zomfy.isles().interactions.find((q) => q.id === 'ruderboot')?.prompt);
  const vorDicht = await z(() => ({ ...window.zomfy.state().inventory }));
  await tap('KeyE');
  await step(200);
  for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
  const leck = await z(() => window.zomfy.dialogInfo());
  const gedichtet = await answer('abdichten');
  await step(300);
  const dicht = await z(() => ({ ...window.zomfy.isles(), inv: window.zomfy.state().inventory, funk: window.zomfy.funk?.() || null }));
  const leckVor = leck?.answers?.[leck.choice];
  if (leckPrompt === 'bootFlicken' && leckVor && !leckVor.aktion && gedichtet && dicht.data.boat && dicht.inv.holz === vorDicht.holz - 8 && dicht.inv.fasern === vorDicht.fasern - 4 && dicht.interactions.find((q) => q.id === 'ruderboot')?.prompt === 'rudern') note(`✓ Inseln (N6): das Ruderboot leckt – E (vorgewählt »${leckVor.t}«), »${leck.answers.find((a) => a.aktion === 'abdichten')?.t}« dichtet es ab`);
  else fail(`Inseln: Abdichten ${JSON.stringify({ leckPrompt, leck, gedichtet, boat: dicht.data.boat, vorDicht, inv: dicht.inv })}`);
  await step(600);
  await quiet();

  // 1) E am Boot (echte Taste): drei Inseln und »Doch lieber an Land« (vorgewählt), S und E nehmen die Nordinsel
  await tap('KeyE');
  await step(200);
  for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
  const wahl = await z(() => window.zomfy.dialogInfo());
  const minuteVorher = await z(() => window.zomfy.state().time.minute);
  const gewaehlt = await answer('insel:nord');
  await step(1200);
  const unterwegs = await z(() => ({ ...window.zomfy.isles(), minute: window.zomfy.state().time.minute }));
  await quiet();
  await page.screenshot({ path: join(SHOTS, 'rudern.png') });
  note('  Screenshot: screenshots/rudern.png');
  const vorgewaehlt = wahl?.answers?.[wahl.choice];
  if (amBoot === 'ruderboot' && wahl?.answers?.length === 4 && vorgewaehlt && !vorgewaehlt.aktion && gewaehlt && unterwegs.mode === 'rudern' && unterwegs.trip?.target === 'nord' && unterwegs.seated && unterwegs.minute === minuteVorher) note(`✓ Inseln: E am Ruderboot fragt wohin (vorgewählt »${vorgewaehlt.t}«), S und E – Mika rudert zur Insel im Norden, die Uhr steht`);
  else fail(`Inseln: Abfahrt ${JSON.stringify({ amBoot, wahl, gewaehlt, unterwegs: { mode: unterwegs.mode, trip: unterwegs.trip, seated: unterwegs.seated, minute: unterwegs.minute, vorher: minuteVorher } })}`);

  // 2) Angelegt: Mika steht auf der Insel, eine Viertelstunde später, ein Gedanke zur Insel
  await untilPlay();
  const an = await z(() => ({ ...window.zomfy.isles(), minute: window.zomfy.state().time.minute, gedanke: window.zomfyView().gedanke }));
  // die Fahrt kostet eine Viertelstunde (nach dem Anlegen läuft die Uhr die paar Schritte der Prüfung weiter)
  if (an.mode === 'play' && an.at === 'nord' && an.mapIsle === 0 && an.player.onIsland && an.player.edge < 0 && an.minute - minuteVorher >= 15 && an.minute - minuteVorher < 17.5 && an.data.visited.includes('nord') && String(an.gedanke || '').includes('gewohnt')) note(`✓ Inseln: angelegt – Mika steht auf der Insel im Norden (${an.player.x.toFixed(2)} | ${an.player.z.toFixed(2)}), eine Viertelstunde später: »${an.gedanke}«`);
  else fail(`Inseln: Landung ${JSON.stringify({ mode: an.mode, at: an.at, mapIsle: an.mapIsle, player: an.player, minute: [minuteVorher, an.minute], visited: an.data.visited, gedanke: an.gedanke })}`);

  // 3) A gehalten (echte Taste): Mika läuft ans Ufer, aber nicht ins Wasser
  await quiet();
  await page.keyboard.down('KeyA');
  await step(2500);
  await page.keyboard.up('KeyA');
  await step(100);
  const ufer = await z(() => window.zomfy.isles().player);
  if (ufer.onIsland && !ufer.water && ufer.edge < 0 && ufer.x < an.player.x + 0.01) note(`✓ Inseln: A gehalten – Mika bleibt am Ufer stehen (${ufer.edge.toFixed(2)} m vom Rand), nicht im Wasser`);
  else fail(`Inseln: Ufer ${JSON.stringify(ufer)}`);

  // Bild: auf der Insel – Zelt, Netz an der Stange, das Boot am Ufer
  await z(() => window.zomfy.teleport(22.0, -8.25, 0));
  await step(500);
  await quiet();
  await page.screenshot({ path: join(SHOTS, 'insel.png') });
  note('  Screenshot: screenshots/insel.png');

  // 4) Das Zelt (echte Taste): Eddas Seite aus dem Funkbuch als Karte
  const zeltIt = await standAt('insel-zelt');
  await tap('KeyE');
  await step(300);
  const zelt = await z(() => window.zomfy.isles());
  if (zeltIt === 'insel-zelt' && zelt.mode === 'lieferung' && zelt.card?.kind === 'notiz' && String(zelt.card.text).includes('Marthe') && zelt.data.found.includes('zelt')) note('✓ Inseln: im Zelt liegt eine Seite aus Eddas Funkbuch (Karte): Marthe und die Kinder auf der Nebelinsel');
  else fail(`Inseln: Zelt ${JSON.stringify({ zeltIt, mode: zelt.mode, card: zelt.card, found: zelt.data.found })}`);
  for (let k = 0; k < 8 && (await z(() => window.zomfy.game.mode)) === 'lieferung'; k++) await tap('KeyE');
  await step(300);

  // 5) Das Netz (echte Taste): Fasern und Stoff, die Stange bleibt stehen
  const vorrat = await z(() => ({ ...window.zomfy.state().inventory }));
  const netzIt = await standAt('insel-netz');
  await tap('KeyE');
  await step(200);
  const netz = await z(() => ({ ...window.zomfy.isles(), inv: window.zomfy.state().inventory }));
  if (netzIt === 'insel-netz' && netz.inv.fasern === (vorrat.fasern || 0) + 8 && netz.inv.stoff === (vorrat.stoff || 0) + 1 && netz.props['Insel: netz'] === false && netz.props['Insel: Netzstange'] === true && netz.data.found.includes('netz')) note(`✓ Inseln: das alte Netz – +8 Fasern, +1 Stoff (${netz.inv.fasern} Fasern), die Stange bleibt stehen`);
  else fail(`Inseln: Netz ${JSON.stringify({ netzIt, vorrat, inv: netz.inv, props: netz.props, found: netz.data.found })}`);

  // 6) E am Boot (echte Taste) rudert zurück: das Boot liegt wieder am Steg, Mika steht darauf
  const zurueckIt = await standAt('ruderboot', -Math.PI / 2);
  const zurueckPrompt = await z(() => window.zomfy.isles().interactions.find((q) => q.id === 'ruderboot')?.prompt);
  await quiet();
  await tap('KeyE');
  await step(200);
  const rudertHeim = await z(() => window.zomfy.isles());
  await untilPlay();
  const heim = await z(() => window.zomfy.isles());
  const amSteg = Math.hypot(heim.player.x - 16.6, heim.player.z + 1.45) < 0.6 && Math.hypot(heim.boat.x - 16.6, heim.boat.z + 2.7) < 0.05;
  if (zurueckIt === 'ruderboot' && zurueckPrompt === 'zurueckRudern' && rudertHeim.mode === 'rudern' && rudertHeim.trip?.target === null && heim.mode === 'play' && heim.at === null && heim.mapIsle === null && amSteg && !heim.player.water) note('✓ Inseln: E am Boot rudert zurück – das Boot liegt wieder nördlich am Steg, Mika steht auf dem Steg');
  else fail(`Inseln: zurück ${JSON.stringify({ zurueckIt, zurueckPrompt, rudertHeim: { mode: rudertHeim.mode, trip: rudertHeim.trip }, heim: { mode: heim.mode, at: heim.at, mapIsle: heim.mapIsle, player: heim.player, boat: heim.boat } })}`);

  // 7) Die kleine Insel: die Katze kommt mit (Gemütlichkeit +1), die Kürbisse auch – beide vor der Haustür
  const cozyVorher = heim.cozy;
  await z(() => window.zomfy.game.isles.row('sued'));
  await untilPlay();
  const sued = await z(() => window.zomfy.isles());
  const katzeIt = await standAt('insel-katze');
  await tap('KeyE');
  await step(200);
  const kuerbisIt = await standAt('insel-kuerbisse');
  await tap('KeyE');
  await step(200);
  await z(() => window.zomfy.game.isles.row(null));
  await untilPlay();
  await z(() => window.zomfy.teleport(6.25, -3.9, Math.PI));
  await step(600);
  await quiet();
  await page.screenshot({ path: join(SHOTS, 'katze-daheim.png') });
  note('  Screenshot: screenshots/katze-daheim.png');
  const miezeIt = await standAt('mieze');
  await tap('KeyE');
  await step(200);
  const katze = await z(() => ({ ...window.zomfy.isles(), gedanke: window.zomfyView().gedanke }));
  if (sued.at === 'sued' && sued.player.onIsland && katzeIt === 'insel-katze' && kuerbisIt === 'insel-kuerbisse' && katze.data.cat && katze.data.found.includes('kuerbisse') && katze.props.Mieze === true && katze.props['Inselkürbisse'] === true && katze.props['Insel: katze'] === false && katze.cozy === cozyVorher + 1 && miezeIt === 'mieze' && String(katze.gedanke || '').includes('Mieze')) note(`✓ Inseln: die Katze der kleinen Insel kommt mit – sie sitzt vor der Tür (Gemütlichkeit ${cozyVorher} → ${katze.cozy}), daneben die wilden Kürbisse; E: »${katze.gedanke}«`);
  else fail(`Inseln: Katze ${JSON.stringify({ sued: { at: sued.at, player: sued.player }, katzeIt, kuerbisIt, miezeIt, cat: katze.data.cat, found: katze.data.found, props: katze.props, cozy: [cozyVorher, katze.cozy], gedanke: katze.gedanke })}`);

  // 8) Um halb sieben rudert Mika von einer Insel von selbst heim (die große Insel)
  await z(() => window.zomfy.game.isles.row('mitte'));
  await untilPlay();
  const mitte = await z(() => window.zomfy.isles());
  await z(() => window.zomfy.setTime(18, 30));
  await step(300);
  const spaet = await z(() => ({ ...window.zomfy.isles(), toasts: window.zomfy.game.hud.toasts.map((t) => t.text) }));
  await untilPlay();
  const spaetHeim = await z(() => window.zomfy.isles());
  if (mitte.at === 'mitte' && mitte.player.onIsland && spaet.mode === 'rudern' && spaet.trip?.target === null && spaet.toasts.some((t) => t.includes('dunkel')) && spaetHeim.at === null && spaetHeim.mode === 'play') note('✓ Inseln: auf der großen Insel – um halb sieben rudert Mika von selbst heim (»Es wird dunkel …«)');
  else fail(`Inseln: spät ${JSON.stringify({ mitte: { at: mitte.at, player: mitte.player }, spaet: { mode: spaet.mode, trip: spaet.trip, toasts: spaet.toasts }, heim: { at: spaetHeim.at, mode: spaetHeim.mode } })}`);

  // 9) Abends bleibt das Boot am Steg (echte Taste): die Einblendung und Mika sagen, warum
  await z(() => window.zomfy.setTime(19, 0));
  const abendIt = await standAt('ruderboot');
  const hinweis = await z(() => window.zomfyView().hinweis || null);
  await quiet();
  await tap('KeyE');
  await step(200);
  const abend = await z(() => ({ ...window.zomfy.isles(), gedanke: window.zomfyView().gedanke }));
  if (abendIt === 'ruderboot' && abend.blocked === 'zeit' && abend.mode === 'play' && String(abend.gedanke || '').includes('zu spät') && String(hinweis || '').includes('sieben')) note(`✓ Inseln: abends bleibt das Boot am Steg – »${hinweis}«, E: »${abend.gedanke}«`);
  else fail(`Inseln: abends ${JSON.stringify({ abendIt, hinweis, blocked: abend.blocked, mode: abend.mode, gedanke: abend.gedanke })}`);

  // 10) Speichern v30 auf einer Insel: nach dem Neuladen am Steg, alles Gefundene bleibt
  await z(() => {
    window.zomfy.setTime(10, 0);
    window.zomfy.game.isles.row('nord');
  });
  await untilPlay();
  await z(() => window.zomfy.game.quietSave());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.__zomfyStep, null, { timeout: 30000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  await step(300);
  const geladen = await z(() => ({ v: window.zomfy.state().version, i: window.zomfy.isles() }));
  const gi = geladen.i;
  if (geladen.v === 30 && gi.data.boat && gi.at === null && gi.mapIsle === null && Math.hypot(gi.player.x - 16.6, gi.player.z + 1.45) < 0.6 && gi.data.visited.length === 3 && ['zelt', 'netz', 'katze', 'kuerbisse'].every((f) => gi.data.found.includes(f)) && gi.data.cat && gi.props.Mieze === true && gi.props['Insel: zelt'] === true && gi.props['Insel: netz'] === false) note('✓ Inseln: Speichern v30 – auf der Insel gespeichert, am Steg aufgewacht; besuchte Inseln, Funde und die Katze bleiben');
  else fail(`Inseln: Speichern ${JSON.stringify({ v: geladen.v, at: gi.at, mapIsle: gi.mapIsle, player: gi.player, data: gi.data, props: gi.props })}`);
  checkMessages(session);
  await session.context.close();

  // 11) Migration v29 → v30: noch keine Insel, keine Katze
  const alt = await openGame(browser, `${url}index.html?test&playtest`, 'Inseln: Migration', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-n6-mig')) {
        localStorage.clear();
        localStorage.setItem('zomfy-towers.spielstand', JSON.stringify({ version: 29, difficulty: 'ausgewogen', time: { day: 9, minute: 180 }, player: { x: 4, z: 2, hp: 90, name: 'Kira' }, inventory: { holz: 5 }, world: { houseLevel: 1, homeHp: 300, buildings: [] }, stats: { nightsWon: 5 }, flags: { introGesehen: true } }));
        sessionStorage.setItem('zomfy-n6-mig', '1');
      }
    },
  });
  await alt.page.evaluate(() => window.__zomfyStep(300));
  const mig = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, i: window.zomfy.isles() }));
  if (mig.v === 30 && !mig.i.data.boat && mig.i.data.visited.length === 0 && mig.i.data.found.length === 0 && !mig.i.data.cat && mig.i.props.Mieze === false && mig.i.interactions.find((q) => q.id === 'ruderboot')?.prompt === 'bootFlicken') note('✓ Inseln: Migration v29 → v30 – noch keine Insel besucht, keine Katze; das Ruderboot am Steg muss erst abgedichtet werden');
  else fail(`Inseln: Migration ${JSON.stringify(mig)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * N4 (Rückmeldung aus dem Probespiel, 29.09.): Hinweise kommen über Funk – Edda unten
 * rechts im Comic-Feld mit Foto und Sprechblase, nicht mehr mitten im Bild; ein Klick
 * tippt fertig und schließt; Nachtplan und Meldungen stehen rechts. Die Laterne geht
 * morgens aus. Das Haus ist größer. Über das Funkgerät in der Stube bestellt Mika mit
 * echten Tasten aus Balduins Katalog; am nächsten Morgen bringt er es, die Lieferkarte
 * zeigt es groß, dann steht es im Haus. Speichern v30 und Migration v22 → v30.
 * Bilder: funk, katalog, lieferung, stube-gross.
 */
async function runPlaytestFixChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Probespiel (N4)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-n4')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-n4', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(80);
  };
  await z(() => {
    window.__zomfyHold = true;
    window.zomfy.setHorde(false);
    window.zomfy.setWeather('klar', true);
  });

  // 1) Edda meldet sich über Funk – unten rechts, über der Bauleiste; ein Klick tippt fertig, der zweite schließt
  await step(700);
  const f1 = await z(() => window.zomfy.funk());
  await page.screenshot({ path: join(SHOTS, 'funk.png') });
  note('  Screenshot: screenshots/funk.png');
  const r = f1.rect;
  const rechtsUnten = r && r.x > f1.ui.w * 0.45 && r.y > f1.ui.h * 0.35 && r.x + r.w <= f1.ui.w;
  const hint = await z(() => window.zomfy.game.hud.hint?.time || 0);
  if (f1.current?.key === 'start' && f1.current.text.includes('Edda') && rechtsUnten && f1.queue.includes('laufen') && !hint) note(`✓ Funk (N4): Edda meldet sich unten rechts (x ${r.x}, y ${r.y}, ${r.w}×${r.h}), der erste Schritt der Einführung (laufen, N5) wartet dahinter – nichts mehr mitten im Bild`);
  else fail(`Funk: ${JSON.stringify({ f1, hint })}`);
  const box = await page.evaluate(() => {
    const c = document.querySelectorAll('canvas');
    const ui = c[c.length - 1].getBoundingClientRect();
    const f = window.zomfy.funk();
    const k = ui.width / f.ui.w;
    return { x: ui.left + (f.rect.x + f.rect.w / 2) * k, y: ui.top + (f.rect.y + f.rect.h / 2) * k };
  });
  await page.mouse.click(box.x, box.y);
  await step(60);
  const typed = await z(() => window.zomfy.funk());
  await page.mouse.click(box.x, box.y);
  await step(600);
  const next = await z(() => window.zomfy.funk());
  if (typed.current?.key === 'start' && next.current?.key === 'laufen') note('✓ Funk (N4): ein Klick aufs Feld tippt fertig, der zweite schließt – dann kommt der erste Schritt (laufen)');
  else fail(`Funk-Klick: ${JSON.stringify({ typed, next })}`);

  // 2) Die Laterne geht morgens aus (tagsüber lief Mika sonst immer mit Licht herum)
  const laterne = await z(() => {
    const Z = window.zomfy;
    Z.setTime(7, 25);
    if (!Z.game.player.holdingLantern) Z.toggleLantern();
    return Z.game.player.holdingLantern;
  });
  await step(8000);
  const aus = await z(() => ({ an: window.zomfy.game.player.holdingLantern, zeit: window.zomfy.game.state.time.minute }));
  if (laterne && !aus.an) note('✓ Laterne (N4): um halb acht löscht Mika sie und steckt sie weg');
  else fail(`Laterne: ${JSON.stringify({ laterne, aus })}`);

  // 3) Das größere Haus: die Stube fast zehn Meter breit, sechs Meter vierzig Luft bis zur Rückwand
  const haus = await z(() => {
    const Z = window.zomfy;
    const e = Z.interior().entry;
    Z.teleport(e.x, e.z, Math.PI);
    const i = Z.interior();
    const wohn = i.rooms.find((r) => r.id === 'wohnraum');
    const frei = Z.probeWalk(e.x, e.z, 0, -1, 90); // von der Tür geradeaus zum Kamin
    return { breit: wohn.maxX - wohn.minX, tief: i.bounds.maxZ - i.bounds.minZ, weg: frei ? e.z - frei.z : 0 };
  });
  await step(400);
  await page.screenshot({ path: join(SHOTS, 'stube-gross.png') });
  note('  Screenshot: screenshots/stube-gross.png');
  if (haus.breit >= 9.5 && haus.tief >= 7 && haus.weg >= 4) note(`✓ Haus (N4): die Stube ist ${haus.breit.toFixed(2)} m breit und ${haus.tief.toFixed(2)} m tief – von der Tür läuft Mika ${haus.weg.toFixed(1)} m geradeaus, ohne anzustoßen`);
  else fail(`Haus: ${JSON.stringify(haus)}`);

  // 4) Das Funkgerät in der Stube: Balduin anfunken, im Katalog mit echten Tasten die Standuhr bestellen
  await z(() => {
    const Z = window.zomfy;
    Z.setDay(3);
    Z.setTime(10, 0);
    Z.setFlag('balduinGetroffen');
    Z.give({ teile: 40 });
    Z.game.funk.clear();
    const r = Z.game.world.interactions.find((i) => i.id === 'radio');
    Z.teleport(r.x + 0.2, r.z + 0.9, Math.PI);
  });
  await step(300);
  await tap('KeyE');
  for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
  await step(400);
  const menu = await z(() => window.zomfy.dialogInfo());
  const wahl = menu.answers?.findIndex((a) => a.aktion === 'katalog') ?? -1;
  for (let s = 0; s < Math.abs(wahl - (menu.choice ?? 0)); s++) await tap(wahl > (menu.choice ?? 0) ? 'KeyS' : 'KeyW');
  await tap('KeyE');
  await step(400);
  const offen = await z(() => window.zomfy.catalog());
  // Die Standuhr steht auf der ersten Seite (Stube): W/S bis zu ihr
  const ziel = offen.items.indexOf('standuhr');
  for (let s = 0; s < Math.abs(ziel - offen.focus); s++) await tap(ziel > offen.focus ? 'KeyS' : 'KeyW');
  await step(300);
  await page.screenshot({ path: join(SHOTS, 'katalog.png') });
  note('  Screenshot: screenshots/katalog.png');
  const teileVor = await z(() => window.zomfy.state().inventory.teile);
  await tap('KeyE');
  const bestellt = await z(() => ({ c: window.zomfy.catalog(), teile: window.zomfy.state().inventory.teile }));
  await tap('KeyD');
  const seite = await z(() => window.zomfy.catalog().page);
  await tap('Escape');
  const zu = await z(() => window.zomfy.catalog());
  if (wahl >= 0 && offen.open && offen.page === 0 && bestellt.c.orders.some((o) => o.id === 'standuhr') && teileVor - bestellt.teile === 20 && seite === 1 && !zu.open && zu.mode === 'play') {
    note(`✓ Katalog (N4): Funkgerät → »Balduin – den Katalog« (echte Tasten), die Standuhr bestellt (−20 Zombieteile), D blättert zur Küche, Esc schließt`);
  } else fail(`Katalog: ${JSON.stringify({ menu, wahl, offen, bestellt, seite, zu })}`);

  // 5) Am nächsten Morgen bringt Balduin sie: Lieferkarte groß, dann steht sie in der Stube
  await z(() => {
    const Z = window.zomfy;
    Z.setTime(22, 0);
    Z.nextMorning();
    Z.setTime(7, 0);
    Z.game.deliverOrders(); // wie beim Anlegen am Steg (trader.js)
  });
  await step(300);
  const karte = await z(() => window.zomfy.catalog());
  await page.screenshot({ path: join(SHOTS, 'lieferung.png') });
  note('  Screenshot: screenshots/lieferung.png');
  await step(400);
  await tap('KeyE');
  const danach = await z(() => ({ c: window.zomfy.catalog(), obj: Boolean(window.zomfy.game.furnishing.objects.get('standuhr')) }));
  if (karte.mode === 'lieferung' && karte.card === 'standuhr' && danach.c.mode === 'play' && danach.c.owned.includes('standuhr') && !danach.c.orders.length && danach.obj) note('✓ Lieferung (N4): am Morgen bringt Balduin die Standuhr – die Karte zeigt sie groß, E schließt, sie steht in der Stube');
  else fail(`Lieferung: ${JSON.stringify({ karte, danach })}`);

  // 6) Speichern v30 mit einer offenen Bestellung
  const saved = await z(() => {
    window.zomfy.game.furnishing.order('flickenteppich');
    window.zomfy.save();
    const raw = JSON.parse(localStorage.getItem('zomfy-towers.spielstand'));
    return { v: raw.version, orders: raw.world?.orders, furniture: raw.world?.furniture };
  });
  if (saved.v === 30 && saved.orders?.[0]?.id === 'flickenteppich' && saved.furniture?.includes('standuhr')) note('✓ Probespiel (N4): Speichern v30 mit Bestellung und geliefertem Stück');
  else fail(`N4 Speichern: ${JSON.stringify(saved)}`);
  checkMessages(session);
  await session.context.close();

  // 7) Migration v22 → v30: keine Bestellungen, wer drinnen stand, steht hinter der neuen Haustür
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Probespiel: Migration v22 → v30', {
    init: () => {
      const s = {
        version: 22,
        time: { day: 6, minute: 240 },
        player: { x: 309.5, z: 3.2, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [], furniture: ['bild', 'lesesessel'], houseLevel: 1 },
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const mig = await alt.page.evaluate(() => {
    const st = window.zomfy.state();
    const e = window.zomfy.interior().entry;
    return { v: st.version, orders: st.world.orders, furniture: st.world.furniture, d: Math.hypot(st.player.x - e.x, st.player.z - e.z), inside: window.zomfy.interior().inside };
  });
  if (mig.v === 30 && Array.isArray(mig.orders) && !mig.orders.length && mig.furniture.includes('lesesessel') && mig.d < 1 && mig.inside) note('✓ Probespiel (N4): Migration v22 → v30 – keine Bestellungen, die Möbel bleiben, Mika steht hinter der neuen Haustür');
  else fail(`N4 Migration: ${JSON.stringify(mig)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M29 (Abschnitt `bindung`): Bindung – gemeinsame Zeit hebt die stille Stufe (erstes
 * Gespräch des Tages, Kartenabend, abends am Feuer), jede Art zählt höchstens einmal am
 * Tag; ein wartender Moment zeigt über dem Kopf »möchte reden«, E erzählt ihn statt des
 * gewohnten Gesprächs; ab »vertraut« grüßt die Figur morgens (Sprechblase), ab
 * »befreundet« beim Spitznamen und setzt sich abends zu Mika ans Feuer; der dritte Moment
 * bringt das Erinnerungsstück aufs Bord in der Stube; die Menschenkunde zeigt die Stufe
 * als Wort; Speichern v30 und Migration v24 → v30.
 * Bilder: bindung-zeichen, bindung-feuer, geschenk, erinnerungsbord.
 */
async function runBondChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Bindung (M29)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m29')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m29', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(80);
  };
  const talk = async (id) => {
    const p = await z((i) => window.zomfy.npcPos(i), id);
    await z(([x, zz]) => window.zomfy.teleport(x, zz + 1.0, Math.PI), [p.x, p.z]);
    await step(300);
    await tap('KeyE');
    await step(100);
    return z(() => window.zomfy.dialogInfo());
  };
  // Dialog mit echten Tasten zu Ende klicken (Antworten: die vorgewählte)
  const finish = async () => {
    for (let k = 0; k < 16; k++) {
      const d = await z(() => window.zomfy.dialogInfo());
      if (!d.open) return;
      if (d.answers?.length) {
        for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
        await step(400);
      }
      await tap('KeyE');
    }
  };
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'werkbankGebaut', 'blitzHinweis']) Z.setFlag(f);
    Z.setHorde(false);
    Z.setWeather('klar', true);
    Z.setDay(5);
    Z.setSurvivor('hilde', 3);
    Z.setTime(10, 0);
  });
  await step(400);

  // 1) Das erste Gespräch des Tages zählt, ein zweites am selben Tag nicht
  const d1 = await talk('hilde');
  await finish();
  await step(800);
  const b1 = await z(() => window.zomfy.bonds().hilde);
  await talk('hilde');
  await finish();
  await step(800);
  const b2 = await z(() => window.zomfy.bonds().hilde);
  if (d1.open && d1.speaker === 'hilde' && b1.pts === 0.5 && b1.kinds.reden === 1 && b2.pts === 0.5) note(`✓ Bindung: das erste Gespräch des Tages zählt (${b1.pts}), ein zweites am selben Tag nicht – Hilde bleibt »${b2.word}«`);
  else fail(`Bindung: Gespräch ${JSON.stringify({ d1, b1, b2 })}`);

  // 2) Gemeinsame Zeit hebt die Stufe: ein Kartenabend, dann wartet ein Moment (Zeichen über dem Kopf)
  const up = await z(() => {
    const Z = window.zomfy;
    Z.setBond('hilde', 2.5);
    Z.bondAdd('hilde', 'karten');
    const again = Z.bondAdd('hilde', 'karten'); // am selben Tag zählt es nicht noch einmal
    return { b: Z.bonds().hilde, again };
  });
  const hp = await z(() => window.zomfy.npcPos('hilde'));
  await z(([x, zz]) => window.zomfy.teleport(x + 1.5, zz + 2.5, Math.PI), [hp.x, hp.z]);
  await step(600);
  await page.screenshot({ path: join(SHOTS, 'bindung-zeichen.png') });
  note('  Screenshot: screenshots/bindung-zeichen.png');
  if (up.b.stage === 1 && up.b.word === 'vertraut' && up.b.wants && up.again === false) note(`✓ Bindung: ein Kartenabend (erstes Mal: 3) macht Hilde und Mika vertraut – über ihrem Kopf »möchte reden«, am selben Tag zählt kein zweiter`);
  else fail(`Bindung: Aufstieg ${JSON.stringify(up)}`);

  // 3) E erzählt den Moment statt des gewohnten Gesprächs
  const m1 = await talk('hilde');
  await finish();
  await step(500);
  const after1 = await z(() => window.zomfy.bonds().hilde);
  if (m1.open && m1.text?.startsWith('Kindchen, komm mal her') && after1.moment === 1 && !after1.wants) note('✓ Bindung: E erzählt den ersten Moment (»Kindchen, komm mal her …«) statt des gewohnten Gesprächs');
  else fail(`Bindung: Moment ${JSON.stringify({ m1, after1 })}`);

  // 4) Morgens grüßt die Vertraute – ab »befreundet« mit Spitznamen
  const greet = async () => {
    await z(() => {
      const Z = window.zomfy;
      Z.setTime(22, 0);
      Z.nextMorning();
      Z.setTime(7, 30);
    });
    await step(300);
    const p = await z(() => window.zomfy.npcPos('hilde'));
    await z(([x, zz]) => window.zomfy.teleport(x + 1.2, zz + 1.2, Math.PI), [p.x, p.z]);
    await step(700);
    return z(() => window.zomfy.game.hud.bubbles.map((b) => b.text));
  };
  const g1 = await greet();
  await z(() => window.zomfy.setBond('hilde', 8));
  const g2 = await greet();
  if (g1.length === 1 && g1[0].includes('Mika') && g2.length === 1 && g2[0].includes('Mikachen')) note(`✓ Bindung: morgens grüßt Hilde (»${g1[0]}«), befreundet beim Spitznamen (»${g2[0]}«)`);
  else fail(`Bindung: Gruß ${JSON.stringify({ g1, g2 })}`);

  // 5) Abends am Feuer: Mika ruht sich aus, die Freundin setzt sich dazu (gemeinsame Zeit »feuer«)
  await z(() => window.zomfy.game.dialog.finish?.(null));
  await z(() => window.zomfy.setTime(18, 20));
  await step(300);
  const fire = await z(() => {
    const it = window.zomfy.game.world.interactions.find((i) => i.id === 'feuer');
    window.zomfy.teleport(it.x + 0.2, it.z + 1.3, Math.PI);
    return { x: it.x, z: it.z };
  });
  await step(300);
  await tap('KeyE');
  for (let k = 0; k < 6; k++) {
    const d = await z(() => window.zomfy.dialogInfo());
    if (!d.open || d.answers.length) break;
    await tap('KeyE');
  }
  // »Bis zur Nacht ausruhen« wählen (nicht die vorgewählte, harmlose Antwort)
  const rest = await z(() => {
    const d = window.zomfy.dialogInfo();
    return d.answers.findIndex((a) => a.aktion && a.aktion.startsWith('warten'));
  });
  for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
  await step(400);
  const choice = await z(() => window.zomfy.dialogInfo().choice);
  for (let s = 0; s < Math.abs(rest - choice); s++) await tap(rest > choice ? 'KeyS' : 'KeyW');
  await tap('KeyE');
  await step(1200);
  const atFire = await z(() => {
    const Z = window.zomfy;
    const p = Z.npcPos('hilde');
    return { mode: Z.game.mode, ids: Z.game.bonds.fire?.ids || [], d: Math.hypot(p.x - (Z.game.world.interactions.find((i) => i.id === 'feuer').x), p.z - (Z.game.world.interactions.find((i) => i.id === 'feuer').z)), feuer: Z.bonds().hilde.kinds.feuer || 0 };
  });
  for (let k = 0; k < 40 && (await z(() => window.zomfy.game.mode)) === 'sleep'; k++) await step(250);
  await step(400);
  await page.screenshot({ path: join(SHOTS, 'bindung-feuer.png') });
  note('  Screenshot: screenshots/bindung-feuer.png');
  if (rest >= 0 && atFire.ids.includes('hilde') && atFire.feuer === 1 && atFire.d < 2.5) note(`✓ Bindung: abends am Feuer ausgeruht – Hilde setzt sich dazu (${atFire.d.toFixed(1)} m vom Feuer), gemeinsame Zeit »feuer«`);
  else fail(`Bindung: Feuer ${JSON.stringify({ rest, fire, atFire })}`);

  // 6) Eng: die beiden übrigen Momente, der dritte bringt das Posthorn aufs Bord in der Stube
  await z(() => {
    const Z = window.zomfy;
    Z.setBond('hilde', 15);
    Z.setTime(10, 0);
  });
  await step(300);
  await talk('hilde');
  await finish();
  await step(800);
  const m3 = await talk('hilde');
  await finish();
  await step(800);
  // Die Geschenkkarte zeigt das Stück groß wie im Katalog; E schließt sie (echte Taste)
  const card = await z(() => ({ mode: window.zomfy.game.mode, card: window.zomfy.catalog().card }));
  await page.screenshot({ path: join(SHOTS, 'geschenk.png') });
  note('  Screenshot: screenshots/geschenk.png');
  for (let w = 0; w < 4; w++) await step(100);
  await tap('KeyE');
  await step(300);
  const eng = await z(() => ({ mode: window.zomfy.game.mode, b: window.zomfy.bonds().hilde, keep: window.zomfy.keepsakes(), shown: Boolean(window.zomfy.game.world.keepsakeItems?.posthorn?.visible), board: Boolean(window.zomfy.game.world.keepsakeBoards?.visible) }));
  if (card.mode === 'lieferung' && card.card?.gift === 'posthorn' && eng.mode === 'play') note('✓ Bindung: die Geschenkkarte zeigt Hildes Posthorn groß, E schließt sie');
  else fail(`Bindung: Geschenkkarte ${JSON.stringify({ card, mode: eng.mode })}`);
  if (eng.b.word === 'eng' && eng.b.moment === 3 && m3.text?.includes('Setz dich') && eng.keep.includes('hilde') && eng.shown && eng.board) note('✓ Bindung: eng – der dritte Moment schenkt Mika das Posthorn, es steht im Erinnerungsregal der Stube');
  else fail(`Bindung: Erinnerungsstück ${JSON.stringify({ m3, eng })}`);
  await z(() => {
    const Z = window.zomfy;
    // Mika rechts unterhalb des Regals, damit das Posthorn frei zu sehen ist; Eddas Feld und Gedanken weg
    const o = Z.game.world.keepsakeItems.posthorn;
    const w = o.getWorldPosition(o.position.clone());
    Z.teleport(w.x + 1.6, w.z + 1.1, Math.PI);
    Z.game.funk.clear();
    Z.game.hud.speech = null;
  });
  await step(900);
  await page.screenshot({ path: join(SHOTS, 'erinnerungsbord.png') });
  note('  Screenshot: screenshots/erinnerungsbord.png');

  // 7) Menschenkunde: die Stufe als Wort, das Stück darunter
  const buch = await z(() => {
    const g = window.zomfy.game;
    g.menu.open?.();
    g.mode = 'menu';
    g.menu.go('buch');
    g.menu.page = 'menschen';
    g.menu.bookCache = null;
    const rows = g.menu.bookData().rows.map((r) => ({ label: r.label, right: r.right, detail: r.detail.map((d) => d.text).join(' ') }));
    g.menu.close?.();
    g.mode = 'play';
    return rows;
  });
  const hilde = buch.find((r) => r.label === 'Oma Hilde');
  if (hilde && hilde.right === 'eng' && hilde.detail.includes('Posthorn')) note(`✓ Bindung: Menschenkunde – ${hilde.label} »${hilde.right}«, das Posthorn in der Stube`);
  else fail(`Bindung: Menschenkunde ${JSON.stringify(buch)}`);

  // 8) Geteilte Szene: nach einem Durchbruch reden Bert und Hilde morgens am Feuer darüber
  await z(() => {
    const Z = window.zomfy;
    Z.setSurvivor('bert', 3);
    Z.setTime(22, 0);
    Z.nextMorning();
    Z.setTime(7, 0);
    Z.teleport(9, 6, 0); // weit weg vom Feuer: noch hört Mika nichts
    Z.sceneMorning(['durchbruch']);
  });
  await step(2500);
  const chosen = await z(() => window.zomfy.scenes());
  for (let k = 0; k < 20 && (await z(() => window.zomfy.scenes().people.some((p) => p?.walking))); k++) await step(500);
  const waiting = await z(() => window.zomfy.scenes());
  await z(() => {
    const c = window.zomfy.game.world.interactions.find((i) => i.id === 'feuer');
    window.zomfy.teleport(c.x, c.z + 3.2, Math.PI);
  });
  await step(300);
  const talking = await z(() => window.zomfy.scenes());
  await page.screenshot({ path: join(SHOTS, 'szene-feuer.png') });
  note('  Screenshot: screenshots/szene-feuer.png');
  for (let k = 0; k < 40 && (await z(() => window.zomfy.scenes().running)); k++) await step(500);
  await step(600);
  const after = await z(() => window.zomfy.scenes());
  await step(3000);
  const again = await z(() => window.zomfy.scenes());
  const firstLine = talking.bubbles[0]?.text || '';
  const facing = waiting.people.length === 2 && waiting.people.every((p) => p.talking && !p.walking) && Math.abs(waiting.people[0].x - waiting.people[1].x) > 2.5;
  if (chosen.pending && ['torSchuld', 'lagerAufraeumen'].includes(chosen.pending.id) && chosen.pending.cast.includes('bert') && chosen.pending.cast.includes('hilde') && facing && !waiting.running && talking.running && talking.bubbles.length === 1 && after.seen.includes(chosen.pending.id) && !after.running && !after.pending && !again.pending && after.people.length === 0)
    note(`✓ Szenen: nach dem Durchbruch gehen ${chosen.pending.cast.join(' und ')} ans Feuer, einander zugewandt; erst als Mika dazukommt, reden sie (»${firstLine}«), danach ist die Szene gespielt und kommt am selben Morgen nicht noch einmal`);
  else fail(`Szenen: ${JSON.stringify({ chosen, waiting, talking, after, again })}`);

  // 9) Speichern v30 (auch die gespielten Szenen)
  const saved = await z(() => {
    window.zomfy.save();
    const raw = JSON.parse(localStorage.getItem('zomfy-towers.spielstand'));
    return { v: raw.version, hilde: raw.bonds?.hilde, seen: raw.scenes?.seen };
  });
  if (saved.v === 30 && saved.hilde?.moment === 3 && saved.hilde.pts >= 15 && saved.seen?.length === 1) note('✓ Bindung: Speichern v30 mit gemeinsamer Zeit, erzählten Momenten und gespielten Szenen');
  else fail(`Bindung: Speichern ${JSON.stringify(saved)}`);
  checkMessages(session);
  await session.context.close();

  // 10) Migration v24 → v30: alle beginnen bei »fremd«
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Bindung: Migration v24 → v30', {
    init: () => {
      const s = {
        version: 22,
        time: { day: 9, minute: 300 },
        player: { x: 2, z: 3, facing: 0, name: 'Mika', look: {} },
        inventory: { holz: 5, stein: 2, fasern: 1, stoff: 0, schrott: 7, teile: 0, zahnraeder: 0, moderkerne: 0 },
        world: { mapSeed: 3, buildings: [] },
        survivors: { hilde: { stage: 3, day: 3, tent: null, errand: 2 } },
        cards: { evenings: 2, lastDay: 8, stage: 1, blind: false, back: 'laub', backs: ['laub'], stakes: [], duty: null, people: {} },
      };
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify(s));
    },
  });
  const mig = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, bonds: window.zomfy.state().bonds, hilde: window.zomfy.bonds().hilde }));
  if (mig.v === 30 && mig.bonds && Object.values(mig.bonds).every((b) => !b.pts && !b.moment) && mig.hilde.word === 'fremd') note('✓ Bindung: Migration v24 → v30 – alle beginnen bei »fremd«');
  else fail(`Bindung: Migration ${JSON.stringify(mig)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M30 (Abschnitt `waffen`): Der Waffenschrank in der Stube ist zu, bis die erste Nacht
 * gehalten ist – dann sagt Edda, wo der Schlüssel liegt, und im Vorrat liegen Patronen,
 * Schrot und Leuchtkugeln. E öffnet den Schrank (echte Taste), S und E nehmen die Pistole
 * in die Schnellleiste, Q ändert, wer sie im Notfall nimmt, im Gestell stehen die langen
 * Waffen. Draußen lädt ein echter Klick nach, der nächste schießt: Treffer, das Magazin
 * sinkt, eine Hülse bleibt liegen, eine Leuchtspur, der Knall lockt einen Schlurfer aus
 * 9 m; leer klickt es nur. Die Leuchtkugel macht Licht und blendet, die Doppelflinte trifft
 * im Fächer. Am Übungsplatz übt Hilde (echte Tasten) zwei Spielstunden, Mika ist dabei
 * (gemeinsame Zeit); nach der zweiten Übung ist sie geübter. Speichern v30 und
 * Migration v25 → v30. Bilder: waffenschrank, schuss, uebungsplatz.
 */
async function runArmsChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Waffen (M30)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m30')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m30', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(80);
  };
  const clickWorld = async (x, y, zz, after = 40) => {
    const s = await z(([a, b, c]) => window.zomfy.screenOf(a, b, c), [x, y, zz]);
    await page.mouse.move(s.x, s.y);
    await step(60);
    await page.mouse.click(s.x, s.y);
    await step(after);
  };
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'werkbankGebaut', 'blitzHinweis']) Z.setFlag(f);
    Z.setHorde(false);
    Z.setWeather('klar', true);
    Z.setDay(3);
    Z.setSurvivor('hilde', 3);
    Z.setSurvivor('juna', 3);
    Z.setTime(10, 0);
  });
  await step(400);

  // 1) Der Schrank ist zu – ein Gedanke, kein Fenster
  const cab = await z(() => {
    const it = window.zomfy.game.world.interactions.find((i) => i.id === 'waffenschrank');
    return it ? { x: it.x, z: it.z } : null;
  });
  if (!cab) {
    fail('Waffen: keine Einblendung am Waffenschrank');
    await session.context.close();
    return;
  }
  await z(([x, zz]) => window.zomfy.teleport(x, zz + 0.5, Math.PI), [cab.x, cab.z]);
  await step(900);
  await tap('KeyE');
  await step(200);
  const zu = await z(() => ({ mode: window.zomfy.game.mode, gedanke: window.zomfyView().gedanke, unlocked: window.zomfy.arms().unlocked }));
  if (zu.mode === 'play' && !zu.unlocked && zu.gedanke?.includes('Abgeschlossen')) note('✓ Waffen: vor der ersten gehaltenen Nacht ist der Schrank zu (»Abgeschlossen …«)');
  else fail(`Waffen: Schrank zu ${JSON.stringify(zu)}`);

  // 2) Nach der ersten gehaltenen Nacht: Edda sagt, wo der Schlüssel liegt; Munition im Vorrat
  await z(() => {
    window.zomfy.game.state.stats.nightsWon = 1;
  });
  await step(300);
  const auf = await z(() => ({ a: window.zomfy.arms(), funk: window.zomfy.funk() }));
  const eddaSagt = [auf.funk.current?.text || '', ...auf.funk.queue].join(' ');
  if (auf.a.unlocked && auf.a.ammo.patronen === 6 && auf.a.ammo.schrot === 4 && auf.a.ammo.leuchtkugeln === 2 && (eddaSagt.includes('Schlüssel') || auf.funk.said?.includes?.('schluessel') || auf.funk.current)) note('✓ Waffen: nach der ersten Nacht ist der Schrank offen – Edda sagt, wo der Schlüssel liegt; 6 Patronen, 4 Schrot, 2 Leuchtkugeln');
  else fail(`Waffen: Aufschließen ${JSON.stringify(auf)}`);

  // 3) E öffnet den Schrank, S S E nimmt die Pistole, Q gibt die Signalpistole im Notfall Hilde
  await tap('KeyE');
  await step(400);
  const offen = await z(() => window.zomfy.armory());
  await page.screenshot({ path: join(SHOTS, 'waffenschrank.png') });
  note('  Screenshot: screenshots/waffenschrank.png');
  await tap('KeyS');
  await tap('KeyS');
  await tap('KeyE');
  await step(200);
  const genommen = await z(() => ({ a: window.zomfy.arms(), shown: window.zomfy.cabinetShown(), hotbar: [...window.zomfy.game.state.hotbar.slots] }));
  await tap('KeyS'); // Signalpistole
  const vorher = await z(() => window.zomfy.armory().owner);
  await tap('KeyQ');
  const nachher = await z(() => window.zomfy.armory().owner);
  await tap('Escape');
  await step(300);
  const zuMode = await z(() => window.zomfy.game.mode);
  if (offen.open && offen.mode === 'schrank' && genommen.a.taken.includes('pistole') && genommen.hotbar.includes('pistole') && genommen.shown.jagdgewehr && zuMode === 'play') note(`✓ Waffen: E öffnet den Schrank, S S E legt die Pistole in die Schnellleiste, im Gestell stehen die langen Waffen, Esc schließt`);
  else fail(`Waffen: Schrank ${JSON.stringify({ offen, genommen, zuMode })}`);
  if (vorher !== nachher) note(`✓ Waffen: Q wechselt, wer die Signalpistole im Notfall nimmt (${vorher || 'niemand'} → ${nachher || 'niemand'})`);
  else fail(`Waffen: Notfall ${JSON.stringify({ vorher, nachher })}`);

  // 4) Draußen: echter Klick lädt nach, der nächste schießt – Treffer, Hülse, Spur, Lärm
  const hof = await z(() => {
    const Z = window.zomfy;
    Z.teleport(5, 2, -Math.PI / 2);
    const g = Z.game;
    g.selectSlot(g.state.hotbar.slots.indexOf('pistole'));
    g.horde.clear?.();
    const a = Z.spawnZombie('schlurfer', 0, 2);
    const b = Z.spawnZombie('schlurfer', -3, 7); // gut 9 m weg, abseits der Schusslinie
    for (const q of g.horde.list) q.speed = 0; // stehen bleiben (jagen dürfen sie trotzdem)
    return { a, b };
  });
  await step(300);
  const zielA = async () => z((id) => window.zomfy.game.horde.list.find((q) => q.id === id), hof.a);
  let A = await zielA();
  await clickWorld(A.x, 0.8, A.z); // lädt nach (leeres Magazin)
  await step(1500);
  const geladen = await z(() => window.zomfy.arms());
  A = await zielA();
  const hpVorher = A.hp;
  await clickWorld(A.x, 0.8, A.z, 16); // gleich danach: Mündungsfeuer und Leuchtspur stehen noch
  const schuss = await z(() => window.zomfy.arms());
  await page.screenshot({ path: join(SHOTS, 'schuss.png') });
  note('  Screenshot: screenshots/schuss.png');
  A = await zielA();
  await step(1200);
  const danach = await z((id) => ({ a: window.zomfy.arms(), b: window.zomfy.game.horde.list.find((q) => q.id === id)?.state }), hof.b);
  if (geladen.mag.pistole === 6 && geladen.ammo.patronen === 0 && schuss.shots === 1 && schuss.mag.pistole === 5 && (!A || A.hp < hpVorher) && schuss.tracers > 0 && schuss.casings === 1) note(`✓ Waffen: ein echter Klick lädt die Pistole (6 Schuss, der Vorrat leer), der nächste trifft (${hpVorher} → ${A ? Math.round(A.hp) : 0} Leben), Magazin 5, eine Leuchtspur, eine Hülse fliegt`);
  else fail(`Waffen: Schuss ${JSON.stringify({ geladen, schuss, A, hpVorher })}`);
  if (danach.a.noise?.n >= 1 && danach.b === 'chase' && danach.a.casingsResting === 1) note(`✓ Waffen: der Knall lockt den Schlurfer aus 9 m (er jagt Mika), die Hülse liegt am Boden`);
  else fail(`Waffen: Lärm/Hülse ${JSON.stringify(danach)}`);

  // 5) Leer: klickt nur
  await z(() => {
    const g = window.zomfy.game;
    g.state.arms.mag.pistole = 0;
    g.state.inventory.patronen = 0;
    g.horde.clear?.();
  });
  await step(500);
  await clickWorld(0, 0.8, 2);
  await step(100);
  const leer = await z(() => ({ a: window.zomfy.arms(), label: window.zomfy.game.hud.itemLabel?.text }));
  if (leer.a.shots === 1 && leer.label?.includes('Leer')) note('✓ Waffen: ohne Munition klickt es nur (»Klick. Leer.«)');
  else fail(`Waffen: leer ${JSON.stringify(leer)}`);

  // 6) Signalpistole: Leuchtkugel – Lichtinsel, geblendet
  const flare = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.takeArm('signalpistole');
    g.selectSlot(g.state.hotbar.slots.indexOf('signalpistole'));
    const id = Z.spawnZombie('schlurfer', -2, 2);
    for (const q of g.horde.list) q.speed = 0; // stehen bleiben (jagen dürfen sie trotzdem)
    return id;
  });
  await step(300);
  await clickWorld(-2, 0, 2); // lädt
  await step(1800);
  await clickWorld(-2, 0, 2); // schießt
  await step(900);
  const licht = await z((id) => ({ a: window.zomfy.arms(), lit: window.zomfy.litAt(-2, 2), st: window.zomfy.statuses().find((q) => q.id === id) }), flare);
  if (licht.a.flares.length === 1 && licht.a.flares[0].lit && licht.lit && licht.st && JSON.stringify(licht.st).includes('geblendet')) note('✓ Waffen: die Leuchtkugel brennt als Lichtinsel und blendet den Schlurfer darin');
  else fail(`Waffen: Leuchtkugel ${JSON.stringify(licht)}`);

  // 7) Doppelflinte: Fächer
  const flinte = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    g.horde.clear?.();
    Z.takeArm('doppelflinte');
    g.selectSlot(g.state.hotbar.slots.indexOf('doppelflinte'));
    const ids = [Z.spawnZombie('schlurfer', 1.5, 1.6), Z.spawnZombie('schlurfer', 1.5, 2.4), Z.spawnZombie('schlurfer', 1.0, 2.0)];
    for (const q of g.horde.list) q.speed = 0; // stehen bleiben (jagen dürfen sie trotzdem)
    return ids;
  });
  await step(300);
  await clickWorld(1.4, 0.8, 2);
  await step(1900);
  const hpF = await z((ids) => ids.map((id) => window.zomfy.game.horde.list.find((q) => q.id === id)?.hp ?? 0), flinte);
  await clickWorld(1.4, 0.8, 2);
  await step(200);
  const hpF2 = await z((ids) => ids.map((id) => window.zomfy.game.horde.list.find((q) => q.id === id)?.hp ?? 0), flinte);
  const getroffen = hpF.filter((h, k) => hpF2[k] < h).length;
  if (getroffen >= 2) note(`✓ Waffen: die Doppelflinte trifft im Fächer (${getroffen} von 3 Schlurfern)`);
  else fail(`Waffen: Flinte ${JSON.stringify({ hpF, hpF2 })}`);

  // 8) Übungsplatz: bauen, E, Hilde wählen (echte Tasten), zwei Spielstunden, Mika dabei
  const platz = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    g.horde.clear?.();
    Z.give({ holz: 40, fasern: 20, schrott: 10 });
    for (const [i, j] of [[2, 5], [1, 6], [3, 6], [0, 5], [5, 5], [6, 3], [-3, 5]]) {
      if (Z.build('uebungsplatz', i, j) === 'ok') return { i, j };
    }
    return null;
  });
  const ground = await z(() => {
    const b = window.zomfy.game.world.buildings.list.find((q) => q.type === 'uebungsplatz');
    if (!b) return null;
    const c = window.zomfy.game.world.buildings.bounds(b);
    const it = window.zomfy.game.world.interactions.find((i) => i.building === b.id);
    return { x: c.x, z: c.z, it: it ? { x: it.x, z: it.z } : null };
  });
  if (!platz || !ground?.it) fail(`Waffen: Übungsplatz nicht gebaut ${JSON.stringify({ platz, ground })}`);
  else {
    await z(([x, zz]) => {
      window.zomfy.setTime(9, 0);
      window.zomfy.teleport(x, zz + 1.2, Math.PI);
    }, [ground.it.x, ground.it.z]);
    await step(500);
    await tap('KeyE');
    for (let w = 0; w < 30 && !(await z(() => window.zomfy.game.dialog.complete)); w++) await step(200);
    await step(300);
    const frage = await z(() => window.zomfy.dialogInfo());
    const want = frage.answers.findIndex((a) => a.aktion === 'ueben:hilde');
    for (let s = 0; s < Math.abs(want - frage.choice); s++) await tap(want > frage.choice ? 'KeyS' : 'KeyW');
    await tap('KeyE');
    await step(600);
    const laeuft = await z(() => window.zomfy.training());
    for (let k = 0; k < 16; k++) await step(500); // sie geht hin und übt
    const pos = await z(() => window.zomfy.npcPos('hilde'));
    await page.screenshot({ path: join(SHOTS, 'uebungsplatz.png') });
    note('  Screenshot: screenshots/uebungsplatz.png');
    await z(() => window.zomfy.setTime(11, 5));
    await step(400);
    const eins = await z(() => ({ t: window.zomfy.training(), bond: window.zomfy.bonds().hilde }));
    const nah = pos && Math.hypot(pos.x - ground.x, pos.z - ground.z) < 3;
    if (frage.answers.some((a) => a.aktion === 'ueben:hilde') && frage.answers.at(-1)?.standard && laeuft.session?.id === 'hilde' && nah && eins.t.data.hilde?.done === 1 && !eins.t.session && (eins.bond.kinds.ueben || 0) === 1) note(`✓ Waffen: am Übungsplatz fragt E »Wer übt heute?« (vorgewählt »Heute nicht.«), Hilde geht hin und übt zwei Spielstunden, Mika war dabei (gemeinsame Zeit)`);
    else fail(`Waffen: Übung ${JSON.stringify({ frage, laeuft, pos, ground, eins })}`);
    // Am nächsten Tag noch einmal: dann ist sie geübter (Stufe 1 nach zwei Übungen)
    await z(() => {
      window.zomfy.setDay(4);
      window.zomfy.setTime(9, 0);
      window.zomfy.startTraining('hilde');
    });
    await step(400);
    await z(() => window.zomfy.setTime(11, 5));
    await step(400);
    const zwei = await z(() => window.zomfy.training());
    if (zwei.data.hilde?.level === 1 && zwei.data.hilde.done === 0) note('✓ Waffen: nach der zweiten Übung ist Hilde geübter (Stufe 1 von 3)');
    else fail(`Waffen: Stufe ${JSON.stringify(zwei)}`);
  }

  // 9) Speichern v30 und Neuladen
  await z(() => window.zomfy.game.quietSave());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.__zomfyStep, null, { timeout: 30000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  await step(300);
  const geladen2 = await z(() => ({ v: window.zomfy.state().version, a: window.zomfy.arms(), t: window.zomfy.training(), shown: window.zomfy.cabinetShown() }));
  if (geladen2.v === 30 && geladen2.a.unlocked && geladen2.a.taken.includes('pistole') && geladen2.t.data.hilde?.level === 1 && geladen2.shown.doppelflinte === false) note('✓ Waffen: Speichern v30 – Schrank offen, die genommenen Waffen fehlen im Gestell, Hildes Übung bleibt');
  else fail(`Waffen: Speichern ${JSON.stringify(geladen2)}`);
  checkMessages(session);
  await session.context.close();

  // 10) Migration v25 → v30
  const alt = await openGame(browser, `${url}index.html?test&playtest`, 'Waffen: Migration', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m30-mig')) {
        localStorage.clear();
        localStorage.setItem('zomfy-towers.spielstand', JSON.stringify({ version: 25, time: { day: 6, minute: 180 }, player: { x: 4, z: 2, hp: 90, name: 'Kira' }, inventory: { holz: 5 }, world: { houseLevel: 1, homeHp: 300, buildings: [] }, stats: { nightsWon: 3 }, flags: { introGesehen: true } }));
        sessionStorage.setItem('zomfy-m30-mig', '1');
      }
    },
  });
  await alt.page.evaluate(() => window.__zomfyStep(300));
  const mig = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, a: window.zomfy.arms(), t: window.zomfy.training() }));
  if (mig.v === 30 && mig.a.unlocked && mig.a.ammo.patronen === 6 && Object.keys(mig.t.data).length === 0) note('✓ Waffen: Migration v25 → v30 – wer die erste Nacht schon hatte, findet den Schlüssel gleich; noch niemand hat geübt');
  else fail(`Waffen: Migration ${JSON.stringify(mig)}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * M31 – Die Lagerglocke (Abschnitt `glocke`), nur der Kern: Die Glocke steht nur im Hof
 * (Reiter Einrichten, sobald der Waffenschrank offen ist); tagsüber und ohne Durchbruch
 * sagt E, warum sie schweigt; nach einem Durchbruch hält Mika E (echte Taste) – die Tafel
 * »Wer kommt?« erscheint, die Glocke läutet, die Bewohner treten mit ihren Waffen heraus
 * und kämpfen (Hilde schießt Schrot aus dem Vorrat), B und N gehen nicht, einmal je Nacht;
 * wer zu Boden geht, steht mit E wieder auf; ohne »Verluste« bleibt nur die Waffe im Laub
 * (Balduin bringt Ersatz), mit »Verluste« fällt jemand – nie auf »Gemütlich«; Entwarnung;
 * der Morgen erzählt es und verteilt Wunden; das Erinnerungsbrett am Steg mit echter Taste
 * (Laterne, Karte), die Seite im Herbstbuch; Speichern v30 und Migration v26 → v30
 * (Bilder: glocke-tafel, glocke-kampf, glocke-aufhelfen, erinnerung, erinnerungsbrett).
 */
async function runBellChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Lagerglocke (M31)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m31')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m31', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const tap = async (key) => {
    await page.keyboard.press(key);
    await step(80);
  };
  await z(() => {
    window.__zomfyHold = true;
    const Z = window.zomfy;
    Z.quietChoices();
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'werkbankGebaut', 'blitzHinweis']) Z.setFlag(f);
    Z.setHorde(false);
    Z.setWeather('klar', true);
    Z.setDay(5);
    for (const id of ['hilde', 'bert', 'juna', 'yusuf']) Z.setSurvivor(id, 3);
    Z.setTime(10, 0);
    Z.game.state.stats.nightsWon = 1; // der Waffenschrank ist offen
    Z.give({ holz: 30, schrott: 20, teile: 30 });
  });
  await step(400);
  await z(() => window.zomfy.game.funk.clear());

  // 1) Nur im Hof, im Reiter Einrichten, sobald der Waffenschrank offen ist
  const bau = await z(() => {
    const Z = window.zomfy;
    const tiles = Z.buildOptionsFor('einrichten').map((o) => o.id);
    let draussen = null;
    for (const [i, j] of [[-12, 0], [-14, 2], [2, 10], [0, 11], [14, 4], [3, -12], [-10, -4]]) {
      if (Z.placeCheck('lagerglocke', i, j).reason === 'nurHof') {
        draussen = { i, j };
        break;
      }
    }
    let gebaut = null;
    for (const [i, j] of [[2, -3], [-1, -3], [2, 1], [-2, 0], [3, 2], [-3, -2], [1, 3]]) {
      if (Z.build('lagerglocke', i, j) === 'ok') {
        gebaut = { i, j };
        break;
      }
    }
    const b = Z.game.world.buildings.list.find((q) => q.type === 'lagerglocke');
    const it = b ? Z.game.world.interactions.find((q) => q.building === b.id) : null;
    return { tiles, draussen, gebaut, it: it ? { x: it.x, z: it.z } : null };
  });
  if (bau.tiles.includes('lagerglocke') && bau.draussen && bau.gebaut && bau.it) note(`✓ Lagerglocke (M31): im Reiter Einrichten, sobald der Waffenschrank offen ist; nur im Hof (»Nur im Hof« bei ${bau.draussen.i}, ${bau.draussen.j}), gebaut bei ${bau.gebaut.i}, ${bau.gebaut.j}`);
  else {
    fail(`Lagerglocke: Bau ${JSON.stringify(bau)}`);
    await session.context.close();
    return;
  }

  // 2) Tagsüber sagt E, wofür die Glocke ist
  await z(([x, zz]) => window.zomfy.teleport(x, zz + 0.6, Math.PI), [bau.it.x, bau.it.z]);
  await step(500);
  await tap('KeyE');
  await step(200);
  const tag = await z(() => ({ g: window.zomfyView().gedanke, phase: window.zomfy.bell().phase }));
  // 3) Nachts ohne Durchbruch: »Noch hält das Tor«
  await z(() => {
    const Z = window.zomfy;
    Z.setTime(21, 0);
    Z.game.nights.beginNight(5);
    Z.game.hud.speech = null;
  });
  await step(300);
  await tap('KeyE');
  await step(200);
  const zu = await z(() => ({ g: window.zomfyView().gedanke, blocked: window.zomfy.bell().blocked }));
  if (tag.g?.includes('Nacht') && tag.phase === null && zu.g?.includes('Tor') && zu.blocked === 'keinDurchbruch') note(`✓ Lagerglocke: tagsüber »${tag.g}«, nachts ohne Durchbruch »${zu.g}«`);
  else fail(`Lagerglocke: tags/ohne Durchbruch ${JSON.stringify({ tag, zu })}`);

  // 4) Durchbruch: zwei Schlurfer im Lager – E halten (echte Taste), die Tafel »Wer kommt?«, die Glocke läutet
  await z(() => {
    const Z = window.zomfy;
    for (const [x, zz] of [[-3, 4], [-4.5, 5.5]]) {
      const id = Z.spawnZombie('schlurfer', x, zz);
      const q = Z.game.horde.list.find((o) => o.id === id);
      q.speed = 0;
      q.hp = q.maxHp = 4000; // sie halten durch, bis die Prüfung sie wegnimmt
    }
  });
  await step(400);
  const vor = await z(() => ({ blocked: window.zomfy.bell().blocked, inCamp: window.zomfy.game.state.night.inCamp || 0, schrot: window.zomfy.game.state.inventory.schrot }));
  await page.keyboard.down('KeyE');
  for (let t = 0; t < 900; t += 150) await step(150);
  const mitte = await z(() => window.zomfy.bell());
  await page.screenshot({ path: join(SHOTS, 'glocke-tafel.png') });
  note('  Screenshot: screenshots/glocke-tafel.png');
  for (let t = 0; t < 900; t += 150) await step(150);
  await page.keyboard.up('KeyE');
  await step(100);
  const lauten = await z(() => window.zomfy.bell());
  const leute = mitte.roster.map((r) => r.id).sort().join();
  if (vor.blocked === null && vor.inCamp >= 1 && mitte.hold > 0 && leute === 'bert,hilde,juna,yusuf' && lauten.phase && lauten.night === 5) note(`✓ Lagerglocke: nach dem Durchbruch hält Mika E – die Tafel zeigt, wer kommt (${mitte.roster.map((r) => r.name).join(', ')}), dann läutet die Glocke`);
  else fail(`Lagerglocke: Läuten ${JSON.stringify({ vor, mitte: { hold: mitte.hold, roster: mitte.roster, phase: mitte.phase }, lauten: { phase: lauten.phase, night: lauten.night } })}`);

  // 5) Die Bewohner treten mit ihren Waffen heraus und kämpfen; Hilde schießt Schrot aus dem Vorrat
  for (let k = 0; k < 8; k++) await step(500);
  const raus = await z(() => window.zomfy.bell());
  for (let k = 0; k < 14; k++) await step(500);
  const kampf = await z(() => ({ b: window.zomfy.bell(), schrot: window.zomfy.game.state.inventory.schrot }));
  await page.screenshot({ path: join(SHOTS, 'glocke-kampf.png') });
  note('  Screenshot: screenshots/glocke-kampf.png');
  const states = Object.fromEntries(raus.people.map((p) => [p.id, p.state]));
  const hilde = kampf.b.people.find((p) => p.id === 'hilde');
  if (states.hilde === 'kampf' && states.bert === 'kampf' && states.juna === 'kampf' && states.yusuf === 'arzt' && raus.npcs.hilde?.held === 'doppelflinte' && raus.npcs.bert?.held === 'spaltaxt' && hilde?.shots >= 1 && kampf.schrot < vor.schrot) note(`✓ Lagerglocke: Hilde, Bert und Juna treten mit Doppelflinte, Spaltaxt und Signalpistole heraus, Dr. Yusuf verarztet; Hilde schießt (${hilde.shots}×, Schrot ${vor.schrot} → ${kampf.schrot})`);
  else fail(`Lagerglocke: Kampf ${JSON.stringify({ states, npcs: raus.npcs, hilde, schrot: [vor.schrot, kampf.schrot] })}`);

  // 6) Solange die Glocke läutet: kein Zeitraffer (B), kein Rufen (N); einmal je Nacht
  await tap('KeyB');
  await tap('KeyN');
  const sperre = await z(() => ({ fast: window.zomfy.game.fast, toasts: window.zomfy.game.hud.toasts.map((t) => t.text), again: window.zomfy.game.defense.blocked() }));
  if (!sperre.fast && sperre.toasts.some((t) => t.startsWith('Nicht jetzt – die Glocke')) && sperre.toasts.some((t) => t.startsWith('Erst das Lager')) && sperre.again === 'schonGelaeutet') note('✓ Lagerglocke: kein Zeitraffer und kein Rufen, solange sie läutet – und nur einmal je Nacht');
  else fail(`Lagerglocke: Sperren ${JSON.stringify(sperre)}`);

  // 7) Bert geht zu Boden (eingekesselt) – Mika hält E daneben und hilft ihm auf
  const unten = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    const n = g.survivors.npcs.list.get('bert');
    const id = Z.spawnZombie('schlurfer', n.x + 0.6, n.z + 0.3);
    const q = g.horde.list.find((o) => o.id === id);
    q.speed = 0;
    q.hp = q.maxHp = 4000;
    for (let k = 0; k < 6 && g.defense.people.find((p) => p.id === 'bert').state === 'kampf'; k++) Z.hitPerson('bert', 40);
    return { state: g.defense.people.find((p) => p.id === 'bert').state, x: n.x, z: n.z };
  });
  await z(([x, zz]) => window.zomfy.teleport(x - 0.9, zz + 0.2, Math.PI / 2), [unten.x, unten.z]);
  await step(200);
  const einbl = await z(() => ({ it: window.zomfy.game.currentInteraction, prompt: window.zomfy.game.currentInteraction ? window.zomfy.game.promptText(window.zomfy.game.currentInteraction) : null }));
  await page.keyboard.down('KeyE');
  for (let t = 0; t < 1200; t += 150) await step(150);
  await page.screenshot({ path: join(SHOTS, 'glocke-aufhelfen.png') });
  note('  Screenshot: screenshots/glocke-aufhelfen.png');
  for (let t = 0; t < 1200; t += 150) await step(150);
  await page.keyboard.up('KeyE');
  await step(200);
  const auf = await z(() => ({ p: window.zomfy.bell().people.find((q) => q.id === 'bert'), log: window.zomfy.bell().log }));
  if (unten.state === 'unten' && einbl.it?.rescue === 'bert' && einbl.prompt === 'Aufhelfen (E halten)' && ['rueckzug', 'safe'].includes(auf.p?.state) && auf.log.down.includes('bert')) note(`✓ Lagerglocke: Bert geht eingekesselt zu Boden – »${einbl.prompt}«, Mika hält E, er steht auf und zieht sich zurück`);
  else fail(`Lagerglocke: Aufhelfen ${JSON.stringify({ unten, einbl: { rescue: einbl.it?.rescue, prompt: einbl.prompt }, auf })}`);

  // 8) Ohne »Verluste«: Hilde bleibt zu lange liegen – nur die Doppelflinte bleibt im Laub; auf »Gemütlich« nie Verluste
  const ohne = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.setLosses(false);
    const n = g.survivors.npcs.list.get('hilde');
    const id = Z.spawnZombie('schlurfer', n.x + 0.5, n.z + 0.4);
    const q = g.horde.list.find((o) => o.id === id);
    q.speed = 0;
    q.hp = q.maxHp = 4000;
    for (let k = 0; k < 6 && g.defense.people.find((p) => p.id === 'hilde').state === 'kampf'; k++) Z.hitPerson('hilde', 40);
    const p = g.defense.people.find((o) => o.id === 'hilde');
    const lag = p.state;
    p.rescueT = 0.05;
    g.state.difficulty = 'gemuetlich';
    g.state.losses = true;
    const gemuetlich = g.defense.losses;
    g.state.difficulty = 'ausgewogen';
    g.state.losses = false;
    return { lag, gemuetlich };
  });
  await step(300);
  const ohneNach = await z(() => ({ p: window.zomfy.bell().people.find((q) => q.id === 'hilde'), lost: window.zomfy.bell().lost, stage: window.zomfy.game.state.survivors.hilde.stage, fallen: window.zomfy.bell().fallen.length }));
  if (ohne.lag === 'unten' && !ohne.gemuetlich && ['rueckzug', 'safe'].includes(ohneNach.p?.state) && ohneNach.lost.includes('doppelflinte') && ohneNach.stage === 3 && ohneNach.fallen === 0) note('✓ Lagerglocke: ohne »Verluste« verliert Hilde nur ihre Doppelflinte im Laub und kommt davon; auf »Gemütlich« gibt es nie Verluste');
  else fail(`Lagerglocke: ohne Verluste ${JSON.stringify({ ohne, ohneNach })}`);

  // 9) Mit »Verluste«: Juna bleibt zu lange liegen – sie ist nicht mehr da; das Erinnerungsbrett erscheint
  await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.setLosses(true);
    const n = g.survivors.npcs.list.get('juna');
    const id = Z.spawnZombie('schlurfer', n.x + 0.5, n.z + 0.4);
    const q = g.horde.list.find((o) => o.id === id);
    q.speed = 0;
    q.hp = q.maxHp = 4000;
    for (let k = 0; k < 6 && g.defense.people.find((p) => p.id === 'juna').state === 'kampf'; k++) Z.hitPerson('juna', 40);
    g.defense.people.find((o) => o.id === 'juna').rescueT = 0.05;
  });
  await step(300);
  const fort = await z(() => ({ b: window.zomfy.bell(), stage: window.zomfy.game.state.survivors.juna.stage, npc: window.zomfy.npcPos('juna'), mem: window.zomfy.memorial(), g: window.zomfyView().gedanke }));
  if (fort.stage === 5 && fort.b.fallen.some((f) => f.id === 'juna' && f.to === 5) && !fort.npc?.visible && fort.mem.shown && fort.mem.interaction?.enabled && fort.g?.includes('Laub')) note(`✓ Lagerglocke: mit »Verluste« fällt Juna – angedeutet, nie gezeigt (»${fort.g}«); am Steg erscheint das Erinnerungsbrett`);
  else fail(`Lagerglocke: Verlust ${JSON.stringify({ stage: fort.stage, fallen: fort.b.fallen, npc: fort.npc, mem: fort.mem, g: fort.g })}`);

  // 10) Entwarnung: das Lager ist frei – nach 20 s drei Schläge, alle gehen zurück
  await z(() => window.zomfy.game.horde.clear());
  for (let k = 0; k < 52 && (await z(() => window.zomfy.bell().phase)) !== null; k++) await step(500);
  const frei = await z(() => ({ b: window.zomfy.bell(), toasts: window.zomfy.game.hud.toasts.map((t) => t.text) }));
  if (frei.b.phase === null && frei.b.rings === 3 && frei.b.report?.lines?.length) note(`✓ Lagerglocke: Entwarnung mit drei Schlägen, sobald das Lager 20 s frei ist – der Bericht für den Morgen liegt bereit (${frei.b.report.lines.length} Zeilen)`);
  else fail(`Lagerglocke: Entwarnung ${JSON.stringify({ phase: frei.b.phase, rings: frei.b.rings, report: frei.b.report })}`);

  // 11) Der Morgen: der Bericht erzählt, Wunden verteilt, Balduin bringt Ersatz
  const morgen = await z(() => {
    const Z = window.zomfy;
    Z.endNight(true);
    const lines = Z.nextMorning().map((l) => l.text);
    const b = Z.bell();
    return { lines, wounds: b.wounds, strength: b.strength, ersatz: Z.game.trader.offers().some((o) => o.gives?.arm === 'doppelflinte') };
  });
  const hat = (s) => morgen.lines.some((t) => t.includes(s));
  if (hat('Die Glocke hat geläutet') && hat('Juna zum Steg') && hat('Bert ist schwer verletzt') && hat('Doppelflinte ist im Laub') && morgen.wounds.bert?.kind === 'schwer' && morgen.strength.bert === 0 && morgen.ersatz) note(`✓ Lagerglocke: der Morgen erzählt es (»${morgen.lines.find((t) => t.includes('Glocke'))}«), Bert liegt schwer verletzt (hilft nicht), Balduin bringt eine neue Doppelflinte`);
  else fail(`Lagerglocke: Morgen ${JSON.stringify(morgen)}`);

  // 12) Das Erinnerungsbrett am Steg: abends mit echter Taste die Laterne anzünden, die Karte zeigt Juna
  const brett = await z(() => {
    const Z = window.zomfy;
    Z.setTime(19, 0);
    const m = Z.memorial();
    Z.teleport(m.interaction.x, m.interaction.z + 0.3, Math.PI);
    return m;
  });
  await step(500);
  const vorE = await z(() => ({ it: window.zomfy.game.currentInteraction?.id, prompt: window.zomfy.memorial().interaction?.prompt }));
  await tap('KeyE');
  await step(400);
  const karte = await z(() => ({ mode: window.zomfy.game.mode, card: window.zomfy.game.deliveryCard.items[window.zomfy.game.deliveryCard.k] || null, mem: window.zomfy.memorial(), fallen: window.zomfy.bell().fallen, sound: window.zomfy.sound() }));
  await page.screenshot({ path: join(SHOTS, 'erinnerung.png') });
  note('  Screenshot: screenshots/erinnerung.png');
  await tap('KeyE');
  await step(300);
  const zuruck = await z(() => window.zomfy.game.mode);
  const gespielt = !karte.sound.ready || karte.mem.memorials >= 1;
  if (vorE.it === 'erinnerung' && vorE.prompt === 'Laterne anzünden' && karte.mode === 'lieferung' && karte.card?.memorial === 'juna' && karte.mem.pool && gespielt && zuruck === 'play') note(`✓ Erinnerungsbrett: abends zündet E die Laterne an (Lichtinsel, die Spieluhr spielt), die Karte zeigt Juna mit ihren Tagen (${karte.card.from}–${karte.card.to})`);
  else fail(`Erinnerungsbrett: ${JSON.stringify({ brett, vorE, karte: { mode: karte.mode, card: karte.card, mem: karte.mem, sound: karte.sound }, zuruck })}`);
  // Bild: das Brett in der Dämmerung, nah
  await z(() => {
    const Z = window.zomfy;
    const m = Z.memorial();
    Z.setTime(19, 15);
    Z.teleport(m.pos.x - 2.2, m.pos.z + 1.1, Math.PI);
    Z.game.hud.speech = null;
  });
  await tap('KeyZ');
  await step(1500);
  await z(() => {
    const g = window.zomfy.game;
    g.hud.toasts.length = 0; // Meldungen rechts lägen sonst über dem Brett
    g.hud.speech = null;
    g.funk.clear();
  });
  await step(50);
  await page.screenshot({ path: join(SHOTS, 'erinnerungsbrett.png') });
  note('  Screenshot: screenshots/erinnerungsbrett.png');
  await tap('KeyZ');

  // 13) Das Herbstbuch bekommt die Seite »Erinnerung«
  const buch = await z(() => {
    const menu = window.zomfy.game.menu;
    const pages = menu.bookPages();
    menu.page = 'erinnerung';
    menu.bookCache = null;
    const rows = menu.bookData().rows.map((r) => r.label);
    menu.page = 'taten';
    menu.bookCache = null;
    return { pages, rows };
  });
  if (buch.pages.includes('erinnerung') && buch.rows.includes('Juna')) note('✓ Herbstbuch: die Seite »Erinnerung« – Die mit uns waren');
  else fail(`Herbstbuch Erinnerung: ${JSON.stringify(buch)}`);

  // 14) Speichern v30 und Neuladen
  await z(() => window.zomfy.game.quietSave());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.__zomfyStep, null, { timeout: 30000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  await step(300);
  const geladen = await z(() => ({ v: window.zomfy.state().version, b: window.zomfy.bell(), mem: window.zomfy.memorial(), stage: window.zomfy.state().survivors.juna.stage }));
  if (geladen.v === 30 && geladen.b.fallen.length === 1 && geladen.b.wounds.bert?.kind === 'schwer' && geladen.b.lost.includes('doppelflinte') && geladen.mem.shown && geladen.stage === 5 && geladen.b.night === 5) note('✓ Lagerglocke: Speichern v30 – die Gefallene, Berts Wunde, die verlorene Doppelflinte und das Erinnerungsbrett bleiben');
  else fail(`Lagerglocke: Speichern ${JSON.stringify({ v: geladen.v, fallen: geladen.b.fallen, wounds: geladen.b.wounds, lost: geladen.b.lost, mem: geladen.mem, stage: geladen.stage })}`);
  checkMessages(session);
  await session.context.close();

  // 15) Migration v26 → v30: auf »Gemütlich« keine Verluste, noch nie geläutet
  const alt = await openGame(browser, `${url}index.html?test&playtest`, 'Lagerglocke: Migration', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m31-mig')) {
        localStorage.clear();
        localStorage.setItem('zomfy-towers.spielstand', JSON.stringify({ version: 26, difficulty: 'gemuetlich', time: { day: 8, minute: 180 }, player: { x: 4, z: 2, hp: 90, name: 'Kira' }, inventory: { holz: 5 }, world: { houseLevel: 1, homeHp: 300, buildings: [] }, stats: { nightsWon: 5 }, flags: { introGesehen: true }, arms: { unlocked: true, taken: [], notfall: {}, mag: {} } }));
        sessionStorage.setItem('zomfy-m31-mig', '1');
      }
    },
  });
  await alt.page.evaluate(() => window.__zomfyStep(300));
  const mig = await alt.page.evaluate(() => ({ v: window.zomfy.state().version, b: window.zomfy.bell(), st: window.zomfy.state() }));
  if (mig.v === 30 && mig.st.losses === false && mig.b.fallen.length === 0 && mig.b.night === 0 && Object.keys(mig.b.wounds).length === 0 && mig.b.lost.length === 0) note('✓ Lagerglocke: Migration v26 → v30 – auf »Gemütlich« keine Verluste, noch nie geläutet, niemand verwundet');
  else fail(`Lagerglocke: Migration ${JSON.stringify({ v: mig.v, losses: mig.st.losses, b: { fallen: mig.b.fallen, night: mig.b.night, wounds: mig.b.wounds, lost: mig.b.lost } })}`);
  checkMessages(alt);
  await alt.context.close();
}
