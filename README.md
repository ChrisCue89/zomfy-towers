# Zomfy Towers

Gemütliche Endzeit mit Zombies: ein 3D-Pixel-Art-Browserspiel über eine
kleine Waldlichtung, eine wacklige Notunterkunft, die zum Zuhause wird – und
Nächte, in denen die Horde kommt.

Tagsüber sammelt man Holz, Stein und Schrott, baut Türme, Barrikaden und
Möbel und nimmt Überlebende auf. Nachts kommt die Horde in Wellen, die Türme
schießen, Mika kämpft mit selbst gebauten Waffen mit. Beute fliegt von
selbst heran, die Bauleiste leuchtet auf, sobald etwas bezahlbar wird. Mit
Juna wird der alte Funkturm zum Leuchtfeuer über dem Wald. Eine verlorene
Nacht kostet Material, nie den Spielstand.

- Vision, Systeme und Meilensteine: [DESIGN.md](DESIGN.md)
- Arbeitsstand und Playtests: [PROGRESS.md](PROGRESS.md), [playtests/](playtests/)
- Entscheidungen: [OFFENE-FRAGEN.md](OFFENE-FRAGEN.md)
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
| Linksklick | Schlagen (in Mausrichtung), Bau setzen, Bau auswählen |
| Leertaste | Ausweichen, Dialog weiter |
| E / Enter | Benutzen, sprechen; gedrückt halten sammelt weiter |
| 1–8 / Mausrad | Schnellleiste |
| F | Laterne an/aus |
| Q R T G C V | Bauleiste (Tab oder Klick wechselt den Reiter) |
| Mausrad beim Bauen | Drehen |
| Rechtsklick / Esc | Bauen abbrechen, Auswahl aufheben |
| Esc | Menü (mit Einstellungen) |
| F3 | Entwickler-Anzeige |

## Prüfen

```
node tools/check.mjs          # alles (dauert im Software-Renderer eine Weile)
node tools/check.mjs --syntax # nur Syntax
node tools/check.mjs --nur=bauen,naechte
```

startet das Spiel im Headless-Browser, spielt Titelbild, Sammeln, Bauen,
Nächte, Nahkampf, Überlebende und Speichern mit echten Tasten und Klicks durch,
prüft jede Konsolenmeldung und legt Screenshots in `screenshots/` ab.
