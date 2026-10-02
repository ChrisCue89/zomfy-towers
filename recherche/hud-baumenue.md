# Recherche: HUD-Anordnung und Baumenü für Zomfy Towers

*Stand 30.09.2026. Anlass ist die Rückmeldung des Auftraggebers: »Aktuell ist alles super unübersichtlich, und mit den minimalen Pixeln im Baueditor erkennt man nicht, was man bauen will.«*

> **Quellenlage.** Die Websuche lief. Einzelne Seiten ließen sich nicht abrufen, weil WebFetch von der Netzwerkrichtlinie gesperrt war. Aussagen über Quellen stützen sich deshalb auf die Suchergebnisse. Wo ich Vorbilder nur aus eigener Kenntnis beschreibe, steht das dabei. Alle Messungen stammen aus dem Code (`main`, Stand N7) und aus den Prüfbildern in `screenshots/`. Die Bilder haben 1280 × 720 Pixel, die Oberfläche also 640 × 360 UI-Pixel.

## Kurzfassung

1. **Heute ist alles immer zu sehen.** Dazu gehören die Bauleiste mit bis zu sieben Reitern, die Schnellleiste mit acht meist leeren Plätzen, zwei Fähigkeitenkacheln, Ziel, Vorrat und Uhr. Hinzu kommen Edda, der Nachtplan und bis zu vier Meldungen. In den Prüfbildern bedecken Tafeln tagsüber **rund 20 %** des Bildes, abends **rund 30 %** und beim ersten Turm **rund 38 %**. Im rechten Bilddrittel sind es abends zwei Drittel.
2. **Die Bauleiste ist nicht zu klein, sondern zu leer.** Eine Kachel misst 34 × 36 UI-Pixel, das Bild darin 12 × 12. Der Bolzenwerfer besteht aus **44 farbigen Punkten, das sind 3,6 % der Kachel**. Taste und Preis stehen in 3 × 5 Pixel großen Ziffern, die Rohstoffe als 4 × 4 Pixel große Farbflecken. Was man sich nicht leisten kann, wird zusätzlich gerastert. Der dunkle Umriss der Bilder hat auf dem dunklen Kachelgrund einen Kontrast von **1,1 : 1**, ist also unsichtbar. Den Namen sieht man erst in einer Tafel am anderen Bildrand.
3. **Es gibt echte Überlappungen.** Meldungen laufen über die Nachtleiste, das Ziel verschwindet darunter, und Wortzeilen über den Köpfen stapeln sich.
4. **Ein Fehler nebenbei:** Die Bauleiste bricht nach sechs Kacheln ohne Hinweis ab. Sobald die Lagerglocke dazukommt, fällt deshalb der Funkturm aus »Einrichten«.
5. **Was die Recherche ergibt:** feste Zonen mit je einer Aufgabe, eine klare Rangfolge der Informationen und Anzeigen nur bei Bedarf (Progressive Disclosure). Hinweise gehören an die Dinge in der Welt. Dazu kommen Mindestgrößen und eine einstellbare Oberflächengröße.
6. **Vorschlag:**
   - Sechs Zonen.
   - Ein Baumenü, das zu ist (ein Knopf) oder offen: Kacheln von 48 × 58 Pixeln mit einem 44 × 40 großen Bild aus dem 3D-Modell, Preis in der Hauptschrift und einem Bauzettel.
   - Der Nachtplan wandert in die Nachtleiste. Es gibt höchstens zwei Meldungen, sortiert nach Art.
   - Edda wird kompakt und steht unten links.
   - Die Schnellleiste zeigt nur belegte Plätze.
   - Neue Einstellung »Oberfläche: klein · mittel · groß«.
7. **Umsetzung** in vier kleinen Meilensteinen und einem optionalen fünften, jeweils mit Prüfpunkten (Abschnitt 5).

---

## 1. Befund

### 1.1 Die Leinwand

`uiLines` ist 360, die Oberfläche wird ganzzahlig skaliert: `uiScale = round(Gerätehöhe / 360)`. Bei 720p, 1080p, 1440p und 4K ergibt das 640 × 360. Im **Browserfenster** ist die Höhe kleiner:

| Fenster | Oberfläche |
|---|---|
| 1080p-Bildschirm mit Browserleisten (~955 px hoch) | 640 × 318 |
| Laptop 1366 × 768 (~657 px hoch) | 683 × 329 |
| 1440 × 900 ohne Retina | 480 × 300 |

Das HUD muss also mit 300 bis 330 Zeilen genauso gut funktionieren wie mit 360. Heute sind viele Werte fest auf 360 abgestimmt, zum Beispiel `safe.y0 = 86` bei den Randmarken, `TIP_TOP = 40` und `y ≥ 62` bei den Sprechblasen.

### 1.2 Was heute wo steht

| Ort | Element | Größe (UI-px) | Wann sichtbar |
|---|---|---|---|
| oben links | Uhr (Tag x von 30, Uhrzeit, Tageszeit, Wetter, Balken) | ≈ 118 × 34 | immer |
| oben links | Ziel und Nebenauftrag | bis ≈ 310 × 30 | solange ein Ziel besteht |
| oben Mitte | Nachtleiste (Nacht, Welle, Haus, Tor, Richtung), dazu Boss und Banner | ≈ 124–150 × 42–55; Boss 220 × 24 | nachts oder bei Schaden |
| oben rechts | Vorrat (bis zu 8 Sorten, dazu Auftragsdinge) | ≈ 130–260 × 20 | immer |
| darunter | Nachtplan | ≈ 212 × 72 | abends und in den Wellenpausen |
| darunter | Meldungen | bis 4 × (150–320) × 18 | je 2 bis 3,5 s |
| unten links | Laterne und Schnellleiste (8 Plätze) | 207 × 28 | immer |
| daneben | Fähigkeiten (2 Kacheln) | 48 × 28 | immer (bis Stufe 3 leer, mit »3«) |
| darüber | Leben, Erfahrung, »Wahl wartet«, Junas J | ≈ 200 × 10–30 | nachts oder wenn Mika verletzt ist |
| unten rechts | Bauleiste: 3 bis 7 Reiter plus TAB, 5 bis 6 Kacheln | ≈ 186–222 × 61 | immer |
| darüber | Funk (Foto ≈ 67 × 67, Blase 172 breit) | ≈ 249 × 81 | rund 5 bis 12 s je Spruch, bis zu 5 in der Warteschlange |
| links unten oder rechts oben | Hinweistafel der Bauleiste | ≈ 244 × 105 | beim Zeigen auf eine Kachel und beim Setzen |
| in der Welt | E-Hinweis, Sprechblasen, Zahlen, Worte, Zustandszeichen, Champion-Namen, Ziel-Pfeil, Randmarken, Hinweis am Baugeist | – | bei Bedarf |

### 1.3 Wie viel Fläche die Tafeln bedecken

Die Werte sind in den Prüfbildern gemessen und gerundet. Die Gesamtfläche beträgt 640 × 360 = 230 400 px².

| Bild | Was zu sehen ist | Bedeckt |
|---|---|---|
| `tag.png` | Uhr, Ziel, Vorrat, Funk, Reiter, Bauleiste, Schnellleiste, Fähigkeiten | ≈ 20 % (ohne Funk ≈ 11 %) |
| `horde.png` | Nacht mit Nachtleiste, 2 Meldungen, Funk | ≈ 27 % |
| `nachtplan.png` (19:52 Uhr) | dazu Nachtplan und 3 Meldungen | ≈ 30 % |
| `turm-bauen.png` (erster Turm) | dazu Hinweistafel und 4 Meldungen | ≈ 38 % |

Die Fläche ist sehr ungleich verteilt. In `nachtplan.png` sind im rechten Bilddrittel rund zwei Drittel bedeckt: Vorrat, Nachtplan, Meldungen, Funk und Bauleiste stehen alle rechts. Links und in der Mitte ist das Bild dagegen fast frei.

### 1.4 Die Bauleiste im Detail (der Kern der Beschwerde)

- **Das Bild ist ein Bruchteil der Kachel.** Die Kachel misst 34 × 36 = 1224 Pixel, das Symbol 12 × 12. Tatsächlich gefärbt sind beim Bolzenwerfer 44 Punkte, beim Katapult 37, beim Sprenger 58 und beim Laternenturm 54. Nur die Barrikade liest sich gut: Sie ist 16 × 15 groß und hat 200 Punkte. Die Türme sind Strichzeichnungen, ein Stiel mit etwas darauf.
- **Taste und Preis stehen in 3 × 5-Ziffern, die Rohstoffe als 4 × 4-Flecken** (`mini_holz` usw.). Bei 720p ist ein Rohstoffzeichen damit 8 × 8 Gerätepixel groß und keine Form mehr, nur noch eine Farbe.
- **Nicht Bezahlbares wird gerastert.** `ditherRect(…, 0.35)` liegt über dem Bild. Am Spielanfang kann man sich keinen Turm leisten; bis auf die Barrikade ist die Leiste dann grau mit roten Zahlen (siehe `tag.png`, `nacht-fullhd.png`). Das Bild wird genau dann unkenntlich, wenn man lernen will, was es ist.
- **Der Kontrast fehlt.** Der dunkle Umriss (`P.n0`) steht auf dem Kachelgrund (`P.n1`) mit 1,1 : 1 und verschwindet. Auf dem warmen Fotogrund des Katalogs (`P.e7`) hätte er 6,5 : 1.
- **Der Name ist weit weg.** Er steht erst in der Hinweistafel, und die landet meist links über der Schnellleiste, weil über der Bauleiste der Funk steht – rund 250 UI-Pixel vom Mauszeiger entfernt. Dort stehen jedes Mal dieselben Anleitungen (»Klick oder E setzt · Mausrad dreht · Esc bricht ab«, »Kreis: Reichweite · Pünktchen …«), beim Setzen fünf bis sechs Zeilen.
- **Dieselbe Taste bedeutet je nach Reiter etwas anderes:** Q ist Bolzenwerfer, Glockenturm, Moderlocke, Kürbis, Werkbank, Zelt oder »Stufe 2«. Weil die Leiste immer aktiv ist, baut ein Q nach einem vergessenen Tab etwas anderes als gedacht.
- **Die Reiter sind unklar benannt.** »Türme 2« ist eine Seitenzahl. »Einrichten« enthält seit N4 keine Möbel mehr (die kommen über den Katalog), sondern Zelt, Schlafhütte, Holzlager, Hochsitz, Übungsplatz, Lagerglocke und Funkturm. Werkbank und Holzlager stehen in verschiedenen Reitern, und »Figur« enthält gar keine Bauten.
- **Fehler:** `options(this.tab).slice(0, HOTKEYS.length)` kürzt auf sechs Kacheln. Mit der Lagerglocke hat »Einrichten« sieben Optionen, der Funkturm verschwindet ohne Hinweis.
- **Rückfragen stehen am falschen Ort:** »Nochmal drücken: abreißen« erscheint als Meldung oben rechts, am anderen Ende des Bildes. Und das »%« oben rechts auf einer Kachel (»jeder weitere Turm kostet mehr«) kann niemand erraten.

### 1.5 Überlappungen, Doppeltes, Gedränge

**Überlappungen in den Prüfbildern:**

- `horde.png` und `nacht-fullhd.png`: Lange Meldungen laufen in die Nachtleiste und verdecken »Aus: Mittelweg«. Der Grund: `toastTop()` kennt Vorrat und Nachtplan, aber nicht die Nachtleiste.
- `posten.png` und `glocke-kampf.png`: Die Zielzeile »Juna: Baut den Leuchtmast aus (Stufe 1/3, Rei…« verschwindet unter der Nachtleiste.
- `boss.png`: »holt aus!« steht doppelt da, einmal in der Bossleiste und einmal als Wort über dem Kopf. Das Wort treibt bis an den Zielkasten.
- `champion.png`: Name, Merkmale und »Schild bricht!« liegen übereinander.
- `baugeist.png`: Der rote Grund am Geist (»Auf dem Weg nur Barrikaden und Fallen«) liegt auf Eddas Namensschild.

**Doppeltes:**

- Anleitungen kommen über vier Kanäle: Funk, Zielzeile, die Anleitungszeilen der Hinweistafel und Meldungen wie »Nochmal drücken…«.
- Die Richtung der Nacht steht an drei Stellen: in der Nachtleiste (»Aus: Südweg«), im Nachtplan und in den Randmarken mit Wellennummer.
- »… ist jetzt bezahlbar« kommt dreifach: als Meldung, als Aufleuchten der Kachel und als Glöckchen. Die Meldung steht in vier Prüfbildern.
- Meldungen haben alle dasselbe Gewicht, von »Schlurfer im Lager!« bis »Schlurferkunde: … ein neuer Eintrag im Herbstbuch«.

### 1.6 Was gut ist und bleiben soll

- **Räumliche Hinweise:** der E-Hinweis mit Tastenkappe am Gegenstand, die Ecken um das Ziel, der Grund am Baugeist, der Reichweitenkreis, der Pünktchenweg mit Kreuz, die Randmarken mit Anzahl und der Ziel-Pfeil.
- **Diegetisches**, also Hinweise, die Teil der Spielwelt sind: die Fahne am Briefkasten, die Wimpel an den Türmen, die Stufen der Barrikaden, die Trümmer des Tors und die Alarmglocke.
- **Balduins Katalog** (`katalog.png`) ist das am besten lesbare Menü im Spiel: Reiter, eine Liste mit Namen und Preisen, ein großes Foto aus dem Modell und eine Beschreibung. Seine Technik (`itemPicture` → `pictureOf` → `renderVoxelPortrait`, auf der CPU ohne GPU-Auslesen) ist der Schlüssel für das neue Baumenü.
- **Hauptschrift und Tafelstil** (Pflaume, Holzrahmen, Creme) lesen sich gut und passen zur Stimmung. Der Textkontrast liegt zwischen 5,5 : 1 und 14 : 1. Einzige Ausnahme ist das Orange für »geht nicht« (`P.f3`) mit 4,2 : 1.

---

## 2. Grundlagen aus der Recherche

### 2.1 Blick und Zonen

- **Der Blick bleibt in der Mitte.** Eye-Tracking-Studien zeigen, dass Spieler überwiegend dorthin schauen, wo das Geschehen ist; Elemente am Rand werden oft gar nicht wahrgenommen (Hodent: »inattentional blindness«). Daraus folgt: Was man jetzt wissen muss, gehört an das Ding in der Welt. Der Rand ist für Zustände, die man bewusst nachschaut.
- **Jede Angabe braucht einen festen Platz**, damit der Blick ihn findet. Konsistenz ist eine von Hodents sieben Säulen der Bedienbarkeit, neben Klarheit, Zeichen und Rückmeldung, »form follows function«, geringer Arbeitslast, Fehlervermeidung und Flexibilität.
- **Zusammengehöriges gehört zusammen:** alles zur Nacht in eine Tafel, alles zu Mika in eine Ecke. Eine Ecke mit genau einer Aufgabe lernt man schnell. Heute trägt die rechte Seite fünf Aufgaben.

### 2.2 Rangfolge der Informationen

Viele Leitfäden für Spieloberflächen teilen in drei Stufen ein:

1. **Primär, immer sichtbar und klein:** tagsüber die Uhr; nachts dazu Welle, Haus, Tor und Leben.
2. **Sekundär, bei Bedarf:** Vorrat, Ziel, Schnellleiste, Fähigkeiten, Nachtplan.
3. **Tertiär, auf Abruf:** Bücher, Karte, Werte der Bauten, Verlauf der Meldungen.

Heute sind fast alle sekundären Elemente dauerhaft zu sehen.

### 2.3 Progressive Disclosure: Anzeigen nur bei Bedarf

Die Nielsen Norman Group beschreibt Progressive Disclosure so: zuerst nur das Wenige, das man jetzt braucht, der Rest auf Anfrage. Das senkt Fehler und macht die Oberfläche leichter lernbar, ohne erfahrene Spieler zu bremsen – sie benutzen weiter Tastenkürzel. In Spielen erscheinen Anzeigen, wenn sie gebraucht werden, und verschwinden danach wieder. Zwei Extreme: **Dome Keeper** lässt Anzeigen wie Vorrat und Wellentimer sogar erst kaufen, **Thronefall** und **Kingdom Two Crowns** zeigen das Bauen nur an der Baustelle.

### 2.4 Diegetisch, räumlich, meta, nicht-diegetisch

Fagerholt und Lorentzon (2009) ordnen Anzeigen nach zwei Fragen: Liegt die Anzeige in der Spielwelt? Und gehört sie zur Geschichte?

| Art | Bedeutung | Beispiele in Zomfy Towers |
|---|---|---|
| diegetisch | in der Welt und Teil der Geschichte | Briefkastenfahne, Wimpel, Glocke, Tor-Trümmer |
| räumlich | in der Welt, aber nur für den Spieler | Reichweitenkreis, Geist-Hinweis, E-Hinweis, Lebensbalken über Köpfen |
| meta | Teil der Geschichte, aber als Anzeige | Eddas Funk-Blase, der rote Rand bei wenig Leben |
| nicht-diegetisch | reine Anzeige | Uhr, Vorrat, Leisten, Meldungen |

Eine Vergleichsstudie von Peacocke und Kollegen (2018) zu Ego-Shootern zeigt: Keine Art gewinnt immer, es hängt von der Information ab. Für ein gemütliches Spiel ist das Räumliche das stärkste Werkzeug – der Preis am Geist, die Rückfrage an der Kachel, »Stufe 2!« direkt am Turm.

### 2.5 Lesbarkeit einer Pixel-Oberfläche: Mindestgrößen

**Was die Richtlinien fordern:**

- **XAG 101** (Xbox Accessibility Guidelines): Text mindestens 18 px am PC und 26 px auf Konsolen, jeweils bei 1080p.
- **IGDA Game Accessibility SIG:** 32 px, und 46 px für Text, der nur kurz steht.
- **XAG 102:** Kontrast für Text mindestens 4,5 : 1.

**Umrechnung auf unsere Schrift:** Bei 360 Zeilen hat die Hauptschrift eine Versalhöhe von 7 Pixeln. Das entspricht bei 1080p einer Schriftgröße von etwa 30 px und liegt damit gut. Die 3 × 5-Ziffern entsprechen etwa 21 px. Das liegt knapp über dem PC-Minimum, aber unter den Werten für Konsole und IGDA. Diese Ziffern taugen also für Nebensachen, nicht für Preise, Tasten oder Lebenswerte.

| Element | Mindestmaß bei ≈ 360 Zeilen | Grund |
|---|---|---|
| Text, der gelesen werden muss | Hauptschrift (5 × 7, Zeile 12) | ≈ 30 px bei 1080p |
| Zahlen mit Bedeutung (Preis, Leben, Vorrat) | Hauptschrift, nie 3 × 5 | 3 × 5 entspricht nur ≈ 21 px |
| Tastenkappe | 11 × 11 mit Buchstaben in der Hauptschrift | wie der E-Hinweis |
| Rohstoffzeichen | 10 × 10 (gibt es schon: `holz`, `schrott` …) | 4 × 4 ist nur ein Farbfleck |
| Bild, das man von ähnlichen unterscheiden muss (Türme) | ≥ 32 × 32 Bildpunkte Inhalt, Fläche 44 × 40 | 16 × 16 reicht für eine Silhouette, bei ähnlichen Formen erst 32 × 32 für Einzelheiten |
| Klickfläche | ≥ 16 × 16 UI-px (48 Gerätepixel bei 1080p) | Fitts'sches Gesetz, WCAG 2.5.5: 44 CSS-px |
| Abstand zwischen Tafeln | ≥ 4 UI-px | getrennte Gruppen |
| Kontrast Bild gegen Grund | ≥ 3 : 1 | WCAG 1.4.11; darum keine Rasterung über Bildern und ein heller Bildgrund |

Die Kacheln von heute sind als Klickfläche übrigens groß genug: 34 × 36 UI-px sind 102 × 108 Gerätepixel. Es fehlt ihnen nicht an Größe, sondern an **Bildinhalt**.

### 2.6 Einstellbare Oberflächengröße

Die Richtlinien für Barrierefreiheit (XAG, IGDA, GAG) empfehlen, Text- und Oberflächengröße wählbar zu machen. **Stardew Valley** trennt seit Version 1.5 die UI-Größe (75 bis 150 %) von der Zoomstufe. **Thronefall** hat mit Version 1.7 einen Regler von 50 bis 150 % nachgerüstet, nachdem Spieler auf dem Steam Deck »UI too small« schrieben. Zu **Kingdom Rush Vengeance** gibt es Beschwerden über eine »unbearably small« Oberfläche. In unserem Spiel geht das nur in ganzen Faktoren, weil die Pixel scharf bleiben sollen (siehe 4.7).

---

## 3. Vorbilder (nur Aufbau und Bedienung)

| Spiel | HUD | Baumenü | Was wir übernehmen |
|---|---|---|---|
| **Kingdom Two Crowns** | fast nichts, nur der Münzbeutel | Bauen am Ort: leere Münzkreise über der Stelle, Taste gedrückt halten | Preise dort zeigen, wo gebaut wird (am Geist) |
| **Thronefall** | sehr knapp; die Silhouetten tragen die Information | Bauen am Ort: an festen Plätzen, Taste halten; Ausbauten als Wahl zwischen wenigen Möglichkeiten | wenig gleichzeitig zeigen; UI-Größe nachgerüstet |
| **Kingdom Rush** | Leben, Gold, Welle oben links; Held und Zauber unten links (eigene Kenntnis) | Ring runder Turmknöpfe mit Preis über dem Bauplatz; Ausbau und Verkauf im Ring am Turm | große Bilder mit Preis; Ausbau am Turm |
| **Bloons TD 6** | Leben, Geld, Runde oben (eigene Kenntnis) | Bildraster am rechten Rand, jede Kachel mit großem Turmbild und Preis, Taste je Turm; bei einem Turm drei Ausbaupfade mit Bild, Name, Preis | großes Bild und Preis; Vorher und Nachher |
| **Dome Keeper, Bad North** | minimal; bei Dome Keeper werden Anzeigen gekauft, Bad North zeigt im Kampf keine Werte | Konsole bzw. Klick auf Einheiten | Anzeigen erst, wenn sie etwas bedeuten |
| **Dorfromantik, Townscaper** | fast leer: Stapel unten rechts bzw. Farbleiste | – | Mut zur Leere |
| **Stardew Valley** | Uhr und Geld oben rechts, Werkzeugleiste unten, Energie unten rechts | Basteln als Bildraster mit Tooltip | kompakte Uhr; UI-Größe |
| **Don't Starve (Together)** | Uhr und Werte oben rechts, Inventar unten | Reiter am linken Rand, Detailtafel mit Zutaten; DST: Schnellreiter mit höchstens 9 Rezepten je Seite | Reiter mit Detailfeld; höchstens 9 je Seite |
| **RimWorld** | Werte in Leisten | »Architekt«: Kategorien, dann Bauknöpfe mit Namen, Tooltip mit Kosten | Kategorien nach Zweck |
| **Mindustry, They Are Billions** | knapp; Befehle unten rechts | unten rechts Kategorien und Raster; bei They Are Billions öffnet B das Menü, Esc geht zurück | Platz unten rechts; eine Taste öffnet |
| **Frostpunk** | Rohstoffe oben | Bauleiste unten (Taste B), Kategorien, Karten mit Bild, Name, Preis (eigene Kenntnis) | Karten mit Bild |
| **Against the Storm** | Rohstoffe oben | Bauleiste unten mit Bildkarten; Tab öffnet eine Liste mit Suche; 10 belegbare Schnelltasten | **Tab** als Bauen-Taste; später Schnellplätze |
| **Timberborn** | oben | Kategorieleiste unten, ein Klick öffnet große Bausymbole; Tooltip mit Name, Eigenschaften, Kosten | erst Kategorie, dann Bau |

**Drei Muster lassen sich erkennen:**

- **A – Bauen am Ort** (Thronefall, Kingdom, Kingdom Rush). Das setzt feste Bauplätze voraus. Zomfy Towers platziert frei, darum passt A nur als Rückmeldung am Geist.
- **B – Palette auf Abruf, mit Kategorien, großen Bildern und Detailfeld** (die Aufbauspiele).
- **C – Laden, der immer offen ist** (Bloons). C passt zu reinen Tower-Defense-Spielen ohne Figur. Zomfy Towers hat Tagesteile ganz ohne Bauen (sammeln, reden, angeln, rudern), und dort wäre ein dauerhafter Laden nur Lärm.

**Empfehlung: B**, mit der Geschwindigkeit der heutigen Tasten und den räumlichen Rückmeldungen aus A. Auch Lars Doucet (Defender's Quest) verlangt für Tower Defense »total information«: Ein Klick auf einen Bau zeigt alle Werte. Das leistet im Vorschlag der Bauzettel.

---

## 4. Vorschlag für Zomfy Towers

### 4.1 Leitidee: sechs Zonen mit je einer Aufgabe

| Zone | Frage | Inhalt |
|---|---|---|
| oben links | Wann ist es, was ist zu tun? | Uhr, Ziel (eine Zeile) |
| oben Mitte | Wie steht die Nacht? | Nachtleiste mit Plan, Boss, Banner, Alarme |
| oben rechts | Was habe ich, was ist passiert? | Vorrat, höchstens 2 Meldungen |
| unten links | Mika | Funk (das Gerät hängt an Mikas Gürtel), Leben, Erfahrung, Schnellleiste, Fähigkeiten |
| unten rechts | Bauen | Knopf (Menü zu) oder Baumenü (offen) |
| Mitte | die Welt | nur Räumliches |

Keine Zone zeichnet in eine andere hinein. Elemente, die an der Welt hängen (Sprechblasen, E-Hinweis, Randmarken), bleiben in der freien Fläche dazwischen.

Das große Menü steht rechts, weil die rechte Bildhälfte meist die Bucht zeigt. Links liegen Wald und Zuläufe, denn die Spawns sind am linken Rand. Dort unten sollen nur schmale Leisten stehen.

### 4.2 Lage »Tag«: erkunden und sammeln

```
TAG – Erkunden, Sammeln (640 × 360 UI-Pixel; 1 Zeichen = 8 px, 1 Zeile = 12 px)
      0       80      160     240     320     400     480     560    640 px
     +--------------------------------------------------------------------------------+
   0 |+-Uhr 120×34---+                                            +-Vorrat ~140×20---+|
  12 ||Sonne Tag 3/30|                                            |Holz Stein Fasern ||
  24 |+--------------+                                                                |
  36 |                                                          [Meldung (≤ 2, je 18 ]|
  48 |[Ziel (1 Zeile, ≤ 220)       ]                                                  |
  60 |                                                                                |
  72 |                                                                                |
  84 |                                                                                |
  96 |                                                                                |
 108 |                    Mitte: nur Räumliches –                                     |
 120 |                    Hinweis am Ding, Blasen, Zahlen                             |
 132 |                                                                                |
 144 |                                                                                |
 156 |                                     [E Hinsetzen]                              |
 168 |                                                                                |
 180 |                                                                                |
 192 |                                       (Mika)                                   |
 204 |                                                                                |
 216 |                                                                                |
 228 |                                                                                |
 240 |                                                                                |
 252 |                                                                                |
 264 |+-Funk 240×46 (nur beim Spreche+                                                |
 276 ||Foto | Blase ≤ 192 breit,     |                                                |
 288 ||40px | höchstens 3 Zeilen     |                                                |
 300 |+------------------------------+                                                |
 312 |                                                                                |
 324 |+-Schnellleis+                                                          +-Bau--+|
 336 ||F 1 2 3     |                                                          |Hammer||
 348 |+------------+                                                          +------+|
 360 +--------------------------------------------------------------------------------+
```

**Dauerhaft zu sehen sind fünf Tafeln:**

- Uhr (4, 4) mit 118 × 34
- Ziel (4, 42), eine Zeile, höchstens 220 breit
- Vorrat mit den Grundsorten, ≈ 140 × 20
- Schnellleiste mit nur den belegten Plätzen, ≈ 100 × 28
- Bau-Knopf mit 44 × 32: Hammer und Tastenkappe »Tab«

Zeitweise kommen Edda (240 × 46) und höchstens zwei Meldungen dazu. Insgesamt sind so **etwa 6 % der Fläche bedeckt (mit Edda 11 %) statt 20 %**.

### 4.3 Lage »Bauen«: wählen, setzen, Auswahl

```
BAUEN – Menü offen, wählen (640 × 360)
      0       80      160     240     320     400     480     560    640 px
     +--------------------------------------------------------------------------------+
   0 |+-Uhr----------+                                  +-Vorrat 232×20 (alle Sorten)+|
  12 ||Sonne Tag 3/30|                                  |Holz Stein Fas Stoff Schr Te||
  24 |+--------------+                                                                |
  36 |                                                                                |
  48 |[Ziel (1 Zeile)              ]                                                  |
  60 |                                                                                |
 ...                                                                                   
 144 |                             (Geist folgt der Maus)                             |
 ...                                                                                   
 192 |                                       (Mika)                                   |
 204 |                                        +-Bauzettel 313×50---------------------+|
 216 |                                        |Bolzenwerfer             10 Schrott   ||
 228 |                                        |Schießt Bolzen auf einzelne Schlurfer.||
 240 |                                        |Schaden 14 · 1,1/s · Reichweite 5,5 m ||
 252 |                                        +--------------------------------------+|
 264 |                                        +-Reiter: Türme|Helfer|Fallen|Lager|Zuh+|
 276 |                                        |                                      ||
 288 |                                        +-Q---+-R---++-T---+-G---++-C---+-V----+|
 300 |                                        | Bild| Bild|| Bild| Bild|| Bild| (6.) ||
 312 |+-Funk (nur beim Sprechen)-----+        |     |     ||     |     ||     |      ||
 324 ||Schnellleiste ist im          |        |     |     ||     |     ||     |      ||
 336 ||Baumenü zu                    |        |10 S |10 S || 9 S |12 S || 1 H |      ||
 348 |+------------------------------+        +-----+-----++-----+-----++-----+------+|
 360 +--------------------------------------------------------------------------------+
```

```
BAUEN – Setzen: Bauzettel zu, Preis und Grund stehen am Geist (640 × 360)
      0       80      160     240     320     400     480     560    640 px
     +--------------------------------------------------------------------------------+
   0 |+-Uhr----------+                                  +-Vorrat (alle Sorten)-------+|
  12 ||Sonne Tag 3/30|                                  |                            ||
  24 |+--------------+                                                                |
 ...                                                                                   
 120 |                          +-Geist------+                                        |
 132 |                          |  S 10      |                                        |
 144 |                          +------------+                                        |
 156 |                                                                                |
 168 |                    (Reichweite, Pünktchen, Kreuz)                              |
 ...                                                                                   
 204 |                                       (Mika)                                   |
 ...                                                                                   
 264 |                                        +-Reiter: Türme|Helfer|Fallen|Lager|Zuh+|
 276 |                                        |                                      ||
 288 |                                        +-Kacheln 6 × 48×58--------------------+|
 300 |                                        |[Q]gewählt  R   T   G   C   V         ||
 312 |                                        |                                      ||
 324 |                                        |Klick/E setzt · Rad dreht             ||
 336 |                                        |Rechtsklick/Esc: Setzen ab            ||
 348 |                                        +--------------------------------------+|
 360 +--------------------------------------------------------------------------------+
```

**Das offene Menü:**

- Es ist 313 × 138 groß und steht rechtsbündig: Bauzettel 313 × 50, Reiter 16 hoch, Kacheln 68 hoch.
- Beim Wählen bedeckt die Oberfläche **etwa 23 %**. Beim Setzen verschwindet der Bauzettel, das Menü ist dann 313 × 84 groß, und es sind **etwa 16 %** bedeckt. Heute sind es in `turm-bauen.png` 31 % ohne Meldungen und 38 % mit ihnen.
- Die Schnellleiste ist im Baumenü zu. Wer baut, braucht sie nicht, und ein Klick auf einen Schlurfer bleibt ein Schlag. Den Lebensbalken sieht man weiter, wenn Mika verletzt ist.
- Bei weniger als 300 Zeilen schrumpft der Bauzettel auf eine Zeile (Name · Preis). Die Wirkung erscheint dann nur, wenn die Maus auf der Kachel liegt.

### 4.4 Lage »Nacht«: Verteidigung

```
NACHT – Verteidigung (640 × 360)
      0       80      160     240     320     400     480     560    640 px
     +--------------------------------------------------------------------------------+
   0 |+-Uhr----------+            +-Nachtleiste 180×58---+              +-Vorrat komp+|
  12 ||Mond  Tag 3/30|            |Nacht 3 · Welle 2/4   |              |Holz Schrott||
  24 |+--------------+            |Haus ######## 300/300 |                            |
  36 |                            |Tor  #####    150/150 |      [Meldung (≤ 2)       ]|
  48 |                            |Aus: Nordweg · nächste|                            |
  60 |                            +----------------------+                            |
  72 |                          +-Boss 220×24 (falls einer)+                          |
  84 |                          |                          |                          |
 ...                                                                                   
 132 |                     (Wellen-Nr. am Waldrand)                                   |
 ...                                                                                   
 180 | <- 3                                                                           |
 192 |                                       (Mika)                                   |
 ...                                                                                   
 276 |+-Funk: nur kurze Zeilen-------+                                                |
 288 ||sonst wartet sie auf die Pause|                                                |
 300 |+------------------------------+                                                |
 312 |[Leben ########.. H]                                                            |
 324 |+-Schnellleis++-Fähi+                                                   +-Bau--+|
 336 ||F 1 2 3     ||RMB  |                                                   |Hammer||
 348 |+------------++-----+                                                   +------+|
 360 +--------------------------------------------------------------------------------+
```

- **Die Nachtleiste ist 180 × 58 groß** und enthält den Plan.
  - Abends vor der ersten Welle zeigt sie »Heute Nacht: 3 Wellen«, dann »Welle 1 · 20:30 · Südweg« und »N: Ich bin bereit«.
  - In der Welle zeigt sie Welle, Haus, Tor und »Aus: Nordweg · nächste 22:19«.
  - Die unterste Zeile wird zur **Alarmzeile** und steht dann in Rot, zum Beispiel »Schlurfer im Lager!« oder »Die Werkbank ist umgeworfen!«.
  - Den ganzen Plan zeigt die Karte (M).
- **Zeitraffer** ist ein Zeichen »» in der Nachtleiste statt einer Meldung.
- **Der Vorrat ist kompakt:** Holz, Schrott und Zombieteile. Alles andere erscheint nur, wenn es sich ändert.
- **Unten links steht Mikas Gruppe:** Leben (Zahlen in der Hauptschrift), Erfahrung als Strich, Schnellleiste, Fähigkeiten (erst ab der ersten) und Junas J.
- **Insgesamt sind etwa 13 % bedeckt statt 27 bis 30 %.**

### 4.5 Das neue Baumenü im Detail

**Zustände:**

- **Zu:** ein Knopf »Bauen« mit Hammer und der Tastenkappe »Tab« in der Hauptschrift. Der Knopf funkelt golden, sobald etwas neu bezahlbar oder frei ist. Das ersetzt die Meldung »… ist jetzt bezahlbar«; das Glöckchen darf leise bleiben.
- **Offen:** Reiter, Kacheln und Bauzettel.
- **Setzen:** Die Kacheln bleiben, die gewählte ist golden umrandet. Der Bauzettel ist zu. Am Geist stehen der Preis und, in Rot, der Grund, wenn es nicht geht (heute `drawGhostLabel`).
- **Auswahl:** Nach einem Klick auf einen Bau steht im Kopf dessen Name, etwa »Rüdiger · Bolzenwerfer · Stufe 2«, mit Wimpel. Die Kacheln zeigen seine Möglichkeiten, der Bauzettel zeigt Vorher und Nachher, zum Beispiel »Schaden 14 → 20 · Reichweite 5,5 → 6 m«. V ist rot und etwas abgesetzt, denn Abreißen liegt weiter immer auf V.

**Bedienung:** Die Tasten bleiben gleich, damit die Gewohnheit, DESIGN 7 und die Prüfabschnitte gelten.

| Eingabe | Menü zu | Menü offen | beim Setzen |
|---|---|---|---|
| Tab | öffnet den zuletzt benutzten Reiter | nächster Reiter (Umschalt + Tab zurück) | nächster Reiter, Setzen ab |
| Q R T G C V | öffnet »Türme« und beginnt sofort zu setzen, wie heute | Kachel 1 bis 6 | wechselt die Kachel |
| Klick auf Knopf oder Kachel | öffnet | beginnt zu setzen | – |
| Klick in die Welt | Schlag oder Auswahl | Auswahl eines Baus | setzt |
| Rechtsklick oder Esc | wie heute | schließt das Menü | bricht das Setzen ab, das Menü bleibt offen |

Wenn das Menü zu ist, gehört Q R T G C **immer** zum Reiter »Türme«. So bedeutet Q ohne sichtbares Menü immer »Bolzenwerfer«. Ist ein Bau ausgewählt, gelten die Tasten für seine Möglichkeiten, wie heute. Kaufen mit einer Taste braucht weiter einen zweiten Druck. Die Rückfrage steht dann **auf der Kachel**: Der Rahmen pulsiert, und statt des Preises steht »noch mal Q«. Eine Meldung oben rechts gibt es dafür nicht mehr.

**Eine Kachel misst 48 × 58:**

- **Bildfläche 44 × 40** auf warmem, gedämpft hellem Grund, wie beim Katalogfoto (`P.e7`). Das Bild steht mittig und unten bündig.
- **Tastenkappe** 11 × 11 oben links, im Stil des E-Hinweises.
- **Preiszeile** 12 hoch: Ziffern in der Hauptschrift und das 10 × 10 große Rohstoffzeichen. Zwei Sorten passen, bei mehr steht ein »+«, und der volle Preis steht im Bauzettel. Was fehlt, ist rot.
- **Balken** 2 px hoch, der zeigt, wie nah man am Preis ist.

**Zustände einer Kachel:**

| Zustand | Aussehen |
|---|---|
| bezahlbar | goldener Rahmen |
| zu teuer | dunkler Rahmen, rote Zahl; **das Bild bleibt klar** |
| gesperrt (drinnen, während der Welle) | Schloss 8 × 8 in der Bildecke, Bild gedämpft |
| voll oder fertig | Häkchen |
| neu | kleiner goldener Stern |

Statt des »%« steht im Bauzettel »jeder weitere +2 Schrott«.

**Das Bild aus dem Modell** entsteht wie Eddas Foto und die Katalogfotos: `fineTowerModels(art, 1, null)` liefert Kopf und Sockel, `VoxelModel.downsampled(2)` macht daraus das 1/16-Maß, und `renderVoxelPortrait(model, { w: 2, t: 1, f: 1.5 })` rechnet das Bild, mit derselben Einstellung wie `eddaPortrait`. Ein Turm, der nicht passt, wird als Brustbild gezeigt (Kopf und oberer Sockel). Die Modelle für alle anderen Bauten gibt es schon: `buildingModels` (Barrikaden, Lagerbauten), `trapModels`, `familyModels` (Helfer), `decoModels` (Schmuck) und `towerPartModel`. Nur für abstrakte Aktionen braucht es neue Zeichen von 24 × 24 in `icons.js`: Hausausbau, Reparieren, Abreißen, die Werte der Figur.

Der Bolzenwerfer hat dann rund 30 × 40 Bildpunkte statt 44 Punkten und sieht aus wie in der Welt – was man im Menü sieht, steht danach da. Die Bilder werden einmal gerechnet und gemerkt (wie `pictures` im Katalog) und schon beim Start in ruhigen Bildern vorab gerechnet (wie `game.precompile`), damit das erste Öffnen nicht ruckelt.

**Der Bauzettel** ist 313 × 50 groß und hat vier Zeilen:

1. Der Name in Gold, rechts der volle Preis.
2. Was der Bau tut (aus `T.bautenInfo`).
3. Die Werte, bei Türmen etwa »Schaden · Takt · Reichweite«, oder die Regel, etwa »Nur auf den Weg« oder »Nur im Hof«.
4. Ein Zusatz, zum Beispiel die Staffel, »2 von 4 gebaut« oder »fehlt: 3 Schrott«.

Die festen Anleitungen (»Klick oder E setzt …«, »Kreis: Reichweite …«) erklärt Edda einmal über `funk.once`. Danach steht beim Setzen höchstens eine blasse Tastenzeile am Rand des Menüs.

**Die Reiter:** In H1 bleiben die Inhalte, damit Gewohnheit und Prüfungen halten; nur »Türme 2« heißt dann »Helfer« und »Einrichten« heißt »Leute« (nur die Beschriftung, die IDs `tuerme2` und `einrichten` bleiben). Jeder Reiter hat ein kleines Zeichen und einen Namen; wird es zu eng, behält nur der aktive seinen Namen. Nichts wird mehr stillschweigend abgeschnitten: Bei mehr als sechs Möglichkeiten wird die sechste Kachel zu »weiter ›«, die zweite Seite benutzt dieselben Tasten. Die Neuordnung nach Zweck folgt in H5 (Abschnitt 5.3).

**Erwogen und verworfen: ein Ringmenü am Mauszeiger.** Ringmenüs sind etwa 15 % schneller als Listen (Callahan und Kollegen, 1988). Bei fünf bis acht Bildern von 40 px bräuchte der Ring aber rund 150 px Durchmesser, läge mitten auf der Stelle, an der man bauen will, und hätte keinen festen Platz für die Tasten.

### 4.6 Was wegfällt, zusammengelegt oder nur bei Bedarf gezeigt wird

| Element | Heute | Künftig |
|---|---|---|
| Bauleiste | immer da, mit Reitern | ein Knopf; das Menü öffnet sich mit Tab, Q…V oder Klick |
| Hinweistafel der Bauleiste | am anderen Bildrand | Bauzettel im Menü; beim Setzen Preis und Grund am Geist |
| Nachtplan | eigene Tafel rechts, ≈ 212 × 72 | in der Nachtleiste; der ganze Plan auf der Karte |
| Meldungen | bis zu 4, alle gleich wichtig | höchstens 2, nach Art sortiert (siehe unten) |
| »… ist jetzt bezahlbar« | Meldung, Aufleuchten und Glocke | Funkeln am Bau-Knopf |
| Ziel | 1 bis 2 Zeilen, immer | 1 Zeile (die Einführung geht vor dem Nebenauftrag); in der Welle aus; leuchtet bei einem neuen Ziel kurz auf |
| Vorrat | alle Sorten, immer | Grundsorten immer; Seltenes beim Bauen, Handeln und bei Änderungen; nachts kompakt |
| Schnellleiste | 8 Plätze, meist leer | Plätze bis zum letzten belegten; im Baumenü zu |
| Fähigkeiten | 2 Kacheln von Anfang an | erst ab der ersten Fähigkeit |
| Zahlen im Lebensbalken und in der Nachtleiste | 3 × 5-Ziffern | Hauptschrift |
| Funk | 249 × 81 unten rechts | 240 × 46 unten links (4.8) |

**Meldungen nach Art.** Die Aufrufe von `hud.toast` (165 Stück) bekommen eine Art:

- **Alarm:** in die Alarmzeile der Nachtleiste. Das gilt für »Schlurfer im Lager!«, einen Angriff auf das Tor und »Werkbank umgeworfen!«.
- **Rückfrage und Grund:** an die Kachel oder den Geist. Dazu gehören »Nochmal drücken…«, »Zu teuer«, »Nur auf den Weg«.
- **Ergebnis:** kurz rechts oder als Wort am Bau, zum Beispiel »gebaut«, »ausgebaut«, »eingebaut«, »getauscht«, »repariert«.
- **Chronik:** als Lesezeichen an der Uhr (»Neues im Buch«), gesammelt im Pausenmenü. Das betrifft neue Einträge im Herbstbuch, Notizbuch und Werkstattbuch sowie wartende Baupläne.

### 4.7 Einstellung »Oberfläche: klein · mittel · groß«

Die neue Zeile steht in den Einstellungen gleich neben »Pixelgröße«, mit denselben Wörtern. So wirkt sie:

- Der ganze UI-Faktor verschiebt sich um +1, 0 oder −1.
- Die Oberfläche muss dabei zwischen 270 und 540 Zeilen hoch bleiben. Geht das nicht, bleibt der nächste erlaubte Wert, und die Zeile sagt es: »groß – bei diesem Fenster wie mittel«.
- Die Wahl wird im eigenen Einstellungsspeicher abgelegt, nicht im Spielstand.

| Fenster | klein | mittel | groß |
|---|---|---|---|
| 1920 × 1080, Vollbild | 540 | 360 | 270 |
| 1920 × 955 (Browser bei 1080p) | 478 | 318 | – (239 wäre zu grob) |
| 2560 × 1440 | 480 | 360 | 288 |
| 3840 × 2160 | 432 | 360 | 309 |
| 1280 × 720 und 1366 × 657 | – | 360 bzw. 329 | – |

**Ehrlich gesagt:** Mit ganzen Faktoren ist die Wahl grob. Auf Laptops und im 1080p-Browserfenster bewirkt »groß« nichts. Wenn das nicht reicht, gibt es zwei Auswege:

- **Halbe Schritte ab Faktor 3**, also 3,5 oder 4,5. Dann sind die Pixel ungleich breit, 3 oder 4 Gerätepixel. Das müsste die Look-Regel »ganzzahlig« ausdrücklich erlauben.
- **Eine zweite, größere Pixelschrift** mit größeren Maßen. Das wäre ein eigener Meilenstein.

### 4.8 Edda am Funk

- **Kompakter:** Foto 40 × 42 (`eddaPortrait({ frame: true, size: 32 })`), Blase höchstens 192 breit und 3 Zeilen hoch; Längeres wird auf zwei Funksprüche geteilt. Zusammen 240 × 46 statt 249 × 81.
- **Unten links über Mikas Leiste.** Das Funkgerät hängt an Mikas Gürtel, unten rechts wird frei fürs Bauen, und die überladene rechte Seite wird leichter. Das ist eine Änderung gegenüber N4 und sollte dem Auftraggeber gezeigt werden. Alternative: Edda bleibt unten rechts über dem Knopf und wartet, solange das Menü offen ist (außer bei Erklärungen zum Bauen).
- **In einer laufenden Welle** nur Sprüche mit höchstens zwei Zeilen, der Rest wartet bis zur Pause. Ein Klick tippt fertig und schließt, wie heute.
- **Verlauf:** Die letzten fünf Sprüche sollten im Pausenmenü nachzulesen sein, denn für Text, der nur kurz steht, empfiehlt die IGDA sogar 46 px.

### 4.9 Die Regel »Die Bildmitte gehört dem Spiel«

Die Recherche bestätigt diese Regel. Kästen in der Mitte verdecken das Spiel. Kästen am Rand werden leicht übersehen. Deshalb gehört Wichtiges an die Dinge selbst. Die Regel sollte schärfer formuliert werden:

> Die Bildmitte gehört der Welt und allem, was an einem Ding in der Welt hängt: Hinweis am Gegenstand, Preis und Grund am Baugeist, Blase am Kopf, Rückmeldung am Turm. Tafeln ohne Ort stehen in ihrer Zone am Rand. In die Mitte dürfen nur Wahlen, die das Spiel anhalten (Perk, Bauplan). Meldungen stehen rechts unter dem Vorrat (höchstens zwei), Alarme in der Nachtleiste, Rückfragen an der Kachel.

---

## 5. Umsetzung im bestehenden Code

### 5.1 Dateien, in dieser Reihenfolge

1. **`src/ui/buildPictures.js`** (neu): Bilder aus den Modellen, Zwischenspeicher, Vorab-Rechnen. `pictureOf` aus `catalog.js` wird dafür verallgemeinert, etwa nach `render/portrait.js`.
2. **`src/ui/buildbar.js`:** Zustand `open`; neues `layout()` (Kachel 48 × 58, Bild 44 × 40); `drawCost` in der Hauptschrift mit 10-px-Zeichen; Bauzettel statt `drawTip`; Rückfrage auf der Kachel; keine stille Kürzung. `contains()` und `lastLayout` bleiben, der Funk liest sie heute.
3. **`src/core/builder.js`:** Optionen bekommen `picture` (Art, Stufe, Spezialisierung), bei Ausbauten die Zielstufe; Preis am Geist (`drawGhostLabel`); neue Reiternamen.
4. **`src/core/game.js`:** Tab öffnet und wechselt; Esc und Rechtsklick schließen das Menü vor dem Pausenmenü, wie heute schon das Abbrechen; Zeichenreihenfolge; `buildbarLayout()` für die Prüfung, auf Wunsch mit geöffnetem Menü.
5. **`src/ui/hud.js`:** `zones(ui)` mit festen Rechtecken; Nachtplan und Alarmzeile in `drawNightBar`; `toast(text, icon, dauer, art)` mit höchstens zwei sichtbaren Meldungen – das Feld `toasts` bleibt vollständig, weil 28 Stellen in `check.mjs` es lesen, neu kommt `shown` dazu; Schnellleiste und Fähigkeiten kompakt; Randmarken in der freien Fläche statt an festen Rändern; `drawGoal` einzeilig; Vorrat je nach Lage.
6. **`src/ui/funk.js`:** kompakte Maße, Platz aus der Zone unten links, Regel für laufende Wellen.
7. **`src/core/settings.js`, `src/render/pixelRenderer.js`, `src/ui/menu.js`:** `ui: klein | mittel | gross`, dazu `uiShift` und die Grenzen 270 bis 540.
8. **`src/data/texts.js`:** »Bauen«, »Helfer«, »Leute«, »noch mal Q«, Staffelzeile, Oberflächentexte. Jedes Zeichen muss in `font.js` vorkommen.
9. **`tools/check.mjs`:** neuer Abschnitt `oberflaeche`. Stellen, die Kacheln anklicken, öffnen vorher das Menü (Aufrufe von `buildbarLayout()` etwa bei den Zeilen 312, 3330, 4678, 4723, 6312). Die `tap('Tab')`-Schleifen (933, 1591, 6311) brauchen einen Druck mehr, weil der erste Tab nur öffnet.
10. **Dokumente:** `CLAUDE.md` (Look-Regeln, Eingaben, Architektur), `DESIGN.md` 3.5, 6.6 und 7, `OFFENE-FRAGEN.md` (Platz des Funks, Reiter, Oberflächengröße).

**Fallstricke:** `renderVoxelPortrait` ist ein 2D-Canvas und liest die GPU nicht aus; `willReadFrequently` muss aber bleiben, sonst warnt der Browser, und die Prüfung scheitert. Klicks werden in `update()` ausgewertet, das Layout liefert `layout()`. Prüfstellen, die »Nochmal drücken…« als Meldung erwarten, müssen umgestellt werden. Die Prüfbilder zeigen oft Einführungszeilen von Edda; für ruhige Bilder hilft `funk.clear()`.

### 5.2 Prüfpunkte für `check.mjs`

1. Jede Kachel ist mindestens 48 × 56 groß, die Bildfläche mindestens 44 × 38, und das Bild nimmt mindestens 55 % der Kachel ein. `buildbarLayout()` liefert dafür `tile` und `pic`.
2. In Kacheln und Bauzettel werden keine `mini_`-Zeichen und keine 3 × 5-Ziffern für Preise gezeichnet. Das lässt sich über einen Zähler in `drawTiny` und `drawIcon` für den Bereich der Leiste prüfen.
3. Das Bild aus dem Modell hat mindestens 300 gefärbte Punkte. Der Kontrast zwischen Umriss und Bildgrund ist mindestens 3 : 1.
4. Im Bild `tag` ist das Menü zu, der Knopf ist höchstens 48 × 32 groß. Tab öffnet, Esc schließt. Q bei geschlossenem Menü öffnet »Türme« und beginnt das Setzen des Bolzenwerfers, E baut ihn, wie bisher.
5. Offen zeigt der Bauzettel den Namen der gewählten Kachel, auch nur mit der Tastatur (Q). Beim Setzen ist der Bauzettel zu, und am Geist stehen Preis und gegebenenfalls der Grund.
6. Alle Optionen sind erreichbar: »Leute« mit Lagerglocke und Funkturm hat sieben Möglichkeiten, der Funkturm ist über »weiter« zu bekommen.
7. `hud.layoutInfo()` liefert die gezeichneten Tafeln.
   - In `tag`, `bauen`, `horde`, `nachtplan`, `boss`, `champion` und `fullhd` überlappen sich keine zwei.
   - Im Tag gibt es höchstens fünf dauerhafte Tafeln.
   - Die Fläche aller Tafeln liegt bei höchstens 12 % am Tag, 24 % beim Bauen mit offenem Menü und 15 % in der Nacht.
8. Es sind höchstens zwei Meldungen gleichzeitig sichtbar. Alarme stehen in der Nachtleiste. »… bezahlbar« erzeugt keine Meldung mehr, sondern ein Funkeln am Knopf.
9. Der Plan steht in der Nachtleiste, rechts gibt es keine Plantafel mehr. Der Zeitraffer ist ein Zeichen in der Leiste.
10. Der Funk bedeckt höchstens 11 000 UI-px² und liegt unten links. Er überlappt weder die Schnellleiste noch das Menü. In einer Welle zeigt er höchstens zweizeilige Sprüche.
11. Die Schnellleiste reicht bis zum letzten belegten Platz. Fähigkeitenkacheln erscheinen erst ab der ersten Fähigkeit.
12. Die Oberflächengröße ergibt bei 1920 × 1080 540, 360 und 270 Zeilen, bei 1280 × 720 dreimal 360, mit Hinweis. Sie ist gespeichert, und bei 270 Zeilen gibt es keine Überlappung, weil das kompakte Menü greift.
13. Neue Bilder: `hud-tag`, `bau-menue`, `bau-setzen`, `bau-auswahl`, `hud-nacht`, `ui-klein` (540 Zeilen), `ui-gross` (270 Zeilen).

### 5.3 Meilensteine

| Meilenstein | Inhalt | Prüfpunkte |
|---|---|---|
| **H1 – Das neue Baumenü** (Kern der Beschwerde) | zu und offen mit Tab und Esc; Bilder aus den Modellen; Preise in der Hauptschrift; Bauzettel; Preis am Geist; Rückfrage auf der Kachel; Auswahl mit Vorher und Nachher; Kürzung behoben; »Helfer« und »Leute«; Edda kompakt unten links, damit sie nicht auf dem Menü liegt | 1–6, 10 |
| **H2 – Aufräumen** | Meldungen nach Art, höchstens zwei; Nachtleiste mit Plan und Alarmzeile; Zeitraffer als Zeichen; Überlappungen aus 1.5 beheben; Hauptschrift in den Balken | 8, 9 |
| **H3 – Zonen** | feste Rechtecke und freie Fläche für die Welt-Elemente; Vorrat und Ziel nur bei Bedarf; Schnellleiste und Fähigkeiten kompakt | 7, 11 |
| **H4 – Oberflächengröße** | die Einstellung; kompaktes Menü unter 300 Zeilen; Prüfung bei 540, 360, 318 und 270 Zeilen | 12 |
| **H5 – Reiter nach Zweck** (optional, nach Rückmeldung) | Türme (Q Bolzenwerfer, R Katapult, T Sprenger, G Laternenturm, C Barrikade) · Helfer · Fallen mit Moderlocke · Lager (Werkbank, Holzlager, Beet, Bank, Laternenpfahl) · Leute (Zelt, Schlafhütte, Hochsitz, Übungsplatz, Lagerglocke, Funkturm) · Zuhause (Ausbau, Reparieren) · Schmuck; »Figur« an die Werkbank; später vielleicht belegbare Schnellplätze wie in Against the Storm | neu festlegen |

Jeder Meilenstein bekommt den vollen Prüfablauf, neue Bilder, einen Eintrag in `PROGRESS.md`, einen Commit und das Artefakt.

---

## 6. Fragen an den Auftraggeber

1. Soll Edda **unten links** stehen, über Mikas Leiste? Oder bleibt sie unten rechts und wartet, solange das Baumenü offen ist?
2. Ist ein **zugeklapptes Baumenü als Standard** in Ordnung? Q und C öffnen es dann direkt, Tab öffnet es und wechselt die Reiter.
3. Der Vorrat zeigt **immer nur die Grundsorten**, Seltenes erscheint beim Bauen, beim Handeln oder bei einer Änderung. Passt das?
4. Sollen die **Reiter neu geordnet** werden (H5), und darf **»Figur« an die Werkbank** wandern?
5. Reicht die ganzzahlige **Oberflächengröße**? Oder sollen halbe Schritte ab Faktor 3 erlaubt werden?

---

## Quellen

**Grundlagen, Wahrnehmung, Barrierefreiheit**
- Fagerholt, E. & Lorentzon, M. (2009): *Beyond the HUD – User Interfaces for Increased Player Immersion in FPS Games*. https://www.semanticscholar.org/paper/Beyond-the-HUD-User-Interfaces-for-Increased-Player-Fagerholt-Lorentzon/16ee02a8839923752c6bc93f294bec67d73a586e
- Peacocke, M. u. a. (2018): *An empirical comparison of first-person shooter information displays: HUDs, diegetic displays, and spatial representations*. https://www.yorku.ca/mack/ec2018.pdf
- Xbox Accessibility Guideline 101 (Text Display): https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101
- Xbox Accessibility Guideline 102 (Contrast): https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102
- IGDA Game Accessibility SIG, Text size: https://igda-gasig.org/how/platform-level-accessibility-recommendations/text-size/
- Game Accessibility Guidelines, Default font size: https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/
- Nielsen Norman Group, Progressive Disclosure: https://www.nngroup.com/videos/progressive-disclosure/ · https://en.wikipedia.org/wiki/Progressive_disclosure
- Celia Hodent, *The Gamer's Brain*: https://celiahodent.com/video-game-ux-psychology/ · Zusammenfassung der Säulen: https://medium.com/design-bootcamp/finding-a-framework-for-ux-in-gaming-key-takeaways-for-understanding-usability-in-celia-hodents-9c0fcfee85f7
- Eye-Tracking: *Strategic Gaze* (2026): https://arxiv.org/html/2607.17151v1 · *Visual Attention and Gaze Behavior in Games*: https://www.researchgate.net/publication/256109747_Visual_Attention_and_Gaze_Behavior_in_Games_An_Object-Based_Approach
- Kritik an Eck-Anzeigen: https://www.gamedeveloper.com/design/my-personal-crusade-against-mini-maps-and-other-corner-based-hud-elements-in-immersive-games-
- Rangfolge und Anzeigen nach Lage: https://rocketbrush.com/blog/designing-practical-and-pretty-hud-in-video-games
- Callahan u. a. (1988): *An empirical comparison of pie vs. linear menus*. https://www.semanticscholar.org/paper/An-empirical-comparison-of-pie-vs.-linear-menus-Callahan-Hopkins/be639190844c2f0654563db3d0a7f166811dd645
- Klickflächen, Fitts und WCAG: https://ishadeed.com/article/target-size/
- Pixel-Art-Größen, 16 gegen 32: https://www.pixelbook.io/blog/pixel-art-sprite-sizes-explained
- Lars Doucet, *Optimizing Tower Defense for FOCUS and THINKING*: https://www.fortressofdoors.com/optimizing-tower-defense-for-focus-and-thinking-defenders-quest/

**Vorbilder**
- Thronefall: https://www.gamedeveloper.com/design/mastering-minimalism-and-layering-complexity-with-strategy-game-thronefall · UI-Größe: https://steamdeckhq.com/news/thronefall-gets-scalable-ui-for-steam-deck/ · https://steamcommunity.com/app/2239150/discussions/0/3807280091545043407/ · Bauen: https://steamcommunity.com/sharedfiles/filedetails/?id=3016836199
- Kingdom Two Crowns: https://medium.com/@kinga.olszewska/how-a-game-that-has-almost-no-hud-elements-engaged-a-ux-ui-designer-for-hours-45d71184205f · https://www.gamedeveloper.com/design/-i-kingdom-two-crowns-i-and-the-practical-intersection-of-pixel-art-and-roguelike-design
- Kingdom Rush: https://emilym.space/thumbelina-hurts-mobile-ui-blog/2018/6/26/kingdom-rush-a-tower-defense-trilogy-with-ui-design-approaching-perfection-and-entertainment-worth-missing-bedtime-for · UI-Größe in Vengeance: https://steamcommunity.com/app/1367550/discussions/2/4835136555201574233/
- Bloons TD 6, Tastenkürzel: https://www.bloonswiki.com/Hotkey
- Dome Keeper: https://domekeeper.wiki.gg/wiki/General_Upgrades
- Bad North: https://www.nintendo.com/en-gb/News/2018/April/Interview-Taking-on-hordes-of-invading-Vikings-in-Bad-North-1368315.html · https://interfaceingame.com/games/bad-north/
- Dorfromantik: https://80.lv/articles/how-dorfromantik-expands-its-cozy-world-through-minimalist-design · https://www.gameuidatabase.com/gameData.php?id=706
- Stardew Valley: https://en.wikibooks.org/wiki/Stardew_Valley/Controls · UI-Größe seit 1.5: https://stardewvalleywiki.com/Modding:Migrate_to_Stardew_Valley_1.5
- Don't Starve: https://dontstarve.wiki.gg/wiki/Crafting
- RimWorld: https://rimworldwiki.com/wiki/Architect
- Mindustry: https://steamcommunity.com/sharedfiles/filedetails/?id=1916885300
- They Are Billions: https://github.com/ryuyandev/theyarebillions-hotkeys/blob/master/hotkey_reference.md
- Frostpunk: https://frostpunk-archive.fandom.com/wiki/Tutorial
- Against the Storm: https://wiki.hoodedhorse.com/Against_the_Storm/List_of_Keybindings · https://www.player.one/against-storm-quality-life-update-has-ton-noteworthy-features-156377
- Timberborn: https://timberborn.wiki.gg/wiki/User_Interface/Toolbar
- Sammlungen zum Nachschlagen beim Umsetzen: Game UI Database (https://www.gameuidatabase.com/), Interface In Game (https://interfaceingame.com/)
