# Jonas – m5-r1

## Was Spaß gemacht hat

- Die Schläge fühlen sich sofort gut an: weißes Aufblitzen, eine kleine Schadenszahl, der
  Schlurfer taumelt kurz zurück – man merkt jeden Treffer, ohne dass es das Spiel ausbremst.
- Ausweichen (Leertaste) ist ein klarer, kurzer Sprung zur Seite mit sichtbarer Bewegungsspur.
  Mitten in einer Gruppe von vier, fünf Schlurfern damit rauszuspringen und gleich wieder
  reinzuhauen – genau das, was ich von einem Actionspiel will.
- Nacht 2, dritte Welle: sieben, acht Schlurfer gleichzeitig um mich rum, dazu einer, der
  sichtlich schneller unterwegs war als der Rest. Da war richtig was los.
- Die Perk-Wahl nervt nicht: sie poppt erst auf, wenn gerade kein Schlurfer zu sehen ist
  („Perk-Wahl, sobald es ruhig ist“ stand vorher schon unten), und dann reicht ein Tastendruck
  (1/2/3). Kein Textwust, drei Karten, fertig.
- Der erste Kill am Hackklotz-Nachbarbaum, das erste Mal die Werkbank benutzt, die erste
  eigene Waffe (ein Rechen!) – kam alles zügig hintereinander, kein langes Gebastel bevor
  man kämpfen darf.
- Die Welt bei Nacht sieht richtig gut aus: Glühwürmchen, ein Lagerfeuer, das leuchtende
  Fenster vom Zuhause, während drumrum alles kühl-blau bleibt. Mika selbst leuchtet leicht
  golden, wenn sie hinter was steht – hab sie nie verloren.

## Wo ich hängen blieb oder mich gelangweilt habe

- Ganz am Anfang: das Ziel sagte nur „Nimm die Axt vom Hackklotz“, aber es gibt keinen Pfeil,
  keinen Kompass, nichts, was in die Richtung zeigt. Ich bin erstmal in die falsche Richtung
  gelaufen und hab gut zehn Bewegungsbefehle gebraucht, bis ich den Hackklotz gefunden hab
  (Screenshot `jonas/01-start-tag1.png` ist von kurz danach).
- Genauso beim Autowrack fürs Schrott-Ziel: „Durchsuche Schrott“ stand oben, aber wo, wusste
  ich nicht. Ich bin praktisch einmal quer durch den halben Wald getappt, bis ich es gefunden
  hab.
- Nachts einzelne, schon vom Rudel getrennte Schlurfer querfeldein zu jagen war zäh: man
  rennt hinter einem Pfeil am Bildschirmrand her, der Schlurfer läuft aber selbst auch, und
  man braucht mehrmals nachjustieren, bis man wirklich dran ist. Für einen einzelnen Gegner
  hab ich da teils sechs, sieben Befehle gebraucht.
- Zwischendurch hab ich das Spiel testweise einfach laufen lassen, ohne selbst einzugreifen
  (wollte sehen, was ohne mich passiert) – und siehe da, das Zuhause ist in der ersten Nacht
  komplett gefallen. Nicht wirklich „gelangweilt“, aber überraschend, wie schnell das ging,
  wenn man nicht hinschaut.

## Was unklar war

- Ob ein Klick einen Schlag auslöst oder eine Bauauswahl öffnet, hängt offenbar davon ab, was
  genau unter dem Zeiger liegt – steht ein Schlurfer direkt neben der Werkbank oder dem
  Hackklotz, hab ich mehrfach stattdessen das Bau-Menü aufgemacht statt zuzuschlagen (siehe
  Fehler F1).
- Die Schlurfer sehen sich im Eifer des Gefechts ziemlich ähnlich. Die meiste Zeit über war es
  der gleiche grünlich-teale Typ mit Blume auf dem Kopf, aber zwischendurch tauchte einer mit
  rötlicher Kapuze auf, der sich merklich schneller bewegte, und einmal einer mit „20“ über dem
  Kopf statt der üblichen „10“ – also offenbar mit doppelt so viel Leben. Ich hab nie einen
  Namen oder eine Ansage dazu gesehen, nur die Zahl. Ob das jetzt eigene Arten sind oder nur
  Zufalls-Varianten, weiß ich als Spieler nicht – man merkt nur „der ist zäher“ oder „der ist
  fixer“, wenn man draufhaut.
- Ob der Schlurfer gerade ausholt oder gleich zuschlägt, hab ich im Getümmel selten bewusst
  gesehen – ich hab draufgehauen und gehofft. Erst in Screenshots hinterher sind mir erhobene
  Arme aufgefallen. In Echtzeit, mit drei Gegnern gleichzeitig, ist mir das nicht aufgefallen.

## Fehler

### F1: Klick auf Bau statt Schlag, wenn ein Schlurfer direkt daneben steht (Schwere: Spielfluss)
- Schritte: Neben einem gebauten Objekt (Werkbank, Hackklotz) stehen, ein Schlurfer läuft
  dicht daran vorbei; auf die Stelle klicken, an der der Schlurfer gerade steht.
- Erwartet: laut Kurzhinweis im Spiel („Klick schlägt“) sollte ein Schlurfer unter dem
  Zeiger immer Vorrang vor der Bauauswahl haben.
- Passiert: mehrfach öffnete sich stattdessen das Werkbank- bzw. Bau-Menü, kein Schlag
  erfolgte. Mitten im Kampf hat mich das einen Wimpernschlag und ein, zwei Treffer gekostet.
- Screenshot: `jonas/03-kampf-getuemmel.png` (ähnliche Ausgangslage, hier hat der Schlag
  aber gepasst – das Problem trat vor allem sehr dicht an Werkbank/Hackklotz auf).

### F2: Hackklotz und Werkbank liegen so nah beieinander, dass „E“ oft das falsche Ziel trifft (Schwere: Feinschliff)
- Schritte: zwischen Hackklotz und Werkbank stehen (die stehen bei mir nur wenige Schritte
  auseinander), E drücken.
- Erwartet: die Werkbank öffnet die Werkstatt.
- Passiert: mehrmals hintereinander kam stattdessen der „Ansehen“-Text zum Hackklotz („Die
  Axt habe ich schon eingesteckt“), obwohl ich eigentlich craften wollte. Mehrere Anläufe
  nötig, bis ich exakt auf der Werkbank-Plattform stand.
- Screenshot: `jonas/01-start-tag1.png` zeigt die generelle Nähe von Hackklotz und späterer
  Werkbank-Ecke.

### F3: Schnelle einzelne Schlurfer im Wald sind schwer zu fassen (Schwere: Feinschliff)
- Schritte: einem einzelnen, vom Rest der Welle getrennten Schlurfer abseits vom Zuhause
  hinterherlaufen.
- Erwartet: man holt ihn ein und der Klick landet.
- Passiert: mehrfach ist der Klick knapp danebengegangen, obwohl der Schlurfer laut
  Bildschirm direkt neben mir stand – vermutlich, weil er sich in der Zeit zwischen Klick 1
  und Klick 2 schon wieder wegbewegt hat. Kein Absturz, nur nervig.
- Screenshot: `jonas/02-nacht1-welle.png` zeigt so eine Verfolgung kurz vor dem eigentlichen
  Fehlschlag.

Keine Abstürze, keine Konsolenfehler bemerkt, kein Zustand, aus dem ich nicht mehr
rausgekommen wäre – alles oben ist Spielfluss oder Feinschliff, kein Blocker.

## Checkliste

- Tag ruhig genug zum Bauen? – Größtenteils ja, aber schon am ersten Tag haben streunende
  Schlurfer dem Zuhause ordentlich zugesetzt (laut Morgenbericht 82 Punkte Standfestigkeit
  bis zum Abend) – für mich als Actionspieler kein Problem, aber „ruhig“ würde ich das nicht
  nennen.
- Nächte mit Action? – Ja, klar. Vor allem ab Welle 2/3 waren ständig mehrere Schlurfer
  gleichzeitig auf dem Bildschirm.
- Aufrüsten lohnend? – Hab nur einen Turm (Stufe 1) und drei Perks geschafft, aber jeder
  Perk hat sich sofort angefühlt: mit „Dickes Fell“ und „Zweiter Atem“ ging ich merklich
  seltener runter, „Konter“ hat den Ausweich-Spielstil belohnt.
- Schwierigkeit gleichmäßig und fair? – Nacht 1 hab ich verloren (Zuhause ist komplett
  gefallen, siehe `jonas/05-nacht1-verloren.png`), weil ich zwischendurch nicht aktiv
  mitgekämpft hab. Nacht 2, gleiche Grundausstattung, aber durchgehend selbst gekämpft –
  gewonnen, Zuhause blieb bei 35/300 stehen (`jonas/06-nacht2-ueberstanden.png`). Fühlt
  sich also fair an: wer mitkämpft statt nur zuzuschauen, schafft es.
- Look passt zu DESIGN.md? – Ja, richtig gut sogar. Mika mit Wollmütze und Rucksack, die
  Schlurfer mit Blume auf dem Kopf, das kleine umgekippte Auto, die Wäscheleine im Wind –
  alles klar zu erkennen, nichts wirkt wie aus einem anderen Spiel geklaut.
- Erkennt man, was was ist (Figur, Quellen, Bauten, später Schlurfer, Türme, Loot)? – Ja.
- Erkennt man, was was ist (Figur, Schlurfer-Arten, Türme und Stufen, Werkzeuge/Waffen,
  Loot) – bei Tag und bei Nacht? – Bei Tag ohne Probleme. Nachts auch dank Eigenleuchten
  gut, außer im dichten Getümmel (drei, vier Gegner + Verdeckungs-Raster gleichzeitig) –
  dann wurde es unübersichtlich, wer gerade wen angreift. Turm-Stufen kann ich nicht
  beurteilen, ich hatte nie genug Schrott für ein Upgrade übrig.
- Wirkt die Welt lebendig (Animationen, Wind, Wäsche, Türme)? – Ja: Wäsche an mehreren
  Leinen wehte sichtbar, Glühwürmchen nachts, Lagerfeuer flackert, Holzspäne fliegen beim
  Hacken. Den Turm hab ich leider nie live schießen sehen – kein Schlurfer kam nah genug ran,
  während ich hinschaute.
- Passen Oberfläche und Szene zusammen, ist alles lesbar? – Ja. HUD-Schrift und Symbole
  bleiben groß und deutlich, obwohl die Szene selbst viel feiner geworden ist als das, was
  ich aus früheren Bildern kenne.
- Läuft es flüssig? – In der Bridge lief die Zeit sauber durch, auch über große Sprünge
  hinweg, keine Hänger oder Bildsprünge bemerkt. Zur echten Bildrate am eigenen Rechner kann
  ich nichts sagen.
- Fühlen sich Treffen, Ausweichen und Aufwerten gut an? – Ja, alle drei. Treffer: sofort
  klar durch Aufblitzen + Zahl. Ausweichen: knackiger kurzer Sprung, keine spürbare
  Verzögerung. Aufwerten: schnelle Wahl per Zifferntaste, kommt zwischen den Wellen, nie
  mitten im Schlag.

**Welche Waffe hab ich genommen und warum?** Den Rechen – einfach weil er als Erstes
bezahlbar war (6 Holz, 3 Schrott, 2 Fasern), während Bratpfanne und Fäustlinge mehr Schrott
bzw. Stoff brauchten, als ich zu dem Zeitpunkt hatte. Hat sich im Kampf gut angefühlt, mit
ordentlicher Reichweite. Die anderen Waffen konnte ich mangels Rohstoffen nicht ausprobieren.

## Gesamturteil (1–10) und wichtigster Wunsch

**7/10.** Der Kampf selbst – Treffer, Ausweichen, Perks – fühlt sich richtig gut an und macht
Spaß, und die Welt sieht deutlich feiner aus, als ich erwartet hätte. Was mich als Spieler,
der keine Texte liest, am meisten ausbremst: kein Pfeil oder Kompass zum aktuellen Ziel (ich
bin am Anfang mehrfach in die falsche Richtung gelaufen) und die Klicks, die manchmal ein
Bau-Menü statt eines Schlags auslösen, wenn ein Schlurfer dicht an einem Gebäude steht.
Wichtigster Wunsch: eine Richtungsanzeige zum aktuellen Ziel, damit man beim ersten Mal nicht
zehn Minuten querfeldein läuft, um den Hackklotz zu finden.
