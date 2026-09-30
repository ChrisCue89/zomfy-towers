# Die Horde als Sprites – Gestaltungsbogen (F-Design)

Stand: 30.09.2026 · Auftrag: »Das mit den 2d Schlurfern testen wir bitte. Aber die Designs dürfen
nur Grundlage sein. … du nimmst dir Zeit die Figuren liebevoll detailliert und gut zu gestalten.
Erst wenn du das erledigt hast, bauen wir die 2d Gegner ein und gucken wie das wirkt.«

Grundlage waren die Voxel-Modelle (`zombieModels.js`, N1) und der Prototyp F1
(`schlurfer-sprites.md`). Dieser Bogen beschreibt, was daraus geworden ist: 16 Arten und 5 Bosse
(die 17. Form ist der Schildträger ohne Tür), jede mit eigener Geschichte in Kleidern und Dingen,
in 5 gezeichneten Richtungen mit je 17 Bildern.

Bilder: `schlurfer-gestaltung/reihe.png` (alle Arten, oben am Tag, unten in der Nacht) und je ein
Musterbogen (`bogen-*.png`: acht Richtungen, der Gang von vorn und von der Seite, Ausholen und
Schlag, Treffer und Fallen, unten ein Pulk in Spielgröße). Neu erzeugen:

```
node tools/schlurfer-reihe.mjs recherche/schlurfer-gestaltung/reihe.png
node tools/schlurfer-bogen.mjs recherche/schlurfer-gestaltung/bogen-schlurfer.png --art=schlurfer --zoom=3
```

## 1. Was sich gegenüber F1 geändert hat

- **Proportionen wie die Welt.** F1 war »realistisch« (Beine 0,62 m, kleiner Kopf) und wirkte
  neben Mika wie ein Stelzenläufer. Jetzt ist der Kopf groß und rund, gut ein Drittel der Figur,
  die Beine sind kurz, der Rumpf breit, die Figur gebeugt. Der Schlurfer ist 1,4 m groß, so groß
  wie Mika und die Voxel-Schlurfer.
- **Vier Töne und ein Glanz je Stoff.** Jeder Stoff hat eine Rampe der Palette. Die Normale wählt
  tiefen Schatten, Schatten, Grund oder Licht; auf Kuppen sitzt mit `shine` ein Glanzpunkt.
  Unterseiten liegen immer im Schatten.
- **Linien, wo sich etwas trifft.** An Tiefensprüngen wird das hintere Texel zwei Stufen dunkler.
  Stoffe mit `seam` bekommen eine Stufe dunkler, wo ein anderer Stoff beginnt. Dazu kommen
  Kantenlicht oben links und eine farbige Kontur (Sel-out: zum Licht heller). Einzelne Texel werden
  aufgeräumt.
- **Muster auf der Form** (`matAt`, neu im Bäcker). Eine Form kann Bereiche in einem anderen
  Stoff malen, im eigenen Rahmen der Form, damit das Muster mit der Figur mitgeht. Beispiele:
  Haar auf dem Kopf, Kapuze mit Gesichtsoval, Karo, Leuchtstreifen, Flicken, Tupfen, Adern.
- **Boden.** Unter y = 0 ist Erde (`Math.max(d, −y)`). Beim Fallen versinken die Figuren darin,
  statt durch den Boden zu ragen.
- **Gerüst für alle** (`spriteFigure.js`):
  - `humanoid(ctx, B)` setzt Beine, Rumpf, Arme, Hals und Kopf nach Maßen und gibt die Gelenke
    zurück.
  - Gangarten: hinken, rennen, trippeln, stampfen, schreiten, watscheln (mit Wiegen zur Seite).
  - Posen je Zustand; Ellbogen und Spreizen je Arm einzeln.
  - Große Arten werden gebaut wie Größe 1 und danach als Ganzes skaliert. Ein Texel bleibt immer
    1/40 m, deshalb gibt es kein Pixelgemisch.
- **Siebzehn Bilder je Richtung** (85 je Art): gehen 6, stehen 2, ausholen 1, schlag 3 (herab,
  Wischer, Aufprall mit Staub), treffer 1, fallen 4.

## 2. Leitlinien

1. **Müde statt gierig.** Schwere Lider, ein warmes Glimmen in den Augen, ein genähter Mund. Beim
   Schlag gähnen sie (das offene Maul ist ein Gähnen), getroffen kneifen sie die Augen zu (> <).
   Wenn sie fallen, schlafen sie ein und zerfallen zu Laub.
2. **Gemütlich-schaurig, nie eklig.** Kein Blut, keine Knochen, keine Wunden. Löcher sind Stoff,
   darunter wächst Moos. Dazu Blümchen, Pilzchen und Dinge aus dem früheren Leben.
3. **Lesbar im Pulk.** Ein Merkmal oben (Kopf, Hut, Kegel, Geweih, Pilze) und eine Hauptfarbe je
   Art. In der Aufstellung bleibt jede Art an Umriss und Farbe erkennbar.
4. **Nachts erzählt das Eigenlicht.** Es leuchten die Augen jeder Art, dazu das Besondere: die
   Moderpilzchen am Hinterkopf des Schlurfers, der Hut des Leuchtpilzes, die Streifen des Brummers,
   die Augenflecken des Falters, die Sporensäcke des Brüters, die Laterne der Hexe, der Hut der
   Pilzmutter und die Knoten des Moderherzens.

## 3. Die Arten

| Art | Wer er war / was er ist | Merkmale |
|---|---|---|
| **Schlurfer** (1,0) | ein Mann im blauen Arbeitshemd | Knopfleiste, Brusttasche mit Bleistift, gekrempelte Ärmel, Hemd hängt links aus der Hose, Riss im Rücken mit Moos, Flicken an Bauch und Knie, ein Zeh schaut aus dem Schuh, wirres Haar mit Stirnlocke, eingerissenes Ohr, Gänseblümchen, Moos mit Fliegenpilz auf der Schulter, Moderpilzchen am Hinterkopf; hinkt |
| **Flitzer** (0,95) | ein Läufer | rote Kapuzenjacke mit Naht, Kängurutasche und flatternden Kordeln, Startnummer 13 mit Sicherheitsnadeln, graue Trainingshose mit weißen Streifen, helle Laufschuhe mit rotem Streifen; rennt vorgebeugt, hechelt mit Zunge |
| **Schwärmer** (0,62) | ein Sporenkind aus der Kapsel des Brüters | Moosball mit Flechtengesicht, große blasse Augen, drei Fliegenpilze auf dem Kopf, winzige weiße Blüten; trippelt |
| **Brummer** (1,4) | ein Straßenarbeiter | Warnweste mit Leuchtstreifen, offen über dem braunen Hemd, vernietete Blechplatten auf den Schultern mit Rost, Werkzeuggürtel mit Schraubenschlüssel, Stahlkappen, Schnurrbart, schiefer Warnkegel mit Leuchtring als Helm; stampft und schaukelt |
| **Leuchtpilz** (1,05) | ein stiller Kräutersammler | großer türkis glimmender Hut mit Tupfen und Lamellen, pflaumenfarbenes Gewand bis ans Knie, Strick, Kräuterbeutel, glimmender Sporenbeutel, Mooskragen, schwebende Sporen (er heilt); schreitet |
| **Anführer** (1,65) | der alte Förster | langer grüner Rock mit Messingknöpfen, Lederriemen, Umhang aus Moos mit Fransen, grauer Bart, graues Haar, eine Moosmütze, aus der ein Geweih aus Zweigen mit Blüten wächst, orange glühende Augen; schreitet aufrecht |
| **Moderfalter** (0,85) | eine große Motte | pelziger Leib, geringelter Hinterleib, glimmende Augen, gefiederte Fühler, sechs Beinchen, Augenflecken mit gelbem Ring, heller Rand, Adern; flattert in Kopfhöhe, stäubt, trudelt ins Laub |
| **Gräber** (1,0) | ein Gärtner | Latzhose voller Erde (braune Knie), helles Hemd, Träger mit Messingknöpfen, Möhre in der Latztasche, graue Schiebermütze, Koteletten, Spaten über der Schulter; haut ihn zum Schlag in die Erde |
| **Schildträger** (1,1) | trägt die Tür eines Gartenhäuschens | Brettertür mit ausgesägtem Herz, Messingknauf und Hufeisen, Kochtopf mit Henkeln als Helm, blaugraue Jacke; stößt die Tür nach vorn, beim Fallen fällt sie flach ins Laub. **Ohne Tür** eigene Form (`schildtraegerOhne`) |
| **Lichtfresser** (1,0) | eine Gestalt in der Kutte | Kutte bis zum Boden, unten verrußt, tiefe Kapuze mit Zipfel, darin zwei blasse Augen, Strick mit Knoten, Kerzenstummel im Gürtel (er sammelt, was er gelöscht hat), Kerzenlöscher am Stiel mit Rauchfaden; schwingt ihn zum Schlag |
| **Brüter** (1,2) | aufgedunsen und gutmütig | runder Bauch unter einem zu kurzen Hemd, Pausbacken, drei Sporenhöcker mit glimmenden Spitzen, drei violett glimmende Sporensäcke auf dem Rücken, die im Stehen pulsieren; watschelt |

## 4. Die Bosse

| Boss | Merkmale | Angriff im Bild |
|---|---|---|
| **Holzfäller** (1,75) | rot-schwarzes Karo, Hosenträger, gekrempelte Ärmel, buschiger Bart, rote Pudelmütze mit Bommel, Jeans, Stiefel, Axt geschultert | Hieb: Axt hoch über den Kopf, herab, Staub |
| **Pilzmutter** (1,8) | riesiger violett glimmender Hut mit runden Tupfen, Kleid bis zum Boden mit Moosflecken, Moosumhang, Korb voller Pilze, rosige Wangen | Sporen: Arme hoch, eine glimmende Wolke steigt |
| **Laternenhexe** (1,6) | Spitzhut mit geknickter Spitze, orangem Band und Schnalle, Kutte mit Sternen, graues Haar, lange Nase mit Warze, knorriger Stab mit Laterne | Lichtraub: hebt die Laterne hoch |
| **Moosriese** (2,1) | Leib aus Moos mit runden Findlingen, Steine auf Schultern und Kopf, Fäuste mit steinernen Knöcheln, Farnwedel mit Fiedern, grün glimmende Augen, Flechten | Stampfer: Fäuste hoch, Staub |
| **Moderherz** (2,3) | ein Herz aus Geflecht mit Adern, zwei Kammern mit Moos, Kerbe und Furche, eine Krone aus Pilzhüten, glimmende Knoten, Wurzelbeine, die sich auffächern, Ranken, die sich einrollen; pocht im Stehen | Wurzeln: Ranken hoch, mehr Knoten glimmen, Dornen brechen aus dem Boden |

## 5. Was F2 daraus gemacht hat

Umgesetzt am 30.09.2026 (PROGRESS »F2«, OFFENE-FRAGEN Nr. 213). Im Spiel ist 2D jetzt der
Standard, »Schlurfer: 3D/2D« schaltet um.

- **Alle Formen in `hordeSprites`:** Eine Fassung ist eine Form in einer Größe.
  - Der Schildträger mit gebrochener Tür zeigt `schildtraegerOhne`.
  - Die Teile des Moosriesen (×0,55) und Champions (×1,15) werden in ihrer Größe gebacken
    (`bakeFrame(…, type, f)`). Bis dahin zeigen sie die Grundform vergrößert.
- **Ausholen und Schlag:**
  - `z.windup` und `z.boss.windup` zeigen `ausholen`; der Boss zittert dabei.
  - `z.attackAnim` zeigt `schlag` in drei Bildern über 0,45 s.
  - Nach dem Ausholen eines Bosses setzt `bossStep` jetzt selbst `attackAnim`.
- **Backen im Hintergrund:**
  - Ein oder zwei Worker (`spriteWorker.js`) backen und kodieren je Nachricht ein Bild.
  - Reihenfolge: was im Bild steht, die Arten der kommenden Nacht (`game.planSprites`), dann die
    übrigen Arten in der Reihenfolge ihres Auftauchens. Bosse nur, wenn sie kommen.
  - Gemessen in der Prüfung: alle 17 Formen in rund 40 s mit zwei Workern, 52 ms je Bild.
- **Atlas:**
  - Seiten von 1024² als Array-Textur, vier Bytes je Texel: Palettenindex, Art, Normale in der
    Bildebene (`spriteCode.js`).
  - Die Bilder einer Fassung werden zusammen nach Höhe gepackt. Alle Formen brauchen zehn Seiten
    (40 MB).
- **Fußknick:** Unter der Fußlinie liegt der Quad auf dem Boden. Was im Bild vor den Füßen liegt,
  versinkt so nicht mehr in der Erde.
- **Prüfung:** Abschnitt `sprites`:
  - jede Form ohne leeres Bild, dazu Zustände, Fassungen, Falter, Gräber und Backen ohne Worker;
  - Bilder `sprites-arten-3d`, `sprites-arten-tag`, `sprites-arten-nacht` und
    `sprites-zustaende`.
- **Offen:** Ob die Wirkung trägt, entscheidet der Auftraggeber beim Spielen (F3/F4:
  Feinschliff nach seiner Rückmeldung).
