# Kira – m3-r2

Kontrollrunde Meilenstein 3, Sitzung `kira5`, rund 150 Brücken-Befehle.
Gespielt: Tag 1 bis Morgen von Tag 4. Nacht 1 verloren (Turm mitten in der
Welle absichtlich abgerissen), Nacht 2 mit drei Türmen gewonnen, Nacht 3 ohne
Turm absichtlich verloren. Dazu dreimal neu geladen: mitten in der Nacht, mit
offenem Morgenbericht und nach dem Bericht. **Die Konsole blieb in der ganzen
Sitzung leer** – kein Fehler, keine Warnung.

## Was Spaß gemacht hat

- **Neuladen ist sehr robust.** Mitten in Welle 2 neu geladen: Uhrzeit, Welle,
  Schlurfer (an denselben Stellen), Leben, Vorrat, Zuhause – alles war wieder
  da, und es ging nahtlos weiter. Mit offenem Morgenbericht neu geladen: Der
  Bericht war wieder offen, alle Zahlen gleich. Nach dem Bericht neu geladen
  (Tag 3): Vorrat, Ziel, Türme (erkennbar an den Preisen) und Zuhause gleich.
- **Die Niederlage fühlt sich fair an.** Nacht verloren → Abblende → Morgen
  06:30, Zuhause „notdürftig geflickt“ auf 75/300, ein Viertel Schrott weg
  (13 → 10, 32 → 24), Holz und Bauten bleiben. Nichts wird negativ, nichts
  hängt, und der Bericht nennt die Zahlen, die ich selbst mitgeschrieben habe
  (z. B. Nacht 2: 34 Schrott eingesammelt – das stimmt aufs Stück).
- **Ohnmacht sauber gelöst.** Ich stand gut 20 s ohne Gegenwehr im Pulk:
  „Mika wird schwarz vor Augen …“, Aufwachen im Haus mit 40/100, Meldung
  „Gerade noch ins Haus geschafft. Durchatmen – die Türme halten.“ Tasten
  während der Abblende (Esc, E, Q, Tab, V, Leertaste) wurden sauber verschluckt,
  kein Material verloren.
- **Viele Kira-Fallen sind schon zu.** Dreifachklick beim Platzieren baut nur
  einmal und bucht nur einmal ab. Auf einen Schlurfer kann man nicht bauen
  („Hier ist kein Platz.“). Den letzten Weg zuzubauen wird abgelehnt: „Die Horde
  braucht einen Weg zum Haus.“ Abreißen fragt nach („Nochmal drücken:
  abreißen“), V-Spam reißt nur einmal ab. Werkbank-Verwerten braucht gehaltenes
  E; E-Spam macht absichtlich nichts, Halten stoppt genau bei 1 Holz Rest.
  Reparieren ist während einer Welle gesperrt mit klarer Meldung („Erst die
  Welle abwehren – dann flicken.“), in der Pause zwischen den Wellen geht es.
  Das Bett lässt einen die Nacht nicht überspringen. „Neues Spiel“ fragt
  nach, „Lieber nicht“ ist vorgewählt, Enter-Spam landet sicher im Spiel.
- **Esc-Kette stimmt:** Platzieren abbrechen → Menü → zu. Das Pausenmenü geht
  auch über einem Dialog auf und kehrt korrekt zurück.
- **Bauen, Ausbauen, Abreißen mitten in der Welle** klappt ohne Zicken:
  Barrikaden neben den Schlurfern, Rasensprenger und Kürbiskatapult im
  Getümmel, Bolzenwerfer auf Stufe 2, Abriss mit 70 % Erstattung (16 → 11).
- Stimmung: Die Nacht mit Lichterketten, warmem Fenster und Lagerfeuer gegen
  das kühle Blau ist schön. Figur hinterm Dach als goldener Umriss,
  Schlurfer hinter Bäumen lavendel – das funktioniert meistens.

## Wo ich hängen blieb oder mich gelangweilt habe

- Die Figur bleibt rund ums Haus oft hängen: am Blumenbeet (dreimal), an der
  Werkbank, am Auto. Nördlich vom Auto (etwa 1,5 m neben der Straße) kam ich
  nicht nach Osten durch, obwohl dort sichtbar Gras war.
- In Nacht 1 standen die Schlurfer aus dem Nordwesten lange an der
  Wäscheleine herum, bis ich hinging. Der Axtkampf ist eher zäh: Die Figur geht
  nicht auf das Ziel zu, man muss nah stehen und oft klicken.

## Was unklar war

- Welle 2 von Nacht 1 kam, während noch ein Schlurfer aus Welle 1 an der
  Nordwand kratzte. Dadurch gab es in Nacht 1 **kein** Reparaturfenster. Ist das
  Absicht (nur reparieren, wenn das Feld wirklich leer ist)?
- Das Zuhause sieht bei 75/300 genauso aus wie bei 300/300. Den Schaden sieht
  man nur am Balken oben (ohne Zahl) und im Bericht.
- Kurz nach einer verlorenen Nacht meldete die Brücke noch 1–4 Schlurfer
  „außerhalb“, solange der Bericht offen war; nach dem Schließen waren sie weg.
  Sichtbar war davon nichts (keine Randmarke) – also nur ein Hinweis, kein
  Fehler.

## Fehler

### F1: Ein Tastendruck kauft Figur-Aufwertungen und Spezialisierungen ohne Rückfrage (Schwere: Spielfluss)
- Schritte: Tag 1, 9 Schrott. In der Bauleiste schnell `Q R T G C V Tab Q Tab
  Q Tab Tab V` gedrückt (wie beim Durchprobieren der Tasten).
- Erwartet: Tab wechselt nur den Reiter; etwas Unumkehrbares braucht wie das
  Abreißen einen zweiten Druck. / Passiert: Das Q nach dem ersten Tab hat im
  Reiter „Figur“ sofort „Sammelradius auf Stufe 1“ für 6 Schrott gekauft
  (9 → 3). Damit war der erste Bolzenwerfer nicht mehr bezahlbar, ich musste
  Holz und Stein verwerten. Genauso beim Turm: Q-Spam auf einen ausgewählten
  Bolzenwerfer baut Stufe 2 und versucht sofort die Spezialisierung
  „Scharfschütze“ (bei mir fehlte nur Schrott, das Zahnrad hatte ich). Die
  Wahl Scharfschütze/Repetierer kann so aus Versehen fallen. Abreißen fragt
  dagegen nach – das ist uneinheitlich.
- Screenshot: kira/01-tab-q-kauft-sammelradius.png

### F2: Großer Wellen-Banner steckt halb hinter der Meldungsbox (Schwere: Feinschliff)
- Schritte: Nacht 1, Welle 2 und 3; Nacht 2, Welle 2 abwarten.
- Erwartet: „Welle 2/3 · Westen“ gut lesbar. / Passiert: Der gelbe Banner-Text
  liegt genau hinter der Meldung „Welle 2 von 3 – aus dem Westen!“; nur die
  obere Hälfte der Buchstaben ist zu sehen. Jedes Mal wieder. (Ähnlich bei
  1280 × 720: „Bolzenwerfer gebaut“ verdeckt den Hinweis „E Schlafen“.)
- Screenshot: kira/02-wellenbanner-verdeckt.png

### F3: Morgenbericht meldet „Die Türme sind angeschlagen“, obwohl es keinen Turm gibt (Schwere: Feinschliff)
- Schritte: Alle Türme abreißen (nur zwei Barrikaden bleiben), Nacht verlieren.
- Erwartet: Satz passt zur Lage (z. B. „Die Barrikaden sind angeschlagen“ oder
  gar nichts). / Passiert: „Die Türme sind angeschlagen. Reparieren geht über
  die Bauleiste (Zuhause).“ – in Nacht 1 und Nacht 3, beide Male ohne Turm.
- Screenshot: kira/03-bericht-tuerme-angeschlagen.png

### F4: Nachts am Strommast ist nicht zu erkennen, wer wer ist (Schwere: Feinschliff)
- Schritte: Nacht 2, mit Laterne in den Gittermast laufen, ein Schlurfer ist
  in der Nähe.
- Erwartet: Mika als goldener Umriss, Schlurfer lavendel. / Passiert: Man
  sieht nur einen grauweißen Raster-Umriss und ein gelbes Quadrat (Laterne) –
  ich konnte nicht sagen, ob das Mika oder der Schlurfer ist. Ähnlich am Tag
  unter der großen Baumkrone im Kampf: Figur und Schlurfer verschmelzen zu
  einem grünlichen Fleck mit gelben Punkten.
- Screenshot: kira/04-nacht-am-mast-unlesbar.png

### F5: Reichweitenkreis beim Turmbau kaum sichtbar (Schwere: Feinschliff)
- Schritte: Q (Bolzenwerfer) im Gras neben dem Haus platzieren. Der Tooltip
  sagt „Kreis: Reichweite“.
- Erwartet: ein erkennbarer Kreis. / Passiert: Der Kreis besteht aus winzigen
  beigen Strichen, die aussehen wie Blümchen im Gras. Erst in der
  Vergrößerung habe ich ihn gefunden. Die roten Weg-Pünktchen sind dagegen gut.
- Screenshot: kira/05-reichweite-kaum-sichtbar.png

### F6: Bei sehr kleinem Fenster überlappt die Oberfläche (Schwere: Feinschliff)
- Schritte: `resize 300 200` (801 × 457 und 1280 × 720 waren in Ordnung).
- Erwartet: Bauleiste und Schnellleiste nebeneinander, Vorrat lesbar. /
  Passiert: Der Zuhause-Balken liegt über dem Vorrat, die Bauleiste über der
  Schnellleiste, das Ziel verschwindet hinter dem Hinweis. Kein Absturz, nach
  dem Zurückstellen wieder alles normal.
- Screenshot: kira/06-hud-ueberlappt-300x200.png

### F7: Mikas Warnung vor Nacht 3 passt nicht zum Vorrat (Schwere: Feinschliff)
- Schritte: Alle Türme abreißen (32 Schrott im Vorrat), Abend abwarten.
- Erwartet: z. B. „Schrott hätte ich genug – schnell einen Turm bauen!“ /
  Passiert: „Ohne Turm stehe ich da allein. Schrott finde ich in den Haufen am
  Waldrand und im alten Auto.“

### F8: Kollision größer als das Sichtbare (Schwere: Feinschliff)
- Schritte: Tag 1, nördlich am grünen Auto vorbei nach Osten laufen (Figur
  bei etwa z 9, Straße bei z 10,5).
- Erwartet: vorbeikommen, dort ist Gras. / Passiert: Die Figur bleibt stehen;
  erst gut 3 m nördlich vom Auto geht es weiter. Am Blumenbeet neben dem Haus
  bleibt man ebenfalls oft hängen.

## Checkliste

- Tag ruhig genug zum Bauen? – Ja. Ein einzelner Tagesschlurfer, leicht zu
  erledigen. „Bis zum Abend ausruhen“ und „Warten, bis die Horde kommt“ sind
  praktisch. Das Zuhause verfällt tagsüber nicht von selbst (146/300 blieb
  146/300).
- Nächte mit Action? – Ja: Wellen mit Richtungsansage, Randmarken mit Anzahl,
  Nacht 3 schon mit vier Wellen aus zwei Richtungen. Nacht 1 ist eher ruhig.
- Aufrüsten lohnend? – Soweit ich sah: Ausbau Stufe 2 für 8 Schrott, danach
  Spezialisierung für 14 Schrott + 1 Zahnrad. Mit Rasensprenger, Katapult und
  einem Bolzenwerfer hielt Nacht 2 ohne einen Kratzer. Genauer rechnen war
  nicht mein Ziel.
- Schwierigkeit gleichmäßig und fair? – Ja. Ohne Turm verliert man (gut so),
  mit drei Türmen gewinnt man deutlich. Die Figur hält im Pulk über 20 s aus,
  das ist gnädig.
- Look passt zu DESIGN.md? – Ja: scharfe Pixel, warme Lichtinseln gegen
  kühles Blau, Lichterketten, Durchsicht von Figur und Schlurfern. Schadens­
  zahlen und „+2“-Zahlen sind da. Das Zuhause zeigt Schaden aber nicht am Modell.
- Erkennt man, was was ist (Figur, Quellen, Bauten, Schlurfer, Türme, Loot)? –
  **Bei Tag** gut: Rasensprenger blau, Katapult mit orangem Kürbis,
  Bolzenwerfer holzgrau, Quellen haben klare Hinweise. **Bei Nacht** gemischt:
  Schlurfer erkennt man an den leuchtenden Augen, die Arten kaum (einer war
  bräunlich-groß, sonst alle grünlich). Mika ist nachts ein dunkler Fleck
  neben der Laterne. Loot liegt grau am Boden und ist nachts fast unsichtbar;
  Loot-Rauten am Rand habe ich nicht bemerkt. Am Mast und unter Baumkronen
  verschwimmt alles (F4).
- Macht Einsammeln Spaß? – Ja. Loot fliegt von selbst zur Figur, „+1“/„+2“
  schwebt kurz. Tagsüber: E halten mit Balken und Gedankenblase, Abbruch
  beim Weglaufen mit klarer Meldung („Abgebrochen – dabei stehen bleiben.“).
  „Heute leer – morgen wieder“ ist eindeutig.
- Bauleiste ohne Erklärung verständlich? – Überwiegend ja: Symbol, Preis,
  Taste, Tooltip mit Werten, rote Pünktchen für den Weg, klare Ablehnungs­
  gründe. Stolperstein: Der Reiter „Figur“ kauft beim ersten Tastendruck (F1),
  und dass Tab den Reiter wechselt, merkt man beim schnellen Tippen nicht.
- Motiviert das Aufleuchten? – Ja. Direkt nach dem Durchsuchen „Bolzenwerfer
  ist jetzt bezahlbar“ plus gelber Rahmen – das zieht sofort zum Bauen. Mit
  17 Schrott leuchtete die ganze Leiste, und ich wollte sofort etwas setzen.
- Speichern/Laden rund um die Nacht? – Sehr gut (siehe oben). Kein verlorener
  Spielstand, keine festhängenden Zustände, keine Konsolenmeldung.

## Gesamturteil (1–10) und wichtigster Wunsch

**8/10.** Ich habe es nicht kaputt bekommen: kein Absturz, keine
Konsolenmeldung, kein hängender Zustand, Spielstand in allen Lagen stabil. Die
Abzüge kommen von kleinen Oberflächen-Kanten und davon, dass man aus Versehen
Aufwertungen kaufen kann.

**Wichtigster Wunsch:** Kaufschutz für Unumkehrbares – Figur-Aufwertungen und
Turm-Spezialisierungen wie beim Abreißen mit „Nochmal drücken“ bestätigen
(oder nach einem Kauf kurz sperren), damit Tastenwiederholungen nichts kaufen.
