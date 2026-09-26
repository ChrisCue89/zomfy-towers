# Mira – m3-r1

Gespielt: neues Spiel, Tag 1 komplett, Nacht 1 (3 Wellen), Tag 2, Nacht 2
(3 Wellen) und die Morgen von Tag 2 und Tag 3 – rund 150 Brücken-Befehle.
Gebaut: Bolzenwerfer (2×), Kürbiskatapult, Rasensprenger, Laternenturm,
Werkbank, Sitzbank, Laternenpfahl. Einmal repariert. Konsole blieb leer.

## Was Spaß gemacht hat

- **Der Abend ist wunderschön.** Rotgoldenes Licht über dem Lagerfeuer, dann
  gehen die Lichterketten an der Dachkante an, das Fenster glüht, der
  Laternenpfahl legt eine warme Lichtinsel auf die Wiese. Nachts tiefes Blau
  drumherum. Genau der Kontrast „warmes Zuhause gegen kühle Nacht“ aus der
  Vision – ich habe bewusst am Feuer gewartet und es genossen
  (mira/nacht-vorplatz.png).
- **Der Laternenturm** wirft nachts eine große, warme Lichtinsel. Schön und
  passend zum Namen.
- **Details der Welt:** Wäscheleine mit kariertem Tuch, Reifenschaukel,
  moosbewachsenes Auto („aus der Motorhaube ein Busch“), rostiger Strommast,
  Beete, Regentonne, Ohrensessel auf der Wiese. Das Hütteninnere mit Bett,
  Kerze und Ofen ist herrlich gemütlich. Geht Mika hinter die Hütte, wird das
  Dach um sie herum gerastert durchsichtig – toll gelöst.
- **Die Texte haben Herz.** „Ein Ohrensessel mitten auf der Wiese. Irgendwer
  hatte hier Prioritäten.“ – „Mein Lieblingssessel. Mitten auf der Wiese.
  Genau richtig.“ – „Eine Bank, selbst gebaut. Sitzt sich gleich doppelt so
  gut.“ – morgens „Die Vögel sind schon wach. Dann wohl ich auch.“ Keine
  Tippfehler gefunden, echte Umlaute, schöner Apostroph in „tut’s“.
- **Die Ansagen zur Horde** sind klar und nicht panisch: „Bald kommt die
  Horde – um 20:30!“, „Nacht 1: Die Horde kommt.“, „Welle 1 von 3 – aus dem
  Nordwesten!“, dazu oben Mitte „Nacht 1 · Welle 1/3“ mit der Standfestigkeit
  und bei der letzten Welle groß „Welle 3/3“.
- **Das Kürbiskatapult** ist ein Liebling: Man sieht den orangen Kürbis mit
  grünem Stiel im Bogen fliegen (mira/kuerbis-im-flug.png). Genau der
  schrullige Humor aus DESIGN.md.
- **Die Schlurfer** sind eher niedlich-gruselig als eklig: dunkle Gestalten
  mit gelben Leuchtaugen, hellgrünen Sprossen und rosa Blüten. Treffer
  blitzen hell auf, kleine Zahlen („12“), kein Blut. Der Grusel passt zum Ton.
- **Beute, die von selbst zu Mika fliegt** („+1“, „+2“), fühlt sich gut an –
  wenn man sie denn findet (siehe F3).
- **„Bis zum Abend ausruhen“** auf Bank oder Sessel ist eine gemütliche Art,
  den Tag abzukürzen.

## Wo ich hängen blieb oder mich gelangweilt habe

- **Welle 2 in Nacht 1:** Die Richtungsmeldung war schon verschwunden, als
  ich hinsah. Die Welle lief, ich sah keinen einzigen Schlurfer und bin eine
  ganze Spielstunde ratlos um die Hütte gelaufen. Kein Pfeil am Bildrand,
  keine Richtung in der Wellenanzeige.
- **Rund um die Hütte bleibt man ständig hängen:** an der Regentonne, am
  Blumenbeet, an der Werkbank neben dem Hackklotz, am eigenen Laternenturm.
  Nachts, wenn man schnell zur angegriffenen Ecke will, ist das zäh. (Zum
  Teil selbst verbaut – aber es fehlt ein Gefühl dafür, welche Wege frei
  bleiben sollten.)
- **Nahkampf im Dunkeln:** Ich wusste oft nicht, ob meine Klicks treffen und
  wo Mika gerade steht (F2).

## Was unklar war

- **Die „roten Pünktchen“** beim Bauen habe ich erst nach dem ersten Turm
  erklärt bekommen („zeigen, wo die Horde langläuft“). Beim ersten Platzieren
  habe ich gerätselt. Sie wirken außerdem eher orange als rot, und im Reiter
  „Zuhause“ (z. B. beim Laternenpfahl) sieht man sie nicht.
- **Was tun Rasensprenger und Bolzenwerfer gerade?** Einen Wasserstrahl des
  Sprengers habe ich nie gesehen, fliegende Bolzen auch nicht (nur die
  Armbrust dreht sich). Dass Rasensprenger und Laternenturm selbst keinen
  Schaden machen, habe ich erst gemerkt, als die Nordostecke fast
  aufgefressen war – die Tooltips sagen es eigentlich („bremst“, „stärkt“),
  aber ich habe es nicht zusammengedacht.
- **Welche Schlurfer-Arten gibt es?** Manche wirkten breiter oder hatten eine
  rosa Blüte, aber ob das eigene Arten sind, konnte ich nicht sagen.
- **Wo liegt die Beute?** Siehe F3.
- **Werkbank:** Wie viel Schrott man bekommt, steht erst unten nach dem
  Auswählen („3 Holz werden zu 1 Schrott.“) – das ist in Ordnung, aber
  zusammen mit F1 habe ich mich verrechnet.

## Fehler

### F1: Werkbank verschluckt die ersten Bestätigungen (Schwere: Spielfluss)
- Schritte: Werkbank bauen, E (öffnet), mit S „Holz zu Schrott verwerten“
  wählen, bestätigen.
  1. Öffnen: E – nichts; Enter – nichts; Mausklick auf die Zeile – nichts.
  2. Öffnen: E gehalten – nichts; Leertaste – wirkt („1 Schrott gewonnen“);
     danach wirken auch E und Enter.
  3. Öffnen: E – nichts; Enter – wirkt.
- Erwartet: Wie in der Fußzeile „E herstellen“ wird beim ersten Druck
  verwertet. / Passiert: Die erste(n) Bestätigung(en) nach dem Öffnen werden
  ohne jede Rückmeldung verschluckt. Weil nichts passiert, drückt man
  mehrmals – und sobald es greift, wird mehrfach verwertet. So habe ich
  ungewollt mein ganzes Holz (12) zu 4 Schrott gemacht; Bank und Spitzhacke
  waren danach nicht mehr drin.
- Screenshot: – (reine Eingabe)

### F2: Angreifer hinter der Hütte unsichtbar, Mika verschwindet im Getümmel (Schwere: Spielfluss)
- Schritte: Nacht 1, Welle 1 kommt aus Nordwesten und greift die Nordwand an;
  vom Vorplatz aus hinschauen. Danach hinter der Hütte in den Nahkampf gehen.
- Erwartet: Angreifer hinter dem Dach als Umriss oder Durchsicht erkennbar
  (so wie Mika hinter dem Dach durchscheint); die eigene Figur bleibt im
  Kampf sichtbar. / Passiert: „Das Zuhause wird angegriffen!“, die Leiste
  sinkt, zu sehen sind nur ein paar hellgrüne Sprossen über dem First. Im
  Nahkampf verschwand Mika samt Laterne ganz hinter einem großen Schlurfer;
  ich habe nur noch geraten, wohin ich schlage. Nachts sind die Schlurfer
  auch im Lichtkreis dunkle Silhouetten – das Licht hellt den Boden auf, nicht
  die Figuren.
- Screenshot: mira/angriff-hinter-dach.png, mira/mika-verdeckt.png

### F3: Beute ist nachts nicht zu finden (Schwere: Spielfluss)
- Schritte: Nacht 2 mit fünf Türmen spielen, die Türme erledigen viele
  Schlurfer außerhalb des Bildes; danach die Beute suchen.
- Erwartet: Beute glimmt oder funkelt, damit man nachts rausgeht und sie
  holt. / Passiert: Ich habe im Dunkeln kein einziges Beutestück gesehen, auch
  nicht im Lichtkreis des Laternenturms. Eingesammelt habe ich nur, wenn ich
  zufällig darüberlief. Laut der Brücke lagen am Ende der Nacht 19 Stücke
  draußen, am Morgen noch 13 – im Bild war davon nichts zu erkennen.
- Screenshot: – (auf den Bildern ist eben nichts zu sehen)

### F4: Die Vorhut frisst am Abend das Zuhause, fast unbemerkt (Schwere: Spielfluss)
- Schritte: Tag 2 morgens reparieren (300/300), auf der Bank „Bis zum Abend
  ausruhen“ (endet ca. 18:30), am Feuer auf die Horde warten.
- Erwartet: Bis zur Ansage bleibt es ruhig, oder es gibt eine deutliche
  Warnung, wenn schon vorher Schlurfer an der Hütte nagen. / Passiert:
  Zwischen 19:13 und 20:26 fiel das Zuhause von 300 auf 32 – die Ansage
  „Bald kommt die Horde – um 20:30!“ kam erst um 20:03. Die Angreifer standen
  halb hinter dem Dach an der Nordostecke. Einzige Warnung war die kleine
  Meldung „Das Zuhause wird angegriffen!“. Hat sich nicht nach „ruhigem Tag“
  angefühlt, sondern nach Überfall aus dem Hinterhalt, während ich am Feuer
  saß. Die eigentliche Horde danach richtete nur noch 3 Schaden an.
- Screenshot: mira/vorhut-abend.png (20:13, Standfestigkeit schon fast leer)

### F5: Morgenbericht nennt den falschen Schaden (Schwere: Feinschliff)
- Schritte: wie F4, Nacht 2 überstehen, schlafen gehen.
- Erwartet: rund 271 verlorene Standfestigkeit. / Passiert: „Das Zuhause hat
  3 Standfestigkeit verloren.“ – die Leiste oben steht bei 29/300. Offenbar
  zählt nur die Zeit ab der ersten Welle. Liegengebliebene Beute erwähnt der
  Bericht nicht. Insgesamt ist der Bericht klar, aber sehr nüchtern – hier
  fehlt mir der sonst so liebevolle Ton.
- Screenshot: mira/morgenbericht-nacht2.png

### F6: Dialoge unterbrechen die Nacht (Schwere: Feinschliff)
- Schritte: Nacht 1, Welle 3, ca. 23:30, Schlurfer an der Hauswand.
- Erwartet: keine Unterbrechung im Kampf. / Passiert: Dialogfenster (hält
  das Spiel an) „Ich sollte bald ins Bett. Morgen ist auch noch ein Tag.“ –
  passt nicht zur Horde vor der Tür. Auch „Es wird dunkel. Mit der Laterne
  sehe ich mehr. (Taste F)“ kommt als Dialog um 20:15, kurz vor der Horde; als
  Gedankenblase wäre beides schöner.

### F7: Hinweisschilder verdecken den Kampf (Schwere: Feinschliff)
- Schritte: Nachts neben einem gefällten Baum, einer Faserpflanze, der
  Regentonne oder der Werkbank kämpfen.
- Erwartet: Im Kampf zählen die Schlurfer. / Passiert: „Wächst in 2 Tagen
  nach“, „Fasern rupfen“, „Ansehen“ oder „Werkbank benutzen“ stehen mitten
  über Mika und den Schlurfern, die Zielklammern liegen auf dem Baumstumpf.
- Screenshot: mira/mika-verdeckt.png

### F8: Veraltete und uneinheitliche Texte (Schwere: Feinschliff)
- Pausenmenü und Steuerung: Fußzeile „Meilenstein 2 – Sammeln, Crafting und
  Bauen“.
- Intro: „Daraus baue ich eine Werkbank“ und „heute Abend schlafe ich im
  eigenen Bett“, während das Ziel schon „Durchsuche Schrott, baue einen
  Bolzenwerfer.“ lautet. Von der Horde erfährt man erst nach dem ersten Turm.
- Oben links steht bis etwa 21 Uhr „Dämmerung“, obwohl oben Mitte schon
  „Nacht 1 · Welle 1/3“ läuft.

### F9: Kleinigkeiten beim Bauen (Schwere: Feinschliff)
- Das kleine „T“ neben den Reitern liest sich wie die Taste T (Rasensprenger).
- Im Turmfenster hat ausgerechnet „Abreißen“ den goldenen „bezahlbar“-Rahmen
  und wirkt wie eine Empfehlung.
- Nachts sieht man vom Geistermodell beim Platzieren fast nichts, nur den
  Rahmen. Beim allerersten Platzieren saß die Vorschau genau unter Mika.
- Nach dem Setzen ist der Baumodus schon beendet; mein gewohntes Esc
  hinterher öffnete mitten in Welle 3 das Pausenmenü. Kein Fehler, aber eine
  kleine Falle.

## Checkliste

- **Tag ruhig genug zum Bauen?** – Ja, der Vormittag und Mittag sind
  herrlich ruhig. Ab etwa 19 Uhr nicht mehr: Die Vorhut kommt vor der Ansage
  und richtete an Tag 2 mehr Schaden an als die ganze Horde (F4).
- **Nächte mit Action?** – Ja: drei Wellen pro Nacht aus wechselnden
  Richtungen, Nahkampf, Beute. Die Action ist da, aber nachts oft schwer zu
  durchschauen (F2).
- **Aufrüsten lohnend?** – Nicht ausprobiert. Stufe 2 kostet 14 Schrott; ich
  habe lieber neue Türme gebaut und repariert. Der Tooltip („+25 % Schaden ·
  3,5 m“, „Fehlt: 10 Schrott“) macht aber neugierig. Figur-Stufen
  (Sammelradius usw.) ebenfalls nicht getestet.
- **Schwierigkeit gleichmäßig und fair?** – Nacht 1 gut machbar (18
  Schlurfer, Zuhause 300 → 172). Nacht 2 war die Horde mit fünf Türmen fair
  (21 Schlurfer, 3 Schaden), die Vorhut am Abend dagegen fühlte sich unfair
  an, weil still und unsichtbar (F4).
- **Look passt zu DESIGN.md?** – Ja, sehr: scharfe Pixel, begrenzte Palette,
  goldener Abend, tiefblaue Nacht, warme Lichtinseln, farbige Schatten,
  durchsichtiges Dach. Einziger Bruch: Kampfszenen nachts werden zu einem
  dunklen Brei aus Silhouetten.
- **Erkennt man, was was ist (Figur, Quellen, Bauten)?** – Bei Tag ja: Mika
  mit Streifenmütze, gebänderte Bäume, Steine, Auto, Werkbank, Bank. Nachts
  ist Mika mit Laterne gut zu sehen – außer im Getümmel (F2).
- **Erkennt man, was was ist (Schlurfer-Arten, Türme, Loot)?** –
  *Schlurfer* als Gattung sofort (gelbe Leuchtaugen, hellgrüne Sprossen),
  *Arten* nicht – Kochmützen oder Warnwesten habe ich keine gesehen.
  *Türme* bei Tag eindeutig (Armbrust auf Holzgestell, Katapult, blauer
  Wassertank, Laterne auf Pfahl); nachts nur der Laternenturm und der
  fliegende Kürbis, die anderen sind dunkle Kästen mit einem Lichtpunkt.
  *Beute* bei Tag als kleine grau-rosa Stücke, nachts gar nicht (F3).
- **Macht Einsammeln Spaß?** – Das Heranfliegen ja, das Suchen nein. Ich
  wäre gern nachts mit der Laterne losgezogen, um die Beute zu holen – aber
  ohne Glimmen weiß man nicht, wohin. So sammelt man nur zufällig.
- **Bauleiste ohne Erklärung verständlich?** – Ja, weitgehend: Reiter,
  Tasten, Symbole, Preise, Tooltips mit Beschreibung („Wirft Kürbisse auf
  Gruppen.“) und „Fehlt: …“. Kleinigkeiten siehe F9 und die späte Erklärung
  der Pünktchen.
- **Motiviert das Aufleuchten?** – Ja! Goldener Rahmen, helles Symbol, voller
  Balken und die Meldung „Bolzenwerfer ist jetzt bezahlbar“; die anderen
  Kacheln zeigen per Balken, wie weit es noch ist. Ein kleines Funkeln oder
  ein Klang beim Umspringen wäre das i-Tüpfelchen.
- **Bleibt es gemütlich, wenn die Horde kommt?** – Meistens ja: Die
  Schlurfer sind knuffig-schaurig, die Kürbisse lustig, die Hütte leuchtet.
  Was die Gemütlichkeit bricht: Angriffe, die man nicht sieht (hinter dem Dach,
  am Abend vor der Ansage), und das dunkle Gewühl im Nahkampf.
- **Texte (Dialoge, Wellenmeldungen, Morgenbericht)?** – Dialoge und
  Gedanken: wunderbar im Ton, keine Tippfehler. Wellenmeldungen: klar und
  knapp, verschwinden aber zu schnell. Morgenbericht: verständlich, aber
  nüchtern und nach Nacht 2 irreführend (F5). Veraltete Stellen siehe F8.

## Gesamturteil (1–10) und wichtigster Wunsch

**7/10.** Tagsüber und am Abend ist Zomfy Towers genau das gemütliche
Endzeit-Zuhause, das ich mir wünsche. Die Nächte haben die richtige
Stimmung, aber ich sehe zu wenig von dem, worum es geht.

**Wichtigster Wunsch:** Die Nacht lesbar machen – Beute sanft glimmen lassen,
Schlurfer hinter der Hütte als Umriss durchscheinen lassen und eine deutliche
Warnung mit Richtung (Pfeil am Bildrand), sobald das Zuhause angegriffen wird.
Dann würde ich nachts sehr gern mit der Laterne rausgehen.
