# Kira – m1-r1

Drei Sitzungen, ca. 75 Brücken-Befehle insgesamt. Ziel war kaputtmachen, nicht
schön spielen – dementsprechend liest sich das hier stellenweise wie ein
Bug-Log. Kurzfassung vorab: Die Engine selbst ist zäh (kein Absturz, keine
Konsolenfehler, egal was ich reingeworfen habe), aber an zwei Stellen landet
die Maus- bzw. Enter-Eingabe zuverlässig auf der falschen Schaltfläche.

## Was Spaß gemacht hat

- Ich habe wirklich alles geworfen, was ich hatte: Escape/Klick/Zahlen/Mausrad
  mitten in Dialogen, F-Spam im Menü, WASD während eines Dialogs, `reload`
  mitten im Schlafen/Dialog/Menü, vier völlig verschiedene Fenstergrößen. Kein
  einziger Absturz, kein weißer Bildschirm, kein hängender Zustand, der sich
  nicht mit Escape oder E lösen ließ. `console` kam bei jeder einzelnen Prüfung
  (gefühlt 60x) leer zurück.
- Kollision ist ehrlich fest: Ich bin an jeder Hauswand, am Lagerfeuer-Zaun, an
  Beeten, Bank und Baumrand entlanggeschrammt und nirgends durchgerutscht oder
  hängengeblieben (siehe Screenshot 016 – sauberer Stopp direkt am
  Lagerfeuer-Geländer).
- Schlafen im echten Bett fühlt sich rund an: Text tippt sich ein, „Spielstand
  gespeichert" poppt auf, Tag 2 startet mit warmem Licht im Hausinneren, und
  ein `reload` direkt in der Aufwach-Zeile danach bringt einen sauber mit
  „Willkommen zurück!" exakt zurück (Screenshot 04).
- Resize-Marathon (320×200, 1600×300, 1280×720, zurück auf 640×360) – überall
  bleiben die Pixel scharf und ganzzahlig, HUD-Ecken bleiben an ihren Ecken,
  nichts überlappt, nichts zerreißt.
- Die kleinen Interaktionstexte (Ohrensessel „mitten auf der Wiese, irgendwer
  hatte hier Prioritäten", Radio, ins Feuer schauen) treffen den in DESIGN.md
  versprochenen Humor gut.

## Wo ich hängen blieb oder mich gelangweilt habe

- Kurz vor dem Bett schien ich in einer Ecke festzustecken (W und A taten
  nichts mehr). Erschrocken, dann S und D probiert – ging sofort wieder. War
  echte Möbelkollision in einer engen Ecke, kein Bug, aber es fühlt sich im
  ersten Moment wie ein Softlock an.
- Als Zerstörungstesterin war meine größte Hürde, dass die Lichtung so robust
  gebaut ist, dass ich lange nichts zum Melden fand – bis ich anfing, gezielt
  Mausklicks im Menü und Enter in Dialogen zu prüfen statt nur Bewegung.
- Inhaltlich ist vormittags naturgemäß nichts los (richtig so für „Fundament
  und Look"), das ist kein Fehler, nur nicht meine Baustelle in dieser Runde.

## Was unklar war

- In einem normalen Dialog schließt E den Text ab (weiter/fertig). In einem
  Auswahl-Dialog („Bis zum Abend ausruhen" / „Weitermachen") schiebt E aber
  nur die Markierung weiter, statt zu bestätigen – bestätigt wird erst mit
  Enter oder Klick. Fühlt sich inkonsistent an, weil E überall sonst „weiter/
  benutzen" bedeutet (siehe auch F2).
- Ich habe die echte Steuerungs-Anzeige und den Vollbild-Knopf im ganzen Test
  kein einziges Mal sauber zu Gesicht bekommen – jeder Versuch, „Steuerung"
  zu öffnen, landete stattdessen im „Neues Spiel"-Löschen-Dialog (F1). Ob
  „Steuerung"/„Vollbild" selbst fehlerfrei funktionieren, kann ich also gar
  nicht beurteilen.
- Ob das durchgehende Autosave während des normalen Spielens (siehe Checkliste)
  Absicht ist oder ob eigentlich „nur Schlafen speichert" gelten soll, weiß
  ich nicht – wichtig zu wissen, um F5 richtig einzuordnen.

## Fehler

### F1: Pausenmenü – Maus trifft die falsche Schaltfläche, „Steuerung" öffnet „Neues Spiel löschen" (Schwere: Blocker)
- Schritte:
  1. `node tools/playtest.mjs do kira "press Escape"` – Menü frisch öffnen
     (Standard-Markierung liegt auf „Weiter spielen", siehe Screenshot 009).
  2. `node tools/playtest.mjs do kira "move 320 213; look"` – Maus auf die
     Zeile „Steuerung" bewegen, **ohne zu klicken**.
  3. Ergebnis bereits hier: `look` zeigt `"menue":"confirm"`. Ein zusätzlicher
     `click 320 213` aus frisch geöffnetem Menü tut dasselbe.
- Erwartet: Steuerungs-Übersicht öffnet sich, oder zumindest bleibt „Steuerung"
  markiert.
- Passiert: Sofort öffnet sich der „Neues Spiel"-Bestätigungsdialog
  („Wirklich neu beginnen? Der Spielstand wird gelöscht.") – und zwar mit
  „Ja, neu beginnen" vorausgewählt statt der sichereren Option „Lieber
  nicht". Ich habe das vier Mal unabhängig voneinander aus einem sauber
  frisch geöffneten Menü reproduziert (zweimal per Klick, einmal per reinem
  Hover, einmal nach einem Fenster-Resize). Wer im Menü als Erstes auf
  „Steuerung" klicken will, ist einen Wimpernschlag von einem gelöschten
  Spielstand entfernt – genau das, was die Design-Säule „Verlieren kostet nie
  den Spielstand" verhindern soll. Einmal komplett durchgeklickt („Ja, neu
  beginnen" bestätigt) funktioniert der Reset selbst technisch sauber (Tag 1,
  07:00, Startposition, keine Konsolenfehler).
- Screenshot: kira/02-menu-steuerung-oeffnet-neues-spiel.png

### F2: Lagerfeuer/Sessel-Dialog – Enter bestätigt nicht die markierte Option, sondern immer die andere (Schwere: Spielfluss)
- Schritte:
  1. Zum Ohrensessel am Lagerfeuer laufen, `press KeyE` (Hinweis „Hinsetzen"
     vorher sichtbar), ggf. ein zweites Mal `KeyE` für den Flavor-Text.
  2. `node tools/playtest.mjs do kira "wait 900; look"` – Text ist fertig
     getippt, „Bis zum Abend ausruhen" ist mit Pfeil markiert, „Weitermachen"
     ist ausgegraut (Screenshot 03).
  3. `node tools/playtest.mjs do kira "press Enter; look"` – kein weiterer
     Tastendruck dazwischen.
- Erwartet: Laut Steuerungstabelle sind E/Enter beim Dialog gleichwertig
  („Benutzen, Dialog weiter"); die markierte Option „Bis zum Abend ausruhen"
  sollte ausgeführt werden (`modus` wird `"sleep"`).
- Passiert: Der Dialog schließt, `modus` wird `"play"`, Uhrzeit bleibt
  unverändert – es wurde „Weitermachen" ausgeführt, nicht die markierte
  Option. Exakt zweimal unabhängig voneinander reproduziert (auch nach
  frischem Öffnen des Dialogs). Mit einem Mausklick direkt auf die Zeile
  „Bis zum Abend ausruhen" funktioniert die Auswahl dagegen korrekt (`modus`
  wird `"sleep"`, Screenshot bestätigt). Am Bett funktioniert Enter bei der
  „Jetzt schon schlafen?"-Frage dagegen richtig – das Problem trat bei mir
  nur am Lagerfeuer/Sessel-Dialog auf.
- Screenshot: kira/03-dialog-ausruhen-markiert.png

### F3: Kurzes dunkles Rausch-Bild direkt nach Sitzungsstart bzw. nach „Neues Spiel" (Schwere: Feinschliff)
- Schritte: `node tools/playtest.mjs start kira --root <ordner>` gefolgt von
  `node tools/playtest.mjs do kira "wait 500; shot x"` – ganz ohne vorherige
  Eingabe. Gleiches Bild reproduzierbar direkt nach Bestätigen von „Neues
  Spiel" im Menü.
- Erwartet: Direkt die fertige, farbige Lichtung mit Hütte.
- Passiert: Der erste Frame zeigt ein dunkles, stark gepunktetes/verrauschtes
  Bild, das wie ein kaputter Renderdurchlauf aussieht. Nach ungefähr einer
  weiteren Sekunde Spielzeit sieht alles korrekt und bunt aus (siehe
  Vorher/Nachher: Screenshot 001 vs. spätere Screenshots). Auch Jonas hat in
  seinem Bericht denselben Effekt unabhängig gefunden – tritt also
  zuverlässig auf.
- Screenshot: kira/01-startbild-rauschen.png

### F4: Figur verschwindet fast vollständig hinter Bäumen am Rand der Lichtung (Schwere: Feinschliff)
- Schritte: Vom Lagerfeuer aus konsequent nach Osten laufen (z. B.
  `hold KeyD 4000` mehrfach), bis man am Baumrand ansteht (Figur bei etwa
  x≈15, z≈5 laut `look`), dann `shot`.
- Erwartet: Laut DESIGN.md 6.2 wird Sichtverdeckendes rund um die Figur
  gerastert durchsichtig gemacht (so wie Dach/Vorderwand am Haus sauber
  ausblenden, siehe Screenshot 04).
- Passiert: An der Baumgrenze verschwindet die Figur fast komplett unter
  einer Baumkrone, nur ein kleiner Mützenzipfel schaut hervor – kein
  sichtbarer Freistell-Effekt wie beim Haus.
- Screenshot: kira/05-figur-hinter-baum-versteckt.png

### F5: Reload während des Ausruhens/Einschlafens verliert mehr Fortschritt als nur die angefangene Aktion (Schwere: Spielfluss)
- Schritte (mit konkreten Werten aus meinem Test):
  1. Normal ein Stück laufen und warten:
     `node tools/playtest.mjs do kira "hold KeyD 900; wait 3000; look"` →
     Figur bei x=1.71, z=0.25, 07:12 Uhr.
  2. Kontrolltest: `node tools/playtest.mjs do kira "reload; wait 500; look"`
     → Position/Uhrzeit exakt erhalten (x=1.71, z=0.25, 07:12,
     „Willkommen zurück!"). Autosave funktioniert hier also einwandfrei.
  3. Weiterlaufen zum Lagerfeuer-Sessel (mehrere `hold`-Befehle), dort
     Ausruhen starten: `press KeyE`, Text abwarten, `click 200 305` auf
     „Bis zum Abend ausruhen" → `modus:"sleep"` bei x=6.38, z=1.3, 07:23 Uhr.
  4. `node tools/playtest.mjs do kira "reload; wait 600; look"` – noch
     während der Abblende-Phase (`modus:"sleep"`).
- Erwartet: Bestenfalls verliert man nur die angefangene Ausruh-Aktion und
  landet an Ort/Uhrzeit von Schritt 3 (x=6.38, z=1.3, 07:23).
- Passiert: Man landet exakt wieder beim Autosave-Stand aus Schritt 1/2
  (x=1.71, z=0.25, 07:12) – die rund 11 Spielminuten Laufweg zum Lagerfeuer
  plus eine Objekt-Interaktion sind spurlos weg, obwohl derselbe Reload-Test
  unmittelbar davor (normales Laufen+Warten, kein Ausruhen) verlustfrei war.
  Kein Absturz, kein kompletter Reset auf „ganz am Anfang" – aber ein
  stilles, unangekündigtes Wegwerfen von Fortschritt, sobald man mitten im
  Ausruhen/Einschlafen neu lädt. Aktuell folgenlos, weil M1 nichts
  Verderbliches kennt; sobald Sammeln/Bauen dazukommt, ist das ein echter
  Verlust.
- Screenshot: kira/06-reload-waehrend-ausruhen-verlust.png

## Checkliste
- Tag ruhig genug zum Bauen? – Bauen noch nicht im Spiel; der Vormittag selbst
  ist absolut ereignislos, da würde niemand gestört.
- Nächte mit Action? – noch nicht im Spiel (keine Horde/Zombies in M1).
- Aufrüsten lohnend? – noch nicht im Spiel.
- Schwierigkeit gleichmäßig und fair? – noch nicht im Spiel, nichts zum
  Scheitern vorhanden.
- Look passt zu DESIGN.md? – größtenteils ja (scharfe Pixelkanten, warmes
  Hausinneres gegen kühleres Morgenlicht draußen, liebevolle Details), zwei
  Abzüge: der Rausch-Frame beim Start/Reset (F3) und die verschluckte Figur
  am Baumrand (F4).
- Abstürze? – Keine, in keiner der drei Sitzungen, trotz Tastenspam, wildem
  Klicken, Resize- und Reload-Attacken.
- Konsolenfehler? – Keine einzige – nach praktisch jedem Befehl per `console`
  geprüft, durchgehend leer.
- Festhängende Zustände? – Keine gefunden. Dialoge/Menüs ließen sich immer per
  Escape, E-Spam oder Klick schließen; die einzige gefühlte „Blockade" (Bett-
  Ecke) war echte Möbelkollision, kein Bug.
- Verlorene Spielstände? – Teilweise, siehe F5: normales Laufen+Warten
  übersteht `reload` sauber und wiederholt, aber `reload` mitten im
  Ausruhen/Einschlafen wirft Fortschritt seit dem letzten Autosave weg. Ein
  Totalverlust auf „ganz am Anfang" ist mir nur passiert, wenn es tatsächlich
  noch gar keinen Autosave gab (frische Sitzung, sofort reload).
- Darstellungsfehler? – Zwei kleine (F3, F4); in allen vier getesteten
  Fenstergrößen (320×200, 1600×300, 1280×720, 640×360) sonst sauber und
  pixelscharf.
- Menüs/Dialoge unter Dauerbeschuss (Esc-Spam, Klick-Spam, F/Zahlen/Mausrad
  mittendrin)? – Bis auf F1 und F2 robust: Bewegung, Laterne (F) und
  Zahlen/Mausrad wurden während Dialog und Menü korrekt ignoriert, kein
  Doppel-Trigger, keine Endlosschleifen.
- „Neues Spiel" getestet? – Ja (über den F1-Umweg komplett durchgeklickt):
  funktioniert technisch sauber, setzt Tag/Uhrzeit/Position/Vorrat
  zuverlässig zurück, keine Fehler danach.

## Gesamturteil (1–10) und wichtigster Wunsch
6/10. Das Fundament unter der Haube ist ehrlich beeindruckend robust – ich
habe es nicht geschafft, das Spiel zum Abstürzen, Hängenbleiben oder zu
einer einzigen Konsolenmeldung zu bringen, trotz allem, was mir eingefallen
ist. Was den Punktabzug kostet, sind zwei Stellen, an denen die Eingabe
zuverlässig das Falsche trifft (F1, F2) – und F1 tut das ausgerechnet in
Richtung „ganzen Spielstand löschen". Wichtigster Wunsch: F1 zuerst fixen
(Maus-Hit-Test im Pausenmenü), weil ein normaler Klick auf „Steuerung" aktuell
niemanden crashen lässt, aber jeden erschrecken kann, der schnell weiterklickt.
