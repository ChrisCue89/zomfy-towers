// Prüfablauf für Zomfy Towers (siehe CLAUDE.md).
//
//   node tools/check.mjs            volle Prüfung im Headless-Browser
//   node tools/check.mjs --syntax   nur Syntax aller Module
//   node tools/check.mjs --nur=nahkampf,naechte
//                                   nur einzelne Abschnitte (rundgang, speichern,
//                                   bauen, wege, naechte, nahkampf, ueberlebende,
//                                   haendler, herbst, nachbesserung, ansicht,
//                                   geschichte, figuren, nacht16, nachbesserung16,
//                                   lager, reaktionen, hd)
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
import { fileURLToPath } from 'node:url';
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
 * Nacht im Morgenbericht, Schwierigkeit im Pausenmenü, Speichern v13 und
 * Migration v10 → v13 – alles mit echten Tasten und Mausklicks.
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
  const wurfZ = await z((p) => [[0, 0], [0.5, 0.3], [-0.4, 0.4]].map(([dx, dz]) => window.zomfy.spawnZombie('schlurfer', p.x - 3 + dx, p.z + dz)), { x: bx, z: bz });
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

  // Migration v10 → v13: Schwierigkeit »ausgewogen«, Laternenblitz auf Platz 1; Türme ohne Geschichte laden
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v10 → v13', {
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
  if (m.st.version === 13 && m.st.difficulty === 'ausgewogen' && m.st.skills.slots[0] === 'laternenblitz' && m.st.skills.slots[1] === null && m.st.skillChoice?.mode === 'lernen' && m.turm?.xp === 0 && m.turm.rang === 1) note(`✓ Migration: Spielstand v10 wird zu v13 (Schwierigkeit ausgewogen, Laternenblitz auf Platz 1, auf Stufe 4 wartet die Fähigkeiten-Wahl; ${m.turm.name} ist ein neuer Turm)`);
  else fail(`Migration v10 → v13: ${JSON.stringify({ v: m.st.version, d: m.st.difficulty, skills: m.st.skills, choice: m.st.skillChoice, turm: m.turm })}`);
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
 * flickt; Speichern v13 und Migration v11 → v13 (Bilder: lager, lager-nacht,
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

  // 9) Speichern v13: Stufe, Zubehör und Umgeworfenes bleiben nach dem Neuladen
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
  if (geladen.v === 13 && gTor.level === 2 && gTor.gear.join() === 'glocke' && gBank?.broken && gBar?.gear?.join() === 'dornen,laterne,pech' && gBar.level === 3) note('✓ Speichern v13: Palisade, Zubehör und die umgeworfene Werkbank bleiben nach dem Neuladen');
  else fail(`Speichern v13 (Lager): ${JSON.stringify({ v: geladen.v, tor: gTor, bank: gBank, bar: gBar })}`);
  checkMessages(session);
  await session.context.close();

  // Migration v11 → v13: Ein alter Stand bekommt den Weidenzaun mit Tor; ein Turm auf der Linie kommt in den Vorrat
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v11 → v13', {
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
  if (m.st.version === 13 && m.camp.length === 7 && m.camp.every((b) => b.level === 1) && tuerme.length === 1 && tuerme[0].i === -6 && m.st.inventory.schrott > 7 && m.meldungen.some((t) => t.startsWith('Mika hat einen Weidenzaun'))) {
    note(`✓ Migration: Spielstand v11 wird zu v13 – der Weidenzaun mit Tor steht, der Turm auf der Linie liegt wieder im Vorrat (Schrott 7 → ${m.st.inventory.schrott}), der daneben bleibt`);
  } else fail(`Migration v11 → v13: ${JSON.stringify({ v: m.st.version, camp: m.camp.length, tuerme, inv: m.st.inventory, meldungen: m.meldungen })}`);
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
 * nass, Nebel kürzt die Reichweite; Speichern v13 und Migration v12 → v13
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
    for (let k = 0; k < 36; k++) {
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
    eisblock: [-11, [['sprenger', 2], ['sprenger', 3, 'A'], ['bolzen', 2]]], // der Bolzen lässt ihn zerspringen
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

  // Speichern v13: das Notizbuch bleibt
  await z(() => window.zomfy.save());
  await page.reload({ timeout: 120000 });
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await z(() => ({ v: window.zomfy.state().version, notes: window.zomfy.notes() }));
  if (geladen.v === 13 && Object.keys(geladen.notes).length === 6) note('✓ Speichern v13: Das Notizbuch bleibt nach dem Neuladen');
  else fail(`Speichern v13 (Notizbuch): ${JSON.stringify(geladen)}`);
  checkMessages(session);
  await session.context.close();

  // Migration v12 → v13: Das Notizbuch beginnt leer
  const alt = await openGame(browser, `${url}index.html?test&map=3`, 'Migration v12 → v13', {
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
  if (m.v === 13 && Object.keys(m.notes).length === 0 && m.camp === 7) note('✓ Migration: Spielstand v12 wird zu v13 – das Notizbuch beginnt leer, das Lager steht');
  else fail(`Migration v12 → v13: ${JSON.stringify(m)}`);
  checkMessages(alt);
  await alt.context.close();
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
    for (let k = 0; k < 5; k++) await tap('KeyW'); // M16: über »Schwierigkeit« hinweg zur Mütze
    await tap('KeyD');
    await tap('KeyW');
    await tap('KeyE');
    for (let k = 0; k < 4; k++) await tap('Backspace');
    await intro.page.keyboard.type('Kira');
    await tap('Enter');
    await settle(intro.page, 30);
    await intro.page.screenshot({ path: join(SHOTS, 'figur.png') });
    note('  Screenshot: screenshots/figur.png');
    const knoepfe = await intro.page.evaluate(() => window.zomfyView().titel?.knoepfe || []);
    for (let k = 0; k < 6; k++) await tap('KeyS');
    await intro.page.waitForFunction(() => window.zomfyView().titel?.bereit, null, { timeout: 60000 }); // m16-r1: »Los geht’s!« erst nach einem Moment
    await tap('Enter');
    await intro.page.waitForFunction(() => window.zomfy.mode === 'dialog', null, { timeout: 180000 });
    const neu = await intro.page.evaluate(() => window.zomfy.state().player);
    if (titel?.knoepfe?.[0]?.includes('Neues Spiel') && figurSeite === 'figur' && knoepfe[0]?.includes('Kira') && neu.name === 'Kira' && neu.look.hat === 'rot') note('✓ Titelbild: Neues Spiel, Name »Kira« getippt, Mütze rot – dann Intro');
    else fail(`Titelbild: ${JSON.stringify({ titel, figurSeite, knoepfe, name: neu.name, look: neu.look })}`);
    await settle(intro.page, 70);
    await intro.page.screenshot({ path: join(SHOTS, 'start.png') });
    note('  Screenshot: screenshots/start.png');
    // M15: Die Einleitung fährt vom Waldrand über die Wege zum Haus und zurück zu Mika –
    // mit echten Tasten (E zeigt die Zeile ganz, E geht weiter)
    const blick = async () => intro.page.evaluate(() => ({ ...window.zomfy.camera(), mode: window.zomfy.mode }));
    const fahrt = [await blick()];
    const orte = await intro.page.evaluate(() => Object.fromEntries(['wald', 'unterholz', 'zusammen', 'haus'].map((k) => [k, window.zomfy.lookSpot(k)])));
    for (let k = 0; k < 8 && fahrt[fahrt.length - 1].mode === 'dialog'; k++) {
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
    if (fahrt[0].look === 'wald' && fahrt[0].x < -30 && bei(nach('unterholz'), orte.unterholz) && bei(nach('zusammen'), orte.zusammen) && bei(nach('haus'), orte.haus) && nach('mika') && ende.mode === 'play' && Math.abs(ende.x - mika.x) < 2 && !ende.look) {
      note(`✓ Einleitung (M15): Kamerafahrt vom Waldrand (x ${fahrt[0].x.toFixed(0)}) über Unterholz, Zusammenfluss (x ${nach('zusammen').x.toFixed(0)}) und Haus zurück zu Mika – ${fahrt.length - 1} Tastendrücke, danach folgt die Kamera wieder der Figur`);
    } else fail(`Einleitung (M15): ${JSON.stringify({ fahrt, orte, mika: { x: mika.x, z: mika.z } })}`);
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
        if (typeof v === 'string') texts.push(v);
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
    await t.page.waitForFunction(() => window.zomfy.mode === 'dialog', null, { timeout: 180000 });
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
    if (saved && saved.time.day === 2 && saved.version === 13 && Number.isFinite(saved.world.mapSeed)) note(`✓ Schlafen: Tag 2 begonnen und gespeichert (v13, Karte ${saved.world.mapSeed})`);
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
    // Migration v9 → v13: Wer im alten Haus stand, steht jetzt im Innenraum hinter der Tür
    await first.page.evaluate(() => {
      window.zomfy.game.quietSave = () => {}; // beim Neuladen nicht über den alten Stand speichern
      const st = window.zomfy.state();
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify({ ...st, version: 9, player: { ...st.player, x: 6.5, z: -7.0 } }));
    });
    await first.page.reload();
    await first.page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
    await settle(first.page, 10);
    const v9 = await first.page.evaluate(() => ({ v: window.zomfy.state().version, p: window.zomfy.state().player, i: window.zomfy.interior() }));
    if (v9.v === 13 && v9.i.inside && Math.hypot(v9.p.x - v9.i.entry.x, v9.p.z - v9.i.entry.z) < 0.5) note('✓ Migration: Spielstand v9 wird zu v13 – wer im alten Haus stand, steht jetzt drinnen hinter der Tür');
    else fail(`Migration v9 → v13: ${JSON.stringify(v9)}`);
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
  // Holzlager draußen: am nächsten Tag 2 Holz zum Mitnehmen
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
  if (holzlager === 'ok' && holzNach === holzVor + 2) note(`✓ Holzlager: gebaut, am nächsten Tag gibt E 2 Holz (${holzVor} → ${holzNach})`);
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
  if (migriert.version === 13 && migriert.time.day === 3 && migriert.inventory.zahnraeder === 2 && !migriert.hotbar.slots.includes('laterne') && migriert.world.houseLevel === 1 && migriert.world.homeHp === 300) {
    note('✓ Migration: Spielstand v1 wird zu v13 (Technik -> Zahnräder, Laterne auf F, Zuhause 300)');
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
  if (v3.version === 13 && v3.time.day === 4 && v3.player.hp === 100 && v3.player.level === 1 && v3.world.homeHp === 300 && nurLager && v3.inventory.holz === 15 && v3.inventory.schrott === 9) {
    note('✓ Migration: Spielstand v2 wird zu v13 (Leben, Zuhause, Stufe 1; die alte Barrikade gibt es als Holz zurück, Tor und Wall stehen)');
  } else fail(`Migration v2: ${JSON.stringify(v3)}`);
  checkMessages(v2);
  await v2.context.close();
}

/**
 * Meilenstein 9: die Bucht und die Wege. Drei Spawns am linken Rand, deren
 * Wege vor dem Hof zusammenlaufen; die Horde bleibt auf den Wegen; Barrikaden
 * quer über den Weg halten sie auf und zerbrechen zu Trümmern, die sich
 * tagsüber wieder aufbauen und ausbauen lassen; Überreste halten drei Tage;
 * tagsüber nur einzelne Schlurfer; die Übersichtskarte (M); Speichern v13 mit
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

  // Speichern v13: Der Startwert der Karte liegt im Spielstand und gilt nach dem Laden
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
  if (vorLaden.seed === 123 && nachLaden.seed === 123 && nachLaden.info.seed === 123 && nachLaden.v === 13 && JSON.stringify(nachLaden.info.merge) === JSON.stringify(vorLaden.merge)) note('✓ Speichern v13: Startwert der Karte im Spielstand – nach dem Laden dasselbe Wegenetz');
  else fail(`Speichern v13: ${JSON.stringify({ vorLaden, nachLaden })}`);
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
  if (m.st.version === 13 && Number.isFinite(m.st.world.mapSeed) && typen === 'werkbank,zelt' && zelt?.id === 4 && m.st.survivors.hilde.tent === 4 && m.st.inventory.holz >= 8 && m.st.inventory.schrott > 12 && m.st.inventory.teile === 7 && m.st.flags.wrackLeer && Math.hypot(m.st.player.x - 5.5, m.st.player.z + 3) < 1 && m.meldungen.some((t) => t.startsWith('Neue Karte'))) {
    note(`✓ Migration: v7 wird zu v13 – neue Karte (${m.st.world.mapSeed}), Turm und Barrikade erstattet (Holz ${m.st.inventory.holz}, Schrott ${m.st.inventory.schrott}), Werkbank und Hildes Zelt in der Bucht neu aufgestellt`);
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
  for (let k = 0; k < 60 && !nacht.night.done; k++) {
    await step(5000);
    nacht = await z(() => window.zomfy.nightState());
  }
  const home = (await state()).world.homeHp;
  if (nacht.night.done && nacht.night.won) note(`✓ Nacht 1 überstanden: ${nacht.night.kills} Schlurfer besiegt, Zuhause ${home}/300`);
  else fail(`Nacht 1: nicht geschafft (${JSON.stringify(nacht)}, Zuhause ${home})`);

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
  if (view.modus === 'report' && view.bericht?.length) note(`✓ Morgenbericht: ${view.bericht[0]}`);
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
  // In kleinen Schritten: Eine offene Perk-Wahl geht erst in Ruhe auf (m12-r1) und hält das Spiel an
  for (let k = 0; k < 6; k++) await step(500);
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
  for (const [id, threat] of [['tag', 0], ['abend', 0], ['nacht', 2], ['titel', 0], ['jingle', 0]]) pegel[id] = await z(([id, threat]) => window.zomfy.renderMusic(id, 8, threat), [id, threat]);
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
  if (geladen.version === 13 && geladen.survivors.hilde.stage === 3 && geladen.world.furniture.length === 6 && geladen.world.tower === 3) note('✓ Speichern v13: Überlebende, Möbel und Leuchtmast bleiben nach dem Neuladen');
  else fail(`Speichern v13: ${JSON.stringify({ v: geladen.version, s: geladen.survivors, f: geladen.world.furniture, t: geladen.world.tower })}`);
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
  if (m.state.version === 13 && m.state.world.survivorsStart === 6 && Object.values(m.state.survivors).every((s) => s.stage === 0) && m.state.weapons.pfanne === 1 && m.state.player.name === 'Mika' && m.state.player.look.hat === 'orange') {
    note('✓ Migration: Spielstand v4 wird zu v13 (Überlebende kommen ab dem nächsten Tag, Waffen bleiben)');
  } else fail(`Migration v4: ${JSON.stringify(m.state)}`);
  checkMessages(v4);
  await v4.context.close();
}

/**
 * Meilenstein 8 (seit M9 an der Bucht): Das Bootswrack gibt nur einmal etwas
 * her, Schrotthaufen alle zwei Tage. Balduin kommt ab Tag 2 morgens mit dem Boot
 * an den Steg, handelt bis Mittag Zombieteile gegen Rohstoffe (echte Tasten im
 * Handelsfenster), Vorrat je Tag, Speichern v13 und Migration v6 → v8.
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
  if (angebote.join() === 'schrott,stein,zahnrad' && zahn.join() === 'true,true,false') note(`✓ Balduin: Tag 3 bietet ${angebote.join(', ')} – Zahnräder nur zweimal am Tag`);
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

  // Speichern v13: Vorrat des Tages und Flags bleiben
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  const geladen = await state();
  if (geladen.version === 13 && geladen.world.trader.day === 3 && geladen.world.trader.sold.zahnrad === 2 && geladen.flags.wrackLeer && geladen.flags.balduinGetroffen) note('✓ Speichern v13: Balduins Vorrat, Bootswrack und Bekanntschaft bleiben nach dem Neuladen');
  else fail(`Speichern v13: ${JSON.stringify({ v: geladen.version, trader: geladen.world.trader, flags: geladen.flags })}`);

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
  const eingebaut = await z((id) => ({ teil: window.zomfy.buildings().find((b) => b.id === id)?.part, vorrat: window.zomfy.state().towerParts.gluecksmuenze }), turmTeil.id);
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
  const nachLaden = await z((id) => ({ v: window.zomfy.state().version, teil: window.zomfy.buildings().find((b) => b.id === id)?.part }), turmTeil.id);
  // Die Glücksmünze passt nicht in den Laternenturm (er schießt nicht), das Fernrohr schon
  const laterne = await z(() => {
    const g = window.zomfy.game;
    g.state.towerParts.gluecksmuenze = 1;
    g.state.towerParts.fernrohr = 1;
    window.zomfy.give({ schrott: 40, holz: 20, stein: 20, zahnraeder: 4 });
    const col = window.zomfy.pathColumn(-8);
    const j = col[0] - 1;
    const res = window.zomfy.build('laternenturm', -8, j);
    const b = window.zomfy.buildings().find((q) => q.i === -8 && q.j === j);
    window.zomfy.selectBuilding(b?.id);
    return { res, id: b?.id };
  });
  await step(100);
  const laterneKacheln = await z(() => window.zomfy.buildbarLayout().tiles.map((t) => t.id));
  if (kauf.angebote.includes('gluecksmuenze') && kauf.gekauft && kauf.vorrat === 1 && turmTeil.res === 'ok' && eingebaut.teil === 'gluecksmuenze' && eingebaut.vorrat === 0 && muenze.lebend === 0 && muenze.teile >= 3 && nachLaden.v === 13 && nachLaden.teil === 'gluecksmuenze' && laterne.res === 'ok' && laterneKacheln.includes('teil-fernrohr') && !laterneKacheln.includes('teil-gluecksmuenze')) {
    note(`✓ Turmteile: Balduin bietet an Tag 4 eine Glücksmünze an, eine Taste baut sie in den Bolzenwerfer ein – ${muenze.teile} Zombieteile von drei Schlurfern, nach dem Neuladen steckt sie noch (v13); der Laternenturm nimmt ein Fernrohr, aber keine Münze`);
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
  if (m.version === 13 && m.flags.wrackLeer && m.inventory.teile === 0 && m.inventory.schrott === 12 && m.world.trader.day === 0 && m.player.name === 'Kira') note('✓ Migration: Spielstand v6 wird zu v13 (Wrack schon ausgeräumt, Zombieteile bei null)');
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
  if (geladen.version === 13 && geladen.weapons.pfanne === 2 && geladen.player.level === gespeichert.player.level && Object.keys(geladen.perks).length >= 1) {
    note(`✓ Speichern v13: Waffen, Stufe ${geladen.player.level} und Perks bleiben nach dem Neuladen`);
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

  // Drinnen steckt Mika das Werkzeug weg (Mira: die Axt ragte durch die Wand)
  const werkzeug = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    g.player.heldTool = 'axt';
    const vis = () => Object.entries(g.player.character.tools).filter(([, m]) => m.visible).map(([n]) => n);
    g.player.update(1 / 30, { x: 0, z: 0 }, false);
    const draussen = vis();
    const w = Z.wakeSpot();
    Z.teleport(w.x, w.z, 0);
    g.player.update(1 / 30, { x: 0, z: 0 }, false);
    const drinnen = vis();
    const d = Z.interior().outsideDoor;
    Z.teleport(d.x, d.z + 1.2, 0);
    return { draussen, drinnen };
  });
  await step(100);
  if (werkzeug.draussen.includes('axt') && werkzeug.drinnen.length === 0) note('✓ Werkzeug: draußen in der Hand, drinnen weggesteckt');
  else fail(`Werkzeug drinnen: ${JSON.stringify(werkzeug)}`);

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
      out.push({ weg: `${rooms[i].id}–${rooms[i + 1].id}`, rest: Math.max(walk(a, 2.85, b, 2.85), walk(b, 2.85, a, 2.85)) });
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
