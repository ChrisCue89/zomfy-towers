# PROGRESS – Logbuch

Neueste Einträge oben. Jeder Meilenstein: was fertig ist, was die
Testspieler gefunden haben, was geändert wurde, was offen bleibt.

---

## Meilenstein 10 – Balduin kommt übers Wasser ✓

**Auftrag:** den Händler aus M9 zum kleinen Ereignis ausbauen (DESIGN.md 8,
Meilenstein 10). Der Auftraggeber testet selbst; Balance und Geschichte
kommen später (seine Vorgabe).

**Fertig**

- **Einfahrt:** Das Boot taucht im Nordosten zwischen Nord- und Ostinsel
  auf und fährt eine weiche Kurve (Stützpunkte in `data/trader.js`) bis
  längsseits an den Steg. Hinten schäumt Kielwasser (`effects.foam`), dazu
  tuckert der Motor (Rechteckton mit 7-Hz-Puls, leiser in der Ferne, zur
  Seite des Boots, über den Umgebungsregler). Kurz vor dem Anlegen wirft
  Balduin die Leine im Bogen über den neuen Poller an der Stegkante; solange
  er handelt, hängt sie zwischen Bugklampe und Poller durch. Beim Ablegen ist
  sie wieder an Bord, das Boot dreht auf der Stelle und fährt zwischen Ost-
  und Südinsel davon. Die Kamera reicht dafür weiter nach Osten.
- **Balduin im feinen Look:** breites Grinsen mit Goldzahn, rote Wangen,
  hochgezogene Brauen, neuer Porträtausschnitt. Gesten am Steg: Er lüftet die
  Mütze, wenn Mika herankommt, reibt beim Warten die Hände (sie hat Teile
  dabei) oder krault den Bart, nach dem Handel Daumen hoch und Winken, ohne
  Handel ein Schulterzucken. Der Hinweis beim ersten Besuch erscheint schon,
  wenn das Boot auftaucht (zusammen mit der Fanfare), nicht erst am Steg.
- **Besondere Turmteile:** Fernrohr (+25 % Reichweite), Schmierfett (+25 %
  Tempo bzw. Aura) und Glücksmünze (jeder Abschuss lässt sicher Zombieteile
  fallen). Balduin bietet an geraden Tagen ab Tag 4 eines an (10–12 Teile).
  Eingebaut wird über die Turm-Auswahl (eigene Kachel), das Teil sitzt als
  kleines Modell am Turm (Fernrohr oben am Kopf, Ölkanne am Fuß, Münze vorn),
  beim Abreißen kommt es zurück. In den Laternenturm passt keine Münze.
  Werte zentral über `towerStatsOf` (mit Zwischenspeicher am Bau).
- **Spielstand v9:** Vorrat an Turmteilen und das Teil am Bau; Migration
  v8 → v9 ergänzt einen leeren Vorrat.
- **Soundtrack (M10d, Wunsch des Auftraggebers: »slow cozy, und nachts beim
  Angriff rhythmisch treibend«):** neues Modul `audio/music.js` mit drei
  Stücken als Noten-Daten und eigenen Instrumenten (FM-E-Piano,
  Karplus-Strong-Gitarre, Flöte, Spieluhr, Streicher, Trommeln, erzeugter
  Hall). Tagsüber und auf dem Titelbild »Morgen am See« (F-Dur, 76 Schläge
  pro Minute) mit Ruhe zwischen den Durchgängen, abends »Laternenzeit«
  (d-Moll, 66), während der Wellen »Die Horde kommt« (d-Moll, 126) in drei
  Stufen je nach Lage. Die Nacht blendet sofort über, Schlafen blendet aus,
  Balduins Fanfare duckt. Die alte Zufallsmelodie und der einfache
  Nachtrhythmus sind ersetzt.
- **Klang-Technik:** Jeder Ton hängt sich nach dem Verklingen selbst aus dem
  Klang-Graphen ab (vorher erst bei der nächsten Speicherbereinigung – das
  kostete mit der Zeit Rechenzeit, auch bei den Effekten), und Effekte mit
  Richtung, Vögel und Grillen teilen sich feste Stereo-Ausgänge statt je
  einen neuen. Gemessen im
  Container: Audio-Thread mit Musik gut 10 %, gleich ob Tag oder Nacht; die
  Gitarre ist auf 0,01 Hz genau gestimmt, kein Stück übersteuert.
- **Prüfung:** neue Punkte für Einfahrt zwischen den Inseln, Leine, Gesten
  und Turmteile (Kauf an Tag 4, Einbau mit echter Taste, Teile von jedem
  Abschuss, nach dem Neuladen noch am Turm, keine Münze im Laternenturm),
  Musik (tagsüber »tag«, bei der Welle »nacht«, alle Stücke offline
  berechnet: keine Übersteuerung, nicht stumm); alle Stände werden jetzt zu
  v9.

**Nicht in M10:** Upgrades und Werkzeuge bei Balduin (Balance, M13),
Nebenaufträge (Geschichte, später). Entscheidungen: OFFENE-FRAGEN 89–93.

---

## M9.1 – Nach der Rückmeldung des Auftraggebers ✓

**Rückmeldung (Auftraggeber als Testspieler):** Nacht 1 ist okay, könnte etwas
schneller oder voller sein (»ein Turm und bisschen Handarbeit regelt«);
nicht jeder Schlurfer soll Teile verlieren (Turm 1/2, von Hand sicher);
Barrikaden sind nicht als solche erkennbar, sollen 1 Holz kosten und schnell
kaputtgehen; Handel klappt (Balance später); Balduin soll sich nach dem Handel
verabschieden und bei der Ankunft epische Musik spielen; kleiner Fehler: nach
dem Handelsfenster erst schlagen, dann laufen. Wege, Spawns und
Übersichtskarte sind gut.

**Geändert**

- **Barrikaden neu:** im feinen Maß als Spanischer Reiter – dunkler Balken
  quer über den Weg, je Feld ein kräftiges Kreuz aus hellen, angespitzten
  Pfählen, rot-weißer Warnlappen; verstärkt mit Eisenbändern, eisernen
  Spitzen und zweitem Kreuz; Metallkreuz als rostiger Stahligel. Die Kreuze
  zeigen auf den west-östlichen Wegen zur Kamera, eine Reihe ist eine Kette
  aus Kreuzen – auch nachts gut zu sehen. Neues Symbol in der Bauleiste.
  Kosten und Haltbarkeit: 1 Holz / 20, +2 Holz / 55, +1 Holz und 4 Schrott /
  140 (fängt ein Viertel ab). Alte Barrikaden werden auf die neue Haltbarkeit
  gekappt; wer noch einen Stand von vor M9 hat, bekommt weiter 3 Holz zurück.
  Abreißen gibt 70 % gerundet zurück – eine versetzte Holzbarriere ihr 1 Holz.
- **Zombieteile:** von Hand erschlagen immer, durch Türme jedes zweite Mal,
  der Anführer immer (`PARTS_FROM_TOWERS`).
- **Balduin:** Fanfare bei der Ankunft (Schiffshorn, Paukenwirbel, drei Takte
  Blechbläser in D-Dur, der Schlussakkord fällt aufs Anlegen), alles im
  Klang-Baukasten erzeugt; nach dem Handel sagt er beim Schließen des Fensters
  Tschüss (Sprechblase über ihm, er winkt) und legt ab. Die neue letzte Zeile
  »Tschüss, Balduin!« schließt das Fenster auch ohne Esc. Morgenbericht:
  »Balduin wartet bis 12 Uhr am Steg«.
- **Fehler »erst schlagen, dann laufen«:** im Browser nicht nachzustellen
  (dort läuft Mika sofort). Vermutlich reichte die Artefakt-Seite Esc weiter
  und nahm dem Spiel den Tastaturfokus. Esc gehört jetzt dem Spiel
  (Capture-Phase, `preventDefault`, `stopPropagation`). Verliert das Spiel
  den Fokus trotzdem, steht »Zum Weiterspielen ins Bild klicken« im Bild, und
  der Klick, der ihn zurückholt, schlägt nicht mehr zu.
- **Nächte:** alle Arten 10 % schneller, Budget +3 (Nacht 1: 33).
- **Prüfung:** neue Punkte für die Teile-Regel, den Abschied mit Ablegen und
  die Fanfare bei der Ankunft; Barrikaden-Werte angepasst. Volle Prüfung
  112 Prüfpunkte grün (»Abreißen« nach der Rundung im Abschnitt `bauen`
  nachgeprüft), Konsole sauber.

**Entscheidungen:** OFFENE-FRAGEN 84–88.

---

## Meilenstein 9 – Die Bucht und die Wege ✓ (großer Umbau)

**Auftrag:** das neue Grundkonzept umsetzen (DESIGN.md 0, OFFENE-FRAGEN
63–74). Diesmal testet der Auftraggeber selbst – keine Testspieler-Agenten.

**Fertig**

- **Karte (`world/map.js`):** 96 × 60 m. Rechts der Stillsee mit Inseln und
  treibenden Wellen (`water.js`), am Ufer die feste Bucht: altes Fischerhaus,
  Hof als letzte Verteidigung, Steg nach Osten, Bootswrack am Strand,
  Leuchtmast am Stegende. Links ein Wegenetz, das bei jedem neuen Spiel aus
  einem Startwert entsteht (`state.world.mapSeed`): drei Spawns am linken
  Rand (Nordweg, Mittelweg, Südweg) mit Warnpfählen und fahlgrünen Laternen,
  Zuführungen mit Verzweigung, gemeinsamer letzter Abschnitt in den Hof.
  Begehbar sind Bucht, Steg und die Streifen neben den Wegen; zwischen den
  Wegen stehen Waldinseln.
- **Herbst:** Gelände neu gemalt (Herbstwiese mit Laub, Erdwege, Sand und
  Kiesel am Ufer, Seegrund), Laubbäume in Orange, Rot und Gelb, gelbe
  Birken, dazwischen Tannen; südlich von Wegen und Bucht nur niedriger
  Bewuchs, damit keine Krone den Weg verdeckt.
- **Übersichtskarte (M):** das ganze Wegenetz mit Spawns, Türmen,
  Barrikaden, Schlurfern, liegenden Überresten und Mika; das Spiel steht still.
- **Wege der Horde:** Flussfeld nur über Weg und Hof (Wegmitte billiger),
  alle Schlurfer laufen danach und schlagen Barrikaden ein (Brummer und
  Anführer doppelt); wer hinter Mika her vom Weg abkommt, findet über ein
  eigenes Feld zurück. Die Wegvorschau beim Bauen ist geblieben.
- **Bauen:** Türme und alle anderen Bauten nie auf Wegfeldern, Barrikaden nur
  dort (der Geist sagt, warum nicht). Barrikaden mit drei Stufen
  (Holzbarriere, verstärkt, Metall), sichtbarem Schaden, Trümmern, die
  liegen bleiben, und Wiederaufbau am Tag; sie stellen sich von selbst quer
  zum Weg. Türme schauen anfangs nach Westen.
- **Tag und Morgen:** tagsüber nur einzelne Schlurfer; Überreste bleiben drei
  Spieltage liegen (auch über das Schlafen), eine verlorene Nacht räumt sie
  nicht mehr ab.
- **Balduin:** kommt mit seinem Boot über den See, legt am Steg an und
  handelt dort; neues Aussehen als Seebär (Schiebermütze, Bart, roter Schal,
  dunkler Mantel, riesiger Rucksack). Das Boot: blauer Rumpf, Steuerhaus,
  Kisten, Fass und die Einmachgläser mit der grünen Brühe.
- **Überlebende** auf Plätzen in der Bucht; Knopf bellt ohne Richtung, Juna
  meldet morgens, wie viele Wellen und welche Arten kommen (OFFENE-FRAGEN 74).
- **Spielstand v8:** Startwert der Karte; Migration erstattet Türme und
  Barrikaden der alten Lichtung, stellt Werkbank, Beete, Bänke, Laternen und
  Zelte in der Bucht neu auf (sonst Erstattung), setzt Quellen, Überreste und
  Horde zurück. Ein neues Spiel über einem alten Stand lädt einmal neu
  (frische Karte, Name und Aussehen bleiben).
- **Tempo und Druck:** Schlurfer rund ein Viertel schneller, weil die Wege
  lang sind. Wellen dichter gestaffelt (über höchstens 20 statt 30 Sekunden,
  sonst räumte jeder Turm die Gruppen einzeln ab) und etwas mehr Budget
  (Nacht 1: 30, Nacht 5: 82 – M8: 26, 74).
- **Jagd um Bauten:** Steht zwischen einem Schlurfer und Mika ein Bau oder
  Hindernis, sucht er über eine kleine Breitensuche um Mika (12 Felder
  Umkreis) den Weg außen herum, statt davor festzuhängen. Wer vor dem Haus
  auf der Fläche künftiger Anbauten steht (im Raster gesperrt), greift an,
  statt vor der Wand zu zappeln.
- **Prüfung:** neuer Abschnitt `wege` (Karte, Horde auf den Wegen,
  Barrikadenreihe bis zu Trümmern und Wiederaufbau, Überreste drei Tage,
  Tagesschlurfer, Übersichtskarte, Speichern v8, Migration v7 → v8); alle
  übrigen Abschnitte auf die Bucht umgestellt. Volle Prüfung: 111
  Prüfpunkte grün, Konsole sauber.

**Entscheidungen:** OFFENE-FRAGEN 75–83 (Kartengröße, Spawn-Markierung,
Hof, Wegfeld-Regel, Barrikadenwerte, Leuchtmast, neues Spiel lädt neu,
Tempo, Tagesschlurfer). Nr. 66 bleibt offen (Stand vermerkt).

**Offen / nächste Schritte:** Rückmeldung des Auftraggebers abwarten;
M10 (Balduins Ankunft als Ereignis), M11 (Innenraum als eigenes Bild),
M12 (Herbst, Wetter, Lesbarkeit), M13 (Balance über viele Nächte).

---

## Neues Grundkonzept: die Bucht und die Strecke

**Anlass:** Der Auftraggeber hat das Konzept überarbeitet und ein Konzeptbild
geschickt (Bucht am See mit Fischerhaus und Steg, eine Strecke aus dem Wald
mit Türmen auf runden Plattformen links und rechts und Holzbarrikaden auf
dem Weg; nachts dieselbe Szene mit Mond und Feuer; Balduin als bärtiger
Seebär am Steg; ein gemütlicher Innenraum mit Kamin; Turm- und
Barrikadenstufen; Schlurfer-Arten). Die zwölf Grundregeln sind jetzt
verbindlich und ersetzen ältere Annahmen.

**Überarbeitet**

- `DESIGN.md` neu gefasst: Abschnitt 0 mit den Grundregeln, Karte und
  Strecke (6.2), Barrikaden mit vier Stufen (6.10), letzte Verteidigung
  (6.12), Zuhause am Wasser (6.8), Balduin mit Boot (6.15), Herbst-Look
  (3), neuer Meilensteinplan M9–M13.
- `OFFENE-FRAGEN.md` 63–74: eine Strecke, feste Baupunkte, feste
  Barrikadenplätze, kein Mazing, keine Tagesschlurfer, Überreste bis
  Mittag, Balduin per Boot, Kamera nach Norden (See oben), Pixel-Look nur
  noch als Stilmittel, Bootswrack statt Auto, Leuchtmast am Steg, alte
  Spielstände. Ersetzte Antworten (1, 2, 3, 8, 53, 59, 61, 62) sind
  markiert.
- `CLAUDE.md`: Grundregeln des Spiels als eigener Abschnitt.

**Festgelegt vom Auftraggeber (OFFENE-FRAGEN 63–74):** kein einzelner
Weg, sondern ein bei jedem Spiel teilweise prozedurales Wegenetz mit etwa
drei Zuführungen, die vor der Basis zusammenlaufen (lang genug für 50–60
Türme); die Wege laufen von links (Landseite, Spawns) nach rechts (Basis an
der Küste); Türme frei neben den Wegen, Barrikaden frei auf den Wegen (Holz,
später Metall, Metallkreuze); tagsüber ganz vereinzelte Schlurfer;
Überreste halten bis zu drei Tage. Offen bleibt Nr. 66 (Umlenken durch
Bauten, Wegvorschau): bis zur Klärung wird davon nichts entfernt.

**Folgen für den Code:** Bis Meilenstein 8 spielt alles auf der alten
Waldlichtung (vier Waldpfade, Mazing auf dem Raster, Tagesschlurfer,
Balduin mit Bollerwagen über die Straße). Meilenstein 9 baut Karte und
Verteidigung nach dem neuen Plan um, Meilenstein 10 bringt Balduins Boot.

---

## Meilenstein 8 – Nach dem ersten Probespielen (läuft)

**Anlass:** Nach dem eigenen Probespielen kam vom Auftraggeber: Die Zeit
vergeht zu langsam, die Schlurfer sind keine Herausforderung (schon gar
nicht in Nacht 1), drinnen soll es ein eigenes, schöneres Bild geben (wie in
Stardew Valley), dass das Autowrack jeden Tag Schrott hergibt, ist
unglaubwürdig – ein Händler, der morgens Rohstoffe gegen Zombieteile
tauscht, wäre besser –, und die Pixel lassen zu wenig erkennen. Plan in
DESIGN.md (Meilenstein 8), Entscheidungen in OFFENE-FRAGEN 56–62.

**Fertig – 8.1 Tempo und Herausforderung**

- Eine Spielminute dauert 0,4 s statt 0,6 s (ein Tag rund 9 Minuten).
- Nachtbudget 26 + 8·(n−1) + (n−1)² (Nacht 1: 26 statt 18 Punkte), ein
  Viertel Flitzer schon in Nacht 1. Schlurfer 0,8 m/s, Biss 7; jede Art
  spürt Mika aus eigener Entfernung (Flitzer 6,5 m, Schlurfer 4,5 m,
  Schwärmer 5 m, Brummer 3,5 m statt 3,2 m für alle). Zuhause-Schaden 80 %.
- Nachgemessen in festen Schritten, Mika untätig: zwei Bolzenwerfer
  verlieren Nacht 1–3 (nah am Haus wie weit draußen); die Prüfung mit drei
  Türmen (einer ausgebaut) hält Nacht 1 mit 30 Abschüssen und vollem
  Zuhause. Volle Prüfung grün (85 Prüfpunkte).

**Fertig – 8.2 Zombieteile und Balduin**

- Schlurfer lassen **Zombieteile** fallen (eine grünliche Hand mit
  Ärmelrest), neue Ressource mit eigenem Symbol und Klang; beim ersten Fund
  »Zombieteile! Igitt. Vielleicht will die jemand haben …«.
- **Balduin**, der Händler: lila Zylinder mit Feder, Monokel, weißer
  Schnauzer, Flickenmantel mit Fläschchen am Gurt. Ab Tag 2 zieht er um
  06:40 seinen Bollerwagen von Osten heran (Räder drehen sich, Rumpeln,
  Glöckchen beim Anhalten), handelt bis 12:00 und zieht dann weiter (Staub
  beim Wenden). Der Wagen: lila-gelb gestreiftes Sonnendach mit wehenden
  Fransen, Kiste, Fass, Sack, Einmachgläser mit trüber grüner Brühe – in
  einem schwimmt ein Auge.
- Handeln im Fenster der Werkbank (»Balduins Bollerwagen«, Spruch des Tages
  oben): 3 Teile → 2 Schrott immer, dazu täglich zwei Sonderangebote
  (Holz, Stein, Fasern, Stoff, Zahnrad höchstens zweimal, alle sechs Tage ein
  Moderkern). E tauscht einmal, gehalten weiter.
- Erstes Treffen als Dialog mit Porträt, danach öffnet E direkt den Wagen.
  Neues Ziel nach der ersten Nacht, Ziel-Pfeil zu ihm, Zeile im
  Morgenbericht.
- Sein Stand ist morgens nicht bebaubar (»Balduins Stand«); steht dort etwas,
  hält er an einem anderen Platz. Mika stößt sich am Wagen, die Horde läuft
  hindurch (nicht im Flussfeld).
- **Autowrack nur einmal**, Schrotthaufen alle zwei Tage.
- Die Kamera folgt jetzt bis an die Straße (Grenze z 9 statt 7,5).
- **Spielstand v7** mit Migration (Wrack ausgeräumt, wenn es schon
  durchsucht war; Zombieteile bei null).
- Prüfskript: neuer Abschnitt `haendler` (Autowrack, Haufen, Ankunft, Stand,
  Dialog und Handel mit echten Tasten, Vorrat, Abfahrt, Speichern v7,
  Migration v6 → v7), Bilder `haendler` und `handel`; Loot-Prüfung zählt
  Zombieteile.

**Offen:** 8.3 Innenraum als eigenes Bild, 8.4 Detailgrad, danach eine
Testrunde.

---

## Abschlussrunde m7-r1 über das ganze Spiel und Nachbesserung

**Testspieler:** Kira 8/10, Jonas 8/10, Mira 7/10, Theo 7/10 – Berichte und
Auswertung in `playtests/m7-r1/` (`ZUSAMMENFASSUNG.md`). Keine
Konsolenmeldung in über 1 000 Brücken-Befehlen, kein Absturz, kein kaputter
Spielstand. Einstieg vom Titelbild, Turmvorschau, Kampf, Knopf und Look
kamen durchweg gut an.

**Gefunden:** Schlurfer, die Mika jagten, hingen hinter Werkbank oder Beet
fest – stundenlang, ohne anzugreifen, nicht zu treffen (Mira, Theo). Nach
drei verlorenen Nächten schwiegen die Türme, eine Spirale ohne Ausweg
(Theo). Nach Nacht 1 fielen die Nächte oft schon in der ersten Welle:
Nachgemessen entschied vor allem der Platz der Türme, und ein Trupp, der
durchkam, brauchte für das Zuhause nur Sekunden. Verdeckte Schlurfer waren
schwer zu treffen (Jonas). Das Verlassen der Seite in der Figurwahl legte
einen leeren Spielstand an (Kira). Dazu Tasten, die nicht wirkten (W/S im
Dialog und in der Perk-Wahl), Hängenbleiben im Haus, »Kein Platz« ohne
Grund, Hämmern auf E an der Werkbank.

**Geändert**

- Jagende Schlurfer erkennen, wenn sie festhängen, und geben die Jagd
  kurz auf (neuer Prüfpunkt).
- Türme fallen nach verlorenen Nächten nie unter ein Drittel (OFFENE-FRAGEN
  54); Schläge aufs Zuhause zählen 60 % (52); Mika warnt eine Stunde vor
  der Horde vor einem Weg ohne Turm, zwischen den Wellen eine Meldung (53,
  neuer Prüfpunkt).
- Zielmarke um den Schlurfer unter dem Zeiger: golden in Reichweite, sonst
  blass.
- Ohne Spielstand wird erst ab »Los geht’s!« gespeichert (neuer Prüfpunkt).
- Richtungstasten wirken in Dialogen sofort, W/S auch in der Perk-Wahl;
  Regler klemmen am Anschlag; Mika gleitet weiter um Möbel herum (0,7 m);
  der rote Geist nennt den Grund für »Kein Platz«; die Schaukel drängt sich
  nicht mehr vor Bäume; die Werkbank baut beim Hämmern auf E nichts.
- DESIGN.md: offene Wege (6.11), Türme nach Niederlagen und Tagesgrenze
  drei Viertel (6.12).

**Offen:** Zielpfeil ohne Entfernung; späte Nächte (ab 5) nicht aktiv
gespielt.

---

## Meilenstein 6 – Playtest-Runde m6-r1 und Nachbesserung

**Testspieler:** Mira 8/10, Kira 8/10 – Berichte und Auswertung in
`playtests/m6-r1/` (`ZUSAMMENFASSUNG.md`). Jonas und Theo wurden vom
Nutzungslimit abgebrochen; sie spielen in der Abschlussrunde mit. Keine
Blocker, keine Konsolenmeldung. Überlebende, Funkturm-Geschichte und
Einrichten kamen sehr gut an.

**Gefunden (Spielfluss):** Im Haus lag zwischen Tisch und Ostwand eine
schmale Sackgasse, die wie ein Durchgang aussah (Kira steckte dort schon in
m5-r1 fest). Eine Richtungstaste während des Tippens verschob die Vorwahl der
Ausruhen-Rückfrage auf »Bis zum Abend ausruhen«. E traf oft Laterne oder
Hackklotz statt der Person daneben. Das Schlafzelt (8 Holz, 3 Stoff) war
früh kaum zu bezahlen.

**Geändert**

- Tisch bis kurz vor die Ostwand verlängert; die ganze Hütte (beide Stufen,
  mit und ohne Möbel) in 5-cm-Schritten mit der echten Bewegung abgetastet –
  keine Falle, kein abgeschnittener Bereich.
- Richtungstasten verstellen die harmlose Vorwahl nicht mehr (weder beim
  Fertigzeigen der Zeile noch in der kurzen Sperre danach).
- Personen in Reichweite gehen Nur-Anschauen-Dingen immer vor.
- Schlafzelt 6 Holz und 2 Stoff (OFFENE-FRAGEN 51).
- Zuhause nie unter null; Warnung vor dem Abriss eines bewohnten Zelts;
  dasselbe Ding ruht nach einem Gespräch nur 0,5 s; Knopf sagt beim Einzug,
  wie er hilft; die Textansicht der Brücke zeigt Zielpfeil und was für die
  Gemütlichkeit zählt.
- Nacht-Balance nachgemessen (eine Nacht mit 1 bzw. 2 Türmen, Mika
  untätig): liegt in den Zielen von DESIGN.md 6.17 und bleibt, wie sie ist
  (OFFENE-FRAGEN 52).

**Offen:** Mika hinter hohem Möbelstück unsichtbar (Kira) nicht
nachgestellt; Jonas und Theo in der Abschlussrunde.

---

## Meilenstein 7 – Feinschliff ✓

**Fertig**

- **Klang (Web Audio, ohne Dateien):** Effekte aus Rauschen und kleinen
  Oszillatoren für Schritte (drinnen auf Holz), Sammeln, Kampf, Türme,
  Einsammeln, Bauen, Aufwerten, Stufenaufstieg, Wellenhorn, Schlurfer, Knopf,
  Dialog-Tippen je Stimme und das Glöckchen der Bauleiste. Ferne Klänge
  werden leiser und kommen von der Seite. Umgebung: Wind, Vögel, Grillen,
  Feuer. Musik: Abendmelodie und Rhythmus in den Wellen, sanft ein- und
  ausgeblendet. Der Klang startet mit der ersten Eingabe (Konsole bleibt
  sauber).
- **Titelbild:** Schriftzug über der Lichtung im Abendlicht, die Kamera
  zieht langsam darüber. Weiterspielen, Neues Spiel, Einstellungen,
  Steuerung.
- **Name und Aussehen:** Name (bis 12 Zeichen) sowie Mütze, Jacke, Haare
  und Haut, live an der Figur. Texte und Porträt übernehmen beides.
  Spielstand v6 mit Migration.
- **Einstellungen:** Lautstärke, Musik, Geräusche, Pixelgröße (ein
  ganzzahliger Schritt mehr Überblick oder näher dran), Text-
  geschwindigkeit. Sie liegen neben dem Spielstand, auch im Pausenmenü.
- Neues Spiel aus dem Pausenmenü führt über die Figur.
- Prüfskript: Titelbild, Figur mit getipptem Namen und anderer Mütze,
  Spielstand v6.

**Offen**

- Abschluss-Playtest über das ganze Spiel.

---

## Meilenstein 6 – Überlebende, Geschichte und Einrichten ✓

**Fertig**

- **Fünf Überlebende**, alle im feinen Maß (1/16 m) mit eigenem Porträt:
  Knopf (struppiger Hund, Tag 2), Oma Hilde (Postbotin mit Lastenrad, Tag
  3), Juna (Funkbastlerin, Tag 4), Bert (Baumarkt-Veteran, Tag 5), Dr. Yusuf
  (Tierarzt, Tag 6). Sie kommen an erkennbaren Orten an, winken, laufen zu
  ihren Plätzen um Feuer und Hütte und schlafen nachts im Zelt; Knopf
  wedelt, bellt, sitzt und liegt nachts am Feuer.
- **Kennenlernen → Gast → Einzug:** Dialoge mit Antworten, Zelte über den
  neuen Reiter »Einrichten«, Bewohner werden wieder Gäste, wenn ihr Zelt
  verschwindet.
- **Aufträge:** Beim Einzug bittet jeder um etwas (Ziel-Feld): Hildes Schal
  (+15 Lebenspunkte), Licht an Berts Zelt (Zahnräder), Kamille für Dr.
  Yusuf (stärkerer Tee); Junas Auftrag ist der Funkturm.
- **Fähigkeiten:** Knopf bellt vor jeder Welle mit Richtung und buddelt
  Schrott aus; Hilde tauscht täglich und bringt Morgengaben; Juna belauscht
  die Horde am Funk; Bert halbiert Reparaturkosten und flickt nachts Türme;
  Dr. Yusuf kocht Tee und verarztet Mika einmal je Nacht.
- **Roter Faden:** Funkturm in drei Stufen mit Juna bis zum Leuchtfeuer,
  das jede Nacht brennt und Schlurfer in seinem Schein bremst.
- **Einrichten:** Sechs Möbel an festen Plätzen in der Hütte und ein
  Körbchen für Knopf; Gemütlichkeit bringt morgens Erfahrung, ab 5 ist Mika
  »ausgeschlafen«. Morgengaben, Tee, Funk und Gemütlichkeit stehen im
  Morgenbericht.
- Spielstand v5 mit Migration (alte Stände: Überlebende zählen ab dem
  Umstieg), Prüfskript mit eigenem Abschnitt »ueberlebende« (Ankunft,
  Knopf mit echten Tasten, Einzug, Tauschen, Aufträge, Einrichten,
  Morgen, Funkturm, Bellen vor Welle 1, Speichern v5, Migration v4 → v5).

**Offen**

- Weitere Zuhause-Stufen nach der Hütte (OFFENE-FRAGEN 43).
- Playtest-Runde für Meilenstein 6.

---

## Meilenstein 4 und 5 – Playtest-Runde m5-r1 und Nachbesserung

**Testspieler:** Kira 8/10, Mira 8/10, Jonas 7/10, Theo 6/10 – Berichte und
Auswertung in `playtests/m5-r1/` (`ZUSAMMENFASSUNG.md`). Keine Blocker, keine
Konsolenmeldung, auch nicht bei Kiras Belastungstest mit Fenstergrößen von
320 × 900 bis 2560 × 1440. Detailgrad, Nachtoptik, Nahkampf und die
aufgeschobene Perk-Wahl kamen gut an.

**Gefunden (Spielfluss):** Das erste Ziel (Axt am Hackklotz) und der Schrott
für den ersten Turm waren schwer zu finden. Streuner nagten das Zuhause
tagsüber unbemerkt bis zur Hälfte herunter (Theo verlor so alle vier
Nächte). Knapp neben einem Schlurfer wählte ein Klick den Bau dahinter aus.
Bei sehr schmalen Fenstern rutschte die Oberfläche aus dem Bild. Die Brücke
lief noch mit 640 × 360 – seit Meilenstein 5 sind das nur 8 m Sicht.

**Geändert**

- Ziel-Pfeil: ein kleiner goldener Pfeil über dem Ort des Ziels bzw. am
  Bildrand – Axt am Hackklotz, nächste Schrottstelle für den ersten Turm
  (OFFENE-FRAGEN 49).
- Streuner nagen tagsüber höchstens bis drei Viertel und langsamer
  (OFFENE-FRAGEN 50).
- Klick nah am Schlurfer ist ein Schlag; Oberflächen-Maßstab auch nach
  der Fensterbreite; Loslaufen schließt den Morgenbericht.
- Reparieren mit % in der Kachel, wenn der Vorrat nur für einen Teil
  reicht; Waffen an der Werkbank mit Zahlen; Stein 2 : 1 zu Schrott;
  Perk-Hinweis erst, wenn die Wahl Tasten annimmt; der Hackklotz drängt sich
  nach der Axt nicht mehr vor die Werkbank.
- Playtest-Brücke mit 1280 × 720; Prüfskript mit längeren Wartezeiten für
  Echtzeit-Abläufe (unter Last lief sonst der Schlaf-Test in 60 s ab).

**Offen:** Klick setzt Turm nicht (Theo) nicht nachgestellt; Lesbarkeit der
Arten im Getümmel; Waffen kaum ausprobiert (Schrott knapp).

---

## Meilenstein 4 – Playtest-Runde 1 (m4-r1, abgebrochen) und Nachbesserung

**Verlauf:** Die vier Testspieler-Agenten wurden nach rund einer Stunde vom
Nutzungslimit gestoppt (»resets 4am UTC«), bevor Berichte entstanden. Kira
spielte bis zum Sieg in Nacht 1, Mira bis Tag 2; Jonas und Theo kamen nicht
ins Spiel. Die Notizen der beiden stehen unverändert in `playtests/m4-r1/`,
die Auswertung in `ZUSAMMENFASSUNG.md`. **Umweg:** Die nächste Runde prüft
Meilenstein 4 und 5 gemeinsam, sobald die Agenten wieder laufen.

**Gefunden (Spielfluss):** Ein Angriffsklick wählte ungesehen einen Perk;
nach dem Neuladen bei offener Perk-Wahl fehlte die Nachtleiste; schnelle
Enter-Drücke stellten an der Werkbank ungewollt etwas her; im Getümmel
wirkte Mika nach jedem Schlag festgeklebt.

**Geändert**

- Perk-Wahl erst im ruhigen Augenblick, bis dahin ein pulsierender Hinweis
  über der Schnellleiste (OFFENE-FRAGEN 36).
- Laufen bricht das Ausschwingen nach dem Treffer ab, der Takt der Waffe
  bleibt (OFFENE-FRAGEN 37).
- Nachtleiste sofort nach dem Laden; die Werkbank stellt in den ersten
  0,3 s nach dem Öffnen nichts her; zweite Umwandlung erst nach 0,9 s
  Halten. (Eine E-Sperre nach jedem Dialog fiel in der Prüfung durch – sie
  verschluckte »E halten« am Baum – und wurde zurückgenommen.)
- Texte: richtige Einzahl bei Mengen (»1 Zahnrad«), »Fäustlinge … liegen«,
  »Jeder Schlag macht ×1,5 Schaden«, Morgenbericht über das Zuhause statt
  über Mika, Pausenmenü mit Ausweichen und ohne veraltete
  Meilenstein-Fußzeile.
- Nachts treten Sammel-Einblendungen schon ab 12 m Schlurfer-Nähe zurück.
- Prüfskript: Perk-Wahl wartet im Getümmel und öffnet danach.

**Offen:** Beute unter dem Funkmast, Hochformat-Fenster, Werkbank merkt
sich die Zeile.

---

## Meilenstein 5 – Detailgrad und Animationen ✓

Antwort auf »zu grob gepixelt, man erkennt nicht, was was ist«: Die
Mechaniken aus Meilenstein 1–4 bleiben, aber die Welt ist jetzt doppelt so
fein und bewegt sich.

**Fertig**

- **Auflösung:** 80 Spielpixel pro Meter (vorher 40), die Szene hat rund
  900 Bildzeilen. Die Oberfläche liegt auf einer eigenen Leinwand mit 360
  Zeilen – Schrift, Symbole und Leisten bleiben so groß und scharf wie
  bisher. Kamera, Umrisse, Dithering und Palette sind darauf abgestimmt.
- **1/16-m-Voxel** für Mika, alle Schlurfer-Arten, alle Türme, Werkzeuge,
  Waffen und Beute. Jede Art hat eigene Merkmale: Gänseblümchen, rote
  Kapuze, Fliegenpilz-Kappen, Warnkegel und -weste, Leuchthut, Geweihkrone
  mit Moosumhang. Türme zeigen ihre Stufe mit kleinen Fahnen.
- **Animation:** Laufzyklus mit Kopfnicken und Blinzeln, Zusammenzucken bei
  Treffern, eigene Gangart je Schlurfer-Art (Schlurfen, Stampfen,
  Trippeln), Rückstoß der Schlurfer in Schussrichtung, Rückstoß und
  Wurfarm der Türme, Türme schauen sich ohne Ziel um, Wind in Gras und
  Blumen, flatternde Wäsche an der Leine.
- Beute als kleine Modelle (Schrottbrocken, Zahnrad, Moderkern) statt
  Würfeln; Werkzeuge ruhen schräg in der Hand.
- Volle Prüfung bestanden, alle Screenshots neu. Leistung in Headless
  (Software-WebGL): Tag 50 ms/Bild bei 346 Draw-Calls, Nacht 50 ms/Bild bei
  442 Draw-Calls.

**Offen**

- Natur und Gebäude bleiben im 1/8-m-Raster (bewusst, DESIGN.md 3.6);
  die Überlebenden aus Meilenstein 6 entstehen gleich im feinen Maß.
- Playtest-Runde für Meilenstein 5 (siehe Eintrag m4-r1).

---

## Meilenstein 3 – Kontrollrunde (m3-r2) und Nachbesserung

**Testspieler:** Kira 8/10, Mira 8/10, Jonas 7/10, Theo 7/10 (vorher 6, 7, 6,
7) – Berichte und Auswertung in `playtests/m3-r2/` (`ZUSAMMENFASSUNG.md`).
Kein Absturz, keine Konsolenmeldung, Neuladen in allen Lagen stabil. Die
Nacht ist jetzt lesbar; gebremst haben Käufe per Tastendruck, Schläge ins
Leere, übersehene Wege zur Rückwand, Hängenbleiben und eine zu flache
Schwierigkeit.

**Gefunden (Spielfluss)**

- Ein Tastendruck kaufte Aufwertungen und Spezialisierungen ohne Rückfrage.
- Schläge gegen Schlurfer am Waldrand wirkten nicht (sie galten noch als
  »im Wald«), knapp außer Reichweite ging jeder Klick ins Leere.
- Mika im Getümmel nicht zu finden – ihr Umriss wurde vor den Schlurfern
  gezeichnet und schien deshalb nie durch einen Schlurfer durch.
- Mikas Tipp »Nah am Haus kommen alle vorbei« führte die ersten Türme vor
  die Tür; die Wege zur Rückwand sah man nicht.
- Hängenbleiben an Tonne, Beet, Kiste am Auto, Veranda und Sitzstamm.
- Ausruhen im Sessel verpasst, wer Rückfragen wegdrückt.
- Nach Nacht 1 leichter statt schwerer; Reparieren fast gratis; Loot ohne
  Eile; Scharfschütze fast wirkungslos.

**Geändert**

- Kaufen fragt per Taste nach (»Nochmal drücken«), Mausklick kauft sofort.
- Ausfallschritt beim Schlag (bis 1,1 m), Schlurfer am Waldrand treffbar;
  dicht am Schlurfer schlägt jeder Klick zu, statt einen Turm auszuwählen.
- Umriss-Reihenfolge: Mika scheint gold durch Schlurfer und Türme, Türme
  hell durch das Dach; Mika hat nachts einen Hauch Eigenlicht.
- Beim Bauen: größere rote Wegpunkte, rote Kreuze an den Ankunftsstellen am
  Haus, Pfeile für Wege aus dem Bild, ein kräftiger Reichweitenkreis, der
  Ablehnungsgrund direkt unter dem Geist; die Hinweis-Tafel ist schmaler und
  weicht dem Geist aus.
- Um Ecken gleiten (Mika schaut kurz voraus, auf welcher Seite es
  weitergeht); Kiste am Auto versetzt, Türhilfe breiter, Regentonne weicht
  dem Hüttenanbau; festgefahrene Schlurfer weichen quer aus.
- Werkbank: ein Druck verwertet einmal, gehalten geht es weiter, mit Zähler.
- Esc schließt Dialoge; Wellen-Meldung ohne Doppelung unter dem Banner;
  Gedanke »Bett« erst später; Einblendungen nachts schon ab 6 m aus.
- Sessel und Bank: »Hinsetzen und ausruhen«, Antworten mit Zielzeit, ein
  Gedanke am ersten Nachmittag.
- Nachts funkelnde Rauten über Beute im Bild; Standfestigkeit als Zahl;
  Morgenbericht mit Stand beim Aufwachen und passendem Schlusssatz.
- Balance: Nächte ab Nacht 2 steiler (18, 26, 36, 48, 62 …), ein
  Gepanzerter schon in der letzten Welle von Nacht 3, Reparieren teurer,
  Loot zerfällt nach 90 s, Scharfschütze deutlich stärker.
- Prüfskript: Werkbank (einmal tippen, dann halten), Schriftprüfung mit
  beiden Abend-Sätzen.

**Offen**

- Tagesinhalt nach 10 Uhr (Meilenstein 6), Stoff/Fasern ohne Zweck.
- Sehr kleine Fenster (300 × 200), Turm hinter der Nachtleiste, Morgenlicht.
- Arten nachts im Pulk – Meilenstein 5 (1/16-m-Modelle mit eigenen Merkmalen).

---

## Meilenstein 4 – Nahkampf, Waffen und Perks ✓

**Fertig**

- **Waffen:** Schaufel (ausgewogen), Bratpfanne (langsam, wuchtig, betäubt),
  Rechen (Reichweite, trifft bis zu fünf), Fäustlinge (schnelle Folge,
  jeder dritte Treffer doppelt) – gebaut an der Werkbank, zweimal
  aufwertbar über die Bauleiste (Reiter »Figur«, Taste C). Mika schlägt mit
  dem, was sie in der Hand hat; ohne Werkzeug mit den Fäusten. Eigene
  Modelle in der Hand und Symbole.
- **Nahkampf:** Klick schlägt in Mausrichtung, gedrückt halten schlägt
  weiter, ein Klick mitten im Schwung wird vorgemerkt. Schwung-Bogen,
  Trefferstopp, Kamerawackeln, Rückstoß, betäubte Schlurfer taumeln
  (gelblicher Schimmer, kreisender Kopf).
- **Ausweichen** mit der Leertaste: kurze Rolle, unverwundbar, bricht einen
  Schwung ab; Hinweis beim ersten Waffenbau.
- **Erfahrung und Perks:** Abschüsse geben Erfahrung (Nahkampf doppelt),
  Stufenbalken über der Schnellleiste; jede Stufe eine Wahl aus drei von
  neun Perks (Sammlerherz, Konter, Flickschusterin, Rückendeckung, Zähe
  Natur, Flinke Hände, Dickes Fell, Glückspilz, Zweiter Atem). Das Spiel
  hält dafür an; eine offene Wahl wird mitgespeichert.
- Neues Ziel »Baue an der Werkbank eine Waffe«.
- Tastendrücke im Trefferstopp gehen nicht mehr verloren (vorher konnte
  ein Druck genau dann verpuffen).
- Spielstand v4 mit Migration; Prüfskript mit Waffe, Treffer, Betäubung,
  Rolle, Erfahrung, Perk-Wahl, Waffen-Aufwertung und Speichern.

**Offen**

- Playtest-Runde für Meilenstein 4.

---

## Meilenstein 3 – Playtest-Runde 1 (m3-r1) und Nachbesserung

**Testspieler:** Kira 6/10, Jonas 6/10, Mira 7/10, Theo 7/10 – Berichte und
Auswertung in `playtests/m3-r1/` (`ZUSAMMENFASSUNG.md`). Kein Absturz, die
Konsole blieb in allen vier Sitzungen leer. Der Kreislauf »Schrott holen →
Leiste leuchtet → Turm → Nacht → Bericht« trägt; gebremst hat vor allem, dass
man nachts zu wenig sieht.

**Gefunden (Spielfluss)**

- Nachts nur Augenpaare: Schlurfer, Türme und Loot sind im Dunkeln nicht zu
  erkennen; Angreifer hinter dem Dach und Mika im Getümmel verschwinden.
- Woher kommt die Welle? Die Richtung stand nur ein paar Sekunden da,
  Randmarken waren winzig; liegengebliebenes Loot fand man nur zufällig.
- Vorhut am Abend: Tagesschlurfer fraßen das Zuhause unbemerkt bis auf
  11–32 von 300 auf; der Wert sprang dabei, und eine verlorene Nacht heilte
  das Haus sogar.
- Sofort-Reparieren mitten in der Welle machte das Zuhause unverwundbar,
  eine Teilreparatur gab es nicht.
- Werkbank verschluckte Bestätigungen und verwertete dann mehrfach; Dialoge
  (»Ich sollte bald ins Bett«) hielten mitten in der Welle an; ein
  Angriffsklick wählte den Turm dahinter aus, ein zweites R riss ihn ab; an
  der Nordkante rutschte Mika unter die obere Leiste.
- Balance: Bolzenwerfer streuen war immer richtig (1,9 Schaden/s je Schrott,
  Stufe 2 nur 1,0), Zahnräder kamen einmal in drei Tagen, Nacht 3 hatte mehr
  als doppelt so viele Schlurfer wie Nacht 2; tagsüber ab 09:00 Leerlauf.

**Geändert**

- Nachts Eigenlicht (Material-Zusatz `selfLight`) für Schlurfer, Bauten,
  Loot und Geistermodell; Loot funkelt; Bolzen mit Leuchtspur, heller
  Wasserfächer (tröpfelt auch ohne Ziel); Reflektorstreifen am Brummer.
- Umrisse durch Dach und Bäume (Schlurfer lavendel, Mika gold), große
  Randpfeile mit Anzahl, Haus-Marke bei Angriffen außerhalb des Bildes,
  Rauten für Loot außerhalb; Nachtleiste mit »Aus: Westen« bzw. »Gleich:
  Osten«; Einblendungen treten im Getümmel zurück.
- Tagsüber nagen Streuner mit 40 % und nie unter die Hälfte, Alarm mit Wand
  und Banner, verpasste Streuner kommen nach dem Ausruhen nicht alle auf
  einmal; verlorene Nacht flickt auf ein Viertel, nie besser als vorher;
  nachts rettet sich Mika ins Haus statt die Nacht zu verlieren.
- Reparieren: in der Welle gesperrt, sonst anteilig, etwas teurer.
- Morgenbericht: ehrlicher Schaden mit Stand danach, Schaden vor der Nacht
  extra, Loot nach der letzten Welle zählt mit, Beute draußen, ein Gedanke
  von Mika zum Schluss; bleibt nach dem Neuladen.
- Werkbank verwertet mit gehaltenem E (Balken); Abend- und Spät-Hinweis als
  Gedankenblase; Schlurfer unter dem Zeiger gehen beim Klick vor, Abreißen
  auf V ohne goldenen Rahmen; Kamera folgt 2 m weiter nach Norden.
- Balance: Staffelpreis je Turmart (+2 Schrott, höchstens +8), Stufe 2
  billiger und stärker, Laternenturm +25 % in 3,8 m und bremst im Licht,
  Zahnräder öfter, Punkte der Nacht gleichmäßig (18/25/32/41/52), schwere
  Arten nur, soweit die Welle sie trägt; Sammelradius ab 2 m, Loot liegt
  zwei Minuten.
- Kleinkram: Bett bietet tagsüber »Bis zum Abend ausruhen«, Intro nennt
  Nächte und Türme, Tafel beim Setzen erklärt Kreis und Pünktchen (Wege bei
  jedem Bau), »Nacht« ab 20:30, Mini-Schrift mit allen Buchstaben (»TAB«,
  Spezialisierung A/B waren unsichtbar), »Bolzenwerfer · Stufe 2«, Werte auf
  der Tafel beim Setzen per Taste, Esc-Schonfrist 2 s nach dem Setzen,
  kurzes Aufsammeln läuft zu Ende, Sperre nach Dialogen 0,5 s, runde
  Türme und schlankere Figur gegen Engstellen, Menü-Fußzeile.
- Prüfskript: Werkbank (kurz tippen / halten), Tages-Untergrenze,
  Staffelpreis, Richtung in der Nachtleiste, Reparieren in der Welle und
  anteilig, Abreißen nur auf V, Randmarke für Loot.

**Offen**

- Schlurfer-Arten und Turmstufen sieht man am Modell kaum – Meilenstein 5.
- Nahkampf aus 1,5–2 m ohne Wirkung und sichtbaren Schwung – Meilenstein 4
  (Waffen mit Reichweite, Schwung-Bogen).
- Ein Turm hinter der Hütte kann nach dem Hüttenausbau den Durchgang
  sperren; Spezialisierung und Reparatur leuchten nicht auf; Lebenskraft und
  Tempo lohnen kaum – mit Meilenstein 4 prüfen.

---

## Meilenstein 2 – Kontrollrunde (m2-r2) und Nachbesserung

**Testspieler:** Jonas 7/10 (vorher 5/10), Theo 8/10 (vorher 7/10) –
Berichte und Auswertung in `playtests/m2-r2/` (`ZUSAMMENFASSUNG.md`).
Kein Blocker mehr: Jonas kam ohne Lesen durch den Einstieg, Theo schaffte
alle Ziele samt Hütte an Tag 1.

**Gefunden (Spielfluss)**

- Durchsuchen ohne sichtbaren Fortschritt, stiller Abbruch beim Loslaufen,
  Auto-Dialog klang nach »heute schon leer«.
- Werkbank: Auswahl sprang auf ein Verwerten-Rezept, ein Tastendruck zu viel
  kostete Stein.
- Fällbare Bäume schwer erkennbar, unter der Krone keine Reichweite, Tag 2
  ohne Holz, Stümpfe ohne Hinweis aufs Nachwachsen.
- Werkbank unter der Wäscheleine nur von hinten benutzbar; Einblendung und
  Reichweite von E passten nicht zusammen.

**Geändert**

- Fortschrittsbalken über Mika beim Durchsuchen und Ernten, Meldung beim
  Abbruch, neuer Auto-Text.
- Werkbank: Verwerten braucht einen zweiten Druck, die Auswahl springt nur
  auf Werkzeuge.
- Bäume: rot-weißes Markierband, Reichweite bis unter die Krone, Absage an
  Waldbäumen und Gestrüpp, Stümpfe sagen, wann sie nachwachsen, und treiben
  am Tag davor aus; drei zusätzliche Astbündel (täglich), versteckter Felsen
  versetzt.
- Bauten und Quellen haben Vorrang vor Nur-Anschauen; Einblendung und E mit
  gleichem Spielraum; ein Tipp während des Schwungs merkt den nächsten Schlag
  vor; nach dem Fällen kurze Sperre gegen Sprünge zum Nachbarn.
- Bauleiste: Preise in zwei Zeilen (Hütte zeigt alle vier), Abriss-Kachel
  zeigt die Rückgabe, Wirkung auch beim Bauen per Taste, Aufleuchten
  höchstens alle 45 s je Option, Esc gleich nach dem Setzen öffnet nicht das
  Menü, nicht bauen auf Rohstoff-Zellen.
- Barrikaden geben beim Abriss wie Türme 70 % zurück (OFFENE-FRAGEN.md Nr. 9).
- Schlurfer tragen leuchtende Moderpilzchen am Hinterkopf – nachts sieht man
  sie auch von hinten.

**Offen**

- Leeres Beet sieht erntereif aus, Faserbüsche ähneln Blumen – kommt mit
  Meilenstein 5 (Detailgrad).

---

## Meilenstein 3 – Nächte, Türme und Loot ✓

**Fertig**

- **Die Horde:** sechs Arten mit eigener Silhouette (Schlurfer mit Blume,
  Flitzer mit Kapuze, Schwärmer mit Pilzkappen, Brummer mit Leitkegel und
  Panzerplatten, Leuchtpilz mit glühendem Hut, Anführer mit Geweihkrone und
  Moosumhang), leuchtende Augen, Schlurf- und Schlaganimation, Aufblitzen
  bei Treffern, Rückstoß, Zerfallen in Moos. Gezeichnet mit Instancing
  (bis 110 Schlurfer je Art).
- **Wege:** vier Waldpfade, zwei Flussfelder auf dem Bauraster (Bauten
  sperren; Brummer schlagen sich durch Barrikaden), Ablehnung eines Baus,
  der den letzten Weg abschneidet, Angriff auf die nächste Hauswand.
  **Wegvorschau** beim Turm- und Barrikadenbau: rote Punkte laufen die Wege
  entlang.
- **Nächte:** ab 20:30 Wellen aus angesagter Richtung (Banner, Meldung,
  Randmarken), jede Nacht mehr Wellen, mehr Schlurfer, mehr Leben und neue
  Arten (Flitzer ab Nacht 2, Schwärmer 3, Brummer 4, Leuchtpilze 6),
  Anführer jede fünfte Nacht. Tagsüber träge Einzelgänger und kleine Trupps.
  Warnung um 20:00, Hinweis um 19:00 ohne Turm. Nacht-Leiste mit Welle und
  Standfestigkeit des Zuhauses.
- **Vier Türme** mit fünf Stufen und je zwei Spezialisierungen (Bolzenwerfer:
  Scharfschütze/Repetierer, Kürbiskatapult: Feuer-/Streukürbis,
  Rasensprenger: Frostnebel/Schlammschleuder, Laternenturm:
  Leuchtfeuer/Glückslaterne), drehender Kopf, Geschosse, Spritzer,
  brennender Boden, Auren, Stufen-Plaketten am Sockel.
- **Loot:** Schrott, Zahnräder, Moderkerne fallen, wo ein Schlurfer stirbt,
  fliegen im Sammelradius zur Figur, blinken und zerfallen nach 75 s.
- **Bauleiste** mit den Reitern Türme · Figur · Zuhause: Turm wählen,
  setzen, anklicken → Stufe 2, Spezialisierung A/B, weitere Stufen,
  Reparieren, Abreißen (70 %). Figur-Aufwertungen: Sammelradius,
  Lebenskraft, Schlagkraft, Tempo.
- **Nahkampf (Übergang):** Klick schlägt mit Axt oder Faust (Bogen,
  Trefferstopp, Rückstoß, Schadenszahlen, ein Pixel Kamerawackeln),
  Lebenspunkte mit Regeneration, Bank heilt sofort.
- **Verlorene Nacht:** Zuhause auf null oder Mika am Boden → Keller,
  Morgen; ein Viertel Schrott und ein Zehntel der Tagesmaterialien weg,
  Bauten angeschlagen, Zuhause bei der Hälfte – nie Spielende. Tagsüber
  bricht nichts durch. **Morgenbericht** nach jeder Nacht.
- Schlafen erst nach der Nacht; Ausruhen abends nur bis kurz vor der Horde.
- Ziele: Axt → erster Turm → erste Nacht → Werkbank → Spitzhacke →
  Barrikaden → Turm auf Stufe 3 → Hütte.
- Spielstand v3 mit Migration (Leben, Standfestigkeit, Aufwertungen, Nacht,
  Horde, Loot und Turmstufen werden gespeichert).
- Prüfskript: Turm, Ablehnung, Abschuss, Loot, Ausbau, Welle, gewonnene und
  verlorene Nacht, Bericht, Migration v2 → v3.

**Balance (Simulation mit fester Schrittweite, passive Figur)**

- Nacht 1 mit drei Bolzenwerfern am Haus: gewonnen, Zuhause 300/300. Mit
  zwei Türmen am Haus hält es zwei Wellen, die dritte aus der offenen
  Richtung bricht durch – mit etwas Nahkampf ist sie zu halten.
- Türme weit weg vom Haus (6 m vor der Tür): verloren. Daraus entstand die
  Wegvorschau und Mikas Hinweis »Nah am Haus kommen alle vorbei«.
- Nacht 2 mit drei Türmen: gewonnen (260/300); Nacht 3 mit vier Türmen,
  zwei davon Stufe 2: gewonnen (300/300); Nacht 5 (Anführer) mit fünf
  Türmen bis Stufe 3: bis 02:00 ohne Schaden am Zuhause (Simulation dort
  beendet).

**Offen**

- Playtest-Runde für Meilenstein 3.

---

## Meilenstein 2 – Playtest-Runde 1 und Nachbesserung

**Testspieler:** Jonas 5/10, Mira 8/10, Theo 7/10, Kira 7/10 – Berichte und
Auswertung in `playtests/m2-r1/` (`ZUSAMMENFASSUNG.md`).

**Gefunden**

- Blocker: Ohne Lesen kam man nicht an Stein (Kiesel unsichtbar, Felsen nur
  mit Spitzhacke, Werkbank verbrauchte allen Stein).
- Spielfluss: Flachsbeet-Trick (abreißen, neu bauen, wieder ernten), Stein
  an Tag 1 zu knapp und zu langsames Nachwachsen, Quellen nicht von der
  Kulisse zu unterscheiden, ein E-Druck löste zwei Dinge aus, Bauten nur am
  Fuß anklickbar, kaum Treffer-Gefühl beim Sammeln.
- Feinschliff: Meldungen über dem Ziel, abgeschnittene Titel und Preise,
  fehlende Hinweise auf Rennen, leere Quellen ohne Hinweis u. v. m.

**Geändert**

- Stein: Werkbank 2 statt 4, Spitzhacke 2 statt 3, Hütte 12 statt 16 (Stoff
  5 statt 6); fünf sichtbare Steinhaufen auf Erdflecken; Nachwachsen nach
  2 Tagen (Gras nach 1).
- Lesbarkeit: rote Stoffbänder an fällbaren Bäumen, auffällige Faserbüsche
  und Astbündel, versteckten Felsen und Schrotthaufen versetzt, Axt und
  Spitzhacke farblich getrennt, neues Symbol für den Hüttenausbau.
- Treffer-Gefühl: Wackeln mit Pulsen, Zusammensacken mit Staub und Laub.
- Bauen: Auswahl über den ganzen Bau plus Rahmen unter der Maus, belegte
  Felder rot markiert, neues Beet erst morgen reif, E wird beim Setzen
  verbraucht, Bauleiste mit Häkchen, gekürzten Preisen, lesbaren Titeln.
- Hinweise: gedimmt »Heute leer – morgen wieder« / »Spitzhacke nötig«,
  Zielmarkierung am Boden, E mit etwas Spielraum, Meldungen unter dem Ziel
  und über der Werkbank, »1 Schrott gewonnen«, Startzeile mit Rennen,
  Zähler am Barrikaden-Ziel.
- OFFENE-FRAGEN.md Nr. 9 (bestätigt) und Nr. 20 (Stein am Anfang).

**Offen**

- Kontrollrunde (Jonas, Theo) auf dem nachgebesserten Stand.

---

## Meilenstein 2 – Sammeln, Crafting und Bauen ✓

**Fertig**

- Ressourcenquellen auf der Lichtung: 12 Bäume (Axt, 4 Schläge, +6 Holz),
  3 Felsen (Spitzhacke), Kiesel, hohes Gras, Äste (mit der Hand), drei
  Schrotthaufen und das Autowrack (einmal am Tag durchsuchen: Schrott, Stoff,
  selten ein Zahnrad). Erschöpfte Quellen wachsen nach 1–4 Tagen nach
  (Baumstumpf bleibt stehen). Schwung- und Aufhebe-Animation, Späne,
  Laub, schwebende »+n« mit Symbol; **E gedrückt halten** sammelt weiter.
- Axt aus dem Hackklotz, Spitzhacke von der Werkbank; das passende Werkzeug
  nimmt Mika von selbst. Laterne auf der linken Hand (Taste F), die
  Schnellleiste hält Werkzeuge.
- **Bauleiste** unten rechts (Reiter »Zuhause«): Werkbank, Barrikade,
  Laternenpfahl (mit Lichtinsel), Flachsbeet (jeden Tag Fasern ernten),
  Sitzbank (ausruhen), Ausbau zur Hütte. Symbol, Preis mit Mini-Symbolen,
  Füllbalken »wie nah bin ich dran?«, Ausgrauen, Aufleuchten mit Glitzern,
  Tastenkürzel Q R T G C V, Hinweis-Tafel mit dem, was fehlt.
- **Platzieren** auf dem 1-m-Raster: Geistermodell (gerastert, grün/rot
  getönt), belegte Felder, schwaches Raster rundum; Maus oder – ohne Maus –
  vor der Figur mit E; Mausrad dreht; Esc/Rechtsklick bricht ab. Barrikaden
  und Lampen bleiben nach dem Setzen gewählt (Wand ziehen).
- **Auswählen** per Klick oder E vor dem Bau; die Leiste zeigt dann
  »Abreißen« (zweimal drücken, volle Rückgabe).
- **Werkbank** mit Rezepten: Spitzhacke, Holz/Stein zu Schrott, Fasern zu
  Stoff.
- **Hüttenausbau** mit Abblende (»Hämmern, sägen, schrauben …«, zwei Stunden
  vergehen): Anbau mit Sessel, Regal und Stehlampe, Veranda mit Geländer
  und Blumentöpfen. Die Grundfläche ist von Anfang an reserviert.
- **Ziel-Anzeige** unter der Uhr führt durch die ersten Schritte (Axt →
  Werkbank → Spitzhacke → drei Barrikaden → Hütte).
- Spielstand v2 mit Migration (Technik → Zahnräder, Laterne aus der
  Schnellleiste), Bauten, Ausbaustufe, erschöpfte Quellen und Durchsuchtes
  werden gespeichert.
- Prüfskript mit echten Tasten und Mausklicks für alle neuen Abläufe
  (u. a. Mausklick trifft genau das angeklickte Feld).

**Nachbesserung aus Meilenstein 1, Runde 2** (Auswertung in
`playtests/m1-r2/ZUSAMMENFASSUNG.md`): harmlose Antwort vorgewählt (kein
ungewolltes Schlafen/Ausruhen beim Durchdrücken), Morgensatz als Sprechblase
statt Dialog, Tageskarte kürzer und überspringbar, Einlaufhilfe an der Tür,
dasselbe Ding öffnet nicht sofort wieder, Esc im Dialog öffnet das Menü,
Intro nach Neuladen, größerer Steinkreis am Feuer, schmale Fenster.

**Neu im Plan (Wunsch des Auftraggebers):** Der Detailgrad ist zu grob –
man erkennt nicht, was was ist. Sobald die Mechaniken sitzen, kommt ein
eigener Meilenstein »Detailgrad und Animationen« (DESIGN.md 3.6 und
Meilenstein 5; Überlebende werden Meilenstein 6, Feinschliff 7). Testspieler
prüfen ab jetzt in jeder Runde »Erkennt man, was was ist?«.

**Offen**

- Playtest-Runde für Meilenstein 2 – erledigt, siehe oben.

---

## Meilenstein 1 – Playtest-Runde 1 und Nachbesserung

**Testspieler:** Jonas 7/10, Mira 8/10, Theo 7/10, Kira 6/10 – Berichte und
Auswertung in `playtests/m1-r1/` (`ZUSAMMENFASSUNG.md`).

**Gefunden**

- Blocker: Nach »Neues Spiel« lag »Ja, neu beginnen« unter dem Mauszeiger
  (Doppelklick = Spielstand weg).
- Spielfluss: Tastendrücke während der Schreibmaschine »verpufften«;
  schnelles Durchdrücken bestätigte ungesehene Antworten; ein ruhender
  Mauszeiger überschrieb die Tastaturwahl; Neuladen während des Ausruhens
  verlor den Weg seit dem letzten Speichern.
- Feinschliff: Rauschbild beim Start, grünliche Laterne, Bett durch die Wand
  benutzbar, Schlafschleife nach dem Aufwachen, fehlende Texte.

**Geändert**

- Menü: sichere Rückfrage (»Lieber nicht« unter dem Zeiger und vorgewählt,
  Klicksperre nach Seitenwechsel), Maus wählt nur bei Bewegung.
- Dialoge: schneller tippen, Antwort-Sperre 0,3 s, Hinweis »W/S wählen ·
  E bestätigen«, Pfeiltasten zeigen den Text sofort ganz.
- Stille Sicherung auch während Ausruhen/Schlafen.
- Titelkarte beim Start, warme Laterne, Innen-Dinge nur von drinnen, Bett
  ruht nach dem Aufwachen, Regentonne mit Text, kräftigere Durchsicht.
- Playtest-Brücke: `look` zeigt nur den schon getippten Dialogtext, ob die
  Zeile fertig ist und welche Antwort markiert ist (»> …«).
- OFFENE-FRAGEN.md Nr. 14: Ausruhen bleibt kostenlos.

**Werkzeug-Notizen**

- Die Tester haben die Brücke gut bedient; zwei Befunde entstanden aus dem
  angehaltenen Spiel zwischen Befehlen (Schreibmaschine). Deshalb zeigt
  `look` jetzt genau, was auf dem Bildschirm steht.

**Offen**

- Kurzes Festhängen in engen Ecken, Morgenfarbe, Orientierung (Karte).

---

## Meilenstein 1 – Fundament und Look ✓

**Fertig**

- Pixel-Render-Pipeline: Szene in ~360 Zeilen (HalfFloat + Tiefentextur),
  Post-Pass mit Umrissen aus Tiefensprüngen, hellen Außenkanten (Normalen aus
  der Tiefe), Split-Toning je Tageszeit, Vignette, Palettenabbildung über
  eine 32³-LUT mit geordnetem Dithering; ganzzahliges Hochskalieren mit
  Subpixel-Ausgleich der eingerasteten Kamera.
- Orthografische 3-4-5-Kamera: jedes Voxel exakt 5 px breit, 3 px Boden,
  4 px Wand. Kamera folgt weich, Blickpunkt leicht nördlich der Figur.
- Voxel-Baukasten mit AO und Farbstreuung; nur sichtbare Flächen, Schatten
  über Stellvertreter in eigenem Pass (von 1,2 Mio. auf ~0,3 Mio. Dreiecke).
- Lichtung: gemalter Boden (Wiese, Pfade, Feuerstelle, alte Landstraße),
  Wald mit ~300 Bäumen, Büsche, Steine, Gras, Blumen, Pilze; Notunterkunft
  mit Innenraum (Bett, Ofen, Tisch, Regal mit Radio, Teppich), Tür, Vordach,
  Lichterkette, Solarpaneel, Schornstein; Lagerfeuer mit animierten Flammen,
  Autowrack, Funkturm-Stumpf, Wegweiser, Briefkasten, Straßenlaterne,
  Wäscheleine, Holzstapel, Hackklotz, Regentonne, Beet, Sessel, Eiche mit
  Reifenschaukel, Straßensperren.
- Spielfigur Mika mit Lauf- und Ruheanimation, Kollision, Stufen/Boden-
  höhen, Laterne (Taste F) mit Punktlicht.
- Tag-Nacht-Zyklus über 24 Schlüsselbilder: Sonnen- und Mondbahn mit einer
  Schattenkarte, warme Punktlichter (Feuer, Laterne, Tischlampe, Ofen),
  leuchtende Fenster, Rauch, Funken, Glühwürmchen.
- Dach, Vorderwand und Vordach blenden gerastert aus, wenn man das Haus
  betritt; Durchsicht rund um die Figur hinter Bäumen und Wänden.
- HUD: Tag/Uhrzeit/Tageszeit, Vorrat, Schnellleiste, Kontexthinweise,
  Meldungen; eigene Pixelschrift mit Umlauten; Pixel-Symbole.
- Dialoge mit Porträt (aus Voxel-Modellen gezeichnet), Name,
  Schreibmaschinen-Text und Antworten; 16 Dialoge an Dingen der Lichtung.
- Pause-Menü (Weiter, Steuerung, Vollbild, Neues Spiel mit Rückfrage).
- Speichern: Schlafen im Bett (mit Rückfrage am Tag) → neuer Tag → speichern;
  stille Sicherung beim Verlassen; kaputte Stände werden beiseitegelegt.
- Ausruhen am Lagerfeuer oder im Sessel bis zum Abend / in die Nacht.
- Prüfskript `tools/check.mjs` und Playtest-Brücke `tools/playtest.mjs`.

**Werkzeug-Notizen**

- Headless-WebGL läuft über SwiftShader: ~50 ms pro Bild bei 1280×720 und
  langsame Shader-Übersetzung im ersten Bild. Die Playtest-Brücke simuliert
  deshalb Spielzeit in festen Schritten statt in Echtzeit.
- Porträts wurden anfangs per GPU gerendert und ausgelesen → Chrome warnt
  »GPU stall due to ReadPixels«. Umweg: eigener 2D-Voxel-Zeichner.

**Offen**

- Playtest-Runde 1 – erledigt, siehe oben.
