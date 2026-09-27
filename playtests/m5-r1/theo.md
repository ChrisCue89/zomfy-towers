# Theo – m5-r1

## Was Spaß gemacht hat

- Der Sprung im Detailgrad ist sofort spürbar: Mika, die Hütte, der Turm –
  alles deutlich feiner als das, was ich aus grober Erinnerung an frühere
  Meilensteine kenne. Das Eigenlicht nachts (warmer Fensterschein, glühender
  Turm) macht die Szene auch im Dunkeln lesbar.
- Turm-Tooltips zeigen echte Zahlen: Bolzenwerfer Stufe 1 = **14 Schaden,
  1,1 Schuss/s, 5,5 m Reichweite**. Genau das, was ich als Rechner brauche,
  um Türme zu vergleichen.
- Reparieren ist nie eine Sackgasse: Es flickt immer so viel, wie das
  vorhandene Material hergibt („Geflickt, so gut es ging (4 %)."), auch wenn
  man die volle Summe nicht hat. Kein frustrierendes „geht nicht".
- Der Lavendel-Umriss für verdeckte Schlurfer funktioniert wirklich (siehe
  Screenshot 06) – man sieht durch Büsche/Zäune hindurch, dass dort etwas
  steht.
- Klares Preis-Feedback: Der zweite Bolzenwerfer kostet sofort sichtbar
  10 statt 8 Schrott. Figur-Aufwertungen verlangen eine Bestätigung
  („Nochmal drücken: Lebenskraft 1/3") – schützt vor Fehlklicks bei einer
  Entscheidung, die Ressourcen kostet.
- Die Ausweich-Rolle hat eine eigene, erkennbare Hocke-Pose.

## Wo ich hängen blieb oder mich gelangweilt habe

- Ich habe **alle vier gespielten Nächte verloren** – nicht an der Horde
  selbst, sondern weil das Zuhause tagsüber/abends schon auf bis zu 50 %
  heruntergenagt war, *bevor* die eigentliche Welle überhaupt begann (siehe
  Tabelle unten und F2). Für mich als Effizienz-Spieler, der den Tag mit
  Sammelrouten vollpackt, ist das ein Fallstrick: Genau das Verhalten, das
  ich für die beste Rohstoff-Ausbeute halte, kostet dem Haus die Wache.
- Einzelne Streuner am Tag zu jagen hat sich nicht gelohnt: Bei meiner
  Fenstergröße ist die Sicht so eng (siehe Tabelle „Sichtweite"), dass ich
  wiederholt 4–5 Befehle lang einem Randmarken-Pfeil hinterhergelaufen bin,
  ohne den Schlurfer je zu Gesicht zu bekommen – er war entweder hinter der
  Hütte oder schlicht außerhalb des schmalen Sichtfelds.
- Die 3:1-Umwandlung an der Werkbank (3 Holz oder 3 Stein → 1 Schrott) ist so
  schwach, dass sie sich nie lohnt, wenn Autowrack-Durchsuchen (2–4 Schrott
  pro Tag) oder ein erlegter Schlurfer verfügbar sind. Ich habe sie trotzdem
  genutzt, weil mir sonst schlicht nichts übrig blieb – fühlte sich nach
  Notlösung an, nicht nach Strategie.
- Turm setzen bzw. auswählen per Mausklick hat bei mir wiederholt nicht
  reagiert (siehe F1) – ich musste komplett auf `E` umsteigen.

## Was unklar war

- Bei „Reparieren" zeigt das UI `bezahlbar: true`, obwohl ich nur einen
  Bruchteil des Preises hatte – der Button sieht optisch genauso aus wie ein
  normal leistbarer Posten. Erst nach dem Klick sagt eine Meldung, dass es
  nur eine Teilreparatur war. Für mich als jemand, der genau nachrechnet, war
  das im ersten Moment verwirrend (siehe F3).
- Die Randmarken zeigen Richtung und Anzahl, aber keine Distanz. Mehrfach
  meldete `schlurferImBild: 1`, obwohl im Screenshot nichts zu sehen war
  (vermutlich durch die Hütte verdeckt) – ohne den internen Zähler hätte ich
  nicht gewusst, dass überhaupt etwas in Reichweite ist.
- Wie viel eine Stufe genau bringt (Perk-Auswahl), konnte ich nicht sehen,
  da ich in vier Nächten nur 8 von 10 nötigen Erfahrungspunkten sammelte.
- Ob die im Nachtbericht gezählten „Besiegte Schlurfer" nur meine eigenen
  Kills sind oder auch die des Turms mitzählt, war mir nicht klar: Meine
  Erfahrung stieg nicht immer im Gleichschritt mit dieser Zahl (z. B. Anstieg
  von 1/10 auf 4/10 an einem Tag, an dem ich nicht ein einziges Mal
  zugeschlagen habe).

## Fehler

### F1: Turm setzen/auswählen per Mausklick reagiert unzuverlässig (Schwere: Spielfluss)
- Schritte: Bolzenwerfer in der Bauleiste gewählt, Maus auf ein Feld mit
  `passt: true` bewegt, geklickt – mehrfach wiederholt, auch mit einer
  Mausbewegung unmittelbar vor dem Klick. Später außerdem versucht, einen
  bereits gebauten Turm durch Anklicken auszuwählen.
- Erwartet: Turm wird gesetzt bzw. ausgewählt (Tooltip sagt ausdrücklich
  „Klick oder E setzt").
- Passiert: Mehrere Klicks hintereinander taten nichts – Vorrat blieb
  unverändert, der Platzieren-Modus blieb aktiv, das Auswählen des Turms
  öffnete nichts. Sobald ich stattdessen `E` drückte, wurde sofort gesetzt
  bzw. reagiert. Klicks *im Kampf* auf einen Schlurfer (Angriff) haben dagegen
  zuverlässig funktioniert – nur Platzieren/Auswählen per Klick war betroffen.
- Screenshot: theo/03-bolzenwerfer.png (Turm wurde am Ende per `E` gesetzt)

### F2: Zuhause kann tagsüber/abends fast unbemerkt bis zur Hälfte sinken (Schwere: Spielfluss)
- Schritte: Neues Spiel, ersten Turm gebaut, danach den Tag über mit
  Rohstoff-Wegen verbracht, ohne regelmäßig am Haus vorbeizuschauen (mehrere
  Minuten Spielzeit am Stück per `wait`).
- Erwartet: Laut Plan „nagen sie langsam und höchstens bis zur Hälfte" –
  klang nach einer kosmetischen Randnotiz.
- Passiert: Der Morgenbericht bestätigte in mehreren Nächten exakt „150
  Standfestigkeit abgenagt" (= genau die Hälfte von 300) – noch bevor die
  Nacht überhaupt begann. Zusammen mit nur einem (falsch stehenden) Turm
  reichte das plus die erste Welle, um das Haus in allen vier gespielten
  Nächten fallen zu lassen, meist schon in Welle 1.
- Screenshot: theo/05-nacht-verloren-bericht.png

### F3: „Reparieren" zeigt `bezahlbar: true` auch bei nur teilweise vorhandenem Material (Schwere: Feinschliff)
- Schritte: Zuhause-Reiter geöffnet, Schaden am Haus vorhanden, aber nur
  1 Holz und 3 Schrott im Vorrat (Vollpreis: 25 Holz, 17 Schrott).
- Erwartet: entweder ausgegraut („nicht leistbar") oder ein sichtbarer
  Hinweis, dass es nur eine Teilreparatur wird.
- Passiert: Eintrag sah normal „leuchtend/leistbar" aus, erst nach dem
  Drücken kam die Meldung „Geflickt, so gut es ging (4 %)." Kein Blocker,
  aber optisch nicht von einem voll leistbaren Posten zu unterscheiden.
- Screenshot: kein eigener (siehe Beschreibung oben, UI-Text sichtbar in
  theo/05-nacht-verloren-bericht.png, Zeile „Reparieren geht über die
  Bauleiste")

## Checkliste

- Tag ruhig genug zum Bauen? – Ja, tagsüber wurde ich nie ernsthaft
  angegriffen, das Haus wird nur „genagt" (siehe F2).
- Nächte mit Action? – Ja, aber ich habe die Action selbst kaum *gesehen* –
  vieles lief unsichtbar hinter der Hütte oder außerhalb des schmalen Bildes
  ab (siehe Sichtweite unten).
- Aufrüsten lohnend? – Turm-Zahlen überzeugen direkt. Figur-Aufwertungen
  wirken ebenfalls spürbar (Lebenskraft 1/3: 100 → 130 Leben für 8 Schrott),
  konkurrieren aber ums selbe knappe Schrott-Budget wie der zweite Turm –
  echte Entscheidung, kein Selbstläufer.
- Schwierigkeit gleichmäßig und fair? – Die Eskalation selbst wirkt sauber
  gestaffelt (mehr Wellen, ab Nacht 3 zwei Richtungen gleichzeitig, teurere
  Zweit-Türme). Unfair fühlte sich aber die Tag/Abend-Abnutzung an: Sie
  bestraft genau das Verhalten (weite Sammelwege, Haus kurz aus den Augen
  lassen), das ein auf Effizienz getrimmter erster Durchgang nahelegt.
- Look passt zu DESIGN.md? – Ja, deutlich: feine Voxel, Eigenlicht nachts,
  Lavendel-Umriss bei Verdeckung, warme Lichtinseln gegen kühle Nacht,
  flackerndes Lagerfeuer, Dämmerungs-/Abend-Farbstimmung.
- Erkennt man, was was ist (Figur, Schlurfer-Arten, Türme und Stufen,
  Werkzeuge/Waffen, Loot) – bei Tag und bei Nacht? – Turmart: ja, eigene
  Silhouette plus Tooltip mit Rolle, bei Tag und Nacht gut zu erkennen.
  Turm-Ausbaustufe/Spezialisierung: konnte ich nicht prüfen, mein einziger
  Turm blieb Stufe 1. Schlurfer-Arten: Ich bin in vier Nächten nie erkennbar
  mehr als einer Erscheinungsform begegnet (bläulich-grüner Körper,
  rötlicher Kopf-Aufsatz) – ob es weitere Arten gibt, konnte ich in dieser
  kurzen, verlustreichen Runde nicht bestätigen. Werkzeuge/Waffen: Namen und
  Symbole in der Werkbank sind klar, aber ohne Zahlen (siehe Waffen-Tabelle
  unten). Loot: als funkelnder Punkt und Randraute sichtbar, welche Sorte
  (Schrott/Zahnrad) es ist, erst nach dem Einsammeln klar.
- Wirkt die Welt lebendig (Animationen, Wind, Wäsche, Türme)? – Lagerfeuer
  flackert überzeugend, nachts glimmen kleine Lichtpunkte in der Wiese, die
  Ausweich-Rolle hat eine eigene Pose. Wind in Gras/Blüten oder flatternde
  Wäsche sind mir bei meiner kleinen Fenstergröße nicht sicher aufgefallen –
  kann an der Auflösung liegen, nicht zwingend am Fehlen der Animation.
- Passen Oberfläche und Szene zusammen, ist alles lesbar? – Ja, HUD und
  Szene wirken im selben Pixel-Maßstab, nichts überlappt sich, Symbole
  bleiben auch bei 640×360 scharf lesbar.
- Läuft es flüssig? – Die Entwickleranzeige zeigte durchgehend rund 42 fps,
  sowohl bei 640×360 als auch bei kurz getesteten 1920×1080 – das ist
  softwaregerendertes Headless-Chromium und sagt wenig über eine echte
  GPU, aber es gab keine spürbaren Einbrüche zwischen den beiden Größen.
- Fühlen sich Treffen, Ausweichen und Aufwerten gut an? – Treffer: klare,
  kurze Schadenszahl („12"), kein Textmüll. Ausweichen: eigene, erkennbare
  Rolle, aber ich konnte sie nur außerhalb einer echten Bedrängnis-Situation
  testen. Aufwerten: sofortiges Zahlen-Feedback (100 → 130 Leben) fühlte
  sich befriedigend an. Die Perk-Wahl beim Stufenaufstieg habe ich mit
  8/10 Erfahrung nicht erreicht und kann sie daher nicht bewerten.

## Erkennbarkeit: Aussehen vs. Tooltip

| Was | Am Aussehen erkennbar? | Tooltip nötig für |
|---|---|---|
| Turmart (Bolzenwerfer) | Ja – eigene Armbrust-Silhouette, klar von Natur/Bauten unterscheidbar | genaue Werte: 14 Schaden, 1,1 Schuss/s, 5,5 m Reichweite |
| Turm-Ausbaustufe | Nicht geprüft – mein Turm blieb die ganze Runde Stufe 1 | – |
| Spezialisierung | Nicht erreicht (nie genug Zahnräder für höhere Stufen) | – |
| Schlurfer-Art | Nur eine Erscheinung nah genug gesehen; Vielfalt nicht bestätigbar | – |
| Loot am Boden | Als funkelnder Punkt + Randraute sichtbar | Art (Schrott/Zahnrad) erst nach dem Einsammeln |
| „Reparieren" leistbar? | Sieht wie ein normaler, voll leistbarer Posten aus | Ist meist nur eine Teilreparatur (siehe F3) |

## Nächte im Überblick

| Nacht | Ziel-Wellen | Tatsächlich erreicht | Richtung(en) | Zuhause: Tagesstart → Abend → nach Durchbruch | Geflickt auf | Besiegte Schlurfer (Bericht) | Loot | Meine Türme |
|---|---|---|---|---|---|---|---|---|
| 1 | 3 | Welle 2 (dann Durchbruch) | Nordwesten → Westen (Welle 2) | 300 → 142 → 0/– | 75/300 | 1 | 1 Schrott | 1× Bolzenwerfer St. 1 |
| 2 | 3 | Welle 1 (Durchbruch) | Nordosten | 84 → 16 → 0/– | 75/300 | 0 | – | 1× Bolzenwerfer St. 1 |
| 3 | 4 | Welle 1 (Durchbruch) | Nordwesten **und** Osten gleichzeitig | 75 → 11 → 0/– | 75/300 | 1 | – | 1× Bolzenwerfer St. 1 |
| 4 | 4 | Welle 1 (Durchbruch) | Nordwesten | 75 → 67 (kaum Verlust) → 0/– | 75/300 | 0 | – | 1× Bolzenwerfer St. 1 |

Auffällig: Der Morgenbericht flickt das Zuhause nach einer verlorenen Nacht
jedes Mal auf exakt 75/300 (25 %) – unabhängig davon, wie tief es ins Minus
ging. Verloren ging dabei nie Material („Verloren: nichts"), vermutlich weil
ich ohnehin fast nichts auf Lager hatte. Nacht 3 war die erste mit zwei
gleichzeitigen Richtungen – die angekündigte Eskalation ist also spürbar.

## Sichtweite

Bei der vorgegebenen Fenstergröße 640×360 lief der Renderer laut
Entwickleranzeige mit **1× Skalierung** – das Spiel zeigt seine native
Pixelauflösung 1:1. Bei den in dieser Runde üblichen Bildzeilen ergibt das
nur rund **8 m Bildbreite und 4,5 m Höhe**. Das reicht kaum, um einen
einzelnen Schlurfer hinter der Hütte zu sehen, geschweige denn den Überblick
über die ganze Lichtung zu behalten – ich war fast blind auf die
Randmarken angewiesen, die zwar Richtung und Anzahl zeigen, aber keine
Distanz. Zum Vergleich habe ich kurz auf 1920×1080 vergrößert (ebenfalls
1× Skalierung, siehe Screenshot 02): dort ist die „Diorama"-Absicht sofort
erkennbar – Lichtung, Straße, Autowrack, Werkbank und Zuhause gleichzeitig
im Bild. Wer im Vollbild auf einem großen Schirm spielt, dürfte hier keine
Probleme haben; bei einem kleinen/gefensterten Browserfenster wie meinem
Testfenster ist der Überblick dagegen spürbar knapp, gerade nachts, wenn
mehrere Richtungen gleichzeitig im Auge zu behalten wären.

## Exploits und dominante Strategien

- **Kein echter Exploit gefunden**, aber eine **Falle für Effizienz-Spieler**:
  Der naheliegende Reflex, den ganzen Tag mit Sammeln/Craften zu füllen
  (Bauen geht ja „jederzeit", Zeit ungenutzt zu lassen fühlt sich nach
  Verschwendung an), führt dazu, dass niemand nach dem Haus schaut – und das
  kostet bis zu 50 % Standfestigkeit, bevor die Nacht überhaupt beginnt.
  Effizienter wäre: regelmäßig kurz zum Zuhause zurückkehren, oder – besser –
  schon am Vormittag einen zweiten Turm/eine Barrikade genau an der
  belasteten Seite bauen, statt die ganze Sammelzeit zu maximieren.
- **Die 3:1-Materialumwandlung an der Werkbank ist eine Notlösung, keine
  Strategie**: Das Autowrack durchsuchen (2–4 Schrott, einmal am Tag) und
  Schlurfer erlegen sind beide effizienter. Wer sich auf die Umwandlung
  verlässt, bleibt strukturell zu arm für einen zweiten Turm.
- **Reparieren ist nie eine Fehlentscheidung**: Da es anteilig immer etwas
  bringt und während einer laufenden Welle ohnehin gesperrt ist („Erst die
  Welle abwehren – dann flicken"), gibt es keinen Grund, es *nicht* zu
  nutzen, sobald Material übrig ist.
- Da ein zweiter Turm derselben Art +2 Schrott kostet (8 → 10), lohnt es
  sich preislich tendenziell, **verschiedene Turmarten** zu mischen statt
  eine Art zu verdoppeln – zur tatsächlichen Kampfwirkung kann ich mangels
  zweitem Turm nichts sagen.
- Einzelne Streuner tagsüber zu jagen hat sich in meinem Test nie gelohnt
  (Aufwand pro erwischtem Schlurfer war hoch, siehe „Wo ich hängen blieb").
  Die effizientere Linie wäre vermutlich, Streuner komplett zu ignorieren
  und stattdessen in Verteidigung zu investieren.

## Waffen und Vorteile

Ich habe es wegen chronischen Rohstoffmangels nicht geschafft, tatsächlich
eine Nahkampfwaffe zu craften oder eine Stufe aufzusteigen – das ist selbst
ein Befund: Das wenige Schrott, das ich hatte, floss immer zuerst in Turm,
Reparatur oder eine Figur-Aufwertung, nie blieb genug für eine der drei
Werkbank-Waffen gleichzeitig mit den nötigen Tagesmaterialien übrig.

| Waffe/Werkzeug | Kosten | Tooltip-Charakter | Schaden/Tempo als Zahl? |
|---|---|---|---|
| Axt (Start) | – (Startwerkzeug) | keine Beschreibung, reines Werkzeug/Notwaffe | Nein – nur die Schadenszahl im Kampf selbst (12 pro Treffer beobachtet) |
| Bratpfanne | 8 Schrott, 3 Stein | „langsam und wuchtig, betäubt" | Nein |
| Rechen | 6 Holz, 3 Schrott, 2 Fasern | „große Reichweite, trifft viele" | Nein |
| Fäustlinge | 3 Stoff, 4 Fasern, 2 Schrott | „schnelle Schläge, jeder dritte doppelt" | Nein |

Anders als Türme (klare Zahlen: 14 Schaden, 1,1 Schuss/s, 5,5 m) geben
Waffen im Werkbank-Tooltip nur eine Fließtext-Beschreibung des Spielgefühls.
Für mich als Rechner ist das ein Bruch: Türme kann ich sauber
gegeneinander abwägen, bei Waffen bleibt nur Bauchgefühl. Eine „dominante"
Wahl kann ich daher nicht beziffern – rein von der Beschreibung her klingt
die Fäustlinge-Kombo (schnell, jeder dritte Treffer doppelt) am ehesten nach
verlässlichem Dauerschaden, während die Bratpfanne eher situativ (Betäubung
gegen einzelne starke Gegner) wirkt.

Ob sich Nahkampf gegenüber Türmen lohnt, kann ich in dieser Runde nicht
seriös beantworten: Ich habe genau einen bestätigten Nahkampf-Treffer mit
der bloßen Axt (Schadenszahl 12, danach +1 Erfahrungspunkt und Loot-Drop),
mein einziger Turm stand die ganze Zeit abseits der tatsächlich
angegriffenen Wand und kam nie sichtbar zum Schuss. Die in den
Nachtberichten gemeldeten „Besiegte Schlurfer" (1/0/1/0) sind daher
vermutlich eine Mischung aus Turm- und eigenen Kills – meine Erfahrung
stieg jedenfalls nicht immer im Gleichschritt mit dieser Zahl. Charakter-
Aufwertungen dagegen zeigen knallharte Zahlen (Lebenskraft 1/3: +30 Leben
für 8 Schrott, Stufe 2 kostet bereits 14) – hier ist der Vergleich einfach
und die Investition fühlt sich lohnend an.

Stufenaufstieg/Perk-Wahl habe ich mit 8 von 10 nötigen Erfahrungspunkten
nach vier Nächten nicht erreicht und kann sie daher nicht bewerten.

## Gesamturteil (1–10) und wichtigster Wunsch

**6/10.** Der Sprung im Detailgrad und die Zahlen-Transparenz bei Türmen und
Figur-Aufwertungen sind genau das, was ich als Optimierer sehen will, und
die Reparatur-Logik (immer wenigstens ein Teilerfolg) ist unaufgeregt gut
gelöst. Aber: Ich habe alle vier gespielten Nächte verloren – nicht an der
Horde selbst, sondern an der tagsüber unbemerkt wegschmelzenden
Standfestigkeit des Zuhauses plus einem einzigen, falsch stehenden Turm.
Ein Teil davon ist meine eigene Schuld (zu viel Zeit mit dem Verfolgen
einzelner, kaum sichtbarer Streuner statt früh in eine zweite
Verteidigungslinie zu investieren) – aber genau diese Falle sollte ein Spiel
für einen Effizienz-Spieler nicht so leicht offenlassen. Mein wichtigster
Wunsch: ein deutlicheres, dauerhaftes Signal, wenn das Zuhause tagsüber
unter Druck steht (nicht nur eine vorbeiziehende Meldung), damit Sammelroute
und Verteidigung sich nicht gegenseitig auffressen – und dieselben harten
Zahlen (Schaden/Tempo) wie bei Türmen auch bei Nahkampfwaffen, damit sich
„Schrott in den Turm oder in die Figur" wirklich durchrechnen lässt.
