# Schlurfer als 2D-Sprites in acht Richtungen – Recherche, Empfehlung, Plan

Stand: 30.09.2026 · Anlass: »Die 3d Modelle der Schlurfer sind schrecklich. Wollen wir die
nicht einfach in 2d machen? Nur dass sie in 8 Richtungen rennen können? … Dann haben wir
weniger Clipping ineinander und weniger Rechenpower.«

**Zur Methode.** Die Websuche ging. Seiten selbst ließen sich (wie schon bei
`premium-pixel.md`) nur auf GitHub abrufen. Aussagen über andere Spiele stützen sich deshalb
auf Suchauszüge und sind belegt; was aus Vorwissen stammt, ist mit **(VW)** markiert. Die Zahlen
zur heutigen Horde sind **eigene Messungen**: `zombieParts()` wurde mit Node gegen three r186 aus
`lib/` gebaut (Dreiecke), die Haltung von 563 Schlurfern mit dem Gerüst aus `horde.js`
nachgestellt (CPU-Zeit). Es lief kein Browser, und am Repository wurde nichts geändert.

## Kurzfassung

1. **Ja, umstellen – aber zuerst als Prototyp mit Umschalter.** 2D-Sprites passen gut zur festen
   Kamera (OFFENE-FRAGEN 12: sie dreht nie). Es gibt keinen Blickwinkel zu verrechnen, nur die
   Laufrichtung.
2. **8 Richtungen, 5 davon gezeichnet** (S, SO, O, NO, N). W, NW und SW sind gespiegelt – so wie
   bei Doom, Ragnarok Online und im 8-Richtungs-Tutorial von SLYNYRD. Gewählt wird aus `z.facing`
   mit Hysterese.
3. **1 Texel = 2 × 2 Bildpunkte** (1/40 m breit, 1/32 m hoch). Das ist genau die Bildhöhe eines
   1/32-Voxels und in beiden Zoomstufen ganzzahlig. Ein Schlurfer wird rund 40 × 58 Texel groß:
   im Bild so groß wie Link in *A Link to the Past*, aber doppelt so fein.
4. **Erzeugung im Code: »Formen in 3D, Zeichnen in 2D«.** Ein kleiner CPU-Strahlverfolger rastert
   für jedes Bild einfache Grundkörper an einem Gelenkgerüst. Danach kommen Pixelregeln:
   Farbrampen der Palette, Kontur, Aufräumen, handgezeichnete Stempel für Gesichter und
   Merkmale. So stimmen alle Richtungen und die Neigung von 36,9° von selbst.
5. **Einbindung: ein `InstancedMesh` aus aufrechten Quads.** Sie sind um 1,25 in der Höhe
   gestreckt und sehen damit im Bild genau aus wie zur Kamera gekippte Quads, haben aber die Tiefe
   einer stehenden Figur. Dazu kommen ein Atlas als `DataTexture`, Alpha-Test mit `discard`, ein
   auf ganze Bildpunkte gerasteter Fußpunkt, ein Normalen-Atlas für echtes Licht und eine
   Glühmaske.
6. **Clipping:** Schlurfer durchdringen sich untereinander nie mehr (parallele Ebenen, klare
   Staffelung). Gegen Bauten, Barrikaden und Mika bleibt es ungefähr wie heute; dort hilft ein
   Tiefenversatz zur Kamera.
7. **Leistung:** Heute kostet ein Schlurfer 11 600–29 500 Dreiecke (sichtbar, Umriss, Schatten),
   als Sprite 6. Die Horde braucht dann 3–4 Draw Calls insgesamt statt rund 20 je Art im Bild.
   Die CPU spart wenig (Haltung: 0,6 ms → unter 0,05 ms bei 563 Schlurfern), die Grafikkarte
   sehr viel.
8. **Das größte Risiko ist der Stil, nicht die Technik:** flache Schlurfer neben Voxel-Mika.
   Deshalb erst eine Art mit Vergleichsbildern, danach entscheidet der Auftraggeber.
9. **Aufwand:** vier Meilensteine (Prototyp, alle Arten, Bosse, Aufräumen), zusammen etwa 3,5–4,5
   Sitzungen. Spielstand und Horde-Logik bleiben unberührt.

## 1. Ausgangslage im Code

**Aufbau heute.** Es gibt 16 Arten: 11 normale einschließlich Anführer, dazu Holzfäller,
Pilzmutter, Laternenhexe, Moosriese und Moderherz. Jede hat 7–8 Teile, geformt aus
Abstandsfeldern im Maß 1/32 (`zombieModels.js`). Je Art und Teil gibt es ein `InstancedMesh`,
dazu je Teil einen Umriss hinter Verdeckungen und einen groben Schatten-Stellvertreter
(`horde.js`, Konstruktor). Ein unsichtbares `Rig` posiert die Teile, `render()` kopiert
Weltmatrizen in die Instanzen.

**Gemessen** (Dreiecke je Schlurfer):

| Art | sichtbar | Glühteile | Umriss + Schatten | zusammen |
|---|---|---|---|---|
| Schlurfer | 12 876 | 224 | 2 × 3 500 | 20 100 |
| Brummer | 17 252 | 3 156 | 2 × 4 556 | 29 520 |
| Moderfalter | 7 056 | 64 | 2 × 2 248 | 11 616 |
| Laternenhexe | 18 556 | 400 | 2 × 5 076 | 29 108 |
| alle 16 | 7 056–18 556 | 64–4 092 | 2 × 2 248–5 076 | 11 616–29 520 |

- **Haltung auf der CPU:** `pose()`, `updateMatrixWorld` und 7 Matrizen kopieren kosten
  0,60 ms je Bild für 563 Schlurfer (Node, dieser Container). Dazu kommen 246 KB Instanzdaten je
  Bild.
- **Was man sieht:** (a) Im Getümmel stecken Arme und Köpfe ineinander (`lager-nacht.png`:
  Brummer und Mika verschmelzen). (b) 1/32-Voxel sind 2,5 px breit, beim Laufen springt eine
  Spalte zwischen 2 und 3 px – das »Pixelkriechen« [T7]. (c) Bei 80 px/m lesen sich die
  Kastenformen mit Farbrauschen als Klötze.
- **Nebenbefund:** Der Pilzmutter fehlt im 1/32-Pfad der große leuchtende Hut.
  `sculptZombieGlow` kennt nur `kegel` und `leuchthut`; den `mutterhut` baut nur das alte, grobe
  `buildHeadGlow` (Zeile 198). Ihr Glühteil hat deshalb dieselben 224 Dreiecke wie ein
  Schlurfer. Das lässt sich unabhängig vom Umbau beheben.

## 2. Vorbilder und was sich übertragen lässt

| Spiel | Richtungen, Bilder, Technik | Übertrag auf Zomfy |
|---|---|---|
| *A Link to the Past* | Link läuft in 8 Richtungen, blickt aber nur in 4 [Z1]. Links und rechts sind gespiegelt, deshalb wechselt Link Schwert und Schild die Hand [Z2]. Link ist etwa 16 × 24 px groß; der Lauf nach unten hat 7 Bilder, als Pendel abgespielt [Z3, nur Suchauszug]; Bild 256 × 224 (VW). | Unsere Figur ist im Bild ähnlich groß (s. 5). Spiegeln ist erprobt. Wir gehen über das Vorbild hinaus: 8 Blickrichtungen. |
| *Doom* | 8 Winkel, mindestens 5 Bilder, 3 gespiegelt (Namensschema `A2A8`) [D1]. Zombieman: 4 Laufbilder, 2 Angriff, 1 Schmerz, 5 Tod [D2]. Todesbilder mit Rotation 0 gelten für alle Winkel [D3]. | Genau das Mengengerüst für Gegner |
| *Ragnarok Online* | Alle Figuren sind 2D in einer 3D-Welt: 5 Varianten für 8 Richtungen, die rechte Seite gespiegelt [R1] | Der Präzedenzfall »2D-Figuren, 3D-Welt, 8 Richtungen« |
| SLYNYRD, Pixelblog 55/56 | 8 Richtungen aus 5 Animationen, Lauf in 6 Bildern. Angriff: 6 Bilder mit 1 lang gehaltenen Ausholbild, danach Schmierbilder [S1, S2] | Takt für Ausholen und Schlag |
| *CrossCode*, *Hyper Light Drifter*, *Moonlighter* | Lauf in allen 8 Richtungen [C1]; 4 Richtungen, davon 3 eindeutig [H1]; 4 Ansichten [M1] | 8 ist der obere Standard |
| *Enter the Gungeon* | Orthografische Kamera; Böden und Wände um 45° gekippt, alles um √2 gestreckt, Sprites auf leicht gekippten Quads [G1] | Bei uns entspricht das dem Faktor 1/0,8 = 1,25 (s. 7) |
| HD-2D (*Octopath*) | Pixel-Billboards in 3D, dynamisches Licht, Sprites werfen Schatten [O1] | Licht und Schatten der Sprites ernst nehmen |
| *Eastward*, *Graveyard Keeper*, *Children of Morta* | Eastward: Pixelkunst in Teile zerlegt, in 3D neu aufgebaut, Bump-Maps von Hand [E1]. Graveyard Keeper: Normalen je Sprite, Pseudo-Tiefe, Schatten aus Sprites, die sich zum Licht drehen [K1]. Children of Morta: Pixel-Animationen mit hochaufgelöstem dynamischem Licht [CM1] | Normalen-Atlas; Schattenkarte zur Sonne drehen |
| *Dead Cells*, *Hades* | Dead Cells rendert 3D-Modelle sehr klein und ohne Kantenglättung, exportiert je Bild Farbe und Normalen und nutzt einen einfachen Toon-Shader; flackernde Pixel blieben ungelöst [DC1]. Hades rendert 3D-Figuren als 2D-Sprites vor [HA1] | Aus 3D-Formen erzeugen ist erprobt. Das Flackern fangen bei uns die Pixelregeln nach dem Rastern ab. |
| *Songs of Conquest* | Tausende animierte Pixel-Billboards in 3D, Drehung im Shader angenähert, Atlanten gegen Draw Calls; der Stil folgte auch aus der Menge [SC1] | Genau unser Fall »sehr viele Gegner« |
| *Don't Starve*, *Cult of the Lamb* | 2D-Skelettanimation (Spine) mit »Häuten«, wenige Ansichten (vorn, Seite, hinten) [CL1, DS1, VW] | Idee »ein Gerüst, viele Häute« übernehmen – aber keine Teile zur Laufzeit drehen (s. 6) |

## 3. Richtungen

- **Zuordnung.** `facing = atan2(dx, dz)`, 0 heißt Süden (zur Kamera). Der Index ist
  `k = round(facing / 45°) mod 8`: 0 S, 1 SO, 2 O, 3 NO, 4 N, 5 NW, 6 W, 7 SW. Gezeichnet
  werden 0–4; 5, 6 und 7 sind die Spiegel von 3, 2 und 1.
- **Die Ostseite zeichnen, den Westen spiegeln.** Die Wege führen von den Spawns links zur Bucht
  rechts, also sind O, NO und SO am häufigsten. Werkzeuge wechseln beim Spiegeln die Hand, das
  nehmen ALttP, Doom und FFT hin [Z2, D1]. Bosse bekommen alle 8 Richtungen: Es ist nur einer im
  Bild, und Axt oder Laterne sollen in derselben Hand bleiben.
- **Feste Kamera.** Die Ansicht folgt direkt aus der Laufrichtung; anders als bei Doom oder RO
  muss kein Kamerawinkel abgezogen werden. Wichtig: immer nach dem **Weltwinkel** wählen, nie
  nach dem Bildwinkel. Nordost läuft im Bild flacher (atan 0,6 ≈ 31°).
- **Hysterese.** `z.facing` ist schon gedämpft (`dampAngle`, Rate 7–10/s). Dazu kommen drei
  Regeln: Den Sektor erst wechseln, wenn der Winkel 10° über die Grenze hinaus ist (32,5° von der
  Mitte) und die alte Richtung mindestens 0,15 s stand. Eine Wendung um 90° oder mehr gilt
  sofort. Beim Ausholen und Schlagen bleibt die Richtung stehen, im Stand die letzte. Das
  empfehlen auch Berichte über flackernde 8-Richtungs-Sprites [T6].
- **Neigung 36,9°.** Höhen erscheinen mit 0,8, Tiefen mit 0,6 (die 3-4-5-Regel der Welt). Jede
  Ansicht zeigt also etwas Kopfoberseite, und Schritte nach Norden oder Süden sind im Bild
  kürzer. Wer von Hand zeichnet, muss das einhalten; aus 3D-Formen gerastert stimmt es von selbst.
- **16 Richtungen** braucht es nicht, Schlurfer drehen langsam.

## 4. Animationen und Bilder

| Zustand | Bilder | Takt (Quelle im Code) | Anmerkung |
|---|---|---|---|
| Gehen | 4 (Flitzer rennt: 6) | aus `z.phase`, das mit dem Weg wächst (`phase += dt·moving·5,5`) | Die Füße rutschen nicht. Schlurfer hinken asymmetrisch. |
| Stehen, abgelenkt, betäubt | 2 | 2–6 Bilder/s | Betäubt: Kopf taumelt, dazu wie heute das Zeichen über dem Kopf |
| Ausholen | 1 | solange `windup` läuft (0,38 s) | Schlüsselpose halten, 1 px Zittern [S2, DC1] |
| Schlag | 3 | `attackAnim`, 0,45 s | Schmierbild, Treffer, zurück. Gleiche Bilder für Barrikade, Tor, Haus und Mika. |
| Treffer | 1 | `recoil`, 0,22 s | Weißblitz und 1 px Zittern wie heute |
| Fallen | 4 | `deathT` 0–0,45 s | Danach versinken (Boden verdeckt) und gerastert ausblenden |
| Graben (Gräber) | 4 | 0,6 s ab, 0,45 s auf (rückwärts) | Unter der Erde vielleicht ein wandernder Erdhügel |
| Fliegen (Moderfalter) | 4 Flügelschläge | 12 Bilder/s | Dazu ein kleiner Bodenschatten für die Höhe |
| Schildträger | alle doppelt | mit und ohne Tür | als zweite Haut |
| Boss | Gehen 4–6, Ausholen 2 (Schleife mit Zittern), Schlag 3–4, Stürmen 6 (Holzfäller), Treffer 1, Fallen 5 | Ankündigung 1,2–1,5 s (`bosses.js`) | 8 Richtungen |

**Menge:** Eine normale Art braucht etwa 17 Bilder × 5 Richtungen = 85 Bilder, ein Boss etwa
25 × 8 = 200. Das deckt sich mit Doom (4/2/1/5) [D2] und handelsüblichen Gegner-Paketen (Lauf 4,
Angriff 3–6, Treffer 3, Tod 6) [T12]. Weil jedes Bild erzeugt wird, darf der Tod – anders als bei
Doom – alle Richtungen haben.

## 5. Größe und Stil

**Texelgröße.** Eine aufrechte Fläche von 1 m ist im Bild 0,8 × 80 = 64 px hoch. Senkrecht sind
1/32 m also genau 2 px (wie ein Voxel), waagrecht entsprechen 2 px = 1/40 m. Das gibt quadratische,
ganzzahlige Texel: **2 × 2 px bei 80 px/m, 4 × 4 px nah.**

- **Nicht 1/32 m breit** (2,5 px): Dann wechseln Spalten zwischen 2 und 3 px und kriechen beim
  Laufen [T7].
- **Nicht 1 px je Texel:** Das sind viermal so viele Texel, und es wäre feiner als die Welt
  (Voxel 2–2,5 px) – ein fremder Stil.
- **3 px** wäre gröber als Mika. Die Texelgröße bleibt aber ein Regler in `data/sprites.js`; der
  Prototyp kann beide zeigen.

**Maße.** Aus den heutigen Modellen gemessen (Ruhehaltung) ist ein Schlurfer im Bild
80 × 115 px groß, das sind **40 × 58 Texel** (Zelle mit Rand 48 × 64). ALttP zum Vergleich: Link
füllt 24 von 224 Zeilen (10,7 %), unser Schlurfer 115 von rund 900 (13 %). Die Größen der
übrigen Arten:

| Art | Texel |
|---|---|
| Schwärmer (0,62) | etwa 25 × 39 |
| Brummer (1,4) | etwa 70 × 96 |
| Holzfäller (1,75) | etwa 88 × 108 |
| Moderherz (2,3) | etwa 121 × 127 |

**Scharf bleiben:**

1. Den Fußpunkt im Shader auf ganze Bildpunkte rasten (Kamera und Wackeln sind es schon).
2. Nie zur Laufzeit skalieren. Champions (×1,15), die Teile des Moosriesen (×0,55) und die
   Teil-Schlurfer (×0,8) werden als eigene Größe **neu gerastert**. Das geht nur, weil die
   Sprites aus Formen entstehen.
3. Nie drehen: Umfallen sind eigene Bilder.
4. Nur waagrecht spiegeln.
5. In ganzen Pixeln versinken und gerastert ausblenden.

**Unterscheidbar bleiben.** Im Pulk verdeckt der Vordermann Beine und Bauch, frei bleibt der
Kopf. Also gehört das Merkmal nach oben:

- Merkmale: Gänseblümchen, rote Kapuze, Fliegenpilze, Warnkegel, Leuchthut, Geweih,
  Schiebermütze, Kochtopf, Kutte, Sporenhöcker (das Vokabular aus `SPECS` bleibt).
- Dazu je Art eine Hauptfarbe aus der Palette und nachts eine Glüh-Signatur (Augenfarbe und
  Glühteil).
- Vier Größenklassen und das Gangbild: der Flitzer vorgebeugt, der Brummer breit stampfend, der
  Schwärmer tief trippelnd, der Falter in 1 m Höhe.
- Champions werden ×1,15 neu gerastert, schimmern golden wie heute und tragen einen
  Krönchen-Stempel.
- Prüfen mit einem **Silhouettentest** im Musterbogen: alle Arten schwarz auf hell in halber
  Größe.

## 6. Erzeugung im Code

| Weg | Hübsch? | Aufwand für 16 Arten × 5 Richtungen × ~17 Bilder | Richtungen stimmig? | Urteil |
|---|---|---|---|---|
| Pixel-Karten als Zeichenketten, jedes Bild von Hand | am besten, wenn gut gezeichnet | riesig (~1 400 Bilder zu je ~2 500 Zeichen) | nur mit großer Disziplin | nur für **Stempel** (Augen, Mund, Hüte) |
| Schichtpuppe aus Pixelteilen je Richtung (wie Kleidungsschichten) | gut | mittel; Arme und Beine je Bild neu | ja | gut für Varianten, Bewegung steif |
| 2D-Skelett mit Drehung zur Laufzeit (Spine-artig) | Pixelkunst leidet: Treppen, Mischpixel; RotSprite nur Notbehelf [T9] | gering | 2–3 Ansichten | nicht für Pixelkunst |
| **Grundkörper in 3D + CPU-Strahlverfolgung + Pixelregeln + Stempel** | sauber und einheitlich; Handschrift über Regeln und Stempel | gering bis mittel, alles in Parametern | ja, auch Neigung und Größen | **Empfehlung** |
| Abstandsfelder aus `voxelKit` abtasten (Raymarching) | wie oben, weichere Formen | mehr Rechenzeit | ja | Variante für Bosse und Organisches |
| Heutige Voxelmodelle auf der GPU in ein Atlas-Render-Target rendern | wie heute, nur pixeliger | gering | ja | nur als Technik-Zwischenschritt |
| Zufallsmasken (Sprite-Generatoren) | für Icons | gering | nein | ungeeignet |

**Empfohlene Pipeline je Bild:**

1. **Pose.** Gelenke in 3D aus Posenwerten; die heutigen Winkel aus `pose()` sind eine gute
   Vorlage (Beine 0,62/0,45 für das Hinken, Arme −1,35, Ausholen −2,2). Das Gerüst wird um die
   Richtung gedreht.
2. **Rastern.** Je Texel geht ein Strahl in Blickrichtung (0, −0,6, −0,8) und schneidet
   analytisch Kugeln, Ellipsoide, Kapseln, Kegel, Zylinder und Quader (Formeln nach Quilez
   [T8]). Das ergibt Teil, Tiefe und Normale.
3. **Farbe.** Die Materialrampe kommt aus `RAMPS` (schon farbverschoben: Schatten ins Violette,
   Lichter ins Warme). Drei Töne je Material aus der gequantelten Normalen. Muster wie Karo,
   Flicken oder Moos entstehen in Oberflächenkoordinaten.
4. **Pixelregeln.**
   - Außenkontur 1 Texel, farbig als »Sel-out« aus der dunklen Rampe der Nachbarfarbe [T10].
   - Innenlinien, wo die Tiefe zwischen zwei Teilen springt – dasselbe Prinzip wie im Post-Pass.
   - Einzelpixel entfernen, Treppen glätten.
   - Keine Farbe außerhalb der Rampen.
5. **Stempel.** Augen, Mund, Nähte, Blume, Kegelstreifen, Krönchen: kleine Zeichenketten je
   Richtung, auf den projizierten Kopf gesetzt.
6. **Kanäle.** Zwei RGBA8-Texel je Bildpunkt: Farbe mit Deckung, dazu Normale mit Glühmaske.

**Kosten** (Schätzung, VW):

- Ein Bild hat etwa 3 000 Texel mit je 3–4 Treffertests nach Rechteck-Vorauswahl.
- Eine normale Art (85 Bilder) braucht 20–40 ms, ein Boss 150–300 ms.
- Gebacken wird faul: die Arten der Nacht aus dem Nachtplan, Bosse schon am Morgen der
  Bossnacht, Champion-Größen nur bei Bedarf. Auf Wunsch geht das in einem Modul-Worker.
  Worker brauchen keinen Build-Schritt.

**Atlas:**

- Seiten von 2048², ein Regalpacker; jede Art bekommt ein Band aus Zeilen. Hochgeladen werden
  nur diese Zeilen mit `texture.addUpdateRange` – in r186 vorhanden, geprüft in `lib/three`.
- Eine `DataTexture` statt eines Canvas: kein `getImageData`, kein `readPixels`. Die Daten liegen
  im Speicher und lassen sich nach einem Kontextverlust neu hochladen; ein Render-Target-Atlas
  müsste neu gerendert werden.
- Speicher: Eine normale Art braucht etwa 2 MB (48 × 64 × 85 × 8 Byte), ein Boss mit 8
  Richtungen bis rund 30 MB (mit 5 Richtungen gut die Hälfte); typisch sind je Nacht 10–35 MB.
  Die heutige Horde-Geometrie belegt gemessen 23 MB.
- Sparen lässt sich zweifach: jedes Bild auf seinen Rahmen zuschneiden (etwa −40 %) und später
  indizierte Farben (1 Byte Palettenindex plus 1 Byte Normalenindex, dann ein Viertel).

## 7. Einbindung in three.js

- **Aufrecht statt gekippt.** Ein zur Kamera gekippter Quad der Höhe *h* und ein **aufrechter**
  Quad der Höhe *h*/0,8 ergeben orthografisch genau dasselbe Bild. Der aufrechte hat aber die
  Tiefe einer stehenden Figur: Seine Oberkante kippt nicht 0,6·*h* nach Norden in Bauten dahinter.
  Das ist Gungeons √2-Kniff für unsere Neigung [G1]; Foren nennen denselben Ausweg gegen
  Billboard-Clipping [T4].
- **Ein `InstancedMesh` für alle Arten** je Atlasseite. `instanceMatrix` trägt nur den Fußpunkt,
  eigene `InstancedBufferAttribute`s in der Geometrie tragen den Rest [T1]; three bindet sie mit
  Divisor (in r186 geprüft):
  - `aRect`: Bild im Atlas
  - `aPivot`: Fußpunkt, Spiegeln, Tiefenversatz
  - `aTint` und `aFlags`: nur Glühteile, Ausblenden
- **Alpha-Test mit `discard`, kein Blending.** Dann stimmen Tiefenpuffer, Umrisse und Staffelung,
  und nichts muss sortiert werden.
- **Tiefenversatz.** Alle Sprites rücken 0,3 m entlang der Blickachse zur Kamera. Orthografisch
  ändert das das Bild nicht, aber der vordere Fuß (bis etwa 0,18 m unter dem Fußpunkt)
  verschwindet nicht im Boden. Dazu kommen 1–2 mm je Schlurfer-ID gegen Z-Fighting bei gleicher
  Stelle. Die Alternative sind Tiefen-Sprites mit `gl_FragDepth` [T5]; das ist genauer, bringt
  aber Durchdringung zurück.
- **Licht.** `MeshLambertMaterial` wird wie in `materials.js` per `onBeforeCompile` gepatcht: Farbe
  per `texelFetch`, die Normale aus dem Atlas in Weltkoordinaten (beim Spiegeln wird x negiert).
  Sonne, Mond, Laterne, Feuer und Veranda leuchten die Sprites dann genauso an wie die Voxel.
  - Die Stärke der Normalen ist ein Regler: 0 heißt flach wie gemalt, 1 voll.
  - Nachts bleibt das Eigenlicht (`selfLight 0.2`) wie heute.
- **Glühen.** Glüh-Texel sind unbeleuchtet (wie heute `MeshBasicMaterial`) und brauchen keinen
  eigenen Draw Call. In der Nebelwelle zeichnet der Shader nur Glüh-Texel; dann leuchten im
  Dunkeln nur die Augen. Das Moderherz pocht über einen Faktor je Instanz.
- **Tönung.** Die Werte aus `TINT` bleiben (Weißblitz ×4, Frost, Brand, betäubt,
  Champion-Gold). Das Zittern bei Treffern ist 1 px am Fußpunkt.
- **Umriss hinter Verdeckungen.** Ein zweites Mesh mit denselben Attributen, Tiefentest GREATER
  und gerasterter Dichte 0,38 wie heute, aber mit dem Alpha des Atlas. Das ersetzt den groben
  1/16-Nachbau.
- **Schatten.** Eine Karte auf `SHADOW_LAYER` mit `customDepthMaterial` [T2]. Der Vertex-Shader
  dreht sie **zur Sonne**, der Alpha-Test macht die Figur daraus. Flache Billboards werfen von der
  Seite sonst hauchdünne Schatten [T3]; Graveyard Keeper dreht Sprite-Schatten genauso zum Licht
  [K1]. Kosten: 2 Dreiecke statt 2 250–5 000.
- **Kulling** bleibt wie heute: Kugeltest je Schlurfer, 2,5 m Rand, nur Sichtbare werden
  geschrieben.
- **Füße und Boden.** Der Fußpunkt liegt auf `(x, z.y, z)`. Der Falter fliegt in 1,05 m; der
  Gräber sinkt, und der Boden verdeckt ihn wie heute.
- **Clipping – was sich ändert:**

  | | Heute (3D) | Sprites |
  |---|---|---|
  | Schlurfer untereinander | Glieder stecken ineinander | nie: parallele Ebenen, der südlichere steht vorn |
  | gleiche Stelle | – | fester Tiefenversatz je ID statt Flackern |
  | gegen Bau, Barrikade, Tor, Mika | Volumen schneidet Volumen | gleich häufig; ein Schnitt sieht bei einer flachen Figur härter aus – der Tiefenversatz verschiebt die Grenze um den Körperradius |

  **Achtung Umriss:** Der Post-Pass zeichnet Linien erst ab 0,22 m Tiefensprung. Zwei Sprites,
  die weniger als etwa 0,18 m hintereinander stehen, verschmelzen sonst. Deshalb bekommen die
  Sprites ihre **eigene Kontur**.

## 8. Leistung

| | Heute | Sprites |
|---|---|---|
| Dreiecke je Schlurfer | 11 600–29 500 (gemessen) | 6 (Bild, Umriss, Schatten je 2) |
| 300 Schlurfer im Bild | etwa 6–7 Mio. | etwa 1 800 |
| Draw Calls der Horde | etwa 19–22 je Art im Bild (Teile, Umrisse, Schatten); 6 Arten → ~120 | 3–4 je Atlasseite |
| CPU für die Haltung, 563 Schlurfer | 0,60 ms, 246 KB Upload | unter 0,05 ms, 30–70 KB |
| Speicher | Geometrie aller Arten 23 MB, Instanzpuffer 1,5 MB (gemessen) | Atlas faul, typisch 10–35 MB |

Das entlastet die Grafikkarte in späten Nächten stark. Laut PROGRESS (M25) zeichnete das Bild bei
563 Schlurfern ohne Kulling 25,6 Mio. Dreiecke, mit Kulling 3,5 Mio. – die Horde ist dort der
größte Posten. Im softwaregerenderten Prüfbrowser sollte der Umbau die Bildzeiten deutlich
senken. Die CPU-Ersparnis ist klein: Simulation und Abstandhalten bleiben gleich.

## 9. Alternativen kurz bewertet

| Technik | Wann sinnvoll | Urteil |
|---|---|---|
| Heutige Modelle beim Laden in einen Atlas vorrendern (GPU) | Schnellster Weg zu 8-Richtungs-Sprites. Er geht ohne `readPixels`: in ein `WebGLRenderTarget` rendern und dessen Textur direkt im Sprite-Material nutzen. | Behält den ungeliebten Look, halbe Auflösung verstärkt das Rauschen, nach Kontextverlust neu rendern. Höchstens als Technikprobe. |
| Sprite-Stacking (Schichten eines Voxelmodells) | starre Objekte bei drehbarer Aufsicht, etwa NIUM [T11] | Bei 36,9° Neigung sind viele Schichten und hohe Überzeichnung nötig; sieht aus wie heute; Durchdringung bleibt. Nein. |
| Bessere 3D-Modelle | wenn der Stil 3D bleiben soll | Formen und Rauschen ließen sich verbessern. Dreiecke, Pixelkriechen und Ineinander bleiben, und der Wunsch »2D« bliebe unerfüllt. |
| Tiefen-Sprites (Farbe plus Tiefe, `gl_FragDepth`) [T5] | wenn Schnitte mit Bauten stören | Später als Zusatz; kostet Early-Z und bringt Durchdringung zurück |

## 10. Risiken und Gegenmittel

| Risiko | Gegenmittel |
|---|---|
| **Stilbruch:** 2D-Schlurfer neben Voxel-Mika, Bewohnern und Türmen | Gleiche Körnung (2 px), gleiches Licht (Normalen), gleiche Palette und Umrissfarbe; Vergleichsbilder weit und nah, Tag und Nacht. Mika bleibt vorerst Voxel (sonst Hunderte Posen) – Entscheidung nach dem Prototyp. |
| Prozedurale Sprites wirken beliebig | Stempel von Hand für Gesichter und Merkmale, Posen übertreiben (Ausholen halten, Schmierbild), Musterbogen zur Durchsicht |
| Richtungsflackern | Hysterese, Mindestdauer, Richtung beim Schlag einfrieren; Prüfpunkt mit ±8° Wackeln an der Grenze |
| Lesbarkeit im Getümmel | Eigene Kontur, Merkmal oben, Staffelung von Süd nach Nord; ±5 % Helligkeit je Instanz |
| Nacht | Eigenlicht und Glühmaske wie heute; Laterne und Feuer beleuchten die Normalen |
| Nebelwelle | Flag »nur Glühteile«; der Umriss hinter Bauten entfällt dann ebenfalls, wie heute |
| Zeichen über dem Kopf | Bleiben UI (`2.05 × scale`); besser: je Bild gebackener Kopfpunkt |
| Hitboxen | Bleiben Daten (`radius`, `scale`, Bildschirmkasten in `zombieAtPointer`). Neu möglich: pixelgenaue Auswahl über das Alpha im CPU-Atlas, ganz ohne GPU. |
| Speicher und Backzeit | Faul backen nach Nachtplan, Bosse am Morgen vorher, Worker, zuschneiden |
| Pixelkriechen, Mischpixel | Fußpunkt rasten, nie skalieren oder drehen, Größen neu rastern |
| Prüfskript bricht | Die N1-Prüfung liest `horde.kinds[..].meshes.head.geometry`, `detail()` misst die Horde-Geometrie – beides anpassen (s. 11) |
| Kompilier-Hänger | Neue Materialien in `game.precompile` aufnehmen |

## 11. Empfehlung und Plan

**Architektur.** Die Horde-Logik bleibt. `horde.render(camera)` gibt an eine Ansicht ab:
`HordeVoxelView` (der heutige Code) oder `HordeSpriteView`. Umschalten mit `?horde=voxel|sprite`,
über die Test-API `setHordeLook(art)` und in der Entwickleranzeige. Der Spielstand ändert sich
nicht.

| Modul | Aufgabe |
|---|---|
| `src/data/sprites.js` | Zahlen: Texel, Streckung, Hysterese, Bilder und Takt je Zustand |
| `src/entities/zombieSprites.js` | Baupläne (`mensch`, `falter`, `herz`), Häute je Art, Stempel |
| `src/render/spriteBaker.js` | Strahlverfolger, Pixelregeln, Kanäle |
| `src/render/spriteAtlas.js` | Seiten, Packer, `DataTexture`, Teil-Uploads, Bildtabelle |
| `src/render/spriteMaterial.js` | Lambert-Patch, Umriss- und Schattenmaterial |
| `src/entities/hordeSprites.js` | Richtung, Zustand → Bild, Instanzdaten, Kulling |

**Datenformat (Skizze):**

```js
// data/sprites.js – Werte, keine Kunst
export const SPRITE = { texel: 2, stretch: 1 / 0.8, hyst: 10, hold: 0.15, depthBias: 0.3 };
export const ANIMS = {
  gehen: { frames: 4, by: 'phase' }, rennen: { frames: 6, by: 'phase' },
  stehen: { frames: 2, fps: 2 },     ausholen: { frames: 1, hold: true, tremble: 1 },
  schlag: { frames: 3, over: 0.45 }, treffer: { frames: 1, over: 0.22 },
  fallen: { frames: 4, over: 0.45 }, graben: { frames: 4, over: 0.6 }, flattern: { frames: 4, fps: 12 },
};
// entities/zombieSprites.js – die Kunst als Daten
export const SKINS = {
  schlurfer: { body: 'mensch', gait: 'hinken', stoop: 0.14,
    ramps: { haut: 't4', hemd: 'b2', hose: 'e3', schuh: 't3', moos: 'g5' },
    head: { augen: 'gelb', mund: 'naht' }, marks: ['gaensebluemchen', 'moosSchulter'],
    glow: ['augen', 'moderpilzeHinten'] },
  // … zehn weitere Arten, fünf Bosse
};
export const STAMPS = { gaensebluemchen: { S: [' w ', 'wyw', ' w ', ' g '], O: [' w', 'wy', ' g'] } };
```

**Shader (Skizze, Patch von `MeshLambertMaterial`):**

```glsl
// statt <begin_vertex>: aufrechter Quad, Fußpunkt auf ganze Bildpunkte
vec3 a = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;          // Fußpunkt (Welt)
vec2 img = vec2(a.x, dot(a, vec3(0.0, 0.8, -0.6)));                 // Lage im Bild (m)
vec2 snap = floor(img / uPx + 0.5) * uPx - img;                      // auf das Raster
vec2 t = position.xy * aRect.zw - aPivot.xy;                         // Texel ab dem Fußpunkt
vec3 transformed = vec3(snap.x + t.x / 40.0, t.y / 32.0, 0.0)        // 1 Texel = 1/40 × 1/32 m
                 + vec3(0.0, 0.8, -0.6) * snap.y                     // Bild-oben = Kamera-oben
                 + vec3(0.0, 0.6, 0.8) * aPivot.w;                   // Tiefenversatz, Bild bleibt
vUv = aRect.xy + vec2(aPivot.z > 0.0 ? position.x : 1.0 - position.x, position.y) * aRect.zw;

// statt <map_fragment> und <alphatest_fragment>
vec4 c = texelFetch(uAtlas, ivec2(vUv), 0);   if (c.a < 0.5) discard;
vec4 e = texelFetch(uExtra, ivec2(vUv), 0);   bool glow = e.a > 0.5;
if (vFlags.x > 0.5 && !glow) discard;                                   // Nebelwelle
if (bayer4(ivec2(gl_FragCoord.xy) + uDitherOffset) < vFlags.y) discard; // Versinken
diffuseColor.rgb = glow ? vec3(0.0) : c.rgb * vTint;
// statt <normal_fragment_maps>
vec3 nW = e.rgb * 2.0 - 1.0;  nW.x *= vFlip;                          // Weltnormale, gespiegelt
normal = normalize(mat3(viewMatrix) * mix(vec3(0.0, 0.6, 0.8), nW, uNormalAmount));
// nach <emissivemap_fragment>
totalEmissiveRadiance += glow ? c.rgb : diffuseColor.rgb * uSelfLight * uNight;
```

Der Umriss-Pass nutzt denselben Vertex-Teil. Die Schattenkarte ersetzt `transformed` durch eine
zur Sonne gedrehte Karte (`side = normalize(vec3(uSun.z, 0.0, -uSun.x))`). Weil die Zellen
waagrecht um den Fußpunkt zentriert sind, spiegelt `1.0 - position.x` um den Fußpunkt.

**Meilensteine:**

| Schritt | Inhalt | Aufwand |
|---|---|---|
| **F1 – Ein Schlurfer auf Papier** (Prototyp) | Baker, Atlas, Material, Ansicht; der Schlurfer mit Gehen, Stehen, Treffer und Fallen in 5 Richtungen; Glühaugen nachts, Umriss hinter Bauten, Schatten; Umschalter; Musterbogen (der CPU-Atlas als Oberflächenbild, ohne GPU-Auslesen); Vergleichsbilder beider Looks (weit/nah, Tag/Nacht, Getümmel am Tor). **Danach entscheidet der Auftraggeber.** | 1–1,5 Sitzungen |
| **F2 – Die ganze Horde** | 10 weitere Arten; Ausholen, Schlag, Graben, Fliegen, Tür; Champions und Größen; Nebelwelle; faules Backen nach Nachtplan; Leistungsvergleich | 1–1,5 |
| **F3 – Bosse** | 5 Bosse in 8 Richtungen; Ankündigung (Ausholen mit Zittern), Stürmen, Zerfallen in ×0,55; Moderherz mit pochenden Knoten | 1 |
| **F4 – Aufräumen** | Voxel-Horde entfernen (oder als Rückfall behalten); N1-Prüfung und `detail()` anpassen; CLAUDE.md (Look-Regeln: Horde als Sprites, Texel 2 px), DESIGN 3.1/3.3, OFFENE-FRAGEN, PROGRESS | 0,5 |

**Prüfpunkte** (neuer Abschnitt `sprites` in `tools/check.mjs`, Test-API `sprites()`):

1. Atlas: Jede gebackene Art hat 5 Richtungen (Bosse 8) und alle Zustände; kein Bild ist leer;
   ein Texel ist bei weit 2 px und bei nah 4 px groß.
2. Richtungen: Ein Schlurfer im Kreis zeigt alle 8 der Reihe nach, W/NW/SW gespiegelt. Wackelt
   der Winkel ±8° an einer Grenze, wechselt die Richtung in 2 s höchstens einmal; eine echte
   90°-Wendung wechselt in unter 0,2 s.
3. Pixelraster: Bei einem laufenden Schlurfer liegt der Fußpunkt in 60 Schritten immer auf
   ganzen Bildpunkten.
4. Zwei Schlurfer auf derselben Stelle haben verschiedene Tiefenversätze.
5. Zustände (Gehen, Ausholen, Schlag, Treffer, betäubt, Fallen, Graben, Fliegen) liefern die
   passenden Bilder.
6. Nebelwelle: nur Glühteile; die Laterne holt den Schlurfer ins Bild.
7. Ein Champion ist neu gerastert, nicht skaliert.
8. Leistung mit 300 Schlurfern im Bild: höchstens 2 000 Horde-Dreiecke, höchstens 6 Draw Calls;
   p50/p95 im Vergleich beider Looks im selben Lauf.
9. Schattenkarten gibt es für alle Sichtbaren, Umrisse nur für Lebende.
10. Die Konsole bleibt sauber.
11. Bilder: `sprites-tag`, `sprites-nacht`, `sprites-nebel`, `sprites-boss`, `sprites-atlas` sowie
    Vergleichsbilder in beiden Looks.

**Code-Umfang (grob):** Baker 700–900 Zeilen, Entwürfe 800–1 200, Ansicht und Material 400–500,
Prüfungen 300.

**Entscheidungen für OFFENE-FRAGEN:** Mika und Bewohner bleiben Voxel (vorerst). Texel 2 px.
Eigene Kontur ja. Normalen-Stärke nach Augenschein. Werkzeuge der normalen Arten dürfen beim
Spiegeln die Hand wechseln.

## Quellen

Vorbilder
- [Z1] ALttP: 8 Laufrichtungen, 4 Blickrichtungen – https://forums.nesdev.org/viewtopic.php?t=6703
- [Z2] Gespiegelte Sprites (»Ambidextrous Sprite«) – https://tvtropes.org/pmwiki/pmwiki.php/Main/AmbidextrousSprite · https://gamefaqs.gamespot.com/boards/588436-the-legend-of-zelda-a-link-to-the-past/69632255
- [Z3] Link 16 × 25, 7 Laufbilder (nur Suchauszug) – https://gablaxian.com/articles/creating-a-game-with-javascript/animation/
- [D1] Doom-Rotationen – https://zdoom.org/wiki/Sprite · https://doomwiki.org/wiki/Sprite
- [D2] Zombieman-Bilder – https://doomwiki.org/wiki/Zombieman
- [D3] Todesbilder aus allen Winkeln – https://www.doomworld.com/forum/topic/65683-death-and-dead-sprite-angles/
- [R1] Ragnarok Online – https://en.namu.wiki/w/%EB%9D%BC%EA%B7%B8%EB%82%98%EB%A1%9C%ED%81%AC%20%EC%98%A8%EB%9D%BC%EC%9D%B8
- [S1] SLYNYRD Pixelblog 55 – https://www.slynyrd.com/blog/2025/3/24/pixelblog-55-top-down-character-animation
- [S2] SLYNYRD Pixelblog 56 – https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation
- [C1] CrossCode – https://www.radicalfishgames.com/?p=1833
- [H1] Hyper Light Drifter – https://forums.tigsource.com/index.php?topic=63350.0
- [M1] Moonlighter – https://80.lv/articles/moonlighter-building-pixel-art-preparing-for-switch
- [G1] Enter the Gungeon – https://discussions.unity.com/t/how-would-i-setup-my-camera-to-get-a-result-that-looks-like-enter-the-gungeon/201673 · https://copyprogramming.com/howto/how-does-a-game-like-enter-the-gungeon-handle-forward-and-backwards-movement-with-their-orthographic-set-up
- [O1] HD-2D – https://en.wikipedia.org/wiki/HD-2D · https://www.unrealengine.com/en-US/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style
- [E1] Eastward – https://www.gamedeveloper.com/art/eastward-s-creators-share-insights-on-making-pixel-art-adventures · https://80.lv/articles/eastward-charming-chinese-pixel-art-adventure
- [K1] Graveyard Keeper – https://www.gamedeveloper.com/programming/graveyard-keeper-how-the-graphics-effects-are-made
- [CM1] Children of Morta – https://techraptor.net/gaming/previews/how-dead-mage-created-art-for-children-of-morta · https://www.gamedeveloper.com/design/postmortem-children-of-morta
- [DC1] Dead Cells – https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i- · https://80.lv/articles/case-study-dead-cells-character-art-pipeline
- [HA1] Hades – https://www.gamedeveloper.com/art/learn-how-supergiant-brought-i-hades-i-hand-painted-characters-to-life
- [SC1] Songs of Conquest – https://80.lv/articles/mixing-2d-billboards-and-3d-environments-in-a-game · https://80.lv/articles/the-shader-approach-to-billboarding
- [CL1] Cult of the Lamb (Spine) – https://esotericsoftware.com/spine-showcase-all
- [DS1] Don't Starve, Ansichten (schwache Quelle) – https://kleiforums.com/forums/topic/101094-side-and-back-animation/

Technik
- [T1] Instancing mit eigenen UVs je Instanz – https://discourse.threejs.org/t/sprite-instancing-with-uv-mapping/17234 · https://discourse.threejs.org/t/instancedmesh-and-sprite/68091 · https://github.com/mrdoob/three.js/blob/dev/src/objects/InstancedMesh.js
- [T2] Schatten mit Alpha und Instancing – https://discourse.threejs.org/t/cast-shadows-in-shader-material-with-alpha-map/59152 · https://discourse.threejs.org/t/shadow-for-instances/7947
- [T3] Billboard-Schatten von der Seite – https://discussions.unity.com/t/shadowcaster-that-billboards-towards-light/881036 · https://github.com/godotengine/godot/issues/41420
- [T4] Billboard-Clipping – https://discussions.unity.com/t/problem-solving-2d-billboard-sprites-clipping-into-3d-environment/743786 · https://gist.github.com/unitycoder/b23acba0712bd8798b1ea360f430f94b
- [T5] Tiefen-Sprites – https://webglfundamentals.org/webgl/lessons/webgl-qna-depth-sprites.html
- [T6] Flackern in 8 Richtungen – https://dev.to/framesprite/the-eight-direction-sprite-bug-that-changes-between-godot-and-unity-3o84 · https://gamedev.net/forums/topic/648130-8-direction-2d-animations-flicker/
- [T7] Pixelkriechen – https://medium.com/@elliotbentine/pixelizing-3d-objects-b55ec33328f1 · https://sites.google.com/view/propixelizer/home
- [T8] Strahl-Grundkörper-Schnitte – https://iquilezles.org/articles/intersectors/
- [T9] RotSprite – https://en.wikipedia.org/wiki/RotSprite
- [T10] Sel-out und Farbverschiebung – https://lospec.com/pixel-art-tutorials/tags/selectiveoutlining · https://lospec.com/pixel-art-tutorials/tags/hueshifting · https://pixeljoint.com/forum/forum_posts.asp?TID=11299
- [T11] Sprite-Stacking – https://80.lv/articles/developer-shows-how-to-make-2d-game-look-3d-with-sprite-stacking
- [T12] Bildmengen üblicher Gegner-Pakete (Suchauszug) – https://penusbmic.itch.io/pixel-art-tutorial-complete-enemy-animation · https://pixelvspixel.itch.io/enemy-character

Eigene Messungen: Node 22 mit three r186 aus `lib/three`, Skripte im Scratchpad (`tris.mjs`,
`posebench.mjs`, `extent.mjs`, `mem.mjs`); Codestellen aus `src/entities/horde.js`,
`src/entities/zombieModels.js`, `src/render/*.js`, `src/config.js`, `lib/three/three.module.js`
(Instanz-Attribute, `updateRanges`, Normalenkarten im Objektraum).
