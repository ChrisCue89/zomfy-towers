# m4-r1 – Zusammenfassung (abgebrochene Runde)

**Stand:** Hauptzweig nach m3-r2 mit Meilenstein 4 (Nahkampf, Waffen, Perks),
noch vor Meilenstein 5.

**Verlauf:** Alle vier Testspieler-Agenten wurden nach rund einer Stunde vom
Nutzungslimit gestoppt, bevor Berichte entstanden. Jonas und Theo kamen nicht
über das Lesen der Regeln hinaus. Kira spielte Tag 1 und Nacht 1 bis zum Sieg,
Mira bis in den Vormittag von Tag 2. Ihre Notizen während des Spiels liegen
unverändert in `kira-protokoll.md` und `mira-protokoll.md`. Punkte gibt es
diesmal keine.

Die Befunde unten stammen aus diesen Notizen. Die nächste Runde prüft
Meilenstein 4 und 5 zusammen (siehe PROGRESS.md).

## Blocker

Keine. Kein Absturz, keine Konsolenmeldung. Neuladen bei offener Perk-Wahl
ist stabil.

## Stört den Spielfluss

- **S1 – Perk-Wahl per Kampfklick (Kira).** Die Wahl ging mitten in der
  Welle auf. Der dritte Angriffsklick nahm »Sammlerherz«, ohne dass die
  Karten zu sehen waren. Die Sperre von 0,5 s reichte nicht, und auch
  Leertaste (Ausweichen) und die Tasten 1–3 (Waffenwechsel) wählen dort.
- **S2 – Nachtleiste fehlt nach dem Neuladen bei offener Perk-Wahl (Kira).**
  Oben stand nur »Zuhause 200/300« statt »Nacht 1 · Welle 2/3«. Nach der
  Wahl kam die Leiste zurück.
- **S3 – Enter schlägt durch (Kira).** Mehrere schnelle Enter-Drücke
  schlossen den Dialog nach dem Bau der Werkbank, öffneten die Werkbank und
  stellten sofort eine Spitzhacke her.
- **S4 – »Mika bewegt sich nicht« (Kira, mehrfach; Mira an der Hauswand).**
  Das passierte im Kampf unter der Wäscheleine und an der Anbau-Ecke. Mika
  blieb nach jedem Schlag bis zum Ende des Ausschwingens stehen; mit
  mehreren Klicks hintereinander wirkte das wie festgeklebt. Beim
  Nachstellen ohne Kampf glitt Mika um Bäumchen, Pfosten und Leine herum.

## Feinschliff

- **F1 – Pausenmenü (Kira):** Die Fußzeile nennt noch »Meilenstein 3«, und
  die Steuerung zeigt die Leertaste nur als »Dialog weiter«, nicht als
  Ausweichen.
- **F2 – Grammatik (Mira):** »Fäustlinge gebaut – liegt in der
  Schnellleiste«; »18 Schrott, 1 Zahnräder«.
- **F3 – »Schlagkraft: Schläge ×1,5« ist unklar (Mira):** Mehr Schaden oder
  mehr Schläge?
- **F4 – Morgenbericht (Mira):** »Keinen Kratzer abbekommen«, obwohl Mika
  bis 76/100 verletzt war. Der Satz meinte das Zuhause.
- **F5 – Gehaltenes E verwertet dreimal (Mira):** 9 Holz waren weg, gewollt
  war einmal verwerten.
- **F6 – »E Holz hacken« mitten im Kampf (Mira).**
- **F7 – Beute nicht auffindbar (Mira):** Eine Raute am Rand zeigte auf
  Loot, das sie nicht fand. Ein Schlurfer steckte unter dem Funkmast.
- **F8 – Hochformat 400 × 700 (Kira):** Teile der Oberfläche überlappen.
- **F9 – Werkbank merkt sich die Zeile (Mira):** Die Auswahl stand auf
  »Fäustlinge (schon da)«.

## Was gut ankam

- Mira mochte den Einstieg, die Schaukel (»Ich bin erwachsen. Aber es guckt
  ja keiner.«), das Lagerfeuer und die Abendstimmung (»Kühles Blau, warme
  Lichtinseln – genau wie beschrieben.«). Die Schlurfer wirkten »knuffig
  statt gruselig«. Mika war als goldener Umriss hinter dem Dach gut zu
  sehen, und die Baumvorschau mit Wegpunkten und Kreuzen war sofort klar.
- Die Waffen fühlen sich verschieden an: Die Fäustlinge schlagen 7/7/14,
  die Schaufel 16. Die Aufwertung über den Reiter »Figur« wurde gefunden.
- Kiras Stresstests hielten stand: Waffenwechsel im Schwung, Klick-Spam
  (gedrosselt), Eingaben während der Abblende, Neuladen bei offener
  Perk-Wahl und Aufwerten mitten in der Welle.

## Geändert (auf dem Hauptzweig, mit Meilenstein 5)

- **S1:** Die Perk-Wahl öffnet erst, wenn es ruhig ist. Dafür darf 0,8 s
  kein Schlurfer näher als 6 m sein, und Mika schlägt und rollt nicht.
  Solange wartet über der Schnellleiste ein pulsierender Hinweis »Perk-Wahl,
  sobald es ruhig ist«.
- **S2:** Die Nachtpläne entstehen gleich beim Laden, die Nachtleiste steht
  also sofort.
- **S3:** Die Werkbank stellt in den ersten 0,3 s nach dem Öffnen nichts
  her. Eine Sperre für E nach jedem Dialog wurde verworfen, weil sie das
  »E halten« beim Baumfällen verschluckte.
- **S4:** Sitzt der Schlag, darf Mika sofort loslaufen. Das Ausschwingen
  bricht dann ab, der nächste Schlag kommt trotzdem erst im Takt der Waffe.
- **F1:** Die Fußzeile lautet jetzt »Das Spiel speichert von selbst.«; die
  Steuerung zeigt »Leertaste: Ausweichen, Dialog weiter«.
- **F2:** Mengen haben die richtige Einzahl (»1 Zahnrad«, »1 Moderkern«,
  »1 Faser«). Bei Fäustlingen heißt es »liegen« und »sind«. Barrikaden
  sind richtig gezählt.
- **F3:** Neu: »Jeder Schlag macht ×1,5 Schaden.«
- **F4:** Neu: »Kein Brett locker, kein Nagel krumm. Das Frühstück schmeckt
  heute doppelt gut.«
- **F5:** Die zweite Umwandlung kommt erst nach 0,9 s Halten (vorher
  0,6 s).
- **F6:** Nachts treten Sammel-Einblendungen schon zurück, wenn ein
  Schlurfer näher als 12 m ist (andere Einblendungen weiter ab 6 m).
- **Prüfskript:** Neuer Prüfpunkt: Die Perk-Wahl wartet im Getümmel und
  öffnet danach.

## Offen

- F7 (Beute unter dem Funkmast), F8 (Hochformat), F9 (Werkbank-Zeile).
- Die nächste Runde prüft Meilenstein 4 und 5 gemeinsam.
