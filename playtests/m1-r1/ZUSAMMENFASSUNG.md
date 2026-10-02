# Meilenstein 1, Runde 1 – Zusammenfassung

Vier Testspieler, je eine Sitzung über die Playtest-Brücke (Stand
`efcc7b1`). Urteile: Jonas 7/10, Mira 8/10, Theo 7/10, Kira 6/10.

**Einig waren sich alle:** Der Look trägt (warmes Haus gegen kühle Nacht,
scharfe Pixelkanten, liebevolle Details), die Steuerung erschließt sich ohne
Lesen, keine einzige Konsolenmeldung, kein Absturz. Tagsüber gibt es nach dem
ersten Rundgang nichts mehr zu tun – erwartbar für »Fundament und Look«,
Meilenstein 2 bringt Sammeln und Bauen.

## Blocker

| # | Befund | Wer | Ursache | Behoben |
|---|---|---|---|---|
| B1 | Nach dem Klick auf »Neues Spiel« liegt »Ja, neu beginnen« genau unter dem Mauszeiger und wird durch das Überfahren vorgewählt – ein Doppelklick löscht den Spielstand. | Kira | Rückfrage zeigte »Ja« an der Stelle des Knopfs; Maus-Hover setzte in jedem Bild die Auswahl. | Ja: »Lieber nicht« liegt jetzt unter dem Zeiger und ist vorgewählt, Klicks zählen nach jedem Seitenwechsel 0,35 s nicht, die Maus wählt nur, wenn sie bewegt wird. |

## Stört den Spielfluss

| # | Befund | Wer | Ursache | Behoben |
|---|---|---|---|---|
| S1 | Einzelne Tastendrücke in Dialogen (E, Leertaste) »wirken nicht«. | Jonas, Theo | Ein Druck während der Schreibmaschinen-Animation zeigt nur den Rest der Zeile an. In der Brücke steht das Spiel zwischen Befehlen still, so dass fast jeder zweite Druck darauf fiel. | Ja: Text tippt schneller (72 statt 48 Zeichen/s); `look` zeigt jetzt nur den schon sichtbaren Text und ob die Zeile fertig ist. |
| S2 | Schnelles Durchdrücken bestätigt eine Antwort, die man nie gesehen hat (Ausruhen am Feuer). | Mira | Zweiter Druck vervollständigte den Text, der dritte bestätigte sofort. | Ja: Antworten lassen sich erst 0,3 s nach dem Erscheinen bestätigen; Hinweis »W/S wählen · E bestätigen« im Dialog. |
| S3 | Enter bestätigt »Weitermachen«, obwohl »Ausruhen« markiert war. | Kira | Der ruhende Mauszeiger lag über der zweiten Antwort und überschrieb die Tastaturwahl in jedem Bild. | Ja: Die Maus wählt nur noch, wenn sie bewegt wird. |
| S4 | Neu laden während des Ausruhens/Einschlafens verliert den Weg seit dem letzten Speichern. | Kira | Die stille Sicherung beim Verlassen der Seite war im Schlaf-Modus abgeschaltet. | Ja: Sie sichert jetzt immer (der Zustand ist in jeder Phase stimmig). |

## Feinschliff

| # | Befund | Wer | Stand |
|---|---|---|---|
| F1 | Erstes Bild nach dem Start wirkt wie Bildrauschen. | Jonas, Kira | Behoben: Titelkarte »Zomfy Towers · Tag n« auf Schwarz, danach löst sich das Bild gerastert auf. |
| F2 | Handlaterne leuchtet auf Gras grün-gelb statt warm. | Mira, Theo | Behoben: Lichtfarbe orangener und etwas heller; Lichtkreis wirkt jetzt warm (siehe `screenshots/nacht.png`). |
| F3 | Bett, Radio und Ofen lassen sich durch die Rückwand von draußen benutzen. | Jonas | Behoben: Innen-Dinge nur von drinnen. |
| F4 | Nach dem Aufwachen öffnet ein E zu viel wieder »Jetzt schon schlafen?«. | Jonas | Behoben: Das Bett bietet erst wieder Schlaf an, wenn man einmal weggegangen ist. |
| F5 | Regentonne und andere Dinge reagieren nicht auf E. | Mira | Regentonne hat jetzt einen Text. Mehr Kleinkram-Texte kommen mit Meilenstein 6 (Geschichte). |
| F6 | Figur an der Baumgrenze fast ganz verdeckt. | Kira | Durchsicht etwas kräftiger (92 % statt 80 %, weicher Rand). |
| F7 | Schnellleiste steht beim Start auf einem leeren Platz. | Theo | Mit Meilenstein 2: Die Laterne wandert auf die linke Hand (Taste F), die Leiste hält Werkzeuge. |
| F8 | Kurzes Festhängen in engen Ecken (Hausecke am Vordach, Möbelecke am Bett). | Mira, Kira | Offen – echte Ecken, kein Durchrutschen; wird beobachtet. |
| F9 | Morgenlicht wirkt eher neutral-warm als rosa-golden. | Mira | Offen – Look-Feinschliff in Meilenstein 5 (Detailgrad) bzw. 7. |
| F10 | Funkturm schwer zu finden, keine Karte. | Mira | Offen – wird mit dem roten Faden (Meilenstein 6) wichtig. |

## Designfragen aus der Runde

- **Bleibt Ausruhen kostenlos?** (Theo) – Ja, siehe OFFENE-FRAGEN.md Nr. 14:
  Der Preis ist die verlorene Tageszeit.
- **Speichert das Spiel ständig?** (Theo, Kira) – Es sichert still beim
  Verlassen der Seite und beim Schlafen; das ist so gewollt (DESIGN.md 6.16).
