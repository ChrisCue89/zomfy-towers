# Jonas – m1-r1

## Was Spaß gemacht hat
- Einfach losgelaufen, nichts gelesen, und trotzdem sofort kapiert was geht: WASD läuft, E macht was, F ist die Laterne. Die kleinen Hinweis-Boxen (»E Schlafen«, »E Ansehen«, »E Ofen ansehen«) poppen genau dann auf, wenn man vor der richtigen Sache steht – genau mein Ding, ich muss nix vorher nachlesen.
- Bett gefunden, draufgelaufen, E gedrückt, „Ja, bis morgen." angetippt – und zack, nächster Tag, „Spielstand gespeichert" stand da. Kernziel der Runde war in unter 10 Bridge-Befehlen erledigt.
- Rennen mit Shift fühlt sich spürbar schneller an als normal laufen, kein Placebo.
- Esc macht das Pausenmenü auf UND wieder zu, ohne dass ich zu "Weiter spielen" navigieren musste. Genau wie ich's aus jedem Actiongame kenne.
- Die kleine Lichtung ist vollgestopft mit Sachen zum Antippen – Lagerfeuer, Ofen, der alte Funkturm, alles hat einen eigenen Spruch. Fühlt sich nicht wie eine leere Testkarte an.
- Ich hab wie ein Irrer auf E rumgehackt (8x hintereinander an einer Stelle) und nichts ist kaputtgegangen, keine Konsolenfehler, kein Absturz.

## Wo ich hängen blieb oder mich gelangweilt habe
- Ganz am Anfang, direkt nach Sitzungsstart, dachte ich für eine Sekunde das Spiel ist kaputt – der Bildschirm war nur graues Rauschen (siehe F1). Erst nach ein paar Tastendrücken kam Farbe rein.
- Vorm Haus stand ich ganz kurz und musste noch ein Stück weiterlaufen, bis ich "durch" die Tür war (leichte Verzögerung zwischen "davor stehen" und "drin sein"). Kein Hänger, nur kurzes Zögern.
- Tagsüber ist auf der Lichtung außer den paar Ansehen-Objekten nichts los – logisch für "Fundament und Look", aber wenn das länger so bleibt, wird mir als Action-Typ schnell langweilig.
- Ein paarmal hat ein Tastendruck einfach nichts gemacht (siehe F2) – das fühlt sich für einen Knöpfchendrücker wie mich an, als würde das Spiel kurz hängen, auch wenn es sich beim nächsten Druck wieder löst.

## Was unklar war
- Dass man die Dialog-Auswahl ("Ja, bis morgen." / "Noch nicht.") mit W/S wechselt, steht nirgends auf dem Bildschirm. Hab's nur rausgefunden weil ich aus Prinzip alles drücke. Ob man die Antworten auch anklicken kann, weiß ich nicht – hab's nicht probiert, weil ich als Maus-Typ eh lieber Tasten hau.
- Nicht auf Anhieb klar, dass das Bett auch von der Rückseite des Hauses (also von draußen durch die Wand) auf E reagiert – siehe F3. Hat mich kurz verwirrt, als ich da zufällig stand und der Schlafen-Dialog aufploppte.

## Fehler

### F1: Startbild ist graues Rauschen statt der fertigen Szene (Schwere: Feinschliff)
- Schritte: Sitzung starten (`start jonas`), sofort `shot`/`look` ohne vorherige Eingabe.
- Erwartet: Man sieht direkt die Lichtung mit Hütte in normalen Farben.
- Passiert: Der Bildschirm zeigt ein dunkles, gepunktetes Graubild, sieht aus wie ein Rendering-Fehler. Erst nach ein paar Sekunden Spielzeit wird das Bild bunt. (Ich hab später gesehen: Das ist derselbe Effekt wie beim Aufwachen nach dem Schlafen – wahrscheinlich startet das Spiel technisch im "Aufwach"-Zustand. Macht Sinn, sieht aber im allerersten Frame wie ein Bug aus.)
- Screenshot: jonas/01-start-graubild.png

### F2: Einzelne Tastendrücke werden manchmal ignoriert (Schwere: Spielfluss)
- Schritte: In einem Dialog mit Auswahl (z. B. am Lagerfeuer "Bis zum Abend ausruhen" / "Weitermachen") per S die Auswahl wechseln und/oder per E bestätigen – mehrmals hintereinander in verschiedenen Situationen ausprobiert (Lagerfeuer-Dialog, Funkturm-Monolog wegklicken, Schlafen-Dialog).
- Erwartet: Jeder einzelne Tastendruck (S wechseln, E bestätigen) wirkt sofort.
- Passiert: Gefühlt jeder dritte/vierte Einzeldruck hat gar nichts gemacht – der Dialog blieb exakt gleich stehen, obwohl laut Log eine Taste gesendet wurde. Ein zweiter Druck kurz danach hat dann funktioniert. Ist mir mindestens 3x in der Session passiert, an verschiedenen Dialogen. Für jemanden, der nicht genau hinschaut und einfach weiterdrückt (also mich), wirkt das wie ein kurzer Hänger.
- Screenshot: jonas/03-schlafen-dialog.png (dieser Schlafen-Dialog ist einer der Fälle, wo der erste E-Druck zum Bestätigen nichts tat und ich nochmal drücken musste)

### F3: Bett lässt sich von außen durch die Rückwand "benutzen" (Schwere: Feinschliff)
- Schritte: Um das Haus herum auf die Nordseite (Rückseite) laufen, direkt an der Außenwand stehen bleiben (Figur-Status `imHaus:false`), E drücken.
- Erwartet: Nichts passiert, weil man nicht im Haus ist / keine Sichtlinie zum Bett hat.
- Passiert: Der "Jetzt schon schlafen?"-Dialog öffnet sich trotzdem, genau wie direkt am Bett drinnen. Wählt man "Ja, bis morgen.", schläft Mika normal ein und wacht am nächsten Morgen im Bett auf – funktioniert also, wirkt aber wie eine Kollisions-/Reichweiten-Lücke (Interaktion geht durch die Wand).
- Screenshot: jonas/05-schlafen-durch-wand.png

### F4: Direkt nach dem Aufwachen kann man aus Versehen sofort wieder in den Schlafen-Dialog rutschen (Schwere: Feinschliff)
- Schritte: Einschlafen bis zum nächsten Morgen, den Aufwach-Monolog ("Die Vögel sind schon wach...") mit mehrfachem E wegklicken (so wie ein Actionspieler das eben macht, ohne zu schauen ob der Dialog schon zu ist).
- Erwartet: Nach dem Wegklicken ist man erstmal einfach im Spiel und kann loslaufen.
- Passiert: Weil Mika direkt nach dem Aufwachen noch auf der Bett-Kachel steht, öffnet ein E-Druck zu viel sofort wieder den "Jetzt schon schlafen?"-Dialog. Wirkt wie eine Dialog-Schleife, wenn man (wie ich) nicht genau mitliest.
- Screenshot: jonas/04-aufwach-fade.png

## Checkliste
- Tag ruhig genug zum Bauen? – Ja, morgens ist absolut nichts Bedrohliches unterwegs. Bauen selbst gibt's aber noch nicht zu testen (noch nicht im Spiel).
- Nächte mit Action? – noch nicht im Spiel (keine Horde, keine Zombies in diesem Meilenstein).
- Aufrüsten lohnend? – noch nicht im Spiel (kein Sammeln/Craften/Türme).
- Schwierigkeit gleichmäßig und fair? – noch nicht im Spiel (keine Herausforderung vorhanden, es gibt nichts, an dem man scheitern könnte).
- Look passt zu DESIGN.md? – Ja, würd ich schon sagen: scharfe Pixelkanten, warmes Licht an Haus und Feuer, satte grüne Wiese, alles wirkt gemütlich und einladend wie im Dokument beschrieben. Auch für mich als Nicht-Leser gut: Türen, Bett, Feuer stechen farblich/durch Licht klar hervor, ich musste nie suchen.
- Kommt man ohne Erklärung klar? – Ja. Ich hab null Text gelesen und trotzdem in kurzer Zeit Haus gefunden, reingegangen, Bett gefunden und geschlafen.
- Ist sofort klar, was zu tun ist? – Größtenteils ja, dank der automatischen E-Hinweise vor interessanten Objekten. Einzige Ausnahme: dass man Dialog-Antworten mit W/S wechselt, steht nirgends.
- Wo bleibt man hängen? – Nur beim komisch aussehenden Startbild (F1) und den ab und zu ignorierten Tastendrücken (F2), sonst nirgends.
- Wird es langweilig? – Nach dem ersten Rundgang um die Lichtung (Haus, Feuer, Funkturm) gibt's tagsüber nichts mehr zu tun. Für "Fundament und Look" verständlich, aber das ist der Punkt, an dem ich als Action-Spieler das Interesse verlieren würde, wenn nicht bald Sammeln/Bauen/Action dazukommt.

## Gesamturteil (1–10) und wichtigster Wunsch
7/10 für ein reines Fundament: Steuerung sitzt, Ziel war ohne jede Erklärung in Minuten erreichbar, und der Look fühlt sich schon richtig gemütlich an. Wichtigster Wunsch: die ab und zu verschluckten Tastendrücke (F2) fixen – wenn ich später mitten in einer Zombie-Nacht bin und E oder eine Zahl nicht durchkommt, wird aus "nervig" schnell "unfair".
