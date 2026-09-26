# PROGRESS – Logbuch

Neueste Einträge oben. Jeder Meilenstein: was fertig ist, was die
Testspieler gefunden haben, was geändert wurde, was offen bleibt.

---

## Meilenstein 2 – Sammeln, Crafting und Bauen ✓

**Fertig**

- Ressourcenquellen auf der Lichtung: 12 Bäume (Axt, 4 Schläge, +6 Holz),
  3 Felsen (Spitzhacke), Kiesel, hohes Gras, Äste (mit der Hand), drei
  Schrotthaufen und das Autowrack (einmal am Tag durchsuchen: Schrott, Stoff,
  selten ein Zahnrad). Erschöpfte Quellen wachsen nach 1–4 Tagen nach
  (Baumstumpf bleibt stehen). Schwung- und Aufhebe-Animation, Späne,
  Laub, schwebende »+n« mit Symbol; **E gedrückt halten** sammelt weiter.
- Axt aus dem Hackklotz, Spitzhacke von der Werkbank; das passende Werkzeug
  nimmt Mika von selbst. Laterne auf der linken Hand (Taste F), die
  Schnellleiste hält Werkzeuge.
- **Bauleiste** unten rechts (Reiter »Zuhause«): Werkbank, Barrikade,
  Laternenpfahl (mit Lichtinsel), Flachsbeet (jeden Tag Fasern ernten),
  Sitzbank (ausruhen), Ausbau zur Hütte. Symbol, Preis mit Mini-Symbolen,
  Füllbalken »wie nah bin ich dran?«, Ausgrauen, Aufleuchten mit Glitzern,
  Tastenkürzel Q R T G C V, Hinweis-Tafel mit dem, was fehlt.
- **Platzieren** auf dem 1-m-Raster: Geistermodell (gerastert, grün/rot
  getönt), belegte Felder, schwaches Raster rundum; Maus oder – ohne Maus –
  vor der Figur mit E; Mausrad dreht; Esc/Rechtsklick bricht ab. Barrikaden
  und Lampen bleiben nach dem Setzen gewählt (Wand ziehen).
- **Auswählen** per Klick oder E vor dem Bau; die Leiste zeigt dann
  »Abreißen« (zweimal drücken, volle Rückgabe).
- **Werkbank** mit Rezepten: Spitzhacke, Holz/Stein zu Schrott, Fasern zu
  Stoff.
- **Hüttenausbau** mit Abblende (»Hämmern, sägen, schrauben …«, zwei Stunden
  vergehen): Anbau mit Sessel, Regal und Stehlampe, Veranda mit Geländer
  und Blumentöpfen. Die Grundfläche ist von Anfang an reserviert.
- **Ziel-Anzeige** unter der Uhr führt durch die ersten Schritte (Axt →
  Werkbank → Spitzhacke → drei Barrikaden → Hütte).
- Spielstand v2 mit Migration (Technik → Zahnräder, Laterne aus der
  Schnellleiste), Bauten, Ausbaustufe, erschöpfte Quellen und Durchsuchtes
  werden gespeichert.
- Prüfskript mit echten Tasten und Mausklicks für alle neuen Abläufe
  (u. a. Mausklick trifft genau das angeklickte Feld).

**Nachbesserung aus Meilenstein 1, Runde 2** (Auswertung in
`playtests/m1-r2/ZUSAMMENFASSUNG.md`): harmlose Antwort vorgewählt (kein
ungewolltes Schlafen/Ausruhen beim Durchdrücken), Morgensatz als Sprechblase
statt Dialog, Tageskarte kürzer und überspringbar, Einlaufhilfe an der Tür,
dasselbe Ding öffnet nicht sofort wieder, Esc im Dialog öffnet das Menü,
Intro nach Neuladen, größerer Steinkreis am Feuer, schmale Fenster.

**Neu im Plan (Wunsch des Auftraggebers):** Der Detailgrad ist zu grob –
man erkennt nicht, was was ist. Sobald die Mechaniken sitzen, kommt ein
eigener Meilenstein »Detailgrad und Animationen« (DESIGN.md 3.6 und
Meilenstein 5; Überlebende werden Meilenstein 6, Feinschliff 7). Testspieler
prüfen ab jetzt in jeder Runde »Erkennt man, was was ist?«.

**Offen**

- Playtest-Runde für Meilenstein 2.

---

## Meilenstein 1 – Playtest-Runde 1 und Nachbesserung

**Testspieler:** Jonas 7/10, Mira 8/10, Theo 7/10, Kira 6/10 – Berichte und
Auswertung in `playtests/m1-r1/` (`ZUSAMMENFASSUNG.md`).

**Gefunden**

- Blocker: Nach »Neues Spiel« lag »Ja, neu beginnen« unter dem Mauszeiger
  (Doppelklick = Spielstand weg).
- Spielfluss: Tastendrücke während der Schreibmaschine »verpufften«;
  schnelles Durchdrücken bestätigte ungesehene Antworten; ein ruhender
  Mauszeiger überschrieb die Tastaturwahl; Neuladen während des Ausruhens
  verlor den Weg seit dem letzten Speichern.
- Feinschliff: Rauschbild beim Start, grünliche Laterne, Bett durch die Wand
  benutzbar, Schlafschleife nach dem Aufwachen, fehlende Texte.

**Geändert**

- Menü: sichere Rückfrage (»Lieber nicht« unter dem Zeiger und vorgewählt,
  Klicksperre nach Seitenwechsel), Maus wählt nur bei Bewegung.
- Dialoge: schneller tippen, Antwort-Sperre 0,3 s, Hinweis »W/S wählen ·
  E bestätigen«, Pfeiltasten zeigen den Text sofort ganz.
- Stille Sicherung auch während Ausruhen/Schlafen.
- Titelkarte beim Start, warme Laterne, Innen-Dinge nur von drinnen, Bett
  ruht nach dem Aufwachen, Regentonne mit Text, kräftigere Durchsicht.
- Playtest-Brücke: `look` zeigt nur den schon getippten Dialogtext, ob die
  Zeile fertig ist und welche Antwort markiert ist (»> …«).
- OFFENE-FRAGEN.md Nr. 14: Ausruhen bleibt kostenlos.

**Werkzeug-Notizen**

- Die Tester haben die Brücke gut bedient; zwei Befunde entstanden aus dem
  angehaltenen Spiel zwischen Befehlen (Schreibmaschine). Deshalb zeigt
  `look` jetzt genau, was auf dem Bildschirm steht.

**Offen**

- Kurzes Festhängen in engen Ecken, Morgenfarbe, Orientierung (Karte).

---

## Meilenstein 1 – Fundament und Look ✓

**Fertig**

- Pixel-Render-Pipeline: Szene in ~360 Zeilen (HalfFloat + Tiefentextur),
  Post-Pass mit Umrissen aus Tiefensprüngen, hellen Außenkanten (Normalen aus
  der Tiefe), Split-Toning je Tageszeit, Vignette, Palettenabbildung über
  eine 32³-LUT mit geordnetem Dithering; ganzzahliges Hochskalieren mit
  Subpixel-Ausgleich der eingerasteten Kamera.
- Orthografische 3-4-5-Kamera: jedes Voxel exakt 5 px breit, 3 px Boden,
  4 px Wand. Kamera folgt weich, Blickpunkt leicht nördlich der Figur.
- Voxel-Baukasten mit AO und Farbstreuung; nur sichtbare Flächen, Schatten
  über Stellvertreter in eigenem Pass (von 1,2 Mio. auf ~0,3 Mio. Dreiecke).
- Lichtung: gemalter Boden (Wiese, Pfade, Feuerstelle, alte Landstraße),
  Wald mit ~300 Bäumen, Büsche, Steine, Gras, Blumen, Pilze; Notunterkunft
  mit Innenraum (Bett, Ofen, Tisch, Regal mit Radio, Teppich), Tür, Vordach,
  Lichterkette, Solarpaneel, Schornstein; Lagerfeuer mit animierten Flammen,
  Autowrack, Funkturm-Stumpf, Wegweiser, Briefkasten, Straßenlaterne,
  Wäscheleine, Holzstapel, Hackklotz, Regentonne, Beet, Sessel, Eiche mit
  Reifenschaukel, Straßensperren.
- Spielfigur Mika mit Lauf- und Ruheanimation, Kollision, Stufen/Boden-
  höhen, Laterne (Taste F) mit Punktlicht.
- Tag-Nacht-Zyklus über 24 Schlüsselbilder: Sonnen- und Mondbahn mit einer
  Schattenkarte, warme Punktlichter (Feuer, Laterne, Tischlampe, Ofen),
  leuchtende Fenster, Rauch, Funken, Glühwürmchen.
- Dach, Vorderwand und Vordach blenden gerastert aus, wenn man das Haus
  betritt; Durchsicht rund um die Figur hinter Bäumen und Wänden.
- HUD: Tag/Uhrzeit/Tageszeit, Vorrat, Schnellleiste, Kontexthinweise,
  Meldungen; eigene Pixelschrift mit Umlauten; Pixel-Symbole.
- Dialoge mit Porträt (aus Voxel-Modellen gezeichnet), Name,
  Schreibmaschinen-Text und Antworten; 16 Dialoge an Dingen der Lichtung.
- Pause-Menü (Weiter, Steuerung, Vollbild, Neues Spiel mit Rückfrage).
- Speichern: Schlafen im Bett (mit Rückfrage am Tag) → neuer Tag → speichern;
  stille Sicherung beim Verlassen; kaputte Stände werden beiseitegelegt.
- Ausruhen am Lagerfeuer oder im Sessel bis zum Abend / in die Nacht.
- Prüfskript `tools/check.mjs` und Playtest-Brücke `tools/playtest.mjs`.

**Werkzeug-Notizen**

- Headless-WebGL läuft über SwiftShader: ~50 ms pro Bild bei 1280×720 und
  langsame Shader-Übersetzung im ersten Bild. Die Playtest-Brücke simuliert
  deshalb Spielzeit in festen Schritten statt in Echtzeit.
- Porträts wurden anfangs per GPU gerendert und ausgelesen → Chrome warnt
  »GPU stall due to ReadPixels«. Umweg: eigener 2D-Voxel-Zeichner.

**Offen**

- Playtest-Runde 1 – erledigt, siehe oben.
