# CLAUDE.md – Regeln für Zomfy Towers

Dieses Dokument gilt für jede Arbeitssitzung an diesem Repository.

| Datei | Inhalt |
|---|---|
| `DESIGN.md` | Vision, Look, alle Systeme, Meilensteinplan, Spaß-Leitlinien (Abschnitt 10) – **vor jeder Arbeit lesen** |
| `PROGRESS.md` | Logbuch: was fertig ist, Playtest-Befunde, Änderungen, Offenes |
| `OFFENE-FRAGEN.md` | Designentscheidungen, die DESIGN.md offenließ (mit Begründung) |
| `KONZEPT-GEMEINSCHAFT.md` | Gemeinschaftskonzept des Auftraggebers mit Analyse (entschieden 29.09.2026: OFFENE-FRAGEN 161–176, Plan M26–M33) |
| `recherche/` | Recherche-Berichte: Gemeinschaft, Glocke und Waffen, Kartenspiel (mit Simulator `karten-sim.mjs`), Premium-Pixel, Intro und Einführung; seit 30.09.: Schlurfer als Sprites, HUD und Baumenü, Storytelling und Namen (Plan in DESIGN 8, Nr. 196–198), Gestaltungsbogen der Horde (`schlurfer-gestaltung.md` mit Bildern), die Präsentation am Anfang (`praesentation.md`, N11); seit 01.10.: die Menschen schöner zeichnen (`menschen-gestaltung.md`, F5), die Geschichte der Ankunft (`ankunft-geschichte.md`, G7: Kanon, Lücken, Entscheidungen) |
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
- **Namen mit Herkunft (G1, Nr. 202):** der Kranichsee, die Ellerbucht (im Alltag die alte
  Holzlände), der Lange Jakob am Steg, die Seewelle im Radio (Junas Vater baute den Sender, Edda
  las, Juna sendet), die Inseln Wartholm, Kiekwerder, Kürbisholm und Apfelwerder, Edda am
  Sturmhuk. Neue Orte bekommen Namen mit Herkunft statt Platzhaltern; im Code bleiben die IDs.
- **Kein Umlenken (OFFENE-FRAGEN Nr. 66, entschieden):** Die Horde wird nicht
  auf Umwege gelenkt, das Wegenetz bleibt ein Baum; die Wegvorschau bleibt.
- **Ein Spiel hat ein Ende (Nr. 117):** Finale nach einem Herbst, danach
  weiterspielen (Roguelike-Nächte, Nebenaufträge) oder neue Runde (M25).
- **Zuflucht sein (ab M26, Nr. 161–176, DESIGN 0.13):** Menschen kommen, Mika
  nimmt sie auf oder bringt sie weiter – niemand wird weggeschickt. Bewohner
  sind keine kostenlosen Türme: Die Horde wird ohne sie balanciert, Posten
  unterstützen nur. Zu den Waffen greifen sie erst nach der Lagerglocke, und
  nur dann kann jemand sterben (nie auf »Gemütlich«, Knopf nie). Wehmut ja,
  Schuld nein; Treffer ohne Blut (Sporen, Laub).
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
   AudioContext erst bei einer echten Eingabe anlegen (sonst Warnung) – oder
   wenn `sound.allowed()` sagt, dass die Seite schon eine hatte (N11). Nie
   eine Taste nur verlangen, damit Klang entstehen darf (Startbild, N11).
6. **Spielstand nie kaputt machen.** Änderungen am Speicherformat erhöhen
   `SAVE_VERSION` in `src/core/state.js` und bekommen eine Migration in
   `src/core/save.js`; `sanitizeState` ergänzen. Alte Stände müssen laden – auch aus einer
   gesicherten Datei (S1: `parseSaveFile` migriert und prüft sie genauso).
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
  ganzzahlige Skalierung; die Einstellung »Oberfläche« (H4, `UI_SIZES`) verschiebt den Faktor
  um einen Schritt, solange 270 bis 540 Zeilen bleiben. Fenster, die hoch werden können
  (Pausenmenü, Herbstbuch), passen sich der Höhe an – neue Fenster auch bei 270 Zeilen prüfen. Welt → Oberfläche über `game.worldToUi`, Zeiger →
  Welt über `game.pointerGround` (beide rechnen den Faktor
  `pixel.uiToScene` um). Pixelgrößen in der Szene (Partikel, Durchsicht-Loch)
  mit `pxPerMeter / 40` skalieren.
- Kamera: orthografisch, **Gier immer 0** (Blick nach Norden, −Z), Neigung
  sin = 0,6 / cos = 0,8. Wackeln (M26) nur in ganzen Pixeln, nie gedreht.
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
- **Was am Bildschirm hängt, kommt nach dem Raster (30.09., Nr. 200):** Dunst und Vignette
  legt der Post-Pass erst nach der Palette weich über das Bild. Das Raster der Palette hängt an
  der Welt – ein Verlauf am Bildschirm davor ließe beim Gehen Tausende Pixel je Bild kippen
  (»der Nebel flackert«; der Abschnitt `nebel` misst es).
- **Nichts Wechselndes darf am Bildschirm hängen (30.09., Flackern beim Laufen):** three.js dreht
  die Stichproben weicher Schatten mit einem Rauschen je Bildpunkt (`gl_FragCoord`) – beim Laufen
  kochten alle Schattenränder. `pixelRenderer.js` ersetzt es durch eine feste Drehung. Neue
  Muster (Dithering, Rauschen) immer über `uDitherOffset` an die Welt hängen; der Abschnitt `nebel`
  rückt die Kamera bei stehender Zeit um je einen Pixel und zählt, was sich ändert.
- **Lesbarkeit vor Stimmung:** Jede Art (Quelle, Bau, Schlurfer, Turm, Loot)
  braucht eine eindeutige Silhouette und Farbe. Neue Modelle in Metern denken
  und im Maß 1/32 bauen (Natur 1/16).
- **Die Bildmitte gehört dem Spiel (N4):** Hinweise und Erklärungen spricht
  Edda über Funk unten links (seit H1; `game.funk.say`, einmalig `funk.once(flag,
  text)`), nie ein Kasten in der Mitte und nie ein Dialog; Meldungen
  (`hud.toast(text, zeichen, dauer, art)`) stehen rechtsbündig unter dem Vorrat, höchstens
  zwei (H2); Alarme (`'alarm'`) stehen in der roten Zeile der Nachtleiste, Neues im Buch
  (`'chronik'`) als Lesezeichen an der Uhr. Der Nachtplan steht in der Nachtleiste, der ganze
  auf der Karte (M).
- **Feste Zonen (H3):**
  - Oben links: Uhr mit Chronik, darunter das Ziel (eine Zeile, in der Welle aus).
  - Oben Mitte: Nachtleiste und Bossbalken.
  - Oben rechts: Vorrat (Grundsorten, Seltenes nur beim Bauen, bei Mausberührung und nach einer
    Änderung), darunter höchstens zwei Meldungen.
  - Unten links: Mikas Leiste (bis zum letzten belegten Platz) mit Edda darüber.
  - Unten rechts: Knopf bzw. Baumenü.
  - Die Mitte gehört der Welt; Randmarken liegen im freien Rechteck (`hud.freeRect`).
  - Jede neue Tafel meldet sich mit `hud.addPanel(name, rect, fest)`, damit `hud.layoutInfo()`
    und die Prüfung sie sehen.
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
  Schlurfer (1.8) liegen über dem Umriss: Er scheint nur durch Bauten und
  Türme, nicht durch die Horde (m16-r1: im Getümmel ein gelbes Knäuel).
- **Sprites (F1, seit F2 Standard):** Die Horde erscheint als Sprites (Einstellung »Schlurfer:
  3D/2D«, `horde.spriteLook`; Standard 2D, die Prüfung bleibt bei 3D). Sprites werden im Spiel aus
  Formen gebacken (`zombieSprites.bakeFrame`), nie gemalt oder geladen: 1/40 m je Texel (2 × 2
  Bildpunkte bei 80 px/m), 5 Richtungen gezeichnet und 3 gespiegelt, Palette und Kontur aus den
  Pixelregeln des Bäckers. Im Bild ein Quad je Figur, der Fußpunkt rastet auf
  `spriteUniforms.uPx` (das Spiel setzt `rig.px`); über der Fußlinie aufrecht, darunter auf dem
  Boden (Fußknick, F2). Schatten und Ausblenden nur gerastert, nie geblendet.
  - **Backen (F2):** Worker (`spriteWorker.js`) backen im Hintergrund, was im Bild steht, dann die
    Arten der kommenden Nacht (`game.planSprites`), dann die übrigen (`BACKGROUND`); Bosse nur,
    wenn sie kommen. Eine Fassung (Art × Größe: Champions ×1,15, Teile des Moosriesen ×0,55) ist
    fertig, wenn alle 85 Bilder da sind – bis dahin bleibt sie Voxel. Ohne Worker backt
    `hordeSprites.pump` ein Bild je Bild im Spiel. Neue Größen nie skalieren, sondern backen.
  - **Atlas (F2):** Array-Textur aus Seiten von 1024², je Texel Palettenindex, Art und Normale in
    der Bildebene (`spriteCode.js`, ohne three.js). Nur Palettenfarben; höchstens 16 Seiten.
  - **Nachts lesbar (F3b):** Um jedes Eigenlicht glimmt nachts ein Hof aus genau einem Texel in
    seiner Farbe (auch in der Nebelwelle); Champions tragen einen goldenen Rand an der Kontur
    (`aInfo.y`, pulsiert, nachts heller) statt der goldenen Tönung. Der Shader liest Nachbarn nur
    im eigenen Rechteck (`spriteAt`) – daneben liegt im Atlas ein anderes Bild.
  - **Gestaltungsbogen (F-Design, `recherche/schlurfer-gestaltung.md`):**
    - Alle 17 Formen der Horde (16 Arten und der Schildträger ohne Tür) haben einen Bauplan in
      `zombieSpriteKinds.js`, gebaut auf dem Gerüst `spriteFigure.js` (`humanoid(ctx, B)` mit Maßen
      aus `BODY`, Gangarten, Posen).
    - Große Arten werden wie Größe 1 gebaut und als Ganzes skaliert; ein Texel bleibt 1/40 m.
    - Muster auf einer Form über `matAt(l, p)` im eigenen Rahmen der Form (Haar, Kapuze, Karo,
      Flicken, Tupfen). Unter y = 0 ist Erde.
    - Je Richtung 17 Bilder: gehen 6, stehen 2, ausholen 1, schlag 3, treffer 1, fallen 4.
    - Müde statt gierig, kein Blut, jede Art mit Merkmal oben und Eigenlicht für die Nacht.
    - Neue Arten dort bauen und ansehen mit `node tools/schlurfer-bogen.mjs datei.png --art=…` und
      `node tools/schlurfer-reihe.mjs datei.png` (ohne Browser).
- **Menschen als Sprites (F4, Standard 2D):** Mika, die Bewohner, die zwölf Wanderer, Balduin,
  Edda, Marthe, Pim und Lu (Kinder: `CHILD`) und Knopf backen wie die Horde aus Formen
  (`peopleKinds.js`, Gerüst `peopleFigure.js`: `HUMAN`, `posePerson`, Laterne, Vierbeiner), aber in
  **acht gezeichneten Richtungen** (nichts gespiegelt) und in einem eigenen Atlas mit eigenem Worker
  (`peopleView.js`, Einstellung »Figuren: 3D/2D«, `game.people`). Die Schlüssel von `PEOPLE` sind
  die IDs der Figuren in `npcs.js`; eine neue Figur bekommt einen Eintrag dort und in `FOLK_FACES`.
  - Eine Fassung ist ein Teil einer Figur in einem Stand (Mika: `base`, `aktion`, `laterne`,
    `laterneAktion` je Aussehen; die Leute `base`, Balduin dazu `gesten`); fertig, wenn alle Bilder
    da sind, bis dahin Voxel.
  - **Gesichter als Flicken:** Das Bild trägt den ersten Ausdruck, jeder weitere ist ein Flicken aus
    den Texeln, die irgendein Ausdruck berührt (`encodePatch`, Fußpunkt außerhalb des Flickens –
    der Shader klemmt die Fußlinie). Gesichter liegen nur auf Formen mit `part: 'head'` oder `face:
    true` (`stampAt` mit `parts`), im Profil auf der Seite zur Kamera (`faceAt`).
  - **Werkzeuge** (`TOOLS`) sind eigene Bilder in 16 Winkelstufen um die rechte Hand und auf dem
    Rücken (Stufe 16), um 45° um den Stiel gedreht; das Bild der Figur trägt Anker (`hand`, `back`:
    Lage, Stufe, vorn/hinten). Gebacken über dem Boden (`TOOL_LIFT`), sonst schnitte die Erde sie ab.
  - Die Voxel-Figuren laufen unsichtbar mit (Laternenlicht, Anker, Zustand); versteckt werden nur
    die Kinder ihres Wurzelknotens (`root.visible` sagt bei den Leuten, ob sie da sind). Seltene
    Posen und Figuren ohne Sprite bleiben Voxel.
  - Ansehen ohne Browser: `node tools/menschen-bogen.mjs datei.png --figur=mika --aussehen=…`.
  - **Schöner gezeichnet (F5, `recherche/menschen-gestaltung.md`, Nr. 223):**
    - Frontaler als die Welt: `tiltFrame` kippt jedes Bild um `VIEW_TILT` (0,2 rad) zur Kamera, das
      Werkzeug um seinen Griff; den Kopf dreht `humanoid` über `HUMAN.headView` (0,25 rad) weiter.
      Formen am Kopf nehmen `body.H`, `body.headAx` bzw. `body.headAxes(neigung, kippung)`, nie
      `ctx.AX(body.pitch …)` – sonst drehen sie nicht mit. Fürs Licht im Spiel drehen die Normalen
      zurück (`uprightNormals`; am Kopf erkennt sie `part: 'head'` bzw. `head` aus `headEllipsoid`
      und `headCapsule`), sonst erreichte die Laterne das Gesicht nicht.
    - Gemalt mit `PEOPLE_PAINT` (Schlagschatten zwischen Armen, Beinen und Rumpf, aufgeräumte Töne)
      und Sel-out (`outline`/`outlineLit` aus `withOutlines`); der Kopf wird mit `taper` zum Kinn
      schmaler. Alles sind Optionen des Bäckers – die Schlurfer setzen sie nie und bleiben gleich.
    - Farben mit eigener Rampe (`OWN_RAMPS` in `peopleFigure.js`): Violett, Rosa, Weiß, Türkis und
      Blond – die Akzente der Palette taugen nicht als Rampe.
  - **Auf dem Weg zu »Triple A« (F6):**
    - Gesichter je Merkmal (`peopleFaces.js`): `ctx.face = faceOf(ctx, body, FACE)` setzt Augen,
      Brauen, Mund, Nase und Wangen an Punkte der gerundeten Kopfform; `placeFace`/`stampFace` setzen
      sie einzeln ins Bild, die Breite der Augen folgt der Zuwendung. **Nie schielen:** von vorn
      beide Augen gespiegelt mit dem Glanz in der Pupille, schräg das Weiß bei beiden Augen auf
      derselben Seite (ein weißer Pixel am Rand liest sich als Augapfel).
    - Licht (`lightField`, `PEOPLE_LIGHT`): seitlich von oben links, weiche Schlagschatten,
      Verdeckung, geglättet je Stoff; Glanz über `gloss` am Stoff, Gegenlicht, eigene Tonschwellen
      (`PEOPLE_PAINT.tones`).
    - Relief (`bump(l, p)` an einer Form, Helfer in `peopleRelief.js`: `ribs`, `folds`, `rings`,
      `strands`, `roundFace`): neigt nur die Normale, kommt nach dem Glätten scharf dazu;
      `tiltFrame` und `scaleFrame` reichen es durch. `clothRelief` setzt für alle, die der Bauplan
      nicht selbst gesetzt hat: Falten in Ellenbeuge und Hose, Haar in Strähnen (am Kopf nur, wo
      `matAt` »haar« sagt; Locken und Zöpfe aus Haar mit Rillen), Bärte in senkrechten Strähnen, zwei
      weiche Falten über dem Bauch (`torso: 1`, das Gerüst merkt die Rumpfformen), Röcke
      (`part: 'rock'`) in Längsfalten, eine Kante über der Sohle. Strickmuster sind senkrechte
      Rippen, nie Karos (die lasen sich als Rauschen); Muster in Bärten unregelmäßig, nie jede
      n-te Spalte (das las sich wie ein Gitter).
    - Die Strahlen der Menschen prüfen nur Formen, die sie berühren (`trace(…, { cull: true })`).
    - Mika im Ruderboot (`seated.rowing` gesetzt) ist ein Sprite: Teil `boot`, Zustand `rudern`
      (Bild nach `seated.phase`), die Füße auf dem Bootsboden. Alle Teile Mikas werden angefordert,
      sobald die Ansicht läuft – auch solange Mika noch Voxel ist (sonst stand im Intro die 3D-Figur).
    - Nachschwingen (`swayOf(ctx)` in `peopleKinds.js`): Haar und Bommel folgen dem Schritt.
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
                      arrival (die Ankunft: Titelkarte, Ruderboot, Steg,
                      Funkgerät, N5), tutorial (Einführung mit Edda, N5),
                      firstFire (das erste Feuer: Feuerstelle und Kamin kalt,
                      Streichhölzer vom Kaminsims, anzünden, N10),
                      state.js (Spielzustand), save.js (Speichern, Migration),
                      inventory (Kosten/Vorrat), builder (Baumenü, Platzieren,
                      Auswahl, Turm-Ausbau, Reparieren, Abreißen, Hausausbau,
                      Wegvorschau), gathering (Sammeln, Durchsuchen), nights
                      (Tagesschlurfer, Wellen, Sieg/Niederlage, Bericht),
                      combat (Waffen-Schlag, Ausweichrolle, Lebenspunkte,
                      Erfahrung, Perk-Vergabe, Wirbel), skills (Mikas
                      Fähigkeiten: zwei Plätze, Abklingzeit, Wahl auf
                      Stufe 3/6/9, M16), towerRanks (Türme mit Geschichte:
                      Erfahrung, Rang, Wimpel, Name, Turm der Nacht, M16),
                      posts (Posten auf den Hochsitzen, Knopf im Hof,
                      Rückzug, Fest am Feuer, M23; seit M29 nur
                      Unterstützung), bonds (Bindung: gemeinsame Zeit, stille
                      Stufen, Gesten, Momente, Erinnerungsstücke, M29), scenes
                      (geteilte Szenen: morgens über die Nacht, abends am
                      Feuer, M29), arms (Waffenschrank, Schießen, Munition,
                      Hülsen, Leuchtkugeln, Lärm, M30), training (Übungsplatz:
                      wer übt, Stufen, M30), defense (Lagerglocke: Läuten,
                      Kampf der Bewohner, Aufhelfen, Wunden, Verluste,
                      Bericht, M31), post (Netzwerk: Briefkasten, Pakete,
                      Stimmen, Besuch, Rückkehr, Signalfeuer, M32), fishing
                      (Angeln am Steg: Wurf, Biss, Drill, Fang, M33), isles
                      (Ruderboot und Inseln: Abdichten, Fahrt, Landung, Funde,
                      N6), fogIsle (die Insel im Nebel: Spur, Glocke,
                      Nebelfahrt, Marthe und die Kinder, Kahn, Reuse, N7), kite
                      (Pims Drachen: Wunsch, Steigen, Böen, Looping, Leine
                      halten, N9), wonders (kleine Wunder: Gedanken an den
                      Stümpfen, Blinken vom Sturmhuk, Eisgesang, G6), quests
                      (Nebenaufträge:
                      Bitte, Fundstücke, Belohnung, M23), autumn (Herbst mit
                      Ende: Frostnacht, Moderherz, Abspann, danach, M25), book
                      (Herbstbuch: Sterne, Taten, Herbstschmuck,
                      Schlurferkunde, Turmalbum, M25),
                      survivors (Überlebende:
                      Ankunft, Gespräche, Zelte, Aufträge, Fähigkeiten,
                      Funkturm), furnishing (Möbel, Gemütlichkeit,
                      Bestellungen und Lieferung, N4), trader
                      (Balduin: Fahrplan aus der Uhrzeit, Einfahrt mit
                      Leine, Stand am Steg, Gesten, Handel über das
                      Werkbank-Fenster),
                      cards (Regeln »Letzte Runde« ohne three.js: Züge,
                      Wertung, Tischansicht, KI, M28), cardNight (Kartenabend:
                      Einladung, Tisch, KI mit Bedenkzeit und Tick, Einsatz,
                      Wettschuld, Menschenkunde, M28),
                      settings (Lautstärke, Pixelgröße, Textgeschwindigkeit,
                      Wackeln, Blitze, Schlurfer 3D/2D, Figuren 3D/2D – eigener
                      Speicherplatz, nicht im Spielstand)
src/audio/            sound (Web Audio: Effekte aus Rauschen und Oszillatoren,
                      Umgebung; erst nach der ersten Eingabe), music
                      (Soundtrack: Stücke als Noten-Daten, Instrumente,
                      Überblendung, Nachtstufen, Titelstück und die
                      Spieluhr des Startbilds)
src/render/           pixelRenderer (Low-Res + Post-Pass + Hochskalieren),
                      palette (+ LUT), cameraRig (Einrasten), materials
                      (Durchsicht/Ausblenden), voxel (Voxel-Baukasten),
                      staticMesh (sichtbare Flächen + Schatten-Stellvertreter),
                      portrait (Porträts ohne GPU-Auslesen), shaders,
                      spriteBaker (Formen → Texel: Strahlen, Pixelregeln,
                      Stempel, F1), spriteCode (Kodierung für den Atlas:
                      Palettenindex, Art, Normale; ohne three.js, F2),
                      spriteAtlas (Seiten als Array-Textur, Packen nach Höhe),
                      spriteMaterial (Quad mit Fußknick, Einrasten, Licht aus
                      der gebackenen Normale)
src/world/            world (Zusammenbau + Update), map (Karte: Bucht fest,
                      Wegenetz prozedural aus `mapSeed`, Abstandsfelder,
                      Begrenzung), layout (Grundriss der Bucht + feste
                      Quellen), terrain, water (Wellen auf dem See), nature,
                      shelter (das Haus von außen, Stufen), interior (Innenraum
                      als eigenes Bild: Räume je Stufe, Licht, Tür, M11),
                      props (Steg, Langer Jakob, Wrack,
                      Warnpfähle, Herbstschmuck: Kürbisse, Kürbislaternen,
                      Laubhaufen, Treibholz, Sitzplätze der Krähen,
                      Briefkasten mit Fahne, Signalfeuer auf den Inseln,
                      M32), weather
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
                      Stufe/Spezialisierung), familyModels (Glockenturm,
                      Windrad, Bienenkorb, Vogelscheuche aus Formen, M19),
                      trapModels (Fallen ganz und verbraucht, M19),
                      mixModels (Mischtürme auf zwei Feldern, M20),
                      buildPreview (Geistermodell,
                      Felder), lightPools (Lichtinseln), pathing
                      (Flussfelder auf Weg und Hof, Rückweg, Wegvorschau),
                      furnitureModels (Möbel im Wohnraum des Innenraums),
                      questModels (Fundstücke der Nebenaufträge, M23),
                      isleModels + isleProps (Zelt, Netz, Steinbank, Kiste,
                      Kürbisse und Katze auf den Inseln und vor der Tür, N6),
                      fogIsle (Nebelinsel: Boden, Apfelbaum, Treibholzhütte,
                      Glockengestell, Wäsche, Kahn, Reuse, Seenebel, N7),
                      cardModels (Klapptisch, Hackklötze, Einsätze, M28),
                      keepsakeModels (die siebzehn Erinnerungsstücke, M29),
                      decoModels (Herbstschmuck: Regentonne, Kürbis,
                      Kürbislaterne, Laubhaufen – für Requisiten und
                      Herbstbuch, M25),
                      stumps (Stümpfe mit drei Kreuzen am Waldrand, nach der
                      Natur auf freie Stellen gesetzt, G6),
                      voxelKit (Baukasten für feine Modelle: Farbstufen,
                      Bretter, Rundholz, Steine, Quader im 1/16-Maß,
                      Kantenlicht; FINE, FINE32)
src/entities/         player, characters (Figuren-Bauer), figureKit (Formen
                      für Menschen: Kopf, Rumpf, Glieder mit Knie/Ellbogen,
                      Vorderkarten, N1), horde (Schlurfer:
                      Instancing, Zustände, Angriffe), zombieModels,
                      zombieSprites (Richtungen, Zustände, ein Bild backen
                      in jeder Größe, F1), zombieSpriteKinds (die 17 Formen
                      der Horde: Stoffe, Körper, Zubehör, Stempel, F-Design),
                      spriteFigure (Gerüst: Körper, Gangarten, Posen),
                      hordeSprites (Fassungen und Reihenfolge des Backens,
                      Worker, Richtung mit Hysterese, Bild je Zustand,
                      Instanzen, F2), spriteWorker (backt im Hintergrund,
                      F2), towers
                      (Zielen, Geschosse, Auren, Feuer, Glocke, Windstoß,
                      Bienenschwärme, Vogelscheuche), traps (Fallen auf den
                      Wegen, M19), loot (Brocken,
                      Magnet, Zerfall), npcs (Überlebende in der Welt:
                      Laufen, Winken, Bellen, Lächeln; Kinder-Rig, N7),
                      survivorModels (auch Balduin, Marthe, Pim und Lu), dogModel, traderModels (Balduins Boot, Mikas
                      Ruderboot, N5),
                      crows (Krähen: sitzen, picken, fliegen auf, M12),
                      kiteModels (Pims Drachen, Schleifen, Spule, Schnüre, N9),
                      fishingModels (Angel, Pose, Fänge, M33),
                      peopleFigure (Menschen als Sprites: Maße, Posen, Laterne,
                      Gesichtsblick, Vierbeiner, F4), peopleFaces (Gesichter je
                      Merkmal an der Kopfform, F6), peopleRelief (Falten,
                      Rippen, Strähnen als Relief, F6), peopleKinds (Mika, die
                      Leute, die Wanderer, Edda, Marthe und die Kinder, Knopf,
                      Werkzeuge, Gesichter), peopleSprites (ein
                      Bild backen: Flicken je Ausdruck, Anker fürs Werkzeug),
                      peopleView (Atlas, Worker, welches Bild Mika und die
                      Leute zeigen, Rückfall auf Voxel)
src/ui/               font, icons, ui (Leinwand + Panels), hud (auch
                      Nachtleiste mit Plan und Alarmzeile, Lesezeichen an der
                      Uhr, Lebensbalken, Randmarken, feste Zonen und
                      `layoutInfo`, H3), dialog, menu
                      (Pausenmenü, Notizbuch, Werkstattbuch, Herbstbuch),
                      buildbar (Baumenü: Knopf, Reiter, Kacheln, Bauzettel,
                      H1), buildPictures (Bilder der Kacheln aus den
                      Modellen, H1), crafting (Werkbank mit den Seiten
                      Herstellen und Figur, H5, und Handel mit Balduin),
                      mapView (Übersichtskarte, M), report
                      (Morgenbericht), perkChoice (Perk-Wahl), cardTable
                      (Kartentisch), cardArt (Karten und Rückseiten, M28), splash
                      (Startbild, N2: läuft seit N11 von selbst, Taste
                      überspringt), title (Titelbild, Name und Aussehen;
                      Musikhinweis, solange der Browser noch keinen Klang
                      erlaubt),
                      armory (Fenster des Waffenschranks, M30),
                      funk (Edda über Funk: Comic-Feld unten rechts, N4),
                      catalog (Balduins Katalog und Lieferkarte, N4),
                      fishingView (Angeln: Schnur, Leisten, Fangkarte, M33),
                      kindPictures (Bilder der Schlurferkunde aus dem
                      Sprite-Bäcker, F3d)
src/data/             texts, dialogs, items, buildings, recipes, goals,
                      towers (Werte je Stufe/Spezialisierung, Turmteile,
                      `towerStatsOf`), zombies,
                      waves (Wellenplan je Nacht, Tagesschlurfer), upgrades
                      (Figur-Aufwertungen), weapons (Waffenwerte je Stufe),
                      perks (Erfahrungskurve, Perks und ihre Wirkung),
                      reactions (Zustände, Reaktionen, Wetter-Wirkung, M18),
                      blueprints (Baupläne: Vorrat, Gewichte, Wahl, M19),
                      traps (Werte der Fallen, M19),
                      mixes (Mischtürme: Rezepte, Werte, Kosten, M20),
                      champions (Champions: Anzahl je Nacht, Merkmale,
                      Fundkiste, M21), bosses (Bosse: Reihenfolge,
                      angekündigte Angriffe, Zerfallen, M22),
                      posts (Rollen auf dem Posten, Knopf, Nerven, Fest,
                      M23), quests (Nebenaufträge, Belohnungen, M23),
                      bonds (Stufen, Arten gemeinsamer Zeit, Spitznamen,
                      Erinnerungsstücke und ihre Plätze, M29), scenes
                      (Szenen mit Rollen nach Temperament, Anlässe, M29),
                      arms (Schusswaffen, Munition, Notfallwaffen, Übung und
                      Profile, verlorene Waffen, M30/M31), bell (Lagerglocke,
                      Kampf der Bewohner, Wunden, »Verluste«, M31),
                      network (Netzwerk: Zeiten, Pakete, Stellen und Hilfe der
                      Signalfeuer, M32), motifs (Motive der Figuren für die
                      Spieluhr, M32), fishing (Angeln: Platz, Zeiten, Fische,
                      Hilfe der Freunde, Korb, M33), isles (Inseln: Fahrt,
                      Landeplätze, Funde, Abdichten, N6), fogIsle (Nebelinsel:
                      Form, Stellen, Glocke, Fahrt, Seenebel, Auftrag, Reuse,
                      Stufen, N7), kite (Drachen: Bedarf, Zeiten, Wetter, Böen,
                      Looping, N9),
                      knots (Knoten der Geschichte: wer, wann, welcher Dialog,
                      G2; Stufen der Waldrand-Gedanken, G3),
                      risk (Moderlocke, makellose Nacht, Vorratskammer, M24),
                      autumn (Herbst mit Ende: 30 Tage, Kalender, Natur- und
                      Jahrestage (G4), Frostnacht, Moderherz,
                      Schnee, danach, M25), book (Taten, Herbstschmuck,
                      Reihenfolge der Schlurferkunde, Turmalbum, M25),
                      places (Ortskunde: die Orte der Holzmark, wann Mika
                      sie kennt, Zeilen je Ort, G5), wonders (Stümpfe,
                      Sturmhuk, Blinkfolge, Abendgruß, Plane, G6),
                      skills (Fähigkeiten, Ränge, Stufen der Wahl, M16),
                      cards (Spielstile, Ticks, Einsätze, Rückseiten,
                      Pflichten, Regelstufen, M28),
                      feel (Rückmeldung je Ereignis: Trefferstopp, Wackeln,
                      Zeitlupe, Federn der Bauten, Klangstreuung, M26),
                      difficulty (Gemütlich/Ausgewogen/Wild, M16),
                      survivors (Ankunft, Plätze, Funkturm, Tausch, Aufträge),
                      wanderers (Wanderer: Beruf, Fähigkeit, Weg, sicherer
                      Ort, Tagesplatz; Ankunftsplan aus dem Startwert,
                      Schlafplätze, M27),
                      trader (Balduins Fahrplan, Angebote, Vorrat je Tag),
                      furniture (Möbel je Raum, Preise in Zombieteilen,
                      Gemütlichkeit, N4), arrival (Zeiten und Wege der
                      Ankunft, N5), looks (Figur Frau/Mann, Aussehen der
                      Hauptfigur, erlaubte Namen), weather (Wetter je Tag aus
                      Startwert und Tag, Wirkung und Anteile, M12)
tools/serve.mjs       Statischer Server (ohne Abhängigkeiten)
tools/check.mjs       Prüfskript (Syntax, Headless-Rundgang, Screenshots)
tools/karten.mjs      Simulator für »Letzte Runde«: Fairness, Stile, Ticks (M28)
tools/balance.mjs     Balance-Durchlauf: spielt Nächte mit einer Bau-Strategie
                      (M24, statt Testspielern)
tools/playtest.mjs    Playtest-Brücke (früher für Testspieler-Agenten)
tools/schlurfer-bogen.mjs  Musterbogen einer Art als PNG (ohne Browser, F-Design)
tools/schlurfer-reihe.mjs  Aufstellung aller Arten am Tag und in der Nacht (F-Design)
tools/menschen-bogen.mjs   Musterbogen der Menschen-Sprites (F4), tools/bogen-png.mjs PNG und Leinwand
screenshots/          Ergebnisse der letzten Prüfung
playtests/            Personas, Berichte, Zusammenfassungen
```

Grundprinzipien:

- **Zustand ist Daten.** Alles Gespeicherte liegt im Zustandsobjekt
  (`src/core/state.js`). three.js-Objekte sind nur Darstellung.
- Modi der Spielschleife: `splash` (Startbild »Tales of Cue präsentiert«, N2), `title` (Titelbild), `play`, `dialog`, `menu`, `craft` (Werkbank),
  `report` (Morgenbericht), `perk` (Perk-Wahl), `katalog` (Balduins Katalog, N4),
  `lieferung` (Lieferkarte, N4), `ankunft` (die Ankunft, N5), `schrank` (Waffenschrank, M30), `angeln` (am Steg, M33), `rudern` (mit dem Boot zu den Inseln, N6), `nebelfahrt` (der Glocke nach, N7), `drachen` (Pims Drachen halten, N9), `sleep` (Schlafen, Ausruhen, Werkeln, verlorene
  Nacht, Ohnmacht – alle mit Abblende). Zeit läuft nur in
  `play`; Bauen geht jederzeit in `play`. `Game.step(dt)` ist ein Simulationsschritt
  (Update + Eingabe-Abschluss), gezeichnet wird danach mit `render()`.
- **Klicks werden in `update()` ausgewertet**, nicht beim Zeichnen (sonst
  gehen sie bei der Schrittsimulation verloren). Layouts, die beides
  brauchen, berechnet eine eigene `layout()`-Methode.
- Die Oberfläche ist ein 2D-Canvas in Spielauflösung, sofort-modus gezeichnet.
- **Eingaben im Spielmodus, in dieser Reihenfolge:** Baumenü (Kacheln,
  Q R T G C V – zugeklappt immer die Türme –, Tab öffnet und wechselt den Reiter;
  Abreißen liegt immer auf V) → Schnellleiste und Fähigkeiten-Kacheln → Abbrechen
  bzw. Baumenü zuklappen (Esc/Rechtsklick, vor dem Pausenmenü) → Karte (M),
  Ansicht (Z), Welle rufen (N), Zeitraffer (B), Junas Leuchtfeuer (J, M23),
  Fähigkeiten (Rechtsklick –
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
- **Die Ankunft (N5, `core/arrival.js`, `data/arrival.js`):** Ein neues Spiel
  (`pendingIntro`) startet `arrival.start()` im Modus `ankunft`: Titelkarte,
  Ruderboot über den See (`buildRowboat`, Mika sitzt mit `player.seat({ rowing
  })`, Riemen und Arme im Takt `seated.phase`), Weg über den Steg, Funkgerät;
  gehaltenes Esc (`ARRIVAL.skipHold`) springt ans Ende. `arrival.finish` ruft
  `game.afterArrival` (Dialog `eddaErstkontakt`). Das Boot bleibt nördlich am
  Steg (`ARRIVAL.moor`) und schaukelt in ganzen Pixeln. Die Einführung
  (`state.tutorial.on`, Titelbild) steuert `core/tutorial.js`: Laufen, dann jedes
  Ziel über `funk.once`; Erklärungen beim ersten Mal nur über `tutorial.teach`
  (ohne Einführung schweigt Edda dazu, ihre Geschichte spricht sie über
  `funk.say`). Zeilen über ein Ziel bekommen `stale` mit (`funk.once(flag,
  text, stale)`): Ist das Ziel erreicht, bevor Edda dazu kommt, fällt die Zeile
  weg (N10).
  - **Glaubhaft (G7, `recherche/ankunft-geschichte.md`):** Am Bug brennt Mikas Sturmlaterne
    (`buildRowboat().lantern`, Glühmaterial ohne Licht); beim Aussteigen nimmt Mika sie mit
    (`arrival.takeLantern`, sie brennt bis halb acht). Neben der Haustür hängt der Blechkasten mit
    dem Handfunkgerät (`shelter.radio`, Lämpchen `glow.led`); Flag `funkImKasten` und
    `world.setRadioBox(an)` sagen, ob es noch drinsteckt (auch nach dem Laden). In der Phase `funk`
    knistert es, nach der letzten Zeile wartet die Sprechtaste (`arrival.prompt`, `ARRIVAL.talkAfter`,
    unten im Balken `T.ankunft.taste`); E drückt sie, sonst drückt Mika nach `ARRIVAL.answer`
    selbst. Danach trägt Mika das Gerät am Gürtel. Solange der Kamin kalt ist, sind die
    Hauslichter aus (`world.applyHouseLights`: Licht über `on`, Glühen über `glow.on`, Lichtinseln
    über `lightPools.setDark`). `arrival.start` setzt einmalige Flags: `stationNeu` (die Station
    beim ersten Mal, `T.ankunft.station`), `lichterNeu` (am ersten Abend ein Gedanke, sobald Mika
    draußen am Haus ist), `abendrufOffen` (um halb acht Eddas Abendruf, `T.funk.abendruf`).
- **Das erste Feuer (N10, `core/firstFire.js`, `FIRST_FIRE` in `data/arrival.js`):**
  - `arrival.start` ruft `firstFire.coldStart()`: Feuerstelle und Kamin sind kalt
    (Flags `feuerKalt`, `kaminKalt`, nie im Startzustand – alte Stände und `?test`
    brennen weiter, ihre drei Ziele sind beim Laden still erreicht).
  - Die ersten Ziele sind `streichhoelzer` (Dose vorn auf dem Kaminsims, Flag
    `streichhoelzer`), `kamin` und `feuer` (zwei Scheite, sonst zeigt das Ziel zu den
    Ästen). `firstFire.use` fängt E an Kamin und Feuerstelle ab, solange sie kalt sind;
    `prompt` und `target` liefern Einblendung und Zielpfeil (drinnen zur Dose, zum Kamin,
    zum Ausgang).
  - `world.setFires({ camp, kamin, matches })` schaltet die Lichter nur über `on`, dazu
    Flammen, Glut, Rauch, Funken und das kalte Modell der Feuerstelle (`props.fire.cold`);
    frisch angezündet wachsen Flammen und Licht (`fireGrow`, `FIRST_FIRE.grow`).
  - Brennt das Lagerfeuer, sieht Edda den Rauch (`funk.once('feuerBrennt')`, auch ohne
    Einführung). Der goldene Zielpfeil zeigt drinnen nur auf Ziele im Haus.
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
  wird balanciert, nicht im Code. Je Art zeichnet das Bild höchstens
  `MAX_PER_TYPE` (180); `horde.room(type)` sagt, wie viele noch dazukommen
  dürfen – ist eine Art voll, wartet die Warteschlange der Nacht, und Kapseln,
  Rufe und Pulks bringen nur so viele, wie Platz ist (M25c: nie ein
  unsichtbarer Schlurfer). Ein Brüter legt höchstens `brood.max` Kapseln.
- **Konstante Lichtzahl:** Gebaute Lampen bekommen kein Punktlicht, sondern
  eine Lichtinsel (`lightPools.js`) und ein Glüh-Material. Seit M33 gehen die Inseln
  in der Dämmerung nacheinander an (`threshold`: nach dem Abstand zum Haus, `on`
  setzt die Schwelle selbst), `flicker` lässt Flammen atmen, `addStreak` legt eine
  Spiegelung auf den See (zählt nicht als Licht). Der Dunst nach Norden ist
  `look.haze` (daynight.js) im Post-Pass.
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
  Nebel/Wind (`towers.weatherRange`) wirken über das Wetter der Welt. Eine
  Betäubung hält am Stück höchstens `STUN.chain` s, danach ist der Schlurfer
  `STUN.free` s lang nicht zu betäuben (`horde.stun`, M25c) – sonst hielt Dampf
  eine dichte Horde die ganze Nacht fest.
- **Baupläne und Fallen (M19):** `state.blueprints` (gewählte Bauarten) und
  `state.blueprintChoice` ({ options, from, extra }); `knowsBuilding` sagt,
  was die Bauleiste zeigt. `game.offerBlueprint(from)` stellt eine Wahl,
  `game.chooseBlueprint(id)` nimmt sie; die Karten öffnen sich in der Ruhe-
  Schlange der Perk-Wahl (Art `bauplan`), nie bei offenem Bericht oder in der
  Nacht. Fallen (`trap: true`) stehen auf Wegfeldern, haben eine abgeschaltete
  Kollision (`setBlocking` lässt sie aus) und zählen im Flussfeld als frei
  (`pathing.freeCell`); `entities/traps.js` prüft je Bild, wer auf welcher
  Falle steht. Die Vogelscheuche nutzt den Raid-Zustand der Horde mit
  `lureBy` (Schläge über `onLureHit`), gelockt wird nur, wer auf dem Weg läuft.
- **Mischtürme (M20, `data/mixes.js`):** Jedes Rezept ist eine eigene Turmart
  (`TOWERS[id]` mit `role: 'misch'`, nur Spezialisierung »A«, Stufe 3–5) und
  ein Bau mit `w: 2, mix: true` in keinem Reiter; `turns = 1` heißt
  übereinander (`towerObject` dreht dann den Sockel). `builder.mixPartners`
  sucht Nachbarn (Kante an Kante, andere Familie, Stufe 3+),
  `builder.mergeTowers` ersetzt beide durch den Mischturm (`b.from` merkt die
  Herkunft für den Abriss) und trägt das Rezept in `state.recipes` ein.
  `towers.origin` nimmt bei zwei Feldern die Mitte; neue Geschosse haben
  eigene Pools (`PROJECTILE_POOL`), Markieren läuft über `horde.mark`.
- **Turmteile und Champions (M21):** Ein Turm trägt `parts` (Liste, ein Fach,
  ab Stufe 4 zwei, `partSlots`); Werte wirken über `towerStatsOf`, Treffer-
  Wirkungen (Brennglas, Eiskristall, Stricknadel, Kupferspule) über
  `game.partsOnHit` im `onDamage` der Horde (nur `source: 'turm'`, nie für den
  Funken selbst), das Uhrwerk in `TowerSystem.update` (Abklingzeit nach jedem
  vierten Schuss). Champions stehen im Wellenplan (`addChampions` mit eigenem
  Zufall – alte Pläne bleiben gleich), `horde.makeChampion` setzt Leben,
  Größe (`z.size`), Rüstung (`z.armor`), Schild, Heilung und `lightproof`;
  Warteschlange und Horde speichern `champion`. Die Fundkiste ist Beute
  (`res: 'kiste'`), die nicht fliegt; `game.openChest` würfelt das Teil
  (`randomPart` mit Gewichten je Seltenheit).
- **Die Horde stellt Fragen (M22):** Wellenmerkmale (`WAVE_TRAITS` in
  `waves.js`) tragen die Wellen im Plan (`wave.trait`), die Warteschlange gibt
  sie an `horde.applyTrait`. Die Nebelwelle fragt `game.litAt` (Lichtinseln aus
  `lightPools.spots`, Mikas Laterne); verborgen (`horde.isHidden`) heißt: nur
  die Glühteile werden gezeichnet, Türme zielen nicht. Neue Arten stehen in
  `zombies.js` mit Schaltern (`flying`, `digger`, `door`, `snuff`, `brood`);
  Flieger und Gräber laufen im dritten Flussfeld `pathing.free` (Barrikaden
  kosten nichts, Wall und Tor schon). Bosse (`boss: true`, `data/bosses.js`)
  haben einen Angriffsablauf in `horde.bossStep` (bereit? → Ankündigung →
  Schlag), die Wirkung steht in `game.onBossAttack`. Gestohlenes Licht
  (`lightPools.steal`) kehrt nach Ablauf bzw. am Morgen zurück (`restore`).
  Teile können an einem anderen Teil hängen (`parent: 'armR'` – die Laterne
  der Hexe).
- **Gemeinsam durch die Nacht (M23):** Der Hochsitz (`post: true` in
  `buildings.js`) trägt im Bau, wer dort Posten bezieht (`b.post`).
  `core/posts.js` entscheidet, wer gerade oben steht (`onDuty`: Dienst von der
  Dämmerung bis zum Morgen und solange die Nacht läuft), was er tut (Werte in
  `data/posts.js`) und wann er sich zurückzieht; `survivors.placeOne` stellt
  die Figur dann auf die Plattform (`n.y`), ohne Gesprächs-Einblendung. Das Fest
  (`state.feast` = Tag) holt die Leute ans Feuer (`feastSpot`), die Türme
  bekommen nachts `towers.boost`. Nebenaufträge (`core/quests.js`,
  `state.quests`): immer nur einer, morgens angeboten (`quests.offer`);
  Fundstücke sind eigene Einblendungen (`world.questInteractions`, Vorrang vor
  Wrack und Quellen), Balduins Bitte ist eine Zeile im Handelsfenster
  (`gives.quest`). Der Morgenbericht bricht lange Zeilen selbst um.
- **Wagnis und Vorrat (M24):** Die Moderlocke ist ein begehbarer Bau auf dem
  Weg (`bait: true`, wie Fallen: sperrt nie); `game.lureEntryAt` sagt, zu
  welchem Spawn ein Zulauf westlich von `LURE.maxX` gehört. `nights.planFor`
  legt dann `applyLure` über den Plan (zusätzliche Spawns mit `lure: true`,
  `plan.lure`); nach der Nacht räumt `nights.settleRisk` auf: Locke → Fundkiste,
  makellose Nacht (`night.homeHit`, Durchbruch), Serie und Schatz
  (`state.risk`), Zinsen der Vorratskammer. Werte in `data/risk.js`.
- **Balance-Durchlauf (M24):** `node tools/balance.mjs` spielt je Schwierigkeit
  zwölf Nächte: festes Tageseinkommen (an den Quellen der Karte geeicht),
  Beute und Tausch bei Balduin, Türme an die Stellen mit der meisten
  Wegabdeckung (der zweite und vierte decken die Barrikaden, B1), Barrikadenreihen,
  Tor, der Rest wird zu weiteren Türmen; kündigt der Plan eine Nebelwelle an, stellt
  er Laternen an den Weg, nach einem Durchbruch baut er Wall und Tor zuerst wieder auf;
  nachts schlägt Mika hinter der ersten Reihe zu (`--mika=aus`: nur die
  Bauten). Je Nacht misst er auch den Druck (wie weit die Horde kam und wer, wie viele
  aus welcher Welle bis an die Barrikaden kamen, Schaden an Barrikaden und Tor, Mikas
  niedrigstes Leben, wie weit der Boss kam). `--sichern=4,8 --ordner=…`
  legt den Spielstand vor diesen Nächten ab, `--nacht=datei --hp=1,2,4` spielt
  eine solche Nacht mit mehr Leben je Schlurfer nach (ein bis drei Minuten
  statt einer halben Stunde); `--zaeh=from,per,grow[,bossNight]` und `--boss=k`
  probieren Zähigkeit und Bossleben aus, ohne `src/data/` zu ändern (B1). Die
  Ergebnisse streuen von Lauf zu Lauf (dieselbe Nacht einmal still, einmal knapp) –
  über mehrere Nächte urteilen, nie über eine. Er ersetzt die Testspieler für die Frage »zu
  leicht, zu schwer?«; balanciert wird in `src/data/` (Zähigkeit:
  `TOUGHNESS` in `waves.js`, Bossleben `BOSS_HP` in `bosses.js`). Ab Nacht 13 wächst die Menge der Horde nur noch
  linear (`CROWD`, `nightBudget`), die fehlende Masse tragen die Schlurfer als
  Zähigkeit (`crowd`) – sonst kamen über 1500 je Nacht, mehr als das Bild lesbar
  zeigt. `node tools/balance.mjs --naechte=30` meldet in der Frostnacht, ob das
  Herz fiel oder erstarrte (Phase, wie weit, Leben).
- **Ein Herbst mit Ende (M25, `core/autumn.js`):** `autumn.planMode(n)` sagt dem
  Wellenplan, ob Nacht n die Frostnacht (`'finale'`: alle Wege, das Moderherz)
  oder eine neu gewürfelte Nacht nach dem Herbst ist (`'rogue'`). Das Herz ist
  ein Boss (`heart: true`) mit Phasen nach seinem Leben (`autumn.update`); fällt
  es, zerfällt die Horde im nächsten Schritt (nie mitten in einer Schleife über
  die Horde). `nights.finishNight` meldet die gehaltene Frostnacht
  (`autumn.onFrost` → `state.autumn.frost`), nach dem Morgenbericht läuft der
  Abspann (Modus `abspann`), dann der Dialog `nachDemHerbst`. Schnee:
  `weather.snowNow` (vom Spiel gesetzt) wählt das Wetter `schnee`, der Shader
  legt über `uSnow` eine Schneedecke auf alles mit `snow` im Material (nur
  Feststehendes draußen; der Boden mit `snow: 0.5` nur bestäubt), der Moder
  glimmt über `world.moderFactor` schwächer. Werte in `data/autumn.js`. Das
  Herz ist `steadfast` (keine Betäubung, kein Rückstoß, kein Locken, es schiebt
  sich durch die eigene Horde – nur Licht macht es müde) und führt die zweite
  Welle an (`FINALE.heartWave`); die Frostnacht rechnet ohne den Rabatt der
  Bossnächte (`toughness(n, boss)`).
- **Herbstbuch (M25, Teil 2, `core/book.js`):** `state.book` hält Sterne je Nacht
  (`nights.finishNight` → `book.starsFor`/`onNightWon`: gehalten, makellos aus
  `settleRisk`, mutig aus `night.called`), die Tage gelungener Taten, erledigte
  Arten (`book.onKill` aus `onZombieKilled`) und früh gerufene Wellen
  (`book.onCall`). `book.check()` trägt Taten ein (alle 1,5 s im Spiel, nach
  jeder Nacht, nach dem Laden leise); jede dritte schaltet ein Stück
  Herbstschmuck frei (`book.decoUnlocked()` → Reiter `schmuck` der Bauleiste,
  Bauten mit `deco`). Der Turm der Nacht bekommt einen Strich (`b.best`,
  `towerRanks.crown`). Das Pausenmenü zeigt das Buch (`menu.bookData`, Seiten
  `taten`/`kunde`/`album`, A/D blättern). Werte in `data/book.js`. Seit G5 hat es die
  Seite `orte` (Ortskunde, `data/places.js`: `known(state)` und `lines(state)` je Ort, Texte
  in `T.ortskunde`); neue Orte meldet `book.checkPlaces` in der Chronik (gemerkt nur im
  Speicher, nach dem Laden still). Passen die Reiter nicht in eine Reihe, brechen sie in zwei
  um (`splitTabs`); eine Seite mit mehr als 16 Zeilen blättert spaltenweise mit der Auswahl
  (Pfeile am Rand, anklickbar).
  - **Vierter Stern (F3c):** Eine Nacht, die auf »Wild« beginnt, trägt `night.wild` (true, bis
    jemand mittendrin leichter stellt – `game.setDifficulty` setzt es dann auf false). Dann hat
    `starsFor` vier Einträge; `state.book.wild` merkt die Nächte mit dem vierten Stern.
    `totalStars` zählt ihn mit, `bestStars` (Tat »Drei Sterne«) nur die ersten drei
    (`BASE_STARS`).
  - **Bilder der Schlurferkunde (F3d, `ui/kindPictures.js`):** Die Seite `kunde` zeigt die
    gewählte Art von vorn, gebacken mit `bakeFrame` (Größen über `KIND_PICTURE`: höchstens 60 px
    hoch, große Arten kleiner gebacken, nie skaliert), unbekannte als Schattenriss mit glimmendem
    Eigenlicht. `menu.kindPictures.pump()` backt höchstens eines je Bild; `menu.kindShown` sagt,
    was gezeichnet ist.
- **Gäste und Plätze (M27, `data/wanderers.js`, `core/survivors.js`):** Zu den
  fünf Stammfiguren kommen Wanderer nach `state.guests.plan` (beim Spielstart
  aus dem Startwert gewürfelt, gespeichert). `state.survivors[id].stage`: 0
  unterwegs, 1 angekommen, 2 Gast am Feuer (`guest` = Gästeplatz, `due` = Tag,
  ab dem die Entscheidung fällig ist, `extra` = »noch einen Tag« schon
  genutzt), 3 eingezogen (`tent` = Bau-ID oder 'zimmer', `slot` in der
  Schlafhütte), 4 weitergezogen (`gone`, `letter` = Tag des Briefs, `read`).
  `survivors.places()`/`freePlace()` zählen Zelte, Schlafhütten (je zwei) und
  die Dachkammer (Zuhause-Stufe 5); `data/wanderers.freePlaces(state)` rechnet
  dasselbe für die Dialoge. Die Entscheidung (`${id}Entscheidung` in
  dialogs.js) bietet nie »wegschicken« an, sondern Weiterbringen; bei vollen
  Plätzen macht der am längsten anwesende Wanderer das Angebot zu gehen.
  Fähigkeiten über `survivors.ability(art)`; Lottes Licht über
  `lightPools.setScale`. `PEOPLE`/`personOf` (core/survivors.js) statt
  `SURVIVOR_ORDER`/`SURVIVORS`, wo alle Menschen gemeint sind.
- **Bindung und Szenen (M29, `core/bonds.js`, `core/scenes.js`):**
  `state.bonds[id]` hält `pts` (gemeinsame Zeit), `kinds` (wie oft je Art),
  `last` (Tag je Art) und `moment` (erzählte Momente, 0–3). `bonds.add(id, art)`
  zählt eine Art höchstens einmal am Tag (`BOND_KINDS`: erstes Mal `first`,
  danach `again`); Stufen aus `BOND_STAGES`, nie als Zahl im Bild. Quellen:
  `cardNight.settle` (karten), `survivors.talk` → `bonds.onTalk` (reden),
  `game.startDialog` beim Ausruhen am Lagerfeuer → `bonds.atFire` (feuer,
  Freunde setzen sich über `bonds.fireSpot`), `nights` → `bonds.onNightWon`
  (nacht). Ein wartender Moment (`wantsTalk`) zeigt über dem Kopf »möchte
  reden« und geht beim Ansprechen vor (`bonds.talk`, Dialoge
  `${id}Moment1..3`); der dritte ruft `giveKeepsake`: Geschenkkarte über
  `game.pendingDelivery` (Eintrag `{ gift, from, name }` in `DeliveryCard`) und
  `world.refreshKeepsakes` (Plätze in `KEEPSAKE_SPOTS`, Regal
  `KEEPSAKE_BOARDS`). Geteilte Szenen (`data/scenes.js`) besetzen Rollen nach
  Temperament (`CORE_TEMPERS`, `WANDERERS[id].temper`); `scenes.morning(anlässe)`
  nach dem Bericht, abends von selbst; die beiden gehen ans Feuer
  (`survivors.standSpot` fragt `scenes.spotOf`) und reden in `hud.bubble`,
  sobald Mika nah ist. `state.scenes.seen` merkt Gespieltes.
- **Waffen und Übung (M30, `core/arms.js`, `core/training.js`, `data/arms.js`):**
  Schusswaffen stehen in `GUNS` (Magazin, Nachladen, Takt, Schaden, Reichweite,
  Kugeln und Streuung, `pierce`, Lärm, Kamerastoß), die Nahkampfwaffen des Schranks
  als `WEAPONS` mit `cabinet` (`weaponStats` nur, wenn Mika sie genommen hat). Hält
  Mika eine Schusswaffe (`ITEMS[id].gun`), ruft der Klick `arms.shoot` statt
  `combat.attack`: Strahlen durch die Horde (`arms.ray`), Aktion `shoot` (Pose in
  `player.js`), `effects.muzzle`, Leuchtspur (`arms.draw`), Hülse
  (`InstancedMesh`, bis `arms.morning`), `horde.noise` (Schlurfer im Umkreis
  bekommen `alertT`/`alertR`), `crows.startle`, Knopf bellt. Munition liegt in
  `state.inventory` (`AMMO`), das Magazin in `state.arms.mag`. Der Schrank
  (`WOHN.schrank`, Einblendung `waffenschrank`, Modus `schrank`) öffnet sich nach
  `ARMS_UNLOCK_NIGHTS` gehaltenen Nächten (`arms.checkUnlock`);
  `world.refreshCabinet` zeigt im Gestell, was noch da ist. `state.arms.notfall`
  sagt, wer im Notfall welche Waffe nimmt (für M31). Der Übungsplatz (`use:
  'ueben'`) startet über den Dialog `uebungsplatz` `training.start(id)`: Die
  Person steht an `training.spotOf` (vor `scenes` in `survivors.standSpot`), ihre
  Fähigkeit ruht (`survivors.ability`), nach `TRAINING.hours` zählt
  `state.training[id]` (`level`, `done`, `day`).
- **Die Lagerglocke (M31, `core/defense.js`, `data/bell.js`):** Der Bau
  `lagerglocke` (`use: 'glocke'`, `yard: true` – nur im Hof, Grund `nurHof`) läutet,
  wenn Mika E hält (`defense.pull` aus `update`, die Einblendung ist
  `currentInteraction`); ein Druck allein sagt über `defense.press`, warum nicht
  (`blocked`: tag, keinDurchbruch, schonGelaeutet, niemand). `ring` merkt Nacht und
  Tag (`state.bell`), baut `people` aus `roster()` (Notfallwaffe, sonst Fäuste; Dr.
  Yusuf ist `medic`) und spielt die Phasen seil → stille → fenster → kampf →
  entwarnung. Die Figuren steuert dann `defense` (`survivors.placeOne` und die
  Einblendungen lassen sie in Ruhe, `defense.controls`), Waffen hält
  `npcs.hold(n, id)`, Liegende `n.lying`. Die Horde bekommt `defenderNear`,
  `defenderAt` und `onHitPerson` (Zustand `brawl`). Zu Boden: `downNear` macht die
  Einblendung `retten` (E halten, `updateDown`). `fall` nimmt ohne `losses` die
  Waffe (`state.arms.lost`, Balduin bringt Ersatz über `gives.arm`), mit `losses`
  `survivors.fall` (Stufe 5, `state.fallen`, `world.setMemorial`). `settle` legt
  beim Ende Wunden (`state.wounds`, ab dem Morgen danach) und den Bericht
  (`state.bell.report`) ab; `heal` (bei jedem neuen Tag) und `morning` (Bericht oder
  Meldungen) lesen sie. Wie stark jemand hilft, sagt `survivors.strength(id)`
  (0/0,5/1); `ability(art)` gibt die Stärke zurück. `state.losses` gilt nur, wenn
  die Schwierigkeit nicht »Gemütlich« ist (`defense.losses`).
- **Netzwerk und Wiedersehen (M32, `core/post.js`, `data/network.js`,
  `data/motifs.js`):**
  - `state.post` hält den Briefkasten (`box`), Gelesenes (`read`, Seite »Post« im
    Herbstbuch), Verschicktes (`sent`: `id:brief2`, `id:paket`), die Einladung,
    den Besuch zum Fest und ob die Signalfeuer schon Hilfe brachten.
  - Briefe: `post.morning()` läuft im Morgenbericht und auch, wenn Mika wach
    bleibt. Es legt höchstens eine Nachricht in den Kasten und setzt die Fahne
    (`world.setMailFlag`). Der erste Brief kommt über
    `survivors[id].letter`/`read` aus M27. Die Einblendung am Briefkasten hat
    `mailbox: true`; `post.open` zeigt Karten in `DeliveryCard` (Art `letter`).
  - Pakete bringt `game.deliverOrders` (`post.parcels`, Karte `parcel`).
  - Die Stimmen sind ein Dialog (`stimmen`) über das Funkgerät.
  - Der Besuch sitzt über `VISIT_SPOT` am Feuer (`post.visitorToday`).
  - Balduins Einladung ist ein Angebot mit `gives.invite`; die Rückkehr läuft über
    `survivors.arrive` (`post.arrivals`).
  - Signalfeuer: In der Frostnacht zündet `autumn.beginNight` sie an
    (`post.signalFires` → `world.setSignalFires`). Sie stehen an den Stellen
    `SIGNAL_SPOTS` auf den Inseln, mit Lichtinseln; `world.signalSpots` liefert
    sie für die Karte. `onNewDay` löscht sie.
  - Motive (`motifOf`) spielt `sound.memorial(id)`.
  - Edda: `autumn.choose('weiter')` setzt `state.edda.home` auf den nächsten Tag.
    `survivors.placeEdda` stellt sie tagsüber ans Stegende (`EDDA_SPOT`, Figur aus
    `eddaParts32`). `talkEdda` führt zu `eddaHeimkehr` bzw. `eddaDa` (Sprecher
    `eddaHier`, Porträt `eddaHeute`).
- **Angeln am Steg (M33, `core/fishing.js`, `ui/fishingView.js`, `data/fishing.js`):**
  - Ein Abend, eine Aktivität: `fishing.blocked` und `cardNight.blocked` sehen
    beide `state.fishing.lastDay` und `state.cards.lastDay`.
  - `fishing.begin(friend)` setzt Mika (`player.seat`, `player.fishingPose`) und
    wer mitkommt (`survivors.seatAt`, `npcs.hold(n, 'angel')`, `n.fishing`) an die
    Nordkante des Stegs (`SPOT`). Die Kamera schaut über `world.fishLook`
    (lookSpot »angeln«) nah aufs Wasser; der Modus ist `angeln`.
  - `update` führt die Phasen bereit → laden → wurf → warten → biss → drill →
    fang/weg. Die Schnur zeichnet die Oberfläche von `character.rodTip` zur Pose
    (`fishingView`).
  - Die Angel kommt über `angelnLernen` (Fietes Dialog) oder Balduins Angebot
    `gives.rod`; der Korb geht über `gives.fish` an Balduin.
  - Der Angelplatz ist eine Einblendung mit `fishing: true`
    (`world.refreshFishingSpot`).
- **Mit dem Boot zu den Inseln (N6, `core/isles.js`, `data/isles.js`, `world/isleProps.js`):**
  - Das Boot ist das der Ankunft (`arrival.pose`, `placeBoat`, `oars`,
    `seatMika`); `isles.row(ziel)` baut eine Bahn (`buildRoute` aus arrival.js)
    über die Wegpunkte `via` um das Stegende, `landing(id)` sucht den echten
    Inselrand entlang `side`. Im Modus `rudern` steht die Uhr, `land()` setzt
    `map.isle` – dann schiebt `map.pushInside` die Figur auf der Insel am Ufer
    entlang (`isleEdge`, gestreckt wie `onIsland`).
  - Fundstellen (`isleFind`) sind nur auf der Insel frei, auf der Mika steht;
    was mitkommt (Katze, Kürbisse), zeigt `isleProps.setFound` vor der Tür.
  - Tannen der Inseln lassen `isleClearings()` frei, ohne den Zufall der Natur zu
    verschieben. Nach dem Laden wacht, wer auf einer Insel war, am Steg auf
    (`isles.apply`).
- **Die Insel im Nebel (N7, `core/fogIsle.js`, `data/fogIsle.js`, `world/fogIsle.js`):**
  - `state.isles.fog.stage`: 0 nichts, 1 Spur (Zelt oder dritte Flaschenpost, `from` =
    Tag danach), 2 Auftrag, 3 Kahn geflickt (`arrive` = Tag danach), 4 in der Bucht.
    `bellRings(state)` (auch in dialogs.js) sagt, ob die Glocke läutet (Stufe 1–2,
    07:00–09:30, nicht am Tag `lost`).
  - Die Insel liegt östlich der Karte (x ≈ 57), nur See; ihre Form ist fest
    (`fogIsleEdge`, nicht aus dem Kartenstartwert). `map.isle = 'nebel'` hält Mika auf
    ihr, `world.heightAt` gibt ihren Boden (ein Voxel über dem Wasser). Die Insel ist nur
    sichtbar, solange Mika unterwegs oder dort ist (`setShown`).
  - Modus `nebelfahrt`: Phasen `hinaus` (von selbst bis `FOG_TRIP.start`), `suchen`
    (WASD wie beim Laufen, Strömung, Gleiten am Inselrand, verloren nach Kurs, Zeit oder
    Abtrift), `anlegen`, `heim`, `verloren` (Nebelweiß mit `ui.ditherFill`). Kamera:
    `FOG_VIEW`, ohne Geländegrenze. Der Seenebel (`SeaFog`) hat zwei gerasterte Lagen mit
    freier Sicht um Boot und Insel (je Lage nach Süden verschoben, wie die Kamera
    blickt).
  - Marthe, Pim und Lu sind wie Edda keine Bewohner (`FOG_PEOPLE`, nicht in `PEOPLE`):
    `survivors.talk` leitet zu `fogIsle.talk`, `placeAll` zu `fogIsle.placePeople`. Die
    Kinder nutzen `RIGS.child` in npcs.js (Modelle mit `child: true`). Nägel sind ein
    Werkbank-Rezept mit `fog`, Zucker ein Angebot Balduins und Hildes Dose
    (`hildeSugar`); beides liegt als `QUEST_ITEMS` im Vorrat.
  - `map.pushInside` hält nur, wer in der Nähe der Insel ist, auf ihr – wer in der Bucht
    läuft, bleibt dort (vorher zog es Überlebende an den Inselrand).
  - N8: Eddas Funkbuch hat vier Seiten (`PAGE_ORDER`, `pagesRead(state)` in data/isles.js):
    die Inselfunde `stein`, `dose`, `zelt` (Notiz-Karten über `fogIsle.showPage`) und
    Marthes Seite (`isles.fog.page`, Dialog `martheSeite` beim ersten Gespräch in der
    Bucht); mit allen vier `funk.once('funkbuch')`. Im Herbstbuch die Seite `funkbuch`.
    Marthes Glocke am Steg (`BAY_SPOTS.bell`, Einblendung `dockglocke`, `ringBay`) ruft
    die Kinder und läutet, wenn Balduin anlegt (trader.js).
- **Pims Drachen (N9, `core/kite.js`, `data/kite.js`, `entities/kiteModels.js`):**
  - `state.isles.fog.kite`: `stage` 0 nichts, 1 gewünscht, 2 gebracht (`day`), 3 fertig
    (am Tag danach); `loops`, `best` (längste Reihe, Tat `drachen`), `flown`.
    `fogIsle.talk` fragt bei Pim zuerst `kite.talkPim()` (Dialoge `pimDrachen`,
    `pimDrachenStill`, `pimDrachenWarten`, `pimDrachenGeben`, `pimDrachenMorgen`).
  - `kite.phase`: null, `hin` (Pim geht an `KITE.spot`), `oben`, `runter`. Solange eine
    Phase läuft, lenkt kite.js Pim und Lu (`controls`, fogIsle.updateKids lässt sie in
    Ruhe). Pim hält die Spule (`npcs.hold(n, 'spule')`, Pose `n.kite`, `spoolTip`), wer
    den Drachen hält, dreht sich nicht zu Mika.
  - Der Drachen steht in der Bildebene (Rolle um z, im Looping einmal herum); Schnur und
    Schwanz sind `THREE.Line` ohne Tiefe (sonst zöge der Umriss aus dem Tiefenpuffer sie
    dunkel nach), der Schwanz ist eine Kette mit Wind und Schwere.
  - Modus `drachen`: `kite.take()` (Einblendung an Pim mit `kite`), `updateSession`
    (E zupft, Esc oder Richtungstaste gibt zurück), die Uhr steht, danach
    `KITE.minutes`. Kamera `lookSpot('drachen')` (`world.kiteLook`) und immer weit
    (`applyView`).
- **Kleine Wunder (G6, `core/wonders.js`, `data/wonders.js`, `world/stumps.js`):**
  - Die Stümpfe (`createStumps`) entstehen nach der Natur und vor dem Bauraster, auf Stellen
    knapp hinter dem Rand des Begehbaren (`STUMPS.band`), frei von Bäumen, Büschen und
    Felsen. Einblendungen mit `stump` (Index) geben über `wonders.stumpThought` einen Gedanken.
  - Der Sturmhuk ist keine Lichtquelle: `hud.drawEdgeMarkers` zeichnet eine Randmarke in
    Richtung `STURMHUK`, solange `wonders.blinking()` gilt (Frostnacht: `nights.plan.finale`;
    Abendgruß: `blinkT`). `lampOn()` folgt `BLINK`. Wer die Lampe hält, sagt
    `sturmhukKeeper(state)`. Flags: `sturmhukGeblinkt`, `sturmhukTag`, `seeGesungen`.
  - `autumn.beginNight` ruft `wonders.frostNight()`, `autumn.onFrost` ruft `wonders.sing()`
    (Klang `eisgesang`).
  - Balduins Plane ist ein eigenes Mesh am Boot (`buildBoat().tarp`), sichtbar ab
    `TARP.fromDay` (`trader.enter`).
- **Kartenabend (M28, `core/cards.js`, `core/cardNight.js`, `ui/cardTable.js`):**
  Die Regeln sind reine Daten ohne three.js: `newGame`, `moves`, `play`,
  `view(g, p)` (was Spieler p sieht – verdeckte Karten des anderen ohne ID),
  `aiMove(view, stil, zufall)` und `showTell`. Die KI zieht **nur aus der
  Tischansicht**; nie den Spielzustand an sie geben. Laubwirbel und Krähendieb
  sind Wahlen (`g.choice`, Züge `drop`/`steal`). Modus `karten`: Die Uhr steht,
  `cardNight.update` lässt die KI mit Bedenkzeit ziehen, `cardTable` zeigt Mikas
  Sicht und spielt die Ereignisse eines Zugs als Bewegungen ab (`beats`; solange
  sie laufen, zieht niemand). Der Tisch steht am Feuer, bei Regen/Schnee auf dem
  Teppich vor dem Kamin (`interior.cardAnchor`), mit Balduin am Steg; Sitze und
  Blickpunkt baut `world.cardSpot` (das Gegenüber im Norden mit dem Gesicht zur
  Kamera, Mika über Eck an der Ostseite – von Süden verdeckte Mikas Kopf den Tisch).
  Figuren sitzen über `player.seat`/`survivors.seatAt` (`seatY` = Sitzhöhe); wer
  sitzt, dreht sich nicht zu Mika (nur der Kopf). Das Abendfenster zählt wie
  `state.time.minute` ab 06:00. Einsätze
  auf dem Kaminsims (`world.refreshStakes`). Stile, Ticks und Einsätze in
  `data/cards.js`; `node tools/karten.mjs` prüft Fairness und Ticks.
- **Edda und der Katalog (N4, `ui/funk.js`, `ui/catalog.js`):** `Funk` hält
  eine Warteschlange (höchstens fünf), tippt die laufende Zeile in eine
  Sprechblase neben Eddas Foto (`eddaPortrait` in `portrait.js`) und liegt seit H1
  unten links über Mikas Leiste (`hud.groupTop`); ein Klick tippt fertig bzw. schließt (vor dem
  Builder ausgewertet, `pointerFree` schließt das Feld aus). `funk.once` merkt
  sich Erklärungen in `state.flags` (`funk_…`). Das Funkgerät in der Stube ist
  ein Menü (Katalog nach Balduins erstem Besuch, Edda, Radio). Der Katalog zeigt
  je Raum eine Seite (`CATALOG_ROOMS`, `ROOM_LEVEL` in `data/furniture.js`),
  Fotos baut `itemPicture` aus dem Möbelmodell (einmal, dann gemerkt).
  `furnishing.order` bezahlt und merkt die Bestellung (`state.world.orders`),
  `furnishing.deliver` stellt beim Anlegen Balduins auf (`game.deliverOrders`,
  mittags ohne Boot); die Lieferkarte öffnet sich erst, wenn kein Schlurfer
  näher als 10 m ist und keine Nacht läuft. Feste Plätze der Stube stehen in
  `WOHN` (`interior.js`) – Möbelmodelle rechnen von dort aus. Werkzeug und Waffe
  hängen auf dem Rücken (`character.backTools`, gleiche Geometrie wie in der
  Hand); `player.keepDrawn(s)` hält sie gezogen (Schlurfer in 5 m).
- **Das Baumenü (H1, `ui/buildbar.js`, `ui/buildPictures.js`):** Offen ist es, wenn
  `userOpen` (Tab, Klick auf den Knopf), `quick` (Q … bei zugeklapptem Menü – klappt nach dem
  Setzen wieder zu) oder gerade gesetzt bzw. ein Bau ausgewählt wird. `handleClose` klappt es vor
  dem Pausenmenü zu; `builder.handleCancel` sagt, wofür Esc verbraucht wurde ('abgebrochen',
  'fertig'). Optionen tragen `picture` (Schlüssel `bau:art`, `turm:art:stufe:spez`,
  `barrikade:stufe`, `teil:id`); `BuildPictures` rechnet sie in der Schrägsicht der Welt auf der
  CPU (höchstens eins je Bild, bis dahin das Symbol doppelt so groß). Mehr als sechs Möglichkeiten
  werden Seiten mit »weiter«. Der Bauzettel (`noteLayout`) zeigt die Kachel unter der Maus oder
  die wartende Rückfrage; beim Setzen trägt das Schild am Geist Preis und Grund
  (`builder.drawGhostLabel`).
  - **Reiter nach Zweck (H5, `builder.tabs`):** Türme · Helfer (`tuerme2`) · Fallen · Lager
    (`YARD_TAB`) · Leute (`einrichten`) · Zuhause · Schmuck, immer in dieser Reihenfolge; drinnen
    nur Lager, Leute und Zuhause. Neue Bauten kommen in den Reiter ihres Zwecks, nie in einen
    Sammelreiter.
  - **Die Figur an der Werkbank (H5, `ui/crafting.js`):** zwei Seiten, `page` 'herstellen' und
    'figur' (A/D, Tab, Klick); die Zeilen der Figur baut `builder.figureRows()` in der Form der
    Rezepte, `game.craft` kauft über `gives.upgrade` bzw. `gives.weaponUp`. Beim Schließen steht
    die Werkbank wieder auf »Herstellen«.
- **Wucht (M26, `data/feel.js`):** Rückmeldung nur über `game.feel(ereignis,
  { dx, dz, x, z })` – Trefferstopp, Kamerastoß (Trauma, gerichtet) und Zeitlupe
  aus der Tabelle; nie `hitstop` oder Wackeln von Hand setzen. Die Kamera wackelt
  nach dem Trauma-Modell (`rig.addTrauma`, Faktor `rig.shakeScale` aus der
  Einstellung »Wackeln«) und zittert im Trefferstopp weiter (`rig.tickShake`);
  die Zeitlupe (`game.slowT`) verkürzt `dt` in `update` – nur für die Welt;
  Bericht, Menü, Dialoge und Wahlen laufen mit `realDt` (sonst ging ein frühes E
  am Morgenbericht verloren). Mikas Gesicht wechselt schon beim Treffer
  (`player.setFace`), damit das stehende Bild das »Aua« zeigt. Türme halten nie an.
  Bauten federn über `buildings.pop(b)` (danach wieder genau 1, also auf dem
  Pixelraster). Effekte klingen gestreut: `sound.play(name, { rate })` – `rate`
  ist die Tonhöhe als Faktor, `pitch` bei manchen Rezepten der Grundton in Hz;
  was in `SOUND_FIXED` steht, klingt immer gleich. Der Laternenblitz richtet
  sich nach »Blitze« (`world.flashLevel`).
- **Drinnen ist ein eigenes Bild (M11, `interior.js`):** Der Innenraum liegt in
  derselben Szene bei x ≈ 300 (östlich der Karte); `world.isInside` erkennt ihn,
  `game.applyView` stellt die Kamera um (160 px/m, Grenzen des Raums), sobald
  Mika drinnen ist – auch nach Teleport und Laden. Die Haustür löst einen
  Übergang aus (`world.passageAt`, `game.passage`). Kamin- und Tischlicht
  stehen fest im Innenraum. Neue Räume: `ROOMS`, `ROOM_BUILDERS`,
  `ROOM_COLLIDERS`, `ROOM_INTERACTIONS`, `ROOM_POOLS` in `interior.js`.
  Seit N4 ist das Haus größer (6,75 m tief, die Stube 9,7 m breit); ältere
  Stände, die drinnen gespeichert sind, wachen an der Haustür auf (Migration
  v22 → v23).

### Leistung – bewährte Kniffe

- **Nur sichtbare Flächen zeichnen:** Weil die Kamera nie dreht, sieht sie
  nur Ober- und Südseiten. `createStaticVoxelObject` (bzw. `InstanceScatter`
  in `nature.js`) baut die Darstellung mit `visibleOnly` und die Drehung
  eingebacken.
- **Schatten über Stellvertreter** auf `SHADOW_LAYER` (grob bei Bäumen). Der
  `PixelRenderer` zeichnet die Schattenkarte in einem eigenen Durchgang
  (`shadowMap.autoUpdate = false`), die Hauptkamera sieht Ebene 1 nie.
- Viele gleiche Modelle als `InstancedMesh` in 12-m-Blöcken (Culling).
- **Die Horde zeichnet nur, wer im Bild steht** (`horde.render(camera)`:
  Sichtfeld der Kamera plus 2,5 m Rand, M25c). Instanzen einer Art kennen kein
  Culling – vorher lief in späten Nächten jeder Schlurfer der Karte durch die
  Grafikkarte (25,6 Mio. Dreiecke bei 563 Schlurfern, jetzt 3,5 Mio.).
- **Abstandhalten der Horde über ein Raster** (`horde.separate`, M26): Zellen
  von 0,9 m in einem umlaufenden Gitter aus typisierten Feldern, Große
  (Anführer, Bosse) prüfen gegen alle – in einer späten Nacht mit 563
  Schlurfern 0,6 statt 5,8 ms je Schritt.
- **Shader beim Start vorübersetzt** (`game.precompile`, M26): mit
  KHR_parallel_shader_compile über `compileAsync`, sonst nach dem ersten Bild
  mit `compile` – ohne die Erweiterung schriebe `compileAsync` eine Warnung.
- Keine Allokationen pro Bild in heißen Pfaden (Vektoren wiederverwenden).

## Prüfablauf (nach jeder Änderung am Spielcode, vor jedem Commit)

1. `node tools/check.mjs --syntax` – Syntax aller Module (schnell).
2. `node tools/check.mjs` – volle Prüfung im Headless-Chromium:
   Spielstart mit Ankunft (Esc gehalten) und Eddas Einleitung, Rundgang mit Screenshots (Morgen, Tag, Abend,
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
   figuren); ab N2 (im Spielstart, seit N11): zuerst das Startbild »Tales of
   Cue präsentiert« – es läuft ohne Taste und still ins Titelbild (rund 3,5 s),
   dort steht der Musikhinweis unten rechts, die erste echte Taste startet
   die Titelmusik und der Hinweis verschwindet, beim zweiten Mal die kurze
   Fassung, in der Ankunft überspringt eine Taste es sofort; nach »Los
   geht’s!« ist die Titelmusik aus; Titelstück und Spieluhr rechnen offline
   ohne Übersteuerung (Bild: startbild); ab M16 (Abschnitt `nacht16`, dazu die neue Zeile
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
   v12 → v13 (Bilder: reaktionen, notizbuch); nach m16-r1 (Abschnitt
   `nachbesserung16`): N sagt vor der Tafel, ab wann es geht, und ruft ab
   19:30 die Nacht (»Ich bin bereit«, Mutbonus) – »Bald kommt die Horde«
   bleibt dann aus –, nachts die nächste Welle, auch wenn noch Schlurfer
   leben; eine Wahl geht nachts auf, sobald keiner näher als 10 m ist; eine
   Ziffer in der Sperre wählt nur vor, ein schnelles E nach der Wahl geht
   nicht durch die Tür; Schlurfer halten Abstand zu Mika und liegen über
   ihrem Umriss; Banner »Mika geht zu Boden!«; Teilreparatur erst nach einem
   zweiten Druck (echte Taste); die Laterne am Tag nur ein Schimmer, der
   Blitz hell; Zähe Natur je Schlag, Turm-Erfahrung ein Viertel je
   Schadenspunkt, »Kein Turm reicht hierher«; dazu im Titelbild ein Enter
   gleich nach »Neues Spiel«, das noch nicht startet, und die Spitzhacke
   ohne Stein (Bild: bereit); ab M19 (Abschnitt
   `spielzeug`): Bauplan nach gewonnener Nacht erst nach dem Morgenbericht,
   Taste 1 wählt; Reiter »Türme 2« und »Fallen« (Tab); Glocke betäubt,
   Friedensglocke flickt, Windrad schiebt zurück, Bienen stechen Brummer,
   Vogelscheuche lockt, fällt um und steht nach dem Flicken wieder; fünf
   Fallen auf dem Weg (sperren nie, nur auf Wegfeldern), Knallerbsen und
   Ölspur danach verbraucht, neu richten; Mühle; Balduins Bauplan an
   ungeraden Tagen; Speichern v14 und Migration v13 → v14 (Bilder: bauplan,
   spielzeug, fallen); ab M20 (Abschnitt `misch`, nur der Kern): zwei Türme
   ab Stufe 3 nebeneinander zeigen »Verbinden: ???«, zwei echte Drücke machen
   die Kürbisballiste auf beiden Feldern (Moderkern, Banner, Werkstattbuch),
   ihr Bolzen durchschlägt eine Reihe; übereinander entsteht die Nebelleuchte
   (nass, geblendet); das Werkstattbuch mit Esc, S, E; Speichern v15 und
   Migration v14 → v15 (Bilder: mischturm, werkstattbuch); ab M21 (Abschnitt
   `glanz`, nur der Kern): ein Turm auf Stufe 4 nimmt mit echten Tasten zwei
   Turmteile, ein drittes passt nicht; das Brennglas setzt in Brand; Nacht 3
   hat einen Champion im Plan, die ersten beiden keinen (auf »Wild« kommt er
   eine Nacht früher, M25c); ein Champion mit
   Schild zeigt Name und Merkmale, fällt und lässt eine Fundkiste liegen, die
   mit echter Taste aufplatzt; Basteln (drei Hufeisen → ein seltenes Teil);
   Balduins Wundertüte; Speichern v16 (auch ein lebender Champion) und
   Migration v15 → v16 (Bilder: champion, fundkiste); ab M22 (Abschnitt
   `fragen`, nur der Kern): Nacht 4 kündigt eine Nebelwelle an, Nacht 5 den
   Holzfäller; ein Schlurfer der Nebelwelle ist im Dunkeln verborgen und der
   Turm schießt nicht, Mikas Laterne holt ihn ins Licht; der Holzfäller holt
   vor einer Barrikade aus (Warnkreis, Balken oben) und zerschlägt sie; der
   Moderfalter fliegt über eine Barrikadenreihe, der Gräber buddelt sich
   darunter durch; die Tür des Schildträgers fängt von vorn ab; der
   Lichtfresser löscht eine Fackel; aus der Kapsel des Brüters schlüpfen
   Schwärmer (höchstens vier Kapseln je Brüter; ist eine Art im Bild voll,
   wartet die Warteschlange, bis einer fällt, und aus einer Kapsel schlüpft
   nichts – M25c); der Moosriese zerfällt in drei; eine Nebelwelle bleibt nach dem
   Neuladen eine; die Boss-Musik rechnet offline ohne Übersteuerung (Bilder:
   nebelwelle, boss); ab M23 (Abschnitt `gemeinsam`, nur der Kern): ein
   Hochsitz neben dem Weg, nie darauf, die Taste der Auswahl stellt Juna auf
   den Posten; abends stehen Bert, Hilde und Juna oben (ohne »Ansprechen«); J
   betäubt ringsum, ein zweites J wartet; Hilde wirft Gläser, Bert flickt eine
   Barrikade, Knopf jagt einen Schwärmer; Rückzug ins Haus; nach der Bossnacht
   Fest am Feuer, Türme ×1,1, der Bericht erzählt von den Posten; Hildes Garn
   mit echter Taste am Wrack (Bauplan zur Wahl), Balduins Bitte im
   Handelsfenster, Junas Antennenteile neben den Wegen; Speichern v17 und
   Migration v16 → v17 (Bilder: posten, fest, auftrag); ab M24 (Abschnitt
   `wagnis`, nur der Kern): die Moderlocke erst nach zwei gewonnenen Nächten
   und nur auf einem Zulauf am Waldrand, jede Welle bringt dort mehr (auch im
   Nachtplan), wer von dort kommt, trägt mehr Beute, die gehaltene Nacht macht
   aus der Locke eine Fundkiste; makellose Nacht mit Bonus und Serie, Balduins
   Schatz nach drei, ein Treffer am Zuhause bricht die Serie; Zinsen der
   Vorratskammer, keine nach einem Durchbruch; Pfanne durchschlägt Panzer, die
   Bank gibt Schlagkraft, das Holzlager baut morgens eine Barrikade wieder auf;
   Speichern v18 und Migration v17 → v18 (Bilder: moderlocke, bericht-wagnis);
   ab M25 (Abschnitt `finale`, nur der Kern): »Tag 12 von 30« und der
   Countdown, die Frostnacht über alle Wege mit dem Moderherz, seine Phasen
   (Ruf über alle drei Wege, Frost und Schnee), das Herz fällt und die Horde
   zerfällt, Schnee am Morgen und der schlafende Moder, Bericht (echte Taste),
   Abspann, Esc zur Wahl, Enter nimmt »Hierbleiben«; Nacht 31 würfelt sich neu;
   Speichern v19, neue Runde, Migration v18 → v19 (Bilder: finale, abspann,
   schnee); ab M25, Teil 2 (Abschnitt `buch`): drei Sterne im Morgenbericht (N
   ruft abends die erste Welle, niemand kommt ins Lager), gelungene Taten mit
   Meldung, die dritte bringt den Kürbis (Reiter »Schmuck« mit Tab, Q und
   Mausklick), das Herbstbuch mit echten Tasten (Esc, S, E; D/A blättern:
   Taten, Schlurferkunde mit Dr. Yusufs Notiz, Turmalbum mit dem Turm der
   Nacht), Speichern v20, Migration v19 → v20 mit leise eingetragenen Taten
   (Bilder: sterne, herbstbuch, schlurferkunde, schmuck); ab M26 (Abschnitt
   `wucht`): die Rückmeldungs-Tabelle ist gestaffelt, die Shader sind
   vorübersetzt, ein echter Klick trifft mit Trefferstopp und Stoß, ein großer
   Moment wackelt in ganzen Pixeln und klingt ab (»aus« hält still, »halb«
   halbiert, gespeichert), im Trefferstopp zittert das Bild, danach Zeitlupe, ein
   Turm setzt gestaucht auf und steht danach genau, 80 Schlurfer auf einem Fleck
   laufen über das Raster auseinander, Treffer klingen gestreut, »Blitze: sanft«,
   Baugeist auf dem Weg mit ✗, Einstellungen mit Wackeln und Blitze, Bildzeiten
   p50/p95/p99 mit vielen Schlurfern (Bilder: baugeist, einstellungen); ab M27
   (Abschnitt `gaeste`): Ankunftsplan (Tage 7–24, keine Bossnacht, kein
   Festmorgen, nie zwei Tage hintereinander), Ankunft am geplanten Tag, E spricht
   den Wanderer an – Gast am Feuer mit Schlafsack, am Morgen »Bleib bei uns« mit
   echten Tasten (vorgewählt das Harmlose), bei vollen Plätzen kein »Bleib«, aber
   das Angebot eines Bewohners, »Weiterbringen«, ein Brief nach zwei, drei Tagen,
   Schlafhütte erst ab Zuhause-Stufe 3 mit zwei Plätzen, die Fähigkeiten
   (Lichtinseln größer, Hannes flickt), Speichern v21, Migration v20 → v21
   (Bilder: gaeste, gast-dialog, schlafhuette); ab M28 (Abschnitt `karten`):
   Regeln im Simulator (Startspieler, Farben, Remis, die KI sieht nur den
   Tisch), Bert bietet abends eine Runde an (echte Taste) und erklärt das Spiel,
   D, 2, E legen offen, 3, Q verdeckt, die KI antwortet mit Bedenkzeit, zwei
   gewonnene Partien bringen Berts Grinsekürbis auf den Kaminsims und eine
   Wettschuld am Morgen, nur ein Abend je Tag, Menschenkunde im Herbstbuch, bei
   Regen am Kamin, Speichern v22, Migration v21 → v22 (Bilder: kartenabend,
   kartentisch, kartensieg, kartenabend-kamin, menschenkunde); ab N4 (Abschnitt
   `probespiel`): Edda spricht unten rechts im Funk-Feld, ein echter Klick tippt
   fertig und schließt, die Laterne geht um halb acht aus, Werkzeug auf dem
   Rücken und beim Schlag in der Hand, die Stube ist groß genug (Mika läuft von
   der Tür vier Meter geradeaus), Funkgerät → Katalog mit echten Tasten
   (Standuhr bestellen, D blättert, Esc), am nächsten Morgen liefert Balduin und
   die Lieferkarte schließt mit E, Speichern v23 mit Bestellung, Migration
   v22 → v23 (Bilder: funk, stube-gross, katalog, lieferung); ab N5 (Abschnitt
   `ankunft`): im Titelbild mit echten Tasten die Erklärung im Kasten neben der
   gewählten Zeile (auch die Schwierigkeit), »Einführung« an und aus, »Figur«
   Frau und Mann (andere Geometrie); die Ankunft läuft Titelkarte → See (Mika
   rudert, das Boot kommt näher) → Steg → Funkgerät → Edda; mit Einführung
   zeigt sie Wald und Zusammenfluss, danach »laufen«, nach vier Metern das Lob
   und das erste Ziel; Esc halten überspringt; ohne Einführung ein kurzer
   Dialog und keine Schritte; Speichern v24 und Migration v23 → v24 (Bilder:
   figur-erklaerung, ankunft-karte, ankunft-see, ankunft-steg,
   edda-erstkontakt; seit G7 brennt am Bug die Laterne, auf dem Steg trägt Mika sie, am Haus ist es
   dunkel, im Kasten an der Tür knistert es, und erst eine echte Taste E öffnet den Funk – Bild
   ankunft-funk); ab M29 (Abschnitt `bindung`): das erste Gespräch des Tages
   zählt einmal, ein Kartenabend macht vertraut und über dem Kopf steht »möchte
   reden«, E erzählt den Moment statt des Gesprächs, morgens grüßt Hilde (beim
   Spitznamen, sobald befreundet), abends setzt sie sich zu Mika ans Feuer, der
   dritte Moment zeigt die Geschenkkarte (E schließt sie) und stellt das
   Posthorn ins Erinnerungsregal, die Menschenkunde nennt die Stufe; nach dem
   Durchbruch gehen zwei Bewohner ans Feuer und reden erst, wenn Mika dazukommt,
   am selben Morgen nicht noch einmal; Speichern v25 und Migration v24 → v25;
   im Abschnitt `gemeinsam` blendet Juna nur noch und Hildes Leimgläser machen
   keinen Schaden (Bilder: bindung-zeichen, bindung-feuer, geschenk,
   erinnerungsbord); ab M30 (Abschnitt `waffen`): der Waffenschrank ist vor der
   ersten gehaltenen Nacht zu, danach sagt Edda, wo der Schlüssel liegt, und im
   Vorrat liegt Munition; E öffnet ihn, S S E nimmt die Pistole, Q wechselt den
   Notfall, im Gestell fehlt, was Mika genommen hat; ein echter Klick lädt nach,
   der nächste trifft (Magazin sinkt, Leuchtspur, Hülse), der Knall lockt einen
   Schlurfer aus 9 m, leer klickt es; die Leuchtkugel macht Licht und blendet,
   die Doppelflinte trifft im Fächer; am Übungsplatz übt Hilde mit echten Tasten
   zwei Spielstunden (Mika dabei: gemeinsame Zeit), nach der zweiten Übung Stufe
   1; Speichern v26 und Migration v25 → v26 (Bilder: waffenschrank, schuss,
   uebungsplatz); ab M31 (Abschnitt `glocke`): die Lagerglocke nur im Hof und erst
   mit offenem Waffenschrank, tagsüber und ohne Durchbruch sagt E, warum nicht;
   nach einem Durchbruch hält Mika E (echte Taste), die Tafel »Wer kommt?« zeigt
   alle, die Glocke läutet, Hilde, Bert und Juna treten mit ihren Waffen heraus,
   Dr. Yusuf verarztet, Hilde verschießt Schrot aus dem Vorrat; kein Zeitraffer,
   kein Rufen, einmal je Nacht; Bert geht eingekesselt zu Boden und steht mit
   gehaltenem E wieder auf; ohne »Verluste« bleibt nur Hildes Doppelflinte im Laub
   (auf »Gemütlich« nie Verluste), mit »Verluste« fällt Juna und das
   Erinnerungsbrett erscheint; Entwarnung mit drei Schlägen; der Morgen erzählt es,
   Bert ist schwer verletzt, Balduin bringt Ersatz; abends zündet E die Laterne am
   Brett an, die Karte zeigt Juna; die Seite »Erinnerung« im Herbstbuch; Speichern
   v27 und Migration v26 → v27 (Bilder: glocke-tafel, glocke-kampf,
   glocke-aufhelfen, erinnerung, erinnerungsbrett); ab M32 (Abschnitt
   `netzwerk`): morgens liegt Post im Briefkasten (Hilde hat sie gebracht, die
   Fahne ist oben), E am Briefkasten (echte Taste) zeigt die Briefkarte, danach
   ist die Fahne unten; ein Paket aus dem Forsthaus kommt mit Balduin; mit Juna
   hat das Funkgerät »Die anderen«; zum Fest sitzt Hannes zu Besuch am Feuer;
   Balduin nimmt eine Einladung mit, am Morgen ist Hannes wieder da; in der
   Frostnacht brennen zwei Signalfeuer auf den Inseln, auch auf der Karte; nach
   dem Herbst steht Edda am Stegende (echte Taste); die Seite »Post« im
   Herbstbuch; Speichern v28 und Migration v27 → v28 (Bilder: brief, paket,
   signalfeuer, signalkarte, edda-daheim); ab M33 (Abschnitt `angeln`): Fiete
   bringt das Angeln bei (echte Tasten), tagsüber sagt der Angelplatz, wann es
   geht, abends kommt Fiete mit und beide sitzen mit Angel an der Stegkante (die
   Uhr steht), E halten lädt und loslassen wirft, zu früh angeschlagen verscheucht
   den Fisch, der echte Biss will ein E, der Drill mit echten Tasten bringt den
   Fang mit Fangkarte, Esc steht auf (50 Minuten später, gemeinsame Zeit, heute
   keine Karten mehr), Balduin nimmt den Fisch, Speichern v29 und Migration
   v28 → v29 (Bilder: angeln, drill, fang); ab N6 (Abschnitt `inseln`): das
   lecke Boot mit echten Tasten abdichten (vorgewählt »Später«), E am Boot fragt
   wohin (vorgewählt »Doch lieber an Land«), S und E rudern zur Insel im Norden
   (die Uhr steht, danach eine Viertelstunde), Mika geht an Land und bleibt mit A
   gehalten am Ufer, das Zelt gibt Eddas Seite (Karte), das Netz Fasern (die
   Stange bleibt), E am Boot rudert zurück an den Steg, die Katze der kleinen
   Insel kommt mit (Gemütlichkeit +1, vor der Tür, E streichelt), um halb sieben
   rudert Mika von der großen Insel heim, abends bleibt das Boot am Steg,
   Speichern v31 auf der Insel wacht am Steg auf, Migration v29 → v31 (Bilder:
   rudern, insel, katze-daheim); ab N7 (Abschnitt `nebelinsel`): das Zelt ist die
   Spur, am nächsten Morgen läutet ab 07:00 die Glocke (Marke rechts, Seenebel, Edda
   funkt), E am Boot bietet »Der Glocke nach« (vorgewählt bleibt »Doch lieber an
   Land«), im Nebel führt A gehalten vom Klang weg – verloren, zurück am Steg, heute
   nicht mehr –, am nächsten Morgen dem Klang nach mit WASD bis zum Anleger, Marthe
   kommt herüber und erzählt (Kinder kleiner, Porträts), Marthe wartet, Pim erzählt,
   E am Kahn, E am Boot zurück, Nägel an der Werkbank, Zucker von Hilde (Ziel
   2/2), beim zweiten Besuch flickt Marthe den Kahn, am Morgen danach gleitet er an
   den Steg, Marthe am Steg, die Kinder spielen im Hof, die Reuse gibt Fisch (einmal
   am Tag), Lu erzählt, abends schlafen sie im Kahn, Hilde bleibt in der Bucht,
   während Mika auf dem Wartholm ist, Speichern v31 und Migration v30 → v31
   (Bilder: nebelfahrt, marthe-treffen, nebelinsel, marthe-bucht); ab N8 (Abschnitt
   `funkbuch`): drei Seiten auf den Inseln mit echten Tasten (unter dem Stein – der
   bleibt –, in der Dose, im Zelt), das Herbstbuch mit Esc, S, E und D bis »Funkbuch«
   (drei Seiten nach Datum), Marthe gibt in der Bucht die letzte Seite, danach meldet
   sich Edda, E an der Glocke am Steg ruft Pim und Lu herbei, legt Balduin an, läutet
   sie, Speichern behält alle vier Seiten (Bilder: funkbuch, glocke-steg); ab N9
   (Abschnitt `drachen`): bei Wind die Sprechblase und Pims Wunsch mit echter Taste,
   ohne Stoff sagt er, was fehlt, mit allem gibt Mika es her, am Morgen ist der Drachen
   fertig und steht über dem Strand (Pim hält die Spule), E bei Pim gibt Mika die Leine
   (die Uhr steht), in der Böe dreht E einen Looping, ohne Böe sackt er weg, drei
   hintereinander sind die Tat »Drachenwetter«, Esc gibt zurück (20 Minuten weiter), bei
   Regen kommt er herunter, Speichern v32 und Migration v31 → v32 (Bilder: drachen,
   drachen-looping); ab 30.09. (Abschnitt `nebel`): Mika geht am Nebelmorgen nach Norden,
   oben im Bild tut der Dunst kaum wechselnde Pixel dazu, und rückt die Kamera bei stehender
   Zeit um je einen Pixel, ändert sich fast nichts (die Schattenränder kochen nicht; Bild:
   nebel-dunst); ab H1
   (Abschnitt `oberflaeche`): zugeklappt nur der Knopf »Bauen«, Tab öffnet die Türme mit Bildern
   aus den Modellen (Kacheln 48 × 58, der Bolzenwerfer mit über 300 Punkten), Esc klappt zu, ohne
   das Pausenmenü, Q setzt zugeklappt den Bolzenwerfer (Preis am Geist, kein Bauzettel) und E baut
   ihn, danach ist das Menü zu; der Bauzettel nennt die Kachel unter der Maus; seit H5 die Reiter
   nach Zweck (»Leute« mit dem Langen Jakob auf einer Seite, »Lager«, »Zuhause«), acht
   Möglichkeiten blättern mit »weiter«; Edda spricht unten links, nie
   auf Schnellleiste oder Menü (Bilder: hud-tag, bau-menue, bau-setzen); ab F1 (Abschnitt
   `sprites`, seit F2 alle Formen): für Spieler 2D, in der Prüfung 3D; »Schlurfer: 2D« backt mit
   Workern, der Schlurfer im Bild zuerst (bis dahin Voxel), der Plan von Nacht 5 zieht den
   Holzfäller vor, alle 17 Formen backen ohne leeres Bild und mit Eigenlicht (Atlas mit Seiten),
   alle nebeneinander am Zusammenfluss, Ausholen, Schlag in drei Bildern, Treffer, der Boss holt
   aus (zittert) und schlägt, Schildträger ohne Tür, Champion und kleiner Moosriese in eigener
   Größe (bis dahin die Grundform vergrößert), der Falter fliegt im Bild, der Gräber sinkt
   gerastert ein, ohne Worker backt das Spiel selbst; acht Schlurfer zeigen acht Richtungen (NW,
   W, SW gespiegelt), die Richtung wechselt mit Hysterese und ohne Flackern, in der Nebelwelle nur
   die Augen, Treffer und Zusammensacken in vier Bildern ohne Umriss, ein Pulk von 24 als
   Sprites, Dreiecke und Haltung von 120 Schlurfern im Vergleich (Bilder: sprites-arten-3d,
   sprites-arten-tag, sprites-arten-nacht, sprites-zustaende, sprites-reihe-3d,
   sprites-reihe-2d, sprites-reihe-nah, sprites-pulk-3d, sprites-pulk-2d, sprites-nacht-3d,
   sprites-nacht-2d, sprites-bogen); ab H2
   (Abschnitt `aufraeumen`): abends steht der Plan in der Nachtleiste (rechts keine Tafel mehr,
   die lange Zielzeile bricht davor um), von vier Meldungen stehen rechts die zwei neuesten, Neues
   im Buch hängt als Lesezeichen an der Uhr und Esc räumt es ab, ein Schlurfer im Lager steht als
   Alarm in der roten Zeile der Nachtleiste, B schaltet den Zeitraffer ohne Meldung, die Karte
   zeigt den ganzen Plan (Bilder: hud-abend, hud-nacht, karte-plan); ab G2 (Abschnitt `knoten`):
   an Tag 12 spricht Hilde wie immer, an Tag 13 erkennt sie Eddas Stimme – nur einmal; nach Eddas
   Heimkehr stellt sie mit echter Taste den Brief zu, Edda liest ihn; Yusuf erkennt Knopfs roten
   Faden, Edda erkennt Juna; ab G3 (Abschnitt `wald`): die Waldrand-Gedanken erzählen mit den
   Tagen mehr, an Tag 8 mit echter Taste W ein Gedanke aus dem Volksmund, Hilde erzählt von den
   Moosleuten und Yusuf sagt »Pilz«, nach dem Holzfäller funkt Edda vom Hemd, nach dem zweiten
   von den vielen Männern; ab G4 (Abschnitt `uhr`): Tag 12 ist der 12. Oktober, Tag 32 der
   1. November, am 21. Morgen »Reif auf dem Steg«, an Tag 20 um neun funkt Edda ihren Jahrestag,
   nach dem Frost Frau Holle und Junas Pfeifen, der Abspann nennt »Mikas Bucht« (Bilder:
   uhr-jahrestag, karte-frost); ab G5 (Abschnitt `orte`): am Anfang fünf Orte im Herbstbuch
   (echte Tasten bis »Orte«, Herkunft des Namens), nach dem Wegweiser Birkhagen und nach dem
   Landgang der Wartholm mit Meldung in der Chronik, die Insel im Nebel heißt erst nach Marthe
   Apfelwerder, mit allem Wissen 24 Orte in zwei blätternden Spalten (S, Klick auf den Pfeil),
   die Reiter in zwei Reihen im Buch, die Zuflucht nennt, wer dorthin weitergezogen ist
   (Bilder: ortskunde, ortskunde-voll); ab H3 (Abschnitt `zonen`): am Tag höchstens fünf feste
   Tafeln und ≤ 12 % der Fläche ohne Überlappung, die Schnellleiste reicht bis zum letzten
   belegten Platz, anfangs nur die Kachel des Laternenblitzes, Stoff steht erst nach einer
   Änderung und beim Bauen im Vorrat, mit offenem Baumenü ≤ 24 %, abends ist das Ziel eine Zeile
   vor der Nachtleiste, in der Welle ohne Ziel und ≤ 15 %, der Bossbalken und die zweite
   Fähigkeit passen dazu, in Full HD überlappt nichts (Bilder: zonen-tag, zonen-bauen,
   zonen-nacht); ab H4 (Abschnitt `groesse`): bei 1920 × 1080 ergibt »Oberfläche« klein, mittel,
   groß 540, 360, 270 Zeilen und wird gespeichert, bei 270 Zeilen passen Pausenmenü,
   Einstellungen, alle Seiten des Herbstbuchs, Notiz- und Werkstattbuch ins Bild, Edda spricht
   über dem offenen Baumenü, bei 270 Zeilen passen auch Waffenschrank, Werkbank, Katalog,
   Morgenbericht und Karte (H4b), im Browserfenster 1920 × 955 bleibt es bei 319 Zeilen mit »(hier
   wie mittel)«, bei 1280 × 720 bei 360 (Bilder: ui-klein, ui-gross); ab G6 (Abschnitt `wunder`):
   mindestens fünf Stümpfe mit drei Kreuzen am Waldrand (nie begehbar, nie auf dem Weg), E am
   Stumpf in der Bucht (echte Taste) gibt einen Gedanken, nach Hildes Geschichte über die
   Moosleute; abends ohne jemanden am Sturmhuk kein Blinken, mit Clara dort ab 19:45 die
   Randmarke mit kurz, kurz, lang und »Gute Nacht, Clara«, nur einmal am Abend; in der Frostnacht
   blinkt es die ganze Nacht und Edda sagt es, fällt das Herz, singt der See (einmal), die
   Ortskunde erzählt davon; an Tag 19 keine Plane, ab Tag 20 liegt sie im Boot; Hildes Seepost
   einmal ab Tag 9 (Bilder: stumpf, sturmhuk-gruss, sturmhuk-frost, balduin-plane); ab N10
   (Abschnitt `feuer`, dazu `ankunft`: das erste Ziel sind die Streichhölzer): ein alter Stand
   brennt weiter, nach der Ankunft sind Feuerstelle und Kamin kalt (kein Licht, keine Flammen,
   keine Glut, die Dose auf dem Sims), mit echten Tasten gibt E an der kalten Feuerstelle einen
   Gedanken, der Pfeil zeigt zur Haustür, E geht hinein, E nimmt die Dose, E zündet den Kamin
   an; mit einem Scheit zeigt das Ziel zu den Ästen, E sammelt sie, E zündet das Lagerfeuer an
   (zwei Scheite), die Flammen wachsen, Edda sieht den Rauch, dann die Axt; nach dem Neuladen
   bleibt der halbe Weg (Bilder: erstes-feuer-kalt, streichhoelzer, erstes-feuer); seit G7 sind die
   Hauslichter aus, bis der Kamin brennt, am ersten Abend gehen sie mit einem Gedanken an, und um
   halb acht ruft Edda die Holzlände – genau einmal; ab F3
   (Abschnitt `buch`): eine Nacht ganz auf »Wild« bringt den vierten Stern (N ruft mit echter
   Taste, der Bericht zeigt vier), mittendrin auf »Ausgewogen« gestellt ist er fort (Meldung), auf
   »Ausgewogen« drei, Speichern v33 und Migration v32 → v33; die Schlurferkunde zeigt den
   Schlurfer als Bild und den Flitzer als Schattenriss (Bilder: sterne-wild, schlurferkunde-riss);
   ab F4 (Abschnitt `menschen`): für Spieler 2D, in der Prüfung 3D (nichts gebacken), »Figuren: 2D«
   backt mit einem Worker und Mika steht als Sprite da (Voxel versteckt), alle Fassungen (Mika in
   fünf Teilen, die Axt, fünf Leute, Balduins Gesten, Knopf, die zwölf Wanderer, Edda, Marthe, Pim
   und Lu) ohne leeres Bild mit Gesichtsflicken,
   mit echten Tasten geht Mika nach Osten, rennt mit Umschalt, dreht nach Süden, die Axt auf dem
   Rücken und beim Schwung als eigenes Bild in der Hand, ein Treffer zeigt »Aua«, die Laterne ihren
   Teil, am Tisch sitzt Mika aus Voxeln, im Ruderboot rudert Mika als Sprite im Takt der Riemen
   (N12), Hilde, Bert, Juna, Yusuf und Knopf stehen als Sprites im
   Hof und Hilde lächelt, wenn Mika dabeisteht, seit F5 ist Mikas Gesicht von vorn fast so groß
   wie die Mütze und die Augen sitzen weit oben (Bilder: menschen-tag, menschen-3d, menschen-nacht,
   menschen-bogen); ab S1 (Abschnitt `datei`): Esc, »Spielstand«, »Als Datei sichern« lädt mit
   echten Tasten eine Datei herunter (Version, Kennung, Name, Tag, Vorrat), eine fremde Datei und
   eine aus einer neueren Fassung werden abgelehnt, »Aus Datei laden« öffnet die Dateiwahl, fragt
   mit Name und Tag nach (vorgewählt »Lieber nicht«) und lädt nach »Ja, laden« mit dem Stand aus
   der Datei neu (Bilder: spielstand-menue, spielstand-frage); ab H5 (Abschnitte `bauen`,
   `spielzeug`, `oberflaeche`, `nahkampf`): Tab bis »Lager«, Q und E bauen die Werkbank, mit allen
   Bauplänen Türme · Helfer · Fallen · Lager · Zuhause, »Leute« auf einer Seite, an der Werkbank
   wechselt D zur Seite »Figur«, S und E werten die Bratpfanne auf (Bild: werkbank-figur); ab B1
   (Abschnitt `nacht16`): Nacht 2 unverändert, Nacht 3 zäher, der Holzfäller in Nacht 5 mit der
   Zähigkeit seiner Nacht.
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
Spieluhr, `zomfyView().startbild` zeigt Phase und Texte des Startbilds, seit N11 auch Zeit,
kurze Fassung, Dauer und ob übersprungen wurde; `zomfyView().titel.tonHinweis`, ob der
Musikhinweis steht);
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
`stickies()` die klebrigen Flächen; ab M19 zeigt `blueprints()` bekannte
Pläne, offene Wahl und Reiter, `giveBlueprint(id)` schaltet einen frei,
`offerBlueprint(von)`/`chooseBlueprint(id)` stellen und nehmen eine Wahl,
`traps()` nennt Fallen samt Zählern, `swarms()` die Bienenschwärme,
`lured()` die Gelockten, `bells()` Glockenschläge und Geflicktes,
`grindMills()` lässt die Mühlen mahlen; ab M20 zeigt `recipes()` das
Werkstattbuch, `mixPartners(id)` die Nachbarn zum Verbinden, `mergeTowers(a, c)`
verbindet zwei Türme (mit Kosten); ab M21 nimmt `spawnZombie(art, x, z,
champion)` auch einen Champion (`{ name, traits }`), `champions()` nennt die
lebenden (Name, Merkmale, Leben, Schild, Rüstung, ob die Anzeige steht),
`championPlan(n)` die Champions im Plan einer Nacht, `lastChest()` das Teil
der zuletzt geöffneten Fundkiste, `mountPart(id, teil)` baut ein Teil ein,
`tinker(teil)` bastelt, `tinkerRows()` zeigt die Basteln-Zeilen der Werkbank;
ab M22 nimmt `spawnZombie` als fünften Wert ein Wellenmerkmal, `waveTraits(n)`
zeigt die Merkmale einer Nacht, `fogged()` die Schlurfer im Nebel (verborgen
oder nicht), `litAt(x, z)`, ob eine Stelle im Licht liegt, `planView()` den
Nachtplan; ab M23 zeigt `posts()` Posten, Dienst, Nerven, Leuchtfeuer und Fest,
`assignPost(id, wer)` stellt jemanden auf einen Hochsitz (`null` räumt),
`postNpc(wer)` zeigt Stelle, Höhe und Einblendung einer Figur, `junaFlash()`
zündet das Leuchtfeuer, `setFeast(tag)` setzt das Fest; `quests()` zeigt den
laufenden Auftrag und die Fundstücke, `offerQuest()` bietet den nächsten an,
`questGoal()` die Zeile im Zielkasten, `tradeRows()` die Zeilen des
Handelsfensters; ab M24 zeigt `risk()` Serie, Schatz, den Spawn der Locke und
ob sie schon freigeschaltet ist, `lureEntryAt(x, z)`, zu welchem Spawn eine
Stelle gehört; `quietChoices()` entscheidet Perk- und Fähigkeiten-Wahlen still
mit der ersten Karte (für Prüfabschnitte, deren Aufräumen Stufen bringt); ab
M25 zeigt `autumn()` Frost, Modus, Abspann, das Herz (Leben, Phase) und wie oft
es gerufen hat, `spawnHeart(x, z)` lässt das Moderherz erscheinen; ab M25,
Teil 2 zeigt `book()` Sterne je Nacht, Taten, Herbstschmuck, erledigte Arten,
gerufene Wellen und das Turmalbum, `bookCheck()` trägt gelungene Taten sofort
ein; ab M26 zeigt `feel()` Trauma, Stoß, Versatz, Trefferstopp, Zeitlupe, die
letzten Rückmeldungen, ob die Shader vorübersetzt sind und die zuletzt gestreute
Klangfarbe, `feelEvent(ereignis, o)` löst eine Rückmeldung aus, `buildScale(id)`
zeigt das Federn eines Baus, `perfSample(schritte, jedesNte)` misst Bildzeiten
(p50/p95/p99 von Simulation und Zeichnen); ab M27 zeigt `guests()` Plan,
Menschen, freie Plätze, Schlafsäcke, Sichtbarkeit und wer gerade fortgeht,
`nextMorning()` springt zum nächsten Morgen (Zeilen wie im Bericht),
`dialogInfo()` zeigt den offenen Dialog mit Antworten und Vorwahl,
`buildOptionsFor(reiter)` die Kacheln eines Reiters; ab M28 zeigt `cards()`
Kartenstand, laufenden Abend (Stand, Partie, wer zieht), Mikas Tischansicht,
die Zeile im Bild und wer warum nicht spielen kann, `cardBegin(id)` lädt ein,
`cardFinish(sieger)` beendet die laufende Partie, `cardClose(aufgeben)` steht
vom Tisch auf, `cardAiMove()` zeigt den Zug, den die Regel-KI für Mika wählen würde; ab N4
zeigt `funk()` laufende Zeile, Warteschlange und Lage des Funk-Felds,
`catalog()` Seite, Auswahl, Stücke, Bestellungen und die offene Lieferkarte;
ab N5 zeigt `arrival()` Phase, Zeit, Boot, Sitzen und Rudern, Gedanken und den
Blickpunkt, `startArrival()` beginnt die Ankunft, `tutorial()` zeigt, ob die
Einführung läuft und welcher Schritt dran ist, `setTutorial(an)` schaltet sie;
ab M29 zeigt `bonds()` je Person Stufe, Wort, gemeinsame Zeit, Arten, Momente,
ob ein Moment wartet und wie sie Mika ruft, `bondAdd(id, art)` zählt gemeinsame
Zeit, `setBond(id, punkte)` setzt sie, `keepsakes()` nennt die geschenkten
Stücke, `scenes()` die gewählte und laufende Szene samt Sprechblasen,
`sceneMorning(anlässe)` stellt die Morgenszene; ab M30 zeigt `arms()` Schrank,
Genommenes, Notfall, Magazine, Munition, Schüsse, Hülsen, Leuchtkugeln, Spuren
und den letzten Lärm, `unlockArms()` schließt auf, `takeArm(id)` nimmt oder legt
zurück, `shoot(dx, dz)` schießt, `armory()` zeigt das offene Fenster,
`cabinetShown()` was im Gestell steht, `training()` die laufende Übung, Kandidaten
und Stufen, `startTraining(id)` beginnt eine Übung; ab M31 zeigt `bell()` Phase,
Sperre, Tafel, Kämpfende (Leben, Zustand, Waffe in der Hand), Handgemenge, Wunden,
Narben, Gefallene, verlorene Waffen, den Bericht und die Stärke je Bewohner,
`ringBell()` läutet ohne Taste, `breach()` setzt einen Durchbruch, `hitPerson(id,
n)` trifft jemanden, `setLosses(an)` stellt »Verluste«, `fallPerson(id)` lässt
jemanden fallen, `memorial()` zeigt das Erinnerungsbrett (Einblendung, Lichtinsel,
Spieluhr); ab M32 zeigt `post()` Briefkasten, Gelesenes, Verschicktes,
Einladung, Besuch, Fahne, Signalfeuer, Edda und die offene Karte
(`nextMorning()` bringt auch die Post); ab M33 zeigt `fishing()` Angel, Abende,
Fänge, Korb, die laufende Runde (Phase, Kescher, Fangkarte) und den Angelplatz,
`giveRod()` gibt die Angel; ab N6 zeigt `isles()` Boot (dicht?), besuchte Inseln,
Funde, Katze, wo Mika und das Boot sind, die laufende Fahrt, Landeplätze,
Einblendungen, sichtbare Inselmodelle und die Gemütlichkeit; ab N7 zeigt
`fogIsle()` Stufe, Glocke (läutet, Schläge, Marke), Fahrt (Phase, Kurs, Abstand),
Boot, Menschen (Stelle, sichtbar, Kind), Seenebel, Ziel, Vorrat und Korb,
`setFog(stufe)` setzt die Geschichte auf eine Stufe, `fogStrike()` schlägt die Glocke;
ab N9 zeigt `kite()` Stufe, Phase, Höhe, wer hält, Stelle von Drachen und Spule, Böe,
Fenster, Looping, Reihe, Kinder und Pims Einblendung, `setKite(stufe)` setzt die Stufe
des Drachens (3: fertig), `kiteGust()` schickt gleich eine Böe.
`window.zomfy.game` gibt im Test-Modus das ganze Spiel (nur für Prüfungen);
`lookAt(x, z)` richtet die Kamera fürs Bild auf einen festen Punkt (`null` folgt
wieder Mika, M32). Ab H1 klappt `buildbarLayout()` das Baumenü für echte Klicks auf
(`{ open: false }` nicht), `buildMenu()` zeigt offen/zu, Reiter, Kacheln (mit Bildschlüssel und
gezeichneten Punkten), Knopf, Bauzettel, wartende Rückfrage und die Warteschlange der Bilder,
`buildPicture(schlüssel)` rechnet ein Bild sofort (Punkte, Brustbild, Maßstab).
Ab F1 stellt `setHordeLook('3d'|'2d')` den Look der Schlurfer um, `sprites(backen)` zeigt fertige
und wartende Fassungen (mit Stufe), Worker, Atlas, was gezeichnet wird und die Richtungen (F2: mit
`true` backt es die Arten des Hintergrunds sofort hier, mit einer Liste von Arten oder
`{ type, f }` genau diese; `game.horde.sprites.keyOf(i)`/`indexOf(z)` nennen das Bild einer
Instanz); ab H2 zeigt `game.hud.shown` die rechts sichtbaren Meldungen, `game.hud.alarm` die
Alarmzeile, `game.hud.chronicle` das Lesezeichen und `nights.planView(true)` den ganzen Plan; ab F4 stellt `setFigureLook('3d'|'2d')` die Menschen um,
`people(backen)` zeigt fertige und wartende Fassungen, Atlas, was Mika (`mika`: Teil, Zustand, Bild,
Ausdruck, Werkzeug, Richtung) und die Leute (`leute`) zeigen; `backen` = `{ mika: true, tools: [...],
people: [...] }` backt sofort hier;
ab G2 zeigt `knots()` je Knoten der Geschichte, ob er erzählt ist oder wartet; ab G3
`forestThought(tag)` Stufe und Satz des Waldrand-Gedankens; ab G4 `calendar(tag)` Datum,
Naturzeile und Jahrestag; ab G5 zeigt `places()` die bekannten Orte (Namen, Zeilen) und die
offene Buchseite (Reiter, Zeilen, Blättern, Pfeile, Rahmen); ab H3 zeigt `hudLayout()` die
Tafeln des letzten Bilds samt freiem Rechteck, `visibleResources()` die Sorten im Vorrat; ab H4
zeigt `uiInfo()` Zeilen, Breite, Faktor und die gewünschte und wirksame Verschiebung der
Oberfläche; ab G6 zeigt `wonders()` die Stümpfe, ob der Sturmhuk blinkt (Lampe, wer die Lampe
hält, Randmarke), Abendgruß, Eisgesang, Plane und Mikas Gedanken; ab N10 zeigt `firstFire()`,
was kalt ist, die Streichhölzer, Licht, Flammen, Modelle, das Wachsen, Zähler, Ziel, Zielpfeil
und Holz, `coldFires()` macht Feuerstelle und Kamin kalt wie bei der Ankunft.
Zum Abtasten der Kollision gibt es `probeMove` (Weg in Metern) und
`probeWalk` (Endstelle) – beide bewegen die Figur ohne Zeichnen.
| `?spawn=inside` | Spielfigur startet drinnen am Bett (Innenraum, M11) |
| `?seed=123` | Anderer Welt-Seed (Modelle, Zufall) |
| `?map=123` | Startwert des Wegenetzes erzwingen (sonst je neuem Spiel zufällig; `?test`/`?playtest` nehmen 3) |
| `?zoom=nah` / `?zoom=weit` | Ansicht draußen erzwingen (M13; Standard weit) |
| `?horde=2d` / `?horde=3d` | Look der Schlurfer erzwingen (F2; Standard 2D, mit `?test`/`?playtest` 3D) |
| `?figuren=2d` / `?figuren=3d` | Look der Menschen erzwingen (F4; Standard 2D, mit `?test`/`?playtest` 3D) |

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
