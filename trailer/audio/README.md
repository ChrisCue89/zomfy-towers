# Klangpipeline des Trailers

Der Ton des 60-Sekunden-Trailers entsteht **ausschließlich im Klang-Baukasten des Spiels** (`src/audio/music.js`,
`src/audio/sound.js`): Chromium rechnet die Stücke und Effekte in `OfflineAudioContext`s, Node mischt sie taktgenau
auf 60,000 s, misst die Pegel und mastert auf −16 LUFS. Kein Fremdaudio, keine Tondateien.

```
export ZT_GAME=…/game      # Spielcode, nur lesen
export ZT_WORK=…/work      # Ausgabe: $ZT_WORK/audio/
export ZT_FFMPEG=…/ffmpeg  # nur für die Prüfung (ebur128, loudnorm, Spektrogramme)
node trailer/audio/build.mjs                      # ≈ 35–45 s
node trailer/audio/build.mjs --spectro            # zusätzlich Spektrogramme nach $ZT_WORK/audio/check/
node trailer/audio/build.mjs --sfx datei.json     # andere Effektdatei; --out DIR, --sfx-db N, --no-verify
```

Das Ergebnis ist **bitgleich reproduzierbar** (gleiche Eingaben → gleiche `trailer.wav`, Stems und `hits.json`).

## Ausgabe

| Datei | Inhalt |
|---|---|
| `$ZT_WORK/audio/trailer.wav` | **2 646 000 Abtastwerte** (60,000 s), 44,1 kHz, stereo, 16 Bit; −16,0 LUFS integriert, LRA ≈ 10,7 LU, True Peak ≈ −1,2 dBTP (ffmpeg), Ränder 20 ms weich |
| `$ZT_WORK/audio/stems/music.wav` `transitions.wav` `bed.wav` `sfx.wav` | Ebenen nach dem Fader, 32 Bit Gleitkomma, mit derselben Master-Verstärkung wie `trailer.wav`. Summe der vier Stems ≈ Mix vor Sättigung/Begrenzer |
| `$ZT_WORK/audio/hits.json` | Taktschläge, Taktanfänge, Einschläge, Stillen, Abschnitte (siehe unten) – **für den Schnitt** |
| `$ZT_WORK/audio/check/*.png` | Spektrogramme (nur mit `--spectro`) |

## Zeitplan (Ist-Werte, alles in `score.mjs`)

| Zeit | Was | Quelle im Spiel |
|---|---|---|
| 0,00 | Spieluhr G–H–D–G, Akkord (0,6), Glitzern (1,15…) | `Music.jingle()` (die Uhr um −0,06 s verschoben, damit die erste Glocke exakt bei 0,000 s liegt) |
| 2,50 | `titel`, 72 BPM (Takt 3,3333 s), Vorspiel 2 Takte | `Music.begin('titel')` |
| 9,167 | Thema in der Spieluhr | derselbe Lauf |
| 12,50 | Thema bricht ab (Bus fällt in 50 ms weg, Hall bleibt) | `titel`, Stückzeit 10,0 s |
| 12,50–16,00 | Grollen (D1/A1/D2 unter 80 Hz), Herzschläge 12,72 / 13,62 / 14,38 / 15,01 / 15,55 (Abstand 0,9 → 0,45 s, jeweils + 0,2 s zweiter Schlag), Riser (Rauschen + Sägezahn-Streicher + Sinus-Glissando nach D), umgekehrte Becken **enden exakt bei 16,000**, Whoosh bei 12,5 | Rezept `herzschlag`, Becken/Rauschen wie im Spiel |
| **16,00** | **Einschlag** (Sinus-Trommel 135→40 Hz, Rauschstoß, Sub-Boom 54→41 Hz, kurzer Hall) + `nacht` Takt 1, Musik 5 dB kurz geduckt | `Music.begin('nacht')` |
| 16,00–19,81 | `nacht` Stufe 0 (Takt 1–2) | `nightStep`, `threat` 0 |
| 19,81–25,52 | Stufe 1 (Takt 3–5: Snare, Staccato-Streicher) | `threat` 1, Wechsel exakt an der Taktgrenze |
| 25,52–31,24 | Stufe 2 (Takt 6–8: Hörner, Becken, Tom-Wirbel) | `threat` 2; Becken bei 25,52 zusätzlich |
| 31,233 | `titel`-Mittelteil (Streicher, Besen, Spieluhr), Nacht klingt 1,3 s aus | Stück ab Takt 11 (33,333 s); wir springen direkt in den Abschnitt (`cur.sec = 3`), gleiche Noten |
| 40,50–40,78 | Musik fällt weg | |
| 40,7 / 41,0 | zwei einzelne, langsame Herzschläge (Stille) | Rezept `herzschlag` (ohne 2. Schlag) |
| **41,233** | **großer Einschlag** (Sub 41→34 Hz, 1,9 s, Becken) + `boss` Takt 1 (138 BPM, Takt 1,7391 s), Musik 4 dB kurz geduckt | `Music.begin('boss')` |
| 51,668 | Ende von `boss` (6 Takte) mit **Schlussschlag** (Kick, Pauke, Becken, c-Moll-Hörner), 0,3 s später Stille | |
| 51,97–52,2 | Stille: nur leiser Wind (≈ −48 dBFS) | |
| 52,2 | Spieluhr + weiches E-Piano: erster Takt des Themas (B–A–G–D) | `bell`, `ep`, `pluck` des Baukastens |
| 56,00 | Spieluhr-Figur G–H–D–G, bei 56,6 Schlussakkord Gadd9 (`Music.finish`: E-Piano, Gitarre, Bass, Flöte + Streicher, Glitzern), klingt aus, Ausblendung 59,4–60,0 | |

Durchgehend als **Bett** (Stem `bed`, Kurzzeit-RMS ≤ −36 dBFS, Grenze −30): Wind (zwei Rauschquellen L/R, Tiefpass wie im
Spiel), Krähen (`caw` bei 4,7 / 9,9 / 54,3), Vögel (`bird` bei 7,6 / 52,6 / 53,4 / 55,2), Feuerknistern (0–12,4 und
31,2–40,55; Bandpass-Pops wie in `Sound.update`), Wellen am See (0–12 und 52–60; im Spiel gibt es sie nicht, sie sind
aus `noise` gebaut).

## Effekte aus dem Spiel: `sfx-track.json`

Liegt `$ZT_WORK/audio/sfx-track.json` vor (oder `--sfx pfad`), rechnet `build.mjs` jeden Eintrag mit den Rezepten des
Spiels (`Sound.play` – Dämpfung, Stereolage, Streuung ±5 % / ±1,5 dB und `MIN_GAP` macht das Spiel selbst; der Zufall ist
festgelegt, also reproduzierbar):

```json
[
  { "t": 17.62, "name": "bolzen",  "x": 4, "z": -2, "lx": 0, "lz": 0 },
  { "t": 21.72, "name": "klirr",   "x": 3, "z": -1, "lx": 0, "lz": 0, "volume": 0.9, "rate": 1.0 },
  { "t": 29.30, "name": "morgen",  "volume": 0.9 },
  { "t": 4.7,   "name": "@caw",    "x": -6, "z": 3, "lx": 0, "lz": 0 },
  { "t": 7.6,   "name": "@bird" }
]
```

* `t`: Sekunden auf der Trailer-Zeitachse (0–60), Einsatz der Effekte **genau** bei `t`.
* `name`: jeder Effekt aus `SFX` in `sound.js` (`schritt`, `hacken`, `treffer`, `bolzen`, `ballista`, `rakete`, `klirr`,
  `knall`, `turmglocke`, `sturmglocke`, `herzschlag`, `champion`, `kiste`, `loot`, `jubel`, `morgen`, …).
* `x`, `z` und Hörerort `lx`, `lz` (Meter): Dämpfung `(1 − (d − 3)/(16 − 3))^1,4` und Stereolage wie im Spiel; ab 16 m
  lautlos (wird gemeldet). Ohne `x`/`z` gilt `volume` (0…1, Standard 1). `rate` (Tonhöhe als Faktor), `pitch` (Hz, nur
  manche Rezepte) wie bei `play`.
* `@caw`, `@bird`, `@cricket`: Krähe / Vogel / Grille (Umgebungsklänge des Spiels); dazu die Trailer-Bausteine
  `@whoosh` (Rauschen-Filterfahrt, **endet** bei `t`, für Schnitte) und `@boom` (kleiner Einschlag bei `t`, `volume`).
* Ungültige Einträge (`t` fehlt / außerhalb 0–60), unbekannte Namen, zu weit entfernte Effekte und Mindestabstände
  werden beim Bauen gemeldet und in `hits.json → sfx` gezählt.
* Die Ebene liegt **unter der Musik** (`LEVELS.sfxDb` in `mix.mjs`, +5 dB; eine dichte Kampfszene mit ≈ 5 Effekten/s liegt
  dann ≈ 8 dB unter der Musik, eine dünne ≈ 12 dB). Mit `--sfx-db N` änderbar, ohne neu zu tunen.
* In den Stillen (40,55–41,233 und 51,97–52,15) werden die Effekte weich ausgeblendet („Luft holen“), siehe `GATES`.

`sfx-track.example.json` zeigt eine kleine Beispieldatei (46 Einträge).

## `hits.json`

`beats` (Schläge je Abschnitt: `titel-vorspiel`, `titel-thema`, `nacht` (32), `titel-mittelteil` (12), `boss` (24)),
`bars` (Taktanfänge), `eighths` (Achtel von nacht/boss), `sections` (Abschnitte mit Zeit und Bildnummer bei 30 fps),
`impacts` (Einschläge, Stufenwechsel, Schlussschlag, Titelfigur), `silences` (Luft holen), `heartbeats`, `cues` (Glocken der
Spieluhr-Figuren), `snap` (alle Schläge und Einschläge sortiert, zum Einrasten), `master` (Verstärkung, LUFS), `sfx`.
Zeiten sind Sekunden auf 4 Nachkommastellen; `frame` = `round(t × 30)`.

## Aufbau der Dateien

| Datei | Aufgabe |
|---|---|
| `build.mjs` | Ablauf: Effektdatei lesen → Browser rechnen → mischen → mastern → schreiben → prüfen |
| `page.js`, `audio.html` | Browser-Seite: alle Klangaufgaben (`window.renderTask`), Zufall festgelegt (mulberry32) |
| `browser.mjs` | Chromium (Playwright) + kleiner Server (`/game/` = Spielcode, `/` = dieser Ordner) |
| `score.mjs` | Zeitplan (Sekunden, Takte, Herzschläge) – einzige Quelle für Browser und Node |
| `mix.mjs` | Pegeltabelle `LEVELS`, Hüllkurven, Ducken, Stillen, Master (Sättigung, Begrenzer, Lautheit) |
| `dsp.mjs` | K-Bewertung/LUFS/LRA, True Peak (4×), Lookahead-Begrenzer, WAV lesen/schreiben |
| `hits.mjs`, `verify.mjs` | `hits.json`; Messung und Prüfliste (ffmpeg `ebur128`, `loudnorm`, Spektrogramme) |

## Pegel und Master

* Jedes Stück wird auf eine **Ziel-Lautheit im Fenster** gestellt (`LEVELS.music`, Vor-Master): Studio/Vorspiel ≈ −23,5,
  Mittelteil −22, Nacht Stufe 2 −14,5, Boss −14, Morgen −27,5, Titelakkord −21,5 LUFS. Die Nachtstufen 0/1 ergeben sich aus
  dem Stück selbst (ca. 4 bzw. 2 dB leiser). Übergänge, Einschläge und Bett werden nach Spitze/Lautheit/RMS im Fenster gestellt.
* Master: gemeinsame Verstärkung, dann weiche Sättigung der Spitzen (linear bis 0,55, tanh bis 0,93) und ein
  Lookahead-Begrenzer (4 ms Vorlauf, 100 ms Erholung, überabgetastete Spitzen, Decke −1,4 dBTP). Die Verstärkung wird so
  gesucht, dass die integrierte Lautheit −16,0 LUFS trifft und der True Peak ≤ −1,35 dBTP bleibt (ffmpeg misst ≈ −1,2).
* Der Begrenzer arbeitet in den lauten Abschnitten bis ≈ 2,8 dB (Kicks); die Sättigung berührt ≈ 1 % der Abtastwerte.

## Reproduzierbarkeit (Chromium-Eigenheiten)

* `Math.random` wird je Aufgabe mit festem Startwert überschrieben (Streuung, Rauschstart, Hall, Karplus-Strong).
* Das Spiel hängt verklungene Töne über `onended` ab; im Offline-Kontext läuft das Ereignis asynchron zum Rechenthread und
  ändert die Samples von Lauf zu Lauf. `page.js` schaltet die Handler ab.
* Chromium addiert die Eingänge eines Knotens in der Reihenfolge einer Hash-Menge; bei ≥ 3 Quellen wechselt die Rundung
  (~1e−8) von Lauf zu Lauf. `page.js` sammelt alle `connect()`-Aufrufe und baut vor dem Rechnen Binärbäume aus
  Zwei-Eingang-Addierern (jede Summe hat höchstens zwei Summanden, die exakt vertauschbar sind).

## Bekannte Grenzen

* Es wurde nichts gehört, nur gemessen (Lautheit, Spitzen, Hüllkurven, Spektrogramme). Abschnitte mit Geschmacksentscheidungen:
  Pegel des Risers/Drones gegen die Musik, die Wellen am See, die Krähen, der Schlussschlag des Boss.
* Die Musik des Spiels ist praktisch mono (nur der Hall ist stereo); der Mix ist entsprechend schmal.
* Sub-Boom, Drohne und Herzschlag liegen unter 80 Hz und sind auf kleinen Lautsprechern kaum zu hören; Herzschlag und
  Drohne tragen deshalb einen Hauch Oberton (128 Hz, Rauschen bis 240 Hz).
