# Zomfy Towers – Design-Dokument

> Gemütliche Herbst-Endzeit an einem nordischen See. Tagsüber ein Zuhause am
> Wasser, nachts Tower Defense an einer klaren Strecke – mit Türmen,
> Barrikaden und der eigenen Figur als letzter Verteidigung. Ein 3D-Spiel im
> Browser, alles im Code erzeugt.

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
   Zombies. Sie greifen nur von der Landseite an, und zwar entlang **einer
   klar erkennbaren Strecke** vom Waldrand bis zur Basis. Es gibt keine
   über die Karte verstreuten Angriffswege. Links und rechts begrenzen Wald,
   Felsen, Hänge und Gestrüpp die Strecke so natürlich, dass man versteht,
   warum die Horde genau diesen Weg nimmt.
2. **Türme stehen nie auf der Strecke,** sondern auf Baupunkten links und
   rechts davon, und greifen die Vorbeiziehenden von der Seite an: Spawn →
   Strecke → mehrere Verteidigungsabschnitte → letzte Verteidigung → Basis.
   Die Strecke darf leicht geschwungen sein (Reichweiten, Kreuzfeuer), aber
   nie so verwinkelt, dass man nicht sofort sieht, woher die Horde kommt und
   wohin sie will.
3. **Barrikaden stehen bewusst auf der Strecke.** Sie halten die Horde auf,
   haben Lebenspunkte, werden nachts angegriffen und zerstört und tagsüber
   geflickt oder neu gebaut. Keine festen Mauern, sondern Handgebautes aus
   Brettern, Stämmen, alten Türen, Zäunen und Blech – in vier Ausbaustufen.
4. **Letzte Verteidigung:** Wer Türme und Barrikaden überwindet, erreicht
   den Platz vor dem Haus. Dort verteidigt die Figur selbst. Die Basis hat
   eigene Lebenspunkte; fällt sie, ist die Nacht verloren. Drei Ebenen:
   **Türme entlang der Strecke – Barrikaden auf der Strecke – persönliche
   Verteidigung an der Basis.**
5. **Der Tag ist ruhig** und bildet den starken Kontrast zur Nacht:
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
8. **Zombie-Überreste** bleiben nach der Nacht liegen. Balduin will sie aus
   einem nicht erklärten Grund haben und tauscht Material dafür. Warum er sie
   sammelt, bleibt vorerst offen – ein schwarzhumoriger Running Gag, der
   später Teil der Geschichte werden kann.
9. **Stimmung:** cozy, herbstlich, Spooky Season, leicht humorvoll,
   charmant, etwas melancholisch, gelegentlich gruselig, grundsätzlich warm
   und einladend. Grobe Richtung: Stardew-Valley-Gemütlichkeit mit etwas
   Anime und westlichem Comicstil – das beschreibt Stimmung, Figuren und
   Farbwelt, keine Pflicht zur Pixelgrafik.
10. **Tag-Nacht-Kontrast:** Tag ruhig, warm, gemütlich; Nacht angespannt und
    dunkel – aber dieselbe cozy Herbstwelt. Warme Fenster, Feuer, Laternen
    und Verteidigungsanlagen sind Lichtinseln in der kalten Nacht. Keine
    Horror-Ästhetik.
11. **Lesbarkeit der Karte – unveränderliche Grundregel.** Im Bild (die
    Kamera blickt nach Norden) von oben nach unten:

    ```
    WASSER                                 oben im Bild (Norden)
    BASIS / HAUS / STEG
    LETZTE VERTEIDIGUNG
    STRECKE MIT BARRIKADEN
    TÜRME LINKS UND RECHTS DER STRECKE
    WEITERE BARRIKADEN
    WALD / LANDSEITE / ZOMBIE-SPAWN         unten im Bild (Süden)
    ```

    Die Strecke ist immer klar zu erkennen. Türme dürfen sie nie blockieren,
    Barrikaden stehen bewusst darauf.
12. **Die Spielschleife:**
    - **Tag:** Schäden begutachten → Ressourcen verwalten → Barrikaden
      reparieren → Türme bauen oder verbessern → Haus und Basis ausbauen →
      Nebenaufträge → Balduin und andere treffen → handeln → die nächste
      Nacht vorbereiten.
    - **Nacht:** Welle startet → Zombies betreten die Strecke → Türme greifen
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
reden, am Steg mit Balduin handeln. Keine Schlurfer, nur Herbstwind und
Arbeit.

**Die Nacht** ist Tower Defense an einer klaren Strecke: Die Horde kommt aus
dem Stillwald über den alten Holzfällerweg zur Bucht. Türme links und rechts
schießen, Barrikaden auf dem Weg halten sie auf und gehen zu Bruch. Was
durchkommt, erreicht den Hof vor dem Haus – dort kämpft die Figur selbst.
Jede Nacht wird die Horde stärker.

**Der Kern des Gefühls** ist der Kontrast zwischen dem warmen Zuhause am
Wasser und der kalten Herbstnacht an der Strecke – und die ständige
Entscheidung, wohin das Material fließt: in Türme, Barrikaden, die eigene
Figur oder das Zuhause.

### Pitch in einem Satz

*Ein altes Fischerhaus am See wird Tag für Tag zum Zuhause – und jede Nacht
zeigt sich an der Strecke, ob Türme und Barrikaden halten.*

### Mechanische Vorbilder (nur Mechanik, nie Look oder Inhalte)

- **Tower Defense mit fester Strecke und Baupunkten:** Die Horde läuft einen
  Weg ab, Türme stehen an vorgegebenen Plätzen daneben; Kurven ergeben
  Kreuzfeuer, die Strecke gliedert sich in Abschnitte.
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
3. **Die Strecke ist immer lesbar.** Man sieht jederzeit, woher die Horde
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
  **Blick nach Norden**: der See oben im Bild, der Wald mit dem Spawn unten,
  die Strecke dazwischen von unten nach oben. Die Kamera folgt der Figur.
- **Der Pixel-Look ist kein Selbstzweck mehr.** Er bleibt als Stilmittel –
  niedrig gerendert und scharf hochskaliert, dunkle farbige Umrisse,
  begrenzte Palette mit Dithering, Kamera auf dem Pixelraster –, aber
  **Lesbarkeit und Stimmung gehen vor**: alle Modelle im feinen Maß
  (1/16 m), und wo feinere Auflösung oder weichere Übergänge helfen, werden
  sie genutzt.
- Maße seit Meilenstein 5: 80 Spielpixel pro Meter, etwa 900 Bildzeilen
  (Full HD 1 : 1, 1440p ×2, 720p ×1). Ein 1/16-m-Voxel ist genau 5 px breit,
  3 px tief und 4 px hoch (Neigung 3 : 4). Die Oberfläche hat eine eigene,
  gröbere Leinwand (etwa 360 Zeilen), damit Schrift und Leisten kräftig
  bleiben.

### 3.2 Licht, Tageszeiten und Wetter

- **Morgen:** Nebel über dem Wasser, rosa-goldenes Licht. **Tag:** warmes
  Herbstlicht, kühle Schatten. **Abend:** goldenes Licht, lange Schatten,
  Lampen und Fackeln gehen an. **Nacht:** kaltes Blau, Mond über dem See –
  und warme Lichtinseln: Fenster, Kamin, Feuer, Laternen, Fackeln an der
  Strecke, Türme.
- **Wetter:** klare Tage, Nieselregen, Wind mit fallendem Laub,
  Nebelmorgen; kalte Nächte mit Atemwölkchen.
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
- Freie **Baupunkte** und **Barrikadenplätze** leuchten auf, sobald man
  einen Turm oder eine Barrikade in der Bauleiste gewählt hat.
- Gedanken der Figur sind Sprechblasen und halten das Spiel nie an;
  Dialoge mit Porträt, Schreibmaschinen-Effekt und Antworten.

### 3.6 Lesbarkeit

- **Man muss auf einen Blick erkennen, was was ist:** Figur, Schlurfer-Arten,
  Türme, Barrikaden und ihre Stufe, Loot, Rohstoffquellen, Bauten.
- **Die Strecke ist immer eindeutig:** ein heller, festgetretener Weg mit
  klaren Rändern (Steine, Wurzeln, Grasbüschel), nachts mit Fackeln und
  einem Hauch Eigenlicht. **Baupunkte** sind sichtbare Holzplattformen
  neben dem Weg, **Barrikadenplätze** erkennt man an Pfosten am Wegrand.
- Nachts bekommt alles, worum es im Kampf geht, einen Hauch Eigenlicht:
  Schlurfer, Türme, Barrikaden, Loot.
- Verdeckte Figuren scheinen als gerasterter Umriss durch; Randmarken
  zeigen Schlurfer auf der Strecke außerhalb des Bildes.
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
Veranda, ein Hof mit Feuerstelle, ein verwilderter Garten. Hinter der Bucht
steigt der **Stillwald** an – dicht, felsig, voller Hänge. Der einzige gute
Weg aus dem Wald zum Ufer ist der **alte Holzfällerweg**: Über ihn kommt die
Horde. Auf dem See liegen Inseln im Nebel; von dort kommt nur Balduins Boot.

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

Überlebende kommen tagsüber an – über den Holzfällerweg, am Ufer entlang
oder mit Balduins Boot.

## 5. Tagesablauf

| Uhrzeit | Phase | Was passiert |
|---|---|---|
| 06:00–08:00 | **Morgen** | Aufwachen, Morgenbericht; die Folgen der Nacht sind zu sehen (Trümmer, Überreste auf der Strecke); einsammeln, reparieren; Balduins Boot legt an |
| 08:00–17:00 | **Tag** | Ruhig: bauen, reparieren, sammeln, Haus ausbauen, einrichten, Nebenaufträge, handeln – **keine Schlurfer** |
| 17:00–20:30 | **Abend** | Letzte Vorbereitungen; Lampen und Fackeln an der Strecke gehen an |
| 20:30–05:30 | **Nacht** | Die Horde kommt in Wellen über die Strecke; Anführer in besonderen Nächten |
| danach | **Schlafen** | Im eigenen Bett: Tag endet, Spiel speichert, nächster Morgen |

- Ein voller Tag dauert etwa 9 Minuten Echtzeit (1 Spielminute = 0,4 s).
  Am Feuer, im Sessel oder auf der Bank kann man bis zum Abend bzw. bis kurz
  vor der Horde ausruhen – in die Nacht hinein wird nicht gewartet.
- Ein Spieltag zählt von 06:00 bis 06:00. Schlafen führt zum Morgen 06:30.
- Schlafen geht erst, wenn die Nacht des Tages vorbei ist. Ist die letzte
  Welle besiegt – oder bricht um 05:30 der Morgen an und die letzten
  Schlurfer fliehen in den Wald –, ist die Nacht gewonnen.
- Um 20:00 warnt eine Meldung vor der Horde; steht an der Strecke noch kein
  Turm, sagt Mika es vorher.
- In Dialogen und im Menü steht die Zeit still. Bauen geht jederzeit.

## 6. Systeme

### 6.1 Zeit, Tag-Nacht und Wetter

Eine zentrale Uhr (Tag + Minuten seit 06:00) treibt Licht, Lampen, Fackeln,
Nebel, Horde-Wellen, Balduins Boot und Tagesereignisse. Lichtwerte kommen aus
einer Schlüsselbild-Tabelle über 24 Stunden. Das Wetter wechselt von Tag zu
Tag (klar, Nieselregen, Wind, Nebel) und färbt Licht und Klang.

### 6.2 Karte und Strecke

Die Karte folgt Grundregel 11. Grober Grundriss (x nach Osten, z nach Süden,
die Kamera blickt nach Norden):

```
            ~ ~ ~   S T I L L S E E   ~ ~ ~        Inseln im Nebel
       ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
   ~ ~ ~ ~ ~ ~ ~  Steg ═╗ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~     Balduin legt hier an
   ─── Ufer, Felsen, Schilf, Treibholz ────────
      Garten    HAUS mit Veranda    Holzlager
            ── Hof: Feuer, Werkbank ──           LETZTE VERTEIDIGUNG
   Felsen │   ○   ║═══║   ○    │ Tannen          Barrikadenplatz 1
   Hang   │ ○     ║   ║     ○  │                  Türme links und rechts
          │    ○   ╲   ╲   ○   │ Laubwald         Abschnitt 1
          │  ○  ═══║═══║    ○  │                  Barrikadenplatz 2
   Tannen │     ○  │   │  ○    │ Felsen           Abschnitt 2
          │   ○   ╱   ╱    ○   │
          │  ═══║═══║   ○      │ Hang             Barrikadenplatz 3
   ───────┴──── Waldrand: hier kommt die Horde ──  SPAWN (unten im Bild)
```

- **Maße:** rund 40 m breit. Der See nimmt den Norden ein, die Bucht mit Haus,
  Steg und Hof rund 16 × 12 m. Die **Strecke** führt vom Hof rund 35 m nach
  Süden bis zum Waldrand, ist etwa 3 m breit und macht zwei, drei sanfte
  Bögen.
- **Natürliche Grenzen:** Links und rechts der Strecke stehen dichter Wald,
  Felsen und Hänge. Die Figur kann am Waldrand sammeln, aber niemand kommt
  quer durch den Wald – die Strecke ist der einzige Weg zur Bucht.
- **Die Horde läuft die Strecke entlang** (jeder Schlurfer mit etwas
  seitlichem Versatz innerhalb der Wegbreite). Sie verlässt sie nur, um die
  Figur anzugreifen, wenn sie ihr nahe kommt, und kehrt danach zurück. Kein
  Umlenken durch Gebäude, keine Wegfindung quer über die Karte.
- **Baupunkte für Türme:** feste Plätze links und rechts der Strecke, je
  Abschnitt drei bis vier, insgesamt rund zwölf. Sichtbar als runde
  Holzplattformen; von jedem reicht ein Turm auf die Strecke, in den Bögen
  überschneiden sich die Reichweiten.
- **Barrikadenplätze:** feste Plätze quer über der Strecke – einer vor dem
  Hof (erste Linie), einer oder zwei in der Mitte, einer am Waldrand. Man
  erkennt sie an Pfosten am Wegrand, auch wenn noch nichts gebaut ist.
- **Letzte Verteidigung:** der Hof zwischen dem Ende der Strecke und dem
  Haus. Hier kommen die an, die alles überwunden haben.

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
  Anführern ein Moderkern.
- Man sammelt sie, indem man in die Nähe läuft; im **Sammelradius** fliegen
  sie von selbst zur Figur. Nachts ist das riskant, am Morgen gemütlich:
  **Die Überreste bleiben bis zum Mittag des nächsten Tages liegen,** dann
  zerfallen sie zu Moos.
- Randmarken zeigen, wo außerhalb des Bildes noch etwas liegt. Der
  Sammelradius ist eine Aufwertung der Figur.

### 6.6 Bauleiste

- Unten rechts im HUD, Reiter **Verteidigung** (Türme und Barrikaden) ·
  **Figur** · **Zuhause** · **Einrichten**. `Tab` wechselt den Reiter.
  Jede Option zeigt Symbol und Preis, ausgegraut mit Füllbalken bis
  bezahlbar, dann leuchtet sie auf. Tastenkürzel **Q R T G C V**.
- **Turm bauen:** Turm wählen → freie Baupunkte leuchten auf → Klick (oder
  `E` davor) setzt ihn. **Barrikade bauen:** wählen → freie
  Barrikadenplätze leuchten auf → setzen.
- **Ausbauen und Reparieren:** Turm oder Barrikade anklicken (oder davor `E`):
  Die Leiste zeigt Stufen, Spezialisierungen, Reparatur und »Abreißen«
  (immer auf `V`, mit Rückfrage).
- **Zuhause:** Werkbank, Beete, Bänke, Laternen, Zelte und Deko stehen frei
  auf dem Raster rund um das Haus (nie auf der Strecke); Ausbauten des
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
- **Einrichten und Dekorieren:** Möbel drinnen, Deko draußen (Kürbisse,
  Laternen, Blumenkästen, Wimpel). Gemütlichkeit bringt jeden Morgen
  Erfahrung, ab 5 ist Mika »ausgeschlafen« (bis Mittag schneller).
- **Garten und Gewächshaus:** Beete geben täglich Fasern, später Kräuter
  und Kürbisse.
- Abreißen gibt Material zurück (Zuhause-Bauten ganz, Türme und Barrikaden
  zu 70 %).

### 6.9 Türme

Türme stehen **nur auf Baupunkten** und arbeiten autonom. Vier Rollen, jede
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
- Am stärksten wirken Türme dort, wo Barrikaden die Horde aufhalten:
  **Barrikade plus Kreuzfeuer** ist das Herz jeder Verteidigung.

### 6.10 Barrikaden

Barrikaden stehen **auf den Barrikadenplätzen quer über der Strecke.** Die
Horde bleibt davor stehen und schlägt darauf ein, bis sie bricht; dann zieht
sie weiter. Sie sind handgebaut und improvisiert:

| Stufe | Aussehen | Material | Haltbarkeit | Besonderes |
|---|---|---|---|---|
| 1 | Einfacher Holzzaun (Latten, Pfosten) | Holz | gering | – |
| 2 | Verstärkte Bretterwand mit Streben | Holz | mittel | – |
| 3 | Schwere Holzbarriere aus Stämmen mit Blech und alten Türen | Holz, Schrott | hoch | fängt einen Teil jedes Schlags ab |
| 4 | Befestigte Barrikade mit angespitzten Pfählen | Holz, Schrott, Zahnrad | sehr hoch | Stacheln verletzen, wer darauf einschlägt |

- Brummer und Anführer schlagen besonders hart zu.
- Schaden ist sichtbar (lockere Bretter, fehlende Latten); eine zerstörte
  Barrikade hinterlässt **Trümmer** auf dem Platz.
- **Tagsüber** flickt man beschädigte Barrikaden (anteilig, Holz und
  Schrott) oder baut zerstörte neu auf – die Stufe bleibt, wenn man den
  Wiederaufbau bezahlt. Während einer Welle geht beides nicht.

### 6.11 Die Horde

| Schlurfer | Eigenschaft | Wirkt gut dagegen |
|---|---|---|
| **Schlurfer** | Standard, langsam | alles |
| **Flitzer** | schnell, wenig Leben | Rasensprenger, Repetierer |
| **Schwärmer** | kleine, kommen in Pulks, krabbeln | Kürbiskatapult |
| **Brummer** | groß, gepanzert, zerlegt Barrikaden | Scharfschütze, Schlammschleuder |
| **Leuchtpilz** | heilt und beschleunigt Nachbarn | Bolzenwerfer (Fokus) |
| **Anführer** | Boss in besonderen Nächten, ruft Nachschub | alles zusammen, plus Nahkampf |

- Alle kommen **vom Waldrand über die Strecke**, in mehreren Wellen je
  Nacht; die Nachtleiste zeigt Welle und Anzahl, Knopf bellt vorher.
- **Jede Nacht wird stärker:** mehr Schlurfer, mehr Leben, nach und nach neue
  Arten; jede fünfte Nacht ist eine **Anführernacht**. Ohne Ausbau hält man
  irgendwann nicht mehr mit.
- **Tagsüber kommen keine Schlurfer** – der Tag gehört der Ruhe.

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
  auf den Barrikadenplätzen, Überreste auf der Strecke. Einsammeln,
  reparieren, neuer Tag.
- **Reparieren:** Barrikaden und Türme einzeln über die Auswahl, das Zuhause
  über die Bauleiste (Holz und Schrott, anteilig, wenn der Vorrat nicht
  reicht).

### 6.13 Nahkampf und eigene Figur

- Die Figur ist die **letzte Verteidigung** am Hof – und kann an der Strecke
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
  Bert, Dr. Yusuf) – tagsüber, über den Holzfällerweg, am Ufer oder mit
  Balduins Boot. Wer neu ist, winkt.
- **Kennenlernen → Gast → Einzug:** Ansprechen mit E; ein Schlafplatz (Zelt,
  später ein Zimmer oder Nebengebäude) macht aus dem Gast einen Bewohner.
- **Aufträge und Nebenaufträge:** Jeder bittet um etwas (Hilde: Fasern für
  einen Schal, Bert: Licht am Schlafplatz, Yusuf: Kamille, Juna: das
  Leuchtfeuer); Balduin bringt gelegentlich eigene.
- **Fähigkeiten:** Knopf bellt kurz vor jeder Welle und buddelt morgens
  etwas aus; Hilde tauscht und bringt Morgengaben; Juna hört die Horde am
  Funk (was heute Nacht kommt); Bert flickt billiger und nachts Barrikaden
  und Türme; Dr. Yusuf kocht Tee und verarztet Mika einmal je Nacht.
- **Roter Faden – das Leuchtfeuer:** Mit Juna in drei Stufen am Leuchtmast
  auf dem Steg: Leiter und Plattform, Antenne mit Kabeln, Leuchtfeuer
  (braucht einen Moderkern). Das Leuchtfeuer brennt jede Nacht über dem See
  und bremst Schlurfer in seinem Schein.

### 6.15 Balduin und der Handel

- **Ankunft übers Wasser:** Ab dem Morgen nach der ersten Nacht kommt
  Balduin jeden Vormittag. Erst hört man sein Bootshorn über den See, dann
  sieht man das Boot zwischen den Inseln auftauchen; es tuckert heran und
  legt am Steg an, Balduin wirft die Leine über den Poller. Gegen Mittag
  legt er wieder ab. Wer ihn verpasst, handelt am nächsten Morgen.
- **Aussehen:** ein fröhlicher, bärtiger Seebär mit Schiebermütze, rotem
  Schal, dunklem Mantel und einem riesigen Rucksack; sein Boot ist
  vollgestapelt mit Kisten, Fässern und Einmachgläsern mit trüber grüner
  Brühe.
- **Handel** im Fenster der Werkbank (»Balduins Boot«): Zombieteile gegen
  Schrott (immer), dazu täglich wechselnde Angebote – Holz, Stein, Fasern,
  Stoff, Zahnräder, manchmal ein Moderkern, **besondere Turmteile**,
  **Upgrades und Werkzeuge**, später Saatgut und Möbel. Manches nur in
  kleiner Menge am Tag. Gelegentlich bringt er einen Nebenauftrag mit.
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
- **Umgebung:** Wind, Wellen am Steg, Krähen, Regen, Knistern am Kamin.
- **Musik:** am Abend eine leise, etwas melancholische Melodie, während der
  Wellen ein treibender Rhythmus.

### 6.20 Titelbild und Einstellungen

- **Titelbild:** großer Schriftzug über der Bucht im Abendlicht.
  Weiterspielen, Neues Spiel (Name und Aussehen), Einstellungen, Steuerung.
- **Einstellungen:** Lautstärke, Musik, Geräusche, Pixelgröße,
  Textgeschwindigkeit – neben dem Spielstand gespeichert.

## 7. Steuerung

| Taste | Aktion |
|---|---|
| W A S D / Pfeiltasten | Laufen |
| Umschalt | Rennen |
| Linke Maustaste | Angreifen · Baupunkt/Platz anklicken: bauen · Turm oder Barrikade anklicken: auswählen |
| Rechte Maustaste / Esc | Bauen abbrechen, Auswahl aufheben |
| Leertaste | Ausweichen |
| E / Enter | Benutzen, Dialog weiter; gedrückt halten: weiter sammeln |
| 1–8 / Mausrad | Schnellleiste |
| Q R T G C V | Bauleisten-Optionen |
| Tab | Reiter der Bauleiste wechseln |
| F | Laterne an/aus |
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
  Balduins Handel (noch mit Bollerwagen über Land – das Boot kommt in M10);
  Autowrack nur einmal. Die geplanten Punkte »Innenraum als eigenes Bild«
  und »Detailgrad« gehen in M11 und M12 auf.

Bis hierhin spielt das Spiel auf einer Waldlichtung mit vier Waldpfaden und
freiem Bauraster (die Horde ließ sich mit Bauten umlenken). Das neue
Grundkonzept ersetzt das.

### Meilenstein 9 – Die Bucht und die Strecke (großer Umbau)

- **Neue Karte nach Grundregel 11:** Stillsee im Norden mit Inseln und Nebel,
  Ufer mit Felsen, Schilf und Treibholz; das alte Fischerhaus mit Steg;
  der Hof als letzte Verteidigung; die Strecke (alter Holzfällerweg) leicht
  geschwungen bis zum Waldrand im Süden; dichter Wald, Felsen und Hänge als
  natürliche Grenzen. Gelände und Natur gleich in Herbstfarben.
- **Horde auf der Strecke:** Schlurfer folgen dem Weg, bleiben an Barrikaden
  stehen, greifen am Ende das Haus an; die Figur ziehen sie nur aus der
  Nähe von der Strecke. Kein Mazing, keine Wegfindung über das Raster,
  keine Wellen aus vier Richtungen, **keine Tagesschlurfer**.
- **Baupunkte** links und rechts der Strecke; Türme nur dort.
- **Barrikaden** auf festen Plätzen mit vier Stufen, Lebenspunkten,
  sichtbarem Schaden, Trümmern, Reparatur und Wiederaufbau am Tag.
- **Letzte Verteidigung** am Hof, Standfestigkeit der Basis, verlorene Nacht.
- Überreste bleiben bis zum Mittag liegen; der Morgen zeigt die Folgen.
- Überlebende, Leuchtmast (am Steg), Werkbank, Beete, Zelte und Möbel auf
  der neuen Karte; Bauleiste mit dem Reiter »Verteidigung«.
- Spielstand v8 mit Migration (alte Stände laden, Bauten werden erstattet).
- Prüfskript: Strecke, Baupunkte, Barrikaden bauen, beschädigen, reparieren,
  neu bauen, Nacht über die Strecke gewonnen und verloren, Migration.

**Spielbar heißt:** Ein ganzer Tag-Nacht-Morgen-Zyklus an der Bucht: tagsüber
Türme auf Baupunkte und Barrikaden auf die Strecke, nachts halten sie die
Horde, morgens Trümmer und Überreste – und man sieht immer, wo die Horde
langläuft.

### Meilenstein 10 – Balduin kommt übers Wasser

- Boot mit Kisten, Fässern und Einmachgläsern; Ankunft als kleines Ereignis
  (Bootshorn, das Boot taucht zwischen den Inseln auf, tuckert heran, legt
  am Steg an), Abfahrt gegen Mittag.
- Balduin im neuen Aussehen (Schiebermütze, Bart, roter Schal, Rucksack).
- Handel wie bisher, dazu besondere Turmteile, Upgrades und Werkzeuge,
  gelegentliche Nebenaufträge; Running Gag mit täglichen Sprüchen.

### Meilenstein 11 – Das Zuhause am Wasser

- Das Fischerhaus als Zuhause in Stufen und Räumen (Wohnraum mit Kamin,
  Küche, Schlafzimmer, Werkstatt, Lager) und draußen Veranda, Garten,
  Gewächshaus, Holzlager, längerer Anleger, Nebengebäude.
- **Innenraum als eigenes Bild** (wie in Stardew Valley), groß und im feinen
  Maß; Möbel und Deko drinnen und draußen.

### Meilenstein 12 – Herbst, Wetter und Lesbarkeit

- Herbst überall: Laub in Orange und Rot, Kürbisse, Pilze, Krähen,
  Holzstapel, Nebel über dem Wasser, fallendes Laub, Regen und Wind, kalte
  Nächte mit warmen Lichtinseln.
- Alle Modelle im feinen Maß (1/16 m) und auf den ersten Blick erkennbar;
  Figuren mit ausdrucksstärkeren Gesichtern; Look-Feinschliff (Pixel-Look
  nur, wo er hilft).

### Meilenstein 13 – Balance und Testrunden

- Balance über zehn und mehr Nächte an der Strecke, Testrunden mit allen
  Personas, Feinschliff.

## 9. Ideen-Parkplatz

- Angeln am Steg, Kochen am Kamin mit kleinen Boni.
- Kürbisfest im Herbst, Laternenumzug, erster Schnee.
- Krähen, die etwas bringen (oder stehlen).
- Mit Balduins Boot eine Insel besuchen.
- Was macht Balduin mit den Teilen? Eine eigene Geschichte.
- Briefe von Oma Hilde als Sammelobjekte.
- Fotomodus.
