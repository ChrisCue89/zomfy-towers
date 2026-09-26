# Kira – m3-r1

Rund 155 Brücken-Befehle, zwei Spieltage, zwei Nächte (beide verloren, eine
davon mit Absicht). Konsole etwa 14-mal abgefragt, auch nach jedem Neuladen,
jeder Größenänderung und jedem Tasten-Spam: **immer leer.** Keine Fehler,
keine Warnungen, kein Absturz, kein Hänger.

## Was Spaß gemacht hat

- **Technisch ist das Spiel sehr robust.** Ich habe mit Absicht geärgert:
  Esc mitten im Intro-Dialog, Tab/Q/F/C/Ziffern im Menü, Tasten-Spam
  während der Abblende beim Ausruhen, Esc dreifach, Rechtsklick, Neuladen
  mitten in der Welle, Neuladen bei offenem Nachtbericht, Fenster auf
  1280 × 720 und auf krumme 517 × 293. Nichts hing fest, nichts verschwand
  aus dem Vorrat.
- **Neuladen mitten in der Nacht** funktioniert sauber: Welle 1/3, gleiche
  Schlurfer-Zahl, gleicher Vorrat, die Welle lief einfach weiter.
- **Menü und Dialoge halten die Welle an** (5 s gewartet, Uhr und Zuhause
  unverändert). Esc bricht das Platzieren ab, ohne gleich das Menü zu öffnen.
- **Schlafen während der Horde** wird freundlich abgelehnt: „Schlafen? Nicht,
  solange die Horde kommt.“ Genau richtig.
- **„Neues Spiel“ fragt nach**, „Lieber nicht“ ist vorgewählt. Vorbildlich.
- **Abreißen mit Doppeldruck** („Nochmal drücken: abreißen“) plus
  Rückerstattung (+2 Holz je Barrikade, +5 Schrott für den Bolzenwerfer).
  Bauen vor der Haustür und auf dem eigenen Feld wird abgelehnt („Hier ist
  kein Platz.“).
- Kampfgefühl: Schadenszahlen „12“, Schlurfer zerfallen zu Moos, Loot fliegt
  von selbst her, „+1“ ploppt auf. Die Meldung „Bolzenwerfer ist jetzt
  bezahlbar“ samt aufleuchtender Kachel hat mich direkt zum Bauen gebracht.
- Die Nachtstimmung am Haus (Lichterkette, warmes Fenster, blaue Nacht) ist
  wunderschön.

## Wo ich hängen blieb oder mich gelangweilt habe

- **Mein erster Turm stand auf der falschen Seite.** Der erste Tages-Schlurfer
  kam aus dem Osten, also baute ich dort Turm und Barrikadenwand. Die Horde
  kam dann von Norden und Westen, der Turm hat in Nacht 1 nichts getroffen.
  Woher die Horde kommt, sieht man vorher nicht; die Randmarker für Schlurfer
  außerhalb des Bildes habe ich erst beim Vergrößern eines Screenshots
  gefunden (siehe F4).
- Ich habe mich mit der eigenen Barrikadenwand vom Haus abgeschnitten und
  musste außen herum laufen. Das ist korrekt, zeigt aber, dass man die roten
  Pünktchen (Horde-Weg) nachts kaum sieht.
- **„Komplett verbauen“ konnte ich nicht prüfen:** Der Horde-Weg ist ein Ring
  ums Haus, dafür bräuchte man grob 20+ Barrikaden (60+ Holz). Mehr als 11 Holz
  hatte ich nie.
- **Ausbauen mitten in der Welle konnte ich nicht prüfen:** Stufe 2 kostet
  10 Schrott, pro Schlurfer fällt 1 Schrott. Ich hatte nie genug zur richtigen
  Zeit. Bauen mitten in der Welle ging (Barrikade in Nacht 2, Welle 1).

## Was unklar war

- **Fällt die Figur, ist die Nacht sofort verloren**, auch wenn das Zuhause
  noch steht. In Nacht 2 war das Zuhause bei 63/300 und blieb dort, mich haben
  8 Schlurfer in rund 20 s von 64 auf 0 gebracht. Dann kommt „Die Horde bricht
  durch …“, dabei war am Haus gar niemand. Ist das Absicht? Dann sollte das
  Spiel es vorher einmal sagen.
- Nach einer verlorenen Nacht sind **alle** Bauten „angeschlagen“, auch die
  Barrikaden im Osten, an denen nie ein Schlurfer war (Reparieren 2 Holz).
- Beim ersten E am Auto steht „Durchsuchen“ da, es kommt aber ein
  Beschreibungsdialog. Erst beim zweiten Halten wird wirklich durchsucht.
- Beim Aufheben der Axt sagt Mika „Daraus baue ich eine Werkbank – die Leiste
  unten rechts zeigt, was geht.“, das Ziel lautet aber „Durchsuche Schrott, baue
  einen Bolzenwerfer.“, und die Werkbank steckt im dritten Reiter.

## Fehler

### F1: Vor der Nacht wird das Zuhause fast zerstört, ohne Vorwarnung (Schwere: Spielfluss)
- Schritte: Tag 2 am Ohrensessel „Bis zum Abend ausruhen“ (18:30). Um 18:39
  meldet das Spiel schon 6 Schlurfer außerhalb des Bildes. Ich warte am Turm an
  der Westseite des Hauses auf die Horde („Bald kommt die Horde – um 20:30!“).
- Erwartet: Abends höchstens ein paar Versprengte, die „nie genug“ sind, um zu
  stören (DESIGN.md 1). Wenn das Haus angegriffen wird, eine deutliche Meldung.
- Passiert: Zuhause 150/300 (19:13) → 27/300 (20:03) → 3/300 (20:07), noch
  **vor** Beginn der Welle. Die Angreifer standen an der Nord- und Ostwand und
  waren nicht zu sehen (siehe F3). Außer dem kleinen Balken oben gab es keine
  Warnung. An Tag 1 hat ein einzelner Versprengter zwischen 20:00 und 20:25
  ebenfalls 52 Punkte abgezogen, während ich woanders war.
- Screenshot: kira/03-zuhause-27-vor-der-nacht.png

### F2: Zuhause-Wert springt, und eine verlorene Nacht heilt das Haus (Schwere: Spielfluss)
- Schritte (a): Tag 2, 20:07, Zuhause 3/300, ich laufe nur um das Haus herum.
  Um 20:10 steht es bei 67/300, ohne Reparieren und ohne Materialverbrauch.
- Schritte (b): Nacht 1 mit 248/300 begonnen, Figur fällt bei 112/300. Der
  Bericht sagt „Das Zuhause hat 98 Standfestigkeit verloren.“ (tatsächlich
  136), danach steht es bei 150/300, also +38.
- Schritte (c): Nacht 2 mit 63/300 begonnen, Figur fällt, Zuhause immer noch
  63/300. Bericht: **„Das Zuhause ist unversehrt.“**, danach 150/300, also +87.
- Erwartet: Verlieren kostet (DESIGN.md 2, Säule 7). Der Bericht nennt den
  echten Schaden, und das Zuhause steht danach nie besser da als vorher.
- Passiert: Mit kaputtem Haus eine Nacht absichtlich zu verlieren ist ein
  **kostenloses Reparieren auf 50 %** (regulär 20 Holz + 5 Schrott). Material
  verloren habe ich dabei nichts (Nacht 1: „Verloren: nichts“) bzw. 1 Schrott
  (Nacht 2).
- Screenshot: kira/05-bericht-nacht1.png, kira/06-bericht-nacht2-unversehrt.png

### F3: Hinter dem Haus sind Schlurfer und Figur unsichtbar (Schwere: Spielfluss)
- Schritte: Schlurfer greifen die Nordwand an, oder man läuft selbst hinter
  das Haus (Nacht 2, Welle 1).
- Erwartet: Figur und Gegner bleiben als Umriss oder Durchsicht erkennbar.
- Passiert: Das Spiel meldet 2–3 Schlurfer „im Bild“, zu sehen ist nur das
  Haus. Auch die eigene Figur ist hinter dem Dach komplett verschwunden; an
  anderer Stelle schaut sie durch ein Loch im Dach, als stünde sie oben drauf.
  Genau dort (Nordseite) wurde mein Haus in F1 zerlegt, ohne dass ich es sah.
- Screenshot: kira/04-hinter-dem-haus-unsichtbar.png

### F4: Randmarker für Schlurfer außerhalb des Bildes kaum zu erkennen (Schwere: Spielfluss)
- Schritte: Nacht 1, Welle 1: 5 Schlurfer außerhalb, keiner im Bild.
- Erwartet: Ein deutlicher Pfeil am Bildrand zeigt, woher sie kommen.
- Passiert: Nur drei winzige orange Pünktchen (2–3 px) am linken Rand, leicht
  mit der Lichterkette zu verwechseln. Gefunden habe ich sie erst im
  vergrößerten Screenshot. Die Meldung „Welle 2 von 3 – aus dem Westen!“ hilft,
  aber für Welle 1 von Nacht 1 habe ich keine Richtungsmeldung gesehen.
- Screenshot: kira/02-randmarker-ausschnitt.png (4-fach vergrößerter
  Ausschnitt oben links)

### F5: Pausemenü nennt noch „Meilenstein 2“ (Schwere: Feinschliff)
- Schritte: Esc (Pause- und Steuerungsseite).
- Erwartet: Meilenstein 3 – Nächte, Türme und Loot.
- Passiert: „Meilenstein 2 – Sammeln, Crafting und Bauen“.
- Screenshot: kira/01-menue-meilenstein2.png

### F6: Ziel „Überstehe die erste Nacht.“ auch an Tag 3 (Schwere: Feinschliff)
- Schritte: Nacht 1 und Nacht 2 verlieren.
- Erwartet: Etwa „Überstehe eine Nacht.“ oder „… die nächste Nacht.“
- Passiert: Nach zwei verlorenen Nächten steht an Tag 3 immer noch „die erste
  Nacht“.
- Screenshot: –

### F7: Nachtbericht geht beim Neuladen verloren (Schwere: Feinschliff)
- Schritte: Nacht verlieren, Bericht ist offen, F5.
- Erwartet: Der Bericht erscheint wieder oder ist irgendwo nachzulesen.
- Passiert: Bericht weg. Außerdem meldete das Spiel direkt vor dem Neuladen
  3 Schlurfer außerhalb des Bildes, danach 0. Der Spielstand selbst (Vorrat,
  Zuhause 150/300, Tag 2) war korrekt.
- Screenshot: –

## Checkliste

- Tag ruhig genug zum Bauen? – Vormittags und mittags ja. Ab dem Abend
  nein: Wer bis zum Abend ausruht, landet mitten in einer Vorhut, die das Haus
  vor der Nacht fast zerlegt (F1).
- Nächte mit Action? – Ja, reichlich: bis zu 8 Schlurfer um mich herum,
  Wellen mit Banner „Welle 1/3“ und Richtung. Die Action war aber oft nicht
  zu sehen (F3, F4).
- Aufrüsten lohnend? – Nicht getestet: Stufe 2 (10 Schrott) und die
  Figur-Upgrades (6–8 Schrott) konnte ich mir nie leisten, ohne auf einen Turm
  zu verzichten.
- Schwierigkeit gleichmäßig und fair? – Nein. Nacht 2 war schon vor Beginn
  verloren, und die Figur fällt gegen 8 Schlurfer in rund 20 s. Gleichzeitig
  kostet Verlieren fast nichts und heilt sogar das Haus (F2). Das Spiel ist
  also zu hart und zugleich folgenlos.
- Look passt zu DESIGN.md? – Ja: scharfe Pixel, warme Lichtinseln gegen die
  blaue Nacht, Lichterkette, Feuer. Nachts sind die Schlurfer aber fast nur
  noch leuchtende Augen.
- Erkennt man, was was ist (Figur, Quellen, Bauten, Schlurfer, Türme, Loot)?
  – Figur, Quellen und Barrikaden ja. Den Bolzenwerfer (Holzmast mit Armbrust)
  auch. Schlurfer: dunkler Körper mit gelbgrünen Augen, tagsüber gut zu sehen.
  Eine graue Sorte gibt es wohl, nachts und im Pulk verschmelzen sie aber zu
  einem Klumpen, den man nicht zählen kann. Loot sieht man kaum, man merkt ihn
  nur am „+1“.
- Macht Einsammeln Spaß? – Das Anfliegen und das „+1“ fühlen sich gut an.
  Pro Schlurfer fällt aber nur 1 Schrott, da gibt es wenig einzusammeln. Die
  Hauptquelle bleiben Auto und Schrotthaufen (je +3 pro Tag).
- Bauleiste ohne Erklärung verständlich? – Ja. Reiter, Tasten, Preise,
  Tooltip („Klick oder E setzt · Mausrad dreht · Esc bricht ab“), Vorschau mit
  Reichweitenkreis. Wählt man einen Bau aus, zeigt die Leiste dessen
  Optionen, auch das versteht man sofort. Die roten Wegpunkte erklärt erst
  Mika nach dem ersten Turm, und nachts sieht man sie kaum.
- Motiviert das Aufleuchten? – Ja. Das erste „Bolzenwerfer ist jetzt
  bezahlbar“ nach dem ersten Loot war der beste Moment der Runde.

## Gesamturteil (1–10) und wichtigster Wunsch

**6/10.** Technisch 9/10: Ich habe nichts zum Absturz gebracht, die Konsole
blieb leer, und Neuladen, Größenänderung, Menü und Dialoge halten der Welle
stand. Spielerisch passt die neue Nachtlogik noch nicht zusammen: Das Haus
fällt vor der Nacht, die Angreifer sind dabei unsichtbar, und eine verlorene
Nacht repariert das Haus gratis.

**Wichtigster Wunsch:** Den Kampf ums Zuhause lesbar und in sich stimmig
machen. Also Schlurfer hinter dem Haus zeigen (Umriss oder Durchsicht),
deutlich warnen, wenn das Haus angegriffen wird, keine Vorhut, die das Haus
schon vor der Nacht zerlegt, und nach einer verlorenen Nacht nie mehr
Standfestigkeit als vorher.
