# Zomfy Towers – Design-Dokument

> Gemütliche Endzeit mit Zombies. Tower Defense als Kern, dazu Sammeln,
> Crafting und der Ausbau eines eigenen Rückzugshauses – als
> 3D-Pixel-Art-Spiel im Browser.

Dieses Dokument ist die gemeinsame Grundlage für alle Arbeitssitzungen. Es
beschreibt, **was** das Spiel sein soll und **in welcher Reihenfolge** es
entsteht. Wie der Code aufgebaut ist und welche technischen Regeln gelten,
steht in `CLAUDE.md`. Entscheidungen, die hier (noch) nicht stehen, sammelt
`OFFENE-FRAGEN.md`; den Arbeitsstand führt `PROGRESS.md`.

---

## 1. Vision

Nach dem Zusammenbruch ist die Welt still geworden. Straßen reißen auf, Moos
kriecht über Autodächer, in den Vorgärten wachsen Birken. Es ist keine Welt
voller Schrecken, sondern eine, die sich langsam erholt – und in der man sich
ein Zuhause bauen kann.

**Der Tag** ist die ruhige Phase: erkunden, sammeln, craften, das Zuhause
ausbauen, mit Überlebenden reden. Ein paar versprengte Schlurfer streifen
umher, gelegentlich gibt es einen kleinen Angriff – genug, um wachsam zu
bleiben, nie genug, um beim Bauen zu stören.

**Die Nacht** ist Tower Defense mit voller Wucht: Die Horde kommt aus dem
Wald, viele Schlurfer, viel Action, und sie wird Nacht für Nacht stärker.
Mit erbeutetem Loot baut man Türme, levelt sie hoch und spezialisiert sie.
Bricht die Horde durch, steht die eigene Figur als letzte Verteidigungslinie
im Nahkampf.

**Der Kern des Gefühls** ist der Kontrast zwischen dem sicheren, warm
beleuchteten Zuhause und der kühlen, blauen Nacht draußen – und die ständige
Entscheidung, wohin das hart erkämpfte Loot fließt: in die Türme oder in die
eigene Figur.

### Pitch in einem Satz

*Aus einer wackligen Notunterkunft auf einer Waldlichtung wird Tag für Tag ein
warmes, wehrhaftes Zuhause – und jede Nacht zeigt, ob die Türme halten.*

### Mechanische Vorbilder (nur Mechanik, nie Look oder Inhalte)

- **Tower Defense wie in klassischen Warcraft-3-Custom-Maps:** Türme mit Loot
  bauen, über Stufen hochleveln, spezialisieren, gegen eine Horde, die jede
  Nacht stärker wird.
- **Einsammeln wie in Vampire Survivors:** Loot fällt, wo ein Zombie stirbt,
  und fliegt im Sammelradius von selbst zur Figur.
- **Bauleiste wie in den alten Command-&-Conquer-Spielen:** unten im HUD, jede
  Option mit Symbol und Preis, ausgegraut bis bezahlbar, dann leuchtet sie auf.

## 2. Spielgefühl und Ton

**Säulen** – daran wird jedes Feature gemessen:

1. **Geborgenheit.** Das Zuhause ist der wärmste, hellste Ort der Welt. Wer es
   betritt, soll aufatmen.
2. **Ruhige Tage, wilde Nächte.** Tagsüber hat man Zeit und Ruhe. Nachts geht
   es richtig ab – laut, voll, spannend, mit Entscheidungen im Sekundentakt.
3. **Jede Entscheidung kostet Loot.** Turm oder Figur, neuer Turm oder Ausbau,
   jetzt ausgeben oder sparen. Das ist die zentrale Spannung.
4. **Sichtbarer Fortschritt.** Jeder Tag hinterlässt Spuren: ein neuer Turm,
   eine neue Stufe, eine bessere Waffe, ein neues Brett am Haus.
5. **Warmer, schrulliger Humor.** Die Welt nimmt sich nicht zu ernst.
   Schlurfer tragen Kochmützen und Warnwesten, Türme heißen Kürbiskatapult.
6. **Nicht düster, nicht blutig.** Kein Blut. Treffer blitzen hell auf,
   besiegte Schlurfer zerfallen zu Moos und Pilzen und lassen Kram fallen.
7. **Verlieren kostet Material, nie den Spielstand.** Eine verlorene Nacht
   bringt Schäden am Zuhause und Materialverlust – und einen neuen Morgen.

**Tonfall der Texte:** freundlich, knapp, mit leisem Witz. Man duzt sich.
Keine Anglizismen, wo es ein schönes deutsches Wort gibt.

## 3. Look und Präsentation

### 3.1 Pixel-3D

- Echte 3D-Szene (three.js), gerendert in einer **festen Pixelauflösung**
  und **ohne Glättung** ganzzahlig auf Bildschirmgröße hochskaliert. Jeder
  Spielpixel ist ein scharfes Quadrat. Seit Meilenstein 5: **80 Spielpixel
  pro Meter**, die Szene hat etwa 900 Bildzeilen – Full HD zeigt sie 1 : 1
  (Sicht ca. 24 m breit, die ganze Lichtung wie ein Diorama), 1440p mit
  Skalierung 2, 720p mit Skalierung 1 (Sicht 16 m). Meilenstein 1–4 liefen
  mit 40 px pro Meter und rund 360 Zeilen.
- Die **Oberfläche** hat eine eigene, gröbere Pixel-Leinwand (etwa 360
  Zeilen, eigene ganzzahlige Skalierung): Schrift, Symbole und Leisten
  bleiben kräftig und gut lesbar, egal wie fein die Szene ist.
- **Orthografische Kamera** schräg von oben in Dreiviertel-Ansicht, Blick nach
  Norden, folgt der Figur. Neigung mit Steigung 3 : 4 (ca. 36,9°): Ein Voxel
  von 1/16 m ist auf dem Bildschirm genau 5 px breit, 3 px tief (Böden) und
  4 px hoch (Wände), einer von 1/8 m doppelt so groß. Alle Kanten haben
  saubere, gleichmäßige Pixeltreppen.
- Die Kamera rastet auf das Pixelraster ein, der Rest-Versatz wird beim
  Hochskalieren ausgeglichen – stehende Dinge flimmern nicht, Bewegung bleibt
  weich.
- **Zwei Voxelgrößen:** 1/16 m für alles Kleine und Lebendige (Figur,
  Schlurfer, Türme, Werkzeuge und Waffen, Loot), 1/8 m für Gelände, Natur,
  Gebäude und große Requisiten. Statisches steht auf 1/8-m-Positionen und nur
  in 90°-Drehungen.
- Nachbearbeitung im Pixelmaßstab: dunkle, farbige Umrisse an Silhouetten,
  helle Kanten an Außenecken, Vignette.
- **Begrenzte Palette** (rund 80 Farben in farbverschobenen Rampen), auf die
  das fertige Bild abgebildet wird; Übergänge mit geordnetem Dithering.
- Keine Weichzeichner, kein Bloom, keine Unschärfe.

### 3.2 Licht und Tagesverlauf

- **Morgen:** frisches, rosa-goldenes Licht. **Tag:** warmes Weiß mit kühlen,
  bläulichen Schatten. **Abend:** goldenes Licht, violette Schatten, die
  Lampen gehen an. **Nacht:** tiefes Blau, schwaches Mondlicht – und warme
  Lichtinseln: Lagerfeuer, Laternen, Fenster, Türme.
- Kühle Töne wirken nur auf Schatten und Mitten; Lichtquellen bleiben warm.
- Schatten sind weich und farbig, nie schwarz.
- Lebenszeichen: Rauch aus dem Ofenrohr, Funken, Glühwürmchen.

### 3.3 Modelle

- Figuren, Gebäude, Türme, Schlurfer und Umgebung sind kompakte, liebevoll
  detaillierte Voxel-Modelle aus dem Code. Keine fremden Assets, keine
  Anlehnung an bekannte Spiele, Figuren oder Marken.
- Figuren sind knuffig proportioniert (großer Kopf).
- Eingebackene Umgebungsverdeckung und leichte Farbstreuung pro Voxel.

### 3.4 Kampf-Look

- Treffer: kurzes weißes Aufblitzen, winziger Rückstoß, ein, zwei Bilder
  Trefferstopp, Pixelfunken und Moosflocken. Kein Blut.
- Schadenszahlen in der Pixelschrift, klein und kurz.
- Türme haben lesbare Schüsse: Bolzen, Kürbisse im Bogen, Wasserfächer,
  Lichtkegel.
- Leichtes Bildwackeln um einen Spielpixel bei schweren Treffern.

### 3.5 Benutzeroberfläche

- Gleicher Pixelmaßstab wie die 3D-Szene, eigene Pixelschrift mit Umlauten.
- Warme, dunkle Pflaumentöne mit Holzrahmen und cremefarbener Schrift.
- **Oben links:** Tag, Uhrzeit, Tageszeit; darunter das **aktuelle Ziel**
  (führt durch die ersten Schritte, verschwindet, wenn alles erledigt ist).
  **Oben rechts:** Vorrat (seltene Vorräte erst ab dem ersten Fund).
  **Oben Mitte (nachts):** Welle, Standfestigkeit des Zuhauses.
- **Unten links:** Laterne (linke Hand, Taste F) und Schnellleiste
  (8 Plätze, Tasten 1–8, rechte Hand: Werkzeuge, später Waffen).
  **Unten rechts:** Bauleiste (siehe 6.6). Beide liegen nebeneinander und
  überdecken sich nie. Lebensbalken der Figur über der Schnellleiste.
- Gedanken der Figur (z. B. beim Aufwachen) erscheinen als Sprechblase über
  ihr und halten das Spiel nicht an.
- Dialogfenster mit Porträt und Namen, Schreibmaschinen-Effekt, Antworten.
- Kontexthinweise (»E Schlafen«), kurze Meldungen, schwebende »+2«-Zahlen.

### 3.6 Lesbarkeit, Detailgrad und Animation

- **Man muss auf einen Blick erkennen, was was ist:** Figur, Schlurfer-Arten,
  Türme, Loot, Werkzeuge, Rohstoffquellen, Bauten. Lesbarkeit geht vor
  Stimmung.
- **Nachts** bleibt die Welt dunkel, aber alles, worum es im Kampf geht,
  bekommt einen Hauch Eigenlicht in der eigenen Farbe: Schlurfer, Bauten und
  Türme, Loot (das zusätzlich funkelt), das Geistermodell beim Bauen.
  Schüsse leuchten (Bolzen mit Leuchtspur, heller Wasserfächer).
- **Verdeckt** etwas (Dach, Baumkrone) Schlurfer oder Figur, scheinen sie als
  gerasterter Umriss durch – Schlurfer lavendel, Mika gold. Liegt etwas
  außerhalb des Bildes, zeigen Randmarken hin: Pfeile für Schlurfer (mit
  Anzahl), eine Haus-Marke bei Angriffen aufs Zuhause, Rauten für Loot.
- Im Getümmel treten Einblendungen (»E Fasern rupfen«) zurück.
- Meilenstein 1–4 waren bewusst ein **grober** Durchgang (große Voxel,
  wenige Pixel pro Meter, sparsame Animation), solange die Mechaniken
  wuchsen. **Meilenstein 5 »Detailgrad und Animationen«** hebt das an:
  80 px pro Meter, 1/16-m-Voxel für Figur, Schlurfer, Türme, Werkzeuge und
  Loot, eigene Merkmale je Art (Gänseblümchen, rote Kapuze, Fliegenpilz-
  Kappen, Warnkegel und -weste, Leuchthut, Geweihkrone mit Moosumhang),
  Stufen-Fahnen an den Türmen und mehr Animation: Laufzyklus mit Kopfnicken
  und Blinzeln, Zusammenzucken bei Treffern, Schlurfen, Stampfen und
  Trippeln je Art, Rückstoß der Schlurfer, Rückstoß und Wurfarm der Türme,
  Wind in Gras und Blumen, flatternde Wäsche.
- Der Pixel-Look bleibt dabei verbindlich: scharfe Pixel, begrenzte Palette,
  keine Glättung, keine Unschärfe.
- Testspieler prüfen in jeder Runde: »Erkennt man, was was ist?«

## 4. Welt und Geschichte

### 4.1 Hintergrund

Vor ein paar Jahren ist die Welt einfach stehen geblieben. Seitdem schlurfen
**Schlurfer** durch die Wälder: Menschen, die der **Moder** erwischt hat – ein
Pilzgeflecht, das sie träge, grummelig und nachtaktiv macht. Tagsüber sind
sie benommen, nur wenige streifen umher. Nachts ziehen sie in Scharen los,
angelockt von Wärme und Stimmen. Helles, warmes Licht macht sie langsamer.

### 4.2 Der Ort

Die **Lichtung im Stillwald**: eine Wiese zwischen Tannen und Birken, eine
zusammengezimmerte **Notunterkunft**, ein Lagerfeuerplatz, ein Stück alte
Landstraße mit Autowrack – und der Stumpf des **alten Funkturms**. Waldpfade
führen von allen Seiten auf die Lichtung; über sie kommt die Horde.

### 4.3 Hauptfigur

**Mika**, früher Hausmeister\*in in einem Wohnblock, kann fast alles
reparieren und redet gern mit sich selbst. Orange Wollmütze, grüne Jacke,
Rucksack. (Name und Aussehen werden im letzten Meilenstein wählbar.)

### 4.4 Roter Faden

Aus der Notunterkunft wird ein wehrhaftes Zuhause, aus dem Zuhause ein
Zufluchtsort für andere Überlebende – und am Ende wird der Funkturm zum
**Leuchtturm im Wald**, dessen Licht die Horde zurückdrängt und allen, die
noch unterwegs sind, den Weg zeigt. Danach geht das Spiel als endlose
Verteidigung mit immer stärkeren Nächten weiter.

### 4.5 Überlebende

| Figur | Wer | Was sie mitbringt |
|---|---|---|
| **Oma Hilde** | Ehemalige Postbotin mit Lastenrad | Neuigkeiten, Aufträge, Tauschhandel |
| **Baumarkt-Bert** | Brummiger Ex-Verkäufer | Neue Turm-Spezialisierungen, Reparaturen |
| **Juna** | Jugendliche Funkbastlerin | Hauptgeschichte um den Funkturm, Technik |
| **Dr. Yusuf** | Ehemaliger Tierarzt | Heilung, Kräutertee, Ausdauer |
| **Knopf** | Struppiger Hund | Bellt, wenn die Horde kommt; findet Loot |
| **Balduin** | Ein wenig verrückter Händler mit Bollerwagen (zieht nicht ein) | Kommt jeden Morgen, tauscht Zombieteile gegen Rohstoffe – wofür er sie braucht, sagt er nie |

## 5. Tagesablauf

| Uhrzeit | Phase | Was passiert |
|---|---|---|
| 06:00–08:00 | **Morgen** | Aufwachen, Morgenbericht (Beute, Schäden), reparieren; ab Tag 2 zieht Balduin seinen Bollerwagen heran und handelt bis 12:00 |
| 08:00–17:00 | **Tag** | Sammeln, craften, bauen, erkunden; vereinzelte Schlurfer, selten ein kleiner Angriff |
| 17:00–20:30 | **Abend** | Verteidigung ausbauen, Türme stellen; erste Vorboten |
| 20:30–05:30 | **Nacht** | Die Horde in mehreren Wellen, Anführer in besonderen Nächten |
| danach | **Schlafen** | Im eigenen Bett: Tag endet, Spiel speichert, nächster Morgen |

- Ein voller Tag dauert bei normalem Tempo etwa 9 Minuten Echtzeit
  (1 Spielminute = 0,4 s; bis Meilenstein 7 waren es 0,6 s und rund
  14 Minuten – das zog sich, M8). Am Lagerfeuer, im Sessel oder auf der Bank kann
  man bis zum Abend bzw. bis kurz vor der Horde ausruhen – in die Nacht
  hinein wird nicht gewartet.
- Ein Spieltag zählt von 06:00 bis 06:00. Schlafen führt zum Morgen 06:30.
- Schlafen geht erst, wenn die Nacht des Tages vorbei ist (»Erst muss die
  Nacht vorbei sein«). Ist die letzte Welle besiegt – oder bricht um 05:30
  der Morgen an und die letzten Schlurfer fliehen –, ist die Nacht gewonnen.
- Um 20:00 warnt eine Meldung vor der Horde; wer um 19:00 noch keinen Turm
  hat, bekommt einen Hinweis von Mika.
- In Dialogen und im Menü steht die Zeit still. Bauen geht jederzeit.

## 6. Systeme

### 6.1 Zeit und Tag-Nacht

Eine zentrale Uhr (Tag + Minuten seit 06:00) treibt Licht, Lampen,
Glühwürmchen, Tagesstreuner, Horde-Wellen und Tagesereignisse. Lichtwerte
kommen aus einer Schlüsselbild-Tabelle über 24 Stunden.

### 6.2 Bewegung und Steuerung

Siehe Abschnitt 7. Kollision in der Ebene, weiche Kamerafolge. Verdeckt
etwas die Figur, wird es rund um sie gerastert durchsichtig; im Haus
blenden Dach, Vorderwand und Vordach aus.

### 6.3 Sammeln

| Material | Quelle | Wofür |
|---|---|---|
| **Holz** | Bäume (Axt), Äste | Werkbank, Barrikaden, Zuhause |
| **Stein** | Felsen (Spitzhacke), Kiesel | Werkbank, Zuhause |
| **Fasern** | Hohes Gras, Büsche | Seile, Stoffe, Verbände |
| **Stoff** | Wäsche, Planen, Autowracks | Werkbank, Einrichtung |

Quellen wachsen über die Tage nach. Schrotthaufen füllen sich alle zwei Tage
wieder; das Autowrack an der Straße gibt nur **einmal** etwas her (M8: dass
dort jeden Tag neuer Schrott lag, war unglaubwürdig). Seltene Funde (Baupläne, Samen,
Erinnerungsstücke) treiben Geschichte und Rezepte voran.

### 6.4 Loot und Vorrat – ein Vorrat, klare Rollen

Alles landet im **selben Vorrat** (oben rechts im HUD). Die Rollen sind klar
getrennt:

- **Schrott** ist die Hauptwährung der Bauleiste: Türme, Turm-Ausbau,
  Aufwertungen der Figur. Tagsüber gibt es etwas Schrott aus Schrotthaufen
  (und einmal aus dem Autowrack), vor allem aber **bei Balduin**.
- **Zombieteile** sind das Loot der Schlurfer (M8). Man sammelt sie nachts
  ein und tauscht sie morgens bei **Balduin**, dem Händler mit dem
  Bollerwagen: immer Schrott (3 Teile → 2 Schrott), dazu jeden Tag zwei
  wechselnde Sonderangebote (Holz, Stein, Fasern, Stoff, Zahnräder – an
  manchen Tagen ein Moderkern), manche nur in kleiner Menge. Was er mit den
  Teilen macht, verrät er nicht.
- **Zahnräder** sind seltene Bauteile: von zähen Schlurfern, aus besonderen
  Nächten und selten beim Plündern. Sie schalten die starken Turmstufen und
  die starken Figur-Aufwertungen frei.
- **Moderkerne** lassen nur Anführer fallen – oder Balduin tauscht an
  manchen Tagen einen. Sie schalten die höchsten Stufen frei.
- **Tagesmaterialien** (Holz, Stein, Fasern, Stoff) gehen in die Werkbank und
  ins Zuhause: Werkzeuge, Waffen, Barrikaden, Möbel, Hausausbau.
- **Brücke:** An der Werkbank lassen sich überzählige Tagesmaterialien zu
  Schrott verwerten. So zahlt Tagesarbeit auf die Nacht ein.

Damit bleibt die Bauleiste mit einer Hauptwährung lesbar, und die zentrale
Spannung ist eindeutig: **Schrott in die Türme oder in die Figur?** Der
Rhythmus ist: nachts Teile sammeln, morgens bei Balduin tauschen, tagsüber
bauen.

### 6.5 Loot einsammeln

- Stirbt ein Schlurfer – egal ob durch Turm oder Figur –, fällt sein Loot
  genau dort zu Boden: Zombieteile (eine grünliche Hand), manchmal ein
  Zahnrad, bei Anführern ein Moderkern.
- Man sammelt es, indem man in die Nähe läuft. Im **Sammelradius** fliegt es
  von selbst zur Figur und wird mit einem »+1« verbucht.
- Loot zerfällt nach anderthalb Minuten (es blinkt vorher). Es funkelt ab und zu,
  glimmt nachts, und Rauten am Bildrand zeigen, wo außerhalb des Bildes noch
  etwas liegt. Wer viel sammeln will, muss nachts raus aus der sicheren Zone
  und rein ins Getümmel – Risiko gegen Belohnung.
- Der Sammelradius ist eine Aufwertung der Figur in der Bauleiste.

### 6.6 Bauleiste

- Sitzt unten rechts im HUD, neben der Schnellleiste. Reiter:
  **Türme** · **Figur** · **Zuhause**. `Tab` wechselt den Reiter.
- Jede Option zeigt **Symbol und Preis**. Unbezahlbares ist ausgegraut; ein
  Füllbalken zeigt jederzeit, wie nah man dran ist. Sobald genug Loot da
  ist, **leuchtet die Option auf** (kurzes Glitzern, Rahmen in Gold).
- Die ersten Optionen haben Tastenkürzel: **Q R T G C V** (Positionen rund um
  WASD, gleiche Lage auf deutschen und englischen Tastaturen). Die Zahlen
  1–8 bleiben der Schnellleiste vorbehalten.
- **Turm bauen:** Option wählen, auf dem Raster platzieren (grün = passt,
  rot = geht nicht), Klick setzt. Rechtsklick oder `Esc` bricht ab.
- **Turm ausbauen:** Turm anklicken (oder davorstehen und `E`). Die Leiste
  zeigt dann seine Ausbau- und Spezialisierungsoptionen und »Abreißen«
  (immer auf `V`, mit Rückfrage – ein gewohntes `Q`/`R` reißt nie etwas ab).
  Steht ein Schlurfer unter dem Mauszeiger, ist ein Klick ein Schlag, keine
  Auswahl.
- Bauen und Ausbauen geht **jederzeit**, auch mitten in der Nacht.

### 6.7 Crafting (Werkbank)

- Die **Werkbank** wird über die Bauleiste gebaut. An ihr stellt man
  Werkzeuge (Spitzhacke), Waffen und Möbel her und verwertet Überschuss zu
  Schrott: ein Druck verwertet einmal, gehaltenes E macht gemächlich weiter
  (mit Zähler).
- Rezepte werden freigeschaltet durch Tage, Funde, Überlebende und den
  Ausbau des Zuhauses.

### 6.8 Bauen und Zuhause

- **Raster** mit 1-m-Feldern auf der ganzen Lichtung. Gebäude blockieren
  Felder (für die Figur und für die Horde).
- Abreißen gibt Material zurück (Zuhause-Bauten ganz, Türme zu 70 %).
- **Zuhause-Stufen:** Notunterkunft → Hütte → Haus → Hof → Turmhaus mit
  Leuchtfeuer. Jede Stufe hat mehr **Standfestigkeit** (die Lebenspunkte des
  Zuhauses), sieht sichtbar anders aus und schaltet Neues frei.
- **Einrichten:** Sobald jemand angekommen ist, gibt es in der Bauleiste den
  Reiter »Einrichten«: Möbel für drinnen (Bild, Teekanne, Wimpelkette,
  Lichterkette, Leselampe, Lesesessel) an festen Plätzen, für Knopf ein
  Körbchen am Feuer, dazu Zelte und der Funkturm. Möbel geben
  Gemütlichkeit (bis 10). Jeden Morgen bringt sie ebenso viel Erfahrung, ab 5
  ist Mika »ausgeschlafen« (bis Mittag 10 % schneller).
- **Sitzbank:** Hinsetzen heilt Mika sofort (höchstens alle 30 Sekunden) –
  eine Verschnaufpause mitten in der Nacht, ohne Dialog. Tagsüber kann man
  dort auch ausruhen.

### 6.9 Türme

Türme arbeiten autonom. Vier Rollen, jede mit fünf Stufen. Stufe 1–2 sind
allgemein, auf **Stufe 3 spezialisiert** man in eine von zwei Richtungen;
Stufe 4 und 5 bauen die gewählte Richtung aus.

| Turm | Rolle | Spezialisierung A | Spezialisierung B |
|---|---|---|---|
| **Bolzenwerfer** | Schaden gegen einzelne starke Gegner | **Scharfschütze** – große Reichweite, durchschlägt Panzer, zielt auf den Stärksten | **Repetierer** – sehr schnell, zwei Ziele |
| **Kürbiskatapult** | Flächenschaden gegen Gruppen | **Feuerkürbis** – brennender Boden | **Streukürbis** – zerplatzt in drei Ladungen |
| **Rasensprenger** | Verlangsamen und Kontrolle | **Frostnebel** – starke Verlangsamung, kurzes Einfrieren | **Schlammschleuder** – Rückstoß, hält Zähe auf |
| **Laternenturm** | Unterstützung benachbarter Türme | **Leuchtfeuer** – stärkere Schadens-Aura, Licht bremst die Horde | **Glückslaterne** – mehr Loot von allem, was im Licht fällt |

- Bau und Stufe 2 kosten Schrott, Stufe 3–4 zusätzlich **Zahnräder**, Stufe 5
  einen **Moderkern**. Jeder weitere Turm derselben Art kostet 2 Schrott mehr
  (höchstens +8), damit sich Aufrüsten gegen bloßes Streuen lohnt.
- Dazu **Barrikaden** (günstige Wände zum Lenken der Horde).

### 6.10 Die Horde

| Schlurfer | Eigenschaft | Wirkt gut dagegen |
|---|---|---|
| **Schlurfer** | Standard, langsam | alles |
| **Flitzer** | schnell, wenig Leben | Rasensprenger, Repetierer |
| **Schwärmer** | kleine, kommen in Pulks | Kürbiskatapult |
| **Brummer** | groß, gepanzert, schlägt Barrikaden ein | Scharfschütze, Schlammschleuder |
| **Leuchtpilz** | heilt und beschleunigt Nachbarn, trotzt Verlangsamung | Bolzenwerfer (Fokus) |
| **Anführer** | Boss in besonderen Nächten, ruft Nachschub | alles zusammen, plus Nahkampf |

- **Jede Nacht wird stärker:** mehr Schlurfer, mehr Leben, und nach und nach
  neue Arten (Nacht 2 Flitzer, Nacht 3 Schwärmer, Nacht 4 Brummer, Nacht 6
  Leuchtpilze). **Jede fünfte Nacht** ist eine **Anführernacht** mit besserem
  Loot.
- Die Steigerung ist so gebaut, dass man **ohne Ausbau irgendwann nicht mehr
  mithält**.
- **Tagsüber** streifen vereinzelte, träge Schlurfer umher (wenig Loot), und
  ein- bis zweimal am Tag kommt ein kleiner Trupp. Tagesschlurfer greifen
  nicht gezielt an, solange man baut oder sammelt – sie stören nie ernsthaft:
  Am Zuhause nagen sie langsam und höchstens bis zur Hälfte, und ein Angriff
  meldet sich groß mit der Wand, an der er passiert.
- Die Punkte einer Nacht steigen gleichmäßig (Nacht 1: 18, 2: 25, 3: 32,
  4: 41, 5: 52), egal auf wie viele Wellen sie sich verteilen.

### 6.11 Wege der Horde

Die Horde betritt die Lichtung über feste **Waldpfade** und sucht sich dann
über das Raster den kürzesten Weg zum Zuhause. **Gebäude und Barrikaden
blockieren Felder** – man lenkt die Horde also mit seinem Aufbau (»Mazing«).
Ein Bauplatz, der das Zuhause vollständig abschneiden würde, wird abgelehnt.
Brummer nehmen den Weg durch Barrikaden und schlagen sie ein.

- Vier Waldpfade: Westen, Osten, Nordwesten, Nordosten. Eine Welle kommt in
  den ersten Nächten von einer Seite, ab Nacht 3 manchmal von zwei; die
  Meldung sagt, woher (»Welle 1 von 3 – aus dem Westen!«), die Nachtleiste
  behält es (»Aus: Westen«) und kündigt zwischen den Wellen die nächste an
  (»Gleich: Osten«). Pfeile am Bildrand zeigen Schlurfer außerhalb des Bildes.
- **Offene Wege:** Steht am Weg der ersten Welle kein schießender Turm, sagt
  Mika es eine Stunde vorher (»Heute Nacht kommen sie zuerst aus dem Osten –
  und an dem Weg steht noch kein Turm.«); zwischen den Wellen warnt eine
  Meldung vor der nächsten.
- **Wegvorschau:** Beim Setzen jedes Baus laufen rote Punkte die Wege der
  Horde entlang, vom Waldrand bis an die Hauswand; die Tafel erklärt Kreis
  (Reichweite) und Punkte. Alle Wege treffen sich am Haus – dort lohnen die
  ersten Türme am meisten.
- Am Haus angekommen, schlagen die Schlurfer auf die nächste Wand ein.

### 6.12 Verlorene Nacht, Morgenbericht, Reparatur

- Sinkt die Standfestigkeit des Zuhauses auf null, ist die Nacht verloren:
  Mika verschanzt sich im Keller, die Nacht endet sofort. Geht Mika nachts zu
  Boden, rettet sie sich ins Haus und kommt mit 40 % Leben wieder – die Nacht
  läuft weiter.
- Folgen: ein Viertel des Schrotts und ein Zehntel der übrigen
  Tagesmaterialien sind weg (Zahnräder und Moderkerne bleiben), Türme und
  Barrikaden verlieren ein Drittel ihrer Haltbarkeit – Türme aber nie mehr
  als bis auf ein Drittel, damit sie auch nach einer Pechsträhne weiter
  schießen (ein Turm ohne Haltbarkeit schwiege). Das Zuhause wird notdürftig
  auf ein Viertel geflickt – nie besser, als es zu Beginn der Nacht war.
  **Nie Spielende, nie Verlust des Spielstands.**
- **Tagsüber bricht nichts durch:** Tagesschlurfer bringen das Zuhause
  höchstens auf drei Viertel. Geht Mika am Tag zu Boden, wacht sie zwei
  Stunden später im Bett auf, ohne Verluste.
- **Morgenbericht:** besiegte Schlurfer, eingesammeltes Loot (auch das nach
  der letzten Welle), was Streuner schon vor der Nacht abgenagt haben, der
  Schaden der Nacht mit dem Stand danach, Beute, die noch draußen liegt,
  Verluste – und zum Schluss ein Gedanke von Mika. Er bleibt im Spielstand,
  bis man ihn mit `E` schließt.
- **Reparieren** über die Bauleiste (Reiter Zuhause: alles auf einmal, oder
  einzeln über die Auswahl eines Baus) kostet Holz und Schrott (Zuhause: je
  10 Standfestigkeit 1 Holz, je 15 ein Schrott – Schaden soll zählen); reicht
  der Vorrat nicht, wird anteilig geflickt. Solange nachts eine Welle läuft,
  geht Reparieren nicht – erst abwehren, dann flicken.

### 6.13 Nahkampf und eigene Figur

- Die Figur ist die **letzte Verteidigungslinie**. Tagesschlurfer erledigt man
  selbst; nachts muss man ran, wenn die Horde durchbricht.
- **Angriff** mit der linken Maustaste (in Richtung des Mauszeigers);
  gedrückt halten schlägt weiter, ein Klick mitten im Schwung wird
  vorgemerkt. Mika schlägt mit dem, was sie in der Hand hat (Schnellleiste):
  Waffe, Axt, Spitzhacke – sonst mit den Fäusten. Steht ein Schlurfer knapp
  außer Reichweite, macht sie beim Ausholen einen **Ausfallschritt** (bis gut
  1 m) auf ihn zu. Dicht am Schlurfer (unter 2,4 m) hat Zuschlagen Vorrang
  vor dem Auswählen eines Baus.
- **Ausweichen** mit der Leertaste: kurze Rolle (0,3 s, gut 1,5 m) in
  Laufrichtung, dabei unverwundbar, danach 0,75 s Pause. Eine Rolle bricht
  einen Schwung ab.
- **Waffen** mit spürbar verschiedenem Spielgefühl, gebaut an der Werkbank
  und zweimal aufgewertet über die Bauleiste (Reiter »Figur«, Taste C, die
  Waffe in der Hand):

| Waffe | Gefühl | Schaden | Tempo | Reichweite | Besonderes |
|---|---|---|---|---|---|
| Fäuste | Notbehelf | 6 | 2,6/s | 1,25 m | – |
| Axt | Werkzeug, solide | 12 | 2,2/s | 1,55 m | trifft bis zu 3 |
| Schaufel | ausgewogen | 16 | 1,9/s | 1,7 m | guter Rückstoß |
| Bratpfanne | langsam, wuchtig | 30 | 1,0/s | 1,45 m | betäubt 0,9 s (Zähe halb so lange) |
| Rechen | große Reichweite | 10 | 1,4/s | 2,3 m | trifft bis zu 5 |
| Fäustlinge | schnelle Schlagfolge | 7 | 3,6/s | 1,25 m | jeder 3. Treffer in Folge doppelt |

  Stufe 2 und 3 machen ×1,35 bzw. ×1,75 Schaden.
- **Erfahrung und Perks:** Jeder besiegte Schlurfer gibt Erfahrung – im
  Nahkampf doppelt, Tagesstreuner halb. Jede Stufe bringt eine Wahl aus drei
  Perks; das Spiel hält dafür an. Neun Perks mit je zwei oder drei Stufen:
  Sammlerherz (Sammelradius), Konter (nach dem Ausweichen doppelt), Flick-
  schusterin (Bauten in der Nähe flicken sich), Rückendeckung (mehr Schaden
  nahe Türmen), Zähe Natur (Treffer heilen), Flinke Hände (Schlagtempo),
  Dickes Fell (weniger Schaden), Glückspilz (mehr Schrott), Zweiter Atem
  (früher regenerieren).
- **Aufwertungen der Figur** in der Bauleiste: Sammelradius, Lebenskraft,
  Schlagkraft, Tempo.

### 6.14 Überlebende und Geschichte

- **Ankunft:** Ab Tag 2 kommt jeden Morgen jemand an: Knopf (Tag 2, am
  Briefkasten), Oma Hilde (3, mit dem Lastenrad auf der Straße), Juna (4, am
  Funkturm), Bert (5, von Westen), Dr. Yusuf (6, am östlichen Waldrand). Mika
  bemerkt es in einer Sprechblase. Wer neu ist, winkt, sobald Mika in der
  Nähe ist.
- **Kennenlernen → Gast → Einzug:** Ansprechen mit E (Dialog mit Porträt).
  Gäste bleiben tagsüber und schlafen am Feuer. Ein Zelt (Reiter
  »Einrichten«) wird ihr Schlafplatz, dann ziehen sie ein. Knopf zieht ein,
  sobald man ihn streichelt. Wird ein Zelt abgerissen, ist sein Bewohner
  wieder Gast.
- **Aufträge:** Kaum eingezogen, bittet jeder um etwas. Der Auftrag steht
  im Ziel-Feld. Hilde will 8 Fasern und strickt dafür einen Schal (+15
  Lebenspunkte). Bert will einen Laternenpfahl neben seinem Zelt und gibt
  dafür Zahnräder und Schrott. Dr. Yusuf will Kamille (Fasern und Stoff),
  danach wirkt sein Tee stärker. Junas Auftrag ist der Funkturm.
- **Fähigkeiten:** Knopf bellt kurz vor jeder Welle und nennt die Richtung;
  morgens hat er Schrott ausgebuddelt. Hilde tauscht einmal am Tag (das
  Angebot wechselt täglich) und bringt Morgengaben. Juna belauscht die Horde
  am Funk (die Richtung der ersten Welle steht im Morgenbericht). Bei Bert
  kostet Reparieren die Hälfte, und nachts flickt er die Türme. Dr. Yusuf
  kocht morgens Tee (schneller heilen) und verarztet Mika einmal je Nacht,
  bevor sie zu Boden geht.
- Tagsüber (06:30–20:15) stehen alle an ihren Plätzen um Feuer und Hütte,
  nachts schlafen sie in den Zelten. Knopf liegt nachts am Feuer.
- **Roter Faden – der Funkturm:** Mit Juna in drei Stufen, je ein paar
  Stunden Werkeln: Leiter und Plattform, Antenne mit Kabeln, Leuchtfeuer
  (braucht einen Moderkern von einem Anführer). Das Leuchtfeuer brennt jede
  Nacht und bremst Schlurfer in seinem Schein um 30 %. Danach geht es als
  endlose Verteidigung weiter.
- **Balduin, der Händler (M8):** Ab Tag 2 zieht er jeden Morgen um 06:40
  seinen Bollerwagen (lila-gelb gestreiftes Sonnendach, Einmachgläser mit
  trüber grüner Brühe) von Osten die Straße entlang, bimmelt beim Anhalten
  und handelt bis 12:00; dann packt er ein und zieht weiter. Beim ersten
  Treffen stellt er sich vor (»Frag nicht. Wissenschaft! Oder Kunst. Oder
  Suppe – nein, keine Suppe.«), danach öffnet E direkt seinen Bollerwagen:
  dasselbe Fenster wie die Werkbank (E tauscht einmal, gehalten weiter), oben
  sein Spruch des Tages. Sein Stand ist morgens nicht bebaubar; steht dort
  inzwischen etwas, hält er an einem anderen Platz an der Straße. Die Horde
  läuft durch seinen Wagen hindurch – er gehört nicht ins Flussfeld.

### 6.15 Dialoge

Dialoge sind Daten (Zeilen mit Sprecher, Text, Antworten und Folgen) und
können vom Spielzustand abhängen.

### 6.16 Speichern

- Der Spielstand liegt im Browser (`localStorage`), versioniert, mit
  Migrationen.
- **Schlafen im eigenen Bett beendet den Tag und speichert.** Zusätzlich
  sichert das Spiel still beim Verlassen der Seite.
- Beschädigte Stände werden erkannt und beiseitegelegt.

### 6.17 Balance-Ziele

- Nacht 1 fordert schon (M8): Wer nur zwei Türme stellt und zusieht,
  verliert sie; mit drei Türmen (einer ausgebaut) und Mitkämpfen hält das
  Zuhause. Nacht 2 schafft man mit drei, vier Türmen und Nahkampf.
- Ab Nacht 4 braucht man Spezialisierungen, ab Nacht 6 eine gezielte
  Mischung gegen die Schlurfer-Arten.
- Jede Nacht bringt so viele Zombieteile, dass man sich bei Balduin
  mindestens eine spürbare Verbesserung ertauschen kann – aber nie alles
  (Nacht 1: rund 30–35 Teile ≈ 20–23 Schrott).
- Ohne Ausbau kippt es spätestens um Nacht 5.

### 6.18 Klang

Alle Klänge werden im Browser erzeugt (Web Audio), es gibt keine Tondateien.
Der Klang startet mit der ersten Taste oder dem ersten Klick – vorher
sperrt der Browser ihn ohnehin.

- **Effekte** aus gefiltertem Rauschen und kleinen Oszillatoren: Schritte
  (drinnen auf Holz), Hacken, Stein, Rupfen, Durchsuchen, Schwung, Treffer,
  Autsch, Ausweichrolle, Bolzen, Katapult und Aufprall, Wasserstrahl,
  Einsammeln (seltene Beute klingt heller), Bauen, Abreißen, Aufwerten,
  Stufenaufstieg, Wellenhorn, Schlurfer-Brummeln und ihr Ende, Knopfs
  Bellen, Balduins Wagenglöckchen und das Rumpeln seiner Räder, ein leises
  Glöckchen, wenn in der Bauleiste etwas bezahlbar wird,
  ein kurzes Tippen je Buchstabe im Dialog (jede Stimme etwas anders).
  Ferne Klänge werden leiser und kommen von der Seite.
- **Umgebung:** Wind, am Tag Vögel, nachts Grillen, Knistern am Feuer.
- **Musik:** am Abend eine leise Pentatonik-Melodie über warmen Akkorden,
  während der Wellen ein treibender Rhythmus (Pauke, Hi-Hat, Bass). Beides
  blendet sanft ein und aus.

### 6.19 Titelbild und Einstellungen

- **Titelbild:** großer Schriftzug über der Lichtung im Abendlicht, die
  Kamera zieht langsam darüber. Weiterspielen (mit Spielstand), Neues Spiel,
  Einstellungen, Steuerung.
- **Neues Spiel:** Name (bis 12 Zeichen) und Aussehen (Mütze, Jacke, Haare,
  Haut), live an der Figur in der Szene. Texte, die »Mika« sagen, zeigen den
  gewählten Namen.
- **Einstellungen:** Lautstärke, Musik, Geräusche (0–10), Pixelgröße (klein
  = mehr Überblick, groß = näher dran – immer ganzzahlig skaliert),
  Textgeschwindigkeit. Sie liegen neben dem Spielstand und bleiben bei einem
  neuen Spiel erhalten.

## 7. Steuerung

| Taste | Aktion |
|---|---|
| W A S D / Pfeiltasten | Laufen |
| Umschalt | Rennen |
| Linke Maustaste | Angreifen · auf dem Raster: bauen · Turm anklicken: auswählen |
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

Jeder Meilenstein ergibt eine in sich spielbare Version, die auf GitHub Pages
direkt aus dem Repository läuft. Nach jedem Meilenstein folgen Playtests mit
Testspieler-Agenten (siehe `CLAUDE.md`), Nachbesserung, Prüfablauf, Commit.

### Meilenstein 1 – Fundament und Look ✓

Pixel-Render-Pipeline, Lichtung mit Notunterkunft, Figur, Tag-Nacht-Zyklus
mit warmen Lichtern, HUD-Grundgerüst, Dialoge mit Porträts, Speichern durch
Schlafen, Ausruhen am Feuer, Prüfskript mit Screenshots.

### Meilenstein 2 – Sammeln, Crafting und Bauen ✓

- Ressourcenquellen: Bäume, Felsen, Kiesel, hohes Gras, Äste,
  Schrotthaufen, Autowrack; Nachwachsen über Tage; Sammel-Animation mit
  Spänen, schwebende »+2«; **E gedrückt halten** sammelt weiter.
- Werkzeuge: Axt (vom Hackklotz), Spitzhacke (Werkbank). Das passende
  Werkzeug nimmt Mika beim Sammeln von selbst in die Hand.
- **Bauleiste** mit dem Reiter **Zuhause**: Werkbank, Barrikade,
  Laternenpfahl, Flachsbeet (jeden Tag Fasern ernten), Sitzbank (ausruhen),
  Ausbau zur Hütte. Raster-Platzierung mit Vorschau, Drehen, Auswählen,
  Abreißen mit voller Rückgabe.
- Werkbank mit Rezepten (Spitzhacke) und Verwerten zu Schrott und Stoff.
- Erste Zuhause-Stufe: Notunterkunft → Hütte (Anbau, Veranda).
- Ziel-Anzeige für die ersten Schritte, Laterne auf der linken Hand.
- Spielstand v2 mit Migration.

**Spielbar heißt:** Einen Tag lang sammeln, eine Werkbank bauen, daraus eine
Spitzhacke herstellen, Barrikaden setzen und die Unterkunft zur Hütte
ausbauen.

### Meilenstein 3 – Nächte, Türme und Loot (großer Meilenstein) ✓

- Schlurfer-Arten mit Animationen, Anführer; Tagesstreuner und kleine
  Angriffe; Horde in Wellen, jede Nacht stärker.
- Wegfindung auf dem Raster mit Mazing (Gebäude blockieren).
- Vier Turmarten mit fünf Stufen und Spezialisierung; Schüsse und Effekte.
- Loot-Drops, Einsammeln mit Sammelradius, Zerfall.
- Bauleiste mit **Türme** und **Figur**, Aufleuchten, Tastenkürzel.
- Einfacher Nahkampf (ein Schlag) als Übergang zu Meilenstein 4.
- Standfestigkeit, verlorene Nacht, Morgenbericht, Reparieren.

**Spielbar heißt:** Mehrere Nächte hintereinander verteidigen, Loot
einsammeln, Türme bauen und spezialisieren – mit spürbar steigender
Schwierigkeit und einer Anführernacht.

### Meilenstein 4 – Nahkampf, Waffen und Perks ✓

- Direkter Nahkampf mit Treffer-Feedback, Ausweichrolle, Lebenspunkte.
- Vier Waffen mit eigenem Spielgefühl, Bau an der Werkbank, Aufwertung in
  der Bauleiste.
- Erfahrung, Stufen, Perk-Auswahl.

**Spielbar heißt:** Durchbrüche im Nahkampf abwehren und spüren, wie die
Figur über die Nächte stärker wird.

### Meilenstein 5 – Detailgrad und Animationen

Kommt, sobald die Mechaniken sitzen (siehe 3.6) – und vor den Überlebenden,
damit neue Figuren und Möbel gleich im neuen Detailgrad entstehen.

- Höhere Renderauflösung und mehr Spielpixel pro Meter; Kamera, Umrisse,
  Dithering und Palette darauf abgestimmt.
- Feinere Voxel (1/16 m) für Figur, Schlurfer, Türme, Werkzeuge, Loot und
  kleine Requisiten; Gebäude und Natur mit mehr Einzelheiten.
- Klare Silhouetten und Farbcodes je Schlurfer- und Turmart, lesbares Loot.
- Mehr Animation: Laufzyklen, Schlurfen, Angriffe, Rückstoß und Zielen der
  Türme, Leerlauf-Bewegungen, Wind in Gras und Laub, Türen, Rauch.
- Leistung trotz mehr Dreiecken (Instancing, Stellvertreter, Culling).

**Spielbar heißt:** Dasselbe Spiel wie nach Meilenstein 4 – aber jede Art,
jeder Turm, jedes Loot und jede Quelle ist ohne Erklärung erkennbar, und die
Welt bewegt sich lebendig.

### Meilenstein 6 – Überlebende, Geschichte und Einrichten

- Überlebende mit Dialogen, Aufträgen, Einzug und Verteidigungsfähigkeit.
- Geschichte über viele Tage bis zum entzündeten Leuchtfeuer.
- Einrichten mit Gemütlichkeit und Morgen-Boni; weitere Zuhause-Stufen.

### Meilenstein 7 – Feinschliff

- Klang und Musik (alles im Browser erzeugt).
- Balance aller Kosten, Wellen und Belohnungen.
- Titelbildschirm, Namens- und Aussehenswahl, sanfter Einstieg.
- Einstellungen (Lautstärke, Pixelgröße, Textgeschwindigkeit), Leistung.

### Meilenstein 8 – Nach dem ersten Probespielen

Rückmeldung nach dem ersten eigenen Probespielen: Die Zeit vergeht zu
langsam, die Schlurfer sind keine Herausforderung (schon gar nicht in
Nacht 1), drinnen soll es ein eigenes, schöneres Bild geben (wie in Stardew
Valley), dass das Autowrack jeden Tag Schrott hergibt, ist unglaubwürdig,
und die Pixel lassen zu wenig erkennen – man rät oder liest, was etwas ist.

1. **Tempo und Herausforderung ✓:** Ein Tag dauert rund 9 statt 14 Minuten.
   Nacht 1 bringt etwa 24 statt 16 Schlurfer, schon mit Flitzern; Schlurfer
   laufen schneller, beißen fester und gehen früher auf Mika los; das
   Zuhause nimmt mehr Schaden.
2. **Zombieteile und Balduin ✓:** Schlurfer lassen Zombieteile statt Schrott
   fallen. Balduin tauscht sie morgens gegen Rohstoffe (siehe 6.4, 6.14).
   Das Autowrack gibt nur einmal etwas her, Schrotthaufen alle zwei Tage.
3. **Innenraum als eigenes Bild:** Wer die Hütte betritt, sieht ein eigenes,
   liebevoll eingerichtetes Innenbild im feinen Maß (1/16 m) – wie in
   Stardew Valley. Draußen läuft die Welt weiter.
4. **Detailgrad:** Alles im feinen Maß (1/16 m) und so umgebaut, dass man
   jede Sache erkennt, ohne das Schild zu lesen.

**Spielbar heißt:** Das Spiel vom Titelbild bis zur späten Nacht, flotter und
fordernder, mit Balduins Handel als Morgenritual, einer eigenen Innenszene
und Modellen, die man auf den ersten Blick erkennt.

## 9. Ideen-Parkplatz

- Wetter: Nieselregen, Nebel, Sternschnuppennächte.
- Jahreszeiten mit Laubfarben und Schnee.
- Angeln am Teich, Kochen am Lagerfeuer mit kleinen Boni.
- Briefe von Oma Hilde als Sammelobjekte.
- Weitere Gebiete jenseits der Straßensperren.
- Fotomodus.
