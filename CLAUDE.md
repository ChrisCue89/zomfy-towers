# CLAUDE.md – Regeln für Zomfy Towers

Dieses Dokument gilt für jede Arbeitssitzung an diesem Repository.

| Datei | Inhalt |
|---|---|
| `DESIGN.md` | Vision, Look, alle Systeme, Meilensteinplan, Spaß-Leitlinien (Abschnitt 10) – **vor jeder Arbeit lesen** |
| `PROGRESS.md` | Logbuch: was fertig ist, Playtest-Befunde, Änderungen, Offenes |
| `OFFENE-FRAGEN.md` | Designentscheidungen, die DESIGN.md offenließ (mit Begründung) |
| `playtests/` | Archiv: Testspieler-Personas, Berichte je Runde, Zusammenfassungen (keine neuen Runden mehr) |

## Projekt in Kürze

- Gemütliches Herbst-Tower-Defense an einem See: tagsüber ein Zuhause am
  Wasser, nachts Verteidigung an einer klaren Strecke (DESIGN.md).
- 3D-Voxel-Browserspiel, three.js (WebGL 2), reines JavaScript mit
  ES-Modulen, **kein Build-Schritt**.
- Wird von GitHub Pages direkt aus dem `main`-Branch ausgeliefert
  (`index.html` im Wurzelverzeichnis).
- Alle Spieltexte auf Deutsch, Code-Bezeichner auf Englisch, Kommentare auf
  Deutsch.

## Grundregeln des Spiels (verbindlich, DESIGN.md Abschnitt 0)

Seit dem neuen Grundkonzept gilt für jede Karte, Mechanik und Oberfläche:

- **Aufbau im Bild von rechts nach links:** Wasser → Basis/Haus/Steg →
  letzte Verteidigung (Hof) → gemeinsamer letzter Wegabschnitt mit
  Barrikaden → Türme neben den Wegen → verzweigte Zuführungen mit weiteren
  Barrikaden → Wald/Landseite mit den Spawns (linker Rand). Vom Wasser kommen
  nie Zombies. Die Kamera blickt weiter nach Norden.
- **Wegenetz statt einzelner Strecke:** mehrere Zuführungen, die sich
  verzweigen dürfen und kurz vor der Basis zusammenlaufen; bei jedem neuen
  Spiel teilweise prozedural (Startwert im Spielstand). Lang genug für 50–60
  Türme und mehr. Die Horde läuft nur auf den Wegen.
- **Türme frei neben den Wegen, nie darauf. Barrikaden frei auf den Wegen**
  (Holz, später Metall, Metallkreuze …), mit Lebenspunkten, reparier- und
  neu baubar.
- **Drei Verteidigungsebenen:** Türme – Barrikaden – die Figur selbst am Hof.
  Die Basis hat Lebenspunkte; fällt sie, ist die Nacht verloren. **Ab M17
  kommen Tor und Wall dazu** (OFFENE-FRAGEN 120): Der Wall umschließt das
  Lager zur Landseite, der letzte Weg endet am Tor (anfangs brüchig,
  aufrüstbar, täglich zu flicken); durchs Tor gehen nur die Lebenden. Bricht
  die Horde durch, fällt sie das Lager an – dann kämpft die Figur.
- **Ruhiger Tag** (nur ganz vereinzelte Schlurfer), angespannte Nacht, beides
  in derselben cozy, herbstlichen Welt.
- **Balduin kommt nur übers Wasser** (Boot, Steg); Zombie-Überreste (halten
  bis zu drei Tage) sind seine Handelsware, warum er sie will, bleibt offen.
- **Warum nur über die Wege (M15, DESIGN 4.1):** Der **Moder**, ein
  Pilzgeflecht im Waldboden, macht Menschen zu Schlurfern und das Unterholz
  unpassierbar (weich wie Moos, zäh wie Leim). Fest sind nur die alten,
  geschotterten Holzfällerwege; sie laufen an der alten Holzlände zusammen –
  Mikas Bucht. Wasser spült den Moder ab, Licht und Wärme machen ihn müde.
  Mikas Aufgabe: die Nächte halten, ein Zuhause bauen, Zuflucht sein. Neue
  Inhalte bleiben in dieser Geschichte.
- **Kein Umlenken (OFFENE-FRAGEN Nr. 66, entschieden):** Die Horde wird nicht
  auf Umwege gelenkt, das Wegenetz bleibt ein Baum; die Wegvorschau bleibt.
- **Ein Spiel hat ein Ende (Nr. 117):** Finale nach einem Herbst, danach
  weiterspielen (Roguelike-Nächte, Nebenaufträge) oder neue Runde (M25).
- Widerspricht bestehender Code dieser Struktur, wird er angepasst – nicht
  bloß Neues daneben gesetzt.

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
   der GPU (`readPixels`) – das erzeugt »GPU stall«-Warnungen. Den
   AudioContext erst bei einer echten Eingabe anlegen (sonst Warnung).
6. **Spielstand nie kaputt machen.** Änderungen am Speicherformat erhöhen
   `SAVE_VERSION` in `src/core/state.js` und bekommen eine Migration in
   `src/core/save.js`; `sanitizeState` ergänzen. Alte Stände müssen laden.
7. **Lichtanzahl konstant halten.** Lichter werden beim Start angelegt und nur
   über `intensity` gedimmt, nie über `visible` oder Hinzufügen/Entfernen
   (sonst übersetzt three.js alle Shader neu).
8. **Eine Verbesserung darf nie etwas Funktionierendes kaputt machen.** Fällt
   der Prüfablauf nach einer Änderung schlechter aus, Änderung zurücknehmen.

## Look-Regeln (siehe DESIGN.md, Abschnitt 3)

Stimmung: cozy, herbstlich, Spooky Season, warm – Herbstfarben, warme
Lichtinseln in kalten Nächten, keine Horror-Ästhetik. Der Pixel-Look ist
Stilmittel, kein Selbstzweck: Lesbarkeit und Stimmung gehen vor. Technisch
gilt bis auf Weiteres:

- Szene: Render-Target mit ca. 900 Zeilen (`targetLines`), **80 px pro Meter**
  draußen (`pxPerMeter`, die Größe bleibt – Wunsch des Auftraggebers), auf
  Wunsch nah mit 160 px/m (`nearPxPerMeter`, Einstellung `view`, Taste Z =
  `zoom`, M13), drinnen immer 160 px/m (`interiorPxPerMeter`, M11).
  `game.applyView` stellt Maßstab, Punktgröße und Durchsicht-Loch ein;
  `?zoom=nah|weit` erzwingt eine Ansicht,
  ganzzahlige Skalierung (Full HD 1×, 1440p 2×), `NearestFilter`,
  `antialias: false`, CSS `image-rendering: pixelated`.
- Oberfläche: eigene Leinwand mit ca. 360 Zeilen (`uiLines`), eigene
  ganzzahlige Skalierung. Welt → Oberfläche über `game.worldToUi`, Zeiger →
  Welt über `game.pointerGround` (beide rechnen den Faktor
  `pixel.uiToScene` um). Pixelgrößen in der Szene (Partikel, Durchsicht-Loch)
  mit `pxPerMeter / 40` skalieren.
- Kamera: orthografisch, **Gier immer 0** (Blick nach Norden, −Z), Neigung
  sin = 0,6 / cos = 0,8.
- **Voxelgrößen (M13g, doppelt fein):** 1/32 m = 2,5 px (`size: FINE32` aus
  `src/world/voxelKit.js`, `unit` an den Teilen) für Mika samt Laterne und
  Werkzeug, Überlebende, Balduin und sein Boot, Knopf, Krähen, Horde, Türme,
  Bauten, Barrikaden, Haus, Requisiten, Quellen (außer Bäumen) und Beute.
  1/16 m (`FINE`) für die Natur (Bäume, Büsche, Felsen, Gras, Blumen, Pilze,
  Schilf – wegen der Menge), den Innenraum (bei 160 px/m) und die Porträts.
  Die Bodentextur hat 1/16 m je Texel und darin eine Feinzeichnung im Maß
  1/32. Farbrauschen im Maß 1/32 grob halten (Hash über `x >> 1` …), die
  Feinheit gehört in Kanten, Fugen, Nägel, Maserung, Zeichen und Rundungen –
  sonst wird es Gries. `box2` (Quader in 1/16-Koordinaten) und `edgeLight`
  (Kantenlicht) helfen. Schatten-Stellvertreter bleiben grob: statische
  1/32-Modelle `shadow: 'coarse4'` (1/8 m), Bäume `'rough'` (1/4 m); Horde und
  Türme zeichnen Schatten und Umriss hinter Verdeckungen aus einer groben
  1/16-Fassung. Türme gleicher Art und Stufe teilen ihre Geometrie
  (`userData.shared` – nie freigeben). Statische Objekte auf 1/8-m-Positionen
  und nur in 90°-Drehungen – dann liegen alle Kanten exakt auf dem Pixelraster.
- Farben aus der Palette `src/render/palette.js` (`P.g5`, `P.e3` …).
- Keine Unschärfe, kein Bloom. Transparenz nur als gerasterte Durchsicht
  (Bayer-Dithering mit `discard`), damit Tiefenpuffer und Umrisse stimmen.
- Kühle Nacht-Tönung wirkt im Post-Pass nur auf dunkle und mittlere Töne,
  Lichtquellen bleiben warm.
- **Lesbarkeit vor Stimmung:** Jede Art (Quelle, Bau, Schlurfer, Turm, Loot)
  braucht eine eindeutige Silhouette und Farbe. Neue Modelle in Metern denken
  und im Maß 1/32 bauen (Natur 1/16).
- Wind und Flattern nur im Vertex-Shader (`createWorldMaterial({ wind })`,
  `wind: 'hang'` für Hängendes), nie per Neuaufbau von Geometrie. Das
  Wetter (M12) ändert über `uWind` nur die Stärke, nie die Phase (sonst
  flackert das Gras beim Überblenden).
- **Figuren sind geformt, nicht gestapelt (N1):** Köpfe, Rümpfe, Glieder, Mützen
  und Hunde entstehen aus Abstandsfeldern (`capsule`, `roundBox`, `blob`,
  `smoothUnion`, `subtract`, `sculpt` in `voxelKit.js`); die Farbfunktion
  bekommt die Flächennormale, `roundTone` gibt Kuppen Licht und Unterseiten
  Schatten. Gemeinsame Menschen-Formen, Glieder mit Knie und Ellbogen und die
  Vorderkarten `HEAD`/`TORSO` liegen in `src/entities/figureKit.js`. Gesicht,
  Bart, Brauen, Riemen und Taschen sitzen auf der vordersten Reihe der Rundung
  (`onFace`, `onChest`, `facePlate`), nie als Brett davor. Neue Figuren und
  Zombie-Arten so bauen – keine Kästen mehr.
- Gesichter sind Platten je Ausdruck (M12), nie Überlagerungen vor dem Kopf.
  Alles, was vor Mikas Körper liegt (Gesicht, Lider, Laterne, Werkzeug),
  braucht `renderOrder = 2` – Mikas Umriss (1.75) schimmert sonst darüber.
- **Der Moder (M15)** ist dunkles Pflaumenviolett (`P.d1`/`P.d2`, Knoten
  `P.a2`) und wächst nur im Unterholz, nie im Begehbaren. Nachts glimmt er
  nur über Eigenlicht (Bodentextur `emissiveMap`, Material `moderGlow`), nie
  mit einer Lichtquelle.

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
                      Erfahrung, Perk-Vergabe, Wirbel), skills (Mikas
                      Fähigkeiten: zwei Plätze, Abklingzeit, Wahl auf
                      Stufe 3/6/9, M16), towerRanks (Türme mit Geschichte:
                      Erfahrung, Rang, Wimpel, Name, Turm der Nacht, M16),
                      survivors (Überlebende:
                      Ankunft, Gespräche, Zelte, Aufträge, Fähigkeiten,
                      Funkturm), furnishing (Möbel, Gemütlichkeit), trader
                      (Balduin: Fahrplan aus der Uhrzeit, Einfahrt mit
                      Leine, Stand am Steg, Gesten, Handel über das
                      Werkbank-Fenster),
                      settings (Lautstärke, Pixelgröße, Textgeschwindigkeit –
                      eigener Speicherplatz, nicht im Spielstand)
src/audio/            sound (Web Audio: Effekte aus Rauschen und Oszillatoren,
                      Umgebung; erst nach der ersten Eingabe), music
                      (Soundtrack: Stücke als Noten-Daten, Instrumente,
                      Überblendung, Nachtstufen, Titelstück und die
                      Spieluhr des Startbilds)
src/render/           pixelRenderer (Low-Res + Post-Pass + Hochskalieren),
                      palette (+ LUT), cameraRig (Einrasten), materials
                      (Durchsicht/Ausblenden), voxel (Voxel-Baukasten),
                      staticMesh (sichtbare Flächen + Schatten-Stellvertreter),
                      portrait (Porträts ohne GPU-Auslesen), shaders
src/world/            world (Zusammenbau + Update), map (Karte: Bucht fest,
                      Wegenetz prozedural aus `mapSeed`, Abstandsfelder,
                      Begrenzung), layout (Grundriss der Bucht + feste
                      Quellen), terrain, water (Wellen auf dem See), nature,
                      shelter (das Haus von außen, Stufen), interior (Innenraum
                      als eigenes Bild: Räume je Stufe, Licht, Tür, M11),
                      props (Steg, Leuchtmast, Wrack,
                      Warnpfähle, Herbstschmuck: Kürbisse, Kürbislaternen,
                      Laubhaufen, Treibholz, Sitzplätze der Krähen), weather
                      (Wetter in der Welt: Licht, Wind, Nebelbänke, Laub,
                      Atem, Regen im Bild, M12), colliders, daynight, lights,
                      particles (auch trudelndes Laub mit Boden),
                      effects (Späne, Staub), grid (Bauraster mit Weg- und
                      Hof-Feldern), resources (Quellen, auch entlang der
                      Wege), buildings + buildingModels (Bauten, Barrikaden
                      mit Stufen und Trümmern, Umgeworfenes im Lager),
                      campModels (Wall und Tor je Stufe, Schlupftür,
                      Zubehör: Dornen, Laterne, Pechkessel, Glocke, M17),
                      towerModels (Türme je
                      Stufe/Spezialisierung), buildPreview (Geistermodell,
                      Felder), lightPools (Lichtinseln), pathing
                      (Flussfelder auf Weg und Hof, Rückweg, Wegvorschau),
                      furnitureModels (Möbel im Wohnraum des Innenraums),
                      voxelKit (Baukasten für feine Modelle: Farbstufen,
                      Bretter, Rundholz, Steine, Quader im 1/16-Maß,
                      Kantenlicht; FINE, FINE32)
src/entities/         player, characters (Figuren-Bauer), figureKit (Formen
                      für Menschen: Kopf, Rumpf, Glieder mit Knie/Ellbogen,
                      Vorderkarten, N1), horde (Schlurfer:
                      Instancing, Zustände, Angriffe), zombieModels, towers
                      (Zielen, Geschosse, Auren, Feuer), loot (Brocken,
                      Magnet, Zerfall), npcs (Überlebende in der Welt:
                      Laufen, Winken, Bellen, Lächeln), survivorModels (auch
                      Balduin), dogModel, traderModels (Balduins Boot),
                      crows (Krähen: sitzen, picken, fliegen auf, M12)
src/ui/               font, icons, ui (Leinwand + Panels), hud (auch
                      Nacht-Leiste, Lebensbalken, Randmarken), dialog, menu,
                      buildbar (Bauleiste), crafting (Werkbank und
                      Handel mit Balduin), mapView (Übersichtskarte, M), report
                      (Morgenbericht), perkChoice (Perk-Wahl), splash
                      (Startbild, N2), title (Titelbild, Name und Aussehen)
src/data/             texts, dialogs, items, buildings, recipes, goals,
                      towers (Werte je Stufe/Spezialisierung, Turmteile,
                      `towerStatsOf`), zombies,
                      waves (Wellenplan je Nacht, Tagesschlurfer), upgrades
                      (Figur-Aufwertungen), weapons (Waffenwerte je Stufe),
                      perks (Erfahrungskurve, Perks und ihre Wirkung),
                      reactions (Zustände, Reaktionen, Wetter-Wirkung, M18),
                      skills (Fähigkeiten, Ränge, Stufen der Wahl, M16),
                      difficulty (Gemütlich/Ausgewogen/Wild, M16),
                      survivors (Ankunft, Plätze, Funkturm, Tausch, Aufträge),
                      trader (Balduins Fahrplan, Angebote, Vorrat je Tag),
                      furniture (Möbel, Gemütlichkeit), looks (Aussehen der
                      Hauptfigur, erlaubte Namen), weather (Wetter je Tag aus
                      Startwert und Tag, Wirkung und Anteile, M12)
tools/serve.mjs       Statischer Server (ohne Abhängigkeiten)
tools/check.mjs       Prüfskript (Syntax, Headless-Rundgang, Screenshots)
tools/playtest.mjs    Playtest-Brücke (früher für Testspieler-Agenten)
screenshots/          Ergebnisse der letzten Prüfung
playtests/            Personas, Berichte, Zusammenfassungen
```

Grundprinzipien:

- **Zustand ist Daten.** Alles Gespeicherte liegt im Zustandsobjekt
  (`src/core/state.js`). three.js-Objekte sind nur Darstellung.
- Modi der Spielschleife: `splash` (Startbild »Tales of Cue präsentiert«, N2), `title` (Titelbild), `play`, `dialog`, `menu`, `craft` (Werkbank),
  `report` (Morgenbericht), `perk` (Perk-Wahl), `sleep` (Schlafen, Ausruhen, Werkeln, verlorene
  Nacht, Ohnmacht – alle mit Abblende). Zeit läuft nur in
  `play`; Bauen geht jederzeit in `play`. `Game.step(dt)` ist ein Simulationsschritt
  (Update + Eingabe-Abschluss), gezeichnet wird danach mit `render()`.
- **Klicks werden in `update()` ausgewertet**, nicht beim Zeichnen (sonst
  gehen sie bei der Schrittsimulation verloren). Layouts, die beides
  brauchen, berechnet eine eigene `layout()`-Methode.
- Die Oberfläche ist ein 2D-Canvas in Spielauflösung, sofort-modus gezeichnet.
- **Eingaben im Spielmodus, in dieser Reihenfolge:** Bauleiste (Kacheln,
  Q R T G C V, Tab; Abreißen liegt immer auf V) → Schnellleiste und
  Fähigkeiten-Kacheln → Abbrechen (Esc/Rechtsklick, vor dem Menü) → Karte (M),
  Ansicht (Z), Welle rufen (N), Zeitraffer (B), Fähigkeiten (Rechtsklick –
  nur wenn er nicht gerade das Bauen abbricht – und X, M16) → Bewegung
  (Leertaste: Ausweichrolle) →
  Builder (Vorschau, Setzen, Auswahl per Klick – ein Schlurfer unter dem
  Zeiger geht vor, dann ist der Klick ein Schlag) → Interaktion (E) →
  Sammeln bei gehaltenem E. `use` (E/Enter) gilt im Spiel, `confirm`
  (E/Enter/Leertaste) in Dialogen und Menüs, `dodge` (Leertaste) im Spiel.
  Im Trefferstopp bleiben Tastendrücke liegen (`frozenFrame`, kein
  `endFrame`), damit kein Druck verloren geht. Esc gehört dem Spiel
  (Capture-Phase, `preventDefault`, `stopPropagation`) – im Artefakt-Rahmen
  nahm die Seite ringsum dem Spiel sonst den Tastaturfokus (M9.1). Ohne
  Fokus zeigt das Spiel einen Hinweis (`input.lostFocus`); der Klick, der
  den Fokus zurückholt, ist kein Schlag.
- **Einleitung (M15):** Dialogzeilen mit `blick` lenken die Kamera
  (`world.lookSpot`, `game.tourFocus`: weich geführt, vor dem Einblenden
  springt sie), `karte` zeigt die Karte der Wege über dem Dialog
  (`mapView.drawInset`). Solange die Einleitung läuft (`introRunning`), zeigt
  das Bild nur den Dialog. Gedanken aus der Welt (`thought` an einer
  Interaktion, Waldrand) sind Sprechblasen aus `T.geschichte`.
- **Die Maus wählt nur, wenn sie bewegt wird** (`input.mouse.moved`), sonst
  überschreibt ein ruhender Zeiger die Tastaturwahl. Vorgewählt ist in
  Rückfragen immer die harmlose Antwort (`standard: true` in dialogs.js).
  Was Vorrat verbraucht, ohne dass man es sofort sieht (Verwerten an der
  Werkbank), geht nur mit gehaltenem E und Balken – nie mit einem zweiten
  Druck, der sich wie verschluckt anfühlt. Gedanken am Abend und in der
  Nacht sind Sprechblasen, nie Dialoge (die halten das Spiel an).
- **Karte (Meilenstein 9, `map.js`):** Die Bucht (Haus, Hof, Steg, See) ist
  fest, das Wegenetz links davon entsteht aus `state.world.mapSeed` (drei
  Spawns am linken Rand, Zuführungen, gemeinsamer letzter Abschnitt in den
  Hof). Die Welt wird erst gebaut, wenn der Spielstand gelesen ist; ein neues
  Spiel über einem alten Stand lädt die Seite neu (frische Karte). Begehbar
  ist, was `map.walkableRaw` sagt (Bucht, Steg, Streifen neben den Wegen);
  die Kollision schiebt über das Abstandsfeld zurück (`pushInside`).
- **Bauraster:** 1-m-Zellen über der ganzen Karte (`grid.js`) mit
  `path` (Wegfeld: Mitte der Zelle höchstens 0,2 m vom Wegrand) und `yard`
  (Hof). Statisch blockiert ist alles mit Kollision plus die Grundfläche
  aller Ausbaustufen des Zuhauses. **Barrikaden nur auf Wegfeldern, alles
  andere nie darauf** (Gründe `nurWeg`/`aufWeg`). Die Horde rechnet zwei
  Flussfelder nur über Weg und Hof (`pathing.js`): `walk` (jeder Bau sperrt)
  und `brute` (Barrikaden kosten viel, Trümmer nichts) – alle Schlurfer
  laufen nach `brute`, wer abseits steht, findet über `back` zurück auf den
  Weg. Nach jeder Bauänderung `pathing.rebuild()`; ein Bau, der den Hof vom
  Weg abschneiden würde, wird mit Grund `weg` abgelehnt (Barrikaden nie).
  Die Wegvorschau beim Bauen bleibt; Umlenken über andere Zweige gibt es
  nicht (OFFENE-FRAGEN Nr. 66: entschieden, kein Umlenken). Wer Mika jagt und
  einen Bau vor sich hat, kommt über eine kleine Breitensuche um Mika
  (`chaseDirection`) außen herum. Endet die Jagd, geht er zur letzten Stelle
  auf Weg oder Hof zurück (Zustand `rejoin`, `towardDirection`) – sonst stünde
  er hinter einer Barrikadenreihe, um die er Mika nachgelaufen ist (m12-r1).
  Über eigene Barrikaden klettert die Figur (Kollision mit `climb`, die
  Figur bewegt sich mit `{ climb: true }`), die Horde nicht.
- **Horde und Türme sind Daten plus Instancing:** Schlurfer liegen in
  `horde.list` (Zustand, Leben, Position) und werden je Art und Körperteil
  als `InstancedMesh` gezeichnet; ein unsichtbares Gerüst posiert die Teile.
  Werte stehen in `src/data/zombies.js`, `towers.js`, `waves.js` – dort
  wird balanciert, nicht im Code.
- **Konstante Lichtzahl:** Gebaute Lampen bekommen kein Punktlicht, sondern
  eine Lichtinsel (`lightPools.js`) und ein Glüh-Material.
- **Das Lager (M17, `data/buildings.js` CAMP_*, RAID, GEAR):** Wall und Tor
  stehen immer (Spalte i = −8, `CAMP_LAYOUT`; `game.ensureCamp` stellt sie bei
  einem neuen Spiel und nach dem Laden eines alten Stands auf und erstattet,
  was auf der Linie stand). Sie sind Bauten mit `camp` und `smash`: Die Horde
  schlägt sie ein wie Barrikaden (im Flussfeld `GATE_COST`), tagsüber nur bis
  75 % (`CAMP_DAY_FLOOR`). Die Schlupftür in der Mitte des Tors hat eine
  Kollision mit `livingFree` (sperrt nur die Horde); `world.wicketAssist`
  lenkt Mika hinein. Solange nichts eingebrochen ist (`buildings.campShut`),
  jagt kein Schlurfer Mika durch Wall und Tor – er geht zum Tor und schlägt
  es ein. Wer im Lager steht, wechselt in den Zustand `raid` und wirft um, was
  `raid`-Haltbarkeit hat (Werkbank, Zelte, Beete, Lampen, Bänke, Holzlager):
  `broken` heißt dort »umgeworfen« (Haufen aus `collapseModel`, keine
  Funktion, E wählt nur aus, Aufstellen für die Hälfte). Zubehör (`b.gear`)
  hängt an Barrikaden (je Stufe ein Platz) und am Tor (drei) und wird in
  `game.gearHit` beim Schlag ausgelöst; Licht (Laternenturm, Leuchtfeuer,
  Laternen) lässt Schlurfer auch langsamer zuschlagen.
- **Zustände und Reaktionen (M18, `data/reactions.js`):** Jeder Schlurfer hat
  Uhren für nass, frostig, matschig, geblendet (`wetT` …); `horde.status`
  setzt sie, `horde.react` prüft jedes Bild Eisblock, Dampf und Glut,
  `horde.damage` lässt einen Eisblock zerspringen und prüft die
  Schwachstelle (Bolzen: `kind: 'bolzen'`), `towers.explode` Splitter und
  Klebekürbis. `horde.reaction` meldet über `onReaction` (Wort mit
  `hud.popWord`, Klang, Notizbuch `state.notes`); dieselbe Reaktion je
  Schlurfer nur alle paar Sekunden. Regen (`ctx.wet`, `ctx.burnFactor`) und
  Nebel/Wind (`towers.weatherRange`) wirken über das Wetter der Welt.
- **Drinnen ist ein eigenes Bild (M11, `interior.js`):** Der Innenraum liegt in
  derselben Szene bei x ≈ 300 (östlich der Karte); `world.isInside` erkennt ihn,
  `game.applyView` stellt die Kamera um (160 px/m, Grenzen des Raums), sobald
  Mika drinnen ist – auch nach Teleport und Laden. Die Haustür löst einen
  Übergang aus (`world.passageAt`, `game.passage`). Kamin- und Tischlicht
  stehen fest im Innenraum. Neue Räume: `ROOMS`, `ROOM_BUILDERS`,
  `ROOM_COLLIDERS`, `ROOM_INTERACTIONS`, `ROOM_POOLS` in `interior.js`.

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
   Speichern v4 (Bilder: nahkampf, perks); ab Meilenstein 6: Ankunft der
   Überlebenden, Knopf mit echten Tasten, Einzug ins Zelt, Tauschen,
   Aufträge, Einrichten, Morgengaben, Funkturm, Bellen vor Welle 1,
   Speichern v5 (Bilder: ueberlebende, einrichten); ab Meilenstein 7:
   Titelbild mit getipptem Namen und anderer Mütze, kein Spielstand vor
   »Los geht’s!«, Speichern v6 mit Migration, Warnung vor einem Weg ohne
   Turm, ein jagender Schlurfer kommt um die Werkbank herum (Bilder: titel,
   figur); ab Meilenstein 8: Wrack nur einmal, Schrotthaufen alle zwei
   Tage, Beute sind Zombieteile, Balduin kommt an Tag 2 ab 06:40 mit dem
   Boot und legt am Steg an, Dialog und Handel mit echten Tasten (E einmal,
   E gehalten), Vorrat je Tag, Abfahrt um 12:00 (Bilder: haendler, handel);
   ab Meilenstein 9 (Abschnitt `wege`): drei Spawns links, alle Wege enden
   am Haus, die Horde bleibt auf den Wegen, Türme nie auf Wegfeldern,
   Barrikaden nur dort, eine Barrikadenreihe hält die Horde auf, zerbricht
   zu Trümmern, wird tagsüber wieder aufgebaut und bis Metall ausgebaut,
   Überreste halten drei Tage, tagsüber nur einzelne Schlurfer,
   Übersichtskarte mit M, Speichern v8 mit Startwert der Karte, Migration
   v7 → v8 mit Erstattung und Umzug der Bauten (Bilder: wege, barrikaden,
   karte); ab M9.1: Zombieteile von Hand immer, von Türmen etwa jedes zweite
   Mal, der Anführer immer, Balduins Fanfare bei der Ankunft, »Tschüss,
   Balduin!« schließt den Handel, er verabschiedet sich und legt ab; ab
   M10: Balduins Boot kommt zwischen den Inseln, die Leine liegt über dem
   Poller, er lüftet die Mütze, winkt nach dem Handel, Turmteile (Glücksmünze
   an Tag 4 kaufen, mit echter Taste einbauen, Teile von jedem Abschuss,
   Speichern v9, keine Münze im Laternenturm); ab M10d: Musik tagsüber
   »tag«, bei der Welle »nacht«, alle Stücke offline ohne Übersteuerung; ab
   M11: Haustür mit echten Tasten (hinein mit 160 px/m, hinaus), Schlafen und
   Laden im Innenraum, Migration v9 → v10, Stufen 3–5 (Suppe, Werkbank
   drinnen, Bett im Schlafzimmer, Gemütlichkeit +2), Holzlager (Bilder:
   innen, kueche, schlafzimmer); ab M12 (Abschnitt `herbst`): Wetter je Tag
   (fest, die ersten beiden klar, alle Arten), Regen im Bild und nicht
   drinnen, Nebel am Morgen, Wetter in Uhr und Morgenbericht, Schilf,
   Kürbislaternen nachts hell, Laub stiebt auf (echte Taste), Krähen fliegen
   vor Mika und Schlurfern auf, kommen wieder und ziehen abends weg, Mikas
   Gesicht (Aua, froh, müde), Bert lächelt nur, wenn Mika dabeisteht (Bilder:
   wetter-regen, wetter-nebel, laternen, herbst); ab m12-r1 (Abschnitt
   `nachbesserung`): Morgenbericht nach dem Neuladen wieder offen, Haustür mit
   Hinweis und E, Kiesel-Ziel ohne Stein, Turm-Ziel nur mit Horde in
   Reichweite, Herzschlag bei wenig Leben, Banner, wenn das Zuhause nachts
   wankt, Fackeln und Eigenlicht der Wege, Jäger kehren vor die
   Barrikadenreihe zurück (Gegenprobe: ohne Rückkehr zogen sie vorbei),
   schnelles E nach einem Dialog öffnet nichts, ein bewusstes schon, Mika
   klettert über die eigene Barrikadenreihe, drinnen ist das Werkzeug
   weggesteckt, in einer dichten Reihe trifft der Zeiger die Barrikade
   darunter, neben dem Sessel geht die Werkbank vor, drinnen sind auf Stufe 5
   alle Räume zu Fuß erreichbar (nicht nur per Versetzen), E an der
   Reifenschaukel lässt Mika schaukeln; ab M13 (Abschnitt `ansicht`): draußen
   weit mit 80 px/m als Standard, Z und Y gehen nah heran (160 px/m) und
   zurück, die Wahl bleibt gespeichert, drinnen ändert Z nichts, Platzieren
   mit der Maus trifft auch nah das richtige Feld (Bilder: nah-tag, nah-haus,
   nah-nacht); ab M13g: alle Modellfamilien draußen (außer der Natur) sind an
   ihrer Geometrie gemessen im Maß 1/32, und die Bildlast im Hof bleibt unter
   1,5 Mio. Dreiecken; ab M15 (Abschnitt `geschichte`, dazu im Spielstart):
   die Einleitung fährt mit echten Tasten vom Waldrand über Unterholz,
   Zusammenfluss (mit der Karte der Wege) und Haus zurück zu Mika, danach
   folgt die Kamera wieder der Figur; der Moder glimmt im Unterholz, seine
   Pilze stehen nie im Begehbaren; Mika denkt am Waldrand mit echter Taste
   einmal am Tag über den Moder nach (am nächsten Tag ein anderer Satz); E am
   Warnpfahl gibt einen Gedanken, keinen Dialog (Bilder: intro-wege,
   moder-nacht); ab N1 (Abschnitt `figuren`): Köpfe und Rümpfe von Mika, allen
   Schlurfer-Arten, den Überlebenden, Balduin und Knopf sind gewölbt (höchstens
   rund die Hälfte einer Vorderseite in einer Ebene), Mika beugt beim Gehen mit
   echter Taste die Knie und hält die Laterne (F) mit angewinkeltem Arm (Bild:
   figuren); ab N2 (im Spielstart): zuerst das Startbild »Tales of Cue
   präsentiert« ohne jeden Klang, eine echte Taste startet die Spieluhr, dann
   blendet das Titelbild mit der Titelmusik ein; nach »Los geht’s!« ist sie
   aus; Titelstück und Spieluhr rechnen offline ohne Übersteuerung (Bild:
   startbild); ab M16 (Abschnitt `nacht16`, dazu die neue Zeile
   »Schwierigkeit« im Titelbild): Nacht 1 kommt über je einen Weg, ab Nacht 2
   auch über zwei oder drei, die Schwierigkeit ändert das Budget; am Abend
   zeigen Nachtplan und Randmarke die erste Welle; N ruft in der Pause die
   nächste Welle (Mutbonus), B verdoppelt nachts das Tempo; ein echter
   Rechtsklick blitzt mit der Laterne (lähmt ringsum, Abklingzeit, ein zweiter
   Klick wartet); Stufe 3 bietet drei Fähigkeiten, Taste 1 legt eine auf X;
   X wirft einen Kürbis an den Zeiger; ein Rückstoß bricht das Ausholen eines
   Schlurfers nicht mehr ab; Türme sammeln im Beschuss Erfahrung, steigen mit
   Wimpel auf und tragen Namen (auch im Spielstand); der Morgenbericht kürt
   den Turm der Nacht; die Schwierigkeit lässt sich im Pausenmenü mit A/D
   umstellen; Migration v10 → v11 (Bilder: nachtplan, faehigkeiten,
   faehigkeit-wahl, turm-rang, turm-der-nacht); ab M17 (Abschnitt `lager`):
   Weidenzaun mit Tor von Anfang an, der letzte Weg läuft durchs Tor; A führt
   Mika durch die Schlupftür hinaus (die Laufhilfe lenkt von der Seite
   hinein), D wieder herein; ein Streuner kommt tagsüber nicht durch und nagt
   das Tor nur bis drei Viertel an; nachts fällt es mit Banner, die Horde
   wirft im Lager die Werkbank um, der Morgenbericht nennt Uhrzeit, Anzahl
   und Umgeworfenes; E und Q bauen das Tor wieder auf, Q Q machen es zur
   Palisade, E und Q stellen die Werkbank wieder auf; R R bringt Dornen an
   eine Barrikade, das Metallkreuz trägt dazu Laterne und Pechkessel, im
   Kampf stechen, brennen und bremsen sie; die Alarmglocke läutet beim ersten
   Schlag der Nacht, Bert flickt das Tor; Speichern v12 (Stufe, Zubehör,
   Umgeworfenes) und Migration v11 → v12 (Bilder: lager, lager-nacht,
   zubehoer); ab M18 (Abschnitt `reaktionen`): alle sechs Reaktionen mit
   echten Türmen am Weg (der Zustands-Turm stromauf), Zeichen über den Köpfen,
   Worte, der Eisblock zerspringt; Regen macht nass, Nebel kürzt die
   Reichweite; das Notizbuch mit Esc, S, E; Speichern v13 und Migration
   v12 → v13 (Bilder: reaktionen, notizbuch).
   **Jede Konsolenmeldung
   (Fehler oder Warnung) lässt die Prüfung scheitern.** Bildzeiten sind in
   Headless softwaregerendert und nur grobe Anhaltspunkte.
   Playwright kommt aus `node_modules` oder der globalen Installation;
   Chromium liegt unter `/opt/pw-browsers`. Nie `playwright install`.
3. **Screenshots ehrlich ansehen** und mit DESIGN.md vergleichen.
4. Screenshots mit committen.

Neue Systeme bekommen im Prüfskript eigene Prüfpunkte – nur für ihren Kern
(z. B. Turm bauen, Welle besiegen, Loot einsammeln), sobald sie existieren.

## Keine Testspieler-Agenten mehr

**Wunsch des Auftraggebers (28.09.2026):** Es werden keine Testspieler-Agenten
mehr gestartet – sie verbrauchen zu viele Tokens. Gebaut wird; geprüft wird
nur das Wichtigste mit dem Prüfskript (siehe Prüfablauf), den Rest testet der
Auftraggeber selbst. Seine Rückmeldungen werden wie früher die Befunde der
Testspieler nach Schwere behandelt (Blocker zuerst). `tools/playtest.mjs`,
`playtests/PERSONAS.md` und die alten Berichte bleiben als Werkzeug und
Archiv liegen, werden aber nicht mehr von selbst genutzt.

## URL-Parameter

| Parameter | Wirkung |
|---|---|
| `?time=21:30` | Startuhrzeit setzen |
| `?nosave` | Weder laden noch speichern |
| `?nointro` | Titelbild und Einführungsdialog überspringen |
| `?notitle` | Nur das Titelbild überspringen |
| `?debug` | Entwickler-Anzeige an (sonst F3), `window.zomfy` |
| `?test` | Test-Modus: kein Titelbild, kein Intro, `window.zomfy` (Uhr stellen, versetzen, …) |
| `?playtest` | Playtest-Brücke: `window.__zomfyStep(ms)`, `window.zomfyView()` (nur lesen) |

Im Test-Modus kann `window.zomfy` außerdem Schlurfer erzeugen
(`spawnZombie`), die Horde abschalten (`setHorde(false)` für ruhige Bilder),
eine Nacht beenden (`endNight`), Türme ausbauen (`upgradeTower`), die Wege
als Textkarte zeigen (`debugPath`), Erfahrung geben (`giveXp`), Waffen
geben (`giveWeapon`) und Perks wählen (`choosePerk`); ab Meilenstein 6
Überlebende setzen und ansprechen (`setSurvivor`, `talkTo`, `moveIn`),
Möbel kaufen (`buyFurniture`) und den Funkturm stellen (`setTowerStage`);
ab Meilenstein 8 Balduin abfragen (`trader`), bei ihm tauschen (`trade`)
und prüfen, ob ein Bau passt (`placeCheck`, mit Grund); ab Meilenstein 9
die Karte abfragen (`mapInfo`, `traces`, `pathColumn`, `onPathOrYard`),
Schlurfer an einem Spawn starten (`spawnAtEntry`), Barrikaden treffen,
wieder aufbauen und ausbauen (`hitBarricade`, `rebuildBarricade`,
`upgradeBarricade`) und Überreste fallen lassen (`dropLoot`, `lootDetails`);
ab M9.1 einen Schlurfer mit einer bestimmten Ursache erledigen
(`killZombie(id, 'turm'|'spieler')`) und die Teile-Chance der Türme setzen
(`setPartsChance`, `null` = Wert aus `zombies.js`); ab M10 zeigt
`trader()` auch Boot-z, Leine (`rope`, Glieder) und Balduins Gesten;
ab M10d berechnet `renderMusic(id, s, stufe)` ein Musikstück ohne
Lautsprecher (Spitze, Mittelpegel), `sound().music` nennt das laufende
(ab N2 auch `renderMusic('titel' | 'jingle')`, `sound().jingles` zählt die
Spieluhr, `zomfyView().startbild` zeigt Phase und Texte des Startbilds);
ab M11 zeigt `interior()` Eingang, Ausgang, Grenzen, Räume, Maßstab und ob
Mika drinnen ist, `wakeSpot()` liegt im Innenraum; ab M12 zeigt `weather()`
Art, Regen, Wind, Tropfen und Nebel, `setWeather(art, sofort)` erzwingt ein
Wetter (`null` = wie der Tag), `crows()` nennt Zustand und Sitzplatz der
Krähen und wie oft sie krächzend aufgeflogen sind, `settleCrows()` setzt sie
auf ihre Plätze; ab M13g misst `detail()` je Modellfamilie die kleinste
Kantenlänge der Geometrie (»Voxel je Meter«, 32 = doppelt fein); ab M15
zeigt `camera()` den Blickpunkt der Kamera, die laufende Fahrt der
Einleitung und die Dialogzeile, `lookSpot(ort)` die Blickpunkte der
Einleitung (`wald`, `unterholz`, `zusammen`, `haus`); ab M16 zeigt
`skills()` Plätze, Ränge, Abklingzeiten, Nutzungen und eine offene Wahl,
`useSkill(k)` nutzt Platz k, `learnSkill(id, platz)` legt eine Fähigkeit
auf einen Platz, `chooseSkill(id)` nimmt eine Karte der Fähigkeiten-Wahl,
`readySkills()` beendet alle Abklingzeiten; `towerRanks()` nennt je Turm
Name, Erfahrung, Abschüsse, Rang und Wimpel, `giveTowerXp(id, n)` schenkt
Erfahrung; ab M17 nennt `camp()` Wall und Tor (Stufe, Leben, Aussehen,
Schlupftür, Zubehör), `hitCamp(id, n)` trifft sie, `upgradeCamp(id)` baut
sie aus, `lager()` zeigt Ostkante, Umgeworfenes, Plünderer, Nachtwerte
(Durchbruch, im Lager, umgeworfen) und Laternen, `addGear(id, art)` bringt
Zubehör an, `raidHit(id, n)` trifft einen Bau im Lager; ab M18 nennt
`statuses()` je Schlurfer die Zustände, `applyStatus(id, art, s)` setzt einen,
`notes()` zeigt das Notizbuch, `words()` die Worte über den Köpfen,
`towerReach(id)` die Reichweite eines Turms bei diesem Wetter und
`stickies()` die klebrigen Flächen.
`window.zomfy.game` gibt im Test-Modus das ganze Spiel (nur für Prüfungen).
Zum Abtasten der Kollision gibt es `probeMove` (Weg in Metern) und
`probeWalk` (Endstelle) – beide bewegen die Figur ohne Zeichnen.
| `?spawn=inside` | Spielfigur startet drinnen am Bett (Innenraum, M11) |
| `?seed=123` | Anderer Welt-Seed (Modelle, Zufall) |
| `?map=123` | Startwert des Wegenetzes erzwingen (sonst je neuem Spiel zufällig; `?test`/`?playtest` nehmen 3) |
| `?zoom=nah` / `?zoom=weit` | Ansicht draußen erzwingen (M13; Standard weit) |

## Arbeitsweise

- Meilensteine der Reihe nach, jeder in sich spielbar. Lieber wenig und
  richtig gut als viel und halbfertig.
- **Spaß-Meilensteine (ab M16, DESIGN.md 8 und 10):** Jede neue Mechanik wirkt
  in der ersten Nacht, in der sie auftaucht, sichtbar; jede Wahl hat eine
  Gegenseite; Werte stehen in `src/data/`; jede Mechanik bekommt Prüfpunkte.
- Nach jedem Meilenstein und jeder Nachbesserung: Prüfablauf, `PROGRESS.md`,
  committen und pushen.
- Offene Designfragen mit der Annahme entscheiden, die am meisten Spielspaß
  verspricht, und in `OFFENE-FRAGEN.md` festhalten.
- Hakt ein Werkzeug: Umweg finden, im Logbuch notieren, weitermachen.
- **Weiterarbeiten über das Nutzungslimit hinweg (Wunsch des Auftraggebers):**
  Zu Beginn jeder neuen Sitzung bzw. jedes neuen 5-Stunden-Fensters eine
  Weck-Erinnerung (`send_later`) auf den Zeitpunkt stellen, an dem sich das
  Limit zurücksetzt (Beginn des Fensters + 5 Stunden; frühere Rücksetzungen
  stehen als »resets …« bzw. `resetsAt` im Verlauf). Weckt sie, und es läuft
  gerade nichts: den Meilensteinplan fortsetzen – nach jedem Meilenstein
  Prüfung, Logbuch, Commit, Push und das Artefakt neu veröffentlichen.
