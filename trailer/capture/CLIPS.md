# Clips für den Trailer

Aufnahme mit `capture/lib.mjs` (`Rec`). Jeder Clip: 1920 × 1080, 30 Bilder/s, Ausgabe unter
`$ZT_WORK/frames/<name>/`. Ein Bild kostet rund 1,3 s im Software-Renderer – deshalb erst
mit wenigen Probebildern (`frames: 1`, an mehreren Stellen) prüfen, dann den ganzen Clip aufnehmen.

**Gemeinsame Regeln**

- Spiel mit `?test&playtest` (Karte 3, `window.zomfy` steht bereit). Spielzeit, Wetter, Türme, Überlebende
  usw. über `window.zomfy` stellen (`setTime`, `setDay`, `setWeather`, `build`, `spawnAtEntry`, `spawnZombie`,
  `setSurvivor`, `moveIn`, `setTowerStage`, `spawnHeart` …, siehe `CLAUDE.md` des Spiels ab „URL-Parameter“ und
  `exposeTestApi` in `src/core/game.js`).
- Oberfläche je Clip: `world` (ohne Statuspaneele, aber mit Wörtern, Zahlen, Lebensbalken, Wetter) ist der Standard.
  `full` nur, wo die Tafel selbst gezeigt werden soll. `none` für ganz reine Bilder.
- **Schön aussehen** ist wichtiger als Vollständigkeit: das Bild muss für sich stehen, ohne Text. Mitte des Bildes
  = Handlung. Keine leeren Wiesen, keine verdeckten Figuren. Kamera mit `rec.cam({keys})` führen (Blickpunkt am
  Boden), nicht dem Zufall überlassen. Tageszeit passend zur Stimmung wählen.
- Kein Blut, keine Fehlermeldung, keine Konsolenwarnung (`rec.problems` muss leer sein).
- Jede Aufnahme mit Reserve (die Schnitte nehmen 0,5–3 s daraus). Bildzahlen unten sind Richtwerte.
- Zu jedem Clip ein kurzer `description`-Text in `meta.json` (was passiert bei welchem Bild, gute Schnittpunkte).
- Nach der Aufnahme mit `Read` mindestens drei Bilder (Anfang, Mitte, Ende) ansehen und ehrlich beurteilen.
- Skripte als `capture/clips/<gruppe>-<name>.mjs` im Repo ablegen (aufnehmbar von einer frischen Kopie aus).

## Gruppe A – Tag, Zuhause, Menschen (warm)

| Name | Bilder | Inhalt |
|---|---|---|
| `see-morgen` | 100 | Steg und See im Morgennebel/-licht, leerer Steg, eine Krähe, Laub. Langsame Kamerafahrt über den Steg. Stille Eröffnung. |
| `haus-morgen` | 100 | Fischerhaus von außen am Morgen, warmes Fenster, Laub weht, Mika tritt aus der Tür und geht zum Feuer. |
| `sammeln` | 60 | Mika hackt/sammelt (Axt, Holzspäne), nah (Ansicht `nah`, 160 px/m), Tag. |
| `bauen` | 75 | Bauen mit Schwung: Baugeist über dem Bauplatz, dann setzt Mika einen Turm neben den Weg (Stauchen/Strecken). |
| `einrichten` | 75 | Innenraum (Zuhause), warmes Licht, Möbel, Mika geht durchs Bild. Ansicht drinnen (160 px/m). |
| `feuer-abend` | 60 | Feuerstelle nah, Kürbis, Wäscheleine im Hintergrund; goldenes Abendlicht. |
| `daemmerung` | 90 | Zeitraffer 17:00 → 20:45 am Haus/Hof: Sonne sinkt, Lichtinseln (Laternen, Fenster, Kürbisse) gehen an. |
| `wald-moder` | 90 | Nacht am Waldrand: violett glimmender Moder, ein Schlurfer mit Kochmütze schlurft über den Weg ins Bild. |
| `morgenbericht` | 45 | `full`: Morgenbericht „Nacht N überstanden“ mit Sternen über warmem Morgenbild. |
| `hilde-kommt` | 75 | Oma Hilde kommt über den Weg zum Hof (Fahrradglocke), Mika begrüßt sie. |
| `leute-feuer` | 90 | Alle am Feuer: Hilde, Juna, Bert, Dr. Yusuf, Knopf (Hund), Mika. Langsame Fahrt. |
| `nah-hilde` `nah-juna` `nah-bert` `nah-yusuf` `nah-knopf` | je 36 | Je eine Figur nah (160 px/m), sitzt/steht/redet, schöner Ausschnitt, warmes Licht. |
| `haendler-boot` | 100 | Balduins Boot läuft am Steg ein (Fanfare-Szene), Balduin geht an Land. |
| `karten-kamin` | 90 | Kartenabend am Kamin: Bert, Mika, Kamin, Karten. Warm, drinnen. |
| `frost-morgen` | 90 | Morgen nach der Frostnacht: Schnee auf Dächern und Boden, Sonnenaufgang, alle am Feuer, Atem-Nebel/Schneetreiben. |
| `balduin-dialog` | 60 | `full`: Balduin-Dialogtafel mit Porträt, Text „Ich kaufe Zombieteile …“ läuft; Steg im Hintergrund. |

## Gruppe B – Nacht, Kampf, Frost (kalt, laut)

| Name | Bilder | Inhalt |
|---|---|---|
| `turm-bauen-nacht` | 60 | Dämmerung/Nacht: Turm neben dem Weg setzen (Bauen mit Schwung, Häkchen/✓). |
| `turm-feuer` | 90 | Bolzenwerfer, Kürbiskatapult, Rasensprenger, Laternenturm schießen auf eine Gruppe Schlurfer (Geschosse, Aufprall, Kürbis-Bögen). Schön gerahmt an der Weggabelung/vorm Lager. |
| `barrikade` | 90 | Horde staut sich an einer Barrikade, ein Brummer zerlegt sie (Splitter), Türme dahinter treffen. |
| `nahkampf` | 90 | Mika schlägt mit der Axt zu und rollt aus (Treffer-Blitz, Wackeln, Zeitlupe), Ansicht `nah`. |
| `reaktion-eisblock` `reaktion-dampf` `reaktion-kleber` | je 36 | Wörter wie „Eisblock!“, „Klirr!“, „Dampf!“ poppen über den Schlurfern (Zustände + Reaktionen der Türme). |
| `boss-holzfaeller` | 90 | Boss „Der Holzfäller“ mit Lebensbalken, orangem Ankündigungsring am Boden und „holt aus!“. |
| `champion-beute` | 60 | Champion mit goldenem Schimmer fällt, Fundkiste/Beute fliegt zu Mika. |
| `lager-tor` | 90 | Horde am Tor/Wall des Lagers, Funken, Mika und Türme am Hof, Laterne. |
| `wege-weit` | 90 | `full`: Nachtleiste „Nacht 3 · Welle 2/4 – Aus: Nordweg, Mittelweg und Südweg“, drei Wege mit Fackeln, die Horde strömt herein. |
| `frost-nacht` | 90 | Nacht 30 (Tag 30 von 30, Schnee fällt), Lager im Frost, Wege mit Fackeln, Horde aus allen drei Wegen. |
| `moderherz` | 120 | Das Moderherz (`spawnHeart`) pocht auf Wurzelbeinen, Wurzeln brechen aus dem Boden (Ring), Lebensbalken „Das Moderherz“. |
| `leuchtfeuer` | 100 | Der Leuchtmast am Steg (`setTowerStage(3)`) leuchtet über dem See, Licht bremst die Horde. Nacht, Schnee. |
| `herz-zerfall` | 90 | Das Herz fällt, die Horde zerfällt zu Moos und Pilzen, Blitz, Zeitlupe, dann Stille im Morgengrauen. |
