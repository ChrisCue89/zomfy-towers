# Zomfy Towers – Trailer (60 s)

Ein 60-Sekunden-Trailer, ganz aus dem Spiel gebaut: **echtes Gameplay** (headless in 1080p, feste
Zeitschritte), **Motion Graphics** in der Schrift und Palette des Spiels und **Musik aus dem eigenen
Klang-Baukasten** des Spiels. Drehbuch und Begründung der Dramaturgie: [STORYBOARD.md](STORYBOARD.md).

```
trailer/
  STORYBOARD.md      Drehbuch: Dramaturgie, Text, Musikplan
  config.mjs         Pfade (ZT_GAME, ZT_WORK, ZT_FFMPEG)
  capture/           Gameplay aufnehmen (lib.mjs = Bibliothek, clips/ = ein Skript je Szene, CLIPS.md = Liste)
  engine/            Bildmischung im Browser (Canvas): Schnitt (edit.js), Text, Effekte, Blenden
  audio/             Musik und Klang (aus music.js / sound.js des Spiels, offline gerechnet)
  render.mjs         Bilder → MP4 (ffmpeg)
  sfx-track.mjs      Klangereignisse der Clips → Effektspur auf der Zeitachse
  out/               fertiges Video
```

## Voraussetzungen

- Node 22, Playwright (global) mit Chromium unter `/opt/pw-browsers`, ffmpeg mit `libx264` und `aac`.
- Der Spielcode (Branch mit `src/`, `index.html`, `lib/three` …) als Arbeitskopie, z. B.
  `git worktree add ../zomfy-towers-game origin/<spiel-branch> --detach`.

```
export ZT_GAME=/pfad/zum/spiel        # Arbeitskopie des Spiels
export ZT_WORK=/pfad/zum/arbeitsordner # Bilder und Ton (mehrere GB), nicht im Repo
export ZT_FFMPEG=/pfad/zu/ffmpeg
```

## Ablauf

```
# 1. Gameplay aufnehmen (ein Bild ≈ 1,3 s im Software-Renderer; alle Clips ≈ 1 Stunde)
node trailer/capture/clips/a-….mjs        # je Szene ein Skript → $ZT_WORK/frames/<clip>/

# 2. Ton rechnen
node trailer/sfx-track.mjs                # Klangereignisse der Aufnahmen auf die Zeitachse legen
node trailer/audio/build.mjs              # → $ZT_WORK/audio/trailer.wav

# 3. Bilder mischen und zum Video zusammensetzen
node trailer/render.mjs --every 30 --out $ZT_WORK/vorschau     # Vorschau: jedes 30. Bild
node trailer/render.mjs --video trailer/out/zomfy-towers-trailer.mp4 --audio $ZT_WORK/audio/trailer.wav
```

Das Aufnahmeverfahren ist deterministisch (Karte 3, virtuelle Uhr, feste Schritte von 1/30 s): dieselben
Skripte ergeben dieselben Bilder.

## Ergebnis

`out/zomfy-towers-trailer.mp4` – 1920 × 1080, 30 Bilder/s, H.264 + AAC, 60,00 s, ≈ −16 LUFS. Prüfen mit
`node trailer/verify-video.mjs <video.mp4>` (Länge, Format, Lautheit, True Peak, schwarze Stellen, Stille).
Der AAC-Encoder von ffmpeg hebt Spitzen um ≈ 3 dB an; `render.mjs` begrenzt deshalb vor der Kodierung
(`alimiter=limit=0.70`), damit der True Peak des Videos unter −1 dBFS bleibt.

## Anpassen

- **Texte, Zeiten, Reihenfolge der Einstellungen:** `engine/edit.js`. Alle Zeiten in Sekunden; Taktschläge
  stehen als Hilfen (`tb`, `nb`, `zb`, `bb`) bereit.
- **Adresse im Abspann:** `title(T.title, DURATION, { url: 'https://…' })` in `engine/edit.js` (bis dahin steht dort
  „Direkt im Browser spielbar“).
- **Sprache:** die Zeilen in `edit.js` (und die Wörter in `layers.js`); die Schrift des Spiels kennt Umlaute und ß.
