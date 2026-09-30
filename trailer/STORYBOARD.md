# Zomfy Towers – Trailer (60 s) · Drehbuch

> **Wenn die Nacht kommt, brennt hier noch Licht.**
> Gemütliche Endzeit mit Zombies – ein Zuhause am See, ein Wald, der nachts zu Besuch kommt, und
> die Menschen, die man auf dem Weg aufnimmt.

Alle Bilder sind **echtes Gameplay** (headless in 1080p mit festen 1/30-s-Schritten aufgenommen, siehe
`capture/`). Musik und Klang stammen aus dem **eigenen Klang-Baukasten des Spiels** (`music.js`, `sound.js`),
offline gerechnet. Schrift, Farben und der gerasterte Blendenübergang kommen ebenfalls aus dem Spiel.
Nichts im Trailer ist erfunden: Figuren, Orte, Gegner und Sätze stehen im Spiel (Quelle: `DESIGN.md`,
`src/data/dialogs.js`).

## Dramaturgie

Der Trailer erzählt **einen Tag, eine Nacht und einen Herbst** in drei Akten und einer Pointe.

| Akt | Sekunden | Gefühl | Was der Zuschauer versteht |
|---|---|---|---|
| **Studio** | 0,0–2,5 | Staunen | Spieluhr, Laub, „Tales of Cue präsentiert“ |
| **I · Ein Zuhause** | 2,5–12,5 | Geborgenheit | Die Welt ist still – nur hier brennt Licht. Tagsüber baust du dir ein Zuhause: sammeln, bauen, einrichten |
| **Die Wende** | 12,5–16,0 | Unbehagen | Es dämmert. Nachts kommt der Wald zu Besuch – ein Schlurfer mit Kochmütze |
| **II · Die Nacht** | 16,0–31,2 | Adrenalin | Türme neben dem Weg, Barrikaden darauf, du mittendrin. Reaktionen, Boss, Champion, Beute. Am Ende: geschafft |
| **III · Zuflucht** | 31,2–41,2 | Wärme, Zugehörigkeit | Du bist nicht allein: Hilde, Juna, Bert, Dr. Yusuf, Knopf; Kartenabend am Kamin; Balduin am Steg |
| **IV · Frostnacht** | 41,2–51,7 | Gänsehaut, Triumph | Tag 30 von 30. Erster Frost, das Moderherz, das Leuchtfeuer. „Halte das Licht.“ |
| **Ausklang** | 51,7–60,0 | Erleichterung, Lächeln | Morgen im Schnee. Pointe mit Balduin. Titel, Tagline, Bezugsquelle |

**Kunstgriffe:** Kontrast Warm/Kalt und Ruhig/Laut (Tag und Nacht werden gegeneinander geschnitten) ·
ein wiederkehrendes Motiv (das **Licht**: Fenster → Laterne → Feuer → Leuchtfeuer → Titel) · Schnitttempo
steigt von 5 s auf 0,5 s je Einstellung und fällt wieder · „Luft holen“ vor dem Finale (Stille + Herzschlag) ·
Humor als Erleichterung nach dem Höhepunkt (Balduin) · Spieluhr-Motiv am Anfang und am Ende.

## Text (deutsch, im Ton des Spiels: freundlich, knapp, leiser Witz)

| Zeit | Zeile | Stil |
|---|---|---|
| 0,4 | Tales of Cue **präsentiert** | Studiokarte, Spieluhr |
| 2,9 | Die Welt ist still geworden. | Erzähler, unten, Schreibmaschine |
| 6,2 | Am Stillsee brennt noch **Licht.** | Erzähler, „Licht“ in Gold, leuchtet |
| 9,2 | Tagsüber baust du dir ein Zuhause. | Wort für Wort im Takt der Spieluhr |
| 12,7 | Nachts … | klein, kaltblau |
| 14,4 | … kommt der Wald zu Besuch. | Erzähler |
| 16,0 | **TÜRME** neben dem Weg. | Wucht-Titel, Mitte, auf dem Schlag |
| 17,9 | **BARRIKADEN** darauf. | Wucht-Titel |
| 19,8 | Und **DU** mittendrin. | Wucht-Titel |
| 21,7 | Eisblock! · Klirr! · Dampf! | Spielwörter (aus dem Spiel), Reaktionen |
| 23,6 | Jede fünfte Nacht: **ein Boss.** | Wucht-Titel + Lebensbalken aus dem Spiel |
| 27,4 | 30 Nächte. | Zahl, groß, im Schnitt-Stakkato |
| 29,3 | Nacht überstanden. ★★★ | Morgenbericht aus dem Spiel |
| 31,6 | Und du bist nicht allein. | Erzähler |
| 34,6–37,9 | Hilde · Juna · Bert · Dr. Yusuf · Knopf | Namensschilder mit Beruf (Postbotin, Funkbastlerin, …) |
| 38,0 | Kartenabend am Kamin. Handel am Steg. | Erzähler |
| 41,3 | Tag 30 von 30. | Uhr-Tafel aus dem Spiel (Schnee) |
| 43,0 | Der erste Frost. | Wucht-Titel |
| 45,0 | Das Moderherz erwacht. | Wucht-Titel |
| 48,2 | **Halte das Licht.** | Wucht-Titel, gold |
| 52,0 | Am Morgen liegt Schnee. | Erzähler, leise |
| 53,8 | Balduin kauft Zombieteile. – „Frag nicht. Wissenschaft! Oder Kunst. Oder Suppe – nein, keine Suppe.“ | Dialogtafel wie im Spiel |
| 56,0 | **ZOMFY TOWERS** | Titel |
| 56,9 | Gemütliche Endzeit mit Zombies. | Untertitel |
| 57,7 | Direkt im Browser spielbar · Maus & Tastatur | Hinweis (Adresse trägt der Auftraggeber nach) |
| 58,6 | Tales of Cue | Signet |

## Musik (aus dem Spiel, offline gerechnet) und Klang

| Ab | Stück | Takt | Aufgabe |
|---|---|---|---|
| 0,00 | Spieluhr von Tales of Cue (`jingle`) | – | Studio-Sting: G–H–D–G aufwärts |
| 2,50 | **titel** „Herbstlied am Stillsee“, G-Dur | 72 BPM (Takt 3,333 s) | Vorspiel bis 9,17; ab 9,17 das Thema in der Spieluhr |
| 12,50 | Übergang | – | Thema bricht ab, Bass-Grollen, Herzschlag, umgekehrtes Becken |
| 16,00 | **nacht** „Die Horde kommt“, d-Moll | 126 BPM (Takt 1,905 s), 8 Takte | Stufe 0 → 1 (ab Takt 3) → 2 (ab Takt 6): Bass/Kick, dann Snare + Streicher, dann Hörner + Toms |
| 31,23 | **titel**, Mittelteil mit Streichern | 72 BPM | Wärme: „Du bist nicht allein“ |
| 40,6 | Stille + Herzschlag | – | Luft holen |
| 41,23 | **boss** „Der Boss kommt“, c-Moll | 138 BPM (Takt 1,739 s), 6 Takte | Frostnacht: Pauke + Hörnermelodie |
| 51,67 | Stille, dann Spieluhr | – | Erleichterung |
| 56,00 | Spieluhr-Motiv, Schlussakkord | – | Titel |

Schnitte und Textschläge liegen auf den Taktschlägen der jeweiligen Stelle. Klangeffekte (Schläge, Bolzen,
Treffer, Glocke, Krähen, Feuer, Wind, Wellen) stammen aus dem Spiel: Beim Aufnehmen protokolliert
`capture/lib.mjs` jeden `sound.play()`-Aufruf mit Bildnummer (`events.json` je Clip), der Ton wird später
bildgenau mit dem Klang-Baukasten des Spiels nachgerechnet.

## Aufnahmen (Clips)

Jeder Clip liegt unter `frames/<name>/` (`0000.png` = Welt, `0000.ui.png` = Oberfläche, `meta.json`, `events.json`),
30 Bilder pro Sekunde, 1920 × 1080. Länge mit Reserve: der Schnitt nimmt nur den besten Ausschnitt.
Kamera: fest, langsame Fahrt oder Schnitt. Kein Blut – der Look des Spiels bleibt gemütlich.

Siehe die Tabelle der Clips in `capture/CLIPS.md`.

## Endfassung: was im Video wirklich zu sehen ist

Der Schnitt (`engine/edit.js`) folgt dem Plan oben mit diesen Abweichungen, die sich aus dem tatsächlich aufgenommenen
Material ergeben haben:

| Zeit | Einstellung | Anmerkung |
|---|---|---|
| 0,0–2,6 | Studiokarte, Laterne | löst sich per Rasterblende in den Steg auf (die Laterne ist das Leitmotiv) |
| 2,0–5,8 | `see-morgen` | Steg im Morgenlicht, Krähe |
| 5,8–9,2 | `haus-morgen` | Mika tritt aus dem warmen Haus |
| 9,2–12,5 | `sammeln`, `bauen`, `einrichten` | im Takt der Spieluhr, dazwischen zwei 4-Bilder-Blitze aus dem Wald |
| 12,5–16,0 | `daemmerung`, `wald-moder` | Fenster und Laternen gehen an, der Schildträger tritt aus dem Wald |
| 16,0–31,2 | `turm-feuer`, `barrikade`, `nahkampf`, `reaktionen`, `boss-holzfaeller`, `lager-tor`, `morgenbericht` | Wucht-Titel auf den Taktschlägen; die Schläge der Boss-Sequenz liegen auf den Bildern des Spiels |
| 31,2–40,3 | `leute-feuer`, `nah-*`, `karten-kamin`, `haendler-boot` | Namensschilder mit Beruf; Kartenclip mit Tafeln des Spiels als Sticker |
| 40,3–41,2 | Uhrentafel „Tag 30 von 30 · Schnee“ | Luft holen, zwei Herzschläge |
| 41,2–51,7 | `frost-nacht`, `moderherz`, `leuchtfeuer`, `herz-zerfall` | der Fall des Herzens (Bild 8 des Clips) liegt auf dem Schlussschlag bei 51,67 s |
| 52,2–56,0 | `frost-morgen`, `balduin-frag` | Stille, Spieluhr, Balduins Pointe aus der Dialogtafel des Spiels |
| 56,0–60,0 | Titelkarte | vier Spieluhr-Töne setzen „ZOM · FY · TOW · ERS“ |

Nicht aufgenommen (gestrichen zugunsten der Zeit): `wege-weit`, `champion-beute`, `turm-bauen-nacht`, `feuer-abend`,
`hilde-kommt`, Klebekürbis-Reaktion.

## Bekannte Grenzen

- **Kein Mensch hat den Ton gehört.** Pegel, Einsätze und Stillen sind gemessen (`audio/verify.mjs`), die Klangwirkung
  (Grollen, Riser, Wellen am See) ist nur nach Messwerten abgestimmt.
- **Schnee sieht bei voller Decke wie Tarnmuster aus.** Bei den Frostclips ist die Decke im Spiel-Renderer begrenzt
  (`snowCover` in `capture/clips/b-common.mjs`); ein rein weißer Schneemorgen ließ sich nicht schön aufnehmen.
- **Beispiel-Bericht:** Die Zahlen im Morgenbericht (44 Schlurfer …) sind gesetzt, es wurde keine Nacht gespielt.
- Die Ankunftsfanfare von Balduins Boot ist nicht im Ton (sie stört die Dramaturgie der Musik).
- **Adresse im Abspann** fehlt noch (`title(T.title, DURATION, { url })` in `engine/edit.js`).
