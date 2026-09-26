# Zomfy Towers

Gemütliche Endzeit mit Zombies: ein 3D-Pixel-Art-Browserspiel über eine
kleine Waldlichtung, eine wacklige Notunterkunft, die zum Zuhause wird – und
Nächte, in denen die Horde kommt.

- Vision, Systeme und Meilensteine: [DESIGN.md](DESIGN.md)
- Arbeitsstand: [PROGRESS.md](PROGRESS.md)
- Regeln für die Entwicklung: [CLAUDE.md](CLAUDE.md)

## Spielen

Das Spiel läuft ohne Build-Schritt direkt aus dem Repository (GitHub Pages
vom `main`-Branch). Lokal:

```
node tools/serve.mjs 8080
```

und dann <http://localhost:8080/> öffnen. Es braucht einen Browser mit
WebGL 2 (aktuelle Desktop-Browser).

## Steuerung

| Taste | Aktion |
|---|---|
| W A S D / Pfeiltasten | Laufen |
| Umschalt | Rennen |
| E / Enter / Leertaste | Benutzen, Dialog weiter |
| 1–8 / Mausrad | Schnellleiste |
| F | Laterne an/aus |
| Esc | Menü |
| F3 | Entwickler-Anzeige |

## Prüfen

```
node tools/check.mjs
```

startet das Spiel im Headless-Browser, prüft Konsole, Laufen, Speichern und
Laden und legt Screenshots in `screenshots/` ab.
