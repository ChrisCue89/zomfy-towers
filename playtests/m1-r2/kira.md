# Kira – m1-r2

Kontrollrunde nach der Nachbesserung. Eine Sitzung mit rund 80 Brückenbefehlen,
Tag 1 bis Tag 4, zweimal „Neues Spiel“, 11-mal neu geladen. Die Konsole war bei
jeder Abfrage (rund 20-mal) leer.

## Was Spaß gemacht hat

- **Das Pausenmenü ist jetzt schwer kaputtzukriegen.** Ich wollte den Spielstand aus
  Versehen löschen: Klick sofort nach dem Öffnen, Doppel- und Dreifachklicks,
  doppeltes Enter, Klicks auf den Rand von „Zurück“, der mit „Neues Spiel“
  überlappt. Nichts davon hat geklappt. Die Rückfrage hat „Lieber nicht“
  vorgewählt, Esc führt zurück, und Folgeklicks direkt nach einem Seitenwechsel
  werden verschluckt. Genau so soll es sein.
- **Dialoge tun, was man sieht.** E, Enter und Leertaste haben in allen Versuchen
  die sichtbar markierte Antwort bestätigt, auch wenn die Maus über der anderen
  Antwort lag oder ich zwischen Tastatur und Maus gewechselt habe. Eine ruhende
  Maus nimmt die Auswahl nicht weg, nur eine Bewegung tut das. Ein Klick auf eine
  Antwort bestätigt sie, und W/S springen am Rand auf die andere Seite.
- **Neuladen ist langweilig im besten Sinn.** Im Schlaf, beim Ausruhen, in
  Dialogen, im Menü und direkt nach „Neues Spiel“ ging nie mehr verloren als ein
  angefangener Schlaf. „Willkommen zurück!“ ist ein netter Empfang.
- **Fenstergrößen im Querformat** (1003 × 611, 300 × 170, 1280 × 720): Die Pixel
  sind immer scharf und ganzzahlig skaliert, und die Klickflächen im Menü stimmen
  auch nach dem Größenwechsel.
- Die Nacht mit Lagerfeuer, hellem Fenster und Laternenschein ist wirklich
  gemütlich.

## Wo ich hängen blieb oder mich gelangweilt habe

- Festgehangen habe ich nirgends. Ofen, Feuerstelle, die Kiste neben dem Feuer und
  die Hauswände blockieren sauber. Wenn ich mit Umschalt gegen Wände und in Ecken
  renne, rutscht die Figur weder durch noch klemmt sie fest.
- Gewundert habe ich mich über das Bett: Direkt nach dem Aufwachen bietet es kein
  „Schlafen“ an. Ich stand eine Weile davor und dachte, ich stehe falsch (siehe F6).

## Was unklar war

- In den ersten ~0,2 s nach dem Erscheinen der Antworten wird ein Tastendruck
  kommentarlos verschluckt. Einmal ging ein Enter ins Leere, der zweite griff. Das
  ist wohl ein Schutz gegen Durchdrücken, man sieht die Sperre aber nicht. Ein
  Mensch merkt das kaum, ich erwähne es nur, damit es bekannt ist.
- „Vollbild“ reagiert ohne Fehlermeldung. Ob der Browser wirklich ins Vollbild
  wechselt, konnte ich in meiner Testumgebung nicht sehen.
- Schnellleiste: Beim Start ist Platz 2 gewählt, obwohl die Laterne auf Platz 1
  liegt. F springt auf Platz 1, beim Wegstecken wieder auf 2. Das stört nicht,
  wirkt aber zufällig.
- Enter benutzt im Spiel auch Dinge (der Sessel-Dialog ging mit Enter auf). Die
  Steuerungsseite nennt nur „E / Leertaste“.
- Während Titelbild und Einblenden nach dem Laden (etwa 1,5 s fast schwarz) kann
  man schon laufen. Ich bin 2 m im Dunkeln gegangen. Harmlos.

## Fehler

### F1: Schnelles Drücken überspringt ungewollt einen halben oder ganzen Tag (Schwere: Spielfluss)
- Schritte: Morgens am Lagerfeuer („Ins Feuer schauen“) fünfmal schnell E drücken.
  Dasselbe am Bett tagsüber („Schlafen“). Der Sessel („Hinsetzen“) hat dieselbe
  Vorwahl.
- Erwartet: Beim Durchdrücken bleibt die Frage stehen, oder die harmlose Antwort
  greift („Weitermachen“ / „Noch nicht.“), so wie bei „Neues Spiel“, wo „Lieber
  nicht“ vorgewählt ist. / Passiert: Vorgewählt ist jeweils die Antwort mit dem
  Zeitsprung („Bis zum Abend ausruhen“, „Ja, bis morgen.“, „Bis in die Nacht sitzen
  bleiben“). Die Schutzsperre dauert nur ~0,2 s, der 5. Druck bestätigt. Am Feuer
  springt die Uhr von 06:54 auf 18:30, am Bett von Tag 3, 06:35 auf Tag 4, 06:30.
  E heißt auch „weiter“ im Dialog. Wer also E drückt, um Text zu überspringen,
  verliert den Tag, ohne die Frage gelesen zu haben. Im Moment hat das keine
  Folgen, sobald es Sammeln und Bauen gibt, wird es ärgerlich.
- Vorschlag: die harmlose Antwort vorwählen oder die Antworten erst nach ~0,5 s
  sichtbar freischalten.
- Screenshot: kira/feuer-vorwahl.png

### F2: Im Hochformat verdeckt der Vorrat Tag und Uhrzeit (Schwere: Feinschliff)
- Schritte: Fenster auf 360 × 640 stellen (Handy hochkant).
- Erwartet: Uhr oben links und Vorrat oben rechts liegen nebeneinander. Laut
  DESIGN.md 3.5 überdecken sich HUD-Teile nie. / Passiert: Die Vorratsleiste liegt
  über der Uhr, von „Tag 2“ und „21:36 · Nacht“ ist nur noch die untere Hälfte zu
  sehen. Die Schnellleiste füllt die ganze Breite, Platz 8 stößt an den Rand. Im
  Pausenmenü reicht die Zeile „Meilenstein 1 – Fundament und Look“ bis an beide
  Ränder. Querformat-Fenster sind in Ordnung, auch 300 × 170.
- Screenshot: kira/hochformat-hud.png

### F3: Figur steht optisch mitten im Lagerfeuer (Schwere: Feinschliff)
- Schritte: Von Süden auf die Feuerstelle zulaufen oder an ihrer Südkante entlang.
- Erwartet: Die Figur bleibt am Steinkreis stehen. / Passiert: Sie wird erst kurz
  vor der Flamme gestoppt. Sie steht auf den Steinen und verdeckt das Feuer, die
  Flammen züngeln links und rechts neben dem Kopf. An der Südkante kann man quer
  über den Steinkreis laufen. Mika wärmt sich die Füße, und zwar wörtlich.
- Screenshot: kira/figur-im-feuer.png

### F4: Ladehinweis in Systemschrift liegt über Titelbild und Spiel (Schwere: Feinschliff)
- Schritte: Neu laden und das erste Bild ansehen. Noch deutlicher: „Neues Spiel“ →
  „Ja, neu beginnen“ → sofort neu laden.
- Erwartet: Nur Pixelschrift. Der Ladehinweis ist weg, sobald das Titelbild kommt.
  / Passiert: „Zomfy Towers wird geladen …“ steht in glatter, nicht pixeliger
  Schrift quer über dem Titel „Zomfy Towers / Tag 2“, also zwei Schriften
  übereinander. Einmal stand der Hinweis 2,5 s Spielzeit nach dem Laden noch
  mitten über der laufenden Szene, nach ~5 s war er weg.
- Screenshot: kira/ladehinweis-titel.png, kira/ladehinweis-spiel.png

### F5: Neuladen während der Einführung, danach kommt sie nie wieder (Schwere: Feinschliff)
- Schritte: „Neues Spiel“ → „Ja“, dann während des Titelbilds oder mitten im
  Einführungsdialog („Eine Lichtung, eine Hütte …“) neu laden.
- Erwartet: Die Einführung startet erneut, solange sie nicht zu Ende gelesen ist.
  / Passiert: Nach dem Laden kommt nur „Willkommen zurück!“, keine Einführung.
  Auch die Tastenzeile „WASD laufen · E benutzen · F Laterne · Esc Menü“ über der
  Schnellleiste war nach dem Neuladen nicht mehr da (vorher schon). Wer beim
  ersten Start zu früh neu lädt, bekommt weder die Geschichte noch die Tastenhilfe.

### F6: Schlafsperre nach dem Aufwachen fällt durch Neuladen weg (Schwere: Feinschliff)
- Schritte: Schlafen, am Morgen den Dialog schließen und vor dem Bett stehen
  bleiben (mehrere Positionen und Blickrichtungen probiert). Dann neu laden.
- Erwartet: Ein einheitliches Verhalten, mit oder ohne Neuladen. / Passiert: Ohne
  Neuladen gibt es keinen „Schlafen“-Hinweis, und nichts erklärt das. Nach dem
  Neuladen ist „Schlafen“ an derselben Stelle sofort wieder da. Zusammen mit F1
  habe ich so an Tag 3 direkt nach dem Neuladen mit fünfmal E bis Tag 4
  durchgeschlafen.

### F7: Dialog sagt „(Taste F)“, aber F wirkt im Dialog nicht, Esc gar nicht (Schwere: Feinschliff)
- Schritte: Abends nach dem Ausruhen erscheint „Es wird dunkel. Mit der Laterne
  sehe ich mehr. (Taste F)“. Jetzt F drücken, dann Esc.
- Erwartet: F schaltet die Laterne (und schließt den Dialog), Esc schließt den
  Dialog oder öffnet das Menü. / Passiert: Beide Tasten tun nichts. Erst E
  schließt den Dialog, danach geht F. Kein Absturz, aber wer der Aufforderung
  folgt, drückt ins Leere.

## Checkliste

- Tag ruhig genug zum Bauen? – noch nicht im Spiel (kein Bauen). Ruhig ist der Tag,
  aber man verliert ihn leicht aus Versehen (F1).
- Nächte mit Action? – noch nicht im Spiel.
- Aufrüsten lohnend? – noch nicht im Spiel.
- Schwierigkeit gleichmäßig und fair? – noch nicht im Spiel.
- Look passt zu DESIGN.md? – Ja. Die Pixel sind in allen Fenstergrößen scharf.
  Morgen frisch, Abend golden, Nacht blau mit warmen Lichtinseln (Feuer, Fenster,
  Laterne), dazu Umrisse und Dithering. Ausreißer: der Ladehinweis in Systemschrift
  (F4), die Figur im Feuer (F3) und das HUD im Hochformat (F2).
- Pausenmenü, Spielstand aus Versehen löschbar? – Nein. Ein Klick sofort nach dem
  Öffnen markiert nur. Doppel- und Dreifachklicks und doppeltes Enter landen bei
  „Lieber nicht“ oder werden verschluckt. Die Rückfrage hat „Lieber nicht“
  vorgewählt, Esc führt zurück. Wer per Pfeil „Ja“ wählt und dann die Maus auf
  „Lieber nicht“ schiebt, bekommt mit der Leertaste „Lieber nicht“, also die
  sichtbar markierte Antwort (Screenshot: kira/rueckfrage-vorwahl.png).
- „Steuerung“ und „Vollbild“ sauber erreichbar? – Ja, per Maus, Pfeiltasten und
  W/S mit Enter/Leertaste, auch nach einem Größenwechsel. Esc führt von der
  Steuerungsseite zurück ins Hauptmenü. „Neues Spiel“ → „Ja“ setzt wirklich
  zurück, und nach einem Neuladen bleibt es zurückgesetzt.
- Bestätigen E, Enter und Leertaste die sichtbar markierte Antwort? – Ja, in allen
  Versuchen (Bett, Feuer, Sessel, Rückfrage), auch bei ruhender Maus. Beim
  schnellen Durchdrücken greift allerdings die vorgewählte Antwort mit dem
  Zeitsprung (F1).
- Fortschritt verloren beim Neuladen? – Nein. Im Schlaf vor dem Tageswechsel steht
  man danach wieder am Bett (nur der Schlaf ist weg), nach dem Wechsel ist der
  neue Tag gespeichert. Beim Ausruhen blieb 18:30 erhalten. In Dialogen und im
  Menü ging nichts verloren. Einzige Ausnahme ist die Einführung (F5).
- Tastenspam? – Esc-Spam schaltet sauber um (ungerade Anzahl = Menü offen). E,
  Leertaste, F, Ziffern und Esc werden beim Ausruhen ignoriert. Das Mausrad wirkt
  im Menü nicht auf die Schnellleiste.
- Konsolenmeldungen? – Keine, bei allen Abfragen, auch nach Vollbild,
  Größenwechsel und Neuladen.

## Gesamturteil (1–10) und wichtigster Wunsch

**8/10.** Die Stellen, die letzte Runde auffällig waren, halten jetzt: Ich habe
keinen Weg gefunden, den Spielstand aus Versehen zu löschen, Antworten gehorchen
der Markierung, und Neuladen kostet nie echten Fortschritt. Übrig bleiben
Randfälle und kleine Darstellungsfehler.

**Wichtigster Wunsch:** In den Dialogen mit Zeitsprung (Feuer, Sessel, Bett am Tag)
die harmlose Antwort vorwählen, wie bei „Neues Spiel“. Wer auf E hämmert, soll
nicht aus Versehen einen ganzen Tag verlieren.
