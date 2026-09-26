# Playtests

Nach jedem Meilenstein spielen Testspieler-Agenten das Spiel – wie Menschen,
über Tastatur und Maus in einem echten Browser. Sie kennen den Code nicht.

## Aufbau

```
playtests/
  README.md            dieses Dokument
  PERSONAS.md          die vier Testspieler und ihre Regeln
  m1-r1/               Meilenstein 1, Runde 1
    jonas.md           Bericht je Testspieler
    jonas/             bis zu 6 Screenshots, auf die der Bericht verweist
    ...
    ZUSAMMENFASSUNG.md Auswertung nach Schwere (Blocker, Spielfluss, Feinschliff)
```

## Ablauf einer Runde

1. Spielstand einfrieren, damit Entwicklung und Test sich nicht stören:
   `node tools/playtest.mjs snapshot /tmp/zomfy-m1-r1`
2. Vier Testspieler-Agenten parallel starten (Persona + Ziel des Meilensteins,
   siehe PERSONAS.md). Jeder startet seine eigene Sitzung:
   `node tools/playtest.mjs start <name> --root /tmp/zomfy-m1-r1`
3. Jeder schreibt seinen Bericht nach `playtests/<runde>/<name>.md`.
4. Auswertung in `ZUSAMMENFASSUNG.md`, Übertrag nach `PROGRESS.md`,
   Blocker zuerst beheben, dann Spielfluss-Probleme.
5. Höchstens drei Runden pro Meilenstein.

## Die Playtest-Brücke

`tools/playtest.mjs` hält eine Browser-Sitzung (640 × 360, ein Spielpixel =
ein Bildschirmpixel) offen. Zwischen zwei Befehlen steht das Spiel still;
jeder Befehl lässt genau die angegebene Spielzeit vergehen (feste
1/30-s-Schritte), egal wie langsam der Software-Renderer ist.

```
node tools/playtest.mjs do <name> "hold KeyW 800; press KeyE; wait 1000; shot vor-der-huette; look"
```

| Befehl | Wirkung |
|---|---|
| `hold <Taste> <ms>` | Taste gedrückt halten |
| `press <Taste> [n]` | Taste n-mal tippen |
| `down <Taste>` / `up <Taste>` | Taste drücken / loslassen |
| `move <x> <y>` | Maus bewegen (0–639, 0–359) |
| `click <x> <y> [right]` | Klicken |
| `wheel <dy>` | Mausrad |
| `wait <ms>` | Spiel laufen lassen |
| `shot <name>` | Screenshot, Pfad steht in der Antwort |
| `look` | Lesen, was auf dem Bildschirm steht (Uhr, Vorrat, Dialog, Hinweis) |
| `console` | Neue Fehler/Warnungen aus der Browser-Konsole |
| `reload` | Seite neu laden (wie F5) |
| `resize <w> <h>` | Fenstergröße ändern |

Tastennamen wie `KeyboardEvent.code`: `KeyW`, `KeyE`, `KeyF`, `Space`,
`ShiftLeft`, `Escape`, `Enter`, `Tab`, `Digit1` … `ArrowUp` …

`look` ist nur zum Ablesen da (wie ein Blick aufs HUD). Es verändert nichts.
