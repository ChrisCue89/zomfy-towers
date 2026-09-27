# Kira – m12-r1

Neues Spiel als „Kira“ (Name getippt, lila Mütze, rote Jacke), gespielt bis
Tag 3, 07:34 – zwei Nächte: Nacht 1 absichtlich im Haus ausgesessen und
verloren, Nacht 2 am Lagerfeuer gewonnen. Rund 135 Befehle über die Brücke.
**Konsole: in der ganzen Sitzung keine einzige Meldung** (weder Fehler noch
Warnung), auch nicht bei Neuladen, Fenstergröße oder Tasten-Spam.

## Was Spaß gemacht hat

- **Die Haustür ist robust.** Rein, raus, schnell hin und her, Esc/M/Tab/E/F
  während der Abblende – alles wird sauber verworfen, kein Hänger, kein
  doppelter Wechsel. Direkt nach dem Rausgehen kommt man offenbar kurz nicht
  gleich wieder hinein – gut so.
- **Neu laden übersteht fast alles:** drinnen (Figur bleibt drinnen), mitten
  in Welle 2/3 (Nacht, Uhrzeit, Ort, Vorrat, Erfahrung stimmen, die Nacht läuft
  einfach weiter), im Morgenbericht (Stand bleibt – aber siehe F1).
- **Fenstergröße** 800×600, 400×700 (hochkant) und 1920×1080 im laufenden
  Spiel: keine Fehler, Oberfläche passt sich an, Full HD ist herrlich scharf.
- **Bauregeln sind dicht:** Turm auf dem Weg → „Auf dem Weg nur Barrikaden“;
  Barrikade auf Gras, Steg, Laubhaufen oder im Hof → „Barrikaden nur auf den
  Weg“; Veranda, Kürbislaternen, Hauswand → „Da steht das Zuhause“ bzw. „Kein
  Platz“; auf mir selbst → „Ich stehe im Weg“; belegtes Feld → „Da steht schon
  ein Bau“. Dreifach-Klick setzt genau einen Turm und bucht genau einmal ab.
  Zu teuer → „Fehlt: 8 Schrott“.
- **Namensfeld:** höchstens 12 Zeichen, Ziffern und Satzzeichen werden
  verschluckt, Esc beim Tippen macht nichts kaputt.
- „Neues Spiel“ im Pausenmenü fragt nach, vorgewählt ist „Lieber nicht“.
- **Bett zur falschen Zeit** ist gut abgefangen: tagsüber „Bis zum Abend
  ausruhen (18:30)“, nach 18:30 korrekt „Warten, bis die Horde kommt
  (20:24)“, während der Welle „Nicht, solange die Horde draußen ist“. Kein
  Zeitsprung rückwärts, kein übersprungener Abend.
- **Stimmung nachts:** Kürbislaternen mit Gesichtern und warmen Lichtpfützen,
  Lichterkette am Dach, gelbes Fenster – sehr gemütlich. Krähen flattern auf,
  wenn man auf sie zurennt. Balduins Boot, das an den Steg gleitet, ist ein
  schöner Moment. „Wiiiiieee!“ an der Schaukel.
- Überreste, die auf und hinter der Barrikadenreihe liegen, kommen trotzdem
  per Sog zur Figur.

## Wo ich hängen blieb oder mich gelangweilt habe

- Kurz vor der ersten Nacht tat C (Barrikade) einfach nichts – die Bauleiste
  stand nach dem Haus auf dem Reiter „Figur“ (F3).
- An Tag 2 war Balduin um 07:16 schon weg, weil ich das Handelsfenster mit Esc
  geschlossen hatte (F2). 16 Überreste lagen noch draußen – umsonst gesammelt.
- In Nacht 1 braucht die Horde über zwei Spielstunden bis zu meiner Reihe am
  Wegende. Ich stand lange an der Barrikade und sah nur „Schlurfer links
  (14)“. Die Übersichtskarte (M) hilft: dort sieht man die lila Striche.

## Was unklar war

- Esc im allerersten Dialog überspringt die ganze Einführung auf einmal.
  Absicht?
- Türme dürfen im Hof direkt auf die gepunktete Laufspur der Horde (grün).
  Läuft die Horde dann drumherum – und kann man den Hof so zubauen? Konnte ich
  mangels Schrott nicht ausreizen.
- „Zur Hütte ausbauen“ – ich wohne in einem „alten Fischerhaus“; eine Hütte
  klingt nach Rückbau.
- Warum fiel das Zuhause in Nacht 1? Der Bericht sagt nur „Eine Barrikade
  zerschlagen“ – meine Reihe hatte fünf Stück, trotzdem schlugen die Schlurfer
  „an der Westwand“ zu (siehe F4).

## Fehler

### F1: Morgenbericht bleibt nach Neuladen dauerhaft im Bild (Schwere: Blocker)
- Schritte: Nacht überstehen, im Bett schlafen → Bericht „Nacht 2
  überstanden“ erscheint. Jetzt neu laden (F5), auf dem Titelbild
  „Weiterspielen“.
- Erwartet: Bericht erscheint noch einmal und geht mit E zu – oder man ist
  direkt im Spiel. / Passiert: Das Spiel läuft im Spielmodus weiter (Uhr, Laufen,
  Dialoge, Handel mit Balduin funktionieren), aber der Berichtskasten samt
  Abdunklung bleibt mitten im Bild stehen – von 06:34 bis mindestens 07:34,
  durch E, Esc, Dialoge und das Handelsfenster hindurch. Die Figur ist darunter
  nicht zu sehen. Ob ein zweites Neuladen hilft, konnte ich nicht mehr prüfen.
- Screenshot: kira/bericht-klebt-nach-reload.png (07:17 am Steg, der Handel
  läuft darunter)

### F2: Esc nach einem Tausch schickt Balduin für den Tag weg (Schwere: Spielfluss)
- Schritte: Balduin am Steg ansprechen, Handelsfenster öffnen, einmal tauschen,
  Fenster mit Esc schließen (unten steht „Esc fertig“).
- Erwartet: Fenster zu, Balduin bleibt „bis Mittag“ (so sagt er es selbst,
  und der Bericht: „Balduin wartet bis 12 Uhr am Steg“); verabschieden tut man
  sich über „Tschüss, Balduin!“. / Passiert: Er ruft „Beehr mich wieder. Mit
  vollen Taschen!“ bzw. „Leinen los! Die Sammlung wächst!“ und legt sofort ab
  (Tag 2 um 07:16, Tag 3 kurz nach 07:26 – zweimal nachgestellt). Ohne
  vorherigen Tausch bleibt er dagegen („Kein Handel? Ich warte noch ein
  bisschen.“). Diesen Unterschied sieht man nicht. Wer kurz Überreste holen
  will, verliert den Händler für den ganzen Tag.
- Screenshot: kira/balduin-legt-nach-esc-ab.png

### F3: Bauleisten-Reiter und Tasten wechseln zwischen drinnen und draußen (Schwere: Spielfluss)
- Schritte: Im Haus mit Tab auf „Zuhause“ stellen (drinnen: Q = Ausbau,
  R = Reparieren), rausgehen.
- Erwartet: Draußen gelten die gewohnten Tasten. / Passiert: Draußen stand die
  Leiste auf „Figur“ – C tat nichts, Q/R/T/G hätten Figur-Aufwertungen gekauft.
  (Vermutung: Die Reiter-Nummer wird übernommen, drinnen fehlt aber „Türme“.)
  Im Reiter „Zuhause“ draußen ist R plötzlich „Laternenpfahl“ – ich hatte statt
  Reparieren einen Laternenpfahl in der Hand –, Reparieren liegt dort auf V.
  Der Bericht sagt nur „Reparieren geht über die Bauleiste (Zuhause)“.
- Screenshot: kira/bauleiste-reiter-figur.png

### F4: Jagende Schlurfer verlassen den Weg neben der Barrikadenreihe (Schwere: Spielfluss, Verdacht)
- Schritte: Nacht 1, fünf Barrikaden quer über das Wegende, ich stehe daneben
  am Turm.
- Erwartet: Die Horde bleibt auf dem Weg und hängt an der Reihe. / Passiert:
  Schlurfer, die mich jagen, stehen auf dem Gras nördlich der Reihe (am
  Wegweiser) – also am Ende der Reihe vorbei. Später war laut Bericht nur eine
  Barrikade zerschlagen, das Zuhause fiel trotzdem („an der Westwand“). Ich
  vermute, dass sie so an der Reihe vorbeikommen, konnte es aber nicht sauber
  bis zum Ende beobachten. Nebenbei: Hinter dem Wegweiser leuchtet der
  Durchsicht-Umriss der Figur als großes gelbes „F“ – wirkt seltsam.
- Screenshot: kira/schlurfer-neben-barrikaden.png

### F5: Drinnen merkt man kaum, dass das Zuhause fällt (Schwere: Feinschliff)
- Schritte: Nacht 1 im Haus warten.
- Erwartet: Deutliche Warnung (Wackeln, Geräusch, roter Rand …). / Passiert:
  Nur eine kurze Meldung „Das Zuhause wird angegriffen – an der Westwand!“. In
  75 Spielminuten (30 s echt) ging es von 300 auf 98, kurz danach war die Nacht
  verloren. Die Folgen waren korrekt und fair (Morgenbericht, 75/300 geflickt,
  2 Teile verloren, Spielstand heil).
- Screenshot: kira/zuhause-angegriffen.png (kurz draußen nachgesehen: großer
  Moosschlurfer an der Veranda, 98/300)

### F6: „Spielstand gespeichert“ verdeckt die Überschrift des Morgenberichts (Schwere: Feinschliff)
- Schritte: Morgenbericht nach der Nacht.
- Erwartet: Überschrift lesbar. / Passiert: Die Meldung liegt genau auf
  „Nacht 1 verloren“.
- Screenshot: kira/meldung-verdeckt-bericht.png

### F7: E-Spam durch einen Dialog startet gleich die nächste Interaktion (Schwere: Feinschliff)
- Schritte: Axt nehmen, im folgenden Dialog E sechsmal schnell drücken.
- Erwartet: Dialog zu, fertig. / Passiert: Der letzte Druck öffnet sofort den
  nächsten Dialog („Der Hackklotz. Die Axt habe …“). Genauso am alten Mast am
  Steg – dort bin ich zweimal im selben Gespräch gelandet.

### F8: Der Weg ist nachts kaum zu erkennen (Schwere: Feinschliff)
- Nachts ist der Weg westlich des Hofs fast so dunkel wie das Gras daneben;
  ohne Laterne sehe ich nur die Barrikaden. DESIGN.md verspricht „nachts mit
  Fackeln und einem Hauch Eigenlicht“.

### F9: Schaukel ohne Schaukeln (Schwere: Feinschliff)
- „Wiiiiieee!“ erscheint, aber die Figur steht einfach neben dem Reifen.

## Checkliste

- Tag ruhig genug zum Bauen? – Ja, tagsüber kein einziger Schlurfer bei mir.
- Nächte mit Action? – Ja. Nacht 2 am Lagerfeuer war richtig wuselig
  (41 Schlurfer, Stufe 4).
- Aufrüsten lohnend? – Kaum getestet: Perks (Dickes Fell, Flickschusterin,
  Zweiter Atem) und Reparieren (13 %). Turm-Ausbau nicht probiert.
- Schwierigkeit gleichmäßig und fair? – Nacht 1 mit einem Turm und sechs
  Barrikaden verloren, weil ich drinnen blieb; Nacht 2 mit eigenem Kämpfen
  gewonnen. Fair – aber das Zuhause kippt sehr schnell, sobald die Horde dran
  ist.
- Look passt zu DESIGN.md? – Ja: herbstlich, gemütlich, warme Lichtinseln in
  kalter Nacht. Weg nachts zu dunkel (F8); die gerasterten Nebelbänke über
  Ufer und Steg sind recht unruhig.
- Erkennt man, was was ist? – Tagsüber ja (Figur, Quellen, Türme,
  Barrikaden, Boot). Nachts am Lagerfeuer verschwimmen grüne Schlurfer und
  grüne Überreste (beide grün-blau mit Funkeln) etwas.
- Bucht und Wege: Karte (M) sehr klar (Nord-, Mittel-, Südweg laufen zusammen),
  auch drinnen und nachts; die Bauregeln neben/auf dem Weg greifen zuverlässig.
- Balduin: kommt pünktlich mit dem Boot, Tauschen mit E und E-Halten klappt,
  das Fenster sperrt kurz nach dem Öffnen gegen Fehltausch – gut. Esc-Problem
  siehe F2.
- Zuhause mit Innenraum: Tür, Innenraum, Bett, Ausruhen, Schlafen, Neuladen
  drinnen – alles stabil. Nur F1 und F3.
- Herbst und Wetter: alle drei Tage „klar und kühl“ – Regen und Wind habe ich
  nicht erlebt. Nebelbänke, Laub, Krähen (fliegen auf), Kürbislaternen mit
  Gesichtern: ja.
- Konsole: in rund 135 Befehlen keine einzige Meldung.
- Spielstand: nie verloren (Neuladen drinnen, in der Welle, im Bericht).

## Gesamturteil (1–10) und wichtigster Wunsch

**7/10.** Technisch erstaunlich robust – keine Konsolenmeldung, keine Hänger
an der Tür, der Spielstand hält alles aus. Wichtigster Wunsch: F1 beheben (der
Bericht klebt nach dem Neuladen im Bild) und Balduin nicht per Esc wegschicken
(F2).
