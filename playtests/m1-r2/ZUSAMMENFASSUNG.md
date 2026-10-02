# Meilenstein 1, Runde 2 – Zusammenfassung (Kontrollrunde)

Zwei Testspieler auf dem nachgebesserten Stand `b536f82`: Kira (gezielt die
Befunde aus Runde 1) und Jonas (ungeduldiges Durchdrücken). Urteile: Kira
8/10, Jonas 6/10. Konsole in beiden Sitzungen leer.

**Gehalten:** Die Rückfrage bei »Neues Spiel« ist sicher (Kira hat mit
Doppel- und Dreifachklicks, Klicks direkt nach dem Öffnen und doppeltem Enter
versucht, den Stand zu löschen – ohne Erfolg). E, Enter und Leertaste
bestätigen immer die markierte Antwort, auch bei ruhender Maus. Neuladen
mitten im Ausruhen, Schlafen, Dialog oder Menü verliert nichts mehr. Die
Titelkarte beim Start ist sauber, nach dem Aufwachen gibt es keine
Schlaf-Schleife mehr.

## Blocker

Keine.

## Stört den Spielfluss

| # | Befund | Wer | Behoben (mit Meilenstein 2) |
|---|---|---|---|
| S1 | Schnelles E-Drücken löst ungewollt Schlafen (Bett am Tag) oder Ausruhen (Feuer, Sessel) aus – die Antwort mit dem Zeitsprung war vorgewählt, die Sperre von 0,3 s reicht dagegen nicht. | Jonas, Kira | Ja: Die harmlose Antwort (»Noch nicht.«, »Weitermachen«) ist jetzt vorgewählt (`standard` in dialogs.js). |
| S2 | Jeder Morgen hält fest: ~3 s schwarze Tageskarte, danach ein Dialog, der das Loslaufen blockiert. | Jonas | Ja: Tageskarte kürzer und mit E/Leertaste/Klick überspringbar; der Morgensatz ist eine Sprechblase über Mika, man läuft sofort los. |

## Feinschliff

| # | Befund | Wer | Stand |
|---|---|---|---|
| F1 | E hämmern öffnet ein Ding (z. B. den Ofen) direkt nach dem Schließen wieder. | Jonas | Behoben: Nach einem Dialog ruht dasselbe Ding eine Sekunde (oder bis man weggeht). |
| F2 | Die Tür ist schwer zu treffen, man klebt an der Wand. | Jonas | Behoben: Einlaufhilfe lenkt vor und hinter der Tür sanft zur Türmitte. |
| F3 | Figur kann in den Steinkreis des Lagerfeuers laufen. | Jonas, Kira | Behoben: größere Kollision. |
| F4 | Ladetext in Systemschrift liegt kurz über der Titelkarte. | Jonas, Kira | Behoben: Ladeanzeige verschwindet sofort. |
| F5 | Das Intro zieht die Figur nach ein paar Schritten aus dem Laufen. | Jonas | Behoben: Bis das Intro spricht, steht Mika still. |
| F6 | Neuladen während der Einführung: Einführung und Tastenzeile kommen nicht wieder. | Kira | Behoben: Flag `introGesehen`. |
| F7 | Esc wirkt im Dialog nicht. | Kira | Behoben: Esc öffnet das Menü, danach geht der Dialog weiter. |
| F8 | Im Hochformat überdeckt der Vorrat die Uhr. | Kira | Behoben: In schmalen Fenstern rutscht der Vorrat unter Uhr und Ziel. |
| F9 | Drücke während der Antwort-Sperre verpuffen ohne Zeichen. | Jonas | Entschärft durch S1 (die Vorwahl ist harmlos). |
| F10 | Unsichtbare Wand am Waldrand, Hängenbleiben am kleinen Zaun beim Feuer. | Jonas | Offen – der Waldrand ist die Grenze der Lichtung; wird beobachtet. |

## Fazit

Meilenstein 1 ist nach zwei Runden ohne Blocker; die Spielfluss-Befunde aus
Runde 2 sind mit dem Stand von Meilenstein 2 behoben. Beide Tester langweilen
sich nach wenigen Minuten, weil man nur Dinge ansehen kann – genau das
beantwortet Meilenstein 2.
