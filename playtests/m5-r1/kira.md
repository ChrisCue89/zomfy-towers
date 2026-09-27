# Kira – m5-r1

Testziel: gezielt versuchen, den neuen Detailgrad (Meilenstein 5) und den
Nahkampf (Meilenstein 4) kaputtzumachen – Fenstergrößen, Klickgenauigkeit,
Klick-Spam, Ausweichen mitten im Schwung, Stufenaufstieg im Getümmel,
Neuladen in jeder Lage. Rund 135 Bücken-Befehle, Konsole nach fast jeder
größeren Aktion geprüft.

## Was Spaß gemacht hat

- Der Sprung von 40 auf 80 Pixel pro Meter ist sofort sichtbar und wirkt
  richtig gut: Mikas Mütze, die Fensterläden, das Streifenmuster der
  Markise, die Bettdecke im Haus – alles hat jetzt echte Kanten statt
  grober Klötze. Bei Full HD (1920×1080) sieht die Szene aus wie ein
  Diorama, genau wie in DESIGN.md versprochen.
- Nachts ist es wirklich stimmungsvoll: tiefes Blau, aber jedes warme
  Fenster, das Lagerfeuer und sogar die Türme stechen sofort heraus. Ein
  Schlurfer, der hinter dem Vordach verschwindet, taucht als lavendelfarbene
  gerasterte Silhouette wieder auf, Mika selbst als goldener/weißer
  Rasterumriss unterm eigenen Vordach – genau wie in Abschnitt 3.6
  beschrieben, und ich habe es mehrfach live gesehen.
- Die Randmarken sind durchdacht: Pfeile mit Anzahl für Schlurfer außerhalb
  des Bildes, eigene Rauten-Marken für liegen gebliebene Beute
  („beute links oben (2)“), alles sauber getrennt von den Schlurfer-Pfeilen.
- Kampf-Feedback: Schadenszahlen („12“) erscheinen exakt über dem
  getroffenen Schlurfer, Rückstoß/Kippen bei Treffern ist gut zu sehen, die
  Ausweichrolle hat mich mitten aus einer Zwei-gegen-eins-Situation
  rausgezogen, ohne dass ich Schaden bekommen habe.
- Sehr angenehme Kleinigkeit: Der Stufenaufstieg unterbricht den Kampf
  NICHT sofort. Es kam die Meldung „Perk-Wahl, sobald es ruhig ist“, und
  die eigentliche Auswahl (mit Dithering-Abblende) kam erst, als kein
  Schlurfer mehr im Bild war. Das fühlt sich fair an und nicht wie ein
  genervtes Rausreißen aus dem Gefecht.
- Ich habe absichtlich chaotisch gespielt (Reload mitten in der Welle,
  Menü mitten im Gefecht, Schlafen-Versuch vor der Nacht, Fenstergröße
  wild wechseln) – die Konsole blieb bei jedem einzelnen Check leer. Kein
  einziger Fehler oder Warnung in der ganzen Sitzung.

## Wo ich hängen blieb oder mich gelangweilt habe

- Ich bin ziemlich lange durch die Lichtung gelaufen, um überhaupt Schrott
  für einen ersten Turm zu finden (Autowrack und Schrotthaufen liegen
  ordentlich weit auseinander). Das ist kein Bug, aber als "Ich will kaputt
  machen"-Spielerin hat mich das genervt, weil ich lieber früher in den
  Nahkampf und in die Fenstergrößen-Tests wollte.
- Zweimal bin ich beim Verlassen des Hauses in einer Möbelecke komplett
  hängen geblieben (siehe F1) – das hat mich am meisten aufgehalten.

## Was unklar war

- Bei einer durchs Dach verdeckt dargestellten (lavendel/goldenen)
  Silhouette kann ich nicht erkennen, ob das Ziel gerade in Schlagreichweite
  ist oder noch mehrere Meter entfernt – mehrere Klicks ins Leere, weil ich
  die Tiefe falsch eingeschätzt habe (siehe F3).

## Fehler

### F1: Kollisionsecken im Innenraum blockieren 3 von 4 Richtungen (Schwere: Spielfluss)
- Schritte: Nach dem Schlafen/Verlust-Zwischensequenz steht Mika im Haus.
  An zwei verschiedenen Stellen (einmal neben dem Ofen/Regal, einmal neben
  Bett/Truhe) WASD in Richtung „hinaus“ und „zur Seite“ halten.
- Erwartet: Mika weicht der Möbelkante aus oder rutscht daran entlang.
- Passiert: An beiden Stellen waren W, A und S gleichzeitig komplett
  wirkungslos (Position blieb über mehrere Befehle exakt gleich), nur eine
  einzelne Richtung (einmal Osten, einmal Norden) hat sie wieder befreit.
  Für einen Spieler, der nicht systematisch alle vier Tasten einzeln
  durchprobiert, fühlt sich das wie ein Hänger an.
- Screenshot: kira/03-tag-schlurfer-silhouette.png (zeigt die Ecke außen,
  nicht den Stuck-Moment selbst, aber die enge Möblierung nahe der Tür).

### F2: Sehr schmale Fenster schneiden HUD und Bauleiste ab, statt umzubrechen (Schwere: Spielfluss)
- Schritte: `resize 320 900` (oder `350 700`) sowohl im Dialog als auch
  mitten im nächtlichen Gefecht.
- Erwartet: Panels und Bauleiste verkleinern sich oder brechen um, bleiben
  aber vollständig sichtbar und klickbar (wie bei 1024×768 oder 1600×300,
  die beide sauber skalieren).
- Passiert: Das Ziel-Banner wird hart am rechten Rand abgeschnitten
  („…ohne dass das Zuhause fällt“ → „…ohne dass da“), das Dialogfenster
  verliert Text rechts, und in der Bauleiste rutschen die Kacheln Q und R
  komplett aus dem sichtbaren Bereich – kein Scroll-Hinweis, keine
  Anzeige, dass dort noch etwas ist. Per Maus sind Bolzenwerfer und
  Kürbiskatapult in diesem Fenster schlicht nicht anklickbar. Die
  Tastenkürzel Q/R funktionieren zum Glück weiterhin (geprüft: `Q` hat
  trotzdem korrekt „Gibt es schon“ gemeldet), Mausspieler wären aber
  aufgeschmissen.
- Screenshot: kira/02-bug-dialog-schmal.png (Dialog bei 320×900),
  kira/06-bug-kampf-schmal.png (Kampf bei 350×700, Bauleiste unten links
  abgeschnitten, Perk-Hinweistext ebenfalls).

### F3: Tiefe von verdeckten (Raster-Silhouette) Zielen schwer einschätzbar (Schwere: Feinschliff)
- Schritte: Nachts auf einen lavendelfarbenen Rasterumriss hinter einem
  Dach oder Baumkrone klicken.
- Erwartet: Klar erkennbar, ob das Ziel in Reichweite ist.
- Passiert: Mehrere Angriffe ins Leere, weil die Silhouette optisch näher
  wirkt, als die Figur tatsächlich ist (reine Wahrnehmungssache der
  schrägen Kamera, kein harter Fehler – aber jetzt, wo Silhouetten neu
  eingeführt wurden, fällt es stärker auf als vorher).

## Checkliste

- Tag ruhig genug zum Bauen? – Ja, kein Druck, ein, zwei Streuner tauchten
  auf, ließen sich in aller Ruhe erledigen.
- Nächte mit Action? – Sehr. Ab Nacht 3 kamen Wellen aus zwei Richtungen
  gleichzeitig („Nordwesten und Osten“) mit eigener Meldung, welche Wand
  betroffen ist.
- Aufrüsten lohnend? – Nicht abschließend geprüft (ich habe absichtlich nur
  einen Turm gebaut, um schneller in den Nahkampf-Stresstest zu kommen);
  der eine Bolzenwerfer + ein Perk hat spürbar geholfen, aber ich habe die
  Nacht trotzdem zweimal verloren, weil ich kaum verteidigt habe – das ist
  laut DESIGN.md so gewollt („ohne Ausbau kippt es“), keine Balance-Aussage
  von mir.
- Schwierigkeit gleichmäßig und fair? – Verlorene Nacht hat exakt wie
  beschrieben reagiert: ein Viertel Schrott weg, Zuhause auf ein Viertel
  geflickt, Morgenbericht mit allen Details, nie Spielstand-Verlust.
- Look passt zu DESIGN.md? – Ja, sehr genau: 80 px/m, Palette, warme
  Lichtinseln gegen kühle Nacht, Dithering bei jeder Abblende (Menü, Schlaf,
  Perk-Wahl) statt weichem Fade.
- Erkennt man, was was ist (Figur, Schlurfer-Arten, Türme und Stufen,
  Werkzeuge/Waffen, Loot) – bei Tag und bei Nacht? – Figur und Standard-
  Schlurfer ja, bei Tag und Nacht klar unterscheidbar (Nachts zusätzlich
  Eigenlicht). Ich habe nur eine Turmart in Stufe 1 gesehen (Bolzenwerfer,
  klare Kreuzarmbrust-Silhouette) und keine anderen Waffen als die
  Start-Axt gebaut – andere Schlurfer-Arten, Turmstufen und Waffen konnte
  ich in dieser Runde nicht vergleichen.
- Wirkt die Welt lebendig (Animationen, Wind, Wäsche, Türme)? – Glühwürmchen/
  Funkeln an Blumenkästen und Loot gesehen, Treffer-Kippanimation der
  Schlurfer und Mikas Schlagbewegung sind da. Wind in Gras/Wäsche habe ich
  nicht gezielt lange genug beobachtet, um es sicher zu beurteilen (war die
  meiste Zeit in Bewegung oder im Kampf).
- Passen Oberfläche und Szene zusammen, ist alles lesbar? – Bei normalen und
  großen Fenstern (640×360 bis 2560×1440) ja, durchweg sauber, nichts
  überdeckt sich. Bei sehr schmalen Fenstern nein, siehe F2.
- Läuft es flüssig? – Lässt sich im Headless-Softwarerender nicht seriös
  beurteilen (siehe Hinweis in CLAUDE.md); die Simulation selbst wirkte
  während aller Tests reaktionsschnell, keine hängenden Zustände außer F1.
- Fühlen sich Treffen, Ausweichen und Aufwerten gut an? – Ja. Treffer haben
  klares Feedback (Zahl, Kippen), die Rolle hat mich sauber aus Gefahr
  gezogen, und der aufgeschobene Perk-Bildschirm mitten im Kampf fühlte
  sich clever statt nervig an.

## Gesamturteil (1–10) und wichtigster Wunsch

**8/10.** Für eine Runde, in der ich ausschließlich versucht habe, alles zu
brechen, ist das ein bemerkenswert stabiler Stand: keine einzige
Konsolenmeldung, kein Absturz, kein kaputter Spielstand, sauberes Reload
mitten in der Nacht. Die zwei echten Funde (schmale Fenster schneiden
Bauleiste/HUD ab; Möbelecken blockieren kurzzeitig alle Laufrichtungen)
sind beides Randfälle, aber genau die Art von Rand, die ich prüfen sollte.

**Wichtigster Wunsch:** Die Bauleiste (und das Ziel-Banner) sollten bei
sehr schmalen Fensterbreiten umbrechen oder verkleinern statt Kacheln
komplett aus dem Bild zu schieben – sonst verliert ein Mausspieler dort
kommentarlos den Zugriff auf einzelne Türme.
