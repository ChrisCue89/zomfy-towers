# Theo – m1-r1

## Was Spaß gemacht hat
- Die Uhr ist glasklar messbar und, wichtiger, **konstant**: 50 Spielminuten sind bei mir exakt in 30.000 ms Echtzeit vergangen – also 0,6 s Echtzeit pro Spielminute, ohne Schwankung, egal ob ich das über 5 s oder 30 s gemessen habe. Ein Optimierer liebt so eine Zahl, weil man darauf bauen kann: Ein kompletter Tag (06:00 bis 06:30 am Folgetag = 1470 Spielminuten) würde am Stück durchgespielt ca. 14,7 Min. Echtzeit dauern.
- Rennen mit Shift ist kein Placebo, sondern klar quantifizierbar: Gehen = 2,93 Einheiten/s (gemessen: 5,86 Einheiten in 2000 ms geradeaus), Rennen = 4,28 Einheiten/s (8,56 Einheiten in 2000 ms) – das sind **+46 % Tempo**, ohne Ausdaueranzeige, ohne Tempoverlust über mehrere Sekunden Dauerlauf. Sauber und lohnend, jederzeit zu benutzen.
- Lagerfeuer- und Bett-Ausruhen springen **exakt auf feste Uhrzeiten**, nicht auf zufällige Werte: Vormittag → 18:30 (Abend), Abend → 21:30 (Nacht), und Einschlafen (egal ob um 21:42 oder erst um 23:39 getestet) → **immer** 06:30 am Folgetag. Perfekt vorhersehbar, genau was man zum Planen braucht.
- Reload-Test bestanden mit Bestnote: Ich bin nach dem Schlafen-Save herumgelaufen, habe Zeit vergehen lassen (unsaved state) und dann `reload` ausgelöst – Position, Uhrzeit und Vorrat waren exakt identisch wie vor dem Reload, inklusive Meldung „Willkommen zurück!". Das Spiel scheint durchgehend zu speichern, nicht nur beim Schlafen. Getestet sogar mit nur 300 ms Bewegung vor dem Reload – auch das blieb erhalten. Nichts geht verloren, so wie es Design-Säule 7 verspricht.
- Pause-Menü (Esc) friert die Uhr zuverlässig ein (2000 ms Echtzeit wait im Menü = 0 Spielminuten Änderung) und zeigt sogar den Meilenstein-Stand („Meilenstein 1 – Fundament und Look") und eine vollständige Steuerungs-Übersicht inkl. der versteckten Entwickler-Anzeige (F3: FPS, Frametime, Draw Calls, Dreiecke, Koordinaten). Für einen Zahlenmenschen wie mich ein kleines Fest.
- Keine Konsolenfehler über die gesamte Session (mehrfach mit `console` geprüft), keine Abstürze, keine hängenden Zustände.

## Wo ich hängen blieb oder mich gelangweilt habe
- Nach dem ersten Rundgang (Haus, Bett, Lagerfeuer, alter Funkturm, Zäune, Beete) war die komplette Lichtung erfasst – danach gab es tagsüber buchstäblich nichts mehr zu berechnen. Meine komplette restliche Sitzung war Grenzwerte austesten (Reload, Zeit, Tasten), nicht organisches Spielen. Für „Fundament, kein Kampf/Bauen" logisch, aber ökonomisch gesehen: Der Tag hat aktuell keinen einzigen Kostenfaktor, den man optimieren könnte.
- Kurzer, harter Stopp beim Blind-Sprint: Ich bin mit Shift+D 6 Sekunden lang gegen den Zaun beim alten Funkturm gelaufen und kam dabei nur 0,1 Einheiten voran (siehe Screenshot 02, Kontext) – bei 640×360 und Rennen-Tempo überholt man mit dem Charakter fast die eigene Kamerasicht, Hindernisse tauchen erst kurz vor dem Aufprall auf. Kollision selbst funktioniert sauber (kein Clipping), aber blind sprinten lohnt sich am Kartenrand nicht.
- Der Einstiegs-Dialog (4 Zeilen) lässt sich nur mit E weiterklicken, nicht mit Leertaste (siehe F1) – hat mich am Anfang ein paar überflüssige Befehle gekostet, bis ich das gemerkt habe.

## Was unklar war
- Ob das durchgehende Autosave (siehe Reload-Test) das finale Speicherkonzept ist, oder ob später „nur Schlafen sichert, Reload/Absturz kostet den Tag" gelten soll. Aktuell ist „Spielstand gespeichert" beim Schlafen nur ein UI-Toast, technisch scheint viel öfter gespeichert zu werden.
- Ob die eingefrorenen Werte bei Schrott (1), Zahnräder/Technik (0) usw. bewusste Startwerte sind oder ob da schon eine Sammel-Anbindung fehlt, die eigentlich schon greifen sollte. Ohne Blick in den Code nicht zu unterscheiden.
- Was „Neues Spiel" im Pausenmenü genau zurücksetzt – nicht getestet, um meinen laufenden Testlauf nicht zu riskieren. Sollte vor M2 klar dokumentiert sein (und idealerweise nochmal nachfragen, bevor man wirklich alles wegwirft).

## Fehler

### F1: Leertaste bestätigt keine Dialoge/Auswahlen, obwohl die Steuerungs-Anzeige das verspricht (Schwere: Spielfluss)
- Schritte: Zum Lagerfeuer laufen, bis der Hinweis „Ins Feuer schauen" erscheint, E drücken (Dialog mit Auswahl „Bis zum Abend ausruhen" / „Weitermachen" öffnet sich). Dann **Leertaste** drücken.
- Erwartet: Laut Pausenmenü → Steuerung steht „E / Leertaste: Benutzen, weiter" – Leertaste sollte die markierte Auswahl genauso bestätigen wie E.
- Passiert: Nach Leertaste bleibt der Dialog exakt unverändert (gleicher Text, gleiche Markierung). Erst ein anschließender E-Druck bestätigt sofort. Zweimal reproduziert, beide Male identisch.
- Screenshot: theo/05-steuerung.png (zeigt die dokumentierte, aber nicht eingehaltene Tastenbelegung)

### F2: Schnellleiste startet auf leerem Slot statt auf dem einzigen belegten Slot (Schwere: Feinschliff)
- Schritte: Neue Sitzung starten und `look` aufrufen, ohne eine Zifferntaste oder das Mausrad zu benutzen. Gleiches nach jedem Schlafen erneut prüfen.
- Erwartet: Sinnvoller Startzustand wäre der belegte Slot 1 (Laterne) markiert, oder zumindest ein bewusst leerer Zustand ohne Auswahl.
- Passiert: `gewaehlt` steht auf Slot 2 (leer, „-"), obwohl nur Slot 1 („laterne") belegt ist – sowohl beim allerersten Start als auch nach jedem Aufwachen. Keine Funktionsstörung, nur ein unlogischer Default.
- Screenshot: theo/01-schlaf-bestaetigung.png (Schnellleiste unten links zeigt Slot 2 markiert, obwohl dort nichts liegt)

## Checkliste
- Tag ruhig genug zum Bauen? – Ja, absolut: In gut zwei Spieltagen kein einziges Ereignis, kein Schlurfer, kein Zufallsvorfall. Bauen/Sammeln selbst: noch nicht im Spiel.
- Nächte mit Action? – Noch nicht im Spiel (keine Horde, keine Zombies in diesem Meilenstein). Nachts ändert sich nur Licht/Stimmung plus automatischer Laternen-Hinweis.
- Aufrüsten lohnend? – Noch nicht im Spiel (keine Türme, keine Werkbank, keine Figur-Upgrades).
- Schwierigkeit gleichmäßig und fair? – Noch nicht bewertbar, es gibt nichts, an dem man scheitern könnte. Einzige „Schwierigkeit" ist Navigation, und die ist bei der aktuellen Kartengröße trivial (Bett ↔ Feuer ≈ 8–10 Einheiten, macht 2,3 s im Lauf bzw. 3–4 s zu Fuß).
- Look passt zu DESIGN.md? – Weitgehend ja: Abendgold und tiefblaue Nacht mit warmen Lichtinseln (Fenster, Feuer) treffen Abschnitt 3.2 gut. Eine Abweichung fiel mir auf, obwohl nicht mein Kernthema: Der Laternen-Lichtkreis selbst wirkt kühl/türkis statt warm (Screenshot theo/03-laterne-nachtlicht.png) – passt nicht ganz zur Regel „Lichtquellen bleiben warm".
- Wie lang ist ein Tag / wie schnell in die Nacht? – Normal gespielt 0,6 s Echtzeit pro Spielminute (gemessen, exakt), also rechnerisch ~14,7 Min. für einen kompletten Tag. Per Lagerfeuer (2× kostenlos: Vormittag→18:30, Abend→21:30) und Bett (→ immer 06:30 Folgetag) lässt sich derselbe Tag aber in wenigen Sekunden Übergangszeit durchspringen.
- Speichern (Bett → reload)? – Bleibt alles erhalten, und zwar mehr als erwartet: Nicht nur der Schlaf-Speicherpunkt übersteht `reload`, sondern jeder Zwischenstand (Position, Uhrzeit, Vorrat), auch ganz ohne vorheriges Schlafen. Kein Datenverlust in keinem meiner Tests.
- Steuerung/Laufwege/Kamera? – WASD/Pfeile sauber achsengleich (kein Diagonal-Bonus beobachtet), Shift +46 % Tempo ohne Ausdauerkosten, Kamera fest ohne Zoom (Mausrad steuert stattdessen die Schnellleiste, nicht offensichtlich ohne Ausprobieren). Kollision blockiert korrekt, aber bei Renn-Tempo reicht die Sichtweite der 640×360-Kamera kaum, um Hindernisse rechtzeitig zu sehen.
- HUD-Infos? – Oben links Tag/Uhrzeit/Tagesphase (Morgen/Vormittag/Abend/Nacht beobachtet), oben rechts 6 Vorrats-Zähler (Holz, Stein, Fasern, Schrott, Stoff, Technik), unten Schnellleiste (8 Slots, 1 belegt). Lebensbalken, Bauleiste und Wellen-/Standfestigkeits-Anzeige fehlen komplett – erwartungsgemäß, da Kampf/Bauen noch nicht im Spiel.
- Tote Anzeigen? – Der Technik-Zähler steht die komplette Testzeit unverändert auf 0 – konsequent, weil Sammeln fehlt, aber aktuell nicht von einem echten „noch nicht implementiert"-Platzhalter zu unterscheiden. Alle anderen HUD-Zahlen deckten sich exakt mit den `look`-Rohdaten, keine weiteren toten Anzeigen gefunden.
- Zeitsystem austricksen? – Der Ausruh-Kette (Feuer→Feuer→Bett) ist komplett kostenlos, beliebig oft nutzbar (solange man am Feuer nur bis max. Nacht kommt) und immer mit fester Zielzeit – aktuell die einzige „Strategie" im Spiel, weil tagsüber nichts anderes zu tun ist. Kein Bug, aber sobald Sammeln/Bauen dazukommt, sollte das nicht mehr komplett reibungslos/kostenlos bleiben, sonst wird Ausruhen zur dominanten Strategie gegenüber echtem Tagesspiel.

## Gesamturteil (1–10) und wichtigster Wunsch
7/10. Für ein reines Fundament-Milestone ist das technisch sehr überzeugend: Uhr, Ausruhen/Schlafen und Speichern sind exakt messbar, vorhersehbar und (soweit ich reload-testen konnte) absolut verlustfrei – genau die Basis, die man für spätere Balance-Arbeit braucht. Es gibt nur einen echten Bug (Leertaste bestätigt keine Dialoge) und noch keine Wirtschaft, an der ich mich richtig austoben könnte. Wichtigster Wunsch: Leertaste reparieren (F1) und jetzt schon festlegen, ob Ausruhen/Schlafen dauerhaft kostenlos bleibt – bevor in Meilenstein 2 echte Ressourcen und Zeitdruck dazukommen, sonst wird „zweimal ins Feuer schauen" zur einzig sinnvollen Tageshandlung.
