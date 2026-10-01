# Zomfy Towers – Design-Dokument

> Gemütliche Herbst-Endzeit an einem nordischen See. Tagsüber ein Zuhause am
> Wasser, nachts Tower Defense an einem Netz aus Wegen, die vor dem Haus
> zusammenlaufen – mit Türmen daneben, Barrikaden darauf und der eigenen
> Figur als letzter Verteidigung. Ein 3D-Spiel im Browser, alles im Code
> erzeugt.

Dieses Dokument ist der Bauplan für alle Arbeitssitzungen. Es beschreibt,
**was** das Spiel sein soll und **in welcher Reihenfolge** es entsteht. Wie
der Code aufgebaut ist und welche technischen Regeln gelten, steht in
`CLAUDE.md`. Entscheidungen, die hier (noch) nicht stehen, sammelt
`OFFENE-FRAGEN.md`; den Arbeitsstand führt `PROGRESS.md`.

**Seit dem neuen Grundkonzept (nach Meilenstein 8) gelten die Grundregeln in
Abschnitt 0 verbindlich.** Sie ersetzen alle älteren, widersprüchlichen
Annahmen. Widerspricht bestehender Code oder eine bisherige Mechanik dieser
Struktur, wird sie angepasst – neue Ideen kommen nicht bloß daneben.

---

## 0. Verbindliche Grundregeln

1. **Die Karte:** Die Basis liegt an einem großen See, an einer rauen,
   nordischen Küste. Hinter der Basis ist Wasser – von dort kommen keine
   Zombies. Sie greifen nur von der Landseite an, **über klar erkennbare
   Wege**: Mehrere Zuführungen aus dem Wald verzweigen sich und laufen **kurz
   vor der Basis zu einem gemeinsamen letzten Abschnitt zusammen.** Das
   Wegenetz wird bei jedem neuen Spiel teilweise neu angelegt (leichter
   Roguelike-Charakter). Es gibt keine über die Karte verstreuten
   Angriffswege: Die Horde bleibt auf den Wegen. Wald, Felsen, Hänge und
   Gestrüpp begrenzen die Wege so natürlich, dass man versteht, warum die
   Horde genau dort läuft.
2. **Türme werden frei gebaut** – überall neben den Wegen, wo Platz ist, aber
   **nie auf einem Weg**. Sie greifen die Vorbeiziehenden von der Seite an:
   Spawn → Wege → mehrere Verteidigungsabschnitte → gemeinsamer letzter
   Abschnitt → letzte Verteidigung → Basis. Die Wege dürfen geschwungen sein
   (Reichweiten, Kreuzfeuer), aber nie so verwinkelt, dass man nicht sofort
   sieht, woher die Horde kommt und wohin sie will. Anfangs verteidigt man
   den Engpass vor dem Zuhause, später wächst die Verteidigung weit in die
   verzweigte Landschaft hinaus – im späten Spiel mit 50–60 Türmen und mehr.
3. **Barrikaden gehören auf die Wege.** Auf den Wegen stehen nur Hindernisse
   und Wegobjekte zur Verteidigung: Holzbarrieren (günstig, schnell zerstört),
   später Metallbarrieren, Metallkreuze und andere robustere Hindernisse. Die
   Horde bleibt daran hängen, greift an und reißt sie nieder, wenn die Türme
   nicht genug Schaden machen. Barrikaden haben Lebenspunkte und werden
   tagsüber geflickt oder neu gebaut. Sie sollen improvisiert wirken (Bretter,
   Stämme, alte Türen, Zäune, Blech) und die Horde stauen, damit die Türme an
   den Seiten Zeit bekommen.
4. **Letzte Verteidigung:** Wer Türme und Barrikaden überwindet, erreicht
   den Platz vor dem Haus. Dort verteidigt die Figur selbst. Die Basis hat
   eigene Lebenspunkte; fällt sie, ist die Nacht verloren. Drei Ebenen:
   **Türme neben den Wegen – Barrikaden auf den Wegen – persönliche
   Verteidigung an der Basis.** **Ab M17 mit Tor und Wall** (Wunsch des
   Auftraggebers, OFFENE-FRAGEN 120): Ein Wall umschließt Hof und Haus zur
   Landseite, der letzte Weg endet am Tor. Anfangs ist er brüchig, man rüstet
   ihn auf und flickt ihn jeden Tag. Durchs Tor gehen nur die Lebenden; die
   Horde muss Tor oder Wall einschlagen. Bricht sie durch, fällt sie das Lager
   an – dann beginnt der Kampf der Figur. Vier Ebenen: **Türme neben den
   Wegen – Barrikaden auf den Wegen – Tor und Wall ums Lager – die Figur im
   Lager.**
5. **Der Tag ist ruhig** – nur ganz vereinzelt taucht ein Schlurfer auf,
   nie Gruppen oder Wellen – und bildet den starken Kontrast zur Nacht:
   Barrikaden flicken und bauen, Türme setzen und verbessern, sammeln,
   Basis und Haus ausbauen, einrichten und dekorieren, Nebenaufträge, Leute
   treffen, handeln, die Nacht vorbereiten. Das Spiel ist nicht nur Tower
   Defense.
6. **Die Basis ist ein Zuhause,** keine Festung: ein kleines, altes
   Fischerhaus direkt am Wasser, das wächst – Wohnraum, Küche,
   Schlafzimmer, Werkstatt, Lager, Veranda, Garten, Gewächshaus, Holzlager,
   Anleger, Nebengebäude. Tagsüber ein gemütlicher Rückzugsort; nachts muss
   genau dieser Ort verteidigt werden. Ein Wall mit Tor schützt ihn (ab M17)
   und wächst mit – vom Weidenzaun zur Mauer –, aber dahinter bleibt es ein
   Zuhause mit Garten, Feuer und Wäscheleine.
7. **Balduin, der Händler, kommt nur über das Wasser.** Man sieht und hört
   sein Boot, bevor er am Steg festmacht; dann kann man mit ihm reden und
   handeln: Baumaterial, seltene Ressourcen, Bauteile für Türme, Upgrades,
   Werkzeuge, manchmal Besonderes oder ein Nebenauftrag.
8. **Zombie-Überreste** bleiben liegen (bis zu drei Tage, dann verrotten sie)
   und lassen sich einsammeln – am besten schon während oder direkt nach der
   Nacht, damit man morgens Handelsware hat. Balduin will sie aus einem nicht
   erklärten Grund haben und tauscht Material dafür. Warum er sie sammelt,
   bleibt vorerst offen – ein schwarzhumoriger Running Gag, der später Teil
   der Geschichte werden kann.
9. **Stimmung:** cozy, herbstlich, Spooky Season, leicht humorvoll,
   charmant, etwas melancholisch, gelegentlich gruselig, grundsätzlich warm
   und einladend. Grobe Richtung: Stardew-Valley-Gemütlichkeit mit etwas
   Anime und westlichem Comicstil – das beschreibt Stimmung, Figuren und
   Farbwelt, keine Pflicht zur Pixelgrafik.
10. **Tag-Nacht-Kontrast:** Tag ruhig, warm, gemütlich; Nacht angespannt und
    dunkel – aber dieselbe cozy Herbstwelt. Warme Fenster, Feuer, Laternen
    und Verteidigungsanlagen sind Lichtinseln in der kalten Nacht. Keine
    Horror-Ästhetik.
11. **Lesbarkeit der Karte – unveränderliche Grundregel.** Die Wege laufen im
    Bild hauptsächlich **von links nach rechts**: links die Landseite mit den
    Spawns, rechts die Basis an der Küste. Von rechts nach links:

    ```
    WASSER                                        rechter Rand
    BASIS / HAUS / STEG
    LETZTE VERTEIDIGUNG
    GEMEINSAMER LETZTER WEGABSCHNITT MIT BARRIKADEN
    TÜRME NEBEN DEN WEGEN
    VERZWEIGTE ZUFÜHRUNGEN MIT WEITEREN BARRIKADEN
    WALD / LANDSEITE / ZOMBIE-SPAWNS              linker Rand
    ```

    Die Wege sind immer klar zu erkennen. Türme dürfen sie nie blockieren,
    Barrikaden stehen bewusst darauf.
12. **Die Spielschleife:**
    - **Tag:** Schäden begutachten → Ressourcen verwalten → Barrikaden
      reparieren → Türme bauen oder verbessern → Haus und Basis ausbauen →
      Nebenaufträge → Balduin und andere treffen → handeln → die nächste
      Nacht vorbereiten.
    - **Nacht:** Welle startet → Zombies betreten die Wege → Türme greifen
      an → Barrikaden halten die Horde auf und werden beschädigt oder
      zerstört → Zombies erreichen vielleicht die Basis (ab M17: Tor und
      Wall; bricht die Horde durch, fällt sie das Lager an) → die Figur
      verteidigt selbst → die Welle endet.
    - **Morgen:** Die Folgen der Nacht sind zu sehen → Zombie-Überreste
      einsammeln → Schäden reparieren → ein neuer Tag beginnt.
13. **Zuflucht sein (ab M26, OFFENE-FRAGEN 161–176).** Menschen kommen in die
    Bucht; Mika nimmt sie auf oder bringt sie weiter – niemand wird
    weggeschickt. Bewohner sind keine kostenlosen Türme: Die Horde wird ohne
    sie balanciert, auf dem Posten helfen sie, ohne zu kämpfen. Zu den Waffen
    greifen sie erst, wenn Mika in der Not die Lagerglocke läutet, und nur
    dann kann jemand sterben (nie auf »Gemütlich«, Knopf nie). Wehmut ja,
    Schuld nein. Treffer bluten nicht, sie stäuben Sporen und Laub.

## 1. Vision

Nach dem Zusammenbruch ist die Welt still geworden. Am Ufer des **Kranichsees**,
eines großen, kalten Sees im Norden, steht ein altes Fischerhaus mit einem
wackligen Steg. Die Birken leuchten orange, zwischen den Tannen liegt Nebel,
und morgens ziehen Krähen über das Wasser. Es ist keine Welt voller
Schrecken, sondern eine, die sich langsam erholt – und in der man sich ein
Zuhause bauen kann.

**Der Tag** ist die ruhige Phase: Schäden flicken, Barrikaden neu aufbauen,
Türme verbessern, sammeln, das Haus ausbauen und einrichten, mit Überlebenden
reden, am Steg mit Balduin handeln. Höchstens ein einzelner Schlurfer
verirrt sich her – sonst nur Herbstwind und Arbeit.

**Die Nacht** ist Tower Defense an einem Netz aus Wegen: Die Horde kommt aus
dem Dämmerwohld über alte Holzfäller- und Wildpfade, die sich verzweigen und
kurz vor der Bucht zusammenlaufen. Türme neben den Wegen schießen,
Barrikaden auf den Wegen stauen die Horde und gehen zu Bruch. Was durchkommt,
erreicht den Hof vor dem Haus – dort kämpft die Figur selbst. Jede Nacht wird
die Horde stärker, und jedes neue Spiel legt die Wege ein Stück anders an.

**Der Kern des Gefühls** ist der Kontrast zwischen dem warmen Zuhause am
Wasser und der kalten Herbstnacht an den Wegen – und die ständige
Entscheidung, wohin das Material fließt: in Türme, Barrikaden, die eigene
Figur oder das Zuhause.

### Pitch in einem Satz

*Ein altes Fischerhaus am See wird Tag für Tag zum Zuhause – und jede Nacht
zeigt sich an den Wegen aus dem Wald, ob Türme und Barrikaden halten.*

### Mechanische Vorbilder (nur Mechanik, nie Look oder Inhalte)

- **Tower Defense mit festen Wegen:** Die Horde läuft Wege ab, Türme stehen
  frei daneben; Kurven ergeben Kreuzfeuer, Verzweigungen und der gemeinsame
  letzte Abschnitt gliedern die Verteidigung.
- **Leichter Roguelike-Charakter:** Jedes neue Spiel legt das Wegenetz ein
  Stück anders an.
- **Türme hochleveln und spezialisieren** wie in klassischen
  Warcraft-3-Custom-Maps. Was wir von diesen Karten sonst noch lernen – Held
  mit Fähigkeiten, Kombinieren, Bosse, Wagnis –, steht in Abschnitt 10.
- **Einsammeln wie in Vampire Survivors:** Beute fliegt im Sammelradius von
  selbst zur Figur.
- **Bauleiste wie in den alten Command-&-Conquer-Spielen:** Symbol und Preis,
  ausgegraut bis bezahlbar, dann leuchtet sie auf.
- **Tagesleben wie in einer Hofsimulation (Stardew Valley):** Zuhause
  ausbauen und einrichten, Leute treffen, handeln – nur Stimmung und
  Mechanik, nie Look, Figuren oder Inhalte.

## 2. Spielgefühl und Ton

**Säulen** – daran wird jedes Feature gemessen:

1. **Geborgenheit.** Das Zuhause am Wasser ist der wärmste, hellste Ort der
   Welt. Wer es betritt, soll aufatmen.
2. **Ruhige Tage, angespannte Nächte.** Tagsüber hat man Zeit und Ruhe.
   Nachts wird es eng, laut und spannend – aber es bleibt dieselbe Welt.
3. **Die Wege sind immer lesbar.** Man sieht jederzeit, woher die Horde
   kommt, wo sie langläuft und wo sie aufgehalten wird.
4. **Jede Entscheidung kostet Material.** Turm oder Barrikade, Figur oder
   Zuhause, jetzt ausgeben oder sparen.
5. **Sichtbarer Fortschritt.** Jeder Tag hinterlässt Spuren: ein neuer Turm,
   eine stärkere Barrikade, ein neuer Raum, ein Beet im Garten.
6. **Warmer, schrulliger Humor.** Schlurfer tragen Kochmützen und
   Warnwesten, Türme heißen Kürbiskatapult, und Balduin will partout nicht
   sagen, was er mit den Zombieteilen macht.
7. **Cozy Spooky Season, nicht düster, nicht blutig.** Kein Blut. Treffer
   blitzen hell auf, besiegte Schlurfer zerfallen zu Moos und Pilzen.
8. **Verlieren kostet Material, nie den Spielstand.** Eine verlorene Nacht
   bringt Schäden, zerbrochene Barrikaden und Materialverlust – und einen
   neuen Morgen.

**Tonfall der Texte:** freundlich, knapp, mit leisem Witz, gern ein wenig
melancholisch. Man duzt sich. Keine Anglizismen, wo es ein schönes deutsches
Wort gibt.

## 3. Look und Präsentation

### 3.1 Stil und Technik

- **Farbwelt Herbst:** Orange, Rot und Gold der Laubbäume, dunkles
  Tannengrün, graue Felsen, goldenes Gras, das kalte Blaugrau des Sees –
  und dagegen warmes Licht aus Fenstern, Kamin und Laternen.
- **Figuren** knuffig mit großem Kopf und ausdrucksstarken Gesichtern
  (etwas Anime), **Formen** mit klaren Silhouetten und kräftigen Umrissen
  (westlicher Comic). Seit N1 sind Figuren, Horde und Hund **geformt statt
  gestapelt**: runde Köpfe, gewölbte Rümpfe mit Schultern, Glieder mit Knie
  und Ellbogen, Mützen als Polster – im selben Voxelmaß, mit Licht auf den
  Kuppen und Schatten darunter.
- **Die Horde als Sprites (seit F2 Standard):** Schlurfer und Bosse sind
  Pixelfiguren, im Spiel aus runden Formen gebacken (1/40 m je Texel, also
  2 × 2 Bildpunkte, 5 Richtungen gezeichnet und 3 gespiegelt, 17 Bilder je
  Richtung). Müde statt gierig, jede Art mit einem Merkmal oben und eigenem
  Licht für die Nacht (`recherche/schlurfer-gestaltung.md`). Die Voxel-Horde
  bleibt als Wahl in den Einstellungen und als Rückfall, solange eine Art
  noch backt. Nachts glimmt um das Eigenlicht ein Hof aus einem Texel,
  Champions tragen einen goldenen Rand (F3).
- **Die Menschen als Sprites (F4, Standard 2D):** Mika, Hilde, Bert, Juna, Dr. Yusuf, Balduin
  und Knopf sind ebenso Pixelfiguren aus runden Formen – aufrecht, mit großem Kopf, in acht
  gezeichneten Richtungen (Mika trägt links die Laterne, rechts das Werkzeug). Das Gesicht liegt
  als kleiner Flicken je Ausdruck darüber (Blinzeln, Lächeln, »Aua«), das Werkzeug als eigenes
  Bild vor oder hinter der Figur. Seltene Posen (Rudern, Angeln, Kartentisch, Schaukel, Schießen,
  die Lagerglocke) und die übrigen Figuren bleiben vorerst Voxel; »Figuren: 3D« bringt alle
  zurück.
- **Technik:** echte 3D-Szene (three.js) aus Voxel-Modellen, alles im Code
  erzeugt – keine fremden Assets. Orthografische Dreiviertel-Kamera mit
  **Blick nach Norden**: der See am rechten Rand, die Landseite mit den
  Spawns links, die Wege dazwischen hauptsächlich von links nach rechts. Die
  Kamera folgt der Figur.
- **Der Pixel-Look ist kein Selbstzweck mehr.** Er bleibt als Stilmittel –
  niedrig gerendert und scharf hochskaliert, dunkle farbige Umrisse,
  begrenzte Palette mit Dithering, Kamera auf dem Pixelraster –, aber
  **Lesbarkeit und Stimmung gehen vor**: alle Modelle mindestens im feinen
  Maß (1/16 m), alles Gebaute, Bewohnte und Lebendige draußen seit M13g
  doppelt fein (1/32 m), und wo feinere Auflösung oder weichere Übergänge
  helfen, werden sie genutzt.
- Maße seit Meilenstein 5: 80 Spielpixel pro Meter, etwa 900 Bildzeilen
  (Full HD 1 : 1, 1440p ×2, 720p ×1). Ein 1/16-m-Voxel ist genau 5 px breit,
  3 px tief und 4 px hoch (Neigung 3 : 4). Die Größe bleibt so (Wunsch des
  Auftraggebers); mehr Einzelheiten kommen aus feineren Modellen, nicht aus
  einem größeren Maßstab: Seit M13g sind Figuren, Horde, Türme, Bauten,
  Haus, Hof, Quellen, Beute, Hund, Krähen und Balduins Boot aus 1/32-m-Voxeln
  (2,5 px breit, 1,5 px tief, 2 px hoch – die Kamera rastet auf ganze Pixel,
  das Muster aus 2 und 3 px liegt fest in der Welt). Die Natur bleibt wegen
  ihrer Menge bei 1/16 m. Z geht auf Wunsch nah heran (160 px/m wie drinnen,
  M13). Der Boden hat 1/16 m je Texel, darin eine Feinzeichnung im Maß 1/32
  (Halme, Blattspitzen, Körner). Die Oberfläche hat eine eigene,
  gröbere Leinwand (etwa 360 Zeilen), damit Schrift und Leisten kräftig
  bleiben.

### 3.2 Licht, Tageszeiten und Wetter

- **Morgen:** Nebel über dem Wasser, rosa-goldenes Licht. **Tag:** warmes
  Herbstlicht, kühle Schatten. **Abend:** goldenes Licht, lange Schatten,
  Lampen und Fackeln gehen an. **Nacht:** kaltes Blau, Mond über dem See –
  und warme Lichtinseln: Fenster, Kamin, Feuer, Laternen, Fackeln an den
  Wegen, Türme.
- **Wetter:** klare Tage, Nieselregen, Wind mit fallendem Laub,
  Nebelmorgen; kalte Nächte mit Atemwölkchen. Seit M12: Regen fällt als
  pixelige Striche über das Bild (drinnen hört man ihn nur aufs Dach
  trommeln), Nebelbänke ziehen gerastert über den See, Laub trudelt und
  bleibt kurz liegen, Wind biegt Gras und Schilf stärker. Das Wetter dämpft
  Sonne und Farben (Regen: grau-blau, Nebel: milchig) – Lichtinseln bleiben
  warm.
- Kühle Töne wirken nur auf Schatten und Mitten; Lichtquellen bleiben warm.
  Schatten sind farbig, nie schwarz.
- Lebenszeichen: Rauch aus dem Schornstein, Funken, Krähen, Wellen am Steg,
  Glühwürmchen im Spätsommerrest.

### 3.3 Modelle und Umgebung

- Kompakte, liebevoll detaillierte Voxel-Modelle, keine Anlehnung an bekannte
  Spiele, Figuren oder Marken. Die Horde erscheint seit F2 als gebackene
  Sprites (3.1); ihre Voxel-Modelle bleiben die Vorlage und der Rückfall.
- **Umgebung:** orange und rote Laubbäume, dunkle Tannen, Felsen und Hänge,
  Pilze, Kürbisse, Holzstapel, Schilf am Ufer, Treibholz, ein Bootssteg,
  Inseln im Nebel, Krähen auf Zaunpfählen.
- Eingebackene Umgebungsverdeckung und leichte Farbstreuung pro Voxel.

### 3.4 Kampf-Look

- Treffer: kurzes weißes Aufblitzen, winziger Rückstoß, ein, zwei Bilder
  Trefferstopp, Funken und Moosflocken. Kein Blut.
- Barrikaden splittern sichtbar: Bretter fliegen, Stufen fallen ab, am Ende
  bleiben Trümmer auf dem Platz.
- Schadenszahlen klein und kurz; lesbare Schüsse (Bolzen, Kürbisse im Bogen,
  Wasserfächer, Lichtkegel); leichtes Bildwackeln bei schweren Treffern.

### 3.5 Benutzeroberfläche

- Eigene Schrift mit Umlauten; warme, dunkle Pflaumentöne mit Holzrahmen und
  cremefarbener Schrift.
- **Oben links:** Tag, Uhrzeit, Tageszeit; darunter das aktuelle Ziel.
  **Oben rechts:** Vorrat, darunter der Nachtplan und die Meldungen (alle
  rechtsbündig, N4). **Oben Mitte (nachts):** Welle und
  Standfestigkeit des Zuhauses.
- **Unten links:** Laterne (Taste F) und Schnellleiste (8 Plätze).
  **Unten rechts:** Bauleiste, darüber das **Funk-Feld** (N4): Edda erklärt im
  Comic-Stil – ihr Foto, daneben eine Sprechblase, in die sich der Text tippt.
  Hinweise stehen nie mitten im Bild. Lebensbalken der Figur über der
  Schnellleiste.
- Beim Bauen zeigt ein Geistermodell auf dem Raster, ob es passt: Türme
  grün neben den Wegen, rot auf einem Weg; Barrikaden grün nur auf einem Weg.
- Gedanken der Figur sind Sprechblasen und halten das Spiel nie an;
  Dialoge mit Porträt, Schreibmaschinen-Effekt und Antworten.

### 3.6 Lesbarkeit

- **Man muss auf einen Blick erkennen, was was ist:** Figur, Schlurfer-Arten,
  Türme, Barrikaden und ihre Stufe, Loot, Rohstoffquellen, Bauten.
- **Die Wege sind immer eindeutig:** helle, festgetretene Pfade mit klaren
  Rändern (Steine, Wurzeln, Grasbüschel), nachts mit Fackeln und einem Hauch
  Eigenlicht – man sieht sofort, wo gebaut werden darf und wo die Horde
  läuft.
- Nachts bekommt alles, worum es im Kampf geht, einen Hauch Eigenlicht:
  Schlurfer, Türme, Barrikaden, Loot.
- Verdeckte Figuren scheinen als gerasterter Umriss durch; Randmarken
  zeigen Schlurfer auf den Wegen außerhalb des Bildes.
- Leitfrage für jeden neuen Inhalt: »Erkennt man, was was ist, und sieht
  man, wo die Horde langläuft?«

## 4. Welt und Geschichte

### 4.1 Hintergrund

Vor drei Herbsten – in einem nassen, warmen Herbst – ist im Waldboden der
**Moder** aufgeblüht: ein Pilzgeflecht, das unter dem Laub von Wald zu Wald
wuchs, schneller als jeder Pilz vorher. Wer im Wald schläft oder zu lange
bleibt, den spinnt er ein: Die Menschen werden schläfrig, grummelig und
nachtaktiv – **Schlurfer**: bemoost, mit Blümchen und Pilzen im Haar und
nicht mehr ganz beisammen. Tagsüber dösen sie im Wald, nachts treibt der
Moder sie los, dorthin, wo es warm und hell ist und Stimmen sind. Helles,
warmes Licht macht den Moder müde und die Schlurfer langsam (Laternen, das
Leuchtfeuer). Die Städte sind leer, das Netz ist still; wer übrig ist, lebt
verstreut an Seen und auf Inseln.

**Warum sie nur über die Wege kommen (M15):** Im Dämmerwohld ist der Boden
unter dem Laub ein einziges Modergeflecht – weich wie Moos, zäh wie Leim.
Wer abseits hineintritt, sinkt bis zu den Knien ein, Schlurfer genauso wie
Mika. Fest ist der Boden nur, wo nichts wächst: auf den alten
**Holzfällerwegen** (geschottert, damit die Laster durchkamen), auf
Wildwechseln und der gesperrten Straße nach Birkhagen. Man sieht es: Im
Unterholz liegen violette Matten und Fäden, blasse Moderpilze und
Hexenringe, die nachts glimmen. **Wasser** spült den Moder ab – die
Seeseite und die Inseln (Fels und Wind) sind frei; von dort kommt Balduin.

### 4.2 Der Ort

Eine kleine **Bucht am Kranichsee** (auf der Karte die Ellerbucht, im Alltag die alte
Holzlände, G1): ein altes Fischerhaus mit Steg und
Veranda, ein Hof mit Feuerstelle, ein verwilderter Garten. Früher war hier
die **alte Holzlände**: Die Holzfäller rollten ihre Stämme ins Wasser –
deshalb laufen alle Wege aus dem Wald genau hier zusammen. Landeinwärts
steigt der **Dämmerwohld** an – dicht, felsig, voller Hänge, der Boden voller
Moder. Nur ein paar alte **Holzfäller- und Wildpfade** führen hindurch; sie
verzweigen sich und laufen kurz vor der Bucht zusammen. Über sie kommt die
Horde. Auf dem See liegen Inseln im Nebel; von dort kommt nur Balduins Boot.
Seit N6 rudert Mika tagsüber mit dem eigenen Boot hinüber.

### 4.3 Hauptfigur

**Mika**, früher Hausmeister\*in in einem Wohnblock, kann fast alles
reparieren und redet gern mit sich selbst. Name, Figur (Frau oder Mann, N5) und
Aussehen sind auf dem Titelbild wählbar. Mika kommt mit einem kleinen
Ruderboot über den See in die Bucht, auf der Suche nach einem Zuhause (N5).

### 4.4 Roter Faden

Mikas Aufgabe, wie Edda sie bei der Ankunft über Funk erklärt (N5): **die Nächte
halten** (Türme neben die Wege, Barrikaden darauf, zur Not selbst am Hof),
**ein Zuhause bauen** und **Zuflucht sein** für alle, die noch unterwegs
sind. Aus dem alten Fischerhaus wird ein Zuhause, aus dem Zuhause ein
Zufluchtsort für andere Überlebende. Mit Juna wird der alte Mast am Steg, der **Lange Jakob**, wieder
zum **Leuchtfeuer** über dem See, das alle, die noch unterwegs sind, in die
Bucht führt und die Horde zurückdrängt. Und irgendwann stellt sich die Frage,
was Balduin eigentlich mit all den Zombieteilen macht. Danach geht das Spiel
als endlose Verteidigung mit immer stärkeren Nächten weiter.

### 4.5 Überlebende und Besucher

| Figur | Wer | Was sie mitbringt |
|---|---|---|
| **Knopf** | Struppiger Hund | Bellt, bevor eine Welle kommt; buddelt Kram aus |
| **Oma Hilde** | Ehemalige Postbotin | Neuigkeiten, Aufträge, Tauschhandel, Morgengaben |
| **Juna** | Jugendliche Funkbastlerin | Hauptgeschichte um das Leuchtfeuer, Technik |
| **Baumarkt-Bert** | Brummiger Ex-Verkäufer | Reparaturen, Barrikaden, nachts flickt er |
| **Dr. Yusuf** | Ehemaliger Tierarzt | Heilung, Kräutertee |
| **Balduin** | Händler mit Boot (zieht nie ein) | Kommt übers Wasser, legt am Steg an, tauscht Zombieteile gegen Material – und sagt nicht, wofür |
| **Edda** | Frühere Besitzerin der Holzlände, nur über Funk (N4) | Erklärt das Spiel unten rechts im Funk-Feld, deutet ihre Geschichte an; wo sie ist, bleibt offen bis zum Wiedersehen (M32, OFFENE-FRAGEN 180) |

Überlebende kommen tagsüber an – über die Wege, am Ufer entlang oder mit
Balduins Boot.

## 5. Tagesablauf

| Uhrzeit | Phase | Was passiert |
|---|---|---|
| 06:00–08:00 | **Morgen** | Aufwachen, Morgenbericht; die Folgen der Nacht sind zu sehen (Trümmer, Überreste auf den Wegen); einsammeln, reparieren; Balduins Boot legt an |
| 08:00–17:00 | **Tag** | Ruhig: bauen, reparieren, sammeln, Haus ausbauen, einrichten, Nebenaufträge, handeln – höchstens **vereinzelte Schlurfer**, nie Gruppen |
| 17:00–20:30 | **Abend** | Letzte Vorbereitungen; Lampen und Fackeln an den Wegen gehen an |
| 20:30–05:30 | **Nacht** | Die Horde kommt in Wellen über die Wege; Anführer in besonderen Nächten |
| danach | **Schlafen** | Im eigenen Bett: Tag endet, Spiel speichert, nächster Morgen |

- Ein voller Tag dauert etwa 9 Minuten Echtzeit (1 Spielminute = 0,4 s).
  Am Feuer, im Sessel oder auf der Bank kann man bis zum Abend bzw. bis kurz
  vor der Horde ausruhen – in die Nacht hinein wird nicht gewartet.
- Ein Spieltag zählt von 06:00 bis 06:00. Schlafen führt zum Morgen 06:30.
- Schlafen geht erst, wenn die Nacht des Tages vorbei ist. Ist die letzte
  Welle besiegt – oder bricht um 05:30 der Morgen an und die letzten
  Schlurfer fliehen in den Wald –, ist die Nacht gewonnen.
- Um 20:00 warnt eine Meldung vor der Horde; steht an den Wegen noch kein
  Turm, sagt Mika es vorher.
- In Dialogen und im Menü steht die Zeit still. Bauen geht jederzeit.

## 6. Systeme

### 6.1 Zeit, Tag-Nacht und Wetter

Eine zentrale Uhr (Tag + Minuten seit 06:00) treibt Licht, Lampen, Fackeln,
Nebel, Horde-Wellen, Balduins Boot und Tagesereignisse. Lichtwerte kommen aus
einer Schlüsselbild-Tabelle über 24 Stunden. Das Wetter wechselt von Tag zu
Tag (klar, Nieselregen, Wind, Nebel) und färbt Licht und Klang. Es folgt aus
dem Welt-Startwert und dem Tag (kein Platz im Spielstand); die ersten beiden
Tage sind klar. Die Uhr zeigt es neben dem Tag, der Morgen sagt es an. Seit
M18 wirkt es auch (OFFENE-FRAGEN 99, 130): Regen macht die Horde nass (Frost
beißt stärker, Feuer brennt schwächer), Nebel kürzt die Reichweite aller Türme
außer im Schein einer Laterne, Wind trägt Kürbisse und ihre Splitter weiter;
der Morgenbericht sagt, was die Nacht bringt.

### 6.2 Karte und Wege

Die Karte folgt Grundregel 11. Grober Grundriss (x nach Osten = rechts im
Bild, z nach Süden = unten im Bild; die Kamera blickt nach Norden):

```
  WALD / SPAWNS                      WEGE                      BUCHT       SEE
 ┌──────────────┐                                                        ~ ~ ~
 │ Spawn Nord ══╪══════╗                                                ~ ~ ~ ~
 │              │       ╚════╗   Türme frei                  HAUS  Steg═══ ~ ~
 │ Spawn Mitte ═╪═════╗       ╠══╗  neben den      ┌──── Hof ─┐  ▓▓▓        ~ ~
 │              │      ╚══╦═══╝  ╚═══════════════════▶ letzte  │  Veranda  ~ ~ ~
 │ Spawn Süd ═══╪════╗    ║        gemeinsamer      │ Verteid. │           ~ ~ ~
 │              │     ╚═══╝        letzter Abschnitt└──────────┘  Garten   ~ ~ ~
 └──────────────┘   (Barrikaden liegen auf den Wegen ══)                  ~ ~ ~
```

- **Rechts** liegt der Kranichsee. Am Ufer steht das Fischerhaus mit Steg, davor
  der **Hof** – die letzte Verteidigung.
- **Links** liegt die Landseite mit dem dichten Wald und mehreren **Spawns**
  am Kartenrand. Von dort führen **Zuführungen** (etwa drei) nach rechts; sie
  dürfen sich verzweigen und wieder treffen und laufen **kurz vor der Bucht
  zu einem gemeinsamen letzten Abschnitt** zusammen, der in den Hof mündet.
- **Prozedural:** Bei jedem neuen Spiel wird das Wegenetz aus einem eigenen
  Startwert teilweise neu angelegt (Lage der Spawns, Verlauf und
  Verzweigungen der Zuführungen); die Bucht mit Haus, Steg und Hof bleibt
  gleich. Der Startwert liegt im Spielstand, damit die Karte nach dem Laden
  dieselbe ist.
- **Größe:** Die Wege sind zusammen so lang, dass im späten Spiel 50–60 Türme
  und mehr sinnvoll daneben Platz finden. Anfangs reicht eine kompakte
  Verteidigung am gemeinsamen letzten Abschnitt; später wächst sie in die
  Verzweigungen hinaus.
- **Natürliche Grenzen:** Zwischen und neben den Wegen stehen Wald, Felsen
  und Hänge. Neben jedem Weg bleibt ein breiter, bebaubarer Streifen für
  Türme; dahinter wird der Wald dicht. Die Figur kann überall hin, wo kein
  Hindernis steht.
- **Die Horde läuft nur auf den Wegen** vom Spawn zum Hof. Barrikaden auf dem
  Weg sind Hindernisse, an denen sie hängen bleibt und die sie angreift; die
  Figur klettert langsam darüber (m12-r1). Die
  Figur zieht sie nur aus der Nähe vom Weg; danach kehren die Schlurfer genau
  dorthin zurück, wo sie ihn verlassen haben – nie hinter eine
  Barrikadenreihe (m12-r1).
- **Übersicht:** An jedem Spawn stehen Warnpfähle (nachts mit fahlgrüner
  Laterne); die Übersichtskarte (Taste M) zeigt das ganze Wegenetz mit
  Türmen, Barrikaden, Schlurfern, liegenden Überresten und Mika.
- **Offen (OFFENE-FRAGEN Nr. 66):** ob und wie Barrikaden die Horde auf einen
  anderen Zweig umlenken und ob die Wegvorschau beim Bauen bleibt. Bis das
  geklärt ist, wird davon nichts entfernt und nichts Neues entwickelt (Stand
  M9: Das Netz ist ein Baum, die Wegvorschau ist geblieben).

### 6.3 Sammeln

| Material | Quelle | Wofür |
|---|---|---|
| **Holz** | Laubbäume und Tannen am Waldrand (Axt), Äste, Treibholz am Ufer | Barrikaden, Werkbank, Zuhause |
| **Stein** | Felsen (Spitzhacke), Kiesel am Strand | Werkbank, Zuhause |
| **Fasern** | Schilf am Ufer, hohes Gras | Seile, Stoffe, Verbände |
| **Stoff** | Angespülte Netze und Planen, Balduin | Werkbank, Einrichtung |
| **Schrott** | Ein Bootswrack am Ufer (einmal), Schrotthaufen (alle zwei Tage), vor allem Balduin | Türme, Barrikaden ab Stufe 3 |

Quellen wachsen über die Tage nach. Seltene Funde (Baupläne, Samen,
Erinnerungsstücke) treiben Geschichte und Rezepte voran.

### 6.4 Vorrat und Rollen

Alles landet im **selben Vorrat** (oben rechts im HUD):

- **Zombieteile** sind die Überreste der Schlurfer. Man sammelt sie nachts
  oder am Morgen ein und tauscht sie bei **Balduin** gegen Material.
- **Schrott** ist die Hauptwährung für Türme und die schweren Barrikaden.
  Es gibt ihn vor allem bei Balduin, dazu aus Schrotthaufen und einmal aus
  dem Wrack.
- **Holz** ist das Material der Barrikaden und des Zuhauses.
- **Zahnräder** (von zähen Schlurfern, bei Balduin, selten beim Plündern)
  schalten starke Turmstufen und Barrikaden-Stufe 4 frei, **Moderkerne**
  (Anführer, selten bei Balduin) die höchsten Stufen.
- **Tagesmaterialien** gehen auch in Werkbank und Zuhause: Werkzeuge,
  Waffen, Möbel, Ausbau.

Der Rhythmus: **nachts Teile sammeln, morgens bei Balduin tauschen, tagsüber
bauen und flicken.** Die zentrale Spannung: Material in Türme, Barrikaden,
die Figur oder das Zuhause?

### 6.5 Zombie-Überreste einsammeln

- Stirbt ein Schlurfer – durch Turm, Barrikade oder Figur –, bleiben seine
  Überreste genau dort liegen: Zombieteile, manchmal ein Zahnrad, bei
  Anführern ein Moderkern. **Nicht jeder verliert Teile (M9.1):** Wer ihn
  selbst erschlägt, bekommt sicher welche; fällt er durch einen Turm, nur
  jedes zweite Mal. Der Anführer lässt immer Teile.
- Man sammelt sie, indem man in die Nähe läuft; im **Sammelradius** fliegen
  sie von selbst zur Figur. Am besten birgt man sie schon während oder direkt
  nach der Nacht – dann hat man morgens bei Balduin Handelsware. **Liegen
  gebliebene Überreste halten bis zu drei Tage,** dann verrotten sie zu Moos.
- Randmarken zeigen, wo außerhalb des Bildes noch etwas liegt. Der
  Sammelradius ist eine Aufwertung der Figur.

### 6.6 Bauleiste

- Unten rechts im HUD, Reiter **Verteidigung** (Türme und Barrikaden) ·
  **Figur** · **Zuhause** · **Einrichten**. `Tab` wechselt den Reiter.
  Jede Option zeigt Symbol und Preis, ausgegraut mit Füllbalken bis
  bezahlbar, dann leuchtet sie auf. Tastenkürzel **Q R T G C V**.
- **Turm bauen:** Turm wählen, auf dem Raster neben einem Weg platzieren
  (grün = passt, rot = geht nicht, z. B. auf einem Weg), Klick oder `E` setzt
  ihn. **Barrikade bauen:** wählen und auf ein Wegfeld setzen – nur dort
  passt sie.
- **Ausbauen und Reparieren:** Turm oder Barrikade anklicken (oder davor `E`):
  Die Leiste zeigt Stufen, Spezialisierungen, Reparatur und »Abreißen«
  (immer auf `V`, mit Rückfrage).
- **Zuhause:** Werkbank, Beete, Bänke, Laternen, Zelte und Deko stehen frei
  auf dem Raster (nie auf einem Weg); Ausbauten des
  Hauses und Nebengebäude haben feste Plätze.
- Bauen geht jederzeit; Reparieren nicht, solange nachts eine Welle läuft.
- **Baupläne (M19):** Am Anfang kennt Mika die vier Türme und die
  Holzbarriere. Nach jeder gewonnenen Nacht liegt ein Bauplan bereit: Nach
  dem Morgenbericht stehen drei zur Wahl (Karten wie bei den Perks, Taste
  1/2/3), einer kommt in die Bauleiste. Baupläne gibt es auch einmal im
  Wrack und an ungeraden Tagen ab Tag 3 bei Balduin (12 Zombieteile). Die
  Wahl hängt am Startwert der Karte – neu laden würfelt nicht neu.
- **Reiter mit Seiten (M19):** Mehr als fünf Türme – dann kommt »Türme 2«
  dazu; die erste Seite bleibt Q Bolzen, R Katapult, T Sprenger, G Laterne,
  C Barrikade. Fallen haben ihren eigenen Reiter »Fallen«. Tab geht alle
  Reiter durch.

### 6.7 Crafting (Werkbank)

Werkzeuge (Spitzhacke), Waffen und Möbel; Überschuss lässt sich zu Schrott
verwerten (ein Druck einmal, gehaltenes E weiter). Rezepte kommen mit Tagen,
Funden, Überlebenden, Balduin und dem Ausbau des Zuhauses. Später steht die
Werkbank in der Werkstatt.

### 6.8 Zuhause und Basis

- **Das Haus:** ein kleines, altes Fischerhaus am Wasser mit Steg. Es wächst
  in Stufen und Räumen: **Wohnraum mit Kamin → Küche → Schlafzimmer (auch
  als Dachboden) → Werkstatt → Lager**; draußen **Veranda, Garten,
  Gewächshaus, Holzlager, ein längerer Anleger** und Nebengebäude (Zelte,
  Schuppen für Überlebende). Jede Stufe gibt mehr **Standfestigkeit** (die
  Lebenspunkte der Basis) und schaltet Neues frei.
- **Drinnen ist ein eigenes Bild** (wie in Stardew Valley): Wer durch die
  Tür geht, sieht den Innenraum groß, warm und im feinen Maß – Kamin, Küche,
  Bett, Regale, Pflanzen, Knopfs Körbchen. Draußen läuft die Welt weiter.
  Umgesetzt in M11: Die Räume liegen nebeneinander, jede Stufe bringt einen
  (Küche: Suppe für die Nacht; Schlafzimmer: Gemütlichkeit +2; Werkstatt:
  Werkbank drinnen; Lager: eine verlorene Nacht kostet nur die Hälfte).
- **Einrichten und Dekorieren:** Möbel drinnen, Deko draußen (Kürbisse,
  Laternen, Blumenkästen, Wimpel). Gemütlichkeit bringt jeden Morgen
  Erfahrung, ab 5 ist Mika »ausgeschlafen« (bis Mittag schneller).
- **Größer und aus dem Katalog (N4):** Innen ist das Haus 6,75 m tief, jeder
  Raum anderthalbmal so breit wie in M11 (die Stube 9,7 m, Durchgänge 2 m).
  Möbel und Kleinkram bestellt Mika über das **Funkgerät in der Stube** aus
  **Balduins Katalog**: 24 Stücke auf fünf Seiten (je Raum, ab dessen
  Ausbaustufe), jedes mit großem Foto, bezahlt in Zombieteilen (6–24),
  höchstens vier unterwegs. Balduin bringt sie am nächsten Morgen, eine
  Lieferkarte zeigt jedes Stück groß (OFFENE-FRAGEN 181, 182).
- **Garten und Gewächshaus:** Beete geben täglich Fasern, später Kräuter
  und Kürbisse.
- Abreißen gibt Material zurück (Zuhause-Bauten ganz, Türme und Barrikaden
  zu 70 %).
- **Wall und Tor (M17):** Ein Wall schließt die Bucht zur Landseite ab, vom
  Ufer im Norden bis zum Ufer im Süden, auf einem Erdwall, damit man ihn aus
  der Nordsicht liest. Der letzte Weg endet am **Tor** (zwei rote Fahnen über
  den Pfosten, flach zur Kamera, zeigen es von Weitem); in dessen Mitte lässt
  eine Schlupftür nur die Lebenden durch – sie schwingt auf, sobald Mika
  davorsteht, eine Laufhilfe lenkt sie hinein. Vier Stufen:
  | Stufe | Wall je Meter | Tor | Ausbau (Tor; Wall je Meter) |
  |---|---|---|---|
  | Weidenzaun (Start) | 25 | 150 | – |
  | Palisade | 60 | 350 | 25 Holz, 6 Stein; 4 Holz |
  | Bohlenwand | 110 | 650 | 35 Holz, 20 Schrott, 2 Zahnräder; 4 Holz, 3 Schrott (fängt 10 % ab) |
  | Steinmauer | 170 | 1000 | 40 Stein, 30 Schrott, 1 Moderkern; 6 Stein, 2 Schrott (25 %) |
  Tagsüber nagen Streuner Tor und Wall höchstens bis drei Viertel an – man
  flickt jeden Tag ein wenig. Eingestürzt baut man sie tagsüber für die Hälfte
  wieder auf; abreißen kann man sie nicht.
- **Das Lager fällt an (M17):** Bricht die Horde durch, wirft sie um, was im
  Lager steht – Werkbank, Zelte, Beete, Lampen, Bänke, Holzlager haben dafür
  eigene Haltbarkeit. Umgeworfenes liegt als Haufen seiner Teile da und tut
  nichts mehr (keine Werkbank, kein Licht, keine Morgengabe aus dem Zelt), bis
  Mika es tagsüber für die Hälfte der Baukosten wieder aufstellt.

### 6.9 Türme

**Zustände und Reaktionen (M18):** Türme hinterlassen Zustände an den
Schlurfern, als kleine Zeichen über dem Kopf – nass (Sprenger), frostig
(Frostnebel), matschig (Schlammschleuder), geblendet (Laternenblitz, Schein von
Laterne, Laternenturm, Leuchtfeuer), brennend (Feuerkürbis, Kürbiswurf,
Pechkessel). Zwei passende treffen sich zu einer **Reaktion** mit eigenem
Effekt, Klang und einem Wort, das kurz aufpoppt:

| Reaktion | Zutaten | Wirkung |
|---|---|---|
| **Eisblock** | nass + frostig | eingefroren (2 s), der nächste Treffer zerspringt doppelt (»Klirr!«) |
| **Dampf** | nass + brennend | das Feuer erlischt, er und alle ringsum stehen 2,5 s verwirrt |
| **Glut** | brennend + matschig | der Brand dauert doppelt so lange und brennt anderthalbmal so heiß |
| **Schwachstelle** | geblendet + Bolzen | doppelter Bolzenschaden |
| **Splitter** | frostig + Streukürbis | Eissplitter treffen alle ringsum mit halbem Kürbisschaden |
| **Klebekürbis** | matschig + Kürbis | eine klebrige Fläche bremst 4 s lang um die Hälfte |

Jede entdeckte Reaktion kommt mit einer Notiz von Dr. Yusuf ins
**Notizbuch** (Pausenmenü): eine Zeile je Reaktion, darunter steht für die
gewählte, was geschieht, und Yusufs Notiz; unentdeckte stehen dort als »???«
mit einem Hinweis. Werte in `data/reactions.js`.

**Familien aus den Bauplänen (M19),** je fünf Stufen und zwei Richtungen,
geformt wie die Figuren:

| Familie | Aussehen | Wirkung | A | B |
|---|---|---|---|---|
| **Glockenturm** | Glockenstuhl mit rotem Giebeldach, die Glocke schwingt | ein Schlag alle paar Sekunden: kleiner Schaden, alle ringsum kurz betäubt, ein Ring am Boden | **Sturmglocke:** härter, weiter, länger betäubt | **Friedensglocke:** silbern mit Kranz – jeder Schlag flickt Barrikaden, Tor und Wall im Umkreis |
| **Windrad** | hoher Mast, Gondel, vier Flügel zur Kamera | Windstöße schieben die Horde den Weg zurück (gegen das Flussfeld), Türme daneben sehen durch Nebel | **Sturm:** weiter und stärker, blaue Segel | **Mühle:** mahlt über Tag Schrott (3/5/8 je Stufe), morgens im Vorrat |
| **Bienenkorb** | Strohkorb auf einem Bänkchen | ein Schwarm (kleine gelbe Punkte) folgt einem Ziel und sticht – Schaden je Sekunde, durch jede Panzerung | **Königin:** zwei, dann drei Schwärme | **Honig:** ein starker Schwarm, Honig bremst |
| **Vogelscheuche** | Stroh, Hemd, Querholz, Kürbiskopf mit Hut (glimmt nachts) | lockt Schlurfer vom Weg auf sich (2–6 zugleich, je 5–7 s); sie schlagen auf sie ein, bis sie umfällt – dann flicken | **Strohmann:** dick ausgestopft, hält viel aus | **Krähenscheuche:** Krähen picken nach den Gelockten |

Gelockte kehren danach an ihre Stelle auf dem Weg zurück (wie Jäger, m12-r1)
und lassen sich ein paar Sekunden nicht wieder locken.

Türme stehen **frei neben den Wegen** (nie darauf) und arbeiten autonom.
Vier Rollen, jede
mit fünf Stufen. Stufe 1–2 sind allgemein, auf **Stufe 3 spezialisiert** man
in eine von zwei Richtungen; Stufe 4 und 5 bauen sie aus.

| Turm | Rolle | Spezialisierung A | Spezialisierung B |
|---|---|---|---|
| **Bolzenwerfer** | Schaden gegen einzelne starke Gegner | **Scharfschütze** – große Reichweite, durchschlägt Panzer, zielt auf den Stärksten | **Repetierer** – sehr schnell, zwei Ziele |
| **Kürbiskatapult** | Flächenschaden gegen Gruppen | **Feuerkürbis** – brennender Boden | **Streukürbis** – zerplatzt in drei Ladungen |
| **Rasensprenger** | Verlangsamen und Kontrolle | **Frostnebel** – starke Verlangsamung, kurzes Einfrieren | **Schlammschleuder** – Rückstoß, hält Zähe auf |
| **Laternenturm** | Unterstützung benachbarter Türme | **Leuchtfeuer** – stärkere Schadens-Aura, Licht bremst die Horde | **Glückslaterne** – mehr Beute im Licht |

- Bau und Stufe 2 kosten Schrott, Stufe 3–4 zusätzlich Zahnräder, Stufe 5
  einen Moderkern; Balduin verkauft manchmal besondere Turmteile.
- **Besondere Turmteile (M10):** ein Teil je Turm, eingebaut über die
  Turm-Auswahl (eigene Kachel), sichtbar am Modell, beim Abreißen zurück in
  den Vorrat. **Fernrohr** – Reichweite +25 %; **Schmierfett** – schießt
  bzw. sprüht 25 % schneller, beim Laternenturm wirkt die Aura 25 % stärker;
  **Glücksmünze** – jeder Abschuss dieses Turms lässt sicher Zombieteile
  fallen (statt jedes zweite Mal). Werte in `data/towers.js`.
- Am stärksten wirken Türme dort, wo Barrikaden die Horde aufhalten:
  **Barrikade plus Kreuzfeuer** ist das Herz jeder Verteidigung.
- **Türme mit Geschichte (M16):** Jeder Turm bekommt beim ersten Blick einen
  Namen (»Gertrud, Kürbiskatapult«) und sammelt Erfahrung – einen Punkt je
  Schadenspunkt, 6 je Abschuss, der Laternenturm 4 für jeden Abschuss in
  seinem Licht (Brand zählt für den Turm, der ihn gelegt hat). Ränge I–IV
  bei 0/150/500/1200 Erfahrung, je Rang ein Wimpel mehr an einem kleinen
  Mast (rot, blau, gold) und +8/16/25 % Schaden bzw. Aura. Die Auswahl zeigt
  »Rang II · 23 erledigt · 352/500«; der Morgenbericht kürt den Turm der
  Nacht (meiste Abschüsse).

### 6.10 Barrikaden und Wegobjekte

Auf den Wegen stehen nur Hindernisse, die die Horde stauen. Sie werden **frei
auf Wegfeldern** gebaut (je ein Feld von 1 m); wer einen Weg ganz sperren
will, setzt mehrere nebeneinander. Die Horde bleibt davor hängen, schlägt
darauf ein und reißt sie nieder, wenn die Türme nicht genug Schaden machen.

| Hindernis | Aussehen | Material | Haltbarkeit | Besonderes |
|---|---|---|---|---|
| **Holzbarriere** | Spanischer Reiter: dunkler Balken quer über den Weg, ein Kreuz aus hellen, angespitzten Pfählen, rot-weißer Warnlappen | 1 Holz | gering (20) | billig, schnell gebaut, schnell zerstört – bremst, damit die Türme Zeit haben |
| **Verstärkte Holzbarriere** | dazu Eisenbänder, eiserne Spitzen, ein zweites Kreuz, unterer Riegel | +2 Holz | mittel (55) | Ausbau der Holzbarriere |
| **Metallkreuz** | Stahligel aus rostigen Trägern über Kreuz | +1 Holz, 4 Schrott | hoch (140) | fängt ein Viertel jedes Schlags ab |
| **Weitere Hindernisse** | Wall und Tor des Lagers (6.8) | – | – | M17 |

- **Lesbarkeit (M9.1):** Barrikaden sind im feinen Maß (1/16 m) gebaut. Die
  Kreuze stehen längs zum Weg – auf den meist west-östlichen Wegen zeigen sie
  genau zur Kamera, in einer Reihe ergibt das eine Kette aus Kreuzen. Helles
  Holz und heller Stahl heben sich vom braunen Weg ab.

- Brummer und Anführer schlagen besonders hart zu.
- Schaden ist sichtbar (lockere Bretter, verbogenes Blech); eine zerstörte
  Barrikade hinterlässt **Trümmer** auf dem Feld.
- **Tagsüber** flickt man beschädigte Barrikaden (anteilig) oder baut
  zerstörte wieder auf. Während einer Welle geht beides nicht.
- Barrikaden sind günstig und Verschleißteile – ein eigener Kreislauf aus
  Bauen, Halten, Brechen und Wiederaufbauen.
- **Zubehör (M17):** Jede Barrikade trägt so viele Teile, wie ihre Stufe
  zählt (Holz 1, verstärkt 2, Metall 3), das Tor drei. Zubehör bleibt, wenn
  sie zerbricht, und wirkt wieder, sobald sie steht:
  | Zubehör | Kosten | Wirkung |
  |---|---|---|
  | **Dornen** | 2 Holz, 2 Schrott | Eisendornen mit Draht: jeder Schlag darauf kostet den Schlurfer 4 Leben (durch jede Panzerung) |
  | **Laterne** | 2 Schrott, 1 Stoff | blendet: im Schein (2,4 m) laufen und schlagen Schlurfer um 30 % langsamer; eine Lichtinsel |
  | **Pechkessel** (nur Barrikade) | 2 Holz, 3 Schrott | kippt beim ersten Schlag der Nacht: alles im Umkreis brennt 4 s lang; bis zur nächsten Nacht füllt er sich wieder |
  | **Alarmglocke** (nur Tor) | 4 Schrott, 1 Zahnrad | läutet beim ersten Schlag der Nacht: Banner, Knopf bellt, und wohnt Bert im Lager, flickt er das Tor um ein Fünftel |
- **Fallen (M19, aus Bauplänen):** stehen wie Barrikaden nur auf Wegfeldern
  (eine je Feld), sind aber **begehbar** – sie sperren das Flussfeld nie, die
  Horde läuft darüber. Sie nutzen sich ab und werden tagsüber für die Hälfte
  der Baukosten neu gerichtet:
  | Falle | Aussehen | Kosten | Wirkung |
  |---|---|---|---|
  | **Stachelbrett** | zwei Bretter voller Nägel | 2 Holz, 2 Schrott | jeder Tritt 12 Schaden (durch jede Panzerung), nutzt sich ab |
  | **Leimtopf** | Tontopf in goldener Lache | 1 Holz, 1 Schrott, 2 Fasern | klebt: 60 % langsamer, noch 1,5 s danach |
  | **Klettenteppich** | Matte voller Kletten | 1 Holz, 4 Fasern | Kletten hängen 5 s und bremsen um 30 % |
  | **Knallerbsen** | Kistchen, rot-weiße Papierkugeln | 1 Holz, 3 Schrott | knallen einmal: 22 Schaden ringsum, 1,2 s betäubt |
  | **Ölspur** | schwarz glänzende Lache mit Kanne | 1 Holz, 2 Schrott | rutschig; mit Feuer (Brennender, Feuerkürbis) eine Flammenwand, danach verbraucht |

### 6.11 Die Horde

| Schlurfer | Eigenschaft | Wirkt gut dagegen |
|---|---|---|
| **Schlurfer** | Standard, langsam | alles |
| **Flitzer** | schnell, wenig Leben | Rasensprenger, Repetierer |
| **Schwärmer** | kleine, kommen in Pulks, krabbeln | Kürbiskatapult |
| **Brummer** | groß, gepanzert, zerlegt Barrikaden | Scharfschütze, Schlammschleuder |
| **Leuchtpilz** | heilt und beschleunigt Nachbarn | Bolzenwerfer (Fokus) |
| **Anführer** | Boss in besonderen Nächten, ruft Nachschub | alles zusammen, plus Nahkampf |

- Alle kommen **von den Spawns am linken Kartenrand über die Wege**, in
  mehreren Wellen je Nacht, oft über verschiedene Zuführungen; die
  Nachtleiste zeigt Welle und Anzahl, Knopf bellt vorher.
- **Jede Nacht wird stärker:** mehr Schlurfer, mehr Leben, nach und nach neue
  Arten; jede fünfte Nacht ist eine **Anführernacht**. Ohne Ausbau hält man
  irgendwann nicht mehr mit.
- **Tagsüber** verirrt sich nur ganz vereinzelt ein träger Schlurfer auf die
  Wege – keine Gruppen, keine Wellen. Die Welt ist nie ganz zombiefrei, aber
  der Tag gehört der Ruhe.

### 6.12 Letzte Verteidigung, verlorene Nacht, Morgen

- Wer alle Barrikaden überwindet, steht vor dem Tor (ab M17) und schlägt es
  ein; die Glocke und eine Randmarke rufen Mika dorthin. Fällt es, strömt die
  Horde ins Lager, wirft um, was dort steht, und schlägt dann auf das Haus
  ein. Mika wehrt ab, was durchkommt – Türme am Tor und im Hof helfen.
- Sinkt die Standfestigkeit auf null, ist die Nacht verloren: Mika
  verschanzt sich drinnen, die Nacht endet. Geht Mika nachts zu Boden,
  rettet sie sich ins Haus und kommt mit 40 % Leben wieder.
- Folgen einer verlorenen Nacht: ein Teil des Vorrats ist weg, Türme verlieren
  Haltbarkeit (nie unter ein Drittel), das Zuhause wird notdürftig geflickt.
  **Nie Spielende, nie Verlust des Spielstands.**
- **Morgen:** Der Morgenbericht zeigt Abschüsse, Eingesammeltes, zerstörte
  Barrikaden, Schäden und Verluste. Draußen sieht man die Folgen: Trümmer
  und Überreste auf den Wegen. Einsammeln,
  reparieren, neuer Tag.
- **Reparieren:** Barrikaden und Türme einzeln über die Auswahl, das Zuhause
  über die Bauleiste (Holz und Schrott, anteilig, wenn der Vorrat nicht
  reicht).

### 6.13 Nahkampf und eigene Figur

- Die Figur ist die **letzte Verteidigung** am Hof – und kann an den Wegen
  aushelfen, wo eine Barrikade wankt.
- **Angriff** mit der linken Maustaste in Richtung des Mauszeigers; gedrückt
  halten schlägt weiter. Mika schlägt mit dem, was gerade in der Hand liegt
  (Waffe, Axt, Spitzhacke, sonst Fäuste); knapp außer Reichweite folgt ein
  **Ausfallschritt**.
- **Auf dem Rücken (N4):** Werkzeug und Waffe hängen schräg auf dem Rücken und
  kommen erst beim Schlagen, Fällen oder Abbauen in die Hand; 2,6 s danach
  steckt Mika sie wieder weg, außer ein Schlurfer ist näher als 5 m. Die
  Laterne brennt nur nach F und geht am hellen Morgen (07:30) aus
  (OFFENE-FRAGEN 183).
- **Ausweichen** mit der Leertaste: kurze Rolle, dabei unverwundbar.
- **Waffen** an der Werkbank, zweimal aufwertbar (Reiter »Figur«):

| Waffe | Gefühl | Schaden | Tempo | Reichweite | Besonderes |
|---|---|---|---|---|---|
| Fäuste | Notbehelf | 6 | 2,6/s | 1,25 m | – |
| Axt | Werkzeug, solide | 12 | 2,2/s | 1,55 m | trifft bis zu 3 |
| Schaufel | ausgewogen | 16 | 1,9/s | 1,7 m | guter Rückstoß |
| Bratpfanne | langsam, wuchtig | 30 | 1,0/s | 1,45 m | betäubt 0,9 s |
| Rechen | große Reichweite | 10 | 1,4/s | 2,3 m | trifft bis zu 5 |
| Fäustlinge | schnelle Schlagfolge | 7 | 3,6/s | 1,25 m | jeder 3. Treffer doppelt |

- **Erfahrung und Perks:** Besiegte Schlurfer geben Erfahrung (im Nahkampf
  doppelt); jede Stufe bringt eine Wahl aus drei Perks, sobald es ruhig ist.
- **Fähigkeiten (M16):** zwei Plätze mit Abklingzeit – rechte Maustaste und X
  (oder ein Klick auf die Kacheln rechts neben der Schnellleiste, dort
  zeigt ein Uhrzeiger-Raster die Wartezeit). Den **Laternenblitz** hat Mika
  von Anfang an (lähmt ringsum 1,1 s, danach halb so schnell, 16 s). Auf
  Stufe 3 wählt sie zusätzlich zum Perk eine zweite aus drei Karten:
  **Kürbiswurf** (an den Zeiger, Fläche, brennt, 12 s), **Pfiff** (Knopf
  rennt hin und bellt, wer dort steht, starrt ihn 4 s an; erst wenn Knopf
  eingezogen ist, 22 s), **Notbrett** (flickt eine Barrikade in Reichweite
  um gut die Hälfte, 18 s), **Anfeuern** (Türme im Umkreis von 6 m schießen
  7 s lang 40 % schneller, 24 s), **Wirbel** (Rundumschlag mit der Waffe in
  der Hand, stößt weit zurück, 10 s). Auf Stufe 6 und 9 schärft sie eine der
  beiden (−18 % Abklingzeit, +25 % Wirkung je Rang). Drinnen ruhen sie; was
  kein Ziel findet, kostet nichts. Werte in `data/skills.js`.
- **Nahkampf mit Risiko (M16):** Wer einmal ausholt, beißt zu – ein Rückstoß
  aus der Reichweite bricht das nicht mehr ab (m12-r1: wer im Takt klickte,
  wurde nie getroffen). Nur Betäuben, Blenden, Einfrieren und Ablenken
  stoppen ein Ausholen; der Biss reicht 0,45 m über die Reichweite hinaus.
- **Aufwertungen der Figur:** Sammelradius, Lebenskraft, Schlagkraft, Tempo.

### 6.14 Überlebende und Geschichte

- **Ankunft:** Ab Tag 2 kommt nach und nach jemand an (Knopf, Hilde, Juna,
  Bert, Dr. Yusuf) – tagsüber, über die Wege, am Ufer oder mit
  Balduins Boot. Wer neu ist, winkt.
- **Kennenlernen → Gast → Einzug:** Ansprechen mit E; ein Schlafplatz (Zelt,
  später ein Zimmer oder Nebengebäude) macht aus dem Gast einen Bewohner.
- **Aufträge und Nebenaufträge:** Jeder bittet um etwas (Hilde: Fasern für
  einen Schal, Bert: Licht am Schlafplatz, Yusuf: Kamille, Juna: das
  Leuchtfeuer); Balduin bringt gelegentlich eigene.
- **Fähigkeiten:** Knopf bellt kurz vor jeder Welle und buddelt morgens
  etwas aus; Hilde tauscht und bringt Morgengaben; Juna hört die Horde am
  Funk (was heute Nacht kommt: Arten, Anführer – keine feste Richtung); Bert
  flickt billiger und nachts Barrikaden
  und Türme; Dr. Yusuf kocht Tee und verarztet Mika einmal je Nacht.
- **Roter Faden – das Leuchtfeuer:** Mit Juna in drei Stufen am Langen Jakob
  auf dem Steg: Leiter und Plattform, Antenne mit Kabeln, Leuchtfeuer
  (braucht einen Moderkern). Das Leuchtfeuer brennt jede Nacht über dem See
  und bremst Schlurfer in seinem Schein.
- **Ab M27 (Plan »Zuflucht sein«, Abschnitt 8):** Wanderer mit Gästeplatz und
  der Entscheidung am Morgen, bis zu acht Plätze, Kartenabende, Bindung,
  Waffenschrank und Übungsplatz, die Lagerglocke und das Netzwerk der sicheren
  Orte (OFFENE-FRAGEN 161–175).

### 6.15 Balduin und der Handel

- **Ankunft übers Wasser:** Ab dem Morgen nach der ersten Nacht kommt
  Balduin jeden Vormittag. Erst hört man sein Bootshorn über den See, dann
  sieht man das Boot zwischen den Inseln auftauchen; es tuckert heran und
  legt am Steg an, Balduin wirft die Leine über den Poller. Dazu spielt eine
  kurze, epische Fanfare (Schiffshorn, Pauken, Blechbläser), deren
  Schlussakkord aufs Anlegen fällt (M9.1). **Nach dem Handel verabschiedet er
  sich** (Sprechblase, Winken) und legt gleich ab; ohne Handel wartet er bis
  Mittag. Wer ihn verpasst, handelt am nächsten Morgen.
- **Aussehen:** ein fröhlicher, bärtiger Seebär mit Schiebermütze, rotem
  Schal, dunklem Mantel und einem riesigen Rucksack; sein Boot ist
  vollgestapelt mit Kisten, Fässern und Einmachgläsern mit trüber grüner
  Brühe.
- **Handel** im Fenster der Werkbank (»Balduins Boot«): Zombieteile gegen
  Schrott (immer), dazu täglich wechselnde Angebote – Holz, Stein, Fasern,
  Stoff, Zahnräder, manchmal ein Moderkern, **besondere Turmteile**,
  **Upgrades und Werkzeuge**, später Saatgut; Möbel über seinen Katalog
  (N4, 6.8). Manches nur in
  kleiner Menge am Tag. Gelegentlich bringt er einen Nebenauftrag mit.
  Turmteile (6.9) gibt es an geraden Tagen ab Tag 4, eines am Tag, reihum:
  Glücksmünze (10 Teile), Fernrohr, Schmierfett (je 12 Teile).
- **Gesten (M10):** Beim Ankommen lüftet er die Mütze, beim Warten reibt er
  die Hände oder krault den Bart; nach dem Handel Daumen hoch und Winken,
  ohne Handel ein Schulterzucken.
- **Running Gag:** Balduin ist erstaunlich scharf auf die Teile und weicht
  jeder Frage aus (»Frag nicht. Wissenschaft! Oder Kunst. Oder Suppe – nein,
  keine Suppe.«). Jeden Tag ein anderer Spruch.

### 6.16 Dialoge

Dialoge sind Daten (Zeilen mit Sprecher, Text, Antworten und Folgen) und
können vom Spielzustand abhängen. Rückfragen haben immer eine harmlose
Vorwahl.

### 6.17 Speichern

- Der Spielstand liegt im Browser (`localStorage`), versioniert, mit
  Migrationen. **Alte Stände laden immer:** Beim Umzug an die Küste bleiben
  Fortschritt, Vorrat, Figur, Überlebende und Möbel erhalten; Bauten der
  alten Lichtung werden erstattet oder, wo möglich, neu gesetzt.
- **Schlafen im eigenen Bett beendet den Tag und speichert.** Zusätzlich
  sichert das Spiel still beim Verlassen der Seite.
- Beschädigte Stände werden erkannt und beiseitegelegt.

### 6.18 Balance-Ziele

- Nacht 1 fordert schon: Wer nur zwei Türme stellt und zusieht, verliert
  sie; mit drei Türmen, einer Barrikade vor dem Hof und Mitkämpfen hält das
  Zuhause.
- Ab Nacht 3 braucht man eine gute Barrikade in jedem Abschnitt, ab Nacht 4
  Spezialisierungen, ab Nacht 6 eine gezielte Mischung.
- Jede Nacht bringt so viele Zombieteile, dass man sich morgens bei Balduin
  mindestens eine spürbare Verbesserung ertauschen **und** die Barrikaden
  flicken kann – aber nie alles.
- Ohne Ausbau kippt es spätestens um Nacht 5.

### 6.19 Klang

Alle Klänge werden im Browser erzeugt (Web Audio), es gibt keine Tondateien;
der Klang startet mit der ersten Eingabe.

- **Effekte:** Schritte, Hacken, Stein, Rupfen, Durchsuchen, Schwung,
  Treffer, Ausweichrolle, Türme, Barrikaden (Holz splittert, Schläge auf
  Bretter), Einsammeln, Bauen, Aufwerten, Wellenhorn, Schlurfer-Brummeln,
  Knopfs Bellen, **Balduins Bootshorn und Motor**, Tippen im Dialog.
- **Umgebung:** Wind (an windigen Tagen stärker), Wellen am Steg, Krähen
  (krächzen, wenn sie auffliegen), Regen (drinnen dumpf aufs Dach), Knistern
  am Kamin.
- **Musik (M10d):** ein eigener Soundtrack aus dem Klang-Baukasten, die
  Stücke als Noten-Daten. Tagsüber »Morgen am See« (F-Dur, langsam: E-Piano,
  gezupfte Gitarre, Flöte und Spieluhr, Besen), auch auf dem Titelbild;
  abends »Laternenzeit« (d-Moll, noch ruhiger, mit Streicherfläche); nachts
  nur während der Wellen »Die Horde kommt« (d-Moll, 126 Schläge pro Minute),
  das in drei Stufen dichter wird, je näher die Horde dem Haus und Mika
  kommt. Zwischen den ruhigen Stücken bleibt Stille für Wind, Vögel und
  Wellen. Balduins Ankunftsfanfare (M9.1) duckt die Musik.
- **Titelmusik (N2):** »Herbstlied am Kranichsee« (G-Dur, 72 Schläge pro Minute:
  Spieluhr und Flöte im Wechsel über E-Piano, Gitarre und weichem Bass, im
  Mittelteil Streicher) läuft auf dem Titelbild in Schleife und macht beim
  Losspielen gleich Platz. Davor, auf dem Startbild, die **Spieluhr von Tales
  of Cue:** G–H–D–G aufwärts, ein warmer Akkord, ein Glitzern.

### 6.20 Titelbild und Einstellungen

- **Startbild (N2, Wunsch des Auftraggebers):** Beim Start zuerst »Tales of
  Cue präsentiert« in großer Pixelschrift über einem offenen Buch, auf dem
  eine Laterne warm leuchtet; Laub fällt. Weil der Browser Klang erst nach
  einer Eingabe erlaubt, steht darunter »Taste drücken« – dann spielt die
  Spieluhr, Funken steigen auf, ein Glanz läuft über den Schriftzug, und das
  Titelbild blendet mit seiner Musik ein. Ein zweiter Druck springt gleich
  weiter. Prüfung und `?test`/`?nointro`/`?notitle` überspringen es.
- **Titelbild:** großer Schriftzug über der Bucht im Abendlicht.
  Weiterspielen, Neues Spiel, Einstellungen, Steuerung. »Neues Spiel« führt zur
  Figurseite: Name, Figur (Frau oder Mann), Aussehen, Schwierigkeit und
  Einführung (mit Edda oder ohne). Was die gewählte Zeile bedeutet, steht in
  einem Kasten mit Zipfel direkt daneben; die Tasten stehen im Fenster (N5).
- **Die Ankunft (N5):** Ein neues Spiel beginnt mit einer kurzen Szene –
  Titelkarte mit Mikas Gedanken, Ruderboot im Morgennebel, Steg, Eddas
  Funkgerät – danach meldet sich Edda. Esc halten überspringt die Szene.
- **Einstellungen:** Lautstärke, Musik, Geräusche, Ansicht (nah/weit, M13),
  Pixelgröße, Textgeschwindigkeit – neben dem Spielstand gespeichert.

## 7. Steuerung

| Taste | Aktion |
|---|---|
| W A S D / Pfeiltasten | Laufen |
| Umschalt | Rennen |
| Linke Maustaste | Angreifen · auf dem Raster: bauen · Turm oder Barrikade anklicken: auswählen |
| Rechte Maustaste / Esc | Bauen abbrechen, Auswahl aufheben |
| Leertaste | Ausweichen |
| E / Enter | Benutzen, Dialog weiter; gedrückt halten: weiter sammeln |
| 1–8 / Mausrad | Schnellleiste |
| Q R T G C V | Bauleisten-Optionen |
| Tab | Reiter der Bauleiste wechseln |
| F | Laterne an/aus |
| M | Karte der Wege |
| Z | Ansicht nah / weit (M13; auf deutschen Tastaturen dieselbe Taste) |
| Esc | Menü |
| F3 | Entwickler-Anzeige |

## 8. Meilensteinplan

Jeder Meilenstein ergibt eine in sich spielbare Version. Nach jedem
Meilenstein folgen Prüfablauf und Commit; seit dem 28.09.2026 testet der
Auftraggeber selbst, Testspieler-Agenten gibt es nicht mehr (siehe
`CLAUDE.md`).

### Erledigt: Meilenstein 1–8 (auf der Waldlichtung)

- **M1 Fundament und Look ✓:** Pixel-Render-Pipeline, Figur, Tag-Nacht mit
  warmen Lichtern, Dialoge, Speichern durch Schlafen, Prüfskript.
- **M2 Sammeln, Crafting, Bauen ✓:** Quellen, Werkzeuge, Werkbank,
  Bauleiste, Raster, Hüttenausbau.
- **M3 Nächte, Türme, Loot ✓:** Wellen, vier Türme mit Stufen und
  Spezialisierungen, Schlurfer-Arten, Loot, Morgenbericht, Reparieren.
- **M4 Nahkampf, Waffen, Perks ✓.**
- **M5 Detailgrad und Animationen ✓:** 80 px pro Meter, feine Figuren.
- **M6 Überlebende, Geschichte, Einrichten ✓.**
- **M7 Feinschliff ✓:** Klang, Titelbild, Einstellungen.
- **M8 Nach dem ersten Probespielen ✓:** schnellere Zeit (ein Tag rund
  9 Minuten), fordernde Nächte ab Nacht 1; Zombieteile als Beute und
  Balduins Handel (noch mit Bollerwagen über Land – das Boot kommt mit M9);
  Autowrack nur einmal. Die geplanten Punkte »Innenraum als eigenes Bild«
  und »Detailgrad« gehen in M11 und M12 auf.

Bis hierhin spielt das Spiel auf einer Waldlichtung mit vier Waldpfaden und
freiem Bauraster (die Horde ließ sich mit Bauten umlenken). Das neue
Grundkonzept ersetzt die Karte; was aus dem Umlenken und der Wegvorschau
wird, klärt OFFENE-FRAGEN Nr. 66.

### Meilenstein 9 – Die Bucht und die Wege (großer Umbau) ✓

*Umgesetzt:* Karte 96 × 60 m mit fester Bucht und prozeduralem Wegenetz
(Startwert im Spielstand, drei Spawns mit Warnpfählen), See mit treibenden
Wellen und Inseln, Herbstwald, Steg, Bootswrack, Leuchtmast am Stegende,
Übersichtskarte (M); Horde nur auf Weg und Hof, alle Schlurfer schlagen
Barrikaden; Türme nie auf, Barrikaden nur auf Wegfeldern (drei Stufen,
Trümmer, Wiederaufbau); Überreste drei Tage; Tagesschlurfer nur einzeln;
Balduin mit Boot und im Seebär-Look; Spielstand v8 mit Erstattung und Umzug
der Bauten. Entscheidungen: OFFENE-FRAGEN 75–83.

*Geplant war:*

- **Neue Karte nach Grundregel 11:** rechts der Stillsee mit Inseln und
  Nebel, am Ufer das alte Fischerhaus mit Steg, davor der Hof als letzte
  Verteidigung; links die Landseite mit Wald, Felsen und Hängen und mehreren
  Spawns am Rand. Gelände und Natur gleich in Herbstfarben.
- **Prozedurales Wegenetz:** etwa drei Zuführungen je Spiel aus einem
  eigenen Startwert, mit Verzweigungen, die kurz vor der Bucht in einen
  gemeinsamen letzten Abschnitt münden; lang genug für 50–60 Türme und mehr.
- **Horde nur auf den Wegen:** Sie folgt den Wegfeldern zum Hof, bleibt an
  Barrikaden hängen und greift sie an, am Ende das Haus; die Figur zieht sie
  nur aus der Nähe vom Weg. Tagsüber nur ganz vereinzelte Schlurfer.
- **Türme frei neben den Wegen**, nie auf einem Wegfeld.
- **Barrikaden frei auf Wegfeldern:** Holzbarriere, Ausbau, Metallbarriere
  (Metallkreuz und mehr später); Lebenspunkte, sichtbarer Schaden, Trümmer,
  Flicken und Wiederaufbau am Tag.
- **Letzte Verteidigung** am Hof, Standfestigkeit der Basis, verlorene Nacht.
- Überreste halten bis zu drei Tage; der Morgen zeigt die Folgen der Nacht.
- **Balduin kommt schon mit dem Boot zum Steg** (einfache Fassung), damit der
  Handel auf der neuen Karte gleich funktioniert.
- Überlebende, Leuchtmast am Steg, Werkbank, Beete, Zelte und Möbel auf der
  neuen Karte.
- Spielstand v8 mit Migration (alte Stände laden, Türme und Barrikaden werden
  erstattet, der Startwert der Karte wird festgelegt).
- Prüfskript für Karte, Wege, Bauen neben und auf den Wegen, Barrikaden,
  Nächte und Migration.
- **Nicht angefasst, bis OFFENE-FRAGEN Nr. 66 geklärt ist:** Umlenken der Horde
  durch Bauten und die Wegvorschau.

**Spielbar heißt:** Ein ganzer Tag-Nacht-Morgen-Zyklus an der Bucht: tagsüber
Türme neben die Wege und Barrikaden auf die Wege, nachts stauen sie die
Horde, morgens Trümmer und Überreste – und man sieht immer, wo die Horde
langläuft. Jedes neue Spiel hat ein etwas anderes Wegenetz.

### M9.1 – Nach der Rückmeldung des Auftraggebers ✓

Barrikaden als Spanische Reiter (erkennbar, 1 Holz, schnell kaputt), Zombieteile
sicher nur von Hand (Türme: jedes zweite Mal), Balduin mit Ankunftsfanfare und
Abschied nach dem Handel (»Tschüss, Balduin!«), Esc bleibt im Spiel, Nächte
etwas schneller und voller. Entscheidungen: OFFENE-FRAGEN 84–88.

### Meilenstein 10 – Balduin kommt übers Wasser ✓

- Ankunft als kleines Ereignis: Das Boot taucht zwischen Nord- und Ostinsel
  auf, tuckert mit Kielwasser und Motorgeräusch in einer weichen Kurve heran
  und legt längsseits am Steg an; Balduin wirft die Leine über den Poller.
  Beim Ablegen holt er sie ein, das Boot dreht und fährt zwischen Ost- und
  Südinsel davon.
- Balduin im feinen Look-Schliff: breites Grinsen mit Goldzahn, rote Wangen,
  hochgezogene Brauen, neues Porträt; Gesten am Steg (Mütze lüften, Hände
  reiben, Bart kraulen, Daumen hoch und Winken nach dem Handel,
  Schulterzucken ohne Handel).
- Besondere Turmteile (6.9): Fernrohr, Schmierfett, Glücksmünze – an geraden
  Tagen ab Tag 4 eines im Angebot.
- **Verschoben:** Upgrades und Werkzeuge bei Balduin wandern in die Balance
  (M13), Nebenaufträge in die Geschichte (später, Wunsch des Auftraggebers).
  Die täglichen Sprüche gibt es schon seit M8. Dazu, auf Wunsch des
  Auftraggebers: ein gemütlicher Soundtrack, nachts beim Angriff treibend
  (6.19). Entscheidungen: OFFENE-FRAGEN 89–93.

### Meilenstein 11 – Das Zuhause am Wasser ✓

- **Innenraum als eigenes Bild:** Durch die Haustür geht es nach kurzem
  Abblenden hinein – im doppelten Maßstab, im feinen Maß (1/16 m), warm
  beleuchtet, mit Sonnenflecken durch die Fenster; draußen läuft die Welt
  weiter (OFFENE-FRAGEN 94, 95).
- **Stufen und Räume:** Wohnraum mit Kamin (1), Küche mit Suppe (2),
  Schlafzimmer unterm Dach (3), Werkstatt mit Werkbank (4), Lager (5) –
  je +150 Standfestigkeit bis 900 (Nr. 96); außen zeigt sich der Ausbau an
  Dachfenster, Werkzeugbrett und Kisten auf der Veranda (Nr. 97).
- Möbel aus M6 stehen im Wohnraum, Knopfs Körbchen vor dem Kamin; draußen
  kommt das Holzlager dazu. **Verschoben:** Gewächshaus und längerer Anleger
  (Nr. 98).

### Meilenstein 12 – Herbst, Wetter und Lesbarkeit ✓

- **Wetter je Tag:** klar, Wind, Nieselregen, Nebel – mit Licht, Farbe,
  Regen im Bild, Nebelbänken, fallendem Laub, Atemwölkchen in kalten Nächten
  und eigenem Klang; in der Uhr und im Morgenbericht (OFFENE-FRAGEN 99, 100).
- **Herbst überall:** Schilf mit Rohrkolben am Ufer, Pilzgruppen
  (Fliegenpilz, Steinpilz, Pfifferling), Kürbisse am Beet, Kürbislaternen
  vor der Tür (nachts mit Lichtinsel), Laubhaufen zum Durchlaufen, Treibholz
  (Nr. 102). **Krähen** sitzen auf Pfosten und im Gras und fliegen krächzend
  auf, wenn man ihnen nahe kommt (Nr. 101).
- **Gesichter:** Mika zeigt sieben Ausdrücke (froh, Aua, staunend, müde,
  besorgt, entschlossen, normal), die Überlebenden lächeln, wenn Mika bei
  ihnen steht (Nr. 103). Laterne und Turmgeschosse im feinen Maß (Nr. 104).

### Meilenstein 13 – Detailgrad: alles im feinen Maß ✓

Wunsch des Auftraggebers (nach M8 und erneut nach M12): Man soll erkennen,
was was ist, statt es zu raten oder zu lesen. M11 und M12 haben das drinnen
und für alles Kleine und Lebendige gelöst; draußen sind Haus, Hof,
Requisiten und Natur noch aus groben 1/8-m-Klötzen (OFFENE-FRAGEN 111).

- **Zuhause und Hof:** das Haus von außen in allen fünf Stufen (Bretter,
  Schindeln, Fensterrahmen mit Sprossen, Tür mit Klinke, Kamin), Veranda,
  Feuerstelle, Sessel, Bänke, Hackklotz, Wäscheleine, Wegweiser, Briefkasten,
  Regentonne, Beete, Schaukel-Eiche; alles Gebaute (Werkbank, Lampe, Bank,
  Beet, Zelte, Holzlager, Funkturm).
- **Wege und Wasser:** Steg mit Pfählen und Pollern, Wrack, Leuchtmast,
  Warnpfähle, Schrotthaufen, Steinbrocken, Kiesel, Äste, Stümpfe, Kisten,
  Treibholz, Laubhaufen.
- **Natur:** Bäume mit Rinde, Ästen und Laub in Büscheln, Büsche, Felsen,
  Grasbüschel; ein ruhigerer Boden, damit sich die Dinge abheben.
- **Horde und Türme:** Schlurfer-Arten auf einen Blick unterscheidbar
  (Kleidung, Haltung, Merkmale), Türme mit mehr Teilen je Stufe.
- **Mehr Pixel (zweite Rückmeldung, mit Vorbild):** Die Größe bleibt, die
  Modelle werden noch einmal doppelt so fein – 1/32 m, gut 2 px je Voxel,
  so dicht wie im Vorbild des Auftraggebers (OFFENE-FRAGEN 112, 113). Die
  Bodentextur ist doppelt so fein; Z geht auf Wunsch nah heran (160 px/m).
  **M13g:** Mika mit Laterne und Werkzeug, Überlebende, Balduin und sein
  Boot, Knopf, Krähen, alle sechs Schlurfer-Arten, alle Türme in allen
  Stufen, Bauten und Barrikaden, das Haus in allen Stufen, alle Requisiten
  von Feuerstelle bis Leuchtmast, die Quellen und die Beute sind neu im Maß
  1/32 gezeichnet – mit Fugen, Nägeln, Maserung, Zeichen und Rundungen statt
  bloß verdoppelter Klötze (ein gemalter Fisch am Wegweiser, ein Brief im
  Briefkasten, Knöpfe am Hemd, ein Zeh im Schuh der Schlurfer, das Auge im
  Einmachglas). Die Natur bleibt 1/16 m.
- Grundflächen und Kollision bleiben, wie sie sind; die Bildzeit wird vorher
  und nachher gemessen. Testrunde mit der Frage »Erkennt man, was was ist?«.

### Meilenstein 14 – Balance und Testrunden (aufgegangen in M16–M25)

- Balance über zehn und mehr Nächte an den Wegen (Vorschläge liegen beim
  Auftraggeber), Testrunden mit allen Personas, Feinschliff.

### Meilenstein 15 – Geschichte und Einleitung ✓

Vorgezogen (Frage des Auftraggebers: »Wir wissen nicht, warum die Zombies
nicht durch den Wald kommen, was überhaupt passiert ist und was unsere
Aufgabe ist.«). Siehe 4.1, 4.2, 4.4 und OFFENE-FRAGEN 114.

- **Einleitung mit Kamerafahrt** (seit N5 erzählt Edda sie nach der
  Ankunft über Funk): Beim Einblenden steht die Kamera am
  Waldrand; Mika erzählt in sechs Zeilen vom Moder, vom Geflecht im
  Unterholz, von den festen Holzfällerwegen und der alten Holzlände, vom
  Wasser hinter dem Haus und von ihrer Aufgabe. Die Kamera gleitet dazu vom
  Spawn über das Unterholz und den Zusammenfluss (mit der Karte der Wege
  über dem Dialog) zum Haus und zurück zu Mika. Während der Einleitung
  gibt es keine Anzeigen außer dem Dialog.
- **Der Moder ist zu sehen:** violette Matten und Fäden im Waldboden,
  Moderpilze und Hexenringe im Unterholz; nachts glimmt alles schwach
  (Eigenlicht, keine Lichtquelle).
- **In der Welt verteilt:** Läuft Mika gegen den Wald, denkt sie einmal am
  Tag darüber nach (vier Sätze); der Warnpfahl gibt einen Gedanken statt
  eines Dialogs; Radio Stillwald rät »bleibt auf festem Boden«; Hilde fährt
  nur auf festen Wegen, Bert erzählt von den geschotterten Holzfällerwegen,
  Dr. Yusuf, was der Moder ist, Balduin, warum auf den Inseln keiner wächst.

### N1 – Figuren aus Formen statt Kästen ✓

Wunsch des Auftraggebers: »Etwas mehr als nur Quadrate … nicht nur die
Texturen, die 3D-Modelle selber!« (OFFENE-FRAGEN 115).

- **Mika:** runder Kopf, zum Kinn schmaler, Mütze als Polster mit Umschlag
  und Bommel, Rumpf mit runden Schultern und Taille, Rucksack mit runden
  Kanten; Arme und Beine aus Kapseln mit **Ellbogen und Knie** – beim Gehen
  beugen sich die Knie, die Laterne hält der angewinkelte Arm vor der Brust,
  beim Schlag holt der Unterarm aus.
- **Horde:** geneigte Köpfe, Buckel und hängende Schultern, nach vorn
  greifende Arme mit hängenden Händen (der Flitzer mit Läuferarmen), der
  Brummer mit Bauch; Kapuze, Kegel, Pilzhut und Geweih sitzen auf der Rundung,
  Augen und Warnstreifen folgen der Wölbung.
- **Überlebende und Balduin:** dieselben Formen wie Mika; Mützen, Bärte,
  Brillen, Kopfhörer, Riemen und Taschen sitzen auf den Rundungen.
- **Knopf:** runder Rumpf mit Brust, Kopf mit Schnauze und Schlappohren,
  gebogener Schwanz mit heller Spitze, Pfoten, Zotteln als Büschel, der große
  Knopf am roten Halsband ist von vorn zu sehen.

### N2 – Startbild und Menümusik ✓

Wunsch des Auftraggebers: »Wenn man startet, soll auch eine Musik im Menü
sein, und ein pixeliges ›Produced by Tales of Cue‹ oder so eingeblendet
werden« (OFFENE-FRAGEN 121). Startbild mit Buch, Laterne und Laub, die
Spieluhr als Klang-Logo nach dem ersten Tastendruck, danach das Titelbild mit
dem neuen Stück »Herbstlied am Stillsee« (6.19, 6.20).

### Der Plan ab M16 – jetzt kommt der Spaß (28.09.2026)

Auftrag: »Jetzt steht der Rumpf des Spiels, jetzt muss der Spaß rein« – mit
den Elementen der Tower-Defense-Karten aus Warcraft 3 (Analyse in Abschnitt
10, Entscheidungen in OFFENE-FRAGEN 66 und 116–120). Der Auftraggeber hat
entschieden: M16 zuerst, **kein Umlenken** – stattdessen **Tor und Wall**
(M17) –, und ein **Finale**, nach dem man weiterspielen oder neu beginnen
kann. Reihenfolge: N1 (Figuren aus Formen) und N2 (Startbild und Menümusik)
fertigstellen → Testrunde mit der Frage »Wo macht es Spaß, wo langweilt
es?« → M16 bis M25. Die Balance aus M14 geht in diesen Meilensteinen auf:
Jede neue Mechanik kommt mit ihren Zahlen, die große Balance-Runde ist M24.

#### M16 – Die Nacht in der Hand ✓

*Umgesetzt (28.09.2026):* Nachtplan ab 19:30 (mit Juna samt schweren Arten)
und Randmarken zur nächsten Welle; Wellen ab Nacht 2 über zwei, ab Nacht 4
auch über drei Wege; N ruft die nächste Welle (spätere rücken vor, Mutbonus
+25 % Beute) – seit m16-r1 abends ab der Tafel schon die erste (»Ich bin
bereit«) und nachts, sobald die laufende ganz unterwegs ist; B verdoppelt
nachts das Tempo; Schwierigkeit
Gemütlich/Ausgewogen/Wild im Titelbild und im Pausenmenü (ab der nächsten
Nacht); sechs Fähigkeiten auf zwei Plätzen (6.13); Ausholen mit Risiko;
Türme mit Namen, Erfahrung, vier Rängen, Wimpeln und dem Turm der Nacht
(6.9). Spielstand v11.

*Ziel:* In jeder Welle gibt es etwas zu entscheiden, Warten ist freiwillig,
das ganze Wegenetz zählt.

- **Nachtplan:** Ab der Dämmerung zeigt eine Leiste, was kommt – Wellen,
  Arten, Merkmale und über welche Wege; Juna am Funk macht ihn genauer. Die
  Randmarken zeigen die Spawns der nächsten Welle.
- **Mehrere Wege je Nacht:** ab Nacht 2 Wellen über zwei, ab Nacht 4 manchmal
  über alle drei Zuführungen. Verteidigung draußen an den Zweigen lohnt sich
  (m12-r1: »alles gehört auf den letzten Abschnitt«).
- **Welle rufen und Zeitraffer:** Ab der Tafel am Abend ruft eine Taste
  die Horde sofort (»Ich bin bereit«), nachts die nächste Welle, sobald die
  laufende ganz unterwegs ist (Mutbonus: mehr Teile); nachts läuft das Spiel
  auf Wunsch doppelt so schnell. Ausruhen endet an der Tafel (19:30).
- **Mika-Fähigkeiten:** zwei Fähigkeiten mit Abklingzeit, gewählt über die
  Perk-Stufen – Laternenblitz (blendet und lähmt kurz), Kürbiswurf (Fläche,
  setzt in Brand), Pfiff (Knopf lenkt eine Gruppe ab), Notbrett (flickt eine
  Barrikade mitten in der Welle), Anfeuern (Türme in der Nähe schneller),
  Wirbel (Rundumschlag). Der Nahkampf bekommt wieder Risiko (m12-r1: das
  Ausholen bricht nicht mehr durch Rückstoß ab).
- **Türme mit Geschichte:** Türme sammeln Erfahrung aus Schaden und
  Abschüssen, steigen in vier Ränge auf (kleine Wimpel am Turm, je ein
  wenig stärker), tragen einen Namen (»Gertrud, Kürbiskatapult«) und
  zählen ihre Abschüsse; der Morgenbericht kürt den Turm der Nacht.
- **Schwierigkeit:** beim Spielstart wählbar – Gemütlich, Ausgewogen, Wild –
  und jederzeit in den Einstellungen änderbar (m12-r1: Mira gegen Theo).

*Spielbar heißt:* Eine Nacht über drei Wege, auf die man sich vorbereitet,
Wellen früher rufen, mit dem Laternenblitz eine Barrikade retten – und
morgens lesen, dass Gertrud 23 Schlurfer erledigt hat.

#### M17 – Tor und Wall: die Bucht wird ein Lager ✓

*Umgesetzt (28.09.2026):* Wall (sechs Abschnitte) und Tor über dem letzten
Weg stehen von Anfang an, vier Stufen (6.8); die Schlupftür lässt nur die
Lebenden durch, eine Laufhilfe lenkt Mika hinein; tagsüber nagen Streuner
höchstens bis drei Viertel; wer Mika jagt, während Wall und Tor ganz sind,
geht zum Tor und schlägt es ein. Durchbruch mit Banner und Randmarke, die
Horde wirft im Lager um, was dort steht; der Morgenbericht nennt Uhrzeit,
wie viele kamen und was umgeworfen wurde. Zubehör für Barrikaden und Tor
(6.10), die Glocke mit Knopf und Bert. Karte und Nachtleiste zeigen das Tor.
Spielstand v12 (alte Stände bekommen den Weidenzaun; was auf der Linie stand,
kommt in den Vorrat).

*Wunsch des Auftraggebers* (statt Umlenken, OFFENE-FRAGEN 66 und 120): »Unsere
Base sollte grundlegend ein Tor und einen Wall kriegen. Am Anfang noch
brüchig, aber man kann es aufrüsten … Durchs Tor kommen nur die Lebenden
ohne Probleme. Wenn sie durchbrechen, geht noch der aktive Kampf gegen die
Monster – dann fallen sie nämlich unser Lager an.« *Vorbild:* die
Burgverteidigungs-Karten (das Tor hält, bis es fällt).

- **Der Wall** umschließt Hof und Haus zur Landseite, vom Ufer im Norden bis
  zum Ufer im Süden; der letzte Weg endet am **Tor.** Stufen: brüchiger
  Weidenzaun (Start) → Palisade → Bohlenwand mit Wehrgang → Steinmauer.
  Abschnitte haben Lebenspunkte, zeigen Schäden und werden einzeln geflickt,
  wieder aufgebaut und aufgerüstet – wie Barrikaden, nur größer.
- **Das Tor** öffnet sich nur für die Lebenden – Mika, die Überlebenden,
  Hilde mit dem Lastenrad – und schließt hinter ihnen. Die Horde muss es (oder
  den Wall) einschlagen. Eigene Stufen und Ausrüstung: Dornen (verletzen, wer
  zuschlägt), Torlaternen (blenden), eine Alarmglocke (Knopf und die
  Überlebenden sind sofort wach).
- **Barrikaden ausrüsten:** Auch Barrikaden auf den Wegen bekommen Zubehör
  (Dornen, Laterne, Pechkessel), damit man sie jeden Tag nicht nur wieder
  aufbaut, sondern weiter ausrüstet.
- **Durchbruch:** Fällt ein Abschnitt oder das Tor, strömt die Horde ins Lager
  und greift an, was dort steht – Haus, Zelte, Werkbank, Beete, Lampen. Jetzt
  kämpft Mika (mit den Fähigkeiten aus M16); fällt das Haus, ist die Nacht
  verloren. Morgens zeigt der Bericht, was durchkam und was es kostete.
- **Wege der Horde:** Das Flussfeld endet am Tor; Tor und Wall sind für die
  Horde Hindernisse mit Lebenspunkten, der Hof dahinter ist erst nach dem
  Durchbruch erreichbar. Jäger laufen nicht mehr um das Lager herum.
- Spielstand mit neuer Version und Migration: Alte Stände bekommen den
  Weidenzaun mit Tor.

*Spielbar heißt:* Nacht für Nacht hält das Tor ein bisschen länger – und in
der Nacht, in der es fällt, kämpft man im eigenen Garten.

#### M18 – Zusammenspiel: Zustände und Reaktionen ✓

*Umgesetzt (28.09.2026):* Zustände als Zeichen über dem Kopf, sechs Reaktionen
mit Wort, Klang und Wirkung (6.9), das Wetter wirkt (6.1), das Notizbuch im
Pausenmenü, Spielstand v13. Der Laternenblitz blendet jetzt auch – ein
Bolzen trifft danach die Schwachstelle.

*Vorbild:* Element TD (Elemente, die einander schlagen), Verlangsamen plus
Flächenschaden in allen TD-Karten.

- **Zustände** an Schlurfern, als kleine Zeichen über dem Kopf: nass
  (Sprenger, Regen), frostig (Frost), brennend (Feuerkürbis, Kürbiswurf),
  matschig (Schlamm), geblendet (Laterne, Laternenblitz), betäubt (Pfanne).
- **Reaktionen** mit eigenem Effekt und einem Wort, das kurz aufpoppt:
  nass + frostig = **Eisblock** (eingefroren, der nächste Treffer zerspringt
  doppelt), nass + brennend = **Dampf** (die Horde verliert die Orientierung),
  brennend + matschig = **Glut** (Brand doppelt so lang), geblendet +
  Bolzen = **Schwachstelle** (doppelter Schaden), frostig + Streukürbis =
  **Splitter**, matschig + Katapult = **Klebekürbis** (die Fläche bremst).
  Eine Betäubung hält am Stück höchstens drei Sekunden, dann schüttelt sich der
  Schlurfer kurz frei (M25c) – Dampf verwirrt die Horde, er hält sie nicht die
  ganze Nacht fest.
- **Das Wetter wirkt** (bisher nur Stimmung, OFFENE-FRAGEN 99): Regen macht
  alle nass (Frost stärker, Feuer schwächer), Nebel kürzt Reichweiten
  (Laternen heben es auf), Wind trägt Streukürbisse weiter – Juna sagt es
  morgens an.
- **Notizbuch:** Jede entdeckte Reaktion kommt mit einer Notiz von Dr. Yusuf
  ins Buch.

*Spielbar heißt:* Wer einen Sprenger neben den Frostnebel stellt, sieht
Eisblöcke zerspringen – und hat das selbst herausgefunden.

#### M19 – Mehr Spielzeug: neue Türme, Fallen und Baupläne ✓

*Umgesetzt (28.09.2026):* Baupläne nach gewonnenen Nächten, im Wrack und bei
Balduin (6.6), Glockenturm, Windrad, Bienenkorb und Vogelscheuche mit je zwei
Richtungen (6.9), fünf begehbare Fallen (6.10), die Mühle mahlt Schrott,
Spielstand v14. Eine eigene »Barrikadenart« als Bauplan fehlt noch – das
Metallkreuz ist schon die dritte Stufe der Barrikade (OFFENE-FRAGEN 136).

*Vorbild:* Green TD (Vielfalt), Element TD (Wahl der Elemente), Gem TD
(Zufall mit Wahl).

- **Vier neue Turmfamilien,** je fünf Stufen und zwei Richtungen, geformt
  wie die Figuren: **Bienenkorb** (ein Schwarm folgt einem Ziel, Schaden über
  Zeit, geht durch Panzer; Königin oder Honig), **Glockenturm** (ein Schlag
  betäubt alles in Reichweite; Sturmglocke oder Friedensglocke, die
  Barrikaden heilt), **Vogelscheuche** (lockt Schlurfer vom Weg auf sich und
  muss geflickt werden; Strohmann oder Krähenscheuche), **Windrad** (bläst
  die Horde zurück, verweht Dampf und Nebel; Sturm oder Mühle, die tagsüber
  Schrott mahlt).
- **Fallen auf den Wegen** – begehbar, anders als Barrikaden: Stachelbrett,
  Leimtopf, Knallerbsen, Klettenteppich, Ölspur (mit Feuer eine Flammenwand).
- **Baupläne:** Am Anfang gibt es die vier Türme und die Holzbarriere. Nach
  jeder gewonnenen Nacht wählt man einen von drei Bauplänen (neue Familie,
  Falle, Richtung, Barrikadenart) – jedes Spiel bekommt seinen eigenen
  Bau-Weg. Baupläne finden sich auch im Wrack, am Waldrand und bei Balduin
  (Inhalt für die Tage, m12-r1).

*Spielbar heißt:* Zwei Spiele nebeneinander verteidigen sich verschieden –
einmal mit Bienen und Glocken, einmal mit Windrad und Knallerbsen.

#### M20 – Mischtürme ✓

*Umgesetzt (28.09.2026):* Acht Rezepte – die sechs der ersten vier Familien,
dazu Glühschwarm (Bienenkorb + Laternenturm) und Wetterhahn (Windrad +
Sprenger). Zwei Türme ab Stufe 3, Kante an Kante, werden in der Auswahl mit
»Verbinden« (ein Moderkern, 10 Schrott, zwei Drücke) ein Turm auf beiden
Feldern; die Stufe ist die kleinere, danach bis Stufe 5. Unbekannte Rezepte
heißen in der Leiste »???«. Das Werkstattbuch im Pausenmenü zeigt je Rezept
Name, Tag und Zutaten, unentdeckte mit einem Hinweis von Bert oder Juna.
Balduin bringt den ersten Moderkern schon an Tag 4. Spielstand v15.

*Vorbild:* Element TD (Doppel- und Dreifachtürme), Gem TD (Rezepte).

- Zwei **benachbarte Türme verschiedener Familien** ab Stufe 3 lassen sich mit
  einem Moderkern zu einem Mischturm verbinden. Er steht auf beiden Feldern
  und kämpft auf eigene Art.
- Mit den ersten vier Familien sechs Rezepte: **Kürbisballiste** (Bolzen +
  Katapult: durchschlägt eine Reihe, platzt am Ende), **Eiszapfenschleuder**
  (Bolzen + Sprenger), **Leuchtpfeil** (Bolzen + Laterne: markiert das Ziel,
  alle Türme treffen härter), **Matschkessel** (Katapult + Sprenger),
  **Feuerwerk** (Katapult + Laterne: Kettenexplosionen, erhellt den Weg),
  **Nebelleuchte** (Sprenger + Laterne: Schlurfer laufen kurz zurück). Mit den
  Familien aus M19 kommen weitere dazu.
- **Werkstattbuch:** Unentdeckte Rezepte stehen als Schattenriss darin; Bert
  und Juna geben Hinweise.

*Spielbar heißt:* Man entdeckt ein Rezept, baut es, und der Abend sieht
anders aus.

#### M21 – Beute mit Glanz: Turmteile, Seltenheit, Champions ✓

*Umgesetzt (28.09.2026):* Zwölf Turmteile in vier Seltenheiten – gewöhnlich
(Schleifstein, Hufeisen, Zahnkranz), selten (Fernrohr, Schmierfett,
Kupferspule), besonders (Brennglas, Eiskristall, Uhrwerk, Glücksmünze),
einzigartig (Omas Stricknadel, Mondstein). Ein Fach je Turm, ab Stufe 4 zwei.
Champions ab Nacht 3 (einer, ab Nacht 6 zwei, ab Nacht 10 drei, je Welle
höchstens einer): dreifaches Leben, etwas größer, goldenes Glitzern, Name und
Merkmale über dem Kopf; bis Nacht 5 ein Merkmal, danach zwei. Die Fundkiste
fliegt nicht zu Mika – sie platzt auf, wenn Mika davorsteht, und bringt ein
Turmteil nach Seltenheit plus Schrott und Zombieteile. Basteln an der Werkbank
(drei gleiche → ein zufälliges der nächsten Seltenheit), Balduins Wundertüte
ab Tag 3 (8 Zombieteile, einmal am Tag). Spielstand v16.

*Vorbild:* YouTD (Gegenstände in Türmen), Gem TD (Kombinieren), Truhen wie in
Vampire Survivors.

- **Turmteile** in vier Seltenheiten (gewöhnlich, selten, besonders,
  einzigartig) mit Wirkung und Witz – Schleifstein, Kupferspule (jeder fünfte
  Schuss springt weiter), Brennglas (setzt in Brand), Uhrwerk (Doppelschuss),
  Hufeisen, Omas Stricknadel … Türme haben ein Fach, ab Stufe 4 zwei.
- **Champions:** ab Nacht 3 einzelne Schlurfer mit goldenem Rand, einem Namen
  und Merkmalen (moosig, gepanzert, flink, schildtragend, teilend,
  lichtfressend). Sie lassen eine **Fundkiste** fallen, die in Beute
  aufplatzt.
- **Werkbank:** Drei gleiche Teile ergeben eines der nächsten Seltenheit –
  Basteln für ruhige Tage. **Balduin** verkauft eine Wundertüte.

*Spielbar heißt:* Nachts einen goldenen Schlurfer jagen, morgens die Kiste
öffnen und die Kupferspule in den Lieblingsturm bauen.

#### M22 – Die Horde stellt Fragen: Arten, Merkmale, Bosse ✓

*Umgesetzt (28.09.2026):* Wellenmerkmale ab Nacht 4 (eine Welle, ab Nacht 8
zwei; das erste ist immer die Nebelwelle), im Nachtplan und Banner angesagt:
Nebelwelle (außerhalb von Licht nur die Augen, Türme treffen nur im Licht –
Lichtinseln von Lampen, Fackeln, Laternentürmen und Mikas Laterne; dazu
Nebelbänke über den Wegen), flinke Welle, gepanzerter Trupp, heilende Welle,
Moderflut (zusätzliche Pulks Schwärmer). Neue Arten mit eigener Nacht:
Schildträger (4), Moderfalter (6), Gräber (7), Lichtfresser (8), Brüter (9) –
beim ersten Auftritt erklärt Mika sie. Bosse statt des Anführers: der
Holzfäller (Nacht 5), die Pilzmutter (10), die Laternenhexe (15), der
Moosriese (20), danach von vorn und zäher – mit Balken oben im Bild, eigenem
Musikstück (»Der Boss kommt«, c-Moll) und Angriffen, die ein blinkender
Warnkreis und ein Wort über dem Kopf ankündigen.

*Vorbild:* Green TD (fliegende, immune, unsichtbare Wellen, alle paar Wellen
ein Boss), die Bosse der Hero-Defense-Karten.

- **Neue Arten:** Moderfalter (fliegen über dem Weg, über Barrikaden hinweg –
  nur Türme und Mika treffen sie), Gräber (buddelt sich unter Barrikaden
  durch), Schildträger (trägt eine alte Tür, vorn gepanzert), Lichtfresser
  (löscht Laternen und Fackeln am Weg), Brüter (legt Sporenkapseln, aus
  denen Schwärmer schlüpfen).
- **Wellenmerkmale:** flinke Nacht, gepanzerter Trupp, Nebelwelle (außerhalb
  von Licht unsichtbar – Laternen werden wichtig), heilende Welle, Moderflut.
- **Anführer als Bosskämpfe** mit Namen, Lebensbalken, eigener Musik und
  angekündigten Angriffen: der Holzfäller (Nacht 5: zerschlägt Barrikaden mit
  einem Hieb und stürmt), die Pilzmutter (Nacht 10: Sporenwolken heilen die
  Horde), die Laternenhexe (Nacht 15: stiehlt Licht), der Moosriese (Nacht
  20: zerfällt in drei) – und weitere bis zum Finale.

*Spielbar heißt:* Der Nachtplan kündigt eine Nebelwelle an, und man stellt
schnell noch Laternen an den Nordweg.

#### M23 – Gemeinsam durch die Nacht ✓

*Umgesetzt (28.09.2026):* Neuer Bau **Hochsitz** (Reiter Einrichten, neben den
Weg, höchstens vier). Über seine Auswahl stellt man eine eingezogene Person
auf den Posten; ab der Dämmerung steht sie oben, bis zum Morgen. Bert flickt
Barrikaden, Wall und Tor im Umkreis, Hilde wirft Einmachgläser (Schaden,
klebrig), Juna zündet auf **J** ihr Leuchtfeuer (betäubt, blendet, holt aus
dem Nebel; 30 s Pause), Dr. Yusuf verarztet Mika und die Türme ringsum. Knopf
jagt nachts einzelne Schwärmer aus dem Hof. Rütteln Schlurfer zu lange am
Hochsitz, zieht sich die Person ins Haus zurück. Der Morgenbericht erzählt,
was die Posten getan haben. Nach einer gehaltenen Bossnacht feiern alle am
Morgen am Feuer (bis Mittag), und in der Nacht darauf treffen die Türme um
10 % härter. **Nebenaufträge** (einer auf einmal, morgens angeboten, zweite
Zeile im Zielkasten): Hildes Garnrollen am Wrack, drei Antennenteile für Juna
und Berts Werkzeugkasten neben den Wegen (feste Stellen aus dem Startwert der
Karte, sie funkeln), Proben von zwei Champions für Dr. Yusuf, Balduins Bitte
(ein Moderkern und 15 Zombieteile) im Handelsfenster – Belohnung: Baupläne
zur Wahl und Turmteile bis »einzigartig«.

*Vorbild:* die Mitspieler der Teamkarten, Legion TD (Einheiten statt Türme).

- Eingezogene Überlebende beziehen nachts einen **Posten** (ein Hochsitz
  neben dem Weg): Bert flickt Barrikaden in der Nähe, Hilde wirft
  Einmachgläser (bremsen), Juna bedient das Leuchtfeuer (ein heller Stoß auf
  Tastendruck), Dr. Yusuf verarztet Mika und Türme am Hof, Knopf hütet den
  Hof und scheucht einzelne Schwärmer.
- Niemand wird besiegt: Wer zu viel abbekommt, zieht sich ins Haus zurück.
- Nach einer gehaltenen Anführernacht gibt es morgens ein **Fest** am Feuer.
- **Nebenaufträge:** Die Überlebenden und Balduin bitten um Dinge (Hilde:
  Garnrollen aus dem Wrack, Bert: sein Werkzeugkasten vom Nordweg, Juna:
  Antennenteile, Dr. Yusuf: Proben von Champions, Balduin: Aufträge, über
  die er nicht redet) – Belohnungen sind Baupläne, Turmteile und Deko. Das
  füllt die Tage (m12-r1) und bleibt auch nach dem Finale.

*Spielbar heißt:* Man stellt Bert ans Tor und Hilde an den Engpass – und
morgens erzählen sie davon.

#### M24 – Wagnis, Vorrat und die große Balance ✓

*Umgesetzt (28.09.2026):* **Moderlocke** (Reiter Fallen, nach zwei gewonnenen
Nächten; 8 Zombieteile, 3 Fasern): nur auf einen Zulauf am Waldrand; in der
nächsten Nacht bringt jede Welle rund ein Drittel mehr Horde über diesen Spawn
(auch im Nachtplan angesagt), die dort 1,6-fache Beute trägt – hält die Nacht,
wird die Locke zur Fundkiste. **Makellose Nacht** (niemand im Lager, das
Zuhause heil): 12 Schrott und 4 Zombieteile; nach drei in Folge hat Balduin
**seinen Schatz** dabei (ein einzigartiges Turmteil für 14 Teile).
**Vorratskammer:** gespartes Schrott wächst über Nacht um 6 % (höchstens 12,
mit dem Lager 24), nach einem Durchbruch nicht. **Die große Balance:** ein
Balance-Durchlauf (`tools/balance.mjs`) spielt Nächte statt Testspielern und
misst den Druck auch in gehaltenen Nächten; ab Nacht 4 werden die Schlurfer
zäher (in Bossnächten weniger), Wild ist schwerer statt reicher; tote Optionen
belebt (Holzlager baut morgens Barrikaden wieder auf, Bank gibt kurz mehr
Schlagkraft, Pfanne durchschlägt Panzer).

*Vorbild:* Element TD (Zinsen, die beim Durchbruch verfallen), Line Tower Wars
(mehr Einkommen nur durch Risiko).

- **Moderlocke:** vor der Nacht an einem Spawn ausgelegt – dort mehr Horde,
  mehr Beute und eine sichere Fundkiste.
- **Makellose Nacht:** Erreicht kein Schlurfer den Hof, gibt es einen Bonus;
  nach drei in Folge bringt Balduin ein seltenes Angebot.
- **Vorratskammer:** Gespartes Schrott wächst über Nacht um einen kleinen,
  gedeckelten Anteil – nach einer Nacht mit Durchbruch nicht.
- **Die große Balance** (war M14): Tage mit Inhalt, Kosten von Barrikaden
  und Ausbau, tote Optionen (Holzlager, Bank, Pfanne), Nahkampf – über zehn
  und mehr Nächte in allen drei Schwierigkeitsgraden.

#### M25 – Ein Herbst mit Ende ✓

*Umgesetzt (28.09.2026, Teil 1):* Die Uhr zeigt »Tag 12 von 30«, ab Tag 25
zählen die Nächte bis zum ersten Frost herunter. In der **Frostnacht** (Nacht 30)
kommt jede Welle über alle drei Wege, das **Moderherz** führt schon die zweite an – ein
pochendes Herz aus Pilzgeflecht auf Wurzelbeinen mit einer Krone aus Pilzhüten.
Es bricht mit Wurzeln Barrikaden, ruft unter zwei Dritteln seines Lebens die
Horde über alle Wege und schickt Sporen; unter einem Drittel kommt der Frost
(es schneit, das Herz wird langsamer). Fällt das Herz, zerfällt die Horde; hält
die Bucht bis zum Morgengrauen, erstarrt es im Frost. Danach liegt Schnee (auch
auf Dächern, Bäumen und Türmen, der Boden nur bestäubt), der Moder glimmt nicht
mehr, der **Abspann** nennt die Menschen der Bucht, die fleißigsten Türme und die
Zahlen des Herbsts – dann die Wahl: **hierbleiben** (jede Nacht würfelt sich neu:
Wege, Arten, Merkmale, Bosse; die Horde wächst halb so schnell) oder eine **neue
Runde** an einer neuen Bucht (Name, Aussehen und Schwierigkeit bleiben).

*Umgesetzt (28.09.2026, Teil 2):* Jede gehaltene Nacht bringt bis zu drei
**Sterne** – gehalten, makellos (niemand im Lager, das Zuhause heil) und mutig
(mindestens eine Welle früh gerufen); der Morgenbericht zeigt sie ganz oben. Das
**Herbstbuch** im Pausenmenü hat drei Seiten (A/D blättern): zwölf **Taten** (die
erste Nacht, drei Sterne, zehn gerufene Wellen, drei Menschen in der Bucht, drei
Reaktionen, zwei Mischtürme, ein Turm auf Rang III, zwölf Arten, die vier Bosse,
das ganze Zuhause, fünfzig Sterne, die Frostnacht) – jede dritte bringt ein Stück
**Herbstschmuck** zum Aufstellen (Kürbis, Laubhaufen, Regentonne, Kürbislaterne
im neuen Reiter »Schmuck«; nur zum Schönmachen); die **Schlurferkunde** zählt je
Art, wie oft sie erledigt wurde, und sagt, was sie tut – mit **Dr. Yusufs
Notizen**, sobald er in der Bucht ist; das **Turmalbum** zeigt die acht
fleißigsten Türme mit Rang, Abschüssen und wie oft sie Turm der Nacht waren. Der
Abspann nennt Sterne und Taten.

*Vorbild:* die letzte Welle jeder TD-Karte, Schwierigkeitsgrade, Bestwerte.

- **Ein Herbst hat 30 Tage.** In jeder fünften Nacht kommt ein Anführer; in
  der **Nacht des ersten Frosts** (Nacht 30) wächst das **Moderherz** aus dem
  Wald – ein Finale über alle Wege in mehreren Phasen. Danach fällt Schnee,
  der Moder schläft, die Bucht feiert (Abspann).
- **Danach hat man die Wahl** – wie früher bei RollerCoaster Tycoon nach dem
  Szenario (Wunsch des Auftraggebers): **weiterspielen** – die Wellen würfeln
  sich jede Nacht neu (Roguelike: zufällige Arten, Merkmale, Wege und Bosse,
  langsam steigend), offene Nebenaufträge bleiben – oder eine **neue Runde**
  an einer neuen Bucht mit neuem Wegenetz.
- **Sterne je Nacht** (niemand auf dem Hof, Haus heil, Wellen früh gerufen),
  **Herbstbuch** (Erfolge mit Deko als Belohnung), **Schlurferkunde** mit
  Dr. Yusufs Notizen, **Turmalbum.**

### Der Plan ab M26 – Zuflucht sein (29.09.2026)

Auftrag: das Gemeinschaftskonzept des Auftraggebers (28.09.2026, 24 Punkte,
Analyse in `KONZEPT-GEMEINSCHAFT.md`), dazu: »Alles so wie du es für spaßig
hältst. Recherchiere zu allen Punkten, auch zu meinen Ideen. Dann triff auf der
Spielspaß-Grundlage zu allem Entscheidungen. Wir wollen ein Triple-A-Pixelspiel
machen. Ich find Waffen übrigens besser als Werkzeug.« Die Recherche liegt in
`recherche/` (Gemeinschaft, Glocke und Waffen, Kartenspiel mit Simulator,
Premium-Pixel), die Entscheidungen stehen in OFFENE-FRAGEN 161–176.

Mikas Aufgabe laut Geschichte: die Nächte halten, ein Zuhause bauen, Zuflucht
sein. Tag und Nacht sind gebaut; das Zuflucht-Sein, also die Menschen, ist die
fehlende dritte Hälfte. Das Rückgrat ist die Kette aus Punkt 23 des Konzepts:

> Menschen kommen → Mika entscheidet (bleiben oder weiterbringen) → Bewohner
> bekommen einen Platz → gemeinsame Abende (Karten, Angeln, Kochen) → Bindung →
> Übung und Waffen → die Glocke in der Not → Verwundung, im Ernstfall ein
> Verlust → Erinnerung → das Netzwerk hält die Weitergezogenen in der Welt → in
> der Frostnacht leuchten ihre Signalfeuer.

**Leitplanken für alle Meilensteine:**

- **Bewohner sind keine kostenlosen Türme.** Die Horde wird ohne sie
  balanciert; Posten unterstützen nur (Nr. 175); mit Waffen gekämpft wird erst,
  wenn Mika die Lagerglocke läutet (Nr. 165).
- **Niemand wird weggeschickt** – weiterbringen statt ablehnen (Nr. 163).
- **Tod nur nach der Glocke**, nie auf »Gemütlich«, nie Knopf (Nr. 166).
  Wehmut ja, Schuld nein: kein Stimmungsabzug, keine Trauer-Spirale.
- **Treffer ohne Blut:** violette Sporen, Laub, Moos.
- **Die Tage 1–6 bleiben die ruhige Einführung** der Stammbesetzung (Knopf,
  Hilde, Juna, Bert, Dr. Yusuf), ohne Entscheidungsdruck.
- Jeder Meilenstein ist für sich spielbar; alte Spielstände laufen weiter.

**Vorläufige Besetzung der zwölf Wanderer** (je Herbst kommen acht, Nr. 161;
Feinschliff in M27 und M29):

| Name | Beruf | Fähigkeit (klein, meist nicht kämpferisch) | Rolle im Ensemble |
|---|---|---|---|
| Hannes | Zimmerer | flickt nachts die Hälfte der Holzschäden | bedächtig, klopft jede Planke ab |
| Clara | Mechanikerin | Türme reparieren und Teile basteln billiger | redet mit den Türmen |
| Fiete | alter Fischer | Fisch für die Suppe, bringt das Angeln bei (M33) | Kartenmeister, wirkt harmlos |
| Greta | Jägerin | richtet verbrauchte Fallen morgens wieder auf | wortkarg, liest Spuren |
| Jonte | Gärtner | Beete tragen mehr, Kräuter für Yusufs Tee | redet mit Pflanzen, fürchtet Krähen |
| Lotte | Laternenmacherin | alle Lichtinseln größer (Licht macht den Moder müde) | schwärmt, verliert alles |
| Ansgar | Lehrer | Übungen gehen schneller (M30) | korrigiert jeden, auch Balduin |
| Pia | Kind, Finderin | findet morgens Kleinkram; kämpft nie | Schützling neben Juna |
| Rudi | Musiker | spielt abends am Feuer: die Bucht erholt sich schneller | kennt jedes Lied, nur nicht zu Ende |
| Nele | Schneiderin | Stoff reicht weiter, neue Mützen für Mika | ehrlich bis zur Grobheit |
| Bruno | Koch | stärkere Suppe | brummiger Kartenrivale |
| Ida | Kartografin | zeichnet Quellen und Fundstücke in die Karte | verwandte Seele: hat auch ihr Zuhause verloren |

#### M26 – Wucht und Schliff ✓

*Umgesetzt (29.09.2026):* Eine **Rückmeldungs-Tabelle** (`src/data/feel.js`)
stuft vierzehn Ereignisse nach Wucht – vom gewöhnlichen Schlag (50 ms
Trefferstopp, ein Pixel Stoß in Schlagrichtung) über Pfanne und Kombo (100 ms)
bis zum fallenden Moderherz (220 ms, volles Wackeln, 0,6 s Zeitlupe). Die Kamera
**wackelt nach dem Trauma-Modell** in ganzen Pixeln ohne Drehung, klingt ab und
zittert auch im Trefferstopp weiter; Barrikaden wackeln nur in Mikas Nähe, Türme
halten das Spiel nie an. Der **letzte Schlurfer der Nacht** und jeder **Boss**
fallen in Zeitlupe. Getroffene Schlurfer **zittern** einen Pixel. Bauten **setzen
gestaucht auf und federn nach**, jeder Ausbau klingt eine Stufe höher. Jeder
Effekt klingt **gestreut** (±5 % Tonhöhe, ±1,5 dB), Musikalisches und Oberfläche
bleiben gleich. Der **Baugeist** zeigt ✓ oder ✗ an der Ecke. Neue Einstellungen
**Wackeln** (aus/halb/voll) und **Blitze** (voll/sanft). Alle **Shader** werden
beim Start übersetzt, das **Abstandhalten der Horde** läuft über ein Raster (in
einer späten Nacht mit 563 Schlurfern 0,6 statt 5,8 ms je Schritt), das
Prüfskript misst p95/p99 der Bildzeiten.

*Ziel:* Jeder Schlag, jeder Treffer und jeder Bau fühlt sich an; das Spiel
läuft auch in dichten Nächten gleichmäßig. Das ist der erste Schritt zum
»Triple-A-Pixelspiel« – Hochwertigkeit entsteht aus Konsequenz, nicht aus
Auflösung (Nr. 176).

*Vorbild:* Vlambeer (»The Art of Screenshake«), Dead Cells, Hades, Celeste,
das Trauma-Modell von Squirrel Eiserloh.

- **Rückmeldungs-Tabelle** `src/data/feel.js`: je Ereignis Trefferstopp,
  Wackeln, Blitz, Partikel und Klang in drei Stufen (leicht, mittel, schwer:
  30–50 / 80–150 / 150–250 ms, Partikel 3–6 / 8–12 / 16–30).
- **Wackeln nach dem Trauma-Modell:** Ausschlag = Trauma², ganze Pixel (1 /
  2–3 / 4–6 / 6–8), gerichtet, ohne Drehung; Einstellungen »Wackeln«
  (aus/halb/voll) und »Blitze« (abgeschwächt).
- **Treffer lesbar:** ein Bild weißer Blitz, Nachschwung, Klang mit Varianten
  und ±5 % Tonhöhe – nie zweimal derselbe Ton.
- **Bauen mit Schwung:** Stauchen und Strecken beim Setzen, Staubring, Klang je
  Stufe; der Baugeist zeigt ✓ oder ✗ mit Grund.
- **Stabile Bildzeiten:** Shader beim Startbild vorkompilieren, Abstandhalten
  der Horde über ein Raster statt jeder gegen jeden, p95/p99 der Bildzeit im
  Prüfskript.

*Prüfen:* Tabelle vollständig, »Wackeln aus« ohne Versatz, Bildzeiten einer
dichten Nacht, Baugeist mit Grund.

#### M27 – Gäste und Plätze ✓

*Umgesetzt (29.09.2026):* Vier Wanderer – **Hannes** (Zimmermann, flickt jeden
Morgen die halben Holzschäden), **Clara** (Mechanikerin, Türme flicken und
Basteln billiger), **Lotte** (Laternenmacherin, alle Lichtinseln ein Viertel
größer) und **Greta** (Jägerin, stellt verbrauchte Fallen neu) – kommen nach einem
Plan aus dem Startwert (Tage 7–24) über den Weg oder den Strand. Angesprochen
übernachten sie am **Gästeplatz** am Feuer (Schlafsack); am Morgen entscheidet
Mika: **»Bleib bei uns«**, **»Ich bringe dich …«** (mit Proviant und Laterne, zwei,
drei Tage später kommt ein **Brief**) oder einmal »Bleib noch einen Tag«. Sind
alle Plätze belegt, bietet der am längsten Anwesende an zu gehen. Plätze: Zelte
bis fünf, die neue **Schlafhütte** (zwei) und die **Dachkammer** (Stufe 5).
Spielstand v21. Die übrigen acht Wanderer folgen in M29.

*Ziel:* Die Bucht wird ein Zufluchtsort: Menschen kommen, und Mika entscheidet,
wer bleibt – ohne je jemanden wegzuschicken.

*Vorbild:* Animal Crossing (Camper, begrenzte Plätze), State of Decay 2,
RimWorld (Gäste auf Zeit), Spiritfarer (der gestaltete Abschied).

- **Umbau zuerst:** Die Überlebenden werden datengetrieben (keine festen Namen
  mehr in Posten, Aufträgen, Morgengaben, Funk, Rettung, Modellen, Porträts);
  die Prüfung bleibt unverändert grün.
- **Figurenbaukasten für Wanderer:** Formen aus N1, Farben, Frisuren, Mützen,
  Kleidung und Zubehör aus Daten; Porträts mit Ausdrücken.
- **Ankünfte aus dem Startwert** (Tage 7–24), über den Weg ans Tor, am Strand
  oder mit Balduins Boot; der **Gästeplatz** am Feuer.
- **Die Entscheidung am Morgen:** »Bleib bei uns«, »Weiterbringen« (Proviant und
  Laterne mitgeben) oder einmal »Bleib noch einen Tag«; Bewohner bieten aus
  eigenem Grund an, Platz zu machen.
- **Plätze:** Zelte bis fünf, die Hütte (+2), das Gästezimmer (+1).
- **Die ersten vier Wanderer** mit Beruf, Fähigkeit, Temperament, Running Gag
  und Erinnerungsstück; **Netzwerk, Stufe 1:** der erste Brief nach dem
  Weiterbringen.
- Spielstand v21 mit Migration.

*Prüfen:* Ankunft, Gästeplatz, beide Entscheidungen mit echten Tasten, volle
Plätze, Brief, Migration.

#### M28 – Kartenabend »Letzte Runde« ✓

*Umgesetzt (29.09.2026):* Die geprüften Regeln (Nr. 172) als reine Daten mit
Simulator (`tools/karten.mjs`: 49–51 % für den Startspieler, keine Remis, alle
Farbpaare um 50 %; die KI sieht nur den Tisch). Abends bietet ein Bewohner eine
Runde an – am ersten Abend Bert, der das Spiel erklärt, ab dem dritten Hilde mit
den Farbpaaren, Balduin am Steg mit dem Griff ins Dunkle. Der Tisch steht vor dem
Feuer oder bei Regen am Kamin, das Gegenüber sitzt uns zugewandt, die Uhr steht.
Sechs Spielstile mit sichtbarem Tick, Einsätze auf dem Kaminsims,
Kartenrückseiten, Wettschulden am Morgen, die Herbstbuch-Seite »Menschenkunde«
und das Stück »Kartenabend« im Dreiertakt. Spielstand v22 (Nr. 179).

*Ziel:* Ein ruhiger Abend mit einem Menschen, an dem man ihn kennenlernt – und
ein Spiel, das man freiwillig noch einmal spielt.

*Vorbild:* Gwent, Triple Triad, Pazaak, Poker Night at the Inventory; Schotten
Totten.

- **Regelwerk** `src/core/cards.js` ohne three.js, Simulator in `tools/` mit
  Fairness-Prüfung (Startspieler, Farben, Remis) – die geprüften Regeln aus
  Nr. 172.
- **Der Tisch:** Karten im Pixelstil, die Kamera fährt an Feuer oder Kamin
  (nach Wetter), das Gegenüber sitzt uns zugewandt, die Welt lebt weiter.
- **Drei Regelstufen** (Grundspiel, Farbpaare, Griff ins Dunkle), **sechs
  Spielstile** mit sichtbarem Tick (Nr. 173), die KI sieht nur den Tisch.
- **Einsätze und Kosmetik** (Nr. 174), Musik »Kartenabend«, Herbstbuch-Seite
  »Menschenkunde«.

*Prüfen:* Regeln im Simulator, Fairness (vertauschte verdeckte Karten ändern
den Zug der KI nicht), eine Partie mit echten Tasten, Belohnung.

#### N4 – Probespiel des Auftraggebers ✓

*Umgesetzt (29.09.2026), vor M29 eingeschoben:* Hinweise spricht **Edda** über
Funk im Comic-Feld unten rechts (Nr. 180), Vorrat, Nachtplan und Meldungen stehen
rechtsbündig in der rechten Spalte. Die Laterne brennt nur nach F und geht morgens
aus, Werkzeug und Waffe hängen auf dem Rücken und kommen beim Benutzen in die Hand
(Nr. 183). Frische Kürbisse. Das Haus ist innen größer (Nr. 182); Möbel und
Kleinkram bestellt Mika über das Funkgerät aus **Balduins Katalog**, er bringt sie
am nächsten Morgen, eine Lieferkarte zeigt sie groß (Nr. 181). Spielstand v23.
#### N5 – Ankunft und Einführung ✓

*Umgesetzt (29.09.2026), nach N4:* Ein neues Spiel beginnt mit Mikas **Ankunft**
(Nr. 184): Titelkarte, Ruderboot im Morgennebel, Steg, Eddas Funkgerät; Esc
halten überspringt sie. Dann spricht **Edda**; mit Einführung zeigt sie die Wege
und erklärt danach Schritt für Schritt über Funk (Nr. 185, abwählbar im
Titelbild). Die **Figur** ist wählbar, Frau oder Mann (Nr. 186). Erklärungen
stehen im Titelbild im Kasten an der gewählten Zeile (Nr. 187). Spielstand v24.

#### M29 – Bindung und Alltag ✓

*Ziel:* Aus Mitbewohnern werden Freunde – über gemeinsame Zeit, nicht über
Punkte.

*Vorbild:* das Lagerfeuer in Red Dead Redemption 2, der Tee in Fire Emblem:
Three Houses, das Fotoalbum in Final Fantasy XV, die Szenenrollen in
Wildermyth.

*Umgesetzt (29.09.2026):* vier stille Stufen aus gemeinsamer Zeit (Kartenabend,
Feuer, erstes Gespräch des Tages, Seite an Seite), Gesten (Gruß, Spitzname,
Platz am Feuer), drei Bindungsmomente je Figur, siebzehn Erinnerungsstücke mit
Geschenkkarte und Erinnerungsregal (Nr. 188); zwanzig geteilte Szenen mit Rollen
nach Temperament, morgens über die Nacht und abends am Feuer; Posten nur
Unterstützung (Leimgläser, Blenden, Flicken, Heilen); die übrigen acht Wanderer
(zwölf im Pool). Gemeinsam kochen (Nr. 171) folgt mit der Küche in einem
späteren Meilenstein; Angeln kommt mit M33. Spielstand v25.

#### M30 – Waffenschrank und Übungsplatz ✓

*Ziel:* Die Bewohner können sich wehren, wenn es sein muss – und Mika bekommt
eine echte Waffe mit Gegenseite.

*Vorbild:* Death Road to Canada, Enter the Gungeon, Nuclear Throne (Wucht),
State of Decay 2 (Waffenschrank).

*Umgesetzt (29.09.2026):*
- Der Waffenschrank in der Stube mit sieben Waffen und einer Notfallwaffe je
  Person; er öffnet sich nach der ersten gehaltenen Nacht (Nr. 189).
- Mika schießt: Magazin, Nachladen, Mündungsfeuer, Hülsen bis zum Morgen,
  Leuchtspur, Sporen statt Blut, Lärm lockt an.
- Munition für alle: Patronen von Balduin, Schrot und Leuchtkugeln von der
  Werkbank.
- Der Übungsplatz mit Übung 0–3; wer übt, dessen Fähigkeit ruht. Übt Mika mit,
  zählt es als gemeinsame Zeit.
- Spielstand v26.

#### M31 – Die Lagerglocke ✓

*Ziel:* Die schwerste Entscheidung der Nacht: allein halten oder alle rufen.

*Vorbild:* der Rasenmäher in Plants vs. Zombies, XCOM (Ausbluten,
Gedenkwand), Darkest Dungeon (der Treffer auf null tötet nie).

- **Die Glocke am Feuer** (Nr. 165, 190): Bau im Hof, E halten nach einem
  Durchbruch, einmal je Nacht; die Tafel »Wer kommt?«; Kampf der Bewohner nur
  innerhalb des Walls mit ihren Notfallwaffen und der gemeinsamen Munition.
- **Zu Boden, Rettung, Verwundung, Narbe, Tod** (Nr. 166, 167); das
  **Erinnerungsbrett** am Steg mit Laterne und Karte (Nr. 170), die Seite
  »Erinnerung« im Herbstbuch; Einstellung »Verluste« im Titelbild und im
  Pausenmenü.

*Prüfen:* Glocke nur nach einem Durchbruch und einmal je Nacht, Rettung mit
echter Taste, Tod nur nach der Glocke und nie auf »Gemütlich«, Speichern.

#### M32 – Netzwerk und Wiedersehen ✓

*Ziel:* Wer weitergezogen ist, bleibt in der Welt.

*Vorbild:* die Briefe in Death Stranding, die Post in Stardew Valley, die
Enklaven in State of Decay 2.

- **Briefe** im Briefkasten mit Fahne (Oma Hilde bringt sie), **Pakete** mit
  Balduin, **Stimmen** über Junas Funkgerät, **Besuch** zum Fest und
  **Rückkehr** über Balduins Einladung (Nr. 164, 191).
- In der Frostnacht brennen **Signalfeuer** auf den Inseln; jede Figur hat ihr
  **Motiv** in der Spieluhr; nach dem Herbst kommt **Edda nach Hause**.

*Prüfen:* Brief und Paket kommen, Rückkehr, Signalfeuer in der Frostnacht, Edda
zu Hause (Abschnitt `netzwerk`).

#### M33 – Angeln am Steg, Licht und Schwellen ✓

*Ziel:* die zweite Abendaktivität und der letzte Glanz.

- **Angeln am Steg** als Abendaktivität, allein oder mit einem Menschen (Fiete
  bringt es bei, sonst hat Balduin eine Angel): Wurf mit Kraft, warten, anschlagen,
  Drill mit dem Kescher, Fangkarte, Korb für Balduin, Flaschenpost von der Insel im
  Nebel (Nr. 192).
- **Lebendige Lichtinseln** (nacheinander an, Flammen atmen, Fensterlicht,
  Spiegelungen im See), **Tiefe ohne Unschärfe** (Dunst nach Norden),
  **inszenierte Schwellen** (Nr. 176).

*Prüfen:* Angeln mit echten Tasten, Bilder der Lichtinseln (Abschnitt `angeln`).

#### N6 – Mit dem Ruderboot zu den Inseln ✓

*Umgesetzt (30.09.2026), Wunsch des Auftraggebers vom 29.09.:* Mikas Ruderboot
(N5) leckt; mit Holz und Fasern abgedichtet, rudert es tagsüber zu den drei
Felsinseln (Nr. 193). Die Netzinsel hat ein verlassenes Zelt mit einer Seite aus
Eddas Funkbuch und ein altes Netz, die Bankinsel eine Steinbank mit Aussicht und
eine Fundkiste, die Kürbisinsel wilde Kürbisse und eine Katze, die mitkommt und
vor der Tür sitzt. Um halb sieben geht es von selbst heim. Spielstand v30.

*Als Nächstes (N7):* die Insel im Nebel – bei Morgennebel und Windstille der Glocke
nach, Marthe und die Kinder in die Bucht holen.

#### N7 – Die Insel im Nebel ✓

*Umgesetzt (30.09.2026):* Nach der Spur (Eddas Funkbuch im Zelt oder die dritte
Flaschenpost) läutet morgens von 07:00 bis 09:30 Marthes Schiffsglocke im Nordosten
(Nr. 194). »Der Glocke nach«: Mika rudert in den Seenebel und lenkt selbst dem Klang
nach (WASD, Strömung, Glocken-Marke); wer sie verliert, versucht es am nächsten
Morgen. Auf der Insel warten Marthe und ihre Kinder Pim und Lu (kleineres Rig); ihr
Kahn leckt. Mit Nägeln (Werkbank) und Zucker (Balduin oder Hilde) flickt Marthe ihn,
am Morgen danach gleitet der Kahn an den Steg: Marthe stellt eine Reuse auf, die
Kinder spielen im Hof. Spielstand v31.

#### N8 – Eddas Funkbuch und die Glocke am Steg ✓

*Umgesetzt (30.09.2026):* Vier Seiten aus Eddas Funkbuch – unter einem Stein auf der
großen Insel, in einer Blechdose auf der kleinen, im Zelt der Nordinsel und die letzte
bei Marthe – erzählen, wie der Moder kam, von Radio Stillwald und warum Edda die
Holzlände verließ (Nr. 195); im Herbstbuch zum Nachlesen, mit allen vier meldet sich
Edda. Marthes Glocke hängt am Steg: E ruft die Kinder, Balduin wird begrüßt.

### Der Plan ab 30.09.2026 – Rückmeldung: Nebel, Schlurfer, HUD, Geschichte

Der Auftraggeber am Morgen des 30.09.: Der Nebel flackert noch, die Schlurfer sollen 2D-Sprites
in 8 Richtungen werden, die Geschichte ist dünn, die Ortsnamen sind schwach, das HUD ist
unübersichtlich und die Bauleiste unlesbar. Drei Recherchen (`recherche/schlurfer-sprites.md`,
`recherche/hud-baumenue.md`, `recherche/storytelling-namen.md`), Entscheidungen Nr. 196–198.
Reihenfolge – Fehler zuerst, jeder Schritt für sich spielbar:

1. **Nebel:** die Ursache messen (Bildfolgen mit und ohne Nebel), beheben. Dazu kommt das
   fertige N9 (Drachenwetter) in dieselbe Prüfung.
2. **H1 – Das neue Baumenü:** zu und offen mit Tab, Bilder aus den Modellen, Preise in der
   Hauptschrift, Bauzettel, Preis am Geist, Rückfrage auf der Kachel, keine gekürzte Leiste mehr,
   Edda kompakt unten links.
3. **G1 – Namen:** alle Umbenennungen, Widersprüche beheben (die Seewelle, Norderholm, Eddas
   Wohnort am Sturmhuk, Brandt als Marthes Vater).
4. **F1 – Ein Schlurfer auf Papier:** der Sprite-Prototyp mit Umschalter und Vergleichsbildern –
   danach entscheidet der Auftraggeber über F2–F4.
5. **H2 – Aufräumen:** Meldungen nach Art (höchstens zwei), Nachtplan und Alarme in der
   Nachtleiste, die gefundenen Überlappungen beheben.
6. **F2–F4** (Auftraggeber 30.09.: »testen wir bitte. Aber die Designs dürfen nur Grundlage
   sein«): Wenn alles andere erledigt ist, werden die Figuren erst in Ruhe liebevoll und
   detailliert neu gestaltet (F-Design). Danach kommen alle Arten und die Bosse in 8 Richtungen
   ins Spiel, und es wird angesehen, wie es wirkt.
7. **G2–G5:** die Fäden verknoten, der Wald erzählt, die Uhr bis zum Frost, die Herbstbuch-Seite
   »Ortskunde«.
8. **H3–H5:** feste Zonen, Oberflächengröße, Reiter nach Zweck.

#### N9 – Drachenwetter ✓

*Umgesetzt (30.09.2026):* Pim wünscht sich an einem Windtag einen Drachen; mit Stoff,
Fasern und Holz baut Marthe ihn über Nacht, Lu malt eine Katze darauf (Nr. 199). An
Wind- und klaren Tagen steht er über dem Strand; E bei Pim gibt Mika die Leine, mitten in
einer Böe dreht E einen Looping – drei hintereinander sind die Tat »Drachenwetter«.

#### Nebel – der Dunst flackert nicht mehr ✓

*Umgesetzt (30.09.2026):* gemessen statt vermutet – die Nebelbänke flackerten kaum noch, aber
Dunst und Vignette hingen am Bildschirm vor dem Raster der Palette und ließen beim Gehen nach
Norden Tausende Pixel kippen. Jetzt liegen sie weich dahinter (Nr. 200), der Abschnitt `nebel`
misst es bei jedem Lauf.

#### H1 – Das neue Baumenü ✓

*Umgesetzt (30.09.2026):* Zugeklappt ein Knopf »Bauen [Tab]«, offen Kacheln mit Bildern aus den
Modellen, Preisen in der Hauptschrift und einem Bauzettel; Preis und Grund am Baugeist,
Rückfragen auf der Kachel, »weiter« statt stiller Kürzung, Reiter »Helfer« und »Leute«, Edda
kompakt unten links (Nr. 201).

#### G1 – Namen mit Herkunft ✓

*Umgesetzt (30.09.2026):* See, Bucht, Inseln, Dörfer und sichere Orte tragen Namen mit Herkunft
(Nr. 202):

- Kranichsee, Ellerbucht und die alte Holzlände.
- Die Inseln Wartholm, Kiekwerder und Kürbisholm, dazu der Apfelwerder.
- Norderholm, Eulenbruch, Sonnenkamp, Sturmhuk, Glühwürmchen, Aalbek, Hammermühle, Sankt Luzia.

Die Seewelle ist jetzt eine Geschichte (Junas Vater baut, Edda liest, Juna sendet), der alte
Mast heißt der Lange Jakob, Brandt ist Marthes Vater, Edda wohnt am Sturmhuk. Die Karte zeigt
die alten Wegnamen, die Bucht und die besuchten Inseln. Nur Text und Karte, die IDs bleiben.

#### F1 – Ein Schlurfer auf Papier ✓

*Umgesetzt (30.09.2026):* die Sprite-Probe für den Schlurfer (Nr. 203), zu finden unter
Einstellungen: »Schlurfer: 2D (Probe)«.

- Aus runden Formen gebacken, gemalt nach Pixelregeln.
- 5 gezeichnete und 3 gespiegelte Richtungen; gehen, stehen, Treffer, Zusammensacken.
- Ein aufrechter Quad je Schlurfer, auf ganze Bildpunkte eingerastet; Richtung mit Hysterese.

Die übrigen Arten bleiben Voxel, bis der Auftraggeber über F2–F4 entscheidet.

#### H2 – Aufräumen ✓

*Umgesetzt (30.09.2026):* Meldungen nach Art (Nr. 204):

- Rechts stehen höchstens zwei.
- Alarme stehen rot in der Nachtleiste.
- Neues im Buch hängt als Lesezeichen an der Uhr.

Der Nachtplan steht in der Nachtleiste (die nächste Welle, »N«, »M: der ganze Plan«), der ganze
Plan auf der Karte. Der Zeitraffer ist ein Zeichen, die Zahlen stehen in der Hauptschrift. Die
Überlappungen aus der Recherche (Ziel, Meldungen, Boss, Champion) sind behoben.

#### G2 – Fäden verknoten ✓

*Umgesetzt (30.09.2026):* Knoten der Geschichte (Nr. 205, `data/knots.js`), jeder einmal beim
nächsten Gespräch:

- Hilde erkennt Edda (ab Tag 13) und stellt nach der Heimkehr den Brief zu.
- Yusuf erkennt Knopfs roten Faden (ab Tag 16).
- Edda erkennt Juna.

Dazu kleine Zeilen für Ida, Rosa, Balduin (der Name am Bug) und Claras zweiten Brief vom
Sturmhuk.

#### G3 – Der Wald erzählt ✓

*Umgesetzt (30.09.2026):* Die Waldrand-Gedanken folgen den Schichten des Moders – Volksmund ab
Tag 7, Alte Ablage ab Tag 13, Frost ab Tag 20, Schnee danach. Hilde und Yusuf streiten über
Moosleute und Pilz. Edda erzählt nach jedem Boss ein Stück. Die Stümpfe mit drei Kreuzen als
Modell bleiben offen (Nr. 206).

#### G4 – Die Uhr bis zum Frost ✓

*Umgesetzt (30.09.2026):* Tag n ist der n. Oktober (Datum an der Uhr). Die Natur steht im
Morgenbericht (Kraniche, Pegel, Reif, Eis; die letzten Kraniche am Tag 29). Edda funkt ihre
Jahrestage an den Tagen 12, 14 und 20, und in der Frostnacht bleibt sie dran. Danach kommen
Frau Holle, Junas Pfeifen, Yusufs letzte Notiz und »Mikas Bucht« im Abspann und auf der Karte
(Nr. 207).

#### G5 – Ortskunde ✓

*Umgesetzt (30.09.2026):* Das Herbstbuch hat eine Seite »Orte«. 24 Orte der Holzmark erscheinen,
sobald Mika sie kennt (Wegweiser, Radio, Gespräche, Landgang, Nebel, Zufluchtsorte), jeder mit
der Herkunft seines Namens und Zeilen, die mit der Geschichte dazukommen (Almas Ruh, Hildes
Brief, Mikas Bucht). Neue Orte melden sich in der Chronik. Die Reiter des Buchs brechen in zwei
Reihen um, lange Seiten blättern spaltenweise (Nr. 208).

#### H3 – Zonen ✓

*Umgesetzt (30.09.2026):* Jede Tafel hat ihre Zone (oben links Uhr und Ziel, oben Mitte die
Nachtleiste, oben rechts Vorrat und Meldungen, unten links Mikas Leiste mit Edda, unten rechts
das Baumenü), die Mitte gehört der Welt. Der Vorrat zeigt die Grundsorten und Seltenes nur,
wenn es zählt; das Ziel ist eine Zeile und in der Welle aus; die Schnellleiste reicht bis zum
letzten belegten Platz; Fähigkeiten zeigen nur belegte Kacheln (Nr. 209).

#### H4 – Oberflächengröße ✓

*Umgesetzt (30.09.2026):* Die Einstellung »Oberfläche: klein · mittel · groß« verschiebt den
Faktor der Oberfläche um einen Schritt (bei 1920 × 1080: 540, 360, 270 Zeilen), in den Grenzen
270 bis 540 Zeilen, sonst mit dem Hinweis »(hier wie mittel)«. Pausenmenü und Herbstbuch passen
sich der Höhe an, Edda weicht dem offenen Baumenü aus; die Kacheln bleiben groß (Nr. 210).

#### H4b – Jedes Fenster passt ✓

*Umgesetzt (30.09.2026):* Waffenschrank, Morgenbericht, Werkbank/Handel und Katalog passen auch
bei 270 Zeilen (»Oberfläche: groß«) ins Bild; der Abschnitt `groesse` misst sie.

#### G6 – Kleine Wunder ✓

*Umgesetzt (30.09.2026):* Alte Stümpfe mit drei Kreuzen stehen am Waldrand (E: ein Gedanke,
nach Hildes Geschichte über die Moosleute). Der Sturmhuk blinkt kurz, kurz, lang als Randmarke,
ohne neue Lichtquelle: die ganze Frostnacht und abends, solange jemand dort ist. Der See singt,
sobald die Frostnacht gehalten ist. Balduins Plane liegt ab Tag 20 im Boot, und Hilde erzählt
von der Seepost (Nr. 211).

#### N10 – Das erste Feuer ✓

*Umgesetzt (30.09.2026):* In einem neuen Spiel sind Feuerstelle und Kamin kalt. Die ersten Ziele:
Streichhölzer vom Kaminsims holen, den Kamin anzünden, draußen das Lagerfeuer anzünden (zwei
Scheite, sonst Äste). Edda sieht den Rauch (Nr. 212).

#### F2 – Die Horde als Sprites ✓

*Umgesetzt (30.09.2026):* Alle 17 Formen aus dem Gestaltungsbogen stehen im Spiel, und 2D ist
der Standard (Nr. 213, Einstellung »Schlurfer: 3D/2D«).

- **Gebacken im Hintergrund:** Worker rechnen die Bilder, zuerst was im Bild steht, dann die
  Arten der kommenden Nacht, dann der Rest. Bosse nur, wenn sie kommen. Bis eine Art fertig ist,
  bleibt sie Voxel.
- **Jede Form in ihrer Größe:** Champions ×1,15 und die Teile des Moosriesen ×0,55 werden eigens
  gebacken, ein Texel bleibt 1/40 m. Der Schildträger ohne Tür hat seine eigene Form.
- **Zustände:** Ausholen und Schlag (drei Bilder), auch beim Boss. Der Falter fliegt im Bild, der
  Gräber sinkt gerastert in die Erde.
- **Unter den Füßen liegt das Bild auf dem Boden:** Laub, der vordere Fuß und eine hingesunkene
  Figur versinken nicht mehr in der Erde.

#### N11 – Das Startbild läuft von selbst ✓

*Umgesetzt (30.09.2026):* »Tales of Cue präsentiert« blendet von selbst ein und aus, etwa 3,5 s
lang, beim zweiten Mal kürzer. Jede Taste überspringt es. Die Titelmusik beginnt mit der ersten
Taste im Titelbild (der Browser erlaubt Klang erst dann), bis dahin zeigt ein stummer Lautsprecher
den Hinweis (Nr. 214, `recherche/praesentation.md`).

#### F3 – Nachts in 2D, der vierte Stern, die Schlurferkunde mit Bildern ✓

*Umgesetzt (30.09.2026):*

- **Nachts lesbar:** Eine echte Nacht in 2D angesehen. Um das Eigenlicht glimmt jetzt nachts ein
  Hof aus einem Texel, auch in der Nebelwelle. Champions tragen einen goldenen Rand (Nr. 217).
- **Der vierte Stern:** Auf »Wild« bringt eine Nacht, die ganz auf »Wild« lief, einen vierten
  Stern (Nr. 215, zu Nr. 118).
- **Die Schlurferkunde mit Bildern:** Jede Art steht von vorn neben ihrer Beschreibung,
  unbekannte als Schattenriss mit glimmendem Eigenlicht (Nr. 216).

#### F4 – Die Menschen als Sprites ✓ (erste Stufe)

*Auftrag (01.10.2026):* »Ja alles machen. Die Sprites als erstes. Dann gucke ich ob mir das
gefällt.« – zuerst die Menschen als Sprites, danach Spannung der Nächte, Spielstand als Datei,
Lektorat und die Reiter des Baumenüs.

*Umgesetzt (01.10.2026):*

- **Mika** in beiden Figuren und jedem Aussehen: Strickmütze mit Rippenbund, Streifen, Abnähern
  und Bommel, Jacke mit Reißverschluss und Taschenklappen, Rucksackriemen mit Schnallen, Rucksack
  mit Isomatte, Flicken am Knie, Stiefel mit Schnürung; dazu die Laterne, die glüht. Stehen,
  gehen, rennen, Schwung, Treffer, Hechtsprung, Suchen, Wurf, Jubel, Laternenblitz – und dasselbe
  mit der Laterne in der Hand.
- **Die Leute:** Oma Hilde (Postmütze mit Posthorn, Brille, Dutt, Strickjacke, Posttasche), Bert
  (Kappe, Bart, Karohemd, Schürze mit Bleistift), Juna (Kopfhörer, Spange, gelbe Regenjacke,
  Antenne am Rucksack), Dr. Yusuf (Kittel, Stethoskop, Brille, graue Schläfen), Balduin
  (Schiebermütze, Bart mit Goldzahn, Schal, Mantel, riesiger Rucksack, seine Gesten) und Knopf
  (Trab, Sitzen, Bellen, Schwanzwedeln, Halsband mit dem goldenen Knopf).
- **Gesichter als Flicken:** Ein Bild trägt das gewöhnliche Gesicht; jeder andere Ausdruck ist
  ein kleines Bild nur aus den Texeln, die sich ändern – so blinzeln, lächeln und zucken alle,
  ohne dass jede Pose sieben Mal gebacken wird.
- **Werkzeuge als eigenes Bild:** in 16 Winkelstufen um die Hand und schräg auf dem Rücken, vor
  oder hinter der Figur – je nachdem, ob es zur Kamera hin liegt.
- **Rückfall:** Was keine Fassung hat oder eine seltene Pose zeigt, bleibt Voxel (Nr. 218).

## 9. Ideen-Parkplatz

- Angeln am Steg (umgesetzt: M33), Kochen am Kamin mit kleinen Boni.
- Kürbisfest im Herbst, Laternenumzug, erster Schnee.
- Krähen, die etwas bringen (oder stehlen).
- Mit dem Boot die Inseln besuchen (umgesetzt: N6, mit Mikas Ruderboot); die Insel im Nebel (umgesetzt: N7).
- Was macht Balduin mit den Teilen? Eine eigene Geschichte.
- Briefe von Oma Hilde als Sammelobjekte (eingeplant: Netzwerk, M32).
- Fotomodus.

## 10. Der Spaß – was die Warcraft-3-Karten so gut machten

Auftrag des Auftraggebers: »Du prüfst, warum die Spielmechanik der
Tower-Defense-Karten aus Warcraft 3 so spaßig und beliebt war und wie wir
das noch besser auf unser Spiel übertragen.« Nach M15: »Jetzt steht der Rumpf
des Spiels, jetzt muss der Spaß rein.« Der Plan dazu steht in Abschnitt 8
(M16–M25).

### 10.1 Die Karten und ihr Kniff

| Karte | Der Kniff | Was daran Spaß machte |
|---|---|---|
| **Wintermaul** (auch Wintermaul Wars) | Türme sind die Wände: Man baut ein Labyrinth, die Horde läuft es ab; wer Durchgänge öffnet und schließt (»Jonglieren«), lässt sie umkehren | Raumdenken, eigene Lösungen, Meisterschaft |
| **Element TD** | Sechs Elemente, jedes schlägt ein anderes; zwei oder drei Elemente ergeben Doppel- und Dreifachtürme; Zinsen auf gespartes Gold, die bei einem Durchbruch verfallen | Kombinationen entdecken, ein eigener Bau-Weg je Spiel, Sparen gegen Ausgeben |
| **Gem TD** | Jede Runde fünf zufällige Edelsteine; einer bleibt Turm, der Rest wird Mauer; Rezepte machen aus passenden Steinen Spezialtürme | Glücksmomente, Rezepte suchen, jedes Spiel anders |
| **YouTD** | Hunderte Türme in Familien, Zufallsangebote, Türme sammeln Erfahrung, Gegenstände von besiegten Gegnern stecken in Türmen; eine Wellenliste zeigt, was kommt | Sammeln, an Türmen basteln, mit Vorwissen planen |
| **Green TD** | Viele Turmarten, besondere Wellen (fliegend, immun, unsichtbar) und alle paar Wellen ein Boss | Abwechslung – jede Welle stellt eine eigene Frage |
| **Legion TD, Line Tower Wars** | Einkommen wächst nur durch Wagnis (Söldner schicken), Einheiten statt Türme, ein König am Ende | Wagnis gegen Sicherheit, Spannung in jeder Runde |
| **Hero-Defense-Karten** (z. B. Enfo’s Team Survival) | Ein eigener Held mit Fähigkeiten und Gegenständen hält Wellen auf | Handeln statt Zusehen, Heldenmomente |

### 10.2 Acht Gründe, warum das Spaß machte

1. **Kurze Schleife, sichtbare Wirkung.** Bauen, Welle, Ergebnis – alle 30 bis
   60 Sekunden. Jede Entscheidung wird sofort geprüft; man sieht Geschosse,
   Treffer und Abschüsse.
2. **Kombinieren und Entdecken.** Eins und eins ergibt drei: Elemente,
   Rezepte, Auren, Gegenstände. Wer eine Kombination selbst findet, fühlt
   sich klug.
3. **Überraschung, die sich fair anfühlt.** Zufällige Steine, Angebote und
   Funde – aber immer mit einer Wahl. Jedes Spiel wird anders.
4. **Wachsen, das man sieht.** Türme steigen auf, sammeln Erfahrung, tragen
   Gegenstände; das Bild füllt sich mit Wirkung. Man hängt an »seinem« Turm.
5. **Jede Welle stellt eine Frage.** Fliegend, gepanzert, unsichtbar,
   heilend, Boss – kein Turm löst alles; man mischt und plant voraus.
6. **Wagnis gegen Sicherheit.** Zinsen, Einkommen, Wellen früher rufen: Wer
   sich etwas traut, wird belohnt – und kann scheitern.
7. **Meisterschaft.** Labyrinthe, Jonglieren, Schwierigkeitsgrade, Bestwerte:
   leicht zu lernen, schwer zu meistern.
8. **Ein Held und Mitspieler.** Ein Held mit Fähigkeiten, Teams, die
   gemeinsam halten; wer die Lücke schließt, ist der Held des Abends.

Dazu kam, was Warcraft 3 selbst mitbrachte: klare Anzeigen (Reichweiten,
Schaden, Beschreibungen), kurze Partien und ein Ende – die letzte Welle.

### 10.3 Was wir übernehmen – und was nicht

**Übernehmen,** angepasst an Bucht, Wege und cozy Herbst:

- Held mit Fähigkeiten → Mika bekommt aktive Fähigkeiten (M16).
- Kombinieren → Zustände und Reaktionen (M18), Mischtürme (M20).
- Überraschung mit Wahl → Baupläne nach gewonnenen Nächten (M19),
  Fundkisten von Champions (M21).
- Wachsen → Türme mit Erfahrung, Rang und Namen (M16), Turmteile
  verschiedener Seltenheit (M21).
- Wellen mit Fragen → Nachtplan (M16), Wellenmerkmale, neue Arten und
  Bosse (M22).
- Wagnis → Wellen früher rufen (M16), Moderlocke, makellose Nächte,
  Vorratskammer (M24).
- Meisterschaft → Schwierigkeitsgrade (M16), Sterne, Finale, danach
  Weiterspielen mit Roguelike-Nächten (M25).
- Burgverteidigung → Tor und Wall ums Lager, die man Nacht für Nacht
  aufrüstet (M17, Wunsch des Auftraggebers).
- Mitspieler → Posten der Überlebenden, Nebenaufträge (M23).

**Nicht übernehmen:**

- Kein Gegeneinander: Zomfy bleibt ein Spiel für eine Person; das Wagnis
  wählt man selbst.
- Kein Labyrinth aus Türmen und kein Umlenken: Türme stehen nie auf Wegen
  (Grundregel 2), und die Horde wird nicht auf Umwege gelenkt – »so wartet
  man ja nur darauf, dass die Monster weg sind« (Auftraggeber, OFFENE-FRAGEN
  66).
- Keine Hunderte Türme: lieber wenige Familien mit Charakter (acht bis
  zehn), die sich spürbar unterscheiden.
- Keine Hektik ohne Ausweg: Bauen geht jederzeit, Tempo ist ein Angebot,
  keine Pflicht.

### 10.4 Leitlinien für jeden Spaß-Meilenstein

- Jede neue Mechanik wirkt in der ersten Nacht, in der sie auftaucht,
  **sichtbar** (Anzeige, Effekt, ein Wort über dem Schlurfer).
- Jede Wahl hat eine Gegenseite – kein »immer besser«.
- Werte stehen in `src/data/`, nie im Code; jede Mechanik bekommt Prüfpunkte.
- Cozy bleibt: kein Blut, keine Häme, Bosse mit Namen und Witz, die Welt
  bleibt warm und die Wege bleiben lesbar.
