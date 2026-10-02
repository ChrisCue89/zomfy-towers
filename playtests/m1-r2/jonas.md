# Jonas – m1-r2

*Rundenziel: einen Tag bis zum Schlafen durchspielen, so schnell und ungeduldig
wie möglich, jeden Dialog sofort wegdrücken. Gespielt habe ich Tag 1 bis zum
Morgen von Tag 4, mit 67 Brücken-Befehlen und zwei Neuladungen. Die Konsole
blieb die ganze Zeit leer.*

## Was Spaß gemacht hat

- **Laufen fühlt sich direkt an**, nichts zieht nach. Shift ist Sprint und
  deutlich schneller (etwa 2,9 statt 4,9 m/s). Halte ich während des
  Ausruhens eine Taste gedrückt, läuft die Figur los, sobald es weitergeht.
- **F bringt sofort „Laterne an“**, und nachts ist der warme Lichtkreis um die
  Figur richtig stark. Die Nacht am Feuer ist tiefblau, Feuer und Fenster
  leuchten als warme Inseln, der Abend ist golden und im Morgengrauen brennt
  die Lichterkette. Sieht einfach gut aus.
- **Dialoge wegdrücken ist jetzt berechenbar.** Der erste Druck tippt die
  Zeile fertig, der zweite geht weiter. Das gilt für E, Leertaste, Enter und
  Klick gleichermaßen, und ich sehe jedes Mal, dass etwas passiert ist. Das
  Intro mit drei Zeilen war nach sechs Drücken weg.
- **Nachts am Bett reicht E, und ich schlafe, ohne Rückfrage.** Genau so will
  ich das.
- **Keine Schlaf-Schleife nach dem Aufwachen.** Nach dem Morgendialog kann ich
  E weiterhämmern, ohne wieder im Bett zu landen. Der Hinweis „Schlafen“
  kommt erst zurück, wenn ich kurz weg war.
- Im Pausemenü ist „Weiter spielen“ vorausgewählt, Enter hämmern schadet dort
  nicht.
- Nach dem Neuladen stand ich genau da, wo ich vorher war, und die Uhrzeit
  stimmte auch.

## Wo ich hängen blieb oder mich gelangweilt habe

- **Ich habe mehrmals ungewollt geschlafen oder ausgeruht**, nur weil ich E
  gehämmert habe (F1, F2). Von Tag 1 habe ich ganze 45 Spielminuten gesehen,
  Tag 3 war nach vier Minuten vorbei.
- **Jeden Morgen hält mich ein Satz von Mika fest** (F3). Davor liegt rund
  3 s lang eine schwarze Karte „Tag N“, die sich nicht wegdrücken lässt.
- **Die Tür habe ich nicht getroffen.** Den Weg geradeaus hoch klebe ich unter
  dem Vordach an der Wand fest. Die Tür liegt ein Stück weiter links und das
  Vordach verdeckt sie (F6).
- Rechts vom Haus, auf dem Weg zum Feuer, bleibe ich zweimal am selben kleinen
  Holzzaun hängen. Die Figur steht einfach, statt vorbeizurutschen (F10).
- Im Wald rechts stoße ich auf eine unsichtbare Wand, ohne jeden Hinweis
  (F10).
- **Ab etwa Minute 2 wird es langweilig.** Ich kann nur „ansehen“: Ofen,
  Radio, Auto und Feuer. Der Vorrat bleibt bei 4 Holz und 2 Stein, es gibt
  nichts aufzuheben und nichts zu hauen, und die Reifenschaukel reagiert
  nicht. Das Auto sagt „wenn ich Werkzeug habe“ – ja, bitte! Ohne Ausruhen
  dauert der Tag rund 7 Minuten in Echtzeit, die würde ich nur mit Rumrennen
  verbringen.

## Was unklar war

- „Ins Feuer schauen“ klingt nach bloßem Gucken. Dass dahinter „Bis zum Abend
  ausruhen“ steckt und sogar vorausgewählt ist, merkt man erst, wenn es zu
  spät ist.
- Der Laternen-Tipp („Mit der Laterne sehe ich mehr. (Taste F)“) kommt als
  Dialog, sobald es dunkel wird, und ich klicke ihn ungelesen weg. F habe ich
  nur zufällig vorher schon gefunden. Die Tastenzeile unten („WASD laufen · E
  benutzen · F Laterne · Esc Menü“) ist nach kurzer Zeit verschwunden.
- Leertaste und Enter sind ebenfalls „benutzen“ und öffnen Ofen, Bett oder
  Feuer, statt nur im Dialog weiterzuschalten. Ein Klick öffnet dagegen nie
  etwas.
- Beim Start habe ich kurz die Steuerung, die Figur läuft ein paar
  Zentimeter, dann reißt mich der Intro-Dialog heraus (F5).

## Fehler

### F1: Früh schlafen: „Ja“ ist vorausgewählt, Hämmern bestätigt (Schwere: Spielfluss)
- Schritte: Tag 1 um 07:45 am Bett E hämmern, etwa alle 150 ms, oder einfach
  sechsmal schnell E tippen.
- Erwartet: Bei „Jetzt schon schlafen? Draußen ist es noch hell.“ ist „Noch
  nicht.“ vorausgewählt, und Hämmern schließt die Frage höchstens. / Passiert:
  „Ja, bis morgen.“ ist vorausgewählt. Die Sperre schluckt nur Drücke in den
  ersten 0,2 bis 0,3 s nach Erscheinen der Antworten, der nächste Druck
  bestätigt: Ich schlafe, der Tag ist weg. Das ist mir zweimal passiert, an
  Tag 1 um 07:45 und an Tag 3 um 06:34 (sechs schnelle Taps). In
  Meilenstein 1 kostet das nichts, später kostet es einen ganzen Bau-Tag.
- Screenshot: jonas/02-frueh-schlafen-ja-vorausgewaehlt.png

### F2: Lagerfeuer: „Bis zum Abend ausruhen“ ist vorausgewählt (Schwere: Spielfluss)
- Schritte: Tag 2 um 06:44, Hinweis „Ins Feuer schauen“, viermal E im
  Abstand von 150 ms.
- Erwartet: Ich schaue ins Feuer, lese einen Satz und spiele weiter. Ausruhen
  nur, wenn ich es selbst aussuche. / Passiert: Der erste Druck öffnet, der
  zweite tippt fertig, der dritte wird geschluckt, der vierte bestätigt „Bis
  zum Abend ausruhen“, und es ist 18:30 statt 06:44. Abends ist „Bis in die
  Nacht sitzen bleiben“ vorausgewählt, dort passiert dasselbe. Nachts gibt es
  nur den Satz und keine Auswahl.
- Screenshot: jonas/03-feuer-ausruhen-figur-im-ring.png

### F3: Jeden Morgen hält mich ein Dialog fest (Schwere: Spielfluss)
- Schritte: Schlafen, egal zu welcher Uhrzeit, und danach S gedrückt halten.
- Erwartet: Nach der Karte „Tag N“ sofort loslaufen. / Passiert: Erst kommen
  rund 3 s schwarze Karte (2,5 bis 3,7 s gemessen), gegen die E, Leertaste,
  Enter und Klick nichts ausrichten. Danach erscheint jeden Morgen ein Satz
  von Mika im Dialogfenster („Die Vögel sind schon wach. Dann wohl ich auch.“,
  „Ein neuer Tag. Die Hütte steht noch. …“, „Guten Morgen, Lichtung.“). Die
  gehaltene S-Taste bewegt nichts, erst nach ein bis zwei Drücken geht es
  los. Nach dem Ausruhen gibt es dagegen keinen Dialog, da laufe ich sofort
  los. Nach „Bis in die Nacht sitzen bleiben“ hält mich allerdings der
  Laternen-Dialog fest.
- Wunsch: Den Morgensatz als Sprechblase oder Meldung zeigen, die mich laufen
  lässt, oder ihn durch Loslaufen schließen.
- Screenshot: jonas/04-aufwach-dialog.png

### F4: Drücke in der Antwort-Sperre verpuffen unsichtbar (Schwere: Feinschliff)
- Schritte: Einen Dialog mit Antworten öffnen (Bett am Morgen oder
  Lagerfeuer) und gleich nach dem Fertigtippen E drücken.
- Erwartet: Entweder passiert etwas, oder ich sehe, dass die Antworten noch
  nicht wählbar sind. / Passiert: Der Druck tut nichts, und das
  Dialogfenster sieht in der Sperrzeit genauso aus wie danach (im
  Bildvergleich pixelgleich). Das fühlt sich verschluckt an. Mit einer
  sicheren Vorauswahl (F1, F2) bräuchte es die Sperre kaum noch.
- Screenshot: –

### F5: Der Intro-Dialog reißt mich aus dem Loslaufen (Schwere: Feinschliff)
- Schritte: Neues Spiel starten und W halten, während nach der Titelkarte
  „Zomfy Towers – Tag 1“ das Bild einblendet.
- Erwartet: Entweder kommt erst der Dialog und dann die Steuerung, oder ich
  bekomme die Steuerung ohne Dialog. / Passiert: Die Figur läuft etwa
  0,4 m, dann bleibt alles stehen und Mika redet. Drücke auf der Titelkarte
  (E, Leertaste, Enter, Klick) bewirken nichts, die Karte ist aber kurz.
- Screenshot: jonas/01-intro-beim-loslaufen.png

### F6: Tür schwer zu treffen und vom Vordach verdeckt (Schwere: Feinschliff)
- Schritte: Vom Startpunkt aus den Weg geradeaus hoch laufen (W halten).
- Erwartet: Der Weg führt zur Tür, und ich laufe hinein. / Passiert: Die
  Figur klebt unter dem gestreiften Vordach an der Wand (x ≈ −0,4), ohne
  Hinweis. Die Tür liegt ein Stück weiter links (x ≈ −0,85), und die Figur
  rutscht nicht in die Öffnung. Das Vordach verdeckt die Tür. Beim ersten Mal
  hat mich das sechs Befehle gekostet, beim zweiten Mal (nachts, x ≈ −0,9)
  ging es glatt.
- Screenshot: jonas/06-an-der-wand-statt-tuer.png

### F7: Schleife mit E, Leertaste oder Enter an Objekten (Schwere: Feinschliff)
- Schritte: Am Ofen E hämmern.
- Erwartet: Durch Hämmern komme ich aus dem Dialog heraus. / Passiert: Der
  Dialog öffnet sich, tippt fertig, schließt sich und öffnet sich sofort
  wieder („Der kleine Ofen bullert vor sich hin. …“), immer im Takt von drei
  Drücken. Mit Leertaste und Enter passiert dasselbe. Nur ein Klick oder
  Weglaufen beendet die Schleife. Das ist harmlos, aber genau da hänge ich
  als Tastenhämmerer.
- Screenshot: –

### F8: Beim Neuladen ist das erste Bild doppelt beschriftet (Schwere: Feinschliff)
- Schritte: Während des Spiels neu laden (F5) und sofort einen Screenshot
  machen.
- Erwartet: Nur der Pixel-Titel. / Passiert: „Zomfy Towers wird geladen …“ in
  glatter Systemschrift liegt über dem Pixel-Titel „Zomfy Towers – Tag 4“.
  Das dauert nur ein Bild (33 ms später ist es sauber) und wirkt wie ein
  kurzes Flackern. Beim allerersten Start war das erste Bild sauber, dort
  stand nur der Pixel-Titel.
- Screenshot: jonas/05-neuladen-doppeltext.png

### F9: Die Figur kann ins Lagerfeuer laufen (Schwere: Feinschliff)
- Schritte: Von Süden an das Feuer laufen, bis der Hinweis „Ins Feuer
  schauen“ erscheint.
- Erwartet: Die Figur bleibt am Steinring stehen. / Passiert: Die Figur steht
  im Steinring direkt neben den Flammen. Es gibt keinen Schaden, aber es
  sieht komisch aus.
- Screenshot: jonas/03-feuer-ausruhen-figur-im-ring.png

### F10: Unsichtbare Wand im Wald, Hängenbleiben an Kleinkram (Schwere: Feinschliff)
- Schritte: (a) Vom Feuer aus mit Sprint nach rechts in den Wald laufen.
  (b) Von der Hütte aus nach rechts Richtung Feuer laufen.
- Erwartet: (a) Der Wald bremst sichtbar, oder ein Hinweis erklärt die
  Grenze. (b) Die Figur rutscht am Hindernis vorbei. / Passiert: (a) Bei
  x ≈ 15,7 bleibt die Figur stehen, obwohl der Wald dort Lücken hat. (b) Am
  kleinen Holzzaun westlich vom Feuer (x ≈ 1,9) bleibt die Figur zweimal
  einfach stehen.
- Screenshot: –

## Checkliste
- Tag ruhig genug zum Bauen? – Noch nicht im Spiel, gebaut wird noch nicht.
  Der Tag ist ruhig, für mich sogar zu ruhig, weil es nichts zu tun gibt.
- Nächte mit Action? – Noch nicht im Spiel. Die Nacht ist bisher nur schön.
- Aufrüsten lohnend? – Noch nicht im Spiel.
- Schwierigkeit gleichmäßig und fair? – Noch nicht im Spiel.
- Look passt zu DESIGN.md? – Ja. Die Pixel sind scharf, Morgen, Abend und
  Nacht sind klar verschieden, warme Lichtinseln stehen gegen die blaue
  Nacht, und die Laterne ist top. Einziger Ausreißer ist der Ladetext in
  Systemschrift beim Neuladen (F8).
- Reagiert jeder Tastendruck spürbar? – Fast. Laufen, Sprint, F und
  Dialogzeilen reagieren. Verschluckt werden Drücke in der Antwort-Sperre
  (F4), auf der Titelkarte und auf der Karte „Tag N“ (rund 3 s).
- Schleife oder ungewollte Entscheidung? – Ja. Ich habe zweimal ungewollt
  geschlafen (F1) und einmal ungewollt ausgeruht (F2), dazu kommt die kleine
  Schleife an Objekten (F7). Nach dem Aufwachen gibt es keine
  Schlaf-Schleife.
- Erstes Bild nach dem Start in Ordnung? – Beim Neustart ja, die Titelkarte
  ist sauber. Beim Neuladen ist ein Bild doppelt beschriftet (F8).
- Nach dem Aufwachen sofort loslaufen? – Nein, jeden Morgen hält mich ein
  Dialog fest (F3). Nach dem Ausruhen geht es sofort.
- Langweilig? – Ab etwa Minute 2, weil es nur Texte zum Anschauen gibt und
  nichts zum Sammeln oder Hauen.

## Gesamturteil (1–10) und wichtigster Wunsch

**6/10.** Die Steuerung ist knackig, das Spiel sieht richtig gut aus, und das
Wegdrücken ist jetzt berechenbar. Aber wer hämmert, verschläft seinen Tag,
jeden Morgen hält mich Mika fest, und zu tun gibt es noch nichts.

**Wichtigster Wunsch:** Bei „Jetzt schon schlafen?“ und am Feuer die harmlose
Antwort („Noch nicht.“ bzw. „Weitermachen“) vorauswählen und den Morgensatz
nicht mehr blockieren lassen. Und danach: Gebt mir endlich was zum Einsammeln
und Hauen!
