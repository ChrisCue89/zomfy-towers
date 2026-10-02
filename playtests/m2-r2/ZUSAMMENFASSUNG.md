# Meilenstein 2, Runde 2 – Zusammenfassung (Kontrollrunde)

Zwei Testspieler auf Stand `1be5eb4` (Nachbesserung nach Runde 1). Urteile:
Jonas 7/10 (vorher 5/10), Theo 8/10 (vorher 7/10). Konsole in beiden
Sitzungen leer, kein Absturz.

**Der Blocker aus Runde 1 ist weg:** Jonas kam ohne ein Wort zu lesen durch
Axt, Werkbank, Spitzhacke und Barrikaden; Theo schaffte alle Ziele samt
Hütte an Tag 1 (Ausbau bezahlt 09:43, vorher Tag 2). Rote Bänder, sichtbare
Steinhaufen, die Einblendungen und klare Absagen tragen den Einstieg. Neu
aufgefallen sind vor allem Stellen, an denen ein Tastendruck ins Leere geht.

## Blocker

Keine.

## Stört den Spielfluss

| # | Befund | Wer | Behoben |
|---|---|---|---|
| S1 | Durchsuchen dauert, zeigt aber keinen Fortschritt; wer losläuft, bricht still ab. Am Auto kam beim ersten Mal nur der Dialog (»Einmal am Tag …«) – das klang wie »heute schon leer«. | Jonas, Theo | Ja: Balken über Mikas Kopf beim Durchsuchen und Ernten, Meldung »Abgebrochen – dabei stehen bleiben.«, Durchsuchen etwas kürzer (1 s), Auto-Dialog ohne »einmal am Tag«. |
| S2 | Werkbank: Die Auswahl sprang auf »Holz zu Schrott«, S + E stellte ohne Rückfrage »Stein zu Schrott« her (3 von 4 Stein weg). | Jonas | Ja: Die Auswahl springt nie auf ein Verwerten-Rezept; Verwerten braucht einen zweiten Druck (»Nochmal E: …«, danach bleibt es für Serien kurz scharf). |
| S3 | Welche Bäume darf ich fällen? Das Band war ein paar Pixel groß; »gleiche« Bäume reagierten nicht. Wer unter der Krone stand, bekam keinen Hinweis – der Stamm war zu weit weg. An Tag 2 gab es kein Holz, Stümpfe sagten nicht, wann sie nachwachsen. | Jonas, Theo | Ja: rot-weißes Markierband, drei Voxel hoch, mit flatternden Enden; Reichweite fällbarer Bäume reicht unter die Krone; Absage an Waldbäumen und Gestrüpp (»Der ist mir zu mächtig …«); Stümpfe zeigen »Wächst in 2 Tagen nach« bzw. »Wächst morgen nach« und treiben am Tag davor aus; drei Astbündel mehr (jeden Tag nachwachsend). |
| S4 | Werkbank unter der Wäscheleine: von vorn nur »Ansehen« (Leine), benutzbar nur von hinten. Frisch gesetzte Werkbank außer Reichweite; Einblendung fehlte, obwohl E wirkte. | Theo, Jonas | Ja: Bauten und Quellen haben Vorrang vor Nur-Anschauen; Einblendung und E haben denselben Spielraum. |

## Feinschliff

| # | Befund | Wer | Stand |
|---|---|---|---|
| F1 | Hütten-Kachel zeigt nur 2 von 4 Preisen. | Jonas, Theo | Behoben: Preise in bis zu zwei Zeilen. |
| F2 | Meldungen legen sich über den Titel der Werkbank. | Jonas, Theo | Behoben: Bei offener Werkbank erscheinen sie darunter. |
| F3 | Abriss gibt immer 100 % zurück; das Barrikaden-Ziel kostet netto nichts; die Leiste zeigt die Rückgabe nicht. | Theo | Behoben: Barrikaden zählen zur Verteidigung und geben wie Türme 70 % zurück (OFFENE-FRAGEN.md Nr. 9); die Abriss-Kachel zeigt die Rückgabe grün. |
| F4 | Esc direkt nach dem Setzen öffnet das Pausenmenü. | Theo | Behoben: Esc kurz nach dem letzten Setzen heißt »fertig«. |
| F5 | Ein Faserbusch wächst mitten in ein Beet und fängt E ab. | Theo | Behoben: Auf Rohstoff-Zellen (Kiesel, Gras, Äste) kann man nicht bauen (alte Spielstände laden weiter). |
| F6 | Ein leeres Beet sieht erntereif aus. | Theo | Offen (Meilenstein 5, Detailgrad). Die Einblendung sagt »Heute leer – morgen wieder«. |
| F7 | E während des Schwungs verpufft (5× E in 1 s = 2 Treffer); E-Hämmern nach dem Fällen springt zum Nachbarn. | Jonas | Behoben: Ein Tipp während des Schwungs merkt den nächsten Schlag vor; kurz nach dem Fällen verpuffen weitere E. |
| F8 | Wer per Taste baut, sieht die Wirkung eines Baus nie (nur beim Überfahren mit der Maus). | Theo | Behoben: Die Tafel beim Setzen zeigt Wirkung und Bedienung. |
| F9 | Felsen hinter dem Auto kaum sichtbar; Faserbüsche sehen aus wie Blumen; Deko-Kasten auf der Straße wirkt durchsuchbar. | Theo | Felsen versetzt; der Rest kommt mit Meilenstein 5. |
| F10 | Billiges (Barrikade, Laterne, Bank) leuchtet ständig auf, das Signal nutzt sich ab. | Theo | Behoben: Dieselbe Option leuchtet frühestens nach 45 s wieder auf. |
| F11 | Nach dem Ausbau fehlt ein Ziel; Schlafen am Mittag ist dominant. | Theo | Mit Meilenstein 3 erledigt: Türme und Nächte brauchen Schrott, schlafen geht erst nach der Nacht. |

## Fazit

Kein Blocker, vier Spielfluss-Probleme – alle behoben. Meilenstein 2 ist
damit abgeschlossen; die nächste Runde prüft Meilenstein 3 (Nächte, Türme,
Loot) mit allen vier Testspielern.
