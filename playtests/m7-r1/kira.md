# Kira – m7-r1

## Was Spaß gemacht hat
- Das Titelbild ist hübsch gemacht: Mika steht live im Hintergrund (mit der
  gerade gewählten Mütze/Jacke/Haarfarbe), Lagerfeuer knistert, Kamera fest.
  Fühlt sich nach einem echten Hauptmenü an, nicht nach Notlösung.
- Figurwahl reagiert sofort (Vorschau ändert sich live bei jedem A/D-Druck),
  keine Wartezeit, kein Ruckler.
- Die Regler in „Einstellungen" wirken sofort auf die laufende Szene, sogar
  mitten in einer Welle (Pixelgröße live getestet: Szene wird sofort
  gröber/feiner, ohne Aussetzer).
- Nacht 1 verloren, und das Spiel hat es genau so weggesteckt wie
  DESIGN.md verspricht: „Das Zuhause ist gefallen. Notdürftig geflickt:
  75/300." Kein Absturz, kein kaputter Spielstand, einfach ein neuer
  Morgen mit sichtbaren Folgen (Türme angeschlagen, Reparieren nötig).
  Genau das Gefühl „Verlieren kostet Material, nie den Spielstand".
  Screenshot: kira/bericht-nacht1-verloren.png
- Perk-Wahl unterbricht den Kampf nicht sofort, sondern wartet auf eine
  ruhige Sekunde („Perk-Wahl, sobald es ruhig ist") – schönes Detail.
- Zahlreiche Versuche, das Spiel durch Tastenspam, Klickspam, Fenstergrößen
  und Neuladen zu brechen, haben NICHTS zum Absturz gebracht. Die Konsole
  blieb über die komplette Sitzung leer.

## Wo ich hängen blieb oder mich gelangweilt habe
- Schrott für den ersten Turm zu finden hat gedauert (zwei Autowracks/
  Schrotthaufen quer über die Karte ablaufen), bis genug für den
  Bolzenwerfer (8) zusammenkam. Kein Blocker, aber am Anfang etwas viel
  Fußweg für die erste Verteidigung.
- Im Kampf war es schwer, per Klick gezielt genau den EINEN Schlurfer zu
  treffen, wenn mehrere dicht beieinanderstanden – mehrere Klicks auf die
  vermeintliche Position trafen daneben (siehe F3).

## Was unklar war
- Nach Neuladen auf dem Titelbild bot das Menü „Weiterspielen" an, obwohl
  ich nie „Los geht's!" bestätigt hatte (siehe F2) – kurz verwirrend, ob
  meine Figur nun "Kira" oder "Mika" heißt.

## Fehler

### F1: Regler in „Einstellungen" springen von 0 auf 10 und umgekehrt (Schwere: Feinschliff)
- Schritte: Titelbild → Einstellungen → auf „Lautstärke" (oder Musik/
  Geräusche) mit `D` mehrfach über 10 hinaus drücken.
- Erwartet: Regler bleibt bei 10 stehen (klemmt am Anschlag), so wie es
  bei den meisten Spielen üblich ist.
- Passiert: Der Wert springt zyklisch weiter, z. B. 8 → (20×D) → 6, weil
  0–10 als Ringspeicher behandelt wird. Bei `A` unter 0 springt er ebenso
  auf 10. Reproduzierbar, kein Absturz, nur überraschend beim Halten der
  Taste am Anschlag.
- Screenshot: kira/f1-lautstaerke-wrap.png

### F2: Titelbild bietet „Weiterspielen" an, bevor „Los geht's!" je bestätigt wurde – Figurwahl geht dabei verloren (Schwere: Spielfluss)
- Schritte: Titelbild → „Neues Spiel" → in der Figurwahl Name/Aussehen
  ändern, aber NICHT „Los geht's!" drücken, stattdessen „Zurück" bzw. in
  „Einstellungen" einen Regler ändern (das speichert offenbar schon) →
  Seite neu laden (`reload`).
- Erwartet: Solange nie „Los geht's!" bestätigt wurde, sollte es kein
  „Weiterspielen" geben, oder die gewählten Werte (Name „Kira", lila
  Mütze, blaue Jacke …) sollten übernommen sein.
- Passiert: Nach dem Neuladen erscheint „Weiterspielen" im Titelmenü.
  Klickt man es an, startet man direkt im Spiel – aber als Standard-„Mika"
  mit oranger Mütze, nicht mit der eben gewählten Kira-Optik. Die ganze
  Figurwahl-Arbeit ist damit verloren, ohne Rückfrage oder Hinweis.
- Screenshot: kira/f2-weiterspielen-default-look.png

### F3: Klicks auf einen Schlurfer treffen im Getümmel oft daneben (Schwere: Spielfluss)
- Schritte: Nachts mit 2–3 Schlurfern dicht beieinander per Linksklick
  angreifen.
- Erwartet: Ein Klick auf einen sichtbar direkt vor der Figur stehenden
  Schlurfer schlägt ihn.
- Passiert: Mehrere Klicks in Folge auf dieselbe Bildschirmposition (wo
  laut Screenshot ein Schlurfer stand) hatten sichtbar keine Wirkung
  (keine Schadenszahl, kein Erfahrungsgewinn, keine Bewegung) – vermutlich
  war die Trefferfläche schon leicht verschoben, weil sich Schlurfer
  ständig bewegen. Kein Blocker (mit Nachjustieren traf es fast immer),
  aber im hektischen Getümmel spürbar frustrierend.
- Screenshot: kira/f3-verfehlte-klicks.png

### F4: Escape schließt einen laufenden Dialog komplett, statt das Pausenmenü zu öffnen (Schwere: Spielfluss)
- Schritte: Ein Dialog läuft (z. B. Mikas Aufwach-Monolog oder das
  Lagerfeuer-Gespräch) → `Escape` drücken.
- Erwartet: Entweder passiert nichts, oder das Pausenmenü legt sich über
  den (weiterhin aktiven) Dialog, so wie es mitten in einer Welle auch
  funktioniert.
- Passiert: Der gesamte Dialog wird sofort beendet (auch mit noch nicht
  fertig getipptem Text), das Spiel springt zurück in `play` – reproduzierbar
  bei jedem getesteten Dialog. Dadurch lässt sich während eines Dialogs
  nicht auf Einstellungen zugreifen (z. B. um kurz die Lautstärke zu
  ändern), und ein Reflex-Druck auf Escape verschluckt ungefragt den Rest
  des Textes. Bei einer echten Ja/Nein-Rückfrage in einem Überlebenden-
  Dialog könnte das versehentlich eine wichtige Entscheidung überspringen
  (siehe Checkliste unten – bis zum Sitzungsende keine echte Ja/Nein-Wahl
  in einem Überlebenden-Dialog getestet).

### F5: Der erste Tastendruck direkt nach dem Öffnen von Dialog/Morgenbericht wird manchmal verschluckt (Schwere: Feinschliff)
- Schritte: Lagerfeuer-Dialog öffnen (`E`) und, sobald der Text fertig
  getippt ist, sofort `W` drücken, um die Antwortauswahl zu wechseln.
  Ebenso: im Morgenbericht sofort nach dessen Erscheinen `E` drücken.
- Erwartet: Der erste Tastendruck wirkt genauso wie jeder weitere.
- Passiert: Reproduzierbar (3× beobachtet, in zwei verschiedenen
  Bildschirmen – Dialogauswahl und Morgenbericht-„weiter"): Der erste
  Druck nach dem Erscheinen des neuen Bildschirms tut nichts, erst der
  zweite Druck derselben Taste wirkt. Kein Blocker (einmal nochmal
  drücken reicht), aber ein Spieler könnte glauben, seine Taste sei
  kaputt oder der Rechner hänge kurz.
- Screenshot: kira/f5-erster-tastendruck.png (Dialog vor dem zweiten
  Druck, Auswahl steht noch auf „Weitermachen")

### Beobachtung ohne Fehlerstatus: Reparatur vor einer verlorenen Nacht war umsonst
Nach Nacht 1 („Zuhause ist gefallen") auf 75/300 geflickt, tagsüber mit
Restmaterial auf 141/300 repariert – nach der in Nacht 2 verlorenen Welle
stand das Zuhause wieder exakt bei 75/300, nicht bei etwas über 141 minus
Schaden. Die Nachtreparatur scheint auf einen festen Sockel (25 % von
300) zurückzusetzen, unabhängig vom Ausgangswert. Kein Absturz, aber
für Theo relevant: Reparieren am Tag VOR einer möglicherweise verlorenen
Nacht kann Materialverschwendung sein.

## Checkliste
- Tag ruhig genug zum Bauen? – Ja. Tagsüber griff mich kein einziger
  Schlurfer an, ich konnte in Ruhe Holz hacken, Schrott suchen und
  reparieren. Genau das „ruhige Tage"-Versprechen aus DESIGN.md.
- Nächte mit Action? – Sehr. Ab Welle 2 standen schnell 5–8 Schlurfer
  gleichzeitig im Bild, Türme feuerten sichtbare Bolzen, das Zuhause
  bekam Warnungen („wird angegriffen – an der Nordwand!"). Nie
  langweilig, in Nacht 2 sogar zu viel für meine zwei Türme.
- Aufrüsten lohnend? – Mit nur 2 Türmen (Bolzenwerfer, Rasensprenger)
  ist Nacht 2 bereits knapp gescheitert – deutliches Signal, dass mehr
  Türme/Ausbau nötig sind. Passt zu „ohne Ausbau hält man irgendwann
  nicht mehr mit". Reparieren vor einer Nacht war in meinem Fall aber
  verlorene Liebesmüh (siehe Beobachtung oben).
- Schwierigkeit gleichmäßig und fair? – Nacht 2 fühlte sich deutlich
  härter an als Nacht 1 (nicht nur eine Welle mehr Gegner, sondern auch
  mehr gleichzeitig sichtbare Schlurfer). Mit meiner schwachen
  Verteidigung (2 Türme) beide Nächte verloren – aber beide Male fair
  und ohne Frust abgefangen (Material weg statt Spielstand weg).
- Look passt zu DESIGN.md? – Ja, sehr genau: warmes Zuhause mit
  Lichterkette, kühles Nachtblau mit warmen Lichtinseln, Schlurfer mit
  leuchtenden Augen, Bolzen mit Leuchtspur, Umriss-Rasterung bei
  Verdeckung (lavendel), Bildwackel/Trefferstopp bei Treffern.
- Erkennt man, was was ist (Figur, Quellen, Bauten, Schlurfer, Türme,
  Loot)? – Ja, auf den ersten Blick klar unterscheidbar. Einzig im
  dichten nächtlichen Getümmel ist der genaue Klick-Treffpunkt eines
  einzelnen Schlurfers schwer zu timen (siehe F3).
- Wie ist der Einstieg vom Titelbild bis zur ersten Nacht? – Herzlich
  und klar: Titelbild → Figurwahl (mit Live-Vorschau) → Intro-Monolog →
  Zielhinweis „Nimm die Axt" → Schritt für Schritt bis zum ersten
  Turmbau. Kein Punkt, an dem ich nicht wusste, was als Nächstes zu tun
  ist. Einzige Reibung: Schrott für den ersten Turm zu finden, dauert
  etwas (siehe oben).
- Trägt das Spiel über mehrere Tage? – Im Ansatz ja: Tag 2 fühlte sich
  spürbar anders an (Reparieren-Mechanik, neue Bauleiste „Einrichten",
  Knopf und Oma Hilde tauchten auf), aber durch meine zwei verlorenen
  Nächte kam ich nicht so weit, wie ein normaler Spieler wohl käme. Der
  Kern (sammeln → bauen → verteidigen → nächster Morgen mit Folgen)
  trägt aber spürbar.
- Sind die Überlebenden sympathisch und nützlich? – Zu früh für ein
  Urteil: Knopf tauchte als wedelnder Hund am Briefkasten auf, Oma
  Hilde kam erst ganz am Ende meiner Sitzung dazu. Beide wirkten warm
  angekündigt (Gedankenblasen, keine erzwungenen Dialoge), aber ich kam
  nicht mehr dazu, wirklich mit ihnen zu interagieren.
- Würdest du weiterspielen? – Ja. Trotz zweier verlorener Nächte hat
  mich der Loop (Türme bauen → Loot abwägen → Figur oder Türme
  aufwerten) neugierig gemacht, wie sich Nacht 3 mit besserer
  Verteidigung schlägt. Die Konsole blieb die ganze Sitzung blitzsauber.

## Gesamturteil (1–10) und wichtigster Wunsch
**8/10.** Als Kaputt-Macherin bin ich fast leer ausgegangen – kein
Absturz, kein Speicherstand-Schaden, keine einzige Konsolenmeldung in
über 250 Tastendrücken/Klicks, extremen Fenstergrößen, Neuladen zur
Unzeit (Titelbild, Figurwahl, mitten in Welle 1) und wildem Tastenspam.
Das ist für ein Spiel in diesem Stadium bemerkenswert robust. Abzüge nur
für die kleinen Reibungen oben (F1–F5), von denen keine ein Blocker ist.
**Wichtigster Wunsch:** Die verlorene Figurwahl beim Neuladen vor „Los
geht's!" (F2) reparieren – das ist der einzige Fund, bei dem ein echter
Neuling sichtbar verärgert wäre („ich hab doch Kira gewählt, warum bin
ich jetzt Mika?").
