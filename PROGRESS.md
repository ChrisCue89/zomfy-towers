# PROGRESS – Logbuch

Neueste Einträge oben. Jeder Meilenstein: was fertig ist, was die
Testspieler gefunden haben, was geändert wurde, was offen bleibt.

---

## Meilenstein 3 – Nächte, Türme und Loot ✓

**Fertig**

- **Die Horde:** sechs Arten mit eigener Silhouette (Schlurfer mit Blume,
  Flitzer mit Kapuze, Schwärmer mit Pilzkappen, Brummer mit Leitkegel und
  Panzerplatten, Leuchtpilz mit glühendem Hut, Anführer mit Geweihkrone und
  Moosumhang), leuchtende Augen, Schlurf- und Schlaganimation, Aufblitzen
  bei Treffern, Rückstoß, Zerfallen in Moos. Gezeichnet mit Instancing
  (bis 110 Schlurfer je Art).
- **Wege:** vier Waldpfade, zwei Flussfelder auf dem Bauraster (Bauten
  sperren; Brummer schlagen sich durch Barrikaden), Ablehnung eines Baus,
  der den letzten Weg abschneidet, Angriff auf die nächste Hauswand.
  **Wegvorschau** beim Turm- und Barrikadenbau: rote Punkte laufen die Wege
  entlang.
- **Nächte:** ab 20:30 Wellen aus angesagter Richtung (Banner, Meldung,
  Randmarken), jede Nacht mehr Wellen, mehr Schlurfer, mehr Leben und neue
  Arten (Flitzer ab Nacht 2, Schwärmer 3, Brummer 4, Leuchtpilze 6),
  Anführer jede fünfte Nacht. Tagsüber träge Einzelgänger und kleine Trupps.
  Warnung um 20:00, Hinweis um 19:00 ohne Turm. Nacht-Leiste mit Welle und
  Standfestigkeit des Zuhauses.
- **Vier Türme** mit fünf Stufen und je zwei Spezialisierungen (Bolzenwerfer:
  Scharfschütze/Repetierer, Kürbiskatapult: Feuer-/Streukürbis,
  Rasensprenger: Frostnebel/Schlammschleuder, Laternenturm:
  Leuchtfeuer/Glückslaterne), drehender Kopf, Geschosse, Spritzer,
  brennender Boden, Auren, Stufen-Plaketten am Sockel.
- **Loot:** Schrott, Zahnräder, Moderkerne fallen, wo ein Schlurfer stirbt,
  fliegen im Sammelradius zur Figur, blinken und zerfallen nach 75 s.
- **Bauleiste** mit den Reitern Türme · Figur · Zuhause: Turm wählen,
  setzen, anklicken → Stufe 2, Spezialisierung A/B, weitere Stufen,
  Reparieren, Abreißen (70 %). Figur-Aufwertungen: Sammelradius,
  Lebenskraft, Schlagkraft, Tempo.
- **Nahkampf (Übergang):** Klick schlägt mit Axt oder Faust (Bogen,
  Trefferstopp, Rückstoß, Schadenszahlen, ein Pixel Kamerawackeln),
  Lebenspunkte mit Regeneration, Bank heilt sofort.
- **Verlorene Nacht:** Zuhause auf null oder Mika am Boden → Keller,
  Morgen; ein Viertel Schrott und ein Zehntel der Tagesmaterialien weg,
  Bauten angeschlagen, Zuhause bei der Hälfte – nie Spielende. Tagsüber
  bricht nichts durch. **Morgenbericht** nach jeder Nacht.
- Schlafen erst nach der Nacht; Ausruhen abends nur bis kurz vor der Horde.
- Ziele: Axt → erster Turm → erste Nacht → Werkbank → Spitzhacke →
  Barrikaden → Turm auf Stufe 3 → Hütte.
- Spielstand v3 mit Migration (Leben, Standfestigkeit, Aufwertungen, Nacht,
  Horde, Loot und Turmstufen werden gespeichert).
- Prüfskript: Turm, Ablehnung, Abschuss, Loot, Ausbau, Welle, gewonnene und
  verlorene Nacht, Bericht, Migration v2 → v3.

**Balance (Simulation mit fester Schrittweite, passive Figur)**

- Nacht 1 mit drei Bolzenwerfern am Haus: gewonnen, Zuhause 300/300. Mit
  zwei Türmen am Haus hält es zwei Wellen, die dritte aus der offenen
  Richtung bricht durch – mit etwas Nahkampf ist sie zu halten.
- Türme weit weg vom Haus (6 m vor der Tür): verloren. Daraus entstand die
  Wegvorschau und Mikas Hinweis »Nah am Haus kommen alle vorbei«.
- Nacht 2 mit drei Türmen: gewonnen (260/300); Nacht 3 mit vier Türmen,
  zwei davon Stufe 2: gewonnen (300/300); Nacht 5 (Anführer) mit fünf
  Türmen bis Stufe 3: bis 02:00 ohne Schaden am Zuhause (Simulation dort
  beendet).

**Offen**

- Playtest-Runde für Meilenstein 3.

---

## Meilenstein 2 – Playtest-Runde 1 und Nachbesserung

**Testspieler:** Jonas 5/10, Mira 8/10, Theo 7/10, Kira 7/10 – Berichte und
Auswertung in `playtests/m2-r1/` (`ZUSAMMENFASSUNG.md`).

**Gefunden**

- Blocker: Ohne Lesen kam man nicht an Stein (Kiesel unsichtbar, Felsen nur
  mit Spitzhacke, Werkbank verbrauchte allen Stein).
- Spielfluss: Flachsbeet-Trick (abreißen, neu bauen, wieder ernten), Stein
  an Tag 1 zu knapp und zu langsames Nachwachsen, Quellen nicht von der
  Kulisse zu unterscheiden, ein E-Druck löste zwei Dinge aus, Bauten nur am
  Fuß anklickbar, kaum Treffer-Gefühl beim Sammeln.
- Feinschliff: Meldungen über dem Ziel, abgeschnittene Titel und Preise,
  fehlende Hinweise auf Rennen, leere Quellen ohne Hinweis u. v. m.

**Geändert**

- Stein: Werkbank 2 statt 4, Spitzhacke 2 statt 3, Hütte 12 statt 16 (Stoff
  5 statt 6); fünf sichtbare Steinhaufen auf Erdflecken; Nachwachsen nach
  2 Tagen (Gras nach 1).
- Lesbarkeit: rote Stoffbänder an fällbaren Bäumen, auffällige Faserbüsche
  und Astbündel, versteckten Felsen und Schrotthaufen versetzt, Axt und
  Spitzhacke farblich getrennt, neues Symbol für den Hüttenausbau.
- Treffer-Gefühl: Wackeln mit Pulsen, Zusammensacken mit Staub und Laub.
- Bauen: Auswahl über den ganzen Bau plus Rahmen unter der Maus, belegte
  Felder rot markiert, neues Beet erst morgen reif, E wird beim Setzen
  verbraucht, Bauleiste mit Häkchen, gekürzten Preisen, lesbaren Titeln.
- Hinweise: gedimmt »Heute leer – morgen wieder« / »Spitzhacke nötig«,
  Zielmarkierung am Boden, E mit etwas Spielraum, Meldungen unter dem Ziel
  und über der Werkbank, »1 Schrott gewonnen«, Startzeile mit Rennen,
  Zähler am Barrikaden-Ziel.
- OFFENE-FRAGEN.md Nr. 9 (bestätigt) und Nr. 20 (Stein am Anfang).

**Offen**

- Kontrollrunde (Jonas, Theo) auf dem nachgebesserten Stand.

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

- Playtest-Runde für Meilenstein 2 – erledigt, siehe oben.

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
