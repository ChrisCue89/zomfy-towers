# PROGRESS – Logbuch

Neueste Einträge oben. Jeder Meilenstein: was fertig ist, was die
Testspieler gefunden haben, was geändert wurde, was offen bleibt.

---

## G7: Die Ankunft, glaubhaft ✓

**Auftrag (01.10.):** »wo kommt das Funkgerät her? arbeite an der story, das ist alles zu dünn. das
ist nicht glaubhaft. komm schon. schick agenten ins rennen die gemeinsam die intro story ausbauen«

- **Fünf Agenten nacheinander** (`recherche/ankunft-geschichte.md`): Kanon, Mika, Haus und
  Funkgerät, Redaktion, Kritik. Befund: Das Funkgerät lag »auf der Bank«, wo keine stand, und
  wanderte im Text; die Batterien waren nach drei Jahren voll; Edda funkte zufällig genau dann;
  Mika hatte kein Woher; Edda wusste, was sie über Funk nicht wissen kann; das Haus war »leer«,
  während alle Lichter brannten; die Licht-Regel widersprach sich.
- **Die Geschichte** (DESIGN 4.1–4.3, OFFENE-FRAGEN 224): Holzlände 1 ist die Hütte des Flößers
  Jakob Lindqvist, Edda war hier die Funkerin. Die Station in der Stube hat ein grünes Lämpchen,
  eine Autobatterie mit Kabeln und Eddas Foto, das Paneel liegt auf dem Dach; das Handgerät wartet
  im Blechkasten mit Ladeschale an der Haustür. Edda ließ das Haus kalt zurück (Feuer lockt, eine
  Stimme nicht). Mika kommt aus der Hausmeisterei in Aalbek, drei Winter allein, mit einem alten
  Floßkahn; Edda sah die Laterne am Bug im Morgengrauen vom Sturmhuk und ruft seitdem.
- **Die Ankunft neu:** Titelkarte mit Moder und Mikas Grund, auf dem See drei Gedanken (Schilf,
  dunkler Leuchtturm, Kalenderblatt), am Bug die Laterne; Mika nimmt sie mit, das Haus ist dunkel,
  »Hallo? … Ist hier jemand?«, der Kasten knistert, und erst ein echtes E drückt die Sprechtaste
  (nach 6 s drückt Mika selbst). Im Erstkontakt fragt Edda, Mika antwortet, Edda sagt die
  Licht-Regel, Mika wählt das Feuer (»Drei Winter hat mich keiner gefunden. Dann mach ich Feuer.«).
- **Das Bild sagt »leer«:** Fenster, Wandlaterne, Lichterkette, Kerzen, Pendelleuchte und
  Kürbislaternen gehen erst mit dem Kamin an (`world.applyHouseLights`, nur über `on` und
  `lightPools.setDark`); die Kürbisse an der Tür sind bis zum ersten Abend ungeschnitzt; Eddas
  Wäsche ist steif und ausgeblichen.
- **Der erste Abend:** Lichterkette eingesteckt, zwei Gesichter in die Kürbisse geschnitzt, um halb
  acht Eddas Abendruf (zwei Zeilen, nur einmal).
- **Nachklang:** Hilde, Juna (das Kurbelradio in Aalbek), das Radio, Marthe (ihre Batterie war im
  ersten Winter leer), Tag 12, Balduin an Tag 2 (Edda hat ihm Bescheid gesagt), die Ortskunde
  (Aalbek mit Mikas Zeile), Eddas Ort (Mika fragt beim ersten Ruf, in der Frostnacht denkt Mika »Der
  dunkle Leuchtturm vom ersten Morgen. Ich hab’s mir gedacht.«).
- **Knoten nur nach einer Ankunft** (Flag `ausAalbek`): Bert erkennt die Hausmeisterei an den
  verschraubten Barrikaden, Edda findet sich auf dem Kalenderblatt, an Tag 27 bringt Hilde den Brief
  vom Mühlenhang, nach der achtzehnten gehaltenen Nacht ist Mika weiter als Edda damals, und beim
  Abdichten liest Mika »…lände« am Bug – Edda erkennt den Floßkahn.
- **Namen:** Stufe 1 des Zuhauses heißt »Alte Hütte« statt »Notunterkunft«, Stufe 2 »Hütte mit
  Küche«.
- **Kein neuer Spielstand:** alles über Flags (`ausAalbek`, `stationNeu`, `lichterNeu`,
  `abendrufOffen`, `kuerbisseRoh`); alte Stände und `?test` kennen Aalbek nicht.
- **Prüfung:** `ankunft` (Laterne am Bug, dunkles Haus, echte Sprechtaste, Bild `ankunft-funk`),
  `feuer` (Hauslichter erst mit dem Kamin, Lichterkette und Abendruf einmal am ersten Abend),
  `knoten` (Bert, Kalenderblatt, Brief – ohne Ankunft schweigen sie). Werkzeug-Umweg: Eine nur in
  den Spielstand geschriebene Barrikade verschwand beim nächsten Speichern (der Stand wird aus der
  Welt neu geschrieben) – die Prüfung baut jetzt eine echte.

## F6: Die Menschen auf dem Weg zu »Triple A« (in Arbeit)

**Auftrag (01.10.):** »Die sehen noch nicht hochwertig aus. Die müssen Triple a sein. Du hast alle
Zeit der Welt dafür.« Dazu: »Die schielen auch wenn sie schief stehen« und »guck wie andere das
machen und dann fix das«; »das intro ist die figur noch 3d!«

- **F6a – Gesichter je Merkmal** (`src/entities/peopleFaces.js`): Augen, Brauen, Mund, Nase und
  Wangen sitzen je an einem Punkt auf der gerundeten Kopfform und werden einzeln ins Bild gesetzt
  (in allen acht Richtungen, auch im Profil); die Breite der Augen folgt der Zuwendung.
- **Kein Schielen mehr:** Ein weißer Pixel am Rand eines Auges liest sich als Augapfel – lag er bei
  beiden Augen oben links, sah das linke Auge zur Nase und das rechte weg. Jetzt sind die Augen von
  vorn gespiegelt mit dem Glanz in der Pupille, schräg liegt das Weiß bei beiden Augen auf derselben
  Seite (beide schauen in dieselbe Richtung).
- **F6b – Licht wie gezeichnet** (`lightField`): Hauptlicht seitlich von oben links, weiche
  Schlagschatten (Mütze auf die Stirn, Kopf auf den Kragen), Verdeckung in Falten, geglättet je
  Stoff; Glanz über den halben Vektor (Haar, Stiefel), Gegenlicht am Rand der Schattenseite; für die
  Menschen kräftigere Tonschwellen (`PEOPLE_PAINT.tones`).
- **F6c – Formen (erster Teil):** Relief im Bäcker (`bump` je Form, `src/entities/peopleRelief.js`:
  Rippen, Querfalten, Ringfalten, Strähnen) – Falten fangen Licht und Schatten, ohne die Form zu
  ändern, und kommen nach dem Glätten scharf dazu. Alle Menschen: Daumen und etwas größere Hände,
  Arme mit Luft zur Taille, ein im Licht gewölbtes Gesicht, Falten in der Ellenbeuge und an der Hose.
  Mika: gesteppte Jacke, die Riemen als gleichmäßiges Band über die Schulter mit Schnalle, dunkler
  Reißverschluss mit Zipper, heller Fellrand an den Stiefeln, Haar in Strähnen mit Spitzen, die
  Mütze ohne Sprenkel mit feinen Maschen. Hilde: Zopfrippen statt Karo-Rauschen, Falten im Rock.
  Yusuf: Längsfalten im Kittel.
- **F6c – Formen (zweiter Teil, alle Leute):** Haar fällt bei allen in Strähnen (am Kopf nur, wo Haar
  ist; Locken, Zöpfe und Dutts mit Rillen), Bärte in senkrechten Strähnen, über dem Bauch staucht sich
  der Stoff zu zwei weichen Falten, Röcke und Mantelschöße fallen in Längsfalten, die Schuhe haben
  eine Kante über der Sohle. Einzeln: Yusufs Kittel öffnet sich auf der Brust zum V mit Revers;
  Balduins Rucksack hat Deckelklappe, zwei Riemen mit Messingschnallen und eine Außentasche; Juna
  trägt die Kapuze zusammengeschoben im Nacken; Berts graue Barthaare liegen unregelmäßig (vorher
  jede dritte Spalte – das las sich wie ein Gitter); Claras Brillenband verschwindet hinten im Haar
  (der Hinterkopf mit Zopf sah wie ein Gesicht aus). Mika trägt seit der Ankunft Eddas Handfunkgerät
  vorn links am Gürtel (G7).
- **Backen doppelt so schnell** (F6e vorgezogen): Abstandsfelder und Licht ohne Zwischen-Arrays,
  Wurzel statt `Math.hypot`, Strahlen der Menschen prüfen nur Formen, die sie berühren (`cull`).
  Mika 48 statt 94 ms je Bild; im Spiel steht Mika nach dem Umschalten deutlich früher als Sprite
  da. Die Schlurfer backen 1,7× schneller; durch die andere Wurzel kippt genau ein Texel einer
  Laternenhexe von 1,3 Millionen (unsichtbar) – der Fingerabdruck der Schlurfer ist neu gesetzt.
- **N12 – Ankunft in 2D:** Im Boot war Mika eine »seltene Pose« (Voxel), und gebacken wurde erst,
  wenn Mika ausstieg – auf dem Steg stand deshalb die 3D-Figur. Jetzt hat Mika den Teil `boot`
  (rudern, vier Bilder im Takt der Riemen, die Füße auf dem Bootsboden), und alle Teile werden mit
  der Ankunft angefordert: Mika rudert und geht als Sprite. Prüfung `menschen` 5b.
- **F6g – Gerade Augen** (Rückmeldung: »Bruder. Die Augen schielen immer noch. Du machst sie schräg.
  Mach sie gerade und es sieht besser raus«): In der Schrägansicht lag das Weiß bei beiden Augen auf
  einer Seite (Seitenblick), das nahe Auge war drei Texel breit und das ferne zwei, und eine Wimper zog
  das Auge schief – zusammen las sich das als schräg und schielend. Jetzt blicken die Augen in jeder
  Richtung gerade: jedes Auge in sich spiegelgleich, beide gleich breit, ein Glanz nur mittig in der
  Pupille, Wimpern nur von vorn. Die Prüfung liest das fertige Bild dort, wo der Bäcker die Augen
  hinsetzt (`f.eyes`) – 60 Blicke von zwölf Figuren in fünf Richtungen.
- **F6f – Sauber im Spiel:** Auf den Bögen waren die Menschen sauber, im Spiel nicht: Über den gemalten
  Tonflächen lag das Bayer-Raster der Nachbearbeitung (ein Körnchen-Rauschen), das Licht der Welt lag
  ein zweites Mal über dem gemalten (fleckige Gesichter), und nachts wurden Gesichter im
  Laternenlicht grau wie Stein. Gemessen an Mika: Nur 48 % (nah) bzw. 71 % (weit) der Farbwechsel
  lagen auf Texelgrenzen, nachts 40 %. Jetzt rechnen die Menschen ihr Licht je Texel, tragen im
  Alpha eine Kennung, und der Post-Pass rastert sie nicht – 100 % auf Texelgrenzen, nah, weit und
  nachts. Die Lampen folgen der gebackenen Normale nur noch zu 0,4; nachts verlieren Mond und Himmel
  auf ihnen den größten Teil ihres Blaus, die Farben dunkeln eine Stufe in ihrer eigenen Rampe ab (die
  hellste Haut wurde sonst zu Grau), und das Eigenlicht ist etwas höher. Die Horde bleibt, wie sie war.
  Prüfung `menschen` (Raster nah und weit).
- **F6c – Büschel statt Rillen:** Haar am Hinterkopf, Dutts und Bärte haben ungleich breite Strähnen
  mit Kerben (vorher gleich breite Rillen – am Hinterkopf wie Bretter). Bert ist nur noch am Kinn und
  unter den Mundwinkeln grau (vorher graue Einzelspalten wie ein Strichcode).
- **F6c – Knopf und Gesichter mit Charakter:** Knopf hat zotteliges Fell im Relief statt Sprenkeln
  (die lasen sich wie Schmutz), einen dunklen Sattel, dunklere Schlappohren und größere Augen mit
  Glanz. Buschige Brauen für Bert, Balduin, Hannes, Fiete und Anton, Lachfältchen für Hilde, Balduin,
  Greta, Fiete, Emil, Paula und Edda (`look.bushy`, `look.lines`). Sommersprossen probiert und
  verworfen – neben den kleinen Augen lasen sie sich wie ein Schielen.
- **G7:** die Geschichte der Ankunft – eigener Eintrag oben.

## F5: Die Menschen schöner gezeichnet ✓

**Auftrag (01.10.):** »Hab mir die 2d Modelle angeguckt. Die Zombies gefallen mir. Die Menschen
könnten schöner sein. Recherchiere wie andere das machen und dann zeichne sie schöner.«

- **Recherche** (`recherche/menschen-gestaltung.md`, mit Vorher/Nachher-Bild): Draufsicht-Spiele
  zeichnen die Welt schräg von oben, ihre Figuren aber fast von vorn; der Kopf ist das Wichtigste,
  die Augen sitzen auf halber Höhe und tragen einen Glanzpunkt in derselben Ecke; Sel-out statt
  Einheitskontur, Linien auch innen, Licht aus einer Richtung, keine Gries-Pixel, Hue-Shifting,
  wenig Kleinkram.
- **Befund:** Die Menschen wurden wie die Schlurfer mit dem echten Kamerawinkel gebacken. Von
  Mikas Kopf gehörten 24 von 27 Texeln der Mütze und dem Scheitel, die Augen lagen dicht über dem
  Kragen – Mika schaute auf die eigenen Füße. Dazu Knopfaugen, eine grüne Kontur auf grünem Gras,
  Arme, die mit der Jacke verschmolzen, und graue und braune Punkte auf der Brust.
- **Frontaler gebacken** (nur Menschen und ihre Werkzeuge): Die ganze Figur kippt zum Backen um
  0,2 rad zur Kamera (`VIEW_TILT`, um die x-Achse der Welt durch den Fußpunkt, das Werkzeug um
  seinen Griff), der Kopf um weitere 0,25 rad über dem Hals (`HUMAN.headView`). Füße, Schatten und
  Anker bleiben, wo sie sind; Richtung und Seite des Werkzeugs rechnen mit der ungekippten Figur.
  Fürs Licht im Spiel drehen die Normalen zurück – im ersten Versuch zeigte das Gesicht zum Himmel,
  und nachts erreichte die Laterne es nicht mehr (es blieb grau).
  Mikas Augen sitzen jetzt 35 statt 26 Texel über dem Fuß, das Gesicht ist von vorn fast so groß
  wie die Mütze (vorher ein Zehntel davon).
- **Neue Gesichter:** Augen 3 Texel breit und 3 hoch (im Halbprofil das ferne 2), so weit
  auseinander wie ein Auge breit ist, Glanz oben links, unten die Iris; die Brauen so breit wie das
  Auge; alle Ausdrücke neu gesetzt. Brillen sind helle, runde Gestelle (dunkel und eckig wirkten
  sie mit den größeren Augen wie Schweißerbrillen). Wangen auf dunklerer Haut gedämpft.
- **Kontur und Linien** (`paint` mit Optionen, nur für Menschen): Sel-out zwei Stufen unter dem
  dunkelsten Ton des Stoffs, zur Lichtseite eine (`outlineLit`); ein Schlagschatten, wo ein Arm
  oder Bein mehr als 2,5 cm vor einer anderen Gruppe liegt (`groups`, `occlude`); die Töne werden
  vor den Linien nach der Mehrheit der Nachbarn aufgeräumt (`tidy`, Stoffe ohne Muster).
- **Kopf und Körper:** Der Kopf wird zum Kinn hin schmaler (`taper` am gerundeten Quader), die
  Schultern sind etwas schmaler. Mikas Brust ist ruhiger: gerade Riemen ohne Schnallen, keine
  Taschenklappen, ein dunklerer Reißverschluss; die Isomatte ragt nicht mehr wie eine blaue Hand
  heraus.
- **Farben:** Violett, Rosa, Weiß und Türkis haben eigene Rampen (in der Palette liegen die
  Akzente nebeneinander – die lila Mütze lief von Rosa bis Weiß, Konturen wurden rosa), Blond liegt
  in einer Honigrampe statt in der Feuerrampe (keine rote Kontur mehr).
- **Die Schlurfer bleiben, wie sie sind:** Alle Neuerungen sind Optionen, die nur die Menschen
  setzen; ein Fingerabdruck aller 510 Schlurfer-Bilder ist vorher und nachher gleich.
- **Werkzeuge:** `tools/menschen-bogen.mjs` hat höhere Zellen (die Figuren sind im Bild etwas
  größer); Backen dauert gut 10 % länger (rund 42 ms je Bild).
- **Prüfung** (Abschnitt `menschen`): Mika von vorn mit Gesicht und Mütze im Verhältnis, die Augen
  weit genug oben.

## B1: Spannung der Nächte ✓

**Auftrag (01.10.):** Punkt 2 der Liste »Qualität und Spielspaß« – auf »Ausgewogen« hielt der
Balance-Durchlauf alle Nächte, ohne dass die Horde je ernsthaft an die Barrikaden kam
(OFFENE-FRAGEN 222).

- **Der Balance-Durchlauf baut jetzt wie ein Mensch:** Der zweite und vierte Turm decken die
  Barrikaden am letzten Abschnitt (vorher standen alle Türme 20–40 m weiter westlich an den
  Abzweigen – was durchkam, traf nur noch auf Mika); kündigt der Nachtplan eine Nebelwelle an,
  stellt er Laternen an den Weg, wie Edda rät; nach einem Durchbruch baut er Wall und Tor zuerst
  wieder auf (sonst stand das Lager offen und jede weitere Nacht ging verloren).
- **Er sagt mehr:** wer am weitesten kam (Art, Champion, Merkmal, Welle), wie viele aus welcher
  Welle bis an die Barrikaden kamen, wie weit der Boss kam; `--zaeh=…` und `--boss=…` probieren
  Werte aus, ohne `src/data/` anzufassen. Dieselbe Nacht streut von Lauf zu Lauf (einmal still,
  einmal knapp) – geurteilt wird über alle Nächte.
- **Gefunden:**
  - Vorher kamen auf »Ausgewogen« nur in den Nächten 1, 2, 4, 7 und 9 einzelne Schlurfer an die
    Barrikaden, keine ging zu Bruch.
  - Die Spanne zwischen »still« und »verloren« ist schmal: Mit 1,5-fach zäheren Schlurfern ab
    Nacht 3 verlor der Bot Nacht 9 (Nebel, Moderflut und Brüter in einer Nacht) und danach jede
    weitere. Schuld war keine einzelne Welle, sondern dass sich die Wellen stauten.
  - Die Bosse waren die leichtesten Nächte: Der Holzfäller fiel 20 m vor den Barrikaden, die
    Pilzmutter noch weiter draußen – ihre Angriffe zeigten sich nie. Mit doppeltem Leben kommt der
    Holzfäller bis an die erste Reihe, mit dreifachem zerschlägt er alle und das Tor.
- **Geändert:**
  - Die Zähigkeit setzt eine Nacht früher ein (`TOUGHNESS.from` 3 → 2): Nacht 3 ×1,4, Nacht 6
    ×1,2, Nacht 9 ×1,16, Nacht 12 ×1,1, die Frostnacht ×1,06 gegenüber vorher.
  - Bosse tragen die Zähigkeit einer Bossnacht und ein Fünftel mehr (`BOSS_HP` = 1,2): der
    Holzfäller in Nacht 5 ×2, die Pilzmutter in Nacht 10 ×3,9; Bossnächte bekommen die Hälfte statt
    40 % der Zähigkeit. Das Moderherz behält seine Kurve und ist in der Frostnacht der einzige Boss –
    vorher lief dort die Pilzmutter der Nacht 30 mit (mit dem alten Bossleben fiel sie sofort, mit
    dem neuen hätte sie das Herz geheilt).
- **Ergebnis (zwölf Nächte):**
  - *Ausgewogen:* zwölf gehalten, kein Durchbruch; Schlurfer an den Barrikaden in 7 von 12
    Nächten (1, 2, 4, 5, 7, 9, 10), Barrikaden zerschlagen in den Nächten 5 (Holzfäller) und 7,
    angeschlagen in 9 und 10; die Pilzmutter kommt bis an die erste Reihe.
  - *Gemütlich:* zwölf gehalten; nur die Bosse und zwei Nächte kommen an die Barrikaden, Mika nie
    unter 82.
  - *Wild:* zwölf gehalten, aber eng – an den Barrikaden in 8 von 12 Nächten, in Nacht 5 schlägt
    der Holzfäller neun Barrikaden und das Tor ein, in den Nächten 8 und 9 sinkt Mika auf 5 und 4.
- **Ergebnis (30 Nächte, Ausgewogen):** alle gehalten; Schlurfer an den Barrikaden in 22 von 30
  Nächten, ab Nacht 17 in fast jeder (bis zu 780 auf einmal), die Laternenhexe (Nacht 15) bis an
  die Barrikaden, der zweite Holzfäller (Nacht 25) schlägt die Reihen und das Tor ein und fällt
  davor; Durchbrüche in Nacht 28 (das Lager wird geplündert, das Haus hält) und in der Frostnacht.
- **Ergebnis (30 Nächte, Wild):** alle gehalten; Schlurfer an den Barrikaden in 27 von 30 Nächten,
  knapp (Barrikaden zerschlagen oder Tor getroffen) in 17; Mika sinkt in Nacht 8 auf 6; der zweite
  Holzfäller (Nacht 25) schlägt das Tor ein, die Frostnacht bricht durch (36 im Lager, das Haus
  hält).
- **Prüfung** (Abschnitt `nacht16`): Nacht 2 unverändert, Nacht 3 zäher, der Holzfäller trägt die
  Zähigkeit seiner Nacht.
- **Offen:**
  - Das Moderherz erstarrt beim Bot mit 95–97 % Leben (in M25: 43 %). Mit den alten Werten
    nachgespielt bleibt es gleich: Es kommt in Phase 2 (unter zwei Drittel) und heilt sich dort mit
    den Sporen (10 % alle 11 s) wieder hoch, weil vor dem Tor Hunderte Schlurfer das Feuer der
    Türme binden; die zähen Brummer der späten Nächte haben fast so viel Leben wie das Herz (die
    Scharfschützen zielen auf den Stärksten). Ob das Herz das Feuer auf sich ziehen soll, ist eine
    Frage an den Auftraggeber.
  - Zum Ausprobieren ohne `src/data/` anzufassen: `node tools/balance.mjs --nacht=datei
    --herz=ziel,heil:0.5` (Scharfschützen zuerst aufs Herz, halbe Heilung). Nachgespielt auf
    »Ausgewogen«: nur `ziel` – das Herz fällt; nur `heil:0.5` – erstarrt mit 75 %; `ziel` mit
    doppeltem Herzleben – erstarrt mit 46 % am Tor. Der Mittelweg läge bei `ziel` und 1,3- bis
    1,5-fachem Herzleben.

---

## H5: Das Baumenü nach Zweck, die Figur an der Werkbank ✓

**Auftrag (01.10.):** Punkt 5 der Liste »Qualität und Spielspaß« (recherche/hud-baumenue.md 5.3,
OFFENE-FRAGEN 220).

- **Reiter nach Zweck**, immer in derselben Reihenfolge: Türme · Helfer · Fallen · Lager · Leute ·
  Zuhause · Schmuck (Helfer und Fallen mit den Bauplänen, Leute mit dem ersten Gast, Schmuck aus dem
  Herbstbuch). Zugeklappt gehören Q R T G C weiter den Türmen.
- **»Lager« ist neu:** Werkbank, Holzlager, Beet, Bank, Laternenpfahl. »Leute« trägt Schlafplätze,
  Hochsitz, Übungsplatz, Lagerglocke und den Langen Jakob – sechs Kacheln, kein »weiter« mehr.
  »Zuhause« baut das Haus aus und repariert.
- **Die Figur an der Werkbank:** Das Fenster hat zwei Seiten, »Herstellen« und »Figur« (A/D, Tab
  oder Klick auf den Reiter). »Figur« zeigt Mikas vier Aufwertungen und die nächste Stufe jeder
  gebauten Waffe (vorher nur die Waffe in der Hand). Zu ist die Werkbank wieder bei den Rezepten.
- Edda nennt beim Ziel »Werkbank« den Reiter »Lager«; die Werkbank sagt beim ersten Bau, dass sie
  auch »Figur« kann; die Steuerung nennt »Kacheln im Baumenü« und »Baumenü öffnen, Reiter wechseln«.
- **Prüfung:** Tab bis »Lager«, Q, E baut die Werkbank (`bauen`); die Reiter mit allen Bauplänen
  (`spielzeug`); »Leute« auf einer Seite, »Lager« und »Zuhause«, das Blättern bleibt für lange
  Listen (`oberflaeche`); an der Werkbank D zur Seite »Figur«, S zur Bratpfanne, E wertet auf
  (`nahkampf`, Bild: werkbank-figur).

---

## L1: Lektorat der Spieltexte ✓

**Auftrag (01.10.):** Punkt 4 der Liste – alle Spieltexte durchlesen (OFFENE-FRAGEN 221).

- Gelesen: `texts.js`, `dialogs.js` und die Szenen in `scenes.js`. Die Texte waren gut in Form;
  korrigiert wurden Kleinigkeiten:
  - **Begriffe:** »Beute« statt »Loot« (Glückslaterne, Sammelradius, Sammlerherz), »Vorteil
    wählen« statt »Perk-Wahl«, »Baumenü« statt »Bauleiste« (Bericht nach einer verlorenen Nacht,
    Herbstschmuck, Steuerung, Mikas Abendsatz), »tagsüber« statt »über Tag«.
  - **Rechtschreibung:** wehtut, laufen gelernt, hierhergebracht, »nicht mehr der Jüngste«.
  - **Grammatik:** »Noch fehlt Zucker« und »es fehlt noch Holz« (das Verb folgt der Menge),
    »Hildes Zelt« über `T.genitiv`, Mengen im Handel über `T.menge` (»1 Zahnrad«, »3 Zahnräder«).
  - **Sinn:** Ida pflegt die Bäume, »wenn du welche fällst« (vorher: »wenn du fällst«), sie hat die
    Seewelle »angefunkt«; Mika duzt auch Dr. Yusuf; der Moder fing »vor drei Jahren« an (nicht »vor
    drei Herbsten, in einem … Herbst«).
  - **Zeichen:** »…« für Reiter und Einstellungen (»Leute«, »Gemütlich«), „…“ für Rede.
- Kein Prüfpunkt fragt die alten Texte ab (alle geänderten Zeilen gegen `tools/check.mjs` gesucht).

---

## S1: Der Spielstand als Datei ✓

**Auftrag (01.10.):** Punkt 3 der Liste »Qualität und Spielspaß« – den Stand aufheben oder auf
einen anderen Rechner mitnehmen können.

- **Pausenmenü → »Spielstand«** (auch im Titelbild): »Als Datei sichern« speichert erst und lädt
  dann eine Datei herunter (`zomfy-towers-Name-tag-7.json`, mit Version und Kennung).
- **»Aus Datei laden«** öffnet die Dateiwahl. Die Datei läuft durch die Migrationen und
  `sanitizeState`; eine fremde Datei oder eine aus einer neueren Fassung wird mit Meldung
  abgelehnt. Die Rückfrage nennt Name und Tag, vorgewählt ist »Lieber nicht«; »Ja, laden« ersetzt
  den Stand und lädt die Seite neu (die Karte gehört zum Stand).
- Im Test-Modus ohne Speichern sagt das Spiel, dass Laden aus Datei dort nicht geht.
- **Prüfung** (Abschnitt `datei`): Sichern und Laden mit echten Tasten, Dateiwahl und Download
  über Playwright, Ablehnen (Bilder: spielstand-menue, spielstand-frage).

---

## F4: Die Menschen als Sprites (erste Stufe) ✓

**Auftrag (01.10.):** »Ja alles machen. Die Sprites als erstes. Dann gucke ich ob mir das
gefällt.« – fünf Punkte, die Menschen als Sprites zuerst (Nr. 218).

- **Das Gerüst:**
  - Menschen entstehen wie die Horde aus runden Formen, aber aufrecht und mit großem Kopf
    (`peopleFigure.js`: Maße, Posen, die Laterne, ein Vierbeiner für Knopf).
  - Acht gezeichnete Richtungen statt fünf (Laterne links, Werkzeug rechts – gespiegelt wechselten
    sie die Hand), ein eigener Atlas und ein eigener Worker, Mika zuerst.
  - Gesichter als Flicken: Das Bild trägt das gewöhnliche Gesicht, jeder andere Ausdruck nur die
    Texel, die sich ändern (Blinzeln, Lächeln, »Aua«, entschlossen, müde, besorgt, staunen).
  - Werkzeuge als eigenes Bild in 16 Winkelstufen um die Hand und schräg auf dem Rücken, vor oder
    hinter der Figur.
- **Mika** in beiden Figuren und jedem Aussehen: Mütze mit Rippenbund, Streifen, Abnähern und
  Bommel, Jacke mit Reißverschluss und Taschenklappen, Rucksack mit Isomatte, Flicken am Knie,
  Stiefel. Dazu die Laterne, Schwung, Treffer, Hechtsprung, Suchen, Wurf, Jubel und Laternenblitz.
- **Die Leute:** Oma Hilde, Bert, Juna, Dr. Yusuf, Balduin (mit seinen Gesten) und Knopf, jede
  Figur mit ihrem Merkmal und kleinen Dingen (Posthorn, Bleistift, Antenne, Stethoskop, Goldzahn,
  der goldene Knopf am Halsband).
- **Zweite Stufe (gleich danach):** die zwölf Wanderer, Edda nach dem Herbst, Marthe und ihre
  Kinder nach ihren Voxel-Vorbildern – Hannes mit dem breiten Hut der Walz, Clara mit Schweißbrille
  und Pferdeschwanz, Lotte mit Strickschal und leuchtender Laterne an der Hüfte, Greta mit
  Federhut und Fernglas, Fiete mit Südwester und Pfeife, Ida mit Bommelmütze und Warnstreifen, Rosa
  mit gepunktetem Kopftuch und Kochlöffel, Anton mit Baskenmütze und Quetschkommode, Emil mit
  Strohhut und Blume, Frieda mit Stirnband und Lederschürze, Mara mit Zipfelkapuze und Kartenrolle,
  Paula mit Dutt und Stricknadeln, Edda mit silbernem Zopfkranz und Kopfhörern um den Hals, Marthe
  mit Hafenmütze und Zollstock; Pim (Zeitungshut, Sommersprossen) und Lu (Zöpfe, Dufflecoat,
  Apfel) mit dem kleineren Körper der Kinder. Jede Figur braucht rund ein Siebtel einer
  Atlasseite.
- **Im Spiel:** Einstellung »Figuren: 3D/2D« (Standard 2D, `?figuren=`). Die Voxel laufen
  unsichtbar mit; seltene Posen (Rudern, Angeln, Kartentisch, Schaukel, Schießen, Lagerglocke,
  Übungsplatz, Drachen …) bleiben Voxel. Mit der neuen Zeile hat die Einstellungsseite vierzehn
  Knöpfe – bei großer Oberfläche (270 Zeilen) rücken sie auf 14 Pixel zusammen (die Prüfung
  `groesse` fand, dass die Seite sonst oben und unten übers Bild ragte).
- **Werkzeug zum Ansehen:** `node tools/menschen-bogen.mjs bogen.png --figur=mika`.
- **Prüfung** (Abschnitt `menschen`): Standard und Backen, alle Fassungen ohne leeres Bild,
  Laufen mit echten Tasten, Axt auf dem Rücken und im Schwung, »Aua«, Laterne, Rückfall auf Voxel,
  die Leute im Hof mit Lächeln (Bilder: menschen-tag, menschen-3d, menschen-nacht, menschen-bogen).
- **Offen:** Sitzen am Tisch, Rudern und Angeln als Bilder; Feinschliff nach dem Urteil des
  Auftraggebers.

---

## F3: Nachts in 2D, der vierte Stern und die Schlurferkunde mit Bildern ✓

**Auftrag (30.09., abends):** »Woran könnten wir heute Nacht noch schleifen?« – vier Punkte, vom
Auftraggeber mit »Ja, mach so« bestätigt (Nr. 215–217).

- **Echte Nächte in 2D angesehen (F3a):**
  - Nacht 5 aus einem Stand des Balance-Durchlaufs, mit achtfachem Leben je Schlurfer, damit die
    Horde bis ans Tor kommt. Alle Schlurfer im Bild sind Sprites (keiner bleibt Voxel), der
    Holzfäller schlägt als Sprite zu, die Konsole bleibt sauber.
  - Ein Fehlalarm unterwegs: Die Messung zeigte Schlurfer mit NaN-Position. Schuld war das
    Messskript (es setzte Mika auf das Tor, das Zellen statt x/z hat). Das Spiel selbst war
    heil.
- **Nachts lesbarer (F3b):**
  - Um jedes Eigenlicht glimmt nachts ein Hof aus genau einem Texel in seiner Farbe. Das ist
    gerastert, ohne Weichzeichnen. In der Nebelwelle sieht man so Augen mit Hof.
  - Champions tragen einen goldenen Rand an der Kontur, der langsam pulsiert. Die goldene
    Tönung der ganzen Figur entfällt bei den Sprites.
  - Prüfung (Abschnitt `sprites`): Bildpunkte mit und ohne Hof bzw. Rand werden gezählt.
- **Der vierte Stern auf »Wild« (F3c, Nr. 118):**
  - Eine Nacht, die ganz auf »Wild« läuft, bringt einen vierten Stern. Im Bericht glüht er rot
    wie Glut.
  - Wer mittendrin leichter stellt, verliert ihn (Meldung). Auf »Gemütlich« und »Ausgewogen«
    bleibt es bei drei Sternen, ohne grauen vierten.
  - Er zählt zu allen Sternen im Buch, nicht zur Tat »Drei Sterne«. Spielstand v33 mit Migration.
- **Die Schlurferkunde mit Bildern (F3d):**
  - Neben der Beschreibung steht die Art von vorn, gebacken wie die Sprites der Horde. Große
    Arten werden kleiner gebacken, bis sie in 60 Pixel passen, nie skaliert.
  - Unbekannte Arten stehen als Schattenriss da; nur ihr Eigenlicht glimmt.
  - Gebacken wird beim Aufschlagen, höchstens ein Bild je Bild im Spiel.
- **Prüfung** (Abschnitt `buch`): Der vierte Stern mit echter Taste, verloren beim Umstellen,
  drei auf »Ausgewogen«, Speichern v33 und Migration v32 → v33; die Schlurferkunde zeigt Bild
  und Schattenriss (Bilder: sterne-wild, schlurferkunde, schlurferkunde-riss).
- **Volle Prüfung:** 555 ✓ in allen 52 Abschnitten. Sie lief diesmal Abschnitt für Abschnitt
  (`--nur=…` je Abschnitt), weil ein Neustart des Containers den ersten Durchlauf abbrach.

---

## N11: Das Startbild läuft von selbst ✓

**Rückmeldung (30.09.):** »am Anfang muss man das Tales of Cue weg drücken. Voll doof. Schau mal
wie so eine Präsentation richtig geht.« Recherche in `recherche/praesentation.md` (Nr. 214).

- **Von selbst:**
  - »Tales of Cue präsentiert« blendet ein, die Laterne flammt auf, ein Glanz läuft über den
    Schriftzug, dann blendet es aus.
  - Nach rund 3,5 s ist das Titelbild da. Kein »Taste drücken« mehr.
- **Jede Taste, jeder Klick überspringt sofort.** Die Eingabe startet nebenbei die Titelmusik.
- **Beim zweiten Mal kürzer:** rund 1,6 s, gemerkt im Browser (`zomfy-towers.startbild`), nicht
  im Spielstand – wie Konsolen, die Studio-Logos nach dem ersten Start nicht mehr zeigen.
- **Ton ohne Zwang:**
  - Hatte die Seite schon eine Eingabe (`sound.allowed()`), spielt die Spieluhr zum Glanz.
  - Sonst ist das Startbild still, und im Titelbild steht unten rechts neben einem stummen
    Lautsprecher: »Mit der ersten Taste beginnt die Musik.« Die erste Taste startet das
    Titelstück, der Hinweis verschwindet.
- **Prüfung** (im Spielstart):
  - Das Startbild läuft ohne Taste und still ins Titelbild; der Hinweis steht da; die erste
    Taste startet »Herbstlied am Kranichsee«; beim zweiten Mal die kurze Fassung.
  - In der Ankunft überspringt eine Taste es sofort.

---

## F2: Die Horde als Sprites im Spiel ✓

**Auftrag (30.09.):** »Mache ruhig weiter, die neuen Optiken gefallen mir.« Alle 17 Formen aus dem
Gestaltungsbogen laufen jetzt im Spiel, und 2D ist der Standard. Zurück zu den Voxeln geht es in
den Einstellungen unter »Schlurfer: 3D/2D« (Nr. 213).

- **Backen im Hintergrund:**
  - Ein oder zwei Worker rechnen die Bilder (`spriteWorker.js`), das Spiel ruckelt dabei nicht.
  - Zuerst kommt, was im Bild steht, dann die Arten der kommenden Nacht, dann der Rest.
  - In der Prüfung: der Schlurfer nach 4 s; alle 17 Formen (1530 Bilder mit den Fassungen) in
    rund 40 s mit zwei Workern.
  - Bosse backen nur, wenn der Plan oder das Bild sie verlangt.
  - Solange eine Art nicht fertig ist, bleibt sie Voxel.
  - Ohne Worker backt das Spiel selbst, ein Bild je Bild im Spiel.
- **Atlas mit Seiten:**
  - Seiten von 1024², je Texel vier Bytes: Palettenindex, Art, Normale in der Bildebene
    (`spriteCode.js`). Das ist halb so viel Speicher wie vorher.
  - Die Bilder einer Art kommen zusammen und werden nach Höhe gepackt. Alle Arten zusammen
    brauchen zehn Seiten (40 MB).
- **Jede Form richtig:**
  - Der Schildträger ohne Tür hat seine eigene Form.
  - Champions (×1,15) und die Teile des Moosriesen (×0,55) werden in ihrer Größe gebacken. Bis
    dahin zeigen sie die Grundform vergrößert.
  - Der Moderfalter fliegt im Bild; sein Schatten liegt am Boden.
  - Der Gräber verschwindet gerastert in der Erde.
- **Zustände:**
  - Ausholen (auch der Boss, der dabei vor Kraft zittert) und Schlag in drei Bildern.
  - Nach dem Ausholen schlägt der Boss jetzt sichtbar zu – auch als Voxel, der die Arme aus der
    Höhe herabführt.
- **Fußknick:** Unter der Fußlinie liegt das Bild auf dem Boden statt aufrecht. Laub, der
  vordere Fuß und hingesunkene Figuren versinken nicht mehr in der Erde, und kein Umriss schimmert
  dort mehr durch.
- **Prüfung** (Abschnitt `sprites`, neu):
  - Worker und Reihenfolge, Nachtplan, alle Formen ohne leeres Bild.
  - Die Aufstellung aller Formen (Bilder `sprites-arten-3d`, `-tag`, `-nacht`).
  - Zustände, Tür, Champion, der kleine Moosriese, Falter und Gräber (Bild `sprites-zustaende`).
  - Backen ohne Worker; der Bogen wird aus dem Atlas zurückgelesen.

---

## F-Design: Die Horde, liebevoll gestaltet ✓

**Auftrag (30.09.):** »Das mit den 2d Schlurfern testen wir bitte. Aber die Designs dürfen nur
Grundlage sein. … du nimmst dir Zeit die Figuren liebevoll detailliert und gut zu gestalten. Erst
wenn du das erledigt hast, bauen wir die 2d Gegner ein.«

Alle 16 Arten und 5 Bosse haben jetzt einen Entwurf als Sprite, dazu der Schildträger ohne Tür.
Beschrieben ist das im Gestaltungsbogen `recherche/schlurfer-gestaltung.md`, mit Bildern je Art
und einer Aufstellung aller Formen bei Tag und bei Nacht. Eingebaut sind sie noch nicht (das ist
F2); im Spiel zeigt »Schlurfer: 2D« schon den neuen Schlurfer.

- **Der Schlurfer neu:**
  - Die Proportionen folgen jetzt den Voxel-Figuren: großer runder Kopf, kurze Beine. F1 wirkte
    neben Mika wie ein Stelzenläufer.
  - Kleidung: blaues Arbeitshemd mit Knopfleiste und Brusttasche mit Bleistift, gekrempelte
    Ärmel, das Hemd hängt links aus der Hose. Im Rücken ist ein Riss, darunter wächst Moos.
  - Flicken an Bauch und Knie, ein Zeh schaut aus dem Schuh.
  - Wirres Haar mit Stirnlocke, eingerissenes Ohr, Gänseblümchen. Am Hinterkopf glimmen nachts
    Moderpilzchen.
  - Schwere Lider; beim Schlag gähnt er, getroffen kneift er die Augen zu. Wenn er fällt,
    schläft er ein und zerfällt zu Laub.
- **Die anderen Arten** (Einzelheiten im Bogen):
  - der Flitzer mit Startnummer 13 und flatternden Kordeln;
  - der Schwärmer als Moosball mit drei Fliegenpilzen;
  - der Brummer mit Warnweste, Warnkegel und Schnurrbart;
  - der Leuchtpilz mit glimmendem Tupfenhut;
  - der Anführer als alter Förster mit Geweih aus Zweigen;
  - der Moderfalter mit Augenflecken, die nachts glimmen;
  - der Gräber mit Latzhose, Möhre und Spaten;
  - der Schildträger mit Gartenhaustür (Herz, Hufeisen) und Kochtopf;
  - der Lichtfresser mit Kerzenstummeln im Gürtel und Rauchfaden am Löscher;
  - der Brüter mit Pausbacken und pulsierenden Sporensäcken.
- **Die Bosse:** Holzfäller (Karo, Pudelmütze, Axt), Pilzmutter (Tupfenhut, Korb voller Pilze),
  Laternenhexe (Spitzhut mit Schnalle, Laternenstab), Moosriese (Findlinge im Moos, Farne),
  Moderherz (zwei Kammern, Pilzkrone, Wurzelbeine, Ranken, glimmende Knoten).
- **Bäcker und Gerüst:**
  - Neu im Bäcker: Muster auf der Form (`matAt`), Erde unter dem Boden, Tiefentest für Stempel.
  - Neues Gerüst `spriteFigure.js`: Körper nach Maßen, sechs Gangarten, Ellbogen je Arm.
  - Neue Bilder je Richtung: Ausholen (1) und Schlag (3), zusammen 17 Bilder, 85 je Art.
- **Werkzeuge (ohne Browser):** `tools/schlurfer-bogen.mjs` (Musterbogen einer Art),
  `tools/schlurfer-reihe.mjs` (Aufstellung aller Arten).
- **Prüfung** (Abschnitt `sprites`): 85 Bilder für den Schlurfer; alle 17 Formen backen in jedem
  Zustand von vorn und von der Seite ein Bild mit Inhalt und haben etwas, das nachts glimmt.

---

## Kaminsims: Kerzen, die man sieht ✓

Beim Setzen der Streichholzdose (N10) fiel auf: Kerzen, Uhr und Kräuterglas auf dem Kaminsims
standen seit M11 hinter der Vorderseite der Kaminschürze (z 7–10, die Schürze reicht bis z 11) –
man hat sie nie gesehen, nur die Flammen der Kerzen glommen irgendwo darüber.

- Die zwei Kerzen stehen jetzt an den freien Enden des Simses (links höher, rechts kürzer), ihre
  Flammen leuchten abends an derselben Stelle.
- Uhr und Glas fallen weg: Über dem Sims hängt das Hufeisen (M29), die Kante davor gehört den
  Einsätzen des Kartenabends und der Streichholzdose.
- Prüfung: Abschnitt `karten` (12 Prüfpunkte, Kaminsims mit Einsätzen), Stube bei Tag und Nacht
  angesehen.

---

## N10: Das erste Feuer ✓

**Auftrag (30.09.):** »Bei der Ankunft ist das Feuer am laufen. Das könnte eine erste Quest sein
das Feuer zu machen. Dafür brauchen wir vielleicht etwas aus dem Haus.« Dabei fiel noch etwas
auf: Auch der Kamin brannte, und aus dem Schornstein stieg Rauch – in einem Haus, das seit drei
Herbsten leer steht.

- **Alles kalt bei der Ankunft:**
  - In einem neuen Spiel mit Ankunft sind Feuerstelle und Kamin kalt. Es gibt kein Licht (die
    Lichter bleiben und werden nur über `on` gedimmt), keine Flammen, keinen Rauch und keine
    Funken.
  - Die Feuerstelle ist grau und bemoost, in der Asche liegt nasses Laub, im Kamin glüht nichts.
  - Schon vom Boot aus denkt Mika: »Ein Haus mit Schornstein – aber kein Rauch.«
  - Alte Spielstände brennen weiter (nur Flags, kein neuer Spielstand).
- **Drei neue erste Ziele** (danach kommt wie bisher die Axt):
  1. **Die Streichhölzer:** Eine rote Blechdose steht vorn auf dem Kaminsims, E am Kamin nimmt
     sie. Der goldene Pfeil zeigt draußen zur Haustür und drinnen auf die Dose.
  2. **Der Kamin:** E zündet ihn an. Das Holz darin hat Edda noch selbst aufgeschichtet.
  3. **Das Lagerfeuer:** E zündet es an, das kostet zwei Scheite. Fehlt Holz, zeigt das Ziel zu
     den nächsten Ästen (»Sammle Äste für das Lagerfeuer – das ist Holz. (1/2)«).
- **Anzünden:**
  - Ein Streichholz ratscht (neues Klangrezept), Funken stieben. Die Flammen wachsen in
    zweieinhalb Sekunden aus der Glut, das Licht wächst mit.
  - Mika freut sich: »Na also. Jetzt sieht es hier nach Zuhause aus.«
  - Ohne Streichhölzer gibt die kalte Feuerstelle einen Gedanken, nie einen Dialog.
- **Edda:**
  - Mit Einführung erklärt sie jedes der drei Ziele.
  - Brennt das Feuer, sagt sie immer, auch ohne Einführung: »Ich seh Rauch über der Holzlände.
    … Wirklich, ich seh ihn. Drei Herbste war da keiner. Willkommen zu Hause.«
  - Wo sie ist, sagt sie nicht. Aber vom Sturmhuk sieht man die Bucht, und im Funkbuch steht
    später: »Und dann hat jemand das Feuer angemacht. Du.«
- **Nebenbei:**
  - Zeilen über ein Ziel fallen weg, wenn es schon erreicht ist, bevor Edda dazu kommt
    (`funk.once(flag, text, stale)`). Dose, Kamin und Feuer liegen dicht beieinander.
  - Der goldene Zielpfeil zeigt jetzt auch drinnen, aber nur auf Ziele im Haus.
  - Kerzen, Uhr und Kräuterglas auf dem Kaminsims stecken seit M11 in der Kaminschürze und
    waren nie zu sehen. Frei ist nur die Kante davor, wo die gewonnenen Einsätze stehen. Offen:
    sie dorthin setzen, ohne den Einsätzen die Plätze zu nehmen.

**Prüfung:** Neuer Abschnitt `feuer` mit fünf Prüfpunkten, alle mit echten Tasten: kalt nach der
Ankunft, Gedanke, Haustür, Dose, Kamin, zu wenig Holz, Äste, Anzünden, Wachsen, Eddas Zeile,
Speichern. Grün sind außerdem `ankunft` (das erste Ziel sind jetzt die Streichhölzer),
`probespiel`, `karten` und `bindung`: 52 Prüfpunkte.

**Entscheidung des Auftraggebers zu F2–F4 (30.09.):** »Das mit den 2d schlurfern testen wir
bitte. Aber die Designs dürfen nur Grundlage sein.« Wenn alles andere erledigt ist, werden die
Figuren in Ruhe liebevoll und detailliert neu gestaltet. Erst danach werden sie eingebaut, dann
wird angesehen, wie es wirkt (DESIGN 8, Plan ab 30.09., Punkt 6).

## G6: Kleine Wunder ✓

**Auftrag (30.09.):** »Die Story ist noch dünn.« Nach G1–G5 kommen die optionalen Stücke aus
`recherche/storytelling-namen.md` (4.3 und 5.2) dazu. Die Welt erzählt dabei selbst, was Texte
bisher nur behaupteten. Balance und Spielstand ändern sich nicht (nur Flags).

- **Die Stümpfe mit den drei Kreuzen:**
  - Am Waldrand der Zuläufe und am Südrand der Bucht stehen alte Stümpfe. In ihre Schnittfläche
    hat jemand drei Kreuze geschlagen. Dazu kommen Moos, ein Baumschwamm und abgefallene Rinde
    (Modell im Maß 1/32).
  - E gibt einen Gedanken (nie einen Dialog). Hat Hilde von den Moosleuten erzählt, denkt Mika
    an sie, im Schnee an ihre Ruhe.
  - Die Stümpfe werden nach der Natur auf freie Stellen gesetzt, der Zufall des Waldes bleibt
    derselbe. Im Norden der Bucht hätten Haus, Birke und Eiche sie verdeckt.
- **Der Sturmhuk blinkt: kurz, kurz, lang.**
  - Der Leuchtturm liegt weit außerhalb des Bildes. Er erscheint als kleine Leuchtturm-Marke am
    Rand, in Richtung Nordosten, und ihre Lampe folgt der Blinkfolge. Eine Lichtquelle kommt
    nicht dazu.
  - In der Frostnacht blinkt er die ganze Nacht. Edda: »Ich hab die Lampe angezündet. Zum
    ersten Mal seit drei Jahren. Für euch.« Ist Clara schon dort, halten beide sie an.
  - Solange jemand am Sturmhuk ist (Clara, oder Edda nach der Frostnacht bis zu ihrer
    Heimkehr), blinkt es jeden Abend ab Viertel vor acht dreimal. Mika denkt: »Gute Nacht,
    Clara.« Claras Brief und ihr Funkspruch hatten das Blinken schon angekündigt, jetzt sieht
    man es.
  - Die Ortskunde erzählt vom Blinken und vom Abendgruß.
- **Der See singt:** Ist die Frostnacht gehalten (ob das Herz fiel oder im Morgengrauen
  erstarrte), klingt das erste Eis. Hohe Pfeiftöne gleiten hinunter, dazwischen dumpfes
  Wummern – ein neues Klangrezept. Edda: »Hörst du? Der See singt. Das tut er nur beim ersten
  Eis.«
- **Balduins Plane:** Ab Tag 20 liegt vorn in seinem Boot etwas Großes unter einer olivgrünen
  Plane. Etwas Spitzes drückt von innen dagegen. »Das da vorn im Boot? Frag nicht.« Nach dem
  Herbst sagt er: »Die Sammlung? Nächsten Herbst. Vielleicht.« Die Plane geht nie auf.
- **Hilde über Balduin:** Kennt Mika ihn, erzählt Hilde ab Tag 9 einmal von der Seepost:
  »Immer eine Stunde schneller als ich – weil der Herr nicht klingeln musste. Angeber.«

- **Nebenbei (Gedanke am Waldrand):** Ein Stumpf stand genau dort, wo die Prüfung den Gedanken
  am Waldrand auslöst. Sie wich an einen schrägen Waldsaum aus – und dort blieb der Gedanke aus,
  weil Mika beim Dagegenlaufen am Saum entlanggleitet und nie stillsteht. Jetzt zählt das Tempo
  in Laufrichtung (`checkForestEdge`), der Gedanke kommt auch am schrägen Rand.

**Prüfung:** Neuer Abschnitt `wunder` (Stümpfe mit echter Taste, Abendgruß mit Clara,
Frostnacht mit Blinken und Eisgesang, Plane, Seepost) und alle berührten Abschnitte grün
(ansicht, geschichte, finale, knoten, orte, uhr, haendler: 52 Prüfpunkte). Der Detailgrad misst
die Stümpfe mit (Maß 1/32), die Bildlast im Hof bleibt bei 1,17 Mio. Dreiecken.

## H4b: Jedes Fenster passt ✓

Nachgemessen nach H4: Bei »Oberfläche: groß« (270 Zeilen, 1080p im Vollbild) ragten mehrere
Fenster über den Bildrand. Jetzt passen sie:

- **Waffenschrank:** Er war fest 282 Zeilen hoch. Unter 290 Zeilen ist das Foto 26 Zeilen
  flacher und zeigt die Mitte der Waffe; die liegt ohnehin quer.
- **Morgenbericht:** Die Zeilen rücken zusammen, wenn der Bericht sonst zu hoch wäre.
- **Werkbank und Handel:** Lange Listen bekommen niedrigere Zeilen, mindestens 17 Pixel.
- **Balduins Katalog:** Er rutschte bei 270 Zeilen 4 Pixel über den oberen Rand.
- Die Karte passte schon.

**Prüfung:** Abschnitt `groesse` (neuer Schritt »H4b«), dazu `waffen`, `haendler`, `probespiel` und
`naechte`: 65 Prüfpunkte bestanden.

## Flackern beim Laufen: Die Schattenränder kochen nicht mehr ✓

**Rückmeldung (30.09., zum Stand N8):** »Das Flackern war weiterhin während der Bewegung des
Charakters.« Die Nebel-Korrektur von heute früh war dort noch nicht drin. Trotzdem gemessen, ob
sie reicht: Die Zeit steht, die Kamera rückt um genau einen Pixel. Alles, was sich dann ändert,
flackert beim Laufen, denn Gras, Wasser und Feuer bewegen sich bei stehender Zeit nicht.

- **Gefunden:** Bei jedem Pixel Schwenk wechselten 0,3 bis 0,6 % des Bildes. Alle diese Pixel lagen
  als gestreutes Muster in den weichen Schattenrändern: an Stämmen, Steinen, Kürbissen und Mika.
- **Die Ursache:** three.js r186 dreht die fünf Stichproben des Halbschattens je Bildpunkt mit
  einem Rauschen, das am Bildschirm hängt (`gl_FragCoord`). Rückt die Kamera weiter, bekommt jeder
  Punkt im Halbschatten ein anderes Muster. Beim Laufen kochten dadurch alle Schattenränder, im
  Nebel mit dem Dunst zusammen.
- **Jetzt** ist die Drehung fest (`pixelRenderer.js`). Derselbe Weltpunkt sieht in jedem Bild
  gleich aus, und der Rand bleibt weich, weil die Grafikkarte jede Stichprobe selbst filtert. Im
  Bild sehen die Schatten aus wie vorher.
- **Gemessen:** 0,3–0,6 % → höchstens 0,003 % des Bildes je Pixel Schwenk, am Tag wie im Nebel.
- **Prüfabschnitt `nebel`**, zweiter Prüfpunkt: tiefe Sonne, lange Schatten, je drei Schritte
  waagrecht und senkrecht. Die Gegenprobe mit dem alten Rauschen schlägt an (0,55–0,60 %).

## H4: Oberflächengröße ✓

**Auftrag (30.09.):** »Mit den minimalen Pixel … erkennt man nicht, was man bauen will.« Vierter
Schritt aus `recherche/hud-baumenue.md` (4.7, Nr. 210): Wer die Oberfläche größer (oder feiner)
will, stellt sie ein.

- **Neue Einstellung »Oberfläche: klein · mittel · groß«** neben »Pixelgröße«. Sie verschiebt den
  ganzzahligen Faktor der Oberfläche um einen Schritt. Bei 1920 × 1080 ergibt das 540, 360 oder
  270 Zeilen. Sie steht im eigenen Einstellungsspeicher, nicht im Spielstand.
- **Grenzen:** 270 bis 540 Zeilen. Lässt das Fenster die Wahl nicht zu, bleibt es beim nächsten
  erlaubten Wert, und die Zeile sagt es: »Oberfläche: groß (hier wie mittel)«. Das betrifft das
  1080p-Browserfenster mit 319 Zeilen und 1280 × 720.
- **Alles passt ins Bild:**
  - Das Pausenmenü rückt seine Zeilen enger, wenn die Höhe knapp wird.
  - Das Herbstbuch nimmt so viele Zeilen je Spalte, wie in die Höhe passen, und blättert den
    Rest (G5).
  - Notiz- und Werkstattbuch stellen ihre Einträge in zwei Spalten, wenn es eng wird.
  - Das behebt nebenbei ein echtes Problem: Im 1080p-Browserfenster (319 Zeilen) war das
    Herbstbuch mit allen Seiten schon höher als das Bild.
- **Edda weicht dem Baumenü aus:** Liegt ihr Funkfeld auf dem offenen Menü oder dem Bauzettel,
  spricht sie darüber.
- **Die Kacheln bleiben groß** (48 × 58). Ein kompaktes Baumenü mit kleineren Bildern gibt es
  bewusst nicht, denn die großen Bilder waren der Kern der Beschwerde.

**Prüfung:** Abschnitt `groesse`, 5 Prüfpunkte bestanden.

## H3: Zonen ✓

**Auftrag (30.09.):** »Aktuell ist alles super unübersichtlich.« Dritter Schritt aus
`recherche/hud-baumenue.md` (5.3, Nr. 209). H1 hat das Baumenü aufgeräumt, H2 die Meldungen.
Jetzt bekommt jede Tafel ihre Zone, und es steht nur da, was gerade zählt.

- **Feste Zonen:**
  - Oben links: Uhr mit Chronik, darunter das Ziel.
  - Oben Mitte: Nachtleiste und Bossbalken.
  - Oben rechts: Vorrat, darunter höchstens zwei Meldungen.
  - Unten links: Mikas Leiste, darüber Edda.
  - Unten rechts: der Knopf »Bauen« bzw. das Baumenü.
  - Die Mitte bleibt frei für die Welt. Die Randmarken liegen im freien Rechteck, das die Zonen
    lassen (nicht mehr an festen Rändern).
- **Vorrat:** Holz, Stein, Fasern, Schrott und Zombieteile stehen immer. Stoff, Zahnräder und
  Moderkerne erscheinen nur, wenn sie zählen:
  - beim Bauen;
  - wenn die Maus auf dem Vorrat liegt;
  - ein paar Sekunden nach einer Änderung, die neue Zahl kurz golden.
- **Ziel:** immer eine Zeile. Das Ziel geht vor dem Auftrag; der Auftrag steht dann als Zeichen
  am Ende der Zeile. Passt der Text nicht, wird er gekürzt, und der ganze steht beim Überfahren
  mit der Maus. In einer laufenden Welle ist die Zeile aus.
- **Schnellleiste:** Sie reicht bis zum letzten belegten Platz (mindestens drei) statt immer
  acht.
- **Fähigkeiten:** Nur belegte Kacheln sind zu sehen. Anfangs ist das nur der Laternenblitz,
  die zweite Kachel kommt mit der Wahl auf Stufe 3; der leere Platz mit der »3« ist weg.
- **Messbar:** `hud.layoutInfo()` liefert die Tafeln jedes Bilds und das freie Rechteck.
- **Gefundene Überlappung:** Eine lange Meldung rutschte unter die Nachtleiste – auf den
  Bossbalken. Jetzt weicht sie auch ihm aus.

**Prüfung:** Abschnitt `zonen`, 9 Prüfpunkte bestanden.

## G5: Ortskunde ✓

**Auftrag (30.09.):** »Die Namen der ganzen Orte ist nicht gut.« Letzter Namensschritt aus
`recherche/storytelling-namen.md` (2.2 und 4.6, Nr. 208). Die neuen Namen aus G1 bekommen eine
Herkunft, die man nachlesen kann.

- **Neue Seite »Orte« im Herbstbuch:** 24 Orte der Holzmark, vom Haus aus nach außen. Zu jedem
  steht, woher der Name kommt (»Wohld ist ein altes Wort für Wald …«), und darunter, was Mika
  seitdem erfahren hat.
- **Von Anfang an bekannt:** die Holzmark, der Kranichsee, die alte Holzlände (auf der Karte
  Ellerbucht), der Dämmerwohld und die alten Wege.
- **Was später dazukommt:**
  - Radio oder Juna: der Lange Jakob und die Seewelle.
  - Der Wegweiser, Yusuf oder Juna: Birkhagen.
  - Hannes' zweiter Moment: Tannrode.
  - Die Inseln beim ersten Landgang.
  - Die Insel im Nebel mit der Spur; ihren Namen »Apfelwerder« erst nach Marthe oder Eddas
    Seite im Zelt.
  - Die Zufluchtsorte, sobald jemand am Morgen der Entscheidung davon erzählt hat. Wer dorthin
    weitergezogen ist, steht dabei.
- **Die Einträge wachsen mit:**
  - Die Bank auf dem Kiekwerder: »J. L. wie Jakob Lindqvist? Dann war Alma seine Frau.«
  - Hildes Brief an die Holzlände 1.
  - Die Katze vom Kürbisholm.
  - Der Lange Jakob als Leuchtfeuer.
  - Nach dem Frost: »Mikas Bucht« und der schlafende Moder.
- **Meldung:** Ein neuer Ort erscheint als »Ortskunde: …« in der Chronik neben der Uhr.
- **Nebenbei behoben:** Mit allen Seiten waren die Reiter des Herbstbuchs schon breiter als das
  Buch. Jetzt brechen sie in zwei Reihen um. Seiten mit mehr als 16 Zeilen blättern
  spaltenweise mit der Auswahl weiter, mit Pfeilen am Rand, die auch per Klick gehen.

**Prüfung:** Abschnitt `orte`, 5 Prüfpunkte bestanden.

## G4: Die Uhr bis zum Frost ✓

**Auftrag (30.09.):** »Die Story ist noch dünn.« Vierter Schritt aus
`recherche/storytelling-namen.md` (4.3 und 4.5, Nr. 207): Die 30 Tage bekommen einen Kalender
und einen Bogen.

- **Tag n ist der n. Oktober:** Die Uhr zeigt das Datum (»19:52 · 12. Oktober«), der Countdown
  »Tag 12 von 30« bleibt. Nach dem Herbst läuft der Kalender weiter (Tag 32 = 1. November).
  Die Daten im Funkbuch (2., 8., 14., 20. Oktober) werden so zu Jahrestagen.
- **Die Natur im Morgenbericht** an zehn Tagen:
  - Kraniche rufen über dem See (Tag 3) und schlafen im flachen Wasser.
  - Der Pegel: eine Handbreit über dem Steinpfahl.
  - Die Buchen werden gelb.
  - Reif auf dem Steg (Tag 21), eine Eishaut am Ufer, weniger Kraniche.
  - »Die letzten Kraniche sind fort« (Tag 29).
- **Eddas Jahrestage** um neun über Funk:
  - Tag 12: drei Jahre Rauschen, dann Mika.
  - Tag 14: Marthes Umzug auf den Apfelwerder – nur wenn Mika die Spur kennt.
  - Tag 20: »Heute vor drei Jahren bin ich gegangen. … Mach das Feuer heute Abend ein bisschen
    größer, ja? Ich will es sehen.«
- **In der Frostnacht** bleibt Edda »die ganze Nacht dran«.
- **Nach dem Frost:**
  - Hilde: »Frau Holle hat die Betten ausgeschüttelt.«
  - Juna hört jemanden die zweite Hälfte pfeifen – Papas Lied.
  - Yusuf notiert in der Schlurferkunde: »Vielleicht wollte der Wald nur sein Laub zurück.«
  - Der Abspann endet mit »Seitdem nennen sie die alte Holzlände Mikas Bucht« (mit dem
    gewählten Namen), und die Karte sagt es auch.

**Prüfung:** Abschnitt `uhr`, 4 Prüfpunkte bestanden.

## G3: Der Wald erzählt ✓

**Auftrag (30.09.):** »Die Story ist noch dünn.« Dritter Schritt aus
`recherche/storytelling-namen.md` (4.2 Der Moder in Schichten, 2.7 Sagen, Nr. 206).

- **Die Gedanken am Waldrand** ändern sich mit dem Herbst:
  - Tage 1–6: was der Moder tut.
  - Ab Tag 7: der Volksmund – Stümpfe mit drei Kreuzen, Irrlichter, Moosleute.
  - Ab Tag 13: die Alte Ablage, wo das letzte Holz liegen blieb. »Holz geht immer zum Wasser.«
  - Ab Tag 20: der nahende Frost. »Das wärmste Feuer weit und breit brennt bei uns.«
  - Nach dem Herbst: der schlafende Moder unter dem Schnee.
- **Sage gegen Aufklärung** (ab Tag 6, wenn Hilde und Yusuf in der Bucht wohnen): Hilde erzählt
  von Irrlichtern und Moosleuten. Yusuf: »Aberglaube. Es ist ein Pilz.« Hilde: »Hab ich was
  anderes gesagt?« Das Spiel entscheidet nie.
- **Edda nach den Bossen** (über Funk, je Art einmal):
  - Holzfäller: das Hemd ihres Vaters. »Einer von unseren. Jetzt ist er Laub.« Der zweite:
    »Die Holzlände hatte viele Männer.«
  - Pilzmutter: das Herz liegt in der Alten Ablage.
  - Laternenhexe: »den Weg nach Hause gesucht. Wie wir alle.« Die Schlurferkunde sagt es auch.
  - Moosriese: »Wenn der Frost kommt, kommt das Herz.«

**Prüfung:** Abschnitt `wald`, 5 Prüfpunkte bestanden.

## G2: Fäden verknoten ✓

**Auftrag (30.09.):** »Die Story ist noch dünn.« Nach den Namen (G1) der zweite Schritt aus
`recherche/storytelling-namen.md` (4.4, 5.3): Fäden, die bisher nie endeten, werden verknotet
(Nr. 205).

- **Hildes letzter Brief:**
  - Ab Tag 13 erkennt Hilde Eddas Stimme im Funk: »Das ist Frau Lindqvist. Die hat mir jeden
    Winter Kekse an den Briefkasten gehängt.«
  - Nach Eddas Heimkehr stellt sie den Brief zu, drei Jahre unterwegs. Edda liest und wird rot:
    »… Der alte Seebär.« Hilde: »Vierzig Jahre Post, Kindchen. Und der letzte ist angekommen.«
- **Yusuf und Knopf** (ab Tag 16): Der Knopf mit rotem Garn am Halsband war das Zeichen seiner
  Pflegehunde – Knopf hat allein ein Zuhause gefunden.
- **Edda und Juna:** Zu Hause erkennt Edda die Kleine, die um acht sendet. Drei Jahre hat sie ihr
  zugehört, heute um acht lesen sie zusammen.
- **Kleine Knoten:**
  - Ida war »die Försterin«, die die Seewelle jeden Abend hörte.
  - Rosa kochte Balduin freitags Fischsuppe ohne Fisch.
  - Balduin erklärt den Namen am Bug: »Wissenschaft«, »Kunst«, »Suppe«, jetzt »Frag nicht«.
  - Claras zweiter Brief vom Sturmhuk erzählt von einer alten Dame, die jeden Abend ins
    Funkgerät spricht.
- **So funktioniert es:** Jeder Knoten wird einmal erzählt, beim nächsten Gespräch mit der
  Person statt des gewohnten Gesprächs. Ein angekündigter Bindungsmoment (»möchte reden«) geht
  vor (`data/knots.js`, ein Flag je Knoten, kein neuer Spielstand).

**Prüfung:** Abschnitt `knoten`, 4 Prüfpunkte bestanden.

## H2: Die Oberfläche aufgeräumt ✓

**Auftrag (30.09.):** »Aktuell ist alles super unübersichtlich.« Nach dem Baumenü (H1) folgt der
zweite Schritt aus `recherche/hud-baumenue.md` (4.4 und 4.6, Nr. 204).

- **Meldungen nach Art:**
  - Rechts stehen höchstens zwei Meldungen, die zwei neuesten.
  - **Alarme** stehen in der roten Zeile der Nachtleiste: Schlurfer im Lager, Tor und Wall
    angegriffen, Umgeworfenes, »Bald kommt die Horde«, jemand liegt am Boden. Beim Eintreffen
    blinkt der Rahmen der Leiste rot.
  - **Neues im Buch** hängt als Lesezeichen rechts an der Uhr: gelungene Taten, Schlurferkunde,
    Notiz- und Werkstattbuch, Herbstschmuck, wartende Baupläne. Erst mit Text, dann nur als
    »+n«; das Pausenmenü räumt es ab.
  - Das »… ist jetzt bezahlbar« ist keine Meldung mehr – der Knopf des Baumenüs funkelt.
- **Der Nachtplan steht in der Nachtleiste** (oben in der Mitte):
  - Abends: »Heute Nacht: 3 Wellen«, die erste mit Uhrzeit und Weg (dazu Merkmal, Boss, mit
    Juna die schweren Arten), die Moderlocke, »N: Ich bin bereit« und »M: der ganze Plan«.
  - Nachts: Welle, Haus, Tor und woher die Horde kommt; in der Pause die nächste Welle.
  - Den ganzen Plan zeigt die **Karte (M)**. Die eigene Tafel rechts ist weg.
- **Zeitraffer** als »»« neben der Welle, keine Meldung mehr.
- **Zahlen in der Hauptschrift:** Haus und Tor in der Nachtleiste lesen sich wie der Rest,
  nicht mehr in 3 × 5-Ziffern.
- **Überlappungen behoben:**
  - Die Zielzeile bricht vor der Nachtleiste um (»Juna: Baut den Langen Jakob aus …« lag
    darunter). Dafür zeichnet das HUD Vorrat und Nachtleiste vor dem Ziel – sonst sah das Ziel
    im ersten Bild des Abends noch keine Leiste.
  - Meldungen rücken unter die Leiste, statt in sie hinein.
  - »holt aus!« steht nur noch in der Bossleiste (dazu der Ring am Boden).
  - »Schild bricht!« steigt über Name und Merkmale des Champions.

**Prüfung:** Abschnitt `aufraeumen`, 7 Prüfpunkte bestanden. Bilder: `hud-abend`, `hud-nacht`, `karte-plan`.

## F1: Ein Schlurfer auf Papier (Sprite-Probe) ✓

**Auftrag (30.09.):** »Die 3D-Modelle der Schlurfer sind schrecklich. Wollen wir die nicht
einfach in 2D machen? Nur dass sie in 8 Richtungen rennen können?« Recherche
`recherche/schlurfer-sprites.md`, Entscheidung Nr. 196: erst eine Probe, dann entscheidet der
Auftraggeber. Umgesetzt ist die Probe (Nr. 203).

- **Einstellung »Schlurfer: 3D / 2D (Probe)«** im Pausenmenü unter Einstellungen (eigener
  Speicherplatz, Standard 3D). Mit 2D zeichnet das Spiel den Schlurfer, die häufigste Art, als
  Sprite. Die übrigen Arten bleiben vorerst Voxel.
- **Im Spiel gebacken, nicht von Hand gemalt** (keine fremden Assets):
  - Die Figur entsteht aus runden Formen: Kapseln und Ellipsoide, weich verschmolzen.
  - Ein kleiner Strahlenwerfer rastert sie im Blickwinkel der Kamera, mit 1/40 m je Texel
    (2 × 2 Bildpunkte bei 80 px/m).
  - Pixelregeln malen sie: drei Töne je Material aus der Palette, dunkle Linien an
    Tiefensprüngen, eine farbige Kontur und Stempel für Glühaugen, genähten Mund und das
    Gänseblümchen.
  - 65 Bilder in 5 Richtungen: S, SO, O, NO und N; W, NW und SW sind gespiegelt.
  - Je Richtung: gehen 6, stehen 2, Treffer 1, Zusammensacken 4.
  - Gebacken wird nach und nach, rund 15 ms je Bild; bis dahin bleibt es bei Voxeln.
- **Im Bild:**
  - Jeder Schlurfer ist ein aufrechter Quad; alle zusammen sind ein InstancedMesh, also ein
    Draw-Call.
  - Der Fußpunkt rastet auf ganze Bildpunkte.
  - Licht und Schatten der Welt wirken über die gebackene Normale, die Augen glühen selbst.
  - Unter den Füßen liegt ein gerasterter Schatten, der mit der Figur wandert.
  - Hinter Bauten bleibt ein Umriss in der Form des Sprites.
  - In der Nebelwelle sieht man nur die Augen; Champions sind größer.
- **Richtung mit Hysterese:** Das Bild wechselt erst 10° über der Sektorgrenze und frühestens
  nach 0,15 s – kein Flackern. Eine Wendung um 90° gilt sofort; beim Ausholen bleibt die
  Richtung stehen.
- **Zusammensacken statt Umfallen:** Die Knie geben nach, der Rumpf kippt vornüber, die Füße
  bleiben am Boden. Danach versinkt er wie bisher.
- **Leistung:** Bei 120 Schlurfern zeichnen die Voxel 6047 Tsd. Dreiecke, die Sprites 1224 Tsd. (ein Fünftel). Die Zeit je Bild für Haltung bzw. Bildwahl liegt im Prüflauf bei beiden um 1–2 ms (diesmal 1,2 gegen 0,33 ms) – sie schwankt zu stark für einen Vergleich.

**Prüfung:** Abschnitt `sprites`, 8 Prüfpunkte bestanden. Bilder:
- `sprites-reihe-3d`, `sprites-reihe-2d`, `sprites-reihe-nah`;
- `sprites-pulk-3d`, `sprites-pulk-2d`;
- `sprites-nacht-3d`, `sprites-nacht-2d`;
- `sprites-bogen` (alle Bilder in acht Richtungen).

**Offen – die Entscheidung des Auftraggebers:** Gefällt der Look, folgen F2–F4 (alle Arten, die
Bosse, Aufräumen), und 2D wird Standard.

## G1: Namen mit Herkunft ✓

**Auftrag (30.09.):** »Die Namen der ganzen Orte sind nicht gut, das geht besser.« Umgesetzt
nach `recherche/storytelling-namen.md` (4.6 und 5.3): nur Text und die Übersichtskarte. Die IDs
im Code bleiben, der Spielstand ändert sich nicht (Nr. 202).

- **See und Bucht:** Mika rudert über den **Kranichsee** (Ankunft, Wegweiser, Titelmusik
  »Herbstlied am Kranichsee«). Auf der Karte heißt die Bucht **Ellerbucht**, im Alltag bleibt
  sie die alte Holzlände.
- **Die Seewelle** statt »Radio Stillwald« – die Sendung gehört nicht mehr drei Leuten:
  - Junas Vater hat den Sender im Keller in **Birkhagen** gebaut.
  - Edda hat am Langen Jakob jeden Abend Wetter und Pegel gelesen.
  - Juna sendet weiter, seit ihr Vater Hilfe holen ging.

  Das erzählen Junas Ankunft und ihr Moment 2, Edda am Funk und zu Hause, das Radio, das
  Funkbuch und der Kartenabend.
- **Der Lange Jakob** heißt der alte Mast am Steg (Juna, Ziel, Stufen, Radio).
- **Inseln:** Beim ersten Anlegen steht der Name auf einem Pfahl, einem Grenzstein oder einem
  Brett in Kinderschrift; das Bootsmenü sagt danach »Zum …«.
  - Wartholm.
  - Kiekwerder – die Bank heißt »Almas Ruh«, eingeritzt: »Für A. – J. L.«
  - Kürbisholm.
  - Die Insel im Nebel heißt ab Marthes Begrüßung **Apfelwerder**.
- **Sichere Orte:**
  - Norderholm – keine zweite »Nordinsel« mehr.
  - Forsthaus Eulenbruch, Sonnenkamp, Leuchtturm Sturmhuk, Ferienlager Glühwürmchen, Hafen von
    Aalbek, Hammermühle, Kloster Sankt Luzia.
  - Dazu Rosas Fährhaus am Südufer, Hannes' Tannrode und Yusufs Praxis in Birkhagen.

  Briefe, Stimmen und Besuche nennen die Orte, die Grammatik sitzt: »nach Norderholm«, »ins
  Kloster Sankt Luzia«, »aus Aalbek«.
- **Widersprüche behoben:**
  - Der alte Brandt ist Marthes Vater vom **Wollgrashof**, nie der Vater der Kinder
    (»Schuld nein«).
  - Edda wohnt im dunklen Leuchtturm am **Sturmhuk** und rudert zur Heimkehr »vom Sturmhuk
    rüber« – nicht auf Marthes Insel.
  - Hildes letzter Brief geht an »Frau Lindqvist, Holzlände 1 – das ist hier«.
  - Der Schildträger trägt keine Tür mehr aus dem Forsthaus, in dem Leute wohnen.
- **Karte (M):**
  - Unter jedem Weg steht sein alter Name: Köhlerstieg, Holzweg, Schaftrift. Der Nachtplan
    behält die Richtung, die Leute reden von den alten Namen.
  - Dazu kommen die Ellerbucht und die Inseln, auf denen Mika schon war.

**Prüfung:** keine eigenen Prüfpunkte – die neuen Namen laufen in den Abschnitten inseln, nebelinsel, funkbuch, netzwerk und orte mit (volle Prüfung).

## H1 – Das neue Baumenü ✓

Aus der Rückmeldung vom 30.09. (»Aktuell ist alles super unübersichtlich, und mit den minimalen
Pixeln im Baueditor erkennt man nicht, was man bauen will«; Recherche `hud-baumenue.md`,
OFFENE-FRAGEN 197): Die Bauleiste war nicht zu klein, sondern zu leer – ein 12 × 12-Symbol mit
rund 44 Punkten in einer großen Kachel, gerastert, sobald etwas zu teuer war.

- **Zu ist es ein Knopf:** unten rechts »Bauen« mit Hammer und der Taste Tab. Tab öffnet das
  Menü beim zuletzt benutzten Reiter, jedes weitere Tab wechselt den Reiter; Esc oder Rechtsklick
  klappen es zu (vor dem Pausenmenü). Q R T G C bauen auch zugeklappt sofort einen Turm; reicht
  der Vorrat, geht das Setzen weiter wie bisher, und ist es vorbei (Esc), ist das Menü wieder zu.
  Wird etwas bezahlbar, funkelt der Knopf.
- **Bilder statt Symbole:** Jede Kachel (48 × 58) zeigt den Bau so, wie er danach in der Welt
  steht – aus seinem eigenen Voxel-Modell und mit der Schrägsicht der Welt, auf der CPU gerechnet
  (`ui/buildPictures.js`, kein Auslesen der GPU), hohe Türme als Brustbild (mindestens 70 % der
  Höhe). Der Bolzenwerfer hat jetzt 987 Punkte statt 44. Ausbauten zeigen die nächste Stufe,
  Turmteile ihr Modell; Figur, Reparieren, Abreißen und Hausausbau ihr Symbol doppelt so groß.
- **Preise lesbar:** in der Hauptschrift mit dem Rohstoffzeichen, was fehlt, rot – das Bild bleibt
  klar, auch wenn der Bau zu teuer ist. Gesperrtes trägt ein Schloss.
- **Bauzettel** über dem Menü, sobald die Maus auf einer Kachel liegt oder eine Rückfrage wartet:
  Name, voller Preis, was der Bau tut, seine Werte, was fehlt. Rückfragen (kaufen, abreißen)
  stehen auf der Kachel (»nochmal«) und im Zettel statt als Meldung am anderen Bildrand.
- **Beim Setzen** trägt das Schild unter dem Baugeist den Preis und darunter den Grund, wenn es
  nicht geht; es weicht dem offenen Menü aus (nach links, sonst darüber). Über dem Menü steht
  nur noch eine blasse Tastenzeile. Was Kreis, Pünktchen und
  Kreuz bedeuten, erklärt Edda in der Einführung einmal.
- **Nichts fällt mehr weg:** Mehr als sechs Möglichkeiten (»Leute« mit Lagerglocke und
  Leuchtmast) – die sechste Kachel heißt »weiter« und zeigt den Rest mit denselben Tasten. Vorher
  fehlte der Leuchtmast ohne Hinweis.
- **Reiter:** »Türme 2« heißt »Helfer«, »Einrichten« heißt »Leute« (die IDs bleiben).
- **Edda spricht kompakt unten links** über Mikas Leiste (das Funkgerät hängt an Mikas Gürtel),
  unten rechts bleibt fürs Bauen frei: 248 × 60 statt 249 × 81.
- Prüfabschnitt `oberflaeche` (Bilder: hud-tag, bau-menue, bau-setzen): 7 Prüfpunkte bestanden.

## Nebel: Der Dunst flackert nicht mehr ✓

Rückmeldung vom 30.09.: »Der Nebel flackert immer noch.« Diesmal gemessen statt vermutet: je
Szene 16 Bilder in 1/30-s-Schritten an einem Nebelmorgen (Bucht still, Kamera nach Osten, Mika
geht nach Osten, Kamera nach Norden, Mika geht nach Norden), jeweils mit und ohne Nebelbänke
bzw. Dunst, und gezählt, wie viele Pixel von Bild zu Bild wechseln (um den Versatz der Kamera
ausgerichtet).

- **Die Nebelbänke waren es kaum** (+0,03 bis +0,15 % der Pixel je Bild): Ihr Muster hängt seit
  N4 fest an der Welt.
- **Es waren der Dunst nach Norden (M33) und die Vignette:** Beide hängen am Bildschirm, das
  Raster der Palette aber an der Welt. Ging Mika nach Norden, glitt die Welt unter dem Verlauf
  hindurch, und in der oberen Bildhälfte – über dem See, wo der Morgennebel liegt – kippten je Bild
  Tausende Pixel zwischen zwei Palettenfarben hin und her (+1,9 % des ganzen Bildes, oben
  +2,8 Prozentpunkte). Das sah aus wie flackernder Nebel.
- **Jetzt kommen Dunst und Vignette erst nach dem Raster** dazu, als weiche Tönung. Mika geht
  nach Norden: 5,0 → 3,2 % wechselnde Pixel je Bild (der Rest sind Mikas Schritte, Gras, Wasser und
  Feuer), der Dunst tut nur noch +0,1 dazu; nach Osten 3,1 → 2,8 %. Nebenbei liegt über der Wiese
  kein Raster aus Dunstpunkten mehr – der Dunst sieht ruhiger aus.
- **Prüfabschnitt `nebel`** misst das bei jedem Lauf: Mika geht am Nebelmorgen nach Norden, oben
  im Bild darf der Dunst höchstens 0,8 Prozentpunkte dazutun (Gegenprobe mit dem alten Shader:
  2,8 – der Prüfpunkt schlägt an). Bild: nebel-dunst.

## N9 – Drachenwetter ✓

Weiter mit dem Wunsch vom 29.09. (»arbeite an der Story, an den Texten, an kleinen
Sidequests … sei kreativ«, OFFENE-FRAGEN 199): Pim und Lu bekommen einen Drachen – ein
kleiner Nebenauftrag, ein Spielzeug für windige Herbsttage und ein Bild am Himmel über
der Bucht.

- **Der Wunsch**: Wohnen Marthe und die Kinder in der Bucht, sagt Pim an einem Windtag
  (oder drei Tage nach der Ankunft), wenn Mika vorbeikommt: »So ein Wind! Damit könnte
  man einen Drachen steigen lassen …« Im Gespräch erzählt er, dass Marthe Drachen bauen
  kann (»ein Drachen ist ein Segel, das sein Boot verloren hat«) und was sie braucht:
  2 Stoff, 4 Fasern (Schnur), 2 Holz (Stöcke). Das Ziel steht im Zielkasten.
- **Das Bauen**: Mit allem gibt Mika es Pim; Marthe baut ihn über Nacht, Lu malt eine
  Katze darauf (Mieze, wenn sie in der Bucht wohnt). Ohne alles erzählt Pim, was fehlt.
- **Der Drachen**: eine Raute im Harlekinmuster (Rot-Orange und Gelb) mit roter
  Einfassung, Querstab und Lus Katzengesicht, ein Schwanz mit sechs Schleifen, eine
  helle Schnur zur Holzspule. Er wirft einen Schatten auf den Strand.
- **Drachenwetter**: An Wind- und klaren Tagen (nicht bei Regen, Nebel, Schnee) lassen
  die Kinder ihn von 09:30 bis 16:30 steigen: Pim geht an seinen Platz im Hof und hält die
  Spule, Lu rennt unter dem Drachen herum. Er steht im Wind über dem Strand, bei Wind
  höher und lebhafter. Böen lassen Laub fliegen und ziehen ihn hinauf; ab und zu
  schaffen die Kinder allein einen Looping (»Juhuu!«). Kommt ein Schlurfer, holen sie
  ihn ein.
- **Die Leine halten**: E bei Pim (»Drachen halten«) – Mika nimmt die Spule, die Kamera
  nimmt Mika und den Drachen ins Bild (immer weit, auch wenn »nah« eingestellt ist),
  die Uhr steht wie beim Angeln. Kommt eine Böe, zieht sich ein Ring um den Drachen
  zusammen; mittendrin zählt ein E: Der Drachen dreht einen Looping, Pim zählt mit. Ein
  E ohne Böe lässt ihn wegsacken, die Reihe beginnt von vorn. Esc oder eine
  Richtungstaste gibt Pim die Leine zurück (die Uhr springt 20 Minuten weiter).
- **Herbstbuch**: neue Tat »Drachenwetter« – drei Loopings hintereinander.
- Edda erklärt über Funk, wie es geht, sobald der Drachen fertig ist; Marthe hat einen
  neuen Satz.
- **Spielstand v32** mit Migration v31 → v32 (noch kein Drachen; wo Marthes Seite aus
  Eddas Funkbuch fehlt, gibt sie sie beim nächsten Gespräch).
- **Die Pilzmutter trägt wieder ihren Hut** (Nebenbefund der Sprite-Recherche): Im feinen
  Maß fehlte ihr der große, leuchtende Pilzhut – jetzt sitzt er wieder auf dem Kopf, violett
  mit hellen Tupfen.
- **Die Kamera beim Halten** folgt dem Drachen weich mit, wenn Böe und Looping ihn heben – er
  stieß sonst oben an den Bildrand.
- Prüfabschnitt `drachen` (Bilder: drachen, drachen-looping): 11 Prüfpunkte bestanden; im
  Herbstbuch stehen jetzt 13 Taten (der Abschnitt `buch` zählt mit).

## Recherche: Schlurfer als Sprites, HUD und Baumenü, Geschichte und Namen (30.09.2026) ✓

Rückmeldung des Auftraggebers am Morgen des 30.09.: »Der Nebel flackert immer noch. Die 3D-Modelle
der Schlurfer sind schrecklich – wollen wir die nicht in 2D machen, in 8 Richtungen wie in Zelda:
A Link to the Past? … Die Story ist noch dünn. Die Namen der ganzen Orte sind nicht gut. … Das HUD
ist super unübersichtlich, mit den minimalen Pixeln im Baueditor erkennt man nicht, was man bauen
will.« Drei Recherchen (Berichte in `recherche/`), daraus Entscheidungen (OFFENE-FRAGEN 196–198)
und ein Plan (DESIGN 8, »Der Plan ab 30.09.2026«):

- **Schlurfer als 2D-Sprites** (`recherche/schlurfer-sprites.md`): ja, aber zuerst ein Prototyp
  mit Umschalter und Vergleichsbildern. 8 Richtungen, 5 davon gezeichnet (der Westen gespiegelt),
  ein Sprite-Pixel = 2 × 2 Bildpunkte; im Code aus Körperformen gerastert, mit Pixelregeln und
  handgezeichneten Stempeln; ein InstancedMesh aufrechter Quads mit Atlas, Normalen und
  Glühmaske. Statt 11 600–29 500 Dreiecken je Schlurfer nur noch 6. Plan F1–F4.
- **HUD und Baumenü** (`recherche/hud-baumenue.md`): Die Bauleiste ist nicht zu klein, sondern
  zu leer – 12 × 12-Symbole, Preise in 3 × 5-Ziffern, Rasterung über allem, was zu teuer ist.
  Neu: sechs feste Zonen, ein Baumenü auf Abruf (Tab) mit großen Bildern aus den 3D-Modellen,
  Bauzettel und Preis am Baugeist; höchstens zwei Meldungen; der Nachtplan in der Nachtleiste;
  Edda kompakt unten links; Einstellung »Oberfläche«. Plan H1–H5. Gefunden: Die Bauleiste zeigt
  nur sechs Kacheln – mit der Lagerglocke fehlt der Funkturm (kommt mit H1 in Ordnung).
- **Geschichte und Namen** (`recherche/storytelling-namen.md`): eine zentrale Frage (Lus »Ist
  das hier zu Hause?«), der Moder in Schichten, offene Fäden verknoten (Hildes Brief ist an Edda,
  Knopf war Yusufs Pflegehund, die Seewelle war Eddas Stimme), eine natürliche Uhr (Tag n =
  n. Oktober, Kraniche, der singende See in der Frostnacht) und Namen mit Herkunft (Holzmark,
  Kranichsee, Dämmerwohld, Wartholm, Kiekwerder, Kürbisholm, Apfelwerder, Eulenbruch …).
  Plan G1–G5, fast nur Text.
- Sofort umgesetzt: Die erste Seite aus Eddas Funkbuch (N8) liest sich nicht mehr so, als liefe
  jemand aus Marthes Familie in der Horde (»Schuld nein«) – der alte Brandt nickt, statt zu lachen.
- Nebenbefund der Sprite-Recherche: Der Pilzmutter fehlt im feinen Maß der große leuchtende Hut
  (behoben mit dem nächsten Meilenstein).

## N8 – Eddas Funkbuch und die Glocke am Steg ✓

Weiter mit dem Wunsch vom 29.09. (»arbeite an der Story, an den Texten, an kleinen
Sidequests … sei kreativ«, OFFENE-FRAGEN 195): Die Seiten aus Eddas Funkbuch erzählen
jetzt ihre Geschichte zu Ende, und Marthes Glocke bekommt einen Platz in der Bucht.

- **Vier Seiten aus Eddas Funkbuch** (je eine Karte wie im Zelt, N6):
  - 2. Oktober – unter einem flachen, bemoosten Stein auf der großen Insel (der Stein
    bleibt liegen): der Moder erreicht Brandts Hof; »Bleib auf den alten
    Holzfällerwegen, die sind fest.«
  - 8. Oktober – in einer alten Blechdose auf der kleinen Insel: Radio Stillwald und
    seine drei Hörer (Balduin, Marthe und »die Försterin«).
  - 14. Oktober – im Zelt auf der Nordinsel (N6): Marthe und die Kinder auf der
    Nebelinsel.
  - 20. Oktober – Marthe hat sie aufbewahrt und gibt sie Mika beim ersten Gespräch in
    der Bucht (»Gib sie jemandem, der das Feuer anmacht.«): Edda verlässt die
    Holzlände und lässt das Funkgerät zurück – »Mach das Feuer an.«
  - Mit allen vier meldet sich Edda über Funk: »… Dann weißt du jetzt, warum ich
    gegangen bin.«
- **Herbstbuch, Seite »Funkbuch«** (mit der ersten Seite): die gefundenen Seiten nach
  Datum, der Text und wo sie lag – zum Nachlesen.
- **Marthes Glocke am Steg**: Sobald die drei in der Bucht wohnen, hängt die
  Schiffsglocke an einem Pfahl vorn am Steg. E läutet sie – Pim und Lu kommen
  angerannt, Knopf bellt. Legt Balduin an, läutet Marthe.
- Edda am Funkgerät hat neue Sätze, sobald Marthe in der Bucht wohnt.
- Kein neuer Spielstand: Marthes Seite liegt in `isles.fog.page` (v31, noch nicht
  veröffentlicht); die beiden Inselfunde sind neue Einträge in `isles.found`.
- Ein Skript hat die neuen Fundstellen über 300 Kartenstartwerte geprüft (an Land,
  erreichbar, fern der Signalfeuer).
- Marthe steht tagsüber etwas weiter westlich am Strand (vorher verdeckte sie von vorn
  den Pfahl der Glocke – Lesbarkeit vor Stimmung).
- Prüfabschnitt `funkbuch` (Bilder: funkbuch, glocke-steg): 7 von 7 grün, `nebelinsel`
  weiter 17 von 17. Beim Prüfen gelernt: `trader().phase` ist der zuletzt gerechnete
  Stand – nach `setDay`/`setTime` erst einen Schritt rechnen, sonst liest man noch den
  alten Tag.

## N7 – Die Insel im Nebel ✓

Fortsetzung des Wunschs vom 29.09. (»… mit einem Boot zu anderen Inseln Abenteuer
erleben … sei kreativ«, OFFENE-FRAGEN 194). Die Spur aus N6 und M33 führt ans Ziel:
Marthe und ihre Kinder auf der Insel im Nebel.

- **Die Spur**: Eddas Seite aus dem Funkbuch im Zelt der Nordinsel (N6) oder die
  dritte Flaschenpost (M33). Ab dem nächsten Morgen läutet von 07:00 bis 09:30 von
  Nordosten eine Schiffsglocke – zwei Schläge, alle paar Sekunden, im Stereo aus
  ihrer Richtung. Am Rand steht dann eine kleine Glocken-Marke, draußen im Nordosten
  liegt Seenebel, und Edda funkt beim ersten Mal: »Das ist Marthes Schiffsglocke!
  Sie leben!« (mit leckem Boot: erst abdichten).
- **Die Nebelfahrt** (Modus `nebelfahrt`): Solange die Glocke läutet, steht am Boot
  »Der Glocke nach« ganz oben (vorgewählt bleibt »Doch lieber an Land«). Mika rudert
  zwischen den Felsinseln hinaus in den Nebel; dort lenkt man selbst – WASD wie beim
  Laufen, das Boot dreht sich dorthin und nimmt Fahrt auf, eine Strömung treibt es
  nach Süden. Um das Boot bleibt ein kleines Loch im Grau (auf Kurs etwas größer),
  die Glocken-Marke zeigt, woher der Klang kommt; nahe der Insel tritt sie aus dem
  Nebel. Die Uhr steht, die Fahrt kostet danach 20 Minuten.
  - Wer lange vom Klang weg rudert, zu weit abtreibt oder zu lange sucht, verliert
    die Glocke: Nebelweiß, zurück am Steg, eine halbe Stunde später – und heute
    läutet sie nicht mehr (»Morgen früh wieder«). Esc kehrt um, ohne zu verlieren.
  - Der Seenebel sind zwei gerasterte Lagen über dem See (fest in der Welt, wie die
    Nebelbänke seit N4); die freie Sicht um Boot und Insel wandert je Lage mit.
- **Die Insel**: weit draußen östlich der Karte (dort ist nur noch See) – Kiesstrand,
  Gras mit Laub, bemooste Felsen, ein Apfelbaum mit Fallobst (1/16), eine Hütte aus
  Treibholz mit Bullauge und Netz, das Glockengestell mit der Schiffsglocke (sie
  schwingt beim Läuten), Kinderwäsche auf der Leine, die Feuerstelle mit Kessel und
  Marthes Kahn mit dem Loch in der Seite (1/32). Mika läuft nur auf der Insel.
- **Marthe, Pim und Lu** (Figuren nach N1): Marthe mit türkiser Hafenmütze, dickem
  grau durchzogenem Zopf, Lederschürze und gelbem Zollstock; Pim mit Zeitungshut,
  Sommersprossen und Ringelpulli; Lu mit zwei abstehenden Zöpfen, roter Regenjacke
  und einem Apfel in der Hand. Die Kinder stehen auf einem kleineren Rig (kürzere
  Beine, kleinerer Rumpf, der Kopf so groß wie bei den Erwachsenen – Gesichter,
  Lider und Porträts passen). Alle drei haben Porträts für die Dialoge.
  - Bei der ersten Landung kommt Marthe herüber und erzählt: Sie kennt Edda vom Funk,
    die Kinder fragen nach Boot und Katze (oder Hund), der Kahn leckt. Der Auftrag:
    **Nägel** (Werkbank, 3 Schrott – nur, solange sie wartet) und **Zucker** (Balduin
    für 3 Zombieteile, oder Hilde schenkt die ganze Dose, wenn sie im Lager wohnt).
    Das Ziel steht im Zielkasten (»Nägel und Zucker für Marthe (1/2)«).
  - Beim zweiten Besuch flickt Marthe den Kahn (»Riecht nach Karamell, oder?«). Am
    nächsten Morgen um sieben gleitet der Kahn aus dem Nebel an den Steg, die drei
    sitzen darin; Edda funkt, wie froh sie ist.
- **In der Bucht**: Marthes Kahn liegt südlich am Steg, sie steht tagsüber daneben;
  ihre Reuse im Wasser gibt jeden Morgen ein, zwei Fische für den Korb (M33, Balduin
  nimmt sie) – E am Steg, einmal am Tag. Pim und Lu spielen im Hof Fangen. Abends
  schlafen die drei im Kahn (keine Bewohner mit Platz, wie Edda – Kinder kämpfen nie).
- **Nebenbei behoben (N6)**: Solange Mika auf einer Insel war, zog die Begrenzung
  jeden, der in der Bucht lief (Überlebende, Balduin), an den Inselrand. Jetzt gilt
  die Insel nur in ihrer Nähe.
- **Spielstand v31** mit Migration: Wer das Zelt schon durchsucht oder drei
  Flaschenposts hat, hört die Glocke ab dem nächsten Morgen; Nägel und Zucker im
  Vorrat.
- Prüfabschnitt `nebelinsel` (Bilder: nebelfahrt, marthe-treffen, nebelinsel,
  marthe-bucht): 17 Prüfpunkte, bestanden. Beim Prüfen und Ansehen der Bilder behoben:
  - Die Einblendung am Kahn lag im Wasser (Mika wurde an Land geschoben, zu Lu) – jetzt
    von der Insel aus; Marthe geht nach dem ersten Gespräch zurück an ihren Kahn.
  - Nach der Ankunft steckten die Kinder am Steg fest (geradeaus übers Wasser) – sie
    laufen erst den Steg entlang ans Ufer.
  - In der Bucht stand Marthe so nah an der Reuse, dass sie die Einblendung nahm – sie
    steht jetzt am Strand neben dem Kahn, die Reuse liegt nördlich am Steg.
  - Auf der Insel lag das Boot am Anleger im Nebel – um Mika bleibt es jetzt frei.
  - Pims Porträt zeigte fast nur den Zeitungshut – der Hut ist flacher, im Porträt
    nur sein Rand.
  - Der rosa Fleck neben der Glocke war ein fallendes Herbstblatt (keine Änderung).
  - Unter Last dauert das Neuladen im Prüflauf knapp 30 s (die alte Frist) – der
    Abschnitt wartet jetzt bis zu 180 s.
- Volle Prüfung mit N7: 453 Prüfpunkte, bestanden.

## N6 – Mit dem Ruderboot zu den Inseln ✓

Wunsch des Auftraggebers (29.09.): »… vielleicht erweiterst du die Karte, man kann
vielleicht mit einem Boot, wenn man es baut, zu anderen Inseln Abenteuer erleben?
Sei kreativ.« (OFFENE-FRAGEN 193)

- **Das Boot**: Mikas Ruderboot von der Ankunft (N5) liegt nördlich am Steg – und
  leckt. E am Boot: »Abdichten (8 Holz, 4 Fasern)« (vorgewählt »Später«). Danach
  spricht Edda über Funk von den Inseln.
- **Hinausrudern**: E am Boot fragt, wohin – drei Inseln oder »Doch lieber an Land«
  (vorgewählt). Es geht tagsüber von 7 bis 17:30 Uhr, nicht in der Nacht und nicht,
  wenn ein Schlurfer näher als 10 m ist; die Einblendung sagt gleich, warum nicht.
  - Die Fahrt: Riemen im Takt, das Boot dreht sich gemächlich in die Fahrtrichtung,
    Kielwasser, die Kamera nah heran. Es geht um das Stegende herum, nie über
    Balduins Anleger. Esc legt gleich an.
  - Die Uhr steht beim Rudern; jede Fahrt kostet danach eine Viertelstunde.
  - Das Boot legt mit dem Bug am echten Inselrand an (der ist je Karte ein wenig
    anders), Mika steigt aus. Auf der Insel bleibt Mika am Ufer stehen, nie im
    Wasser (Newton-Schritte auf das Abstandsmaß der Insel, man gleitet am Ufer
    entlang). E am Boot rudert zurück; um halb sieben rudert Mika von selbst heim.
- **Die Insel im Norden (»Netzinsel«)**: ein verlassenes Zelt mit einer Seite aus
  Eddas Funkbuch (Karte wie ein Brief) – Marthe ist mit den Kindern vom Hof auf die
  Nebelinsel gezogen, bei Morgennebel läuten sie die alte Schiffsglocke. Ein altes
  Netz an einer Stange: +8 Fasern, +1 Stoff (die Stange bleibt stehen).
- **Die große Insel (»Bankinsel«)**: eine Steinbank mit Moos und Blick über den See
  (immer wieder ein Gedanke) und eine halb vergrabene Kiste – eine Fundkiste mit
  Turmteil (M21).
- **Die kleine Insel im Süden (»Kürbisinsel«)**: wilde Kürbisse (+3 Fasern, zwei
  stehen danach links neben der Haustür) und eine rot getigerte Katze. Sie kommt
  mit, sitzt rechts vor der Tür (Gemütlichkeit +1) und schnurrt, wenn Mika sie
  streichelt. Die Insel ist dafür etwas größer geworden (Radius 2 statt 1,5 m;
  ihre Tannen bleiben zwei, der Zufall der übrigen Natur ändert sich nicht).
- Tannen auf den Inseln wachsen nie auf Fundstellen und Landeplätzen. Ein Skript
  hat über 300 Kartenstartwerte geprüft: Fundstellen sicher an Land, Einblendungen
  erreichbar, das Boot im Wasser.
- Wer auf einer Insel speichert, wacht am Steg auf (das Boot liegt dort).
- **Spielstand v30** mit Migration (Boot noch leck, keine Insel besucht).
- Auf dem See und den Inseln ist die Durchsicht um Mika größer – sonst stand der
  Leuchtmast am Stegende groß zwischen Kamera und Nordinsel.
- Prüfabschnitt `inseln` (Bilder: rudern, insel, katze-daheim), bestanden. Beim
  Ansehen der Bilder behoben: der Leuchtmast vor der Nordinsel (siehe oben), das Zelt
  hat eine geschlossene Giebelwand mit dunklem Eingang (vorher sah man hinein).
- Beim vollen Prüflauf gefunden und behoben: Wer drinnen gespeichert hatte, wachte
  nach dem Laden am Steg auf – der Innenraum liegt östlich der Karte, und dort ist für
  die Karte See. Jetzt bleibt drinnen, wer drinnen war. Volle Prüfung: 433 Prüfpunkte,
  die drei Fehler davon waren dieser eine; `speichern`, `probespiel` und `inseln`
  danach grün (36 Prüfpunkte).
- Nebenbei: Die Flaschenpost (M33) und Eddas Funkbuch erzählen jetzt dasselbe –
  Marthe läutet bei Morgennebel. Die Fahrt zur Insel im Nebel ist der nächste
  Schritt (Plan: N7).

## Meilenstein 33 – Angeln am Steg, Licht und Schwellen ✓

Die zweite Abendaktivität und der letzte Glanz (DESIGN 8, OFFENE-FRAGEN 171, 176,
192).

- **Die Angel**:
  - Fiete, der Fischer vom alten Hafen, bringt es bei (»Bringst du mir das Angeln
    bei?«) und schenkt Mika seine zweite Angel.
  - Kommt Fiete nicht, hat Balduin ab Tag 6 eine alte Angel für 6 Zombieteile.
  - Danach gibt es an der Nordkante des Stegs einen Angelplatz. Tagsüber sagt er,
    wann es geht.
- **Ein Abend, eine Aktivität**: Zwischen 18 und 20 Uhr geht Mika allein an den
  Steg (E am Angelplatz) oder lädt jemanden ein, der im Lager wohnt (»Kommst du
  mit angeln?«).
  - Beide sitzen an der Stegkante, die Beine über dem Wasser, jeder mit Angel und
    Pose. Die Kamera geht nah heran, die Uhr steht.
  - Danach ist der Abend 50 Minuten weiter. Es gibt dann keinen Kartenabend
    mehr, und umgekehrt.
- **Der Wurf**: E halten lädt (die Kraft pendelt), loslassen wirft. Je weiter die
  Pose fliegt, desto größer die Fische – Brasse, Zander und Hecht beißen erst weit
  draußen.
- **Warten**: Die Pose wippt und zuckt ein paar Mal. Wer dabei anschlägt,
  verscheucht den Fisch und muss neu warten. Taucht sie ganz ab, erscheint ein
  »!«: Jetzt zählt ein E im Fenster (je nach Fisch 0,5–1,1 s).
- **Der Drill**:
  - Eine Leiste unten im Bild. Gehaltenes E schiebt den Kescher nach rechts,
    losgelassen fällt er nach links.
  - Der Fisch sucht sich immer wieder ein neues Ziel; wilde Fische springen zur
    Seite. Solange er im Kescher ist, füllt sich der Fang, sonst rinnt er aus.
  - Mika kurbelt, die Rute zittert, die Pose kommt beim Einholen näher.
- **Der Fang**: Der Fisch springt in einem Bogen aus dem Wasser. Die Fangkarte
  zeigt ihn in Seitenansicht mit Größe in Zentimetern, »Neu!« oder »Rekord!«.
  - Fänge: Plötze, Barsch (gestreift), Brasse, Aal (erst ab 19 Uhr), Zander (bei
    Nebel, Regen, Sturm), Hecht (gefleckt, groß, wild), ein alter Gummistiefel.
  - Fünf Zettel Flaschenpost erzählen von der Insel im Nebel.
- **Wer mitkommt**, plaudert zwischendurch in Sprechblasen (Fiete, Greta, Hilde,
  Bert, Juna und Dr. Yusuf mit eigenen Sätzen) und hilft ein wenig:
  - Fiete macht den Kescher breiter.
  - Greta lässt sie schneller beißen.
  - Hilde bringt Tee: ein Wurf mehr.
  - Der Abend zählt als gemeinsame Zeit (M29).
- **Der Korb**: Echte Fische kommen in den Korb. Balduin nimmt sie für je 2
  Zombieteile (sechs am Tag).
- **Lebendige Lichtinseln** (Nr. 176):
  - In der Dämmerung gehen die Lichter nacheinander an: zuerst das Fenster, dann
    vom Haus nach außen. Morgens gehen sie andersherum aus.
  - Fackeln, Kürbislaternen, die Laterne am Erinnerungsbrett und die Signalfeuer
    atmen wie Flammen.
  - Vor dem Stubenfenster (ab der Hütte auch vor dem Anbau) liegt nachts
    Fensterlicht auf dem Boden.
  - Leuchtfeuer und Signalfeuer spiegeln sich als schimmernder Streifen im See.
- **Tiefe ohne Unschärfe**: Nach Norden (oben im Bild) liegt ein leichter Dunst,
  tags hell und kühl, nachts dunkelblau. Die Palette macht daraus gerasterten
  Dunst statt eines weichen Verlaufs; die Vignette gab es schon.
- **Spielstand v29** mit Migration (noch keine Angel).
- Prüfabschnitt `angeln` (Bilder: angeln, drill, fang). Die Abschnitte `angeln`,
  `herbst`, `fragen` und `gaeste` sind bestanden (Lichtinseln, Nebelwelle,
  Lottes Licht). Dabei geändert:
  - Wer mitkommt, sitzt links neben Mika – rechts am Mast steht Juna.
  - Die Fangkarte nimmt E erst nach einem Augenblick (sonst schlösse das
    Drill-E sie gleich); die Prüfung wartet darauf.

## Meilenstein 32 – Netzwerk und Wiedersehen ✓

Wer weitergezogen ist, bleibt in der Welt (DESIGN 8, OFFENE-FRAGEN 164, 170, 191).

- **Briefe** (Oma Hilde):
  - Zwei, drei Tage nach dem Weiterziehen liegt morgens ein Brief im Briefkasten
    am Hofeingang, neun bis zwölf Tage danach ein zweiter mit Neuigkeiten vom
    Ort. Höchstens eine Nachricht je Morgen.
  - Wohnt Hilde im Lager, bringt sie die Post (»Hilde hat die Post gebracht …«),
    sonst Balduin.
  - Der Briefkasten hat jetzt eine Fahne. Solange Post darin liegt, steht sie
    und ein Brief schaut heraus; sonst liegt der Arm waagerecht an der Seite.
  - E am Briefkasten zeigt jeden Brief als Karte: Luftpostpapier mit feinen
    Linien und Briefmarke, das Porträt des Absenders in Farbe, »von Hannes aus
    dem Forsthaus«, der Tag und der Brief. Die Spieluhr spielt das Motiv des
    Absenders.
  - Gelesene Briefe stehen im Herbstbuch auf der neuen Seite »Post« (Briefe von
    unterwegs). Der leere Briefkasten verweist darauf.
- **Pakete** (Balduin): Fünf bis acht Tage nach dem Weiterziehen bringt Balduin
  beim Anlegen ein Paket vom Ort mit Rohstoffen oder Munition. Das Forsthaus
  schickt 14 Holz und 4 Fasern, der Leuchtturm Leuchtkugeln und Schrott, der
  Hafen Schrott und Patronen. Die Lieferkarte zeigt den verschnürten Karton mit
  Anhänger und den Inhalt.
- **Stimmen** (Juna): Wohnt Juna im Lager und hat jemand schon geschrieben, hat
  das Funkgerät in der Stube die Wahl »Die anderen«. Je Tag meldet sich eine
  Stimme von unterwegs (zwei Sätze je Person).
- **Besuch**: Am Festmorgen (M23) kommt jemand von früher ans Feuer, sitzt dort
  den Tag über und erzählt (eine Zeile je Person).
- **Rückkehr**: Ist ein Schlafplatz frei, nimmt Balduin im Handelsfenster eine
  Einladung mit (3 Zombieteile Fährgeld). Am nächsten Morgen sitzt die Person
  wieder als Gast am Feuer, die Entscheidung ist gleich fällig.
- **Signalfeuer** in der Frostnacht:
  - Für jeden Ort, an dem jemand von euch lebt, brennt auf den Inseln im See ein
    Feuer: Steinring, Zelt aus Scheiten, Wimpel, Flamme mit Eigenlicht und
    Lichtinsel. Die Leute sind hinübergerudert, damit die Bucht es sieht.
  - Jeder Ort schickt einmal eine kleine Hilfe (Holz, Leuchtkugeln, Patronen …).
  - Die Karte (M) zeigt die Feuer mit Ortsnamen. Am Morgen sind sie
    heruntergebrannt.
- **Motive**: Jede Figur hat ein kurzes Motiv, vier bis sieben Töne in
  e-Moll/G-Dur. Die Spieluhr spielt es beim Brief, bei der Rückkehr, bei Eddas
  Heimkehr und am Erinnerungsbrett (M31).
- **Edda kommt nach Hause**:
  - Wer nach dem Herbst weiterspielt, findet Edda am nächsten Morgen im ersten
    Schnee am Ende des Stegs beim alten Funkturm. Der Bericht sagt: »Im
    Morgengrauen hat ein Ruderboot am Steg angelegt …«.
  - Zum ersten Mal sieht man sie in Farbe, mit silbernem Zopfkranz.
  - Beim ersten Ansprechen erzählt sie von ihrer Heimkehr, danach sagt sie je Tag
    einen anderen Satz.
- Nebenbei: Das Herbstbuch ist breiter und hat Platz für sechs Reiter.
- Nebenbei: Knopf spricht man nur noch aus der Nähe an (0,9 m), und er geht bei E
  nicht mehr vor – der streunende Hund nahm sonst dem Briefkasten und den Gästen am
  Feuer das E weg. Edda steht an der Südecke des Stegendes, Juna weiter am Mast.
- **Spielstand v28** mit Migration: Briefe, die schon kamen, liegen im
  Herbstbuch. Wer nach dem Herbst schon weiterspielt, bekommt Edda am nächsten
  Morgen.
- Prüfabschnitt `netzwerk` (Bilder: brief, paket, signalfeuer, signalkarte,
  edda-daheim). Die Abschnitte `netzwerk`, `gaeste` und `ueberlebende` sind
  bestanden. Beim ersten Lauf und beim Ansehen der Bilder behoben:
  - Am Briefkasten und bei Gästen am Feuer nahm Knopf das E weg (siehe oben), am
    Stegende Juna das Gespräch mit Edda.
  - In der Frostnacht brennen Feuer auch für die, die unterwegs von selbst
    weitergezogen sind – die Prüfung erwartete nur zwei.
  - Auf der Karte lagen »Leuchtturm« und »Ferienlager« übereinander und ragten
    über den Rand: Die Namen bleiben jetzt in der Karte und rücken auseinander.
  - Das Feuer der Nordinsel verdeckten Tannen: Vor den Stellen der Signalfeuer
    wächst keine Insel-Tanne mehr (der Zufall der Natur bleibt gleich). Für das
    Bild gibt es im Test-Modus `lookAt(x, z)` (fester Blickpunkt der Kamera).

## Meilenstein 31 – Die Lagerglocke ✓

Die schwerste Entscheidung der Nacht: allein halten oder alle rufen (DESIGN 8,
OFFENE-FRAGEN 165–167, 170, 190).

- **Die Glocke** (Nr. 165): Balduins alte Schiffsglocke an einem Galgen aus
  Treibholz – silbriges Holz mit Astknoten, Bronze mit grüner Patina und
  Zierrille, darunter Klöppel und Seil mit dickem Knoten.
  - Sie steht im Reiter Einrichten, sobald der Waffenschrank offen ist, kostet
    6 Holz, 4 Schrott und 6 Zombieteile, einmal und nur im Hof (»Nur im Hof,
    innerhalb des Walls«). Die Horde wirft sie nicht um.
  - Tagsüber sagt die Einblendung, wofür sie ist (»Die Glocke ist für die Nacht
    – wenn die Horde durchbricht«), nachts ohne Durchbruch »Noch hält das Tor«,
    nach dem Läuten »Heute Nacht hat die Glocke schon geläutet«.
  - Nach einem Durchbruch (Tor gefallen oder ein Schlurfer im Lager) hält Mika E
    anderthalb Sekunden. Solange zeigt links eine Tafel »Wer kommt?« mit Namen,
    Waffe, Leben und Munition, darunter füllt sich ein Goldbalken.
- **Das Läuten** in drei Takten: ein tiefer Schlag mit langem Nachhall (Brummton,
  Grundton, kleine Terz, Quinte, Oktave, dazu der Klöppel), die Kamera bebt,
  ein Schlag Stille (die Musik duckt sich), dann treten die Bewohner nacheinander
  aus Zelt, Hütte oder Haustür – mit Daumen hoch und ihrer Notfallwaffe in der
  Hand. Die Nachtmusik läuft danach auf voller Stufe.
- **Der Kampf** (Nr. 167) nur innerhalb des Walls:
  - Wer eine Schusswaffe hat, bleibt auf Abstand, zielt nach seiner
    Treffsicherheit (Übung, Profil) und verschießt die gemeinsame Munition aus
    dem Vorrat – Hilde ihre Doppelflinte, Juna die Signalpistole. Die anderen
    gehen mit Spaltaxt, Mistgabel oder Schläger ran. Trägt Mika die Waffe gerade
    selbst oder liegt sie im Laub, bleiben die Fäuste.
  - Einmal je Nacht kann der Schreck packen (1 s Zögern, »Oh nein …«), wenn ein
    Schlurfer auf 2 m herankommt – je nach Übung und Profil.
  - Die Horde im Lager geht auf Bewohner los, die ihr nahe kommen
    (Handgemenge); Liegende lassen sie in Ruhe.
  - 80 Leben, 20 mehr je Übungsstufe; ein Treffer nimmt höchstens 40 %
    (Gemütlich 30, Wild 50). Bei einem Viertel ziehen sie sich ins Haus zurück –
    zu Boden geht nur, wer eingekesselt ist.
  - Dr. Yusuf kämpft nicht: Er geht zu den Liegenden und versorgt alle im Umkreis
    von 6 m nach 4 s.
  - Solange die Glocke läutet: kein Zeitraffer (B), kein Rufen (N).
- **Zu Boden und Aufhelfen** (Nr. 167): Ein Ring zählt das Rettungsfenster
  herunter (60 s, Wild 40, doppelt so schnell mit einem Schlurfer daneben),
  darüber der Name in Rot, »Mika!«, Herzschlag, eine Meldung. Die Einblendung
  »Aufhelfen (E halten)« geht allem anderen vor; nach 2 s steht die Person auf
  und zieht sich zurück. Ist das Lager frei, gelten alle als gerettet.
- **Wenn das Fenster abläuft** (Nr. 166): Ohne »Verluste« bleibt nur die Waffe
  im Laub – Balduin bringt Ersatz (8 Zombieteile, eine je Tag). Mit
  »Verluste« ist die Person nicht mehr da: Laub wirbelt auf, »Wo eben noch Juna
  lag, fällt nur noch Laub.« Angedeutet, nie gezeigt, sofort gespeichert. Auf
  »Gemütlich« nie, Knopf nie.
- **Entwarnung:** 20 s nachdem das Lager frei ist (spätestens im
  Morgengrauen) schlägt die Glocke dreimal, alle gehen zurück.
- **Der Morgen danach:**
  - Der Bericht erzählt, wer kam und wie viele Schlurfer weniger im Lager waren,
    wer zum Steg gebracht wurde, wer verletzt ist und welche Waffe im Laub
    blieb. Das steht im Spielstand und kommt auch, wenn Mika wach bleibt.
  - Wunden: erschöpft (wer gekämpft hat, bis mittags), verletzt (die Nacht mit
    höchstens der Hälfte der Leben beendet, 2 Tage, halbe Fähigkeit, folgt der
    Glocke nicht), schwer verletzt (war zu Boden, 4 Tage, keine Fähigkeit;
    Dr. Yusuf und ein Bett im Haus kürzen je einen Tag). Gemütlich 1/2 Tage,
    Wild 3/5. Danach bleibt eine Narbe (eine Zeile in der Menschenkunde).
  - »Halbe Fähigkeit« heißt: halbe Morgengaben, halbe Wirkung bei Zahlen
    (Flicken, Rabatte, Lichtradius), Greta stellt nur jede zweite Falle neu.
  - In den drei Tagen danach spricht jemand von ihr (»Hilde hat heute früh eine
    Kürbislaterne an den Steg gestellt – für Juna.«).
- **Das Erinnerungsbrett am Steg** (Nr. 170): erscheint mit dem ersten Verlust
  am Anfang des Stegs – ein Brett aus Treibholz mit Moosdach, zwei
  Wäscheleinen mit Fotos (je Verlust eines, mit Klammer), davor eine
  Kürbislaterne. Abends zündet E die Laterne an (Lichtinsel), eine kleine
  Spieluhr spielt, und eine Karte zeigt jedes Foto in Sepia mit Namen, »Tag
  7–19«, einer Zeile, die bleibt, und dem Erinnerungsstück. Tagsüber »Ansehen«.
- **Das Herbstbuch** bekommt die Seite »Erinnerung« (Die mit uns waren), die
  Menschenkunde zeigt Wunden und Narben.
- **Einstellung »Verluste«** (Nr. 166): im Titelbild (A/D, mit Erklärung neben
  der Zeile), auf »Gemütlich« immer aus, sonst an vorgewählt; im Pausenmenü nur
  noch von »an« nach »aus«. Wechselt die Schwierigkeit auf »Gemütlich«, ist sie
  aus und bleibt es.
- Nebenbei behoben: Weitergezogene (Stufe 4) zählten noch als Bewohner – ihre
  Fähigkeit wirkte weiter.
- **Spielstand v27** mit Migration (noch nie geläutet, niemand verwundet,
  »Verluste« nach der Schwierigkeit).
- Prüfabschnitt `glocke` (Bilder: glocke-tafel, glocke-kampf, glocke-aufhelfen,
  erinnerung, erinnerungsbrett). Die Abschnitte `glocke`, `gaeste` und `bindung`
  sind bestanden. Beim Ansehen der Bilder behoben:
  - Die Karte am Brett war zu kurz, der Hinweis lag über der zweiten Zeile.
  - Während die Glocke läutete, bot die Einblendung noch »Läuten« an.
  - Ohne erledigten Schlurfer hieß es »0 Schlurfer weniger« (jetzt »… kamen und
    hielten mit dir das Lager«).

## Meilenstein 30 – Waffenschrank und Übungsplatz ✓

Die Bewohner können sich wehren, wenn es sein muss, und Mika bekommt echte Waffen mit
einer Gegenseite (DESIGN 8, OFFENE-FRAGEN 168, 169, 189).

- **Der Waffenschrank** (Nr. 168) steht in der Stube, wo früher der Nachttisch stand:
  - Eichenholz, grün ausgeschlagen, Glastüren mit zwei Spiegelungen, unten eine
    Schublade.
  - Im Gestell stehen Jagdgewehr, Doppelflinte, Mistgabel, Spaltaxt und
    Baseballschläger aufrecht, die Pistolen liegen in der Schublade. Was Mika
    herausnimmt, fehlt im Gestell.
  - Er ist zu, bis die erste Nacht gehalten ist. Dann sagt Edda über Funk, wo der
    Schlüssel liegt (hinter dem losen Stein am Kaminsims), und im Vorrat liegen
    6 Patronen, 4 Schrot und 2 Leuchtkugeln.
  - Das Fenster sieht aus wie der Schrank selbst: dunkles Holz, grüner Filz,
    ein Messingschild. Links stehen die sieben Waffen, rechts die gewählte groß
    als Foto, dazu Munition, Magazin, Reichweite, »Laut« und wer sie im Notfall
    nimmt.
  - E nimmt eine Waffe heraus oder legt sie zurück. Q wechselt, wer sie im
    Notfall bekommt. Voreingestellt sind Hilde mit der Doppelflinte, Bert mit
    der Spaltaxt, Juna mit der Signalpistole; Dr. Yusuf nimmt keine, er
    verarztet.
- **Mika schießt:**
  - Mit einer Schusswaffe in der Hand schießt ein Klick in Richtung des Zeigers
    (Schlurfer unter dem Zeiger zuerst). Mika hebt den Arm in den Anschlag, lange
    Waffen stützt die linke Hand.
  - Das Magazin lädt von selbst nach, solange Munition da ist. Leer klickt es
    komisch (»Klick. Leer.«).
  - Die Schnellleiste zeigt die Schuss im Magazin und den Vorrat.
  - Die vier Schusswaffen:
    - Jagdgewehr: 12 m, durchschlägt einen Schlurfer.
    - Doppelflinte: ein Fächer aus sechs Kugeln, nah verheerend, stößt zurück.
    - Pistole: sechs Schuss, die Allzweckwaffe.
    - Signalpistole: Die Leuchtkugel brennt 12 s als Lichtinsel, blendet und
      holt aus dem Nebel.
  - Mistgabel, Spaltaxt und Baseballschläger sind Nahkampfwaffen mit eigenen
    Werten (weit und stoßend, schwer, schnell und kurz betäubend).
- **Wucht:**
  - Mündungsfeuer über zwei Bilder, Rauch, eine Leuchtspur.
  - Eine Hülse fliegt rechts heraus, hüpft und bleibt bis zum Morgen liegen.
  - Rückstoß als Kamerastoß gegen die Schussrichtung, ein Trefferstopp nur bei
    einem Treffer.
  - Ein tiefer Knall, dessen Hall zweimal über den See zurückrollt. Die Krähen
    fliegen auf, Knopf bellt.
  - Treffer sprühen violette Sporen und Laub, nie Blut.
- **Lärm:** Ein Schuss lockt die Schlurfer im Umkreis an (Pistole 11 m, Flinte
  14, Gewehr 16, Signalpistole 8). Sie suchen acht Sekunden lang nach Mika; Wall
  und Tor halten sie trotzdem auf.
- **Munition gehört allen** und liegt im Vorrat:
  - Balduin verkauft Patronen (6 für 5 Zombieteile, zweimal am Tag).
  - An der Werkbank entstehen Schrot (2 Schrott → 4) und Leuchtkugeln
    (Schrott und Fasern → 2).
  - Beides gibt es erst, wenn der Schrank offen ist.
- **Der Übungsplatz** (Nr. 169) wird im Reiter Einrichten gebaut: Lattenzaun mit
  Blechdosen, Heuballen mit Kürbis-Zielscheibe, Strohpuppe mit Kochtopf-Helm.
  - E fragt »Wer übt heute?«. Vorgewählt ist »Heute nicht.«, zur Wahl stehen
    alle Bewohner, die heute noch nicht geübt haben.
  - Die Person geht hin und übt zwei Spielstunden. Wer eine Schusswaffe für den
    Notfall hat, schießt auf die Dosen (drei Patronen, sonst übt sie an der
    Puppe), die anderen schlagen auf die Puppe ein. Ihre Fähigkeit ruht solange.
  - Geübt wird von acht Uhr an, um fünf ist Schluss.
  - Nach 2, 3 und 4 Übungen steigt die Stufe (0–3): +20 Leben, +8
    Treffsicherheit, −10 Schreck je Stufe, dazu ein Profil je Figur. Das wirkt,
    sobald die Lagerglocke läutet (M31).
  - Bleibt Mika dabei, zählt es als gemeinsame Zeit (Bindung »ueben«).
- **Spielstand v26** mit Migration: Der Schrank ist zu. Wer die erste Nacht
  schon gehalten hat, findet den Schlüssel gleich nach dem Laden; noch niemand
  hat geübt.
- Prüfabschnitt `waffen` (Bilder: waffenschrank, schuss, uebungsplatz).

## Meilenstein 29 – Bindung und Alltag ✓

Aus Mitbewohnern werden Freunde – über gemeinsame Zeit, nicht über Punkte
(DESIGN 8, OFFENE-FRAGEN 162, 171, 175).

- **Vier stille Stufen** (Nr. 171): fremd, vertraut, befreundet, eng – ohne Zahl
  im Bild und ohne Verfall. Gemeinsame Zeit entsteht beim Kartenabend (das erste
  Mal zählt drei, danach eins), abends am Feuer (Mika ruht sich am Lagerfeuer
  aus), im ersten Gespräch des Tages und Seite an Seite (auf dem Hochsitz, die
  Nacht gehalten). Jede Art zählt höchstens einmal am Tag, eine neue Art mehr als
  eine Wiederholung.
- **Gesten:** Wer vertraut ist, grüßt morgens beim Vorbeigehen (Sprechblase,
  Winken; Knopf bellt). Befreundete rufen Mika beim Spitznamen (»Mikachen«,
  »Käpt’n«, »Frischling« …) und setzen sich abends zu Mika ans Feuer (bis zu
  zwei).
- **Drei Bindungsmomente je Figur** (51 Gespräche): Über dem Kopf steht ein
  warmes Zeichen (»möchte reden«), E erzählt den Moment statt des gewohnten
  Gesprächs.
- **Erinnerungsstücke:** Der dritte Moment schenkt Mika das Stück der Person,
  siebzehn eigene Modelle (Knopfs Tennisball, Hildes Posthorn, Junas erste Röhre
  …). Eine **Geschenkkarte** zeigt es groß wie im Katalog (Wunsch aus dem
  Probespiel: »auch was sie uns bringen«). Die meisten stehen im neuen
  **Erinnerungsregal** zwischen Fenster und Kamin (vier Bretter), andere haben
  ihren eigenen Platz: Zapfen und Feder auf der Fensterbank, das Hufeisen am
  Kamin, Claras Schild über der Kommode, Lottes Papierlaterne am Fenster. Die
  Stehlampe steht dafür jetzt an der Südwestecke des Sessels.
- **Geteilte Szenen** (Nr. 162): Morgens nach dem Bericht gehen zwei Bewohner ans
  Feuer und reden über die Nacht (Durchbruch, makellos, Boss, Regen, Nebel,
  verloren), abends zwischen 17 und 19:30 Uhr über Gott und die Welt. Die Rollen
  werden nach Temperament besetzt, gesprochen wird in Sprechblasen, sobald Mika
  näher als 7 m ist, nie als Dialog. Ein Gedächtnis verhindert Wiederholungen.
  Zwanzig Szenen, vierzehn davon am Morgen.
- **Posten helfen nur noch** (Nr. 175): Hilde wirft Leimgläser (klebrig, kein
  Schaden), Juna blendet und holt aus dem Nebel, betäubt aber nicht mehr, Bert
  flickt, Dr. Yusuf heilt, Knopf hütet weiter den Hof. Der Balance-Durchlauf
  rechnet ohnehin ohne Posten.
- **Die übrigen acht Wanderer** (zwölf im Pool, acht je Herbst, Nr. 161):
  - Fiete, Fischer: Balduin legt bei jedem Tausch etwas drauf.
  - Ida, Försterin: Bäume wachsen schneller nach.
  - Rosa, Köchin: Die Suppe gibt 40 Leben.
  - Anton, Musiker: Er spielt abends am Feuer, morgens gibt es Gemütlichkeit +2.
  - Emil, Gärtner: Die Beete tragen zwei Fasern mehr.
  - Frieda, Schmiedin: Metallbarrikaden brauchen den halben Schrott.
  - Mara, Späherin: Sie läuft morgens die Wege ab, der Nachtplan hängt ab 17 Uhr.
  - Paula, Näherin: Was umgeworfen wurde, steht morgens wieder.

  Jede und jeder hat eine eigene Figur und ein eigenes Porträt, Temperamente,
  einen Herkunftsort (neu: Alter Hafen, Wassermühle, Kloster am Hang),
  Gespräche, Entscheidung und Briefe.
- **Herbstbuch, Menschenkunde:** die Stufe als Satz (»Ihr seid befreundet.«) und
  das Erinnerungsstück.
- **Spielstand v25** mit Migration: Alle beginnen bei »fremd«, die acht neuen
  Wanderer kommen auf freie Tage des Ankunftsplans.
- Prüfabschnitt `bindung` (Bilder: bindung-zeichen, bindung-feuer, geschenk,
  erinnerungsbord). Der Abschnitt `gemeinsam` prüft Leimgläser und das Blenden.
  Der Abschnitt `gaeste` rechnet mit dem größeren Ankunftsplan (acht statt vier)
  und klickt die längeren Dialoge der Wanderer bis zum Ende durch; `setSurvivor`
  der Prüfschnittstelle setzt die dauerhaften Fähigkeiten gleich (Lottes Licht),
  `nextMorning` setzt auch die Grüße des Tages zurück.

## Nachbesserung N5 – Ankunft, Figur und Edda als Einführung ✓

Rückmeldung des Auftraggebers (29.09.2026 abends): »Das Intro muss liebevoll sein
– unser Charakter kommt auf der Suche nach einem neuen Zuhause dahin. Dann lernen
wir alles über die Frau mit dem Funkgerät, das ist unser Tutorial. Es muss eine
Möglichkeit geben, das Tutorial zu überspringen. Alle relevanten Texte müssen
besser sichtbar sein, nicht in der Mitte, nicht unten.« Dazu die Recherche
`recherche/intro-tutorial.md` (Intros, Tutorials, Textplatzierung, Figurwahl).

- **Die Ankunft** (OFFENE-FRAGEN 184): Ein neues Spiel beginnt mit einer kurzen
  Szene statt mit Mikas Erklärung am Waldrand. Esc halten überspringt sie
  (unten rechts steht es, ein Balken füllt sich).
  - Zuerst eine Titelkarte im Dunkel; Mikas Gedanken tippen sich ein: »Drei
    Herbste ist es her, dass der Moder kam. Seitdem bin ich unterwegs.« – »Ich
    suche keinen sicheren Ort. Ich suche ein Zuhause.«
  - Dann blendet das Bild gerastert auf: Im Morgennebel rudert Mika in einem
    kleinen, geflickten Ruderboot von Nordosten über den See. Riemen und Arme
    ziehen im selben Takt, das Boot schaukelt in ganzen Bildpunkten, oben und
    unten liegen schwarze Kinobalken, die Gedanken stehen oben im Balken
    (»Auf dem Wasser sind sie nicht. Wasser meiden sie.«).
  - Die letzten Meter gleitet das Boot aus. Mika steigt auf den Steg und geht
    zum Haus, auf der Bank knistert ein altes Funkgerät.
  - Das Ruderboot bleibt danach nördlich am Steg liegen, Balduin legt weiter
    südlich an.
- **Edda meldet sich** (Dialog `eddaErstkontakt`): Das Funkgerät war ihres, das
  Haus auch – »Du suchst ein Zuhause? Dann bleib. Es ist ein gutes Haus. Aber
  nachts wird es hier laut.« Mit Einführung zeigt sie, was in M15 Mika selbst
  erzählte: den Wald, das Unterholz, den Zusammenfluss mit der Karte der Wege
  und das Haus; die Kamera fährt mit.
- **Einführung mit Edda oder ohne** (OFFENE-FRAGEN 185), eine neue Zeile im
  Titelbild. Mit Einführung erklärt Edda über Funk eins nach dem anderen:
  - erst das Laufen, nach vier Metern ein Lob;
  - dann jedes Ziel, sobald es an der Reihe ist;
  - Karte und Ansicht, sobald der erste Turm steht;
  - jede Sache beim ersten Mal: Zombieteile, Ausweichen, Champions, Turmteile,
    Laterne, späte Stunde, Ruhe am Nachmittag.

  Ohne Einführung schweigt sie dazu; ihre Geschichte (Haus, erste Nacht,
  Balduin, Frost) erzählt sie trotzdem. Eine neue Runde nach dem Herbst beginnt
  ohne Einführung.
- **Frau oder Mann** (OFFENE-FRAGEN 186), die neue Zeile »Figur« im Titelbild:
  - Die Frau trägt einen langen Zopf unter der Mütze, mit einem Haargummi in
    der Mützenfarbe, dazu Seitensträhnen und Wimpern. Der Mann hat das
    bisherige kurze Haar.
  - Mützen, Jacken, Haar- und Hautfarben gibt es für beide. Die Texte sprechen
    Mika weiter mit »du« und dem Namen an.
  - Neue Spiele beginnen mit der Frau vorgewählt, alte Stände behalten ihre
    Figur (Mann).
- **Texte, wo der Blick ist** (OFFENE-FRAGEN 187):
  - Im Titelbild steht, was die gewählte Zeile bedeutet, auch die
    Schwierigkeit. Die Erklärung sitzt in einem Kasten mit Goldrahmen und
    Zipfel direkt links neben der Zeile, hell auf dunkel – nicht mehr
    hellgrau am unteren Bildrand.
  - Die Tastenzeile steht im Rahmen des Fensters (Figurseite) bzw. direkt
    unter den Knöpfen (Hauptseite), warm und mit Kontur.
  - Auf der Figurseite ist der Schriftzug kleiner, damit das längere Fenster
    Platz hat.
- **Spielstand v24** mit Migration: Figur »Mann«, Einführung aus.
- Prüfabschnitt `ankunft` (Bilder: figur-erklaerung, ankunft-karte, ankunft-see,
  ankunft-steg, edda-erstkontakt). Der Spielstart der Prüfung überspringt die
  Ankunft mit gehaltenem Esc und prüft danach Eddas Kamerafahrt. Die Prüfung
  ändert Flags und Figur am echten Spielstand (`Z.game.state`) – `Z.state()` ist
  eine Kopie, dort gelöschte Funk-Flags blieben bestehen.

## Nachbesserung N4 – Probespiel: Edda am Funk, Rücken, Kürbisse, Haus und Katalog ✓

Rückmeldungen aus dem eigenen Probespiel des Auftraggebers (29.09.2026), vor M29
eingeschoben:

- **Hinweise nicht mehr mitten im Bild – Edda über Funk** (Punkt 4). Was früher
  als Hinweis-Kasten in der Mitte stand (Ziele, Laterne, Ruhe, Ausweichen,
  Turmteile, Champions, Bosse), spricht jetzt **Edda** über das alte Funkgerät an
  Mikas Gürtel: ein Comic-Feld unten rechts über der Bauleiste, rechts ihr altes
  Foto (sepia, mit Klebeband), links eine helle Sprechblase mit harter Kontur und
  Zipfel, in die sich der Text tippt, oben der Name »Edda · Funk«, am Foto
  flackern die Empfangsbalken, solange sie spricht. Das Spiel hält nie an; ein
  Klick aufs Feld tippt fertig und schließt es. Jede Erklärung kommt einmal im
  ganzen Spiel (`funk.once`), eine Warteschlange hält höchstens fünf Zeilen.
  **Wer Edda ist** (OFFENE-FRAGEN 180): Ihr gehörte die Holzlände, ihr Großvater
  hat Steg, Hütte und Tor gebaut. Sie deutet an und erklärt – wo sie ist, sagt sie
  nicht (»Irgendwo, wo man den See sehen kann«). Über das Funkgerät in der Stube
  kann man sie auch selbst rufen.
- **Die rechte Spalte:** Vorrat oben rechts, darunter der Nachtplan, darunter die
  Meldungen – alle rechtsbündig, sie fahren von rechts herein. Die Bildmitte
  gehört wieder dem Spiel.
- **Die Laterne** (Punkt 1) leuchtet nur noch, wenn Mika sie mit F anzündet; am
  hellen Morgen (07:30) löscht Mika sie und steckt sie weg – außer in einer
  laufenden Nacht.
- **Werkzeug und Waffe auf dem Rücken** (Punkt 1): Was Mika trägt, hängt schräg
  auf dem Rücken (dieselbe Geometrie wie in der Hand) und kommt erst beim
  Schlagen, Fällen oder Abbauen in die Hand. 2,6 s nach dem letzten Einsatz
  steckt Mika es mit einem kurzen Griff über die Schulter wieder weg; solange ein
  Schlurfer näher als 5 m ist, bleibt es gezogen. Drinnen ist nichts zu sehen.
- **Frische Kürbisse** (Punkt 2): sattes Orange mit schmalen Furchen und
  Wachsglanz, grüner Stiel mit Blatt, keine dunklen Flecken mehr – sie sahen
  vorher faulig aus.
- **Ein größeres Haus** (Punkt 3): 6,75 statt 4,75 m tief, jeder Raum anderthalbmal
  so breit (die Stube 9,7 m), Durchgänge 2 m breit, die Haustür gegenüber dem
  Kamin. Die Möbel behalten ihre Größe und bekommen Luft; Kaminsims, Kartentisch
  und Lichter wandern mit.
- **Balduins Katalog über das Funkgerät** (Punkt 3): Das Funkgerät auf der
  Kommode ruft jetzt Balduin (Katalog), Edda oder das Radio. Der Katalog zeigt
  24 Stücke auf fünf Seiten (Stube, Küche, Schlafzimmer, Werkstatt, Lager – jede
  ab der Ausbaustufe ihres Raums), jedes als großes Foto aus seinem Voxelmodell
  mit Beschreibung, Preis in Zombieteilen (6–24) und Gemütlichkeit. Neu sind 17
  Stücke: Flickenteppich, Blumenampel, Bücherregal, Standuhr, Sofa, Grammophon,
  Zwiebelzopf, Küchenkräuter, Kupfertöpfe, Apfelkuchen, Hausschuhe,
  Standspiegel, Quilt, Hocker, Werkzeugkiste, Apfelkisten, Hängematte. Bestellt
  ist sofort bezahlt, höchstens vier Stücke sind unterwegs.
- **Die Lieferung:** Am nächsten Morgen trägt Balduin die Bestellung hinein,
  sobald er anlegt (hat er schon abgelegt, steht die Kiste mittags am Steg).
  Sobald kein Schlurfer in der Nähe ist, zeigt eine **Lieferkarte** jedes Stück
  groß mit Namen und Raum (»Steht jetzt in der Küche«).
- Balduins Horn, der erste Besuch im Haus, die erste gehaltene Nacht, die
  Frostnacht und der Abschied des Herbsts bekommen je eine Zeile von Edda.
- **Der Nebel flackerte beim Gehen** (Rückmeldung vom selben Abend): Das
  Rauschen der Nebelbänke wanderte mit der Zeit durch ihr gerastertes
  Durchsichtsmuster, und die Bänke lagen über den Figuren, deren Umriss sie in
  jedem Bild neu zerschnitten. Jetzt hängt das Muster fest an der Welt, die
  Bänke ziehen halb so schnell und werden vor den Figuren gezeichnet
  (Reihenfolge 1,5, Überlebende 1,6). Ein Versuch mit starren Bänken, die nur
  ganzpixelig wandern, flackerte noch stärker und wurde verworfen.
- **Katalogfotos:** Kleine Stücke werden größer fotografiert (feinere Maßstäbe),
  lange Stücke (Lichterkette, Wimpel) auf 24 Spalten zugeschnitten, Sofa und
  Lesesessel von vorn. Eddas Foto zeigt sie jung, mit dunklem Haar und offenen
  Augen, im Funk-Feld etwas größer. Grammophon und Hängematte bekamen freie
  Plätze (vorher verdeckt von der Pflanze bzw. auf den Säcken). Porträts lesen
  ihre Leinwand mit `willReadFrequently` (sonst warnte Chromium beim Foto).
- **Spielstand v23** mit Migration: Bestellungen leer; wer im alten, kleineren
  Haus gespeichert hat, steht nach dem Laden an der Haustür.
- Prüfabschnitt `probespiel` (Bilder: funk, stube-gross, katalog, lieferung); die
  Werkzeug-Prüfung von m12-r1 erwartet jetzt den Rücken, Einrichten (M6) bezahlt
  in Zombieteilen, der Rundgang durch alle Räume läuft auf Höhe der neuen
  Durchgänge. Der Herbstschmuck-Schritt (M25) leert Eddas Feld direkt vor dem
  Mausklick – es lag genau über dem Zielfeld, der Klick schloss nur ihre Meldung.
  Volle Prüfung: 340 Prüfpunkte bestanden.

## Meilenstein 28 – Kartenabend »Letzte Runde« ✓

Dritter Schritt des Plans »Zuflucht sein« (DESIGN.md 8, OFFENE-FRAGEN 171–174):
ein ruhiger Abend mit einem Menschen und ein Spiel, das man freiwillig noch einmal
spielt.

- **Regeln** (`src/core/cards.js`, ohne three.js) aus der Recherche: 36 Karten,
  fünf auf der Hand, drei Plätze (Laterne, Kessel, Kürbis), genau 15 ist ein
  Volltreffer, Klopfen einmal je Partie, zwei Plätze gewinnen. Gleichstand: Mond,
  weniger Karten, höhere Karte, wer nicht angefangen hat. Stufe 2 **Farbpaare**
  (Glut, Laubwirbel, Mondlicht, Krähendieb), Stufe 3 **Griff ins Dunkle**.
  Laubwirbel und Krähendieb sind echte Wahlen (welche Karten abwerfen, welche
  fortnehmen – oder keine).
- **Simulator** `node tools/karten.mjs`: Startspieler 49–51 %, keine Remis, alle
  Farbpaare zwischen 48 und 54 %, rund 17 Züge je Partie. Die KI sieht nur den
  Tisch: Tauscht man Mikas verdeckte Karten gegen andere aus dem Stapel, ändern
  sich Tischansicht und Zug der KI nie (verdeckte Karten tragen keine ID mehr –
  die hätte Farbe und Wert verraten). `--liga`: jede Figur gegen jede.
- **Sechs Spielstile mit Tick:** Bert (blufft nie, klopft nie, reibt sich die
  Hände, wenn er gut steht – immer ehrlich), Juna (Chaos, kichert beim Verdecken
  und auch einfach so), Balduin (Draufgänger, versteckt schwache Karten und tippt
  dann an die Mütze), Oma Hilde (sammelt Farbpaare und summt, wenn eins kommt),
  Dr. Yusuf (vorsichtig, rückt die Brille, wenn er schlecht steht) und Fiete (der
  Stärkste, merkt sich alles und liest Mika – jedes dritte Mal täuscht seine
  Pfeife; er kommt mit den Wanderern in M29). Gedächtnis und Lesen: Wer liest,
  rückt seine Schätzung von Mikas verdeckten Karten an das, was Mika bisher
  verdeckt hatte.
- **Der Tisch:** abends (18:00–19:40) bietet ein Bewohner im Gespräch eine Runde
  an, am ersten Abend nur Bert, der das Spiel erklärt; ab dem dritten Abend zeigt
  Hilde die Farbpaare, Balduin den Griff ins Dunkle (eine Runde am Steg, eine
  Zeile im Handelsfenster). Draußen steht ein Klapptisch mit kariertem Tuch und
  Kerze zwischen zwei Hackklötzen vor dem Feuer, bei Regen oder Schnee steht er
  drinnen auf dem Teppich vor dem Kamin. Die Kamera rückt nah heran, das Gegenüber
  sitzt uns zugewandt mit dem Feuer im Rücken, Mika über Eck; die Uhr steht, danach
  sind 50 Minuten vergangen.
- **Karten im Pixelstil** (26 × 36, große Ziffer, Farbe als Symbol und Form) und
  sieben Rückseiten. Karten fliegen im Bogen, drehen sich in drei Bildern um,
  beim Klopfen pocht die Faust zweimal (ein Pixel Wackeln), beim Aufdecken zählt
  es mit steigender Tonhöhe, 15 ist ein Flammenstoß, »Geplatzt« eine Kastanie.
  Klänge: Wischen, Mischen, Faust auf Holz; Musik **»Kartenabend«** im
  Dreiertakt mit einer Spannungsschicht beim Klopfen und in der Letzten Runde.
- **Tasten:** A/D Karte, 1 2 3 Platz, E offen, Q verdeckt, K klopfen, Tab Griff
  ins Dunkle, B schneller, Esc beendet den Abend (zählt verloren). Maus: Karte
  anklicken, Platz anklicken (rechts: verdeckt), Knopf K zum Klopfen.
- **Einsätze:** Der erste Sieg gegen eine Figur bringt ihr Stück (Berts
  Grinsekürbis, Junas Funkabzeichen, Balduins Taschenuhr, Hildes Kartenbeutel,
  Yusufs Teedose, Fietes Flaschenschiff) – es steht dann auf dem Kaminsims;
  weitere Siege bringen Kartenrückseiten. Mika setzt nie Vorrat, sondern eine
  Pflicht: Wer verliert, spült ab (hackt Holz, macht Frühstück …) – am Morgen
  eine Zeile im Bericht. Nichts vom Kartentisch hilft in der Nacht.
- **Menschenkunde:** nach drei Beobachtungen eines Ticks notiert Mika einen
  Verdacht (»Balduin tippt an die Mütze, wenn er blufft. 4 von 5 Mal war die
  verdeckte Karte schwach.«) – neue Seite im Herbstbuch.
- **Spielstand v22** mit Migration.
- Bei der Durchsicht nachgebessert: Das Abendfenster rechnete in Minuten ab
  Mitternacht (die Uhr des Spiels zählt ab 06:00) – niemand bot eine Runde an.
  Mika saß zuerst gegenüber im Süden; der große Kopf verdeckte von hinten Tisch
  und Gegenüber (die Kamera blickt Mika über die Schulter) – jetzt sitzt Mika über
  Eck, und wer am Tisch sitzt, dreht sich nicht mehr zu Mika um (nur der Kopf
  wandert hinüber). Drinnen steht der Tisch auf dem Teppich vor dem Kamin statt am
  Stubentisch an der Westwand (dort lag das Gegenüber unter der Porträt-Tafel).
  Sprüche und Ticks stehen unter dem Porträt, »Partie gewonnen« und die Siegtafel
  über der Reihe des Gegenübers – vorher lagen sie auf dem Kopf des Gegenübers bzw.
  auf den Summen. Der E-Hinweis weicht dem Nachtplan aus.
- Prüfabschnitt `karten` (Bilder: kartenabend, kartentisch, kartensieg,
  kartenabend-kamin, menschenkunde).

## Meilenstein 27 – Gäste und Plätze ✓

Zweiter Schritt des Plans »Zuflucht sein« (DESIGN.md 8, OFFENE-FRAGEN 161–164).

- **Vier Wanderer** mit eigener Figur aus dem Baukasten (N1) und eigenem
  Porträt: **Hannes**, Zimmermann auf Wanderschaft (breiter schwarzer Hut,
  Weste mit Perlmuttknöpfen, rotes Halstuch – flickt jeden Morgen die halben
  Schäden an den Holzbarrikaden), **Clara**, Mechanikerin (blauer Overall,
  Schweißbrille auf der Stirn, roter Pferdeschwanz – Türme flicken ein Viertel
  billiger, Basteln ein Teil weniger), **Lotte**, Laternenmacherin (rosa Mantel,
  bunter Strickschal, Zöpfe, Laterne am Gürtel – alle Lichtinseln ein Viertel
  größer, auch für Nebelwelle und Laternenhexe) und **Greta**, Jägerin
  (Lodenjacke, Filzhut mit Feder, Fernglas – stellt verbrauchte Fallen jeden
  Morgen neu). Je Figur ein eigener Ton: Hannes klopft auf alles, Clara redet
  mit den Türmen, Lotte verliert Dinge, Greta spricht in drei Wörtern.
- **Ankünfte aus dem Startwert:** Wer wann kommt, steht im Spielstand (Tage
  7–24, nie in einer Bossnacht, nie am Festmorgen, nie zwei Tage
  hintereinander) – über den Weg durchs Tor oder unten am Strand.
- **Gästeplatz am Feuer:** Angesprochen, übernachtet der Wanderer am Feuer
  (Schlafsack mit Kissen, karierter Decke, Blechbecher). Wer nicht
  angesprochen wird, setzt sich am nächsten Morgen selbst ans Feuer.
- **Die Entscheidung am Morgen:** »Bleib bei uns« (wenn ein Platz frei ist),
  »Ich bringe dich …« (zum Forsthaus, Leuchtturm, Ferienlager oder zur
  Nordinsel – mit Proviant und einer Laterne, die Figur geht durch die
  Schlupftür bzw. am Strand fort) oder einmal »Bleib noch einen Tag«
  (vorgewählt, harmlos). Sind alle Plätze belegt, bietet der Wanderer, der am
  längsten da ist, an zu gehen – dann bleibt der Neue. Wer sich nach dem
  fälligen Tag nicht entscheiden lässt, zieht am Morgen danach von selbst
  weiter. Niemand wird weggeschickt.
- **Briefe:** Zwei, drei Tage nach dem Abschied steht ein Brief im
  Morgenbericht (»Nordinsel. Bruder lebt. Fische beißen. Fallen stehen.
  Danke.«).
- **Plätze:** Zelte bis fünf, die neue **Schlafhütte** (Blockhütte mit Ofen,
  zwei Plätze, erst ab dem Schlafzimmer) und die **Dachkammer** über dem Lager
  (Zuhause-Stufe 5, ein Platz) – höchstens acht Menschen plus Knopf.
- Das Ziel-Feld sagt, wer am Feuer auf eine Antwort wartet; Abspann und
  Herbstbuch zählen die Wanderer mit.
- **Spielstand v21** mit Migration: Ein alter Stand bekommt die Ankünfte ab dem
  nächsten Tag.
- Prüfabschnitt `gaeste` (Bilder: gaeste, gast-dialog, schlafhuette).
- Bei der Durchsicht nachgebessert: Mikas Gedanke weicht den Meldungen aus
  (»Schlafhütte gebaut« lag auf »Hannes könnte ins freie Zelt ziehen«) – er
  steht dann unter den Füßen und bleibt dort, bis er verklingt, statt mitten
  im Lesen zu springen. Das Dialogfenster wächst nach oben, wenn Text und
  Antworten mehr Platz brauchen (bei drei Zeilen und drei Antworten ragte die
  dritte unten hinaus, der Tastenhinweis lag auf einer Antwort). Die
  Gästeplätze am Feuer liegen links vom Nordbalken und hinter dem Ohrensessel,
  beide ganz im Bild.

## Meilenstein 26 – Wucht und Schliff ✓

Erster Schritt des Plans »Zuflucht sein« (DESIGN.md 8) und des Auftrags
»Triple-A-Pixelspiel«: Politur, die überall wirkt (OFFENE-FRAGEN 176, 177).

- **Rückmeldungs-Tabelle** (`src/data/feel.js`): vierzehn Ereignisse nach Wucht
  gestaffelt – Schlag 50 ms Trefferstopp, Abschuss 80, Pfanne und Kombo 100,
  Wirbel 120, ein fallender Boss 150, das Herz 220 ms mit Zeitlupe; Mikas
  Schmerz nur 40 ms (passiert oft). Alles läuft über `game.feel()`.
- **Kamerawackeln nach dem Trauma-Modell:** Stöße addieren sich, der Ausschlag
  wächst mit dem Quadrat, ganze Pixel, keine Drehung, mit gerichtetem Stoß (die
  Welt ruckt in Schlagrichtung bzw. vom Angreifer weg); weiter weg von Mika
  schwächer, Barrikaden nur in 10 m Nähe. Im Trefferstopp zittert das stehende
  Bild weiter. Vorher: ein fester 1-px-Kreis für alles.
- **Zeitlupe** (×0,3) für den letzten Schlurfer der Nacht, fallende Bosse und das
  Herz. **Getroffene zittern** einen Pixel (auch unter Turmbeschuss – ohne die
  Welt anzuhalten).
- **Bauen mit Schwung:** Jeder Bau setzt gestaucht auf und federt nach (0,5 s,
  danach wieder genau auf dem Pixelraster), Ausbauten federn tiefer und klingen
  mit jeder Stufe höher; ebenso Mischturm, Turmteil, Zubehör, Wiederaufbau.
- **Klang gestreut:** jeder Effekt ±5 % Tonhöhe und ±1,5 dB – kein Treffer klingt
  wie der vorige; Musikalisches und Oberfläche (Klick, Glocken, Fanfaren,
  Beute-Tonleiter) bleiben gleich. Die Pfanne klingt tiefer.
- **Baugeist mit ✓/✗** an der Ecke – nie Farbe allein.
- **Einstellungen »Wackeln«** (aus/halb/voll) **und »Blitze«** (voll/sanft: der
  Laternenblitz flammt schwächer auf); eigener Speicherplatz wie die anderen.
- **Stabile Bildzeiten:** Alle Shader werden beim Start übersetzt (auch Horde,
  Geschosse, Innenraum). Das Abstandhalten der Horde läuft über ein Raster statt
  jeder gegen jeden: In der späten Nacht mit 563 Schlurfern (Nacht 29 aus dem
  Balance-Durchlauf) 0,64 statt 5,8 ms je Schritt, die ganze Simulation 8,4 statt
  11 ms (Headless).
- **Prüfskript:** neuer Abschnitt `wucht` (Bilder: baugeist, einstellungen) mit
  Bildzeiten p50/p95/p99 bei vielen Schlurfern.
- **Nach der vollen Prüfung nachgebessert:**
  - Die Zeitlupe bremste auch Morgenbericht, Menüs und Dialoge. Nach dem letzten
    Schlurfer brauchte das E am Bericht deshalb länger, ein frühes E ging verloren.
    Jetzt wird nur die Welt langsamer, Oberflächen laufen in echter Zeit.
  - Mikas »Aua« steht jetzt schon im Bild des Trefferstopps, vorher erst danach.
  - Die Musik-Probe (offline gerechnet) kannte die Tonhöhen-Streuung nicht und
    stürzte ab. Die Musik bleibt ungestreut.
  - Fallen-Prüfung: Die Stachelbretter liegen jetzt gleich hinter der Ölspur.
    Hinter dem Leimtopf kam in allen Läufen höchstens ein Schlurfer bei ihnen an,
    das war zu knapp.
  - Der Hinweis unter dem Baugeist (»Auf dem Weg nur Barrikaden und Fallen«) wurde
    am Rand von der Bau-Tafel verdeckt. Die Tafel weicht jetzt dem ganzen Hinweis
    aus, nicht nur dem Geist. Ist überall etwas im Weg, nimmt sie die Stelle mit
    der kleinsten Überdeckung (neu: links unter dem Ziel-Feld).

## Recherche und Entscheidungen: Gemeinschaft (29.09.2026) ✓

**Auftrag:** »Alles so wie du es für spaßig hältst. Recherchiere zu allen
Punkten, auch zu meinen Ideen. Dann triff auf der Spielspaß-Grundlage zu allem
Entscheidungen. Wir wollen ein Triple-A-Pixelspiel machen. Ich find Waffen
übrigens besser als Werkzeug.« – zum Gemeinschaftskonzept vom 28.09.2026 (24
Punkte, `KONZEPT-GEMEINSCHAFT.md`).

- **Recherche** (`recherche/`, vier Berichte): Gemeinschaft (Plätze, Gäste,
  Weiterbringen, Netzwerk, Bindung – Animal Crossing, State of Decay 2,
  RimWorld, Spiritfarer, Fire Emblem, Wildermyth), Glocke und Waffen
  (Notfallknopf, Permadeath mit Rettungsfenster, Verwundung, Gedenken – XCOM,
  Darkest Dungeon, Plants vs. Zombies), Kartenspiel (Schotten Totten, Pazaak,
  Gwent, Triple Triad, faire KI) und Premium-Pixel (Trefferstopp, Trauma-Wackeln,
  Licht, Bildzeiten – Vlambeer, Dead Cells, HD-2D, Eastward). Quellen, die nur
  als Suchausschnitt erreichbar waren, sind markiert.
- **Kartenspiel im Simulator** (`recherche/karten-sim.mjs`, 20 000 Partien je
  Variante, eine KI, die nur den Tisch sieht): Die Ausgangsidee trägt, braucht
  aber eine Legepflicht (sonst platzt niemand), eine Gleichstandsregel (sonst
  23 % Remis) und entschärfte Farbkräfte (Krähen-Tausch gewann 55–58 %). Die
  geprüfte Fassung: 50,5 : 49,5 ohne Remis, alle Farben 49–51 %, etwa 18 Züge.
- **Entschieden** (OFFENE-FRAGEN 161–176): zwölf Wanderer, acht je Herbst,
  höchstens acht Plätze; Gästeplatz und »weiterbringen« statt ablehnen; fünf
  sichere Orte mit Briefen, Paketen und Signalfeuern in der Frostnacht; die
  Lagerglocke nur nach einem Durchbruch und einmal je Nacht; Tod nur nach der
  Glocke, nie auf »Gemütlich«, nie Knopf; Verwundung in Tagen mit
  Rettungsfenster; **echte Waffen** im Waffenschrank (Wunsch des
  Auftraggebers), auch für Mika, mit geteilter Munition, ohne Blut; Übungsplatz
  mit Übung 0–3; Erinnerungsbrett am Steg; ein Abend, eine Aktivität; die
  Kartenregeln in drei Stufen; sechs Spielstile mit Tick; nur kosmetische
  Gewinne; Posten helfen künftig, ohne zu kämpfen; Premium-Schliff als eigener
  Meilenstein.
- **Plan** (DESIGN.md 8, »Der Plan ab M26 – Zuflucht sein«): M26 Wucht und
  Schliff → M27 Gäste und Plätze → M28 Kartenabend → M29 Bindung und Alltag →
  M30 Waffenschrank und Übungsplatz → M31 Lagerglocke → M32 Netzwerk und
  Wiedersehen → M33 Angeln, Licht und Schwellen. Neue Grundregel »Zuflucht
  sein« in DESIGN 0.13 und CLAUDE.md.

## Meilenstein 25 – Nachbesserung 2: Grenzen für dichte Horden ✓

**Anlass:** »Wild« über 30 Nächte war noch nicht vermessen. Dabei fiel Nacht 29
in beiden Schwierigkeiten aus der Reihe: Ausgewogen 367 Abschüsse, Wild 140 –
geplant waren rund 730 bzw. 900 Schlurfer.

- **Gefunden** (Nacht 29 aus einem abgelegten Stand nachgespielt):
  - *Dauerbetäubung:* Sprenger und Feuer machten die dichte Horde nass und
    brennend, Dampf betäubte jeden in der Menge immer wieder (2400 Betäubungen
    in drei Sekunden). Niemand kam voran, im Morgengrauen floh alles.
  - *Brüter ohne Grenze:* 26 zähe Brüter legten Kapseln ohne Ende. Um 05:29
    lebten 1836 Schlurfer, 1449 davon Schwärmer – über 1200 unsichtbar, weil
    das Bild je Art nur 180 zeichnet.
- **Geändert** (OFFENE-FRAGEN 160):
  - Eine Betäubung hält am Stück höchstens 3 s, danach ist der Schlurfer 2 s
    lang nicht zu betäuben (`STUN` in `data/reactions.js`; keine einzelne
    Betäubung ist länger, es kürzt nur das Auffrischen).
  - Ein Brüter legt höchstens vier Kapseln.
  - Nie ein unsichtbarer Schlurfer: Ist eine Art im Bild voll, wartet die
    Warteschlange der Nacht, bis einer fällt; Kapseln, Rufe (Anführer,
    Moderherz) und die Sporenwolke bringen nur so viele, wie Platz ist
    (`horde.room`).
  - »Wild«: Der erste Champion läuft schon in Nacht 2 mit (OFFENE-FRAGEN 118,
    Nachtrag). Rückte auch die Anzahl je Nacht vor, wurde Nacht 9 mit drei
    Champions zur Spitze (Durchbruch, Mika bei 4 Leben) – deshalb nur der Anfang.
- **Ergebnis** (Balance-Durchlauf über 30 Nächte, Bot mit Mika):
  - Nacht 29: Die Horde erreicht die Barrikaden, höchstens rund 600 leben
    gleichzeitig, jeder ist zu sehen (vorher 1836, davon über 1200 unsichtbar).
  - Ausgewogen: 30/30 gehalten, Druck in den Nächten 23, 24 und 26–29 (Nacht
    24: Mika bei 21 Leben); der einzige Durchbruch ist die Frostnacht – das Herz
    erstarrt im Morgengrauen mit 43 % Leben (Phase 3).
  - Wild: 30/30 gehalten; ab Nacht 8 wird es eng (Barrikade angeschlagen, Mika
    bei 80), ab Nacht 14 Druck in fast jeder Nacht (Nacht 18: Mika bei 17),
    Durchbrüche in Nacht 28 und in der Frostnacht (das Herz erstarrt mit 57 %).
    Die Nächte 13–30 sind ohne den frühen Champion gemessen, die ersten zwölf
    mit ihm nachgemessen.
- **Leistung:** In späten Nächten lief jeder Schlurfer der Karte durch die
  Grafikkarte, auch weit außerhalb des Bilds (Instanzen einer Art kennen kein
  Culling): 25,6 Mio. Dreiecke bei 563 Schlurfern. Jetzt schreibt
  `horde.render` nur, wer im Sichtfeld steht (plus 2,5 m Rand) – 3,5 Mio.
  Dreiecke in derselben Szene, bei 68 Schlurfern 1,6 statt 4,4 Mio. Die
  Simulation braucht dort 11 ms je Schritt (im Container), gut die Hälfte davon
  für das Abstandhalten der Schlurfer (jeder mit jedem) – vorerst so gelassen.
- **Prüfung:** Abschnitt `fragen` prüft die Grenzen (vier Kapseln, die
  Warteschlange wartet bei vollem Bild und holt nach, aus einer Kapsel schlüpft
  dann nichts), `glanz` den Champion in Nacht 2 auf »Wild«; der Prüfpunkt der
  Kürbisballiste hält die Reihe jetzt direkt fest statt mit einer Betäubung.
- **Offen:** »Mehr Sterne« auf »Wild« (OFFENE-FRAGEN 118) ist nicht umgesetzt;
  die Sterne zählen in allen Stufen gleich.

---

## Meilenstein 25 – Nachbesserung: späte Nächte und die Frostnacht vermessen ✓

**Anlass:** Die Frostnacht war noch nicht mit dem Balance-Durchlauf vermessen;
die Gesamtprüfung zeigte dazu drei Mängel im Bild.

- **Balance-Durchlauf über 30 Nächte** (Ausgewogen, Bot mit Mika):
  - Vorher: ab Nacht 12 kein Druck mehr, dafür immer mehr Schlurfer (Nacht 23:
    1500); das Moderherz kam aus der letzten Welle nie an – es hing am Waldrand in
    Betäubung, Rückstoß und im Stau fest und erstarrte mit 60 % Leben.
  - Geändert: Ab Nacht 13 wächst die Menge nur linear, die Masse steckt in der
    Zähigkeit (OFFENE-FRAGEN 158); bis zu 180 Schlurfer je Art im Bild. Das Herz
    führt die zweite Welle an, ist standhaft und schiebt sich durch die eigene
    Horde, hat 80 % des Boss-Lebens; die Frostnacht ohne Bossnacht-Rabatt
    (OFFENE-FRAGEN 159).
  - Ergebnis: 30/30 gehalten, Druck ab Nacht 23, Durchbruch in Nacht 28; in der
    Frostnacht bricht das Herz Barrikaden und Tor, der Frost kommt, im
    Morgengrauen erstarrt es mit rund 40 % Leben.
  - Offen: »Wild« über 30 Nächte ist noch nicht gemessen (erledigt in der
    Nachbesserung 2).
- **Bild:** Lange Gedanken brechen in der Sprechblase um und weichen der
  Nachtplan-Tafel aus (unter die Füße); Wege werden im Satz aufgezählt (»über den
  Nordweg, den Mittelweg und den Südweg – und an diesen Wegen …«); der Abspann
  zeigt die verschneite Bucht ohne Rasterband, die Schrift hat eine Kontur.
- **Technik:** große Schrift (Banner, Abspann) aus einem Zwischenspeicher statt
  jedes Bild neu; der Fallen-Test (seit M19 falsch) prüft jetzt wirklich, dass
  Stachelbretter über die ganze Spalte den Weg nicht sperren.

---

## Meilenstein 25 – Ein Herbst mit Ende (Teil 2: Herbstbuch) ✓

**Ziel (DESIGN 8):** Sterne je Nacht, Herbstbuch mit Deko als Belohnung,
Schlurferkunde mit Dr. Yusufs Notizen, Turmalbum.

- **Sterne:** gehalten, makellos (niemand im Lager, das Zuhause heil), mutig
  (eine Welle früh gerufen) – ganz oben im Morgenbericht, goldene und graue
  Sterne (OFFENE-FRAGEN 155).
- **Herbstbuch** im Pausenmenü (A/D blättern, Reiter auch per Maus): **Taten** –
  zwölf, mit Stand und Tag; jede dritte bringt **Herbstschmuck** (Kürbis,
  Laubhaufen, Regentonne, Kürbislaterne mit Lichtinsel) im neuen Reiter
  »Schmuck« (OFFENE-FRAGEN 156); **Schlurferkunde** – sechzehn Arten mit Zähler,
  was sie tun und Dr. Yusufs Notizen, sobald er da ist (OFFENE-FRAGEN 157);
  **Turmalbum** – die acht fleißigsten Türme mit Rang, Abschüssen, wie oft Turm
  der Nacht und seit wann sie stehen.
- **Abspann:** nennt jetzt auch Sterne und Taten.
- **Technik:** `core/book.js`, `data/book.js`; die Herbst-Modelle der
  Requisiten liegen jetzt in `world/decoModels.js` (Requisiten und Schmuck
  teilen sie); Speichern v20 mit Migration v19 → v20 (Taten, die ein alter
  Stand erfüllt, stehen leise im Buch); Prüfabschnitt `buch`.

---

## Meilenstein 25 – Ein Herbst mit Ende (Teil 1) ✓

**Ziel (DESIGN 8, OFFENE-FRAGEN 117):** Ein Spiel hat ein Ende – ein Finale nach
einem Herbst, danach weiterspielen oder eine neue Runde.

- **Kalender:** »Tag 12 von 30« in der Uhr, ab Tag 25 ein Countdown am Morgen.
- **Frostnacht (Nacht 30):** jede Welle über alle drei Wege, das
  **Moderherz** (neues Modell: Herz aus Pilzgeflecht, Wurzelbeine, Krone aus
  Pilzhüten, glimmende Knoten) führt die letzte an. Wurzeln brechen
  Barrikaden; unter zwei Dritteln ruft es die Horde über alle Wege und schickt
  Sporen, unter einem Drittel kommt der Frost – es schneit, das Herz wird
  langsamer. Fällt es, zerfällt die Horde; sonst erstarrt es im Morgengrauen.
- **Der erste Frost:** Schnee im Bild und auf Dächern, Bäumen, Türmen (der
  Boden nur bestäubt), der Moder glimmt nicht mehr; der Morgenbericht erzählt
  es, danach der **Abspann** (die Menschen der Bucht, die fleißigsten Türme,
  die Zahlen des Herbsts) und die **Wahl**: hierbleiben – jede Nacht würfelt
  sich neu – oder eine neue Runde an einer neuen Bucht.
- **Technik:** `core/autumn.js`, `data/autumn.js`, Speichern v19 mit Migration
  v18 → v19; Prüfabschnitt `finale`.
- **Offen:** Die Frostnacht ist noch nicht mit dem Balance-Durchlauf über 30
  Nächte vermessen (dauert Stunden); Sterne je Nacht, Herbstbuch,
  Schlurferkunde und Turmalbum kamen in Teil 2.

---

## Meilenstein 24 – Wagnis, Vorrat und die große Balance ✓

**Ziel (DESIGN 8):** Mehr Einkommen nur durch Wagnis; Sparen lohnt sich; die
Nächte tragen über zehn und mehr Runden in allen drei Schwierigkeiten.

- **Moderlocke:** nach zwei gewonnenen Nächten im Reiter Fallen, nur auf einem
  Zulauf am Waldrand. Jede Welle bringt dort mehr Horde (im Nachtplan
  angesagt), die mehr Beute trägt; hält die Nacht, wird die Locke zur
  Fundkiste.
- **Makellose Nacht:** Bonus (12 Schrott, 4 Teile) und Serie – nach drei
  wartet Balduins Schatz (ein einzigartiges Turmteil).
- **Vorratskammer:** 6 % Zinsen auf gespartes Schrott (höchstens 12, mit dem
  Lager 24), nicht nach einem Durchbruch.
- **Tote Optionen belebt:** Holzlager (3 Holz, baut morgens bis zu zwei
  Barrikaden wieder auf), Bank (voll geheilt und 20 s lang 25 % mehr
  Schlagkraft), Pfanne (durchschlägt Panzer).
- **Die große Balance:** neuer Balance-Durchlauf `tools/balance.mjs` statt
  Testspielern. Ergebnis:

  - *Vorher:* Ausgewogen und Wild hielten alle zwölf Nächte ohne einen
    einzigen Treffer; ab Nacht 3 starb die Horde 15–30 m vor der ersten
    Barrikadenreihe, Mikas Nahkampf und die Barrikaden hatten nichts mehr zu
    tun. Wild war sogar reicher als Ausgewogen (mehr Horde, mehr Beute).
  - *Gemessen:* Abgelegte Nächte mit mehr Leben je Schlurfer nachgespielt
    (`--sichern`, `--nacht`). Der Bot geriet erst ab etwa 2,5-fachem Leben
    (Nacht 4), 5-fachem (Nächte 6 und 8), 3-fachem (Nacht 10, Pilzmutter)
    und über 8-fachem (Nacht 12) unter Druck – die Türme wachsen viel
    schneller als die Horde.
  - *Geändert:* Zähigkeit ab Nacht 4 (+0,4 je Nacht und ein wenig mehr in
    späten Nächten: Nacht 8 ×3,5, Nacht 12 ×6,2); in Bossnächten nur 40 %
    davon, dort ist der Boss die Prüfung; Bosse behalten ihre Kurve. Wild:
    Budget 1,35 → 1,2, Leben 1,2 → 1,35, Beute 0,9 → 0,85 – schwerer, aber
    nicht mehr reicher.
  - *Ergebnis:* Ausgewogen – zwölf Nächte gehalten, kein Durchbruch, aber
    in den Nächten 4, 7 und 9 steht die Horde an der Barrikadenreihe (Nacht 4:
    Mika mit 47–64 Leben übrig, Nacht 9: die Barrikaden werden angeschlagen).
    Wild – ab Nacht 8 echte Gefahr (eine Barrikade zerschlagen, Mika bei 84).
    Gemütlich bleibt entspannt. Ohne
    Mikas Nahkampf ist Nacht 1 mit einem Turm verloren – wie seit M9.1
    gewollt (»ein Turm und bisschen Handarbeit«).

- **Gefunden und behoben:** Die Moderlocke nutzte dasselbe Kennzeichen wie
  die Vogelscheuche – die Vogelscheuche ließ sich nur noch am Waldrand bauen
  und sperrte nicht mehr (jetzt `bait` für die Locke); die Kosten-Symbole der
  Bauleiste kannten keine Zombieteile (Absturz, sobald die Locke in der
  Leiste stand); der Leimtopf zählte keinen Tritt, wenn die Kletten davor
  schon bremsten; die volle Prüfung hing in den Abschnitten von M16, M18 und
  M19 an einer offenen Perk-Wahl, an einem Frost-Sprenger am falschen
  Wegrand (seit dem Wall bei x = −8) und an einer Messung in ganzen Feldern
  (Prüfaufbau angepasst, `quietChoices`).
- **Technik:** Speichern v18 (Serie, Schatz) mit Migration v17 → v18;
  Prüfabschnitt `wagnis`.

---

## Meilenstein 23 – Gemeinsam durch die Nacht: Posten, Fest, Nebenaufträge ✓

**Ziel (DESIGN 8):** Man stellt Bert ans Tor und Hilde an den Engpass – und
morgens erzählen sie davon.

- **Hochsitz und Posten:** neuer Bau im Reiter Einrichten (neben den Weg,
  höchstens vier); die Auswahl stellt eine eingezogene Person auf den Posten.
  Abends steht sie oben: Bert flickt Barrikaden, Wall und Tor, Hilde wirft
  Einmachgläser, Juna zündet auf J das Leuchtfeuer, Dr. Yusuf verarztet Mika
  und die Türme. Knopf jagt Schwärmer aus dem Hof. Wer zu viel abbekommt,
  zieht sich ins Haus zurück. Der Morgenbericht erzählt davon.
- **Fest am Feuer:** nach jeder gehaltenen Bossnacht – alle stehen morgens ums
  Lagerfeuer, nachts treffen die Türme 10 % härter.
- **Nebenaufträge:** Hildes Garn am Wrack, Junas Antennenteile und Berts
  Werkzeugkasten an den Wegen, Proben von Champions für Dr. Yusuf, Balduins
  Bitte im Handelsfenster; Belohnungen sind Baupläne und Turmteile bis
  »einzigartig«. Zweite Zeile im Zielkasten, Fundstücke funkeln.
- **Technik:** Speichern v17 (Posten am Bau, laufender Auftrag, Fest) mit
  Migration v16 → v17; Morgenbericht bricht lange Zeilen um (Junas Funkspruch
  war seit M22 zu breit); neue Symbole (Hochsitz, Gesichter, Fundstücke).
- **Prüfung:** neuer Abschnitt `gemeinsam` (nur der Kern), Versionsprüfungen
  auf v17.

---

## Meilenstein 22 – Die Horde stellt Fragen: Arten, Merkmale, Bosse ✓

**Ziel (DESIGN 8):** Der Nachtplan kündigt eine Nebelwelle an, und man stellt
schnell noch Laternen an den Nordweg.

- **Wellenmerkmale** (`waves.js`): ab Nacht 4 eine Welle je Nacht, ab Nacht 8
  zwei – Nebelwelle, flinke Welle, gepanzerter Trupp, heilende Welle,
  Moderflut. Nachtplan und Banner sagen sie an, beim ersten Mal erklärt Mika.
  Die Nebelwelle zeigt außerhalb von Licht nur die Augen, Türme treffen sie nur
  im Licht; Nebelbänke ziehen über die Wege.
- **Neue Arten:** Schildträger (Tür vorn), Moderfalter (fliegt über
  Barrikaden), Gräber (buddelt darunter durch), Lichtfresser (löscht Fackeln
  und Laternen bis zum Morgen), Brüter (Sporenkapseln, aus denen Schwärmer
  schlüpfen). Eigene Modelle – die Motte mit Augenflecken auf den Flügeln.
- **Bosse:** Holzfäller (Nacht 5), Pilzmutter (10), Laternenhexe (15),
  Moosriese (20), danach zäher von vorn. Angekündigte Angriffe (Warnkreis,
  Wort), Balken oben im Bild, eigenes Musikstück »Der Boss kommt«.
- **Technik:** drittes Flussfeld (`pathing.free`), Lichtinseln wissen, wo es
  hell ist (`lightPools.spots`, `steal`, `restore`), Teile können an Armen
  hängen (Rig), `def.heavy` statt Typvergleichen.
- **Prüfung:** neuer Abschnitt `fragen` (nur der Kern); die Musikprüfung
  rechnet auch das Boss-Stück.

---

## Meilenstein 21 – Beute mit Glanz: Turmteile, Seltenheit, Champions ✓

**Ziel (DESIGN 8):** Nachts einen goldenen Schlurfer jagen, morgens die Kiste
öffnen und die Kupferspule in den Lieblingsturm bauen.

- **Turmteile in vier Seltenheiten** (`data/towers.js`): gewöhnlich
  Schleifstein (+15 % Schaden), Hufeisen (+30 % Beute), Zahnkranz (+10 %
  Tempo); selten Fernrohr, Schmierfett, Kupferspule (jeder fünfte Treffer
  springt als Funke weiter); besonders Brennglas (Brand), Eiskristall
  (frostig), Uhrwerk (jeder vierte Schuss doppelt), Glücksmünze; einzigartig
  Omas Stricknadel (strickt fest) und Mondstein (Schaden, Reichweite, Aura).
  Ein Fach, ab Stufe 4 zwei; jedes Teil sitzt sichtbar am Turm, das zweite
  rechts neben dem ersten. Mischtürme behalten so viele, wie sie Fächer haben.
- **Champions** (`data/champions.js`): ab Nacht 3 im Wellenplan, mit Namen
  (»Graf Moosbart«, »Tante Hedwig«, »Knorz« …) und Merkmalen (moosig,
  gepanzert, flink, mit Schild, teilend, lichtfressend); dreifaches Leben,
  goldener Schimmer mit Glitzern, Name, Merkmale und Balken über dem Kopf,
  Banner und Hörner bei der Ankunft.
- **Fundkiste:** fällt, wenn ein Champion fällt, und platzt auf, wenn Mika
  davorsteht – ein Turmteil nach Seltenheit, dazu Schrott, Zombieteile und
  vielleicht ein Zahnrad. Der Morgenbericht erinnert an eine liegende Kiste.
- **Basteln** an der Werkbank: drei gleiche Teile ergeben ein zufälliges der
  nächsten Seltenheit (höchstens drei Zeilen, nur was man hat).
- **Balduins Wundertüte** ab Tag 3: ein zufälliges Turmteil, einmal am Tag.
- **Spielstand v16** (Teile als Liste, Champions in Horde und Warteschlange),
  Migration v15 → v16.
- **Prüfung:** neuer Abschnitt `glanz` (nur der Kern); der alte Prüfpunkt der
  Turmteile (M10) liest jetzt `parts`, Balduins Angebote an Tag 3 enthalten
  Bauplan und Wundertüte.

---

## Meilenstein 20 – Mischtürme ✓

**Ziel (DESIGN 8):** Man entdeckt ein Rezept, baut es, und der Abend sieht
anders aus.

- **Acht Rezepte** (`data/mixes.js`): Kürbisballiste (schwerer Bolzen durch
  eine Reihe, platzt am Ende), Eiszapfenschleuder (frostig, ein Eisblock
  zerspringt dreifach), Leuchtpfeil (markiert: alle Türme treffen härter,
  geblendet), Matschkessel (matschig, klebriger Boden), Feuerwerk (Rakete und
  Kettenexplosionen, brennt und blendet), Nebelleuchte (nass, geblendet, ein
  Stück zurück), Glühschwarm (Bienen, die blenden), Wetterhahn (Sprühstoß im
  Kegel: nass, zurückgeschoben). Mischtürme mit Laterne sehen durch den Nebel.
- **Verbinden:** Zwei Türme ab Stufe 3, Kante an Kante, andere Familie – in
  der Auswahl »Verbinden: Name« bzw. »???«, ein Moderkern und 10 Schrott, zwei
  Drücke, nie in der Welle. Der Mischturm steht auf beiden Feldern
  (übereinander gedreht), steigt bis Stufe 5, behält Name, Erfahrung und
  Turmteil.
- **Modelle** (`world/mixModels.js`): zwei Felder breit, in der Mitte der
  Kopf, links und rechts die beiden Ursprünge; Laternen und Raketenspitzen
  leuchten. Neue Geschosse (Ballistabolzen, Eiszapfen, Leuchtpfeil, Matsch,
  Rakete), Klänge (Ballista, Rakete, Nebel), Symbole und ein Zeichen
  »markiert« über dem Kopf.
- **Werkstattbuch** im Pausenmenü: Zähler, je Rezept Name und Tag, darunter
  was es tut und woraus es entsteht; unentdeckte mit Regel und einem Hinweis
  von Bert oder Juna.
- **Balduin** bringt den ersten Moderkern an Tag 4.
- **Spielstand v15** (Werkstattbuch, Herkunft der Mischtürme), Migration
  v14 → v15.
- **Prüfung:** neuer Abschnitt `misch` (nur der Kern, siehe CLAUDE.md).

---

## Meilenstein 19 – Mehr Spielzeug: neue Türme, Fallen und Baupläne ✓

**Ziel (DESIGN 8):** Zwei Spiele nebeneinander verteidigen sich verschieden –
einmal mit Bienen und Glocken, einmal mit Windrad und Knallerbsen.

- **Baupläne** (`data/blueprints.js`): am Anfang die vier Türme und die
  Holzbarriere; nach jeder gewonnenen Nacht, einmal im Wrack und an
  ungeraden Tagen bei Balduin drei Pläne zur Wahl (nach dem Morgenbericht,
  Karten wie die Perks), möglichst aus verschiedenen Arten, fest am
  Startwert der Karte.
- **Bauleiste:** »Türme 2« ab dem sechsten Turm, Reiter »Fallen«; die erste
  Seite bleibt Q R T G C; nach der Wahl springt die Leiste zum neuen Bau.
- **Vier Familien** (`world/familyModels.js`, aus Formen): Glockenturm
  (Sturm-/Friedensglocke), Windrad (Sturm/Mühle), Bienenkorb (Königin/Honig),
  Vogelscheuche (Strohmann/Krähenscheuche) – je fünf Stufen, eigene Klänge,
  Ringe, Schwärme, eine Vogelscheuche fällt um und wird geflickt.
- **Fünf Fallen** (`entities/traps.js`, `world/trapModels.js`): Stachelbrett,
  Leimtopf, Klettenteppich, Knallerbsen, Ölspur – begehbar, sperren das
  Flussfeld nie, nutzen sich ab, neu richten für die Hälfte; der
  Morgenbericht zählt verbrauchte Fallen; auf der Karte violett.
- **Spielstand v14** (Baupläne, offene Wahl), Migration v13 → v14: Wer schon
  eine Nacht gewonnen hat, darf gleich wählen.
- **Prüfung:** neuer Abschnitt `spielzeug` (siehe CLAUDE.md), alle
  Versionsprüfungen auf v14; die Schleifen, die offene Wahlen auflösen,
  kennen jetzt auch Baupläne.

---

## Testrunde m16-r1 und Nachbesserung

**Runde:** vier Testspieler auf M16, je zwei bis vier Nächte (Kira auf Wild,
Gemütlich und Ausgewogen, Mira Gemütlich, Jonas und Theo Wild); alle geben
7/10, keine Blocker, Konsole überall leer. Berichte und Auswertung in
`playtests/m16-r1/` (ZUSAMMENFASSUNG.md). Geliebt: die Kernstunde der Nacht,
die Tafel, Türme mit Namen, Balduin, Knopf. Gestört: das Warten.

**Behoben**

- **Warten (alle):** N ruft ab der Tafel um 19:30 die Nacht (»Ich bin
  bereit«, Mutbonus) und sagt vorher, ab wann es geht; nachts ruft N die
  nächste Welle, sobald die laufende ganz unterwegs ist (vorher erst nach dem
  letzten Schlurfer – das trat nie ein). Ausruhen endet an der Tafel.
- **Stufenaufstieg nachts (Kira):** Perk- und Fähigkeitswahl gehen auf,
  sobald kein Schlurfer näher als 10 m ist; X nennt die wartende Wahl.
- **Gelbes Knäuel (Mira, Jonas, Theo):** Schlurfer liegen über Mikas Umriss;
  sie halten sanft Abstand zu Mika – kein Brummer steht mehr in ihr (Theo).
- **Zähe Natur (Jonas):** 1 Leben je Stufe und Schlag, jedes weitere Ziel
  nur ein Fünftel – mit dem Rechen war Mika vorher unverwundbar.
- **Perk verloren (Theo, Kira, Jonas):** Die Sperre ist sichtbar (Karten
  gerastert), eine Ziffer darin wählt vor, ohne zu bestätigen; ein E gleich
  nach der Wahl geht nicht mehr in die Welt.
- **Reparieren (Kira):** Reicht der Vorrat nur für einen Teil, nennt der
  erste Druck Anteil und Kosten, erst der zweite flickt.
- **Zu Boden (Kira):** Banner »Mika geht zu Boden!«.
- **Feinschliff:** Tafel unter der Zielzeile; E-Hinweis weicht Mikas
  Gedanken aus; Schloss statt Häkchen, wenn ein Bau gerade nicht geht;
  Mikas Laterne am Tag nur ein Schimmer (der Blitz bleibt hell); »Knopf bellt
  – gleich kommt die nächste Welle!«; »Bald kommt die Horde« nicht nach dem
  Rufen, Meldungen weichen der Karte aus; »Los geht’s!« nimmt erst nach gut
  einer Sekunde Tasten an; »Komm her, Knopf!« vorgewählt; Balduins Spruch
  bricht um; die Steuerung wird so breit wie nötig; Turm-Ränge wachsen
  langsamer (¼ Erfahrung je Schadenspunkt); Spitzhacke ohne Stein (4 Holz,
  3 Schrott); »Kein Turm reicht hierher« beim Setzen einer Barrikade.
- **Prüfung:** neuer Abschnitt `nachbesserung16` (siehe CLAUDE.md), dazu
  Titelbild (Tastenspam), Knopf (vorgewählt), Ausruhen (19:30) und
  Spitzhacke in den alten Abschnitten.

**Offen (Balance, M22–M24)**

- Auf »Wild« spielen Barrikaden und Zuhause keine Rolle: Alle Wege treffen
  sich an einem Knoten, Türme dort decken alles (Theo, Jonas) – das Tor (M17)
  ist ein zweiter Druckpunkt, neue Arten (M22) sollen mehrere Stellen fordern.
- Ab Tag 2 lohnt der Tag kaum (Theo), ein Moderkern kam nie; Zielpfeil,
  Randpfeile auf sichtbaren Schlurfern, Treibholz, Steinring, See am Abend
  (F14) bleiben klein offen.

---

## Meilenstein 18 – Zusammenspiel: Zustände und Reaktionen ✓

**Ziel (DESIGN 8):** Wer einen Sprenger neben den Frostnebel stellt, sieht
Eisblöcke zerspringen – und hat das selbst herausgefunden.

- **Zustände** (`data/reactions.js`): nass, frostig, matschig, geblendet,
  dazu Brand und Betäubung – als kleine Zeichen über dem Kopf (höchstens drei).
- **Reaktionen:** Eisblock, Dampf, Glut, Schwachstelle, Splitter, Klebekürbis –
  jede mit eigenem Effekt, Klang und einem Wort, das aufpoppt; der Eisblock
  zerspringt beim nächsten Treffer (»Klirr!«).
- **Das Wetter wirkt:** Regen macht alle nass und dämpft Brand, Nebel kürzt die
  Reichweite (außer im Laternenschein), Wind trägt Kürbisse weiter; der
  Morgenbericht sagt an, was die Nacht bringt.
- **Notizbuch** im Pausenmenü: eine Zeile je Reaktion (Name und Tag der
  Entdeckung), darunter für die gewählte, was geschieht, und Dr. Yusufs Notiz;
  unentdeckte mit einem Hinweis; beim ersten Mal eine Meldung. Die Seite passt
  auch in die kleinste Oberfläche (270 Zeilen).
- **Spielstand v13** (Notizbuch), Migration v12 → v13.
- **Prüfung:** neuer Abschnitt `reaktionen` (siehe CLAUDE.md), alle
  Versionsprüfungen auf v13.

---

## Meilenstein 17 – Tor und Wall: die Bucht wird ein Lager ✓

**Wunsch des Auftraggebers (OFFENE-FRAGEN 120):** ein Tor und ein Wall um das
Lager, am Anfang brüchig, aufrüstbar; Barrikaden, die man täglich wieder
aufbaut und weiter ausrüstet; durchs Tor nur die Lebenden; bricht die Horde
durch, fällt sie das Lager an.

- **Wall und Tor** (`world/campModels.js`, `data/buildings.js`): sechs
  Abschnitte und ein Tor am Westrand der Bucht, auf einem Erdwall; vier
  Stufen (Weidenzaun, Palisade, Bohlenwand, Steinmauer) mit eigenen Modellen,
  Schaden und Trümmern; zwei rote Fahnen über den Torpfosten wehen im Wind
  und zeigen das Tor von Weitem. Auswahl mit E: wieder aufbauen, flicken,
  ausbauen (nicht in einer Welle); Quellen, Bauten und Menschen am Wall gehen
  beim E vor (die volle Prüfung fand den jungen Baum am Wall als
  »Auswählen«). Karte und Nachtleiste zeigen das Tor.
- **Schlupftür:** schwingt auf, wenn Mika davorsteht; ihre Kollision sperrt
  nur die Horde; eine Laufhilfe lenkt Mika von der Seite hinein.
- **Horde am Tor:** Das Flussfeld führt durchs Tor, die Horde schlägt es ein;
  tagsüber nur bis drei Viertel. Solange nichts eingebrochen ist, jagt
  niemand Mika durch den Zaun. Eine Randmarke zeigt das Tor, wenn es außer
  Sicht angegriffen wird.
- **Durchbruch:** Banner »Das Tor ist gefallen!«, Alarm; im Lager wirft die
  Horde Werkbank, Zelte, Beete, Lampen, Bänke und Holzlager um (flacher Haufen
  ihrer eigenen Teile, keine Funktion, Aufstellen für die Hälfte; ein
  umgeworfenes Zelt bringt morgens nichts). Der Morgenbericht nennt Uhrzeit,
  Anzahl und was umgeworfen wurde.
- **Zubehör:** Dornen, Laterne, Pechkessel an Barrikaden (je Stufe ein
  Platz), Dornen, Laterne und Alarmglocke am Tor – angebracht über die
  Auswahlleiste, sichtbar am Modell; neue Klänge (Sturmglocke, Pech). Licht
  lässt Schlurfer auch langsamer zuschlagen.
- **Spielstand v12:** Stufen, Zubehör und Umgeworfenes; alte Stände
  bekommen den Weidenzaun, was auf der Linie stand, kommt in den Vorrat.
- **Prüfung:** neuer Abschnitt `lager` (siehe CLAUDE.md), alle
  Versionsprüfungen auf v12.
- **Offen:** Das Tor liest sich aus der Nordsicht vor allem über Pfosten,
  Schild und Erdwall – ob man es sofort erkennt, soll die nächste Runde
  zeigen; ebenso, ob es zu früh alles entscheidet (OFFENE-FRAGEN 129).

---

## Meilenstein 16 – Die Nacht in der Hand ✓

**Ziel (DESIGN 8):** In jeder Welle gibt es etwas zu entscheiden, Warten ist
freiwillig, das ganze Wegenetz zählt.

- **Nachtplan:** ab 19:30 eine Tafel mit den Wellen der Nacht (Zeit, Wege;
  mit Juna am Funk auch Anführer, Brummer, Leuchtpilze), nachts in jeder
  Pause die nächsten; Randmarken (hohle Pfeile mit der Nummer der Welle)
  zeigen, wo die nächste Welle aus dem Wald kommt.
- **Mehrere Wege:** Nacht 1 über je einen Weg, ab Nacht 2 oft über zwei, ab
  Nacht 4 manchmal über alle drei (`data/waves.js`).
- **Welle rufen (N) und Zeitraffer (B):** In der Pause holt N die nächste
  Welle sofort, alle späteren rücken um dieselbe Zeit vor, gerufene Wellen
  lassen 25 % mehr fallen. B läuft nachts doppelt so schnell (die
  Nachtleiste zeigt »×2«) und geht am Morgen von selbst aus.
- **Schwierigkeit:** Gemütlich (65 % Budget, 80 % Leben, 92 % Tempo, 125 %
  Beute), Ausgewogen, Wild (135 %, 120 %, 108 %, 90 %) – im Titelbild und im
  Pausenmenü (ab der nächsten Nacht).
- **Mikas Fähigkeiten:** zwei Kacheln neben der Schnellleiste (Uhrzeiger-
  Raster, Sekunden, Rang-Punkte), rechte Maustaste und X. Laternenblitz von
  Anfang an; auf Stufe 3 zusätzlich zum Perk eine von drei: Kürbiswurf,
  Pfiff (Knopf rennt los und bellt), Notbrett, Anfeuern, Wirbel; auf 6 und 9
  schärfen. Eigene Posen (Laterne hoch, Wurf über Kopf, Finger an den Mund,
  Jubel, einmal ganz herum), Ringe auf dem Boden, neue Klänge (Blitz,
  Pfiff, Jubel). Bei der ersten Welle stellt eine Meldung den Blitz vor.
- **Nahkampf mit Risiko:** Ein Rückstoß bricht das Ausholen der Schlurfer
  nicht mehr ab; der Biss reicht 0,45 m weiter. Blenden und Betäuben
  brechen es ab – dafür ist der Laternenblitz da.
- **Türme mit Geschichte:** Namen (»Gertrud, Kürbiskatapult«), Erfahrung aus
  Schaden und Abschüssen, Ränge II–IV mit Wimpeln am Mast und etwas mehr
  Wirkung, Aufstieg mit Meldung und Funken; die Auswahl zeigt Rang,
  Abschüsse und Erfahrung; der Morgenbericht kürt den Turm der Nacht.
- **Spielstand v11:** Schwierigkeit, Fähigkeiten (Plätze, Ränge, offene
  Wahl), Turm-Erfahrung, Abschüsse und Namen, Abschüsse je Turm und
  gerufene Wellen der laufenden Nacht; Migration v10 → v11.
- **Prüfung:** neuer Abschnitt `nacht16` (siehe CLAUDE.md), Titel-Prüfung
  mit der Zeile »Schwierigkeit«, alle Versionsprüfungen auf v11. Die volle
  Prüfung fand zwei Stellen, an denen das Neue ältere Prüfpunkte störte: Die
  Fähigkeiten-Wahl auf Stufe 3 hielt die »verlorene Nacht« an (die Prüfung
  wählt sie jetzt weg), und die Fähigkeiten-Kacheln lagen über der vierten
  Barrikade der dichten Reihe (die Reihe steht jetzt höher im Bild). Beide
  Abschnitte danach grün, alles andere im ersten Durchlauf.
- **Offen für die Testrunde:** Werte der Fähigkeiten und Ränge, ob man
  Fähigkeiten tauschen möchte (OFFENE-FRAGEN 122), wie oft N und B genutzt
  werden. Die geplante Runde m15-r1 läuft als **m16-r1** gleich über
  M13–M16 – so spielen die Testspieler schon die neuen Nächte.

---

## N2 – Startbild und Menümusik ✓

**Auftrag:** »Wenn man startet, soll auch eine Musik im Menü sein, und ein
pixeliges ›Produced by Tales of Cue‹ oder so eingeblendet werden.«
(OFFENE-FRAGEN 121)

- **Startbild** (`src/ui/splash.js`, neuer Modus `splash`): »Tales of Cue«
  in großer Pixelschrift, darunter »präsentiert«, darüber ein offenes Buch
  (Zeilen, ein kleiner Kürbis) mit einer Laterne, deren gerasterter Schein
  flackert; Laub fällt. Bis zum ersten Druck steht »Taste drücken« da –
  vorher entsteht kein Klang. Der Druck startet die Spieluhr, Funken steigen
  auf, ein Glanz läuft über den Schriftzug, dann blendet das Titelbild ein;
  ein zweiter Druck springt weiter. Die 3D-Szene ruht dahinter (nur die
  ersten Bilder zeichnet sie, damit die Shader schon übersetzt sind).
- **Musik:** neues Titelstück »Herbstlied am Stillsee« (G-Dur, 72 Schläge
  pro Minute, 18 Takte: Vorspiel, Thema mit Spieluhr, Thema mit Flöte,
  Mittelteil mit Streichern, Schluss), in Schleife mit kurzer Pause; beim
  Losspielen blendet es in zwei Sekunden aus und macht dem Tag Platz. Die
  Spieluhr des Startbilds: G–H–D–G, warmer Akkord mit Gitarre und
  Streichern, ein Glitzern (rund drei Sekunden). Beide ohne Übersteuerung
  (Spitzen 0,24 und 0,25 im Prüfbrowser).
- **Prüfung:** im Spielstart das Startbild (Texte, kein Klang vor dem Druck,
  Spieluhr danach, Titelmusik »titel«, nach »Los geht’s!« aus), Bild
  startbild; »Titelbild ohne Stand« geht mit echter Taste am Startbild vorbei;
  die Pegelprüfung rechnet auch Titelstück und Spieluhr.

---

## N1 – Figuren aus Formen statt Kästen ✓

**Auftrag:** »3D-Modelle der Zombies und Figuren aufwändiger gestalten. Etwas
mehr als nur Quadrate. Ich will schönere, bessere Figuren. Nicht nur die
Texturen, die 3D-Modelle selber!« (OFFENE-FRAGEN 115)

- **Werkzeug:** `voxelKit.js` kann jetzt formen – Kapsel, gerundeter Quader,
  Ellipsoid, weiche Vereinigung, Abziehen und `sculpt` (füllt eine Form im
  Maß 1/32 und reicht der Farbfunktion die Flächennormale), `roundTone` gibt
  Kuppen Licht und Unterseiten Schatten. `figureKit.js` (neu) hält die
  Menschen-Formen: Kopf (zum Kinn schmaler), Rumpf (runde Schultern, Taille),
  Arme und Beine mit Ellbogen und Knie, Kragen, Ohren, Lider und die
  Vorderkarten, auf denen Gesicht, Bart, Riemen und Taschen sitzen.
- **Mika:** Mütze als Polster mit Umschlag und Bommel, Rucksack mit runden
  Kanten; beim Gehen beugen sich die Knie, die Laterne
  hält der angewinkelte Arm vor der Brust, beim Schlag holt der Unterarm aus,
  auch beim Durchsuchen, Ausruhen, Schaukeln und in der Rolle.
- **Horde:** alle sechs Arten mit geneigtem Kopf, Buckel, hängenden
  Schultern und nach vorn greifenden Armen mit hängenden Händen (Flitzer mit
  Läuferarmen), der Brummer mit Bauch; Kapuze als Schale um den runden Kopf,
  Warnstreifen und Augen folgen der Wölbung.
- **Überlebende und Balduin:** Hilde, Bert, Juna, Dr. Yusuf und Balduin mit
  denselben Formen; Mützen, Bärte, Brillen, Kopfhörer, Stethoskop und Taschen
  sitzen auf der Rundung.
- **Knopf:** runder Rumpf mit hellerer Brust und dunklem Sattel, Kopf mit
  Schnauze, Nase mit Glanz und großen Augen, Schlappohren, gebogener Schwanz,
  Beine mit Pfoten und Befiederung, Zotteln als Büschel, einzelne graue
  Haare; der Knopf am Halsband hängt so, dass man ihn von vorn sieht.
- Die alten Kasten-Bauteile im Maß 1/32 sind entfernt. Bauzeit aller
  Figuren zusammen etwa +0,25 s beim Laden (Mika nach dem Aufwärmen ~80 ms,
  das meiste ist das Vernetzen).
- **Prüfung:** neuer Abschnitt `figuren` – Köpfe und Rümpfe aller 13
  Figuren sind gewölbt (höchstens rund die Hälfte einer Vorderseite in einer
  Ebene; die alten Kästen lagen bei 70–100 %), Knie beim Gehen und der
  angewinkelte Laternenarm mit echten Tasten; Bild figuren.

---

## Der große Plan ab M16

**Auftrag:** »Lass uns jetzt den großen weiteren Plan bauen – auch mit den
Elementen aus den Tower-Defense-Karten von Warcraft 3. Jetzt steht der Rumpf
des Spiels, jetzt muss der Spaß rein.«

- **Analyse** (DESIGN 10): Wintermaul, Element TD, Gem TD, YouTD, Green TD,
  Legion TD und Line Tower Wars, Hero-Defense-Karten – acht Gründe, warum sie
  Spaß machten, und was wir davon übernehmen oder bewusst nicht.
- **Plan** (DESIGN 8): zehn Spaß-Meilensteine – M16 Die Nacht in der Hand,
  M17 Tor und Wall, M18 Zustände und Reaktionen, M19 neue Türme, Fallen und
  Baupläne, M20 Mischtürme, M21 Turmteile, Seltenheit und Champions, M22 neue
  Arten, Merkmale und Bosse, M23 Posten der Überlebenden und Nebenaufträge,
  M24 Wagnis, Vorrat und die große Balance, M25 ein Herbst mit Finale. Davor
  N1, N2 und eine Testrunde zur Frage »Wo macht es Spaß, wo langweilt es?«.
- **Entscheidungen des Auftraggebers:** M16 zuerst; **kein Umlenken** (Nr. 66)
  – stattdessen **Tor und Wall** ums Lager, anfangs brüchig, aufrüstbar, nur
  die Lebenden kommen durchs Tor, bricht die Horde durch, fällt sie das Lager
  an (Nr. 120, M17); ein **Finale**, danach wie bei RollerCoaster Tycoon
  weiterspielen (Roguelike-Nächte, Nebenaufträge) oder neue Runde (Nr. 117).
  Dazu Annahmen in Nr. 116, 118 und 119.

---

## Meilenstein 15 – Geschichte und Einleitung ✓

**Auftrag:** »Wir wissen aktuell nicht, warum die Zombies nicht durch den
Wald kommen, was überhaupt passiert ist und was unsere Aufgabe ist.« Vor der
Balance (M14, wartet auf den Auftraggeber) vorgezogen. Die Antwort ist eine
einzige Ursache, die man im Spiel sieht (OFFENE-FRAGEN 114, DESIGN 4.1):
der **Moder**, ein Pilzgeflecht im Waldboden.

- **Einleitung als Kamerafahrt:** Beim Einblenden steht die Kamera am
  Waldrand beim Mittelweg-Spawn. Mika erzählt in sechs Zeilen: »Drei Herbste
  ist es her, seit der Moder aus dem Waldboden kam …« – die Kamera gleitet
  weich zum Unterholz (»… ein einziges Modergeflecht, weich wie Moos und zäh
  wie Leim. Fest sind nur die alten Holzfällerwege.«), zum Zusammenfluss (die
  Karte der Wege erscheint über dem Dialog: »Und alle diese Wege laufen hier
  zusammen, an der alten Holzlände am Stillsee …«), zum Haus (»Hinter mir
  nur Wasser – und Wasser meiden sie.«) und zurück zu Mika (»Tagsüber mache
  ich es zu einem Zuhause, nachts halte ich die Wege …«). Die letzte Zeile
  schickt zur Axt. Während der Einleitung zeigt das Bild nur den Dialog.
  Der Blick ins Unterholz sucht sich auf jeder Karte die Stelle neben einer
  Zuführung mit dem meisten Waldboden im Bild.
- **Der Moder ist zu sehen:** Im Waldboden liegen dunkelviolette Matten mit
  ausgefranstem Rand und Fäden mit hellen Knoten, dichter, je tiefer es in
  den Wald geht; dazu Grüppchen blasser Moderpilze und kleine Hexenringe
  (nie im Begehbaren, nie auf dem Weg). Nachts glimmen Fäden, Knoten und
  Pilzkuppen – über das Eigenlicht des Bodens und ein Glühmaterial, ohne
  zusätzliche Lichtquelle.
- **In der Welt verteilt:** Läuft Mika gegen den Wald, denkt sie einmal am
  Tag darüber nach (vier Sätze, je Tag ein anderer); der Warnpfahl am Spawn
  lässt sich ansehen (»Ein rotes Kreuz und eine alte Laterne. Jemand vor mir
  hat markiert, wo sie aus dem Wald kommen.«) – als Gedanke, weil dort nachts
  die Horde kommt; Radio Stillwald rät »bleibt auf festem Boden … nachts
  Licht an, Türen zu«; Hilde fährt nur auf festen Wegen, Bert erzählt von den
  geschotterten Holzfällerwegen, Dr. Yusuf, was der Moder ist und was Licht
  mit ihm macht, Balduin, warum auf den Inseln keiner wächst.
- **Prüfung:** neuer Abschnitt `geschichte` (Moder im Boden und als Pilze,
  Gedanke am Waldrand mit echter Taste, Warnpfahl mit echtem E, Bild
  moder-nacht); der Spielstart prüft die Kamerafahrt mit echten Tasten (Bild
  intro-wege). Die Schriftprüfung deckt jetzt auch die Tagessätze
  eingezogener Überlebender ab.

---

## Meilenstein 13 – Detailgrad

**Neu im Plan (Frage des Auftraggebers):** Der Detailgrad bekommt einen
eigenen Meilenstein vor der Balance. Drinnen (M11) und alles Kleine und
Lebendige (M9.1, M12) waren schon im feinen Maß; draußen waren Haus, Hof,
Requisiten und Natur noch grob. Jetzt ist alles aus 1/16-m-Voxeln gebaut
(OFFENE-FRAGEN 111). Die Balance wird M14, an den Vorschlägen dafür ändert
sich nichts.

**M13a – Zuhause und Hof:**
- **Das Fischerhaus** sieht man nur von vorn und von oben – dort sitzen die
  Einzelheiten: senkrechte Bretter mit Fugen und Astlöchern, vorstehende
  Querlatten mit Nägeln, weiß gestrichene Fensterrahmen mit Sprossenkreuz,
  Gardinen mit Raffband, Fensterbank und Blumenkasten mit Blüten; eine
  blaugrün gestrichene Brettertür mit Z-Strebe, Bullauge und Messingknauf;
  im Giebel Stülpschalung, eine Lüftung, ein geschnitzter Holzfisch und das
  Hufeisen. Das Wellblechdach besteht aus Tafeln (rot, grau, rostig) mit
  Rillen, Schrauben und Roststellen, der Westhang liegt heller (man sieht den
  First); Plane mit zwei Reifen, Solarpaneel mit Zellen, Ofenrohr mit
  Regenhut. Die Veranda hat Dielen mit versetzten Stößen, ein Geländer mit
  Pfosten, Handlauf und Stäben, Terrakottatöpfe mit Geranie, Heide und
  Lavendel; der Anbau ein zweites Fenster mit Kräuterkasten und ein
  Fallrohr. Dachfenster, Werkzeugbrett mit Sägebock und die Kisten zeigen
  die Stufen 3–5.
- **Vordach kürzer:** Das alte, tiefe Vordach verdeckte die Tür fast ganz.
  Jetzt hängt ein kurzes Vordach an zwei Streben (keine Stangen mehr im Weg),
  die Laterne sitzt als Wandlampe neben der Tür (Lichtquelle mitgewandert).
- **Hof:** Feuerstelle aus runden Feldsteinen mit verkohlten Scheiten und
  züngelnden Flammen; Sitzstämme mit heller Sitzfläche; ein karierter
  Ohrensessel mit Kissen und Decke (vorher ein oranger Klotz); Wegweiser mit
  Pfeilbrettern und geschnitzter Schrift; runder Briefkasten mit Fähnchen;
  Wäsche mit Hemd (Kragen, Knöpfe), Ringelsocken, Handtuch mit Fransen und
  Hose; Holzstapel mit Hirnholz unter Blech; Hackklotz mit Jahresringen,
  Kerben und einer echten Axt; Regentonne mit Dauben und Hahn; Hochbeet mit
  Kürbissen, Kohl und Möhrenkraut; Schaukelreifen mit Profil.
- **Bauten:** Werkbank mit Lochwand (Säge, Hammer, Schlüssel, Zange),
  Schraubstock, Hobel und Laternchen; Laternenpfahl mit Steinfuß und Laterne
  mit Dach; Flachsbeet mit blauen Blüten; Gartenbank mit Lehne und
  Armlehnen; Zelt mit Nähten, Flicken, aufgerollten Klappen, Schlafsack und
  Spannleinen; Holzlager mit Schindeldach.

**M13b – Wege und Wasser:** Steg mit Fugen (darunter das Wasser), Nägeln,
einem fehlenden Brett, Pfählen mit Algen, Pollern und einer aufgeschossenen
Leine; der Leuchtmast als Gitterturm mit rot-weißen Beinen, Kreuzstreben,
Gitterrost, Betonsockeln und Schaltkasten mit Warnschild, alle drei
Ausbaustufen (Leiter, Antenne mit Schüssel, Leuchtfeuer) fein; Wrack,
Turmteil, Warnpfähle mit gemaltem Kreuz, Laterne und Fetzen; Kiesel mit
Glanzpunkt, Faserbusch mit Samenrispen, Astbündel mit Schnur, Schrotthaufen
mit Reifen, blauer Öltonne und Wellblech, Stümpfe mit Jahresringen.

**M13c – Natur und Boden:** Tannen aus Zweiglagen mit hängenden Spitzen,
Laubbäume und Birken mit Kronen aus vielen Laubbüscheln (oben hell, unten
dunkel – vorher wirkten sie im feinen Maß wie Bälle), Rindenfurchen und
Wurzelansatz; Büsche, Felsen mit Riss, Moos und Flechte, Gras und Blumen
fein. Der Boden ist ruhiger: Laub liegt in Verwehungen statt überall als
Einzelpunkt, trockene Stellen und Hofflecken sind zusammenhängend, Wege
haben Flächen statt Rauschen und einen dunklen Rand – die Dinge heben sich
ab. Markierband und Markierpflock der fällbaren Bäume sind mitgewandert.

**M13d – Türme:** von Grund auf fein gebaut statt verdoppelt: Sockel aus
behauenen Steinen; Bolzenwerfer als Holzgerüst mit Armbrust auf Drehteller
(Scharfschütze mit langem Lauf und Fernrohr, Repetierer mit Trommel und
zweitem Bogen); Katapult mit Lafette, Böcken, Wurfarm, Korb und
Kürbisvorrat (Feuerkürbis mit geschnitztem, glimmendem Gesicht, Streukürbis
mit kleinen Kürbissen); Rasensprenger mit Daubentank, Spannbändern,
Schlauch und gebogenen Düsenarmen (Frost weiß mit Eis, Schlamm braun);
Laternenturm mit Pfahl, Trittsprossen, Streben und Laterne mit Spitzdach
(Leuchtfeuer mit Blendring und zweitem Licht, Glücksklee mit Messing und
Kleeblättern). Die Horde war seit M5 fein und bleibt, wie sie ist.

**M13f – Ansicht und Boden (zweite Rückmeldung: »Ich erkenne einfach nichts.
Das heißt mehr Pixel und mehr Details an 3D-Modellen.« – dann mit Vorbild:
»Größe und Stil wie jetzt beibehalten«):** Die Größe bleibt bei 80 px/m. Z
(auf deutschen Tastaturen auch die Taste daneben) geht auf Wunsch nah heran
(160 px/m wie drinnen) und zurück, die Wahl steht im Menü (»Ansicht«) und
bleibt gespeichert; drinnen gilt weiter der Maßstab des Innenraums. Die
Bodentextur hat jetzt 1/16 m je Texel (in der Nähe sah man 20-px-Kacheln),
die Ladezeit steigt dadurch um knapp eine Sekunde. Neuer Prüfabschnitt
`ansicht` (OFFENE-FRAGEN 112). Mehr Einzelheiten je Ding kommen als
Nächstes aus noch feineren Modellen (1/32 m, Nr. 113).

**M13g – doppelt fein (1/32 m, gut 2 px je Voxel; Vorbild des
Auftraggebers: »Da siehst du, wie viele Pixel wir wirklich brauchen!«):**
Alles Gebaute, Bewohnte und Lebendige draußen ist neu gezeichnet, nicht bloß
verdoppelt (OFFENE-FRAGEN 113):
- **Mika** mit Gesichtsplatten, Knopfleiste, Rucksack und Isomatte; Laterne
  mit dünnen Streben und Bügel, Werkzeug mit Maserung und blanken Schneiden.
- **Hof:** Feldsteine rund, Scheite mit glühenden Rissen, Sessel im Tartan
  mit Paspel, Hackklotz mit Rindenplatten, Trockenriss und Axtkerben, die Axt
  mit Lederwicklung; Wegweiser mit gemaltem Fisch und Häuschen, das Brett
  nach Moosbach rot durchgestrichen; Briefkasten mit Namensschild und einem
  Brief im Schlitz; Wäsche mit Kragen, Knopfleiste, Brusttasche, Ringelsocke
  mit Ferse und Arbeitshose mit Knieflicken; Holzstapel aus runden, halben
  und geviertelten Scheiten mit Jahresringen; Kürbisse mit feinen Furchen,
  Laternen mit hellen Schnittkanten.
- **Haus:** Bretter mit Lichtkante, Wellblech mit Licht, Flanke und Tal,
  Schrauben mit Rostfahnen, Solarzellen mit Leiterbahnen, Tür mit Z-Strebe,
  Nägeln, Bullauge mit verschraubtem Messingring, Gardinen mit Falten,
  Blumenkasten mit fünfblättrigen Blüten, Vordach mit Naht und Bögen,
  Lichterkette mit richtigen Lämpchen; Veranda, Anbau und Stufen 3–5 ebenso.
- **Steg, Wrack, Leuchtmast:** Planken mit Fugen und Nägeln über den
  Balken, ausgetretene Mitte, dünne Kreuzstreben am Mast, Warnschild mit
  Blitz am Schaltkasten.
- **Bauten und Barrikaden:** Werkbank mit Lochwand, Schraubstock mit Knebel
  und Hobel; Laterne, Bank, Flachsbeet, Zelt mit gestepptem Schlafsack,
  Holzlager mit Schindeln; der Spanische Reiter mit Maserung und runden
  Balken, der Stahligel mit Nieten.
- **Türme:** Sockelsteine mit heller Oberkante, Armbrust mit Bolzen und
  Federkiel, Fernrohr mit Linse, Katapult mit geflochtenem Korb,
  Rasensprenger mit Dauben und Nieten, Laternenturm mit Stufendach; Fahnen
  mit Schwalbenschwanz.
- **Horde:** ein Zeh schaut aus dem Schuh, Finger mit dunklen Nägeln,
  Knopfleiste, Brusttasche, genähter Mund, schwere Brauen, ein eingerissenes
  Ohr; runde Fliegenpilze, runder Leuchthut, Geweihkrone mit Gabeln.
- **Überlebende und Balduin:** Gesichter im Maß 1/32 (Brillenränder, Bärte in
  Strähnen), Postmütze mit Posthorn, Karohemd, Kopfhörer mit Lichtring,
  Stethoskop; Balduins Bart mit Goldzahn, Boot mit Rettungsring,
  Einmachgläsern (das Auge!), Steuerhaus mit Fenstern.
- **Knopf, Krähen, Beute:** Hund mit Glanz in den Augen und dem großen Knopf
  mit vier Löchern; Krähen mit gefingerten Schwungfedern; Zombiehand mit
  Moos und Blümchen, Zahnrad mit Speichen, facettierter Moderkern.
- Die Natur bleibt 1/16 m (Menge), der Boden bekam eine Feinzeichnung im
  Maß 1/32 (Halme, Blattspitzen, Körner).
- **Prüfung:** `detail()` misst je Modellfamilie die kleinste Kantenlänge
  der Geometrie – alle 1/32; die Bildlast im Hof bleibt unter 1,5 Mio.
  Dreiecken.

**Leistung:** Im Bild steigen die Dreiecke je nach Stelle auf etwa das
Doppelte (Hof 190 000 → 270 000, Weg 320 000 → 520 000); die Natur macht den
größten Teil aus. Mit M13g noch einmal: Hof 310 000 → 535 000 (Stufe 5 mit
allen Überlebenden etwa 1 Mio.), Weg 520 000 → 740 000; 24 Türme auf Stufe 5
von 120 000 auf 310 000 Dreiecke (mit geteilter Geometrie und grobem Umriss
statt 480 000). Schatten bleiben grob (Bäume 1/4 m). Die softwaregerenderte
Bildzeit im Prüfbrowser änderte sich kaum (35–45 → 40–46 ms).

---

## Feinschliff nach m12-r1

Was die Testrunde als Feinschliff fand und ohne Balance zu lösen war:

- **Küche war zu Fuß unerreichbar (Theo, eigentlich ein Blocker):** Der
  Stubentisch stand so nah an der Trennwand, dass er den Durchgang zur Küche
  versperrte – ab Stufe 2 kam man weder in die Küche (Suppe) noch später in
  die Werkstatt. Die Prüfung von M11 hatte Mika in die Räume versetzt statt
  sie laufen zu lassen. Der Tisch (mit Teekanne) steht jetzt eine Armlänge
  weiter östlich; ein neuer Prüfpunkt läuft auf Stufe 5 von Raum zu Raum
  (Gegenprobe: mit dem alten Tischplatz blieben 3,1 m übrig).

- **Barrikaden:** Mika klettert über ihre eigenen Barrikaden – langsamer und
  ein Stück höher –, statt mitten in der Reihe hängen zu bleiben (Mira). Die
  Horde bleibt davor (Kollision mit Markierung `climb`, nur die Figur geht
  durch; OFFENE-FRAGEN 109).
- **Kiesel und fällbare Bäume:** Kiesel sind ein Häufchen heller, glänzender
  Steine auf dunkler Erde; kein Deko-Fels ist mehr so klein wie ein Kiesel.
  Vor jedem fällbaren Baum steht ein blau-weißer Markierpflock mit Fähnchen –
  das rote Band am Stamm verdeckte die Krone, und Rot-Weiß tragen schon die
  Fliegenpilze (Jonas).
- **Drinnen** steckt Mika das Werkzeug weg – die Axt ragte in der engen Stube
  durch die Wand (Mira).
- **Wrack:** ein umgedrehter Ruderboot-Rumpf mit Planken, Kiel, weißer Kante,
  schmalem Heck und spitzem Bug statt eines gesprenkelten Rechtecks (Mira).
- **Tageslicht:** rosa Morgen, warmes Herbstlicht, goldener Nachmittag und
  goldene Stunde, eine hellere, wärmere Dämmerung (Mira, Jonas). Vor allem das
  Himmelslicht färbt jetzt je Tageszeit; das Gras selbst bleibt grün – die
  Palette hat keine goldenen Mitteltöne (offen, siehe OFFENE-FRAGEN 110).
- **Durchsicht:** Mikas gelbe Durchsicht ist nur noch halb gerastert – dicht
  verschmolz sie mit Schlurfern und Stühlen davor (Mira, Kira).
- **Reifenschaukel (Kira):** Mika schaukelt wirklich – sie steht im Reifen,
  hält sich an den Seilen fest und schwingt ein paar Sekunden mit (die
  Schaukel ist ein eigenes, drehbares Teil am Ast). »Wiiiiieee!« und
  »…Ich bin erwachsen« sind jetzt Gedanken statt eines Dialogs; wer
  losläuft, steigt ab.
- **Bedienung (Theo):** In einer dichten Barrikadenreihe wählt der Zeiger die
  Barrikade darunter, nicht mehr die Nachbarin davor (die Kästen überdecken
  sich stark – nachgestellt: vorher traf jeder Klick die südliche). Breite
  Bauten zum Benutzen (Werkbank, Bank, Beet) messen den Abstand zur
  Grundfläche statt zur Mitte, und Sitzplätze treten hinter ihnen zurück –
  E neben dem Sessel öffnet die Werkbank. Die Zahl an den Randmarken heißt in
  der Textansicht »Stück«. (Verschluckte schnelle Tasten in der Werkbank-Liste
  kamen aus der Brücke: Fünf Tipper in einem Bild zählen einmal.)
- **Prüfung:** neue Punkte im Abschnitt `nachbesserung` (Klettern über die
  eigene Reihe, Werkzeug drinnen weggesteckt, Barrikade unter dem Zeiger,
  Werkbank vor dem Sessel – mit Gegenprobe).

---

## Testrunde m12-r1 und Nachbesserung

**Runde:** vier Testspieler über M8–M12, je ein neues Spiel bis Tag 3
(Urteile: Mira 7, Kira 7, Jonas 6, Theo 6; Konsole überall leer). Berichte
und Auswertung in `playtests/m12-r1/` (ZUSAMMENFASSUNG.md).

**Behoben**

- **Blocker:** Der Morgenbericht klebte nach dem Neuladen im Bild (Kira) –
  jetzt geht er wieder richtig auf. Stein fand keiner (Jonas, Theo), obwohl
  Kiesel in der Bucht und an den Wegen liegen: Fehlt Stein, zeigen Ziel und
  Pfeil zum nächsten Kiesel.
- **Wege nachts:** Fackeln an den Wegen (Flamme und Lichtinsel, instanziert,
  keine neuen Lichter) und ein leichtes Eigenlicht der Wegfelder.
- **Warnungen:** Banner und Ton, wenn das Zuhause nachts unter die Hälfte bzw.
  ein Viertel fällt, Mikas Gedanke drinnen; unter 35 % Leben ein pulsierender
  roter Rand, Herzschlag und »Mir wird schwindelig …«.
- **Jäger umgingen Barrikaden (Kira):** Endete die Jagd, suchten sie den
  nächsten Weg – oft hinter der Reihe. Jetzt kehren sie an die Stelle zurück,
  an der sie den Weg verlassen haben (`rejoin`, OFFENE-FRAGEN 105).
- **Ziele und Auswahl:** Das Turm-Ziel zählt nur mit Horde in Reichweite
  (Hinweis in der Vorschau); die Perk-Wahl wartet, bis es ruhig ist, und nimmt
  keine Kampf-Klicks; die Bauleiste behält ihren Reiter drinnen und draußen.
- **Kleinigkeiten:** Hinweis an der Haustür, Morgenbericht auch nach einer
  durchwachten Nacht, kurze E-Sperre nach Dialogen (gehaltenes E zählt danach
  als Druck), Meldungen und Banner
  verdecken nichts mehr, Zielpfeil über der Steuerungszeile, Mikas Porträt aus
  dem feinen Modell, »Esc Tschüss sagen« bei Balduin nach einem Tausch, Texte
  (Kamin, Wetter, Flickschusterei), Mika freut sich nach Bauten und Funden.
- **Prüfung:** neuer Abschnitt `nachbesserung` (Bericht nach dem Neuladen,
  Haustür, Kiesel-Ziel, Turm-Ziel, wenig Leben, Zuhause-Banner, Fackeln, Jäger
  vor der Reihe, E nach einem Dialog).
- **Unterwegs behoben:** Die E-Sperre schluckte ein gehaltenes E – der Baum
  fiel nicht, wenn man gleich nach dem Axt-Dialog E hielt (volle Prüfung).
  Die Musikprüfung stolperte über die Perk-Wahl, die jetzt erst in Ruhe
  aufgeht und den großen 3-s-Schritt anhielt – sie geht in 500-ms-Schritten.

**Für M13 gesammelt (Balance, mit dem Auftraggeber)**

- Nahkampf ohne Risiko: Treffer stoßen zurück und brechen das Ausholen der
  Schlurfer ab – wer im Takt klickt, wird nie getroffen (Theo, Jonas).
- Nächte für Erkunder zu hart, Reparieren teuer (Mira); leere Tage, volle
  Nächte (Jonas, Theo); Balduin ohne Mengengrenze; tote Optionen (Holzlager,
  Sitzbank); nur ein Weg je Nacht; Wetter mit festem Startwert (Tag 3 immer
  klar).

---

## Meilenstein 12 – Herbst, Wetter und Lesbarkeit ✓

**Auftrag:** Herbst überall, Wetter, alle Modelle im feinen Maß und
ausdrucksstärkere Gesichter (DESIGN.md 3.2, 6.1 und 8, Meilenstein 12).

**Fertig**

- **Wetter je Tag (`data/weather.js`, `world/weather.js`):** klar, Wind,
  Nieselregen oder Nebel – fest aus Welt-Startwert und Tag, die ersten beiden
  Tage klar. Das Wetter dämpft Sonne, Schatten und Farben (Post-Pass),
  blendet über ein paar Sekunden über, biegt Gras, Blumen und Schilf stärker
  (`uWind` im Wind-Shader, nur die Stärke, nie die Phase) und treibt Rauch und
  Laub. Nieselregen fällt in Schauern als pixelige Striche mit Spritzern über
  das Bild, drinnen nicht. Nebelbänke ziehen jeden Morgen über den See, an
  Nebeltagen dichter, länger und auch über die Bucht. Fallendes Laub trudelt
  (schmal, breit, dunkler, pendelnd) und bleibt kurz liegen; in kalten
  Nächten Atemwölkchen vor Mikas Mund. Die Uhr zeigt das Wetter mit eigenem
  Symbol (Regenwolke, Nebel, Wind), der Morgen und ein neuer Tag sagen es an.
- **Klang:** Regenrauschen und einzelne Tropfen (drinnen dumpf aufs Dach),
  Wind je nach Wetter, Krähenrufe am Tag.
- **Herbstschmuck:** Schilf mit Rohrkolben im flachen Wasser am Ufer und an
  den Inseln, Pilzgruppen am Waldrand und unter den Bäumen der Bucht,
  Kürbisse am Beet und am Strand, zwei Kürbislaternen vor der Tür – tagsüber
  dunkle Löcher, nachts flackernd mit Lichtinsel –, zwei Laubhaufen (Laub
  stiebt auf, wenn man hindurchläuft) und Treibholz. Alles im feinen Maß,
  mit eigenem Zufall (der Wald bleibt, wie er war).
- **Krähen (`entities/crows.js`):** fünf Krähen auf Pfosten, Briefkasten,
  Hackklotz, Beetrand, Steg und im Gras; sie picken und drehen sich, fliegen
  krächzend auf, wenn Mika oder ein Schlurfer zu nahe kommt (die Nachbarn
  gleich mit), kommen nach einer Weile zurück und ziehen abends in den Wald.
- **Gesichter:** Mikas Gesicht ist je Ausdruck eine eigene Platte – normal,
  froh, Aua, staunend, müde, besorgt, entschlossen; Treffer, Schläge, Funde,
  Bauten, Stufen, Welle, Balduins Fanfare, wenig Leben, späte Nacht und
  Gespräche setzen sie. Die Überlebenden lächeln, wenn Mika bei ihnen steht
  oder sie winken.
- **Feines Maß:** Mikas Laterne, Turmbolzen und Kürbisgeschosse (gerippt, mit
  leuchtendem Gesicht) sind jetzt 1/16 m.
- **Prüfung:** neuer Abschnitt `herbst` – Wetter je Tag, Regen im Bild und
  nicht drinnen, Nebel, Wetter in Uhr und Morgenbericht, Schilf,
  Kürbislaternen, Laub, Krähen (auffliegen, zurückkommen, vor Schlurfern,
  abends weg), Gesichter, Lächeln (Bilder: wetter-regen, wetter-nebel,
  laternen, herbst).

**Behoben unterwegs**

- Mikas Umriss (renderOrder 1.75) schimmerte über Teilen, die vor dem Körper
  liegen: Gesichtsplatten, Lider, Laterne und Werkzeug zeichnen jetzt danach
  (renderOrder 2).
- Die Schriftprüfung rief neue Dialoge (M11) ohne `world` und `player` auf –
  die Dialoge sind jetzt nachsichtig, die Prüfung deckt alle Ausbaustufen ab.

**Offen**

- Porträts im Dialog mit Ausdruck (OFFENE-FRAGEN 103), Krähen, die etwas
  bringen (Ideen-Parkplatz), Wetter mit Wirkung auf Werte (Nr. 99, M13).

---

## Meilenstein 11 – Das Zuhause am Wasser ✓

**Auftrag:** Das Fischerhaus wächst in Stufen und Räumen, und drinnen ist ein
eigenes Bild (DESIGN.md 6.8 und 8, Meilenstein 11).

**Fertig**

- **Innenraum als eigenes Bild (`world/interior.js`):** Der Innenraum liegt
  weit östlich der Karte in derselben Szene – draußen laufen Horde, Türme und
  Nächte weiter. In die Haustür drücken: kurz abblenden, drinnen hinter der
  Tür weiter; drinnen durch die Türöffnung der Vorderwand wieder hinaus (Tür
  knarzt). Drinnen gilt der doppelte Maßstab (160 px/m), die Kamera zeigt
  möglichst den ganzen Raum, ringsum ist es dunkel. Puppenstuben-Schnitt:
  Rückwand in voller Höhe mit Fenstern (Himmel und Wipfel, tags hell, nachts
  dunkel), Seiten-, Trenn- und Vorderwände niedrig.
- **Licht drinnen:** Kamin und Pendelleuchte über dem Tisch sind zwei der fünf
  Punktlichter (fest im Innenraum, die Lichtzahl bleibt gleich); Herd,
  Nachttischlampe, Werkstattlampe und Laterne im Lager bekommen Lichtinseln.
  Die Sonne fällt durch die Fenster eines unsichtbaren Stellvertreters –
  Sonnenflecken wandern über den Boden. Drinnen ein eigener warmer Look.
- **Räume je Stufe:** Wohnraum mit Kamin, Kommode mit Radio, Tisch,
  Bettecke (Stufe 1); Küche mit Herd, Anrichte, Spülstein und Pumpe, Tisch
  mit Kürbissen (2) – einmal am Tag Suppe: volle Lebenspunkte, +25 bis zum
  Morgen; Schlafzimmer unterm Dach mit Doppelbett und Schrank (3) – das Bett
  zieht um, Gemütlichkeit +2; Werkstatt mit Werkbank, Werkzeugwand,
  Bretterstapel (4) – die Werkbank funktioniert auch drinnen; Lager mit
  Regalen, Fässern, Kisten (5) – eine verlorene Nacht kostet nur die Hälfte.
  Standfestigkeit 300 → 900.
- **Außen:** Das Haus ist geschlossen (das alte Innere samt Dach-Ausblenden ist
  entfernt), nachts leuchten die Fenster; ab Stufe 3 Dachfenster, ab 4
  Werkzeugbrett, ab 5 Kisten auf der Veranda. Neu: **Holzlager** (2 Holz am
  Tag, Reiter »Einrichten«).
- **Möbel** aus M6 im feinen Maß im Wohnraum; Knopfs Körbchen vor dem Kamin.
- **Drinnen im Spiel:** Klang hört an der Haustür mit, Knistern kommt vom
  Kamin; keine Randpfeile zu Schlurfern, bei Angriff aufs Haus blinkt unten
  das Haus; Bauleiste ohne Türme und ohne Aufstellen; Karte zeigt Mika am
  Haus; Aufwachen, Rettung und Ohnmacht enden drinnen am Bett.
- **Spielstand v10:** Figur darf im Innenraum stehen, Tag der letzten Suppe;
  Migration v9 → v10 setzt, wer im alten Haus stand, hinter die Tür.
- **Prüfung:** Haustür mit echten Tasten (hinein, Maßstab 160, hinaus),
  Schlafen im Innenraum, Laden drinnen, Migration v9 → v10, Stufen 3–5 mit
  Suppe, Werkbank drinnen, Bett im Schlafzimmer, Gemütlichkeit, Holzlager.

**Entscheidungen:** OFFENE-FRAGEN 94–98.

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
