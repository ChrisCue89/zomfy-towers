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
   Verteidigung an der Basis.**
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
   genau dieser Ort verteidigt werden.
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
      zerstört → Zombies erreichen vielleicht die Basis → die Figur
      verteidigt selbst → die Welle endet.
    - **Morgen:** Die Folgen der Nacht sind zu sehen → Zombie-Überreste
      einsammeln → Schäden reparieren → ein neuer Tag beginnt.

## 1. Vision

Nach dem Zusammenbruch ist die Welt still geworden. Am Ufer des **Stillsees**,
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
dem Stillwald über alte Holzfäller- und Wildpfade, die sich verzweigen und
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
  Warcraft-3-Custom-Maps.
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
  (westlicher Comic).
- **Technik:** echte 3D-Szene (three.js) aus Voxel-Modellen, alles im Code
  erzeugt – keine fremden Assets. Orthografische Dreiviertel-Kamera mit
  **Blick nach Norden**: der See am rechten Rand, die Landseite mit den
  Spawns links, die Wege dazwischen hauptsächlich von links nach rechts. Die
  Kamera folgt der Figur.
- **Der Pixel-Look ist kein Selbstzweck mehr.** Er bleibt als Stilmittel –
  niedrig gerendert und scharf hochskaliert, dunkle farbige Umrisse,
  begrenzte Palette mit Dithering, Kamera auf dem Pixelraster –, aber
  **Lesbarkeit und Stimmung gehen vor**: alle Modelle im feinen Maß
  (1/16 m), und wo feinere Auflösung oder weichere Übergänge helfen, werden
  sie genutzt.
- Maße seit Meilenstein 5: 80 Spielpixel pro Meter, etwa 900 Bildzeilen
  (Full HD 1 : 1, 1440p ×2, 720p ×1). Ein 1/16-m-Voxel ist genau 5 px breit,
  3 px tief und 4 px hoch (Neigung 3 : 4). Die Größe bleibt so (Wunsch des
  Auftraggebers); mehr Einzelheiten kommen aus feineren Modellen, nicht aus
  einem größeren Maßstab. Z geht auf Wunsch nah heran (160 px/m wie drinnen,
  M13). Der Boden hat 1/16 m je Texel. Die Oberfläche hat eine eigene,
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
  Spiele, Figuren oder Marken.
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
  **Oben rechts:** Vorrat. **Oben Mitte (nachts):** Welle und
  Standfestigkeit des Zuhauses.
- **Unten links:** Laterne (Taste F) und Schnellleiste (8 Plätze).
  **Unten rechts:** Bauleiste. Lebensbalken der Figur über der
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
- Testspieler prüfen in jeder Runde: »Erkennt man, was was ist, und sieht
  man, wo die Horde langläuft?«

## 4. Welt und Geschichte

### 4.1 Hintergrund

Vor ein paar Jahren ist die Welt einfach stehen geblieben. Seitdem schlurfen
**Schlurfer** durch die Wälder: Menschen, die der **Moder** erwischt hat – ein
Pilzgeflecht, das sie träge, grummelig und nachtaktiv macht. Tagsüber dösen
sie im Wald, nachts ziehen sie in Scharen los, angelockt von Wärme und
Stimmen. Wasser meiden sie – deshalb ist die Seeseite sicher. Helles, warmes
Licht macht sie langsamer.

### 4.2 Der Ort

Eine kleine **Bucht am Stillsee**: ein altes Fischerhaus mit Steg und
Veranda, ein Hof mit Feuerstelle, ein verwilderter Garten. Landeinwärts
steigt der **Stillwald** an – dicht, felsig, voller Hänge. Nur ein paar alte
**Holzfäller- und Wildpfade** führen hindurch; sie verzweigen sich und laufen
kurz vor der Bucht zusammen. Über sie kommt die Horde. Auf dem See liegen
Inseln im Nebel; von dort kommt nur Balduins Boot.

### 4.3 Hauptfigur

**Mika**, früher Hausmeister\*in in einem Wohnblock, kann fast alles
reparieren und redet gern mit sich selbst. Name und Aussehen sind auf dem
Titelbild wählbar.

### 4.4 Roter Faden

Aus dem alten Fischerhaus wird ein Zuhause, aus dem Zuhause ein Zufluchtsort
für andere Überlebende. Mit Juna wird der alte **Leuchtmast am Steg** wieder
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
Tage sind klar. Die Uhr zeigt es neben dem Tag, der Morgen sagt es an. Auf
Werte wirkt es nicht (OFFENE-FRAGEN 99).

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

- **Rechts** liegt der Stillsee. Am Ufer steht das Fischerhaus mit Steg, davor
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
- **Garten und Gewächshaus:** Beete geben täglich Fasern, später Kräuter
  und Kürbisse.
- Abreißen gibt Material zurück (Zuhause-Bauten ganz, Türme und Barrikaden
  zu 70 %).

### 6.9 Türme

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
| **Weitere Hindernisse** | z. B. Stacheln, die Angreifer verletzen | – | – | später |

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

- Wer alle Barrikaden überwindet, erreicht den Hof und schlägt auf das Haus
  ein. Mika wehrt ab, was durchkommt – Türme am letzten Abschnitt helfen.
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
  halten schlägt weiter. Mika schlägt mit dem, was sie in der Hand hat
  (Waffe, Axt, Spitzhacke, sonst Fäuste); knapp außer Reichweite macht sie
  einen **Ausfallschritt**.
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
- **Roter Faden – das Leuchtfeuer:** Mit Juna in drei Stufen am Leuchtmast
  auf dem Steg: Leiter und Plattform, Antenne mit Kabeln, Leuchtfeuer
  (braucht einen Moderkern). Das Leuchtfeuer brennt jede Nacht über dem See
  und bremst Schlurfer in seinem Schein.

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
  **Upgrades und Werkzeuge**, später Saatgut und Möbel. Manches nur in
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

### 6.20 Titelbild und Einstellungen

- **Titelbild:** großer Schriftzug über der Bucht im Abendlicht.
  Weiterspielen, Neues Spiel (Name und Aussehen), Einstellungen, Steuerung.
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
Meilenstein folgen Playtests mit Testspieler-Agenten (siehe `CLAUDE.md`),
Nachbesserung, Prüfablauf, Commit.

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

### Meilenstein 13 – Detailgrad: alles im feinen Maß

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
- Grundflächen und Kollision bleiben, wie sie sind; die Bildzeit wird vorher
  und nachher gemessen. Testrunde mit der Frage »Erkennt man, was was ist?«.

### Meilenstein 14 – Balance und Testrunden

- Balance über zehn und mehr Nächte an den Wegen (Vorschläge liegen beim
  Auftraggeber), Testrunden mit allen Personas, Feinschliff.

## 9. Ideen-Parkplatz

- Angeln am Steg, Kochen am Kamin mit kleinen Boni.
- Kürbisfest im Herbst, Laternenumzug, erster Schnee.
- Krähen, die etwas bringen (oder stehlen).
- Mit Balduins Boot eine Insel besuchen.
- Was macht Balduin mit den Teilen? Eine eigene Geschichte.
- Briefe von Oma Hilde als Sammelobjekte.
- Fotomodus.
