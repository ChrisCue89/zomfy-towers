# CLAUDE.md – Regeln für Zomfy Towers

Dieses Dokument gilt für jede Arbeitssitzung an diesem Repository.

| Datei | Inhalt |
|---|---|
| `DESIGN.md` | Vision, Look, alle Systeme, Meilensteinplan – **vor jeder Arbeit lesen** |
| `PROGRESS.md` | Logbuch: was fertig ist, Playtest-Befunde, Änderungen, Offenes |
| `OFFENE-FRAGEN.md` | Designentscheidungen, die DESIGN.md offenließ (mit Begründung) |
| `playtests/` | Testspieler-Personas, Berichte je Runde, Zusammenfassungen |

## Projekt in Kürze

- 3D-Pixel-Art-Browserspiel, three.js (WebGL 2), reines JavaScript mit
  ES-Modulen, **kein Build-Schritt**.
- Wird von GitHub Pages direkt aus dem `main`-Branch ausgeliefert
  (`index.html` im Wurzelverzeichnis).
- Alle Spieltexte auf Deutsch, Code-Bezeichner auf Englisch, Kommentare auf
  Deutsch.

## Harte Regeln

1. **Kein Build, keine Bundler, keine Transpiler.** Der Browser lädt die
   Dateien so, wie sie im Repo liegen. `three` kommt über die Importmap in
   `index.html`. `package.json` dient nur als ES-Modul-Kennzeichnung und für
   Kurzbefehle, es gibt keine Abhängigkeiten.
2. **Alles liegt im Repo.** Keine CDNs, keine Webfonts, keine Requests an
   fremde Server. Bibliotheken liegen unverändert unter `lib/` mit Lizenz.
   Aktuell: `lib/three/` = three.js **r186** (`three.module.js` + `three.core.js`).
3. **Keine fremden Assets.** Modelle, Texturen, Schrift, Symbole, Porträts
   und Klänge werden im Code erzeugt. Keine Anlehnung an bekannte Spiele,
   Figuren oder Marken (Vorbilder gelten nur für Mechanik).
4. **Alle Spieltexte in `src/data/texts.js`** bzw. Dialogdaten in
   `src/data/dialogs.js`. Echte Umlaute und ß, deutsche Anführungszeichen
   („…“). Jedes Zeichen muss in der Pixelschrift (`src/ui/font.js`)
   existieren – das Prüfskript kontrolliert das.
5. **Konsole sauber halten.** Keine Fehler, keine Warnungen. In r186 veraltet
   bzw. entfernt: `THREE.Clock`, `PCFSoftShadowMap`. Kein synchrones Auslesen
   der GPU (`readPixels`) – das erzeugt »GPU stall«-Warnungen.
6. **Spielstand nie kaputt machen.** Änderungen am Speicherformat erhöhen
   `SAVE_VERSION` in `src/core/state.js` und bekommen eine Migration in
   `src/core/save.js`; `sanitizeState` ergänzen. Alte Stände müssen laden.
7. **Lichtanzahl konstant halten.** Lichter werden beim Start angelegt und nur
   über `intensity` gedimmt, nie über `visible` oder Hinzufügen/Entfernen
   (sonst übersetzt three.js alle Shader neu).
8. **Eine Verbesserung darf nie etwas Funktionierendes kaputt machen.** Fällt
   der Prüfablauf nach einer Änderung schlechter aus, Änderung zurücknehmen.

## Look-Regeln (siehe DESIGN.md, Abschnitt 3)

- Render-Target mit ca. 360 Zeilen, ganzzahlige Skalierung, `NearestFilter`,
  `antialias: false`, CSS `image-rendering: pixelated`.
- Kamera: orthografisch, **Gier immer 0** (Blick nach Norden, −Z), Neigung
  sin = 0,6 / cos = 0,8, **40 px pro Meter**.
- **Voxelgröße 1/8 m** für alles. Statische Objekte auf 1/8-m-Positionen und
  nur in 90°-Drehungen – dann liegen alle Kanten exakt auf dem Pixelraster.
- Farben aus der Palette `src/render/palette.js` (`P.g5`, `P.e3` …).
- Keine Unschärfe, kein Bloom. Transparenz nur als gerasterte Durchsicht
  (Bayer-Dithering mit `discard`), damit Tiefenpuffer und Umrisse stimmen.
- Kühle Nacht-Tönung wirkt im Post-Pass nur auf dunkle und mittlere Töne,
  Lichtquellen bleiben warm.
- **Lesbarkeit vor Stimmung:** Jede Art (Quelle, Bau, später Schlurfer, Turm,
  Loot) braucht eine eindeutige Silhouette und Farbe. Der jetzige grobe
  Detailgrad ist ein Zwischenstand: Sobald die Mechaniken sitzen, hebt der
  Meilenstein »Detailgrad und Animationen« Auflösung, Voxelfeinheit (1/16 m
  für Figuren, Schlurfer, Türme, kleine Dinge) und Animation an (DESIGN.md
  3.6). Neue Modelle bis dahin so bauen, dass sie sich leicht verfeinern
  lassen (Maße in Metern denken, nicht in Voxeln).

## Architektur

```
index.html            Einstieg, Importmap, zwei Canvas (Szene + Oberfläche)
src/main.js           Start, Fehleranzeige
src/config.js         Alle Stellschrauben + URL-Parameter
src/core/             game.js (Schleife, Modi), input, events, rng, math,
                      state.js (Spielzustand), save.js (Speichern, Migration),
                      inventory (Kosten/Vorrat), builder (Bauleiste, Platzieren,
                      Auswahl, Turm-Ausbau, Reparieren, Abreißen, Hausausbau,
                      Wegvorschau), gathering (Sammeln, Durchsuchen), nights
                      (Tagesschlurfer, Wellen, Sieg/Niederlage, Bericht),
                      combat (Waffen-Schlag, Ausweichrolle, Lebenspunkte,
                      Erfahrung, Perk-Vergabe)
src/render/           pixelRenderer (Low-Res + Post-Pass + Hochskalieren),
                      palette (+ LUT), cameraRig (Einrasten), materials
                      (Durchsicht/Ausblenden), voxel (Voxel-Baukasten),
                      staticMesh (sichtbare Flächen + Schatten-Stellvertreter),
                      portrait (Porträts ohne GPU-Auslesen), shaders
src/world/            world (Zusammenbau + Update), layout (Grundriss +
                      Ressourcenquellen), terrain, nature, shelter (Stufen),
                      props, colliders, daynight, lights, particles, effects
                      (Späne, Staub), grid (Bauraster), resources (Quellen),
                      buildings + buildingModels (Bauten), towerModels
                      (Türme je Stufe/Spezialisierung), buildPreview
                      (Geistermodell, Felder), lightPools (Lichtinseln),
                      pathing (Waldpfade, Flussfelder, Mazing, Wegvorschau)
src/entities/         player, characters (Figuren-Bauer), horde (Schlurfer:
                      Instancing, Zustände, Angriffe), zombieModels, towers
                      (Zielen, Geschosse, Auren, Feuer), loot (Brocken,
                      Magnet, Zerfall)
src/ui/               font, icons, ui (Leinwand + Panels), hud (auch
                      Nacht-Leiste, Lebensbalken, Randmarken), dialog, menu,
                      buildbar (Bauleiste), crafting (Werkbank), report
                      (Morgenbericht), perkChoice (Perk-Wahl)
src/data/             texts, dialogs, items, buildings, recipes, goals,
                      towers (Werte je Stufe/Spezialisierung), zombies,
                      waves (Wellenplan je Nacht, Tagesschlurfer), upgrades
                      (Figur-Aufwertungen), weapons (Waffenwerte je Stufe),
                      perks (Erfahrungskurve, Perks und ihre Wirkung)
tools/serve.mjs       Statischer Server (ohne Abhängigkeiten)
tools/check.mjs       Prüfskript (Syntax, Headless-Rundgang, Screenshots)
tools/playtest.mjs    Playtest-Brücke für Testspieler-Agenten
screenshots/          Ergebnisse der letzten Prüfung
playtests/            Personas, Berichte, Zusammenfassungen
```

Grundprinzipien:

- **Zustand ist Daten.** Alles Gespeicherte liegt im Zustandsobjekt
  (`src/core/state.js`). three.js-Objekte sind nur Darstellung.
- Modi der Spielschleife: `play`, `dialog`, `menu`, `craft` (Werkbank),
  `report` (Morgenbericht), `perk` (Perk-Wahl), `sleep` (Schlafen, Ausruhen, Werkeln, verlorene
  Nacht, Ohnmacht – alle mit Abblende). Zeit läuft nur in
  `play`; Bauen geht jederzeit in `play`. `Game.step(dt)` ist ein Simulationsschritt
  (Update + Eingabe-Abschluss), gezeichnet wird danach mit `render()`.
- **Klicks werden in `update()` ausgewertet**, nicht beim Zeichnen (sonst
  gehen sie bei der Schrittsimulation verloren). Layouts, die beides
  brauchen, berechnet eine eigene `layout()`-Methode.
- Die Oberfläche ist ein 2D-Canvas in Spielauflösung, sofort-modus gezeichnet.
- **Eingaben im Spielmodus, in dieser Reihenfolge:** Bauleiste (Kacheln,
  Q R T G C V, Tab) → Schnellleiste → Abbrechen (Esc/Rechtsklick, vor dem
  Menü) → Bewegung → Builder (Vorschau, Setzen, Auswahl per Klick) →
  Interaktion (E) → Sammeln bei gehaltenem E. `use` (E/Enter) gilt im Spiel,
  `confirm` (E/Enter/Leertaste) in Dialogen und Menüs, `dodge` (Leertaste)
  im Spiel. Im Trefferstopp bleiben Tastendrücke liegen (`frozenFrame`).
- **Die Maus wählt nur, wenn sie bewegt wird** (`input.mouse.moved`), sonst
  überschreibt ein ruhender Zeiger die Tastaturwahl. Vorgewählt ist in
  Rückfragen immer die harmlose Antwort (`standard: true` in dialogs.js).
- **Bauraster:** 1-m-Zellen (`grid.js`), statisch blockiert ist alles mit
  Kollision plus die Grundfläche aller Ausbaustufen des Zuhauses. Bauten
  belegen Zellen, bekommen eine Kollision und eine Interaktion (benutzen
  oder mit E auswählen). Die Horde rechnet darauf zwei Flussfelder
  (`pathing.js`): `walk` (Bauten sperren) und `brute` (Brummer gehen durch
  Barrikaden). Nach jeder Bauänderung `pathing.rebuild()`; ein Bau, der
  einen Waldpfad abschneidet, wird mit Grund `weg` abgelehnt.
- **Horde und Türme sind Daten plus Instancing:** Schlurfer liegen in
  `horde.list` (Zustand, Leben, Position) und werden je Art und Körperteil
  als `InstancedMesh` gezeichnet; ein unsichtbares Gerüst posiert die Teile.
  Werte stehen in `src/data/zombies.js`, `towers.js`, `waves.js` – dort
  wird balanciert, nicht im Code.
- **Konstante Lichtzahl:** Gebaute Lampen bekommen kein Punktlicht, sondern
  eine Lichtinsel (`lightPools.js`) und ein Glüh-Material.

### Leistung – bewährte Kniffe

- **Nur sichtbare Flächen zeichnen:** Weil die Kamera nie dreht, sieht sie
  nur Ober- und Südseiten. `createStaticVoxelObject` (bzw. `InstanceScatter`
  in `nature.js`) baut die Darstellung mit `visibleOnly` und die Drehung
  eingebacken.
- **Schatten über Stellvertreter** auf `SHADOW_LAYER` (grob bei Bäumen). Der
  `PixelRenderer` zeichnet die Schattenkarte in einem eigenen Durchgang
  (`shadowMap.autoUpdate = false`), die Hauptkamera sieht Ebene 1 nie.
- Viele gleiche Modelle als `InstancedMesh` in 12-m-Blöcken (Culling).
- Keine Allokationen pro Bild in heißen Pfaden (Vektoren wiederverwenden).

## Prüfablauf (nach jeder Änderung am Spielcode, vor jedem Commit)

1. `node tools/check.mjs --syntax` – Syntax aller Module (schnell).
2. `node tools/check.mjs` – volle Prüfung im Headless-Chromium:
   Spielstart mit Intro, Rundgang mit Screenshots (Morgen, Tag, Abend,
   Nacht, innen, Waldrand, Dialog, Menü, Full HD) nach `screenshots/`,
   Laufen/Kollision, Laterne, Ausruhen, Schriftabdeckung, Schlafen mit
   Rückfrage, Speichern/Laden, kaputter Spielstand; ab Meilenstein 2 mit
   echten Tasten und Mausklicks: Axt, Baum fällen (E halten), Werkzeugpflicht,
   Durchsuchen, Bauleiste (Q, E), Esc bricht ab, Platzieren per Mausklick aufs
   richtige Feld, belegte Felder, Abreißen, Spitzhacke, Hüttenausbau,
   Kollision des Anbaus, Bauten nach Neuladen, Migration v1 → v3 und
   v2 → v3 (Bilder: werkbank, bauen, huette, huette-nacht); ab Meilenstein 3
   in festen Simulationsschritten: Turm mit Q/E, Ablehnung auf dem letzten
   Weg, Abschuss mit Loot, Einsammeln, Ausbau über die Auswahl, Welle um
   20:30, Nacht 1 mit drei Türmen gewonnen, Schlafen erst nach der Nacht,
   Morgenbericht, verlorene Nacht mit Folgen (Bilder: turm-bauen, horde,
   bericht); ab Meilenstein 4: Waffe bauen, Treffer in Mausrichtung,
   Betäubung, Ausweichrolle, Erfahrung, Perk-Wahl, Waffen-Aufwertung,
   Speichern v4 (Bilder: nahkampf, perks). **Jede Konsolenmeldung
   (Fehler oder Warnung) lässt die Prüfung scheitern.** Bildzeiten sind in
   Headless softwaregerendert und nur grobe Anhaltspunkte.
   Playwright kommt aus `node_modules` oder der globalen Installation;
   Chromium liegt unter `/opt/pw-browsers`. Nie `playwright install`.
3. **Screenshots ehrlich ansehen** und mit DESIGN.md vergleichen.
4. Screenshots mit committen.

Neue Systeme bekommen im Prüfskript eigene Prüfpunkte (z. B. Turm bauen,
Welle besiegen, Loot einsammeln), sobald sie existieren.

## Playtests mit Testspieler-Agenten

Nach jedem Meilenstein (höchstens drei Runden, weniger wenn keine Blocker
und keine Spielfluss-Probleme mehr auftauchen):

1. Stand einfrieren: `node tools/playtest.mjs snapshot /tmp/zomfy-<runde>`.
2. Vier Testspieler-Agenten (Personas in `playtests/PERSONAS.md`) parallel
   starten, jeder mit eigener Sitzung der Playtest-Brücke und einem klaren
   Rundenziel. Sie kennen den Code nicht und spielen nur per Tastatur/Maus.
3. Berichte in `playtests/<runde>/<name>.md`, Auswertung in
   `playtests/<runde>/ZUSAMMENFASSUNG.md` nach Schwere: **Blocker**, **stört
   den Spielfluss**, **Feinschliff**. Blocker zuerst beheben.
4. Prüfablauf, `PROGRESS.md` aktualisieren, committen, pushen.

Testspieler liefern Hinweise, keine neue Richtung: Vision und Look aus
DESIGN.md bleiben verbindlich.

## URL-Parameter

| Parameter | Wirkung |
|---|---|
| `?time=21:30` | Startuhrzeit setzen |
| `?nosave` | Weder laden noch speichern |
| `?nointro` | Einführungsdialog überspringen |
| `?debug` | Entwickler-Anzeige an (sonst F3), `window.zomfy` |
| `?test` | Test-Modus: kein Intro, `window.zomfy` (Uhr stellen, versetzen, …) |
| `?playtest` | Playtest-Brücke: `window.__zomfyStep(ms)`, `window.zomfyView()` (nur lesen) |

Im Test-Modus kann `window.zomfy` außerdem Schlurfer erzeugen
(`spawnZombie`), die Horde abschalten (`setHorde(false)` für ruhige Bilder),
eine Nacht beenden (`endNight`), Türme ausbauen (`upgradeTower`), die Wege
als Textkarte zeigen (`debugPath`), Erfahrung geben (`giveXp`), Waffen
geben (`giveWeapon`) und Perks wählen (`choosePerk`).
| `?spawn=inside` | Spielfigur startet in der Notunterkunft |
| `?seed=123` | Anderer Welt-Seed |

## Arbeitsweise

- Meilensteine der Reihe nach, jeder in sich spielbar. Lieber wenig und
  richtig gut als viel und halbfertig.
- Nach jedem Meilenstein und jeder Nachbesserung: Prüfablauf, `PROGRESS.md`,
  committen und pushen.
- Offene Designfragen mit der Annahme entscheiden, die am meisten Spielspaß
  verspricht, und in `OFFENE-FRAGEN.md` festhalten.
- Hakt ein Werkzeug: Umweg finden, im Logbuch notieren, weitermachen.
